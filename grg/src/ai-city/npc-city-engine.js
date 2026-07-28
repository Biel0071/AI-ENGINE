const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class NpcCityEngine {
  constructor({ store, bus, controlPlane, agentSwarm, masterAvatar, digitalTwin }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.agentSwarm = agentSwarm;
    this.masterAvatar = masterAvatar;
    this.digitalTwin = digitalTwin;
  }

  async listNpcAgents(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const specialists = this.agentSwarm ? this.agentSwarm.specialists : [];

    const npcs = specialists.map((s, idx) => ({
      id: s.id,
      name: s.name,
      domain: s.domain,
      role: s.role,
      district: idx < 4 ? 'Central Core' : idx < 8 ? 'Infrastructure' : idx < 12 ? 'Intelligence' : 'Operations',
      position: { x: (idx % 4) * 120 + 40, y: Math.floor(idx / 4) * 100 + 30 },
      status: 'IDLE_OBSERVING',
      queueCount: 0,
      interactive: true,
    }));

    return { npcs, total: npcs.length };
  }

  async chatWithNpc(tenantId, actorId, npcId, message = '') {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    if (!message) throw new ValidationError('Message to NPC is required');

    const specialists = this.agentSwarm ? this.agentSwarm.specialists : [];
    const npc = specialists.find((s) => s.id === npcId || s.domain === npcId);
    if (!npc) throw new NotFoundError(`NPC Subagent not found: ${npcId}`);

    let dispatchedEvent = null;
    if (this.agentSwarm) {
      dispatchedEvent = await this.agentSwarm.dispatchEvent(tenantId, actorId, {
        targetAgent: npc.id,
        type: 'npc.user.chat',
        data: { message, prompt: message },
      });
    }

    const reply = `[NPC ${npc.name} (${npc.role})]: Recebi sua solicitação ("${message}"). Registrei no barramento de eventos do FÊNIX e notifiquei o Avatar Mestre.`;

    if (this.masterAvatar && typeof this.masterAvatar.reportAction === 'function') {
      await this.masterAvatar.reportAction(`Conversou com NPC ${npc.name}: ${message.slice(0, 50)}`);
    }

    return {
      npcId: npc.id,
      npcName: npc.name,
      userMessage: message,
      npcReply: reply,
      eventId: dispatchedEvent ? dispatchedEvent.id : null,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { NpcCityEngine };
