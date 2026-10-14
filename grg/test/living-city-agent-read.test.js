'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handleLivingCityRoutes } = require('../src/api/living-city-routes');

function fixture(agents = []) {
  const worldEngine = {
    agents: {}, companies: {}, buildings: {}, workstations: {}, vehicles: {}, constructions: {}, districts: {},
    worldTime: {},
    findAgentCalls: 0,
    findAgent(id) {
      this.findAgentCalls++;
      const agent = { id, name: 'Fabricated agent', status: 'AVAILABLE' };
      this.agents[id] = agent;
      return agent;
    }
  };
  const app = {
    controlPlane: { authorize: async () => ({ role: 'master_admin' }) },
    store: { read: async () => ({ runtimeJobs: [], workerHeartbeats: [], agents, cognitiveAgents: [], agentProfiles: [], worldAssets: [], memories: [], missions: [] }) },
    projectKernel: { list: async () => [] },
    missions: { list: async () => [] },
    agentRegistry: { list: () => [] },
  };
  return { app, worldEngine };
}

test('read-only agent detail and lifecycle routes do not create missing agents', async () => {
  const { app, worldEngine } = fixture();
  for (const path of ['/api/v2/living-city/agent/ghost-agent', '/api/v2/living-city/agent/ghost-agent/lifecycle']) {
    let response;
    let status;
    const res = { writeHead(code) { status = code; }, end(body) { response = JSON.parse(body); } };
    const handled = await handleLivingCityRoutes(
      { method: 'GET' }, res, new URL(`http://localhost${path}`), app,
      (_res, code, body) => { status = code; response = body; },
      async () => ({}),
      { tenantId: 'tenant-a', actorId: 'admin' },
      { worldEngine, simulationEngine: { isRunning: true } },
    );

    assert.equal(handled, true);
    assert.equal(status, 404);
    assert.equal(response.ok, false);
  }
  assert.equal(worldEngine.findAgentCalls, 0);
  assert.deepEqual(worldEngine.agents, {});
});

test('agent detail and lifecycle do not invent runtime metrics, activity, location, or memory', async () => {
  const storedAgent = { id: 'agent-real', tenantId: 'tenant-a', name: 'Real agent', role: 'Engineer', status: 'AVAILABLE', memory: [], skills: [], tools: [] };
  const { app, worldEngine } = fixture([storedAgent]);
  const request = async path => {
    let status;
    let body;
    await handleLivingCityRoutes(
      { method: 'GET' }, { writeHead(code) { status = code; }, end(value) { body = JSON.parse(value); } },
      new URL(`http://localhost${path}`), app,
      (_res, code, value) => { status = code; body = value; }, async () => ({}),
      { tenantId: 'tenant-a', actorId: 'admin' },
      { worldEngine, simulationEngine: { isRunning: true } },
    );
    assert.equal(status, 200);
    return body;
  };

  const detail = await request('/api/v2/living-city/agent/agent-real');
  assert.equal(detail.agent.model, null);
  assert.deepEqual(detail.agent.tools, []);
  assert.equal(detail.agent.tokens, null);
  assert.equal(detail.agent.latency, null);
  assert.deepEqual(detail.agent.episodicMemory, []);
  assert.equal(detail.agent.currentTask, null);
  assert.equal(detail.agent.lastAction, null);
  assert.equal(detail.agent.nextAction, null);

  const lifecycle = await request('/api/v2/living-city/agent/agent-real/lifecycle');
  assert.equal(lifecycle.lifecycle.whoAmI.model, null);
  assert.equal(lifecycle.lifecycle.whereAmI.buildingId, null);
  assert.equal(lifecycle.lifecycle.whereAmI.coordinates, null);
  assert.equal(lifecycle.lifecycle.whatAmIDoing.speed, null);
  assert.equal(lifecycle.lifecycle.whatWillIDoNext.nextAction, null);
  assert.equal(lifecycle.lifecycle.whatIsMyEnergyAndAttention.energyPercent, null);
  assert.equal(lifecycle.lifecycle.whatIsMyEnergyAndAttention.latency, null);
  assert.deepEqual(worldEngine.agents, {});
});
