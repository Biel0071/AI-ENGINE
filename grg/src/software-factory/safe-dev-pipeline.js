const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { ValidationError } = require('../kernel/errors');
const { GitWorktreeManager } = require('./git-worktree-manager');

const runFile = promisify(execFile);
const DEFAULT_BLOCKED = ['.git/**', '.env', '.env.*', '**/.env', '**/.env.*', 'node_modules/**'];

class SafeDevPipeline {
  constructor({ aiGateway, worktrees = new GitWorktreeManager(), exec = runFile } = {}) {
    this.aiGateway = aiGateway; this.worktrees = worktrees; this.exec = exec;
  }

  async execute(tenantId, actorId, payload = {}, context = {}) {
    const prompt = String(payload.prompt || '').trim();
    if (!prompt) throw new ValidationError('development job requires prompt');
    const sourcePath = payload.projectPath || context.job?.workspace || context.job?.repository;
    const policy = context.job?.policy || {};
    await context.stage?.('context.loaded', 10);
    const isolated = await this.worktrees.create(sourcePath, context.jobId, context.job?.branch || null);
    const artifacts = [{ type: 'worktree', path: isolated.path, branch: isolated.branch, source: isolated.source }];
    await context.stage?.('worker.assigned', 15, { artifacts });

    try {
      const project = await collectContext(isolated.path);
      await context.stage?.('plan.created', 25, { artifacts });
      await context.stage?.('ai.started', 30);
      const ai = await this.aiGateway.invoke(tenantId, actorId, {
        taskType: 'generate',
        prompt: buildPrompt(prompt, project, policy),
      });
      await context.stage?.('ai.completed', 45);
      const plan = parsePlan(ai.text);
      const changed = await applyPlan(isolated.path, plan, policy);
      if (!changed.length) throw new Error('AI plan produced no safe file changes');
      await context.stage?.('files.changed', 60, { artifacts: [...artifacts, ...changed.map((file) => ({ type: 'file', path: file }))] });

      const gates = normalizeGates(payload.gates, project, changed);
      await context.stage?.('tests.started', 70);
      const tests = await runGates(isolated.path, gates, policy.maxRuntime, this.exec);
      await context.stage?.('tests.completed', 82, { tests });
      await context.stage?.('validation.started', 86);
      const evidence = await this.worktrees.diff(isolated.path);
      const validation = { passed: tests.every((gate) => gate.status === 'PASS'), changedFiles: evidence.status, summary: plan.summary || null };
      await context.stage?.('validation.completed', 95, { validation, artifacts: [...artifacts, { type: 'git-diff', path: isolated.path, bytes: Buffer.byteLength(evidence.diff) }] });
      if (!validation.passed) throw new Error(`quality gate failed: ${tests.filter((gate) => gate.status !== 'PASS').map((gate) => gate.name).join(', ')}`);
      return { status: 'READY_FOR_REVIEW', worktree: isolated.path, branch: isolated.branch, changedFiles: evidence.status, diff: evidence.diff.slice(0, 200_000), tests, validation, provider: ai.provider, model: ai.model };
    } catch (error) {
      await context.stage?.('job.failed', 98, { rollback: { available: true, worktree: isolated.path, branch: isolated.branch } }).catch(() => {});
      throw error;
    }
  }

  async rollback(job) {
    const worktree = (job.artifacts || []).find((item) => item.type === 'worktree');
    if (!worktree) throw new ValidationError('job has no isolated worktree artifact');
    return this.worktrees.rollback(worktree.source, worktree.path, worktree.branch);
  }
}

async function collectContext(root) {
  const files = []; const skip = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', 'graphify-out']);
  async function walk(dir) {
    if (files.length >= 120) return;
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (files.length >= 120 || skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) files.push(path.relative(root, full).replace(/\\/g, '/'));
    }
  }
  await walk(root);
  const selected = files.filter((file) => /(^|\/)(package\.json|README[^/]*|src\/.*\.(js|ts|jsx|tsx|py|go)|test\/.*|tests\/.*)$/i.test(file)).slice(0, 35);
  const contents = [];
  let budget = 80_000;
  for (const file of selected) {
    if (budget <= 0) break;
    const text = await fs.readFile(path.join(root, file), 'utf8').catch(() => '');
    const excerpt = text.slice(0, Math.min(12_000, budget)); budget -= excerpt.length;
    contents.push({ path: file, content: excerpt });
  }
  let packageJson = null;
  try { packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')); } catch {}
  return { files, contents, packageJson };
}

function buildPrompt(objective, project, policy) {
  return [
    'You are the implementation engine inside FENIX. Produce a minimal, working change.',
    'Return ONLY valid JSON: {"summary":"...","files":[{"path":"relative/path","content":"complete replacement content"}]}.',
    'Never include secrets, .env files, lockfiles, generated artifacts, deletion operations, or paths outside the repository.',
    `Objective: ${objective}`,
    `Allowed paths: ${JSON.stringify(policy.allowedPaths?.length ? policy.allowedPaths : ['**'])}`,
    `Blocked paths: ${JSON.stringify([...(policy.blockedPaths || []), ...DEFAULT_BLOCKED])}`,
    `Project files: ${JSON.stringify(project.files)}`,
    `Relevant contents: ${JSON.stringify(project.contents)}`,
  ].join('\n\n');
}

function parsePlan(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let plan;
  try { plan = JSON.parse(raw); } catch { throw new ValidationError('AI implementation response is not valid JSON'); }
  if (!Array.isArray(plan.files) || plan.files.length > 40) throw new ValidationError('AI implementation plan requires at most 40 files');
  return plan;
}

async function applyPlan(root, plan, policy) {
  const allowed = policy.allowedPaths?.length ? policy.allowedPaths : ['**'];
  const blocked = [...DEFAULT_BLOCKED, ...(policy.blockedPaths || [])];
  const changed = [];
  for (const file of plan.files) {
    const relative = String(file.path || '').replace(/\\/g, '/').replace(/^\.\//, '');
    if (!relative || path.isAbsolute(relative) || relative.split('/').includes('..')) throw new ValidationError(`unsafe file path: ${relative}`);
    if (!allowed.some((pattern) => globMatch(relative, pattern)) || blocked.some((pattern) => globMatch(relative, pattern))) throw new ValidationError(`file path is outside job policy: ${relative}`);
    if (typeof file.content !== 'string' || Buffer.byteLength(file.content) > 1_000_000) throw new ValidationError(`invalid file content: ${relative}`);
    const target = path.resolve(root, relative); const rel = path.relative(root, target);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new ValidationError(`unsafe file path: ${relative}`);
    await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, file.content, 'utf8'); changed.push(relative);
  }
  return changed;
}

function globMatch(file, pattern) {
  const escaped = String(pattern).replace(/\\/g, '/').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
  return new RegExp(`^${escaped}$`).test(file);
}

function normalizeGates(requested, project, changed) {
  if (Array.isArray(requested) && requested.length) return requested.map((gate, index) => normalizeGate(gate, index));
  const scripts = project.packageJson?.scripts || {}; const gates = [];
  for (const name of ['typecheck', 'lint', 'test', 'build']) if (scripts[name]) gates.push({ name, command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['run', name] });
  if (!gates.length) for (const file of changed.filter((item) => item.endsWith('.js'))) gates.push({ name: `syntax:${file}`, command: process.execPath, args: ['--check', file] });
  return gates;
}

function normalizeGate(gate, index) {
  if (!gate || typeof gate !== 'object' || typeof gate.command !== 'string' || !Array.isArray(gate.args)) throw new ValidationError(`invalid gate at index ${index}`);
  const executable = path.basename(gate.command).toLowerCase();
  if (!['node', 'node.exe', 'npm', 'npm.cmd', 'npx', 'npx.cmd'].includes(executable)) throw new ValidationError(`gate executable is not allowed: ${gate.command}`);
  return { name: String(gate.name || `gate-${index + 1}`), command: gate.command, args: gate.args.map(String) };
}

async function runGates(root, gates, maxRuntime = 300_000, exec = runFile) {
  const results = [];
  for (const gate of gates) {
    const started = Date.now();
    try {
      const output = await exec(gate.command, gate.args, { cwd: root, timeout: Math.min(Number(maxRuntime || 300_000), 900_000), maxBuffer: 2 * 1024 * 1024 });
      results.push({ name: gate.name, status: 'PASS', durationMs: Date.now() - started, output: String(output.stdout || '').slice(-4_000) });
    } catch (error) {
      results.push({ name: gate.name, status: 'FAIL', durationMs: Date.now() - started, output: String(error.stdout || error.stderr || error.message).slice(-4_000) });
    }
  }
  return results;
}

module.exports = { SafeDevPipeline, collectContext, parsePlan, applyPlan, globMatch, normalizeGates, runGates };
