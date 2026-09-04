const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { start } = require('../src/server');
const { createApp } = require('../src/app');

const admin = { tenantId: 'fenix-test', userId: 'fenix-test-admin', password: crypto.randomBytes(24).toString('base64url') };

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

test('FENIX SSE stream sends the connected event from a started server', async () => {
  const dataFile = path.join(os.tmpdir(), `fenix-sse-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const server = await start(0, { dataFile, llm: false, bootstrapAdmin: { ...admin, tenantName: 'FENIX SSE', name: 'FENIX SSE', role: 'master_admin' } });
  try {
    const port = server.address().port;
    const login = await fetch(`http://127.0.0.1:${port}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(admin) }).then((r) => r.json());
    assert.ok(login.token);
    const event = await new Promise((resolve, reject) => {
      const req = http.request(`http://127.0.0.1:${port}/api/v2/events/stream`, { method: 'GET', headers: { authorization: `Bearer ${login.token}` } }, (res) => {
        assert.equal(res.statusCode, 200);
        assert.match(String(res.headers['content-type']), /text\/event-stream/);
        let body = '';
        const timer = setTimeout(() => { req.destroy(); reject(new Error('SSE connected event timeout')); }, 3000);
        res.on('data', (chunk) => { body += chunk.toString(); if (body.includes('event: connected')) { clearTimeout(timer); req.destroy(); resolve(body); } });
      });
      req.on('error', (error) => { if (error.code !== 'ECONNRESET') reject(error); }); req.end();
    });
    assert.match(event, /data: \{"status":"CONNECTED"/);
  } finally { await new Promise((resolve) => server.close(resolve)); try { fs.unlinkSync(dataFile); } catch {} }
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
