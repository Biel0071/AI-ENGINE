'use strict';

const { measured, unknown } = require('../kernel/measurement');

// MISSION-1003 FASE 4 — AI ROUTER.
//
// Escolhe QUAL provider serve uma missão, por EVIDÊNCIA, nunca fixo. É uma camada fina:
// não reimplementa roteamento (o AI Gateway já tem rotas, fallback, breaker, cache); o
// Router adiciona a decisão que faltava — seleção por saúde medida + política de custo.
//
// A política (ajuste do dono): preferir LOCAL, depois GRÁTIS, depois PAGO. Dentro de cada
// tier, o mais saudável/rápido por medição. Nunca fixar um provider: se o preferido não
// passa no selfTest, cai para o próximo tier. A decisão é registrada com a evidência.
//
// REALITY FIRST: um provider só é candidato se o connector correspondente estiver CONNECTED
// (selfTest real passou). "Disponível por configuração" não conta.

// Tiers por custo. A ordem é a política; a escolha dentro do tier é por evidência.
const TIER = Object.freeze({
  local: ['ollama', 'local'],                 // roda na nossa infra, custo ~0
  free: ['groq', 'openrouter', 'aiplatform'], // gratuito/portfólio próprio
  paid: ['anthropic', 'openai', 'gemini'],    // API paga, só quando necessário
});
const TIER_ORDER = ['local', 'free', 'paid'];

class AIRouter {
  // connectors: ConnectorRuntime (para health real). gateway: AIGateway (para invoke real).
  // policy: ordem de tiers customizável; default local→free→paid.
  constructor({ connectors, gateway = null, store = null, policy = TIER_ORDER } = {}) {
    if (!connectors) throw new Error('AIRouter requires a ConnectorRuntime');
    this.connectors = connectors;
    this.gateway = gateway;
    this.store = store;
    this.policy = Array.isArray(policy) && policy.length ? policy : TIER_ORDER;
  }

  // O provider de um connector id 'ai:<name>' → '<name>'.
  #providerName(connectorId) { return connectorId.startsWith('ai:') ? connectorId.slice(3) : connectorId; }
  #tierOf(name) { return TIER_ORDER.find((tier) => TIER[tier].includes(name)) || 'paid'; }

  // Seleciona um provider por evidência. Percorre os tiers na ordem da política; dentro do
  // tier, pega o primeiro connector de IA que está CONNECTED (selfTest real). Devolve a
  // escolha COM a evidência de por que — ou unknown se nenhum provider está saudável.
  async select(tenantId, actorId, { preferTier = null } = {}) {
    const aiConnectors = this.connectors.list().filter((id) => id.startsWith('ai:'));
    if (!aiConnectors.length) {
      return { chosen: unknown('no AI connector is registered', 'register providers via AIProviderAdapter') };
    }

    const order = preferTier ? [preferTier, ...this.policy.filter((t) => t !== preferTier)] : this.policy;
    const evaluated = [];

    for (const tier of order) {
      const inTier = aiConnectors.filter((id) => this.#tierOf(this.#providerName(id)) === tier);
      for (const id of inTier) {
        // Saúde REAL: pergunta ao runtime, que roda authenticate+selfTest e deriva.
        const status = await this.connectors.status(tenantId, actorId, id);
        const state = status.state?.value;
        evaluated.push({ id, tier, state });
        if (state === 'CONNECTED') {
          return {
            chosen: measured(this.#providerName(id), 'derived:AIRouter policy + connector selfTest', { connectorId: id, tier }),
            evidence: { policy: order, evaluated },
          };
        }
      }
    }

    // Nenhum provider passou no selfTest. Honesto: não há quem sirva agora.
    return {
      chosen: unknown('no AI provider is CONNECTED right now', 'check provider credentials/endpoints; every provider failed selfTest'),
      evidence: { policy: order, evaluated },
    };
  }

  // Roteia uma execução: seleciona → invoca via connector → registra. Nunca inventa
  // resultado: se ninguém está CONNECTED, devolve o unknown da seleção, não um texto falso.
  async route(tenantId, actorId, request = {}) {
    const selection = await this.select(tenantId, actorId, { preferTier: request.preferTier });
    if (selection.chosen.state !== 'measured') return { ok: false, selection };

    const name = selection.chosen.value;
    const connectorId = `ai:${name}`;
    const connector = this.connectors.connectors.get(connectorId);
    const started = Date.now();
    try {
      const result = await connector.invoke({
        mode: request.mode || 'text', model: request.model || null,
        prompt: request.prompt || null, messages: request.messages || null, temperature: request.temperature,
      });
      const record = { provider: name, tier: selection.chosen.tier, durationMs: Date.now() - started, ok: true };
      await this.#record(tenantId, record);
      return { ok: true, provider: name, result, telemetry: measured(record, 'derived:AIRouter execution') };
    } catch (error) {
      const record = { provider: name, tier: selection.chosen.tier, durationMs: Date.now() - started, ok: false, error: String(error.message || error) };
      await this.#record(tenantId, record);
      // Falhou o escolhido: reporta medido. O fallback entre tiers é da select() na próxima
      // chamada; aqui não mascaramos a falha como sucesso de outro provider.
      return { ok: false, provider: name, telemetry: measured(record, 'derived:AIRouter execution') };
    }
  }

  async #record(tenantId, record) {
    if (!this.store) return;
    await this.store.update((state) => {
      state.aiRouterDecisions = state.aiRouterDecisions || [];
      state.aiRouterDecisions.push({ tenantId: tenantId || null, ...record, at: new Date().toISOString() });
      return state;
    });
  }
}

module.exports = { AIRouter, TIER, TIER_ORDER };
