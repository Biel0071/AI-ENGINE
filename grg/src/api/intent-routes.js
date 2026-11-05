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
const { analyzeReferenceImage } = require('../intent/reference-image-analysis');

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

  if (method === 'POST' && pathname === '/api/v2/intent/analyze-reference-image') {
    try {
      await app.controlPlane.authorize(authContext.tenantId, authContext.actorId, 'project:read');
      const body = await readJson(req);
      const projectId = typeof body.projectId === 'string' ? body.projectId.trim().slice(0, 120) : '';
      if (!projectId) return sendJson(res, 400, { ok: false, error: 'PROJECT_ID_REQUIRED' }, requestId);
      const state = await app.store.read();
      const projectExists = (state.projects || []).some((project) => project.tenantId === authContext.tenantId && (project.id || project.projectId) === projectId)
        || Boolean(app.projectRegistry?.get?.(projectId));
      if (!projectExists) return sendJson(res, 404, { ok: false, error: 'PROJECT_NOT_FOUND' }, requestId);
      const model = String(process.env.GRG_VISION_MODEL || process.env.FENIX_VISION_MODEL || '').trim();
      const visual = await analyzeReferenceImage({ llm: app.llm, model, imageBase64: body.imageBase64, projectId });
      const referenceSpec = await globalIntentEngine.ingestReference({
        type: 'SCREENSHOT', source: `project-hub:${projectId}`,
        visualObservations: [
          { kind: 'layout', description: visual.analysis.layout },
          ...visual.analysis.visibleComponents.map((component) => ({ kind: 'component', ...component })),
        ],
        targetFenixViews: ['projects', 'ide', 'flow-graph'],
      });
      referenceSpec.projectId = projectId;
      referenceSpec.analysisStatus = visual.status;
      referenceSpec.knowledge ||= {};
      referenceSpec.imageAnalysis = {
        status: visual.status, mimeType: visual.mimeType, imageBytes: visual.imageBytes,
        imageSha256: visual.imageSha256, provider: visual.provider, model: visual.model, durationMs: visual.durationMs,
      };
      referenceSpec.knowledge.visual = {
        status: visual.status,
        observations: visual.analysis,
        colorPalette: null, typography: null, spacingScale: null, contrastRatio: null,
        limitation: 'Modelo de visão interpreta pixels, mas as descrições são observações do modelo e exigem validação humana; não são medições geométricas nem prova de interação.',
      };
      referenceSpec.evidence = {
        ...referenceSpec.evidence,
        captureProvided: true,
        imageSha256: visual.imageSha256,
        mimeType: visual.mimeType,
        provider: visual.provider,
        model: visual.model,
        limitations: [referenceSpec.knowledge.visual.limitation, ...referenceSpec.evidence.limitations],
      };
      return sendJson(res, 200, { ok: true, referenceSpec }, requestId);
    } catch (error) {
      return sendJson(res, error.status || 502, { ok: false, error: error.code || 'REFERENCE_IMAGE_ANALYSIS_FAILED', reason: String(error.message || 'Falha na análise da imagem').slice(0, 300) }, requestId);
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
