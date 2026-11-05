'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const cssSource = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.css'), 'utf8');
const responsiveCss = fs.readFileSync(path.join(publicDir, 'fenix-responsive.css'), 'utf8');
const higCss = fs.readFileSync(path.join(publicDir, 'fenix-hig-system.css'), 'utf8');
const unifiedCss = fs.readFileSync(path.join(publicDir, 'unified.css'), 'utf8');
const adaptiveCss = fs.readFileSync(path.join(publicDir, 'fenix-screen-adaptive.css'), 'utf8');
const adaptiveJs = fs.readFileSync(path.join(publicDir, 'fenix-screen-adaptive.js'), 'utf8');
const poolHudJs = fs.readFileSync(path.join(publicDir, 'fenix-dynamic-agent-hud.js'), 'utf8');

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

test('workspace-responsive: saved copilot width cannot cover the tablet workspace', () => {
  const tabletRules = responsiveCss.match(/@media \(max-width: 1180px\) \{[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.ok(
    tabletRules.includes('clamp(320px, 42vw, 440px)'),
    'Tablet sidebar width must scale with the viewport and cap at 440px'
  );
  assert.ok(
    tabletRules.includes('#fenix-right-sidebar.state-expanded { width: min(var(--fsb-width, 380px), clamp(320px, 42vw, 440px)) !important;'),
    'Expanded state must honor the same tablet cap as the normal state'
  );
});

test('workspace-responsive: mobile chat drawer keeps a usable width despite flex shrink', () => {
  const mobileRules = responsiveCss.match(/@media \(max-width: 600px\) \{[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.ok(
    mobileRules.includes('#fenix-right-sidebar.state-expanded {') &&
      mobileRules.includes('max-width: calc(100vw - 12px) !important;') &&
      mobileRules.includes('flex: 0 0 min(var(--fsb-width, 380px), calc(100vw - 12px)) !important;'),
    'Expanded mobile chat must reserve its declared width instead of shrinking with the page layout'
  );
});

test('workspace-responsive: City minimap clears fixed navigation and chat overlays', () => {
  assert.ok(responsiveCss.includes('#view-city .fenix-city-minimap { left: 84px !important; }'), 'Tablet City offsets the minimap past the icon rail');
  assert.ok(responsiveCss.includes('body.menu-open #view-city .fenix-city-minimap'), 'Expanded tablet menu gets its own minimap offset');
  assert.ok(responsiveCss.includes('body.sidebar-labels-visible #view-city .fenix-city-minimap { left: 254px !important; }'), 'The medium-width label drawer does not cover the minimap');
  assert.ok(responsiveCss.includes('#view-city .fenix-city-minimap { bottom: 100px !important; }'), 'The minimap sits clear of the City control pill');
  assert.match(responsiveCss, /@media \(min-width: 761px\)\s*\{\s*#view-city #fenixCityNavPill \{ bottom: calc\(100px \+ 192px \+ 20px\) !important; \}/, 'Tablet and desktop map toolbar must dock above the raised minimap with a usable gap');
  assert.ok(responsiveCss.includes('body.has-right-sidebar-open #view-city .fenix-city-minimap { display: none !important; }'), 'Mobile chat hides the map overlay it fully covers');
  assert.ok(responsiveCss.includes('#view-city #fenixCityNavPill {'), 'Mobile City controls stay within the viewport');
  assert.ok(responsiveCss.includes('body.sidebar-labels-visible #mainSidebarNav,'), 'Mobile sidebar labels keep the horizontal navigation layout');
});

test('workspace-responsive: mobile City controls stay inside the viewport and do not cover the minimap', () => {
  assert.match(responsiveCss, /#view-city \.fenix-city-minimap \{\s*bottom:\s*calc\(var\(--bottom-dock-height\) \+ var\(--city-mobile-control-gap\) \+ var\(--city-universe-hud-height\) \+ var\(--city-mobile-control-gap\)\)\s*!important/s, 'Mobile minimap must remain above the bottom dock and universe controls');
  assert.match(responsiveCss, /#view-city #fenixCityNavPill\s*\{[^}]*bottom:\s*calc\(var\(--bottom-dock-height\) \+ var\(--city-mobile-control-gap\) \+ var\(--city-universe-hud-height\) \+ var\(--city-mobile-control-gap\) \+ var\(--city-mobile-minimap-height\) \+ 20px\)\s*!important/s, 'Mobile toolbar must leave a visible gap above the minimap');
  assert.match(responsiveCss, /#view-city #fenixUniverseExplorerHUD,[\s\S]*?#view-city \.fenix-universe-hud\s*\{[^}]*left:\s*8px\s*!important/s, 'The semantic zoom HUD must anchor to the mobile viewport instead of centering its desktop width');
  assert.match(responsiveCss, /#view-city #fenixUniverseExplorerHUD,[\s\S]*?#view-city \.fenix-universe-hud\s*\{[^}]*right:\s*8px\s*!important/s, 'The semantic zoom HUD must fit inside the mobile viewport');
  assert.match(responsiveCss, /body\.has-right-sidebar-open #view-city #fenixUniverseExplorerHUD,\s*body\.has-right-sidebar-open #view-city \.fenix-universe-hud \{\s*display:\s*none\s*!important/s, 'The chat drawer must not sit on top of the mobile City controls');
});

test('workspace-responsive: compact status KPIs fit the 1440px header', () => {
  assert.ok(responsiveCss.includes('.fnx-kpi-value { font-size: 14px !important; }'), 'Measured status values shrink slightly before the tablet breakpoint');
  assert.ok(responsiveCss.includes('#topKpiSystemVal { font-size: 11px !important;'), 'The longer system status value remains readable within its capsule');
  assert.ok(responsiveCss.includes('.fnx-kpi-capsule.kpi-green .fnx-kpi-label { display: none !important; }'), 'The long system state keeps its measured value without a clipped duplicate label');
});

test('workspace-responsive: compact KPI counts take priority over decorative icons', () => {
  const compactKpis = higCss.match(/\/\* Compact operational counts:.*?(?=\n\/\*|$)/s)?.[0] || '';
  assert.match(compactKpis, /@media \(max-width: 900px\)/, 'Compact headers must define a dedicated count-first layout');
  assert.match(compactKpis, /\.fnx-kpi-icon\s*\{\s*display:\s*none\s*!important;/, 'Decorative KPI icons must yield space to counts');
  assert.match(compactKpis, /\.fnx-kpi-data\s*\{[^}]*position:\s*static\s*!important/s, 'Counts must be centered in the capsule instead of overlaid as tiny badges');
  assert.match(compactKpis, /\.fnx-kpi-value\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s, 'Live counts must remain aligned and readable');
  assert.match(compactKpis, /\.kpi-cyan\s+\.fnx-kpi-value[^}]*var\(--fnx-cyan/s, 'Agent counts retain the cyan category color');
  assert.match(compactKpis, /\.kpi-orange\s+\.fnx-kpi-value[^}]*var\(--fnx-orange/s, 'Mission counts retain the orange category color');
  assert.match(compactKpis, /\.kpi-purple\s+\.fnx-kpi-value[^}]*var\(--fnx-purple/s, 'Job counts retain the purple category color');
});

test('workspace-responsive: compact header shows colored counts as primary values, not tiny icon badges', () => {
  const compactKpis = higCss.slice(higCss.indexOf('/* Compact top bar:'));
  assert.match(compactKpis, /@media \(max-width: 1180px\)/, 'Compact count-first layout covers narrow headers');
  assert.match(compactKpis, /\.fnx-kpi-data\s*\{[^}]*position:\s*static\s*!important/s, 'Counts must be in normal layout, not floating icon badges');
  assert.match(compactKpis, /\.fnx-kpi-value\s*\{[^}]*font-size:\s*16px\s*!important/s, 'Primary counts remain readable at compact widths');
  assert.match(higCss, /\.kpi-cyan\s+\.fnx-kpi-value[^}]*var\(--fnx-cyan/s, 'Agent count uses its category color');
  assert.match(higCss, /\.kpi-orange\s+\.fnx-kpi-value[^}]*var\(--fnx-orange/s, 'Mission count uses its category color');
  assert.match(higCss, /\.kpi-purple\s+\.fnx-kpi-value[^}]*var\(--fnx-purple/s, 'Job count uses its category color');
  assert.match(higCss, /\.kpi-green\s+\.fnx-kpi-value[^}]*var\(--fnx-green/s, 'System state uses the operational green');
});

test('workspace-responsive: screen profiles never shrink the whole interface', () => {
  assert.doesNotMatch(adaptiveCss, /--fnx-ui-scale:\s*0\./, 'Screen profiles must not make the whole UI smaller');
  assert.doesNotMatch(adaptiveJs, /scale\s*=\s*0\./, 'Viewport detection must preserve the readable base scale');
  assert.match(adaptiveJs, /visualViewport[^\n]*addEventListener\(['"]resize['"]/, 'Pinch zoom must re-evaluate the active screen profile');
});

test('workspace-responsive: tablet header keeps pool controls visible without overflowing', () => {
  const tabletRules = responsiveCss.match(/@media \(max-width: 1180px\) \{[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.match(tabletRules, /\.fnx-topbar-right\s*\{[^}]*max-width:\s*none\s*!important/s, 'Tablet header must release the narrow right slot for its real controls');
  assert.match(tabletRules, /#fnxDisplayHudPill\s*\{\s*display:\s*none\s*!important;/, 'Optional display telemetry must collapse before the pool and assistant controls');
  assert.match(tabletRules, /#fnxPoolHudBtn/, 'The agent pool control must remain available on tablet');
});

test('workspace-responsive: tablet pool menu escapes the clipped topbar', () => {
  const tabletRules = responsiveCss.match(/@media \(max-width: 1180px\) \{[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.match(tabletRules, /\.fnx-pool-panel\s*\{[^}]*position:\s*fixed\s*!important/s, 'The open pool menu must escape the topbar overflow clip');
  assert.match(tabletRules, /\.fnx-pool-panel\s*\{[^}]*top:\s*calc\(var\(--topbar-height\) \+ 6px\)/s, 'The pool menu must start below the fixed topbar');
  assert.match(tabletRules, /\.fnx-pool-panel\s*\{[^}]*max-height:\s*calc\(100dvh/s, 'The pool menu must fit short viewports');
});

test('workspace-responsive: mobile pool menu remains usable inside the viewport', () => {
  const mobileRules = responsiveCss.match(/@media \(max-width: 760px\) \{[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.match(mobileRules, /#fnxPoolHudBtn/, 'The pool control must remain reachable on mobile');
  assert.match(mobileRules, /\.fnx-pool-panel\s*\{[^}]*position:\s*fixed/s, 'The pool menu must use the viewport instead of overflowing from the header');
  assert.match(mobileRules, /max-width:\s*calc\(100vw - 12px\)/, 'The pool menu must fit narrow mobile widths');
});

test('workspace-responsive: ultra-narrow phones keep the primary header controls in view', () => {
  const narrowRules = responsiveCss.match(/@media \(max-width: 360px\) \{[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.match(narrowRules, /\.v10-topbar-left\s*\{[^}]*max-width:\s*118px/s, 'The brand area must yield space on 320px screens');
  assert.match(narrowRules, /\.fnx-brand-meta\s*\{\s*display:\s*none\s*!important;/, 'Secondary brand text must collapse before navigation and primary actions');
  assert.match(narrowRules, /\.fnx-topbar-kpis-cluster\s*\{[^}]*max-width:\s*84px/s, 'The status cluster must stay within its compact slot');
});

test('workspace-responsive: tablet split reflows the workspace beside the chat', () => {
  const tabletRules = [...responsiveCss.matchAll(/@media \(min-width: 761px\) and \(max-width: 900px\) \{[\s\S]*?(?=\n@media|$)/g)]
    .map(([block]) => block)
    .find(block => block.includes('body.has-right-sidebar-open.fsb-docked')) || '';
  assert.match(tabletRules, /#fenix-right-sidebar\s*\{[^}]*width:\s*min\(var\(--fsb-width, 380px\), clamp\(320px, 42vw, 440px\)\)\s*!important/s, 'Tablet chat width must scale to the CSS viewport');
  assert.match(tabletRules, /--fnx-tablet-drawer-width:\s*min\(var\(--fsb-width, 380px\), clamp\(320px, 42vw, 440px\)\)/, 'The split must track the measured drawer width');
  assert.match(tabletRules, /body\.has-right-sidebar-open\.fsb-docked \.main-body \.views-container\s*\{[^}]*margin-right:\s*calc\(var\(--fnx-tablet-drawer-width\) \+ 16px\)\s*!important/s, 'The active workspace must reserve exactly one drawer width');
  const narrowContainer = responsiveCss.match(/@container \(max-width: 560px\) \{[\s\S]*?(?=\n@container|$)/)?.[0] || '';
  assert.match(narrowContainer, /#view-runtime \.runtime-overview\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s, 'Runtime summary cards must stack in the remaining tablet workspace');
  assert.ok(narrowContainer.includes('#view-runtime .workspace-grid.three-columns') && narrowContainer.includes('grid-template-columns: minmax(0, 1fr) !important;'), 'Runtime service cards must reflow when the docked chat narrows the view');
});

test('workspace-responsive: compact agent-pool control remains keyboard accessible', () => {
  assert.match(poolHudJs, /setAttribute\(['"]role['"],\s*['"]button['"]\)/, 'The compact pool icon must expose button semantics');
  assert.match(poolHudJs, /setAttribute\(['"]aria-expanded['"],\s*String\(/, 'The pool menu open state must be announced');
  assert.match(poolHudJs, /addEventListener\(['"]keydown['"]/, 'The pool menu must be usable without a pointer');
});


test('workspace-responsive: narrow split keeps agent roster and inspector in one scroll flow', () => {
  const splitRules = responsiveCss.match(/@container \(max-width: 560px\) \{[\s\S]*?(?=\n@container|$)/)?.[0] || '';
  assert.match(splitRules, /#view-agents \.fenix-workforce-layout\s*\{[^}]*min-height:\s*0\s*!important/s, 'Agent layout must not reserve a full extra viewport before its inspector');
  assert.match(splitRules, /#view-agents #fenixAgentDeepInspector\s*\{[^}]*width:\s*100%\s*!important/s, 'Agent inspector must use the available split width');
  assert.match(splitRules, /#view-agents \.fenix-module-title\s*\{[^}]*word-break:\s*normal\s*!important/s, 'Agent header must wrap between words instead of breaking labels');
});
