const path = require('path');
const fs = require('fs');
const { MemoryManager } = require('../src/services/memory-manager');
const { FeatureGenerator } = require('../engine/generators/feature-generator');
const { StructureOrganizer } = require('./structureOrganizer');
const { AnalyzerAgent } = require('../engine/agents/analyzer-agent');
const { PlannerAgent } = require('../src/services/planner-agent');
const { FrontendAgent } = require('../engine/agents/frontend-agent');
const { BackendAgent } = require('../engine/agents/backend-agent');
const { improveCodeWithAI } = require('../intelligence/ai');

function loadEngineConfig() {
  const configPath = path.resolve(__dirname, '..', 'ai-engine.config.json');

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
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
