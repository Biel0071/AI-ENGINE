const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const { promisify } = require('node:util');
const path = require('node:path');
const { uuid } = require('../kernel/ids');
const { GitReadCapability } = require('../repo-intel/git-read-capability');
const { GitWorkspaceWriteCapability } = require('../repo-intel/git-write-capability');
const { GitCommitCapability } = require('../repo-intel/git-commit-capability');
const run = promisify(execFile);

const TEST_COMMANDS = new Set(['node --check', 'npm test', 'npm run test']);

class AgentWorkspaceExecutor {
  constructor({ store, controlPlane, gitWrite, gitRead, gitCommit, testSandboxFactory = null, testImage = null }) { this.store = store; this.cp = controlPlane; this.gitWrite = gitWrite; this.gitRead = gitRead; this.gitCommit = gitCommit; this.testSandboxFactory = testSandboxFactory; this.testImage = testImage; }
  async execute(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const state = await this.store.read();
    let project = state.projects.find((item) => item.tenantId === tenantId && item.id === input.projectId);
    let root;
    if (project?.workspace) {
      root = path.resolve(project.workspace);
    } else {
      const projId = input.projectId || (input.missionId ? `mission-${input.missionId}` : uuid());
      const baseWorkspaces = process.env.FENIX_WORKSPACE_ROOT || path.resolve(path.join(__dirname, '..', '..', 'workspaces'));
      root = path.resolve(baseWorkspaces, projId);
      if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
      project = {
        id: projId,
        tenantId,
        name: input.projectName || projId,
        workspace: root,
        branch: 'main',
        lifecycle: 'EVOLUTION',
        maturity: 'FUNCTIONAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this.store.update((next) => {
        const idx = next.projects.findIndex((p) => p.tenantId === tenantId && p.id === projId);
        if (idx >= 0) next.projects[idx] = project;
        else next.projects.push(project);
        return next;
      });
    }

    if (!fs.existsSync(path.join(root, '.git'))) {
      const { execFileSync } = require('node:child_process');
      try {
        execFileSync('git', ['init', '-b', 'main'], { cwd: root, stdio: 'pipe' });
      } catch {
        execFileSync('git', ['init'], { cwd: root, stdio: 'pipe' });
      }
      execFileSync('git', ['config', 'user.name', 'Fenix Agent'], { cwd: root, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.email', 'agent@fenix.os'], { cwd: root, stdio: 'pipe' });
      execFileSync('git', ['commit', '--allow-empty', '-m', 'initial workspace commit'], { cwd: root, stdio: 'pipe' });
    }

    const read = new GitReadCapability({ workspaceRoot: root });
    const write = new GitWorkspaceWriteCapability({ workspaceRoot: root });
    const commitCapability = new GitCommitCapability({ workspaceRoot: root });
    const head = (await read.execute('rev-parse', [], '.')).stdout.trim();
    const checkpoint = { id: uuid(), missionId: input.missionId || null, jobId: input.jobId || null, type: 'AGENT_PRE_WRITE', status: 'VALID', createdAt: new Date().toISOString(), branch: project.branch || null, headCommit: head, workspaceState: { workspace: root }, metadata: { projectId: project.id, agentId: input.agentId || null } };
    await this.store.update((next) => { next.missionCheckpoints.push(checkpoint); return next; });
    const changed = []; const operations = Array.isArray(input.operations) ? input.operations : [];
    if (operations.length && (!Array.isArray(input.tests) || !input.tests.length)) throw new Error('agent file changes require validation tests');
    for (const operation of operations) {
      const tool = operation.tool || operation.toolId;
      if (tool && !['filesystem.write', 'git.workspace.write'].includes(tool)) throw new Error(`unsupported workspace tool: ${tool}`);
      const exists = fs.existsSync(path.resolve(root, operation.path));
      const normalizedOperation = (operation.operation === 'write' || (operation.operation === 'create' && exists) || (operation.operation === 'modify' && !exists))
        ? (exists ? 'modify' : 'create')
        : (operation.operation || 'create');
      const result = await write.write({ ...operation, operation: normalizedOperation, root: '.', expectedBranch: project.branch || undefined, expectedHead: head, requireClean: operation.requireClean === true });
      changed.push(result.path || result.to || result.from);
    }
    const status = await read.execute('status', [], '.'); const diff = await read.execute('diff', [], '.');
    const tests = []; let testsPassed = true;
    for (const command of (Array.isArray(input.tests) ? input.tests : [])) {
      const normalized = String(command).trim();
      if (!isAllowedTestCommand(normalized)) throw new Error(`test command is not allowlisted: ${normalized}`);
      try {
        if (this.testSandboxFactory) {
          const result = await runSandboxedCheck(this.testSandboxFactory, this.testImage, root, normalized);
          tests.push({ command: normalized, passed: true, stdout: result.stdout || '', stderr: result.stderr || '', sandbox: result.sandbox });
        } else {
          let [executable, ...args] = normalized.split(/\s+/);
          const testFilePath = path.resolve(root, args[args.length - 1] || '');
          if (fs.existsSync(testFilePath) && testFilePath.endsWith('.js')) {
            let testCode = fs.readFileSync(testFilePath, 'utf8');
            let prepend = '';
            if ((testCode.includes('describe(') || testCode.includes('it(')) && !testCode.includes('node:test')) {
              prepend += `const { describe, it } = require('node:test');\n`;
            }
            if (testCode.includes('expect(') && !testCode.includes('const expect') && !testCode.includes('let expect')) {
              prepend += `const expect = (actual) => ({ toBe: (expected) => require('node:assert/strict').strictEqual(actual, expected), toEqual: (expected) => require('node:assert/strict').deepStrictEqual(actual, expected) });\n`;
            }
            if (prepend) {
              fs.writeFileSync(testFilePath, prepend + testCode, 'utf8');
            }
          }
          const result = await run(executable, args, { cwd: root, timeout: 120_000, windowsHide: true, shell: process.platform === 'win32' });
          tests.push({ command: normalized, passed: true, stdout: result.stdout || '', stderr: result.stderr || '', sandbox: null });
        }
      } catch (error) {
        testsPassed = false;
        const failureOutput = error.stderr || error.stdout || error.sandboxOutput?.stderr || error.message;
        tests.push({ command: normalized, passed: false, error: String(failureOutput).slice(0, 2000), stdout: error.stdout || '', stderr: error.stderr || '', sandbox: this.testSandboxFactory ? { driver: 'docker-rootless' } : null });
      }
    }
    let commit = null;
    const policyAllows = input.policyAllows !== false;
    const validationPassed = testsPassed;
    if (input.commit !== false && testsPassed && validationPassed && policyAllows) commit = await commitCapability.commit({ root: '.', files: changed.filter(Boolean), expectedHead: head, missionId: input.missionId, jobId: input.jobId, projectId: project.id, agent: input.agentId, message: input.commitMessage || 'FENIX agent implementation' , testsPassed, validationPassed: true, policyAllows: true });
    const reportPath = path.join(root, 'AGENT_EXECUTION_REPORT.md');
    const artifact = { id: uuid(), tenantId, projectId: project.id, missionId: input.missionId || null, jobId: input.jobId || null, type: 'FENIX_AGENT_EXECUTION_REPORT', name: 'AGENT_EXECUTION_REPORT.md', filePath: reportPath, content: [`# Agent Execution Report`, `Agent: ${input.agentId || 'unknown'}`, `Tests passed: ${testsPassed}`, `Commit: ${commit?.commit || 'none'}`, '', '## Diff', '```text', diff.stdout, '```', '', '## Status', '```text', status.stdout, '```'].join('\n'), createdBy: actorId, createdAt: new Date().toISOString() };
    try { fs.writeFileSync(reportPath, artifact.content, 'utf8'); } catch {}
    await this.store.update((next) => { next.artifacts.push(artifact); return next; });
    if (!testsPassed) {
      const details = tests.filter(t => !t.passed).map(t => `${t.command}: ${t.error || t.stderr || t.stdout}`).join('\n');
      throw new Error(`agent validation tests failed:\n${details}\n(report artifact: ${artifact.id})`);
    }
    return { projectId: project.id, missionId: input.missionId || null, jobId: input.jobId || null, agentId: input.agentId || null, workspace: root, filesChanged: changed, artifacts: [{ id: artifact.id, type: artifact.type, name: artifact.name, path: reportPath }], tests, diff: diff.stdout, status: status.stdout, commit, testsPassed, validationPassed: validationPassed, result: commit ? 'COMMITTED' : 'VALIDATED_NO_COMMIT', nextActions: [] };
  }
}
module.exports = { AgentWorkspaceExecutor };

function isAllowedTestCommand(command) {
  if ([...TEST_COMMANDS].some((allowed) => command === allowed || command.startsWith(`${allowed} `))) return true;
  if (/^node\s+--test(?:\s+.*)?$/.test(command)) return true;
  if (/^node\s+(?:--[a-z0-9-]+\s+)*(?:[A-Za-z0-9._/-]+\/)?(?:test|.*\.test|.*\.spec)\.(?:js|mjs|cjs)$/.test(command)) return true;
  return /^node\s+(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.test\.js$/.test(command);
}

async function runSandboxedCheck(factory, image, root, command) {
  const match = /^node --check ([A-Za-z0-9._/-]+)$/.exec(command);
  if (!match) throw new Error('sandbox currently supports only node --check <project-relative-file>');
  const relative = match[1];
  if (path.isAbsolute(relative) || relative.split('/').some((segment) => !segment || segment === '.' || segment === '..' || segment.startsWith('.'))) throw new Error('invalid sandbox test path');
  const absolute = path.resolve(root, relative);
  if (fs.realpathSync(absolute) !== absolute || !fs.statSync(absolute).isFile() || fs.statSync(absolute).size > 1024 * 1024) throw new Error('sandbox test requires a regular file up to 1 MB');
  if (!/^.+@sha256:[a-f0-9]{64}$/.test(image || '')) throw new Error('sandbox test image must be pinned by digest');
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-agent-test-'));
  const snapshot = path.join(parent, 'repo');
  try {
    const target = path.join(snapshot, ...relative.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(absolute, target);
    return await factory({ workspaceRoot: parent }).run({ executionId: uuid(), tool: { image, allowedNetworks: ['none'] }, argv: ['node', '--check', relative], workspacePath: snapshot, limits: { timeoutMs: 30_000, memoryMb: 256, cpuUnits: 1000, pids: 64 }, network: 'none' });
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
}
