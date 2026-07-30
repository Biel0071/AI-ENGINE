const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// FLUXO 9 — Context Builder (Living Mode), ponta a ponta.
//
// Prova que o FENIX entrega um contexto VIVO e REAL a uma sessao de IA: veracidade operacional
// medida pelo auditor, prioridades derivadas da medicao, conexao e missoes reais. Nada fabricado.

async function boot() {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('context: reune veracidade operacional REAL (auditor de simulacao)', async () => {
  const app = await boot();
  const ctx = await app.contextBuilder.build('grg', 'grg-admin');
  // O numero de sinais falsos vem do auditor rodando sobre o codigo real, nao inventado.
  assert.equal(typeof ctx.reality.totalFakeSignals, 'number');
  assert.ok(ctx.reality.modules > 0);
  assert.ok(ctx.reality.byClassification);
  // As proximas prioridades derivam do que foi medido (modulos que ainda mentem no topo).
  assert.ok(Array.isArray(ctx.nextPriorities) && ctx.nextPriorities.length > 0);
  await app.close();
});

test('context: inclui conexao real e missoes ativas (nunca fabricadas)', async () => {
  const app = await boot();
  const ctx = await app.contextBuilder.build('grg', 'grg-admin');
  // connection vem do apiConnection real (sem check ainda: providers vazios => lista vazia honesta).
  assert.ok(ctx.connection && Array.isArray(ctx.connection.providers));
  // sem missao criada, a lista de ativas e vazia -- honesto, nao um numero inventado.
  assert.deepEqual(ctx.activeMissions, []);
  await app.close();
});

test('context: o briefing markdown carrega o estado vivo para colar no Claude', async () => {
  const app = await boot();
  const md = await app.contextBuilder.buildMarkdown('grg', 'grg-admin');
  assert.match(md, /Contexto Vivo/);
  assert.match(md, /Veracidade operacional/);
  assert.match(md, /Próximas prioridades/);
  assert.match(md, /REALITY FIRST/);
  await app.close();
});

test('context: prioridades refletem modulos com sinal falso quando existem', async () => {
  const app = await boot();
  const ctx = await app.contextBuilder.build('grg', 'grg-admin');
  // Se ha ofensores, a prioridade top os nomeia; se nao, diz que o foco e cobertura/capabilities.
  if (ctx.reality.worstOffenders.length > 0) {
    assert.match(ctx.nextPriorities[0], /Tornar honesto:/);
  } else {
    assert.match(ctx.nextPriorities[0], /Nenhum modulo/);
  }
  await app.close();
});
