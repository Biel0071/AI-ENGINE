function detectProblems(analysis = {}, projectContext = {}, ingestion = {}) {
  const problems = [];
  const summary = analysis.summary || {};
  const designSystem = (analysis.designSystem && analysis.designSystem.designSystem) || {};

  if (!summary.totalFiles) {
    problems.push({
      code: 'NO_FILES',
      severity: 'high',
      message: 'No files were provided for deep analysis.',
      recommendation: 'Provide key frontend and backend files.',
    });
  }

  if (!summary.testFiles) {
    problems.push({
      code: 'LOW_TEST_COVERAGE_SIGNAL',
      severity: 'medium',
      message: 'No test files detected in the provided payload.',
      recommendation: 'Add tests for critical flows before applying refactors.',
    });
  }

  const colorKeys = Object.keys(designSystem.colors || {});
  if (colorKeys.length > 12) {
    problems.push({
      code: 'COLOR_FRAGMENTATION',
      severity: 'medium',
      message: 'High number of color tokens suggests inconsistent UI palette usage.',
      recommendation: 'Consolidate colors into semantic tokens and a single palette.',
    });
  }

  const spacingScale = designSystem.spacing && designSystem.spacing.tailwindScale;
  if (spacingScale && Object.keys(spacingScale).length > 10) {
    problems.push({
      code: 'SPACING_SCALE_DRIFT',
      severity: 'low',
      message: 'Spacing scale seems too broad for a coherent design system.',
      recommendation: 'Reduce spacing values to a core scale (e.g., 0,1,2,3,4,6,8,12).',
    });
  }

  if (!analysis.metadata || !analysis.metadata.currentGoal) {
    problems.push({
      code: 'MISSING_GOAL',
      severity: 'low',
      message: 'Current goal is not explicit, reducing suggestion quality.',
      recommendation: 'Send currentGoal with target scope and constraints.',
    });
  }

  if (String(projectContext.projectContext || '').length < 80) {
    problems.push({
      code: 'LOW_CONTEXT_SIGNAL',
      severity: 'low',
      message: 'Project context is short for architecture-level diagnostics.',
      recommendation: 'Provide architecture notes and critical module map.',
    });
  }

  for (const issue of ingestion.flowIssues || []) {
    problems.push({
      code: 'FLOW_ISSUE_SIGNAL',
      severity: issue.severity || 'medium',
      message: issue.message || 'Potential flow issue detected during screen ingestion.',
      recommendation: 'Review screen navigation and API integration boundaries.',
      screen: issue.screen || null,
    });
  }

  for (const issue of ingestion.missingComponents || []) {
    problems.push({
      code: 'MISSING_COMPONENT_SIGNAL',
      severity: issue.severity || 'medium',
      message: issue.message || 'Potential missing component detected during ingestion.',
      recommendation: 'Add or restore missing component implementation.',
      component: issue.component || null,
    });
  }

  for (const issue of ingestion.uiInconsistencies || []) {
    problems.push({
      code: 'UI_INCONSISTENCY_SIGNAL',
      severity: issue.severity || 'medium',
      message: issue.message || 'UI inconsistency detected during ingestion.',
      recommendation: 'Normalize UI styling patterns and centralize reusable tokens.',
    });
  }

  return problems;
}

module.exports = {
  detectProblems,
};
