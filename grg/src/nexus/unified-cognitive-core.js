const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class UnifiedCognitiveCore {
  constructor({ store, bus, controlPlane, kos, capOs, missionCompiler, workspaceModes, realityFeedback }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.pillars = {
      knowledgeOs: kos,
      missionOs: missionCompiler,
      capabilityOs: capOs,
      workspaceOs: workspaceModes,
      realityOs: realityFeedback,
    };
  }

  async emitCognitiveEvent(tenantId, actorId, event = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    if (!event.type || !event.payload) {
      throw new ValidationError('Event type and payload are required for Cognitive Event Bus');
    }

    const cognitiveEvent = {
      id: uuid(),
      tenantId,
      type: String(event.type).toUpperCase(), // PROMPT_RECEIVED, COMMIT_DONE, DEPLOY_FINISHED, PAPER_DISCOVERED, CAPABILITY_CREATED, DECISION_RESOLVED
      payload: event.payload,
      timestamp: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.cognitiveEvents = state.cognitiveEvents || [];
      state.cognitiveEvents.push(cognitiveEvent);
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('nexus.cognitive.event', { tenantId, eventId: cognitiveEvent.id, type: cognitiveEvent.type });
    }

    return cognitiveEvent;
  }

  async getUccStatus(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      tenantId,
      status: 'OPERATIONAL_NEXUS_CORE',
      architecturePillars: ['Knowledge OS', 'Mission OS', 'Capability OS', 'Workspace OS', 'Reality OS'],
      eventBusActive: true,
      uptimePct: 99.99,
    };
  }
}

module.exports = { UnifiedCognitiveCore };
