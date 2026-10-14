'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { start } = require('../src/server');

test('authenticated v2 event history reads persisted runtime events', async () => {
  const dataFile = path.join(os.tmpdir(), `fenix-event-history-${crypto.randomUUID()}.json`);
  const userId = `events-${crypto.randomUUID()}`;
  const password = crypto.randomBytes(24).toString('base64url');
  const server = await start(0, {
    dataFile,
    bootstrapAdmin: { tenantId: 'grg', tenantName: 'Event History Test', userId, password, role: 'master_admin' },
    llm: false,
    localRuntimeWorker: false,
    operationalActivation: false,
    worldSimulation: false,
  });

  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const loginResponse = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 'grg', userId, password }),
    });
    assert.equal(loginResponse.status, 200);
    const { token } = await loginResponse.json();
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const createdResponse = await fetch(`${base}/api/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'job.completed', payload: { jobId: 'job-real-1', result: 'verified' } }),
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();

    const historyResponse = await fetch(`${base}/api/v2/events/history?limit=10`, { headers });
    assert.equal(historyResponse.status, 200);
    const history = await historyResponse.json();
    assert.ok(history.events.some((event) => event.id === created.event.id));
    assert.equal(history.events.find((event) => event.id === created.event.id).data.jobId, 'job-real-1');

    const telemetryResponse = await fetch(`${base}/api/v2/telemetry/live`, { headers });
    assert.equal(telemetryResponse.status, 200);
    const telemetry = await telemetryResponse.json();
    assert.equal(telemetry.cpu.measurement, 'OS_CPU_TIME_DELTA');
    assert.ok(['MEASURED', 'UNAVAILABLE'].includes(telemetry.disk.status));
    assert.ok(['MEASURED', 'SAMPLING', 'UNAVAILABLE'].includes(telemetry.network.status));
    assert.equal('trafficScore' in telemetry.network, false);

    const anonymousResponse = await fetch(`${base}/api/v2/events/history?limit=10`);
    assert.equal(anonymousResponse.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(dataFile, { force: true });
  }
});
