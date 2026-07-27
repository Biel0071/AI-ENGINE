const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');
class DiscoveryNetwork {
  constructor({ store, controlPlane, events, probes = [] }) { this.store = store; this.cp = controlPlane; this.events = events; this.probes = probes; }
  async scan(tenantId, actorId, options = {}) {
    await this.cp.authorize(tenantId, actorId, 'discovery:scan');
    const allowed = options.probes?.length ? new Set(options.probes) : null;
    const selected = this.probes.filter((probe) => !allowed || allowed.has(probe.name));
    if (allowed && selected.length !== allowed.size) throw new ValidationError('one or more requested discovery probes are not authorized');
    const scan = { id: uuid(), tenantId, status: 'RUNNING', probes: selected.map((probe) => probe.name), startedAt: now(), startedBy: actorId };
    await this.store.update(async (state) => { state.discoveryScans.push(scan); return state; });
    try {
      const batches = await Promise.all(selected.map(async (probe) => ({ probe: probe.name, resources: await probe.scan({ tenantId, scanId: scan.id }) })));
      const resources = batches.flatMap((batch) => batch.resources.map((item) => normalize(batch.probe, item)));
      const events = [];
      await this.store.update(async (state) => {
        const selectedNames = new Set(selected.map((probe) => probe.name));
        const previous = state.discoveredResources.filter((item) => item.tenantId === tenantId && selectedNames.has(item.probe));
        const seen = new Set();
        for (const resource of resources) {
          const key = `${resource.kind}:${resource.externalId}`; seen.add(key);
          let current = previous.find((item) => item.key === key);
          const type = !current ? 'discovery.resource.detected' : (JSON.stringify(current.attributes) !== JSON.stringify(resource.attributes) ? 'discovery.resource.changed' : null);
          if (!current) { current = { id: uuid(), tenantId, key, ...resource, status: 'PRESENT', firstSeenAt: now() }; state.discoveredResources.push(current); }
          else Object.assign(current, resource, { status: 'PRESENT', lastSeenAt: now() });
          if (type) events.push({ type, resource: current });
        }
        for (const current of previous) if (!seen.has(current.key) && current.status === 'PRESENT') { current.status = 'MISSING'; current.missingAt = now(); events.push({ type: 'discovery.resource.missing', resource: current }); }
        const record = state.discoveryScans.find((item) => item.id === scan.id); record.status = 'COMPLETED'; record.completedAt = now(); record.resourceCount = resources.length; scan.status = record.status; scan.resourceCount = record.resourceCount;
        return state;
      });
      for (const change of events) await this.events.publish({ tenantId, stream: `discovery:${change.resource.key}`, type: change.type, source: 'fenix-discovery-network', subject: change.resource.key, idempotencyKey: `${scan.id}:${change.type}:${change.resource.key}`, data: { actorId, scanId: scan.id, resource: publicResource(change.resource) } });
      return { scan, resources, changes: events.length };
    } catch (error) { await this.store.update(async (state) => { const record = state.discoveryScans.find((item) => item.id === scan.id); record.status = 'FAILED'; record.failureCode = error.code || error.name; record.failedAt = now(); return state; }); throw error; }
  }
  async inventory(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'discovery:read'); const state = await this.store.read(); return state.discoveredResources.filter((item) => item.tenantId === tenantId); }
}
function normalize(probe, item) { if (!item?.kind || !item?.externalId) throw new ValidationError(`probe ${probe} returned an invalid resource`); assertNoSecrets(item); return { probe, kind: String(item.kind), externalId: String(item.externalId), name: String(item.name || item.externalId), version: String(item.version || 'discovered'), attributes: item.attributes || {}, endpoints: item.endpoints || [], capabilities: item.capabilities || [], dependencies: item.dependencies || [], lastSeenAt: now() }; }
function publicResource(item) { return { key: item.key, kind: item.kind, externalId: item.externalId, name: item.name, version: item.version, attributes: item.attributes, endpoints: item.endpoints, capabilities: item.capabilities, dependencies: item.dependencies, status: item.status, probe: item.probe }; }
function now() { return new Date().toISOString(); }
module.exports = { DiscoveryNetwork, normalize };
