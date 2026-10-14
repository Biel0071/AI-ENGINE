'use strict';

/**
 * FÊNIX OS — Universal Engineering & Reciprocity Test Suite
 * =========================================================
 * Verifies full compliance with Constitutional Engineering Rule #1:
 * "NENHUMA FEATURE PODE EXISTIR EM APENAS UM LADO DO SISTEMA."
 * 
 * Verifications:
 * 1. FrontendBackendReciprocityEngine: Bidirectional generation & contract audit
 * 2. SystemAbsorptionEngine: Repository ingestion, 4D Genome compilation & report
 * 3. DigitalTwinEngine: Zero-Mock city state projection from measured runtime
 * 4. Autonomous Evolution Loop: Integration with continuous cycle & scoring
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { FrontendBackendReciprocityEngine } = require('../src/software-factory/frontend-backend-reciprocity-engine');
const { SystemAbsorptionEngine } = require('../src/absorption/system-absorption-engine');
const { DigitalTwinEngine } = require('../src/digital-twin/digital-twin-engine');
const { UniversalDigitalTwin } = require('../src/digital-twin/universal-digital-twin');
const { UniversalSystemModel } = require('../src/world-model/universal-system-model');
const { UniversalEngineeringEngine } = require('../src/intelligence/universal-engineering-engine');
const { AutonomousEvolutionController } = require('../src/evolution/autonomous-evolution-controller');
const { handleUniversalSystemRoutes } = require('../src/api/universal-system-routes');

test('RECIPROCITY 1: backendToFrontend produces full-stack reciprocal client, store, and UI', () => {
  const engine = new FrontendBackendReciprocityEngine();

  const backendSpec = {
    serviceName: 'knowledgeSync',
    baseEndpoint: '/api/v2/knowledge',
    routes: [
      { method: 'GET', path: '/status', summary: 'Get Knowledge Sync Status' },
      { method: 'POST', path: '/sync', summary: 'Trigger Instant Knowledge Sync' }
    ]
  };

  const result = engine.backendToFrontend(backendSpec);
  assert.ok(result.reciprocalContracts, 'Must return reciprocal contracts');
  assert.equal(result.reciprocalContracts.totalRoutesBridged, 2);

  // Validate API client code
  assert.ok(result.reciprocalContracts.apiClient.includes('KnowledgeSyncApiClient'));
  assert.ok(result.reciprocalContracts.apiClient.includes('get_status'));
  assert.ok(result.reciprocalContracts.apiClient.includes('post_sync'));

  // Validate State store code
  assert.ok(result.reciprocalContracts.stateStore.includes('KnowledgeSyncStateStore'));
  assert.ok(result.reciprocalContracts.stateStore.includes('subscribe'));

  // Validate UI Markup adhering to Zero-Mock rules
  assert.ok(result.reciprocalContracts.uiMarkup.includes('id="view-knowledgeSync"'));
  assert.ok(result.reciprocalContracts.uiMarkup.includes('—'), 'Initial slot must contain honest absence marker');
  assert.ok(result.reciprocalContracts.uiMarkup.includes('knowledgeSyncStatusBadge'));
});

test('RECIPROCITY 2: frontendToBackend produces reciprocal router, service, and DB schema', () => {
  const engine = new FrontendBackendReciprocityEngine();

  const frontendSpec = {
    moduleName: 'agentOrchestrator',
    viewId: 'view-agents',
    actions: [
      { actionId: 'deployAgent', method: 'POST', endpoint: '/api/v2/agents/deploy' },
      { actionId: 'inspectSwarm', method: 'GET', endpoint: '/api/v2/agents/swarm' }
    ]
  };

  const result = engine.frontendToBackend(frontendSpec);
  assert.ok(result.reciprocalContracts, 'Must return reciprocal contracts');
  assert.equal(result.reciprocalContracts.totalActionsBridged, 2);

  // Validate Router code
  assert.ok(result.reciprocalContracts.router.includes('registerAgentOrchestratorRoutes'));
  assert.ok(result.reciprocalContracts.router.includes('/api/v2/agents/deploy'));

  // Validate Service Layer
  assert.ok(result.reciprocalContracts.service.includes('AgentOrchestratorService'));
  assert.ok(result.reciprocalContracts.service.includes('deployAgent'));

  // Validate DB Schema
  assert.ok(result.reciprocalContracts.dbModel.includes('AgentOrchestratorSchema'));
  assert.ok(result.reciprocalContracts.dbModel.includes('fenix_agentorchestrator_records'));
});

test('RECIPROCITY 3: verifyReciprocity detects balanced vs unbalanced feature contracts', () => {
  const engine = new FrontendBackendReciprocityEngine();

  // 1. Balanced Contract
  const balancedContract = {
    name: 'Autonomous Mission Control',
    frontendActions: [
      { id: 'act_trigger', method: 'POST', endpoint: '/api/v2/autonomous/cycle' },
      { id: 'act_status', method: 'GET', endpoint: '/api/v2/autonomous/dashboard' }
    ],
    backendRoutes: [
      { method: 'POST', path: '/api/v2/autonomous/cycle' },
      { method: 'GET', path: '/api/v2/autonomous/dashboard' }
    ],
    hasPersistence: true,
    hasTests: true
  };

  const balancedAudit = engine.verifyReciprocity(balancedContract);
  assert.equal(balancedAudit.isBalanced, true);
  assert.equal(balancedAudit.status, 'BALANCED');
  assert.equal(balancedAudit.orphanedFrontendActions.length, 0);
  assert.equal(balancedAudit.orphanedBackendRoutes.length, 0);
  assert.equal(balancedAudit.reciprocityScore, 1.0);

  // 2. Unbalanced Contract (Orphaned button with no backend)
  const unbalancedContract = {
    name: 'Broken Visual Feature',
    frontendActions: [
      { id: 'btn_fake_action', method: 'POST', endpoint: '/api/v2/fake/action' }
    ],
    backendRoutes: [],
    hasPersistence: false,
    hasTests: false
  };

  const unbalancedAudit = engine.verifyReciprocity(unbalancedContract);
  assert.equal(unbalancedAudit.isBalanced, false);
  assert.equal(unbalancedAudit.status, 'UNBALANCED');
  assert.equal(unbalancedAudit.orphanedFrontendActions.length, 1);
  assert.ok(unbalancedAudit.reciprocityScore < 0.5);
});

test('ABSORPTION 1: SystemAbsorptionEngine absorbs repository and compiles 4D DNA', async () => {
  const engine = new SystemAbsorptionEngine();
  const repoPath = path.resolve(__dirname, '..');

  const report = await engine.absorbRepository(repoPath, { projectName: 'Fenix_Engine_Test' });
  assert.ok(report, 'Report must be produced');
  assert.equal(report.status, 'ABSORBED');
  assert.ok(report.metrics.totalFiles > 0);
  assert.ok(report.genome, '4D Genome must be compiled');
  assert.ok(report.genome.projectDna);
  assert.ok(report.genome.operationalDna);
  assert.ok(report.genome.visualDna);
  assert.ok(report.genome.agentDna);

  // Verify visual spec absorption
  const visReport = await engine.absorbVisualSpec({
    specName: 'Cockpit Viewport',
    description: 'Central Operator Dashboard'
  });
  assert.ok(visReport.designTokens);
  assert.ok(visReport.fidelityScore > 0.9);

  // Verify summary report
  const summary = engine.generateSystemUnderstandingReport();
  assert.ok(summary.totalSystemsAbsorbed >= 1);
});

test('DIGITAL TWIN: generateCityState derives factual zero-mock state strictly from runtime', () => {
  const twin = new DigitalTwinEngine();

  const liveState = {
    isOnline: true,
    cpuPct: 15.2,
    ramMb: 240,
    workersCount: 3,
    persistence: 'HEALTHY'
  };

  const activeAgents = [
    { id: 'ag.ceo', name: 'Master CEO', currentTask: 'Strategic Direction', status: 'ACTIVE' },
    { id: 'ag.qa', name: 'Inspector QA', currentTask: 'Regression Audit', status: 'INSPECTING' }
  ];

  const cityState = twin.generateCityState(liveState, activeAgents);
  assert.equal(cityState.systemStatus, 'ONLINE');
  assert.equal(cityState.buildingsCount, 5);
  assert.equal(cityState.activeNpcCount, 2);
  assert.equal(cityState.npcs[0].name, 'Master CEO');
  assert.equal(cityState.npcs[1].name, 'Inspector QA');
  assert.ok(cityState.measuredMemoryMb > 0, 'Must contain real heap measurement');
});

test('ENDPOINTS: Universal System Routes handles reciprocity and digital-twin endpoints', async () => {
  // Helper to simulate request / response
  function createReq(method, path, body = null) {
    return {
      method,
      headers: { 'content-type': 'application/json' },
      url: path,
      [Symbol.asyncIterator]: async function* () {
        if (body) yield Buffer.from(JSON.stringify(body));
      }
    };
  }

  function createRes() {
    let statusCode = null;
    let headers = {};
    let data = null;
    return {
      writeHead: (code, hdrs) => { statusCode = code; headers = hdrs; },
      setHeader: (k, v) => { headers[k] = v; },
      end: (payload) => { data = payload ? JSON.parse(payload) : null; },
      get result() { return { statusCode, data }; }
    };
  }

  const sendJson = (res, code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return true;
  };
  const readJson = async (req) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    return JSON.parse(body || '{}');
  };

  // 1. Test POST /api/v2/engineering/reciprocity/verify
  {
    const req = createReq('POST', '/api/v2/engineering/reciprocity/verify', {
      name: 'Test Endpoint Reciprocity',
      frontendActions: [{ id: 'a1', method: 'GET', endpoint: '/api/v2/test' }],
      backendRoutes: [{ method: 'GET', path: '/api/v2/test' }],
      hasPersistence: true,
      hasTests: true
    });
    const res = createRes();
    const url = new URL('http://localhost' + req.url);
    const handled = await handleUniversalSystemRoutes(req, res, url, sendJson, readJson, { tenantId: 'grg', actorId: 'admin' }, {});
    assert.equal(handled, true, 'Route must be handled');
    assert.equal(res.result.statusCode, 200);
    assert.equal(res.result.data.ok, true);
    assert.equal(res.result.data.audit.status, 'BALANCED');
  }

  // 2. Test GET /api/v2/digital-twin/city-state
  {
    const req = createReq('GET', '/api/v2/digital-twin/city-state');
    const res = createRes();
    const url = new URL('http://localhost' + req.url);
    const handled = await handleUniversalSystemRoutes(req, res, url, sendJson, readJson, { tenantId: 'grg', actorId: 'admin' }, {});
    assert.equal(handled, true, 'Route must be handled');
    assert.equal(res.result.statusCode, 200);
    assert.equal(res.result.data.ok, true);
    assert.equal(res.result.data.cityState.systemStatus, 'ONLINE');
    assert.ok(res.result.data.cityState.measuredMemoryMb > 0);
  }
});

test('UNIVERSAL SYSTEM MODEL: tracks entities, builds topology, and computes impact analysis', () => {
  const model = new UniversalSystemModel();

  // 1. Register components
  model.registerEntity('PROJECT', 'prj.core', { name: 'Core Engine' });
  model.registerEntity('API', 'api.chat', { path: '/api/v2/chat' });
  model.registerEntity('COMPONENT', 'comp.chat_box', { name: 'ChatBox' });
  model.registerEntity('DATABASE', 'db.postgres', { host: '172.20.0.2' });

  // 2. Connect entities
  model.connectEntities('prj.core', 'EXPOSES', 'api.chat');
  model.connectEntities('comp.chat_box', 'USES', 'api.chat');
  model.connectEntities('api.chat', 'DEPENDS_ON', 'db.postgres');

  // 3. Impact analysis: If api.chat changes, what is affected?
  const impact = model.computeImpactAnalysis('api.chat');
  assert.equal(impact.targetEntity, 'api.chat');
  assert.ok(impact.totalAffected >= 2);
  const affectedIds = impact.affectedEntities.map(e => e.id);
  assert.ok(affectedIds.includes('comp.chat_box'));
  assert.ok(affectedIds.includes('db.postgres'));

  // 4. Snapshot
  const snapshot = model.getSystemSnapshot();
  assert.ok(snapshot.stats.totalNodes >= 4);
  assert.ok(snapshot.stats.totalEdges >= 3);
});

test('UNIVERSAL ENGINEERING ENGINE: executes the 7-step engineering loop', async () => {
  const engine = new UniversalEngineeringEngine();

  // 1. UNDERSTAND
  const understanding = await engine.understand({
    title: 'Instant Task Inspector',
    description: 'Inspect running jobs and trace memory'
  });
  assert.equal(understanding.type, 'CONCEPTUAL_SPEC');
  assert.equal(understanding.title, 'Instant Task Inspector');

  // 2. PLAN
  const plan = engine.plan(understanding);
  assert.equal(plan.isFullStack, true);
  assert.equal(plan.tasks.length, 6);

  // 3. GENERATE
  const generated = engine.generate({
    name: 'TaskInspector',
    actions: [{ actionId: 'inspectJob', method: 'GET' }]
  });
  assert.ok(generated.backend.router.includes('registerTaskInspectorRoutes'));
  assert.ok(generated.frontend.apiClient.includes('TaskInspectorApiClient'));
  assert.equal(generated.reciprocityAudit.isBalanced, true);

  // 4. MODIFY
  const mutation = engine.modify('const status = "—";', {
    targetPattern: '—',
    replacement: 'MEASURED'
  });
  assert.equal(mutation.success, true);
  assert.equal(mutation.modifiedCode, 'const status = "MEASURED";');

  // 5. TEST
  const testOutcome = await engine.test(async () => ({ passed: true, score: 1.0 }));
  assert.equal(testOutcome.passed, true);

  // 6. VALIDATE
  const validation = engine.validate({
    reciprocityAudit: generated.reciprocityAudit,
    backend: generated.backend,
    frontend: generated.frontend,
    testResults: testOutcome
  });
  assert.equal(validation.isCertified, true);
  assert.equal(validation.status, 'CERTIFIED_SUCCESS');

  // 7. LEARN
  const learning = engine.learn({ feature: 'TaskInspector' });
  assert.equal(learning.learned, true);
  assert.ok(learning.patternRegistered.startsWith('pat_taskinspector'));
});

test('UNIVERSAL DIGITAL TWIN: connects all 5 districts to Isometric City model', () => {
  const twin = new UniversalDigitalTwin();

  const cityModel = twin.getLivingCityModel();
  assert.equal(cityModel.version, '10.0.0');
  assert.equal(cityModel.systemStatus, 'ONLINE');
  assert.ok(cityModel.districts.frontend.activeViewsCount >= 14);
  assert.ok(cityModel.districts.backend.status === 'ONLINE');
  assert.ok(cityModel.districts.data.postgres === true);
  assert.ok(cityModel.cityState.buildings.length >= 5);
  assert.ok(cityModel.telemetry.heapMemoryMb > 0);

  // Test external observation update
  twin.updateFromVpsObservation({
    system: 'ONLINE',
    persistence: 'HEALTHY'
  });
  assert.equal(twin.liveTelemetry.isOnline, true);
});

test('AUTONOMOUS EVOLUTION CONTROLLER: coordinates the 8-step self-improvement loop', async () => {
  const controller = new AutonomousEvolutionController();

  // 1. OBSERVE
  const observation = await controller.observe({ isOnline: true, persistence: 'HEALTHY' });
  assert.equal(observation.isOnline, true);
  assert.ok(observation.heapUsedMb > 0);

  // 2. DETECT: inject an unbalanced contract
  const brokenContract = {
    name: 'Broken Capability',
    frontendActions: [{ id: 'orphan_btn', method: 'POST', endpoint: '/api/v2/unimplemented' }],
    backendRoutes: []
  };
  const detection = controller.detect(observation, [brokenContract]);
  assert.equal(detection.hasGaps, true);
  assert.equal(detection.findings[0].type, 'UNBALANCED_RECIPROCITY');

  // 3. PLAN
  const plan = controller.plan(detection);
  assert.equal(plan.plannedCount, 1);
  const mission = plan.missions[0];
  assert.ok(mission.id);

  // 4. EXECUTE
  const execution = await controller.execute(mission, async (m) => {
    return { appliedReciprocity: true, missionId: m.id };
  });
  assert.equal(execution.success, true);
  assert.ok(execution.checkpointId);

  // 5. VALIDATE
  const validation = await controller.validate(execution, async () => ({ passed: true }));
  assert.equal(validation.passed, true);
  assert.equal(validation.shouldPromote, true);

  // 6. LEARN
  const learning = await controller.learn(mission, validation);
  assert.equal(learning.learned, true);

  // 7. PROMOTE
  const promotion = controller.promote(execution);
  assert.equal(promotion.status, 'PROMOTED');

  // 8. ROLLBACK test
  const rollbackExecution = { checkpointId: 'chk_fake', missionId: 'mis_failed' };
  const rollbackResult = controller.rollback(rollbackExecution);
  assert.equal(rollbackResult.status, 'ROLLED_BACK');
});

test('RECIPROCITY 11: operations-live and index.html expose canonical reciprocity UI controls', () => {
  const fs = require('node:fs');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const opsLiveJs = fs.readFileSync(path.join(__dirname, '../public/operations-live.js'), 'utf8');

  // Verify index.html contains the Reciprocidade tab
  assert.ok(indexHtml.includes("window.fenixSelectOpsTab('reciprocity')"), 'index.html must have reciprocity pill tab');
  assert.ok(indexHtml.includes('>Reciprocidade</button>'), 'index.html must label the reciprocity tab');

  // Verify operations-live.js contains reciprocity handling
  assert.ok(opsLiveJs.includes("['reciprocity', 'Reciprocidade & Engenharia']"), 'operations-live.js must list reciprocity tab');
  assert.ok(opsLiveJs.includes('renderReciprocity'), 'operations-live.js must define renderReciprocity');
  assert.ok(opsLiveJs.includes('/api/v2/engineering/reciprocity/verify'), 'operations-live.js must fetch reciprocity verify endpoint');
  assert.ok(opsLiveJs.includes('/api/v2/digital-twin/city-state'), 'operations-live.js must fetch digital-twin city-state endpoint');
  assert.ok(opsLiveJs.includes('/api/v2/engineering/absorption/report'), 'operations-live.js must fetch absorption report endpoint');
  assert.ok(opsLiveJs.includes('Regra Constitucional Nº 1: Reciprocidade Full-Stack'), 'UI must display Constitutional Rule #1 banner');
});



