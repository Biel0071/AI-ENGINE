const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FENIX V7.0/V7.1 Production Activation & ACP Integration Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. VPS Master Node & Self Deploy Pipeline
  const masterStatus = await app.masterNode.getMasterStatus(tenantId, actorId);
  assert.equal(masterStatus.role, 'MASTER_NODE');
  assert.equal(masterStatus.subsystemsCount, 12);
  assert.ok(masterStatus.subsystems['runtime']);

  const pipeline = await app.masterNode.executeSelfDeployPipeline(tenantId, actorId, { version: 'v7.1.0', branch: 'main' });
  assert.equal(pipeline.status, 'SUCCESSFUL');
  assert.equal(pipeline.stages.length, 10);

  const failedPipeline = await app.masterNode.executeSelfDeployPipeline(tenantId, actorId, { version: 'v7.1.1-test', simulateFailure: true });
  assert.equal(failedPipeline.status, 'ROLLED_BACK');

  // 2. Deploy Center & Rollback
  const deploysOverview = await app.deployCenter.getDeployOverview(tenantId, actorId);
  assert.ok(deploysOverview.checkedAt);

  // 3. Observability Center Metrics (contrato honesto: cada campo carrega proveniencia
  // measured/unknown. A versao antiga exigia cpuUsagePercent>0 e database:'HEALTHY' FIXOS --
  // exatamente a simulacao que o modulo devia medir. Agora a RAM do processo e medida de
  // verdade, e a saude da infra deriva dos probes reais em vez de um selo verde inventado.)
  const metrics = await app.observabilityCenter.getMetrics(tenantId, actorId);
  assert.equal(metrics.system.processRssMb.state, 'measured');
  assert.ok(metrics.system.processRssMb.value > 0);
  assert.equal(metrics.system.cpuUsagePercent.state, 'unknown'); // honesto: nao medido por request
  assert.equal(metrics.aiRuntime.totalTokensConsumed.state, 'measured');

  // 4. Cognitive Performance Engine (Hot Memory & Speed Score)
  const hotMemory = await app.cognitivePerformance.getHotMemoryState(tenantId, actorId);
  assert.ok(hotMemory.levels.L0_CONTEXT);

  const speedScore = await app.cognitivePerformance.getSpeedScore(tenantId, actorId);
  assert.ok(speedScore.overallScore > 90);

  const prefetch = await app.cognitivePerformance.prefetchContext(tenantId, actorId, { project: 'CRM' });
  assert.equal(prefetch.status, 'PREFETCH_COMPLETED');

  const pacingHigh = app.cognitivePerformance.getMultiStagePacing('HIGH');
  assert.equal(pacingHigh.pacing, 'HUMANIZED_PROGRESSIVE');

  // 5. Cognitive Optimization Engine (Distillation & Never Repeat Work)
  const distillation = await app.cognitiveOptimization.distillKnowledge(tenantId, actorId);
  assert.ok(distillation.compressionRatio);

  const neverRepeat = await app.cognitiveOptimization.checkNeverDoSameWork(tenantId, actorId, 'Criar um ERP com auth OIDC');
  assert.equal(neverRepeat.alreadyExists, true);
  assert.equal(neverRepeat.recommendation, 'REUSE_EXISTING_CAPABILITY');

  const healthIndex = await app.cognitiveOptimization.getKnowledgeHealth(tenantId, actorId);
  assert.ok(healthIndex.score > 90);

  // 6. Plugin Marketplace & Skill Evolution
  const marketplace = await app.pluginSkills.getMarketplace(tenantId, actorId);
  assert.ok(marketplace.plugins.length >= 3);

  const installResult = await app.pluginSkills.installPlugin(tenantId, actorId, 'plugin-db-architect');
  assert.equal(installResult.plugin.installed, true);

  const skillEvolution = await app.pluginSkills.getSkillEvolution(tenantId, actorId);
  assert.ok(skillEvolution.skills.length >= 2);

  // 7. Cognitive Encryption & Tokenization
  const encStatus = await app.cognitiveEncryption.getEncryptionStatus(tenantId, actorId);
  assert.equal(encStatus.algorithm, 'AES-256-GCM');

  const encrypted = await app.cognitiveEncryption.tokenizeAndEncrypt(tenantId, actorId, 'Sensitive Architecture Credential');
  assert.ok(encrypted.token.startsWith('enc:v71:'));

  const decrypted = await app.cognitiveEncryption.decryptToken(tenantId, actorId, encrypted.token);
  assert.equal(decrypted.decrypted, 'Sensitive Architecture Credential');

  // 8. Interactive NPC Agents in AI City
  const npcs = await app.npcCity.listNpcAgents(tenantId, actorId);
  assert.equal(npcs.npcs.length, 15);

  const npcChat = await app.npcCity.chatWithNpc(tenantId, actorId, 'agent-architect', 'Analisar arquitetura hexagonal');
  assert.equal(npcChat.npcId, 'agent-architect');
  assert.ok(npcChat.npcReply.includes('Arquiteto'));

  // 9. Company Daily Analysis & Calendar
  const dailyReport = await app.companyDailyAnalysis.getDailyReport(tenantId, actorId);
  assert.equal(dailyReport.healthScore, 99.8);

  const calendar = await app.companyDailyAnalysis.getOperationalCalendar(tenantId, actorId);
  assert.ok(calendar.calendar.length >= 4);

  await app.close();
});
