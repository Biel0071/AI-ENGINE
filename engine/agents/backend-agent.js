const { CodeGenerator } = require('../generators/codeGenerator');

class BackendAgent {
  constructor(options = {}) {
    this.codeGenerator = options.codeGenerator || new CodeGenerator();
  }

  async run(input = {}) {
    return this.codeGenerator.generate({
      feature: input.feature,
      projectData: input.projectData,
      plan: input.plan,
      outputRoot: input.outputRoot,
    });
  }
}

module.exports = {
  BackendAgent,
};
