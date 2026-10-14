const { uuid, slugify } = require('../kernel/ids');
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require('../kernel/errors');

const ENTITY_TYPES = Object.freeze(['MASTER', 'ORGANIZATION', 'COMPANY', 'STORE', 'DEPARTMENT', 'PROJECT', 'GLOBAL_SERVICE']);
const PARENTS = Object.freeze({
  MASTER: [],
  ORGANIZATION: ['MASTER'],
  COMPANY: ['MASTER', 'ORGANIZATION'],
  STORE: ['COMPANY'],
  DEPARTMENT: ['ORGANIZATION', 'COMPANY', 'STORE'],
  PROJECT: ['ORGANIZATION', 'COMPANY', 'STORE', 'DEPARTMENT'],
  GLOBAL_SERVICE: ['MASTER'],
});
const PROJECT_AGENT_ROLES = Object.freeze(['architect', 'developer', 'devops', 'qa', 'analyst', 'commercial', 'support', 'security', 'runtime']);
const TEAM_ENTITY_TYPES = new Set(['COMPANY', 'PROJECT']);

class CognitiveHierarchy {
  constructor({ store, controlPlane, bus }) {
    this.store = store; this.cp = controlPlane; this.bus = bus;
  }

  async ensureMaster(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'member:manage');
    let master;
    await this.store.update((state) => {
      master = state.cognitiveEntities.find((item) => item.tenantId === tenantId && item.type === 'MASTER');
      if (!master) {
        const tenant = state.tenants.find((item) => item.id === tenantId);
        master = entityRecord({ tenantId, type: 'MASTER', name: `${tenant?.name || tenantId} Master`, parentId: null, actorId });
        state.cognitiveEntities.push(master);
        state.cognitiveWorkspaces.push(workspaceRecord(master, actorId));
        state.cognitiveAgents.push(agentRecord(master, 'master-avatar', actorId, { coordinator: true, executionAllowed: false }));
        state.cognitiveAccessGrants.push(grantRecord(tenantId, actorId, master.id, actorId, true));
      }
      return state;
    });
    return master;
  }

  async create(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'member:manage');
    const type = String(input?.type || '').toUpperCase();
    const name = String(input?.name || '').trim();
    if (!ENTITY_TYPES.includes(type) || type === 'MASTER') throw new ValidationError(`unsupported cognitive entity type: ${type || 'empty'}`);
    if (!name) throw new ValidationError('cognitive entity name is required');
    const master = await this.ensureMaster(tenantId, actorId);
    const parentId = input.parentId || (PARENTS[type].includes('MASTER') ? master.id : null);
    if (!parentId) throw new ValidationError(`${type} requires a parent`);
    let created;
    await this.store.update((state) => {
      const parent = state.cognitiveEntities.find((item) => item.tenantId === tenantId && item.id === parentId && item.status === 'ACTIVE');
      if (!parent) throw new NotFoundError(`cognitive parent not found: ${parentId}`);
      if (!PARENTS[type].includes(parent.type)) throw new ValidationError(`${type} cannot be created under ${parent.type}`);
      const key = slugify(input.key || name);
      if (state.cognitiveEntities.some((item) => item.tenantId === tenantId && item.parentId === parentId && item.key === key && item.status === 'ACTIVE')) throw new ConflictError(`cognitive entity already exists: ${key}`);
      created = entityRecord({ tenantId, type, name, key, parentId, actorId, metadata: input.metadata });
      state.cognitiveEntities.push(created);
      state.cognitiveWorkspaces.push(workspaceRecord(created, actorId));
      state.cognitiveAccessGrants.push(grantRecord(tenantId, actorId, created.id, actorId, true));
      if (TEAM_ENTITY_TYPES.has(type)) {
        for (const role of PROJECT_AGENT_ROLES) state.cognitiveAgents.push(agentRecord(created, role, actorId));
      }
      return state;
    });
    await this.bus.emit('cognitive.entity.created', { tenantId, actorId, entityId: created.id, type: created.type, parentId: created.parentId });
    return created;
  }

  async get(tenantId, actorId, entityId) {
    await this.authorizeScope(tenantId, actorId, entityId, 'read');
    return this.getInternal(tenantId, entityId);
  }

  async list(tenantId, actorId, options = {}) {
    const accessible = await this.accessibleIds(tenantId, actorId, 'read');
    const state = await this.store.read();
    const entities = state.cognitiveEntities.filter((item) => item.tenantId === tenantId && item.status === 'ACTIVE' && (accessible === null || accessible.has(item.id)) && (!options.type || item.type === String(options.type).toUpperCase()));
    const visible = new Set(entities.map((item) => item.id));
    return { entities, workspaces: state.cognitiveWorkspaces.filter((item) => item.tenantId === tenantId && visible.has(item.entityId) && item.status === 'ACTIVE'), agents: state.cognitiveAgents.filter((item) => item.tenantId === tenantId && visible.has(item.entityId) && item.status === 'ACTIVE') };
  }

  async getInternal(tenantId, entityId) {
    const state = await this.store.read();
    const entity = state.cognitiveEntities.find((item) => item.tenantId === tenantId && item.id === entityId && item.status === 'ACTIVE');
    if (!entity) throw new NotFoundError(`cognitive entity not found: ${entityId}`);
    return entity;
  }

  async workspace(tenantId, actorId, entityId) {
    await this.authorizeScope(tenantId, actorId, entityId, 'read');
    const state = await this.store.read();
    const workspace = state.cognitiveWorkspaces.find((item) => item.tenantId === tenantId && item.entityId === entityId && item.status === 'ACTIVE');
    if (!workspace) throw new NotFoundError(`workspace not found for entity: ${entityId}`);
    return { ...workspace, agents: state.cognitiveAgents.filter((item) => item.tenantId === tenantId && item.entityId === entityId && item.status === 'ACTIVE') };
  }

  async grant(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'member:manage');
    await this.getInternal(tenantId, input.entityId);
    await this.cp.getMembership(tenantId, input.subjectId);
    const permissions = [...new Set((input.permissions || ['read']).map(String))];
    if (permissions.some((item) => !['read', 'write', 'coordinate'].includes(item))) throw new ValidationError('unsupported cognitive grant permission');
    let grant;
    await this.store.update((state) => {
      const existing = state.cognitiveAccessGrants.find((item) => item.tenantId === tenantId && item.subjectId === input.subjectId && item.entityId === input.entityId && item.status === 'ACTIVE');
      if (existing) { existing.permissions = permissions; existing.inherit = input.inherit !== false; existing.updatedAt = now(); grant = existing; }
      else { grant = grantRecord(tenantId, input.subjectId, input.entityId, actorId, input.inherit !== false, permissions); state.cognitiveAccessGrants.push(grant); }
      return state;
    });
    await this.bus.emit('cognitive.access.granted', { tenantId, actorId, subjectId: input.subjectId, entityId: input.entityId, permissions });
    return grant;
  }

  async authorizeScope(tenantId, actorId, entityId, permission = 'read') {
    const membership = await this.cp.getMembership(tenantId, actorId);
    if (['admin', 'master_admin'].includes(membership.role)) { await this.getInternal(tenantId, entityId); return membership; }
    const state = await this.store.read();
    const entity = state.cognitiveEntities.find((item) => item.tenantId === tenantId && item.id === entityId && item.status === 'ACTIVE');
    if (!entity) throw new NotFoundError(`cognitive entity not found: ${entityId}`);
    const ancestors = ancestorIds(state.cognitiveEntities, entity);
    const allowed = state.cognitiveAccessGrants.some((grant) => grant.tenantId === tenantId && grant.subjectId === actorId && grant.status === 'ACTIVE' && grant.permissions.includes(permission) && (grant.entityId === entityId || (grant.inherit && ancestors.has(grant.entityId))));
    if (!allowed) throw new ForbiddenError(`actor cannot ${permission} cognitive scope ${entityId}`);
    return membership;
  }

  async accessibleIds(tenantId, actorId, permission = 'read') {
    const membership = await this.cp.getMembership(tenantId, actorId);
    if (['admin', 'master_admin'].includes(membership.role)) return null;
    const state = await this.store.read();
    const entities = state.cognitiveEntities.filter((item) => item.tenantId === tenantId && item.status === 'ACTIVE');
    const grants = state.cognitiveAccessGrants.filter((item) => item.tenantId === tenantId && item.subjectId === actorId && item.status === 'ACTIVE' && item.permissions.includes(permission));
    return new Set(entities.filter((entity) => grants.some((grant) => grant.entityId === entity.id || (grant.inherit && ancestorIds(entities, entity).has(grant.entityId)))).map((item) => item.id));
  }

  async createSharingPolicy(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'knowledge:publish');
    await this.getInternal(tenantId, input.sourceEntityId); await this.getInternal(tenantId, input.targetEntityId);
    if (input.sourceEntityId === input.targetEntityId) throw new ValidationError('knowledge sharing policy requires different scopes');
    const policy = { id: uuid(), tenantId, sourceEntityId: input.sourceEntityId, targetEntityId: input.targetEntityId, knowledgeKinds: [...new Set((input.knowledgeKinds || ['pattern']).map(String))], classifications: [...new Set((input.classifications || ['public', 'internal']).map(String))], status: 'ACTIVE', createdBy: actorId, createdAt: now() };
    await this.store.update((state) => { state.knowledgeSharingPolicies.push(policy); return state; });
    await this.bus.emit('knowledge.sharing.policy.created', { tenantId, actorId, policyId: policy.id, sourceEntityId: policy.sourceEntityId, targetEntityId: policy.targetEntityId });
    return policy;
  }

  async authorizeShare(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'knowledge:publish');
    const state = await this.store.read();
    const allowed = state.knowledgeSharingPolicies.some((policy) => policy.tenantId === tenantId && policy.status === 'ACTIVE' && policy.sourceEntityId === input.sourceEntityId && policy.targetEntityId === input.targetEntityId && policy.knowledgeKinds.includes(input.knowledgeKind) && policy.classifications.includes(input.classification));
    if (!allowed) throw new ForbiddenError('knowledge sharing is not permitted by an active policy');
    return true;
  }
}

function entityRecord({ tenantId, type, name, key, parentId, actorId, metadata }) { return { id: uuid(), tenantId, type, key: key || slugify(name), name, parentId, identity: `fenix://${tenantId}/${type.toLowerCase()}/${key || slugify(name)}`, metadata: metadata || {}, status: 'ACTIVE', createdBy: actorId, createdAt: now() }; }
function workspaceRecord(entity, actorId) { return { id: uuid(), tenantId: entity.tenantId, entityId: entity.id, type: entity.type, identity: `${entity.identity}/workspace`, modules: ['dashboard', 'ai-city', 'digital-twin', 'memory', 'chat', 'agents', 'deploy', 'versioning', 'knowledge', 'logs', 'metrics'], status: 'ACTIVE', createdBy: actorId, createdAt: now() }; }
function agentRecord(entity, role, actorId, extra = {}) { return { id: uuid(), tenantId: entity.tenantId, entityId: entity.id, role, identity: `${entity.identity}/agent/${role}`, gateway: 'ai-gateway', status: 'ACTIVE', createdBy: actorId, createdAt: now(), ...extra }; }
function grantRecord(tenantId, subjectId, entityId, actorId, inherit = true, permissions = ['read', 'write', 'coordinate']) { return { id: uuid(), tenantId, subjectId, entityId, permissions, inherit, status: 'ACTIVE', createdBy: actorId, createdAt: now() }; }
function ancestorIds(entities, entity) { const result = new Set(); let parentId = entity.parentId; while (parentId) { if (result.has(parentId)) break; result.add(parentId); parentId = entities.find((item) => item.id === parentId)?.parentId || null; } return result; }
function now() { return new Date().toISOString(); }

module.exports = { CognitiveHierarchy, ENTITY_TYPES, PARENTS, PROJECT_AGENT_ROLES, TEAM_ENTITY_TYPES };
