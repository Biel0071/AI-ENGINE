/**
 * FÊNIX OS — Port Discovery & Live Preview Engine
 * Detects running web servers, allocates proxy endpoints, and feeds preview telemetry to the Observer.
 */

const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const { FENIX_EVENTS, EVENT_PRIORITY } = require('../core/contracts/event-types');
const net = require('net');

class PreviewEngine extends SystemModule {
  constructor({ eventBus = null, observer = null } = {}) {
    super('preview_engine', '1.0.0');
    this.eventBus = eventBus;
    this.observer = observer;
    this.activePreviews = new Map(); // projectId -> { port, url, status, startedAt }
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
    return this;
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    this.activePreviews.clear();
    this.startTime = null;
  }

  /**
   * Checks if a local port is actively accepting connections
   */
  async probePort(port, host = '127.0.0.1', timeout = 1000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let status = false;

      socket.setTimeout(timeout);
      socket.once('connect', () => {
        status = true;
        socket.destroy();
        resolve(true);
      });

      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.once('error', () => {
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Scans common web development ports for a running frontend or server
   */
  async discoverActivePorts(portsToProbe = [3000, 3001, 5173, 5174, 8080, 8000, 4400]) {
    const active = [];
    for (const port of portsToProbe) {
      const isOnline = await this.probePort(port);
      if (isOnline) {
        active.push(port);
      }
    }
    return active;
  }

  /**
   * Registers an active live preview for a project
   */
  async registerPreview(projectId, { port, customUrl = null }) {
    const url = customUrl || `http://localhost:${port}`;
    const preview = {
      projectId,
      port,
      url,
      status: 'ACTIVE',
      startedAt: new Date().toISOString()
    };

    this.activePreviews.set(projectId, preview);

    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.PREVIEW_STARTED, {
        projectId,
        port,
        url
      }, EVENT_PRIORITY.HIGH);
    }

    if (this.observer) {
      await this.observer.recordObservation({
        sessionId: `preview_${projectId}`,
        projectId,
        actor: 'system:preview_engine',
        action: 'PREVIEW_STARTED',
        runtimeState: { status: 'ONLINE', port, errors: [] }
      });
    }

    return preview;
  }

  getPreview(projectId) {
    return this.activePreviews.get(projectId) || null;
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        activePreviewsCount: this.activePreviews.size
      }
    };
  }
}

module.exports = { PreviewEngine };
