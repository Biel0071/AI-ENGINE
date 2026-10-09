'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LivingRuntime, defaultLoops } = require('../src/runtime/living-runtime');
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

test('automatic business loop does not rerun the full operational boot scan unless enabled', async () => {
  let calls = 0;
  const app = { operationalActivation: { boot: async () => { calls += 1; return { run: {} }; } } };

  const automatic = defaultLoops({}).find((loop) => loop.id === 'business');
  const skipped = await automatic.run({ app, tenantId: 'tenant-1', actorId: 'owner-1' });
  assert.equal(skipped.idle, true);
  assert.equal(calls, 0);

  const enabled = defaultLoops({ FENIX_OPERATIONAL_BOOT_LOOP: '1' }).find((loop) => loop.id === 'business');
  const executed = await enabled.run({ app, tenantId: 'tenant-1', actorId: 'owner-1' });
  assert.equal(executed.ran, true);
  assert.equal(calls, 1);
});

test('living runtime restores recent loop deadlines so a process restart does not rerun probes', async () => {
  let calls = 0;
  const completedAt = new Date(Date.now() - 10_000).toISOString();
  const state = {
    livingRuntimeTicks: [{
      role: 'worker-companion',
      loops: [{ loop: 'security', status: 'RAN', completedAt }],
    }],
    workerHeartbeats: [],
  };
  const store = {
    read: async () => structuredClone(state),
    update: async (mutator) => { await mutator(state); return state; },
  };
  const runtime = new LivingRuntime({
    app: { store },
    lease: { held: true, renew: async () => true },
    role: 'worker-companion',
    workerId: 'worker-after-restart',
    loops: [{ id: 'security', intervalMs: 1_800_000, run: async () => { calls += 1; return { ran: true }; } }],
    tenantResolver: async () => [{ tenantId: 'tenant-1', actorId: 'owner-1' }],
  });

  await runtime.restoreSchedule();
  const tick = await runtime.tick();
  assert.equal(tick.loopsDue, 0);
  assert.equal(calls, 0);
});
