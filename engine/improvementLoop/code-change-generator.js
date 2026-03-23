function createRefactorSnippet(improvement = {}) {
  return {
    type: 'refactor',
    title: 'Extract business logic from route handler',
    language: 'javascript',
    safe: true,
    priority: improvement.priority || 'low',
    impact: improvement.impact || 'medium',
    confidenceScore: typeof improvement.confidenceScore === 'number' ? improvement.confidenceScore : 0.72,
    snippet: "// Non-breaking refactor: keep endpoint signature unchanged\nfunction createAnalyzeHandler(service) {\n  return async function analyzeHandler(req, res) {\n    const input = service.normalize(req.body || {});\n    const result = await service.run(input);\n    return res.status(200).json(result);\n  };\n}",
  };
}

function createArchitectureSnippet(improvement = {}) {
  return {
    type: 'architecture-improvement',
    title: 'Introduce modular service boundary',
    language: 'javascript',
    safe: true,
    priority: improvement.priority || 'low',
    impact: improvement.impact || 'medium',
    confidenceScore: typeof improvement.confidenceScore === 'number' ? improvement.confidenceScore : 0.72,
    snippet: "class DevAnalyzeService {\n  constructor(deps) {\n    this.loop = deps.loopEngine;\n  }\n\n  normalize(payload = {}) {\n    return {\n      projectContext: String(payload.projectContext || ''),\n      files: Array.isArray(payload.files) ? payload.files : [],\n      currentGoal: String(payload.currentGoal || ''),\n    };\n  }\n\n  async run(input) {\n    return this.loop.run(input);\n  }\n}",
  };
}

function createUISnippet(improvement = {}) {
  return {
    type: 'ui-consistency-fix',
    title: 'Centralize design tokens',
    language: 'javascript',
    safe: true,
    priority: improvement.priority || 'low',
    impact: improvement.impact || 'medium',
    confidenceScore: typeof improvement.confidenceScore === 'number' ? improvement.confidenceScore : 0.72,
    snippet: "export const designTokens = {\n  color: {\n    primary: '#0f766e',\n    neutral900: '#111827',\n  },\n  spacing: {\n    xs: '0.25rem',\n    sm: '0.5rem',\n    md: '1rem',\n    lg: '1.5rem',\n  },\n  typography: {\n    body: { fontSize: '1rem', lineHeight: '1.5' },\n    title: { fontSize: '1.5rem', lineHeight: '1.25' },\n  },\n};",
  };
}

function findImprovement(improvements = [], type = '') {
  return improvements.find((item) => item.type === type) || {};
}

function generateCodeChanges(improvements = [], _analysis = {}, _microtasks = []) {
  const snippets = [];

  if (improvements.some((item) => item.type === 'safe-refactor' || item.type === 'analysis-quality-improvement')) {
    snippets.push(createRefactorSnippet(findImprovement(improvements, 'safe-refactor')));
  }

  if (improvements.some((item) => item.type === 'architecture-improvement')) {
    snippets.push(createArchitectureSnippet(findImprovement(improvements, 'architecture-improvement')));
  }

  if (improvements.some((item) => item.type === 'ui-consistency-fix')) {
    snippets.push(createUISnippet(findImprovement(improvements, 'ui-consistency-fix')));
  }

  if (snippets.length === 0) {
    snippets.push(createRefactorSnippet());
  }

  return snippets;
}

module.exports = {
  generateCodeChanges,
};
