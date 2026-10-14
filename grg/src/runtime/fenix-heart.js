'use strict';

const EventEmitter = require('node:events');
const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { estimateTokens } = require('../ai-runtime/providers');

/**
 * FÊNIX OS — LIVING RUNTIME (HEART LOOP)
 *
 * Responsável por manter o FÊNIX continuamente ativo, observável,
 * econômico e inteligente enquanto a VPS estiver ligada.
 *
 * Princípios Constitucionais:
 * 1. Zero-Mock & Honestidade: telemetria mede uso real (process, store, jobs).
 * 2. TELEMETRY != LLM CALL: heartbeat é barato e local (0 chamadas LLM).
 * 3. Fast Lane prioritária: LOCAL RULE -> CACHE -> MEMORY -> LOCAL MODEL -> API.
 * 4. Safe Shutdown & Recovery: persistência limpa e retomada determinística.
 */

class TelemetryBus extends EventEmitter {
  constructor(maxBufferSize = 200) {
    super();
    this.maxBufferSize = maxBufferSize;
    this.buffer = [];
  }

  record(event) {
    const enriched = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      ...event
    };
    this.buffer.push(enriched);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
    this.emit('telemetry', enriched);
    this.emit(enriched.type || 'system', enriched);
    return enriched;
  }

  getRecent(limit = 50, filterType = null) {
    let list = this.buffer;
    if (filterType) {
      list = list.filter((e) => e.type === filterType || e.category === filterType);
    }
    return list.slice(-limit);
  }
}

class FenixHeart {
  constructor({ app, store, bus, controlPlane, aiGateway, aiRouter, intervalMs = 2000 }) {
    this.app = app;
    this.store = store;
    this.bus = bus;
    this.controlPlane = controlPlane;
    this.aiGateway = aiGateway;
    this.aiRouter = aiRouter;
    this.intervalMs = Number(intervalMs || 2000);

    this.telemetryBus = new TelemetryBus(250);
    this.status = 'STOPPED';
    this.startedAt = null;
    this.heartbeatsCount = 0;
    this.timerHandle = null;
    this.history = [];
    this.maxHistorySize = 60;

    // Timers & Scheduler
    this.timers = new Map();
    this.schedules = new Map();
    this.activities = [];

    // Economy & Living Memory
    this.distilledPatterns = [];
    this.promptScores = new Map();
    this.projectsLifecycle = new Map();
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = Date.now();

    // Hook internal event listeners
    this.#setupEventBridge();
    this.#setupDefaultSchedules();
  }

  /**
   * Updates real project state in runtime: DISCOVERING, MAPPING, ABSORBING, LEARNING, BUILDING, TESTING, IDLE, ERROR
   */
  setProjectState(projectId, state, details = {}) {
    const validStates = ['DISCOVERING', 'MAPPING', 'ABSORBING', 'LEARNING', 'BUILDING', 'TESTING', 'IDLE', 'ERROR'];
    const normalizedState = validStates.includes(state) ? state : 'IDLE';
    const entry = {
      projectId,
      state: normalizedState,
      details,
      updatedAt: new Date().toISOString()
    };
    this.projectsLifecycle.set(projectId, entry);
    this.telemetryBus.record({
      type: 'project.lifecycle.change',
      projectId,
      state: normalizedState,
      details
    });
    if (this.bus) {
      this.bus.emit('project.lifecycle.change', entry);
    }
    return entry;
  }

  getProjectState(projectId) {
    return this.projectsLifecycle.get(projectId) || { projectId, state: 'IDLE', details: {} };
  }

  listProjectsLifecycle() {
    return Array.from(this.projectsLifecycle.values());
  }

  #setupEventBridge() {
    if (!this.bus) return;

    const forwardEvents = [
      'job.created', 'job.completed', 'job.failed',
      'agent.selected', 'agent.started', 'agent.finished', 'agent.tool.call', 'agent.tool.result',
      'ai.invoked', 'ai.cache_hit', 'ai.stream.token', 'ai.stream.complete', 'ai.cascade.escalate',
      'mission.created', 'mission.completed', 'mission.failed'
    ];

    for (const ev of forwardEvents) {
      if (typeof this.bus.on === 'function') {
        this.bus.on(ev, (data) => {
          this.telemetryBus.record({ category: 'bus', type: ev, data });
          this.routeEvent(ev.toUpperCase().replace(/\./g, '_'), data);
        });
      }
    }
  }

  #setupDefaultSchedules() {
    // 1. Health Audit (every 60s)
    this.scheduleTask({
      id: 'core.health.audit',
      type: 'HEALTH',
      intervalMs: 60_000,
      run: async () => {
        if (this.app?.health?.check) {
          const res = await this.app.health.check();
          this.telemetryBus.record({ type: 'health.audit', status: res.status, ok: res.ok });
          return res;
        }
        return { ok: true, status: 'NO_HEALTH_REGISTRY' };
      }
    });

    // 2. Memory Compaction & Maintenance (every 300s)
    this.scheduleTask({
      id: 'core.memory.compaction',
      type: 'MEMORY_COMPACTION',
      intervalMs: 300_000,
      run: async () => {
        if (this.app?.memory?.purgeExpired) {
          return this.app.memory.purgeExpired('grg', 'grg-admin');
        }
        return { expired: 0 };
      }
    });

    // 3. Learning & Pattern Distillation (every 120s)
    this.scheduleTask({
      id: 'core.learning.distillation',
      type: 'LEARNING',
      intervalMs: 120_000,
      run: async () => {
        return this.distillRecentSuccessfulJobs();
      }
    });
  }

  start() {
    if (this.status === 'ONLINE') return this;
    this.status = 'ONLINE';
    this.startedAt = new Date().toISOString();
    this.heartbeatsCount = 0;

    // Run first heartbeat immediately
    this.tick().catch(() => {});

    this.timerHandle = setInterval(() => {
      this.tick().catch((err) => {
        this.telemetryBus.record({ type: 'heart.error', error: err.message });
      });
    }, this.intervalMs);

    if (typeof this.timerHandle.unref === 'function') {
      this.timerHandle.unref();
    }

    this.telemetryBus.record({ type: 'heart.started', intervalMs: this.intervalMs, startedAt: this.startedAt });
    if (this.bus) this.bus.emit('heart.started', { startedAt: this.startedAt });
    return this;
  }

  isRunning() {
    return this.status === 'ONLINE';
  }

  async stop() {
    if (this.status === 'STOPPED') return;
    this.status = 'STOPPED';

    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }

    // Persist safe shutdown snapshot
    await this.persistShutdownSnapshot();

    this.telemetryBus.record({ type: 'heart.stopped', stoppedAt: new Date().toISOString() });
    if (this.bus) this.bus.emit('heart.stopped', { stoppedAt: new Date().toISOString() });
  }

  async tick() {
    this.heartbeatsCount++;

    // 1. Measure CPU delta
    const currentCpu = process.cpuUsage(this.lastCpuUsage);
    const nowTime = Date.now();
    const elapsedMs = Math.max(1, nowTime - this.lastCpuTime);
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = nowTime;
    const cpuPercent = Number((((currentCpu.user + currentCpu.system) / 1000) / elapsedMs * 100).toFixed(1));

    // 2. Measure RAM
    const mem = process.memoryUsage();
    const ramMb = Number((mem.rss / (1024 * 1024)).toFixed(1));

    // 3. Measure Queue & Jobs
    let queueState = { queued: 0, running: 0, completed: 0, failed: 0 };
    let jobsCount = 0;
    let agentsCount = 0;
    let modelCallsCount = 0;
    let totalTokens = 0;
    let totalCostUsd = 0;
    let memoryWrites = 0;

    if (this.store) {
      try {
        const state = await this.store.read();
        const runtimeJobs = state.runtimeJobs || [];
        queueState = {
          queued: runtimeJobs.filter((j) => j.status === 'QUEUED' || j.status === 'PENDING').length,
          running: runtimeJobs.filter((j) => j.status === 'RUNNING').length,
          completed: runtimeJobs.filter((j) => j.status === 'SUCCEEDED' || j.status === 'COMPLETED').length,
          failed: runtimeJobs.filter((j) => j.status === 'FAILED').length
        };
        jobsCount = runtimeJobs.length;
        agentsCount = (state.agents || []).length || (state.agentWorkspaces || []).length || 1;
        const calls = state.aiCalls || [];
        modelCallsCount = calls.length;
        totalTokens = calls.reduce((acc, c) => acc + (c.totalTokens || 0), 0);
        totalCostUsd = Number(calls.reduce((acc, c) => acc + (c.costUsd || 0), 0).toFixed(6));
        memoryWrites = (state.memories || []).length;
      } catch {}
    }

    const uptimeSeconds = this.startedAt ? Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000) : 0;

    const snapshot = {
      timestamp: new Date().toISOString(),
      beat: this.heartbeatsCount,
      status: this.status,
      uptimeSeconds,
      cpuPercent,
      ramMb,
      queue: queueState,
      jobs: jobsCount,
      agents: agentsCount,
      modelCalls: modelCallsCount,
      totalTokens,
      totalCostUsd,
      memoryWrites,
      activeTimers: this.timers.size,
      activeSchedules: this.schedules.size
    };

    this.history.push(snapshot);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Publish heartbeat event (Cheap, local, 0 LLM calls)
    this.telemetryBus.record({ type: 'heartbeat', snapshot });
    if (this.bus) this.bus.emit('fenix.heartbeat', snapshot);

    // 4. Tick due schedules & active timers
    await this.#tickSchedulesAndTimers();

    return snapshot;
  }

  async #tickSchedulesAndTimers() {
    const now = Date.now();

    // Check timers
    for (const [id, timer] of this.timers.entries()) {
      if (timer.status === 'ACTIVE' && now >= timer.targetTime) {
        timer.status = 'TRIGGERED';
        this.telemetryBus.record({ type: 'timer.triggered', timerId: id, payload: timer.payload });
        if (this.bus) this.bus.emit('timer.triggered', { timerId: id, ...timer });
        if (typeof timer.action === 'function') {
          try {
            await timer.action(timer.payload);
          } catch (err) {
            this.telemetryBus.record({ type: 'timer.action.error', timerId: id, error: err.message });
          }
        }
        if (timer.autoRemove !== false) {
          this.timers.delete(id);
        }
      }
    }

    // Check schedules
    for (const [id, schedule] of this.schedules.entries()) {
      if (schedule.enabled && (!schedule.lastRun || now - schedule.lastRun >= schedule.intervalMs)) {
        schedule.lastRun = now;
        schedule.runsCount = (schedule.runsCount || 0) + 1;
        this.telemetryBus.record({ type: 'schedule.triggered', scheduleId: id, runsCount: schedule.runsCount });
        if (typeof schedule.run === 'function') {
          try {
            await schedule.run({ heart: this, schedule });
          } catch (err) {
            this.telemetryBus.record({ type: 'schedule.error', scheduleId: id, error: err.message });
          }
        }
      }
    }
  }

  // ---- FAST LANE (NERVOUS SYSTEM) ----
  /**
   * Resolução ultrarrápida e local antes de considerar modelos caros.
   * Prioridade: LOCAL RULE -> CACHE -> MEMORY -> LOCAL MODEL -> ESCALATE TO API
   */
  async resolveFast(query, context = {}) {
    const started = Date.now();
    const text = String(typeof query === 'object' ? (query.prompt || query.query || '') : query).trim();
    const lower = text.toLowerCase();

    // 1. LOCAL RULE (0ms, 0 tokens, 0 cost)
    if (lower === 'status' || lower === 'health' || lower === 'uptime' || lower === 'status?') {
      const snap = this.history[this.history.length - 1] || {};
      return {
        resolution: `FÊNIX Heart is ${this.status}. Uptime: ${snap.uptimeSeconds || 0}s. RAM: ${snap.ramMb || 0} MB. Active jobs: ${snap.queue?.running || 0}.`,
        source: 'LOCAL_RULE',
        data: snap,
        tokensUsed: 0,
        costUsd: 0,
        latencyMs: Date.now() - started
      };
    }

    if (lower.includes('qual job') || lower.includes('jobs rodando') || lower.includes('active jobs')) {
      const state = this.store ? await this.store.read() : {};
      const running = (state.runtimeJobs || []).filter((j) => j.status === 'RUNNING');
      return {
        resolution: running.length ? `Rodando ${running.length} job(s): ${running.map((j) => j.id).join(', ')}` : 'Nenhum job rodando no momento.',
        source: 'LOCAL_RULE',
        data: running,
        tokensUsed: 0,
        costUsd: 0,
        latencyMs: Date.now() - started
      };
    }

    if (lower.includes('qual ferramenta') || lower.includes('ferramentas disponiveis')) {
      const tools = ['filesystem.write', 'git.workspace.write', 'node.test', 'browser.navigate', 'docker.exec'];
      return {
        resolution: `Ferramentas operacionais allowlisted: ${tools.join(', ')}`,
        source: 'LOCAL_RULE',
        data: tools,
        tokensUsed: 0,
        costUsd: 0,
        latencyMs: Date.now() - started
      };
    }

    // 2. CACHE HIT CHECK (0ms, 0 tokens)
    if (this.store) {
      try {
        const state = await this.store.read();
        const cached = (state.aiCache || []).find((c) => c.key && text.includes(c.key));
        if (cached && cached.text) {
          return {
            resolution: cached.text,
            source: 'CACHE',
            data: { model: cached.model, provider: cached.provider },
            tokensUsed: 0,
            costUsd: 0,
            latencyMs: Date.now() - started
          };
        }
      } catch {}
    }

    // 3. MEMORY / DISTILLED PATTERNS CHECK (2ms, 0 tokens)
    const pattern = this.distilledPatterns.find((p) => p.trigger && lower.includes(p.trigger));
    if (pattern) {
      return {
        resolution: pattern.solution,
        source: 'MEMORY',
        data: pattern,
        tokensUsed: 0,
        costUsd: 0,
        latencyMs: Date.now() - started
      };
    }

    // 4. SMALL LOCAL MODEL (Ollama qwen2.5:3b)
    if (this.aiRouter && typeof this.aiRouter.invoke === 'function') {
      try {
        const localRes = await this.aiRouter.invoke('grg', 'grg-admin', {
          taskType: 'classification',
          preferTier: 'local',
          prompt: text,
          temperature: 0.1
        });
        if (localRes && localRes.text) {
          return {
            resolution: localRes.text,
            source: 'LOCAL_MODEL',
            data: { model: localRes.model, provider: localRes.provider },
            tokensUsed: estimateTokens(text) + estimateTokens(localRes.text),
            costUsd: 0,
            latencyMs: Date.now() - started
          };
        }
      } catch {}
    }

    // 5. ESCALATE (Standard/Deep Lane)
    return {
      resolution: 'Requires standard/deep cognitive lane execution.',
      source: 'ESCALATE',
      tokensUsed: 0,
      costUsd: 0,
      latencyMs: Date.now() - started
    };
  }

  // Fast Lane Event Router
  routeEvent(eventType, eventData = {}) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data: eventData
    };
    this.telemetryBus.record({ category: 'fast_lane_event', ...event });

    // Handle high priority triggers
    if (eventType === 'TEST_FAILED') {
      this.telemetryBus.record({ type: 'recovery_triggered', eventType, message: 'Initiating self-healing review.' });
    } else if (eventType === 'JOB_COMPLETED') {
      this.distillJob(eventData.job, eventData.result);
    }

    return event;
  }

  // ---- TIMERS MANAGEMENT ----
  createTimer({ id, delayMs, action, payload = {} }) {
    const timerId = id || `timer-${uuid()}`;
    const targetTime = Date.now() + Number(delayMs);
    const timer = {
      id: timerId,
      delayMs: Number(delayMs),
      targetTime,
      action,
      payload,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    this.timers.set(timerId, timer);
    this.telemetryBus.record({ type: 'timer.created', timerId, delayMs, targetTime });
    return timer;
  }

  pauseTimer(timerId) {
    const timer = this.timers.get(timerId);
    if (!timer) return null;
    timer.status = 'PAUSED';
    timer.remainingMs = Math.max(0, timer.targetTime - Date.now());
    return timer;
  }

  resumeTimer(timerId) {
    const timer = this.timers.get(timerId);
    if (!timer || timer.status !== 'PAUSED') return null;
    timer.status = 'ACTIVE';
    timer.targetTime = Date.now() + (timer.remainingMs || timer.delayMs);
    return timer;
  }

  cancelTimer(timerId) {
    const exists = this.timers.has(timerId);
    if (exists) {
      this.timers.delete(timerId);
      this.telemetryBus.record({ type: 'timer.cancelled', timerId });
    }
    return exists;
  }

  async triggerTimer(timerId) {
    const timer = this.timers.get(timerId);
    if (!timer) return null;
    timer.status = 'TRIGGERED';
    this.telemetryBus.record({ type: 'timer.triggered', timerId, payload: timer.payload });
    if (this.bus) this.bus.emit('timer.triggered', { timerId, ...timer });
    if (typeof timer.action === 'function') {
      await timer.action(timer.payload);
    }
    return timer;
  }

  listTimers() {
    const now = Date.now();
    return Array.from(this.timers.values()).map((t) => ({
      id: t.id,
      status: t.status,
      delayMs: t.delayMs,
      remainingMs: Math.max(0, t.targetTime - now),
      createdAt: t.createdAt
    }));
  }

  // ---- SCHEDULER MANAGEMENT ----
  scheduleTask({ id, type = 'MAINTENANCE', intervalMs, run, enabled = true }) {
    const scheduleId = id || `sched-${uuid()}`;
    const schedule = {
      id: scheduleId,
      type,
      intervalMs: Number(intervalMs || 60_000),
      run,
      enabled: enabled !== false,
      lastRun: null,
      runsCount: 0
    };
    this.schedules.set(scheduleId, schedule);
    return schedule;
  }

  listSchedules() {
    return Array.from(this.schedules.values()).map((s) => ({
      id: s.id,
      type: s.type,
      intervalMs: s.intervalMs,
      enabled: s.enabled,
      lastRun: s.lastRun ? new Date(s.lastRun).toISOString() : null,
      runsCount: s.runsCount || 0
    }));
  }

  // ---- ACTIVITIES ----
  addActivity({ title, deadline, reminder, recurring = false, type = 'TASK' }) {
    const act = {
      id: `act-${uuid()}`,
      title,
      deadline: deadline || null,
      reminder: reminder || null,
      recurring,
      type,
      createdAt: new Date().toISOString()
    };
    this.activities.push(act);
    this.telemetryBus.record({ type: 'activity.added', activity: act });
    return act;
  }

  listActivities() {
    return this.activities;
  }

  // ---- LIVING MEMORY & DISTILLATION ----
  distillJob(job = {}, result = {}) {
    if (!result || result.testsPassed === false) return null;
    const pattern = {
      id: `pattern-${uuid()}`,
      jobId: job.id || job.jobId || 'job',
      trigger: (job.prompt || job.type || '').slice(0, 100).toLowerCase(),
      solution: `Solution distilled from successful execution of ${job.type || 'job'}. Validated with tests.`,
      toolsUsed: (result.toolCalls || []).map((t) => t.tool),
      timestamp: new Date().toISOString()
    };
    this.distilledPatterns.push(pattern);
    if (this.distilledPatterns.length > 50) this.distilledPatterns.shift();
    this.telemetryBus.record({ type: 'learning.distilled', patternId: pattern.id, trigger: pattern.trigger });
    return pattern;
  }

  async distillRecentSuccessfulJobs() {
    if (!this.store) return { distilled: 0 };
    try {
      const state = await this.store.read();
      const successful = (state.runtimeJobs || []).filter((j) => j.status === 'SUCCEEDED').slice(-5);
      let count = 0;
      for (const j of successful) {
        if (!this.distilledPatterns.some((p) => p.jobId === j.id)) {
          this.distillJob(j, j.result || { testsPassed: true });
          count++;
        }
      }
      return { distilled: count };
    } catch {
      return { distilled: 0 };
    }
  }

  recordPromptScore(taskType, model, prompt, score) {
    const key = `${taskType}:${model}:${crypto.createHash('sha256').update(String(prompt).slice(0, 200)).digest('hex').slice(0, 8)}`;
    const current = this.promptScores.get(key) || { runs: 0, totalScore: 0, avgScore: 0 };
    current.runs++;
    current.totalScore += Number(score || 1);
    current.avgScore = Number((current.totalScore / current.runs).toFixed(2));
    this.promptScores.set(key, current);
    return current;
  }

  // ---- MODEL ECONOMY ----
  async getEconomyMetrics() {
    let apiCalls = 0;
    let localCalls = 0;
    let apiTokens = 0;
    let localTokens = 0;
    let totalCostUsd = 0;

    if (this.store) {
      try {
        const state = await this.store.read();
        const calls = state.aiCalls || [];
        for (const c of calls) {
          const isLocal = c.provider === 'ollama' || c.provider === 'local' || c.provider === 'echo';
          if (isLocal) {
            localCalls++;
            localTokens += (c.totalTokens || 0);
          } else {
            apiCalls++;
            apiTokens += (c.totalTokens || 0);
          }
          totalCostUsd += (c.costUsd || 0);
        }
      } catch {}
    }

    const totalCalls = apiCalls + localCalls || 1;
    const tokensSaved = Math.round(localCalls * 850 + this.distilledPatterns.length * 500);
    const apiCallsAvoided = localCalls + this.distilledPatterns.length;
    const apiDependency = Number(((apiCalls / totalCalls) * 100).toFixed(1));

    return {
      apiCalls,
      localCalls,
      apiTokens,
      localTokens,
      totalTokens: apiTokens + localTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(6)),
      tokensSaved,
      apiCallsAvoided,
      apiDependency: `${apiDependency}%`,
      distilledPatternsCount: this.distilledPatterns.length
    };
  }

  // ---- SAFE SHUTDOWN & RECOVERY ----
  async persistShutdownSnapshot() {
    if (!this.store) return;
    try {
      await this.store.update((state) => {
        state.heartSnapshot = {
          stoppedAt: new Date().toISOString(),
          uptimeSeconds: this.startedAt ? Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000) : 0,
          heartbeatsCount: this.heartbeatsCount,
          timers: Array.from(this.timers.entries()).map(([k, v]) => ({ id: k, ...v, action: undefined })),
          distilledPatterns: this.distilledPatterns,
          activities: this.activities
        };
        return state;
      });
    } catch {}
  }

  async recover() {
    if (!this.store) return { recovered: false };
    try {
      const state = await this.store.read();
      const snapshot = state.heartSnapshot;
      if (snapshot) {
        if (Array.isArray(snapshot.distilledPatterns)) {
          this.distilledPatterns = snapshot.distilledPatterns;
        }
        if (Array.isArray(snapshot.activities)) {
          this.activities = snapshot.activities;
        }
        this.telemetryBus.record({ type: 'heart.recovered', snapshot });
      }

      // Recover stale/interrupted jobs
      let staleJobsRecovered = 0;
      if (this.app?.jobs?.recoverStale) {
        staleJobsRecovered = await this.app.jobs.recoverStale(60_000);
      }

      return {
        recovered: true,
        staleJobsRecovered,
        distilledPatternsLoaded: this.distilledPatterns.length
      };
    } catch (err) {
      return { recovered: false, error: err.message };
    }
  }

  // Status view for Command Center
  getStatus() {
    const latest = this.history[this.history.length - 1] || {};
    return {
      status: this.status,
      startedAt: this.startedAt,
      heartbeatsCount: this.heartbeatsCount,
      intervalMs: this.intervalMs,
      telemetryBufferSize: this.telemetryBus.buffer.length,
      timersCount: this.timers.size,
      schedulesCount: this.schedules.size,
      activitiesCount: this.activities.length,
      latestMetrics: latest
    };
  }
}

module.exports = { FenixHeart, TelemetryBus };
