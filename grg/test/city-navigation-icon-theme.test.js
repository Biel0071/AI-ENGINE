const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const shell = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const worldUi = fs.readFileSync(path.join(__dirname, '../public/fenix-world-ui.js'), 'utf8');

test('floating City controls use monochrome theme icons instead of colored emoji glyphs', () => {
  const start = shell.indexOf('id="fenixCityNavPill"');
  const end = shell.indexOf('</div>', start);
  const controls = shell.slice(start, end);
  assert.match(controls, /ph-globe/);
  assert.match(controls, /ph-buildings/);
  assert.match(controls, /ph-house/);
  assert.match(controls, /ph-files/);
  assert.match(controls, /ph-image/);
  assert.doesNotMatch(controls, /🌐|🏢|🏠|📑|🖼️/);
});

test('City world chrome does not mount a duplicate projects and agents metrics card', () => {
  assert.doesNotMatch(worldUi, /fw3-pulse|const metrics=/);
});
