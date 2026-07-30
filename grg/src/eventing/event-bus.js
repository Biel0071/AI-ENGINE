const { SystemModule } = require('../kernel/module');

/**
 * EventBus
 * Centralized messaging system for internal, domain, and runtime events.
 * Crucial for Event Sourcing and the Reality First protocol.
 */
class EventBus extends SystemModule {
  constructor() {
    super('event_bus', '1.0.0');
    this.subscribers = new Map();
    this.history = [];
  }

  async start() {
    this.status = 'starting';
    this.status = 'running';
    this.startTime = Date.now();
  }

  /**
   * Publishes an event to the bus.
   */
  publish(eventType, payload) {
    const event = {
      type: eventType,
      payload,
      timestamp: Date.now()
    };
    
    this.history.push(event);
    if (this.history.length > 1000) this.history.shift(); // Keep bounded history

    const handlers = this.subscribers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (err) {
        console.error(`[EventBus] Error in handler for ${eventType}:`, err);
      }
    }
  }

  /**
   * Subscribes to an event.
   */
  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(handler);
  }

  async health() {
    const parentHealth = await super.health();
    return {
      ...parentHealth,
      details: {
        totalEventsPublished: this.history.length,
        registeredEventTypes: Array.from(this.subscribers.keys())
      }
    };
  }
}

module.exports = { EventBus };
