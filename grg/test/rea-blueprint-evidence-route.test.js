'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { handleReaMemoryIndexRoutes } = require('../src/api/rea-memory-index-routes');
const { ReaIntelligenceEngine } = require('../src/services/rea-intelligence-engine');

function context({ body = {}, memories = [], engine = null } = {}) {
  const response = {};
  const app = {
    controlPlane: { authorize: async () => {} },
    store: { read: async () => ({ memories }) },
    reaIntelligence: engine || { generateDevBlueprint: (projectId, objective, options) => ({ ok: true, projectId, objective, evidenceId: options.evidence.evidenceId }) },
  };
  const req = { method: 'POST' };
  const url = new URL('http://localhost/api/v2/rea/blueprint');
  const sendJson = (_res, status, payload) => { response.status = status; response.payload = payload; };
  return { req, response, app, url, sendJson, readJson: async () => body, identity: { tenantId: 'tenant-a', actorId: 'user-a' } };
}

test('REA blueprint refuses to infer a project plan before persisted evidence exists', async () => {
  const ctx = context({ body: { projectId: 'project-a', objective: 'Mapear telas' } });

  await handleReaMemoryIndexRoutes(ctx.req, ctx.response, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);

  assert.equal(ctx.response.status, 409);
  assert.equal(ctx.response.payload.code, 'REA_EVIDENCE_REQUIRED');
});

test('REA blueprint requires project read authorization before reading evidence', async () => {
  const ctx = context({ body: { projectId: 'project-a', objective: 'Mapear telas' } });
  let authorization;
  ctx.app.controlPlane.authorize = async (...args) => { authorization = args; throw new Error('denied'); };

  await assert.rejects(handleReaMemoryIndexRoutes(ctx.req, ctx.response, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app), /denied/);
  assert.deepEqual(authorization, ['tenant-a', 'user-a', 'project:read']);
});

test('REA blueprint uses only evidence for the requested tenant and project', async () => {
  const evidence = { ok: true, projectId: 'project-a', evidenceId: `rea_ev_${'a'.repeat(12)}`, subjectSha256: 'a'.repeat(64), applicationGraph: { nodes: [], edges: [] }, routes: [], storageSchemas: [] };
  const memories = [
    { tenantId: 'tenant-b', projectId: 'project-a', stableKey: 'rea-evidence:project-a', content: JSON.stringify({ ...evidence, evidenceId: 'foreign' }), status: 'ACTIVE' },
    { tenantId: 'tenant-a', projectId: 'project-b', stableKey: 'rea-evidence:project-b', content: JSON.stringify({ ...evidence, projectId: 'project-b', evidenceId: 'other' }), status: 'ACTIVE' },
    { tenantId: 'tenant-a', projectId: 'project-a', stableKey: 'rea-evidence:project-a', content: JSON.stringify(evidence), status: 'ACTIVE' },
  ];
  let received;
  const ctx = context({ body: { projectId: 'project-a', objective: 'Mapear telas' }, memories, engine: { generateDevBlueprint: (...args) => { received = args; return { ok: true, blueprintId: 'bp_a', evidenceRef: { evidenceId: args[2].evidence.evidenceId } }; } } });

  await handleReaMemoryIndexRoutes(ctx.req, ctx.response, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);

  assert.equal(ctx.response.status, 200);
  assert.equal(received[0], 'project-a');
  assert.equal(received[1], 'Mapear telas');
  assert.equal(received[2].evidence.evidenceId, evidence.evidenceId);
  assert.equal(ctx.response.payload.evidenceRef.evidenceId, evidence.evidenceId);
});

test('REA blueprint leaves unobserved contracts and validation explicitly unknown', () => {
  const engine = new ReaIntelligenceEngine({ memoryIndex: {
    getContextPack: () => ({
      relevantViews: [{ id: 'observed-screen', file: 'src/app.js' }, { id: 'unobserved-screen' }],
      relevantFiles: [{ id: 'observed-module', file: 'src/app.js' }, { id: 'unobserved-module', file: 'src/unknown.js' }],
      relevantRoutes: [{ path: '/api/observed', file: 'src/app.js' }, { path: '/api/unobserved', file: 'src/unknown.js' }],
    }),
    recordActivity: () => {},
  } });
  const evidence = {
    projectId: 'fixture', projectName: 'Fixture', evidenceId: `rea_ev_${'b'.repeat(12)}`, subjectSha256: 'b'.repeat(64),
    analyzedAt: '2026-10-22T00:00:00.000Z', metrics: { graphNodesCount: 1, graphEdgesCount: 0, filesTruncated: false, routeEvidenceTruncated: false },
    applicationGraph: { nodes: [{ path: 'src/app.js' }], edges: [] }, routes: [{ path: '/api/observed', file: 'src/app.js' }], storageSchemas: [], ipcBoundaries: [],
  };
  engine.analyzeProject = () => { throw new Error('must use persisted evidence'); };
  const blueprint = engine.generateDevBlueprint('fixture', 'Mapear a interface', { evidence });

  assert.deepEqual(blueprint.fullstackContract.frontendTargets.map((target) => target.viewId), ['observed-screen']);
  assert.deepEqual(blueprint.fullstackContract.backendTargets.map((target) => target.symbol), ['observed-module']);
  assert.deepEqual(blueprint.fullstackContract.apiContracts.map((route) => route.path), ['/api/observed']);
  assert.equal(blueprint.fullstackContract.persistenceLayer.status, 'NOT_OBSERVED');
  assert.equal(blueprint.verificationSuite.status, 'NOT_RUN');
  assert.equal(blueprint.evidenceRef.evidenceId, evidence.evidenceId);
});

test('REA sidebar renders actual analysis and blueprint response contracts without claims of execution', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/fenix-mascot-sidebar.js'), 'utf8');

  assert.match(source, /if \(data\.ok && data\.evidenceId && data\.metrics\)/);
  assert.match(source, /if \(data\.ok && data\.blueprintId && data\.evidenceRef\)/);
  assert.match(source, /Esta proposta não criou missão, job ou alteração de arquivo/);
  assert.doesNotMatch(source, /Pronto para execução imediata ou delegação/);
});
