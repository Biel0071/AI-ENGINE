'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { start } = require('../src/server');

test('approving a red mission from the authenticated API dispatches its persistent job', async () => {
  const tenantId = `approval-http-${crypto.randomBytes(4).toString('hex')}`;
  const owner = { tenantId, userId: `${tenantId}-owner`, password: crypto.randomBytes(24).toString('base64url') };
  const approver = { tenantId, userId: `${tenantId}-reviewer`, password: crypto.randomBytes(24).toString('base64url') };
  const dataFile = path.join(os.tmpdir(), `fenix-approval-${crypto.randomBytes(6).toString('hex')}.json`);
  const server = await start(0, {
    dataFile,
    llm: false,
    localRuntimeWorker: false,
    autonomousLoop: false,
    worldSimulation: false,
    bootstrapAdmin: { ...owner, tenantName: 'Approval HTTP Test', name: 'Owner', role: 'master_admin' },
  });
  const app = server.app;
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    await app.controlPlane.addMember(tenantId, owner.userId, { userId: approver.userId, role: 'admin' });
    await app.auth.ensureUser(tenantId, approver.userId, approver.password, 'admin', 'Reviewer');
    const mission = await app.missions.create(tenantId, owner.userId, {
      title: 'HTTP approval dispatch',
      objective: 'Dispatch a governed development job after independent approval',
      steps: [{ key: 'execute', type: 'dev-execute', payload: { prompt: 'Inspect the requested change' } }],
    });
    const waiting = await app.missions.start(tenantId, owner.userId, mission.id);
    const step = waiting.steps[0];
    assert.equal(step.status, 'AWAITING_APPROVAL');

    const ownerLogin = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(owner) }).then((response) => response.json());
    const approverLogin = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(approver) }).then((response) => response.json());
    const approve = (token) => fetch(`${base}/api/approvals/${encodeURIComponent(step.approvalId)}/approve`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}',
    });

    const wrongApproval = await fetch(`${base}/api/missions/${mission.id}/steps/${step.id}/approve`, {
      method: 'POST', headers: { authorization: `Bearer ${approverLogin.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ approvalId: 'unrelated-approval' }),
    });
    assert.equal(wrongApproval.status, 400);
    assert.equal((await app.approvals.get(tenantId, step.approvalId)).status, 'pending');

    const selfApproval = await approve(ownerLogin.token);
    assert.equal(selfApproval.status, 403);
    assert.equal((await app.approvals.get(tenantId, step.approvalId)).status, 'pending');

    const approvalResponse = await approve(approverLogin.token);
    assert.equal(approvalResponse.status, 202);
    const result = await approvalResponse.json();
    assert.equal(result.status, 'consumed');
    assert.equal(result.mission.id, mission.id);
    assert.ok(result.jobId);
    const dispatched = result.mission.steps.find((item) => item.id === step.id);
    assert.equal(dispatched.jobId, result.jobId);
    assert.equal(dispatched.status, 'DISPATCHED');

    const job = await app.jobs.get(tenantId, owner.userId, result.jobId);
    assert.equal(job.missionId, mission.id);
    assert.ok(['QUEUED', 'RUNNING'].includes(job.status));
    const repeated = await approve(approverLogin.token);
    assert.equal(repeated.status, 202);
    assert.equal((await repeated.json()).jobId, result.jobId);
    const state = await app.store.read();
    assert.ok(state.missionEvents.some((event) => event.missionId === mission.id && event.type === 'mission.step.approved'));
    assert.ok(state.missionEvents.some((event) => event.missionId === mission.id && event.type === 'mission.step.dispatched'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try { fs.unlinkSync(dataFile); } catch {}
  }
});
