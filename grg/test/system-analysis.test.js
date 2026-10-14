'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { MemoryStore, FileStore } = require('../src/kernel/store');
const { JobEngine } = require('../src/runtime/job-engine');
const { SystemAnalysisService } = require('../src/analysis/system-analysis');
const { redact, inspect } = require('../src/analysis/evidence');
const { zip, exportReport } = require('../src/analysis/export');
const { migrateState, CURRENT_SCHEMA_VERSION } = require('../src/kernel/state-migrations');
const { AuthService } = require('../src/auth/auth');
const { MemoryEngine } = require('../src/memory/memory-engine');
const { MemoryGateway, FenixEngineProvider } = require('../src/memory/memory-fabric');
const { GraphBrain } = require('../src/brain/graph-brain');

async function fixture(t, overrides = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-analysis-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'public')); await fs.writeFile(path.join(root, 'public/index.html'), '<main id="view-command"></main>');
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '1.0.0' }));
  const { storeFactory, ...serviceOverrides } = overrides;
  const store = storeFactory ? storeFactory(root) : new MemoryStore();
  await store.update(s => { s.projects.push({ id: 'p1', tenantId: 'a', name: 'Fixture', localPath: root }, { id: 'foreign', tenantId: 'b', name: 'Private project' }); return s; });
  const cp = { authorize: async (tenant, actor) => { if (actor !== 'admin') throw new Error('forbidden'); }, getMembership: async () => ({ role: 'admin' }) };
  const jobs = new JobEngine({ store, controlPlane: cp }); jobs.queue = { enqueue: async () => {} };
  const bus = { emit: async () => {} };
  const memoryEngine = new MemoryEngine({ store, bus, controlPlane: cp });
  const memory = new MemoryGateway([new FenixEngineProvider(memoryEngine)]);
  const graphBrain = new GraphBrain({ storagePath: path.join(root, 'graph-brain.json') });
  const app = { store, controlPlane: cp, jobs, memory, graphBrain, bus, fileSystemService: { workspaceRoot: root }, health: { check: async () => ({ ok: true }) }, aiGateway: { candidates: () => [{ provider: 'echo', model: 'echo' }] } };
  const service = new SystemAnalysisService({ app, root, directory: path.join(root, 'output'), baseURL: 'http://localhost:4400', inspector: async () => ({ modules: [{ file: 'src/server.js' }], revision: 'abc', relationships: [{ from: 'src/server.js', to: '/api/health' }], apis: [{ method: 'GET', path: '/api/health' }], mirror: { tech: {} } }), capturer: async () => ({ status: 'capturado', images: [], discovered: [], capturedAt: new Date().toISOString() }), ...serviceOverrides });
  const execute = async run => { await jobs.run('a', run.jobId, 'test-worker'); return service.get('a', 'admin', run.id); };
  return { root, store, app, service, execute };
}
test('general run persists real coverage and portable artifacts when AI is unavailable', async t => {
  const f = await fixture(t); const run = await f.service.create('a', 'admin', { formats: ['md', 'zip', 'html'] });
  const done = await f.execute(run); assert.equal(done.status, 'PARTIAL'); assert.equal(done.synthesisStatus, 'pending');
  for (const name of ['relatorio.md', 'analise.zip', 'relatorio.html', 'contexto-ia.md', 'contexto-ia.json']) assert.ok(done.artifacts.some(a => a.name === name), name);
  const artifact = await f.service.artifact('a', 'admin', run.id, 'contexto-ia.json');
  assert.ok(!artifact.data.includes('Private project')); assert.equal(JSON.parse(artifact.data).mode, 'general');
  await assert.rejects(() => f.service.artifact('b', 'admin', run.id, 'contexto-ia.json'), /não encontrada/);
  await assert.rejects(() => f.service.artifact('a', 'admin', run.id, '../checkpoint.json'), /não encontrado/);
});
test('one active run per tenant is enforced transactionally and invalid options fail', async t => {
  const f = await fixture(t);
  const results = await Promise.allSettled([f.service.create('a', 'admin'), f.service.create('a', 'admin')]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  await assert.rejects(() => f.service.create('b', 'admin', { mode: 'general', tests: true }), /profunda/);
  await assert.rejects(() => f.service.create('b', 'viewer'), /forbidden/);
});
test('deep analysis is scoped to the selected tenant project', async t => {
  const f = await fixture(t);
  await f.store.update(s => { s.projects.push({ id: 'p2', tenantId: 'a', name: 'Second fixture', localPath: f.root }); return s; });
  const run = await f.service.create('a', 'admin', { mode: 'deep', projectId: 'p1' });
  assert.equal(run.projectId, 'p1');
  const queuedJob = (await f.store.read()).runtimeJobs.find(job => job.id === run.jobId);
  assert.equal(queuedJob.projectId, 'p1');
  assert.equal(queuedJob.payload.analysisId, run.id);
  await f.execute(run);
  const evidence = await f.service.load(run);
  assert.deepEqual(evidence.projectInventory.map(project => project.id), ['fenix', 'p1']);
  await assert.rejects(() => f.service.create('a', 'admin', { mode: 'deep', projectId: 'foreign' }), /tenant|projeto/i);
});
test('analysis persists scoped verification memory and graph evidence idempotently across reloads', async t => {
  const f = await fixture(t, { storeFactory: root => new FileStore(path.join(root, 'state.json')) });
  const run = await f.service.create('a', 'admin', { mode: 'deep', projectId: 'p1' });
  const done = await f.execute(run);
  assert.equal(done.verificationStatus, 'NOT_VERIFIED');
  assert.equal(done.evidence.verification.status, 'NOT_VERIFIED');
  assert.ok(done.knowledgeMemoryId);

  const stableKey = `system-analysis:${run.id}`;
  const memories = (await f.store.read()).memories.filter(item => item.stableKey === stableKey);
  assert.equal(memories.length, 1);
  assert.equal(memories[0].tenantId, 'a');
  assert.equal(memories[0].projectId, 'p1');
  assert.match(memories[0].content, /NOT_VERIFIED/);
  assert.match(memories[0].content, /Módulos observados[\s\S]*src\/server\.js/);
  assert.match(memories[0].content, /APIs observadas[\s\S]*GET \/api\/health/);
  assert.match(memories[0].content, /Revisões observadas[\s\S]*revisão abc/);
  assert.doesNotMatch(memories[0].content, /images\/|data:image|fixture-secret/);
  const reloadedState = await new FileStore(path.join(f.root, 'state.json')).read();
  assert.equal(reloadedState.memories.filter(item => item.stableKey === stableKey).length, 1);
  const context = JSON.parse((await f.service.artifact('a', 'admin', run.id, 'contexto-ia.json')).data);
  assert.equal(context.verification.status, 'NOT_VERIFIED');

  const tenantKey = crypto.createHash('sha256').update('a').digest('hex').slice(0, 24);
  const projectKey = crypto.createHash('sha256').update('p1').digest('hex').slice(0, 24);
  const analysisNodeId = `analysis:${tenantKey}:${run.id}`;
  const projectNodeId = `project:${tenantKey}:${projectKey}`;
  const analysisNode = f.app.graphBrain.nodes.get(analysisNodeId);
  assert.equal(analysisNode.properties.tenantId, 'a');
  assert.equal(analysisNode.properties.projectId, 'p1');
  assert.equal(analysisNode.properties.verificationStatus, 'NOT_VERIFIED');
  assert.ok(analysisNode.properties.map.apis > 0);
  assert.equal(analysisNode.properties.revision, 'abc');
  assert.equal(f.app.graphBrain.edges.filter(edge => edge.from === projectNodeId && edge.type === 'PRODUCES' && edge.to === analysisNodeId).length, 1);

  const graphPath = path.join(f.root, 'graph-brain.json');
  const restoredGraph = new GraphBrain({ storagePath: graphPath });
  assert.equal(restoredGraph.nodes.get(analysisNodeId).properties.verificationStatus, 'NOT_VERIFIED');

  await f.service.retry('a', 'admin', run.id);
  const retried = await f.execute(await f.service.get('a', 'admin', run.id));
  assert.equal(retried.status, 'PARTIAL');
  assert.equal((await f.store.read()).memories.filter(item => item.stableKey === stableKey).length, 1);
  assert.equal(f.app.graphBrain.edges.filter(edge => edge.from === projectNodeId && edge.type === 'PRODUCES' && edge.to === analysisNodeId).length, 1);
});
test('analysis verification never passes when a suite fails or is missing', async t => {
  for (const scenario of [
    { name: 'all configured suites pass', suiteStatus: 'aprovado', expected: 'PASS' },
    { name: 'a suite reports failure', suiteStatus: 'reprovado', expected: 'FAIL' },
    { name: 'a suite was not executed', suiteStatus: 'não executado', expected: 'BLOCKED' }
  ]) {
    const f = await fixture(t, { testRunner: async () => ({ status: scenario.suiteStatus }) });
    const run = await f.service.create('a', 'admin', { mode: 'deep', projectId: 'p1', tests: true });
    const done = await f.execute(run);
    assert.equal(done.verificationStatus, scenario.expected, `${scenario.name}: ${JSON.stringify({ tests: done.evidence.tests, targets: done.evidence.targets.map(target => target.status), projects: done.evidence.projects.map(project => project.status) })}`);
  }
});
test('analysis detail exposes persisted visual and runtime evidence for the native UI', async t => {
  const capturedAt = new Date().toISOString();
  const f = await fixture(t, { capturer: async () => ({ status: 'capturado', images: ['images/command.png'], discovered: [{ selector: '#projects', label: 'Projetos' }], structure: { title: 'Fênix', elementCount: 3, truncated: false, landmarks: [{ tag: 'main', name: 'Projetos' }], elements: [{ tag: 'button', id: 'projects', name: 'Projetos' }] }, networkRequests: [{ method: 'GET', path: '/api/projects', status: 200, resourceType: 'fetch' }], consoleErrors: ['Falha controlada'], capturedAt, url: 'http://localhost:4400/app#command' }) });
  const run = await f.service.create('a', 'admin', { mode: 'general' });
  await f.execute(run);

  const detail = await f.service.get('a', 'admin', run.id);

  assert.equal(detail.evidence.coverage.captured, 2);
  assert.equal(detail.evidence.targets[0].status, 'capturado');
  assert.equal(detail.evidence.targets[0].images[0], 'images/command.png');
  assert.equal(detail.evidence.targets[0].observedActions[0].label, 'Projetos');
  assert.equal(detail.evidence.targets[0].structure.elements[0].name, 'Projetos');
  assert.equal(detail.evidence.targets[0].networkRequests[0].path, '/api/projects');
  assert.equal(detail.evidence.targets[0].consoleErrors[0], 'Falha controlada');
  assert.ok(!JSON.stringify(detail).includes('Private project'));
});
test('captured screenshots are readable from the persisted checkpoint while the job is active', async t => {
  const f = await fixture(t);
  const run = await f.service.create('a', 'admin', { mode: 'general' });
  const imageName = 'images/command.png';
  const imagePath = path.join(f.service.dir(run), imageName);
  await fs.mkdir(path.dirname(imagePath), { recursive: true });
  await fs.writeFile(imagePath, Buffer.from([137, 80, 78, 71]));
  await f.service.save(run, { targets: [{ id: 'capture-1', images: [imageName] }] });

  const artifact = await f.service.artifact('a', 'admin', run.id, imageName);

  assert.equal(artifact.type, 'image/png');
  assert.deepEqual(artifact.data, Buffer.from([137, 80, 78, 71]));
  await assert.rejects(() => f.service.artifact('a', 'admin', run.id, 'images/not-in-evidence.png'), /não encontrado/);
});
test('deep inspection executes configured test adapter and records missing isolation explicitly', async t => {
  const f = await fixture(t); const run = await f.service.create('a', 'admin', { mode: 'deep', tests: true });
  await f.execute(run); const evidence = await f.service.load(run);
  assert.equal(evidence.projects.length, 2); assert.equal(evidence.tests.length, 2); assert.ok(evidence.tests.every(t => t.status === 'não executado'));
  assert.ok(!evidence.projectInventory.some(p => p.id === 'foreign'));
});
test('cancellation exports partial evidence; resume preserves successful captures', async t => {
  let captures = 0; const f = await fixture(t, { capturer: async () => { captures++; return { status: 'capturado', images: [], discovered: [] }; } });
  const run = await f.service.create('a', 'admin'); await f.service.cancel('a', 'admin', run.id); const cancelled = await f.execute(run);
  assert.equal(cancelled.status, 'CANCELLED'); assert.equal(captures, 0); assert.ok(cancelled.artifacts.length);
  const resumed = await f.service.retry('a', 'admin', run.id); await f.execute(resumed); assert.equal(captures, 1);
  const repeated = await f.service.retry('a', 'admin', run.id); await f.execute(repeated); assert.equal(captures, 1);
});
test('failed capture is reported, later retry only repeats failed states', async t => {
  let fail = true; const f = await fixture(t, { capturer: async () => { if (fail) throw new Error('UI unavailable'); return { status: 'capturado', discovered: [], images: [] }; } });
  const run = await f.service.create('a', 'admin'); await f.execute(run); assert.equal((await f.service.load(run)).coverage.errors, 1);
  fail = false; await f.execute(await f.service.retry('a', 'admin', run.id)); assert.equal((await f.service.load(run)).coverage.errors, 0);
});
test('AI synthesis is marked inferred and resumes saved parts without another call', async t => {
  const f = await fixture(t); let calls = 0;
  f.app.aiGateway = { candidates: () => [{ provider: 'configured', model: 'test' }], invoke: async () => { calls++; return { provider: 'configured', text: 'Inferido: arquitetura em módulos. Evidência: src/server.js' }; } };
  const run = await f.service.create('a', 'admin'); await f.execute(run); assert.equal((await f.service.load(run)).synthesis.classification, 'inferido');
  await f.execute(await f.service.retry('a', 'admin', run.id)); assert.equal(calls, 1);
});
test('source inventory excludes credentials and reports real modules', async t => {
  const f = await fixture(t); await fs.writeFile(path.join(f.root, '.env'), 'SECRET=dont-export-me');
  await fs.writeFile(path.join(f.root, 'index.js'), "const fs = require('node:fs'); const route='/api/test';");
  const evidence = await inspect(f.root); assert.ok(!evidence.files.includes('.env')); assert.ok(evidence.relationships.some(r => r.to === 'node:fs')); assert.ok(evidence.apis.some(a => a.path === '/api/test'));
  assert.equal(redact({ apiKey: 'abc', text: 'Bearer abcdefghijklmnop' }).apiKey, '[REMOVIDO]');
});
test('analysis sessions survive hydration and retain their read-only identity', async t => {
  const f = await fixture(t); const auth = new AuthService({ store: f.store, bus: { emit: async () => {} }, controlPlane: f.app.controlPlane });
  const token = await auth.createAnalysisSession('a', 'admin', 'run');
  const identity = await auth.contextFromAsync({ authorization: `Bearer ${token}` }); assert.equal(identity.readOnly, true); assert.equal(identity.analysisId, 'run');
  await auth.logoutAsync(token); assert.equal(await auth.contextFromAsync({ authorization: `Bearer ${token}` }), null);
});
test('migration preserves existing data and ZIP signatures are valid', () => {
  const result = migrateState({ schemaVersion: 39, projects: [{ id: 'keep' }], migrationHistory: [] });
  assert.equal(result.state.schemaVersion, CURRENT_SCHEMA_VERSION); assert.deepEqual(result.state.systemAnalyses, []); assert.equal(result.state.projects[0].id, 'keep');
  const data = zip([['report.md', Buffer.from('Português')]]); assert.equal(data.readUInt32LE(0), 0x04034b50); assert.equal(data.readUInt32LE(data.length - 22), 0x06054b50);
});
