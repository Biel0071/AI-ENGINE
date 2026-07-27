const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { LEVELS } = require('../src/ai-city/ai-city-projection');

async function bootstrap() { const app = await createApp(); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice'); return app; }

test('AI City projects the complete enterprise hierarchy from durable Fabric events', async () => {
  const app = await bootstrap();
  await app.fabric.enroll('grg', 'alice', { name: 'CRM Central', version: '1.0.0', systemType: 'crm', city: { district: 'business', building: 'crm-tower' } });
  const city = await app.aiCity.map('grg', 'alice');
  assert.deepEqual(city.hierarchy, LEVELS);
  for (const level of LEVELS) assert.ok(city.nodes.some((node) => node.type === level), `missing ${level}`);
  assert.ok(city.nodes.some((node) => node.type === 'DISTRICT' && node.key === 'business'));
  assert.ok(city.nodes.some((node) => node.type === 'BUILDING' && node.key === 'crm-tower'));
  assert.ok(city.edges.length >= LEVELS.length - 1);
  assert.equal(city.status, 'ACTIVE');
});

test('AI City reflects degraded events and can be rebuilt exactly from Event Store', async () => {
  const app = await bootstrap();
  await app.fabricEvents.publish({ tenantId: 'grg', stream: 'container:api', type: 'container.health.failed', source: 'runtime-monitor', subject: 'api', data: { actorId: 'alice', status: 'FAILED' } });
  const before = await app.aiCity.map('grg', 'alice');
  assert.equal(before.status, 'DEGRADED');
  const semanticBefore = before.nodes.map((node) => [node.id, node.type, node.key, node.parentId]);
  await app.store.update((state) => { state.cityNodes = []; state.cityEdges = []; state.cityProjectionStates = []; return state; });
  const rebuilt = await app.aiCity.rebuild('grg', 'alice');
  assert.deepEqual(rebuilt.nodes.map((node) => [node.id, node.type, node.key, node.parentId]), semanticBefore);
  assert.equal(rebuilt.status, 'DEGRADED');
  assert.ok(rebuilt.projection.rebuiltAt);
});

test('AI City is tenant-isolated', async () => {
  const app = await bootstrap();
  await app.controlPlane.createTenant({ id: 'other', name: 'Other' }, 'bob');
  await app.fabricEvents.publish({ tenantId: 'grg', stream: 'api:one', type: 'api.ready', source: 'test', subject: 'one', data: { actorId: 'alice' } });
  await app.fabricEvents.publish({ tenantId: 'other', stream: 'api:two', type: 'api.ready', source: 'test', subject: 'two', data: { actorId: 'bob' } });
  const city = await app.aiCity.map('grg', 'alice');
  assert.ok(city.nodes.every((node) => node.tenantId === 'grg'));
  assert.ok(!city.nodes.some((node) => node.label === 'two'));
});
