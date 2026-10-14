'use strict';
/**
 * FÊNIX OS V11 — PERSISTENT SYSTEM TWIN ENGINE
 * 
 * Model:
 *   SYSTEM
 *   ├── PAGES
 *   ├── FLOWS
 *   ├── COMPONENTS
 *   ├── VISUAL DNA
 *   ├── APIs
 *   ├── DATA
 *   ├── FRONTEND
 *   ├── BACKEND
 *   ├── SERVICES
 *   ├── TESTS
 *   ├── GIT
 *   ├── AGENTS
 *   ├── MEMORY
 *   └── DEPENDENCIES
 * 
 * Persistent storage + automatic synchronization with GraphBrain.
 */

const fs = require('fs');
const path = require('path');
const { globalGraphBrain } = require('../brain/graph-brain');

class SystemTwinEngine {
  constructor(options = {}) {
    this.storageDir = options.storageDir || path.join(__dirname, '..', '.data', 'system_twins');
    this.graphBrain = options.graphBrain || globalGraphBrain;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    this.activeTwins = new Map();
    this.loadAll();
  }

  loadAll() {
    try {
      const files = fs.readdirSync(this.storageDir).filter(f => f.endsWith('.json'));
      files.forEach(f => {
        try {
          const raw = fs.readFileSync(path.join(this.storageDir, f), 'utf8');
          const twin = JSON.parse(raw);
          if (twin && twin.id) {
            this.activeTwins.set(twin.id, twin);
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  createOrUpdateTwin(params = {}) {
    const twinId = params.id || params.twinId || `twin:${params.name || 'system'}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9:-]/g, '_');
    const existing = this.activeTwins.get(twinId) || {};

    const twin = {
      id: twinId,
      tenantId: params.tenantId || existing.tenantId || null,
      projectId: params.projectId || existing.projectId || null,
      name: params.name || existing.name || 'Fênix Target System',
      description: params.description || existing.description || 'System Twin reconstructed by Fênix OS V11',
      sourceUrl: params.sourceUrl || existing.sourceUrl || null,
      status: params.status || existing.status || 'OBSERVED', // OBSERVED | MODELING | RECONSTRUCTING | VERIFIED
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Core System Facets
      pages: Array.isArray(params.pages) ? params.pages : (existing.pages || []),
      flows: Array.isArray(params.flows) ? params.flows : (existing.flows || []),
      components: Array.isArray(params.components) ? params.components : (existing.components || []),
      visualDna: hasOwn(params, 'visualDna') ? params.visualDna : (existing.visualDna ?? null),
      apis: Array.isArray(params.apis) ? params.apis : (existing.apis || []),
      dataModels: Array.isArray(params.dataModels) ? params.dataModels : (existing.dataModels || []),
      frontend: hasOwn(params, 'frontend') ? params.frontend : (existing.frontend ?? null),
      backend: hasOwn(params, 'backend') ? params.backend : (existing.backend ?? null),
      services: Array.isArray(params.services) ? params.services : (existing.services || []),
      tests: Array.isArray(params.tests) ? params.tests : (existing.tests || []),
      git: hasOwn(params, 'git') ? params.git : (existing.git ?? null),
      agents: Array.isArray(params.agents) ? params.agents : (existing.agents || []),
      memory: hasOwn(params, 'memory') ? params.memory : (existing.memory ?? null),
      dependencies: Array.isArray(params.dependencies) ? params.dependencies : (existing.dependencies || []),
      perception: hasOwn(params, 'perception') ? params.perception : (existing.perception ?? null),
      graphSync: existing.graphSync || null
    };

    this.activeTwins.set(twinId, twin);
    twin.graphSync = this.syncWithGraphBrain(twin);
    this.activeTwins.set(twinId, twin);
    this.saveTwinToDisk(twin);

    return twin;
  }

  saveTwinToDisk(twin) {
    try {
      const fileName = `${twin.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
      const filePath = path.join(this.storageDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(twin, null, 2), 'utf8');
    } catch (e) {
      console.error('[SystemTwin] Save error:', e.message);
    }
  }

  getTwin(twinId) {
    return this.activeTwins.get(twinId) || null;
  }

  getAllTwins() {
    return Array.from(this.activeTwins.values());
  }

  /**
   * Synchronizes System Twin nodes and edges directly into Fênix Graph Brain
   */
  syncWithGraphBrain(twin) {
    try {
      const graphBrain = this.graphBrain;
      if (!graphBrain || typeof graphBrain.addNode !== 'function' || typeof graphBrain.addEdge !== 'function') {
        return { status: 'UNAVAILABLE', nodes: 0, edges: 0 };
      }
      const systemNodeId = twin.projectId
        ? `project:${graphSegment(twin.tenantId || 'default')}:${graphSegment(twin.projectId)}`
        : `project:${twin.id}`;
      let nodeCount = 0;
      let edgeCount = 0;
      const upsertNode = (id, type, properties) => {
        const createdAt = graphBrain.nodes?.get(id)?.createdAt;
        const node = graphBrain.addNode(id, type, properties);
        if (createdAt) node.createdAt = createdAt;
        nodeCount += 1;
        return node;
      };
      const upsertEdge = (from, type, to, properties = {}) => {
        const existing = graphBrain.edges?.find((edge) => edge.from === from && edge.type === type && edge.to === to);
        if (existing) {
          existing.properties = { ...(existing.properties || {}), ...properties };
          return existing;
        }
        edgeCount += 1;
        return graphBrain.addEdge(from, type, to, properties);
      };
      // Add or update System/Project Node
      upsertNode(systemNodeId, 'PROJECT', {
        name: twin.name,
        sourceUrl: twin.sourceUrl,
        status: twin.status,
        tenantId: twin.tenantId,
        projectId: twin.projectId,
        evidenceSource: twin.perception ? 'PROJECT_PERCEPTION_MAP' : 'SYSTEM_TWIN',
        coverage: twin.perception?.coverage?.status || null,
        updatedAt: twin.updatedAt
      });

      // Synchronize Pages
      (twin.pages || []).forEach(p => {
        const pageNodeId = p.id || `page:${twin.id}-${p.url || p.title}`;
        upsertNode(pageNodeId, 'PAGE', {
          title: p.title,
          url: p.url,
          project: twin.projectId || twin.id,
          tenantId: twin.tenantId,
          evidenceSource: p.evidence ? 'PROJECT_PERCEPTION_MAP' : 'SYSTEM_TWIN',
          evidence: p.evidence || null
        });
        upsertEdge(systemNodeId, 'HAS_PAGE', pageNodeId, { evidenceSource: p.evidence ? 'PROJECT_PERCEPTION_MAP' : 'SYSTEM_TWIN' });
      });

      // Synchronize Components
      (twin.components || []).forEach(c => {
        const compId = typeof c === 'string' ? `component:${c}` : (c.id || `component:${c.name}`);
        upsertNode(compId, 'COMPONENT', {
          name: typeof c === 'string' ? c : c.name,
          path: typeof c === 'string' ? null : (c.path || null),
          project: twin.projectId || twin.id,
          tenantId: twin.tenantId,
          evidenceSource: typeof c === 'string' ? 'SYSTEM_TWIN' : (c.evidence ? 'PROJECT_PERCEPTION_MAP' : 'SYSTEM_TWIN'),
          evidence: typeof c === 'string' ? null : (c.evidence || null)
        });
        upsertEdge(systemNodeId, 'HAS_COMPONENT', compId, { evidenceSource: typeof c === 'string' || !c.evidence ? 'SYSTEM_TWIN' : 'PROJECT_PERCEPTION_MAP' });
      });

      // Synchronize APIs
      (twin.apis || []).forEach(a => {
        const apiId = typeof a === 'string' ? `api:${a}` : (a.id || `api:${a.method || 'GET'}-${a.url || a.endpoint}`);
        upsertNode(apiId, 'API', {
          endpoint: typeof a === 'string' ? a : (a.url || a.endpoint),
          method: typeof a === 'string' ? 'GET' : (a.method || 'GET'),
          file: typeof a === 'string' ? null : (a.file || null),
          tenantId: twin.tenantId,
          projectId: twin.projectId || twin.id,
          evidenceSource: typeof a === 'string' || !a.evidence ? 'SYSTEM_TWIN' : 'PROJECT_PERCEPTION_MAP',
          evidence: typeof a === 'string' ? null : (a.evidence || null)
        });
        upsertEdge(systemNodeId, 'USES_API', apiId, { evidenceSource: typeof a === 'string' || !a.evidence ? 'SYSTEM_TWIN' : 'PROJECT_PERCEPTION_MAP' });
      });

      (twin.dependencies || []).forEach((dependency) => {
        const name = typeof dependency === 'string' ? dependency : dependency.name;
        if (!name) return;
        const dependencyId = typeof dependency === 'string' ? `dependency:${encodeURIComponent(name)}` : (dependency.id || `dependency:${encodeURIComponent(name)}`);
        upsertNode(dependencyId, 'DEPENDENCY', {
          name,
          version: typeof dependency === 'string' ? null : (dependency.version || null),
          manifest: typeof dependency === 'string' ? null : (dependency.manifest || null),
          tenantId: twin.tenantId,
          projectId: twin.projectId || twin.id,
          evidenceSource: typeof dependency === 'string' || !dependency.evidence ? 'SYSTEM_TWIN' : 'PROJECT_PERCEPTION_MAP',
          evidence: typeof dependency === 'string' ? null : (dependency.evidence || null)
        });
        upsertEdge(systemNodeId, 'DEPENDS_ON', dependencyId, { evidenceSource: typeof dependency === 'string' || !dependency.evidence ? 'SYSTEM_TWIN' : 'PROJECT_PERCEPTION_MAP' });
      });

      (twin.tests || []).forEach((item, index) => {
        const testId = typeof item === 'string' ? `test:${encodeURIComponent(twin.id)}:${index}` : (item.id || `test:${encodeURIComponent(twin.id)}:${index}`);
        upsertNode(testId, 'TEST', {
          name: typeof item === 'string' ? item : (item.name || item.path || testId),
          status: typeof item === 'string' ? 'UNKNOWN' : (item.status || 'UNKNOWN'),
          tenantId: twin.tenantId,
          projectId: twin.projectId || twin.id,
          evidenceSource: typeof item === 'string' || !item.evidence ? 'SYSTEM_TWIN' : 'PROJECT_PERCEPTION_MAP',
          evidence: typeof item === 'string' ? null : (item.evidence || null)
        });
        upsertEdge(systemNodeId, 'HAS_TEST', testId, { evidenceSource: typeof item === 'string' || !item.evidence ? 'SYSTEM_TWIN' : 'PROJECT_PERCEPTION_MAP' });
      });

      const persisted = typeof graphBrain.save === 'function' ? graphBrain.save() : false;
      return { status: persisted ? 'LINKED' : 'DEGRADED', projectNodeId: systemNodeId, nodes: nodeCount, edges: edgeCount, persisted };
    } catch (err) {
      console.warn('[SystemTwin] GraphBrain sync warning:', err.message);
      return { status: 'FAILED', nodes: 0, edges: 0, persisted: false };
    }
  }
}

function graphSegment(value) {
  return encodeURIComponent(String(value || 'default'));
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

const globalSystemTwinEngine = new SystemTwinEngine();

module.exports = {
  SystemTwinEngine,
  globalSystemTwinEngine
};
