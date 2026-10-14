const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { StorageAdapter } = require('../src/store/storage-adapter');
const { JsonStore } = require('../src/store/json-store');

test('StorageAdapter base methods throw error when unimplemented', async () => {
  const adapter = new StorageAdapter();
  await assert.rejects(() => adapter.initialize(), /StorageAdapter.initialize/);
  await assert.rejects(() => adapter.read(), /StorageAdapter.read/);
  await assert.rejects(() => adapter.write({}), /StorageAdapter.write/);
  await assert.rejects(() => adapter.update(() => {}), /StorageAdapter.update/);
  await assert.rejects(() => adapter.find('users'), /StorageAdapter.find/);
  await assert.rejects(() => adapter.insert('users', {}), /StorageAdapter.insert/);
});

test('JsonStore implements StorageAdapter contract with find and insert', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-store-test-'));
  const filePath = path.join(tempDir, 'state.json');
  const seedPath = path.join(tempDir, 'seed.json');

  await fs.writeFile(seedPath, JSON.stringify({ tenants: [{ id: 'fenix-corp' }], projects: [] }), 'utf8');

  const store = new JsonStore({ filePath, seedPath });
  assert.ok(store instanceof StorageAdapter);

  const initial = await store.read();
  assert.equal(initial.tenants[0].id, 'fenix-corp');

  await store.insert('projects', { id: 'proj-1', name: 'Alpha' });
  await store.insert('projects', { id: 'proj-2', name: 'Beta' });

  const found = await store.find('projects', { name: 'Alpha' });
  assert.equal(found.length, 1);
  assert.equal(found[0].id, 'proj-1');

  const foundFn = await store.find('projects', (p) => p.name.startsWith('B'));
  assert.equal(foundFn.length, 1);
  assert.equal(foundFn[0].id, 'proj-2');

  await fs.rm(tempDir, { recursive: true, force: true });
});
