'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const unifiedCss = fs.readFileSync(path.join(publicDir, 'unified.css'), 'utf8');
const mascotCss = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.css'), 'utf8');
const overridesCss = fs.readFileSync(path.join(publicDir, 'fenix-window-overrides.css'), 'utf8');

test('responsive-layout: Root app layout strictly clips overflow and prevents horizontal scrolling', () => {
  assert.ok(unifiedCss.includes('overflow: hidden;'), 'Body or layout must have overflow: hidden');
  assert.ok(overridesCss.includes('overflow:hidden!important;'), 'html,body must have overflow:hidden!important in overrides');
  assert.ok(overridesCss.includes('.views-container { position:relative!important; inset:auto!important; flex:1 1 0!important; width:auto!important; min-width:0!important; height:100%!important; overflow:hidden!important;'), 'views-container must enforce min-width: 0 and overflow: hidden');
});

test('responsive-layout: Media queries cover standard breakpoints (1440px, 1100-1200px, <900px)', () => {
  assert.ok(unifiedCss.includes('@media (max-width: 1400px)') || unifiedCss.includes('@media (max-width: 1440px)'), 'Large/desktop breakpoint must exist');
  assert.ok(unifiedCss.includes('@media (max-width: 1100px)') || unifiedCss.includes('@media (max-width: 1200px)'), 'Medium breakpoint must exist');
  assert.ok(mascotCss.includes('@media (max-width: 900px)'), 'Mobile/drawer breakpoint (<900px) must exist for Copilot');
});

test('responsive-layout: Copilot transforms to overlay drawer mode below 900px', () => {
  const match = mascotCss.match(/@media\s*\(max-width:\s*900px\)\s*\{([\s\S]*?)\}/);
  assert.ok(match, 'Drawer query for max-width: 900px must exist');
  const drawerRules = match[1];
  assert.ok(drawerRules.includes('position: fixed'), 'Below 900px, sidebar must position: fixed as overlay drawer');
  assert.ok(drawerRules.includes('z-index:'), 'Drawer must have higher z-index above content');
});

test('responsive-layout: Flexible workspace cards preserve min-width: 0 to prevent flex item blowout', () => {
  assert.ok(unifiedCss.includes('min-width: 0;'), 'min-width: 0 must be used on flex children');
  assert.ok(overridesCss.includes('min-width:0!important;'), 'min-width:0!important must be enforced on views-container');
});
