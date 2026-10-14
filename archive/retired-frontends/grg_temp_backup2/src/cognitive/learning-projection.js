class CognitiveLearningProjection {
  constructor({ events, memory, knowledgeGraph, actorResolver }) {
    this.events = events;
    this.memory = memory;
    this.graph = knowledgeGraph;
    this.actorResolver = actorResolver;
  }

  attach() {
    this.events.subscribe('cognitive.learning.recorded', async (event) => {
      const data = event.data;
      const actorId = await this.actorResolver(event.tenantId, data.hypothesisId);
      const provenance = {
        type: 'cognitive-event',
        reference: `event:${event.id}`,
        evidence: data.evidence,
      };

      await this.memory.remember(event.tenantId, actorId, {
        kind: 'semantic',
        stableKey: `hypothesis:${data.hypothesisId}`,
        content: `${data.description}. ${data.reflection.join('. ')}`,
        confidence: data.confidence,
        provenance,
      });

      await this.graph.upsertEntity(event.tenantId, actorId, {
        type: 'hypothesis',
        key: data.hypothesisId,
        label: data.description,
        attributes: {
          success: data.success,
          reflection: data.reflection,
        },
        confidence: data.confidence,
        provenance,
      });
    });

    return this;
  }
}

module.exports = { CognitiveLearningProjection };
