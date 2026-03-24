const { organizeProject, suggestStructureImprovements } = require('./core/structureOrganizer');
const { runImprovementLoop, ImprovementLoopEngine } = require('./engine/improvementLoop');
const { generateDesignSystem, DesignSystemEngine, getDesignSystem, applyDesignSystem, upgradeUI } = require('./engine/designSystem');
const { ingestProject } = require('./engine/ingestion');
const { generateMicrotasks } = require('./engine/microtasks');
const { generateTests } = require('./engine/testing');

async function analyzeProject(projectPath, options = {}) {
  const { ProjectAnalyzer } = require('./engine/analyzer/projectAnalyzer');
  const analyzer = new ProjectAnalyzer(options);
  return analyzer.analyze(projectPath);
}

async function generateFeature(projectPath, feature, options = {}) {
  const { Orchestrator } = require('./core/orchestrator');
  const orchestrator = new Orchestrator(options);
  return orchestrator.run(projectPath, feature);
}

module.exports = {
  organizeProject,
  analyzeProject,
  generateFeature,
  suggestStructureImprovements,
  runImprovementLoop,
  ImprovementLoopEngine,
  generateDesignSystem,
  DesignSystemEngine,
  getDesignSystem,
  applyDesignSystem,
  upgradeUI,
  ingestProject,
  generateMicrotasks,
  generateTests,
};
