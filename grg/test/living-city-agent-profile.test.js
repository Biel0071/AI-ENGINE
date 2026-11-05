'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleLivingCityRoutes } = require('../src/api/living-city-routes');

function harness() {
  const state = { agents: [{ id: 'agent-a', tenantId: 'tenant-a', name: 'Agent A' }], agentProfiles: [] };
  const permissions = [];
  let writes = 0;
  const app = {
    controlPlane: { authorize: async (_tenant, _actor, permission) => { permissions.push(permission); } },
    agentRegistry: { list: () => [{ id: 'agent-a', name: 'Agent A' }] },
    store: {
      read: async () => state,
      update: async (mutate) => { writes += 1; mutate(state); return state; },
    },
  };
  return { app, state, permissions, get writes() { return writes; } };
}

async function postProfile(app, body, agentId = 'agent-a') {
  let response;
  let status;
  const handled = await handleLivingCityRoutes(
    { method: 'POST' }, {}, new URL(`http://fenix.test/api/v2/agents/${agentId}/profile`), app,
    (_res, code, payload) => { status = code; response = payload; },
    async () => body,
    { tenantId: 'tenant-a', actorId: 'operator' },
    { worldEngine: { agents: {}, companies: {}, buildings: {}, workstations: {}, vehicles: {}, constructions: {}, districts: {} }, simulationEngine: { isRunning: true } },
  );
  return { handled, status, response };
}

test('agent avatar profile saves only an allowlisted, tenant-scoped customization', async () => {
  const h = harness();
  const result = await postProfile(h.app, {
    displayName: 'Agent A Visual', role: 'Designer',
    avatar: { skin: 'tan', hairStyle: 'bob', hairColor: 'purple', outfit: 'hoodie', bodyType: 'compact', shirtColor: '#123abc', accessory: 'glasses', badge: 'silver', ignored: '<script>' },
  });

  assert.equal(result.handled, true);
  assert.equal(result.status, 200);
  assert.deepEqual(h.permissions, ['runtime:write']);
  assert.equal(h.writes, 1);
  assert.equal(h.state.agentProfiles[0].tenantId, 'tenant-a');
  assert.equal(h.state.agentProfiles[0].displayName, 'Agent A Visual');
  assert.equal(h.state.agentProfiles[0].avatar.shirtColor, '#123abc');
  assert.equal(h.state.agentProfiles[0].avatar.bodyType, 'compact');
  assert.equal(Object.hasOwn(h.state.agentProfiles[0].avatar, 'ignored'), false);
});

test('agent avatar profile rejects malformed colors and unknown agent IDs without writing', async () => {
  const h = harness();
  const invalid = await postProfile(h.app, { avatar: { shirtColor: 'url(javascript:alert(1))' } });
  assert.equal(invalid.status, 400);
  assert.equal(h.writes, 0);

  const unknown = await postProfile(h.app, { avatar: { skin: 'tan' } }, 'ghost');
  assert.equal(unknown.status, 404);
  assert.equal(h.writes, 0);
});

test('agent lifecycle accepts QUEUED as a truthful non-running runtime state', async () => {
  const h = harness();
  const agent = { id: 'agent-a', memory: [] };
  const worldEngine = {
    agents: { 'agent-a': agent },
    findAgent: (id) => id === 'agent-a' ? agent : null,
    applyMutation() {},
  };
  let status;
  let payload;
  await handleLivingCityRoutes(
    { method: 'POST' }, {}, new URL('http://fenix.test/api/v2/living-city/agent/agent-a/status'), h.app,
    (_res, code, body) => { status = code; payload = body; },
    async () => ({ status: 'QUEUED', reason: 'job aguarda worker' }),
    { tenantId: 'tenant-a', actorId: 'operator' },
    { worldEngine, simulationEngine: { isRunning: true } },
  );

  assert.equal(status, 200);
  assert.equal(payload.status, 'QUEUED');
  assert.equal(agent.state, 'QUEUED');
});
