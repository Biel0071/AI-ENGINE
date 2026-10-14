const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');
class KnowledgeFederation {
  constructor({ store, controlPlane, events }) { this.store = store; this.cp = controlPlane; this.events = events; }
  async publish(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'knowledge:publish');
    if (!input?.publisherId || !input?.topic || !input?.statement || !input?.provenance?.reference) throw new ValidationError('publisherId, topic, statement and provenance are required');
    assertNoSecrets(input);
    const publication = { id: uuid(), tenantId, publisherId: String(input.publisherId), topic: String(input.topic), key: String(input.key || input.topic), statement: String(input.statement).slice(0, 100_000), facts: input.facts || {}, confidence: Number(input.confidence ?? 0.5), classification: input.classification || 'internal', scope: input.scope || {}, provenance: input.provenance, status: 'PUBLISHING', createdAt: now(), createdBy: actorId };
    if (publication.confidence < 0 || publication.confidence > 1) throw new ValidationError('confidence must be between 0 and 1');
    await this.store.update(async (state) => { state.knowledgePublications.push(publication); return state; });
    try { const event = await this.events.publish({ tenantId, stream: `knowledge:${publication.publisherId}:${publication.key}`, type: 'knowledge.published', source: publication.publisherId, subject: publication.topic, idempotencyKey: input.idempotencyKey || `knowledge:${publication.id}`, classification: publication.classification, data: { actorId, publicationId: publication.id, publisherId: publication.publisherId, topic: publication.topic, key: publication.key, statement: publication.statement, facts: publication.facts, confidence: publication.confidence, classification: publication.classification, scope: publication.scope, provenance: publication.provenance } }); await this.store.update(async (state) => { const item = state.knowledgePublications.find((entry) => entry.id === publication.id); item.status = 'PROJECTED'; item.eventId = event.id; item.projectedAt = now(); return state; }); publication.status = 'PROJECTED'; publication.eventId = event.id; return publication; }
    catch (error) { await this.store.update(async (state) => { const item = state.knowledgePublications.find((entry) => entry.id === publication.id); item.status = 'FAILED'; item.failureCode = error.code || error.name; return state; }); throw error; }
  }
  async list(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'memory:read'); const state = await this.store.read(); return state.knowledgePublications.filter((item) => item.tenantId === tenantId); }
}
function now() { return new Date().toISOString(); }
module.exports = { KnowledgeFederation };
