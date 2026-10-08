'use strict';
/**
 * FÊNIX OS V8.1 — Runtime Full Status
 * GET /api/v2/runtime/full-status
 */

var { getAllProjects } = require('../projects/project-registry');
var { execSync } = require('node:child_process');
var { resolveAIPlatformUrl } = require('../security/secret-resolver');

async function checkService(url, timeout) {
  if (!url) return { status: 'N/A', latency: null };
  var t0 = Date.now();
  try {
    var res = await fetch(url, { signal: AbortSignal.timeout(timeout || 3000) });
    var latency = Date.now() - t0;
    return { status: res.ok ? 'ONLINE' : 'DEGRADED', latency: latency, httpStatus: res.status };
  } catch (e) {
    return { status: 'OFFLINE', latency: null, error: e.message };
  }
}

function getPM2Status(name) {
  try {
    var out = execSync('pm2 jlist', { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    var list = JSON.parse(out);
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
  ]);

  var fenixBackend = { status: 'ONLINE', source: 'current-process', pid: process.pid, uptime: Math.floor(process.uptime()) };
  var apiPlatform = results[0];
  var ollama = results[1];
  var projects = results[2];

  var queueStats = { source: 'JobEngine', status: 'NOT_MEASURED', total: null, pendingConfirmation: null, queued: null, running: null, waiting: null, completed: null, failed: null, cancelled: null, paused: null, isPaused: null };
  var agentStats = { total: null, idle: null, working: null };
  var memoryStats = { entries: null };

  try {
    if (app && app.store) {
      var state = await app.store.read();
      var scoped = function(items) { return (Array.isArray(items) ? items : []).filter(function(item) { return !tenantId || item.tenantId === tenantId; }); };
      if (Array.isArray(state.runtimeJobs)) {
        var jobs = scoped(state.runtimeJobs);
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
      var agents = scoped(state.cognitiveAgents);
      agentStats.total = agents.length;
      agentStats.working = agents.filter(function(agent) { return ['WORKING', 'BUSY', 'RUNNING'].includes(String(agent.status || '').toUpperCase()); }).length;
      agentStats.idle = agents.filter(function(agent) { return ['ACTIVE', 'READY', 'IDLE', 'ONLINE'].includes(String(agent.status || '').toUpperCase()); }).length;
      memoryStats.entries = scoped(state.memories).filter(function(memory) { return memory.status === 'ACTIVE'; }).length;
    }
  } catch (e) {}

  var fenixPM2 = getPM2Status('fenix-backend');
  var zapaiPM2 = getPM2Status('zapflow-api');
  var storage = app?.storageManager?.stats || {};
  var driverStatus = function(provider, expected) {
    return { status: provider === expected ? 'CONNECTED_AT_BOOT' : provider ? 'LOCAL_ADAPTER' : 'UNKNOWN', adapter: provider || null };
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
      status: app?.aiCity ? 'AVAILABLE' : 'UNKNOWN',
      buildings: null,
      projectsMapped: projects.length,
      activeAgents: agentStats.working,
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
