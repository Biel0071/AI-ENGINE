const path = require('path');
const { IntelligenceLayer } = require('./intelligenceLayer');

function printConsoleReport(result) {
  const summary = result.projectSummary || {};
  const topIssues = (result.insights || []).slice(0, 5);
  const nextSteps = (result.nextActions || []).slice(0, 5);

  console.log('=== AI-ENGINE PROJECT ANALYSIS ===');
  console.log(`Project root: ${summary.rootPath || 'unknown'}`);
  console.log(`Total files: ${summary.totalFiles || 0}`);
  console.log(`Summary: ${summary.summary || 'No summary available'}`);

  console.log('\nMain problems:');
  if (topIssues.length === 0) {
    console.log('- No critical issues detected in this run.');
  } else {
    for (const issue of topIssues) {
      const confidence = typeof issue.confidence === 'number' ? issue.confidence.toFixed(2) : 'n/a';
      console.log(`- ${issue.message} (confidence: ${confidence})`);
    }
  }

  console.log('\nNext steps:');
  if (nextSteps.length === 0) {
    console.log('- No prioritized actions generated.');
  } else {
    for (const action of nextSteps) {
      const text = action.action || action.message || 'Unnamed action';
      const confidence = typeof action.confidence === 'number' ? action.confidence.toFixed(2) : 'n/a';
      console.log(`- ${text} (confidence: ${confidence})`);
    }
  }
}

async function runProjectAnalysis(projectPath) {
  const layer = new IntelligenceLayer();
  const resolvedPath = path.resolve(projectPath || process.cwd());
  return layer.analyzeProject(resolvedPath);
}

async function runCli() {
  const target = process.argv[2] || process.cwd();
  const result = await runProjectAnalysis(target);
  printConsoleReport(result);
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error('[ai-engine] runAnalysis failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runProjectAnalysis,
};
