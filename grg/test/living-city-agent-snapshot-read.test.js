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

test('full City snapshot derives tenant jobs and worker metrics without duplicate store reads', async () => {
  const agentId = 'city-snapshot-agent';
  const calls = { stateReads: 0, jobListCalls: 0, workerCalls: 0 };
  const heartbeatAt = new Date().toISOString();
  const runtimeJobs = [
    { id: 'city-running', tenantId: 'tenant-a', status: 'RUNNING', workerId: 'worker-a', agent: { agentId }, progress: 35 },
    { id: 'city-done', tenantId: 'tenant-a', status: 'SUCCEEDED', lastWorkerId: 'worker-a' },
    { id: 'city-foreign', tenantId: 'tenant-b', status: 'FAILED', lastWorkerId: 'worker-a' },
  ];
  const app = {
    controlPlane: { authorize: async () => {} },
    store: {
      read: async () => {
        calls.stateReads += 1;
        return {
          agentProfiles: [], agents: [], cognitiveAgents: [], memories: [], runtimeJobs,
          workerHeartbeats: [{ workerId: 'worker-a', lastSeenAt: heartbeatAt, startedAt: '2026-10-13T00:00:00.000Z' }],
        };
      },
    },
    agentRegistry: { list: () => [{ id: agentId, name: 'City Snapshot Agent', status: 'AVAILABLE' }] },
    jobs: {
      list: async () => { calls.jobListCalls += 1; return runtimeJobs; },
      workers: async () => { calls.workerCalls += 1; return []; },
    },
    missions: { list: async () => [] },
    projectKernel: { list: async () => [] },
  };

  const city = await livingCityState(app, 'tenant-a', 'actor-a');

  assert.equal(calls.stateReads, 1);
  assert.equal(calls.jobListCalls, 0);
  assert.equal(calls.workerCalls, 0);
  assert.equal(city.agents.find((agent) => agent.id === agentId)?.currentJob.id, 'city-running');
  assert.deepEqual(city.recentJobs.map((job) => job.id), ['city-done', 'city-running']);
  assert.deepEqual(city.workers, [{
    id: 'worker-a', status: 'ONLINE', currentJob: 'city-running', processed: 1, failed: 0,
    lastHeartbeat: heartbeatAt,
  }]);
});
