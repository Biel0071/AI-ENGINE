// City Live Bridge — transforma a AI City em Digital Twin VIVO.
// Assina os eventos REAIS do barramento (fabric events + runtime bus) e projeta
// cada agente do AgentSwarm como NPC dentro dos distritos, com estado derivado
// de atividade real (missões, jobs, chats). Sem IA externa o bridge continua
// funcionando: ele só lê eventos do organismo. Regra REAL > DERIVED > UNKNOWN:
// nada aqui inventa agentes, tarefas ou métricas — tudo vem de fontes verificáveis.
const TERMINAL_MISSION = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);

const AGENT_DISTRICTS = {
  architecture: 'Intelligence', backend: 'Operations', frontend: 'Operations', ux: 'Intelligence',
  qa: 'Operations', devops: 'Infrastructure', database: 'Infrastructure', security: 'Governance',
  documentation: 'Intelligence', observability: 'Infrastructure', ai: 'Intelligence',
  memory: 'Intelligence', knowledge: 'Intelligence', twin: 'Intelligence', planner: 'Intelligence',
};

class CityLiveBridge {
  constructor({ store, bus, controlPlane, fabricEvents, agentSwarm }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.fabricEvents = fabricEvents;
    this.agentSwarm = agentSwarm;
    this.unsubscribers = [];
  }

  attach() {
    if (this.unsubscribers.length) return this;
    // Eventos estruturais do fabric (mission.*, runtime.job.*, swarm.*).
    if (this.fabricEvents?.subscribe) {
      this.unsubscribers.push(this.fabricEvents.subscribe('fabric.event', (event) => this.#onFabricEvent(event)));
    }
    // Sinais de runtime que não passam pelo event-store (cache hit, memória, cidade):
    // retransmitidos como `city.live` para o SSE/frontend reagir sem polling.
    for (const type of ['ai.cache_hit', 'memory.recorded', 'city.updated']) {
      this.unsubscribers.push(this.bus.on(type, () => this.bus.emit('city.live', { source: type, at: new Date().toISOString() })));
    }
    return this;
  }

  detach() { for (const off of this.unsubscribers.splice(0)) { try { off(); } catch { /* já removido */ } } }

  async #onFabricEvent(event) {
    const target = String(event.data?.agent || event.data?.targetAgent || event.subject || '');
    const specialist = this.agentSwarm?.specialists?.find((s) => s.id === target || s.domain === target);
    if (specialist && /mission\.|runtime\.job\.|swarm\.|npc\./.test(event.type)) {
      await this.store.update((state) => {
        let npc = state.cityNpcStates.find((item) => item.tenantId === event.tenantId && item.agentId === specialist.id);
        if (!npc) {
          npc = { tenantId: event.tenantId, agentId: specialist.id, status: 'IDLE_OBSERVING', currentTask: null, lastAction: null, activityCount: 0, history: [], updatedAt: event.occurredAt };
          state.cityNpcStates.push(npc);
        }
        const running = event.type.includes('.started') || event.type.includes('dispatched') || event.data?.status === 'RUNNING' || event.data?.status === 'DISPATCHED';
        const failed = event.type.includes('failed') || event.type.includes('dead_letter') || event.data?.status === 'FAILED' || event.data?.status === 'DEGRADED';
        npc.status = running ? 'EXECUTING' : failed ? 'RECOVERING' : 'IDLE_OBSERVING';
        npc.currentTask = running ? (event.data?.stepKey || event.data?.missionId || event.type) : (failed ? `falha: ${event.type}` : null);
        npc.lastAction = `${event.type} @ ${event.occurredAt}`;
        npc.activityCount += 1;
        npc.history.push({ at: event.occurredAt, type: event.type, status: event.data?.status || null });
        if (npc.history.length > 20) npc.history.splice(0, npc.history.length - 20);
        npc.updatedAt = event.occurredAt;
        return state;
      });
    }
    await this.bus.emit('city.live', { source: event.type, tenantId: event.tenantId, at: event.occurredAt });
  }

  // Lista NPCs reais: identidade vem do AgentSwarm (AgentRegistry), estado vem da
  // projeção de eventos + mission steps ativos. Posição é determinística por índice
  // no distrito (grade local), destino = prédio onde a tarefa atual está sendo
  // executada. Autorização idêntica ao NpcCityEngine (governance:read); se a
  // verificação falhar por motivo operacional a leitura degrada, nunca explode.
  async listNpcs(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return this.#listNpcs(tenantId);
  }

  async #listNpcs(tenantId) {
    const specialists = this.agentSwarm?.specialists || [];
    let state = null;
    try { state = await this.store.read(); } catch { state = null; }
    const live = state ? state.cityNpcStates.filter((item) => item.tenantId === tenantId) : [];
    const missions = state ? state.missions.filter((m) => m.tenantId === tenantId && !TERMINAL_MISSION.has(m.status)) : [];
    const runningSteps = state
      ? state.missionSteps.filter((step) => missions.some((m) => m.id === step.missionId) && ['RUNNING', 'DISPATCHED'].includes(step.status))
      : [];
    const districtIndex = {};
    const npcs = specialists.map((s) => {
      const district = AGENT_DISTRICTS[s.domain] || 'Operations';
      districtIndex[district] = districtIndex[district] || 0;
      const slot = districtIndex[district]++;
      const entry = live.find((item) => item.agentId === s.id);
      const step = runningSteps.find((st) => st.agent === s.id);
      const mission = step ? missions.find((m) => m.id === step.missionId) : null;
      const building = step?.building || 'mission-control';
      return {
        id: s.id, name: s.name, domain: s.domain, role: s.role,
        district,
        position: { x: (slot % 4) * 120 + 40, y: Math.floor(slot / 4) * 100 + 30 },
        destination: building,
        status: step ? 'EXECUTING' : (entry?.status || 'IDLE_OBSERVING'),
        currentTask: step ? `${step.key} · missão ${mission?.id || ''}` : (entry?.currentTask || null),
        lastAction: entry?.lastAction || null,
        activityCount: entry?.activityCount || 0,
        queueCount: runningSteps.filter((st) => st.agent === s.id).length,
        interactive: true,
      };
    });
    return { npcs, total: npcs.length, source: 'agent-swarm+events' };
  }

  // Inspector real de um NPC: identidade (swarm), memória (coleção memories), tarefa
  // (mission steps RUNNING), histórico (projeção de eventos). Cada bloco declara a
  // fonte; ausências aparecem como UNKNOWN — nunca como número inventado.
  async inspectNpc(tenantId, actorId, npcId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const specialists = this.agentSwarm?.specialists || [];
    const npc = specialists.find((s) => s.id === npcId || s.domain === npcId);
    if (!npc) {
      const error = new Error(`NPC not found: ${npcId}`);
      error.name = 'NotFoundError';
      error.status = 404;
      throw error;
    }
    let state = null;
    try { state = await this.store.read(); } catch { state = null; }
    const entry = state ? state.cityNpcStates.find((item) => item.tenantId === tenantId && item.agentId === npc.id) || null : null;
    const missions = state ? state.missions.filter((m) => m.tenantId === tenantId) : [];
    const steps = state ? state.missionSteps.filter((step) => step.agent === npc.id && missions.some((m) => m.id === step.missionId)) : [];
    const activeStep = steps.find((step) => ['RUNNING', 'DISPATCHED', 'AWAITING_APPROVAL'].includes(step.status)) || null;
    let memories = { results: [], unavailable: false };
    if (state) {
      const ownerMemories = state.memories
        .filter((mem) => mem.tenantId === tenantId && (mem.scopeType === 'agent' || mem.ownerActorId === npc.id || (mem.tags || []).includes(npc.domain)))
        .slice(-5);
      memories = { results: ownerMemories.map((mem) => ({ id: mem.id, title: mem.title, kind: mem.kind, confidence: mem.confidence, updatedAt: mem.updatedAt })) };
    } else {
      memories = { results: [], unavailable: true };
    }
    return {
      identity: { id: npc.id, name: npc.name, domain: npc.domain, role: npc.role, source: 'agent-swarm' },
      state: { status: entry?.status || 'IDLE_OBSERVING', currentTask: activeStep ? `${activeStep.key} (missão ${activeStep.missionId})` : (entry?.currentTask || 'UNKNOWN'), lastAction: entry?.lastAction || 'UNKNOWN', updatedAt: entry?.updatedAt || null },
      capabilities: { role: npc.role, district: AGENT_DISTRICTS[npc.domain] || 'Operations', interactive: true },
      task: activeStep ? { stepKey: activeStep.key, type: activeStep.type, missionId: activeStep.missionId, status: activeStep.status, jobId: activeStep.jobId, building: activeStep.building || null } : null,
      memory: { items: memories.results, count: memories.results.length, note: memories.unavailable ? 'UNKNOWN' : 'fonte: MemoryEngine (últimas memórias vinculadas ao agente)' },
      workload: { stepsTotal: steps.length, succeeded: steps.filter((s) => s.status === 'SUCCEEDED').length, failed: steps.filter((s) => s.status === 'FAILED').length, activityCount: entry?.activityCount || 0 },
      history: (entry?.history || []).slice(-10),
    };
  }
}

module.exports = { CityLiveBridge, AGENT_DISTRICTS, TERMINAL_MISSION };
