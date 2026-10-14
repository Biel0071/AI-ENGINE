const fs = require('fs');
const path = require('path');

class WorkerRegistry {
  constructor(options = {}) {
    this.workers = new Map();
    this.capabilityIndex = new Map();
    this.eventBus = options.eventBus || null;
    this.router = options.router || null;
    this.intervalId = null;
  }

  async discoverAndRegister(workersDir) {
    if (!fs.existsSync(workersDir)) {
      console.warn(`[WorkerRegistry] Discovery directory not found: ${workersDir}`);
      return;
    }

    const files = fs.readdirSync(workersDir).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      try {
        const WorkerClass = require(path.join(workersDir, file));
        
        // Ensure it's a class and not an empty object export
        if (typeof WorkerClass === 'function') {
          const workerInstance = new WorkerClass({ 
            eventBus: this.eventBus, 
            router: this.router 
          });
          
          this.register(workerInstance);
        } else {
          // If the module exports an object with the class (e.g., module.exports = { PlannerWorker })
          const keys = Object.keys(WorkerClass);
          for (const key of keys) {
            const Cls = WorkerClass[key];
            if (typeof Cls === 'function' && Cls.name.endsWith('Worker')) {
              const workerInstance = new Cls({ 
                eventBus: this.eventBus, 
                router: this.router 
              });
              this.register(workerInstance);
            }
          }
        }
      } catch (err) {
        console.error(`[WorkerRegistry] Failed to discover worker in ${file}:`, err.message);
      }
    }
  }

  register(worker) {
    if (!worker.id || !worker.capabilities) {
      throw new Error(`[WorkerRegistry] Invalid worker instance`);
    }

    this.workers.set(worker.name, worker);
    
    // Publish capabilities
    for (const cap of worker.capabilities()) {
      if (!this.capabilityIndex.has(cap)) {
        this.capabilityIndex.set(cap, []);
      }
      this.capabilityIndex.get(cap).push(worker.name);
    }
    
    worker.start();
    console.log(`[WorkerRegistry] Registered worker: ${worker.name} v${worker.version}`);
  }

  getWorkerByCapability(capability) {
    const availableNames = this.capabilityIndex.get(capability) || [];
    // Basic load balancing: pick the one with smallest queue length that is healthy
    let bestWorker = null;
    let minQueue = Infinity;

    for (const name of availableNames) {
      const worker = this.workers.get(name);
      if (worker && worker.health() && worker.status() !== 'OFFLINE') {
        const q = worker.metrics().queueLength;
        if (q < minQueue) {
          minQueue = q;
          bestWorker = worker;
        }
      }
    }

    return bestWorker;
  }

  getWorkerByName(name) {
    return this.workers.get(name);
  }

  getAllMetrics() {
    const metrics = {};
    for (const [name, worker] of this.workers.entries()) {
      metrics[name] = {
        id: worker.id,
        version: worker.version,
        capabilities: worker.capabilities(),
        health: worker.health(),
        status: worker.status(),
        ...worker.metrics()
      };
    }
    return metrics;
  }

  startHealthCheck(intervalMs = 15000) {
    this.intervalId = setInterval(() => {
      for (const worker of this.workers.values()) {
        if (worker.status() !== 'OFFLINE') {
          // Triggers a heartbeat and health refresh
          worker.heartbeat();
        }
      }
    }, intervalMs);
    this.intervalId.unref(); // don't block process exit
  }

  stopAll() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    for (const worker of this.workers.values()) {
      worker.stop();
    }
  }
}

module.exports = { WorkerRegistry };
