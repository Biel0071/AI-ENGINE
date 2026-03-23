function normalizeAction(action) {
  const value = String(action || '').toLowerCase();

  if (value === 'reply' || value === 'handoff' || value === 'ignore') {
    return value;
  }

  return 'ignore';
}

let aiEngine = null;

function getAIEngine() {
  if (!aiEngine) {
    aiEngine = require('../../../../ai-engine');
  }

  return aiEngine;
}

async function handle({ sessionId, message, context } = {}) {
  const engine = getAIEngine();

  if (typeof engine?.handle !== 'function') {
    return {
      action: 'ignore',
      response: '',
      metadata: {
        source: 'default-ai-engine-adapter',
        reason: 'ai-engine-handle-unavailable',
      },
    };
  }

  const decision = await engine.handle({
    sessionId,
    message,
    context,
  });

  return {
    action: normalizeAction(decision?.action),
    response: String(decision?.response || ''),
    metadata: {
      ...(decision?.metadata || {}),
      source: decision?.metadata?.source || 'ai-engine-adapter',
    },
  };
}

module.exports = {
  handle,
  normalizeAction,
};
