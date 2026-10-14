'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TokenService, defaultTokenService } = require('../src/auth/token-service');

test('TokenService issues and verifies valid HMAC-SHA256 session tokens', () => {
  const service = new TokenService({ secret: 'super-secret-test-key', ttlMs: 3600000 });
  const token = service.generateSessionToken({
    tenantId: 'tenant-acme',
    userId: 'user-alice',
    role: 'admin',
    name: 'Alice Admin',
  });

  assert.ok(token);
  assert.equal(token.split('.').length, 3);

  const verified = service.verifySessionToken(token);
  assert.equal(verified.valid, true);
  assert.equal(verified.payload.tenantId, 'tenant-acme');
  assert.equal(verified.payload.userId, 'user-alice');
  assert.equal(verified.payload.role, 'admin');
  assert.equal(verified.payload.name, 'Alice Admin');
});

test('TokenService rejects tampered tokens', () => {
  const service = new TokenService({ secret: 'secret-a' });
  const otherService = new TokenService({ secret: 'secret-b' });

  const token = service.generateSessionToken({
    tenantId: 't1',
    userId: 'u1',
    role: 'employee',
  });

  const verifiedOther = otherService.verifySessionToken(token);
  assert.equal(verifiedOther.valid, false);
  assert.match(verifiedOther.error, /signature/i);

  // Tamper payload part
  const parts = token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ tenantId: 't1', userId: 'u1', role: 'master_admin' })).toString('base64url');
  const tamperedToken = parts.join('.');

  const verifiedTampered = service.verifySessionToken(tamperedToken);
  assert.equal(verifiedTampered.valid, false);
});

test('TokenService rejects expired tokens', () => {
  const service = new TokenService({ secret: 'test-exp' });
  const token = service.generateSessionToken({
    tenantId: 't1',
    userId: 'u1',
    customTtlMs: -1000, // already expired
  });

  const verified = service.verifySessionToken(token);
  assert.equal(verified.valid, false);
  assert.match(verified.error, /expired/i);
});

test('TokenService generates valid API Keys with SHA-256 hash', () => {
  const service = new TokenService();
  const apiKey = service.generateApiKey('tenant-x', 'user-bob', 'ci-cd-token');

  assert.ok(apiKey.key.startsWith('fenix_live_'));
  assert.ok(apiKey.hash);
  assert.equal(apiKey.hash.length, 64);
  assert.equal(apiKey.tenantId, 'tenant-x');
  assert.equal(apiKey.userId, 'user-bob');
});

test('authenticateRequest extracts bearer token correctly', async () => {
  const service = new TokenService({ secret: 'test-auth-secret' });
  const token = service.generateSessionToken({
    tenantId: 'tenant-123',
    userId: 'user-456',
    role: 'subadmin',
  });

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };

  const auth = await service.authenticateRequest(req);
  assert.equal(auth.authenticated, true);
  assert.equal(auth.tenantId, 'tenant-123');
  assert.equal(auth.actorId, 'user-456');
  assert.equal(auth.role, 'subadmin');
  assert.equal(auth.authMethod, 'bearer_token');
});

test('authenticateRequest rejects unauthorized request when production mode is set', async () => {
  const service = new TokenService();
  process.env.AUTH_MODE = 'production';

  const req = {
    headers: {
      'x-tenant-id': 'spoofed-tenant',
      'x-user-id': 'spoofed-user',
    },
  };

  await assert.rejects(async () => {
    await service.authenticateRequest(req);
  }, /Authentication required/i);

  delete process.env.AUTH_MODE;
});
