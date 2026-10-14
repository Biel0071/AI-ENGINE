'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { handleUniversalSystemRoutes } = require('../src/api/universal-system-routes');
const { resolveAIProviderKey } = require('../src/security/secret-resolver');

async function callRoute(method, route, body = {}) {
  const response = {};
  const authorizationChecks = [];
  const handled = await handleUniversalSystemRoutes(
    { method, headers: {} },
    response,
    new URL(`http://fenix.local${route}`),
    (_res, status, payload) => { response.status = status; response.body = payload; return true; },
    async () => body,
    { tenantId: 'grg', actorId: 'operator' },
    { controlPlane: { authorize: async (...args) => authorizationChecks.push(args) } },
  );
  return { handled, authorizationChecks, ...response };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

test('API Platform test chat uses the configured URL, model, and server-side key', async () => {
  const originalEnv = Object.fromEntries(['GRG_AIPLATFORM_URL', 'GRG_AIPLATFORM_MODEL', 'GRG_AIPLATFORM_KEY'].map((name) => [name, process.env[name]]));
  let observedRequest;
  const platform = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    observedRequest = {
      url: req.url,
      key: req.headers['x-api-key'],
      body: JSON.parse(Buffer.concat(chunks).toString()),
    };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: 'resposta do provider de teste' } }] }));
  });
  const port = await listen(platform);
  process.env.GRG_AIPLATFORM_URL = `http://127.0.0.1:${port}`;
  process.env.GRG_AIPLATFORM_MODEL = 'model-from-config';
  process.env.GRG_AIPLATFORM_KEY = `ap_live_test_${process.pid}`;

  try {
    const configuredKey = resolveAIProviderKey();
    const result = await callRoute('POST', '/api/v2/api-platform/test-chat', { message: 'validar canal rápido' });
    assert.equal(result.handled, true);
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.deepEqual(result.authorizationChecks, [['grg', 'operator', 'ai:invoke']]);
    assert.equal(observedRequest.url, '/v1/chat/completions');
    assert.equal(observedRequest.key, configuredKey);
    assert.equal(observedRequest.body.model, 'model-from-config');
    assert.equal(observedRequest.body.messages[0].content, 'validar canal rápido');
    assert.equal(JSON.stringify(result.body).includes(configuredKey), false);
  } finally {
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await new Promise((resolve) => platform.close(resolve));
  }
});

test('legacy direct VPS deploy is retired without executing a remote command', async () => {
  const result = await callRoute('POST', '/api/v2/api-platform/deploy');
  assert.equal(result.handled, true);
  assert.equal(result.status, 410);
  assert.equal(result.body.code, 'LEGACY_DEPLOY_ROUTE_RETIRED');
});
