const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('FENIX assigns a registered specialist and delivers Project Kernel context to jobs', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'agent-test', name: 'Agent Test' }, 'operator');
  const project = await app.projectKernel.create('agent-test', 'operator', { id: 'agent-project', name: 'Agent Project', workspace: process.cwd(), branch: 'fenix-test' });
  app.jobs.register('agent.context-check', async (payload, context) => ({ agent: context.job.agent, projectId: context.job.projectId, contextProject: context.job.agent?.context?.project?.id, payload }));
  const job = await app.jobs.submit('agent-test', 'operator', { type: 'agent.context-check', source: 'api', projectId: project.id, prompt: 'Implement backend API', requiredCapabilities: ['backend'], payload: { action: 'inspect' } });
  assert.equal(job.agent.agentId, 'Backend');
  assert.equal(job.agent.context.project.id, project.id);
  const [done] = await app.jobs.runBatch('agent-worker', 1);
  assert.equal(done.status, 'SUCCEEDED');
  assert.equal(done.result.contextProject, project.id);
  await app.close();
});
