const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const { uuid } = require('../kernel/ids');
const { GitReadCapability } = require('../repo-intel/git-read-capability');
const { GitWorkspaceWriteCapability } = require('../repo-intel/git-write-capability');
const { GitCommitCapability } = require('../repo-intel/git-commit-capability');
const run = promisify(execFile);

const TEST_COMMANDS = new Set(['node --check', 'npm test', 'npm run test']);

class AgentWorkspaceExecutor {
  constructor({ store, controlPlane, gitWrite, gitRead, gitCommit }) { this.store = store; this.cp = controlPlane; this.gitWrite = gitWrite; this.gitRead = gitRead; this.gitCommit = gitCommit; }
  async execute(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const state = await this.store.read(); const project = state.projects.find((item) => item.tenantId === tenantId && item.id === input.projectId);
    if (!project?.workspace) throw new Error('agent execution requires a Project Kernel workspace');
    const root = path.resolve(project.workspace); const read = new GitReadCapability({ workspaceRoot: root }); const write = new GitWorkspaceWriteCapability({ workspaceRoot: root }); const commitCapability = new GitCommitCapability({ workspaceRoot: root }); const head = (await read.execute('rev-parse', [], '.')).stdout.trim();
    const checkpoint = { id: uuid(), missionId: input.missionId || null, jobId: input.jobId || null, type: 'AGENT_PRE_WRITE', status: 'VALID', createdAt: new Date().toISOString(), branch: project.branch || null, headCommit: head, workspaceState: { workspace: root }, metadata: { projectId: project.id, agentId: input.agentId || null } };
    await this.store.update((next) => { next.missionCheckpoints.push(checkpoint); return next; });
    const changed = []; const operations = Array.isArray(input.operations) ? input.operations : [];
    for (const operation of operations) { const result = await write.write({ ...operation, root: '.', expectedBranch: project.branch || undefined, expectedHead: head, requireClean: operation.requireClean === true }); changed.push(result.path || result.to || result.from); }
    const status = await read.execute('status', [], '.'); const diff = await read.execute('diff', [], '.');
    const tests = []; let testsPassed = true;
    for (const command of (Array.isArray(input.tests) ? input.tests : [])) {
      const normalized = String(command).trim(); if (![...TEST_COMMANDS].some((allowed) => normalized === allowed || normalized.startsWith(`${allowed} `))) throw new Error(`test command is not allowlisted: ${normalized}`);
      const [executable, ...args] = normalized.split(/\s+/); try { const result = await run(executable, args, { cwd: root, timeout: 120_000, windowsHide: true }); tests.push({ command: normalized, passed: true, stdout: result.stdout || '', stderr: result.stderr || '' }); } catch (error) { testsPassed = false; tests.push({ command: normalized, passed: false, error: String(error.message).slice(0, 2000) }); }
    }
    let commit = null;
    if (input.commit === true && testsPassed && input.validationPassed === true && input.policyAllows === true) commit = await commitCapability.commit({ root: '.', files: changed.filter(Boolean), expectedHead: head, missionId: input.missionId, jobId: input.jobId, projectId: project.id, agent: input.agentId, message: input.commitMessage || 'FENIX agent implementation' , testsPassed, validationPassed: true, policyAllows: true });
    const artifact = { id: uuid(), tenantId, projectId: project.id, missionId: input.missionId || null, jobId: input.jobId || null, type: 'FENIX_AGENT_EXECUTION_REPORT', name: 'AGENT_EXECUTION_REPORT.md', content: [`# Agent Execution Report`, `Agent: ${input.agentId || 'unknown'}`, `Tests passed: ${testsPassed}`, `Commit: ${commit?.commit || 'none'}`, '', '## Diff', '```text', diff.stdout, '```', '', '## Status', '```text', status.stdout, '```'].join('\n'), createdBy: actorId, createdAt: new Date().toISOString() };
    await this.store.update((next) => { next.artifacts.push(artifact); return next; });
    return { projectId: project.id, missionId: input.missionId || null, jobId: input.jobId || null, agentId: input.agentId || null, filesChanged: changed, artifacts: [{ id: artifact.id, type: artifact.type, name: artifact.name }], tests, diff: diff.stdout, status: status.stdout, commit, testsPassed, validationPassed: input.validationPassed === true, result: commit ? 'COMMITTED' : testsPassed ? 'VALIDATED_NO_COMMIT' : 'FAILED_TESTS', nextActions: testsPassed ? [] : ['rollback or repair'] };
  }
}
module.exports = { AgentWorkspaceExecutor };
