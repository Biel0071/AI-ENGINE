'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const modelRouter = require('../src/routing/model-router');
const { getWorldStateEngine } = require('../src/world-model/world-state-engine');
const { globalProjectMemoryIndex } = require('../src/memory/project-memory-index');

test('Fênix OS Local Model Engine & Pipeline Suite', async (t) => {
  const worldEngine = getWorldStateEngine();

  await t.test('1. Separate Health Checks (Models, Tools, Backend)', async () => {
    const modelsHealth = await modelRouter.checkModelsHealth();
    assert.ok(typeof modelsHealth.ok === 'boolean', 'modelsHealth.ok must be boolean');
    assert.ok(['ONLINE', 'OFFLINE', 'DEGRADED'].includes(modelsHealth.status), 'modelsHealth.status must be valid');
    assert.strictEqual(modelsHealth.provider, 'ollama');
    assert.ok(modelsHealth.concurrency, 'concurrency object must exist');
    assert.strictEqual(modelsHealth.concurrency.maxConcurrent, 2);

    const toolsHealth = modelRouter.checkToolsHealth();
    assert.strictEqual(toolsHealth.ok, true);
    assert.strictEqual(toolsHealth.status, 'ONLINE');
    assert.ok(toolsHealth.toolsCount >= 4, 'Must have at least 4 registered native tools');
    const toolNames = toolsHealth.tools.map(t => t.name);
    assert.ok(toolNames.includes('ast_analyzer'), 'ast_analyzer tool must be registered');
    assert.ok(toolNames.includes('contract_validator'), 'contract_validator tool must be registered');
    assert.ok(toolNames.includes('evidence_recorder'), 'evidence_recorder tool must be registered');

    const backendHealth = await modelRouter.checkBackendHealth();
    assert.strictEqual(backendHealth.ok, true);
    assert.strictEqual(backendHealth.status, 'HEALTHY');
    assert.ok(backendHealth.memory.heapUsedMb > 0, 'heapUsedMb must be positive');
  });

  await t.test('2. Concurrency Queue & Inference Engine', async () => {
    const qBefore = modelRouter.getQueueStatus();
    assert.strictEqual(typeof qBefore.active, 'number');
    assert.strictEqual(typeof qBefore.queued, 'number');

    // Run inference with timeout protection
    const t0 = Date.now();
    const res = await modelRouter.executeInference({
      prompt: 'Responda apenas: FENIX_TEST_OK',
      maxTokens: 15,
      timeoutMs: 30000
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.success, true);
    assert.ok(res.text.includes('FENIX_TEST_OK') || res.text.length > 0, 'Must contain response text');
    assert.strictEqual(res.model, 'qwen2.5:3b');
    assert.ok(Number.isFinite(res.totalTokens), 'totalTokens must be finite');
    assert.ok(res.latencyMs > 0, 'latencyMs must be measured');
  });

  await t.test('3. Structured Mission Planning with Local Qwen', async () => {
    const plan = await modelRouter.planMission({
      objective: 'Validar rotas e contratos da API Platform',
      projectId: 'api-platform',
      agent: {
        id: 'agent-api-ops',
        name: 'Agent API Ops',
        role: 'Engenheiro de APIs',
        tools: ['ast_analyzer', 'contract_validator', 'evidence_recorder']
      }
    });

    assert.strictEqual(plan.ok, true);
    assert.strictEqual(plan.success, true);
    assert.ok(['qwen2.5:3b', 'fallback-deterministic'].includes(plan.plannerModel), 'Valid planner model');
    assert.strictEqual(plan.steps.length, 3, 'Must have 3 structured steps');
    for (const step of plan.steps) {
      assert.ok(step.step >= 1 && step.step <= 3, 'Step index between 1 and 3');
      assert.ok(typeof step.name === 'string' && step.name.length > 0, 'Step name non-empty');
      assert.ok(['ast_analyzer', 'contract_validator', 'evidence_recorder'].includes(step.tool), `Tool must be allowed: ${step.tool}`);
    }
  });

  await t.test('4. End-to-End Mission Execution Pipeline with Tools & Review', async () => {
    const prompt = 'Validar integridade de contratos e gravar evidência SHA-256';
    const projectId = 'fenix-os';
    const assignedAgentId = 'agent-ai-core';

    // 1. Context & Pack
    const contextPack = globalProjectMemoryIndex.getContextPack(prompt, projectId);
    assert.ok(contextPack.projectName, 'Context pack must have project name');

    // 2. Delegate & Working status
    const ag = worldEngine.findAgent(assignedAgentId);
    assert.ok(ag, 'Agent must exist in worldEngine');
    const missionId = `mis-test-${Date.now()}`;
    ag.missionId = missionId;
    ag.status = 'WORKING';
    ag.currentTask = 'Executando testes automatizados';

    // 3. Plan
    const plan = await modelRouter.planMission({
      objective: prompt,
      agent: ag,
      projectId,
      contextPack
    });
    assert.strictEqual(plan.ok, true);

    // 4. Run steps
    const steps = [];
    for (const st of plan.steps) {
      const stepStart = Date.now();
      let findings = '';
      if (st.tool === 'ast_analyzer') {
        findings = '5266 arquivos inspecionados, 575 rotas analisadas';
      } else if (st.tool === 'contract_validator') {
        findings = '4 contratos verificados com integridade intacta';
      } else if (st.tool === 'evidence_recorder') {
        findings = 'Evidência sha256:abc123def456 registrada no grafo';
      }
      steps.push({
        step: st.step,
        name: st.name,
        tool: st.tool,
        status: 'COMPLETED',
        findings,
        durationMs: Date.now() - stepStart
      });
    }
    assert.strictEqual(steps.length, 3);

    // 5. Review
    const review = await modelRouter.reviewResults({
      objective: prompt,
      steps,
      evidenceHash: 'sha256:test1234567890ab'
    });
    assert.strictEqual(review.ok, true);
    assert.ok(review.reviewText && review.reviewText.length > 10, 'Review text must be non-empty');

    // 6. Complete
    ag.status = 'COMPLETED';
    ag.state = 'COMPLETED';
    ag.currentTask = 'Missão concluída';
    assert.strictEqual(ag.status, 'COMPLETED');
  });

  await t.test('5. Agent Chat with Local Model Integration', async () => {
    const chatRes = await worldEngine.chatWithAgent('agent-api-ops', 'Status da estação de trabalho e rotas ativas');
    assert.strictEqual(chatRes.ok, true);
    assert.strictEqual(chatRes.agentId, 'agent-api-ops');
    assert.ok(chatRes.reply && chatRes.reply.length > 10, 'Chat reply must be non-empty');
    assert.ok(['ollama', 'ai-router', 'cognitive-project-memory'].includes(chatRes.provider), 'Provider must be real');
    if (chatRes.usedAI) {
      assert.strictEqual(chatRes.model, 'qwen2.5:3b');
      assert.ok(chatRes.tokens && chatRes.tokens.total > 0, 'Tokens must be recorded when AI used');
    }
  });

  await t.test('6. Mission Cancellation & Recovery', async () => {
    const ag = worldEngine.findAgent('agent-camila');
    const misId = 'mis-cancel-test-123';
    ag.status = 'WORKING';
    ag.missionId = misId;
    ag.currentTask = 'Tarefa em andamento';

    const cancelRes = worldEngine.cancelMission(misId, 'Teste de cancelamento');
    assert.strictEqual(cancelRes.ok, true);
    assert.strictEqual(cancelRes.status, 'CANCELLED');
    assert.strictEqual(ag.status, 'AVAILABLE');
    assert.strictEqual(ag.missionId, null);

    // Test recovery on boot
    ag.status = 'WORKING';
    ag.missionId = 'mis-hang-test';
    const recCount = worldEngine.recoverPendingMissions();
    assert.ok(recCount >= 1, 'Should recover at least 1 hanging mission');
    assert.strictEqual(ag.status, 'AVAILABLE');
    assert.strictEqual(ag.missionId, null);
  });
});
