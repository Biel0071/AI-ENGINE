'use strict';

const { uuid } = require('../kernel/ids');
const { measured, unknown } = require('../kernel/measurement');
const { PROGRAM_STATES, assertPlannerContract } = require('./executive-contract');

// EXECUTIVE BRAIN — implementação real (não mais contrato).
//
// Decompõe um objetivo estratégico em um PROGRAMA de missões e DELEGA cada missão ao
// mission-planner existente. ORQUESTRA, nunca EXECUTA IA — não há invoke/complete/chat aqui
// (o contrato proíbe e o teste trava). O Gateway executa; o Brain decide o quê e em que ordem.
//
// A DISCIPLINA que molda esta implementação (Regra 2 / REALITY FIRST): os números que o
// Brain reporta — quantas missões, progresso, custo — são CONTADOS do que de fato existe,
// nunca inventados. Um "Criar CRM" gera o número real de missões do template (6), não um
// "27 missões, 143 jobs" impressionante e falso. Progresso é média medida do estado das
// missões reais; custo vem de aiCalls; qualidade é unknown honesto até haver sinal.

// Decomposição por TEMPLATE: determinística, auditável, não mente. Cada objetivo conhecido
// mapeia para um conjunto declarado de missões, cada uma com seu modo de planejamento. A
// versão AI-driven (o Brain pede a decomposição ao Router) é o degrau seguinte; começa aqui
// com o que é verificável. Um objetivo não-reconhecido cai no template genérico (inspect).
const PROGRAM_TEMPLATES = Object.freeze({
  BUILD_APP: {
    match: /\b(erp|crm|saas|sistema|app|plataforma|marketplace|site|landing|api)\b/i,
    missions: [
      { key: 'architecture', mode: 'INSPECT', objective: (o) => `Arquitetura: ${o}` },
      { key: 'backend', mode: 'BUILD', objective: (o) => `Backend: ${o}` },
      { key: 'frontend', mode: 'BUILD', objective: (o) => `Frontend: ${o}` },
      { key: 'database', mode: 'BUILD', objective: (o) => `Banco de dados: ${o}` },
      { key: 'tests', mode: 'OBSERVE', objective: (o) => `Testes: ${o}` },
      { key: 'deploy', mode: 'OPERATE', objective: (o) => `Deploy e validação: ${o}` },
    ],
  },
  OPERATE: {
    match: /\b(sa[uú]de|status|operar|monitorar|health|readiness|deploy)\b/i,
    missions: [
      { key: 'health', mode: 'OPERATE', objective: (o) => `Saúde: ${o}` },
      { key: 'observe', mode: 'OBSERVE', objective: (o) => `Observação: ${o}` },
    ],
  },
});
const GENERIC_TEMPLATE = {
  missions: [{ key: 'inspect', mode: 'INSPECT', objective: (o) => o }],
};

class ExecutiveBrain {
  constructor({ store, bus = null, controlPlane, missionPlanner }) {
    assertPlannerContract(missionPlanner);
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.planner = missionPlanner;
  }

  #template(objective) {
    for (const tpl of Object.values(PROGRAM_TEMPLATES)) if (tpl.match.test(objective)) return tpl;
    return GENERIC_TEMPLATE;
  }

  // DECOMPÕE: objetivo -> lista de missões PROPOSTAS. Não materializa nada, não executa IA.
  // Devolve a contagem REAL do template — o número é verdadeiro, não impressionante.
  async decompose(tenantId, actorId, objective) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const obj = String(objective || '').trim();
    if (!obj) throw new Error('objective is required to decompose');
    const tpl = this.#template(obj);
    const missions = tpl.missions.map((m) => ({ key: m.key, mode: m.mode, objective: m.objective(obj) }));
    return {
      objective: obj,
      missions,
      missionCount: measured(missions.length, 'derived:template decomposition'),
      // Honesto: jobs por missão só existem depois de materializada (o planner os cria).
      // Não invento "143 jobs" — declaro que a contagem só existe pós-materialização.
      jobCount: unknown('jobs are created by the planner at approval time, not at decomposition'),
    };
  }

  // CRIA o Programa em DRAFT. Persiste as missões PROPOSTAS (não materializadas). Aprovação
  // humana é obrigatória para materializar — o Brain não promove sozinho.
  async createProgram(tenantId, actorId, objective) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const decomposition = await this.decompose(tenantId, actorId, objective);
    const program = {
      id: uuid(),
      tenantId,
      objective: decomposition.objective,
      state: PROGRAM_STATES.DRAFT,
      missions: decomposition.missions.map((m) => ({ key: m.key, mode: m.mode, objective: m.objective, missionId: null, status: 'PROPOSED' })),
      createdBy: actorId,
      createdAt: new Date().toISOString(),
    };
    await this.store.update((state) => { (state.programs = state.programs || []).push(program); return state; });
    if (this.bus?.emit) await this.bus.emit('program.created', { tenantId, programId: program.id, missions: program.missions.length });
    return program;
  }

  // APROVA: materializa cada missão proposta via o mission-planner REAL. É aqui que o
  // objetivo vira missões executáveis — e cada plan() cria jobs, artefatos, etc. pela RC1.
  async approve(tenantId, actorId, programId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const program = await this.#program(tenantId, programId);
    if (program.state !== PROGRAM_STATES.DRAFT) throw new Error(`program cannot be approved from ${program.state}`);

    const materialized = [];
    for (const m of program.missions) {
      // Delega ao planner existente. autoStart:false — aprovar o programa não dispara
      // execução cega; o scheduler/humano inicia. plan() pode devolver NEEDS_INPUT.
      const result = await this.planner.plan(tenantId, actorId, { objective: m.objective, mode: m.mode, autoStart: false });
      materialized.push({ key: m.key, missionId: result.mission?.id || null, planStatus: result.plan?.status || 'UNKNOWN' });
    }

    await this.store.update((state) => {
      const p = state.programs.find((item) => item.id === programId);
      p.state = PROGRAM_STATES.APPROVED;
      p.approvedBy = actorId; p.approvedAt = new Date().toISOString();
      for (const mat of materialized) {
        const mm = p.missions.find((item) => item.key === mat.key);
        if (mm) { mm.missionId = mat.missionId; mm.status = mat.planStatus; }
      }
      return state;
    });
    if (this.bus?.emit) await this.bus.emit('program.approved', { tenantId, programId, materialized: materialized.length });
    return this.#program(tenantId, programId);
  }

  // Ordena as missões do programa por prioridade declarada (não executa nada).
  async prioritize(tenantId, actorId, programId, order = []) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    await this.store.update((state) => {
      const p = state.programs.find((item) => item.id === programId && item.tenantId === tenantId);
      if (p && order.length) p.missions.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
      return state;
    });
    return this.#program(tenantId, programId);
  }

  // Repropõe uma missão travada — repropõe, não executa. Marca para reaprovação humana.
  async replan(tenantId, actorId, programId, missionKey) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const program = await this.#program(tenantId, programId);
    const m = program.missions.find((item) => item.key === missionKey);
    if (!m) throw new Error(`program ${programId} has no mission ${missionKey}`);
    await this.store.update((state) => {
      const p = state.programs.find((item) => item.id === programId);
      const mm = p.missions.find((item) => item.key === missionKey);
      mm.status = 'PROPOSED'; mm.missionId = null; mm.replannedAt = new Date().toISOString();
      p.state = PROGRAM_STATES.DRAFT; // volta a exigir aprovação
      return state;
    });
    return this.#program(tenantId, programId);
  }

  // DETECTA bloqueios: lê o estado REAL das missões materializadas. Nada declarado.
  async detectBlocks(tenantId, actorId, programId) {
    const status = await this.status(tenantId, actorId, programId);
    return { programId, blocked: status.blocked, blockedMissions: status.blockedMissions };
  }

  // PROGRESSO: agregação MEDIDA do progresso das missões reais. unknown se nada materializado.
  async progress(tenantId, actorId, programId) {
    const s = await this.status(tenantId, actorId, programId);
    return s.progress;
  }

  // CUSTO: soma do custo real das missões (de aiCalls por missão). unknown se não medível.
  async costs(tenantId, actorId, programId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const program = await this.#program(tenantId, programId);
    const state = await this.store.read();
    const ids = program.missions.map((m) => m.missionId).filter(Boolean);
    if (!ids.length) return { costUsd: unknown('no mission materialized yet') };
    const calls = (state.aiCalls || []).filter((c) => c.tenantId === tenantId && ids.includes(c.missionId));
    if (!calls.length) return { costUsd: unknown('no AI call recorded for this program yet') };
    return { costUsd: measured(Number(calls.reduce((s2, c) => s2 + Number(c.costUsd || 0), 0).toFixed(6)), 'derived:aiCalls.costUsd by program missions') };
  }

  // QUALIDADE: honesto — não há sinal de resultado por missão ainda. unknown, nunca score falso.
  async quality(tenantId, actorId, programId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    await this.#program(tenantId, programId);
    return { quality: unknown('mission outcome quality is not scored yet', 'record a success/failure signal per mission to derive quality') };
  }

  // Pede aprovação humana — abre o pedido, nunca decide. (Composição futura com approval-engine.)
  async requestApproval(tenantId, actorId, programId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const program = await this.#program(tenantId, programId);
    if (this.bus?.emit) await this.bus.emit('program.approval.requested', { tenantId, programId, missions: program.missions.length });
    return { programId, state: program.state, awaitingHuman: true, missions: program.missions.length };
  }

  // Estado do programa: DERIVADO do estado real das missões. O coração da honestidade.
  async status(tenantId, actorId, programId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const program = await this.#program(tenantId, programId);
    const state = await this.store.read();
    const missionIds = program.missions.map((m) => m.missionId).filter(Boolean);
    const missions = (state.missions || []).filter((mm) => mm.tenantId === tenantId && missionIds.includes(mm.id));

    if (!missions.length) {
      return { programId, state: program.state, progress: unknown('no mission materialized yet'), blocked: false, blockedMissions: [], missionCount: program.missions.length };
    }
    const blockedMissions = missions.filter((mm) => ['FAILED', 'AWAITING_APPROVAL'].includes(mm.status)).map((mm) => mm.id);
    const done = missions.filter((mm) => mm.status === 'SUCCEEDED').length;
    const avgProgress = Number((missions.reduce((s2, mm) => s2 + Number(mm.progress || 0), 0) / missions.length).toFixed(2));
    // Estado derivado, nunca literal fixo.
    let derived = program.state;
    if (blockedMissions.length) derived = PROGRAM_STATES.BLOCKED;
    else if (done === missions.length) derived = PROGRAM_STATES.COMPLETED;
    else if (missions.some((mm) => mm.status === 'RUNNING')) derived = PROGRAM_STATES.RUNNING;
    return {
      programId,
      state: measured(derived, 'derived:mission states'),
      progress: measured(avgProgress, 'derived:avg mission.progress'),
      blocked: blockedMissions.length > 0,
      blockedMissions,
      missionCount: measured(missions.length, 'store:missions'),
      completed: measured(done, 'derived:mission SUCCEEDED'),
    };
  }

  async list(tenantId, actorId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    return (await this.store.read()).programs.filter((p) => p.tenantId === tenantId);
  }

  async #program(tenantId, programId) {
    const state = await this.store.read();
    const p = (state.programs || []).find((item) => item.id === programId && item.tenantId === tenantId);
    if (!p) throw new Error(`program not found: ${programId}`);
    return p;
  }
}

module.exports = { ExecutiveBrain, PROGRAM_TEMPLATES };
