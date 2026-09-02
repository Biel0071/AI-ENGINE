const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'frontend-screen-manifest.json'), 'utf8'));

test('screen manifest preserves the 14 screens across five functional domains', () => {
  const screens = Object.keys(manifest.screens);
  const domains = Object.entries(manifest.domains);
  assert.equal(screens.length, 14);
  assert.equal(domains.length, 5);
  assert.deepEqual(new Set(domains.flatMap(([, items]) => items)), new Set(screens));
  for (const [name, spec] of Object.entries(manifest.screens)) {
    assert.ok(spec.purpose, `${name} must describe its purpose`);
    assert.ok(Array.isArray(spec.readEndpoints) && spec.readEndpoints.length > 0, `${name} must declare read endpoints`);
  }
});

test('generated function map has backend evidence for every screen contract', () => {
  const mapPath = path.join(root, 'qa', 'screen-function-map.json');
  assert.ok(fs.existsSync(mapPath), 'run build-screen-function-map.js before this test');
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  assert.equal(map.summary.screens, 14);
  assert.equal(map.summary.needsReview, 0);
  assert.equal(map.summary.backendContracts, map.summary.endpointContracts);
});

test('generated function map uses the canonical public shell by default', () => {
  const map = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'screen-function-map.json'), 'utf8'));
  assert.equal(map.source.html, 'public\\index.html');
  assert.equal(map.source.assetDir, 'public');
});
