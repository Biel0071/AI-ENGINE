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

  async analyze(tenantId, actorId, payload = {}, context = {}) {
    const prompt = String(payload.prompt || '').trim();
    if (!prompt) throw new ValidationError('development analysis job requires prompt');
    const sourcePath = payload.projectPath || context.job?.workspace || context.job?.repository;
    if (!sourcePath) throw new ValidationError('development analysis job requires projectPath or workspace');

    await context.stage?.('context.loaded', 20);
    const project = await collectContext(path.resolve(sourcePath), payload.context || context.job?.context || {}, {
      contentBudget: 6_000,
      maxSelected: 2,
      hintedOnly: true,
    });
    await context.stage?.('ai.started', 40);
    const ai = await this.aiGateway.invoke(tenantId, actorId, {
      taskType: 'plan',
      prompt: buildAnalysisPrompt(prompt, project),
      format: 'json',
    });
    await context.stage?.('ai.completed', 75);
    const analysis = parseAnalysis(ai.text, new Set(project.files));
    const validation = { passed: true, readOnly: true, proposals: analysis.proposals.length };
    const artifacts = [{
      type: 'analysis',
      status: 'READ_ONLY',
      filesInspected: project.contents.map((item) => item.path),
      proposalCount: analysis.proposals.length,
    }];
    await context.stage?.('analysis.completed', 95, { validation, artifacts });
    return { status: 'ANALYZED', readOnly: true, ...analysis, provider: ai.provider, model: ai.model };
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
      const contextHints = payload.context || context.job?.context || {};
      const hasExplicitFiles = (Array.isArray(contextHints.sourceFiles) && contextHints.sourceFiles.length > 0)
        || (Array.isArray(contextHints.allowedPaths) && contextHints.allowedPaths.length > 0);
      const project = await collectContext(isolated.path, contextHints, hasExplicitFiles
        ? { contentBudget: 16_000, maxSelected: 8, hintedOnly: true }
        : {});
      await context.stage?.('plan.created', 25, { artifacts });
      await context.stage?.('ai.started', 30);
      const ai = await this.aiGateway.invoke(tenantId, actorId, {
        taskType: 'generate',
        prompt: buildPrompt(prompt, project, policy),
        format: 'json',
      });
      await context.stage?.('ai.completed', 45);
      const plan = normalizePlanPaths(parsePlan(ai.text), sourcePath);
      const changed = await applyPlan(isolated.path, plan, policy);
      if (!changed.length) throw new Error('AI plan produced no safe file changes');
      await context.stage?.('files.changed', 60, { artifacts: [...artifacts, ...changed.map((file) => ({ type: 'file', path: file }))] });

      const gates = normalizeGates(payload.gates, project, changed);
      await context.stage?.('tests.started', 70);
      const tests = await runGates(isolated.path, gates, policy.maxRuntime, this.exec);
      await context.stage?.('tests.completed', 82, { tests });
      await context.stage?.('validation.started', 86);
      const evidence = await this.worktrees.diff(isolated.path);
      const validation = { passed: tests.length > 0 && tests.every((gate) => gate.status === 'PASS'), changedFiles: evidence.status, summary: plan.summary || null };
      const preview = buildPreviewArtifact(payload.context || context.job?.context || {}, changed, isolated.path);
      const finalArtifacts = [...artifacts, { type: 'git-diff', path: isolated.path, bytes: Buffer.byteLength(evidence.diff) }, preview];
      await context.stage?.('validation.completed', 95, { validation, artifacts: finalArtifacts });
      if (!validation.passed) throw new Error(`quality gate failed: ${tests.filter((gate) => gate.status !== 'PASS').map((gate) => gate.name).join(', ')}`);
      return { status: 'READY_FOR_REVIEW', worktree: isolated.path, branch: isolated.branch, changedFiles: evidence.status, diffPreview: evidence.diff.slice(0, 1_500), preview, provider: ai.provider, model: ai.model };
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

  async diff(job) {
    const worktree = (job.artifacts || []).find((item) => item.type === 'worktree');
    if (!worktree) throw new ValidationError('job has no isolated worktree artifact');
    return this.worktrees.diff(worktree.path);
  }
}

async function collectContext(root, hints = {}, options = {}) {
  const files = []; const skip = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', 'graphify-out']);
  const hintedCandidates = [...new Set([
    ...(Array.isArray(hints.sourceFiles) ? hints.sourceFiles : []),
    ...(Array.isArray(hints.allowedPaths) ? hints.allowedPaths : []),
  ].map((item) => typeof item === 'string' ? item : item?.repositoryFile || item?.file).filter(Boolean)
    .map((file) => String(file).replace(/\\/g, '/').replace(/^\.\//, ''))
    .filter((file) => !file.includes('*') && !path.isAbsolute(file) && !file.split('/').includes('..')))];
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
  const hintedFiles = [];
  for (const file of hintedCandidates) {
    const target = path.resolve(root, file); const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
    const stat = await fs.stat(target).catch(() => null);
    if (!stat?.isFile()) continue;
    hintedFiles.push(file);
    if (!files.includes(file)) files.unshift(file);
  }
  const discovered = options.hintedOnly ? [] : files.filter((file) => /(^|\/)(package\.json|README[^/]*|src\/.*\.(js|ts|jsx|tsx|py|go)|public\/.*\.(html|js|css)|test\/.*|tests\/.*)$/i.test(file));
  const selected = [...new Set([
    ...hintedFiles,
    ...discovered,
  ])].slice(0, Number(options.maxSelected || 45));
  const contents = [];
  let budget = Number(options.contentBudget || 80_000);
  for (const file of selected) {
    if (budget <= 0) break;
    const text = await fs.readFile(path.join(root, file), 'utf8').catch(() => '');
    const excerpt = text.slice(0, Math.min(12_000, budget)); budget -= excerpt.length;
    contents.push({ path: file, content: excerpt });
  }
  let packageJson = null;
  try { packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')); } catch {}
  return { files, contents, packageJson, context: hints };
}

function buildPrompt(objective, project, policy) {
  return [
    'You are the implementation engine inside FENIX. Produce a minimal, working change.',
    'Return ONLY valid JSON: {"summary":"...","files":[{"path":"relative/path","content":"complete replacement content"}]}.',
    'Never include secrets, .env files, lockfiles, generated artifacts, deletion operations, or paths outside the repository.',
    'Use only ordinary source/test files from the listed project files. Never output an absolute path and never output any path beginning with .git/ (including hooks).',
    `Objective: ${objective}`,
    `Allowed paths: ${JSON.stringify(policy.allowedPaths?.length ? policy.allowedPaths : ['**'])}`,
    `Blocked paths: ${JSON.stringify([...(policy.blockedPaths || []), ...DEFAULT_BLOCKED])}`,
    `Screen/project context: ${JSON.stringify(project.context || {})}`,
    `Project files: ${JSON.stringify(project.files)}`,
    `Relevant contents: ${JSON.stringify(project.contents)}`,
  ].join('\n\n');
}

function buildAnalysisPrompt(objective, project) {
  return [
    'You are the read-only analysis engine inside FENIX.',
    'Do not propose file contents and do not modify anything.',
    'Return ONLY valid JSON: {"summary":"...","proposals":[{"title":"...","impact":"LOW|MEDIUM|HIGH","risk":"LOW|MEDIUM|HIGH","rationale":"...","files":["relative/path"],"tests":["..."]}]}.',
    'Return exactly three concrete proposals grounded in the supplied project evidence.',
    `Objective: ${objective}`,
    `Screen/project context: ${JSON.stringify(project.context || {})}`,
    `Project files: ${JSON.stringify(project.files)}`,
    `Relevant contents: ${JSON.stringify(project.contents)}`,
    'FINAL CONTRACT: output exactly {"summary":"...","proposals":[{"title":"...","impact":"LOW|MEDIUM|HIGH","risk":"LOW|MEDIUM|HIGH","rationale":"...","files":["real/relative/path"],"tests":["..."]},{"title":"...","impact":"LOW|MEDIUM|HIGH","risk":"LOW|MEDIUM|HIGH","rationale":"...","files":["real/relative/path"],"tests":["..."]},{"title":"...","impact":"LOW|MEDIUM|HIGH","risk":"LOW|MEDIUM|HIGH","rationale":"...","files":["real/relative/path"],"tests":["..."]}]}. Output no other keys, prose, markdown, or code fences.',
  ].join('\n\n');
}

function parseAnalysis(text, knownFiles = null) {
  const normalized = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = normalized.indexOf('{');
  const lastBrace = normalized.lastIndexOf('}');
  const raw = firstBrace >= 0 && lastBrace > firstBrace ? normalized.slice(firstBrace, lastBrace + 1) : normalized;
  let analysis;
  try { analysis = JSON.parse(raw); } catch { throw new ValidationError('AI analysis response is not valid JSON'); }
  if (!Array.isArray(analysis.proposals) || analysis.proposals.length !== 3) throw new ValidationError('AI analysis response requires exactly 3 proposals');
  for (const [index, proposal] of analysis.proposals.entries()) {
    if (!proposal || typeof proposal.title !== 'string' || typeof proposal.rationale !== 'string') throw new ValidationError(`invalid AI analysis proposal at index ${index}`);
    if (proposal.files !== undefined && !Array.isArray(proposal.files)) throw new ValidationError(`invalid proposal files at index ${index}`);
    if (knownFiles) {
      if (!proposal.files?.length) throw new ValidationError(`analysis proposal at index ${index} requires grounded files`);
      const unknown = proposal.files.filter((file) => !knownFiles.has(String(file).replace(/\\/g, '/').replace(/^\.\//, '')));
      if (unknown.length) throw new ValidationError(`analysis proposal at index ${index} cites unknown files: ${unknown.join(', ')}`);
    }
  }
  return { summary: typeof analysis.summary === 'string' ? analysis.summary : '', proposals: analysis.proposals };
}

function buildPreviewArtifact(context, changed, worktree) {
  const target = context.previewTarget || null;
  if (!target?.path) {
    return { type: 'preview', status: 'NOT_AVAILABLE', reason: 'selected screen has no discovered previewTarget' };
  }
  return {
    type: 'preview',
    status: 'WORKTREE_READY',
    target,
    worktree,
    changedFiles: changed,
    reason: 'worktree code is ready; a preview server must expose this isolated checkout before the UI can claim an updated live preview',
  };
}

function parsePlan(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let plan;
  try { plan = JSON.parse(raw); } catch { throw new ValidationError('AI implementation response is not valid JSON'); }
  if (!Array.isArray(plan.files) || plan.files.length > 40) throw new ValidationError('AI implementation plan requires at most 40 files');
  for (const file of plan.files) {
    const candidate = String(file?.path || '').replace(/\\/g, '/');
    if (!candidate || candidate.split('/').includes('..') || candidate.split('/').includes('.git')) {
      throw new ValidationError(`AI implementation plan contains an unsafe relative path: ${candidate}`);
    }
  }
  return plan;
}

function normalizePlanPaths(plan, sourcePath) {
  const sourceRoot = path.resolve(sourcePath);
  return { ...plan, files: plan.files.map((file) => {
    const candidate = String(file.path || '').replace(/\\/g, '/');
    if (!path.isAbsolute(candidate)) return file;
    const absolute = path.resolve(candidate);
    const relative = path.relative(sourceRoot, absolute).replace(/\\/g, '/');
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new ValidationError(`AI implementation plan absolute path is outside repository: ${candidate}`);
    return { ...file, path: relative };
  }) };
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
  if (typeof gate === 'string') {
    const parts = gate.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) throw new ValidationError(`invalid gate at index ${index}`);
    gate = { name: `gate-${index + 1}`, command: parts.shift(), args: parts };
  }
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

module.exports = { SafeDevPipeline, collectContext, buildAnalysisPrompt, parseAnalysis, parsePlan, applyPlan, globMatch, normalizeGates, runGates, buildPreviewArtifact };
