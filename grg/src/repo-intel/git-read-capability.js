const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const run = promisify(execFile);

const COMMANDS = Object.freeze({
  status: ['status', '--short', '--branch'],
  branches: ['branch', '--all'],
  log: ['log', '--oneline', '--decorate', '-80'],
  diff: ['diff', '--stat'],
  show: ['show', '--stat', '--oneline'],
  'rev-parse': ['rev-parse', 'HEAD'],
  'merge-base': ['merge-base'],
});

class GitReadCapability {
  constructor({ workspaceRoot, executor = run } = {}) { this.workspaceRoot = path.resolve(workspaceRoot || process.cwd()); this.executor = executor; }
  async execute(operation = 'status', args = [], requestedRoot = '.') {
    const command = COMMANDS[operation];
    if (!command) throw new Error(`git operation is not read-only or unsupported: ${operation}`);
    const root = path.resolve(this.workspaceRoot, requestedRoot);
    const relative = path.relative(this.workspaceRoot, root);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('git workspace escapes configured root');
    const safeArgs = Array.isArray(args) ? args.map(String) : [];
    if (operation === 'merge-base' && safeArgs.length !== 2) throw new Error('merge-base requires exactly two refs');
    const result = await this.executor('git', [...command, ...safeArgs], { cwd: root, timeout: 30_000, windowsHide: true });
    return { operation, cwd: root, stdout: result.stdout || '', stderr: result.stderr || '', measuredAt: new Date().toISOString() };
  }
}

module.exports = { GitReadCapability, GIT_READ_OPERATIONS: Object.keys(COMMANDS) };
