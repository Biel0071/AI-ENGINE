'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');

class Geometry {
  constructor(...args) { this.args = args; this.type = this.constructor.name; }
}
class Shape {
  constructor() { this.commands = []; }
  moveTo(...args) { this.commands.push(['moveTo', ...args]); }
  lineTo(...args) { this.commands.push(['lineTo', ...args]); }
  quadraticCurveTo(...args) { this.commands.push(['quadraticCurveTo', ...args]); }
  bezierCurveTo(...args) { this.commands.push(['bezierCurveTo', ...args]); }
  closePath() { this.commands.push(['closePath']); }
}
class Vector3 {
  constructor(x, y, z) { Object.assign(this, { x, y, z }); }
}
class Group {
  constructor() { this.children = []; this.userData = {}; this.position = { set: (x, y, z) => Object.assign(this.position, { x, y, z }) }; }
  add(...objects) { this.children.push(...objects); }
  remove(object) { this.children = this.children.filter((child) => child !== object); }
}
class Mesh {
  constructor(geometry, material) {
    this.geometry = geometry;
    this.material = material;
    this.userData = {};
    this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = {};
  }
}
const cameraStorage = new Map();
const persistentCameraStorage = new Map();
const context = {
  sessionStorage: { getItem(key) { return cameraStorage.get(key) || null; }, setItem(key, value) { cameraStorage.set(key, value); } },
  localStorage: { getItem(key) { return persistentCameraStorage.get(key) || null; }, setItem(key, value) { persistentCameraStorage.set(key, value); } },
  THREE: {
    Shape,
    Vector3,
    ExtrudeGeometry: class ExtrudeGeometry extends Geometry {},
    BoxGeometry: class BoxGeometry extends Geometry {},
    PlaneGeometry: class PlaneGeometry extends Geometry {},
    Group,
    Mesh
  },
  window: { addEventListener() {} },
  document: { readyState: 'loading', addEventListener() {} }
};
const instrumentedSource = source.replace(
  '  FenixWorld3DEngine.DISTRICTS =',
  `  window.FenixPathGraph = PathGraph;\n  FenixWorld3DEngine.AMBIENT_CITY_LOTS = Object.freeze(AMBIENT_CITY_LOTS.map((lot) => Object.freeze(lot)));\n  FenixWorld3DEngine.EXPANSION_CHUNK_SIZE = EXPANSION_CHUNK_SIZE;\n  FenixWorld3DEngine.DISTRICTS =`
);
vm.runInNewContext(instrumentedSource, context);

function createTerrain() {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  engine.materials = new Proxy({}, { get: (_, name) => ({ name }) });
  engine.scene = { children: [], add(object) { this.children.push(object); } };
  engine.expansionChunks = new Map();
  engine._initTerrain();
  return engine.scene.children[0];
}

test('city foundation follows a softened shoreline while preserving the world footprint', () => {
  const terrain = createTerrain();
  const foundation = terrain.children[0];

  assert.equal(foundation.geometry.type, 'ExtrudeGeometry', 'the island should not be a rectangular slab');
  const [shape, options] = foundation.geometry.args;
  assert.equal(options.depth, 2.5, 'foundation keeps the existing vertical clearance');
  assert.ok(shape.commands.filter(([command]) => command === 'quadraticCurveTo' || command === 'bezierCurveTo').length >= 4,
    'the perimeter should use several curved transitions');
  assert.equal(shape.commands.at(-1)[0], 'closePath');
  assert.equal(foundation.rotation.x, -Math.PI / 2, 'the shaped footprint stays horizontal in world space');
  assert.equal(foundation.position.y, -2.5, 'the top of the foundation stays at ground level');
});

test('canonical districts provide collision-free building footprints', () => {
  const districts = context.window.FenixWorld3DEngine.DISTRICTS;
  assert.equal(districts.length, 8, 'the visible world keeps its eight operational districts');

  for (let i = 0; i < districts.length; i += 1) {
    const a = districts[i];
    assert.ok(a.footprint?.width > 0 && a.footprint?.depth > 0, a.id + ' needs a measured footprint');
    for (let j = i + 1; j < districts.length; j += 1) {
      const b = districts[j];
      const separatedX = Math.abs(a.x - b.x) >= (a.footprint.width + b.footprint.width) / 2;
      const separatedZ = Math.abs(a.z - b.z) >= (a.footprint.depth + b.footprint.depth) / 2;
      assert.ok(separatedX || separatedZ, a.id + ' overlaps ' + b.id);
    }
  }
});

test('ambient blocks stay decorative, non-selectable and outside operational footprints', () => {
  const districts = context.window.FenixWorld3DEngine.DISTRICTS;
  const lots = context.window.FenixWorld3DEngine.AMBIENT_CITY_LOTS;
  const overlaps = (a, b) => {
    const separatedX = Math.abs(a.x - b.x) >= (a.width + b.width) / 2;
    const separatedZ = Math.abs(a.z - b.z) >= (a.depth + b.depth) / 2;
    return !separatedX && !separatedZ;
  };

  assert.equal(lots.length, 12);
  for (let i = 0; i < lots.length; i += 1) {
    const lot = lots[i];
    const footprint = { x: lot.x, z: lot.z, width: lot.width + 0.8, depth: lot.depth + 0.8 };
    for (const district of districts) {
      assert.equal(overlaps(footprint, { ...district, ...district.footprint }), false,
        lot.id + ' overlaps operational district ' + district.id);
    }
    for (let j = i + 1; j < lots.length; j += 1) {
      const other = lots[j];
      assert.equal(overlaps(footprint, { ...other, width: other.width + 0.8, depth: other.depth + 0.8 }), false,
        lot.id + ' overlaps scenery block ' + other.id);
    }
  }

  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  engine.materials = new Proxy({}, { get: (_, name) => ({ name }) });
  engine.scene = { children: [], add(object) { this.children.push(object); } };
  engine.interactiveMeshes = [];
  engine._initAmbientCityFabric();

  const fabric = engine.scene.children[0];
  assert.equal(fabric.userData.interactive, false);
  assert.equal(fabric.children.length, lots.length);
  assert.equal(engine.interactiveMeshes.length, 0);
  assert.ok(fabric.children.every((block) =>
    block.userData.type === 'scenery' && block.userData.liveEntity === false && block.userData.selectable === false
  ));
});

test('logistics and API movement waypoints follow the relocated buildings', () => {
  const nodes = new Map();
  const world = {
    addNode(id, position) { nodes.set(id, position); },
    addEdge() {}
  };

  context.window.FenixPathGraph.prototype._initCanonicalWaypoints.call(world);

  assert.deepEqual(
    { x: nodes.get('dep_dock1').x, z: nodes.get('dep_dock1').z },
    { x: 42.8, z: -25 },
    'warehouse docks move with the logistics district anchor'
  );
  assert.deepEqual(
    { x: nodes.get('api_plaza').x, z: nodes.get('api_plaza').z },
    { x: -52, z: -21 },
    'API Platform navigation starts at the relocated plaza'
  );
});

test('saved camera near a moved district migrates with its building', () => {
  cameraStorage.set('fenix_world_camera_v4', JSON.stringify({
    layoutVersion: 1,
    distance: 38,
    target: { x: 26, y: 0, z: -10 }
  }));

  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const state = engine._loadState();

  assert.equal(state.layoutVersion, 2);
  assert.deepEqual({ ...state.target }, { x: 52, y: 0, z: -36 });
  assert.equal(state.distance, 38);
});



test('legacy world camera expands to fit the wider district layout', () => {
  cameraStorage.set('fenix_world_camera_v4', JSON.stringify({
    layoutVersion: 1,
    distance: 190,
    target: { x: 0, y: 0, z: 0 }
  }));

  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const state = engine._loadState();

  assert.equal(state.distance, 225);
});

test('camera preferences survive tab closure and take precedence over session-only copies', () => {
  persistentCameraStorage.set('fenix_world_camera_v4', JSON.stringify({
    layoutVersion: 2,
    azimuth: 1.2,
    elevation: 0.7,
    distance: 96,
    target: { x: 14, y: 0, z: -8 }
  }));
  cameraStorage.set('fenix_world_camera_v4', JSON.stringify({
    layoutVersion: 2,
    azimuth: 0.2,
    elevation: 0.4,
    distance: 180,
    target: { x: 0, y: 0, z: 0 }
  }));

  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const state = engine._loadState();

  assert.equal(state.distance, 96);
  assert.deepEqual({ ...state.target }, { x: 14, y: 0, z: -8 });
});

test('weather-only environment updates do not invent a day/night change', () => {
  let toggleCalls = 0;
  const world = { cameraState: {}, toggleDayNight() { toggleCalls += 1; } };

  context.window.FenixWorld3DEngine.prototype.setEnvironment.call(world, { weather: 'CLEAR' });

  assert.equal(toggleCalls, 0);
  assert.equal(world.cameraState.night, undefined);
});

test('an explicit day state is applied directly instead of toggling from an unknown state', () => {
  const applied = [];
  const world = {
    cameraState: {},
    _setDayNight(isNight) { applied.push(isNight); this.cameraState.night = isNight; }
  };

  context.window.FenixWorld3DEngine.prototype.setEnvironment.call(world, { isNight: false });

  assert.deepEqual(applied, [false]);
  assert.equal(world.cameraState.night, false);
});

test('the city expansion streams stable decorative neighborhoods as the camera pans', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  engine.materials = new Proxy({}, { get: (_, name) => ({ name }) });
  engine.terrainGroup = new Group();
  engine.expansionChunks = new Map();

  engine._syncExpansionChunks(0, 0, 2);
  assert.equal(engine.expansionChunks.size, 24, 'the operational core is surrounded by two rings of city blocks');
  assert.equal(engine.expansionChunks.has('0,0'), false, 'the live operational core is not covered by scenery');
  assert.ok(engine.expansionChunks.get('1,0').userData.selectable === false);

  const retainedChunk = engine.expansionChunks.get('1,0');
  engine._syncExpansionChunks(context.window.FenixWorld3DEngine.EXPANSION_CHUNK_SIZE, 0, 2);

  assert.equal(engine.expansionChunks.size, 24, 'streaming keeps a bounded neighborhood count');
  assert.equal(engine.expansionChunks.get('1,0'), retainedChunk, 'nearby chunks remain stable while the camera crosses a boundary');
  assert.equal(engine.expansionChunks.has('-2,-2'), false, 'distant chunks are removed after leaving the view radius');
});

test('procedural city blocks are deterministic and cannot be selected as real projects', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  engine.materials = new Proxy({}, { get: (_, name) => ({ name }) });
  const first = engine._createExpansionChunk(2, -1);
  const second = engine._createExpansionChunk(2, -1);
  const projectBlocks = first.children.filter((item) => item.userData.type === 'scenery-building');
  const repeatedBlocks = second.children.filter((item) => item.userData.type === 'scenery-building');

  assert.equal(first.userData.liveEntity, false);
  assert.equal(first.userData.selectable, false);
  assert.equal(projectBlocks.length, 2, 'the background neighborhood adds a small number of deliberate building silhouettes');
  assert.ok(projectBlocks.every((item) => item.userData.liveEntity === false && item.userData.selectable === false));
  assert.deepEqual(
    projectBlocks.map((item) => [item.position.x, item.position.z, ...item.children[0].geometry.args]),
    repeatedBlocks.map((item) => [item.position.x, item.position.z, ...item.children[0].geometry.args]),
    'returning to the same map area reproduces the same neighborhood layout'
  );

  const cameraSideChunk = engine._createExpansionChunk(1, 1);
  const cameraSideBuildings = cameraSideChunk.children.filter((item) => item.userData.type === 'scenery-building');
  assert.ok(cameraSideBuildings.every((item) => item.position.x > 0 && item.position.z > 0),
    'background buildings stay toward the outer side of their map chunk instead of crowding the city core');
  assert.ok(cameraSideBuildings.every((item) => item.children[0].geometry.args[1] <= 14),
    'background buildings remain low-rise so they do not dominate the operational city');
});
