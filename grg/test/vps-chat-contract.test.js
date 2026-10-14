const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

test('VPS chat returns real provider text and reports provider rejection', async () => {
  let reject = false;
  const gateway = http.createServer(async (req, res) => {
    if (req.url !== '/v1/chat') { res.writeHead(404).end(); return; }
    assert.equal(req.headers['x-api-key'] === 'test-key', true, 'provider auth must use the isolated fixture key');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    assert.equal(body.messages.at(-1).content, 'mensagem de teste');
    res.setHeader('content-type', 'application/json');
    if (reject) {
      res.writeHead(401).end(JSON.stringify({ error: { code: 'INVALID_API_KEY' } }));
    } else {
      res.writeHead(200).end(JSON.stringify({ success: true, result: { message: { content: 'resposta medida' } } }));
    }
  });
  await new Promise((resolve) => gateway.listen(0, '127.0.0.1', resolve));

  const previous = Object.fromEntries([
    'FENIX_BOOTSTRAP_TENANT_ID', 'FENIX_BOOTSTRAP_ADMIN_USER',
    'FENIX_BOOTSTRAP_ADMIN_PASSWORD', 'FENIX_ALLOW_DEV_HEADERS', 'NODE_ENV',
    'GRG_LLM', 'GRG_AIPLATFORM_URL', 'GRG_AIPLATFORM_KEY', 'GRG_AIPLATFORM_MODEL',
  ].map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    FENIX_BOOTSTRAP_TENANT_ID: 'grg',
    FENIX_BOOTSTRAP_ADMIN_USER: 'vps-contract-admin',
    FENIX_BOOTSTRAP_ADMIN_PASSWORD: 'test-password',
    FENIX_ALLOW_DEV_HEADERS: '0', NODE_ENV: 'test', GRG_LLM: '0',
    GRG_AIPLATFORM_URL: `http://127.0.0.1:${gateway.address().port}`,
    GRG_AIPLATFORM_KEY: 'test-key', GRG_AIPLATFORM_MODEL: 'test-model',
  });
  let server;
  try {
    const { start } = require('../src/server');
    server = await start(0, { operationalActivation: false });
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${base}/api/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 'grg', userId: 'vps-contract-admin', password: 'test-password' }),
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const send = () => fetch(`${base}/api/v2/vps-chat`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'mensagem de teste' }),
    });
    const success = await send();
    assert.equal(success.status, 200);
    assert.deepEqual((await success.json()).response, 'resposta medida');
    reject = true;
    const failure = await send();
    assert.notEqual(failure.status, 200);
    assert.doesNotMatch(JSON.stringify(await failure.json()), /conectado|online na VPS/i);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => gateway.close(resolve));
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
