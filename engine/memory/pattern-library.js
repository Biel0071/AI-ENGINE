function normalizeText(value, max = 400) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function derivePatternCandidates(analysis = {}, improvements = []) {
  const items = [];

  if (analysis && analysis.designSystem && analysis.designSystem.designSystem) {
    items.push({
      type: 'design-system-preservation',
      hint: 'Maintain color, spacing and typography consistency based on extracted design system.',
    });
  }

  for (const improvement of improvements || []) {
    items.push({
      type: normalizeText(improvement.type || 'general-improvement', 80),
      hint: normalizeText(improvement.description || improvement.title || 'Apply safe modular incremental update.'),
    });
  }

  return items.slice(0, 30);
}

module.exports = {
  derivePatternCandidates,
};
