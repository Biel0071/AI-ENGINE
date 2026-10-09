'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LivingRuntime } = require('../src/runtime/living-runtime');
const { MemoryStore } = require('../src/kernel/store');

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
