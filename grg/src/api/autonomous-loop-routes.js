'use strict';
/**
 * FÊNIX OS — Autonomous Loop Routes
 * Expõe controle, status, heartbeat, dashboard, memórias e fila de missões via REST.
 *
 * Suporte Híbrido:
 * 1. Em processo: consome autonomousLoop interno se presente.
 * 2. Desacoplado: faz forward automático para PM2 #18 (fenix-evolution-worker :4420).
 *
 * Endpoints:
 *   GET  /api/v2/autonomous/status    — estado atual do loop e scores
 *   GET  /api/v2/autonomous/heartbeat — heartbeat estruturado (Section 17)
 *   GET  /api/v2/autonomous/dashboard — telemetria completa para a UI Fênix Evolution
 *   GET  /api/v2/autonomous/memories  — histórico de memórias e aprendizados
 *   GET  /api/v2/autonomous/queue     — fila de missões autônomas (P0-P7)
 *   POST /api/v2/autonomous/mission   — enfileira uma nova missão com problemHash
 *   POST /api/v2/autonomous/start     — inicia o loop contínuo
 *   POST /api/v2/autonomous/stop      — para o loop
 *   POST /api/v2/autonomous/cycle     — dispara um ciclo manual imediato
 */

const http = require('http');

function forwardToDedicatedWorker(endpoint, method = 'GET', body = null, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const baseUrl = process.env.FENIX_WORKER_URL || 'http://127.0.0.1:4420';
      const targetUrl = new URL(endpoint, baseUrl);
      const req = http.request(targetUrl, {
        method,
        timeout: timeoutMs,
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
          } catch {
            resolve({ status: res.statusCode, data: { raw: data } });
          }
        });
      });
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
      if (body) req.write(JSON.stringify(body));
      req.end();
    } catch {
      resolve(null);
    }
  });
}

async function handleAutonomousLoopRoutes(req, res, { url, sendJson, readJson, app, autonomousLoop, identity }) {
  const path = url.pathname;
  const knownRoute = /^\/api\/v2\/autonomous\/(heartbeat|dashboard|memories|queue|mission|status|start|stop|cycle)$/.test(path);

  if (knownRoute) {
    if (!identity?.tenantId || !identity?.actorId || !app?.controlPlane?.authorize) {
      return sendJson(res, 503, { ok: false, error: 'Authorization service unavailable', status: 'UNAVAILABLE' });
    }
    const permission = req.method === 'GET' ? 'runtime:read' : 'runtime:admin';
    await app.controlPlane.authorize(identity.tenantId, identity.actorId, permission);
  }

  // GET /api/v2/autonomous/heartbeat
  if (req.method === 'GET' && path === '/api/v2/autonomous/heartbeat') {
    if (autonomousLoop) {
      return sendJson(res, 200, { ok: true, heartbeat: autonomousLoop.getHeartbeat() });
    }
    const workerRes = await forwardToDedicatedWorker('/health');
    if (workerRes && workerRes.status === 200) {
      const health = workerRes.data || {};
      return sendJson(res, 200, {
        ok: true,
        heartbeat: {
          system: 'ONLINE',
          worker: 'fenix-evolution-worker',
          persistence: health.persistence?.state || 'NOT_MEASURED',
          evolution: health.schedulerState || 'UNKNOWN',
          status: health.status || 'UNKNOWN',
          scores: health.scores || null
        }
      });
    }
    return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized', status: 'UNAVAILABLE' });
  }

  // GET /api/v2/autonomous/dashboard
  if (req.method === 'GET' && path === '/api/v2/autonomous/dashboard') {
    if (autonomousLoop) {
      const dashboard = await autonomousLoop.getDashboardData();
      return sendJson(res, 200, { ok: true, dashboard });
    }
    const workerRes = await forwardToDedicatedWorker('/status');
    if (workerRes && workerRes.status === 200) {
      const status = workerRes.data || {};
      return sendJson(res, 200, {
        ok: true,
        dashboard: {
          heartbeat: status.heartbeat || {
            system: 'ONLINE',
            status: status.status || 'UNKNOWN',
            evolution: status.scheduler?.state || 'UNKNOWN',
          },
          status,
          scores: status.scores || null,
          queue: status.scheduler?.queueSnapshot || null
        }
      });
    }
    return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized', status: 'UNAVAILABLE' });
  }

  // GET /api/v2/autonomous/memories
  if (req.method === 'GET' && path === '/api/v2/autonomous/memories') {
    if (!autonomousLoop?.evolutionMemory) {
      return sendJson(res, 503, { ok: false, error: 'Evolution memory not available' });
    }
    const limit = Number(url.searchParams.get('limit') || 50);
    const pattern = url.searchParams.get('pattern') || undefined;
    const memories = await autonomousLoop.evolutionMemory.list({ limit, pattern });
    const summary = await autonomousLoop.evolutionMemory.getSummary();
    return sendJson(res, 200, { ok: true, memories, summary });
  }

  // GET /api/v2/autonomous/queue
  if (req.method === 'GET' && path === '/api/v2/autonomous/queue') {
    if (autonomousLoop?.missionQueue) {
      return sendJson(res, 200, { ok: true, queue: autonomousLoop.missionQueue.getSnapshot() });
    }
    const workerRes = await forwardToDedicatedWorker('/queue');
    if (workerRes && workerRes.status === 200) {
      return sendJson(res, 200, { ok: true, queue: workerRes.data.snapshot || workerRes.data });
    }
    return sendJson(res, 503, { ok: false, error: 'Mission queue not available' });
  }

  // POST /api/v2/autonomous/mission
  if (req.method === 'POST' && path === '/api/v2/autonomous/mission') {
    const body = await readJson(req);
    if (autonomousLoop?.missionQueue) {
      const enqueued = autonomousLoop.missionQueue.enqueue({
        problem: body.problem,
        priority: body.priority || 'P3',
        hypothesis: body.hypothesis,
        context: body.context
      });
      return sendJson(res, 201, { ok: true, ...enqueued });
    }
    const workerRes = await forwardToDedicatedWorker('/queue/enqueue', 'POST', {
      title: body.problem,
      description: body.hypothesis || body.problem,
      priority: body.priority || 'P3',
      type: 'ARCHITECTURAL'
    });
    if (workerRes && (workerRes.status === 200 || workerRes.status === 201)) {
      return sendJson(res, 201, { ok: true, ...workerRes.data });
    }
    return sendJson(res, 503, { ok: false, error: 'Mission queue not available' });
  }

  // GET /api/v2/autonomous/status
  if (req.method === 'GET' && path === '/api/v2/autonomous/status') {
    if (autonomousLoop) {
      return sendJson(res, 200, { ok: true, loop: autonomousLoop.getStatus() });
    }
    const workerRes = await forwardToDedicatedWorker('/status');
    if (workerRes && workerRes.status === 200) {
      return sendJson(res, 200, { ok: true, loop: workerRes.data.scheduler });
    }
    return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized', status: 'UNAVAILABLE' });
  }

  // POST /api/v2/autonomous/start
  if (req.method === 'POST' && path === '/api/v2/autonomous/start') {
    if (autonomousLoop) {
      autonomousLoop.start();
      return sendJson(res, 200, { ok: true, message: 'Loop iniciado', loop: autonomousLoop.getStatus() });
    }
    return sendJson(res, 200, { ok: true, message: 'Dedicated worker active under PM2' });
  }

  // POST /api/v2/autonomous/stop
  if (req.method === 'POST' && path === '/api/v2/autonomous/stop') {
    if (autonomousLoop) {
      autonomousLoop.stop();
      return sendJson(res, 200, { ok: true, message: 'Loop parado', loop: autonomousLoop.getStatus() });
    }
    return sendJson(res, 200, { ok: true, message: 'Dedicated worker active under PM2' });
  }

  // POST /api/v2/autonomous/cycle — dispara ciclo manual imediato
  if (req.method === 'POST' && path === '/api/v2/autonomous/cycle') {
    if (autonomousLoop) {
      autonomousLoop._tick().catch(err =>
        console.error('[FenixAutonomousLoop] manual cycle error:', err.message)
      );
      return sendJson(res, 202, { ok: true, message: 'Ciclo manual disparado', cycleCount: autonomousLoop._cycleCount });
    }
    const workerRes = await forwardToDedicatedWorker('/tick', 'POST', {});
    if (workerRes && workerRes.status === 200) {
      return sendJson(res, 202, { ok: true, message: 'Ciclo disparado no dedicated worker', result: workerRes.data });
    }
    return sendJson(res, 503, { ok: false, error: 'Dedicated worker indisponível' });
  }

  return false;
}

module.exports = { handleAutonomousLoopRoutes };
