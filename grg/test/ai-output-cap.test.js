'use strict';
// Regressao: o chat do mascote caia no texto padrao porque o Ollama local (CPU) gerava ate
// 2.048 tokens e estourava o tempo. Um pedido pode pedir um teto menor de saida.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { AIGateway } = require('../src/ai-runtime/ai-gateway');
const { AIRouter } = require('../src/ai-runtime/ai-router');

async function gatewayCapturing(routeCap) {
  const store = new MemoryStore();
  const bus = new EventBus();
  const cp = await new ControlPlane({ store, bus }).initialize();
  await cp.createTenant({ name: 'GRG' }, 'alice');
  const seen = [];
  const gateway = new AIGateway({
    store, bus, controlPlane: cp,
    providers: { p: { complete: async (args) => { seen.push(args.maxTokens); return { text: 'ok', promptTokens: 1, completionTokens: 1 }; } } },
    routes: { default: { provider: 'p', model: 'm', ...(routeCap ? { maxOutputTokens: routeCap } : {}) } },
  });
  return { gateway, seen };
}

test('gateway honours a smaller per-request output cap', async () => {
  const { gateway, seen } = await gatewayCapturing();
  await gateway.invoke('grg', 'alice', { prompt: 'oi', maxOutputTokens: 160 });
  assert.deepEqual(seen, [160]);
});

test('per-request cap never raises the route cap', async () => {
  const { gateway, seen } = await gatewayCapturing(50);
  await gateway.invoke('grg', 'alice', { prompt: 'oi', maxOutputTokens: 160 });
  assert.deepEqual(seen, [50]);
});

test('router forwards maxOutputTokens to the gateway', async () => {
  let forwarded;
  const router = new AIRouter({
    connectors: {
      list: () => ['ai:ollama'],
      connectors: new Map([['ai:ollama', { models: () => ({ state: 'measured', value: ['m'] }) }]]),
      status: async () => ({ state: { value: 'CONNECTED' } }),
    },
    gateway: { invoke: async (t, a, req) => { forwarded = req.maxOutputTokens; return { text: 'ok', provider: 'ollama' }; } },
  });
  await router.route('t', 'a', { prompt: 'oi', tiers: ['local', 'free', 'paid'], maxOutputTokens: 160 });
  assert.equal(forwarded, 160);
});