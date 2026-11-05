'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('preview selection is scoped by workspace root and crosses Plan, draft proposal, and project memory', () => {
  const visualIde = read('public/fenix-visual-ide.js');
  const ide = read('public/project-ide-live.js');
  assert.match(visualIde, /getSelectionContext\(projectId\)/);
  assert.match(visualIde, /workspacePath: selectedScreen\.projectPath/);
  assert.match(visualIde, /selectedElement\.selector/);
  assert.doesNotMatch(visualIde.slice(visualIde.indexOf('window.FenixVisualIDE'), visualIde.indexOf('function selectedProjectPath')), /html:/);

  assert.match(ide, /normalize\(selection\.workspacePath\) !== normalize\(projectRoot\)/);
  assert.match(ide, /mode: 'PLAN',[\s\S]{0,100}selectionContext/);
  assert.match(ide, /mode: 'PROPOSE_EDIT',[\s\S]{0,100}selectionContext/);
  assert.match(ide, /selectionContext: plan\.selectionContext \|\| null/);
  assert.match(ide, /getProjectRoot: \(projectId\)/);
});

test('Flow Graph records the selected preview context as a project-scoped observed node', () => {
  const graph = read('public/fenix-flow-graph.js');
  assert.match(graph, /selection\?\.projectId === projectId/);
  assert.match(graph, /source: 'project-mirror-preview'/);
  assert.match(graph, /EDGE_TYPES\.READS, selectionId/);
});
