'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TokenEconomyEngine } = require('../src/ai/token-economy-engine');

test('efficiency report leaves score and savings unmeasured without an empirical baseline', () => {
  const report = new TokenEconomyEngine().getEfficiencyReport();

  assert.equal(report.devEfficiencyScore, null);
  assert.equal(report.tokenReductionPercent, null);
  assert.equal(report.TOKEN_SAVINGS_RATE, null);
  assert.equal(report.measurementStatus.score, 'UNMEASURED');
  assert.equal(report.measurementStatus.savings, 'UNMEASURED');
  assert.equal(report.metrics.totalTokensSaved, null);
  assert.equal(report.metrics.apiCallsAvoided, null);
  assert.equal(report.baselineComparison.status, 'UNMEASURED');
  assert.equal(report.baselineComparison.baselineTokensPerTask, null);
});

test('efficiency report labels its internal token savings as estimates', () => {
  const engine = new TokenEconomyEngine();
  engine.metrics.tokensSaved = 400;
  engine.metrics.tokensInput = 600;
  const report = engine.getEfficiencyReport();

  assert.equal(report.TOKEN_SAVINGS_RATE, null);
  assert.equal(report.estimatedTokensSaved, 400);
  assert.equal(report.metrics.estimatedTokensSaved, 400);
  assert.equal(report.metrics.usagePrecision, 'ESTIMATED');
  assert.ok(report.estimatedTokenSavingsRate > 0);
});
