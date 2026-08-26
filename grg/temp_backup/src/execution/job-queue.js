const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class JobQueue {
  constructor(dataFile) {
    this.dataFile = dataFile;
    this.jobs = new Map();
    this.missions = new Map();
    this.load();
  }

  load() {
    if (fs.existsSync(this.dataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        if (data.jobs) {
          for (const j of data.jobs) {
            // Restore active jobs that were abruptly terminated
            if (['RUNNING', 'PLANNING', 'TESTING', 'RETRYING', 'READY', 'WAITING', 'WAITING_DEPENDENCY'].includes(j.status)) {
              j.status = 'QUEUED'; // Re-queue on restart
            }
            this.jobs.set(j.id, j);
          }
        }
        if (data.missions) {
          for (const mission of data.missions) this.missions.set(mission.id || mission.missionId, mission);
        }
      } catch (e) {
        console.error('Failed to load job queue:', e);
      }
    }
  }

  save() {
    const dir = path.dirname(this.dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.dataFile, JSON.stringify({
      jobs: Array.from(this.jobs.values()),
      missions: Array.from(this.missions.values())
    }, null, 2), 'utf-8');
  }

  enqueue(payload) {
    const id = payload.id || crypto.randomUUID();
    const job = {
      id,
      ...payload,
      dependencies: Array.isArray(payload.dependencies) ? payload.dependencies : [],
      priority: Number(payload.priority || 0),
      attempts: Number(payload.attempts || 0),
      maxAttempts: Number(payload.maxAttempts || 1),
      logs: Array.isArray(payload.logs) ? payload.logs : [],
      status: payload.status || 'QUEUED',
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.jobs.set(id, job);
    this.save();
    return job;
  }

  enqueueMany(payloads) {
    const jobs = payloads.map((payload) => this.enqueue(payload));
    this.recalculateMissions();
    return jobs;
  }

  createMission(mission) {
    const record = {
      ...mission,
      id: mission.id || mission.missionId || crypto.randomUUID(),
      missionId: mission.missionId || mission.id,
      status: mission.status || 'QUEUED',
      createdAt: mission.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.missions.set(record.id, record);
    this.save();
    return record;
  }

  updateMission(id, updates) {
    const key = this.missions.has(id) ? id : Array.from(this.missions.keys()).find((k) => this.missions.get(k)?.missionId === id);
    if (!key) return null;
    const mission = this.missions.get(key);
    Object.assign(mission, updates, { updatedAt: new Date().toISOString() });
    this.missions.set(key, mission);
    this.save();
    return mission;
  }

  getMission(id) {
    return this.missions.get(id) || Array.from(this.missions.values()).find((mission) => mission.missionId === id) || null;
  }

  listMissions(filters = {}) {
    let arr = Array.from(this.missions.values());
    if (filters.status) arr = arr.filter((mission) => mission.status === filters.status);
    if (filters.projectId) arr = arr.filter((mission) => mission.projectId === filters.projectId);
    return arr.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  update(id, updates) {
    if (!this.jobs.has(id)) return null;
    const job = this.jobs.get(id);
    Object.assign(job, updates);
    job.updatedAt = new Date().toISOString();
    this.jobs.set(id, job);
    this.recalculateMissions();
    this.save();
    return job;
  }

  get(id) {
    return this.jobs.get(id) || null;
  }

  list(filters = {}) {
    let arr = Array.from(this.jobs.values());
    if (filters.status) arr = arr.filter(j => j.status === filters.status);
    if (filters.projectId) arr = arr.filter(j => j.projectId === filters.projectId);
    if (filters.missionId) arr = arr.filter(j => j.missionId === filters.missionId);
    return arr.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  }

  dependencyState(job) {
    const terminalOk = new Set(['COMPLETED', 'SUCCEEDED']);
    const dependencies = job.dependencies || [];
    const missing = dependencies
      .map((depId) => this.jobs.get(depId))
      .filter((dep) => !dep || !terminalOk.has(dep.status));
    return {
      ready: missing.length === 0,
      waitingFor: missing.map((dep) => dep?.id || 'missing-dependency')
    };
  }

  refreshRunnableStates() {
    for (const job of this.jobs.values()) {
      if (!['QUEUED', 'READY', 'WAITING_DEPENDENCY'].includes(job.status) || job.pausedAt || job.cancelRequestedAt) continue;
      const deps = this.dependencyState(job);
      const nextStatus = deps.ready ? 'READY' : 'WAITING_DEPENDENCY';
      if (job.status !== nextStatus || JSON.stringify(job.waitingFor || []) !== JSON.stringify(deps.waitingFor)) {
        job.status = nextStatus;
        job.waitingFor = deps.waitingFor;
        job.readyAt = deps.ready ? (job.readyAt || new Date().toISOString()) : null;
        job.updatedAt = new Date().toISOString();
      }
    }
    this.recalculateMissions();
    this.save();
  }

  getReadyJobs() {
    this.refreshRunnableStates();
    return this.list()
      .filter((job) => job.status === 'READY' && !job.pausedAt && !job.cancelRequestedAt);
  }

  metrics() {
    this.refreshRunnableStates();
    const jobs = Array.from(this.jobs.values());
    const count = (status) => jobs.filter((job) => job.status === status).length;
    return {
      total: jobs.length,
      ready: count('READY'),
      queued: count('QUEUED'),
      waitingDependency: count('WAITING_DEPENDENCY'),
      running: count('RUNNING'),
      retrying: count('RETRYING'),
      repairing: count('REPAIRING'),
      failed: count('FAILED'),
      completed: count('COMPLETED'),
      cancelled: count('CANCELLED'),
      paused: count('PAUSED')
    };
  }

  pause(id, reason = 'manual') {
    return this.update(id, { status: 'PAUSED', pausedAt: new Date().toISOString(), pauseReason: reason });
  }

  resume(id) {
    const job = this.get(id);
    if (!job || job.status !== 'PAUSED') return job || null;
    return this.update(id, { status: 'QUEUED', pausedAt: null, pauseReason: null });
  }

  cancel(id, reason = 'manual') {
    const job = this.get(id);
    if (!job) return null;
    return this.update(id, { status: 'CANCELLED', cancelRequestedAt: new Date().toISOString(), cancelReason: reason });
  }

  retry(id) {
    const job = this.get(id);
    if (!job || !['FAILED', 'CANCELLED', 'REPAIRING', 'RUNNING'].includes(job.status)) return job || null;
    return this.update(id, {
      status: 'QUEUED',
      error: null,
      lastError: job.error || job.lastError || null,
      failedAt: null,
      completedAt: null,
      cancelRequestedAt: null,
      retryOf: job.retryOf || job.id,
      attempts: Number(job.attempts || 0)
    });
  }

  recalculateMissions() {
    for (const mission of this.missions.values()) {
      const jobs = Array.from(this.jobs.values()).filter((job) => job.missionId === mission.id || job.missionId === mission.missionId);
      if (!jobs.length) continue;
      const stats = {
        totalJobs: jobs.length,
        completed: jobs.filter((job) => ['COMPLETED', 'SUCCEEDED'].includes(job.status)).length,
        failed: jobs.filter((job) => job.status === 'FAILED').length,
        cancelled: jobs.filter((job) => job.status === 'CANCELLED').length,
        running: jobs.filter((job) => job.status === 'RUNNING').length,
        queued: jobs.filter((job) => job.status === 'QUEUED').length,
        ready: jobs.filter((job) => job.status === 'READY').length,
        paused: jobs.filter((job) => job.status === 'PAUSED').length,
        repairing: jobs.filter((job) => job.status === 'REPAIRING').length,
        blocked: jobs.filter((job) => job.status === 'BLOCKED').length,
        waiting: jobs.filter((job) => ['WAITING', 'WAITING_DEPENDENCY'].includes(job.status)).length
      };
      let status = mission.status;
      if (stats.blocked) status = 'BLOCKED';
      else if (stats.repairing) status = 'REPAIRING';
      else if (stats.failed) status = 'FAILED';
      else if (stats.cancelled && stats.completed + stats.cancelled === stats.totalJobs) status = 'CANCELLED';
      else if (stats.completed === stats.totalJobs) status = 'COMPLETED';
      else if (stats.running) status = 'RUNNING';
      else if (stats.waiting) status = 'WAITING';
      else if (stats.paused) status = 'PAUSED';
      else if (stats.ready) status = 'READY';
      else status = 'QUEUED';
      Object.assign(mission, { stats, status, updatedAt: new Date().toISOString() });
      if (status === 'COMPLETED' && !mission.completedAt) mission.completedAt = new Date().toISOString();
      if (status === 'FAILED' && !mission.failedAt) mission.failedAt = new Date().toISOString();
      if (status !== 'FAILED') mission.failedAt = null;
    }
  }
}

module.exports = { JobQueue };
