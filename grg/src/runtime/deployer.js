const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

// Universal Runtime: contrato de deploy único com adapters por destino.
// Adapters locais/mock (static/node/container) provam o fluxo preview->prod->rollback.
// Adapters reais (Cloudflare/AWS/K8s/VPS) implementam a mesma interface deploy()/rollback().

class MockProviderAdapter {
  constructor(name) { this.name = name; this.deployed = new Map(); }
  async deploy({ projectId, environment, revision }) {
    const url = `https://${projectId}.${environment}.${this.name}.local`;
    this.deployed.set(`${projectId}:${environment}`, { revision, url });
    return { url, logs: [`[${this.name}] deployed ${projectId}@${revision} to ${environment}`] };
  }
  async rollback({ projectId, environment }) {
    return { logs: [`[${this.name}] rolled back ${projectId} in ${environment}`] };
  }
}

const ENVIRONMENTS = ['preview', 'staging', 'production'];

class Deployer {
  constructor({ store, bus, controlPlane, providers, approvalEngine = null }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.approvals = approvalEngine;
    this.providers = providers || { static: new MockProviderAdapter('static'), node: new MockProviderAdapter('node'), container: new MockProviderAdapter('container') };
  }

  async deploy(tenantId, actorId, projectId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:deploy');
    const state0 = await this.store.read();
    const project = state0.projects.find((p) => p.tenantId === tenantId && p.id === projectId);
    if (!project) throw new NotFoundError(`Project not found: ${projectId}`);

    const environment = input.environment || 'preview';
    if (!ENVIRONMENTS.includes(environment)) throw new ValidationError(`Unknown environment: ${environment}`);
    const target = input.target || 'node';
    const provider = this.providers[target];
    if (!provider) throw new ValidationError(`No deploy adapter for target: ${target}`);

    const revision = input.revision || project.lastRevision || 'HEAD';
    let approval = null;
    if (environment === 'production') {
      if (this.approvals) {
        if (!input.approvalId) throw new ValidationError('production deploy requires approvalId');
        approval = await this.approvals.consume(tenantId, actorId, input.approvalId, {
          action: 'deployment.production', resource: { projectId, environment, target, revision },
        });
      } else if (!input.approved) {
        // Compatibilidade exclusiva para adapters locais/testes sem Governance Plane injetado.
        throw new ValidationError('production deploy requires approved:true');
      }
    }

    const result = await provider.deploy({ projectId, environment, revision });
    const deployment = {
      id: uuid(), tenantId, projectId, target, environment, revision,
      status: 'deployed', url: result.url, logs: result.logs,
      approvedBy: environment === 'production' ? (approval && approval.approvedBy || actorId) : null,
      approvalId: approval && approval.id || null,
      createdAt: now(),
    };
    await this.store.update((state) => {
      state.deployments.push(deployment);
      const p = state.projects.find((x) => x.tenantId === tenantId && x.id === projectId);
      p.deploymentStatus = `${environment}:deployed`;
      state.memoryEvents.push({
        id: uuid(), tenantId, projectId, actorId, kind: 'deployment',
        summary: `Deployed ${projectId}@${revision} to ${environment} via ${target}`,
        evidence: [`deployment:${deployment.id}`], confidence: 1, createdAt: now(),
      });
      return state;
    });
    await this.bus.emit('deployment.completed', { tenantId, projectId, environment, target, url: deployment.url });
    return deployment;
  }

  async rollback(tenantId, actorId, deploymentId) {
    await this.cp.authorize(tenantId, actorId, 'project:deploy');
    const state = await this.store.read();
    const dep = state.deployments.find((d) => d.tenantId === tenantId && d.id === deploymentId);
    if (!dep) throw new NotFoundError(`Deployment not found: ${deploymentId}`);
    const provider = this.providers[dep.target];
    const result = await provider.rollback({ projectId: dep.projectId, environment: dep.environment });
    await this.store.update((s) => {
      const d = s.deployments.find((x) => x.id === deploymentId);
      d.status = 'rolled-back';
      d.logs = [...d.logs, ...result.logs];
      return s;
    });
    await this.bus.emit('deployment.rolledback', { tenantId, deploymentId });
    return { ...dep, status: 'rolled-back' };
  }

  async listDeployments(tenantId, actorId, projectId = null) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    return state.deployments.filter((d) => d.tenantId === tenantId && (!projectId || d.projectId === projectId));
  }
}

function now() { return new Date().toISOString(); }

module.exports = { Deployer, MockProviderAdapter, ENVIRONMENTS };
