const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// FLUXO 2 — Executar Jobs, ponta a ponta.
//
// Prova que um job submetido e REALMENTE executado por um handler, produz resultado real e
// avanca de estado por evento -- e que um handler que falha vira FAILED/retry honesto, nunca
// sucesso fabricado. O job-engine ja e `implemented` (0 sinais); aqui selamos o comportamento.

async function boot() {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('fluxo jobs: job submetido e EXECUTADO por handler real, com resultado real', async () => {
  const app = await boot();
  let ran = 0;
  // Handler real: soma dois numeros do payload. O resultado no store tem que ser o que ele
  // devolveu, nao um valor fabricado.
  app.jobs.register('test.sum', async (payload) => { ran += 1; return { sum: payload.a + payload.b }; });

  const job = await app.jobs.submit('grg', 'grg-admin', { type: 'test.sum', payload: { a: 2, b: 3 } });
  assert.equal(job.status, 'QUEUED');

  const results = await app.jobs.runBatch('worker-test', 5);
  assert.equal(ran, 1); // o handler REALMENTE rodou

  const done = await app.jobs.get('grg', 'grg-admin', job.id);
  assert.equal(done.status, 'SUCCEEDED');
  assert.equal(done.result.sum, 5); // resultado real do handler, nao fabricado
  await app.close();
});

test('fluxo jobs: handler que lanca vira FAILED honesto, nao sucesso fabricado', async () => {
  const app = await boot();
  app.jobs.register('test.boom', async () => { throw new Error('falha real do handler'); });

  const job = await app.jobs.submit('grg', 'grg-admin', { type: 'test.boom', payload: {}, maxAttempts: 1 });
  await app.jobs.runBatch('worker-test', 5);

  const done = await app.jobs.get('grg', 'grg-admin', job.id);
  // Nao pode ser SUCCEEDED. A falha real e registrada, com a mensagem do erro.
  assert.notEqual(done.status, 'SUCCEEDED');
  assert.ok(['FAILED', 'DEAD_LETTER', 'QUEUED'].includes(done.status));
  assert.ok(done.error); // o motivo real ficou registrado
  await app.close();
});

test('fluxo jobs: submeter tipo nao registrado e rejeitado (nao finge enfileirar)', async () => {
  const app = await boot();
  await assert.rejects(
    () => app.jobs.submit('grg', 'grg-admin', { type: 'inexistente.xyz', payload: {} }),
    /handler is not registered/,
  );
  await app.close();
});

test('fluxo jobs: o observability reflete os jobs REAIS por status', async () => {
  const app = await boot();
  app.jobs.register('test.noop', async () => ({ ok: true }));
  const j = await app.jobs.submit('grg', 'grg-admin', { type: 'test.noop', payload: {} });
  await app.jobs.runBatch('worker-test', 5);

  const metrics = await app.observabilityCenter.getMetrics('grg', 'grg-admin');
  // O observability foi tornado real: conta jobs do store por status. O job concluido aparece.
  assert.equal(metrics.workers.jobsByStatus.state, 'measured');
  assert.ok((metrics.workers.jobsByStatus.value.SUCCEEDED || 0) >= 1);
  await app.close();
});
