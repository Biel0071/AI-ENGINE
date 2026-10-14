const { SystemModule } = require('./module');
const { STATE_MACHINE } = require('./states');

/**
 * CapabilityGraph (Evolução do CapabilityRegistry)
 * Representa as Capabilities não como uma lista, mas como um grafo de dependências,
 * onde cada nó (Capability) tem pré-requisitos, permissões, custos e riscos associados.
 */
class CapabilityGraph extends SystemModule {
  constructor(serviceRegistry) {
    super('capability_graph', '2.0.0');
    this.serviceRegistry = serviceRegistry;
    this.nodes = new Map(); // id -> CapabilityNode
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[CapabilityGraph] Construindo grafo de dependências...');
    
    if (this.serviceRegistry) {
      for (const service of this.serviceRegistry.getAll()) {
        const caps = service.capabilities ? service.capabilities() : [];
        for (const cap of caps) {
          this.register(cap);
        }
      }
    }
    
    // Validação topológica (ciclos ou dependências ausentes) seria feita aqui
    this._validateGraph();

    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  register(capabilityDef) {
    const node = {
      id: capabilityDef.id || capabilityDef.name,
      name: capabilityDef.name,
      description: capabilityDef.description || '',
      dependencies: capabilityDef.dependencies || [],
      permissions: capabilityDef.permissions || [],
      evaluationMetrics: capabilityDef.evaluationMetrics || {
        averageCost: 0,
        averageLatencyMs: 0,
        riskLevel: 'LOW',
        recommendedLlm: null
      },
      execute: capabilityDef.execute // A função em si
    };
    
    this.nodes.set(node.id, node);
  }

  _validateGraph() {
    // Verifica dependências ausentes
    for (const [id, node] of this.nodes.entries()) {
      for (const dep of node.dependencies) {
        if (!this.nodes.has(dep)) {
          console.warn(`[CapabilityGraph] Warning: Capability ${id} depende de ${dep}, que não foi encontrada.`);
        }
      }
    }
  }

  getCapability(id) {
    return this.nodes.get(id) || null;
  }

  /**
   * Retorna o caminho de execução (ordem topológica das dependências)
   */
  resolveExecutionPath(capabilityId) {
    const path = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) throw new Error(`Ciclo detectado na dependência: ${nodeId}`);
      
      visiting.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (!node) throw new Error(`Capability não encontrada: ${nodeId}`);
      
      for (const dep of node.dependencies) {
        visit(dep);
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      path.push(nodeId);
    };

    visit(capabilityId);
    return path;
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        totalNodes: this.nodes.size,
        capabilities: Array.from(this.nodes.keys())
      }
    };
  }
}

module.exports = { CapabilityGraph };
