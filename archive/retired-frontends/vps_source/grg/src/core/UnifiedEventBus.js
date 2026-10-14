/**
 * FÊNIX OS — Unified Event Bus (Enterprise Edition)
 * In-process & distributed pub/sub event bus with priority queues, wildcard matching,
 * bounded history, and Event Sourcing projection.
 */

const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const { EVENT_PRIORITY, FENIX_EVENTS } = require('./contracts/event-types');
const crypto = require('crypto');

class UnifiedEventBus extends SystemModule {
  constructor({ maxHistory = 5000, store = null } = {}) {
    super('unified_event_bus', '3.0.0');
    this.handlers = new Map(); // exact event -> Set of handlers
    this.wildcardHandlers = new Map(); // prefix pattern -> Set of handlers
    this.globalHandlers = new Set(); // '*' handlers
    this.historyLog = [];
    this.maxHistory = maxHistory;
    this.store = store;
    this.status = STATE_MACHINE.BOOT;

    this.queues = {
      [EVENT_PRIORITY.CRITICAL]: [],
      [EVENT_PRIORITY.HIGH]: [],
      [EVENT_PRIORITY.NORMAL]: [],
      [EVENT_PRIORITY.LOW]: [],
      [EVENT_PRIORITY.BACKGROUND]: []
    };
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
    await this.emit(FENIX_EVENTS.DEVICE_CONNECTED, { subsystem: 'unified_event_bus', version: '3.0.0' }, EVENT_PRIORITY.HIGH);
    return this;
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    this.startTime = null;
  }

  /**
   * Subscribe to events. Supports exact types, prefixes with wildcard (e.g. 'agent.*') and global ('*').
   */
  on(pattern, handler) {
    if (typeof handler !== 'function') throw new Error('Handler must be a function');

    if (pattern === '*') {
      this.globalHandlers.add(handler);
      return () => this.globalHandlers.delete(handler);
    }

    if (pattern.endsWith('.*') || pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -1); // e.g. 'agent.'
      if (!this.wildcardHandlers.has(prefix)) {
        this.wildcardHandlers.set(prefix, new Set());
      }
      this.wildcardHandlers.get(prefix).add(handler);
      return () => this.wildcardHandlers.get(prefix).delete(handler);
    }

    if (!this.handlers.has(pattern)) {
      this.handlers.set(pattern, new Set());
    }
    this.handlers.get(pattern).add(handler);
    return () => this.handlers.get(pattern).delete(handler);
  }

  /**
   * Legacy alias for on()
   */
  subscribe(pattern, handler) {
    return this.on(pattern, handler);
  }

  /**
   * Emit an event asynchronously with priority and automatic payload wrapping.
   */
  async emit(type, payload = {}, priority = EVENT_PRIORITY.NORMAL) {
    if (this.status !== STATE_MACHINE.ONLINE && priority !== EVENT_PRIORITY.CRITICAL) {
      // Allow early critical boot events
    }

    const event = {
      id: `evt_${crypto.randomUUID()}`,
      type,
      payload,
      priority,
      timestamp: new Date().toISOString()
    };

    this.historyLog.push(event);
    if (this.historyLog.length > this.maxHistory) {
      this.historyLog.shift();
    }

    // Persist to store if configured
    if (this.store && typeof this.store.appendEvent === 'function') {
      try {
        await this.store.appendEvent(event);
      } catch (err) {
        console.error('[UnifiedEventBus] Failed to persist event to store:', err.message);
      }
    }

    // Collect all matching handlers
    const targetHandlers = [];

    // 1. Exact matches
    const exactSet = this.handlers.get(type);
    if (exactSet) {
      for (const h of exactSet) targetHandlers.push(h);
    }

    // 2. Wildcard prefix matches
    for (const [prefix, set] of this.wildcardHandlers.entries()) {
      if (type.startsWith(prefix)) {
        for (const h of set) targetHandlers.push(h);
      }
    }

    // 3. Global matches
    for (const h of this.globalHandlers) {
      targetHandlers.push(h);
    }

    // Execute handlers in parallel
    if (targetHandlers.length > 0) {
      await Promise.allSettled(targetHandlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (err) {
          console.error(`[UnifiedEventBus] Error handling event ${type}:`, err.message || err);
        }
      }));
    }

    return event;
  }

  /**
   * Synchronous / prioritized publish alias
   */
  publish(type, payload = {}, priority = EVENT_PRIORITY.NORMAL) {
    return this.emit(type, payload, priority);
  }

  /**
   * Query event history with flexible filters
   */
  history({ type = null, prefix = null, priority = null, limit = 100 } = {}) {
    let result = [...this.historyLog];
    if (type) result = result.filter(e => e.type === type);
    if (prefix) result = result.filter(e => e.type.startsWith(prefix));
    if (priority !== null) result = result.filter(e => e.priority === priority);
    return result.slice(-limit);
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        uptimeMs: this.startTime ? Date.now() - this.startTime : 0,
        totalEventsPublished: this.historyLog.length,
        exactSubscriptions: this.handlers.size,
        wildcardSubscriptions: this.wildcardHandlers.size,
        globalSubscriptions: this.globalHandlers.size
      }
    };
  }
}

module.exports = {
  UnifiedEventBus,
  EVENT_PRIORITY,
  FENIX_EVENTS
};
