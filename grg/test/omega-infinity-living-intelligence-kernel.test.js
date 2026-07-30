const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FENIX (OMEGA INFINITY) Living Intelligence Kernel Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. LAW 001 honesta: o veredito DERIVA das medicoes reais (antes era true incondicional com
  // deltas fabricados). Com melhoria medida e sem regressao -> COMPLIANT.
  const lawProof = await app.cognitiveLaws.verifyLaw001(tenantId, actorId, {
    name: 'Compress Memory Footprint to 5k Capabilities',
    measurements: { tokens: { before: 5000, after: 3000 }, speed: { before: 100, after: 140 } },
  });
  assert.equal(lawProof.verdict, 'COMPLIANT');
  assert.equal(lawProof.law001Compliant, true);
  assert.ok(lawProof.improvedMetrics.includes('tokens'));

  // 2. Intelligence Crystal honesto: sem capsula no store, nodesCount medido = 0 e as taxas
  // se declaram unknown (antes: nodesCount 1420 e duplicationRate 0.0 fabricados).
  const crystal = await app.selfEvolutionKernel.getIntelligenceCrystalState(tenantId, actorId);
  assert.equal(crystal.nodesCount.value, 0);
  assert.equal(crystal.duplicationRate.state, 'unknown');

  // 3. Cognitive DNA Compiler (Intention DNA)
  const dna = await app.cognitiveDnaCompiler.compileToIntentionDna(tenantId, actorId, {
    title: 'Hospital Enterprise Microservices',
    content: 'Full hospital system with 100+ modules and zero raw code bloat',
  });
  assert.ok(dna.dnaHash.includes('HOSPITAL'));
  assert.ok(dna.compressionRatio > 100);

  // 4. Living Physics & Recursive Universe
  const universe = await app.livingPhysics.inspectUniverse(tenantId, actorId, 'CRM');
  assert.equal(universe.universeName, 'CRM');
  assert.equal(universe.physics.energyLevel, 'HIGH_POTENTIAL');

  // 5. Reality Feedback Engine (Deployment Result Learning)
  const feedback = await app.realityFeedback.processDeploymentFeedback(tenantId, actorId, { success: true });
  assert.equal(feedback.success, true);
  assert.ok(feedback.capabilityWeightDelta > 0);

  // 6. Meta Consciousness & Universal Intelligence Index
  const index = await app.metaConsciousness.getUniversalIntelligenceIndex(tenantId, actorId);
  assert.ok(index.universalIntelligenceIndex > 99.0);
  assert.equal(index.indicators.productionSuccessRate, 1.00);

  await app.close();
});
