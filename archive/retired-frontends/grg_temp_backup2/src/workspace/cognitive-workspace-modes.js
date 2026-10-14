const { ValidationError } = require('../kernel/errors');

class CognitiveWorkspaceModes {
  constructor({ store, bus, controlPlane }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.activeMode = 'COLLABORATOR'; // FOCUS, ASSISTANT, COLLABORATOR, AUTONOMOUS
    this.modesConfig = {
      FOCUS: { allowInterrupts: false, proactiveSuggestions: false, autoBackgroundWork: false },
      ASSISTANT: { allowInterrupts: true, proactiveSuggestions: true, autoBackgroundWork: false },
      COLLABORATOR: { allowInterrupts: true, proactiveSuggestions: true, autoBackgroundWork: true },
      AUTONOMOUS: { allowInterrupts: false, proactiveSuggestions: true, autoBackgroundWork: true, policyGates: ['NO_PROD_DEPLOY', 'NO_DB_DELETE', 'NO_MAIN_PUSH'] },
    };
  }

  async setMode(tenantId, actorId, mode = 'COLLABORATOR') {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    const m = String(mode).toUpperCase();
    if (!this.modesConfig[m]) {
      throw new ValidationError(`Invalid Workspace Mode: ${mode}. Must be FOCUS, ASSISTANT, COLLABORATOR, or AUTONOMOUS`);
    }

    this.activeMode = m;

    await this.store.update((state) => {
      state.workspaceMode = m;
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('workspace.mode.changed', { tenantId, mode: m });
    }

    return {
      tenantId,
      activeMode: m,
      config: this.modesConfig[m],
      updatedAt: new Date().toISOString(),
    };
  }

  async getActiveMode(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      activeMode: this.activeMode,
      config: this.modesConfig[this.activeMode],
      availableModes: Object.keys(this.modesConfig),
    };
  }
}

module.exports = { CognitiveWorkspaceModes };
