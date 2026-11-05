const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const loaderStart = html.indexOf('window.loadCityView = async function(options = {}) {');
const loaderEnd = html.indexOf('// 2. IDE View Loader', loaderStart);
const loader = html.slice(loaderStart, loaderEnd);

test('city bootstrap authenticates runtime reads and surfaces recoverable errors', () => {
  assert.ok(loaderStart >= 0 && loaderEnd > loaderStart, 'city loader is available');
  assert.match(loader, /window\.fenixAuthedFetch \|\| window\.fenixFetch \|\| fetch/);
  assert.match(loader, /if \(!response\.ok\)/);
  assert.match(loader, /cityRuntimeLoadStatus/);
  assert.match(loader, /Sessão expirada/);
  assert.match(html, /onclick="window\.loadCityView\?\.\(\{force:true\}\)"/);
});

test('city bootstrap uses the canonical world snapshot and falls back to the measured agent route', () => {
  assert.match(loader, /requestJSON\('\/api\/v2\/living-city\/state'\)/);
  assert.match(loader, /requestJSON\('\/api\/v2\/living-city\/agents'\)/);
  assert.doesNotMatch(loader, /requestJSON\('\/api\/v2\/city\/state'\)/);
  assert.match(loader, /if \(!Array\.isArray\(livingState\?\.agents\)\)/);
  assert.match(loader, /throw stateError/);
  assert.match(loader, /if \(!Array\.isArray\(agentsRes\?\.agents\)\) throw/);
});
