'use strict';

/**
 * FÊNIX OS — Intent Engine 2.0 API Routes
 * =======================================
 * Exposes canonical REST endpoints for:
 * - Intent Compilation & Specification
 * - Request Understanding Loop execution
 * - Reference Ingestion (URLs, Screenshots, Codebases)
 * - Self Model Architecture Query
 * - Task Memory & Experience Ledger
 */

const { globalIntentEngine } = require('../intent/intent-engine');

async function handleIntentRoutes(req, res, url, app, sendJson, readJson, authContext = {}) {
  const method = req.method;
  const pathname = url.pathname;
  const requestId = req.headers['x-request-id'] || null;

  // 1. Compile User Request into IntentSpecification
  if (method === 'POST' && pathname === '/api/v2/intent/compile') {
    try {
      const body = await readJson(req);
      const rawRequest = body.request || body.prompt || body.message || '';
      if (!rawRequest) {
        return sendJson(res, 400, { error: 'request string is required' }, requestId);
      }
      const runtimeContext = {
        activeRoute: body.activeRoute || 'view-city',
        selectedAgentId: body.selectedAgentId || 'Backend',
        selectedObject: body.selectedObject || null,
        recentErrors: body.recentErrors || [],
        systemLoad: body.systemLoad || { status: 'NORMAL' },
        currentAgentCount: body.currentAgentCount || 20,
        tenantId: authContext.tenantId || 'grg',
        actorId: authContext.actorId || 'grg-admin'
      };

      const spec = await globalIntentEngine.compiler.compile(rawRequest, runtimeContext);
      return sendJson(res, 200, {
        ok: true,
        intentSpec: spec,
        confidenceScore: spec.confidenceScore,
        autonomyLevel: spec.autonomyLevel,
        taskRisk: spec.taskRisk,
        reuseScore: spec.reuseScore,
        requiresClarification: spec.questions && spec.questions.length > 0 && spec.confidenceScore < 0.70,
        questions: spec.questions || [],
        assumptions: spec.assumptions || []
      }, requestId);
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message }, requestId);
    }
  }

  // 2. Process Full Request (15-step loop)
  if (method === 'POST' && pathname === '/api/v2/intent/process') {
    try {
      const body = await readJson(req);
      const rawRequest = body.request || body.prompt || body.message || '';
      if (!rawRequest) {
        return sendJson(res, 400, { error: 'request string is required' }, requestId);
      }
      const runtimeContext = {
        activeRoute: body.activeRoute || 'view-city',
        selectedAgentId: body.selectedAgentId || 'Backend',
        selectedObject: body.selectedObject || null,
        tenantId: authContext.tenantId || 'grg',
        actorId: authContext.actorId || 'grg-admin'
      };

      const result = await globalIntentEngine.processRequest(rawRequest, runtimeContext);
      return sendJson(res, 200, { ok: true, ...result }, requestId);
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message }, requestId);
    }
  }

  // 3. Ingest Reference (URL, screenshot, codebase, video, spec)
  if (method === 'POST' && pathname === '/api/v2/intent/ingest-reference') {
    try {
      const body = await readJson(req);
      const result = await globalIntentEngine.ingestReference(body);
      return sendJson(res, 200, { ok: true, referenceSpec: result }, requestId);
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message }, requestId);
    }
  }

  // 4. Query SelfModel Snapshot
  if (method === 'GET' && pathname === '/api/v2/intent/self-model') {
    const snapshot = globalIntentEngine.getSelfModelSnapshot();
    return sendJson(res, 200, { ok: true, selfModel: snapshot }, requestId);
  }

  // 5. Query Task Memory Experience History
  if (method === 'GET' && pathname === '/api/v2/intent/history') {
    const history = globalIntentEngine.getTaskHistory();
    return sendJson(res, 200, { ok: true, history }, requestId);
  }

  return false;
}

module.exports = { handleIntentRoutes };
