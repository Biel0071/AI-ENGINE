const { ValidationError } = require('../kernel/errors');

class ApplicationGenomeService {
  constructor({ store, bus, controlPlane, designIntel }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.designIntel = designIntel;

    this.genomes = {
      CRM: ['Sidebar', 'Lead Pipeline DAG', 'Inbox Multi-channel', 'Dashboard KPI Cards', 'Reports & Export', 'Automations Engine', 'Settings & Team RBAC', 'Analytics'],
      ERP: ['Dashboard Overview', 'Financial Accounts & Invoicing', 'Purchasing & Vendors', 'Inventory & Stock Control', 'Production & Manufacturing', 'Fiscal & Taxes', 'HR & Payroll', 'Audit Log'],
      HOSPITAL: ['Patient Electronic Health Records', 'Doctor Appointments & Calendar', 'Billing & Health Insurance', 'Pharmacy & Medication Stock', 'Inpatient Ward Management', 'Lab Tests & Imaging', 'RBAC & Audit Trail'],
      MARKETPLACE: ['Catalog & Product Grid', 'Cart & Multi-seller Checkout', 'Seller Portal & Commission', 'Order Tracking', 'Payment Gateway Integration', 'SEO & Coupon Engine'],
      SAAS: ['Landing Page', 'Auth OIDC & Billing Subscriptions', 'Dashboard Workspace', 'User Team Management', 'API Keys & Webhooks', 'Settings & Usage Limits'],
      AI_WORKSPACE: ['Prompt Input Bar', 'Chat Log & Thread Sidebar', 'Model Selector', 'Artifact Inspector', 'Token Consumption Gauges', 'API Key Management'],
    };
  }

  async getGenomeStructure(tenantId, actorId, appType = 'CRM') {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const t = String(appType).toUpperCase();
    const modules = this.genomes[t] || ['Dashboard', 'Main Module', 'Settings', 'Analytics'];

    return {
      appType: t,
      typicalModulesCount: modules.length,
      typicalModules: modules,
      recommendedDesignFamily: t === 'CRM' ? 'crm' : t === 'ERP' ? 'erp' : t === 'AI_WORKSPACE' ? 'ai-workspace' : 'enterprise',
    };
  }

  async evaluateVisualReasoning(tenantId, actorId, context = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const targetUser = context.targetUser || 'Enterprise Manager';
    const primaryGoal = context.primaryGoal || 'Fast data processing and clean UX';

    return {
      visualReasoning: {
        targetUser,
        primaryGoal,
        desktopMobilePreference: 'DESKTOP_FIRST_RESPONSIVE',
        recommendedDesignFamily: 'enterprise',
        criticalDataFields: ['Primary Metrics', 'Actionable Status Pills', 'Quick Filters'],
        uxFocus: 'Low latency interactions and zero distraction layout',
      },
    };
  }
}

module.exports = { ApplicationGenomeService };
