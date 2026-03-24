const { organizeProject, suggestStructureImprovements } = require('./core/structureOrganizer');
const { runImprovementLoop, ImprovementLoopEngine } = require('./engine/improvementLoop');
const { generateDesignSystem, DesignSystemEngine, getDesignSystem, applyDesignSystem, upgradeUI } = require('./engine/designSystem');
const { buildDefaultDesignSystemUsage } = require('./engine/designSystem/default-usage');
const { ingestProject } = require('./engine/ingestion');
const { analyzeUIScreens } = require('./engine/ingestion/ui-screen-analyzer');
const { generateMicrotasks } = require('./engine/microtasks');
const { generateTests } = require('./engine/testing');
const { analyzePostGeneration } = require('./engine/improvementLoop/post-generation-analyzer');
const {
  DoclingService,
  parseDocument,
  EmbeddingService,
  embed,
  QdrantService,
  storeVector,
  search,
  KnowledgeIngestionService,
  ingest,
  retrieveContext,
} = require('./engine/knowledge');
const { TreeSitterService, CodeIntelligenceEngine } = require('./engine/codeIntelligence');
const { ContextBuilder } = require('./engine/context');
const { DecisionEngine } = require('./engine/decision');
const { refactorGeneratedUI } = require('./engine/uiRefactor');
const { buildBackendArchitectureNotes, scaffoldBackendEnhancements } = require('./engine/backendStructure');
const { enhanceUIWithStates } = require('./engine/generators/ui-state-generator');
const { suggestProductEnhancements } = require('./engine/designSystem/product-suggestion-engine');

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
  buildDefaultDesignSystemUsage,
  ingestProject,
  analyzeUIScreens,
  generateMicrotasks,
  generateTests,
  analyzePostGeneration,
  DoclingService,
  parseDocument,
  EmbeddingService,
  embed,
  QdrantService,
  storeVector,
  search,
  KnowledgeIngestionService,
  ingest,
  retrieveContext,
  TreeSitterService,
  CodeIntelligenceEngine,
  ContextBuilder,
  DecisionEngine,
  refactorGeneratedUI,
  enhanceUIWithStates,
  suggestProductEnhancements,
  buildBackendArchitectureNotes,
  scaffoldBackendEnhancements,
};
