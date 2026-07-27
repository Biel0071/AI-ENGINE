const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { ForbiddenError } = require('../src/kernel/errors');

function makeCP() {
  return new ControlPlane({ store: new MemoryStore(), bus: new EventBus() });
}

test('creates tenant and makes actor a master_admin', async () => {
  const cp = await makeCP().initialize();
  const tenant = await cp.createTenant({ name: 'Acme Corp' }, 'alice');
  assert.equal(tenant.id, 'acme-corp');
  const m = await cp.getMembership('acme-corp', 'alice');
  assert.equal(m.role, 'master_admin');
});

test('rejects duplicate tenant', async () => {
  const cp = await makeCP().initialize();
  await cp.createTenant({ name: 'Acme' }, 'alice');
  await assert.rejects(() => cp.createTenant({ name: 'Acme' }, 'bob'), /exists/);
});

test('employee cannot manage members (RBAC)', async () => {
  const cp = await makeCP().initialize();
  await cp.createTenant({ name: 'Acme' }, 'alice');
  await cp.addMember('acme', 'alice', { userId: 'eve', role: 'employee' });
  await assert.rejects(
    () => cp.addMember('acme', 'eve', { userId: 'mallory', role: 'employee' }),
    ForbiddenError,
  );
});

test('only master_admin can create another master_admin', async () => {
  const cp = await makeCP().initialize();
  await cp.createTenant({ name: 'Acme' }, 'alice');
  await cp.addMember('acme', 'alice', { userId: 'bob', role: 'admin' });
  await assert.rejects(
    () => cp.addMember('acme', 'bob', { userId: 'carol', role: 'master_admin' }),
    /master admin/,
  );
});

test('emits events on tenant and member creation', async () => {
  const bus = new EventBus();
  const cp = await new ControlPlane({ store: new MemoryStore(), bus }).initialize();
  await cp.createTenant({ name: 'Acme' }, 'alice');
  await cp.addMember('acme', 'alice', { userId: 'bob', role: 'admin' });
  assert.equal(bus.history('tenant.created').length, 1);
  assert.equal(bus.history('member.added').length, 1);
});

test('isolation: membership required to authorize', async () => {
  const cp = await makeCP().initialize();
  await cp.createTenant({ name: 'Acme' }, 'alice');
  await assert.rejects(() => cp.authorize('acme', 'stranger', 'project:read'));
});
