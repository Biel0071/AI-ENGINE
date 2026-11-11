'use strict';
// Fase 1 (2026-11-11): Fênix Diretor + fila de aprovação.
// O dono dá UMA ordem; o diretor monta a missão com etapas por agente (catálogo governado do
// MissionKernel) e a inicia. Etapas RED (mudar código, publicar) param em AWAITING_APPROVAL.
// Quem PEDE é o ator de sistema `fenix-director`; quem APROVA é o humano — a política
// `mission.step.red` exige aprovador diferente de quem pediu. O diretor não tem senha nem token.
const { ValidationError, NotFoundError } = require('../kernel/errors');

const DIRECTOR_ACTOR = 'fenix-director';
const ORDER_KINDS = ['analysis', 'change', 'deploy'];
const MAX_ORDER_CHARS = 4000;

// Plano por tipo de ordem. Cada etapa vai para um agente diferente (definido pelo catálogo).
const PLANS = {
  analysis: [{ key: 'inspect', type: 'inspect' }, { key: 'analyze', type: 'analyze', dependsOn: ['inspect'] }],
  change: [{ key: 'inspect', type: 'inspect' }, { key: 'implement', type: 'dev-execute', dependsOn: ['inspect'] }],
  deploy: [{ key: 'inspect', type: 'inspect' }, { key: 'deploy', type: 'orchestrate', dependsOn: ['inspect'] }],
};

const APPROVAL_REASONS = {
  'dev-execute': 'Muda código do projeto: precisa da sua aprovação antes de rodar.',
  generate: 'Gera código novo: precisa da sua aprovação antes de rodar.',
  orchestrate: 'Publica/implanta (deploy) — operação irreversível: precisa da sua aprovação.',
};

function inferKind(order) {
  const text = String(order || '').toLowerCase();
  if (/\b(deploy|publi(que|car)|implant(e|ar)|subir? (na|para) (vps|produ))/.test(text)) return 'deploy';
  if (/\b(corrij|corrigir|implement|crie|criar|alter|refator|adicion|remov|mude|mudar|ajust|fix)/.test(text)) return 'change';
  return 'analysis';
}

class FenixDirector {
  constructor({ store, controlPlane, missions, approvals, jobs, bus = null, resolveWorkspace }) {
    this.store = store;
    this.cp = controlPlane;
    this.missions = missions;
    this.approvals = approvals;
    this.jobs = jobs;
    this.bus = bus;
    this.resolveWorkspace = resolveWorkspace;
  }

  // Garante o vínculo do ator de sistema (papel system_agent: executa missões, não administra).
  async ensureActor(tenantId) {
    await this.store.update((state) => {
      if (!state.users.some((u) => u.id === DIRECTOR_ACTOR)) {
        state.users.push({ id: DIRECTOR_ACTOR, name: 'Fênix Diretor', status: 'active', system: true, createdAt: new Date().toISOString() });
      }
      if (!state.memberships.some((m) => m.tenantId === tenantId && m.userId === DIRECTOR_ACTOR)) {
        state.memberships.push({ tenantId, userId: DIRECTOR_ACTOR, role: 'system_agent', status: 'active', createdAt: new Date().toISOString() });
      }
      return state;
    });
  }

  async submitOrder(cx, { order, kind = null, projectId = 'fenix-os', priority = 0 } = {}) {
    if (cx?.aiClient) throw new ValidationError('orders come from a human');
    await this.cp.authorize(cx.tenantId, cx.actorId, 'runtime:execute');
    const text = String(order || '').trim();
    if (!text) throw new ValidationError('order is required');
    if (text.length > MAX_ORDER_CHARS) throw new ValidationError(`order is longer than ${MAX_ORDER_CHARS} characters`);
    const chosen = kind ? String(kind).toLowerCase() : inferKind(text);
    if (!ORDER_KINDS.includes(chosen)) throw new ValidationError(`kind must be one of ${ORDER_KINDS.join(', ')}`);
    const project = await this.resolveWorkspace(cx.tenantId, cx.actorId, projectId);
    await this.ensureActor(cx.tenantId);
    const payload = {
      prompt: text, projectId: project.project.id, projectPath: project.workspace, workspacePath: project.workspace,
      context: { projectId: project.project.id, orderedBy: cx.actorId, requestSource: 'director' },
    };
    const mission = await this.missions.create(cx.tenantId, DIRECTOR_ACTOR, {
      title: text.length > 200 ? `${text.slice(0, 197)}...` : text,
      objective: text,
      projectId: project.project.id,
      priority,
      contextRefs: [{ type: 'MEMORY', ref: `director-order:${cx.actorId}` }],
      steps: PLANS[chosen].map((step) => ({ ...step, payload })),
    });
    // Iniciar a missao faz dezenas de gravacoes em sequencia no store de documento unico (6-12 s
    // medidos em 2026-11-11). A ordem responde 202 assim que a missao existe; o inicio segue em
    // segundo plano e, se falhar, vira evento visivel (nunca sucesso silencioso).
    this.lastStart = this.missions.start(cx.tenantId, DIRECTOR_ACTOR, mission.id).catch(async (error) => {
      await this.bus?.emit?.('director.start_failed', { tenantId: cx.tenantId, missionId: mission.id, error: String(error.message || error).slice(0, 300) });
    });
    await this.bus?.emit?.('director.order', { tenantId: cx.tenantId, missionId: mission.id, kind: chosen, orderedBy: cx.actorId });
    const approvalRequired = (mission.steps || []).some((s) => ['generate', 'dev-execute', 'orchestrate'].includes(s.type));
    return { kind: chosen, orderedBy: cx.actorId, approvalRequired, starting: true, mission };
  }

  // Fila "precisa de você" + histórico de decisões. Tudo vem do store (sem número fixo).
  async approvalQueue(cx, { historyLimit = 20 } = {}) {
    await this.cp.authorize(cx.tenantId, cx.actorId, 'runtime:read');
    const state = await this.store.read();
    const missionsById = new Map(state.missions.filter((m) => m.tenantId === cx.tenantId).map((m) => [m.id, m]));
    const approvalsById = new Map((state.approvalRequests || []).filter((a) => a.tenantId === cx.tenantId).map((a) => [a.id, a]));
    const queue = state.missionSteps.filter((s) => s.tenantId === cx.tenantId && s.status === 'AWAITING_APPROVAL').map((step) => {
      const mission = missionsById.get(step.missionId) || {};
      const approval = approvalsById.get(step.approvalId) || {};
      return {
        missionId: step.missionId, missionTitle: mission.displayName || mission.title || null, projectId: mission.projectId || null,
        stepId: step.id, stepKey: step.key, stepType: step.type, agent: step.agent, level: step.policyLevel, building: step.building || null,
        approvalId: step.approvalId || null, approvalStatus: approval.status || null, requestedBy: approval.requestedBy || mission.requestedBy || null,
        orderedBy: (step.payload?.context?.orderedBy) || null,
        reason: APPROVAL_REASONS[step.type] || 'Etapa de risco alto: precisa da sua aprovação.',
        expiresAt: approval.expiresAt || null, requestedAt: approval.createdAt || step.updatedAt || null,
        objective: mission.objective ? String(mission.objective).slice(0, 400) : null,
      };
    }).sort((a, b) => String(a.requestedAt).localeCompare(String(b.requestedAt)));
    const history = (state.approvalRequests || [])
      // Aprovado vira 'consumed' quando o job da etapa e liberado: continua sendo uma aprovacao.
      .filter((a) => a.tenantId === cx.tenantId && a.action === 'mission.step.red' && ['approved', 'consumed', 'rejected'].includes(a.status))
      .map((a) => ({
        approvalId: a.id, missionId: a.resource?.missionId || null, stepId: a.resource?.stepId || null,
        missionTitle: missionsById.get(a.resource?.missionId)?.displayName || missionsById.get(a.resource?.missionId)?.title || null,
        decision: a.status === 'rejected' ? 'rejected' : 'approved', decidedBy: a.status === 'rejected' ? a.rejectedBy : a.approvedBy,
        decidedAt: a.status === 'rejected' ? a.rejectedAt : a.approvedAt, reason: a.rejectionReason || null,
      }))
      .sort((a, b) => String(b.decidedAt).localeCompare(String(a.decidedAt)))
      .slice(0, Math.min(100, Number(historyLimit) || 20));
    return { queue, history, counts: { waiting: queue.length } };
  }

  // Decisão do dono: approve | reject | revise (cancela esta versão e cria outra com o feedback).
  async decide(cx, { missionId, stepId, decision, reason = null } = {}) {
    if (cx?.aiClient) throw new ValidationError('only a human decides approvals');
    const choice = String(decision || '').toLowerCase();
    if (!['approve', 'reject', 'revise'].includes(choice)) throw new ValidationError('decision must be approve, reject or revise');
    const state = await this.store.read();
    const step = state.missionSteps.find((s) => s.tenantId === cx.tenantId && s.id === stepId && s.missionId === missionId);
    if (!step) throw new NotFoundError('mission step not found');
    if (step.status !== 'AWAITING_APPROVAL' || !step.approvalId) throw new ValidationError(`step is ${step.status}, not awaiting approval`);
    if (choice === 'approve') {
      const mission = await this.missions.approveStep(cx.tenantId, cx.actorId, missionId, stepId, step.approvalId);
      return { decision: 'approved', mission };
    }
    const note = String(reason || '').trim().slice(0, 500);
    if (choice === 'revise' && !note) throw new ValidationError('say what should change in the revision');
    await this.approvals.reject(cx.tenantId, cx.actorId, step.approvalId, choice === 'revise' ? `Revisão pedida: ${note}` : (note || null));
    const cancelled = await this.missions.cancel(cx.tenantId, cx.actorId, missionId);
    if (choice === 'reject') return { decision: 'rejected', mission: cancelled };
    const previous = state.missions.find((m) => m.id === missionId);
    const kind = Object.entries(PLANS).find(([, plan]) => plan.some((p) => p.type === step.type))?.[0] || 'change';
    const revised = await this.submitOrder(cx, {
      order: `${previous?.objective || ''}\n\nRevisão pedida pelo dono: ${note}`.trim(),
      kind, projectId: previous?.projectId || 'fenix-os', priority: previous?.priority || 0,
    });
    return { decision: 'revision_requested', mission: cancelled, revision: revised.mission };
  }
}

module.exports = { FenixDirector, DIRECTOR_ACTOR, ORDER_KINDS, inferKind };