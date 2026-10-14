'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { start } = require('../src/server');

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function startFenix(apiPlatformUrl) {
  return start(0, {
    dataFile: path.join(os.tmpdir(), `fenix-health-${process.pid}-${Date.now()}.json`),
    env: { ...process.env, GRG_AIPLATFORM_URL: apiPlatformUrl },
    llm: false,
    localRuntimeWorker: false,
    operationalActivation: false,
    worldSimulation: false,
    providers: {},
  });
}

async function close(server) {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
}

test('API Platform health reports reachable degradation without inventing ready providers', async () => {
  const apiPlatform = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      ok: false,
      status: 'degraded',
      availableProviders: [{ provider: 'fixture', status: 'UNAVAILABLE' }],
    }));
  });
  const port = await listen(apiPlatform);
  const server = await startFenix(`http://127.0.0.1:${port}`);

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v2/api-platform/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, false);
    assert.equal(body.status, 'DEGRADED');
    assert.equal(body.online, true);
    assert.deepEqual(body.availableProviders, [{ provider: 'fixture', status: 'UNAVAILABLE' }]);
  } finally {
    await close(server);
    await new Promise((resolve) => apiPlatform.close(resolve));
  }
});

test('API Platform health reports OFFLINE when the configured connection is refused', async () => {
  const server = await startFenix('http://127.0.0.1:1');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v2/api-platform/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, false);
    assert.equal(body.status, 'OFFLINE');
    assert.equal(body.online, false);
    assert.deepEqual(body.availableProviders, []);
  } finally {
    await close(server);
  }
});

test('API Platform health treats an unrecognized response as degraded, not online', async () => {
  const apiPlatform = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{}');
  });
  const port = await listen(apiPlatform);
  const server = await startFenix(`http://127.0.0.1:${port}`);

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v2/api-platform/health`);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.status, 'DEGRADED');
    assert.equal(body.online, true);
  } finally {
    await close(server);
    await new Promise((resolve) => apiPlatform.close(resolve));
  }
});
