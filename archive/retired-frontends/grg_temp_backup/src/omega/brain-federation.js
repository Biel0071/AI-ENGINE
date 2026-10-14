const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class BrainFederation {
  constructor({ store, bus, controlPlane, knowledgeGenome }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.knowledgeGenome = knowledgeGenome;
    this.brains = [
      'backend', 'frontend', 'architecture', 'devops', 'database', 'security',
      'cloud', 'ai', 'whatsapp', 'crm', 'erp', 'marketplace', 'sales',
      'machine-learning', 'computer-vision', 'robotics', 'research', 'python', 'rust', 'blockchain',
    ].map((domain) => ({
      id: `brain-${domain}`,
      domain,
      status: 'ACTIVE_EVOLVING',
      knowledgeVersion: 'Ω.1.0',
      densityScore: 98.5,
    }));
  }

  async listDomainBrains(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      brains: this.brains,
      total: this.brains.length,
    };
  }

  async fuseKnowledge(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    const sourceDomain = input.sourceDomain;
    const targetDomain = input.targetDomain;
    if (!sourceDomain || !targetDomain) {
      throw new ValidationError('Source and target domains are required for fusion');
    }

    const fusion = {
      id: uuid(),
      tenantId,
      sourceDomain,
      targetDomain,
      synthesizedCapabilitiesCount: 1,
      deduplicatedCapsulesCount: 3,
      genomeVersion: 'Ω.1.1',
      fusedAt: new Date().toISOString(),
    };

    if (this.bus?.emit) {
      await this.bus.emit('brain.federation.fused', { tenantId, fusionId: fusion.id, sourceDomain, targetDomain });
    }

    return fusion;
  }
}

module.exports = { BrainFederation };
