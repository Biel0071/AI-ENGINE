const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class CapabilityOperatingSystem {
  constructor({ store, bus, controlPlane, knowledgeGenome }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.knowledgeGenome = knowledgeGenome;
  }

  async registerCapability(tenantId, actorId, capability = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    if (!capability.name || !capability.domain) {
      throw new ValidationError('Capability name and domain are required');
    }

    // MEDIDO EM PRODUCAO (2026-07-29): o registro trazia successRate 0.99, latencyMs 38,
    // costPerUseUsd 0.00005, usageCount 1 -- metricas de USO inventadas no momento do registro,
    // antes de qualquer uso. Uma capability recem-registrada nao tem historico; as metricas so
    // existem depois de execucoes reais. usageCount comeca em 0 (contador vivo, nao alegacao).
    const reg = {
      id: uuid(),
      tenantId,
      name: String(capability.name),
      domain: String(capability.domain),
      description: capability.description ? String(capability.description) : null,
      version: '1.0.0',
      usageCount: 0,
      registeredAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.capOsRegistry = state.capOsRegistry || [];
      state.capOsRegistry.push(reg);
      return state;
    });

    return reg;
  }

  async listCapabilities(tenantId, actorId) {
    let list = [];
    await this.store.update((state) => {
      list = state.capOsRegistry || [];
      return state;
    });
    return {
      capabilities: list,
      total: list.length,
    };
  }
}

module.exports = { CapabilityOperatingSystem };
