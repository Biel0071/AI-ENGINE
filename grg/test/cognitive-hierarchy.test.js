const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { CognitiveHierarchy, PROJECT_AGENT_ROLES } = require('../src/cognitive/cognitive-hierarchy');
const { MemoryEngine } = require('../src/memory/memory-engine');
const { ForbiddenError, ValidationError } = require('../src/kernel/errors');

async function bootstrap() {
  const store = new MemoryStore(); const bus = new EventBus();
  const controlPlane = await new ControlPlane({ store, bus }).initialize();
  await controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'admin');
  const hierarchy = new CognitiveHierarchy({ store, controlPlane, bus });
  return { store, bus, controlPlane, hierarchy };
}

test('cognitive hierarchy creates identities, workspaces and project agents', async () => {
  const { hierarchy } = await bootstrap();
  const master = await hierarchy.ensureMaster('grg', 'admin');
  const org = await hierarchy.create('grg', 'admin', { type: 'organization', name: 'GRG Serviços' });
  const company = await hierarchy.create('grg', 'admin', { type: 'company', name: 'Commerce', parentId: org.id });
  const store = await hierarchy.create('grg', 'admin', { type: 'store', name: 'Loja Centro', parentId: company.id });
  const project = await hierarchy.create('grg', 'admin', { type: 'project', name: 'CRM', parentId: store.id });
  const workspace = await hierarchy.workspace('grg', 'admin', project.id);
  assert.equal(master.type, 'MASTER');
  assert.match(project.identity, /^fenix:\/\/grg\/project\//);
  assert.equal(workspace.entityId, project.id);
  assert.deepEqual(workspace.agents.map((item) => item.role).sort(), [...PROJECT_AGENT_ROLES].sort());
  assert.ok(workspace.agents.every((item) => item.gateway === 'ai-gateway'));
});

test('hierarchy rejects invalid and cross-tenant parents', async () => {
  const { hierarchy, controlPlane } = await bootstrap();
  const org = await hierarchy.create('grg', 'admin', { type: 'organization', name: 'Org' });
  await assert.rejects(() => hierarchy.create('grg', 'admin', { type: 'store', name: 'Invalid', parentId: org.id }), ValidationError);
  await controlPlane.createTenant({ id: 'other', name: 'Other' }, 'admin');
  await assert.rejects(() => hierarchy.create('other', 'admin', { type: 'company', name: 'Leak', parentId: org.id }));
});

test('scope grants inherit downward while unrelated actors remain isolated', async () => {
  const { hierarchy, controlPlane } = await bootstrap();
  await controlPlane.addMember('grg', 'admin', { userId: 'alice', role: 'employee' });
  await controlPlane.addMember('grg', 'admin', { userId: 'bob', role: 'employee' });
  const company = await hierarchy.create('grg', 'admin', { type: 'company', name: 'Commerce' });
  const store = await hierarchy.create('grg', 'admin', { type: 'store', name: 'Loja', parentId: company.id });
  const project = await hierarchy.create('grg', 'admin', { type: 'project', name: 'ERP', parentId: store.id });
  await hierarchy.grant('grg', 'admin', { subjectId: 'alice', entityId: store.id, permissions: ['read'], inherit: true });
  assert.equal((await hierarchy.get('grg', 'alice', project.id)).id, project.id);
  await assert.rejects(() => hierarchy.get('grg', 'bob', project.id), ForbiddenError);
  await assert.rejects(() => hierarchy.ensureMaster('grg', 'bob'), ForbiddenError);
});

test('hierarchical memories are hidden without a scope grant', async () => {
  const { hierarchy, controlPlane, store, bus } = await bootstrap();
  await controlPlane.addMember('grg', 'admin', { userId: 'alice', role: 'employee' });
  await controlPlane.addMember('grg', 'admin', { userId: 'bob', role: 'employee' });
  const company = await hierarchy.create('grg', 'admin', { type: 'company', name: 'Commerce' });
  const project = await hierarchy.create('grg', 'admin', { type: 'project', name: 'Private API', parentId: company.id });
  await hierarchy.grant('grg', 'admin', { subjectId: 'alice', entityId: project.id, permissions: ['read'] });
  const memory = new MemoryEngine({ store, bus, controlPlane, hierarchy });
  await memory.remember('grg', 'admin', { kind: 'project', scopeType: 'project', scopeId: project.id, content: 'OAuth implementation', provenance: { type: 'adr', reference: 'ADR-42' } });
  assert.equal((await memory.query('grg', 'alice', 'OAuth')).results.length, 1);
  assert.equal((await memory.query('grg', 'bob', 'OAuth')).results.length, 0);
});

test('cross-scope knowledge sharing is denied by default and allowed only by policy', async () => {
  const { hierarchy } = await bootstrap();
  const source = await hierarchy.create('grg', 'admin', { type: 'company', name: 'Source' });
  const target = await hierarchy.create('grg', 'admin', { type: 'company', name: 'Target' });
  const request = { sourceEntityId: source.id, targetEntityId: target.id, knowledgeKind: 'pattern', classification: 'internal' };
  await assert.rejects(() => hierarchy.authorizeShare('grg', 'admin', request), ForbiddenError);
  await hierarchy.createSharingPolicy('grg', 'admin', { sourceEntityId: source.id, targetEntityId: target.id, knowledgeKinds: ['pattern'], classifications: ['internal'] });
  assert.equal(await hierarchy.authorizeShare('grg', 'admin', request), true);
  await assert.rejects(() => hierarchy.authorizeShare('grg', 'admin', { ...request, classification: 'restricted' }), ForbiddenError);
});

test('stable memory keys are isolated between cognitive scopes', async () => {
  const { hierarchy, controlPlane, store, bus } = await bootstrap();
  const first = await hierarchy.create('grg', 'admin', { type: 'company', name: 'First' });
  const second = await hierarchy.create('grg', 'admin', { type: 'company', name: 'Second' });
  const memory = new MemoryEngine({ store, bus, controlPlane, hierarchy });
  const input = { kind: 'semantic', scopeType: 'company', stableKey: 'architecture:auth', provenance: { type: 'adr', reference: 'ADR-auth' } };
  const a = await memory.remember('grg', 'admin', { ...input, scopeId: first.id, content: 'OAuth' });
  const b = await memory.remember('grg', 'admin', { ...input, scopeId: second.id, content: 'SAML' });
  assert.notEqual(a.id, b.id);
  assert.equal((await memory.query('grg', 'admin', 'OAuth', { scopeId: first.id })).results[0].memory.content, 'OAuth');
  assert.equal((await memory.query('grg', 'admin', 'SAML', { scopeId: second.id })).results[0].memory.content, 'SAML');
});
