'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');
const context = {
  THREE: {},
  navigator: { webdriver: false },
  window: { addEventListener() {} },
  document: { readyState: 'loading', addEventListener() {} }
};
vm.runInNewContext(source, context);

const vector = (x, y, z) => ({
  x, y, z,
  set(nextX, nextY, nextZ) { this.x = nextX; this.y = nextY; this.z = nextZ; },
  copy(other) { this.set(other.x, other.y, other.z); return this; }
});

test('resetCamera restores the live camera and renders immediately outside headless mode', () => {
  const Engine = context.window.FenixWorld3DEngine;
  const engine = Object.create(Engine.prototype);
  engine.camera = { aspect: 1.6, position: vector(24, 3, -12), lookAt(target) { this.target = target; } };
  engine.cameraState = {
    azimuth: 2.4,
    elevation: 0.2,
    distance: 22,
    targetDistance: 22,
    preferenceDistance: 22,
    target: vector(24, 3, -12),
    targetLookAt: vector(24, 3, -12),
    targetAzimuth: -2,
    targetElevation: 0.9
  };
  engine.cameraMode = 'follow';
  engine.followingAgentId = 'agent-7';
  engine.state = { selected: { id: 'agent-7' }, level: 'agent' };
  engine.activeApiFloor = 2;
  engine.apiFloorGroups = [{ visible: false }, { visible: false }, { visible: true }, { visible: true }];
  engine.apiRoofGroup = { visible: false };
  engine.stopFollowing = Engine.prototype.stopFollowing;
  let renders = 0;
  engine._syncExpansionChunks = () => {};
  engine._updateDistrictLabels = () => {};
  engine.renderer = { render: () => { renders += 1; } };
  engine.scene = {};
  engine._saveState = () => {};

  assert.equal(engine.resetCamera(), true);
  assert.equal(engine.cameraMode, 'orbit');
  assert.equal(engine.followingAgentId, null);
  assert.equal(engine.cameraState.distance, engine.cameraState.targetDistance);
  assert.deepEqual(
    [engine.cameraState.target.x, engine.cameraState.target.y, engine.cameraState.target.z],
    [0, 0, 0]
  );
  assert.equal(engine.cameraState.targetAzimuth, null);
  assert.equal(engine.cameraState.targetElevation, null);
  assert.equal(engine.camera.position.x, 0 + engine.cameraState.distance * Math.cos(Math.PI / 4) * Math.cos(0.56));
  assert.equal(engine.camera.position.z, engine.cameraState.distance * Math.sin(Math.PI / 4) * Math.cos(0.56));
  assert.equal(renders, 1);
  assert.equal(engine.activeApiFloor, null);
  assert.ok(engine.apiFloorGroups.every((floor) => floor.visible));
  assert.equal(engine.apiRoofGroup.visible, true);
});
