'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { getProjectSnapshot } = require('../src/projects/project-registry');

test('project snapshots count files once, reuse metrics for ten minutes, then refresh', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-project-snapshot-'));
  const nested = path.join(root, 'nested');
  fs.mkdirSync(nested);
  fs.writeFileSync(path.join(root, 'app.js'), 'module.exports = true;\n');
  fs.writeFileSync(path.join(nested, 'types.ts'), 'export type Ready = true;\n');
  fs.writeFileSync(path.join(nested, 'notes.md'), 'fixture\n');

  const project = { id: 'snapshot-fixture', name: 'Snapshot Fixture', vpsPath: root };
  const originalReaddirSync = fs.readdirSync;
  const originalDateNow = Date.now;
  let projectDirectoryReads = 0;
  let now = 1_000;
  Date.now = () => now;
  fs.readdirSync = function countedReaddirSync(directory, ...args) {
    if (path.resolve(String(directory)).startsWith(root)) projectDirectoryReads += 1;
    return originalReaddirSync.call(this, directory, ...args);
  };

  try {
    const first = getProjectSnapshot(project);
    assert.deepEqual(first.metrics, { totalFiles: 3, jsFiles: 1, tsFiles: 1 });
    assert.equal(projectDirectoryReads, 2, 'root and nested directory should each be read once');

    fs.writeFileSync(path.join(root, 'new.js'), 'module.exports = false;\n');
    now += 9 * 60 * 1000;
    const second = getProjectSnapshot(project);
    assert.deepEqual(second.metrics, { totalFiles: 3, jsFiles: 1, tsFiles: 1 });
    assert.equal(projectDirectoryReads, 2, 'a repeated snapshot should reuse the recent scan');

    now += 2 * 60 * 1000;
    const refreshed = getProjectSnapshot(project);
    assert.deepEqual(refreshed.metrics, { totalFiles: 4, jsFiles: 2, tsFiles: 1 });
    assert.equal(projectDirectoryReads, 4, 'an expired snapshot should refresh with one new pass');
  } finally {
    fs.readdirSync = originalReaddirSync;
    Date.now = originalDateNow;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
