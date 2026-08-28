'use strict';

async function handleOrchestrationRoutes(req, res, url, app, sendJson, readJson, context) {
  if (!url.pathname.startsWith('/api/orchestration/')) return false;

  // Initialize central orchestrator if not exists
  if (!app.centralOrchestrator) {
    const { CentralOrchestrator } = require('../orchestrator/central-orchestrator');
    app.centralOrchestrator = new CentralOrchestrator({
      eventBus: app.eventBus,
      store: app.store,
      aiRouter: app.aiRouter || app.aiGateway,
      executionEngine: app.executionEngine,
      health: app.health,
      knowledgeEngine: app.knowledgeEngine
    });
  }

  const orchestrator = app.centralOrchestrator;
  const { tenantId, actorId } = context;

  try {
    // POST /api/orchestration/requests
    if (req.method === 'POST' && url.pathname === '/api/orchestration/requests') {
      const payload = await readJson(req);
      const reqState = await orchestrator.ingestRequest(payload);
      sendJson(res, 202, reqState);
      return true;
    }

    // GET /api/orchestration/requests/:id
    if (req.method === 'GET' && url.pathname.startsWith('/api/orchestration/requests/')) {
      const id = url.pathname.split('/').pop();
      const reqState = orchestrator.getRequest(id);
      if (!reqState) { sendJson(res, 404, { error: 'Request not found' }); return true; }
      sendJson(res, 200, reqState);
      return true;
    }

    // GET /api/orchestration/missions/:id
    if (req.method === 'GET' && url.pathname.startsWith('/api/orchestration/missions/')) {
      const id = url.pathname.split('/').pop();
      const missionState = orchestrator.getMission(id);
      if (!missionState) { sendJson(res, 404, { error: 'Mission not found' }); return true; }
      sendJson(res, 200, missionState);
      return true;
    }

    // POST /api/orchestration/missions/:id/result
    if (req.method === 'POST' && url.pathname.match(/^\/api\/orchestration\/missions\/([^/]+)\/result$/)) {
      const id = url.pathname.split('/')[4];
      const payload = await readJson(req);
      const missionState = await orchestrator.submitResult(id, payload);
      sendJson(res, 200, missionState);
      return true;
    }

    // GET /api/orchestration/events
    if (req.method === 'GET' && url.pathname === '/api/orchestration/events') {
      sendJson(res, 200, { events: orchestrator.getEvents() });
      return true;
    }

    // POST /api/orchestration/requests/:id/cancel
    if (req.method === 'POST' && url.pathname.match(/^\/api\/orchestration\/requests\/([^/]+)\/cancel$/)) {
      const id = url.pathname.split('/')[4];
      const reqState = orchestrator.getRequest(id);
      if (!reqState) { sendJson(res, 404, { error: 'Request not found' }); return true; }
      reqState.status = 'CANCELLED';
      orchestrator._logEvent('api', 'request.cancelled', id, reqState.missionId, {});
      sendJson(res, 200, reqState);
      return true;
    }

    sendJson(res, 404, { error: 'Orchestration route not found' });
    return true;
  } catch (error) {
    sendJson(res, 500, { error: error.message });
    return true;
  }
}

module.exports = { handleOrchestrationRoutes };
