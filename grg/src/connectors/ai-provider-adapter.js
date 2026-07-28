'use strict';

const { measured, unknown } = require('../kernel/measurement');
const { CONNECTOR_STATES } = require('./connector-contract');

// MISSION-1003 FASE 3 — ADAPTADOR DE PROVIDER DE IA PARA O CONNECTOR RUNTIME.
//
// NÃO reimplementa nenhum provider. Veste um provider existente (aiplatform, ollama,
// anthropic, openai, gemini, groq, ...) com os 12 métodos do Connector Contract. Um único
// adaptador genérico serve para todos, porque eles JÁ compartilham a mesma interface:
// `name`, `models`, `complete({model,prompt})`, `chat({...})`, e alguns `available()`.
// Um adaptador por provider seria a duplicação que o Princípio 6 proíbe.
//
// A regra REALITY FIRST aqui: selfTest() chama o provider DE VERDADE (available() quando
// existe, senão um complete() mínimo). CONNECTED só quando essa chamada responde. Sem
// credencial/endpoint, o estado honesto é CONFIGURED, nunca CONNECTED.
class AIProviderAdapter {
  // provider: instância existente (ex.: AIPlatformProvider). store: para métricas.
  constructor({ provider, store = null } = {}) {
    if (!provider || !provider.name) throw new Error('AIProviderAdapter requires a provider with a name');
    if (typeof provider.complete !== 'function' && typeof provider.chat !== 'function') {
      throw new Error(`provider '${provider.name}' must implement complete() or chat()`);
    }
    this.provider = provider;
    this.store = store;
    this.id = `ai:${provider.name}`;
  }

  register() {
    return { id: this.id, kind: 'ai-provider', provider: this.provider.name, capabilities: this.capabilities() };
  }

  async connect() { return { id: this.id, transitioned: true }; }
  async disconnect() { return { id: this.id, transitioned: true }; }

  // Autenticação = o provider tem o que precisa para funcionar? Preferimos perguntar ao
  // próprio provider via available() quando ele expõe; senão, presença de credencial não é
  // observável aqui e devolvemos unknown honesto (o selfTest é quem prova).
  async authenticate() {
    if (typeof this.provider.available === 'function') {
      try {
        const ok = await this.provider.available();
        return { ok: ok === true, detail: measured(ok === true, `${this.provider.name}.available()`) };
      } catch (error) {
        return { ok: false, detail: unknown(`${this.provider.name}.available() threw`, String(error.message || error)) };
      }
    }
    // Sem available(): não dá para medir credencial sem chamar a API. O selfTest resolve.
    return { ok: true, detail: unknown('provider exposes no available(); authentication is proven by selfTest', 'run selfTest') };
  }

  async authorize(scope) {
    const caps = this.capabilities();
    return { ok: !scope || caps.includes(scope), scope: scope || null, capabilities: caps };
  }

  // PROVA DE VIDA. Prefere available() (barato, sem gastar token). Sem ele, faz um
  // complete() mínimo. Falha volta medida — nunca sucesso silencioso.
  async selfTest() {
    const started = Date.now();
    try {
      if (typeof this.provider.available === 'function') {
        const ok = await this.provider.available();
        return ok
          ? { ok: true, latencyMs: measured(Date.now() - started, 'derived:available()') }
          : { ok: false, reason: measured('provider.available() returned false', `${this.provider.name}.available()`), latencyMs: Date.now() - started };
      }
      // Ping mínimo: um complete curto. Custa pouco e prova que responde autenticado.
      const probe = typeof this.provider.complete === 'function'
        ? await this.provider.complete({ prompt: 'ping' })
        : await this.provider.chat({ messages: [{ role: 'user', content: 'ping' }] });
      return { ok: Boolean(probe && (probe.text !== undefined)), latencyMs: measured(Date.now() - started, 'derived:complete()') };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: String(error.message || error) };
    }
  }

  async health() {
    const test = await this.selfTest();
    return test.ok
      ? { ok: true, state: CONNECTOR_STATES.CONNECTED, detail: measured('selfTest passed', `${this.id}.selfTest()`) }
      : { ok: false, state: CONNECTOR_STATES.DEGRADED, detail: measured('selfTest failed', `${this.id}.selfTest()`, { error: test.error || null }) };
  }

  // Modelos que o provider declara. Vazio → unknown (não sabemos), nunca uma lista inventada.
  models() {
    const list = Array.isArray(this.provider.models) ? this.provider.models : [];
    return list.length ? measured(list, `${this.provider.name}.models`) : unknown('provider declares no model list', 'set the model via env or route config');
  }

  capabilities() {
    const caps = ['text'];
    if (typeof this.provider.chat === 'function') caps.push('chat');
    return caps;
  }

  // A execução real. Delega ao provider; não reimplementa. text|chat conforme a entrada.
  async invoke({ mode = 'text', model = null, prompt = null, messages = null, temperature } = {}) {
    if (mode === 'chat' && typeof this.provider.chat === 'function') {
      return this.provider.chat({ model, messages: messages || [], ...(temperature != null ? { temperature } : {}) });
    }
    if (typeof this.provider.complete === 'function') {
      return this.provider.complete({ model, prompt: prompt || '' });
    }
    throw new Error(`provider '${this.provider.name}' cannot serve mode '${mode}'`);
  }

  limits() {
    return { observed: unknown('provider does not expose live rate limits here', 'read provider response headers to observe limits') };
  }

  events() { return ['connector.selftest', 'connector.state.changed']; }

  async metrics(tenantId) {
    if (!this.store) return { calls: unknown('no store wired to read ai metrics') };
    const state = await this.store.read();
    const rows = (state.aiCalls || []).filter((item) => item.provider === this.provider.name && (!tenantId || item.tenantId === tenantId));
    if (!rows.length) return { calls: unknown(`no ai call recorded for ${this.provider.name} yet`) };
    const tokens = rows.reduce((sum, item) => sum + Number(item.totalTokens || 0), 0);
    return {
      calls: measured(rows.length, 'store:aiCalls'),
      tokens: measured(tokens, 'derived:aiCalls.totalTokens'),
      cached: measured(rows.filter((item) => item.cached).length, 'derived:aiCalls.cached'),
    };
  }

  version() { return { provider: this.provider.name }; }
}

module.exports = { AIProviderAdapter };
