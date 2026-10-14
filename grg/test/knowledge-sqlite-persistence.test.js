'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { StorageManager } = require('../src/storage/storage-manager');

test('knowledge records survive reconnect and isolate collections', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-knowledge-'));
  const dbPath = path.join(directory, 'knowledge.db');
  const previous = process.env.FENIX_KNOWLEDGE_SQLITE_PATH;
  const previousDb = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  process.env.FENIX_KNOWLEDGE_SQLITE_PATH = dbPath;
  let first;
  let second;
  try {
    first = new StorageManager();
    await first.boot();
    assert.equal(first.stats.relationalProvider, 'sqlite');
    const store = first.getRelational();
    await store.set('shared-id', { value: 'fact' }, 'knowledge');
    await store.set('shared-id', { value: 'mission' }, 'missions');
    await first.shutdown();
    first = null;

    second = new StorageManager();
    await second.boot();
    assert.deepEqual(await second.getRelational().get('shared-id', 'knowledge'), { value: 'fact' });
    assert.deepEqual(await second.getRelational().get('shared-id', 'missions'), { value: 'mission' });
    assert.deepEqual(await second.getRelational().find({}, 'knowledge'), [{ id: 'shared-id', value: 'fact' }]);
  } finally {
    if (first) await first.shutdown();
    if (second) await second.shutdown();
    if (previous === undefined) delete process.env.FENIX_KNOWLEDGE_SQLITE_PATH;
    else process.env.FENIX_KNOWLEDGE_SQLITE_PATH = previous;
    if (previousDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDb;
    for (const suffix of ['', '-wal', '-shm']) {
      const file = dbPath + suffix;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(directory);
  }
});
