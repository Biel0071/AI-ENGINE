function byPriorityDesc(a, b) {
  return (b.priorityScore || 0) - (a.priorityScore || 0);
}

function generateGuidance({ context, diagnostics, tokens }) {
  const nextSteps = (context.criticalPoints || []).map((point, index) => ({
    id: `next-${index + 1}`,
    action: point.message,
    reason: `Ponto critico detectado (${point.type}).`,
    priorityScore: Number((point.confidence * 100).toFixed(0)),
    confidence: point.confidence,
    sources: point.sources,
  }));

  const fixes = (diagnostics.issues || [])
    .filter((issue) => issue.severity === 'high' || issue.severity === 'critical')
    .map((issue, index) => ({
      id: `fix-${index + 1}`,
      action: issue.message,
      type: issue.type,
      priorityScore: Number((issue.confidence * 100).toFixed(0)),
      confidence: issue.confidence,
      sources: issue.sources,
    }));

  const optimizations = (tokens || [])
    .filter((token) => token.importance >= 0.8)
    .slice(0, 20)
    .map((token, index) => ({
      id: `opt-${index + 1}`,
      action: `Otimizar area relacionada ao token ${token.id}.`,
      reason: token.description,
      priorityScore: Number((token.importance * 100).toFixed(0)),
      confidence: token.confidence,
      sources: token.sources,
    }));

  return {
    nextSteps: nextSteps.sort(byPriorityDesc),
    fixes: fixes.sort(byPriorityDesc),
    optimizations: optimizations.sort(byPriorityDesc),
    confidence: 0.85,
    sources: [
      ...nextSteps.flatMap((item) => item.sources || []),
      ...fixes.flatMap((item) => item.sources || []),
      ...optimizations.flatMap((item) => item.sources || []),
    ].slice(0, 150),
  };
}

module.exports = {
  generateGuidance,
};
