const fs = require('fs/promises');
const path = require('path');
const { TreeSitterService } = require('./tree-sitter-service');

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

async function walk(rootPath, current = rootPath, acc = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
      continue;
    }

    const absolute = path.join(current, entry.name);

    if (entry.isDirectory()) {
      await walk(rootPath, absolute, acc);
      continue;
    }

    acc.push(path.relative(rootPath, absolute));
  }

  return acc;
}

function detectProblemsFromSymbols(symbolReports = []) {
  const problems = [];

  for (const report of symbolReports) {
    const symbols = report.symbols || {};
    const imports = symbols.imports || [];
    const components = symbols.components || [];

    if (imports.length > 25) {
      problems.push({
        file: report.path,
        type: 'high-coupling',
        severity: 'medium',
        message: 'High import count suggests module coupling that may hurt maintainability.',
      });
    }

    if (components.length > 12) {
      problems.push({
        file: report.path,
        type: 'large-ui-surface',
        severity: 'medium',
        message: 'Many UI components in a single file indicate refactor opportunity.',
      });
    }
  }

  return problems;
}

class CodeIntelligenceEngine {
  constructor(options = {}) {
    this.options = options;
    this.parser = options.treeSitter || new TreeSitterService(options.treeSitterOptions || {});
  }

  async analyzeProject(projectPath) {
    const root = path.resolve(projectPath || process.cwd());
    const files = await walk(root);
    const sourceFiles = files
      .filter((file) => /\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(file))
      .slice(0, Number(this.options.maxSourceFiles || 600));

    const fullEntries = await Promise.all(
      sourceFiles.map(async (relative) => ({
        path: relative,
        content: await fs.readFile(path.join(root, relative), 'utf8'),
      })),
    );

    const symbolReports = await this.parser.analyzeFiles(fullEntries);
    const problems = detectProblemsFromSymbols(symbolReports);

    return {
      root,
      parser: symbolReports[0] && symbolReports[0].symbols ? symbolReports[0].symbols.parser : 'fallback-regex',
      filesAnalyzed: symbolReports.length,
      symbolReports,
      problems,
      summary: {
        totalProblems: problems.length,
        mediumProblems: problems.filter((item) => item.severity === 'medium').length,
      },
    };
  }
}

module.exports = {
  CodeIntelligenceEngine,
};
