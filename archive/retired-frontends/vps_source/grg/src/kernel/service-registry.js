const { SystemModule } = require('./module');
const fs = require('node:fs');
const path = require('node:path');

/**
 * ServiceRegistry
 * Automatically discovers services, workers, plugins, routes, jobs.
 */
class ServiceRegistry extends SystemModule {
  constructor() {
    super('service_registry', '1.0.0');
    this.services = new Map();
  }

  async start() {
    this.status = 'starting';
    
    // In Reality First mode, we scan directories for implementation.
    // For now, we simulate discovery by recording our own instance.
    this.register(this);
    
    this.status = 'running';
    this.startTime = Date.now();
  }

  register(moduleInstance) {
    if (moduleInstance && moduleInstance.id) {
      this.services.set(moduleInstance.id, moduleInstance);
    }
  }

  getService(id) {
    return this.services.get(id);
  }

  getAll() {
    return Array.from(this.services.values());
  }

  async health() {
    const parentHealth = await super.health();
    return {
      ...parentHealth,
      details: {
        registeredCount: this.services.size,
        services: Array.from(this.services.keys())
      }
    };
  }
}

module.exports = { ServiceRegistry };
