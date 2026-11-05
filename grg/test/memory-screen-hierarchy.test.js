'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '../public/memory-live.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../public/memory-live.css'), 'utf8');

test('memory layers are keyboard-accessible controls and share a compact summary row', () => {
  const layers = renderer.match(/<button[^>]*class="fenix-mem-layer[^>]*>/g) || [];
  assert.equal(layers.length, 7);
  assert.match(renderer, /class="fml-summary" id="fmlGraphSummary" aria-label="Resumo do grafo"/);
  assert.match(renderer, /role="tablist" aria-label="Visões da memória"/);
  assert.match(renderer, /id="fmlPersistent" role="tabpanel" aria-labelledby="fmlTabSearch"/);
  assert.match(renderer, /function setActiveTab\(tabName\)/);
  assert.doesNotMatch(renderer, /<div class="fenix-mem-layer/);
  assert.match(renderer, /setAttribute\('aria-pressed', String\(isMatch\)\)/);
  assert.match(styles, /\.fml-layer-strip[^}]*overflow-x:auto/);
  assert.match(styles, /\.fml-summary[^}]*display:flex/);
});
