const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');

/**
 * IntelligentScheduler v2.0
 * Suporta agendamento de Jobs estilo Cron, heartbeats e gestão de Fila com prioridade.
 * Interage com o MissionEngine para enfileirar tarefas assíncronas.
 */
class IntelligentScheduler extends SystemModule {
  constructor(missionEngine, eventBus) {
    super('scheduler', '2.0.0');
    this.missionEngine = missionEngine;
    this.eventBus = eventBus;
    this.jobs = new Map(); // id -> Job
    this.status = STATE_MACHINE.BOOT;
    this.tickInterval = null;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[Scheduler] Iniciando o motor temporal...');
    
    // O coração do Scheduler bate a cada segundo
    this.tickInterval = setInterval(() => this._tick(), 1000);
    if (this.tickInterval.unref) this.tickInterval.unref();

    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Registra um Job Cron
   */
  scheduleJob(id, cronExpression, taskFn) {
    // Na V2 real, usariamos 'cron-parser' ou 'node-cron' para validar a expressão.
    // Aqui usaremos um simplificador onde cronExpression em milisegundos roda em loop.
    this.jobs.set(id, {
      id,
      cronExpression,
      taskFn,
      lastRun: 0,
      intervalMs: typeof cronExpression === 'number' ? cronExpression : 60000,
      failures: 0
    });
    console.log(`[Scheduler] Job agendado: ${id}`);
  }

  /**
   * Heartbeat do sistema temporal.
   */
  async _tick() {
    if (this.status !== STATE_MACHINE.ONLINE) return;

    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (now - job.lastRun >= job.intervalMs) {
        job.lastRun = now;
        this._executeJob(job).catch(err => {
          console.error(`[Scheduler] Falha isolada no Job ${id}:`, err.message);
        });
      }
    }
  }

  async _executeJob(job) {
    try {
      await job.taskFn();
      job.failures = 0; // Reset
    } catch (err) {
      job.failures++;
      this.eventBus?.publish('scheduler.job.failed', { jobId: job.id, failures: job.failures, error: err.message }, 1 /* HIGH */);
      
      // Retry logic simples
      if (job.failures < 3) {
        console.warn(`[Scheduler] Job ${job.id} falhou. Agendando retry imediato...`);
        setTimeout(() => this._executeJob(job), 5000); // Retry em 5s
      } else {
        console.error(`[Scheduler] Job ${job.id} esgotou retries.`);
      }
    }
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        activeJobs: this.jobs.size
      }
    };
  }
}

module.exports = { IntelligentScheduler };
