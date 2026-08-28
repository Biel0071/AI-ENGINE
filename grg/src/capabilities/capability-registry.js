const { uuid } = require('../kernel/ids');
const { ConflictError, NotFoundError, ValidationError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');

const ID = /^[a-z][a-z0-9.-]{2,80}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/;
const BUILT_INS = Object.freeze([
  ['memory', 'Memory Capability', 'Memória cognitiva persistente, versionada e pesquisável', ['memory:read', 'memory:write'], ['postgresql', 'qdrant'], []],
  ['knowledge', 'Knowledge Capability', 'Knowledge Graph temporal e busca semântica', ['graph:read', 'graph:write'], ['postgresql', 'qdrant'], []],
  ['runtime', 'Runtime Capability', 'Jobs, workers, scheduler, retry, DLQ e heartbeats', ['runtime:read', 'runtime:execute'], ['redis', 'docker'], ['project.orchestrate']],
  ['security', 'Security Capability', 'RBAC, ABAC, sessões, auditoria, políticas e aprovações', ['security:manage', 'audit:read'], ['postgresql', 'redis'], []],
  ['discovery', 'Discovery Capability', 'Inventário autorizado de infraestrutura e serviços', ['discovery:read', 'discovery:scan'], ['docker'], ['discovery.scan']],
  ['software-factory', 'Software Factory Capability', 'Planejamento e geração de sistemas executáveis', ['factory:generate'], ['runtime', 'object-storage'], ['factory.generate']],
  ['ai-city', 'AI City Capability', 'Projeção viva e reconstruível do Event Store', ['fabric:read'], ['event-store'], []],
  ['versioning', 'Version Engine Capability', 'Histórico global, diff e rollback governado', ['event:read'], ['event-store'], []],
  ['cognitive-core', 'Cognitive Core Capability', 'Loop cognitivo governado e explicável', ['governance:read', 'governance:approve'], ['event-store', 'runtime'], ['cognitive.cycle']],
]);

class CapabilityRegistry {
  constructor({ store, controlPlane, registry, events, bus }) { this.store = store; this.cp = controlPlane; this.registry = registry; this.events = events; this.bus = bus; this.unsubscribers = []; }
  attach() {
    this.unsubscribers.push(this.bus.on('tenant.created', (message) => this.bootstrap(message.payload.tenantId, message.payload.actorId)));
    for (const status of ['succeeded', 'failed', 'dead_letter', 'cancelled']) this.unsubscribers.push(this.events.subscribe(`runtime.job.${status}`, (event) => this.recordRuntimeEvent(event)));
    return this;
  }
  async bootstrap(tenantId, actorId) {
    for (const [id, name, description, permissions, resources, runtimeJobTypes] of BUILT_INS) {
      await this.register(tenantId, actorId, { id, name, description, version: '1.0.0', permissions, resources, runtimeJobTypes, cpuMillicores: 100, memoryMb: 128, owner: 'GRG FÊNIX', documentation: [`docs/capabilities/${id}.md`], tests: [`test/${id}.test.js`], dependencies: [] });
    }
  }
  async register(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'capability:manage');
    const manifest = normalize(input); let current;
    const state = await this.store.read();
    const dependencies = manifest.dependencies.map((id) => state.capabilityDefinitions.find((item) => item.tenantId === tenantId && item.capabilityId === id && item.state === 'ACTIVE'));
    if (dependencies.some((item) => !item)) throw new ValidationError('capability dependencies must already be registered');
    const existing = state.capabilityDefinitions.find((item) => item.tenantId === tenantId && item.capabilityId === manifest.id);
    if (existing?.version === manifest.version) return existing;
    if (existing && compareVersions(manifest.version, existing.version) <= 0) throw new ConflictError('capability version must increase');
    const resource = await this.registry.register(tenantId, actorId, { id: `capability:${manifest.id}`, kind: 'capability', name: manifest.name, version: manifest.version, identity: { id: `fenix-capability://${tenantId}/${manifest.id}` }, capabilities: [manifest.id], dependencies: manifest.dependencies.map((id) => `capability:${id}`), metadata: { owner: manifest.owner, permissions: manifest.permissions, resources: manifest.resources, documentation: manifest.documentation, tests: manifest.tests } });
    await this.store.update((draft) => {
      current = draft.capabilityDefinitions.find((item) => item.tenantId === tenantId && item.capabilityId === manifest.id);
      const timestamp = new Date().toISOString(); const previousVersion = current?.version || null;
      if (current) Object.assign(current, manifest, { updatedAt: timestamp, updatedBy: actorId, registryResourceId: resource.id });
      else { current = { id: uuid(), tenantId, capabilityId: manifest.id, ...manifest, registryResourceId: resource.id, health: 'UNKNOWN', metrics: { executions: 0, successes: 0, failures: 0 }, lastExecutionAt: null, createdAt: timestamp, createdBy: actorId }; draft.capabilityDefinitions.push(current); }
      draft.capabilityVersions.push({ id: uuid(), tenantId, capabilityId: manifest.id, version: manifest.version, previousVersion, snapshot: manifest, recordedAt: timestamp, recordedBy: actorId });
      return draft;
    });
    await this.events.publish({ tenantId, stream: `capability:${manifest.id}`, type: existing ? 'capability.versioned' : 'capability.registered', source: 'capability-registry', subject: manifest.id, data: { actorId, capabilityId: manifest.id, name: manifest.name, version: manifest.version, owner: manifest.owner, state: manifest.state, registryResourceId: resource.id, dependencies: manifest.dependencies, permissions: manifest.permissions, resources: manifest.resources }, idempotencyKey: `capability:${manifest.id}:${manifest.version}` });
    return current;
  }
  async recordRuntimeEvent(event) {
    const jobType = event.data.jobType; if (!jobType) return;
    await this.store.update((state) => { for (const capability of state.capabilityDefinitions.filter((item) => item.tenantId === event.tenantId && Array.isArray(item.runtimeJobTypes) && item.runtimeJobTypes.includes(jobType))) { capability.lastExecutionAt = event.occurredAt; capability.health = event.data.status === 'SUCCEEDED' ? 'HEALTHY' : 'DEGRADED'; capability.metrics.executions += 1; if (event.data.status === 'SUCCEEDED') capability.metrics.successes += 1; else capability.metrics.failures += 1; state.capabilityLogs.push({ id: uuid(), tenantId: event.tenantId, capabilityId: capability.capabilityId, level: event.data.status === 'SUCCEEDED' ? 'INFO' : 'ERROR', eventId: event.id, message: `${jobType} ${event.data.status}`, recordedAt: event.occurredAt }); } return state; });
  }
  async list(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'capability:read'); const state = await this.store.read(); return state.capabilityDefinitions.filter((item) => item.tenantId === tenantId); }
  async get(tenantId, actorId, capabilityId) { const list = await this.list(tenantId, actorId); const item = list.find((entry) => entry.capabilityId === capabilityId); if (!item) throw new NotFoundError(`capability not found: ${capabilityId}`); return item; }
  async history(tenantId, actorId, capabilityId) { await this.cp.authorize(tenantId, actorId, 'capability:read'); const state = await this.store.read(); return state.capabilityVersions.filter((item) => item.tenantId === tenantId && item.capabilityId === capabilityId); }
}

function normalize(input) { assertNoSecrets(input); const id = String(input?.id || ''); const version = String(input?.version || ''); if (!ID.test(id) || !VERSION.test(version) || !input?.name || !input?.description || !input?.owner) throw new ValidationError('capability id, name, description, semantic version and owner are required'); const dependencies = [...new Set(input.dependencies || [])]; if (dependencies.includes(id)) throw new ValidationError('capability cannot depend on itself'); return { id, name: String(input.name), description: String(input.description), version, dependencies, permissions: [...new Set(input.permissions || [])], resources: [...new Set(input.resources || [])], cpuMillicores: Math.max(10, Number(input.cpuMillicores || 100)), memoryMb: Math.max(16, Number(input.memoryMb || 128)), state: input.state || 'ACTIVE', runtimeJobTypes: [...new Set(input.runtimeJobTypes || [])], documentation: input.documentation || [], tests: input.tests || [], owner: String(input.owner), changelog: input.changelog || null }; }
function compareVersions(a, b) { const pa = a.split(/[.-]/).slice(0, 3).map(Number); const pb = b.split(/[.-]/).slice(0, 3).map(Number); for (let i = 0; i < 3; i += 1) if (pa[i] !== pb[i]) return pa[i] - pb[i]; return a.localeCompare(b); }

module.exports = { CapabilityRegistry, BUILT_INS, normalize, compareVersions };
