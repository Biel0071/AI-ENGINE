const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { assuranceProbe } = require('../src/operations/operational-activation');

async function bootstrap() {
  const app = await createApp();
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  return app;
}

test('activation boot records real component state, history, events and readiness', async () => {
  const app = await bootstrap();
  const result = await app.operationalActivation.boot('grg', 'alice', { trigger: 'test' });
  assert.equal(result.run.status, 'READY'); assert.equal(result.readiness.status, 'READY');
  assert.ok(result.components.some((item) => item.componentId === 'runtime' && item.status === 'ACTIVE'));
  assert.ok(result.components.some((item) => item.componentId === 'postgresql' && item.status === 'UNCONFIGURED'));
  assert.ok(result.components.every((item) => Number.isInteger(item.latencyMs) && Array.isArray(item.dependencies)));
  const state = await app.store.read(); assert.equal(state.operationalComponentHistory.length, result.components.length); assert.ok(state.domainEvents.some((item) => item.type === 'operational.activation.completed'));
});

test('degraded components open one investigation and recovery resolves it', async () => {
  const app = await bootstrap(); let healthy = false;
  app.operationalActivation.components = async () => [{ id: 'runtime', label: 'Runtime', dependencies: [], critical: true, check: async () => ({ ok: healthy, evidence: { reference: healthy ? 'health:recovered' : 'health:failed' } }) }];
  const first = await app.operationalActivation.boot('grg', 'alice'); const second = await app.operationalActivation.boot('grg', 'alice');
  assert.equal(first.readiness.status, 'NOT_READY'); assert.equal(second.readiness.blockers[0].componentId, 'runtime');
  let state = await app.store.read(); assert.equal(state.operationalInvestigations.length, 1); assert.equal(state.operationalInvestigations[0].occurrences, 2);
  healthy = true; const recovered = await app.operationalActivation.boot('grg', 'alice'); assert.equal(recovered.readiness.status, 'READY');
  state = await app.store.read(); assert.equal(state.operationalInvestigations[0].status, 'RESOLVED'); assert.ok(state.operationalInvestigations[0].resolutionEvidence.reference);
});

test('unsafe probe output is rejected and converted into an auditable failure', async () => {
  const app = await bootstrap(); app.operationalActivation.components = async () => [{ id: 'leaky', dependencies: [], critical: true, check: async () => ({ ok: true, apiKey: 'must-not-persist' }) }];
  const output = await app.operationalActivation.boot('grg', 'alice'); assert.equal(output.components[0].status, 'DEGRADED'); assert.equal(output.components[0].evidence.code, 'SECRET_OUTPUT_REJECTED');
  const serialized = JSON.stringify(await app.store.read()); assert.equal(serialized.includes('must-not-persist'), false);
});

test('production assurance remains a blocker until evidence is explicitly recorded', async () => {
  const app = await bootstrap(); app.operationalActivation.production = true;
  app.operationalActivation.components = async () => [{ id: 'backup-proof', dependencies: ['state-store'], productionCritical: true, check: assuranceProbe(app.store, 'grg', 'backup') }];
  assert.equal((await app.operationalActivation.boot('grg', 'alice')).readiness.status, 'NOT_READY');
  await app.operationalActivation.recordAssurance('grg', 'alice', { kind: 'backup', evidence: { reference: 'backup:verified:sha256' } });
  const verified = await app.operationalActivation.boot('grg', 'alice'); assert.equal(verified.readiness.status, 'READY'); assert.equal(verified.components[0].evidence.reference, 'backup:verified:sha256');
  await assert.rejects(() => app.operationalActivation.recordAssurance('grg', 'alice', { kind: 'backup', evidence: { apiKey: 'secret', reference: 'bad' } }));
});

test('daily intelligence is deterministic, evidence-backed and idempotent per day', async () => {
  const app = await bootstrap(); await app.operationalActivation.boot('grg', 'alice');
  const first = await app.operationalActivation.dailyIntelligence('grg', 'alice', { date: '2026-07-27' }); const second = await app.operationalActivation.dailyIntelligence('grg', 'alice', { date: '2026-07-27' });
  assert.equal(first.id, second.id); assert.ok(first.evidence.length); assert.ok(first.opportunities.every((item) => item.evidence.length));
  const state = await app.store.read(); assert.equal(state.dailyIntelligenceReports.length, 1);
});

test('operational schedules are recurring and idempotent', async () => {
  const app = await bootstrap(); const first = await app.operationalActivation.ensureSchedules('grg', 'alice', { activationIntervalMs: 60_000 }); const second = await app.operationalActivation.ensureSchedules('grg', 'alice', { activationIntervalMs: 60_000 });
  assert.equal(first.length, 2); assert.equal(second.length, 0);
  const state = await app.store.read(); assert.deepEqual(state.runtimeSchedules.map((item) => item.type).sort(), ['operational.activation', 'operational.daily-intelligence']);
});
