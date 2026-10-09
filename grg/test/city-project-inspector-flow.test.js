'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sceneModel = require('../public/fenix-city-machine-scene');

test('selecting a live City project opens its real project and linked job context', () => {
  class Engine {}
  const project = { id: 'project-real', name: 'Real project', status: 'ACTIVE', workspace: 'C:/workspace/project-real' };
  const jobs = [
    { id: 'job-real', projectId: project.id, title: 'Build API', status: 'RUNNING' },
    { id: 'job-other', projectId: 'other-project', title: 'Other project', status: 'FAILED' },
  ];
  const calls = [];
  const session = new Map();
  const target = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  const engine = Object.assign(Object.create(Engine.prototype), {
    state: { selected: null, level: 'world', history: [] },
    cameraState: { azimuth: 0.5, elevation: 0.6, distance: 100, targetDistance: 100, target: { ...target }, targetLookAt: { ...target } },
    lastCitySnapshot: { projects: [project], recentJobs: jobs },
    focusEntity() {},
    _updateCameraPosition() {},
  });
  const window = {
    FenixWorld3DEngine: Engine,
    FenixCityMachineScene: sceneModel,
    fenixWorld3D: engine,
    fenixShowWorldProjectInspector: (selected, linkedJobs) => calls.push({ selected, linkedJobs }),
    addEventListener() {},
    dispatchEvent() {},
  };
  const CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
  const source = fs.readFileSync(path.join(__dirname, '../public/fenix-city-runtime-world.js'), 'utf8');
  vm.runInNewContext(source, {
    window,
    THREE: {},
    document: { addEventListener() {} },
    sessionStorage: { getItem: (key) => session.get(key) || null, setItem: (key, value) => session.set(key, value) },
    CustomEvent,
  });

  engine.selectCityEntity('project', project.id, { focus: false });

  assert.deepEqual(calls.map(({ selected, linkedJobs }) => ({ selected, linkedJobs })), [{ selected: project, linkedJobs: [jobs[0]] }]);
  assert.deepEqual({ ...engine.state.selected }, { kind: 'project', id: project.id });
});

test('selecting a City agent opens its live inspector after camera selection', () => {
  class Engine {}
  const agent = { id: 'agent-real', name: 'Real agent', status: 'WORKING' };
  const inspected = [];
  const target = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  const engine = Object.assign(Object.create(Engine.prototype), {
    state: { selected: null, level: 'world', history: [] },
    cameraState: { azimuth: 0.5, elevation: 0.6, distance: 100, targetDistance: 100, target: { ...target }, targetLookAt: { ...target } },
    agents: new Map([[agent.id, agent]]),
    focusAgent() {},
    _updateCameraPosition() {},
  });
  const session = new Map();
  const window = {
    FenixWorld3DEngine: Engine,
    FenixCityMachineScene: sceneModel,
    fenixWorld3D: engine,
    fenixShowWorldAgentInspector: (selected) => inspected.push(selected),
    addEventListener() {},
    dispatchEvent() {},
  };
  const CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
  const source = fs.readFileSync(path.join(__dirname, '../public/fenix-city-runtime-world.js'), 'utf8');
  vm.runInNewContext(source, {
    window,
    THREE: {},
    document: { addEventListener() {} },
    sessionStorage: { getItem: (key) => session.get(key) || null, setItem: (key, value) => session.set(key, value) },
    CustomEvent,
  });

  engine.selectAgent(agent.id);

  assert.deepEqual(inspected, [agent]);
  assert.deepEqual({ ...engine.state.selected }, { kind: 'agent', id: agent.id });
});
