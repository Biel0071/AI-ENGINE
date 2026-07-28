const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FÊNIX Ω (OMEGA) V2.0 Collective Intelligence & Human COP Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. Collective Intelligence Engine (Multi-Model Consensus & Debate)
  const consensus = await app.collectiveIntelligence.runMultiModelConsensus(tenantId, actorId, 'Design Zero-Trust Security for API', ['deepseek-r1', 'qwen-2.5-coder']);
  assert.equal(consensus.modelsConsulted.length, 2);
  assert.ok(consensus.consensusAnswer.includes('FÊNIX Ω COLLECTIVE CONSENSUS'));
  assert.ok(consensus.absorbedCapsuleId);

  const modelRankings = await app.collectiveIntelligence.getModelRankings(tenantId, actorId);
  assert.equal(modelRankings.topRecommendedForCode, 'qwen-2.5-coder');

  // 2. Recursive Intelligence Loop (RIL)
  const refinement = await app.recursiveIntelligence.executeRecursiveLoop(tenantId, actorId, 'Optimize Docker Rootless Sandbox Container Start');
  assert.equal(refinement.stages.length, 7);
  assert.ok(refinement.finalQualityScore > 95);

  // 3. Intention Engine & Context Expansion Compiler
  const expansion = await app.contextExpansion.expandIntention(tenantId, actorId, 'Criar um CRM');
  assert.equal(expansion.detectedKind, 'CRM');
  assert.ok(expansion.modulesCount >= 10);
  assert.equal(expansion.compiledTokenEquivalent, 300000);

  // 4. Human Digital Twin & Cognitive Operating Profile (COP)
  const cop = await app.humanDigitalTwin.getCognitiveOperatingProfile(tenantId, actorId);
  assert.equal(cop.profile.architecture.pattern, 'Node.js Express Hexagonal + React Frontend');
  assert.ok(cop.engineeringDnaScore > 90);

  // 5. Engineering Autopilot
  const autopilot = await app.humanDigitalTwin.runAutopilot(tenantId, actorId, 'Continua');
  assert.equal(autopilot.status, 'AUTOPILOT_DISPATCHED');
  assert.equal(autopilot.resolvedContext.currentProject, 'GRG FÊNIX Ω V2.0');

  await app.close();
});
