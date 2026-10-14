'use strict';

/**
 * FÊNIX OS — EXTERNAL PROJECT REALITY TEST (Level 10)
 * 
 * Validates the complete 22 Hard Reality Gates of the living operational layer
 * on a REAL EXTERNAL repository (API-PLATAFORM):
 * 
 * [x] External project selected: projects/API-PLATAFORM
 * [x] Real project connected
 * [x] Real code analyzed (TypeScript, Fastify, Prisma, Docker)
 * [x] Real frontend analyzed (HTML, CSS, JS SPA)
 * [x] Application really opened via HTTP server
 * [x] Playwright really executed (Chromium Headless)
 * [x] Real screen observed (URL, title, viewport)
 * [x] Real DOM observed (elements, inputs, buttons, computed styles)
 * [x] Screen DNA persisted
 * [x] Project DNA persisted
 * [x] Reusable patterns extracted & persisted
 * [x] Memory persisted into MemoryFabric
 * [x] Reconstruction executed in sandbox
 * [x] Reconstruction opened in Playwright
 * [x] Screenshots produced (real + reconstructed + transfer)
 * [x] Comparison executed (DOM & computed styles)
 * [x] Corrections executed & logged
 * [x] Second run (Warm) executed
 * [x] Reutilization proven (0 tokens, 0 API calls)
 * [x] Tokens measured (Cold vs Warm vs Transfer)
 * [x] API calls measured
 * [x] Knowledge transfer proven to secondary component
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { createApp } = require('../src/app');
const { MemoryStore } = require('../src/kernel/store');

test('EXTERNAL PROJECT ABSORPTION & PLAYWRIGHT REALITY: Hard Reality Gates Test', async (t) => {
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

  // Path to the real external project
  const externalProjectPath = path.resolve(__dirname, '..', '..', '..', 'projects', 'API-PLATAFORM');
  assert.ok(fs.existsSync(externalProjectPath), `External project path must exist: ${externalProjectPath}`);

  let absorptionReport = null;
  let visualObservation = null;
  let reconstructionResult = null;
  let learningReport = null;

  // ─── GATE 1 & 2: CONNECT EXTERNAL PROJECT & DISCOVER FILES ─────────────────
  await t.test('1. Connect External Project & Discover Real Files', async () => {
    absorptionReport = await absorptionEngine.absorbProject({
      projectId: 'prj_api_plataform',
      projectName: 'API Platform Enterprise',
      workspacePath: externalProjectPath,
      tenantId,
      actorId,
      observeWithBrowser: true,
      browserRoute: 'login',
      browserSelector: '#login',
      browserViewport: { width: 1280, height: 800 },
    });

    assert.ok(absorptionReport, 'Relatório de absorção deve ser gerado');
    assert.equal(absorptionReport.projectId, 'prj_api_plataform');
    assert.equal(absorptionReport.projectName, 'API Platform Enterprise');
    assert.ok(absorptionReport.stats.totalFilesScanned > 20, `Arquivos escaneados: ${absorptionReport.stats.totalFilesScanned}`);

    // Verify stack detection
    const stackNames = absorptionReport.techStack.map(s => s.name);
    assert.ok(stackNames.includes('Node.js'), 'Stack deve conter Node.js');
    assert.ok(stackNames.includes('JavaScript') || stackNames.includes('TypeScript'), 'Stack deve conter JS/TS');
    assert.ok(stackNames.includes('HTML5'), 'Stack deve conter HTML5');
    assert.ok(stackNames.includes('CSS3'), 'Stack deve conter CSS3');
  });

  // ─── GATE 3 & 4: REAL PLAYWRIGHT EXECUTION & VISUAL SCREEN OBSERVATION ──────
  await t.test('2. Playwright Real Browser Execution & Screen DNA Observation', async () => {
    visualObservation = absorptionReport.liveVisualEvidence;
    assert.ok(visualObservation, 'Visual evidence via Playwright deve ser gerada');
    assert.equal(visualObservation.source, 'Playwright_Chromium');
    assert.equal(visualObservation.confidence, 1.0);
    assert.ok(visualObservation.url.startsWith('http://127.0.0.1:'), `URL real servida: ${visualObservation.url}`);
    assert.ok(visualObservation.title.includes('API Platform'), `Título da página real: ${visualObservation.title}`);

    // Validate DOM tree observation
    const obs = visualObservation.pageObservation;
    assert.ok(obs.totalElements > 10, `Elementos DOM reais contados: ${obs.totalElements}`);
    assert.ok(obs.keyIds.some(id => id.includes('login')), 'DOM deve conter elementos de login');

    // Validate interactive elements
    assert.ok(obs.inputs.length >= 2, `Campos de entrada reais: ${obs.inputs.length}`);
    const emailField = obs.inputs.find(i => i.id === 'login-email');
    assert.ok(emailField, 'Campo login-email deve existir no DOM');

    // Validate computed styles extracted from real browser
    assert.ok(obs.computedStyles, 'Estilos computados reais devem ser extraídos');
    assert.ok(obs.computedStyles.display, 'Display mode computado deve existir');

    // Validate responsive breakpoints
    assert.ok(visualObservation.responsiveChecks.desktop.visible, 'Visível no desktop');
    assert.ok(visualObservation.responsiveChecks.tablet.visible, 'Visível no tablet');
    assert.ok(visualObservation.responsiveChecks.mobile.visible, 'Visível no mobile');

    // Validate screenshot on disk
    assert.ok(visualObservation.screenshotPath, 'Screenshot deve ter sido salva');
    assert.ok(fs.existsSync(visualObservation.screenshotPath), `Arquivo de screenshot deve existir: ${visualObservation.screenshotPath}`);
  });

  // ─── GATE 5 & 6: SCREEN DNA & PROJECT DNA PERSISTENCE ──────────────────────
  await t.test('3. Screen DNA & Project DNA Persistence', async () => {
    assert.ok(absorptionReport.screens.length >= 2, `Telas descobertas: ${absorptionReport.screens.length}`);
    const loginScreen = absorptionReport.screens.find(s => s.screenId.includes('login')) || absorptionReport.screens[0];
    
    assert.ok(loginScreen.screenId, 'screenId deve estar definido');
    assert.ok(loginScreen.layout, 'layout deve estar definido');
    assert.ok(loginScreen.structuralHash, 'structuralHash deve estar calculado');
    assert.equal(loginScreen.confidence, 1.0);
    assert.equal(loginScreen.source, 'ProjectAbsorptionEngine');

    // Project DNA
    const dna = absorptionReport.projectDna;
    assert.ok(dna, 'Project DNA deve ser gerado');
    assert.equal(dna.projectId, 'prj_api_plataform');
  });

  // ─── GATE 7 & 8: PATTERN EXTRACTION & MEMORY PERSISTENCE ───────────────────
  await t.test('4. Pattern Deduplication & Memory Fabric Persistence', async () => {
    assert.ok(absorptionReport.stats.totalPatternsLearned >= 1, 'Padrões aprendidos devem ser registrados');
    
    // Check Graph Brain node
    const projectNode = graphBrain.nodes.get('project:prj_api_plataform');
    assert.ok(projectNode, 'Nó do projeto externo deve existir no Graph Brain');

    // Check Memory Fabric persistence
    assert.ok(absorptionReport.stats.totalMemoriesPersisted >= 2, 'Memórias semântica, procedural e visual devem ser persistidas');
  });

  // ─── GATE 9 & 10: REAL RECONSTRUCTION IN SANDBOX & PLAYWRIGHT VERIFICATION ──
  await t.test('5. Reconstruct Screen in Sandbox & Playwright Visual Validation', async () => {
    const sandboxDir = path.resolve(__dirname, '..', '..', '..', 'sandbox-real-world-test', 'reconstruction');
    const screenshotPath = path.resolve(__dirname, '..', '..', '..', 'screenshots', 'api_platform_reconstructed_login.png');

    reconstructionResult = await reconstructionEngine.reconstructAndValidateWithPlaywright({
      targetName: 'API Platform Login Card',
      screenDna: absorptionReport.screens[0],
      originalVisualEvidence: visualObservation,
      sandboxDir,
      screenshotPath,
      tenantId,
      actorId,
      projectId: 'prj_api_plataform',
    });

    assert.ok(reconstructionResult, 'Reconstrução deve produzir resultado');
    assert.equal(reconstructionResult.status, 'PASS');
    assert.ok(reconstructionResult.domMatch, 'DOM da reconstrução deve ser compatível');
    assert.ok(reconstructionResult.styleMatch, 'Estilos da reconstrução devem ser compatíveis');
    assert.ok(fs.existsSync(screenshotPath), `Screenshot da reconstrução deve existir: ${screenshotPath}`);
    assert.ok(reconstructionResult.correctionsApplied.length > 0, 'Correções de alinhamento devem ser registradas');
  });

  // ─── GATE 11 & 12: DUAL-RUN LEARNING LOOP (COLD VS WARM) ────────────────────
  await t.test('6. Dual-Run Learning Loop & Token Economy Proof', async () => {
    learningReport = await reconstructionEngine.executeExternalProjectLearningLoop({
      targetScreen1: 'API Platform Login Card',
      targetScreen2: 'Dashboard Metrics Overview',
      projectId: 'prj_api_plataform',
      tenantId,
      actorId,
    });

    assert.ok(learningReport, 'Relatório de aprendizado deve existir');
    assert.equal(learningReport.status, 'LEARNING_PROVEN');

    // Cold Run vs Warm Run comparisons
    assert.equal(learningReport.cold.tokens, 2400, 'Cold run deve consumir tokens');
    assert.equal(learningReport.cold.apiCalls, 1, 'Cold run deve realizar API call');
    assert.equal(learningReport.warm.tokens, 0, 'Warm run deve ter 0 tokens (reuso)');
    assert.equal(learningReport.warm.apiCalls, 0, 'Warm run deve ter 0 chamadas de API');

    // Verified Savings
    assert.equal(learningReport.savings.tokensSaved, 2400);
    assert.equal(learningReport.savings.apiCallsAvoided, 1);
    assert.equal(learningReport.savings.tokenSavingsRate, '100%');
    assert.ok(learningReport.savings.timeSavedMs >= 0, 'Tempo economizado deve ser positivo');
  });

  // ─── GATE 13: GENERALIZATION & KNOWLEDGE TRANSFER (RUN 3) ───────────────────
  await t.test('7. Generalization & Knowledge Transfer (Transfer Run)', async () => {
    assert.ok(learningReport.transfer, 'Relatório de transferência deve existir');
    assert.equal(learningReport.transfer.target, 'Dashboard Metrics Overview');
    assert.equal(learningReport.transfer.tokens, 0, 'Transferência de conhecimento deve consumir 0 tokens novos');
    assert.equal(learningReport.transfer.apiCalls, 0, 'Transferência de conhecimento deve evitar chamada externa');
    assert.equal(learningReport.transfer.knowledgeTransferRate, '100%');

    // Validate that transfer screen can also be visually validated in sandbox
    const transferScreenshot = path.resolve(__dirname, '..', '..', '..', 'screenshots', 'api_platform_transfer_component.png');
    const transferReconstruction = await reconstructionEngine.reconstructAndValidateWithPlaywright({
      targetName: 'Dashboard Metrics Overview',
      screenDna: absorptionReport.screens.find(s => s.screenId.includes('home')) || absorptionReport.screens[0],
      originalVisualEvidence: null,
      sandboxDir: path.resolve(__dirname, '..', '..', '..', 'sandbox-real-world-test', 'transfer_reconstruction'),
      screenshotPath: transferScreenshot,
      tenantId,
      actorId,
      projectId: 'prj_api_plataform',
    });

    assert.equal(transferReconstruction.status, 'PASS');
    assert.ok(fs.existsSync(transferScreenshot), `Screenshot de transferência deve existir: ${transferScreenshot}`);
  });

  // ─── GATE 14: FÊNIX HEART & LIVING CITY REALITY ─────────────────────────────
  await t.test('8. Fênix Heart & Living City Project State', async () => {
    assert.ok(heart.isRunning(), 'Fênix Heart deve permanecer rodando');
    const pState = heart.getProjectState('prj_api_plataform');
    assert.ok(pState, 'Estado do projeto deve ser rastreado pelo Heart');
    assert.equal(pState.state, 'IDLE', 'Projeto absorvido deve estar em IDLE após conclusão');
  });

  // ─── GATE 15: CEO FACTUAL INQUIRIES ─────────────────────────────────────────
  await t.test('9. CEO Agent Telemetry Answers', async () => {
    const q1 = await ceoAgent.chat(tenantId, 'comp.fenix_enterprise', 'Quanto o FÊNIX aprendeu?', actorId);
    assert.ok(q1.answer);
    assert.ok(q1.evidence.totalProjectsAbsorbed >= 1);
    assert.ok(q1.answer.includes('projetos'));

    const q2 = await ceoAgent.chat(tenantId, 'comp.fenix_enterprise', 'Quanto economizamos reutilizando conhecimento?', actorId);
    assert.ok(q2.answer);
    assert.ok(q2.answer.includes('economizou') || q2.answer.includes('Economia') || q2.answer.includes('tokens'));
  });

  await app.close();
});
