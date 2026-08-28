'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-visual-ide.js'), 'utf8');

test('Project Mirror UI renders discovered live previews and reads real source code', () => {
  assert.match(source, /screen\?\.previewTarget\?\.path/);
  assert.match(source, /<iframe title="Preview/);
  assert.match(source, /\/project-mirror\/source\?path=/);
  assert.match(source, /sourceResponse\.content/);
  assert.doesNotMatch(source, /Real preview could be rendered here/);
  assert.doesNotMatch(source, /Interactive preview maps to/);
  assert.match(source, /\/project-mirror\/projects/);
  assert.match(source, /data-path=/);
  assert.match(source, /\/project-mirror\/preview\?path=/);
  assert.match(source, /selectedScreenFrame/);
  assert.match(source, /selectedElementContext/);
});

test('screen chat creates a canonical development job with automatic context', () => {
  assert.match(source, /api\('\/v2\/jobs'/);
  assert.match(source, /masterCmdForm/);
  assert.match(source, /window\.runChat\(value\)/);
  assert.match(source, /source:\s*'web'/);
  assert.doesNotMatch(source, /source:\s*'fenix-chat'/);
  for (const field of ['projectId', 'workspaceId', 'screenId', 'route', 'sourceFiles', 'components', 'apiDependencies', 'designSystem', 'runtime', 'gitStatus', 'previewTarget', 'selectedElement']) {
    assert.match(source, new RegExp(`\\b${field}\\b`), field);
  }
  assert.match(source, /allowedPaths:\s*sourceFiles/);
  assert.match(source, /allowDeploy:\s*false/);
});

test('job timeline exposes tests, diff, preview state and rollback without claiming an unavailable preview', () => {
  assert.match(source, /Quality Evidence/);
  assert.match(source, /\/diff/);
  assert.match(source, /diffEvidence\?\.diff/);
  assert.match(source, /job\.result\.preview\?\.status \|\| 'NOT AVAILABLE'/);
  assert.match(source, /\/rollback/);
});
