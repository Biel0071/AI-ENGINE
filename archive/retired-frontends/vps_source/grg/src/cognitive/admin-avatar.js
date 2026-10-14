const { NotFoundError } = require('../kernel/errors');

class AdminAvatar {
  constructor({ store, controlPlane, cognitiveCore }) { this.store = store; this.cp = controlPlane; this.core = cognitiveCore; }
  async state(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return { statement: 'Observed platform state; no action was executed by the Avatar.', limitations: ['Context is limited to registered read-only providers', 'Planning-only hypotheses cannot be executed'], dashboard: await this.core.dashboard(tenantId, actorId), context: await this.core.context(tenantId, actorId) };
  }
  async explainDecision(tenantId, actorId, hypothesisId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read'); const state = await this.store.read();
    const hypothesis = state.cognitiveHypotheses.find((item) => item.tenantId === tenantId && item.id === hypothesisId); if (!hypothesis) throw new NotFoundError(`hypothesis not found: ${hypothesisId}`);
    const decision = state.cognitiveDecisions.find((item) => item.tenantId === tenantId && item.hypothesisId === hypothesisId) || null; const validation = state.cognitiveValidations.find((item) => item.tenantId === tenantId && item.hypothesisId === hypothesisId) || null;
    return { hypothesis: { id: hypothesis.id, description: hypothesis.description, status: hypothesis.status, evidence: hypothesis.evidence, risks: hypothesis.risks, plan: hypothesis.plan }, decision, validation, executionClaim: hypothesis.jobId ? `Dispatched to Runtime as job ${hypothesis.jobId}` : 'No execution was performed; this remains a plan.', limitations: validation ? [] : ['No validated outcome is available'] };
  }
  async improvements(tenantId, actorId) {
    const view = await this.state(tenantId, actorId); const proposals = [];
    if (view.dashboard.metrics.failed > 0) proposals.push('Review failed validations before authorizing retries.');
    if (view.context.snapshots.platform.runtime.deadLetters > 0) proposals.push('Investigate dead-letter jobs with evidence from the Event Store.');
    if (!proposals.length) proposals.push('No evidence-backed urgent improvement was detected. Continue observation.');
    return { proposals, executed: false, confidence: proposals[0].startsWith('No evidence') ? 0.6 : 0.9 };
  }
}
module.exports = { AdminAvatar };
