'use strict';
/**
 * FÊNIX OS — Scientist Agent
 * Analisa experimentos, compara estratégias, formula hipóteses,
 * detecta padrões de sucesso/falha, propõe novos experimentos.
 * NÃO executa tarefas — analisa evidências.
 */

const crypto = require('crypto');

class ScientistAgent {
  constructor(opts = {}) {
    this.id = opts.id || `scientist_${crypto.randomBytes(6).toString('hex')}`;
    this.name = opts.name || 'Scientist Agent';
    /** @type {ExperimentRecord[]} */
    this._experiments = [];
    /** @type {Hypothesis[]} */
    this._hypotheses = [];
    /** @type {Pattern[]} */
    this._patterns = [];
    this._analysisLog = [];
  }

  // ─── REGISTRO DE EXPERIMENTOS ─────────────────────────────────────────────

  /**
   * Registra resultado de um experimento.
   * NÃO aceita mock ou resultado fabricado.
   */
  recordExperiment(exp) {
    this._validateExperiment(exp);
    const record = {
      id: exp.id || `exp_${crypto.randomBytes(8).toString('hex')}`,
      strategy: String(exp.strategy),
      domain: String(exp.domain || 'generic'),
      conditions: exp.conditions || {},
      result: exp.result,  // objeto completo, não apenas score
      score: typeof exp.score === 'number' ? exp.score : null,
      verdict: exp.verdict, // PASS / FAIL / REJECTED / UNAVAILABLE
      agentId: exp.agentId || null,
      agentGeneration: exp.agentGeneration || 0,
      agentLineage: exp.agentLineage || [],
      evidence: Array.isArray(exp.evidence) ? exp.evidence : [],
      durationMs: exp.durationMs || null,
      costUsd: exp.costUsd || null,
      timestamp: exp.timestamp || now(),
    };
    this._experiments.push(record);
    return record;
  }

  // ─── ANÁLISE ──────────────────────────────────────────────────────────────

  /**
   * Analisa experimentos para descobrir padrões.
   * Retorna insights reais baseados em evidência, nunca opinião fabricada.
   */
  analyze(domain = null, minExperiments = 5) {
    const experiments = domain
      ? this._experiments.filter((e) => e.domain === domain)
      : this._experiments;

    if (experiments.length < minExperiments) {
      return {
        status: 'INSUFFICIENT_DATA',
        message: `Mínimo de ${minExperiments} experimentos necessários. Atual: ${experiments.length}`,
        recommendations: [],
      };
    }

    const insights = [];

    // 1. Comparação de estratégias por taxa de sucesso
    const strategyAnalysis = this._analyzeStrategies(experiments);
    insights.push(...strategyAnalysis);

    // 2. Detecção de condições de sucesso
    const conditionAnalysis = this._analyzeConditions(experiments);
    insights.push(...conditionAnalysis);

    // 3. Detecção de padrões de falha
    const failureAnalysis = this._analyzeFailures(experiments);
    insights.push(...failureAnalysis);

    // 4. Detecção de overfitting (score alto mas falha em condições novas)
    const overfitAnalysis = this._detectOverfitting(experiments);
    if (overfitAnalysis) insights.push(overfitAnalysis);

    // 5. Detectar métricas enganadoras
    const deceptiveMetrics = this._detectDeceptiveMetrics(experiments);
    if (deceptiveMetrics) insights.push(deceptiveMetrics);

    const analysis = {
      status: 'COMPLETE',
      domain,
      experimentCount: experiments.length,
      insights,
      patterns: this._extractPatterns(experiments),
      hypotheses: this._generateHypotheses(insights),
      recommendations: this._buildRecommendations(insights),
      timestamp: now(),
    };

    this._analysisLog.push({ ...analysis, id: `analysis_${crypto.randomBytes(6).toString('hex')}` });
    return analysis;
  }

  /**
   * Propõe próximo experimento baseado em lacunas do conhecimento.
   * Busca informação, não volume.
   */
  proposeNextExperiment(domain = null) {
    const experiments = domain
      ? this._experiments.filter((e) => e.domain === domain)
      : this._experiments;

    // Identificar estratégias sub-exploradas
    const strategyCount = {};
    for (const exp of experiments) {
      strategyCount[exp.strategy] = (strategyCount[exp.strategy] || 0) + 1;
    }

    // Identificar condições ainda não testadas
    const conditions = experiments.map((e) => JSON.stringify(e.conditions));
    const uniqueConditions = new Set(conditions).size;

    const proposal = {
      id: `proposal_${crypto.randomBytes(6).toString('hex')}`,
      rationale: [],
      suggestedStrategy: null,
      suggestedConditions: {},
      expectedLearning: '',
      priority: 'MEDIUM',
    };

    // Se duas estratégias já testadas > 100x com resultado equivalente → buscar nova estratégia
    const dominated = Object.entries(strategyCount).filter(([, count]) => count > 100);
    if (dominated.length >= 2) {
      proposal.rationale.push('Estratégias existentes já densamente amostradas. Explorar nova variante.');
      proposal.priority = 'HIGH';
      proposal.expectedLearning = 'Descobrir se nova estratégia supera plateau atual';
      proposal.suggestedStrategy = 'NEW_VARIANT';
    }

    // Se condições únicas < 20% do total → diversificar condições
    if (uniqueConditions < Math.ceil(experiments.length * 0.2)) {
      proposal.rationale.push('Baixa diversidade de condições. Testar em novos contextos.');
      proposal.suggestedConditions = { novelty: true };
    }

    // Identificar estratégia promissora com poucos dados
    const promisingUndertested = Object.entries(strategyCount)
      .filter(([strat, count]) => {
        const exps = experiments.filter((e) => e.strategy === strat);
        const successRate = exps.filter((e) => e.verdict === 'PASS').length / exps.length;
        return successRate > 0.75 && count < 20;
      });

    if (promisingUndertested.length > 0) {
      const [strategy] = promisingUndertested[0];
      proposal.suggestedStrategy = strategy;
      proposal.rationale.push(`Estratégia "${strategy}" promissora mas sub-amostrada.`);
      proposal.expectedLearning = `Confirmar robustez de "${strategy}" com mais experimentos`;
      proposal.priority = 'HIGH';
    }

    return proposal;
  }

  // ─── HIPÓTESES ────────────────────────────────────────────────────────────

  recordHypothesis(hypothesis) {
    const h = {
      id: `hyp_${crypto.randomBytes(6).toString('hex')}`,
      statement: String(hypothesis.statement),
      conditions: hypothesis.conditions || {},
      testingStrategy: hypothesis.testingStrategy || '',
      status: 'PENDING',
      evidence: [],
      createdAt: now(),
    };
    this._hypotheses.push(h);
    return h;
  }

  resolveHypothesis(hypothesisId, verdict, evidence = []) {
    const h = this._hypotheses.find((h) => h.id === hypothesisId);
    if (!h) throw new Error(`ScientistAgent: hipótese ${hypothesisId} não encontrada`);
    h.status = verdict; // 'CONFIRMED' | 'REJECTED' | 'INCONCLUSIVE'
    h.evidence = [...h.evidence, ...evidence];
    h.resolvedAt = now();
    return h;
  }

  getHypotheses(status = null) {
    return status ? this._hypotheses.filter((h) => h.status === status) : [...this._hypotheses];
  }

  // ─── ESTADO ───────────────────────────────────────────────────────────────

  getStats() {
    const experiments = this._experiments;
    const byVerdict = {};
    for (const e of experiments) {
      byVerdict[e.verdict] = (byVerdict[e.verdict] || 0) + 1;
    }
    return {
      totalExperiments: experiments.length,
      hypotheses: this._hypotheses.length,
      patterns: this._patterns.length,
      byVerdict,
      analyses: this._analysisLog.length,
    };
  }

  // ─── ANÁLISE INTERNA ──────────────────────────────────────────────────────

  _analyzeStrategies(experiments) {
    const byStrategy = {};
    for (const exp of experiments) {
      if (!byStrategy[exp.strategy]) byStrategy[exp.strategy] = [];
      byStrategy[exp.strategy].push(exp);
    }
    const comparison = [];
    for (const [strategy, exps] of Object.entries(byStrategy)) {
      const passing = exps.filter((e) => e.verdict === 'PASS').length;
      const successRate = passing / exps.length;
      const scores = exps.map((e) => e.score).filter((s) => s !== null);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      comparison.push({ strategy, n: exps.length, successRate, avgScore });
    }
    comparison.sort((a, b) => b.successRate - a.successRate);
    return comparison.map((item, i) => ({
      type: 'STRATEGY_COMPARISON',
      rank: i + 1,
      strategy: item.strategy,
      successRate: item.successRate,
      avgScore: item.avgScore,
      n: item.n,
      confidence: Math.min(1, 0.4 + item.n * 0.01),
    }));
  }

  _analyzeConditions(experiments) {
    const passing = experiments.filter((e) => e.verdict === 'PASS');
    const failing = experiments.filter((e) => e.verdict === 'FAIL' || e.verdict === 'REJECTED');
    const insights = [];
    const conditionKeys = new Set(passing.flatMap((e) => Object.keys(e.conditions)));
    for (const key of conditionKeys) {
      const passValues = passing.map((e) => e.conditions[key]).filter((v) => v !== undefined);
      const failValues = failing.map((e) => e.conditions[key]).filter((v) => v !== undefined);
      if (passValues.length > 3) {
        insights.push({
          type: 'CONDITION_OF_SUCCESS',
          condition: key,
          successValues: [...new Set(passValues)].slice(0, 5),
          failureValues: [...new Set(failValues)].slice(0, 5),
          confidence: Math.min(0.9, 0.5 + passing.length * 0.01),
        });
      }
    }
    return insights;
  }

  _analyzeFailures(experiments) {
    const failing = experiments.filter((e) => e.verdict === 'FAIL' || e.verdict === 'REJECTED');
    if (failing.length === 0) return [];
    const failureRate = failing.length / experiments.length;
    return [{
      type: 'FAILURE_PATTERN',
      failureRate,
      totalFailures: failing.length,
      strategies: [...new Set(failing.map((e) => e.strategy))],
      confidence: Math.min(0.9, 0.5 + failing.length * 0.02),
    }];
  }

  _detectOverfitting(experiments) {
    // Overfitting: score médio > 0.85 em condições conhecidas, mas falha em novas
    const known = experiments.slice(0, -Math.floor(experiments.length * 0.2));
    const novel = experiments.slice(-Math.floor(experiments.length * 0.2));
    if (known.length < 5 || novel.length < 2) return null;
    const knownScore = avg(known.map((e) => e.score).filter(Boolean));
    const novelScore = avg(novel.map((e) => e.score).filter(Boolean));
    if (knownScore > 0.85 && novelScore < 0.6) {
      return {
        type: 'OVERFITTING_DETECTED',
        knownConditionsScore: knownScore,
        novelConditionsScore: novelScore,
        gap: knownScore - novelScore,
        confidence: 0.75,
        recommendation: 'Diversificar condições de treinamento e teste',
      };
    }
    return null;
  }

  _detectDeceptiveMetrics(experiments) {
    // Métrica enganadora: score alto mas task_completion baixo
    const highScore = experiments.filter((e) => e.score > 0.8);
    const actuallyCompleted = highScore.filter((e) => e.result?.taskCompleted === true);
    if (highScore.length > 10 && actuallyCompleted.length / highScore.length < 0.5) {
      return {
        type: 'DECEPTIVE_METRIC',
        message: 'Score alto mas task_completion real abaixo de 50%',
        deceptionRate: 1 - actuallyCompleted.length / highScore.length,
        confidence: 0.8,
        recommendation: 'Adicionar TASK_COMPLETION como hard requirement',
      };
    }
    return null;
  }

  _extractPatterns(experiments) {
    const topStrategies = this._analyzeStrategies(experiments).filter((s) => s.successRate > 0.7 && s.n > 5);
    return topStrategies.map((s) => ({
      id: `pat_${crypto.createHash('sha1').update(s.strategy).digest('hex').slice(0, 8)}`,
      strategy: s.strategy,
      successRate: s.successRate,
      experiments: s.n,
      status: s.n > 20 ? 'VALIDATED' : 'CANDIDATE',
    }));
  }

  _generateHypotheses(insights) {
    return insights
      .filter((i) => i.type === 'CONDITION_OF_SUCCESS' || i.type === 'OVERFITTING_DETECTED')
      .map((i) => ({
        statement: i.type === 'CONDITION_OF_SUCCESS'
          ? `Condição "${i.condition}" com valores ${JSON.stringify(i.successValues)} aumenta sucesso`
          : 'Overfitting detectado — diversificar distribuição de experimentos',
        confidence: i.confidence,
        source: i.type,
      }));
  }

  _buildRecommendations(insights) {
    return insights.map((i) => {
      if (i.type === 'STRATEGY_COMPARISON' && i.rank === 1) {
        return `Promover estratégia "${i.strategy}" (${(i.successRate * 100).toFixed(1)}% sucesso, n=${i.n})`;
      }
      if (i.type === 'OVERFITTING_DETECTED') return i.recommendation;
      if (i.type === 'DECEPTIVE_METRIC') return i.recommendation;
      return null;
    }).filter(Boolean);
  }

  _validateExperiment(exp) {
    if (!exp.strategy) throw new Error('ScientistAgent: experimento requer strategy');
    if (exp.verdict === undefined || exp.verdict === null) throw new Error('ScientistAgent: experimento requer verdict real');
    if (exp.verdict === 'PASS' && exp.score === null) throw new Error('Anti-False-Pass: PASS sem score real é inválido');
  }
}

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function now() { return new Date().toISOString(); }

module.exports = { ScientistAgent };
