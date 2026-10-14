'use strict';
process.env.FENIX_TEST_MODE = 'true';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { JobQueueManager } = require('../src/execution/job-queue-manager');
const { MemoryConsolidator } = require('../src/memory/memory-consolidator');
const { FenixWatch } = require('../src/watch/fenix-watch');
const { FenixAutonomousLoop } = require('../src/evolution/fenix-autonomous-loop');

test('LIFECYCLE 1: JobQueueManager start -> status -> stop lifecycle is clean and idempotent', async () => {
  const jqm = new JobQueueManager();
  
  // 1. Initial State
  const initialStatus = jqm.status();
  assert.equal(typeof initialStatus.state, 'string', 'Status state must be a string');

  // 2. Start
  jqm.start();
  assert.equal(jqm.status().state, 'ACTIVE', 'State must be ACTIVE after start');

  // 3. Stop
  await jqm.stop();
  assert.equal(jqm.status().state, 'PAUSED', 'State must be PAUSED after stop');
  assert.equal(jqm.bullQueue, null, 'bullQueue connection must be null after stop');

  // 4. Idempotency test (start -> stop -> start -> stop)
  jqm.start();
  assert.equal(jqm.status().state, 'ACTIVE');
  await jqm.stop();
  assert.equal(jqm.status().state, 'PAUSED');
  await jqm.stop(); // double stop safe
  assert.equal(jqm.status().state, 'PAUSED');
});

test('LIFECYCLE 2: MemoryConsolidator start -> status -> stop lifecycle prevents leaked intervals', async () => {
  const fakeFabric = {};
  const fakeBus = new EventEmitter();
  const consolidator = new MemoryConsolidator(fakeFabric, fakeBus);

  // 1. Initial State
  assert.equal(consolidator.status().state, 'STOPPED');

  // 2. Start
  consolidator.start(60_000);
  assert.equal(consolidator.status().state, 'ACTIVE');
  assert.ok(consolidator.interval, 'Interval must exist');

  // 3. Stop
  consolidator.stop();
  assert.equal(consolidator.status().state, 'STOPPED');
  assert.equal(consolidator.interval, null, 'Interval must be cleared');

  // 4. Idempotency test (start -> stop -> start -> stop)
  consolidator.start(60_000);
  assert.equal(consolidator.status().state, 'ACTIVE');
  consolidator.stop();
  assert.equal(consolidator.status().state, 'STOPPED');
  consolidator.stop(); // double stop safe
  assert.equal(consolidator.status().state, 'STOPPED');
});

test('LIFECYCLE 3: FenixWatch start -> status -> stop lifecycle manages project watchers', async () => {
  const fakeBus = new EventEmitter();
  const watch = new FenixWatch({ eventBus: fakeBus });

  // 1. Start
  await watch.start();
  assert.equal(watch.status().state, 'ONLINE');

  watch.watchProject('fenix-os');
  assert.ok(watch.status().watchedProjects.includes('fenix-os'));

  // 2. Stop
  await watch.stop();
  assert.equal(watch.status().state, 'STOPPED');
  assert.equal(watch.status().watchedProjects.length, 0);

  // 3. Idempotency test
  await watch.start();
  assert.equal(watch.status().state, 'ONLINE');
  await watch.stop();
  assert.equal(watch.status().state, 'STOPPED');
});

test('LIFECYCLE 4: FenixAutonomousLoop start -> status -> stop lifecycle preserves test-mode boundaries', async () => {
  const fakeBus = new EventEmitter();
  const fakeApp = { bus: fakeBus, storageManager: null };
  const loop = new FenixAutonomousLoop({
    app: fakeApp,
    intervalMs: 120_000,
    logger: { info: () => {}, warn: () => {}, error: () => {} }
  });

  // 1. Initial State
  assert.equal(loop.status().status, 'IDLE');

  // 2. Start
  loop.start();
  assert.ok(['ACTIVE', 'RUNNING'].includes(loop.status().status), 'Loop status must be ACTIVE or RUNNING');

  // 3. Stop
  loop.stop();
  assert.equal(loop.status().status, 'STOPPED');

  // 4. Idempotency test
  loop.start();
  assert.ok(['ACTIVE', 'RUNNING'].includes(loop.status().status), 'Loop status must be ACTIVE or RUNNING');
  loop.stop();
  assert.equal(loop.status().status, 'STOPPED');
  loop.stop(); // double stop safe
  assert.equal(loop.status().status, 'STOPPED');
});
