const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function bootstrap() { const app = await createApp(); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice'); await app.controlPlane.addMember('grg', 'alice', { userId: 'bob', role: 'admin' }); return app; }
function hypothesis(action = 'cognitive.execute.low') { return { description: 'Validate authorized discovery inventory', origin: 'administrator', evidence: ['event:approved-observation'], risks: ['Probe may be temporarily unavailable'], expectedImpact: 'Inventory remains current', estimate: { effort: 1, cost: 1 }, plan: ['Run authorized discovery', 'Validate result'], dependencies: [], confidence: 0.9, security: 7, availability: 8, impact: 6, risk: 2, value: 7, action, job: { type: 'discovery.scan', payload: {} } }; }

test('governed cognitive loop evaluates, dispatches only through Runtime, validates and learns', async () => {
  const app = await bootstrap(); const proposed = await app.cognitiveCore.propose('grg', 'alice', hypothesis());
  const evaluated = await app.cognitiveCore.evaluate('grg', 'alice', proposed.id); assert.equal(evaluated.status, 'APPROVED');
  const dispatched = await app.cognitiveCore.dispatch('grg', 'alice', proposed.id); assert.equal(dispatched.job.status, 'QUEUED'); assert.equal(dispatched.hypothesis.status, 'DISPATCHED');
  await app.jobs.runBatch('worker-cognitive');
  const completed = await app.cognitiveCore.getHypothesis('grg', 'alice', proposed.id); const state = await app.store.read();
  assert.equal(completed.status, 'VALIDATED'); assert.ok(state.cognitiveValidations.some((item) => item.hypothesisId === proposed.id)); assert.ok(state.cognitiveReflections.some((item) => item.hypothesisId === proposed.id));
  assert.ok(state.memories.some((item) => item.kind === 'semantic' && item.stableKey === `hypothesis:${proposed.id}`)); assert.ok(state.knowledgeEntities.some((item) => item.type === 'hypothesis' && item.key === proposed.id));
  assert.ok(state.domainEvents.some((item) => item.type === 'cognitive.learning.recorded'));
});

test('critical hypothesis waits for independent approval and never assumes consent', async () => {
  const app = await bootstrap(); const proposed = await app.cognitiveCore.propose('grg', 'alice', hypothesis('cognitive.execute.high'));
  const evaluated = await app.cognitiveCore.evaluate('grg', 'alice', proposed.id); assert.equal(evaluated.status, 'AWAITING_APPROVAL');
  await assert.rejects(() => app.cognitiveCore.dispatch('grg', 'alice', proposed.id), /not consumable/);
  await app.approvals.approve('grg', 'bob', evaluated.approvalId);
  assert.equal((await app.cognitiveCore.dispatch('grg', 'alice', proposed.id)).job.status, 'QUEUED');
});

test('observation cycle consumes durable events and creates evidence-backed planning-only hypotheses', async () => {
  const app = await bootstrap(); await app.fabricEvents.publish({ tenantId: 'grg', stream: 'service:crm', type: 'service.health.degraded', source: 'monitor', subject: 'crm', data: { actorId: 'alice', status: 'DEGRADED' } });
  const result = await app.cognitiveCore.cycle('grg', 'alice'); const dashboard = await app.cognitiveCore.dashboard('grg', 'alice');
  assert.ok(result.observations >= 1); assert.ok(dashboard.hypotheses.some((item) => item.evidence.some((evidence) => evidence.startsWith('event:')) && item.job === null));
  assert.ok(result.context.snapshots.platform.capabilities.length > 0);
  const repeated = await app.cognitiveCore.cycle('grg', 'alice'); assert.equal(repeated.observations, 0);
  const settled = await app.cognitiveCore.cycle('grg', 'alice'); assert.equal(settled.observed, 0); assert.equal(settled.observations, 0);
});

test('priority is transparent and hypotheses without evidence are rejected', async () => {
  const app = await bootstrap(); const item = await app.cognitiveCore.propose('grg', 'alice', hypothesis());
  assert.deepEqual(Object.keys(item.priorityFactors).sort(), ['availability', 'cost', 'effort', 'impact', 'risk', 'security', 'value']);
  await assert.rejects(() => app.cognitiveCore.propose('grg', 'alice', { ...hypothesis(), evidence: [] }), /requires description, evidence/);
});

test('Admin Avatar explains state and never claims planning as execution', async () => {
  const app = await bootstrap(); const proposed = await app.cognitiveCore.propose('grg', 'alice', { ...hypothesis(), job: null });
  const explanation = await app.adminAvatar.explainDecision('grg', 'alice', proposed.id);
  assert.match(explanation.executionClaim, /No execution was performed/); assert.ok(explanation.limitations.length > 0);
  const state = await app.adminAvatar.state('grg', 'alice'); assert.match(state.statement, /no action was executed/i);
  assert.equal((await app.adminAvatar.improvements('grg', 'alice')).executed, false);
});

test('governed Runtime scheduler can trigger recurring cognitive cycles', async () => {
  const app = await bootstrap(); const schedule = await app.jobs.schedule('grg', 'alice', { type: 'cognitive.cycle', runAt: new Date(0).toISOString(), intervalMs: 60_000 });
  const queued = await app.jobs.tick('grg', 'alice'); assert.equal(queued.length, 1); assert.equal(queued[0].type, 'cognitive.cycle');
  assert.equal((await app.store.read()).runtimeSchedules.find((item) => item.id === schedule.id).enabled, true);
});
