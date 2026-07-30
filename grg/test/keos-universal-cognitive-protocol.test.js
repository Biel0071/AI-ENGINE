const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FENIX KEOS Knowledge Execution Operating System Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. Universal Cognitive Protocol (UCP 13-stage Ingestion & Validation)
  const ucpResult = await app.ucp.processInput(tenantId, actorId, {
    type: 'AI_RESPONSE',
    payload: { model: 'claude-3.5-sonnet', proposal: 'Refactor Auth middleware to zero-trust bearer token validation' },
  });
  // UCP honesto: INGEST/VALIDATE/CLASSIFY executam de verdade (hash real); os estagios que
  // dependem de embedding/simulacao ausentes sao NOT_IMPLEMENTED. Sem truthConfidenceScore fixo.
  assert.equal(ucpResult.inputType, 'AI_RESPONSE');
  assert.ok(ucpResult.payloadHash, 'o payload e enderecado por hash real');
  assert.equal(ucpResult.stagesCompleted, 3); // 3 reais executados; os demais NOT_IMPLEMENTED
  assert.equal(ucpResult.stages.find((s) => s.stage === 4).status, 'NOT_IMPLEMENTED');

  // 2. Universal AI & Technology Adapters
  const aiAdapter = await app.universalAdapters.invokeAiAdapter(tenantId, actorId, 'deepseek-r1', 'Optimize GraphQL query engine');
  assert.equal(aiAdapter.provider, 'deepseek-r1');
  assert.equal(aiAdapter.status, 'PROPOSAL_GENERATED_PENDING_UCP_VALIDATION');

  const techAdapter = await app.universalAdapters.invokeTechAdapter(tenantId, actorId, 'MCP', 'vector-qdrant');
  assert.equal(techAdapter.techType, 'MCP');
  assert.equal(techAdapter.status, 'CONTRACT_VERIFIED_OPERATIONAL');

  // 3. Configurable Production Pipeline with Policy Gates
  const manualGatePromotion = await app.configurablePipeline.promoteChange(tenantId, actorId, {
    title: 'Update Database Migrations for Multi-Tenancy',
    autoApprove: false,
  });
  assert.equal(manualGatePromotion.currentStage, 'Ready for Review');
  assert.equal(manualGatePromotion.pipelineStages.length, 11);

  const autoGatePromotion = await app.configurablePipeline.promoteChange(tenantId, actorId, {
    title: 'Hotfix CSS Alignment in Sidebar',
    autoApprove: true,
  });
  assert.equal(autoGatePromotion.currentStage, 'Production');
  assert.equal(autoGatePromotion.policyAutoApproved, true);

  // 4. Expanded Constitution Index & Ultra-Sparse Loader
  // O indice nao pode manter um total paralelo ao do KOS: ele COMPOE o manifesto medido.
  // O contrato antigo exigia `totalConfiguredVolumes === 150` -- um numero que nunca existiu
  // no disco. O teste agora exige que o total venha do envelope de medicao.
  const expandedIndex = await app.expandedConstitutionIndex.getExpandedIndex(tenantId, actorId);
  assert.equal(expandedIndex.totalConfiguredVolumes, undefined);
  assert.ok(['measured', 'unknown'].includes(expandedIndex.totalVolumes.state));
  const kosManifest = await app.kos.getManifest(tenantId, actorId);
  // Duas fontes contando volumes tem de dar o MESMO resultado, senao uma esta inventando.
  assert.deepEqual(expandedIndex.totalVolumes, kosManifest.totalVolumes);
  assert.equal(expandedIndex.status, kosManifest.status === 'AVAILABLE' ? 'OPERATIONAL' : 'UNAVAILABLE');

  const sparseLoad = await app.expandedConstitutionIndex.loadSparseVolumes(tenantId, actorId, [1, 23]);
  // loadedCount conta arquivos que o KOS realmente abriu (bytes reais), nunca o tamanho do
  // array pedido: pedir 2 volumes inexistentes tem de dar 0.
  assert.equal(sparseLoad.loadedCount.state, 'measured');
  assert.equal(sparseLoad.loadedCount.value, sparseLoad.loadedDocuments.length);
  assert.equal(sparseLoad.loadedDocuments.length + sparseLoad.missingDocuments.length, 2);
  // Reducao de tokens exige comparar com e sem loader: nao e mensuravel aqui.
  assert.equal(sparseLoad.tokenReduction.state, 'unknown');
  assert.equal(sparseLoad.tokenReductionPercentage, undefined);

  await app.close();
});
