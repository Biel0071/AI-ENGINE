'use strict';
/**
 * FÊNIX OS — Agent Genome
 * DNA versionado de cada agente. Preserva lineage completa.
 * NUNCA sobrescreve silenciosamente um agente campeão — sempre cria nova versão.
 *
 * Estrutura:
 *   identity, role, skills, model, system_strategy, planner,
 *   memory_strategy, tool_policy, permissions, verification_strategy,
 *   retry_strategy, context_strategy, cost_policy, latency_policy,
 *   safety_policy, benchmark_history, failure_history,
 *   successful_patterns, parent_genomes, generation, lineage
 */

const crypto = require('crypto');

// Estratégias válidas de planner
const PLANNER_STRATEGIES = ['sequential', 'parallel', 'dag', 'reactive', 'hierarchical'];
// Estratégias de memória
const MEMORY_STRATEGIES = ['none', 'session', 'episodic', 'semantic', 'procedural', 'hybrid'];
// Modelos suportados
const SUPPORTED_MODELS = [
  'qwen2.5:0.5b', 'qwen2.5:3b', 'qwen3.5:0.8b', 'deepseek-r1:1.5b',
  'gemini-2.5-pro', 'gemini-2.0-flash', 'claude-sonnet-4-6',
  'gpt-4o', 'local:auto',
];

class AgentGenome {
  /**
   * @param {object} spec — especificação do genoma
   */
  constructor(spec = {}) {
    this.id = spec.id || genomeId();
    this.generation = Number(spec.generation || 0);
    this.lineage = Array.isArray(spec.lineage) ? [...spec.lineage] : [this.id];
    this.parentGenomes = Array.isArray(spec.parentGenomes) ? [...spec.parentGenomes] : [];
    this.createdAt = spec.createdAt || now();
    this.updatedAt = now();

    // ── IDENTIDADE ──────────────────────────────────────────────────────────
    this.identity = {
      name: String(spec.identity?.name || spec.name || 'unnamed-agent'),
      role: String(spec.identity?.role || spec.role || 'generic'),
      description: String(spec.identity?.description || ''),
      version: Number(spec.identity?.version || 1),
    };

    // ── CAPACIDADES ──────────────────────────────────────────────────────────
    this.skills = Array.isArray(spec.skills) ? [...spec.skills] : [];
    this.model = SUPPORTED_MODELS.includes(spec.model) ? spec.model : 'local:auto';
    this.tools = Array.isArray(spec.tools) ? [...spec.tools] : [];

    // ── ESTRATÉGIAS ──────────────────────────────────────────────────────────
    this.systemStrategy = String(spec.systemStrategy || '');
    this.planner = PLANNER_STRATEGIES.includes(spec.planner) ? spec.planner : 'sequential';
    this.memoryStrategy = MEMORY_STRATEGIES.includes(spec.memoryStrategy) ? spec.memoryStrategy : 'session';
    this.verificationStrategy = String(spec.verificationStrategy || 'self-check');
    this.retryStrategy = {
      maxAttempts: Number(spec.retryStrategy?.maxAttempts || 3),
      backoffMs: Number(spec.retryStrategy?.backoffMs || 1000),
      policy: String(spec.retryStrategy?.policy || 'exponential'),
    };
    this.contextStrategy = String(spec.contextStrategy || 'minimal');

    // ── POLÍTICAS ─────────────────────────────────────────────────────────────
    this.toolPolicy = {
      allowed: Array.isArray(spec.toolPolicy?.allowed) ? [...spec.toolPolicy.allowed] : [],
      denied: Array.isArray(spec.toolPolicy?.denied) ? [...spec.toolPolicy.denied] : [],
      requireApproval: Boolean(spec.toolPolicy?.requireApproval),
    };
    this.permissions = {
      read: Array.isArray(spec.permissions?.read) ? [...spec.permissions.read] : [],
      write: Array.isArray(spec.permissions?.write) ? [...spec.permissions.write] : [],
      execute: Array.isArray(spec.permissions?.execute) ? [...spec.permissions.execute] : [],
    };
    this.costPolicy = {
      maxTokensPerTask: Number(spec.costPolicy?.maxTokensPerTask || 8192),
      maxCostUsdPerTask: Number(spec.costPolicy?.maxCostUsdPerTask || 0.10),
      budgetWarningThreshold: Number(spec.costPolicy?.budgetWarningThreshold || 0.8),
    };
    this.latencyPolicy = {
      maxDurationMs: Number(spec.latencyPolicy?.maxDurationMs || 120_000),
      targetDurationMs: Number(spec.latencyPolicy?.targetDurationMs || 30_000),
    };
    this.safetyPolicy = {
      level: String(spec.safetyPolicy?.level || 'standard'),
      blockSecretLeaks: Boolean(spec.safetyPolicy?.blockSecretLeaks !== false),
      blockProductionWrites: Boolean(spec.safetyPolicy?.blockProductionWrites),
    };

    // ── HISTÓRICO ─────────────────────────────────────────────────────────────
    this.benchmarkHistory = Array.isArray(spec.benchmarkHistory) ? [...spec.benchmarkHistory] : [];
    this.failureHistory = Array.isArray(spec.failureHistory) ? [...spec.failureHistory] : [];
    this.successfulPatterns = Array.isArray(spec.successfulPatterns) ? [...spec.successfulPatterns] : [];

    // ── HASH DO GENOMA (fingerprint para deduplicação) ────────────────────────
    this.hash = this._computeHash();
  }

  // ─── MÉTODOS DE EVOLUÇÃO ────────────────────────────────────────────────────

  /**
   * Registra resultado de benchmark.
   * Não afirma melhoria sem antes/depois comparável.
   */
  recordBenchmark(result) {
    this.benchmarkHistory.push({
      ...result,
      timestamp: now(),
      genomeHash: this.hash,
    });
    this.updatedAt = now();
  }

  recordFailure(failure) {
    this.failureHistory.push({ ...failure, timestamp: now() });
    this.updatedAt = now();
  }

  recordSuccessPattern(pattern) {
    this.successfulPatterns.push({ ...pattern, timestamp: now() });
    this.updatedAt = now();
  }

  /** Fitness agregada baseada em histórico real — nunca fabricada */
  computeFitness(domain = null) {
    const relevant = domain
      ? this.benchmarkHistory.filter((b) => b.domain === domain)
      : this.benchmarkHistory;
    if (relevant.length === 0) return null; // UNAVAILABLE — sem dados reais
    const scores = relevant.map((b) => b.score).filter((s) => typeof s === 'number');
    if (scores.length === 0) return null;
    return {
      mean: scores.reduce((a, b) => a + b, 0) / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
      n: scores.length,
      domain,
      source: 'benchmark_history',
    };
  }

  /** Serializa para armazenamento */
  toJSON() {
    return {
      id: this.id,
      generation: this.generation,
      lineage: this.lineage,
      parentGenomes: this.parentGenomes,
      identity: this.identity,
      skills: this.skills,
      model: this.model,
      tools: this.tools,
      systemStrategy: this.systemStrategy,
      planner: this.planner,
      memoryStrategy: this.memoryStrategy,
      verificationStrategy: this.verificationStrategy,
      retryStrategy: this.retryStrategy,
      contextStrategy: this.contextStrategy,
      toolPolicy: this.toolPolicy,
      permissions: this.permissions,
      costPolicy: this.costPolicy,
      latencyPolicy: this.latencyPolicy,
      safetyPolicy: this.safetyPolicy,
      benchmarkHistory: this.benchmarkHistory,
      failureHistory: this.failureHistory,
      successfulPatterns: this.successfulPatterns,
      hash: this.hash,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  _computeHash() {
    const relevant = JSON.stringify({
      role: this.identity.role,
      model: this.model,
      planner: this.planner,
      memoryStrategy: this.memoryStrategy,
      verificationStrategy: this.verificationStrategy,
      skills: this.skills.sort(),
      tools: this.tools.sort(),
    });
    return crypto.createHash('sha256').update(relevant).digest('hex').slice(0, 16);
  }
}

// ─── AGENT GENOME REGISTRY ────────────────────────────────────────────────────

class AgentGenomeRegistry {
  constructor() {
    /** @type {Map<string, AgentGenome[]>} — id → array de versões (lineage preservado) */
    this._genomes = new Map();
    /** @type {Map<string, string>} — id → id do genoma campeão atual */
    this._champions = new Map();
  }

  /**
   * Registra um genoma. Nunca sobrescreve — sempre adiciona versão.
   */
  register(genome) {
    if (!(genome instanceof AgentGenome)) throw new Error('register: esperado AgentGenome');
    const id = genome.id;
    if (!this._genomes.has(id)) this._genomes.set(id, []);
    this._genomes.get(id).push(genome);
    return genome;
  }

  /**
   * Promove um genoma como campeão atual para seu role.
   * Preserva todas as versões anteriores (nunca deleta).
   */
  promote(genomeId, reason = '') {
    const versions = this._genomes.get(genomeId);
    if (!versions || versions.length === 0) throw new Error(`promote: genoma ${genomeId} não encontrado`);
    const champion = versions[versions.length - 1];
    this._champions.set(champion.identity.role, genomeId);
    champion.recordBenchmark({ event: 'PROMOTED', reason, timestamp: now() });
    return champion;
  }

  /** Retorna campeão atual para um role */
  getChampion(role) {
    const champId = this._champions.get(role);
    if (!champId) return null;
    const versions = this._genomes.get(champId);
    return versions ? versions[versions.length - 1] : null;
  }

  /** Retorna todas as versões de um genoma (lineage completa) */
  getLineage(genomeId) {
    return this._genomes.get(genomeId) || [];
  }

  /** Lista todos os genomas registrados (última versão de cada) */
  listAll() {
    const result = [];
    for (const [, versions] of this._genomes) {
      if (versions.length > 0) result.push(versions[versions.length - 1]);
    }
    return result;
  }

  /** Rollback: retorna para versão anterior */
  rollback(genomeId) {
    const versions = this._genomes.get(genomeId);
    if (!versions || versions.length < 2) throw new Error(`rollback: sem versão anterior para ${genomeId}`);
    versions.pop(); // remove última versão
    return versions[versions.length - 1];
  }
}

// ─── MUTAÇÃO ──────────────────────────────────────────────────────────────────

/**
 * Gera um genoma mutado a partir de um pai.
 * Muta apenas um campo por vez (mutação pontual).
 */
function mutate(parent, mutationSpec = {}) {
  const spec = parent.toJSON();
  spec.id = genomeId();
  spec.generation = parent.generation + 1;
  spec.parentGenomes = [parent.id];
  spec.lineage = [...parent.lineage, spec.id];
  spec.createdAt = now();

  // Aplica mutações especificadas
  for (const [field, value] of Object.entries(mutationSpec)) {
    if (field === 'model') spec.model = value;
    else if (field === 'planner') spec.planner = value;
    else if (field === 'memoryStrategy') spec.memoryStrategy = value;
    else if (field === 'verificationStrategy') spec.verificationStrategy = value;
    else if (field === 'skills') spec.skills = Array.isArray(value) ? value : spec.skills;
    else if (field === 'tools') spec.tools = Array.isArray(value) ? value : spec.tools;
    else if (field === 'retryStrategy') spec.retryStrategy = { ...spec.retryStrategy, ...value };
    else if (field === 'costPolicy') spec.costPolicy = { ...spec.costPolicy, ...value };
    else if (field === 'latencyPolicy') spec.latencyPolicy = { ...spec.latencyPolicy, ...value };
  }

  // Reset histórico de benchmark (filho inicia zerado)
  spec.benchmarkHistory = [];
  spec.failureHistory = [];
  spec.successfulPatterns = [];

  return new AgentGenome(spec);
}

/**
 * Crossover entre dois genomas: filho herda planejamento de A e verificação de B.
 */
function crossover(parentA, parentB, strategy = 'planner_verifier') {
  const specA = parentA.toJSON();
  const specB = parentB.toJSON();
  const childSpec = { ...specA };

  childSpec.id = genomeId();
  childSpec.generation = Math.max(parentA.generation, parentB.generation) + 1;
  childSpec.parentGenomes = [parentA.id, parentB.id];
  childSpec.lineage = [...new Set([...parentA.lineage, ...parentB.lineage]), childSpec.id];
  childSpec.benchmarkHistory = [];
  childSpec.failureHistory = [];
  childSpec.successfulPatterns = [];

  if (strategy === 'planner_verifier') {
    // Planner de A, verificação de B
    childSpec.planner = specA.planner;
    childSpec.verificationStrategy = specB.verificationStrategy;
    childSpec.retryStrategy = specB.retryStrategy;
  } else if (strategy === 'model_memory') {
    // Modelo de A, memória de B
    childSpec.model = specA.model;
    childSpec.memoryStrategy = specB.memoryStrategy;
  } else if (strategy === 'skills_tools') {
    // União de skills e tools
    childSpec.skills = [...new Set([...specA.skills, ...specB.skills])];
    childSpec.tools = [...new Set([...specA.tools, ...specB.tools])];
  }

  return new AgentGenome(childSpec);
}

function genomeId() {
  return `genome_${crypto.randomBytes(8).toString('hex')}`;
}

function now() {
  return new Date().toISOString();
}

module.exports = {
  AgentGenome,
  AgentGenomeRegistry,
  mutate,
  crossover,
  PLANNER_STRATEGIES,
  MEMORY_STRATEGIES,
  SUPPORTED_MODELS,
};
