/**
 * FÊNIX OS — Permission Matrix & Zero-Trust Security Enforcer
 * Enforces granular permissions, dangerous command classification, and secret redaction.
 */

const COMMAND_CLASSIFICATION = Object.freeze({
  SAFE: 'SAFE',
  WARNING: 'WARNING',
  DANGEROUS: 'DANGEROUS'
});

const DANGEROUS_PATTERNS = [
  /rm\s+(-rf|-fr|\*)/i,
  /drop\s+table/i,
  /drop\s+database/i,
  /truncate\s+table/i,
  /git\s+push\s+.*--force/i,
  /git\s+reset\s+--hard/i,
  /mkfs/i,
  /dd\s+if=/i,
  /:(){ :|:& };:/, // Fork bomb
  /chmod\s+(-R\s+)?777/i,
  /curl.*\|\s*(bash|sh)/i
];

const WARNING_PATTERNS = [
  /npm\s+install/i,
  /pnpm\s+install/i,
  /yarn\s+add/i,
  /pip\s+install/i,
  /docker\s+run/i,
  /docker\s+compose\s+up/i,
  /kill\s+/i,
  /taskkill/i
];

const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|password|token|auth[_-]?header|bearer\s+)["':=\s]+([a-zA-Z0-9_\-\.]{12,})/gi,
  /(?:sk-[a-zA-Z0-9]{20,})/g,
  /(?:ghp_[a-zA-Z0-9]{36,})/g,
  /(?:eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,})/g // JWT
];

class PermissionMatrix {
  constructor({ strict = true } = {}) {
    this.strict = strict;
  }

  /**
   * Classifies a shell or terminal command
   */
  classifyCommand(cmd) {
    const raw = String(cmd || '').trim();
    if (!raw) return { classification: COMMAND_CLASSIFICATION.SAFE, allowed: true, reason: 'Empty command' };

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(raw)) {
        return {
          classification: COMMAND_CLASSIFICATION.DANGEROUS,
          allowed: false,
          requiresConfirmation: true,
          reason: `Command matched dangerous pattern: ${pattern.toString()}`
        };
      }
    }

    for (const pattern of WARNING_PATTERNS) {
      if (pattern.test(raw)) {
        return {
          classification: COMMAND_CLASSIFICATION.WARNING,
          allowed: true,
          requiresConfirmation: false,
          reason: `Command modifies packages or containers: ${pattern.toString()}`
        };
      }
    }

    return {
      classification: COMMAND_CLASSIFICATION.SAFE,
      allowed: true,
      requiresConfirmation: false,
      reason: 'Safe command'
    };
  }

  /**
   * Validates if an agent has permission for a specific action
   */
  checkPermission(agentSpec, requiredPermission) {
    const permissions = agentSpec?.permissions || [];
    if (permissions.includes('*') || permissions.includes('admin:*')) return true;

    // Check direct or wildcard match (e.g. 'fs:*' matches 'fs:read')
    return permissions.some(p => {
      if (p === requiredPermission) return true;
      if (p.endsWith(':*') && requiredPermission.startsWith(p.slice(0, -1))) return true;
      return false;
    });
  }

  /**
   * Redacts sensitive keys, tokens, passwords and hashes from any text, log or prompt
   */
  redactSecrets(text) {
    if (typeof text !== 'string') return text;
    let redacted = text;

    for (const pattern of SECRET_PATTERNS) {
      redacted = redacted.replace(pattern, (match, secretGroup) => {
        if (secretGroup) {
          return match.replace(secretGroup, '[REDACTED_SECRET]');
        }
        return '[REDACTED_SECRET]';
      });
    }

    return redacted;
  }
}

module.exports = {
  COMMAND_CLASSIFICATION,
  PermissionMatrix
};
