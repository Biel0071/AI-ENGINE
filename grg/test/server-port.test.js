const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveCanonicalPort } = require('../src/server');

test('canonical runtime defaults to 4400 even when generic PORT is set', () => {
  assert.equal(resolveCanonicalPort({ PORT: '4000' }), 4400);
});

test('canonical runtime honors FENIX-specific port variables', () => {
  assert.equal(resolveCanonicalPort({ FENIX_PORT: '4500', PORT: '4000' }), 4500);
  assert.equal(resolveCanonicalPort({ GRG_PORT: '4600', PORT: '4000' }), 4600);
});

test('canonical runtime falls back to 4400 for invalid FENIX port', () => {
  assert.equal(resolveCanonicalPort({ FENIX_PORT: 'abc' }), 4400);
  assert.equal(resolveCanonicalPort({ FENIX_PORT: '-1' }), 4400);
});
