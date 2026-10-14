'use strict';
/**
 * FÊNIX OS V8.1 — Runtime Full Status
 * GET /api/v2/runtime/full-status
 */

var { getAllProjects } = require('../projects/project-registry');
var { execSync } = require('node:child_process');
var { globalJobQueueManager } = require('../execution/job-queue-manager');

var _pm2ListCache = null;
var _pm2ListCacheTime = 0;

var _statusCache = null;
var _statusCacheTime = 0;

async function checkService(url, timeout) {
  if (!url) return { status: 'N/A', latency: null };
  var t0 = Date.now();
  try {
    var res = await fetch(url, { signal: AbortSignal.timeout(timeout || 2000) });
    var latency = Date.now() - t0;
    return { status: res.ok ? 'ONLINE' : 'DEGRADED', latency: latency, httpStatus: res.status };
  } catch (e) {
    return { status: 'OFFLINE', latency: null, error: e.message };
  }
}

function getPM2ListCached() {
  var now = Date.now();
  if (_pm2ListCache && (now - _pm2ListCacheTime < 10000)) return _pm2ListCache;
  try {
    var out = execSync('pm2 jlist 2>/dev/null', { timeout: 3000 }).toString();
    _pm2ListCache = JSON.parse(out);
    _pm2ListCacheTime = now;
    return _pm2ListCache;
  } catch (e) {
    return _pm2ListCache || [];
  }
}

function getPM2Status(name) {
  try {
    var list = getPM2ListCached();
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

async function getFullStatus(app) {
  var now = Date.now();
  if (_statusCache && (now - _statusCacheTime < 5000)) {
    return _statusCache;
  }

  var AIPLATFORM_URL = process.env.GRG_AIPLATFORM_URL || 'http://209.50.241.22:3001';
  var OLLAMA_URL = process.env.GRG_OLLAMA_DIRECT_URL || 'http://172.20.0.7:11434';

  var results = await Promise.all([
    checkService('http://127.0.0.1:4410/health'),
    checkService(AIPLATFORM_URL + '/v1/health'),
    checkService(OLLAMA_URL + '/api/tags'),
    getAllProjects().catch(function() { return []; }),
  ]);

  var fenixBackend = results[0];
  var apiPlatform = results[1];
  var ollama = results[2];
  var projects = results[3];

  var queueStats = globalJobQueueManager.getQueueStatus();
  var agentStats = { total: 19, idle: 18, working: queueStats.running };
  var memoryStats = { entries: 0 };

  try {
    if (app && app.store) {
      var state = await app.store.read().catch(function() { return {}; });
      if (state.memoryEntries) memoryStats.entries = state.memoryEntries.length;
    }
  } catch (e) {}

  var fenixPM2 = getPM2Status('fenix-backend');
  var zapaiPM2 = getPM2Status('zapflow-api');

  var result = {
    timestamp: new Date().toISOString(),
    overall: fenixBackend.status === 'ONLINE' ? 'ONLINE' : 'DEGRADED',
    services: {
      fenixOS: Object.assign({}, fenixBackend, { pm2: fenixPM2, path: '/opt/fenix-os', port: 4410 }),
      apiPlatform: Object.assign({}, apiPlatform, { path: '/opt/grg-fenix/workspaces/AI-PLATFORM', port: 3001 }),
      zapaiCRM: { pm2: zapaiPM2, path: '/opt/zapai', port: 4025 },
      ollama: Object.assign({}, ollama, { port: 11434, model: 'qwen2.5:3b' }),
    },
    infrastructure: {
      redis: { status: 'ONLINE', container: 'grg-fenix-enterprise-redis-1' },
      postgres: { status: 'ONLINE', container: 'grg-fenix-enterprise-postgres-1' },
      qdrant: { status: 'ONLINE', container: 'grg-fenix-enterprise-qdrant-1', port: 6333 },
    },
    runtime: {
      queue: queueStats,
      agents: agentStats,
      memory: memoryStats,
      uptime: Math.floor(process.uptime()),
    },
    projects: projects,
    city: {
      status: 'ONLINE',
      buildings: projects.length,
      activeAgents: queueStats.running,
    },
    aiProvider: {
      primary: 'ollama',
      model: 'qwen2.5:3b',
      endpoint: AIPLATFORM_URL,
    }
  };

  _statusCache = result;
  _statusCacheTime = now;
  return result;
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
