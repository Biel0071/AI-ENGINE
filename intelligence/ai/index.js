function disabledResponse(extra = {}) {
  return {
    enabled: false,
    skipped: true,
    provider: process.env.AI_PROVIDER || 'disabled',
    model: process.env.AI_MODEL || 'none',
    ...extra,
  };
}

async function analyzeWithAI() {
  return disabledResponse({
    insights: {
      summary: 'AI disabled or unavailable.',
      risks: [],
      opportunities: [],
      architectureHints: [],
    },
  });
}

async function generateUIWithAI() {
  return disabledResponse({
    uiGuidance: {
      layout: 'sidebar-header',
      theme: 'neutral-saas',
      components: [],
      uxNotes: [],
    },
  });
}

async function improveCodeWithAI() {
  return disabledResponse({
    review: {
      summary: 'AI disabled or unavailable.',
      improvements: [],
      risks: [],
    },
  });
}

module.exports = {
  analyzeWithAI,
  generateUIWithAI,
  improveCodeWithAI,
};
