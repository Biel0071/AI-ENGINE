'use strict';

/**
 * FÊNIX OS — Universal Company Registry (Single Source of Truth)
 * =============================================================
 * Responsável exclusivo pela gestão de empresas no Fênix OS.
 * Zero-Mock: Nenhuma empresa existe implicitamente.
 * Empresas somente entram no Registry através de:
 * 1. CREATE COMPANY
 * 2. IMPORT / CONNECT COMPANY
 * 3. Persistência real existente
 */

class CompanyRegistry {
  constructor(options = {}) {
    this.store = options.store || null;
    this.companies = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    if (this.store && typeof this.store.read === 'function') {
      try {
        const state = await this.store.read();
        const stored = state.companies || [];
        for (const comp of stored) {
          if (comp && comp.companyId) {
            this.companies.set(comp.companyId, { ...comp });
          }
        }
      } catch (_) {}
    }
    this.isInitialized = true;
  }

  async register(companyData) {
    if (!companyData || !companyData.name) {
      throw new Error('CompanyRegistry: Nome da empresa é obrigatório.');
    }
    const id = companyData.companyId || companyData.id || `comp_${Date.now().toString(36)}`;
    const record = {
      id,
      companyId: id,
      name: String(companyData.name).trim(),
      slug: companyData.slug || id.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      segment: companyData.segment || 'Geral',
      description: companyData.description || '',
      projectId: companyData.projectId || null,
      worldEntityId: companyData.worldEntityId || null,
      status: companyData.status || 'ACTIVE',
      color: companyData.color || '#00D9FF',
      icon: companyData.icon || 'ph-buildings',
      departments: Array.isArray(companyData.departments) ? companyData.departments : ['TECHNOLOGY', 'OPERATIONS'],
      agents: Array.isArray(companyData.agents) ? companyData.agents : [],
      createdAt: companyData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.companies.set(id, record);

    if (this.store && typeof this.store.update === 'function') {
      await this.store.update((state) => {
        state.companies = state.companies || [];
        const idx = state.companies.findIndex((c) => c.companyId === id || c.id === id);
        if (idx >= 0) {
          state.companies[idx] = record;
        } else {
          state.companies.push(record);
        }
        return state;
      });
    }

    return record;
  }

  get(companyId) {
    if (!companyId) return null;
    return this.companies.get(companyId) || null;
  }

  list() {
    return Array.from(this.companies.values());
  }

  count() {
    return this.companies.size;
  }

  findByProjectId(projectId) {
    if (!projectId) return null;
    for (const comp of this.companies.values()) {
      if (comp.projectId === projectId) return comp;
    }
    return null;
  }

  async clear() {
    this.companies.clear();
    if (this.store && typeof this.store.update === 'function') {
      await this.store.update((state) => {
        state.companies = [];
        return state;
      });
    }
  }
}

let _instance = null;
function getCompanyRegistry(options) {
  if (!_instance) {
    _instance = new CompanyRegistry(options);
  }
  return _instance;
}

module.exports = {
  CompanyRegistry,
  getCompanyRegistry
};
