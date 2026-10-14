const { uuid } = require('../kernel/ids');
const { NotFoundError, ValidationError } = require('../kernel/errors');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function changes(before, after, path = '$') {
  if (Object.is(before, after)) return [];
  const beforeObject = before && typeof before === 'object';
  const afterObject = after && typeof after === 'object';
  if (!beforeObject || !afterObject || Array.isArray(before) || Array.isArray(after)) {
    return [{ path, before: before === undefined ? null : before, after: after === undefined ? null : after }];
  }
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.flatMap((key) => changes(before[key], after[key], `${path}.${key}`));
}

function resourceIdentity(event) {
  const type = String(event.stream).split(':')[0] || 'event';
  const id = String(event.subject || event.stream);
  return { resourceType: type, resourceId: id, resourceKey: `${type}:${id}` };
}

class GlobalVersionEngine {
  constructor({ store, controlPlane, events, approvals, bus }) {
    this.store = store;
    this.cp = controlPlane;
    this.events = events;
    this.approvals = approvals;
    this.bus = bus;
    this.unsubscribe = null;
  }

  attach() {
    if (!this.unsubscribe) this.unsubscribe = this.events.subscribe('fabric.event', (event) => this.record(event));
    return this;
  }

  async record(event) {
    const identity = resourceIdentity(event);
    let version;
    await this.store.update((state) => {
      const replay = state.resourceVersions.find((item) => item.tenantId === event.tenantId && item.sourceEventId === event.id);
      if (replay) { version = replay; return state; }
      const history = state.resourceVersions.filter((item) => item.tenantId === event.tenantId && item.resourceKey === identity.resourceKey);
      const previous = history.at(-1) || null;
      const before = previous?.snapshot ?? null;
      const after = stable(event.data || {});
      const diff = changes(before, after);
      version = {
        id: uuid(), tenantId: event.tenantId, ...identity, version: history.length + 1,
        eventType: event.type, sourceEventId: event.id, sourceStream: event.stream,
        snapshot: after, previousVersionId: previous?.id || null,
        author: event.data?.actorId || event.source,
        reason: event.data?.reason || event.data?.rationale || event.type,
        occurredAt: event.occurredAt, recordedAt: new Date().toISOString(),
        correlationId: event.correlationId, causationId: event.causationId,
      };
      state.resourceVersions.push(version);
      state.changeSets.push({
        id: uuid(), tenantId: event.tenantId, resourceKey: identity.resourceKey,
        fromVersion: previous?.version || 0, toVersion: version.version, changes: diff,
        sourceEventId: event.id, author: version.author, reason: version.reason,
        occurredAt: version.occurredAt,
      });
      return state;
    });
    await this.bus.emit('global.version.recorded', {
      tenantId: event.tenantId, resourceKey: version.resourceKey, version: version.version,
      sourceEventId: event.id,
    });
    return version;
  }

  async history(tenantId, actorId, resourceKey) {
    await this.cp.authorize(tenantId, actorId, 'event:read');
    const state = await this.store.read();
    return state.resourceVersions
      .filter((item) => item.tenantId === tenantId && (!resourceKey || item.resourceKey === resourceKey))
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }

  async diff(tenantId, actorId, resourceKey, fromVersion, toVersion) {
    await this.cp.authorize(tenantId, actorId, 'event:read');
    const state = await this.store.read();
    const versions = state.resourceVersions.filter((item) => item.tenantId === tenantId && item.resourceKey === resourceKey);
    const from = Number(fromVersion) === 0 ? { version: 0, snapshot: null } : versions.find((item) => item.version === Number(fromVersion));
    const to = versions.find((item) => item.version === Number(toVersion));
    if (!from || !to) throw new NotFoundError('version not found');
    return { resourceKey, fromVersion: from.version, toVersion: to.version, changes: changes(from.snapshot, to.snapshot) };
  }

  async proposeRollback(tenantId, actorId, input) {
    const resourceKey = String(input?.resourceKey || '').trim();
    const environment = String(input?.environment || 'production').toLowerCase();
    const targetVersion = Number(input?.targetVersion);
    if (!resourceKey || !Number.isInteger(targetVersion) || targetVersion < 1) {
      throw new ValidationError('resourceKey and a positive targetVersion are required');
    }
    const state = await this.store.read();
    const history = state.resourceVersions.filter((item) => item.tenantId === tenantId && item.resourceKey === resourceKey);
    const target = history.find((item) => item.version === targetVersion);
    const current = history.at(-1);
    if (!target || !current) throw new NotFoundError('rollback target not found');
    if (target.version === current.version) throw new ValidationError('target version is already current');
    const action = environment === 'production' ? 'version.rollback.production' : 'version.rollback.nonproduction';
    const resource = { resourceKey, environment, fromVersion: current.version, targetVersion };
    const approval = await this.approvals.request(tenantId, actorId, {
      action, resource, rationale: input.reason || `rollback ${resourceKey} to v${targetVersion}`,
    });
    const proposal = {
      id: uuid(), tenantId, resourceKey, environment, fromVersion: current.version, targetVersion,
      targetSnapshot: target.snapshot, requestedBy: actorId, reason: input.reason || null,
      approvalId: approval.id, status: approval.status === 'approved' ? 'APPROVED' : 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(), dispatchedAt: null,
    };
    await this.store.update((next) => { next.rollbackProposals.push(proposal); return next; });
    return proposal;
  }

  async dispatchRollback(tenantId, actorId, proposalId) {
    const state = await this.store.read();
    const proposal = state.rollbackProposals.find((item) => item.tenantId === tenantId && item.id === proposalId);
    if (!proposal) throw new NotFoundError(`rollback proposal not found: ${proposalId}`);
    if (proposal.status === 'DISPATCHED') return proposal;
    const action = proposal.environment === 'production' ? 'version.rollback.production' : 'version.rollback.nonproduction';
    const resource = { resourceKey: proposal.resourceKey, environment: proposal.environment, fromVersion: proposal.fromVersion, targetVersion: proposal.targetVersion };
    const consumed = await this.approvals.consume(tenantId, actorId, proposal.approvalId, { action, resource });
    const event = await this.events.publish({
      tenantId, stream: `rollback:${proposal.id}`, type: 'version.rollback.requested',
      source: 'global-version-engine', subject: proposal.resourceKey,
      data: { actorId, proposalId: proposal.id, resourceKey: proposal.resourceKey, environment: proposal.environment, fromVersion: proposal.fromVersion, targetVersion: proposal.targetVersion, targetSnapshot: proposal.targetSnapshot, approvedBy: consumed.approvedBy, reason: proposal.reason },
      idempotencyKey: `rollback:${proposal.id}`,
    });
    await this.store.update((next) => {
      const current = next.rollbackProposals.find((item) => item.id === proposal.id);
      current.status = 'DISPATCHED'; current.dispatchedAt = new Date().toISOString(); current.eventId = event.id;
      return next;
    });
    return (await this.store.read()).rollbackProposals.find((item) => item.id === proposal.id);
  }
}

module.exports = { GlobalVersionEngine, changes, resourceIdentity };
