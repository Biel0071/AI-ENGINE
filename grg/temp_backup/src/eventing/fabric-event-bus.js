class FabricEventBus {
  constructor({ eventStore, liveBus }) { this.eventStore = eventStore; this.liveBus = liveBus; }
  async publish(input) { const event = await this.eventStore.append(input); await this.liveBus.emit(event.type, event); await this.liveBus.emit('fabric.event', event); return event; }
  subscribe(type, handler) { return this.liveBus.on(type, async (message) => handler(message.payload?.specVersion ? message.payload : message)); }
}
module.exports = { FabricEventBus };
