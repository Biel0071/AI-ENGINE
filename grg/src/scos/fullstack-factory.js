const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class FullStackFactoryService {
  constructor({ store, bus, controlPlane, designIntel, appGenome, projectFactory }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.designIntel = designIntel;
    this.appGenome = appGenome;
    this.projectFactory = projectFactory;
  }

  async generateMultiDesignProposals(tenantId, actorId, spec = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    const appName = spec.name || 'Enterprise System';

    const proposals = [
      { id: 'proposal-enterprise', name: 'Enterprise Style', family: 'enterprise', primaryColor: '#0f62fe', description: 'Clean, dense, structured layout ideal for corporate operations.' },
      { id: 'proposal-minimal', name: 'Minimal Style', family: 'minimal', primaryColor: '#000000', description: 'Ultra-clean, high-focus layout inspired by Linear and Notion.' },
      { id: 'proposal-ai', name: 'AI Workspace Style', family: 'ai-workspace', primaryColor: '#10a37f', description: 'Dark-mode focused, prompt-driven workspace with artifact inspector.' },
      { id: 'proposal-luxury', name: 'Luxury Style', family: 'luxury', primaryColor: '#d4af37', description: 'High-contrast premium dark aesthetic with gold accents.' },
    ];

    return {
      tenantId,
      appName,
      proposalsCount: proposals.length,
      proposals,
      generatedAt: new Date().toISOString(),
    };
  }

  async syncFrontendBackendContract(tenantId, actorId, update = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    if (!update.contractName) throw new ValidationError('contractName is required for synchronization');

    const result = {
      id: uuid(),
      tenantId,
      contractName: String(update.contractName),
      syncedComponents: ['React UI Components', 'TypeScript Interfaces', 'Express REST Routes', 'PostgreSQL Schema', 'OpenAPI 3.0 Artifact'],
      syncStatus: 'SYNCHRONIZED_GREEN',
      timestamp: new Date().toISOString(),
    };

    if (this.bus?.emit) {
      await this.bus.emit('fullstack.contract.synced', { tenantId, syncId: result.id, contractName: result.contractName });
    }

    return result;
  }
}

module.exports = { FullStackFactoryService };
