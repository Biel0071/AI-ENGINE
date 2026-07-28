const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// MISSION-1003 FASE 6 - AI Router + AI provider adapter.
// Prova: selecao por EVIDNCIA (selfTest real), politica local->gratis->pago, failover entre
// tiers, e o caminho honesto quando ninguem esta CONNECTED. Providers fake injetados dao
// controle total da saude sem credencial nem rede - o adapter e o router sao os reais.

// Fabrica de provider fake: `up` controla se o selfTest passa (available()).
function fakeProvider(name, { up = true, reply = 'pong' } = {}) {
  return {
    name,
    models: [`${name}-model`],
    available: async () => up,
    complete: async () => ({ text: reply, model: `${name}-model`, promptTokens: 1, completionTokens: 1 }),
    chat: async () => ({ text: reply }),
  };
}

async function appWith(providers) {
  const app = await createApp({ dataFile: null, providers });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('every enabled AI provider is registered as a connector via the generic adapter', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama'), groq: fakeProvider('groq'), anthropic: fakeProvider('anthropic') });
  const ids = app.connectors.list();
  assert.ok(ids.includes('ai:ollama'));
  assert.ok(ids.includes('ai:groq'));
  assert.ok(ids.includes('ai:anthropic'));
  await app.close?.();
});

test('the router prefers local, then free, then paid - by policy over healthy providers', async () => {
  // Todos saudaveis: local (ollama) deve vencer.
  const app = await appWith({ ollama: fakeProvider('ollama'), groq: fakeProvider('groq'), anthropic: fakeProvider('anthropic') });
  const sel = await app.aiRouter.select('grg', 'grg-admin');
  assert.equal(sel.chosen.state, 'measured');
  assert.equal(sel.chosen.value, 'ollama', 'local tier wins when healthy');
  assert.equal(sel.chosen.tier, 'local');
  await app.close?.();
});

test('failover: when local is down, the router falls to the free tier', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama', { up: false }), groq: fakeProvider('groq'), anthropic: fakeProvider('anthropic') });
  const sel = await app.aiRouter.select('grg', 'grg-admin');
  assert.equal(sel.chosen.value, 'groq', 'local down -> free tier');
  assert.equal(sel.chosen.tier, 'free');
  // A evidencia registra que o local foi avaliado e nao estava CONNECTED.
  const ollamaEval = sel.evidence.evaluated.find((e) => e.id === 'ai:ollama');
  assert.notEqual(ollamaEval.state, 'CONNECTED');
  await app.close?.();
});

test('paid tier is used only when local and free are all down', async () => {
  const app = await appWith({
    ollama: fakeProvider('ollama', { up: false }),
    groq: fakeProvider('groq', { up: false }),
    anthropic: fakeProvider('anthropic', { up: true }),
  });
  const sel = await app.aiRouter.select('grg', 'grg-admin');
  assert.equal(sel.chosen.value, 'anthropic', 'paid only as last resort');
  assert.equal(sel.chosen.tier, 'paid');
  await app.close?.();
});

test('when no provider passes selfTest, the router returns unknown - never a fabricated choice', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama', { up: false }), anthropic: fakeProvider('anthropic', { up: false }) });
  const sel = await app.aiRouter.select('grg', 'grg-admin');
  assert.equal(sel.chosen.state, 'unknown', 'no healthy provider -> unknown, not a guess');
  assert.ok(sel.chosen.reason.includes('no AI provider is CONNECTED'));
  await app.close?.();
});

test('route() invokes the chosen provider and records the decision as measured telemetry', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama', { reply: 'resultado-real' }) });
  const routed = await app.aiRouter.route('grg', 'grg-admin', { mode: 'text', prompt: 'oi' });
  assert.equal(routed.ok, true);
  assert.equal(routed.provider, 'ollama');
  assert.equal(routed.result.text, 'resultado-real', 'the real provider served the call');
  assert.equal(routed.telemetry.state, 'measured');

  // A decisao ficou registrada para o Learning Router rankear depois.
  const state = await app.store.read();
  const decisions = state.aiRouterDecisions.filter((d) => d.provider === 'ollama');
  assert.ok(decisions.length >= 1, 'the routing decision was recorded');
  assert.equal(decisions[decisions.length - 1].ok, true);
  await app.close?.();
});
