const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const run = promisify(execFile);
const WRITE_OPERATIONS = Object.freeze(['create', 'modify', 'delete', 'mkdir', 'rename']);
const BLOCKED_NAMES = new Set(['.env', '.env.local', '.env.production', 'credentials.json', 'id_rsa']);

class WorkspaceWriteError extends Error {
  constructor(message, code = 'WORKSPACE_WRITE_BLOCKED') { super(message); this.name = 'WorkspaceWriteError'; this.code = code; }
}

class GitWorkspaceWriteCapability {
  constructor({ workspaceRoot, executor = run, fileSystem = fs } = {}) {
    this.workspaceRoot = path.resolve(workspaceRoot || process.cwd());
    this.executor = executor;
    this.fs = fileSystem;
    this.locks = new Map();
  }

  async precheck({ root = '.', expectedBranch = null, expectedHead = null, requireClean = true } = {}) {
    const cwd = this.#resolveRoot(root);
    const branch = await this.#git(['branch', '--show-current'], cwd);
    const head = await this.#git(['rev-parse', 'HEAD'], cwd);
    const status = await this.#git(['status', '--porcelain'], cwd);
    const actualBranch = branch.stdout.trim(); const actualHead = head.stdout.trim();
    if (expectedBranch && actualBranch !== expectedBranch) throw new WorkspaceWriteError(`branch changed: expected ${expectedBranch}, got ${actualBranch}`, 'WORKSPACE_STATE_CHANGED');
    if (expectedHead && actualHead !== expectedHead) throw new WorkspaceWriteError(`HEAD changed: expected ${expectedHead}, got ${actualHead}`, 'WORKSPACE_STATE_CHANGED');
    if (requireClean && status.stdout.trim()) throw new WorkspaceWriteError('workspace is not clean', 'WORKSPACE_NOT_CLEAN');
    return { cwd, branch: actualBranch, head: actualHead, clean: !status.stdout.trim(), checkedAt: new Date().toISOString() };
  }

  async write(input = {}) {
    return this.#withLock(this.#resolveRoot(input.root || '.'), () => this.#writeUnlocked(input));
  }

  async #writeUnlocked(input = {}) {
    const operation = String(input.operation || '').trim();
    if (!WRITE_OPERATIONS.includes(operation)) throw new WorkspaceWriteError(`unsupported workspace operation: ${operation}`, 'UNSUPPORTED_WRITE');
    const cwd = this.#resolveRoot(input.root || '.');
    const check = await this.precheck({ root: input.root || '.', expectedBranch: input.expectedBranch, expectedHead: input.expectedHead, requireClean: input.requireClean !== false });
    const target = await this.#resolvePath(cwd, input.path);
    if (operation === 'mkdir') await this.fs.mkdir(target, { recursive: true });
    else if (operation === 'rename') {
      const source = await this.#resolvePath(cwd, input.from || input.path);
      const destination = await this.#resolvePath(cwd, input.to);
      await this.fs.rename(source, destination);
    } else if (operation === 'delete') await this.fs.rm(target, { recursive: true, force: false });
    else {
      if (operation === 'create') { try { await this.fs.access(target); throw new WorkspaceWriteError(`file already exists: ${input.path}`, 'FILE_EXISTS'); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
      await this.fs.mkdir(path.dirname(target), { recursive: true });
      await this.fs.writeFile(target, String(input.content ?? ''), 'utf8');
    }
    return { operation, path: input.path, from: input.from || null, to: input.to || null, ...check, changedAt: new Date().toISOString() };
  }

  async rollback({ root = '.', expectedHead = null, modifiedFiles = [], createdFiles = [] } = {}) {
    return this.#withLock(this.#resolveRoot(root), () => this.#rollbackUnlocked({ root, expectedHead, modifiedFiles, createdFiles }));
  }

  async #rollbackUnlocked({ root = '.', expectedHead = null, modifiedFiles = [], createdFiles = [] } = {}) {
    const cwd = this.#resolveRoot(root);
    const head = (await this.#git(['rev-parse', 'HEAD'], cwd)).stdout.trim();
    if (expectedHead && expectedHead !== head) throw new WorkspaceWriteError(`HEAD changed: expected ${expectedHead}, got ${head}`, 'WORKSPACE_STATE_CHANGED');
    for (const file of createdFiles) await this.fs.rm(await this.#resolvePath(cwd, file), { recursive: true, force: true });
    const tracked = []; for (const file of modifiedFiles) tracked.push(await this.#resolvePath(cwd, file));
    if (tracked.length) await this.#git(['restore', '--staged', '--worktree', '--', ...tracked.map((file) => path.relative(cwd, file))], cwd);
    return { restored: [...modifiedFiles, ...createdFiles], head, rolledBackAt: new Date().toISOString() };
  }

  #resolveRoot(root) {
    const resolved = path.resolve(this.workspaceRoot, String(root || '.'));
    const relative = path.relative(this.workspaceRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new WorkspaceWriteError('workspace escapes configured root', 'WORKSPACE_ESCAPE');
    return resolved;
  }
  async #resolvePath(cwd, value) {
    if (!value || typeof value !== 'string') throw new WorkspaceWriteError('path is required', 'PATH_REQUIRED');
    const target = path.resolve(cwd, value); const relative = path.relative(cwd, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new WorkspaceWriteError('path escapes project workspace', 'WORKSPACE_ESCAPE');
    const parts = relative.split(path.sep); if (parts.includes('.git') || parts.some((part) => BLOCKED_NAMES.has(part))) throw new WorkspaceWriteError('protected path cannot be modified', 'PROTECTED_PATH');
    let existing = target;
    try { await this.fs.access(existing); } catch (error) { if (error.code !== 'ENOENT') throw error; existing = path.dirname(existing); while (existing !== cwd && existing !== path.dirname(existing)) { try { await this.fs.access(existing); break; } catch (parentError) { if (parentError.code !== 'ENOENT') throw parentError; existing = path.dirname(existing); } } }
    const real = await this.fs.realpath(existing);
    const realRelative = path.relative(cwd, real);
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) throw new WorkspaceWriteError('symlink resolves outside project workspace', 'WORKSPACE_SYMLINK_ESCAPE');
    return target;
  }
  async #withLock(key, task) { const previous = this.locks.get(key) || Promise.resolve(); let release; const current = new Promise((resolve) => { release = resolve; }); this.locks.set(key, current); await previous; try { return await task(); } finally { release(); if (this.locks.get(key) === current) this.locks.delete(key); } }
  async #git(args, cwd) { return this.executor('git', args, { cwd, timeout: 30_000, windowsHide: true }); }
}

module.exports = { GitWorkspaceWriteCapability, WorkspaceWriteError, GIT_WORKSPACE_WRITE_OPERATIONS: WRITE_OPERATIONS };
