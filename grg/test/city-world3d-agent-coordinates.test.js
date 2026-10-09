const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');
const context = {
  THREE: {},
  window: { addEventListener() {} },
  document: { readyState: 'loading', addEventListener() {} }
};
vm.runInNewContext(source, context);

const normalize = context.window.FenixWorld3DEngine.prototype._normalizeAgentCoordinates;

test('legacy planar coordinates map Y to world depth with a ground-level height', () => {
  assert.deepEqual({ ...normalize.call({}, { x: -6.5, y: 3.5 }, 0) }, { x: -6.5, y: 0.8, z: 3.5 });
});

test('three-dimensional coordinates preserve their elevation and depth', () => {
  assert.deepEqual({ ...normalize.call({}, { x: 24.5, y: 2.1, z: -2.5 }, 0) }, { x: 24.5, y: 2.1, z: -2.5 });
});

test('incomplete coordinates receive a deterministic safe position', () => {
  assert.deepEqual({ ...normalize.call({}, { x: 'bad', y: null }, 0) }, { x: 17, y: 0.8, z: 0 });
});

test('agents without a location are placed near their operational district instead of the HQ origin', () => {
  const position = normalize.call({}, null, 0, { id: 'worker-wms', department: 'LOGISTICS' });
  assert.ok(position.x > 15 && position.z < 0, 'logistics agent should appear in the logistics district');
  assert.notDeepEqual({ x: position.x, z: position.z }, { x: 0, z: 0 }, 'unplaced agents must not stack inside the HQ');
});

test('an explicit origin coordinate remains valid for an HQ-assigned agent', () => {
  assert.deepEqual(
    { ...normalize.call({}, { x: 0, y: 0.8, z: 0 }, 0, { buildingId: 'bld-fenix-hq' }) },
    { x: 0, y: 0.8, z: 0 }
  );
});
