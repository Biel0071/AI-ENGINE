const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { livingCityState } = require('../src/api/living-city-routes');
const { projectMachineScene, projectSceneSites } = require('../public/fenix-city-machine-scene');

test('City projects host and recent worker heartbeats as measured nodes', async () => {
  const now = new Date().toISOString();
  const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const app = {
    controlPlane: { authorize: async () => {} },
    store: { read: async () => ({ agentProfiles: [], agents: [], cognitiveAgents: [], memories: [] }) },
    agentRegistry: { list: () => [] },
    jobs: { list: async () => [], workers: async () => [
      { workerId: 'fenix-local:1', status: 'ONLINE', currentJob: 'job-1', processed: 4, failed: 1, lastHeartbeat: now },
      { workerId: 'fenix-local:2', status: 'STALE', currentJob: null, processed: 2, failed: 0, lastHeartbeat: now },
      { workerId: 'fenix-local:old', status: 'STALE', currentJob: null, processed: 1, failed: 1, lastHeartbeat: old },
    ] },
    missions: { list: async () => [] }, projectKernel: { list: async () => [] },
  };
  const city = await livingCityState(app, 'tenant', 'actor');
  assert.equal(city.machines[0].kind, 'runtime');
  assert.ok(city.machines[0].memoryTotalBytes > 0);
  assert.deepEqual(city.machines.slice(1).map((machine) => machine.id), ['worker:fenix-local:1', 'worker:fenix-local:2']);
  assert.equal(city.machines[1].currentJob, 'job-1');
  assert.equal(city.machines[2].status, 'STALE');
  assert.equal(city.workers.length, 3);
});

test('scene nodes are a deterministic visual projection of measured runtime machines', () => {
  const machines = [
    { id: 'runtime:fenix-host', name: 'Nó Fênix', kind: 'runtime', status: 'ONLINE', memoryFreeBytes: 1024 },
    { id: 'worker:fenix-local:1', name: 'Worker fenix-local:1', kind: 'worker', status: 'ONLINE', currentJob: 'job-9' },
    { id: 'worker:fenix-local:2', name: 'Worker fenix-local:2', kind: 'worker', status: 'STALE', currentJob: null },
  ];

  const nodes = projectMachineScene(machines);
  assert.deepEqual(nodes.map((node) => node.id), machines.map((machine) => machine.id));
  assert.deepEqual(nodes.map((node) => node.status), machines.map((machine) => machine.status));
  assert.deepEqual(nodes.map((node) => node.currentJob), machines.map((machine) => machine.currentJob ?? null));
  assert.equal(new Set(nodes.map((node) => `${node.position.x}:${node.position.z}`)).size, nodes.length);
  assert.deepEqual(projectMachineScene([]), []);
});

test('project sites are stable and unique for every registered project', () => {
  const projects = Array.from({ length: 35 }, (_, index) => ({
    id: `project-${index}`,
    name: `Projeto ${index}`,
    status: index === 0 ? 'RUNNING' : 'IDLE',
    workspace: `workspace-${index}`,
  }));
  const first = projectSceneSites(projects);
  const second = projectSceneSites(projects);
  assert.equal(first.length, projects.length);
  assert.deepEqual(first, second);
  assert.equal(first[0].id, 'project-0');
  assert.equal(new Set(first.map((site) => `${site.position.x}:${site.position.z}`)).size, first.length);
  assert.ok(first.every((site) => Math.abs(site.position.x) <= 87.5 && Math.abs(site.position.z) <= 77.5));
  assert.deepEqual(projectSceneSites([]), []);
});

test('project activity reflects only jobs linked to that project', () => {
  const sites = projectSceneSites(
    [{ id: 'project-a', status: 'IDLE' }, { id: 'project-b', status: 'IDLE' }],
    [{ id: 'job-running', projectId: 'project-a', status: 'RUNNING' }, { id: 'job-failed', projectId: 'project-b', status: 'FAILED' }],
  );
  assert.equal(sites[0].status, 'IDLE');
  assert.equal(sites[0].activityStatus, 'RUNNING');
  assert.equal(sites[0].runningJobs, 1);
  assert.equal(sites[1].activityStatus, 'FAILED');
  assert.equal(sites[1].failedJobs, 1);
});

test('city selection returns to its prior selection and camera', () => {
  class Engine {}
  Engine.prototype._handleCanvasClick = function handleCanvasClick() {};
  Engine.prototype._saveState = function saveState() {};
  const vector = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } });
  const engine = Object.create(Engine.prototype);
  engine.state = { selected: null, level: 'world', history: [] };
  engine.cameraState = { azimuth: 0.4, elevation: 0.6, distance: 80, targetDistance: 80, target: vector(), targetLookAt: vector() };
  engine.cameraMode = 'orbit';
  engine._updateCameraPosition = () => {};
  engine.focusEntity = (position) => engine.cameraState.targetLookAt.set(position.x, position.y, position.z);
  const session = new Map();
  const events = [];
  class TestCustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  const window = {
    FenixWorld3DEngine: Engine,
    FenixCityMachineScene: require('../public/fenix-city-machine-scene'),
    fenixWorld3D: engine,
    addEventListener() {},
    dispatchEvent(event) { events.push(event); },
  };
  const source = fs.readFileSync(path.join(__dirname, '../public/fenix-city-runtime-world.js'), 'utf8');
  vm.runInNewContext(source, {
    window,
    THREE: {},
    document: { addEventListener() {} },
    sessionStorage: { getItem: (key) => session.get(key) || null, setItem: (key, value) => session.set(key, value) },
    CustomEvent: TestCustomEvent,
  });

  engine.selectCityEntity('agent', 'agent-1', { focus: () => engine.focusEntity({ x: 5, y: 1, z: -2 }) });
  assert.deepEqual({ ...engine.state.selected }, { kind: 'agent', id: 'agent-1' });
  assert.equal(engine.cameraState.targetLookAt.x, 5);
  assert.equal(events.at(-1).type, 'fenix:world-selection');
  engine.back();
  assert.equal(engine.state.selected, null);
  assert.equal(engine.state.level, 'world');
  assert.equal(engine.cameraState.targetLookAt.x, 0);
  assert.equal(engine.cameraState.targetLookAt.z, 0);
});
