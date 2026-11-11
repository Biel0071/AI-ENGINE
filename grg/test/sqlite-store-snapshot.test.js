'use strict';
// Fase 0 (2026-11-11): o SqliteStore copiava o documento inteiro 4-5 vezes por gravacao
// (308 ms cada; 10 simultaneas = 5,4 s). Agora segue o desenho do PostgresStore: leitura
// rasa, uma copia por lote de gravacoes. Estes testes fixam o que nao pode quebrar.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SqliteStore } = require('../src/infrastructure/database/sqlite-store');

async function freshStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-sqlite-'));
  const url = 'sqlite://' + path.join(dir, 'state.db').replace(/\\/g, '/');
  return { url, store: await SqliteStore.connect({ connectionString: url, retention: false }) };
}

test('concurrent updates are all applied (no lost update)', async () => {
  const { store } = await freshStore();
  await Promise.all(Array.from({ length: 20 }, () => store.update((s) => { s.counter = (s.counter || 0) + 1; return s; })));
  assert.equal((await store.read()).counter, 20);
  await store.close();
});

test('changing a read snapshot does not change the store', async () => {
  const { store } = await freshStore();
  await store.update((s) => { s.missions.push({ id: 'm1', title: 'a' }); return s; });
  const snap = await store.read();
  snap.missions.push({ id: 'intruso' });
  snap.extra = true;
  const again = await store.read();
  assert.deepEqual(again.missions.map((m) => m.id), ['m1']);
  assert.equal(again.extra, undefined);
  await store.close();
});

test('a failing mutator leaves the store intact and does not sink the other updates', async () => {
  const { store } = await freshStore();
  await store.update((s) => { s.missions.push({ id: 'm1', title: 'original' }); return s; });
  const results = await Promise.allSettled([
    store.update((s) => { s.counter = 1; return s; }),
    store.update((s) => { s.missions[0].title = 'corrompido'; throw new Error('falhou no meio'); }),
    store.update((s) => { s.counter += 1; return s; }),
  ]);
  assert.deepEqual(results.map((r) => r.status), ['fulfilled', 'rejected', 'fulfilled']);
  const state = await store.read();
  assert.equal(state.missions[0].title, 'original');
  assert.equal(state.counter, 2);
  await store.close();
});

test('data survives closing and reopening the database', async () => {
  const { url, store } = await freshStore();
  await store.update((s) => { s.counter = 7; return s; });
  await store.close();
  const reopened = await SqliteStore.connect({ connectionString: url, retention: false });
  assert.equal((await reopened.read()).counter, 7);
  await reopened.close();
});