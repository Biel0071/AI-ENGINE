const { estimateTokens } = require('./providers');
const { assertNotFabricated } = require('./fabricated-response');

class ProviderHttpError extends Error {
  constructor(provider, status, message, retryable = false) {
    super(`${provider} request failed (${status}): ${message}`);
    this.name = 'ProviderHttpError';
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
  }
}

async function requestJson(provider, url, { method = 'POST', headers = {}, body, timeoutMs = 120_000, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`${provider} timeout`)), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method, headers: { accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { /* sanitized below */ }
    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || response.statusText || 'provider error';
      throw new ProviderHttpError(provider, response.status, String(message).slice(0, 300), response.status === 429 || response.status >= 500);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

// MEDIDO NA .215 (2026-07-30): `GET /v1/models` do gateway do portfolio responde **HTTP 200 com 6
// modelos listados** e `providers: []` -- ou seja, ha catalogo mas nao ha NENHUM backend capaz de
// gerar. Como `available()` aqui so faz `GET /models` e olha o status, o FENIX registrava o provider
// como disponivel e o router mandava trafego para ele; a geracao entao voltava fabricada
// (`[Fallback Response] ...`) pela rota `/chat/completions`.
//
// O campo `providers` e extensao do gateway, nao existe no contrato da OpenAI. Por isso a regra e
// "presente E vazio => indisponivel": ausente nao acusa nada (OpenAI/Groq reais nao mandam o campo),
// e vazio e uma medicao explicita de que nao ha provider registrado.
//
// Nao troco o `available()` por inferencia real (como faz o AIPlatformProvider, que gera um prompt
// minimo): aqui os provedores sao pagos por token, e um health-check que gera texto a cada checagem
// custaria dinheiro em toda amostragem. Esta checagem e gratuita e pega o caso medido.
function gatewayWithoutProviders(payload) {
  return Array.isArray(payload?.providers) && payload.providers.length === 0;
}

class OpenAIResponsesProvider {
  #apiKey;
  constructor({ apiKey, baseUrl = 'https://api.openai.com/v1', fetchImpl, timeoutMs } = {}) {
    this.name = 'openai'; this.#apiKey = apiKey; this.baseUrl = baseUrl.replace(/\/$/, ''); this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs;
  }
  async complete({ model, prompt, temperature, maxTokens }) {
    const data = await requestJson(this.name, `${this.baseUrl}/responses`, {
      fetchImpl: this.fetchImpl, timeoutMs: this.timeoutMs,
      headers: { authorization: `Bearer ${this.#apiKey}`, 'content-type': 'application/json' },
      body: { model, input: prompt, store: false, max_output_tokens: maxTokens, ...(temperature === undefined ? {} : { temperature }) },
    });
    const text = data.output_text || (data.output || []).flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('');
    assertNotFabricated(text, { provider: this.name, endpoint: `${this.baseUrl}/responses` });
    return { text, model: data.model || model, promptTokens: data.usage?.input_tokens ?? estimateTokens(prompt), completionTokens: data.usage?.output_tokens ?? estimateTokens(text) };
  }
  async available() { return this.#modelsHealth(); }
  async #modelsHealth() {
    try {
      const payload = await requestJson(this.name, `${this.baseUrl}/models`, { method: 'GET', fetchImpl: this.fetchImpl, timeoutMs: 5_000, headers: { authorization: `Bearer ${this.#apiKey}` } });
      return !gatewayWithoutProviders(payload);
    } catch { return false; }
  }
}

class OpenAICompatibleProvider {
  #apiKey;
  constructor({ name, apiKey, baseUrl, fetchImpl, timeoutMs } = {}) {
    this.name = name || 'openai-compatible'; this.#apiKey = apiKey; this.baseUrl = baseUrl.replace(/\/$/, ''); this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs;
  }
  async complete({ model, prompt, temperature = 0, maxTokens }) {
    const data = await requestJson(this.name, `${this.baseUrl}/chat/completions`, {
      fetchImpl: this.fetchImpl, timeoutMs: this.timeoutMs,
      headers: { authorization: `Bearer ${this.#apiKey}`, 'content-type': 'application/json' },
      body: { model, messages: [{ role: 'user', content: prompt }], temperature, max_completion_tokens: maxTokens },
    });
    const text = data.choices?.[0]?.message?.content || '';
    // MEDIDO NA .215 (2026-07-30): esta rota exata -- `/chat/completions` do gateway do portfolio --
    // responde HTTP 200 com `content: "[Fallback Response] Processado via groq"` e
    // `usage.completion_tokens: 30` quando o registry de providers esta VAZIO. Este e o caminho que
    // qualquer SDK OpenAI usa, e o que o FENIX usaria via GRG_OPENAI_COMPATIBLE_URL. Sem esta linha o
    // texto inventado entrava no store como geracao real, com tokens e custo contados.
    assertNotFabricated(text, { provider: this.name, endpoint: `${this.baseUrl}/chat/completions` });
    return { text, model: data.model || model, promptTokens: data.usage?.prompt_tokens ?? estimateTokens(prompt), completionTokens: data.usage?.completion_tokens ?? estimateTokens(text) };
  }
  async available() {
    try {
      const payload = await requestJson(this.name, `${this.baseUrl}/models`, { method: 'GET', fetchImpl: this.fetchImpl, timeoutMs: 5_000, headers: { authorization: `Bearer ${this.#apiKey}` } });
      return !gatewayWithoutProviders(payload);
    } catch { return false; }
  }
}

class AnthropicProvider {
  #apiKey;
  constructor({ apiKey, baseUrl = 'https://api.anthropic.com/v1', fetchImpl, timeoutMs, apiVersion = '2023-06-01' } = {}) {
    this.name = 'anthropic'; this.#apiKey = apiKey; this.baseUrl = baseUrl.replace(/\/$/, ''); this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs; this.apiVersion = apiVersion;
  }
  async complete({ model, prompt, temperature = 0, maxTokens = 2_048 }) {
    const data = await requestJson(this.name, `${this.baseUrl}/messages`, {
      fetchImpl: this.fetchImpl, timeoutMs: this.timeoutMs,
      headers: { 'x-api-key': this.#apiKey, 'anthropic-version': this.apiVersion, 'content-type': 'application/json' },
      body: { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }], temperature },
    });
    const text = (data.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('');
    assertNotFabricated(text, { provider: this.name, endpoint: `${this.baseUrl}/messages` });
    return { text, model: data.model || model, promptTokens: data.usage?.input_tokens ?? estimateTokens(prompt), completionTokens: data.usage?.output_tokens ?? estimateTokens(text) };
  }
  async available() {
    try {
      await requestJson(this.name, `${this.baseUrl}/models`, { method: 'GET', fetchImpl: this.fetchImpl, timeoutMs: 5_000, headers: { 'x-api-key': this.#apiKey, 'anthropic-version': this.apiVersion } });
      return true;
    } catch { return false; }
  }
}

class GeminiProvider {
  #apiKey;
  constructor({ apiKey, baseUrl = 'https://generativelanguage.googleapis.com/v1beta', fetchImpl, timeoutMs } = {}) {
    this.name = 'gemini'; this.#apiKey = apiKey; this.baseUrl = baseUrl.replace(/\/$/, ''); this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs;
  }
  async complete({ model, prompt, temperature = 0, maxTokens }) {
    const encodedModel = encodeURIComponent(model).replace(/%2F/gi, '/');
    const data = await requestJson(this.name, `${this.baseUrl}/models/${encodedModel}:generateContent`, {
      fetchImpl: this.fetchImpl, timeoutMs: this.timeoutMs,
      headers: { 'x-goog-api-key': this.#apiKey, 'content-type': 'application/json' },
      body: { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: maxTokens } },
    });
    const text = (data.candidates?.[0]?.content?.parts || []).map((item) => item.text || '').join('');
    assertNotFabricated(text, { provider: this.name, endpoint: `${this.baseUrl}/models/${model}:generateContent` });
    return { text, model, promptTokens: data.usageMetadata?.promptTokenCount ?? estimateTokens(prompt), completionTokens: data.usageMetadata?.candidatesTokenCount ?? estimateTokens(text) };
  }
  async available() {
    try {
      await requestJson(this.name, `${this.baseUrl}/models?pageSize=1`, { method: 'GET', fetchImpl: this.fetchImpl, timeoutMs: 5_000, headers: { 'x-goog-api-key': this.#apiKey } });
      return true;
    } catch { return false; }
  }
}

module.exports = {
  ProviderHttpError, requestJson, gatewayWithoutProviders,
  OpenAIResponsesProvider, OpenAICompatibleProvider, AnthropicProvider, GeminiProvider,
};
