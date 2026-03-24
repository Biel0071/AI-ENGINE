const path = require('path');
const fs = require('fs');
const { MemoryManager } = require('../src/services/memory-manager');
const { FeatureGenerator } = require('../engine/generators/feature-generator');
const { StructureOrganizer } = require('./structureOrganizer');
const { AnalyzerAgent } = require('../engine/agents/analyzer-agent');
const { PlannerAgent } = require('../src/services/planner-agent');
const { FrontendAgent } = require('../engine/agents/frontend-agent');
const { BackendAgent } = require('../engine/agents/backend-agent');
const { buildDefaultDesignSystemUsage } = require('../engine/designSystem/default-usage');
const { KnowledgeIngestionService } = require('../engine/knowledge');
const { ContextBuilder } = require('../engine/context');
const { DecisionEngine } = require('../engine/decision');
const { analyzePostGeneration } = require('../engine/improvementLoop/post-generation-analyzer');
const { suggestProductEnhancements } = require('../engine/designSystem/product-suggestion-engine');
const { improveCodeWithAI } = require('../intelligence/ai');

function loadEngineConfig() {
  const configPath = path.resolve(__dirname, '..', 'ai-engine.config.json');
  const freezeConfigPath = path.resolve(__dirname, '..', 'engine', 'config', 'freeze.json');

  let baseConfig = {};
  let freezeConfig = {};

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    baseConfig = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    baseConfig = {};
  }

  try {
    const rawFreeze = fs.readFileSync(freezeConfigPath, 'utf8');
    const parsedFreeze = JSON.parse(rawFreeze);
    freezeConfig = parsedFreeze && typeof parsedFreeze === 'object' ? parsedFreeze : {};
  } catch {
    freezeConfig = {};
  }

  return {
    ...baseConfig,
    freezeConfig,
  };
}

function resolveEngineMode(options = {}, config = {}) {
  const optionMode = options.engineMode;
  const envMode = process.env.ENGINE_MODE;
  const freezeConfig = config.freezeConfig || {};

  if (optionMode) {
    return String(optionMode).toLowerCase();
  }

  if (envMode) {
    return String(envMode).toLowerCase();
  }

  if (freezeConfig.freeze === true) {
    return 'freeze';
  }

  return 'standard';
}

function inferProblemTypes(contextBundle = {}) {
  const project = contextBundle.project || {};
  const problemTypes = new Set(['ui', 'api', 'connection']);

  if (Number(project.codeIntelligence && project.codeIntelligence.totalProblems || 0) > 0) {
    problemTypes.add('code-quality');
  }

  if (Array.isArray(project.routes) && project.routes.length < 2) {
    problemTypes.add('api');
  }

  if (Array.isArray(project.components) && project.components.length < 2) {
    problemTypes.add('ui');
  }

  return Array.from(problemTypes);
}

class Orchestrator {
  constructor(options = {}) {
    const config = loadEngineConfig();
    const envSafeMode = String(process.env.AI_ENGINE_SAFE_MODE || '').trim().toLowerCase();
    const configSafeMode = config.SAFE_MODE !== false;
    const defaultSafeMode = envSafeMode ? envSafeMode !== 'false' : configSafeMode;

    const configAllowAuto = config.allowAutoStructureChanges === true;
    const envAllowAuto = String(process.env.AI_ENGINE_ALLOW_AUTO_STRUCTURE_CHANGES || '').trim().toLowerCase();
    const defaultAllowAuto = envAllowAuto ? envAllowAuto === 'true' : configAllowAuto;

    this.safeMode = options.safeMode !== false && defaultSafeMode;
    this.allowAutoStructureChanges =
      this.safeMode
        ? false
        : (Object.prototype.hasOwnProperty.call(options, 'allowAutoStructureChanges')
            ? options.allowAutoStructureChanges === true
            : defaultAllowAuto);

    this.memory = options.memory || new MemoryManager(options.memoryOptions);
    this.generator = options.generator || new FeatureGenerator(options.generatorOptions);
    this.organizer =
      options.organizer ||
      new StructureOrganizer({
        ...(options.organizerOptions || {}),
        safeMode: this.safeMode,
        allowAutoStructureChanges: this.allowAutoStructureChanges,
      });

    this.agents = {
      analyzerAgent: options.analyzerAgent || new AnalyzerAgent(options.agentOptions),
      plannerAgent: options.plannerAgent || new PlannerAgent(options.agentOptions),
      frontendAgent: options.frontendAgent || new FrontendAgent(options.agentOptions),
      backendAgent: options.backendAgent || new BackendAgent(options.agentOptions),
    };

    this.aiOptions = options.aiOptions || {};
    this.knowledge = options.knowledge || new KnowledgeIngestionService(options.knowledgeOptions || {});
    this.contextBuilder = options.contextBuilder || new ContextBuilder({
      ...(options.contextBuilderOptions || {}),
      knowledge: this.knowledge,
    });
    this.decisionEngine = options.decisionEngine || new DecisionEngine(options.decisionOptions || {});
    this.engineMode = resolveEngineMode(options, config);
    this.freezeMode = this.engineMode === 'freeze';

    if (this.freezeMode) {
      this.safeMode = true;
      this.allowAutoStructureChanges = false;
    }
  }

  async run(projectPath, feature) {
    const resolvedProjectPath = path.resolve(projectPath || process.cwd());
    const requestedFeature = String(feature || 'feature').trim();

    console.log('[ai-engine] start orchestration');

    if (this.safeMode || !this.allowAutoStructureChanges) {
      console.log('SAFE MODE ACTIVE - no structural changes applied');
    }

    const memory = await this.memory.load();
    const structurePatterns = this.memory.getStructurePatterns({ limit: 8 });

    const organization = await this.organizer.organizeProject(resolvedProjectPath, {
      structurePatterns,
      safeMode: this.safeMode,
      allowAutoStructureChanges: this.allowAutoStructureChanges,
    });

    await this.memory.saveOrganization(requestedFeature, organization);

    const projectData = await this.agents.analyzerAgent.run({ projectPath: resolvedProjectPath });
    const patterns = this.memory.findPatterns(requestedFeature, { limit: 5 });

    try {
      await this.knowledge.indexArtifacts({
        source: 'project-intelligence',
        artifacts: {
          code: (projectData.files || []).slice(0, 120).map((file) => ({
            path: file.path,
            summary: `${file.path} [${file.layer}]`,
            language: path.extname(file.path || '').replace('.', ''),
          })),
          documents: [
            {
              title: 'project-summary',
              summary: JSON.stringify(projectData.summary || {}),
            },
          ],
          uiPatterns: (projectData.components || []).slice(0, 80).map((component) => ({
            name: component.name,
            summary: `${component.name} in ${component.source}`,
          })),
        },
        metadata: {
          feature: requestedFeature,
        },
      });
    } catch {
      // Indexing must not break orchestration.
    }

    let knowledgeContext = {
      ok: false,
      warning: 'Knowledge context unavailable.',
      contexts: [],
    };

    try {
      const knowledgeQuery = [
        requestedFeature,
        projectData && projectData.summary ? JSON.stringify(projectData.summary) : '',
      ]
        .join(' ')
        .trim();

      knowledgeContext = await this.knowledge.retrieveRelevantContext({
        query: knowledgeQuery,
        limit: 8,
      });
    } catch (error) {
      knowledgeContext = {
        ok: false,
        warning: String(error && error.message ? error.message : error),
        contexts: [],
      };
    }

    let contextBundle = {
      project: {
        summary: projectData.summary || {},
      },
      patterns,
      examples: [],
      ux: {
        guidelines: [],
      },
      business: {
        rules: [],
      },
      metadata: {
        contextReady: false,
        retrievedCount: 0,
      },
    };

    try {
      contextBundle = await this.contextBuilder.build({
        feature: requestedFeature,
        projectData,
        patterns,
        knowledgeContext,
      });
    } catch {
      contextBundle = {
        project: {
          summary: projectData.summary || {},
          routes: projectData.routes || [],
          components: projectData.components || [],
          dependencies: projectData.dependencies || [],
          codeIntelligence: {
            parser: projectData.codeIntelligence && projectData.codeIntelligence.parser ? projectData.codeIntelligence.parser : 'fallback-regex',
            filesAnalyzed: projectData.codeIntelligence && projectData.codeIntelligence.filesAnalyzed ? projectData.codeIntelligence.filesAnalyzed : 0,
            totalProblems: 0,
          },
        },
        patterns,
        examples: knowledgeContext.contexts || [],
        ux: {
          guidelines: ['Use predictable UX states for loading, success and error feedback.'],
        },
        business: {
          rules: ['Preserve route contracts and avoid breaking existing behavior.'],
        },
        metadata: {
          contextReady: true,
          retrievedCount: Array.isArray(knowledgeContext.contexts) ? knowledgeContext.contexts.length : 0,
          sourceProvider: knowledgeContext.provider || 'fallback',
          warning: knowledgeContext.warning || null,
        },
      };
    }

    if (!contextBundle.metadata || contextBundle.metadata.contextReady !== true) {
      contextBundle.metadata = {
        ...(contextBundle.metadata || {}),
        contextReady: true,
        warning: contextBundle.metadata && contextBundle.metadata.warning
          ? contextBundle.metadata.warning
          : 'Context was reconstructed from project analysis fallback.',
      };
    }

    const knownSolutions = [];
    for (const problemType of inferProblemTypes(contextBundle)) {
      const known = await this.memory.findBestSolution({
        problemType,
        limit: 1,
      });

      if (known) {
        knownSolutions.push(known);
      }
    }

    const decision = this.decisionEngine.decide({
      feature: requestedFeature,
      contextBundle,
      freezeMode: this.freezeMode,
      knownSolutions,
    });

    const enhancedPrompt = [
      'Context:',
      JSON.stringify(contextBundle, null, 2),
      '',
      'User:',
      requestedFeature,
    ].join('\n');

    const plan = this.agents.plannerAgent.run({
      feature: requestedFeature,
      projectData,
      patterns,
      memory,
      knowledgeContext,
      contextBundle,
      decision,
      enhancedPrompt,
    });

    const outputRoot = path.join(
      resolvedProjectPath,
      'generated',
      requestedFeature.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    );

    const defaultDesignSystemUsage = await buildDefaultDesignSystemUsage({
      projectPath: resolvedProjectPath,
      projectData,
      needsImprovement: true,
    });

    const [frontendOutput, backendOutput] = await Promise.all([
      this.agents.frontendAgent.run({
        feature: requestedFeature,
        patterns,
        outputRoot,
        projectPath: resolvedProjectPath,
        projectData,
        needsImprovement: true,
        knowledgeContext,
        contextBundle,
        decision,
        enhancedPrompt,
      }),
      this.agents.backendAgent.run({
        feature: requestedFeature,
        projectData,
        plan,
        outputRoot,
        knowledgeContext,
        contextBundle,
        decision,
        enhancedPrompt,
      }),
    ]);

    const generated = await this.generator.generate({
      feature: requestedFeature,
      projectPath: resolvedProjectPath,
      projectData,
      patterns,
      plan,
      agentOutputs: {
        frontend: frontendOutput,
        backend: backendOutput,
      },
      designSystemUsage: defaultDesignSystemUsage,
      knowledgeContext,
      contextBundle,
      decision,
      enhancedPrompt,
    });

    const postGeneration = analyzePostGeneration({
      generatedFiles: generated.files || [],
      analysis: {
        summary: projectData.summary || {},
      },
      designSystem: defaultDesignSystemUsage.designSystem || {},
    });

    const productSuggestions = suggestProductEnhancements({
      feature: requestedFeature,
      generated: {
        summary: {
          frontendFiles: frontendOutput.files.length,
          backendFiles: backendOutput.files.length,
        },
      },
      knowledgeContext,
    });

    const result = {
      feature: requestedFeature,
      organization,
      projectSummary: projectData.summary,
      routes: projectData.routes,
      components: projectData.components,
      plan: plan.steps,
      files: generated.files,
      uiPattern: frontendOutput.uiPattern,
      designSystemUsage: defaultDesignSystemUsage,
      knowledgeContext,
      context: contextBundle,
      decision,
      enhancedPrompt,
      postGeneration,
      productSuggestions,
      summary: {
        ...generated.summary,
        frontendFiles: frontendOutput.files.length,
        backendFiles: backendOutput.files.length,
        tokenEnforcedUI: Boolean(defaultDesignSystemUsage && defaultDesignSystemUsage.designTokens),
        knowledgeContexts: Array.isArray(knowledgeContext.contexts) ? knowledgeContext.contexts.length : 0,
        contextExamples: Array.isArray(contextBundle.examples) ? contextBundle.examples.length : 0,
        decisionSignals: Array.isArray(decision.problems) ? decision.problems.length : 0,
        autoFeatureCount: Array.isArray(decision.autoFeatures) ? decision.autoFeatures.length : 0,
        engineMode: this.engineMode,
        freezeMode: this.freezeMode,
        stableBuild: true,
      },
    };

    if (this.freezeMode) {
      result.aiImprovement = {
        enabled: false,
        skipped: true,
        review: {
          summary: 'Freeze mode active: generation locked to stable output without automatic AI mutations.',
          improvements: [],
          risks: [],
        },
      };
    } else {
      try {
        const aiImprovement = await improveCodeWithAI(
          JSON.stringify(
            {
              feature: requestedFeature,
              plan: result.plan,
              summary: result.summary,
              projectSummary: result.projectSummary,
              knowledgeContext: knowledgeContext.contexts,
            },
            null,
            2,
          ),
          {
            ...this.aiOptions,
            memoryManager: this.memory,
          },
        );
        result.aiImprovement = aiImprovement;
      } catch {
        result.aiImprovement = {
          enabled: false,
          skipped: true,
          review: {
            summary: 'AI improvement unavailable.',
            improvements: [],
            risks: [],
          },
        };
      }
    }

    result.stability = {
      version: 'stable-v1',
      freezeMode: this.freezeMode,
      lockedStructure: this.safeMode || !this.allowAutoStructureChanges,
      regressionGuardrails: [
        'suggest-only pipeline by default',
        'safe mode structure protection',
        'post-generation validation and product suggestions',
      ],
    };

    await this.memory.savePattern(requestedFeature, result);
    await this.memory.saveDecision(requestedFeature, {
      problems: Array.isArray(decision.problems) ? decision.problems : [],
      strategy: decision.strategy || {},
      contextReadiness: decision.contextReadiness || {},
      reusedSolutions: Array.isArray(decision.reusedSolutions) ? decision.reusedSolutions : [],
    });
    await this.memory.saveChange(
      `Generated and refined feature flow for ${requestedFeature}`,
      'Continuous autonomous cycle execution with context-first decisions.',
      `Frontend files: ${frontendOutput.files.length}, backend files: ${backendOutput.files.length}, auto features: ${Array.isArray(decision.autoFeatures) ? decision.autoFeatures.length : 0}`,
    );

    await this.memory.saveResolvedSolution({
      problemType: Array.isArray(decision.problems) && decision.problems[0] ? decision.problems[0].type || 'general' : 'general',
      solutionPattern: Array.isArray(decision.reusedSolutions) && decision.reusedSolutions[0]
        ? decision.reusedSolutions[0].solutionPattern || 'reused-solution-pattern'
        : 'context-first-safe-generation',
      patternIdentified: 'Contextual generation cycle with quality and UX guardrails.',
      solutionApplied: `Applied context-first orchestration with ${Array.isArray(decision.reusedSolutions) ? decision.reusedSolutions.length : 0} reused proven solutions before generating new outputs.`,
      context: {
        feature: requestedFeature,
        engineMode: this.engineMode,
        freezeMode: this.freezeMode,
      },
      impact: `Generated ${generated.files.length} files with stable flow and decision-guided prioritization.`,
      outcomeScore: result.summary && result.summary.stableBuild ? 1 : 0.8,
      tags: ['continuous-learning', 'solution-reuse', 'context-first'],
    });

    console.log('[ai-engine] orchestration complete');

    return result;
  }
}

module.exports = {
  Orchestrator,
};
