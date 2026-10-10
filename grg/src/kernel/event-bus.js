// In-process event bus (port). Adapter real (Redis/NATS/Kafka) pluga a mesma interface.
class EventBus {
  constructor() {
    this.handlers = new Map();
    this.batchHandlers = new Set();
    this.log = [];
    this.batchDepth = 0;
    this.pendingBatchEvents = [];
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.handlers.get(type).delete(handler);
  }

  onBatch(handler) {
    this.batchHandlers.add(handler);
    return () => this.batchHandlers.delete(handler);
  }

  beginBatch() {
    this.batchDepth += 1;
    let ended = false;
    return async () => {
      if (ended) return;
      ended = true;
      this.batchDepth = Math.max(0, this.batchDepth - 1);
      if (this.batchDepth === 0 && this.pendingBatchEvents.length) {
        const events = this.pendingBatchEvents;
        this.pendingBatchEvents = [];
        await this.#dispatchBatch(events);
      }
    };
  }

  async emit(type, payload) {
    const event = { type, payload, at: new Date().toISOString() };
    this.log.push(event);
    await this.#dispatch(event);
    await this.#queueBatch([event]);
    return event;
  }

  async emitBatch(inputs) {
    if (!Array.isArray(inputs)) throw new TypeError('events must be an array');
    if (!inputs.length) return [];
    const events = [];
    for (const input of inputs) {
      if (!input?.type) throw new TypeError('event type is required');
      const event = { type: input.type, payload: input.payload, at: input.at || new Date().toISOString() };
      this.log.push(event);
      await this.#dispatch(event);
      events.push(event);
    }
    await this.#queueBatch(events);
    return events;
  }

  async #dispatch(event) {
    const set = this.handlers.get(event.type);
    if (set) {
      for (const handler of set) {
        await handler(event);
      }
    }
    const wildcard = this.handlers.get('*');
    if (wildcard) {
      for (const handler of wildcard) await handler(event);
    }
  }

  async #dispatchBatch(events) {
    for (const handler of this.batchHandlers) await handler(events);
  }

  async #queueBatch(events) {
    if (this.batchDepth > 0) this.pendingBatchEvents.push(...events);
    else await this.#dispatchBatch(events);
  }

  history(type = null) {
    return type ? this.log.filter((e) => e.type === type) : [...this.log];
  }
}

module.exports = { EventBus };
