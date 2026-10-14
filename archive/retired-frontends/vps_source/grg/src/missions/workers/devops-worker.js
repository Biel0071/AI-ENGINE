const { WorkerBase } = require('../worker-base');

class DevOpsWorker extends WorkerBase {
  constructor(options = {}) {
    super({
      ...options,
      name: 'DevOps',
      version: '1.0.0',
      capabilities: ['routing']
    });
  }

  async _performWork(job) {
    if (this.router && this.router.isAvailable('routing')) {
      const result = await this.router.execute('routing', {
        prompt: `Execute job ${job.id} as DevOps. Payload: ${JSON.stringify(job.payload)}`
      });
      return { success: true, processedBy: this.name, output: result };
    }
    return { success: true, processedBy: this.name, simulatedLLM: true };
  }
}

module.exports = { DevOpsWorker };
