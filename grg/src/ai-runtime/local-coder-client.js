'use strict';
// Local code model client (Ollama /api/generate). No external LLM.
// Env: FENIX_CODER_OLLAMA_URL (falls back to OLLAMA_URL, then http://127.0.0.1:11434),
//      FENIX_CODER_MODEL (default qwen2.5-coder:1.5b), FENIX_CODER_TIMEOUT_MS (default 90000),
//      FENIX_CODER_MAX_TOKENS (default 400), FENIX_CODER_BREAKER_THRESHOLD (3), FENIX_CODER_BREAKER_COOLDOWN_MS (60000).
// Never fabricates output: when the model is unreachable it returns { ok:false, reason } and the
// caller must report "model unavailable".

class LocalCoderClient {
  constructor({ env = process.env, fetchImpl = globalThis.fetch, clock = Date } = {}) {
    this.url = String(env.FENIX_CODER_OLLAMA_URL || env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    this.model = env.FENIX_CODER_MODEL || 'qwen2.5-coder:1.5b';
    this.timeoutMs = Number(env.FENIX_CODER_TIMEOUT_MS || 90_000);
    this.maxTokens = Number(env.FENIX_CODER_MAX_TOKENS || 400);
    // Limite de threads do Ollama por geração: na VPS de 4 núcleos, 3 deixam um núcleo livre
    // para o resto do sistema. Sem a variável, o Ollama decide (comportamento anterior).
    this.numThread = Number(env.FENIX_CODER_NUM_THREAD) > 0 ? Math.floor(Number(env.FENIX_CODER_NUM_THREAD)) : null;
    this.threshold = Math.max(1, Number(env.FENIX_CODER_BREAKER_THRESHOLD || 3));
    this.cooldownMs = Number(env.FENIX_CODER_BREAKER_COOLDOWN_MS || 60_000);
    this.fetch = fetchImpl;
    this.clock = clock;
    this.failures = 0;
    this.openedAt = null;
  }

  breakerState() {
    if (this.openedAt === null) return 'CLOSED';
    return this.clock.now() - this.openedAt >= this.cooldownMs ? 'HALF_OPEN' : 'OPEN';
  }

  async generate(prompt, { signal, model = null } = {}) {
    const base = { model: model || this.model, url: this.url };
    if (this.breakerState() === 'OPEN') return { ok: false, ...base, reason: 'circuit breaker open after repeated model failures', breaker: 'OPEN' };
    if (typeof this.fetch !== 'function') return { ok: false, ...base, reason: 'fetch is not available in this runtime' };
    const started = this.clock.now();
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const combined = signal && AbortSignal.any ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const res = await this.fetch(`${this.url}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: base.model, prompt, stream: false, options: { temperature: 0, num_predict: this.maxTokens, ...(this.numThread ? { num_thread: this.numThread } : {}) } }),
        signal: combined,
      });
      if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
      const body = await res.json();
      if (typeof body.response !== 'string') throw new Error('ollama response missing "response" text');
      this.failures = 0; this.openedAt = null;
      const tokens = Number(body.eval_count || 0) + Number(body.prompt_eval_count || 0);
      // Ollama reports durations in ns; expose ms so load vs generation time is measurable.
      const ns = (v) => (v != null && Number.isFinite(Number(v)) ? Math.round(Number(v) / 1e6) : null);
      const ollama = { loadMs: ns(body.load_duration), promptEvalMs: ns(body.prompt_eval_duration), evalMs: ns(body.eval_duration), totalMs: ns(body.total_duration), promptTokens: body.prompt_eval_count ?? null, evalTokens: body.eval_count ?? null };
      return { ok: true, ...base, text: body.response, tokens: tokens || null, ollama, durationMs: this.clock.now() - started, breaker: 'CLOSED' };
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.threshold || this.openedAt !== null) this.openedAt = this.clock.now();
      const reason = error?.name === 'TimeoutError' ? `model timed out after ${this.timeoutMs} ms` : String(error?.message || error);
      return { ok: false, ...base, reason, durationMs: this.clock.now() - started, breaker: this.breakerState() };
    }
  }
}

// Returns the first fenced code block (```js / ```javascript / ```), or null. Text the model adds
// after the block is discarded on purpose (qwen2.5-coder:1.5b keeps writing prose after code).
function extractCodeBlock(text) {
  const m = String(text || '').match(/```(?:javascript|js|node|typescript|ts)?[ \t]*\r?\n([\s\S]*?)```/i);
  if (m && m[1].trim()) return m[1].trim();
  return null;
}

module.exports = { LocalCoderClient, extractCodeBlock };
