const path = require('path');
const { MemoryManager } = require('../intelligence/memory/memoryManager');
const { FeatureGenerator } = require('../intelligence/generators/featureGenerator');
const { StructureOrganizer } = require('./structureOrganizer');
const { AnalyzerAgent } = require('../intelligence/agents/analyzerAgent');
const { PlannerAgent } = require('../intelligence/agents/plannerAgent');
const { FrontendAgent } = require('../intelligence/agents/frontendAgent');
const { BackendAgent } = require('../intelligence/agents/backendAgent');
const { improveCodeWithAI } = require('../intelligence/ai');

class Orchestrator {
  constructor(options = {}) {
    this.memory = options.memory || new MemoryManager(options.memoryOptions);
    this.generator = options.generator || new FeatureGenerator(options.generatorOptions);
    this.organizer = options.organizer || new StructureOrganizer(options.organizerOptions);

    this.agents = {
      analyzerAgent: options.analyzerAgent || new AnalyzerAgent(options.agentOptions),
      plannerAgent: options.plannerAgent || new PlannerAgent(options.agentOptions),
      frontendAgent: options.frontendAgent || new FrontendAgent(options.agentOptions),
      backendAgent: options.backendAgent || new BackendAgent(options.agentOptions),
    };

    this.aiOptions = options.aiOptions || {};
  }

  async run(projectPath, feature) {
    const resolvedProjectPath = path.resolve(projectPath || process.cwd());
    const requestedFeature = String(feature || 'feature').trim();

    console.log('[ai-engine] start orchestration');

    const memory = await this.memory.load();
    const structurePatterns = this.memory.getStructurePatterns({ limit: 8 });

    const organization = await this.organizer.organizeProject(resolvedProjectPath, {
      structurePatterns,
    });
    await this.memory.saveOrganization(requestedFeature, organization);

    const projectData = await this.agents.analyzerAgent.run({ projectPath: resolvedProjectPath });
    const patterns = this.memory.findPatterns(requestedFeature, { limit: 5 });
    const plan = this.agents.plannerAgent.run({
      feature: requestedFeature,
      projectData,
      patterns,
      memory,
    });

    const outputRoot = path.join(
      resolvedProjectPath,
      'generated',
      requestedFeature.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    );

    const [frontendOutput, backendOutput] = await Promise.all([
      this.agents.frontendAgent.run({
        feature: requestedFeature,
        patterns,
        outputRoot,
      }),
      this.agents.backendAgent.run({
        feature: requestedFeature,
        projectData,
        plan,
        outputRoot,
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
      summary: {
        ...generated.summary,
        frontendFiles: frontendOutput.files.length,
        backendFiles: backendOutput.files.length,
      },
    };

    try {
      const aiImprovement = await improveCodeWithAI(
        JSON.stringify(
          {
            feature: requestedFeature,
            plan: result.plan,
            summary: result.summary,
            projectSummary: result.projectSummary,
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

    await this.memory.savePattern(requestedFeature, result);

    console.log('[ai-engine] orchestration complete');

    return result;
  }
}

module.exports = {
  Orchestrator,
};
