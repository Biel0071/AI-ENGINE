const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { ExecutiveBrain } = require('../src/executive/executive-brain');
const { assertExecutiveContract } = require('../src/executive/executive-contract');

// EXECUTIVE BRAIN real. Prova o fluxo: objetivo -> decompose -> programa DRAFT -> approve
// -> missoes REAIS materializadas via mission-planner -> estado derivado. Numeros contados,
// nunca inventados. ASCII-only (lexer Node 18).

async function tenantApp() {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('the brain satisfies the contract and executes no AI directly', async () => {
  const app = await tenantApp();
  assert.equal(assertExecutiveContract(app.executiveBrain), true);
  // A trava: nenhum metodo de execucao de IA existe no brain.
  for (const forbidden of ['invoke', 'complete', 'chat']) {
    assert.notEqual(typeof app.executiveBrain[forbidden], 'function', `brain must not expose ${forbidden}`);
  }
  await app.close?.();
});

test('decompose returns a REAL, honest mission count from the template (not fabricated)', async () => {
  const app = await tenantApp();
  const d = await app.executiveBrain.decompose('grg', 'grg-admin', 'Criar um CRM completo');
  // Template BUILD_APP tem 6 missoes. O numero e contado, nao "27 missoes" inventado.
  assert.equal(d.missionCount.state, 'measured');
  assert.equal(d.missionCount.value, 6, 'CRM -> 6 missoes reais do template');
  assert.equal(d.missions.length, 6);
  // jobs NAO sao inventados na decomposicao - sao unknown ate materializar.
  assert.equal(d.jobCount.state, 'unknown', 'job count is unknown until the planner materializes');
  await app.close?.();
});

test('createProgram registers a DRAFT with proposed missions, nothing materialized yet', async () => {
  const app = await tenantApp();
  const program = await app.executiveBrain.createProgram('grg', 'grg-admin', 'Criar um ERP');
  assert.equal(program.state, 'DRAFT', 'program starts as DRAFT, awaiting human approval');
  assert.equal(program.missions.length, 6);
  assert.ok(program.missions.every((m) => m.missionId === null && m.status === 'PROPOSED'), 'no mission is materialized before approval');
  await app.close?.();
});

test('approve materializes REAL missions via the mission-planner and moves to APPROVED', async () => {
  const app = await tenantApp();
  const program = await app.executiveBrain.createProgram('grg', 'grg-admin', 'Criar um SaaS');
  const approved = await app.executiveBrain.approve('grg', 'grg-admin', program.id);
  assert.equal(approved.state, 'APPROVED');
  // Ao menos uma missao ganhou um missionId real do planner (as que nao precisam de input).
  const materialized = approved.missions.filter((m) => m.missionId);
  assert.ok(materialized.length >= 1, 'approval materialized at least one real mission via the planner');
  // Prova que sao missoes REAIS no store, nao referencias fantasma.
  const state = await app.store.read();
  const realIds = new Set(state.missions.map((mm) => mm.id));
  for (const m of materialized) assert.ok(realIds.has(m.missionId), 'the materialized missionId exists in the store');
  await app.close?.();
});

test('program status is DERIVED from real mission state, never a fixed literal', async () => {
  const app = await tenantApp();
  const program = await app.executiveBrain.createProgram('grg', 'grg-admin', 'Criar um marketplace');
  // Antes de aprovar: sem missao materializada, progresso e unknown honesto (nao 0 fabricado).
  const before = await app.executiveBrain.status('grg', 'grg-admin', program.id);
  assert.equal(before.progress.state, 'unknown', 'no materialized mission -> unknown progress, not fake 0');
  await app.executiveBrain.approve('grg', 'grg-admin', program.id);
  const after = await app.executiveBrain.status('grg', 'grg-admin', program.id);
  // Depois de materializar: estado e progresso sao MEDIDOS do estado real das missoes.
  assert.equal(after.state.state, 'measured', 'program state is derived from mission states');
  assert.equal(after.progress.state, 'measured', 'progress is measured, not declared');
  await app.close?.();
});

test('quality is honestly unknown - no fabricated score', async () => {
  const app = await tenantApp();
  const program = await app.executiveBrain.createProgram('grg', 'grg-admin', 'Criar uma landing page');
  const q = await app.executiveBrain.quality('grg', 'grg-admin', program.id);
  assert.equal(q.quality.state, 'unknown', 'quality has no signal yet -> unknown, never a made-up score');
  await app.close?.();
});
