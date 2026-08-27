const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { ValidationError } = require('../kernel/errors');

const runFile = promisify(execFile);

class GitWorktreeManager {
  constructor({ root = process.env.FENIX_WORKTREE_ROOT || path.join(os.tmpdir(), 'fenix-worktrees'), exec = runFile } = {}) {
    this.root = path.resolve(root); this.exec = exec;
  }

  async create(repository, jobId, requestedBranch = null) {
    const source = path.resolve(String(repository || ''));
    if (!repository) throw new ValidationError('development job requires a repository/workspace path');
    await this.exec('git', ['rev-parse', '--show-toplevel'], { cwd: source, timeout: 10_000 });
    await fs.mkdir(this.root, { recursive: true });
    const safeId = String(jobId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48);
    const target = this.#insideRoot(path.join(this.root, safeId));
    const branch = requestedBranch || `fenix/job-${safeId}`;
    await this.exec('git', ['worktree', 'add', '-b', branch, target, 'HEAD'], { cwd: source, timeout: 60_000 });
    return { source, path: target, branch };
  }

  async diff(worktree) {
    const target = this.#insideRoot(worktree);
    await this.exec('git', ['add', '-N', '--all'], { cwd: target, timeout: 30_000 });
    const { stdout } = await this.exec('git', ['diff', '--no-ext-diff', '--binary'], { cwd: target, timeout: 30_000, maxBuffer: 5 * 1024 * 1024 });
    const { stdout: status } = await this.exec('git', ['status', '--short'], { cwd: target, timeout: 10_000 });
    return { diff: stdout, status: status.trim().split(/\r?\n/).filter(Boolean) };
  }

  async rollback(repository, worktree, branch) {
    const source = path.resolve(repository); const target = this.#insideRoot(worktree);
    await this.exec('git', ['worktree', 'remove', '--force', target], { cwd: source, timeout: 60_000 });
    if (branch?.startsWith('fenix/job-')) await this.exec('git', ['branch', '-D', branch], { cwd: source, timeout: 30_000 });
    return { removed: target, branchDeleted: branch || null };
  }

  #insideRoot(candidate) {
    const resolved = path.resolve(candidate); const relative = path.relative(this.root, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new ValidationError('worktree target must be a child of FENIX_WORKTREE_ROOT');
    return resolved;
  }
}

module.exports = { GitWorktreeManager };
