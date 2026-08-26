class FabricProjection {
  constructor({ events, knowledgeGraph }) { this.events = events; this.graph = knowledgeGraph; }
  attach() {
    this.events.subscribe('fabric.service.registered', async (event) => {
      const actorId = event.data?.actorId || event._actorId;
      if (!actorId) return;
      const service = await this.graph.upsertEntity(event.tenantId, actorId, { type: 'service', key: event.data.serviceId, label: event.data.name, attributes: { version: event.data.version, systemType: event.data.systemType, endpoints: event.data.endpoints, capabilities: event.data.capabilities }, confidence: 1, provenance: { type: 'fabric-event', reference: `event:${event.id}` } });
      for (const dependency of event.data.dependencies || []) {
        const target = await this.graph.upsertEntity(event.tenantId, actorId, { type: 'dependency', key: String(dependency), label: String(dependency), confidence: 0.8, provenance: { type: 'fabric-event', reference: `event:${event.id}` } });
        await this.graph.relate(event.tenantId, actorId, { fromId: service.id, toId: target.id, type: 'DEPENDS_ON', confidence: 0.8, provenance: { type: 'fabric-event', reference: `event:${event.id}` } });
      }
    });
    return this;
  }
}
module.exports = { FabricProjection };
