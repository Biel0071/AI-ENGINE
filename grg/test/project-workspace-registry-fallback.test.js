const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { ProjectKernel } = require('../src/projects/project-kernel');
const { getProjectById } = require('../src/projects/project-registry');
const { handleProjectWorkspaceRoutes } = require('../src/api/project-workspace-routes');

const git = promisify(execFile);

test('Project Kernel and IDE resolve an existing registry workspace when the saved path is stale', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-project-workspace-'));
  const project = getProjectById('api-platform');
  const original = { vpsPath: project.vpsPath, localPath: project.localPath, workspace: project.workspace, productionPath: project.productionPath, branch: project.branch };
  const staleWorkspace = path.join(os.tmpdir(), `missing-project-${Date.now()}`);
  let state = {
    projects: [{ id: 'api-platform', tenantId: 'grg', name: 'API Platform', workspace: staleWorkspace, branch: 'main', lifecycle: 'EVOLUTION' }],
    projectKernelStates: [],
    runtimeJobs: [],
    missions: [],
    artifacts: [],
  };
  const store = {
    read: async () => state,
    update: async (mutate) => { state = mutate(state); return state; },
  };

  try {
    project.vpsPath = root;
    project.localPath = path.join(root, 'missing-local-copy');
    project.workspace = path.join(root, 'missing-workspace');
    project.productionPath = path.join(root, 'apps', 'api');
    project.branch = 'fenix/test-workspace';
    await fs.writeFile(path.join(root, 'app.js'), 'module.exports = true;\n');
    await git('git', ['init', '-b', 'main'], { cwd: root });
    await git('git', ['add', 'app.js'], { cwd: root });
    await git('git', ['-c', 'user.email=fenix@test.invalid', '-c', 'user.name=FENIX Test', 'commit', '-m', 'initial'], { cwd: root });

    const controlPlane = { authorize: async () => true };
    const kernel = new ProjectKernel({ store, controlPlane, events: null });
    const listed = await kernel.list('grg', 'qa');
    const apiProject = listed.find((item) => item.id === 'api-platform');
    assert.equal(apiProject.workspace, root);
    assert.equal(apiProject.branch, 'fenix/test-workspace');

    const analyzed = await kernel.analyze('grg', 'qa', 'api-platform');
    assert.match(analyzed.head, /^[0-9a-f]{40}$/);

    let response;
    await handleProjectWorkspaceRoutes(
      { method: 'GET' },
      {},
      new URL('http://fenix.test/api/fenix/projects/api-platform/tree'),
      { store, controlPlane },
      (_res, status, body) => { response = { status, body }; },
      async () => ({}),
      { tenantId: 'grg', actorId: 'qa' },
    );
    assert.equal(response.status, 200);
    assert.ok(response.body.tree.some((item) => item.path === 'app.js'));
  } finally {
    Object.assign(project, original);
    await fs.rm(root, { recursive: true, force: true });
  }
});
