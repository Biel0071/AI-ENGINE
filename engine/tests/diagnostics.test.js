const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { scanProject } = require('../projectScanner');
const { analyzeArchitecture } = require('../architectureAnalyzer');
const { runDiagnostics } = require('../diagnosticEngine');

async function createMockProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-engine-diagnostics-'));
  await fs.mkdir(path.join(root, 'backend', 'routes'), { recursive: true });
  await fs.mkdir(path.join(root, 'backend', 'services'), { recursive: true });

  await fs.writeFile(path.join(root, 'backend', 'routes', 'health.routes.js'), 'module.exports = {};', 'utf8');
  await fs.writeFile(
    path.join(root, 'backend', 'services', 'feature.service.js'),
    "const axios = require('axios'); module.exports = axios;",
    'utf8'
  );
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'mock-diagnostics', dependencies: {} }), 'utf8');

  return root;
}

test('diagnosticEngine detects missing dependencies and route-entrypoint risk', async () => {
  const root = await createMockProject();
  const scanResult = await scanProject(root);
  const architecture = await analyzeArchitecture(scanResult);
  const diagnostics = await runDiagnostics(scanResult, architecture);

  assert.ok(Array.isArray(diagnostics.missingDependencies));
  assert.ok(diagnostics.missingDependencies.some((item) => item.dependency === 'axios'));

  assert.ok(Array.isArray(diagnostics.brokenRoutes));
  assert.ok(diagnostics.brokenRoutes.length > 0);
});
