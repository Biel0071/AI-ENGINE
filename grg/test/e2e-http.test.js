const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { start } = require('../src/server');

const ADMIN = { tenantId: 'grg', userId: 'test-admin', password: crypto.randomBytes(24).toString('base64url') };

function withServer(fn) {
  return async () => {
    const dataFile = path.join(os.tmpdir(), `grg-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    const server = await start(0, {
      dataFile,
      llm: false,
      bootstrapAdmin: { ...ADMIN, tenantName: 'GRG Test', name: 'Test Admin', role: 'master_admin' },
    });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    try { await fn(base); }
    finally { server.close(); try { fs.unlinkSync(dataFile); } catch {} }
  };
}

async function authHeaders(base) {
  const login = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ADMIN),
  }).then((response) => response.json());
  assert.ok(login.token);
  return { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
}

test('health endpoint responds', withServer(async (base) => {
  const r = await fetch(`${base}/health`).then((x) => x.json());
  assert.equal(r.ok, true);
}));

test('serves dashboard html', withServer(async (base) => {
  const login = await fetch(`${base}/`).then((x) => x.text());
  assert.match(login, /GRG SERVI|login/i); // raiz agora e a tela de login
  const appHtml = await fetch(`${base}/app`).then((x) => x.text());
  assert.match(appHtml, /GRG Services OS/);
}));

test('rejects unauthenticated api access with 401', withServer(async (base) => {
  const r = await fetch(`${base}/api/overview`);
  assert.equal(r.status, 401);
}));

test('rejects development identity headers by default', withServer(async (base) => {
  const response = await fetch(`${base}/api/overview`, { headers: { 'x-tenant-id': 'grg', 'x-user-id': 'test-admin' } });
  assert.equal(response.status, 401);
}));

test('login then use bearer token works', withServer(async (base) => {
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ADMIN) }).then((x) => x.json());
  assert.ok(login.token);
  const ov = await fetch(`${base}/api/overview`, { headers: { authorization: `Bearer ${login.token}` } });
  assert.equal(ov.status, 200);
}));

test('full HTTP flow: orchestrate then overview reflects it', withServer(async (base) => {
  const headers = await authHeaders(base);
  const orch = await fetch(`${base}/api/orchestrate`, {
    method: 'POST', headers,
    body: JSON.stringify({ name: 'HttpApp', prompt: 'dashboard com analytics e login', target: 'node' }),
  }).then((x) => x.json());
  assert.ok(orch.projectId);
  assert.match(orch.previewUrl, /preview/);

  const ov = await fetch(`${base}/api/overview`, { headers }).then((x) => x.json());
  assert.ok(ov.metrics.projects >= 1);
  assert.ok(ov.metrics.deployments >= 1);
}));

test('adds security headers and request id', withServer(async (base) => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(response.headers.get('x-request-id'));
}));
