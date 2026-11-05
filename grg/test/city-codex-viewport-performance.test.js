'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-world-3d.js'), 'utf8');

test('3D City uses the reduced render profile in common split-window viewports', () => {
  assert.match(source, /matchMedia\?\.\('\(max-width:\s*1280px\)'\)\?\.matches/,
    'the Codex split view must activate the compact city profile');
  assert.match(source, /const pixelRatio = Math\.min\(window\.devicePixelRatio \|\| 1, compactViewport \? 1 : 1\.25\)/,
    'the city canvas should cap pixel ratio more aggressively in the Codex split view');
});
