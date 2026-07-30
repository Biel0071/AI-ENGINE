const test = require('node:test');
const assert = require('node:assert/strict');
const { ObservabilityCenterService } = require('../src/operations/observability-center');

// Era o modulo que MEDE a saude do sistema e inventava 13 valores (cpu 14.5, database HEALTHY,
// 48250 tokens...). Estes testes provam medicao real e falham se a fabricacao voltar.

const cp = { authorize: async () => true };

function svc({ store, health, aiGateway }) {
  return new ObservabilityCenterService({ store, bus: null, controlPlane: cp, metrics: null, health, aiGateway });
}

const emptyStore = { read: async () => ({ runtimeJobs: [], workerHeartbeats: [], deadLetters: [] }) };

test('observability: RAM do processo e MEDIDA (proveniencia real), nao fixa', async () => {
  const s = svc({ store: emptyStore, health: null, aiGateway: null });
  const m = await s.getMetrics('t', 'a');
  assert.equal(m.system.processRssMb.state, 'measured');
  assert.ok(m.system.processRssMb.value > 0);
  assert.equal(m.system.processRssMb.source, 'process.memoryUsage');
  // O valor fabricado antigo (3840) nao pode reaparecer como constante.
  assert.notEqual(m.system.processRssMb.value, 3840);
});

test('observability: CPU% instantaneo e honestamente unknown (nao 14.5 fixo)', async () => {
  const s = svc({ store: emptyStore, health: null, aiGateway: null });
  const m = await s.getMetrics('t', 'a');
  assert.equal(m.system.cpuUsagePercent.state, 'unknown');
  assert.ok(m.system.cpuUsagePercent.reason);
});

test('observability: sem health registry, infra e unknown -- nunca HEALTHY fixo', async () => {
  const s = svc({ store: emptyStore, health: null, aiGateway: null });
  const m = await s.getMetrics('t', 'a');
  assert.equal(m.infrastructure.state, 'unknown');
  assert.ok(!JSON.stringify(m.infrastructure).includes('HEALTHY'));
});

test('observability: infra deriva dos probes REAIS do health registry', async () => {
  const health = { check: async () => ({ status: 'ready', checkedAt: 'now', checks: { database: { ok: true, critical: true }, redis: { ok: false, critical: false, error: 'timeout' } } }) };
  const s = svc({ store: emptyStore, health, aiGateway: null });
  const m = await s.getMetrics('t', 'a');
  assert.equal(m.infrastructure.overall.state, 'measured');
  assert.equal(m.infrastructure.overall.value, 'ready');
  assert.equal(m.infrastructure.database.value.ok, true);
  assert.equal(m.infrastructure.redis.value.ok, false); // probe falho e reportado como falho
  assert.equal(m.infrastructure.redis.value.error, 'timeout');
});

test('observability: aiRuntime vem da telemetria REAL do gateway', async () => {
  const aiGateway = {
    telemetry: async () => ({ calls: 3, cacheHits: 1, totalTokens: 777, totalCostUsd: 0.01, budget: { total: null } }),
    providerHealth: async () => ({ ollama: { ok: true } }),
  };
  const s = svc({ store: emptyStore, health: null, aiGateway });
  const m = await s.getMetrics('t', 'a');
  assert.equal(m.aiRuntime.totalTokensConsumed.state, 'measured');
  assert.equal(m.aiRuntime.totalTokensConsumed.value, 777);
  assert.notEqual(m.aiRuntime.totalTokensConsumed.value, 48250); // o valor fabricado antigo
});

test('observability: workers contam jobs/heartbeats/dead-letters REAIS do store', async () => {
  const store = { read: async () => ({
    runtimeJobs: [{ tenantId: 't', status: 'PENDING' }, { tenantId: 't', status: 'RUNNING' }, { tenantId: 't', status: 'SUCCEEDED' }],
    workerHeartbeats: [{ tenantId: 't' }],
    deadLetters: [{ tenantId: 't' }],
  }) };
  const s = svc({ store, health: null, aiGateway: null });
  const m = await s.getMetrics('t', 'a');
  assert.equal(m.workers.knownWorkers.value, 1);
  assert.equal(m.workers.queueDepth.value, 2); // PENDING + RUNNING
  assert.equal(m.workers.deadLetters.value, 1);
  assert.deepEqual(m.workers.jobsByStatus.value, { PENDING: 1, RUNNING: 1, SUCCEEDED: 1 });
});
