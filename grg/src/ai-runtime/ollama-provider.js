// OllamaProvider: LLM local REAL via Ollama (http://127.0.0.1:11434). Sem chave, sem custo.
// Implementa a mesma interface do EchoProvider: complete({model,prompt}) + chat({messages}).
const http = require('node:http');

function post(path, payload, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      host: '127.0.0.1', port: 11434, path, method: 'POST',
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
  constructor({ model = 'qwen2.5:3b' } = {}) {
    this.name = 'ollama';
    this.model = model;
    this.models = [model];
  }

  async available() {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port: 11434, path: '/api/tags', method: 'GET' }, (r) => { r.resume(); r.on('end', resolve); });
        req.on('error', reject); req.setTimeout(3000, () => req.destroy(new Error('timeout'))); req.end();
      });
      return true;
    } catch { return false; }
  }

  // interface do AI Gateway
  async complete({ model, prompt }) {
    const res = await post('/api/generate', { model: model || this.model, prompt, stream: false });
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
    const res = await post('/api/chat', payload);
    return { text: res.message ? res.message.content : '', raw: res };
  }
}

module.exports = { OllamaProvider };
