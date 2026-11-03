const { InvalidStateTransitionError } = require('./mission-schema');

class QualityGate {
  constructor(options = {}) {
    this.router = options.router || null;
    this.validators = options.validators || {};
  }

  async validate(mission) {
    if (mission.state !== 'VALIDATING') {
      throw new InvalidStateTransitionError(mission.id, mission.state, 'COMPLETED');
    }

    const checkNames = ['architecture', 'performance', 'security', 'coverage', 'documentation', 'realityFirst'];
    const checks = Object.fromEntries(checkNames.map((name) => [name, false]));
    let audit = null;

    // An LLM review is advisory; it cannot certify objective checks by itself.
    if (this.router && this.router.isAvailable('audit')) {
      try {
        const result = await this.router.execute('audit', {
          prompt: `Audit this mission completion. Objective: ${mission.intent.type}. Respond with JSON { passed: true/false, reasons: [] }`
        });
        audit = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (err) {
        console.warn('[QualityGate] Advisory LLM audit unavailable:', err.message);
      }
    }

    for (const name of checkNames) {
      const validate = this.validators[name];
      if (typeof validate !== 'function') continue;
      try {
        const result = await validate({ mission, audit });
        checks[name] = result?.passed === true && hasEvidence(result.evidence);
      } catch (err) {
        console.warn(`[QualityGate] ${name} validator unavailable:`, err.message);
      }
    }
    
    // Check if any job failed
    const hasFailedJobs = mission.jobs.some(j => j.status === 'FAILED');
    if (hasFailedJobs) {
      checks.realityFirst = false;
    }
    const selfVal = (mission.jobs || []).find((j) => j?.payload?.authorWorker && j?.payload?.validatorWorker && String(j.payload.authorWorker).toLowerCase() === String(j.payload.validatorWorker).toLowerCase());
    const mSelf = mission.authorAgentId && mission.validatorAgentId && String(mission.authorAgentId).toLowerCase() === String(mission.validatorAgentId).toLowerCase();
    if (selfVal || mSelf) {
      checks.realityFirst = false;
      checks.architecture = false;
      mission.rejectionReason = 'SELF_VALIDATION_FORBIDDEN';
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
        if (!mission.rejectionReason) mission.rejectionReason = 'CANONICAL_FRONTEND_SHELL_MISSING';
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
        if (!mission.rejectionReason) mission.rejectionReason = 'ROGUE_FRONTEND_SHELL_DETECTED';
      }
    } catch (_) {}

    const allPassed = Object.values(checks).every(v => v === true);

    if (allPassed) {
      mission.transitionTo('COMPLETED');
    } else {
      mission.transitionTo('COMPLETED');
      mission.failedValidation = true;
    }

    return checks;
  }
}

function hasEvidence(evidence) {
  if (typeof evidence === 'string') return evidence.trim().length > 0;
  if (Array.isArray(evidence)) return evidence.length > 0;
  return Boolean(evidence && typeof evidence === 'object' && Object.keys(evidence).length > 0);
}

module.exports = { QualityGate };
