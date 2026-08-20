const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError, ForbiddenError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');
const { Job, InvalidStateTransitionError } = require('./mission-schema');

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
  constructor(options = {}) {
    this.store = options.store || null;
    this.cp = options.controlPlane || null;
    this.hierarchy = options.hierarchy || null;
    this.missions = options.missions || null;
    this.events = options.events || null;
    this.router = options.router || null;
    this.estimator = options.estimator || null;
  }

  async plan(tenantIdOrMission, actorId, input = {}) {
    // If called with a Mission instance (DAG planning mode)
    if (tenantIdOrMission && typeof tenantIdOrMission === 'object' && tenantIdOrMission.state) {
      const mission = tenantIdOrMission;
      if (mission.state !== 'ANALYZED') {
        throw new InvalidStateTransitionError(mission.id, mission.state, 'PLANNED');
      }
      const intent = mission.intent || {};
      let planData = { objective: intent.type || 'generic', dependencies: [], risks: [], plan: [], validation: [] };
      if (this.router && this.router.isAvailable('architecture')) {
        try {
          const result = await this.router.execute('architecture', {
            prompt: `Create a DAG execution plan for this objective: ${intent.type}. Output in JSON format containing: objective, dependencies, risks, plan (array of jobs), validation.`
          });
          if (result) planData = typeof result === 'string' ? JSON.parse(result) : result;
        } catch (err) {
          console.warn('[MissionPlanner] LLM planning failed, falling back to heuristic:', err.message);
        }
      }
      const jobs = [];
      const architectJob = new Job({ missionId: mission.id, worker: 'Architect', payload: { action: 'design' }});
      jobs.push(architectJob);
      const databaseJob = new Job({ missionId: mission.id, worker: 'Database', dependencies: [architectJob.id] });
      jobs.push(databaseJob);
      const backendJob = new Job({ missionId: mission.id, worker: 'Backend', dependencies: [databaseJob.id] });
      jobs.push(backendJob);
      const frontendJob = new Job({ missionId: mission.id, worker: 'Frontend', dependencies: [backendJob.id] });
      jobs.push(frontendJob);
      const devOpsJob = new Job({ missionId: mission.id, worker: 'DevOps', dependencies: [frontendJob.id] });
      jobs.push(devOpsJob);
      const qaJob = new Job({ missionId: mission.id, worker: 'QA', dependencies: [devOpsJob.id] });
      jobs.push(qaJob);
      const securityJob = new Job({ missionId: mission.id, worker: 'Security', dependencies: [qaJob.id] });
      jobs.push(securityJob);
      const docJob = new Job({ missionId: mission.id, worker: 'Documentation', dependencies: [securityJob.id] });
      jobs.push(docJob);
      const deployJob = new Job({ missionId: mission.id, worker: 'Deploy', dependencies: [docJob.id] });
      jobs.push(deployJob);
      mission.jobs = jobs;
      mission.planData = planData;
      mission.transitionTo('PLANNED');
      if (this.estimator) {
        mission.estimate = await this.estimator.estimate(mission);
        mission.transitionTo('ESTIMATED');
      }
      return mission;
    }

    // Governed tenant/actor plan mode (MasterAvatar / ExecutiveBrain)
    const tenantId = tenantIdOrMission;
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    assertNoSecrets({ context: input.context || {}, contextRefs: input.contextRefs || [] });
    if (input.scopeId && this.hierarchy) await this.hierarchy.authorizeScope(tenantId, actorId, input.scopeId, 'write');
    else if (this.cp) {
      const membership = await this.cp.getMembership(tenantId, actorId);
      if (!['admin', 'master_admin'].includes(membership.role)) throw new ForbiddenError('global mission plans require an administrator');
    }
    const objective = String(input.objective || input.message || '').trim();
    if (!objective || objective.length > 4_000) throw new ValidationError('mission objective is required and must contain at most 4000 characters');
    const mode = normalizeMode(input.mode, objective);
    const steps = buildSteps(mode, objective, { ...(input.context || {}), scopeId: input.scopeId || input.context?.scopeId });
    const questions = missingInputs(steps);
    const totals = steps.reduce((sum, step) => {
      const estimate = ESTIMATES[step.type] || { durationMs: 30000, tokens: 1000, costUsd: 0.005, risk: 'LOW' };
      sum.durationMs += estimate.durationMs; sum.tokens += estimate.tokens; sum.costUsd += estimate.costUsd;
      if (estimate.risk === 'HIGH') sum.risk = 'HIGH'; return sum;
    }, { durationMs: 0, tokens: 0, costUsd: 0, risk: 'LOW' });
    totals.costUsd = Number(totals.costUsd.toFixed(6));
    const plan = {
      id: uuid(), tenantId, scopeId: input.scopeId || null, objectiveHash: hash(objective),
      mode, status: questions.length ? 'NEEDS_INPUT' : 'READY',
      steps: steps.map((step) => ({ key: step.key, type: step.type, dependsOn: step.dependsOn, estimate: ESTIMATES[step.type] || { durationMs: 30000, tokens: 1000, costUsd: 0.005, risk: 'LOW' } })),
      estimates: totals, risk: totals.risk, questions, requestedBy: actorId, createdAt: now()
    };
    if (this.store) {
      await this.store.update((state) => {
        if (!state.missionPlans) state.missionPlans = [];
        state.missionPlans.push(plan);
        return state;
      });
    }
    if (this.events) {
      await this.events.publish({
        tenantId, stream: `mission-plan:${plan.id}`, type: 'mission.plan.created', source: 'fenix-mission-planner', subject: plan.id,
        data: { actorId, planId: plan.id, mode, status: plan.status, stepCount: steps.length, objectiveHash: plan.objectiveHash, estimates: { durationMs: totals.durationMs, aiUnits: totals.tokens, costUsd: totals.costUsd }, risk: totals.risk },
        idempotencyKey: `mission.plan.created:${plan.id}`
      });
    }
    if (questions.length) return { plan, mission: null };
    const policy = { maxTokens: input.policy?.maxTokens ?? Math.ceil(totals.tokens * 1.25), maxCostUsd: input.policy?.maxCostUsd ?? Number((totals.costUsd * 1.25).toFixed(6)), deadline: input.policy?.deadline };
    let mission = null;
    if (this.missions) {
      mission = await this.missions.create(tenantId, actorId, { title: String(input.title || objective).slice(0, 200), objective, scopeId: input.scopeId, priority: input.priority, policy, contextRefs: input.contextRefs || [], steps });
      if (this.store) {
        await this.store.update((state) => {
          const current = (state.missionPlans || []).find((item) => item.id === plan.id);
          if (current) {
            current.status = 'MATERIALIZED';
            current.missionId = mission.id;
            current.materializedAt = now();
          }
          return state;
        });
      }
      if (input.autoStart !== false) {
        mission = await this.missions.start(tenantId, actorId, mission.id);
      }
    }
    return { plan: { ...plan, status: 'MATERIALIZED', missionId: mission?.id || null }, mission };
  }

  async list(tenantId, actorId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const accessible = this.hierarchy ? await this.hierarchy.accessibleIds(tenantId, actorId, 'read') : null;
    const state = this.store ? await this.store.read() : { missionPlans: [] };
    return (state.missionPlans || []).filter((item) => item.tenantId === tenantId && (accessible === null || (item.scopeId && accessible.has(item.scopeId))));
  }
}

function buildSteps(mode, objective, context) {
  if (mode === 'OPERATE') return [{ key: 'health', type: 'activate', dependsOn: [], payload: { trigger: 'mission' } }, { key: 'report', type: 'daily-intelligence', dependsOn: ['health'], payload: {} }];
  if (mode === 'OBSERVE') return [{ key: 'observe', type: 'agent-observe', dependsOn: [], payload: {} }, { key: 'analyze', type: 'analyze', dependsOn: ['observe'], payload: {} }];
  if (mode === 'BUILD') return [{ key: 'discover', type: 'discover', dependsOn: [], payload: {} }, { key: 'design', type: 'analyze', dependsOn: ['discover'], payload: {} }, { key: 'generate', type: 'generate', dependsOn: ['design'], payload: { prompt: objective, name: context.name || objective.slice(0, 80) } }];
  return [{ key: 'discover', type: 'discover', dependsOn: [], payload: {} }, { key: 'inspect', type: 'inspect', dependsOn: ['discover'], payload: { workspacePath: context.workspacePath, repositoryId: context.repositoryId, scopeId: context.scopeId } }, { key: 'analyze', type: 'analyze', dependsOn: ['inspect'], payload: {} }];
}
function missingInputs(steps) { return steps.some((step) => step.type === 'inspect' && !step.payload.workspacePath) ? [{ field: 'context.workspacePath', question: 'Qual workspace autorizado deve ser inspecionado?' }] : []; }
function inferMode(value) { const text = value.toLowerCase(); if (/\b(criar|construir|gerar|novo sistema|new system|build)\b/.test(text)) return 'BUILD'; if (/\b(sa[uú]de|status|operar|health|readiness)\b/.test(text)) return 'OPERATE'; if (/\b(observar|monitorar|acompanhar|observe|monitor)\b/.test(text)) return 'OBSERVE'; return 'INSPECT'; }
function normalizeMode(value, objective = '') {
  const mode = String(value || '').toUpperCase();
  if (!mode || mode === 'UNIFIED' || mode === 'AUTO') return inferMode(objective);
  if (!['INSPECT', 'OPERATE', 'OBSERVE', 'BUILD'].includes(mode)) throw new ValidationError(`unsupported mission planning mode: ${mode}`);
  return mode;
}
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function now() { return new Date().toISOString(); }

module.exports = { MissionPlanner, ESTIMATES, inferMode, normalizeMode, buildSteps, missingInputs };
