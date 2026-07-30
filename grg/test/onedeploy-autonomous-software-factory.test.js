const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// OneDeploy HONESTO (reescrito). A versao anterior deste teste EXIGIA a simulacao:
// ONEDEPLOY_SUCCESSFUL, accessibilityScore 100, ALL_SMOKE_TESTS_PASSED, passedScenariosCount 18
// -- tudo fabricado sem executar nada. Sob REALITY FIRST, um teste que valida comportamento
// inexistente e divida. Agora prova o contrato honesto: scan real do filesystem, e
// pipeline/analise/testes que declaram NAO-EXECUTADO em vez de fingir sucesso perfeito.

test('OneDeploy honesto: scanProject LE o filesystem real (nao inventa framework)', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  // '.' e o proprio grg/, que TEM package.json (express) e docker-compose reais.
  const scan = await app.oneDeploy.scanProject('grg', 'grg-admin', '.');
  assert.equal(scan.exists, true);
  // grg usa HTTP nativo do Node (sem framework nas deps: pg/redis/bullmq/jose/aws-sdk), entao
  // backendFramework e honestamente `unknown` -- o scan NAO inventa "Express". Mas o dependency
  // count e MEDIDO do package.json real, e o docker-compose real e detectado.
  assert.equal(scan.discovery.backendFramework.state, 'unknown');
  assert.equal(scan.discovery.dependencyCount.state, 'measured');
  assert.ok(scan.discovery.dependencyCount.value >= 5);
  assert.match(scan.discovery.dependencyCount.source, /^fs:/);
  assert.equal(scan.discovery.containers.state, 'measured');
  await app.close();
});

test('OneDeploy honesto: scan de path inexistente reporta ausencia, nao framework fixo', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  const scan = await app.oneDeploy.scanProject('grg', 'grg-admin', './nao-existe-xyz-9271');
  assert.equal(scan.exists, false);
  assert.equal(scan.discovery.frontendFramework.state, 'unknown');
  await app.close();
});

test('OneDeploy honesto: pipeline sem executor NAO finge sucesso', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  const pipeline = await app.oneDeploy.runOneDeployPipeline('grg', 'grg-admin', { name: 'Release X', environment: 'STAGING' });
  assert.equal(pipeline.status, 'NOT_EXECUTED'); // antes: ONEDEPLOY_SUCCESSFUL sem rodar
  assert.ok(pipeline.reason);
  assert.ok(pipeline.stages.every((s) => s.status === 'PENDING'));
  await app.close();
});

test('OneDeploy honesto: analyzers sem analisador real devolvem unknown, nao score 100', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  const fe = await app.analyzers.analyzeFrontend('grg', 'grg-admin');
  assert.equal(fe.frontendReport.state, 'unknown');
  assert.ok(!JSON.stringify(fe).includes('HEALTHY_ZERO_SMELLS'));
  await app.close();
});

test('OneDeploy honesto: smoke/E2E sem runner declaram NAO-EXECUTADO, nao GREEN_PASS/18', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  const smoke = await app.testingSmokeE2e.runSmokeTests('grg', 'grg-admin', 'STAGING');
  assert.equal(smoke.result.state, 'unknown');
  assert.ok(!JSON.stringify(smoke).includes('ALL_SMOKE_TESTS_PASSED'));
  const e2e = await app.testingSmokeE2e.runE2ePlaywrightScenarios('grg', 'grg-admin', 'Suite');
  assert.equal(e2e.result.state, 'unknown');
  assert.ok(!JSON.stringify(e2e).includes('GREEN_PASS'));
  await app.close();
});

test('OneDeploy honesto: improvement scan vazio e honesto, nao 3 itens inventados', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  const scan = await app.continuousImprovement.runIdleImprovementScan('grg', 'grg-admin');
  assert.equal(scan.improvementsCount, 0);
  assert.equal(scan.idleScanStatus, 'NO_PROPOSALS_YET');
  assert.ok(!JSON.stringify(scan).includes('zero-copy streaming'));
  await app.close();
});
