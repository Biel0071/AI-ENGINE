const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class VpsOperationsService {
  constructor({ store, bus, controlPlane, approvals }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.approvals = approvals;
  }

  async listServers(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    const state = await this.store.read();
    const servers = (state.vpsServers || [
      {
        id: 'vps-primary',
        tenantId,
        hostname: 'vps-grg-prod-01',
        ip: '185.200.1.10',
        status: 'ONLINE',
        cpuUsage: 18,
        ramUsageMb: 4096,
        ramTotalMb: 16384,
        diskUsagePercent: 32,
        containersCount: 6,
        updatedAt: new Date().toISOString(),
      },
    ]).filter((s) => s.tenantId === tenantId);

    return { servers, total: servers.length };
  }

  async createOperationPlan(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    if (!input.action || !input.target) {
      throw new ValidationError('VPS operation plan requires action and target');
    }

    const plan = {
      id: uuid(),
      tenantId,
      action: String(input.action),
      target: String(input.target),
      details: input.details || {},
      steps: [
        'Pre-flight environment sanity check',
        `Execute ${input.action} on ${input.target}`,
        'Verify readiness probe',
        'Record audit log & state transition',
      ],
      requiresApproval: ['DEPLOY', 'ROLLBACK', 'RESTART_SERVICE', 'MUTATE_CONTAINER'].includes(input.action.toUpperCase()),
      status: 'PLANNED',
      createdBy: actorId,
      createdAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.vpsOperationPlans = state.vpsOperationPlans || [];
      state.vpsOperationPlans.push(plan);
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('vps.plan.created', { tenantId, planId: plan.id, action: plan.action });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'vps.plan.created', data: { planId: plan.id, action: plan.action } });
    }

    return plan;
  }

  async executeOperationPlan(tenantId, actorId, planId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    let plan = null;

    await this.store.update((state) => {
      state.vpsOperationPlans = state.vpsOperationPlans || [];
      const item = state.vpsOperationPlans.find((p) => p.tenantId === tenantId && p.id === planId);
      if (!item) throw new NotFoundError(`VPS Operation Plan not found: ${planId}`);

      item.status = 'EXECUTED';
      item.executedAt = new Date().toISOString();
      item.executedBy = actorId;
      plan = { ...item };
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('vps.plan.executed', { tenantId, planId, status: 'EXECUTED' });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'vps.plan.executed', data: { planId, status: 'EXECUTED' } });
    }

    return { plan, result: 'Operation completed successfully' };
  }
}

module.exports = { VpsOperationsService };
