'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveStaticNavigationEdges } = require('../src/frontend-reality/static-navigation-evidence');

test('navigation edges require an explicit same-workspace control and known target screen', () => {
  const html = `
    <nav id="v10SidebarMenu">
      <button data-view="home" data-nav="home" onclick="window.showView('home')">Home</button>
      <button data-view="settings" data-nav="settings" onclick="window.showView('settings')">Settings &amp; privacy</button>
      <button data-view="external" data-nav="external" onclick="window.showView('external')">External</button>
    </nav>`;
  const screens = [
    { screenId: 'screen_home', route: '#home', sourceFile: 'public/index.html' },
    { screenId: 'screen_settings', route: '#settings', sourceFile: 'public/index.html' },
    { screenId: 'unrelated_home', route: '#home', sourceFile: 'archive/index.html' },
  ];

  const edges = deriveStaticNavigationEdges(html, 'public/index.html', screens);

  assert.deepEqual(edges.get('screen_home'), [{
    targetScreenId: 'screen_settings',
    action: 'Settings & privacy',
    evidenceSource: 'STATIC_SOURCE',
    verificationStatus: 'NOT_VERIFIED',
    sourceFile: 'public/index.html',
    sourceLine: 4,
    selector: '#v10SidebarMenu [data-nav="settings"]',
  }]);
  assert.deepEqual(edges.get('screen_settings'), [{
    targetScreenId: 'screen_home',
    action: 'Home',
    evidenceSource: 'STATIC_SOURCE',
    verificationStatus: 'NOT_VERIFIED',
    sourceFile: 'public/index.html',
    sourceLine: 3,
    selector: '#v10SidebarMenu [data-nav="home"]',
  }]);
  assert.equal(edges.has('unrelated_home'), false);
});
