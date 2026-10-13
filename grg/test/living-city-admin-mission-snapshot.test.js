'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { livingCityState } = require('../src/api/living-city-routes');

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
