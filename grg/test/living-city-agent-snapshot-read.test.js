'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { livingCityState } = require('../src/api/living-city-routes');

test('agent-only City snapshot reuses its tenant state read for running-job attribution', async () => {
  const agentId = 'snapshot-agent';
  const calls = { stateReads: 0, jobListCalls: 0 };
  const runtimeJobs = [{
    id: 'snapshot-job',
    tenantId: 'tenant-a',
    status: 'RUNNING',
    agent: { agentId },
  }];
  const app = {
    controlPlane: { authorize: async () => {} },
    store: {
      read: async () => {
        calls.stateReads += 1;
        return {
          agentProfiles: [], agents: [], cognitiveAgents: [], memories: [], runtimeJobs,
        };
      },
    },
    agentRegistry: { list: () => [{ id: agentId, name: 'Snapshot Agent', status: 'AVAILABLE' }] },
    jobs: {
      list: async () => { calls.jobListCalls += 1; return runtimeJobs; },
      workers: async () => [],
    },
    missions: { list: async () => [] },
    projectKernel: { list: async () => [] },
  };

  const city = await livingCityState(app, 'tenant-a', 'actor-a', { agentsOnly: true });

  assert.equal(calls.stateReads, 1);
  assert.equal(calls.jobListCalls, 0);
  assert.equal(city.agents.find((agent) => agent.id === agentId)?.currentJob.id, 'snapshot-job');
});
