const assert = require('node:assert/strict');
const test = require('node:test');
const { PostgresStore } = require('../src/infrastructure/database/postgres-store');
const { EMPTY_STATE } = require('../src/kernel/store');
const { CURRENT_SCHEMA_VERSION } = require('../src/kernel/state-migrations');

function createUpdatePool(document) {
  const query = async (sql) => {
    if (/^SELECT document/.test(sql)) return { rows: [{ document }] };
    return { rows: [], rowCount: 1 };
  };
  return {
    query,
    async connect() { return { query, release() {} }; },
  };
}

async function countStateSerializations(operation) {
  let count = 0;
  const stringify = JSON.stringify;
  JSON.stringify = function (value, ...args) {
    if (value?.schemaVersion === CURRENT_SCHEMA_VERSION
      && Array.isArray(value.projects) && Array.isArray(value.runtimeJobs)) count += 1;
    return stringify.call(this, value, ...args);
  };
  try {
    await operation();
    return count;
  } finally {
    JSON.stringify = stringify;
  }
}

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

test('PostgresStore writes a current state without an extra migration clone', async () => {
  const state = EMPTY_STATE();
  const store = new PostgresStore({ pool: { query: async () => ({ rowCount: 1 }) }, retention: false });

  const serializations = await countStateSerializations(() => store.write(state));

  assert.equal(serializations, 1, 'only the database payload should be serialized');
});

test('PostgresStore updates a current state without an extra migration clone', async () => {
  const store = new PostgresStore({ pool: createUpdatePool(EMPTY_STATE()), retention: false });

  const serializations = await countStateSerializations(() => store.update((state) => {
    state.projects.push({ id: 'probe-project' });
    return state;
  }));

  assert.equal(serializations, 1, 'only the database payload should be serialized');
});

test('PostgresStore still repairs a collection removed by an update', async () => {
  const persisted = EMPTY_STATE();
  const store = new PostgresStore({ pool: createUpdatePool(persisted), retention: false });

  const state = await store.update((next) => {
    delete next.projects;
    return next;
  });

  assert.deepEqual(state.projects, []);
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
});
