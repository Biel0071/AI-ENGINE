const { randomUUID } = require('node:crypto');
const { ControlPlaneService, NotFoundError } = require('./control-plane');
const { ROLE_PERMISSIONS, requirePermission } = require('../domain/access-control');

const DEFAULT_MASTER = Object.freeze({
  id: 'biel0071',
  name: 'Biel0071',
  status: 'active',
});

class AccessControlledControlPlane extends ControlPlaneService {
  async initialize() {
    await this.store.update((state) => {
      state.schemaVersion = Math.max(Number(state.schemaVersion || 1), 2);
      state.users ||= [];
      state.memberships ||= [];
      state.memoryEvents ||= [];
      state.graphSnapshots ||= [];

      if (!state.users.some((user) => user.id === DEFAULT_MASTER.id)) {
        state.users.push({ ...DEFAULT_MASTER, createdAt: new Date().toISOString() });
      }
      for (const tenant of state.tenants) {
        if (!state.memberships.some((membership) => membership.tenantId === tenant.id && membership.userId === DEFAULT_MASTER.id)) {
          state.memberships.push({
            tenantId: tenant.id,
            userId: DEFAULT_MASTER.id,
            role: 'master_admin',
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }
      }
      return state;
    });
  }

  async getMembership(tenantId, userId) {
    await this.getTenant(tenantId);
    const state = await this.store.read();
    const membership = state.memberships.find(
      (item) => item.tenantId === tenantId && item.userId === userId,
    );
    if (!membership) throw new NotFoundError(`Membership not found for user: ${userId}`);
    return membership;
  }

  async authorize(tenantId, userId, permission) {
    const membership = await this.getMembership(tenantId, userId);
    return requirePermission(membership, permission);
  }

  async listMembers(tenantId, actorId) {
    await this.authorize(tenantId, actorId, 'member:read');
    const state = await this.store.read();
    return state.memberships
      .filter((item) => item.tenantId === tenantId)
      .map((membership) => ({
        ...membership,
        user: state.users.find((user) => user.id === membership.userId) || null,
        permissions: ROLE_PERMISSIONS[membership.role] || [],
      }));
  }

  async addMember(tenantId, actorId, input) {
    const actor = await this.authorize(tenantId, actorId, 'member:manage');
    const role = String(input.role || 'employee');
    if (!ROLE_PERMISSIONS[role]) throw new Error(`Unsupported role: ${role}`);
    if (role === 'master_admin' && actor.role !== 'master_admin') {
      throw new Error('Only a master admin can create another master admin');
    }
    const userId = String(input.userId || '').trim();
    if (!userId) throw new Error('userId is required');

    await this.store.update((state) => {
      if (state.memberships.some((item) => item.tenantId === tenantId && item.userId === userId)) {
        throw new Error(`User is already a tenant member: ${userId}`);
      }
      if (!state.users.some((user) => user.id === userId)) {
        state.users.push({ id: userId, name: input.name || userId, status: 'active', createdAt: new Date().toISOString() });
      }
      state.memberships.push({ tenantId, userId, role, status: 'active', createdAt: new Date().toISOString() });
      return state;
    });
    return this.getMembership(tenantId, userId);
  }

  async listProjectsFor(tenantId, actorId) {
    await this.authorize(tenantId, actorId, 'project:read');
    return this.listProjects(tenantId);
  }

  async registerProjectFor(tenantId, actorId, input) {
    await this.authorize(tenantId, actorId, 'project:create');
    return this.registerProject(tenantId, input);
  }

  async requestAnalysisFor(tenantId, actorId, projectId, input = {}) {
    await this.authorize(tenantId, actorId, 'project:analyze');
    const run = await this.requestAnalysis(tenantId, projectId, { ...input, requestedBy: actorId });
    await this.appendMemoryEvent({
      tenantId,
      projectId,
      actorId,
      kind: 'analysis-requested',
      summary: `Analysis ${run.id} queued in ${run.mode} mode`,
      evidence: [`run:${run.id}`],
      confidence: 1,
    });
    return run;
  }

  async requestDeploymentFor(tenantId, actorId, projectId, input = {}) {
    await this.authorize(tenantId, actorId, 'project:deploy');
    const deployment = await this.requestDeployment(tenantId, projectId, input);
    await this.appendMemoryEvent({
      tenantId,
      projectId,
      actorId,
      kind: 'deployment-requested',
      summary: `Deployment ${deployment.id} created with status ${deployment.status}`,
      evidence: [`deployment:${deployment.id}`],
      confidence: 1,
    });
    return deployment;
  }

  async appendMemoryEvent(input) {
    const event = {
      id: randomUUID(),
      tenantId: input.tenantId,
      projectId: input.projectId,
      actorId: input.actorId,
      kind: String(input.kind || 'observation'),
      summary: String(input.summary || '').trim(),
      evidence: Array.isArray(input.evidence) ? input.evidence.filter(Boolean) : [],
      confidence: Math.max(0, Math.min(1, Number(input.confidence ?? 0.5))),
      createdAt: new Date().toISOString(),
    };
    if (!event.summary) throw new Error('memory summary is required');
    if (!event.evidence.length) throw new Error('memory evidence is required');
    await this.store.update((state) => {
      state.memoryEvents.push(event);
      return state;
    });
    return event;
  }

  async remember(tenantId, actorId, projectId, input) {
    await this.authorize(tenantId, actorId, 'memory:write');
    await this.getProject(tenantId, projectId);
    return this.appendMemoryEvent({ ...input, tenantId, actorId, projectId });
  }

  async getProgressiveMemory(tenantId, actorId, projectId = null) {
    await this.authorize(tenantId, actorId, 'memory:read');
    const state = await this.store.read();
    return state.memoryEvents
      .filter((event) => event.tenantId === tenantId && (!projectId || event.projectId === projectId))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getOverviewFor(tenantId, actorId) {
    const membership = await this.authorize(tenantId, actorId, 'project:read');
    const overview = await this.getOverview(tenantId);
    const memories = await this.getProgressiveMemory(tenantId, actorId);
    return { ...overview, membership, metrics: { ...overview.metrics, memoryEvents: memories.length } };
  }

  async getGraphFor(tenantId, actorId) {
    await this.authorize(tenantId, actorId, 'memory:read');
    const graph = await this.getGraph(tenantId);
    const memories = (await this.getProgressiveMemory(tenantId, actorId)).slice(0, 100);
    return {
      ...graph,
      nodes: [
        ...graph.nodes,
        ...memories.map((event) => ({ id: `memory:${event.id}`, type: 'memory', label: event.summary, confidence: event.confidence })),
      ],
      edges: [
        ...graph.edges,
        ...memories.map((event) => ({
          source: `project:${event.projectId}`,
          target: `memory:${event.id}`,
          type: 'LEARNED',
          evidence: event.evidence.join(','),
          confidence: event.confidence,
        })),
      ],
    };
  }
}

module.exports = { AccessControlledControlPlane };
