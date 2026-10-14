const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/office-live.js'), 'utf8');

test('3D City mode initializes the engine before resizing or resuming it', () => {
  const start = source.indexOf("if (mode === 'world3d') {");
  const end = source.indexOf("} else if (mode === 'office')", start);
  const world3dMode = source.slice(start, end);
  assert.ok(start >= 0 && end > start, 'World3D mode block must exist');
  assert.ok(world3dMode.includes('window.initFenixWorld3D?.()'), '3D mode must initialize a missing World3D instance');
  assert.ok(world3dMode.includes('world.resize?.()'), '3D mode must resize the initialized renderer');
  assert.ok(world3dMode.includes('world._resumeAnimationLoop?.()'), '3D mode must resume the renderer');
  assert.ok(world3dMode.includes('world.syncRealData?.()'), '3D mode must sync live agents');
});
