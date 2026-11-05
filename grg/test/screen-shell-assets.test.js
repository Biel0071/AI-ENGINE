const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

test('primary navigation does not expose two entries that route to the same screen', () => {
  const nav = [...html.matchAll(/<button\b[^>]*data-view=["']([^"']+)["']/g)].map(match => match[1]);
  const aliases = { command: 'city' };
  const destinations = nav.map(route => aliases[route] || route);
  assert.equal(new Set(destinations).size, destinations.length, 'each primary item must open a distinct workspace');
});

test('canonical shell exposes every screen and has no duplicate navigation entries', () => {
  const nav = [...html.matchAll(/data-view=["']([^"']+)["']/g)].map(match => match[1]);
  const views = [...html.matchAll(/id=["']view-([^"']+)["']/g)].map(match => match[1]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'frontend-screen-manifest.json'), 'utf8'));
  assert.equal(new Set(nav).size, nav.length, 'primary navigation destinations must be unique');
  assert.equal(Object.keys(manifest.screens).length, 15);
  for (const screen of Object.keys(manifest.screens)) {
    assert.ok(views.includes(screen), `${screen} must have a canonical view in the shell`);
  }
  for (const route of nav) assert.ok(manifest.screens[route], `${route} must resolve to a documented screen`);
});

test('screen manifest maps every canonical screen into one of five functional domains', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'frontend-screen-manifest.json'), 'utf8'));
  const screens = Object.keys(manifest.screens);
  const grouped = Object.values(manifest.domains).flat();
  assert.equal(Object.keys(manifest.domains).length, 5);
  assert.equal(new Set(grouped).size, screens.length);
  assert.deepEqual(new Set(grouped), new Set(screens));
});

test('bootstrap assets exist and static/dynamic loading is deduplicated', () => {
  const bootstrap = fs.readFileSync(path.join(publicDir, 'fenix-bootstrap.js'), 'utf8');
  const dynamic = [...bootstrap.matchAll(/['"](\/(?:[^'"]+\.js)(?:\?[^'"]*)?)['"]/g)].map(match => match[1].split('?')[0]);
  assert.ok(dynamic.length >= 7);
  for (const asset of dynamic) assert.ok(fs.existsSync(path.join(publicDir, asset)), `${asset} is missing`);
  assert.equal((html.match(/src=["'][^"']*unified-app\.js/g) || []).length, 1, 'unified-app.js must be included once');
  assert.match(bootstrap, /document\.querySelector\(`script\[src\*="\$\{cleanSrc\}"\]`\)/, 'dynamic bootstrap must skip assets already present in the shell');
  for (const asset of ['runtime-cockpit.js', 'live-runtime.js', 'ide-enhancer.js']) {
    assert.ok((html.match(new RegExp(`src=["'][^"']*${asset.replace('.', '\\.')}`,'g')) || []).length <= 1, `${asset} must not be statically duplicated`);
  }
});

test('Project Hub screen assets are cache-busted and resolve to local files', () => {
  const stylesheet = html.match(/href=["'](\/project-hub-live\.css\?v=[^"']+)["']/);
  const script = html.match(/src=["'](\/project-hub-live\.js\?v=[^"']+)["']/);
  assert.ok(stylesheet, 'Project Hub stylesheet must include an explicit revision');
  assert.ok(script, 'Project Hub script must include an explicit revision');
  assert.ok(fs.existsSync(path.join(publicDir, 'project-hub-live.css')));
  assert.ok(fs.existsSync(path.join(publicDir, 'project-hub-live.js')));
});

test('World 3D stylesheet revision is updated when label presentation changes', () => {
  assert.match(html, /href=["']\/fenix-world-3d\.css\?v=8-city-inspector-hig-copy["']/);
  assert.ok(fs.existsSync(path.join(publicDir, 'fenix-world-3d.css')));
});
