'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const world = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-world-3d.js'), 'utf8');

test('City camera fits compact aspect ratios while preserving the user zoom preference', () => {
  assert.match(world, /const responsiveCameraFov = \(aspect\) =>/);
  assert.match(world, /const responsiveCameraScale = \(aspect\) =>/);
  assert.match(world, /this\.camera\.fov = responsiveCameraFov\(this\.camera\.aspect\)/);
  assert.match(world, /targetDistance = normalizeCameraDistance\(preferenceDistance \* responsiveCameraScale\(this\.camera\.aspect\)\)/);
  assert.match(world, /const preferenceDistance = normalizeCameraDistance\(this\.cameraState\.targetDistance \/ scale\)/);
});
