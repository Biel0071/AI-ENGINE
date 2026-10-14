const path = require('node:path');
const { createApp } = require('../src/app');

(async () => {
  const dataFile = path.resolve(__dirname, '../.data/state.json');
  const app = await createApp({ dataFile });
  let attempts = 0;
  app.jobs.handlers.set('operational.daily-intelligence', async () => {
    attempts += 1;
    if (attempts <= 3) throw new Error('controlled failure for persisted repair proof');
    return { proof: 'repair-pass' };
  });
  const mission = await app.missions.create('grg', 'grg-admin', {
    title: 'Persisted Repair Proof', objective: 'Prove terminal failure, repair, retest and continuation',
    steps: [
      { key: 'first', type: 'daily-intelligence' },
      { key: 'second', type: 'daily-intelligence', dependsOn: ['first'] },
    ],
  });
  await app.missions.start('grg', 'grg-admin', mission.id);
  for (let i = 0; i < 8; i += 1) {
    await app.jobs.runBatch('persisted-repair-proof', 5);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  const result = await app.missions.get('grg', 'grg-admin', mission.id);
  if (result.status !== 'SUCCEEDED' || result.progress !== 100 || !result.events.some((event) => event.type === 'mission.repair.created')) {
    throw new Error(`persisted repair proof failed: ${result.status}/${result.progress}`);
  }
  console.log(JSON.stringify({ missionId: result.id, status: result.status, progress: result.progress, events: result.events.map((event) => event.type), steps: result.steps.map((step) => ({ key: step.key, status: step.status, repairJobIds: step.repairJobIds || [] })) }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
