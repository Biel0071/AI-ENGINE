const path = require('path');
const { AIEngine } = require('../dist/core/engine');
const { MemoryStore } = require('../dist/memory/memory.store');

const { scanProject } = require('./projectScanner');
const { analyzeArchitecture } = require('./architectureAnalyzer');
const { buildContext } = require('./contextBuilder');
const { tokenizeProject } = require('./tokenizer');
const { runDiagnostics } = require('./diagnosticEngine');
const { runLearningLoop } = require('./learningLoop');
const { generateGuidance } = require('./guidanceEngine');
const { ProjectMemoryManager, slugifyProjectName } = require('./memoryManager');

function buildProjectSummary(scanResult, context) {
  return {
    rootPath: scanResult.rootPath,
    totalFiles: scanResult.files.length,
    stack: scanResult.detectedStack,
    entryPoints: scanResult.entryPoints,
    summary: context.summary,
    confidence: 0.9,
    sources: [
      ...(scanResult.entryPoints || []).map((item) => item.path),
      ...(scanResult.detectedStack || []).flatMap((item) => item.sources || []),
    ],
  };
}

function persistArtifacts(memoryStore, output, learning) {
  const createdAt = new Date().toISOString();

  memoryStore.save({
    type: 'analysis-tokens',
    createdAt,
    tokens: output.tokens,
    sources: output.tokens.flatMap((token) => token.sources || []).slice(0, 200),
  });

  memoryStore.save({
    type: 'analysis-insights',
    createdAt,
    insights: output.insights,
    sources: output.insights.flatMap((item) => item.sources || []).slice(0, 200),
  });

  memoryStore.save({
    type: 'analysis-changes',
    createdAt,
    changes: learning.changes,
    improvements: learning.improvements,
    sources: learning.sources || [],
  });
}

function toStandardOutput(payload) {
  return {
    projectSummary: payload.projectSummary || {},
    architecture: payload.architecture || {},
    tokens: Array.isArray(payload.tokens) ? payload.tokens : [],
    insights: Array.isArray(payload.insights) ? payload.insights : [],
    nextActions: Array.isArray(payload.nextActions) ? payload.nextActions : [],
    diagnostics: payload.diagnostics || {},
    context: payload.context || {},
    learning: payload.learning || {},
  };
}

class IntelligenceLayer {
  constructor({ coreEngine, memoryStore, projectMemoryManager } = {}) {
    this.coreEngine = coreEngine || new AIEngine();
    this.memoryStore = memoryStore || new MemoryStore();
    this.projectMemoryManager =
      projectMemoryManager ||
      new ProjectMemoryManager({ projectsRoot: path.resolve(__dirname, '..', 'memory', 'projects') });
  }

  async analyzeProject(projectRoot, previousState = {}) {
    const resolvedRoot = path.resolve(projectRoot || process.cwd());
    const projectName = slugifyProjectName(path.basename(resolvedRoot));
    const persistedState = await this.projectMemoryManager.loadLatestState(projectName);
    const baseline = {
      tokens: (previousState && previousState.tokens) || persistedState.tokens,
      insights: (previousState && previousState.insights) || persistedState.insights,
    };

    const scanResult = await scanProject(resolvedRoot);
    const architecture = await analyzeArchitecture(scanResult);
    const diagnostics = await runDiagnostics(scanResult, architecture);
    const context = buildContext({ scanResult, architecture, diagnostics });
    const tokens = tokenizeProject({ context });
    const learning = runLearningLoop({ tokens, insights: diagnostics.issues }, baseline);
    const guidance = generateGuidance({ context, diagnostics, tokens });

    const output = toStandardOutput({
      projectSummary: buildProjectSummary(scanResult, context),
      architecture,
      tokens,
      insights: [
        ...(diagnostics.issues || []),
        ...(learning.improvements || []).map((item) => ({
          type: 'learning-improvement',
          severity: item.priority === 'high' ? 'high' : 'low',
          message: item.message,
          confidence: item.confidence,
          sources: item.sources,
        })),
      ],
      nextActions: [
        ...(guidance.nextSteps || []),
        ...(guidance.fixes || []),
        ...(guidance.optimizations || []),
      ],
      diagnostics,
      context,
      learning,
    });

    persistArtifacts(this.memoryStore, output, learning);
    const memoryPersistence = await this.projectMemoryManager.saveProjectAnalysis({
      projectName,
      rootPath: resolvedRoot,
      tokens: output.tokens,
      insights: output.insights,
      changes: learning.changes,
      nextActions: output.nextActions,
      architecture: output.architecture,
      projectSummary: output.projectSummary,
    });

    output.memoryPersistence = {
      projectName,
      ...memoryPersistence,
    };

    return output;
  }

  async runWithCore(input, { projectRoot, previousState } = {}) {
    const analysisBefore = await this.analyzeProject(projectRoot, previousState);
    const coreResult = await this.coreEngine.run(input);
    const analysisAfter = await this.analyzeProject(projectRoot, {
      tokens: analysisBefore.tokens,
      insights: analysisBefore.insights,
    });

    return {
      coreResult,
      analysisBefore,
      analysisAfter,
    };
  }
}

module.exports = {
  IntelligenceLayer,
};
