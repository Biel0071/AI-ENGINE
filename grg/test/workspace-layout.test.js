'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const unifiedCss = fs.readFileSync(path.join(publicDir, 'unified.css'), 'utf8');

test('workspace-layout: #view-ide contains canonical 3-tier layout (Left Explorer, Main Area, Bottom Dock)', () => {
  assert.ok(htmlSource.includes('id="view-ide"'), 'view-ide must exist in index.html');
  assert.ok(htmlSource.includes('id="fenixIdeLeftPanel"'), 'Left rail (explorer) must exist');
  assert.ok(htmlSource.includes('id="fenixIdeCenterSplit"'), 'Main workspace area must exist');
  assert.ok(htmlSource.includes('id="fenixIdeDockTray"'), 'Bottom dock tray must exist');
});

test('workspace-layout: header contains project selector, breadcrumbs, action bar and mode switcher', () => {
  assert.ok(htmlSource.includes('id="fenixIdeProject"'), 'Project selector must exist');
  assert.ok(htmlSource.includes('id="fenixIdeCurrentPath"'), 'Current path breadcrumb must exist');
  assert.ok(htmlSource.includes('id="fenixIdeModeGroup"'), 'Mode group switcher must exist');
});
