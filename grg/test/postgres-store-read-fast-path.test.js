const assert = require('node:assert/strict');
const test = require('node:test');
const { PostgresStore } = require('../src/infrastructure/database/postgres-store');
const { EMPTY_STATE } = require('../src/kernel/store');
const { CURRENT_SCHEMA_VERSION } = require('../src/kernel/state-migrations');

test('PostgresStore skips cloning migrations for a current persisted state', async () => {
  const persisted = EMPTY_STATE();
  const store = new PostgresStore({
    pool: { query: async () => ({ rows: [{ document: persisted }] }) },
    retention: false,
  });
  const stringify = JSON.stringify;
  JSON.stringify = function (value, ...args) {
    assert.notStrictEqual(value, persisted, 'current database state should bypass JSON deep cloning');
    return stringify.call(this, value, ...args);
  };

  let state;
  try {
    state = await store.read();
  } finally {
    JSON.stringify = stringify;
  }

  assert.deepEqual(state, persisted);
  assert.notStrictEqual(state, persisted, 'read callers still receive an isolated snapshot');
  state.projects.push({ id: 'caller-mutation' });
  assert.equal(persisted.projects.length, 0);
});

test('PostgresStore still migrates old or incomplete persisted state', async () => {
  const persisted = { schemaVersion: CURRENT_SCHEMA_VERSION - 1 };
  const store = new PostgresStore({
    pool: { query: async () => ({ rows: [{ document: persisted }] }) },
    retention: false,
  });

  const state = await store.read();

  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.ok(Array.isArray(state.worldAssets));
  assert.equal(state.migrationHistory.at(-1).to, CURRENT_SCHEMA_VERSION);
});
