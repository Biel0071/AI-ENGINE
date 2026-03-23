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
  systemDiagnostics: loadModule(['../../ai/systemDiagnostics']),
  systemHealthAnalyzer: loadModule(['../../ai/systemHealthAnalyzer']),
  errorAnalyzer: loadModule(['../../ai/errorAnalyzer']),
  testFailureAnalyzer: loadModule(['../../ai/testFailureAnalyzer']),
};
