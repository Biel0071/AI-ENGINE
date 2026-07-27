const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function bootstrap() {
  const app = await createApp();
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await app.controlPlane.addMember('grg', 'alice', { userId: 'bob', role: 'admin' });
  return app;
}

test('global version ledger records every durable event once with field-level diff', async () => {
  const app = await bootstrap();
  const first = await app.fabricEvents.publish({ tenantId: 'grg', stream: 'service:crm', type: 'service.configured', source: 'test', subject: 'crm', data: { actorId: 'alice', replicas: 1, image: 'crm:1' } });
  await app.fabricEvents.publish({ tenantId: 'grg', stream: 'service:crm', type: 'service.configured', source: 'test', subject: 'crm', data: { actorId: 'alice', replicas: 2, image: 'crm:1' } });
  await app.versionEngine.record(first);

  const history = await app.versionEngine.history('grg', 'alice', 'service:crm');
  assert.equal(history.length, 2);
  assert.equal(history[0].version, 2);
  assert.equal(history[0].author, 'alice');
  const diff = await app.versionEngine.diff('grg', 'alice', 'service:crm', 1, 2);
  assert.deepEqual(diff.changes, [{ path: '$.replicas', before: 1, after: 2 }]);
  const state = await app.store.read();
  assert.equal(state.changeSets.filter((item) => item.resourceKey === 'service:crm').length, 2);
});

test('production rollback is only dispatched after independent approval', async () => {
  const app = await bootstrap();
  await app.fabricEvents.publish({ tenantId: 'grg', stream: 'service:crm', type: 'service.configured', source: 'test', subject: 'crm', data: { actorId: 'alice', image: 'crm:1' } });
  await app.fabricEvents.publish({ tenantId: 'grg', stream: 'service:crm', type: 'service.configured', source: 'test', subject: 'crm', data: { actorId: 'alice', image: 'crm:2' } });
  const proposal = await app.versionEngine.proposeRollback('grg', 'alice', { resourceKey: 'service:crm', targetVersion: 1, environment: 'production', reason: 'regression' });
  assert.equal(proposal.status, 'PENDING_APPROVAL');
  await assert.rejects(() => app.versionEngine.dispatchRollback('grg', 'alice', proposal.id), /not consumable/);
  await app.approvals.approve('grg', 'bob', proposal.approvalId);
  const dispatched = await app.versionEngine.dispatchRollback('grg', 'alice', proposal.id);
  assert.equal(dispatched.status, 'DISPATCHED');
  assert.ok((await app.eventStore.list('grg', { type: 'version.rollback.requested' })).some((item) => item.id === dispatched.eventId));
});

test('non-production rollback follows policy auto-approval but remains an explicit command', async () => {
  const app = await bootstrap();
  await app.fabricEvents.publish({ tenantId: 'grg', stream: 'api:catalog', type: 'api.changed', source: 'test', subject: 'catalog', data: { actorId: 'alice', revision: 'a' } });
  await app.fabricEvents.publish({ tenantId: 'grg', stream: 'api:catalog', type: 'api.changed', source: 'test', subject: 'catalog', data: { actorId: 'alice', revision: 'b' } });
  const proposal = await app.versionEngine.proposeRollback('grg', 'alice', { resourceKey: 'api:catalog', targetVersion: 1, environment: 'staging' });
  assert.equal(proposal.status, 'APPROVED');
  assert.equal((await app.versionEngine.dispatchRollback('grg', 'alice', proposal.id)).status, 'DISPATCHED');
});
