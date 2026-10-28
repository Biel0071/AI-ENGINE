'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const { handleProjectWorkspaceRoutes } = require('../src/api/project-workspace-routes');

test('project-workspace-routes: Direct Unit Test Suite', async (t) => {
  // Setup mock live TCP server for service-status probing
  const tcpServer = net.createServer((socket) => {
    socket.on('error', () => {});
    socket.end('PONG');
  });
  tcpServer.on('error', () => {});
  await new Promise((resolve) => tcpServer.listen(0, '127.0.0.1', resolve));
  const livePort = tcpServer.address().port;

  t.after(async () => {
    tcpServer.closeAllConnections?.();
    await new Promise((resolve) => tcpServer.close(resolve));
  });

  const auditEvents = [];
  const state = {
    projects: [
      {
        id: 'test-direct-proj',
        name: 'Direct Unit Test Project',
        workspace: __dirname,
        workspaceAvailable: true,
        port: livePort
      },
      {
        id: 'test-remote-proj',
        name: 'Remote VPS Project',
        workspace: '/opt/fenix-os/remote',
        workspaceAvailable: false,
        remoteUrl: 'https://vps.fenix.io',
        port: 9999
      }
    ]
  };

  const fakeApp = {
    store: {
      read: async () => JSON.parse(JSON.stringify(state)),
      write: async (s) => {
        state.projects = s.projects;
      }
    },
    controlPlane: {
      authorize: async () => true
    },
    audit: {
      record: async (evt) => { auditEvents.push(evt); }
    }
  };

  const dispatch = async (method, pathStr, body = null, search = '') => {
    const url = new URL(`http://localhost${pathStr}${search}`);
    const req = { method, headers: { host: 'localhost' } };
    let status = 200;
    let responseData = null;
    const sendJson = (_res, s, data) => {
      status = s;
      responseData = data;
    };
    const readJson = async () => body;

    const handled = await handleProjectWorkspaceRoutes(
      req, {}, url, fakeApp, sendJson, readJson, { tenantId: 'grg', actorId: 'test-actor' }
    );

    return { handled, status, data: responseData };
  };

  await t.test('bind-workspace: rejects missing path', async () => {
    const res = await dispatch('POST', '/api/fenix/projects/test-direct-proj/bind-workspace', {});
    assert.equal(res.handled, true);
    assert.equal(res.status, 400);
    assert.match(res.data.error, /Caminho do workspace é obrigatório/);
  });

  await t.test('bind-workspace: rejects non-existent path', async () => {
    const fakePath = path.join(__dirname, 'non-existent-folder-12345');
    const res = await dispatch('POST', '/api/fenix/projects/test-direct-proj/bind-workspace', { path: fakePath });
    assert.equal(res.handled, true);
    assert.equal(res.status, 404);
    assert.match(res.data.error, /não existe/);
  });

  await t.test('bind-workspace: rejects file path (not a directory)', async () => {
    const filePath = __filename;
    const res = await dispatch('POST', '/api/fenix/projects/test-direct-proj/bind-workspace', { path: filePath });
    assert.equal(res.handled, true);
    assert.equal(res.status, 400);
    assert.match(res.data.error, /pasta válida/);
  });

  await t.test('bind-workspace: successfully binds valid directory and records audit', async () => {
    const tempDir = fs.mkdtempSync(path.join(__dirname, 'temp-bind-direct-'));
    try {
      const res = await dispatch('POST', '/api/fenix/projects/test-remote-proj/bind-workspace', { path: tempDir });
      assert.equal(res.handled, true);
      assert.equal(res.status, 200);
      assert.equal(res.data.ok, true);
      assert.equal(res.data.workspaceAvailable, true);
      assert.equal(fs.realpathSync(res.data.workspace), fs.realpathSync(tempDir));

      // Verify store updated
      const updated = state.projects.find((p) => p.id === 'test-remote-proj');
      assert.equal(updated.workspaceAvailable, true);

      // Verify audit recorded
      const boundEvt = auditEvents.find((e) => e.action === 'project.workspace.bound');
      assert.ok(boundEvt);
      assert.equal(boundEvt.resource.projectId, 'test-remote-proj');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('service-status: returns live status for online TCP socket', async () => {
    const res = await dispatch('GET', '/api/fenix/projects/test-direct-proj/service-status');
    assert.equal(res.handled, true);
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
    assert.equal(res.data.ui.port, livePort);
    assert.equal(res.data.ui.online, true);
    assert.ok(typeof res.data.ui.latencyMs === 'number');
  });

  await t.test('service-status: detects offline port gracefully', async () => {
    // Probing port 9999 (should not be running)
    const res = await dispatch('GET', '/api/fenix/projects/test-remote-proj/service-status');
    assert.equal(res.handled, true);
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
    assert.equal(res.data.ui.port, 9999);
    assert.equal(res.data.ui.online, false);
  });

  await t.test('tree: returns directory tree for project with available workspace', async () => {
    const res = await dispatch('GET', '/api/fenix/projects/test-direct-proj/tree');
    assert.equal(res.handled, true);
    assert.equal(res.status, 200);
    assert.equal(res.data.projectId, 'test-direct-proj');
    assert.ok(Array.isArray(res.data.tree));
    assert.ok(res.data.tree.length > 0);
  });

  await t.test('tree: returns 404 for unavailable workspace', async () => {
    const res = await dispatch('GET', '/api/fenix/projects/non-existent-proj/tree');
    assert.equal(res.handled, true);
    assert.equal(res.status, 404);
    assert.match(res.data.error, /unavailable/i);
  });
});
