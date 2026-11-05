'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { VisualRealityEngine } = require('../src/frontend-reality/visual-reality-engine');

test('shell screen inventory carries domain and declared contracts without claiming runtime verification', () => {
  const inventory = new VisualRealityEngine({}).scanShell();
  const city = inventory.screens.find((screen) => screen.route === '#city');
  const ide = inventory.screens.find((screen) => screen.route === '#ide');

  assert.equal(inventory.status, 'STATIC_INVENTORY');
  assert.equal(inventory.verificationStatus, 'NOT_VERIFIED');
  assert.equal(city.domain, 'command');
  assert.equal(city.purpose, 'runtime visual, workers e métricas');
  assert.deepEqual(city.readEndpoints, ['/api/v2/living-city/state']);
  assert.equal(city.verificationStatus, 'NOT_VERIFIED');
  const runtime = inventory.screens.find((screen) => screen.route === '#runtime');
  assert.deepEqual(runtime.readEndpoints, ['/health', '/api/v2/living-city/state']);
  assert.deepEqual(ide.actionEndpoints, [{ endpoint: '/api/v2/vision/inspect-element', method: 'POST' }]);
});
