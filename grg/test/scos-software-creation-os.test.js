const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FENIX SCOS Software Creation OS Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. Design Intelligence OS (18 Design Families)
  const families = await app.designIntel.listDesignFamilies(tenantId, actorId);
  assert.equal(families.totalCount, 18);

  const tokens = await app.designIntel.getFamilyTokens(tenantId, actorId, 'enterprise');
  assert.equal(tokens.family.name, 'Enterprise');
  assert.equal(tokens.tokens.gridColumns, 12);

  // 2. Application Genome & Visual Reasoning Engine
  const genomeCRM = await app.appGenome.getGenomeStructure(tenantId, actorId, 'CRM');
  assert.equal(genomeCRM.appType, 'CRM');
  assert.ok(genomeCRM.typicalModulesCount >= 7);

  const reasoning = await app.appGenome.evaluateVisualReasoning(tenantId, actorId, {
    targetUser: 'Financial Controller',
    primaryGoal: 'Process invoices with 0 latency',
  });
  assert.equal(reasoning.visualReasoning.desktopMobilePreference, 'DESKTOP_FIRST_RESPONSIVE');

  // 3. Full-Stack Factory & Multi-Design Generator
  const multiDesign = await app.fullstackFactory.generateMultiDesignProposals(tenantId, actorId, { name: 'Hospital ERP' });
  assert.equal(multiDesign.proposalsCount, 4);

  const contractSync = await app.fullstackFactory.syncFrontendBackendContract(tenantId, actorId, {
    contractName: 'InvoicePaymentRoute',
  });
  assert.equal(contractSync.syncStatus, 'SYNCHRONIZED_GREEN');
  assert.equal(contractSync.syncedComponents.length, 5);

  // 4. Creation Evolution Engine
  const evoMetrics = await app.creationEvolution.evaluateDeliveryMetrics(tenantId, actorId, { name: 'CRM Pipeline UI' });
  assert.equal(evoMetrics.capabilityPromoted, true);
  assert.ok(evoMetrics.metrics.performanceScore > 90);

  await app.close();
});
