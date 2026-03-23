const { Orchestrator } = require('./core/orchestrator');
const {
  organizeProject,
  suggestStructureImprovements,
} = require('./core/structureOrganizer');
const { ProjectAnalyzer } = require('./intelligence/analyzer/projectAnalyzer');

async function analyzeProject(projectPath, options = {}) {
  const analyzer = new ProjectAnalyzer(options);
  return analyzer.analyze(projectPath);
}

async function generateFeature(projectPath, feature, options = {}) {
  const engine = new Orchestrator(options);
  return engine.run(projectPath, feature);
}

module.exports = {
  organizeProject,
  analyzeProject,
  generateFeature,
  suggestStructureImprovements,
};
