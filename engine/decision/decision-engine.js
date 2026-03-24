function buildProblemSignals(project = {}) {
  const signals = [];

  if (Number(project.codeIntelligence && project.codeIntelligence.totalProblems || 0) > 0) {
    signals.push({
      type: 'code-quality-risk',
      severity: 'medium',
      message: 'Code intelligence detected structural problems that may affect maintainability.',
    });
  }

  if (Array.isArray(project.routes) && project.routes.length < 2) {
    signals.push({
      type: 'api-coverage-gap',
      severity: 'medium',
      message: 'Low backend route coverage detected for a production target.',
    });
  }

  if (Array.isArray(project.components) && project.components.length < 2) {
    signals.push({
      type: 'ui-coverage-gap',
      severity: 'medium',
      message: 'Low component count indicates missing interface surface for complete product UX.',
    });
  }

  return signals;
}

function buildAutoFeatures(feature = '', contextBundle = {}) {
  const base = [
    {
      id: 'analytics-dashboard',
      title: 'Analytics Dashboard',
      category: 'insights',
      rationale: 'SaaS products require KPI visibility for decision making.',
      suggestedScreens: ['dashboard', 'overview'],
    },
    {
      id: 'automation-rules',
      title: 'Automation Rules',
      category: 'operations',
      rationale: 'Workflow automation reduces manual operation overhead.',
      suggestedScreens: ['automations', 'rule-builder'],
    },
    {
      id: 'settings-governance',
      title: 'Settings and Governance',
      category: 'admin',
      rationale: 'Operational governance and configuration are expected in mature products.',
      suggestedScreens: ['settings', 'permissions'],
    },
  ];

  const businessRules = contextBundle.business && Array.isArray(contextBundle.business.rules)
    ? contextBundle.business.rules
    : [];

  if (businessRules.some((rule) => /billing|payment|subscription/i.test(rule))) {
    base.push({
      id: 'billing-center',
      title: 'Billing Center',
      category: 'revenue',
      rationale: 'Business context suggests monetization and billing workflows.',
      suggestedScreens: ['billing', 'invoices'],
    });
  }

  return base.map((item) => ({
    ...item,
    targetFeature: feature,
  }));
}

class DecisionEngine {
  decide(input = {}) {
    const contextBundle = input.contextBundle || {};
    const feature = String(input.feature || 'feature');
    const knownSolutions = Array.isArray(input.knownSolutions) ? input.knownSolutions : [];
    const project = contextBundle.project || {};
    const problems = buildProblemSignals(project);
    const autoFeatures = buildAutoFeatures(feature, contextBundle);

    const reusedSolutions = knownSolutions.filter((item) => item && item.solutionApplied);

    const reusedImprovements = reusedSolutions.map((item) => ({
      type: 'reused-proven-solution',
      priority: 'high',
      title: `Reuse proven solution: ${item.solutionPattern || item.problemType}`,
      description: item.solutionApplied,
      context: item.context || {},
    }));

    const improvements = [
      ...reusedImprovements,
      {
        type: 'ux-standardization',
        priority: 'high',
        title: 'Apply SaaS UX baseline',
        description: 'Guarantee consistent hierarchy, states and feedback in each generated screen.',
      },
      {
        type: 'backend-hardening',
        priority: 'high',
        title: 'Strengthen backend module boundaries',
        description: 'Enforce service/events/queue boundaries and contract-safe handlers.',
      },
    ];

    return {
      readyToGenerate: contextBundle.metadata && contextBundle.metadata.contextReady === true,
      contextReadiness: contextBundle.metadata || {
        contextReady: false,
      },
      problems,
      improvements,
      reusedSolutions,
      autoFeatures,
      strategy: {
        preGenerationDecision: 'context-first',
        generationMode: input.freezeMode ? 'stable-freeze' : 'adaptive-product',
        shouldExpandFeatures: autoFeatures.length > 0,
        prioritizeProvenSolutions: reusedSolutions.length > 0,
      },
    };
  }
}

module.exports = {
  DecisionEngine,
};
