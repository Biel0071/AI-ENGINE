'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const cssSource = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.css'), 'utf8');
const responsiveCss = fs.readFileSync(path.join(publicDir, 'fenix-responsive.css'), 'utf8');
const unifiedCss = fs.readFileSync(path.join(publicDir, 'unified.css'), 'utf8');

test('workspace-responsive: CSS contains desktop docked layout for Copilot', () => {
  assert.ok(cssSource.includes('.fsb-docked'), '.fsb-docked class must exist');
  assert.ok(
    cssSource.includes('body.has-right-sidebar-open.fsb-docked'),
    'Desktop dock rule must offset main content to prevent overlay'
  );
});

test('workspace-responsive: CSS media queries handle tablet and mobile transitions', () => {
  assert.ok(responsiveCss.includes('@media (max-width: 760px)'), 'Shared responsive stylesheet must define the mobile layout');
  assert.ok(responsiveCss.includes('--fsb-width'), 'Responsive chat width must honor the saved adjustable width');
  assert.ok(
    cssSource.includes('width: 100% !important;') || cssSource.includes('width: 100vw'),
    'Mobile sidebar must occupy full viewport drawer'
  );
  assert.ok(unifiedCss.includes('@media'), 'unified.css must contain responsive rules');
});

test('workspace-responsive: City minimap clears fixed navigation and chat overlays', () => {
  assert.ok(responsiveCss.includes('#view-city .fenix-city-minimap { left: 84px !important; }'), 'Tablet City offsets the minimap past the icon rail');
  assert.ok(responsiveCss.includes('body.menu-open #view-city .fenix-city-minimap'), 'Expanded tablet menu gets its own minimap offset');
  assert.ok(responsiveCss.includes('body.sidebar-labels-visible #view-city .fenix-city-minimap { left: 254px !important; }'), 'The medium-width label drawer does not cover the minimap');
  assert.ok(responsiveCss.includes('#view-city .fenix-city-minimap { bottom: 100px !important; }'), 'The minimap sits clear of the City control pill');
  assert.ok(responsiveCss.includes('body.has-right-sidebar-open #view-city .fenix-city-minimap { display: none !important; }'), 'Mobile chat hides the map overlay it fully covers');
  assert.ok(responsiveCss.includes('#view-city #fenixCityNavPill {'), 'Mobile City controls stay within the viewport');
  assert.ok(responsiveCss.includes('body.sidebar-labels-visible #mainSidebarNav,'), 'Mobile sidebar labels keep the horizontal navigation layout');
});

test('workspace-responsive: compact status KPIs fit the 1440px header', () => {
  assert.ok(responsiveCss.includes('.fnx-kpi-value { font-size: 14px !important; }'), 'Measured status values shrink slightly before the tablet breakpoint');
  assert.ok(responsiveCss.includes('#topKpiSystemVal { font-size: 11px !important;'), 'The longer system status value remains readable within its capsule');
  assert.ok(responsiveCss.includes('.fnx-kpi-capsule.kpi-green .fnx-kpi-label { display: none !important; }'), 'The long system state keeps its measured value without a clipped duplicate label');
});
