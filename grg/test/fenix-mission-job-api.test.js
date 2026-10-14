const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const WebSocket = require('ws');
const { start } = require('../src/server');
const { createApp } = require('../src/app');
const { handleUniversalSystemRoutes } = require('../src/api/universal-system-routes');
const { handleUniversalJobRoutes } = require('../src/api/universal-job-routes');
const { globalJobQueueManager } = require('../src/execution/job-queue-manager');

const admin = { tenantId: 'fenix-test', userId: 'fenix-test-admin', password: crypto.randomBytes(24).toString('base64url') };

test('versioned canonical job paths are not consumed by legacy conversation routes', async () => {
  const originalCreateJob = globalJobQueueManager.createJob;
  let legacyResponseSent = false;
  globalJobQueueManager.createJob = () => ({ id: 'legacy-job' });
  try {
    const stored = new Map();
    const app = { jobs: {
      submit: async (tenantId, actorId, input) => {
        const job = { id: 'canonical-job', jobId: 'canonical-job', tenantId, createdBy: actorId, type: input.type, status: 'QUEUED' };
        stored.set(job.id, job);
        return job;
      },
      get: async (_tenantId, _actorId, id) => stored.get(id),
      cancel: async (_tenantId, _actorId, id) => {
        const job = stored.get(id); job.status = 'CANCELLED'; return job;
      },
    } };
    let response;
    const sendJson = (_res, status, body) => { response = { status, body }; };
    const handled = await handleUniversalSystemRoutes(
      { method: 'POST' }, {}, new URL('http://localhost/api/v2/jobs'),
      (...args) => { legacyResponseSent = true; sendJson(...args); }, async () => ({ type: 'discovery.scan' }),
      { tenantId: 'grg', actorId: 'grg-admin' }, {}
    );
    assert.equal(handled, false);
    assert.equal(legacyResponseSent, false);

    const post = { method: 'POST' }; const postUrl = new URL('http://localhost/api/v2/jobs');
    assert.equal(await handleUniversalJobRoutes(post, {}, postUrl, app, sendJson, async () => ({ type: 'discovery.scan' }), { tenantId: 'grg', actorId: 'grg-admin' }), true);
    assert.equal(response.status, 202); assert.equal(response.body.jobId, 'canonical-job');

    const getUrl = new URL('http://localhost/api/v2/jobs/canonical-job');
    assert.equal(await handleUniversalJobRoutes({ method: 'GET' }, {}, getUrl, app, sendJson, async () => ({}), { tenantId: 'grg', actorId: 'grg-admin' }), true);
    assert.equal(response.body.status, 'QUEUED');

    const cancelUrl = new URL('http://localhost/api/v2/jobs/canonical-job/cancel');
    assert.equal(await handleUniversalJobRoutes({ method: 'POST' }, {}, cancelUrl, app, sendJson, async () => ({}), { tenantId: 'grg', actorId: 'grg-admin' }), true);
    assert.equal(response.status, 202); assert.equal(response.body.status, 'CANCELLED');
  } finally {
    globalJobQueueManager.createJob = originalCreateJob;
  }
});

test('FENIX mission/job HTTP contract persists DAG, events, checkpoints and controls', async () => {
  const dataFile = path.join(os.tmpdir(), `fenix-mission-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const server = await start(0, { dataFile, llm: false, localRuntimeWorker: false, bootstrapAdmin: { ...admin, tenantName: 'FENIX Test', name: 'FENIX Test', role: 'master_admin' } });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(admin) }).then((r) => r.json());
    const headers = { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
    const started = Date.now();
    const createdResponse = await fetch(`${base}/api/fenix/missions`, { method: 'POST', headers, body: JSON.stringify({ objective: 'Validar execução persistente do FENIX', mode: 'autonomous' }) });
    assert.ok(createdResponse.status >= 200 && createdResponse.status < 300);
    assert.ok(Date.now() - started < 5000);
    const created = await createdResponse.json();
    assert.ok(created.missionId);
    assert.equal(created.status, 'QUEUED');

    const mission = await fetch(`${base}/api/fenix/missions/${created.missionId}`, { headers }).then((r) => r.json());
    assert.equal(mission.id, created.missionId);
    assert.deepEqual(mission.steps.map((step) => step.key), ['discover', 'analyze', 'activate']);
    assert.deepEqual(mission.steps.map((step) => step.dependsOn), [[], ['discover'], ['analyze']]);

    const jobs = await fetch(`${base}/api/fenix/missions/${created.missionId}/jobs`, { headers }).then((r) => r.json());
    assert.equal(jobs.jobs.length, 3);
    const events = await fetch(`${base}/api/fenix/missions/${created.missionId}/events`, { headers }).then((r) => r.json());
    assert.ok(events.events.some((event) => event.type === 'mission.created'));
    const checkpoints = await fetch(`${base}/api/fenix/missions/${created.missionId}/checkpoints`, { headers }).then((r) => r.json());
    assert.ok(Array.isArray(checkpoints.checkpoints));

    const job = await fetch(`${base}/api/fenix/jobs`, { method: 'POST', headers, body: JSON.stringify({ type: 'discovery.scan', source: 'api', priority: 1 }) }).then((r) => r.json());
    assert.ok(job.jobId);
    assert.equal(job.status, 'QUEUED');
    const paused = await fetch(`${base}/api/fenix/jobs/${job.jobId}/pause`, { method: 'POST', headers }).then((r) => r.json());
    assert.equal(paused.status, 'PAUSED');
    const pausedAgain = await fetch(`${base}/api/fenix/jobs/${job.jobId}/pause`, { method: 'POST', headers }).then((r) => r.json());
    assert.equal(pausedAgain.status, 'PAUSED');
    const resumed = await fetch(`${base}/api/fenix/jobs/${job.jobId}/resume`, { method: 'POST', headers }).then((r) => r.json());
    assert.equal(resumed.status, 'QUEUED');
    const cancelled = await fetch(`${base}/api/fenix/jobs/${job.jobId}/cancel`, { method: 'POST', headers }).then((r) => r.json());
    assert.equal(cancelled.status, 'CANCELLED');
    const jobCheckpoints = await fetch(`${base}/api/fenix/jobs/${job.jobId}/checkpoints`, { headers }).then((r) => r.json());
    assert.ok(Array.isArray(jobCheckpoints.checkpoints));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try { fs.unlinkSync(dataFile); } catch {}
  }
});

test('FENIX SSE stream delivers canonical runtime events to browser message listeners', async () => {
  const dataFile = path.join(os.tmpdir(), `fenix-sse-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const server = await start(0, { dataFile, llm: false, bootstrapAdmin: { ...admin, tenantName: 'FENIX SSE', name: 'FENIX SSE', role: 'master_admin' } });
  try {
    const port = server.address().port;
    const login = await fetch(`http://127.0.0.1:${port}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(admin) }).then((r) => r.json());
    assert.ok(login.token);
    const inspector = await fetch(`http://127.0.0.1:${port}/api/city/npc/agent-architect/inspect`, { headers: { authorization: `Bearer ${login.token}` } });
    assert.equal(inspector.status, 200);
    assert.equal((await inspector.json()).success, true);
    const stream = await new Promise((resolve, reject) => {
      const req = http.request(`http://127.0.0.1:${port}/api/city/live-stream`, { method: 'GET', headers: { authorization: `Bearer ${login.token}` } }, (res) => {
        assert.equal(res.statusCode, 200);
        assert.match(String(res.headers['content-type']), /text\/event-stream/);
        let body = '';
        let emitted = false;
        const timer = setTimeout(() => { req.destroy(); reject(new Error('SSE runtime event timeout')); }, 3000);
        res.on('data', (chunk) => {
          body += chunk.toString();
          if (!emitted && body.includes('data: {"type":"connected"')) {
            emitted = true;
            void server.app.bus.emit('mission.step.started', { type: 'mission.step.started', tenantId: admin.tenantId, data: { missionId: 'mission-proof', stepKey: 'discover', jobId: 'job-proof' } });
          }
          if ((body.match(/data: \{"event":"mission\.step\.started"/g) || []).length >= 2) {
            clearTimeout(timer); req.destroy(); resolve(body);
          }
        });
      });
      req.on('error', (error) => { if (error.code !== 'ECONNRESET') reject(error); }); req.end();
    });
    assert.match(stream, /event: connected\ndata: \{"type":"connected","status":"CONNECTED"/);
    assert.match(stream, /event: mission\.step\.started\ndata: \{"event":"mission\.step\.started","type":"mission\.step\.started"[\s\S]*?\n\ndata: \{"event":"mission\.step\.started","type":"mission\.step\.started"/);
  } finally { await new Promise((resolve) => server.close(resolve)); try { fs.unlinkSync(dataFile); } catch {} }
});

test('FENIX WebSocket stream authenticates and forwards a real runtime event', async () => {
  const dataFile = path.join(os.tmpdir(), `fenix-ws-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const server = await start(0, { dataFile, llm: false, localRuntimeWorker: false, bootstrapAdmin: { ...admin, tenantName: 'FENIX WS', name: 'FENIX WS', role: 'master_admin' } });
  const base = `http://127.0.0.1:${server.address().port}`;
  let ws;
  try {
    const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(admin) }).then((r) => r.json());
    assert.ok(login.token);
    const messages = [];
    ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/events`, { headers: { authorization: `Bearer ${login.token}` } });
    const connectedPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket connected event timeout')), 3000);
      ws.on('message', (raw) => { const item = JSON.parse(raw.toString()); messages.push(item); if (item.type === 'runtime.connected') { clearTimeout(timer); resolve(item); } });
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket connection timeout')), 3000);
      ws.once('open', () => { clearTimeout(timer); resolve(); });
      ws.once('error', reject);
    });
    const connected = await connectedPromise;
    assert.equal(connected.payload.status, 'ok');
    const eventPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket runtime event timeout')), 3000);
      ws.on('message', (raw) => { const item = JSON.parse(raw.toString()); messages.push(item); if (item.type === 'test.runtime.event') { clearTimeout(timer); resolve(item); } });
    });
    await server.app.bus.emit('test.runtime.event', { agentId: 'Developer', source: 'contract-test' });
    const event = await eventPromise;
    assert.equal(event.type, 'test.runtime.event');
    assert.equal(event.payload.agentId, 'Developer');
    assert.ok(messages.length >= 2);
  } finally {
    if (ws && ws.readyState !== WebSocket.CLOSED) ws.terminate();
    await new Promise((resolve) => server.close(resolve));
    try { fs.unlinkSync(dataFile); } catch {}
  }
});

test('FENIX Project Kernel links a real mission and stale recovery requeues the same job', async () => {
  const dataFile = path.join(os.tmpdir(), `fenix-project-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const server = await start(0, { dataFile, llm: false, bootstrapAdmin: { ...admin, tenantName: 'FENIX Test', name: 'FENIX Test', role: 'master_admin' } });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(admin) }).then((r) => r.json());
    const headers = { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
    const project = await fetch(`${base}/api/fenix/projects`, { method: 'POST', headers, body: JSON.stringify({ id: 'crm-continuity', name: 'CRM continuity', workspace: process.cwd() }) }).then((r) => r.json());
    assert.equal(project.id, 'crm-continuity');
    const analysis = await fetch(`${base}/api/fenix/projects/crm-continuity/analyze`, { method: 'POST', headers }).then((r) => r.json());
    assert.equal(analysis.artifact.type, 'FENIX_PROJECT_STATE');
    const buildPlan = await fetch(`${base}/api/fenix/projects/crm-continuity/build`, { method: 'POST', headers, body: JSON.stringify({ objective: 'Build customer management system', modules: ['architecture', 'backend', 'database', 'frontend', 'tests'] }) }).then((r) => r.json());
    assert.equal(buildPlan.status, 'PLANNED_REQUIRES_AUTONOMOUS_AUTHORIZATION'); assert.equal(buildPlan.plan.modules.length, 5);
    const mission = await fetch(`${base}/api/fenix/missions`, { method: 'POST', headers, body: JSON.stringify({ projectId: 'crm-continuity', title: 'Continuity audit', objective: 'Audit project continuity', steps: [{ key: 'audit', type: 'audit', payload: { root: process.cwd() } }] }) }).then((r) => r.json());
    assert.ok(mission.missionId);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await fetch(`${base}/api/runtime/work`, { method: 'POST', headers, body: JSON.stringify({ limit: 10 }) });
    const state = await fetch(`${base}/api/fenix/projects/crm-continuity/state`, { headers }).then((r) => r.json());
    assert.equal(state.id, 'crm-continuity');
    assert.equal(state.missions.length, 2);
    assert.ok(state.artifacts.length >= 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try { fs.unlinkSync(dataFile); } catch {}
  }

  const app = await createApp({ dataFile: null, llm: false, bootstrapAdmin: { ...admin, tenantName: 'FENIX Recovery', name: 'FENIX Recovery', role: 'master_admin' } });
  try {
    await app.controlPlane.ensureDefaultTenant({ id: 'grg', name: 'GRG Recovery', actorId: 'grg-admin' });
    const bootstrapState = await app.store.read();
    const tenantId = bootstrapState.tenants[0]?.id || 'grg';
    const actorId = bootstrapState.memberships.find((item) => item.tenantId === tenantId)?.userId || 'admin';
    const job = await app.jobs.submit(tenantId, actorId, { type: 'discovery.scan', source: 'api', maxAttempts: 3 });
    await app.store.update((state) => { const current = state.runtimeJobs.find((item) => item.id === job.id); current.status = 'RUNNING'; current.currentStage = 'RUNNING'; current.workerId = 'dead-worker'; current.heartbeatAt = new Date(Date.now() - 120000).toISOString(); return state; });
    const recovered = await app.jobs.recoverStale(1000);
    assert.equal(recovered, 1);
    const after = await app.jobs.getInternal(tenantId, job.id);
    assert.equal(after.id, job.id);
    assert.equal(after.status, 'QUEUED');
    assert.equal(after.workerId, null);
  } finally { if (app.shutdown) await app.shutdown(); }
});
