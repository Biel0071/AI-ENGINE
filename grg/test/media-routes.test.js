'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleMediaRoutes } = require('../src/api/media-routes');

function responseCapture() {
  return { headersSent: false, statusCode: null, body: null };
}

test('media search is tenant-authorized and returns real provider results', async () => {
  const calls = [];
  const app = {
    controlPlane: { authorize: async (...args) => calls.push(args) },
    mediaSearch: { search: async (params) => ({ source: 'Wikimedia Commons', ...params, items: [{ id: 'commons:1' }] }) },
  };
  const res = responseCapture();
  const handled = await handleMediaRoutes(
    { method: 'GET' }, res, new URL('http://localhost/api/media/search?query=city&type=video&limit=3'), app,
    (target, status, body) => { target.statusCode = status; target.body = body; return true; },
    async () => ({}), { tenantId: 'tenant-a', actorId: 'actor-a' },
  );
  assert.equal(handled, true);
  assert.deepEqual(calls, [['tenant-a', 'actor-a', 'runtime:read']]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.items[0].id, 'commons:1');
  assert.equal(res.body.type, 'video');
  assert.equal(res.body.limit, 3);
});

test('asset registration requires write authorization and returns idempotent status', async () => {
  const calls = [];
  const app = {
    controlPlane: { authorize: async (...args) => calls.push(args) },
    worldAssetRegistry: { register: async () => ({ created: false, asset: { id: 'saved' } }) },
  };
  const res = responseCapture();
  await handleMediaRoutes(
    { method: 'POST' }, res, new URL('http://localhost/api/media/assets'), app,
    (target, status, body) => { target.statusCode = status; target.body = body; return true; },
    async () => ({ sourceId: 'source:1' }), { tenantId: 'tenant-a', actorId: 'actor-a' },
  );
  assert.deepEqual(calls, [['tenant-a', 'actor-a', 'runtime:write']]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.asset.id, 'saved');
  assert.equal(res.body.created, false);
});

test('provider failure is exposed as a typed service error instead of empty success', async () => {
  const app = {
    controlPlane: { authorize: async () => {} },
    mediaSearch: { search: async () => { const error = new Error('upstream offline'); error.code = 'MEDIA_PROVIDER_UNAVAILABLE'; error.status = 502; throw error; } },
  };
  const res = responseCapture();
  await handleMediaRoutes(
    { method: 'GET' }, res, new URL('http://localhost/api/media/search?query=city'), app,
    (target, status, body) => { target.statusCode = status; target.body = body; return true; },
    async () => ({}), { tenantId: 'tenant-a', actorId: 'actor-a' },
  );
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, 'MEDIA_PROVIDER_UNAVAILABLE');
});
