'use strict';
/**
 * FÊNIX OS — Process Supervisor & Self-Healing Watchdog
 * ====================================================
 * Processo dedicado sob PM2 (#19) para monitoramento de integridade,
 * detecção de travamento (hang/leak) e recuperação de falhas com Circuit Breaker
 * anti-loop de reinicialização.
 *
 * Serviços Monitorados:
 * - PM2 #16: fenix-backend (:4410)
 * - PM2 #17: fenix-frontend (:3000)
 * - PM2 #18: fenix-evolution-worker (:4420)
 *
 * Invariante de Segurança:
 * - Anti-Reboot Loop Circuit Breaker: máximo de 5 restarts em 120s por serviço.
 * - Ao exceder, entra em QUARANTINED por 5 minutos, impedindo tempestades de CPU.
 */

const http = require('http');
const { exec } = require('child_process');
const { EventEmitter } = require('events');

const DEFAULT_SUPERVISOR_PORT = Number(process.env.FENIX_SUPERVISOR_PORT || 4430);
const DEFAULT_POLL_INTERVAL_MS = Number(process.env.FENIX_SUPERVISOR_POLL_INTERVAL_MS || 15_000);
const DEFAULT_STARTUP_GRACE_MS = 120_000;
const MAX_RESTARTS_IN_WINDOW = 5;
const RESTART_WINDOW_MS = 120_000;
const QUARANTINE_DURATION_MS = 300_000;

class FenixSupervisor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || DEFAULT_SUPERVISOR_PORT;
    this.pollIntervalMs = options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
    this.logger = options.logger || console;
    const configuredGrace = options.startupGraceMs ?? process.env.FENIX_SUPERVISOR_STARTUP_GRACE_MS;
    const startupGraceMs = configuredGrace === undefined ? DEFAULT_STARTUP_GRACE_MS : Number(configuredGrace);
    this.startupGraceMs = Number.isFinite(startupGraceMs) ? Math.max(0, startupGraceMs) : DEFAULT_STARTUP_GRACE_MS;

    // Definição dos alvos monitorados
    this.targets = [
      {
        id: 'fenix-backend',
        pm2Name: 'fenix-backend',
        url: process.env.FENIX_BACKEND_HEALTH_URL || 'http://127.0.0.1:4410/health',
        enabled: true
      },
      {
        id: 'fenix-evolution-worker',
        pm2Name: 'fenix-evolution-worker',
        url: process.env.FENIX_WORKER_HEALTH_URL || 'http://127.0.0.1:4420/health',
        enabled: true
      },
      {
        id: 'fenix-frontend',
        pm2Name: 'fenix-frontend',
        url: process.env.FENIX_FRONTEND_HEALTH_URL || 'http://127.0.0.1:3000/',
        enabled: true
      }
    ];

    // Estado operacional dos alvos
    this.states = new Map();
    for (const target of this.targets) {
      this.states.set(target.id, {
        id: target.id,
        pm2Name: target.pm2Name,
        url: target.url,
        status: 'UNKNOWN', // HEALTHY, DEGRADED, UNRESPONSIVE, QUARANTINED
        consecutiveFailures: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastLatencyMs: null,
        restartHistory: [],
        quarantinedUntil: null,
        firstFailureAt: null,
        recoveryGraceUntil: null,
        lastDetails: null
      });
    }

    this.server = null;
    this._timer = null;
    this._running = false;
  }

  async _pingUrl(urlStr, timeoutMs = 5000) {
    return new Promise((resolve) => {
      const started = Date.now();
      let finished = false;

      const req = http.get(urlStr, { timeout: timeoutMs }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (finished) return;
          finished = true;
          const latencyMs = Date.now() - started;
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, statusCode: res.statusCode, data: parsed, latencyMs });
          } catch {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, statusCode: res.statusCode, rawBody: body, latencyMs });
          }
        });
      });

      req.on('timeout', () => {
        if (finished) return;
        finished = true;
        req.destroy();
        resolve({ ok: false, error: 'TIMEOUT', latencyMs: timeoutMs });
      });

      req.on('error', (err) => {
        if (finished) return;
        finished = true;
        resolve({ ok: false, error: err.message, latencyMs: Date.now() - started });
      });
    });
  }

  /**
   * Executa a checagem de saúde de um serviço.
   */
  async checkTarget(target) {
    const state = this.states.get(target.id);
    const now = Date.now();

    // Se estiver em quarentena, verificar se expirou
    if (state.status === 'QUARANTINED') {
      if (state.quarantinedUntil && now < state.quarantinedUntil) {
        return state;
      }
      this.logger.info?.(`[FenixSupervisor] Período de quarentena expirado para ${target.id}. Retomando monitoramento.`);
      state.status = 'UNKNOWN';
      state.quarantinedUntil = null;
    }

    const ping = await this._pingUrl(target.url);

    if (ping.ok) {
      state.status = 'HEALTHY';
      state.consecutiveFailures = 0;
      state.firstFailureAt = null;
      state.recoveryGraceUntil = null;
      state.lastSuccessAt = new Date().toISOString();
      state.lastLatencyMs = ping.latencyMs;
      state.lastDetails = ping.data || null;
    } else {
      state.consecutiveFailures++;
      state.lastFailureAt = new Date().toISOString();
      state.lastDetails = { error: ping.error || `HTTP ${ping.statusCode}` };

      if (!state.firstFailureAt) state.firstFailureAt = now;
      const inStartupGrace = !state.lastSuccessAt
        && now - state.firstFailureAt < this.startupGraceMs;
      const inRecoveryGrace = state.recoveryGraceUntil && now < state.recoveryGraceUntil;
      if (inStartupGrace || inRecoveryGrace) {
        state.status = 'STARTING';
        return state;
      }

      state.status = 'UNRESPONSIVE';

      this.logger.warn?.(`[FenixSupervisor] Falha de saúde em ${target.id} (${state.consecutiveFailures}x): ${ping.error || ping.statusCode}`);

      // Se falhou 2 vezes consecutivas, acionar tentativa de recuperação
      if (state.consecutiveFailures >= 2) {
        await this._handleServiceFailure(target, state);
      }
    }

    return state;
  }

  async _handleServiceFailure(target, state) {
    const now = Date.now();

    // 1. Filtrar histórico de reinicializações na janela
    state.restartHistory = state.restartHistory.filter(t => (now - t) < RESTART_WINDOW_MS);

    // 2. Checar Circuit Breaker
    if (state.restartHistory.length >= MAX_RESTARTS_IN_WINDOW) {
      state.status = 'QUARANTINED';
      state.quarantinedUntil = now + QUARANTINE_DURATION_MS;
      this.logger.error?.(`[FenixSupervisor] 🚨 CIRCUIT BREAKER TRIP: ${target.id} reiniciou ${state.restartHistory.length}x em ${RESTART_WINDOW_MS/1000}s. Quarentena de ${QUARANTINE_DURATION_MS/60000}min acionada.`);
      this.emit('circuit_breaker:trip', { targetId: target.id, history: state.restartHistory });
      return;
    }

    // 3. Executar reinicialização via PM2
    state.restartHistory.push(now);
    state.status = 'STARTING';
    state.consecutiveFailures = 0;
    state.recoveryGraceUntil = now + this.startupGraceMs;
    this.logger.info?.(`[FenixSupervisor] Tentativa de autorrecuperação: reiniciando PM2 serviço '${target.pm2Name}' (reinício ${state.restartHistory.length}/${MAX_RESTARTS_IN_WINDOW})...`);

    try {
      await this._restartPm2Service(target.pm2Name);
      this.emit('service:restarted', { targetId: target.id, pm2Name: target.pm2Name });
    } catch (err) {
      this.logger.error?.(`[FenixSupervisor] Falha ao executar comando de restart para ${target.pm2Name}:`, err.message);
    }
  }

  _restartPm2Service(pm2Name) {
    return new Promise((resolve, reject) => {
      exec(`pm2 restart ${pm2Name}`, (err, stdout, stderr) => {
        if (err) {
          // Se PM2 não estiver disponível no PATH, apenas registra aviso
          return resolve({ success: false, error: err.message });
        }
        resolve({ success: true, stdout });
      });
    });
  }

  async pollAll() {
    for (const target of this.targets) {
      if (target.enabled) {
        await this.checkTarget(target);
      }
    }
  }

  startHttpServer() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this._handleRequest(req, res));
      this.server.on('error', (err) => {
        this.logger.error?.('[FenixSupervisor] Erro no servidor HTTP:', err.message);
        reject(err);
      });
      this.server.listen(this.port, '0.0.0.0', () => {
        this.logger.info?.(`[FenixSupervisor] Servidor HTTP ativo na porta ${this.port}`);
        resolve();
      });
    });
  }

  _sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'X-Fenix-Supervisor-Version': '1.0.0',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data, null, 2));
  }

  async _handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const method = req.method.toUpperCase();

    try {
      if (method === 'GET' && url.pathname === '/health') {
        const statuses = Array.from(this.states.values());
        const allHealthy = statuses.every(s => s.status === 'HEALTHY' || s.status === 'UNKNOWN');
        return this._sendJson(res, 200, {
          status: allHealthy ? 'HEALTHY' : 'DEGRADED',
          supervisor: 'fenix-supervisor',
          pid: process.pid,
          uptimeSec: Math.round(process.uptime()),
          targets: statuses.map(s => ({ id: s.id, status: s.status, latencyMs: s.lastLatencyMs }))
        });
      }

      if (method === 'GET' && url.pathname === '/status') {
        return this._sendJson(res, 200, {
          supervisor: 'fenix-supervisor',
          pid: process.pid,
          uptimeSec: Math.round(process.uptime()),
          states: Array.from(this.states.values())
        });
      }

      if (method === 'POST' && url.pathname.startsWith('/restart/')) {
        const targetId = url.pathname.replace('/restart/', '');
        const target = this.targets.find(t => t.id === targetId || t.pm2Name === targetId);
        if (!target) {
          return this._sendJson(res, 404, { error: `Serviço ${targetId} não cadastrado no supervisor` });
        }
        const restartRes = await this._restartPm2Service(target.pm2Name);
        return this._sendJson(res, 200, { targetId, restarted: true, details: restartRes });
      }

      this._sendJson(res, 404, { error: 'Endpoint não encontrado no Supervisor' });
    } catch (err) {
      this._sendJson(res, 500, { error: err.message });
    }
  }

  async start() {
    this._running = true;
    await this.startHttpServer();
    this.logger.info?.('[FenixSupervisor] Supervisor iniciado. Executando primeira varredura...');

    // Polling imediato e agendamento periódico
    this.pollAll().catch?.(() => {});
    this._timer = setInterval(() => this.pollAll(), this.pollIntervalMs);
    if (typeof this._timer.unref === 'function') this._timer.unref();

    return this;
  }

  async stop() {
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this.server) {
      await new Promise(r => this.server.close(r));
      this.server = null;
    }
    this.logger.info?.('[FenixSupervisor] Supervisor finalizado.');
  }
}

// ─── EXECUÇÃO STANDALONE VIA PM2 / CLI ───────────────────────────────────────
if (require.main === module) {
  const supervisor = new FenixSupervisor();

  const shutdown = async (signal) => {
    console.log(`\n[FenixSupervisor] Recebido sinal ${signal}. Encerrando...`);
    await supervisor.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  supervisor.start().catch((err) => {
    console.error('[FenixSupervisor] Falha fatal no boot:', err);
    process.exit(1);
  });
}

module.exports = {
  FenixSupervisor,
  DEFAULT_SUPERVISOR_PORT
};
