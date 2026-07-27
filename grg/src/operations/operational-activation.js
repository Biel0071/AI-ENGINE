const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');

const COMPONENT_TIMEOUT_MS = 5_000;
const ASSURANCE_KINDS = new Set(['backup', 'restore', 'rollback', 'centralized-logs']);

class OperationalActivationService {
  constructor({ store, controlPlane, events, jobs, components, production = false, clock = Date }) {
    this.store = store; this.cp = controlPlane; this.events = events; this.jobs = jobs;
    this.components = components; this.production = production; this.clock = clock;
  }

  async boot(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    const run = { id: uuid(), tenantId, trigger: input.trigger || 'manual', status: 'RUNNING', requestedBy: actorId, startedAt: now() };
    await this.store.update((state) => { state.operationalActivationRuns.push(run); return state; });
    await this.#event(tenantId, 'operational.activation.started', run.id, { actorId, trigger: run.trigger, status: run.status });
    const definitions = await this.components(tenantId);
    const results = [];
    for (const definition of definitions) results.push(await this.#check(tenantId, actorId, run.id, definition));
    const blockers = results.filter((item) => item.critical && item.status !== 'ACTIVE');
    const status = blockers.length ? 'DEGRADED' : 'READY';
    const completedAt = now();
    await this.store.update((state) => { const current = state.operationalActivationRuns.find((item) => item.id === run.id); current.status = status; current.completedAt = completedAt; current.durationMs = Date.parse(completedAt) - Date.parse(current.startedAt); current.componentCount = results.length; current.blockers = blockers.map((item) => item.componentId); return state; });
    const readiness = await this.#readiness(tenantId, actorId, run.id, results);
    await this.#event(tenantId, 'operational.activation.completed', run.id, { actorId, status, blockers: blockers.map((item) => item.componentId), readinessReportId: readiness.id });
    return { run: await this.getRun(tenantId, actorId, run.id), components: results, readiness };
  }

  async #check(tenantId, actorId, runId, definition) {
    const started = this.clock.now(); let detail;
    try {
      detail = await withTimeout(Promise.resolve(definition.check()), COMPONENT_TIMEOUT_MS);
    } catch (error) {
      detail = { ok: false, error: String(error.message || error).slice(0, 1_000) };
    }
    try { assertNoSecrets(detail || {}); }
    catch { detail = { ok: false, configured: true, error: 'unsafe health probe output rejected', evidence: { code: 'SECRET_OUTPUT_REJECTED' } }; }
    const configured = detail?.configured !== false;
    const status = !configured ? 'UNCONFIGURED' : detail?.ok === false ? 'DEGRADED' : 'ACTIVE';
    const record = { id: uuid(), tenantId, runId, componentId: definition.id, label: definition.label || definition.id, state: status, status, version: String(detail?.version || definition.version || 'unknown'), dependencies: definition.dependencies || [], latencyMs: Math.max(0, this.clock.now() - started), availability: status === 'ACTIVE' ? 1 : 0, critical: definition.critical === true || (this.production && definition.productionCritical === true), lastHeartbeat: detail?.lastHeartbeat || null, evidence: detail?.evidence || {}, error: detail?.error || null, checkedAt: now() };
    await this.store.update((state) => {
      state.operationalComponentHistory.push(record);
      state.operationalComponentStates = state.operationalComponentStates.filter((item) => !(item.tenantId === tenantId && item.componentId === record.componentId));
      state.operationalComponentStates.push({ ...record, historyId: record.id });
      if (status === 'DEGRADED' || (record.critical && status !== 'ACTIVE')) upsertInvestigation(state, record, actorId);
      if (status === 'ACTIVE') resolveInvestigation(state, record);
      return state;
    });
    await this.#event(tenantId, 'operational.component.checked', `${runId}:${record.componentId}`, { actorId, runId, componentId: record.componentId, status, critical: record.critical, latencyMs: record.latencyMs, city: { district: 'operations', building: record.componentId } });
    return record;
  }

  async #readiness(tenantId, actorId, runId, components) {
    const state = await this.store.read();
    const openInvestigations = state.operationalInvestigations.filter((item) => item.tenantId === tenantId && item.status === 'OPEN');
    const required = components.filter((item) => item.critical); const failed = required.filter((item) => item.status !== 'ACTIVE');
    const report = { id: uuid(), tenantId, runId, status: failed.length ? 'NOT_READY' : 'READY', score: required.length ? Math.round(((required.length - failed.length) / required.length) * 100) : 100, checks: components.map((item) => ({ componentId: item.componentId, status: item.status, critical: item.critical, latencyMs: item.latencyMs, evidence: item.evidence })), blockers: failed.map((item) => ({ componentId: item.componentId, status: item.status, evidence: item.evidence, investigationId: openInvestigations.find((entry) => entry.componentId === item.componentId)?.id || null })), generatedBy: actorId, generatedAt: now() };
    await this.store.update((next) => { next.operationalReadinessReports.push(report); return next; });
    return report;
  }

  async recordAssurance(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'security:manage');
    if (!ASSURANCE_KINDS.has(input?.kind)) throw new ValidationError('unsupported operational assurance kind');
    if (!input?.evidence?.reference) throw new ValidationError('assurance evidence.reference is required');
    if (input.validUntil && !Number.isFinite(Date.parse(input.validUntil))) throw new ValidationError('assurance validUntil must be an ISO date');
    assertNoSecrets(input);
    const assurance = { id: uuid(), tenantId, kind: input.kind, status: input.status === 'failed' ? 'FAILED' : 'VERIFIED', evidence: input.evidence, validUntil: input.validUntil || null, recordedBy: actorId, recordedAt: now() };
    await this.store.update((state) => { state.operationalAssurances.push(assurance); return state; });
    await this.#event(tenantId, 'operational.assurance.recorded', assurance.id, { actorId, kind: assurance.kind, status: assurance.status });
    return assurance;
  }

  async dailyIntelligence(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const state = await this.store.read(); const date = input.date || now().slice(0, 10);
    const existing = state.dailyIntelligenceReports.find((item) => item.tenantId === tenantId && item.date === date);
    if (existing && input.force !== true) return existing;
    const scoped = (items) => items.filter((item) => item.tenantId === tenantId); const components = scoped(state.operationalComponentStates); const investigations = scoped(state.operationalInvestigations).filter((item) => item.status === 'OPEN'); const tasks = scoped(state.agentTasks); const aiCalls = scoped(state.aiCalls); const twins = scoped(state.digitalTwins).filter((item) => item.current); const projects = scoped(state.projects).length + scoped(state.repositories).length;
    const completed = tasks.filter((item) => item.status === 'SUCCEEDED').length; const failed = tasks.filter((item) => ['FAILED', 'BLOCKED'].includes(item.status)).length;
    const attention = components.filter((item) => item.status !== 'ACTIVE').map((item) => ({ componentId: item.componentId, status: item.status, evidence: [`component-history:${item.historyId}`] }));
    const suggestions = [];
    if (investigations.length) suggestions.push({ priority: 'high', action: 'Review open operational investigations', evidence: investigations.map((item) => `investigation:${item.id}`) });
    if (projects > twins.length) suggestions.push({ priority: 'medium', action: 'Complete Digital Twins for authorized systems', evidence: [`projects:${projects}`, `current-twins:${twins.length}`] });
    if (!suggestions.length) suggestions.push({ priority: 'low', action: 'Continue evidence collection and scheduled observation', evidence: [`activation:${state.operationalActivationRuns.filter((item) => item.tenantId === tenantId).at(-1)?.id || 'none'}`] });
    const report = { id: existing?.id || uuid(), tenantId, date, ecosystemStatus: attention.some((item) => components.find((component) => component.componentId === item.componentId)?.critical) ? 'DEGRADED' : 'HEALTHY', risks: investigations.map((item) => ({ title: item.title, componentId: item.componentId, evidence: item.evidence })), opportunities: suggestions, aiConsumption: { calls: aiCalls.length, tokens: aiCalls.reduce((sum, item) => sum + Number(item.totalTokens || 0), 0), costUsd: Number(aiCalls.reduce((sum, item) => sum + Number(item.costUsd || 0), 0).toFixed(6)) }, agentPerformance: { active: scoped(state.cognitiveAgents).filter((item) => item.status === 'ACTIVE').length, completed, failed, successRate: completed + failed ? completed / (completed + failed) : null }, projects: { discovered: projects, currentTwins: twins.length }, attention, evidence: [`component-states:${components.length}`, `open-investigations:${investigations.length}`, `agent-tasks:${tasks.length}`, `ai-calls:${aiCalls.length}`], generatedBy: actorId, generatedAt: now() };
    await this.store.update((next) => { next.dailyIntelligenceReports = next.dailyIntelligenceReports.filter((item) => !(item.tenantId === tenantId && item.date === date)); next.dailyIntelligenceReports.push(report); return next; });
    await this.#event(tenantId, 'operational.daily-intelligence.generated', report.id, { actorId, date, status: report.ecosystemStatus, risks: report.risks.length });
    return report;
  }

  async ensureSchedules(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin'); const state = await this.store.read(); const created = [];
    const specs = [{ type: 'operational.activation', intervalMs: Number(input.activationIntervalMs || 300_000), payload: { trigger: 'schedule' } }, { type: 'operational.daily-intelligence', intervalMs: Number(input.dailyIntervalMs || 86_400_000), payload: {} }];
    for (const spec of specs) if (!state.runtimeSchedules.some((item) => item.tenantId === tenantId && item.type === spec.type && item.enabled)) created.push(await this.jobs.schedule(tenantId, actorId, spec));
    return created;
  }

  async state(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); return { components: state.operationalComponentStates.filter((item) => item.tenantId === tenantId), investigations: state.operationalInvestigations.filter((item) => item.tenantId === tenantId && item.status === 'OPEN'), readiness: state.operationalReadinessReports.filter((item) => item.tenantId === tenantId).at(-1) || null, latestDaily: state.dailyIntelligenceReports.filter((item) => item.tenantId === tenantId).at(-1) || null }; }
  async history(tenantId, actorId, componentId = null) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); return state.operationalComponentHistory.filter((item) => item.tenantId === tenantId && (!componentId || item.componentId === componentId)); }
  async getRun(tenantId, actorId, runId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); const run = state.operationalActivationRuns.find((item) => item.tenantId === tenantId && item.id === runId); if (!run) throw new NotFoundError(`operational activation run not found: ${runId}`); return run; }
  async #event(tenantId, type, subject, data) { if (!this.events) return; await this.events.publish({ tenantId, stream: `operations:${subject}`, type, source: 'fenix-operational-activation', subject, data, idempotencyKey: `${type}:${subject}` }); }
}

function upsertInvestigation(state, component, actorId) {
  let item = state.operationalInvestigations.find((entry) => entry.tenantId === component.tenantId && entry.componentId === component.componentId && entry.status === 'OPEN');
  if (!item) { item = { id: uuid(), tenantId: component.tenantId, componentId: component.componentId, title: `Investigate degraded component: ${component.label}`, status: 'OPEN', severity: component.critical ? 'HIGH' : 'MEDIUM', evidence: [], openedBy: 'fenix-operational-activation', openedAt: now(), requestedBy: actorId }; state.operationalInvestigations.push(item); }
  item.lastSeenAt = now(); item.occurrences = Number(item.occurrences || 0) + 1; item.evidence.push({ reference: `component-history:${component.id}`, status: component.status, checkedAt: component.checkedAt });
}
function resolveInvestigation(state, component) { for (const item of state.operationalInvestigations.filter((entry) => entry.tenantId === component.tenantId && entry.componentId === component.componentId && entry.status === 'OPEN')) { item.status = 'RESOLVED'; item.resolvedAt = now(); item.resolutionEvidence = { reference: `component-history:${component.id}`, status: component.status }; } }
function currentAssurance(state, tenantId, kind) { return state.operationalAssurances.filter((item) => item.tenantId === tenantId && item.kind === kind && item.status === 'VERIFIED' && (!item.validUntil || Date.parse(item.validUntil) > Date.now())).at(-1) || null; }
function assuranceProbe(store, tenantId, kind) { return async () => { const state = await store.read(); const assurance = currentAssurance(state, tenantId, kind); return { ok: !!assurance, configured: true, evidence: assurance ? { assuranceId: assurance.id, reference: assurance.evidence.reference } : { reason: `no valid ${kind} evidence` } }; }; }
function withTimeout(promise, timeoutMs) { let timer; return Promise.race([promise.finally(() => clearTimeout(timer)), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('component health probe timed out')), timeoutMs); })]); }
function now() { return new Date().toISOString(); }

module.exports = { OperationalActivationService, ASSURANCE_KINDS, assuranceProbe, currentAssurance };
