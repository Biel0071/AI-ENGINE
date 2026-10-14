const { AgentEntity, AGENT_STATES } = require('./agent-entity');
const crypto = require('node:crypto');

/**
 * AgentFactory & MultiAgentTeam — Fênix OS Agent Operating System
 * 
 * Permite a criação determinística ou orientada a missão de novos agentes
 * e equipes especializadas com governança e ausência de loops infinitos.
 */

class AgentTeam {
  constructor({ id = null, name = 'Autonomous Task Force', leader = null, members = [] }) {
    this.id = id || `team_${crypto.randomUUID().slice(0, 8)}`;
    this.name = name;
    this.leader = leader;
    this.members = new Map(); // id -> AgentEntity
    for (const m of members) {
      this.members.set(m.id, m);
    }
    this.messageLedger = [];
    this.visitedMessageHashes = new Set();
  }

  addMember(agent) {
    this.members.set(agent.id, agent);
  }

  getMember(idOrRole) {
    if (this.members.has(idOrRole)) return this.members.get(idOrRole);
    return Array.from(this.members.values()).find(m => m.role.toLowerCase() === idOrRole.toLowerCase());
  }

  /**
   * Safe message dispatch between team members preventing circular loops
   */
  routeMessage({ senderId, receiverId, payload, missionId = null, maxHops = 10 }) {
    const sender = this.members.get(senderId);
    const receiver = this.members.get(receiverId);

    if (!sender) throw new Error(`Sender agent ${senderId} is not in team ${this.name}`);
    if (!receiver) throw new Error(`Receiver agent ${receiverId} is not in team ${this.name}`);

    // Cycle detection via payload hash & hop tracking
    const hopCount = Number(payload._hopCount || 0);
    if (hopCount >= maxHops) {
      throw new Error(`Message delivery aborted: maximum hop threshold (${maxHops}) reached. Potential circular loop detected.`);
    }

    const msgHash = crypto.createHash('sha256')
      .update(JSON.stringify({ senderId, receiverId, missionId, content: payload.content || payload, hop: hopCount }))
      .digest('hex');

    if (this.visitedMessageHashes.has(msgHash)) {
      throw new Error(`Message delivery aborted: duplicate message hash detected in flight.`);
    }
    this.visitedMessageHashes.add(msgHash);

    const enrichedPayload = { ...payload, _hopCount: hopCount + 1 };
    const sentMsg = sender.sendMessage(receiverId, enrichedPayload, missionId);
    receiver.enqueueMessage(sentMsg);
    this.messageLedger.push(sentMsg);
    return sentMsg;
  }
}

class AgentFactory {
  constructor({ defaultStore = null, eventBus = null, logger = console } = {}) {
    this.store = defaultStore;
    this.eventBus = eventBus;
    this.logger = logger;
    this.createdAgents = new Map();
  }

  createAgent({
    id = null,
    name = null,
    role = 'engineer',
    domain = 'engineering',
    capabilities = ['filesystem.read', 'filesystem.write', 'process.execute'],
    permissions = ['read', 'write', 'execute'],
    skills = [],
    policies = {},
    cognitiveProvider = 'DETERMINISTIC'
  } = {}) {
    const agent = new AgentEntity({
      id,
      name: name || `Fênix ${role.toUpperCase()}`,
      role,
      domain,
      capabilities,
      permissions,
      skills,
      policies,
      cognitiveProvider
    });

    // Run initial health verification
    agent.transitionTo(AGENT_STATES.READY, 'Initialization complete');
    this.createdAgents.set(agent.id, agent);

    if (this.eventBus) {
      this.eventBus.emit('agent.factory.created', agent.toJSON());
    }

    return agent;
  }

  createEngineer(name = 'FENIX-ENGINEER-01', options = {}) {
    return this.createAgent({
      id: 'FENIX-ENGINEER-01',
      name,
      role: 'engineer',
      domain: 'software_engineering',
      capabilities: ['code.read', 'code.write', 'git.commit', 'testing.execute', 'ast.analyze'],
      permissions: ['read', 'write', 'execute'],
      skills: ['git-sync-audit', 'build-project', 'run-tests'],
      ...options
    });
  }

  createQA(name = 'FENIX-QA-01', options = {}) {
    return this.createAgent({
      id: 'FENIX-QA-01',
      name,
      role: 'qa',
      domain: 'quality_assurance',
      capabilities: ['test.run', 'browser.inspect', 'evidence.verify', 'regression.detect'],
      permissions: ['read', 'execute'],
      skills: ['smoke-audit', 'contract-verify'],
      ...options
    });
  }

  createTeam({ name = 'Core Engineering Unit', members = [] } = {}) {
    const defaultMembers = members.length > 0 ? members : [
      this.createEngineer(),
      this.createQA()
    ];
    return new AgentTeam({
      name,
      leader: defaultMembers[0],
      members: defaultMembers
    });
  }
}

module.exports = { AgentFactory, AgentTeam };
