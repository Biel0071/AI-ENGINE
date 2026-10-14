'use strict';

/**
 * FÊNIX OS — Communication Router & Circuit Breaker (Fase 14)
 * =============================================================
 * Handles capability resolution, smart routing between agents,
 * handoff execution, and anti-loop safety mechanisms.
 *
 * Invariant: Never allow infinite conversation loops (A → B → A → B...)!
 */

const crypto = require('crypto');
const { COMMUNICATION_EVENTS, PRESENCE_STATUSES } = require('./communication-events');
const { globalCommunicationBus } = require('./agent-communication-bus');
const { globalPresenceManager } = require('./presence-manager');

const CAPABILITY_CATALOG = {
  'qa': ['agent-qa'],
  'testing': ['agent-qa'],
  'security': ['agent-security'],
  'architecture': ['agent-architect'],
  'design': ['agent-frontend', 'agent-ux'],
  'frontend': ['agent-frontend'],
  'backend': ['agent-backend'],
  'api': ['agent-backend'],
  'database': ['agent-db'],
  'memory': ['agent-memory'],
  'devops': ['agent-devops'],
  'observability': ['agent-obs'],
  'planning': ['agent-planner'],
  'executive': ['agent.ceo']
};

class CommunicationRouter {
  constructor(options = {}) {
    this.bus = options.bus || globalCommunicationBus;
    this.presenceManager = options.presenceManager || globalPresenceManager;
    this.logger = options.logger || console;

    // Safety budgets
    this.maxMessagesPerConversation = options.maxMessages !== undefined ? options.maxMessages : 50;
    this.maxHops = options.maxHops !== undefined ? options.maxHops : 5;
    this.conversationTtlMs = options.ttlMs !== undefined ? options.ttlMs : 15 * 60 * 1000; // 15 mins
    this.cooldownMs = options.cooldownMs !== undefined ? options.cooldownMs : 1000; // 1s between bursts

    this.messageHistoryHashes = new Set();
    this.recentInteractions = new Map(); // 'agentA:agentB' -> timestamp
    this.handoffChains = new Map(); // missionId -> Array<agentId>
  }

  /**
   * Resolves the best available agent for a given required capability.
   * @param {string} capability
   * @returns {string|null} Available agent ID
   */
  resolveAgentForCapability(capability) {
    const key = capability.toLowerCase().trim();
    const candidateIds = CAPABILITY_CATALOG[key] || [];

    if (candidateIds.length === 0) {
      // Fallback search in keys
      for (const [cap, ids] of Object.entries(CAPABILITY_CATALOG)) {
        if (key.includes(cap) || cap.includes(key)) {
          candidateIds.push(...ids);
        }
      }
    }

    if (candidateIds.length === 0) return null;

    // Pick first available or working agent
    for (const id of candidateIds) {
      const pres = this.presenceManager.getAgentPresence(id);
      if (!pres || pres.status === PRESENCE_STATUSES.AVAILABLE) {
        return id;
      }
    }

    // If none purely available, return first candidate
    return candidateIds[0];
  }

  /**
   * Validates safety budgets, TTL, duplicate content, and ping-pong loops.
   * @param {object} params
   * @returns {{ allowed: boolean, reason?: string }}
   */
  checkSafety({
    conversationId,
    senderId,
    content,
    participants = [],
    messageCount = 0
  }) {
    // 1. Message Budget Check
    if (messageCount >= this.maxMessagesPerConversation) {
      return {
        allowed: false,
        reason: `Exceeded message budget of ${this.maxMessagesPerConversation} messages for conversation ${conversationId}`
      };
    }

    // 2. Duplicate Content Hash Check
    const hash = crypto.createHash('sha256')
      .update(`${conversationId}:${senderId}:${content}`)
      .digest('hex');

    if (this.messageHistoryHashes.has(hash)) {
      return {
        allowed: false,
        reason: `Duplicate message content detected in flight for conversation ${conversationId}`
      };
    }
    this.messageHistoryHashes.add(hash);
    if (this.messageHistoryHashes.size > 1000) {
      // Evict oldest elements to keep memory bounded
      const it = this.messageHistoryHashes.values();
      for (let i = 0; i < 200; i++) this.messageHistoryHashes.delete(it.next().value);
    }

    // 3. Ping-Pong / Interaction Loop Check
    const otherParticipant = participants.find(p => p !== senderId);
    if (otherParticipant) {
      const pairKey = [senderId, otherParticipant].sort().join(':');
      const now = Date.now();
      const lastTime = this.recentInteractions.get(pairKey) || 0;

      if (now - lastTime < this.cooldownMs) {
        // High frequency ping-pong detected
        return {
          allowed: false,
          reason: `Interaction burst limit reached between ${senderId} and ${otherParticipant}. Cooldown enforced.`
        };
      }
      this.recentInteractions.set(pairKey, now);
    }

    return { allowed: true };
  }

  /**
   * Executes a formal Agent Handoff (passagem de bastão) for a mission task.
   * @param {object} handoff
   */
  executeHandoff({
    sourceAgent,
    targetAgent,
    missionId,
    taskId = null,
    reason = 'Task delegation',
    context = {},
    artifacts = [],
    expectedOutcome = ''
  }) {
    if (!sourceAgent || !targetAgent || !missionId) {
      throw new Error('sourceAgent, targetAgent, and missionId are required for handoff');
    }

    // Check handoff hop limit for the mission
    const chain = this.handoffChains.get(missionId) || [];
    if (chain.length >= this.maxHops) {
      const reasonMsg = `Handoff aborted: maximum hop limit (${this.maxHops}) reached for mission ${missionId}`;
      this.bus.publish(COMMUNICATION_EVENTS.LOOP_DETECTED, { missionId, reason: reasonMsg });
      throw new Error(reasonMsg);
    }

    chain.push(targetAgent);
    this.handoffChains.set(missionId, chain);

    const handoffEvent = {
      handoffId: `ho_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      sourceAgent,
      targetAgent,
      missionId,
      taskId,
      reason,
      context,
      artifacts,
      expectedOutcome,
      hopCount: chain.length,
      timestamp: new Date().toISOString()
    };

    // Update presences: source back to AVAILABLE, target to WORKING on mission
    this.presenceManager.setAgentPresence(sourceAgent, {
      status: PRESENCE_STATUSES.AVAILABLE
    });
    this.presenceManager.setAgentPresence(targetAgent, {
      status: PRESENCE_STATUSES.WORKING,
      currentMissionId: missionId,
      currentTaskId: taskId || reason
    });

    this.bus.publish(COMMUNICATION_EVENTS.AGENT_HANDOFF, handoffEvent);

    return handoffEvent;
  }
}

const globalCommunicationRouter = new CommunicationRouter();

module.exports = {
  CommunicationRouter,
  globalCommunicationRouter,
  CAPABILITY_CATALOG
};
