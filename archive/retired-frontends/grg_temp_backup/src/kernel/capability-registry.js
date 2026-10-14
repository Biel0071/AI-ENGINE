const { SystemModule } = require('./module');

/**
 * CapabilityRegistry
 * Discovers and tracks all capabilities published by modules across the system.
 */
class CapabilityRegistry extends SystemModule {
  constructor(serviceRegistry) {
    super('capability_registry', '1.0.0');
    this.serviceRegistry = serviceRegistry;
    this.capabilities = new Map();
  }

  async start() {
    this.status = 'starting';
    
    // Auto-discover capabilities from all registered services
    if (this.serviceRegistry) {
      for (const service of this.serviceRegistry.getAll()) {
        const caps = service.capabilities();
        for (const cap of caps) {
          this.capabilities.set(cap.name, cap);
        }
      }
    }
    
    this.status = 'running';
    this.startTime = Date.now();
  }

  getCapabilities() {
    return Array.from(this.capabilities.values());
  }

  async health() {
    const parentHealth = await super.health();
    return {
      ...parentHealth,
      details: {
        capabilityCount: this.capabilities.size,
        capabilities: Array.from(this.capabilities.keys())
      }
    };
  }
}

module.exports = { CapabilityRegistry };
