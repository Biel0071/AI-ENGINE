'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { FenixHeart, TelemetryBus } = require('../src/runtime/fenix-heart');
const { AIRouter, LANES } = require('../src/ai-runtime/ai-router');
const { AIGateway } = require('../src/ai-runtime/ai-gateway');
const { EchoProvider } = require('../src/ai-runtime/providers');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');

function createTestHarness(options = {}) {
  const store = new MemoryStore();
  store.state.users.push({ id: 'grg-admin', name: 'GRG Admin', status: 'active', createdAt: new Date().toISOString() });
  store.state.tenants.push({
    id: 'grg',
    name: 'GRG FÊNIX',
    status: 'active',
    createdAt: new Date().toISOString(),
    tokenBudget: { total: options.tokenBudget ?? 100_000, spent: 0, reserved: 0 }
  });
  store.state.memberships.push({
    tenantId: 'grg',
    userId: 'grg-admin',
    role: 'master_admin',
    status: 'active',
    createdAt: new Date().toISOString()
  });
  store.state.agentHandoffs = [];
  store.state.distilledPatterns = [];

  const bus = new EventBus();
  const cp = new ControlPlane({ store, bus });
  const echo = new EchoProvider();
  const failingProvider = {
    complete: async () => { throw new Error('Primary provider network timeout'); },
    stream: async () => { throw new Error('Primary provider stream timeout'); }
  };

  const providers = {
    echo,
    failing: failingProvider,
    ...(options.extraProviders || {})
  };

  const routes = {
    default: { provider: 'echo', model: 'echo-small', fallback: [{ provider: 'echo', model: 'echo-large' }] },
    fast: { provider: 'echo', model: 'echo-small' },
    standard: { provider: 'echo', model: 'echo-large' },
    deep: { provider: 'echo', model: 'echo-large' },
    fail_route: { provider: 'failing', model: 'failing-model', fallback: [{ provider: 'echo', model: 'echo-small' }] }
  };

  const aiGateway = new AIGateway({ store, bus, controlPlane: cp, providers, routes });

  const mockConnectors = {
    list: () => ['ai:echo', 'ai:local'],
    connectors: new Map([
      ['ai:echo', { models: () => ({ state: 'measured', value: ['echo-small', 'echo-large'] }) }],
      ['ai:local', { models: () => ({ state: 'measured', value: ['qwen2.5:3b'] }) }]
    ]),
    status: async () => ({ state: { value: 'CONNECTED' } })
  };

  const aiRouter = new AIRouter({ connectors: mockConnectors, gateway: aiGateway, store });

  const app = {
    store,
    bus,
    controlPlane: cp,
    aiGateway,
    aiRouter,
    jobs: {
      recoverStale: async (staleMs) => 1,
      runBatch: async () => [],
      tick: async () => []
    },
    health: {
      check: async () => ({ ok: true, status: 'healthy', checks: { database: { ok: true } } })
    }
  };

  const heart = new FenixHeart({
    app,
    store,
    bus,
    controlPlane: cp,
    aiGateway,
    aiRouter,
    intervalMs: 50
  });

  return { store, bus, cp, aiGateway, aiRouter, heart, app };
}

test('TEST 1: Heart inicia e registra status ONLINE', async () => {
  const { heart } = createTestHarness();
  assert.equal(heart.status, 'STOPPED');
  heart.start();
  assert.equal(heart.status, 'ONLINE');
  assert.ok(heart.startedAt);
  await heart.stop();
  assert.equal(heart.status, 'STOPPED');
});

test('TEST 2: Heartbeat continua e mede metricas sem chamar LLM', async () => {
  const { heart, store } = createTestHarness();
  heart.start();

  await new Promise((r) => setTimeout(r, 120));
  const snap = await heart.tick();

  assert.ok(snap.beat >= 1);
  assert.equal(typeof snap.cpuPercent, 'number');
  assert.ok(snap.ramMb > 0);
  assert.equal(snap.status, 'ONLINE');
  assert.ok(snap.uptimeSeconds >= 0);

  // Verificacao crucial: nenhuma chamada de AI foi feita pelo heartbeat
  const state = await store.read();
  assert.equal(state.aiCalls.length, 0, 'Heartbeat must NEVER call LLM');

  await heart.stop();
});

test('TEST 3: Telemetria em tempo real registra eventos no TelemetryBus', async () => {
  const { heart } = createTestHarness();
  const captured = [];
  heart.telemetryBus.on('telemetry', (e) => captured.push(e));

  heart.telemetryBus.record({ type: 'agent.tool.call', tool: 'filesystem.write', path: 'test.js' });
  heart.telemetryBus.record({ type: 'job.created', jobId: 'job-123' });

  assert.equal(captured.length, 2);
  assert.equal(captured[0].tool, 'filesystem.write');
  assert.equal(captured[1].jobId, 'job-123');

  const recent = heart.telemetryBus.getRecent(10);
  assert.ok(recent.length >= 2);
});

test('TEST 4: Fast Lane responde rapidamente a consultas determinísticas', async () => {
  const { heart } = createTestHarness();
  heart.start();
  await heart.tick();

  const statusRes = await heart.resolveFast('status?');
  assert.equal(statusRes.source, 'LOCAL_RULE');
  assert.ok(statusRes.resolution.includes('FÊNIX Heart is ONLINE'));
  assert.equal(statusRes.tokensUsed, 0);

  const jobsRes = await heart.resolveFast('qual job está rodando?');
  assert.equal(jobsRes.source, 'LOCAL_RULE');
  assert.ok(jobsRes.resolution.includes('Nenhum job rodando'));

  const toolsRes = await heart.resolveFast('qual ferramenta usar?');
  assert.equal(toolsRes.source, 'LOCAL_RULE');
  assert.ok(toolsRes.resolution.includes('filesystem.write'));

  await heart.stop();
});

test('TEST 5: Fast Lane não chama API para tarefas determinísticas (zero tokens, zero custo)', async () => {
  const { heart, store } = createTestHarness();

  const res = await heart.resolveFast('status');
  assert.equal(res.source, 'LOCAL_RULE');
  assert.equal(res.costUsd, 0);
  assert.equal(res.tokensUsed, 0);

  const state = await store.read();
  assert.equal(state.aiCalls.length, 0);
});

test('TEST 6: Scheduler dispara tarefas agendadas reais', async () => {
  const { heart } = createTestHarness();
  let ranCount = 0;

  heart.scheduleTask({
    id: 'test.schedule',
    type: 'MAINTENANCE',
    intervalMs: 10,
    run: async () => { ranCount++; }
  });

  heart.start();
  await new Promise((r) => setTimeout(r, 60));
  await heart.stop();

  assert.ok(ranCount >= 1, `Schedule should run at least once, ran ${ranCount} times`);
  const schedules = heart.listSchedules();
  assert.ok(schedules.some((s) => s.id === 'test.schedule'));
});

test('TEST 7: Timers disparam evento TIMER_TRIGGERED com payload', async () => {
  const { heart, bus } = createTestHarness();
  let triggeredEvent = null;
  bus.on('timer.triggered', (e) => { triggeredEvent = e.payload || e; });

  let actionExecuted = false;
  const timer = heart.createTimer({
    id: 'timer-alert',
    delayMs: 20,
    payload: { alert: 'backup_now' },
    action: async () => { actionExecuted = true; }
  });

  assert.equal(timer.status, 'ACTIVE');
  heart.start();

  await new Promise((r) => setTimeout(r, 80));
  await heart.stop();

  assert.equal(actionExecuted, true);
  assert.ok(triggeredEvent);
  assert.equal(triggeredEvent.timerId, 'timer-alert');
});

test('TEST 8: Fila de jobs reflete no snapshot do Heartbeat', async () => {
  const { heart, store } = createTestHarness();
  heart.start();
  await store.update((state) => {
    state.runtimeJobs = [
      { id: 'j1', status: 'QUEUED' },
      { id: 'j2', status: 'RUNNING' }
    ];
    return state;
  });

  const snap = await heart.tick();
  assert.equal(snap.queue.queued, 1);
  assert.equal(snap.queue.running, 1);
  assert.equal(snap.jobs, 2);
  await heart.stop();
});

test('TEST 9: Modelo local executa na Fast Lane', async () => {
  const { aiRouter } = createTestHarness();
  const classified = aiRouter.classifyTask('corrija esse typo na linha 3');
  assert.equal(classified.lane, 'fast');
  assert.equal(classified.estimatedComplexity, 'LOW');

  const result = await aiRouter.invoke('grg', 'grg-admin', {
    taskType: classified.taskType,
    lane: 'fast',
    prompt: 'corrija esse typo'
  });
  assert.ok(result.text);
  assert.equal(result.lane, 'fast');
});

test('TEST 10: Modelo maior é acionado para tarefas complexas (Standard/Deep)', async () => {
  const { aiRouter } = createTestHarness();

  const standardTask = aiRouter.classifyTask('crie uma função para calcular hashes sha256 com testes');
  assert.equal(standardTask.lane, 'standard');
  assert.equal(standardTask.estimatedComplexity, 'MEDIUM');

  const deepTask = aiRouter.classifyTask('refatorar arquitetura inteira do sistema distribuido com analise de resiliencia');
  assert.equal(deepTask.lane, 'deep');
  assert.equal(deepTask.estimatedComplexity, 'HIGH');
});

test('TEST 11: Fallback funciona quando provedor primário falha', async () => {
  const { aiGateway } = createTestHarness();

  // fail_route aponta para provider 'failing', com fallback em 'echo'
  const result = await aiGateway.invoke('grg', 'grg-admin', {
    taskType: 'fail_route',
    prompt: 'teste com erro forcado'
  });

  assert.ok(result.text);
  assert.equal(result.provider, 'echo');
});

test('TEST 12: Memory registra aprendizado e destila padrões reusáveis', async () => {
  const { heart } = createTestHarness();

  const pattern = heart.distillJob(
    { id: 'job-fix-1', type: 'bugfix', prompt: 'corrigir sintaxe node:test' },
    { testsPassed: true, toolCalls: [{ tool: 'filesystem.write' }] }
  );

  assert.ok(pattern);
  assert.ok(pattern.id.startsWith('pattern-'));
  assert.ok(pattern.trigger.includes('corrigir sintaxe'));

  const memoryRes = await heart.resolveFast('como posso corrigir sintaxe node:test?');
  assert.equal(memoryRes.source, 'MEMORY');
  assert.ok(memoryRes.resolution.includes('Solution distilled'));
});

test('TEST 13: Cache evita chamadas repetidas de provedor', async () => {
  const { aiGateway, store } = createTestHarness();

  const res1 = await aiGateway.invoke('grg', 'grg-admin', { taskType: 'fast', prompt: 'prompt identico' });
  assert.equal(res1.cached, false);

  const res2 = await aiGateway.invoke('grg', 'grg-admin', { taskType: 'fast', prompt: 'prompt identico' });
  assert.equal(res2.cached, true);

  const state = await store.read();
  const cachedCall = state.aiCalls[state.aiCalls.length - 1];
  assert.equal(cachedCall.cached, true);
  assert.equal(cachedCall.promptTokens, 0);
});

test('TEST 14: Safe Shutdown persiste snapshot de estado', async () => {
  const { heart, store } = createTestHarness();
  heart.start();
  heart.addActivity({ title: 'Deploy nightly build' });
  heart.distillJob({ id: 'job-test', type: 'test' }, { testsPassed: true });

  await heart.stop();

  const state = await store.read();
  assert.ok(state.heartSnapshot);
  assert.ok(state.heartSnapshot.stoppedAt);
  assert.equal(state.heartSnapshot.distilledPatterns.length, 1);
  assert.equal(state.heartSnapshot.activities.length, 1);
});

test('TEST 15: Restart recupera estado e recupera jobs interrompidos', async () => {
  const { heart, store } = createTestHarness();
  await store.update((state) => {
    state.heartSnapshot = {
      stoppedAt: new Date().toISOString(),
      distilledPatterns: [{ id: 'p1', trigger: 'erro recovered', solution: 'solucao pronta' }],
      activities: [{ id: 'act-1', title: 'Atividade recuperada' }]
    };
    return state;
  });

  const recovery = await heart.recover();
  assert.equal(recovery.recovered, true);
  assert.equal(recovery.staleJobsRecovered, 1);
  assert.equal(recovery.distilledPatternsLoaded, 1);
  assert.equal(heart.listActivities().length, 1);
});

test('TEST 16: API Budget e proteção contra consumo excessivo', async () => {
  const { aiGateway } = createTestHarness({ tokenBudget: 10 });

  // Tentar chamada com prompt maior que o budget de 10 tokens deve falhar honestamente
  await assert.rejects(async () => {
    await aiGateway.invoke('grg', 'grg-admin', {
      taskType: 'deep',
      prompt: 'este e um prompt muito longo que ultrapassa facilmente o orcamento de dez tokens alocado'
    });
  }, /budget exhausted/i);
});

test('TEST 17: Cascade escala automaticamente (Fast -> Standard -> Deep)', async () => {
  const { aiRouter } = createTestHarness();

  let attemptsChecked = [];
  const cascadeRes = await aiRouter.cascade('grg', 'grg-admin', { prompt: 'tarefa cascata' }, async (text, lane) => {
    attemptsChecked.push(lane);
    // Forçar falha no Fast, permitir no Standard
    if (lane === 'fast') return { valid: false, error: 'fast lane output insufficient' };
    return { valid: true };
  });

  assert.equal(cascadeRes.lane, 'standard');
  assert.equal(cascadeRes.cascaded, true);
  assert.deepEqual(attemptsChecked, ['fast', 'standard']);
});
