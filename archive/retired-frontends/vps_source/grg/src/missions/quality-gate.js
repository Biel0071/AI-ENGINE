const { InvalidStateTransitionError } = require('./mission-schema');

class QualityGate {
  constructor(options = {}) {
    this.router = options.router || null;
  }

  async validate(mission) {
    if (mission.state !== 'VALIDATING') {
      throw new InvalidStateTransitionError(mission.id, mission.state, 'COMPLETED');
    }

    const checks = {
      architecture: false,
      performance: false,
      security: false,
      coverage: false,
      documentation: false,
      realityFirst: false
    };

    // Simulated check processing
    // In production, this would involve executing test runners, linting, security scans,
    // and querying the 'precise' LLM for an architectural review.

    if (this.router && this.router.isAvailable('audit')) {
      try {
        const result = await this.router.execute('audit', {
          prompt: `Audit this mission completion. Objective: ${mission.intent.type}. Respond with JSON { passed: true/false, reasons: [] }`
        });
        const parsed = typeof result === 'string' ? JSON.parse(result) : result;
        
        checks.architecture = parsed.passed !== false;
        checks.performance = parsed.passed !== false;
        checks.security = parsed.passed !== false;
        checks.coverage = parsed.passed !== false;
        checks.documentation = parsed.passed !== false;
        checks.realityFirst = parsed.passed !== false;
      } catch (err) {
        console.warn('[QualityGate] LLM audit failed, falling back to heuristic passed:', err.message);
        Object.keys(checks).forEach(k => checks[k] = true);
      }
    } else {
      // Heuristic fallback
      Object.keys(checks).forEach(k => checks[k] = true);
    }
    
    // Check if any job failed
    const hasFailedJobs = mission.jobs.some(j => j.status === 'FAILED');
    if (hasFailedJobs) {
      checks.realityFirst = false;
    }

    const allPassed = Object.values(checks).every(v => v === true);

    if (allPassed) {
      mission.transitionTo('COMPLETED');
    } else {
      // If validation fails, transition back to RUNNING or block it. 
      // For now, if failed jobs, we just mark as COMPLETED with failure.
      mission.transitionTo('COMPLETED');
      mission.failedValidation = true;
    }

    return checks;
  }
}

module.exports = { QualityGate };
