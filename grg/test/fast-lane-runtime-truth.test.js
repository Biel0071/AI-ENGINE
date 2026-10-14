'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handle } = require('../src/execution/fast-lane-engine');

test('fast lane job listing comes from the tenant-scoped JobEngine', async () => {
  const calls = [];
  const result = await handle('mostre meus jobs', null, {
    tenantId: 'tenant-a', actorId: 'user-a',
    app: { jobs: { list: async (...args) => { calls.push(args); return [{ id: 'job-uuid-1', status: 'RUNNING', title: 'Build' }]; } } },
  });
  assert.deepEqual(calls, [['tenant-a', 'user-a']]);
  assert.match(result.response, /job-uuid-1/);
  assert.match(result.response, /RUNNING/);
});

test('fast lane job cancellation calls only the canonical JobEngine', async () => {
  const calls = [];
  const result = await handle('/job cancel job-uuid-1', null, {
    tenantId: 'tenant-a', actorId: 'user-a',
    app: { jobs: { cancel: async (...args) => { calls.push(args); return { id: 'job-uuid-1', status: 'CANCELLED' }; } } },
  });
  assert.deepEqual(calls, [['tenant-a', 'user-a', 'job-uuid-1']]);
  assert.match(result.response, /CANCELLED/);
});

test('fast lane does not claim queue pause when no persistent queue control is configured', async () => {
  await assert.rejects(
    handle('/queue pause', null, { tenantId: 'tenant-a', actorId: 'user-a', app: { jobs: {} } }),
    (error) => error.code === 'QUEUE_CONTROL_UNAVAILABLE',
  );
});

test('queue status command reports canonical JobEngine counts', async () => {
  const result = await handle('/queue status', null, {
    tenantId: 'tenant-a', actorId: 'user-a',
    app: {
      jobs: { list: async () => [{ id: 'job-1', status: 'QUEUED' }, { id: 'job-2', status: 'RUNNING' }] },
      queues: { status: async () => ({ counts: { waiting: 1, active: 1 } }) },
    },
  });
  assert.match(result.response, /JobEngine/);
  assert.match(result.response, /QUEUED 1/);
  assert.match(result.response, /RUNNING 1/);
});

test('models command uses connector health and actual provider model catalog', async () => {
  const result = await handle('/models', null, {
    tenantId: 'tenant-a', actorId: 'user-a',
    app: { controlPlane: { authorize: async () => true }, aiRouter: { connectors: {
      list: () => ['ai:provider-a'],
      status: async () => ({ state: { state: 'measured', value: 'CONNECTED' } }),
      connectors: new Map([['ai:provider-a', { models: () => ({ state: 'measured', value: ['provider-model'] }) }]]),
    } } },
  });
  assert.match(result.response, /provider-a.*CONNECTED.*provider-model/);
});

test('token command counts stored tenant AI calls instead of process-local estimates', async () => {
  const result = await handle('/tokens', null, {
    tenantId: 'tenant-a', actorId: 'user-a',
    app: {
      controlPlane: { authorize: async () => true },
      store: { read: async () => ({ aiCalls: [
        { tenantId: 'tenant-a', totalTokens: 42 },
        { tenantId: 'tenant-b', totalTokens: 99 },
      ] }) },
    },
  });
  assert.match(result.response, /42/);
  assert.doesNotMatch(result.response, /99/);
});
