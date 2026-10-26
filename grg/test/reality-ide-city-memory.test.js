const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AuthService } = require('../src/auth/auth');
const { MemoryStore } = require('../src/kernel/store');
const { WorldStateEngine } = require('../src/world-model/world-state-engine');
const { ProjectMemoryIndex } = require('../src/memory/project-memory-index');

test('Preview Dev-Session — AuthService creates and validates scoped preview session', async () => {
  const store = new MemoryStore({
    users: [],
    memberships: [],
    sessions: [],
    revocations: []
  });

  const auth = new AuthService({ store });
  const { token, session } = await auth.createPreviewSession({
    tenantId: 'grg',
    userId: 'preview-developer',
    ttlMs: 900_000
  });

  assert.ok(token);
  assert.equal(session.userId, 'preview-developer');
  assert.equal(session.readOnly, true);
  assert.equal(session.isPreview, true);
  assert.equal(session.role, 'viewer');

  // Verify cookie resolution in contextFromAsync
  const cookieHeader = `fenix_preview_session=${encodeURIComponent(token)}; Path=/`;
  const cx = await auth.contextFromAsync({ cookie: cookieHeader });

  assert.ok(cx);
  assert.equal(cx.authed, true);
  assert.equal(cx.actorId, 'preview-developer');
  assert.equal(cx.readOnly, true);
});

test('Living World Lifecycle — ASSIGN_TASK, FAIL_TASK, and COMPLETE_TASK mutations', async () => {
  const engine = new WorldStateEngine();
  const testAgentId = 'agent-qa-tester';

  // Ensure test agent exists
  engine.agents[testAgentId] = {
    id: testAgentId,
    name: 'QA Tester',
    role: 'tester',
    status: 'AVAILABLE',
    state: 'IDLE',
    currentTask: 'Standby',
    memory: []
  };

  // 1. Assign Task
  engine.applyMutation({
    type: 'ASSIGN_TASK',
    payload: {
      agentId: testAgentId,
      task: 'Executar teste de regressão E2E'
    }
  });

  let ag = engine.findAgent(testAgentId);
  assert.equal(ag.status, 'WORKING');
  assert.equal(ag.currentTask, 'Executar teste de regressão E2E');

  // 2. Fail Task
  engine.applyMutation({
    type: 'FAIL_TASK',
    payload: {
      agentId: testAgentId,
      error: 'Timeout de rede no gateway'
    }
  });

  ag = engine.findAgent(testAgentId);
  assert.equal(ag.status, 'ERROR');
  assert.match(ag.currentTask, /Falha na tarefa.*Timeout de rede/);
  assert.ok(ag.memory.some(m => m.content.includes('Falha na tarefa')));

  // 3. Re-assign & Complete Task
  engine.applyMutation({
    type: 'ASSIGN_TASK',
    payload: {
      agentId: testAgentId,
      task: 'Repetir teste com retry'
    }
  });

  engine.applyMutation({
    type: 'COMPLETE_TASK',
    payload: {
      agentId: testAgentId,
      result: '100% dos testes aprovados'
    }
  });

  ag = engine.findAgent(testAgentId);
  assert.equal(ag.status, 'AVAILABLE');
  assert.equal(ag.currentTask, 'Standby operacional · Pronto para novas diretivas');
  assert.ok(ag.memory.some(m => m.content.includes('Tarefa concluída')));

  // 4. Fail Task & Recover Task
  engine.applyMutation({
    type: 'FAIL_TASK',
    payload: {
      agentId: testAgentId,
      error: 'Simulated fault'
    }
  });
  assert.equal(engine.findAgent(testAgentId).status, 'ERROR');

  engine.applyMutation({
    type: 'RECOVER_TASK',
    payload: {
      agentId: testAgentId,
      note: 'Auto-recuperação pelo kernel'
    }
  });

  ag = engine.findAgent(testAgentId);
  assert.equal(ag.status, 'AVAILABLE');
  assert.equal(ag.currentTask, 'Recuperado · Pronto para novas diretivas');
  assert.ok(ag.memory.some(m => m.content.includes('Agente recuperado operacionalmente')));
});

test('ProjectMemoryIndex — Reads ACTIVE_PROJECT_MEMORY sections without mocks', async () => {
  const memoryIndex = new ProjectMemoryIndex();
  const idx = memoryIndex.ensureLoaded();

  assert.ok(idx);
  assert.ok(idx.activeMemory);
  assert.equal(idx.activeMemory.found, true);
  assert.ok(Array.isArray(idx.activeMemory.sections));
  assert.ok(idx.activeMemory.sections.length > 50, `Expected > 50 sections, got ${idx.activeMemory.sections.length}`);

  const firstSection = idx.activeMemory.sections[0];
  assert.ok(firstSection.title);
  assert.ok(firstSection.summary);
});

test('Memory UI — showMemoryDetail and persistent state invariants', () => {
  const memoryCode = fs.readFileSync(path.join(__dirname, '../public/memory-live.js'), 'utf8');
  assert.ok(memoryCode.includes('function showMemoryDetail('), 'memory-live must define showMemoryDetail');
  assert.ok(memoryCode.includes('fenix_neural_brain_active'), 'memory-live must persist 3D neural brain active state');
  assert.ok(memoryCode.includes('showMemoryDetail({'), 'memory-live must call showMemoryDetail on card interaction');
});

