const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { ProjectUnderstandingScanner } = require('../src/repo-intel/project-understanding-scanner');

test('M6: ProjectUnderstandingScanner — Scans Codebase & Detects Full Topology', async () => {
  const scanner = new ProjectUnderstandingScanner();
  
  // Scan the actual grg directory
  const targetDir = path.join(__dirname, '..');
  const result = await scanner.scan(targetDir);

  assert.strictEqual(result.totalFiles > 20, true);
  assert.strictEqual(typeof result.detectedStack, 'object');

  // Verify Node.js stack was detected with high confidence
  const nodeStack = result.detectedStack.find(s => s.name === 'nodejs');
  assert.strictEqual(Boolean(nodeStack), true);
  assert.strictEqual(nodeStack.confidence >= 0.8, true);

  // Verify entry points found
  assert.strictEqual(result.entryPoints.length > 0, true);

  // Verify routes detected
  assert.strictEqual(result.routes.length > 0, true);
});
