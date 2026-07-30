const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { streamFromOllama } = require('../src/ai-runtime/ollama-stream');
const { HealthRegistry } = require('../src/infrastructure/monitoring/health-registry');
const { QdrantVectorStore } = require('../src/memory/qdrant-vector-store');

// FASE 1/2/3: streaming real token a token, abort real no servidor, e o retry do probe do
// qdrant que evitava o falso "degraded" no boot. Sem mocks de conveniencia: o servidor de
// teste e um HTTP real que fala o mesmo NDJSON do Ollama. ASCII-only (lexer Node 18).

function ollamaServer(handler) {
  const server = http.createServer(handler);
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({
      server,
      baseUrl: `http://127.0.0.1:${server.address().port}`,
      // closeAllConnections antes do close: no teste de abort a resposta fica aberta de
      // proposito, e server.close() sozinho esperaria por ela para sempre. Destruir os
      // sockets tambem e necessario -- fechar o servidor nao derruba conexoes vivas, e um
      // socket vivo mantem o event loop aberto, travando o processo de teste no fim.
      close: () => new Promise((done) => {
        for (const socket of sockets) socket.destroy();
        server.close(done);
      }),
    }));
  });
}

test('stream entrega token a token, nao de uma vez', async () => {
  const fake = await ollamaServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/x-ndjson' });
    // Fragmento partido no meio de uma linha: e assim que chunks TCP chegam de verdade.
    res.write('{"response":"Ola","done":false}\n{"resp');
    res.write('onse":" mundo","done":false}\n');
    res.write('{"response":"!","done":true,"eval_count":3}\n');
    res.end();
  });
  const pieces = [];
  const out = await streamFromOllama({
    baseUrl: fake.baseUrl, model: 'qwen2.5:1.5b', prompt: 'oi',
    onToken: (piece) => pieces.push(piece),
  });
  assert.deepEqual(pieces, ['Ola', ' mundo', '!'], 'cada token chegou separado');
  assert.equal(out.text, 'Ola mundo!', 'o texto acumulado e a concatenacao real');
  assert.equal(out.streamed, true);
  assert.equal(out.chunks, 3, 'contagem real de fragmentos, nao inventada');
  await fake.close();
});

test('chat stream le message.content (formato /api/chat)', async () => {
  const fake = await ollamaServer((req, res) => {
    assert.equal(req.url, '/api/chat', 'com messages vai para /api/chat');
    res.writeHead(200);
    res.write('{"message":{"content":"oi"},"done":false}\n');
    res.write('{"message":{"content":" tudo bem"},"done":true}\n');
    res.end();
  });
  const out = await streamFromOllama({
    baseUrl: fake.baseUrl, model: 'm', messages: [{ role: 'user', content: 'oi' }],
  });
  assert.equal(out.text, 'oi tudo bem');
  await fake.close();
});

test('abort corta a geracao no SERVIDOR, nao so na UI', async () => {
  // O servidor sinaliza via promise quando VE a conexao morrer. Esperar por ela e o unico
  // jeito honesto de provar que o abort chegou ao servidor: checar uma flag logo apos o
  // await do cliente testaria apenas a ordem local de callbacks.
  let sawClose;
  const serverSawClose = new Promise((resolve) => { sawClose = resolve; });
  const fake = await ollamaServer((req, res) => {
    res.writeHead(200);
    res.write('{"response":"comecei","done":false}\n');
    // Nunca envia done: so termina se o cliente destruir a conexao.
    req.on('close', () => sawClose(true));
  });
  const controller = new AbortController();
  const pieces = [];
  const out = await streamFromOllama({
    baseUrl: fake.baseUrl, model: 'm', prompt: 'x', signal: controller.signal,
    onToken: (piece) => { pieces.push(piece); controller.abort(); },
  });
  assert.equal(out.aborted, true, 'o resultado admite que foi interrompido');
  assert.equal(out.text, 'comecei', 'o texto parcial real e preservado');
  assert.equal(await serverSawClose, true, 'o servidor viu a conexao fechar: a geracao parou de verdade');
  await fake.close();
});

test('abort antes de comecar nao dispara requisicao', async () => {
  let hits = 0;
  const fake = await ollamaServer((req, res) => { hits += 1; res.end('{"done":true}\n'); });
  const controller = new AbortController();
  controller.abort();
  const out = await streamFromOllama({ baseUrl: fake.baseUrl, model: 'm', prompt: 'x', signal: controller.signal });
  assert.equal(out.aborted, true);
  assert.equal(hits, 0, 'nenhuma requisicao foi feita');
  await fake.close();
});

test('erro HTTP do ollama vira erro legivel, nao sucesso silencioso', async () => {
  const fake = await ollamaServer((req, res) => {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end('{"error":"model \\"ausente\\" not found"}');
  });
  await assert.rejects(
    () => streamFromOllama({ baseUrl: fake.baseUrl, model: 'ausente', prompt: 'x' }),
    (error) => {
      assert.match(error.message, /404/, 'o status real aparece');
      assert.match(error.message, /not found/, 'a causa real aparece');
      return true;
    },
  );
  await fake.close();
});

test('health probe respeita teto por probe: o retry do qdrant cabe', async () => {
  const registry = new HealthRegistry({ timeoutMs: 50 });
  // Probe lento (120ms) sob o teto global de 50ms: falharia sem o override.
  registry.register('lento', async () => { await new Promise((r) => setTimeout(r, 120)); return { ok: true }; }, { timeoutMs: 5000 });
  registry.register('rapido', async () => ({ ok: true }));
  const report = await registry.check();
  assert.equal(report.checks.lento.ok, true, 'o probe com teto proprio completou');
  assert.equal(report.ok, true);
});

test('health probe sem override continua no teto global', async () => {
  const registry = new HealthRegistry({ timeoutMs: 30 });
  registry.register('lento', async () => { await new Promise((r) => setTimeout(r, 200)); return { ok: true }; });
  const report = await registry.check();
  assert.equal(report.checks.lento.ok, false, 'sem override o teto global ainda corta');
  assert.match(report.checks.lento.error, /timed out/);
});

test('qdrant health tenta de novo antes de reprovar (boot pesado nao vira degraded)', async () => {
  let calls = 0;
  const store = new QdrantVectorStore({
    collection: 'fenix_memory',
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) throw new Error('socket hang up');
      return { ok: true, status: 200, text: async () => '{"result":{}}' };
    },
  });
  const sleep = async () => {}; // sem espera real no teste
  const out = await store.health(3, sleep);
  assert.equal(out.ok, true);
  assert.equal(out.attempts, 3, 'contagem real de tentativas');
  assert.equal(calls, 3);
});

test('qdrant realmente fora do ar continua reprovando (nao engole o erro)', async () => {
  const store = new QdrantVectorStore({
    collection: 'fenix_memory',
    fetchImpl: async () => { throw new Error('ECONNREFUSED'); },
  });
  await assert.rejects(() => store.health(3, async () => {}), /ECONNREFUSED/);
});
