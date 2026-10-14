'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleUniversalSystemRoutes } = require('../src/api/universal-system-routes');

function setup(method, path, body, app) {
  const req = { method };
  const res = {};
  const sendJson = (_res, status, payload) => {
    res.status = status;
    res.payload = payload;
    return true;
  };
  return {
    req,
    res,
    sendJson,
    readJson: async () => body,
    url: new URL(`http://localhost${path}`),
    identity: { tenantId: 'tenant-a', actorId: 'user-a' },
    app,
  };
}

test('provider catalog reports measured status and tenant usage without fabricated quotas', async () => {
  const permissions = [];
  const ctx = setup('GET', '/api/v2/providers', null, {
    controlPlane: { authorize: async (_tenant, _actor, permission) => permissions.push(permission) },
    aiGateway: {
      providers: { aiplatform: { model: 'qwen2.5:3b' }, ollama: { model: 'qwen2.5:0.5b' } },
      routes: { default: { provider: 'aiplatform', model: 'qwen2.5:3b', fallback: { provider: 'ollama', model: 'qwen2.5:0.5b' } } },
      route: () => ({ provider: 'aiplatform', model: 'qwen2.5:3b' }),
      candidates: () => [{ provider: 'aiplatform' }, { provider: 'ollama' }],
      providerHealth: async () => ({ aiplatform: { ok: false, error: 'sensitive detail' }, ollama: { ok: true } }),
    },
    store: { read: async () => ({
      aiCalls: [
        { tenantId: 'tenant-a', provider: 'ollama', totalTokens: 23, costUsd: 0.0002 },
        { tenantId: 'other-tenant', provider: 'openai', totalTokens: 999, costUsd: 2 },
      ],
      tenants: [{ id: 'tenant-a', tokenBudget: { total: 1000, spent: 23 } }],
    }) },
  });

  await handleUniversalSystemRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.deepEqual(permissions, ['runtime:read']);
  assert.equal(ctx.res.status, 200);
  assert.deepEqual(ctx.res.payload.providers.map((provider) => [provider.id, provider.status]), [
    ['aiplatform', 'OFFLINE'],
    ['ollama', 'ONLINE'],
  ]);
  assert.equal(ctx.res.payload.providers[0].isPrimary, true);
  assert.equal(ctx.res.payload.providers[0].latencyMs, undefined);
  assert.equal(ctx.res.payload.providers[0].quotaUsedPct, undefined);
  assert.equal(JSON.stringify(ctx.res.payload).includes('sensitive detail'), false);
  assert.deepEqual(ctx.res.payload.usage.byProvider.ollama, { calls: 1, tokens: 23, estimatedCostUsd: 0.0002 });
  assert.equal(ctx.res.payload.usage.calls, 1);
  assert.equal(ctx.res.payload.usage.tokenBudget.total, 1000);
});

test('provider connection test succeeds only after a real gateway invocation', async () => {
  const permissions = [];
  let invocation;
  const ctx = setup('POST', '/api/v2/providers/test', { providerId: 'api-platform' }, {
    controlPlane: { authorize: async (_tenant, _actor, permission) => permissions.push(permission) },
    aiGateway: {
      providers: { aiplatform: { model: 'qwen2.5:3b' } },
      invoke: async (tenantId, actorId, input) => {
        invocation = { tenantId, actorId, ...input };
        return { provider: 'aiplatform', model: 'qwen2.5:3b', text: 'FENIX_PROVIDER_READY' };
      },
    },
  });

  await handleUniversalSystemRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.deepEqual(permissions, ['ai:invoke']);
  assert.equal(ctx.res.status, 200);
  assert.equal(ctx.res.payload.ok, true);
  assert.equal(ctx.res.payload.status, 'ONLINE');
  assert.equal(ctx.res.payload.providerId, 'aiplatform');
  assert.equal(invocation.tenantId, 'tenant-a');
  assert.equal(invocation.prompt, 'Responda somente FENIX_PROVIDER_READY.');
  assert.equal(invocation.provider, 'aiplatform');
});

test('provider connection test reports missing providers as unavailable without false success', async () => {
  const permissions = [];
  const ctx = setup('POST', '/api/v2/providers/test', { providerId: 'made-up-provider' }, {
    controlPlane: { authorize: async (_tenant, _actor, permission) => permissions.push(permission) },
    aiGateway: { providers: {}, invoke: async () => { throw new Error('must not invoke'); } },
  });
  await handleUniversalSystemRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.deepEqual(permissions, ['ai:invoke']);
  assert.equal(ctx.res.status, 404);
  assert.equal(ctx.res.payload.ok, false);
  assert.equal(ctx.res.payload.status, 'NOT_CONFIGURED');
});

test('deterministic echo provider is never reported as a real connection', async () => {
  const ctx = setup('POST', '/api/v2/providers/test', { providerId: 'echo' }, {
    controlPlane: { authorize: async () => {} },
    aiGateway: {
      providers: { echo: { model: 'echo-small' } },
      invoke: async () => { throw new Error('echo must not be invoked as a real provider'); },
    },
  });
  await handleUniversalSystemRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.equal(ctx.res.status, 409);
  assert.equal(ctx.res.payload.ok, false);
  assert.equal(ctx.res.payload.status, 'SIMULATED');
});
