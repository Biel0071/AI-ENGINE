function toImprovement(problem = {}) {
  const severityWeight = {
    high: 0.91,
    medium: 0.82,
    low: 0.72,
  };

  const base = {
    code: problem.code,
    priority: problem.severity || 'low',
    impact: problem.severity === 'high' ? 'high' : problem.severity === 'medium' ? 'medium' : 'low',
    confidenceScore: severityWeight[String(problem.severity || 'low').toLowerCase()] || 0.7,
    safe: true,
    mode: 'suggestion-only',
  };

  if (problem.code === 'COLOR_FRAGMENTATION') {
    return {
      ...base,
      type: 'ui-consistency-fix',
      title: 'Consolidate UI palette with semantic color tokens',
      description: 'Create a canonical color map and replace fragmented hardcoded color usage.',
    };
  }

  if (problem.code === 'SPACING_SCALE_DRIFT') {
    return {
      ...base,
      type: 'ui-consistency-fix',
      title: 'Standardize spacing scale',
      description: 'Restrict spacing utility classes to a compact and reusable scale.',
    };
  }

  if (problem.code === 'LOW_TEST_COVERAGE_SIGNAL') {
    return {
      ...base,
      type: 'architecture-improvement',
      title: 'Protect refactor path with targeted tests',
      description: 'Introduce focused tests for the most risky modules before code transformations.',
    };
  }

  if (problem.code === 'NO_FILES') {
    return {
      ...base,
      type: 'analysis-quality-improvement',
      title: 'Increase analysis input completeness',
      description: 'Provide representative source files for precise refactor and UI guidance.',
    };
  }

  return {
    ...base,
    type: 'safe-refactor',
    title: 'Apply incremental modular refactor',
    description: 'Split large modules into isolated services while preserving public API contract.',
  };
}

function suggestImprovements(problems = [], analysis = {}, context = {}) {
  const improvements = problems.map(toImprovement);

  if ((analysis.summary && analysis.summary.frontendFiles > 0) && improvements.every((item) => item.type !== 'ui-consistency-fix')) {
    improvements.push({
      code: 'UI_NORMALIZATION_OPPORTUNITY',
      priority: 'low',
      impact: 'medium',
      confidenceScore: 0.76,
      safe: true,
      mode: 'suggestion-only',
      type: 'ui-consistency-fix',
      title: 'Adopt extracted design system tokens',
      description: 'Use generated color, spacing and typography tokens in reusable UI components.',
    });
  }

  if ((analysis.summary && analysis.summary.backendFiles > 0) && improvements.every((item) => item.type !== 'architecture-improvement')) {
    improvements.push({
      code: 'BACKEND_MODULARITY_OPPORTUNITY',
      priority: 'low',
      impact: 'medium',
      confidenceScore: 0.74,
      safe: true,
      mode: 'suggestion-only',
      type: 'architecture-improvement',
      title: 'Encapsulate endpoint logic into service modules',
      description: 'Move request parsing and domain logic to small reusable services.',
    });
  }

  const memoryBestPractices = (context.memorySnapshot && context.memorySnapshot.bestPractices) || [];
  if (memoryBestPractices.length > 0) {
    const practice = memoryBestPractices[memoryBestPractices.length - 1];
    improvements.push({
      code: 'MEMORY_REUSED_PATTERN',
      priority: 'low',
      impact: 'low',
      confidenceScore: 0.68,
      safe: true,
      mode: 'suggestion-only',
      type: 'safe-refactor',
      title: 'Reuse previously successful guardrails',
      description: String((practice.practice && practice.practice.title) || 'Apply previously successful best practices.'),
      reusedFromMemory: true,
    });
  }

  if (context.freezeMode === true) {
    for (const item of improvements) {
      item.mode = 'freeze-suggest-only';
      item.safe = true;
      item.confidenceScore = Math.max(0, Math.min(1, Number(item.confidenceScore || 0.7)));
    }
  }

  return improvements;
}

function buildRefactorPlan(improvements = []) {
  const ordered = [...improvements].sort((left, right) => {
    const weight = { high: 0, medium: 1, low: 2 };
    return (weight[left.priority] ?? 3) - (weight[right.priority] ?? 3);
  });

  return ordered.map((item, index) => ({
    step: index + 1,
    title: item.title,
    objective: item.description,
    guardrails: [
      'Do not remove existing public functions/endpoints.',
      'Keep backward compatibility with current payloads.',
      'Implement changes behind small, isolated modules.',
    ],
    safeType: item.type,
  }));
}

module.exports = {
  suggestImprovements,
  buildRefactorPlan,
};
