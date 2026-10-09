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
