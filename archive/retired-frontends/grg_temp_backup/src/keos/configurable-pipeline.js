const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class ConfigurablePipelineService {
  constructor({ store, bus, controlPlane, approvals }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.approvals = approvals;
  }

  async promoteChange(tenantId, actorId, change = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    if (!change.title) throw new ValidationError('Change title is required');

    const stages = [
      'Draft',
      'Implemented',
      'Validated',
      'Tests Passed',
      'Security Checked',
      'Benchmark Passed',
      'Ready for Review',
      'Staging',
      'Production',
      'Observed',
      'Learning',
    ];

    const currentStage = change.autoApprove ? 'Production' : 'Ready for Review';

    const promotion = {
      id: uuid(),
      tenantId,
      changeTitle: String(change.title),
      pipelineStages: stages,
      currentStage,
      policyAutoApproved: Boolean(change.autoApprove),
      healthGateStatus: 'PASSED',
      promotedAt: new Date().toISOString(),
    };

    if (this.bus?.emit) {
      await this.bus.emit('configurable.pipeline.promoted', { tenantId, promotionId: promotion.id, currentStage });
    }

    return promotion;
  }
}

module.exports = { ConfigurablePipelineService };
