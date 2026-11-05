const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const bootstrap = fs.readFileSync(path.join(publicDir, 'fenix-bootstrap.js'), 'utf8');
const app = fs.readFileSync(path.join(publicDir, 'unified-app.js'), 'utf8');
const gateway = fs.readFileSync(path.join(__dirname, '..', 'gateway', 'frontend-gateway.js'), 'utf8');

test('API 401 redirects only after the gateway confirms the session is invalid', () => {
  assert.match(bootstrap, /__FENIX_SESSION_VALID__/);
  assert.match(bootstrap, /\/api\/v2\/auth\/check/);
  assert.match(bootstrap, /if \(sessionValid === false\) \{[\s\S]{0,260}location\.href = '\/GRG-login'/);
  assert.match(app, /__FENIX_SESSION_VALID__/);
  assert.match(app, /if \(sessionValid === false\) \{[\s\S]{0,300}location\.replace\('\/GRG-login'\)/);
  assert.match(gateway, /error\.status === 401/);
  assert.match(gateway, /authenticated: null[\s\S]{0,100}auth check unavailable/);
});
