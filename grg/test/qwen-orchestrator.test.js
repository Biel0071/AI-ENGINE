/**
 * FÊNIX OS — Qwen Project Orchestrator & Live Bridge Test Suite
 * Verifies Prompt Expander, Autonomy Modes, Action Queue, Browser Bridge, Slash Commands and HTTP Routes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { PromptExpanderEngine } = require('../src/services/qwen-orchestrator/prompt-expander-engine');
const { QwenProjectOrchestrator } = require('../src/services/qwen-orchestrator/qwen-project-orchestrator');
const { QwenBrowserBridge } = require('../src/services/qwen-orchestrator/qwen-browser-bridge');
const { handleQwenOrchestratorRoutes, resetOrchestrator } = require('../src/api/qwen-orchestrator-routes');

test('PromptExpanderEngine: decompõe objetivo de projeto em 5 fases arquiteturais com prompts detalhados', async () => {
  const expander = new PromptExpanderEngine();
  const plan = await expander.expandProjectPlan({
    name: 'Clinica Fenix',
    goal: 'Sistema de agendamento de consultas médicas com prontuário e notificações',
    repoName: 'clinica-fenix'
  });

  assert.equal(plan.projectName, 'Clinica Fenix');
  assert.equal(plan.repositoryName, 'clinica-fenix');
  assert.equal(plan.totalPhases, 5);
  assert.ok(plan.steps.length >= 5, 'Deve gerar pelo menos 5 etapas para a Action Queue');

  const stepTypes = plan.steps.map(s => s.type);
  assert.ok(stepTypes.includes('REPO_INIT'), 'Deve conter etapa de REPO_INIT');
  assert.ok(stepTypes.includes('SCAFFOLD'), 'Deve conter etapa de SCAFFOLD');
  assert.ok(stepTypes.includes('BACKEND'), 'Deve conter etapa de BACKEND');
  assert.ok(stepTypes.includes('FRONTEND'), 'Deve conter etapa de FRONTEND');
  assert.ok(stepTypes.includes('TESTS'), 'Deve conter etapa de TESTS');

  // Verifica que os prompts contém instruções concretas e nomes de arquivos
  const backendStep = plan.steps.find(s => s.type === 'BACKEND');
  assert.ok(backendStep.prompt.includes('schema.sql') || backendStep.prompt.includes('REST'), 'Prompt de backend deve especificar contratos');
  assert.ok(backendStep.filesTargeted.length > 0, 'Deve listar arquivos alvo');
});

test('QwenProjectOrchestrator: governa os 4 modos de autonomia e a Action Queue', async () => {
  const tempMemory = path.join(__dirname, '.temp-qwen-test-registry.json');
  if (fs.existsSync(tempMemory)) fs.unlinkSync(tempMemory);

  const orchestrator = new QwenProjectOrchestrator({ memoryFile: tempMemory, autonomyMode: 'padrao' });

  // 1. Modos de Autonomia
  assert.equal(orchestrator.autonomyMode, 'padrao');
  orchestrator.setMode('turbo');
  assert.equal(orchestrator.autonomyMode, 'turbo');
  orchestrator.setMode('acesso_total');
  assert.equal(orchestrator.autonomyMode, 'acesso_total');
  orchestrator.setMode('request');
  assert.equal(orchestrator.autonomyMode, 'request');
  assert.throws(() => orchestrator.setMode('modo_invalido'), /Modo inválido/);

  // 2. Planejar projeto no modo Request (tudo exige aprovação)
  const result = await orchestrator.planProject({
    name: 'Delivery Express',
    goal: 'App de pedidos de comida e entrega em tempo real'
  });

  assert.ok(result.ok);
  assert.ok(result.project.id);
  assert.equal(orchestrator.projects.length, 1);

  // No modo request, todas as etapas começam como WAITING_APPROVAL
  const queue = orchestrator.actionQueue.filter(a => a.projectId === result.project.id);
  assert.ok(queue.every(a => a.status === 'WAITING_APPROVAL'), 'No modo request todas as etapas devem aguardar aprovação');

  // 3. Aprovação de etapa
  const firstAction = queue[0];
  const approved = await orchestrator.approveAction(firstAction.id);
  assert.ok(approved.ok);
  assert.equal(approved.action.status, 'COMPLETED');

  // 4. Rejeição de etapa
  const secondAction = queue[1];
  const rejected = await orchestrator.rejectAction(secondAction.id, 'Motivo de teste');
  assert.ok(rejected.ok);
  assert.equal(rejected.action.status, 'REJECTED');

  // 5. Testar parada do loop e limpeza de timers
  await orchestrator.stop();

  // Cleanup
  if (fs.existsSync(tempMemory)) fs.unlinkSync(tempMemory);
});

test('QwenProjectOrchestrator: processa todos os Slash Commands requeridos', async () => {
  const tempMemory = path.join(__dirname, '.temp-qwen-slash-test.json');
  if (fs.existsSync(tempMemory)) fs.unlinkSync(tempMemory);

  const orchestrator = new QwenProjectOrchestrator({ memoryFile: tempMemory });

  // /goal
  const resGoal = await orchestrator.handleCommand('/goal Plataforma de Gestao de Projetos');
  assert.ok(resGoal.reply.includes('Modo Acesso Total Ativado'));
  assert.equal(orchestrator.autonomyMode, 'acesso_total');

  // /plan
  const resPlan = await orchestrator.handleCommand('/plan Marketplace de Carros Usados');
  assert.ok(resPlan.reply.includes('Plano Mestre de Arquitetura Gerado'));

  // /boost
  const resBoost = await orchestrator.handleCommand('/boost');
  assert.ok(resBoost.reply.includes('Modo Turbo Ativado'));
  assert.equal(orchestrator.autonomyMode, 'turbo');

  // /grill-me
  const resGrill = await orchestrator.handleCommand('/grill-me');
  assert.ok(resGrill.reply.includes('Navegação Híbrida'));

  // /learn
  const resLearn = await orchestrator.handleCommand('/learn');
  assert.ok(resLearn.reply.includes('Memória & Aprendizado Cognitivo'));

  // /teamwork-preview
  const resTeam = await orchestrator.handleCommand('/teamwork-preview');
  assert.ok(resTeam.reply.includes('Teamwork & Esquadrão'));

  // Para qualquer timer de loop assíncrono antes da limpeza do arquivo de memória
  await orchestrator.stop();

  // Cleanup
  if (fs.existsSync(tempMemory)) fs.unlinkSync(tempMemory);
});

test('PromptExpanderEngine: normaliza acentos e formata repositórios slugificados corretamente', async () => {
  const expander = new PromptExpanderEngine();
  const plan = await expander.expandProjectPlan({
    name: 'Clínica Médica & Gestão Hospitalar',
    goal: 'Sistema de telemedicina e prontuários'
  });

  assert.equal(plan.repositoryName, 'clinica-medica-gestao-hospitalar');
  assert.ok(!plan.repositoryName.includes('í') && !plan.repositoryName.includes('é'));
  assert.ok(!plan.repositoryName.includes('--'));
});

test('QwenBrowserBridge: status honesto e tolerância a desconexão', () => {
  const bridge = new QwenBrowserBridge();
  const status = bridge.getStatus();
  assert.equal(status.connected, false);
  assert.equal(status.mode, 'disconnected');
  assert.equal(status.activeUrl, '—');
  assert.equal(status.qwenAccount, '—');
});

test('qwen-orchestrator-routes: responde aos endpoints REST canônicos', async () => {
  function createMockResponse() {
    let statusCode = 200;
    let headers = {};
    let body = '';
    return {
      writeHead(code, h) { statusCode = code; headers = h; },
      end(data) { body = data; },
      get statusCode() { return statusCode; },
      get json() { return body ? JSON.parse(body) : null; }
    };
  }

  function sendJson(res, code, payload) {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  // GET /api/v2/qwen-orchestrator/status
  const res1 = createMockResponse();
  const handled1 = await handleQwenOrchestratorRoutes(
    { method: 'GET' },
    res1,
    new URL('http://localhost:4400/api/v2/qwen-orchestrator/status'),
    {},
    sendJson,
    async () => ({})
  );
  assert.equal(handled1, true);
  assert.equal(res1.statusCode, 200);
  assert.ok(res1.json.ok);
  assert.ok(res1.json.autonomyMode);

  // POST /api/v2/qwen-orchestrator/mode
  const res2 = createMockResponse();
  await handleQwenOrchestratorRoutes(
    { method: 'POST' },
    res2,
    new URL('http://localhost:4400/api/v2/qwen-orchestrator/mode'),
    {},
    sendJson,
    async () => ({ mode: 'turbo' })
  );
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.json.mode, 'turbo');

  // POST /api/v2/qwen-orchestrator/command
  const res3 = createMockResponse();
  await handleQwenOrchestratorRoutes(
    { method: 'POST' },
    res3,
    new URL('http://localhost:4400/api/v2/qwen-orchestrator/command'),
    {},
    sendJson,
    async () => ({ command: '/boost' })
  );
  assert.equal(res3.statusCode, 200);
  assert.ok(res3.json.reply.includes('Turbo'));

  // POST /api/v2/qwen-orchestrator/command com comando vazio retorna 400
  const res4 = createMockResponse();
  await handleQwenOrchestratorRoutes(
    { method: 'POST' },
    res4,
    new URL('http://localhost:4400/api/v2/qwen-orchestrator/command'),
    {},
    sendJson,
    async () => ({})
  );
  assert.equal(res4.statusCode, 400);
  assert.equal(res4.json.ok, false);

  // Status deve incluir array de projetos
  assert.ok(Array.isArray(res1.json.projects), 'Status deve incluir lista de projetos');

  await resetOrchestrator();
});
