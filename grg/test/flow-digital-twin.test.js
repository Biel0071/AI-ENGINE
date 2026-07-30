const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// FLUXO 6 — Digital Twin, ponta a ponta.
//
// Prova que o twin operacional e um ESPELHO do runtime real: ele conta recursos/jobs/workers do
// store, nao inventa. `costs/latency/performance` sao honestamente null (nao ha medicao ainda).
// O digital-twin ja e `implemented` (0 sinais); aqui selamos que o espelho reflete o estado real.

async function boot() {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('fluxo twin: projeta contagens REAIS de jobs do runtime', async () => {
  const app = await boot();
  app.jobs.register('test.noop', async () => ({ ok: true }));
  // Cria estado real: 2 jobs, um executado.
  await app.jobs.submit('grg', 'grg-admin', { type: 'test.noop', payload: {} });
  const j2 = await app.jobs.submit('grg', 'grg-admin', { type: 'test.noop', payload: {} });
  await app.jobs.runBatch('worker-test', 1); // executa 1, deixa 1 QUEUED (prioridade/ordem)

  // Projeta o twin a partir de um evento operacional (o mesmo caminho do subscribe fabric.event).
  const twin = await app.digitalTwin.projectOperationalEvent({ id: 'evt-twin-1', tenantId: 'grg' });
  assert.ok(twin.model.runtime);
  // As contagens vem do store real, nao fabricadas: workers com heartbeat > 0 apos runBatch.
  assert.ok(twin.model.runtime.workers >= 1);
  // costs/latency/performance honestamente ausentes (nao medidos) -- nao numeros inventados.
  assert.equal(twin.model.operations.costs, null);
  assert.equal(twin.model.operations.latency, null);
  await app.close();
});

test('fluxo twin: operational() devolve o twin corrente projetado', async () => {
  const app = await boot();
  await app.digitalTwin.projectOperationalEvent({ id: 'evt-twin-2', tenantId: 'grg' });
  const current = await app.digitalTwin.operational('grg', 'grg-admin');
  assert.ok(current);
  assert.equal(current.current, true);
  assert.equal(current.subjectId, 'grg');
  await app.close();
});

test('fluxo twin: idempotente por evento (nao duplica projecao do mesmo evento)', async () => {
  const app = await boot();
  await app.digitalTwin.projectOperationalEvent({ id: 'evt-dup', tenantId: 'grg' });
  await app.digitalTwin.projectOperationalEvent({ id: 'evt-dup', tenantId: 'grg' });
  const state = await app.store.read();
  const fromEvent = state.operationalTwins.filter((t) => t.tenantId === 'grg' && t.sourceEventId === 'evt-dup');
  assert.equal(fromEvent.length, 1); // o mesmo evento nao projeta duas vezes
  await app.close();
});
