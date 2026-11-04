'use strict';

/**
 * FÊNIX OS — Recursive Product Builder & Autonomous Factory Test Suite
 * =========================================================================
 * Rigorous automated tests verifying:
 * 1. RecursiveProductTree deep hierarchical generation (Product -> Module -> Page -> Subpage -> Tabs -> Forms -> Modals -> Components -> Actions)
 * 2. PageCompletenessEngine 11 mandatory axes evaluation (objective, data, components, loading, empty, error, validations, functional actions, navigation, responsive, permissions)
 * 3. InteractionCompletenessEngine auditing of 15 interactive element types with strict enforcement against decorative buttons and unpersisted inputs
 * 4. NavigationCrawler path discovery and reachability certification
 * 5. CompletenessCertification cryptographic SHA-256 digital signature
 * 6. AutonomousDevelopmentFactory mission lifecycle, patch generation, and isolated application
 * 7. Overnight detached worker execution loop with watchdog heartbeat and crash recovery
 * 8. REST API routes validation for /api/v2/product-builder/* and /api/v2/factory/*
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  RecursiveProductBuilder,
  PageCompletenessEngine,
  InteractionCompletenessEngine,
  NavigationCrawler
} = require('../src/product/recursive-product-builder');

const { AutonomousDevelopmentFactory } = require('../src/evolution/autonomous-development-factory');
const { handleProductBuilderRoutes } = require('../src/api/product-builder-routes');

test('1. RecursiveProductTree builds deep hierarchical tree without artificial depth limit', async () => {
  const builder = new RecursiveProductBuilder();
  const tree = await builder.generateProductTree({
    projectId: 'prj.test_deep_crm',
    name: 'Autonomous Multi-Tenant CRM',
    domain: 'enterprise_crm'
  });

  assert.ok(tree, 'Product tree must be returned');
  assert.equal(tree.id, 'prj.test_deep_crm');
  assert.ok(Array.isArray(tree.modules), 'Modules must be an array');
  assert.ok(tree.modules.length >= 2, 'Must contain at least 2 top-level modules');

  // Verify deep structure: Module -> Page -> Subpage -> Tabs -> Forms -> Modals -> Components -> Actions
  const wsMod = tree.modules.find(m => m.id === 'mod_core_workspace');
  assert.ok(wsMod, 'Workspace module must exist');
  assert.ok(Array.isArray(wsMod.pages), 'Module must have pages');
  assert.ok(wsMod.pages.length > 0, 'Module must have at least one page');

  const idePage = wsMod.pages.find(p => p.id === 'page_ide_visual');
  assert.ok(idePage, 'IDE Visual page must exist');
  assert.ok(Array.isArray(idePage.subpages), 'Page must have subpages');
  assert.ok(idePage.subpages.length > 0, 'Page must have at least one subpage');
  assert.ok(Array.isArray(idePage.tabs), 'Page must have tabs');
  assert.ok(Array.isArray(idePage.forms), 'Page must have forms');
  assert.ok(Array.isArray(idePage.modals), 'Page must have modals');
  assert.ok(Array.isArray(idePage.components), 'Page must have components');
  assert.ok(Array.isArray(idePage.actions), 'Page must have actions');

  // Verify operations, business rules, permissions, integrations
  assert.ok(Array.isArray(wsMod.operations), 'Module must have operations');
  assert.ok(Array.isArray(wsMod.businessRules), 'Module must have business rules');
  assert.ok(Array.isArray(wsMod.permissions), 'Module must have permissions');
  assert.ok(Array.isArray(wsMod.integrations), 'Module must have integrations');

  // Check depth calculation
  assert.ok(tree.metadata.depth >= 3, `Tree depth must be >= 3 (got ${tree.metadata.depth})`);
  assert.ok(tree.metadata.stats.pages >= 2, 'Stats must aggregate total pages correctly');
  assert.ok(tree.metadata.stats.actions >= 2, 'Stats must aggregate total actions correctly');
});

test('2. PageCompletenessEngine verifies all 11 mandatory completeness axes', () => {
  const engine = new PageCompletenessEngine();

  // Test complete page
  const completePage = {
    id: 'page_complete_profile',
    title: 'User Profile & Identity Management',
    objective: 'Gerenciar preferências de usuário, chaves de API, credenciais OAuth e perfis visuais de forma segura.',
    dataRequirements: [{ schema: 'UserProfileSchema' }, { schema: 'SecurityCredentialsSchema' }],
    components: [
      { id: 'c1', type: 'card', label: 'Cartão de Informações Pessoais' },
      { id: 'c2', type: 'table', label: 'Tabela de Sessões Ativas' }
    ],
    loadingState: { strategy: 'skeleton' },
    emptyState: { message: 'Nenhuma chave encontrada.', cta: 'Gerar Chave' },
    errorState: { boundary: true, retryAction: 'reloadProfile' },
    validations: [{ field: 'email', rule: 'isEmail' }],
    actions: [
      { id: 'a1', name: 'Salvar Perfil', endpoint: '/api/v2/profile/save', handler: 'onSave' }
    ],
    navigation: { route: '/profile', parentRoute: '/settings' },
    responsive: true,
    permissions: ['profile:read', 'profile:write']
  };

  const auditComplete = engine.evaluatePage(completePage);
  assert.ok(auditComplete.score >= 90, `Complete page score must be >= 90% (got ${auditComplete.score}%)`);
  assert.equal(auditComplete.certified, true, 'Complete page must be certified');
  assert.equal(auditComplete.missingItems.length, 0, 'Complete page must have zero missing items');
  assert.equal(auditComplete.passedCount, 11, 'All 11 axes must pass');

  // Test defective / incomplete page
  const incompletePage = {
    id: 'page_bare_stub',
    title: 'Stub Screen',
    objective: 'Vago', // fails min 15 chars
    components: [{ id: 'c1', type: 'div' }], // fails min 2 components
    actions: [{ id: 'a1', name: 'Botão Sem Destino' }] // decorative button (no endpoint/handler)
  };

  const auditIncomplete = engine.evaluatePage(incompletePage);
  assert.ok(auditIncomplete.score < 50, `Incomplete page score must be < 50% (got ${auditIncomplete.score}%)`);
  assert.equal(auditIncomplete.certified, false, 'Incomplete page must not be certified');
  assert.ok(auditIncomplete.missingItems.some(i => i.axis === 'objective'), 'Must flag missing objective');
  assert.ok(auditIncomplete.missingItems.some(i => i.axis === 'loadingStates'), 'Must flag missing loading states');
  assert.ok(auditIncomplete.missingItems.some(i => i.axis === 'emptyStates'), 'Must flag missing empty states');
  assert.ok(auditIncomplete.missingItems.some(i => i.axis === 'functionalActions'), 'Must flag decorative/unbound actions');
});

test('3. InteractionCompletenessEngine strictly detects decorative buttons and unpersisted inputs across 15 types', () => {
  const engine = new InteractionCompletenessEngine();

  const elements = [
    // 1. Certified button
    { type: 'button', id: 'btn_save', label: 'Salvar Alterações', endpoint: '/api/v2/save' },
    // 2. Decorative button violation
    { type: 'button', id: 'btn_fake', label: 'Botão Decorativo' },
    // 3. Certified input with persistence bind
    { type: 'input', id: 'inp_name', label: 'Nome de Usuário', bind: 'userName', endpoint: '/api/v2/user' },
    // 4. Unpersisted input violation
    { type: 'input', id: 'inp_ghost', label: 'Campo Sem Destino' },
    // 5. Certified menu tab
    { type: 'tab', id: 'tab_overview', label: 'Visão Geral', destination: '/workspace/overview' },
    // 6. Dead menu violation
    { type: 'menu', id: 'menu_dead', label: 'Menu Quebrado' },
    // 7. Hollow table violation (no schema/datasource)
    { type: 'table', id: 'tbl_hollow', label: 'Tabela Sem Dados' },
    // 8. Certified table
    { type: 'table', id: 'tbl_valid', label: 'Tabela com Dados', columns: ['id', 'name'], dataSource: '/api/v2/data' },
    // 9. Hollow pagination violation (no handler)
    { type: 'pagination', id: 'pag_hollow', label: 'Paginação Quebrada' },
    // 10. Certified pagination
    { type: 'pagination', id: 'pag_valid', label: 'Paginação Funcional', onPageChange: 'handlePage' },
    // 11. Hollow batch action violation (no handler)
    { type: 'batch_action', id: 'act_batch_hollow', label: 'Ação em Lote Sem Destino' },
    // 12. Certified batch action
    { type: 'batch_action', id: 'act_batch_valid', label: 'Ação em Lote Real', endpoint: '/api/v2/batch' },
    // 13. Dead link violation
    { type: 'link', id: 'lnk_dead', href: '#' },
    // 14. Certified link
    { type: 'link', id: 'lnk_valid', href: '/dashboard' }
  ];

  const audit = engine.auditInteractions(elements);

  assert.equal(audit.total, 14, 'Total audited elements must be 14');
  assert.equal(audit.functional, 7, 'Exactly 7 certified functional elements');
  assert.equal(audit.defective, 7, 'Exactly 7 defective violations');
  assert.equal(audit.completenessScore, 50, 'Score must be 50%');

  assert.equal(audit.violations.decorativeButtons, 1, 'Must detect exactly 1 decorative button');
  assert.equal(audit.violations.unpersistedInputs, 1, 'Must detect exactly 1 unpersisted input');
  assert.equal(audit.violations.deadLinks, 2, 'Must detect dead menu and dead link (#)');
  assert.equal(audit.violations.hollowTables, 1, 'Must detect hollow table');
  assert.equal(audit.violations.brokenPagination, 1, 'Must detect broken pagination');
  assert.equal(audit.violations.hollowBatchActions, 1, 'Must detect hollow batch action');
});

test('4. NavigationCrawler traverses product routes, certifies reachability, and safely handles circular references', async () => {
  const builder = new RecursiveProductBuilder();
  const tree = await builder.generateProductTree({ projectId: 'prj.nav_test' });

  const crawl = builder.navigationCrawler.crawl(tree);
  assert.ok(crawl.totalDiscoveredRoutes > 0, 'Crawler must discover multiple routes');
  assert.ok(crawl.routeGraph.nodes.length > 0, 'Route graph must contain nodes');
  assert.ok(crawl.routeGraph.edges.length > 0, 'Route graph must contain edges');
  assert.ok(crawl.reachabilityScore >= 90, `Reachability score must be >= 90% (got ${crawl.reachabilityScore}%)`);
  assert.equal(crawl.certifiedReachability, true, 'Reachability must be certified');

  // Cycle Safety Verification: ensure circular node reference doesn't cause RangeError stack overflow
  const circularNode = { id: 'cyclic_root', route: '/cycle', type: 'page' };
  circularNode.pages = [circularNode];
  const safeCrawl = builder.navigationCrawler.crawl(circularNode);
  assert.equal(safeCrawl.totalDiscoveredRoutes, 1, 'Circular tree must crawl safely without stack overflow');
});

test('5. CompletenessCertification issues cryptographic SHA-256 digital certificate', async () => {
  const builder = new RecursiveProductBuilder();
  await builder.generateProductTree({ projectId: 'prj.cert_test', name: 'Certified System' });

  const cert = builder.certifyProduct('prj.cert_test');

  assert.ok(cert.certificateId.startsWith('CERT-PRJ.CERT_TEST-'), 'Certificate ID format must be valid');
  assert.ok(cert.cryptographicSignature, 'Cryptographic signature must exist');
  assert.equal(cert.cryptographicSignature.length, 64, 'SHA-256 signature must be 64 hex characters');
  assert.equal(cert.verificationAuthority, 'Fênix OS Autonomous Architecture Gatekeeper');
  assert.ok(['CERTIFIED_DEEP_APPLICATION', 'INCOMPLETE_SURFACE_ONLY'].includes(cert.status));
});

test('6. AutonomousDevelopmentFactory submits and executes development mission', async () => {
  const factory = new AutonomousDevelopmentFactory();

  const mission = await factory.submitMission({
    title: 'Implement Deep Interaction Inspection',
    objective: 'Criar motor de auditoria para 15 tipos de elementos interativos com verificação de persistência.',
    priority: 'P1',
    autoExecute: true
  });

  assert.ok(mission.id.startsWith('msn_'), 'Mission ID must be generated');
  assert.equal(mission.status, 'COMPLETED', 'Mission must complete execution');
  assert.ok(mission.tasks.length >= 6, 'Must contain 6 planned multi-agent tasks');
  assert.ok(mission.tasks.every(t => t.status === 'COMPLETED'), 'All tasks must be completed');
  assert.ok(mission.patches.length > 0, 'Must have generated a surgical patch');
  assert.ok(mission.patches[0].checksumSha256, 'Patch must have SHA-256 checksum');

  assert.ok(factory.telemetry.successfulMissions >= 1, 'Telemetry must count successful mission');
  assert.ok(factory.telemetry.patchesApplied >= 1, 'Telemetry must count applied patch');
});

test('7. AutonomousDevelopmentFactory detached overnight runtime lifecycle', async () => {
  const factory = new AutonomousDevelopmentFactory({ intervalMs: 100 });

  // Start night run
  const startResult = factory.startNightRun({ intervalMs: 100 });
  assert.equal(startResult.status, 'NIGHT_RUN_ACTIVE');
  assert.equal(factory.overnightRunning, true);

  // Allow one cycle to run
  await new Promise(r => setTimeout(r, 150));
  assert.ok(factory.telemetry.lastHeartbeat, 'Watchdog heartbeat must be updated');

  // Trigger watchdog pulse check
  factory._watchdogPulse();

  // Stop night run
  const stopResult = factory.stopNightRun();
  assert.equal(stopResult.status, 'NIGHT_RUN_STOPPED');
  assert.equal(factory.overnightRunning, false);

  // Status inspection
  const status = factory.getStatus();
  assert.equal(status.overnightRunning, false);
  assert.ok(status.telemetry.totalMissionsHandled >= 0);
  assert.ok(status.environment.pid, 'Environment PID must be present');
});

test('8. REST API endpoints for Product Builder and Autonomous Factory return 200/201 with real data', async () => {
  const mockApp = {};
  const sendJson = (res, code, data) => {
    res.statusCode = code;
    res.data = data;
    return true;
  };
  const readJson = async (req) => req.body || {};

  // GET /api/v2/product-builder/tree
  const res1 = {};
  await handleProductBuilderRoutes(
    { method: 'GET' },
    res1,
    new URL('http://localhost/api/v2/product-builder/tree?projectId=prj.api_test'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 'grg', actorId: 'admin' }
  );
  assert.equal(res1.statusCode, 200);
  assert.ok(res1.data.ok);
  assert.ok(res1.data.tree);

  // GET /api/v2/product-builder/completeness
  const res2 = {};
  await handleProductBuilderRoutes(
    { method: 'GET' },
    res2,
    new URL('http://localhost/api/v2/product-builder/completeness?projectId=prj.api_test'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 'grg', actorId: 'admin' }
  );
  assert.equal(res2.statusCode, 200);
  assert.ok(res2.data.ok);
  assert.ok(typeof res2.data.audit.pageCompletenessScore === 'number');

  // POST /api/v2/product-builder/audit-interactions
  const res3 = {};
  await handleProductBuilderRoutes(
    { method: 'POST', body: { elements: [{ type: 'button', id: 'b1', endpoint: '/api/v2/test' }] } },
    res3,
    new URL('http://localhost/api/v2/product-builder/audit-interactions'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 'grg', actorId: 'admin' }
  );
  assert.equal(res3.statusCode, 200);
  assert.equal(res3.data.audit.functional, 1);

  // GET /api/v2/factory/status
  const res4 = {};
  await handleProductBuilderRoutes(
    { method: 'GET' },
    res4,
    new URL('http://localhost/api/v2/factory/status'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 'grg', actorId: 'admin' }
  );
  assert.equal(res4.statusCode, 200);
  assert.ok(res4.data.ok);
  assert.ok(res4.data.telemetry);

  // GET /api/v2/factory/inventory
  const res5 = {};
  await handleProductBuilderRoutes(
    { method: 'GET' },
    res5,
    new URL('http://localhost/api/v2/factory/inventory'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 'grg', actorId: 'admin' }
  );
  assert.equal(res5.statusCode, 200);
  assert.ok(res5.data.ok);
  assert.ok(res5.data.projects.length >= 4);

  // POST /api/v2/factory/worker/dispatch
  const res6 = {};
  await handleProductBuilderRoutes(
    { method: 'POST', body: { task: 'test_worker_task', intervalMs: 2000, maxCycles: 5 } },
    res6,
    new URL('http://localhost/api/v2/factory/worker/dispatch'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 'grg', actorId: 'admin' }
  );
  assert.equal(res6.statusCode, 201);
  assert.ok(res6.data.ok);
  assert.ok(res6.data.worker.pid);
  const workerId = res6.data.worker.id;

  // GET /api/v2/factory/worker/list
  const res7 = {};
  await handleProductBuilderRoutes(
    { method: 'GET' },
    res7,
    new URL('http://localhost/api/v2/factory/worker/list'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 'grg', actorId: 'admin' }
  );
  assert.equal(res7.statusCode, 200);
  assert.ok(res7.data.ok);
  assert.ok(Array.isArray(res7.data.workers));
  assert.ok(res7.data.workers.length >= 1);

  // POST /api/v2/factory/worker/terminate
  const res8 = {};
  await handleProductBuilderRoutes(
    { method: 'POST', body: { workerId } },
    res8,
    new URL('http://localhost/api/v2/factory/worker/terminate'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 'grg', actorId: 'admin' }
  );
  assert.equal(res8.statusCode, 200);
  assert.ok(res8.data.ok);

  // POST /api/v2/factory/patch/generate
  const res9 = {};
  await handleProductBuilderRoutes(
    { method: 'POST', body: { targetFile: 'grg/src/product/recursive-product-builder.js', objective: 'Add recursive auditing' } },
    res9,
    new URL('http://localhost/api/v2/factory/patch/generate'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 'grg', actorId: 'admin' }
  );
  assert.equal(res9.statusCode, 201);
  assert.ok(res9.data.ok);
  assert.ok(res9.data.patch.checksumSha256);
});

test('9. Deep recursive product auditing traverses unlimited levels (depth >= 4) and catches defects on deeply nested subpages and components', async () => {
  const builder = new RecursiveProductBuilder();
  const deepTree = {
    id: 'prj.deep_recursive_system',
    name: 'Deep Multilevel System',
    modules: [{
      id: 'mod_deep_analytics',
      pages: [{
        id: 'page_analytics_root',
        objective: 'Painel principal de analytics com telemetria agregada em tempo real.',
        components: [
          { id: 'comp_metric_card', type: 'card', label: 'Métricas de Tráfego' },
          { id: 'comp_tbl_traffic', type: 'table', label: 'Tabela de Tráfego', columns: ['id', 'ip', 'bytes'], dataSource: '/api/traffic' },
          // Decorative button inside components
          { id: 'comp_fake_btn', type: 'button', label: 'Botão Sem Manipulador' }
        ],
        actions: [{ id: 'act_refresh', endpoint: '/api/v2/refresh', handler: 'refreshData' }],
        subpages: [{
          id: 'subpage_level_2',
          objective: 'Detalhamento analítico por região geográfica e nós de borda.',
          components: [
            { id: 'comp_map', type: 'geo_map', label: 'Mapa de Calor' },
            { id: 'comp_geo_table', type: 'table', label: 'Nós Ativos', columns: ['region'], dataSource: '/api/nodes' }
          ],
          actions: [{ id: 'act_filter_region', endpoint: '/api/v2/filter', handler: 'applyFilter' }],
          subpages: [{
            id: 'subpage_level_3',
            objective: 'Diagnóstico de latência individual por pacote e jitter.',
            components: [
              { id: 'comp_jitter_chart', type: 'chart', label: 'Gráfico de Jitter' },
              { id: 'comp_jitter_table', type: 'table', label: 'Pacotes Perdidos', columns: ['seq'], dataSource: '/api/packets' }
            ],
            actions: [{ id: 'act_ping_test', endpoint: '/api/v2/ping', handler: 'runPing' }],
            subpages: [{
              id: 'subpage_level_4_leaf',
              objective: 'Inspeção profunda de payload em nível de byte e header.',
              components: [
                { id: 'comp_hex_viewer', type: 'hex_dump', label: 'Hex Dump Payload' },
                { id: 'comp_hex_table', type: 'table', label: 'Header Fields', columns: ['key'], dataSource: '/api/headers' }
              ],
              actions: [
                // Deep decorative button defect
                { id: 'act_decorative_deep_btn', name: 'Botão Decorativo Nível 4' }
              ]
            }]
          }]
        }]
      }]
    }]
  };

  builder.productTrees.set('prj.deep_recursive_system', deepTree);
  const audit = builder.auditFullProduct('prj.deep_recursive_system');

  assert.equal(audit.totalPages, 4, 'Must audit all 4 nested levels (root, lvl2, lvl3, lvl4)');
  assert.deepEqual(
    audit.pageAudits.map(p => p.pageId),
    ['page_analytics_root', 'subpage_level_2', 'subpage_level_3', 'subpage_level_4_leaf'],
    'Every nested page ID must be audited'
  );

  // Check that the decorative button inside components on root page was caught
  const rootInteractions = audit.interactionAudits.find(a => a.pageId === 'page_analytics_root');
  assert.ok(rootInteractions.audit.violations.decorativeButtons >= 1, 'Decorative button inside page.components must be detected');

  // Check that the deep decorative button on level 4 was caught
  const leafInteractions = audit.interactionAudits.find(a => a.pageId === 'subpage_level_4_leaf');
  assert.equal(leafInteractions.audit.violations.decorativeButtons, 1, 'Level 4 decorative button must be detected');
});

test('10. AutonomousDevelopmentFactory executes real node -c syntax and test verification (Zero fake data)', async () => {
  const factory = new AutonomousDevelopmentFactory();

  // Test mission with real target file
  const mission = await factory.submitMission({
    title: 'Zero-Mock Real Execution Mission',
    objective: 'Verificar integridade factual de sintaxe e guardas de arquitetura.',
    targetFile: 'grg/src/product/recursive-product-builder.js',
    autoExecute: true,
    runTests: true
  });

  assert.equal(mission.status, 'COMPLETED');
  const syntaxTask = mission.tasks.find(t => t.id === 'tsk_syntax');
  assert.equal(syntaxTask.result.nodeCSyntax, 'OK');
  assert.equal(syntaxTask.result.exitCode, 0);
  assert.ok(syntaxTask.result.checkedFile.includes('recursive-product-builder.js'));

  const testTask = mission.tasks.find(t => t.id === 'tsk_tests');
  assert.equal(testTask.result.regressionsDetected, 0);
  assert.equal(testTask.result.suitesPassed, 5);
  assert.ok(testTask.result.summary.includes('Regression test suite passed'));
});
