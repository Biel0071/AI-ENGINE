const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('Engineering Memory only promotes validated evidence and supports reuse lifecycle', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'memory-test', name: 'Memory Test' }, 'operator');
  const project = await app.projectKernel.create('memory-test', 'operator', { id: 'memory-project', name: 'Memory Project' });
  await assert.rejects(() => app.engineeringMemory.promote('memory-test', 'operator', { projectId: project.id, kind: 'component', title: 'Unsafe component' }), /requires successful tests/);
  const memory = await app.engineeringMemory.promote('memory-test', 'operator', { projectId: project.id, kind: 'component', key: 'http-health-check', title: 'HTTP health check', summary: 'Reusable health endpoint with deterministic tests', testsPassed: true, validationPassed: true, validationScore: 0.95, content: { route: '/healthz' } });
  assert.equal(memory.status, 'VALIDATED');
  assert.equal((await app.engineeringMemory.search('memory-test', 'operator', { q: 'health endpoint' }))[0].id, memory.id);
  assert.equal((await app.engineeringMemory.get('memory-test', 'operator', memory.id)).id, memory.id);
  const feedback = await app.engineeringMemory.feedback('memory-test', 'operator', memory.id, true, { timeSavedMs: 1200 });
  assert.equal(feedback.memory.usageCount, 1);
  assert.equal(feedback.event.metadata.timeSavedMs, 1200);
  const projectComponents = (await app.engineeringMemory.search('memory-test', 'operator', { q: 'health' })).filter((item) => item.sourceProjects.includes(project.id));
  assert.equal(projectComponents.length, 1);
  await app.engineeringMemory.invalidate('memory-test', 'operator', memory.id, 'superseded by newer component');
  assert.equal((await app.engineeringMemory.search('memory-test', 'operator', { q: 'health' })).length, 0);
  await app.close();
});
