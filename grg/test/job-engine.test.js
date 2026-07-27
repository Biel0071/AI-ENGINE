const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function bootstrap() { const app = await createApp(); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice'); return app; }

test('Job Engine queues, claims and executes real registered work', async () => {
  const app = await bootstrap(); app.jobs.register('test.sum', async ({ a, b }, context) => { await context.heartbeat(); return a + b; });
  const queued = await app.jobs.submit('grg', 'alice', { type: 'test.sum', payload: { a: 2, b: 3 } });
  assert.equal(queued.status, 'QUEUED');
  const [done] = await app.jobs.runBatch('worker-1');
  assert.equal(done.status, 'SUCCEEDED'); assert.equal(done.result, 5); assert.equal(done.attempts, 1);
  assert.ok((await app.eventStore.list('grg')).some((event) => event.type === 'runtime.job.succeeded'));
});

test('Job Engine retries then sends exhausted work to DLQ', async () => {
  const app = await bootstrap(); app.jobs.register('test.fail', async () => { throw new Error('broken'); });
  const job = await app.jobs.submit('grg', 'alice', { type: 'test.fail', maxAttempts: 2 });
  await app.jobs.runBatch('worker-1');
  await app.store.update((state) => { state.runtimeJobs.find((item) => item.id === job.id).scheduledFor = new Date(0).toISOString(); return state; });
  const [failed] = await app.jobs.runBatch('worker-1');
  assert.equal(failed.status, 'DEAD_LETTER'); assert.equal((await app.store.read()).deadLetters.length, 1);
});

test('queued jobs can be cancelled and are never claimed', async () => {
  const app = await bootstrap(); let called = false; app.jobs.register('test.cancel', async () => { called = true; });
  const job = await app.jobs.submit('grg', 'alice', { type: 'test.cancel' });
  assert.equal((await app.jobs.cancel('grg', 'alice', job.id)).status, 'CANCELLED');
  assert.deepEqual(await app.jobs.runBatch('worker-1'), []); assert.equal(called, false);
});

test('scheduler emits due jobs and advances recurring schedules', async () => {
  const app = await bootstrap(); app.jobs.register('test.scheduled', async () => 'ok');
  const schedule = await app.jobs.schedule('grg', 'alice', { type: 'test.scheduled', runAt: new Date(0).toISOString(), intervalMs: 1000 });
  assert.equal((await app.jobs.tick('grg', 'alice')).length, 1);
  const state = await app.store.read(); assert.ok(Date.parse(state.runtimeSchedules.find((item) => item.id === schedule.id).nextRunAt) > Date.now() - 1000);
});

test('job payloads reject secrets and resource limits are bounded', async () => {
  const app = await bootstrap(); app.jobs.register('test.secure', async () => true);
  await assert.rejects(() => app.jobs.submit('grg', 'alice', { type: 'test.secure', payload: { apiKey: 'leak' } }), /secret field/);
  await assert.rejects(() => app.jobs.submit('grg', 'alice', { type: 'test.secure', limits: { memoryMb: 1 } }), /resource limits/);
});
