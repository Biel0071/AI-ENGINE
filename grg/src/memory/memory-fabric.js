const crypto = require('node:crypto');

// MemoryProvider Base Interface
class MemoryProvider {
  constructor(name) { this.name = name; }
  async connect() {}
  async remember(entry) { throw new Error('Not implemented'); }
  async retrieve(query, options) { throw new Error('Not implemented'); }
  async forget(id) { throw new Error('Not implemented'); }
}

// Postgres + Vector Provider (Adapting our existing MemoryEngine & Qdrant)
class FenixEngineProvider extends MemoryProvider {
  constructor(memoryEngine) {
    super('FenixEngineProvider');
    this.engine = memoryEngine;
  }
  async remember(tenantId, actorId, record) {
    // Just pass the record through to the underlying engine since the Gateway already normalized it
    return await this.engine.remember(tenantId, actorId, record);
  }
  async retrieve(tenantId, actorId, query, options) {
    if (this.engine.query) {
      return await this.engine.query(tenantId, actorId, query, options);
    }
    return [];
  }
}

// Graphiti Provider (Placeholder/Adapter for temporal graph memory)
class GraphitiProvider extends MemoryProvider {
  constructor(endpoint) { super('GraphitiProvider'); this.endpoint = endpoint; }
  async remember(tenantId, actorId, record) { return { id: 'mock', status: 'stored_in_graphiti' }; }
  async retrieve(tenantId, actorId, query, options) { return []; }
}

// Zep Provider (Placeholder)
class ZepProvider extends MemoryProvider {
  constructor(endpoint) { super('ZepProvider'); this.endpoint = endpoint; }
  async remember(tenantId, actorId, record) { return { id: 'mock', status: 'stored_in_zep' }; }
  async retrieve(tenantId, actorId, query, options) { return []; }
}

// Memory Gateway (Memory Fabric 2.0)
class MemoryGateway {
  constructor(providers = []) {
    this.providers = providers;
    this.visualMemories = new Map(); // Simple in-memory fallback for visual memory
  }

  use(provider) {
    this.providers.push(provider);
  }

  // Universal Store
  async remember(tenantId, actorId, input) {
    const record = {
      tenantId,
      actorId,
      id: input.id || crypto.randomUUID(),
      kind: input.kind || 'semantic',
      title: input.title || 'Untitled',
      content: input.content || '',
      confidence: input.confidence || 1.0,
      provenance: input.provenance || { type: 'system', reference: 'unknown' },
      projectId: input.projectId || null,
      orgId: input.orgId || null,
      scopeType: input.scopeType || null,
      scopeId: input.scopeId || null,
      stableKey: input.stableKey || null,
      ownerActorId: input.ownerActorId || null,
      tags: input.tags || [],
      classification: input.classification || 'internal',
      retentionUntil: input.retentionUntil || null,
      timestamp: input.timestamp || Date.now(),
      created_at: Date.now(),
      visual_reference: input.visual_reference || null
    };

    // Broadcast to all configured providers
    const results = [];
    let primaryResult = null;
    
    for (const provider of this.providers) {
      try {
        const res = await provider.remember(tenantId, actorId, record);
        if (provider.name === 'FenixEngineProvider') primaryResult = res;
        results.push({ provider: provider.name, status: 'success', data: res });
      } catch (err) {
        results.push({ provider: provider.name, status: 'error', error: err.message });
      }
    }

    if (input.kind === 'visual' && input.visual_reference) {
      this.visualMemories.set(record.id, record);
    }

    return primaryResult || { recordId: record.id, distributions: results };
  }

  // Universal Retrieval (Hybrid Search)
  async query(tenantId, actorId, query, options = {}) {
    let allResults = [];
    let primaryResults = null;

    for (const provider of this.providers) {
      try {
        const res = await provider.retrieve(tenantId, actorId, query, options);
        if (provider.name === 'FenixEngineProvider') {
          primaryResults = res;
        } else {
          allResults = allResults.concat(res?.results || res || []);
        }
      } catch (e) {}
    }
    
    if (primaryResults) return primaryResults; // Fallback to standard ranking if no other providers added yet.
    return { results: this.rank(allResults, query, options), metadata: { hybrid: true } };
  }

  rank(memories, query, options) {
    // Basic L1 ranking: recency + importance
    return memories.sort((a, b) => {
      const scoreA = (a.confidence || 1) + (a.importance || 0.5);
      const scoreB = (b.confidence || 1) + (b.importance || 0.5);
      return scoreB - scoreA;
    }).slice(0, options.limit || 10);
  }

  async getVisualMemory(id) {
    return this.visualMemories.get(id);
  }

  async history(tenantId, actorId, memoryId) {
    const p = this.providers.find(x => x.name === 'FenixEngineProvider');
    if (p && p.engine.history) return await p.engine.history(tenantId, actorId, memoryId);
    return [];
  }

  async forget(tenantId, actorId, memoryId, reason) {
    const p = this.providers.find(x => x.name === 'FenixEngineProvider');
    if (p && p.engine.forget) return await p.engine.forget(tenantId, actorId, memoryId, reason);
    return { success: false };
  }

  async consolidate(tenantId, actorId, payload) {
    const p = this.providers.find(x => x.name === 'FenixEngineProvider');
    if (p && p.engine.consolidate) return await p.engine.consolidate(tenantId, actorId, payload);
    return { consolidated: 0 };
  }
}

module.exports = {
  MemoryProvider,
  FenixEngineProvider,
  GraphitiProvider,
  ZepProvider,
  MemoryGateway
};
