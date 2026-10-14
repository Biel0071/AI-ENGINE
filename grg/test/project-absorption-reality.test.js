'use strict';

/**
 * FÊNIX OS — PROJECT ABSORPTION & KNOWLEDGE REUSE REALITY TEST
 * 
 * Validates the complete 16 Hard Reality Gates of the living operational layer:
 * [x] Real project analyzed
 * [x] Real files discovered
 * [x] Real screens identified (Screen DNA)
 * [x] Project DNA persisted
 * [x] Reusable patterns extracted & persisted (hash deduplication)
 * [x] Memory persisted into MemoryFabric
 * [x] Component reconstruction executed
 * [x] Sandbox syntax and contract tests executed
 * [x] Second run executed
 * [x] Knowledge reuse proven
 * [x] Tokens measured
 * [x] Time measured
 * [x] API calls avoided measured
 * [x] Economy calculated (KNOWLEDGE_REUSE_RATE & TOKEN_SAVINGS_RATE)
 * [x] CEO received results and answered with factual telemetry
 * [x] Living City reflected real project state
 * [x] Heart remained operational throughout
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createApp } = require('../src/app');
const { MemoryStore } = require('../src/kernel/store');
const { livingCityState } = require('../src/api/living-city-routes');

test('PROJECT ABSORPTION & SCREEN RECONSTRUCTION: Hard Reality Gates Test', async (t) => {
  const tenantId = 'grg';
  const actorId = 'system';
  const store = new MemoryStore();
  const app = await createApp({ store });
  await app.controlPlane.ensureDefaultTenant({ id: tenantId, name: 'GRG FÊNIX', actorId });

  const absorptionEngine = app.absorptionEngine;
  const reconstructionEngine = app.reconstructionEngine;
  const tokenEconomy = app.tokenEconomy;
  const patternLibrary = app.patternLibrary;
  const graphBrain = app.graphBrain;
  const ceoAgent = app.ceoAgent;
  const heart = app.heart;

  assert.ok(absorptionEngine, 'absorptionEngine deve estar instanciado');
  assert.ok(reconstructionEngine, 'reconstructionEngine deve estar instanciado');
  assert.ok(tokenEconomy, 'tokenEconomy deve estar instanciado');
  assert.ok(patternLibrary, 'patternLibrary deve estar instanciado');
  assert.ok(graphBrain, 'graphBrain deve estar instanciado');
  assert.ok(ceoAgent, 'ceoAgent deve estar instanciado');
  assert.ok(heart, 'heart deve estar instanciado');

  const realProjectPath = path.resolve(__dirname, '..');
  let absorptionReport = null;

  // ─── GATE 1 & 2: CONNECT REAL PROJECT & DISCOVER FILES ─────────────────────
  await t.test('1. Connect Real Project & Discover Files', async () => {
    absorptionReport = await absorptionEngine.absorbProject({
      projectId: 'fenix-grg-core',
      projectName: 'Fênix GRG Core',
      workspacePath: realProjectPath,
      tenantId,
      actorId,
    });

    assert.ok(absorptionReport, 'Relatório de absorção deve ser gerado');
    assert.equal(absorptionReport.projectId, 'fenix-grg-core');
    assert.ok(absorptionReport.stats.totalFilesScanned > 20, `Arquivos reais devem ser escaneados (encontrados: ${absorptionReport.stats.totalFilesScanned})`);
    assert.ok(absorptionReport.entrypoints.length > 0, 'Entrypoints reais devem ser identificados');
    assert.ok(absorptionReport.techStack.length > 0, 'Stack tecnológica real deve ser detectada');
  });

  // ─── GATE 3: IDENTIFY SCREENS & SCREEN DNA ─────────────────────────────────
  await t.test('2. Screen Mapping & Screen DNA Extraction', async () => {
    assert.ok(absorptionReport.screens.length > 0, 'Telas reais devem ser identificadas');
    const firstScreen = absorptionReport.screens[0];

    // Screen DNA contract validation
    assert.ok(firstScreen.screenId, 'Screen DNA deve conter screenId');
    assert.ok(firstScreen.title, 'Screen DNA deve conter title');
    assert.ok(firstScreen.layout, 'Screen DNA deve conter layout');
    assert.ok(firstScreen.components.length > 0, 'Screen DNA deve mapear componentes');
    assert.ok(firstScreen.spacing.length > 0, 'Screen DNA deve conter tokens de espaçamento');
    assert.ok(firstScreen.colors.length > 0, 'Screen DNA deve conter tokens de cor');
    assert.ok(firstScreen.structuralHash, 'Screen DNA deve conter structuralHash');
    assert.equal(firstScreen.confidence, 1.0, 'Confiança deve ser 1.0 (fato inspecionado)');
  });

  // ─── GATE 4 & 5: PROJECT DNA & PATTERN LIBRARY PERSISTENCE ─────────────────
  await t.test('3. Project DNA & Pattern Library Deduplication', async () => {
    assert.ok(absorptionReport.projectDna, 'Project DNA deve ser gerado');
    assert.equal(absorptionReport.projectDna.projectId, 'fenix-grg-core');
    assert.ok(absorptionReport.projectDna.screens.length > 0, 'Project DNA deve conter telas');

    const patterns = patternLibrary.listPatterns();
    assert.ok(patterns.length > 0, 'Pattern Library deve conter padrões registrados');

    // Deduplication Test: Re-registering existing pattern produces REUSE
    const existing = patterns[0];
    const reRegister = patternLibrary.registerPattern(existing);
    assert.equal(reRegister.status, 'REUSE', 'Registrar padrão idêntico deve produzir status REUSE');
    assert.equal(reRegister.isNew, false, 'Padrão reutilizado não é novo');
    assert.ok(reRegister.pattern.usageCount >= 2, 'Contador de uso do padrão deve ser incrementado');
  });

  // ─── GATE 6: MEMORY FABRIC & GRAPH BRAIN ───────────────────────────────────
  await t.test('4. Memory Fabric & Graph Brain Interconnection', async () => {
    const graphStats = graphBrain.getStats();
    assert.ok(graphStats.totalNodes > 0, 'Graph Brain deve conter nós');
    assert.ok(graphStats.totalEdges > 0, 'Graph Brain deve conter arestas');
    assert.ok(graphStats.nodeTypes.PROJECT >= 1, 'Graph Brain deve ter nó do tipo PROJECT');

    // Verify neighbors of project
    const neighbors = graphBrain.getNeighbors('project:fenix-grg-core');
    assert.ok(neighbors.length > 0, 'Projeto deve estar conectado a páginas e componentes no grafo');
  });

  // ─── GATE 7 & 8: RECONSTRUCTION & SANDBOX TESTING (RUN 1 - COLD) ────────────
  let run1Result = null;
  await t.test('5. Execute Screen Reconstruction in Sandbox (Run 1 - Cold)', async () => {
    run1Result = await reconstructionEngine.reconstruct({
      targetName: 'Agent Inspector',
      prompt: 'Reconstrua a interface do Agent Inspector com telemetria honesta e chat',
      tenantId,
      actorId,
      projectId: 'fenix-grg-core',
      forceCold: true,
    });

    assert.ok(run1Result.reconstructionId, 'Deve gerar ID de reconstrução');
    assert.ok(run1Result.codeArtifact.html, 'Deve gerar HTML do componente');
    assert.ok(run1Result.codeArtifact.js, 'Deve gerar JS do componente');
    assert.equal(run1Result.validation.valid, true, 'Validação no Sandbox deve passar');
    assert.equal(run1Result.validation.checks.jsSyntaxValid, true, 'Sintaxe JS deve ser válida no VM sandbox');
    assert.equal(run1Result.validation.checks.honestInitialValues, true, 'Deve respeitar Zero-Mock honesto (marcador —)');
  });

  // ─── GATE 9 & 10: SECOND RUN & PROVEN KNOWLEDGE REUSE ──────────────────────
  let run2Result = null;
  await t.test('6. Second Execution & Proven Knowledge Reuse (Run 2 - Warm)', async () => {
    run2Result = await reconstructionEngine.reconstruct({
      targetName: 'Agent Inspector',
      prompt: 'Reconstrua a interface do Agent Inspector com telemetria honesta e chat',
      tenantId,
      actorId,
      projectId: 'fenix-grg-core',
      forceCold: false,
    });

    assert.ok(run2Result.knowledgeReused, 'Segunda execução DEVE reutilizar conhecimento acumulado');
    assert.equal(run2Result.validation.valid, true, 'Validação da segunda execução deve passar');
    assert.equal(run2Result.metrics.apiCalls, 0, 'Segunda execução deve evitar chamadas externas de API');
  });

  // ─── GATE 11, 12, 13, 14: DUAL-RUN DELTA & TOKEN ECONOMY MEASUREMENT ────────
  await t.test('7. Measure Dual-Run Delta & Token Economy', async () => {
    const learningReport = await reconstructionEngine.executeDualLearningLoop({
      targetName: 'Agent Inspector',
      tenantId,
      actorId,
      projectId: 'fenix-grg-core',
    });

    assert.equal(learningReport.isProven, true, 'Aprendizado deve ser comprovado');
    assert.equal(learningReport.status, 'LEARNING_PROVEN', 'Status deve ser LEARNING_PROVEN');
    assert.ok(learningReport.delta.tokensSaved > 0, `Tokens devem ser economizados (economizados: ${learningReport.delta.tokensSaved})`);
    assert.ok(learningReport.delta.apiCallsAvoided > 0, 'Chamadas externas de API devem ser evitadas');

    const ecoReport = tokenEconomy.getEfficiencyReport();
    assert.ok(ecoReport.KNOWLEDGE_REUSE_RATE > 0, `KNOWLEDGE_REUSE_RATE deve ser > 0 (medido: ${ecoReport.KNOWLEDGE_REUSE_RATE})`);
    assert.ok(ecoReport.TOKEN_SAVINGS_RATE > 0, `TOKEN_SAVINGS_RATE deve ser > 0 (medido: ${ecoReport.TOKEN_SAVINGS_RATE})`);
  });

  // ─── GATE 15: CEO FACTUAL TELEMETRY RESPONSES ──────────────────────────────
  await t.test('8. CEO Factual Inquiries', async () => {
    await app.companyBrain.createCompany(tenantId, {
      name: 'Fênix Enterprise',
      projectId: 'fenix-grg-core',
      status: 'ACTIVE'
    });

    // Inquiry 1: "Quanto o FÊNIX aprendeu?"
    const learningAnswer = await ceoAgent.chat(tenantId, 'comp.fenix_enterprise', 'Quanto o FÊNIX aprendeu?');
    assert.ok(learningAnswer.answer.includes('projetos reais'), 'CEO deve responder com contagem de projetos reais');
    assert.ok(learningAnswer.evidence.totalFilesScanned > 0, 'Evidência do CEO deve conter arquivos reais escaneados');
    assert.ok(learningAnswer.evidence.totalScreensDiscovered > 0, 'Evidência do CEO deve conter telas reais descobertas');

    // Inquiry 2: "Quanto economizamos reutilizando conhecimento?"
    const savingsAnswer = await ceoAgent.chat(tenantId, 'comp.fenix_enterprise', 'Quanto economizamos reutilizando conhecimento?');
    assert.ok(savingsAnswer.answer.includes('tokens economizados'), 'CEO deve reportar tokens economizados reais');
    assert.ok(savingsAnswer.evidence.tokensSaved > 0, 'Evidência deve comprovar tokens poupados');
    assert.ok(savingsAnswer.evidence.apiCallsAvoided > 0, 'Evidência deve comprovar chamadas de API evitadas');
  });

  // ─── GATE 16: LIVING CITY & HEART PERSISTENCE ──────────────────────────────
  await t.test('9. Living City Reflects Project & Heart Remains Active', async () => {
    const city = await livingCityState(app, tenantId, actorId);
    assert.ok(city.projects.length > 0, 'Living City deve listar projetos');
    assert.ok(city.agents.some(a => a.id === 'agent.ceo'), 'Living City deve listar o CEO Agent');

    // Heart is alive and tracking lifecycle
    assert.equal(heart.status, 'ONLINE', 'Fênix Heart deve estar ONLINE');
    const projectState = heart.getProjectState('fenix-grg-core');
    assert.ok(projectState, 'Heart deve rastrear o estado do projeto absorvido');
    assert.equal(projectState.state, 'IDLE', 'Projeto absorvido deve estar em estado IDLE pronto para uso');
  });
});
