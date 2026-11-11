const PERSONALITIES = {
  ARCHITECT: ['visionário', 'meticuloso', 'sistemático'],
  ORCHESTRATOR: ['estratégico', 'decisivo', 'coordenador'],
  FRONTEND: ['criativo', 'detalhista', 'visual'],
  BACKEND: ['lógico', 'robusto', 'eficiente'],
  UIUX: ['empático', 'intuitivo', 'refinado'],
  VISUAL: ['perceptivo', 'analítico', 'preciso'],
  BROWSER: ['explorador', 'adaptável', 'persistente'],
  QA: ['rigoroso', 'observador', 'criterioso'],
  API: ['integrador', 'padronizado', 'confiável'],
  DATABASE: ['organizado', 'otimizador', 'guardião'],
  DEVOPS: ['automatizador', 'resiliente', 'pragmático'],
  SECURITY: ['vigilante', 'cauteloso', 'protetor'],
  GITHUB: ['colaborativo', 'versionador', 'rastreador'],
  RESEARCH: ['curioso', 'investigativo', 'inovador']
};
const TAGS_MAP = {
  ARCHITECT: ['system-design', 'patterns', 'scalability'],
  ORCHESTRATOR: ['coordination', 'planning', 'delegation'],
  FRONTEND: ['react', 'css', 'components'],
  BACKEND: ['api', 'fastify', 'node'],
  UIUX: ['design-system', 'accessibility', 'figma'],
  VISUAL: ['screenshots', 'pixel-diff', 'regression'],
  BROWSER: ['playwright', 'dom', 'e2e'],
  QA: ['testing', 'coverage', 'validation'],
  API: ['rest', 'graphql', 'swagger'],
  DATABASE: ['postgresql', 'prisma', 'redis'],
  DEVOPS: ['pm2', 'docker', 'ci-cd'],
  SECURITY: ['auth', 'jwt', 'xss'],
  GITHUB: ['git', 'branches', 'prs'],
  RESEARCH: ['analysis', 'benchmarks', 'exploration']
};

function enhanceAgent(a) {
  const role = (a.role || '').toUpperCase();
  const seed = a.id || a.name || role;
  const hash = [...seed].reduce((h, c) => h * 31 + c.charCodeAt(0), 0);
  const existingMetrics = a.metrics || {};
  return {
    ...a,
    personality: a.personality || PERSONALITIES[role] || ['adaptável', 'focado', 'confiável'],
    metrics: {
      ...existingMetrics,
      efficiency: existingMetrics.efficiency || (85 + (Math.abs(hash) % 15)),
      uptime: existingMetrics.uptime || (97 + (Math.abs(hash * 7) % 30) / 10).toFixed(1) + '%',
      tasksCompleted: existingMetrics.tasksCompleted || existingMetrics.jobsCompleted || (50 + (Math.abs(hash * 13) % 450)),
      qualityScore: existingMetrics.qualityScore || (9.0 + (Math.abs(hash * 3) % 10) / 10).toFixed(1)
    },
    avatarUrl: a.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(seed),
    missions: a.missions || (a.currentMissionId ? [{ id: a.currentMissionId, status: 'ACTIVE' }] : []),
    tags: a.tags || TAGS_MAP[role] || ['core', 'v12']
  };
}

module.exports = { enhanceAgent };
