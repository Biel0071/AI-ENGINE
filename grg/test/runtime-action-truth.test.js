'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleUniversalSystemRoutes } = require('../src/api/universal-system-routes');

function setup(body, authorize = async () => {}) {
  const res = {};
  const sendJson = (_res, status, payload) => {
    res.status = status;
    res.payload = payload;
    return true;
  };
  const app = {
    controlPlane: { authorize },
    audit: { record: async () => ({ id: 'audit-1' }) },
  };
  return {
    req: { method: 'POST' },
    res,
    sendJson,
    app,
    readJson: async () => body,
    url: new URL('http://localhost/api/v2/runtime/action'),
    identity: { tenantId: 'tenant-a', actorId: 'user-a' },
  };
}

test('runtime action rejects unsupported operations instead of reporting simulated success', async () => {
  const ctx = setup({ action: 'restart', target: 'docker', id: 'fenix' });
  await handleUniversalSystemRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.equal(ctx.res.status, 501);
  assert.equal(ctx.res.payload.ok, false);
  assert.match(ctx.res.payload.error, /unsupported/i);
});

test('runtime action requires administrator permission before a restart', async () => {
  const permissions = [];
  const denied = async (_tenant, _actor, permission) => {
    permissions.push(permission);
    throw new Error('forbidden');
  };
  const ctx = setup({ action: 'restart', target: 'pm2', id: 'fenix-backend' }, denied);
  await assert.rejects(
    handleUniversalSystemRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app),
    /forbidden/,
  );
  assert.deepEqual(permissions, ['runtime:admin']);
  assert.equal(ctx.res.payload, undefined);
});

test('runtime healthcheck requires read permission and rejects targets without a probe', async () => {
  const permissions = [];
  const ctx = setup({ action: 'healthcheck', target: 'unknown-service' }, async (_tenant, _actor, permission) => permissions.push(permission));
  await handleUniversalSystemRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.deepEqual(permissions, ['runtime:read']);
  assert.equal(ctx.res.status, 501);
  assert.equal(ctx.res.payload.ok, false);
});
