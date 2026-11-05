'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const isoCity = fs.readFileSync(path.join(__dirname, '..', 'public', 'iso-city.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const bootStart = isoCity.indexOf('function bootIsoCity() {');
const earlyReturn = isoCity.indexOf('if (window.FENIX_WORLD_3D) return;', bootStart);

test('3D camera actions are registered before IsoCity exits for the active WebGL renderer', () => {
  assert.notEqual(bootStart, -1);
  assert.notEqual(earlyReturn, -1);
  const bootHeader = isoCity.slice(bootStart, earlyReturn);
  assert.match(bootHeader, /window\.fenixCitySemanticZoom\s*=\s*\(mode\)\s*=>/);
  assert.match(bootHeader, /world\.setSemanticLevel\(mode\)/);
  assert.match(bootHeader, /window\.fenixCityZoom\s*=\s*\(direction\)\s*=>/);
  assert.match(bootHeader, /world\.zoomStep\(direction === 'in' \? 1 : -1\)/);
  assert.match(bootHeader, /window\.fenixCityRotate\s*=/);
  assert.match(bootHeader, /window\.fenixCityResetCamera\s*=/);
  assert.match(bootHeader, /syncZoomLabel\(\);\s*$/);
});

test('WebGL rotate and reset HUD buttons use the shared camera adapters', () => {
  assert.match(html, /id="btnRotateCity" onclick="window\.fenixCityRotate\?\.\(\)"/);
  assert.match(html, /id="btnResetCamera" onclick="window\.fenixCityResetCamera\?\.\(\)"/);
  assert.doesNotMatch(html, /id="btnRotateCity" onclick="window\.fenixCity\?\.rotateCamera/);
  assert.doesNotMatch(html, /id="btnResetCamera" onclick="window\.fenixCity\?\.resetCamera/);
});
