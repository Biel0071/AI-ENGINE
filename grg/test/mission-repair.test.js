const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('mission creates a repair job after terminal failure and continues the DAG', async () => {
  const app = await createApp({ operationalActivation: false, llm: false });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await app.controlPlane.addMember('grg', 'alice', { userId: 'bob', role: 'admin' });
  let calls = 0;
  app.jobs.handlers.set('operational.daily-intelligence', async () => {
    calls += 1;
    if (calls <= 3) throw new Error('controlled failure for repair proof');
    return { repairedPath: true };
  });
  const mission = await app.missions.create('grg', 'alice', {
    title: 'Repair proof', objective: 'Prove repair and continuation',
    steps: [
      { key: 'first', type: 'daily-intelligence' },
      { key: 'second', type: 'daily-intelligence', dependsOn: ['first'] },
    ],
  });
  await app.missions.start('grg', 'alice', mission.id);
  for (let i = 0; i < 8; i += 1) {
    await app.jobs.runBatch('repair-proof-worker', 5);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  const result = await app.missions.get('grg', 'alice', mission.id);
  const state = await app.store.read();
  assert.equal(result.status, 'SUCCEEDED');
  assert.equal(result.progress, 100);
  assert.ok(result.events.some((event) => event.type === 'mission.repair.created'));
  assert.ok(state.runtimeJobs.some((job) => job.type === 'mission.repair' && job.status === 'SUCCEEDED'));
  assert.equal(state.runtimeJobs.filter((job) => job.missionId === mission.id && job.status === 'QUEUED').length, 0);
  await app.close();
});
