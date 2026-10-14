const { WorkerBase } = require('../worker-base');

class ArchitectWorker extends WorkerBase {
  constructor(options = {}) {
    super({
      ...options,
      name: 'Architect',
      version: '1.0.0',
      capabilities: ['architecture']
    });
  }

  async _performWork(job) {
    if (this.router && this.router.isAvailable('architecture')) {
      const result = await this.router.execute('architecture', {
        prompt: `Execute job ${job.id} as Architect. Payload: ${JSON.stringify(job.payload)}`
      });
      return { success: true, processedBy: this.name, output: result };
    }
    return { success: true, processedBy: this.name, simulatedLLM: true };
  }
}

module.exports = { ArchitectWorker };
