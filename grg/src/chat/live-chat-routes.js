// Rotas de chat ao vivo: SSE com streaming token a token, persistencia e abort real.
//
// Separado do server.js porque SSE nao cabe no padrao sendJson (a resposta fica aberta por
// minutos, escrevendo em pedacos) e porque a logica de abort/persistencia tem que ficar junto
// do stream, nao espalhada no roteador.
//
// Contrato SSE (event: name / data: json):
//   ready  {conversationId, model, provider}
//   token  {text}                  <- um por fragmento do modelo
//   done   {text, chunks, aborted, messageId, tokens}
//   error  {message}
//
// Por que SSE e nao WebSocket: o fluxo e unidirecional (servidor -> cliente) depois do POST
// inicial, SSE reconecta sozinho no browser, atravessa qualquer proxy HTTP e nao precisa de
// upgrade de protocolo. WebSocket resolveria o mesmo problema com mais infraestrutura.

const crypto = require('node:crypto');

// Streams vivos por id, para o abort poder alcancar um stream iniciado por OUTRA requisicao.
// O botao "interromper" do cliente e um POST separado -- sem este registro ele so pararia a UI
// enquanto o servidor seguiria gerando (gastando CPU do Ollama ate o fim).
const liveStreams = new Map();

function sseOpen(res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    // Desliga o buffer do nginx nesta resposta mesmo se a conf global mudar: sem isso o proxy
    // segura os tokens e entrega tudo de uma vez, matando a sensacao de tempo real.
    'x-accel-buffering': 'no',
  });
  // Comentario inicial: forca o browser a entregar os headers ao EventSource imediatamente.
  res.write(': open\n\n');
}

function sseSend(res, event, payload) {
  if (res.writableEnded) return false;
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  return true;
}

function pickProvider(app) {
  // Ordem: provider de chat injetado (app.llm) -> AI Platform Provider -> Ollama -> nada.
  // Nunca inventa resposta: sem llm o chat de voz responde com erro explicito.
  if (app.llm) return { llm: app.llm, reason: null };
  if (app.aiGateway && app.aiGateway.providers) {
    const aiplatform = app.aiGateway.providers.aiplatform;
    if (aiplatform && aiplatform.hasKey) {
      return { llm: aiplatform, reason: null };
    }
    const ollama = app.aiGateway.providers.ollama;
    if (ollama) {
      return { llm: ollama, reason: null };
    }
  }
  return { llm: null, reason: 'nenhum provider de LLM ligado (GRG_LLM=1 + GRG_AIPLATFORM_URL/KEY ou FENIX_OLLAMA_URL)' };
}

// Registra as rotas. Chamado pelo server.js com o contexto de request ja autenticado.
// Devolve true quando tratou a rota, false quando nao e dela (o server segue procurando).
async function handleLiveChat({ app, req, res, url, tenantId, actorId, readJson, sendJson, requestId }) {
  const conversations = app.conversations;
  if (!conversations) return false;

  // --- historico e conversas -------------------------------------------------------------
  if (req.method === 'GET' && url.pathname === '/api/chat/conversations') {
    sendJson(res, 200, { conversations: await conversations.list(tenantId) }, requestId);
    return true;
  }
  if (req.method === 'GET' && /^\/api\/chat\/conversations\/[^/]+$/.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.split('/')[4]);
    sendJson(res, 200, { conversationId: id, messages: await conversations.history(tenantId, id) }, requestId);
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/api/chat/conversations') {
    const body = await readJson(req);
    sendJson(res, 201, await conversations.open(tenantId, actorId, { title: body.title || null }), requestId);
    return true;
  }

  // --- preferencias (modo de voz, TTS, VAD) ----------------------------------------------
  if (req.method === 'GET' && url.pathname === '/api/chat/preferences') {
    sendJson(res, 200, await conversations.preferences(tenantId, actorId), requestId);
    return true;
  }
  if (req.method === 'PUT' && url.pathname === '/api/chat/preferences') {
    sendJson(res, 200, await conversations.savePreferences(tenantId, actorId, await readJson(req)), requestId);
    return true;
  }

  // --- abort de um stream em andamento ---------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/api/chat/abort') {
    const body = await readJson(req);
    const id = String(body.streamId || '');
    const entry = liveStreams.get(id);
    if (!entry) {
      // Honesto: nao existe (ja terminou ou nunca existiu). Nao finge que abortou.
      sendJson(res, 404, { aborted: false, reason: 'stream nao esta ativo', streamId: id }, requestId);
      return true;
    }
    entry.controller.abort();
    sendJson(res, 200, { aborted: true, streamId: id }, requestId);
    return true;
  }

  // --- streaming ao vivo -----------------------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/api/chat/stream') {
    const body = await readJson(req);
    const message = String(body.message || '').trim();
    if (!message) { sendJson(res, 400, { error: 'message required' }, requestId); return true; }

    const source = body.source === 'voice' ? 'voice' : 'text';
    const streamId = `stream_${crypto.randomUUID()}`;
    const { llm, reason } = pickProvider(app);

    const conversation = await conversations.open(tenantId, actorId, { conversationId: body.conversationId || null });
    await conversations.append(tenantId, actorId, conversation.id, { role: 'user', content: message, source });

    if (!llm || typeof llm.stream !== 'function') {
      // Falha explicita ANTES de abrir o SSE: o cliente recebe um erro HTTP legivel em vez de
      // um stream vazio que pareceria travamento.
      sendJson(res, 503, {
        error: 'chat ao vivo indisponivel',
        reason: reason || 'o provider ligado nao suporta streaming',
        conversationId: conversation.id,
      }, requestId);
      return true;
    }

    const controller = new AbortController();
    liveStreams.set(streamId, { controller, tenantId, actorId, conversationId: conversation.id });

    sseOpen(res);
    sseSend(res, 'ready', {
      streamId,
      conversationId: conversation.id,
      model: llm.model || null,
      provider: llm.name || null,
    });

    // Cliente desconectou (fechou a aba, perdeu a rede, celular trocou de rede): abortar a
    // geracao. Sem isto o Ollama seguiria gerando para ninguem.
    req.on('close', () => { if (!controller.signal.aborted) controller.abort(); });

    let prompt;
    try {
      prompt = await conversations.buildPrompt(tenantId, actorId, conversation.id, message, {
        system: body.system || 'Voce e o FENIX, o sistema operacional cognitivo do dono. Responda em portugues, direto e curto. Nunca invente numeros nem afirme que algo esta feito sem prova.',
      });
      sseSend(res, 'context', {
        turnsIncluded: prompt.turnsIncluded,
        turnsTotal: prompt.turnsTotal,
        usedSummary: prompt.usedSummary,
        usedMemories: prompt.usedMemories,
      });
    } catch (error) {
      sseSend(res, 'error', { message: `falha ao montar contexto: ${error.message}` });
      liveStreams.delete(streamId);
      res.end();
      return true;
    }

    try {
      const out = await llm.stream({
        messages: prompt.messages,
        temperature: Number.isFinite(body.temperature) ? body.temperature : 0.3,
        signal: controller.signal,
        onToken: (piece) => sseSend(res, 'token', { text: piece }),
      });

      const saved = await conversations.append(tenantId, actorId, conversation.id, {
        role: 'assistant',
        content: out.text || '',
        source,
        tokens: out.completionTokens || out.chunks || null,
        model: out.model || llm.model || null,
        interrupted: Boolean(out.aborted),
      });

      sseSend(res, 'done', {
        streamId,
        messageId: saved.id,
        conversationId: conversation.id,
        text: out.text || '',
        chunks: out.chunks || 0,
        aborted: Boolean(out.aborted),
        streamed: Boolean(out.streamed),
        model: out.model || null,
      });

      // Sumarizacao depois do done: nao atrasa a resposta que o usuario espera ouvir.
      conversations.summarizeIfNeeded(tenantId, actorId, conversation.id).catch(() => {});
    } catch (error) {
      sseSend(res, 'error', { message: error.message });
    } finally {
      liveStreams.delete(streamId);
      if (!res.writableEnded) res.end();
    }
    return true;
  }

  return false;
}

module.exports = { handleLiveChat, liveStreams };
