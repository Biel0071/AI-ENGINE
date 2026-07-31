const { WorkerBase } = require('../worker-base');

class DocumentationWorker extends WorkerBase {
  constructor(options = {}) {
    super({
      ...options,
      name: 'Documentation',
      version: '1.0.0',
      capabilities: ['summaries']
    });
  }

  async _performWork(job) {
    if (this.router && this.router.isAvailable('summaries')) {
      const result = await this.router.execute('summaries', {
        prompt: `Execute job ${job.id} as Documentation. Payload: ${JSON.stringify(job.payload)}`
      });
      return { success: true, processedBy: this.name, output: result };
    }
    return { success: true, processedBy: this.name, simulatedLLM: true };
  }
}

module.exports = { DocumentationWorker };
