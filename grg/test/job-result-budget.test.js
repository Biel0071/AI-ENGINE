// MEDIDO EM PRODUCAO (2026-07-29): o engine gravava em `job.result` o que o handler devolvesse,
// sem teto. `operational.activation` devolve run + todos os componentes + o relatorio de
// prontidao: 26 kB por job, x60 jobs retidos = 1,2 MB, 19% de um documento de 1,6 MB que e
// reserializado A CADA escrita (~60/min). E duplicata: o relatorio ja vive em
// `operationalReadinessReports` e o run em `operationalActivationRuns`.
//
// A retencao por CONTAGEM nao pega isso -- 60 jobs cabiam no teto e custavam 1,2 MB. Estes
// testes travam o orcamento por BYTE, e travam tambem o que NAO pode ser perdido no caminho:
// as metricas que o mission-kernel le do resultado.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function bootstrap() {
  const app = await createApp();
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  return app;
}

test('a small result is stored verbatim', async () => {
  const app = await bootstrap();
  app.jobs.register('test.pequeno', async () => ({ ok: true, contagem: 3 }));
  await app.jobs.submit('grg', 'alice', { type: 'test.pequeno' });
  const [done] = await app.jobs.runBatch('worker-1');
  assert.deepEqual(done.result, { ok: true, contagem: 3 }, 'resultado pequeno nao pode ser mexido');
});

test('an oversized result is replaced by a marker instead of bloating the document', async () => {
  const app = await bootstrap();
  // Reproduz a forma real do retorno de operational.activation: um objeto com muitos
  // componentes, cada um com evidencia.
  app.jobs.register('test.gordo', async () => ({
    run: { id: 'r1', status: 'READY' },
    components: Array.from({ length: 40 }, (_, i) => ({ componentId: `c${i}`, status: 'ACTIVE', evidence: { detalhe: 'x'.repeat(400) } })),
    readiness: { id: 'rr1' },
  }));
  await app.jobs.submit('grg', 'alice', { type: 'test.gordo' });
  const [done] = await app.jobs.runBatch('worker-1');
  assert.equal(done.status, 'SUCCEEDED', 'exceder o teto nao e falha do job');
  assert.equal(done.result.truncated, true);
  assert.ok(done.result.bytes > done.result.limitBytes, 'o marcador informa o tamanho real');
  // O marcador diz ONDE procurar: sem isso, alguem depura achando que o handler devolveu vazio.
  assert.deepEqual(done.result.keys, ['run', 'components', 'readiness']);
  // O teto vale para o que foi GRAVADO, nao so para o que a chamada devolveu.
  const state = await app.store.read();
  const gravado = state.runtimeJobs.find((item) => item.id === done.id);
  assert.ok(Buffer.byteLength(JSON.stringify(gravado.result), 'utf8') < 1_000, 'o documento nao pode carregar o resultado inteiro');
});

test('the metrics the mission kernel reads survive the budget', async () => {
  const app = await bootstrap();
  // mission-kernel.js:148 le job.result.metrics.tokens/costUsd. Se o teto cortasse isso, a
  // missao perderia custo e tokens em silencio -- pior que o problema original.
  app.jobs.register('test.metricas', async () => ({ metrics: { tokens: 1234, costUsd: 0.42 } }));
  await app.jobs.submit('grg', 'alice', { type: 'test.metricas' });
  const [done] = await app.jobs.runBatch('worker-1');
  assert.equal(done.result.metrics.tokens, 1234);
  assert.equal(done.result.metrics.costUsd, 0.42);
});

test('a handler returning nothing still stores null, not a marker', async () => {
  const app = await bootstrap();
  app.jobs.register('test.vazio', async () => {});
  await app.jobs.submit('grg', 'alice', { type: 'test.vazio' });
  const [done] = await app.jobs.runBatch('worker-1');
  assert.equal(done.result, null);
});
