'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleConversationRoutes } = require('../src/api/conversation-routes');
const { getProjectById } = require('../src/projects/project-registry');

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

test('a question that explicitly forbids mission creation stays in the real chat lane', () => {
  const { classify } = require('../src/routing/conversation-router');
  const result = classify('Quanto é 2 + 2? Responda e identifique o provider e o modelo usados. Não crie missão, job nem arquivo.');
  assert.equal(result.classification, 'QUESTION');
  assert.equal(result.lane, 'FAST_LANE');
  assert.equal(result.requires_confirmation, false);
});

test('a normal question mentioning a forbidden task stays in Fast Lane', () => {
  const { classify } = require('../src/routing/conversation-router');
  const result = classify('Quanto é 2 + 2? Responda apenas o resultado. Não crie tarefa, job ou missão.');
  assert.equal(result.classification, 'QUESTION');
  assert.equal(result.lane, 'FAST_LANE');
  assert.equal(result.requires_confirmation, false);
});

test('a conversational request that forbids tasks never creates or starts a mission', async () => {
  let missionCalls = 0;
  const app = {
    aiRouter: { route: async () => ({ ok: true, provider: 'aiplatform', result: { text: '4', model: 'configured-model' } }) },
    conversations: { open: async () => ({ id: 'conv-no-task' }), append: async () => {} },
    missions: {
      create: async () => { missionCalls += 1; },
      start: async () => { missionCalls += 1; },
    },
  };
  const ctx = setup('Quanto é 2 + 2? Responda apenas o resultado. Não crie tarefa, job ou missão.', app);
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);

  assert.equal(ctx.res.status, 200);
  assert.equal(ctx.res.payload.lane, 'FAST_LANE');
  assert.equal(ctx.res.payload.response, '4');
  assert.equal(missionCalls, 0);
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

test('delegation prepares a mission proposal but never starts it before explicit confirmation', async () => {
  const calls = [];
  const app = {
    conversations: {
      open: async () => ({ id: 'conv-proposal-1' }),
      append: async (_tenant, _actor, _id, item) => calls.push(['message', item.role]),
    },
    missionPlanner: {
      plan: async (_tenant, _actor, input) => {
        calls.push(['plan', input.autoStart]);
        return { plan: { id: 'plan-1', status: 'MATERIALIZED', questions: [] }, mission: { id: 'mission-1', status: 'PLANNED' } };
      },
    },
    missions: { start: async () => { calls.push(['start']); } },
  };
  const ctx = setup('Crie um artefato de teste', app, { delegateTask: true });
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
  assert.equal(ctx.res.status, 200);
  assert.equal(ctx.res.payload.lane, 'PROPOSAL');
  assert.equal(ctx.res.payload.mission.id, 'mission-1');
  assert.deepEqual(calls, [['message', 'user'], ['plan', false], ['message', 'assistant']]);
  assert.equal(ctx.res.payload.actions[0].type, 'confirm_mission');
});

test('mutating chat prepares a persistent mission proposal without starting the worker', async () => {
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
  assert.equal(ctx.res.status, 200);
  assert.equal(ctx.res.payload.lane, 'PROPOSAL');
  assert.equal(ctx.res.payload.plan.requiresConfirmation, true);
  assert.equal(ctx.res.payload.mission.id, 'mission-1');
  assert.equal(ctx.res.payload.actions[0].type, 'confirm_mission');
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

test('job lane accepts only the configured canonical Fenix OS workspace outside the shared root', async () => {
  const previous = process.env.FENIX_FENIX_OS_WORKSPACE;
  process.env.FENIX_FENIX_OS_WORKSPACE = 'C:/opt/fenix-os';
  let createdMissions = 0;
  const app = {
    workspaceRoot: 'C:/workspace/fenix',
    projectKernel: { list: async () => [{ id: 'fenix-os', name: 'Fênix OS', workspace: 'C:/opt/fenix-os' }] },
    conversations: { open: async () => ({ id: 'conv-fenix-os-canonical' }), append: async () => {} },
    missions: {
      create: async () => { createdMissions += 1; return { id: 'mission-fenix-os-canonical', status: 'PLANNED', steps: [] }; },
      start: async () => ({ id: 'mission-fenix-os-canonical', status: 'AWAITING_APPROVAL', steps: [] }),
    },
  };
  try {
    const ctx = setup('corrija o bug no login do Fênix OS', app);
    await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
    assert.equal(ctx.res.status, 200);
    assert.equal(ctx.res.payload.lane, 'PROPOSAL');
    assert.equal(createdMissions, 1);
  } finally {
    if (previous === undefined) delete process.env.FENIX_FENIX_OS_WORKSPACE;
    else process.env.FENIX_FENIX_OS_WORKSPACE = previous;
  }
});

test('job lane maps a stale Windows workspace to the existing VPS registry path', async () => {
  const registryProject = getProjectById('fenix-os');
  const originalVpsPath = registryProject.vpsPath;
  registryProject.vpsPath = process.cwd();
  let createdMissions = 0;
  const app = {
    workspaceRoot: `${process.cwd()}-other`,
    projectKernel: { list: async () => [{ id: 'fenix-os', name: 'Fênix OS', workspace: 'C:\\projetos\\ai-engine-core' }] },
    conversations: { open: async () => ({ id: 'conv-stale-workspace' }), append: async () => {} },
    missions: {
      create: async () => { createdMissions += 1; return { id: 'mission-vps-path', status: 'PLANNED', steps: [] }; },
      start: async () => ({ id: 'mission-vps-path', status: 'AWAITING_APPROVAL', steps: [] }),
    },
  };
  try {
    const ctx = setup('corrija o bug no Fênix OS', app);
    await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
    assert.equal(ctx.res.status, 200);
    assert.equal(ctx.res.payload.lane, 'PROPOSAL');
    assert.equal(createdMissions, 1);
  } finally {
    registryProject.vpsPath = originalVpsPath;
  }
});

test('job lane accepts the canonical API Platform workspace when it is explicitly configured', async () => {
  const previous = process.env.FENIX_API_PLATFORM_WORKSPACE;
  process.env.FENIX_API_PLATFORM_WORKSPACE = 'C:/projects/api-platform';
  let createdMissions = 0;
  const app = {
    workspaceRoot: 'C:/workspace/fenix',
    projectKernel: { list: async () => [{ id: 'api-platform', name: 'API Platform', workspace: 'C:/projects/api-platform' }] },
    conversations: { open: async () => ({ id: 'conv-api-platform' }), append: async () => {} },
    missions: {
      create: async () => { createdMissions += 1; return { id: 'mission-api-platform', status: 'PLANNED', steps: [] }; },
      start: async () => ({ id: 'mission-api-platform', status: 'AWAITING_APPROVAL', steps: [] }),
    },
  };
  try {
    const ctx = setup('analise o projeto API Platform', app);
    await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
    assert.equal(ctx.res.status, 202);
    assert.equal(createdMissions, 1);
  } finally {
    if (previous === undefined) delete process.env.FENIX_API_PLATFORM_WORKSPACE;
    else process.env.FENIX_API_PLATFORM_WORKSPACE = previous;
  }
});

test('legacy API Platform context ID resolves to the canonical project before dispatch', async () => {
  const previous = process.env.FENIX_API_PLATFORM_WORKSPACE;
  process.env.FENIX_API_PLATFORM_WORKSPACE = 'C:/projects/api-platform';
  const createdMissions = [];
  const openedConversations = [];
  let startCalls = 0;
  const app = {
    workspaceRoot: 'C:/workspace/fenix',
    projectKernel: { list: async () => [{ id: 'api-platform', name: 'API Platform', workspace: 'C:/projects/api-platform' }] },
    conversations: {
      open: async (_tenant, _actor, input) => { openedConversations.push(input); return { id: 'conv-api-platform-alias' }; },
      append: async () => {},
    },
    missions: {
      create: async (_tenant, _actor, input) => { createdMissions.push(input); return { id: 'mission-api-platform-alias', status: 'PLANNED', steps: [] }; },
      start: async () => { startCalls += 1; return { id: 'mission-api-platform-alias', status: 'AWAITING_APPROVAL', steps: [] }; },
    },
    jobs: { handlers: new Map([['development.execute', async () => {}]]) },
  };
  try {
    const ctx = setup('corrija o bug de autenticação no API Platform', app, { projectId: 'api-platform-live' });
    await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);

    assert.equal(ctx.res.status, 200);
    assert.equal(ctx.res.payload.lane, 'PROPOSAL');
    assert.equal(ctx.res.payload.mission.id, 'mission-api-platform-alias');
    assert.equal(createdMissions[0].projectId, 'api-platform');
    assert.equal(openedConversations[0].projectId, 'api-platform');
    assert.equal(startCalls, 0, 'creating the proposal must not start the agent before confirmation');
  } finally {
    if (previous === undefined) delete process.env.FENIX_API_PLATFORM_WORKSPACE;
    else process.env.FENIX_API_PLATFORM_WORKSPACE = previous;
  }
});

test('API Platform live project remains selected when it exists in the tenant Project Kernel', async () => {
  const createdMissions = [];
  const app = {
    workspaceRoot: 'C:/workspace/fenix',
    projectKernel: { list: async () => [{ id: 'api-platform-live', name: 'API Platform Live', workspace: 'C:/workspace/fenix/projects/api-live' }] },
    conversations: { open: async (_tenant, _actor, input) => { app.openedProjectId = input.projectId; return { id: 'conv-api-platform-live' }; }, append: async () => {} },
    missions: {
      create: async (_tenant, _actor, input) => { createdMissions.push(input); return { id: 'mission-api-platform-live', status: 'PLANNED', steps: [] }; },
      start: async () => ({ id: 'mission-api-platform-live', status: 'AWAITING_APPROVAL', steps: [] }),
    },
    jobs: { handlers: new Map([['development.execute', async () => {}]]) },
  };
  const ctx = setup('corrija o bug de autenticação no API Platform', app, { projectId: 'api-platform-live' });
  await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);

  assert.equal(ctx.res.payload.lane, 'PROPOSAL', JSON.stringify({ status: ctx.res.status, payload: ctx.res.payload }));
  assert.equal(app.openedProjectId, 'api-platform-live');
  assert.equal(createdMissions[0].projectId, 'api-platform-live');
});

test('job lane accepts the canonical API Platform workspace registered for the runtime', async () => {
  const previous = process.env.FENIX_API_PLATFORM_WORKSPACE;
  delete process.env.FENIX_API_PLATFORM_WORKSPACE;
  let createdMissions = 0;
  const app = {
    workspaceRoot: 'C:/workspace/fenix',
    projectKernel: { list: async () => [{ id: 'api-platform', name: 'API Platform', workspace: '/app/workspaces/api-platform' }] },
    conversations: { open: async () => ({ id: 'conv-api-platform-registry' }), append: async () => {} },
    missions: {
      create: async () => { createdMissions += 1; return { id: 'mission-api-platform-registry', status: 'PLANNED', steps: [] }; },
      start: async () => ({ id: 'mission-api-platform-registry', status: 'AWAITING_APPROVAL', steps: [] }),
    },
  };
  try {
    const ctx = setup('corrija o bug no API Platform', app);
    await handleConversationRoutes(ctx.req, ctx.res, ctx.url, ctx.sendJson, ctx.readJson, ctx.identity, ctx.app);
    assert.equal(ctx.res.status, 200);
    assert.equal(ctx.res.payload.lane, 'PROPOSAL');
    assert.equal(createdMissions, 1);
  } finally {
    if (previous === undefined) delete process.env.FENIX_API_PLATFORM_WORKSPACE;
    else process.env.FENIX_API_PLATFORM_WORKSPACE = previous;
  }
});

test('mutating proposal does not claim dispatch when a worker is unavailable', async () => {
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
  assert.equal(ctx.res.status, 200);
  assert.equal(ctx.res.payload.lane, 'PROPOSAL');
  assert.equal(ctx.res.payload.mission.id, mission.id);
  assert.equal(ctx.res.payload.jobId, undefined);
  assert.match(messages.at(-1).content, /nenhum job foi iniciado/i);
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
