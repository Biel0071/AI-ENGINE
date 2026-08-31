'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { MemoryStore, FileStore } = require('../src/kernel/store');
const { CentralOrchestrator, validateExternalEvidence } = require('../src/orchestrator/central-orchestrator');
const { OrchestrationRepository } = require('../src/orchestrator/orchestration-repository');
const { LearningEngine } = require('../src/knowledge/learning-engine');

function successfulJob(id = 'job-1') {
  return {
    id, status: 'SUCCEEDED',
    artifacts: [{ type: 'worktree', path: 'isolated', source: 'source', branch: `fenix/${id}` }],
    tests: [{ name: 'behavior', status: 'PASS', durationMs: 5 }],
    validation: { passed: true, changedFiles: ['M app.js'] },
    result: { status: 'READY_FOR_REVIEW' },
  };
}

function createHarness(outcomes, store = new MemoryStore(), polled = []) {
  const submitted = []; const rollbacks = [];
  const jobs = {
    async submit(tenantId, actorId, input) {
      const job = { id: `job-${submitted.length + 1}`, tenantId, actorId, ...input };
      submitted.push(job); return job;
    },
    async run() { const outcome = outcomes.shift(); return typeof outcome === 'function' ? outcome() : outcome; },
    async getInternal() { const outcome = polled.shift(); return typeof outcome === 'function' ? outcome() : outcome; },
    async cancel(tenantId, actorId, jobId) { return { tenantId, actorId, id: jobId, status: 'CANCELLED' }; },
    async rollbackJob(tenantId, actorId, jobId, executor) {
      rollbacks.push({ tenantId, actorId, jobId });
      await executor({ id: jobId, artifacts: [{ type: 'worktree' }] });
      return { rollback: { status: 'COMPLETED', jobId } };
    },
  };
  const episodes = [];
  const orchestrator = new CentralOrchestrator({
    store, jobs, devPipeline: { async rollback(job) { return { removed: job.id }; } },
    eventBus: { async emit() {} }, knowledgeEngine: { episodicMemory: { async recordEpisode(id, value) { episodes.push({ id, value }); } } },
    maxRepairAttempts: 3,
    jobPollMs: 10,
    projectScanner: async () => ({ files: { total: 2 }, stack: ['node'], screens: [] }),
  });
  return { orchestrator, jobs, submitted, rollbacks, episodes };
}

test('orchestration persistence survives transient PostgreSQL serialization exhaustion', async () => {
  const memory = new MemoryStore();
  let failures = 2;
  const store = {
    read: (...args) => memory.read(...args),
    async update(...args) {
      if (failures > 0) {
        failures -= 1;
        const error = new Error('could not serialize access due to concurrent update');
        error.code = '40001';
        throw error;
      }
      return memory.update(...args);
    },
  };
  const repository = new OrchestrationRepository(store, { writeAttempts: 3, writeBaseDelayMs: 10 });
  await repository.createRequest({ id: 'request-retry', tenantId: 'tenant-retry' });
  assert.equal((await repository.getRequest('tenant-retry', 'request-retry')).id, 'request-retry');
  assert.equal(failures, 0);
});

test('central orchestrator persists request, task plan, behavioral evidence and learning', async () => {
  const root = path.resolve('fixture-project');
  const harness = createHarness([successfulJob()]);
  const request = await harness.orchestrator.ingestRequest({ userIntent: 'add verified behavior', project: { id: 'fixture', path: root } }, { tenantId: 'tenant-a', actorId: 'owner' });
  await harness.orchestrator.waitForRequest(request.id);
  const persistedRequest = await harness.orchestrator.getRequest('tenant-a', request.id);
  const mission = await harness.orchestrator.getMission('tenant-a', persistedRequest.missionId);
  const events = await harness.orchestrator.getEvents('tenant-a', request.id);
  assert.equal(persistedRequest.status, 'COMPLETED');
  assert.equal(mission.status, 'COMPLETED');
  assert.equal(mission.validation.passed, true);
  assert.equal(mission.validation.gatesRun, 1);
  assert.equal(mission.tasks.every((task) => task.status === 'COMPLETED'), true);
  assert.equal(harness.submitted[0].type, 'development.execute');
  assert.equal(harness.submitted[0].workspace, path.resolve(root));
  assert.ok(events.some((event) => event.type === 'specification.generated'));
  assert.ok(events.some((event) => event.type === 'mission.completed'));
  assert.equal(harness.episodes.length, 1);
});

test('central orchestrator awaits the canonical job when BullMQ wins the claim race', async () => {
  const harness = createHarness([null], new MemoryStore(), [
    { id: 'job-1', status: 'RUNNING' },
    successfulJob('job-1'),
  ]);
  const request = await harness.orchestrator.ingestRequest({ userIntent: 'handle queue claim race', project: path.resolve('fixture-project') }, { tenantId: 'tenant-queue', actorId: 'owner' });
  await harness.orchestrator.waitForRequest(request.id);
  const persisted = await harness.orchestrator.getRequest('tenant-queue', request.id);
  const mission = await harness.orchestrator.getMission('tenant-queue', persisted.missionId);
  assert.equal(persisted.status, 'COMPLETED');
  assert.equal(mission.status, 'COMPLETED');
  assert.equal(mission.jobIds.length, 1);
});

test('explicit file paths become narrow context and an execution allowlist', async () => {
  const harness = createHarness([successfulJob()]);
  const request = await harness.orchestrator.ingestRequest({
    userIntent: 'Create scripts/fenix-probe.js and change no other file.',
    project: path.resolve('fixture-project'),
    constraints: ['Only scripts/fenix-probe.js may change'],
  }, { tenantId: 'tenant-hints', actorId: 'owner' });
  await harness.orchestrator.waitForRequest(request.id);
  assert.deepEqual(harness.submitted[0].policy.allowedPaths, ['scripts/fenix-probe.js']);
  assert.deepEqual(harness.submitted[0].payload.context.sourceFiles, ['scripts/fenix-probe.js']);
});

test('cancellation between failed attempt and repair cannot submit a duplicate job', async () => {
  const failed = successfulJob('job-1');
  failed.status = 'DEAD_LETTER'; failed.tests = []; failed.validation = null;
  const harness = createHarness([failed, successfulJob('job-2')]);
  let releaseRollback; let rollbackStarted = false;
  const pendingRollback = new Promise((resolve) => { releaseRollback = resolve; });
  harness.jobs.rollbackJob = async (tenantId, actorId, jobId, executor) => {
    rollbackStarted = true;
    await pendingRollback;
    await executor({ id: jobId, artifacts: [{ type: 'worktree' }] });
    return { rollback: { status: 'COMPLETED', jobId } };
  };
  const request = await harness.orchestrator.ingestRequest({ userIntent: 'cancel before repair', project: path.resolve('fixture-project') }, { tenantId: 'tenant-cancel-repair', actorId: 'owner' });
  while (!rollbackStarted) await new Promise((resolve) => setTimeout(resolve, 1));
  await harness.orchestrator.cancelRequest('tenant-cancel-repair', request.id);
  releaseRollback();
  await harness.orchestrator.waitForRequest(request.id);
  const persisted = await harness.orchestrator.getRequest('tenant-cancel-repair', request.id);
  const mission = await harness.orchestrator.getMission('tenant-cancel-repair', persisted.missionId);
  assert.equal(persisted.status, 'CANCELLED');
  assert.equal(mission.status, 'CANCELLED');
  assert.equal(harness.submitted.length, 1);
});

test('failed behavioral gate triggers rollback and a repair attempt before completion', async () => {
  const root = path.resolve('fixture-project');
  const failed = successfulJob('job-1');
  failed.status = 'DEAD_LETTER'; failed.tests[0].status = 'FAIL'; failed.validation.passed = false;
  const harness = createHarness([failed, successfulJob('job-2')]);
  const request = await harness.orchestrator.ingestRequest({ userIntent: 'repair until verified', project: root }, { tenantId: 'tenant-b', actorId: 'owner' });
  await harness.orchestrator.waitForRequest(request.id);
  const persistedRequest = await harness.orchestrator.getRequest('tenant-b', request.id);
  const mission = await harness.orchestrator.getMission('tenant-b', persistedRequest.missionId);
  assert.equal(mission.status, 'COMPLETED');
  assert.equal(mission.attempt, 2);
  assert.deepEqual(mission.jobIds, ['job-1', 'job-2']);
  assert.equal(harness.rollbacks.length, 1);
  assert.match(harness.submitted[1].prompt, /REPAIR CONTEXT FROM ATTEMPT 1/);
});

test('health-only or empty external result cannot complete a mission', () => {
  const validation = validateExternalEvidence({ validation: { passed: true, health: 'ready' }, tests: [], changedFiles: [] });
  assert.equal(validation.passed, false);
  assert.match(validation.failureReason, /requires changedFiles/);
});

test('requests, missions and events survive a canonical FileStore restart', async () => {
  const stateFile = path.join(os.tmpdir(), `fenix-orchestration-state-${process.pid}-${Date.now()}.json`);
  try {
    const first = createHarness([successfulJob()], new FileStore(stateFile));
    const request = await first.orchestrator.ingestRequest({ userIntent: 'persist outcome', project: path.resolve('fixture-project') }, { tenantId: 'tenant-c', actorId: 'owner' });
    await first.orchestrator.waitForRequest(request.id);

    const restarted = createHarness([], new FileStore(stateFile));
    const persistedRequest = await restarted.orchestrator.getRequest('tenant-c', request.id);
    const persistedMission = await restarted.orchestrator.getMission('tenant-c', persistedRequest.missionId);
    const persistedEvents = await restarted.orchestrator.getEvents('tenant-c', request.id);
    assert.equal(persistedRequest.status, 'COMPLETED');
    assert.equal(persistedMission.status, 'COMPLETED');
    assert.ok(persistedEvents.length >= 7);
  } finally {
    fs.rmSync(stateFile, { force: true });
  }
});

test('mission failure reflection uses the canonical AI Gateway invoke contract', async () => {
  const saved = []; let invocation = null;
  const experienceStore = { async set(id, value) { saved.push({ id, value }); } };
  const patternStore = { async find() { return []; }, async set() {} };
  const aiRouter = {
    async invoke(tenantId, actorId, request) {
      invocation = { tenantId, actorId, request };
      return { text: JSON.stringify({ reason: 'gate failed', pattern: 'repair-after-gate', recommended: false, avoid: true }) };
    },
  };
  const learning = new LearningEngine(experienceStore, patternStore, null, aiRouter);
  await learning.handleMissionEnd(false, { payload: { mission: { id: 'm-1', tenantId: 'tenant-d', actorId: 'owner', name: 'repair', success: false, testStatus: 'FAIL' } } });
  assert.equal(invocation.tenantId, 'tenant-d');
  assert.equal(invocation.actorId, 'owner');
  assert.equal(invocation.request.taskType, 'plan');
  assert.equal(saved[0].value.reason, 'gate failed');
  assert.equal(saved[0].value.result, 'FAILED');
});

test('cancelling a request cannot be overwritten by a late successful job', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const harness = createHarness([() => pending]);
  const request = await harness.orchestrator.ingestRequest({ userIntent: 'cancel safely', project: path.resolve('fixture-project') }, { tenantId: 'tenant-e', actorId: 'owner' });
  let assigned; let active;
  while (!active?.activeJobId) {
    assigned = await harness.orchestrator.getRequest('tenant-e', request.id);
    active = assigned.missionId ? await harness.orchestrator.getMission('tenant-e', assigned.missionId) : null;
    if (!active?.activeJobId) await new Promise((resolve) => setTimeout(resolve, 1));
  }
  await harness.orchestrator.cancelRequest('tenant-e', request.id);
  release(successfulJob('job-1'));
  await harness.orchestrator.waitForRequest(request.id);
  const persistedRequest = await harness.orchestrator.getRequest('tenant-e', request.id);
  const mission = await harness.orchestrator.getMission('tenant-e', assigned.missionId);
  assert.equal(persistedRequest.status, 'CANCELLED');
  assert.equal(mission.status, 'CANCELLED');
  assert.equal(mission.rollback.status, 'COMPLETED');
});
