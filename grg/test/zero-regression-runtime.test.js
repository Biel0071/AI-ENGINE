const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const WebSocket = require('ws');
const { start } = require('../src/server');

test('queue aliases expose only persisted jobs; v2 and WebSocket require the real session', async () => {
  const dataFile = path.join(os.tmpdir(), `fenix-reconcile-${crypto.randomUUID()}.json`);
  const identity = { tenantId: 'grg', userId: 'reconciliation-test', password: crypto.randomBytes(24).toString('hex') };
  const server = await start(0, {
    dataFile, infrastructure: {}, llm: false, operationalActivation: false, localRuntimeWorker: false,
    bootstrapAdmin: { ...identity, tenantName: 'Reconciliation test', role: 'master_admin' },
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/api/v2/jobs', '/api/v2/queue', '/api/v2/public/queue', '/api/v2/agents', '/api/v2/models']) {
      assert.equal((await fetch(base + route)).status, 401, `${route} must reject anonymous requests`);
    }
    const anonymousSocket = await new Promise((resolve, reject) => {
      const ws = new WebSocket(base.replace('http:', 'ws:') + '/events');
      const timer = setTimeout(() => { ws.terminate(); reject(new Error('WebSocket auth timed out')); }, 5000);
      ws.once('open', () => { clearTimeout(timer); ws.close(); resolve('opened'); });
      ws.once('error', () => { clearTimeout(timer); resolve('rejected'); });
    });
    assert.equal(anonymousSocket, 'rejected');
    const login = await fetch(base + '/api/login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(identity),
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(base.replace('http:', 'ws:') + '/events', { headers });
      const timer = setTimeout(() => { ws.terminate(); reject(new Error('Authenticated WebSocket timed out')); }, 5000);
      ws.once('message', data => {
        clearTimeout(timer);
        try { assert.equal(JSON.parse(data).type, 'runtime.connected'); ws.close(); resolve(); }
        catch (error) { ws.close(); reject(error); }
      });
      ws.once('error', error => { clearTimeout(timer); reject(error); });
    });
    const expectedJobs = await server.app.jobs.list('grg', identity.userId);
    const queue = await fetch(base + '/api/v2/queue', { headers }).then(r => r.json());
    assert.deepEqual(queue.jobs.map(j => j.id).sort(), expectedJobs.map(j => j.id).sort());
    assert.equal(queue.queue.total, expectedJobs.length);
    assert.equal(queue.source, 'JobEngine');
    server.app.jobs.register('reconciliation.check', async () => ({ verified: true }));
    const submitted = await fetch(base + '/api/v2/jobs', {
      method: 'POST', headers, body: JSON.stringify({ type: 'reconciliation.check', source: 'api' }),
    });
    assert.equal(submitted.status, 202);
    const { jobId } = await submitted.json();
    for (const route of ['/api/jobs', '/api/v2/jobs', '/api/v2/queue', '/api/v2/public/queue']) {
      const response = await fetch(base + route, { headers });
      assert.equal(response.status, 200, route);
      const body = await response.json();
      assert.ok(body.jobs.some(job => job.id === jobId && job.jobId === jobId && job.status === 'QUEUED'), route);
      assert.equal(body.queue.completed, body.jobs.filter(j => ['COMPLETED', 'SUCCEEDED'].includes(j.status)).length);
      assert.ok(body.queue.waiting >= 1);
    }
    const cancellation = await fetch(`${base}/api/v2/jobs/${jobId}/cancel`, { method: 'POST', headers });
    assert.equal(cancellation.status, 202);
    const final = await fetch(base + '/api/v2/queue', { headers }).then(r => r.json());
    assert.equal(final.jobs.find(job => job.id === jobId).status, 'CANCELLED');
    assert.ok(final.queue.cancelled >= 1);
    const persisted = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    assert.equal(persisted.runtimeJobs.find(job => job.id === jobId).status, 'CANCELLED');
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
  }
});
