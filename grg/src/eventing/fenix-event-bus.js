'use strict';
/**
 * FÊNIX OS V8.2 — Event Bus + SSE Stream
 * Real SSE broadcast for Fast Lane, Job Queue, Models, Agent Actions, and City.
 */

var EventEmitter = require('node:events');

function FenixEventBus() {
  EventEmitter.call(this);
  this.setMaxListeners(150);
  this.history = [];
  this.MAX_HISTORY = 300;
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
  var recent = this.history.slice(-25);
  for (var i = 0; i < recent.length; i++) {
    try { res.write('data: ' + JSON.stringify(recent[i]) + '\n\n'); } catch (e) {}
  }
};

FenixEventBus.prototype.getHistory = function(limit, typeFilter) {
  var events = this.history;
  if (typeFilter) events = events.filter(function(e) { return e.type.startsWith(typeFilter); });
  return events.slice(-(limit || 50));
};

// Agent lifecycle events (V8.2 City Runtime Projection)
FenixEventBus.prototype.agentCreated = function(agent) { return this.emit('agent.created', agent); };
FenixEventBus.prototype.agentAssigned = function(agentId, jobId, projectId, mission) {
  return this.emit('agent.assigned', { agentId: agentId, jobId: jobId, projectId: projectId, mission: mission });
};
FenixEventBus.prototype.agentNavigating = function(agentId, destination, action, jobId) {
  return this.emit('agent.navigating', { agentId: agentId, destination: destination, location: destination, action: action, jobId: jobId });
};
FenixEventBus.prototype.agentStarted = function(agentId, jobId) { return this.emit('agent.started', { agentId: agentId, jobId: jobId }); };
FenixEventBus.prototype.agentThinking = function(agentId, action, prompt) {
  return this.emit('agent.thinking', { agentId: agentId, action: action, promptLength: prompt ? prompt.length : 0 });
};
FenixEventBus.prototype.agentCompleted = function(agentId, jobId, result) { return this.emit('agent.completed', { agentId: agentId, jobId: jobId, success: !!result }); };
FenixEventBus.prototype.agentFailed = function(agentId, jobId, error) { return this.emit('agent.failed', { agentId: agentId, jobId: jobId, error: error ? (error.message || error) : 'unknown' }); };
FenixEventBus.prototype.agentIdle = function(agentId) { return this.emit('agent.idle', { agentId: agentId }); };

// Tool & Memory events (V8.2)
FenixEventBus.prototype.toolStarted = function(agentId, tool, action, jobId, projectId) {
  return this.emit('tool.started', { agentId: agentId, tool: tool, action: action, jobId: jobId, projectId: projectId, location: 'tool-station' });
};
FenixEventBus.prototype.toolCompleted = function(agentId, tool, action, jobId) {
  return this.emit('tool.completed', { agentId: agentId, tool: tool, action: action, jobId: jobId, location: 'tool-station' });
};
FenixEventBus.prototype.memoryWrite = function(agentId, action, jobId, projectId) {
  return this.emit('memory.write', { agentId: agentId, action: action, jobId: jobId, projectId: projectId, location: 'memory' });
};
FenixEventBus.prototype.memoryRead = function(agentId, action, jobId, projectId) {
  return this.emit('memory.read', { agentId: agentId, action: action, jobId: jobId, projectId: projectId, location: 'memory' });
};

// Job & Queue events (V8.1/V8.2)
FenixEventBus.prototype.chatResponse = function(data) { return this.emit('chat.response', data); };
FenixEventBus.prototype.jobCreated = function(job) { return this.emit('job.created', job); };
FenixEventBus.prototype.jobQueued = function(job) { return this.emit('job.queued', { jobId: job.id || job.jobId, type: job.type, projectId: job.projectId, priority: job.priority }); };
FenixEventBus.prototype.jobConfirmationRequired = function(job) { return this.emit('job.confirmation_required', job); };
FenixEventBus.prototype.jobStarted = function(jobId, agentId) { return this.emit('job.started', { jobId: jobId, agentId: agentId }); };
FenixEventBus.prototype.jobStep = function(jobId, stepName, progress) { return this.emit('job.step', { jobId: jobId, step: stepName, progress: progress }); };
FenixEventBus.prototype.modelSelected = function(model, provider, jobId) { return this.emit('model.selected', { model: model, provider: provider, jobId: jobId }); };
FenixEventBus.prototype.aiRequestStarted = function(jobId, model) { return this.emit('ai.request.started', { jobId: jobId, model: model }); };
FenixEventBus.prototype.aiRequestCompleted = function(jobId, model, tokens, latency) { return this.emit('ai.request.completed', { jobId: jobId, model: model, tokens: tokens, latency: latency }); };
FenixEventBus.prototype.jobCompleted = function(jobId, result) { return this.emit('job.completed', { jobId: jobId, success: true, hasResult: !!result }); };
FenixEventBus.prototype.jobFailed = function(jobId, error) { return this.emit('job.failed', { jobId: jobId, error: error ? (error.message || error) : 'unknown' }); };
FenixEventBus.prototype.jobCancelled = function(data) { return this.emit('job.cancelled', data); };
FenixEventBus.prototype.queuePaused = function(data) { return this.emit('queue.paused', data); };
FenixEventBus.prototype.queueResumed = function(data) { return this.emit('queue.resumed', data); };

// System / project / git events
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
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
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

module.exports = {
  FenixEventBus: FenixEventBus,
  globalBus: globalBus,
  handleEventRoutes: handleEventRoutes
};
