'use strict';
/**
 * FÊNIX OS — World Model
 * Grafo persistente vivo do sistema. Representa o ambiente completo:
 * projetos, módulos, serviços, APIs, bancos, processos, agentes,
 * missões, jobs, testes, padrões, falhas, decisões, histórico.
 *
 * REGRA: Não duplicar KnowledgeGraph — este módulo consome e estende
 * o knowledge-graph existente com uma camada de grafo vivo e tipado.
 */

const { EventEmitter } = require('events');

// Tipos canônicos de nós no World Model
const NODE_TYPES = Object.freeze({
  PROJECT: 'PROJECT',
  MODULE: 'MODULE',
  SERVICE: 'SERVICE',
  API: 'API',
  DATABASE: 'DATABASE',
  PROCESS: 'PROCESS',
  AGENT: 'AGENT',
  MISSION: 'MISSION',
  JOB: 'JOB',
  TEST: 'TEST',
  PATTERN: 'PATTERN',
  FAILURE: 'FAILURE',
  DECISION: 'DECISION',
  EXPERIMENT: 'EXPERIMENT',
  STRATEGY: 'STRATEGY',
  RESULT: 'RESULT',
  // Entidades Espaciais e Corporativas (Spatial World OS)
  COMPANY: 'COMPANY',
  BUILDING: 'BUILDING',
  FLOOR: 'FLOOR',
  ROOM: 'ROOM',
  WORKSTATION: 'WORKSTATION',
  DISTRICT: 'DISTRICT',
  POINT_OF_INTEREST: 'POINT_OF_INTEREST',
  VEHICLE: 'VEHICLE',
});

// Tipos canônicos de arestas
const EDGE_TYPES = Object.freeze({
  CONTAINS: 'CONTAINS',
  DEPENDS_ON: 'DEPENDS_ON',
  EXPOSES: 'EXPOSES',
  USES: 'USES',
  RUNS: 'RUNS',
  EXECUTED_BY: 'EXECUTED_BY',
  PRODUCED: 'PRODUCED',
  FAILED_WITH: 'FAILED_WITH',
  VALIDATED_BY: 'VALIDATED_BY',
  EVOLVED_FROM: 'EVOLVED_FROM',
  IMPLEMENTS: 'IMPLEMENTS',
  REFERENCES: 'REFERENCES',
  LEARNED_FROM: 'LEARNED_FROM',
  // Arestas Espaciais e Corporativas
  LOCATED_IN: 'LOCATED_IN',
  OCCUPIES: 'OCCUPIES',
  OPERATES: 'OPERATES',
  CONNECTS_TO: 'CONNECTS_TO',
  TRAVELED_VIA: 'TRAVELED_VIA',
});

class WorldModel extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, WorldNode>} */
    this._nodes = new Map();
    /** @type {Map<string, WorldEdge>} */
    this._edges = new Map();
    /** @type {Array<WorldEvent>} */
    this._changelog = [];
    this._version = 0;
  }

  // ─── NODOS ───────────────────────────────────────────────────────────────

  /**
   * Registra ou atualiza um nó no grafo.
   * Idempotente: mesma id → atualiza metadados, preserva arestas.
   */
  upsertNode(id, type, props = {}) {
    if (!NODE_TYPES[type]) throw new Error(`WorldModel: tipo de nó inválido "${type}"`);
    const existing = this._nodes.get(id);
    const node = {
      id,
      type,
      label: props.label || id,
      props: { ...(existing?.props || {}), ...props },
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
      version: (existing?.version || 0) + 1,
    };
    this._nodes.set(id, node);
    this._record('NODE_UPSERTED', { id, type });
    return node;
  }

  getNode(id) {
    return this._nodes.get(id) || null;
  }

  removeNode(id) {
    const existed = this._nodes.has(id);
    this._nodes.delete(id);
    // Remove arestas órfãs
    for (const [eid, edge] of this._edges) {
      if (edge.source === id || edge.target === id) this._edges.delete(eid);
    }
    if (existed) this._record('NODE_REMOVED', { id });
  }

  // ─── ARESTAS ─────────────────────────────────────────────────────────────

  upsertEdge(source, target, type, props = {}) {
    if (!EDGE_TYPES[type]) throw new Error(`WorldModel: tipo de aresta inválido "${type}"`);
    const eid = edgeId(source, target, type);
    const existing = this._edges.get(eid);
    const edge = {
      id: eid,
      source,
      target,
      type,
      props: { ...(existing?.props || {}), ...props },
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };
    this._edges.set(eid, edge);
    this._record('EDGE_UPSERTED', { source, target, type });
    return edge;
  }

  getEdges(nodeId, direction = 'both') {
    const result = [];
    for (const edge of this._edges.values()) {
      if (direction === 'out' && edge.source === nodeId) result.push(edge);
      else if (direction === 'in' && edge.target === nodeId) result.push(edge);
      else if (direction === 'both' && (edge.source === nodeId || edge.target === nodeId)) result.push(edge);
    }
    return result;
  }

  // ─── CONSULTAS ────────────────────────────────────────────────────────────

  queryNodes(type = null, predicate = null) {
    const all = [...this._nodes.values()];
    let result = type ? all.filter((n) => n.type === type) : all;
    if (predicate) result = result.filter(predicate);
    return result;
  }

  /** Retorna vizinhos diretos de um nó */
  neighbors(id, edgeType = null) {
    const edges = this.getEdges(id, 'out');
    const filtered = edgeType ? edges.filter((e) => e.type === edgeType) : edges;
    return filtered.map((e) => this.getNode(e.target)).filter(Boolean);
  }

  /** Caminho mais curto entre dois nós (BFS) */
  shortestPath(fromId, toId) {
    const visited = new Set();
    const queue = [[fromId, [fromId]]];
    while (queue.length > 0) {
      const [current, path] = queue.shift();
      if (current === toId) return path;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const edge of this.getEdges(current, 'out')) {
        if (!visited.has(edge.target)) queue.push([edge.target, [...path, edge.target]]);
      }
    }
    return null;
  }

  // ─── SNAPSHOT ─────────────────────────────────────────────────────────────

  /** Retorna snapshot serializável do grafo */
  snapshot() {
    return {
      version: ++this._version,
      timestamp: now(),
      nodes: [...this._nodes.values()],
      edges: [...this._edges.values()],
      stats: {
        nodeCount: this._nodes.size,
        edgeCount: this._edges.size,
        changelogSize: this._changelog.length,
        nodesByType: this._countByType(),
      },
    };
  }

  /** Restaura estado a partir de um snapshot (rollback) */
  restore(snapshot) {
    this._nodes.clear();
    this._edges.clear();
    for (const node of snapshot.nodes) this._nodes.set(node.id, node);
    for (const edge of snapshot.edges) this._edges.set(edge.id, edge);
    this._record('SNAPSHOT_RESTORED', { version: snapshot.version });
  }

  /** Exporta changelog (auditoria completa) */
  changelog(limit = 200) {
    return this._changelog.slice(-limit);
  }

  // ─── INTERNOS ─────────────────────────────────────────────────────────────

  _record(type, data) {
    this._changelog.push({ type, data, timestamp: now() });
    this.emit('change', { type, data });
  }

  _countByType() {
    const counts = {};
    for (const node of this._nodes.values()) {
      counts[node.type] = (counts[node.type] || 0) + 1;
    }
    return counts;
  }
}

// ─── SINGLETON GLOBAL ──────────────────────────────────────────────────────
let _instance = null;
function getWorldModel() {
  if (!_instance) _instance = new WorldModel();
  return _instance;
}

function edgeId(source, target, type) {
  return `${source}::${type}::${target}`;
}

function now() {
  return new Date().toISOString();
}

module.exports = { WorldModel, getWorldModel, NODE_TYPES, EDGE_TYPES };
