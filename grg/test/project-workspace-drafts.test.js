'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { FileStore } = require('../src/kernel/store');
const { handleProjectWorkspaceRoutes } = require('../src/api/project-workspace-routes');

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-drafts-'));
  await fs.mkdir(path.join(root, 'src'));
  await fs.writeFile(path.join(root, 'src', 'app.js'), 'const value = 1;\nconsole.log(value);\n');
  const calls = [];
  const store = new FileStore(path.join(root, 'state.json'), { retention: false });
  await store.update((state) => { state.projects.push({ tenantId: 'tenant-a', id: 'fixture', workspace: root }); return state; });
  const app = {
    store,
    controlPlane: { authorize: async (...args) => calls.push(['authorize', ...args]) },
    audit: { record: async (entry) => { calls.push(['audit', entry]); return { id: 'audit-1' }; } },
    memoryEngine: { remember: async (_tenant, _actor, entry) => { calls.push(['memory', entry]); return { id: 'memory-1', version: 1 }; } },
    fabricEvents: { publish: async (entry) => { calls.push(['event', entry]); return { id: 'event-1' }; } },
  };
  return { root, calls, app };
}

async function call(app, method, pathname, body = {}, actorId = 'user-a', route = handleProjectWorkspaceRoutes) {
  const res = {};
  const sendJson = (_res, status, payload) => { res.status = status; res.payload = payload; };
  const handled = await route({ method }, res, new URL(`http://localhost${pathname}`), app, sendJson, async () => body, { tenantId: 'tenant-a', actorId });
  assert.equal(handled, true);
  return res;
}

test('workspace edit draft previews a real diff without writing, then applies only after explicit confirmation', async () => {
  const ctx = await fixture();
  try {
    const base = 'const value = 1;\nconsole.log(value);\n';
    const expectedHash = require('node:crypto').createHash('sha256').update(base).digest('hex');
    const proposed = 'const value = 2;\nconsole.log(value);\n';
    const preview = await call(ctx.app, 'POST', '/api/fenix/projects/fixture/drafts', { path: 'src/app.js', content: proposed, expectedHash, summary: 'Atualizar valor' });

    assert.equal(preview.status, 201);
    assert.match(preview.payload.diff, /-const value = 1;/);
    assert.match(preview.payload.diff, /\+const value = 2;/);
    assert.equal(await fs.readFile(path.join(ctx.root, 'src', 'app.js'), 'utf8'), base);
    assert.ok(preview.payload.draftId);

    const applied = await call(ctx.app, 'POST', `/api/fenix/projects/fixture/drafts/${preview.payload.draftId}/apply`);
    assert.equal(applied.status, 200);
    assert.equal(applied.payload.applied, true);
    assert.equal(await fs.readFile(path.join(ctx.root, 'src', 'app.js'), 'utf8'), proposed);
    assert.ok(ctx.calls.some(([type]) => type === 'audit'));
    assert.ok(ctx.calls.some(([type]) => type === 'memory'));
  } finally {
    await fs.rm(ctx.root, { recursive: true, force: true });
  }
});

test('workspace create draft previews a new file, applies only after confirmation, and rejects collisions', async () => {
  const ctx = await fixture();
  try {
    const content = '# Design system\n\nEvidence: rea-123\n';
    const preview = await call(ctx.app, 'POST', '/api/fenix/projects/fixture/drafts', {
      path: 'DESIGN.md', content, createFile: true, summary: 'Criar DESIGN.md com evidências REA'
    });
    assert.equal(preview.status, 201);
    assert.equal(preview.payload.createFile, true);
    assert.match(preview.payload.diff, /\+Evidence: rea-123/);
    assert.equal(await fs.readFile(path.join(ctx.root, 'src', 'app.js'), 'utf8'), 'const value = 1;\nconsole.log(value);\n');
    await fs.writeFile(path.join(ctx.root, 'DESIGN.md'), 'externally created\n');
    const applied = await call(ctx.app, 'POST', `/api/fenix/projects/fixture/drafts/${preview.payload.draftId}/apply`);
    assert.equal(applied.status, 409);
    assert.equal(applied.payload.code, 'DRAFT_TARGET_CHANGED');
    assert.equal(await fs.readFile(path.join(ctx.root, 'DESIGN.md'), 'utf8'), 'externally created\n');

    await fs.rm(path.join(ctx.root, 'DESIGN.md'));
    const next = await call(ctx.app, 'POST', '/api/fenix/projects/fixture/drafts', {
      path: 'DESIGN.md', content, createFile: true, summary: 'Criar DESIGN.md'
    });
    const created = await call(ctx.app, 'POST', `/api/fenix/projects/fixture/drafts/${next.payload.draftId}/apply`);
    assert.equal(created.status, 200);
    assert.equal(created.payload.applied, true);
    assert.equal(await fs.readFile(path.join(ctx.root, 'DESIGN.md'), 'utf8'), content);
  } finally {
    await fs.rm(ctx.root, { recursive: true, force: true });
  }
});

test('workspace edit draft rejects stale hashes and drafts from another actor', async () => {
  const ctx = await fixture();
  try {
    const stale = await call(ctx.app, 'POST', '/api/fenix/projects/fixture/drafts', { path: 'src/app.js', content: 'stale\n', expectedHash: '0'.repeat(64) });
    assert.equal(stale.status, 409);
    assert.equal(stale.payload.code, 'DRAFT_BASE_CHANGED');

    const current = 'const value = 1;\nconsole.log(value);\n';
    const expectedHash = require('node:crypto').createHash('sha256').update(current).digest('hex');
    const preview = await call(ctx.app, 'POST', '/api/fenix/projects/fixture/drafts', { path: 'src/app.js', content: 'const value = 3;\n', expectedHash });
    const foreign = await call(ctx.app, 'GET', `/api/fenix/projects/fixture/drafts/${preview.payload.draftId}`, {}, 'user-b');
    assert.equal(foreign.status, 404);
    assert.equal(foreign.payload.code, 'DRAFT_NOT_FOUND');
  } finally {
    await fs.rm(ctx.root, { recursive: true, force: true });
  }
});

test('workspace edit draft survives a server restart and remains scoped to its actor', async () => {
  const ctx = await fixture();
  try {
    const current = 'const value = 1;\nconsole.log(value);\n';
    const expectedHash = require('node:crypto').createHash('sha256').update(current).digest('hex');
    const preview = await call(ctx.app, 'POST', '/api/fenix/projects/fixture/drafts', { path: 'src/app.js', content: 'const value = 4;\nconsole.log(value);\n', expectedHash });
    assert.equal(preview.status, 201);

    const routePath = require.resolve('../src/api/project-workspace-routes');
    delete require.cache[routePath];
    const { handleProjectWorkspaceRoutes: restartedRoute } = require(routePath);
    const restartedApp = { ...ctx.app, store: new FileStore(path.join(ctx.root, 'state.json'), { retention: false }) };
    const recovered = await call(restartedApp, 'GET', `/api/fenix/projects/fixture/drafts/${preview.payload.draftId}`, {}, 'user-a', restartedRoute);
    assert.equal(recovered.status, 200);
    assert.equal(recovered.payload.diff, preview.payload.diff);
    assert.equal(recovered.payload.createFile, false);
    const listed = await call(restartedApp, 'GET', '/api/fenix/projects/fixture/drafts', {}, 'user-a', restartedRoute);
    assert.equal(listed.status, 200);
    assert.equal(listed.payload.drafts.length, 1);
    assert.equal(listed.payload.drafts[0].draftId, preview.payload.draftId);
    assert.equal(Object.hasOwn(listed.payload.drafts[0], 'content'), false, 'draft listings expose metadata, not proposed source code');
    const foreign = await call(restartedApp, 'GET', `/api/fenix/projects/fixture/drafts/${preview.payload.draftId}`, {}, 'user-b', restartedRoute);
    assert.equal(foreign.status, 404);
    assert.equal(foreign.payload.code, 'DRAFT_NOT_FOUND');
  } finally {
    await fs.rm(ctx.root, { recursive: true, force: true });
  }
});
