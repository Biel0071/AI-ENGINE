const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('validated implementation memory is persisted and measurable across reuse', async () => {
  const app = await createApp({ dataFile: null, operationalActivation: false });
  await app.controlPlane.createTenant({ id: 'memory-e2e', name: 'Memory E2E' }, 'operator');
  try {
    const memory = await app.engineeringMemory.promote('memory-e2e', 'operator', {
      kind: 'component', key: 'mission-progress-panel', name: 'Mission Progress Panel',
      summary: 'Validated reusable mission progress component', testsPassed: true,
      validationPassed: true, content: { files: ['public/command-center.js'], status: 'VALIDATED' },
    });
    await app.engineeringMemory.reuse('memory-e2e', 'operator', memory.id, { target: 'operations' });
    await app.engineeringMemory.reuse('memory-e2e', 'operator', memory.id, { target: 'ide' });
    const metrics = await app.engineeringMemory.metrics('memory-e2e', 'operator');
    assert.equal(metrics.memories, 1);
    assert.equal(metrics.validated, 1);
    assert.equal(metrics.reuseEvents, 2);
    assert.equal(metrics.reusedMemories, 1);
    assert.equal(metrics.reuseScore, 100);
    const persisted = await app.engineeringMemory.get('memory-e2e', 'operator', memory.id);
    assert.equal(persisted.usageCount, 2);
  } finally { await app.close(); }
});
