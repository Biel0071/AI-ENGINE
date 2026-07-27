// AIPlatformProvider: fala com o "AI Platform Enterprise" (a API GRATIS do portfólio) — o gateway
// multi-provider do usuário, rodando na VPS via cloudflared OU local em docker. Endpoints:
// POST /v1/chat {messages} e /v1/text {prompt} com header x-api-key. Resposta: {result:{text}}.
// Mesma interface do OllamaProvider/EchoProvider → plugável no AI Gateway e no ChatAgent.
const http = require('node:http');
const https = require('node:https');

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

class AIPlatformProvider {
  #apiKey;
  constructor({ baseUrl, apiKey, model = null } = {}) {
    this.name = 'aiplatform';
    this.baseUrl = baseUrl || process.env.GRG_AIPLATFORM_URL || '';
    this.#apiKey = apiKey || process.env.GRG_AIPLATFORM_KEY || '';
    this.model = model;
    this.models = model ? [model] : [];
  }

  async available() {
    if (!this.baseUrl || !this.#apiKey) return false;
    try {
      const u = new URL(this.baseUrl.replace(/\/$/, '') + '/v1/health');
      const lib = u.protocol === 'https:' ? https : http;
      return await new Promise((resolve) => {
        const req = lib.request({ hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname, method: 'GET', headers: { 'x-api-key': this.#apiKey } },
          (r) => { r.resume(); resolve(r.statusCode >= 200 && r.statusCode < 300); });
        req.on('error', () => resolve(false));
        req.setTimeout(6000, () => { req.destroy(); resolve(false); });
        req.end();
      });
    } catch { return false; }
  }

  // AI Gateway interface
  async complete({ model, prompt }) {
    const res = await request(this.baseUrl, '/v1/text', this.#apiKey, { prompt, ...(model ? { model } : {}) });
    const text = res.result ? (res.result.text || '') : (res.text || '');
    const tk = res.tokens || {};
    return { text, model: res.model || model, promptTokens: tk.prompt || Math.ceil(prompt.length / 4), completionTokens: tk.completion || Math.ceil(text.length / 4) };
  }

  // ChatAgent interface (messages + json/temperature)
  async chat({ model, messages, format = null, temperature = 0.3 }) {
    const payload = { messages, ...(model ? { model } : {}), temperature };
    if (format === 'json') payload.format = 'json';
    const res = await request(this.baseUrl, '/v1/chat', this.#apiKey, payload);
    const result = res.result || {};
    const message = result.message;
    const text = result.text || (typeof message === 'string' ? message : message?.content) || res.text || '';
    return { text, raw: res };
  }
}

module.exports = { AIPlatformProvider };
