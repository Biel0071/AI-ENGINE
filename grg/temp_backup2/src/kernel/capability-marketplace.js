/**
 * FÊNIX SCOS: Capability Marketplace
 * Registra e disponibiliza as capacidades (motores, serviços) para os subagentes.
 */
class CapabilityMarketplace {
  constructor() {
    this.capabilities = new Map();
  }

  register(capability) {
    if (!capability.name) throw new Error('Capability must have a name');
    this.capabilities.set(capability.name, {
      name: capability.name,
      description: capability.description || '',
      inputs: capability.inputs || {},
      outputs: capability.outputs || {},
      version: capability.version || '1.0.0',
      dependencies: capability.dependencies || [],
      price: capability.price || { tokens: 0, ms: 0 },
      status: capability.status || 'AVAILABLE',
      execute: capability.execute || (async () => { throw new Error('Not implemented'); })
    });
  }

  get(name) {
    const cap = this.capabilities.get(name);
    if (!cap || cap.status !== 'AVAILABLE') return null;
    return cap;
  }

  list() {
    return Array.from(this.capabilities.values());
  }

  updateStatus(name, status) {
    const cap = this.capabilities.get(name);
    if (cap) {
      cap.status = status;
    }
  }
}

module.exports = { CapabilityMarketplace };
