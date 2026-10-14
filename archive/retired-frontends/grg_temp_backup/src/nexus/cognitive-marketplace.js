const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class CognitiveMarketplaceService {
  constructor({ store, bus, controlPlane, capOs }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.capOs = capOs;
  }

  async listPublishedArtifacts(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    let list = [];
    await this.store.update((state) => {
      list = state.cognitiveMarketplaceItems || [];
      return state;
    });

    if (list.length === 0) {
      list = [
        { id: 'mkt-1', type: 'CAPABILITY', name: 'Hexagonal REST Adapter Engine', downloads: 1420, rating: 4.9 },
        { id: 'mkt-2', type: 'MCP', name: 'Vector Qdrant Memory Connector', downloads: 890, rating: 4.8 },
        { id: 'mkt-3', type: 'PLAYBOOK', name: 'Automated 10-Stage Canary Deploy', downloads: 2150, rating: 5.0 },
      ];
    }

    return {
      tenantId,
      artifacts: list,
      total: list.length,
    };
  }

  async publishArtifact(tenantId, actorId, artifact = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    if (!artifact.type || !artifact.name) throw new ValidationError('Artifact type and name are required');

    const item = {
      id: uuid(),
      tenantId,
      type: String(artifact.type).toUpperCase(),
      name: String(artifact.name),
      downloads: 0,
      rating: 5.0,
      publishedAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.cognitiveMarketplaceItems = state.cognitiveMarketplaceItems || [];
      state.cognitiveMarketplaceItems.push(item);
      return state;
    });

    return item;
  }
}

module.exports = { CognitiveMarketplaceService };
