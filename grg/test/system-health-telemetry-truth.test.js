'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { start } = require('../src/server');

test('system health reports its listening endpoint and persisted JobEngine queue', async () => {
  const dataFile = path.join(os.tmpdir(), `fenix-system-health-${crypto.randomUUID()}.json`);
  const userId = `health-${crypto.randomUUID()}`;
  const password = crypto.randomBytes(24).toString('base64url');
  const server = await start(0, {
    dataFile,
    env: { ...process.env, FENIX_PUBLIC_HOST: 'fenix-test.example', FENIX_FRONTEND_PORT: '3000' },
    bootstrapAdmin: { tenantId: 'grg', tenantName: 'Health Test', userId, password, role: 'master_admin' },
    llm: false,
    localRuntimeWorker: false,
    operationalActivation: false,
    worldSimulation: false,
  });

  try {
    server.app.jobs.register('health.telemetry.fixture', async () => ({ ok: true }));
    const queued = await server.app.jobs.submit('grg', userId, { type: 'health.telemetry.fixture', prompt: 'pending telemetry fixture' });
    assert.equal(queued.status, 'QUEUED');
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: 'grg', userId, password }) }).then((response) => response.json());
    const response = await fetch(`${base}/api/v2/system/health`, { headers: { authorization: `Bearer ${login.token}` } });
    const body = await response.json();
    assert.equal(body.vps.host, 'fenix-test.example');
    assert.equal(body.vps.backendPort, server.address().port);
    assert.equal(body.vps.frontendPort, 3000);
    assert.equal(body.activeJobs, 1);
    assert.equal(body.waitingJobs, 1);
    assert.equal(body.runningJobs, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(dataFile, { force: true });
  }
});
