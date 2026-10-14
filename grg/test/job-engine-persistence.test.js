const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');

test('queued conversation jobs resume after an API restart and keep their result and trace', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-job-restart-'));
  const dataFile = path.join(directory, 'state.json');
  const options = { dataFile, llm: false, operationalActivation: false, localRuntimeWorker: false };
  let app;
  try {
    app = await createApp(options);
    await app.controlPlane.createTenant({ id: 'restart-test', name: 'Restart test' }, 'alice');
    app.jobs.register('test.restart', async ({ prompt }) => ({ summary: `finished: ${prompt}` }));
    const queued = await app.jobs.submit('restart-test', 'alice', {
      type: 'test.restart',
      source: 'fenix-chat',
      prompt: 'inspect the project',
      conversationId: 'conversation-restart-1',
      projectId: 'project-restart-1',
      maxAttempts: 2,
    });
    assert.equal(queued.status, 'QUEUED');
    await app.close();

    app = await createApp(options);
    app.jobs.register('test.restart', async ({ prompt }) => ({ summary: `finished: ${prompt}` }));
    const [done] = await app.jobs.runBatch('worker-after-api-restart');
    assert.equal(done.id, queued.id);
    assert.equal(done.status, 'SUCCEEDED');
    assert.deepEqual(done.result, { summary: 'finished: inspect the project' });
    await app.close();

    app = await createApp(options);
    const restored = await app.jobs.getInternal('restart-test', queued.id);
    assert.equal(restored.status, 'SUCCEEDED');
    assert.equal(restored.conversationId, 'conversation-restart-1');
    assert.equal(restored.projectId, 'project-restart-1');
    assert.deepEqual(restored.result, { summary: 'finished: inspect the project' });
    const events = await app.eventStore.list('restart-test');
    assert.ok(events.some((event) => event.type === 'runtime.job.queued' && event.data.jobId === queued.id));
    assert.ok(events.some((event) => event.type === 'runtime.job.succeeded' && event.data.jobId === queued.id));
  } finally {
    await app?.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
