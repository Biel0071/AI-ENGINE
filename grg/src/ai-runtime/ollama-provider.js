// OllamaProvider: LLM local REAL via Ollama. Sem chave, sem custo.
// Implementa a mesma interface do EchoProvider: complete({model,prompt}) + chat({messages}),
// mais stream({onToken}) para chat ao vivo.
//
// baseUrl e configuravel porque 127.0.0.1 estava errado por construcao: dentro do container
// da api, 127.0.0.1 e o proprio container, onde nao ha Ollama. Medido na VPS:
//   wget http://172.17.0.1:11434/api/tags -> Connection refused
//   wget http://ollama:11434/api/tags     -> bad address (rede docker diferente)
// O endereco correto depende da topologia (nome de servico na mesma rede, gateway do host, ou
// IP do container em outra rede), portanto vem de FENIX_OLLAMA_URL / GRG_OLLAMA_DIRECT_URL.
const http = require('node:http');
const { streamFromOllama } = require('./ollama-stream');

const DEFAULT_BASE_URL = process.env.FENIX_OLLAMA_URL || process.env.GRG_OLLAMA_DIRECT_URL || 'http://127.0.0.1:11434';

function post(baseUrl, path, payload, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    let u;
    try { u = new URL(String(baseUrl).replace(/\/$/, '') + path); } catch { return reject(new Error('ollama: bad base url')); }
    const req = http.request({
      host: u.hostname, port: u.port || 80, path: u.pathname, method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('ollama bad json: ' + body.slice(0, 120))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('ollama timeout')));
    req.end(data);
  });
}

class OllamaProvider {
  constructor({ model = 'qwen2.5:3b', baseUrl = DEFAULT_BASE_URL } = {}) {
    this.name = 'ollama';
    this.model = model;
    this.models = [model];
    this.baseUrl = String(baseUrl).replace(/\/$/, '');
  }

  // available() faz INFERENCIA, nao ping. /api/tags responde 200 com o Ollama de pe e o modelo
  // ausente ou descarregado -- o health reportaria "ok" sem que uma geracao fosse possivel.
  // Um prompt de um token prova o caminho inteiro e devolve erro legivel se o modelo nao existe.
  async available() {
    try {
      const res = await post(this.baseUrl, '/api/generate', { model: this.model, prompt: 'ok', stream: false }, 20000);
      if (res && res.error) return false;
      return typeof res?.response === 'string';
    } catch { return false; }
  }

  // Mensagem legivel quando o modelo nao esta carregado, em vez de "bad json" ou timeout seco.
  async ensureModel() {
    const res = await post(this.baseUrl, '/api/generate', { model: this.model, prompt: 'ok', stream: false }, 20000);
    if (res && res.error) throw new Error(`ollama: modelo "${this.model}" indisponivel (${res.error}). Rode: ollama pull ${this.model}`);
    return { ok: true, model: this.model, baseUrl: this.baseUrl };
  }

  // interface do AI Gateway
  async complete({ model, prompt }) {
    const res = await post(this.baseUrl, '/api/generate', { model: model || this.model, prompt, stream: false });
    if (res && res.error) throw new Error(`ollama: ${res.error}`);
    const text = res.response || '';
    return {
      text, model: model || this.model,
      promptTokens: res.prompt_eval_count || Math.ceil(prompt.length / 4),
      completionTokens: res.eval_count || Math.ceil(text.length / 4),
    };
  }

  // chat com histórico + system prompt (usado pelo ChatAgent LLM)
  async chat({ model, messages, format = null, temperature = 0.3 }) {
    const payload = { model: model || this.model, messages, stream: false, options: { temperature } };
    if (format) payload.format = format; // 'json' força saída JSON
    const res = await post(this.baseUrl, '/api/chat', payload);
    if (res && res.error) throw new Error(`ollama: ${res.error}`);
    return { text: res.message ? res.message.content : '', raw: res };
  }

  // Streaming token a token, com abort real no servidor.
  async stream({ model, prompt = null, messages = null, temperature = 0.3, onToken, signal = null } = {}) {
    return streamFromOllama({ baseUrl: this.baseUrl, model: model || this.model, prompt, messages, temperature, onToken, signal });
  }
}

module.exports = { OllamaProvider };
