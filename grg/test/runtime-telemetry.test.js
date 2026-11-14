'use strict';
// Entrega A — telemetria real: cada bloco medido agora, com measuredAt/status; falha => UNAVAILABLE.
const test = require('node:test');
const assert = require('node:assert/strict');
const { collectRuntimeTelemetry, runtimeFromState } = require('../src/runtime/runtime-telemetry');

const NOW = Date.parse('2026-11-13T20:00:00Z');
const state = {
  runtimeJobs: [
    { id: 'a', type: 'code.deliver', status: 'SUCCEEDED', updatedAt: '2026-11-13T19:00:00Z' },
    { id: 'b', type: 'code.deliver', status: 'BLOCKED', missionId: 'm2', blockedOn: 'ollama', blockedSince: '2026-11-13T19:58:00Z', scheduledFor: '2026-11-13T20:01:00Z', updatedAt: '2026-11-13T19:59:00Z', error: { message: 'modelo local indisponível' } },
    { id: 'c', type: 'inspection.run', status: 'DEAD_LETTER', updatedAt: '2026-11-13T19:30:00Z', error: { message: 'boom' } },
  ],
  workerHeartbeats: [{ workerId: 'w-live', lastSeenAt: '2026-11-13T19:59:50Z' }, { workerId: 'w-old', lastSeenAt: '2026-11-13T19:00:00Z' }],
  deadLetters: [{ id: 'd1' }],
  missions: [{ id: 'm1', delivery: { deliveryStatus: 'TESTS_PASSED', completedAt: '2026-11-13T19:00:00Z', metrics: { totalDurationMs: 21000 } } }],
};

test('runtime block counts jobs, lists BLOCKED with dependency, live workers, errors and delivery latency', () => {
  const r = runtimeFromState(state, NOW);
  assert.equal(r.status, 'MEASURED');
  assert.ok(r.measuredAt);
  assert.deepEqual(r.jobs.byStatus, { SUCCEEDED: 1, BLOCKED: 1, DEAD_LETTER: 1 });
  assert.deepEqual(r.blocked.map((b) => [b.jobId, b.blockedOn]), [['b', 'ollama']]);
  assert.equal(r.workersAlive, 1);
  assert.equal(r.deadLetters, 1);
  assert.deepEqual(r.recentErrors.map((e) => e.jobId), ['b', 'c']);
  assert.equal(r.codeDeliveryLatency.lastMs, 21000);
});

test('collector: services measured from real sources; pm2 output reduced to safe fields; failures are UNAVAILABLE', async () => {
  const pm2Json = JSON.stringify([{ name: 'fenix-runtime-worker', pm2_env: { status: 'online', restart_time: 9, pm_uptime: Date.now() - 1000, SECRET_TOKEN: 'never-leak-me' }, monit: { memory: 278 * 1048576, cpu: 3 } }]);
  const fetchImpl = async (url) => ({ ok: true, json: async () => (url.endsWith('/api/version') ? { version: '0.31.2' } : { models: [{ name: 'qwen2.5:3b', size: 2160000000 }] }) });
  const app = { store: { read: async () => state }, redis: { client: { ping: async () => 'PONG' } } };
  const t = await collectRuntimeTelemetry({ app, env: { FENIX_CODER_OLLAMA_URL: 'http://ollama.test' }, fetchImpl, execImpl: (_cmd, _args, _opts, cb) => cb(null, pm2Json), meminfoReader: () => ({ totalMb: 5920, availableMb: 2927, swapTotalMb: 4095, swapUsedMb: 1919 }) });
  assert.equal(t.memoryDetail.status, 'MEASURED');
  assert.equal(t.memoryDetail.swapUsedMb, 1919);
  assert.equal(t.services.pm2.status, 'MEASURED');
  assert.deepEqual(Object.keys(t.services.pm2.processes[0]).sort(), ['cpuPercent', 'memoryMb', 'name', 'restarts', 'status', 'uptimeMs']);
  assert.ok(!JSON.stringify(t).includes('never-leak-me'), 'pm2 env must never leak');
  assert.equal(t.services.redis.reply, 'PONG');
  assert.equal(t.services.ollama.version, '0.31.2');
  assert.equal(t.services.ollama.loadedModels[0].name, 'qwen2.5:3b');
  assert.equal(t.services.store.status, 'MEASURED');
  assert.equal(t.runtime.jobs.total, 3);

  const down = await collectRuntimeTelemetry({ app: { store: { read: async () => { throw new Error('db down'); } } }, env: {}, fetchImpl: async () => { throw new Error('ECONNREFUSED'); }, execImpl: (_c, _a, _o, cb) => cb(new Error('pm2 not found')), meminfoReader: () => null });
  for (const block of [down.memoryDetail, down.services.pm2, down.services.store, down.services.redis, down.services.ollama, down.runtime]) {
    assert.equal(block.status, 'UNAVAILABLE');
    assert.ok(block.reason);
    assert.ok(block.measuredAt);
  }
});