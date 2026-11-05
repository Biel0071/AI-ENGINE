'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-v8-ui.js'), 'utf8');

test('hidden V8 drawer does not fetch jobs or projects until opened', () => {
  const initStart = source.indexOf('  function init() {');
  const initEnd = source.indexOf('\n  }', initStart);
  const init = source.slice(initStart, initEnd);
  assert.ok(initStart >= 0 && initEnd > initStart, 'V8 init function should exist');
  assert.doesNotMatch(init, /setTimeout\(load(?:Jobs|Projects),/);
  assert.match(source, /function togglePanel\(\)[\s\S]*?if \(p && p\.style\.display === 'flex'\)\s*\{\s*loadJobs\(\);\s*loadProjects\(\);/);
});

test('V8 polling performs no background job or project refresh while its drawer is closed', () => {
  const initStart = source.indexOf('  function init() {');
  const initEnd = source.indexOf('\n  }', initStart);
  const init = source.slice(initStart, initEnd);
  assert.match(init, /setInterval\(\(\) => \{ if \(panelIsOpen\(\)\) updMetrics\(\); \}, 15000\)/);
  assert.match(init, /setInterval\(\(\) => \{ if \(panelIsOpen\(\)\) loadJobs\(\); \}, 20000\)/);
  assert.match(init, /setInterval\(\(\) => \{ if \(panelIsOpen\(\)\) loadProjects\(\); \}, 60000\)/);
  assert.match(source, /function panelIsOpen\(\)\s*\{\s*return !document\.hidden && document\.getElementById\('fv8-panel'\)\?\.style\.display === 'flex';/);
});
