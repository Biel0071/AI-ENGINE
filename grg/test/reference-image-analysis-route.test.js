'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleIntentRoutes } = require('../src/api/intent-routes');

function harness(body, { model = 'llava:7b', llm = null, project = true } = {}) {
  const originalModel = process.env.GRG_VISION_MODEL;
  if (model) process.env.GRG_VISION_MODEL = model;
  else delete process.env.GRG_VISION_MODEL;
  const response = {};
  const app = {
    controlPlane: { authorize: async (tenant, actor, capability) => { assert.equal(tenant, 'tenant-a'); assert.equal(actor, 'user-a'); assert.equal(capability, 'project:read'); } },
    store: { read: async () => ({ projects: project ? [{ tenantId: 'tenant-a', id: 'project-a' }] : [] }) },
    llm,
  };
  return {
    app,
    response,
    restore: () => { if (originalModel === undefined) delete process.env.GRG_VISION_MODEL; else process.env.GRG_VISION_MODEL = originalModel; },
    run: () => handleIntentRoutes({ method: 'POST', headers: {}, _parsedBody: body }, response, new URL('http://local/api/v2/intent/analyze-reference-image'), app,
      (_res, status, payload) => { response.status = status; response.payload = payload; return true; }, async (req) => req._parsedBody, { tenantId: 'tenant-a', actorId: 'user-a' })
  };
}

test('authenticated project image analysis stores only model observations and image hash in its response', async () => {
  let providerRequest;
  const ctx = harness({ projectId: 'project-a', imageBase64: Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64') }, {
    llm: { name: 'ollama', chat: async (request) => {
      providerRequest = request;
      return { text: JSON.stringify({ layout: 'Navegação à esquerda e painel central', visibleText: ['Projetos'], visibleComponents: [{ label: 'Buscar projeto', category: 'input', apparentState: 'vazio' }], inferredInteractions: ['Busca por projeto'], uncertainties: ['Estado após busca não visível'] }), model: 'llava:7b' };
    } }
  });
  try {
    await ctx.run();
    assert.equal(ctx.response.status, 200);
    assert.deepEqual(providerRequest.messages[1].images, [Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')]);
    assert.equal(ctx.response.payload.referenceSpec.analysisStatus, 'MODEL_OBSERVATIONS_REQUIRES_VALIDATION');
    assert.equal(ctx.response.payload.referenceSpec.knowledge.visual.observations.layout, 'Navegação à esquerda e painel central');
    assert.match(ctx.response.payload.referenceSpec.imageAnalysis.imageSha256, /^[a-f0-9]{64}$/);
    assert.doesNotMatch(JSON.stringify(ctx.response.payload), /iVBORw0KGgo/);
  } finally { ctx.restore(); }
});

test('image analysis returns explicit unavailable and project-not-found states', async () => {
  const noModel = harness({ projectId: 'project-a', imageBase64: 'AA==' }, { model: '', llm: { chat: async () => ({ text: '{}' }) } });
  try {
    await noModel.run();
    assert.equal(noModel.response.status, 503);
    assert.equal(noModel.response.payload.error, 'VISION_MODEL_UNAVAILABLE');
  } finally { noModel.restore(); }
  const missingProject = harness({ projectId: 'project-a', imageBase64: 'AA==' }, { project: false, llm: { chat: async () => ({ text: '{}' }) } });
  try {
    await missingProject.run();
    assert.equal(missingProject.response.status, 404);
    assert.equal(missingProject.response.payload.error, 'PROJECT_NOT_FOUND');
  } finally { missingProject.restore(); }
});
