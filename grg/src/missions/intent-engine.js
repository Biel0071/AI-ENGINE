'use strict';

/**
 * FÊNIX OS — Missions Intent Engine (Consolidated & Upgraded to Intent Engine 2.0)
 * ==============================================================================
 * Seamlessly delegates all legacy classification requests to the unified
 * Intent Engine 2.0 while maintaining full backwards compatibility.
 */

const { IntentEngine: CoreIntentEngine, globalIntentEngine } = require('../intent/intent-engine');

class IntentEngine extends CoreIntentEngine {
  constructor(options = {}) {
    super(options);
    this.router = options.router || null;
  }
}

module.exports = {
  IntentEngine,
  globalIntentEngine
};
