'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const ideSource = fs.readFileSync(path.join(publicDir, 'project-ide-live.js'), 'utf8');

test('workspace-mode: 4 buttons present in mode selector toolbar', () => {
  assert.ok(htmlSource.includes('id="btnIdeModeCode"'), 'Code button must exist');
  assert.ok(htmlSource.includes('id="btnIdeModePreview"'), 'Preview button must exist');
  assert.ok(htmlSource.includes('id="btnIdeModeSplit"'), 'Split button must exist');
  assert.ok(htmlSource.includes('id="btnIdeModeWorld"'), 'World button must exist');
});

test('workspace-mode: DOM panes present for each mode', () => {
  assert.ok(htmlSource.includes('id="fenixIdeEditorArea"'), 'Editor area must exist');
  assert.ok(htmlSource.includes('id="fenixIdePreviewPane"'), 'Preview pane must exist');
  assert.ok(htmlSource.includes('id="fenixIdeWorldPane"'), 'World pane must exist');
  assert.ok(htmlSource.includes('id="fenixIdeWorldMount"'), 'World mount container must exist');
});

test('workspace-mode: setMode controller switches active pane and updates copilot context', () => {
  assert.match(ideSource, /function setMode\(newMode\)/);
  assert.match(ideSource, /window\.fenixCopilot\?\.updateContext\(\{\s*mode:\s*state\.mode\s*\}\)/);
});
