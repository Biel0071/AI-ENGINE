const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { ReverseEngineeringEngine } = require('../src/repo-intel/reverse-engineering-engine');

test('M7: ReverseEngineeringEngine — Ingests, Analyzes & Produces Project Understanding Report', async () => {
  const engine = new ReverseEngineeringEngine();
  const targetDir = path.join(__dirname, '..');

  const report = await engine.ingestAndAnalyze(targetDir, {
    projectName: 'GRG Fenix Core'
  });

  assert.strictEqual(report.projectName, 'GRG Fenix Core');
  assert.strictEqual(report.readyForEdit, true);
  assert.strictEqual(typeof report.metrics.totalFiles, 'number');
  assert.strictEqual(report.metrics.totalFiles > 0, true);

  // Verify Initial DNA v1.0.0 is present
  assert.strictEqual(typeof report.initialDna, 'object');
  assert.strictEqual(report.initialDna.version, 'v1.0.0');
  assert.strictEqual(report.initialDna.projectDna.stack.length > 0, true);
});
