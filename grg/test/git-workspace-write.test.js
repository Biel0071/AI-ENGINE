const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { GitWorkspaceWriteCapability, WorkspaceWriteError } = require('../src/repo-intel/git-write-capability');
const { GitCommitCapability } = require('../src/repo-intel/git-commit-capability');

const run = promisify(execFile);
async function git(cwd, ...args) { return run('git', args, { cwd, windowsHide: true }); }

test('Git workspace write enforces isolation, precheck and local commit-ready diff', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-write-'));
  await git(root, 'init', '-b', 'fenix-test');
  await git(root, 'config', 'user.email', 'fenix@test.invalid'); await git(root, 'config', 'user.name', 'FENIX Test');
  await fs.writeFile(path.join(root, 'README.md'), 'initial\n'); await git(root, 'add', 'README.md'); await git(root, 'commit', '-m', 'initial');
  const head = (await git(root, 'rev-parse', 'HEAD')).stdout.trim();
  const capability = new GitWorkspaceWriteCapability({ workspaceRoot: root });
  const checkpoint = await capability.precheck({ expectedBranch: 'fenix-test', expectedHead: head });
  assert.equal(checkpoint.clean, true);
  await capability.write({ operation: 'create', root: '.', path: 'src/api.js', content: 'module.exports = 1;\n', expectedBranch: 'fenix-test', expectedHead: head });
  await capability.write({ operation: 'modify', root: '.', path: 'src/api.js', content: 'module.exports = 2;\n', requireClean: false });
  await capability.write({ operation: 'mkdir', root: '.', path: 'tmp/nested', requireClean: false });
  await capability.write({ operation: 'create', root: '.', path: 'tmp/nested/remove.txt', content: 'remove\n', requireClean: false });
  await capability.write({ operation: 'delete', root: '.', path: 'tmp/nested/remove.txt', requireClean: false });
  const diff = await git(root, 'diff', '--stat'); const untracked = (await git(root, 'status', '--short')).stdout;
  assert.match(untracked, /src\//); assert.equal(diff.stdout.trim(), '');
  await capability.write({ operation: 'modify', root: '.', path: 'README.md', content: 'broken\n', requireClean: false });
  await capability.write({ operation: 'create', root: '.', path: 'rollback.txt', content: 'temporary\n', requireClean: false });
  const rollback = await capability.rollback({ root: '.', expectedHead: head, modifiedFiles: ['README.md'], createdFiles: ['rollback.txt'] });
  assert.deepEqual(rollback.restored, ['README.md', 'rollback.txt']);
  assert.equal((await fs.readFile(path.join(root, 'README.md'), 'utf8')).replace(/\r\n/g, '\n'), 'initial\n');
  await fs.access(path.join(root, 'src/api.js'));
  await assert.rejects(() => capability.write({ operation: 'create', root: '.', path: '../escape.txt', content: 'x', requireClean: false }), (error) => error instanceof WorkspaceWriteError && error.code === 'WORKSPACE_ESCAPE');
  await assert.rejects(() => capability.write({ operation: 'create', root: '.', path: '.git/config', content: 'x', requireClean: false }), /protected path/);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-outside-'));
  try {
    await fs.symlink(outside, path.join(root, 'linked'), 'junction');
    await assert.rejects(() => capability.write({ operation: 'create', root: '.', path: 'linked/escape.txt', content: 'x', requireClean: false }), (error) => error.code === 'WORKSPACE_SYMLINK_ESCAPE');
  } catch (error) { if (!['EPERM', 'EACCES'].includes(error.code)) throw error; }
  await assert.rejects(() => new GitCommitCapability({ workspaceRoot: root }).commit({ root: '.', files: ['src/api.js'], testsPassed: false, validationPassed: true, policyAllows: true }), /commit requires/);
  await capability.write({ operation: 'create', root: '.', path: 'src/preserved.js', content: 'preserve\n', requireClean: false });
  const failingCommit = new GitCommitCapability({ workspaceRoot: root, executor: async (command, args, options) => { if (args[0] === 'commit') throw new Error('simulated commit failure'); return run(command, args, options); } });
  await assert.rejects(() => failingCommit.commit({ root: '.', files: ['src/preserved.js'], missionId: 'mission-fail', jobId: 'job-fail', projectId: 'project-fail', testsPassed: true, validationPassed: true, policyAllows: true }), /simulated commit failure/);
  assert.equal((await fs.readFile(path.join(root, 'src/preserved.js'), 'utf8')).replace(/\r\n/g, '\n'), 'preserve\n');
  const commit = await new GitCommitCapability({ workspaceRoot: root }).commit({ root: '.', files: ['src/api.js'], message: 'Implement API', missionId: 'mission-1', jobId: 'job-1', projectId: 'project-1', agent: 'backend', testsPassed: true, validationPassed: true, policyAllows: true });
  assert.match(commit.commit, /^[0-9a-f]{40}$/);
  assert.match((await git(root, 'log', '-1', '--format=%B')).stdout, /Mission-Id: mission-1/);
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(outside, { recursive: true, force: true });
});
