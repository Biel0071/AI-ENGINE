'use strict';

/**
 * FÊNIX OS — Orchestrator Intent Engine (Consolidated & Upgraded to Intent Engine 2.0)
 * ==================================================================================
 * Replaces hardcoded mock specifications with the real, deterministic, and
 * multi-dimensional Intent Engine 2.0.
 */

const { IntentEngine: CoreIntentEngine, globalIntentEngine } = require('../intent/intent-engine');

class IntentEngine extends CoreIntentEngine {
  constructor(options = {}) {
    super(options);
  }
}

module.exports = {
  IntentEngine,
  globalIntentEngine
};
