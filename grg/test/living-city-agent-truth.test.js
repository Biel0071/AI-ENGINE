'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { livingCityState } = require('../src/api/living-city-routes');

function appWithAgent(agent, jobs = []) {
  return {
    controlPlane: { authorize: async () => {} },
    store: { read: async () => ({ agentProfiles: [], agents: [], cognitiveAgents: [], memories: [] }) },
    agentRegistry: { list: () => [agent] },
    jobs: { list: async () => jobs, workers: async () => [] },
    missions: { list: async () => [] },
    projectKernel: { list: async () => [] },
  };
}

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
});
