const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveLegacyProjectFile } = require('../src/api/universal-system-routes');

test('legacy project file path stays inside real project and excludes protected files', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-legacy-path-'));
  const root = path.join(parent, 'project');
  const sibling = path.join(parent, 'project-secret');
  fs.mkdirSync(root); fs.mkdirSync(sibling);
  fs.writeFileSync(path.join(root, 'app.js'), 'safe');
  fs.writeFileSync(path.join(root, '.env'), 'private');
  fs.writeFileSync(path.join(sibling, 'secret.txt'), 'private');
  try {
    assert.equal(resolveLegacyProjectFile(root, 'app.js'), path.join(root, 'app.js'));
    assert.equal(resolveLegacyProjectFile(root, path.join(root, 'app.js')), path.join(root, 'app.js'));
    assert.equal(resolveLegacyProjectFile(root, path.join(sibling, 'secret.txt')), null);
    assert.equal(resolveLegacyProjectFile(root, '../project-secret/secret.txt'), null);
    assert.equal(resolveLegacyProjectFile(root, '.env'), null);
    assert.equal(resolveLegacyProjectFile(root, 'new.js'), null);
    try { fs.symlinkSync(path.join(sibling, 'secret.txt'), path.join(root, 'linked.txt')); assert.equal(resolveLegacyProjectFile(root, 'linked.txt'), null); } catch (error) { if (error.code !== 'EPERM') throw error; }
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
});
