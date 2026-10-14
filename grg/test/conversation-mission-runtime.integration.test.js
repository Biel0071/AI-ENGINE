'use strict';

process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createApp } = require('../src/app');
const { handleConversationRoutes } = require('../src/api/conversation-routes');

test('conversation task flows through real ProjectKernel, MissionKernel, approvals, JobEngine and memory', async () => {
  const previousWorkspaceRoot = process.env.FENIX_WORKSPACE_ROOT;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-conversation-runtime-'));
  const workspaceRoot = path.join(tempRoot, 'workspace');
  await fs.mkdir(workspaceRoot);
  await fs.writeFile(path.join(workspaceRoot, 'README.md'), '# Runtime test fixture\n');
  execFileSync('git', ['init'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Fênix Test'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'fenix-test@example.invalid'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['add', 'README.md'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'Create conversation runtime fixture'], { cwd: workspaceRoot, stdio: 'ignore' });
  process.env.FENIX_WORKSPACE_ROOT = workspaceRoot;

  let app;
  try {
    app = await createApp({ autoStartHeart: false, dataFile: path.join(tempRoot, 'state.json') });
    await app.controlPlane.createTenant({ id: 'tenant-a', name: 'Fênix runtime test' }, 'alice');
    await app.controlPlane.addMember('tenant-a', 'alice', { userId: 'bob', role: 'admin' });
    await app.projectKernel.create('tenant-a', 'alice', { id: 'fenix-os', name: 'Fênix OS', workspace: workspaceRoot });

    const request = { method: 'POST', async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify({ message: 'corrija o bug no Fênix', projectId: 'fenix-os' })); } };
    const response = {};
    const handled = await handleConversationRoutes(
      request, response, new URL('http://localhost/api/v2/conversation'),
      (res, status, body) => Object.assign(res, { status, body }),
      async (req) => { let raw = ''; for await (const chunk of req) raw += chunk; return JSON.parse(raw); },
      { tenantId: 'tenant-a', actorId: 'alice' }, app,
    );

    assert.equal(handled, true);
    assert.equal(response.status, 202);
    assert.equal(response.body.status, 'AWAITING_APPROVAL');
    assert.equal(response.body.jobId, null);
    assert.equal(response.body.mission.steps[0].type, 'dev-execute');

    await assert.rejects(
      () => app.missions.approveStep('tenant-a', 'alice', response.body.missionId, response.body.mission.steps[0].id, response.body.approval.id),
      /Requester cannot approve/
    );
    const approved = await app.missions.approveStep('tenant-a', 'bob', response.body.missionId, response.body.mission.steps[0].id, response.body.approval.id);
    const step = approved.steps[0];
    assert.ok(step.jobId);
    const job = await app.jobs.get('tenant-a', 'alice', step.jobId);
    assert.equal(job.missionId, approved.id);
    assert.equal(job.projectId, 'fenix-os');
    assert.ok(['QUEUED', 'RUNNING'].includes(job.status));
    const jobEvents = await app.jobs.eventsFor('tenant-a', 'alice', job.id);
    assert.ok(jobEvents.some((event) => event.type === 'runtime.job.queued' && event.data.conversationId === response.body.conversationId), 'queued job event should retain the originating conversation link');

    const history = await app.conversations.history('tenant-a', response.body.conversationId, { actorId: 'alice' });
    assert.deepEqual(history.map((item) => item.role), ['user', 'assistant']);
    const state = await app.store.read();
    assert.ok(state.missionContextRefs.some((item) => item.missionId === approved.id && item.ref === `conversation:${response.body.conversationId}`));
    assert.ok(state.memories.some((item) => item.provenance?.reference?.startsWith(`${response.body.conversationId}/`)));
  } finally {
    await app?.close();
    if (previousWorkspaceRoot === undefined) delete process.env.FENIX_WORKSPACE_ROOT;
    else process.env.FENIX_WORKSPACE_ROOT = previousWorkspaceRoot;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('read-only conversation audit completes a real job and persists verifiable mission memory across restart', async () => {
  const previousWorkspaceRoot = process.env.FENIX_WORKSPACE_ROOT;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-audit-runtime-'));
  const workspaceRoot = path.join(tempRoot, 'workspace');
  const dataFile = path.join(tempRoot, 'state.json');
  await fs.mkdir(workspaceRoot);
  await fs.writeFile(path.join(workspaceRoot, 'README.md'), '# Auditable Fênix fixture\n');
  execFileSync('git', ['init'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Fênix Test'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'fenix-test@example.invalid'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['add', 'README.md'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'Create auditable project fixture'], { cwd: workspaceRoot, stdio: 'ignore' });
  const expectedHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspaceRoot, encoding: 'utf8' }).trim();
  process.env.FENIX_WORKSPACE_ROOT = workspaceRoot;

  let app;
  try {
    app = await createApp({ autoStartHeart: false, dataFile });
    await app.controlPlane.createTenant({ id: 'tenant-a', name: 'Fênix runtime test' }, 'alice');
    await app.controlPlane.addMember('tenant-a', 'alice', { userId: 'bob', role: 'admin' });
    await app.projectKernel.create('tenant-a', 'alice', { id: 'fenix-os', name: 'Fênix OS', workspace: workspaceRoot });

    const request = { method: 'POST', async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify({ message: 'audite o sistema Fênix e confirme o estado real do repositório', projectId: 'fenix-os' })); } };
    const response = {};
    await handleConversationRoutes(
      request, response, new URL('http://localhost/api/v2/conversation'),
      (res, status, body) => Object.assign(res, { status, body }),
      async (req) => { let raw = ''; for await (const chunk of req) raw += chunk; return JSON.parse(raw); },
      { tenantId: 'tenant-a', actorId: 'alice' }, app,
    );

    assert.equal(response.status, 202);
    assert.equal(response.body.lane, 'MISSION_LANE');
    assert.equal(response.body.approval.required, false);
    assert.equal(response.body.job.status, 'QUEUED');
    const { missionId, jobId } = { missionId: response.body.mission.id, jobId: response.body.job.id };
    assert.ok(missionId && jobId);

    const executedJob = await app.jobs.run('tenant-a', jobId, 'audit-test-worker');
    assert.equal(executedJob.status, 'SUCCEEDED', JSON.stringify({ status: executedJob.status, error: executedJob.error, currentStage: executedJob.currentStage }));
    assert.equal(executedJob.result.head, expectedHead);
    assert.ok(executedJob.result.artifactId);

    const completedMission = await app.missions.get('tenant-a', 'alice', missionId);
    assert.equal(completedMission.status, 'SUCCEEDED');
    assert.equal(completedMission.steps[0].jobId, jobId);
    assert.match(completedMission.steps[0].resultHash, /^[a-f0-9]{64}$/);
    assert.equal(completedMission.summary.status, 'SUCCEEDED');

    const state = await app.store.read();
    const report = state.artifacts.find((item) => item.id === executedJob.result.artifactId);
    assert.ok(report?.content.includes(expectedHead), 'audit artifact must contain the actual repository HEAD');
    const capsule = state.knowledgeCapsules.find((item) => item.tenantId === 'tenant-a' && item.source === 'mission' && item.title === `Mission: ${completedMission.title}`);
    assert.ok(capsule, 'mission completion must create a durable knowledge capsule');
    assert.ok(capsule.content.includes(jobId), 'reusable memory must link the job that produced the result');
    assert.ok(capsule.content.includes(completedMission.steps[0].resultHash), 'reusable memory must link the verified job result hash');
    assert.ok(state.missionPlaybooks.some((item) => item.missionId === missionId), 'only completed execution may create a reusable playbook');
    assert.ok(state.missionBenchmarks.some((item) => item.missionId === missionId && item.status === 'SUCCEEDED'));

    await app.close();
    app = await createApp({ autoStartHeart: false, dataFile });
    const reloadedJob = await app.jobs.get('tenant-a', 'alice', jobId);
    const reloadedMission = await app.missions.get('tenant-a', 'alice', missionId);
    const reloadedState = await app.store.read();
    assert.equal(reloadedJob.status, 'SUCCEEDED');
    assert.equal(reloadedMission.status, 'SUCCEEDED');
    assert.ok(reloadedState.knowledgeCapsules.some((item) => item.id === capsule.id && item.content.includes(jobId)));
    assert.ok(reloadedState.missionPlaybooks.some((item) => item.id === state.missionPlaybooks.find((playbook) => playbook.missionId === missionId).id));
  } finally {
    await app?.close();
    if (previousWorkspaceRoot === undefined) delete process.env.FENIX_WORKSPACE_ROOT;
    else process.env.FENIX_WORKSPACE_ROOT = previousWorkspaceRoot;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
