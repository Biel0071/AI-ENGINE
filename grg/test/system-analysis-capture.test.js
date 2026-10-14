'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { capture } = require('../src/analysis/capture');

test('browser capture persists a real screenshot, visible UI structure, API calls, and console errors without form values', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-perception-capture-'));
  let healthStatus = 503;
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html><head><title>Reference Console</title></head><body>
        <header><h1>Operations</h1></header>
        <main aria-label="Workspace">
          <button id="save" onclick="this.textContent='Clicked'">Save changes</button>
          <a href="#reports">Reports</a>
          <form id="profile"><label for="password">Password</label><input id="password" type="password" value="fixture-secret-value"><button type="submit">Submit</button></form>
        </main>
        <script>fetch('/api/health').catch(() => {}); console.error('fixture-console-error');</script>
      </body></html>`);
      return;
    }
    if (req.url === '/api/health') {
      res.writeHead(healthStatus, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: healthStatus < 400 }));
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(() => resolve()));
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const app = { auth: { createAnalysisSession: async () => 'read-only-session', logoutAsync: async () => {} } };

  const result = await capture({
    app,
    run: { id: 'analysis-capture-test', tenantId: 'tenant-a', createdBy: 'reader' },
    target: { id: 'capture-fixture', projectId: 'fenix', route: '/fixture', actions: [] },
    baseURL,
    directory
  });

  assert.equal(result.status, 'capturado');
  assert.equal(result.structure.title, 'Reference Console');
  assert.ok(result.structure.landmarks.some(item => item.tag === 'main'));
  assert.ok(result.structure.elements.some(item => item.tag === 'button' && item.id === 'save' && item.name === 'Save changes'));
  assert.ok(result.networkRequests.some(item => item.path === '/api/health' && item.status === 503));
  assert.ok(result.consoleErrors.some(message => message.includes('fixture-console-error')));
  assert.equal(JSON.stringify(result).includes('fixture-secret-value'), false);
  assert.equal(JSON.stringify(result).includes('clicked'), false, 'ordinary buttons are observed but never activated');
  assert.equal(result.images.length, 1);
  const screenshot = await fs.readFile(path.join(directory, result.images[0]));
  assert.deepEqual([...screenshot.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  healthStatus = 200;
  const recovered = await capture({
    app,
    run: { id: 'analysis-capture-recovery', tenantId: 'tenant-a', createdBy: 'reader' },
    target: { id: 'capture-fixture-recovery', projectId: 'fenix', route: '/fixture', actions: [] },
    baseURL,
    directory
  });
  assert.ok(recovered.networkRequests.some(item => item.path === '/api/health' && item.status === 200), 'the re-capture must record the corrected endpoint response');
});
