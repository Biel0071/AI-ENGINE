const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..', 'public');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const js = readFileSync(join(root, 'unified-app.js'), 'utf8');
const css = readFileSync(join(root, 'unified.css'), 'utf8');

test('unified workspace exposes all primary command navigation districts', () => {
  for (const nav of ['command', 'runtime', 'missions', 'city', 'office', 'projects', 'knowledge', 'skills', 'connectors', 'deploy', 'observability', 'security', 'developer']) {
    assert.match(html, new RegExp(`data-nav="${nav}"`));
  }
  assert.match(html, /FENIX OS/);
  assert.match(css, /\.app-shell/);
});

test('console consumes real operational contracts from unified controller', () => {
  for (const endpoint of ['/avatar/message', '/overview', '/missions', '/city', '/office', '/projects', '/skills', '/connectors', '/governance/readiness-matrix', '/observability/series', '/security/encryption/status', '/onedeploy/scan-project', '/dev/fs', '/dev/fs/move', '/dev/ai/transform-file', '/dev/terminal', '/dev/projects/clone']) {
    assert.ok(js.includes(endpoint), `missing endpoint ${endpoint}`);
  }
});

test('operational console bar is data-driven, not frozen literals', () => {
  assert.doesNotMatch(html, /98\.4 \/ 100/, 'the invented speed score must not be hardcoded');
  assert.doesNotMatch(html, /L0-L5 PREWARMED/, 'the invented hot memory state must not be hardcoded');
  assert.doesNotMatch(html, /15 Especialistas NPCs/, 'the invented agent count must not be hardcoded');
  assert.doesNotMatch(html, /VPS ONLINE/, 'the invented master node status must not be hardcoded');
});

test('operational messages go through the Master Avatar and refresh mission state', () => {
  assert.match(js, /api\('\/avatar\/message'/);
  assert.match(js, /refreshAll\(\)/);
});

test('developer district exposes an actual file editor and terminal feedback loop', () => {
  for (const id of ['gitCloneForm', 'gitRepoUrl', 'gitRepoDir', 'gitCloneResult', 'fsPath', 'fsLoadBtn', 'currentFilePath', 'fileViewer', 'fileSaveBtn', 'terminalCmd', 'terminalBtn', 'terminalResult']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing control ${id}`);
  }
  assert.match(js, /saveFile/);
  assert.match(js, /pollTerminal/);
  assert.match(js, /cloneProject/);
});

test('developer IDE Studio exposes live preview, AI editing, move and agent delegation', () => {
  for (const id of ['livePreviewFrame', 'livePreviewText', 'previewRefreshBtn', 'aiEditInstruction', 'aiEditBtn', 'aiEditResult', 'moveFromPath', 'moveToPath', 'movePathBtn', 'moveResult', 'devAgentObjective', 'devAgentBtn', 'devAgentResult']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing IDE control ${id}`);
  }
  for (const fn of ['renderLivePreview', 'transformOpenFile', 'movePath', 'delegateDevAgents']) {
    assert.match(js, new RegExp(`function ${fn}`), `missing IDE function ${fn}`);
  }
});
