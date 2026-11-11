'use strict';
// Regressao: o chat do mascote respondia "[qwen2.5:3b] answer(199)" -- texto do provedor de
// TESTE echo com nome de modelo real. O roteador nunca pode escolher o echo.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AIRouter } = require('../src/ai-runtime/ai-router');

function connectorsWith(ids) {
  return {
    list: () => ids,
    connectors: new Map(ids.map((id) => [id, { models: () => ({ state: 'measured', value: ['m'] }) }])),
    status: async () => ({ state: { value: 'CONNECTED' } }),
  };
}

test('router never selects the echo test provider, even as the only healthy connector', async () => {
  const router = new AIRouter({ connectors: connectorsWith(['ai:echo']) });
  const selection = await router.select('t', 'a', { preferProvider: 'echo' });
  assert.notEqual(selection.chosen.state, 'measured');
  assert.notEqual(selection.chosen.value, 'echo');
});

test('router still picks a real provider when echo is also registered', async () => {
  const router = new AIRouter({ connectors: connectorsWith(['ai:echo', 'ai:ollama']) });
  const selection = await router.select('t', 'a', { preferProvider: 'echo', tiers: ['local', 'free', 'paid'] });
  assert.equal(selection.chosen.state, 'measured');
  assert.equal(selection.chosen.value, 'ollama');
});
// Regressao: cada pergunta do chat refazia o selfTest + gravacao no store (segundos); o
// limite de 4s estourava e o Ollama saudavel virava DEGRADED. Um CONNECTED recente vale
// por um curto periodo, e uma falha real de execucao o invalida na hora.
function countingConnectors(ids) {
  const counter = { calls: 0 };
  return {
    counter,
    list: () => ids,
    connectors: new Map(ids.map((id) => [id, { models: () => ({ state: 'measured', value: ['m'] }) }])),
    status: async () => { counter.calls += 1; return { state: { value: 'CONNECTED' } }; },
  };
}

test('router reuses a recent CONNECTED status instead of re-testing every request', async () => {
  const connectors = countingConnectors(['ai:ollama']);
  const router = new AIRouter({ connectors, gateway: { invoke: async () => ({ text: 'ok', provider: 'ollama' }) } });
  await router.route('t', 'a', { prompt: 'oi', tiers: ['local'] });
  await router.route('t', 'a', { prompt: 'oi de novo', tiers: ['local'] });
  assert.equal(connectors.counter.calls, 1);
});

test('a failed execution drops the cached status so the next request re-tests', async () => {
  const connectors = countingConnectors(['ai:ollama']);
  let fail = true;
  const router = new AIRouter({ connectors, gateway: { invoke: async () => { if (fail) throw new Error('down'); return { text: 'ok' }; } } });
  const first = await router.route('t', 'a', { prompt: 'oi', tiers: ['local'] });
  assert.equal(first.ok, false);
  fail = false;
  await router.route('t', 'a', { prompt: 'oi', tiers: ['local'] });
  assert.equal(connectors.counter.calls, 2);
});