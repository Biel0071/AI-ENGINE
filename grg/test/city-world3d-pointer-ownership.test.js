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

  const engine = Object.assign(Object.create(window.FenixWorld3DEngine.prototype), {
    canvas: { addEventListener: (type, handler) => canvasEvents.set(type, handler) },
    cameraState: { dragging: false, moved: false },
    hoveredObject: { userData: { type: 'project', projectId: 'stale-project' } },
    _handleCanvasClickCalls: 0,
    _saveStateCalls: 0,
    _handleCanvasClick() { this._handleCanvasClickCalls += 1; },
    _saveState() { this._saveStateCalls += 1; },
  });

  engine._bindEvents();
  return { engine, canvasEvents, windowEvents };
}

test('a UI mouseup outside the City canvas cannot replay a stale scene selection', () => {
  const { engine, windowEvents } = createWorld();

  windowEvents.get('mouseup')({ clientX: 0, clientY: 0 });

  assert.equal(engine._handleCanvasClickCalls, 0);
  assert.equal(engine._saveStateCalls, 1);
});

test('a mouseup after a City canvas press still selects the hovered world object', () => {
  const { engine, canvasEvents, windowEvents } = createWorld();

  canvasEvents.get('mousedown')({ clientX: 0, clientY: 0 });
  windowEvents.get('mouseup')({ clientX: 0, clientY: 0 });

  assert.equal(engine._handleCanvasClickCalls, 1);
  assert.equal(engine._saveStateCalls, 1);
});

test('camera smoothing advances by elapsed time when the City renders at 10 FPS', () => {
  const { engine } = createWorld();
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

  engine._updateCameraPosition(false, 100);

  assert.ok(engine.cameraState.distance > 100, 'a 100 ms frame should apply equivalent elapsed-time smoothing');

  engine.cameraState.distance = 10;
  engine._updateCameraPosition(false);
  assert.ok(Math.abs(engine.cameraState.distance - 31.6) < 0.01, 'the 60 FPS camera curve should remain unchanged');
});
