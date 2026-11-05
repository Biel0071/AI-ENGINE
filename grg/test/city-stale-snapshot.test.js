'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');

test('City preserves the last rendered agents but marks the snapshot stale after a runtime failure', () => {
  assert.equal(/this\.telemetryStatus\s*=\s*this\.agents\?\.size\s*\?\s*'STALE'\s*:\s*'UNAVAILABLE'/.test(source), true);
  assert.equal(/Cidade desatualizada/.test(source), true);
  assert.equal(/lastCitySnapshotAt\s*=\s*Date\.now\(\)/.test(source), true);
  assert.equal(/if\s*\(!this\.agents\s*\|\|\s*this\.agents\.size\s*===\s*0\)\s*this\._showWorldReadFailure/.test(source), false);
});

test('City distinguishes the initial connection state from confirmed telemetry failure', () => {
  assert.ok(/this\.telemetryStatus\s*=\s*'CONNECTING'/.test(source), 'the first paint needs an explicit connecting state');
  assert.ok(/this\.telemetryStatus\s*===\s*'CONNECTING'\s*\?\s*'Sincronizando telemetria…'/.test(source), 'pending telemetry must not be labeled unavailable');
});
