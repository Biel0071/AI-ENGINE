'use strict';

/**
 * FÊNIX OS — COMPANY BRAIN & CEO API ROUTES
 *
 * Expõe endpoints RESTful autenticados para Company Brain, CEO Agent,
 * Delegação de Tarefas, Telemetria Factual e Evolution Lab.
 */

async function handleCompanyBrainRoutes(req, res, url, app, sendJson, readJson, identity) {
  const { tenantId, actorId } = identity;
  const method = req.method;
  const pathname = url.pathname;

  if (!pathname.startsWith('/api/v2/company')) {
    return false;
  }

  const companyBrain = app.companyBrain;
  const ceoAgent = app.ceoAgent;
  const evolutionLab = app.evolutionLab;

  if (!companyBrain || !ceoAgent) {
    return sendJson(res, 503, { error: 'Company Brain ou CEO Agent não inicializados' });
  }

  // ─── 1. EMPRESA (GET / POST) ──────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/v2/company') {
    const company = await companyBrain.getCompany(tenantId);
    return sendJson(res, 200, company);
  }

  if (method === 'GET' && pathname === '/api/v2/company/list') {
    const companies = await companyBrain.listCompanies(tenantId);
    return sendJson(res, 200, { ok: true, source: 'CompanyBrain', count: companies.length, companies });
  }

  if (method === 'GET' && pathname.startsWith('/api/v2/company/info/')) {
    const companyId = decodeURIComponent(pathname.replace('/api/v2/company/info/', ''));
    const company = await companyBrain.getCompany(tenantId, companyId);
    if (!company) {
      return sendJson(res, 404, { ok: false, error: `Empresa '${companyId}' não encontrada` });
    }
    return sendJson(res, 200, { ok: true, source: 'CompanyBrain', company });
  }

  if (method === 'GET' && pathname.startsWith('/api/v2/company/by-project/')) {
    const projectId = decodeURIComponent(pathname.replace('/api/v2/company/by-project/', ''));
    const company = await companyBrain.getCompanyByProjectId(tenantId, projectId);
    return sendJson(res, 200, { ok: true, source: 'CompanyBrain', projectId, company });
  }

  if (method === 'POST' && pathname === '/api/v2/company') {
    const body = await readJson(req);
    const company = await companyBrain.createCompany(tenantId, body);
    return sendJson(res, 201, company);
  }

  // ─── 2. TELEMETRIA CONSOLIDADA ────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/v2/company/telemetry') {
    const telemetry = await companyBrain.getTelemetry(tenantId);
    return sendJson(res, 200, telemetry);
  }

  // ─── 3. HIERARQUIA DINÂMICA ───────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/v2/company/hierarchy') {
    const hierarchy = await companyBrain.getHierarchy(tenantId);
    return sendJson(res, 200, hierarchy);
  }

  // ─── 4. DEPARTAMENTOS ────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/v2/company/departments') {
    const company = await companyBrain.getCompany(tenantId);
    const departments = companyBrain.getDepartments(tenantId, company.companyId, company);
    return sendJson(res, 200, { departments });
  }

  if (method === 'POST' && pathname === '/api/v2/company/departments/propose') {
    const body = await readJson(req);
    const company = await companyBrain.getCompany(tenantId);
    const result = await companyBrain.proposeDepartment(tenantId, company.companyId, {
      department: body.department,
      reason: body.reason,
      need: body.need,
      actorId
    });
    return sendJson(res, 200, result);
  }

  // ─── 5. CEO AGENT STATUS & PERFIL ─────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/v2/company/ceo') {
    const company = await companyBrain.getCompany(tenantId);
    return sendJson(res, 200, {
      identity: ceoAgent.identity,
      permissions: ceoAgent.permissions,
      tools: ceoAgent.tools,
      company: { id: company.companyId, name: company.name, status: company.status },
      status: 'ACTIVE'
    });
  }

  // ─── 6. CHAT COM O CEO (CONVERSA DIRETA) ──────────────────────────────────
  if (method === 'POST' && pathname === '/api/v2/company/ceo/chat') {
    const body = await readJson(req);
    const message = body.message || body.prompt || '';
    if (!message.trim()) return sendJson(res, 400, { error: 'Mensagem obrigatória' });

    const company = await companyBrain.getCompany(tenantId);
    const response = await ceoAgent.chat(tenantId, company.companyId, message, actorId);
    return sendJson(res, 200, response);
  }

  // ─── 7. DELEGAÇÃO DE TAREFAS (CEO -> SUBAGENTE) ───────────────────────────
  if (method === 'POST' && pathname === '/api/v2/company/ceo/delegate') {
    const body = await readJson(req);
    const subagentId = body.subagentId || body.agentId;
    const objective = body.objective || body.task;
    if (!subagentId || !objective) {
      return sendJson(res, 400, { error: 'subagentId e objective são obrigatórios' });
    }

    const company = await companyBrain.getCompany(tenantId);
    const result = await ceoAgent.delegateJob(tenantId, company.companyId, {
      subagentId,
      objective,
      payload: body.payload || {},
      permission: body.permission || 'EXECUTE'
    });
    return sendJson(res, 201, result);
  }

  // ─── 8. CANAL INTERNO FÊNIX ↔ CEO (CEO REPORT) ───────────────────────────
  if (method === 'GET' && pathname === '/api/v2/company/ceo/report') {
    const company = await companyBrain.getCompany(tenantId);
    const report = await ceoAgent.generateReport(tenantId, company.companyId);
    return sendJson(res, 200, report);
  }

  // ─── 9. LOOP DE OBSERVAÇÃO (OBSERVE -> ANALYZE -> DECIDE -> ACT) ──────────
  if (method === 'POST' && pathname === '/api/v2/company/ceo/observe') {
    const body = await readJson(req);
    const company = await companyBrain.getCompany(tenantId);
    const cycle = await ceoAgent.runObservationCycle(tenantId, company.companyId, body.trigger || 'manual_trigger');
    return sendJson(res, 200, cycle);
  }

  // ─── 10. PROMOÇÃO DE SUBAGENTES ───────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/v2/company/subagents/promote') {
    const candidate = await readJson(req);
    const company = await companyBrain.getCompany(tenantId);
    const promoted = await companyBrain.promoteSubagent(tenantId, company.companyId, candidate);
    return sendJson(res, 201, promoted);
  }

  // ─── 11. EVOLUTION LAB ────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/v2/company/evolution/hypotheses') {
    const state = await app.store.read();
    return sendJson(res, 200, { hypotheses: state.evolutionHypotheses || [] });
  }

  if (method === 'POST' && pathname === '/api/v2/company/evolution/hypotheses') {
    const body = await readJson(req);
    if (!evolutionLab) return sendJson(res, 503, { error: 'Evolution Lab indisponível' });
    const hypothesis = await evolutionLab.registerHypothesis(tenantId, body);
    return sendJson(res, 201, hypothesis);
  }

  if (method === 'POST' && pathname === '/api/v2/company/evolution/experiment') {
    const body = await readJson(req);
    if (!evolutionLab) return sendJson(res, 503, { error: 'Evolution Lab indisponível' });
    const experiment = await evolutionLab.runExperiment(tenantId, body);
    return sendJson(res, 201, experiment);
  }

  if (method === 'GET' && pathname === '/api/v2/company/evolution/scientist') {
    if (!evolutionLab) return sendJson(res, 503, { error: 'Evolution Lab indisponível' });
    const analysis = evolutionLab.getScientistAnalysis(url.searchParams.get('domain'));
    return sendJson(res, 200, analysis);
  }

  // ─── 12. API ECONOMY ──────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/v2/company/economy') {
    const ecoReport = app.tokenEconomy ? app.tokenEconomy.getEfficiencyReport() : null;
    if (ecoReport) {
      return sendJson(res, 200, {
        apiCalls: ecoReport.metrics.totalCalls,
        localCalls: ecoReport.metrics.localModelCalls,
        cacheHits: ecoReport.metrics.cacheHits,
        patternHits: ecoReport.metrics.patternHits,
        memoryHits: ecoReport.metrics.memoryHits,
        tokensTotal: null,
        estimatedTokensTotal: ecoReport.metrics.estimatedTokensInput + ecoReport.metrics.estimatedTokensOutput,
        tokensSaved: ecoReport.metrics.totalTokensSaved,
        estimatedTokensSaved: ecoReport.metrics.estimatedTokensSaved,
        apiCallsAvoided: ecoReport.metrics.apiCallsAvoided,
        KNOWLEDGE_REUSE_RATE: ecoReport.KNOWLEDGE_REUSE_RATE,
        TOKEN_SAVINGS_RATE: ecoReport.TOKEN_SAVINGS_RATE,
        costUsd: null,
        estimatedCostUsd: ecoReport.metrics.totalEstimatedCostUsd,
        costSavedUsd: ecoReport.metrics.totalCostSavedUsd,
        estimatedCostSavedUsd: ecoReport.metrics.totalEstimatedCostSavedUsd,
        measurementStatus: ecoReport.measurementStatus,
        usagePrecision: ecoReport.usagePrecision,
        baselineComparison: ecoReport.baselineComparison,
        routingOrder: ['CACHE', 'PATTERN_LIBRARY', 'MEMORY_FABRIC', 'GRAPH_BRAIN', 'PROJECT_DNA', 'LOCAL_MODEL', 'EXTERNAL_API']
      });
    }

    const state = await app.store.read();
    const calls = state.aiCalls || [];
    const cache = state.aiCache || [];
    const totalTokens = calls.reduce((acc, c) => acc + (c.tokensTotal || c.tokens || 0), 0);
    const cacheHits = cache.length;
    return sendJson(res, 200, {
      apiCalls: calls.filter((c) => c.provider !== 'cache' && c.provider !== 'local').length,
      localCalls: calls.filter((c) => c.provider === 'local' || c.provider === 'ollama').length,
      cacheHits,
      tokensTotal: totalTokens,
      tokensTotal: null,
      estimatedTokensTotal: totalTokens,
      tokensSaved: null,
      estimatedTokensSaved: null,
      apiCallsAvoided: null,
      measurementStatus: { savings: 'UNMEASURED', baseline: 'UNMEASURED' },
      costUsd: null,
      estimatedCostUsd: Number((totalTokens * 0.000002).toFixed(4)),
      routingOrder: ['CACHE', 'PATTERN_LIBRARY', 'MEMORY_FABRIC', 'LOCAL_MODEL', 'API']
    });
  }

  // ─── 13. PROJECT ABSORPTION & REUSABLE KNOWLEDGE (Prompt Req #1) ───────────
  if (method === 'POST' && pathname === '/api/v2/company/projects/absorb') {
    if (!app.absorptionEngine) return sendJson(res, 503, { error: 'Project Absorption Engine indisponível' });
    const body = await readJson(req);
    const fs = require('node:fs');
    const { resolveProjectWorkspace } = require('../projects/project-workspace-resolver');
    const { getProjectById } = require('../projects/project-registry');
    const localProj = require('../projects/local-project-catalog').getLocalProjectById(body.projectId);
    if (localProj?.entryFile) return sendJson(res, 409, { error: 'O Screen DNA de arquivo individual ainda não está disponível; a pasta vizinha não será absorvida', projectId: body.projectId });
    const regProj = getProjectById(body.projectId) || localProj;
    const st = app.store?.read && body.projectId ? await app.store.read() : null;
    const storedProj = (st?.projects || []).find((p) => (p.id || p.projectId) === body.projectId && p.tenantId === tenantId) || null;
    const workspacePath = resolveProjectWorkspace(storedProj || localProj, regProj);
    if (!workspacePath || !fs.existsSync(workspacePath)) return sendJson(res, 404, { error: 'Workspace canônico indisponível para este projeto', projectId: body.projectId });
    if (body.workspacePath && require('node:path').resolve(body.workspacePath) !== require('node:path').resolve(workspacePath)) {
      return sendJson(res, 403, { error: 'O caminho informado não corresponde ao workspace registrado', projectId: body.projectId });
    }
    const report = await app.absorptionEngine.absorbProject({
      projectId: body.projectId,
      projectName: body.projectName,
      workspacePath,
      tenantId,
      actorId,
    });
    if (app.store?.update) {
      await app.store.update((state) => {
        state.projectAbsorptions = state.projectAbsorptions && typeof state.projectAbsorptions === 'object' ? state.projectAbsorptions : {};
        state.projectAbsorptions[report.projectId] = report;
        if (body.projectId) state.projectAbsorptions[body.projectId] = report;
        return state;
      });
    }
    return sendJson(res, 200, report);
  }

  if (method === 'GET' && pathname.startsWith('/api/v2/company/projects/') && pathname.endsWith('/absorption')) {
    if (!app.absorptionEngine) return sendJson(res, 503, { error: 'Project Absorption Engine indisponível' });
    const pId = decodeURIComponent(pathname.slice('/api/v2/company/projects/'.length, -'/absorption'.length));
    let report = app.absorptionEngine.getAbsorbedProject(pId)
      || app.absorptionEngine.getAbsorbedProject(pId.toLowerCase())
      || (pId === 'api-platform-live' ? app.absorptionEngine.getAbsorbedProject('prj_api_platform') : null);
    if (!report && app.store?.read) {
      const state = await app.store.read();
      const map = state.projectAbsorptions && typeof state.projectAbsorptions === 'object' ? state.projectAbsorptions : {};
      report = map[pId] || map[pId.toLowerCase()] || (pId === 'api-platform-live' ? map.prj_api_platform : null) || null;
      if (report) {
        app.absorptionEngine.absorbedProjects.set(pId, report);
      }
    }
    if (!report) {
      const fs = require('node:fs');
      const { resolveProjectWorkspace } = require('../projects/project-workspace-resolver');
      const { getProjectById } = require('../projects/project-registry');
      const localProj = require('../projects/local-project-catalog').getLocalProjectById(pId);
      if (localProj?.entryFile) return sendJson(res, 409, { error: 'Projeto de arquivo individual não pode absorver a pasta vizinha', projectId: pId });
      const regProj = getProjectById(pId) || localProj;
      let storedProj = null;
      if (app.store?.read) {
        const st = await app.store.read();
        storedProj = (st.projects || []).find((p) => (p.id || p.projectId) === pId && p.tenantId === tenantId) || null;
      }
      const workspacePath = resolveProjectWorkspace(storedProj, regProj);
      if (workspacePath && fs.existsSync(workspacePath)) {
        report = await app.absorptionEngine.absorbProject({
          projectId: pId,
          projectName: storedProj?.name || regProj?.name || pId,
          workspacePath,
          tenantId,
          actorId,
        });
        if (app.store?.update) {
          await app.store.update((state) => {
            state.projectAbsorptions = state.projectAbsorptions && typeof state.projectAbsorptions === 'object' ? state.projectAbsorptions : {};
            state.projectAbsorptions[report.projectId] = report;
            state.projectAbsorptions[pId] = report;
            return state;
          });
        }
      }
    }
    if (!report) {
      return sendJson(res, 404, { error: `Projeto '${pId}' ainda não foi absorvido`, projectId: pId });
    }
    return sendJson(res, 200, report);
  }

  if (method === 'GET' && pathname === '/api/v2/company/screens') {
    if (!app.absorptionEngine) return sendJson(res, 503, { error: 'Project Absorption Engine indisponível' });
    const allScreens = [];
    for (const [projId, rep] of app.absorptionEngine.absorbedProjects.entries()) {
      for (const scr of (rep.screens || [])) {
        allScreens.push({
          ...scr,
          projectId: projId,
          projectName: rep.projectName,
        });
      }
    }
    return sendJson(res, 200, { screens: allScreens, total: allScreens.length, measuredAt: new Date().toISOString() });
  }

  if (method === 'GET' && pathname === '/api/v2/company/learning-stats') {
    const stats = app.absorptionEngine ? app.absorptionEngine.getAccumulatedStats() : {};
    const economy = app.tokenEconomy ? app.tokenEconomy.getEfficiencyReport() : {};
    return sendJson(res, 200, {
      source: 'ProjectAbsorptionEngine+TokenEconomyEngine',
      measuredAt: new Date().toISOString(),
      absorption: stats,
      economy,
    });
  }

  // ─── 14. COMPONENT RECONSTRUCTION & LEARNING LOOP (Prompt Req #6 & #7) ──────
  if (method === 'POST' && pathname === '/api/v2/company/reconstruct') {
    if (!app.reconstructionEngine) return sendJson(res, 503, { error: 'Screen Reconstruction Engine indisponível' });
    const body = await readJson(req);
    const result = await app.reconstructionEngine.reconstruct({
      targetName: body.targetName,
      prompt: body.prompt,
      tenantId,
      actorId,
      projectId: body.projectId,
      forceCold: Boolean(body.forceCold),
    });
    return sendJson(res, 200, result);
  }

  if (method === 'POST' && pathname === '/api/v2/company/learning-loop') {
    if (!app.reconstructionEngine) return sendJson(res, 503, { error: 'Screen Reconstruction Engine indisponível' });
    const body = await readJson(req);
    const report = await app.reconstructionEngine.executeDualLearningLoop({
      targetName: body.targetName,
      prompt: body.prompt,
      tenantId,
      actorId,
      projectId: body.projectId,
    });
    return sendJson(res, 200, report);
  }

  return false;
}

module.exports = { handleCompanyBrainRoutes };
