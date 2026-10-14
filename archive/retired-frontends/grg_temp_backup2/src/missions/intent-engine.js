const crypto = require('crypto');

class IntentEngine {
  constructor(options = {}) {
    this.router = options.router || null; // Will use CapabilityRegistry
  }

  async classify(message, context = {}) {
    // In a fully implemented version, this would call an LLM (the 'Fast' tier)
    // to classify the intent based on the user's message.
    // For now, we simulate basic classification:
    const msgLower = message.toLowerCase();
    
    let objectiveType = 'GENERAL_QUERY';
    if (msgLower.includes('refactor') || msgLower.includes('architect')) {
      objectiveType = 'ARCHITECTURE_REFACTOR';
    } else if (msgLower.includes('deploy') || msgLower.includes('release')) {
      objectiveType = 'DEPLOYMENT';
    } else if (msgLower.includes('create') || msgLower.includes('build') || msgLower.includes('make')) {
      objectiveType = 'CREATION';
    } else if (msgLower.includes('debug') || msgLower.includes('fix')) {
      objectiveType = 'DEBUGGING';
    }

    // In Reality First, this LLM call must be real if the provider is available.
    if (this.router && this.router.isAvailable('classification')) {
      try {
        const result = await this.router.execute('classification', {
          prompt: `Classify the intent of this message: "${message}". Valid types: GENERAL_QUERY, ARCHITECTURE_REFACTOR, DEPLOYMENT, CREATION, DEBUGGING. Reply only with the exact type.`
        });
        if (result && result.trim()) {
          objectiveType = result.trim().toUpperCase();
        }
      } catch (err) {
        console.warn('[IntentEngine] LLM classification failed, falling back to heuristic:', err.message);
      }
    }

    return {
      id: crypto.randomUUID(),
      originalMessage: message,
      type: objectiveType,
      context,
      extractedEntities: {}, // e.g. target paths, files
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { IntentEngine };
