const { WorkerBase } = require('../worker-base');

class PlannerWorker extends WorkerBase {
  constructor(options = {}) {
    super({
      ...options,
      name: 'Planner',
      version: '1.0.0',
      capabilities: ['planning']
    });
  }

  async _performWork(job) {
    if (this.router && this.router.isAvailable('planning')) {
      const result = await this.router.execute('planning', {
        prompt: `Execute job ${job.id} as Planner. Payload: ${JSON.stringify(job.payload)}`
      });
      return { success: true, processedBy: this.name, output: result };
    }
    return { success: true, processedBy: this.name, simulatedLLM: true };
  }
}

module.exports = { PlannerWorker };
