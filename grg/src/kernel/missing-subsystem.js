const { SystemModule } = require('../kernel/module');

class MissingSubsystem extends SystemModule {
  constructor(id) {
    super(id, '0.0.0');
    this.status = 'degraded';
  }
  async start() {
    this.status = 'degraded';
    console.warn(`[BOOT] Subsystem ${this.id} is UNAVAILABLE.`);
  }
  async health() {
    return { ok: false, status: 'unavailable', details: { reason: 'not implemented' } };
  }
}

module.exports = { MissingSubsystem };
