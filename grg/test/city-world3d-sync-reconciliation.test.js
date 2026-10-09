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
  document: { readyState: 'loading', addEventListener() {} },
};
vm.runInNewContext(source, context);

function createWorld(fetchFn) {
  const removed = [];
  const world = Object.create(context.window.FenixWorld3DEngine.prototype);
  world.agents = new Map();
  world.emptyOverlay = { style: {} };
  world.camilaGroup = null;
  world.workforceSpawned = false;
  world.vehicles = [];
  world.workstationsData = [];
  world.scene = null;
  world.dynamicBuildings = new Map();
  world.interactiveMeshes = [];
  world.removeDynamicEntity = ({ id }) => {
    removed.push(id);
    world.agents.delete(id);
    return { ok: true, removed: true, id, type: 'agent' };
  };
  world._normalizeAgentCoordinates = () => ({ x: 0, y: 0.8, z: 0 });
  world.spawnDynamicAgent = (agent) => world.agents.set(agent.id, { ...agent, mesh: {} });
  world._initCamilaAgent = () => {};
  world._initWorkforceAgents = () => {};
  context.window.fenixAuthedFetch = fetchFn;
  return { world, removed };
}

function response(body) {
  return { ok: true, json: async () => body };
}

test('City removes agent entities absent from a successful API snapshot', async () => {
  const { world, removed } = createWorld(async (url) => response({ agents: [] }));
  world.agents.set('retired-agent', { id: 'retired-agent', mesh: {} });

  await world.syncRealData();

  assert.deepEqual(removed, ['retired-agent']);
  assert.equal(world.agents.size, 0);
  assert.equal(world.emptyOverlay.style.display, 'flex');
});

test('City does not seed workforce avatars outside the API agent snapshot', async () => {
  const { world } = createWorld(async (url) => response({ agents: [{ id: 'agent-security', name: 'Security Agent', status: 'AVAILABLE' }] }));
  const seeded = [];
  world._initWorkforceAgents = () => {
    seeded.push('agent-andre');
    world.agents.set('agent-andre', { id: 'agent-andre', mesh: {} });
  };

  await world.syncRealData();

  assert.deepEqual(seeded, []);
  assert.deepEqual(Array.from(world.agents.keys()), ['agent-security']);
});
