'use strict';

process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('does not retry a timed-out job while its previous handler is still running', async () => {
  const app = await createApp({ autoStartHeart: false, localRuntimeWorker: false });
  let resolveFirstAttempt;
  let runs = 0;
  let callSignal;
  const firstAttempt = new Promise((resolve) => { resolveFirstAttempt = resolve; });

  try {
    await app.controlPlane.createTenant({ id: 'timeout-overlap', name: 'Timeout overlap' }, 'alice');
    app.jobs.register('test.timeout-overlap', async (_payload, context) => {
      runs += 1;
      callSignal = context.signal;
      if (runs === 1) return firstAttempt;
      return { completed: true };
    });
    const job = await app.jobs.submit('timeout-overlap', 'alice', {
      type: 'test.timeout-overlap',
      maxAttempts: 2,
      limits: { timeoutMs: 100 },
    });

    const [timedOut] = await app.jobs.runBatch('worker-a');
    assert.equal(timedOut.status, 'RUNNING');
    assert.equal(timedOut.currentStage, 'TIMED_OUT_WAITING');
    assert.equal(callSignal.aborted, true);
    assert.equal(runs, 1);

    assert.deepEqual(await app.jobs.runBatch('worker-a'), []);
    assert.equal(runs, 1);

    resolveFirstAttempt({ completed: 'late' });
    let completed = await app.jobs.getInternal('timeout-overlap', job.id);
    for (let attempt = 0; completed.status !== 'SUCCEEDED' && attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      completed = await app.jobs.getInternal('timeout-overlap', job.id);
    }
    assert.equal(completed.status, 'SUCCEEDED');
    assert.deepEqual(completed.result, { completed: 'late' });
    assert.equal(runs, 1, 'a late successful handler result must not be repeated');
    assert.deepEqual(await app.jobs.runBatch('worker-a'), []);
  } finally {
    resolveFirstAttempt({ completed: 'late' });
    await app.close();
  }
});

test('honors a pause requested while a timed-out handler is still finishing', async () => {
  const app = await createApp({ autoStartHeart: false, localRuntimeWorker: false });
  let resolveAttempt;
  const unfinishedAttempt = new Promise((resolve) => { resolveAttempt = resolve; });

  try {
    await app.controlPlane.createTenant({ id: 'timeout-pause', name: 'Timeout pause' }, 'alice');
    app.jobs.register('test.timeout-pause', async () => unfinishedAttempt);
    const job = await app.jobs.submit('timeout-pause', 'alice', {
      type: 'test.timeout-pause',
      limits: { timeoutMs: 100 },
    });
    const [timedOut] = await app.jobs.runBatch('worker-pause');
    assert.equal(timedOut.currentStage, 'TIMED_OUT_WAITING');
    assert.equal((await app.jobs.pause('timeout-pause', 'alice', job.id)).status, 'PAUSING');

    resolveAttempt({ completed: true });
    let current = await app.jobs.getInternal('timeout-pause', job.id);
    for (let attempt = 0; current.status !== 'PAUSED' && attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      current = await app.jobs.getInternal('timeout-pause', job.id);
    }
    assert.equal(current.status, 'PAUSED');
    assert.equal(current.result.completed, true);
  } finally {
    resolveAttempt({ completed: true });
    await app.close();
  }
});

test('retries a timed-out job only after the handler rejects and releases its execution', async () => {
  const enqueued = [];
  const queues = {
    async enqueue(_queue, _type, _data, options) { enqueued.push(options.idempotencyKey); return { id: options.idempotencyKey }; },
    async close() {},
  };
  const app = await createApp({ autoStartHeart: false, localRuntimeWorker: false, queues });
  let rejectFirstAttempt;
  let runs = 0;
  const firstAttempt = new Promise((_resolve, reject) => { rejectFirstAttempt = reject; });

  try {
    await app.controlPlane.createTenant({ id: 'timeout-retry', name: 'Timeout retry' }, 'alice');
    app.jobs.register('test.timeout-retry', async () => {
      runs += 1;
      if (runs === 1) return firstAttempt;
      return { recovered: true };
    });
    const job = await app.jobs.submit('timeout-retry', 'alice', {
      type: 'test.timeout-retry', maxAttempts: 2, limits: { timeoutMs: 100 },
    });
    const [timedOut] = await app.jobs.runBatch('worker-retry');
    assert.equal(timedOut.status, 'RUNNING');
    assert.equal(runs, 1);
    assert.equal(enqueued.length, 1, 'timeout must not enqueue while the old handler remains active');

    rejectFirstAttempt(new Error('provider stopped after abort'));
    let current = await app.jobs.getInternal('timeout-retry', job.id);
    for (let attempt = 0; current.status !== 'QUEUED' && attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      current = await app.jobs.getInternal('timeout-retry', job.id);
    }
    assert.equal(current.status, 'QUEUED');
    assert.equal(enqueued.length, 2, 'retry enters the queue only after the handler exits');

    await app.store.update((state) => {
      state.runtimeJobs.find((item) => item.id === job.id).scheduledFor = new Date(0).toISOString();
      return state;
    });
    const [retried] = await app.jobs.runBatch('worker-retry');
    assert.equal(retried.status, 'SUCCEEDED');
    assert.equal(retried.result.recovered, true);
    assert.equal(runs, 2);
  } finally {
    rejectFirstAttempt(new Error('cleanup'));
    await app.close();
  }
});

test('recovers a paused timed-out job as paused after the owning worker disappears', async () => {
  const app = await createApp({ autoStartHeart: false, localRuntimeWorker: false });

  try {
    await app.controlPlane.createTenant({ id: 'timeout-recovery', name: 'Timeout recovery' }, 'alice');
    app.jobs.register('test.timeout-recovery', async () => true);
    const job = await app.jobs.submit('timeout-recovery', 'alice', { type: 'test.timeout-recovery' });
    const staleAt = new Date(Date.now() - 120_000).toISOString();
    await app.store.update((state) => {
      const current = state.runtimeJobs.find((item) => item.id === job.id);
      current.status = 'PAUSING'; current.currentStage = 'TIMED_OUT_WAITING';
      current.workerId = 'worker-before-restart'; current.pauseRequestedAt = staleAt; current.heartbeatAt = staleAt;
      state.workerHeartbeats.push({ workerId: 'worker-before-restart', lastSeenAt: staleAt });
      return state;
    });

    assert.equal(await app.jobs.recoverStale(60_000), 0);
    const recovered = await app.jobs.getInternal('timeout-recovery', job.id);
    assert.equal(recovered.status, 'PAUSED');
    assert.equal(recovered.currentStage, 'PAUSED');
    assert.equal(recovered.workerId, null);
  } finally {
    await app.close();
  }
});
