function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function flowTokens(context) {
  return (context.mainFlows || []).map((flow, index) => ({
    id: slugify(flow.name || `flow-${index + 1}`),
    description: `Fluxo ${flow.from || 'origem'} -> ${flow.to || 'destino'}`,
    files: flow.sources || [],
    importance: Number((0.6 + (flow.confidence || 0) * 0.4).toFixed(2)),
    confidence: flow.confidence || 0.7,
    sources: flow.sources || [],
  }));
}

function criticalTokens(context) {
  return (context.criticalPoints || []).map((point, index) => ({
    id: slugify(`${point.type}-${index + 1}`),
    description: point.message,
    files: point.sources || [],
    importance: Number((0.75 + (point.confidence || 0) * 0.25).toFixed(2)),
    confidence: point.confidence || 0.7,
    sources: point.sources || [],
  }));
}

function dedupe(tokens) {
  const map = new Map();
  for (const token of tokens) {
    if (!map.has(token.id)) {
      map.set(token.id, token);
      continue;
    }
    const previous = map.get(token.id);
    map.set(token.id, {
      ...previous,
      importance: Math.max(previous.importance, token.importance),
      confidence: Math.max(previous.confidence, token.confidence),
      files: Array.from(new Set([...(previous.files || []), ...(token.files || [])])),
      sources: Array.from(new Set([...(previous.sources || []), ...(token.sources || [])])),
    });
  }
  return Array.from(map.values());
}

function tokenizeProject({ context }) {
  const tokens = dedupe([...flowTokens(context), ...criticalTokens(context)]);
  return tokens.sort((a, b) => b.importance - a.importance);
}

module.exports = {
  tokenizeProject,
};
