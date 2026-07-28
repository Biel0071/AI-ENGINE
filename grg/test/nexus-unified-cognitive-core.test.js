const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FENIX NEXUS Unified Cognitive Core Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. Unified Cognitive Core (UCC) & Cognitive Event Bus
  const uccStatus = await app.ucc.getUccStatus(tenantId, actorId);
  assert.equal(uccStatus.status, 'OPERATIONAL_NEXUS_CORE');
  assert.equal(uccStatus.architecturePillars.length, 5);

  const eventEmit = await app.ucc.emitCognitiveEvent(tenantId, actorId, {
    type: 'DEPLOY_FINISHED',
    payload: { release: 'v7.2-master', status: 'SUCCESS' },
  });
  assert.equal(eventEmit.type, 'DEPLOY_FINISHED');

  // 2. Executive Cognitive Timeline
  const timeline = await app.nexusTimeline.getTimelineFeed(tenantId, actorId);
  assert.ok(timeline.feed.length >= 4);

  // 3. Executive Command Center & Reality Digital Twin Impact Simulation
  const commandMetrics = await app.commandCenter.getCommandCenterMetrics(tenantId, actorId);
  assert.equal(commandMetrics.systemName, 'GRG FÊNIX Ω∞');
  assert.equal(commandMetrics.metrics.intelligenceScore, 96.4);

  const simulation = await app.commandCenter.simulateImpact(tenantId, actorId, {
    action: 'Replace Redis Cache with Valkey High-Performance Engine',
  });
  assert.equal(simulation.simulatedImpact.recommendation, 'PROCEED_WITH_MIGRATION');

  // 4. Cognitive Marketplace
  const published = await app.cognitiveMarketplace.publishArtifact(tenantId, actorId, {
    type: 'CAPABILITY',
    name: 'Hexagonal REST Controller Adapter',
  });
  assert.equal(published.type, 'CAPABILITY');

  const mktList = await app.cognitiveMarketplace.listPublishedArtifacts(tenantId, actorId);
  assert.ok(mktList.total >= 1);

  await app.close();
});
