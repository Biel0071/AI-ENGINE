const { uuid } = require('../kernel/ids');
const { ForbiddenError, NotFoundError, ValidationError } = require('../kernel/errors');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function resourceKey(value) {
  return JSON.stringify(stable(value || null));
}

class ApprovalEngine {
  constructor({ store, bus, controlPlane, audit, policy }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.audit = audit;
    this.policy = policy;
  }

  async request(tenantId, actorId, input) {
    const decision = this.policy.evaluate(input.action);
    await this.cp.authorize(tenantId, actorId, decision.permission);
    const request = {
      id: uuid(), tenantId, requestedBy: actorId,
      action: input.action,
      resource: stable(input.resource || null),
      resourceKey: resourceKey(input.resource),
      rationale: String(input.rationale || '').trim() || null,
      risk: decision.risk,
      separateApprover: decision.separateApprover,
      status: decision.approvalRequired ? 'pending' : 'approved',
      approvedBy: decision.approvalRequired ? null : 'policy-engine',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + Number(input.ttlMs || 30 * 60 * 1000)).toISOString(),
      approvedAt: decision.approvalRequired ? null : new Date().toISOString(),
      consumedAt: null,
    };
    await this.store.update((state) => { state.approvalRequests.push(request); return state; });
    await this.audit.record({ tenantId, actorId, action: 'approval.requested', resource: { approvalId: request.id, action: request.action }, outcome: request.status });
    await this.bus.emit('approval.requested', { tenantId, actorId, approvalId: request.id, action: request.action, risk: request.risk });
    return request;
  }

  async approve(tenantId, actorId, approvalId) {
    const state = await this.store.read();
    const request = state.approvalRequests.find((item) => item.tenantId === tenantId && item.id === approvalId);
    if (!request) throw new NotFoundError(`Approval not found: ${approvalId}`);
    const decision = this.policy.evaluate(request.action);
    await this.cp.authorize(tenantId, actorId, decision.permission);
    if (request.status !== 'pending') throw new ValidationError(`Approval is ${request.status}`);
    if (Date.now() >= Date.parse(request.expiresAt)) throw new ValidationError('Approval expired');
    if (request.separateApprover && request.requestedBy === actorId) {
      throw new ForbiddenError('Requester cannot approve this operation');
    }
    await this.store.update((next) => {
      const current = next.approvalRequests.find((item) => item.id === approvalId);
      current.status = 'approved'; current.approvedBy = actorId; current.approvedAt = new Date().toISOString();
      return next;
    });
    await this.audit.record({ tenantId, actorId, action: 'approval.approved', resource: { approvalId, action: request.action } });
    await this.bus.emit('approval.approved', { tenantId, actorId, approvalId, action: request.action });
    return this.get(tenantId, approvalId);
  }

  async reject(tenantId, actorId, approvalId, reason = null) {
    const request = await this.get(tenantId, approvalId);
    const decision = this.policy.evaluate(request.action);
    await this.cp.authorize(tenantId, actorId, decision.permission);
    if (request.status !== 'pending') throw new ValidationError(`Approval is ${request.status}`);
    if (request.separateApprover && request.requestedBy === actorId) throw new ForbiddenError('Requester cannot reject this operation');
    await this.store.update((state) => {
      const current = state.approvalRequests.find((item) => item.id === approvalId);
      current.status = 'rejected'; current.rejectedBy = actorId; current.rejectedAt = new Date().toISOString(); current.rejectionReason = String(reason || '').slice(0, 500) || null;
      return state;
    });
    await this.audit.record({ tenantId, actorId, action: 'approval.rejected', resource: { approvalId, action: request.action }, outcome: 'rejected' });
    await this.bus.emit('approval.rejected', { tenantId, actorId, approvalId, action: request.action });
    return this.get(tenantId, approvalId);
  }

  async consume(tenantId, actorId, approvalId, expected) {
    const request = await this.get(tenantId, approvalId);
    if (request.status !== 'approved' || request.consumedAt) throw new ValidationError('Approval is not consumable');
    if (Date.now() >= Date.parse(request.expiresAt)) throw new ValidationError('Approval expired');
    if (request.action !== expected.action || request.resourceKey !== resourceKey(expected.resource)) {
      throw new ValidationError('Approval does not match the requested operation');
    }
    await this.store.update((state) => {
      const current = state.approvalRequests.find((item) => item.id === approvalId);
      if (current.consumedAt) throw new ValidationError('Approval already consumed');
      current.status = 'consumed'; current.consumedAt = new Date().toISOString(); current.consumedBy = actorId;
      return state;
    });
    await this.audit.record({ tenantId, actorId, action: 'approval.consumed', resource: { approvalId, action: request.action } });
    return { ...request, status: 'consumed', consumedBy: actorId };
  }

  async get(tenantId, approvalId) {
    const state = await this.store.read();
    const request = state.approvalRequests.find((item) => item.tenantId === tenantId && item.id === approvalId);
    if (!request) throw new NotFoundError(`Approval not found: ${approvalId}`);
    return request;
  }

  async list(tenantId) {
    const state = await this.store.read();
    return state.approvalRequests.filter((item) => item.tenantId === tenantId).slice().reverse();
  }
}

module.exports = { ApprovalEngine, resourceKey, stable };
