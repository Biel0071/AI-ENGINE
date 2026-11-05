'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { livingCityState } = require('../src/api/living-city-routes');
const { WorldSimulationEngine } = require('../src/world-model/world-simulation-engine');

function appWithAgent(agent, jobs = [], agentProfiles = []) {
  return {
    controlPlane: { authorize: async () => {} },
    store: { read: async () => ({ agentProfiles, agents: [], cognitiveAgents: [], memories: [] }) },
    agentRegistry: { list: () => [agent] },
    jobs: { list: async () => jobs, workers: async () => [] },
    missions: { list: async () => [] },
    projectKernel: { list: async () => [] },
  };
}

test('City preserves ground floor zero in the agent projection', async () => {
  const id = `ground-floor-agent-${randomUUID()}`;
  const city = await livingCityState(appWithAgent({
    id, name: 'Ground Floor Agent', status: 'AVAILABLE', floorNum: 0,
  }), 'tenant', 'actor', { agentsOnly: true });

  assert.equal(city.agents.find((item) => item.id === id).floorNum, 0);
});

test('City marks an agent available when its stored working job is not running', async () => {
  const id = `stale-agent-${randomUUID()}`;
  const city = await livingCityState(appWithAgent({
    id,
    name: 'Stale Agent',
    status: 'WORKING',
    currentJob: { id: 'completed-job', name: 'Completed task', status: 'SUCCEEDED' },
  }), 'tenant', 'actor', { agentsOnly: true });

  const agent = city.agents.find((item) => item.id === id);
  assert.ok(agent);
  assert.equal(agent.status, 'AVAILABLE');
  assert.equal(agent.state, 'AVAILABLE');
  assert.equal(agent.currentJob, null);
  assert.equal(agent.currentTask, null);
});

test('City only marks an agent working for a matching running runtime job', async () => {
  const id = `running-agent-${randomUUID()}`;
  const job = {
    id: 'active-job',
    type: 'city.probe',
    status: 'RUNNING',
    agent: { agentId: id, model: 'qwen2.5:3b', provider: 'ollama' },
  };
  const city = await livingCityState(appWithAgent({ id, name: 'Running Agent', status: 'AVAILABLE' }, [job]), 'tenant', 'actor', { agentsOnly: true });

  const agent = city.agents.find((item) => item.id === id);
  assert.ok(agent);
  assert.equal(agent.status, 'WORKING');
  assert.equal(agent.currentJob.id, job.id);
  assert.equal(agent.currentTask, job.type);
});

test('City keeps queued runtime jobs distinct from work already started', async () => {
  const id = `queued-agent-${randomUUID()}`;
  const job = {
    id: 'queued-job', type: 'city.probe', status: 'QUEUED',
    agent: { agentId: id },
  };
  const city = await livingCityState(appWithAgent({ id, name: 'Queued Agent', status: 'AVAILABLE' }, [job]), 'tenant', 'actor', { agentsOnly: true });

  const agent = city.agents.find((item) => item.id === id);
  assert.ok(agent);
  assert.equal(agent.status, 'QUEUED');
  assert.equal(agent.state, 'QUEUED');
  assert.equal(agent.currentJob.id, job.id);
});

test('City preserves a measured walk destination independently from execution status', async () => {
  const id = `walking-agent-${randomUUID()}`;
  const agent = {
    id, name: 'Walking Agent', status: 'WORKING', state: 'WALKING',
    coordinates: { x: 1, y: 2 }, targetCoordinates: { x: 8, y: 9 }, path: [{ x: 4, y: 5 }, { x: 8, y: 9 }],
  };
  const city = await livingCityState(appWithAgent(agent), 'tenant', 'actor', { agentsOnly: true });
  const projection = city.agents.find((item) => item.id === id);

  assert.equal(projection.status, 'WORKING');
  assert.equal(projection.movementState, 'WALKING');
  assert.deepEqual(projection.targetCoordinates, agent.targetCoordinates);
  assert.deepEqual(projection.path, agent.path);
});

test('City attaches a tenant-scoped generated avatar profile without claiming an external source', async () => {
  const id = `profile-agent-${randomUUID()}`;
  let profileInput;
  const app = appWithAgent({ id, name: 'Browser Agent', role: 'Browser Automation' });
  app.agentAvatarRegistry = {
    getOrCreateMany(agents) {
      profileInput = agents;
      return agents.map((agent) => ({
        agentId: agent.id,
        source: 'generated-from-role',
        appearance: { archetype: 'visual-engineer', colorProfile: 'azure' },
        personalityProfile: { archetype: 'visual-engineer', communicationStyle: 'visual-and-iterative' },
      }));
    },
  };

  const city = await livingCityState(app, 'tenant-a', 'actor-a', { agentsOnly: true });
  const agent = city.agents.find((item) => item.id === id);

  assert.equal(agent.avatarProfileSource, 'generated-from-role');
  assert.equal(agent.avatar.personalityProfile.communicationStyle, 'visual-and-iterative');
  assert.equal(profileInput.find((profile) => profile.id === id).registryKey, `tenant-a:${id}`);
});

test('City exposes the saved tenant avatar profile to its 3D agent record', async () => {
  const id = `custom-profile-agent-${randomUUID()}`;
  const avatar = { skin: 'tan', hairColor: 'purple', shirtColor: '#123abc', accessory: 'headphones' };
  const app = appWithAgent({ id, name: 'Before', role: 'Security' }, [], [{
    id, tenantId: 'tenant-a', displayName: 'ZAI Designer', role: 'Product Designer', avatar,
  }]);

  const city = await livingCityState(app, 'tenant-a', 'actor-a', { agentsOnly: true });
  const agent = city.agents.find((item) => item.id === id);
  assert.equal(agent.name, 'ZAI Designer');
  assert.equal(agent.role, 'Product Designer');
  assert.deepEqual(agent.avatar, avatar);
});

test('City does not present a stale world-simulation label as a current task without a runtime job', async () => {
  const id = `idle-agent-${randomUUID()}`;
  const staleLabel = 'Ronda preventiva e verificação de integridade operacional';
  const city = await livingCityState(appWithAgent({
    id, name: 'Idle Agent', status: 'AVAILABLE', currentTask: staleLabel,
  }), 'tenant', 'actor', { agentsOnly: true });

  assert.equal(city.agents.find((item) => item.id === id).currentTask, null);
});

test('world simulation does not create or complete unbacked agent work', () => {
  const agent = { id: 'idle-agent', state: 'IDLE', status: 'AVAILABLE', memory: [], currentJob: null };
  const engine = new WorldSimulationEngine({
    agents: { [agent.id]: agent }, workstations: {},
    getSnapshot: () => ({ agents: [agent] }),
  });
  const previousRandom = Math.random;
  Math.random = () => 0;
  try {
    engine.tickCount = 20;
    engine.simulateAgents();
    assert.equal(agent.state, 'IDLE');
    assert.equal(agent.currentTask, undefined);

    agent.state = 'WORKING';
    agent.currentJob = { id: 'real-job', status: 'RUNNING', progress: 17 };
    engine.tickCount = 35;
    engine.simulateAgents();
    assert.equal(agent.currentJob.progress, 17, 'JobEngine owns execution progress');
    assert.equal(agent.state, 'WORKING', 'the simulator cannot claim a job completed');
    assert.deepEqual(agent.memory, [], 'a success memory requires a real completion result');

    agent.currentJob = null;
    engine.tickCount = 70;
    engine.simulateAgents();
    assert.equal(agent.state, 'WORKING', 'unlinked routine work cannot auto-complete');
    assert.deepEqual(agent.memory, []);
  } finally {
    Math.random = previousRandom;
  }
});

test('world simulation still moves an explicitly assigned agent to its measured workstation', () => {
  const agent = {
    id: 'assigned-agent', state: 'RECEIVING_TASK', status: 'WORKING',
    assignedTask: { id: 'task-1', taskName: 'Auditoria real' },
    workstationId: 'station-1', coordinates: { x: 1, y: 2 }, memory: [],
  };
  const engine = new WorldSimulationEngine({
    agents: { [agent.id]: agent },
    workstations: { 'station-1': { coordinates: { x: 4, y: 5 } } },
    getSnapshot: () => ({ agents: [agent] }),
  });

  engine.simulateAgents();
  assert.equal(agent.state, 'WALKING');
  assert.deepEqual(agent.targetCoordinates, { x: 4, y: 5 });

  agent.coordinates = { x: 4, y: 5 };
  engine.simulateAgents();
  assert.equal(agent.state, 'WORKING');
  assert.deepEqual(agent.memory, []);
});
