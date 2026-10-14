const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class PluginSkillsEcosystem {
  constructor({ store, bus, controlPlane, approvals }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.approvals = approvals;
    this.marketplace = [
      {
        id: 'plugin-github-intel',
        name: 'GitHub Repository Intelligence',
        version: '1.2.0',
        author: 'GRG FÊNIX Core Team',
        description: 'Multi-org GitHub repository analysis, PR automation, and workflow triggers.',
        category: 'DEVOPS',
        permissions: ['repo:read', 'repo:write'],
        signature: 'sha256-verified-grg-plugin',
        installed: true,
      },
      {
        id: 'plugin-vps-monitor',
        name: 'VPS & Docker Infra Monitor',
        version: '2.0.1',
        author: 'GRG FÊNIX Core Team',
        description: 'Live VPS metric monitoring, container restart, volume backup & health alerts.',
        category: 'INFRASTRUCTURE',
        permissions: ['runtime:admin'],
        signature: 'sha256-verified-grg-plugin',
        installed: true,
      },
      {
        id: 'plugin-db-architect',
        name: 'Database Migration & Schema Optimizer',
        version: '1.0.4',
        author: 'GRG FÊNIX Core Team',
        description: 'PostgreSQL migration generator, query index optimizer, and schema validator.',
        category: 'DATABASE',
        permissions: ['project:write'],
        signature: 'sha256-verified-grg-plugin',
        installed: false,
      },
    ];

    this.skills = [
      {
        id: 'skill-hexagonal-scaffold',
        name: 'Hexagonal Architecture Scaffolder',
        version: '2.1.0',
        metrics: { executionCount: 42, avgLatencyMs: 85, successRate: 1.0 },
        lifecycle: 'OPTIMIZED_AND_PUBLISHED',
      },
      {
        id: 'skill-oidc-security',
        name: 'OIDC Identity & Security Enforcer',
        version: '1.5.0',
        metrics: { executionCount: 28, avgLatencyMs: 40, successRate: 1.0 },
        lifecycle: 'OPTIMIZED_AND_PUBLISHED',
      },
    ];
  }

  async getMarketplace(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      plugins: this.marketplace,
      total: this.marketplace.length,
    };
  }

  async installPlugin(tenantId, actorId, pluginId) {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    const item = this.marketplace.find((p) => p.id === pluginId);
    if (!item) throw new NotFoundError(`Plugin not found: ${pluginId}`);

    item.installed = true;
    item.installedAt = new Date().toISOString();

    if (this.bus?.emit) {
      await this.bus.emit('plugin.installed', { tenantId, pluginId, version: item.version });
    }

    return { plugin: item, message: `Plugin ${item.name} installed successfully.` };
  }

  async getSkillEvolution(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      skills: this.skills,
      total: this.skills.length,
    };
  }
}

module.exports = { PluginSkillsEcosystem };
