/**
 * FÊNIX OS — Artifact Graph Engine
 * Builds the 13-level causal software graph connecting Project -> Module -> Page -> Component -> Function -> API -> DB.
 */

class ArtifactGraph {
  constructor({ projectId = 'default' } = {}) {
    this.projectId = projectId;
    this.nodes = new Map(); // nodeId -> Node
    this.edges = []; // list of { from, to, relationship }
  }

  addNode(id, type, data = {}) {
    const node = {
      id,
      type, // 'project'|'system'|'module'|'feature'|'page'|'component'|'code'|'function'|'api'|'database'|'integration'|'runtime'|'deploy'
      data,
      createdAt: new Date().toISOString()
    };
    this.nodes.set(id, node);
    return node;
  }

  addEdge(fromId, toId, relationship = 'contains') {
    const edge = { from: fromId, to: toId, relationship };
    this.edges.push(edge);
    return edge;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getChildren(id) {
    const outgoing = this.edges.filter(e => e.from === id).map(e => e.to);
    return outgoing.map(targetId => this.nodes.get(targetId)).filter(Boolean);
  }

  getParents(id) {
    const incoming = this.edges.filter(e => e.to === id).map(e => e.from);
    return incoming.map(sourceId => this.nodes.get(sourceId)).filter(Boolean);
  }

  /**
   * Builds an Artifact Graph from a project analysis report
   */
  static fromProjectReport(report) {
    const graph = new ArtifactGraph({ projectId: report.projectId });

    // 1. Root Project Node
    const projectNode = graph.addNode(`proj:${report.projectId}`, 'project', { name: report.projectName, stack: report.detectedStack });

    // 2. Modules
    const coreModule = graph.addNode(`mod:core`, 'module', { name: 'Core Subsystem' });
    graph.addEdge(projectNode.id, coreModule.id, 'contains');

    // 3. Components
    for (const comp of report.components || []) {
      const compNode = graph.addNode(`comp:${comp.componentName}`, 'component', { file: comp.file, name: comp.componentName });
      graph.addEdge(coreModule.id, compNode.id, 'includes');
    }

    // 4. API Routes
    for (const route of report.routes || []) {
      const apiNode = graph.addNode(`api:${route.file}`, 'api', { file: route.file, scope: route.inferredScope });
      graph.addEdge(coreModule.id, apiNode.id, 'exposes');
    }

    // 5. Database Schemas
    for (const schema of report.database?.schemaFiles || []) {
      const dbNode = graph.addNode(`db:${schema}`, 'database', { file: schema, type: report.database.type });
      graph.addEdge(coreModule.id, dbNode.id, 'persists');
    }

    return graph;
  }

  toJSON() {
    return {
      projectId: this.projectId,
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      nodes: Array.from(this.nodes.values()),
      edges: this.edges
    };
  }
}

module.exports = { ArtifactGraph };
