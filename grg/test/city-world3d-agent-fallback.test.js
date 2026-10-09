const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');
const context = {
  AbortSignal,
  THREE: {},
  localStorage: { getItem() { return null; } },
  window: { addEventListener() {}, localStorage: { getItem() { return null; } } },
  document: { readyState: 'loading', addEventListener() {} }
};
vm.runInNewContext(source, context);

function createWorld(fetchFn) {
  const world = Object.create(context.window.FenixWorld3DEngine.prototype);
  world.agents = new Map();
  world.emptyOverlay = { style: {} };
  world.camilaGroup = null;
  world._initCamilaAgent = function () { this.camilaGroup = {}; };
  world._initWorkforceAgents = function () {};
  world.spawnDynamicAgent = function (agent) { this.agents.set(agent.id, { ...agent, mesh: {} }); };
  world._normalizeAgentCoordinates = function (coordinates, index) {
    return context.window.FenixWorld3DEngine.prototype._normalizeAgentCoordinates.call(this, coordinates, index);
  };
  world.camilaState = {};
  world.agentBadgeEl = null;
  world.workforceSpawned = false;
  world.vehicles = [];
  world.workstationsData = [];
  world.scene = null;
  world.dynamicBuildings = new Map();
  context.window.fenixAuthedFetch = fetchFn;
  context.window.fenixFetch = async () => { throw new Error('legacy fetch bypassed authenticated helper'); };
  return world;
}

const camila = {
  id: 'agent-camila',
  name: 'Supervisora Camila',
  status: 'AVAILABLE',
  coordinates: { x: 12, y: 8 }
};

test('City falls back to the authenticated agents endpoint when the full state request times out', async () => {
  const requested = [];
  const world = createWorld(async (url) => {
    requested.push(url);
    if (url === '/api/v2/living-city/state') throw new Error('request timed out');
    return { ok: true, json: async () => ({ agents: [camila] }) };
  });

  await world.syncRealData();

  assert.deepEqual(requested, ['/api/v2/living-city/state', '/api/v2/living-city/agents']);
  assert.equal(world.agents.get('agent-camila')?.name, 'Supervisora Camila');
  assert.equal(world.emptyOverlay.style.display, 'none');
});

test('City falls back to the agents endpoint when the full state has no agent projection', async () => {
  const requested = [];
  const world = createWorld(async (url) => {
    requested.push(url);
    if (url === '/api/v2/living-city/state') return { ok: true, json: async () => ({ agents: [] }) };
    return { ok: true, json: async () => ({ agents: [camila] }) };
  });

  await world.syncRealData();

  assert.deepEqual(requested, ['/api/v2/living-city/state', '/api/v2/living-city/agents']);
  assert.equal(world.agents.get('agent-camila')?.name, 'Supervisora Camila');
  assert.equal(world.emptyOverlay.style.display, 'none');
});
