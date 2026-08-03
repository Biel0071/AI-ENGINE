const { SystemModule } = require('../../kernel/module');
const { STATE_MACHINE } = require('../../kernel/states');

/**
 * NodeRegistry
 * Gerencia o inventário distribuído de Nodes do FÊNIX OS.
 * Resolve endereços como 'node://ai-gateway' para IPs/Endpoints físicos.
 */
class NodeRegistry extends SystemModule {
  constructor(eventBus) {
    super('node_registry', '2.0.0');
    this.eventBus = eventBus;
    this.nodes = new Map();
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[NodeRegistry] Inicializando Service Registry Distribuído...');
    
    // API Principal (Base URL)
    this.registerNode('api-core', {
      address: 'http://209.50.241.215:3000', 
      status: STATE_MACHINE.ONLINE,
      lastSeen: Date.now()
    });

    // Novo Node FÊNIX na VPS Secundária
    this.registerNode('fenix-worker', {
      address: 'http://209.50.241.22:3000', 
      status: STATE_MACHINE.ONLINE,
      lastSeen: Date.now()
    });

    this.status = STATE_MACHINE.ONLINE;
  }

  registerNode(nodeId, metadata) {
    this.nodes.set(nodeId, { ...metadata, active: true });
    this.eventBus?.publish('node.registered', { nodeId, address: metadata.address });
    console.log(`[NodeRegistry] Node Registrado: node://${nodeId} -> ${metadata.address}`);
  }

  resolve(nodeUrl) {
    // nodeUrl format: node://ai-gateway/api/generate
    if (!nodeUrl.startsWith('node://')) return nodeUrl; // Retorna normal se for http comum

    const urlParts = nodeUrl.replace('node://', '').split('/');
    const nodeId = urlParts[0];
    const path = '/' + urlParts.slice(1).join('/');

    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`NodeRegistry: Unresolved node '${nodeId}'`);
    }

    return `${node.address}${path !== '/' ? path : ''}`;
  }

  listNodes() {
    return Array.from(this.nodes.entries()).map(([id, data]) => ({ id, ...data }));
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        activeNodes: this.nodes.size
      }
    };
  }
}

module.exports = { NodeRegistry };
