const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');

test('World3D resumes when the canonical router opens City without starting a duplicate API read', () => {
  assert.ok(
    /window\.addEventListener\(['"]fenix:viewchanged['"],\s*\(event\)\s*=>\s*\{\s*if\s*\(event\.detail\?\.viewId\s*!==\s*['"]city['"]\)\s*return;\s*const world\s*=\s*window\.initFenixWorld3D\?\.\(\);\s*world\?\.resize\?\.\(\);\s*world\?\._resumeAnimationLoop\?\.\(\);\s*\}\)/.test(source),
    'opening City initializes and resumes the renderer without a duplicate network read; bounded refresh owns synchronization'
  );
  assert.ok(/Promise\.resolve\(worldRefresh\(\)\)/.test(source), 'renderer initialization must request the first measured world snapshot');
});

test('World3D rebinds its shared refresh owner after a disposed engine is replaced', () => {
  assert.match(source, /if\s*\(typeof worldState\.refresh\s*!==\s*['"]function['"]\s*\|\|\s*worldState\.refreshOwner\s*===\s*['"]world3d['"]\)/,
    'a remounted renderer must replace the stale World3D refresh closure while leaving other refresh owners alone');
});
test('World3D removes global lifecycle listeners when disposed', () => {
  assert.match(source, /removeEventListener\(['"]visibilitychange['"],\s*this\._onVisibilityChange\)/);
  assert.match(source, /removeEventListener\(['"]fenix-view-changed['"],\s*this\._onViewChanged\)/);
});
