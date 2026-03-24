function getDesignSystem(memoryStore) {
  if (!memoryStore || typeof memoryStore.getLatestDesignSystem !== 'function') {
    return Promise.resolve(null);
  }
  return memoryStore.getLatestDesignSystem();
}

async function applyDesignSystem(project = {}, memoryStore) {
  const latest = await getDesignSystem(memoryStore);
  if (!latest || !latest.tokens) {
    return {
      applied: false,
      reason: 'No design system available in memory.',
      plan: [],
    };
  }

  const projectFiles = Array.isArray(project.files) ? project.files.length : 0;

  return {
    applied: true,
    mode: 'suggest-only',
    plan: [
      'Inject token file into shared ui/tokens module.',
      'Refactor reusable components to consume tokens only.',
      'Enforce typography and spacing scale in lint/PR checklist.',
    ],
    projectFiles,
    tokens: latest.tokens,
    components: latest.components || [],
  };
}

async function upgradeUI(project = {}, memoryStore) {
  const latest = await getDesignSystem(memoryStore);

  const baseSuggestions = [
    'Improve contrast between text.primary and surface using WCAG AA target.',
    'Unify spacing rhythm to 4/8/12/16/24/32 scale.',
    'Reduce visual noise by consolidating shadow styles to sm/md/lg.',
    'Standardize interactive states across buttons, inputs and sidebar items.',
  ];

  return {
    upgraded: true,
    source: latest && latest.name ? latest.name : 'no-memory-fallback',
    projectFiles: Array.isArray(project.files) ? project.files.length : 0,
    suggestions: baseSuggestions,
  };
}

module.exports = {
  getDesignSystem,
  applyDesignSystem,
  upgradeUI,
};
