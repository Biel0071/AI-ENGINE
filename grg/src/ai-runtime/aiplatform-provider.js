// AIPlatformProvider: fala com o "AI Platform Enterprise" (a API GRATIS do portfólio) — o gateway
// multi-provider do usuário, rodando na VPS via cloudflared OU local em docker. Endpoints:
// POST /v1/chat {messages} e /v1/text {prompt} com header x-api-key. Resposta: {result:{text}}.
// Mesma interface do OllamaProvider/EchoProvider → plugável no AI Gateway e no ChatAgent.
const http = require('node:http');
const https = require('node:https');
const { streamFromOllama } = require('./ollama-stream');

function request(baseUrl, path, apiKey, payload, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(baseUrl.replace(/\/$/, '') + path); } catch (e) { return reject(new Error('bad base url')); }
    const lib = u.protocol === 'https:' ? https : http;
    const data = JSON.stringify(payload);
    const req = lib.request({
      hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'content-length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch { reject(new Error('aiplatform bad json')); }
        } else reject(new Error(`aiplatform ${res.statusCode}: ${body.slice(0, 140)}`));
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('aiplatform timeout')));
    req.end(data);
  });
}

// MEDIDO em producao (5 requisicoes simultaneas contra o gateway da .215): acima da
// concorrencia do gateway (`concurrency: 4`) ele responde **HTTP 202** com `{jobId, queue}`
// em vez de bloquear -- processamento assincrono. O 202 passa pelo teste `2xx` e `res.result`
// vem `undefined`, entao `complete()` devolvia **texto vazio em silencio**: sob varias
// conversas ao mesmo tempo o chat responderia em branco em vez de falhar. Falhar alto e
// honesto; texto vazio e o falso positivo que a regra REALITY FIRST proibe.
//
// Nao implemento polling do jobId aqui de proposito: nao medi o endpoint de consulta do job,
// e escrever um cliente para contrato que nao observei seria suposicao. Fica nomeado.
function assertNotEnqueued(res) {
  if (res && res.jobId && !res.result) {
    const q = res.queue || {};
    throw new Error(
      `aiplatform enfileirou a requisicao (jobId=${res.jobId}, queue=${q.queue || '?'}, `
      + `concurrency=${q.concurrency ?? '?'}, jobsAhead=${q.jobsAhead ?? '?'}): `
      + 'resposta assincrona nao suportada por complete()/chat()',
    );
  }
  return res;
}

class AIPlatformProvider {
  #apiKey;
  constructor({ baseUrl, apiKey, model = null } = {}) {
    this.name = 'aiplatform';
    this.baseUrl = baseUrl || process.env.GRG_AIPLATFORM_URL || '';
    this.#apiKey = apiKey || process.env.GRG_AIPLATFORM_KEY || '';
    this.model = model;
    this.models = model ? [model] : [];
  }

  // available() FAZ INFERENCIA, nao ping. GET /v1/health responde 200 com o gateway de pe e
  // TODOS os modelos descarregados -- o health do FENIX reportava "ai-providers: ok" sem que
  // uma unica geracao fosse possivel. Um prompt minimo e a unica prova de que o caminho
  // completo (gateway -> ollama -> modelo carregado) funciona. Custo medido: 1.3s, 39 tokens.
  async available() {
    if (!this.baseUrl || !this.#apiKey) return false;
    try {
      const res = await request(this.baseUrl, '/v1/text', this.#apiKey, { prompt: 'ok', ...(this.model ? { model: this.model } : {}) }, 20000);
      // 202 + jobId significa fila, nao geracao: nao conta como disponivel.
      if (res && res.jobId && !res.result) return false;
      const text = res.result ? res.result.text : res.text;
      return typeof text === 'string' && text.length > 0;
    } catch { return false; }
  }

  // Streaming token a token. O gateway /v1/text nao faz stream, entao o FENIX vai direto ao
  // /api/generate do Ollama quando ha um caminho direto configurado; senao degrada para uma
  // unica emissao com o texto completo (honesto: o cliente recebe menos, nunca dado falso).
  // onToken recebe cada fragmento; o retorno traz o texto acumulado.
  async stream({ model, prompt, messages = null, temperature = 0.3, onToken, signal = null } = {}) {
    const direct = process.env.GRG_OLLAMA_DIRECT_URL || '';
    if (!direct) {
      const res = messages
        ? await this.chat({ model, messages, temperature })
        : await this.complete({ model, prompt });
      if (typeof onToken === 'function' && res.text) onToken(res.text);
      return { text: res.text, streamed: false, reason: 'gateway /v1/text nao suporta stream; GRG_OLLAMA_DIRECT_URL ausente' };
    }
    return streamFromOllama({ baseUrl: direct, model: model || this.model, prompt, messages, temperature, onToken, signal });
  }

  // AI Gateway interface
  async complete({ model, prompt }) {
    const res = await request(this.baseUrl, '/v1/text', this.#apiKey, { prompt, ...(model ? { model } : {}) });
    assertNotEnqueued(res);
    const text = res.result ? (res.result.text || '') : (res.text || '');
    const tk = res.tokens || {};
    return { text, model: res.model || model, promptTokens: tk.prompt || Math.ceil(prompt.length / 4), completionTokens: tk.completion || Math.ceil(text.length / 4) };
  }

  // ChatAgent interface (messages + json/temperature)
  async chat({ model, messages, format = null, temperature = 0.3 }) {
    const payload = { messages, ...(model ? { model } : {}), temperature };
    if (format === 'json') payload.format = 'json';
    const res = await request(this.baseUrl, '/v1/chat', this.#apiKey, payload);
    assertNotEnqueued(res);
    const result = res.result || {};
    const message = result.message;
    const text = result.text || (typeof message === 'string' ? message : message?.content) || res.text || '';
    return { text, raw: res };
  }
}

module.exports = { AIPlatformProvider };
