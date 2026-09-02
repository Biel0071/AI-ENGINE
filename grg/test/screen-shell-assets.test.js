const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

test('canonical shell exposes every screen and has no duplicate navigation entries', () => {
  const nav = [...html.matchAll(/data-view=["']([^"']+)["']/g)].map(match => match[1]);
  const views = [...html.matchAll(/id=["']view-([^"']+)["']/g)].map(match => match[1]);
  assert.equal(nav.length, 14);
  assert.equal(new Set(nav).size, 14);
  assert.deepEqual(new Set(nav), new Set(views));
});

test('canonical shell aggregates the 14 screens into five collapsible functional groups', () => {
  const groups = [...html.matchAll(/class="nav-group" data-domain="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(groups, ['command', 'build', 'intelligence', 'infrastructure', 'validation']);
  assert.equal((html.match(/class="nav-group-label"/g) || []).length, 5);
});

test('bootstrap dynamic assets are present and statically loaded only once', () => {
  const bootstrap = fs.readFileSync(path.join(publicDir, 'fenix-bootstrap.js'), 'utf8');
  const dynamic = [...bootstrap.matchAll(/['"](\/(?:[^'"]+\.js)(?:\?[^'"]*)?)['"]/g)].map(match => match[1].split('?')[0]);
  assert.ok(dynamic.length >= 7);
  for (const asset of dynamic) assert.ok(fs.existsSync(path.join(publicDir, asset)), `${asset} is missing`);
  for (const asset of ['runtime-cockpit.js', 'unified-app.js', 'live-runtime.js', 'ide-enhancer.js']) {
    assert.equal((html.match(new RegExp(`src=["'][^"']*${asset.replace('.', '\\.')}`,'g')) || []).length, 0, `${asset} must not be statically duplicated`);
  }
});
