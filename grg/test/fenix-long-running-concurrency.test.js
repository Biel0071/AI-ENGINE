const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('FENIX executes independent long-running jobs concurrently with heartbeats and safe pause', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'fenix-concurrency', name: 'FENIX Concurrency' }, 'operator');
  const started = new Set();
  let active = 0;
  let maxActive = 0;
  app.jobs.register('test.long-running', async ({ value }, context) => {
    started.add(context.jobId);
    active += 1; maxActive = Math.max(maxActive, active);
    for (let i = 0; i < 4; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 15));
      await context.heartbeat();
      await context.stage(`stage-${i + 1}`, (i + 1) * 25);
      await context.checkPauseSignal();
    }
    active -= 1;
    return { value };
  });
  try {
    const jobs = await Promise.all(Array.from({ length: 20 }, (_, value) => app.jobs.submit('fenix-concurrency', 'operator', { type: 'test.long-running', source: 'api', payload: { value } })));
    const t0 = Date.now();
    const results = await app.jobs.runBatch('worker-concurrency', 20);
    const elapsed = Date.now() - t0;
    assert.equal(results.length, 20);
    assert.ok(results.every((job) => job.status === 'SUCCEEDED'));
    assert.equal(started.size, 20);
    assert.ok(maxActive >= 2, `jobs did not overlap: maxActive=${maxActive}`);
    assert.ok(elapsed < 20000, `batch exceeded bounded long-running window: ${elapsed}ms`);
    const state = await app.store.read();
    const worker = state.workerHeartbeats.find((item) => item.workerId === 'worker-concurrency');
    assert.ok(worker?.lastSeenAt);
    assert.equal(state.runtimeJobs.filter((job) => job.status === 'RUNNING').length, 0);
    assert.equal(state.runtimeJobs.filter((job) => job.status === 'SUCCEEDED').length, 20);
  } finally { await app.close(); }
});
