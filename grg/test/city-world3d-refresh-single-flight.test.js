'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');

test('publishing a City snapshot preserves the shared in-flight refresh state', () => {
  const start = source.indexOf('        this.lastCitySnapshot = data;');
  const end = source.indexOf('        // 1. Sync Live Agents', start);
  assert.ok(start >= 0 && end > start, 'City snapshot publication should be available');
  const publication = source.slice(start, end);

  assert.doesNotMatch(publication, /window\.FENIX\.cityWorld\s*=\s*\{\s*snapshot\s*:/,
    'publishing a snapshot must not replace the shared refresh coordinator');
  assert.match(publication, /cityWorld\.snapshot\s*=\s*data/,
    'the snapshot should be updated in place so concurrent consumers retain one coordinator');
});
