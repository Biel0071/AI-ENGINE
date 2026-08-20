const test = require('node:test');
const assert = require('node:assert');
const { UnifiedEventBus } = require('../src/core/UnifiedEventBus');
const { FENIX_EVENTS, EVENT_PRIORITY } = require('../src/core/contracts/event-types');
const { ObservationEvent } = require('../src/core/contracts/observation-event');
const { Task, TASK_STATES } = require('../src/core/contracts/task');
const { SystemReconstructionScore, FunctionCoverage } = require('../src/core/contracts/dna-types');

test('M1: UnifiedEventBus — Startup, Exact, Wildcard & Global Subscriptions', async () => {
  const bus = new UnifiedEventBus();
  await bus.start();

  const health = await bus.health();
  assert.strictEqual(health.ok, true);

  const exactEvents = [];
  const wildcardAgentEvents = [];
  const globalEvents = [];

  // 1. Exact subscription
  bus.on(FENIX_EVENTS.PROJECT_OPENED, (evt) => {
    exactEvents.push(evt);
  });

  // 2. Wildcard subscription
  bus.on('agent.*', (evt) => {
    wildcardAgentEvents.push(evt);
  });

  // 3. Global subscription
  bus.on('*', (evt) => {
    globalEvents.push(evt);
  });

  // Emit events
  await bus.emit(FENIX_EVENTS.PROJECT_OPENED, { projectId: 'prj_1', name: 'Sistema Lovable' });
  await bus.emit(FENIX_EVENTS.AGENT_STARTED, { agentId: 'ag_frontend', role: 'Frontend' });
  await bus.emit(FENIX_EVENTS.AGENT_FINISHED, { agentId: 'ag_frontend', durationMs: 120 });
  await bus.emit(FENIX_EVENTS.BUILD_SUCCESS, { buildId: 'bld_99' });

  assert.strictEqual(exactEvents.length, 1);
  assert.strictEqual(exactEvents[0].payload.projectId, 'prj_1');

  assert.strictEqual(wildcardAgentEvents.length, 2);
  assert.strictEqual(wildcardAgentEvents[0].type, FENIX_EVENTS.AGENT_STARTED);
  assert.strictEqual(wildcardAgentEvents[1].type, FENIX_EVENTS.AGENT_FINISHED);

  // Global should capture device connected (from start) + 4 emitted events
  assert.strictEqual(globalEvents.length >= 4, true);

  // History filtering
  const agentHistory = bus.history({ prefix: 'agent.' });
  assert.strictEqual(agentHistory.length, 2);

  await bus.stop();
});

test('M1: ObservationEvent — Schema Validation, Causality & Serialization', () => {
  const obs = new ObservationEvent({
    sessionId: 'ses_100',
    projectId: 'prj_ecommerce',
    actor: 'agent:Frontend',
    action: 'MODIFY_COMPONENT_STYLE',
    target: {
      visual: 'button#checkout',
      component: 'CheckoutButton',
      file: 'src/components/CheckoutButton.tsx',
      line: 42
    },
    beforeState: { styles: { marginLeft: '20px' }, width: 320 },
    afterState: { styles: { marginLeft: '40px' }, width: 360 },
    visualState: { screenshotHash: 'sha256:abc1234', domHash: 'sha256:def5678' },
    codeState: { gitDiff: '+ margin-left: 40px;', commitHash: 'c0ffee1' },
    runtimeState: { status: 'ONLINE', port: 3000, errors: [] },
    result: { visualMatchDelta: '+4.2%', buildStatus: 'PASSED', score: 98 },
    causality: {
      reason: 'Alinhar botão de checkout com o grid do card',
      problemDetected: 'Desalinhamento no viewport desktop',
      solutionValidation: 'Passou no layout test'
    }
  });

  const json = obs.toJSON();
  assert.strictEqual(json.sessionId, 'ses_100');
  assert.strictEqual(json.action, 'MODIFY_COMPONENT_STYLE');
  assert.strictEqual(json.target.component, 'CheckoutButton');
  assert.strictEqual(json.result.buildStatus, 'PASSED');
  assert.strictEqual(json.causality.reason, 'Alinhar botão de checkout com o grid do card');
});

test('M1: Task Contract — 7-State Lifecycle Machine & Validation', () => {
  const task = new Task({
    projectId: 'prj_fenix',
    title: 'Recriar Frontend',
    objective: 'Reconstruir componentes com Tailwind tokens'
  });

  assert.strictEqual(task.state, TASK_STATES.QUEUED);

  task.transition(TASK_STATES.PLANNING, 'Analisando dependências');
  assert.strictEqual(task.state, TASK_STATES.PLANNING);

  task.transition(TASK_STATES.RUNNING, 'Executando geração de código');
  assert.strictEqual(task.state, TASK_STATES.RUNNING);

  task.transition(TASK_STATES.COMPLETED, 'Todos os arquivos gerados');
  assert.strictEqual(task.state, TASK_STATES.COMPLETED);
  assert.strictEqual(task.progress, 100);
  assert.strictEqual(typeof task.completedAt, 'string');
});

test('M1: DNA Types — SystemReconstructionScore & FunctionCoverage Formulas', () => {
  const score = new SystemReconstructionScore({
    functionalMatch: 96,
    visualMatch: 91,
    apiMatch: 100,
    databaseMatch: 100,
    componentCoverage: 94,
    routeCoverage: 100,
    testCoverage: 87
  });

  const scoreJson = score.toJSON();
  assert.strictEqual(typeof scoreJson.overallScore, 'number');
  assert.strictEqual(scoreJson.overallScore >= 90, true);
  assert.strictEqual(scoreJson.passed, true);

  const funcCoverage = new FunctionCoverage({
    totalFunctions: 326,
    preserved: 318,
    reconstructed: 6,
    pending: 2
  });

  const coverageJson = funcCoverage.toJSON();
  assert.strictEqual(coverageJson.totalFunctions, 326);
  assert.strictEqual(coverageJson.coveragePct, 99.39);
  assert.strictEqual(coverageJson.passed, true);
});
