'use strict';
// Entrega A - certificacao em producao (2026-11-16): o passo `code` foi despachado DUAS vezes.
// Causa: reconcile() tratava DISPATCHING sem job ha mais de 5 s como reserva orfa e devolvia a
// PLANNED, mas em producao cada gravacao do estado leva varios segundos; o worker re-despachou e
// dois workers rodaram o mesmo trabalho. ASCII apenas (lexer TAP).
process.env.FENIX_TEST_MODE = 'true';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function setup() {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  const mission = await app.missions.create('grg', 'grg-admin', { title: 'dispatch race', objective: 'um passo', steps: [{ key: 'only', type: 'discover', payload: {} }] });
  const stepId = mission.steps[0].id;
  // estado de corrida: passo reservado (DISPATCHING), sem jobId, reserva com idade `ageMs`
  const reserve = (ageMs) => app.store.update((s) => { const m = s.missions.find((x) => x.id === mission.id); m.status = 'RUNNING'; const st = s.missionSteps.find((x) => x.id === stepId); st.status = 'DISPATCHING'; st.jobId = null; st.updatedAt = new Date(Date.now() - ageMs).toISOString(); return s; });
  const jobsOf = async () => (await app.store.read()).runtimeJobs.filter((j) => j.missionId === mission.id);
  const stepOf = async () => (await app.store.read()).missionSteps.find((x) => x.id === stepId);
  return { app, mission, stepId, reserve, jobsOf, stepOf };
}

test('the dispatched job carries the mission step id so it can be found again', async () => {
  const { app, mission, jobsOf } = await setup();
  try {
    await app.missions.start('grg', 'grg-admin', mission.id);
    const jobs = await jobsOf();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].payload.missionStepId, mission.steps[0].id);
  } finally { await app.close(); }
});

test('reconcile does not treat a slow in-flight reservation (10 s) as orphan', async () => {
  const { app, reserve, jobsOf, stepOf } = await setup();
  try {
    await reserve(10_000);
    await app.missions.reconcile('grg', 'grg-admin');
    assert.equal((await stepOf()).status, 'DISPATCHING', 'a 10 s reservation is still in flight in production');
    assert.equal((await jobsOf()).length, 0, 'no second job');
  } finally { await app.close(); }
});

test('reconcile adopts a job already created for the reserved step instead of dispatching another', async () => {
  const { app, mission, stepId, reserve, jobsOf, stepOf } = await setup();
  try {
    await reserve(10 * 60_000);
    const job = await app.jobs.submit('grg', 'grg-admin', { type: 'discovery.scan', missionId: mission.id, payload: { missionId: mission.id, missionStepId: stepId } });
    await app.missions.reconcile('grg', 'grg-admin');
    const step = await stepOf();
    assert.equal(step.status, 'DISPATCHED');
    assert.equal(step.jobId, job.id);
    assert.equal((await jobsOf()).length, 1, 'exactly one job for the step');
  } finally { await app.close(); }
});

test('a reservation older than the orphan window with no job is released and dispatched once', async () => {
  const { app, reserve, jobsOf, stepOf } = await setup();
  try {
    await reserve(10 * 60_000);
    await app.missions.reconcile('grg', 'grg-admin');
    const jobs = await jobsOf();
    assert.equal(jobs.length, 1);
    assert.equal((await stepOf()).jobId, jobs[0].id);
  } finally { await app.close(); }
});