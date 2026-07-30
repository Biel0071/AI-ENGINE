const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FENIX (OMEGA) Living Cognitive Operating System Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. Universal Cognitive Fabric & Cognitive Density
  const atom = await app.cognitiveAtomsFabric.createCognitiveAtom(tenantId, actorId, {
    type: 'ARCHITECTURE_PATTERN',
    content: 'Hexagonal ports and adapters for microservices',
  });
  assert.equal(atom.type, 'ARCHITECTURE_PATTERN');
  assert.equal(atom.stage, 'ATOM');

  const density = await app.cognitiveAtomsFabric.getCognitiveDensity(tenantId, actorId);
  assert.ok(density.overallDensityScore > 90);
  assert.equal(density.distillationLevel, 'LIVING_INTELLIGENCE_CORE');

  // 2. Brain Federation & Knowledge Fusion Engine
  const brains = await app.brainFederation.listDomainBrains(tenantId, actorId);
  assert.equal(brains.brains.length, 20);

  const fusion = await app.brainFederation.fuseKnowledge(tenantId, actorId, {
    sourceDomain: 'backend',
    targetDomain: 'architecture',
  });
  assert.equal(fusion.sourceDomain, 'backend');
  assert.equal(fusion.targetDomain, 'architecture');

  // 3. Executive Cognitive Council Governance
  const councilMembers = await app.cognitiveCouncil.getCouncilMembers(tenantId, actorId);
  assert.equal(councilMembers.members.length, 6);

  const evaluation = await app.cognitiveCouncil.evaluateProposal(tenantId, actorId, {
    title: 'Optimize REST Serialization for Zero-Copy Streaming',
    description: 'Implement buffer streaming to reduce TTFB by 40%',
  });
  // Conselho honesto: sem assentos staffed e sem votos reais lidos do ApprovalEngine, uma
  // proposta recem-aberta decide NADA (antes: APPROVED_BY_COUNCIL unanime fabricado, sem revisao).
  assert.equal(evaluation.status, 'PENDING_REVIEW');
  assert.equal(evaluation.unanimous, false);

  // 4. Context Elimination & Model Economy Engine
  const routeCheckLocal = await app.modelEconomy.evaluateTaskRoute(tenantId, actorId, 'Criar um ERP com auth OIDC');
  assert.equal(routeCheckLocal.useModel, false);
  assert.equal(routeCheckLocal.recommendedProvider, 'LOCAL_DISTILLED_ENGINE');

  const routeCheckComplex = await app.modelEconomy.evaluateTaskRoute(tenantId, actorId, 'Solve complex unknown problem in robotics');
  assert.equal(routeCheckComplex.useModel, true);

  // 5. Autonomous Research & Self-Improvement Loop
  const research = await app.autonomousResearch.runResearchCycle(tenantId, actorId, 'High-Performance Node.js Clustering');
  assert.equal(research.topic, 'High-Performance Node.js Clustering');
  assert.equal(research.promotedToGenome, true);

  await app.close();
});
