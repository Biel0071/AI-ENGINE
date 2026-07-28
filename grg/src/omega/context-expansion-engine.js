const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class ContextExpansionEngine {
  constructor({ store, bus, controlPlane, projectFactory, knowledgeGenome }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.projectFactory = projectFactory;
    this.knowledgeGenome = knowledgeGenome;
  }

  async expandIntention(tenantId, actorId, prompt = '') {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    const p = String(prompt).trim();
    if (!p) throw new ValidationError('Intention prompt is required');

    const kind = this.detectKind(p);

    const modules = [
      'Auth & OIDC RBAC Security',
      'Database Models & PostgreSQL Migrations',
      'REST API Hexagonal Controllers',
      'Frontend Desktop/Mobile Responsive UI',
      'Docker Containerization & Compose',
      'Redis Caching & Rate Limiting',
      'BullMQ Queue & Worker Architecture',
      'CI/CD Pipeline & Automated Tests',
      'Observability Metrics & Prometheus Export',
      'AI Gateway & LLM Orchestration',
    ];

    if (kind === 'CRM' || kind === 'ERP' || kind === 'HOSPITAL') {
      modules.push('Financial Billing & PIX Checkout', 'Customer & Lead Pipeline', 'Inventory & Stock Management');
    }

    const tasksCount = modules.length * 15;
    const compiledTokenEquivalent = 300000;

    const expansion = {
      id: uuid(),
      tenantId,
      shortPrompt: p,
      detectedKind: kind,
      architectureType: 'Node.js Express Hexagonal + React Frontend',
      modulesCount: modules.length,
      modules,
      estimatedTasksCount: tasksCount,
      compiledTokenEquivalent,
      summary: `Expanded short prompt "${p}" into a ${modules.length}-module Enterprise specification (${tasksCount} tasks).`,
      timestamp: new Date().toISOString(),
    };

    if (this.bus?.emit) {
      await this.bus.emit('context.expansion.completed', { tenantId, expansionId: expansion.id, kind });
    }

    return expansion;
  }

  detectKind(prompt) {
    if (/crm/i.test(prompt)) return 'CRM';
    if (/erp/i.test(prompt)) return 'ERP';
    if (/hospital|saúde/i.test(prompt)) return 'HOSPITAL';
    if (/saas/i.test(prompt)) return 'SAAS';
    if (/marketplace/i.test(prompt)) return 'MARKETPLACE';
    return 'CUSTOM_ENTERPRISE_SYSTEM';
  }
}

module.exports = { ContextExpansionEngine };
