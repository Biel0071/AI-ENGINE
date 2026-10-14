'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const ideSource = fs.readFileSync(path.join(publicDir, 'project-ide-live.js'), 'utf8');
const sidebarSource = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.css'), 'utf8');
const unifiedCssSource = fs.readFileSync(path.join(publicDir, 'unified.css'), 'utf8');

test('V15 Single Copilot: exactly one global right sidebar and NO duplicate copilot inside view-ide', () => {
  // Global sidebar exists and is created with id fenix-right-sidebar
  assert.ok(sidebarSource.includes("'fenix-right-sidebar'"));

  // Ensure view-ide has no active inner copilot sidebar (it is relegated to hidden proxies)
  const viewIdeMatch = htmlSource.match(/<div id="view-ide"[\s\S]*?<\/div>\s*<div id="view-project"/);
  assert.ok(viewIdeMatch, 'view-ide must be present in index.html');
  const viewIdeHtml = viewIdeMatch[0];

  assert.ok(
    viewIdeHtml.includes('id="fenixIdeCopilotProxies"'),
    'Inner copilot must be moved to hidden compatibility proxies'
  );
  assert.ok(
    viewIdeHtml.includes('style="display:none;" aria-hidden="true" id="fenixIdeCopilotProxies"'),
    'fenixIdeCopilotProxies must be display:none and aria-hidden'
  );
});

test('V15 Mode Switching: 4 canonical modes (Code, Preview, Split, World) with center layout', () => {
  assert.ok(htmlSource.includes('id="btnIdeModeCode"'));
  assert.ok(htmlSource.includes('id="btnIdeModePreview"'));
  assert.ok(htmlSource.includes('id="btnIdeModeSplit"'));
  assert.ok(htmlSource.includes('id="btnIdeModeWorld"'));

  // Central viewport elements
  assert.ok(htmlSource.includes('id="fenixIdeCenterSplit"'));
  assert.ok(htmlSource.includes('id="fenixIdeEditorArea"'));
  assert.ok(htmlSource.includes('id="fenixIdeSplitDivider"'));
  assert.ok(htmlSource.includes('id="fenixIdePreviewPane"'));
  assert.ok(htmlSource.includes('id="fenixIdeWorldPane"'));
  assert.ok(htmlSource.includes('id="fenixIdeWorldMount"'));

  // JS Controller logic handles all 4 modes
  assert.match(ideSource, /if\s*\(newMode\s*===\s*'code'\)/);
  assert.match(ideSource, /else\s+if\s*\(newMode\s*===\s*'preview'\)/);
  assert.match(ideSource, /else\s+if\s*\(newMode\s*===\s*'world'\)/);
  assert.match(ideSource, /btnWorld\.classList\.add\('active'\)/);
});

test('V15 Anti-Recursion Shield: preview blocks infinite nesting of host shell (Rule 24)', () => {
  assert.ok(htmlSource.includes('id="fenixAntiRecursionBanner"'));
  assert.match(ideSource, /function isRecursionUrl\(url\)/);
  assert.match(ideSource, /lower\s*===\s*'\/app'/);
  assert.match(ideSource, /antiRecBanner\.style\.display\s*=\s*'flex'/);
});

test('V15 Universal Copilot: Context Bar, Contextual Chips and Diff Container', () => {
  // Context Bar in sidebar markup
  assert.ok(sidebarSource.includes('id="fsbContextBar"'));
  assert.ok(sidebarSource.includes('id="fsbCtxProject"'));
  assert.ok(sidebarSource.includes('id="fsbCtxFile"'));
  assert.ok(sidebarSource.includes('id="fsbCtxMode"'));
  assert.ok(sidebarSource.includes('id="fsbCtxAgent"'));

  // Dynamic chips row and diff container
  assert.ok(sidebarSource.includes('id="fsbChipsRow"'));
  assert.ok(sidebarSource.includes('id="fsbDiffContainer"'));
  assert.ok(sidebarSource.includes('id="fsbDiffCode"'));

  // Copilot context state and NLU dispatching
  assert.match(sidebarSource, /function updateCopilotContext/);
  assert.match(sidebarSource, /function renderContextualChips/);
  assert.match(sidebarSource, /window\.fenixCopilot\s*=\s*\{/);
  assert.match(sidebarSource, /updateContext:/);
  assert.match(sidebarSource, /getContext:/);
  assert.match(sidebarSource, /applyDiff:/);
  assert.match(sidebarSource, /rejectDiff:/);
});

test('V15 Collapsible Bottom Dock: collapsed by default (36px) and auto-expands on demand', () => {
  assert.ok(htmlSource.includes('fenix-ide-dock-tray collapsed'));
  assert.ok(htmlSource.includes('id="btnToggleDockTray"'));

  assert.match(ideSource, /window\.fenixToggleDockTray\s*=\s*\(force\)\s*=>/);
  assert.match(ideSource, /tray\.classList\.remove\('collapsed'\)/);
  assert.match(ideSource, /tray\.style\.height\s*=\s*'240px'/);
  assert.match(ideSource, /window\.fenixToggleDockTray\(true\)/);

  // CSS supports collapsed height 36px
  assert.match(unifiedCssSource, /\.fenix-ide-dock-tray\.collapsed\s*\{\s*height:\s*36px\s*!important;\s*\}/);
});

test('V15 Zero-Mock & Honest Telemetry: context bar initializes with honest empty markers', () => {
  assert.match(sidebarSource, /<span id="fsbCtxProject">—<\/span>/);
  assert.match(sidebarSource, /<span id="fsbCtxFile">—<\/span>/);
  assert.match(sidebarSource, /<span id="fsbCtxMode">—<\/span>/);
  assert.match(sidebarSource, /<span id="fsbCtxAgent">—<\/span>/);
});
