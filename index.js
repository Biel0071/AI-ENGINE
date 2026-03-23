const { organizeProject, suggestStructureImprovements } = require('./core/structureOrganizer');

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
};
