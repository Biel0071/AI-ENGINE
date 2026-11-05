'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../public/fenix-world-3d.js'), 'utf8');

test('city arterial roads use a legible asphalt surface and raised curb edges', () => {
  assert.ok(source.includes("ctx.fillStyle = '#343c46'"), 'asphalt is lifted from near-black');
  assert.ok(source.includes('roadEWCurbs'), 'east-west roadway has visible curb segments');
  assert.ok(source.includes('roadNSCurbs'), 'north-south roadway has visible curb segments');
  assert.ok(source.includes('this.materials.sidewalk'), 'curbs use the city concrete material');
  assert.ok(source.includes('Double yellow centerline'), 'road marking texture remains present');
});
