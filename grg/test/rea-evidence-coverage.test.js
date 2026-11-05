'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ReaIntelligenceEngine } = require('../src/services/rea-intelligence-engine');

function engine() {
  return new ReaIntelligenceEngine({ memoryIndex: { getStatus: () => ({ summary: { filesCount: 0 } }), recordActivity() {} } });
}

test('REA reports its embedded scanner without claiming the external rea-agents package is installed', () => {
  let packageInstalled = true;
  try { require.resolve('rea-agents'); } catch { packageInstalled = false; }
  const status = engine().reaPackageStatus;
  assert.equal(status.installed, packageInstalled);
  if (!packageInstalled) {
    assert.equal(status.mode, 'embedded');
    assert.equal(status.version, null);
    assert.equal(status.engine, 'fenix-rea-evidence-graph-engine');
  }
});

test('REA separates runtime routes from test and tooling route literals', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-route-scope-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  await fs.mkdir(path.join(workspace, 'src'), { recursive: true });
  await fs.mkdir(path.join(workspace, 'test'), { recursive: true });
  await fs.mkdir(path.join(workspace, 'scripts'), { recursive: true });
  await fs.writeFile(path.join(workspace, 'src', 'routes.js'), "app.get('/api/live', handler);\n");
  await fs.writeFile(path.join(workspace, 'src', 'client.js'), "fetch('/api/remote');\n");
  await fs.writeFile(path.join(workspace, 'test', 'routes.test.js'), "assert('/api/test-only');\n");
  await fs.writeFile(path.join(workspace, 'scripts', 'probe.js'), "const endpoint = '/api/tool-only';\n");

  const evidence = engine().analyzeProject(workspace, { projectId: 'route-fixture', maxFiles: 30 });
  assert.ok(evidence.routes.some((route) => route.path === '/api/live' && route.kind === 'EXPOSES'));
  assert.ok(evidence.routes.some((route) => route.path === '/api/remote' && route.kind === 'CALLS'));
  assert.equal(evidence.metrics.routesDetected, 1);
  assert.equal(evidence.metrics.apiCallsDetected, 1);
});

test('REA evidence marks a capped project scan as incomplete', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-file-limit-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  for (let index = 0; index < 35; index += 1) await fs.writeFile(path.join(workspace, `module-${index}.js`), `module.exports = ${index};\n`);

  const evidence = engine().analyzeProject(workspace, { projectId: 'limit-fixture', maxFiles: 30 });
  assert.equal(evidence.metrics.scannedFilesCount, 30);
  assert.equal(evidence.metrics.fileLimit, 30);
  assert.equal(evidence.metrics.filesTruncated, true);
});

test('REA prioritizes application source over test and tooling files when capped', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-source-priority-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  await fs.mkdir(path.join(workspace, 'src'), { recursive: true });
  await fs.mkdir(path.join(workspace, 'test'), { recursive: true });
  await fs.writeFile(path.join(workspace, 'src', 'server.js'), "app.get('/api/live', handler);\n");
  for (let index = 0; index < 40; index += 1) await fs.writeFile(path.join(workspace, 'test', `case-${index}.js`), `const caseId = ${index};\n`);

  const evidence = engine().analyzeProject(workspace, { projectId: 'source-priority-fixture', maxFiles: 30 });
  assert.ok(evidence.applicationGraph.nodes.some((node) => node.path === 'src/server.js'));
  assert.ok(evidence.routes.some((route) => route.path === '/api/live' && route.file === 'src/server.js'));
  assert.equal(evidence.metrics.filesTruncated, true);
});
