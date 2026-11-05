'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ProjectAbsorptionEngine } = require('../src/absorption/project-absorption-engine');
const { PatternLibrary } = require('../src/memory/pattern-library');
const { GraphBrain } = require('../src/brain/graph-brain');
const { MemoryGateway } = require('../src/memory/memory-fabric');

test('Screen DNA separates static route discovery from DOM and screenshot evidence', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'grg-screen-dna-'));
  const appOne = path.join(root, 'apps', 'admin');
  const appTwo = path.join(root, 'apps', 'store');
  fs.mkdirSync(appOne, { recursive: true });
  fs.mkdirSync(appTwo, { recursive: true });
  fs.writeFileSync(path.join(appOne, 'index.html'), '<title>App One</title><nav id="app-nav"><button data-nav="settings" onclick="window.showView(\'settings\')">Settings</button></nav><main id="view-projects" style="color:var(--surface)"></main><section id="view-projects"></section><main id="view-settings">Settings</main><style>:root{--surface:#111}</style>');
  fs.writeFileSync(path.join(appTwo, 'index.html'), '<title>App Two</title><main id="view-projects"></main>');

  try {
    const engine = new ProjectAbsorptionEngine({
      patternLibrary: new PatternLibrary(),
      graphBrain: new GraphBrain({ storagePath: path.join(root, 'graph.json') }),
    });
    const report = await engine.absorbProject({ projectId: 'screen-dna-fixture', workspacePath: root });
    const projectScreens = report.screens.filter((screen) => screen.route === '#view-projects');

    assert.equal(projectScreens.length, 2, 'duplicate occurrences within one HTML file collapse, separate app shells remain');
    assert.equal(new Set(projectScreens.map((screen) => screen.screenId)).size, 2, 'same route across app shells gets stable unique screen IDs');
    for (const screen of projectScreens) {
      assert.equal(screen.discoveryStatus, 'SOURCE_DISCOVERED');
      assert.equal(screen.domInspectionStatus, 'NOT_INSPECTED');
      assert.equal(screen.captureStatus, 'NOT_CAPTURED');
      assert.equal(screen.confidence, null, 'source scanning alone is not scored as visual certainty');
      assert.equal(screen.layoutEvidenceStatus, 'INFERRED_FROM_ROUTE');
      assert.ok(screen.applicationId);
      assert.deepEqual(screen.components, [], 'unobserved components are not invented');
      assert.ok(screen.evidence.sourceFiles.length > 0);
    }
    assert.equal(projectScreens.find((screen) => screen.sourceFile.startsWith('apps/admin/')).applicationId, 'apps/admin');
    assert.equal(projectScreens.find((screen) => screen.sourceFile.startsWith('apps/store/')).applicationId, 'apps/store');
    assert.deepEqual(projectScreens.find((screen) => screen.sourceFile.startsWith('apps/admin/')).colors, ['--surface']);
    assert.deepEqual(projectScreens.find((screen) => screen.sourceFile.startsWith('apps/store/')).colors, []);
    const adminProjects = projectScreens.find((screen) => screen.sourceFile.startsWith('apps/admin/'));
    assert.ok(adminProjects.navigationEdges.some((edge) => edge.targetScreenId === 'view-settings' && edge.action === 'Settings'));
    assert.deepEqual(adminProjects.navigationEdges.find((edge) => edge.targetScreenId === 'view-settings'), {
      targetScreenId: 'view-settings', action: 'Settings', evidenceSource: 'STATIC_SOURCE',
      verificationStatus: 'NOT_VERIFIED', sourceFile: 'apps/admin/index.html', sourceLine: 1,
      selector: '#app-nav [data-nav="settings"]',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Memory Gateway preserves explicitly unscored confidence', async () => {
  const memory = new MemoryGateway();
  let stored;
  memory.use({ name: 'fixture', remember: async (_tenantId, _actorId, record) => { stored = record; } });
  await memory.remember('tenant', 'actor', { title: 'Static screen scan', confidence: null });
  assert.equal(stored.confidence, null);
});
