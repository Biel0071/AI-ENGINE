'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ProjectKernel } = require('../src/projects/project-kernel');
const { GraphBrain } = require('../src/brain/graph-brain');
const { SystemTwinEngine } = require('../src/reconstruction/system-twin');

test('Project Kernel persists and retrieves a source-backed project perception artifact', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-kernel-map-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'main'], { cwd: workspace, stdio: 'ignore' });
  await fs.mkdir(path.join(workspace, 'src'));
  await fs.writeFile(path.join(workspace, 'package.json'), JSON.stringify({ dependencies: { express: '^5.0.0' } }));
  await fs.writeFile(path.join(workspace, 'src', 'app.js'), "const app = require('express')();\napp.get('/api/health', () => 'ok');\n");
  await fs.writeFile(path.join(workspace, '.env'), 'TOKEN=must-not-leak');
  execFileSync('git', ['add', 'package.json', 'src/app.js'], { cwd: workspace, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.email=fenix@test.invalid', '-c', 'user.name=Fenix Test', 'commit', '-m', 'fixture'], { cwd: workspace, stdio: 'ignore' });

  const state = { projects: [], projectKernelStates: [], artifacts: [], runtimeJobs: [], missions: [] };
  const store = { read: async () => structuredClone(state), update: async (mutate) => { await mutate(state); return structuredClone(state); } };
  const kernel = new ProjectKernel({ store, controlPlane: { authorize: async () => true }, events: null });
  await kernel.create('tenant', 'actor', { id: 'source-map', name: 'Source map fixture', workspace });

  const result = await kernel.analyze('tenant', 'actor', 'source-map');
  const persisted = await kernel.analysis('tenant', 'actor', 'source-map');

  assert.equal(result.perception.status, 'PARTIAL_OBSERVATION');
  assert.equal(result.perception.routes, 1);
  assert.equal(result.perception.tests, 0);
  assert.equal(persisted.artifact.type, 'FENIX_PROJECT_PERCEPTION_MAP');
  assert.ok(persisted.report.systemMap.nodes.some((node) => node.label === 'GET /api/health'));
  assert.equal(JSON.stringify(persisted).includes('must-not-leak'), false);
  assert.equal(JSON.stringify(persisted).includes(workspace), false);
});

test('project perception links to a persistent System Twin and idempotent Graph Brain evidence nodes', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-kernel-twin-'));
  const stateDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-kernel-twin-state-'));
  t.after(() => Promise.all([fs.rm(workspace, { recursive: true, force: true }), fs.rm(stateDirectory, { recursive: true, force: true })]));
  execFileSync('git', ['init', '-b', 'main'], { cwd: workspace, stdio: 'ignore' });
  await fs.mkdir(path.join(workspace, 'src', 'components'), { recursive: true });
  await fs.writeFile(path.join(workspace, 'package.json'), JSON.stringify({ dependencies: { express: '^5.0.0', react: '^18.0.0' } }));
  await fs.writeFile(path.join(workspace, 'src', 'app.js'), "const app = require('express')();\napp.get('/api/health', () => 'ok');\n");
  await fs.writeFile(path.join(workspace, 'src', 'components', 'Dashboard.jsx'), 'export default function Dashboard() { return null; }\n');
  execFileSync('git', ['add', 'package.json', 'src'], { cwd: workspace, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.email=fenix@test.invalid', '-c', 'user.name=Fenix Test', 'commit', '-m', 'fixture'], { cwd: workspace, stdio: 'ignore' });

  const state = { projects: [], projectKernelStates: [], artifacts: [], runtimeJobs: [], missions: [] };
  const store = { read: async () => structuredClone(state), update: async (mutate) => { await mutate(state); return structuredClone(state); } };
  const graphBrain = new GraphBrain({ storagePath: path.join(stateDirectory, 'graph.json') });
  const systemTwinEngine = new SystemTwinEngine({ storageDir: path.join(stateDirectory, 'twins'), graphBrain });
  const kernel = new ProjectKernel({ store, controlPlane: { authorize: async () => true }, events: null, systemTwinEngine, graphBrain });
  await kernel.create('tenant-a', 'actor', { id: 'project-a', name: 'Project A', repository: 'https://example.invalid/project-a', workspace });

  const result = await kernel.analyze('tenant-a', 'actor', 'project-a');
  const rootNodeId = 'project:tenant-a:project-a';
  const twinId = 'twin_tenant-a_project-a';
  const apiNode = [...graphBrain.nodes.values()].find((node) => node.type === 'API' && node.properties.endpoint === '/api/health');
  const componentNode = [...graphBrain.nodes.values()].find((node) => node.type === 'COMPONENT' && node.properties.name === 'Dashboard');
  const dependencyNode = [...graphBrain.nodes.values()].find((node) => node.type === 'DEPENDENCY' && node.properties.name === 'react');
  const edgesAfterFirstScan = graphBrain.edges.length;

  assert.equal(result.integration.systemTwin.id, twinId);
  assert.equal(systemTwinEngine.getTwin(twinId).perception.counts.routes, 1);
  assert.ok(graphBrain.nodes.has(rootNodeId));
  assert.ok(apiNode);
  assert.ok(componentNode);
  assert.ok(dependencyNode);
  assert.ok(graphBrain.edges.some((edge) => edge.from === rootNodeId && edge.type === 'USES_API' && edge.to === apiNode.id));
  assert.ok(graphBrain.edges.some((edge) => edge.from === rootNodeId && edge.type === 'HAS_COMPONENT' && edge.to === componentNode.id));

  await kernel.analyze('tenant-a', 'actor', 'project-a');
  assert.equal(graphBrain.edges.length, edgesAfterFirstScan, 'a repeated scan must not duplicate graph edges');
  const persisted = await kernel.analysis('tenant-a', 'actor', 'project-a');
  assert.equal(persisted.systemTwin.id, twinId);
  const reloadedGraph = new GraphBrain({ storagePath: path.join(stateDirectory, 'graph.json') });
  const reloadedTwinEngine = new SystemTwinEngine({ storageDir: path.join(stateDirectory, 'twins'), graphBrain: reloadedGraph });
  assert.ok(reloadedGraph.nodes.has(rootNodeId), 'Graph Brain evidence must survive reload');
  assert.equal(reloadedTwinEngine.getTwin(twinId).perception.counts.routes, 1, 'System Twin evidence must survive reload');
});
