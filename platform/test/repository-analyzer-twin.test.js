const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { RepositoryAnalyzer } = require('../src/services/repository-analyzer');
const { DigitalTwin } = require('../src/domain/digital-twin');

test('RepositoryAnalyzer analyzes local codebase with zero mock and exact evidence', async () => {
  const analyzer = new RepositoryAnalyzer();
  const platformDir = path.resolve(__dirname, '..');

  const result = await analyzer.analyzeDirectory(platformDir);

  assert.ok(result.revision, 'must have git revision or tree sha');
  assert.ok(result.treeHash, 'must have sha256 tree hash');
  assert.equal(result.confidence, 'CONFIRMED');
  assert.ok(result.metrics.totalFiles > 5);
  assert.ok(result.services.length > 0, 'must detect services in platform');
  assert.ok(result.routes.length > 0, 'must detect routes in platform');

  // Verifica evidência em cada item
  for (const service of result.services) {
    assert.equal(service.classification, 'CONFIRMED');
    assert.match(service.sourceLocation, /^[^:]+:\d+$/);
  }

  for (const route of result.routes) {
    assert.equal(route.classification, 'CONFIRMED');
    assert.match(route.sourceLocation, /^[^:]+:\d+$/);
  }
});

test('DigitalTwin syncs from real analysis and simulates mutation impact', async () => {
  const analyzer = new RepositoryAnalyzer();
  const platformDir = path.resolve(__dirname, '..');
  const analysis = await analyzer.analyzeDirectory(platformDir);

  const twin = new DigitalTwin({ projectId: 'ai-engine-platform', tenantId: 'fenix-tenant' });
  const syncResult = twin.syncFromAnalysis(analysis);

  assert.ok(syncResult.nodeCount > 0);
  assert.equal(syncResult.treeHash, analysis.treeHash);

  // Simula impacto de mutação localizada em store
  const sim = twin.simulateImpact({
    target: 'store',
    mutationType: 'refactor',
  });

  assert.ok(sim.simulationId);
  assert.ok(sim.affectedNodesCount > 0);
  assert.ok(['APPROVED_BY_SIMULATOR', 'WARNING_MANUAL_REVIEW'].includes(sim.status));
  assert.ok(sim.simulatedMetrics.impactScore >= 0);
});
