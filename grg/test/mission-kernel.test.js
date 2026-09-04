const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { ValidationError, ForbiddenError } = require('../src/kernel/errors');

async function bootstrap() {
  const app = await createApp(); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice'); await app.controlPlane.addMember('grg', 'alice', { userId: 'bob', role: 'admin' }); return app;
}
function input(steps = [{ key: 'observe', type: 'daily-intelligence', payload: {} }, { key: 'report', type: 'daily-intelligence', dependsOn: ['observe'], payload: {} }]) { return { title: 'Analyze CRM', objective: 'Understand the CRM using governed structured work', contextRefs: [{ type: 'KG', ref: 'KG:crm-root' }, { type: 'TWIN', ref: 'TWIN:crm' }], steps }; }

test('mission DAG dispatches through Job Engine and stores only compact agent events', async () => {
  const app = await bootstrap(); const mission = await app.missions.create('grg', 'alice', input()); await app.missions.start('grg', 'alice', mission.id);
  let state = await app.store.read(); assert.equal(state.runtimeJobs.length, 1); assert.equal(state.missionSteps.find((item) => item.key === 'report').status, 'PLANNED');
  await app.jobs.runBatch('worker-1', 5); state = await app.store.read(); assert.equal(state.runtimeJobs.length, 2);
  await app.jobs.runBatch('worker-1', 5); const completed = await app.missions.get('grg', 'alice', mission.id);
  assert.equal(completed.status, 'SUCCEEDED'); assert.equal(completed.progress, 100); assert.equal(completed.summary.metrics.naturalLanguageAgentMessages, 0); assert.ok(completed.summary.metrics.structuredBytes > 0); assert.equal(JSON.stringify(completed.events).includes(input().objective), false); assert.ok(completed.events.every((item) => item.payloadHash.length === 64));
});

test('mission plans reject arbitrary executors, cyclic DAGs, unsafe refs and weak yellow gates', async () => {
  const app = await bootstrap();
  await assert.rejects(() => app.missions.create('grg', 'alice', input([{ key: 'bad', type: 'daily-intelligence', jobType: 'evil.exec' }])), ValidationError);
  await assert.rejects(() => app.missions.create('grg', 'alice', input([{ key: 'one', type: 'daily-intelligence', dependsOn: ['two'] }, { key: 'two', type: 'daily-intelligence', dependsOn: ['one'] }])), /acyclic/);
  await assert.rejects(() => app.missions.create('grg', 'alice', { ...input(), contextRefs: [{ type: 'RAW', ref: 'entire conversation' }] }), ValidationError);
  await assert.rejects(() => app.missions.create('grg', 'alice', input([{ key: 'test', type: 'validate', validation: { testsPassed: true, risk: 'medium', impactKnown: true } }])), /yellow/);
  await assert.rejects(() => app.missions.create('grg', 'alice', input([{ key: 'leak', type: 'daily-intelligence', payload: { apiKey: 'secret' } }])));
});

test('red mission steps require a separate approval before queue dispatch', async () => {
  const app = await bootstrap(); const mission = await app.missions.create('grg', 'alice', input([{ key: 'build', type: 'generate', payload: { prompt: 'ERP' } }])); const waiting = await app.missions.start('grg', 'alice', mission.id); const step = waiting.steps[0];
  assert.equal(waiting.status, 'AWAITING_APPROVAL'); assert.equal(step.status, 'AWAITING_APPROVAL'); assert.equal((await app.store.read()).runtimeJobs.length, 0);
  await assert.rejects(() => app.approvals.approve('grg', 'alice', step.approvalId), ForbiddenError); await app.approvals.approve('grg', 'bob', step.approvalId);
  const dispatched = await app.missions.approveStep('grg', 'bob', mission.id, step.id, step.approvalId); assert.equal(dispatched.steps[0].status, 'DISPATCHED'); assert.equal((await app.store.read()).runtimeJobs[0].type, 'factory.generate');
});

test('pause prevents downstream dispatch and resume continues without losing context', async () => {
  const app = await bootstrap(); const mission = await app.missions.create('grg', 'alice', input()); await app.missions.start('grg', 'alice', mission.id); await app.missions.pause('grg', 'alice', mission.id); await app.jobs.runBatch('worker-1', 5);
  const paused = await app.missions.get('grg', 'alice', mission.id); assert.equal(paused.status, 'PAUSED'); assert.equal(paused.steps[0].status, 'DISPATCHED'); assert.equal(paused.steps[1].status, 'PLANNED'); assert.equal(paused.contextRefs.length, 2);
  assert.equal((await app.jobs.getInternal('grg', paused.steps[0].jobId)).status, 'PAUSED');
  const resumed = await app.missions.resume('grg', 'alice', mission.id);
  assert.equal(resumed.steps[0].jobId, paused.steps[0].jobId);
  assert.equal((await app.jobs.getInternal('grg', resumed.steps[0].jobId)).status, 'QUEUED');
  await app.jobs.runBatch('worker-1', 5);
  const progressed = await app.missions.get('grg', 'alice', mission.id);
  assert.equal(progressed.steps[0].status, 'SUCCEEDED');
  assert.equal(progressed.steps[1].status, 'DISPATCHED');
  await app.jobs.runBatch('worker-1', 5);
  assert.equal((await app.missions.get('grg', 'alice', mission.id)).status, 'SUCCEEDED');
});

test('cancel stops queued work and leaves an auditable compact summary', async () => {
  const app = await bootstrap(); const mission = await app.missions.create('grg', 'alice', input([{ key: 'observe', type: 'daily-intelligence' }])); await app.missions.start('grg', 'alice', mission.id); const cancelled = await app.missions.cancel('grg', 'alice', mission.id);
  assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.steps[0].status, 'CANCELLED'); assert.equal(cancelled.summary.status, 'CANCELLED'); const state = await app.store.read(); assert.equal(state.runtimeJobs[0].status, 'CANCELLED'); assert.ok(state.domainEvents.some((item) => item.type === 'mission.cancelled'));
});

test('reported AI usage enforces mission budget before downstream work', async () => {
  const app = await bootstrap(); app.jobs.handlers.set('operational.daily-intelligence', async () => ({ metrics: { tokens: 11, costUsd: 0.2 } })); const mission = await app.missions.create('grg', 'alice', { ...input(), policy: { maxTokens: 10, maxCostUsd: 1 } }); await app.missions.start('grg', 'alice', mission.id); await app.jobs.runBatch('worker-1', 5);
  const failed = await app.missions.get('grg', 'alice', mission.id); assert.equal(failed.status, 'FAILED'); assert.equal(failed.steps[1].status, 'CANCELLED'); assert.equal(failed.summary.metrics.tokens, 11); assert.ok(failed.events.some((item) => item.type === 'mission.budget-exceeded'));
});

test('avatar exposes operational animation states without inventing voice support', async () => {
  const app = await bootstrap(); const asleep = await app.missions.avatarState('grg', 'alice'); assert.equal(asleep.state, 'SLEEPING'); assert.equal(asleep.voice, false);
  const mission = await app.missions.create('grg', 'alice', input([{ key: 'discover', type: 'discover', payload: { targets: ['docker'] } }])); await app.missions.start('grg', 'alice', mission.id); const scanning = await app.missions.avatarState('grg', 'alice'); assert.equal(scanning.state, 'SCANNING'); assert.equal(scanning.building, 'discovery'); await app.missions.pause('grg', 'alice', mission.id); assert.equal((await app.missions.avatarState('grg', 'alice')).state, 'WAITING');
});

test('scoped missions remain invisible without cognitive grants', async () => {
  const app = await bootstrap(); await app.controlPlane.addMember('grg', 'alice', { userId: 'carol', role: 'subadmin' }); const company = await app.hierarchy.create('grg', 'alice', { type: 'company', name: 'Private Company' }); const project = await app.hierarchy.create('grg', 'alice', { type: 'project', name: 'Private CRM', parentId: company.id }); const mission = await app.missions.create('grg', 'alice', { ...input(), scopeId: project.id });
  assert.equal((await app.missions.list('grg', 'carol')).length, 0); await assert.rejects(() => app.missions.get('grg', 'carol', mission.id), ForbiddenError); await app.hierarchy.grant('grg', 'alice', { subjectId: 'carol', entityId: project.id, permissions: ['read'] }); assert.equal((await app.missions.list('grg', 'carol')).length, 1);
});
