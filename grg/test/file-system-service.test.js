const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { safeRelativeDirectory } = require('../src/storage/file-system-service');

test('git coupling accepts an organized nested project directory', () => {
  assert.equal(
    safeRelativeDirectory('projects/API-PLATAFORM'),
    ['projects', 'API-PLATAFORM'].join(path.sep),
  );
});

test('git coupling sanitizes each directory segment without flattening the hierarchy', () => {
  assert.equal(
    safeRelativeDirectory('projects/API Platform.git'),
    ['projects', 'API-Platform'].join(path.sep),
  );
});

test('git coupling rejects absolute paths and traversal', () => {
  for (const invalid of ['../outside', 'projects/../../outside', '/absolute', 'C:\\absolute']) {
    assert.throws(() => safeRelativeDirectory(invalid), /relative|traversal/);
  }
});
