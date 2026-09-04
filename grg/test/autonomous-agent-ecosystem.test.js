const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { ForbiddenError } = require('../src/kernel/errors');

const evidence = [{ reference: 'inspection:run-1' }];
const activeApps = new Set();

afterEach(async () => {
  await Promise.all([...activeApps].map((app) => app.close()));
  activeApps.clear();
});

async function bootstrap() {
  const app = await createApp();
  activeApps.add(app);
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await app.controlPlane.addMember('grg', 'alice', { userId: 'bob', role: 'admin' });
  const masterEntity = await app.hierarchy.ensureMaster('grg', 'alice');
  const company = await app.hierarchy.create('grg', 'alice', { type: 'company', name: 'Commerce' });
  const project = await app.hierarchy.create('grg', 'alice', { type: 'project', name: 'ERP', parentId: company.id });
  const state = await app.store.read();
  return { app, masterEntity, company, project, master: state.cognitiveAgents.find((item) => item.entityId === masterEntity.id), architect: state.cognitiveAgents.find((item) => item.entityId === project.id && item.role === 'architect') };
}

test('creates one master avatar and isolated virtual teams for companies and projects', async () => {
  const { app, masterEntity, company, project } = await bootstrap(); const state = await app.store.read();
  assert.equal(state.cognitiveAgents.filter((item) => item.entityId === masterEntity.id && item.role === 'master-avatar').length, 1);
  assert.ok(state.cognitiveAgents.some((item) => item.entityId === company.id && item.role === 'qa'));
  assert.ok(state.cognitiveAgents.some((item) => item.entityId === project.id && item.role === 'security'));
  assert.ok(state.cognitiveAgents.filter((item) => item.entityId === company.id).every((item) => item.identity.includes('/company/')));
});

test('master delegates green work but can never execute it directly', async () => {
  const { app, master, architect, project } = await bootstrap();
  const task = await app.agentEcosystem.delegate('grg', 'alice', { masterAgentId: master.id, targetAgentId: architect.id, title: 'Reindex project', action: 'inspection.reindex', evidence, payload: { workspacePath: '/authorized/project', projectId: project.id }, execute: true });
  assert.equal(task.status, 'DISPATCHED'); assert.equal(task.policyLevel, 'GREEN'); assert.ok(task.jobId);
  await assert.rejects(() => app.agentEcosystem.createTask('grg', 'alice', { agentId: master.id, title: 'Bypass', action: 'inspection.reindex', evidence }), ForbiddenError);
  const state = await app.store.read(); assert.ok(state.domainEvents.some((item) => item.type === 'agent.task.delegated')); assert.equal(state.runtimeJobs[0].type, 'inspection.run');
});

test('yellow work is blocked without objective gates and dispatched when every gate passes', async () => {
  const { app, architect } = await bootstrap();
  const blocked = await app.agentEcosystem.createTask('grg', 'alice', { agentId: architect.id, title: 'Update dependency', action: 'dependency.update', evidence, execute: true, validation: { testsPassed: true, risk: 'medium', impactKnown: true } });
  assert.equal(blocked.status, 'BLOCKED'); assert.equal(blocked.jobId, null);
  const allowed = await app.agentEcosystem.createTask('grg', 'alice', { agentId: architect.id, title: 'Update dependency safely', action: 'dependency.update', evidence, execute: true, validation: { testsPassed: true, risk: 'low', impactKnown: true }, payload: { environmentName: 'development', scriptId: 'signed-maintenance' } });
  assert.equal(allowed.status, 'DISPATCHED'); assert.equal(allowed.jobType, 'sandbox.execute');
});

test('red work requires a separate approval before Runtime dispatch', async () => {
  const { app, architect } = await bootstrap();
  const task = await app.agentEcosystem.createTask('grg', 'alice', { agentId: architect.id, title: 'Production deployment', action: 'deployment.production', evidence, execute: true, payload: { prompt: 'release approved artifact' } });
  assert.equal(task.status, 'AWAITING_APPROVAL'); assert.ok(task.approvalId); assert.equal(task.jobId, null);
  await assert.rejects(() => app.approvals.approve('grg', 'alice', task.approvalId), ForbiddenError);
  await app.approvals.approve('grg', 'bob', task.approvalId);
  const dispatched = await app.agentEcosystem.dispatchApproved('grg', 'bob', task.id, task.approvalId);
  assert.equal(dispatched.status, 'DISPATCHED'); assert.ok(dispatched.jobId);
});

test('knowledge remains scoped until a master promotion is permitted by federation policy', async () => {
  const { app, masterEntity, master, architect, project } = await bootstrap();
  const proposal = await app.agentEcosystem.proposeKnowledge('grg', 'alice', { agentId: architect.id, topic: 'oauth-pattern', statement: 'Reuse the inspected OAuth boundary', knowledgeKind: 'pattern', evidence, provenance: { type: 'inspection', reference: 'inspection:run-1' }, confidence: 0.9 });
  await assert.rejects(() => app.agentEcosystem.promoteKnowledge('grg', 'alice', proposal.id, master.id), ForbiddenError);
  await app.hierarchy.createSharingPolicy('grg', 'alice', { sourceEntityId: project.id, targetEntityId: masterEntity.id, knowledgeKinds: ['pattern'], classifications: ['internal'] });
  const promoted = await app.agentEcosystem.promoteKnowledge('grg', 'alice', proposal.id, master.id);
  assert.equal(promoted.proposal.status, 'PROMOTED'); assert.equal(promoted.pattern.version, 1); assert.equal(promoted.pattern.executionAllowed, false);
  const panel = await app.agentEcosystem.panel('grg', 'alice'); assert.equal(panel.metrics.knowledgePromoted, 1); assert.equal(panel.metrics.reusablePatterns, 1);
});

test('continuous cycle is evidence-backed, summarized and schedulable through Runtime', async () => {
  const { app, architect } = await bootstrap();
  const output = await app.agentEcosystem.cycle('grg', 'alice', { agentId: architect.id, observation: 'Architecture drift detected', evidence, hypothesis: 'Regenerate the architecture diagram', simulation: { outcome: 'read-only' }, plan: ['inspect', 'compare'], action: 'diagram.regenerate', execute: false });
  assert.equal(output.cycle.stages.length, 6); assert.equal(output.task.status, 'POLICY_VALIDATED');
  const schedule = await app.jobs.schedule('grg', 'alice', { type: 'agents.cycle', intervalMs: 60_000, payload: { agentId: architect.id, observation: 'scheduled observation', evidence } });
  assert.equal(schedule.type, 'agents.cycle');
  const panel = await app.agentEcosystem.panel('grg', 'alice'); assert.equal(panel.recentSummaries[0].masterAudience, true);
});

test('Runtime terminal events update task status and the master summary', async () => {
  const { app, architect } = await bootstrap();
  const task = await app.agentEcosystem.createTask('grg', 'alice', { agentId: architect.id, title: 'Refresh metrics', action: 'metrics.refresh', evidence, execute: true, payload: { scriptId: 'missing-on-purpose' } });
  await app.fabricEvents.publish({ tenantId: 'grg', stream: `job:${task.jobId}`, type: 'runtime.job.succeeded', source: 'fenix-runtime', subject: task.jobId, data: { actorId: 'worker-1', jobId: task.jobId, status: 'SUCCEEDED' }, idempotencyKey: `test:${task.jobId}` });
  const terminal = await app.agentEcosystem.getTask('grg', 'alice', task.id); assert.equal(terminal.status, 'SUCCEEDED');
  const panel = await app.agentEcosystem.panel('grg', 'alice'); assert.ok(panel.recentSummaries.some((item) => item.kind === 'task.completed' && item.summary.taskId === task.id));
});

test('operational panel does not expose another cognitive scope to subadmins', async () => {
  const { app, project, architect } = await bootstrap();
  await app.controlPlane.addMember('grg', 'alice', { userId: 'carol', role: 'subadmin' });
  await app.agentEcosystem.createTask('grg', 'alice', { agentId: architect.id, title: 'Private reindex', action: 'inspection.reindex', evidence });
  const hidden = await app.agentEcosystem.panel('grg', 'carol'); assert.equal(hidden.tasks.length, 0); assert.equal(hidden.agents.length, 0);
  await app.hierarchy.grant('grg', 'alice', { subjectId: 'carol', entityId: project.id, permissions: ['read'] });
  const visible = await app.agentEcosystem.panel('grg', 'carol'); assert.equal(visible.tasks.length, 1); assert.ok(visible.agents.length > 0);
});
