const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const interactions = fs.readFileSync(path.join(publicDir, 'fenix-v11-interactions.js'), 'utf8');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const premiumWorld = fs.readFileSync(path.join(publicDir, 'premium-world-live.js'), 'utf8');
const cityWorld3d = fs.readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');
const cityReality = fs.readFileSync(path.join(publicDir, 'city-reality-engine.js'), 'utf8');
const coreController = fs.readFileSync(path.join(publicDir, 'fenix-core-controller.js'), 'utf8');
const runtimeCockpit = fs.readFileSync(path.join(publicDir, 'runtime-cockpit.js'), 'utf8');

test('application boot defers non-critical external scripts without changing their execution order', () => {
  const deferredBootAssets = [
    '/agent-roster-filter.js', '/agent-activity-filter.js', '/runtime-control-overview.js', '/fenix-core-controller.js',
    '/city-return.js', '/runtime-health-badge.js', '/fenix-bootstrap.js', '/live-runtime.js', '/fenix-city-event-adapter.js',
    '/dev-pipeline-client.js', '/command-center.js', '/fenix-visual-ide.js', '/global-selection-store.js',
    '/operations-live.js', '/fenix-v8-ui.js', '/fenix-command-palette.js', '/fenix-screen-adaptive.js',
    '/fenix-task-modal.js', '/fenix-dynamic-agent-hud.js'
  ];
  const scriptLines = html.split(/\r?\n/).filter((line) => /<script\b[^>]*\bsrc=/.test(line));
  for (const asset of deferredBootAssets) {
    const tag = scriptLines.find((line) => line.includes(asset));
    assert.ok(tag, `boot asset ${asset} should remain included`);
    assert.match(tag, /\bdefer\b/, `boot asset ${asset} should not block HTML parsing`);
  }
  const requestGuard = scriptLines.find((line) => line.includes('/fenix-request-guard.js'));
  assert.ok(requestGuard && !/\bdefer\b|\basync\b/.test(requestGuard), 'request guard must stay synchronous before other scripts issue requests');
  const globalCompatibilityBridge = scriptLines.find((line) => line.includes('/unified-app.js'));
  assert.ok(globalCompatibilityBridge && !/\bdefer\b|\basync\b/.test(globalCompatibilityBridge), 'the compatibility bridge must run before the canonical router script below it');
});

test('dashboard summary polling runs only on the visible command view', () => {
  assert.match(coreController, /function isCommandDashboardActive\(\)\s*\{\s*if \(document\.hidden\) return false;/,
    'pause dashboard polling while the browser tab is hidden');
  assert.match(coreController, /function refreshDashboardIfActive\(\)\s*\{[\s\S]{0,180}if \(dashboardRefreshInFlight\) return dashboardRefreshInFlight;/,
    'coalesce route and timer refreshes while a dashboard request is pending');
  assert.match(coreController, /setInterval\(\(\) => \{\s*refreshDashboardIfActive\(\);\s*\}, 30000\)/,
    'refresh dashboard summary every 30 seconds only on its visible view');
  assert.match(coreController, /const loadDashboardIfActive = \(\) => \{\s*refreshDashboardIfActive\(\);/,
    'skip the dashboard fetch when the app starts on another route');
  assert.doesNotMatch(coreController, /setInterval\([\s\S]{0,100}window\.loadDashboardState\(\)[\s\S]{0,30},\s*10000\)/,
    'remove unconditional ten-second polling');
});

test('dashboard telemetry is visibility and route aware, with a 30-second fallback', () => {
  assert.ok(/COMMAND_TELEMETRY_POLL_INTERVAL_MS\s*=\s*30_000/.test(interactions), 'use a 30-second fallback interval');
  assert.ok(/if \(shouldSyncCommandTelemetry\(\)\) syncLiveTargetTelemetry\(\)/.test(interactions), 'gate initial sync by active view and visibility');
  assert.ok(/document\.addEventListener\('visibilitychange'/.test(interactions), 'refresh when the tab becomes visible');
  assert.ok(!/setInterval\(syncLiveTargetTelemetry,\s*5000\)/.test(interactions), 'remove five-second polling');
});

test('agent list is fetched only by its visible view loader, not at application boot or legacy traps', () => {
  const boot = interactions.match(/const bootV11Interactions = \(\) => \{([\s\S]*?)\n  \};/);
  assert.ok(boot, 'initialization function should be present');
  assert.doesNotMatch(boot[1], /fenixLoadAgents/);

  const dispatcher = html.match(/else if \(viewId === 'agents'\) \{([\s\S]*?)\n      \} else if \(viewId === 'operations'\)/);
  assert.ok(dispatcher, 'agent route dispatcher should be present');
  assert.match(dispatcher[1], /window\.fenixLoadAgents/);
  assert.doesNotMatch(dispatcher[1], /loadAgentsTable|renderAgentsTable/);
});

test('legacy command summary does not poll or load during City startup', () => {
  assert.doesNotMatch(html, /setInterval\(\(\) => \{\s*if \(!document\.hidden && isCommandViewActive\(\)\) updateRealityEngineData\(\);\s*\}, 30000\)/,
    'the legacy cockpit is an alias for City and must not poll an unused infrastructure summary');
  assert.doesNotMatch(html, /setTimeout\(\(\) => \{\s*if \(!document\.hidden\) updateRealityEngineData\(\);\s*\}, 300\)/,
    'City startup must not trigger an additional full-system summary request');
  assert.ok(/setInterval\(\(\) => \{\s*if \(!document\.hidden\) syncPlatformRibbon\(\);\s*\}, 30000\)/.test(html), 'poll platform status every 30 seconds only while visible');
});

test('runtime cockpit skips dashboard project, job, and mission loaders while City is active', () => {
  assert.match(runtimeCockpit, /const isCityOnly = activeView === 'view-city' && !forceDomain;/,
    'identify City hydration so it does not duplicate the World snapshot');
  const dashboardLoaders = runtimeCockpit.match(/if \(!isCityOnly\)\s*\{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.ok(dashboardLoaders.includes("api('/api/fenix/projects')"), 'load project catalog on dashboard routes');
  assert.ok(dashboardLoaders.includes("api('/api/v2/jobs'"), 'load job list on dashboard routes');
  assert.ok(dashboardLoaders.includes("api('/api/missions'"), 'load mission list on dashboard routes');
});

test('city renderers share one measured snapshot instead of polling the same state independently', () => {
  assert.match(premiumWorld, /setInterval\(\(\) => \{ if \(view\.classList\.contains\('active'\)\) refresh\(\); \}, 15000\)/,
    'the visible city snapshot should refresh on a single 15-second cadence');
  const isoCity = fs.readFileSync(path.join(publicDir, 'iso-city.js'), 'utf8');
  assert.doesNotMatch(isoCity, /setInterval\(\(\) => \{\s*const active = document\.querySelector\('\.view\.active'\)\?\.id;[\s\S]{0,180}?syncRealData\(\);\s*\},\s*3000\)/,
    'the 2D city must not run a competing three-second poll');
  assert.doesNotMatch(cityReality, /fetchFn\('\/api\/v2\/living-city\/state'/,
    'the dock must consume the shared world snapshot instead of fetching city state');
  assert.match(cityWorld3d, /window\.FENIX\?\.cityWorld\?\.snapshot/,
    'the 3D world should render the shared measured snapshot');
  assert.match(cityWorld3d, /addEventListener\(['"]fenix:city-world['"], this\.syncRealData\)/,
    'the 3D world should update when the shared snapshot changes');
  assert.doesNotMatch(cityWorld3d, /addEventListener\(['"]fenix:data['"], this\.syncRealData\)/,
    'generic data events must not trigger another world-state request');
  assert.match(cityReality, /window\.FENIX\?\.cityWorld\?\.snapshot/,
    'the city dock should reuse the shared measured snapshot');
});

test('3D city rendering scales GPU cost to viewport and capture is opt-in', () => {
  assert.match(cityWorld3d, /preserveDrawingBuffer:\s*false/,
    'preserving the WebGL buffer should be disabled for the interactive renderer');
  assert.match(cityWorld3d, /const pixelRatio = Math\.min\(window\.devicePixelRatio \|\| 1, compactViewport \? 1 : 1\.25\)/,
    'cap the renderer pixel ratio to avoid excessive compact viewport GPU work');
  assert.match(cityWorld3d, /const compactViewport = this\._isCompactViewport\(\);[\s\S]*?this\.renderer\.shadowMap\.enabled = !compactViewport;/,
    'disable expensive dynamic shadows on compact and split-window viewports');
});
