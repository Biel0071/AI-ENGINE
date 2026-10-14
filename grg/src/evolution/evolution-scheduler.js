'use strict';
/**
 * FÊNIX OS — Evolution Scheduler
 * ==============================
 * Orquestrador contínuo 24/7 com máquina de estados determinística:
 * IDLE -> OBSERVING -> DISPATCHING -> EXECUTING -> COOLING_DOWN -> IDLE
 *
 * Garante:
 * - ResourceGovernor respeitado antes de cada ciclo
 * - Máximo de 1 evolução concorrente
 * - Recuperação automática de sessões interrompidas em crashes anteriores
 * - Rollback garantido em caso de falha de teste ou exceção
 */

const { EventEmitter } = require('events');
const { EvolutionSession } = require('./evolution-session');
const { EvolutionSnapshot } = require('./evolution-snapshot');
const { SandboxRunner } = require('./sandbox-runner');
const { ResourceGovernor } = require('../ops/resource-governor');

const SCHEDULER_STATES = [
  'STOPPED',
  'IDLE',
  'OBSERVING',
  'DISPATCHING',
  'EXECUTING',
  'COOLING_DOWN',
  'THROTTLED'
];

class EvolutionScheduler extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} options.queue             - PersistentEvolutionQueue
   * @param {object} [options.governor]        - ResourceGovernor
   * @param {object} [options.snapshot]        - EvolutionSnapshot
   * @param {object} [options.sandbox]         - SandboxRunner
   * @param {object} [options.memory]          - EvolutionMemory
   * @param {number} [options.intervalMs]      - Intervalo entre ciclos (default 60_000)
   * @param {object} [options.logger]          - Logger
   */
  constructor(options = {}) {
    super();
    if (!options.queue) {
      throw new Error('[EvolutionScheduler] PersistentEvolutionQueue é obrigatório.');
    }

    this.queue = options.queue;
    this.governor = options.governor || new ResourceGovernor();
    this.snapshot = options.snapshot || new EvolutionSnapshot();
    this.sandbox = options.sandbox || new SandboxRunner();
    this.memory = options.memory || null;
    this.intervalMs = options.intervalMs || Number(process.env.FENIX_SCHEDULER_INTERVAL_MS || 60_000);
    this.logger = options.logger || console;

    this.state = 'STOPPED';
    this.activeSession = null;
    this._timer = null;
    this._cycleCount = 0;
    this._lastCycleAt = null;
    this._lastError = null;
    this._history = [];
  }

  start() {
    if (this.state !== 'STOPPED') return this;
    this.state = 'IDLE';
    this.logger.info?.(`[EvolutionScheduler] Iniciado com intervalo de ${this.intervalMs}ms.`);

    // Agendar tick inicial após 2 segundos
    setTimeout(() => this.tick(), 2000);
    this._timer = setInterval(() => this.tick(), this.intervalMs);
    if (typeof this._timer.unref === 'function') this._timer.unref();

    this.emit('scheduler:started');
    return this;
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.state = 'STOPPED';
    this.logger.info?.('[EvolutionScheduler] Parado.');
    this.emit('scheduler:stopped');
    return this;
  }

  /**
   * Executa um ciclo completo do Scheduler.
   */
  async tick() {
    if (this.state === 'EXECUTING' || this.state === 'DISPATCHING') {
      return { skipped: true, reason: `Em execução (${this.state})` };
    }

    // 1. Verificar Resource Governor
    const check = this.governor.canExecute();
    if (!check.allowed) {
      this.state = 'THROTTLED';
      this.logger.warn?.(`[EvolutionScheduler] Ciclo postergado por limitação de recursos: ${check.reason}`);
      this.emit('scheduler:throttled', { reason: check.reason });
      return { skipped: true, reason: check.reason };
    }

    this._cycleCount++;
    this._lastCycleAt = new Date().toISOString();
    const cycleRecord = {
      cycleNumber: this._cycleCount,
      startedAt: this._lastCycleAt,
      result: null,
      error: null
    };

    try {
      // 2. Fase DISPATCHING: verificar fila
      this.state = 'DISPATCHING';
      const item = await this.queue.dequeue();

      if (!item) {
        this.state = 'IDLE';
        cycleRecord.result = 'NO_ITEMS_QUEUED';
        this._recordHistory(cycleRecord);
        return { success: true, processed: false, reason: 'Queue empty' };
      }

      // 3. Fase EXECUTING: executar a proposta de evolução
      this.state = 'EXECUTING';
      this.governor.acquireEvolutionSlot();

      const execResult = await this._executeProposal(item);
      cycleRecord.result = execResult.status;

      this.governor.releaseEvolutionSlot();

      // 4. Fase COOLING_DOWN
      this.state = 'COOLING_DOWN';
      await new Promise(r => setTimeout(r, 1000));
      this.state = 'IDLE';

      this._recordHistory(cycleRecord);
      return { success: true, processed: true, result: execResult };
    } catch (err) {
      this.governor.releaseEvolutionSlot();
      this.state = 'IDLE';
      this._lastError = err.message;
      cycleRecord.error = err.message;
      cycleRecord.result = 'ERROR';
      this._recordHistory(cycleRecord);
      this.logger.error?.('[EvolutionScheduler] Erro durante ciclo:', err);
      return { success: false, error: err.message };
    }
  }

  async _executeProposal(item) {
    const session = new EvolutionSession({
      proposalId: item.proposalId || item.id,
      proposal: item
    });
    this.activeSession = session;
    this.emit('session:started', { session: session.toSnapshot() });

    let snapshotMeta = null;

    try {
      // Passo 1: Criar Snapshot de Segurança
      session.startStep('SNAPSHOT_CREATED', { targetFiles: item.targetFiles });
      snapshotMeta = await this.snapshot.createSnapshot({
        sessionId: session.sessionId,
        proposalId: item.proposalId || item.id,
        targetFiles: item.targetFiles
      });
      session.snapshotId = snapshotMeta.snapshotId;
      session.completeStep('SNAPSHOT_CREATED', { snapshotId: snapshotMeta.snapshotId });

      // Passo 2: Verificação de Pré-requisitos & Sintaxe
      session.startStep('VALIDATING_PRECONDITIONS', { targetFiles: item.targetFiles });
      for (const targetFile of item.targetFiles || []) {
        const syntaxCheck = await this.sandbox.runSyntaxCheck(targetFile);
        if (syntaxCheck.exitCode !== 0) {
          throw new Error(`Erro de sintaxe pré-existente em ${targetFile}: ${syntaxCheck.stderr}`);
        }
      }
      session.completeStep('VALIDATING_PRECONDITIONS', { passed: true });

      // Passo 3: Execução de Ações / Testes da Proposta
      const testsToRun = item.payload?.tests || [];
      session.startStep('TESTING', { tests: testsToRun });

      let allTestsPassed = true;
      const testResults = [];

      for (const testFile of testsToRun) {
        const testRes = await this.sandbox.runTest(testFile);
        testResults.push({ file: testFile, exitCode: testRes.exitCode, durationMs: testRes.durationMs });
        if (testRes.exitCode !== 0) {
          allTestsPassed = false;
          throw new Error(`Falha no teste ${testFile} (Exit code ${testRes.exitCode}): ${testRes.stderr}`);
        }
      }

      session.artifacts.testsRun = testResults;
      session.completeStep('TESTING', { passed: allTestsPassed, count: testResults.length });

      // Passo 4: Promover e Finalizar com Sucesso
      session.startStep('PROMOTING');
      session.completeStep('PROMOTING', { promoted: true });
      session.markCompleted({ status: 'SUCCEEDED' });

      await this.queue.updateState(item.id, 'SUCCEEDED', { sessionId: session.sessionId });

      // Limpar snapshot após sucesso comprovado
      if (snapshotMeta?.snapshotId) {
        this.snapshot.cleanup(snapshotMeta.snapshotId);
      }

      // Gravar aprendizado na memória
      if (this.memory) {
        await this.memory.record({
          missionId: item.id,
          problem: item.title,
          hypothesis: item.description,
          actions: ['EXECUTE_PROPOSAL'],
          filesChanged: item.targetFiles,
          testResults: { passed: true, results: testResults },
          lesson: `Evolução '${item.title}' aplicada e verificada com 100% de sucesso.`
        }).catch?.(() => {});
      }

      this.activeSession = null;
      return { status: 'SUCCEEDED', session: session.toSnapshot() };
    } catch (err) {
      // Em caso de falha: Executar Rollback Imediato
      this.logger.warn?.(`[EvolutionScheduler] Falha na evolução ${item.id}. Iniciando rollback atômico. Erro: ${err.message}`);
      session.failStep(session.currentStep || 'EXECUTING', err);

      if (snapshotMeta?.snapshotId) {
        session.startStep('ROLLING_BACK', { snapshotId: snapshotMeta.snapshotId });
        const rollbackRes = await this.snapshot.rollback(snapshotMeta.snapshotId);
        session.completeStep('ROLLING_BACK', rollbackRes);
        session.markRolledBack(rollbackRes);
      }

      await this.queue.updateState(item.id, 'ROLLED_BACK', {
        sessionId: session.sessionId,
        error: err.message
      });

      // Gravar lição de falha na memória
      if (this.memory) {
        await this.memory.record({
          missionId: item.id,
          problem: item.title,
          hypothesis: item.description,
          actions: ['EXECUTE_PROPOSAL', 'ROLLBACK'],
          filesChanged: item.targetFiles,
          testResults: { passed: false, error: err.message },
          lesson: `Evolução '${item.title}' falhou e foi revertida via rollback: ${err.message}`
        }).catch?.(() => {});
      }

      this.activeSession = null;
      return { status: 'ROLLED_BACK', error: err.message, session: session.toSnapshot() };
    }
  }

  _recordHistory(record) {
    this._history.unshift(record);
    if (this._history.length > 20) this._history.pop();
  }

  getStatus() {
    return {
      state: this.state,
      cycleCount: this._cycleCount,
      lastCycleAt: this._lastCycleAt,
      lastError: this._lastError,
      intervalMs: this.intervalMs,
      activeSession: this.activeSession ? this.activeSession.toSnapshot() : null,
      governor: this.governor.getSystemMetrics(),
      queueSnapshot: this.queue.getSnapshot(),
      recentHistory: this._history.slice(0, 5)
    };
  }
}

module.exports = {
  EvolutionScheduler,
  SCHEDULER_STATES
};
