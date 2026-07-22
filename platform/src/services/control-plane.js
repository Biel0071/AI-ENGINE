const { randomUUID } = require('node:crypto');
const { createProject } = require('../domain/project');

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

class ControlPlaneService {
  constructor(store) {
    this.store = store;
  }

  async getTenant(tenantId) {
    const state = await this.store.read();
    const tenant = state.tenants.find((item) => item.id === tenantId);
    if (!tenant) throw new NotFoundError(`Tenant not found: ${tenantId}`);
    return tenant;
  }

  async listProjects(tenantId) {
    await this.getTenant(tenantId);
    const state = await this.store.read();
    return state.projects.filter((project) => project.tenantId === tenantId);
  }

  async getProject(tenantId, projectId) {
    const projects = await this.listProjects(tenantId);
    const project = projects.find((item) => item.id === projectId);
    if (!project) throw new NotFoundError(`Project not found: ${projectId}`);
    return project;
  }

  async registerProject(tenantId, input) {
    await this.getTenant(tenantId);
    const project = createProject(input, tenantId);

    await this.store.update((state) => {
      const duplicate = state.projects.find(
        (item) => item.tenantId === tenantId &&
          (item.id === project.id || item.repository.url.toLowerCase() === project.repository.url.toLowerCase()),
      );
      if (duplicate) throw new ConflictError(`Project already registered: ${duplicate.id}`);
      state.projects.push(project);
      return state;
    });

    return project;
  }

  async requestAnalysis(tenantId, projectId, input = {}) {
    const project = await this.getProject(tenantId, projectId);
    const run = {
      id: randomUUID(),
      tenantId,
      projectId,
      type: 'project-analysis',
      status: 'queued',
      mode: input.mode === 'deep' ? 'deep' : 'standard',
      requestedBy: input.requestedBy || 'local-user',
      createdAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.runs.push(run);
      const target = state.projects.find((item) => item.tenantId === tenantId && item.id === project.id);
      target.analysisStatus = 'queued';
      target.updatedAt = run.createdAt;
      return state;
    });

    return run;
  }

  async requestDeployment(tenantId, projectId, input = {}) {
    const project = await this.getProject(tenantId, projectId);
    const deployment = {
      id: randomUUID(),
      tenantId,
      projectId,
      provider: input.provider || null,
      environment: input.environment || 'preview',
      status: input.provider ? 'queued' : 'configuration-required',
      sourceRepository: project.repository.url,
      createdAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.deployments.push(deployment);
      const target = state.projects.find((item) => item.tenantId === tenantId && item.id === project.id);
      target.deploymentStatus = deployment.status;
      target.updatedAt = deployment.createdAt;
      return state;
    });

    return deployment;
  }

  async getOverview(tenantId) {
    const tenant = await this.getTenant(tenantId);
    const state = await this.store.read();
    const projects = state.projects.filter((item) => item.tenantId === tenantId);
    const runs = state.runs.filter((item) => item.tenantId === tenantId);
    const deployments = state.deployments.filter((item) => item.tenantId === tenantId);

    return {
      tenant,
      metrics: {
        projects: projects.length,
        publicRepositories: projects.filter((item) => item.repository.visibility === 'public').length,
        privateRepositories: projects.filter((item) => item.repository.visibility === 'private').length,
        analysesQueued: runs.filter((item) => item.status === 'queued').length,
        deploymentsConfigured: projects.filter((item) => item.deploymentStatus !== 'not-configured').length,
      },
      recentRuns: runs.slice(-10).reverse(),
      recentDeployments: deployments.slice(-10).reverse(),
    };
  }

  async getGraph(tenantId) {
    const tenant = await this.getTenant(tenantId);
    const projects = await this.listProjects(tenantId);
    const providers = [...new Set(projects.map((project) => project.repository.provider))];
    const tags = [...new Set(projects.flatMap((project) => project.tags || []))];

    const nodes = [
      { id: `tenant:${tenant.id}`, type: 'tenant', label: tenant.name },
      ...providers.map((provider) => ({ id: `provider:${provider}`, type: 'provider', label: provider })),
      ...projects.map((project) => ({
        id: `project:${project.id}`,
        type: 'project',
        label: project.name,
        visibility: project.repository.visibility,
      })),
      ...tags.map((tag) => ({ id: `capability:${tag}`, type: 'capability', label: tag })),
    ];

    const edges = projects.flatMap((project) => [
      { source: `tenant:${tenant.id}`, target: `project:${project.id}`, type: 'OWNS', evidence: 'catalog' },
      { source: `project:${project.id}`, target: `provider:${project.repository.provider}`, type: 'HOSTED_ON', evidence: 'catalog' },
      ...(project.tags || []).map((tag) => ({
        source: `project:${project.id}`,
        target: `capability:${tag}`,
        type: 'DECLARES_CAPABILITY',
        evidence: 'catalog-tag',
      })),
    ]);

    return { nodes, edges, generatedAt: new Date().toISOString() };
  }
}

module.exports = { ConflictError, ControlPlaneService, NotFoundError };
