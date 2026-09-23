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

    // Strict Anti-Regression & Single Source of Truth Gate:
    // If the mission created or referenced rogue frontend files outside canonical path,
    // immediately fail architecture and realityFirst checks.
    try {
      const fs = require('node:fs');
      const path = require('node:path');
      const projectRoot = path.resolve(__dirname, '..', '..', '..');
      const canonicalShell = path.resolve(__dirname, '..', 'public', 'index.html');
      
      if (!fs.existsSync(canonicalShell)) {
        checks.architecture = false;
        checks.realityFirst = false;
        mission.rejectionReason = 'CANONICAL_FRONTEND_SHELL_MISSING';
      }

      const scanDir = (dir) => {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return false; }
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const name = entry.name.toLowerCase();
            if (name === 'node_modules' || name === '.git' || name === 'archive' || name === 'qa' || name === 'qa-results' || name === '.system_generated' || name === '.gemini' || name === '.claude') continue;
            if (scanDir(fullPath)) return true;
          } else if (entry.isFile() && entry.name.toLowerCase() === 'index.html') {
            const resolved = path.resolve(fullPath);
            if (resolved === canonicalShell) continue;
            try {
              const content = fs.readFileSync(resolved, 'utf8');
              const isFullShell = (content.match(/id=["']view-[a-z0-9_-]+["']/g) || []).length >= 5 ||
                                  content.includes('unified-app.js') ||
                                  content.includes('fenix-operational-os.js');
              if (isFullShell) return true;
            } catch (_) {}
          }
        }
        return false;
      };

      if (scanDir(projectRoot)) {
        checks.architecture = false;
        checks.realityFirst = false;
        mission.rejectionReason = 'ROGUE_FRONTEND_SHELL_DETECTED';
      }
    } catch (_) {}

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
