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
    const state = await this.store.read(); const project = state.projects.find((item) => item.tenantId === tenantId && item.id === input.projectId);
    if (!project?.workspace) throw new Error('agent execution requires a Project Kernel workspace');
    const root = path.resolve(project.workspace); const read = new GitReadCapability({ workspaceRoot: root }); const write = new GitWorkspaceWriteCapability({ workspaceRoot: root }); const commitCapability = new GitCommitCapability({ workspaceRoot: root }); const head = (await read.execute('rev-parse', [], '.')).stdout.trim();
    const checkpoint = { id: uuid(), missionId: input.missionId || null, jobId: input.jobId || null, type: 'AGENT_PRE_WRITE', status: 'VALID', createdAt: new Date().toISOString(), branch: project.branch || null, headCommit: head, workspaceState: { workspace: root }, metadata: { projectId: project.id, agentId: input.agentId || null } };
    await this.store.update((next) => { next.missionCheckpoints.push(checkpoint); return next; });
    const changed = []; const operations = Array.isArray(input.operations) ? input.operations : [];
    if (operations.length && (!Array.isArray(input.tests) || !input.tests.length)) throw new Error('agent file changes require validation tests');
    for (const operation of operations) {
      const tool = operation.tool || operation.toolId;
      if (tool && !['filesystem.write', 'git.workspace.write'].includes(tool)) throw new Error(`unsupported workspace tool: ${tool}`);
      const normalizedOperation = operation.operation === 'write' ? (fs.existsSync(path.resolve(root, operation.path)) ? 'modify' : 'create') : operation.operation;
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
          const [executable, ...args] = normalized.split(/\s+/);
          const result = await run(executable, args, { cwd: root, timeout: 120_000, windowsHide: true });
          tests.push({ command: normalized, passed: true, stdout: result.stdout || '', stderr: result.stderr || '', sandbox: null });
        }
      } catch (error) { testsPassed = false; tests.push({ command: normalized, passed: false, error: String(error.sandboxOutput?.stderr || error.message).slice(0, 2000), sandbox: this.testSandboxFactory ? { driver: 'docker-rootless' } : null }); }
    }
    let commit = null;
    if (input.commit === true && testsPassed && input.validationPassed === true && input.policyAllows === true) commit = await commitCapability.commit({ root: '.', files: changed.filter(Boolean), expectedHead: head, missionId: input.missionId, jobId: input.jobId, projectId: project.id, agent: input.agentId, message: input.commitMessage || 'FENIX agent implementation' , testsPassed, validationPassed: true, policyAllows: true });
    const artifact = { id: uuid(), tenantId, projectId: project.id, missionId: input.missionId || null, jobId: input.jobId || null, type: 'FENIX_AGENT_EXECUTION_REPORT', name: 'AGENT_EXECUTION_REPORT.md', content: [`# Agent Execution Report`, `Agent: ${input.agentId || 'unknown'}`, `Tests passed: ${testsPassed}`, `Commit: ${commit?.commit || 'none'}`, '', '## Diff', '```text', diff.stdout, '```', '', '## Status', '```text', status.stdout, '```'].join('\n'), createdBy: actorId, createdAt: new Date().toISOString() };
    await this.store.update((next) => { next.artifacts.push(artifact); return next; });
    if (!testsPassed) throw new Error(`agent validation tests failed; report artifact ${artifact.id}`);
    return { projectId: project.id, missionId: input.missionId || null, jobId: input.jobId || null, agentId: input.agentId || null, filesChanged: changed, artifacts: [{ id: artifact.id, type: artifact.type, name: artifact.name }], tests, diff: diff.stdout, status: status.stdout, commit, testsPassed, validationPassed: input.validationPassed === true, result: commit ? 'COMMITTED' : 'VALIDATED_NO_COMMIT', nextActions: [] };
  }
}
module.exports = { AgentWorkspaceExecutor };

function isAllowedTestCommand(command) {
  if ([...TEST_COMMANDS].some((allowed) => command === allowed || command.startsWith(`${allowed} `))) return true;
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
