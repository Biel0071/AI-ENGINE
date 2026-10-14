const { measured, unknown } = require('../kernel/measurement');

// Smoke / E2E HONESTO.
//
// MEDIDO EM PRODUCAO (2026-07-29): runSmokeTests devolvia 5 cenarios todos 'PASSED' e
// 'ALL_SMOKE_TESTS_PASSED'; runE2ePlaywrightScenarios devolvia 'GREEN_PASS',
// passedScenariosCount 18, failedScenariosCount 0 -- tudo fixo, SEM executar um unico teste.
// Afirmar "18 cenarios passaram" sem rodar nenhum e o falso positivo mais perigoso de um
// pipeline de deploy: aprova release com base em teste que nunca correu.
//
// Smoke real faz requisicoes HTTP contra o ambiente; E2E real roda o Playwright. Nenhum dos
// dois existe aqui. Sem um runner real injetado, o resultado e NOT_IMPLEMENTED com o motivo --
// e um pipeline que consome isso deve tratar como "nao verificado", nao como "verde".
class TestingSmokeE2eService {
  constructor({ store, bus, controlPlane, observabilityCenter, smokeRunner = null, e2eRunner = null }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.observabilityCenter = observabilityCenter;
    this.smokeRunner = smokeRunner;
    this.e2eRunner = e2eRunner;
  }

  async runSmokeTests(tenantId, actorId, environment = 'STAGING') {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    if (!this.smokeRunner || typeof this.smokeRunner.run !== 'function') {
      return { tenantId, environment, result: unknown('no real smoke runner is wired; no HTTP checks were executed', { action: 'wire a smoke runner that hits the environment endpoints' }), executedAt: new Date().toISOString() };
    }
    // Runner real devolve cenarios com resultado medido de cada requisicao.
    const scenarios = await this.smokeRunner.run({ tenantId, environment });
    const passed = scenarios.filter((s) => s.ok).length;
    return { tenantId, environment, result: measured({ scenariosCount: scenarios.length, passed, failed: scenarios.length - passed, scenarios }, 'smoke-runner'), executedAt: new Date().toISOString() };
  }

  async runE2ePlaywrightScenarios(tenantId, actorId, suiteName = 'Main User Journey') {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    if (!this.e2eRunner || typeof this.e2eRunner.run !== 'function') {
      return { tenantId, suiteName, result: unknown('no real E2E runner is wired; Playwright was not executed', { action: 'wire a Playwright runner' }), executedAt: new Date().toISOString() };
    }
    const outcome = await this.e2eRunner.run({ tenantId, suiteName });
    return { tenantId, suiteName, result: measured(outcome, 'e2e-runner'), executedAt: new Date().toISOString() };
  }
}

module.exports = { TestingSmokeE2eService };
