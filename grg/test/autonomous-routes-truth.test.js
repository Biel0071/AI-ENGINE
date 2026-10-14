'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { handleAutonomousLoopRoutes } = require('../src/api/autonomous-loop-routes');

function responseCapture() {
  const res = {};
  const sendJson = (_res, status, body) => {
    res.status = status;
    res.body = body;
    return true;
  };
  return { res, sendJson };
}

async function startWorker(handler) {
  const server = http.createServer((req, res) => {
    const body = handler(req.url);
    res.writeHead(body.statusCode || 200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body.payload));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

test('autonomous worker heartbeat contains no inferred health or fixed scores', async (t) => {
  const worker = await startWorker(() => ({ payload: { status: 'degraded', schedulerState: 'paused' } }));
  const previousUrl = process.env.FENIX_WORKER_URL;
  process.env.FENIX_WORKER_URL = worker.url;
  t.after(async () => {
    if (previousUrl === undefined) delete process.env.FENIX_WORKER_URL;
    else process.env.FENIX_WORKER_URL = previousUrl;
    await new Promise((resolve) => worker.server.close(resolve));
  });

  const { res, sendJson } = responseCapture();
  const permissions = [];
  await handleAutonomousLoopRoutes({ method: 'GET' }, res, {
    url: new URL('http://localhost/api/v2/autonomous/heartbeat'),
    sendJson,
    readJson: async () => ({}),
    app: { controlPlane: { authorize: async (_tenant, _actor, permission) => permissions.push(permission) } },
    identity: { tenantId: 'tenant-a', actorId: 'user-a' },
    autonomousLoop: null,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.heartbeat.status, 'degraded');
  assert.equal(res.body.heartbeat.evolution, 'paused');
  assert.equal(res.body.heartbeat.persistence, 'NOT_MEASURED');
  assert.equal(res.body.heartbeat.scores, null);
  assert.deepEqual(permissions, ['runtime:read']);
});

test('autonomous worker dashboard leaves an absent queue snapshot unknown', async (t) => {
  const worker = await startWorker(() => ({ payload: { scheduler: { state: 'idle' } } }));
  const previousUrl = process.env.FENIX_WORKER_URL;
  process.env.FENIX_WORKER_URL = worker.url;
  t.after(async () => {
    if (previousUrl === undefined) delete process.env.FENIX_WORKER_URL;
    else process.env.FENIX_WORKER_URL = previousUrl;
    await new Promise((resolve) => worker.server.close(resolve));
  });

  const { res, sendJson } = responseCapture();
  await handleAutonomousLoopRoutes({ method: 'GET' }, res, {
    url: new URL('http://localhost/api/v2/autonomous/dashboard'),
    sendJson,
    readJson: async () => ({}),
    app: { controlPlane: { authorize: async () => {} } },
    identity: { tenantId: 'tenant-a', actorId: 'user-a' },
    autonomousLoop: null,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.dashboard.heartbeat.status, 'UNKNOWN');
  assert.equal(res.body.dashboard.scores, null);
  assert.equal(res.body.dashboard.queue, null);
});
