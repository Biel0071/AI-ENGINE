'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { RealityCompiler, persistBlueprintToGraphBrain } = require('../src/world-model/reality-compiler');
const { WorldStateEngine } = require('../src/world-model/world-state-engine');
const { GraphBrain } = require('../src/brain/graph-brain');
const { executeRealityIntent, handleLivingCityRoutes } = require('../src/api/living-city-routes');

function tempStateFile(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-reality-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return path.join(directory, 'world-state.json');
}

test('RealityCompiler turns a real project intent into an ontology-backed world blueprint', () => {
  const compiler = new RealityCompiler();
  const project = {
    id: 'fenix-os',
    name: 'FÊNIX OS',
    description: 'Autonomous Engineering OS',
  };

  const result = compiler.compile('Crie uma empresa de software para este projeto', {
    tenantId: 'grg',
    project,
  });

  assert.equal(result.recognized, true);
  assert.equal(result.blueprint.projectId, project.id);
  assert.equal(result.blueprint.tenantId, 'grg');
  assert.ok(result.blueprint.schemaVersion);
  assert.ok(result.blueprint.entities.some(entity => entity.type === 'ORGANIZATION'));
  assert.ok(result.blueprint.entities.some(entity => entity.type === 'BUILDING'));
  assert.ok(result.blueprint.relationships.some(edge => edge.type === 'CONTAINS'));
  assert.ok(result.blueprint.relationships.some(edge => edge.type === 'SERVES' && edge.to === `project:${project.id}`));
  assert.ok(result.blueprint.constructionPlan.steps.length > 0);
  assert.deepEqual(
    compiler.compile('Crie uma empresa de software para este projeto', { tenantId: 'grg', project }).blueprint,
    result.blueprint,
    'the same intent and project must compile deterministically'
  );
});

test('RealityCompiler declines unsupported prompts instead of fabricating a world', () => {
  const compiler = new RealityCompiler();
  assert.equal(compiler.compile('Explique os indicadores do sistema', { project: { id: 'fenix-os', name: 'FÊNIX OS' } }).recognized, false);
});

test('WorldStateEngine materializes idempotently and restores the blueprint and entities', (t) => {
  const stateFilePath = tempStateFile(t);
  const engine = new WorldStateEngine({ stateFilePath });
  clearTimeout(engine._persistTimeout);
  engine._persistTimeout = null;
  const compiler = new RealityCompiler();
  const blueprint = compiler.compile('Crie uma empresa de software para este projeto', {
    tenantId: 'grg', project: { id: 'fenix-os', name: 'FÊNIX OS' }
  }).blueprint;

  const first = engine.commitWorldBlueprint(blueprint);
  const second = engine.commitWorldBlueprint(blueprint);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(engine.getSnapshot().counts.worldBlueprints, 1);
  assert.equal(engine.getSnapshot().counts.buildings, Object.keys(engine.buildings).length);

  const restored = new WorldStateEngine({ stateFilePath });
  assert.equal(restored.worldBlueprints[blueprint.id].projectId, 'fenix-os');
  assert.equal(restored.companies['org-fenix-os-software'].projectId, 'fenix-os');
  assert.equal(restored.buildings['bld-fenix-os-workspace'].companyId, 'org-fenix-os-software');
  clearTimeout(restored._persistTimeout);
});

test('Graph Brain stores ontology nodes and project relationships without duplicate edges', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-reality-graph-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const graphBrain = new GraphBrain({ storagePath: path.join(directory, 'graph.json') });
  const project = { id: 'fenix-graph-proof', name: 'Fênix Graph Proof' };
  const blueprint = new RealityCompiler().compile('Crie uma empresa de software para este projeto', {
    tenantId: 'grg', project
  }).blueprint;

  const first = persistBlueprintToGraphBrain(blueprint, graphBrain);
  const edgesAfterFirst = graphBrain.edges.length;
  const second = persistBlueprintToGraphBrain(blueprint, graphBrain);
  assert.ok(first.nodes.includes(blueprint.worldId));
  assert.equal(graphBrain.nodes.get(`project:${project.id}`)?.type, 'PROJECT');
  assert.equal(graphBrain.nodes.get(`project:${project.id}`)?.properties.name, project.name);
  assert.equal(second.relationships, blueprint.relationships.length);
  assert.equal(graphBrain.edges.length, edgesAfterFirst);
  assert.ok(graphBrain.edges.some(edge => edge.type === 'SERVES' && edge.to === `project:${project.id}`));
  const reloaded = new GraphBrain({ storagePath: path.join(directory, 'graph.json') });
  assert.ok(reloaded.nodes.has(`project:${project.id}`));
  assert.ok(reloaded.nodes.has(`organization:${blueprint.entities.find(entity => entity.type === 'ORGANIZATION').id}`));
});

test('canonical route service resolves a registered project before materializing its company', async (t) => {
  const stateFilePath = tempStateFile(t);
  const worldEngine = new WorldStateEngine({ stateFilePath });
  clearTimeout(worldEngine._persistTimeout);
  worldEngine._persistTimeout = null;
  const graphBrain = new GraphBrain({ storagePath: path.join(path.dirname(stateFilePath), 'graph.json') });
  const project = { id: 'fenix-os', name: 'FÊNIX OS' };
  const result = await executeRealityIntent({
    intent: 'Crie uma empresa de software para este projeto',
    projectId: 'fenix-os', tenantId: 'grg', actorId: 'operator', worldEngine, graphBrain,
    projectResolver: id => id === project.id ? project : null
  });
  assert.equal(result.materialization.created, true);
  assert.equal(result.materialization.organization.projectId, project.id);
  assert.ok(result.materialization.event.id.startsWith('mutation:'));
  await assert.rejects(executeRealityIntent({
    intent: 'Crie uma empresa de software para este projeto',
    projectId: 'missing', tenantId: 'grg', worldEngine, graphBrain,
    projectResolver: () => null
  }), /Projeto não encontrado/);
  clearTimeout(worldEngine._persistTimeout);
});

test('living-city command endpoint authorizes and materializes the real selected project', async (t) => {
  const stateFilePath = tempStateFile(t);
  const worldEngine = new WorldStateEngine({ stateFilePath });
  clearTimeout(worldEngine._persistTimeout);
  worldEngine._persistTimeout = null;
  const graphBrain = new GraphBrain({ storagePath: path.join(path.dirname(stateFilePath), 'route-graph.json') });
  const permissions = [];
  const app = { controlPlane: { authorize: async (...args) => permissions.push(args) } };
  const requestBody = {
    prompt: 'Crie uma empresa de software para este projeto',
    projectId: 'fenix-os'
  };
  let responseData;
  let statusCode;
  const response = { writeHead: code => { statusCode = code; }, end: body => { responseData = JSON.parse(body); } };
  const handled = await handleLivingCityRoutes(
    { method: 'POST' }, response,
    new URL('http://localhost/api/v2/living-city/command'), app,
    (res, code, payload) => { res.writeHead(code); res.end(JSON.stringify(payload)); },
    async () => requestBody,
    { tenantId: 'grg', actorId: 'grg-admin' },
    { worldEngine, graphBrain, simulationEngine: { isRunning: true } }
  );

  assert.equal(handled, true);
  assert.equal(statusCode, 200);
  assert.equal(responseData.source, 'RealityCompiler/WorldStateEngine/GraphBrain');
  assert.equal(responseData.materialization.organization.projectId, 'fenix-os');
  assert.equal(permissions[0][2], 'runtime:write');
  assert.ok(worldEngine.buildings[responseData.materialization.building.id]);
  clearTimeout(worldEngine._persistTimeout);
});
