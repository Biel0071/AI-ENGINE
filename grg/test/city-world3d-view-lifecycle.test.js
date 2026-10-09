const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');

test('World3D resumes when the canonical router opens the City view', () => {
  assert.match(
    source,
    /window\.addEventListener\(['"]fenix:viewchanged['"],\s*\(event\)\s*=>\s*\{\s*if\s*\(event\.detail\?\.viewId\s*!==\s*['"]city['"]\)\s*return;\s*const world\s*=\s*window\.initFenixWorld3D\?\.\(\);\s*world\?\.resize\?\.\(\);\s*world\?\._resumeAnimationLoop\?\.\(\);\s*world\?\.syncRealData\?\.\(\);\s*\}\)/,
    'opening City must initialize the 3D engine if absent, size it after the route becomes visible, and sync live agents'
  );
});
