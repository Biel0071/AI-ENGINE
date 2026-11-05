const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'frontend-screen-manifest.json'), 'utf8'));

test('screen manifest preserves the 15 canonical screens across five functional domains', () => {
  const screens = Object.keys(manifest.screens);
  const domains = Object.entries(manifest.domains);
  assert.equal(screens.length, 15);
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
  assert.equal(map.summary.screens, 15);
  assert.equal(map.summary.needsReview, 0);
  assert.equal(map.summary.backendContracts, map.summary.endpointContracts);
});

test('action routes are cataloged as POST contracts without being marked safe to probe', () => {
  const map = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'screen-function-map.json'), 'utf8'));
  const actions = map.screens.flatMap(screen => screen.endpoints.filter(endpoint => endpoint.kind === 'action'));
  assert.deepEqual(actions.map(({ endpoint, method, probed }) => ({ endpoint, method, probed })).sort((a, b) => a.endpoint.localeCompare(b.endpoint)), [
    { endpoint: '/api/dev/terminal', method: 'POST', probed: false },
    { endpoint: '/api/v2/vision/inspect-element', method: 'POST', probed: false },
  ]);
  assert.ok(actions.every(endpoint => endpoint.backend), 'action routes must still have static backend evidence');
});

test('generated function map uses the canonical public shell by default', () => {
  const map = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'screen-function-map.json'), 'utf8'));
  assert.equal(map.source.html, 'public\\index.html');
  assert.equal(map.source.assetDir, 'public');
});
