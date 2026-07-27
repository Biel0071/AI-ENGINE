const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { AIGateway } = require('../src/ai-runtime/ai-gateway');
const { EchoProvider } = require('../src/ai-runtime/providers');
const { ForbiddenError } = require('../src/kernel/errors');

async function bootstrap() {
  const store = new MemoryStore();
  const bus = new EventBus();
  const cp = await new ControlPlane({ store, bus }).initialize();
  await cp.createTenant({ name: 'GRG' }, 'alice');
  const gw = new AIGateway({ store, bus, controlPlane: cp, providers: { echo: new EchoProvider() } });
  return { store, bus, cp, gw };
}

test('invokes provider and records cost/tokens', async () => {
  const { gw } = await bootstrap();
  const r = await gw.invoke('grg', 'alice', { taskType: 'generate', prompt: 'build a login form' });
  assert.equal(r.cached, false);
  assert.match(r.text, /echo-large/);
  const tel = await gw.telemetry('grg', 'alice');
  assert.equal(tel.calls, 1);
  assert.ok(tel.totalTokens > 0);
});

test('semantic cache: identical prompt is a cache hit with zero provider tokens', async () => {
  const { gw, bus } = await bootstrap();
  await gw.invoke('grg', 'alice', { taskType: 'generate', prompt: 'same prompt' });
  const second = await gw.invoke('grg', 'alice', { taskType: 'generate', prompt: 'same prompt' });
  assert.equal(second.cached, true);
  assert.equal(bus.history('ai.cache_hit').length, 1);
  const tel = await gw.telemetry('grg', 'alice');
  assert.equal(tel.cacheHits, 1);
});

test('token budget is enforced', async () => {
  const { gw } = await bootstrap();
  await gw.setBudget('grg', 'alice', 5); // muito baixo
  await assert.rejects(
    () => gw.invoke('grg', 'alice', { taskType: 'generate', prompt: 'a very long prompt that exceeds the tiny budget for sure' }),
    ForbiddenError,
  );
});

test('routing selects model by task type', async () => {
  const { gw } = await bootstrap();
  const plan = await gw.invoke('grg', 'alice', { taskType: 'plan', prompt: 'plan: x' });
  assert.match(plan.model, /large/);
  const def = await gw.invoke('grg', 'alice', { taskType: 'default', prompt: 'hi' });
  assert.match(def.model, /small/);
});

test('authorization required to invoke', async () => {
  const { gw } = await bootstrap();
  await assert.rejects(() => gw.invoke('grg', 'stranger', { prompt: 'x' }));
});
