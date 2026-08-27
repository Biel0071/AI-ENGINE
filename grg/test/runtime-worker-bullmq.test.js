const test = require('node:test');
const assert = require('node:assert/strict');
const { startWorker } = require('../src/runtime/worker');

test('runtime worker consumes BullMQ delivery and completes the canonical persisted job', async () => {
  const values = new Map();
  const redis = {
    client: {
      async set(key, value, options) { if (options?.NX && values.has(key)) return null; values.set(key, value); return 'OK'; },
      async get(key) { return values.get(key) ?? null; },
      async del(key) { return values.delete(key) ? 1 : 0; },
      async eval() { return 1; }, async pExpire() { return 1; }, async ping() { return 'PONG'; },
    },
    health: async () => ({ ok: true }), close: async () => {},
  };
  const deliveries = [];
  let processor;
  const queues = {
    async enqueue(queue, type, data, options) { deliveries.push({ queue, type, data, options }); return { id: options.idempotencyKey }; },
    worker(queue, handler, options) { processor = handler; return { queue, options, close: async () => {} }; },
    health: async () => ({ ok: true, adapter: 'fake-bullmq' }), close: async () => {},
  };
  const runtime = await startWorker({
    env: { ...process.env, FENIX_ENV: 'development', FENIX_WORKER_ID: 'worker-real-1', FENIX_CONNECTION_CHECK: '0', FENIX_OBSERVABILITY_SAMPLE: '0' },
    redis, queues,
  });
  try {
    await runtime.app.controlPlane.createTenant({ id: 'worker-test', name: 'Worker Test' }, 'owner');
    runtime.app.jobs.register('test.bullmq', async ({ value }, context) => { await context.heartbeat(); return value * 2; });
    const job = await runtime.app.jobs.submit('worker-test', 'owner', { type: 'test.bullmq', source: 'cli', payload: { value: 21 } });
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].data.jobId, job.id);
    const completed = await processor({ data: deliveries[0].data });
    assert.equal(completed.status, 'SUCCEEDED');
    assert.equal(completed.result, 42);
    assert.equal((await processor({ data: deliveries[0].data })), null, 'duplicate delivery must not execute twice');
    const stored = await runtime.app.jobs.get('worker-test', 'owner', job.id);
    assert.equal(stored.lastWorkerId, 'worker-real-1');
  } finally {
    await runtime.stop();
  }
});
