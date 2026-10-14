const { ValidationError } = require('../kernel/errors');

class DesignIntelligenceOS {
  constructor({ store, bus, controlPlane }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;

    this.families = [
      { id: 'enterprise', name: 'Enterprise', inspiredBy: 'Microsoft, SAP, Atlassian', primaryColor: '#0f62fe', surface: '#f4f7fb', typography: 'Inter' },
      { id: 'ai-workspace', name: 'AI Workspace', inspiredBy: 'ChatGPT, Claude, Cursor', primaryColor: '#10a37f', surface: '#0d0d0e', typography: 'Outfit' },
      { id: 'minimal', name: 'Minimal', inspiredBy: 'Linear, Notion, Vercel', primaryColor: '#000000', surface: '#ffffff', typography: 'Geist' },
      { id: 'finance', name: 'Finance', inspiredBy: 'Stripe, Brex', primaryColor: '#635bff', surface: '#0a2540', typography: 'Roboto' },
      { id: 'industrial', name: 'Industrial / Construction', primaryColor: '#ff6b00', surface: '#1e1e1e', typography: 'Chakra Petch' },
      { id: 'health', name: 'Health / Medical', primaryColor: '#00a884', surface: '#f0fdf4', typography: 'Plus Jakarta Sans' },
      { id: 'marketplace', name: 'Marketplace / E-Commerce', primaryColor: '#ff385c', surface: '#fafafa', typography: 'Inter' },
      { id: 'crm', name: 'CRM Enterprise', primaryColor: '#2563eb', surface: '#f8fafc', typography: 'Inter' },
      { id: 'erp', name: 'ERP Suite', primaryColor: '#4f46e5', surface: '#f1f5f9', typography: 'Inter' },
      { id: 'analytics', name: 'Analytics Dashboard', primaryColor: '#8b5cf6', surface: '#0f172a', typography: 'Fira Code' },
      { id: 'mobile-first', name: 'Mobile First Touch', primaryColor: '#06b6d4', surface: '#ffffff', typography: 'SF Pro Display' },
      { id: 'gaming', name: 'Gaming / Esports', primaryColor: '#ec4899', surface: '#09090b', typography: 'Orbitron' },
      { id: 'luxury', name: 'Luxury / Premium', primaryColor: '#d4af37', surface: '#050505', typography: 'Cinzel' },
      { id: 'cyber', name: 'Cyberpunk Neon', primaryColor: '#00ffcc', surface: '#050014', typography: 'Share Tech Mono' },
      { id: 'glass', name: 'Glassmorphism Blur', primaryColor: '#ffffff33', surface: 'rgba(15,23,42,0.8)', typography: 'Inter' },
      { id: 'brutalist', name: 'Neo-Brutalist', primaryColor: '#ff5050', surface: '#fffdf5', typography: 'Space Grotesk' },
      { id: 'material', name: 'Material You', primaryColor: '#6750a4', surface: '#f3edf7', typography: 'Roboto' },
      { id: 'fluent', name: 'Fluent Design 2', primaryColor: '#0078d4', surface: '#f3f3f3', typography: 'Segoe UI' },
    ];
  }

  async listDesignFamilies(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    return {
      families: this.families,
      totalCount: this.families.length,
    };
  }

  async getFamilyTokens(tenantId, actorId, familyId = 'enterprise') {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const fam = this.families.find((f) => f.id === String(familyId).toLowerCase());
    if (!fam) throw new ValidationError(`Unknown design family: ${familyId}`);

    return {
      family: fam,
      tokens: {
        gridColumns: 12,
        borderRadius: fam.id === 'brutalist' ? '0px' : fam.id === 'glass' ? '16px' : '8px',
        borderWidth: fam.id === 'brutalist' ? '3px' : '1px',
        boxShadow: fam.id === 'glass' ? '0 8px 32px 0 rgba(0,0,0,0.37)' : '0 4px 12px rgba(0,0,0,0.05)',
        responsiveBreakpoints: { mobile: '640px', tablet: '768px', desktop: '1024px', wide: '1280px' },
        accessibilityLevel: 'WCAG_2.1_AAA',
      },
    };
  }
}

module.exports = { DesignIntelligenceOS };
