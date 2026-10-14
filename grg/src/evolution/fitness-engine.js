'use strict';
/**
 * FÊNIX OS — Fitness Engine
 * Métricas específicas por domínio. Sem métrica universal única.
 * NUNCA fabricar scores — UNAVAILABLE se não houver dados reais.
 * Cada missão define sua própria função de avaliação.
 */

// ─── DOMÍNIOS ─────────────────────────────────────────────────────────────────

const DOMAINS = Object.freeze({
  CODE_GENERATION: 'CODE_GENERATION',
  TEST_EXECUTION: 'TEST_EXECUTION',
  SECURITY_SCAN: 'SECURITY_SCAN',
  DEPLOYMENT: 'DEPLOYMENT',
  RESEARCH: 'RESEARCH',
  DATA_ANALYSIS: 'DATA_ANALYSIS',
  UI_GENERATION: 'UI_GENERATION',
  PLANNING: 'PLANNING',
  DEBUGGING: 'DEBUGGING',
});

// Métricas canônicas
const METRICS = Object.freeze({
  CORRECTNESS: 'CORRECTNESS',          // resultado correto vs esperado
  TEST_PASS_RATE: 'TEST_PASS_RATE',    // % de testes que passaram
  ROBUSTNESS: 'ROBUSTNESS',            // resiste a inputs adversariais
  SECURITY: 'SECURITY',                // zero violações de segurança
  RELIABILITY: 'RELIABILITY',          // % de execuções sem erro
  LATENCY: 'LATENCY',                  // tempo de execução (ms)
  COST: 'COST',                        // custo em USD / tokens
  RESOURCE_USAGE: 'RESOURCE_USAGE',    // CPU/RAM/GPU
  MAINTAINABILITY: 'MAINTAINABILITY',  // qualidade do código gerado
  REGRESSION_RATE: 'REGRESSION_RATE',  // % de testes que quebraram
  RECOVERY_RATE: 'RECOVERY_RATE',      // % de recuperação de falhas
  TASK_COMPLETION: 'TASK_COMPLETION',  // tarefa concluída S/N
  VERIFICATION_QUALITY: 'VERIFICATION_QUALITY', // qualidade da auto-verificação
});

// Hard Gates — bloqueios absolutos (pontuação compensatória não remove)
const HARD_GATE_VIOLATIONS = Object.freeze([
  'SECURITY_VIOLATION',
  'CRITICAL_REGRESSION',
  'TEST_FAILURE_CRITICAL',
  'CORRUPTED_ARTIFACT',
  'INVALID_DEPENDENCY',
  'UNAUTHORIZED_ACTION',
  'FALSE_VERIFICATION',
  'SECRET_LEAKED',
  'MOCK_IN_PRODUCTION',
]);

class FitnessEngine {
  constructor() {
    /** @type {Map<string, FitnessFunction>} domain → função */
    this._fitnessFunctions = new Map();
    /** @type {Array<FitnessRecord>} */
    this._records = [];

    // Registrar funções padrão
    this._registerDefaults();
  }

  // ─── REGISTRO DE FUNÇÕES ──────────────────────────────────────────────────

  registerFitnessFunction(domain, fn, description = '') {
    if (!fn || typeof fn !== 'function') throw new Error('FitnessEngine: fitness function deve ser uma função');
    this._fitnessFunctions.set(domain, { fn, description, registeredAt: now() });
  }

  // ─── AVALIAÇÃO ────────────────────────────────────────────────────────────

  /**
   * Avalia um resultado de experimento.
   * Retorna { score, metrics, hardGateViolations, verdict, evidence }
   */
  evaluate(domain, result, context = {}) {
    // 1. Hard Gates primeiro — REJECT imediato se violado
    const violations = this._checkHardGates(result, context);
    if (violations.length > 0) {
      const record = this._buildRecord(domain, result, context, null, violations, 'REJECTED');
      this._records.push(record);
      return record;
    }

    // 2. Fitness function específica do domínio
    const ffEntry = this._fitnessFunctions.get(domain);
    if (!ffEntry) {
      // Sem função registrada — UNAVAILABLE (nunca PASS fabricado)
      return this._buildRecord(domain, result, context, null, [], 'UNAVAILABLE');
    }

    let score, metrics;
    try {
      ({ score, metrics } = ffEntry.fn(result, context));
    } catch (err) {
      return this._buildRecord(domain, result, context, null, [], 'ERROR', { error: err.message });
    }

    const verdict = score >= (context.minPassScore || 0.6) ? 'PASS' : 'FAIL';
    const record = this._buildRecord(domain, result, context, { score, metrics }, [], verdict);
    this._records.push(record);
    return record;
  }

  // ─── COMPARAÇÃO (antes/depois) ────────────────────────────────────────────

  /**
   * Compara dois resultados. NUNCA afirma melhoria sem evidência real.
   */
  compare(recordA, recordB) {
    if (!recordA.scoreData || !recordB.scoreData) {
      return { verdict: 'UNDECIDED', reason: 'Dados insuficientes para comparação — UNAVAILABLE' };
    }
    const delta = recordB.scoreData.score - recordA.scoreData.score;
    const improved = delta > 0.01; // threshold mínimo de melhoria significativa
    return {
      verdict: improved ? 'IMPROVED' : delta < -0.01 ? 'REGRESSED' : 'EQUIVALENT',
      delta,
      before: recordA.scoreData.score,
      after: recordB.scoreData.score,
      evidence: [recordA.id, recordB.id],
    };
  }

  // ─── HISTÓRICO ────────────────────────────────────────────────────────────

  getRecords(filters = {}) {
    let result = [...this._records];
    if (filters.domain) result = result.filter((r) => r.domain === filters.domain);
    if (filters.agentId) result = result.filter((r) => r.context?.agentId === filters.agentId);
    if (filters.verdict) result = result.filter((r) => r.verdict === filters.verdict);
    if (filters.limit) result = result.slice(-filters.limit);
    return result;
  }

  // ─── HARD GATES ───────────────────────────────────────────────────────────

  _checkHardGates(result, context) {
    const violations = [];
    if (result.securityViolation) violations.push('SECURITY_VIOLATION');
    if (result.criticalRegression) violations.push('CRITICAL_REGRESSION');
    if (result.criticalTestFailure) violations.push('TEST_FAILURE_CRITICAL');
    if (result.corruptedArtifact) violations.push('CORRUPTED_ARTIFACT');
    if (result.invalidDependency) violations.push('INVALID_DEPENDENCY');
    if (result.unauthorizedAction) violations.push('UNAUTHORIZED_ACTION');
    if (result.falseVerification) violations.push('FALSE_VERIFICATION');
    if (result.secretLeaked) violations.push('SECRET_LEAKED');
    if (result.mockInProduction) violations.push('MOCK_IN_PRODUCTION');
    return violations;
  }

  _buildRecord(domain, result, context, scoreData, violations, verdict, extra = {}) {
    return {
      id: `fit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      domain,
      verdict,
      scoreData: scoreData || null,
      hardGateViolations: violations,
      conditions: context.conditions || {},
      agentLineage: context.agentLineage || [],
      timestamp: now(),
      evidence: result.evidence || [],
      context,
      ...extra,
    };
  }

  // ─── FUNÇÕES PADRÃO ───────────────────────────────────────────────────────

  _registerDefaults() {
    // CODE_GENERATION: baseia em test pass rate + correctness
    this.registerFitnessFunction(DOMAINS.CODE_GENERATION, (result) => {
      const testPassRate = typeof result.testPassRate === 'number' ? result.testPassRate : null;
      const correctness = typeof result.correctness === 'number' ? result.correctness : null;
      if (testPassRate === null && correctness === null) throw new Error('UNAVAILABLE: sem dados de teste');
      const score = ((testPassRate ?? 0) * 0.6) + ((correctness ?? 0) * 0.4);
      return {
        score,
        metrics: {
          [METRICS.TEST_PASS_RATE]: testPassRate,
          [METRICS.CORRECTNESS]: correctness,
          [METRICS.REGRESSION_RATE]: result.regressionRate ?? null,
        },
      };
    }, 'Avalia geração de código por test pass rate + correctness');

    // TEST_EXECUTION
    this.registerFitnessFunction(DOMAINS.TEST_EXECUTION, (result) => {
      const passed = Number(result.passed || 0);
      const total = Number(result.total || 0);
      if (total === 0) throw new Error('UNAVAILABLE: nenhum teste executado');
      const score = passed / total;
      return {
        score,
        metrics: {
          [METRICS.TEST_PASS_RATE]: score,
          [METRICS.TASK_COMPLETION]: total > 0 ? 1 : 0,
        },
      };
    }, 'Taxa de testes passando');

    // SECURITY_SCAN
    this.registerFitnessFunction(DOMAINS.SECURITY_SCAN, (result) => {
      const critical = Number(result.criticalFindings || 0);
      const high = Number(result.highFindings || 0);
      if (critical > 0) throw new Error('SECURITY_VIOLATION: findings críticos detectados');
      const score = Math.max(0, 1 - (high * 0.1));
      return {
        score,
        metrics: {
          [METRICS.SECURITY]: score,
          [METRICS.VERIFICATION_QUALITY]: result.scanCoverage ?? null,
        },
      };
    }, 'Qualidade de scan de segurança');

    // DEPLOYMENT
    this.registerFitnessFunction(DOMAINS.DEPLOYMENT, (result) => {
      if (!result.deploySucceeded) throw new Error('UNAVAILABLE: deploy falhou');
      const score = result.healthCheckPassed ? 1.0 : 0.5;
      return {
        score,
        metrics: {
          [METRICS.RELIABILITY]: result.deploySucceeded ? 1 : 0,
          [METRICS.LATENCY]: result.deployDurationMs ?? null,
        },
      };
    }, 'Sucesso de deploy + health check');
  }
}

function now() {
  return new Date().toISOString();
}

module.exports = { FitnessEngine, DOMAINS, METRICS, HARD_GATE_VIOLATIONS };
