const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const interactions = fs.readFileSync(path.join(publicDir, 'fenix-v11-interactions.js'), 'utf8');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

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

test('secondary telemetry polls only while useful to the visible command view', () => {
  assert.ok(/setInterval\(\(\) => \{\s*if \(!document\.hidden && isCommandViewActive\(\)\) updateRealityEngineData\(\);\s*\}, 30000\)/.test(html), 'poll infrastructure summary only on its visible screen');
  assert.ok(/setInterval\(\(\) => \{\s*if \(!document\.hidden\) syncPlatformRibbon\(\);\s*\}, 30000\)/.test(html), 'poll platform status every 30 seconds only while visible');
});
