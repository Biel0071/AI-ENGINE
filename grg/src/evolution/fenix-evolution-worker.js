'use strict';
/**
 * FÊNIX OS — Dedicated Evolution Worker
 * =====================================
 * Processo dedicado para o ciclo autônomo 24/7 sob PM2 (#18).
 * Desacopla 100% o loop de evolução contínua do backend HTTP principal (:4410).
 *
 * Características:
 * - Porta HTTP nativa :4420 para telemetria, health checks e IPC com supervisor.
 * - Startup Recovery: detecta e repara sessões interrompidas em crashes anteriores.
 * - Concorrência estrita = 1 mission.
 * - Zero Mocks: métricas e telemetria factuais.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { PersistentEvolutionQueue } = require('./persistent-evolution-queue');
const { EvolutionScheduler } = require('./evolution-scheduler');
const { ResourceGovernor } = require('../ops/resource-governor');
const { EvolutionSnapshot } = require('./evolution-snapshot');
const { SandboxRunner } = require('./sandbox-runner');

const DEFAULT_PORT = Number(process.env.FENIX_EVOLUTION_WORKER_PORT || 4420);

class FenixEvolutionWorker {
  constructor(options = {}) {
    this.port = options.port || DEFAULT_PORT;
    this.logger = options.logger || console;

    this.queue = options.queue || new PersistentEvolutionQueue({ logger: this.logger });
    this.governor = options.governor || new ResourceGovernor({ logger: this.logger });
    this.snapshot = options.snapshot || new EvolutionSnapshot({ logger: this.logger });
    this.sandbox = options.sandbox || new SandboxRunner({ logger: this.logger });

    this.scheduler = new EvolutionScheduler({
      queue: this.queue,
      governor: this.governor,
      snapshot: this.snapshot,
      sandbox: this.sandbox,
      intervalMs: options.intervalMs || Number(process.env.FENIX_SCHEDULER_INTERVAL_MS || 30_000),
      logger: this.logger
    });

    this.server = null;
    this._isShuttingDown = false;
  }

  async init() {
    this.logger.info?.('[FenixEvolutionWorker] Inicializando módulos do worker...');
    await this.queue.init();
    await this._recoverInterruptedSessions();
  }

  async _recoverInterruptedSessions() {
    try {
      const inProgressItems = this.queue.list({ status: 'IN_PROGRESS' });
      if (inProgressItems.length > 0) {
        this.logger.warn?.(`[FenixEvolutionWorker] Detectados ${inProgressItems.length} itens interrompidos em crash anterior.`);
        for (const item of inProgressItems) {
          this.logger.info?.(`[FenixEvolutionWorker] Revertendo item pendente ${item.id} para QUEUED.`);
          await this.queue.updateState(item.id, 'QUEUED', {
            error: 'Recovered from unexpected worker restart/crash'
          });
        }
      }
    } catch (err) {
      this.logger.warn?.('[FenixEvolutionWorker] Falha ao recuperar sessões:', err.message);
    }
  }

  startHttpServer() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this._handleRequest(req, res));
      this.server.on('error', (err) => {
        this.logger.error?.('[FenixEvolutionWorker] Erro no servidor HTTP:', err.message);
        reject(err);
      });
      this.server.listen(this.port, '0.0.0.0', () => {
        this.logger.info?.(`[FenixEvolutionWorker] Servidor HTTP de telemetria ativo na porta ${this.port}`);
        resolve();
      });
    });
  }

  async _readBody(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  _sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'X-Fenix-Worker-Version': '1.0.0',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data, null, 2));
  }

  async _handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const method = req.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    try {
      // 1. Health Endpoint
      if (method === 'GET' && url.pathname === '/health') {
        const status = this.governor.isThrottled() ? 'DEGRADED' : 'HEALTHY';
        return this._sendJson(res, 200, {
          status,
          worker: 'fenix-evolution-worker',
          pid: process.pid,
          uptimeSec: Math.round(process.uptime()),
          schedulerState: this.scheduler.state,
          activeSession: Boolean(this.scheduler.activeSession),
          memory: process.memoryUsage(),
          queueTotal: this.queue.getSnapshot().total
        });
      }

      // 2. Status Endpoint
      if (method === 'GET' && url.pathname === '/status') {
        return this._sendJson(res, 200, {
          worker: 'fenix-evolution-worker',
          pid: process.pid,
          uptimeSec: Math.round(process.uptime()),
          scheduler: this.scheduler.getStatus()
        });
      }

      // 3. Queue List Endpoint
      if (method === 'GET' && url.pathname === '/queue') {
        const filterStatus = url.searchParams.get('status') || undefined;
        return this._sendJson(res, 200, {
          snapshot: this.queue.getSnapshot(),
          filtered: filterStatus ? this.queue.list({ status: filterStatus }) : undefined
        });
      }

      // 4. Enqueue Proposal Endpoint
      if (method === 'POST' && url.pathname === '/queue/enqueue') {
        const body = await this._readBody(req);
        const result = await this.queue.enqueue(body);
        return this._sendJson(res, 201, result);
      }

      // 5. Trigger Single Tick
      if (method === 'POST' && url.pathname === '/tick') {
        const tickResult = await this.scheduler.tick();
        return this._sendJson(res, 200, tickResult);
      }

      // 6. Pause Session Endpoint
      if (method === 'POST' && url.pathname === '/session/pause') {
        if (!this.scheduler.activeSession) {
          return this._sendJson(res, 400, { error: 'Nenhuma sessão ativa para pausar' });
        }
        const body = await this._readBody(req);
        this.scheduler.activeSession.pause(body.reason || 'Manual pause via HTTP');
        return this._sendJson(res, 200, { paused: true, session: this.scheduler.activeSession.toSnapshot() });
      }

      // 7. Resume Session Endpoint
      if (method === 'POST' && url.pathname === '/session/resume') {
        if (!this.scheduler.activeSession) {
          return this._sendJson(res, 400, { error: 'Nenhuma sessão ativa para retomar' });
        }
        this.scheduler.activeSession.resume();
        return this._sendJson(res, 200, { resumed: true, session: this.scheduler.activeSession.toSnapshot() });
      }

      // 8. Abort Session Endpoint
      if (method === 'POST' && url.pathname === '/session/abort') {
        if (!this.scheduler.activeSession) {
          return this._sendJson(res, 400, { error: 'Nenhuma sessão ativa para abortar' });
        }
        const body = await this._readBody(req);
        this.scheduler.activeSession.abort(body.reason || 'Manual abort via HTTP');
        return this._sendJson(res, 200, { aborted: true, session: this.scheduler.activeSession.toSnapshot() });
      }

      this._sendJson(res, 404, { error: 'Endpoint não encontrado no Evolution Worker' });
    } catch (err) {
      this.logger.error?.('[FenixEvolutionWorker] Erro ao processar requisição:', err);
      this._sendJson(res, 500, { error: err.message });
    }
  }

  async start() {
    await this.init();
    await this.startHttpServer();
    this.scheduler.start();
    this.logger.info?.('[FenixEvolutionWorker] Worker totalmente operacional.');
    return this;
  }

  async stop() {
    if (this._isShuttingDown) return;
    this._isShuttingDown = true;
    this.logger.info?.('[FenixEvolutionWorker] Encerrando worker de forma graciosa...');

    this.scheduler.stop();

    if (this.scheduler.activeSession && this.scheduler.activeSession.status !== 'COMPLETED') {
      try {
        this.scheduler.activeSession.pause('Worker process shutting down');
        this.logger.info?.('[FenixEvolutionWorker] Sessão ativa pausada e persistida.');
      } catch {
        // Ignorar
      }
    }

    if (this.server) {
      await new Promise(r => this.server.close(r));
      this.server = null;
    }

    this.logger.info?.('[FenixEvolutionWorker] Worker finalizado com sucesso.');
  }
}

// ─── EXECUÇÃO STANDALONE VIA PM2 / CLI ───────────────────────────────────────
if (require.main === module) {
  const worker = new FenixEvolutionWorker();

  const shutdown = async (signal) => {
    console.log(`\n[FenixEvolutionWorker] Recebido sinal ${signal}. Encerrando...`);
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  worker.start().catch((err) => {
    console.error('[FenixEvolutionWorker] Falha fatal no boot:', err);
    process.exit(1);
  });
}

module.exports = {
  FenixEvolutionWorker,
  DEFAULT_PORT
};
