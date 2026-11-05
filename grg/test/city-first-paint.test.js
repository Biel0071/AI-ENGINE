'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

test('the City is the visible first paint before route scripts finish loading', () => {
  const html = readFileSync(join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const command = html.match(/<div\b[^>]*id="view-command"[^>]*>/)?.[0] || '';
  const city = html.match(/<div\b[^>]*id="view-city"[^>]*>/)?.[0] || '';

  assert.match(city, /\bactive\b/, 'the primary City view must be active in the initial document');
  assert.doesNotMatch(command, /\bactive\b/, 'the legacy cockpit must not flash before routing completes');
  const responsiveStylesheet = html.match(/<link\b[^>]*href="([^"]*fenix-responsive\.css\?v=[^"]+)"[^>]*>/)?.[1] || '';
  const cityCompositionStylesheet = html.match(/<link\b[^>]*href="([^"]*city-runtime-composition\.css\?v=[^"]+)"[^>]*>/)?.[1] || '';
  assert.ok(responsiveStylesheet, 'the responsive stylesheet must load with a cache-busting version');
  assert.ok(cityCompositionStylesheet, 'the City composition stylesheet must load with a cache-busting version');
});

test('legacy hash aliases are canonicalized during in-page navigation', () => {
  const html = readFileSync(join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const aliasesStart = html.indexOf('const ROUTE_ALIASES = {');
  const aliasesOpen = html.indexOf('{', aliasesStart);
  const aliasesClose = html.indexOf('\n  };', aliasesStart);
  const aliases = vm.runInNewContext(`(${html.slice(aliasesOpen, aliasesClose + 4).replace(/;$/, '')})`);
  const handlerStart = html.indexOf('window.handleHashChange = function() {');
  const handlerEnd = html.indexOf("window.addEventListener('hashchange', window.handleHashChange)", handlerStart);
  const handler = html.slice(handlerStart, handlerEnd);

  assert.ok(aliasesStart >= 0 && aliasesClose > aliasesOpen, 'canonical aliases exist');
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, 'hash handler exists');
  assert.match(handler, /ROUTE_ALIASES\[view\]/, 'runtime hash navigation resolves the same aliases as cold start');
  assert.match(handler, /history\.replaceState\(null,\s*''/, 'alias URLs are rewritten to their canonical route');
  assert.match(handler, /window\.showView\(canonicalView, false\)/, 'the canonical view is shown without a second route transition');

  const location = { pathname: '/app', search: '?designboard=1.3', hash: '#command' };
  const shown = [];
  const window = { location, showView: (...args) => shown.push(args) };
  const history = { replaceState: (_state, _title, href) => {
    const next = new URL(href, 'https://fenix.test');
    Object.assign(location, { pathname: next.pathname, search: next.search, hash: next.hash });
  } };
  vm.runInNewContext(handler, { window, history, ROUTE_ALIASES: aliases, setTimeout });
  window.handleHashChange();
  assert.equal(location.hash, '#city');
  assert.equal(location.search, '?designboard=1.3');
  assert.deepEqual(shown[0], ['city', false]);

  Object.assign(location, { hash: '#tasks/mission-42' });
  window.handleHashChange();
  assert.equal(location.hash, '#operations/mission-42', 'alias subroutes remain attached to their canonical view');
  assert.deepEqual(shown[1], ['operations', false]);
});
