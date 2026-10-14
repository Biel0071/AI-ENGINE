const { WorkerBase } = require('../worker-base');

class BackendWorker extends WorkerBase {
  constructor(options = {}) {
    super({
      ...options,
      name: 'Backend',
      version: '1.0.0',
      capabilities: ['backend']
    });
  }

  async _performWork(job) {
    if (this.router && this.router.isAvailable('backend')) {
      const result = await this.router.execute('backend', {
        prompt: `Execute job ${job.id} as Backend. Payload: ${JSON.stringify(job.payload)}`
      });
      return { success: true, processedBy: this.name, output: result };
    }
    return { success: true, processedBy: this.name, simulatedLLM: true };
  }
}

module.exports = { BackendWorker };
