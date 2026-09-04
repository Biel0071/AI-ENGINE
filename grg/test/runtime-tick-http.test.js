const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test } = require('node:test');
const { start } = require('../src/server');

test('manual runtime tick acknowledges without waiting for execution', async () => {
  const admin = { tenantId: 'grg', userId: 'tick-test', password: crypto.randomBytes(18).toString('hex') };
  const server = await start(0, { llm: false, bootstrapAdmin: { ...admin, tenantName: 'Tick Test', name: 'Tick Test', role: 'master_admin' } });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(admin) }).then((r) => r.json());
    assert.ok(login.token);
    const response = await fetch(`${base}/api/runtime/tick`, { method: 'POST', headers: { authorization: `Bearer ${login.token}` } });
    assert.equal(response.status, 202);
    assert.equal((await response.json()).accepted, true);
  } finally {
    await server.close();
  }
});
