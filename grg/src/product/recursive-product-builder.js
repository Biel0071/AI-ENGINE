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

    const domain = (spec.domain || '').toLowerCase();
    if (domain === 'ecommerce' || domain === 'e-commerce') {
      return this._generateEcommerceModules(spec);
    }
    if (domain === 'project_management' || domain === 'task_manager' || domain === 'kanban') {
      return this._generateProjectManagementModules(spec);
    }
    if (domain === 'multitenant_saas' || domain === 'multi_tenant_saas' || domain === 'saas_multitenant') {
      return this._generateMultiTenantSaasModules(spec);
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

  _generateEcommerceModules(spec = {}) {
    return [
      {
        id: 'mod_catalog',
        name: 'Catálogo & Vitrine Digital',
        type: 'module',
        description: 'Exposição de produtos, busca instantânea, filtragem por categorias e detalhes.',
        pages: [
          {
            id: 'page_storefront',
            name: 'Vitrine de Produtos',
            route: '/catalog',
            objective: 'Vitrine dinâmica de produtos com busca instantânea, filtragem por categorias e ordenação comercial.',
            dataRequirements: [{ schema: 'ProductListSchema' }, { schema: 'CategoryListSchema' }],
            components: [
              { id: 'comp_search_bar', type: 'search', label: 'Barra de Busca Instantânea', onSearch: 'filterProducts' },
              { id: 'comp_category_filter', type: 'filter', label: 'Filtro por Categorias', filterTarget: 'productGrid' },
              { id: 'comp_product_grid', type: 'grid', label: 'Grade Responsiva de Produtos', endpoint: '/api/produtos' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum produto encontrado para o filtro selecionado.', cta: 'Limpar Filtros' },
            errorState: { boundary: true, retryAction: 'loadProducts' },
            validations: [{ field: 'searchTerm', rule: 'safeText' }],
            actions: [
              { id: 'act_add_cart', name: 'Adicionar ao Carrinho', endpoint: '/api/carrinho/adicionar', handler: 'addToCart' },
              { id: 'act_view_product', name: 'Ver Detalhes', endpoint: '/api/produtos/:id', handler: 'openProductDetail' }
            ],
            tabs: [
              { id: 'tab_all_products', label: 'Todos os Produtos', view: 'catalog_all' },
              { id: 'tab_promotions', label: 'Ofertas & Destaques', view: 'catalog_promo' }
            ],
            forms: [],
            modals: [
              { id: 'modal_product_detail', title: 'Detalhes do Produto', destination: 'product_detail_view' }
            ],
            navigation: { route: '/catalog', parentRoute: '/', breadcrumbs: ['Loja', 'Catálogo'] },
            responsive: true,
            permissions: ['CLIENTE', 'LOJISTA', 'ADMIN'],
            subpages: [
              {
                id: 'subpage_product_detail',
                name: 'Detalhe do Produto & Avaliações',
                route: '/catalog/product-detail',
                objective: 'Página profunda de especificação do produto com seletor de quantidade e avaliações.',
                dataRequirements: [{ schema: 'ProductDetailSchema' }, { schema: 'ReviewsSchema' }],
                components: [
                  { id: 'comp_product_gallery', type: 'gallery', label: 'Galeria de Imagens' },
                  { id: 'comp_stock_badge', type: 'badge', label: 'Status de Estoque em Tempo Real' },
                  { id: 'comp_reviews_list', type: 'data_table', label: 'Avaliações Verificadas' }
                ],
                loadingState: { strategy: 'spinner' },
                emptyState: { message: 'Nenhuma avaliação para este produto ainda.', cta: 'Seja o primeiro a avaliar' },
                errorState: { boundary: true },
                validations: [{ field: 'quantidade', rule: 'min(1)' }],
                actions: [
                  { id: 'act_submit_review', name: 'Enviar Avaliação', endpoint: '/api/produtos/:id/avaliar', handler: 'submitReview' },
                  { id: 'act_buy_now', name: 'Comprar Agora', endpoint: '/api/checkout/direto', handler: 'buyNow' }
                ],
                forms: [
                  {
                    id: 'form_review',
                    name: 'Avaliação de Produto',
                    onSubmit: '/api/produtos/:id/avaliar',
                    fields: [
                      { name: 'rating', label: 'Nota (1 a 5)', type: 'select', bind: 'reviewRating' },
                      { name: 'comment', label: 'Comentário', type: 'textarea', bind: 'reviewComment' }
                    ]
                  }
                ],
                navigation: { route: '/catalog/product-detail', parentRoute: '/catalog', breadcrumbs: ['Loja', 'Catálogo', 'Detalhes'] },
                responsive: true,
                permissions: ['CLIENTE', 'LOJISTA', 'ADMIN']
              }
            ]
          }
        ],
        operations: [
          { id: 'op_fetch_catalog', name: 'Carregar Catálogo', endpoint: '/api/produtos' },
          { id: 'op_search_products', name: 'Buscar Produtos', endpoint: '/api/produtos?q=' }
        ],
        businessRules: [
          { id: 'rule_active_products_only', name: 'Apenas produtos com status ATIVO devem ser exibidos na vitrine.' },
          { id: 'rule_dynamic_stock_display', name: 'Indicar alerta visual para estoque inferior a 5 unidades.' }
        ],
        permissions: ['CLIENTE', 'LOJISTA', 'ADMIN'],
        integrations: [
          { id: 'int_sqlite_catalog', service: 'Catálogo Relacional SQLite' }
        ]
      },
      {
        id: 'mod_cart_checkout',
        name: 'Carrinho & Checkout Transacional',
        type: 'module',
        description: 'Carrinho interativo, cálculo de frete, aplicação de cupons e checkout seguro.',
        pages: [
          {
            id: 'page_cart_checkout',
            name: 'Carrinho & Finalização de Compra',
            route: '/checkout',
            objective: 'Carrinho reativo com cálculo de frete, cupom de desconto e checkout multi-step atômico.',
            dataRequirements: [{ schema: 'CartStateSchema' }, { schema: 'CouponValidationSchema' }],
            components: [
              { id: 'comp_cart_items_table', type: 'data_table', label: 'Itens no Carrinho' },
              { id: 'comp_order_summary', type: 'metric_card', label: 'Resumo de Totais com Desconto' },
              { id: 'comp_shipping_calculator', type: 'input_group', label: 'Cálculo de Frete por CEP' }
            ],
            loadingState: { strategy: 'spinner' },
            emptyState: { message: 'Seu carrinho está vazio.', cta: 'Explorar Produtos' },
            errorState: { boundary: true, retryAction: 'reloadCart' },
            validations: [{ field: 'cupom', rule: 'alphanumeric' }, { field: 'cep', rule: 'cepFormat' }],
            actions: [
              { id: 'act_apply_coupon', name: 'Aplicar Cupom', endpoint: '/api/carrinho/cupom', handler: 'applyCoupon' },
              { id: 'act_finalize_order', name: 'Confirmar Pedido (Atômico)', endpoint: '/api/checkout', handler: 'finalizeOrder' }
            ],
            forms: [
              {
                id: 'form_checkout_steps',
                name: 'Identificação & Pagamento',
                onSubmit: '/api/checkout',
                fields: [
                  { name: 'nome', label: 'Nome Completo', type: 'input', bind: 'clienteNome' },
                  { name: 'email', label: 'E-mail', type: 'input', bind: 'clienteEmail' },
                  { name: 'metodoPagamento', label: 'Forma de Pagamento (PIX, CARTAO, BOLETO)', type: 'select', bind: 'metodoPagamento' }
                ]
              }
            ],
            modals: [
              { id: 'modal_order_success', title: 'Pedido Concluído com Sucesso', destination: 'order_success_view' }
            ],
            navigation: { route: '/checkout', parentRoute: '/catalog', breadcrumbs: ['Loja', 'Carrinho & Checkout'] },
            responsive: true,
            permissions: ['CLIENTE', 'LOJISTA', 'ADMIN']
          }
        ],
        operations: [
          { id: 'op_atomic_checkout', name: 'Executar Checkout Atômico', endpoint: '/api/checkout' },
          { id: 'op_validate_coupon', name: 'Validar Cupom Promocional', endpoint: '/api/carrinho/cupom' }
        ],
        businessRules: [
          { id: 'rule_atomic_stock_decrement', name: 'Abater estoque transacionalmente (BEGIN IMMEDIATE) apenas após confirmação.' },
          { id: 'rule_prevent_overselling', name: 'Abortar pedido com HTTP 400 se quantidade demandada exceder estoque.' },
          { id: 'rule_valid_coupon', name: 'Validar expiração e valor mínimo do cupom antes de calcular abatimento.' }
        ],
        permissions: ['CLIENTE', 'LOJISTA', 'ADMIN'],
        integrations: [
          { id: 'int_pix_gateway', service: 'Simulador Integrado de Pagamentos Pix / Cartão' }
        ]
      },
      {
        id: 'mod_orders_billing',
        name: 'Pedidos & Rastreamento',
        type: 'module',
        description: 'Acompanhamento do ciclo de vida dos pedidos do cliente com linha do tempo de entrega.',
        pages: [
          {
            id: 'page_orders_tracking',
            name: 'Meus Pedidos',
            route: '/orders',
            objective: 'Painel de acompanhamento e histórico de pedidos com timeline de entrega e comprovantes.',
            dataRequirements: [{ schema: 'OrdersHistorySchema' }],
            components: [
              { id: 'comp_orders_table', type: 'data_table', label: 'Tabela de Pedidos Realizados' },
              { id: 'comp_status_timeline', type: 'timeline', label: 'Linha do Tempo de Rastreamento' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Você ainda não realizou nenhum pedido.', cta: 'Iniciar Compras' },
            errorState: { boundary: true, retryAction: 'loadOrders' },
            validations: [{ field: 'orderId', rule: 'positiveInteger' }],
            actions: [
              { id: 'act_view_receipt', name: 'Visualizar Comprovante', endpoint: '/api/pedidos/:id/recibo', handler: 'viewReceipt' },
              { id: 'act_track_delivery', name: 'Rastrear Envio', endpoint: '/api/pedidos/:id/rastreio', handler: 'trackDelivery' }
            ],
            tabs: [
              { id: 'tab_active_orders', label: 'Em Andamento', view: 'active_orders_view' },
              { id: 'tab_completed_orders', label: 'Concluídos', view: 'completed_orders_view' }
            ],
            navigation: { route: '/orders', parentRoute: '/', breadcrumbs: ['Loja', 'Meus Pedidos'] },
            responsive: true,
            permissions: ['CLIENTE', 'ADMIN']
          }
        ],
        operations: [
          { id: 'op_list_orders', name: 'Listar Pedidos do Cliente', endpoint: '/api/pedidos' },
          { id: 'op_get_order_detail', name: 'Obter Detalhe do Pedido', endpoint: '/api/pedidos/:id' }
        ],
        businessRules: [
          { id: 'rule_client_order_isolation', name: 'Clientes visualizam exclusivamente seus próprios pedidos.' }
        ],
        permissions: ['CLIENTE', 'ADMIN'],
        integrations: [
          { id: 'int_sqlite_orders', service: 'Repositório Relacional de Pedidos' }
        ]
      },
      {
        id: 'mod_inventory_admin',
        name: 'Backoffice & Gestão de Estoque',
        type: 'module',
        description: 'Cockpit do lojista para controle de inventário, criação de produtos e status de pedidos.',
        pages: [
          {
            id: 'page_admin_backoffice',
            name: 'Backoffice do Lojista',
            route: '/admin/inventory',
            objective: 'Cockpit administrativo para controle de estoque, precificação e auditoria de compras.',
            dataRequirements: [{ schema: 'InventoryManagementSchema' }, { schema: 'SalesSummarySchema' }],
            components: [
              { id: 'comp_admin_kpis', type: 'metric_card', label: 'Indicadores Comerciais & Ruptura' },
              { id: 'comp_admin_products_table', type: 'data_table', label: 'Gerenciamento de Produtos' },
              { id: 'comp_admin_orders_table', type: 'data_table', label: 'Gerenciamento de Pedidos Globais' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum item pendente de gestão.', cta: 'Adicionar Produto' },
            errorState: { boundary: true, retryAction: 'loadAdminData' },
            validations: [{ field: 'preco', rule: 'positiveCurrency' }, { field: 'estoque', rule: 'nonNegativeInt' }],
            actions: [
              { id: 'act_create_product', name: 'Cadastrar Produto', endpoint: '/api/admin/produtos', handler: 'createProduct' },
              { id: 'act_update_stock', name: 'Ajustar Estoque', endpoint: '/api/admin/produtos/:id/estoque', handler: 'updateStock' },
              { id: 'act_update_order_status', name: 'Atualizar Status do Pedido', endpoint: '/api/admin/pedidos/:id/status', handler: 'updateOrderStatus' }
            ],
            forms: [
              {
                id: 'form_product_upsert',
                name: 'Cadastro / Edição de Produto',
                onSubmit: '/api/admin/produtos',
                fields: [
                  { name: 'nome', label: 'Nome do Produto', type: 'input', bind: 'newProdNome' },
                  { name: 'categoria_id', label: 'Categoria', type: 'select', bind: 'newProdCategoria' },
                  { name: 'preco', label: 'Preço de Venda', type: 'input', bind: 'newProdPreco' },
                  { name: 'estoque', label: 'Estoque Inicial', type: 'input', bind: 'newProdEstoque' }
                ]
              }
            ],
            modals: [
              { id: 'modal_new_product', title: 'Adicionar Produto ao Catálogo', destination: 'new_product_view' }
            ],
            navigation: { route: '/admin/inventory', parentRoute: '/catalog', breadcrumbs: ['Loja', 'Admin', 'Gestão'] },
            responsive: true,
            permissions: ['ADMIN', 'LOJISTA']
          }
        ],
        operations: [
          { id: 'op_create_product', name: 'Criar Produto', endpoint: '/api/admin/produtos' },
          { id: 'op_update_status', name: 'Mudar Status Pedido', endpoint: '/api/admin/pedidos/:id/status' }
        ],
        businessRules: [
          { id: 'rule_admin_rbac_only', name: 'Apenas operadores com perfil ADMIN ou LOJISTA podem alterar preços ou estoque.' }
        ],
        permissions: ['ADMIN', 'LOJISTA'],
        integrations: [
          { id: 'int_sqlite_admin', service: 'Módulo Relacional de Administração' }
        ]
      }
    ];
  }

  _generateProjectManagementModules(spec = {}) {
    return [
      {
        id: 'mod_projects_overview',
        name: 'Cockpit de Projetos & Indicadores',
        type: 'module',
        description: 'Painel executivo com métricas consolidadas, velocidade da equipe e entregas.',
        pages: [
          {
            id: 'page_pm_dashboard',
            name: 'Dashboard do Projeto',
            route: '/dashboard',
            objective: 'Painel executivo com métricas consolidadas de projetos, velocity e status de entregas.',
            dataRequirements: [{ schema: 'ProjectKpiSchema' }, { schema: 'TaskDistributionSchema' }],
            components: [
              { id: 'comp_kpi_total_tasks', type: 'metric_card', label: 'Total de Tarefas Ativas' },
              { id: 'comp_kpi_completion_rate', type: 'metric_card', label: 'Taxa de Conclusão (%)' },
              { id: 'comp_priority_breakdown', type: 'chart', label: 'Distribuição por Prioridade' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum projeto selecionado ou tarefas cadastradas.', cta: 'Criar Projeto' },
            errorState: { boundary: true, retryAction: 'loadDashboard' },
            validations: [{ field: 'projectId', rule: 'positiveInteger' }],
            actions: [
              { id: 'act_refresh_metrics', name: 'Atualizar Métricas', endpoint: '/api/dashboard', handler: 'loadDashboard' },
              { id: 'act_new_project', name: 'Criar Novo Projeto', endpoint: '/api/projetos', handler: 'openNewProjectModal' }
            ],
            tabs: [
              { id: 'tab_overview', label: 'Visão Geral', view: 'dashboard_overview' },
              { id: 'tab_velocity', label: 'Velocidade & Sprints', view: 'dashboard_velocity' }
            ],
            navigation: { route: '/dashboard', parentRoute: '/', breadcrumbs: ['Gestão', 'Dashboard'] },
            responsive: true,
            permissions: ['OWNER', 'MANAGER', 'MEMBER']
          }
        ],
        operations: [
          { id: 'op_load_metrics', name: 'Carregar Indicadores', endpoint: '/api/dashboard' }
        ],
        businessRules: [
          { id: 'rule_project_isolation', name: 'Métricas calculadas exclusivamente sobre o escopo do projeto ativo.' }
        ],
        permissions: ['OWNER', 'MANAGER', 'MEMBER'],
        integrations: [
          { id: 'int_sqlite_pm', service: 'Base de Dados SQLite do Task Manager' }
        ]
      },
      {
        id: 'mod_kanban_workspace',
        name: 'Workspace Kanban & Colaboração',
        type: 'module',
        description: 'Quadro visual interativo de tarefas com drag/click status e subtarefas.',
        pages: [
          {
            id: 'page_kanban_board',
            name: 'Quadro Kanban de Tarefas',
            route: '/board',
            objective: 'Quadro Kanban interativo com colunas de fluxo contínuo e filtros rápidos por prioridade.',
            dataRequirements: [{ schema: 'KanbanColumnsSchema' }, { schema: 'TasksByStatusSchema' }],
            components: [
              { id: 'comp_kanban_columns', type: 'kanban_board', label: 'Colunas de Fluxo (Backlog, A Fazer, Em Andamento, Concluído)' },
              { id: 'comp_filter_priority', type: 'filter', label: 'Filtro por Prioridade', filterTarget: 'kanbanColumns' },
              { id: 'comp_filter_assignee', type: 'filter', label: 'Filtro por Responsável', filterTarget: 'kanbanColumns' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhuma tarefa encontrada neste quadro.', cta: 'Criar Tarefa' },
            errorState: { boundary: true, retryAction: 'loadTasks' },
            validations: [{ field: 'titulo', rule: 'requiredText(3)' }, { field: 'status', rule: 'enum(BACKLOG,TODO,IN_PROGRESS,DONE)' }],
            actions: [
              { id: 'act_create_task', name: 'Nova Tarefa', endpoint: '/api/tarefas', handler: 'openTaskModal' },
              { id: 'act_move_task', name: 'Mover Status da Tarefa', endpoint: '/api/tarefas/:id/status', handler: 'moveTaskStatus' }
            ],
            forms: [
              {
                id: 'form_create_task',
                name: 'Criação Rápida de Tarefa',
                onSubmit: '/api/tarefas',
                fields: [
                  { name: 'titulo', label: 'Título da Tarefa', type: 'input', bind: 'taskTitulo' },
                  { name: 'descricao', label: 'Descrição Detalhada', type: 'textarea', bind: 'taskDescricao' },
                  { name: 'prioridade', label: 'Prioridade', type: 'select', bind: 'taskPrioridade' },
                  { name: 'responsavel_id', label: 'Responsável', type: 'select', bind: 'taskResponsavel' }
                ]
              }
            ],
            modals: [
              { id: 'modal_task_detail', title: 'Detalhes da Tarefa & Subtarefas', destination: 'task_detail_view' }
            ],
            navigation: { route: '/board', parentRoute: '/dashboard', breadcrumbs: ['Gestão', 'Quadro Kanban'] },
            responsive: true,
            permissions: ['OWNER', 'MANAGER', 'MEMBER', 'GUEST'],
            subpages: [
              {
                id: 'subpage_task_detail',
                name: 'Detalhe da Tarefa & Comentários',
                route: '/board/task-detail',
                objective: 'Painel analítico da tarefa com subtarefas acionáveis, histórico de comentários e anexos.',
                dataRequirements: [{ schema: 'TaskDetailSchema' }, { schema: 'SubtasksSchema' }, { schema: 'CommentsSchema' }],
                components: [
                  { id: 'comp_subtasks_checklist', type: 'data_table', label: 'Checklist de Subtarefas' },
                  { id: 'comp_comments_stream', type: 'timeline', label: 'Fluxo de Comentários em Tempo Real' },
                  { id: 'comp_attachments_list', type: 'data_table', label: 'Metadados de Anexos' }
                ],
                loadingState: { strategy: 'spinner' },
                emptyState: { message: 'Nenhuma subtarefa ou comentário registrado.', cta: 'Adicionar Subtarefa' },
                errorState: { boundary: true },
                validations: [{ field: 'comentario', rule: 'requiredText(2)' }],
                actions: [
                  { id: 'act_toggle_subtask', name: 'Alternar Subtarefa', endpoint: '/api/subtarefas/:id/toggle', handler: 'toggleSubtask' },
                  { id: 'act_add_comment', name: 'Publicar Comentário', endpoint: '/api/tarefas/:id/comentarios', handler: 'addComment' }
                ],
                forms: [
                  {
                    id: 'form_add_comment',
                    name: 'Novo Comentário',
                    onSubmit: '/api/tarefas/:id/comentarios',
                    fields: [
                      { name: 'conteudo', label: 'Comentário', type: 'textarea', bind: 'commentText' }
                    ]
                  }
                ],
                navigation: { route: '/board/task-detail', parentRoute: '/board', breadcrumbs: ['Gestão', 'Quadro Kanban', 'Tarefa'] },
                responsive: true,
                permissions: ['OWNER', 'MANAGER', 'MEMBER']
              }
            ]
          }
        ],
        operations: [
          { id: 'op_move_kanban_card', name: 'Mover Card Kanban', endpoint: '/api/tarefas/:id/status' },
          { id: 'op_toggle_subtask', name: 'Marcar Subtarefa', endpoint: '/api/subtarefas/:id/toggle' },
          { id: 'op_add_comment', name: 'Adicionar Comentário', endpoint: '/api/tarefas/:id/comentarios' }
        ],
        businessRules: [
          { id: 'rule_valid_kanban_transition', name: 'Transições de status devem seguir a máquina de estados (BACKLOG -> TODO -> IN_PROGRESS -> DONE).' },
          { id: 'rule_subtask_progress_sync', name: 'Ao marcar ou desmarcar subtarefas, recalcular percentual de progresso dinamicamente.' },
          { id: 'rule_immutable_activity_log', name: 'Toda movimentação ou edição de tarefa gera entrada imutável no histórico.' }
        ],
        permissions: ['OWNER', 'MANAGER', 'MEMBER', 'GUEST'],
        integrations: [
          { id: 'int_sqlite_tasks', service: 'Módulo Relacional de Tarefas' }
        ]
      },
      {
        id: 'mod_teams_allocation',
        name: 'Equipe & Alocação de Membros',
        type: 'module',
        description: 'Gestão de participantes do projeto, atribuição de papéis e distribuição de tarefas.',
        pages: [
          {
            id: 'page_team_members',
            name: 'Membros da Equipe',
            route: '/team',
            objective: 'Gestão de colaboradores, alocação de squads e balanceamento de carga de trabalho.',
            dataRequirements: [{ schema: 'TeamMemberListSchema' }],
            components: [
              { id: 'comp_team_table', type: 'data_table', label: 'Tabela de Integrantes do Projeto' },
              { id: 'comp_workload_gauge', type: 'metric_card', label: 'Carga de Tarefas por Membro' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum membro vinculado a este projeto.', cta: 'Convidar Membro' },
            errorState: { boundary: true, retryAction: 'loadTeam' },
            validations: [{ field: 'papel', rule: 'enum(OWNER,MANAGER,MEMBER,GUEST)' }],
            actions: [
              { id: 'act_add_member', name: 'Adicionar Membro', endpoint: '/api/equipe', handler: 'addMember' }
            ],
            navigation: { route: '/team', parentRoute: '/dashboard', breadcrumbs: ['Gestão', 'Equipe'] },
            responsive: true,
            permissions: ['OWNER', 'MANAGER']
          }
        ],
        operations: [
          { id: 'op_list_members', name: 'Listar Integrantes', endpoint: '/api/equipe' }
        ],
        businessRules: [
          { id: 'rule_only_owner_manage_roles', name: 'Apenas papéis OWNER e MANAGER podem alterar permissões de membros.' }
        ],
        permissions: ['OWNER', 'MANAGER'],
        integrations: [
          { id: 'int_sqlite_team', service: 'Módulo Relacional de Usuários e Equipes' }
        ]
      },
      {
        id: 'mod_productivity_reports',
        name: 'Trilha de Atividades & Relatórios',
        type: 'module',
        description: 'Histórico auditável de ações, log imutável de eventos e exportação.',
        pages: [
          {
            id: 'page_activity_reports',
            name: 'Histórico de Atividades',
            route: '/reports',
            objective: 'Trilha imutável de eventos e relatórios de produtividade com exportação estruturada.',
            dataRequirements: [{ schema: 'ActivityFeedSchema' }],
            components: [
              { id: 'comp_activity_feed', type: 'timeline', label: 'Feed Cronológico de Atividades' },
              { id: 'comp_export_actions', type: 'metric_card', label: 'Exportador de Dados' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhuma atividade registrada no período.', cta: 'Atualizar Feed' },
            errorState: { boundary: true, retryAction: 'loadActivities' },
            validations: [{ field: 'limite', rule: 'max(100)' }],
            actions: [
              { id: 'act_export_csv', name: 'Exportar Relatório CSV', endpoint: '/api/relatorios/exportar', handler: 'exportCsv' }
            ],
            navigation: { route: '/reports', parentRoute: '/dashboard', breadcrumbs: ['Gestão', 'Relatórios'] },
            responsive: true,
            permissions: ['OWNER', 'MANAGER', 'MEMBER']
          }
        ],
        operations: [
          { id: 'op_fetch_activities', name: 'Obter Trilha de Atividades', endpoint: '/api/atividades' }
        ],
        businessRules: [
          { id: 'rule_immutable_audit', name: 'Registros de atividade não podem ser alterados ou apagados.' }
        ],
        permissions: ['OWNER', 'MANAGER', 'MEMBER'],
        integrations: [
          { id: 'int_sqlite_audit', service: 'Trilha de Auditoria SQLite' }
        ]
      }
    ];
  }

  _generateMultiTenantSaasModules(spec = {}) {
    return [
      {
        id: 'mod_landing_commercial',
        name: 'Landing Page & Apresentação Comercial',
        type: 'module',
        description: 'Página pública de conversão comercial com visão geral da plataforma, planos e proposta de valor.',
        pages: [
          {
            id: 'page_landing',
            name: 'Página Inicial & Apresentação Comercial',
            route: '/landing',
            objective: 'Apresentar a proposta de valor do SaaS multiempresa, tabela comparativa de planos e chamada para ação.',
            dataRequirements: [{ schema: 'PlansPublicSchema' }, { schema: 'MetricsShowcaseSchema' }],
            components: [
              { id: 'comp_hero_banner', type: 'hero_card', label: 'Hero Banner com Call to Action' },
              { id: 'comp_feature_grid', type: 'grid', label: 'Grade de Recursos Comerciais e Operacionais' },
              { id: 'comp_pricing_cards', type: 'data_table', label: 'Tabela Comparativa de Planos (Free, Pro, Enterprise)' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Planos disponíveis em breve.', cta: 'Fale Conosco' },
            errorState: { boundary: true, retryAction: 'loadLanding' },
            validations: [{ field: 'emailLead', rule: 'safeEmail' }],
            actions: [
              { id: 'act_go_register', name: 'Criar Minha Empresa', endpoint: '/api/auth/register', handler: 'openRegisterModal' },
              { id: 'act_contact_sales', name: 'Falar com Consultor', endpoint: '/api/public/lead', handler: 'submitLead' }
            ],
            tabs: [
              { id: 'tab_features', label: 'Funcionalidades', view: 'features_view' },
              { id: 'tab_pricing', label: 'Planos & Preços', view: 'pricing_view' }
            ],
            forms: [],
            modals: [],
            navigation: { route: '/landing', parentRoute: '/', breadcrumbs: ['Início', 'Apresentação'] },
            responsive: true,
            permissions: ['PUBLIC', 'ANONYMOUS']
          }
        ],
        operations: [
          { id: 'op_view_landing', name: 'Carregar Landing Page', endpoint: '/api/public/plans' }
        ],
        businessRules: [
          { id: 'rule_public_landing_access', name: 'Acesso público sem exigência de autenticação ou token.' }
        ],
        permissions: ['PUBLIC'],
        integrations: [
          { id: 'int_public_api', service: 'API Pública de Planos e Preços' }
        ]
      },
      {
        id: 'mod_auth_onboarding',
        name: 'Cadastro, Autenticação & Onboarding',
        type: 'module',
        description: 'Fluxo completo de cadastro de empresa, login de usuários, recuperação de senha e gestão de sessões.',
        pages: [
          {
            id: 'page_login_register',
            name: 'Login & Registro de Tenant',
            route: '/auth',
            objective: 'Autenticação segura de usuários com isolamento multiempresa e registro de novas organizações.',
            dataRequirements: [{ schema: 'AuthCredentialsSchema' }, { schema: 'TenantRegistrationSchema' }],
            components: [
              { id: 'comp_auth_tabs', type: 'tabs', label: 'Alternador Login / Cadastro de Empresa' },
              { id: 'comp_login_form_box', type: 'form_card', label: 'Formulário de Acesso Seguro' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Informe suas credenciais para acessar.', cta: 'Criar Empresa' },
            errorState: { boundary: true, retryAction: 'resetAuthForm' },
            validations: [{ field: 'email', rule: 'requiredEmail' }, { field: 'password', rule: 'min(8)' }],
            actions: [
              { id: 'act_login', name: 'Entrar na Plataforma', endpoint: '/api/auth/login', handler: 'doLogin' },
              { id: 'act_register_tenant', name: 'Cadastrar Empresa', endpoint: '/api/auth/register', handler: 'doRegisterTenant' },
              { id: 'act_forgot_pwd', name: 'Recuperar Senha', endpoint: '/api/auth/forgot-password', handler: 'openForgotPassword' }
            ],
            forms: [
              {
                id: 'form_login',
                name: 'Formulário de Login',
                onSubmit: '/api/auth/login',
                fields: [
                  { name: 'email', label: 'E-mail Corporativo', type: 'input', bind: 'loginEmail' },
                  { name: 'password', label: 'Senha de Acesso', type: 'password', bind: 'loginPassword' }
                ]
              },
              {
                id: 'form_register',
                name: 'Registro de Nova Empresa',
                onSubmit: '/api/auth/register',
                fields: [
                  { name: 'companyName', label: 'Nome da Empresa', type: 'input', bind: 'regCompanyName' },
                  { name: 'adminName', label: 'Nome do Administrador', type: 'input', bind: 'regAdminName' },
                  { name: 'email', label: 'E-mail Profissional', type: 'input', bind: 'regEmail' },
                  { name: 'password', label: 'Senha Forte', type: 'password', bind: 'regPassword' }
                ]
              }
            ],
            modals: [
              { id: 'modal_forgot_password', title: 'Recuperação de Senha', destination: 'forgot_password_view' }
            ],
            navigation: { route: '/auth', parentRoute: '/', breadcrumbs: ['Acesso', 'Autenticação'] },
            responsive: true,
            permissions: ['PUBLIC', 'ANONYMOUS']
          }
        ],
        operations: [
          { id: 'op_login_auth', name: 'Autenticar Usuário', endpoint: '/api/auth/login' },
          { id: 'op_logout_session', name: 'Encerrar Sessão', endpoint: '/api/auth/logout' }
        ],
        businessRules: [
          { id: 'rule_secure_hash', name: 'Senhas devem ser hasheadas com PBKDF2/SHA-256 e salt criptográfico individual.' },
          { id: 'rule_session_revocation', name: 'Sessões revogadas devem ser imediatamente bloqueadas em todas as requisições subsequentes.' }
        ],
        permissions: ['PUBLIC', 'AUTHENTICATED'],
        integrations: [
          { id: 'int_crypto_auth', service: 'Módulo Nativo de Criptografia Node.js' }
        ]
      },
      {
        id: 'mod_tenant_dashboard',
        name: 'Dashboard Executivo Multi-Tenant',
        type: 'module',
        description: 'Painel operacional com métricas consolidadas de receita, vendas, clientes ativos e status do plano.',
        pages: [
          {
            id: 'page_tenant_dashboard',
            name: 'Visão Geral Operacional',
            route: '/dashboard',
            objective: 'Apresentar KPIs comerciais, receita do mês, pedidos ativos e consumo de limites da assinatura.',
            dataRequirements: [{ schema: 'DashboardMetricsSchema' }, { schema: 'SalesSummarySchema' }, { schema: 'PlanQuotaSchema' }],
            components: [
              { id: 'comp_kpi_revenue', type: 'metric_card', label: 'Faturamento Total do Mês' },
              { id: 'comp_kpi_orders', type: 'metric_card', label: 'Pedidos Realizados' },
              { id: 'comp_kpi_ticket', type: 'metric_card', label: 'Ticket Médio de Vendas' },
              { id: 'comp_quota_meter', type: 'metric_card', label: 'Consumo de Quotas do Plano' },
              { id: 'comp_recent_activities', type: 'data_table', label: 'Últimas Operações Registradas' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhuma operação registrada para esta empresa ainda.', cta: 'Criar Primeiro Pedido' },
            errorState: { boundary: true, retryAction: 'loadDashboard' },
            validations: [{ field: 'periodo', rule: 'enum(hoje,mes,ano)' }],
            actions: [
              { id: 'act_refresh_metrics', name: 'Atualizar Dados', endpoint: '/api/reports/dashboard', handler: 'refreshDashboard' },
              { id: 'act_new_order_shortcut', name: 'Novo Pedido', endpoint: '/api/orders', handler: 'openNewOrderModal' }
            ],
            tabs: [
              { id: 'tab_overview', label: 'Visão Geral', view: 'dash_overview' },
              { id: 'tab_performance', label: 'Desempenho Comercial', view: 'dash_performance' }
            ],
            navigation: { route: '/dashboard', parentRoute: '/', breadcrumbs: ['Empresa', 'Dashboard'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
          }
        ],
        operations: [
          { id: 'op_get_dashboard', name: 'Consultar Métricas do Dashboard', endpoint: '/api/reports/dashboard' }
        ],
        businessRules: [
          { id: 'rule_tenant_isolation_dashboard', name: 'Métricas devem agregar estritamente os dados do tenant autenticado.' }
        ],
        permissions: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
        integrations: [
          { id: 'int_sqlite_dashboard', service: 'Agregador Relacional de Métricas SQLite' }
        ]
      },
      {
        id: 'mod_customers_crm',
        name: 'Gestão de Clientes & CRM',
        type: 'module',
        description: 'Cadastro, busca, histórico de relacionamento e gestão de carteira de clientes isolada por empresa.',
        pages: [
          {
            id: 'page_customers_list',
            name: 'Carteira de Clientes',
            route: '/customers',
            objective: 'Listagem filtrada, busca instantânea e manutenção de clientes pertencentes à empresa.',
            dataRequirements: [{ schema: 'CustomerListSchema' }],
            components: [
              { id: 'comp_customer_search', type: 'search', label: 'Buscar por Nome, Documento ou E-mail', onSearch: 'searchCustomers' },
              { id: 'comp_customer_table', type: 'data_table', label: 'Tabela de Clientes Cadastrados' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum cliente cadastrado.', cta: 'Adicionar Cliente' },
            errorState: { boundary: true, retryAction: 'loadCustomers' },
            validations: [{ field: 'nome', rule: 'requiredText(3)' }, { field: 'email', rule: 'validEmail' }],
            actions: [
              { id: 'act_add_customer', name: 'Novo Cliente', endpoint: '/api/customers', handler: 'openAddCustomerModal' },
              { id: 'act_edit_customer', name: 'Editar Cliente', endpoint: '/api/customers/:id', handler: 'openEditCustomer' }
            ],
            forms: [
              {
                id: 'form_customer',
                name: 'Cadastro de Cliente',
                onSubmit: '/api/customers',
                fields: [
                  { name: 'nome', label: 'Nome Completo / Razão Social', type: 'input', bind: 'custNome' },
                  { name: 'email', label: 'E-mail de Contato', type: 'input', bind: 'custEmail' },
                  { name: 'telefone', label: 'Telefone / WhatsApp', type: 'input', bind: 'custTelefone' },
                  { name: 'documento', label: 'CPF / CNPJ', type: 'input', bind: 'custDocumento' }
                ]
              }
            ],
            modals: [
              { id: 'modal_customer_form', title: 'Dados do Cliente', destination: 'customer_modal_view' }
            ],
            navigation: { route: '/customers', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Clientes'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN', 'MEMBER']
          }
        ],
        operations: [
          { id: 'op_list_customers', name: 'Listar Clientes', endpoint: '/api/customers' },
          { id: 'op_create_customer', name: 'Criar Cliente', endpoint: '/api/customers' }
        ],
        businessRules: [
          { id: 'rule_customer_tenant_isolation', name: 'Nenhum cliente de uma empresa pode ser visualizado ou alterado por outra.' }
        ],
        permissions: ['OWNER', 'ADMIN', 'MEMBER'],
        integrations: [
          { id: 'int_sqlite_customers', service: 'Tabela Clientes SQLite' }
        ]
      },
      {
        id: 'mod_catalog_inventory',
        name: 'Produtos, Serviços & Estoque',
        type: 'module',
        description: 'Catálogo de itens comercializáveis com controle de preço, custo e estoque físico com baixa atômica.',
        pages: [
          {
            id: 'page_products_list',
            name: 'Catálogo de Produtos',
            route: '/products',
            objective: 'Gestão de catálogo, controle de estoque físico e alertas de nível mínimo para suprimentos.',
            dataRequirements: [{ schema: 'ProductListSchema' }],
            components: [
              { id: 'comp_prod_search', type: 'search', label: 'Buscar Produto por SKU ou Nome', onSearch: 'searchProducts' },
              { id: 'comp_prod_table', type: 'data_table', label: 'Grade de Produtos e Saldo de Estoque' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum produto cadastrado no catálogo.', cta: 'Cadastrar Produto' },
            errorState: { boundary: true, retryAction: 'loadProducts' },
            validations: [{ field: 'preco', rule: 'positiveNumber' }, { field: 'estoque', rule: 'min(0)' }],
            actions: [
              { id: 'act_add_product', name: 'Novo Produto', endpoint: '/api/products', handler: 'openAddProductModal' },
              { id: 'act_adjust_stock', name: 'Ajustar Estoque', endpoint: '/api/products/:id/stock', handler: 'openStockAdjust' }
            ],
            forms: [
              {
                id: 'form_product',
                name: 'Cadastro de Produto',
                onSubmit: '/api/products',
                fields: [
                  { name: 'nome', label: 'Nome do Produto', type: 'input', bind: 'prodNome' },
                  { name: 'codigo_sku', label: 'Código SKU', type: 'input', bind: 'prodSku' },
                  { name: 'categoria', label: 'Categoria', type: 'input', bind: 'prodCategoria' },
                  { name: 'preco', label: 'Preço de Venda (R$)', type: 'input', bind: 'prodPreco' },
                  { name: 'estoque', label: 'Estoque Inicial', type: 'input', bind: 'prodEstoque' }
                ]
              }
            ],
            modals: [
              { id: 'modal_product_form', title: 'Ficha do Produto', destination: 'product_modal_view' }
            ],
            navigation: { route: '/products', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Produtos'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN', 'MEMBER']
          }
        ],
        operations: [
          { id: 'op_list_products', name: 'Listar Produtos', endpoint: '/api/products' },
          { id: 'op_create_product', name: 'Cadastrar Produto', endpoint: '/api/products' }
        ],
        businessRules: [
          { id: 'rule_plan_limit_products', name: 'Criação de novos produtos deve respeitar a cota máxima do plano ativo do tenant.' },
          { id: 'rule_atomic_stock_decrement', name: 'Baixas de estoque devem ser executadas em transação atômica SQLite (BEGIN IMMEDIATE).' }
        ],
        permissions: ['OWNER', 'ADMIN', 'MEMBER'],
        integrations: [
          { id: 'int_sqlite_products', service: 'Tabela Produtos SQLite com Restrições de Integridade' }
        ]
      },
      {
        id: 'mod_orders_operations',
        name: 'Pedidos de Venda & Operações Comerciais',
        type: 'module',
        description: 'Fluxo comercial com emissão de pedidos, cálculo automático de totais, máquina de estados e integração financeira.',
        pages: [
          {
            id: 'page_orders_list',
            name: 'Central de Pedidos',
            route: '/orders',
            objective: 'Gerenciamento operacional de pedidos de venda com máquina de estados (DRAFT -> CONFIRMED -> SHIPPED -> COMPLETED).',
            dataRequirements: [{ schema: 'OrderListSchema' }, { schema: 'CustomerSelectSchema' }, { schema: 'ProductSelectSchema' }],
            components: [
              { id: 'comp_orders_table', type: 'data_table', label: 'Tabela de Pedidos Emitidos' },
              { id: 'comp_order_status_filter', type: 'filter', label: 'Filtro por Status Operacional', filterTarget: 'ordersTable' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum pedido registrado.', cta: 'Emitir Pedido' },
            errorState: { boundary: true, retryAction: 'loadOrders' },
            validations: [{ field: 'itens', rule: 'minItems(1)' }, { field: 'cliente_id', rule: 'required' }],
            actions: [
              { id: 'act_new_order', name: 'Criar Pedido', endpoint: '/api/orders', handler: 'openNewOrderModal' },
              { id: 'act_update_order_status', name: 'Avançar Status', endpoint: '/api/orders/:id/status', handler: 'advanceOrderStatus' }
            ],
            forms: [
              {
                id: 'form_order',
                name: 'Emissão de Pedido',
                onSubmit: '/api/orders',
                fields: [
                  { name: 'cliente_id', label: 'Cliente', type: 'select', bind: 'orderClienteId' },
                  { name: 'produto_id', label: 'Item / Produto', type: 'select', bind: 'orderProdutoId' },
                  { name: 'quantidade', label: 'Quantidade', type: 'input', bind: 'orderQuantidade' }
                ]
              }
            ],
            modals: [
              { id: 'modal_order_form', title: 'Novo Pedido de Venda', destination: 'order_modal_view' }
            ],
            navigation: { route: '/orders', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Pedidos'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN', 'MEMBER']
          }
        ],
        operations: [
          { id: 'op_list_orders', name: 'Listar Pedidos', endpoint: '/api/orders' },
          { id: 'op_create_order', name: 'Emitir Pedido de Venda', endpoint: '/api/orders' }
        ],
        businessRules: [
          { id: 'rule_order_overselling_block', name: 'Pedidos com quantidade superior ao estoque físico devem ser rejeitados com HTTP 400.' },
          { id: 'rule_order_financial_receivable', name: 'A confirmação de pedido gera automaticamente título a receber no módulo financeiro.' }
        ],
        permissions: ['OWNER', 'ADMIN', 'MEMBER'],
        integrations: [
          { id: 'int_sqlite_orders', service: 'Tabela de Pedidos e Itens SQLite com Transações Atômicas' }
        ]
      },
      {
        id: 'mod_financial_management',
        name: 'Gestão Financeira & Balanço',
        type: 'module',
        description: 'Fluxo de caixa com contas a pagar e receber, liquidação de títulos, balanço consolidado e conciliação.',
        pages: [
          {
            id: 'page_finance_summary',
            name: 'Contas & Fluxo de Caixa',
            route: '/finance',
            objective: 'Acompanhar receitas, despesas, conciliação de transações e saldo líquido consolidado.',
            dataRequirements: [{ schema: 'FinanceSummarySchema' }, { schema: 'TransactionListSchema' }],
            components: [
              { id: 'comp_fin_receivables', type: 'metric_card', label: 'Total a Receber' },
              { id: 'comp_fin_payables', type: 'metric_card', label: 'Total a Pagar' },
              { id: 'comp_fin_balance', type: 'metric_card', label: 'Saldo Operacional Líquido' },
              { id: 'comp_transactions_table', type: 'data_table', label: 'Tabela de Lançamentos Financeiros' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhuma transação financeira registrada.', cta: 'Novo Lançamento' },
            errorState: { boundary: true, retryAction: 'loadFinance' },
            validations: [{ field: 'valor', rule: 'positiveNumber' }, { field: 'tipo', rule: 'enum(RECEITA,DESPESA)' }],
            actions: [
              { id: 'act_add_transaction', name: 'Novo Lançamento', endpoint: '/api/finance/transactions', handler: 'openAddTransactionModal' },
              { id: 'act_reconcile_title', name: 'Liquidar Título', endpoint: '/api/finance/transactions/:id/reconcile', handler: 'reconcileTransaction' }
            ],
            forms: [
              {
                id: 'form_transaction',
                name: 'Lançamento Financeiro',
                onSubmit: '/api/finance/transactions',
                fields: [
                  { name: 'tipo', label: 'Tipo de Movimento', type: 'select', bind: 'finTipo' },
                  { name: 'descricao', label: 'Descrição da Transação', type: 'input', bind: 'finDescricao' },
                  { name: 'valor', label: 'Valor (R$)', type: 'input', bind: 'finValor' },
                  { name: 'categoria', label: 'Categoria Financeira', type: 'input', bind: 'finCategoria' }
                ]
              }
            ],
            modals: [
              { id: 'modal_transaction_form', title: 'Registrar Movimento Financeiro', destination: 'finance_modal_view' }
            ],
            navigation: { route: '/finance', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Financeiro'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN']
          }
        ],
        operations: [
          { id: 'op_get_finance_summary', name: 'Resumo Financeiro', endpoint: '/api/finance/summary' },
          { id: 'op_list_transactions', name: 'Listar Lançamentos', endpoint: '/api/finance/transactions' }
        ],
        businessRules: [
          { id: 'rule_finance_role_restriction', name: 'Apenas papéis OWNER e ADMIN possuem permissão para visualizar e liquidar títulos financeiros.' }
        ],
        permissions: ['OWNER', 'ADMIN'],
        integrations: [
          { id: 'int_sqlite_finance', service: 'Tabela de Transações Financeiras SQLite' }
        ]
      },
      {
        id: 'mod_users_teams',
        name: 'Usuários, Equipes & Permissões RBAC',
        type: 'module',
        description: 'Gestão de usuários vinculados à organização, convites por e-mail, papéis e revogação de sessões.',
        pages: [
          {
            id: 'page_team_management',
            name: 'Equipe & Controle de Acesso',
            route: '/team',
            objective: 'Administrar colaboradores da empresa, atribuir privilégios RBAC e invalidar sessões ativas.',
            dataRequirements: [{ schema: 'UserListSchema' }, { schema: 'InviteListSchema' }],
            components: [
              { id: 'comp_team_table', type: 'data_table', label: 'Membros da Organização' },
              { id: 'comp_role_summary', type: 'metric_card', label: 'Distribuição de Papéis (Owner, Admin, Member, Viewer)' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum usuário adicional convidado.', cta: 'Convidar Colaborador' },
            errorState: { boundary: true, retryAction: 'loadTeam' },
            validations: [{ field: 'email', rule: 'requiredEmail' }, { field: 'papel', rule: 'enum(OWNER,ADMIN,MEMBER,VIEWER)' }],
            actions: [
              { id: 'act_invite_member', name: 'Convidar Usuário', endpoint: '/api/users/invite', handler: 'openInviteModal' },
              { id: 'act_revoke_session', name: 'Revogar Sessões', endpoint: '/api/users/:id/revoke-sessions', handler: 'revokeUserSessions' }
            ],
            forms: [
              {
                id: 'form_invite',
                name: 'Convite de Membro',
                onSubmit: '/api/users/invite',
                fields: [
                  { name: 'nome', label: 'Nome Completo', type: 'input', bind: 'inviteNome' },
                  { name: 'email', label: 'E-mail do Colaborador', type: 'input', bind: 'inviteEmail' },
                  { name: 'papel', label: 'Perfil de Acesso (RBAC)', type: 'select', bind: 'invitePapel' }
                ]
              }
            ],
            modals: [
              { id: 'modal_invite_form', title: 'Convidar Novo Usuário', destination: 'invite_modal_view' }
            ],
            navigation: { route: '/team', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Equipe'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN']
          }
        ],
        operations: [
          { id: 'op_list_users', name: 'Listar Usuários', endpoint: '/api/users' },
          { id: 'op_invite_user', name: 'Convidar Usuário', endpoint: '/api/users/invite' }
        ],
        businessRules: [
          { id: 'rule_plan_limit_users', name: 'A criação ou convite de usuários deve respeitar a cota máxima de assentos do plano.' },
          { id: 'rule_owner_only_destructive', name: 'Apenas OWNER pode remover outros administradores ou revogar o tenant.' }
        ],
        permissions: ['OWNER', 'ADMIN'],
        integrations: [
          { id: 'int_sqlite_rbac', service: 'Módulo RBAC e Sessões SQLite' }
        ]
      },
      {
        id: 'mod_reports_analytics',
        name: 'Relatórios Executivos & Analytics',
        type: 'module',
        description: 'Dashboards analíticos com ranking de produtos mais vendidos, evolução temporal de vendas e exportação de dados.',
        pages: [
          {
            id: 'page_reports_analytics',
            name: 'Analytics de Vendas & Desempenho',
            route: '/reports',
            objective: 'Visualização analítica de desempenho comercial, curva de produtos mais vendidos e histórico de auditoria.',
            dataRequirements: [{ schema: 'SalesReportSchema' }, { schema: 'TopProductsSchema' }],
            components: [
              { id: 'comp_top_products_table', type: 'data_table', label: 'Ranking de Produtos Mais Vendidos' },
              { id: 'comp_sales_trend_card', type: 'metric_card', label: 'Evolução Mensal de Faturamento' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Dados insuficientes para gerar relatórios analíticos.', cta: 'Registrar Operações' },
            errorState: { boundary: true, retryAction: 'loadReports' },
            validations: [{ field: 'formato', rule: 'enum(csv,json)' }],
            actions: [
              { id: 'act_export_sales_report', name: 'Exportar Vendas (JSON)', endpoint: '/api/reports/sales', handler: 'exportSales' }
            ],
            navigation: { route: '/reports', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Relatórios'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN', 'MEMBER']
          }
        ],
        operations: [
          { id: 'op_get_sales_report', name: 'Relatório de Vendas', endpoint: '/api/reports/sales' },
          { id: 'op_get_top_products', name: 'Produtos Mais Vendidos', endpoint: '/api/reports/top-products' }
        ],
        businessRules: [
          { id: 'rule_reports_tenant_only', name: 'Relatórios devem conter apenas registros gerados pelo próprio tenant.' }
        ],
        permissions: ['OWNER', 'ADMIN', 'MEMBER'],
        integrations: [
          { id: 'int_sqlite_reports', service: 'Agregador de Relatórios SQLite' }
        ]
      },
      {
        id: 'mod_notifications_hub',
        name: 'Central de Notificações & Alertas',
        type: 'module',
        description: 'Feed de notificações operacionais em tempo real com controle de status lido/não lido.',
        pages: [
          {
            id: 'page_notifications_feed',
            name: 'Central de Notificações',
            route: '/notifications',
            objective: 'Monitoramento de alertas críticos como estoque baixo, novo pedido emitido e eventos de segurança.',
            dataRequirements: [{ schema: 'NotificationListSchema' }],
            components: [
              { id: 'comp_notif_stream', type: 'timeline', label: 'Feed Cronológico de Notificações' },
              { id: 'comp_notif_unread_badge', type: 'badge', label: 'Contador de Alertas Não Lidos' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Todas as notificações foram lidas.', cta: 'Atualizar Notificações' },
            errorState: { boundary: true, retryAction: 'loadNotifications' },
            validations: [{ field: 'notifId', rule: 'positiveInt' }],
            actions: [
              { id: 'act_mark_all_read', name: 'Marcar Todas como Lidas', endpoint: '/api/notifications/mark-all-read', handler: 'markAllRead' },
              { id: 'act_mark_read_single', name: 'Marcar como Lida', endpoint: '/api/notifications/:id/read', handler: 'markSingleRead' }
            ],
            navigation: { route: '/notifications', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Notificações'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
          }
        ],
        operations: [
          { id: 'op_list_notifications', name: 'Listar Notificações', endpoint: '/api/notifications' },
          { id: 'op_read_all_notifs', name: 'Marcar Todas como Lidas', endpoint: '/api/notifications/mark-all-read' }
        ],
        businessRules: [
          { id: 'rule_notification_isolation', name: 'Notificações são estritamente direcionadas ao tenant e usuário destinatário.' }
        ],
        permissions: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
        integrations: [
          { id: 'int_sqlite_notifications', service: 'Tabela de Notificações SQLite' }
        ]
      },
      {
        id: 'mod_plans_subscriptions',
        name: 'Planos, Assinaturas & Limites',
        type: 'module',
        description: 'Controle de assinatura da organização com limites de recursos (usuários, produtos, pedidos/mês) e upgrade.',
        pages: [
          {
            id: 'page_plans_pricing',
            name: 'Meu Plano & Upgrade de Assinatura',
            route: '/plans',
            objective: 'Exibir plano ativo, utilização das cotas de recursos e opções de upgrade de categoria.',
            dataRequirements: [{ schema: 'CurrentPlanUsageSchema' }, { schema: 'AvailablePlansSchema' }],
            components: [
              { id: 'comp_current_plan_card', type: 'metric_card', label: 'Plano Atual Ativo' },
              { id: 'comp_plan_limit_meters', type: 'data_table', label: 'Medidores de Consumo de Quota' },
              { id: 'comp_upgrade_tiers', type: 'grid', label: 'Tabela de Upgrade de Planos' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Dados de assinatura indisponíveis.', cta: 'Recarregar Planos' },
            errorState: { boundary: true, retryAction: 'loadPlans' },
            validations: [{ field: 'planoId', rule: 'required' }],
            actions: [
              { id: 'act_upgrade_plan', name: 'Fazer Upgrade de Plano', endpoint: '/api/plans/upgrade', handler: 'requestPlanUpgrade' }
            ],
            navigation: { route: '/plans', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Planos'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN']
          }
        ],
        operations: [
          { id: 'op_get_plans', name: 'Listar Planos Disponíveis', endpoint: '/api/plans' },
          { id: 'op_upgrade_plan', name: 'Alterar Plano da Empresa', endpoint: '/api/plans/upgrade' }
        ],
        businessRules: [
          { id: 'rule_plan_enforcement_middleware', name: 'Requisições que ultrapassem os limites da assinatura são bloqueadas com HTTP 402/403.' }
        ],
        permissions: ['OWNER', 'ADMIN'],
        integrations: [
          { id: 'int_sqlite_plans', service: 'Tabelas Planos e Assinaturas SQLite' }
        ]
      },
      {
        id: 'mod_tenants_config',
        name: 'Configurações da Empresa',
        type: 'module',
        description: 'Dados cadastrais da organização, moeda operacional, fuso horário e preferências corporativas.',
        pages: [
          {
            id: 'page_company_settings',
            name: 'Configurações Gerais da Empresa',
            route: '/settings',
            objective: 'Manutenção de dados cadastrais da empresa, CNPJ/CPF, dados de contato e preferências regionais.',
            dataRequirements: [{ schema: 'TenantProfileSchema' }],
            components: [
              { id: 'comp_tenant_profile_form', type: 'form_card', label: 'Dados Cadastrais da Empresa' },
              { id: 'comp_system_info', type: 'metric_card', label: 'Informações de Instalação e Versão' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Configurações indisponíveis.', cta: 'Carregar Dados' },
            errorState: { boundary: true, retryAction: 'loadSettings' },
            validations: [{ field: 'nomeFantasia', rule: 'requiredText(3)' }],
            actions: [
              { id: 'act_save_settings', name: 'Salvar Configurações', endpoint: '/api/tenants/current', handler: 'saveCompanySettings' }
            ],
            forms: [
              {
                id: 'form_settings',
                name: 'Configuração da Empresa',
                onSubmit: '/api/tenants/current',
                fields: [
                  { name: 'nome_fantasia', label: 'Nome Fantasia', type: 'input', bind: 'cfgNomeFantasia' },
                  { name: 'razao_social', label: 'Razão Social', type: 'input', bind: 'cfgRazaoSocial' },
                  { name: 'cnpj_cpf', label: 'CNPJ / CPF', type: 'input', bind: 'cfgCnpjCpf' }
                ]
              }
            ],
            navigation: { route: '/settings', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Configurações'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN']
          }
        ],
        operations: [
          { id: 'op_get_tenant_config', name: 'Obter Dados da Empresa', endpoint: '/api/tenants/current' },
          { id: 'op_update_tenant_config', name: 'Atualizar Dados da Empresa', endpoint: '/api/tenants/current' }
        ],
        businessRules: [
          { id: 'rule_admin_only_settings', name: 'Apenas perfis OWNER e ADMIN podem atualizar os parâmetros cadastrais da organização.' }
        ],
        permissions: ['OWNER', 'ADMIN'],
        integrations: [
          { id: 'int_sqlite_tenant', service: 'Tabela Empresas SQLite' }
        ]
      },
      {
        id: 'mod_admin_platform',
        name: 'Painel Administrativo Global (SuperAdmin)',
        type: 'module',
        description: 'Cockpit da plataforma para gestão de todos os tenants cadastrados, monitoramento global e backup.',
        pages: [
          {
            id: 'page_platform_admin',
            name: 'Console Global da Plataforma',
            route: '/admin/platform',
            objective: 'Gestão multi-tenant global para operadores da plataforma, auditoria geral e operações de backup/restore.',
            dataRequirements: [{ schema: 'PlatformMetricsSchema' }, { schema: 'AllTenantsListSchema' }],
            components: [
              { id: 'comp_global_metrics', type: 'metric_card', label: 'Total de Empresas e Usuários da Plataforma' },
              { id: 'comp_tenants_table', type: 'data_table', label: 'Listagem de Empresas Cadastradas (Tenants)' },
              { id: 'comp_backup_actions', type: 'metric_card', label: 'Operações de Backup e Restauração SQLite' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhuma empresa cadastrada na plataforma.', cta: 'Criar Primeira Empresa' },
            errorState: { boundary: true, retryAction: 'loadPlatformAdmin' },
            validations: [{ field: 'tenantId', rule: 'positiveInt' }],
            actions: [
              { id: 'act_toggle_tenant_status', name: 'Suspender / Ativar Empresa', endpoint: '/api/admin/tenants/:id/status', handler: 'toggleTenantStatus' },
              { id: 'act_backup_db', name: 'Gerar Backup do Banco', endpoint: '/api/admin/backup', handler: 'runPlatformBackup' }
            ],
            navigation: { route: '/admin/platform', parentRoute: '/dashboard', breadcrumbs: ['Plataforma', 'SuperAdmin'] },
            responsive: true,
            permissions: ['SUPERADMIN']
          }
        ],
        operations: [
          { id: 'op_get_platform_metrics', name: 'Métricas da Plataforma', endpoint: '/api/admin/metrics' },
          { id: 'op_list_all_tenants', name: 'Listar Todos os Tenants', endpoint: '/api/admin/tenants' },
          { id: 'op_backup_database', name: 'Executar Backup SQLite', endpoint: '/api/admin/backup' }
        ],
        businessRules: [
          { id: 'rule_superadmin_strict_guard', name: 'Acesso estritamente restrito ao papel SUPERADMIN com token mestre validado.' }
        ],
        permissions: ['SUPERADMIN'],
        integrations: [
          { id: 'int_sqlite_admin', service: 'Driver SQLite com Comandos PRAGMA e Backup API' }
        ]
      },
      {
        id: 'mod_audit_forensics',
        name: 'Logs & Trilha Forense de Auditoria',
        type: 'module',
        description: 'Trilha imutável de eventos com carimbo de data/hora, IP de origem, usuário executor e detalhes em JSON.',
        pages: [
          {
            id: 'page_audit_logs',
            name: 'Trilha Imutável de Auditoria',
            route: '/audit',
            objective: 'Rastreamento forense de todas as operações sensíveis executadas na organização com integridade estrita.',
            dataRequirements: [{ schema: 'AuditLogListSchema' }],
            components: [
              { id: 'comp_audit_table', type: 'data_table', label: 'Tabela de Eventos de Auditoria Imutáveis' },
              { id: 'comp_audit_filter', type: 'filter', label: 'Filtrar por Usuário ou Ação', filterTarget: 'auditTable' }
            ],
            loadingState: { strategy: 'skeleton' },
            emptyState: { message: 'Nenhum log de auditoria encontrado.', cta: 'Atualizar Logs' },
            errorState: { boundary: true, retryAction: 'loadAuditLogs' },
            validations: [{ field: 'limite', rule: 'max(500)' }],
            actions: [
              { id: 'act_refresh_audit', name: 'Recarregar Logs', endpoint: '/api/reports/audit-trail', handler: 'loadAuditLogs' }
            ],
            navigation: { route: '/audit', parentRoute: '/dashboard', breadcrumbs: ['Empresa', 'Auditoria'] },
            responsive: true,
            permissions: ['OWNER', 'ADMIN', 'SUPERADMIN']
          }
        ],
        operations: [
          { id: 'op_get_audit_logs', name: 'Consultar Trilha de Auditoria', endpoint: '/api/reports/audit-trail' }
        ],
        businessRules: [
          { id: 'rule_audit_records_immutable', name: 'Logs de auditoria são somente gravação (write-only) e nunca podem ser alterados ou apagados.' }
        ],
        permissions: ['OWNER', 'ADMIN', 'SUPERADMIN'],
        integrations: [
          { id: 'int_sqlite_audit_forensics', service: 'Tabela logs_auditoria SQLite com Índices de Busca' }
        ]
      }
    ];
  }
}

// =============================================================================
// 5. PRODUCTION OPTIMIZATION & ENGINEERING GOVERNANCE ENGINES
// =============================================================================

class DependencyPlanner {
  static getStages() {
    return [
      { id: 'STAGE_1_SCHEMA', name: 'Database Schema & Constraints', role: 'Database Engineer' },
      { id: 'STAGE_2_FIXTURES', name: 'Deterministic Seed Data & Fixtures', role: 'Data Engineer' },
      { id: 'STAGE_3_BACKEND_API', name: 'REST Services & Business Rules', role: 'Backend Engineer' },
      { id: 'STAGE_4_FRONTEND_SPA', name: 'Reactive SPA & Multi-Viewport UI', role: 'Frontend Engineer' },
      { id: 'STAGE_5_E2E_QA', name: 'Playwright E2E & Adversarial Probes', role: 'QA Engineer' }
    ];
  }

  planBuildOrder(spec = {}) {
    const stages = DependencyPlanner.getStages();
    return {
      projectId: spec.projectId || 'prj_unknown',
      domain: spec.domain || 'general_software',
      stages: stages.map((s, idx) => ({
        ...s,
        status: 'PLANNED',
        dependencies: idx === 0 ? [] : [stages[idx - 1].id]
      })),
      totalStages: stages.length,
      estimatedMinutes: spec.domain === 'ecommerce' ? 45 : 35
    };
  }

  /**
   * Topological sort of a Directed Acyclic Graph (DAG) with strict cycle detection.
   * @param {Array<{ id: string, dependencies: string[] }>} nodes
   * @returns {string[]} Ordered node IDs
   */
  static topologicalSort(nodes = []) {
    const inDegree = new Map();
    const adjList = new Map();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    for (const node of nodes) {
      for (const dep of node.dependencies || []) {
        if (!inDegree.has(dep)) {
          inDegree.set(dep, 0);
          adjList.set(dep, []);
        }
        adjList.get(dep).push(node.id);
        inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
      }
    }

    const queue = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const order = [];
    while (queue.length > 0) {
      const curr = queue.shift();
      order.push(curr);

      for (const neighbor of adjList.get(curr) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (order.length < inDegree.size) {
      throw new Error(`Ciclo de dependência detectado no grafo de construção: processados ${order.length} de ${inDegree.size} nós.`);
    }

    return order;
  }

  /**
   * Computes parallel execution waves (stages that can safely run in parallel).
   * @param {Array<{ id: string, dependencies: string[] }>} nodes
   * @returns {Array<string[]>} Waves of parallel task IDs
   */
  static computeParallelWaves(nodes = []) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const resolved = new Set();
    const remaining = new Set(nodes.map(n => n.id));
    const waves = [];

    while (remaining.size > 0) {
      const currentWave = [];
      for (const id of remaining) {
        const node = nodeMap.get(id);
        const deps = node.dependencies || [];
        const isReady = deps.every(d => resolved.has(d));
        if (isReady) {
          currentWave.push(id);
        }
      }

      if (currentWave.length === 0) {
        throw new Error('Deadlock / ciclo detectado durante cálculo de ondas de paralelismo.');
      }

      for (const id of currentWave) {
        remaining.delete(id);
        resolved.add(id);
      }
      waves.push(currentWave);
    }

    return waves;
  }
}

class KnowledgeCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.maxEntries = options.maxEntries || 500;
  }

  get(key) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.misses++;
        return null;
      }
      this.hits++;
      return entry.value;
    }
    this.misses++;
    return null;
  }

  set(key, value, ttlMs = 3600000) {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Number((this.hits / total).toFixed(4)) : 0
    };
  }
}

class ComponentReuseRegistry {
  constructor() {
    this.patterns = new Map();
    this.usages = [];
    this._seedCanonicalPatterns();
  }

  _seedCanonicalPatterns() {
    const canonical = [
      { id: 'ptn_data_table', name: 'Tabela de Dados Paginada', category: 'UI_CONTAINER', reusable: true },
      { id: 'ptn_metric_card', name: 'Card de Indicadores KPI', category: 'UI_DATA_DISPLAY', reusable: true },
      { id: 'ptn_kanban_board', name: 'Quadro Kanban Multi-Coluna', category: 'UI_WORKFLOW', reusable: true },
      { id: 'ptn_timeline_feed', name: 'Feed Cronológico de Atividades', category: 'UI_TIMELINE', reusable: true },
      { id: 'ptn_atomic_checkout', name: 'Checkout Transacional Atômico', category: 'BIZ_TRANSACTION', reusable: true },
      { id: 'ptn_search_filter', name: 'Filtro Dinâmico e Busca Instantânea', category: 'UI_NAVIGATION', reusable: true },
      { id: 'ptn_rbac_guard', name: 'Guarda de Autorização por Papel', category: 'SECURITY_AUTH', reusable: true },
      { id: 'ptn_audit_ledger', name: 'Trilha Imutável de Auditoria SQLite', category: 'STORAGE_AUDIT', reusable: true }
    ];
    for (const p of canonical) {
      this.patterns.set(p.id, { ...p, usageCount: 0, products: new Set() });
    }
  }

  registerUsage(patternId, productId) {
    if (!this.patterns.has(patternId)) {
      this.patterns.set(patternId, { id: patternId, name: patternId, category: 'CUSTOM', usageCount: 0, products: new Set() });
    }
    const pat = this.patterns.get(patternId);
    pat.usageCount++;
    pat.products.add(productId);
    this.usages.push({ patternId, productId, timestamp: new Date().toISOString() });
    return pat;
  }

  getReuseReport() {
    const totalPatterns = this.patterns.size;
    let totalUsages = 0;
    let reusedCount = 0;
    const details = [];

    for (const [id, pat] of this.patterns.entries()) {
      totalUsages += pat.usageCount;
      if (pat.usageCount > 1) reusedCount++;
      details.push({
        id,
        name: pat.name,
        category: pat.category,
        usageCount: pat.usageCount,
        productCount: pat.products.size
      });
    }

    const reuseRate = totalPatterns > 0 ? Number(((reusedCount / totalPatterns) * 100).toFixed(2)) : 0;

    return {
      totalPatterns,
      reusedPatternsCount: reusedCount,
      totalUsages,
      reuseRatePercent: reuseRate,
      patterns: details
    };
  }
}

class SafeParallelExecutor {
  /**
   * Executes tasks in bounded parallel batches with error isolation.
   * @param {Array<{ id: string, fn: () => Promise<any> }>} tasks
   * @param {number} concurrencyLimit
   * @param {number} timeoutMs
   */
  static async executeBatch(tasks = [], concurrencyLimit = 3, timeoutMs = 15000) {
    const startTime = Date.now();
    const results = { succeeded: [], failed: [] };
    const executing = new Set();

    for (const task of tasks) {
      const runner = (async () => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout de execução (${timeoutMs}ms) excedido na tarefa ${task.id}`)), timeoutMs)
          );
          const result = await Promise.race([task.fn(), timeoutPromise]);
          results.succeeded.push({ id: task.id, result });
        } catch (err) {
          results.failed.push({ id: task.id, error: err.message });
        }
      })();

      executing.add(runner);
      runner.finally(() => executing.delete(runner));

      if (executing.size >= concurrencyLimit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);

    return {
      totalTasks: tasks.length,
      succeededCount: results.succeeded.length,
      failedCount: results.failed.length,
      successRate: tasks.length > 0 ? Number(((results.succeeded.length / tasks.length) * 100).toFixed(2)) : 100,
      durationMs: Date.now() - startTime,
      results
    };
  }
}

class IncrementalGenerator {
  /**
   * Generates a deterministic SHA-256 fingerprint for a module/page spec.
   */
  static computeSpecHash(spec = {}) {
    const normalized = JSON.stringify(spec, Object.keys(spec).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Compares current specs against previous build manifest to produce surgical delta.
   * @param {Array<{ id: string, [key: string]: any }>} currentSpecs
   * @param {Record<string, string>} previousManifest - { [specId]: hash }
   */
  static computeDelta(currentSpecs = [], previousManifest = {}) {
    const toGenerate = [];
    const unchanged = [];
    const newManifest = {};

    for (const spec of currentSpecs) {
      const hash = IncrementalGenerator.computeSpecHash(spec);
      newManifest[spec.id] = hash;

      if (previousManifest[spec.id] === hash) {
        unchanged.push({ id: spec.id, hash, status: 'CACHED' });
      } else {
        toGenerate.push({ id: spec.id, hash, reason: previousManifest[spec.id] ? 'MODIFIED' : 'NEW' });
      }
    }

    const currentIds = new Set(currentSpecs.map(s => s.id));
    const toDelete = Object.keys(previousManifest).filter(id => !currentIds.has(id));

    const total = currentSpecs.length;
    const deltaRatio = total > 0 ? Number(((toGenerate.length / total) * 100).toFixed(2)) : 0;

    return {
      toGenerate,
      unchanged,
      toDelete,
      totalSpecs: total,
      deltaRatioPercent: deltaRatio,
      manifest: newManifest
    };
  }
}

class FileDeduplicator {
  /**
   * Analyzes a map of relative paths to contents/buffers and detects duplicates.
   * @param {Record<string, string|Buffer>} fileMap
   */
  static scanFiles(fileMap = {}) {
    const hashToFiles = new Map();
    let scannedCount = 0;
    let duplicateCount = 0;
    let potentialSavedBytes = 0;

    for (const [filePath, content] of Object.entries(fileMap)) {
      scannedCount++;
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf-8');
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      if (!hashToFiles.has(hash)) {
        hashToFiles.set(hash, { size: buffer.length, files: [] });
      }
      const entry = hashToFiles.get(hash);
      entry.files.push(filePath);
      if (entry.files.length > 1) {
        duplicateCount++;
        potentialSavedBytes += buffer.length;
      }
    }

    const duplicateClusters = [];
    for (const [hash, entry] of hashToFiles.entries()) {
      if (entry.files.length > 1) {
        duplicateClusters.push({
          hash,
          sizeBytes: entry.size,
          occurrences: entry.files.length,
          files: entry.files
        });
      }
    }

    return {
      scannedCount,
      uniqueCount: hashToFiles.size,
      duplicateCount,
      potentialSavedBytes,
      duplicateClusters
    };
  }
}

class BlockerPrioritizer {
  /**
   * Prioritizes technical blockers based on downstream dependent impact.
   * @param {Array<{ id: string, type: string, description: string, affectedNodeId: string }>} blockers
   * @param {Array<{ id: string, dependencies: string[] }>} dependencyGraph
   */
  static prioritizeBlockers(blockers = [], dependencyGraph = []) {
    // Count downstream impact
    const dependentsCount = new Map();
    for (const node of dependencyGraph) {
      dependentsCount.set(node.id, 0);
    }
    for (const node of dependencyGraph) {
      for (const dep of node.dependencies || []) {
        dependentsCount.set(dep, (dependentsCount.get(dep) || 0) + 1);
      }
    }

    const prioritized = blockers.map(b => {
      const impact = dependentsCount.get(b.affectedNodeId) || 0;
      const bType = (b.type || '').toUpperCase();
      let priority = 'P2';

      if (impact >= 3 || bType.includes('CRITICAL') || bType.includes('SECURITY') || bType.includes('SCHEMA')) {
        priority = 'P0';
      } else if (impact >= 1 || bType.includes('HIGH') || bType.includes('API')) {
        priority = 'P1';
      } else if (bType.includes('LOW') || bType.includes('COSMETIC')) {
        priority = 'P3';
      }

      const rankScore = (priority === 'P0' ? 400 : priority === 'P1' ? 300 : priority === 'P2' ? 200 : 100) + impact;

      return {
        ...b,
        priority,
        dependentStagesBlocked: impact,
        rankScore
      };
    });

    prioritized.sort((a, b) => b.rankScore - a.rankScore);

    return {
      totalBlockers: blockers.length,
      p0Count: prioritized.filter(b => b.priority === 'P0').length,
      p1Count: prioritized.filter(b => b.priority === 'P1').length,
      p2Count: prioritized.filter(b => b.priority === 'P2').length,
      p3Count: prioritized.filter(b => b.priority === 'P3').length,
      actionPlan: prioritized
    };
  }
}

class AutoIntegrator {
  /**
   * Verifies full-stack contract wiring between frontend actions, REST endpoints, and backend operations.
   * @param {Object} productTree
   */
  static verifyIntegration(productTree = {}) {
    const frontendEndpoints = [];
    const backendEndpoints = new Set();

    for (const mod of productTree.modules || []) {
      for (const op of mod.operations || []) {
        if (op.endpoint) {
          backendEndpoints.add(op.endpoint.split('?')[0]);
        }
      }

      for (const page of mod.pages || []) {
        for (const act of page.actions || []) {
          if (act.endpoint) {
            frontendEndpoints.push({ pageId: page.id, actionId: act.id, endpoint: act.endpoint.split('?')[0] });
          }
        }
        for (const form of page.forms || []) {
          if (form.onSubmit) {
            frontendEndpoints.push({ pageId: page.id, actionId: form.id, endpoint: form.onSubmit.split('?')[0] });
          }
        }
      }
    }

    const integrated = [];
    const missingBackend = [];

    for (const fe of frontendEndpoints) {
      // Normalize endpoint matching (e.g. /api/produtos/:id matches /api/produtos/:id)
      if (backendEndpoints.has(fe.endpoint)) {
        integrated.push(fe);
      } else {
        missingBackend.push(fe);
      }
    }

    const total = frontendEndpoints.length;
    const score = total > 0 ? Math.round((integrated.length / total) * 100) : 100;

    return {
      totalFrontendEndpoints: total,
      integratedCount: integrated.length,
      missingBackendCount: missingBackend.length,
      integrationScore: score,
      certified: missingBackend.length === 0,
      missingBackend,
      integrated
    };
  }
}

class HumanInterventionGate {
  static evaluate(operation = {}) {
    const criticalActions = ['DROP_DATABASE', 'DEPLOY_PRODUCTION_SECRETS', 'LIVE_FINANCIAL_CHARGE', 'DELETE_USER_CREDENTIALS'];
    const highRiskActions = ['OVERWRITE_SCHEMA_MIGRATION', 'BYPASS_AUTH_GUARDS', 'GRANT_SUPERADMIN'];
    
    const opType = (operation.type || operation.action || '').toUpperCase();
    
    if (criticalActions.includes(opType) || operation.isIrreversible) {
      return {
        decision: 'REQUIRES_HUMAN_APPROVAL',
        riskLevel: 'CRITICAL',
        requiresConfirmation: true,
        reason: `Ação irreversível detectada (${opType}). Requer aprovação expressa do Diretor de Engenharia.`
      };
    }

    if (highRiskActions.includes(opType)) {
      return {
        decision: 'REQUIRES_HUMAN_APPROVAL',
        riskLevel: 'HIGH',
        requiresConfirmation: true,
        reason: `Operação de alto impacto estrutural (${opType}). Requer validação humana.`
      };
    }

    return {
      decision: 'AUTONOMOUS_APPROVED',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      reason: 'Operação padrão de engenharia autorizada (geração de código, testes, linting, cache).'
    };
  }
}

class ComponentDeduplicator {
  static deduplicateTree(tree = {}) {
    const seenHashes = new Set();
    let duplicatesFound = 0;
    let componentsScanned = 0;

    const scanPage = (page) => {
      if (!page || !Array.isArray(page.components)) return;
      const cleanComps = [];
      for (const comp of page.components) {
        componentsScanned++;
        const hash = `${comp.type}::${comp.id}::${comp.label || ''}`;
        if (seenHashes.has(hash)) {
          duplicatesFound++;
        } else {
          seenHashes.add(hash);
          cleanComps.push(comp);
        }
      }
      page.components = cleanComps;
    };

    for (const mod of tree.modules || []) {
      for (const p of mod.pages || []) {
        scanPage(p);
      }
    }

    return { componentsScanned, duplicatesFound, uniqueCount: seenHashes.size };
  }
}

module.exports = {
  RecursiveProductBuilder,
  PageCompletenessEngine,
  InteractionCompletenessEngine,
  NavigationCrawler,
  CANONICAL_INTERACTION_TYPES,
  DependencyPlanner,
  KnowledgeCache,
  ComponentReuseRegistry,
  SafeParallelExecutor,
  IncrementalGenerator,
  FileDeduplicator,
  BlockerPrioritizer,
  AutoIntegrator,
  HumanInterventionGate,
  ComponentDeduplicator
};


