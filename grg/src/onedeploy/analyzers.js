const { measured, unknown } = require('../kernel/measurement');

// Analisadores de projeto HONESTOS.
//
// MEDIDO EM PRODUCAO (2026-07-29): analyzeFrontend/analyzeBackend devolviam
// accessibilityScore 100.0, performanceScore 98.4, architectureQualityScore 99.8, status
// HEALTHY_ZERO_SMELLS -- tudo escrito a mao, SEM analisar um unico arquivo. Um relatorio de
// qualidade perfeito sobre codigo que nunca foi lido e a definicao de simulacao.
//
// Analise real de codigo (contar componentes, rotas, smells, cobertura) exige um analisador
// que percorra o filesystem do projeto-alvo -- que este servico nao possui. Sem ele, a resposta
// honesta e `unknown` com a pendencia nomeada. Quando um analisador real (`this.analyzer`) for
// injetado, ele roda e o relatorio carrega metricas medidas. Nunca um score fixo.
class ProjectAnalyzersService {
  constructor({ store, bus, controlPlane, analyzer = null }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.analyzer = analyzer;
  }

  async analyzeFrontend(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    if (!this.analyzer || typeof this.analyzer.frontend !== 'function') {
      return { tenantId, frontendReport: unknown('no real frontend analyzer is wired; code was not inspected', { action: 'wire a static analysis pass over the target project' }), analyzedAt: new Date().toISOString() };
    }
    const report = await this.analyzer.frontend(tenantId);
    return { tenantId, frontendReport: measured(report, 'frontend-analyzer'), analyzedAt: new Date().toISOString() };
  }

  async analyzeBackend(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    if (!this.analyzer || typeof this.analyzer.backend !== 'function') {
      return { tenantId, backendReport: unknown('no real backend analyzer is wired; code was not inspected', { action: 'wire a static analysis pass over the target project' }), analyzedAt: new Date().toISOString() };
    }
    const report = await this.analyzer.backend(tenantId);
    return { tenantId, backendReport: measured(report, 'backend-analyzer'), analyzedAt: new Date().toISOString() };
  }
}

module.exports = { ProjectAnalyzersService };
