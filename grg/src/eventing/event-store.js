const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ConflictError, ValidationError } = require('../kernel/errors');

const SENSITIVE_KEY = /(password|passwd|secret|token|api.?key|private.?key|credential)/i;
function assertNoSecrets(value, path = 'data') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) throw new ValidationError(`event payload cannot contain secret field: ${path}.${key}`);
    assertNoSecrets(child, `${path}.${key}`);
  }
}
function eventHash(event) { return crypto.createHash('sha256').update(JSON.stringify({ previousHash: event.previousHash, tenantId: event.tenantId, stream: event.stream, sequence: event.sequence, type: event.type, source: event.source, subject: event.subject, data: event.data, occurredAt: event.occurredAt })).digest('hex'); }

class EventStore {
  constructor({ store, clock = () => new Date().toISOString() }) { this.store = store; this.clock = clock; }
  async append(input) {
    return (await this.appendMany([input]))[0];
  }
  async appendMany(inputs) {
    if (!Array.isArray(inputs)) throw new ValidationError('events must be an array');
    if (!inputs.length) return [];
    for (const input of inputs) {
      if (!input?.tenantId || !input?.stream || !input?.type || !input?.source) throw new ValidationError('event tenantId, stream, type and source are required');
      assertNoSecrets(input.data);
    }
    const appended = [];
    await this.store.update(async (state) => {
      appended.length = 0;
      const idempotency = new Map();
      const streams = new Map();
      for (const item of state.domainEvents) {
        if (item.idempotencyKey) idempotency.set(`${item.tenantId}\0${item.idempotencyKey}`, item);
        const streamKey = `${item.tenantId}\0${item.stream}`;
        if (!streams.has(streamKey)) streams.set(streamKey, []);
        streams.get(streamKey).push(item);
      }
      for (const input of inputs) {
        const idempotencyKey = input.idempotencyKey ? `${input.tenantId}\0${input.idempotencyKey}` : null;
        const existing = idempotencyKey ? idempotency.get(idempotencyKey) : null;
        if (existing) { appended.push(existing); continue; }
        const streamKey = `${input.tenantId}\0${input.stream}`;
        let streamEvents = streams.get(streamKey);
        if (!streamEvents) streams.set(streamKey, streamEvents = []);
        if (input.expectedVersion !== undefined && Number(input.expectedVersion) !== streamEvents.length) throw new ConflictError('event stream version conflict');
        const previous = streamEvents.at(-1);
        const event = { id: uuid(), specVersion: '1.0', tenantId: input.tenantId, stream: input.stream, sequence: streamEvents.length + 1, type: input.type, source: input.source, subject: input.subject || null, data: input.data || {}, classification: input.classification || 'internal', correlationId: input.correlationId || uuid(), causationId: input.causationId || null, idempotencyKey: input.idempotencyKey || null, occurredAt: input.occurredAt || this.clock(), recordedAt: this.clock(), previousHash: previous?.hash || null };
        event.hash = eventHash(event);
        state.domainEvents.push(event);
        streamEvents.push(event);
        if (idempotencyKey) idempotency.set(idempotencyKey, event);
        appended.push(event);
      }
      return state;
    });
    return appended;
  }
  async readStream(tenantId, stream, fromSequence = 1) { const state = await this.store.read(); return state.domainEvents.filter((item) => item.tenantId === tenantId && item.stream === stream && item.sequence >= fromSequence); }
  async list(tenantId, options = {}) { const state = await this.store.read(); return state.domainEvents.filter((item) => item.tenantId === tenantId && (!options.type || item.type === options.type)).slice(-Math.min(1000, Number(options.limit || 100))); }
  async verify(tenantId, stream) { const events = await this.readStream(tenantId, stream); let previousHash = null; for (const event of events) { if (event.previousHash !== previousHash || event.hash !== eventHash(event)) return { ok: false, sequence: event.sequence }; previousHash = event.hash; } return { ok: true, events: events.length, head: previousHash }; }
}
module.exports = { EventStore, assertNoSecrets, eventHash };
