const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class JobQueue {
  constructor(dataFile) {
    this.dataFile = dataFile;
    this.jobs = new Map();
    this.load();
  }

  load() {
    if (fs.existsSync(this.dataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        if (data.jobs) {
          for (const j of data.jobs) {
            // Restore active jobs that were abruptly terminated
            if (j.status === 'RUNNING' || j.status === 'PLANNING' || j.status === 'TESTING') {
              j.status = 'QUEUED'; // Re-queue on restart
            }
            this.jobs.set(j.id, j);
          }
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
      jobs: Array.from(this.jobs.values())
    }, null, 2), 'utf-8');
  }

  enqueue(payload) {
    const id = payload.id || crypto.randomUUID();
    const job = {
      id,
      ...payload,
      status: payload.status || 'QUEUED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.jobs.set(id, job);
    this.save();
    return job;
  }

  update(id, updates) {
    if (!this.jobs.has(id)) return null;
    const job = this.jobs.get(id);
    Object.assign(job, updates);
    job.updatedAt = new Date().toISOString();
    this.jobs.set(id, job);
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
    return arr;
  }
}

module.exports = { JobQueue };
