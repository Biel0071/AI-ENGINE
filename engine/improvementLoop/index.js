const { analyzeProject } = require('./analyzer');
const { detectProblems } = require('./problem-detector');
const { suggestImprovements, buildRefactorPlan } = require('./improvement-suggester');
const { generateCodeChanges } = require('./code-change-generator');
const { validateChanges } = require('./validator');
const { ImprovementMemoryStore, derivePatternCandidates } = require('../memory');
const { ingestProject } = require('../ingestion');
const { generateMicrotasks } = require('../microtasks');
const { generateTests } = require('../testing');
const { analyzePostGeneration } = require('./post-generation-analyzer');
const { suggestProductEnhancements } = require('../designSystem/product-suggestion-engine');

class ImprovementLoopEngine {
  constructor(options = {}) {
    this.options = options;
    this.memoryStore = options.memoryStore || new ImprovementMemoryStore(options.memoryOptions || {});
    this.engineMode = String(options.engineMode || process.env.ENGINE_MODE || 'standard').toLowerCase();
    this.freezeMode = this.engineMode === 'freeze';
  }

  async analyzeProject(projectContext = {}, runtimeOptions = {}) {
    return analyzeProject(projectContext, {
      ...this.options,
      ...runtimeOptions,
    });
  }

  detectProblems(analysis = {}, projectContext = {}, ingestion = {}) {
    return detectProblems(analysis, projectContext, ingestion);
  }

  suggestImprovements(problems = [], analysis = {}, context = {}) {
    return suggestImprovements(problems, analysis, context);
  }

  generateCodeChanges(improvements = [], analysis = {}, microtasks = []) {
    return generateCodeChanges(improvements, analysis, microtasks);
  }

  validateChanges(payload = {}) {
    return validateChanges(payload);
  }

  async remember({ analysis = {}, improvements = [], refactorPlan = [], microtasks = [], validation = {}, tests = {} } = {}) {
    try {
      await this.memoryStore.saveAnalysis({
        summary: analysis.summary || {},
        metadata: analysis.metadata || {},
        ingestionSummary: analysis.ingestionSummary || {},
        validation,
      });

      for (const item of improvements) {
        await this.memoryStore.saveImprovement(item);
      }

      for (const pattern of derivePatternCandidates(analysis, improvements)) {
        await this.memoryStore.savePattern(pattern);
      }

      for (const step of refactorPlan) {
        await this.memoryStore.saveBestPractice({
          title: step.title,
          guardrails: step.guardrails,
        });
      }

      for (const item of improvements) {
        if (item.type === 'ui-consistency-fix') {
          await this.memoryStore.saveUIImprovement({
            title: item.title,
            confidenceScore: item.confidenceScore,
            impact: item.impact,
          });
        }

        if (Number(item.confidenceScore || 0) >= 0.85) {
          await this.memoryStore.saveSuccessfulRefactor({
            title: item.title,
            type: item.type,
            confidenceScore: item.confidenceScore,
          });
        }
      }

      for (const task of microtasks) {
        await this.memoryStore.savePattern({
          type: 'microtask-pattern',
          hint: task.suggestedFix,
          priority: task.priority,
          impact: task.impact,
        });
      }

      await this.memoryStore.savePattern({
        type: 'testing-strategy',
        hint: `smoke:${(tests.smokeTests || []).length}|e2e:${(tests.e2eTests || []).length}`,
      });
    } catch {
      // Memory persistence must never break runtime analysis.
    }
  }

  async run(projectContext = {}) {
    try {
      const mode = this.freezeMode ? 'freeze-suggest-only' : this.options.mode || 'suggest-only';

      const ingestion = ingestProject(projectContext, {
        maxFiles: this.options.maxFiles || 1200,
      });

      const analysis = await this.analyzeProject(
        {
          ...projectContext,
          files: ingestion.files,
        },
        {
          ...this.options,
          mode,
        },
      );

      analysis.ingestionSummary = {
        screenCount: (ingestion.screens || []).length,
        flowIssueCount: (ingestion.flowIssues || []).length,
        missingComponentCount: (ingestion.missingComponents || []).length,
        uiInconsistencyCount: (ingestion.uiInconsistencies || []).length,
      };
      analysis.metadata = analysis.metadata || {};
      analysis.metadata.pipeline = [
        'ingestion',
        'analysis',
        'problem-detection',
        'microtask-generation',
        'code-suggestion',
        'validation',
        'memory-storage',
      ];
      analysis.metadata.engineMode = this.engineMode;
      analysis.metadata.freezeMode = this.freezeMode;

      const memorySnapshot = await this.memoryStore.getSnapshot();

      const problems = this.detectProblems(analysis, projectContext, ingestion);
      const improvements = this.suggestImprovements(problems, analysis, {
        ingestion,
        memorySnapshot,
        freezeMode: this.freezeMode,
      });
      const postGeneration = analyzePostGeneration({
        generatedFiles: ingestion.files,
        analysis,
        designSystem: analysis.designSystem && analysis.designSystem.designSystem ? analysis.designSystem.designSystem : {},
      });
      const mergedImprovements = [...improvements, ...(postGeneration.suggestions || [])];
      const productSuggestions = suggestProductEnhancements({
        feature: String(projectContext.currentGoal || projectContext.feature || 'feature'),
        generated: {
          summary: {
            frontendFiles: analysis.summary && analysis.summary.frontendFiles ? analysis.summary.frontendFiles : 0,
            backendFiles: analysis.summary && analysis.summary.backendFiles ? analysis.summary.backendFiles : 0,
          },
        },
        memorySnapshot,
        knowledgeContext: projectContext.knowledgeContext || null,
      });
      const microtasks = generateMicrotasks(mergedImprovements, analysis, ingestion);
      const refactorPlan = buildRefactorPlan(mergedImprovements);
      const suggestedCode = this.generateCodeChanges(mergedImprovements, analysis, microtasks);
      const tests = generateTests({
        analysis,
        ingestion,
        improvements: mergedImprovements,
        microtasks,
      });
      const designSystemEnvelope = analysis.designSystem || {};
      const coreDesignSystem = designSystemEnvelope.designSystem || {
        colors: {},
        spacing: {},
        typography: {},
        components: [],
        inconsistencies: [],
        normalizationSuggestions: [],
        componentStandardization: [],
        uiScore: 0,
      };
      const designSystem = {
        ...coreDesignSystem,
        designTokens: designSystemEnvelope.designTokens || {
          colors: {},
          spacing: {},
          typography: {},
          radius: {},
          shadows: {},
          layout: {},
        },
        reusableComponents: designSystemEnvelope.reusableComponents || [],
        memory: designSystemEnvelope.memory || {
          designSystem: {
            name: 'whatsapp-inspired-premium',
            tokens: {},
            components: [],
            patterns: [],
            source: 'extracted_from_ui',
          },
          designPatterns: {
            chatLayout: {},
            sidebarLayout: {},
            messageFlowUI: {},
          },
        },
        autoImprovements: designSystemEnvelope.autoImprovements || [],
      };

      const validation = this.validateChanges({
        analysis,
        problems,
        improvements: mergedImprovements,
        microtasks,
        designSystem,
        tests,
        refactorPlan,
        suggestedCode,
        freezeMode: this.freezeMode,
        engineMode: this.engineMode,
      });

      await this.remember({
        analysis,
        improvements: mergedImprovements,
        refactorPlan,
        microtasks,
        validation,
        tests,
      });

      return {
        analysis,
        problems,
        improvements: mergedImprovements,
        microtasks,
        postGeneration,
        productSuggestions,
        designSystem,
        tests,
        refactorPlan,
        suggestedCode,
        validation,
        engineMode: this.engineMode,
      };
    } catch (error) {
      return {
        analysis: {
          summary: {},
          metadata: {
            fallback: true,
            generatedAt: new Date().toISOString(),
            engineMode: this.engineMode,
            freezeMode: this.freezeMode,
            pipeline: [
              'ingestion',
              'analysis',
              'problem-detection',
              'microtask-generation',
              'code-suggestion',
              'validation',
              'memory-storage',
            ],
          },
          designSystem: {
            designSystem: {
              colors: {},
              spacing: {},
              typography: {},
              components: [],
              inconsistencies: [],
              normalizationSuggestions: [],
              componentStandardization: [],
              uiScore: 0,
            },
          },
          ingestionSummary: {
            screenCount: 0,
            flowIssueCount: 0,
            missingComponentCount: 0,
            uiInconsistencyCount: 0,
          },
        },
        problems: [
          {
            code: 'IMPROVEMENT_LOOP_FAILURE',
            severity: 'high',
            message: 'Improvement loop failed and fallback response was returned.',
            recommendation: 'Retry with smaller payload or check runtime logs.',
          },
        ],
        improvements: [
          {
            type: 'safe-refactor',
            priority: 'high',
            impact: 'high',
            confidenceScore: 0.6,
            title: 'Retry incremental analysis',
            description: 'Run analysis in smaller batches preserving current behavior.',
            safe: true,
          },
        ],
        microtasks: [],
        postGeneration: {
          suggestions: [],
          summary: {
            uiFiles: 0,
            backendFiles: 0,
            suggestionCount: 0,
          },
        },
        productSuggestions: [],
        designSystem: {
          colors: {},
          spacing: {},
          typography: {},
          components: [],
          inconsistencies: [],
          normalizationSuggestions: [],
          componentStandardization: [],
          uiScore: 0,
          designTokens: {
            colors: {},
            spacing: {},
            typography: {},
            radius: {},
            shadows: {},
            layout: {},
          },
          reusableComponents: [],
          memory: {
            designSystem: {
              name: 'whatsapp-inspired-premium',
              tokens: {},
              components: [],
              patterns: [],
              source: 'extracted_from_ui',
            },
            designPatterns: {
              chatLayout: {},
              sidebarLayout: {},
              messageFlowUI: {},
            },
          },
          autoImprovements: [],
        },
        tests: {
          smokeTests: [],
          e2eTests: [],
        },
        refactorPlan: [
          {
            step: 1,
            title: 'Stabilize input payload',
            objective: 'Retry with minimal payload and keep backward compatibility.',
            guardrails: ['Do not apply destructive changes.'],
            safeType: 'safe-refactor',
          },
        ],
        suggestedCode: [],
        validation: {
          ok: false,
          safeMode: true,
          engineMode: this.engineMode,
          freezeMode: this.freezeMode,
          fallbackUsed: true,
          errors: [String(error && error.message ? error.message : error)],
        },
        engineMode: this.engineMode,
      };
    }
  }
}

async function runImprovementLoop(projectContext = {}, options = {}) {
  const engine = new ImprovementLoopEngine(options);
  return engine.run(projectContext);
}

module.exports = {
  ImprovementLoopEngine,
  runImprovementLoop,
};
