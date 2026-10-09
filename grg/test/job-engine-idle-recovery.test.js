const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('idle stale-job recovery avoids rewriting the canonical state', async () => {
  const app = await createApp();
  let writes = 0;
  const update = app.store.update.bind(app.store);
  app.store.update = (...args) => { writes += 1; return update(...args); };

  assert.equal(await app.jobs.recoverStale(60_000), 0);
  assert.equal(writes, 0, 'idle recovery must not reserialize the canonical state');

  await app.close();
});
