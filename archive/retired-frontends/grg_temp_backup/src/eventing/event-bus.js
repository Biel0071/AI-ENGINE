const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');

const EVENT_PRIORITY = Object.freeze({
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  BACKGROUND: 4
});

/**
 * EventBus v2.0
 * Centralized messaging system for internal, domain, and runtime events.
 * Crucial for Event Sourcing and the Reality First protocol.
 * Now supports priority queues and formal state machine transitions.
 */
class EventBus extends SystemModule {
  constructor() {
    super('event_bus', '2.0.0');
    this.subscribers = new Map();
    // Prioritized event history
    this.history = [];
    this.queues = {
      [EVENT_PRIORITY.CRITICAL]: [],
      [EVENT_PRIORITY.HIGH]: [],
      [EVENT_PRIORITY.NORMAL]: [],
      [EVENT_PRIORITY.LOW]: [],
      [EVENT_PRIORITY.BACKGROUND]: []
    };
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[EventBus] Boot completed. Ready to process events.');
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    this.startTime = null;
  }

  /**
   * Publishes an event to the bus with priority.
   */
  publish(eventType, payload, priority = EVENT_PRIORITY.NORMAL) {
    if (this.status !== STATE_MACHINE.ONLINE && priority !== EVENT_PRIORITY.CRITICAL) {
      console.warn(`[EventBus] Ignored event ${eventType} because bus is not ONLINE`);
      return;
    }

    const event = {
      id: require('crypto').randomUUID(),
      type: eventType,
      payload,
      priority,
      timestamp: Date.now()
    };
    
    this.history.push(event);
    if (this.history.length > 5000) this.history.shift(); // Keep bounded history

    this.queues[priority].push(event);
    this._flushQueue(priority);
  }

  _flushQueue(priority) {
    while (this.queues[priority].length > 0) {
      const event = this.queues[priority].shift();
      const handlers = this.subscribers.get(event.type) || [];
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(`[EventBus] Error in handler for ${event.type}:`, err);
        }
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
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        uptime: this.startTime ? Date.now() - this.startTime : 0,
        totalEventsPublished: this.history.length,
        registeredEventTypes: Array.from(this.subscribers.keys())
      }
    };
  }
}

module.exports = { EventBus, EVENT_PRIORITY };
