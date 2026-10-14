const { uuid, slugify } = require('../kernel/ids');
const { NotFoundError, ConflictError, ValidationError } = require('../kernel/errors');
const { requirePermission, permissionsFor } = require('../kernel/access-control');
const { CURRENT_SCHEMA_VERSION } = require('../kernel/state-migrations');

// Control Plane: identidade, isolamento e autorização. É a base que todos os serviços usam.
class ControlPlane {
  constructor({ store, bus }) {
    this.store = store;
    this.bus = bus;
  }

  async initialize(master = { userId: 'grg-admin', name: 'GRG Admin' }) {
    await this.store.update((state) => {
      state.schemaVersion = Math.max(state.schemaVersion || 1, CURRENT_SCHEMA_VERSION);
      const masterUserId = (master && master.userId) || 'grg-admin';

      if (!state.users.some((u) => u.id === masterUserId)) {
        state.users.push({ id: masterUserId, name: (master && master.name) || 'GRG Admin', status: 'active', createdAt: now() });
      }

      if (master && master.tenantId) {
        const masterTenantId = master.tenantId;
        if (!state.tenants.some((t) => t.id === masterTenantId)) {
          state.tenants.push({
            id: masterTenantId,
            name: master.tenantName || 'GRG FÊNIX',
            status: 'active',
            createdAt: now()
          });
        }

        if (!state.memberships.some((m) => m.tenantId === masterTenantId && m.userId === masterUserId)) {
          state.memberships.push({
            tenantId: masterTenantId,
            userId: masterUserId,
            role: 'master_admin',
            status: 'active',
            createdAt: now()
          });
        }
      }

      return state;
    });
    return this;
  }

  async ensureDefaultTenant({ id = 'grg', name = 'GRG FÊNIX', actorId = 'grg-admin' } = {}) {
    await this.store.update((state) => {
      if (!state.users.some((u) => u.id === actorId)) {
        state.users.push({ id: actorId, name: actorId, status: 'active', createdAt: now() });
      }
      if (!state.tenants.some((t) => t.id === id)) {
        state.tenants.push({ id, name, status: 'active', createdAt: now() });
      }
      if (!state.memberships.some((m) => m.tenantId === id && m.userId === actorId)) {
        state.memberships.push({ tenantId: id, userId: actorId, role: 'master_admin', status: 'active', createdAt: now() });
      }
      return state;
    });
    return this.getTenant(id);
  }

  async createTenant(input, actorId) {
    const name = String(input && input.name || '').trim();
    if (!name) throw new ValidationError('tenant.name is required');
    const id = slugify(input.id || name);
    if (!id) throw new ValidationError('tenant.id could not be generated');
    const tenant = { id, name, status: 'active', createdAt: now() };

    await this.store.update((state) => {
      if (state.tenants.some((t) => t.id === id)) throw new ConflictError(`Tenant exists: ${id}`);
      state.tenants.push(tenant);
      // actor vira master_admin do tenant
      if (actorId) {
        if (!state.users.some((u) => u.id === actorId)) {
          state.users.push({ id: actorId, name: actorId, status: 'active', createdAt: now() });
        }
        state.memberships.push({ tenantId: id, userId: actorId, role: 'master_admin', status: 'active', createdAt: now() });
      }
      return state;
    });
    await this.bus.emit('tenant.created', { tenantId: id, actorId });
    return tenant;
  }

  async getTenant(tenantId) {
    const state = await this.store.read();
    const tenant = state.tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new NotFoundError(`Tenant not found: ${tenantId}`);
    return tenant;
  }

  async getMembership(tenantId, userId) {
    await this.getTenant(tenantId);
    const state = await this.store.read();
    const m = state.memberships.find((x) => x.tenantId === tenantId && x.userId === userId);
    if (!m) throw new NotFoundError(`Membership not found for user: ${userId}`);
    return m;
  }

  async authorize(tenantId, actorId, permission) {
    const membership = await this.getMembership(tenantId, actorId);
    return requirePermission(membership, permission);
  }

  async addMember(tenantId, actorId, input) {
    const actor = await this.authorize(tenantId, actorId, 'member:manage');
    const role = String(input.role || 'employee');
    if (!permissionsFor(role).length) throw new ValidationError(`Unsupported role: ${role}`);
    if (role === 'master_admin' && actor.role !== 'master_admin') {
      throw new ValidationError('Only a master admin can create another master admin');
    }
    const userId = String(input.userId || '').trim();
    if (!userId) throw new ValidationError('userId is required');
    await this.store.update((state) => {
      if (state.memberships.some((m) => m.tenantId === tenantId && m.userId === userId)) {
        throw new ConflictError(`User is already a member: ${userId}`);
      }
      if (!state.users.some((u) => u.id === userId)) {
        state.users.push({ id: userId, name: input.name || userId, status: 'active', createdAt: now() });
      }
      state.memberships.push({ tenantId, userId, role, status: 'active', createdAt: now() });
      return state;
    });
    await this.bus.emit('member.added', { tenantId, userId, role, actorId });
    return this.getMembership(tenantId, userId);
  }

  async listMembers(tenantId, actorId) {
    await this.authorize(tenantId, actorId, 'member:read');
    const state = await this.store.read();
    return state.memberships
      .filter((m) => m.tenantId === tenantId)
      .map((m) => ({ ...m, permissions: permissionsFor(m.role) }));
  }

  async createOrg(tenantId, actorId, input) {
    await this.authorize(tenantId, actorId, 'member:manage');
    const name = String(input && input.name || '').trim();
    if (!name) throw new ValidationError('org.name is required');
    const org = { id: uuid(), tenantId, name, createdAt: now() };
    await this.store.update((state) => { state.orgs.push(org); return state; });
    return org;
  }

  async createCustomer(tenantId, actorId, input) {
    await this.authorize(tenantId, actorId, 'member:manage');
    const name = String(input && input.name || '').trim();
    if (!name) throw new ValidationError('customer.name is required');
    const customer = { id: uuid(), tenantId, name, orgId: input.orgId || null, createdAt: now() };
    await this.store.update((state) => { state.customers.push(customer); return state; });
    return customer;
  }
}

function now() { return new Date().toISOString(); }

module.exports = { ControlPlane };
