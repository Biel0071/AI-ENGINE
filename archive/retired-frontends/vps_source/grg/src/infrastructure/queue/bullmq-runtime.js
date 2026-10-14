function connectionFromUrl(redisUrl) {
  const url = new URL(redisUrl);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('queue connection must use redis:// or rediss://');
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}

class BullMQRuntime {
  constructor({ connection, prefix = 'fenix', QueueClass, WorkerClass }) {
    const bullmq = (!QueueClass || !WorkerClass) ? require('bullmq') : {};
    this.QueueClass = QueueClass || bullmq.Queue;
    this.WorkerClass = WorkerClass || bullmq.Worker;
    this.connection = connection;
    this.prefix = prefix;
    this.queues = new Map();
    this.workers = new Set();
    this.workerState = new Map();
  }

  static fromUrl(redisUrl, options = {}) {
    return new BullMQRuntime({ ...options, connection: connectionFromUrl(redisUrl) });
  }

  queue(name) {
    if (!/^[a-z][a-z0-9-]{1,62}$/.test(name)) throw new Error('invalid queue name');
    if (!this.queues.has(name)) {
      this.queues.set(name, new this.QueueClass(name, { connection: this.connection, prefix: this.prefix }));
    }
    return this.queues.get(name);
  }

  async enqueue(queueName, jobName, payload, options = {}) {
    return this.queue(queueName).add(jobName, payload, {
      jobId: options.idempotencyKey,
      attempts: Number(options.attempts || 3),
      backoff: options.backoff || { type: 'exponential', delay: 1_000 },
      removeOnComplete: options.removeOnComplete ?? 1_000,
      removeOnFail: options.removeOnFail ?? 5_000,
      delay: Math.max(0, Number(options.delay || 0)),
    });
  }

  worker(queueName, processor, options = {}) {
    const worker = new this.WorkerClass(queueName, processor, {
      connection: this.connection, prefix: this.prefix,
      concurrency: Number(options.concurrency || 5),
      name: options.workerId,
    });
    this.workers.add(worker);
    const workerId = options.workerId || worker.id || `${queueName}:${this.workers.size}`;
    const state = { workerId, queue: queueName, status: 'ONLINE', currentJob: null, processed: 0, failed: 0, lastHeartbeat: new Date().toISOString(), startedAt: new Date().toISOString() };
    this.workerState.set(workerId, state);
    if (typeof worker.on === 'function') {
      worker.on('active', (job) => { state.currentJob = job?.data?.jobId || job?.id || null; state.lastHeartbeat = new Date().toISOString(); });
      worker.on('progress', () => { state.lastHeartbeat = new Date().toISOString(); });
      worker.on('completed', () => { state.currentJob = null; state.processed += 1; state.lastHeartbeat = new Date().toISOString(); });
      worker.on('failed', () => { state.currentJob = null; state.failed += 1; state.lastHeartbeat = new Date().toISOString(); });
      worker.on('stalled', () => { state.lastHeartbeat = new Date().toISOString(); });
      worker.on('closed', () => { state.status = 'OFFLINE'; state.currentJob = null; state.lastHeartbeat = new Date().toISOString(); });
    }
    return worker;
  }

  async status(queueName = 'fenix-runtime', limit = 100) {
    const queue = this.queue(queueName);
    const types = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'];
    const counts = typeof queue.getJobCounts === 'function' ? await queue.getJobCounts(...types) : {};
    const jobs = typeof queue.getJobs === 'function' ? await queue.getJobs(types, 0, Math.max(0, Number(limit) - 1), false) : [];
    return {
      queue: queueName,
      counts,
      jobs: await Promise.all(jobs.map(async (job) => ({
        jobId: job.data?.jobId || job.id, bullmqId: job.id, queue: queueName,
        state: typeof job.getState === 'function' ? await job.getState() : null,
        progress: job.progress ?? 0, attempts: job.attemptsMade ?? 0,
        createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
        startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        failedReason: job.failedReason || null,
      }))),
    };
  }

  async workersStatus(queueName = 'fenix-runtime', staleAfterMs = 30_000) {
    const queue = this.queue(queueName);
    const remote = typeof queue.getWorkers === 'function' ? await queue.getWorkers() : [];
    const cutoff = Date.now() - Number(staleAfterMs);
    const local = [...this.workerState.values()].map((worker) => ({
      ...worker,
      status: worker.status === 'ONLINE' && Date.parse(worker.lastHeartbeat) >= cutoff ? 'ONLINE' : 'STALE',
    }));
    const remoteWorkers = remote.map((client) => {
      const name = String(client.name || '');
      return {
        workerId: name.includes(':w:') ? name.split(':w:').at(-1) : name || client.id || null,
        queue: queueName, status: 'CONNECTED', currentJob: null, processed: null, failed: null,
        lastHeartbeat: null, startedAt: null, connection: { id: client.id || null, addr: client.addr || null, ageSeconds: Number(client.age || 0), idleSeconds: Number(client.idle || 0) },
      };
    });
    return { queue: queueName, connected: remote.length, workers: local.length ? local : remoteWorkers, bullmqClients: remote };
  }

  async health() {
    const queue = this.queue('health-check');
    const client = await queue.client;
    return { ok: (await client.ping()) === 'PONG', adapter: 'bullmq' };
  }

  async close() {
    await Promise.all([...this.workers].map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    for (const state of this.workerState.values()) { state.status = 'OFFLINE'; state.currentJob = null; state.lastHeartbeat = new Date().toISOString(); }
  }
}

module.exports = { BullMQRuntime, connectionFromUrl };
