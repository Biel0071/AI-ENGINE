'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-operational-os.js'), 'utf8');

test('brain graph bounds memory nodes and pauses its animation when hidden', () => {
  assert.match(source, /const visibleMemories = memories\.slice\(0, 120\);/,
    'bound the graph physics to a readable sample');
  assert.match(source, /const isBrainCanvasVisible = \(\) => !disposed && !document\.hidden && canvas\.isConnected/,
    'check visibility before drawing');
  assert.match(source, /document\.addEventListener\('visibilitychange', onBrainVisibilityChange\)/,
    'resume only when the browser returns to the visible session');
  assert.match(source, /window\.addEventListener\('fenix-view-changed', onBrainViewChanged\)/,
    'resume when navigating back to the brain view');
  assert.match(source, /__brainLifecycle\?\.dispose\(\)/,
    'dispose old listeners when the graph is mounted again');
  assert.match(source, /function requestBrainFrame\(\)[\s\S]{0,180}isBrainCanvasVisible\(\)/,
    'do not schedule animation frames for a hidden graph');
});
