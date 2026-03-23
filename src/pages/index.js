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

const { TemplateEngine } = require('./templateEngine');
const { UIGenerator } = require('./uiGenerator');
const { CodeGenerator } = require('./codeGenerator');
const { FeatureGenerator } = require('./featureGenerator');

module.exports = {
  TemplateEngine,
  UIGenerator,
  CodeGenerator,
  FeatureGenerator,
  moduleGenerator: loadModule(['../../ai/moduleGenerator']),
  featureGenerator: loadModule(['../../ai/featureGenerator']),
  pageLoopGenerator: loadModule(['../../ai/pageLoopGenerator']),
  pageReplicator: loadModule(['../../ai/pageReplicator']),
};
