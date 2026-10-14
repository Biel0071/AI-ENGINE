'use strict';
/**
 * FÊNIX OS — Evolution Session
 * =============================
 * Entidade de sessão persistente para execução de propostas de evolução.
 *
 * Estados de Ciclo de Vida:
 *   INITIALIZING -> SNAPSHOT_CREATED -> OBSERVING -> GENERATING_PATCH ->
 *   APPLYING_PATCH -> TESTING -> VALIDATING -> PROMOTING -> COMMITTING -> COMPLETED
 *
 * Em caso de falha:
 *   ... -> FAILED -> ROLLING_BACK -> ROLLED_BACK
 *
 * Controle Operacional:
 *   PAUSED (pode ser resumida via resume())
 *   ABORTED (interrupção forçada com rollback imediato)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const VALID_SESSION_STATES = [
  'INITIALIZING',
  'SNAPSHOT_CREATED',
  'OBSERVING',
  'GENERATING_PATCH',
  'APPLYING_PATCH',
  'TESTING',
  'VALIDATING',
  'PROMOTING',
  'COMMITTING',
  'COMPLETED',
  'FAILED',
  'ROLLING_BACK',
  'ROLLED_BACK',
  'PAUSED',
  'ABORTED'
];

class EvolutionSession extends EventEmitter {
  /**
   * @param {object} params
   * @param {string} [params.sessionId]
   * @param {string} params.proposalId
   * @param {object} [params.proposal]
   * @param {string} [params.sessionsDir]
   * @param {object} [params.storageManager]
   */
  constructor(params = {}) {
    super();
    this.sessionId = params.sessionId || `evo-ses-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    this.proposalId = params.proposalId || 'UNKNOWN_PROPOSAL';
    this.proposal = params.proposal || {};
    this.sessionsDir = params.sessionsDir || path.join(__dirname, '..', '..', 'data', 'sessions');
    this.storageManager = params.storageManager || null;

    this.status = params.status || 'INITIALIZING';
    this.createdAt = params.createdAt || new Date().toISOString();
    this.updatedAt = params.updatedAt || this.createdAt;
    this.completedAt = params.completedAt || null;

    this.snapshotId = params.snapshotId || null;
    this.currentStep = params.currentStep || null;
    this.steps = Array.isArray(params.steps) ? params.steps : [];
    this.artifacts = params.artifacts || {
      filesChanged: [],
      testsRun: [],
      diffSummary: '',
      errors: []
    };
    this.metrics = params.metrics || {
      durationMs: 0,
      tokensUsed: 0,
      costUsd: 0,
      heapUsedMb: 0
    };
    this.evidenceHash = params.evidenceHash || this._initEvidenceHash();
    this.error = params.error || null;
    this.pauseReason = params.pauseReason || null;
  }

  _initEvidenceHash() {
    return crypto.createHash('sha256')
      .update(`SESSION_INIT:${this.sessionId}:${this.proposalId}:${this.createdAt}`)
      .digest('hex');
  }

  _updateEvidence(stepName, status, details = {}) {
    const raw = `${this.evidenceHash}::${stepName}::${status}::${JSON.stringify(details)}`;
    this.evidenceHash = crypto.createHash('sha256').update(raw).digest('hex');
    return this.evidenceHash;
  }

  startStep(stepName, details = {}) {
    if (this.status === 'PAUSED' || this.status === 'ABORTED') {
      throw new Error(`Não é possível iniciar passo '${stepName}' enquanto a sessão está ${this.status}`);
    }

    const now = new Date().toISOString();
    this.currentStep = stepName;
    this.status = stepName; // atualiza estado com o nome do passo
    this.updatedAt = now;

    const stepEntry = {
      stepName,
      status: 'RUNNING',
      startedAt: now,
      completedAt: null,
      details,
      error: null,
      evidenceHash: null
    };

    this.steps.push(stepEntry);
    this.emit('step:started', { sessionId: this.sessionId, step: stepEntry });
    this.save();
    return stepEntry;
  }

  completeStep(stepName, result = {}) {
    const step = this.steps.slice().reverse().find(s => s.stepName === stepName && s.status === 'RUNNING');
    if (!step) {
      throw new Error(`Passo '${stepName}' não encontrado ou já finalizado`);
    }

    const now = new Date().toISOString();
    step.status = 'COMPLETED';
    step.completedAt = now;
    step.result = result;
    step.evidenceHash = this._updateEvidence(stepName, 'COMPLETED', result);

    this.updatedAt = now;
    this.emit('step:completed', { sessionId: this.sessionId, step });
    this.save();
    return step;
  }

  failStep(stepName, error) {
    const step = this.steps.slice().reverse().find(s => s.stepName === stepName && s.status === 'RUNNING');
    const errorMsg = error instanceof Error ? error.message : String(error);
    const now = new Date().toISOString();

    if (step) {
      step.status = 'FAILED';
      step.completedAt = now;
      step.error = errorMsg;
      step.evidenceHash = this._updateEvidence(stepName, 'FAILED', { error: errorMsg });
    }

    this.status = 'FAILED';
    this.error = errorMsg;
    this.updatedAt = now;
    this.artifacts.errors.push({ step: stepName, error: errorMsg, at: now });

    this.emit('step:failed', { sessionId: this.sessionId, stepName, error: errorMsg });
    this.save();
    return step;
  }

  pause(reason = 'Manual pause requested') {
    if (this.status === 'COMPLETED' || this.status === 'ROLLED_BACK' || this.status === 'ABORTED') {
      throw new Error(`Não é possível pausar uma sessão finalizada (${this.status})`);
    }
    this.status = 'PAUSED';
    this.pauseReason = reason;
    this.updatedAt = new Date().toISOString();
    this.emit('session:paused', { sessionId: this.sessionId, reason });
    this.save();
    return this;
  }

  resume() {
    if (this.status !== 'PAUSED') {
      throw new Error(`Sessão não está pausada (estado atual: ${this.status})`);
    }
    this.status = this.currentStep || 'INITIALIZING';
    this.pauseReason = null;
    this.updatedAt = new Date().toISOString();
    this.emit('session:resumed', { sessionId: this.sessionId });
    this.save();
    return this;
  }

  abort(reason = 'Session aborted') {
    this.status = 'ABORTED';
    this.error = reason;
    this.completedAt = new Date().toISOString();
    this.updatedAt = this.completedAt;
    this._updateEvidence('ABORT', 'ABORTED', { reason });
    this.emit('session:aborted', { sessionId: this.sessionId, reason });
    this.save();
    return this;
  }

  markRolledBack(details = {}) {
    this.status = 'ROLLED_BACK';
    this.completedAt = new Date().toISOString();
    this.updatedAt = this.completedAt;
    this._updateEvidence('ROLLBACK', 'ROLLED_BACK', details);
    this.emit('session:rolled_back', { sessionId: this.sessionId, details });
    this.save();
    return this;
  }

  markCompleted(result = {}) {
    this.status = 'COMPLETED';
    this.completedAt = new Date().toISOString();
    this.updatedAt = this.completedAt;
    this.metrics.durationMs = new Date(this.completedAt).getTime() - new Date(this.createdAt).getTime();
    this._updateEvidence('COMPLETION', 'COMPLETED', result);
    this.emit('session:completed', { sessionId: this.sessionId, result });
    this.save();
    return this;
  }

  toSnapshot() {
    return {
      sessionId: this.sessionId,
      proposalId: this.proposalId,
      status: this.status,
      snapshotId: this.snapshotId,
      currentStep: this.currentStep,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      steps: this.steps,
      artifacts: this.artifacts,
      metrics: this.metrics,
      evidenceHash: this.evidenceHash,
      error: this.error,
      pauseReason: this.pauseReason
    };
  }

  save() {
    // 1. Salvar no disco local em data/sessions/<sessionId>.json
    try {
      if (!fs.existsSync(this.sessionsDir)) {
        fs.mkdirSync(this.sessionsDir, { recursive: true });
      }
      const filePath = path.join(this.sessionsDir, `${this.sessionId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(this.toSnapshot(), null, 2), 'utf8');
    } catch (err) {
      // Ignora erro em ambientes estritamente read-only
    }

    // 2. Salvar no StorageManager se disponível
    if (this.storageManager) {
      try {
        const relational = this.storageManager.getRelational?.();
        if (relational && typeof relational.set === 'function') {
          relational.set(this.sessionId, this.toSnapshot(), 'evolution_sessions').catch?.(() => {});
        }
      } catch {
        // Silencioso
      }
    }
  }

  static load(sessionId, options = {}) {
    const sessionsDir = options.sessionsDir || path.join(__dirname, '..', '..', 'data', 'sessions');
    const filePath = path.join(sessionsDir, `${sessionId}.json`);

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      return new EvolutionSession({ ...data, sessionsDir, storageManager: options.storageManager });
    }

    return null;
  }
}

module.exports = {
  EvolutionSession,
  VALID_SESSION_STATES
};
