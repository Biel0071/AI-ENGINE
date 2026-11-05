const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/unified-app.js'), 'utf8');
const match = source.match(/window\.fenixToggle2D3DMap\s*=\s*function\(\)\s*\{[\s\S]*?\n\};/);
assert.ok(match, 'City 2D/3D toggle must exist');

function setup({ is2d = false, fail3d = false } = {}) {
  const classes = new Set(is2d ? ['fenix-mode-2d'] : []);
  const calls = [];
  const button = { textContent: '', setAttribute() {}, classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, toggle(name, force) { if (force) classes.add(name); else classes.delete(name); } } };
  const status = { textContent: '', dataset: {} };
  const document = {
    body: { classList: {
      contains(name) { return classes.has(name); },
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); }
    } },
    getElementById(id) { return id === 'btnMinimap2D3D' ? button : id === 'fenixMinimapStatus' ? status : null; }
  };
  const window = {
    fenixSetCityMode(mode) {
      calls.push(mode);
      if (mode === 'world') { classes.add('fenix-mode-2d'); classes.delete('fenix-mode-3d'); }
      if (mode === 'world3d') { classes.delete('fenix-mode-2d'); classes.add('fenix-mode-3d'); }
      if (mode === 'world3d' && fail3d) throw new Error('WebGL unavailable');
      if (mode === 'world3d') this.fenixWorld3D = { resize() {}, _resumeAnimationLoop() {}, syncRealData() {} };
    },
    fenixWorld3D: null,
    fenixWorldEngine3D: null,
    fenixCity: { syncRealData() { calls.push('sync-2d'); } }
  };
  vm.runInNewContext(match[0], { window, document, IsoCityEngine: undefined });
  return { toggle: window.fenixToggle2D3DMap, calls, classes, button, status };
}

test('minimap toggle switches the rendered mode and reports the active mode', () => {
  const app = setup();
  app.toggle();
  assert.deepEqual(app.calls, ['world', 'sync-2d']);
  assert.equal(app.button.textContent, '2D');
  assert.equal(app.classes.has('fenix-mode-2d'), true);
  assert.equal(app.status.textContent, 'Mapa 2D');
});

test('minimap toggle initializes 3D and does not only change the button label', () => {
  const app = setup({ is2d: true });
  app.toggle();
  assert.deepEqual(app.calls, ['world3d']);
  assert.equal(app.button.textContent, '3D');
});

test('unavailable WebGL returns to the real 2D map and reports the reason', () => {
  const app = setup({ is2d: true, fail3d: true });
  app.toggle();
  assert.deepEqual(app.calls, ['world3d', 'world', 'sync-2d']);
  assert.equal(app.button.textContent, '2D');
  assert.equal(app.classes.has('fenix-mode-2d'), true);
  assert.match(app.status.textContent, /WebGL indisponível/);
});
