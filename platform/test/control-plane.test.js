const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { ControlPlaneService } = require('../src/services/control-plane');
const { JsonStore } = require('../src/store/json-store');

const root = path.resolve(__dirname, '..');

async function createService(t) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-engine-control-plane-'));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const store = new JsonStore({
    filePath: path.join(tempRoot, 'state.json'),
    seedPath: path.join(root, 'data', 'seed.json'),
  });
  return new ControlPlaneService(store);
}

test('seed registers the ten GitHub repositories under one tenant', async (t) => {
  const service = await createService(t);
  const projects = await service.listProjects('biel0071-software-house');
  assert.equal(projects.length, 10);
  assert.equal(projects.filter((project) => project.repository.visibility === 'private').length, 5);
  assert.ok(projects.some((project) => project.repository.name === 'AI-ENGINE'));
});

test('tenants cannot read projects from another tenant', async (t) => {
  const service = await createService(t);
  await assert.rejects(() => service.listProjects('another-tenant'), /Tenant not found/);
});

test('analysis requests are queued and reflected in overview', async (t) => {
  const service = await createService(t);
  const run = await service.requestAnalysis('biel0071-software-house', 'ai-engine', { mode: 'deep' });
  const overview = await service.getOverview('biel0071-software-house');
  assert.equal(run.status, 'queued');
  assert.equal(run.mode, 'deep');
  assert.equal(overview.metrics.analysesQueued, 1);
});

test('catalog graph only contains evidence-backed relationships', async (t) => {
  const service = await createService(t);
  const graph = await service.getGraph('biel0071-software-house');
  assert.ok(graph.nodes.length > 10);
  assert.ok(graph.edges.every((edge) => ['catalog', 'catalog-tag'].includes(edge.evidence)));
  assert.equal(graph.edges.filter((edge) => edge.type === 'OWNS').length, 10);
});

test('deployment stays blocked until a provider is configured', async (t) => {
  const service = await createService(t);
  const deployment = await service.requestDeployment('biel0071-software-house', 'zapai-final');
  assert.equal(deployment.status, 'configuration-required');
  assert.equal(deployment.provider, null);
});
