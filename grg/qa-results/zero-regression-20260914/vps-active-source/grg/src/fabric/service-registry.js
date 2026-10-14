const { uuid, slugify } = require('../kernel/ids');
const { ValidationError, ConflictError, NotFoundError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');
const KINDS = new Set(['service', 'api', 'database', 'container', 'worker', 'agent', 'tool', 'template', 'plugin', 'skill', 'mcp-server', 'ai-model', 'prompt', 'policy', 'secret-ref', 'capability']);
class ServiceRegistry {
  constructor({ store, controlPlane }) { this.store = store; this.cp = controlPlane; }
  async register(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'registry:write');
    if (!KINDS.has(input?.kind)) throw new ValidationError(`unsupported registry kind: ${input?.kind}`);
    if (!input?.name || !input?.version || !input?.identity?.id) throw new ValidationError('registry name, version and identity are required');
    assertNoSecrets({ endpoints: input.endpoints, capabilities: input.capabilities, dependencies: input.dependencies, metadata: input.metadata });
    const id = input.id || `${input.kind}:${slugify(input.name)}`; let resource;
    await this.store.update(async (state) => {
      resource = state.serviceRegistry.find((item) => item.tenantId === tenantId && item.id === id);
      if (resource && resource.identity.id !== input.identity.id) throw new ConflictError('registry identity cannot be replaced');
      const snapshot = { version: input.version, endpoints: input.endpoints || [], capabilities: input.capabilities || [], dependencies: input.dependencies || [], metadata: input.metadata || {}, recordedAt: new Date().toISOString(), recordedBy: actorId };
      if (resource) Object.assign(resource, snapshot, { status: input.status || 'ACTIVE', updatedAt: snapshot.recordedAt });
      else { resource = { id, tenantId, kind: input.kind, name: input.name, identity: input.identity, ...snapshot, status: input.status || 'ACTIVE', createdAt: snapshot.recordedAt }; state.serviceRegistry.push(resource); }
      if (!state.serviceVersions.some((item) => item.tenantId === tenantId && item.resourceId === id && item.version === input.version)) state.serviceVersions.push({ id: uuid(), tenantId, resourceId: id, ...snapshot });
      return state;
    }); return resource;
  }
  async get(tenantId, actorId, id) { await this.cp.authorize(tenantId, actorId, 'registry:read'); const state = await this.store.read(); const item = state.serviceRegistry.find((entry) => entry.tenantId === tenantId && entry.id === id); if (!item) throw new NotFoundError('registry resource not found'); return item; }
  async list(tenantId, actorId, options = {}) { await this.cp.authorize(tenantId, actorId, 'registry:read'); const state = await this.store.read(); return state.serviceRegistry.filter((item) => item.tenantId === tenantId && (!options.kind || item.kind === options.kind)); }
  async heartbeat(tenantId, id, identityId, status = 'READY') { let item; await this.store.update(async (state) => { item = state.serviceRegistry.find((entry) => entry.tenantId === tenantId && entry.id === id && entry.identity.id === identityId); if (!item) throw new NotFoundError('registry identity not found'); item.runtimeStatus = status; item.lastSeenAt = new Date().toISOString(); return state; }); return item; }
}
module.exports = { ServiceRegistry, KINDS };
