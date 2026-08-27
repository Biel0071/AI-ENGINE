// AIPlatformProvider: fala com o "AI Platform Enterprise" (a API GRATIS do portfólio) — o gateway
// multi-provider do usuário, rodando na VPS via cloudflared OU local em docker. Endpoints:
// POST /v1/chat {messages} e /v1/text {prompt} com header x-api-key. Resposta: {result:{text}}.
// Mesma interface do OllamaProvider/EchoProvider → plugável no AI Gateway e no ChatAgent.
const http = require('node:http');
const https = require('node:https');
const { streamFromOllama } = require('./ollama-stream');
const { assertNotFabricated } = require('./fabricated-response');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Enhanced HTTP request with Timeout Controller and Exponential Backoff Retry Policy
async function request(baseUrl, path, apiKey, payload, timeoutMs = 120000, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        let u;
        try { u = new URL(baseUrl.replace(/\/$/, '') + path); } catch (e) { return reject(new Error('bad base url')); }
        const lib = u.protocol === 'https:' ? https : http;
        const data = JSON.stringify(payload);
        const req = lib.request({
          hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search,
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'authorization': `Bearer ${apiKey}`,
            'content-length': Buffer.byteLength(data)
          },
        }, (res) => {
          let body = '';
          res.on('data', (c) => { body += c; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try { resolve(JSON.parse(body)); } catch { reject(new Error('aiplatform bad json')); }
            } else if (res.statusCode === 502 || res.statusCode === 503 || res.statusCode === 504) {
              reject(new Error(`aiplatform transient error ${res.statusCode}: ${body.slice(0, 140)}`));
            } else {
              reject(new Error(`aiplatform ${res.statusCode}: ${body.slice(0, 140)}`));
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => req.destroy(new Error('aiplatform timeout')));
        req.end(data);
      });
      return result;
    } catch (err) {
      lastError = err;
      const isTransient = err.message && (
        err.message.includes('transient error') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('timeout')
      );
      if (attempt < maxRetries && isTransient) {
        const backoffMs = Math.min(500 * Math.pow(2, attempt - 1), 5000);
        await sleep(backoffMs);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// MEDIDO em producao (5 requisicoes simultaneas contra o gateway da .215): acima da
// concorrencia do gateway (`concurrency: 4`) ele responde **HTTP 202** com `{jobId, queue}`
// em vez de bloquear -- processamento assincrono. O 202 passa pelo teste `2xx` e `res.result`
// vem `undefined`, entao `complete()` devolvia **texto vazio em silencio**: sob varias
// conversas ao mesmo tempo o chat responderia em branco em vez de falhar. Falhar alto e
// honesto; texto vazio e o falso positivo que a regra REALITY FIRST proibe.
//
// O contrato de consulta FOI MEDIDO em 2026-07-30 (6 requisicoes simultaneas, jobId real):
//
//   GET /v1/jobs/:id -> {success, jobId, status, result, error, durationMs, createdAt,
//                        finishedAt, queue}
//   status observado : "active" (sem texto) -> "completed" (com texto)
//   texto            : result.result.text  <- ANINHADO DUAS VEZES, medido, nao suposto
//
// Com o contrato observado, `waitForJob()` abaixo faz o polling. A recusa de assertNotEnqueued
// permanece como rede de seguranca para quem chamar `complete()`/`chat()` com polling
// desligado (GRG_AIPLATFORM_JOB_WAIT_MS=0): melhor erro alto do que texto vazio.
// GET com o mesmo header de credencial. Separado do request() acima porque o POST manda
// content-length de um corpo que aqui nao existe: enviar `content-length: 2` num GET sem corpo
// deixa a conexao pendurada esperando bytes que nunca vem.
async function requestGet(baseUrl, path, apiKey, timeoutMs = 20000, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        let u;
        try { u = new URL(baseUrl.replace(/\/$/, '') + path); } catch (e) { return reject(new Error('bad base url')); }
        const lib = u.protocol === 'https:' ? https : http;
        const req = lib.request({
          hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search,
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'authorization': `Bearer ${apiKey}`
          },
        }, (res) => {
          let body = '';
          res.on('data', (c) => { body += c; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try { resolve(JSON.parse(body)); } catch { reject(new Error('aiplatform bad json')); }
            } else if (res.statusCode === 502 || res.statusCode === 503 || res.statusCode === 504) {
              reject(new Error(`aiplatform transient error ${res.statusCode}: ${body.slice(0, 140)}`));
            } else {
              reject(new Error(`aiplatform ${res.statusCode}: ${body.slice(0, 140)}`));
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => req.destroy(new Error('aiplatform timeout')));
        req.end();
      });
      return result;
    } catch (err) {
      lastError = err;
      const isTransient = err.message && (
        err.message.includes('transient error') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('timeout')
      );
      if (attempt < maxRetries && isTransient) {
        const backoffMs = Math.min(300 * Math.pow(2, attempt - 1), 3000);
        await sleep(backoffMs);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// CONTRATO MEDIDO (2026-07-30, 6 requisicoes simultaneas contra a .215 para forcar a fila):
//
//   poll: status=active    | temTexto=false | chaves=success,jobId,status,populationStatus,
//                                                     message,result,error,durationMs,
//                                                     createdAt,finishedAt,queue
//   poll: status=completed | temTexto=true  | (mesmas chaves, sem queue)
//
// O texto fica em `result.result.text` -- aninhado duas vezes. Nao deduzi: li as chaves do
// payload real. `result.model`, `result.cached` e `result.tokens` vem no mesmo nivel do texto.
//
// Estados terminais tratados: `completed` (texto), `failed`/`error` (erro alto com a mensagem
// do gateway). Qualquer outro valor conta como em andamento e o polling continua ate o teto.
// Estourar o teto e ERRO, nao texto vazio: o chamador precisa saber que nao houve geracao.
const TERMINAL_ERRO = new Set(['failed', 'error', 'cancelled', 'canceled']);

function textoDoJob(job) {
  const r = job && job.result;
  if (!r) return '';
  // result.result.text e o caminho medido; os outros dois sao tolerancia a evolucao do
  // gateway (outro produto, muda sem aviso), nunca invencao de conteudo.
  return (r.result && r.result.text) || r.text || (typeof r === 'string' ? r : '') || '';
}


async function waitForJob(baseUrl, apiKey, jobId, { waitMs = 120000, intervalMs = 1000 } = {}) {
  const prazo = Date.now() + waitMs;
  let ultimo = null;
  for (let tentativa = 0; Date.now() < prazo; tentativa += 1) {
    if (tentativa > 0) await sleep(intervalMs);
    let job;
    try {
      job = await requestGet(baseUrl, `/v1/jobs/${encodeURIComponent(jobId)}`, apiKey, Math.min(20000, waitMs));
    } catch (e) {
      // Falha de consulta nao e falha do job: o gateway pode estar sob carga. Continua ate o
      // teto e, se estourar, o erro final carrega o motivo da ultima tentativa.
      ultimo = e.message;
      continue;
    }
    const status = String(job.status || '').toLowerCase();
    ultimo = status || 'sem status';
    if (status === 'completed' || status === 'succeeded') {
      const text = textoDoJob(job);
      if (!text) throw new Error(`aiplatform job ${jobId} completou sem texto (result=${JSON.stringify(job.result || null).slice(0, 120)})`);
      return { text, job };
    }
    if (TERMINAL_ERRO.has(status)) {
      throw new Error(`aiplatform job ${jobId} falhou (status=${status}): ${job.error || 'sem detalhe'}`);
    }
  }
  throw new Error(`aiplatform job ${jobId} nao concluiu em ${waitMs}ms (ultimo estado: ${ultimo})`);
}

// MEDIDO EM PRODUCAO (2026-07-29): o compose repassa `${VAR:-}`, entao uma variavel AUSENTE do
// .env chega ao container como STRING VAZIA. `??` so trata `undefined` -- `Number('')` e 0, que
// e finito e >= 0, e passaria pela validacao DESLIGANDO o polling sem ninguem pedir. Por isso o
// vazio e descartado antes da conversao: e o mesmo furo que parou a fila do worker.
function jobWaitConfig(env = process.env) {
  const ler = (nome, padrao, minimo) => {
    const cru = env[nome];
    if (cru === undefined || cru === null || String(cru).trim() === '') return padrao;
    const n = Number(cru);
    return Number.isFinite(n) && n >= minimo ? n : padrao;
  };
  return {
    waitMs: ler('GRG_AIPLATFORM_JOB_WAIT_MS', 120000, 0),
    intervalMs: ler('GRG_AIPLATFORM_JOB_POLL_MS', 1000, 1),
  };
}

// MEDIDO NA .215 (2026-07-30): este provider usa /v1/text e /v1/chat, que falham 503 honesto
// (NO_PROVIDER_AVAILABLE) quando nao ha provider. As rotas OpenAI do MESMO gateway respondem 200
// com texto inventado. O marcador e verificado aqui de todo jeito: o gateway e outro produto e
// evolui sem aviso -- no dia em que ele "degradar graciosamente" nas rotas que o FENIX usa, o
// FENIX gravaria texto fabricado como telemetria de IA, com tokens e custo contados.
// Detalhe da medicao e o porque em ai-runtime/fabricated-response.js.
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

const { resolveAIProviderKey, resolveAIPlatformUrl, resolveAIPlatformModel } = require('../security/secret-resolver');

class AIPlatformProvider {
  #apiKey;
  constructor({ baseUrl, apiKey, model = null, env = process.env } = {}) {
    this.name = 'aiplatform';
    this.baseUrl = baseUrl || resolveAIPlatformUrl(env);
    this.#apiKey = apiKey || resolveAIProviderKey(env) || '';
    this.model = model || resolveAIPlatformModel(env);
    this.models = this.model ? [this.model] : [];
    this.jobWait = jobWaitConfig(env);
  }

  get hasKey() {
    return Boolean(this.#apiKey && this.#apiKey.length > 0);
  }

  // Resolve a resposta 202+jobId para o texto real, pelo contrato medido. Com waitMs=0 o
  // polling fica desligado e a recusa de assertNotEnqueued volta a valer -- erro alto, nunca
  // texto vazio.
  async #resolve(res) {
    if (!(res && res.jobId && !res.result)) return { res, text: null, job: null };
    if (!this.jobWait.waitMs) { assertNotEnqueued(res); return { res, text: null, job: null }; }
    const { text, job } = await waitForJob(this.baseUrl, this.#apiKey, res.jobId, this.jobWait);
    return { res, text, job };
  }

  // available() FAZ INFERENCIA, nao ping. GET /v1/health responde 200 com o gateway de pe e
  // TODOS os modelos descarregados -- o health do FENIX reportava "ai-providers: ok" sem que
  // uma unica geracao fosse possivel. Um prompt minimo e a unica prova de que o caminho
  // completo (gateway -> ollama -> modelo carregado) funciona. Custo medido: 1.3s, 39 tokens.
  async available() {
    this.lastError = null;
    if (!this.baseUrl || !this.#apiKey) { this.lastError = 'missing URL or API key'; return false; }
    try {
      const res = await request(this.baseUrl, '/v1/text', this.#apiKey, { prompt: 'ok', ...(this.model ? { model: this.model } : {}) }, 20000);
      // MEDIDO (2026-07-30): o health do FENIX roda as sondas em paralelo, entao ESTA sonda
      // caia justamente no 202 da fila (`concurrency: 4` no gateway) e reportava
      // "sem provider de LLM" com o gateway gerando texto. Recusar era honesto e incompleto:
      // a fila e o caminho normal sob carga, nao uma falha. Agora ela espera o job -- com teto
      // curto, porque health que demora e health que ninguem le.
      const enfileirado = res && res.jobId && !res.result;
      if (enfileirado && !this.jobWait.waitMs) return false;
      const text = enfileirado
        ? (await waitForJob(this.baseUrl, this.#apiKey, res.jobId, { waitMs: Math.min(this.jobWait.waitMs, 25000), intervalMs: this.jobWait.intervalMs })).text
        : (res.result ? res.result.text : res.text);
      // Texto fabricado NAO conta como disponivel: `[Fallback Response] ...` e non-empty, entao
      // sem esta checagem um gateway sem provider nenhum registrava a conexao como ONLINE.
      // assertNotFabricated lanca, o catch abaixo devolve false, e o connection-manager grava
      // OFFLINE com o motivo -- que e a verdade medida.
      assertNotFabricated(text, { provider: 'aiplatform', endpoint: '/v1/text' });
      const available = typeof text === 'string' && text.length > 0;
      if (!available) this.lastError = 'inference returned empty text';
      return available;
    } catch (error) { this.lastError = String(error.message || error).slice(0, 300); return false; }
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
    const bruto = await request(this.baseUrl, '/v1/text', this.#apiKey, { prompt, ...(model ? { model } : {}) });
    const { text: doJob, job } = await this.#resolve(bruto);
    const res = job ? (job.result || {}) : bruto;
    const text = doJob !== null ? doJob : (res.result ? (res.result.text || '') : (res.text || ''));
    assertNotFabricated(text, { provider: 'aiplatform', endpoint: '/v1/text' });
    const tk = res.tokens || {};
    return { text, model: res.model || model, promptTokens: tk.prompt || Math.ceil(prompt.length / 4), completionTokens: tk.completion || Math.ceil(text.length / 4) };
  }

  // ChatAgent interface (messages + json/temperature)
  async chat({ model, messages, format = null, temperature = 0.3 }) {
    const payload = { messages, ...(model ? { model } : {}), temperature };
    if (format === 'json') payload.format = 'json';
    const bruto = await request(this.baseUrl, '/v1/chat', this.#apiKey, payload);
    const { text: doJob, job } = await this.#resolve(bruto);
    const res = job ? (job.result || {}) : bruto;
    const result = res.result || {};
    const message = result.message;
    const text = doJob !== null ? doJob
      : (result.text || (typeof message === 'string' ? message : message?.content) || res.text || '');
    assertNotFabricated(text, { provider: 'aiplatform', endpoint: '/v1/chat' });
    return { text, raw: res };
  }
}

module.exports = { AIPlatformProvider, waitForJob, textoDoJob, jobWaitConfig, assertNotEnqueued };
