'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mergeLocalCatalog } = require('../src/projects/project-kernel');

test('local primary project enriches its registered project without replacing identity', () => {
  const registered = [{ id: 'api-platform', name: 'API Platform', workspace: 'C:\\Projects\\API' }];
  const catalog = [{ id: 'api-platform', name: 'API Platform local', workspace: 'c:\\projects\\api', listedPath: 'C:\\Projects\\API', localPort: 3001, logoId: 'api-logo', versionRole: 'Principal', source: 'LOCAL_PROJECT_CATALOG' }];

  const merged = mergeLocalCatalog(registered, catalog, 'tenant-a');

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'api-platform');
  assert.equal(merged[0].name, 'API Platform');
  assert.equal(merged[0].localCatalogId, 'api-platform');
  assert.equal(merged[0].localPort, 3001);
  assert.equal(merged[0].logoId, 'api-logo');
  assert.equal(merged[0].tenantId, undefined);
});

test('catalog variants and standalone files remain distinct project cards', () => {
  const registered = [{ id: 'api-platform', name: 'API Platform', workspace: 'C:\\Projects\\API' }];
  const catalog = [
    { id: 'api-copy', name: 'API Platform', workspace: 'C:\\Projects\\API', listedPath: 'C:\\Projects\\API', versionRole: 'Cópia/variante' },
    { id: 'launcher-a', name: 'Launcher A', workspace: 'C:\\Projects', listedPath: 'C:\\Projects\\a.html', entryFile: 'a.html', versionRole: 'Principal' },
    { id: 'launcher-b', name: 'Launcher B', workspace: 'C:\\Projects', listedPath: 'C:\\Projects\\b.html', entryFile: 'b.html', versionRole: 'Principal' },
  ];

  const merged = mergeLocalCatalog(registered, catalog, 'tenant-a');

  assert.deepEqual(merged.map((project) => project.id), ['api-platform', 'local-api-copy', 'local-launcher-a', 'local-launcher-b']);
});

test('a registry alias merges only with an exact name and workspace match', () => {
  const registered = [{ id: 'dview', name: 'DroidView', workspace: 'C:\\Projects\\dview', localPath: 'C:\\Projects\\dview' }];
  const catalog = [{ id: 'droidview', name: 'DroidView', workspace: 'c:\\projects\\dview', listedPath: 'C:\\Projects\\dview', versionRole: 'Principal' }];

  const merged = mergeLocalCatalog(registered, catalog, 'tenant-a');

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'dview');
  assert.equal(merged[0].localCatalogId, 'droidview');
});
