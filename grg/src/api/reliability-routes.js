'use strict';
/**
 * FÊNIX OS — Level 27: Reliability & Self-Healing API Routes
 * ==========================================================
 * REST endpoints for SRE monitoring, targeted component recovery,
 * incident history ledger, and human escalation gates.
 */

const { getSelfHealingEngine } = require('../reliability/self-healing-engine');

async function handleReliabilityRoutes(req, res, { url, sendJson, readJson, app, identity }) {
  if (!url.pathname.startsWith('/api/v2/reliability')) {
    return false;
  }

  const engine = app?.selfHealingEngine || getSelfHealingEngine({ app, bus: app?.bus });
  const { tenantId, actorId } = identity || { tenantId: 'grg', actorId: 'grg-admin' };

  // 1. GET /api/v2/reliability/status
  if (req.method === 'GET' && url.pathname === '/api/v2/reliability/status') {
    if (app?.controlPlane?.authorize) {
      try {
        await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
      } catch (err) {
        return sendJson(res, 403, { ok: false, error: 'Acesso negado à telemetria de confiabilidade' });
      }
    }

    const status = await engine.getStatus({ app });
    return sendJson(res, 200, { ok: true, ...status });
  }

  // 2. GET /api/v2/reliability/incidents
  if (req.method === 'GET' && url.pathname === '/api/v2/reliability/incidents') {
    if (app?.controlPlane?.authorize) {
      try {
        await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
      } catch (err) {
        return sendJson(res, 403, { ok: false, error: 'Acesso negado ao histórico de incidentes' });
      }
    }

    const stateFilter = url.searchParams.get('state');
    const componentFilter = url.searchParams.get('component');
    let incidents = Array.from(engine.incidents.values());

    if (stateFilter) {
      incidents = incidents.filter(i => String(i.state).toUpperCase() === stateFilter.toUpperCase());
    }
    if (componentFilter) {
      incidents = incidents.filter(i => String(i.component).toLowerCase() === componentFilter.toLowerCase());
    }

    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50)));
    const sorted = incidents.sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));

    return sendJson(res, 200, {
      ok: true,
      total: incidents.length,
      limit,
      incidents: sorted.slice(0, limit)
    });
  }

  // 3. POST /api/v2/reliability/recover
  if (req.method === 'POST' && url.pathname === '/api/v2/reliability/recover') {
    if (app?.controlPlane?.authorize) {
      try {
        await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin');
      } catch (err) {
        return sendJson(res, 403, { ok: false, error: 'Apenas operadores autorizados podem disparar recuperação manual' });
      }
    }

    const body = await readJson(req).catch(() => ({}));
    const component = body.component || 'general';

    const result = await engine.restartComponent(component, { actorId, ...body });
    return sendJson(res, 200, { ok: true, result });
  }

  // 4. POST /api/v2/reliability/watchdog/run
  if (req.method === 'POST' && url.pathname === '/api/v2/reliability/watchdog/run') {
    if (app?.controlPlane?.authorize) {
      try {
        await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin');
      } catch (err) {
        return sendJson(res, 403, { ok: false, error: 'Apenas operadores autorizados podem disparar watchdog' });
      }
    }

    const report = await engine.runWatchdog();
    return sendJson(res, 200, { ok: true, watchdog: report });
  }

  // 5. POST /api/v2/reliability/incidents/:id/escalate
  const escalateMatch = url.pathname.match(/^\/api\/v2\/reliability\/incidents\/([^/]+)\/escalate$/);
  if (req.method === 'POST' && escalateMatch) {
    if (app?.controlPlane?.authorize) {
      try {
        await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin');
      } catch (err) {
        return sendJson(res, 403, { ok: false, error: 'Não autorizado a escalar incidentes' });
      }
    }

    const incidentId = escalateMatch[1];
    const body = await readJson(req).catch(() => ({}));
    const incident = engine.escalateIncident(incidentId, body.reason || 'Escalação solicitada pelo operador');

    if (!incident) {
      return sendJson(res, 404, { ok: false, error: `Incidente ${incidentId} não encontrado` });
    }

    return sendJson(res, 200, { ok: true, incident });
  }

  // 6. POST /api/v2/reliability/incidents/:id/resolve
  const resolveMatch = url.pathname.match(/^\/api\/v2\/reliability\/incidents\/([^/]+)\/resolve$/);
  if (req.method === 'POST' && resolveMatch) {
    if (app?.controlPlane?.authorize) {
      try {
        await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin');
      } catch (err) {
        return sendJson(res, 403, { ok: false, error: 'Não autorizado a resolver incidentes escalados' });
      }
    }

    const incidentId = resolveMatch[1];
    const body = await readJson(req).catch(() => ({}));
    const action = body.action || 'retry'; // retry, cancel, fallback

    const incident = engine.incidents.get(incidentId);
    if (!incident) {
      return sendJson(res, 404, { ok: false, error: `Incidente ${incidentId} não encontrado` });
    }

    let recoveryDetails = '';
    if (action === 'retry') {
      const stuckJobId = incident.metadata?.jobId || incident.metadata?.stuckJobId;
      if (stuckJobId) {
        await engine.recoverStuckJob(stuckJobId, `Reprocessamento manual aprovado por ${actorId}`, { force: true });
        recoveryDetails = `Job #${stuckJobId} re-enfileirado e re-ativado após aprovação humana de ${actorId}.`;
      } else {
        recoveryDetails = `Reprocessamento aprovado por ${actorId}.`;
      }
    } else if (action === 'cancel') {
      const stuckJobId = incident.metadata?.jobId || incident.metadata?.stuckJobId;
      const qm = engine.jobQueueManager || app?.jobQueueManager;
      if (stuckJobId && qm?.cancelJob) {
        await qm.cancelJob(stuckJobId).catch(() => {});
        recoveryDetails = `Job #${stuckJobId} cancelado pelo operador ${actorId}.`;
      } else {
        recoveryDetails = `Cancelamento forçado pelo operador ${actorId}.`;
      }
    } else if (action === 'fallback') {
      const cb = engine.getCircuitBreaker(incident.component);
      if (cb) {
        cb.fallbackActive = true;
        cb.fallbackReason = `Fallback manual ativado por ${actorId}`;
      }
      recoveryDetails = `Rota de fallback ativada manualmente pelo operador ${actorId}.`;
    }

    const updated = engine.recordRecovery(incidentId, {
      recoveryAction: `HUMAN_RESOLVED_${String(action).toUpperCase()}`,
      outcome: 'RECOVERED',
      details: recoveryDetails
    });

    return sendJson(res, 200, { ok: true, incident: updated });
  }

  return false;
}

module.exports = { handleReliabilityRoutes };
