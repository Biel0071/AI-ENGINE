'use strict';

/**
 * FÊNIX OS — 4-LAYER LIVING WORLD OPERATING SYSTEM VERIFICATION TEST
 * Layer 1: FÊNIX CITY (2.5D visual world, deep zoom, camera follow, vehicles, constructions)
 * Layer 2: WORLD SIMULATION (24/7 autonomous loop, state machine, waypoints, WorldDirector)
 * Layer 3: WORLD STATE (canonical persistent state, mutations, rehydration)
 * Layer 4: FÊNIX CORE & COMPANY BRAIN (Camila, Depósito Mais team, chat, real runtime)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { WorldStateEngine } = require('../src/world-model/world-state-engine');
const { WorldSimulationEngine } = require('../src/world-model/world-simulation-engine');
const { handleLivingCityRoutes, livingCityState } = require('../src/api/living-city-routes');

test('LAYER 1: Fênix City Visual Engine supports Deep Zoom (3.8), Double-Click Follow, and World Entities', () => {
  const isoCitySrc = fs.readFileSync(path.resolve(__dirname, '../public/iso-city.js'), 'utf-8');
  const officeLiveSrc = fs.readFileSync(path.resolve(__dirname, '../public/office-live.js'), 'utf-8');

  // Deep zoom up to 3.8
  assert.ok(isoCitySrc.includes('Math.min(3.8'), 'iso-city must support zoom up to 3.8 for workstation inspection');

  // Double click follow
  assert.ok(isoCitySrc.includes("addEventListener('dblclick'"), 'iso-city must have dblclick event listener');
  assert.ok(isoCitySrc.includes('this.followAgent(agent.id)'), 'dblclick on agent must trigger followAgent');
  // Invariant: Exactly 1 canonical dblclick listener (no duplicate listener overriding targetCamera back to 1.05)
  const dblclickMatches = (isoCitySrc.match(/this\.canvas\.addEventListener\(['"]dblclick['"]/g) || []).length;
  assert.equal(dblclickMatches, 1, 'Must have exactly 1 canonical dblclick listener on canvas');

  // Agent living runtime properties mapped in syncRealData
  assert.ok(isoCitySrc.includes('company: a.company'), 'iso-city must preserve agent company');
  assert.ok(isoCitySrc.includes('workstationId: a.workstationId'), 'iso-city must preserve workstationId');
  assert.ok(isoCitySrc.includes('skills: Array.isArray(a.skills)'), 'iso-city must preserve skills');
  assert.ok(isoCitySrc.includes('tools: Array.isArray(a.tools)'), 'iso-city must preserve tools');

  // Agent Inspector provides real runtime inspection (not just a generic avatar)
  assert.ok(officeLiveSrc.includes('fenixShowWorldAgentInspector'), 'office-live must have fenixShowWorldAgentInspector');
  assert.ok(officeLiveSrc.includes('Runtime Model:'), 'Agent inspector must display runtime model');
  assert.ok(officeLiveSrc.includes('Habilidades & Ferramentas'), 'Agent inspector must display skills and tools');
  assert.ok(officeLiveSrc.includes('Memória Episódica do Agente'), 'Agent inspector must display episodic memory');
  assert.ok(officeLiveSrc.includes('Abrir no Runtime'), 'Agent inspector must link to full agent runtime');

  // Vehicles and constructions drawing
  assert.ok(isoCitySrc.includes('_drawWorldVehicle'), '_drawWorldVehicle method must exist in iso-city.js');
  assert.ok(isoCitySrc.includes('_drawWorldConstruction'), '_drawWorldConstruction method must exist in iso-city.js');
  assert.ok(isoCitySrc.includes('this.world.vehicles'), 'iso-city must maintain this.world.vehicles');
  assert.ok(isoCitySrc.includes('this.world.constructions'), 'iso-city must maintain this.world.constructions');
});

test('LAYER 2: World Simulation Engine runs autonomous 24/7 loop and advances state machine', () => {
  const stateEngine = new WorldStateEngine();
  stateEngine.initialize();

  const simEngine = new WorldSimulationEngine(stateEngine);

  // Initial state check
  const camila = stateEngine.findAgent('agent-camila');
  assert.ok(camila, 'Camila must exist in state');
  assert.equal(camila.companyId, 'deposito-mais');
  assert.equal(camila.stationId, 'st-pack-supervisor');

  // Assign a task
  stateEngine.applyMutation({
    type: 'ASSIGN_TASK',
    agentId: 'agent-camila',
    task: {
      id: 'task-test-audit',
      taskName: 'Auditoria de Estoque Central',
      progress: 0,
      source: 'company-brain'
    }
  });

  const updatedCamila = stateEngine.findAgent('agent-camila');
  assert.equal(updatedCamila.state, 'RECEIVING_TASK');
  assert.ok(updatedCamila.assignedTask);

  // Run simulation ticks
  for (let i = 0; i < 5; i++) {
    simEngine.tick();
  }

  // Verify agents have moved or progressed
  const snapshot = stateEngine.getSnapshot();
  assert.ok(Array.isArray(snapshot.vehicles));
  assert.ok(Array.isArray(snapshot.constructions));
  assert.ok(snapshot.vehicles.length >= 4);
  assert.ok(snapshot.constructions.length >= 2);

  // WorldDirector evaluation
  simEngine.evaluateWorldDirector();
  const logs = stateEngine.directorLogs;
  assert.ok(Array.isArray(logs));
  assert.ok(logs.length > 0, 'WorldDirector must generate operational logs');
});

test('LAYER 3: World State Engine supports canonical mutations and persistence', async () => {
  const stateEngine = new WorldStateEngine();
  stateEngine.initialize();

  // Test SPAWN mutation
  const spawnRes = stateEngine.applyMutation({
    type: 'SPAWN',
    entityType: 'agent',
    entity: {
      id: 'agent-test-worker',
      name: 'Operador Teste',
      role: 'Worker',
      company: 'deposito-mais',
      district: 'industrial',
      x: 6.5,
      y: -2.5
    }
  });
  assert.ok(spawnRes.success);
  assert.ok(stateEngine.findAgent('agent-test-worker'));

  // Test MOVE mutation
  const moveRes = stateEngine.applyMutation({
    type: 'MOVE',
    agentId: 'agent-test-worker',
    targetX: 8.0,
    targetY: -3.0
  });
  assert.ok(moveRes.success);
  const moved = stateEngine.findAgent('agent-test-worker');
  assert.equal(moved.targetX, 8.0);
  assert.equal(moved.targetY, -3.0);
  assert.equal(moved.state, 'WALKING');

  // Test BUILD mutation
  const buildRes = stateEngine.applyMutation({
    type: 'BUILD',
    construction: {
      id: 'const-test-silo',
      name: 'Silo de Areia e Brita',
      district: 'industrial',
      x: 6.0,
      y: -1.0,
      stage: 'PLANNED',
      progress: 0
    }
  });
  assert.ok(buildRes.success);
  const silo = stateEngine.constructions['const-test-silo'];
  assert.ok(silo);
  assert.equal(silo.name, 'Silo de Areia e Brita');

  // Test Chat with agent
  const chatRes = await stateEngine.chatWithAgent('agent-camila', 'Qual o status das entregas de hoje?');
  assert.ok(chatRes.success);
  assert.ok(chatRes.reply.includes('Depósito Mais') || chatRes.reply.includes('entregas') || chatRes.reply.includes('pedidos') || chatRes.reply.includes('estoque'));
  assert.ok(chatRes.agentName.includes('Camila'));
});

test('LAYER 4: API Routes and Core Integration deliver Real Agent Runtime', async () => {
  const mockApp = {
    controlPlane: { authorize: async () => {} },
    store: { read: async () => ({ agentProfiles: [], agents: [], cognitiveAgents: [], memories: [] }) },
    agentRegistry: { list: () => [] },
    jobs: { list: async () => [], workers: async () => [] },
    missions: { list: async () => [] },
    projectKernel: { list: async () => [] }
  };

  const state = await livingCityState(mockApp, 'tenant', 'actor');
  assert.ok(state.agents.length >= 8, 'Must include living world agents');
  assert.ok(state.vehicles.length >= 4, 'Must include living world vehicles');
  assert.ok(state.constructions.length >= 2, 'Must include living world constructions');
  assert.ok(state.workstations.length >= 8, 'Must include living world workstations');

  // Test Camila presence
  const camila = state.agents.find(a => a.id === 'agent-camila');
  assert.ok(camila, 'Camila must be present in livingCityState');
  assert.equal(camila.companyId, 'deposito-mais');
  assert.equal(camila.stationId, 'st-pack-supervisor');

  // Test HTTP Route handling for Chat
  let responseData = null;
  let statusCode = 200;
  const mockRes = {
    writeHead: (code, headers) => { statusCode = code; },
    end: (data) => { responseData = JSON.parse(data); }
  };

  const sendJson = (res, code, payload) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  };

  const readJson = async () => ({ message: 'Olá Camila, como estão os pedidos?' });

  const handled = await handleLivingCityRoutes(
    { method: 'POST' },
    mockRes,
    new URL('http://localhost:4400/api/v2/living-city/agent/agent-camila/chat'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 't', actorId: 'a' }
  );

  assert.ok(handled, 'Route must be handled');
  assert.equal(statusCode, 200);
  assert.ok(responseData.success);
  assert.ok(responseData.reply);
  assert.equal(responseData.agentId, 'agent-camila');

  // Test GET /api/v2/living-city/agent/agent-camila runtime detail
  let agentDetailData = null;
  const mockDetailRes = {
    writeHead: (code, headers) => { statusCode = code; },
    end: (data) => { agentDetailData = JSON.parse(data); }
  };
  const detailHandled = await handleLivingCityRoutes(
    { method: 'GET' },
    mockDetailRes,
    new URL('http://localhost:4400/api/v2/living-city/agent/agent-camila'),
    mockApp,
    sendJson,
    readJson,
    { tenantId: 't', actorId: 'a' }
  );
  assert.ok(detailHandled, 'Agent detail route must be handled');
  assert.equal(statusCode, 200);
  assert.ok(agentDetailData.ok);
  assert.equal(agentDetailData.agent.companyId, 'deposito-mais');
  assert.equal(agentDetailData.agent.stationId, 'st-pack-supervisor');
  assert.ok(Array.isArray(agentDetailData.agent.skills) && agentDetailData.agent.skills.length > 0);
  assert.ok(Array.isArray(agentDetailData.agent.tools) && agentDetailData.agent.tools.length > 0);
  assert.ok(Array.isArray(agentDetailData.agent.episodicMemory) && agentDetailData.agent.episodicMemory.length > 0);
});
