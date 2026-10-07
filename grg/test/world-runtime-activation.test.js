'use strict';

/**
 * FÊNIX OS — WORLD RUNTIME ACTIVATION TEST SUITE
 * ===============================================
 * Validates the Living World Runtime & Declarative Specification Engine:
 * 1. WorldIntentPlanner: Natural Language -> Validated Declarative Commands
 * 2. WorldCommandEngine: Deterministic State Transitions & Audit Trail
 * 3. Hot World Mutation: Frontend FenixWorld3DEngine methods & event wiring
 * 4. Agent Lifecycle: 9-Question contract verification
 * 5. Full-Stack Endpoints: POST /command, GET /commands, GET /agent/:id/lifecycle
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { start } = require('../src/server');

const { getWorldStateEngine } = require('../src/world-model/world-state-engine');
const { getWorldCommandEngine } = require('../src/world-model/world-command-engine');
const { getWorldIntentPlanner } = require('../src/world-model/world-intent-planner');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };

function withServer(fn) {
  return async () => {
    process.env.FENIX_BOOTSTRAP_TENANT_ID = ADMIN.tenantId;
    process.env.FENIX_BOOTSTRAP_ADMIN_USER = ADMIN.userId;
    process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = ADMIN.password;
    process.env.FENIX_ALLOW_DEV_HEADERS = '0';
    process.env.NODE_ENV = 'test';
    process.env.GRG_LLM = '0';
    const server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    try {
      await fn(base);
    } finally {
      await new Promise((r) => server.close(r));
    }
  };
}

// ── 1. WORLD INTENT PLANNER ─────────────────────────────────────────────────
test('WORLD INTENT PLANNER: Translates natural language to validated declarative commands', () => {
  const planner = getWorldIntentPlanner();

  // Test 1: Building creation
  const bldPlan = planner.plan('Crie um laboratório chamado Media Lab com 3 andares');
  assert.equal(bldPlan.ok, true);
  assert.equal(bldPlan.commands.length, 1);
  assert.equal(bldPlan.commands[0].type, 'CREATE_BUILDING');
  assert.equal(bldPlan.commands[0].payload.name, 'Media Lab');
  assert.equal(bldPlan.commands[0].payload.floors, 3);
  assert.ok(bldPlan.commands[0].payload.id.includes('media-lab'));

  // Test 2: Agent creation
  const agPlan = planner.plan('Crie o agente João como Especialista em IA no Media Lab');
  assert.equal(agPlan.ok, true);
  assert.equal(agPlan.commands[0].type, 'CREATE_AGENT');
  assert.equal(agPlan.commands[0].payload.id, 'agent-joao');
  assert.ok(agPlan.commands[0].payload.name === 'João' || agPlan.commands[0].payload.name === 'Joao');
  assert.equal(agPlan.commands[0].payload.buildingId, 'bld-media-lab');

  // Test 3: Agent movement
  const movePlan = planner.plan('Mova o agente André para a Doca 2 do depósito');
  assert.equal(movePlan.ok, true);
  assert.equal(movePlan.commands[0].type, 'MOVE_AGENT');
  assert.equal(movePlan.commands[0].payload.agentId, 'agent-andre');
  assert.ok(movePlan.commands[0].payload.destination.coordinates);

  // Test 4: Mission assignment
  const misPlan = planner.plan('Crie uma missão para João com objetivo Otimizar Roteamento de SSE');
  assert.equal(misPlan.ok, true);
  assert.equal(misPlan.commands[0].type, 'ASSIGN_MISSION');
  assert.equal(misPlan.commands[0].payload.agentId, 'agent-joao');
  assert.equal(misPlan.commands[0].payload.taskName, 'Otimizar Roteamento de SSE');

  // Test 5: Environment change
  const envPlan = planner.plan('Mude o clima para noite e ative chuva');
  assert.equal(envPlan.ok, true);
  assert.equal(envPlan.commands[0].type, 'CHANGE_ENVIRONMENT');
  assert.equal(envPlan.commands[0].payload.timeOfDay, 'NIGHT');
  assert.equal(envPlan.commands[0].payload.weather, 'RAIN');

  // Test 6: Compound prompt decomposition
  const compoundPlan = planner.plan('Crie um laboratório chamado Media Lab e coloque o agente João nele');
  assert.equal(compoundPlan.ok, true);
  assert.equal(compoundPlan.commands.length, 2);
  assert.equal(compoundPlan.commands[0].type, 'CREATE_BUILDING');
  assert.equal(compoundPlan.commands[1].type, 'CREATE_AGENT');
  assert.equal(compoundPlan.commands[1].payload.buildingId, 'bld-media-lab');
});

// ── 2. WORLD COMMAND ENGINE ─────────────────────────────────────────────────
test('WORLD COMMAND ENGINE: Executes declarative commands with state mutation & audit log', async () => {
  const stateEngine = getWorldStateEngine();
  const cmdEngine = getWorldCommandEngine(stateEngine);

  // 1. Create Building
  const bldRes = await cmdEngine.executeCommand({
    type: 'CREATE_BUILDING',
    actor: 'test-runner',
    payload: {
      id: 'bld-test-lab',
      name: 'Test Innovation Lab',
      district: 'dev-district',
      floors: 3,
      coordinates: { x: -24, y: 0, z: 14 }
    }
  });
  assert.equal(bldRes.ok, true);
  assert.ok(stateEngine.buildings['bld-test-lab']);
  assert.equal(stateEngine.buildings['bld-test-lab'].name, 'Test Innovation Lab');

  // 2. Create Agent
  const agRes = await cmdEngine.executeCommand({
    type: 'CREATE_AGENT',
    actor: 'test-runner',
    payload: {
      id: 'agent-test-bot',
      name: 'Test Bot',
      role: 'QA Specialist',
      buildingId: 'bld-test-lab'
    }
  });
  assert.equal(agRes.ok, true);
  assert.ok(stateEngine.agents['agent-test-bot']);
  assert.equal(stateEngine.agents['agent-test-bot'].status, 'AVAILABLE');

  // 3. Assign Mission
  const misRes = await cmdEngine.executeCommand({
    type: 'ASSIGN_MISSION',
    actor: 'test-runner',
    payload: {
      agentId: 'agent-test-bot',
      taskName: 'Run Full-Stack Regression Tests',
      objective: 'Run Full-Stack Regression Tests'
    }
  });
  assert.equal(misRes.ok, true);
  assert.equal(stateEngine.agents['agent-test-bot'].status, 'WORKING');
  assert.equal(stateEngine.agents['agent-test-bot'].assignedTask, 'Run Full-Stack Regression Tests');

  // 4. Complete Task
  const compRes = await cmdEngine.executeCommand({
    type: 'COMPLETE_TASK',
    actor: 'test-runner',
    payload: {
      agentId: 'agent-test-bot',
      result: 'All 12 axes verified successfully'
    }
  });
  assert.equal(compRes.ok, true);
  assert.equal(stateEngine.agents['agent-test-bot'].status, 'AVAILABLE');

  // 5. Change Environment
  const envRes = await cmdEngine.executeCommand({
    type: 'CHANGE_ENVIRONMENT',
    actor: 'test-runner',
    payload: {
      timeOfDay: 'NIGHT',
      weather: 'CLEAR'
    }
  });
  assert.equal(envRes.ok, true);
  assert.equal(stateEngine.worldTime.timeOfDay, 'NIGHT');

  // 6. Verify Audit Trail
  assert.ok(cmdEngine.commandLog.length >= 5);
  const lastEntry = cmdEngine.commandLog[cmdEngine.commandLog.length - 1];
  assert.equal(lastEntry.type, 'CHANGE_ENVIRONMENT');
  assert.equal(lastEntry.status, 'SUCCESS');
  assert.ok(lastEntry.durationMs >= 0);
  assert.ok(lastEntry.timestamp);
});

// ── 3. FRONTEND 3D ENGINE CONTRACT ──────────────────────────────────────────
test('FRONTEND CONTRACT: fenix-world-3d.js exports Hot World Mutation API', () => {
  const worldJsPath = path.join(__dirname, '..', 'public', 'fenix-world-3d.js');
  const code = fs.readFileSync(worldJsPath, 'utf8');

  assert.ok(code.includes('applyWorldCommand(command)'), 'Must define applyWorldCommand');
  assert.ok(code.includes('spawnDynamicBuilding(payload)'), 'Must define spawnDynamicBuilding');
  assert.ok(code.includes('spawnDynamicAgent(payload)'), 'Must define spawnDynamicAgent');
  assert.ok(code.includes('moveDynamicAgent('), 'Must define moveDynamicAgent');
  assert.ok(code.includes('assignDynamicMission('), 'Must define assignDynamicMission');
  assert.ok(code.includes('completeDynamicTask('), 'Must define completeDynamicTask');
  assert.ok(code.includes('setEnvironment('), 'Must define setEnvironment');
  assert.ok(code.includes('removeDynamicEntity('), 'Must define removeDynamicEntity');
  assert.ok(code.includes("window.addEventListener('fenix:world-command'"), 'Must listen for fenix:world-command events');
});

// ── 4. FULL-STACK HTTP ENDPOINTS ───────────────────────────────────────────
test('HTTP ENDPOINTS: POST /command, GET /commands, GET /agent/:id/lifecycle', withServer(async (base) => {
  // Login
  const loginRes = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  assert.equal(loginRes.status, 200);
  const { token } = await loginRes.json();
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json'
  };

  // 1. POST /api/v2/living-city/command with natural language
  const promptRes = await fetch(`${base}/api/v2/living-city/command`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: 'Crie um laboratório chamado Media Lab com 2 andares',
      actor: 'test-operator'
    })
  });
  assert.equal(promptRes.status, 200);
  const promptData = await promptRes.json();
  assert.equal(promptData.ok, true);
  assert.equal(promptData.source, 'WorldCommandEngine');
  assert.equal(promptData.count, 1);
  assert.equal(promptData.results[0].type, 'CREATE_BUILDING');
  assert.equal(promptData.results[0].result.name, 'Media Lab');

  // 2. POST /api/v2/living-city/command with declarative JSON
  const declRes = await fetch(`${base}/api/v2/living-city/command`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'CREATE_AGENT',
      actor: 'test-operator',
      payload: {
        id: 'agent-roberto',
        name: 'Roberto',
        role: 'Data Engineer',
        buildingId: 'bld-media-lab'
      }
    })
  });
  assert.equal(declRes.status, 200);
  const declData = await declRes.json();
  assert.equal(declData.ok, true);
  assert.equal(declData.results[0].type, 'CREATE_AGENT');
  assert.equal(declData.results[0].result.id, 'agent-roberto');

  // 3. GET /api/v2/living-city/commands
  const logRes = await fetch(`${base}/api/v2/living-city/commands?limit=10`, { headers });
  assert.equal(logRes.status, 200);
  const logData = await logRes.json();
  assert.equal(logData.ok, true);
  assert.ok(logData.total >= 2);
  assert.ok(Array.isArray(logData.commands));

  // 4. GET /api/v2/living-city/agent/:id/lifecycle (9 Questions Contract)
  const lifeRes = await fetch(`${base}/api/v2/living-city/agent/agent-roberto/lifecycle`, { headers });
  assert.equal(lifeRes.status, 200);
  const lifeData = await lifeRes.json();
  assert.equal(lifeData.ok, true);
  assert.equal(lifeData.source, 'WorldStateEngine/AgentLifecycle');

  const lc = lifeData.lifecycle;
  // Question 1: Who am I?
  assert.ok(lc.whoAmI && lc.whoAmI.name === 'Roberto');
  assert.equal(lc.whoAmI.role, 'Data Engineer');

  // Question 2: Where am I?
  assert.ok(lc.whereAmI && lc.whereAmI.buildingId === 'bld-media-lab');

  // Question 3: What am I doing?
  assert.ok(lc.whatAmIDoing && lc.whatAmIDoing.status === 'AVAILABLE');

  // Question 4: Why am I doing this?
  assert.ok(lc.whyAmIDoingThis && lc.whyAmIDoingThis.parentGoal);

  // Question 5: What will I do next?
  assert.ok(lc.whatWillIDoNext && lc.whatWillIDoNext.nextAction);

  // Question 6: What is my memory?
  assert.ok(lc.whatIsMyMemory && typeof lc.whatIsMyMemory.episodicCount === 'number');

  // Question 7: Skills and tools?
  assert.ok(lc.whatAreMySkillsAndTools && Array.isArray(lc.whatAreMySkillsAndTools.skills));

  // Question 8: Energy & attention?
  assert.ok(lc.whatIsMyEnergyAndAttention && typeof lc.whatIsMyEnergyAndAttention.energyPercent === 'number');

  // Question 9: How to interact?
  assert.ok(lc.howToInteract && Array.isArray(lc.howToInteract.allowedActions));
  assert.ok(lc.howToInteract.allowedActions.includes('chat'));
  assert.ok(lc.howToInteract.allowedActions.includes('assign'));
  assert.ok(lc.howToInteract.allowedActions.includes('follow'));
}));
