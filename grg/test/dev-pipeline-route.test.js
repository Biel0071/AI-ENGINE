const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Readable } = require('node:stream');
const { handleDeveloperRoutes } = require('../src/api/developer-routes');

async function requestPipeline(app, payload) {
  const req = Readable.from([JSON.stringify(payload)]);
  req.method = 'POST';
  const res = {
    writeHead(status) { this.statusCode = status; },
    end(body) { this.body = JSON.parse(body); },
  };
  const handled = await handleDeveloperRoutes(req, res, new URL('http://localhost/api/dev/pipeline'), app,
    (response, status, body) => { response.writeHead(status); response.end(JSON.stringify(body)); },
    (response, status, error) => { response.writeHead(status); response.end(JSON.stringify({ error })); },
    { tenantId: 'test-tenant', actorId: 'operator' });
  assert.equal(handled, true);
  return res;
}

test('developer pipeline scopes execution to selected project and waits for canonical approval', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-selected-project-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: workspace });

  let created;
  let started = false;
  const app = {
    fileSystemService: {}, executionEngine: {},
    controlPlane: { authorize: async () => {} },
    projectKernel: { state: async (tenantId, actorId, projectId) => {
      assert.equal(projectId, 'selected-project');
      return { id: projectId, workspace };
    } },
    missions: {
      create: async (tenantId, actorId, input) => {
        created = input;
        return { id: 'mission-canonical', steps: [{ id: 'step-build', key: 'implement', status: 'PLANNED' }] };
      },
      start: async () => { started = true; },
      get: async () => ({ id: 'mission-canonical', status: 'AWAITING_APPROVAL', steps: [{ id: 'step-build', key: 'implement', status: 'AWAITING_APPROVAL', approvalId: 'approval-canonical' }] }),
    },
  };

  const response = await requestPipeline(app, {
    projectId: 'selected-project',
    projectPath: 'C:/must-not-be-trusted',
    prompt: 'Implementar o plano REA revisado',
    plan: '1. Corrigir o componente. 2. Rodar testes.',
    evidenceId: 'rea-evidence-01',
    referenceIds: ['ref-stitch-01'],
  });

  assert.equal(response.statusCode, 202);
  assert.equal(created.projectId, 'selected-project');
  assert.equal(created.steps.length, 1);
  assert.equal(created.steps[0].type, 'dev-execute');
  assert.equal(created.steps[0].payload.projectPath, workspace);
  assert.match(created.steps[0].payload.prompt, /plano REA revisado/i);
  assert.equal(created.steps[0].payload.context.projectId, 'selected-project');
  assert.equal(created.steps[0].contextRefs[0].ref, 'rea-evidence-01');
  assert.equal(started, true);
  assert.equal(response.body.mission.id, 'mission-canonical');
  assert.equal(response.body.mission.steps[0].approvalId, 'approval-canonical');
});

test('developer pipeline rejects missing or unavailable selected projects without falling back to cwd', async () => {
  let created = false;
  const app = {
    fileSystemService: {}, executionEngine: {},
    controlPlane: { authorize: async () => {} },
    projectKernel: { state: async () => ({ workspace: null, workspaceAvailable: false }) },
    missions: { create: async () => { created = true; } },
  };
  const missing = await requestPipeline(app, { prompt: 'Implementar' });
  assert.equal(missing.statusCode, 400);
  const unavailable = await requestPipeline(app, { projectId: 'offline-project', prompt: 'Implementar' });
  assert.equal(unavailable.statusCode, 400);
  assert.equal(created, false);
});
