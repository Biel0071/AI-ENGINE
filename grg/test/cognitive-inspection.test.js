const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { EventStore } = require('../src/eventing/event-store');
const { FabricEventBus } = require('../src/eventing/fabric-event-bus');
const { KnowledgeGraph } = require('../src/knowledge-graph/knowledge-graph');
const { MemoryEngine } = require('../src/memory/memory-engine');
const { CognitiveInspectionEngine } = require('../src/inspection/cognitive-inspection-engine');
const { parseInspectionReport } = require('../src/inspection/inspection-report');
const { ValidationError } = require('../src/kernel/errors');

function report() { return { schemaVersion: 1, revision: 'abc123', sourceHash: 'sha256:source', summary: 'Node API using Redis', architecture: { style: 'modular-monolith', modules: ['api', 'worker'] }, metrics: { files: 42, complexity: 12 }, entities: [{ type: 'project', key: 'root', label: 'Commerce', confidence: 1, evidence: [{ reference: 'package.json', line: 1 }] }, { type: 'api', key: 'api.users', label: 'GET /users', confidence: 0.95, attributes: { method: 'GET', path: '/users' }, evidence: [{ reference: 'src/routes.js', line: 10 }] }, { type: 'cache', key: 'redis', label: 'Redis', confidence: 0.9, evidence: [{ reference: 'docker-compose.yml', line: 20 }] }], relationships: [{ fromKey: 'api.users', toKey: 'redis', type: 'USES', confidence: 0.8, evidence: [{ reference: 'src/routes.js', line: 12 }] }, { fromKey: 'root', toKey: 'api.users', type: 'CONTAINS', confidence: 1, evidence: [{ reference: 'src/routes.js', line: 1 }] }], risks: [{ title: 'Redis has no TLS', severity: 'medium', evidence: ['docker-compose.yml:20'] }], roadmap: [{ title: 'Enable Redis TLS', benefit: 'confidentiality', risk: 'low', effort: 'small', impact: 'medium', priority: 'high', evidence: ['docker-compose.yml:20'] }], documents: [{ type: 'readme', path: 'README.md' }] }; }

async function bootstrap(output = report()) {
  const store = new MemoryStore(); const bus = new EventBus(); const cp = await new ControlPlane({ store, bus }).initialize(); await cp.createTenant({ id: 'grg', name: 'GRG' }, 'admin');
  const events = new FabricEventBus({ eventStore: new EventStore({ store }), liveBus: bus }); const graph = new KnowledgeGraph({ store, bus, controlPlane: cp }); const memory = new MemoryEngine({ store, bus, controlPlane: cp });
  const sandbox = { execute: async () => ({ id: 'exec-1', status: 'SUCCEEDED', result: { stdout: JSON.stringify(output) } }) };
  return { store, events, graph, engine: new CognitiveInspectionEngine({ store, controlPlane: cp, sandbox, knowledgeGraph: graph, memory, events }) };
}

test('sandbox inspection projects evidence into graph, twin, memory, city events and proposals', async () => {
  const { store, graph, engine } = await bootstrap(); const result = await engine.inspect('grg', 'admin', { workspacePath: '/authorized/project', projectId: 'commerce', sourceReference: 'workspace:commerce' });
  assert.equal(result.status, 'SUCCEEDED'); assert.equal(result.report.report.reportHash.length, 64); assert.equal(result.twin.model.architecture.style, 'modular-monolith'); assert.equal(result.proposals[0].executionAllowed, false);
  const state = await store.read(); assert.equal(state.knowledgeEntities.length, 4); assert.equal(state.knowledgeRelationships.length, 2); assert.equal(state.memories.length, 1); assert.ok(state.knowledgeEntities.some((item) => item.type === 'document')); assert.ok(state.domainEvents.some((item) => item.type === 'inspection.completed')); assert.ok(state.domainEvents.some((item) => item.type === 'inspection.entity.discovered'));
  const api = state.knowledgeEntities.find((item) => item.type === 'api'); const neighborhood = await graph.neighborhood('grg', 'admin', api.id, 1); assert.ok(neighborhood.entities.some((item) => item.type === 'cache'));
});

test('inspection reports reject facts without evidence, dangling edges and secrets', () => {
  const missingEvidence = report(); missingEvidence.entities[0].evidence = []; assert.throws(() => parseInspectionReport(JSON.stringify(missingEvidence)), ValidationError);
  const dangling = report(); dangling.relationships[0].toKey = 'missing'; assert.throws(() => parseInspectionReport(JSON.stringify(dangling)), ValidationError);
  const secret = report(); secret.entities[0].attributes = { apiKey: 'do-not-store' }; assert.throws(() => parseInspectionReport(JSON.stringify(secret)));
});

test('failed report validation records a reproducible failed inspection', async () => {
  const invalid = report(); invalid.relationships[0].toKey = 'missing'; const { store, engine } = await bootstrap(invalid); await assert.rejects(() => engine.inspect('grg', 'admin', { workspacePath: '/authorized/project' }), ValidationError); const state = await store.read(); assert.equal(state.inspectionRuns[0].status, 'FAILED'); assert.ok(state.domainEvents.some((item) => item.type === 'inspection.failed'));
});
