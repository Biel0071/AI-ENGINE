const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError, ForbiddenError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');

const ESTIMATES = Object.freeze({
  discover: { durationMs: 30_000, tokens: 0, costUsd: 0, risk: 'LOW' },
  inspect: { durationMs: 180_000, tokens: 2_000, costUsd: 0.01, risk: 'LOW' },
  analyze: { durationMs: 90_000, tokens: 4_000, costUsd: 0.02, risk: 'LOW' },
  'agent-observe': { durationMs: 45_000, tokens: 1_000, costUsd: 0.005, risk: 'LOW' },
  activate: { durationMs: 60_000, tokens: 0, costUsd: 0, risk: 'LOW' },
  'daily-intelligence': { durationMs: 45_000, tokens: 1_500, costUsd: 0.008, risk: 'LOW' },
  generate: { durationMs: 600_000, tokens: 20_000, costUsd: 0.1, risk: 'HIGH' },
});

class MissionPlanner {
  constructor({ store, controlPlane, hierarchy, missions, events }) { this.store = store; this.cp = controlPlane; this.hierarchy = hierarchy; this.missions = missions; this.events = events; }

  async plan(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute'); assertNoSecrets({ context: input.context || {}, contextRefs: input.contextRefs || [] });
    if (input.scopeId && this.hierarchy) await this.hierarchy.authorizeScope(tenantId, actorId, input.scopeId, 'write');
    else { const membership = await this.cp.getMembership(tenantId, actorId); if (!['admin', 'master_admin'].includes(membership.role)) throw new ForbiddenError('global mission plans require an administrator'); }
    const objective = String(input.objective || input.message || '').trim(); if (!objective || objective.length > 4_000) throw new ValidationError('mission objective is required and must contain at most 4000 characters');
    const mode = normalizeMode(input.mode || inferMode(objective)); const steps = buildSteps(mode, objective, { ...(input.context || {}), scopeId: input.scopeId || input.context?.scopeId }); const questions = missingInputs(steps);
    const totals = steps.reduce((sum, step) => { const estimate = ESTIMATES[step.type]; sum.durationMs += estimate.durationMs; sum.tokens += estimate.tokens; sum.costUsd += estimate.costUsd; if (estimate.risk === 'HIGH') sum.risk = 'HIGH'; return sum; }, { durationMs: 0, tokens: 0, costUsd: 0, risk: 'LOW' });
    totals.costUsd = Number(totals.costUsd.toFixed(6)); const plan = { id: uuid(), tenantId, scopeId: input.scopeId || null, objectiveHash: hash(objective), mode, status: questions.length ? 'NEEDS_INPUT' : 'READY', steps: steps.map((step) => ({ key: step.key, type: step.type, dependsOn: step.dependsOn, estimate: ESTIMATES[step.type] })), estimates: totals, risk: totals.risk, questions, requestedBy: actorId, createdAt: now() };
    await this.store.update((state) => { state.missionPlans.push(plan); return state; });
    if (this.events) await this.events.publish({ tenantId, stream: `mission-plan:${plan.id}`, type: 'mission.plan.created', source: 'fenix-mission-planner', subject: plan.id, data: { actorId, planId: plan.id, mode, status: plan.status, stepCount: steps.length, objectiveHash: plan.objectiveHash, estimates: { durationMs: totals.durationMs, aiUnits: totals.tokens, costUsd: totals.costUsd }, risk: totals.risk }, idempotencyKey: `mission.plan.created:${plan.id}` });
    if (questions.length) return { plan, mission: null };
    const policy = { maxTokens: input.policy?.maxTokens ?? Math.ceil(totals.tokens * 1.25), maxCostUsd: input.policy?.maxCostUsd ?? Number((totals.costUsd * 1.25).toFixed(6)), deadline: input.policy?.deadline };
    const mission = await this.missions.create(tenantId, actorId, { title: String(input.title || objective).slice(0, 200), objective, scopeId: input.scopeId, priority: input.priority, policy, contextRefs: input.contextRefs || [], steps });
    await this.store.update((state) => { const current = state.missionPlans.find((item) => item.id === plan.id); current.status = 'MATERIALIZED'; current.missionId = mission.id; current.materializedAt = now(); return state; });
    const started = input.autoStart === true ? await this.missions.start(tenantId, actorId, mission.id) : mission;
    return { plan: { ...plan, status: 'MATERIALIZED', missionId: mission.id }, mission: started };
  }

  async list(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const accessible = this.hierarchy ? await this.hierarchy.accessibleIds(tenantId, actorId, 'read') : null; const state = await this.store.read(); return state.missionPlans.filter((item) => item.tenantId === tenantId && (accessible === null || (item.scopeId && accessible.has(item.scopeId)))); }
}

function buildSteps(mode, objective, context) {
  if (mode === 'OPERATE') return [{ key: 'health', type: 'activate', dependsOn: [], payload: { trigger: 'mission' } }, { key: 'report', type: 'daily-intelligence', dependsOn: ['health'], payload: {} }];
  if (mode === 'OBSERVE') return [{ key: 'observe', type: 'agent-observe', dependsOn: [], payload: {} }, { key: 'analyze', type: 'analyze', dependsOn: ['observe'], payload: {} }];
  if (mode === 'BUILD') return [{ key: 'discover', type: 'discover', dependsOn: [], payload: {} }, { key: 'design', type: 'analyze', dependsOn: ['discover'], payload: {} }, { key: 'generate', type: 'generate', dependsOn: ['design'], payload: { prompt: objective, name: context.name || objective.slice(0, 80) } }];
  return [{ key: 'discover', type: 'discover', dependsOn: [], payload: {} }, { key: 'inspect', type: 'inspect', dependsOn: ['discover'], payload: { workspacePath: context.workspacePath, repositoryId: context.repositoryId, scopeId: context.scopeId } }, { key: 'analyze', type: 'analyze', dependsOn: ['inspect'], payload: {} }];
}
function missingInputs(steps) { return steps.some((step) => step.type === 'inspect' && !step.payload.workspacePath) ? [{ field: 'context.workspacePath', question: 'Qual workspace autorizado deve ser inspecionado?' }] : []; }
function inferMode(value) { const text = value.toLowerCase(); if (/\b(criar|construir|gerar|novo sistema|new system|build)\b/.test(text)) return 'BUILD'; if (/\b(sa[uú]de|status|operar|health|readiness)\b/.test(text)) return 'OPERATE'; if (/\b(observar|monitorar|acompanhar|observe|monitor)\b/.test(text)) return 'OBSERVE'; return 'INSPECT'; }
function normalizeMode(value) { const mode = String(value).toUpperCase(); if (!['INSPECT', 'OPERATE', 'OBSERVE', 'BUILD'].includes(mode)) throw new ValidationError(`unsupported mission planning mode: ${mode}`); return mode; }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function now() { return new Date().toISOString(); }

module.exports = { MissionPlanner, ESTIMATES, inferMode, normalizeMode, buildSteps, missingInputs };
