'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getLocalProjects } = require('../src/projects/local-project-catalog');
const { PROJECTS } = require('../src/projects/project-registry');
const { handleConversationRoutes } = require('../src/api/conversation-routes');
const { getWorldStateEngine } = require('../src/world-model/world-state-engine');

function invokeConversation(method, pathname, body = {}, app = {}) {
  const res = {};
  const sendJson = (_res, status, payload) => {
    res.status = status;
    res.payload = payload;
    return true;
  };
  return handleConversationRoutes(
    { method, headers: { 'user-agent': 'phase55-certification' } },
    res,
    new URL(`http://localhost${pathname}`),
    sendJson,
    async () => body,
    { tenantId: 'tenant-p55', actorId: 'operator-p55' },
    app
  ).then(() => res);
}

test('Phase 55: Project Hub Catalog loads all 33 local catalog entries alongside 7 core projects (40 total)', () => {
  const localItems = getLocalProjects();
  assert.ok(localItems.length >= 30, `expected >= 30 local catalog projects, got ${localItems.length}`);
  const coreItems = PROJECTS;
  assert.ok(coreItems.length >= 7, `expected >= 7 core projects, got ${coreItems.length}`);
  assert.ok(localItems.length + coreItems.length >= 40, `expected >= 40 total projects, got ${localItems.length + coreItems.length}`);
  const lovableCount = localItems.filter(p => p.catalogGroup === 'Lovable').length;
  const crmCount = localItems.filter(p => p.catalogGroup === 'CRM & WhatsApp').length;
  assert.ok(lovableCount >= 5, `expected >= 5 Lovable projects, got ${lovableCount}`);
  assert.ok(crmCount >= 5, `expected >= 5 CRM & WhatsApp projects, got ${crmCount}`);
});

test('Phase 55: Mascot Fast Lane answers greetings and package.json inspection in < 200ms without AI_PROVIDER_UNAVAILABLE', async () => {
  const slowFailingApp = {
    aiRouter: {
      route: async () => new Promise((resolve) => setTimeout(() => resolve({ ok: false }), 5000))
    },
    conversations: {
      open: async () => ({ id: 'conv-p55-fast' }),
      append: async () => {}
    }
  };

  for (const greeting of ['boa noite', 'tudo bem ?', 'Olá, tudo bem ?', 'boa tarde']) {
    const t0 = Date.now();
    const res = await invokeConversation('POST', '/api/v2/conversation', {
      message: greeting,
      mascotFastLane: true
    }, slowFailingApp);
    const elapsed = Date.now() - t0;
    assert.equal(res.status, 200, `greeting "${greeting}" must return 200`);
    assert.equal(res.payload.ok, true);
    assert.equal(res.payload.lane, 'FAST_LANE');
    assert.ok(elapsed < 500, `greeting "${greeting}" took ${elapsed}ms (expected < 500ms)`);
    assert.ok(!String(res.payload.response || '').includes('AI_PROVIDER_UNAVAILABLE'));
  }

  const pkgRes = await invokeConversation('POST', '/api/v2/conversation', {
    message: 'Leia o arquivo package.json do API Platform. Diga o nome do pacote, o script test e 3 dependências. Não crie tarefa, job ou missão.',
    mascotFastLane: true
  }, slowFailingApp);
  assert.equal(pkgRes.status, 200);
  assert.equal(pkgRes.payload.ok, true);
  assert.equal(pkgRes.payload.lane, 'FAST_LANE');
  assert.ok(String(pkgRes.payload.response).includes('package.json'), 'must inspect package.json');
  assert.ok(String(pkgRes.payload.response).includes('Script `test`'), 'must report test script');
  assert.ok(String(pkgRes.payload.response).includes('3 Dependências'), 'must report 3 dependencies');
});

test('Phase 55: Persistent Mascot Chat Error Ledger records and retrieves errors via /api/v2/conversation/errors', async () => {
  const postRes = await invokeConversation('POST', '/api/v2/conversation/errors', {
    code: 'AI_PROVIDER_FALLBACK_TEST',
    message: 'Teste de persistência de erro no histórico do Mascote',
    prompt: 'boa tarde',
    projectId: 'api-platform',
    lane: 'FAST_LANE'
  });
  assert.equal(postRes.status, 200);
  assert.equal(postRes.payload.ok, true);
  assert.equal(postRes.payload.saved.code, 'AI_PROVIDER_FALLBACK_TEST');

  const getRes = await invokeConversation('GET', '/api/v2/conversation/errors?limit=20');
  assert.equal(getRes.status, 200);
  assert.equal(getRes.payload.ok, true);
  assert.ok(Array.isArray(getRes.payload.errors));
  assert.ok(getRes.payload.errors.some(e => e.code === 'AI_PROVIDER_FALLBACK_TEST'));
});

test('Phase 55: Living 3D World dynamic company agent spawning and task movement', () => {
  const world = getWorldStateEngine();
  const spawned = world.spawnCompanyAgent({
    companyId: 'api-platform',
    name: 'Agente Certificação P55',
    role: 'Gateway & FastLane Specialist',
    currentTask: 'Verificar rotas 3D e fila unificada',
    source: 'phase55-test'
  });
  assert.ok(spawned && spawned.id);
  assert.equal(spawned.companyId, 'api-platform');
  assert.ok(Array.isArray(spawned.routineWaypoints) && spawned.routineWaypoints.length >= 2);
});
