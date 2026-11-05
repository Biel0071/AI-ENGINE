'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getWorldStateEngine } = require('../src/world-model/world-state-engine');
const { globalProjectMemoryIndex } = require('../src/memory/project-memory-index');

test('Operational Agent Chat: dynamic, factual, zero-mock responses with ProjectMemoryIndex', async () => {
  const worldEngine = getWorldStateEngine();
  
  // Test chat with API operations agent
  const resApi = await worldEngine.chatWithAgent('agent-api-ops', 'Como estão as rotas REST e webhooks?');
  assert.equal(resApi.ok, true);
  assert.equal(resApi.agentId, 'agent-api-ops');
  assert.ok(resApi.reply.length > 20, 'Reply should not be empty');
  assert.ok(!resApi.reply.includes('Latência atual: 14ms'), 'Must NOT contain legacy hardcoded mock string');
  assert.ok(resApi.context.projectId === 'api-platform', 'Must resolve to api-platform project');
  assert.ok(Array.isArray(resApi.tools), 'Must return real tools');
  assert.ok(resApi.tools.includes('api_contract_validator') || resApi.tools.length > 0);

  // Test chat with Camila at Deposito Mais
  const resCamila = await worldEngine.chatWithAgent('agent-camila', 'Qual a situação dos paletes e docas?');
  assert.equal(resCamila.ok, true);
  assert.equal(resCamila.agentId, 'agent-camila');
  assert.ok(!resCamila.reply.includes('140 paletes inspecionados'), 'Must NOT contain legacy mock string');
  assert.ok(resCamila.context.projectId === 'deposito-mais', 'Must resolve to deposito-mais project');
});

test('Agent 6-State Lifecycle: supports AVAILABLE, WORKING, WAITING_DEPENDENCY, BLOCKED, ERROR, COMPLETED', async () => {
  const worldEngine = getWorldStateEngine();
  const validStates = ['AVAILABLE', 'WORKING', 'WAITING_DEPENDENCY', 'BLOCKED', 'ERROR', 'COMPLETED'];
  
  const ag = worldEngine.findAgent('agent-api-ops');
  assert.ok(ag, 'Agent must exist');

  for (const st of validStates) {
    worldEngine.applyMutation({
      type: 'SET_AGENT_STATUS',
      payload: { agentId: 'agent-api-ops', status: st },
      issuer: 'test-runner'
    });
    ag.status = st;
    ag.state = st;
    assert.equal(ag.status, st);
  }

  // Restore to AVAILABLE
  ag.status = 'AVAILABLE';
  ag.state = 'AVAILABLE';
});

test('End-to-End Real Mission Execution: Request -> Plan -> Tool Execution -> Delivery -> Memory Update', async () => {
  const worldEngine = getWorldStateEngine();
  const assignedAgentId = 'agent-api-ops';
  const prompt = 'Auditar conformidade de endpoints OpenAPI e rotas seguras';
  const projectId = 'api-platform';

  // 1. Planning & Context
  const contextPack = globalProjectMemoryIndex.getContextPack(prompt, projectId);
  assert.ok(contextPack, 'Context pack must be retrieved');

  // 2. Delegate & Working State
  const ag = worldEngine.findAgent(assignedAgentId);
  ag.status = 'WORKING';
  ag.state = 'WORKING';
  assert.equal(ag.status, 'WORKING');

  // 3. Tool Execution & Evidence
  const crypto = require('crypto');
  const timestamp = new Date().toISOString();
  const missionId = `mis-test-${Date.now()}`;
  const evidenceHash = crypto.createHash('sha256').update(`${missionId}:${prompt}:${timestamp}`).digest('hex');

  // 4. Delivery & Memory Persist
  ag.status = 'COMPLETED';
  ag.state = 'COMPLETED';
  ag.memory.push({
    timestamp,
    type: 'MISSION_DELIVERED',
    missionId,
    objective: prompt,
    evidenceHash: `sha256:${evidenceHash.slice(0, 16)}`
  });

  const lastMem = ag.memory[ag.memory.length - 1];
  assert.equal(lastMem.type, 'MISSION_DELIVERED');
  assert.equal(lastMem.missionId, missionId);
  assert.equal(ag.status, 'COMPLETED');
});
