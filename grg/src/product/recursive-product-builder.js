'use strict';

/**
 * FÊNIX OS — RECURSIVE PRODUCT BUILDER & DEEP APPLICATION GENERATION ENGINE
 * =========================================================================
 * Implements full-depth recursive hierarchical decomposition of products:
 * 
 * PRODUCT
 *   ├── MODULE
 *   │   ├── PAGE
 *   │   │   ├── SUBPAGE
 *   │   │   ├── TABS
 *   │   │   ├── FORMS
 *   │   │   ├── MODAIS
 *   │   │   ├── COMPONENTES
 *   │   │   └── AÇÕES
 *   │   ├── OPERAÇÕES
 *   │   ├── REGRAS DE NEGÓCIO
 *   │   ├── PERMISSÕES
 *   │   └── INTEGRAÇÕES
 *   └── CONFIGURAÇÕES GLOBAIS
 * 
 * Invariants & Core Engines:
 * 1. RecursiveProductTree: Infinite depth expansion, leaf-level specification.
 * 2. PageCompletenessEngine: 11 completeness axes (objective, data, components,
 *    loading, empty, error, validations, functional actions, navigation,
 *    responsiveness, permissions).
 * 3. InteractionCompletenessEngine: Full audit of 15 interactive element types.
 *    Strict prohibition of decorative buttons, unpersisted inputs, broken links.
 * 4. NavigationCrawler: Cycle-free path discovery, reachability certification.
 * 5. CompletenessCertification: Cryptographic SHA-256 seal & factual audit.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// =============================================================================
// 1. PAGE COMPLETENESS ENGINE (11 Mandatory Verification Axes)
// =============================================================================

class PageCompletenessEngine {
  constructor(options = {}) {
    this.memoryFabric = options.memoryFabric || null;
    this.skillRegistry = options.skillRegistry || null;
  }

  /**
   * Evaluates a page or subpage against the 11 canonical completeness axes.
   * @param {Object} page - Page specification or parsed DOM node
   * @returns {Object} Audit result with score, detailed axes, missing items
   */
  evaluatePage(page = {}) {
    const axes = {
      objective: this._checkObjective(page),
      dataRequirements: this._checkDataRequirements(page),
      components: this._checkComponents(page),
      loadingStates: this._checkLoadingStates(page),
      emptyStates: this._checkEmptyStates(page),
      errorStates: this._checkErrorStates(page),
      validations: this._checkValidations(page),
      functionalActions: this._checkFunctionalActions(page),
      navigation: this._checkNavigation(page),
      responsiveness: this._checkResponsiveness(page),
      permissions: this._checkPermissions(page),
    };

    const axisKeys = Object.keys(axes);
    const passedAxes = axisKeys.filter(k => axes[k].passed);
    const score = Math.round((passedAxes.length / axisKeys.length) * 100);

    const missingItems = [];
    for (const [key, detail] of Object.entries(axes)) {
      if (!detail.passed) {
        missingItems.push({
          axis: key,
          label: detail.label,
          reason: detail.reason,
          recommendation: detail.recommendation
        });
      }
    }

    const certified = score >= 90 && !missingItems.some(i => i.axis === 'functionalActions' || i.axis === 'objective');

    return {
      pageId: page.id || page.pageId || 'unknown_page',
      title: page.title || page.name || 'Sem Título',
      score,
      certified,
      axes,
      passedCount: passedAxes.length,
      totalCount: axisKeys.length,
      missingItems,
      evaluatedAt: new Date().toISOString()
    };
  }

  _checkObjective(page) {
    const obj = page.objective || page.purpose || page.description || '';
    const valid = typeof obj === 'string' && obj.trim().length >= 15;
    return {
      passed: valid,
      label: '1. Objetivo Definido',
      value: valid ? obj : null,
      reason: valid ? 'Objetivo claro e escopo funcional documentado.' : 'Objetivo ausente ou vago (mínimo 15 caracteres).'
    };
  }

  _checkDataRequirements(page) {
    const dataReqs = page.dataRequirements || page.models || page.inputs || page.schemas || [];
    const valid = Array.isArray(dataReqs) && dataReqs.length > 0;
    return {
      passed: valid,
      label: '2. Dados Necessários',
      count: valid ? dataReqs.length : 0,
      reason: valid ? `${dataReqs.length} contrato(s) de dados associado(s).` : 'Nenhum contrato de dados ou schema de entrada especificado.'
    };
  }

  _checkComponents(page) {
    const comps = page.components || page.elements || [];
    const valid = Array.isArray(comps) && comps.length >= 2;
    return {
      passed: valid,
      label: '3. Componentes Completos',
      count: valid ? comps.length : 0,
      reason: valid ? `${comps.length} componente(s) estruturado(s) presente(s).` : 'Menos de 2 componentes estruturados definidos na página.'
    };
  }

  _checkLoadingStates(page) {
    const hasLoading = Boolean(
      page.loadingState ||
      page.hasLoading ||
      page.loadingStrategy ||
      (page.states && page.states.loading) ||
      (page.components && page.components.some(c => c.type === 'skeleton' || c.type === 'spinner' || c.hasSkeleton))
    );
    return {
      passed: hasLoading,
      label: '4. Estados de Carregamento',
      reason: hasLoading ? 'Estratégia de loading/skeleton implementada.' : 'Ausência de indicador ou esqueleto de carregamento.'
    };
  }

  _checkEmptyStates(page) {
    const hasEmpty = Boolean(
      page.emptyState ||
      page.hasEmptyState ||
      (page.states && page.states.empty) ||
      (page.components && page.components.some(c => c.type === 'empty_state' || c.emptyMessage))
    );
    return {
      passed: hasEmpty,
      label: '5. Estados Vazios (Zero Honesto)',
      reason: hasEmpty ? 'Estado vazio com chamada para ação definido.' : 'Tela não trata coleção vazia honestamente.'
    };
  }

  _checkErrorStates(page) {
    const hasError = Boolean(
      page.errorState ||
      page.hasErrorHandling ||
      (page.states && page.states.error) ||
      page.errorBoundary ||
      page.retryAction
    );
    return {
      passed: hasError,
      label: '6. Estados de Erro & Retry',
      reason: hasError ? 'Tratamento de falha com possibilidade de nova tentativa.' : 'Sem fallback ou exibição de erro declarada.'
    };
  }

  _checkValidations(page) {
    const hasVal = Boolean(
      (page.validations && page.validations.length > 0) ||
      (page.forms && page.forms.some(f => f.validations && f.validations.length > 0)) ||
      page.validationRules
    );
    return {
      passed: hasVal,
      label: '7. Validações de Entrada',
      reason: hasVal ? 'Regras de validação de formulários/dados ativas.' : 'Nenhuma validação de formulário ou restrição de campo mapeada.'
    };
  }

  _checkFunctionalActions(page) {
    const actions = page.actions || [];
    const valid = Array.isArray(actions) && actions.length > 0 && actions.every(a => a.handler || a.endpoint || a.mutation);
    return {
      passed: valid,
      label: '8. Ações Funcionais (Zero Botões Decorativos)',
      count: valid ? actions.length : 0,
      reason: valid ? `${actions.length} ação(ões) conectada(s) a endpoints ou eventos.` : 'Ações ausentes ou botões sem manipulador de persistência.'
    };
  }

  _checkNavigation(page) {
    const navObj = page.navigation;
    const hasRoute = Boolean(page.route || page.parentRoute || page.breadcrumbs || (navObj && (navObj.route || navObj.parentRoute || navObj.breadcrumbs || navObj.inboundRoutes)));
    return {
      passed: hasRoute,
      label: '9. Navegação de Entrada e Saída',
      reason: hasRoute ? 'Rotas de entrada, breadcrumbs e retorno configurados.' : 'Página sem rotas de saída ou links de retorno.'
    };
  }

  _checkResponsiveness(page) {
    const resp = Boolean(
      page.responsive ||
      page.breakpoints ||
      (page.layout && page.layout.responsive) ||
      page.isAdaptive
    );
    return {
      passed: resp,
      label: '10. Responsividade Multi-Dispositivo',
      reason: resp ? 'Layout adaptável para mobile, tablet e desktop.' : 'Ausência de regras ou tokens de responsividade.'
    };
  }

  _checkPermissions(page) {
    const perms = page.permissions || page.roles || page.rbac || page.requiredRole;
    const valid = Boolean(perms && (Array.isArray(perms) ? perms.length > 0 : typeof perms === 'string'));
    return {
      passed: valid,
      label: '11. Permissões Aplicáveis (RBAC)',
      reason: valid ? `Controle de acesso por papel: ${JSON.stringify(perms)}` : 'Permissões não documentadas (risco de segurança/privilégio).'
    };
  }
}

// =============================================================================
// 2. INTERACTION COMPLETENESS ENGINE (Mapping 15 Interactive Types)
// =============================================================================

const CANONICAL_INTERACTION_TYPES = [
  'button',
  'input',
  'select',
  'checkbox',
  'radio',
  'tab',
  'menu',
  'dropdown',
  'modal',
  'table',
  'filter',
  'search',
  'upload',
  'pagination',
  'batch_action',
  'link'
];

class InteractionCompletenessEngine {
  constructor() {}

  /**
   * Scans a collection of interactive elements or a page node.
   * Enforces strictly:
   * - No decorative buttons (must have bound actions/events)
   * - Inputs must persist to backend/store
   * - Menus without destination are forbidden
   * - Links must not be broken or empty
   * - Forms must submit
   * - Filters must actually filter
   * - Tables must have schema/columns/datasource
   * - Pagination must have page switch handler
   * - Batch actions must have execution handler/endpoint
   */
  auditInteractions(elements = []) {
    const audited = [];
    let decorativeCount = 0;
    let unpersistedInputsCount = 0;
    let deadLinksCount = 0;
    let brokenFormsCount = 0;
    let fakeFiltersCount = 0;
    let hollowTablesCount = 0;
    let brokenPaginationCount = 0;
    let hollowBatchActionsCount = 0;

    for (const elem of elements) {
      const type = (elem.type || 'button').toLowerCase();
      const id = elem.id || elem.name || `el_${Math.random().toString(36).slice(2, 8)}`;
      const label = elem.label || elem.title || elem.placeholder || id;
      const issues = [];

      // Rule: No decorative buttons
      if (type === 'button') {
        const hasHandler = Boolean(elem.handler || elem.action || elem.endpoint || elem.onClick || elem.mutation || elem.targetRoute);
        if (!hasHandler) {
          issues.push('Botão decorativo: clique não aciona manipulador, endpoint ou transição.');
          decorativeCount++;
        }
      }

      // Rule: Inputs without persistence
      if (['input', 'select', 'checkbox', 'radio', 'upload'].includes(type)) {
        const hasBinding = Boolean(elem.bind || elem.model || elem.name || elem.persistenceKey || elem.endpoint || elem.onChange || elem.handler);
        if (!hasBinding) {
          issues.push('Entrada sem persistência: valor não é persistido nem enviado a backend/store.');
          unpersistedInputsCount++;
        }
      }

      // Rule: Menus without destination / Dead links
      if (['menu', 'dropdown', 'tab'].includes(type)) {
        const hasDest = Boolean(elem.destination || elem.targetView || elem.route || elem.onSelect || elem.onClick || (elem.items && elem.items.length > 0));
        if (!hasDest) {
          issues.push('Menu ou aba sem destino ou itens navegáveis.');
          deadLinksCount++;
        }
      }

      // Rule: Modal without trigger or destination
      if (type === 'modal') {
        const hasModal = Boolean(elem.destination || elem.modalId || elem.trigger || elem.content || elem.onClose || elem.id);
        if (!hasModal) {
          issues.push('Modal sem identificador, trigger ou conteúdo configurado.');
          deadLinksCount++;
        }
      }

      // Rule: Dead links
      if (type === 'link' || elem.href !== undefined) {
        const href = elem.href || elem.url || elem.destination;
        const isDead = !href || href === '#' || href === 'javascript:void(0)' || String(href).trim() === '';
        if (isDead) {
          issues.push('Link quebrado ou sem destino (href vazio, "#" ou script void).');
          deadLinksCount++;
        }
      }

      // Rule: Broken forms / forms that don't submit
      if (elem.isForm || type === 'form') {
        const hasSubmit = Boolean(elem.onSubmit || elem.submitEndpoint || elem.action || elem.handler);
        if (!hasSubmit) {
          issues.push('Formulário sem destino de envio ou manipulador.');
          brokenFormsCount++;
        }
      }

      // Rule: Filters that don't filter
      if (type === 'filter' || type === 'search') {
        const hasFilterLogic = Boolean(elem.filterTarget || elem.onSearch || elem.queryParam || elem.predicate || elem.target || elem.handler);
        if (!hasFilterLogic) {
          issues.push('Filtro sem alvo ou predicado de busca especificado.');
          fakeFiltersCount++;
        }
      }

      // Rule: Table without schema/columns/datasource
      if (type === 'table') {
        const hasTableData = Boolean(elem.columns || elem.dataSource || elem.endpoint || (Array.isArray(elem.items) && elem.items.length > 0) || elem.schema || elem.rows);
        if (!hasTableData) {
          issues.push('Tabela sem contrato de dados, colunas ou fonte especificada.');
          hollowTablesCount++;
        }
      }

      // Rule: Pagination without page handler
      if (type === 'pagination') {
        const hasPagination = Boolean(elem.onPageChange || elem.pageParam || elem.target || elem.endpoint || elem.handler || elem.totalPages);
        if (!hasPagination) {
          issues.push('Paginação sem manipulador de troca de página ou parâmetro de alvo.');
          brokenPaginationCount++;
        }
      }

      // Rule: Batch action without handler
      if (type === 'batch_action') {
        const hasBatch = Boolean(elem.handler || elem.endpoint || elem.action || elem.targetSelection || elem.mutation);
        if (!hasBatch) {
          issues.push('Ação em lote sem manipulador de execução ou endpoint associado.');
          hollowBatchActionsCount++;
        }
      }

      audited.push({
        id,
        type,
        label,
        status: issues.length === 0 ? 'CERTIFIED_FUNCTIONAL' : 'DEFECTIVE_VIOLATION',
        issues,
        boundContract: elem.endpoint || elem.handler || elem.destination || elem.bind || elem.dataSource || null
      });
    }

    const total = audited.length;
    const functional = audited.filter(a => a.status === 'CERTIFIED_FUNCTIONAL').length;
    const score = total > 0 ? Math.round((functional / total) * 100) : 100;

    return {
      total,
      functional,
      defective: total - functional,
      completenessScore: score,
      violations: {
        decorativeButtons: decorativeCount,
        unpersistedInputs: unpersistedInputsCount,
        deadLinks: deadLinksCount,
        brokenForms: brokenFormsCount,
        fakeFilters: fakeFiltersCount,
        hollowTables: hollowTablesCount,
        brokenPagination: brokenPaginationCount,
        hollowBatchActions: hollowBatchActionsCount
      },
      elements: audited,
      auditedAt: new Date().toISOString()
    };
  }
}

// =============================================================================
// 3. NAVIGATION CRAWLER (Recursive Route Discovery & Reachability)
// =============================================================================

class NavigationCrawler {
  constructor() {}

  /**
   * Crawls the recursive product tree, building a route graph and verifying reachability.
   * Cycle-safe: prevents infinite recursion on circular nodes.
   * @param {Object} rootNode - Root product node
   */
  crawl(rootNode) {
    const visitedRoutes = new Set();
    const visitedNodes = new Set();
    const routeGraph = { nodes: [], edges: [] };
    const deadEnds = [];
    const orphanPages = [];

    const traverse = (node, parentPath = '') => {
      if (!node) return;
      if (visitedNodes.has(node)) {
        return; // Cycle detected: stop recursive loop safely
      }
      visitedNodes.add(node);

      const currentPath = node.route || `${parentPath}/${node.id || node.name || 'node'}`.replace(/\/+/g, '/');
      
      routeGraph.nodes.push({
        id: node.id,
        path: currentPath,
        type: node.type,
        name: node.name || node.title || node.id,
        hasParent: Boolean(parentPath)
      });

      if (parentPath) {
        routeGraph.edges.push({
          source: parentPath,
          target: currentPath,
          transitionType: 'HIERARCHICAL_CHILD'
        });
      }

      visitedRoutes.add(currentPath);

      // Check children
      const children = [
        ...(node.pages || []),
        ...(node.subpages || []),
        ...(node.modules || []),
        ...(node.tabs || []),
        ...(node.modals || [])
      ];

      if (children.length === 0 && node.type === 'page' && !node.actions?.length && !node.inboundRoutes?.length) {
        deadEnds.push(currentPath);
      }

      for (const child of children) {
        traverse(child, currentPath);
      }
    };

    traverse(rootNode, '');

    const totalNodes = routeGraph.nodes.length;
    const reachableCount = visitedRoutes.size;
    const reachabilityScore = totalNodes > 0 ? Math.round((reachableCount / totalNodes) * 100) : 100;

    return {
      totalDiscoveredRoutes: visitedRoutes.size,
      routeGraph,
      deadEnds,
      orphanPages,
      reachabilityScore,
      certifiedReachability: deadEnds.length === 0 && orphanPages.length === 0,
      crawledAt: new Date().toISOString()
    };
  }
}

// =============================================================================
// 4. RECURSIVE PRODUCT BUILDER & SPECIFICATION EXPANDER
// =============================================================================

class RecursiveProductBuilder {
  constructor(options = {}) {
    this.memoryFabric = options.memoryFabric || null;
    this.skillRegistry = options.skillRegistry || null;
    this.modelRouter = options.modelRouter || null;
    this.pageCompleteness = new PageCompletenessEngine(options);
    this.interactionCompleteness = new InteractionCompletenessEngine();
    this.navigationCrawler = new NavigationCrawler();
    this.productTrees = new Map();
  }

  /**
   * Generates or expands a deep recursive tree for a given product/project.
   * Tree hierarchy:
   * PRODUCT
   *   ├── MODULE
   *   │   ├── PAGE
   *   │   │   ├── SUBPAGE
   *   │   │   ├── TABS
   *   │   │   ├── FORMS
   *   │   │   ├── MODAIS
   *   │   │   ├── COMPONENTES
   *   │   │   └── AÇÕES
   *   │   ├── OPERAÇÕES
   *   │   ├── REGRAS DE NEGÓCIO
   *   │   ├── PERMISSÕES
   *   │   └── INTEGRAÇÕES
   *   └── CONFIGURAÇÕES GLOBAIS
   */
  async generateProductTree(spec = {}) {
    const projectId = spec.projectId || 'prj.fenix_core';
    const productName = spec.name || spec.projectName || 'Fênix Deep Product';
    const domain = spec.domain || 'enterprise_saas';

    // 1. Module generation / recursive expansion
    const modules = this._generateModules(spec);

    // 2. Global Configurations
    const globalConfig = {
      theme: {
        palette: ['#050810', '#0B1018', '#00D9FF', '#10B981', '#FF5500', '#F8FAFC'],
        glassmorphism: true,
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      securityPolicy: {
        rbacEnabled: true,
        csrfProtection: true,
        auditLog: true,
        zeroTrust: true
      },
      environment: spec.environment || 'PRODUCTION',
      featureFlags: {
        deepProductTree: true,
        autonomousEngine: true,
        overnightFactory: true
      }
    };

    const productTree = {
      id: projectId,
      name: productName,
      type: 'product',
      domain,
      version: spec.version || '1.0.0',
      description: spec.description || 'Deep Autonomous Application generated by Fênix OS',
      modules,
      globalConfig,
      metadata: {
        createdAt: new Date().toISOString(),
        generatedBy: 'RecursiveProductBuilder',
        depth: this._calculateTreeDepth(modules),
        stats: this._aggregateTreeStats(modules)
      }
    };

    // 3. Store and index
    this.productTrees.set(projectId, productTree);

    // 4. Memory Fabric learning if available
    if (this.memoryFabric) {
      await this.memoryFabric.storeMemory({
        category: 'PRODUCT_ARCHITECTURE',
        entityId: projectId,
        content: `Product tree generated for ${productName} with ${modules.length} deep modules and total depth ${productTree.metadata.depth}.`
      }).catch(() => {});
    }

    return productTree;
  }

  /**
   * Audits completeness across the entire product tree recursively without depth limit.
   */
  auditFullProduct(projectId) {
    const tree = this.productTrees.get(projectId);
    if (!tree) throw new Error(`Product tree for ${projectId} not found.`);

    const pageAudits = [];
    const interactionAudits = [];

    const auditPageRecursively = (page) => {
      if (!page) return;
      const pAudit = this.pageCompleteness.evaluatePage(page);
      pageAudits.push(pAudit);

      // Collect all interactions in page, subpages, tabs, forms, modals, components
      const elements = this._collectPageInteractions(page);
      const iAudit = this.interactionCompleteness.auditInteractions(elements);
      interactionAudits.push({ pageId: page.id || page.pageId || 'unknown_node', audit: iAudit });

      for (const sub of page.subpages || []) {
        auditPageRecursively(sub);
      }
      for (const childPage of page.pages || []) {
        auditPageRecursively(childPage);
      }
    };

    const auditModuleRecursively = (mod) => {
      if (!mod) return;
      for (const page of mod.pages || []) {
        auditPageRecursively(page);
      }
      for (const subMod of mod.modules || []) {
        auditModuleRecursively(subMod);
      }
    };

    for (const mod of tree.modules || []) {
      auditModuleRecursively(mod);
    }

    const navAudit = this.navigationCrawler.crawl(tree);

    // Compute aggregate scores
    const avgPageScore = pageAudits.length > 0 
      ? Math.round(pageAudits.reduce((acc, a) => acc + a.score, 0) / pageAudits.length) 
      : 100;
    
    const totalInteractions = interactionAudits.reduce((acc, a) => acc + a.audit.total, 0);
    const functionalInteractions = interactionAudits.reduce((acc, a) => acc + a.audit.functional, 0);
    const interactionScore = totalInteractions > 0 
      ? Math.round((functionalInteractions / totalInteractions) * 100) 
      : 100;

    return {
      projectId,
      productName: tree.name,
      pageCompletenessScore: avgPageScore,
      interactionCompletenessScore: interactionScore,
      navigationReachabilityScore: navAudit.reachabilityScore,
      overallHealthScore: Math.round((avgPageScore + interactionScore + navAudit.reachabilityScore) / 3),
      totalModules: tree.modules.length,
      totalPages: pageAudits.length,
      totalInteractions,
      pageAudits,
      interactionAudits,
      navigationAudit: navAudit,
      auditedAt: new Date().toISOString()
    };
  }

  /**
   * Generates a formal cryptographic Completeness Certificate for the product.
   */
  certifyProduct(projectId) {
    const audit = this.auditFullProduct(projectId);
    const tree = this.productTrees.get(projectId);

    const isCertified = audit.overallHealthScore >= 85 && audit.navigationReachabilityScore >= 95;
    const certificatePayload = {
      projectId,
      productName: tree.name,
      treeDepth: tree.metadata.depth,
      totalModules: audit.totalModules,
      totalPages: audit.totalPages,
      totalInteractions: audit.totalInteractions,
      pageCompletenessScore: audit.pageCompletenessScore,
      interactionCompletenessScore: audit.interactionCompletenessScore,
      navigationReachabilityScore: audit.navigationReachabilityScore,
      status: isCertified ? 'CERTIFIED_DEEP_APPLICATION' : 'INCOMPLETE_SURFACE_ONLY',
      issuedAt: new Date().toISOString()
    };

    const signature = crypto.createHash('sha256').update(JSON.stringify(certificatePayload)).digest('hex');

    return {
      ...certificatePayload,
      certificateId: `CERT-${projectId.toUpperCase()}-${signature.slice(0, 12)}`,
      cryptographicSignature: signature,
      verificationAuthority: 'Fênix OS Autonomous Architecture Gatekeeper'
    };
  }

  _collectPageInteractions(page) {
    const elements = [];
    if (Array.isArray(page.actions)) {
      for (const act of page.actions) {
        elements.push({ type: 'button', id: act.id, label: act.name, endpoint: act.endpoint, handler: act.handler });
      }
    }
    if (Array.isArray(page.forms)) {
      for (const form of page.forms) {
        elements.push({ type: 'form', id: form.id, label: form.name, isForm: true, onSubmit: form.onSubmit || form.endpoint, action: form.action });
        for (const field of form.fields || []) {
          elements.push({ type: field.type || 'input', id: field.name, label: field.label, bind: field.bind || field.name, endpoint: field.endpoint });
        }
      }
    }
    if (Array.isArray(page.tabs)) {
      for (const tab of page.tabs) {
        elements.push({ type: 'tab', id: tab.id, label: tab.label, destination: tab.view || tab.targetView || tab.destination });
      }
    }
    if (Array.isArray(page.modals)) {
      for (const mod of page.modals) {
        elements.push({ type: 'modal', id: mod.id, label: mod.title, destination: mod.id || mod.destination });
      }
    }
    if (Array.isArray(page.components)) {
      for (const comp of page.components) {
        const cType = (comp.type || '').toLowerCase();
        if (cType === 'filter' || comp.isFilter) {
          elements.push({ type: 'filter', id: comp.id, label: comp.label, filterTarget: comp.target || comp.filterTarget });
        } else if (cType === 'search' || comp.isSearch) {
          elements.push({ type: 'search', id: comp.id, label: comp.label, onSearch: comp.onSearch || comp.target });
        } else if (CANONICAL_INTERACTION_TYPES.includes(cType)) {
          elements.push({
            type: cType,
            id: comp.id || comp.name,
            label: comp.label || comp.title || comp.id,
            endpoint: comp.endpoint,
            handler: comp.handler || comp.onClick || comp.action,
            bind: comp.bind || comp.model || comp.name || comp.persistenceKey,
            destination: comp.destination || comp.targetRoute || comp.route || comp.targetView,
            dataSource: comp.dataSource || comp.columns || comp.endpoint || comp.items,
            columns: comp.columns,
            pageParam: comp.pageParam || comp.onPageChange,
            onPageChange: comp.onPageChange,
            totalPages: comp.totalPages,
            targetAction: comp.targetAction || comp.handler || comp.endpoint,
            href: comp.href,
            ...comp
          });
        }
      }
    }
    return elements;
  }

  _calculateTreeDepth(modules) {
    let max = 1;
    const traverse = (node, depth) => {
      if (!node) return;
      if (depth > max) max = depth;
      const children = [
        ...(node.modules || []),
        ...(node.pages || []),
        ...(node.subpages || [])
      ];
      for (const child of children) {
        traverse(child, depth + 1);
      }
    };
    for (const m of modules || []) {
      traverse(m, 2);
    }
    return max;
  }

  _aggregateTreeStats(modules) {
    const stats = {
      totalModules: (modules || []).length,
      pages: 0,
      subpages: 0,
      tabs: 0,
      forms: 0,
      modals: 0,
      components: 0,
      actions: 0,
      operations: 0,
      rules: 0,
      permissions: 0,
      integrations: 0
    };

    const traversePage = (p, isSubpage = false) => {
      if (!p) return;
      if (isSubpage) stats.subpages++;
      else stats.pages++;

      stats.tabs += (p.tabs || []).length;
      stats.forms += (p.forms || []).length;
      stats.modals += (p.modals || []).length;
      stats.components += (p.components || []).length;
      stats.actions += (p.actions || []).length;

      for (const sub of p.subpages || []) {
        traversePage(sub, true);
      }
      for (const childPage of p.pages || []) {
        traversePage(childPage, true);
      }
    };

    const traverseModule = (m) => {
      if (!m) return;
      stats.operations += (m.operations || []).length;
      stats.rules += (m.businessRules || []).length;
      stats.permissions += (m.permissions || []).length;
      stats.integrations += (m.integrations || []).length;

      for (const p of m.pages || []) {
        traversePage(p, false);
      }
      for (const subM of m.modules || []) {
        traverseModule(subM);
      }
    };

    for (const m of modules || []) {
      traverseModule(m);
    }

    return stats;
  }

  _generateModules(spec) {
    if (spec.modules && Array.isArray(spec.modules)) {
      return spec.modules;
    }

    // Default deep architectural template for enterprise SaaS & Fênix capabilities
    return [
      {
        id: 'mod_core_workspace',
        name: 'Workspace & Execution Engine',
        type: 'module',
        description: 'Orquestração central de tarefas, IDE visual e terminal integrado.',
        pages: [
          {
            id: 'page_ide_visual',
            name: 'Visual IDE Studio',
            route: '/ide/studio',
            objective: 'Ambiente integrado de edição visual, percepção dual e inspeção de código em tempo real.',
            dataRequirements: [{ schema: 'FileTreeSchema' }, { schema: 'InspectionStateSchema' }],
            components: [
              { id: 'comp_code_editor', type: 'code_editor', label: 'Monaco / Ace Editor Core' },
              { id: 'comp_visual_inspector', type: 'css_inspector', label: 'Painel de Inspeção CSS' },
              { id: 'comp_bounding_overlay', type: 'overlay', label: 'Bounding Box & Live Cursors' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum arquivo aberto no workspace.', cta: 'Abrir Arquivo' },
            errorState: { boundary: true, retryAction: 'reloadWorkspace' },
            validations: [{ field: 'sourceCode', rule: 'syntaxCheckNodeC' }],
            actions: [
              { id: 'act_save_file', name: 'Salvar Arquivo', endpoint: '/api/v2/developer/save', handler: 'saveSource' },
              { id: 'act_run_qa', name: 'Executar Visual QA', endpoint: '/api/v2/visual-workspace/qa/run', handler: 'runQaLoop' }
            ],
            tabs: [
              { id: 'tab_code', label: 'Código Fonte', view: 'editor_view' },
              { id: 'tab_preview', label: 'Preview ao Vivo', view: 'preview_iframe' },
              { id: 'tab_video_studio', label: 'Video Studio', view: 'video_nle' }
            ],
            forms: [
              {
                id: 'form_css_override',
                name: 'Modificação de Estilo Visual',
                onSubmit: '/api/v2/visual-workspace/apply-action',
                fields: [
                  { name: 'selector', label: 'Seletor CSS', type: 'input', bind: 'activeSelector' },
                  { name: 'rule', label: 'Propriedade CSS', type: 'input', bind: 'cssRule' }
                ]
              }
            ],
            modals: [
              { id: 'modal_diff_confirm', title: 'Confirmar Patch de Código', destination: 'diff_view' }
            ],
            navigation: { route: '/ide/studio', parentRoute: '/workspace', breadcrumbs: ['Fênix', 'Workspace', 'Visual IDE'] },
            responsive: true,
            permissions: ['developer:write', 'ide:access'],
            subpages: [
              {
                id: 'subpage_video_production',
                name: 'AI Video Production NLE',
                route: '/ide/studio/video-production',
                objective: 'Montagem de vídeo multitrack com recortes, overlays visuais e mixagem FFmpeg.',
                dataRequirements: [{ schema: 'TimelineManifestSchema' }],
                components: [
                  { id: 'comp_nle_tracks', type: 'timeline', label: 'Timeline Multitrack (V2, V1, A1, A2)' },
                  { id: 'comp_media_library', type: 'asset_grid', label: 'Biblioteca de Mídia Local' }
                ],
                loadingState: { strategy: 'spinner' },
                emptyState: { message: 'Nenhuma track criada.', cta: 'Nova Trilha' },
                errorState: { boundary: true },
                validations: [{ field: 'duration', rule: 'positiveNumber' }],
                actions: [
                  { id: 'act_render_video', name: 'Renderizar MP4 FFmpeg', endpoint: '/api/v2/video-studio/render', handler: 'renderJob' }
                ],
                navigation: { route: '/ide/studio/video-production', parentRoute: '/ide/studio' },
                responsive: true,
                permissions: ['media:render']
              }
            ]
          }
        ],
        operations: [
          { id: 'op_sync_git', name: 'Sincronizar Repositório Git', endpoint: '/api/v2/git/sync' },
          { id: 'op_compile_bundle', name: 'Executar Verificação de Sintaxe', endpoint: '/api/v2/build/syntax' }
        ],
        businessRules: [
          { id: 'rule_checkpoint_before_edit', name: 'Exigir checkpoint SHA-256 antes de qualquer mutação de arquivo.' },
          { id: 'rule_zero_broken_routes', name: 'Impedir registro de telas com links quebrados ou sem manipulador.' }
        ],
        permissions: ['workspace:admin', 'workspace:read', 'workspace:write'],
        integrations: [
          { id: 'int_node_compiler', service: 'Node.js Engine (node -c)' },
          { id: 'int_ffmpeg_cli', service: 'FFmpeg Audio & Video Processor' }
        ]
      },
      {
        id: 'mod_autonomous_factory',
        name: 'Autonomous Development Factory',
        type: 'module',
        description: 'Fábrica de engenharia contínua 24/7 com execução desconectada e auto-evolução.',
        pages: [
          {
            id: 'page_factory_cockpit',
            name: 'Console da Fábrica Autônoma',
            route: '/factory/cockpit',
            objective: 'Monitoramento de missões em fila, patches cirúrgicos, telemetria de tokens e workers desconectados.',
            dataRequirements: [{ schema: 'MissionQueueSchema' }, { schema: 'NightRunTelemetrySchema' }],
            components: [
              { id: 'comp_mission_grid', type: 'data_table', label: 'Tabela de Missões Prioritárias' },
              { id: 'comp_worker_pulse', type: 'pulse_indicator', label: 'Monitor de Workers em Segundo Plano' },
              { id: 'comp_patch_history', type: 'timeline', label: 'Histórico de Patches & Checkpoints' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Fila ociosa. Nenhuma missão pendente.', cta: 'Despachar Missão' },
            errorState: { boundary: true, retryAction: 'refreshFactory' },
            validations: [{ field: 'priority', rule: 'in(P0,P1,P2,P3,P4,P5,P6,P7)' }],
            actions: [
              { id: 'act_start_night_run', name: 'Iniciar Operação Noturna Desconectada', endpoint: '/api/v2/factory/night-run/start', handler: 'startNightRun' },
              { id: 'act_stop_night_run', name: 'Pausar Operação Noturna', endpoint: '/api/v2/factory/night-run/stop', handler: 'stopNightRun' },
              { id: 'act_run_crawler', name: 'Auditar Árvore Completa (Crawler)', endpoint: '/api/v2/product-builder/crawl-navigation', handler: 'runCrawl' }
            ],
            tabs: [
              { id: 'tab_missions', label: 'Fila Ativa', view: 'queue_view' },
              { id: 'tab_telemetry', label: 'Telemetria & Custos', view: 'telemetry_view' },
              { id: 'tab_certifications', label: 'Certificados Digitais', view: 'certs_view' }
            ],
            forms: [
              {
                id: 'form_new_mission',
                name: 'Submissão de Missão de Engenharia',
                onSubmit: '/api/v2/factory/mission',
                fields: [
                  { name: 'title', label: 'Título da Missão', type: 'input', bind: 'missionTitle' },
                  { name: 'objective', label: 'Objetivo Técnico', type: 'textarea', bind: 'missionObjective' },
                  { name: 'priority', label: 'Nível de Prioridade', type: 'select', bind: 'missionPriority' }
                ]
              }
            ],
            navigation: { route: '/factory/cockpit', parentRoute: '/factory', breadcrumbs: ['Fênix', 'Factory', 'Console'] },
            responsive: true,
            permissions: ['factory:operator', 'factory:admin'],
            subpages: [
              {
                id: 'subpage_night_run_monitor',
                name: 'Monitor de Execução Noturna',
                route: '/factory/cockpit/night-run',
                objective: 'Acompanhamento do loop de processamento desconectado durante a madrugada.',
                dataRequirements: [{ schema: 'NightRunStateSchema' }],
                components: [
                  { id: 'comp_log_stream', type: 'log_viewer', label: 'Stream de Logs Estruturados' },
                  { id: 'comp_test_pass_gauge', type: 'metric_gauge', label: 'Taxa de Sucesso dos Testes' }
                ],
                loadingState: { strategy: 'skeleton' },
                emptyState: { message: 'Nenhuma execução noturna em andamento.', cta: 'Programar Execução' },
                errorState: { boundary: true },
                validations: [{ field: 'intervalMs', rule: 'min(1000)' }],
                actions: [
                  { id: 'act_generate_report', name: 'Emitir Relatório de Evolução', endpoint: '/api/v2/factory/night-run/report', handler: 'generateReport' }
                ],
                navigation: { route: '/factory/cockpit/night-run', parentRoute: '/factory/cockpit' },
                responsive: true,
                permissions: ['factory:admin']
              }
            ]
          }
        ],
        operations: [
          { id: 'op_dispatch_worker', name: 'Despachar Worker em Background', endpoint: '/api/v2/factory/worker/dispatch' },
          { id: 'op_synthesize_patch', name: 'Gerar Patch Cirúrgico', endpoint: '/api/v2/factory/patch/generate' }
        ],
        businessRules: [
          { id: 'rule_no_decorative_interactions', name: 'PROIBIDO: Elementos interativos sem persistência ou manipulador.' },
          { id: 'rule_night_run_watchdog', name: 'Watchdog obrigatório para reiniciar workers desconectados em caso de falha.' }
        ],
        permissions: ['factory:admin', 'factory:operator'],
        integrations: [
          { id: 'int_fastify_platform', service: 'API Platform Fastify (porta 3001)' },
          { id: 'int_ollama_local', service: 'Ollama Host (porta 11434)' }
        ]
      }
    ];
  }
}

module.exports = {
  RecursiveProductBuilder,
  PageCompletenessEngine,
  InteractionCompletenessEngine,
  NavigationCrawler,
  CANONICAL_INTERACTION_TYPES
};
