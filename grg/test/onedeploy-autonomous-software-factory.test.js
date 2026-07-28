const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FENIX OneDeploy Orchestrator & Autonomous Software Factory Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. OneDeploy Orchestrator 14-Stage Pipeline Execution
  const scan = await app.oneDeploy.scanProject(tenantId, actorId, './ai-engine/grg');
  assert.equal(scan.discovery.frontendFramework.includes('React'), true);

  const pipeline = await app.oneDeploy.runOneDeployPipeline(tenantId, actorId, {
    name: 'GRG FÊNIX Core Release v7.2',
    environment: 'STAGING',
  });
  assert.equal(pipeline.status, 'ONEDEPLOY_SUCCESSFUL');
  assert.equal(pipeline.stagesCount, 12);

  // 2. Frontend & Backend Analyzers
  const feReport = await app.analyzers.analyzeFrontend(tenantId, actorId);
  assert.equal(feReport.frontendReport.status, 'HEALTHY_ZERO_SMELLS');
  assert.equal(feReport.frontendReport.accessibilityScore, 100.0);

  const beReport = await app.analyzers.analyzeBackend(tenantId, actorId);
  assert.equal(beReport.backendReport.status, 'HEALTHY_HEXAGONAL_ALIGNED');
  assert.ok(beReport.backendReport.architectureQualityScore > 99.0);

  // 3. Testing Smoke Engine & E2E Playwright Scenarios
  const smoke = await app.testingSmokeE2e.runSmokeTests(tenantId, actorId, 'STAGING');
  assert.equal(smoke.status, 'ALL_SMOKE_TESTS_PASSED');
  assert.equal(smoke.scenariosCount, 5);

  const e2e = await app.testingSmokeE2e.runE2ePlaywrightScenarios(tenantId, actorId, 'Full Checkout & RBAC Suite');
  assert.equal(e2e.playwrightStatus, 'GREEN_PASS');
  assert.equal(e2e.passedScenariosCount, 18);

  // 4. Continuous Improvement Loop (Idle Scan)
  const continuous = await app.continuousImprovement.runIdleImprovementScan(tenantId, actorId);
  assert.equal(continuous.idleScanStatus, 'COMPLETED_BACKLOG_GENERATED');
  assert.ok(continuous.improvementsCount >= 3);

  await app.close();
});
