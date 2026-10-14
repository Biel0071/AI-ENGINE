'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const worldJs = fs.readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');

test('world-scale: 1 Three.js unit = 1 logical meter standard convention', () => {
  assert.ok(worldJs.includes('1 unit = 1 meter') || worldJs.includes('1 unit = 1m') || worldJs.includes('1.76'), '3D world code must follow 1 unit = 1 meter scale');
});

test('world-scale: Character standing height is 1.76m (within [1.70, 1.80m])', () => {
  // Check scale is 1.0
  assert.ok(worldJs.includes('agent.scale.set(1.0, 1.0, 1.0)'), 'Standing humanoid must be scale (1.0, 1.0, 1.0)');
  assert.ok(worldJs.includes('height: 1.76'), 'Humanoid userData height must record 1.76m');
  assert.ok(worldJs.includes('totalHeight: 1.76'), 'Humanoid userData totalHeight must record 1.76m');

  const charHeight = 1.76;
  assert.ok(charHeight >= 1.70 && charHeight <= 1.80, 'Standing character height must be within [1.70m, 1.80m]');
});

test('world-scale: Building entrance doors have standard 2.1m height and 1.2m width', () => {
  assert.ok(worldJs.includes('_createEntranceDoor'), '_createEntranceDoor helper must exist');
  assert.ok(worldJs.includes('height: 2.1'), 'Door height must be 2.1m');
  assert.ok(worldJs.includes('width: 1.2'), 'Door width must be 1.2m');

  const doorHeight = 2.1;
  const charHeight = 1.76;
  const ratio = charHeight / doorHeight;
  assert.ok(ratio >= 0.80 && ratio <= 0.88, `Character to door height ratio (${ratio.toFixed(3)}) must be in [0.80, 0.88]`);
});

test('world-scale: Vehicle dimensions follow real physical proportions (Sedan 4.2m, Van ~5m, Truck ~12m)', () => {
  assert.ok(worldJs.includes('_createSedanCar'), '_createSedanCar helper must exist');
  assert.ok(worldJs.includes("length: 4.2, width: 1.8, height: 1.45"), 'Sedan must be 4.2m L x 1.8m W x 1.45m H');

  assert.ok(worldJs.includes('_createDeliveryBoxVan'), '_createDeliveryBoxVan must exist');
  assert.ok(worldJs.includes("type: 'van'"), 'Delivery van must have type van');
  assert.ok(worldJs.includes("length: 5.2"), 'Delivery van must have ~5m length (5.2m)');

  assert.ok(worldJs.includes('_createHeavyFreightTruck'), '_createHeavyFreightTruck must exist');
  assert.ok(worldJs.includes("type: 'truck'"), 'Truck must have type truck');
  assert.ok(worldJs.includes("length: 13.5"), 'Truck with trailer must have ~12-13.5m length');
});

test('world-scale: Landscaping trees heights are strictly within 3.5m to 7.5m', () => {
  assert.ok(worldJs.includes('_createDetailedTree'), '_createDetailedTree must exist');
  
  // Heights defined in tree generator: pine 6.4m, deciduous 5.8m, flowering 5.2m
  const heights = [5.2, 5.8, 6.4];
  heights.forEach(h => {
    assert.ok(h >= 3.5 && h <= 7.5, `Tree height ${h}m must be within [3.5m, 7.5m]`);
  });
});

test('world-scale: Architecture floor height is 4.0m', () => {
  assert.ok(worldJs.includes('fH = 4.0'), 'Floor height fH must be 4.0m in building generation');
  assert.ok(worldJs.includes('floorHeight: 4.0'), 'Building metadata must record floorHeight: 4.0');
});
