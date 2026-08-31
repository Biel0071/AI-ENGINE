const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { AIPlatformProvider } = require('../src/ai-runtime/aiplatform-provider');
const { resolveAIPlatformUrl } = require('../src/security/secret-resolver');

test('default AI Platform URL targets the real Fastify gateway instead of the dashboard', () => {
  assert.equal(resolveAIPlatformUrl({}), 'http://209.50.241.215:3000');
  assert.equal(resolveAIPlatformUrl({ GRG_AIPLATFORM_URL: 'http://gateway.internal:3000' }), 'http://gateway.internal:3000');
});

// sobe um mock do AI Platform Enterprise (contrato /v1/health, /v1/chat, /v1/text)
function mockGateway() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const key = req.headers['x-api-key'];
      if (req.url === '/v1/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
      if (key !== 'ap_test') { res.writeHead(401); return res.end('{"error":"bad key"}'); }
      let body = ''; req.on('data', (c) => { body += c; }); req.on('end', () => {
        const payload = JSON.parse(body || '{}');
        res.writeHead(200, { 'content-type': 'application/json' });
        if (req.url === '/v1/chat') return res.end(JSON.stringify({ success: true, provider: 'groq', model: 'llama-3.1-8b', result: { message: { role: 'assistant', content: 'resposta do gateway para: ' + payload.messages.at(-1).content } }, tokens: { prompt: 5, completion: 8, total: 13 } }));
        if (req.url === '/v1/text') return res.end(JSON.stringify({ success: true, result: { text: 'texto: ' + payload.prompt }, tokens: { prompt: 3, completion: 4 } }));
        res.end('{}');
      });
    });
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test('provider reports available when gateway health is up', async () => {
  const { server, port } = await mockGateway();
  const p = new AIPlatformProvider({ baseUrl: `http://127.0.0.1:${port}`, apiKey: 'ap_test' });
  assert.equal(await p.available(), true);
  server.close();
});

test('provider reports unavailable without url/key', async () => {
  const p = new AIPlatformProvider({ baseUrl: '', apiKey: '' });
  assert.equal(await p.available(), false);
});

test('provider health rejects unauthorized responses instead of reporting a false healthy state', async () => {
  const server = http.createServer((_req, res) => { res.writeHead(401); res.end('{"error":"invalid key"}'); });
  await new Promise((resolve) => server.listen(0, resolve));
  const p = new AIPlatformProvider({ baseUrl: `http://127.0.0.1:${server.address().port}`, apiKey: 'revoked' });
  assert.equal(await p.available(), false);
  server.close();
});

test('chat() hits the gateway and returns text', async () => {
  const { server, port } = await mockGateway();
  const p = new AIPlatformProvider({ baseUrl: `http://127.0.0.1:${port}`, apiKey: 'ap_test' });
  const r = await p.chat({ messages: [{ role: 'user', content: 'oi' }] });
  assert.match(r.text, /resposta do gateway para: oi/);
  server.close();
});

test('complete() hits /v1/text and returns tokens', async () => {
  const { server, port } = await mockGateway();
  const p = new AIPlatformProvider({ baseUrl: `http://127.0.0.1:${port}`, apiKey: 'ap_test' });
  const r = await p.complete({ prompt: 'gera algo' });
  assert.match(r.text, /texto: gera algo/);
  assert.equal(r.promptTokens, 3);
  server.close();
});

test('bad key is rejected', async () => {
  const { server, port } = await mockGateway();
  const p = new AIPlatformProvider({ baseUrl: `http://127.0.0.1:${port}`, apiKey: 'wrong' });
  await assert.rejects(() => p.chat({ messages: [{ role: 'user', content: 'x' }] }), /401/);
  server.close();
});

// MEDIDO na .215 com 5 requisicoes simultaneas: acima de `concurrency: 4` o gateway responde
// 202 com {jobId, queue} em vez de gerar. Antes desta correcao o 202 passava pelo teste 2xx e
// complete() devolvia texto VAZIO em silencio -- o chat responderia em branco sob concorrencia.
function queueingGateway() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = ''; req.on('data', (c) => { body += c; }); req.on('end', () => {
        res.writeHead(202, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          success: true, jobId: 'job_test_1',
          queue: { queue: 'text', state: 'active', concurrency: 4, position: 1, jobsAhead: 0 },
        }));
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

test('a 202 enqueued response fails loudly instead of returning empty text', async () => {
  const { server, port } = await queueingGateway();
  const p = new AIPlatformProvider({ baseUrl: `http://127.0.0.1:${port}`, apiKey: 'ap_test', env: { GRG_AIPLATFORM_JOB_WAIT_MS: '0' } });
  await assert.rejects(() => p.complete({ prompt: 'oi' }), /enfileirou.*jobId=job_test_1.*concurrency=4/s);
  await assert.rejects(() => p.chat({ messages: [{ role: 'user', content: 'oi' }] }), /enfileirou/);
  server.close();
});

test('available() reports false when the gateway only enqueues', async () => {
  const { server, port } = await queueingGateway();
  const p = new AIPlatformProvider({ baseUrl: `http://127.0.0.1:${port}`, apiKey: 'ap_test', env: { GRG_AIPLATFORM_JOB_WAIT_MS: '0' } });
  assert.equal(await p.available(), false, 'fila nao e geracao: nao pode contar como disponivel');
  server.close();
});
