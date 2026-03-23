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

module.exports = {
  devAssistant: loadModule(['../../ai/devAssistant']),
  chatAssistant: loadModule(['../../ai/chatAssistant']),
  devPipeline: loadModule(['../../ai/devPipeline']),
  commandParser: loadModule(['../../intelligence/dev-engine/commandParser']),
  saasGenerator: loadModule(['../../intelligence/dev-engine/saasGenerator']),
};
