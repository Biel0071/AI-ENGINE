const { getDesignSystem, applyDesignSystem, upgradeUI } = require('./index');

function detectHasUIProject(project = {}) {
  const projectData = project.projectData || {};
  const summary = projectData.summary || {};
  const frontend = projectData.frontend || {};

  if (frontend && frontend.detected === true) {
    return true;
  }

  if (Number(summary.frontendFiles || 0) > 0) {
    return true;
  }

  const files = Array.isArray(project.files) ? project.files : [];
  return files.some((file) => /\.(tsx|jsx|html|css|scss|sass|less|vue|svelte)$/i.test(String(file.path || '')));
}

function detectNeedsImprovement(project = {}) {
  if (project.needsImprovement === true) {
    return true;
  }

  const projectData = project.projectData || {};
  const ai = projectData.ai || {};
  const insights = ai.insights || {};

  if (Array.isArray(insights.risks) && insights.risks.length > 0) {
    return true;
  }

  const summary = projectData.summary || {};
  return Number(summary.totalFiles || 0) > 0 && Number(summary.frontendFiles || 0) > 0;
}

async function buildDefaultDesignSystemUsage(project = {}, options = {}) {
  const hasUI = detectHasUIProject(project);
  const needsImprovement = detectNeedsImprovement(project);

  const latestDesignSystem = await getDesignSystem(options);
  const designTokens = latestDesignSystem && latestDesignSystem.tokens ? latestDesignSystem.tokens : null;

  let applyPlan = {
    applied: false,
    reason: 'No UI detected in project signals.',
    plan: [],
  };

  if (hasUI) {
    applyPlan = await applyDesignSystem(project, options);
  }

  let upgradePlan = {
    upgraded: false,
    suggestions: [],
    reason: 'Improvement mode not requested.',
  };

  if (needsImprovement) {
    upgradePlan = await upgradeUI(project, options);
  }

  return {
    enabled: true,
    hasUI,
    needsImprovement,
    defaultRules: [
      'Always load memory.designSystem before generating UI.',
      'Apply design tokens automatically.',
      'Enforce visual consistency and typography/spacing scales.',
      'Prevent random UI generation and ad-hoc styling.',
    ],
    designSystem: latestDesignSystem,
    designTokens,
    applyPlan,
    upgradePlan,
    uiConstraints: {
      enforceVisualConsistency: true,
      preventRandomUIGeneration: true,
      requireTokenBasedStyles: true,
      defaultSpacingScale: [4, 8, 12, 16, 24, 32],
      defaultTypographyScale: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
    },
  };
}

module.exports = {
  buildDefaultDesignSystemUsage,
};
