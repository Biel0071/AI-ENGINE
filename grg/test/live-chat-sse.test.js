const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');
const { handleLiveChat } = require('../src/chat/live-chat-routes');

// FASE 3: o SSE ponta a ponta. Servidor HTTP real, cliente HTTP real, provider de LLM que faz
// streaming real (emite pedaco por pedaco com atraso). O que se prova aqui: os tokens chegam
// PROGRESSIVAMENTE, o abort para o servidor, e a resposta e persistida.
// ASCII-only (lexer Node 18).

function sendJson(res, code, payload, requestId = null) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(requestId ? { ...payload, requestId } : payload));
}
async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

// Provider que emite tokens com intervalo real e respeita o signal.
function streamingLlm({ pieces = ['Ola', ' mundo'], delayMs = 20, model = 'qwen2.5:1.5b' } = {}) {
  return {
    name: 'fake-stream',
    model,
    async chat({ messages }) { return { text: pieces.join('') , raw: { messages } }; },
    async stream({ onToken, signal }) {
      let text = '';
      let chunks = 0;
      for (const piece of pieces) {
        if (signal?.aborted) return { text, streamed: true, aborted: true, model, chunks };
        await new Promise((r) => setTimeout(r, delayMs));
        text += piece;
        chunks += 1;
        onToken(piece);
      }
      return { text, streamed: true, aborted: false, model, chunks, completionTokens: chunks };
    },
  };
}

async function harness(llm) {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  app.llm = llm;
  const sockets = new Set();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      const handled = await handleLiveChat({
        app, req, res, url, tenantId: 'grg', actorId: 'grg-admin', readJson, sendJson, requestId: 'test',
      });
      if (!handled) sendJson(res, 404, { error: 'route not found' });
    } catch (error) {
      if (!res.headersSent) sendJson(res, 500, { error: error.message });
    }
  });
  server.on('connection', (socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    app,
    port: server.address().port,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise((done) => server.close(done));
      await app.close?.();
    },
  };
}

// Cliente SSE: registra CADA evento com o instante de chegada, para provar progressividade.
function sseRequest(port, path, body, { onEvent = null } = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1', port, path, method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
    }, (res) => {
      const events = [];
      let buffer = '';
      const started = process.hrtime.bigint();
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        let index = buffer.indexOf('\n\n');
        while (index >= 0) {
          const frame = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          index = buffer.indexOf('\n\n');
          const nameLine = frame.split('\n').find((l) => l.startsWith('event: '));
          const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!nameLine || !dataLine) continue;
          const event = {
            name: nameLine.slice(7).trim(),
            data: JSON.parse(dataLine.slice(6)),
            atMs: Number(process.hrtime.bigint() - started) / 1e6,
          };
          events.push(event);
          if (onEvent) onEvent(event, res);
        }
      });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, events }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(payload);
  });
}

test('SSE entrega tokens progressivamente, nao tudo no fim', async () => {
  const h = await harness(streamingLlm({ pieces: ['A', 'B', 'C', 'D'], delayMs: 30 }));
  const out = await sseRequest(h.port, '/api/chat/stream', { message: 'oi' });

  assert.equal(out.status, 200);
  assert.match(out.headers['content-type'], /text\/event-stream/);
  assert.equal(out.headers['x-accel-buffering'], 'no', 'o header que desliga o buffer do nginx esta presente');

  const tokens = out.events.filter((e) => e.name === 'token');
  assert.equal(tokens.length, 4, 'um evento por token real');
  // A prova de progressividade: o primeiro token chegou bem antes do ultimo.
  const spread = tokens[3].atMs - tokens[0].atMs;
  assert.ok(spread > 40, `os tokens chegaram espalhados no tempo (${spread.toFixed(1)}ms), nao de uma vez`);

  const done = out.events.find((e) => e.name === 'done');
  assert.equal(done.data.text, 'ABCD');
  assert.equal(done.data.chunks, 4);
  assert.equal(done.data.aborted, false);
  await h.close();
});

test('o evento ready vem antes de qualquer token, com o modelo real', async () => {
  const h = await harness(streamingLlm({ model: 'qwen2.5:1.5b' }));
  const out = await sseRequest(h.port, '/api/chat/stream', { message: 'oi' });
  assert.equal(out.events[0].name, 'ready');
  assert.equal(out.events[0].data.model, 'qwen2.5:1.5b', 'o modelo informado e o real do provider');
  assert.ok(out.events[0].data.streamId, 'ha um streamId para poder abortar');
  await h.close();
});

test('a resposta completa e persistida no store apos o done', async () => {
  const h = await harness(streamingLlm({ pieces: ['res', 'posta'] }));
  const out = await sseRequest(h.port, '/api/chat/stream', { message: 'pergunta', source: 'voice' });
  const done = out.events.find((e) => e.name === 'done');

  const rows = await h.app.conversations.history('grg', done.data.conversationId);
  assert.equal(rows.length, 2, 'pergunta e resposta gravadas');
  assert.equal(rows[0].content, 'pergunta');
  assert.equal(rows[0].source, 'voice', 'a origem por voz chegou ao store');
  assert.equal(rows[1].content, 'resposta');
  assert.equal(rows[1].id, done.data.messageId, 'o id devolvido e o da linha real');
  await h.close();
});

test('POST /api/chat/abort corta o stream em andamento', async () => {
  const h = await harness(streamingLlm({ pieces: ['um', 'dois', 'tres', 'quatro', 'cinco'], delayMs: 60 }));
  let streamId = null;
  const out = await sseRequest(h.port, '/api/chat/stream', { message: 'conta ate cinco' }, {
    onEvent: (event) => {
      if (event.name === 'ready') streamId = event.data.streamId;
      // Aborta assim que o segundo token chega.
      if (event.name === 'token' && streamId) {
        const body = JSON.stringify({ streamId });
        const req = http.request({
          host: '127.0.0.1', port: h.port, path: '/api/chat/abort', method: 'POST',
          headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
        });
        req.end(body);
        streamId = null; // aborta uma vez so
      }
    },
  });

  const done = out.events.find((e) => e.name === 'done');
  assert.ok(done, 'o stream fechou com done, nao pendurado');
  assert.equal(done.data.aborted, true, 'o done admite a interrupcao');
  const tokens = out.events.filter((e) => e.name === 'token');
  assert.ok(tokens.length < 5, `parou antes do fim (${tokens.length} de 5 tokens)`);

  const rows = await h.app.conversations.history('grg', done.data.conversationId);
  const assistant = rows.find((r) => r.role === 'assistant');
  assert.equal(assistant.interrupted, true, 'a mensagem parcial fica marcada como interrompida');
  await h.close();
});

test('abortar um stream que nao existe responde honestamente 404', async () => {
  const h = await harness(streamingLlm());
  const out = await new Promise((resolve) => {
    const body = JSON.stringify({ streamId: 'stream_inexistente' });
    const req = http.request({
      host: '127.0.0.1', port: h.port, path: '/api/chat/abort', method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.end(body);
  });
  assert.equal(out.status, 404);
  assert.equal(out.body.aborted, false, 'nao finge que abortou');
  await h.close();
});

test('sem provider de LLM o chat falha explicito, nao com stream vazio', async () => {
  const h = await harness(null);
  const out = await new Promise((resolve) => {
    const body = JSON.stringify({ message: 'oi' });
    const req = http.request({
      host: '127.0.0.1', port: h.port, path: '/api/chat/stream', method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.end(body);
  });
  assert.equal(out.status, 503, 'erro HTTP legivel, nao 200 com nada dentro');
  assert.match(out.body.reason, /LLM/, 'a razao real e dita');
  // A pergunta do usuario nao e perdida: fica gravada para quando o provider voltar.
  const rows = await h.app.conversations.history('grg', out.body.conversationId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].content, 'oi');
  await h.close();
});

test('a segunda mensagem da mesma conversa carrega o contexto da primeira', async () => {
  const h = await harness(streamingLlm({ pieces: ['ok'] }));
  const first = await sseRequest(h.port, '/api/chat/stream', { message: 'meu nome e Rodrigo' });
  const conversationId = first.events.find((e) => e.name === 'done').data.conversationId;

  const second = await sseRequest(h.port, '/api/chat/stream', { message: 'qual meu nome?', conversationId });
  const context = second.events.find((e) => e.name === 'context');
  assert.ok(context, 'o cliente e informado do contexto usado');
  assert.ok(context.data.turnsIncluded >= 2, `o historico real entrou no prompt (${context.data.turnsIncluded} turnos)`);

  const rows = await h.app.conversations.history('grg', conversationId);
  assert.equal(rows.length, 4, 'as duas trocas estao na MESMA conversa');
  await h.close();
});

test('preferencias de voz sobrevivem via HTTP (nao so localStorage)', async () => {
  const h = await harness(streamingLlm());
  const put = await new Promise((resolve) => {
    const body = JSON.stringify({ inputMode: 'continuous', ttsEnabled: true });
    const req = http.request({
      host: '127.0.0.1', port: h.port, path: '/api/chat/preferences', method: 'PUT',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.end(body);
  });
  assert.equal(put.inputMode, 'continuous');

  const get = await new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port: h.port, path: '/api/chat/preferences' }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve(JSON.parse(raw)));
    });
  });
  assert.equal(get.inputMode, 'continuous', 'a preferencia veio do servidor');
  assert.equal(get.ttsEnabled, true);
  await h.close();
});
