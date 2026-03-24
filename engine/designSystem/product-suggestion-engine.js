function suggestFeatureIdeas(feature = '', contexts = []) {
  const ideas = [
    {
      type: 'product-feature',
      priority: 'medium',
      title: 'Add usage analytics panel',
      description: `Create KPI dashboard for ${feature} usage, conversion and retention metrics.`,
    },
    {
      type: 'product-feature',
      priority: 'high',
      title: 'Add workflow automation rules',
      description: `Enable trigger-based automations to scale ${feature} operations.`,
    },
  ];

  if (Array.isArray(contexts) && contexts.length > 0) {
    ideas.push({
      type: 'knowledge-driven-feature',
      priority: 'high',
      title: 'Build feature from ingested knowledge',
      description: `Leverage ${contexts.length} retrieved knowledge chunks as product requirement baseline.`,
    });
  }

  return ideas;
}

function suggestProductEnhancements({ feature = '', generated = {}, memorySnapshot = null, knowledgeContext = null } = {}) {
  const contexts = knowledgeContext && Array.isArray(knowledgeContext.contexts) ? knowledgeContext.contexts : [];
  const summary = generated && generated.summary ? generated.summary : {};

  const suggestions = suggestFeatureIdeas(feature, contexts);

  if (Number(summary.frontendFiles || 0) < 2) {
    suggestions.push({
      type: 'ux-expansion',
      priority: 'high',
      title: 'Expand frontend surface',
      description: 'Generate dashboard + detail + settings screens for a fuller SaaS flow.',
    });
  }

  if (Number(summary.backendFiles || 0) < 5) {
    suggestions.push({
      type: 'backend-expansion',
      priority: 'high',
      title: 'Expand backend module completeness',
      description: 'Add event handlers, queue processors and integration endpoints.',
    });
  }

  if (memorySnapshot && Array.isArray(memorySnapshot.patterns) && memorySnapshot.patterns.length > 0) {
    suggestions.push({
      type: 'memory-reuse',
      priority: 'medium',
      title: 'Reuse successful architecture patterns',
      description: 'Promote previously successful structure patterns into the generated module.',
    });
  }

  return suggestions;
}

module.exports = {
  suggestProductEnhancements,
};
