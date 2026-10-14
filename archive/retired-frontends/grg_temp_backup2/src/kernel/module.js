/**
 * Core SystemModule Interface
 * Base class that all FÊNIX OS engines and services must extend.
 * Ensures the Runtime Kernel can treat all modules uniformly.
 */
class SystemModule {
  constructor(id, version = '1.0.0') {
    this.id = id;
    this.version = version;
    this.status = 'stopped'; // "starting" | "running" | "degraded" | "stopped"
    this.startTime = null;
  }

  /**
   * Called by the BootManager to start the module.
   * Modules should allocate resources and register listeners here.
   */
  async start() {
    this.status = 'starting';
    // Subclasses must implement initialization logic
    this.status = 'running';
    this.startTime = Date.now();
  }

  /**
   * Called to gracefully shut down the module.
   */
  async stop() {
    this.status = 'stopped';
    this.startTime = null;
  }

  /**
   * Called to restart the module.
   */
  async restart() {
    await this.stop();
    await this.start();
  }

  /**
   * Returns health status.
   * @returns {Promise<{ ok: boolean, status: string, details: any }>}
   */
  async health() {
    return {
      ok: this.status === 'running',
      status: this.status,
      details: { uptime: this.startTime ? Date.now() - this.startTime : 0 }
    };
  }

  /**
   * Returns operational metrics for Telemetry.
   */
  async metrics() {
    return {
      status: this.status,
      uptime_ms: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Returns a list of capabilities this module exposes to the CapabilityRegistry.
   * @returns {Array<{ name: string, description: string }>}
   */
  capabilities() {
    return [];
  }
}

module.exports = { SystemModule };
