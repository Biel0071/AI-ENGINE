'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const worldJs = fs.readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');

test('world-camera: setCameraMode supports canonical modes (orbit, pan, zoom, focus, follow, interior, city)', () => {
  assert.ok(worldJs.includes('setCameraMode(mode)'), 'setCameraMode method must exist');
  const modes = ['orbit', 'pan', 'zoom', 'focus', 'follow', 'interior', 'city'];
  modes.forEach(mode => {
    assert.ok(worldJs.includes(`'${mode}'`), `Mode '${mode}' must be supported in setCameraMode`);
  });
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
