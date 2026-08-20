const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('../src/server');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };

function withServer(fn) {
  return async () => {
    process.env.FENIX_BOOTSTRAP_TENANT_ID = ADMIN.tenantId;
    process.env.FENIX_BOOTSTRAP_ADMIN_USER = ADMIN.userId;
    process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = ADMIN.password;
    process.env.FENIX_ALLOW_DEV_HEADERS = '0';
    process.env.NODE_ENV = 'test';
    process.env.GRG_LLM = '0';
    const server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    try {
      await fn(base);
    } finally {
      await new Promise((r) => server.close(r));
    }
  };
}

test('UNIFIED FRONTEND SUITE: Full E2E Navigation, Auth, Assets, and Live Operations', withServer(async (base) => {
  // 1. Login flow
  const rootRes = await fetch(`${base}/`);
  assert.equal(rootRes.status, 200);
  const rootHtml = await rootRes.text();
  assert.match(rootHtml, /GRG SERVI/i, 'Root serves login.html');
  assert.match(rootHtml, /\/app#command/, 'Login redirects to /app#command');

  // 2. Perform Login
  const loginRes = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  assert.equal(loginRes.status, 200, 'Login returns 200');
  const loginData = await loginRes.json();
  assert.ok(loginData.token, 'Token returned');
  const token = loginData.token;
  const authHeaders = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  // 3. Workspace /app serve
  const appRes = await fetch(`${base}/app`);
  assert.equal(appRes.status, 200, '/app serves index.html');
  const appHtml = await appRes.text();
  assert.match(appHtml, /FENIX OS \| Unified Workspace/, 'HTML title matches');
  assert.match(appHtml, /<script src="\/unified-app\.js"><\/script>/, 'Unified controller linked');

  // 4. Verify all referenced CSS and Assets
  const assets = [
    '/design-system.css',
    '/unified.css',
    '/fenix.css',
    '/living-panels.css',
    '/city-overrides.css',
    '/office.css',
    '/unified-app.js',
    '/assets/ai-city-bg.png',
  ];
  for (const asset of assets) {
    const r = await fetch(`${base}${asset}`);
    assert.equal(r.status, 200, `Asset ${asset} must return 200 (no 404)`);
  }

  // 5. Backward compatibility aliases
  const legacyAliases = ['/office', '/app.html', '/office.html'];
  for (const route of legacyAliases) {
    const r = await fetch(`${base}${route}`);
    assert.equal(r.status, 200, `Legacy alias ${route} resolves to 200`);
  }

  // 6. Navigation Districts data endpoints
  const endpoints = [
    '/api/overview',
    '/api/missions',
    '/api/city',
    '/api/office',
    '/api/projects',
    '/api/skills',
    '/api/connectors',
    '/api/observability/metrics',
    '/api/security/encryption/status',
    '/api/events',
  ];
  for (const ep of endpoints) {
    const r = await fetch(`${base}${ep}`, { headers: authHeaders });
    assert.equal(r.status, 200, `Endpoint ${ep} returns 200 with Bearer token`);
  }

  // 7. Command Execution & Live Console Stream
  const cmdRes = await fetch(`${base}/api/avatar/message`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ message: 'status operacional do fenix', mode: 'unified' }),
  });
  assert.equal(cmdRes.status, 200, 'Avatar message executes');
  const cmdData = await cmdRes.json();
  assert.ok(cmdData.reply || cmdData.response, 'Avatar responds with message');

  // Verify event stream reflects activity
  const evRes = await fetch(`${base}/api/events`, { headers: authHeaders });
  assert.equal(evRes.status, 200);
  const evData = await evRes.json();
  assert.ok(Array.isArray(evData.events), 'Events list returned');
}));
