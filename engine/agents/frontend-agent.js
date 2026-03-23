const { UIGenerator } = require('../generators/uiGenerator');

class FrontendAgent {
  constructor(options = {}) {
    this.uiGenerator = options.uiGenerator || new UIGenerator();
  }

  async run(input = {}) {
    return this.uiGenerator.generate({
      feature: input.feature,
      patterns: input.patterns,
      outputRoot: input.outputRoot,
    });
  }
}

module.exports = {
  FrontendAgent,
};
