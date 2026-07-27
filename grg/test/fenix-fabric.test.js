const test = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventStore } = require('../src/eventing/event-store');
const { createApp } = require('../src/app');

test('EventStore is idempotent, ordered and hash-verifiable', async () => {
  const store = new MemoryStore(); const events = new EventStore({ store });
  const first = await events.append({ tenantId: 't1', stream: 'crm:1', type: 'crm.created', source: 'crm', data: { id: '1' }, idempotencyKey: 'one' });
  const replay = await events.append({ tenantId: 't1', stream: 'crm:1', type: 'crm.created', source: 'crm', data: { id: '1' }, idempotencyKey: 'one' });
  const second = await events.append({ tenantId: 't1', stream: 'crm:1', type: 'crm.ready', source: 'crm', data: { id: '1' }, expectedVersion: 1 });
  assert.equal(replay.id, first.id); assert.equal(second.sequence, 2); assert.deepEqual(await events.verify('t1', 'crm:1'), { ok: true, events: 2, head: second.hash });
  await assert.rejects(() => events.append({ tenantId: 't1', stream: 'crm:1', type: 'x', source: 'x', data: {}, expectedVersion: 0 }), /version conflict/);
});

test('EventStore refuses credential-shaped fields and detects tampering', async () => {
  const store = new MemoryStore(); const events = new EventStore({ store });
  await assert.rejects(() => events.append({ tenantId: 't1', stream: 's', type: 'x', source: 'x', data: { apiKey: 'leak' } }), /secret field/);
  await events.append({ tenantId: 't1', stream: 's', type: 'x', source: 'x', data: { safe: true } });
  await store.update(async (state) => { state.domainEvents[0].data.safe = false; return state; });
  assert.equal((await events.verify('t1', 's')).ok, false);
});

test('Fabric enrollment issues identity once, registers, emits and projects knowledge', async () => {
  const app = await createApp(); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  const manifest = { name: 'CRM Central', version: '1.0.0', systemType: 'crm', capabilities: ['customers', 'whatsapp'], endpoints: [{ protocol: 'https', url: 'https://crm.internal' }], dependencies: ['postgres'], city: { district: 'business', building: 'crm' } };
  const first = await app.fabric.enroll('grg', 'alice', manifest);
  assert.match(first.credentials.privateKey, /PRIVATE KEY/); assert.equal(first.resource.status, 'ACTIVE');
  const replay = await app.fabric.enroll('grg', 'alice', manifest);
  assert.equal(replay.replayed, true); assert.equal(replay.credentials, null);
  const state = await app.store.read();
  assert.equal(state.domainEvents.filter((item) => item.type === 'fabric.service.registered').length, 1);
  assert.equal(JSON.stringify(state).includes('PRIVATE KEY'), false);
  assert.ok(state.knowledgeEntities.some((item) => item.type === 'service' && item.key === first.resource.id));
  assert.ok(state.knowledgeRelationships.some((item) => item.type === 'DEPENDS_ON'));
});

test('registry keeps resource versions and protects immutable identity', async () => {
  const app = await createApp(); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  const base = { id: 'service:api', kind: 'service', name: 'API', version: '1.0.0', identity: { id: 'spiffe://api' } };
  await app.registry.register('grg', 'alice', base);
  await app.registry.register('grg', 'alice', { ...base, version: '1.1.0', capabilities: ['v2'] });
  await assert.rejects(() => app.registry.register('grg', 'alice', { ...base, identity: { id: 'spiffe://attacker' } }), /cannot be replaced/);
  assert.equal((await app.store.read()).serviceVersions.filter((item) => item.resourceId === 'service:api').length, 2);
  await assert.rejects(() => app.registry.register('grg', 'alice', { ...base, id: 'service:leak', name: 'Leak', metadata: { apiToken: 'value' } }), /secret field/);
});
