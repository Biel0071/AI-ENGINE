'use strict';
/**
 * FÊNIX OS V8.3 — Persistent Graph Brain & Continuous Learning Loop
 * Interconnects Projects, Pages, Components, APIs, Commits, Errors, Fixes, and Patterns.
 */

const fs = require('node:fs');
const path = require('node:path');

const NODE_TYPES = Object.freeze([
  'PROJECT', 'COMPANY', 'REPOSITORY', 'BRANCH', 'COMMIT',
  'PAGE', 'COMPONENT', 'API', 'SERVICE', 'DATABASE',
  'AGENT', 'TOOL', 'MODEL', 'TASK', 'JOB',
  'TEST', 'SCREENSHOT', 'ERROR', 'FIX', 'DECISION', 'KNOWLEDGE', 'PATTERN'
]);

const EDGE_TYPES = Object.freeze([
  'HAS_PAGE', 'USES_API', 'HAS_COMPONENT', 'USES_SERVICE', 'HAS_COMMIT',
  'USED_BY', 'FIXED_BY', 'VALIDATED_BY', 'PRODUCED', 'EXECUTED_BY',
  'RELATED_TO', 'APPLIES_TO'
]);

class GraphBrain {
  constructor(options = {}) {
    this.storagePath = options.storagePath || path.join(__dirname, '..', '.data', 'graph_brain.json');
    this.nodes = new Map();
    this.edges = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const data = JSON.parse(raw);
        (data.nodes || []).forEach(n => this.nodes.set(n.id, n));
        this.edges = data.edges || [];
      } else {
        this.seedInitialGraph();
      }
    } catch (e) {
      this.seedInitialGraph();
    }
  }

  save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        nodes: Array.from(this.nodes.values()),
        edges: this.edges,
      };
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      // safe fallback
    }
  }

  seedInitialGraph() {
    // Projects
    this.addNode('project:fenix-os', 'PROJECT', { name: 'FÊNIX OS', stack: 'Node.js, PixiJS, BullMQ' });
    this.addNode('project:zapai-crm', 'PROJECT', { name: 'ZapAI CRM', stack: 'React 18, Vite, TypeScript, Express, Baileys' });
    this.addNode('project:api-platform', 'PROJECT', { name: 'API Platform', stack: 'Fastify, TypeScript, Prisma, BullMQ, Docker' });

    // Canonical Learned Patterns
    this.addNode('pattern:realtime-reconnect', 'PATTERN', {
      title: 'Realtime Inbox Reconnection',
      domain: 'WebSockets / Socket.IO',
      solution: 'Exponential backoff reconnect + heartbeat ping every 15s + state preservation on disconnect'
    });
    this.addEdge('pattern:realtime-reconnect', 'APPLIES_TO', 'project:zapai-crm');

    this.addNode('pattern:dual-lane-nonblocking', 'PATTERN', {
      title: 'Dual-Lane Non-Blocking Concurrency',
      domain: 'HTTP / Queueing',
      solution: 'Fast Lane bypasses BullMQ for SLA < 300ms while heavy jobs queue safely'
    });
    this.addEdge('pattern:dual-lane-nonblocking', 'APPLIES_TO', 'project:fenix-os');

    this.save();
  }

  addNode(id, type, properties = {}) {
    if (!NODE_TYPES.includes(type)) throw new Error(`Invalid node type: ${type}`);
    const node = { id, type, properties, createdAt: new Date().toISOString() };
    this.nodes.set(id, node);
    return node;
  }

  addEdge(fromId, type, toId, properties = {}) {
    if (!EDGE_TYPES.includes(type)) throw new Error(`Invalid edge type: ${type}`);
    const edge = { from: fromId, type, to: toId, properties, createdAt: new Date().toISOString() };
    this.edges.push(edge);
    return edge;
  }

  getNeighbors(nodeId, edgeType = null) {
    return this.edges
      .filter(e => (e.from === nodeId || e.to === nodeId) && (!edgeType || e.type === edgeType))
      .map(e => {
        const neighborId = e.from === nodeId ? e.to : e.from;
        return { edge: e.type, neighbor: this.nodes.get(neighborId) || { id: neighborId } };
      });
  }

  recordLearning(incident = {}) {
    const errorId = `error:${Date.now()}`;
    const fixId = `fix:${Date.now()}`;
    const patternId = `pattern:${incident.category || 'general'}-${Date.now()}`;

    this.addNode(errorId, 'ERROR', { description: incident.error, context: incident.context });
    this.addNode(fixId, 'FIX', { solution: incident.solution, changedFiles: incident.changedFiles });
    this.addEdge(errorId, 'FIXED_BY', fixId);

    if (incident.pattern) {
      this.addNode(patternId, 'PATTERN', { title: incident.pattern, principle: incident.principle });
      this.addEdge(fixId, 'VALIDATED_BY', patternId);
      if (incident.projectId) {
        this.addEdge(patternId, 'APPLIES_TO', `project:${incident.projectId}`);
      }
    }

    this.save();
    return { errorId, fixId, patternId };
  }

  findPatterns(query) {
    const q = (query || '').toLowerCase();
    const patterns = [];
    for (const node of this.nodes.values()) {
      if (node.type === 'PATTERN') {
        const title = (node.properties.title || '').toLowerCase();
        const solution = (node.properties.solution || '').toLowerCase();
        if (!q || title.includes(q) || solution.includes(q)) {
          patterns.push(node);
        }
      }
    }
    return patterns;
  }

  getStats() {
    const typeCounts = {};
    for (const node of this.nodes.values()) {
      typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
    }
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      nodeTypes: typeCounts,
    };
  }
}

const globalGraphBrain = new GraphBrain();

module.exports = { GraphBrain, globalGraphBrain, NODE_TYPES, EDGE_TYPES };
