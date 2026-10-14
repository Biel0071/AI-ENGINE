const { SystemModule } = require('../../kernel/module');

class FenixWatch extends SystemModule {
  constructor({ eventBus = null, orchestrator = null } = {}) {
    super('fenix_watch', '1.0.0');
    this.eventBus = eventBus;
    this.orchestrator = orchestrator;
    this.watchedProjects = new Set();
  }

  async start() {
    this.status = 'ONLINE';
    if (this.eventBus) {
       this.eventBus.on('build.failed', (data) => this.handleIncident('build', data));
       this.eventBus.on('test.failed', (data) => this.handleIncident('test', data));
       this.eventBus.on('runtime.crash', (data) => this.handleIncident('runtime', data));
    }
    return this;
  }

  watchProject(projectId) {
    this.watchedProjects.add(projectId);
  }

  handleIncident(type, data) {
    const projectId = data.projectId;
    if (!this.watchedProjects.has(projectId)) return;

    if (this.orchestrator) {
      this.orchestrator.submitJob({
        projectId,
        title: 'FenixWatch: Auto-Repair ' + type,
        objective: 'Analisar e corrigir falha detectada pelo FenixWatch 24/7',
        riskLevel: 'SAFE' // Prod/Deploys demandem APPROVAL (WARNING)
      }).catch(console.error);
    }
  }
}

module.exports = { FenixWatch };
