const { uuid, slugify } = require('../kernel/ids');
const { ValidationError, NotFoundError, ForbiddenError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');

const ACTION_CATALOG = Object.freeze({
  'inspection.reindex': { level: 'GREEN', jobType: 'inspection.run', category: 'knowledge' },
  'documentation.regenerate': { level: 'GREEN', jobType: 'sandbox.execute', category: 'documentation' },
  'metrics.refresh': { level: 'GREEN', jobType: 'sandbox.execute', category: 'observability' },
  'diagram.regenerate': { level: 'GREEN', jobType: 'sandbox.execute', category: 'documentation' },
  'knowledge.sync': { level: 'GREEN', jobType: 'cognitive.cycle', category: 'knowledge' },
  'cache.cleanup': { level: 'GREEN', jobType: 'sandbox.execute', category: 'maintenance' },
  'code.maintenance': { level: 'YELLOW', jobType: 'sandbox.execute', category: 'engineering' },
  'dependency.update': { level: 'YELLOW', jobType: 'sandbox.execute', category: 'engineering' },
  'deployment.production': { level: 'RED', jobType: 'project.orchestrate', category: 'deployment' },
  'database.change': { level: 'RED', jobType: 'sandbox.execute', category: 'database' },
  'infrastructure.change': { level: 'RED', jobType: 'sandbox.execute', category: 'infrastructure' },
  'security.change': { level: 'RED', jobType: 'sandbox.execute', category: 'security' },
});

class AutonomousAgentEcosystem {
  constructor({ store, controlPlane, hierarchy, jobs, approvals, federation, events }) {
    this.store = store; this.cp = controlPlane; this.hierarchy = hierarchy; this.jobs = jobs;
    this.approvals = approvals; this.federation = federation; this.events = events; this.detach = [];
  }

  attach() {
    if (this.detach.length || !this.events) return this;
    for (const type of ['runtime.job.succeeded', 'runtime.job.failed', 'runtime.job.cancelled', 'runtime.job.dead_letter']) this.detach.push(this.events.subscribe(type, (event) => this.projectRuntimeEvent(event)));
    return this;
  }

  async projectRuntimeEvent(event) {
    const tenantId = event.tenantId; const jobId = event.data?.jobId; if (!tenantId || !jobId) return null;
    const status = { 'runtime.job.succeeded': 'SUCCEEDED', 'runtime.job.failed': 'FAILED', 'runtime.job.cancelled': 'CANCELLED', 'runtime.job.dead_letter': 'FAILED' }[event.type];
    if (!status) return null; let task = null;
    await this.store.update((state) => { task = state.agentTasks.find((item) => item.tenantId === tenantId && item.jobId === jobId) || null; if (!task) return state; task.status = status; task.runtimeEventId = event.id; task.completedAt = now(); task.updatedAt = now(); state.agentSummaries.push({ id: uuid(), tenantId, agentId: task.agentId, entityId: task.entityId, masterAudience: true, kind: 'task.completed', summary: { taskId: task.id, jobId, status }, createdBy: 'fenix-runtime', createdAt: now() }); return state; });
    if (task) await this.#event(tenantId, 'agent.task.completed', task.id, { actorId: 'fenix-runtime', agentId: task.agentId, jobId, status });
    return task;
  }

  async cycle(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const agent = await this.#agent(tenantId, input?.agentId);
    if (agent.coordinator) throw new ForbiddenError('master avatar coordinates and cannot run worker cycles');
    await this.hierarchy.authorizeScope(tenantId, actorId, agent.entityId, 'write');
    requireText(input?.observation, 'observation'); requireEvidence(input?.evidence);
    assertNoSecrets(input);
    const cycle = { id: uuid(), tenantId, agentId: agent.id, entityId: agent.entityId, status: 'COMPLETED', trigger: input.trigger || 'manual', stages: [
      stage('OBSERVE', input.observation, input.evidence),
      stage('ANALYZE', input.analysis || 'Analysis pending specialist refinement', input.evidence),
      stage('LEARN', input.learning || 'Evidence retained in the scoped cycle', input.evidence),
      stage('HYPOTHESIZE', input.hypothesis || 'No actionable hypothesis', input.evidence),
      stage('SIMULATE', input.simulation || { outcome: 'not-requested' }, input.evidence),
      stage('PLAN', input.plan || [], input.evidence),
    ], createdBy: actorId, createdAt: now() };
    await this.store.update((state) => { state.agentCycles.push(cycle); return state; });
    let task = null;
    if (input.action) task = await this.createTask(tenantId, actorId, { agentId: agent.id, entityId: agent.entityId, title: input.title || input.hypothesis || input.action, action: input.action, evidence: input.evidence, rationale: input.rationale, validation: input.validation, payload: input.payload, execute: input.execute === true, cycleId: cycle.id });
    await this.#summary(tenantId, agent, 'cycle.completed', { cycleId: cycle.id, taskId: task?.id || null, observation: input.observation }, actorId);
    await this.#event(tenantId, 'agent.cycle.completed', cycle.id, { actorId, agentId: agent.id, entityId: agent.entityId, taskId: task?.id || null });
    return { cycle, task };
  }

  async delegate(tenantId, actorId, input) {
    const master = await this.#agent(tenantId, input?.masterAgentId);
    if (!master.coordinator || master.role !== 'master-avatar') throw new ForbiddenError('only the master avatar can coordinate delegations');
    const target = await this.#agent(tenantId, input?.targetAgentId);
    if (target.coordinator) throw new ValidationError('the master avatar cannot delegate execution to itself');
    await this.hierarchy.authorizeScope(tenantId, actorId, target.entityId, 'coordinate');
    const task = await this.createTask(tenantId, actorId, { ...input, agentId: target.id, entityId: target.entityId, delegatedBy: master.id });
    await this.#event(tenantId, 'agent.task.delegated', task.id, { actorId, masterAgentId: master.id, targetAgentId: target.id, entityId: target.entityId });
    return task;
  }

  async createTask(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const agent = await this.#agent(tenantId, input?.agentId);
    if (agent.coordinator || agent.executionAllowed === false) throw new ForbiddenError('coordinator agents cannot execute tasks');
    if (input.entityId && input.entityId !== agent.entityId) throw new ForbiddenError('agent task cannot escape its cognitive scope');
    await this.hierarchy.authorizeScope(tenantId, actorId, agent.entityId, 'write');
    const action = ACTION_CATALOG[input?.action];
    if (!action) throw new ValidationError('action is not present in the governed agent catalog');
    requireText(input?.title, 'title'); requireEvidence(input?.evidence); assertNoSecrets(input.payload || {});
    const policy = evaluatePolicy(action, input.validation || {});
    const task = { id: uuid(), tenantId, agentId: agent.id, entityId: agent.entityId, cycleId: input.cycleId || null, delegatedBy: input.delegatedBy || null, title: String(input.title).trim(), action: input.action, category: action.category, policyLevel: action.level, jobType: action.jobType, payload: input.payload || {}, evidence: input.evidence, validation: input.validation || {}, rationale: String(input.rationale || '').trim() || null, policyDecision: policy, status: policy.allowed ? 'POLICY_VALIDATED' : 'BLOCKED', requestedBy: actorId, approvalId: null, jobId: null, createdAt: now(), updatedAt: now() };
    await this.store.update((state) => { state.agentTasks.push(task); return state; });
    await this.#event(tenantId, 'agent.task.created', task.id, { actorId, agentId: agent.id, entityId: agent.entityId, action: task.action, policyLevel: task.policyLevel, status: task.status });
    if (policy.allowed && input.execute === true) await this.#route(task, actorId);
    await this.#summary(tenantId, agent, 'task.created', { taskId: task.id, action: task.action, policyLevel: task.policyLevel, status: task.status }, actorId);
    return this.getTask(tenantId, actorId, task.id);
  }

  async dispatchApproved(tenantId, actorId, taskId, approvalId) {
    await this.cp.authorize(tenantId, actorId, 'security:manage');
    const task = await this.#task(tenantId, taskId);
    if (task.policyLevel !== 'RED' || task.status !== 'AWAITING_APPROVAL' || task.approvalId !== approvalId) throw new ValidationError('task is not awaiting this red-level approval');
    await this.approvals.consume(tenantId, actorId, approvalId, { action: 'agent.execute.red', resource: approvalResource(task) });
    return this.#dispatch(task, task.requestedBy);
  }

  async proposeKnowledge(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'knowledge:publish');
    const agent = await this.#agent(tenantId, input?.agentId);
    if (agent.coordinator) throw new ValidationError('master avatar evaluates knowledge and does not originate specialist proposals');
    await this.hierarchy.authorizeScope(tenantId, actorId, agent.entityId, 'write');
    requireText(input?.statement, 'statement'); requireEvidence(input?.evidence); assertNoSecrets(input);
    const proposal = { id: uuid(), tenantId, agentId: agent.id, sourceEntityId: agent.entityId, knowledgeKind: input.knowledgeKind || 'pattern', key: slugify(input.key || input.topic || input.statement.slice(0, 80)), topic: String(input.topic || 'agent-learning'), statement: String(input.statement).slice(0, 100_000), evidence: input.evidence, confidence: Number(input.confidence ?? 0.5), classification: input.classification || 'internal', provenance: input.provenance || { type: 'agent-cycle', reference: input.cycleId || agent.id }, status: 'PROPOSED', promotedBy: null, publicationId: null, createdBy: actorId, createdAt: now() };
    if (proposal.confidence < 0 || proposal.confidence > 1) throw new ValidationError('confidence must be between 0 and 1');
    await this.store.update((state) => { state.knowledgePromotionProposals.push(proposal); return state; });
    await this.#event(tenantId, 'agent.knowledge.proposed', proposal.id, { actorId, agentId: agent.id, sourceEntityId: agent.entityId, knowledgeKind: proposal.knowledgeKind, classification: proposal.classification });
    return proposal;
  }

  async promoteKnowledge(tenantId, actorId, proposalId, masterAgentId) {
    await this.cp.authorize(tenantId, actorId, 'knowledge:publish');
    const master = await this.#agent(tenantId, masterAgentId);
    if (!master.coordinator || master.role !== 'master-avatar') throw new ForbiddenError('only the master avatar can promote global knowledge');
    const proposal = await this.#proposal(tenantId, proposalId);
    if (proposal.status !== 'PROPOSED') throw new ValidationError(`knowledge proposal is ${proposal.status}`);
    await this.hierarchy.authorizeShare(tenantId, actorId, { sourceEntityId: proposal.sourceEntityId, targetEntityId: master.entityId, knowledgeKind: proposal.knowledgeKind, classification: proposal.classification });
    const publication = await this.federation.publish(tenantId, actorId, { publisherId: proposal.agentId, topic: proposal.topic, key: proposal.key, statement: proposal.statement, facts: { evidence: proposal.evidence, sourceEntityId: proposal.sourceEntityId, targetEntityId: master.entityId }, confidence: proposal.confidence, classification: proposal.classification, scope: { type: 'global', sourceEntityId: proposal.sourceEntityId, targetEntityId: master.entityId }, provenance: proposal.provenance, idempotencyKey: `agent-knowledge:${proposal.id}` });
    let pattern;
    await this.store.update((state) => {
      const current = state.knowledgePromotionProposals.find((item) => item.id === proposal.id); current.status = 'PROMOTED'; current.promotedBy = master.id; current.publicationId = publication.id; current.promotedAt = now();
      const versions = state.evolutionPatterns.filter((item) => item.tenantId === tenantId && item.key === proposal.key);
      pattern = { id: uuid(), tenantId, key: proposal.key, version: versions.length + 1, kind: proposal.knowledgeKind, statement: proposal.statement, evidence: proposal.evidence, sourceProposalId: proposal.id, previousVersionId: versions.at(-1)?.id || null, status: 'ACTIVE', executionAllowed: false, createdBy: actorId, createdAt: now() };
      for (const item of versions.filter((item) => item.status === 'ACTIVE')) item.status = 'SUPERSEDED';
      state.evolutionPatterns.push(pattern); return state;
    });
    await this.#event(tenantId, 'agent.knowledge.promoted', proposal.id, { actorId, masterAgentId: master.id, publicationId: publication.id, patternId: pattern.id, patternVersion: pattern.version });
    return { proposal: await this.#proposal(tenantId, proposal.id), publication, pattern };
  }

  async getTask(tenantId, actorId, taskId) { const task = await this.#task(tenantId, taskId); await this.hierarchy.authorizeScope(tenantId, actorId, task.entityId, 'read'); return task; }
  async panel(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read'); const accessible = await this.hierarchy.accessibleIds(tenantId, actorId, 'read'); const state = await this.store.read();
    const visible = (item) => item.tenantId === tenantId && (accessible === null || accessible.has(item.entityId || item.sourceEntityId));
    const agents = state.cognitiveAgents.filter(visible); const tasks = state.agentTasks.filter(visible); const proposals = state.knowledgePromotionProposals.filter(visible); const proposalIds = new Set(proposals.map((item) => item.id)); const patterns = state.evolutionPatterns.filter((item) => item.tenantId === tenantId && proposalIds.has(item.sourceProposalId)); const completed = tasks.filter((item) => item.status === 'SUCCEEDED').length; const failed = tasks.filter((item) => ['FAILED', 'BLOCKED'].includes(item.status)).length;
    return { agents, activeAgents: agents.filter((item) => item.status === 'ACTIVE').length, tasks, metrics: { running: tasks.filter((item) => ['DISPATCHED', 'RUNNING'].includes(item.status)).length, proposed: tasks.filter((item) => item.status === 'POLICY_VALIDATED').length, awaitingApproval: tasks.filter((item) => item.status === 'AWAITING_APPROVAL').length, blocked: tasks.filter((item) => item.status === 'BLOCKED').length, completed, failed, successRate: completed + failed ? completed / (completed + failed) : null, knowledgeProposed: proposals.filter((item) => item.status === 'PROPOSED').length, knowledgePromoted: proposals.filter((item) => item.status === 'PROMOTED').length, reusablePatterns: patterns.filter((item) => item.status === 'ACTIVE').length, backlog: tasks.filter((item) => ['POLICY_VALIDATED', 'AWAITING_APPROVAL', 'BLOCKED'].includes(item.status)).length }, recentSummaries: state.agentSummaries.filter(visible).slice(-20).reverse() };
  }

  async #route(task, actorId) {
    if (task.policyLevel === 'RED') {
      const approval = await this.approvals.request(task.tenantId, actorId, { action: 'agent.execute.red', resource: approvalResource(task), rationale: task.rationale || `Agent task ${task.id}` });
      await this.store.update((state) => { const current = state.agentTasks.find((item) => item.id === task.id); current.status = 'AWAITING_APPROVAL'; current.approvalId = approval.id; current.updatedAt = now(); return state; });
      await this.#event(task.tenantId, 'agent.task.approval-required', task.id, { actorId, approvalId: approval.id, policyLevel: task.policyLevel }); return;
    }
    await this.#dispatch(task, actorId);
  }

  async #dispatch(task, actorId) {
    const job = await this.jobs.submit(task.tenantId, actorId, { type: task.jobType, payload: task.payload });
    await this.store.update((state) => { const current = state.agentTasks.find((item) => item.id === task.id); current.status = 'DISPATCHED'; current.jobId = job.id; current.updatedAt = now(); return state; });
    await this.#event(task.tenantId, 'agent.task.dispatched', task.id, { actorId, agentId: task.agentId, jobId: job.id, jobType: task.jobType, policyLevel: task.policyLevel });
    return this.#task(task.tenantId, task.id);
  }

  async #agent(tenantId, agentId) { const state = await this.store.read(); const agent = state.cognitiveAgents.find((item) => item.tenantId === tenantId && item.id === agentId && item.status === 'ACTIVE'); if (!agent) throw new NotFoundError(`cognitive agent not found: ${agentId}`); return agent; }
  async #task(tenantId, taskId) { const state = await this.store.read(); const task = state.agentTasks.find((item) => item.tenantId === tenantId && item.id === taskId); if (!task) throw new NotFoundError(`agent task not found: ${taskId}`); return task; }
  async #proposal(tenantId, proposalId) { const state = await this.store.read(); const proposal = state.knowledgePromotionProposals.find((item) => item.tenantId === tenantId && item.id === proposalId); if (!proposal) throw new NotFoundError(`knowledge promotion proposal not found: ${proposalId}`); return proposal; }
  async #summary(tenantId, agent, kind, summary, actorId) { await this.store.update((state) => { state.agentSummaries.push({ id: uuid(), tenantId, agentId: agent.id, entityId: agent.entityId, masterAudience: true, kind, summary, createdBy: actorId, createdAt: now() }); return state; }); }
  async #event(tenantId, type, subject, data) { if (!this.events) return; await this.events.publish({ tenantId, stream: `agents:${subject}`, type, source: 'fenix-agent-ecosystem', subject, data, idempotencyKey: `${type}:${subject}:${data.jobId || data.approvalId || data.patternVersion || '1'}` }); }
}

function evaluatePolicy(action, validation) {
  if (action.level === 'GREEN') return { allowed: true, reason: 'catalogued reversible operational action' };
  if (action.level === 'YELLOW') { const allowed = validation.testsPassed === true && validation.risk === 'low' && validation.impactKnown === true; return { allowed, reason: allowed ? 'tests passed, risk is low and impact is known' : 'yellow actions require passing tests, low risk and known impact' }; }
  return { allowed: true, reason: 'explicit approval by a separate authorized actor is mandatory' };
}
function approvalResource(task) { return { taskId: task.id, action: task.action, entityId: task.entityId, agentId: task.agentId, jobType: task.jobType }; }
function requireText(value, name) { if (!String(value || '').trim()) throw new ValidationError(`${name} is required`); }
function requireEvidence(value) { if (!Array.isArray(value) || !value.length || value.some((item) => !String(item?.reference || item || '').trim())) throw new ValidationError('at least one evidence reference is required'); }
function stage(name, output, evidence) { return { name, output, evidence, completedAt: now() }; }
function now() { return new Date().toISOString(); }

module.exports = { AutonomousAgentEcosystem, ACTION_CATALOG, evaluatePolicy, approvalResource };
