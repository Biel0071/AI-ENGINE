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
      y: Number.isFinite(Number(coordinates.z)) && Number.isFinite(Number(coordinates.y)) ? Number(coordinates.y) : 0.8,
    z: Number.isFinite(Number(coordinates.z)) ? Number(coordinates.z) : (Number(coordinates.y) || 0),
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

test('City accepts an authoritative empty agent snapshot without issuing fallback reads', async () => {
  const requests = [];
  const { world } = createWorld(async (url) => {
    requests.push(url);
    return response({ agents: [] });
  });

  await world.syncRealData({ type: 'fenix:city-world', detail: { projects: [], agents: [] } });

  assert.deepEqual(requests, []);
  assert.equal(world.telemetryStatus, 'MEASURED');
});

test('City activity presentation does not treat queued work as running', () => {
  const resolveActivity = context.window.FenixWorld3DEngine.prototype._resolveAgentActivity;
  assert.equal(typeof resolveActivity, 'function');
  assert.deepEqual({ ...resolveActivity({ status: 'QUEUED', currentTask: 'Analisar projeto' }) }, {
    key: 'queued', text: 'Na fila · Analisar projeto', icon: '◷', color: '#e8b45d',
  });
  assert.deepEqual({ ...resolveActivity({ status: 'WORKING', currentTask: 'Analisar projeto' }) }, {
    key: 'working', text: 'Analisar projeto', icon: '⚙️', color: '#27d7c4',
  });
});

test('City activity presentation distinguishes a real walking destination from task execution', () => {
  const resolveActivity = context.window.FenixWorld3DEngine.prototype._resolveAgentActivity;
  assert.deepEqual({ ...resolveActivity({ status: 'WORKING', movementState: 'WALKING', currentTask: 'Auditoria' }) }, {
    key: 'walking', text: 'A caminho · Auditoria', icon: '➜', color: '#38bdf8',
  });
});

test('stationary avatar work pose animates only for an executing task', () => {
  const applyPose = context.window.FenixWorld3DEngine.prototype._applyAgentActivityPose;
  assert.equal(typeof applyPose, 'function');
  const ud = { isSeated: false, armL: { rotation: { x: 0 } }, armR: { rotation: { x: 0 } }, forearmL: { rotation: { x: 0 } }, forearmR: { rotation: { x: 0 } } };
  const agent = { activity: { key: 'working' } };
  assert.equal(applyPose.call({}, agent, ud, 1, true), true);
  assert.notEqual(ud.armL.rotation.x, 0);
  assert.notEqual(ud.armR.rotation.x, 0);
  const availablePose = { activity: { key: 'available' } };
  const beforeAvailable = { x: ud.armL.rotation.x, y: ud.armR.rotation.x };
  assert.equal(applyPose.call({}, availablePose, ud, 1, true), false);
  const idlePose = { x: ud.armL.rotation.x, y: ud.armR.rotation.x };
  assert.notDeepEqual(idlePose, beforeAvailable, 'idle movement must remain a presentation pose, not a work pose');
  assert.ok(Math.abs(idlePose.x) < 0.04 && Math.abs(idlePose.y) < 0.04, 'idle gestures stay subtle');
  assert.equal(applyPose.call({}, { activity: { key: 'working' }, telemetryTarget: { x: 4, z: 4 } }, ud, 1, true), false);
});

test('City follows a measured target coordinate without resetting the route on repeated snapshots', async () => {
  const agent = { id: 'agent-walking', status: 'WORKING', movementState: 'WALKING', currentTask: 'Auditoria', coordinates: { x: 0, z: 0 }, targetCoordinates: { x: 12, y: 6 } };
  const { world } = createWorld(async () => response({ agents: [agent] }));
  const mesh = { position: { x: 0, y: 0.8, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } } };
  world.agents.set(agent.id, { ...agent, mesh, coordinates: { x: 0, y: 0.8, z: 0 }, telemetryCoordinates: { x: 0, y: 0.8, z: 0 }, path: null });

  await world.syncRealData();
  const firstTarget = { ...world.agents.get(agent.id).telemetryTarget };
  mesh.position.x = 2;
  await world.syncRealData();

  assert.deepEqual(firstTarget, { x: 12, y: 0.8, z: 6 });
  assert.deepEqual({ ...world.agents.get(agent.id).telemetryTarget }, firstTarget);
  assert.deepEqual({ ...world.agents.get(agent.id).activity }, { key: 'walking', text: 'A caminho · Auditoria', icon: '➜', color: '#38bdf8' });
});

test('City does not animate a target as walking unless runtime publishes movementState WALKING', async () => {
  const agent = { id: 'agent-station', status: 'WORKING', currentTask: 'Análise em estação', coordinates: { x: 0, z: 0 }, targetCoordinates: { x: 12, y: 6 } };
  const { world } = createWorld(async () => response({ agents: [agent] }));
  const mesh = { position: { x: 0, y: 0.8, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } } };
  world.agents.set(agent.id, { ...agent, mesh, coordinates: { x: 0, y: 0.8, z: 0 }, telemetryCoordinates: { x: 0, y: 0.8, z: 0 }, path: null, telemetryTarget: null });

  await world.syncRealData();

  const updated = world.agents.get(agent.id);
  assert.equal(updated.movementState, null);
  assert.equal(updated.telemetryTarget, null);
  assert.equal(updated.activity.key, 'working');
});

test('City local navigation is not exposed as canonical movement telemetry', () => {
  const navigateAgent = context.window.FenixWorld3DEngine.prototype.navigateAgent;
  context.THREE.Vector3 = class Vector3 { constructor(x, y, z) { Object.assign(this, { x, y, z }); } };
  const agent = { id: 'agent-local', mesh: { position: { x: 0, y: 0.8, z: 0 } }, thoughtBubble: { setText(text) { this.text = text; } } };
  const world = {
    agents: new Map([[agent.id, agent]]),
    pathGraph: { findPath: () => [{ x: 4, y: 0.8, z: 2 }] },
  };

  navigateAgent.call(world, agent.id, { x: 4, y: 0.8, z: 2 });

  assert.equal(agent.movementState, undefined);
  assert.equal(agent.localNavigationActive, true);
  assert.match(agent.thoughtBubble.text, /local/i);
});

test('City can follow the last measured path point when no explicit target is published', async () => {
  const agent = { id: 'agent-path', status: 'WORKING', movementState: 'WALKING', coordinates: { x: 0, z: 0 }, path: [{ x: 3, y: -2 }] };
  const { world } = createWorld(async () => response({ agents: [agent] }));
  const mesh = { position: { x: 0, y: 0.8, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } } };
  world.agents.set(agent.id, { ...agent, mesh, coordinates: { x: 0, y: 0.8, z: 0 }, telemetryCoordinates: { x: 0, y: 0.8, z: 0 } });

  await world.syncRealData();

  assert.deepEqual({ ...world.agents.get(agent.id).telemetryTarget }, { x: 3, y: 0.8, z: -2 });
});

test('City refuses incomplete target coordinates instead of inventing a walking destination', async () => {
  const agent = { id: 'agent-invalid-target', status: 'WORKING', targetCoordinates: { x: null, y: null } };
  const { world } = createWorld(async () => response({ agents: [agent] }));
  assert.equal(world._hasExplicitCoordinates(agent.targetCoordinates), false);
  assert.equal(world._hasExplicitCoordinates({ x: 0, y: 0 }), true, 'a real origin point remains valid');
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

test('a changed server location without a walking state supersedes a local route without inventing movement', async () => {
  const { world } = createWorld(async () => response({ agents: [{ id: 'agent-moving', coordinates: { x: 8, z: 6 } }] }));
  const mesh = { position: { x: 1, y: 0.8, z: 2, set(x, y, z) { Object.assign(this, { x, y, z }); } } };
  world.agents.set('agent-moving', {
    id: 'agent-moving', mesh, coordinates: { x: 0, y: 0.8, z: 0 },
    telemetryCoordinates: { x: 0, y: 0.8, z: 0 }, path: [{ x: 10, y: 0.8, z: 12 }], pathIndex: 0,
  });

  await world.syncRealData();

  const agent = world.agents.get('agent-moving');
  assert.equal(agent.path, null, 'server movement supersedes the old local route');
  assert.equal(agent.telemetryTarget, null, 'a changed position alone does not create a walking target');
  assert.deepEqual({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }, { x: 8, y: 0.8, z: 6 },
    'the mesh snaps to the measured position when runtime does not report walking');
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
