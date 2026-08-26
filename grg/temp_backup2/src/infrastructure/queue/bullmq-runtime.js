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
    });
  }

  worker(queueName, processor, options = {}) {
    const worker = new this.WorkerClass(queueName, processor, {
      connection: this.connection, prefix: this.prefix,
      concurrency: Number(options.concurrency || 5),
    });
    this.workers.add(worker);
    return worker;
  }

  async health() {
    const queue = this.queue('health-check');
    const client = await queue.client;
    return { ok: (await client.ping()) === 'PONG', adapter: 'bullmq' };
  }

  async close() {
    await Promise.all([...this.workers].map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}

module.exports = { BullMQRuntime, connectionFromUrl };
