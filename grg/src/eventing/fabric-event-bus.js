class FabricEventBus {
  constructor({ eventStore, liveBus }) { this.eventStore = eventStore; this.liveBus = liveBus; }
  setRedisClient(client) { this.redisClient = client || null; return this; }
  async publish(input) { return (await this.publishBatch([input]))[0]; }
  async publishBatch(inputs) {
    if (!Array.isArray(inputs)) throw new TypeError('events must be an array');
    if (!inputs.length) return [];
    if (typeof this.eventStore.appendMany !== 'function' || typeof this.liveBus.emitBatch !== 'function') {
      const events = [];
      for (const input of inputs) events.push(await this.publish(input));
      return events;
    }

    const finishBatch = typeof this.liveBus.beginBatch === 'function' ? this.liveBus.beginBatch() : null;
    try {
      const events = await this.eventStore.appendMany(inputs);
      await this.liveBus.emitBatch(events.map((event) => ({ type: event.type, payload: event })));
      if (events.length === 1) await this.liveBus.emit('fabric.event', events[0]);
      else await this.liveBus.emit('fabric.event', {
        specVersion: '1.0', type: 'fabric.events.batch', events,
        tenantId: events[0].tenantId, occurredAt: events.at(-1).occurredAt,
      });
      return events;
    } finally {
      if (finishBatch) await finishBatch();
    }
  }
  subscribe(type, handler) { return this.liveBus.on(type, async (message) => handler(message.payload?.specVersion ? message.payload : message)); }
}
module.exports = { FabricEventBus };
