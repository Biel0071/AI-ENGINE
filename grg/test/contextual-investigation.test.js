'use strict';

/**
 * FÊNIX OS — Contextual Investigation & Master Agent Intelligence Acceptance Tests
 *
 * Verifies all 10 mandatory acceptance scenarios and the canonical validation sequence:
 * 1. Natural greeting without unprompted operational metrics report.
 * 2. "Me fale sobre o projeto TBOT" executes multi-source autonomous investigation.
 * 3. "Quais arquivos você consultou..." cites exact files with provenance.
 * 4. "A API Platform consegue analisar...?" distinguishes technical capability, real connectivity, and project source presence.
 * 5. "Encontre um bug concreto..." provides factual evidence with file paths and line numbers.
 * 6. "Se não encontrar informações suficientes, investigue..." adheres to zero-mock protocol.
 * 7. Registered project query returns verified architecture, framework, and routes.
 * 8. Specific file inspection locates and details code artifacts.
 * 9. Explicit status query returns operational telemetry only when requested.
 * 10. Multi-turn conversation maintains context continuity across questions.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { globalContextualInvestigationEngine } = require('../src/services/contextual-investigation-engine');
const { handleConversationRoutes } = require('../src/api/conversation-routes');

function createMockApp(overrides = {}) {
  const messages = [];
  const conversations = [];
  return {
    conversations: {
      open: async (_tenant, _actor, payload) => {
        const conv = { id: payload.conversationId || 'conv-test-1', projectId: payload.projectId || null };
        conversations.push(conv);
        return conv;
      },
      append: async (_tenant, _actor, conversationId, message) => {
        messages.push({ conversationId, ...message });
        return message;
      },
      history: async (_tenant, _convId) => messages,
    },
    projectMemoryIndex: globalContextualInvestigationEngine.memoryIndex,
    ...overrides,
  };
}

function createRequestContext(message, app, extra = {}) {
  const res = {};
  const sendJson = (_res, status, payload) => {
    res.status = status;
    res.payload = payload;
    return true;
  };
  return {
    req: { method: 'POST', headers: { 'content-type': 'application/json' } },
    res,
    sendJson,
    readJson: async () => ({ message, mascotFastLane: true, ...extra }),
    url: new URL('http://localhost/api/v2/conversation'),
    identity: { tenantId: 'tenant-test', actorId: 'user-test' },
    app,
  };
}

// -----------------------------------------------------------------------------
// Scenario 1: Natural greeting without unprompted operational report
// -----------------------------------------------------------------------------
test('Scenario 1: Greeting receives a natural response without unrequested operational metrics', async () => {
  const res = await globalContextualInvestigationEngine.investigate('Boa noite');
  assert.equal(res.intent, 'GREETING_PURE');
  assert.match(res.response, /Boa noite/i);
  assert.doesNotMatch(res.response, /Estado Operacional Agora/i);
  assert.doesNotMatch(res.response, /Memória Indexada O\(1\)/i);
  assert.doesNotMatch(res.response, /Fila de Jobs API/i);
});

// -----------------------------------------------------------------------------
// Scenario 2: "Me fale sobre o projeto TBOT" investigates across all sources
// -----------------------------------------------------------------------------
test('Scenario 2: "Me fale sobre o projeto TBOT" executes autonomous investigation without fabricating results', async () => {
  const res = await globalContextualInvestigationEngine.investigate('Boa noite, me fale sobre o projeto TBOT');
  assert.equal(res.intent, 'PROJECT_QUERY_NOT_FOUND');
  assert.equal(res.targetProject, 'tbot');

  // Must report the 4 sources searched
  assert.match(res.response, /project-registry\.js/i);
  assert.match(res.response, /PROJECT_MEMORY_INDEX\.json/i);
  assert.match(res.response, /ACTIVE_PROJECT_MEMORY\.md/i);
  assert.match(res.response, /C:\\projetos/i);

  // Must not claim it exists
  assert.match(res.response, /não consta no catálogo|não está registrado/i);

  // Must list known projects (fenix-os, zapai-crm, api-platform, etc.)
  assert.match(res.response, /fenix-os/i);
  assert.match(res.response, /zapai-crm/i);
  assert.match(res.response, /api-platform/i);

  // Consulted files must be tracked
  assert.ok(res.consultedFiles.length >= 3);
  assert.ok(res.consultedFiles.some((f) => f.includes('project-registry.js')));
});

// -----------------------------------------------------------------------------
// Scenario 3: "Quais arquivos você consultou...?" cites exact consulted files
// -----------------------------------------------------------------------------
test('Scenario 3: "Quais arquivos você consultou...?" returns exact consulted files and provenance', async () => {
  // Pre-seed investigation state
  await globalContextualInvestigationEngine.investigate('Me fale sobre o projeto TBOT', { conversationId: 'conv-test-files' });

  const res = await globalContextualInvestigationEngine.investigate('Quais arquivos você consultou para chegar a essa conclusão?', {
    conversationId: 'conv-test-files',
  });
  assert.equal(res.intent, 'FILES_CONSULTED');
  assert.match(res.response, /ai-engine\/grg\/src\/projects\/project-registry\.js/);
  assert.match(res.response, /ai-engine\/memory\/PROJECT_MEMORY_INDEX\.json/);
  assert.match(res.response, /ACTIVE_PROJECT_MEMORY\.md/);
  assert.match(res.response, /C:\\projetos/);
});

// -----------------------------------------------------------------------------
// Scenario 4: "A API Platform consegue analisar...?" evaluates real integration & project accessibility
// -----------------------------------------------------------------------------
test('Scenario 4: "A API Platform consegue analisar...?" evaluates technical capability vs real integration vs project presence', async () => {
  const history = [
    { role: 'user', content: 'Me fale sobre o projeto TBOT' },
    { role: 'assistant', content: 'Investiguei o projeto TBOT...' },
  ];
  const res = await globalContextualInvestigationEngine.investigate(
    'A API Platform consegue analisar o código desse projeto? Verifique a integração real.',
    { conversationHistory: history, conversationId: 'conv-test-api' }
  );
  assert.equal(res.intent, 'CAPABILITY_API_PLATFORM');

  // Must explain technical architecture of API Platform
  assert.match(res.response, /Fastify/i);
  assert.match(res.response, /Qwen 2\.5|BullMQ/i);

  // Must verify real endpoint/connectivity
  assert.match(res.response, /health|status medido/i);

  // Must explain why TBOT cannot be analyzed right now
  assert.match(res.response, /não consegue analisar o projeto.*TBOT/i);
  assert.match(res.response, /workspace|container/i);
});

// -----------------------------------------------------------------------------
// Scenario 5: "Encontre um bug concreto..." returns factual evidence
// -----------------------------------------------------------------------------
test('Scenario 5: "Encontre um bug concreto e mostre o arquivo e a evidência" returns concrete verified bugs', async () => {
  const res = await globalContextualInvestigationEngine.investigate('Encontre um bug concreto e mostre o arquivo e a evidência.');
  assert.equal(res.intent, 'BUG_QUERY');
  assert.match(res.response, /conversation-routes\.js/i);
  assert.match(res.response, /1307|1336/);
  assert.match(res.response, /fenix-mascot-sidebar\.js/i);
  assert.match(res.response, /GRG_SPACE_VISUAL_BUG_BACKLOG\.md/i);
});

// -----------------------------------------------------------------------------
// Scenario 6: "Se não encontrar informações suficientes, investigue..."
// -----------------------------------------------------------------------------
test('Scenario 6: "Se não encontrar informações suficientes, investigue..." affirms autonomous research protocol', async () => {
  const res = await globalContextualInvestigationEngine.investigate('Se não encontrar informações suficientes, investigue antes de responder.');
  assert.equal(res.intent, 'INSPECT_BEFORE_ANSWER');
  assert.match(res.response, /Zero-Mock/i);
  assert.match(res.response, /Project Registry|Memory Index/i);
});

// -----------------------------------------------------------------------------
// Scenario 7: Question about a registered project returns architectural facts
// -----------------------------------------------------------------------------
test('Scenario 7: Question about registered project (api-platform) returns real stack and routes', async () => {
  const res = await globalContextualInvestigationEngine.investigate('Me fale sobre o projeto api-platform');
  assert.equal(res.intent, 'PROJECT_QUERY_FOUND');
  assert.equal(res.targetProject, 'api-platform');
  assert.match(res.response, /API Platform/i);
  assert.match(res.response, /Fastify/i);
  assert.match(res.response, /3001/);
});

// -----------------------------------------------------------------------------
// Scenario 8: Question explicitly asking for operational status returns metrics
// -----------------------------------------------------------------------------
test('Scenario 8: Question explicitly asking for status returns live operational telemetry', async () => {
  const res = await globalContextualInvestigationEngine.investigate('Qual o status operacional do sistema?');
  assert.equal(res.intent, 'STATUS_OPERATIONAL');
  assert.match(res.response, /Estado Operacional/i);
  assert.match(res.response, /Agentes no Ecossistema/i);
  assert.match(res.response, /Memória Indexada/i);
});

// -----------------------------------------------------------------------------
// Scenario 9: Full 5-step conversation sequence through HTTP route handler
// -----------------------------------------------------------------------------
test('Scenario 9: Full 5-step conversational validation sequence via handleConversationRoutes', async () => {
  const app = createMockApp();
  const conversationId = 'conv-seq-' + Date.now();

  // Step 1: “Boa noite, me fale sobre o projeto TBOT.”
  const ctx1 = createRequestContext('Boa noite, me fale sobre o projeto TBOT.', app, { conversationId });
  await handleConversationRoutes(ctx1.req, ctx1.res, ctx1.url, ctx1.sendJson, ctx1.readJson, ctx1.identity, ctx1.app);
  assert.equal(ctx1.res.status, 200);
  assert.equal(ctx1.res.payload.ok, true);
  assert.match(ctx1.res.payload.response, /TBOT/i);
  assert.match(ctx1.res.payload.response, /project-registry\.js/i);
  assert.doesNotMatch(ctx1.res.payload.response, /Fila de Jobs API/i);

  // Step 2: “Quais arquivos você consultou para chegar a essa conclusão?”
  const ctx2 = createRequestContext('Quais arquivos você consultou para chegar a essa conclusão?', app, { conversationId });
  await handleConversationRoutes(ctx2.req, ctx2.res, ctx2.url, ctx2.sendJson, ctx2.readJson, ctx2.identity, ctx2.app);
  assert.equal(ctx2.res.status, 200);
  assert.match(ctx2.res.payload.response, /project-registry\.js/i);
  assert.match(ctx2.res.payload.response, /PROJECT_MEMORY_INDEX\.json/i);

  // Step 3: “A API Platform consegue analisar o código desse projeto? Verifique a integração real.”
  const ctx3 = createRequestContext('A API Platform consegue analisar o código desse projeto? Verifique a integração real.', app, { conversationId });
  await handleConversationRoutes(ctx3.req, ctx3.res, ctx3.url, ctx3.sendJson, ctx3.readJson, ctx3.identity, ctx3.app);
  assert.equal(ctx3.res.status, 200);
  assert.match(ctx3.res.payload.response, /Fastify/i);
  assert.match(ctx3.res.payload.response, /não consegue analisar.*TBOT/i);

  // Step 4: “Encontre um bug concreto e mostre o arquivo e a evidência.”
  const ctx4 = createRequestContext('Encontre um bug concreto e mostre o arquivo e a evidência.', app, { conversationId });
  await handleConversationRoutes(ctx4.req, ctx4.res, ctx4.url, ctx4.sendJson, ctx4.readJson, ctx4.identity, ctx4.app);
  assert.equal(ctx4.res.status, 200);
  assert.match(ctx4.res.payload.response, /conversation-routes\.js/i);

  // Step 5: “Se não encontrar informações suficientes, investigue antes de responder.”
  const ctx5 = createRequestContext('Se não encontrar informações suficientes, investigue antes de responder.', app, { conversationId });
  await handleConversationRoutes(ctx5.req, ctx5.res, ctx5.url, ctx5.sendJson, ctx5.readJson, ctx5.identity, ctx5.app);
  assert.equal(ctx5.res.status, 200);
  assert.match(ctx5.res.payload.response, /Zero-Mock|Protocolo de Investigação/i);
});

// -----------------------------------------------------------------------------
// Scenario 10: File inspection query locates and inspects the requested file
// -----------------------------------------------------------------------------
test('Scenario 10: File query locates and inspects file with real lines and size evidence', async () => {
  const res = await globalContextualInvestigationEngine.investigate('O que tem no arquivo server.js?');
  assert.equal(res.intent, 'SPECIFIC_FILE_QUERY');
  assert.equal(res.fileInspection.found, true);
  assert.ok(res.fileInspection.linesCount > 0);
  assert.ok(res.fileInspection.sizeBytes > 0);
  assert.match(res.response, /server\.js/i);
  assert.match(res.response, /linhas/i);
  assert.match(res.response, /KB/i);
  assert.ok(res.consultedFiles.some((f) => f.includes('server.js')));
});

// -----------------------------------------------------------------------------
// Scenario 11: Project-specific bug query investigates targeted project
// -----------------------------------------------------------------------------
test('Scenario 11: Project-specific bug query investigates targeted project instead of generic meta-bugs', async () => {
  const res = await globalContextualInvestigationEngine.investigate('Onde estão os principais bugs do zapai-crm?');
  assert.equal(res.intent, 'BUG_QUERY');
  assert.match(res.response, /ZAPAI CRM/i);
  assert.match(res.response, /project-registry\.js/i);
  assert.match(res.response, /Bugs Concretos/i);
  assert.ok(res.consultedFiles.some((f) => f.includes('project-registry.js')));
});

// -----------------------------------------------------------------------------
// Scenario 12: Memory query investigates active memory without raw telemetry dumping
// -----------------------------------------------------------------------------
test('Scenario 12: Question about active memory for TBOT returns honest zero records without telemetry dumping', async () => {
  const res = await globalContextualInvestigationEngine.investigate('O que tem na memória ativa sobre o TBOT?');
  assert.equal(res.intent, 'ACTIVE_MEMORY_QUERY');
  assert.match(res.response, /ACTIVE_PROJECT_MEMORY\.md/i);
  assert.match(res.response, /Zero registros|Não foi encontrada/i);
  assert.doesNotMatch(res.response, /Ecossistema Indexado:.*arquivos.*símbolos/i);
  assert.doesNotMatch(res.response, /Fila de Jobs API/i);
});

// -----------------------------------------------------------------------------
// Scenario 13: Deep code audit request is classified as ANALYSIS on JOB_LANE
// -----------------------------------------------------------------------------
test('Scenario 13: Imperative code audit request is classified as ANALYSIS on JOB_LANE with high complexity', () => {
  const { classify } = require('../src/routing/conversation-router');
  const c = classify('Faça uma auditoria de código do projeto zapai-crm');
  assert.equal(c.classification, 'ANALYSIS');
  assert.equal(c.lane, 'JOB_LANE');
  assert.equal(c.complexity, 'high');
  assert.equal(c.targetProject, 'zapai-crm');
  assert.ok(c.required_capabilities.includes('code:audit'));
});

// -----------------------------------------------------------------------------
// Scenario 14: API Platform capability query explains 4 operational evaluation levels
// -----------------------------------------------------------------------------
test('Scenario 14: API Platform query explains difference between docs, code inspection, tests, and production', async () => {
  const res = await globalContextualInvestigationEngine.investigate(
    'A API Platform consegue analisar o código desse projeto? Verifique a integração real.'
  );
  assert.equal(res.intent, 'CAPABILITY_API_PLATFORM');
  assert.match(res.response, /Analisar Documentação/i);
  assert.match(res.response, /Inspecionar Código/i);
  assert.match(res.response, /Executar Testes/i);
  assert.match(res.response, /Verificar em Produção/i);
});

// -----------------------------------------------------------------------------
// Scenario 15: Comparative project query handles multiple projects
// -----------------------------------------------------------------------------
test('Scenario 15: Comparative project query contrasts both projects and analysis feasibility', async () => {
  const res = await globalContextualInvestigationEngine.investigate('Compare o projeto TBOT com o zapai-crm');
  assert.equal(res.intent, 'PROJECT_COMPARISON');
  assert.match(res.response, /TBOT/i);
  assert.match(res.response, /ZAPAI/i);
  assert.match(res.response, /Não registrado/i);
  assert.match(res.response, /Registrado no ecossistema/i);
});

