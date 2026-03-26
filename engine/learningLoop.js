function normalizeToken(token) {
  return {
    id: token.id,
    description: token.description,
    importance: token.importance,
    files: [...(token.files || [])].sort(),
  };
}

function tokenFingerprint(token) {
  return JSON.stringify(normalizeToken(token));
}

function runLearningLoop(currentState, previousState = {}) {
  const currentTokens = currentState.tokens || [];
  const previousTokens = previousState.tokens || [];

  const previousById = new Map(previousTokens.map((token) => [token.id, token]));
  const currentById = new Map(currentTokens.map((token) => [token.id, token]));

  const changes = [];

  for (const token of currentTokens) {
    const oldToken = previousById.get(token.id);
    if (!oldToken) {
      changes.push({
        type: 'added-token',
        tokenId: token.id,
        message: `Novo token identificado: ${token.id}`,
        confidence: token.confidence || 0.7,
        sources: token.sources || token.files || [],
      });
      continue;
    }

    if (tokenFingerprint(token) !== tokenFingerprint(oldToken)) {
      changes.push({
        type: 'updated-token',
        tokenId: token.id,
        message: `Token atualizado: ${token.id}`,
        confidence: Math.max(token.confidence || 0.7, oldToken.confidence || 0.7),
        sources: Array.from(new Set([...(token.sources || []), ...(oldToken.sources || [])])),
      });
    }
  }

  for (const token of previousTokens) {
    if (currentById.has(token.id)) {
      continue;
    }
    changes.push({
      type: 'removed-token',
      tokenId: token.id,
      message: `Token removido da analise atual: ${token.id}`,
      confidence: token.confidence || 0.65,
      sources: token.sources || token.files || [],
    });
  }

  const improvements = [];
  if (changes.length === 0) {
    improvements.push({
      message: 'Sem mudancas significativas detectadas; manter baseline e ampliar cobertura de testes.',
      priority: 'low',
      confidence: 0.82,
      sources: ['learning-loop'],
    });
  } else {
    improvements.push({
      message: `Foram detectadas ${changes.length} mudancas; revisar tokens alterados e atualizar prioridades.`,
      priority: 'high',
      confidence: 0.86,
      sources: changes.flatMap((change) => change.sources || []).slice(0, 50),
    });
  }

  return {
    changes,
    improvements,
    confidence: 0.88,
    sources: changes.flatMap((change) => change.sources || []).slice(0, 100),
  };
}

module.exports = {
  runLearningLoop,
};
