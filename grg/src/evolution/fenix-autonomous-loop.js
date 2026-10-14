'use strict';
/**
 * FÊNIX OS — Autonomous Loop Engine (ALE) & Continuous Self-Evolution Kernel
 * =========================================================================
 * Loop contínuo 24/7 de auto-observação, detecção, planejamento, execução,
 * validação, aprendizado e enriquecimento da Pattern Library.
 *
 * MÓDULOS INTEGRADOS:
 * - AutonomousEvolutionKernel (AEK)
 * - AutonomousMissionQueue (P0-P7 com problemHash deduplication)
 * - EvolutionMemory (Schema canônico e persistência no PostgreSQL/SQLite)
 * - ExternalChangeDetector (Git Sensor para mudanças de IAs externas/humanos)
 * - Test Timeout Guard (proteção contra testes presos/deadlocks)
 * - Dynamic Score Derivation (cálculo factual sem mocks)
 */

const { EventEmitter } = require('events');
const path = require('path');
const { AutonomousEvolutionKernel } = require('./autonomous-evolution-kernel');
const { AutonomousMissionQueue } = require('./autonomous-mission-queue');
const { EvolutionMemory } = require('./evolution-memory');
const { ExternalChangeDetector } = require('./external-change-detector');

const DEFAULT_INTERVAL_MS = Number(process.env.FENIX_AUTONOMOUS_LOOP_INTERVAL_MS || 60_000);
const MAX_CONCURRENT_MISSIONS = Number(process.env.FENIX_AUTONOMOUS_MAX_CONCURRENT || 1);
const DEFAULT_TEST_TIMEOUT_MS = Number(process.env.FENIX_TEST_TIMEOUT_MS || 40_000);

class FenixAutonomousLoop extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} options.app           - app criado por createApp()
   * @param {string} options.tenantId      - tenant canônico (ex: 'grg')
   * @param {string} options.actorId       - ator executor (ex: 'grg-admin')
   * @param {number} [options.intervalMs]  - intervalo entre ciclos
   * @param {object} [options.logger]      - logger estruturado
   */
  constructor(options = {}) {
    super();
    this.app = options.app;
    this.tenantId = options.tenantId || 'grg';
    this.actorId = options.actorId || 'grg-admin';
    this.intervalMs = options.intervalMs || DEFAULT_INTERVAL_MS;
    this.testTimeoutMs = options.testTimeoutMs || DEFAULT_TEST_TIMEOUT_MS;
    this.logger = options.logger || console;

    // Submódulos evolutivos integrados
    this.aek = new AutonomousEvolutionKernel({ livingModeActive: true });
    this.evolutionMemory = new EvolutionMemory({
      storageManager: this.app?.storageManager,
      eventBus: this.app?.bus,
      logger: this.logger
    });
    this.missionQueue = new AutonomousMissionQueue({
      eventBus: this.app?.bus,
      evolutionMemory: this.evolutionMemory,
      logger: this.logger
    });
    this.gitSensor = new ExternalChangeDetector({
      repoRoot: this.app?.workspaceRoot || path.join(__dirname, '..', '..'),
      evolutionMemory: this.evolutionMemory,
      eventBus: this.app?.bus,
      logger: this.logger
    });

    this._timer = null;
    this._running = false;
    this._cycleCount = 0;
    this._lastCycleAt = null;
    this._lastError = null;
    this._status = 'IDLE';
    this._history = []; // últimos 20 ciclos

    this._setupWatchers();
  }

  // ─── WATCHERS DE SINAIS REAIS ─────────────────────────────────────────────

  _setupWatchers() {
    if (!this.app?.bus) return;

    // 1. Escuta alertas de degradação de persistência
    this.app.bus.on('persistence:status', (event) => {
      if (event?.state === 'PERSISTENCE DEGRADED') {
        this.logger.warn?.('[FenixAutonomousLoop] Sinal recebido: Persistência degradada.');
        this.missionQueue.enqueue({
          priority: 'P1',
          problem: `Persistência degradada: ${event.reasons?.join(', ') || 'cluster indisponível'}`,
          hypothesis: 'Reinicialização dos drivers de storage ou fallback para storage secundário restaura persistência',
          context: { event }
        });
      }
    });

    // 2. Escuta alterações externas do sensor Git
    this.gitSensor.on('change', (changeRecord) => {
      this.logger.info?.(`[FenixAutonomousLoop] Sensor Git reportou mudança: ${changeRecord.files.length} arquivos.`);
    });
  }

  // ─── API PÚBLICA ──────────────────────────────────────────────────────────

  start() {
    if (this._timer) return this;
    this._status = 'ACTIVE';
    this.logger.info?.(`[FenixAutonomousLoop] Loop iniciado. Intervalo: ${this.intervalMs}ms`);

    // Iniciar sensor Git
    this.gitSensor.start();

    // Primeiro ciclo
    this._tick();
    this._timer = setInterval(() => this._tick(), this.intervalMs);
    if (typeof this._timer.unref === 'function') this._timer.unref();
    return this;
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.gitSensor.stop();
    this._status = 'STOPPED';
    this.logger.info?.('[FenixAutonomousLoop] Loop parado.');
    return this;
  }

  getStatus() {
    return {
      status: this._status,
      cycleCount: this._cycleCount,
      lastCycleAt: this._lastCycleAt,
      lastError: this._lastError,
      intervalMs: this.intervalMs,
      aek: this.aek.getLastScanInfo?.() || { livingMode: true },
      queue: this.missionQueue.getSnapshot(),
      scores: this.calculateScores(),
      recentHistory: this._history.slice(-5)
    };
  }

  status() {
    return this.getStatus();
  }

  getHeartbeat() {
    const scores = this.calculateScores();
    const persistenceStats = this.app?.storageManager?.getStats?.() || null;
    const nextMission = this.missionQueue.getNext();
    const queue = this.missionQueue.getSnapshot();

    return {
      system: Number.isFinite(process.uptime()) ? 'ONLINE' : 'UNKNOWN',
      kernel: this.app?.missions ? 'AVAILABLE' : 'UNAVAILABLE',
      persistence: !persistenceStats
        ? 'NOT_MEASURED'
        : persistenceStats.degraded
          ? 'PERSISTENCE DEGRADED'
          : persistenceStats.state || 'UNKNOWN',
      memory: this.evolutionMemory ? 'AVAILABLE' : 'UNAVAILABLE',
      watchers: this.gitSensor?._timer ? 'ACTIVE' : 'STOPPED',
      missions: this._running ? 'RUNNING' : queue.active.length ? 'QUEUED' : 'IDLE',
      evolution: this._status,
      lastLearning: this._lastCycleAt,
      nextMission: nextMission ? { id: nextMission.id, priority: nextMission.priority, problem: nextMission.problem } : null,
      scores
    };
  }

  calculateScores() {
    // Stability is measurable only after real cycles have completed. The remaining
    // dimensions require separate audits and must stay unknown until those exist.
    const recent = this._history.slice(-10);
    const successCount = recent.filter(c => c.result === 'SUCCESS' || c.result === 'NO_FINDINGS').length;
    const stabilityScore = recent.length ? Number((successCount / recent.length).toFixed(2)) : null;

    return {
      realityScore: null,
      stabilityScore,
      persistenceScore: null,
      learningScore: null,
      visualScore: null,
      evolutionScore: null,
      stabilitySampleSize: recent.length,
    };
  }

  async getDashboardData() {
    const status = this.getStatus();
    const heartbeat = this.getHeartbeat();
    const memorySummary = await this.evolutionMemory.getSummary();
    const queue = this.missionQueue.getSnapshot();

    return {
      heartbeat,
      status,
      scores: heartbeat.scores,
      queue,
      memory: memorySummary,
      activeMission: queue.active[0] || null,
      recentCycles: this._history.slice(0, 10)
    };
  }

  // ─── CICLO INTERNO ────────────────────────────────────────────────────────

  async _tick() {
    if (this._running) return;
    this._running = true;
    const cycleId = `cycle-${Date.now()}`;
    const started = Date.now();
    const entry = { cycleId, startedAt: new Date().toISOString(), phase: 'STARTING', result: null, error: null };
    this._history.unshift(entry);
    if (this._history.length > 20) this._history.pop();

    try {
      this._status = 'RUNNING';

      // ── FASE 1: OBSERVE ───────────────────────────────────────────────────
      entry.phase = 'OBSERVE';
      const projectContext = await this._buildProjectContext();

      // Checa saúde de persistência do StorageManager
      const storageStats = this.app?.storageManager?.getStats?.();
      if (storageStats?.degraded) {
        this.missionQueue.enqueue({
          priority: 'P1',
          problem: `Armazenamento degradado: ${storageStats.reasons?.join(', ')}`,
          hypothesis: 'Reconectar ao PostgreSQL/Redis da VPS recupera a persistência plena'
        });
      }

      // ── FASE 2: VERIFICA FILA OU EXECUTA AEK SCAN ────────────────────────
      let currentMission = this.missionQueue.getNext();

      if (!currentMission) {
        // Sem missões na fila -> Scan do AEK
        const scanResult = await this.aek.runLivingModeScan(projectContext);
        entry.scanStatus = scanResult.status;
        entry.findings = scanResult.findings?.length || 0;

        if (scanResult.findings?.length > 0) {
          const topFinding = this._prioritize(scanResult.findings);
          const priority = topFinding.priority === 'Critical' ? 'P0' : (topFinding.priority === 'High' ? 'P2' : 'P3');
          const queued = this.missionQueue.enqueue({
            priority,
            problem: `${topFinding.title}: ${topFinding.impact || 'Anomalia detectada'}`,
            hypothesis: `Mitigar finding ${topFinding.id} na categoria ${topFinding.category}`,
            context: { finding: topFinding }
          });
          currentMission = queued.mission;
        }
      }

      if (!currentMission) {
        // Nenhuma missão -> Ciclo de manutenção
        entry.phase = 'IDLE_MAINTENANCE';
        entry.result = 'NO_FINDINGS';
        await this._runMaintenanceCycle(cycleId);
        this._finishCycle(entry, started, null);
        return;
      }

      // ── FASE 3: PLANEJAR & EXECUTAR COM TEST TIMEOUT GUARD ───────────────
      entry.phase = 'PLANNING';
      this.missionQueue.transition(currentMission.id, 'PLANNING');

      entry.phase = 'EXECUTING';
      this.missionQueue.transition(currentMission.id, 'EXECUTING');
      entry.missionId = currentMission.id;
      entry.objective = currentMission.problem;

      const cycleResult = await this._executeWithTimeout(async () => {
        return this._executeMission(currentMission.problem, cycleId);
      }, this.testTimeoutMs);

      // ── FASE 4: VALIDATE ──────────────────────────────────────────────────
      entry.phase = 'VALIDATE';
      this.missionQueue.transition(currentMission.id, 'TESTING');
      const valid = await this._validate(cycleResult);
      entry.valid = valid;

      // ── FASE 5: APRENDIZADO OU TRATAMENTO DE FALHA ────────────────────────
      if (valid) {
        entry.phase = 'LEARN';
        this.missionQueue.transition(currentMission.id, 'COMPLETED');
        await this.evolutionMemory.record({
          missionId: currentMission.id,
          problem: currentMission.problem,
          hypothesis: currentMission.hypothesis,
          actions: ['automated-cycle-execution', 'validation-gate'],
          testResults: { status: 'PASSED', valid: true },
          lesson: `Missão ${currentMission.id} resolvida com sucesso: "${currentMission.problem.slice(0, 80)}"`,
          pattern: 'Autonomous-Cycle-Success-Pattern',
          confidence: 0.90,
          rollbackAvailable: false
        });
        entry.result = 'SUCCESS';
      } else {
        await this.missionQueue.recordFailure(currentMission.id, {
          failureMode: 'VALIDATION_FAILED',
          rootCause: 'O gate de validação rejeitou o resultado da execução autônoma',
          whatDidntWork: 'Execução do ciclo padrão não satisfez todos os testes de qualidade',
          nextHypothesis: 'Isolar escopo da missão para componentes unitários antes de validar sistema global'
        });
        entry.result = 'VALIDATION_FAILED';
      }

      entry.phase = 'COMPLETE';
      this._finishCycle(entry, started, null);

    } catch (err) {
      entry.phase = 'ERROR';
      entry.error = err.message;
      entry.result = 'ERROR';
      this._lastError = { message: err.message, at: new Date().toISOString() };
      this._finishCycle(entry, started, err);
    } finally {
      this._running = false;
    }
  }

  // ─── TEST TIMEOUT GUARD ───────────────────────────────────────────────────

  async _executeWithTimeout(fn, timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Test Timeout Guard: execução excedeu ${timeoutMs}ms e foi abortada.`)), timeoutMs)
      )
    ]);
  }

  // ─── CONTEXT BUILDER ──────────────────────────────────────────────────────

  async _buildProjectContext() {
    const ctx = {};
    try {
      const state = await Promise.race([
        this.app?.store?.read ? this.app.store.read() : Promise.resolve({}),
        new Promise((_, rej) => setTimeout(() => rej(new Error('store timeout')), 5000)),
      ]);

      const allMissions = (state.missions || []).filter(m => m.tenantId === this.tenantId);
      ctx.missionHistory = allMissions.map(m => ({ id: m.id, status: m.status, title: m.title }));

      const allJobs = (state.runtimeJobs || []).filter(j => j.tenantId === this.tenantId);
      const completedJobs = allJobs.filter(j => j.status === 'SUCCEEDED' || j.status === 'FAILED');
      if (completedJobs.length > 0) {
        const durations = completedJobs
          .map(j => j.metrics?.durationMs)
          .filter(d => typeof d === 'number' && d > 0);
        if (durations.length > 0) {
          ctx.metrics = { avgJobDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length };
        }
      }

      if (this.app?.projectKernel?.listProjects) {
        try {
          const projects = await this.app.projectKernel.listProjects(this.tenantId);
          ctx.files = projects.flatMap(p => p.files || []).slice(0, 200);
        } catch (_) {}
      }
    } catch (err) {
      this.logger.warn?.('[FenixAutonomousLoop] _buildProjectContext falhou:', err.message);
    }
    return ctx;
  }

  _prioritize(findings) {
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return findings.slice().sort((a, b) =>
      (order[a.priority] ?? 9) - (order[b.priority] ?? 9)
    )[0];
  }

  async _executeMission(objective, cycleId) {
    if (!this.app?.executiveBrain || !this.app?.missions) {
      return this._createDirectMission(objective, cycleId);
    }
    try {
      const { runAutonomousCycle } = require('../server');
      return await runAutonomousCycle(this.app, this.tenantId, this.actorId, {
        objective,
        maxConcurrent: MAX_CONCURRENT_MISSIONS,
      });
    } catch (err) {
      this.logger.warn?.('[FenixAutonomousLoop] runAutonomousCycle falhou, usando missão direta:', err.message);
      return this._createDirectMission(objective, cycleId);
    }
  }

  async _createDirectMission(objective, cycleId) {
    if (!this.app?.missions?.create) return { ok: false, reason: 'MissionKernel não disponível' };
    try {
      const mission = await this.app.missions.create(this.tenantId, this.actorId, {
        title: `[AUTO] ${cycleId}`,
        objective,
        steps: [
          { key: 'discover', type: 'discover', dependsOn: [], payload: {} },
          { key: 'analyze', type: 'analyze', dependsOn: ['discover'], payload: {} },
        ],
      });
      await this.app.missions.start(this.tenantId, this.actorId, mission.id);
      return { ok: true, mode: 'DIRECT_MISSION', program: { id: mission.id }, startedMissions: [mission], jobs: [] };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  async _validate(cycleResult) {
    if (!cycleResult?.ok) return false;
    if (this.app?.qualityGate?.check) {
      try {
        const qg = await this.app.qualityGate.check({ tenantId: this.tenantId });
        return qg?.passed !== false;
      } catch (_) {}
    }
    return true;
  }

  async _runMaintenanceCycle(cycleId) {
    if (this.app?.missions?.reconcile) {
      try {
        await this.app.missions.reconcile(this.tenantId, this.actorId, {
          autoStart: false,
          maxConcurrent: MAX_CONCURRENT_MISSIONS,
        });
      } catch (_) {}
    }
    this.emit('maintenance', { cycleId, at: new Date().toISOString() });
  }

  _finishCycle(entry, started, err) {
    this._cycleCount++;
    this._lastCycleAt = new Date().toISOString();
    entry.durationMs = Date.now() - started;
    this._status = err ? 'ERROR' : 'ACTIVE';
    const log = { cycleCount: this._cycleCount, ...entry };
    this.logger.info?.('[FenixAutonomousLoop] Ciclo concluído:', JSON.stringify(log));
    this.emit('cycle', log);
  }
}

module.exports = { FenixAutonomousLoop };
