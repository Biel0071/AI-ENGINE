const { createEngine } = require('../../../../../ai-engine');

let engineInstance = null;

function getEngineClient({ openaiClient, model } = {}) {
  if (engineInstance) {
    return engineInstance;
  }

  engineInstance = createEngine({
    openaiClient: openaiClient || null,
    model: model || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  });

  return engineInstance;
}

function resetEngineClient() {
  engineInstance = null;
}

module.exports = {
  getEngineClient,
  resetEngineClient,
};
