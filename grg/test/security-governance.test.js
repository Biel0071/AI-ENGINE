const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createApp } = require('../src/app');
const { loadSecurityConfig } = require('../src/security/config');
const { LocalRateLimiter } = require('../src/security/security-plane');

const TEST_SECURITY = loadSecurityConfig({ FENIX_ENV: 'test', FENIX_SESSION_TTL_MS: '60000' });
const ALICE_PASSWORD = crypto.randomBytes(24).toString('base64url');
const BOB_PASSWORD = crypto.randomBytes(24).toString('base64url');

async function bootstrap(options = {}) {
  const app = await createApp({ securityConfig: TEST_SECURITY, ...options });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await app.auth.ensureUser('grg', 'alice', ALICE_PASSWORD, 'master_admin', 'Alice');
  await app.controlPlane.addMember('grg', 'alice', { userId: 'bob', name: 'Bob', role: 'admin' });
  await app.auth.ensureUser('grg', 'bob', BOB_PASSWORD, 'admin', 'Bob');
  return app;
}

test('production rejects development identity headers', () => {
  assert.throws(
    () => loadSecurityConfig({ FENIX_ENV: 'production', FENIX_ALLOW_DEV_HEADERS: '1' }),
    /forbidden in production/,
  );
});

test('sessions persist as hashes and survive app restart', async () => {
  const file = path.join(os.tmpdir(), `fenix-session-${Date.now()}-${Math.random()}.json`);
  try {
    const first = await bootstrap({ dataFile: file });
    const { token } = await first.auth.login('grg', 'alice', ALICE_PASSWORD);
    const raw = fs.readFileSync(file, 'utf8');
    assert.ok(!raw.includes(token));

    const second = await createApp({ dataFile: file, securityConfig: TEST_SECURITY });
    const context = await second.auth.contextFromAsync({ authorization: `Bearer ${token}` });
    assert.equal(context.actorId, 'alice');
    await second.auth.logoutAsync(token);

    const third = await createApp({ dataFile: file, securityConfig: TEST_SECURITY });
    assert.equal(await third.auth.contextFromAsync({ authorization: `Bearer ${token}` }), null);
  } finally {
    try { fs.unlinkSync(file); } catch {}
  }
});

test('audit trail is append-only and hash-verifiable', async () => {
  const app = await bootstrap();
  await app.audit.record({ tenantId: 'grg', actorId: 'alice', action: 'test.one' });
  await app.audit.record({ tenantId: 'grg', actorId: 'alice', action: 'test.two' });
  const result = await app.audit.verify('grg');
  assert.equal(result.valid, true);
  assert.ok(result.count >= 2);
});

test('critical approval requires a separate approver and is single-use', async () => {
  const app = await bootstrap();
  const resource = { projectId: 'app', environment: 'production', target: 'node', revision: 'HEAD' };
  const request = await app.approvals.request('grg', 'alice', {
    action: 'deployment.production', resource, rationale: 'release validated',
  });
  await assert.rejects(() => app.approvals.approve('grg', 'alice', request.id), /Requester cannot approve/);
  const approved = await app.approvals.approve('grg', 'bob', request.id);
  assert.equal(approved.status, 'approved');
  const consumed = await app.approvals.consume('grg', 'alice', request.id, { action: 'deployment.production', resource });
  assert.equal(consumed.status, 'consumed');
  assert.equal(consumed.approvedBy, 'bob');
  await assert.rejects(
    () => app.approvals.consume('grg', 'alice', request.id, { action: 'deployment.production', resource }),
    /not consumable/,
  );
});

test('production deployment consumes a matching governance approval', async () => {
  const app = await bootstrap();
  await app.factory.generate('grg', 'alice', { id: 'app', name: 'App', prompt: 'dashboard' });
  const resource = { projectId: 'app', environment: 'production', target: 'node', revision: 'HEAD' };
  const request = await app.approvals.request('grg', 'alice', {
    action: 'deployment.production', resource, rationale: 'release validated',
  });
  await app.approvals.approve('grg', 'bob', request.id);
  const deployment = await app.deployer.deploy('grg', 'alice', 'app', {
    environment: 'production', target: 'node', approvalId: request.id,
  });
  assert.equal(deployment.approvedBy, 'bob');
  assert.equal(deployment.approvalId, request.id);
});

test('local rate limiter denies requests over the configured window', () => {
  const limiter = new LocalRateLimiter({ windowMs: 1000, defaultLimit: 2 });
  assert.equal(limiter.consume('client', 2, 100).allowed, true);
  assert.equal(limiter.consume('client', 2, 101).allowed, true);
  assert.equal(limiter.consume('client', 2, 102).allowed, false);
  assert.equal(limiter.consume('client', 2, 1200).allowed, true);
});
