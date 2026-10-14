const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');

/**
 * KnowledgeGraph
 * O Cérebro semântico relacionando Entidades (Empresa, Cliente, Projetos, APIs, Capability, Plugin).
 * É consultado pela Mission Engine para dar contexto ao LLM.
 */
class KnowledgeGraph extends SystemModule {
  constructor(eventBus) {
    super('knowledge_graph', '2.0.0');
    this.eventBus = eventBus;
    this.nodes = new Map(); // id -> EntityNode
    this.edges = new Map(); // id -> Edge
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[KnowledgeGraph] Inicializando banco de grafos cognitivos...');
    
    // Na V2 real, carregaremos isto do Qdrant ou Neo4J
    
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    // Salvar estado em disco/DB
  }

  /**
   * Adiciona ou atualiza um nó no grafo
   * @param {Object} node { id, type, label, attributes }
   */
  addNode(node) {
    if (!node.id || !node.type) throw new Error('Nó inválido: id e type obrigatórios.');
    this.nodes.set(node.id, { ...node, timestamp: Date.now() });
    
    // Dispara evento de aprendizado
    this.eventBus?.publish('kg.node.added', { nodeId: node.id, type: node.type }, 4 /* BACKGROUND */);
  }

  /**
   * Cria um relacionamento direcional entre dois nós
   * @param {string} sourceId 
   * @param {string} targetId 
   * @param {string} relationType (e.g., 'DEPENDS_ON', 'OWNS', 'IMPLEMENTS')
   * @param {number} weight 
   */
  addEdge(sourceId, targetId, relationType, weight = 1.0) {
    if (!this.nodes.has(sourceId)) throw new Error(`Source node não existe: ${sourceId}`);
    if (!this.nodes.has(targetId)) throw new Error(`Target node não existe: ${targetId}`);

    const edgeId = `${sourceId}_${relationType}_${targetId}`;
    this.edges.set(edgeId, {
      id: edgeId,
      source: sourceId,
      target: targetId,
      type: relationType,
      weight
    });

    this.eventBus?.publish('kg.edge.added', { edgeId }, 4 /* BACKGROUND */);
  }

  /**
   * Busca nós adjacentes para dar contexto a uma entidade.
   * Utilizado pelo PromptRuntime.
   */
  getContext(nodeId, depth = 1) {
    if (!this.nodes.has(nodeId)) return null;

    const context = {
      center: this.nodes.get(nodeId),
      relationships: []
    };

    // Muito básico, apenas profundidade 1
    for (const edge of this.edges.values()) {
      if (edge.source === nodeId) {
        context.relationships.push({ type: edge.type, direction: 'out', node: this.nodes.get(edge.target) });
      } else if (edge.target === nodeId) {
        context.relationships.push({ type: edge.type, direction: 'in', node: this.nodes.get(edge.source) });
      }
    }

    return context;
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        totalNodes: this.nodes.size,
        totalEdges: this.edges.size
      }
    };
  }
}

module.exports = { KnowledgeGraph };
