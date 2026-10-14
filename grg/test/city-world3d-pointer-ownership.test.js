'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createWorld() {
  const windowEvents = new Map();
  const canvasEvents = new Map();
  const window = { addEventListener: (type, handler) => windowEvents.set(type, handler) };
  const document = { readyState: 'loading', addEventListener() {} };
  const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');
  vm.runInNewContext(source, { window, document, THREE: {}, console, setTimeout, clearTimeout, setInterval, clearInterval });

  const vector = (x = 0, y = 0, z = 0) => ({
    x, y, z,
    copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; return this; },
    lerp(other, amount) {
      this.x += (other.x - this.x) * amount;
      this.y += (other.y - this.y) * amount;
      this.z += (other.z - this.z) * amount;
      return this;
    },
  });
  const capturedPointers = new Set();
  const canvas = {
    addEventListener: (type, handler) => canvasEvents.set(type, handler),
    setPointerCapture: (id) => capturedPointers.add(id),
    hasPointerCapture: (id) => capturedPointers.has(id),
    releasePointerCapture: (id) => capturedPointers.delete(id),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }),
  };
  const engine = Object.assign(Object.create(window.FenixWorld3DEngine.prototype), {
    canvas,
    camera: { fov: 38 },
    cameraState: {
      dragging: false, moved: false, azimuth: Math.PI / 4, elevation: 0.615,
      distance: 80, targetDistance: 80, targetLookAt: vector(), target: vector(),
    },
    hoveredObject: { userData: { type: 'project', projectId: 'stale-project' } },
    _handleCanvasClickCalls: 0,
    _saveStateCalls: 0,
    _updateCameraPositionCalls: 0,
    _handleCanvasClick() { this._handleCanvasClickCalls += 1; },
    _saveState() { this._saveStateCalls += 1; },
    _updateCameraPosition() { this._updateCameraPositionCalls += 1; },
  });

  engine._bindEvents();
  return { engine, canvasEvents, windowEvents, window };
}

test('a UI pointerup outside the City canvas cannot replay a stale scene selection', () => {
  const { engine, windowEvents } = createWorld();

  windowEvents.get('pointerup')?.({ clientX: 0, clientY: 0, pointerId: 99, button: 0 });

  assert.equal(engine._handleCanvasClickCalls, 0);
  assert.equal(engine._saveStateCalls, 0);
});

test('a pointerup after a City canvas press still selects the hovered world object', () => {
  const { engine, canvasEvents, windowEvents } = createWorld();

  canvasEvents.get('pointerdown')({ clientX: 10, clientY: 10, pointerId: 7, button: 0, isPrimary: true, preventDefault() {} });
  canvasEvents.get('pointerup')({ clientX: 10, clientY: 10, pointerId: 7, button: 0 });

  assert.equal(engine._handleCanvasClickCalls, 1);
  assert.equal(engine._saveStateCalls, 1);
});

test('pointer drag orbits the city while a right-button drag pans without selecting', () => {
  const { engine, canvasEvents } = createWorld();
  const startAzimuth = engine.cameraState.azimuth;

  canvasEvents.get('pointerdown')({ clientX: 100, clientY: 100, pointerId: 1, button: 0, isPrimary: true, preventDefault() {} });
  canvasEvents.get('pointermove')({ clientX: 140, clientY: 120, pointerId: 1, button: 0 });
  canvasEvents.get('pointerup')({ clientX: 140, clientY: 120, pointerId: 1, button: 0 });

  assert.notEqual(engine.cameraState.azimuth, startAzimuth, 'left drag rotates the camera');
  assert.equal(engine._handleCanvasClickCalls, 0, 'a moved pointer does not select a building');

  const startTarget = { x: engine.cameraState.targetLookAt.x, z: engine.cameraState.targetLookAt.z };
  const startPanAzimuth = engine.cameraState.azimuth;
  canvasEvents.get('pointerdown')({ clientX: 100, clientY: 100, pointerId: 2, button: 2, isPrimary: true, preventDefault() {} });
  canvasEvents.get('pointermove')({ clientX: 130, clientY: 125, pointerId: 2, button: 2 });
  canvasEvents.get('pointerup')({ clientX: 130, clientY: 125, pointerId: 2, button: 2 });

  assert.notDeepEqual(
    { x: engine.cameraState.targetLookAt.x, z: engine.cameraState.targetLookAt.z },
    startTarget,
    'right drag pans the camera target across the map'
  );
  assert.equal(engine.cameraState.azimuth, startPanAzimuth, 'panning does not rotate the camera');
  assert.equal(engine._handleCanvasClickCalls, 0, 'panning does not select a building');
});

test('wheel zoom scales smoothly and clamps to the supported distance', () => {
  const { engine, canvasEvents } = createWorld();
  let prevented = 0;

  canvasEvents.get('wheel')({ deltaY: 120, deltaMode: 0, preventDefault() { prevented += 1; } });

  assert.ok(engine.cameraState.targetDistance > 80 && engine.cameraState.targetDistance < 100,
    'one wheel notch changes distance proportionally instead of adding a fixed jump');
  assert.equal(prevented, 1);

  for (let index = 0; index < 8; index += 1) {
    canvasEvents.get('wheel')({ deltaY: -10000, deltaMode: 0, preventDefault() {} });
  }
  assert.equal(engine.cameraState.targetDistance, 12, 'zoom-in stops at the minimum camera distance');
});

test('pointer cancellation clears a drag without replaying a scene selection', () => {
  const { engine, canvasEvents } = createWorld();

  canvasEvents.get('pointerdown')({ clientX: 10, clientY: 10, pointerId: 4, button: 0, isPrimary: true, preventDefault() {} });
  canvasEvents.get('pointercancel')({ pointerId: 4 });

  assert.equal(engine.cameraState.dragging, false);
  assert.equal(engine._handleCanvasClickCalls, 0);
});

test('camera smoothing advances by elapsed time when the City renders at 10 FPS', () => {
  const { engine, window } = createWorld();
  const vector = (x = 0, y = 0, z = 0) => ({
    x, y, z,
    copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; return this; },
    lerp(other, amount) {
      this.x += (other.x - this.x) * amount;
      this.y += (other.y - this.y) * amount;
      this.z += (other.z - this.z) * amount;
      return this;
    },
  });
  engine.cameraState = {
    dragging: false, moved: false, distance: 10, targetDistance: 190,
    target: vector(), targetLookAt: vector(), azimuth: Math.PI / 4,
    targetAzimuth: null, elevation: 0.615, targetElevation: null,
  };
  engine.camera = { position: { set() {} }, lookAt() {} };
  engine._updateCameraPosition = window.FenixWorld3DEngine.prototype._updateCameraPosition;

  engine._updateCameraPosition(false, 100);

  assert.ok(engine.cameraState.distance > 100, 'a 100 ms frame should apply equivalent elapsed-time smoothing');

  engine.cameraState.distance = 10;
  engine._updateCameraPosition(false);
  assert.ok(Math.abs(engine.cameraState.distance - 31.6) < 0.01, 'the 60 FPS camera curve should remain unchanged');
});
