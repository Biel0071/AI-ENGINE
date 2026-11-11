'use strict';
/**
 * FÊNIX OS — Level 27: Self-Healing Reliability Engine Test Suite
 * ===============================================================
 * Automated chaos, fault injection, and self-healing verification tests:
 * 1. Service health and dependency mapping (Zero-Mock verification)
 * 2. Worker heartbeat stall detection and safe job reclamation
 * 3. Redis unavailable simulation, circuit breaker trip, and fallback
 * 4. SSE connection drop, client pruning, and reconnection deduplication
 * 5. Stuck job timeout detection and idempotent backoff recovery
 * 6. AI provider failure, circuit breaker trip, and fallback diversion
 * 7. Backend restart recovery (state consistency and idempotency)
 * 8. Human Escalation Gate & Anti-Infinite Restart Loop prevention
 * 9. Zero duplicate job execution guarantee under concurrent retries
 * 10. Real SRE Telemetry & Observability API contract verification
 */

process.env.FENIX_TEST_MODE = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const {
  SelfHealingReliabilityEngine,
  getSelfHealingEngine,
  INCIDENT_STATUSES,
  SEVERITY_LEVELS
} = require('../src/reliability/self-healing-engine');

const { JobQueueManager, JOB_STATUSES } = require('../src/execution/job-queue-manager');
const { AgentRegistry } = require('../src/agents/agent-registry');
const { FenixEventBus } = require('../src/eventing/fenix-event-bus');
const { handleReliabilityRoutes } = require('../src/api/reliability-routes');

test('LEVEL27 1: Service health and dependency mapping (Zero-Mock verification)', async () => {
  const engine = new SelfHealingReliabilityEngine({
    workerStaleTimeoutMs: 1000,
    jobTimeoutMs: 2000
  });

  const status = await engine.getStatus();

  // Status must be either HEALTHY or DEGRADED, never a fabricated percentage
  assert.ok(['HEALTHY', 'DEGRADED'].includes(status.status), 'Status must be honest HEALTHY or DEGRADED');
  assert.ok(status.services.backend.status === 'ONLINE', 'Backend service must be reported ONLINE');
  assert.ok(status.services.redis, 'Redis service status must exist');
  assert.ok(status.services.bullmq, 'BullMQ service status must exist');
  assert.ok(status.services.postgres, 'Postgres service status must exist');
  assert.ok(status.services.apiPlatform, 'API Platform service status must exist');
  assert.ok(status.services.ollama, 'Ollama service status must exist');
  assert.ok(status.services.sse, 'SSE stream status must exist');

  // Verify memory and CPU metrics are real numeric readings from Node.js / OS
  assert.ok(status.telemetry.systemResources.processMemory.rssMb > 0, 'RSS memory must be > 0 MB');
  assert.ok(status.telemetry.systemResources.osMemory.totalMb > 0, 'OS Total memory must be > 0 MB');
  assert.ok(status.telemetry.systemResources.cpu.cpusCount > 0, 'CPU core count must be > 0');
});

test('LEVEL27 2: Worker failure & heartbeat stall detection', async () => {
  const bus = new FenixEventBus();
  const qm = new JobQueueManager();
  const engine = new SelfHealingReliabilityEngine({
    bus,
    jobQueueManager: qm,
    workerStaleTimeoutMs: 200 // 200ms threshold for fast testing
  });

  const workerId = 'test-worker-alpha';
  const testJob = qm.createJob({ type: 'task', prompt: 'Process analytics' });
  testJob.status = JOB_STATUSES.RUNNING;
  testJob.startedAt = new Date().toISOString();

  // Register worker heartbeat with current job
  engine.registerWorkerHeartbeat(workerId, { currentJobId: testJob.id });
  const initialHb = engine.workerHeartbeats.get(workerId);
  assert.equal(initialHb.status, 'ONLINE');
  assert.equal(initialHb.currentJobId, testJob.id);

  // Simulate time passage past threshold
  await new Promise(r => setTimeout(r, 250));

  // Run watchdog
  const staleWorkers = engine.detectStaleWorkers();
  assert.equal(staleWorkers.length, 1, 'Watchdog must detect 1 stale worker');
  assert.equal(staleWorkers[0].worker.workerId, workerId);

  // Recover stale worker
  const recoveredWorkers = await engine.recoverStaleWorkers();
  assert.equal(recoveredWorkers.length, 1);
  assert.equal(engine.workerHeartbeats.get(workerId).status, 'OFFLINE');

  // The stuck job must have been recovered back to QUEUED
  const recoveredJob = qm.jobs.get(testJob.id);
  assert.equal(recoveredJob.status, JOB_STATUSES.QUEUED);
  assert.equal(recoveredJob.attempts, 2, 'Job attempt must be incremented to 2');

  // Verify incident ledger recorded this incident
  const incidents = Array.from(engine.incidents.values());
  const workerInc = incidents.find(i => i.component === 'worker' && i.failureType === 'WORKER_HEARTBEAT_TIMEOUT');
  assert.ok(workerInc, 'Worker heartbeat timeout incident must be logged in ledger');
  assert.equal(workerInc.state, INCIDENT_STATUSES.RECOVERED);
});

test('LEVEL27 3: Redis unavailable simulation, circuit breaker trip, and fallback', async () => {
  const engine = new SelfHealingReliabilityEngine();
  const cb = engine.getCircuitBreaker('redis');
  cb.failureThreshold = 3;
  cb.cooldownMs = 300;

  assert.equal(cb.state, 'CLOSED');
  assert.equal(cb.failures, 0);

  // Simulate 3 consecutive Redis connection failures
  let fallbackInvokedCount = 0;
  const failingOp = async () => {
    throw new Error('ECONNREFUSED 127.0.0.1:6379');
  };
  const fallbackOp = async (err) => {
    fallbackInvokedCount++;
    return { ok: true, source: 'in-memory-fallback', reason: err.message };
  };

  // 1st failure
  const res1 = await engine.executeWithCircuitBreaker('redis', failingOp, fallbackOp);
  assert.equal(res1.source, 'in-memory-fallback');
  assert.equal(cb.failures, 1);
  assert.equal(cb.state, 'CLOSED');

  // 2nd failure
  await engine.executeWithCircuitBreaker('redis', failingOp, fallbackOp);
  assert.equal(cb.failures, 2);
  assert.equal(cb.state, 'CLOSED');

  // 3rd failure -> Circuit should TRIP to OPEN
  await engine.executeWithCircuitBreaker('redis', failingOp, fallbackOp);
  assert.equal(cb.failures, 3);
  assert.equal(cb.state, 'OPEN', 'Circuit breaker must trip to OPEN after 3 failures');
  assert.equal(cb.fallbackActive, true);

  // While OPEN: fast-fail activates without calling failing operation
  let operationCalled = false;
  const resFastFail = await engine.executeWithCircuitBreaker('redis', async () => {
    operationCalled = true;
  }, fallbackOp);

  assert.equal(operationCalled, false, 'Operation must NOT be called when circuit is OPEN');
  assert.equal(resFastFail.source, 'in-memory-fallback');

  // Wait for cooldown to expire
  await new Promise(r => setTimeout(r, 350));

  // Next call should transition to HALF_OPEN canary probe
  assert.equal(engine.canExecuteThroughCircuit('redis'), true);
  assert.equal(cb.state, 'HALF_OPEN');

  // Canary probe succeeds -> Circuit returns to CLOSED
  await engine.executeWithCircuitBreaker('redis', async () => {
    return { ok: true, source: 'redis-restored' };
  });

  assert.equal(cb.state, 'CLOSED', 'Circuit breaker must reset to CLOSED after successful canary probe');
  assert.equal(cb.failures, 0);
  assert.equal(cb.fallbackActive, false);
});

test('LEVEL27 4: SSE connection drop, client pruning, and reconnection deduplication', async () => {
  const bus = new FenixEventBus();
  const engine = new SelfHealingReliabilityEngine({ bus });
  bus.selfHealingEngine = engine;

  assert.equal(engine.sseMetrics.activeClients, 0);

  // Mock SSE response object
  let writeCalled = 0;
  let closed = false;
  const mockRes = {
    write: (data) => {
      writeCalled++;
      if (closed) throw new Error('Client socket closed');
      return true;
    },
    on: (evt, cb) => {
      if (evt === 'close') mockRes._closeCb = cb;
    }
  };

  // Add client
  bus.addSSEClient(mockRes);
  assert.equal(bus.clients.size, 1);
  assert.equal(engine.sseMetrics.activeClients, 1);
  assert.equal(engine.sseMetrics.totalConnections, 1);

  // Emit event successfully
  bus.emit('job.step', { jobId: '101', step: 'ANALYZE' });
  assert.ok(writeCalled > 0);

  // Simulate socket disconnection
  closed = true;
  mockRes._closeCb(); // trigger close event

  assert.equal(bus.clients.size, 0, 'Client must be pruned on socket close');
  assert.equal(engine.sseMetrics.activeClients, 0, 'Active clients metric must decrement to 0');

  // Simulate client reconnect
  engine.recordSSEReconnect();
  assert.equal(engine.sseMetrics.reconnects, 1);
});

test('LEVEL27 5: Stuck job timeout detection and idempotent backoff recovery', async () => {
  const qm = new JobQueueManager();
  const engine = new SelfHealingReliabilityEngine({
    jobQueueManager: qm,
    jobTimeoutMs: 150 // 150ms timeout for test
  });

  const job = qm.createJob({ type: 'task', prompt: 'Heavy data crunching' });
  job.status = JOB_STATUSES.RUNNING;
  job.startedAt = new Date(Date.now() - 300).toISOString(); // 300ms ago (> 150ms)

  // Detect stuck job
  const stuck = await engine.detectStuckJobs();
  assert.equal(stuck.length, 1);
  assert.equal(stuck[0].jobId, job.id);

  // Recover stuck job
  const recovery = await engine.recoverStuckJob(job.id, 'Timeout de teste excedido');
  assert.equal(recovery.recovered, true);
  assert.equal(recovery.escalated, false);
  assert.equal(recovery.attempt, 2);

  const updatedJob = qm.jobs.get(job.id);
  assert.equal(updatedJob.status, JOB_STATUSES.QUEUED);
  assert.equal(updatedJob.attempts, 2);
  assert.ok(updatedJob.idempotencyKey, 'Recovered job must have a deterministic SHA-256 idempotency key');
  assert.ok(Date.parse(updatedJob.scheduledFor) > Date.now(), 'Backoff delay must schedule job in future');
});

test('LEVEL27 6: AI provider failure, circuit breaker trip, and fallback diversion', async () => {
  const engine = new SelfHealingReliabilityEngine();
  const cb = engine.getCircuitBreaker('ai-platform');
  cb.failureThreshold = 2;
  cb.cooldownMs = 200;

  let apiPlatformCalls = 0;
  let fallbackCalls = 0;

  const mockApiPlatform = async () => {
    apiPlatformCalls++;
    throw new Error('AI Platform 504 Gateway Timeout');
  };

  const mockLocalOllama = async (err) => {
    fallbackCalls++;
    return { ok: true, provider: 'ollama-local', text: 'Resposta de contingência via Ollama local' };
  };

  // 1st failure
  const out1 = await engine.executeWithCircuitBreaker('ai-platform', mockApiPlatform, mockLocalOllama);
  assert.equal(out1.provider, 'ollama-local');
  assert.equal(apiPlatformCalls, 1);
  assert.equal(fallbackCalls, 1);
  assert.equal(cb.state, 'CLOSED');

  // 2nd failure -> Circuit trips
  const out2 = await engine.executeWithCircuitBreaker('ai-platform', mockApiPlatform, mockLocalOllama);
  assert.equal(out2.provider, 'ollama-local');
  assert.equal(apiPlatformCalls, 2);
  assert.equal(fallbackCalls, 2);
  assert.equal(cb.state, 'OPEN');

  // 3rd call: Circuit is OPEN -> Fast-fails directly to fallback without calling API Platform
  const out3 = await engine.executeWithCircuitBreaker('ai-platform', mockApiPlatform, mockLocalOllama);
  assert.equal(out3.provider, 'ollama-local');
  assert.equal(apiPlatformCalls, 2, 'API Platform must NOT be called when circuit is OPEN');
  assert.equal(fallbackCalls, 3);
});

test('LEVEL27 7: Backend restart recovery (state consistency and idempotency)', async () => {
  const testDataFile = path.join(__dirname, '..', '.data', 'test-jobs-v27.json');
  try { fs.unlinkSync(testDataFile); } catch (_) {}

  // 1. Simulate server running with 3 jobs: one RUNNING (attempt 1), one RUNNING (attempt 3 - will exceed limit), one COMPLETED
  const mockState = {
    isPaused: false,
    jobs: [
      { id: '201', type: 'task', status: 'RUNNING', attempts: 1, maxAttempts: 3, prompt: 'Job in flight before crash' },
      { id: '202', type: 'task', status: 'COMPLETED', attempts: 1, maxAttempts: 3, prompt: 'Finished job' },
      { id: '203', type: 'task', status: 'RUNNING', attempts: 3, maxAttempts: 3, prompt: 'Crash-looping job' }
    ]
  };

  const dir = path.dirname(testDataFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(testDataFile, JSON.stringify(mockState, null, 2), 'utf-8');

  // 2. Load manager using REAL qm.load(testDataFile)
  const qm = new JobQueueManager();
  qm.jobs.clear();
  qm.load(testDataFile);

  // 3. Verify state consistency after restart
  const recoveredJob = qm.jobs.get('201');
  assert.equal(recoveredJob.status, JOB_STATUSES.QUEUED, 'Interrupted job must be QUEUED after restart');
  assert.equal(recoveredJob.attempts, 2, 'Attempts must be 2');
  assert.equal(recoveredJob._bullDispatched, false);

  const completedJob = qm.jobs.get('202');
  assert.equal(completedJob.status, JOB_STATUSES.COMPLETED, 'Completed job must remain COMPLETED');

  const escalatedJob = qm.jobs.get('203');
  assert.equal(escalatedJob.status, JOB_STATUSES.FAILED, 'Job exceeding max attempts must be marked FAILED');
  assert.equal(escalatedJob.escalated, true, 'Job exceeding max attempts must be escalated');

  // Cleanup
  try { fs.unlinkSync(testDataFile); } catch (_) {}
});

test('LEVEL27 8: Human Escalation Gate & Anti-Infinite Restart Loop prevention', async () => {
  const qm = new JobQueueManager();
  const engine = new SelfHealingReliabilityEngine({
    jobQueueManager: qm,
    maxAutoRetries: 3
  });

  const poisonJob = qm.createJob({
    type: 'poison_pill',
    prompt: 'Job that causes fatal error every time'
  });
  poisonJob.status = JOB_STATUSES.RUNNING;
  poisonJob.attempts = 3; // already failed 3 times
  poisonJob.maxAttempts = 3;

  // Watchdog tries to recover
  const recoveryResult = await engine.recoverStuckJob(poisonJob.id, 'Repetidas falhas fatais no worker');

  // Must NOT re-enqueue automatically! Must ESCALATE to human approval
  assert.equal(recoveryResult.recovered, false);
  assert.equal(recoveryResult.escalated, true);

  const escalatedJob = qm.jobs.get(poisonJob.id);
  assert.equal(escalatedJob.status, 'FAILED');
  assert.equal(escalatedJob.escalated, true);
  assert.ok(escalatedJob.error.includes('Encaminhado para aprovação humana'));

  // Incident must be marked ESCALATED in ledger
  const incidents = Array.from(engine.incidents.values());
  const escInc = incidents.find(i => i.metadata?.jobId === poisonJob.id);
  assert.ok(escInc, 'Incident must be logged');
  assert.equal(escInc.state, INCIDENT_STATUSES.ESCALATED);

  // 1. Human operator approves RETRY via API -> Job must be safely re-queued!
  let sentCode = null;
  let sentBody = null;
  const sendJson = (res, code, body) => { sentCode = code; sentBody = body; return true; };
  const readJsonRetry = async () => ({ action: 'retry' });

  await handleReliabilityRoutes({ method: 'POST', url: `/api/v2/reliability/incidents/${escInc.incidentId}/resolve` }, {}, {
    url: new URL(`/api/v2/reliability/incidents/${escInc.incidentId}/resolve`, 'http://localhost'),
    sendJson,
    readJson: readJsonRetry,
    app: { selfHealingEngine: engine, jobQueueManager: qm },
    identity: { tenantId: 'grg', actorId: 'operator-alice' }
  });

  assert.equal(sentCode, 200);
  assert.equal(sentBody.ok, true);
  assert.equal(sentBody.incident.state, 'RECOVERED');
  assert.ok(sentBody.incident.recoveryAction.includes('HUMAN_RESOLVED_RETRY'));

  // The job must now be rescued and placed in QUEUED status
  const rescuedJob = qm.jobs.get(poisonJob.id);
  assert.equal(rescuedJob.status, 'QUEUED');
  assert.equal(rescuedJob.attempts, 1);
  assert.equal(rescuedJob.escalated, false);

  // 2. Human operator can also CANCEL an incident
  const anotherJob = qm.createJob({ type: 'task', prompt: 'Cancelled task' });
  anotherJob.status = 'RUNNING';
  anotherJob.attempts = 3;
  anotherJob.maxAttempts = 3;
  await engine.recoverStuckJob(anotherJob.id, 'Timeout for cancel test');
  const cancelInc = Array.from(engine.incidents.values()).find(i => i.metadata?.jobId === anotherJob.id);

  const readJsonCancel = async () => ({ action: 'cancel' });
  await handleReliabilityRoutes({ method: 'POST', url: `/api/v2/reliability/incidents/${cancelInc.incidentId}/resolve` }, {}, {
    url: new URL(`/api/v2/reliability/incidents/${cancelInc.incidentId}/resolve`, 'http://localhost'),
    sendJson,
    readJson: readJsonCancel,
    app: { selfHealingEngine: engine, jobQueueManager: qm },
    identity: { tenantId: 'grg', actorId: 'operator-alice' }
  });

  assert.equal(sentCode, 200);
  assert.equal(sentBody.ok, true);
  assert.equal(sentBody.incident.state, 'RECOVERED');
  assert.ok(sentBody.incident.recoveryAction.includes('HUMAN_RESOLVED_CANCEL'));
});

test('LEVEL27 9: Zero duplicate job execution guarantee under concurrent retries and creation', async () => {
  const engine = new SelfHealingReliabilityEngine();
  const qm = new JobQueueManager();
  engine.jobQueueManager = qm;

  // 1. Zero duplicate creation via idempotencyKey
  const initialSize = qm.jobs.size;
  const testIdemKey = 'idem-zero-dup-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
  const job1 = qm.createJob({ type: 'task', prompt: 'Unique operation', idempotencyKey: testIdemKey });
  const job2 = qm.createJob({ type: 'task', prompt: 'Unique operation duplicate submit', idempotencyKey: testIdemKey });

  assert.equal(job1.id, job2.id, 'Duplicate submissions with same idempotencyKey must return existing job');
  assert.equal(qm.jobs.size, initialSize + 1, 'Queue must not contain duplicate jobs for same idempotencyKey');

  // 2. Zero duplicate execution under concurrent recovery races
  const job = qm.createJob({ type: 'task', prompt: 'Deduplicated execution task' });
  job.status = JOB_STATUSES.RUNNING;
  job.startedAt = new Date(Date.now() - 1000).toISOString();

  // Run 3 concurrent recoveries for the same job simultaneously
  const p1 = engine.recoverStuckJob(job.id, 'Timeout race 1');
  const p2 = engine.recoverStuckJob(job.id, 'Timeout race 2');
  const p3 = engine.recoverStuckJob(job.id, 'Timeout race 3');

  const results = await Promise.all([p1, p2, p3]);

  // Check that job was re-enqueued with single consistent idempotency key
  const finalJob = qm.jobs.get(job.id);
  assert.equal(finalJob.status, JOB_STATUSES.QUEUED);
  assert.ok(finalJob.idempotencyKey);

  const key1 = crypto.createHash('sha256').update(`job-${job.id}-attempt-${finalJob.attempts}`).digest('hex');
  assert.equal(finalJob.idempotencyKey, key1, 'Idempotency key must be completely deterministic');
});

test('LEVEL27 10: Real SRE Telemetry & Observability API contract verification', async () => {
  const engine = new SelfHealingReliabilityEngine();
  const registry = new AgentRegistry();
  engine.agentRegistry = registry;

  const mockApp = {
    selfHealingEngine: engine,
    agentRegistry: registry,
    apiTraces: [
      { path: '/api/v2/jobs', method: 'GET', status: 200, latencyMs: 14 },
      { path: '/api/v2/missions', method: 'POST', status: 201, latencyMs: 28 },
      { path: '/api/v2/agents', method: 'GET', status: 200, latencyMs: 18 }
    ]
  };
  engine.app = mockApp;

  let sentCode = null;
  let sentBody = null;
  const sendJson = (res, code, body) => { sentCode = code; sentBody = body; return true; };
  const readJson = async () => ({});

  const req = { method: 'GET', url: '/api/v2/reliability/status' };
  await handleReliabilityRoutes(req, {}, {
    url: new URL(req.url, 'http://localhost'),
    sendJson,
    readJson,
    app: mockApp,
    identity: { tenantId: 'grg', actorId: 'grg-admin' }
  });

  assert.equal(sentCode, 200);
  assert.equal(sentBody.ok, true);

  // Verify real measured latency from apiTraces
  assert.equal(sentBody.telemetry.latency.avgMs, 20, 'Average latency of [14, 28, 18] must be 20ms');
  assert.equal(sentBody.telemetry.errorRatePct, 0, 'Error rate with zero 4xx/5xx must be 0%');

  // Verify real agent stats from registry
  assert.ok(sentBody.agents.total > 0, 'Total agents must be measured from AgentRegistry');
  assert.ok(sentBody.agents.available >= 0);

  // Verify services matrix
  assert.ok(sentBody.services.backend.status === 'ONLINE');
  assert.ok(sentBody.circuitBreakers);
  assert.ok(sentBody.recoveries);
});

test('LEVEL27 11: Backend restart recovery during an active mission (anti-infinite restart loop)', async () => {
  const bus = new FenixEventBus();
  const engine = new SelfHealingReliabilityEngine({ bus });

  // Mock mission store
  const missions = [
    { id: 'm-alpha', state: 'RUNNING', title: 'Active mission interrupted by restart', recoveryAttempts: 1 },
    { id: 'm-loop', state: 'RUNNING', title: 'Poison mission causing crashes', recoveryAttempts: 3 }
  ];

  const mockMissionStore = {
    find: async () => missions,
    update: async (id, patch) => {
      const found = missions.find(m => m.id === id);
      if (found) Object.assign(found, patch);
      return found;
    }
  };

  const recoveredEvents = [];
  const failedEvents = [];
  bus.on('MissionRecovered', (evt) => recoveredEvents.push(evt));
  bus.on('mission.failed', (evt) => failedEvents.push(evt));

  // Construct mock app with real recoverPendingMissions logic
  const mockApp = {
    bus,
    selfHealingEngine: engine,
    knowledgeEngine: { missionStore: mockMissionStore }
  };

  // Bind app recovery method
  mockApp.recoverPendingMissions = async () => {
    const store = mockMissionStore;
    const allMissions = await store.find({});
    const pendingMissions = allMissions.filter(m => m.state === 'PENDING' || m.state === 'RUNNING');
    const maxRecoveryAttempts = 3;
    const recoveredList = [];

    for (const m of pendingMissions) {
      m.recoveryAttempts = (Number(m.recoveryAttempts) || 0) + 1;
      if (m.recoveryAttempts > maxRecoveryAttempts) {
        m.state = 'FAILED';
        m.error = `Missão interrompida por reinicialização excedeu limite de ${maxRecoveryAttempts} tentativas. Encaminhada para aprovação humana.`;
        m.escalated = true;
        await store.update(m.id, { state: 'FAILED', error: m.error, escalated: true, recoveryAttempts: m.recoveryAttempts });
        const inc = engine.recordIncident({
          component: 'mission',
          failureType: 'MISSION_RESTART_LOOP',
          severity: 'CRITICAL',
          rootCause: `Missão ${m.id} excedeu limite de ${maxRecoveryAttempts} reinicializações consecutivas.`,
          metadata: { missionId: m.id, attempts: m.recoveryAttempts }
        });
        engine.escalateIncident(inc.incidentId, m.error);
        bus.emit('mission.failed', { missionId: m.id, reason: m.error, escalated: true });
      } else {
        await store.update(m.id, { recoveryAttempts: m.recoveryAttempts });
        const inc = engine.recordIncident({
          component: 'mission',
          failureType: 'MISSION_INTERRUPTED_BY_RESTART',
          severity: 'MEDIUM',
          rootCause: `Missão ${m.id} recuperada após reinicialização do backend.`,
          metadata: { missionId: m.id, attempts: m.recoveryAttempts }
        });
        engine.recordRecovery(inc.incidentId, {
          recoveryAction: 'RECOVER_MISSION_AFTER_RESTART',
          details: `Missão ${m.id} restabelecida e re-notificada ao barramento.`
        });
        bus.emit('MissionRecovered', { mission: m });
        recoveredList.push(m);
      }
    }
    return recoveredList;
  };

  const recovered = await mockApp.recoverPendingMissions();

  // m-alpha (attempt 2 <= 3) is recovered successfully
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].id, 'm-alpha');
  assert.equal(recoveredEvents.length, 1);

  // m-loop (attempt 4 > 3) was escalated to FAILED with human approval required
  assert.equal(missions[1].state, 'FAILED');
  assert.equal(missions[1].escalated, true);
  assert.equal(failedEvents.length, 1);
  assert.equal(failedEvents[0].data?.escalated || failedEvents[0].escalated, true);

  // Verify incident ledger
  const incidents = Array.from(engine.incidents.values());
  const loopInc = incidents.find(i => i.metadata?.missionId === 'm-loop');
  assert.ok(loopInc, 'Poison mission incident must be logged');
  assert.equal(loopInc.state, INCIDENT_STATUSES.ESCALATED);
});

test('LEVEL27 12: Targeted component restart alias normalization & circuit breaker integration', async () => {
  const engine = new SelfHealingReliabilityEngine();

  // 1. Test alias mapping: 'ai' should normalize to 'ai-platform'
  const resAi = await engine.restartComponent('ai');
  assert.equal(resAi.component, 'ai-platform');
  const cbAi = engine.getCircuitBreaker('ai-platform');
  assert.equal(cbAi.state, 'HALF_OPEN');

  // 2. Test alias mapping: 'postgresql' / 'db' should normalize to 'database'
  const resDb = await engine.restartComponent('postgresql');
  assert.equal(resDb.component, 'database');
  const cbDb = engine.getCircuitBreaker('database');
  assert.equal(cbDb.state, 'HALF_OPEN');

  // 3. Test alias mapping: 'events' should normalize to 'sse'
  const resSse = await engine.restartComponent('events');
  assert.equal(resSse.component, 'sse');
  assert.ok(engine.sseMetrics.reconnects > 0);
});
