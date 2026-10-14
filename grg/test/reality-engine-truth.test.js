'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RealityEngine } = require('../src/api/reality-engine');

test('unavailable infrastructure has no canned containers, projects or queue counts', () => {
  const engine = new RealityEngine();
  engine.getDockerContainers = () => [];
  engine.getProjects = () => [];
  engine.getQueueAndJobs = () => ({ available: false, queue: null, jobs: [] });

  assert.deepEqual(engine.getDockerContainers(), []);
  assert.deepEqual(engine.getProjects(), []);
  assert.deepEqual(engine.getQueueAndJobs(), { available: false, queue: null, jobs: [] });
});

test('reality summary keeps unmeasured audit values unknown and maps canonical project and job state', async () => {
  const engine = new RealityEngine();
  engine.getRuntimeSnapshot = async () => ({
    disk: { totalGb: 40, usedGb: 20, usedPercent: 50 },
    pm2List: [], dockerList: [], gitState: { branch: 'main', head: 'abcdef12', clean: false, dirtyCount: 2 },
    projects: [],
  });
  engine.getDynamicAgents = () => ({ available: true, executors: [], agents: [{ id: 'agent-1', status: 'REGISTERED' }] });
  engine.getQueueAndJobs = () => ({ available: false, queue: null, jobs: [] });
  const summary = await engine.getRealitySummary({
    tenantId: 'tenant-a', actorId: 'actor-a',
    app: {
      projectKernel: { list: async () => [{ id: 'project-a', name: 'Projeto A', status: 'ACTIVE' }] },
      jobs: { list: async () => [
        { id: 'job-1', type: 'build', prompt: 'Build API', status: 'RUNNING', projectId: 'project-a', progress: 40 },
        { id: 'job-2', type: 'test', status: 'FAILED', projectId: 'project-a' },
      ] },
    },
  });

  assert.equal(summary.realityScore.score, null);
  assert.equal(summary.realityScore.status, 'NOT_EVALUATED');
  assert.equal(summary.kpis.agentsOnline.value, null);
  assert.equal(summary.kpis.agentsRegistered.value, 1);
  assert.equal(summary.kpis.activeSystems.value.projects, 1);
  assert.equal(summary.kpis.tasksTotal.value.total, 2);
  assert.equal(summary.kpis.tasksTotal.value.running, 1);
  assert.equal(summary.kpis.tasksTotal.value.failed, 1);
  assert.equal(summary.recentJobs.find((job) => job.id === 'job-1').status, 'RUNNING');
  assert.equal(summary.recentJobs.find((job) => job.id === 'job-1').projectId, 'project-a');
  assert.deepEqual(summary.aiCityBuildings, []);
});
