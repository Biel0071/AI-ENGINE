function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getAIConfig(overrides = {}) {
  const provider =
    overrides.provider ||
    process.env.AI_PROVIDER ||
    process.env.OPENAI_PROVIDER ||
    'openai-compatible';

  const apiKey = overrides.apiKey || process.env.AI_API_KEY || '';
  const baseURL =
    overrides.baseURL ||
    process.env.AI_API_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1';

  const model =
    overrides.model ||
    process.env.AI_MODEL ||
    process.env.OPENAI_MODEL ||
    'gpt-4o-mini';

  const timeoutMs = toNumber(
    overrides.timeoutMs || process.env.AI_TIMEOUT_MS,
    20000,
  );

  return {
    provider,
    apiKey,
    baseURL,
    model,
    timeoutMs,
    enabled: Boolean(apiKey),
  };
}

module.exports = {
  getAIConfig,
};
