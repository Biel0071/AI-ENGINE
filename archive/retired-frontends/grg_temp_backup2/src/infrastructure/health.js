const { SystemModule } = require('../kernel/module');

class HealthMonitor extends SystemModule {
  constructor(bootManager) {
    super('health_monitor', '1.0.0');
    this.bootManager = bootManager;
  }

  async start() {
    this.status = 'starting';
    // Start health checks
    this.status = 'running';
    this.startTime = Date.now();
  }

  async check() {
    if (!this.bootManager) return { ok: false, status: 'uninitialized' };
    return this.bootManager.health();
  }
}

module.exports = { HealthMonitor };
