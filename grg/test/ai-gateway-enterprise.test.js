const test = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { AIGateway } = require('../src/ai-runtime/ai-gateway');
const {
  OpenAIResponsesProvider, OpenAICompatibleProvider, AnthropicProvider, GeminiProvider,
} = require('../src/ai-runtime/http-providers');
const { buildProvidersFromEnv } = require('../src/ai-runtime/provider-registry');
const { RedisRateLimiter } = require('../src/infrastructure/redis/redis-rate-limiter');

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, statusText: status === 200 ? 'OK' : 'Error', text: async () => JSON.stringify(payload) };
}

async function gateway(options = {}) {
  const store = new MemoryStore();
  const bus = new EventBus();
  const cp = await new ControlPlane({ store, bus }).initialize();
  await cp.createTenant({ name: 'GRG' }, 'alice');
  return {
    store, bus,
    gateway: new AIGateway({ store, bus, controlPlane: cp, ...options }),
  };
}

test('OpenAI Responses adapter uses store=false, project headers and maps usage', async () => {
  let request;
  const provider = new OpenAIResponsesProvider({ apiKey: 'secret', projectId: 'proj_fenix', organizationId: 'org_grg', fetchImpl: async (url, options) => {
    request = { url, options };
    return response({ model: 'gpt-test', output_text: 'hello', usage: { input_tokens: 3, output_tokens: 2 } });
  } });
  const result = await provider.complete({ model: 'gpt-test', prompt: 'hi', maxTokens: 20 });
  const body = JSON.parse(request.options.body);
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.options.headers['OpenAI-Project'], 'proj_fenix');
  assert.equal(request.options.headers['OpenAI-Organization'], 'org_grg');
  assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 20);
  assert.deepEqual(result, { text: 'hello', model: 'gpt-test', promptTokens: 3, completionTokens: 2 });
});

test('Groq-compatible, Anthropic and Gemini adapters map their native envelopes', async () => {
  const groq = new OpenAICompatibleProvider({ name: 'groq', apiKey: 'k', baseUrl: 'https://groq.test/v1', fetchImpl: async () => response({ choices: [{ message: { content: 'g' } }], usage: { prompt_tokens: 1, completion_tokens: 2 } }) });
  const anthropic = new AnthropicProvider({ apiKey: 'k', fetchImpl: async () => response({ content: [{ type: 'text', text: 'a' }], usage: { input_tokens: 2, output_tokens: 3 } }) });
  const gemini = new GeminiProvider({ apiKey: 'k', fetchImpl: async () => response({ candidates: [{ content: { parts: [{ text: 'm' }] } }], usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 5 } }) });
  assert.equal((await groq.complete({ model: 'g', prompt: 'x' })).text, 'g');
  assert.equal((await anthropic.complete({ model: 'a', prompt: 'x' })).text, 'a');
  assert.equal((await gemini.complete({ model: 'm', prompt: 'x' })).text, 'm');
});

test('provider registry only activates providers with configured credentials', () => {
  const providers = buildProvidersFromEnv({ OPENAI_API_KEY: 'x', GROQ_API_KEY: 'y' }, { fetchImpl: async () => response({}) });
  assert.deepEqual(Object.keys(providers).sort(), ['echo', 'groq', 'openai']);
  assert.equal(JSON.stringify(providers).includes('x'), false);
});

test('provider registry exposes Codex as a coding provider through Responses API', () => {
  const providers = buildProvidersFromEnv({ FENIX_ENABLE_CODEX: '1', FENIX_CODEX_API_KEY: 'secret', FENIX_CODEX_MODEL: 'gpt-5.1-codex-max', FENIX_CODEX_PROJECT_ID: 'proj_codex' }, { fetchImpl: async () => response({}) });
  assert.ok(providers.codex);
  assert.equal(providers.codex.name, 'codex');
  assert.ok(providers.codex.models.includes('gpt-5.1-codex-max'));
  assert.equal(providers.codex.projectId, 'proj_codex');
  assert.equal(JSON.stringify(providers).includes('secret'), false);
});

test('gateway retries retryable errors then falls back and records provider telemetry', async () => {
  let primaryCalls = 0;
  const providers = {
    primary: { complete: async () => { primaryCalls += 1; const error = new Error('temporary'); error.retryable = true; throw error; } },
    backup: { complete: async () => ({ text: 'backup result', model: 'backup-model', promptTokens: 2, completionTokens: 3 }) },
  };
  const { gateway: gw, bus } = await gateway({
    providers,
    routes: { default: { provider: 'primary', model: 'primary-model', maxOutputTokens: 20, fallback: [{ provider: 'backup', model: 'backup-model', maxOutputTokens: 20 }] } },
  });
  const result = await gw.invoke('grg', 'alice', { prompt: 'work' });
  assert.equal(primaryCalls, 2);
  assert.equal(result.provider, 'backup');
  assert.equal(bus.history('ai.provider_failed').length, 1);
  const telemetry = await gw.telemetry('grg', 'alice');
  assert.equal(telemetry.byProvider.backup.length, 1);
});

test('failed provider chain releases token and cost reservations', async () => {
  const { gateway: gw } = await gateway({
    providers: { down: { complete: async () => { throw new Error('down'); } } },
    routes: { default: { provider: 'down', model: 'paid', maxOutputTokens: 10 } },
    prices: { paid: { inputPerMillion: 1, outputPerMillion: 1 } },
  });
  await gw.setBudget('grg', 'alice', 100);
  await gw.setCostBudget('grg', 'alice', 1);
  await assert.rejects(() => gw.invoke('grg', 'alice', { prompt: 'x' }), /No AI provider succeeded/);
  const budget = await gw.budget('grg');
  assert.equal(budget.reserved, 0);
  assert.equal(budget.cost.reservedUsd, 0);
  assert.equal(budget.spent, 0);
});

test('cost budget is checked atomically before a provider call', async () => {
  let called = false;
  const { gateway: gw } = await gateway({
    providers: { paid: { complete: async () => { called = true; return { text: 'x', promptTokens: 1, completionTokens: 1 }; } } },
    routes: { default: { provider: 'paid', model: 'expensive', maxOutputTokens: 100 } },
    prices: { expensive: { inputPerMillion: 1_000_000, outputPerMillion: 1_000_000 } },
  });
  await gw.setCostBudget('grg', 'alice', 10);
  await assert.rejects(() => gw.invoke('grg', 'alice', { prompt: 'x' }), /cost budget exhausted/);
  assert.equal(called, false);
});

test('expired semantic cache entries are not replayed', async () => {
  let calls = 0;
  const { gateway: gw } = await gateway({
    providers: { p: { complete: async () => ({ text: String(++calls), promptTokens: 1, completionTokens: 1 }) } },
    routes: { default: { provider: 'p', model: 'm', maxOutputTokens: 5 } }, cacheTtlMs: -1,
  });
  await gw.invoke('grg', 'alice', { prompt: 'same' });
  const second = await gw.invoke('grg', 'alice', { prompt: 'same' });
  assert.equal(second.text, '2');
});

test('Redis AI rate limiter reports retry time after the tenant limit', async () => {
  let count = 0;
  const limiter = new RedisRateLimiter({
    client: { eval: async () => [++count, 900] }, limit: 2, windowMs: 1_000,
  });
  assert.equal((await limiter.consume('t1', 'ai.invoke')).remaining, 1);
  await limiter.consume('t1', 'ai.invoke');
  await assert.rejects(
    () => limiter.consume('t1', 'ai.invoke'),
    (error) => error.code === 'RATE_LIMITED' && error.retryAfterMs === 900,
  );
});
