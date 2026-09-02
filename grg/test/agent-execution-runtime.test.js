const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('Agent Runtime calls the configured provider and passes its tool plan to the workspace executor', async () => {
  let calls = 0;
  const app = await createApp({ dataFile: null, providers: { model: { complete: async ({ prompt }) => { calls += 1; assert.match(prompt, /Project context/); return { text: JSON.stringify({ operations: [], tests: [], runTests: false, validationPassed: true, policyAllows: false, commit: false }), model: 'model-1', promptTokens: 12, completionTokens: 10 }; } } }, routes: { default: { provider: 'model', model: 'model-1' }, generate: { provider: 'model', model: 'model-1' }, plan: { provider: 'model', model: 'model-1' } } });
  await app.controlPlane.createTenant({ id: 'agent-runtime', name: 'Agent Runtime' }, 'operator');
  const project = await app.projectKernel.create('agent-runtime', 'operator', { id: 'runtime-project', name: 'Runtime Project', workspace: process.cwd() });
  const job = await app.jobs.submit('agent-runtime', 'operator', { type: 'agent.execute', source: 'api', projectId: project.id, prompt: 'Inspect and improve calculator', requiredCapabilities: ['backend'], payload: { projectId: project.id, prompt: 'Inspect and improve calculator' } });
  const [done] = await app.jobs.runBatch('agent-runtime-worker', 1);
  assert.equal(done.status, 'SUCCEEDED'); assert.equal(calls, 1); assert.equal(done.result.provider, 'model'); assert.equal(done.result.model, 'model-1'); assert.equal(done.result.result, 'VALIDATED_NO_COMMIT');
  await app.close();
});
