const test = require('node:test');
const assert = require('node:assert/strict');
const { AIOrchestratorKernel } = require('../src/orchestrator/ai-orchestrator');
const { EventBus } = require('../src/kernel/event-bus');

test('Milestone 2 — AI Orchestrator processes Intent, CEO, CTO, Estimator, Router & DAG', async () => {
  const eventBus = new EventBus();
  const orchestrator = new AIOrchestratorKernel({ eventBus });

  const pkg = await orchestrator.processRequest('Crie um CRM para clínica médica');

  assert.ok(pkg.mission.id.startsWith('M-'));
  assert.equal(pkg.mission.objective, 'Crie um CRM para clínica médica');
  assert.equal(pkg.ceoApproval.approved, true);
  assert.ok(pkg.ceoApproval.roiPercentage > 20);
  assert.equal(pkg.architectureBlueprint.componentTree.length, 10);
  assert.equal(pkg.estimation.estimatedCostUsd, 0.75);
  assert.equal(pkg.dagGraph.jobs.length, 5);
  assert.equal(pkg.routingPlan.length, 5);
  assert.equal(pkg.status, 'AWAITING_BUILD_CONFIRMATION');

  const approvedPkg = await orchestrator.approveAndStartBuild(pkg.mission.id);
  assert.equal(approvedPkg.status, 'RELEASE_READY');
  assert.equal(approvedPkg.qualityResult.approved, true);
});

test('Milestone 2 — Mission & Project DNA records genomic footprint', async () => {
  const orchestrator = new AIOrchestratorKernel();
  await orchestrator.processRequest('Criar ERP com checkout PIX');

  const projectDna = orchestrator.getProjectDna();
  assert.equal(projectDna.executionHistory.length, 1);
  assert.equal(projectDna.executionHistory[0].objective, 'Criar ERP com checkout PIX');
});
