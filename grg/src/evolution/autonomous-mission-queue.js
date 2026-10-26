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

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const VALID_STATES = [
  'DISCOVERED',
  'QUEUED',
  'PLANNING',
  'EXECUTING',
  'TESTING',
  'VERIFYING',
  'AWAITING_APPROVAL',
  'DEPLOYING',
  'OBSERVING',
  'LEARNING',
  'PAUSED',
  'BLOCKED',
  'RETRY_SCHEDULED',
  'CANCELLED',
  'COMPLETED',
  'FAILED',
  'ROLLED_BACK'
];

const TERMINAL_STATES = ['COMPLETED', 'FAILED', 'ROLLED_BACK', 'CANCELLED'];
const TRANSIENT_EXECUTION_STATES = ['PLANNING', 'EXECUTING', 'TESTING', 'VERIFYING', 'DEPLOYING'];

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
    this.persistEnabled = options.persist !== false;
    this.persistPath = options.persistPath || path.resolve(__dirname, '../../../memory/AUTONOMOUS_EVOLUTION_QUEUE.json');

    this._missions = new Map(); // id -> mission
    this._problemHashes = new Map(); // hash -> missionId
    this._history = []; // Últimas 100 missões concluídas/falhas
    this._coldRestartRecoveredIds = [];

    if (this.persistEnabled) {
      this._loadFromDisk();
    }
  }

  _loadFromDisk() {
    try {
      if (!fs.existsSync(this.persistPath)) return;
      const raw = JSON.parse(fs.readFileSync(this.persistPath, 'utf8'));
      const savedMissions = Array.isArray(raw?.missions) ? raw.missions : [];
      const nowMs = Date.now();
      for (const m of savedMissions) {
        if (!m || !m.id) continue;
        // Cold-restart recovery: se uma missão estava em execução transitória quando o processo reiniciou,
        // limpa o lease expirado e recoloca em QUEUED sem duplicar a missão.
        if (TRANSIENT_EXECUTION_STATES.includes(m.state)) {
          m.previousInterruptedState = m.state;
          m.state = 'QUEUED';
          m.recoveredFromColdRestart = Boolean(m.id);
          m.coldRestartRecoveries = Number(m.coldRestartRecoveries || 0) + 1;
          m.leaseOwner = null;
          m.leaseExpiresAt = null;
          m.updatedAt = new Date(nowMs).toISOString();
          this._coldRestartRecoveredIds.push(m.id);
        } else if (m.leaseExpiresAt && m.leaseExpiresAt <= nowMs) {
          m.leaseOwner = null;
          m.leaseExpiresAt = null;
        }
        this._missions.set(m.id, m);
        if (m.problemHash && !TERMINAL_STATES.includes(m.state)) {
          this._problemHashes.set(m.problemHash, m.id);
        }
      }
      if (Array.isArray(raw?.history)) {
        this._history = raw.history.slice(0, 100);
      }
      if (this._coldRestartRecoveredIds.length > 0) {
        this._saveToDisk();
      }
    } catch (err) {
      this.logger.warn?.(`[AutonomousMissionQueue] Falha ao carregar fila persistida: ${err.message}`);
    }
  }

  _saveToDisk() {
    if (!this.persistEnabled) return;
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const payload = {
        updatedAt: new Date().toISOString(),
        missions: Array.from(this._missions.values()),
        history: this._history.slice(0, 100)
      };
      fs.writeFileSync(this.persistPath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      this.logger.warn?.(`[AutonomousMissionQueue] Falha ao salvar fila em disco: ${err.message}`);
    }
  }

  _computeProblemHash(problemStr, projectId = '') {
    const normalized = `${String(projectId || 'fenix-os')}:${String(problemStr || '')}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Adiciona uma missão à fila com priorização, contrato compartilhado e deduplicação.
   */
  enqueue(params = {}) {
    const problem = params.problem || params.objective || 'Problema não especificado';
    const projectId = params.projectId || params.context?.projectId || 'fenix-os';
    const problemHash = params.problemHash || this._computeProblemHash(problem, projectId);

    // 1. Deduplicação: se já existe missão ativa com esse problemHash, reusar
    const existingId = this._problemHashes.get(problemHash);
    if (existingId) {
      const existing = this._missions.get(existingId);
      if (existing && !TERMINAL_STATES.includes(existing.state)) {
        this.logger.info?.(`[AutonomousMissionQueue] Missão duplicada evitada (hash ${problemHash}). Reusando: ${existing.id}`);
        return { mission: existing, deduplicated: Boolean(existing.id) };
      }
    }

    const priority = params.priority && PRIORITY_RANKS[params.priority] !== undefined ? params.priority : 'P3';
    const id = params.id || params.missionId || `evo-mis-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const defaultMaxRetries = Number(params.maxRetries ?? 3);

    const mission = {
      id,
      missionId: id,
      projectId,
      bugId: params.bugId || params.context?.bugId || null,
      problemHash,
      priority,
      rank: PRIORITY_RANKS[priority],
      problem,
      objective: params.objective || problem,
      hypothesis: params.hypothesis || '',
      state: 'DISCOVERED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastProgressAt: new Date().toISOString(),
      context: params.context || {},
      acceptanceCriteria: Array.isArray(params.acceptanceCriteria) ? params.acceptanceCriteria : ['Executar validação automatizada sem regressões'],
      targetFiles: Array.isArray(params.targetFiles) ? params.targetFiles : [],
      dependencies: Array.isArray(params.dependencies) ? params.dependencies : [],
      authorizedTools: Array.isArray(params.authorizedTools) ? params.authorizedTools : ['node-test-runner', 'git-workspace', 'ollama-local'],
      assignedRoles: Array.isArray(params.assignedRoles) ? params.assignedRoles : ['Bug Hunter', 'Architect', 'Code Agent', 'QA Agent', 'Release Agent'],
      budget: params.budget || { maxTokens: 16000, maxCostUsd: 0.50, maxDurationMs: 120000 },
      deadline: params.deadline || null,
      approvalsRequired: Boolean(params.approvalsRequired),
      approvalState: params.approvalsRequired ? 'PENDING' : 'NOT_REQUIRED',
      diffReview: null,
      artifacts: Array.isArray(params.artifacts) ? params.artifacts : [],
      logs: Array.isArray(params.logs) ? params.logs : [],
      testResults: params.testResults || null,
      leaseOwner: null,
      leaseExpiresAt: null,
      attempts: 0,
      maxRetries: defaultMaxRetries,
      nextRetryAtMs: null,
      failures: [],
      checkpoints: [],
      metrics: {
        startTime: null,
        durationMs: null,
        tokensUsed: 0,
        costUsd: 0
      }
    };

    this._missions.set(id, mission);
    this._problemHashes.set(problemHash, id);

    this.transition(id, 'QUEUED');
    this.logger.info?.(`[AutonomousMissionQueue] Enfileirada missão ${id} [${priority}] (${projectId}): "${problem}"`);
    return { mission, deduplicated: false };
  }

  _normalizeTargetFiles(files) {
    if (!Array.isArray(files)) return [];
    return files
      .map((f) => String(f || '').replace(/\\/g, '/').trim().toLowerCase())
      .filter(Boolean);
  }

  /**
   * Adquire lock/lease exclusivo (por missão e por targetFiles) para evitar execução duplicada
   * ou edição simultânea do mesmo arquivo entre workers concorrentes.
   */
  acquireLease(missionId, workerId = 'worker-primary', ttlMs = 60000) {
    const mission = this._missions.get(missionId);
    if (!mission) return { acquired: false, reason: 'MISSION_NOT_FOUND' };
    const nowMs = Date.now();
    if (mission.leaseOwner && mission.leaseOwner !== workerId && mission.leaseExpiresAt && mission.leaseExpiresAt > nowMs) {
      return {
        acquired: false,
        reason: 'LEASE_HELD_BY_OTHER_WORKER',
        holder: mission.leaseOwner,
        expiresAt: mission.leaseExpiresAt
      };
    }

    const reqFiles = this._normalizeTargetFiles(mission.targetFiles);
    if (reqFiles.length > 0) {
      for (const other of this._missions.values()) {
        if (!other || other.id === mission.id) continue;
        if (TERMINAL_STATES.includes(other.state)) continue;
        const otherLeaseActive = Boolean(other.leaseOwner && other.leaseExpiresAt && other.leaseExpiresAt > nowMs);
        if (!otherLeaseActive || other.leaseOwner === workerId) continue;
        const otherFiles = this._normalizeTargetFiles(other.targetFiles);
        const conflictingFiles = reqFiles.filter((f) => otherFiles.includes(f));
        if (conflictingFiles.length > 0) {
          return {
            acquired: false,
            reason: 'FILE_LOCK_CONFLICT',
            holder: other.leaseOwner,
            conflictingMissionId: other.id,
            conflictingFiles,
            expiresAt: other.leaseExpiresAt
          };
        }
      }
    }

    mission.leaseOwner = workerId;
    mission.leaseExpiresAt = nowMs + Math.max(1000, Number(ttlMs) || 60000);
    mission.lastProgressAt = new Date(nowMs).toISOString();
    this._saveToDisk();
    return {
      acquired: Boolean(mission.leaseOwner === workerId),
      leaseOwner: mission.leaseOwner,
      leaseExpiresAt: mission.leaseExpiresAt,
      lockedFiles: reqFiles
    };
  }

  renewLease(missionId, workerId = 'worker-primary', ttlMs = 60000) {
    const mission = this._missions.get(missionId);
    if (!mission) return false;
    if (mission.leaseOwner && mission.leaseOwner !== workerId) return false;
    const nowMs = Date.now();
    mission.leaseOwner = workerId;
    mission.leaseExpiresAt = nowMs + Math.max(1000, Number(ttlMs) || 60000);
    mission.lastProgressAt = new Date(nowMs).toISOString();
    this._saveToDisk();
    return Boolean(mission.leaseExpiresAt > nowMs);
  }

  releaseLease(missionId, workerId = null) {
    const mission = this._missions.get(missionId);
    if (!mission) return false;
    if (workerId && mission.leaseOwner && mission.leaseOwner !== workerId) return false;
    mission.leaseOwner = null;
    mission.leaseExpiresAt = null;
    this._saveToDisk();
    return true;
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
    const nowIso = new Date().toISOString();
    mission.state = newState;
    mission.updatedAt = nowIso;
    mission.lastProgressAt = nowIso;
    Object.assign(mission, metadata);

    mission.logs = Array.isArray(mission.logs) ? mission.logs : [];
    mission.logs.push({
      at: nowIso,
      from: previousState,
      to: newState,
      note: metadata.note || metadata.lastError || null
    });
    if (mission.logs.length > 80) mission.logs = mission.logs.slice(-80);

    if (newState === 'EXECUTING' && !mission.metrics.startTime) {
      mission.metrics.startTime = Date.now();
    }

    if (TERMINAL_STATES.includes(newState)) {
      mission.leaseOwner = null;
      mission.leaseExpiresAt = null;
      if (mission.metrics.startTime) {
        mission.metrics.durationMs = Date.now() - mission.metrics.startTime;
      }
      this._history.unshift({ ...mission });
      if (this._history.length > 100) this._history.pop();
    }

    this._saveToDisk();

    this.emit('state:changed', { missionId, from: previousState, to: newState, mission });
    if (this.eventBus) {
      this.eventBus.emit('evolution.mission.state', { missionId, from: previousState, to: newState, mission });
    }

    return mission;
  }

  /**
   * Agenda retry com backoff exponencial ou bloqueia se exceder maxRetries.
   */
  scheduleRetry(missionId, reason = 'Transient failure', baseDelayMs = 1000) {
    const mission = this._missions.get(missionId);
    if (!mission) return null;
    mission.attempts = Number(mission.attempts || 0) + 1;
    const maxRetries = Number(mission.maxRetries ?? 3);
    mission.leaseOwner = null;
    mission.leaseExpiresAt = null;

    if (mission.attempts > maxRetries) {
      return this.transition(missionId, 'BLOCKED', {
        blockedReason: `Excedeu limite de tentativas (${maxRetries}): ${reason}`,
        lastError: reason
      });
    }

    const delayMs = Math.min(60000, Math.max(50, Number(baseDelayMs) || 1000) * Math.pow(2, Math.max(0, mission.attempts - 1)));
    const nextRetryAtMs = Date.now() + delayMs;
    return this.transition(missionId, 'RETRY_SCHEDULED', {
      nextRetryAtMs,
      retryDelayMs: delayMs,
      lastError: reason
    });
  }

  /**
   * Reconcilia missões com retry agendado vencido ou travadas (stalled / lease expirado).
   */
  reconcileStalledAndRetries(nowMs = Date.now(), stallTimeoutMs = 120000) {
    const recovered = [];
    const stalled = [];
    for (const mission of this._missions.values()) {
      if (mission.state === 'RETRY_SCHEDULED' && mission.nextRetryAtMs && mission.nextRetryAtMs <= nowMs) {
        mission.nextRetryAtMs = null;
        this.transition(mission.id, 'QUEUED', { note: 'Retry backoff concluído; re-enfileirada' });
        recovered.push(mission.id);
        continue;
      }
      if (TRANSIENT_EXECUTION_STATES.includes(mission.state)) {
        const lastUpdatedMs = new Date(mission.lastProgressAt || mission.updatedAt || mission.createdAt).getTime();
        const leaseExpired = Boolean(mission.leaseExpiresAt && mission.leaseExpiresAt <= nowMs);
        const progressStalled = Boolean(Number.isFinite(lastUpdatedMs) && (nowMs - lastUpdatedMs) > stallTimeoutMs);
        if (leaseExpired || progressStalled) {
          stalled.push(mission.id);
          this.scheduleRetry(
            mission.id,
            leaseExpired ? 'Lease de execução expirou' : 'Missão sem progresso (stalled timeout)',
            500
          );
        }
      }
    }
    return { recovered, stalled };
  }

  /**
   * Controles operacionais de missão (Pause, Resume, Cancel, Prioritize, Approve, Reject).
   */
  pauseMission(missionId, reason = 'Pausada pelo operador') {
    const mission = this._missions.get(missionId);
    if (!mission) return null;
    mission.leaseOwner = null;
    mission.leaseExpiresAt = null;
    return this.transition(missionId, 'PAUSED', { pausedReason: reason });
  }

  resumeMission(missionId) {
    const mission = this._missions.get(missionId);
    if (!mission) return null;
    if (!['PAUSED', 'BLOCKED', 'RETRY_SCHEDULED'].includes(mission.state)) return mission;
    mission.nextRetryAtMs = null;
    return this.transition(missionId, 'QUEUED', { pausedReason: null, blockedReason: null });
  }

  cancelMission(missionId, reason = 'Cancelada pelo operador') {
    const mission = this._missions.get(missionId);
    if (!mission) return null;
    return this.transition(missionId, 'CANCELLED', { cancelledReason: reason });
  }

  prioritizeMission(missionId, newPriority = 'P0') {
    const mission = this._missions.get(missionId);
    if (!mission) return null;
    const validPrio = PRIORITY_RANKS[newPriority] !== undefined ? newPriority : 'P0';
    mission.priority = validPrio;
    mission.rank = PRIORITY_RANKS[validPrio];
    mission.updatedAt = new Date().toISOString();
    this._saveToDisk();
    return mission;
  }

  submitForApproval(missionId, diffReview = {}) {
    const mission = this._missions.get(missionId);
    if (!mission) return null;
    return this.transition(missionId, 'AWAITING_APPROVAL', {
      approvalState: 'PENDING',
      diffReview: {
        submittedAt: new Date().toISOString(),
        ...diffReview
      }
    });
  }

  approveMission(missionId, reviewerId = 'operator', notes = '') {
    const mission = this._missions.get(missionId);
    if (!mission) return null;
    const nextState = mission.state === 'AWAITING_APPROVAL' ? 'COMPLETED' : mission.state;
    return this.transition(missionId, nextState, {
      approvalState: 'APPROVED',
      approvedBy: reviewerId,
      approvedAt: new Date().toISOString(),
      approvalNotes: notes
    });
  }

  rejectMission(missionId, reviewerId = 'operator', reason = 'Diff rejeitado na revisão') {
    const mission = this._missions.get(missionId);
    if (!mission) return null;
    return this.transition(missionId, 'ROLLED_BACK', {
      approvalState: 'REJECTED',
      rejectedBy: reviewerId,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason
    });
  }

  getMission(missionId) {
    return this._missions.get(missionId) || null;
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
   * Retorna a próxima missão elegível de maior prioridade para execução,
   * ignorando missões cujos targetFiles estejam bloqueados por outro worker ativo.
   */
  getNext(options = {}) {
    const nowMs = Date.now();
    this.reconcileStalledAndRetries(nowMs);
    const lockedFiles = new Set();
    for (const m of this._missions.values()) {
      if (TERMINAL_STATES.includes(m.state)) continue;
      if (m.leaseOwner && m.leaseExpiresAt && m.leaseExpiresAt > nowMs && m.leaseOwner !== options.workerId) {
        for (const f of this._normalizeTargetFiles(m.targetFiles)) {
          lockedFiles.add(f);
        }
      }
    }

    const queued = Array.from(this._missions.values())
      .filter(m => {
        if (m.state !== 'QUEUED') return false;
        if (m.leaseOwner && m.leaseExpiresAt && m.leaseExpiresAt > nowMs && m.leaseOwner !== options.workerId) {
          return false;
        }
        if (options.projectId && m.projectId !== options.projectId) return false;
        if (lockedFiles.size > 0) {
          const files = this._normalizeTargetFiles(m.targetFiles);
          if (files.some((f) => lockedFiles.has(f))) return false;
        }
        return true;
      })
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
      active: missions.filter(m => !TERMINAL_STATES.includes(m.state)),
      blocked: missions.filter(m => m.state === 'BLOCKED' || m.state === 'AWAITING_APPROVAL'),
      paused: missions.filter(m => m.state === 'PAUSED'),
      coldRestartRecoveredIds: this._coldRestartRecoveredIds,
      recentCompleted: this._history.slice(0, 10),
      missions
    };
  }
}

module.exports = { AutonomousMissionQueue, VALID_STATES, TERMINAL_STATES, PRIORITY_RANKS };
