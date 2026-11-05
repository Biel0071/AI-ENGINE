'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { livingCityState } = require('../src/api/living-city-routes');
const { getWorldStateEngine } = require('../src/world-model/world-state-engine');

test('admin City state reuses its authorized tenant snapshot for mission metrics', async () => {
  const calls = { stateReads: 0, missionList: 0 };
  const app = {
    controlPlane: { authorize: async () => ({ role: 'admin' }) },
    store: {
      read: async () => {
        calls.stateReads += 1;
        return {
          agentProfiles: [], agents: [], cognitiveAgents: [], memories: [],
          runtimeJobs: [], workerHeartbeats: [], worldAssets: [],
          missions: [
            { id: 'mission-a', tenantId: 'tenant-a', status: 'RUNNING' },
            { id: 'mission-b', tenantId: 'tenant-b', status: 'RUNNING' },
          ],
        };
      },
    },
    agentRegistry: { list: () => [] },
    jobs: { list: async () => [], workers: async () => [] },
    missions: {
      list: async () => { calls.missionList += 1; return []; },
    },
    projectKernel: { list: async () => [] },
  };

  const city = await livingCityState(app, 'tenant-a', 'actor-a');

  assert.equal(calls.stateReads, 1);
  assert.equal(calls.missionList, 0);
  assert.equal(city.metrics.activeMissions, 1);
});

test('tenant agent records override world catalog collisions without exposing other tenants', async () => {
  const world = getWorldStateEngine();
  const previousAgents = world.agents;
  world.agents = {
    'shared-agent': { id: 'shared-agent', tenantId: 'tenant-b', name: 'Foreign catalog identity', status: 'WORKING', coordinates: { x: 99, z: 99 } },
    'foreign-agent': { id: 'foreign-agent', tenantId: 'tenant-b', name: 'Foreign agent', status: 'AVAILABLE' },
  };
  const app = {
    controlPlane: { authorize: async () => ({ role: 'admin' }) },
    store: { read: async () => ({
      agentProfiles: [], cognitiveAgents: [], memories: [], runtimeJobs: [], workerHeartbeats: [], worldAssets: [], missions: [],
      agents: [
        { id: 'shared-agent', tenantId: 'tenant-a', name: 'Tenant agent', status: 'AVAILABLE', coordinates: { x: 4, z: 7 } },
      ],
    }) },
    projectKernel: { list: async () => [] },
    jobs: { list: async () => [], workers: async () => [] },
    missions: { list: async () => [] },
    agentRegistry: { list: () => [] },
  };

  try {
    const city = await livingCityState(app, 'tenant-a', 'actor-a');
    const shared = city.agents.find((agent) => agent.id === 'shared-agent');
    assert.equal(shared.name, 'Tenant agent');
    assert.deepEqual(shared.coordinates, { x: 4, z: 7 });
    assert.equal(city.agents.some((agent) => agent.id === 'foreign-agent'), false);
  } finally {
    world.agents = previousAgents;
  }
});

test('City treats saved WORKING status as available when no live job is attached', async () => {
  const world = getWorldStateEngine();
  const previousAgents = world.agents;
  world.agents = {};
  const app = {
    controlPlane: { authorize: async () => ({ role: 'admin' }) },
    store: { read: async () => ({
      agentProfiles: [], cognitiveAgents: [], memories: [], runtimeJobs: [], workerHeartbeats: [], worldAssets: [], missions: [],
      agents: [{ id: 'agent-stale', tenantId: 'tenant-a', name: 'Stale status', status: 'WORKING' }],
    }) },
    projectKernel: { list: async () => [] }, jobs: { list: async () => [], workers: async () => [] },
    missions: { list: async () => [] }, agentRegistry: { list: () => [] },
  };

  try {
    const city = await livingCityState(app, 'tenant-a', 'actor-a');
    const agent = city.agents.find((item) => item.id === 'agent-stale');
    assert.equal(agent.status, 'AVAILABLE');
    assert.equal(agent.currentJob, null);
  } finally {
    world.agents = previousAgents;
  }
});
