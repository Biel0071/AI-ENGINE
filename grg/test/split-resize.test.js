'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const ideSource = fs.readFileSync(path.join(publicDir, 'project-ide-live.js'), 'utf8');
const unifiedCss = fs.readFileSync(path.join(publicDir, 'unified.css'), 'utf8');

test('split-resize: splitDivider element exists in index.html', () => {
  assert.ok(htmlSource.includes('id="fenixIdeSplitDivider"'), 'Split divider must exist in index.html');
});

test('split-resize: initSplitDivider clamps ratio between 20% and 80%', () => {
  assert.match(ideSource, /function initSplitDivider\(\)/);
  assert.match(ideSource, /Math\.max\(0\.2,\s*Math\.min\(0\.8,\s*ratio\)\)/);
});

test('split-resize: split ratio is persisted to localStorage', () => {
  assert.match(ideSource, /localStorage\.setItem\('fenix_ide_split_ratio'/);
  assert.match(ideSource, /localStorage\.getItem\('fenix_ide_split_ratio'\)/);
});
