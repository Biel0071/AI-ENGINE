'use strict';

const { measured, unknown } = require('../kernel/measurement');
const { uuid } = require('../kernel/ids');
const { estimateTokens } = require('./providers');

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
const CONNECTOR_STATUS_TIMEOUT_MS = 4_000;

const LANES = Object.freeze({
  fast: {
    name: 'fast',
    tiers: ['local', 'free'],
    tasks: ['classify', 'route', 'summarize', 'extract', 'format', 'validate', 'small_fix', 'simple_code', 'status', 'short_answer', 'classification'],
    preferredModels: ['qwen2.5:0.5b', 'qwen2.5:3b', 'echo-small'],
  },
  standard: {
    name: 'standard',
    tiers: ['local', 'free', 'paid'],
    tasks: ['code_generation', 'debug', 'analysis', 'refactor', 'planning', 'documentation', 'multi_file_change', 'generate', 'default'],
    preferredModels: ['qwen2.5:3b', 'qwen-2.5-7b', 'devstral-24b', 'echo-large'],
  },
  deep: {
    name: 'deep',
    tiers: ['paid', 'free', 'local'],
    tasks: ['architecture', 'complex_debug', 'large_refactor', 'long_context', 'research', 'multi_step_project', 'difficult_recovery', 'final_review', 'plan'],
    preferredModels: ['gemini-2.5-pro', 'gpt-4o', 'gpt-5.1-codex-max', 'deepseek-r1', 'qwen2.5:3b'],
  },
});

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
  async select(tenantId, actorId, { preferTier = null, tiers = null } = {}) {
    const aiConnectors = this.connectors.list().filter((id) => id.startsWith('ai:'));
    if (!aiConnectors.length) {
      return { chosen: unknown('no AI connector is registered', 'register providers via AIProviderAdapter') };
    }

    const tierPolicy = Array.isArray(tiers) && tiers.length ? tiers.filter((tier) => TIER[tier]) : this.policy;
    const order = preferTier ? [preferTier, ...tierPolicy.filter((t) => t !== preferTier)] : tierPolicy;
    const evaluated = [];

    const inspect = async (id, tier) => {
      let timer;
      try {
        const status = await Promise.race([
          this.connectors.status(tenantId, actorId, id),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`connector status timed out after ${CONNECTOR_STATUS_TIMEOUT_MS}ms`)), CONNECTOR_STATUS_TIMEOUT_MS); }),
        ]);
        return { id, tier, state: status.state?.value };
      } catch (error) {
        return { id, tier, state: 'DEGRADED', error: String(error.message || error).slice(0, 180) };
      } finally {
        clearTimeout(timer);
      }
    };

    // A requested lane (such as FAST) is latency-sensitive: inspect only its eligible
    // tiers in parallel, then select by policy order. General routing remains local-first
    // and stops before probing a more expensive tier once a healthy provider is found.
    if (Array.isArray(tiers) && tiers.length) {
      const candidates = order.flatMap((tier) => aiConnectors
        .filter((id) => this.#tierOf(this.#providerName(id)) === tier)
        .map((id) => ({ id, tier })));
      evaluated.push(...await Promise.all(candidates.map(({ id, tier }) => inspect(id, tier))));
      const selected = evaluated.find((item) => item.state === 'CONNECTED');
      if (selected) {
        return {
          chosen: measured(this.#providerName(selected.id), 'derived:AIRouter policy + connector selfTest', { connectorId: selected.id, tier: selected.tier }),
          evidence: { policy: order, evaluated },
        };
      }
    } else {
      for (const tier of order) {
        const inTier = aiConnectors.filter((id) => this.#tierOf(this.#providerName(id)) === tier);
        const results = await Promise.all(inTier.map((id) => inspect(id, tier)));
        evaluated.push(...results);
        const selected = results.find((item) => item.state === 'CONNECTED');
        if (selected) {
          return {
            chosen: measured(this.#providerName(selected.id), 'derived:AIRouter policy + connector selfTest', { connectorId: selected.id, tier }),
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
    const laneTiers = LANES[request.lane]?.tiers || null;
    const selection = await this.select(tenantId, actorId, { preferTier: request.preferTier, tiers: request.tiers || laneTiers });
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
  // ---- MULTI-LANE AI RUNTIME METHODS ----

  classifyTask(input = '') {
    let text = '';
    let hintType = null;
    let explicitLane = null;
    if (typeof input === 'string') {
      text = input;
    } else if (input && typeof input === 'object') {
      text = input.prompt || input.text || input.userRequest || input.query || '';
      hintType = input.taskType || input.type || null;
      explicitLane = input.lane || null;
    }
    const promptLower = String(text).toLowerCase();
    const tokenEstimate = estimateTokens(text);

    if (explicitLane && LANES[explicitLane]) {
      return {
        lane: explicitLane,
        taskType: hintType || explicitLane,
        estimatedTokens: tokenEstimate,
        estimatedComplexity: explicitLane === 'fast' ? 'LOW' : (explicitLane === 'deep' ? 'HIGH' : 'MEDIUM'),
        reason: `explicit lane: ${explicitLane}`
      };
    }

    const deepKeywords = ['architecture', 'arquitetura', 'refatorar arquitetura', 'complex debug', 'large refactor', 'system design', 'multi-step project', 'difficult recovery', 'long context', 'research'];
    const isDeep = deepKeywords.some((kw) => promptLower.includes(kw)) || tokenEstimate > 2000 || hintType === 'architecture' || hintType === 'deep';

    if (isDeep) {
      return {
        lane: 'deep',
        taskType: hintType || 'architecture',
        estimatedTokens: tokenEstimate,
        estimatedComplexity: 'HIGH',
        reason: tokenEstimate > 2000 ? 'high token volume' : 'deep complexity keyword matched'
      };
    }

    const fastKeywords = ['corrija esse typo', 'typo', 'classify', 'classifique', 'route', 'summarize', 'resuma', 'extract', 'extraia', 'format', 'formate', 'validate', 'valide', 'status', 'short answer', 'ping'];
    const isFast = fastKeywords.some((kw) => promptLower.includes(kw)) || (tokenEstimate < 80 && !promptLower.includes('função') && !promptLower.includes('function') && !promptLower.includes('código') && !promptLower.includes('code'));

    if (isFast) {
      return {
        lane: 'fast',
        taskType: hintType || 'classification',
        estimatedTokens: tokenEstimate,
        estimatedComplexity: 'LOW',
        reason: 'fast/low latency task keyword or short input'
      };
    }

    return {
      lane: 'standard',
      taskType: hintType || 'generate',
      estimatedTokens: tokenEstimate,
      estimatedComplexity: 'MEDIUM',
      reason: 'standard code/task generation'
    };
  }

  async selectLane(tenantId, actorId, { lane = 'standard', preferredModel = null } = {}) {
    const laneConfig = LANES[lane] || LANES.standard;
    let chosenSelection = null;

    for (const tier of laneConfig.tiers) {
      const selection = await this.select(tenantId, actorId, { preferTier: tier });
      if (selection.chosen && selection.chosen.state === 'measured') {
        chosenSelection = selection;
        break;
      }
    }

    if (!chosenSelection) {
      chosenSelection = await this.select(tenantId, actorId);
    }

    const providerName = chosenSelection.chosen?.value || null;
    const model = preferredModel || (providerName ? this.#modelFor(providerName, { model: laneConfig.preferredModels[0] }) : null);

    return {
      lane,
      provider: providerName,
      model,
      selection: chosenSelection,
      estimatedLatencyMs: lane === 'fast' ? 120 : (lane === 'standard' ? 450 : 1500),
      estimatedCostPer1k: lane === 'fast' ? 0 : (lane === 'standard' ? 0.0005 : 0.003)
    };
  }

  async cascade(tenantId, actorId, request = {}, validatorFn = null) {
    const lanes = ['fast', 'standard', 'deep'];
    const history = [];
    let lastError = null;

    for (const lane of lanes) {
      try {
        const laneConfig = LANES[lane];
        const selection = await this.select(tenantId, actorId, { preferTier: laneConfig.tiers[0] });
        const chosenProvider = selection.chosen.state === 'measured' ? selection.chosen.value : null;

        const result = await this.invoke(tenantId, actorId, {
          ...request,
          lane,
          taskType: request.taskType || (lane === 'fast' ? 'classification' : (lane === 'deep' ? 'plan' : 'generate')),
          preferTier: laneConfig.tiers[0],
          ...(chosenProvider ? { provider: chosenProvider } : {})
        });

        const validation = validatorFn ? await validatorFn(result.text, lane) : { valid: Boolean(result.text && String(result.text).trim().length > 0) };
        history.push({ lane, provider: result.provider || chosenProvider, model: result.model, ok: validation.valid !== false, error: validation.error || null });

        if (validation.valid !== false) {
          if (this.gateway?.bus) {
            await this.gateway.bus.emit('ai.cascade.success', { tenantId, lane, attempts: history });
          }
          return {
            ...result,
            lane,
            cascaded: history.length > 1,
            history,
            validation
          };
        } else {
          lastError = new Error(validation.error || `validation failed on lane ${lane}`);
          if (this.gateway?.bus) {
            await this.gateway.bus.emit('ai.cascade.escalate', { tenantId, from: lane, reason: lastError.message, history });
          }
        }
      } catch (err) {
        lastError = err;
        history.push({ lane, ok: false, error: err.message });
        if (this.gateway?.bus) {
          await this.gateway.bus.emit('ai.cascade.escalate', { tenantId, from: lane, reason: err.message, history });
        }
      }
    }

    throw new Error(`Cascade failed across all lanes (${lanes.join(' -> ')}). Last error: ${lastError?.message}`);
  }

  async handoff(tenantId, actorId, {
    jobId,
    parentJobId = null,
    agentId,
    model,
    input,
    output,
    status = 'COMPLETED',
    metadata = {}
  }) {
    const record = {
      handoffId: uuid(),
      jobId: jobId || uuid(),
      parentJobId: parentJobId || null,
      agentId: agentId || 'agent',
      model: model || 'default',
      input,
      output,
      status,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    if (this.gateway?.bus) {
      await this.gateway.bus.emit('agent.handoff', { tenantId, ...record });
    }

    if (this.store) {
      await this.store.update((state) => {
        state.agentHandoffs = state.agentHandoffs || [];
        state.agentHandoffs.push(record);
        return state;
      });
    }

    return record;
  }

  compilePrompt({ userRequest, context = {}, tools = [], lane = 'standard' }) {
    const compressed = this.compressContext(context);
    const normalizedGoal = String(userRequest || '').trim();
    const classification = this.classifyTask({ prompt: normalizedGoal, lane });

    return {
      userRequest: normalizedGoal,
      normalizedGoal,
      task: classification.taskType,
      lane: classification.lane,
      context: compressed,
      tools: Array.isArray(tools) ? tools : [],
      expectedOutput: 'Structured valid JSON operations or precise response',
      compiledPrompt: [
        `[TASK: ${classification.taskType.toUpperCase()}] [LANE: ${classification.lane.toUpperCase()}]`,
        `GOAL: ${normalizedGoal}`,
        compressed.summary ? `CONTEXT: ${compressed.summary}` : null,
        compressed.files?.length ? `FILES:\n${compressed.files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n')}` : null,
        tools?.length ? `AVAILABLE TOOLS: ${tools.join(', ')}` : null,
      ].filter(Boolean).join('\n\n')
    };
  }

  compressContext(rawContext = {}, { maxFiles = 5, maxCharsPerFile = 2000 } = {}) {
    if (!rawContext || typeof rawContext !== 'object') {
      return { summary: '', files: [], tokenEstimate: 0 };
    }
    const summary = rawContext.summary || rawContext.objective || '';
    const candidateFiles = rawContext.relevantFiles || rawContext.files || [];
    const files = [];

    for (const f of candidateFiles) {
      if (files.length >= maxFiles) break;
      if (typeof f === 'string') {
        files.push({ path: f, content: '' });
      } else if (f && typeof f === 'object' && f.path) {
        if (f.path.includes('node_modules') || f.path.endsWith('.png') || f.path.endsWith('.jpg') || f.path.endsWith('.zip')) {
          continue;
        }
        const content = String(f.content || '').slice(0, maxCharsPerFile);
        files.push({ path: f.path, content });
      }
    }

    const rawString = summary + files.map(f => f.content).join('');
    return {
      summary,
      files,
      tokenEstimate: estimateTokens(rawString)
    };
  }

  async stream(tenantId, actorId, request = {}) {
    if (!this.gateway || typeof this.gateway.stream !== 'function') {
      throw new Error('AI gateway not wired for stream');
    }
    const classification = this.classifyTask(request);
    const lane = request.lane || classification.lane;
    const laneConfig = LANES[lane] || LANES.standard;
    const selection = await this.select(tenantId, actorId, { preferTier: laneConfig.tiers[0] });
    const chosen = selection.chosen.state === 'measured' ? selection.chosen.value : null;

    return this.gateway.stream(tenantId, actorId, {
      ...request,
      lane,
      taskType: request.taskType || classification.taskType,
      ...(chosen ? { provider: chosen, model: this.#modelFor(chosen, request) } : {})
    });
  }

  async getTokenEconomyMetrics(tenantId = 'grg') {
    if (this.gateway && typeof this.gateway.tokenEconomyMetrics === 'function') {
      return this.gateway.tokenEconomyMetrics(tenantId);
    }
    return {
      costPerJob: 0,
      costPerMission: 0,
      tokensSaved: 0,
      fastLanePct: 0,
      standardPct: 100,
      deepPct: 0
    };
  }

  async getLanes(tenantId = 'grg', actorId = 'grg-admin') {
    const lanesStatus = {};
    for (const [key, config] of Object.entries(LANES)) {
      const selection = await this.select(tenantId, actorId, { preferTier: config.tiers[0] });
      const provider = selection.chosen?.state === 'measured' ? selection.chosen.value : null;
      lanesStatus[key] = {
        name: config.name,
        tiers: config.tiers,
        tasks: config.tasks,
        preferredModels: config.preferredModels,
        currentProvider: provider,
        currentModel: provider ? this.#modelFor(provider, { model: config.preferredModels[0] }) : null,
        available: Boolean(provider)
      };
    }
    return lanesStatus;
  }
}

module.exports = { AIRouter, TIER, TIER_ORDER, LANES };
