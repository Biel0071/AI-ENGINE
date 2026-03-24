class PlannerAgent {
  run(input = {}) {
    const feature = String(input.feature || 'feature');
    const patterns = Array.isArray(input.patterns) ? input.patterns : [];
    const knowledgeContext = input.knowledgeContext && Array.isArray(input.knowledgeContext.contexts)
      ? input.knowledgeContext.contexts
      : [];
    const contextBundle = input.contextBundle && typeof input.contextBundle === 'object' ? input.contextBundle : null;
    const decision = input.decision && typeof input.decision === 'object' ? input.decision : null;

    const steps = [
      {
        order: 1,
        type: 'analysis',
        title: `Analyze ${feature} scope and dependencies`,
        details: 'Map frontend, backend and shared module boundaries.',
      },
      {
        order: 2,
        type: 'ui',
        title: 'Generate premium UI with token-driven components',
        details: 'Use design system tokens and prevent random styles.',
      },
      {
        order: 3,
        type: 'backend',
        title: 'Generate modular backend with services/events/queues',
        details: 'Enforce controller-service-repository with event and queue scaffolding.',
      },
      {
        order: 4,
        type: 'quality',
        title: 'Apply auto UI refactor and validate consistency',
        details: 'Correct spacing, visual hierarchy and contrast to premium standards.',
      },
    ];

    if (knowledgeContext.length > 0) {
      steps.unshift({
        order: 0,
        type: 'knowledge',
        title: 'Inject retrieved document context',
        details: `Use ${knowledgeContext.length} retrieved context chunks as generation baseline.`,
      });
    }

    if (contextBundle && contextBundle.metadata && contextBundle.metadata.contextReady) {
      steps.unshift({
        order: 0,
        type: 'context',
        title: 'Build contextual generation baseline',
        details: `Context bundle assembled with ${Number(contextBundle.metadata.retrievedCount || 0)} relevant examples.`,
      });
    }

    if (decision && Array.isArray(decision.autoFeatures) && decision.autoFeatures.length > 0) {
      steps.push({
        order: steps.length + 1,
        type: 'expansion',
        title: 'Expand feature set with product-level modules',
        details: `Auto expansion enabled for ${decision.autoFeatures.length} suggested product capabilities.`,
      });
    }

    return {
      feature,
      patterns,
      steps,
      contextUsed: knowledgeContext.length,
      contextReady: Boolean(contextBundle && contextBundle.metadata && contextBundle.metadata.contextReady),
      autoFeatures: decision && Array.isArray(decision.autoFeatures) ? decision.autoFeatures : [],
    };
  }
}

module.exports = {
  PlannerAgent,
};
