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
  saasArchitectEngine: loadModule(['../../ai/saasArchitectEngine']),
  featureEngine: loadModule(['../../ai/featureEngine']),
  codeCurator: loadModule(['../../ai/codeCurator']),
  selfHealer: loadModule(['../../ai/selfHealer']),
};
