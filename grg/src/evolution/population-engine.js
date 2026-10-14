'use strict';
/**
 * FÊNIX OS — Population Engine
 * Seleção em múltiplas fases (funil evolutivo).
 * Escala adaptativa aos recursos disponíveis.
 *
 * FASES:
 *   1. Cheap static evaluation
 *   2. Fast benchmark
 *   3. Sandbox execution
 *   4. Realistic benchmark
 *   5. Adversarial testing
 *   6. Production-like simulation
 *
 * Apenas candidatos que passam de fase avançam.
 */

const { AgentGenome, mutate, crossover } = require('./agent-genome');
const { FitnessEngine } = require('./fitness-engine');
const crypto = require('crypto');

const PHASES = Object.freeze([
  { id: 1, name: 'STATIC_EVALUATION',     maxCandidates: 10_000, passFraction: 0.10 },
  { id: 2, name: 'FAST_BENCHMARK',         maxCandidates:  1_000, passFraction: 0.10 },
  { id: 3, name: 'SANDBOX_EXECUTION',      maxCandidates:    100, passFraction: 0.10 },
  { id: 4, name: 'REALISTIC_BENCHMARK',    maxCandidates:     10, passFraction: 0.50 },
  { id: 5, name: 'ADVERSARIAL_TESTING',    maxCandidates:      5, passFraction: 0.40 },
  { id: 6, name: 'PRODUCTION_SIMULATION',  maxCandidates:      2, passFraction: 1.00 },
]);

class PopulationEngine {
  /**
   * @param {object} opts
   * @param {FitnessEngine} opts.fitnessEngine
   * @param {object} opts.resourceBudget — { maxConcurrent, maxTokens, maxCostUsd }
   */
  constructor(opts = {}) {
    this.fitnessEngine = opts.fitnessEngine || new FitnessEngine();
    this.resourceBudget = {
      maxConcurrent: opts.resourceBudget?.maxConcurrent || 10,
      maxTokens: opts.resourceBudget?.maxTokens || 100_000,
      maxCostUsd: opts.resourceBudget?.maxCostUsd || 5.0,
    };
    /** @type {Population[]} */
    this._populations = [];
  }

  // ─── CRIAÇÃO DE POPULAÇÃO ─────────────────────────────────────────────────

  /**
   * Cria população inicial a partir de um genoma semente.
   * Usa mutação para gerar diversidade.
   */
  createPopulation(seedGenome, size = 100, mutationSpecs = []) {
    if (!(seedGenome instanceof AgentGenome)) throw new Error('createPopulation: seedGenome deve ser AgentGenome');
    const candidates = [seedGenome];

    // Gerar variantes por mutação
    const mutations = mutationSpecs.length > 0 ? mutationSpecs : defaultMutationSpecs();
    let i = 1;
    while (candidates.length < size) {
      const spec = mutations[i % mutations.length];
      candidates.push(mutate(seedGenome, spec));
      i++;
    }

    const pop = {
      id: `pop_${crypto.randomBytes(6).toString('hex')}`,
      seedGenomeId: seedGenome.id,
      domain: null,
      phase: 1,
      candidates: candidates.map((g) => ({ genome: g, fitnessRecords: [], status: 'PENDING', phase: 1 })),
      elites: [],
      generation: seedGenome.generation,
      createdAt: now(),
      completedAt: null,
      stats: { totalEvaluated: 0, totalRejected: 0, totalPromoted: 0 },
    };
    this._populations.push(pop);
    return pop;
  }

  /**
   * Cria população por crossover de dois genomas campeões.
   */
  createCrossoverPopulation(parentA, parentB, size = 50) {
    const candidates = [];
    const strategies = ['planner_verifier', 'model_memory', 'skills_tools'];
    for (let i = 0; i < size; i++) {
      candidates.push(crossover(parentA, parentB, strategies[i % strategies.length]));
    }
    const pop = {
      id: `pop_xo_${crypto.randomBytes(6).toString('hex')}`,
      seedGenomeId: `${parentA.id}+${parentB.id}`,
      domain: null,
      phase: 1,
      candidates: candidates.map((g) => ({ genome: g, fitnessRecords: [], status: 'PENDING', phase: 1 })),
      elites: [],
      generation: Math.max(parentA.generation, parentB.generation) + 1,
      createdAt: now(),
      completedAt: null,
      stats: { totalEvaluated: 0, totalRejected: 0, totalPromoted: 0 },
    };
    this._populations.push(pop);
    return pop;
  }

  // ─── EXECUÇÃO DO FUNIL ────────────────────────────────────────────────────

  /**
   * Avança uma população pela fase atual.
   * Retorna candidatos sobreviventes e estatísticas.
   *
   * @param {string} popId
   * @param {string} domain — domínio de avaliação
   * @param {Function} evaluator — async (genome, phase) => result object
   */
  async runPhase(popId, domain, evaluator) {
    const pop = this._getPopulation(popId);
    const phaseConfig = PHASES[pop.phase - 1];
    if (!phaseConfig) throw new Error(`PopulationEngine: fase ${pop.phase} inválida`);

    const pending = pop.candidates
      .filter((c) => c.status === 'PENDING' && c.phase === pop.phase)
      .slice(0, phaseConfig.maxCandidates);

    if (pending.length === 0) {
      return { phase: pop.phase, survivors: [], reason: 'NO_PENDING_CANDIDATES' };
    }

    // Avaliação com controle de concorrência
    const results = await this._evaluateBatch(pending, domain, evaluator);

    // Aplicar seleção: manter apenas os top passFraction
    const sorted = results
      .filter((r) => r.verdict !== 'REJECTED' && r.verdict !== 'UNAVAILABLE' && r.verdict !== 'ERROR')
      .sort((a, b) => (b.scoreData?.score || 0) - (a.scoreData?.score || 0));
    const keepCount = Math.max(1, Math.floor(sorted.length * phaseConfig.passFraction));
    const survivors = sorted.slice(0, keepCount);
    const eliminated = sorted.slice(keepCount);
    const hardRejected = results.filter((r) => r.verdict === 'REJECTED');

    // Atualizar status dos candidatos
    for (const r of survivors) {
      const c = pop.candidates.find((c) => c.genome.id === r.genomeId);
      if (c) { c.status = 'ADVANCED'; c.phase = pop.phase + 1; c.fitnessRecords.push(r.record); }
    }
    for (const r of [...eliminated, ...hardRejected]) {
      const c = pop.candidates.find((c) => c.genome.id === r.genomeId);
      if (c) { c.status = 'ELIMINATED'; c.fitnessRecords.push(r.record); }
    }

    pop.stats.totalEvaluated += results.length;
    pop.stats.totalRejected += eliminated.length + hardRejected.length;
    pop.stats.totalPromoted += survivors.length;

    if (pop.phase < PHASES.length) {
      pop.phase++;
      // Re-mark survivors como PENDING para próxima fase
      for (const r of survivors) {
        const c = pop.candidates.find((c) => c.genome.id === r.genomeId);
        if (c) c.status = 'PENDING';
      }
    } else {
      // Fase final — promover elites
      pop.elites = survivors.map((r) => pop.candidates.find((c) => c.genome.id === r.genomeId)).filter(Boolean);
      pop.completedAt = now();
    }

    return {
      phase: phaseConfig.id,
      phaseName: phaseConfig.name,
      evaluated: results.length,
      survivors: survivors.length,
      eliminated: eliminated.length,
      hardRejected: hardRejected.length,
      elites: pop.elites.length,
    };
  }

  /**
   * Executa todas as fases sequencialmente.
   */
  async runFullFunnel(popId, domain, evaluator) {
    const pop = this._getPopulation(popId);
    pop.domain = domain;
    const phaseResults = [];
    for (let phase = 1; phase <= PHASES.length; phase++) {
      const result = await this.runPhase(popId, domain, evaluator);
      phaseResults.push(result);
      if (result.survivors === 0) break; // Extinção total
    }
    return { populationId: popId, phaseResults, elites: pop.elites };
  }

  // ─── ELITES ───────────────────────────────────────────────────────────────

  getElites(popId) {
    const pop = this._getPopulation(popId);
    return pop.elites.map((c) => ({ genome: c.genome, fitnessRecords: c.fitnessRecords }));
  }

  getPopulationStats(popId) {
    const pop = this._getPopulation(popId);
    return {
      id: pop.id,
      phase: pop.phase,
      domain: pop.domain,
      generation: pop.generation,
      total: pop.candidates.length,
      pending: pop.candidates.filter((c) => c.status === 'PENDING').length,
      advanced: pop.candidates.filter((c) => c.status === 'ADVANCED').length,
      eliminated: pop.candidates.filter((c) => c.status === 'ELIMINATED').length,
      elites: pop.elites.length,
      stats: pop.stats,
      completedAt: pop.completedAt,
    };
  }

  // ─── CONVERGÊNCIA ─────────────────────────────────────────────────────────

  /**
   * Detecta se a população convergiu (melhoria marginal insignificante).
   */
  hasConverged(popId, threshold = 0.01) {
    const pop = this._getPopulation(popId);
    if (pop.elites.length < 2) return false;
    const scores = pop.elites.map((c) => {
      const latest = c.fitnessRecords[c.fitnessRecords.length - 1];
      return latest?.scoreData?.score ?? 0;
    });
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    return (maxScore - minScore) < threshold;
  }

  // ─── INTERNOS ─────────────────────────────────────────────────────────────

  async _evaluateBatch(candidates, domain, evaluator) {
    const results = [];
    // Respeitar limite de concorrência
    const chunks = chunkArray(candidates, this.resourceBudget.maxConcurrent);
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (candidate) => {
          try {
            const result = await evaluator(candidate.genome, candidate.phase);
            const record = this.fitnessEngine.evaluate(domain, result, {
              agentId: candidate.genome.id,
              agentLineage: candidate.genome.lineage,
              conditions: { phase: candidate.phase },
            });
            return { genomeId: candidate.genome.id, verdict: record.verdict, scoreData: record.scoreData, record };
          } catch (err) {
            return {
              genomeId: candidate.genome.id,
              verdict: 'ERROR',
              scoreData: null,
              record: { id: `err_${Date.now()}`, verdict: 'ERROR', error: err.message },
            };
          }
        }),
      );
      results.push(...chunkResults);
    }
    return results;
  }

  _getPopulation(popId) {
    const pop = this._populations.find((p) => p.id === popId);
    if (!pop) throw new Error(`PopulationEngine: população ${popId} não encontrada`);
    return pop;
  }
}

function defaultMutationSpecs() {
  return [
    { model: 'qwen2.5:3b' },
    { model: 'deepseek-r1:1.5b' },
    { planner: 'parallel' },
    { planner: 'dag' },
    { memoryStrategy: 'episodic' },
    { memoryStrategy: 'semantic' },
    { verificationStrategy: 'multi-agent' },
    { verificationStrategy: 'adversarial' },
    { retryStrategy: { maxAttempts: 5, backoffMs: 2000 } },
    { contextStrategy: 'full' },
  ];
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function now() {
  return new Date().toISOString();
}

module.exports = { PopulationEngine, PHASES };
