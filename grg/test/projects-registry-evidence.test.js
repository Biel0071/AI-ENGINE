'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildProjectReadSummary, buildScreenInspection } = require('../src/api/projects-registry-routes');

test('project read summary leaves unmeasured screens and health unset', () => {
  assert.deepEqual(buildProjectReadSummary({
    stats: { totalFiles: 0, routesCount: 0, componentsCount: 0 }
  }), {
    totalFiles: 0,
    screensCount: null,
    componentsCount: 0,
    apisCount: 0,
    healthScore: null
  });
});

test('browser inspection does not invent a URL, screenshot, title, or quality score', () => {
  assert.deepEqual(buildScreenInspection({ count: 0, screens: [] }), {
    status: 'NOT_AVAILABLE',
    inspection: null
  });
});

test('browser inspection carries only evidence present in the discovered screen', () => {
  assert.deepEqual(buildScreenInspection({
    count: 1,
    screens: [{ name: 'Dashboard', route: '/', url: 'https://example.test', source: 'LIVE_BROWSER' }]
  }), {
    status: 'DISCOVERED',
    inspection: {
      title: 'Dashboard',
      route: '/',
      url: 'https://example.test/',
      source: 'LIVE_BROWSER',
      visualQualityScore: null,
      screenshotPublicUrl: null
    }
  });
});
