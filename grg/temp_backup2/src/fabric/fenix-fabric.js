const crypto = require('node:crypto');
const { slugify, uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class FenixFabric {
  constructor({ store, controlPlane, registry, events, identityProvider }) { this.store = store; this.cp = controlPlane; this.registry = registry; this.events = events; this.identityProvider = identityProvider; }
  async enroll(tenantId, actorId, manifest) {
    await this.cp.authorize(tenantId, actorId, 'fabric:enroll');
    if (!manifest?.name || !manifest?.version) throw new ValidationError('fabric manifest name and version are required');
    const serviceId = manifest.id || `service:${slugify(manifest.name)}`;
    const key = manifest.idempotencyKey || crypto.createHash('sha256').update(`${tenantId}|${serviceId}|${manifest.version}`).digest('hex');
    const state = await this.store.read(); const existing = state.fabricEnrollments.find((item) => item.tenantId === tenantId && item.idempotencyKey === key);
    if (existing?.status === 'ACTIVE') return { enrollment: existing, resource: await this.registry.get(tenantId, actorId, serviceId), credentials: null, replayed: true };
    const issued = existing?.identity ? null : this.identityProvider.issue(tenantId, serviceId);
    const storedIdentity = existing?.identity || { id: issued.identity, publicKey: issued.publicKey, fingerprint: issued.fingerprint, credentialRef: issued.credentialRef, expiresAt: issued.expiresAt };
    let enrollment = existing;
    if (!enrollment) { enrollment = { id: uuid(), tenantId, serviceId, idempotencyKey: key, identity: storedIdentity, status: 'ENROLLING', steps: [], createdAt: now(), createdBy: actorId }; await this.store.update(async (draft) => { draft.fabricEnrollments.push(enrollment); return draft; }); }
    try {
      const resource = await this.registry.register(tenantId, actorId, { id: serviceId, kind: 'service', name: manifest.name, version: manifest.version, identity: storedIdentity, endpoints: manifest.endpoints || [], capabilities: manifest.capabilities || [], dependencies: manifest.dependencies || [], metadata: { systemType: manifest.systemType || 'service', documentation: manifest.documentation || null, city: manifest.city || {} } });
      const event = await this.events.publish({ tenantId, stream: `service:${serviceId}`, type: 'fabric.service.registered', source: 'fenix-fabric', subject: serviceId, idempotencyKey: `fabric-register:${key}`, data: { actorId, serviceId, name: manifest.name, version: manifest.version, systemType: manifest.systemType || 'service', capabilities: resource.capabilities, endpoints: resource.endpoints, dependencies: resource.dependencies, identity: { id: storedIdentity.id, fingerprint: storedIdentity.fingerprint }, observability: { logs: true, metrics: true, traces: true }, city: manifest.city || {} } });
      await this.store.update(async (draft) => { const item = draft.fabricEnrollments.find((entry) => entry.id === enrollment.id); item.status = 'ACTIVE'; item.activatedAt = now(); item.eventId = event.id; item.steps = ['IDENTITY_ISSUED', 'REGISTRY_ACTIVE', 'EVENT_PUBLISHED', 'KNOWLEDGE_PROJECTED', 'OBSERVABILITY_DECLARED', 'CITY_DECLARED']; enrollment = item; return draft; });
      return { enrollment, resource, credentials: issued ? { privateKey: issued.privateKey, credentialRef: issued.credentialRef, developmentOnly: issued.developmentOnly } : null, replayed: false };
    } catch (error) { await this.store.update(async (draft) => { const item = draft.fabricEnrollments.find((entry) => entry.id === enrollment.id); item.status = 'FAILED'; item.failureCode = error.code || error.name; item.failedAt = now(); return draft; }); throw error; }
  }
  async list(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'fabric:read'); const state = await this.store.read(); return state.fabricEnrollments.filter((item) => item.tenantId === tenantId); }
}
function now() { return new Date().toISOString(); }
module.exports = { FenixFabric };
