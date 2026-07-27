const test = require('node:test');
const assert = require('node:assert/strict');
const { EMPTY_STATE } = require('../src/kernel/store');
const { PostgresStore, safeIdentifier } = require('../src/infrastructure/database/postgres-store');
const { RedisCache } = require('../src/infrastructure/redis/redis-cache');
const { BullMQRuntime, connectionFromUrl } = require('../src/infrastructure/queue/bullmq-runtime');
const { S3ObjectStore } = require('../src/infrastructure/storage/s3-object-store');
const { loadInfrastructureConfig } = require('../src/infrastructure/config');

test('PostgresStore serializes mutations in a transaction and preserves the store contract', async () => {
  let document = EMPTY_STATE();
  const commands = [];
  const client = {
    async query(sql, params) {
      commands.push(String(sql).trim().split(/\s+/).slice(0, 3).join(' '));
      if (String(sql).includes('SELECT document')) return { rows: [{ document }] };
      if (String(sql).includes('UPDATE')) document = JSON.parse(params[1]);
      return { rows: [] };
    },
    release() { commands.push('RELEASE'); },
  };
  const pool = { connect: async () => client };
  const store = new PostgresStore({ pool });
  const state = await store.update(async (draft) => {
    draft.tenants.push({ id: 'tenant-a' });
    return draft;
  });
  assert.equal(state.tenants[0].id, 'tenant-a');
  assert.equal(document.tenants[0].id, 'tenant-a');
  assert.match(commands[0], /^BEGIN/);
  assert.ok(commands.includes('COMMIT'));
  assert.equal(commands.at(-1), 'RELEASE');
});

test('PostgresStore rejects injected schema identifiers', () => {
  assert.equal(safeIdentifier('fenix_tenant'), 'fenix_tenant');
  assert.throws(() => safeIdentifier('fenix; DROP SCHEMA public'), /invalid/);
});

test('RedisCache namespaces tenant data and applies TTL', async () => {
  const values = new Map();
  const calls = [];
  const client = {
    async get(key) { return values.get(key) ?? null; },
    async set(key, value, options) { values.set(key, value); calls.push({ key, options }); },
    async del(key) { return values.delete(key) ? 1 : 0; },
    async ping() { return 'PONG'; },
  };
  const cache = new RedisCache({ client });
  await cache.set('t1', 'session', 'abc', { role: 'admin' }, 60);
  assert.deepEqual(await cache.get('t1', 'session', 'abc'), { role: 'admin' });
  assert.deepEqual(calls[0], { key: 'fenix:t1:session:abc', options: { EX: 60 } });
  assert.equal((await cache.health()).ok, true);
});

test('BullMQ runtime parses TLS credentials and submits idempotent jobs', async () => {
  const added = [];
  class FakeQueue {
    constructor(name, options) { this.name = name; this.options = options; this.client = Promise.resolve({ ping: async () => 'PONG' }); }
    async add(name, payload, options) { added.push({ name, payload, options }); return { id: options.jobId }; }
    async close() {}
  }
  class FakeWorker { async close() {} }
  const connection = connectionFromUrl('rediss://user:p%40ss@redis.example:6380/2');
  assert.deepEqual(connection, {
    host: 'redis.example', port: 6380, username: 'user', password: 'p@ss', db: 2, tls: {},
  });
  const runtime = new BullMQRuntime({ connection, QueueClass: FakeQueue, WorkerClass: FakeWorker });
  await runtime.enqueue('software-builds', 'build', { projectId: 'p1' }, { idempotencyKey: 'build-p1' });
  assert.equal(added[0].options.jobId, 'build-p1');
  assert.equal(added[0].options.attempts, 3);
  assert.equal((await runtime.health()).ok, true);
});

test('S3 object adapter stores tenant-prefixed objects and verifies checksums', async () => {
  class Command { constructor(input) { this.input = input; } }
  const objects = new Map();
  const client = {
    async send(command) {
      if (command.input.Body) {
        objects.set(command.input.Key, command.input);
        return { ETag: 'etag-1' };
      }
      if (command.input.Key) {
        const stored = objects.get(command.input.Key);
        return {
          Body: { transformToByteArray: async () => stored.Body },
          Metadata: stored.Metadata,
          ContentType: stored.ContentType,
        };
      }
      return {};
    },
  };
  const storage = new S3ObjectStore({
    client, bucket: 'artifacts',
    commands: { PutObjectCommand: Command, GetObjectCommand: Command, HeadBucketCommand: Command },
  });
  const saved = await storage.put('t1', 'builds', 'app.zip', Buffer.from('binary'));
  const loaded = await storage.get('t1', 'builds', 'app.zip');
  assert.equal(saved.key, 't1/builds/app.zip');
  assert.equal(loaded.body.toString(), 'binary');
  assert.equal(loaded.sha256, saved.sha256);
  assert.equal((await storage.health()).ok, true);
});

test('production configuration fails closed without external infrastructure', () => {
  assert.throws(() => loadInfrastructureConfig({ FENIX_ENV: 'production' }), /infrastructure is incomplete/);
  const config = loadInfrastructureConfig({ FENIX_ENV: 'development' });
  assert.equal(config.databaseUrl, null);
});
