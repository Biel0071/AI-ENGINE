const test = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { MemoryEngine } = require('../src/memory/memory-engine');
const { QdrantVectorStore } = require('../src/memory/qdrant-vector-store');

async function bootstrap(options = {}) {
  const store = new MemoryStore();
  const bus = new EventBus();
  const cp = await new ControlPlane({ store, bus }).initialize();
  await cp.createTenant({ id: 't1', name: 'Tenant 1' }, 'alice');
  await cp.addMember('t1', 'alice', { userId: 'bob', role: 'employee' });
  await cp.addMember('t1', 'alice', { userId: 'charlie', role: 'subadmin' });
  return { store, bus, cp, memory: new MemoryEngine({ store, bus, controlPlane: cp, ...options }) };
}

const fact = (overrides = {}) => ({
  kind: 'semantic', title: 'Authentication standard', content: 'Use passkeys and short lived sessions.',
  confidence: 0.9, classification: 'internal', stableKey: 'security:authentication',
  provenance: { type: 'decision', reference: 'ADR-42', evidence: ['test:auth'] },
  ...overrides,
});

test('memory is versioned by stable key and preserves provenance history', async () => {
  const { memory, store } = await bootstrap();
  const first = await memory.remember('t1', 'alice', fact());
  const second = await memory.remember('t1', 'alice', fact({ content: 'Use passkeys, rotated sessions and device binding.' }));
  assert.equal(second.id, first.id);
  assert.equal(second.version, 2);
  const history = await memory.history('t1', 'alice', first.id);
  assert.deepEqual(history.map((item) => item.version), [1, 2]);
  assert.equal(history[0].provenance.reference, 'ADR-42');
  const state = await store.read();
  assert.equal(state.outbox.filter((item) => item.type === 'memory.index.requested').length, 2);
});

test('hybrid retrieval ranks lexical and vector evidence without crossing tenants', async () => {
  const vectorStore = {
    upsert: async () => {},
    search: async () => [],
    delete: async () => {},
  };
  const { memory, cp } = await bootstrap({ vectorStore });
  await cp.createTenant({ id: 't2', name: 'Tenant 2' }, 'mallory');
  await memory.remember('t1', 'alice', fact());
  await memory.remember('t2', 'mallory', fact({ stableKey: 'secret-other', content: 'authentication other tenant' }));
  const result = await memory.query('t1', 'alice', 'authentication sessions');
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].memory.tenantId, 't1');
});

test('working memory is private to its owner and restricted memory is admin-only', async () => {
  const { memory } = await bootstrap();
  await memory.remember('t1', 'alice', fact({ kind: 'working', stableKey: null, content: 'private scratchpad' }));
  const bob = await memory.query('t1', 'bob', 'private scratchpad');
  assert.equal(bob.results.length, 0);
  const restricted = await memory.remember('t1', 'alice', fact({ stableKey: 'restricted:one', classification: 'restricted' }));
  await assert.rejects(
    () => memory.remember('t1', 'charlie', fact({ stableKey: null, classification: 'restricted' })),
    /requires an administrator/,
  );
  await assert.rejects(() => memory.history('t1', 'charlie', restricted.id), /not found/i);
  await assert.rejects(
    () => memory.remember('t1', 'charlie', fact({ stableKey: 'restricted:one', classification: 'internal' })),
    /requires an administrator/,
  );
});

test('project and organization memories require a valid tenant scope', async () => {
  const { memory, cp, store } = await bootstrap();
  await assert.rejects(() => memory.remember('t1', 'alice', fact({ kind: 'project', projectId: 'missing' })), /existing tenant project/);
  const org = await cp.createOrg('t1', 'alice', { name: 'GRG' });
  await store.update(async (state) => { state.projects.push({ id: 'p1', tenantId: 't1' }); return state; });
  const project = await memory.remember('t1', 'alice', fact({ stableKey: null, kind: 'project', projectId: 'p1' }));
  const organization = await memory.remember('t1', 'alice', fact({ stableKey: null, kind: 'organization', orgId: org.id }));
  assert.equal(project.projectId, 'p1');
  assert.equal(organization.orgId, org.id);
});

test('forget creates a tombstone and retention purge removes expired retrieval', async () => {
  const { memory } = await bootstrap();
  const record = await memory.remember('t1', 'alice', fact({ stableKey: null, retentionUntil: '2026-01-01T00:00:00.000Z' }));
  assert.deepEqual(await memory.purgeExpired('t1', 'alice', '2026-02-01T00:00:00.000Z'), { expired: 1 });
  assert.equal((await memory.query('t1', 'alice', 'authentication')).results.length, 0);
  const history = await memory.history('t1', 'alice', record.id);
  assert.equal(history.at(-1).tombstone, true);
});

test('retrieval cache is revisioned so a new memory cannot return stale results', async () => {
  const values = new Map();
  const cache = {
    get: async (_tenant, _namespace, key) => values.get(key) || null,
    set: async (_tenant, _namespace, key, value) => values.set(key, value),
  };
  const { memory } = await bootstrap({ cache });
  const empty = await memory.query('t1', 'alice', 'authentication');
  assert.equal(empty.results.length, 0);
  await memory.remember('t1', 'alice', fact());
  const fresh = await memory.query('t1', 'alice', 'authentication');
  assert.equal(fresh.results.length, 1);
  assert.equal(fresh.cached, false);
});

test('Qdrant adapter creates collection, upserts payload and enforces tenant filter', async () => {
  const requests = [];
  let collectionExists = false;
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (options.method === 'GET' && !collectionExists) return { ok: false, status: 404, text: async () => '{}' };
    if (options.method === 'PUT' && url.endsWith('/fenix_memory')) collectionExists = true;
    if (url.endsWith('/points/query')) return { ok: true, status: 200, text: async () => JSON.stringify({ result: { points: [{ id: 'm1', score: 0.8, payload: { memoryId: 'm1' } }] } }) };
    return { ok: true, status: 200, text: async () => '{}' };
  };
  const qdrant = await new QdrantVectorStore({ fetchImpl, dimensions: 3 }).initialize();
  await qdrant.upsert({ id: 'm1', tenantId: 't1', kind: 'semantic', classification: 'internal', status: 'ACTIVE' }, [1, 0, 0]);
  const hits = await qdrant.search('t1', [1, 0, 0]);
  const queryBody = JSON.parse(requests.find((item) => item.url.endsWith('/points/query')).options.body);
  assert.deepEqual(hits, [{ id: 'm1', score: 0.8 }]);
  assert.deepEqual(queryBody.filter.must[0], { key: 'tenantId', match: { value: 't1' } });
});

test('invalid or unprovenanced memories are rejected', async () => {
  const { memory } = await bootstrap();
  await assert.rejects(() => memory.remember('t1', 'alice', { kind: 'semantic', content: 'claim' }), /provenance/);
  await assert.rejects(() => memory.remember('t1', 'alice', fact({ confidence: 2 })), /between 0 and 1/);
});

test('episodic consolidation creates reusable semantic knowledge with source evidence', async () => {
  const { memory, store } = await bootstrap();
  for (let index = 1; index <= 3; index += 1) {
    await memory.remember('t1', 'alice', fact({
      kind: 'episodic', stableKey: null, title: `Incident ${index}`,
      content: `Database timeout incident ${index}`,
      provenance: { type: 'incident', reference: `INC-${index}` },
    }));
  }
  const result = await memory.consolidate('t1', 'alice');
  assert.equal(result.consolidated, 3);
  assert.equal(result.memory.kind, 'semantic');
  assert.equal(result.memory.provenance.evidence.length, 3);
  const state = await store.read();
  assert.equal(state.memories.filter((item) => item.kind === 'episodic').every((item) => item.consolidatedInto === result.memory.id), true);
});
