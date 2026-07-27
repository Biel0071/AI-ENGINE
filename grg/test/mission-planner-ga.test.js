const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { ValidationError } = require('../src/kernel/errors');
const { componentTrend, GA_PROOFS } = require('../src/operations/operational-activation');

async function bootstrap() { const app = await createApp(); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice'); return app; }

test('Mission Planner converts an operational request into an estimated governed DAG', async () => {
  const app = await bootstrap(); const output = await app.missionPlanner.plan('grg', 'alice', { objective: 'Verifique a saúde e gere o relatório diário', autoStart: true });
  assert.equal(output.plan.mode, 'OPERATE'); assert.equal(output.plan.status, 'MATERIALIZED'); assert.equal(output.plan.steps.length, 2); assert.equal(output.plan.estimates.risk, 'LOW');
  assert.equal(output.mission.status, 'RUNNING'); assert.equal(output.mission.steps[0].jobType, 'operational.activation'); assert.equal((await app.store.read()).runtimeJobs.length, 1);
});

test('Mission Planner asks for required evidence instead of creating an invalid inspection', async () => {
  const app = await bootstrap(); const output = await app.missionPlanner.plan('grg', 'alice', { objective: 'Analise profundamente o CRM' });
  assert.equal(output.plan.status, 'NEEDS_INPUT'); assert.equal(output.mission, null); assert.equal(output.plan.questions[0].field, 'context.workspacePath');
  const state = await app.store.read(); assert.equal(state.missionPlans.length, 1); assert.equal(state.missions.length, 0);
});

test('Mission Planner selects the governed build path and never accepts secret-shaped context', async () => {
  const app = await bootstrap(); const output = await app.missionPlanner.plan('grg', 'alice', { objective: 'Criar um ERP para oficinas' });
  assert.deepEqual(output.plan.steps.map((item) => item.type), ['discover', 'analyze', 'generate']); assert.equal(output.plan.risk, 'HIGH'); assert.equal(output.mission.steps.at(-1).policyLevel, 'RED');
  await assert.rejects(() => app.missionPlanner.plan('grg', 'alice', { objective: 'Monitorar', context: { apiKey: 'do-not-store' } })); assert.equal(JSON.stringify(await app.store.read()).includes('do-not-store'), false);
});

test('health trends expose availability, latency direction and predictive risk', () => {
  const history = [1, 2].map((latencyMs) => ({ latencyMs, availability: 0, status: 'DEGRADED' })); const trend = componentTrend(history, { latencyMs: 10, availability: 0, status: 'DEGRADED' });
  assert.equal(trend.sampleCount, 3); assert.equal(trend.availability, 0); assert.equal(trend.consecutiveFailures, 3); assert.equal(trend.risk, 'HIGH'); assert.equal(trend.latencyDirection, 'RISING');
});

test('operational activation monitors Mission Kernel and process resources', async () => {
  const app = await bootstrap(); const output = await app.operationalActivation.boot('grg', 'alice', { trigger: 'ga-test' });
  const mission = output.components.find((item) => item.componentId === 'mission-kernel'); const resources = output.components.find((item) => item.componentId === 'process-resources');
  assert.equal(mission.status, 'ACTIVE'); assert.equal(resources.status, 'ACTIVE'); assert.ok(resources.evidence.rssBytes > 0); assert.equal(resources.trend.risk, 'LOW');
});

test('GA stability report fails closed until every external proof exists', async () => {
  const app = await bootstrap(); app.operationalActivation.components = async () => [{ id: 'runtime', dependencies: [], critical: true, check: async () => ({ ok: true, evidence: { reference: 'runtime:healthy' } }) }]; await app.operationalActivation.boot('grg', 'alice'); const blocked = await app.operationalActivation.stabilityReport('grg', 'alice');
  assert.equal(blocked.status, 'BLOCKED'); assert.ok(blocked.blockers.includes('proof:external-validation'));
  for (const kind of GA_PROOFS) await app.operationalActivation.recordAssurance('grg', 'alice', { kind, evidence: { reference: `${kind}:verified` } });
  const candidate = await app.operationalActivation.stabilityReport('grg', 'alice'); assert.equal(candidate.status, 'GO_LIVE_CANDIDATE'); assert.equal(candidate.blockers.length, 0); assert.equal(candidate.release, '3.0.0');
});

test('mission plans remain tenant isolated', async () => {
  const app = await bootstrap(); await app.controlPlane.createTenant({ id: 'other', name: 'Other' }, 'mallory'); await app.missionPlanner.plan('grg', 'alice', { objective: 'Monitorar o ambiente' }); await app.missionPlanner.plan('other', 'mallory', { objective: 'Monitorar outro ambiente' });
  assert.equal((await app.missionPlanner.list('grg', 'alice')).length, 1); assert.equal((await app.missionPlanner.list('other', 'mallory')).length, 1);
});

test('unsupported planning modes are rejected before persistence', async () => {
  const app = await bootstrap(); await assert.rejects(() => app.missionPlanner.plan('grg', 'alice', { objective: 'anything', mode: 'UNSAFE' }), ValidationError); assert.equal((await app.store.read()).missionPlans.length, 0);
});

test('non-admin actors cannot leave orphan global mission plans', async () => {
  const app = await bootstrap(); await app.controlPlane.addMember('grg', 'alice', { userId: 'bob', role: 'subadmin' }); await assert.rejects(() => app.missionPlanner.plan('grg', 'bob', { objective: 'Monitorar tudo' }), /cannot perform|global mission plans/); assert.equal((await app.store.read()).missionPlans.length, 0);
});
