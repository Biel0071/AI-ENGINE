'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '../public');
const readPublic = (file) => fs.readFileSync(path.join(publicDir, file), 'utf8');

test('the visible City boots one canonical 3D renderer before legacy 2D boot hooks', () => {
  const html = readPublic('index.html');
  const worldScript = html.indexOf('src="/fenix-world-3d.js');
  const isoScript = html.indexOf('src="/iso-city.js');
  const flag = html.match(/window\.FENIX_WORLD_3D\s*=\s*(true|false)\s*;/);

  assert.ok(flag, 'the City renderer mode must be explicit in the canonical shell');
  assert.equal(flag[1], 'true', 'the renderer shown in the live City is World3D');
  assert.ok(worldScript >= 0 && isoScript > worldScript, 'World3D must load before the legacy IsoCity boot hook');
  assert.ok(flag.index < worldScript, 'the canonical renderer mode must be set before World3D starts');
});

test('World3D exposes the compatibility handle used by the existing Fênix shell', () => {
  const world = readPublic('fenix-world-3d.js');
  const exposureStart = world.indexOf('// Expose globally as singleton');
  const exposureEnd = world.indexOf('console.log', exposureStart);
  const exposure = world.slice(exposureStart, exposureEnd);

  assert.ok(exposure.includes('window.FENIX_WORLD_3D = true;'), 'World3D must mark itself as the active renderer');
  assert.ok(exposure.includes('window.fenixCity = this;'), 'legacy shell controls must resolve to the active World3D instance');
  assert.ok(world.includes('this.world = { agents: this.agents };'), 'existing agent inspectors must read the canonical agent map');
});

test('every legacy city initializer respects the canonical World3D owner', () => {
  const html = readPublic('index.html');
  const interactions = readPublic('fenix-v11-interactions.js');
  const isoCity = readPublic('iso-city.js');

  assert.match(interactions, /if\s*\(!window\.FENIX_WORLD_3D\s*&&\s*!window\.fenixCity/,
    'v11 interactions must not create IsoCityEngine while World3D owns the City');
  assert.match(html, /if\s*\(!window\.FENIX_WORLD_3D\s*&&\s*!window\.fenixCity[\s\S]{0,250}?new IsoCityEngine/,
    'shell boot hooks must not create a second City engine');
  assert.match(isoCity, /function bootIsoCity\(\)\s*\{\s*if\s*\(window\.FENIX_WORLD_3D\)\s*return;/,
    'IsoCity auto-boot must remain disabled after canonical World3D initialization');
});
