const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { AccessControlledControlPlane } = require('../src/services/control-plane-v2');
const { JsonStore } = require('../src/store/json-store');

const root = path.resolve(__dirname, '..');

async function createService(t) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-engine-control-plane-v2-'));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const store = new JsonStore({
    filePath: path.join(tempRoot, 'state.json'),
    seedPath: path.join(root, 'data', 'seed.json'),
  });
  const service = new AccessControlledControlPlane(store);
  await service.initialize();
  return service;
}

test('migrates the MVP state and creates the master admin membership', async (t) => {
  const service = await createService(t);
  const membership = await service.getMembership('biel0071-software-house', 'biel0071');
  assert.equal(membership.role, 'master_admin');
  assert.equal((await service.listProjectsFor('biel0071-software-house', 'biel0071')).length, 10);
});

test('master admin can create subadmin and employee memberships', async (t) => {
  const service = await createService(t);
  const subadmin = await service.addMember('biel0071-software-house', 'biel0071', {
    userId: 'store-manager', name: 'Gerente da loja', role: 'subadmin',
  });
  const employee = await service.addMember('biel0071-software-house', 'biel0071', {
    userId: 'store-employee', name: 'Funcionário', role: 'employee',
  });
  assert.equal(subadmin.role, 'subadmin');
  assert.equal(employee.role, 'employee');
});

test('employee can read projects but cannot deploy or write memory', async (t) => {
  const service = await createService(t);
  await service.addMember('biel0071-software-house', 'biel0071', { userId: 'employee', role: 'employee' });
  assert.equal((await service.listProjectsFor('biel0071-software-house', 'employee')).length, 10);
  await assert.rejects(
    () => service.requestDeploymentFor('biel0071-software-house', 'employee', 'zapai-final'),
    /cannot perform project:deploy/,
  );
  await assert.rejects(
    () => service.remember('biel0071-software-house', 'employee', 'zapai-final', { summary: 'x', evidence: ['x'] }),
    /cannot perform memory:write/,
  );
});

test('analysis creates an evidence-backed progressive memory event and graph edge', async (t) => {
  const service = await createService(t);
  await service.requestAnalysisFor('biel0071-software-house', 'biel0071', 'ai-engine', { mode: 'deep' });
  const memory = await service.getProgressiveMemory('biel0071-software-house', 'biel0071', 'ai-engine');
  const graph = await service.getGraphFor('biel0071-software-house', 'biel0071');
  assert.equal(memory.length, 1);
  assert.equal(memory[0].confidence, 1);
  assert.match(memory[0].evidence[0], /^run:/);
  assert.equal(graph.edges.filter((edge) => edge.type === 'LEARNED').length, 1);
});

test('subadmin can analyze and learn but cannot publish', async (t) => {
  const service = await createService(t);
  await service.addMember('biel0071-software-house', 'biel0071', { userId: 'subadmin', role: 'subadmin' });
  const run = await service.requestAnalysisFor('biel0071-software-house', 'subadmin', 'zapai-crm');
  assert.equal(run.requestedBy, 'subadmin');
  await assert.rejects(
    () => service.requestDeploymentFor('biel0071-software-house', 'subadmin', 'zapai-crm'),
    /cannot perform project:deploy/,
  );
});
