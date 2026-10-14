'use strict';

const { measured, unknown } = require('../kernel/measurement');

// MISSION-1003 FASE 4 + RECONCILIACAO 2026-08-04 — AI ROUTER.
//
// Escolhe QUAL provider serve uma missao, por EVIDENCIA, nunca fixo. E uma camada fina:
// nao reimplementa roteamento (o AI Gateway ja tem rotas, fallback, breaker, cache); o
// Router adiciona a decisao que faltava -- selecao por saude medida + politica de custo.
//
// A politica (ajuste do dono): preferir LOCAL, depois GRATIS, depois PAGO. Dentro de cada
// tier, o mais saudavel/rapido por medicao. Nunca fixar um provider: se o preferido nao
// passa no selfTest, cai para o proximo tier. A decisao e registrada com a evidencia.
//
// REALITY FIRST: um provider so e candidato se o connector correspondente estiver CONNECTED
// (selfTest real passou). "Disponivel por configuracao" nao conta.
//
// RECONCILIACAO (medido em 2026-08-04): a leva "Unification Kernel" (08-03) SUBSTITUIU esta
// classe por outra `AIRouter(registry)` com `execute(capability,payload)` que (a) chamava
// `registry.getProvidersForCapability`/`getProviderInstance` -- metodos que NAO existem no
// ProviderRegistry atual -- e (b) devolvia a string literal `[Simulated response from ...]`
// para providers stream-only: sucesso fabricado, o anti-padrao que REALITY FIRST proibe e que
// o proprio detectFabricated do FENIX pegaria. Mas 10 arquivos do mission engine (estimator,
// intent-engine, mission-planner, quality-gate e 6 workers) ja chamam `execute(capability,
// {prompt})` e `isAvailable(capability)`. Em vez de escolher uma geracao e quebrar a outra,
// esta classe unifica as DUAS: a base select/route/invoke (real) para o endpoint e o gateway,
// e execute/isAvailable como adaptadores finos que roteiam pela MESMA decisao por evidencia,
// delegando a execucao ao Gateway -- sem simulacao, sem metodos fantasma.

// Tiers por custo. A ordem e a politica; a escolha dentro do tier e por evidencia.
const TIER = Object.freeze({
  local: ['ollama', 'local'],                 // roda na nossa infra, custo ~0
  free: ['groq', 'openrouter', 'aiplatform'], // gratuito/portfolio proprio
  paid: ['anthropic', 'openai', 'gemini'],    // API paga, so quando necessario
});
const TIER_ORDER = ['local', 'free', 'paid'];

class AIRouter {
  // connectors: ConnectorRuntime (para health real). gateway: AIGateway (para invoke real).
  // policy: ordem de tiers customizavel; default local->free->paid.
  constructor({ connectors, gateway = null, store = null, policy = TIER_ORDER } = {}) {
    if (!connectors) throw new Error('AIRouter requires a ConnectorRuntime');
    this.connectors = connectors;
    this.gateway = gateway;
    this.store = store;
    this.policy = Array.isArray(policy) && policy.length ? policy : TIER_ORDER;
  }

  // O provider de um connector id 'ai:<name>' -> '<name>'.
  #providerName(connectorId) { return connectorId.startsWith('ai:') ? connectorId.slice(3) : connectorId; }
  #tierOf(name) { return TIER_ORDER.find((tier) => TIER[tier].includes(name)) || 'paid'; }

  // Resolve o modelo do provider ESCOLHIDO -- o dele, nunca o da rota default (que e de outro
  // provider). Ordem: modelo pedido pelo chamador > modelo que o proprio connector declara >
  // null (o Gateway entao decide se tem candidato configurado para esse provider). Isto e o
  // conserto do bug que o code review da RC1 pegou: parear o provider escolhido com o modelo
  // errado anulava silenciosamente a decisao do Router.
  #modelFor(name, request = {}) {
    if (request.model) return request.model;
    const connector = this.connectors.connectors?.get(`ai:${name}`);
    if (connector && typeof connector.models === 'function') {
      const m = connector.models();
      const list = m && m.state === 'measured' ? m.value : (Array.isArray(m) ? m : null);
      if (Array.isArray(list) && list.length) return list[0];
    }
    return null;
  }

  // Seleciona um provider por evidencia. Percorre os tiers na ordem da politica; dentro do
  // tier, pega o primeiro connector de IA que esta CONNECTED (selfTest real). Devolve a
  // escolha COM a evidencia de por que -- ou unknown se nenhum provider esta saudavel.
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
        // Saude REAL: pergunta ao runtime, que roda authenticate+selfTest e deriva.
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

    // Nenhum provider passou no selfTest. Honesto: nao ha quem sirva agora.
    return {
      chosen: unknown('no AI provider is CONNECTED right now', 'check provider credentials/endpoints; every provider failed selfTest'),
      evidence: { policy: order, evaluated },
    };
  }

  // Roteia uma execucao: DECIDE o provider por evidencia -> DELEGA ao AI Gateway, que
  // EXECUTA (cache, circuit breaker, rate-limit, aiCalls, observabilidade). O Router e o
  // cerebro de decisao; o Gateway e o motor de execucao. NAO chama o provider direto --
  // fazer isso criaria um segundo runtime e perderia toda a telemetria que so o Gateway
  // registra. Se ninguem esta CONNECTED, devolve o unknown da selecao, nunca texto falso.
  async route(tenantId, actorId, request = {}) {
    const selection = await this.select(tenantId, actorId, { preferTier: request.preferTier });
    if (selection.chosen.state !== 'measured') return { ok: false, selection };

    const name = selection.chosen.value;
    if (!this.gateway || typeof this.gateway.invoke !== 'function') {
      return { ok: false, selection, error: 'AI gateway not wired: the router decides but the gateway executes' };
    }

    const started = Date.now();
    try {
      // A decisao do Router entra como override; o Gateway executa preservando toda a
      // maquinaria operacional (e ainda cai no fallback configurado se o escolhido falhar).
      const result = await this.gateway.invoke(tenantId, actorId, {
        taskType: request.taskType || 'default',
        prompt: request.prompt || '',
        temperature: request.temperature,
        provider: name,
        model: this.#modelFor(name, request),
      });
      const record = { provider: result.provider || name, chosen: name, tier: selection.chosen.tier, durationMs: Date.now() - started, cached: result.cached === true, ok: true };
      await this.#record(tenantId, record);
      return { ok: true, provider: record.provider, result, telemetry: measured(record, 'derived:AIRouter decision + Gateway execution') };
    } catch (error) {
      const record = { provider: name, chosen: name, tier: selection.chosen.tier, durationMs: Date.now() - started, ok: false, error: String(error.message || error) };
      await this.#record(tenantId, record);
      return { ok: false, provider: name, telemetry: measured(record, 'derived:AIRouter decision + Gateway execution') };
    }
  }

  // Compatibilidade com quem ja chama `aiGateway.invoke(tenantId, actorId, {taskType,prompt})`
  // -- o SoftwareFactory e outros consumidores do fluxo de missao. O Router entra como
  // drop-in: DECIDE o provider por evidencia e DELEGA ao Gateway com a mesma assinatura,
  // sem que o chamador mude uma linha. Se a selecao falhar (ninguem CONNECTED), cai para o
  // Gateway sem override -- a rota configurada ainda responde, em vez de a missao travar.
  async invoke(tenantId, actorId, request = {}) {
    if (!this.gateway || typeof this.gateway.invoke !== 'function') {
      throw new Error('AI gateway not wired: the router decides but the gateway executes');
    }
    const selection = await this.select(tenantId, actorId, { preferTier: request.preferTier });
    const chosen = selection.chosen.state === 'measured' ? selection.chosen.value : null;
    if (chosen) await this.#record(tenantId, { provider: chosen, chosen, tier: selection.chosen.tier, ok: true, delegated: true });
    return this.gateway.invoke(tenantId, actorId, {
      taskType: request.taskType || 'default',
      prompt: request.prompt,
      temperature: request.temperature,
      ...(chosen ? { provider: chosen, model: this.#modelFor(chosen, request) } : {}),
    });
  }

  // --- Adaptadores por CAPABILITY, para o mission engine (estimator/intent/planner/workers) ---
  //
  // Os 10 consumidores do mission engine falam em CAPABILITY ('backend', 'architecture',
  // 'classification', 'audit', ...), nao em taskType do Gateway. Estes dois metodos sao a
  // ponte: a capability vira o taskType do Gateway (que cai na rota configurada, ou na default
  // se nao houver rota especifica -- em producao a default aponta para a API Platform). Nenhuma
  // simulacao: se nao ha gateway ou candidato, isAvailable() e false e o worker segue seu
  // proprio caminho honesto (ele ja marca `simulatedLLM: true` sem inventar texto).

  // O worker chama isto ANTES de execute() para decidir se ha LLM real. So diz sim se ha um
  // Gateway com pelo menos um candidato para a rota daquela capability.
  isAvailable(capability) {
    if (!this.gateway || typeof this.gateway.invoke !== 'function') return false;
    if (typeof this.gateway.candidates !== 'function') return true;
    try {
      return this.gateway.candidates(this.#taskTypeFor(capability)).length > 0;
    } catch { return false; }
  }

  // Capability -> taskType do Gateway. Rotas conhecidas sao mapeadas; o resto cai em 'generate'
  // (texto livre), que por sua vez cai na rota default do Gateway se 'generate' nao existir.
  #taskTypeFor(capability) {
    if (capability === 'plan' || capability === 'architecture') return 'plan';
    if (capability === 'default') return 'default';
    return 'generate';
  }

  // Executa por capability e devolve o TEXTO (os workers usam `result.trim()`). Decide o
  // provider por evidencia (via invoke) e delega ao Gateway. Lanca se nao ha gateway/provider
  // -- o chamador ja trata isso no catch, caindo para a heuristica; nunca recebe texto falso.
  async execute(capability, payload = {}) {
    if (!this.gateway || typeof this.gateway.invoke !== 'function') {
      throw new Error(`[AIRouter] no AI gateway wired for capability: ${capability}`);
    }
    const tenantId = payload.tenantId || 'grg';
    const actorId = payload.actorId || 'grg-admin';
    const result = await this.invoke(tenantId, actorId, {
      taskType: this.#taskTypeFor(capability),
      prompt: payload.prompt || '',
      temperature: payload.temperature,
    });
    return result && typeof result.text === 'string' ? result.text : '';
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
