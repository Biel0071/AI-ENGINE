/**
 * FÊNIX OS — Agent Runtime v3.0 (Enterprise Multi-Agent Pool)
 * Manages concurrent lifecycle of the 19 specialized agents.
 * Provides Context Bus, Delegation, Heartbeats, Priority Event Dispatch and Auto-Retries.
 */

const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const { AgentRegistry } = require('../agents/agent-registry');
const { FENIX_EVENTS, EVENT_PRIORITY } = require('../core/contracts/event-types');
const crypto = require('crypto');
const { RealWorldExecutor } = require('../orchestrator/real-world-executor');

class AgentRuntime extends SystemModule {
  constructor({ eventBus = null, registry = null, store = null } = {}) {
    super('agent_runtime', '3.0.0');
    this.eventBus = eventBus;
    this.registry = registry || new AgentRegistry();
    this.store = store;
    this.activeAgents = new Map(); // instanceId -> AgentInstance
    this.sharedContext = new Map(); // projectId -> SharedContext
    this.status = STATE_MACHINE.BOOT;
    this.tools = new RealWorldExecutor(null, eventBus);
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.AGENT_STARTED, { runtime: 'agent_runtime', agentsRegistered: this.registry.list().length }, EVENT_PRIORITY.HIGH);
    }
    return this;
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    for (const [id] of this.activeAgents.entries()) {
      await this.terminateAgent(id, 'System Shutdown');
    }
    this.startTime = null;
  }

  /**
   * Spawns a specialized agent instance by name or specification
   */
  async spawnAgent(roleOrDef, { projectId = 'default', task = null, initialContext = {}, runFn = null } = {}) {
    const spec = typeof roleOrDef === 'string'
      ? this.registry.get(roleOrDef) || { name: roleOrDef, domain: 'custom', tools: [], permissions: [] }
      : roleOrDef;

    const instanceId = `agent_${spec.name?.toLowerCase().replace(/\s+/g, '_')}_${crypto.randomUUID().slice(0, 8)}`;
    
    // Ensure shared context exists for project
    if (!this.sharedContext.has(projectId)) {
      this.sharedContext.set(projectId, {
        projectId,
        filesTouched: new Set(),
        discoveries: [],
        errors: [],
        timeline: []
      });
    }

    const projectContext = this.sharedContext.get(projectId);

    const instance = {
      id: instanceId,
      role: spec.name,
      domain: spec.domain,
      spec,
      projectId,
      task,
      status: STATE_MACHINE.READY,
      context: { ...initialContext, project: projectContext },
      lastHeartbeat: Date.now(),
      retries: 0,
      maxRetries: 3,
      runFn: runFn || spec.run || (async () => ({ success: true, message: 'Default execution completed' }))
    };

    this.activeAgents.set(instanceId, instance);

    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.AGENT_SPAWNED, {
        agentId: instanceId,
        role: instance.role,
        domain: instance.domain,
        projectId
      }, EVENT_PRIORITY.NORMAL);
    }

    return instanceId;
  }

  /**
   * Executes an existing spawned agent
   */
  async executeAgent(instanceId) {
    const agent = this.activeAgents.get(instanceId);
    if (!agent) throw new Error(`Agent ${instanceId} not found in runtime`);

    agent.status = STATE_MACHINE.ONLINE;
    agent.lastHeartbeat = Date.now();

    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.AGENT_STARTED, { agentId: instanceId, role: agent.role }, EVENT_PRIORITY.NORMAL);
    }

    try {
      const result = await agent.runFn({
        agentId: instanceId,
        context: agent.context,
        heartbeat: () => this.heartbeat(instanceId),
        delegate: (targetRole, subTask) => this.delegate(instanceId, targetRole, subTask),
        tools: this.tools,
        logDiscovery: (item) => {
          agent.context.project?.discoveries.push({ agent: agent.role, timestamp: new Date().toISOString(), item });
        }
      });

      agent.status = STATE_MACHINE.OFFLINE;
      agent.result = result;

      if (this.eventBus) {
        await this.eventBus.emit(FENIX_EVENTS.AGENT_FINISHED, { agentId: instanceId, role: agent.role, result }, EVENT_PRIORITY.NORMAL);
      }

      return result;
    } catch (err) {
      agent.status = STATE_MACHINE.ERROR;
      agent.error = err.message;

      if (this.eventBus) {
        await this.eventBus.emit(FENIX_EVENTS.AGENT_FAILED, { agentId: instanceId, role: agent.role, error: err.message }, EVENT_PRIORITY.HIGH);
      }

      if (agent.retries < agent.maxRetries) {
        agent.retries += 1;
        return this.executeAgent(instanceId);
      }

      throw err;
    }
  }

  /**
   * Agent-to-Agent delegation
   */
  async delegate(callerAgentId, targetRole, subTask) {
    const caller = this.activeAgents.get(callerAgentId);
    const subAgentId = await this.spawnAgent(targetRole, {
      projectId: caller?.projectId || 'default',
      task: subTask,
      initialContext: { delegatedBy: callerAgentId, parentTask: caller?.task }
    });

    return this.executeAgent(subAgentId);
  }

  heartbeat(instanceId) {
    const agent = this.activeAgents.get(instanceId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
    }
  }

  async pauseAgent(instanceId) {
    const agent = this.activeAgents.get(instanceId);
    if (!agent) return false;
    agent.status = 'PAUSED';
    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.AGENT_PAUSED, { agentId: instanceId, role: agent.role });
    }
    return true;
  }

  async resumeAgent(instanceId) {
    const agent = this.activeAgents.get(instanceId);
    if (!agent || agent.status !== 'PAUSED') return false;
    agent.status = STATE_MACHINE.ONLINE;
    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.AGENT_RESUMED, { agentId: instanceId, role: agent.role });
    }
    return true;
  }

  async terminateAgent(instanceId, reason = 'Terminated by runtime') {
    const agent = this.activeAgents.get(instanceId);
    if (!agent) return false;
    agent.status = STATE_MACHINE.SHUTDOWN;
    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.AGENT_TERMINATED, { agentId: instanceId, role: agent.role, reason });
    }
    this.activeAgents.delete(instanceId);
    return true;
  }

  getAgent(instanceId) {
    return this.activeAgents.get(instanceId) || null;
  }

  listActive() {
    return Array.from(this.activeAgents.values());
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        activeInstances: this.activeAgents.size,
        registeredAgentTypes: this.registry.list().length,
        projectsWithSharedContext: this.sharedContext.size
      }
    };
  }
}

module.exports = { AgentRuntime };
