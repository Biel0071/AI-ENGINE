const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');

function hashRecord(previousHash, record) {
  return crypto.createHash('sha256')
    .update(previousHash || '')
    .update(JSON.stringify(record))
    .digest('hex');
}

class AuditTrail {
  constructor({ store }) {
    this.store = store;
    this.detach = null;
  }

  attach(bus) {
    if (this.detach) return this;
    this.detach = bus.on('*', (event) => this.record({
      tenantId: event.payload && event.payload.tenantId || 'system',
      actorId: event.payload && event.payload.actorId || 'system',
      action: `event.${event.type}`,
      resource: event.payload || null,
      outcome: 'emitted',
    }));
    return this;
  }

  async record(input) {
    let saved;
    await this.store.update((state) => {
      const tenantId = input.tenantId || 'system';
      const previous = state.auditEvents.filter((event) => event.tenantId === tenantId).slice(-1)[0];
      const base = {
        id: uuid(),
        tenantId,
        actorId: input.actorId || 'system',
        action: String(input.action),
        resource: input.resource || null,
        outcome: input.outcome || 'success',
        requestId: input.requestId || null,
        metadata: input.metadata || null,
        at: new Date().toISOString(),
        previousHash: previous ? previous.hash : null,
      };
      saved = { ...base, hash: hashRecord(base.previousHash, base) };
      state.auditEvents.push(saved);
      return state;
    });
    return saved;
  }

  async list(tenantId, limit = 100) {
    const state = await this.store.read();
    return state.auditEvents.filter((event) => event.tenantId === tenantId).slice(-limit).reverse();
  }

  async verify(tenantId) {
    const state = await this.store.read();
    const events = state.auditEvents.filter((event) => event.tenantId === tenantId);
    let previousHash = null;
    for (const event of events) {
      const { hash, ...base } = event;
      if (base.previousHash !== previousHash || hashRecord(previousHash, base) !== hash) {
        return { valid: false, eventId: event.id };
      }
      previousHash = hash;
    }
    return { valid: true, count: events.length, head: previousHash };
  }
}

module.exports = { AuditTrail, hashRecord };
