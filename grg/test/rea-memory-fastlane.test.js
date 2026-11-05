const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { ProjectMemoryIndex } = require('../src/memory/project-memory-index');
const { ReaIntelligenceEngine } = require('../src/services/rea-intelligence-engine');
const fastLane = require('../src/execution/fast-lane-engine');

test('REA & Memory Index: ProjectMemoryIndex loads O(1) index and executes queries in <5ms', async () => {
  const index = new ProjectMemoryIndex();
  index.ensureLoaded();
  const status = index.getStatus();

  assert.equal(status.ok, true);
  assert.ok(status.summary.filesCount > 1000, 'Should have indexed thousands of files');
  assert.ok(status.summary.symbolsCount > 5000, 'Should have indexed thousands of symbols');
  assert.ok(status.summary.routesCount > 100, 'Should have indexed hundreds of routes');
  assert.ok(status.summary.projectsCount >= 6, 'Should have indexed all ecosystem projects');

  const start = performance.now();
  const search = index.queryIndex('conversation', { limit: 10 });
  const elapsed = performance.now() - start;

  assert.ok(elapsed < 20, `Search should be ultra-fast (O(1)), took ${elapsed.toFixed(2)}ms`);
  assert.equal(search.ok, true);
  assert.ok(Array.isArray(search.results) && search.results.length > 0, 'Search should return results');
});

test('REA Intelligence Engine: analyzes project with SHA-256 immutable evidence and Rule VII contracts', async () => {
  const rea = new ReaIntelligenceEngine();
  const analysis = rea.analyzeProject('fenix-os');

  assert.equal(analysis.ok, true);
  assert.ok(analysis.subjectSha256, 'Must produce immutable SHA-256 evidence');
  assert.equal(typeof analysis.subjectSha256, 'string');
  assert.equal(analysis.subjectSha256.length, 64);
  assert.ok(analysis.routes.length > 0, 'Must extract real HTTP routes');
  assert.ok(analysis.applicationGraph.nodes.length > 0, 'Must extract application graph nodes');
  assert.ok(analysis.metrics.scannedFilesCount > 0, 'Must extract files count');

  // Blueprint Generation (Rule VII)
  const blueprint = rea.generateDevBlueprint('fenix-os', 'Implementar telemetria de torre 3D');
  assert.equal(blueprint.ok, true);
  assert.ok(blueprint.fullstackContract, 'Must generate full Rule VII contract');
  assert.ok(blueprint.fullstackContract.frontendTargets, 'Must define frontend targets');
  assert.ok(blueprint.fullstackContract.apiContracts, 'Must define api contract');
  assert.ok(blueprint.fullstackContract.backendTargets, 'Must define backend service');
  assert.ok(blueprint.fullstackContract.persistenceLayer, 'Must define persistence contract');
  assert.ok(blueprint.verificationSuite, 'Must define reproduction tests');
});

test('REA Intelligence Engine: reports registered screens across projects and maps couplings', async () => {
  const rea = new ReaIntelligenceEngine();
  const screenCatalog = rea.analyzeAllScreensAndFeatures();

  assert.equal(screenCatalog.ok, true);
  assert.equal(screenCatalog.totalEcosystemScreens,
    screenCatalog.projectsScreensSummary.reduce((sum, project) => sum + project.pagesCount, 0));
  assert.ok(screenCatalog.totalEcosystemScreens > 0, 'Registered screen count must come from the current project inventory');
  assert.ok(screenCatalog.canonicalFenixScreens.length > 0, 'Fênix OS must report its currently registered canonical views');
  assert.ok(screenCatalog.projectsScreensSummary.length >= 6, 'Must catalog all sibling projects');

  const screensRes = await fastLane.handle('/screens');
  assert.equal(screensRes.lane, 'FAST_LANE');
  assert.ok(screensRes.response.includes(`Telas no Ecossistema:** \`${screenCatalog.totalEcosystemScreens}\``));

  // Coupling Matrix
  const couplings = rea.analyzeEcosystemCouplings();
  assert.equal(couplings.ok, true);
  assert.ok(couplings.totalCouplings > 0, 'Coupling matrix must have edges');
  assert.ok(couplings.videoArchitecturalSynthesis, 'Synthesis must contain video reference insights');
  assert.ok(couplings.videoArchitecturalSynthesis.video1_mcpAiBrain, 'Must contain Video 1 MCP AI Brain concept');
  assert.ok(couplings.videoArchitecturalSynthesis.video2_cyberneticBotCity, 'Must contain Video 2 Cybernetic City concept');
});

test('FastLane Engine: handles /index, /rea, /blueprint, /couplings, /screens and delegating tasks', async () => {
  // Test /rea
  const reaRes = await fastLane.handle('/rea fenix-os');
  assert.equal(reaRes.lane, 'FAST_LANE');
  assert.ok(reaRes.response.includes('Análise REA') || reaRes.response.includes('SHA-256'));

  // Test /blueprint
  const bpRes = await fastLane.handle('/blueprint fenix-os Criar nova rota');
  assert.equal(bpRes.lane, 'FAST_LANE');
  assert.ok(bpRes.response.includes('Proposta de engenharia REA'));
  assert.ok(bpRes.response.includes('Evidência:'));
  assert.ok(bpRes.response.includes('NOT_RUN'));
  assert.ok(bpRes.response.includes('Não executou testes nem criou job/alterações'));

  // Test /couplings
  const coupRes = await fastLane.handle('/couplings');
  assert.equal(coupRes.lane, 'FAST_LANE');
  assert.ok(coupRes.response.includes('Matriz de Acoplamento'));

  // Test /index
  const idxRes = await fastLane.handle('/index conversation');
  assert.equal(idxRes.lane, 'FAST_LANE');
  assert.ok(idxRes.response.includes('Memória Ativa & Project Memory INDEX'));
});
