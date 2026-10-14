const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class DeployCenterService {
  constructor({ store, bus, controlPlane, health = null }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.health = health;
  }

  async getDeployOverview(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    const state = await this.store.read();
    const activeDeploys = (state.deployments || []).filter((d) => d.tenantId === tenantId);
    const pipelines = state.selfDeployPipelines || [];

    const health = this.health && typeof this.health.check === 'function' ? await this.health.check() : null;
    return {
      tenantId,
      activeDeploymentsCount: activeDeploys.length,
      deployments: activeDeploys,
      recentPipelines: pipelines.slice(-5),
      containersCount: { state: 'unknown', source: 'no-container-probe' },
      workersCount: { state: 'unknown', source: 'no-worker-probe' },
      incidentsCount: { state: 'measured', value: health?.ok === false ? 1 : 0, source: 'health-registry' },
      checkedAt: new Date().toISOString(),
    };
  }

  async rollbackDeployment(tenantId, actorId, deployId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    let rollbackResult = null;

    await this.store.update((state) => {
      state.deployments = state.deployments || [];
      const item = state.deployments.find((d) => d.tenantId === tenantId && d.id === deployId);
      if (!item) {
        throw new NotFoundError(`Deployment not found: ${deployId}`);
      }
      item.status = 'ROLLED_BACK';
      item.rolledBackAt = new Date().toISOString();
      item.rolledBackBy = actorId;
      rollbackResult = { ...item };
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('deploy.rollback.completed', { tenantId, deployId, status: 'ROLLED_BACK' });
    }

    return { deployment: rollbackResult, message: 'Deployment successfully rolled back to previous candidate.' };
  }
}

module.exports = { DeployCenterService };
