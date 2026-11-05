'use strict';
/**
 * FÊNIX OS V8.1 — Runtime Full Status
 * GET /api/v2/runtime/full-status
 */

var { getAllProjects } = require('../projects/project-registry');
var { execFile } = require('node:child_process');
var { resolveAIPlatformUrl } = require('../security/secret-resolver');
var { getWorldStateEngine } = require('../world-model/world-state-engine');

var serviceCache = new Map();
var pm2ListCache = { at: 0, list: null, inFlight: null };

async function checkService(url, timeout) {
  if (!url) return { status: 'N/A', latency: null };
  var cached = serviceCache.get(url);
  if (cached && (Date.now() - cached.at < 8000)) {
    return cached.value;
  }
  var t0 = Date.now();
  try {
    var res = await fetch(url, { signal: AbortSignal.timeout(timeout || 2500) });
    var latency = Date.now() - t0;
    var val = { status: res.ok ? 'ONLINE' : 'DEGRADED', latency: latency, httpStatus: res.status };
    serviceCache.set(url, { at: Date.now(), value: val });
    return val;
  } catch (e) {
    var errVal = { status: 'OFFLINE', latency: null, error: e.message };
    serviceCache.set(url, { at: Date.now(), value: errVal });
    return errVal;
  }
}

async function getPM2ListAsync() {
  if (pm2ListCache.list !== null && (Date.now() - pm2ListCache.at < 15000)) {
    return pm2ListCache.list;
  }
  if (pm2ListCache.inFlight) return pm2ListCache.inFlight;
  pm2ListCache.inFlight = new Promise(function(resolve) {
    execFile('pm2', ['jlist'], { timeout: 1500, windowsHide: true }, function(err, stdout) {
      if (err || !stdout) {
        pm2ListCache.list = [];
        pm2ListCache.at = Date.now();
        return resolve([]);
      }
      try {
        var parsed = JSON.parse(String(stdout));
        pm2ListCache.list = Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        pm2ListCache.list = [];
      }
      pm2ListCache.at = Date.now();
      resolve(pm2ListCache.list);
    });
  }).finally(function() {
    pm2ListCache.inFlight = null;
  });
  return pm2ListCache.inFlight;
}

async function getPM2Status(name) {
  try {
    var list = await getPM2ListAsync();
    if (!Array.isArray(list) || list.length === 0) {
      if (name === 'fenix-backend') return { status: 'NOT_VERIFIED', reason: 'PM2 não retornou uma lista de processos; o processo da API é medido separadamente' };
      return { status: 'NOT_FOUND' };
    }
    var proc = list.find(function(p) { return p.name === name; });
    if (!proc) return { status: 'NOT_FOUND' };
    return {
      status: proc.pm2_env && proc.pm2_env.status === 'online' ? 'ONLINE' : 'OFFLINE',
      pid: proc.pid,
      restarts: proc.pm2_env ? proc.pm2_env.restart_time : null,
      uptime: proc.pm2_env && proc.pm2_env.pm_uptime ? Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000) : null,
      memory: proc.monit ? proc.monit.memory : null,
      cpu: proc.monit ? proc.monit.cpu : null,
    };
  } catch (e) {
    return { status: 'UNKNOWN' };
  }
}

async function getFullStatus(app, tenantId) {
  var AIPLATFORM_URL = resolveAIPlatformUrl();
  var OLLAMA_URL = process.env.GRG_OLLAMA_DIRECT_URL || process.env.FENIX_OLLAMA_URL || '';

  var results = await Promise.all([
    checkService(AIPLATFORM_URL.replace(/\/$/, '') + '/health'),
    checkService(OLLAMA_URL ? OLLAMA_URL.replace(/\/$/, '') + '/api/tags' : null),
    getAllProjects().catch(function() { return []; }),
    getPM2Status('fenix-backend'),
    getPM2Status('zapflow-api'),
  ]);

  var fenixBackend = { status: 'ONLINE', source: 'current-process', pid: process.pid, uptime: Math.floor(process.uptime()) };
  var apiPlatform = results[0];
  var ollama = results[1];
  var projects = results[2];
  var fenixPM2 = results[3];
  var zapaiPM2 = results[4];

  var queueStats = { source: 'JobEngine', status: 'NOT_MEASURED', total: null, pendingConfirmation: null, queued: null, running: null, waiting: null, completed: null, failed: null, cancelled: null, paused: null, isPaused: null };
  var agentStats = { total: 0, idle: 0, working: 0 };
  var memoryStats = { entries: null };
  var worldBuildingsCount = null;

  try {
    var worldEngine = getWorldStateEngine();
    var worldAgentsList = worldEngine && worldEngine.agents ? Object.values(worldEngine.agents) : [];
    if (worldEngine && worldEngine.buildings) {
      worldBuildingsCount = Object.keys(worldEngine.buildings).length;
    }

    var state = app && app.store ? await app.store.read() : {};
    var scoped = function(items) { return (Array.isArray(items) ? items : []).filter(function(item) { return !tenantId || item.tenantId === tenantId; }); };
    var jobs = [];
    if (Array.isArray(state.runtimeJobs)) {
      jobs = scoped(state.runtimeJobs);
      var count = function(statuses) { return jobs.filter(function(job) { return statuses.includes(String(job.status || '').toUpperCase()); }).length; };
      queueStats = {
        source: 'JobEngine',
        status: 'MEASURED',
        total: jobs.length,
        pendingConfirmation: count(['AWAITING_APPROVAL', 'PENDING_CONFIRMATION', 'PENDING_APPROVAL']),
        queued: count(['QUEUED', 'WAITING', 'READY', 'RETRYING']),
        running: count(['RUNNING', 'IN_PROGRESS']),
        waiting: count(['PAUSED', 'AWAITING_APPROVAL', 'PENDING_CONFIRMATION', 'PENDING_APPROVAL']),
        completed: count(['COMPLETED', 'SUCCEEDED']),
        failed: count(['FAILED', 'DEAD_LETTER']),
        cancelled: count(['CANCELLED']),
        paused: count(['PAUSED']),
        isPaused: null,
      };
    }

    var catalog = [].concat(
      worldAgentsList,
      app && app.ceoAgent && app.ceoAgent.identity ? [app.ceoAgent.identity] : [],
      app && app.agentRegistry && typeof app.agentRegistry.list === 'function' ? app.agentRegistry.list() : [],
      scoped(state.agents),
      scoped(state.cognitiveAgents)
    );
    if (tenantId) {
      catalog = catalog.filter(function(agent) { return agent && agent.tenantId === tenantId; });
    }
    var seen = new Set();
    var dedupedAgents = catalog.filter(function(a) {
      var id = String((a && (a.id || a.agentId)) || '').toLowerCase();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    var runningJobAgentIds = new Set(
      jobs
        .filter(function(j) { return ['RUNNING', 'IN_PROGRESS'].includes(String(j.status || '').toUpperCase()); })
        .map(function(j) { return String(j.agent?.agentId || j.agent?.id || j.agentId || '').toLowerCase(); })
        .filter(Boolean)
    );

    agentStats.total = dedupedAgents.length;
    agentStats.working = dedupedAgents.filter(function(agent) {
      var id = String(agent.id || agent.agentId || '').toLowerCase();
      var st = String(agent.status || agent.state || '').toUpperCase();
      return runningJobAgentIds.has(id) || ['WORKING', 'BUSY', 'RUNNING', 'THINKING', 'TOOL_CALL'].includes(st);
    }).length;
    agentStats.idle = Math.max(0, agentStats.total - agentStats.working);

    if (Array.isArray(state.memories)) {
      memoryStats.entries = scoped(state.memories).filter(function(memory) { return memory.status === 'ACTIVE'; }).length;
    }
  } catch (e) {}

  var storage = app?.storageManager?.stats || {};
  var driverStatus = function(provider, expected) {
    return { status: provider === expected ? 'CONFIGURED_AT_BOOT' : provider ? 'LOCAL_ADAPTER' : 'UNKNOWN', adapter: provider || null };
  };

  return {
    timestamp: new Date().toISOString(),
    overall: process.env.FENIX_ENV === 'production' &&
      (storage.relationalProvider !== 'postgresql' || storage.cacheProvider !== 'redis' || storage.vectorProvider !== 'qdrant')
      ? 'DEGRADED' : 'ONLINE',
    services: {
      fenixOS: Object.assign({}, fenixBackend, { pm2: fenixPM2 }),
      apiPlatform: Object.assign({}, apiPlatform, { endpoint: AIPLATFORM_URL }),
      zapaiCRM: { pm2: zapaiPM2, status: zapaiPM2.status },
      ollama: Object.assign({}, ollama, { endpoint: OLLAMA_URL || null }),
    },
    infrastructure: {
      redis: driverStatus(storage.cacheProvider, 'redis'),
      postgres: driverStatus(storage.relationalProvider, 'postgresql'),
      qdrant: driverStatus(storage.vectorProvider, 'qdrant'),
    },
    runtime: {
      queue: queueStats,
      agents: agentStats,
      memory: memoryStats,
      uptime: Math.floor(process.uptime()),
    },
    projects: projects,
    city: {
      status: (app?.aiCity || worldBuildingsCount !== null) ? 'AVAILABLE' : 'UNKNOWN',
      buildings: worldBuildingsCount,
      projectsMapped: projects.length,
      activeAgents: agentStats.working,
      registeredAgents: agentStats.total,
    },
    aiProvider: {
      primary: process.env.FENIX_AI_DEFAULT_PROVIDER || null,
      model: process.env.GRG_AIPLATFORM_MODEL || process.env.FENIX_AI_DEFAULT_MODEL || null,
      endpoint: AIPLATFORM_URL,
    }
  };
}

async function handleRuntimeFullStatus(req, res, url, app, sendJson) {
  if (req.method === 'GET' && url.pathname === '/api/v2/runtime/full-status') {
    try {
      var status = await getFullStatus(app);
      return sendJson(res, 200, status);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }
  return false;
}

module.exports = {
  getFullStatus: getFullStatus,
  handleRuntimeFullStatus: handleRuntimeFullStatus,
};
