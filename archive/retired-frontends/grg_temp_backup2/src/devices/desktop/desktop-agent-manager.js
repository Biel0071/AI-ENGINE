const { SystemModule } = require('../../kernel/module');

const PERMISSION_STATE = Object.freeze({
  ALLOW: 'ALLOW',
  ASK: 'ASK',
  DENY: 'DENY'
});

class DesktopAgentManager extends SystemModule {
  constructor({ eventBus = null, permissionMatrix = null } = {}) {
    super('desktop_agent_manager', '1.0.0');
    this.eventBus = eventBus;
    this.permissionMatrix = permissionMatrix;
    
    // Explicit authorization required. No defaults to ALLOW.
    this.permissions = {
      camera: PERMISSION_STATE.DENY,
      microphone: PERMISSION_STATE.DENY,
      keyboard: PERMISSION_STATE.DENY,
      mouse: PERMISSION_STATE.DENY,
      filesystem: PERMISSION_STATE.ASK,
      terminal: PERMISSION_STATE.ASK,
      browser: PERMISSION_STATE.ASK
    };

    this.emergencyStopEngaged = false;
  }

  async start() {
    this.status = 'ONLINE';
    return this;
  }

  async stop() {
    this.emergencyStop();
    this.status = 'SHUTDOWN';
  }

  emergencyStop() {
    this.emergencyStopEngaged = true;
    for (const key of Object.keys(this.permissions)) {
      this.permissions[key] = PERMISSION_STATE.DENY;
    }
    if (this.eventBus) this.eventBus.emit('desktop.emergency_stop_engaged', { timestamp: new Date().toISOString() });
    return true;
  }

  requestPermission(capability) {
    if (this.emergencyStopEngaged) return false;
    const state = this.permissions[capability];
    if (state === PERMISSION_STATE.ALLOW) return true;
    if (state === PERMISSION_STATE.DENY) return false;
    
    // In ASK state, it suspends execution and requests user consent via UI / EventBus
    if (this.eventBus) this.eventBus.emit('desktop.permission.requested', { capability });
    // Architecture stub: await User Consent
    return false;
  }

  updatePermission(capability, state) {
    if (Object.values(PERMISSION_STATE).includes(state) && this.permissions[capability] !== undefined) {
      this.permissions[capability] = state;
      return true;
    }
    return false;
  }

  // Outbound Control Plane connect
  async connectToControlPlane(host) {
    // Architecture stub: connects outbound to central FENIX control plane
    // without opening local insecure ports.
  }
}

module.exports = { DesktopAgentManager, PERMISSION_STATE };
