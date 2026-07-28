const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FÊNIX UIOS Universal Intelligence Operating System Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. Knowledge Operating System (KOS Manifest & Semantic Loader)
  const manifest = await app.kos.getManifest(tenantId, actorId);
  assert.equal(manifest.totalVolumes, 51);
  assert.equal(manifest.status, 'OPERATIONAL_KNOWLEDGE_GRAPH');

  const semanticContext = await app.kos.loadSemanticContext(tenantId, actorId, [0, 1, 2, 3, 10, 22, 23]);
  assert.equal(semanticContext.requestedVolumesCount, 7);
  assert.ok(semanticContext.tokenReductionPercentage > 90);

  // 2. Capability Operating System (CapOS) Registry
  const registeredCap = await app.capOs.registerCapability(tenantId, actorId, {
    name: 'Hexagonal REST Controller Generator',
    domain: 'backend',
  });
  assert.equal(registeredCap.name, 'Hexagonal REST Controller Generator');
  assert.equal(registeredCap.version, '1.0.0');

  const capList = await app.capOs.listCapabilities(tenantId, actorId);
  assert.ok(capList.total >= 1);

  // 3. Mission Compiler (Objective to DAG Compilation)
  const dag = await app.missionCompiler.compileObjectiveToDag(tenantId, actorId, 'Criar SaaS ERP com PIX');
  assert.equal(dag.objective, 'Criar SaaS ERP com PIX');
  assert.ok(dag.dagStepsCount >= 10);

  // 4. Universal World Model & Artifact Factory
  const worldState = await app.worldModelFactory.getWorldState(tenantId, actorId);
  assert.equal(worldState.ecosystem.masterNodeStatus, 'ONLINE_VPS_MASTER');

  const artifact = await app.worldModelFactory.createArtifact(tenantId, actorId, {
    type: 'PLUGIN',
    name: 'WhatsApp CRM Sync Engine',
  });
  assert.equal(artifact.type, 'PLUGIN');
  assert.equal(artifact.constitutionCompliant, true);

  await app.close();
});
