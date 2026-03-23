const { AIProvider } = require('./aiProvider');
const { AIMemoryBridge } = require('./aiMemoryBridge');

function extractJsonCandidate(text = '') {
  const value = String(text || '').trim();
  if (!value) {
    return null;
  }

  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }

  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return value.slice(start, end + 1);
  }

  return null;
}

function safeJsonParse(text = '', fallback = null) {
  const candidate = extractJsonCandidate(text);
  if (!candidate) {
    return fallback;
  }

  try {
    return JSON.parse(candidate);
  } catch {
    return fallback;
  }
}

function createAIContext(options = {}) {
  const provider = options.aiProvider || new AIProvider(options.aiConfig);
  const memoryBridge =
    options.aiMemoryBridge ||
    new AIMemoryBridge({ memoryManager: options.memoryManager });

  return { provider, memoryBridge };
}

async function analyzeWithAI(context = {}, options = {}) {
  const { provider, memoryBridge } = createAIContext(options);
  const prompt = [
    'Analyze this project context and return JSON only.',
    'JSON schema: { "summary": string, "risks": string[], "opportunities": string[], "architectureHints": string[] }',
    '',
    JSON.stringify(context, null, 2),
  ].join('\n');

  const response = await provider.prompt(prompt, {
    systemPrompt:
      'You are a senior software architect. Return practical insights in strict JSON.',
    temperature: 0.1,
  });

  const parsed = safeJsonParse(response.text, {
    summary: response.skipped ? 'AI disabled: no API key configured.' : 'No structured AI response available.',
    risks: [],
    opportunities: [],
    architectureHints: [],
  });

  await memoryBridge.saveLearning({
    type: 'analyze',
    inputSummary: JSON.stringify(context).slice(0, 1200),
    outputSummary: JSON.stringify(parsed).slice(0, 3000),
    metadata: {
      provider: response.provider,
      model: response.model,
      skipped: response.skipped,
    },
  });

  return {
    ...response,
    insights: parsed,
  };
}

async function generateUIWithAI(spec = {}, options = {}) {
  const { provider, memoryBridge } = createAIContext(options);
  const prompt = [
    'Generate UI guidance for a SaaS feature and return JSON only.',
    'JSON schema: { "layout": string, "theme": string, "components": string[], "uxNotes": string[] }',
    '',
    JSON.stringify(spec, null, 2),
  ].join('\n');

  const response = await provider.prompt(prompt, {
    systemPrompt:
      'You are a senior frontend product designer focused on SaaS quality. Return strict JSON.',
    temperature: 0.3,
  });

  const parsed = safeJsonParse(response.text, {
    layout: 'sidebar-header',
    theme: 'neutral-saas',
    components: [],
    uxNotes: [],
  });

  await memoryBridge.saveLearning({
    type: 'ui-generation',
    inputSummary: JSON.stringify(spec).slice(0, 1200),
    outputSummary: JSON.stringify(parsed).slice(0, 3000),
    metadata: {
      provider: response.provider,
      model: response.model,
      skipped: response.skipped,
    },
  });

  return {
    ...response,
    uiGuidance: parsed,
  };
}

async function improveCodeWithAI(code = '', options = {}) {
  const { provider, memoryBridge } = createAIContext(options);
  const prompt = [
    'Review and improve this code context and return JSON only.',
    'JSON schema: { "summary": string, "improvements": string[], "risks": string[] }',
    '',
    String(code || ''),
  ].join('\n');

  const response = await provider.prompt(prompt, {
    systemPrompt:
      'You are a principal engineer. Provide concise, actionable recommendations in strict JSON.',
    temperature: 0.1,
  });

  const parsed = safeJsonParse(response.text, {
    summary: response.skipped ? 'AI disabled: no API key configured.' : 'No structured AI response available.',
    improvements: [],
    risks: [],
  });

  await memoryBridge.saveLearning({
    type: 'code-improvement',
    inputSummary: String(code || '').slice(0, 1200),
    outputSummary: JSON.stringify(parsed).slice(0, 3000),
    metadata: {
      provider: response.provider,
      model: response.model,
      skipped: response.skipped,
    },
  });

  return {
    ...response,
    review: parsed,
  };
}

module.exports = {
  analyzeWithAI,
  generateUIWithAI,
  improveCodeWithAI,
  AIProvider,
  AIMemoryBridge,
};
