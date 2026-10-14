const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { WorkspaceWriteError } = require('./git-write-capability');
const run = promisify(execFile);

class GitCommitCapability {
  constructor({ workspaceRoot, executor = run } = {}) { this.workspaceRoot = path.resolve(workspaceRoot || process.cwd()); this.executor = executor; }
  async commit(input = {}) {
    if (input.validationPassed !== true || input.testsPassed !== true || input.policyAllows !== true) throw new WorkspaceWriteError('commit requires validation, tests and policy approval', 'COMMIT_GATE_BLOCKED');
    const cwd = this.#root(input.root || '.');
    const head = (await this.#git(['rev-parse', 'HEAD'], cwd)).stdout.trim();
    if (input.expectedHead && input.expectedHead !== head) throw new WorkspaceWriteError(`HEAD changed: expected ${input.expectedHead}, got ${head}`, 'WORKSPACE_STATE_CHANGED');
    const files = Array.isArray(input.files) ? input.files.map((file) => this.#safePath(cwd, file)) : [];
    if (!files.length) throw new WorkspaceWriteError('commit requires explicit files', 'COMMIT_FILES_REQUIRED');
    await this.#git(['add', '--', ...files], cwd);
    const message = String(input.message || 'FENIX local change').trim();
    const trailers = [`Mission-Id: ${input.missionId || 'n/a'}`, `Job-Id: ${input.jobId || 'n/a'}`, `Project-Id: ${input.projectId || 'n/a'}`, `Agent: ${input.agent || 'fenix-runtime'}`, `Fenix-Timestamp: ${new Date().toISOString()}`];
    const result = await this.#git(['commit', '-m', `${message}\n\n${trailers.join('\n')}`], cwd);
    const commit = (await this.#git(['rev-parse', 'HEAD'], cwd)).stdout.trim();
    return { commit, message, files, missionId: input.missionId || null, jobId: input.jobId || null, projectId: input.projectId || null, agent: input.agent || 'fenix-runtime', stdout: result.stdout || '' };
  }
  #root(root) { const cwd = path.resolve(this.workspaceRoot, root); const relative = path.relative(this.workspaceRoot, cwd); if (relative.startsWith('..') || path.isAbsolute(relative)) throw new WorkspaceWriteError('workspace escapes configured root', 'WORKSPACE_ESCAPE'); return cwd; }
  #safePath(cwd, value) { const target = path.resolve(cwd, String(value || '')); const relative = path.relative(cwd, target); if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).includes('.git')) throw new WorkspaceWriteError('commit path escapes or targets .git', 'PROTECTED_PATH'); return relative; }
  #git(args, cwd) { return this.executor('git', args, { cwd, timeout: 30_000, windowsHide: true }); }
}
module.exports = { GitCommitCapability };
