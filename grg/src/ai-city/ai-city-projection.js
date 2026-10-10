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
    const events = event?.type === 'fabric.events.batch' && Array.isArray(event.events) ? event.events : [event];
    const notifications = [];
    await this.store.update((state) => {
      const nodesById = new Map(state.cityNodes.map((item) => [item.id, item]));
      const edgeIds = new Set(state.cityEdges.map((item) => item.id));
      const projectionsByTenant = new Map(state.cityProjectionStates.map((item) => [item.tenantId, item]));
      for (const sourceEvent of events) {
        const chain = placement(sourceEvent);
        const status = eventStatus(sourceEvent);
        let parentId = null;
        for (const [type, key, label] of chain) {
          const qualifiedKey = `${parentId || 'root'}:${key}`;
          const id = nodeId(sourceEvent.tenantId, type, qualifiedKey);
          let node = nodesById.get(id);
          if (!node) {
            node = { id, tenantId: sourceEvent.tenantId, type, key, label: String(label), parentId, status, metrics: { eventCount: 0 }, createdAt: sourceEvent.occurredAt };
            state.cityNodes.push(node);
            nodesById.set(id, node);
          }
          node.label = String(label); node.status = status; node.updatedAt = sourceEvent.occurredAt;
          node.lastEventId = sourceEvent.id; node.metrics.eventCount += 1; node.metrics.lastEventAt = sourceEvent.occurredAt;
          if (parentId) {
            const edgeId = nodeId(sourceEvent.tenantId, 'EDGE', `${parentId}:${id}`);
            if (!edgeIds.has(edgeId)) {
              state.cityEdges.push({ id: edgeId, tenantId: sourceEvent.tenantId, fromId: parentId, toId: id, type: 'CONTAINS', createdAt: sourceEvent.occurredAt });
              edgeIds.add(edgeId);
            }
          }
          parentId = id;
        }
        let projection = projectionsByTenant.get(sourceEvent.tenantId);
        if (!projection) { projection = { tenantId: sourceEvent.tenantId, eventCount: 0, rebuiltAt: null }; state.cityProjectionStates.push(projection); projectionsByTenant.set(sourceEvent.tenantId, projection); }
        projection.eventCount += 1; projection.lastEventId = sourceEvent.id; projection.updatedAt = sourceEvent.recordedAt;
        notifications.push({ type: 'city.updated', payload: { tenantId: sourceEvent.tenantId, sourceEventId: sourceEvent.id, status } });
      }
      return state;
    });
    if (options.emit !== false) {
      if (typeof this.bus.emitBatch === 'function') await this.bus.emitBatch(notifications);
      else for (const notification of notifications) await this.bus.emit(notification.type, notification.payload);
    }
    return events.length === 1 ? notifications[0] : notifications;
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
