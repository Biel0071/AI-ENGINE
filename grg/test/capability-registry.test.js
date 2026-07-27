const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { BUILT_INS } = require('../src/capabilities/capability-registry');

async function bootstrap() { const app = await createApp(); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice'); return app; }

test('tenant bootstrap registers built-in capabilities in Capability Registry and Service Fabric', async () => {
  const app = await bootstrap(); const capabilities = await app.capabilityRegistry.list('grg', 'alice'); const state = await app.store.read();
  assert.equal(capabilities.length, BUILT_INS.length);
  assert.ok(capabilities.every((item) => item.owner && item.version && item.permissions && item.resources && item.metrics));
  assert.equal(state.serviceRegistry.filter((item) => item.kind === 'capability').length, BUILT_INS.length);
  assert.equal(state.domainEvents.filter((item) => item.type === 'capability.registered').length, BUILT_INS.length);
  assert.ok(state.cityNodes.some((item) => item.type === 'SERVICE' && item.key === 'memory'));
});

test('capability upgrades are append-only and reject downgrade or unknown dependencies', async () => {
  const app = await bootstrap(); const current = await app.capabilityRegistry.get('grg', 'alice', 'memory');
  const upgraded = await app.capabilityRegistry.register('grg', 'alice', { ...current, id: 'memory', version: '1.1.0', changelog: 'retrieval tuning' });
  assert.equal(upgraded.version, '1.1.0'); assert.equal((await app.capabilityRegistry.history('grg', 'alice', 'memory')).length, 2);
  await assert.rejects(() => app.capabilityRegistry.register('grg', 'alice', { ...current, id: 'memory', version: '1.0.0' }), /version must increase/);
  await assert.rejects(() => app.capabilityRegistry.register('grg', 'alice', { id: 'new-cap', name: 'New', description: 'x', version: '1.0.0', owner: 'GRG', dependencies: ['missing'] }), /must already be registered/);
});

test('runtime events update capability health, metrics and logs without direct coupling', async () => {
  const app = await bootstrap();
  await app.fabricEvents.publish({ tenantId: 'grg', stream: 'job:one', type: 'runtime.job.succeeded', source: 'fenix-runtime', subject: 'one', data: { actorId: 'alice', jobId: 'one', jobType: 'factory.generate', status: 'SUCCEEDED', attempts: 1, limits: {} } });
  const capability = await app.capabilityRegistry.get('grg', 'alice', 'software-factory'); const state = await app.store.read();
  assert.equal(capability.health, 'HEALTHY'); assert.equal(capability.metrics.executions, 1); assert.equal(capability.metrics.successes, 1);
  assert.ok(state.capabilityLogs.some((item) => item.capabilityId === 'software-factory' && item.eventId));
});

test('capability manifests reject secrets and self-dependencies', async () => {
  const app = await bootstrap();
  await assert.rejects(() => app.capabilityRegistry.register('grg', 'alice', { id: 'secret-cap', name: 'Secret', description: 'x', version: '1.0.0', owner: 'GRG', apiKey: 'leak' }), /secret field/);
  await assert.rejects(() => app.capabilityRegistry.register('grg', 'alice', { id: 'self-cap', name: 'Self', description: 'x', version: '1.0.0', owner: 'GRG', dependencies: ['self-cap'] }), /depend on itself/);
});
