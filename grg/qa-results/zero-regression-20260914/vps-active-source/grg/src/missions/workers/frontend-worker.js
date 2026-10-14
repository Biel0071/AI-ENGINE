const { WorkerBase } = require('../worker-base');

class FrontendWorker extends WorkerBase {
  constructor(options = {}) {
    super({
      ...options,
      name: 'Frontend',
      version: '1.0.0',
      capabilities: ['ui']
    });
  }

  async _performWork(job) {
    if (this.router && this.router.isAvailable('ui')) {
      const result = await this.router.execute('ui', {
        prompt: `Execute job ${job.id} as Frontend. Payload: ${JSON.stringify(job.payload)}`
      });
      return { success: true, processedBy: this.name, output: result };
    }
    return { success: true, processedBy: this.name, simulatedLLM: true };
  }
}

module.exports = { FrontendWorker };
