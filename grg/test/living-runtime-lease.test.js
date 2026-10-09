'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LivingRuntime } = require('../src/runtime/living-runtime');
const { MemoryStore } = require('../src/kernel/store');
const { livingTickIntervalMsFromEnv } = require('../src/runtime/worker');

test('production living tick interval is never faster than 15 seconds', () => {
  assert.equal(livingTickIntervalMsFromEnv({ FENIX_LIVING_TICK_MS: '5000' }), 15_000);
  assert.equal(livingTickIntervalMsFromEnv({}), 15_000);
  assert.equal(livingTickIntervalMsFromEnv({ FENIX_LIVING_TICK_MS: '30000' }), 30_000);
  assert.equal(livingTickIntervalMsFromEnv({ FENIX_LIVING_TICK_MS: 'invalid' }), 15_000);
});

test('living runtime lease allows at least three heartbeat intervals', () => {
  const runtime = new LivingRuntime({
    app: { store: new MemoryStore() },
    tickIntervalMs: 15_000,
  });

  assert.equal(runtime.tickIntervalMs, 15_000);
  assert.equal(runtime.lease.ttlMs, 45_000);
});

test('explicit living runtime lease TTL cannot be shorter than three ticks', () => {
  const runtime = new LivingRuntime({
    app: { store: new MemoryStore() },
    tickIntervalMs: 15_000,
    leaseTtlMs: 30_000,
  });

  assert.equal(runtime.lease.ttlMs, 45_000);
});
