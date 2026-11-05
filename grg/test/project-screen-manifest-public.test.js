'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('public screen manifest stays synchronized with the reviewed QA manifest', () => {
  const reviewed = require('../qa/frontend-screen-manifest.json');
  const published = require('../public/project-screen-manifest.json');
  assert.deepEqual(published, reviewed);
  assert.equal(Object.keys(published.screens || {}).length, 15, 'the public manifest should describe all canonical shell screens');
});
