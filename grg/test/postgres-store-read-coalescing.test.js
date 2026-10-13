'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PostgresStore } = require('../src/infrastructure/database/postgres-store');
const { EMPTY_STATE } = require('../src/kernel/store');

test('PostgresStore coalesces concurrent cache misses into one database read', async () => {
  const persisted = EMPTY_STATE();
  let queryCount = 0;
  let finishQuery;
  const queryGate = new Promise((resolve) => { finishQuery = resolve; });
  const store = new PostgresStore({
    pool: {
      async query() {
        queryCount += 1;
        await queryGate;
        return { rows: [{ document: persisted }] };
      },
    },
    retention: false,
  });

  const reads = [store.read(), store.read(), store.read()];
  await new Promise((resolve) => setImmediate(resolve));
  finishQuery();
  const [first, second, third] = await Promise.all(reads);

  assert.equal(queryCount, 1);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(second, third);
});

test('an older in-flight read cannot replace the cache after a newer write', async () => {
  const persisted = EMPTY_STATE();
  let finishRead;
  let markReadStarted;
  const readStarted = new Promise((resolve) => { markReadStarted = resolve; });
  const pendingSelect = new Promise((resolve) => { finishRead = resolve; });
  const pool = {
    async query(sql, params) {
      if (/^SELECT document/.test(sql)) {
        markReadStarted();
        await pendingSelect;
        return { rows: [{ document: persisted }] };
      }
      return { rowCount: 1 };
    },
  };
  const store = new PostgresStore({ pool, retention: false });
  const oldRead = store.read();
  await readStarted;

  const newerState = EMPTY_STATE();
  newerState.projects.push({ id: 'new-project' });
  await store.write(newerState);
  finishRead();
  await oldRead;

  const current = await store.read();

  assert.deepEqual(current.projects, [{ id: 'new-project' }]);
});
