'use strict';
/**
 * FÊNIX OS V8.1 — Job Queue Manager
 * Full lifecycle controller for background jobs, BullMQ integration,
 * confirmation enforcement, pause/resume, cancel, and persistence.
 */

var fs = require('node:fs');
var path = require('node:path');

var DATA_FILE = path.join(__dirname, '..', '..', '.data', 'jobs-v8.json');

var JOB_PRIORITY_LEVELS = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
  BACKGROUND: 5
};

var JOB_STATUSES = {
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED'
};

function safeEmit(method) {
  try {
    var bus = global.__fenixEventBus;
    if (bus && bus[method]) {
      var args = Array.prototype.slice.call(arguments, 1);
      bus[method].apply(bus, args);
    }
  } catch (e) {}
}

class JobQueueManager {
  constructor() {
    this.jobs = new Map();
    this.isPaused = false;
    this.bullQueue = null;
    this.abortControllers = new Map(); // jobId -> AbortController
    this.counter = 180; // Start around realistic job ID sequence
    this.load();
  }

  setBullQueue(q) {
    this.bullQueue = q;
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        var raw = fs.readFileSync(DATA_FILE, 'utf-8');
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed.jobs)) {
          for (var i = 0; i < parsed.jobs.length; i++) {
            var j = parsed.jobs[i];
            // If it was running when process restarted, mark as QUEUED
            if (j.status === JOB_STATUSES.RUNNING) j.status = JOB_STATUSES.QUEUED;
            this.jobs.set(String(j.id), j);
            var num = parseInt(j.id, 10);
            if (!isNaN(num) && num >= this.counter) this.counter = num + 1;
          }
        }
        if (parsed.isPaused !== undefined) this.isPaused = Boolean(parsed.isPaused);
      }
    } catch (e) {
      console.warn('[JobQueueManager] Load state warning:', e.message);
    }
  }

  save() {
    try {
      var dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      var arr = Array.from(this.jobs.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify({
        isPaused: this.isPaused,
        jobs: arr
      }, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[JobQueueManager] Save state warning:', e.message);
    }
  }

  createJob(opts) {
    var id = String(opts.id || this.counter++);
    var priorityName = opts.priority || 'NORMAL';
    var requiresConf = Boolean(opts.requiresConfirmation);

    var initialStatus = requiresConf ? JOB_STATUSES.PENDING_CONFIRMATION : (this.isPaused ? JOB_STATUSES.PAUSED : JOB_STATUSES.QUEUED);

    var job = {
      id: id,
      jobId: id,
      title: opts.title || ('Job #' + id + ': ' + (opts.type || 'task')),
      type: opts.type || 'task',
      projectId: opts.projectId || 'fenix-os',
      agentId: opts.agentId || 'fenix-agent-1',
      model: opts.model || 'qwen2.5:3b',
      provider: opts.provider || 'API Platform',
      priority: priorityName,
      priorityLevel: JOB_PRIORITY_LEVELS[priorityName] || 3,
      status: initialStatus,
      progress: 0,
      tokens: {
        estimated: opts.estimatedTokens || 600,
        actual: 0
      },
      estimatedTokens: opts.estimatedTokens || 600,
      actualTokens: 0,
      maxTokens: opts.maxTokens || 1200,
      tokenBudget: opts.tokenBudget || 1500,
      estimatedTimeSec: opts.estimatedTimeSec || 20,
      actualLatencyMs: 0,
      requiresConfirmation: requiresConf,
      confirmationStatus: requiresConf ? 'PENDING_CONFIRMATION' : 'AUTO_CONFIRMED',
      confirmedBy: requiresConf ? null : 'system',
      confirmedAt: requiresConf ? null : new Date().toISOString(),
      _bullDispatched: !requiresConf && !this.isPaused,
      _bullJobId: null,
      rawPrompt: opts.rawPrompt || opts.prompt || '',
      enhancedPrompt: opts.enhancedPrompt || '',
      objective: opts.objective || '',
      scope: opts.scope || [],
      steps: [
        { name: 'QUEUED', status: 'COMPLETED', timestamp: new Date().toISOString() }
      ],
      events: [],
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    this.jobs.set(id, job);
    this.save();

    if (requiresConf) {
      safeEmit('jobConfirmationRequired', job);
    } else {
      safeEmit('jobCreated', job);
      if (!this.isPaused) {
        this._dispatchToBull(job);
      }
    }

    return job;
  }

  async _dispatchToBull(job) {
    try {
      var bullmq = require('bullmq');
      var Queue = bullmq.Queue;
      var q = this.bullQueue;
      if (!q) {
        var REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
        var conn = { host: 'localhost', port: 6379 };
        try {
          var u = new URL(REDIS_URL);
          conn = { host: u.hostname || 'localhost', port: parseInt(u.port || '6379', 10) };
        } catch (err) {}
        q = new Queue('fenix-jobs', { connection: conn });
        this.bullQueue = q;
      }

      var bullJobId = 'bull-' + job.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      var bJob = await q.add('fenix-job', {
        jobId: job.id,
        type: job.type,
        projectId: job.projectId,
        agentId: job.agentId,
        model: job.model,
        provider: job.provider,
        enhancedPrompt: job.enhancedPrompt,
        rawPrompt: job.rawPrompt,
        payload: { prompt: job.rawPrompt, enhanced: job.enhancedPrompt }
      }, {
        jobId: bullJobId,
        priority: job.priorityLevel,
        removeOnComplete: 100,
        removeOnFail: 50
      });

      job._bullJobId = bullJobId;
      job._bullDispatched = true;
      this.save();

      safeEmit('jobQueued', job);
      return bJob;
    } catch (e) {
      console.error('[JobQueueManager] Failed to dispatch to BullMQ:', e.message);
      return null;
    }
  }

  async confirmJob(id, actorId) {
    var job = this.jobs.get(String(id));
    if (!job) throw new Error('Job #' + id + ' not found');
    if (job.status !== JOB_STATUSES.PENDING_CONFIRMATION) {
      return job; // already confirmed
    }

    job.status = this.isPaused ? JOB_STATUSES.PAUSED : JOB_STATUSES.QUEUED;
    job.confirmationStatus = 'CONFIRMED';
    job.confirmedBy = actorId || 'grg-admin';
    job.confirmedAt = new Date().toISOString();
    job.steps.push({ name: 'CONFIRMED', status: 'COMPLETED', timestamp: new Date().toISOString() });
    this.save();

    safeEmit('jobQueued', job);

    if (!this.isPaused) {
      await this._dispatchToBull(job);
    }

    return job;
  }

  async pauseQueue() {
    this.isPaused = true;
    if (this.bullQueue && typeof this.bullQueue.pause === 'function') {
      try { await this.bullQueue.pause(); } catch (e) {}
    }
    // Update queued jobs to PAUSED
    for (var j of this.jobs.values()) {
      if (j.status === JOB_STATUSES.QUEUED) {
        j.status = JOB_STATUSES.PAUSED;
      }
    }
    this.save();
    safeEmit('queuePaused', { pausedAt: new Date().toISOString() });
    return { ok: true, isPaused: true };
  }

  async resumeQueue() {
    this.isPaused = false;
    if (this.bullQueue && typeof this.bullQueue.resume === 'function') {
      try { await this.bullQueue.resume(); } catch (e) {}
    }
    // Update paused jobs back to QUEUED without duplicating BullMQ queue items
    for (var j of this.jobs.values()) {
      if (j.status === JOB_STATUSES.PAUSED) {
        j.status = JOB_STATUSES.QUEUED;
        if (!j._bullDispatched) {
          await this._dispatchToBull(j);
        }
      }
    }
    this.save();
    safeEmit('queueResumed', { resumedAt: new Date().toISOString() });
    return { ok: true, isPaused: false };
  }

  async cancelJob(id) {
    var job = this.jobs.get(String(id));
    if (!job) throw new Error('Job #' + id + ' not found');

    // Trigger abort controller if running
    var controller = this.abortControllers.get(String(id));
    if (controller) {
      try { controller.abort(); } catch (e) {}
      this.abortControllers.delete(String(id));
    }

    // Try removing from BullMQ queue if waiting
    if (this.bullQueue && job._bullJobId) {
      try {
        var bJob = await this.bullQueue.getJob(job._bullJobId);
        if (bJob) await bJob.remove();
      } catch (e) {}
    }

    job.status = JOB_STATUSES.CANCELLED;
    job.completedAt = new Date().toISOString();
    job.steps.push({ name: 'CANCELLED', status: 'COMPLETED', timestamp: new Date().toISOString() });
    this.save();

    safeEmit('jobCancelled', { jobId: job.id });
    return job;
  }

  updateJobModel(id, model, provider) {
    var job = this.jobs.get(String(id));
    if (!job) throw new Error('Job #' + id + ' not found');
    if (job.status === JOB_STATUSES.COMPLETED || job.status === JOB_STATUSES.CANCELLED) {
      throw new Error('Cannot change model for finalized job');
    }
    job.model = model;
    if (provider) job.provider = provider;
    job.steps.push({ name: 'MODEL_UPDATED', status: 'COMPLETED', timestamp: new Date().toISOString() });
    this.save();
    safeEmit('modelSelected', model, provider || job.provider, job.id);
    return job;
  }

  async retryJob(id) {
    var job = this.jobs.get(String(id));
    if (!job) throw new Error('Job #' + id + ' not found');

    job.status = this.isPaused ? JOB_STATUSES.PAUSED : JOB_STATUSES.QUEUED;
    job.error = null;
    job.result = null;
    job.progress = 0;
    job.steps.push({ name: 'RETRY', status: 'COMPLETED', timestamp: new Date().toISOString() });
    this.save();

    safeEmit('jobQueued', job);
    if (!this.isPaused) {
      await this._dispatchToBull(job);
    }
    return job;
  }

  clearCompleted() {
    var removed = 0;
    for (var entry of Array.from(this.jobs.entries())) {
      var key = entry[0];
      var j = entry[1];
      if (j.status === JOB_STATUSES.COMPLETED || j.status === JOB_STATUSES.CANCELLED || j.status === JOB_STATUSES.FAILED) {
        this.jobs.delete(key);
        removed++;
      }
    }
    this.save();
    return { ok: true, removedCount: removed };
  }

  getJob(id) {
    return this.jobs.get(String(id)) || null;
  }

  listJobs(filters) {
    var list = Array.from(this.jobs.values());
    if (filters) {
      if (filters.status) list = list.filter(function(j) { return j.status === filters.status; });
      if (filters.projectId) list = list.filter(function(j) { return j.projectId === filters.projectId; });
    }
    // Most recent first
    list.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return list;
  }

  getQueueStatus() {
    var all = Array.from(this.jobs.values());
    return {
      isPaused: this.isPaused,
      total: all.length,
      pendingConfirmation: all.filter(function(j) { return j.status === JOB_STATUSES.PENDING_CONFIRMATION; }).length,
      queued: all.filter(function(j) { return j.status === JOB_STATUSES.QUEUED; }).length,
      running: all.filter(function(j) { return j.status === JOB_STATUSES.RUNNING; }).length,
      waiting: all.filter(function(j) { return j.status === JOB_STATUSES.PAUSED || j.status === JOB_STATUSES.PENDING_CONFIRMATION; }).length,
      completed: all.filter(function(j) { return j.status === JOB_STATUSES.COMPLETED; }).length,
      failed: all.filter(function(j) { return j.status === JOB_STATUSES.FAILED; }).length,
      cancelled: all.filter(function(j) { return j.status === JOB_STATUSES.CANCELLED; }).length,
      paused: all.filter(function(j) { return j.status === JOB_STATUSES.PAUSED; }).length
    };
  }
}

var globalJobQueueManager = global.__fenixJobQueueManager;
if (!globalJobQueueManager) {
  globalJobQueueManager = new JobQueueManager();
  global.__fenixJobQueueManager = globalJobQueueManager;
}

module.exports = {
  JobQueueManager: JobQueueManager,
  globalJobQueueManager: globalJobQueueManager,
  JOB_STATUSES: JOB_STATUSES,
  JOB_PRIORITY_LEVELS: JOB_PRIORITY_LEVELS
};
