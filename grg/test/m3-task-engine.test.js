const test = require('node:test');
const assert = require('node:assert');
const { TaskEngine } = require('../src/execution/task-engine');
const { PermissionMatrix, COMMAND_CLASSIFICATION } = require('../src/execution/permission-matrix');
const { UnifiedEventBus } = require('../src/core/UnifiedEventBus');
const { AgentRuntime } = require('../src/runtime/agent-runtime');
const { FENIX_AGENTS } = require('../src/agents/agent-definitions');
const { TASK_STATES } = require('../src/core/contracts/task');

test('M3: PermissionMatrix — Command Classification & Secret Redaction', () => {
  const pm = new PermissionMatrix();

  // 1. Safe commands
  assert.strictEqual(pm.classifyCommand('npm run build').classification, COMMAND_CLASSIFICATION.SAFE);
  assert.strictEqual(pm.classifyCommand('git status').classification, COMMAND_CLASSIFICATION.SAFE);

  // 2. Warning commands
  assert.strictEqual(pm.classifyCommand('npm install axios').classification, COMMAND_CLASSIFICATION.WARNING);

  // 3. Dangerous commands
  const dangerous1 = pm.classifyCommand('rm -rf /');
  assert.strictEqual(dangerous1.classification, COMMAND_CLASSIFICATION.DANGEROUS);
  assert.strictEqual(dangerous1.allowed, false);

  const dangerous2 = pm.classifyCommand('git push origin main --force');
  assert.strictEqual(dangerous2.classification, COMMAND_CLASSIFICATION.DANGEROUS);
  assert.strictEqual(dangerous2.allowed, false);

  // 4. Secret Redaction
  const sensitiveText = 'Connecting with api_key=sk-proj-1234567890abcdefghijklmn and password: supersecretpassword123';
  const redacted = pm.redactSecrets(sensitiveText);
  assert.strictEqual(redacted.includes('sk-proj-1234567890abcdefghijklmn'), false);
  assert.strictEqual(redacted.includes('[REDACTED_SECRET]'), true);
});

test('M3: TaskEngine — DAG Decomposition, Dependency Graph & Multi-Agent Execution', async () => {
  const bus = new UnifiedEventBus();
  await bus.start();

  const runtime = new AgentRuntime({ eventBus: bus });
  await runtime.start();

  const engine = new TaskEngine({ eventBus: bus, agentRuntime: runtime });
  await engine.start();

  // Decompose Goal: Build CRM Frontend
  // Subtask 0: Research -> Subtask 1: Frontend (depends on 0) -> Subtask 2: Testing (depends on 1)
  const tasks = await engine.decomposeGoal({
    projectId: 'prj_crm',
    goal: 'Criar tela de leads do CRM',
    subtasks: [
      {
        title: 'Pesquisar schema de leads',
        assignedAgent: FENIX_AGENTS.RESEARCH,
        dependsOnIndices: []
      },
      {
        title: 'Construir componente LeadsTable',
        assignedAgent: FENIX_AGENTS.FRONTEND,
        dependsOnIndices: [0]
      },
      {
        title: 'Executar testes de renderização',
        assignedAgent: FENIX_AGENTS.TESTING,
        dependsOnIndices: [1]
      }
    ]
  });

  assert.strictEqual(tasks.length, 3);
  const [t0, t1, t2] = tasks;

  // Task 0 can run immediately
  assert.strictEqual(engine.canRun(t0.id), true);
  // Task 1 cannot run yet (depends on t0)
  assert.strictEqual(engine.canRun(t1.id), false);
  // Task 2 cannot run yet (depends on t1)
  assert.strictEqual(engine.canRun(t2.id), false);

  // Run Task 0
  await engine.runTask(t0.id);
  assert.strictEqual(t0.state, TASK_STATES.COMPLETED);

  // Now Task 1 can run
  assert.strictEqual(engine.canRun(t1.id), true);
  await engine.runTask(t1.id);
  assert.strictEqual(t1.state, TASK_STATES.COMPLETED);

  // Now Task 2 can run
  assert.strictEqual(engine.canRun(t2.id), true);
  await engine.runTask(t2.id);
  assert.strictEqual(t2.state, TASK_STATES.COMPLETED);

  // Verify full project task history
  const projectTasks = engine.listByProject('prj_crm');
  assert.strictEqual(projectTasks.length, 3);
  assert.strictEqual(projectTasks.every(t => t.state === TASK_STATES.COMPLETED), true);

  await engine.stop();
  await runtime.stop();
  await bus.stop();
});
