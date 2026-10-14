'use strict';
/**
 * FÊNIX OS V8 — Event Bus + SSE Stream
 */

var EventEmitter = require('node:events');

function FenixEventBus() {
  EventEmitter.call(this);
  this.setMaxListeners(100);
  this.history = [];
  this.MAX_HISTORY = 200;
  this.clients = new Set();
}

FenixEventBus.prototype = Object.create(EventEmitter.prototype);
FenixEventBus.prototype.constructor = FenixEventBus;

FenixEventBus.prototype.emit = function(type, data) {
  if (data === undefined) data = {};
  var event = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    type: type,
    data: data,
    timestamp: new Date().toISOString(),
  };
  this.history.push(event);
  if (this.history.length > this.MAX_HISTORY) this.history.shift();

  var self = this;
  this.clients.forEach(function(client) {
    try {
      client.write('data: ' + JSON.stringify(event) + '\n\n');
    } catch (e) {
      self.clients.delete(client);
    }
  });

  EventEmitter.prototype.emit.call(this, type, event);
  EventEmitter.prototype.emit.call(this, '*', event);
  return true;
};

FenixEventBus.prototype.addSSEClient = function(res) {
  var self = this;
  this.clients.add(res);
  res.on('close', function() { self.clients.delete(res); });
  var recent = this.history.slice(-20);
  for (var i = 0; i < recent.length; i++) {
    try { res.write('data: ' + JSON.stringify(recent[i]) + '\n\n'); } catch (e) {}
  }
};

FenixEventBus.prototype.getHistory = function(limit, typeFilter) {
  var events = this.history;
  if (typeFilter) events = events.filter(function(e) { return e.type.startsWith(typeFilter); });
  return events.slice(-(limit || 50));
};

FenixEventBus.prototype.agentCreated = function(agent) { return this.emit('agent.created', agent); };
FenixEventBus.prototype.agentAssigned = function(agentId, jobId, projectId) { return this.emit('agent.assigned', { agentId: agentId, jobId: jobId, projectId: projectId }); };
FenixEventBus.prototype.agentStarted = function(agentId, jobId) { return this.emit('agent.started', { agentId: agentId, jobId: jobId }); };
FenixEventBus.prototype.agentThinking = function(agentId, prompt) { return this.emit('agent.thinking', { agentId: agentId, promptLength: prompt ? prompt.length : 0 }); };
FenixEventBus.prototype.agentCompleted = function(agentId, jobId, result) { return this.emit('agent.completed', { agentId: agentId, jobId: jobId, success: !!result }); };
FenixEventBus.prototype.agentFailed = function(agentId, jobId, error) { return this.emit('agent.failed', { agentId: agentId, jobId: jobId, error: error ? error.message : 'unknown' }); };
FenixEventBus.prototype.agentIdle = function(agentId) { return this.emit('agent.idle', { agentId: agentId }); };

FenixEventBus.prototype.jobQueued = function(job) { return this.emit('job.queued', { jobId: job.id || job.jobId, type: job.type, projectId: job.projectId, priority: job.priority }); };
FenixEventBus.prototype.jobStarted = function(jobId, agentId) { return this.emit('job.started', { jobId: jobId, agentId: agentId }); };
FenixEventBus.prototype.jobCompleted = function(jobId, result) { return this.emit('job.completed', { jobId: jobId, success: true, hasResult: !!result }); };
FenixEventBus.prototype.jobFailed = function(jobId, error) { return this.emit('job.failed', { jobId: jobId, error: error ? error.message : 'unknown' }); };

FenixEventBus.prototype.missionCreated = function(missionId, title, projectId) { return this.emit('mission.created', { missionId: missionId, title: title, projectId: projectId }); };
FenixEventBus.prototype.missionStarted = function(missionId) { return this.emit('mission.started', { missionId: missionId }); };
FenixEventBus.prototype.missionCompleted = function(missionId) { return this.emit('mission.completed', { missionId: missionId }); };

FenixEventBus.prototype.projectUpdated = function(projectId, changes) { return this.emit('project.updated', { projectId: projectId, changes: changes }); };
FenixEventBus.prototype.projectDeployed = function(projectId) { return this.emit('project.deployed', { projectId: projectId }); };
FenixEventBus.prototype.gitCommit = function(projectId, commit) { return this.emit('github.commit', { projectId: projectId, commit: commit }); };
FenixEventBus.prototype.systemAlert = function(message, severity) { return this.emit('system.alert', { message: message, severity: severity || 'info' }); };
FenixEventBus.prototype.qwenRequest = function(model, tokens, latency) { return this.emit('ai.request', { model: model, tokens: tokens, latency: latency }); };

var globalBus = global.__fenixEventBus;
if (!globalBus) {
  globalBus = new FenixEventBus();
  global.__fenixEventBus = globalBus;
}

async function handleEventRoutes(req, res, url, sendJson) {
  if (req.method === 'GET' && url.pathname === '/api/v2/events/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    globalBus.addSSEClient(res);
    var hb = setInterval(function() {
      try { res.write(': heartbeat ' + new Date().toISOString() + '\n\n'); } catch (e) { clearInterval(hb); }
    }, 15000);
    res.on('close', function() { clearInterval(hb); });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v2/events/history') {
    var limit = parseInt(url.searchParams.get('limit') || '50', 10);
    var type = url.searchParams.get('type') || null;
    return sendJson(res, 200, { ok: true, events: globalBus.getHistory(limit, type), total: globalBus.history.length });
  }

  return false;
}

module.exports = { FenixEventBus: FenixEventBus, globalBus: globalBus, handleEventRoutes: handleEventRoutes };
