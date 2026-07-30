const { SystemModule } = require('./module');

/**
 * BootManager
 * Orchestrates the strict 15-step formal boot sequence of the FÊNIX OS.
 */
class BootManager extends SystemModule {
  constructor() {
    super('boot_manager', '1.0.0');
    this.bootLog = [];
    this.bootState = 'pending'; // 'pending' | 'booting' | 'ready' | 'failed'
    this.registry = new Map();
    this.bootSequence = [
      'Configuration',
      'Secrets',
      'Database',
      'Redis',
      'Event Bus',
      'Service Registry',
      'Capability Registry',
      'Workers',
      'Mission Engine',
      'Knowledge',
      'AI Router',
      'Telemetry',
      'Health',
      'API',
      'Frontend Streams'
    ];
  }

  registerModule(stepName, moduleInstance) {
    if (!(moduleInstance instanceof SystemModule)) {
      throw new Error(`Module ${moduleInstance?.id} must extend SystemModule`);
    }
    this.registry.set(stepName, moduleInstance);
  }

  async start() {
    this.status = 'starting';
    this.bootState = 'booting';
    this.bootLog = [];

    for (const step of this.bootSequence) {
      const moduleInstance = this.registry.get(step);
      const stepLog = { step, startedAt: Date.now(), success: false, error: null, durationMs: 0 };
      
      try {
        console.log(`[BOOT] Initiating step: ${step}...`);
        if (!moduleInstance) {
          const { MissingSubsystem } = require('./missing-subsystem');
          moduleInstance = new MissingSubsystem(step.toLowerCase().replace(/ /g, '_'));
          this.registry.set(step, moduleInstance);
        }
        await moduleInstance.start();
        
        stepLog.success = true;
        stepLog.durationMs = Date.now() - stepLog.startedAt;
        console.log(`[BOOT] ✓ ${step} READY (${stepLog.durationMs}ms)`);
      } catch (err) {
        stepLog.success = false;
        stepLog.error = err.message;
        stepLog.durationMs = Date.now() - stepLog.startedAt;
        console.error(`[BOOT] ✗ ${step} FAILED: ${err.message}`);
        this.bootLog.push(stepLog);
        this.bootState = 'failed';
        this.status = 'degraded';
        // According to policy: Boot reaches READY or FAILS.
        return; // Halt boot sequence
      }
      
      this.bootLog.push(stepLog);
    }

    this.bootState = 'ready';
    this.status = 'running';
    this.startTime = Date.now();
    console.log(`[BOOT] FÊNIX OS READY.`);
  }

  async health() {
    return {
      ok: this.bootState === 'ready',
      status: this.bootState,
      details: {
        completedSteps: this.bootLog.length,
        totalSteps: this.bootSequence.length,
        log: this.bootLog
      }
    };
  }
}

module.exports = { BootManager };
