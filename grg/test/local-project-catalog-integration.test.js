const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { getLocalProjects } = require('../src/projects/local-project-catalog');
const { ProjectKernel } = require('../src/projects/project-kernel');
const { handleProjectWorkspaceRoutes } = require('../src/api/project-workspace-routes');
const { handleProjectGitRoutes } = require('../src/api/project-git-routes');

test('local project catalog exposes real folders and file projects without launcher commands', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-local-catalog-'));
  const projectsRoot = path.join(root, 'projects');
  const appRoot = path.join(projectsRoot, 'app');
  await fs.mkdir(appRoot, { recursive: true });
  await fs.writeFile(path.join(appRoot, 'index.html'), '<main>app</main>');
  await fs.writeFile(path.join(appRoot, 'package.json'), JSON.stringify({ name: 'app', version: '2.4.1' }));
  const entryFile = path.join(projectsRoot, 'standalone.html');
  await fs.writeFile(entryFile, '<main>standalone</main>');
  const catalogFile = path.join(root, 'projetos.json');
  await fs.writeFile(catalogFile, `\uFEFF${JSON.stringify({ items: [
    { id: 'app', name: 'App', path: appRoot, command: 'npm start', group: 'Web', mode: 'web', localPort: 8181, apiPort: 8787, localUrl: 'http://127.0.0.1:8181', healthUrl: 'http://127.0.0.1:8787/health', remoteUrl: 'https://example.test/app' },
    { id: 'standalone', name: 'Standalone', path: entryFile, command: 'start.bat' },
    { id: 'missing', name: 'Missing', path: path.join(root, 'gone') },
    { id: 'bad', name: 'Bad', path: '..\\..\\Windows' },
  ] })}`);
  try {
    const projects = getLocalProjects({ filePath: catalogFile });
    assert.deepEqual(projects.map((item) => item.id), ['app', 'standalone', 'missing']);
    assert.equal(projects[0].workspace, appRoot);
    assert.equal(projects[1].workspace, projectsRoot);
    assert.equal(projects[1].entryFile, 'standalone.html');
    assert.equal(projects[2].workspace, null);
    assert.equal(projects[0].workspaceAvailable, true);
    assert.equal(projects[0].localPort, 8181);
    assert.equal(projects[0].apiPort, 8787);
    assert.equal(projects[0].projectVersion, '2.4.1');
    assert.equal(projects[0].mode, 'web');
    assert.equal(projects[0].healthUrl, 'http://127.0.0.1:8787/health');
    assert.equal(Object.hasOwn(projects[0], 'command'), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('default local catalog cache refreshes when the catalog file changes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-local-catalog-cache-'));
  const folder = path.join(root, 'folder');
  const file = path.join(root, 'projetos.json');
  const previousCatalog = process.env.FENIX_LOCAL_PROJECT_CATALOG;
  await fs.mkdir(folder);
  try {
    process.env.FENIX_LOCAL_PROJECT_CATALOG = file;
    await fs.writeFile(file, JSON.stringify({ items: [{ id: 'first', name: 'First', path: folder }] }));
    assert.deepEqual(getLocalProjects().map((project) => project.id), ['first']);
    await fs.writeFile(file, JSON.stringify({ items: [{ id: 'second', name: 'Second', path: folder }] }));
    const future = new Date(Date.now() + 10_000);
    await fs.utimes(file, future, future);
    assert.deepEqual(getLocalProjects().map((project) => project.id), ['second']);
  } finally {
    if (previousCatalog === undefined) delete process.env.FENIX_LOCAL_PROJECT_CATALOG;
    else process.env.FENIX_LOCAL_PROJECT_CATALOG = previousCatalog;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('Project Hub catalog entries resolve through project state and read-only IDE tree', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-local-project-hub-'));
  const workspace = path.join(root, 'sample');
  const catalogFile = path.join(root, 'projetos.json');
  const logosDirectory = path.join(root, 'logos');
  const previousCatalog = process.env.FENIX_LOCAL_PROJECT_CATALOG;
  await fs.mkdir(workspace);
  await fs.mkdir(logosDirectory);
  const logoBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/8ioAAAAASUVORK5CYII=', 'base64');
  await fs.writeFile(path.join(logosDirectory, 'sample-logo.png'), logoBytes);
  await fs.writeFile(path.join(workspace, 'index.html'), '<main>screen</main>');
  const entryPath = path.join(root, 'one-screen.html');
  await fs.writeFile(entryPath, '<main>only declared file</main>');
  await fs.writeFile(catalogFile, JSON.stringify({ items: [
    { id: 'sample-local', name: 'Sample Local', path: workspace, group: 'QA', logoId: 'sample-logo' },
    { id: 'single-file', name: 'Single File', path: entryPath, group: 'QA' },
  ] }));
  process.env.FENIX_LOCAL_PROJECT_CATALOG = catalogFile;
  let state = { projects: [{ id: 'persisted', tenantId: 'grg', name: 'Persisted', workspace }], projectKernelStates: [], runtimeJobs: [], missions: [], artifacts: [] };
  const store = { read: async () => state, update: async (mutate) => (state = mutate(state)) };
  const controlPlane = { authorize: async () => true };
  try {
    const kernel = new ProjectKernel({ store, controlPlane });
    const projects = await kernel.list('grg', 'qa');
    assert.deepEqual(projects.map((project) => project.id), ['persisted', 'local-sample-local', 'local-single-file']);

    state.projects[0].workspace = path.join(root, 'other-workspace');
    const withDistinctPath = await kernel.list('grg', 'qa');
    assert.deepEqual(withDistinctPath.map((project) => project.id), ['persisted', 'local-sample-local', 'local-single-file']);
    assert.equal(withDistinctPath[1].source, 'LOCAL_PROJECT_CATALOG');
    assert.equal(withDistinctPath[1].logoId, 'sample-logo');
    assert.equal(withDistinctPath[1].logoUrl, '/api/fenix/projects/local-sample-local/logo');
    let logoStatus = 0;
    let logoHeaders = {};
    let logoBody = null;
    const logoRes = {
      writeHead(status, headers) { logoStatus = status; logoHeaders = headers; },
      end(body) { logoBody = body; },
    };
    await handleProjectWorkspaceRoutes(
      { method: 'GET' }, logoRes, new URL('http://fenix.test/api/fenix/projects/local-sample-local/logo'),
      { store, controlPlane }, (_res, status, body) => { logoStatus = status; logoBody = body; }, async () => ({}),
      { tenantId: 'grg', actorId: 'qa' },
    );
    assert.equal(logoStatus, 200);
    assert.equal(logoHeaders['Content-Type'], 'image/png');
    assert.deepEqual(logoBody, logoBytes);
    assert.equal((await kernel.state('grg', 'qa', 'local-sample-local')).workspace, workspace);

    let response;
    await handleProjectWorkspaceRoutes(
      { method: 'GET' }, {}, new URL('http://fenix.test/api/fenix/projects/local-sample-local/tree'),
      { store, controlPlane }, (_res, status, body) => { response = { status, body }; }, async () => ({}),
      { tenantId: 'grg', actorId: 'qa' },
    );
    assert.equal(response.status, 200);
    assert.ok(response.body.tree.some((item) => item.path === 'index.html'));

    await handleProjectWorkspaceRoutes(
      { method: 'GET' }, {}, new URL('http://fenix.test/api/fenix/projects/local-single-file/tree'),
      { store, controlPlane }, (_res, status, body) => { response = { status, body }; }, async () => ({}),
      { tenantId: 'grg', actorId: 'qa' },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.tree.map((item) => item.path), ['one-screen.html']);

    await handleProjectWorkspaceRoutes(
      { method: 'GET' }, {}, new URL('http://fenix.test/api/fenix/projects/local-single-file/file?path=index.html'),
      { store, controlPlane }, (_res, status, body) => { response = { status, body }; }, async () => ({}),
      { tenantId: 'grg', actorId: 'qa' },
    );
    assert.equal(response.status, 404);
  } finally {
    if (previousCatalog === undefined) delete process.env.FENIX_LOCAL_PROJECT_CATALOG;
    else process.env.FENIX_LOCAL_PROJECT_CATALOG = previousCatalog;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('local catalogue workspace can show Git status without changing repository state', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-local-catalog-git-'));
  const workspace = path.join(root, 'repo');
  const catalogFile = path.join(root, 'projetos.json');
  const previousCatalog = process.env.FENIX_LOCAL_PROJECT_CATALOG;
  await fs.mkdir(workspace);
  const git = (args) => execFileSync('git', args, { cwd: workspace, encoding: 'utf8' }).trim();
  try {
    git(['init']);
    git(['config', 'user.name', 'Fenix QA']);
    git(['config', 'user.email', 'qa@example.invalid']);
    await fs.writeFile(path.join(workspace, 'README.md'), 'local project\n');
    git(['add', 'README.md']);
    git(['commit', '-m', 'initial']);
    await fs.writeFile(catalogFile, JSON.stringify({ items: [{ id: 'git-sample', name: 'Git Sample', path: workspace }] }));
    process.env.FENIX_LOCAL_PROJECT_CATALOG = catalogFile;
    const state = { projects: [], projectKernelStates: [], runtimeJobs: [], missions: [], artifacts: [] };
    const kernel = new ProjectKernel({
      store: { read: async () => state },
      controlPlane: { authorize: async () => true },
    });
    const app = { controlPlane: { authorize: async () => true }, projectKernel: kernel };
    let response;
    await handleProjectGitRoutes(
      { method: 'GET' }, {}, new URL('http://fenix.test/api/fenix/projects/local-git-sample/git'), app,
      (_res, status, body) => { response = { status, body }; }, async () => ({}),
      { tenantId: 'grg', actorId: 'qa' },
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.projectId, 'local-git-sample');
    assert.equal(response.body.head, git(['rev-parse', 'HEAD']));
    assert.equal(git(['status', '--short']), '');
  } finally {
    if (previousCatalog === undefined) delete process.env.FENIX_LOCAL_PROJECT_CATALOG;
    else process.env.FENIX_LOCAL_PROJECT_CATALOG = previousCatalog;
    await fs.rm(root, { recursive: true, force: true });
  }
});
