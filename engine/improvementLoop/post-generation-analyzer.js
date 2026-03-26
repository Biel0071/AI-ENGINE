function hasStateSignals(content = '') {
  const text = String(content || '');
  return {
    loading: /isLoading|loading|spinner|skeleton/i.test(text),
    error: /error|setError|alert\(|toast\(|catch\s*\(/i.test(text),
    success: /success|setSuccess|toast\.success/i.test(text),
  };
}

function analyzePostGeneration({ generatedFiles = [], analysis = {}, designSystem = {} } = {}) {
  const uiFiles = generatedFiles.filter((file) => /frontend\/.+\.(tsx|jsx|html)$/i.test(String(file.path || '')));
  const backendFiles = generatedFiles.filter((file) => /backend\/.+\.(ts|js)$/i.test(String(file.path || '')));

  const suggestions = [];

  for (const file of uiFiles) {
    const states = hasStateSignals(file.content || '');

    if (!states.loading) {
      suggestions.push({
        type: 'ui-state-upgrade',
        priority: 'high',
        impact: 'medium',
        title: 'Add loading state to generated screen',
        description: `Add loading state handling in ${file.path}.`,
        safe: true,
      });
    }

    if (!states.error) {
      suggestions.push({
        type: 'ux-feedback-upgrade',
        priority: 'high',
        impact: 'high',
        title: 'Add error feedback in generated screen',
        description: `Add visible error feedback in ${file.path}.`,
        safe: true,
      });
    }
  }

  if (backendFiles.length < 4) {
    suggestions.push({
      type: 'backend-completeness-upgrade',
      priority: 'high',
      impact: 'high',
      title: 'Expand backend modular files',
      description: 'Ensure controller/service/repository/events/queue are generated for each feature.',
      safe: true,
    });
  }

  if (Number((analysis.summary && analysis.summary.frontendFiles) || 0) > 0 && Number((designSystem.uiScore || 0)) < 80) {
    suggestions.push({
      type: 'design-score-recovery',
      priority: 'medium',
      impact: 'medium',
      title: 'Recover UI design score',
      description: 'Normalize visual tokens and component variants to improve consistency score.',
      safe: true,
    });
  }

  return {
    suggestions,
    summary: {
      uiFiles: uiFiles.length,
      backendFiles: backendFiles.length,
      suggestionCount: suggestions.length,
    },
  };
}

module.exports = {
  analyzePostGeneration,
};
