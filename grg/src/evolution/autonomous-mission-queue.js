'use strict';
/**
 * FÊNIX OS — Autonomous Mission Queue
 * =====================================
 * Fila autônoma de missões de evolução com estados granulares,
 * priorização P0-P7 e deduplicação estrita via problemHash.
 *
 * Estados:
 *   DISCOVERED -> QUEUED -> PLANNING -> EXECUTING -> TESTING ->
 *   VERIFYING -> DEPLOYING -> OBSERVING -> LEARNING -> COMPLETED
 *   (Em caso de falha: FAILED -> ROLLED_BACK -> LEARNING)
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

const VALID_STATES = [
  'DISCOVERED',
  'QUEUED',
  'PLANNING',
  'EXECUTING',
  'TESTING',
  'VERIFYING',
  'DEPLOYING',
  'OBSERVING',
  'LEARNING',
  'COMPLETED',
  'FAILED',
  'ROLLED_BACK'
];

const PRIORITY_RANKS = {
  P0: 0, // Runtime quebrado
  P1: 1, // Persistência quebrada
  P2: 2, // Função crítica quebrada
  P3: 3, // Dados inconsistentes
  P4: 4, // UX quebrada
  P5: 5, // Visual baixo
  P6: 6, // Performance
  P7: 7  // Novas capacidades
};

class AutonomousMissionQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.eventBus = options.eventBus || null;
    this.evolutionMemory = options.evolutionMemory || null;
    this.logger = options.logger || console;

    this._missions = new Map(); // id -> mission
    this._problemHashes = new Map(); // hash -> missionId
    this._history = []; // Últimas 100 missões concluídas/falhas
  }

  _computeProblemHash(problemStr) {
    const normalized = String(problemStr || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Adiciona uma missão à fila com priorização e deduplicação.
   * @param {object} params
   * @param {string} params.problem - Descrição do problema
   * @param {string} [params.priority] - 'P0' a 'P7' (default 'P3')
   * @param {string} [params.hypothesis] - Hipótese inicial
   * @param {object} [params.context] - Dados de contexto
   */
  enqueue(params = {}) {
    const problem = params.problem || 'Problema não especificado';
    const problemHash = params.problemHash || this._computeProblemHash(problem);

    // 1. Deduplicação: se já existe missão ativa com esse problemHash, reusar
    const existingId = this._problemHashes.get(problemHash);
    if (existingId) {
      const existing = this._missions.get(existingId);
      if (existing && !['COMPLETED', 'FAILED', 'ROLLED_BACK'].includes(existing.state)) {
        this.logger.info?.(`[AutonomousMissionQueue] Missão duplicada evitada (hash ${problemHash}). Reusando: ${existing.id}`);
        return { mission: existing, deduplicated: true };
      }
    }

    const priority = params.priority && PRIORITY_RANKS[params.priority] !== undefined ? params.priority : 'P3';
    const id = params.id || `evo-mis-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const mission = {
      id,
      problemHash,
      priority,
      rank: PRIORITY_RANKS[priority],
      problem,
      hypothesis: params.hypothesis || '',
      state: 'DISCOVERED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: params.context || {},
      attempts: 0,
      failures: [],
      checkpoints: [],
      metrics: {
        startTime: null,
        durationMs: null
      }
    };

    this._missions.set(id, mission);
    this._problemHashes.set(problemHash, id);

    this.transition(id, 'QUEUED');
    this.logger.info?.(`[AutonomousMissionQueue] Enfileirada missão ${id} [${priority}]: "${problem}"`);
    return { mission, deduplicated: false };
  }

  /**
   * Executa transição de estado.
   */
  transition(missionId, newState, metadata = {}) {
    const mission = this._missions.get(missionId);
    if (!mission) {
      throw new Error(`Missão ${missionId} não encontrada na fila`);
    }

    if (!VALID_STATES.includes(newState)) {
      throw new Error(`Estado inválido: ${newState}. Estados válidos: ${VALID_STATES.join(', ')}`);
    }

    const previousState = mission.state;
    mission.state = newState;
    mission.updatedAt = new Date().toISOString();
    Object.assign(mission, metadata);

    if (newState === 'EXECUTING' && !mission.metrics.startTime) {
      mission.metrics.startTime = Date.now();
    }

    if (['COMPLETED', 'FAILED', 'ROLLED_BACK'].includes(newState)) {
      if (mission.metrics.startTime) {
        mission.metrics.durationMs = Date.now() - mission.metrics.startTime;
      }
      this._history.unshift({ ...mission });
      if (this._history.length > 100) this._history.pop();
    }

    this.emit('state:changed', { missionId, from: previousState, to: newState, mission });
    if (this.eventBus) {
      this.eventBus.emit('evolution.mission.state', { missionId, from: previousState, to: newState, mission });
    }

    return mission;
  }

  /**
   * Registra falha estruturada com Failure Learning.
   */
  async recordFailure(missionId, failureDetails = {}) {
    const mission = this._missions.get(missionId);
    if (!mission) return null;

    const failureRecord = {
      attempt: ++mission.attempts,
      timestamp: new Date().toISOString(),
      failureMode: failureDetails.failureMode || 'EXECUTION_ERROR',
      rootCause: failureDetails.rootCause || failureDetails.message || 'Causa não determinada',
      whatDidntWork: failureDetails.whatDidntWork || '',
      nextHypothesis: failureDetails.nextHypothesis || ''
    };

    mission.failures.push(failureRecord);

    // Registra na memória evolutiva o aprendizado com a falha
    if (this.evolutionMemory) {
      await this.evolutionMemory.record({
        missionId,
        problem: mission.problem,
        hypothesis: mission.hypothesis,
        actions: ['execution-attempt'],
        testsRun: failureDetails.testsRun || [],
        testResults: { status: 'FAILED', error: failureRecord.rootCause },
        lesson: `Tentativa ${failureRecord.attempt} falhou: ${failureRecord.rootCause}. Lição: ${failureRecord.whatDidntWork || 'evitar essa abordagem'}. Próxima hipótese: ${failureRecord.nextHypothesis}`,
        pattern: 'Failure-Learning-Pattern',
        confidence: 0.70,
        rollbackAvailable: Boolean(mission.checkpoints?.length)
      });
    }

    this.transition(missionId, 'FAILED', { lastError: failureRecord.rootCause });
    return failureRecord;
  }

  /**
   * Retorna a próxima missão de maior prioridade para execução.
   */
  getNext() {
    const queued = Array.from(this._missions.values())
      .filter(m => m.state === 'QUEUED')
      .sort((a, b) => a.rank - b.rank || new Date(a.createdAt) - new Date(b.createdAt));

    return queued[0] || null;
  }

  getSnapshot() {
    const missions = Array.from(this._missions.values());
    const counts = {};
    for (const state of VALID_STATES) counts[state] = 0;
    for (const m of missions) counts[m.state] = (counts[m.state] || 0) + 1;

    return {
      total: missions.length,
      counts,
      active: missions.filter(m => !['COMPLETED', 'FAILED', 'ROLLED_BACK'].includes(m.state)),
      recentCompleted: this._history.slice(0, 10)
    };
  }
}

module.exports = { AutonomousMissionQueue, VALID_STATES, PRIORITY_RANKS };
