const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { EventStore } = require('../src/eventing/event-store');
const { FabricEventBus } = require('../src/eventing/fabric-event-bus');
const { AuditTrail } = require('../src/governance/audit-trail');

function countWrites(store) {
  const count = { value: 0 };
  const update = store.update.bind(store);
  store.update = (mutator) => { count.value += 1; return update(mutator); };
  return count;
}

test('FabricEventBus accepts the optional Redis client during app initialization', () => {
  const fabricEvents = new FabricEventBus({ eventStore: {}, liveBus: new EventBus() });
  const client = { publish() {} };

  assert.equal(fabricEvents.setRedisClient(client), fabricEvents);
  assert.equal(fabricEvents.redisClient, client);
  assert.equal(fabricEvents.setRedisClient(null), fabricEvents);
  assert.equal(fabricEvents.redisClient, null);
});

test('appendMany preserves event order, hashes and idempotency in one write', async () => {
  const store = new MemoryStore();
  const eventStore = new EventStore({ store });
  const writes = countWrites(store);
  const inputs = [
    { tenantId: 'grg', stream: 'activation:api', type: 'checked', source: 'test', subject: 'api', data: { status: 'ACTIVE' }, idempotencyKey: 'check:api:1' },
    { tenantId: 'grg', stream: 'activation:api', type: 'checked', source: 'test', subject: 'api', data: { status: 'DEGRADED' }, idempotencyKey: 'check:api:2' },
    { tenantId: 'grg', stream: 'activation:db', type: 'checked', source: 'test', subject: 'db', data: { status: 'ACTIVE' }, idempotencyKey: 'check:db:1' },
  ];

  const appended = await eventStore.appendMany(inputs);
  assert.equal(writes.value, 1);
  assert.deepEqual(appended.map((event) => event.sequence), [1, 2, 1]);
  assert.equal((await eventStore.verify('grg', 'activation:api')).ok, true);

  const replay = await eventStore.appendMany(inputs);
  assert.deepEqual(replay.map((event) => event.id), appended.map((event) => event.id));
  assert.equal(writes.value, 2, 'idempotent replay still uses one transaction');
  assert.equal((await store.read()).domainEvents.length, 3);
});

test('emitBatch keeps per-event delivery and writes the audit batch once', async () => {
  const store = new MemoryStore();
  const bus = new EventBus();
  const audit = new AuditTrail({ store }).attach(bus);
  const writes = countWrites(store);
  const delivered = [];
  bus.on('operational.component.checked', (event) => delivered.push(event.payload.subject));

  await bus.emitBatch([
    { type: 'operational.component.checked', payload: { tenantId: 'grg', actorId: 'admin', subject: 'api' } },
    { type: 'operational.component.checked', payload: { tenantId: 'grg', actorId: 'admin', subject: 'db' } },
  ]);

  assert.deepEqual(delivered, ['api', 'db']);
  assert.equal(writes.value, 1);
  const state = await store.read();
  assert.equal(state.auditEvents.length, 2);
  assert.equal((await audit.verify('grg')).valid, true);
});

test('publishBatch persists every event and dispatches projections once per batch', async () => {
  const store = new MemoryStore();
  const eventStore = new EventStore({ store });
  const liveBus = new EventBus();
  const fabricEvents = new FabricEventBus({ eventStore, liveBus });
  new AuditTrail({ store }).attach(liveBus);
  const writes = countWrites(store);
  const delivered = [];
  const projected = [];
  liveBus.on('operational.component.checked', (event) => delivered.push(event.payload.id));
  fabricEvents.subscribe('fabric.event', (event) => {
    if (event.type === 'fabric.events.batch') projected.push(...event.events.map((item) => item.id));
  });

  const result = await fabricEvents.publishBatch([
    { tenantId: 'grg', stream: 'operations:one', type: 'operational.component.checked', source: 'test', subject: 'one', data: {} },
    { tenantId: 'grg', stream: 'operations:two', type: 'operational.component.checked', source: 'test', subject: 'two', data: {} },
  ]);

  assert.equal((await eventStore.list('grg')).length, 2);
  assert.equal(delivered.length, 2);
  assert.deepEqual(projected, result.map((event) => event.id));
  assert.equal(writes.value, 2, 'both typed events and their fabric wrappers are audited in batches');
  const auditEvents = (await store.read()).auditEvents;
  assert.equal(auditEvents.length, 4, 'individual typed and fabric events remain auditable');
});
