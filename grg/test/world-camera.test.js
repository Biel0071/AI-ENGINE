'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const worldJs = fs.readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');
const semanticMethod = worldJs.match(/    setSemanticLevel\(mode\) \{[\s\S]*?\n    \}/)?.[0] || '';
let capturedWarning = '';
const semanticZoom = new Function('T', 'responsiveCameraScale', 'window', 'document', `return ({ ${semanticMethod} }).setSemanticLevel;`)(
  { Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(value) { return this.set(value.x, value.y, value.z); }
  } },
  () => 1,
  { FenixToast: { show(message) { capturedWarning = message; } } },
  { getElementById() { return null; } }
);

test('world-camera: setCameraMode supports canonical modes (orbit, pan, zoom, focus, follow, interior, city)', () => {
  assert.ok(worldJs.includes('setCameraMode(mode)'), 'setCameraMode method must exist');
  const modes = ['orbit', 'pan', 'zoom', 'focus', 'follow', 'interior', 'city'];
  modes.forEach(mode => {
    assert.ok(worldJs.includes(`'${mode}'`), `Mode '${mode}' must be supported in setCameraMode`);
  });
});

test('world-camera: semantic zoom changes the real 3D camera for universe, island, and agent views', () => {
  assert.match(worldJs, /setSemanticLevel\(mode\)[\s\S]{0,1800}targetDistance = 210/);
  assert.match(worldJs, /targetDistance = 75/);
  assert.match(worldJs, /targetDistance = 32 \* responsiveCameraScale/);
  assert.match(worldJs, /this\._updateCameraPosition\(true\);[\s\S]{0,180}this\._saveState\(\);/);
});

test('world-camera: agent focus preserves the selected agent and leaves room around the model', () => {
  const agentMode = worldJs.match(/setSemanticLevel\(mode\) \{([\s\S]*?)\n    saveCamera\(\)/)?.[1] || '';
  const selectAgent = worldJs.match(/selectAgent\(agentId\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.match(agentMode, /this\.selectedAgent\?\.id/);
  assert.match(agentMode, /selectedRecord\?\.mesh/);
  assert.match(agentMode, /this\.agentMeshes\?\.get\(selectedAgentId\)/);
  assert.match(agentMode, /object\.getWorldPosition\(position\)/);
  assert.match(agentMode, /targetPos = worldPositionOf\(selectedMesh\)/);
  assert.match(agentMode, /targetDistance = 32 \* responsiveCameraScale/);
  assert.match(selectAgent, /this\.selectedAgent = ag/);
});

test('world-camera: missing selected mesh does not move camera to the Camila mesh', () => {
  const target = { x: 9, y: 8, z: 7, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  let cameraUpdated = false;
  capturedWarning = '';
  const world = {
    selectedAgent: { id: 'agent-debug', name: 'Debug Agent' },
    agents: new Map([['agent-debug', { id: 'agent-debug', name: 'Debug Agent' }]]),
    camilaGroup: { position: { x: 1, y: 0.8, z: 2 } },
    cameraState: { targetLookAt: target },
    stopFollowing() {},
    _updateCameraPosition() { cameraUpdated = true; },
    _saveState() {},
  };
  semanticZoom.call(world, 'agent');
  assert.deepEqual([target.x, target.y, target.z], [9, 8, 7]);
  assert.equal(cameraUpdated, false);
  assert.match(capturedWarning, /Não foi possível localizar a posição 3D/);
});

test('world-camera: selected agent coordinates are used when the mesh is not attached yet', () => {
  const target = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  const world = {
    selectedAgent: { id: 'agent-debug', name: 'Debug Agent' },
    agents: new Map([['agent-debug', { id: 'agent-debug', name: 'Debug Agent', coordinates: { x: 4, y: 0.8, z: 7 } }]]),
    cameraState: { targetLookAt: target },
    stopFollowing() {}, _updateCameraPosition() {}, _updateDistrictLabels() {}, _saveState() {},
  };
  const result = semanticZoom.call(world, 'agent');
  assert.equal(result, true);
  assert.deepEqual([target.x, target.y, target.z], [4, 2, 7]);
});

test('world-camera: focusBuilding centers on API Platform, Deposito Mais and HQ complexes', () => {
  assert.ok(worldJs.includes('focusBuilding(buildingId)'), 'focusBuilding method must exist');
  assert.ok(worldJs.includes('bld-api-platform'), 'API Platform building must be supported');
  assert.ok(worldJs.includes('deposito-mais'), 'Deposito Mais building must be supported');
  assert.ok(worldJs.includes('bld-fenix-hq'), 'Fenix HQ building must be supported');
});

test('world-camera: focusFloor cutaways properly isolate floors 0 to 3 and roof', () => {
  assert.ok(worldJs.includes('focusFloor(floorNumber)'), 'focusFloor method must exist');
  assert.ok(worldJs.includes('this.apiFloorGroups'), 'apiFloorGroups must be toggled for cutaways');
  assert.ok(worldJs.includes('this.apiRoofGroup.visible = false'), 'Roof must be cut away when focusing interior floor');
  assert.ok(worldJs.includes('fH = 4.0'), 'Floor height must be 4m');
});

test('world-camera: followAgent and stopFollowing methods control dynamic camera tracking', () => {
  assert.ok(worldJs.includes('followAgent(agentId)'), 'followAgent method must exist');
  assert.ok(worldJs.includes('stopFollowing()'), 'stopFollowing method must exist');
  assert.ok(worldJs.includes("this.cameraMode = 'follow'"), 'followAgent must set follow mode');
  assert.ok(worldJs.includes('this.followingAgentId = null'), 'stopFollowing must reset followingAgentId');
});

test('world-camera: Quarteirao Perfeito composite unit is defined and verifiable', () => {
  assert.ok(worldJs.includes('getQuarteiraoPerfeito()'), 'getQuarteiraoPerfeito method must exist');
  assert.ok(worldJs.includes("company: 'API Platform'"), 'Company must be API Platform');
  assert.ok(worldJs.includes("building: 'ApiPlatformHeroComplex'"), 'Building must be ApiPlatformHeroComplex');
  assert.ok(worldJs.includes("floors: 4"), 'Must have 4 floors');
  assert.ok(worldJs.includes("vehicle: 'SedanCar'"), 'Vehicle must be SedanCar');
  assert.ok(worldJs.includes("mission: 'API Gateway Live Pipeline'"), 'Mission must be API Gateway Live Pipeline');
});
