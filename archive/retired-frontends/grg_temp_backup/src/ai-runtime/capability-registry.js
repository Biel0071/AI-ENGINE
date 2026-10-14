class CapabilityRegistry {
  constructor() {
    this.capabilities = {
      classification: [],
      routing: [],
      summaries: [],
      crud: [],
      ui: [],
      backend: [],
      architecture: [],
      refactoring: [],
      reasoning: [],
      audit: [],
      release: [],
      security: []
    };

    // Tiers definition
    this.tiers = {
      fast: ['classification', 'routing', 'summaries'],
      medium: ['crud', 'ui', 'backend'],
      strong: ['architecture', 'refactoring', 'reasoning'],
      precise: ['audit', 'release', 'security']
    };

    this.providers = new Map();
  }

  registerProvider(providerName, providerInstance, capabilities = []) {
    this.providers.set(providerName, providerInstance);
    capabilities.forEach(cap => {
      if (this.capabilities[cap]) {
        if (!this.capabilities[cap].includes(providerName)) {
          this.capabilities[cap].push(providerName);
        }
      } else {
        console.warn(`[CapabilityRegistry] Attempted to register unknown capability: ${cap}`);
      }
    });
  }

  getProvidersForCapability(capability) {
    return this.capabilities[capability] || [];
  }

  getProviderInstance(providerName) {
    return this.providers.get(providerName);
  }
}

module.exports = { CapabilityRegistry };
