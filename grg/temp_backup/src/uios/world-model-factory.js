const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class WorldModelFactory {
  constructor({ store, bus, controlPlane, digitalTwin }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.digitalTwin = digitalTwin;
  }

  async getWorldState(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      tenantId,
      ecosystem: {
        activeProjects: 4,
        runningServices: 12,
        activeSubagents: 15,
        masterNodeStatus: 'ONLINE_VPS_MASTER',
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async createArtifact(tenantId, actorId, spec = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    if (!spec.type || !spec.name) {
      throw new ValidationError('Artifact type and name are required');
    }

    const artifact = {
      id: uuid(),
      tenantId,
      type: String(spec.type).toUpperCase(), // PLUGIN, MCP, SAAS, GAME, MOBILE_APP
      name: String(spec.name),
      constitutionCompliant: true,
      createdAt: new Date().toISOString(),
    };

    return artifact;
  }
}

module.exports = { WorldModelFactory };
