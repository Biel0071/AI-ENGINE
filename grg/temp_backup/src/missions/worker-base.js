const crypto = require('node:crypto');

class WorkerBase {
  constructor(options = {}) {
    this.id = options.id || `worker_${crypto.randomUUID()}`;
    this.version = options.version || '1.0.0';
    this.name = options.name || 'UnknownWorker';
    this._capabilities = options.capabilities || [];
    
    // Dependencies
    this.eventBus = options.eventBus || null;
    this.router = options.router || null;

    // State
    this._status = 'IDLE'; // IDLE, BUSY, OFFLINE
    this._isHealthy = true;
    this._queueLength = 0;
    this._startTime = Date.now();
    this._lastHeartbeat = Date.now();

    // Metrics
    this._metrics = {
      jobsExecuted: 0,
      totalExecutionTimeMs: 0,
      errors: 0,
      cpuUsagePercent: 0,
      memoryUsageMB: 0
    };
  }

  // --- Core Methods ---
  
  async start() {
    this._status = 'IDLE';
    this._isHealthy = true;
    this._startTime = Date.now();
    this.heartbeat();
    this._emitEvent('WorkerStarted');
  }

  async stop() {
    this._status = 'OFFLINE';
    this._emitEvent('WorkerStopped');
  }

  async execute(job) {
    if (this._status === 'OFFLINE' || !this._isHealthy) {
      throw new Error(`[${this.name}] Cannot execute job, worker is ${this._status}`);
    }

    this._queueLength++;
    this._status = 'BUSY';
    this._emitEvent('WorkerBusy', { jobId: job.id });

    const startTime = Date.now();
    let result = null;
    
    try {
      // Execute the concrete implementation
      result = await this._performWork(job);
      
      this._metrics.jobsExecuted++;
      this._emitEvent('WorkerFinished', { jobId: job.id });
    } catch (err) {
      this._metrics.errors++;
      this._emitEvent('WorkerFailed', { jobId: job.id, error: err.message });
      throw err;
    } finally {
      this._metrics.totalExecutionTimeMs += (Date.now() - startTime);
      this._queueLength--;
      this._status = this._queueLength > 0 ? 'BUSY' : 'IDLE';
      
      if (this._status === 'IDLE') {
        this.heartbeat();
      }
    }

    return result;
  }

  // To be implemented by subclasses
  async _performWork(job) {
    throw new Error('_performWork must be implemented by subclass');
  }

  // --- Telemetry & State ---

  health() {
    // Determine dynamic health
    return this._isHealthy;
  }

  heartbeat() {
    this._lastHeartbeat = Date.now();
    this._updateSystemMetrics();
    this._emitEvent('Heartbeat', { 
      uptime: this.uptime(), 
      health: this.health(), 
      status: this.status() 
    });
  }

  metrics() {
    const avgTime = this._metrics.jobsExecuted > 0 
      ? this._metrics.totalExecutionTimeMs / this._metrics.jobsExecuted 
      : 0;

    const errorRate = this._metrics.jobsExecuted > 0
      ? this._metrics.errors / (this._metrics.jobsExecuted + this._metrics.errors)
      : 0;

    return {
      jobsExecuted: this._metrics.jobsExecuted,
      avgTimeMs: avgTime,
      errorRate: errorRate,
      queueLength: this._queueLength,
      memoryUsageMB: this._metrics.memoryUsageMB,
      cpuUsagePercent: this._metrics.cpuUsagePercent,
      uptimeSeconds: this.uptime()
    };
  }

  capabilities() {
    return this._capabilities;
  }

  status() {
    return this._status;
  }

  uptime() {
    return Math.floor((Date.now() - this._startTime) / 1000);
  }

  // --- Internal ---

  _emitEvent(eventName, payload = {}) {
    if (this.eventBus) {
      try {
        this.eventBus.emit(eventName, { workerId: this.id, workerName: this.name, ...payload });
      } catch (err) {
        console.error(`[WorkerBase] Failed to emit ${eventName}:`, err.message);
      }
    } else {
      // console.log(`[EVENT] ${eventName} from ${this.name}`, payload);
    }
  }

  _updateSystemMetrics() {
    // In a real environment, read from `process.memoryUsage()` and `os.loadavg()`
    const mem = process.memoryUsage();
    this._metrics.memoryUsageMB = Math.round(mem.rss / 1024 / 1024);
    
    // Stub CPU usage for now as obtaining cross-platform CPU usage in Node is async/complex
    this._metrics.cpuUsagePercent = Math.random() * 5 + 1; 
  }
}

module.exports = { WorkerBase };
