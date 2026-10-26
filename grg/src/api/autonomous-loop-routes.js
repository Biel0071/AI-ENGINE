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
const { FenixAutonomousLoop } = require('../evolution/fenix-autonomous-loop');

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

function ensureLoopInstance(autonomousLoop, app, identity) {
  if (autonomousLoop) return autonomousLoop;
  if (app?.autonomousLoop) return app.autonomousLoop;
  if (app) {
    app.autonomousLoop = new FenixAutonomousLoop({
      app,
      tenantId: identity?.tenantId || 'grg',
      actorId: identity?.actorId || 'grg-admin'
    });
    return app.autonomousLoop;
  }
  return null;
}

async function handleAutonomousLoopRoutes(req, res, { url, sendJson, readJson, app, autonomousLoop, identity }) {
  const path = url.pathname;
  const knownRoute = /^\/api\/v2\/autonomous\/(heartbeat|dashboard|memories|queue|mission|status|start|pause|resume|stop|cycle|tick|bugs|budget|scan|poc\/run|city-state)/.test(path);

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
    const fallbackLoop = ensureLoopInstance(null, app, identity);
    if (fallbackLoop) {
      return sendJson(res, 200, { ok: true, heartbeat: fallbackLoop.getHeartbeat() });
    }
    return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized', status: 'UNAVAILABLE' });
  }

  // GET /api/v2/autonomous/dashboard
  if (req.method === 'GET' && path === '/api/v2/autonomous/dashboard') {
    if (autonomousLoop) {
      const dashboard = await autonomousLoop.getDashboardData();
      return sendJson(res, 200, { ok: true, dashboard });
    }
    const fallbackLoop = ensureLoopInstance(null, app, identity);
    const localDash = fallbackLoop ? await fallbackLoop.getDashboardData() : {};
    const workerRes = await forwardToDedicatedWorker('/status');
    if (workerRes && workerRes.status === 200) {
      const workerStatus = workerRes.data || {};
      const hasCustomWorkerUrl = Boolean(process.env.FENIX_WORKER_URL);
      const mergedQueue = hasCustomWorkerUrl
        ? (workerStatus.scheduler?.queueSnapshot || null)
        : (localDash.queue || workerStatus.scheduler?.queueSnapshot || null);
      const mergedStatus = {
        ...(localDash.status || {}),
        ...workerStatus,
        status: localDash.status?.status === 'ACTIVE' || localDash.status?.status === 'PAUSED'
          ? localDash.status.status
          : (workerStatus.scheduler?.state || localDash.status?.status || 'IDLE'),
        cycleCount: Math.max(Number(localDash.status?.cycleCount || 0), Number(workerStatus.scheduler?.cycleCount || 0)),
        lastCycleAt: localDash.status?.lastCycleAt || workerStatus.scheduler?.lastCycleAt || null
      };
      return sendJson(res, 200, {
        ok: true,
        dashboard: {
          ...localDash,
          heartbeat: workerStatus.heartbeat || {
            ...(localDash.heartbeat || {}),
            system: 'ONLINE',
            status: workerStatus.status || 'UNKNOWN',
            evolution: mergedStatus.status || workerStatus.scheduler?.state || 'UNKNOWN',
          },
          status: mergedStatus,
          scores: workerStatus.scores || null,
          queue: mergedQueue
        }
      });
    }
    if (fallbackLoop) {
      return sendJson(res, 200, { ok: true, dashboard: localDash });
    }
    return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized', status: 'UNAVAILABLE' });
  }

  const loop = ensureLoopInstance(autonomousLoop, app, identity);

  // GET /api/v2/autonomous/memories
  if (req.method === 'GET' && path === '/api/v2/autonomous/memories') {
    if (!loop?.evolutionMemory) {
      return sendJson(res, 503, { ok: false, error: 'Evolution memory not available' });
    }
    const limit = Number(url.searchParams.get('limit') || 50);
    const pattern = url.searchParams.get('pattern') || undefined;
    const memories = await loop.evolutionMemory.list({ limit, pattern });
    const summary = await loop.evolutionMemory.getSummary();
    return sendJson(res, 200, { ok: true, memories, summary });
  }

  // GET /api/v2/autonomous/queue
  if (req.method === 'GET' && path === '/api/v2/autonomous/queue') {
    if (loop?.missionQueue) {
      return sendJson(res, 200, { ok: true, queue: loop.missionQueue.getSnapshot() });
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
    if (loop?.missionQueue) {
      const enqueued = loop.missionQueue.enqueue({
        projectId: body.projectId || 'fenix-os',
        bugId: body.bugId || null,
        problem: body.problem || body.objective,
        objective: body.objective || body.problem,
        priority: body.priority || 'P3',
        hypothesis: body.hypothesis,
        targetFiles: body.targetFiles,
        acceptanceCriteria: body.acceptanceCriteria,
        authorizedTools: body.authorizedTools,
        approvalsRequired: body.approvalsRequired,
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

  // POST /api/v2/autonomous/mission/:id/control
  const missionControlMatch = path.match(/^\/api\/v2\/autonomous\/mission\/([^/]+)\/control$/);
  if (req.method === 'POST' && missionControlMatch) {
    if (!loop?.missionQueue) {
      return sendJson(res, 503, { ok: false, error: 'Mission queue not available' });
    }
    const missionId = decodeURIComponent(missionControlMatch[1]);
    const body = await readJson(req).catch(() => ({}));
    const action = String(body.action || '').toLowerCase();
    const q = loop.missionQueue;

    try {
      let updated = null;
      if (action === 'pause') {
        updated = q.pauseMission(missionId, body.reason);
      } else if (action === 'resume') {
        updated = q.resumeMission(missionId);
      } else if (action === 'cancel' || action === 'abort') {
        updated = q.cancelMission(missionId, body.reason);
      } else if (action === 'prioritize') {
        updated = q.prioritizeMission(missionId, body.priority || 'P0');
      } else if (action === 'submit-approval') {
        updated = q.submitForApproval(missionId, body.diffReview || {});
      } else if (action === 'approve') {
        updated = q.approveMission(missionId, identity.actorId, body.notes || '');
      } else if (action === 'reject') {
        updated = q.rejectMission(missionId, identity.actorId, body.reason || '');
      } else if (action === 'acquire-lease') {
        const leaseRes = q.acquireLease(missionId, body.workerId || identity.actorId, body.ttlMs || 60000);
        return sendJson(res, 200, { ok: true, action, missionId, lease: leaseRes });
      } else if (action === 'release-lease') {
        const released = q.releaseLease(missionId, body.workerId || null);
        return sendJson(res, 200, { ok: true, action, missionId, released });
      } else {
        return sendJson(res, 400, { ok: false, error: `Ação de controle desconhecida: ${action}` });
      }
      if (!updated) {
        return sendJson(res, 404, { ok: false, error: `Missão ${missionId} não encontrada` });
      }
      return sendJson(res, 200, { ok: true, action, mission: updated });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // GET /api/v2/autonomous/bugs
  if (req.method === 'GET' && path === '/api/v2/autonomous/bugs') {
    if (!loop) return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized' });
    const projectId = url.searchParams.get('projectId') || undefined;
    const state = url.searchParams.get('state') || undefined;
    const severity = url.searchParams.get('severity') || undefined;
    const excludeSandbox = url.searchParams.get('excludeSandbox') === 'true';
    const result = loop.listBugs({ projectId, state, severity, excludeSandbox });
    return sendJson(res, 200, { ok: true, ...result });
  }

  // POST /api/v2/autonomous/bugs
  if (req.method === 'POST' && path === '/api/v2/autonomous/bugs') {
    if (!loop) return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized' });
    try {
      const body = await readJson(req).catch(() => ({}));
      const reported = loop.reportBug({ ...body, actor: identity.actorId });
      return sendJson(res, 201, { ok: true, ...reported });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // POST /api/v2/autonomous/bugs/:id/transition
  const bugTransitionMatch = path.match(/^\/api\/v2\/autonomous\/bugs\/([^/]+)\/transition$/);
  if (req.method === 'POST' && bugTransitionMatch) {
    if (!loop) return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized' });
    const bugId = decodeURIComponent(bugTransitionMatch[1]);
    try {
      const body = await readJson(req).catch(() => ({}));
      const bug = loop.transitionBug(bugId, body.targetState || body.state, {
        ...body,
        actor: body.actor || identity.actorId
      });
      return sendJson(res, 200, { ok: true, bug });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // GET & POST /api/v2/autonomous/budget
  if (path === '/api/v2/autonomous/budget') {
    if (!loop) return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized' });
    if (req.method === 'GET') {
      return sendJson(res, 200, {
        ok: true,
        budget: loop.getBudgetStatus(),
        recentModelCalls: loop._modelCalls.slice(0, 30)
      });
    }
    if (req.method === 'POST') {
      const body = await readJson(req).catch(() => ({}));
      const budget = loop.configureBudget(body);
      return sendJson(res, 200, { ok: true, budget });
    }
  }

  // POST /api/v2/autonomous/scan
  if (req.method === 'POST' && path === '/api/v2/autonomous/scan') {
    if (!loop) return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized' });
    const body = await readJson(req).catch(() => ({}));
    const scanReport = loop.runProactiveProjectScan(body);
    return sendJson(res, 200, scanReport);
  }

  // POST /api/v2/autonomous/poc/run
  if (req.method === 'POST' && path === '/api/v2/autonomous/poc/run') {
    if (!loop) return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized' });
    try {
      const body = await readJson(req).catch(() => ({}));
      const pocResult = await loop.runAutonomousBugFixPoC(body);
      return sendJson(res, 200, pocResult);
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // GET & POST /api/v2/autonomous/city-state
  if (path === '/api/v2/autonomous/city-state') {
    if (!loop) return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized' });
    if (req.method === 'GET') {
      return sendJson(res, 200, { ok: true, cityState: loop.getCityAutonomousState() });
    }
    if (req.method === 'POST') {
      const body = await readJson(req).catch(() => ({}));
      const updated = loop.setAgentCityState(body.roleId || body.role || body.agentId, body.engineeringState || body.state, body);
      if (!updated) {
        return sendJson(res, 404, { ok: false, error: 'Papel ou agente não encontrado' });
      }
      return sendJson(res, 200, { ok: true, agentState: updated, cityState: loop.getCityAutonomousState() });
    }
  }

  // GET /api/v2/autonomous/status
  if (req.method === 'GET' && path === '/api/v2/autonomous/status') {
    if (loop) {
      return sendJson(res, 200, { ok: true, loop: loop.getStatus() });
    }
    const workerRes = await forwardToDedicatedWorker('/status');
    if (workerRes && workerRes.status === 200) {
      return sendJson(res, 200, { ok: true, loop: workerRes.data.scheduler });
    }
    return sendJson(res, 503, { ok: false, error: 'Autonomous loop not initialized', status: 'UNAVAILABLE' });
  }

  // POST /api/v2/autonomous/start
  if (req.method === 'POST' && path === '/api/v2/autonomous/start') {
    if (loop) {
      loop.start();
      return sendJson(res, 200, { ok: true, message: 'Loop iniciado', loop: loop.getStatus() });
    }
    return sendJson(res, 200, { ok: true, message: 'Dedicated worker active under PM2' });
  }

  // POST /api/v2/autonomous/pause
  if (req.method === 'POST' && path === '/api/v2/autonomous/pause') {
    const body = await readJson(req).catch(() => ({}));
    if (loop) {
      loop.pause(body.reason || 'Pausado pelo operador');
      return sendJson(res, 200, { ok: true, message: 'Loop pausado', loop: loop.getStatus() });
    }
    return sendJson(res, 503, { ok: false, error: 'Loop indisponível' });
  }

  // POST /api/v2/autonomous/resume
  if (req.method === 'POST' && path === '/api/v2/autonomous/resume') {
    if (loop) {
      loop.resume();
      return sendJson(res, 200, { ok: true, message: 'Loop retomado', loop: loop.getStatus() });
    }
    return sendJson(res, 503, { ok: false, error: 'Loop indisponível' });
  }

  // POST /api/v2/autonomous/stop
  if (req.method === 'POST' && path === '/api/v2/autonomous/stop') {
    if (loop) {
      loop.stop();
      return sendJson(res, 200, { ok: true, message: 'Loop parado', loop: loop.getStatus() });
    }
    return sendJson(res, 200, { ok: true, message: 'Dedicated worker active under PM2' });
  }

  // POST /api/v2/autonomous/cycle ou /tick — dispara ciclo manual imediato
  if (req.method === 'POST' && (path === '/api/v2/autonomous/cycle' || path === '/api/v2/autonomous/tick')) {
    if (loop) {
      loop._tick().catch(err =>
        console.error('[FenixAutonomousLoop] manual cycle error:', err.message)
      );
      return sendJson(res, 202, { ok: true, message: 'Ciclo manual disparado', cycleCount: loop._cycleCount });
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
