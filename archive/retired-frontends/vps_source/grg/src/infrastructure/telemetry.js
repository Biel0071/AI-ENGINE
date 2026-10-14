const { SystemModule } = require('../kernel/module');
const os = require('node:os');
const process = require('node:process');

class Telemetry extends SystemModule {
  constructor(serviceRegistry, eventBus) {
    super('telemetry', '1.0.0');
    this.serviceRegistry = serviceRegistry;
    this.eventBus = eventBus;
  }

  async start() {
    this.status = 'starting';
    console.log(`[TELEMETRY] Starting telemetry collection...`);
    this.status = 'running';
    this.startTime = Date.now();
  }

  async metrics() {
    const registryMetrics = {};
    if (this.serviceRegistry) {
      for (const service of this.serviceRegistry.getAll()) {
        registryMetrics[service.id] = await service.metrics();
      }
    }
    
    return {
      status: this.status,
      uptime_ms: this.startTime ? Date.now() - this.startTime : 0,
      hardware: {
        cpu_usage: process.cpuUsage(),
        memory_usage: process.memoryUsage(),
        system_memory_free: os.freemem(),
        system_memory_total: os.totalmem(),
        load_avg: os.loadavg()
      },
      events: {
        total_published: this.eventBus ? this.eventBus.history.length : 0
      },
      subsystems: registryMetrics
    };
  }
}

module.exports = { Telemetry };
