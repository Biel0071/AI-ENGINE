function normalizeLevel(value, fallback = 'low') {
  const normalized = String(value || fallback).toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return fallback;
}

function inferFilesAffected(improvement = {}, analysis = {}) {
  const fileMap = Array.isArray(analysis.fileMap) ? analysis.fileMap : [];

  if (improvement.type === 'ui-consistency-fix') {
    return fileMap.filter((item) => /\.(jsx|tsx|html|css|scss|sass|less|vue|svelte)$/i.test(item.path)).slice(0, 5).map((item) => item.path);
  }

  if (improvement.type === 'architecture-improvement') {
    return fileMap.filter((item) => /(server|api|controller|service|backend)/i.test(item.path)).slice(0, 5).map((item) => item.path);
  }

  return fileMap.slice(0, 3).map((item) => item.path);
}

function buildTaskFromImprovement(improvement = {}, index = 0, analysis = {}, ingestion = {}) {
  const priority = normalizeLevel(improvement.priority || improvement.severity, 'low');
  const impact = normalizeLevel(improvement.impact || (priority === 'high' ? 'high' : priority), 'medium');
  const confidenceScore = typeof improvement.confidenceScore === 'number' ? improvement.confidenceScore : 0.72;

  return {
    task: `task-${index + 1}-${String(improvement.code || improvement.type || 'improvement').toLowerCase()}`,
    description: String(improvement.description || improvement.title || 'Apply safe modular improvement.'),
    priority,
    impact,
    confidenceScore,
    filesAffected: inferFilesAffected(improvement, analysis),
    suggestedFix: String(improvement.title || 'Apply incremental refactor keeping API compatibility.'),
    basedOn: {
      screenSignals: Array.isArray(ingestion.screens) ? ingestion.screens.length : 0,
      flowIssues: Array.isArray(ingestion.flowIssues) ? ingestion.flowIssues.length : 0,
    },
  };
}

function generateMicrotasks(improvements = [], analysis = {}, ingestion = {}) {
  return improvements.slice(0, 30).map((improvement, index) => buildTaskFromImprovement(improvement, index, analysis, ingestion));
}

module.exports = {
  generateMicrotasks,
};
