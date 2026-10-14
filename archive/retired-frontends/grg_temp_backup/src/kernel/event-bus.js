// In-process event bus (port). Adapter real (Redis/NATS/Kafka) pluga a mesma interface.
class EventBus {
  constructor() {
    this.handlers = new Map();
    this.log = [];
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.handlers.get(type).delete(handler);
  }

  async emit(type, payload) {
    const event = { type, payload, at: new Date().toISOString() };
    this.log.push(event);
    const set = this.handlers.get(type);
    if (set) {
      for (const handler of set) {
        await handler(event);
      }
    }
    const wildcard = this.handlers.get('*');
    if (wildcard) {
      for (const handler of wildcard) await handler(event);
    }
    return event;
  }

  history(type = null) {
    return type ? this.log.filter((e) => e.type === type) : [...this.log];
  }
}

module.exports = { EventBus };
