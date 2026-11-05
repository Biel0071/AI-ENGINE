const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cityFixture() {
  const ids = [
    'ribbonTotalAgents', 'ribbonActiveAgents', 'ribbonMissionsCount',
    'ribbonJobsCount', 'ribbonFailedJobs', 'ribbonBlockedJobs',
    'floatingMissionCard', 'floatingJobCard',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, { textContent: '', style: {} }]));
  const context = {
    window: {},
    document: { getElementById: (id) => elements[id] || null },
    console: { log() {}, warn() {} },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/city-integration.js'), 'utf8'), context);
  const city = Object.create(context.window.CityIntegration.prototype);
  city.agentData = new Map();
  city.missionData = new Map();
  city.renderer = { removeAgent: (id) => { city.removed.push(id); } };
  city.interaction = { unregisterObject: (id) => { city.unregistered.push(id); } };
  city.removed = [];
  city.unregistered = [];
  return { city, elements };
}

test('city shows unavailable before snapshot and zero after an empty real snapshot', () => {
  const { city, elements } = cityFixture();
  city.updateCityRibbon();
  assert.equal(elements.ribbonTotalAgents.textContent, '—');
  assert.equal(elements.ribbonJobsCount.textContent, '—');
  city.agentsLoaded = true;
  city.jobsLoaded = true;
  city.updateCityRibbon();
  assert.equal(elements.ribbonTotalAgents.textContent, '0');
  assert.equal(elements.ribbonJobsCount.textContent, '0');
  assert.equal(elements.ribbonFailedJobs.textContent, '0');
});

test('city removes agents and mission cards absent from the next runtime snapshot', () => {
  const { city, elements } = cityFixture();
  city.agentData.set('retired', { status: 'WORKING' });
  city.populateAgents([]);
  assert.equal(city.agentData.size, 0);
  assert.deepEqual(city.removed, ['retired']);
  assert.deepEqual(city.unregistered, ['retired']);
  city.missionData.set('old-job', { status: 'RUNNING' });
  city.populateMissions([]);
  assert.equal(city.missionData.size, 0);
  assert.equal(elements.floatingMissionCard.style.display, 'none');
  assert.equal(elements.floatingJobCard.style.display, 'none');
});

test('city does not present a terminal job as the active mission', () => {
  const { city, elements } = cityFixture();
  city.populateMissions([{ id: 'completed', type: 'build', status: 'SUCCEEDED' }]);
  assert.equal(elements.floatingMissionCard.style.display, 'none');
  assert.equal(elements.floatingJobCard.style.display, 'none');
});

test('legacy City state route adapts its response from the tenant-scoped live World snapshot', async () => {
  const { handleProductExperienceRoutes } = require('../src/api/product-experience-routes');
  const { livingCityState } = require('../src/api/living-city-routes');
  const original = livingCityState;
  const expected = {
    buildings: [{ id: 'building-a' }],
    projects: [{ id: 'project-a' }],
    agents: [{ id: 'agent-a', status: 'WORKING' }, { id: 'agent-b', status: 'AVAILABLE' }],
    summary: { runningJobs: 1 },
  };
  require.cache[require.resolve('../src/api/living-city-routes')].exports.livingCityState = async (app, tenantId, actorId) => {
    assert.equal(tenantId, 'tenant-a');
    assert.equal(actorId, 'actor-a');
    return expected;
  };
  try {
    let response;
    const handled = await handleProductExperienceRoutes(
      { method: 'GET' }, {}, new URL('http://localhost/api/v2/city/state'),
      { controlPlane: { authorize() {} }, store: { read() {} } },
      (_res, status, payload) => { response = { status, payload }; },
      (_res, status, error) => { response = { status, error }; },
      { tenantId: 'tenant-a', actorId: 'actor-a' },
    );
    assert.equal(handled, true);
    assert.equal(response.status, 200);
    assert.deepEqual(response.payload.agents, expected.agents);
    assert.equal(response.payload.summary.onlineAgents, 1);
    assert.equal(response.payload.summary.totalProjects, 1);
    assert.equal(response.payload.summary.activeTasks, 1);
  } finally {
    require.cache[require.resolve('../src/api/living-city-routes')].exports.livingCityState = original;
  }
});
