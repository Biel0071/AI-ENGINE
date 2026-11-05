'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/iso-city.js'), 'utf8');

test('city nameplates never invent agent-specific financial telemetry', () => {
  assert.equal(/agent\.id\s*===\s*'agent-(?:marcos|silva)'/.test(source), false, 'agent IDs must not select sample financial values');
  assert.equal(/\+\$4\.10|\+\$2\.58/.test(source), false, 'rendered financial values must come from runtime payload');
  assert.match(source, /agent\.profit\s*!=\s*null\s*\|\|\s*agent\.profitPill\s*!=\s*null/);
});
