'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { BaiAdapter } = require('../src/browser/bai-adapter');
const { handleBaiInstanceRoutes } = require('../src/api/bai-instance-routes');

test('BAI adapter reports unconfigured without calling a remote endpoint', async () => {
  let called = false;
  const adapter = new BaiAdapter({ fetch: async () => { called = true; } });
  assert.deepEqual(await adapter.getStatus(), {
    ok: true, status: 'UNCONFIGURED', source: 'BAI_API',
    message: 'Configure FENIX_BAI_URL e FENIX_BAI_TOKEN no backend para consultar o BAI.'
  });
  assert.equal(called, false);
});

test('BAI adapter authenticates read-only metadata calls and reports capabilities exposed by the API', async () => {
  const calls = [];
  const adapter = new BaiAdapter({
    baseUrl: 'http://127.0.0.1:4781', token: 'a'.repeat(43),
    fetch: async (url, options) => {
      calls.push({ path: new URL(url).pathname, options });
      if (new URL(url).pathname === '/v1/me') return new Response(JSON.stringify({ id: 'operator-1', role: 'admin' }));
      if (new URL(url).pathname === '/v1/profiles') return new Response(JSON.stringify([
        { kind: 'browser' }, { kind: 'browser' }, { kind: 'android' }
      ]));
      return new Response(JSON.stringify([{ active: true }, { active: false }]));
    }
  });
  const status = await adapter.getStatus();
  assert.equal(status.status, 'CONNECTED');
  assert.deepEqual(status.profiles, { count: 3, kinds: { browser: 2, android: 1 } });
  assert.deepEqual(status.hosts, { count: 2, active: 1 });
  assert.equal(status.capabilities.runningInstances, 'NOT_EXPOSED_BY_BAI_API');
  assert.equal(status.capabilities.jobListing, 'NOT_EXPOSED_BY_BAI_API');
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.options.headers.Authorization === `Bearer ${'a'.repeat(43)}`));
  assert.ok(calls.every((call) => call.options.redirect === 'error'));
});

test('BAI adapter refuses insecure remote HTTP and does not leak credentials in errors', async () => {
  let called = false;
  const adapter = new BaiAdapter({ baseUrl: 'http://example.invalid:4781', token: 's'.repeat(43), fetch: async () => { called = true; } });
  const status = await adapter.getStatus();
  assert.equal(status.status, 'INVALID_CONFIGURATION');
  assert.equal(JSON.stringify(status).includes('s'.repeat(43)), false);
  assert.equal(called, false);
});

test('BAI adapter validates token format before attaching credentials to a request', async () => {
  let called = false;
  const adapter = new BaiAdapter({ baseUrl: 'https://bai.example', token: 'short', fetch: async () => { called = true; } });
  assert.equal((await adapter.getStatus()).status, 'INVALID_CREDENTIALS');
  assert.equal(called, false);
});

test('BAI status route only accepts GET on the canonical status resource', async () => {
  let sent;
  const adapter = { getStatus: async () => ({ ok: true, status: 'UNCONFIGURED', source: 'BAI_API' }) };
  const handled = await handleBaiInstanceRoutes(
    { method: 'GET' }, {}, new URL('http://localhost/api/v2/browser/instance/status'),
    (_res, status, body) => { sent = { status, body }; return true; }, { baiAdapter: adapter }
  );
  assert.equal(handled, true);
  assert.equal(sent.status, 200);
  assert.equal(sent.body.status, 'UNCONFIGURED');
  assert.equal(await handleBaiInstanceRoutes({ method: 'POST' }, {}, new URL('http://localhost/api/v2/browser/instance/status'), () => true), false);
});
