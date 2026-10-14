const { Registry } = require('./Registry');

// The ultimate source of truth for the FÊNIX Digital Twin.
class RuntimeRegistry extends Registry {
  constructor() {
    super('RuntimeRegistry');
    this.children = {};
  }

  mount(childRegistry) {
    this.children[childRegistry.name] = childRegistry;
    // Bind child's register method to also register here
    const originalRegister = childRegistry.register.bind(childRegistry);
    childRegistry.register = (key, item) => {
      originalRegister(key, item);
      this.registerDigitalTwin(key, item, childRegistry.name);
    };
  }

  registerDigitalTwin(key, item, sourceName) {
    const typeMap = {
      'WorkerRegistry': 'worker',
      'CapabilityRegistry': 'capability',
      'ProviderRegistry': 'provider',
      'PluginRegistry': 'plugin',
      'ProjectRegistry': 'project',
      'MissionRegistry': 'mission',
      'SessionRegistry': 'session',
      'KnowledgeRegistry': 'knowledge'
    };
    const type = typeMap[sourceName] || 'object';

    // The Digital Twin Object Structure
    const twin = {
      id: key,
      type: type,
      status: 'LOADED',
      health: 'UNKNOWN',
      owner: item.owner || 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metrics: item.metrics || {},
      dependencies: item.requires || [],
      events: [],
      history: [],
      _raw: item
    };
    
    super.register(key, twin);
    
    // Fire event (if bus exists)
    if (this.eventBus) {
      this.eventBus.emit('runtime.manifest.updated', { action: 'registered', twin });
    }
  }
}

module.exports = { RuntimeRegistry };
