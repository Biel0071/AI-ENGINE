class FederationProjection {
  constructor({ events, memory, knowledgeGraph }) { this.events = events; this.memory = memory; this.graph = knowledgeGraph; }
  attach() {
    this.events.subscribe('knowledge.published', async (event) => {
      const data = event.data;
      const memory = await this.memory.remember(event.tenantId, data.actorId, { kind: data.scope.projectId ? 'project' : (data.scope.orgId ? 'organization' : 'semantic'), projectId: data.scope.projectId || null, orgId: data.scope.orgId || null, title: data.topic, content: data.statement, stableKey: `federated:${data.publisherId}:${data.key}`, confidence: data.confidence, classification: data.classification, tags: ['federated', data.publisherId], provenance: { type: 'federated-event', reference: `event:${event.id}`, evidence: data.provenance.evidence || [] } });
      await this.graph.upsertEntity(event.tenantId, data.actorId, { type: 'knowledge', key: data.key, label: data.topic, attributes: { publisherId: data.publisherId, memoryId: memory.id, facts: data.facts }, confidence: data.confidence, provenance: { type: 'federated-event', reference: `event:${event.id}` } });
    }); return this;
  }
}
module.exports = { FederationProjection };
