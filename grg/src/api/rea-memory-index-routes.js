'use strict';

const fs = require('node:fs');
const { getProjectById } = require('../projects/project-registry');
const { getLocalProjectById } = require('../projects/local-project-catalog');
const { resolveProjectWorkspace } = require('../projects/project-workspace-resolver');

/**
 * FÊNIX OS — REA Intelligence & Project Memory INDEX Routes (/api/v2/rea/* & /api/v2/memory-index/*)
 */

const { globalProjectMemoryIndex } = require('../memory/project-memory-index');
const { globalReaIntelligenceEngine } = require('../services/rea-intelligence-engine');
const { REA_MULTIMODAL_PROMPT } = require('../analysis/rea-multimodal-prompt');

async function handleReaMemoryIndexRoutes(req, res, url, sendJson, readJson, identity = {}, app = null) {
  const pathname = url.pathname;
  const method = req.method;
  const memoryIndex = app?.projectMemoryIndex || globalProjectMemoryIndex;
  const reaEngine = app?.reaIntelligence || globalReaIntelligenceEngine;

  // ── 1. Project Memory INDEX & Active Memory Routes ──
  if (pathname.startsWith('/api/v2/memory-index')) {
    if (method === 'GET' && (pathname === '/api/v2/memory-index' || pathname === '/api/v2/memory-index/status')) {
      return sendJson(res, 200, memoryIndex.getStatus());
    }

    if (method === 'GET' && pathname === '/api/v2/memory-index/query') {
      const q = url.searchParams.get('q') || url.searchParams.get('query') || '';
      const projectId = url.searchParams.get('projectId') || null;
      const limit = Number(url.searchParams.get('limit') || 20);
      return sendJson(res, 200, memoryIndex.queryIndex(q, { projectId, limit }));
    }

    if (method === 'GET' && pathname === '/api/v2/memory-index/active-memory') {
      const idx = memoryIndex.ensureLoaded();
      return sendJson(res, 200, {
        ok: true,
        activeMemory: idx.activeMemory,
        recentActivity: memoryIndex.recentActivity.slice(0, 25),
        summary: idx.summary,
      });
    }

    if (method === 'POST' && pathname === '/api/v2/memory-index/context-pack') {
      const body = await readJson(req).catch(() => ({}));
      const prompt = body.prompt || body.task || body.query || '';
      const projectId = body.projectId || 'fenix-os';
      return sendJson(res, 200, {
        ok: true,
        contextPack: memoryIndex.getContextPack(prompt, projectId),
      });
    }

    if (method === 'POST' && pathname === '/api/v2/memory-index/rebuild') {
      const body = await readJson(req).catch(() => ({}));
      const idx = memoryIndex.rebuildIndex({ persist: body.persist !== false });
      return sendJson(res, 200, {
        ok: true,
        rebuiltAt: idx.generatedAt,
        buildTimeMs: idx.buildTimeMs,
        summary: idx.summary,
      });
    }

    if (method === 'GET' && pathname === '/api/v2/memory-index/fingerprints') {
      return sendJson(res, 200, memoryIndex.getIncrementalFingerprintStatus());
    }

    if (method === 'POST' && pathname === '/api/v2/memory-index/incremental-sync') {
      return sendJson(res, 200, memoryIndex.incrementalSync());
    }
  }

  // ── 2. REA Intelligence, Dev Construction & System Orchestration Routes ──
  if (pathname.startsWith('/api/v2/rea')) {
    if (method === 'GET' && pathname === '/api/v2/rea/multimodal-prompt') {
      return sendJson(res, 200, {
        ok: true,
        prompt: REA_MULTIMODAL_PROMPT,
        evidenceContract: ['OBSERVADO', 'MEDIDO', 'INFERIDO', 'AUSENTE', 'MOCK'],
        usage: 'Use o prompt com transcrição e evidências produzidas pelo decoder; timestamps de amostragem uniforme não são timestamps exatos de frame.'
      });
    }

    if (method === 'GET' && (pathname === '/api/v2/rea' || pathname === '/api/v2/rea/status')) {
      return sendJson(res, 200, reaEngine.getStatus());
    }

    if (method === 'POST' && pathname === '/api/v2/rea/analyze') {
      const body = await readJson(req).catch(() => ({}));
      const projectId = String(body.projectId || body.project || '').trim();
      if (!projectId || projectId.length > 128) return sendJson(res, 400, { ok: false, error: 'A valid projectId is required' });
      const tenantId = identity?.tenantId;
      const actorId = identity?.actorId;
      if (!tenantId || !actorId || !app?.controlPlane?.authorize || !app?.store?.read || !app?.memoryEngine?.remember) {
        return sendJson(res, 503, { ok: false, code: 'REA_ANALYSIS_UNAVAILABLE', error: 'Sessão ou persistência do REA indisponível' });
      }
      await app.controlPlane.authorize(tenantId, actorId, 'project:read');
      const storedProject = (await app?.store?.read?.())?.projects?.find((item) => item.tenantId === tenantId && (item.id || item.projectId) === projectId);
      const registryProject = getProjectById(projectId) || getLocalProjectById(projectId);
      const project = storedProject || registryProject;
      if (!project) return sendJson(res, 404, { ok: false, code: 'PROJECT_NOT_FOUND', projectId, error: 'Projeto não encontrado no catálogo autenticado' });
      if (registryProject?.entryFile) return sendJson(res, 409, { ok: false, code: 'SINGLE_FILE_PROJECT_UNSUPPORTED', projectId, error: 'O REA precisa de um workspace; o catálogo deste projeto só permite um arquivo individual' });
      const workspace = resolveProjectWorkspace(project, registryProject);
      if (!workspace) return sendJson(res, 404, { ok: false, code: 'PROJECT_WORKSPACE_UNAVAILABLE', projectId, error: 'Workspace do projeto não está disponível neste runtime' });
      let rootPath;
      try { rootPath = fs.realpathSync(workspace); } catch { return sendJson(res, 404, { ok: false, code: 'PROJECT_WORKSPACE_UNAVAILABLE', projectId, error: 'Workspace do projeto não está disponível neste runtime' }); }
      const evidence = reaEngine.analyzeProject(rootPath, { maxFiles: body.maxFiles || 180, projectId, projectName: project.name || project.displayName || projectId });
      const persistedEvidence = { ...evidence, rootPath: null };
      const serializedEvidence = JSON.stringify(persistedEvidence);
      if (Buffer.byteLength(serializedEvidence) > 100_000) return sendJson(res, 413, { ok: false, code: 'REA_EVIDENCE_TOO_LARGE', projectId, error: 'A evidência excede o limite de memória do projeto e não foi persistida' });
      const memory = await app.memoryEngine.remember(tenantId, actorId, {
        kind: 'project', projectId,
        title: `REA · ${project.name || projectId}`,
        content: serializedEvidence, stableKey: `rea-evidence:${projectId}`,
        classification: 'internal', confidence: 1, tags: ['rea', 'project-analysis', 'evidence'],
        provenance: { type: 'rea-project-analysis', reference: projectId, evidence: [evidence.evidenceId, evidence.subjectSha256] },
      });
      return sendJson(res, 200, { ...evidence, persistence: { status: 'PERSISTED', memoryId: memory.id, version: memory.version } });
    }

    const evidenceMatch = pathname.match(/^\/api\/v2\/rea\/evidence\/([^/]+)$/);
    if (method === 'GET' && evidenceMatch) {
      const projectId = decodeURIComponent(evidenceMatch[1]);
      const tenantId = identity?.tenantId;
      const actorId = identity?.actorId;
      if (!tenantId || !actorId || !app?.controlPlane?.authorize || !app?.store?.read) {
        return sendJson(res, 503, { ok: false, code: 'REA_EVIDENCE_UNAVAILABLE', projectId, error: 'Sessão ou persistência do REA indisponível' });
      }
      await app.controlPlane.authorize(tenantId, actorId, 'project:read');
      const saved = (await app.store.read())?.memories?.find((item) => item.tenantId === tenantId && item.projectId === projectId && item.stableKey === `rea-evidence:${projectId}` && item.status === 'ACTIVE');
      if (saved) {
        try { return sendJson(res, 200, { ...JSON.parse(saved.content), persistence: { status: 'PERSISTED', memoryId: saved.id, version: saved.version } }); }
        catch { return sendJson(res, 500, { ok: false, code: 'REA_EVIDENCE_CORRUPT', projectId, error: 'A evidência salva não pôde ser lida' }); }
      }
      return sendJson(res, 404, { ok: false, code: 'REA_EVIDENCE_NOT_FOUND', projectId, error: 'Nenhuma evidência REA persistida para este projeto' });
    }

    if (method === 'POST' && pathname === '/api/v2/rea/blueprint') {
      const body = await readJson(req).catch(() => ({}));
      const projectId = String(body.projectId || '').trim();
      const objective = String(body.objective || body.prompt || '').trim();
      const tenantId = identity?.tenantId;
      const actorId = identity?.actorId;
      if (!tenantId || !actorId || !app?.controlPlane?.authorize || !app?.store?.read) {
        return sendJson(res, 503, { ok: false, code: 'REA_BLUEPRINT_UNAVAILABLE', error: 'Sessão ou persistência do REA indisponível' });
      }
      if (!projectId || projectId.length > 128 || !objective || objective.length > 500) {
        return sendJson(res, 400, { ok: false, code: 'REA_BLUEPRINT_INPUT_INVALID', error: 'Informe um projeto e um objetivo de até 500 caracteres' });
      }
      await app.controlPlane.authorize(tenantId, actorId, 'project:read');
      const saved = (await app.store.read())?.memories?.find((item) => item.tenantId === tenantId && item.projectId === projectId && item.stableKey === `rea-evidence:${projectId}` && item.status === 'ACTIVE');
      if (!saved) return sendJson(res, 409, { ok: false, code: 'REA_EVIDENCE_REQUIRED', projectId, error: 'Execute e persista a análise REA deste projeto antes de gerar um blueprint.' });
      let evidence;
      try { evidence = JSON.parse(saved.content); } catch { return sendJson(res, 500, { ok: false, code: 'REA_EVIDENCE_CORRUPT', projectId, error: 'A evidência REA salva não pôde ser lida' }); }
      if (evidence.projectId !== projectId || !/^rea_ev_[a-f0-9]{12}$/i.test(String(evidence.evidenceId || '')) || !/^[a-f0-9]{64}$/i.test(String(evidence.subjectSha256 || ''))) {
        return sendJson(res, 409, { ok: false, code: 'REA_EVIDENCE_MISMATCH', projectId, error: 'A evidência REA não corresponde ao projeto selecionado' });
      }
      const blueprint = reaEngine.generateDevBlueprint(projectId, objective, { ...body, evidence });
      return sendJson(res, 200, blueprint);
    }

    if (method === 'GET' && pathname === '/api/v2/rea/screens') {
      const projectId = url.searchParams.get('projectId') || null;
      return sendJson(res, 200, reaEngine.analyzeAllScreensAndFeatures(projectId));
    }

    if (method === 'GET' && pathname === '/api/v2/rea/couplings') {
      return sendJson(res, 200, reaEngine.analyzeEcosystemCouplings());
    }

    if (method === 'GET' && pathname === '/api/v2/rea/ai-connectors') {
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host || 'localhost:4400';
      return sendJson(res, 200, reaEngine.getUniversalAiConnectorCatalog(`${proto}://${host}`));
    }

    if (method === 'GET' && pathname === '/api/v2/rea/ecosystem-inventory') {
      return sendJson(res, 200, reaEngine.getGlobalEcosystemInventory());
    }

    if (method === 'GET' && pathname === '/api/v2/rea/reference-specs') {
      return sendJson(res, 200, reaEngine.getReferenceSystemsSpecs());
    }

    if (method === 'GET' && pathname === '/api/v2/rea/technology-matrix') {
      return sendJson(res, 200, reaEngine.getTechnologyEvaluationMatrix());
    }

    if (method === 'GET' && pathname === '/api/v2/rea/visual-patterns') {
      return sendJson(res, 200, reaEngine.getVisualPatternLibrary());
    }

    if (method === 'POST' && pathname === '/api/v2/rea/visual-analyze') {
      const body = await readJson(req).catch(() => ({}));
      return sendJson(res, 200, reaEngine.analyzeVisualDesign(body));
    }

    if (method === 'GET' && pathname === '/api/v2/rea/security-audit') {
      return sendJson(res, 200, reaEngine.runSecurityAndResilienceAudit());
    }

    if (method === 'GET' && pathname === '/api/v2/rea/orchestrations') {
      return sendJson(res, 200, { ok: true, orchestrations: reaEngine.orchestrations.slice(0, 25) });
    }

    if (method === 'POST' && pathname === '/api/v2/rea/orchestrate') {
      const body = await readJson(req).catch(() => ({}));
      const projectId = body.projectId || 'fenix-os';
      const objective = body.objective || body.prompt || 'Orquestrar evolução de sistema via REA';
      const result = await reaEngine.orchestrateSystem(projectId, objective, {
        tenantId: identity?.tenantId || 'grg',
        actorId: identity?.actorId || 'grg-admin',
        priority: body.priority || 'high',
        agent: body.agent || 'agent-architect',
        requireHumanApproval: Boolean(body.requireHumanApproval),
        timeoutMs: body.timeoutMs,
        maxRetries: body.maxRetries,
        acceptanceCriteria: body.acceptanceCriteria,
        force: Boolean(body.force),
        app,
      });
      return sendJson(res, result.deduplicated ? 200 : 201, result);
    }

    const orchActionMatch = pathname.match(/^\/api\/v2\/rea\/orchestrate\/([^/]+)\/(checkpoint|retry|cancel|approve)$/);
    if (method === 'POST' && orchActionMatch) {
      const orchestrationId = decodeURIComponent(orchActionMatch[1]);
      const action = orchActionMatch[2];
      const body = await readJson(req).catch(() => ({}));
      let out;
      if (action === 'checkpoint') {
        out = reaEngine.createOrchestrationCheckpoint(orchestrationId, {
          stepKey: body.stepKey || body.stepId,
          note: body.note || body.label || 'Checkpoint manual registrado pelo operador',
        });
      } else if (action === 'retry') {
        out = reaEngine.retryOrchestration(orchestrationId, {
          stepKey: body.stepKey || body.stepId || 'implement',
        });
      } else if (action === 'cancel') {
        out = reaEngine.cancelOrchestration(orchestrationId, body.reason || 'Cancelado pelo operador');
      } else if (action === 'approve') {
        out = reaEngine.approveOrchestration(
          orchestrationId,
          body.decision || 'APPROVE',
          identity?.actorId || body.actorId || 'grg-admin'
        );
      }
      const statusCode = out?.ok ? 200 : (out?.error === 'Orchestration not found' ? 404 : 400);
      return sendJson(res, statusCode, out);
    }
  }

  return false;
}

module.exports = {
  handleReaMemoryIndexRoutes,
};
