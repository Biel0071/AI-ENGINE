'use strict';
/**
 * FÊNIX OS — LEVEL 26: AUTONOMOUS EVOLUTION LOOP
 * ===============================================
 * Canonical Test Suite for Continuous Autonomous Operations
 *
 * 1. Full 10-step Autonomous Evolution Cycle (OBSERVE -> REPEAT)
 * 2. Evidence-Based Task Generation with Canonical Contract & Deduplication
 * 3. Dynamic DAG Decomposition of Multi-Screen/Component Tasks
 * 4. Multi-Agent Team Allocation via AgentRegistry with Factual Telemetry
 * 5. Autonomous Governance: Concurrency, Budget, Circuit Breaker, Human Approval Gate
 * 6. MANDATORY REALITY TEST (Section 13): Controlled Fault -> Patch -> Test Pass -> Deduplication on Cycle 2
 * 7. Soak Simulation & Persistent State Recovery (AUTONOMOUS_EVOLUTION_STATE.json)
 * 8. Zero-Mock Telemetry & Operations Snapshot Contract
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { AutonomousEvolutionEngine } = require('../src/evolution/autonomous-evolution-engine');
const { TaskGenerationEngine } = require('../src/evolution/task-generation-engine');
const { AutonomousGovernanceGuard } = require('../src/evolution/autonomous-governance-guard');
const { AgentRegistry } = require('../src/agents/agent-registry');
const { EvolutionMemory } = require('../src/evolution/evolution-memory');
const { PatternLibrary } = require('../src/memory/pattern-library');

// Arquivo de estado temporário para isolamento dos testes
const TEST_STATE_FILE = path.join(__dirname, 'test-level26-state.json');

function cleanupTestState() {
  if (fs.existsSync(TEST_STATE_FILE)) {
    try { fs.unlinkSync(TEST_STATE_FILE); } catch (_) {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Full 10-Step Autonomous Cycle
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 1: Full 10-step autonomous cycle executes cleanly without browser/setInterval', async (t) => {
  cleanupTestState();
  t.after(cleanupTestState);

  const engine = new AutonomousEvolutionEngine({
    statePersistPath: TEST_STATE_FILE,
    intervalMs: 1000
  });

  // Registra um discoverer que fornece uma tarefa concreta de teste
  engine.registerDiscoverer(async () => [
    {
      source: 'test_discovery',
      projectId: 'test-project-alpha',
      title: 'Otimizar índices de consulta de telemetria',
      description: 'Adicionar índices compostos para reduzir latência de 120ms para 15ms',
      priority: 'P2',
      risk: 'LOW',
      impact: 'HIGH',
      requiredSkills: ['database', 'backend'],
      estimatedCost: 0.005,
      acceptanceCriteria: ['Índices criados e verificados'],
      evidence: { queryTimeMs: 120, targetTimeMs: 15 }
    }
  ]);

  const result = await engine.runCycle();

  assert.strictEqual(result.ok, true, 'Ciclo deve completar com sucesso');
  assert.ok(result.cycle, 'Registro de ciclo deve existir');
  assert.strictEqual(result.cycle.step, 'COMPLETE', 'Passo final deve ser COMPLETE');
  assert.strictEqual(result.cycle.discoveriesCount, 1, 'Deve registrar 1 descoberta');
  assert.strictEqual(result.cycle.tasksCreatedCount, 1, 'Deve criar 1 tarefa');
  assert.strictEqual(result.cycle.tasksCompletedCount, 1, 'Deve completar 1 tarefa');
  assert.strictEqual(engine.cycleCount, 1, 'Contador de ciclos deve ser incrementado');
  assert.ok(engine.lastCycleDurationMs >= 0, 'Duração do ciclo deve ser medida');

  // Verifica que o estado persistente foi salvo
  assert.strictEqual(fs.existsSync(TEST_STATE_FILE), true, 'Arquivo de estado deve ser salvo em disco');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Evidence-Based Task Generation Contract & Deduplication
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 2: Evidence-based task generation with canonical contract and problemHash deduplication', (t) => {
  const taskEngine = new TaskGenerationEngine();

  const discovery = {
    source: 'code_analyzer',
    projectId: 'core-api',
    title: 'Tratar exceção não capturada no conector Redis',
    description: 'Conexão rejeitada causa crash do processo',
    priority: 'P1',
    risk: 'HIGH',
    impact: 'HIGH',
    estimatedCost: 0.008,
    requiredSkills: ['backend', 'reliability'],
    acceptanceCriteria: ['Adicionar handler de reconexão resiliente com backoff'],
    evidence: { exception: 'ECONNREFUSED', file: 'redis-client.js', line: 42 }
  };

  // Primeira inserção
  const res1 = taskEngine.createTask(discovery);
  assert.strictEqual(res1.deduplicated, false, 'Primeira tarefa não deve ser deduplicada');
  assert.ok(res1.task.taskId, 'Deve ter taskId gerado');
  assert.strictEqual(res1.task.priority, 'P1');
  assert.strictEqual(res1.task.risk, 'HIGH');
  assert.strictEqual(res1.task.impact, 'HIGH');
  assert.ok(res1.task.problemHash, 'Deve conter problemHash');
  assert.strictEqual(res1.task.status, 'DISCOVERED');

  // Segunda inserção com mesma evidência e problema
  const res2 = taskEngine.createTask(discovery);
  assert.strictEqual(res2.deduplicated, true, 'Segunda tarefa idêntica DEVE ser deduplicada');
  assert.strictEqual(res2.task.taskId, res1.task.taskId, 'Deve referenciar a tarefa existente');

  // Simular conclusão da tarefa
  taskEngine.updateTaskStatus(res1.task.taskId, 'COMPLETED', { message: 'Corrigido' });

  // Se o problema reaparecer (regressão), reabre a tarefa
  const res3 = taskEngine.createTask({ ...discovery, isRegression: true });
  assert.strictEqual(res3.isRegression, true, 'Tarefa concluída com reincidência deve ser reaberta');
  assert.strictEqual(res3.task.status, 'REOPENED', 'Status deve mudar para REOPENED');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Dynamic DAG Decomposition of Multi-Screen Tasks
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 3: Dynamic DAG decomposition of multi-screen and multi-component tasks', (t) => {
  const taskEngine = new TaskGenerationEngine();

  const parentDiscovery = {
    source: 'ux_auditor',
    projectId: 'portal-app',
    title: 'Auditoria de formulários incompletos em 4 telas',
    description: '4 telas do portal possuem validações de formulário ausentes',
    priority: 'P2',
    risk: 'MEDIUM',
    impact: 'MEDIUM',
    requiredSkills: ['frontend'],
    acceptanceCriteria: ['Todas as 4 telas devem validar dados antes do submit'],
    evidence: { affectedViews: ['login', 'checkout', 'profile', 'settings'] }
  };

  const { task: parentTask } = taskEngine.createTask(parentDiscovery);

  const subtasks = [
    { title: 'Validação de login', screen: 'login', requiredSkills: ['frontend'], estimatedCost: 0.002 },
    { title: 'Validação de checkout', screen: 'checkout', requiredSkills: ['frontend'], estimatedCost: 0.003 },
    { title: 'Validação de profile', screen: 'profile', requiredSkills: ['frontend'], estimatedCost: 0.002 },
    { title: 'Validação de settings', screen: 'settings', requiredSkills: ['frontend'], estimatedCost: 0.002 }
  ];

  const dagResult = taskEngine.decomposeIntoDag(parentTask, subtasks);

  assert.strictEqual(dagResult.nodes.length, 5, 'Deve gerar exatamente 5 nós (1 raiz + 4 subtarefas)');
  assert.strictEqual(parentTask.status, 'PLANNED', 'Tarefa pai deve entrar em PLANNED');

  // Cada subtarefa deve referenciar a tarefa pai como dependência
  const subtasksInDag = dagResult.nodes.filter(n => n.taskId !== parentTask.taskId);
  for (const st of subtasksInDag) {
    assert.ok(st.dependencies.includes(parentTask.taskId), 'Subtarefa deve depender da tarefa pai');
  }

  // Verifica geração da representação DAG
  const dag = taskEngine.getDag();
  assert.ok(dag.nodes.length >= 5, 'DAG deve conter o nó pai e as 4 subtarefas');
  assert.ok(dag.edges.length >= 4, 'DAG deve conter as 4 arestas de dependência');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Multi-Agent Team Allocation via AgentRegistry with Factual Telemetry
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 4: Multi-agent team allocation via AgentRegistry with skills, cost, and factual telemetry', (t) => {
  const registry = new AgentRegistry();

  // Buscar agente para tarefa de arquitetura
  const archAgent = registry.findBestAgentForTask({
    requiredSkills: ['architecture'],
    priority: 'P1',
    estimatedCost: 0.01,
    projectId: 'fenix-core'
  });
  assert.ok(archAgent, 'Deve encontrar agente de arquitetura');
  assert.ok(archAgent.id, 'Deve ter ID');

  // Buscar agente para tarefa de banco de dados
  const dbAgent = registry.findBestAgentForTask({
    requiredSkills: ['database'],
    priority: 'P2',
    estimatedCost: 0.005,
    projectId: 'fenix-core'
  });
  assert.ok(dbAgent, 'Deve encontrar especialista em banco de dados');
  assert.ok(dbAgent.id, 'Deve ter ID');

  // Mudança de disponibilidade real
  registry.setAvailability(archAgent.id, 'WORKING', { taskId: 'task-test-101' });
  const updatedArch = registry.get(archAgent.id);
  assert.strictEqual(updatedArch.availability, 'WORKING');
  assert.strictEqual(updatedArch.currentTaskId, 'task-test-101');

  // Registro de resultado de tarefa e cálculo de taxa de sucesso e duração média factual
  registry.recordTaskResult(archAgent.id, {
    taskId: 'task-test-101',
    success: true,
    durationMs: 1200,
    tokensUsed: 1500,
    costUsd: 0.003
  });

  const roster = registry.getAgentRoster();
  const archInRoster = roster.find(a => a.id === archAgent.id);
  assert.strictEqual(archInRoster.tasksCompleted, 1);
  assert.strictEqual(archInRoster.tasksFailed, 0);
  assert.strictEqual(archInRoster.successRate, 1.0, 'Taxa de sucesso deve ser 100% após 1 sucesso');
  assert.strictEqual(archInRoster.averageDurationMs, 1200, 'Duração média deve ser calculada factualmente');
  assert.strictEqual(archInRoster.availability, 'AVAILABLE', 'Agente deve voltar a AVAILABLE');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Autonomous Governance Guard: Concurrency, Budgets, and Human Gate
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 5: Autonomous Governance Guard blocks critical actions via Human Approval Gate', (t) => {
  const guard = new AutonomousGovernanceGuard({
    maxConcurrency: 2,
    maxCostUsdPerPeriod: 5.0
  });

  // Tarefa comum de refatoração: não deve exigir aprovação humana
  const routineTask = {
    taskId: 'task-safe-01',
    actionType: 'CODE_REFACTOR',
    risk: 'LOW',
    projectId: 'fenix-app'
  };
  const safeCheck = guard.evaluateHumanApproval(routineTask);
  assert.strictEqual(safeCheck.requiresApproval, false, 'Refatoração rotineira não requer aprovação');

  // Tarefas críticas obrigatórias: DEPLOY_PRODUCTION, DELETE_DATA, DESTRUCTIVE_MIGRATION
  const criticalActions = ['DEPLOY_PRODUCTION', 'DELETE_DATA', 'DESTRUCTIVE_MIGRATION', 'ROTATE_CREDENTIALS'];

  for (const action of criticalActions) {
    const criticalTask = {
      taskId: `task-crit-${action}`,
      actionType: action,
      risk: 'HIGH',
      projectId: 'production'
    };
    const critCheck = guard.evaluateHumanApproval(criticalTask);
    assert.strictEqual(critCheck.requiresApproval, true, `Ação crítica ${action} DEVE requerer aprovação humana`);
    assert.ok(critCheck.reasons.length > 0);
  }

  // Teste de Aprovação e Rejeição Humana
  guard.approveTask('task-crit-DEPLOY_PRODUCTION', 'supervisor-admin', 'Aprovado para release');
  assert.strictEqual(guard.isApproved('task-crit-DEPLOY_PRODUCTION'), true, 'Tarefa aprovada deve retornar true');

  guard.rejectTask('task-crit-DELETE_DATA', 'supervisor-admin', 'Risco inaceitável');
  assert.strictEqual(guard.isApproved('task-crit-DELETE_DATA'), false, 'Tarefa rejeitada não pode ser aprovada');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: MANDATORY REALITY TEST (Section 13)
// Real Fault Injection -> Task Generation -> Agent Fix -> Real Test Pass -> Zero Duplication on Cycle 2
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 6: MANDATORY REALITY TEST: Fault Injection -> Fix -> Test -> Clean 2nd Cycle', async (t) => {
  cleanupTestState();
  t.after(cleanupTestState);

  // 1. Cria workspace de teste isolado com arquivo com falha proposital
  const fixtureDir = path.join(__dirname, 'fixtures', 'isolated-sample-project');
  fs.mkdirSync(fixtureDir, { recursive: true });

  const targetCodeFile = path.join(fixtureDir, 'calculator.js');
  const testScriptFile = path.join(fixtureDir, 'calculator.test.js');

  // Código com falha proposital: subtração em vez de adição
  fs.writeFileSync(targetCodeFile, `function add(a, b) {\n  return a - b; // BUG INTENCIONAL\n}\nmodule.exports = { add };\n`, 'utf8');

  // Teste automatizado real que falha na presença do bug
  fs.writeFileSync(testScriptFile, `const assert = require('assert');\nconst { add } = require('./calculator');\nassert.strictEqual(add(2, 3), 5, 'add(2, 3) deve ser 5');\nconsole.log('CALCULATOR TEST PASSED');\n`, 'utf8');

  t.after(() => {
    try {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    } catch (_) {}
  });

  // Verifica que o teste REALMENTE falha antes da correção
  let initialTestFailed = false;
  try {
    execFileSync(process.execPath, [testScriptFile], { stdio: 'pipe' });
  } catch (err) {
    initialTestFailed = true;
  }
  assert.strictEqual(initialTestFailed, true, 'O teste DEVE falhar inicialmente para validar o loop');

  // Inicializa o AutonomousEvolutionEngine
  const engine = new AutonomousEvolutionEngine({
    statePersistPath: TEST_STATE_FILE,
    workspaceRoot: fixtureDir
  });

  // Registra Discoverer que inspeciona o projeto e detecta o teste quebrado
  engine.registerDiscoverer(async () => {
    try {
      execFileSync(process.execPath, [testScriptFile], { stdio: 'pipe' });
      return []; // Teste passou, nenhuma falha encontrada
    } catch (err) {
      return [
        {
          source: 'test_runner',
          projectId: 'sample-project',
          title: 'Corrigir falha em calculator.js detectada por calculator.test.js',
          description: 'Função add(a, b) falhou na asserção de soma',
          priority: 'P1',
          risk: 'LOW',
          impact: 'HIGH',
          targetFiles: [targetCodeFile],
          testCommand: `"${process.execPath}" "${testScriptFile}"`,
          requiredSkills: ['backend'],
          acceptanceCriteria: ['O teste calculator.test.js deve passar sem erros'],
          evidence: { testScript: testScriptFile, error: err.message },
          // Custom executor que aplica a correção real no arquivo
          customExecutor: async (task, agent) => {
            const fixedCode = `function add(a, b) {\n  return a + b; // CORRIGIDO PELO AGENTE DE EVOLUÇÃO\n}\nmodule.exports = { add };\n`;
            fs.writeFileSync(targetCodeFile, fixedCode, 'utf8');
            return {
              ok: true,
              filesChanged: [targetCodeFile],
              actions: ['patch_code', 'run_test'],
              tokensUsed: 1200,
              costUsd: 0.002
            };
          }
        }
      ];
    }
  });

  // ─── CICLO 1: O sistema descobre a falha, atribui, corrige e valida ───
  const cycle1Result = await engine.runCycle();

  assert.strictEqual(cycle1Result.ok, true, 'Ciclo 1 deve completar com sucesso');
  assert.strictEqual(cycle1Result.cycle.discoveriesCount, 1, 'Ciclo 1 deve ter 1 descoberta');
  assert.strictEqual(cycle1Result.cycle.tasksCreatedCount, 1, 'Ciclo 1 deve criar 1 tarefa');
  assert.strictEqual(cycle1Result.cycle.tasksCompletedCount, 1, 'Ciclo 1 deve completar a tarefa com validação real');

  // Prova empírica: o teste automatizado no disco agora PASSA
  const testOutput = execFileSync(process.execPath, [testScriptFile], { encoding: 'utf8' });
  assert.ok(testOutput.includes('CALCULATOR TEST PASSED'), 'O teste real no disco DEVE passar após a correção');

  // Verifica que o código no disco foi realmente corrigido
  const codeOnDisk = fs.readFileSync(targetCodeFile, 'utf8');
  assert.ok(codeOnDisk.includes('return a + b;'), 'O arquivo no disco deve conter o código corrigido');

  // ─── CICLO 2: Segundo ciclo imediato reconhece o problema resolvido ───
  const cycle2Result = await engine.runCycle();

  assert.strictEqual(cycle2Result.ok, true, 'Ciclo 2 deve completar com sucesso');
  assert.strictEqual(cycle2Result.cycle.discoveriesCount, 0, 'Ciclo 2 NÃO deve ter descobertas pois o teste passou');
  assert.strictEqual(cycle2Result.cycle.tasksCreatedCount, 0, 'Ciclo 2 NÃO deve criar nenhuma tarefa (sem duplicação)');
  assert.strictEqual(cycle2Result.cycle.tasksCompletedCount, 0, 'Ciclo 2 deve permanecer ocioso e limpo');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7: Soak Simulation & Persistent State Recovery
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 7: Soak simulation (5 continuous cycles) and persistent state recovery', async (t) => {
  cleanupTestState();
  t.after(cleanupTestState);

  const engine1 = new AutonomousEvolutionEngine({
    statePersistPath: TEST_STATE_FILE,
    intervalMs: 1000
  });

  // Executa 5 ciclos contínuos
  for (let i = 0; i < 5; i++) {
    const res = await engine1.runCycle();
    assert.strictEqual(res.ok, true, `Ciclo ${i + 1} deve executar sem erros`);
  }

  assert.strictEqual(engine1.cycleCount, 5, 'Deve acumular exatamente 5 ciclos');
  assert.ok(engine1.cycleHistory.length === 5, 'Histórico deve registrar os 5 ciclos');

  // Instancia um SEGUNDO motor apontando para o mesmo arquivo de persistência
  const engine2 = new AutonomousEvolutionEngine({
    statePersistPath: TEST_STATE_FILE
  });

  // Verifica recuperação completa de estado
  assert.strictEqual(engine2.cycleCount, 5, 'Motor recuperado deve preservar contagem de 5 ciclos');
  assert.strictEqual(engine2.cycleHistory.length, 5, 'Motor recuperado deve carregar histórico');
  assert.ok(engine2.lastCycleAt, 'Deve preservar timestamp do último ciclo');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8: Zero-Mock Telemetry & Operations Snapshot Contract
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 8: Zero-Mock Telemetry and Operations Snapshot Contract', async (t) => {
  cleanupTestState();
  t.after(cleanupTestState);

  const engine = new AutonomousEvolutionEngine({
    statePersistPath: TEST_STATE_FILE
  });

  const snapshot = engine.getOperationsSnapshot();

  // 1. Current Cycle
  assert.ok(snapshot.currentCycle, 'Snapshot deve conter currentCycle');
  assert.strictEqual(snapshot.currentCycle.status, 'IDLE');
  assert.strictEqual(typeof snapshot.currentCycle.cycleCount, 'number');

  // 2. Work Queue
  assert.ok(snapshot.workQueue, 'Snapshot deve conter workQueue');
  assert.ok(Array.isArray(snapshot.workQueue.items), 'Fila deve ter array de itens');

  // 3. Team
  assert.ok(snapshot.team, 'Snapshot deve conter team');
  assert.ok(Array.isArray(snapshot.team.agents), 'Equipe deve ter array de agentes');
  assert.ok(snapshot.team.agents.length >= 10, 'Deve ter os agentes especializados');

  // 4. Evolution
  assert.ok(snapshot.evolution, 'Snapshot deve conter evolution');
  assert.strictEqual(typeof snapshot.evolution.bugsFixedCount, 'number');
  assert.strictEqual(typeof snapshot.evolution.projectsEvolvedCount, 'number');

  // 5. Economy & Budget
  assert.ok(snapshot.economy, 'Snapshot deve conter economy');
  assert.strictEqual(typeof snapshot.economy.totalTokensConsumed, 'number');
  assert.strictEqual(typeof snapshot.economy.totalCostUsd, 'number');
  assert.strictEqual(typeof snapshot.economy.budgetCeilingUsd, 'number');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 9: Human Approval Gate Unblocking and Execution
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 9: Human Approval Gate allows execution after operator approval', async (t) => {
  cleanupTestState();
  t.after(cleanupTestState);

  const engine = new AutonomousEvolutionEngine({
    statePersistPath: TEST_STATE_FILE
  });

  const criticalTask = {
    source: 'operator',
    projectId: 'production-app',
    title: 'Deploy de nova release em produção',
    actionType: 'DEPLOY_PRODUCTION',
    risk: 'HIGH',
    impact: 'HIGH',
    requiredSkills: ['devops', 'backend']
  };

  // Ciclo 1: Tarefa descoberta requer aprovação e deve ser bloqueada
  engine.registerDiscoverer(async () => [criticalTask]);
  const cycle1 = await engine.runCycle();
  assert.strictEqual(cycle1.ok, true);
  assert.strictEqual(cycle1.cycle.tasksBlockedCount, 1, 'Tarefa crítica deve ser bloqueada para aprovação');

  const pendingTask = Array.from(engine.taskEngine.tasks.values())[0];
  assert.strictEqual(pendingTask.status, 'AWAITING_APPROVAL', 'Status deve ser AWAITING_APPROVAL');

  // Operador humano aprova formalmente a tarefa
  const approveRes = engine.governance.approveTask(pendingTask.taskId, 'admin-operator', 'Autorizado após revisão');
  assert.strictEqual(approveRes.ok, true, 'Aprovação deve ser bem-sucedida');
  assert.strictEqual(engine.governance.isApproved(pendingTask.taskId), true);

  // Status volta para PRIORITIZED
  engine.taskEngine.updateTaskStatus(pendingTask.taskId, 'PRIORITIZED', { message: 'Aprovado pelo operador' });

  // Ciclo 2: A tarefa aprovada NÃO deve ser re-bloqueada e deve executar até COMPLETED
  // Limpa o discoverer para não gerar novas tarefas
  engine._workDiscoverers = [];
  const cycle2 = await engine.runCycle();
  assert.strictEqual(cycle2.ok, true);
  assert.strictEqual(cycle2.cycle.tasksBlockedCount, 0, 'Tarefa aprovada não pode ser re-bloqueada');
  assert.strictEqual(cycle2.cycle.tasksCompletedCount, 1, 'Tarefa aprovada deve ser executada com sucesso');
  assert.strictEqual(pendingTask.status, 'COMPLETED', 'Status final deve ser COMPLETED');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 10: Composite DAG Lifecycle: Parent Completes ONLY After All Subtasks
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 10: Composite DAG Lifecycle: Parent completes only after all subtasks succeed', async (t) => {
  cleanupTestState();
  t.after(cleanupTestState);

  const taskEngine = new TaskGenerationEngine();

  const { task: parentTask } = taskEngine.createTask({
    source: 'ux_auditor',
    projectId: 'admin-portal',
    title: 'Auditoria e correção de 3 telas críticas',
    priority: 'P2'
  });

  const subtasks = [
    { title: 'Correção de Tela 1', screen: 'screen1', sequential: false },
    { title: 'Correção de Tela 2', screen: 'screen2', sequential: false },
    { title: 'Correção de Tela 3', screen: 'screen3', sequential: false }
  ];

  taskEngine.decomposeIntoDag(parentTask, subtasks);

  // Subtarefas devem ser elegíveis para execução, mas o pai NÃO
  const eligible1 = taskEngine.getEligibleTasks();
  assert.strictEqual(eligible1.length, 3, 'Todas as 3 subtarefas devem ser elegíveis');
  assert.ok(!eligible1.some(t => t.taskId === parentTask.taskId), 'Tarefa pai NÃO deve ser executada como folha direta');

  // Conclui subtarefa 1
  taskEngine.updateTaskStatus(eligible1[0].taskId, 'COMPLETED');
  assert.strictEqual(parentTask.status, 'PLANNED', 'Pai deve permanecer PLANNED após subtarefa 1');

  // Conclui subtarefa 2
  taskEngine.updateTaskStatus(eligible1[1].taskId, 'COMPLETED');
  assert.strictEqual(parentTask.status, 'PLANNED', 'Pai deve permanecer PLANNED após subtarefa 2');

  // Conclui subtarefa 3 -> Agora todas as subtarefas estão concluídas!
  taskEngine.updateTaskStatus(eligible1[2].taskId, 'COMPLETED');
  assert.strictEqual(parentTask.status, 'COMPLETED', 'Pai DEVE ser concluído automaticamente quando todas as subtarefas finalizarem');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 11: Inter-Agent Help Request & DAG Unblocking (Sections 4 & 5)
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 11: Inter-agent help request creates unblocking task and dependency on DAG', async (t) => {
  cleanupTestState();
  t.after(cleanupTestState);

  const engine = new AutonomousEvolutionEngine({
    statePersistPath: TEST_STATE_FILE
  });

  // Tarefa que exige uma competência rara de segurança
  const { task } = engine.taskEngine.createTask({
    projectId: 'auth-service',
    title: 'Auditoria Zero-Trust de Criptografia',
    requiredSkills: ['security'],
    priority: 'P1'
  });

  // Simular agente desenvolvedor solicitando ajuda a agente de segurança
  const blockedAgentId = 'Developer';
  const helpRequested = engine.requestHelp(task, ['security'], blockedAgentId);

  assert.strictEqual(helpRequested, true, 'Solicitação de ajuda deve ser aceita');
  assert.strictEqual(task.status, 'BLOCKED', 'Tarefa original deve ficar BLOCKED');
  assert.ok(task.dependencies.length > 0, 'Deve ter adicionado a subtarefa de ajuda como dependência');

  const unblockTaskId = task.dependencies[0];
  const unblockTask = engine.taskEngine.tasks.get(unblockTaskId);
  assert.ok(unblockTask, 'Subtarefa de desbloqueio deve existir na fila');
  assert.strictEqual(unblockTask.requiredSkills[0], 'security');
  assert.strictEqual(unblockTask.status, 'DISCOVERED');

  // Verifica que o agente original foi marcado como BLOCKED
  const devAgent = engine.agentRegistry.get(blockedAgentId);
  assert.strictEqual(devAgent.availability, 'BLOCKED');

  // Agora conclui a subtarefa de ajuda
  engine.taskEngine.updateTaskStatus(unblockTaskId, 'COMPLETED');

  // A tarefa original agora deve estar liberada para execução!
  const eligible = engine.taskEngine.getEligibleTasks();
  assert.ok(eligible.some(t => t.taskId === task.taskId), 'Tarefa original deve estar elegível após resolução da dependência');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 12: Continuous Self-Audit & Self-Correction (Section 8)
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 12: Continuous self-audit discovers infrastructure degradation and generates correction task', async (t) => {
  cleanupTestState();
  t.after(cleanupTestState);

  const engine = new AutonomousEvolutionEngine({
    statePersistPath: TEST_STATE_FILE,
    app: {
      storageManager: { state: 'PERSISTENCE DEGRADED' }
    }
  });

  // Simula também um circuit breaker acionado
  engine.governance.recordProviderFailure('antigravity', 'Timeout 504 Gateway');
  engine.governance.recordProviderFailure('antigravity', 'Timeout 504 Gateway');
  engine.governance.recordProviderFailure('antigravity', 'Timeout 504 Gateway');
  assert.strictEqual(engine.governance.isProviderBlocked('antigravity'), true, 'Circuit breaker deve estar acionado');

  const obs = await engine._observeEnvironment();
  assert.strictEqual(obs.storageStatus, 'PERSISTENCE DEGRADED');
  assert.strictEqual(obs.trippedBreakers.length, 1);
  assert.strictEqual(obs.trippedBreakers[0].provider, 'antigravity');

  const discoveries = await engine._discoverWork(obs);
  assert.ok(discoveries.some(d => d.source === 'self_audit' && d.title.includes('Restaurar persistência')));
  assert.ok(discoveries.some(d => d.source === 'self_audit' && d.title.includes('Recuperação de circuit breaker')));
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 13: Memory Fabric Prior Learning Lookup (Section 7)
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 13: Memory Fabric consults prior solutions before execution to avoid repeating errors', async (t) => {
  cleanupTestState();
  t.after(cleanupTestState);

  const engine = new AutonomousEvolutionEngine({
    statePersistPath: TEST_STATE_FILE
  });

  // Pre-grava um aprendizado no Memory Fabric
  await engine.evolutionMemory.record({
    missionId: 'prior-fix-99',
    problem: 'Conexão rejeitada no pool PostgreSQL',
    hypothesis: 'Timeout no handshake de autenticação',
    actions: ['increase-timeout', 'retry-backoff'],
    filesChanged: ['pg-pool.js'],
    testsRun: ['pool.test.js'],
    testResults: { valid: true },
    lesson: 'Configurar idleTimeoutMillis e maxConnections para 20 resolve ECONNREFUSED em picos',
    pattern: 'ResilientPoolConnectionPattern'
  });

  // Registra discoverer com tarefa similar
  engine.registerDiscoverer(async () => [{
    source: 'incident_monitor',
    projectId: 'data-core',
    title: 'Falha de conexão no pool PostgreSQL com timeout',
    description: 'Conexão rejeitada sob pico de requisições',
    priority: 'P1',
    risk: 'LOW',
    impact: 'HIGH',
    requiredSkills: ['database']
  }]);

  const cycleRes = await engine.runCycle();
  assert.strictEqual(cycleRes.ok, true);

  // Verifica que o padrão anterior foi reutilizado
  const completedTask = Array.from(engine.taskEngine.tasks.values())[0];
  assert.ok(completedTask.priorLearning, 'Tarefa deve conter aprendizado prévio resgatado da memória');
  assert.ok(completedTask.priorLearning.includes('Configurar idleTimeoutMillis'));
  assert.strictEqual(completedTask.patternName, 'ResilientPoolConnectionPattern');
  assert.ok(engine.evolutionMetrics.patternsReusedCount >= 1, 'Métrica de padrões reutilizados deve ser incrementada');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 14: Circular Dependency Safety in DAG
// ─────────────────────────────────────────────────────────────────────────────
test('LEVEL26 14: Circular dependency detection prevents infinite recursion and handles cycles safely', (t) => {
  const taskEngine = new TaskGenerationEngine();

  const { task: taskA } = taskEngine.createTask({
    title: 'Tarefa A',
    dependencies: ['TASK-B']
  });

  const { task: taskB } = taskEngine.createTask({
    taskId: 'TASK-B',
    title: 'Tarefa B',
    dependencies: [taskA.taskId]
  });

  taskA.dependencies = [taskB.taskId];

  // Verifica se o detector de ciclo identifica a dependência circular
  const hasCycleA = taskEngine.hasCycle(taskA.taskId);
  assert.strictEqual(hasCycleA, true, 'Deve detectar ciclo entre Tarefa A e Tarefa B');

  // Nenhuma das duas tarefas deve ser elegível para execução
  const eligible = taskEngine.getEligibleTasks();
  assert.strictEqual(eligible.length, 0, 'Tarefas em ciclo circular não podem ser elegíveis');
});
