// MEDIDO EM PRODUCAO (2026-08-04): o commit 57dd4bcf (leva "Unification Kernel") trocou, no
// app.js, `buildProvidersFromEnv(runtimeEnv)` por `options.providers || {}` e removeu estas
// funcoes deste arquivo -- deixando o AIGateway SEM providers e SEM rotas em producao. O
// /health reportava `ai-providers: {}` / ok=false com o gateway da API Platform de pe e gerando
// texto real, e o gate que antes falhava foi rebaixado para um console.warn "Gracefully
// degrading AI" (degradacao silenciosa, o anti-padrao que REALITY FIRST proibe). Estas duas
// funcoes sao restauradas VERBATIM de 41c72dde~1 (o ultimo commit antes da remocao) e religadas
// no app.js. A classe ProviderRegistry (telemetria) abaixo continua intacta -- as duas coisas
// coexistem: as funcoes constroem os providers a partir do env, a classe os observa.
const { EchoProvider } = require('./providers');
const { OpenAIResponsesProvider, OpenAICompatibleProvider, AnthropicProvider, GeminiProvider } = require('./http-providers');
const { AIPlatformProvider } = require('./aiplatform-provider');
const { OllamaProvider } = require('./ollama-provider');

function buildProvidersFromEnv(env = process.env, options = {}) {
  const providers = options.production ? {} : { echo: new EchoProvider() };
  const fetchImpl = options.fetchImpl;
  if (env.OPENAI_API_KEY) providers.openai = new OpenAIResponsesProvider({ apiKey: env.OPENAI_API_KEY, baseUrl: env.OPENAI_BASE_URL, fetchImpl });
  if (env.ANTHROPIC_API_KEY) providers.anthropic = new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, baseUrl: env.ANTHROPIC_BASE_URL, fetchImpl });
  if (env.GEMINI_API_KEY) providers.gemini = new GeminiProvider({ apiKey: env.GEMINI_API_KEY, baseUrl: env.GEMINI_BASE_URL, fetchImpl });
  if (env.GROQ_API_KEY) providers.groq = new OpenAICompatibleProvider({ name: 'groq', apiKey: env.GROQ_API_KEY, baseUrl: env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1', fetchImpl });
  if (env.FENIX_OPENAI_COMPATIBLE_URL) {
    providers.local = new OpenAICompatibleProvider({
      name: 'local', apiKey: env.FENIX_OPENAI_COMPATIBLE_KEY || 'local',
      baseUrl: env.FENIX_OPENAI_COMPATIBLE_URL, fetchImpl,
    });
  }
  if (env.GRG_AIPLATFORM_URL && env.GRG_AIPLATFORM_KEY) {
    providers.aiplatform = new AIPlatformProvider({
      baseUrl: env.GRG_AIPLATFORM_URL, apiKey: env.GRG_AIPLATFORM_KEY,
      model: env.GRG_AIPLATFORM_MODEL || null,
    });
  }
  // baseUrl explicito: o DEFAULT_BASE_URL do OllamaProvider e resolvido de process.env no
  // require do modulo, entao sem passar isto aqui um `env` injetado (teste, multi-tenant,
  // preflight) seria ignorado em silencio e o provider apontaria para outro endereco.
  if (env.FENIX_ENABLE_OLLAMA === '1') {
    providers.ollama = new OllamaProvider({
      model: env.GRG_LLM_MODEL || 'qwen2.5:3b',
      ...(env.FENIX_OLLAMA_URL || env.GRG_OLLAMA_DIRECT_URL
        ? { baseUrl: env.FENIX_OLLAMA_URL || env.GRG_OLLAMA_DIRECT_URL }
        : {}),
    });
  }
  return providers;
}

function loadRoutes(env = process.env, options = {}) {
  if (env.FENIX_AI_ROUTES_JSON) {
    const routes = JSON.parse(env.FENIX_AI_ROUTES_JSON);
    if (!routes.default) throw new Error('FENIX_AI_ROUTES_JSON requires a default route');
    if (options.production && Object.values(routes).some((route) => route.provider === 'echo' || (Array.isArray(route.fallback) ? route.fallback : []).some((item) => item.provider === 'echo'))) throw new Error('echo AI provider is forbidden in production');
    return routes;
  }
  if (options.production && (!env.FENIX_AI_DEFAULT_PROVIDER || env.FENIX_AI_DEFAULT_PROVIDER === 'echo')) throw new Error('production requires an explicit non-echo FENIX_AI_DEFAULT_PROVIDER');
  return {
    default: { provider: env.FENIX_AI_DEFAULT_PROVIDER || 'echo', model: env.FENIX_AI_DEFAULT_MODEL || 'echo-small' },
    plan: { provider: env.FENIX_AI_PLAN_PROVIDER || env.FENIX_AI_DEFAULT_PROVIDER || 'echo', model: env.FENIX_AI_PLAN_MODEL || 'echo-large' },
    generate: { provider: env.FENIX_AI_GENERATE_PROVIDER || env.FENIX_AI_DEFAULT_PROVIDER || 'echo', model: env.FENIX_AI_GENERATE_MODEL || 'echo-large' },
  };
}

class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  registerProvider(name, providerInstance, capabilities = [], options = {}) {
    const meta = {
      name,
      instance: providerInstance,
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      maxContext: options.maxContext || 8192,
      // Telemetry
      health: options.health !== undefined ? options.health : true,
      status: 'IDLE', // IDLE, BUSY, OFFLINE
      latency: 0,     // avg ms
      cost: 0,        // accumulated $
      requests: 0,
      errors: 0
    };
    
    this.providers.set(name, meta);
  }

  getProvider(name) {
    return this.providers.get(name)?.instance;
  }
  
  getProviderMeta(name) {
    return this.providers.get(name);
  }

  getProvidersByCapability(capability) {
    const matches = [];
    for (const [name, meta] of this.providers.entries()) {
      if (meta.capabilities.includes(capability) && meta.health) {
        matches.push(meta);
      }
    }
    // Simple load balancing / lowest latency priority
    return matches.sort((a, b) => a.latency - b.latency).map(m => m.instance);
  }

  getAllMetrics() {
    const metrics = {};
    for (const [name, meta] of this.providers.entries()) {
      metrics[name] = {
        capabilities: meta.capabilities,
        maxContext: meta.maxContext,
        health: meta.health,
        status: meta.status,
        avgLatencyMs: meta.latency,
        totalCostUSD: meta.cost,
        requestsServed: meta.requests,
        errorRate: meta.requests > 0 ? meta.errors / (meta.requests + meta.errors) : 0
      };
    }
    return metrics;
  }
  
  recordTelemetry(name, durationMs, costDelta, error = false) {
    const meta = this.providers.get(name);
    if (!meta) return;
    
    if (error) {
      meta.errors++;
    } else {
      meta.requests++;
      meta.cost += costDelta;
      // Rolling average latency
      meta.latency = (meta.latency * (meta.requests - 1) + durationMs) / meta.requests;
    }
  }
}

module.exports = { ProviderRegistry, buildProvidersFromEnv, loadRoutes };
