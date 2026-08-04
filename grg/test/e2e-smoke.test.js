const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const PORT = 4400;
const URL = `http://127.0.0.1:${PORT}`;

test('E2E Smoke Test - System Health', async (t) => {
  await t.test('Backend is reachable', async () => {
    const res = await fetch(`${URL}/health`);
    assert.strictEqual(res.status, 200, 'Health endpoint should return 200');
    const data = await res.json();
    assert.ok(data.ok, 'System is healthy');
  });

  await t.test('Frontend is serving app.html', async () => {
    const res = await fetch(`${URL}/app.html`);
    assert.strictEqual(res.status, 200, 'app.html should be served');
    const html = await res.text();
    // Validate that our new buttons exist
    assert.ok(html.includes('id="selfDeployBtn"'), 'selfDeployBtn exists in DOM');
    assert.ok(html.includes('id="inboxBtn"'), 'inboxBtn exists in DOM');
    assert.ok(html.includes('id="cmdKBtn"'), 'cmdKBtn exists in DOM');
  });

  await t.test('API Dependencies are mapped', async () => {
    const res = await fetch(`${URL}/api/oidc/config`);
    assert.strictEqual(res.status, 200, 'OIDC config should return 200');
  });

  await t.test('Auth Endpoint responds', async () => {
    const res = await fetch(`${URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'grg', user: 'admin', password: 'wrong' })
    });
    // Expected to fail with 401, but the endpoint MUST exist and reply JSON
    assert.strictEqual(res.status, 401, 'Login should reject invalid credentials');
    const data = await res.json();
    assert.ok(data.error, 'Should return error property');
  });
});
