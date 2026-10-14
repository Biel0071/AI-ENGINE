'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleUniversalJobRoutes } = require('../src/api/universal-job-routes');

function harness(method, path, app) {
  const response = {};
  return {
    req: { method }, response,
    url: new URL(`http://localhost${path}`),
    app,
    sendJson: (_res, status, body) => { response.status = status; response.body = body; return true; },
    readJson: async () => ({}),
    identity: { tenantId: 'tenant-a', actorId: 'user-a' },
  };
}

test('queue status is derived from the persistent JobEngine and the configured BullMQ queue', async () => {
  const app = {
    controlPlane: { authorize: async () => true },
    jobs: { list: async () => [{ id: 'job-1', tenantId: 'tenant-a', status: 'QUEUED' }] },
    queues: { status: async () => ({ queue: 'fenix-runtime', counts: { waiting: 1 } }) },
  };
  const ctx = harness('GET', '/api/v2/queue/status', app);
  assert.equal(await handleUniversalJobRoutes(ctx.req, {}, ctx.url, app, ctx.sendJson, ctx.readJson, ctx.identity), true);
  assert.equal(ctx.response.status, 200);
  assert.equal(ctx.response.body.source, 'JobEngine');
  assert.equal(ctx.response.body.queue.waiting, 1);
  assert.equal(ctx.response.body.bullmq.counts.waiting, 1);
});

test('queue pause uses the configured BullMQ queue and requires runtime admin', async () => {
  const calls = [];
  const app = {
    controlPlane: { authorize: async (_tenant, _actor, permission) => calls.push(permission) },
    queues: { queue: () => ({ pause: async () => calls.push('pause') }) },
  };
  const ctx = harness('POST', '/api/v2/queue/pause', app);
  assert.equal(await handleUniversalJobRoutes(ctx.req, {}, ctx.url, app, ctx.sendJson, ctx.readJson, ctx.identity), true);
  assert.deepEqual(calls, ['runtime:admin', 'pause']);
  assert.equal(ctx.response.body.status, 'PAUSED');
});

test('queue controls report unavailable instead of succeeding without BullMQ', async () => {
  const app = { controlPlane: { authorize: async () => true } };
  const ctx = harness('POST', '/api/v2/queue/resume', app);
  assert.equal(await handleUniversalJobRoutes(ctx.req, {}, ctx.url, app, ctx.sendJson, ctx.readJson, ctx.identity), true);
  assert.equal(ctx.response.status, 503);
  assert.equal(ctx.response.body.error, 'QUEUE_CONTROL_UNAVAILABLE');
});

test('clear-completed does not erase persistent job history through the old in-memory contract', async () => {
  const ctx = harness('POST', '/api/v2/queue/clear-completed', { controlPlane: { authorize: async () => true } });
  assert.equal(await handleUniversalJobRoutes(ctx.req, {}, ctx.url, ctx.app, ctx.sendJson, ctx.readJson, ctx.identity), true);
  assert.equal(ctx.response.status, 501);
  assert.equal(ctx.response.body.error, 'PERSISTENT_JOB_PURGE_UNSUPPORTED');
});
