const { uuid } = require('../kernel/ids');
const { NotFoundError, ValidationError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD_LETTER', 'ROLLED_BACK']);
const JOB_SOURCES = new Set(['codex', 'claude', 'antigravity', 'windsurf', 'vscode', 'mcp', 'cli', 'api', 'web', 'system']);
const RISK_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const now = () => new Date().toISOString();
const errorInfo = (error) => ({ name: error?.name || 'Error', message: String(error?.message || error).slice(0, 2000) });

// MEDIDO EM PRODUCAO (2026-07-29): o engine gravava em `job.result` o que o handler devolvesse,
// sem limite. `operational.activation` devolve run + todos os componentes + o relatorio de
// prontidao inteiro: 26 kB POR JOB. Com 60 jobs retidos, `runtimeJobs` virou 1,2 MB -- 19% de
// um documento de 1,6 MB que e RESERIALIZADO A CADA ESCRITA, ~60 vezes por minuto. E duplicata:
// o relatorio ja esta em `operationalReadinessReports`, e o run em `operationalActivationRuns`.
// A retencao por CONTAGEM de itens nao alcanca isso; o custo aqui e byte, nao item.
//
// O limite mora no engine, nao em cada handler: qualquer handler futuro que devolva um objeto
// grande cai na mesma armadilha, e um teto por handler seria esquecido no primeiro novo tipo.
// O resultado nao e silenciosamente cortado -- fica um marcador dizendo o tamanho real e onde
// procurar, para ninguem depurar achando que o handler devolveu vazio.
const MAX_RESULT_BYTES = Number(process.env.FENIX_JOB_RESULT_MAX_BYTES || 4_096);
function boundResult(result) {
  if (result === null || result === undefined) return null;
  const serialized = JSON.stringify(result);
  if (serialized === undefined) return null;
  if (Buffer.byteLength(serialized, 'utf8') <= MAX_RESULT_BYTES) return result;
  return {
    truncated: true,
    bytes: Buffer.byteLength(serialized, 'utf8'),
    limitBytes: MAX_RESULT_BYTES,
    reason: 'job result exceeds the store budget; the handler persists its own record',
    keys: result && typeof result === 'object' && !Array.isArray(result) ? Object.keys(result).slice(0, 20) : undefined,
  };
}

class JobEngine {
  constructor({ store, controlPlane, events, queue = null, approvals = null, clock = Date }) {
    this.store = store; this.cp = controlPlane; this.events = events; this.queue = queue; this.approvals = approvals; this.clock = clock;
    this.handlers = new Map();
  }
  register(type, handler) {
    if (!/^[a-z][a-z0-9._-]{2,80}$/.test(type) || typeof handler !== 'function') throw new ValidationError('valid job type and handler are required');
    if (this.handlers.has(type)) throw new ValidationError(`job handler already registered: ${type}`);
    this.handlers.set(type, handler); return this;
  }
  async submit(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    if (!this.handlers.has(input?.type)) throw new ValidationError(`job handler is not registered: ${input?.type}`);
    const payload = { ...(input.payload || {}) };
    if (input.prompt !== undefined && payload.prompt === undefined) payload.prompt = input.prompt;
    assertNoSecrets(payload);
    const policy = normalizePolicy(input.policy || input.executionPolicy || {}, input.limits);
    const limits = normalizeLimits({ ...input.limits, timeoutMs: input.limits?.timeoutMs || policy.maxRuntime });
    const id = uuid();
    const source = String(input.source || 'api').toLowerCase();
    if (!JOB_SOURCES.has(source)) throw new ValidationError(`unsupported job source: ${source}`);
    const riskLevel = String(input.riskLevel || 'MEDIUM').toUpperCase();
    if (!RISK_LEVELS.has(riskLevel)) throw new ValidationError(`unsupported risk level: ${riskLevel}`);
    const timestamp = now();
    const approvalRequired = policy.requireApproval || riskLevel === 'HIGH' || riskLevel === 'CRITICAL';
    const job = {
      id, jobId: id, tenantId, sessionId: input.sessionId || null, source,
      type: input.type, prompt: input.prompt || input.payload?.prompt || null,
      repository: input.repository || null, workspace: input.workspace || input.payload?.projectPath || null,
      branch: input.branch || null, payload, priority: Number(input.priority || 0),
      riskLevel, policy: { ...policy, requireApproval: approvalRequired }, status: approvalRequired ? 'AWAITING_APPROVAL' : 'QUEUED', currentStage: approvalRequired ? 'AWAITING_APPROVAL' : 'QUEUED', progress: 0,
      attempts: 0, maxAttempts: Math.min(10, Math.max(1, Number(input.maxAttempts || 3))), limits,
      scheduledFor: input.scheduledFor || timestamp, createdBy: actorId, createdAt: timestamp,
      startedAt: null, completedAt: null, updatedAt: timestamp, workerId: null,
      heartbeatAt: null, cancelRequestedAt: null, approvalId: null, result: null, artifacts: [], tests: null,
      validation: null, rollback: null, error: null, queue: this.queue ? 'fenix-runtime' : null,
    };
    if (approvalRequired) {
      if (!this.approvals) throw new ValidationError('job approval engine is not configured');
      const approval = await this.approvals.request(tenantId, actorId, {
        action: 'development.execute.high',
        resource: { jobId: id, workspace: job.workspace, riskLevel },
        rationale: `Execution requested by ${source}: ${job.prompt || job.type}`,
      });
      job.approvalId = approval.id;
    }
    await this.store.update((state) => { state.runtimeJobs.push(job); return state; });
    if (this.queue && job.status === 'QUEUED') await this.#enqueue(job);
    await this.#publish(job, 'runtime.job.queued', actorId);
    return job;
  }
  async schedule(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    if (!this.handlers.has(input?.type)) throw new ValidationError(`job handler is not registered: ${input?.type}`);
    assertNoSecrets(input.payload || {});
    const intervalMs = input.intervalMs == null ? null : Number(input.intervalMs);
    if (intervalMs !== null && (!Number.isInteger(intervalMs) || intervalMs < 1000)) throw new ValidationError('intervalMs must be at least 1000');
    const schedule = { id: uuid(), tenantId, type: input.type, payload: input.payload || {}, intervalMs, nextRunAt: input.runAt || now(), enabled: true, limits: normalizeLimits(input.limits), createdBy: actorId, createdAt: now() };
    await this.store.update((state) => { state.runtimeSchedules.push(schedule); return state; });
    return schedule;
  }
  async tick(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    const timestamp = this.clock.now(); const state = await this.store.read();
    const due = state.runtimeSchedules.filter((item) => item.tenantId === tenantId && item.enabled && Date.parse(item.nextRunAt) <= timestamp);
    const jobs = [];
    for (const schedule of due) {
      jobs.push(await this.submit(tenantId, actorId, { type: schedule.type, payload: schedule.payload, limits: schedule.limits }));
      await this.store.update((next) => { const current = next.runtimeSchedules.find((item) => item.id === schedule.id); if (current.intervalMs) current.nextRunAt = new Date(timestamp + current.intervalMs).toISOString(); else current.enabled = false; return next; });
    }
    return jobs;
  }
  async runBatch(workerId, limit = 5) {
    if (!workerId) throw new ValidationError('workerId is required');
    const claimed = [];
    await this.store.update((state) => {
      const due = state.runtimeJobs.filter((item) => item.status === 'QUEUED' && Date.parse(item.scheduledFor) <= this.clock.now()).sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt)).slice(0, Math.min(50, Number(limit)));
      for (const job of due) { this.#claim(job, workerId); claimed.push(structuredClone(job)); }
      upsertHeartbeat(state, workerId, claimed.length); return state;
    });
    return Promise.all(claimed.map((job) => this.#execute(job, workerId)));
  }
  async run(tenantId, jobId, workerId) {
    if (!workerId) throw new ValidationError('workerId is required');
    let claimed = null;
    await this.store.update((state) => {
      const job = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId);
      if (!job || job.status !== 'QUEUED' || Date.parse(job.scheduledFor) > this.clock.now()) return state;
      this.#claim(job, workerId); claimed = structuredClone(job); upsertHeartbeat(state, workerId, 1); return state;
    });
    return claimed ? this.#execute(claimed, workerId) : null;
  }
  #claim(job, workerId) {
    job.status = 'RUNNING'; job.currentStage = 'RUNNING'; job.workerId = workerId; job.attempts += 1;
    job.lastWorkerId = workerId; job.startedAt ||= now(); job.heartbeatAt = now(); job.updatedAt = now();
  }
  async #execute(job, workerId) {
    const handler = this.handlers.get(job.type);
    let timer;
    try {
      const result = await Promise.race([
        handler(job.payload, { jobId: job.id, tenantId: job.tenantId, actorId: job.createdBy, job, heartbeat: () => this.heartbeat(job.tenantId, job.id, workerId), isCancelled: () => this.isCancelled(job.tenantId, job.id), stage: (name, progress, patch) => this.stage(job.tenantId, job.id, workerId, name, progress, patch) }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('job execution timed out')), job.limits.timeoutMs); }),
      ]);
      clearTimeout(timer);
      await this.store.update((state) => { const current = state.runtimeJobs.find((item) => item.id === job.id); current.status = current.cancelRequestedAt ? 'CANCELLED' : 'SUCCEEDED'; current.currentStage = current.status; current.progress = 100; current.result = current.cancelRequestedAt ? null : boundResult(result); current.completedAt = now(); current.updatedAt = now(); return state; });
    } catch (error) {
      clearTimeout(timer);
      await this.store.update((state) => {
        const current = state.runtimeJobs.find((item) => item.id === job.id); current.error = errorInfo(error); current.updatedAt = now(); current.workerId = null;
        if (current.cancelRequestedAt) current.status = 'CANCELLED';
        else if (current.attempts < current.maxAttempts) { current.status = 'QUEUED'; current.scheduledFor = new Date(this.clock.now() + Math.min(60_000, 1000 * (2 ** (current.attempts - 1)))).toISOString(); }
        else { current.status = 'DEAD_LETTER'; current.completedAt = now(); state.deadLetters.push({ id: uuid(), tenantId: current.tenantId, jobId: current.id, type: current.type, error: current.error, attempts: current.attempts, createdAt: now() }); }
        current.currentStage = current.status;
        return state;
      });
    }
    const current = await this.getInternal(job.tenantId, job.id);
    if (current.status === 'QUEUED' && this.queue) await this.#enqueue(current);
    await this.#publish(current, `runtime.job.${current.status.toLowerCase()}`, workerId);
    return current;
  }
  async cancel(tenantId, actorId, jobId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    let job;
    await this.store.update((state) => { job = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId); if (!job) throw new NotFoundError(`job not found: ${jobId}`); if (TERMINAL.has(job.status)) return state; job.cancelRequestedAt = now(); if (job.status === 'QUEUED') { job.status = 'CANCELLED'; job.currentStage = 'CANCELLED'; job.completedAt = now(); } job.updatedAt = now(); return state; });
    await this.#publish(job, 'runtime.job.cancel-requested', actorId); return job;
  }
  async approve(tenantId, actorId, jobId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const job = await this.getInternal(tenantId, jobId);
    if (job.status !== 'AWAITING_APPROVAL' || !job.approvalId) throw new ValidationError('job is not awaiting approval');
    await this.approvals.approve(tenantId, actorId, job.approvalId);
    let queued;
    await this.store.update((state) => {
      queued = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId);
      queued.status = 'QUEUED'; queued.currentStage = 'QUEUED'; queued.updatedAt = now(); return state;
    });
    if (this.queue) await this.#enqueue(queued);
    await this.#publish(queued, 'runtime.job.approved', actorId);
    return queued;
  }
  async reject(tenantId, actorId, jobId, reason = null) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const job = await this.getInternal(tenantId, jobId);
    if (job.status !== 'AWAITING_APPROVAL' || !job.approvalId) throw new ValidationError('job is not awaiting approval');
    await this.approvals.reject(tenantId, actorId, job.approvalId, reason);
    await this.store.update((state) => {
      const current = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId);
      current.status = 'CANCELLED'; current.currentStage = 'REJECTED'; current.completedAt = now(); current.updatedAt = now(); return state;
    });
    const rejected = await this.getInternal(tenantId, jobId);
    await this.#publish(rejected, 'runtime.job.rejected', actorId);
    return rejected;
  }
  async rollbackJob(tenantId, actorId, jobId, executor) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const job = await this.getInternal(tenantId, jobId);
    if (!job.policy?.allowRollback) throw new ValidationError('rollback is disabled by job policy');
    if (typeof executor !== 'function') throw new ValidationError('rollback executor is not configured');
    if (this.events) await this.events.publish({ tenantId, stream: `job:${jobId}`, type: 'rollback.started', source: 'fenix-runtime', subject: jobId, data: { jobId, actorId }, idempotencyKey: `rollback.started:${jobId}` });
    const result = await executor(job);
    await this.store.update((state) => {
      const current = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId);
      current.rollback = { status: 'COMPLETED', ...result, completedAt: now(), actorId };
      current.status = 'ROLLED_BACK'; current.currentStage = 'ROLLED_BACK'; current.updatedAt = now(); current.completedAt ||= now(); return state;
    });
    const rolledBack = await this.getInternal(tenantId, jobId);
    if (this.events) await this.events.publish({ tenantId, stream: `job:${jobId}`, type: 'rollback.completed', source: 'fenix-runtime', subject: jobId, data: { jobId, actorId, status: rolledBack.status }, idempotencyKey: `rollback.completed:${jobId}` });
    return rolledBack;
  }
  async heartbeat(tenantId, jobId, workerId) { await this.store.update((state) => { const job = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId && item.workerId === workerId && item.status === 'RUNNING'); if (!job) throw new NotFoundError('running job not found for worker'); job.heartbeatAt = now(); upsertHeartbeat(state, workerId, 1); return state; }); }
  async stage(tenantId, jobId, workerId, name, progress = null, patch = {}) {
    if (!/^[a-z][a-z0-9._-]{2,80}$/.test(String(name || ''))) throw new ValidationError('valid job stage is required');
    let job;
    await this.store.update((state) => {
      job = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId && item.workerId === workerId && item.status === 'RUNNING');
      if (!job) throw new NotFoundError('running job not found for worker');
      job.currentStage = name; job.updatedAt = now(); job.heartbeatAt = now();
      if (progress !== null) job.progress = Math.max(0, Math.min(99, Number(progress)));
      for (const key of ['artifacts', 'tests', 'validation', 'rollback']) if (patch[key] !== undefined) job[key] = patch[key];
      upsertHeartbeat(state, workerId, 1); return state;
    });
    if (this.events) await this.events.publish({ tenantId, stream: `job:${jobId}`, type: name, source: 'fenix-runtime', subject: jobId, data: { jobId, jobType: job.type, status: job.status, stage: name, progress: job.progress }, idempotencyKey: `${name}:${jobId}:${job.attempts}` });
    return job;
  }
  async workerHeartbeat(workerId) {
    if (!workerId) throw new ValidationError('workerId is required');
    await this.store.update((state) => {
      const activeJobs = state.runtimeJobs.filter((item) => item.status === 'RUNNING' && item.workerId === workerId).length;
      upsertHeartbeat(state, workerId, activeJobs); return state;
    });
  }
  async recoverStale(staleAfterMs = 60_000) {
    const cutoff = this.clock.now() - Number(staleAfterMs); const requeued = [];
    await this.store.update((state) => {
      for (const job of state.runtimeJobs.filter((item) => item.status === 'RUNNING' && Date.parse(item.heartbeatAt) < cutoff)) {
        job.status = job.attempts < job.maxAttempts ? 'QUEUED' : 'DEAD_LETTER'; job.currentStage = job.status;
        job.workerId = null; job.error = { name: 'HeartbeatTimeout', message: 'worker heartbeat expired' }; job.updatedAt = now();
        if (job.status === 'QUEUED') { job.scheduledFor = now(); requeued.push(structuredClone(job)); }
        else { job.completedAt = now(); state.deadLetters.push({ id: uuid(), tenantId: job.tenantId, jobId: job.id, type: job.type, error: job.error, attempts: job.attempts, createdAt: now() }); }
      }
      return state;
    });
    if (this.queue) await Promise.all(requeued.map((job) => this.#enqueue(job)));
    return requeued.length;
  }
  async get(tenantId, actorId, jobId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); return this.getInternal(tenantId, jobId); }
  async getInternal(tenantId, jobId) { const state = await this.store.read(); const job = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId); if (!job) throw new NotFoundError(`job not found: ${jobId}`); return job; }
  async list(tenantId, actorId, status) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); return state.runtimeJobs.filter((item) => item.tenantId === tenantId && (!status || item.status === status)); }
  async workers(tenantId, actorId, staleAfterMs = 30_000) {
    await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const state = await this.store.read(); const cutoff = this.clock.now() - Number(staleAfterMs);
    const jobs = state.runtimeJobs.filter((item) => item.tenantId === tenantId);
    return state.workerHeartbeats.map((worker) => {
      const active = jobs.filter((job) => job.status === 'RUNNING' && job.workerId === worker.workerId);
      return {
        workerId: worker.workerId, queue: this.queue ? 'fenix-runtime' : null,
        status: Date.parse(worker.lastSeenAt) >= cutoff ? 'ONLINE' : 'STALE',
        currentJob: active[0]?.id || null,
        processed: jobs.filter((job) => job.status === 'SUCCEEDED' && job.lastWorkerId === worker.workerId).length,
        failed: jobs.filter((job) => ['FAILED', 'DEAD_LETTER'].includes(job.status) && job.lastWorkerId === worker.workerId).length,
        lastHeartbeat: worker.lastSeenAt, startedAt: worker.startedAt,
      };
    });
  }
  async eventsFor(tenantId, actorId, jobId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:read');
    await this.getInternal(tenantId, jobId);
    return this.events?.eventStore?.readStream(tenantId, `job:${jobId}`) || [];
  }
  async isCancelled(tenantId, jobId) { return !!(await this.getInternal(tenantId, jobId)).cancelRequestedAt; }
  async #enqueue(job) {
    const delay = Math.max(0, Date.parse(job.scheduledFor) - this.clock.now());
    await this.queue.enqueue('fenix-runtime', job.type, { tenantId: job.tenantId, jobId: job.id }, {
      idempotencyKey: `${job.id}-${job.attempts}`, attempts: 5, backoff: { type: 'exponential', delay: 500 }, delay,
    });
  }
  async #publish(job, type, actorId) { if (!this.events) return; await this.events.publish({ tenantId: job.tenantId, stream: `job:${job.id}`, type, source: 'fenix-runtime', subject: job.id, data: { actorId, jobId: job.id, jobType: job.type, status: job.status, attempts: job.attempts, limits: job.limits }, idempotencyKey: `${type}:${job.id}:${job.attempts}` }); }
}

function normalizeLimits(input = {}) { const limits = { timeoutMs: Number(input.timeoutMs || 300_000), memoryMb: Number(input.memoryMb || 512), cpuUnits: Number(input.cpuUnits || 1000) }; if (limits.timeoutMs < 100 || limits.timeoutMs > 86_400_000 || limits.memoryMb < 16 || limits.memoryMb > 65_536 || limits.cpuUnits < 10 || limits.cpuUnits > 64_000) throw new ValidationError('invalid job resource limits'); return limits; }
function normalizePolicy(input = {}, limits = {}) {
  const maxRuntime = Number(input.maxRuntime || limits?.timeoutMs || 300_000);
  const maxIterations = Number(input.maxIterations || 5);
  const maxTokens = Number(input.maxTokens || 100_000);
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 100) throw new ValidationError('invalid maxIterations');
  if (!Number.isFinite(maxTokens) || maxTokens < 1 || maxTokens > 10_000_000) throw new ValidationError('invalid maxTokens');
  return {
    allowedPaths: Array.isArray(input.allowedPaths) ? input.allowedPaths.map(String) : [],
    blockedPaths: Array.isArray(input.blockedPaths) ? input.blockedPaths.map(String) : [],
    maxIterations, maxTokens, maxRuntime,
    requireApproval: input.requireApproval === true,
    allowDeploy: input.allowDeploy === true,
    allowRollback: input.allowRollback !== false,
  };
}
function upsertHeartbeat(state, workerId, activeJobs) { let worker = state.workerHeartbeats.find((item) => item.workerId === workerId); if (!worker) { worker = { workerId, startedAt: now() }; state.workerHeartbeats.push(worker); } worker.lastSeenAt = now(); worker.activeJobs = activeJobs; }

module.exports = { JobEngine, normalizeLimits, normalizePolicy, TERMINAL, JOB_SOURCES, RISK_LEVELS };
