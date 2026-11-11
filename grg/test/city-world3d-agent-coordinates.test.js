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
  assert.deepEqual({ ...normalize.call({}, { x: 'bad', y: null }, 0) }, { x: 9, y: 0.8, z: 0 });
});

test('estimated positions stay inside the safe area of the city island', () => {
  for (let index = 0; index < 120; index++) {
    for (const department of ['LOGISTICS', 'ENGINEERING', 'DATABASE', 'PROJECT', 'MONITOR', 'RESEARCH']) {
      const position = normalize.call({}, null, index, { id: `agent-${index}`, department });
      assert.ok(Math.abs(position.x) <= 78, `x out of island: ${position.x}`);
      assert.ok(position.z >= -72 && position.z <= 74, `z out of island: ${position.z}`);
    }
  }
});

test('agents without a location are placed near their operational district instead of the HQ origin', () => {
  const position = normalize.call({}, null, 0, { id: 'worker-wms', department: 'LOGISTICS' });
  assert.ok(position.x > 15 && position.z < 0, 'logistics agent should appear in the logistics district');
  assert.notDeepEqual({ x: position.x, z: position.z }, { x: 0, z: 0 }, 'unplaced agents must not stack inside the HQ');
});

test('coordinate provenance distinguishes runtime measurements from fallback placement', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  assert.equal(engine._getAgentCoordinateSource({ x: 4, y: 0.8, z: 7 }, { department: 'OPS' }), 'MEASURED');
  assert.equal(engine._getAgentCoordinateSource(null, { department: 'OPS' }), 'ESTIMATED');
  assert.equal(engine._getAgentCoordinateSource({ x: 0, y: 0 }, { department: 'OPS' }), 'ESTIMATED');
  assert.equal(engine._getAgentCoordinateSource({ x: 0, y: 0 }, { buildingId: 'bld-fenix-hq' }), 'MEASURED');
});

test('an explicit origin coordinate remains valid for an HQ-assigned agent', () => {
  assert.deepEqual(
    { ...normalize.call({}, { x: 0, y: 0.8, z: 0 }, 0, { buildingId: 'bld-fenix-hq' }) },
    { x: 0, y: 0.8, z: 0 }
  );
});

test('non-HQ agents with zeroed coordinates are routed to their operational district instead of stacking at (0,0)', () => {
  const position = normalize.call({}, { x: 0, y: 0 }, 1, {
    id: 'agent-camila',
    buildingId: 'bld-deposito-mais',
    department: 'LOGISTICA'
  });
  assert.ok(position.x > 15 && position.z < 0, 'Camila should be placed in the logistics district even if stored coordinates were zeroed');
  assert.notDeepEqual({ x: position.x, z: position.z }, { x: 0, z: 0 });
});

test('stationary agents sharing an interior position are spread within that building and floor', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const occupied = [];
  const agents = ['agent-camila', 'agent-andre', 'agent-marcos', 'agent-silva', 'agent-expedicao'];
  const positions = agents.map((id) => {
    const coordinates = engine._resolveInteriorAgentCoordinates(
      { id, buildingId: 'bld-deposito-mais', floorNum: 1 },
      { x: 58, y: 4.8, z: -38 },
      occupied
    );
    occupied.push({ buildingId: 'bld-deposito-mais', floorNum: 1, x: coordinates.x, z: coordinates.z });
    return coordinates;
  });

  for (let i = 0; i < positions.length; i += 1) {
    assert.ok(positions[i].x >= 29 && positions[i].x <= 71);
    assert.ok(positions[i].z >= -53 && positions[i].z <= -19);
    for (let j = i + 1; j < positions.length; j += 1) {
      assert.ok(Math.hypot(positions[i].x - positions[j].x, positions[i].z - positions[j].z) >= 1.5);
    }
  }
  assert.deepEqual({ ...positions[0] }, { x: 58, y: 4.8, z: -38 });
});

test('interior spacing never moves agents across building or floor boundaries', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const occupied = [{ buildingId: 'bld-api-platform', floorNum: 2, x: -52, z: -29 }];
  const otherBuilding = engine._resolveInteriorAgentCoordinates(
    { id: 'agent-dev', buildingId: 'bld-dev-loft', floorNum: 2 },
    { x: -52, y: 8.8, z: -29 }, occupied
  );
  const otherFloor = engine._resolveInteriorAgentCoordinates(
    { id: 'agent-api-floor-3', buildingId: 'bld-api-platform', floorNum: 3 },
    { x: -52, y: 8.8, z: -29 }, occupied
  );

  assert.deepEqual({ ...otherBuilding }, { x: -52, y: 8.8, z: -29 });
  assert.deepEqual({ ...otherFloor }, { x: -52, y: 8.8, z: -29 });
});

test('interior spacing leaves buildings without a measured footprint unchanged', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const coordinates = { x: 12, y: 4.8, z: 9 };
  const result = engine._resolveInteriorAgentCoordinates(
    { id: 'agent-dev', buildingId: 'bld-dev-loft', floorNum: 1 },
    coordinates,
    [{ buildingId: 'bld-dev-loft', floorNum: 1, x: 12, z: 9 }]
  );

  assert.deepEqual({ ...result }, coordinates);
});

test('agents walking under runtime telemetry keep the measured destination', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const measured = { x: 58, y: 4.8, z: -38 };
  const destination = engine._normalizeAgentCoordinates(measured, 1, { buildingId: 'bld-deposito-mais', floorNum: 1 });
  assert.deepEqual({ ...destination }, measured);
});

test('only same-building floor occupancy participates in the spacing pass', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const api = { id: 'agent-api', buildingId: 'bld-api-platform', floorNum: 1 };
  const occupied = [{ buildingId: 'bld-deposito-mais', floorNum: 1, x: -52, z: -29 }];
  const coordinates = engine._resolveInteriorAgentCoordinates(api, { x: -52, y: 4.8, z: -29 }, occupied);
  assert.deepEqual({ ...coordinates }, { x: -52, y: 4.8, z: -29 });
});
