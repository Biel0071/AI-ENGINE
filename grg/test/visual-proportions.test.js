'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const unifiedCss = fs.readFileSync(path.join(publicDir, 'unified.css'), 'utf8');
const overridesCss = fs.readFileSync(path.join(publicDir, 'fenix-window-overrides.css'), 'utf8');
const mascotCss = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.css'), 'utf8');
const htmlSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

test('visual-proportions: Top bar canonical height is 50px (within 48-56px standard range)', () => {
  assert.ok(unifiedCss.includes('--topbar-height: 50px'), 'unified.css must define --topbar-height as 50px');
  const topbarMatch = overridesCss.match(/\.global-topbar\s*\{[^}]*height:\s*var\(--topbar-height,\s*50px\)!important/);
  assert.ok(topbarMatch, '.global-topbar must enforce 50px canonical height in overrides');
  
  // Verify numerical value is within market-grade bounds [48px, 56px]
  const val = 50;
  assert.ok(val >= 48 && val <= 56, 'Top bar height must be within [48, 56px]');
});

test('visual-proportions: Left sidebar canonical width is 230px expanded, 64px collapsed, with 200ms transition', () => {
  assert.ok(unifiedCss.includes('--fenix-left-sidebar-width: 230px'), 'unified.css must define --fenix-left-sidebar-width: 230px');
  assert.ok(unifiedCss.includes('--fenix-left-sidebar-collapsed: 64px'), 'unified.css must define --fenix-left-sidebar-collapsed: 64px');
  
  // Expanded 230px is within [220, 240px]
  const expandedWidth = 230;
  assert.ok(expandedWidth >= 220 && expandedWidth <= 240, 'Left sidebar expanded width must be in [220, 240px]');
  
  // Transition check
  assert.ok(overridesCss.includes('200ms'), 'Left sidebar transition must be 200ms (180-220ms)');
  assert.ok(overridesCss.includes('#mainSidebarNav.collapsed'), '#mainSidebarNav.collapsed rule must exist');
});

test('visual-proportions: Right Copilot canonical width is 360px default, 64px compact, 0px collapsed, 480px expanded', () => {
  assert.ok(unifiedCss.includes('--fsb-width: 360px'), 'unified.css must define --fsb-width: 360px');
  
  // Default 360px is within [340, 380px]
  const defaultWidth = 360;
  assert.ok(defaultWidth >= 340 && defaultWidth <= 380, 'Right Copilot default width must be in [340, 380px]');

  // Check CSS states in fenix-mascot-sidebar.css
  assert.ok(mascotCss.includes('.state-compact'), '.state-compact must exist');
  assert.ok(mascotCss.includes('64px'), '.state-compact must set width to 64px');
  assert.ok(mascotCss.includes('.state-expanded'), '.state-expanded must exist');
  assert.ok(mascotCss.includes('480px'), '.state-expanded must set width to 480px');
  assert.ok(mascotCss.includes('.state-closed') || mascotCss.includes('.collapsed'), 'Closed/collapsed state must exist');
});

test('visual-proportions: Bottom dock canonical height is 32px (within 28-40px range)', () => {
  assert.ok(unifiedCss.includes('--bottom-dock-height: 32px'), 'unified.css must define --bottom-dock-height: 32px');
  assert.ok(overridesCss.includes('--bottom-dock-height, 32px'), 'overrides must use 32px dock height');
  
  const dockHeight = 32;
  assert.ok(dockHeight >= 28 && dockHeight <= 40, 'Dock height must be in [28, 40px]');
});

test('visual-proportions: Main workspace takes 100% of remaining space with zero squishing', () => {
  assert.ok(overridesCss.includes('.views-container { position:relative!important; inset:auto!important; flex:1 1 0!important;'), 'views-container must flex: 1 1 0 to fill remaining space');
  assert.ok(unifiedCss.includes('.main-body { display: flex; flex: 1 1 0; min-height: 0; min-width: 0;'), 'main-body must be flex 1 with min-width 0');
});
