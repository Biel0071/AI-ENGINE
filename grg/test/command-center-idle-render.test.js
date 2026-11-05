'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'command-center.js'), 'utf8');

test('command-center bundle does not run a page-wide animation-frame telemetry loop', () => {
  assert.doesNotMatch(source, /function measureCPU\s*\([\s\S]*?requestAnimationFrame\(measureCPU\)/,
    'the hidden command view must not schedule a continuous animation-frame loop');
});
