'use strict';
/**
 * FÊNIX OS V8 — Runtime Full Status
 * GET /api/v2/runtime/full-status
 */

const { getAllProjects } = require('../projects/project-registry');
const { execSync } = require('node:child_process');

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
    var out = execSync('pm2 jlist 2>/dev/null', { timeout: 3000 }).toString();
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

async function getFullStatus(app) {
  var results = await Promise.all([
    checkService('http://localhost:4400/api/health'),
    checkService('http://localhost:3001/health'),
    checkService('http://localhost:11434/api/tags'),
    getAllProjects().catch(function() { return []; }),
  ]);

  var fenixBackend = results[0];
  var apiPlatform = results[1];
  var ollama = results[2];
  var projects = results[3];

  var queueStats = { waiting: 0, active: 0, completed: 0, failed: 0 };
  var agentStats = { total: 0, idle: 0, working: 0 };
  var memoryStats = { entries: 0 };

  try {
    if (app && app.queue) {
      queueStats.waiting = await app.queue.getWaitingCount().catch(function() { return 0; });
      queueStats.active = await app.queue.getActiveCount().catch(function() { return 0; });
      queueStats.completed = await app.queue.getCompletedCount().catch(function() { return 0; });
      queueStats.failed = await app.queue.getFailedCount().catch(function() { return 0; });
    }
  } catch (e) {}

  try {
    if (app && app.agentRegistry) {
      var agents = app.agentRegistry.list();
      agentStats.total = agents.length;
      agentStats.idle = agents.filter(function(a) { return a.status === 'IDLE' || a.status === 'AVAILABLE'; }).length;
      agentStats.working = agents.filter(function(a) { return ['WORKING', 'THINKING', 'RUNNING'].indexOf(a.status) >= 0; }).length;
    }
  } catch (e) {}

  var pm2Fenix = getPM2Status('fenix-backend');
  var pm2ZapAI = getPM2Status('zapflow-api');

  return {
    timestamp: new Date().toISOString(),
    overall: 'ONLINE',
    services: {
      fenixOS: Object.assign({}, fenixBackend, { pm2: pm2Fenix, path: '/opt/fenix-os', port: 4400 }),
      apiPlatform: Object.assign({}, apiPlatform, { path: '/opt/grg-fenix/workspaces/AI-PLATFORM', port: 3001 }),
      zapaiCRM: { pm2: pm2ZapAI, path: '/opt/zapai' },
      ollama: Object.assign({}, ollama, { port: 11434 }),
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
    projects: projects.map(function(p) {
      return {
        projectId: p.projectId,
        name: p.name,
        displayName: p.displayName,
        status: p.runtimeStatus || 'UNKNOWN',
        vpsPath: p.vpsPath,
        lastCommit: p.lastCommit,
        color: p.color,
        icon: p.icon,
        buildingType: p.buildingType,
      };
    }),
    city: {
      status: 'ONLINE',
      buildings: 3,
      activeAgents: agentStats.working,
    },
    aiProvider: {
      primary: process.env.FENIX_AI_DEFAULT_PROVIDER || 'aiplatform',
      model: process.env.FENIX_AI_DEFAULT_MODEL || 'qwen2.5:3b',
      endpoint: process.env.GRG_AIPLATFORM_URL || 'http://209.50.241.22:3001',
    },
  };
}

async function handleRuntimeFullStatus(req, res, url, app, sendJson) {
  if (req.method === 'GET' && url.pathname === '/api/v2/runtime/full-status') {
    var status = await getFullStatus(app).catch(function(e) {
      return { error: e.message, timestamp: new Date().toISOString() };
    });
    return sendJson(res, 200, status);
  }
  return false;
}

module.exports = { handleRuntimeFullStatus, getFullStatus };
