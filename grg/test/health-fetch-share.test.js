'use strict';
// Fase 0 (2026-11-11): sete scripts consultavam /health cada um no seu relogio (~1 pedido/s por
// aba). Em producao cada /health consulta Postgres, Redis e a fila. O guarda compartilha a mesma
// resposta por 4 s e junta pedidos simultaneos.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const guard = require('../public/fenix-request-guard.js');

function fakeFetch() {
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url: String(url), method: (opts.method || 'GET').toUpperCase() });
    return new Response(JSON.stringify({ ok: true, n: calls.length }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { fn, calls };
}

test('health calls within 4 s share one request and each caller can read the body', async () => {
  let now = 1000;
  const { fn, calls } = fakeFetch();
  const shared = guard.shareHealthFetch(fn, () => now);
  const [a, b] = await Promise.all([shared('/health'), shared('/health')]);
  now += 3000;
  const c = await shared('/health');
  assert.equal(calls.length, 1);
  for (const res of [a, b, c]) assert.equal((await res.json()).n, 1);
});

test('after 4 s the next health call goes to the server again', async () => {
  let now = 1000;
  const { fn, calls } = fakeFetch();
  const shared = guard.shareHealthFetch(fn, () => now);
  await shared('/health');
  now += 4001;
  await shared('/health');
  assert.equal(calls.length, 2);
});

test('other URLs and non-GET requests are never shared', async () => {
  const { fn, calls } = fakeFetch();
  const shared = guard.shareHealthFetch(fn, () => 1000);
  await shared('/api/v2/jobs'); await shared('/api/v2/jobs');
  await shared('/health', { method: 'POST' }); await shared('/health', { method: 'POST' });
  await shared('/health?full=1'); await shared('/health?full=1');
  assert.equal(calls.length, 6);
});

test('a failed health call is not cached', async () => {
  let fail = true; let n = 0;
  const fn = async () => { n += 1; if (fail) throw new Error('offline'); return new Response('{}', { status: 200 }); };
  const shared = guard.shareHealthFetch(fn, () => 1000);
  await assert.rejects(shared('/health'));
  fail = false;
  await shared('/health');
  assert.equal(n, 2);
});