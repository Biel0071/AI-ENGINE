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
