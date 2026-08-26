const { ValidationError } = require('../kernel/errors');

class CognitivePresenceEngine {
  constructor({ store, bus, controlPlane }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.mood = 'EXECUTIVO'; // FORMAL, TECNICO, OBJETIVO, EXECUTIVO, AMIGAVEL, MENTOR, SILENCIOSO
    this.temperature = {
      creativity: 50,
      autonomy: 80,
      detail: 70,
      questionFrequency: 'NORMAL', // NEVER, FEW, NORMAL, ALWAYS
      confirmationLevel: 'DEPLOY_ONLY', // PRODUCTION_ONLY, DEPLOY_ONLY, EVERYTHING
    };
    this.presenceState = 'CODING'; // CODING, MOBILE, TRAVELING, WORKING
  }

  async getPresenceConfig(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      tenantId,
      mood: this.mood,
      temperature: this.temperature,
      presenceState: this.presenceState,
      updatedAt: new Date().toISOString(),
    };
  }

  async updatePresenceConfig(tenantId, actorId, config = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    if (config.mood) this.mood = String(config.mood).toUpperCase();
    if (config.presenceState) this.presenceState = String(config.presenceState).toUpperCase();
    if (config.temperature) Object.assign(this.temperature, config.temperature);

    return {
      tenantId,
      mood: this.mood,
      temperature: this.temperature,
      presenceState: this.presenceState,
      updatedAt: new Date().toISOString(),
    };
  }
}

module.exports = { CognitivePresenceEngine };
