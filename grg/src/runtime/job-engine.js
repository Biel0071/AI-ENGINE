const { uuid } = require('../kernel/ids');
const { NotFoundError, ValidationError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD_LETTER']);
const now = () => new Date().toISOString();
const errorInfo = (error) => ({ name: error?.name || 'Error', message: String(error?.message || error).slice(0, 2000) });

class JobEngine {
  constructor({ store, controlPlane, events, queue = null, clock = Date }) {
    this.store = store; this.cp = controlPlane; this.events = events; this.queue = queue; this.clock = clock;
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
    assertNoSecrets(input.payload || {});
    const limits = normalizeLimits(input.limits);
    const job = { id: uuid(), tenantId, type: input.type, payload: input.payload || {}, status: 'QUEUED', priority: Number(input.priority || 0), attempts: 0, maxAttempts: Math.min(10, Math.max(1, Number(input.maxAttempts || 3))), limits, scheduledFor: input.scheduledFor || now(), createdBy: actorId, createdAt: now(), updatedAt: now(), workerId: null, heartbeatAt: null, cancelRequestedAt: null, result: null, error: null };
    await this.store.update((state) => { state.runtimeJobs.push(job); return state; });
    if (this.queue) await this.queue.enqueue('fenix-runtime', input.type, { tenantId, jobId: job.id }, { idempotencyKey: job.id, attempts: 1 });
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
      for (const job of due) { job.status = 'RUNNING'; job.workerId = workerId; job.attempts += 1; job.startedAt = now(); job.heartbeatAt = now(); job.updatedAt = now(); claimed.push(structuredClone(job)); }
      upsertHeartbeat(state, workerId, claimed.length); return state;
    });
    return Promise.all(claimed.map((job) => this.#execute(job, workerId)));
  }
  async #execute(job, workerId) {
    const handler = this.handlers.get(job.type);
    let timer;
    try {
      const result = await Promise.race([
        handler(job.payload, { jobId: job.id, tenantId: job.tenantId, actorId: job.createdBy, heartbeat: () => this.heartbeat(job.tenantId, job.id, workerId), isCancelled: () => this.isCancelled(job.tenantId, job.id) }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('job execution timed out')), job.limits.timeoutMs); }),
      ]);
      clearTimeout(timer);
      await this.store.update((state) => { const current = state.runtimeJobs.find((item) => item.id === job.id); current.status = current.cancelRequestedAt ? 'CANCELLED' : 'SUCCEEDED'; current.result = current.cancelRequestedAt ? null : result ?? null; current.completedAt = now(); current.updatedAt = now(); return state; });
    } catch (error) {
      clearTimeout(timer);
      await this.store.update((state) => {
        const current = state.runtimeJobs.find((item) => item.id === job.id); current.error = errorInfo(error); current.updatedAt = now(); current.workerId = null;
        if (current.cancelRequestedAt) current.status = 'CANCELLED';
        else if (current.attempts < current.maxAttempts) { current.status = 'QUEUED'; current.scheduledFor = new Date(this.clock.now() + Math.min(60_000, 1000 * (2 ** (current.attempts - 1)))).toISOString(); }
        else { current.status = 'DEAD_LETTER'; state.deadLetters.push({ id: uuid(), tenantId: current.tenantId, jobId: current.id, type: current.type, error: current.error, attempts: current.attempts, createdAt: now() }); }
        return state;
      });
    }
    const current = await this.getInternal(job.tenantId, job.id);
    await this.#publish(current, `runtime.job.${current.status.toLowerCase()}`, workerId);
    return current;
  }
  async cancel(tenantId, actorId, jobId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    let job;
    await this.store.update((state) => { job = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId); if (!job) throw new NotFoundError(`job not found: ${jobId}`); if (TERMINAL.has(job.status)) return state; job.cancelRequestedAt = now(); if (job.status === 'QUEUED') job.status = 'CANCELLED'; job.updatedAt = now(); return state; });
    await this.#publish(job, 'runtime.job.cancel-requested', actorId); return job;
  }
  async heartbeat(tenantId, jobId, workerId) { await this.store.update((state) => { const job = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId && item.workerId === workerId && item.status === 'RUNNING'); if (!job) throw new NotFoundError('running job not found for worker'); job.heartbeatAt = now(); upsertHeartbeat(state, workerId, 1); return state; }); }
  async recoverStale(staleAfterMs = 60_000) { const cutoff = this.clock.now() - Number(staleAfterMs); await this.store.update((state) => { for (const job of state.runtimeJobs.filter((item) => item.status === 'RUNNING' && Date.parse(item.heartbeatAt) < cutoff)) { job.status = job.attempts < job.maxAttempts ? 'QUEUED' : 'DEAD_LETTER'; job.workerId = null; job.error = { name: 'HeartbeatTimeout', message: 'worker heartbeat expired' }; job.updatedAt = now(); if (job.status === 'DEAD_LETTER') state.deadLetters.push({ id: uuid(), tenantId: job.tenantId, jobId: job.id, type: job.type, error: job.error, attempts: job.attempts, createdAt: now() }); } return state; }); }
  async get(tenantId, actorId, jobId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); return this.getInternal(tenantId, jobId); }
  async getInternal(tenantId, jobId) { const state = await this.store.read(); const job = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId); if (!job) throw new NotFoundError(`job not found: ${jobId}`); return job; }
  async list(tenantId, actorId, status) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); return state.runtimeJobs.filter((item) => item.tenantId === tenantId && (!status || item.status === status)); }
  async isCancelled(tenantId, jobId) { return !!(await this.getInternal(tenantId, jobId)).cancelRequestedAt; }
  async #publish(job, type, actorId) { if (!this.events) return; await this.events.publish({ tenantId: job.tenantId, stream: `job:${job.id}`, type, source: 'fenix-runtime', subject: job.id, data: { actorId, jobId: job.id, jobType: job.type, status: job.status, attempts: job.attempts, limits: job.limits }, idempotencyKey: `${type}:${job.id}:${job.attempts}` }); }
}

function normalizeLimits(input = {}) { const limits = { timeoutMs: Number(input.timeoutMs || 300_000), memoryMb: Number(input.memoryMb || 512), cpuUnits: Number(input.cpuUnits || 1000) }; if (limits.timeoutMs < 100 || limits.timeoutMs > 86_400_000 || limits.memoryMb < 16 || limits.memoryMb > 65_536 || limits.cpuUnits < 10 || limits.cpuUnits > 64_000) throw new ValidationError('invalid job resource limits'); return limits; }
function upsertHeartbeat(state, workerId, activeJobs) { let worker = state.workerHeartbeats.find((item) => item.workerId === workerId); if (!worker) { worker = { workerId, startedAt: now() }; state.workerHeartbeats.push(worker); } worker.lastSeenAt = now(); worker.activeJobs = activeJobs; }

module.exports = { JobEngine, normalizeLimits, TERMINAL };
