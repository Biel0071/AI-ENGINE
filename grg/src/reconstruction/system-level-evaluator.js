'use strict';

const DIMENSIONS = Object.freeze({
  visual: 'VISUAL',
  ux: 'UX',
  frontend: 'FRONTEND',
  backend: 'BACKEND',
  api: 'API',
  testing: 'TESTING',
  security: 'SECURITY',
  performance: 'PERFORMANCE',
  observability: 'OBSERVABILITY',
  automation: 'AUTOMATION',
  ai: 'AI',
  architecture: 'ARCHITECTURE'
});

class SystemLevelEvaluator {
  evaluateSystem(systemContext = {}) {
    const evidence = systemContext.evidence?.dimensions || systemContext.evidence || {};
    const dimensions = Object.fromEntries(Object.entries(DIMENSIONS).map(([key, label]) => {
      const item = evidence[key];
      const measured = Number.isFinite(item?.points)
        && item.points >= 0 && item.points <= 100
        && typeof item.artifactId === 'string' && item.artifactId.trim().length > 0
        && typeof item.source === 'string' && item.source.trim().length > 0
        && typeof item.verifiedAt === 'string' && Number.isFinite(Date.parse(item.verifiedAt));

      return [key, measured
        ? { label, points: item.points, status: 'MEASURED', evidence: { artifactId: item.artifactId, source: item.source, verifiedAt: item.verifiedAt } }
        : { label, points: null, status: 'NOT_MEASURED', evidence: null }];
    }));

    const measured = Object.values(dimensions).filter((item) => item.status === 'MEASURED');
    const allDimensionsMeasured = measured.length === Object.keys(DIMENSIONS).length;
    const aggregateScore = measured.length
      ? Math.round(measured.reduce((sum, item) => sum + item.points, 0) / measured.length)
      : null;
    const tier = allDimensionsMeasured ? maturityTier(aggregateScore) : null;

    return {
      evaluationId: `lvl:${Date.now()}`,
      systemName: systemContext.name || 'Fênix Target System',
      status: measured.length === 0 ? 'NOT_EVALUATED' : (allDimensionsMeasured ? 'EVALUATED' : 'PARTIAL'),
      aggregateScore,
      evaluatedDimensions: measured.length,
      totalDimensions: Object.keys(DIMENSIONS).length,
      coveragePercent: Math.round((measured.length / Object.keys(DIMENSIONS).length) * 100),
      level: tier?.level ?? null,
      label: tier?.label || 'NOT_EVALUATED',
      evidenceBased: measured.length > 0,
      dimensions,
      recommendations: Object.entries(dimensions)
        .filter(([, item]) => item.status !== 'MEASURED')
        .map(([key]) => `Colete evidência verificável para ${DIMENSIONS[key]}.`),
      evaluatedAt: new Date().toISOString()
    };
  }
}

function maturityTier(score) {
  if (score >= 86) return { level: 5, label: 'Autonomous Self-Evolving Engine' };
  if (score >= 71) return { level: 4, label: 'Enterprise Production' };
  if (score >= 51) return { level: 3, label: 'Operational Beta' };
  if (score >= 30) return { level: 2, label: 'Connected Alpha' };
  return { level: 1, label: 'Seed Prototype' };
}

const globalSystemLevelEvaluator = new SystemLevelEvaluator();

module.exports = {
  SystemLevelEvaluator,
  globalSystemLevelEvaluator
};
