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
      visualDna: params.visualDna || existing.visualDna || {},
      apis: Array.isArray(params.apis) ? params.apis : (existing.apis || []),
      dataModels: Array.isArray(params.dataModels) ? params.dataModels : (existing.dataModels || []),
      frontend: params.frontend || existing.frontend || { framework: 'Vanilla Web Components', entry: 'index.html' },
      backend: params.backend || existing.backend || { framework: 'Node.js Fastify', port: 4410 },
      services: Array.isArray(params.services) ? params.services : (existing.services || ['BullMQ Queue', 'PM2 Process']),
      tests: Array.isArray(params.tests) ? params.tests : (existing.tests || []),
      git: params.git || existing.git || { branch: 'master', synced: true },
      agents: Array.isArray(params.agents) ? params.agents : (existing.agents || ['agent-orchestrator', 'agent-frontend']),
      memory: params.memory || existing.memory || { patternsLearned: 0 },
      dependencies: Array.isArray(params.dependencies) ? params.dependencies : (existing.dependencies || [])
    };

    this.activeTwins.set(twinId, twin);
    this.saveTwinToDisk(twin);
    this.syncWithGraphBrain(twin);

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
      const systemNodeId = `project:${twin.id}`;
      // Add or update System/Project Node
      try {
        globalGraphBrain.addNode(systemNodeId, 'PROJECT', {
          name: twin.name,
          sourceUrl: twin.sourceUrl,
          status: twin.status,
          updatedAt: twin.updatedAt
        });
      } catch (e) {}

      // Synchronize Pages
      (twin.pages || []).forEach(p => {
        const pageNodeId = p.id || `page:${twin.id}-${p.url || p.title}`;
        try {
          globalGraphBrain.addNode(pageNodeId, 'PAGE', {
            title: p.title,
            url: p.url,
            project: twin.id
          });
          globalGraphBrain.addEdge(systemNodeId, 'HAS_PAGE', pageNodeId);
        } catch (e) {}
      });

      // Synchronize Components
      (twin.components || []).forEach(c => {
        const compId = typeof c === 'string' ? `component:${c}` : (c.id || `component:${c.name}`);
        try {
          globalGraphBrain.addNode(compId, 'COMPONENT', {
            name: typeof c === 'string' ? c : c.name,
            project: twin.id
          });
        } catch (e) {}
      });

      // Synchronize APIs
      (twin.apis || []).forEach(a => {
        const apiId = typeof a === 'string' ? `api:${a}` : (a.id || `api:${a.method || 'GET'}-${a.url || a.endpoint}`);
        try {
          globalGraphBrain.addNode(apiId, 'API', {
            endpoint: typeof a === 'string' ? a : (a.url || a.endpoint),
            method: typeof a === 'string' ? 'GET' : (a.method || 'GET')
          });
          globalGraphBrain.addEdge(systemNodeId, 'USES_API', apiId);
        } catch (e) {}
      });

      globalGraphBrain.save();
    } catch (err) {
      console.warn('[SystemTwin] GraphBrain sync warning:', err.message);
    }
  }
}

const globalSystemTwinEngine = new SystemTwinEngine();

module.exports = {
  SystemTwinEngine,
  globalSystemTwinEngine
};
