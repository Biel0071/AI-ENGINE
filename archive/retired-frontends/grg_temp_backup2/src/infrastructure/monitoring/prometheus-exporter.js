class PrometheusExporter {
  constructor({ store }) { this.store = store; }
  async render() {
    const state = await this.store.read(); const lines = [];
    const gauge = (name, help, value, labels = '') => { lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} gauge`, `${name}${labels} ${Number(value)}`); };
    gauge('fenix_runtime_jobs', 'Runtime jobs by status', state.runtimeJobs.length);
    for (const status of ['QUEUED', 'RUNNING', 'SUCCEEDED', 'DEAD_LETTER', 'CANCELLED']) gauge(`fenix_runtime_jobs_${status.toLowerCase()}`, `Runtime jobs in ${status}`, state.runtimeJobs.filter((item) => item.status === status).length);
    gauge('fenix_runtime_workers', 'Known runtime workers', state.workerHeartbeats.length);
    gauge('fenix_cognitive_hypotheses', 'Cognitive hypotheses', state.cognitiveHypotheses.length);
    gauge('fenix_cognitive_validations_success', 'Successful cognitive validations', state.cognitiveValidations.filter((item) => item.success).length);
    gauge('fenix_cognitive_validations_failed', 'Failed cognitive validations', state.cognitiveValidations.filter((item) => !item.success).length);
    gauge('fenix_services_registered', 'Registered services', state.serviceRegistry.length);
    gauge('fenix_city_nodes', 'AI City nodes', state.cityNodes.length);
    gauge('fenix_dead_letters', 'Runtime dead letters', state.deadLetters.length);
    return `${lines.join('\n')}\n`;
  }
}
module.exports = { PrometheusExporter };
