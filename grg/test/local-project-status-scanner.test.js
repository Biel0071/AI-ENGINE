'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { scanAll, scanOne, getProjectLogs, startProject, openProjectFolder } = require('../src/projects/local-project-status-scanner');
const { handleLocalProjectManagementRoutes } = require('../src/api/local-project-management-routes');

test('local project status scanner scans catalog and detects online/offline status', async () => {
  const all = await scanAll();
  assert.ok(typeof all === 'object' && all !== null, 'scanAll returns an object');
  const count = Object.keys(all).length;
  assert.ok(count >= 1, `scanned at least 1 project (found: ${count})`);

  for (const [id, item] of Object.entries(all)) {
    assert.equal(item.id, id);
    assert.ok(typeof item.online === 'boolean');
    assert.ok(['ONLINE', 'OFFLINE'].includes(item.status));
    assert.ok(Array.isArray(item.listeningPorts));
  }
});

test('local project scanner scans individual project by id', async () => {
  const all = await scanAll();
  const firstId = Object.keys(all)[0];
  assert.ok(firstId, 'has at least one project');

  const single = await scanOne(firstId);
  assert.ok(single);
  assert.equal(single.id, firstId);
  assert.ok(typeof single.online === 'boolean');
});

test('local project scanner returns logs structure even when file is empty or new', () => {
  const logs = getProjectLogs('any-project-id', 50);
  assert.ok(typeof logs === 'object');
  assert.ok(Array.isArray(logs.lines));
  assert.ok(typeof logs.exists === 'boolean');
});

test('startProject rejects projects with missing or invalid commands safely', () => {
  assert.throws(() => {
    startProject('non-existent-project-xyz-123');
  }, /não encontrado/);
});

test('openProjectFolder rejects projects with invalid paths safely', () => {
  assert.throws(() => {
    openProjectFolder('non-existent-project-xyz-123');
  }, /não encontrado/);
});

test('handleLocalProjectManagementRoutes serves /api/v2/projects/catalog-status and /check', async () => {
  const mockApp = {
    wss: {
      clients: new Set(),
    }
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const handled = await handleLocalProjectManagementRoutes(req, res, url, mockApp);
    if (!handled) {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    // 1. GET /api/v2/projects/catalog-status
    const statusRes = await fetch(`http://127.0.0.1:${port}/api/v2/projects/catalog-status`);
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.ok, true);
    assert.ok(typeof statusData.projects === 'object');
    assert.ok(Number.isFinite(statusData.scannedCount));

    // 2. POST /api/v2/projects/:id/check
    const sampleId = Object.keys(statusData.projects)[0];
    if (sampleId) {
      const checkRes = await fetch(`http://127.0.0.1:${port}/api/v2/projects/${encodeURIComponent(sampleId)}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      assert.equal(checkRes.status, 200);
      const checkData = await checkRes.json();
      assert.equal(checkData.ok, true);
      assert.equal(checkData.project.id, sampleId);
    }

    // 3. GET /api/v2/projects/:id/logs
    if (sampleId) {
      const logsRes = await fetch(`http://127.0.0.1:${port}/api/v2/projects/${encodeURIComponent(sampleId)}/logs?lines=20`);
      assert.equal(logsRes.status, 200);
      const logsData = await logsRes.json();
      assert.equal(logsData.ok, true);
      assert.ok(Array.isArray(logsData.lines));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
