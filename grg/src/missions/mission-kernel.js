const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError, ForbiddenError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
const MISSION_STEP_CATALOG = Object.freeze({
  discover: { jobType: 'discovery.scan', agent: 'discovery', level: 'GREEN', avatar: 'SCANNING', building: 'discovery' },
  inspect: { jobType: 'inspection.run', agent: 'architect', level: 'GREEN', avatar: 'SCANNING', building: 'knowledge' },
  analyze: { jobType: 'cognitive.cycle', agent: 'analyst', level: 'GREEN', avatar: 'LEARNING', building: 'academy' },
  'agent-observe': { jobType: 'agents.cycle', agent: 'telemetry', level: 'GREEN', avatar: 'LEARNING', building: 'operations' },
  validate: { jobType: 'sandbox.execute', agent: 'qa', level: 'YELLOW', avatar: 'PROGRAMMING', building: 'laboratory' },
  generate: { jobType: 'factory.generate', agent: 'developer', level: 'RED', avatar: 'BUILDING', building: 'factory' },
  orchestrate: { jobType: 'project.orchestrate', agent: 'devops', level: 'RED', avatar: 'DEPLOYING', building: 'port' },
  activate: { jobType: 'operational.activation', agent: 'runtime', level: 'GREEN', avatar: 'RECOVERING', building: 'operations' },
  'daily-intelligence': { jobType: 'operational.daily-intelligence', agent: 'analyst', level: 'GREEN', avatar: 'LEARNING', building: 'academy' },
});

class MissionKernel {
  constructor({ store, controlPlane, hierarchy, jobs, approvals, events }) {
    this.store = store; this.cp = controlPlane; this.hierarchy = hierarchy; this.jobs = jobs; this.approvals = approvals; this.events = events; this.unsubscribe = [];
  }

  attach() {
    if (this.unsubscribe.length || !this.events) return this;
    for (const type of ['runtime.job.succeeded', 'runtime.job.dead_letter', 'runtime.job.cancelled']) this.unsubscribe.push(this.events.subscribe(type, (event) => this.projectJobEvent(event)));
    return this;
  }

  async create(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    if (input?.scopeId && this.hierarchy) await this.hierarchy.authorizeScope(tenantId, actorId, input.scopeId, 'write');
    const title = String(input?.title || '').trim(); const objective = String(input?.objective || '').trim();
    if (!title || !objective) throw new ValidationError('mission title and objective are required');
    if (title.length > 200 || objective.length > 4_000) throw new ValidationError('mission title or objective is too large');
    const normalized = normalizeSteps(input.steps, this.jobs); validateDag(normalized);
    const mission = { id: uuid(), tenantId, scopeId: input.scopeId || null, title, objective, objectiveHash: hash(objective), status: 'PLANNED', priority: Math.max(-10, Math.min(10, Number(input.priority || 0))), policy: { maxTokens: nullableNumber(input.policy?.maxTokens), maxCostUsd: nullableNumber(input.policy?.maxCostUsd), deadline: normalizeDeadline(input.policy?.deadline) }, progress: 0, requestedBy: actorId, createdAt: now(), updatedAt: now() };
    const steps = normalized.map((item, index) => ({ id: uuid(), tenantId, missionId: mission.id, key: item.key, type: item.type, agent: item.definition.agent, policyLevel: item.definition.level, jobType: item.definition.jobType, avatarState: item.definition.avatar, building: item.definition.building, dependsOn: item.dependsOn, payload: item.payload, payloadHash: hash(item.payload), validation: item.validation, contextRefs: item.contextRefs, status: 'PLANNED', order: index, approvalId: null, approvalConsumedAt: null, jobId: null, metrics: { durationMs: null, attempts: 0, tokens: null, costUsd: null }, createdAt: now(), updatedAt: now() }));
    const refs = normalizeRefs(input.contextRefs || []).map((item) => ({ id: uuid(), tenantId, missionId: mission.id, stepId: null, ...item, createdAt: now() }));
    await this.store.update((state) => { state.missions.push(mission); state.missionSteps.push(...steps); state.missionContextRefs.push(...refs); return state; });
    await this.#event(mission, 'mission.created', null, { status: mission.status, stepCount: steps.length, objectiveHash: mission.objectiveHash, contextRefs: refs.map((item) => item.ref) }, actorId);
    return this.get(tenantId, actorId, mission.id);
  }

  async start(tenantId, actorId, missionId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute'); const mission = await this.#mission(tenantId, missionId); await this.#authorizeScope(tenantId, actorId, mission, 'write');
    if (!['PLANNED', 'PAUSED', 'AWAITING_APPROVAL'].includes(mission.status)) throw new ValidationError(`mission cannot start from ${mission.status}`);
    await this.store.update((state) => { const current = state.missions.find((item) => item.id === missionId); current.status = 'RUNNING'; current.startedAt ||= now(); current.updatedAt = now(); return state; });
    await this.#event(mission, 'mission.started', null, { status: 'RUNNING' }, actorId); await this.#dispatchReady(tenantId, missionId); return this.get(tenantId, actorId, missionId);
  }

  async pause(tenantId, actorId, missionId) { await this.cp.authorize(tenantId, actorId, 'runtime:execute'); const mission = await this.#mission(tenantId, missionId); await this.#authorizeScope(tenantId, actorId, mission, 'write'); if (!['RUNNING', 'AWAITING_APPROVAL'].includes(mission.status)) throw new ValidationError(`mission cannot pause from ${mission.status}`); await this.#setMissionStatus(missionId, 'PAUSED'); await this.#event(mission, 'mission.paused', null, { status: 'PAUSED' }, actorId); return this.get(tenantId, actorId, missionId); }
  async resume(tenantId, actorId, missionId) { return this.start(tenantId, actorId, missionId); }

  async cancel(tenantId, actorId, missionId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute'); const mission = await this.#mission(tenantId, missionId); await this.#authorizeScope(tenantId, actorId, mission, 'write'); if (TERMINAL.has(mission.status)) return this.get(tenantId, actorId, missionId);
    const state = await this.store.read(); const steps = state.missionSteps.filter((item) => item.tenantId === tenantId && item.missionId === missionId && !TERMINAL.has(item.status));
    for (const step of steps.filter((item) => item.jobId)) await this.jobs.cancel(tenantId, actorId, step.jobId);
    await this.store.update((next) => { const current = next.missions.find((item) => item.id === missionId); current.status = 'CANCELLED'; current.progress = progress(next.missionSteps.filter((item) => item.missionId === missionId)); current.completedAt = now(); current.updatedAt = now(); for (const step of next.missionSteps.filter((item) => item.missionId === missionId && !TERMINAL.has(item.status))) { step.status = 'CANCELLED'; step.updatedAt = now(); } return next; });
    await this.#summarize(tenantId, missionId, actorId); await this.#event(mission, 'mission.cancelled', null, { status: 'CANCELLED' }, actorId); return this.get(tenantId, actorId, missionId);
  }

  async approveStep(tenantId, actorId, missionId, stepId, approvalId) {
    await this.cp.authorize(tenantId, actorId, 'security:manage'); const mission = await this.#mission(tenantId, missionId); const step = await this.#step(tenantId, missionId, stepId);
    if (step.status !== 'AWAITING_APPROVAL' || step.approvalId !== approvalId) throw new ValidationError('mission step is not awaiting this approval');
    await this.approvals.consume(tenantId, actorId, approvalId, { action: 'mission.step.red', resource: approvalResource(mission, step) });
    await this.store.update((state) => { const current = state.missionSteps.find((item) => item.id === step.id); current.status = 'PLANNED'; current.approvalConsumedAt = now(); current.updatedAt = now(); const currentMission = state.missions.find((item) => item.id === mission.id); currentMission.status = 'RUNNING'; currentMission.updatedAt = now(); return state; });
    await this.#event(mission, 'mission.step.approved', step, { status: 'PLANNED', approvalId }, actorId); await this.#dispatchReady(tenantId, missionId); return this.get(tenantId, actorId, missionId);
  }

  async projectJobEvent(event) {
    const jobId = event.data?.jobId; if (!event.tenantId || !jobId) return null; const state = await this.store.read(); const step = state.missionSteps.find((item) => item.tenantId === event.tenantId && item.jobId === jobId); if (!step) return null; const mission = state.missions.find((item) => item.id === step.missionId); if (!mission) return null;
    const job = await this.jobs.getInternal(event.tenantId, jobId); const status = event.type === 'runtime.job.succeeded' ? 'SUCCEEDED' : event.type === 'runtime.job.cancelled' ? 'CANCELLED' : 'FAILED'; const metrics = { durationMs: job.startedAt && job.completedAt ? Date.parse(job.completedAt) - Date.parse(job.startedAt) : null, attempts: job.attempts, tokens: finiteOrNull(job.result?.metrics?.tokens), costUsd: finiteOrNull(job.result?.metrics?.costUsd) };
    await this.store.update((next) => { const current = next.missionSteps.find((item) => item.id === step.id); current.status = status; current.metrics = metrics; current.resultHash = hash(job.result || null); current.updatedAt = now(); const currentMission = next.missions.find((item) => item.id === mission.id); currentMission.progress = progress(next.missionSteps.filter((item) => item.missionId === mission.id)); currentMission.updatedAt = now(); return next; });
    await this.#event(mission, 'mission.step.completed', step, { status, jobId, metrics: eventMetrics(metrics), resultHash: hash(job.result || null), contextRefs: step.contextRefs.map((item) => item.ref) }, 'fenix-runtime');
    if (await this.#enforceBudget(event.tenantId, mission.id)) return this.#step(event.tenantId, mission.id, step.id); if (status === 'SUCCEEDED') await this.#dispatchReady(event.tenantId, mission.id); await this.#finalize(event.tenantId, mission.id); return this.#step(event.tenantId, mission.id, step.id);
  }

  async #dispatchReady(tenantId, missionId) {
    const state = await this.store.read(); const mission = state.missions.find((item) => item.tenantId === tenantId && item.id === missionId); if (!mission || mission.status !== 'RUNNING') return [];
    if (mission.policy.deadline && Date.now() >= Date.parse(mission.policy.deadline)) { await this.store.update((next) => { const current = next.missions.find((item) => item.id === missionId); current.status = 'FAILED'; current.completedAt = now(); current.updatedAt = now(); for (const step of next.missionSteps.filter((item) => item.missionId === missionId && !TERMINAL.has(item.status))) { step.status = 'CANCELLED'; step.updatedAt = now(); } return next; }); await this.#summarize(tenantId, missionId, 'fenix-mission-kernel'); await this.#event(mission, 'mission.deadline-exceeded', null, { status: 'FAILED', deadline: mission.policy.deadline }, 'fenix-mission-kernel'); return []; }
    const steps = state.missionSteps.filter((item) => item.tenantId === tenantId && item.missionId === missionId); const succeeded = new Set(steps.filter((item) => item.status === 'SUCCEEDED').map((item) => item.key)); const ready = steps.filter((item) => item.status === 'PLANNED' && item.dependsOn.every((key) => succeeded.has(key))); const dispatched = [];
    for (const step of ready) {
      if (step.policyLevel === 'RED' && !step.approvalConsumedAt) { const approval = await this.approvals.request(tenantId, mission.requestedBy, { action: 'mission.step.red', resource: approvalResource(mission, step), rationale: `Mission ${mission.id} step ${step.key}` }); await this.store.update((next) => { const current = next.missionSteps.find((item) => item.id === step.id); current.status = 'AWAITING_APPROVAL'; current.approvalId = approval.id; current.updatedAt = now(); return next; }); await this.#event(mission, 'mission.step.approval-required', step, { status: 'AWAITING_APPROVAL', approvalId: approval.id }, mission.requestedBy); continue; }
      dispatched.push(await this.#dispatchStep(mission, step));
    }
    if (!dispatched.length) { const latest = await this.store.read(); const pending = latest.missionSteps.filter((item) => item.missionId === missionId); if (pending.some((item) => item.status === 'AWAITING_APPROVAL') && !pending.some((item) => item.status === 'DISPATCHED')) await this.#setMissionStatus(missionId, 'AWAITING_APPROVAL'); }
    return dispatched;
  }

  async #dispatchStep(mission, step) {
    const job = await this.jobs.submit(mission.tenantId, mission.requestedBy, { type: step.jobType, payload: step.payload, priority: mission.priority });
    await this.store.update((state) => { const current = state.missionSteps.find((item) => item.id === step.id); current.status = 'DISPATCHED'; current.jobId = job.id; current.dispatchedAt = now(); current.updatedAt = now(); return state; });
    await this.#event(mission, 'mission.step.dispatched', step, { status: 'DISPATCHED', jobId: job.id, jobType: step.jobType, payloadHash: step.payloadHash, contextRefs: step.contextRefs.map((item) => item.ref) }, mission.requestedBy); return job;
  }

  async #finalize(tenantId, missionId) {
    const state = await this.store.read(); const mission = state.missions.find((item) => item.tenantId === tenantId && item.id === missionId); if (!mission || TERMINAL.has(mission.status)) return; const steps = state.missionSteps.filter((item) => item.missionId === missionId);
    let status = null; if (steps.some((item) => item.status === 'FAILED')) status = 'FAILED'; else if (steps.every((item) => item.status === 'SUCCEEDED')) status = 'SUCCEEDED'; if (!status) return;
    await this.store.update((next) => { const current = next.missions.find((item) => item.id === missionId); current.status = status; current.progress = progress(next.missionSteps.filter((item) => item.missionId === missionId)); current.completedAt = now(); current.updatedAt = now(); return next; }); await this.#summarize(tenantId, missionId, 'fenix-mission-kernel'); await this.#event(mission, 'mission.completed', null, { status }, 'fenix-mission-kernel');
  }

  async #enforceBudget(tenantId, missionId) {
    const state = await this.store.read(); const mission = state.missions.find((item) => item.tenantId === tenantId && item.id === missionId); if (!mission || TERMINAL.has(mission.status)) return false; const steps = state.missionSteps.filter((item) => item.missionId === missionId); const tokens = sumKnown(steps, 'tokens'); const costUsd = sumKnown(steps, 'costUsd'); const exceeded = (mission.policy.maxTokens != null && tokens != null && tokens > mission.policy.maxTokens) || (mission.policy.maxCostUsd != null && costUsd != null && costUsd > mission.policy.maxCostUsd); if (!exceeded) return false;
    for (const step of steps.filter((item) => item.status === 'DISPATCHED' && item.jobId)) await this.jobs.cancel(tenantId, mission.requestedBy, step.jobId);
    await this.store.update((next) => { const current = next.missions.find((item) => item.id === missionId); current.status = 'FAILED'; current.completedAt = now(); current.updatedAt = now(); for (const step of next.missionSteps.filter((item) => item.missionId === missionId && !TERMINAL.has(item.status))) { step.status = 'CANCELLED'; step.updatedAt = now(); } return next; }); await this.#summarize(tenantId, missionId, 'fenix-mission-kernel'); await this.#event(mission, 'mission.budget-exceeded', null, { status: 'FAILED', metrics: { aiUnits: tokens, costUsd }, policy: { maxAiUnits: mission.policy.maxTokens, maxCostUsd: mission.policy.maxCostUsd, deadline: mission.policy.deadline } }, 'fenix-mission-kernel'); return true;
  }

  async #summarize(tenantId, missionId, actorId) {
    const state = await this.store.read(); if (state.missionSummaries.some((item) => item.tenantId === tenantId && item.missionId === missionId)) return; const mission = state.missions.find((item) => item.id === missionId); const steps = state.missionSteps.filter((item) => item.missionId === missionId); const events = state.missionEvents.filter((item) => item.missionId === missionId); const refs = state.missionContextRefs.filter((item) => item.missionId === missionId);
    const summary = { id: uuid(), tenantId, missionId, status: mission.status, objectiveHash: mission.objectiveHash, steps: steps.map((item) => ({ key: item.key, type: item.type, status: item.status, resultHash: item.resultHash || null, contextRefs: item.contextRefs.map((ref) => ref.ref) })), contextRefs: refs.map((item) => item.ref), metrics: { durationMs: mission.startedAt && mission.completedAt ? Date.parse(mission.completedAt) - Date.parse(mission.startedAt) : null, tokens: sumKnown(steps, 'tokens'), costUsd: sumKnown(steps, 'costUsd'), structuredEvents: events.length, structuredBytes: Buffer.byteLength(JSON.stringify(events)), naturalLanguageAgentMessages: 0 }, createdBy: actorId, createdAt: now() };
    await this.store.update((next) => { next.missionSummaries.push(summary); return next; });
  }

  async get(tenantId, actorId, missionId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const mission = await this.#mission(tenantId, missionId); await this.#authorizeScope(tenantId, actorId, mission, 'read'); const state = await this.store.read(); return { ...mission, steps: state.missionSteps.filter((item) => item.missionId === missionId).sort((a, b) => a.order - b.order), events: state.missionEvents.filter((item) => item.missionId === missionId), contextRefs: state.missionContextRefs.filter((item) => item.missionId === missionId), summary: state.missionSummaries.find((item) => item.missionId === missionId) || null }; }
  async list(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const accessible = this.hierarchy ? await this.hierarchy.accessibleIds(tenantId, actorId, 'read') : null; const state = await this.store.read(); return state.missions.filter((item) => item.tenantId === tenantId && (accessible === null || (item.scopeId && accessible.has(item.scopeId)))); }
  async avatarState(tenantId, actorId) { const missions = await this.list(tenantId, actorId); const state = await this.store.read(); const active = missions.filter((item) => !TERMINAL.has(item.status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]; if (active) { const steps = state.missionSteps.filter((item) => item.missionId === active.id); const current = steps.find((item) => ['DISPATCHED', 'RUNNING'].includes(item.status)) || steps.find((item) => item.status === 'AWAITING_APPROVAL'); return { state: active.status === 'PAUSED' || active.status === 'AWAITING_APPROVAL' ? 'WAITING' : current?.avatarState || 'WALKING', missionId: active.id, stepId: current?.id || null, building: current?.building || 'central', progress: active.progress, voice: false }; } const latest = missions.filter((item) => item.status === 'SUCCEEDED').sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))[0]; return { state: latest && Date.now() - Date.parse(latest.completedAt) < 60_000 ? 'CELEBRATING' : 'SLEEPING', missionId: latest?.id || null, stepId: null, building: 'central', progress: latest?.progress || 0, voice: false }; }

  async #mission(tenantId, missionId) { const state = await this.store.read(); const mission = state.missions.find((item) => item.tenantId === tenantId && item.id === missionId); if (!mission) throw new NotFoundError(`mission not found: ${missionId}`); return mission; }
  async #step(tenantId, missionId, stepId) { const state = await this.store.read(); const step = state.missionSteps.find((item) => item.tenantId === tenantId && item.missionId === missionId && item.id === stepId); if (!step) throw new NotFoundError(`mission step not found: ${stepId}`); return step; }
  async #authorizeScope(tenantId, actorId, mission, permission) { if (mission.scopeId && this.hierarchy) return this.hierarchy.authorizeScope(tenantId, actorId, mission.scopeId, permission); const membership = await this.cp.getMembership(tenantId, actorId); if (!['admin', 'master_admin'].includes(membership.role)) throw new ForbiddenError('global missions require an administrator'); return membership; }
  async #setMissionStatus(missionId, status) { await this.store.update((state) => { const mission = state.missions.find((item) => item.id === missionId); mission.status = status; mission.updatedAt = now(); return state; }); }
  async #event(mission, type, step, data, actorId) { assertNoSecrets(data); const record = { id: uuid(), tenantId: mission.tenantId, missionId: mission.id, stepId: step?.id || null, stepKey: step?.key || null, agent: step?.agent || 'mission-kernel', type, status: data.status || null, contextRefs: data.contextRefs || [], confidence: data.confidence ?? null, metrics: data.metrics || null, payloadHash: hash(data), actorId, createdAt: now() }; await this.store.update((state) => { state.missionEvents.push(record); return state; }); if (this.events) await this.events.publish({ tenantId: mission.tenantId, stream: `mission:${mission.id}`, type, source: 'fenix-mission-kernel', subject: step?.id || mission.id, data: { actorId, missionId: mission.id, stepId: step?.id || null, stepKey: step?.key || null, agent: record.agent, status: record.status, contextRefs: record.contextRefs, confidence: record.confidence, metrics: record.metrics, payloadHash: record.payloadHash, city: { district: 'missions', building: step?.building || 'mission-control' } }, idempotencyKey: `${type}:${record.id}` }); return record; }
}

function normalizeSteps(input, jobs) { if (!Array.isArray(input) || !input.length || input.length > 50) throw new ValidationError('mission requires between 1 and 50 steps'); const keys = new Set(); return input.map((step) => { const key = String(step?.key || '').trim(); if (!/^[a-z][a-z0-9._-]{1,79}$/.test(key) || keys.has(key)) throw new ValidationError(`invalid or duplicate mission step key: ${key}`); if (step.jobType || step.agent) throw new ValidationError('mission jobType and agent are assigned only by the governed catalog'); keys.add(key); const definition = MISSION_STEP_CATALOG[step.type]; if (!definition) throw new ValidationError(`mission step type is not governed: ${step.type}`); if (!jobs.handlers.has(definition.jobType)) throw new ValidationError(`mission job handler is unavailable: ${definition.jobType}`); const payload = step.payload || {}; if (Buffer.byteLength(JSON.stringify(payload)) > 100_000) throw new ValidationError('mission step payload is too large'); assertNoSecrets(payload); const validation = step.validation || {}; assertNoSecrets(validation); if (definition.level === 'YELLOW' && !(validation.testsPassed === true && validation.risk === 'low' && validation.impactKnown === true)) throw new ValidationError(`yellow mission step ${key} requires passing tests, low risk and known impact`); return { key, type: step.type, definition, dependsOn: [...new Set((step.dependsOn || []).map(String))], payload, validation, contextRefs: normalizeRefs(step.contextRefs || []) }; }); }
function validateDag(steps) { const keys = new Set(steps.map((item) => item.key)); for (const step of steps) for (const dependency of step.dependsOn) if (!keys.has(dependency) || dependency === step.key) throw new ValidationError(`invalid dependency ${dependency} for ${step.key}`); const visiting = new Set(); const visited = new Set(); const byKey = new Map(steps.map((item) => [item.key, item])); const visit = (key) => { if (visiting.has(key)) throw new ValidationError('mission steps must form an acyclic graph'); if (visited.has(key)) return; visiting.add(key); for (const dependency of byKey.get(key).dependsOn) visit(dependency); visiting.delete(key); visited.add(key); }; for (const step of steps) visit(step.key); }
function normalizeRefs(input) { if (!Array.isArray(input) || input.length > 100) throw new ValidationError('contextRefs must be an array with at most 100 items'); return input.map((item) => { const type = String(item?.type || '').toUpperCase(); const ref = String(item?.ref || '').trim(); if (!['KG', 'MEMORY', 'TWIN', 'ARTIFACT', 'EVENT', 'HASH'].includes(type) || !/^[A-Za-z0-9:._/@-]{3,256}$/.test(ref)) throw new ValidationError('invalid structured context reference'); return { type, ref, hash: item.hash ? String(item.hash).slice(0, 128) : null }; }); }
function approvalResource(mission, step) { return { missionId: mission.id, stepId: step.id, stepType: step.type, jobType: step.jobType, payloadHash: step.payloadHash }; }
function progress(steps) { return steps.length ? Math.round((steps.filter((item) => item.status === 'SUCCEEDED').length / steps.length) * 100) : 0; }
function sumKnown(steps, key) { const values = steps.map((item) => item.metrics?.[key]).filter(Number.isFinite); return values.length ? Number(values.reduce((sum, value) => sum + value, 0).toFixed(key === 'costUsd' ? 6 : 0)) : null; }
function nullableNumber(value) { if (value == null) return null; const result = Number(value); if (!Number.isFinite(result) || result < 0) throw new ValidationError('mission policy budgets must be positive numbers'); return result; }
function normalizeDeadline(value) { if (value == null) return null; if (!Number.isFinite(Date.parse(value))) throw new ValidationError('mission policy deadline must be an ISO date'); return new Date(value).toISOString(); }
function finiteOrNull(value) { const result = Number(value); return Number.isFinite(result) ? result : null; }
function eventMetrics(metrics) { return { durationMs: metrics.durationMs, attempts: metrics.attempts, aiUnits: metrics.tokens, costUsd: metrics.costUsd }; }
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex'); }
function now() { return new Date().toISOString(); }

module.exports = { MissionKernel, MISSION_STEP_CATALOG, normalizeSteps, validateDag, normalizeRefs, approvalResource };
