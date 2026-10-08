'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const UNAVAILABLE = 'UNAVAILABLE';

function sendUnavailable(sendJson, res, field, reason) {
  return sendJson(res, 503, {
    ok: false,
    status: UNAVAILABLE,
    source: 'unavailable',
    [field]: null,
    reason,
  });
}

async function listProjects(app, tenantId, actorId) {
  if (!app?.projectKernel?.list) throw new Error('ProjectKernel indisponível');
  const projects = await app.projectKernel.list(tenantId, actorId);
  if (!Array.isArray(projects)) throw new Error('ProjectKernel retornou um catálogo inválido');
  return projects;
}

async function listMissions(app, tenantId, actorId) {
  if (!app?.missions?.list) throw new Error('MissionKernel indisponível');
  const missions = await app.missions.list(tenantId, actorId);
  if (!Array.isArray(missions)) throw new Error('MissionKernel retornou um catálogo inválido');
  return missions;
}

async function getTenantState(app, tenantId) {
  if (!app?.store?.read) throw new Error('Armazenamento persistente indisponível');
  const state = await app.store.read();
  const scoped = (records) => (Array.isArray(records) ? records : []).filter((item) => item?.tenantId === tenantId);
  return {
    jobs: scoped(state.runtimeJobs),
    agents: scoped(state.cognitiveAgents),
  };
}

function countStatus(records, statuses) {
  return records.filter((record) => statuses.has(String(record.status || '').toUpperCase())).length;
}

async function getObservatorySummary(app, tenantId, actorId) {
  const startedAt = Date.now();
  const health = app?.health?.check ? await app.health.check() : null;
  const [state, projects] = await Promise.all([
    getTenantState(app, tenantId),
    listProjects(app, tenantId, actorId),
  ]);
  const healthStatus = String(health?.status || 'UNKNOWN').toUpperCase();
  const status = ['HEALTHY', 'ONLINE', 'READY'].includes(healthStatus) ? 'HEALTHY'
    : healthStatus === 'UNKNOWN' ? 'PARTIAL' : healthStatus;

  return {
    ok: true,
    status,
    source: 'measured',
    services: {
      backend: 'ONLINE',
      kernel: app.runtimeKernel ? 'ONLINE' : null,
      worker: null,
      supervisor: null,
    },
    metrics: {
      totalProjects: projects.length,
      totalAgents: state.agents.length,
      jobsTotal: state.jobs.length,
      queuedJobs: countStatus(state.jobs, new Set(['QUEUED', 'PENDING', 'AWAITING_APPROVAL'])),
      runningJobs: countStatus(state.jobs, new Set(['RUNNING', 'IN_PROGRESS'])),
      failedJobs: countStatus(state.jobs, new Set(['FAILED', 'DEAD_LETTER'])),
      activeViews: null,
      registeredComponents: null,
      measuredLatencyMs: Date.now() - startedAt,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function getScreenRegistry() {
  const shellPath = path.resolve(__dirname, '../../public/index.html');
  const shell = await fs.readFile(shellPath, 'utf8');
  const screenIds = [...new Set([...shell.matchAll(/\bdata-view=["']([a-z0-9_-]+)["']/gi)].map((match) => match[1]))];
  const screens = screenIds.map((screenId) => ({
    screenId,
    title: screenId,
    route: `#${screenId}`,
    purpose: null,
    readEndpoints: null,
    maturityLevel: 'UNVERIFIED',
  }));
  if (!screens.length) throw new Error('Manifesto não contém telas');
  return { screens, source: 'public/index.html' };
}

async function handleObservatoryRoutes(req, res, url, app, sendJson, readJson, authContext = {}) {
  const { tenantId = 'grg', actorId = 'grg-admin' } = authContext;
  const { method } = req;
  const { pathname } = url;

  if (method === 'POST' && pathname === '/api/v2/observatory/query') {
    const body = await readJson(req);
    const query = String(body?.query || body?.entityId || '').trim();
    if (!query) return sendJson(res, 400, { ok: false, error: 'Consulta obrigatória.' });
    if (!app?.memory?.query) return sendUnavailable(sendJson, res, 'result', 'Serviço de memória indisponível.');
    try {
      const result = await app.memory.query(tenantId, actorId, query, { limit: 10 });
      return sendJson(res, 200, { ok: true, status: 'SEARCHED', source: 'memory', result });
    } catch (error) {
      return sendJson(res, 503, { ok: false, status: UNAVAILABLE, source: 'memory', error: error.message });
    }
  }

  if (method === 'POST' && pathname === '/api/v2/observatory/audit') {
    return sendUnavailable(sendJson, res, 'audit', 'Auditoria global não está implementada; nenhum snapshot foi gerado.');
  }

  if (method !== 'GET') return false;

  if (pathname === '/api/v2/reality/score') {
    return sendJson(res, 200, {
      ok: true,
      score: null,
      status: 'NOT_EVALUATED',
      source: 'unavailable',
      reason: 'A auditoria de realidade ainda não calculou um score verificável.',
      verifiedAt: null,
    });
  }

  if (pathname === '/api/v2/observatory/summary') {
    try {
      return sendJson(res, 200, await getObservatorySummary(app, tenantId, actorId));
    } catch (error) {
      return sendJson(res, 503, { ok: false, status: UNAVAILABLE, source: 'unavailable', reason: 'Leitura de runtime, projetos ou persistência indisponível.' });
    }
  }

  if (pathname === '/api/v2/observatory/twins/project' || pathname.startsWith('/api/v2/observatory/twins/project/')) {
    try {
      const projects = await listProjects(app, tenantId, actorId);
      const projectId = pathname.split('/').pop();
      const selected = pathname.endsWith('/project') ? projects : projects.find((project) => project.id === decodeURIComponent(projectId));
      if (!selected && !pathname.endsWith('/project')) {
        return sendJson(res, 404, { ok: false, status: 'NOT_FOUND', project: null });
      }
      return sendJson(res, 200, { ok: true, projects: selected ? [selected] : projects, source: 'project-kernel' });
    } catch (error) {
      return sendUnavailable(sendJson, res, 'projects', 'ProjectKernel indisponível ou catálogo inválido.');
    }
  }

  if (pathname === '/api/v2/observatory/twins/screen') {
    try {
      const registry = await getScreenRegistry();
      return sendJson(res, 200, {
        ok: true,
        status: 'REGISTERED',
        source: registry.source,
        screens: registry.screens,
        count: registry.screens.length,
      });
    } catch (error) {
      return sendUnavailable(sendJson, res, 'screens', error.message);
    }
  }

  if (pathname === '/api/v2/observatory/visual-dna') {
    return sendUnavailable(sendJson, res, 'visualTwins', 'Não há auditoria visual persistida disponível.');
  }

  if (pathname === '/api/v2/observatory/unknowns') {
    return sendUnavailable(sendJson, res, 'unknowns', 'A varredura de desconhecidos não foi executada.');
  }

  if (pathname === '/api/v2/observatory/gaps') {
    return sendUnavailable(sendJson, res, 'gaps', 'A auditoria de lacunas não foi executada.');
  }

  if (pathname === '/api/v2/observatory/evolution') {
    return sendUnavailable(sendJson, res, 'backlog', 'O estado do ciclo de evolução não está exposto pelo runtime.');
  }

  if (pathname === '/api/v2/observatory/data-lineage') {
    return sendUnavailable(sendJson, res, 'lineages', 'Não há catálogo de linhagem de dados publicado.');
  }

  if (pathname === '/api/v2/observatory/api-trace') {
    return sendUnavailable(sendJson, res, 'traces', 'Não há rastreamento de chamadas publicado.');
  }

  if (pathname === '/api/v2/observatory/element-inspector') {
    return sendUnavailable(sendJson, res, 'element', 'A inspeção de elementos requer uma sessão de navegador instrumentada.');
  }

  if (pathname === '/api/v2/observatory/component-graph') {
    return sendUnavailable(sendJson, res, 'graph', 'Não há grafo de componentes publicado para esta tela.');
  }

  if (pathname === '/api/v2/public/projects' || pathname === '/api/v2/mirror/projects') {
    try {
      const projects = await listProjects(app, tenantId, actorId);
      return sendJson(res, 200, { ok: true, projects, count: projects.length, source: 'project-kernel' });
    } catch (error) {
      return sendUnavailable(sendJson, res, 'projects', 'ProjectKernel indisponível ou catálogo inválido.');
    }
  }

  if (pathname === '/api/v2/fenix/intelligence/missions') {
    try {
      const missions = await listMissions(app, tenantId, actorId);
      return sendJson(res, 200, { ok: true, missions, count: missions.length, source: 'mission-kernel' });
    } catch (error) {
      return sendUnavailable(sendJson, res, 'missions', 'MissionKernel indisponível ou catálogo inválido.');
    }
  }

  if (pathname === '/api/v2/autonomous/ecosystem-status' || pathname === '/api/v2/agent-runtime/status') {
    try {
      const { agents } = await getTenantState(app, tenantId);
      return sendJson(res, 200, {
        ok: true,
        status: 'PARTIAL',
        mode: 'UNVERIFIED',
        worker: { online: null, status: 'NOT_EXPOSED_BY_RUNTIME' },
        supervisor: { online: null, status: 'NOT_EXPOSED_BY_RUNTIME' },
        activeSquads: { active: null, available: null, blocked: null },
        agents: {
          registered: agents.length,
          working: countStatus(agents, new Set(['WORKING', 'BUSY', 'RUNNING'])),
          ready: countStatus(agents, new Set(['ACTIVE', 'READY', 'IDLE', 'ONLINE'])),
        },
        source: 'persisted-agent-state',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      return sendUnavailable(sendJson, res, 'agents', 'Estado persistido dos agentes indisponível.');
    }
  }

  // Git, absorption, mission events and swarm have authoritative handlers later
  // in the server's route chain. This module must not shadow them.
  return false;
}

module.exports = { handleObservatoryRoutes, getObservatorySummary, getScreenRegistry };
