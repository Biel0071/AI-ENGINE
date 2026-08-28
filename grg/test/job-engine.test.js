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

test('canonical jobs preserve universal client context and can be claimed by BullMQ job id', async () => {
  const enqueued = [];
  const queue = { enqueue: async (...args) => { enqueued.push(args); return { id: args[3].idempotencyKey }; }, close: async () => {} };
  const app = await createApp({ queues: queue });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  app.jobs.register('test.universal', async ({ prompt }) => ({ accepted: prompt }));
  const job = await app.jobs.submit('grg', 'alice', {
    type: 'test.universal', source: 'codex', sessionId: 'session-1', prompt: 'inspect auth',
    repository: 'org/repo', workspace: 'C:/work/repo', branch: 'fenix/job-1', riskLevel: 'MEDIUM',
    projectId: 'fenix-os', workspaceId: 'workspace-1', screenId: 'command', route: '/app#command',
    context: { projectId: 'fenix-os', screenId: 'command', sourceFiles: ['grg/public/index.html'] },
    policy: { allowedPaths: ['src/**'], blockedPaths: ['.env'], maxIterations: 4, maxTokens: 2000 },
  });
  assert.equal(job.jobId, job.id);
  assert.equal(job.source, 'codex');
  assert.equal(job.currentStage, 'QUEUED');
  assert.equal(job.projectId, 'fenix-os');
  assert.equal(job.workspaceId, 'workspace-1');
  assert.equal(job.screenId, 'command');
  assert.equal(job.route, '/app#command');
  assert.deepEqual(job.context.sourceFiles, ['grg/public/index.html']);
  assert.equal(job.policy.requireApproval, false);
  assert.equal(enqueued[0][0], 'fenix-runtime');
  assert.equal(enqueued[0][3].idempotencyKey, `${job.id}:0`);

  const done = await app.jobs.run('grg', job.id, 'worker-bullmq');
  assert.equal(done.status, 'SUCCEEDED');
  assert.equal(done.result.accepted, 'inspect auth');
  assert.equal(await app.jobs.run('grg', job.id, 'worker-duplicate'), null);
  const workers = await app.jobs.workers('grg', 'alice');
  assert.equal(workers[0].processed, 1);
  assert.equal(workers[0].currentJob, null);
  await app.close();
});

test('HIGH jobs wait for a separate approval before reaching the queue', async () => {
  const enqueued = [];
  const queue = { enqueue: async (...args) => { enqueued.push(args); }, close: async () => {} };
  const app = await createApp({ queues: queue });
  await app.controlPlane.createTenant({ id: 'approval-test', name: 'Approval Test' }, 'requester');
  await app.controlPlane.addMember('approval-test', 'requester', { userId: 'approver', role: 'master_admin' });
  app.jobs.register('test.high', async () => true);
  const job = await app.jobs.submit('approval-test', 'requester', { type: 'test.high', source: 'mcp', riskLevel: 'HIGH' });
  assert.equal(job.status, 'AWAITING_APPROVAL');
  assert.ok(job.approvalId);
  assert.equal(enqueued.length, 0);
  await assert.rejects(() => app.jobs.approve('approval-test', 'requester', job.id), /Requester cannot approve/);
  const approved = await app.jobs.approve('approval-test', 'approver', job.id);
  assert.equal(approved.status, 'QUEUED');
  assert.equal(enqueued.length, 1);
  await app.close();
});
