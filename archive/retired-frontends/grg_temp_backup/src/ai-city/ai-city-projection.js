const crypto = require('node:crypto');

const LEVELS = Object.freeze(['TENANT', 'CITY', 'DISTRICT', 'BUILDING', 'FLOOR', 'ROOM', 'SYSTEM', 'SERVICE', 'PROCESS', 'EVENT']);

function keyPart(value) {
  return String(value || 'unknown').trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
}
function nodeId(tenantId, type, key) {
  return `city_${crypto.createHash('sha256').update(`${tenantId}|${type}|${key}`).digest('hex').slice(0, 24)}`;
}
function eventStatus(event) {
  const explicit = String(event.data?.status || event.data?.resource?.status || '').toUpperCase();
  if (['FAILED', 'ERROR', 'CRITICAL', 'OFFLINE', 'MISSING'].includes(explicit) || /failed|error|missing/.test(event.type)) return 'DEGRADED';
  if (['PAUSED', 'WARNING', 'DEGRADED'].includes(explicit)) return 'WARNING';
  return 'ACTIVE';
}
function placement(event) {
  const resourceType = keyPart(String(event.stream).split(':')[0]);
  const city = event.data?.city || {};
  const district = keyPart(city.district || ({ knowledge: 'knowledge', discovery: 'infrastructure', rollback: 'governance', service: 'services' }[resourceType]) || 'operations');
  const building = keyPart(city.building || event.data?.name || event.subject || resourceType);
  const floor = keyPart(({ database: 'data', container: 'runtime', api: 'integration', knowledge: 'cognitive', service: 'services' }[resourceType]) || resourceType);
  return [
    ['TENANT', keyPart(event.tenantId), event.tenantId],
    ['CITY', 'fenix', 'GRG FÊNIX'],
    ['DISTRICT', district, district],
    ['BUILDING', building, event.data?.name || building],
    ['FLOOR', floor, floor],
    ['ROOM', keyPart(event.source), event.source],
    ['SYSTEM', keyPart(event.data?.systemType || resourceType), event.data?.systemType || resourceType],
    ['SERVICE', keyPart(event.subject || event.stream), event.subject || event.stream],
    ['PROCESS', keyPart(event.type), event.type],
    ['EVENT', event.id, event.type],
  ];
}

class AICityProjection {
  constructor({ store, controlPlane, events, eventStore, bus }) {
    this.store = store; this.cp = controlPlane; this.events = events; this.eventStore = eventStore; this.bus = bus;
    this.unsubscribe = null;
  }
  attach() {
    if (!this.unsubscribe) this.unsubscribe = this.events.subscribe('fabric.event', (event) => this.apply(event));
    return this;
  }
  async apply(event, options = {}) {
    const chain = placement(event);
    const status = eventStatus(event);
    await this.store.update((state) => {
      let parentId = null;
      for (const [type, key, label] of chain) {
        const qualifiedKey = `${parentId || 'root'}:${key}`;
        const id = nodeId(event.tenantId, type, qualifiedKey);
        let node = state.cityNodes.find((item) => item.id === id);
        if (!node) {
          node = { id, tenantId: event.tenantId, type, key, label: String(label), parentId, status, metrics: { eventCount: 0 }, createdAt: event.occurredAt };
          state.cityNodes.push(node);
        }
        node.label = String(label); node.status = status; node.updatedAt = event.occurredAt;
        node.lastEventId = event.id; node.metrics.eventCount += 1; node.metrics.lastEventAt = event.occurredAt;
        if (parentId) {
          const edgeId = nodeId(event.tenantId, 'EDGE', `${parentId}:${id}`);
          if (!state.cityEdges.some((item) => item.id === edgeId)) state.cityEdges.push({ id: edgeId, tenantId: event.tenantId, fromId: parentId, toId: id, type: 'CONTAINS', createdAt: event.occurredAt });
        }
        parentId = id;
      }
      let projection = state.cityProjectionStates.find((item) => item.tenantId === event.tenantId);
      if (!projection) { projection = { tenantId: event.tenantId, eventCount: 0, rebuiltAt: null }; state.cityProjectionStates.push(projection); }
      projection.eventCount += 1; projection.lastEventId = event.id; projection.updatedAt = event.recordedAt;
      return state;
    });
    if (options.emit !== false) await this.bus.emit('city.updated', { tenantId: event.tenantId, sourceEventId: event.id, status });
  }
  async map(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'fabric:read');
    const state = await this.store.read();
    const nodes = state.cityNodes.filter((item) => item.tenantId === tenantId);
    const edges = state.cityEdges.filter((item) => item.tenantId === tenantId);
    const status = nodes.some((item) => item.status === 'DEGRADED') ? 'DEGRADED' : nodes.some((item) => item.status === 'WARNING') ? 'WARNING' : 'ACTIVE';
    return { hierarchy: LEVELS, status, nodes, edges, projection: state.cityProjectionStates.find((item) => item.tenantId === tenantId) || null };
  }
  async rebuild(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'security:manage');
    const events = await this.eventStore.list(tenantId, { limit: 1000 });
    await this.store.update((state) => {
      state.cityNodes = state.cityNodes.filter((item) => item.tenantId !== tenantId);
      state.cityEdges = state.cityEdges.filter((item) => item.tenantId !== tenantId);
      state.cityProjectionStates = state.cityProjectionStates.filter((item) => item.tenantId !== tenantId);
      return state;
    });
    for (const event of events) await this.apply(event, { emit: false });
    await this.store.update((state) => {
      const projection = state.cityProjectionStates.find((item) => item.tenantId === tenantId);
      if (projection) projection.rebuiltAt = new Date().toISOString();
      return state;
    });
    return this.map(tenantId, actorId);
  }
}

module.exports = { AICityProjection, LEVELS, placement, eventStatus, nodeId };
