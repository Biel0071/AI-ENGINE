const { ProjectAnalyzer } = require('../analyzer/projectAnalyzer');

class AnalyzerAgent {
  constructor(options = {}) {
    this.analyzer = options.analyzer || new ProjectAnalyzer(options.analyzerOptions);
  }

  async run(input = {}) {
    const projectPath = input.projectPath || process.cwd();
    return this.analyzer.analyze(projectPath);
  }
}

module.exports = {
  AnalyzerAgent,
};
