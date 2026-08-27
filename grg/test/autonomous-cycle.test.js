const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { runAutonomousCycle } = require('../src/server');

async function bootstrap() {
  const app = await createApp({ env: { NODE_ENV: 'test' }, operationalActivation: false });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('autonomous cycle composes ExecutiveBrain, MissionKernel and JobEngine without the parallel JARVIS route', async () => {
  const app = await bootstrap();
  try {
    const result = await runAutonomousCycle(app, 'grg', 'grg-admin', {
      objective: 'Operar health readiness do FENIX',
      maxConcurrent: 2,
      workLimit: 4,
    });

    assert.equal(result.ok, true);
    assert.equal(result.mode, 'CANONICAL_EXECUTIVE_PROGRAM');
    assert.ok(result.program.id);
    assert.ok(result.program.missions.length >= 1);
    assert.ok(result.startedMissions.length >= 1);
    assert.ok(result.jobs.length >= 1);

    const state = await app.store.read();
    assert.ok(state.programs.some((program) => program.id === result.program.id));
    assert.ok(state.missions.some((mission) => result.program.missions.some((ref) => ref.missionId === mission.id)));
    assert.ok(state.runtimeJobs.length >= result.jobs.length);
    assert.ok(state.domainEvents.some((event) => event.type === 'autonomous.cycle.completed'));
  } finally {
    await app.close();
  }
});
