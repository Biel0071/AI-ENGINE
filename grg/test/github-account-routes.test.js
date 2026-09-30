const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { handleProjectGitRoutes } = require('../src/api/project-git-routes');
const { storeSecret, deleteSecret } = require('../src/security/secret-resolver');

test('GitHub Account and Repository Integration Routes', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-gh-test-'));
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    try { deleteSecret('github_token'); } catch {}
  });

  const mockApp = {
    controlPlane: { authorize: async () => {} },
    projectKernel: {
      list: () => [
        { id: 'proj-1', name: 'Existing App', workspace: path.join(tempDir, 'proj-1'), repository: 'https://github.com/myuser/existing-app.git' }
      ],
      state: async () => ({ workspace: path.join(tempDir, 'proj-1') }),
      create: async (_tenant, _actor, input) => ({ id: input.id || 'new-proj', ...input })
    },
    audit: { record: async () => ({ id: 'audit-id' }) },
    fileSystemService: {
      cloneRepository: async ({ url, name }) => ({
        path: path.join(tempDir, name),
        url
      })
    }
  };

  const call = async (method, endpoint, body) => {
    let result;
    const url = new URL(`http://localhost${endpoint}`);
    await handleProjectGitRoutes(
      { method, body },
      {},
      url,
      mockApp,
      (_res, status, data) => { result = { status, data }; },
      async (req) => req.body,
      { tenantId: 'tenant-test', actorId: 'actor-test' }
    );
    return result;
  };

  // 1. Initial State: No token connected
  deleteSecret('github_token');
  const accountInitial = await call('GET', '/api/fenix/github/account');
  assert.equal(accountInitial.status, 200);
  assert.equal(accountInitial.data.connected, false);

  // 2. Reject connect with invalid or empty token
  const invalidConnect = await call('POST', '/api/fenix/github/connect', { token: '' });
  assert.equal(invalidConnect.status, 400);

  // 3. Connect endpoint validation with mock token (will fail network or auth if fake, returning 401)
  const fakeConnect = await call('POST', '/api/fenix/github/connect', { token: 'ghp_fake_test_token_12345' });
  // GitHub returns Bad credentials or 401 for fake token
  assert.ok(fakeConnect.status === 401 || fakeConnect.status === 400);

  // 4. Test disconnect route
  const disconnectRes = await call('POST', '/api/fenix/github/disconnect');
  assert.equal(disconnectRes.status, 200);
  assert.equal(disconnectRes.data.disconnected, true);

  // 5. Test activate route (1-click clone and register in Fênix)
  const activateRes = await call('POST', '/api/fenix/github/repos/activate', {
    cloneUrl: 'https://github.com/myuser/sample-repo.git',
    name: 'sample-repo',
    defaultBranch: 'main'
  });
  assert.equal(activateRes.status, 201);
  assert.equal(activateRes.data.activated, true);
  assert.equal(activateRes.data.project.name, 'sample-repo');
  assert.ok(activateRes.data.project.workspace.includes('sample-repo'));
});
