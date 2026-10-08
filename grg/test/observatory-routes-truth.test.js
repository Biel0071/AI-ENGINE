const test = require('node:test');
const assert = require('node:assert/strict');
const { handleObservatoryRoutes } = require('../src/api/observatory-routes');

async function request(pathname, app = {}, tenantId = 'tenant-a', method = 'GET', body = {}) {
  const response = {};
  const handled = await handleObservatoryRoutes(
    { method },
    response,
    new URL(`http://localhost${pathname}`),
    app,
    (_res, status, body) => { response.status = status; response.body = body; return true; },
    async () => body,
    { tenantId, actorId: 'actor-a' },
  );
  return { handled, ...response };
}

test('reality score stays unevaluated until a real audit computes it', async () => {
  const response = await request('/api/v2/reality/score', { realityEngine: { getRealitySummary: async () => ({ realityScore: { score: null, status: 'NOT_EVALUATED' } }) } });
  assert.equal(response.body.score, null);
  assert.equal(response.body.status, 'NOT_EVALUATED');
  assert.notEqual(response.body.source, 'measured');
});

test('observatory summary derives health and tenant counts from runtime stores', async () => {
  const app = {
    health: { check: async () => ({ status: 'DEGRADED', checks: { database: { ok: false } } }) },
    projectKernel: { list: async () => [] },
    store: { read: async () => ({ runtimeJobs: [
      { tenantId: 'tenant-a', status: 'QUEUED' },
      { tenantId: 'tenant-a', status: 'RUNNING' },
      { tenantId: 'tenant-b', status: 'FAILED' },
    ] }) },
  };
  const response = await request('/api/v2/observatory/summary', app);
  assert.equal(response.body.status, 'DEGRADED');
  assert.equal(response.body.metrics.queuedJobs, 1);
  assert.equal(response.body.metrics.runningJobs, 1);
  assert.equal(response.body.metrics.jobsTotal, 2);
  assert.equal(response.body.source, 'measured');
  assert.equal(response.body.services.worker, null);
});

test('project and mission views read tenant-scoped records', async () => {
  const app = {
    projectKernel: { list: async (tenantId, actorId) => {
      assert.equal(tenantId, 'tenant-a');
      assert.equal(actorId, 'actor-a');
      return [{ id: 'p1', name: 'Projeto real' }];
    } },
    missions: { list: async (tenantId, actorId) => {
      assert.equal(tenantId, 'tenant-a');
      assert.equal(actorId, 'actor-a');
      return [{ id: 'm1', status: 'QUEUED' }];
    } },
  };
  const projects = await request('/api/v2/public/projects', app);
  const missions = await request('/api/v2/fenix/intelligence/missions', app);
  assert.deepEqual(projects.body.projects, [{ id: 'p1', name: 'Projeto real' }]);
  assert.deepEqual(missions.body.missions, [{ id: 'm1', status: 'QUEUED' }]);
});

test('unsupported audit views report unavailable instead of an empty successful audit', async () => {
  const response = await request('/api/v2/observatory/gaps');
  assert.equal(response.status, 503);
  assert.equal(response.body.status, 'UNAVAILABLE');
  assert.equal(response.body.gaps, null);
});

test('self-knowledge queries use tenant-scoped memory and audit does not claim a snapshot', async () => {
  const app = { memory: { query: async (tenantId, actorId, query, options) => {
    assert.equal(tenantId, 'tenant-a');
    assert.equal(actorId, 'actor-a');
    assert.equal(query, 'cidade dinâmica');
    assert.equal(options.limit, 10);
    return [{ id: 'memory-1', content: 'Evento persistido' }];
  } } };
  const query = await request('/api/v2/observatory/query', app, 'tenant-a', 'POST', { query: 'cidade dinâmica' });
  assert.equal(query.status, 200);
  assert.equal(query.body.source, 'memory');
  assert.deepEqual(query.body.result, [{ id: 'memory-1', content: 'Evento persistido' }]);

  const audit = await request('/api/v2/observatory/audit', {}, 'tenant-a', 'POST');
  assert.equal(audit.status, 503);
  assert.equal(audit.body.audit, null);
  assert.match(audit.body.reason, /nenhum snapshot foi gerado/);
});

test('observatory does not shadow real git, absorption, mission-event, or swarm routes', async () => {
  for (const pathname of [
    '/api/fenix/projects/p1/git',
    '/api/v2/company/projects/p1/absorption',
    '/api/missions/events',
    '/api/agents/swarm',
  ]) {
    const response = await request(pathname);
    assert.equal(response.handled, false, pathname);
  }
});
