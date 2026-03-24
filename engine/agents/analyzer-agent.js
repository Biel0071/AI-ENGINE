const { ProjectAnalyzer } = require('../analyzer/projectAnalyzer');
const { CodeIntelligenceEngine } = require('../codeIntelligence');

class AnalyzerAgent {
  constructor(options = {}) {
    this.analyzer = options.analyzer || new ProjectAnalyzer(options.analyzerOptions);
    this.codeIntelligence = options.codeIntelligence || new CodeIntelligenceEngine(options.codeIntelligenceOptions || {});
  }

  async run(input = {}) {
    const projectPath = input.projectPath || process.cwd();
    const baseAnalysis = await this.analyzer.analyze(projectPath);

    let intelligence = {
      parser: 'fallback-regex',
      filesAnalyzed: 0,
      symbolReports: [],
      problems: [],
      summary: {
        totalProblems: 0,
      },
    };

    try {
      intelligence = await this.codeIntelligence.analyzeProject(projectPath);
    } catch {
      intelligence = {
        parser: 'fallback-regex',
        filesAnalyzed: 0,
        symbolReports: [],
        problems: [],
        summary: {
          totalProblems: 0,
        },
      };
    }

    return {
      ...baseAnalysis,
      codeIntelligence: intelligence,
    };
  }
}

module.exports = {
  AnalyzerAgent,
};
