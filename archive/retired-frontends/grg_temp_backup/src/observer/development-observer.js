/**
 * FÊNIX OS — Development Observer
 * Continuously records atomic observation events across screen, code, runtime, and agent actions.
 */

const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const { ObservationEvent } = require('../core/contracts/observation-event');
const { FENIX_EVENTS, EVENT_PRIORITY } = require('../core/contracts/event-types');

class DevelopmentObserver extends SystemModule {
  constructor({ eventBus = null, store = null } = {}) {
    super('development_observer', '1.0.0');
    this.eventBus = eventBus;
    this.store = store;
    this.events = []; // In-memory list of ObservationEvents
    this.sessions = new Map(); // sessionId -> { projectId, events: [], startedAt, endedAt }
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();

    // Hook into global EventBus to auto-observe system events
    if (this.eventBus) {
      this.eventBus.on(FENIX_EVENTS.FILE_SAVED, (evt) => this.handleFileEvent('FILE_SAVED', evt));
      this.eventBus.on(FENIX_EVENTS.BUILD_SUCCESS, (evt) => this.handleBuildEvent('BUILD_SUCCESS', evt));
      this.eventBus.on(FENIX_EVENTS.BUILD_FAILED, (evt) => this.handleBuildEvent('BUILD_FAILED', evt));
    }

    return this;
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    this.startTime = null;
  }

  /**
   * Starts a new tracked development session
   */
  startSession({ sessionId = `ses_${Date.now()}`, projectId = 'default', metadata = {} }) {
    const session = {
      sessionId,
      projectId,
      metadata,
      events: [],
      startedAt: new Date().toISOString(),
      endedAt: null
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Records an atomic observation event
   */
  async recordObservation(eventData) {
    const event = new ObservationEvent(eventData);
    this.events.push(event);

    const session = this.sessions.get(event.sessionId);
    if (session) {
      session.events.push(event);
    }

    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.OBSERVATION_RECORDED, event.toJSON(), EVENT_PRIORITY.LOW);
    }

    return event;
  }

  async handleFileEvent(action, evt) {
    const payload = evt.payload || {};
    if (!payload.projectId) return;

    await this.recordObservation({
      sessionId: payload.sessionId || `auto_ses_${payload.projectId}`,
      projectId: payload.projectId,
      actor: payload.actor || 'user',
      action,
      target: { file: payload.path },
      codeState: { gitDiff: payload.diff || null }
    });
  }

  async handleBuildEvent(action, evt) {
    const payload = evt.payload || {};
    if (!payload.projectId) return;

    await this.recordObservation({
      sessionId: payload.sessionId || `auto_ses_${payload.projectId}`,
      projectId: payload.projectId,
      actor: 'system:builder',
      action,
      result: { buildStatus: action === 'BUILD_SUCCESS' ? 'PASSED' : 'FAILED' }
    });
  }

  getEventsByProject(projectId) {
    return this.events.filter(e => e.projectId === projectId);
  }

  getEventsBySession(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.events : this.events.filter(e => e.sessionId === sessionId);
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        totalObservationsRecorded: this.events.length,
        activeSessions: this.sessions.size
      }
    };
  }
}

module.exports = { DevelopmentObserver };
