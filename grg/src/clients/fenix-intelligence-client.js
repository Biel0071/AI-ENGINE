'use strict';
/**
 * FenixIntelligenceClient — SANDBOX Level 2.5
 * Experimento: exp-20260917-LEVEL2.5
 *
 * CORRIGIDO vs v1 (produção):
 * 1. Constructor aceita { app } OU { aiGateway } (v1 só aceitava { aiGateway })
 *    — extrai app.aiGateway automaticamente quando passado { app }
 * 2. Path in-process é SEMPRE preferido quando aiGateway disponível
 * 3. Path HTTP documentado com diagnóstico claro de falha de autenticação
 * 4. Sem mock, sem texto hardcoded, sem fallback falso
 * 5. Falha real retorna status: 'FAILED' / 'OFFLINE' / 'AUTH_ERROR' com mensagem real
 * 6. health() e capabilities() para testes de integração
 *
 * ARQUITETURA:
 *   FÊNIX → FenixIntelligenceClient → app.aiGateway.invoke() → provider → modelo real
 */

const http = require('node:http');
const crypto = require('node:crypto');

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2, 9));
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(String(text).length / 4));
}

class FenixIntelligenceClient {
  /**
   * @param {object} options
   * @param {object} [options.app]        - App instance (extracts app.aiGateway)
   * @param {object} [options.aiGateway]  - Direct AIGateway instance (legacy / override)
   * @param {string} [options.gatewayUrl] - HTTP fallback URL (only when no in-process gateway)
   * @param {string} [options.token]      - Bearer token for HTTP path
   */
  constructor(options = {}) {
    // FIX Level 2.5: accept both { app } and { aiGateway }
    this.aiGateway = options.aiGateway || options.app?.aiGateway || null;
    this.gatewayUrl = (options.gatewayUrl || process.env.FENIX_AI_GATEWAY_URL || 'http://127.0.0.1:4410').replace(/\/$/, '');
    this.token = options.token || '';
    this.defaultModel = options.defaultModel || process.env.FENIX_AI_DEFAULT_MODEL || 'qwen2.5:0.5b';
    this.defaultProvider = options.defaultProvider || process.env.FENIX_AI_DEFAULT_PROVIDER || 'ollama';
    this.timeoutMs = options.timeoutMs || 90000;

    // Expose for diagnostics
    this._sourceMode = this.aiGateway ? 'in-process' : 'http';
  }

  /**
   * Returns gateway health status (real, not mocked).
   */
  async health() {
    if (!this.aiGateway) {
      return { ok: false, mode: 'http', error: 'No in-process aiGateway configured' };
    }
    const providers = {};
    for (const [name, provider] of Object.entries(this.aiGateway.providers || {})) {
      try {
        const pingResult = await provider.ping?.();
        providers[name] = { ok: true, ping: pingResult };
      } catch (e) {
        providers[name] = { ok: false, error: e.message };
      }
    }
    const allOk = Object.values(providers).every(p => p.ok);
    return { ok: allOk, mode: 'in-process', providers };
  }

  /**
   * Returns gateway capabilities (real routes, real providers).
   */
  capabilities() {
    if (!this.aiGateway) {
      return { mode: 'http', routes: {}, providers: [] };
    }
    return {
      mode: 'in-process',
      routes: this.aiGateway.routes || {},
      providers: Object.keys(this.aiGateway.providers || {})
    };
  }

  /**
   * Universal invocation through the real AI Gateway.
   * Primary path: in-process app.aiGateway.invoke() — ZERO network hops.
   * Fallback path: HTTP to fenix-backend — only when no in-process gateway.
   */
  async invokeGateway({
    taskType = 'default',
    prompt = '',
    system = '',
    messages = [],
    model = null,
    provider = null,
    temperature = 0.2,
    maxTokens = 1024
  } = {}) {
    const requestId = `req-${uuid()}`;
    const startTime = Date.now();
    const targetModel    = model    || this.defaultModel;
    const targetProvider = provider || this.defaultProvider;

    // Build full prompt
    let fullPrompt = prompt || '';
    if (!fullPrompt && messages.length > 0) {
      const lastUser = messages.slice().reverse().find(m => m.role === 'user')?.content || '';
      const sys = messages.find(m => m.role === 'system')?.content || system;
      fullPrompt = sys ? `${sys}\n\n${lastUser}` : lastUser;
    } else if (system && fullPrompt && !fullPrompt.includes(system)) {
      fullPrompt = `${system}\n\n${fullPrompt}`;
    }

    if (!fullPrompt) {
      return this._errorResult(requestId, targetModel, targetProvider, startTime, 'prompt is required', 'VALIDATION_ERROR');
    }

    const inputTokens = estimateTokens(fullPrompt);

    // ── PATH 1: In-process Gateway (canonical) ────────────────────────────────
    if (this.aiGateway && typeof this.aiGateway.invoke === 'function') {
      try {
        const res = await this.aiGateway.invoke('grg', 'grg-admin', {
          taskType,
          prompt: fullPrompt,
          temperature,
          provider: targetProvider,
          model: targetModel,
          maxOutputTokens: maxTokens
        });

        const latency = Date.now() - startTime;
        const outputTokens = estimateTokens(res.text);

        return {
          requestId,
          model:            res.model    || targetModel,
          provider:         res.provider || targetProvider,
          latency,
          latencyMs:        latency,
          inputTokens,
          promptTokens:     inputTokens,
          outputTokens,
          completionTokens: outputTokens,
          status:           'SUCCESS',
          ok:               true,
          text:             res.text,
          cached:           Boolean(res.cached),
          mode:             'in-process'
        };
      } catch (err) {
        const latency = Date.now() - startTime;
        // Classify error type
        const isAuthError = /forbidden|unauthorized|auth|permission|membership/i.test(err.message);
        const isOffline   = /ECONNREFUSED|timeout|ENOTFOUND|network/i.test(err.message);
        const statusCode  = isAuthError ? 'AUTH_ERROR' : isOffline ? 'OFFLINE' : 'FAILED';

        return this._errorResult(requestId, targetModel, targetProvider, startTime, err.message, statusCode);
      }
    }

    // ── PATH 2: HTTP (decoupled microservice mode only) ───────────────────────
    // This path requires a valid Bearer token; without one it will get 401/403.
    // The caller is responsible for providing options.token.
    if (!this.token) {
      return this._errorResult(
        requestId, targetModel, 'ai-gateway-http', startTime,
        'No in-process aiGateway and no HTTP Bearer token configured. ' +
        'Pass { aiGateway: app.aiGateway } or { app } to FenixIntelligenceClient.',
        'CONFIG_ERROR'
      );
    }

    try {
      const result = await this._callGatewayHttp({
        path: '/v1/chat/completions',
        body: {
          model: targetModel,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: fullPrompt }
          ],
          temperature,
          max_tokens: maxTokens
        }
      });

      const latency = Date.now() - startTime;
      const text = result.choices?.[0]?.message?.content || result.text || '';
      const outputTokens = estimateTokens(text);

      return {
        requestId,
        model:            result.model || targetModel,
        provider:         'ai-gateway-http',
        latency,
        latencyMs:        latency,
        inputTokens,
        promptTokens:     inputTokens,
        outputTokens,
        completionTokens: outputTokens,
        status:           'SUCCESS',
        ok:               true,
        text,
        mode:             'http'
      };
    } catch (httpErr) {
      const isAuthError = /401|403|unauthorized|forbidden/i.test(httpErr.message);
      const isOffline   = /ECONNREFUSED|timeout|ENOTFOUND/i.test(httpErr.message);
      const statusCode  = isAuthError ? 'AUTH_ERROR' : isOffline ? 'OFFLINE' : 'HTTP_ERROR';
      return this._errorResult(requestId, targetModel, 'ai-gateway-http', startTime, httpErr.message, statusCode);
    }
  }

  _errorResult(requestId, model, provider, startTime, errorMsg, status) {
    const latency = Date.now() - startTime;
    return {
      requestId,
      model,
      provider,
      latency,
      latencyMs:        latency,
      inputTokens:      0,
      promptTokens:     0,
      outputTokens:     0,
      completionTokens: 0,
      status,
      ok:               false,
      error:            String(errorMsg || 'Unknown error').slice(0, 500),
      text:             null,
      mode:             this._sourceMode
    };
  }

  _callGatewayHttp({ path, body }) {
    return new Promise((resolve, reject) => {
      const u = new URL(this.gatewayUrl + path);
      const payload = JSON.stringify(body);
      const req = http.request({
        hostname: u.hostname,
        port:     u.port || 4410,
        path:     u.pathname + u.search,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
        },
        timeout: this.timeoutMs
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(d)); } catch (e) { resolve({ text: d }); }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${d.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(this.timeoutMs, () => {
        req.destroy();
        reject(new Error(`AI Gateway request timed out after ${this.timeoutMs}ms`));
      });
      req.write(payload);
      req.end();
    });
  }

  /** complete — shorthand */
  async complete({ prompt, model = null, provider = null, temperature = 0.2, maxTokens = 1024 } = {}) {
    return this.invokeGateway({ taskType: 'default', prompt, model, provider, temperature, maxTokens });
  }

  /** chat — shorthand */
  async chat({ messages = [], model = null, provider = null, temperature = 0.2, maxTokens = 1024 } = {}) {
    return this.invokeGateway({ taskType: 'default', messages, model, provider, temperature, maxTokens });
  }

  /** coding — shorthand */
  async coding({ prompt, language = 'javascript', model = null, provider = null, temperature = 0.1, maxTokens = 2048 } = {}) {
    const system = `Você é o especialista em engenharia de software do Fênix OS em ${language}. Responda com rigor técnico, código executável e sem mocks.`;
    return this.invokeGateway({ taskType: 'generate', prompt, system, model, provider, temperature, maxTokens });
  }

  /** reasoning — shorthand */
  async reasoning({ prompt, model = null, provider = null, temperature = 0.1, maxTokens = 2048 } = {}) {
    const system = 'Você é o motor de raciocínio arquitetural do Fênix OS. Sintetize as evidências factuais da auditoria de sistemas.';
    return this.invokeGateway({ taskType: 'plan', prompt, system, model, provider, temperature, maxTokens });
  }

  /** vision — honest capability declaration */
  async vision({ image, prompt, model = null } = {}) {
    const requestId = `req-${uuid()}`;
    return {
      requestId,
      model:            model || 'vision-gateway',
      provider:         'ai-gateway',
      latency:          0,
      latencyMs:        0,
      inputTokens:      0,
      promptTokens:     0,
      outputTokens:     0,
      completionTokens: 0,
      status:           'UNSUPPORTED_IN_TEXT_GATEWAY',
      ok:               false,
      error:            'Vision capability requires active multimodal model projection on AI Gateway.',
      text:             null
    };
  }
}

module.exports = { FenixIntelligenceClient };
