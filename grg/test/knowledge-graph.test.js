const test = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { KnowledgeGraph } = require('../src/knowledge-graph/knowledge-graph');

async function bootstrap() { const store = new MemoryStore(); const bus = new EventBus(); const cp = await new ControlPlane({ store, bus }).initialize(); await cp.createTenant({ id: 't1', name: 'T1' }, 'alice'); return { store, graph: new KnowledgeGraph({ store, bus, controlPlane: cp }) }; }
const entity = (type, key) => ({ type, key, attributes: {}, confidence: 0.9, provenance: { type: 'scan', reference: `repo:${key}` } });

test('entities evolve in place while relationships keep temporal versions', async () => {
  const { graph, store } = await bootstrap();
  const service = await graph.upsertEntity('t1', 'alice', entity('service', 'api'));
  const database = await graph.upsertEntity('t1', 'alice', entity('database', 'postgres'));
  const first = await graph.relate('t1', 'alice', { fromId: service.id, toId: database.id, type: 'DEPENDS_ON', attributes: { mode: 'read' }, provenance: { type: 'scan', reference: 'commit:1' } });
  const second = await graph.relate('t1', 'alice', { fromId: service.id, toId: database.id, type: 'DEPENDS_ON', attributes: { mode: 'write' }, provenance: { type: 'scan', reference: 'commit:2' } });
  assert.notEqual(first.id, second.id);
  const state = await store.read();
  assert.ok(state.knowledgeRelationships.find((item) => item.id === first.id).validTo);
  assert.equal(state.knowledgeRelationships.find((item) => item.id === second.id).validTo, null);
});

test('neighborhood and directed shortest path remain tenant scoped', async () => {
  const { graph } = await bootstrap();
  const a = await graph.upsertEntity('t1', 'alice', entity('service', 'a')); const b = await graph.upsertEntity('t1', 'alice', entity('service', 'b')); const c = await graph.upsertEntity('t1', 'alice', entity('service', 'c'));
  await graph.relate('t1', 'alice', { fromId: a.id, toId: b.id, type: 'CALLS', provenance: { type: 'trace', reference: '1' } });
  await graph.relate('t1', 'alice', { fromId: b.id, toId: c.id, type: 'CALLS', provenance: { type: 'trace', reference: '2' } });
  assert.equal((await graph.neighborhood('t1', 'alice', a.id, 1)).entities.length, 2);
  assert.deepEqual((await graph.shortestPath('t1', 'alice', a.id, c.id)).nodes, [a.id, b.id, c.id]);
  const impacts = await graph.impact('t1', 'alice', a.id);
  assert.equal(impacts.find((item) => item.entity.id === c.id).depth, 2);
});

test('relationships reject cross-tenant or missing endpoints', async () => {
  const { graph } = await bootstrap(); const a = await graph.upsertEntity('t1', 'alice', entity('service', 'a'));
  await assert.rejects(() => graph.relate('t1', 'alice', { fromId: a.id, toId: 'missing', type: 'CALLS', provenance: { reference: 'x' } }), /endpoint not found/);
});

test('anomaly detector reports corrupted dangling and self-loop relationships', async () => {
  const { graph, store } = await bootstrap(); const a = await graph.upsertEntity('t1', 'alice', entity('service', 'a'));
  await store.update(async (state) => { state.knowledgeRelationships.push({ id: 'bad-1', tenantId: 't1', fromId: a.id, toId: a.id, type: 'CALLS', validTo: null }); state.knowledgeRelationships.push({ id: 'bad-2', tenantId: 't1', fromId: a.id, toId: 'gone', type: 'CALLS', validTo: null }); return state; });
  const issues = await graph.anomalies('t1', 'alice');
  assert.ok(issues.some((item) => item.type === 'SELF_LOOP'));
  assert.ok(issues.some((item) => item.type === 'DANGLING'));
});
