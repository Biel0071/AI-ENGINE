const test = require('node:test');
const assert = require('node:assert/strict');
const { AuditTrail } = require('../src/governance/audit-trail');

test('does not persist periodic telemetry heartbeats as durable audit events', async () => {
  const state = { auditEvents: [] };
  let writes = 0;
  let listener;
  const audit = new AuditTrail({
    store: {
      async update(mutator) {
        writes += 1;
        await mutator(state);
      },
    },
  });
  audit.attach({ on(_event, handler) { listener = handler; return () => {}; } });

  for (const type of ['fenix.heartbeat', 'runtime.heartbeat', 'jarvis.heartbeat.tick']) {
    await listener({ type, payload: { heartbeatCount: 1 } });
  }

  assert.equal(writes, 0);
  assert.deepEqual(state.auditEvents, []);
});

test('continues persisting mission, job, and user initiated events', async () => {
  const state = { auditEvents: [] };
  let listener;
  const audit = new AuditTrail({
    store: {
      async update(mutator) { await mutator(state); },
      async read() { return state; },
    },
  });
  audit.attach({ on(_event, handler) { listener = handler; return () => {}; } });

  for (const type of ['mission.step.started', 'job.completed', 'user.settings.updated']) {
    await listener({ type, payload: { tenantId: 'tenant-a', actorId: 'operator' } });
  }

  assert.deepEqual(state.auditEvents.map((event) => event.action), [
    'event.mission.step.started',
    'event.job.completed',
    'event.user.settings.updated',
  ]);
  assert.equal((await audit.verify('tenant-a')).valid, true);
});
