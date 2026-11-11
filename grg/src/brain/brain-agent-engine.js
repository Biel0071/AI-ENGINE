'use strict';
/**
 * FÊNIX OS v2.3 — Brain Agent Engine (Unified Projection Layer)
 * ZERO FAKE AGENTS · ZERO HARDCODED POPULATION
 * 
 * Synchronized with globalAgentRuntime as single source of truth.
 * City receives projections only: NEVER invents random movement or synthetic population.
 */

const { globalAgentRuntime } = require('../runtime/agent-runtime');

const COGNITIVE_STATES = [
  'IDLE', 'THINKING', 'CODING', 'TESTING', 'DEPLOYING', 'REVIEWING',
  'WAITING', 'ERROR', 'WALKING', 'INSPECTING', 'CHATTING', 'RESEARCHING',
  'SLEEPING', 'OFFLINE', 'CELEBRATING'
];

class BrainAgentEngine {
  constructor(agentSwarm) {
    this.runtime = globalAgentRuntime;
  }

  tick(agentId) {
    // Constraint 12 & 13: NO random state mutations or wandering on timer!
    // Status and movement are driven purely by real job execution and events.
    if (this.runtime) {
      this.runtime.heartbeat(agentId);
    }
  }

  remember(agentId, type, memory) {
    const agent = this.runtime.getAgent(agentId);
    if (!agent) return;
    if (!agent.episodicMemory) agent.episodicMemory = [];
    if (!agent.visualMemory) agent.visualMemory = [];
    if (!agent.spatialMemory) agent.spatialMemory = {};
    if (!agent.socialMemory) agent.socialMemory = {};
    if (!agent.knownPlaces) agent.knownPlaces = [agent.district || 'dev-district'];
    if (!agent.knownAgents) agent.knownAgents = [];

    const item = { timestamp: Date.now(), content: memory };
    if (type === 'episodic') {
      agent.episodicMemory.push(item);
      if (agent.episodicMemory.length > 100) agent.episodicMemory.shift();
    } else if (type === 'visual') {
      agent.visualMemory.push(item);
      if (agent.visualMemory.length > 50) agent.visualMemory.shift();
    } else if (type === 'spatial') {
      const p = (typeof memory === 'object' ? memory.location : memory) || String(memory);
      agent.spatialMemory[p] = (agent.spatialMemory[p] || 0) + 1;
      if (!agent.knownPlaces.includes(p)) agent.knownPlaces.push(p);
    } else if (type === 'social') {
      const t = (typeof memory === 'object' ? memory.targetAgentId : memory) || String(memory);
      agent.socialMemory[t] = (agent.socialMemory[t] || 0) + 1;
      if (!agent.knownAgents.includes(t)) agent.knownAgents.push(t);
    }
  }

  recall(agentId, query) {
    const agent = this.runtime.getAgent(agentId);
    if (!agent || !agent.episodicMemory) return [];
    const q = query.toLowerCase();
    return agent.episodicMemory.filter(m => typeof m.content === 'string' && m.content.toLowerCase().includes(q));
  }

  meetAgent(agentId1, agentId2) {
    this.remember(agentId1, 'social', agentId2);
    this.remember(agentId2, 'social', agentId1);
  }

  visitLocation(agentId, location) {
    this.remember(agentId, 'spatial', location);
    const agent = this.runtime.getAgent(agentId);
    if (agent) {
      agent.location = location;
      agent.district = location;
    }
  }

  getAgentState(agentId) {
    const agent = this.runtime.getAgent(agentId);
    if (!agent) return null;
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      state: agent.status === 'RUNNING' ? 'CODING' : (agent.status === 'UNHEALTHY' ? 'ERROR' : agent.status),
      district: agent.district || agent.location || 'dev-district',
      location: agent.district || agent.location || 'dev-district',
      position: agent.position,
      currentGoal: agent.currentJobId ? `Executing job #${agent.currentJobId}` : 'Ready for assignment',
      intelligenceLevel: 3,
      episodicMemory: agent.episodicMemory || [],
      spatialMemory: agent.spatialMemory || {},
      socialMemory: agent.socialMemory || {},
      visualMemory: agent.visualMemory || [],
      knownPlaces: agent.knownPlaces || [agent.district || 'dev-district'],
      knownAgents: agent.knownAgents || [],
      skills: agent.capabilities || [],
      lastAction: agent.lastHeartbeat
    };
  }

  getAllAgentStates() {
    return this.runtime.getCityAgents();
  }
}

// Global Singleton
if (!global.__fenixBrainEngine) {
  global.__fenixBrainEngine = new BrainAgentEngine();
}

module.exports = {
  BrainAgentEngine,
  COGNITIVE_STATES
};
