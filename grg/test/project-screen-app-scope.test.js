'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/project-hub-live.js'), 'utf8');
const start = source.indexOf('function getProjectScreens(project) {');
const end = source.indexOf('\n  function renderScreenPortfolio', start);
assert.ok(start >= 0 && end > start, 'Project Hub screen catalog merger is available');
const getProjectScreens = Function('state', `${source.slice(start, end)}; return getProjectScreens;`)({
  absorptions: new Map(),
  registeredScreens: new Map(),
});

test('Project Hub keeps same-route screens from separate app shells distinct', () => {
  const screens = getProjectScreens({
    id: 'workspace',
    screens: [
      { screenId: 'admin-home', applicationId: 'admin', route: '#/home', title: 'Admin' },
      { screenId: 'store-home', applicationId: 'store', route: '#/home', title: 'Storefront' },
      { screenId: 'admin-home-copy', applicationId: 'admin', route: '#/home', screenshotPath: '/admin-home.png' },
    ],
  });

  assert.equal(screens.length, 2);
  assert.deepEqual(screens.map((screen) => screen.title).sort(), ['Admin', 'Storefront']);
  assert.ok(screens.every((screen) => screen.showApplicationScope), 'app labels only appear when same-route app variants exist');
  assert.equal(screens.find((screen) => screen.applicationId === 'admin').screenshotPath, '/admin-home.png');
});
