const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createApp } = require('../src/app');
const { hashPassword, verifyPassword } = require('../src/auth/auth');
const { ForbiddenError } = require('../src/kernel/errors');
const TEST_PASSWORD = crypto.randomBytes(24).toString('base64url');

async function bootstrap() {
  const app = await createApp({});
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  await app.auth.ensureUser('grg', 'admin1010', TEST_PASSWORD, 'admin', 'Admin 1010');
  return app;
}

test('hash/verify de senha (scrypt) funciona e rejeita errada', () => {
  const h = hashPassword('segredo');
  assert.ok(verifyPassword('segredo', h));
  assert.ok(!verifyPassword('errada', h));
});

test('login com credenciais corretas retorna token e role', async () => {
  const app = await bootstrap();
  const sess = await app.auth.login('grg', 'admin1010', TEST_PASSWORD);
  assert.ok(sess.token);
  assert.equal(sess.role, 'admin');
  assert.equal(sess.userId, 'admin1010');
});

test('login com senha errada e rejeitado', async () => {
  const app = await bootstrap();
  await assert.rejects(() => app.auth.login('grg', 'admin1010', 'errada'), ForbiddenError);
});

test('token valido resolve contexto; invalido nao', async () => {
  const app = await bootstrap();
  const { token } = await app.auth.login('grg', 'admin1010', TEST_PASSWORD);
  const cx = app.auth.contextFrom({ authorization: `Bearer ${token}` });
  assert.equal(cx.actorId, 'admin1010');
  assert.equal(cx.authed, true);
  assert.equal(app.auth.contextFrom({ authorization: 'Bearer lixo' }, { allowDevHeaders: false }), null);
});

test('logout invalida a sessao', async () => {
  const app = await bootstrap();
  const { token } = await app.auth.login('grg', 'admin1010', TEST_PASSWORD);
  app.auth.logout(token);
  assert.equal(app.auth.verify(token), null);
});

test('senha nao e guardada em texto plano', async () => {
  const app = await bootstrap();
  const state = await app.store.read();
  const u = state.users.find((x) => x.id === 'admin1010');
  assert.ok(u.passwordHash.includes(':'));
  assert.ok(!u.passwordHash.includes(TEST_PASSWORD));
});
