const { UIGenerator } = require('../generators/uiGenerator');
const { buildDefaultDesignSystemUsage } = require('../designSystem/default-usage');

class FrontendAgent {
  constructor(options = {}) {
    this.uiGenerator = options.uiGenerator || new UIGenerator();
    this.designSystemOptions = options.designSystemOptions || {};
  }

  async run(input = {}) {
    const designSystemUsage = await buildDefaultDesignSystemUsage(
      {
        projectPath: input.projectPath,
        projectData: input.projectData,
        files: input.files,
        needsImprovement: input.needsImprovement,
      },
      this.designSystemOptions,
    );

    return this.uiGenerator.generate({
      feature: input.feature,
      patterns: input.patterns,
      outputRoot: input.outputRoot,
      designSystemUsage,
      designTokens: designSystemUsage.designTokens || {},
      uiConstraints: designSystemUsage.uiConstraints,
    });
  }
}

module.exports = {
  FrontendAgent,
};
