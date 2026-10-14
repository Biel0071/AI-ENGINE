'use strict';

/**
 * FÊNIX OS — Agent Communication Bus (Fase 14)
 * ==============================================
 * Central event-driven communication fabric that coordinates
 * agent-to-agent, agent-to-room, and human-to-agent messages.
 * Integrates with Fênix EventBus to stream real-time events over SSE.
 */

const { EventEmitter } = require('events');
const { COMMUNICATION_EVENTS } = require('./communication-events');
const { globalBus } = require('../eventing/fenix-event-bus');

class AgentCommunicationBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.setMaxListeners(200);
    this.systemBus = options.systemBus || globalBus;
    this.logger = options.logger || console;
    this.history = [];
    this.MAX_HISTORY = 300;
  }

  /**
   * Publishes a typed communication event both locally and to the global system bus.
   * @param {string} eventType - Event name from COMMUNICATION_EVENTS
   * @param {object} payload - Event data
   */
  publish(eventType, payload = {}) {
    const envelope = {
      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    };

    // Keep bounded history
    this.history.push(envelope);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    // Emit locally on communication bus
    this.emit(eventType, envelope);
    this.emit('*', envelope);

    // Forward to Fênix Global Bus for SSE and Digital Twin broadcast
    if (this.systemBus && typeof this.systemBus.emit === 'function') {
      try {
        this.systemBus.emit(eventType, envelope);
      } catch (err) {
        this.logger.warn?.(`Failed to forward communication event to globalBus: ${err.message}`);
      }
    }

    return envelope;
  }

  /**
   * Retrieves recent event history.
   * @param {number} [limit=50]
   * @param {string} [typePrefix]
   */
  getHistory(limit = 50, typePrefix = null) {
    let list = this.history;
    if (typePrefix) {
      list = list.filter(e => e.type.startsWith(typePrefix));
    }
    return list.slice(-limit);
  }

  /**
   * Subscribe to specific agent events.
   * @param {string} agentId
   * @param {Function} handler
   */
  subscribeToAgent(agentId, handler) {
    const listener = (envelope) => {
      const p = envelope.payload || {};
      if (p.toAgent === agentId || p.fromAgent === agentId || p.agentId === agentId || (Array.isArray(p.participants) && p.participants.includes(agentId))) {
        handler(envelope);
      }
    };
    this.on('*', listener);
    return () => this.off('*', listener);
  }

  /**
   * Subscribe to room events.
   * @param {string} roomId
   * @param {Function} handler
   */
  subscribeToRoom(roomId, handler) {
    const listener = (envelope) => {
      const p = envelope.payload || {};
      if (p.roomId === roomId || p.officeId === roomId) {
        handler(envelope);
      }
    };
    this.on('*', listener);
    return () => this.off('*', listener);
  }
}

const globalCommunicationBus = new AgentCommunicationBus();

module.exports = {
  AgentCommunicationBus,
  globalCommunicationBus
};
