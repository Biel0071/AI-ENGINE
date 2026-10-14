'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const ideSource = fs.readFileSync(path.join(publicDir, 'project-ide-live.js'), 'utf8');

test('world-workspace-link: worldMount container exists in index.html inside view-ide', () => {
  assert.ok(htmlSource.includes('id="fenixIdeWorldMount"'), 'fenixIdeWorldMount must exist in index.html');
  assert.ok(htmlSource.includes('id="cityCanvas"'), 'cityCanvas must exist in index.html');
});

test('world-workspace-link: setMode("world") mounts cityCanvas into fenixIdeWorldMount', () => {
  assert.match(ideSource, /if\s*\(newMode\s*===\s*'world'\)/);
  assert.match(ideSource, /worldMount\.appendChild\(cityCanvas\)/);
});

test('world-workspace-link: exiting world mode restores cityCanvas to view-city', () => {
  assert.match(ideSource, /viewCity\.appendChild\(cityCanvas\)/);
});
