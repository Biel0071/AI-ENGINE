const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { MemoryStore, FileStore } = require('../src/kernel/store');
const { CURRENT_SCHEMA_VERSION } = require('../src/kernel/state-migrations');
const { withRetry } = require('../src/infrastructure/resilience/retry');
const { CircuitBreaker, CircuitOpenError } = require('../src/infrastructure/resilience/circuit-breaker');
const { IdempotencyService } = require('../src/infrastructure/messaging/idempotency');
const { OutboxService } = require('../src/infrastructure/messaging/outbox');
const { InboxService } = require('../src/infrastructure/messaging/inbox');
const { FileBackupService } = require('../src/infrastructure/backup/file-backup-service');
const { HealthRegistry } = require('../src/infrastructure/monitoring/health-registry');

test('FileStore migrates legacy state without losing domain data and persists history', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grg-migration-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'state.json');
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1, tenants: [{ id: 'acme' }], projects: [{ id: 'keep-me' }] }));

  const store = new FileStore(file);
  const state = await store.read();
  const persisted = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(state.projects[0].id, 'keep-me');
  assert.deepEqual(state.migrationHistory.map((item) => item.to), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(persisted.schemaVersion, CURRENT_SCHEMA_VERSION);
});

test('newer state schemas are rejected to prevent accidental downgrade corruption', () => {
  assert.throws(() => new MemoryStore({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 }), /newer than supported/);
});

test('retry uses exponential delays and eventually returns', async () => {
  const delays = [];
  let calls = 0;
  const value = await withRetry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('transient');
    return 'ok';
  }, { attempts: 3, baseDelayMs: 10, jitter: 0, sleep: async (ms) => delays.push(ms) });
  assert.equal(value, 'ok');
  assert.deepEqual(delays, [10, 20]);
});

test('circuit breaker opens, rejects, then recovers through half-open', async () => {
  let now = 1_000;
  const breaker = new CircuitBreaker({ name: 'provider', failureThreshold: 2, resetTimeoutMs: 50, clock: () => now });
  await assert.rejects(() => breaker.execute(async () => { throw new Error('down'); }));
  await assert.rejects(() => breaker.execute(async () => { throw new Error('down'); }));
  await assert.rejects(() => breaker.execute(async () => 'blocked'), CircuitOpenError);
  now += 51;
  assert.equal(await breaker.execute(async () => 'recovered'), 'recovered');
  assert.equal(breaker.snapshot().state, 'CLOSED');
});

test('idempotency replays a result and rejects key reuse with different input', async () => {
  const service = new IdempotencyService({ store: new MemoryStore() });
  let executions = 0;
  const request = { tenantId: 't1', key: 'create-1', operation: 'create', input: { b: 2, a: 1 } };
  const first = await service.execute(request, async () => ({ id: ++executions }));
  const replay = await service.execute({ ...request, input: { a: 1, b: 2 } }, async () => ({ id: ++executions }));
  assert.deepEqual(first, { replayed: false, result: { id: 1 } });
  assert.deepEqual(replay, { replayed: true, result: { id: 1 } });
  await assert.rejects(() => service.execute({ ...request, input: { a: 9 } }, async () => null), /different request/);
});

test('idempotency also replays an undefined handler result', async () => {
  const service = new IdempotencyService({ store: new MemoryStore() });
  let executions = 0;
  const request = { tenantId: 't1', key: 'void-1', operation: 'notify', input: null };
  await service.execute(request, async () => { executions += 1; });
  const replay = await service.execute(request, async () => { executions += 1; });
  assert.equal(replay.replayed, true);
  assert.equal(executions, 1);
});

test('outbox claims once and enforces worker ownership', async () => {
  const service = new OutboxService({ store: new MemoryStore(), clock: () => '2026-01-01T00:00:00.000Z' });
  const event = await service.enqueue('t1', 'project.created', { id: 'p1' }, { dedupeKey: 'p1-created' });
  const duplicate = await service.enqueue('t1', 'project.created', { id: 'p1' }, { dedupeKey: 'p1-created' });
  assert.equal(duplicate.id, event.id);
  const claimed = await service.claimBatch('worker-a');
  assert.equal(claimed.length, 1);
  await assert.rejects(() => service.markPublished(event.id, 'worker-b'), /not claimed/);
  const published = await service.markPublished(event.id, 'worker-a');
  assert.equal(published.status, 'PUBLISHED');
  assert.deepEqual(await service.claimBatch('worker-a'), []);
});

test('inbox delivers an event once per consumer', async () => {
  const service = new InboxService({ store: new MemoryStore() });
  let executions = 0;
  const event = { tenantId: 't1', consumer: 'graph', eventId: 'evt-1', payload: { value: 3 } };
  const first = await service.process(event, async (payload) => { executions += 1; return payload.value * 2; });
  const replay = await service.process(event, async () => { executions += 1; return 99; });
  assert.deepEqual(first, { replayed: false, result: 6 });
  assert.deepEqual(replay, { replayed: true, result: 6 });
  assert.equal(executions, 1);
});

test('backup verifies checksum and restores the exact content', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grg-backup-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'state.json');
  const target = path.join(dir, 'restored', 'state.json');
  fs.writeFileSync(source, '{"schemaVersion":5}\n');
  const backup = new FileBackupService({ clock: () => new Date('2026-01-01T00:00:00.000Z') });
  const manifest = backup.create(source, path.join(dir, 'backups'));
  assert.equal(backup.verify(manifest.backup).ok, true);
  backup.restore(manifest.backup, target);
  assert.equal(fs.readFileSync(target, 'utf8'), fs.readFileSync(source, 'utf8'));
});

test('health registry distinguishes critical and optional failures', async () => {
  const health = new HealthRegistry({ timeoutMs: 50 });
  health.register('store', async () => ({ ok: true }));
  health.register('optional-provider', async () => { throw new Error('offline'); }, { critical: false });
  let result = await health.check();
  assert.equal(result.ok, true);
  health.register('queue', async () => ({ ok: false, lag: 10 }));
  result = await health.check();
  assert.equal(result.ok, false);
  assert.equal(result.checks.queue.lag, 10);
});
