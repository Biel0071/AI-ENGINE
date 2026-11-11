'use strict';
/**
 * FÊNIX OS — Level 27: Self-Healing Reliability Engine
 * ====================================================
 * Core SRE engine for automated fault detection, targeted recovery,
 * circuit breaker management, idempotent task reprocessing,
 * worker/agent stall watchdogs, and human escalation gate.
 *
 * Adheres strictly to Zero-Mock & Single Source of Truth architecture.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const DATA_DIR = path.join(__dirname, '..', '..', '.data');
const LEDGER_FILE = path.join(DATA_DIR, 'self-healing-ledger.json');

const INCIDENT_STATUSES = {
  ACTIVE: 'ACTIVE',
  RECOVERED: 'RECOVERED',
  ESCALATED: 'ESCALATED',
  FAILED: 'FAILED'
};

const SEVERITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

function safeEmit(bus, method, eventType, data) {
  try {
    if (bus && typeof bus.emit === 'function') {
      bus.emit(eventType, data);
    }
  } catch (_) {}
}

class SelfHealingReliabilityEngine {
  constructor(options = {}) {
    this.app = options.app || null;
    this.bus = options.bus || global.__fenixEventBus || null;
    this.jobQueueManager = options.jobQueueManager || null;
    this.agentRegistry = options.agentRegistry || null;
    this.healthRegistry = options.healthRegistry || null;

    this.watchdogIntervalMs = Number(options.watchdogIntervalMs || 5_000);
    this.workerStaleTimeoutMs = Number(options.workerStaleTimeoutMs || 20_000);
    this.jobTimeoutMs = Number(options.jobTimeoutMs || 60_000);
    this.maxAutoRetries = Number(options.maxAutoRetries || 3);

    this.incidents = new Map();
    this.workerHeartbeats = new Map();
    this.agentHeartbeats = new Map();
    this.circuitBreakers = new Map();
    this.sseMetrics = {
      activeClients: 0,
      totalConnections: 0,
      reconnects: 0,
      droppedEvents: 0,
      lastHeartbeatPing: null
    };

    this.watchdogTimer = null;
    this.isWatching = false;

    this._initDefaultCircuitBreakers();
    this.loadLedger();
  }

  _initDefaultCircuitBreakers() {
    const defaultBreakers = ['ai-platform', 'ollama', 'redis', 'database', 'workers'];
    for (const name of defaultBreakers) {
      if (!this.circuitBreakers.has(name)) {
        this.circuitBreakers.set(name, {
          name,
          state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
          failures: 0,
          failureThreshold: 3,
          cooldownMs: 30_000,
          lastFailureAt: null,
          trippedAt: null,
          halfOpenProbeInFlight: false,
          fallbackActive: false,
          fallbackReason: null
        });
      }
    }
  }

  loadLedger() {
    try {
      if (fs.existsSync(LEDGER_FILE)) {
        const raw = fs.readFileSync(LEDGER_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.incidents)) {
          for (const inc of parsed.incidents) {
            this.incidents.set(inc.incidentId, inc);
          }
        }
      }
    } catch (e) {
      console.warn('[SelfHealingEngine] Ledger load warning:', e.message);
    }
  }

  saveLedger() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const incidentList = Array.from(this.incidents.values()).slice(-200); // keep last 200 incidents
      fs.writeFileSync(LEDGER_FILE, JSON.stringify({
        updatedAt: new Date().toISOString(),
        totalIncidents: this.incidents.size,
        incidents: incidentList
      }, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[SelfHealingEngine] Ledger save warning:', e.message);
    }
  }

  recordIncident({ component, failureType, severity = 'MEDIUM', rootCause, errorDetails = null, metadata = {} }) {
    const incidentId = 'inc-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
    const incident = {
      incidentId,
      component,
      failureType,
      severity,
      rootCause: String(rootCause || 'Unspecified failure'),
      errorDetails: errorDetails ? String(errorDetails.message || errorDetails) : null,
      metadata,
      attemptNumber: 1,
      maxAttempts: this.maxAutoRetries,
      state: INCIDENT_STATUSES.ACTIVE,
      detectedAt: new Date().toISOString(),
      recoveredAt: null,
      recoveryAction: null,
      durationMs: null
    };

    this.incidents.set(incidentId, incident);
    this.saveLedger();

    safeEmit(this.bus, 'emit', 'reliability.incident.detected', incident);
    return incident;
  }

  recordRecovery(incidentId, { recoveryAction, outcome = INCIDENT_STATUSES.RECOVERED, details = null }) {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    const now = Date.now();
    incident.state = outcome;
    incident.recoveryAction = recoveryAction;
    incident.recoveredAt = new Date(now).toISOString();
    incident.durationMs = now - Date.parse(incident.detectedAt);
    if (details) incident.recoveryDetails = details;

    this.saveLedger();
    safeEmit(this.bus, 'emit', 'reliability.incident.recovered', incident);
    return incident;
  }

  escalateIncident(incidentId, reason) {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    incident.state = INCIDENT_STATUSES.ESCALATED;
    incident.escalatedAt = new Date().toISOString();
    incident.escalationReason = reason || 'Exceeded maximum automated recovery attempts';

    this.saveLedger();
    safeEmit(this.bus, 'emit', 'reliability.incident.escalated', incident);
    return incident;
  }

  /* ── Worker Heartbeat Tracking & Stall Recovery ── */
  registerWorkerHeartbeat(workerId, metadata = {}) {
    if (!workerId) return;
    const now = new Date().toISOString();
    const entry = this.workerHeartbeats.get(workerId) || {
      workerId,
      startedAt: now,
      processedCount: 0,
      failedCount: 0,
      currentJobId: null
    };
    entry.lastHeartbeat = now;
    entry.status = 'ONLINE';
    if (metadata.currentJobId !== undefined) entry.currentJobId = metadata.currentJobId;
    if (metadata.processedCount !== undefined) entry.processedCount = metadata.processedCount;
    if (metadata.failedCount !== undefined) entry.failedCount = metadata.failedCount;
    if (metadata.queue) entry.queue = metadata.queue;

    this.workerHeartbeats.set(workerId, entry);
  }

  detectStaleWorkers() {
    const nowMs = Date.now();
    const staleWorkers = [];

    for (const [workerId, record] of this.workerHeartbeats.entries()) {
      if (record.status === 'OFFLINE') continue;
      const lastHbMs = record.lastHeartbeat ? Date.parse(record.lastHeartbeat) : 0;
      const ageMs = nowMs - lastHbMs;

      if (ageMs > this.workerStaleTimeoutMs) {
        record.status = 'STALE';
        staleWorkers.push({ worker: record, ageMs });
      }
    }

    return staleWorkers;
  }

  async recoverStaleWorkers() {
    const staleList = this.detectStaleWorkers();
    const recovered = [];

    for (const { worker, ageMs } of staleList) {
      const incident = this.recordIncident({
        component: 'worker',
        failureType: 'WORKER_HEARTBEAT_TIMEOUT',
        severity: SEVERITY_LEVELS.HIGH,
        rootCause: `Worker ${worker.workerId} heartbeat expired (${Math.round(ageMs / 1000)}s sem resposta)`,
        metadata: { workerId: worker.workerId, stuckJobId: worker.currentJobId }
      });

      // Recover the job if one was running on this worker
      if (worker.currentJobId) {
        await this.recoverStuckJob(worker.currentJobId, `Worker ${worker.workerId} parou de responder`);
      }

      worker.status = 'OFFLINE';
      worker.currentJobId = null;

      // Targeted restart: if local worker, restart instance cleanly
      this.recordRecovery(incident.incidentId, {
        recoveryAction: `ISOLATE_STALE_WORKER_AND_REQUEUE_JOBS`,
        details: `Worker ${worker.workerId} marcado OFFLINE e tarefas pendentes devolvidas à fila de forma idempotente.`
      });

      recovered.push(worker.workerId);
    }

    return recovered;
  }

  /* ── Job Stall Detection & Idempotent Reprocessing ── */
  async detectStuckJobs() {
    const stuck = [];
    const nowMs = Date.now();

    // Check JobQueueManager
    const qm = this.jobQueueManager || (this.app ? this.app.jobQueueManager : null);
    if (qm && qm.jobs) {
      for (const [jobId, job] of qm.jobs.entries()) {
        if (job.status === 'RUNNING') {
          const startedAt = job.startedAt || job.updatedAt || job.createdAt;
          const ageMs = startedAt ? nowMs - Date.parse(startedAt) : 0;
          const timeout = Number(job.limits?.timeoutMs || this.jobTimeoutMs);

          if (ageMs > timeout) {
            stuck.push({ jobId, job, ageMs, timeout, manager: 'JobQueueManager' });
          }
        }
      }
    }

    // Check canonical JobEngine if present
    const je = this.app?.jobs;
    if (je && typeof je.store?.read === 'function') {
      try {
        const state = await je.store.read();
        for (const job of (state.runtimeJobs || [])) {
          if (job.status === 'RUNNING') {
            const hbTime = job.heartbeatAt || job.startedAt || job.updatedAt || job.createdAt;
            const ageMs = hbTime ? nowMs - Date.parse(hbTime) : 0;
            const timeout = Number(job.limits?.timeoutMs || this.jobTimeoutMs);
            if (ageMs > timeout) {
              stuck.push({ jobId: job.id, job, ageMs, timeout, manager: 'JobEngine' });
            }
          }
        }
      } catch (_) {}
    }

    return stuck;
  }

  async recoverStuckJob(jobId, reason = 'Execução excedeu o tempo limite', options = {}) {
    this.inFlightRecoveries = this.inFlightRecoveries || new Map();
    const strJobId = String(jobId);
    if (this.inFlightRecoveries.has(strJobId)) {
      return this.inFlightRecoveries.get(strJobId);
    }

    const execRecovery = async () => {
      const qm = this.jobQueueManager || (this.app ? this.app.jobQueueManager : null);
      if (!qm || !qm.jobs) return false;

      const job = qm.jobs.get(strJobId);
      if (!job) return false;

      if (options.force) {
        job.status = 'QUEUED';
        job.attempts = 1;
        job.error = null;
        job.escalated = false;
        job._bullDispatched = false;
        job.startedAt = null;
        job.scheduledFor = null;
        job.steps = Array.isArray(job.steps) ? job.steps : [];
        job.steps.push({
          name: 'MANUALLY_RECOVERED_BY_OPERATOR',
          status: 'QUEUED',
          timestamp: new Date().toISOString()
        });
        job.idempotencyKey = crypto.createHash('sha256').update(`job-${job.id}-attempt-1-forced-${Date.now()}`).digest('hex');
        qm.save();
        if (typeof qm.dispatchPendingJobs === 'function') await qm.dispatchPendingJobs();
        else if (typeof qm._dispatchToBull === 'function') await qm._dispatchToBull(job);
        safeEmit(this.bus, 'emit', 'job.recovered', { jobId: strJobId, attempt: 1, forced: true });
        return { recovered: true, escalated: false, jobId: strJobId, attempt: 1, forced: true };
      }

      if (job.status !== 'RUNNING') {
        return { recovered: true, escalated: false, jobId: strJobId, attempt: job.attempts || 1, idempotent: true };
      }

      const currentAttempts = Number(job.attempts || 1);
      const maxAttempts = Number(job.maxAttempts || this.maxAutoRetries);

      const incident = this.recordIncident({
        component: 'job-queue',
        failureType: 'JOB_STALL',
        severity: currentAttempts >= maxAttempts ? SEVERITY_LEVELS.CRITICAL : SEVERITY_LEVELS.MEDIUM,
        rootCause: reason,
        metadata: { jobId: strJobId, attempts: currentAttempts, maxAttempts }
      });

      if (currentAttempts >= maxAttempts) {
        job.status = 'FAILED';
        job.error = `Falha recuperável excedeu limite de ${maxAttempts} tentativas automáticas. Encaminhado para aprovação humana.`;
        job.escalated = true;
        job.steps = Array.isArray(job.steps) ? job.steps : [];
        job.steps.push({
          name: 'ESCALATED_HUMAN_APPROVAL',
          status: 'FAILED',
          timestamp: new Date().toISOString()
        });
        qm.save();

        this.escalateIncident(incident.incidentId, `Job #${strJobId} atingiu teto de ${maxAttempts} tentativas sem sucesso.`);
        safeEmit(this.bus, 'emit', 'job.failed', { jobId: strJobId, reason: job.error, escalated: true });
        return { recovered: false, escalated: true, jobId: strJobId };
      }

      job.attempts = currentAttempts + 1;
      job.status = 'QUEUED';
      job._bullDispatched = false;
      job.startedAt = null;
      const backoffDelayMs = Math.min(30_000, Math.pow(2, currentAttempts) * 1_000);
      job.scheduledFor = new Date(Date.now() + backoffDelayMs).toISOString();
      job.steps = Array.isArray(job.steps) ? job.steps : [];
      job.steps.push({
        name: `AUTO_RETRY_ATTEMPT_${job.attempts}`,
        status: 'QUEUED',
        timestamp: new Date().toISOString()
      });

      job.idempotencyKey = crypto.createHash('sha256').update(`job-${job.id}-attempt-${job.attempts}`).digest('hex');
      qm.save();

      this.recordRecovery(incident.incidentId, {
        recoveryAction: 'IDEMPOTENT_RETRY_WITH_BACKOFF',
        details: `Job #${strJobId} re-enfileirado com tentativa ${job.attempts}/${maxAttempts} e backoff de ${backoffDelayMs}ms.`
      });

      safeEmit(this.bus, 'emit', 'job.recovered', { jobId: strJobId, attempt: job.attempts, backoffDelayMs });
      return { recovered: true, escalated: false, jobId: strJobId, attempt: job.attempts };
    };

    const recoveryPromise = execRecovery();
    this.inFlightRecoveries.set(strJobId, recoveryPromise);
    try {
      return await recoveryPromise;
    } finally {
      this.inFlightRecoveries.delete(strJobId);
    }
  }

  /* ── Agent Stalled State Recovery ── */
  recoverStalledAgents(maxWorkingAgeMs = 120_000) {
    const registry = this.agentRegistry || (this.app ? this.app.agentRegistry : null);
    if (!registry || typeof registry.list !== 'function') return [];

    const agents = registry.list();
    const nowMs = Date.now();
    const recoveredAgents = [];

    for (const ag of agents) {
      if (ag.availability === 'WORKING' || ag.status === 'WORKING') {
        const updatedAtMs = ag.updatedAt ? Date.parse(ag.updatedAt) : 0;
        const idleAgeMs = nowMs - updatedAtMs;

        // If working for too long without task or if the task already finished
        if (idleAgeMs > maxWorkingAgeMs) {
          const previousTask = ag.currentTaskId;
          ag.availability = 'AVAILABLE';
          ag.status = 'AVAILABLE';
          ag.currentTaskId = null;
          ag.updatedAt = new Date().toISOString();

          const incident = this.recordIncident({
            component: 'agent',
            failureType: 'AGENT_STALL',
            severity: SEVERITY_LEVELS.MEDIUM,
            rootCause: `Agente ${ag.name || ag.id} retido em WORKING por ${Math.round(idleAgeMs / 1000)}s sem progresso ativo.`,
            metadata: { agentId: ag.id, previousTaskId: previousTask }
          });

          this.recordRecovery(incident.incidentId, {
            recoveryAction: 'RESET_AGENT_TO_AVAILABLE',
            details: `Estado do agente ${ag.id} liberado para AVAILABLE de forma determinística.`
          });

          recoveredAgents.push(ag.id);
        }
      }
    }

    return recoveredAgents;
  }

  /* ── Circuit Breakers: Protect External Integrations ── */
  getCircuitBreaker(name) {
    if (!this.circuitBreakers.has(name)) {
      this._initDefaultCircuitBreakers();
    }
    return this.circuitBreakers.get(name);
  }

  recordCircuitSuccess(name) {
    const cb = this.getCircuitBreaker(name);
    if (!cb) return;

    if (cb.state === 'HALF_OPEN') {
      cb.state = 'CLOSED';
      cb.failures = 0;
      cb.trippedAt = null;
      cb.fallbackActive = false;
      cb.fallbackReason = null;
      cb.halfOpenProbeInFlight = false;
      safeEmit(this.bus, 'emit', 'reliability.circuit.closed', { name, recoveredAt: new Date().toISOString() });
    } else if (cb.state === 'CLOSED') {
      cb.failures = 0;
    }
  }

  recordCircuitFailure(name, error) {
    const cb = this.getCircuitBreaker(name);
    if (!cb) return;

    const now = Date.now();
    cb.failures += 1;
    cb.lastFailureAt = new Date(now).toISOString();

    if (cb.state === 'HALF_OPEN' || cb.failures >= cb.failureThreshold) {
      const wasOpen = cb.state === 'OPEN';
      cb.state = 'OPEN';
      cb.trippedAt = new Date(now).toISOString();
      cb.fallbackActive = true;
      cb.fallbackReason = error?.message || 'Failure threshold exceeded';
      cb.halfOpenProbeInFlight = false;

      if (!wasOpen) {
        const incident = this.recordIncident({
          component: name,
          failureType: 'CIRCUIT_TRIPPED',
          severity: SEVERITY_LEVELS.HIGH,
          rootCause: `Circuito para ${name} disparou após ${cb.failures} falhas consecutivas: ${cb.fallbackReason}`,
          metadata: { name, threshold: cb.failureThreshold, cooldownMs: cb.cooldownMs }
        });

        safeEmit(this.bus, 'emit', 'reliability.circuit.opened', {
          name,
          incidentId: incident.incidentId,
          reason: cb.fallbackReason,
          cooldownMs: cb.cooldownMs
        });
      }
    }
  }

  canExecuteThroughCircuit(name) {
    const cb = this.getCircuitBreaker(name);
    if (!cb) return true;

    const now = Date.now();
    if (cb.state === 'CLOSED') return true;

    if (cb.state === 'OPEN') {
      const trippedTime = cb.trippedAt ? Date.parse(cb.trippedAt) : 0;
      if (now - trippedTime >= cb.cooldownMs) {
        cb.state = 'HALF_OPEN';
        cb.halfOpenProbeInFlight = false;
        return true;
      }
      return false; // Fast fail during OPEN cooldown
    }

    if (cb.state === 'HALF_OPEN') {
      if (!cb.halfOpenProbeInFlight) {
        cb.halfOpenProbeInFlight = true;
        return true;
      }
      return false; // Only 1 canary probe allowed at a time
    }

    return true;
  }

  async executeWithCircuitBreaker(name, operation, fallback = null) {
    if (!this.canExecuteThroughCircuit(name)) {
      if (typeof fallback === 'function') {
        return fallback(new Error(`Circuit ${name} is OPEN (fast-fail mode)`));
      }
      throw new Error(`Circuit ${name} is OPEN and in cooldown. Fast-fail active.`);
    }

    try {
      const result = await operation();
      this.recordCircuitSuccess(name);
      return result;
    } catch (err) {
      this.recordCircuitFailure(name, err);
      if (typeof fallback === 'function') {
        return fallback(err);
      }
      throw err;
    }
  }

  /* ── SSE Resilience & Connection Tracking ── */
  recordSSEConnection() {
    this.sseMetrics.totalConnections += 1;
    this.sseMetrics.activeClients += 1;
  }

  recordSSEDisconnection() {
    this.sseMetrics.activeClients = Math.max(0, this.sseMetrics.activeClients - 1);
  }

  recordSSEReconnect() {
    this.sseMetrics.reconnects += 1;
  }

  recordSSEHeartbeat() {
    this.sseMetrics.lastHeartbeatPing = new Date().toISOString();
  }

  recordSSEEventFailure() {
    this.sseMetrics.droppedEvents += 1;
  }

  /* ── Targeted Component Restart ── */
  async restartComponent(component, options = {}) {
    const compKey = String(component || '').toLowerCase().trim();
    const aliasMap = {
      'ai': 'ai-platform',
      'api': 'ai-platform',
      'apiplatform': 'ai-platform',
      'api-platform': 'ai-platform',
      'postgresql': 'database',
      'postgres': 'database',
      'db': 'database',
      'workers': 'worker',
      'events': 'sse'
    };
    const targetComp = aliasMap[compKey] || compKey;

    const incident = this.recordIncident({
      component: targetComp,
      failureType: 'TARGETED_COMPONENT_RESTART',
      severity: SEVERITY_LEVELS.MEDIUM,
      rootCause: `Reinicialização direcionada solicitada para o componente '${targetComp}'.`,
      metadata: options
    });

    let details = '';
    if (targetComp === 'worker') {
      // Re-initialize local worker if available
      try {
        const { createFenixWorker } = require('../execution/fenix-worker');
        if (typeof createFenixWorker === 'function') {
          createFenixWorker();
          details = 'Worker local V8.2 reiniciado cirurgicamente.';
        }
      } catch (e) {
        details = `Falha ao reiniciar worker local: ${e.message}`;
      }
    } else if (targetComp === 'redis') {
      // Test Redis connectivity and toggle fallback
      const cb = this.getCircuitBreaker('redis');
      if (cb) {
        cb.state = 'HALF_OPEN';
        cb.failures = 0;
      }
      details = 'Conector Redis redefinido para estado HALF_OPEN para sondagem de recuperação.';
    } else if (targetComp === 'ai-platform') {
      const cb = this.getCircuitBreaker('ai-platform');
      if (cb) {
        cb.state = 'HALF_OPEN';
        cb.failures = 0;
      }
      details = 'Circuito AI Platform redefinido para estado HALF_OPEN para sondagem de recuperação.';
    } else if (targetComp === 'database') {
      const cb = this.getCircuitBreaker('database');
      if (cb) {
        cb.state = 'HALF_OPEN';
        cb.failures = 0;
      }
      details = 'Circuito Database redefinido para estado HALF_OPEN para sondagem de recuperação.';
    } else if (targetComp === 'sse') {
      // Broadcast reconnection directive
      safeEmit(this.bus, 'emit', 'system.sse.refresh', { timestamp: new Date().toISOString() });
      this.sseMetrics.reconnects += 1;
      details = 'Sinal de reconexão SSE emitido a todos os clientes conectados.';
    } else if (targetComp === 'agent') {
      const agentId = options.agentId;
      if (agentId && this.agentRegistry) {
        this.agentRegistry.setAvailability(agentId, 'AVAILABLE', { taskId: null });
        details = `Agente ${agentId} redefinido para status AVAILABLE.`;
      } else {
        const recovered = this.recoverStalledAgents(0);
        details = `${recovered.length} agentes paralisados redefinidos para AVAILABLE.`;
      }
    } else {
      details = `Ação padrão executada para o componente ${targetComp}.`;
    }

    this.recordRecovery(incident.incidentId, {
      recoveryAction: `TARGETED_RESTART_${String(targetComp).toUpperCase()}`,
      details
    });

    return { ok: true, component: targetComp, details, incidentId: incident.incidentId };
  }

  /* ── Watchdog Master Loop ── */
  async runWatchdog() {
    const report = {
      timestamp: new Date().toISOString(),
      staleWorkersRecovered: 0,
      stuckJobsRecovered: 0,
      stalledAgentsRecovered: 0,
      circuitsChecked: this.circuitBreakers.size
    };

    try {
      // 1. Recover stale workers
      const staleWorkers = await this.recoverStaleWorkers();
      report.staleWorkersRecovered = staleWorkers.length;

      // 2. Detect & recover stuck jobs
      const stuckJobs = await this.detectStuckJobs();
      for (const item of stuckJobs) {
        await this.recoverStuckJob(item.jobId, `Job em execução excedeu tempo limite (${Math.round(item.ageMs / 1000)}s)`);
        report.stuckJobsRecovered += 1;
      }

      // 3. Dispatch pending jobs whose backoff delay has expired
      const qm = this.jobQueueManager || (this.app ? this.app.jobQueueManager : null);
      if (qm && typeof qm.dispatchPendingJobs === 'function') {
        await qm.dispatchPendingJobs().catch(() => {});
      }

      // 4. Recover stalled agents
      const recoveredAgents = this.recoverStalledAgents();
      report.stalledAgentsRecovered = recoveredAgents.length;

      // 5. Update circuit breaker cooldowns
      const now = Date.now();
      for (const cb of this.circuitBreakers.values()) {
        if (cb.state === 'OPEN') {
          const trippedTime = cb.trippedAt ? Date.parse(cb.trippedAt) : 0;
          if (now - trippedTime >= cb.cooldownMs) {
            cb.state = 'HALF_OPEN';
            cb.halfOpenProbeInFlight = false;
          }
        }
      }
    } catch (err) {
      console.warn('[SelfHealingEngine] Watchdog error:', err.message);
    }

    return report;
  }

  startWatchdog(intervalMs = null) {
    if (this.isWatching) return;
    const interval = intervalMs || this.watchdogIntervalMs;
    this.isWatching = true;
    this.watchdogTimer = setInterval(() => {
      this.runWatchdog().catch(() => {});
    }, interval);
    if (typeof this.watchdogTimer.unref === 'function') this.watchdogTimer.unref();
  }

  stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.isWatching = false;
  }

  /* ── SRE Telemetry & Operational Observability ── */
  async getStatus(options = {}) {
    const now = new Date().toISOString();
    const effectiveApp = options.app || this.app;

    // 1. Real service availability (via HealthRegistry or direct probes)
    let healthStatus = { ok: true, status: 'ready', checks: {} };
    const hReg = options.healthRegistry || this.healthRegistry || effectiveApp?.health;
    if (hReg && typeof hReg.check === 'function') {
      try {
        healthStatus = await hReg.check();
      } catch (e) {
        healthStatus = { ok: false, status: 'degraded', error: e.message, checks: {} };
      }
    }

    // 2. Real API latency & error rate from app.apiTraces
    const traces = Array.isArray(effectiveApp?.apiTraces) ? effectiveApp.apiTraces : (Array.isArray(options.apiTraces) ? options.apiTraces : []);
    let avgLatencyMs = null;
    let p50LatencyMs = null;
    let p95LatencyMs = null;
    let errorRatePct = 0;

    if (traces.length > 0) {
      const latencies = traces.map(t => Number(t.latencyMs) || 0).sort((a, b) => a - b);
      const sumLatency = latencies.reduce((acc, v) => acc + v, 0);
      avgLatencyMs = Math.round(sumLatency / latencies.length);
      p50LatencyMs = latencies[Math.floor(latencies.length * 0.50)] ?? avgLatencyMs;
      p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)] ?? latencies[latencies.length - 1];

      const errorCount = traces.filter(t => Number(t.status) >= 400).length;
      errorRatePct = Number(((errorCount / traces.length) * 100).toFixed(1));
    }

    // 3. Real Job Queue breakdown
    const qm = this.jobQueueManager || (this.app ? this.app.jobQueueManager : null);
    const jobs = qm?.jobs ? Array.from(qm.jobs.values()) : [];
    const jobStats = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'QUEUED' || j.status === 'WAITING').length,
      running: jobs.filter(j => j.status === 'RUNNING').length,
      completed: jobs.filter(j => j.status === 'COMPLETED' || j.status === 'SUCCEEDED').length,
      failed: jobs.filter(j => j.status === 'FAILED' || j.status === 'DEAD_LETTER').length,
      paused: jobs.filter(j => j.status === 'PAUSED').length,
      stalled: jobs.filter(j => j.status === 'RUNNING' && (Date.now() - Date.parse(j.startedAt || j.updatedAt || 0)) > this.jobTimeoutMs).length,
      averageDurationMs: null
    };

    const completedJobsWithDuration = jobs.filter(j => j.actualLatencyMs > 0);
    if (completedJobsWithDuration.length > 0) {
      const sumDur = completedJobsWithDuration.reduce((acc, j) => acc + j.actualLatencyMs, 0);
      jobStats.averageDurationMs = Math.round(sumDur / completedJobsWithDuration.length);
    }

    // 4. Real Agent Workforce status
    const registry = this.agentRegistry || (this.app ? this.app.agentRegistry : null);
    const agentList = registry && typeof registry.list === 'function' ? registry.list() : [];
    const agentStats = {
      total: agentList.length,
      available: agentList.filter(a => a.availability === 'AVAILABLE' || a.status === 'AVAILABLE').length,
      working: agentList.filter(a => a.availability === 'WORKING' || a.status === 'WORKING').length,
      reviewing: agentList.filter(a => a.availability === 'REVIEWING' || a.status === 'REVIEWING').length,
      blocked: agentList.filter(a => a.availability === 'BLOCKED' || a.status === 'BLOCKED').length,
      offline: agentList.filter(a => a.availability === 'OFFLINE' || a.status === 'OFFLINE').length
    };

    // 5. System Resource Usage
    const mem = process.memoryUsage();
    const systemResources = {
      processMemory: {
        rssMb: Number((mem.rss / (1024 * 1024)).toFixed(1)),
        heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(1)),
        heapTotalMb: Number((mem.heapTotal / (1024 * 1024)).toFixed(1))
      },
      osMemory: {
        totalMb: Number((os.totalmem() / (1024 * 1024)).toFixed(1)),
        freeMb: Number((os.freemem() / (1024 * 1024)).toFixed(1)),
        usedPct: Number((((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1))
      },
      cpu: {
        cpusCount: os.cpus().length,
        loadAvg: os.loadavg ? os.loadavg() : [0, 0, 0]
      },
      uptimeSeconds: Math.round(process.uptime())
    };

    // 6. Incident and Recovery stats
    const allIncidents = Array.from(this.incidents.values());
    const recoverySummary = {
      totalIncidents: allIncidents.length,
      activeIncidents: allIncidents.filter(i => i.state === INCIDENT_STATUSES.ACTIVE).length,
      recoveredIncidents: allIncidents.filter(i => i.state === INCIDENT_STATUSES.RECOVERED).length,
      escalatedIncidents: allIncidents.filter(i => i.state === INCIDENT_STATUSES.ESCALATED).length,
      recentIncidents: allIncidents.slice(-10).reverse()
    };

    // 7. Circuit Breakers Status
    const circuitBreakersObj = {};
    for (const [name, cb] of this.circuitBreakers.entries()) {
      circuitBreakersObj[name] = {
        name,
        state: cb.state,
        failures: cb.failures,
        trippedAt: cb.trippedAt,
        fallbackActive: cb.fallbackActive,
        fallbackReason: cb.fallbackReason
      };
    }

    return {
      status: healthStatus.ok ? 'HEALTHY' : 'DEGRADED',
      checkedAt: now,
      services: {
        backend: { status: 'ONLINE', latencyMs: avgLatencyMs },
        redis: { status: this.getCircuitBreaker('redis')?.state === 'OPEN' ? 'DEGRADED' : 'ONLINE' },
        bullmq: { status: qm?.bullQueue ? 'ONLINE' : 'DEGRADED' },
        postgres: { status: healthStatus.checks?.['state-store']?.ok ? 'ONLINE' : 'DEGRADED' },
        apiPlatform: { status: this.getCircuitBreaker('ai-platform')?.state === 'OPEN' ? 'DEGRADED' : 'ONLINE' },
        ollama: { status: this.getCircuitBreaker('ollama')?.state === 'OPEN' ? 'DEGRADED' : 'ONLINE' },
        sse: { status: this.sseMetrics.activeClients > 0 ? 'ONLINE' : 'IDLE', ...this.sseMetrics }
      },
      telemetry: {
        latency: {
          avgMs: avgLatencyMs,
          p50Ms: p50LatencyMs,
          p95Ms: p95LatencyMs,
          samplesCount: traces.length
        },
        errorRatePct,
        systemResources
      },
      jobs: jobStats,
      agents: agentStats,
      circuitBreakers: circuitBreakersObj,
      recoveries: recoverySummary
    };
  }
}

// Global Singleton Instance
let globalSelfHealingEngine = null;

function getSelfHealingEngine(options = {}) {
  if (!globalSelfHealingEngine) {
    globalSelfHealingEngine = new SelfHealingReliabilityEngine(options);
  }
  return globalSelfHealingEngine;
}

module.exports = {
  SelfHealingReliabilityEngine,
  getSelfHealingEngine,
  INCIDENT_STATUSES,
  SEVERITY_LEVELS
};
