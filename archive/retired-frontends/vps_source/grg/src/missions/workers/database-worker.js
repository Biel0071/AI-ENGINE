const { WorkerBase } = require('../worker-base');

class DatabaseWorker extends WorkerBase {
  constructor(options = {}) {
    super({
      ...options,
      name: 'Database',
      version: '1.0.0',
      capabilities: ['crud']
    });
  }

  async _performWork(job) {
    if (this.router && this.router.isAvailable('crud')) {
      const result = await this.router.execute('crud', {
        prompt: `Execute job ${job.id} as Database. Payload: ${JSON.stringify(job.payload)}`
      });
      return { success: true, processedBy: this.name, output: result };
    }
    return { success: true, processedBy: this.name, simulatedLLM: true };
  }
}

module.exports = { DatabaseWorker };
