'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ScreenReconstructionEngine } = require('../src/reconstruction/screen-reconstruction-engine');

test('local reconstruction does not claim unobserved model usage or savings', async () => {
  const engine = new ScreenReconstructionEngine();
  const result = await engine.reconstruct({ targetName: 'Metrics Panel', forceCold: true });

  assert.equal(result.metrics.tokensUsed, null);
  assert.equal(result.metrics.tokensSaved, null);
  assert.equal(result.metrics.apiCalls, 0);
  assert.equal(result.metrics.usageStatus, 'UNMEASURED');
});

test('dual reconstruction does not call a local template comparison proven learning', async () => {
  const engine = new ScreenReconstructionEngine();
  const report = await engine.executeDualLearningLoop({ targetName: 'Metrics Panel' });

  assert.equal(report.status, 'LEARNING_NOT_PROVEN');
  assert.equal(report.isProven, false);
  assert.equal(report.delta.tokensSaved, null);
  assert.equal(report.delta.apiCallsAvoided, null);
  assert.equal(report.delta.tokenSavingsPercent, null);
});

test('cold reconstruction skips absorbed Screen DNA while warm reconstruction records its source', async () => {
  const absorptionEngine = {
    getAbsorbedProject: () => ({
      screens: [{ screenId: 'metrics-panel', title: 'Metrics Panel', components: ['MetricCard'] }],
    }),
  };
  const engine = new ScreenReconstructionEngine({ absorptionEngine });
  const cold = await engine.reconstruct({ targetName: 'Metrics Panel', forceCold: true });
  const warm = await engine.reconstruct({ targetName: 'Metrics Panel' });

  assert.equal(cold.screenDnaSource, 'LOCAL_TEMPLATE');
  assert.equal(cold.knowledgeReused, false);
  assert.equal(warm.screenDnaSource, 'ABSORBED_SCREEN_DNA');
  assert.equal(warm.knowledgeReused, true);
});

test('warm reconstruction does not substitute an unrelated absorbed screen', async () => {
  const engine = new ScreenReconstructionEngine({
    absorptionEngine: {
      getAbsorbedProject: () => ({ screens: [{ screenId: 'login', title: 'Login' }] }),
    },
  });
  const result = await engine.reconstruct({ targetName: 'Billing Overview' });

  assert.equal(result.screenDnaSource, 'LOCAL_TEMPLATE');
  assert.equal(result.knowledgeReused, false);
});

test('external project learning report leaves token savings and transfer unverified', async () => {
  const engine = new ScreenReconstructionEngine();
  const report = await engine.executeExternalProjectLearningLoop({
    targetScreen1: 'Login Card',
    targetScreen2: 'Metrics Overview',
  });

  assert.equal(report.status, 'LEARNING_NOT_PROVEN');
  assert.equal(report.savings.tokensSaved, null);
  assert.equal(report.savings.apiCallsAvoided, null);
  assert.equal(report.savings.tokenSavingsRate, null);
  assert.equal(report.transfer.knowledgeTransferRate, null);
  assert.equal(report.transfer.knowledgeTransferObserved, null);
  assert.equal(report.transfer.knowledgeTransferStatus, 'UNMEASURED');
});
