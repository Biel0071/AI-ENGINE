'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleConversationRoutes } = require('../src/api/conversation-routes');

function setup(message, app, extra = {}) {
  const res = {};
  const sendJson = (_res, status, payload) => {
    res.status = status;
    res.payload = payload;
    return true;
  };
  return {
    req: { method: 'POST' },
    res,
    sendJson,
    readJson: async () => ({ message, ...extra }),
    url: new URL('http://localhost/api/v2/conversation'),
    identity: { tenantId: 'tenant-a', actorId: 'user-a' },
    app,
  };
}

test('fast lane returns only a response from the connected AI router and persists both turns', async () => {
  const calls = [];
  const messages = [];
  const app = {
    aiRouter: {
      route: async (tenantId, actorId, input) => {
        calls.push({ tenantId, actorId, input });
        return { ok: true, provider: 'aiplatform', result: { text: 'Resposta real do provedor.', model: 'qwen2.5:3b', totalTokens: 17 } };
      },
    },
    conversations: {
      open: async () => ({ id: 'conv-fast-1' }),
      append: async (_tenant, _actor, conversationId, input) => messages.push({ conversationId, ...input }),
    },
  };
  const ctx = setup('Oi, tudo bem?', app);
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].tenantId, 'tenant-a');
  assert.equal(calls[0].actorId, 'user-a');
  assert.equal(calls[0].input.prompt, 'Oi, tudo bem?');
  assert.equal(ctx.res.status, 200);
  assert.equal(ctx.res.payload.ok, true);
  assert.equal(ctx.res.payload.response, 'Resposta real do provedor.');
  assert.equal(ctx.res.payload.provider, 'aiplatform');
  assert.equal(ctx.res.payload.conversationId, 'conv-fast-1');
  assert.deepEqual(messages.map((item) => item.role), ['user', 'assistant']);
});

test('fast lane reports provider failure instead of substituting generated text', async () => {
  const app = {
    aiRouter: { route: async () => ({ ok: false, selection: { chosen: { state: 'unknown' } } }) },
    conversations: {
      open: async () => ({ id: 'conv-fast-error' }),
      append: async () => {},
    },
  };
  const ctx = setup('Explique a fila atual.', app);
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.equal(ctx.res.status, 503);
  assert.equal(ctx.res.payload.ok, false);
  assert.equal(ctx.res.payload.error, 'AI_PROVIDER_UNAVAILABLE');
  assert.equal(ctx.res.payload.response, undefined);
});

test('job lane materializes a persistent mission and ties it to the conversation and project', async () => {
  const createdMissions = [];
  const messages = [];
  const app = {
    workspaceRoot: 'C:/workspace/fenix',
    projectKernel: { list: async () => [{ id: 'fenix-os', name: 'Fênix OS', workspace: 'C:/workspace/fenix' }] },
    conversations: {
      open: async () => ({ id: 'conv-job-1' }),
      append: async (_tenant, _actor, conversationId, input) => messages.push({ conversationId, ...input }),
    },
    missions: {
      create: async (_tenant, _actor, input) => {
        createdMissions.push(input);
        return { id: 'mission-1', status: 'PLANNED', steps: [{ id: 'step-1', key: 'execute', status: 'PLANNED' }] };
      },
      start: async () => ({ id: 'mission-1', status: 'AWAITING_APPROVAL', steps: [{ id: 'step-1', key: 'execute', type: 'dev-execute', status: 'AWAITING_APPROVAL', approvalId: 'approval-1', jobId: null }] }),
    },
  };
  const ctx = setup('corrija o bug no login do Fênix OS', app);
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);

  assert.equal(createdMissions.length, 1);
  assert.equal(createdMissions[0].projectId, 'fenix-os');
  assert.equal(createdMissions[0].steps[0].type, 'dev-execute');
  assert.equal(createdMissions[0].steps[0].payload.prompt, 'corrija o bug no login do Fênix OS');
  assert.equal(createdMissions[0].contextRefs[0].ref, 'conversation:conv-job-1');
  assert.equal(ctx.res.status, 202);
  assert.equal(ctx.res.payload.missionId, 'mission-1');
  assert.equal(ctx.res.payload.jobId, null);
  assert.equal(ctx.res.payload.status, 'AWAITING_APPROVAL');
  assert.deepEqual(messages.map((item) => item.role), ['user', 'assistant']);
});

test('job lane rejects a stored project workspace outside configured roots and ignores client paths', async () => {
  let missionCreated = false;
  const app = {
    workspaceRoot: 'C:/workspace/fenix',
    projectKernel: { list: async () => [{ id: 'fenix-os', name: 'Fênix OS', workspace: 'C:/private' }] },
    conversations: { open: async () => ({ id: 'conv-unsafe' }), append: async () => {} },
    missions: {
      create: async () => { missionCreated = true; },
      start: async () => { throw new Error('must not start an outside workspace'); },
    },
  };
  const ctx = setup('corrija o bug no Fênix', app, { projectPath: 'C:/workspace/fenix' });
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.equal(ctx.res.status, 403);
  assert.equal(ctx.res.payload.error, 'PROJECT_WORKSPACE_OUTSIDE_ALLOWED_ROOT');
  assert.equal(missionCreated, false);
});

test('job lane returns the persisted mission and a truthful error when dispatch fails', async () => {
  const messages = [];
  const mission = { id: 'mission-dispatch-failed', status: 'PLANNED', steps: [{ id: 'step-failed', key: 'execute', status: 'PLANNED', jobId: null }] };
  const app = {
    workspaceRoot: 'C:/workspace/fenix',
    projectKernel: { list: async () => [{ id: 'fenix-os', name: 'Fênix OS', workspace: 'C:/workspace/fenix' }] },
    conversations: {
      open: async () => ({ id: 'conv-dispatch-failed' }),
      append: async (_tenant, _actor, _id, input) => messages.push(input),
    },
    missions: {
      create: async () => mission,
      start: async () => { throw new Error('worker unavailable'); },
      get: async () => mission,
    },
  };
  const ctx = setup('crie uma tarefa para o projeto Fênix', app);
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.equal(ctx.res.status, 503);
  assert.equal(ctx.res.payload.error, 'MISSION_DISPATCH_FAILED');
  assert.equal(ctx.res.payload.missionId, mission.id);
  assert.equal(ctx.res.payload.jobId, null);
  assert.match(messages.at(-1).content, /não foi iniciada/i);
});

test('model catalog is built from measured AI connectors and does not advertise static models', async () => {
  const app = {
    controlPlane: { authorize: async (_tenant, _actor, permission) => assert.equal(permission, 'runtime:read') },
    aiRouter: { connectors: {
      list: () => ['ai:local-provider', 'filesystem'],
      status: async () => ({ state: { state: 'measured', value: 'CONNECTED' } }),
      connectors: new Map([['ai:local-provider', { models: () => ({ state: 'measured', value: ['model-from-provider'] }) }]]),
    } },
  };
  const ctx = setup('', app);
  ctx.req.method = 'GET';
  ctx.url = new URL('http://localhost/api/v2/models');
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.deepEqual(ctx.res.payload.providers, [{ id: 'local-provider', state: 'CONNECTED', models: ['model-from-provider'] }]);
  assert.deepEqual(ctx.res.payload.models, [{ id: 'model-from-provider', provider: 'local-provider', state: 'CONNECTED' }]);
});

test('project shortcuts use the tenant Project Kernel without inventing status or leaking workspace paths', async () => {
  const messages = [];
  const app = {
    projectKernel: { list: async () => [{ id: 'fenix-os', name: 'Fênix OS', workspace: 'C:/private', status: 'ONLINE', branch: 'feature/live', maturity: 'TESTED' }] },
    conversations: {
      open: async () => ({ id: 'conv-project-list' }),
      append: async (_tenant, _actor, _id, input) => messages.push(input),
    },
  };
  const ctx = setup('mostra meus projetos', app);
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.deepEqual(ctx.res.payload.projects, [{ id: 'fenix-os', name: 'Fênix OS', branch: 'feature/live', lifecycle: null, maturity: 'TESTED' }]);
  assert.doesNotMatch(ctx.res.payload.response, /ONLINE/);
  assert.equal(JSON.stringify(ctx.res.payload).includes('C:/private'), false);
  assert.deepEqual(messages.map((item) => item.role), ['user', 'assistant']);
});
