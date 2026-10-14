const { SystemModule } = require('../kernel/module');

class WorkerScheduler extends SystemModule {
  constructor(eventBus) {
    super('worker_scheduler', '1.0.0');
    this.workers = new Map();
    this.eventBus = eventBus;
  }

  async start() {
    this.status = 'starting';
    console.log(`[WORKER] Starting Worker Scheduler...`);
    
    // Subscribe to test events
    if (this.eventBus) {
      this.eventBus.subscribe('WorkerTestRequested', async (event) => {
        console.log(`[WORKER] Worker Started (Job: ${event.payload.jobId})`);
        this.eventBus.publish('WorkerStarted', { jobId: event.payload.jobId });
        
        console.log(`[WORKER] Worker Running (Job: ${event.payload.jobId})`);
        await new Promise(resolve => setTimeout(resolve, 500)); // simulate work
        
        console.log(`[WORKER] Worker Finished (Job: ${event.payload.jobId})`);
        this.eventBus.publish('WorkerFinished', { jobId: event.payload.jobId });
      });
    }

    this.status = 'running';
    this.startTime = Date.now();
  }

  registerWorker(role, workerFn) {
    if (!this.workers.has(role)) {
      this.workers.set(role, []);
    }
    this.workers.get(role).push(workerFn);
  }

  async health() {
    const parentHealth = await super.health();
    return {
      ...parentHealth,
      details: {
        registeredRoles: Array.from(this.workers.keys()),
        totalWorkers: Array.from(this.workers.values()).reduce((acc, curr) => acc + curr.length, 0)
      }
    };
  }
}

module.exports = { WorkerScheduler };
