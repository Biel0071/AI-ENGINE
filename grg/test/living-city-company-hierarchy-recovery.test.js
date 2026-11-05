'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handleLivingCityRoutes } = require('../src/api/living-city-routes');

test('company hierarchy resolves from an existing building and its measured agents when company catalog is empty', async () => {
  const agents = {
    'agent-api-ops': { id: 'agent-api-ops', name: 'Alex - API Operations', companyId: 'api-platform', status: 'AVAILABLE' },
    'agent-infra': { id: 'agent-infra', name: 'Lucas - Infra & Queues', companyId: 'api-platform', status: 'AVAILABLE' },
  };
  const building = { id: 'bld-api-platform', name: 'API Platform Gateway', companyId: 'api-platform' };
  const worldEngine = {
    companies: {}, buildings: { [building.id]: building }, agents, workstations: {}, mutationLog: [],
    findCompany: () => null,
    findBuilding: (id) => worldEngine.buildings[id] || null,
    getCompanyHierarchy: () => null,
  };
  const app = { controlPlane: { authorize: async () => ({}) } };
  let status;
  let body;

  const handled = await handleLivingCityRoutes(
    { method: 'GET' }, {}, new URL('http://fenix.test/api/v2/living-city/company/api-platform'), app,
    (_res, code, payload) => { status = code; body = payload; }, async () => ({}),
    { tenantId: 'tenant-a', actorId: 'operator' },
    { worldEngine, simulationEngine: { isRunning: true } },
  );

  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.equal(body.source, 'WorldStateEngine/CompanyHierarchyDerived');
  assert.equal(body.company.id, 'api-platform');
  assert.equal(body.building.id, 'bld-api-platform');
  assert.deepEqual(body.agents.map((agent) => agent.id), ['agent-api-ops', 'agent-infra']);

  await handleLivingCityRoutes(
    { method: 'GET' }, {}, new URL('http://fenix.test/api/v2/living-city/company/unknown'), app,
    (_res, code) => { status = code; }, async () => ({}),
    { tenantId: 'tenant-a', actorId: 'operator' },
    { worldEngine, simulationEngine: { isRunning: true } },
  );
  assert.equal(status, 404);
});
