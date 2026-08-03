const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const crypto = require('crypto');

/**
 * AgentRuntime v2.0
 * Gerencia a execução isolada de dezenas de agentes (Worker Pool).
 * Fornece contexto, heartbeat e limite de retries para cada agente.
 */
class AgentRuntime extends SystemModule {
  constructor(eventBus, scheduler) {
    super('agent_runtime', '2.0.0');
    this.eventBus = eventBus;
    this.scheduler = scheduler;
    this.agents = new Map(); // id -> AgentState
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[AgentRuntime] Preparando Worker Pool para Agentes Autônomos...');
    
    // Inicia heartbeat check via Scheduler (se disponível) ou internamente
    if (this.scheduler) {
      this.scheduler.scheduleJob('agent-heartbeat-monitor', 10000, () => this._checkHeartbeats());
    }

    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    for (const [id, agent] of this.agents.entries()) {
      await this.terminateAgent(id, 'System Shutdown');
    }
  }

  /**
   * Instancia e executa um Agente
   */
  async spawnAgent(agentDef, context = {}) {
    const agentId = `agent_${crypto.randomUUID()}`;
    const agentState = {
      id: agentId,
      name: agentDef.name || 'UnnamedAgent',
      status: STATE_MACHINE.READY,
      context,
      lastHeartbeat: Date.now(),
      retries: 0,
      runFn: agentDef.run // A função principal do agente
    };

    this.agents.set(agentId, agentState);
    this.eventBus?.publish('agent.spawned', { agentId, name: agentState.name }, 4 /* BACKGROUND */);

    // Inicia a execução assíncrona
    this._runAgent(agentState).catch(err => console.error(`[AgentRuntime] Fatal error in agent ${agentId}:`, err));

    return agentId;
  }

  async _runAgent(agentState) {
    agentState.status = STATE_MACHINE.ONLINE;
    try {
      // O agente deve invocar emitHeartbeat() periodicamente
      const result = await agentState.runFn({
        context: agentState.context,
        emitHeartbeat: () => { agentState.lastHeartbeat = Date.now(); }
      });
      
      agentState.status = STATE_MACHINE.OFFLINE;
      this.eventBus?.publish('agent.completed', { agentId: agentState.id, result }, 2 /* NORMAL */);
    } catch (err) {
      agentState.status = STATE_MACHINE.ERROR;
      this.eventBus?.publish('agent.failed', { agentId: agentState.id, error: err.message }, 1 /* HIGH */);
      
      // Auto-retry via Runtime
      if (agentState.retries < 3) {
        agentState.retries++;
        console.warn(`[AgentRuntime] Reiniciando agente ${agentState.id} (Tentativa ${agentState.retries})`);
        setTimeout(() => this._runAgent(agentState), 2000);
      } else {
        console.error(`[AgentRuntime] Agente ${agentState.id} falhou definitivamente.`);
      }
    }
  }

  async terminateAgent(agentId, reason) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = STATE_MACHINE.SHUTDOWN;
    this.eventBus?.publish('agent.terminated', { agentId, reason }, 2);
    this.agents.delete(agentId);
  }

  async _checkHeartbeats() {
    const now = Date.now();
    for (const [id, agent] of this.agents.entries()) {
      if (agent.status === STATE_MACHINE.ONLINE) {
        // Se ficou 30s sem dar heartbeat
        if (now - agent.lastHeartbeat > 30000) {
          console.warn(`[AgentRuntime] Zombie agent detectado (sem heartbeat): ${id}`);
          this.eventBus?.publish('agent.timeout', { agentId: id }, 1 /* HIGH */);
          // O Supervisor ou o IDoctor devem decidir se matam ou não. Aqui apenas sinalizamos.
        }
      }
    }
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        activeAgents: this.agents.size
      }
    };
  }
}

module.exports = { AgentRuntime };
