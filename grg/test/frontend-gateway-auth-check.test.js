const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

async function reservePort() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('auth check distinguishes invalid session from unavailable backend', async (t) => {
  let backendMode = '401';
  const backend = http.createServer((_req, res) => {
    if (backendMode === 'unavailable') {
      res.writeHead(503, { 'content-type': 'application/json' });
      return res.end('{"error":"unavailable"}');
    }
    if (backendMode === 'authenticated') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end('{"userId":"qa","tenantId":"grg"}');
    }
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end('{"error":"unauthorized"}');
  });
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
  const gatewayPort = await reservePort();
  const publicDir = path.join(__dirname, '..', 'public');
  const gateway = spawn(process.execPath, [path.join(__dirname, '..', 'gateway', 'frontend-gateway.js')], {
    env: { ...process.env, PORT: String(gatewayPort), BACKEND_PORT: String(backend.address().port), FENIX_PUBLIC_DIR: publicDir },
    stdio: 'ignore'
  });
  t.after(async () => {
    gateway.kill();
    await new Promise((resolve) => gateway.once('exit', resolve));
    await new Promise((resolve) => backend.close(resolve));
  });

  let response;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      response = await fetch(`http://127.0.0.1:${gatewayPort}/api/v2/auth/check`);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.ok(response, 'gateway starts');
  assert.deepEqual(await response.json(), { authenticated: false, user: null, tenantId: null });

  backendMode = 'unavailable';
  response = await fetch(`http://127.0.0.1:${gatewayPort}/api/v2/auth/check`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).authenticated, null);

  backendMode = 'authenticated';
  response = await fetch(`http://127.0.0.1:${gatewayPort}/api/v2/auth/check`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).authenticated, true);
});
