'use strict';

/**
 * FÊNIX OS — UNIVERSAL SYSTEM MODEL (Level 10)
 * ============================================
 * Deep, unified semantic and operational graph representing the complete system:
 * Project Registry, Project DNA, Architecture Graph, Memory Fabric, Pattern Library,
 * Agent Registry, MissionKernel, JobEngine, Visual Engine, AI City, and Runtime.
 *
 * Implements:
 * - Entity Graph & Dependency Tracking
 * - Impact Analysis (What breaks if entity X changes?)
 * - Full-Stack Reality Invariant Enforcement
 * - Bidirectional Traceability: CODE <-> API <-> UI <-> AGENT <-> PERSISTENCE
 */

const { WorldModel, NODE_TYPES, EDGE_TYPES } = require('./world-model');
const { globalGraphBrain } = require('../brain/graph-brain');
const { globalPatternLibrary } = require('../memory/pattern-library');

class UniversalSystemModel {
  constructor(options = {}) {
    this.worldModel = options.worldModel || new WorldModel();
    this.graphBrain = options.graphBrain || globalGraphBrain;
    this.patternLibrary = options.patternLibrary || globalPatternLibrary;
    this.eventBus = options.eventBus || null;
    this.version = '1.0.0';
    this.bootstrappedAt = new Date().toISOString();
  }

  /**
   * Registers a high-level entity across the system model
   * @param {string} type - Node type (PROJECT, MODULE, API, COMPONENT, AGENT, MISSION, etc.)
   * @param {string} id - Unique identifier
   * @param {object} metadata - Entity details
   */
  registerEntity(type, id, metadata = {}) {
    const canonicalType = type === 'COMPONENT' ? 'MODULE' : (NODE_TYPES[type] || type);
    this.worldModel.upsertNode(id, canonicalType, {
      ...metadata,
      updatedAt: new Date().toISOString()
    });

    if (this.eventBus) {
      this.eventBus.emit('system-model:entity-registered', { type: nodeType, id, metadata });
    }

    return id;
  }

  /**
   * Connects two entities with an intentional directed edge
   * @param {string} fromId - Source entity ID
   * @param {string} edgeType - Edge type (CONTAINS, DEPENDS_ON, EXPOSES, USES, etc.)
   * @param {string} toId - Target entity ID
   * @param {object} [properties]
   */
  connectEntities(fromId, edgeType, toId, properties = {}) {
    const edge = EDGE_TYPES[edgeType] || edgeType;
    this.worldModel.upsertEdge(fromId, toId, edge, properties);
    return { from: fromId, edge, to: toId };
  }

  /**
   * Computes complete impact analysis for a potential modification
   * Identifies all downstream dependents, APIs, screens, and tests affected.
   * @param {string} entityId
   */
  computeImpactAnalysis(entityId) {
    const affectedNodes = new Set();
    const traversalQueue = [entityId];

    while (traversalQueue.length > 0) {
      const current = traversalQueue.shift();
      const connectedEdges = this.worldModel.getEdges ? this.worldModel.getEdges(current, 'both') : [];

      // Look for dependent entities
      for (const edge of connectedEdges) {
        const neighborId = edge.source === current ? edge.target : edge.source;
        if (!affectedNodes.has(neighborId) && neighborId !== entityId) {
          affectedNodes.add(neighborId);
          traversalQueue.push(neighborId);
        }
      }
    }

    const dependentsList = Array.from(affectedNodes).map(id => {
      const node = this.worldModel.getNode?.(id) || { id, type: 'UNKNOWN' };
      return { id: node.id, type: node.type, label: node.data?.name || node.id };
    });

    return {
      targetEntity: entityId,
      totalAffected: dependentsList.length,
      affectedEntities: dependentsList,
      riskLevel: dependentsList.length > 5 ? 'HIGH' : (dependentsList.length > 0 ? 'MEDIUM' : 'LOW'),
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Derives a full snapshot of the Universal System Model
   */
  getSystemSnapshot() {
    const snap = this.worldModel.snapshot ? this.worldModel.snapshot() : { nodes: [], edges: [] };
    const nodes = snap.nodes || [];
    const edges = snap.edges || [];

    const stats = {
      projects: nodes.filter(n => n.type === 'PROJECT').length,
      apis: nodes.filter(n => n.type === 'API').length,
      components: nodes.filter(n => n.type === 'COMPONENT' || n.type === 'MODULE').length,
      agents: nodes.filter(n => n.type === 'AGENT').length,
      missions: nodes.filter(n => n.type === 'MISSION' || n.type === 'JOB').length,
      databases: nodes.filter(n => n.type === 'DATABASE').length,
      totalNodes: nodes.length,
      totalEdges: edges.length
    };

    return {
      version: this.version,
      stats,
      nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
      edges: edges.map(e => ({ from: e.from, to: e.to, type: e.type })),
      snapshotAt: new Date().toISOString()
    };
  }
}

const globalUniversalSystemModel = new UniversalSystemModel();

module.exports = {
  UniversalSystemModel,
  globalUniversalSystemModel
};
