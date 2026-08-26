const { uuid, slugify } = require('../kernel/ids');
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require('../kernel/errors');

// White Label + Design + Marketplace + Billing. Tudo por configuração/tokens; zero fork.
class ProductSuite {
  constructor({ store, bus, controlPlane }) {
    this.store = store; this.bus = bus; this.cp = controlPlane;
  }

  // ---- Design Engine: tokens são fonte única de verdade ----
  async createDesignSystem(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'design:manage');
    const tokens = normalizeTokens(input && input.tokens);
    const ds = { id: uuid(), tenantId, name: input.name || 'default', tokens, createdAt: now() };
    await this.store.update((s) => { s.designSystems.push(ds); return s; });
    return ds;
  }

  themeFromTokens(tokens) {
    // deriva light/dark a partir dos mesmos tokens (sem CSS duplicado)
    return {
      light: tokens,
      dark: { ...tokens, background: tokens.foreground, foreground: tokens.background },
    };
  }

  // ---- White Label: brand + plan + license + domain + moduleSet ----
  async createPlan(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'whitelabel:manage');
    const plan = {
      id: slugify(input.id || input.name), tenantId, name: input.name,
      features: [...new Set(input.features || [])], // capabilities incluídas
      priceUsd: Number(input.priceUsd || 0), limits: input.limits || {}, createdAt: now(),
    };
    if (!plan.id) throw new ValidationError('plan.name is required');
    await this.store.update((s) => {
      if (s.plans.some((p) => p.tenantId === tenantId && p.id === plan.id)) throw new ConflictError(`Plan exists: ${plan.id}`);
      s.plans.push(plan); return s;
    });
    return plan;
  }

  async provisionWhiteLabel(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'whitelabel:manage');
    const { customerId, projectId, planId } = input;
    const state = await this.store.read();
    if (!state.customers.some((c) => c.tenantId === tenantId && c.id === customerId)) throw new NotFoundError(`Customer not found: ${customerId}`);
    if (!state.projects.some((p) => p.tenantId === tenantId && p.id === projectId)) throw new NotFoundError(`Project not found: ${projectId}`);
    const plan = state.plans.find((p) => p.tenantId === tenantId && p.id === planId);
    if (!plan) throw new NotFoundError(`Plan not found: ${planId}`);

    const brand = {
      id: uuid(), tenantId, customerId, projectId,
      name: input.brandName || 'Brand',
      logo: input.logo || null,
      colors: input.colors || {},
      locale: input.locale || 'pt-BR',
      designSystemId: input.designSystemId || null,
      createdAt: now(),
    };
    const domain = input.domain ? {
      id: uuid(), tenantId, customerId, projectId, host: input.domain,
      ssl: 'pending', dns: 'pending', status: 'binding', createdAt: now(),
    } : null;
    const license = {
      id: uuid(), tenantId, customerId, projectId, planId,
      seats: Number(input.seats || 5), validUntil: input.validUntil || null,
      status: 'active', createdAt: now(),
    };
    const moduleSet = {
      id: uuid(), tenantId, customerId, projectId,
      modules: [...plan.features], createdAt: now(),
    };

    await this.store.update((s) => {
      s.brands.push(brand);
      if (domain) s.domains.push(domain);
      s.licenses.push(license);
      s.moduleSets.push(moduleSet);
      s.memoryEvents.push({
        id: uuid(), tenantId, projectId, actorId, kind: 'white-label-provisioned',
        summary: `White label for customer ${customerId} on plan ${planId} (${moduleSet.modules.length} modules)`,
        evidence: [`license:${license.id}`], confidence: 1, createdAt: now(),
      });
      return s;
    });
    await this.bus.emit('whitelabel.provisioned', { tenantId, customerId, projectId, planId });
    return { brand, domain, license, moduleSet };
  }

  // PlanGate: uma capability só funciona se estiver no moduleSet do cliente e a licença ativa.
  async isModuleEnabled(tenantId, customerId, projectId, capabilityId) {
    const state = await this.store.read();
    const license = state.licenses.find((l) => l.tenantId === tenantId && l.customerId === customerId && l.projectId === projectId);
    if (!license || license.status !== 'active') return false;
    const set = state.moduleSets.find((m) => m.tenantId === tenantId && m.customerId === customerId && m.projectId === projectId);
    return !!set && set.modules.includes(capabilityId);
  }

  async requireModule(tenantId, customerId, projectId, capabilityId) {
    if (!(await this.isModuleEnabled(tenantId, customerId, projectId, capabilityId))) {
      throw new ForbiddenError(`Capability not in plan/license: ${capabilityId}`);
    }
    return true;
  }

  // ---- Marketplace: instalar capability por clique (adiciona ao moduleSet) ----
  async installModule(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'marketplace:install');
    const { customerId, projectId, capabilityId } = input;
    const state = await this.store.read();
    if (!state.capabilities.some((c) => c.tenantId === tenantId && c.id === capabilityId)) {
      throw new NotFoundError(`Capability not in catalog: ${capabilityId}`);
    }
    const install = { id: uuid(), tenantId, customerId, projectId, capabilityId, createdAt: now() };
    await this.store.update((s) => {
      const set = s.moduleSets.find((m) => m.tenantId === tenantId && m.customerId === customerId && m.projectId === projectId);
      if (!set) throw new NotFoundError('moduleSet not found; provision white label first');
      if (!set.modules.includes(capabilityId)) set.modules.push(capabilityId);
      s.marketplaceInstalls.push(install);
      return s;
    });
    await this.bus.emit('marketplace.installed', { tenantId, customerId, projectId, capabilityId });
    return install;
  }

  // ---- Billing: assinatura + medição de uso + fatura ----
  async subscribe(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'whitelabel:manage');
    const { customerId, planId } = input;
    const state = await this.store.read();
    const plan = state.plans.find((p) => p.tenantId === tenantId && p.id === planId);
    if (!plan) throw new NotFoundError(`Plan not found: ${planId}`);
    const sub = { id: uuid(), tenantId, customerId, planId, priceUsd: plan.priceUsd, status: 'active', usage: 0, createdAt: now() };
    await this.store.update((s) => { s.subscriptions.push(sub); return s; });
    await this.bus.emit('billing.subscribed', { tenantId, customerId, planId });
    return sub;
  }

  async recordUsage(tenantId, subscriptionId, units) {
    await this.store.update((s) => {
      const sub = s.subscriptions.find((x) => x.tenantId === tenantId && x.id === subscriptionId);
      if (!sub) throw new NotFoundError(`Subscription not found: ${subscriptionId}`);
      sub.usage += Number(units);
      return s;
    });
    return this.store.read().then((s) => s.subscriptions.find((x) => x.id === subscriptionId));
  }

  async invoice(tenantId, actorId, subscriptionId) {
    await this.cp.authorize(tenantId, actorId, 'billing:read');
    const state = await this.store.read();
    const sub = state.subscriptions.find((x) => x.tenantId === tenantId && x.id === subscriptionId);
    if (!sub) throw new NotFoundError(`Subscription not found: ${subscriptionId}`);
    const amount = Number((sub.priceUsd + sub.usage * 0.01).toFixed(2));
    const inv = { id: uuid(), tenantId, subscriptionId, amountUsd: amount, status: 'issued', createdAt: now() };
    await this.store.update((s) => { s.invoices.push(inv); return s; });
    return inv;
  }
}

function normalizeTokens(tokens = {}) {
  return {
    primary: tokens.primary || '#2563eb',
    background: tokens.background || '#ffffff',
    foreground: tokens.foreground || '#0f172a',
    radius: tokens.radius || '8px',
    font: tokens.font || 'Inter, system-ui, sans-serif',
    ...tokens,
  };
}
function now() { return new Date().toISOString(); }

module.exports = { ProductSuite, normalizeTokens };
