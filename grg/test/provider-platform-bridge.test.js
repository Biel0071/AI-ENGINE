'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleProviderPlatformRoutes } = require('../src/api/provider-platform-routes');

function context(method, pathname, body, app, identity = { tenantId: 'tenant-a', actorId: 'admin-a' }) {
  const res = {};
  return {
    req: { method, headers: { origin: 'https://fenix.example', 'x-forwarded-proto': 'https' } },
    res,
    url: new URL(`http://fenix.local${pathname}`),
    identity,
    app,
    readJson: async () => body,
    sendJson: (_res, status, payload) => { res.status = status; res.payload = payload; return true; },
  };
}

test('API Platform admin login stays server-side and its session can manage providers through Fenix', async () => {
  const calls = [];
  const permissions = [];
  const app = {
    providerPlatformBaseUrl: 'http://127.0.0.1:3001',
    controlPlane: { authorize: async (_tenant, _actor, permission) => permissions.push(permission) },
    providerPlatformFetch: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith('/admin/login')) {
        return { ok: true, status: 200, json: async () => ({ token: 'private-platform-jwt', user: { id: 'p1', role: 'admin' } }) };
      }
      if (String(url).endsWith('/admin/provider-configs') && options.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ success: true, registered: true }) };
      }
      if (String(url).endsWith('/admin/provider-configs')) {
        return { ok: true, status: 200, json: async () => ({ success: true, configs: [
          { name: 'openai', enabled: true, hasApiKey: true, settings: { apiKeyEncrypted: 'encrypted-secret', defaultChat: true } },
        ] }) };
      }
      if (String(url).endsWith('/admin/test-text')) {
        return { ok: true, status: 200, json: async () => ({ success: true, result: { text: 'conexão ativa' }, model: 'gpt-test' }) };
      }
      return { ok: true, status: 200, json: async () => ({ success: true, providers: [
        { name: 'openai', capabilities: ['chat'], health: { ok: true, latencyMs: 81 }, models: [{ id: 'gpt-test' }] },
        { name: 'gemini', health: { ok: false, error: 'https://provider.invalid/?key=must-not-leak' }, models: [] },
      ] }) };
    },
  };

  const login = context('POST', '/api/v2/provider-platform/session', { login: 'admin@example.com', password: 'platform-password' }, app);
  assert.equal(await handleProviderPlatformRoutes(login.req, login.res, login.url, login.sendJson, login.readJson, login.identity, app), true);
  assert.equal(login.res.status, 200);
  assert.equal(login.res.payload.authenticated, true);
  assert.equal(JSON.stringify(login.res.payload).includes('private-platform-jwt'), false);
  assert.equal(JSON.stringify(calls[0].options.body).includes('platform-password'), true);

  const providers = context('GET', '/api/v2/provider-platform/providers', null, app);
  await handleProviderPlatformRoutes(providers.req, providers.res, providers.url, providers.sendJson, providers.readJson, providers.identity, app);
  assert.equal(providers.res.status, 200);
  assert.equal(providers.res.payload.providers[0].health.latencyMs, 81);
  assert.equal(providers.res.payload.providers[1].health.error, 'Teste do provedor falhou');
  assert.equal(JSON.stringify(providers.res.payload).includes('must-not-leak'), false);
  assert.equal(calls[1].options.headers.authorization, 'Bearer private-platform-jwt');

  const configs = context('GET', '/api/v2/provider-platform/provider-configs', null, app);
  await handleProviderPlatformRoutes(configs.req, configs.res, configs.url, configs.sendJson, configs.readJson, configs.identity, app);
  assert.equal(configs.res.payload.configs[0].hasApiKey, true);
  assert.equal(configs.res.payload.configs[0].defaultChat, true);
  assert.equal(JSON.stringify(configs.res.payload).includes('encrypted-secret'), false);

  const save = context('POST', '/api/v2/provider-platform/provider-configs', {
    name: 'openai', enabled: true, defaultChat: true, apiKey: 'provider-secret', defaultModel: 'gpt-test',
  }, app);
  await handleProviderPlatformRoutes(save.req, save.res, save.url, save.sendJson, save.readJson, save.identity, app);
  assert.equal(save.res.payload.registered, true);
  assert.equal(JSON.stringify(save.res.payload).includes('provider-secret'), false);
  assert.equal(JSON.parse(calls[3].options.body).apiKey, 'provider-secret');

  const testText = context('POST', '/api/v2/provider-platform/test-text', { prompt: 'Responda: ok' }, app);
  await handleProviderPlatformRoutes(testText.req, testText.res, testText.url, testText.sendJson, testText.readJson, testText.identity, app);
  assert.equal(testText.res.payload.text, 'conexão ativa');
  assert.equal(JSON.parse(calls[4].options.body).maxTokens, 16);
  assert.deepEqual(permissions, Array(5).fill('runtime:admin'));
});

test('provider credentials cannot be submitted over an HTTP browser session', async () => {
  const calls = [];
  const app = {
    providerPlatformBaseUrl: 'http://127.0.0.1:3001',
    controlPlane: { authorize: async () => undefined },
    providerPlatformFetch: async (...args) => { calls.push(args); throw new Error('must not call'); },
  };
  const request = context('POST', '/api/v2/provider-platform/session', { login: 'admin', password: 'secret' }, app);
  request.req.headers.origin = 'http://fenix.example';
  request.req.headers['x-forwarded-proto'] = 'http';
  await handleProviderPlatformRoutes(request.req, request.res, request.url, request.sendJson, request.readJson, request.identity, app);
  assert.equal(request.res.status, 426);
  assert.equal(request.res.payload.code, 'HTTPS_REQUIRED');
  assert.equal(calls.length, 0);
});

test('provider management requires a Fenix admin and an API Platform session', async () => {
  const permissions = [];
  const app = {
    providerPlatformBaseUrl: 'http://127.0.0.1:3001',
    controlPlane: { authorize: async (_tenant, _actor, permission) => permissions.push(permission) },
    providerPlatformFetch: async () => { throw new Error('must not call API Platform'); },
  };
  const request = context('GET', '/api/v2/provider-platform/providers', null, app);
  await handleProviderPlatformRoutes(request.req, request.res, request.url, request.sendJson, request.readJson, request.identity, app);
  assert.equal(request.res.status, 401);
  assert.equal(request.res.payload.authenticated, false);
  assert.deepEqual(permissions, ['runtime:admin']);
});
