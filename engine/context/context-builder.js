function pickTopContexts(contexts = [], limit = 8) {
  return (Array.isArray(contexts) ? contexts : [])
    .slice()
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
    .slice(0, limit);
}

function buildUXGuidelines(projectData = {}, codeIntelligence = {}, contexts = []) {
  const guidelines = [
    'Apply clear visual hierarchy with primary and secondary actions.',
    'Use loading, error and success feedback for each critical user action.',
    'Keep spacing and typography token-driven for consistent SaaS UX.',
  ];

  const mediumProblems = Number(codeIntelligence.summary && codeIntelligence.summary.mediumProblems || 0);
  if (mediumProblems > 0) {
    guidelines.push('Refactor high-coupling modules before adding major UI complexity.');
  }

  if ((projectData.frontend && projectData.frontend.usesTailwind) === false) {
    guidelines.push('Enforce consistent utility or component style strategy to reduce visual drift.');
  }

  if (contexts.length > 0) {
    guidelines.push('Adapt UX flows using retrieved domain examples from vector memory context.');
  }

  return guidelines;
}

function buildBusinessRules(contexts = [], routes = []) {
  const rules = [
    'Preserve backward-compatible route contracts.',
    'Validate request payloads before business operations.',
    'Emit domain events for critical state transitions.',
  ];

  if (Array.isArray(routes) && routes.length < 2) {
    rules.push('Expand API surface with list/detail/create/update routes for production readiness.');
  }

  if (contexts.some((item) => /billing|subscription|payment/i.test(String(item.content || '')))) {
    rules.push('Add idempotency and retry guardrails for billing and payment flows.');
  }

  return rules;
}

class ContextBuilder {
  constructor(options = {}) {
    this.options = options;
    this.knowledge = options.knowledge || null;
  }

  async retrieveExamples(query = '', limit = 8) {
    if (!this.knowledge || typeof this.knowledge.retrieveRelevantContext !== 'function') {
      return {
        ok: false,
        contexts: [],
        warning: 'Knowledge service unavailable in context builder.',
      };
    }

    return this.knowledge.retrieveRelevantContext({
      query,
      limit,
    });
  }

  async build(input = {}) {
    const projectData = input.projectData || {};
    const patterns = Array.isArray(input.patterns) ? input.patterns : [];
    const feature = String(input.feature || 'feature');
    const codeIntelligence = projectData.codeIntelligence || {
      summary: {
        totalProblems: 0,
        mediumProblems: 0,
      },
      problems: [],
    };

    const query = [
      feature,
      projectData.summary ? JSON.stringify(projectData.summary) : '',
      patterns.join(' '),
    ]
      .join(' ')
      .trim();

    const retrieved = input.knowledgeContext || (await this.retrieveExamples(query, Number(this.options.limit || 8)));
    const examples = pickTopContexts(retrieved.contexts || [], Number(this.options.limit || 8));

    return {
      project: {
        summary: projectData.summary || {},
        routes: Array.isArray(projectData.routes) ? projectData.routes : [],
        components: Array.isArray(projectData.components) ? projectData.components : [],
        dependencies: Array.isArray(projectData.dependencies) ? projectData.dependencies : [],
        codeIntelligence: {
          parser: codeIntelligence.parser || 'fallback-regex',
          filesAnalyzed: Number(codeIntelligence.filesAnalyzed || 0),
          totalProblems: Number(codeIntelligence.summary && codeIntelligence.summary.totalProblems || 0),
        },
      },
      patterns,
      examples,
      ux: {
        guidelines: buildUXGuidelines(projectData, codeIntelligence, examples),
      },
      business: {
        rules: buildBusinessRules(examples, projectData.routes || []),
      },
      metadata: {
        query,
        contextReady: true,
        retrievedCount: examples.length,
        sourceProvider: retrieved.provider || 'unknown',
        warning: retrieved.warning || null,
      },
    };
  }
}

module.exports = {
  ContextBuilder,
};
