const { WorkerBase } = require('../worker-base');

class SecurityWorker extends WorkerBase {
  constructor(options = {}) {
    super({
      ...options,
      name: 'Security',
      version: '1.0.0',
      capabilities: ['security']
    });
  }

  async _performWork(job) {
    if (this.router && this.router.isAvailable('security')) {
      const result = await this.router.execute('security', {
        prompt: `Execute job ${job.id} as Security. Payload: ${JSON.stringify(job.payload)}`
      });
      return { success: true, processedBy: this.name, output: result };
    }
    return { success: true, processedBy: this.name, simulatedLLM: true };
  }
}

module.exports = { SecurityWorker };
