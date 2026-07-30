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

module.exports = { buildProvidersFromEnv, loadRoutes };
