class DiscoveryProjection {
  constructor({ events, registry }) { this.events = events; this.registry = registry; }
  attach() {
    for (const type of ['discovery.resource.detected', 'discovery.resource.changed', 'discovery.resource.missing']) this.events.subscribe(type, async (event) => { const resource = event.data.resource; const kind = ['container', 'database', 'worker', 'agent', 'api', 'service'].includes(resource.kind) ? resource.kind : 'tool'; await this.registry.register(event.tenantId, event.data.actorId, { id: `${kind}:${resource.externalId}`, kind, name: resource.name, version: resource.version, identity: { id: `discovery://${resource.probe}/${resource.externalId}` }, endpoints: resource.endpoints, capabilities: resource.capabilities, dependencies: resource.dependencies, status: resource.status === 'MISSING' ? 'MISSING' : 'ACTIVE', metadata: { discoveryKey: resource.key, attributes: resource.attributes } }); });
    return this;
  }
}
module.exports = { DiscoveryProjection };
