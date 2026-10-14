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
  const normalizedIndexes = [];
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
  world._normalizeAgentCoordinates = (coordinates = {}, index = 0) => {
    normalizedIndexes.push(index);
    return {
    x: Number(coordinates.x) || 0,
    y: Number.isFinite(Number(coordinates.y)) ? Number(coordinates.y) : 0.8,
    z: Number(coordinates.z) || 0,
    };
  };
  world.spawnDynamicAgent = (agent) => world.agents.set(agent.id, {
    ...agent,
    mesh: {
      position: {
        x: agent.coordinates.x, y: agent.coordinates.y, z: agent.coordinates.z,
        set(x, y, z) { Object.assign(this, { x, y, z }); },
      },
    },
  });
  world._initCamilaAgent = () => {};
  world._initWorkforceAgents = () => {};
  context.window.fenixAuthedFetch = fetchFn;
  return { world, removed, normalizedIndexes };
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

test('agents without API coordinates get distinct stable fallback locations', async () => {
  const agentList = [{ id: 'agent-alpha' }, { id: 'agent-beta' }];
  const { world, normalizedIndexes } = createWorld(async () => response({ agents: agentList }));

  await world.syncRealData();
  const firstSnapshot = normalizedIndexes.splice(0);
  await world.syncRealData();

  assert.equal(new Set(firstSnapshot).size, 2, 'different agents must not share a fallback slot');
  assert.deepEqual(normalizedIndexes, firstSnapshot, 'repeated snapshots must preserve each agent fallback slot');
});

test('a repeated location snapshot does not snap an agent out of an active movement path', async () => {
  const { world } = createWorld(async () => response({ agents: [{ id: 'agent-moving', coordinates: { x: 0, z: 0 } }] }));
  const mesh = { position: { x: 1, y: 0.8, z: 2, set(x, y, z) { Object.assign(this, { x, y, z }); } } };
  const activePath = [{ x: 10, y: 0.8, z: 12 }];
  world.agents.set('agent-moving', {
    id: 'agent-moving', mesh, coordinates: { x: 0, y: 0.8, z: 0 },
    telemetryCoordinates: { x: 0, y: 0.8, z: 0 }, path: activePath, pathIndex: 0,
  });

  await world.syncRealData();

  assert.deepEqual({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }, { x: 1, y: 0.8, z: 2 });
  assert.equal(world.agents.get('agent-moving').path, activePath, 'the explicit route remains in progress');
});

test('a changed server location supersedes an old local movement route smoothly', async () => {
  const { world } = createWorld(async () => response({ agents: [{ id: 'agent-moving', coordinates: { x: 8, z: 6 } }] }));
  const mesh = { position: { x: 1, y: 0.8, z: 2, set(x, y, z) { Object.assign(this, { x, y, z }); } } };
  world.agents.set('agent-moving', {
    id: 'agent-moving', mesh, coordinates: { x: 0, y: 0.8, z: 0 },
    telemetryCoordinates: { x: 0, y: 0.8, z: 0 }, path: [{ x: 10, y: 0.8, z: 12 }], pathIndex: 0,
  });

  await world.syncRealData();

  const agent = world.agents.get('agent-moving');
  assert.equal(agent.path, null, 'server movement supersedes the old local route');
  assert.deepEqual({ ...agent.telemetryTarget }, { x: 8, y: 0.8, z: 6 }, 'the normalized server position becomes the next target');
  assert.deepEqual({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }, { x: 1, y: 0.8, z: 2 },
    'the mesh stays at its current point until the render loop advances it');
});

test('telemetry movement advances smoothly and stops exactly at the server position', () => {
  const world = Object.create(context.window.FenixWorld3DEngine.prototype);
  const agent = {
    speed: 2.4,
    telemetryTarget: { x: 3, y: 0.8, z: 4 },
    mesh: {
      position: { x: 0, y: 0.8, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } },
      rotation: { y: 0 },
    },
  };

  assert.equal(world._advanceAgentToTelemetry(agent, 0.25), true);
  assert.ok(agent.mesh.position.x > 0 && agent.mesh.position.x < 3, 'agent advances a partial step');
  assert.ok(agent.telemetryTarget, 'target remains while movement is in progress');
  assert.equal(world._advanceAgentToTelemetry(agent, 10), false);
  assert.deepEqual({ x: agent.mesh.position.x, y: agent.mesh.position.y, z: agent.mesh.position.z }, { x: 3, y: 0.8, z: 4 });
  assert.equal(agent.telemetryTarget, null, 'reached target is cleared');
});
