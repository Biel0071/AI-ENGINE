const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');

const EPHEMERAL_TELEMETRY_EVENTS = new Set([
  'fenix.heartbeat',
  'runtime.heartbeat',
  'jarvis.heartbeat.tick',
]);

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
    if (typeof bus.onBatch === 'function') {
      this.detach = bus.onBatch(async (events) => {
        try {
          const auditable = [];
          for (const event of events) {
            if (EPHEMERAL_TELEMETRY_EVENTS.has(event.type)) continue;
            if (event.type === 'fabric.event' && event.payload?.type === 'fabric.events.batch' && Array.isArray(event.payload.events)) {
              auditable.push(...event.payload.events.map((sourceEvent) => ({ ...event, payload: sourceEvent })));
            } else auditable.push(event);
          }
          await this.recordMany(auditable.map((event) => ({
              tenantId: event.payload && event.payload.tenantId || 'system',
              actorId: event.payload && event.payload.actorId || 'system',
              action: `event.${event.type}`,
              resource: event.payload || null,
              outcome: 'emitted',
            })));
        } catch (error) {
          console.warn('[AuditTrail] failed to record bus event batch:', error.message);
        }
      });
    } else {
      this.detach = bus.on('*', async (event) => {
        if (EPHEMERAL_TELEMETRY_EVENTS.has(event.type)) return;
        try {
          await this.record({
            tenantId: event.payload && event.payload.tenantId || 'system',
            actorId: event.payload && event.payload.actorId || 'system',
            action: `event.${event.type}`,
            resource: event.payload || null,
            outcome: 'emitted',
          });
        } catch (error) {
          console.warn('[AuditTrail] failed to record bus event:', error.message);
        }
      });
    }
    return this;
  }

  async record(input) {
    return (await this.recordMany([input]))[0];
  }

  async recordMany(inputs) {
    if (!inputs.length) return [];
    const saved = [];
    await this.store.update((state) => {
      saved.length = 0;
      const previousByTenant = new Map();
      for (const input of inputs) {
        const tenantId = input.tenantId || 'system';
        if (!previousByTenant.has(tenantId)) {
          previousByTenant.set(tenantId, state.auditEvents.filter((event) => event.tenantId === tenantId).at(-1) || null);
        }
        const previous = previousByTenant.get(tenantId);
        const base = {
          id: uuid(), tenantId, actorId: input.actorId || 'system',
          action: String(input.action), resource: input.resource || null,
          outcome: input.outcome || 'success', requestId: input.requestId || null,
          metadata: input.metadata || null, at: new Date().toISOString(),
          previousHash: previous ? previous.hash : null,
        };
        const record = { ...base, hash: hashRecord(base.previousHash, base) };
        state.auditEvents.push(record);
        previousByTenant.set(tenantId, record);
        saved.push(record);
      }
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
