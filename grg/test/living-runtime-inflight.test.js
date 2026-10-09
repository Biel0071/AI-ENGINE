'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { LivingRuntime } = require('../src/runtime/living-runtime');

test('does not start a second tenant loop while its timed-out call is still running', async () => {
  let runs = 0;
  let release;
  let callSignal;
  const unfinishedCall = new Promise((resolve) => { release = resolve; });
  const lease = {
    held: false,
    async acquire() { this.held = true; return true; },
    async renew() { return true; },
    async release() { this.held = false; return true; },
  };
  const runtime = new LivingRuntime({
    app: { store: new MemoryStore() },
    lease,
    loops: [{
      id: 'slow-health',
      intervalMs: 0,
      timeoutMs: 25,
      run: ({ signal }) => { runs += 1; callSignal = signal; return unfinishedCall; },
    }],
    tenantResolver: async () => [{ tenantId: 'tenant-a', actorId: 'operator' }],
  });

  try {
    const first = await runtime.tick();
    assert.equal(first.loops[0].status, 'FAILED');
    assert.equal(callSignal.aborted, true);
    assert.equal(runs, 1);

    const second = await runtime.tick();
    assert.equal(second.loops[0].status, 'SKIPPED');
    assert.equal(runs, 1);

    release({ ran: true });
    await new Promise((resolve) => setImmediate(resolve));
    const third = await runtime.tick();
    assert.equal(third.loops[0].status, 'RAN');
    assert.equal(runs, 2);
  } finally {
    release({ ran: true });
    await runtime.stop();
  }
});

test('keeps a slow tenant from blocking another tenant', async () => {
  let releaseSlow;
  let slowRuns = 0;
  let fastRuns = 0;
  const slowCall = new Promise((resolve) => { releaseSlow = resolve; });
  const lease = {
    held: false,
    async acquire() { this.held = true; return true; },
    async renew() { return true; },
    async release() { this.held = false; return true; },
  };
  const runtime = new LivingRuntime({
    app: { store: new MemoryStore() },
    lease,
    loops: [{
      id: 'tenant-work',
      intervalMs: 0,
      timeoutMs: 20,
      run: ({ tenantId }) => {
        if (tenantId === 'tenant-a') { slowRuns += 1; return slowCall; }
        fastRuns += 1;
        return { detail: 'completed' };
      },
    }],
    tenantResolver: async () => [
      { tenantId: 'tenant-a', actorId: 'operator' },
      { tenantId: 'tenant-b', actorId: 'operator' },
    ],
  });

  try {
    const first = await runtime.tick();
    assert.deepEqual(first.loops.map((loop) => loop.status), ['FAILED', 'RAN']);
    const second = await runtime.tick();
    assert.deepEqual(second.loops.map((loop) => loop.status), ['SKIPPED', 'RAN']);
    assert.equal(slowRuns, 1);
    assert.equal(fastRuns, 2);
  } finally {
    releaseSlow({ ran: true });
    await runtime.stop();
  }
});
