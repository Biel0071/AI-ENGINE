'use strict';

/**
 * FÊNIX OS — System Gap Analyzer (Intent Engine 2.0)
 * =================================================
 * Enforces Constitutional Rule 16 & 17:
 * REUSE > EXTEND > REPAIR > CONSOLIDATE > CREATE
 * Evaluates the required capabilities against the SelfModel to minimize
 * code bloat and maximize architectural leverage.
 */

class SystemGapAnalyzer {
  constructor(options = {}) {
    this.selfModel = options.selfModel;
  }

  /**
   * Analyzes an intent requirement set against existing system assets
   */
  async analyzeGaps(intentRequirement) {
    const selfGraph = await this.selfModel.scan();
    const entities = intentRequirement.entities || {};
    const capabilities = intentRequirement.capabilities || [];

    const reusable = [];
    const extendable = [];
    const repairable = [];
    const consolidable = [];
    const creatable = [];

    for (const cap of capabilities) {
      const hits = this.selfModel.findExistingCapability(cap);
      if (hits.length > 0) {
        // Capability exists! Check if it needs extension or can be reused as-is
        if (hits.some(h => h.type === 'MODULE' || h.type === 'RUNTIME')) {
          reusable.push({ capability: cap, matches: hits, action: 'REUSE' });
        } else {
          extendable.push({ capability: cap, matches: hits, action: 'EXTEND' });
        }
      } else {
        // Truly missing capability
        creatable.push({ capability: cap, action: 'CREATE' });
      }
    }

    // Inspect specifically for legacy duplicates (CONSOLIDATE)
    if (capabilities.includes('INTENT_COMPILATION') || capabilities.includes('INTENT_PARSING')) {
      consolidable.push({
        action: 'CONSOLIDATE',
        targets: ['missions/intent-engine.js', 'orchestrator/intent-engine.js'],
        unifiedTarget: 'intent/intent-engine.js',
        reason: 'Consolidate multiple legacy partial intent parsers into unified Intent Engine 2.0'
      });
    }

    // Inspect for repairable items
    if (capabilities.includes('DETERMINISTIC_EXECUTION')) {
      reusable.push({
        capability: 'DETERMINISTIC_EXECUTION',
        matches: [{ type: 'ENGINE', name: 'kernel/deterministic-engine.js' }],
        action: 'REUSE'
      });
    }

    const totalEvaluated = capabilities.length || 1;
    const reuseScore = (reusable.length + extendable.length) / totalEvaluated;

    return {
      strategyOrder: 'REUSE > EXTEND > REPAIR > CONSOLIDATE > CREATE',
      reuseScore: Number(reuseScore.toFixed(2)),
      reusable,
      extendable,
      repairable,
      consolidable,
      creatable,
      verdict: creatable.length === 0 ? 'HIGH_LEVERAGE_REUSE' : (reuseScore > 0.5 ? 'HYBRID_EVOLUTION' : 'NEW_CAPABILITY_REQUIRED')
    };
  }
}

module.exports = { SystemGapAnalyzer };
