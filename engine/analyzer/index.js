function loadModule(candidates = []) {
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try next candidate
    }
  }

  return null;
}

const { ProjectAnalyzer } = require('./projectAnalyzer');

module.exports = {
  ProjectAnalyzer,
  projectAnalyzer: loadModule(['../../ai/projectAnalyzer']),
  uiAnalyzer: loadModule(['../../ai/uiAnalyzer']),
  devAnalyzer: require('../dev-engine/analyzer'),
};
