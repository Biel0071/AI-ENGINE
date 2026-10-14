const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class KnowledgeGraph {
  constructor({ store, bus, controlPlane }) { this.store = store; this.bus = bus; this.cp = controlPlane; }

  async upsertEntity(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'graph:write');
    if (!input?.type || !input?.key || !input?.provenance?.reference) throw new ValidationError('entity type, key and provenance are required');
    let entity;
    await this.store.update(async (state) => {
      entity = state.knowledgeEntities.find((item) => item.tenantId === tenantId && item.type === input.type && item.key === input.key && item.status === 'ACTIVE');
      if (entity) Object.assign(entity, { attributes: input.attributes || {}, confidence: Number(input.confidence ?? entity.confidence), provenance: input.provenance, version: entity.version + 1, updatedAt: now(), updatedBy: actorId });
      else {
        entity = { id: uuid(), tenantId, type: String(input.type), key: String(input.key), label: String(input.label || input.key), attributes: input.attributes || {}, confidence: Number(input.confidence ?? 0.5), provenance: input.provenance, version: 1, status: 'ACTIVE', createdAt: now(), createdBy: actorId, updatedAt: now() };
        state.knowledgeEntities.push(entity);
      }
      return state;
    });
    await this.bus.emit('graph.entity_upserted', { tenantId, entityId: entity.id, type: entity.type, actorId });
    return entity;
  }

  async relate(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'graph:write');
    if (!input?.fromId || !input?.toId || !input?.type || !input?.provenance?.reference) throw new ValidationError('relationship endpoints, type and provenance are required');
    let relationship;
    await this.store.update(async (state) => {
      const ids = new Set(state.knowledgeEntities.filter((item) => item.tenantId === tenantId && item.status === 'ACTIVE').map((item) => item.id));
      if (!ids.has(input.fromId) || !ids.has(input.toId)) throw new NotFoundError('relationship endpoint not found in tenant');
      const stable = `${input.fromId}|${input.type}|${input.toId}`;
      const fingerprint = crypto.createHash('sha256').update(JSON.stringify(input.attributes || {})).digest('hex');
      const current = state.knowledgeRelationships.find((item) => item.tenantId === tenantId && item.stableKey === stable && !item.validTo);
      if (current?.fingerprint === fingerprint) { relationship = current; return state; }
      if (current) current.validTo = now();
      relationship = { id: uuid(), tenantId, fromId: input.fromId, toId: input.toId, type: String(input.type), attributes: input.attributes || {}, confidence: Number(input.confidence ?? 0.5), provenance: input.provenance, stableKey: stable, fingerprint, validFrom: now(), validTo: null, createdBy: actorId };
      state.knowledgeRelationships.push(relationship);
      return state;
    });
    await this.bus.emit('graph.relationship_upserted', { tenantId, relationshipId: relationship.id, type: relationship.type, actorId });
    return relationship;
  }

  async neighborhood(tenantId, actorId, entityId, depth = 1) {
    await this.cp.authorize(tenantId, actorId, 'graph:read');
    const state = await this.store.read();
    const entities = state.knowledgeEntities.filter((item) => item.tenantId === tenantId && item.status === 'ACTIVE');
    if (!entities.some((item) => item.id === entityId)) throw new NotFoundError('entity not found');
    const relationships = state.knowledgeRelationships.filter((item) => item.tenantId === tenantId && !item.validTo);
    const visited = new Set([entityId]); let frontier = [entityId];
    for (let level = 0; level < Math.min(5, Math.max(0, Number(depth))); level += 1) {
      const next = [];
      for (const edge of relationships) if (frontier.includes(edge.fromId) || frontier.includes(edge.toId)) {
        for (const id of [edge.fromId, edge.toId]) if (!visited.has(id)) { visited.add(id); next.push(id); }
      }
      frontier = next;
    }
    return { entities: entities.filter((item) => visited.has(item.id)), relationships: relationships.filter((item) => visited.has(item.fromId) && visited.has(item.toId)) };
  }

  async shortestPath(tenantId, actorId, fromId, toId) {
    const graph = await this.neighborhood(tenantId, actorId, fromId, 5);
    const adjacency = new Map();
    for (const edge of graph.relationships) { (adjacency.get(edge.fromId) || adjacency.set(edge.fromId, []).get(edge.fromId)).push({ id: edge.toId, edge }); }
    const queue = [{ id: fromId, nodes: [fromId], edges: [] }]; const seen = new Set([fromId]);
    while (queue.length) { const path = queue.shift(); if (path.id === toId) return path; for (const next of adjacency.get(path.id) || []) if (!seen.has(next.id)) { seen.add(next.id); queue.push({ id: next.id, nodes: [...path.nodes, next.id], edges: [...path.edges, next.edge.id] }); } }
    return null;
  }

  async anomalies(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'graph:read');
    const state = await this.store.read(); const ids = new Set(state.knowledgeEntities.filter((item) => item.tenantId === tenantId && item.status === 'ACTIVE').map((item) => item.id));
    const active = state.knowledgeRelationships.filter((item) => item.tenantId === tenantId && !item.validTo); const issues = [];
    for (const edge of active) { if (!ids.has(edge.fromId) || !ids.has(edge.toId)) issues.push({ type: 'DANGLING', relationshipId: edge.id }); if (edge.fromId === edge.toId) issues.push({ type: 'SELF_LOOP', relationshipId: edge.id }); }
    return issues;
  }

  async impact(tenantId, actorId, entityId, depth = 3) {
    await this.cp.authorize(tenantId, actorId, 'graph:read');
    const state = await this.store.read();
    const entities = new Map(state.knowledgeEntities.filter((item) => item.tenantId === tenantId && item.status === 'ACTIVE').map((item) => [item.id, item]));
    if (!entities.has(entityId)) throw new NotFoundError('entity not found');
    const edges = state.knowledgeRelationships.filter((item) => item.tenantId === tenantId && !item.validTo);
    const impacts = []; const best = new Map([[entityId, 1]]); let frontier = [{ id: entityId, score: 1 }];
    for (let level = 1; level <= Math.min(5, Number(depth)); level += 1) {
      const next = [];
      for (const current of frontier) for (const edge of edges.filter((item) => item.fromId === current.id)) {
        const score = current.score * edge.confidence;
        if (score > (best.get(edge.toId) || 0)) { best.set(edge.toId, score); impacts.push({ entity: entities.get(edge.toId), via: edge.id, depth: level, score: Number(score.toFixed(6)) }); next.push({ id: edge.toId, score }); }
      }
      frontier = next;
    }
    return impacts.filter((item) => item.entity).sort((a, b) => b.score - a.score);
  }
}
function now() { return new Date().toISOString(); }
module.exports = { KnowledgeGraph };
