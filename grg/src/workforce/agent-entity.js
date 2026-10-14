const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');

/**
 * AgentEntity — Fênix OS Agent Operating System
 * 
 * Regra Suprema: Agent ≠ LLM.
 * Um agente é uma entidade de runtime soberana com ciclo de vida, permissões,
 * caixas de entrada/saída, memória, orçamento, métricas e estado reativo.
 */

const AGENT_STATES = {
  CREATED: 'CREATED',
  READY: 'READY',
  RUNNING: 'RUNNING',
  WAITING: 'WAITING',
  BLOCKED: 'BLOCKED',
  FAILED: 'FAILED',
  RECOVERING: 'RECOVERING',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED'
};

class AgentEntity extends EventEmitter {
  constructor({
    id = null,
    name,
    role = 'engineer',
    domain = 'engineering',
    capabilities = [],
    permissions = ['read', 'execute'],
    tools = [],
    skills = [],
    policies = {},
    budget = { maxTokens: 50000, maxCostUsd: 1.0, tokensUsed: 0, costUsed: 0.0 },
    cognitiveProvider = 'DETERMINISTIC'
  }) {
    super();
    this.id = id || `agent_${role.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${crypto.randomBytes(4).toString('hex')}`;
    this.name = name || `Agent ${role.toUpperCase()}`;
    this.role = role;
    this.domain = domain;
    this.state = AGENT_STATES.CREATED;
    this.capabilities = Array.from(new Set(capabilities));
    this.permissions = Array.from(new Set(permissions));
    this.tools = tools;
    this.skills = skills;
    this.policies = { timeoutMs: 60000, maxRetries: 3, ...policies };
    this.budget = budget;
    this.cognitiveProvider = cognitiveProvider;

    // Memory & Context
    this.memory = {
      shortTerm: [],
      episodic: [],
      discoveries: []
    };
    this.goals = [];
    this.inbox = [];
    this.outbox = [];
    this.currentTask = null;

    // Health & Metrics
    this.health = {
      status: 'HEALTHY',
      lastHeartbeat: Date.now(),
      failuresCount: 0
    };
    this.metrics = {
      tasksCompleted: 0,
      errorsCount: 0,
      totalExecutionTimeMs: 0
    };
  }

  transitionTo(newState, reason = '') {
    if (!AGENT_STATES[newState]) {
      throw new Error(`Invalid agent state: ${newState}`);
    }
    const previous = this.state;
    this.state = newState;
    this.health.lastHeartbeat = Date.now();
    this.emit('state.changed', { agentId: this.id, previous, current: newState, reason });
    return this.state;
  }

  enqueueMessage(message) {
    const msg = {
      messageId: message.messageId || `msg_${crypto.randomUUID().slice(0, 8)}`,
      sender: message.sender || 'system',
      receiver: this.id,
      missionId: message.missionId || null,
      timestamp: new Date().toISOString(),
      payload: message.payload || {},
      status: 'QUEUED'
    };
    this.inbox.push(msg);
    this.emit('message.received', msg);
    return msg;
  }

  sendMessage(receiverId, payload, missionId = null) {
    const msg = {
      messageId: `msg_${crypto.randomUUID().slice(0, 8)}`,
      sender: this.id,
      receiver: receiverId,
      missionId,
      timestamp: new Date().toISOString(),
      payload,
      status: 'SENT'
    };
    this.outbox.push(msg);
    this.emit('message.dispatched', msg);
    return msg;
  }

  recordDiscovery(item) {
    this.memory.discoveries.push({
      item,
      timestamp: new Date().toISOString(),
      missionId: this.currentTask?.missionId || null
    });
  }

  recordExecution(durationMs, success = true) {
    this.metrics.totalExecutionTimeMs += durationMs;
    if (success) {
      this.metrics.tasksCompleted++;
      this.health.failuresCount = 0;
    } else {
      this.metrics.errorsCount++;
      this.health.failuresCount++;
      if (this.health.failuresCount > 2) this.health.status = 'DEGRADED';
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      domain: this.domain,
      state: this.state,
      capabilities: this.capabilities,
      permissions: this.permissions,
      tools: this.tools,
      skills: this.skills,
      budget: this.budget,
      health: this.health,
      metrics: this.metrics,
      inboxCount: this.inbox.length,
      outboxCount: this.outbox.length,
      discoveriesCount: this.memory.discoveries.length
    };
  }
}

module.exports = { AgentEntity, AGENT_STATES };
