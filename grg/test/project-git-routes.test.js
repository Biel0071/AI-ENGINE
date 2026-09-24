const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { handleProjectGitRoutes } = require('../src/api/project-git-routes');

test('Project Kernel Git shows changes, commits selected files and pushes the branch', async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-project-git-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const repo = path.join(temp, 'project');
  const remote = path.join(temp, 'remote.git');
  fs.mkdirSync(repo);
  const git = (args, cwd = repo) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git(['init', '--bare', remote], temp);
  git(['init']); git(['config', 'user.name', 'Fenix QA']); git(['config', 'user.email', 'qa@example.invalid']);
  fs.writeFileSync(path.join(repo, 'one.txt'), 'before\n');
  fs.writeFileSync(path.join(repo, 'two.txt'), 'before\n');
  git(['add', '.']); git(['commit', '-m', 'initial']); git(['remote', 'add', 'origin', remote]);
  const branch = git(['branch', '--show-current']);
  git(['push', '-u', 'origin', branch]);
  fs.writeFileSync(path.join(repo, 'one.txt'), 'after\n');
  fs.writeFileSync(path.join(repo, 'two.txt'), 'untouched change\n');

  const app = {
    controlPlane: { authorize: async () => {} },
    projectKernel: { state: async () => ({ workspace: repo }) },
    audit: { record: async () => ({ id: 'audit' }) },
  };
  const call = async (method, endpoint, body) => {
    let result;
    await handleProjectGitRoutes({ method, body }, {}, new URL(`http://localhost${endpoint}`), app,
      (_res, status, data) => { result = { status, data }; }, async (req) => req.body,
      { tenantId: 'tenant', actorId: 'actor' });
    return result;
  };
  const endpoint = '/api/fenix/projects/project/git';
  const initial = await call('GET', endpoint);
  assert.equal(initial.status, 200);
  assert.deepEqual(initial.data.files.sort(), ['one.txt', 'two.txt']);
  const diff = await call('GET', `${endpoint}/diff?path=one.txt`);
  assert.match(diff.data.diff, /after/);
  const committed = await call('POST', `${endpoint}/commit`, { expectedHead: initial.data.head, message: 'fix: one file', files: ['one.txt'] });
  assert.equal(committed.status, 200);
  assert.deepEqual(committed.data.files, ['two.txt']);
  assert.equal(git(['show', '--format=', '--name-only', 'HEAD']), 'one.txt');
  const blocked = await call('POST', `${endpoint}/push`, { expectedHead: committed.data.head });
  assert.equal(blocked.status, 409);
  git(['stash', 'push', '-m', 'test only']);
  const clean = await call('GET', endpoint);
  const pushed = await call('POST', `${endpoint}/push`, { expectedHead: clean.data.head });
  assert.equal(pushed.status, 200);
  assert.equal(git(['rev-parse', 'HEAD'], remote), pushed.data.head);
  git(['remote', 'set-url', 'origin', 'https://github.com/example/fenix-test.git']);
  const connection = await call('GET', `${endpoint}/connection`);
  assert.equal(connection.status, 200);
  assert.equal(connection.data.supported, true);
  assert.equal(connection.data.repository, 'example/fenix-test');
  assert.equal(connection.data.publicKey, null);
  const previousKeyDir = process.env.FENIX_GIT_KEYS_DIR;
  process.env.FENIX_GIT_KEYS_DIR = path.join(temp, 'keys');
  try {
    const generated = await call('POST', `${endpoint}/connection`);
    assert.equal(generated.status, 200);
    assert.match(generated.data.publicKey, /^ssh-ed25519 /);
    assert.equal((await call('GET', `${endpoint}/connection`)).data.publicKey, generated.data.publicKey);
  } finally {
    if (previousKeyDir === undefined) delete process.env.FENIX_GIT_KEYS_DIR;
    else process.env.FENIX_GIT_KEYS_DIR = previousKeyDir;
  }
});
