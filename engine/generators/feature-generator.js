const fs = require('fs/promises');
const path = require('path');
const { UIGenerator } = require('./uiGenerator');
const { CodeGenerator } = require('./codeGenerator');
const { buildT3BaseTemplate } = require('../../templates/stack/t3-base.template');

function sanitizeFeatureName(value) {
  return String(value || 'feature')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function writeFiles(rootPath, files = []) {
  for (const file of files) {
    const targetPath = path.join(rootPath, file.path);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, file.content, 'utf8');
  }
}

class FeatureGenerator {
  constructor(options = {}) {
    this.uiGenerator = options.uiGenerator || new UIGenerator();
    this.codeGenerator = options.codeGenerator || new CodeGenerator();
  }

  async generate(input = {}) {
    const feature = String(input.feature || 'feature').trim();
    const projectPath = path.resolve(input.projectPath || process.cwd());
    const featureSlug = sanitizeFeatureName(feature);
    const outputRoot = path.join(projectPath, 'generated', featureSlug);

    await fs.mkdir(outputRoot, { recursive: true });

    const stackFiles = buildT3BaseTemplate({ projectName: `${featureSlug}-starter` });
    await writeFiles(outputRoot, stackFiles);

    const uiOutput = input.agentOutputs && input.agentOutputs.frontend
      ? input.agentOutputs.frontend
      : await this.uiGenerator.generate({
          feature,
          patterns: input.patterns || [],
          outputRoot,
          designSystemUsage: input.designSystemUsage || null,
          designTokens: (input.designSystemUsage && input.designSystemUsage.designTokens) || {},
          uiConstraints: (input.designSystemUsage && input.designSystemUsage.uiConstraints) || {
            enforceVisualConsistency: true,
            preventRandomUIGeneration: true,
            requireTokenBasedStyles: true,
          },
        });

    const codeOutput = input.agentOutputs && input.agentOutputs.backend
      ? input.agentOutputs.backend
      : await this.codeGenerator.generate({
          feature,
          projectData: input.projectData || {},
          plan: input.plan || [],
          outputRoot,
        });

    const allFiles = [...stackFiles, ...uiOutput.files, ...codeOutput.files];

    return {
      feature,
      outputRoot,
      files: allFiles,
      uiPattern: uiOutput.uiPattern,
      summary: {
        totalFiles: allFiles.length,
        reusableModules: ['ui-generator', 'code-generator', 'template-engine'],
        designSystemGuardrails: {
          loadedFromMemory: Boolean(input.designSystemUsage && input.designSystemUsage.designSystem),
          tokenEnforced: Boolean(input.designSystemUsage && input.designSystemUsage.designTokens),
          preventRandomUIGeneration: true,
        },
        ...codeOutput.summary,
      },
    };
  }
}

module.exports = {
  FeatureGenerator,
};
