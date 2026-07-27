const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { DockerCliProbe } = require('../src/discovery-network/docker-cli-probe');

async function bootstrap(probes = []) { const app = await createApp({ discoveryProbes: probes }); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice'); return app; }

test('Discovery Network detects, changes and marks resources missing through events', async () => {
  let resources = [{ kind: 'database', externalId: 'postgres-main', name: 'PostgreSQL', version: '17', attributes: { state: 'running' }, capabilities: ['sql'] }];
  const probe = { name: 'inventory', scan: async () => resources };
  const app = await bootstrap([probe]);
  const first = await app.discoveryNetwork.scan('grg', 'alice', { probes: ['inventory'] });
  assert.equal(first.changes, 1);
  assert.equal((await app.registry.list('grg', 'alice')).find((item) => item.name === 'PostgreSQL').status, 'ACTIVE');
  resources = [];
  const second = await app.discoveryNetwork.scan('grg', 'alice', { probes: ['inventory'] });
  assert.equal(second.changes, 1);
  assert.equal((await app.registry.list('grg', 'alice')).find((item) => item.name === 'PostgreSQL').status, 'MISSING');
  assert.equal((await app.eventStore.list('grg', { type: 'discovery.resource.missing' })).length, 1);
});

test('Discovery only executes explicitly configured probes and rejects secret-shaped output', async () => {
  const app = await bootstrap([{ name: 'safe', scan: async () => [] }, { name: 'leaky', scan: async () => [{ kind: 'service', externalId: 'x', attributes: { accessToken: 'bad' } }] }]);
  await assert.rejects(() => app.discoveryNetwork.scan('grg', 'alice', { probes: ['unknown'] }), /not authorized/);
  await assert.rejects(() => app.discoveryNetwork.scan('grg', 'alice', { probes: ['leaky'] }), /secret field/);
});

test('Docker probe uses fixed non-shell arguments and normalizes containers', async () => {
  let invocation;
  const probe = new DockerCliProbe({ exec: async (file, args, options) => { invocation = { file, args, options }; return { stdout: JSON.stringify({ ID: 'abc', Names: 'crm', Image: 'crm:1', State: 'running', Status: 'Up', Networks: 'fabric', Mounts: '', Ports: '8080' }) + '\n' }; } });
  const result = await probe.scan();
  assert.deepEqual(invocation.args, ['ps', '--no-trunc', '--format', '{{json .}}']);
  assert.equal(invocation.options.windowsHide, true);
  assert.equal(result[0].kind, 'container');
});

test('Knowledge Federation projects structured facts into memory and graph without copying databases', async () => {
  const app = await bootstrap();
  const publication = await app.federation.publish('grg', 'alice', { publisherId: 'crm-central', topic: 'Customer authentication decision', key: 'auth-standard', statement: 'Use passkeys for customer portals.', facts: { pattern: 'passkeys' }, confidence: 0.95, provenance: { type: 'decision', reference: 'CRM-ADR-9', evidence: ['test:webauthn'] } });
  assert.equal(publication.status, 'PROJECTED');
  const memory = await app.memory.query('grg', 'alice', 'passkeys customer');
  assert.equal(memory.results[0].memory.stableKey, 'federated:crm-central:auth-standard');
  const state = await app.store.read();
  assert.ok(state.knowledgeEntities.some((item) => item.type === 'knowledge' && item.key === 'auth-standard'));
  assert.equal(state.domainEvents.filter((item) => item.type === 'knowledge.published').length, 1);
});

test('Knowledge Federation blocks secrets before publication', async () => {
  const app = await bootstrap();
  await assert.rejects(() => app.federation.publish('grg', 'alice', { publisherId: 'crm', topic: 'bad', statement: 'bad', facts: { password: 'leak' }, provenance: { reference: 'x' } }), /secret field/);
  assert.equal((await app.store.read()).knowledgePublications.length, 0);
});
