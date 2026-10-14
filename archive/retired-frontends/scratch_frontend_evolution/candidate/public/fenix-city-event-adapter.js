/* FÊNIX City Event Adapter — V8.2 AI Conversation + Intelligent Execution Projection */
(function () {
  'use strict';
  const CITY_EVENT_MAP = Object.freeze({
    'agent.created': { visualState: 'IDLE', location: 'department' },
    'agent.online': { visualState: 'IDLE', location: 'department' },
    'agent.offline': { visualState: 'OFFLINE', location: 'department' },
    'agent.status.changed': { visualState: 'status', location: 'department' },
    'agent.assigned': { visualState: 'WORKING', location: 'command-center' },
    'agent.navigating': { visualState: 'WALKING', location: 'research' },
    'agent.walking': { visualState: 'WALKING', location: 'research' },
    'agent.started': { visualState: 'WORKING', location: 'execution' },
    'agent.thinking': { visualState: 'WORKING', location: 'research' },
    'tool.started': { visualState: 'WORKING', location: 'tool-station' },
    'tool.completed': { visualState: 'COMPLETED', location: 'tool-station' },
    'agent.tool.call': { visualState: 'WORKING', location: 'tool-station' },
    'agent.handoff': { visualState: 'HANDOFF', location: 'communication' },
    'agent.task.delegated': { visualState: 'HANDOFF', location: 'communication' },
    'memory.read': { visualState: 'MEMORY', location: 'memory' },
    'memory.write': { visualState: 'MEMORY', location: 'memory' },
    'agent.completed': { visualState: 'COMPLETED', location: 'execution' },
    'agent.failed': { visualState: 'ERROR', location: 'execution' },
    'agent.idle': { visualState: 'IDLE', location: 'department' },

    // Missions
    'mission.started': { visualState: 'WORKING', location: 'command-center' },
    'mission.created': { visualState: 'QUEUED', location: 'command-center' },
    'mission.completed': { visualState: 'COMPLETED', location: 'command-center' },
    'mission.failed': { visualState: 'ERROR', location: 'command-center' },
    'mission.paused': { visualState: 'WAITING', location: 'command-center' },
    'mission.resumed': { visualState: 'WORKING', location: 'command-center' },
    'mission.cancelled': { visualState: 'CANCELLED', location: 'command-center' },
    'mission.step.dispatched': { visualState: 'WORKING', location: 'execution' },
    'mission.step.completed': { visualState: 'COMPLETED', location: 'execution' },
    'mission.step.approval-required': { visualState: 'WAITING', location: 'approval' },
    'mission.step.reconciled': { visualState: 'RECOVERING', location: 'execution' },
    'mission.repair.created': { visualState: 'RECOVERING', location: 'execution' },

    // Job Queue real events (V8.2)
    'job.created': { visualState: 'QUEUED', location: 'command-center' },
    'job.queued': { visualState: 'QUEUED', location: 'command-center' },
    'job.confirmation_required': { visualState: 'WAITING', location: 'approval' },
    'job.started': { visualState: 'WORKING', location: 'execution' },
    'job.step': { visualState: 'WORKING', location: 'execution' },
    'runtime.job.running': { visualState: 'WORKING', location: 'execution' },
    'job.completed': { visualState: 'COMPLETED', location: 'execution' },
    'job.failed': { visualState: 'ERROR', location: 'execution' },
    'job.retrying': { visualState: 'RECOVERING', location: 'execution' },
    'runtime.job.repairing': { visualState: 'RECOVERING', location: 'execution' },
    'job.paused': { visualState: 'WAITING', location: 'execution' },
    'job.resumed': { visualState: 'WORKING', location: 'execution' },
    'job.cancelled': { visualState: 'CANCELLED', location: 'execution' },
    'queue.paused': { visualState: 'WAITING', location: 'command-center' },
    'queue.resumed': { visualState: 'WORKING', location: 'command-center' },
    'model.selected': { visualState: 'WORKING', location: 'command-center' },
    'ai.request.started': { visualState: 'WORKING', location: 'execution' },
    'ai.request.completed': { visualState: 'COMPLETED', location: 'execution' },
    'chat.response': { visualState: 'ONLINE', location: 'command-center' },

    // Subsystems
    'knowledge.read': { visualState: 'WORKING', location: 'knowledge' },
    'knowledge.write': { visualState: 'WORKING', location: 'knowledge' },
    'git.commit': { visualState: 'WORKING', location: 'git' },
    'git.push': { visualState: 'WORKING', location: 'git' },
    'browser.test.started': { visualState: 'TESTING', location: 'browser_qa' },
    'browser.test.completed': { visualState: 'COMPLETED', location: 'browser_qa' },
    'test.started': { visualState: 'TESTING', location: 'browser_qa' },
    'test.completed': { visualState: 'COMPLETED', location: 'browser_qa' },
    'database.query': { visualState: 'WORKING', location: 'database' },
    'human.required': { visualState: 'WAITING', location: 'approval' },
    'human.approval_required': { visualState: 'WAITING', location: 'approval' },
    'project.created': { visualState: 'ONLINE', location: 'command-center' },
    'project.health.changed': { visualState: 'status', location: 'command-center' },
    'connector.state.changed': { visualState: 'status', location: 'mcp' },
    'runtime.heartbeat': { visualState: 'ONLINE', location: 'command-center' }
  });

  window.FENIX = window.FENIX || {};
  window.FENIX.city = window.FENIX.city || { events: [], lastEvent: null, map: CITY_EVENT_MAP };

  document.addEventListener('fenix-live', (event) => {
    const detail = event.detail || {};
    const type = String(detail.type || detail.event || detail.name || '').toLowerCase();
    if (type === 'status' && detail.status) {
      window.FENIX.city.connectionStatus = String(detail.status).toUpperCase();
      document.dispatchEvent(new CustomEvent('fenix-city-connection', { detail: { status: window.FENIX.city.connectionStatus }, bubbles: true }));
      return;
    }
    if (!type || type === 'snapshot') return;

    let visual = CITY_EVENT_MAP[type];
    if (!visual) {
      if (type.startsWith('git.')) visual = { visualState: 'WORKING', location: 'git' };
      else if (type.startsWith('browser.') || type.startsWith('test.')) visual = { visualState: 'TESTING', location: 'browser_qa' };
      else if (type.startsWith('memory.')) visual = { visualState: 'MEMORY', location: 'memory' };
      else if (type.startsWith('knowledge.')) visual = { visualState: 'WORKING', location: 'knowledge' };
      else if (type.startsWith('mcp.')) visual = { visualState: 'WORKING', location: 'mcp' };
      else if (type.startsWith('database.') || type.startsWith('db.')) visual = { visualState: 'WORKING', location: 'database' };
      else if (type.startsWith('security.')) visual = { visualState: 'WORKING', location: 'security' };
      else if (type.startsWith('terminal.')) visual = { visualState: 'WORKING', location: 'terminal' };
      else if (type.startsWith('devops.') || type.startsWith('deploy.')) visual = { visualState: 'WORKING', location: 'devops' };
      else if (type.startsWith('data.')) visual = { visualState: 'WORKING', location: 'data' };
      else if (type.startsWith('agent.handoff') || type.includes('delegat')) visual = { visualState: 'HANDOFF', location: 'communication' };
      else return;
    }

    // Dynamic location override from payload
    var effectiveLoc = (detail.payload && (detail.payload.location || detail.payload.destination)) || detail.location || detail.destination || visual.location;
    var effectiveVisual = Object.assign({}, visual, { location: effectiveLoc });

    const projection = {
      type,
      visual: effectiveVisual,
      sourceEventId: detail.id || detail.eventId || detail.seq || null,
      occurredAt: detail.occurredAt || detail.timestamp || new Date().toISOString(),
      subject: detail.agentName || detail.agentId || detail.subject || detail.jobId || detail.missionId || null,
      payload: detail.payload || detail.data || detail
    };
    const events = window.FENIX.city.events;
    if (projection.sourceEventId && events.some((item) => item.sourceEventId === projection.sourceEventId)) return;
    events.push(projection);
    if (events.length > 100) events.splice(0, events.length - 100);
    window.FENIX.city.lastEvent = projection;
    document.dispatchEvent(new CustomEvent('fenix-city-event', { detail: projection, bubbles: true }));
    window.dispatchEvent(new CustomEvent('fenix-city-event', { detail: projection, bubbles: true }));
  });
}());

/* ======================================================
   FENIX V8.2 SSE BRIDGE — connects port 4410 SSE to City
   Feeds /api/v2/events/stream into the fenix-live event
   ====================================================== */
(function () {
  'use strict';
  var SSE_URL = '/api/v2/events/stream';
  var es = null;
  var retries = 0;

  function connect() {
    try {
      if (!window.__FENIX_SSE_SOURCE__ || window.__FENIX_SSE_SOURCE__.readyState === 2) {
        window.__FENIX_SSE_SOURCE__ = new EventSource(SSE_URL);
      }
      es = window.__FENIX_SSE_SOURCE__;
      es.addEventListener('open', function() {
        retries = 0;
        console.log('[FenixCityBridge] SSE connected to V8.2 event stream');
        document.dispatchEvent(new CustomEvent('fenix-live', {
          detail: { type: 'status', status: 'connected' }, bubbles: true
        }));
      });
      es.addEventListener('message', function(e) {
        try {
          var ev = JSON.parse(e.data);
          if (!ev || ev.type === 'heartbeat') return;
          var detail = {
            type: ev.type,
            id: ev.id,
            timestamp: ev.timestamp,
            occurredAt: ev.timestamp,
            subject: (ev.data && (ev.data.agentName || ev.data.agentId || ev.data.jobId || ev.data.projectId)) || null,
            agentId: ev.data && ev.data.agentId,
            agentName: ev.data && ev.data.agentName,
            jobId: ev.data && ev.data.jobId,
            projectId: ev.data && ev.data.projectId,
            location: ev.data && (ev.data.location || ev.data.destination),
            destination: ev.data && ev.data.destination,
            payload: ev.data || ev,
            data: ev.data || ev
          };
          document.dispatchEvent(new CustomEvent('fenix-live', { detail: detail, bubbles: true }));
          window.dispatchEvent(new CustomEvent('fenix-live', { detail: detail, bubbles: true }));
        } catch(err) {}
      });
    } catch(e) {
      console.warn('[FenixCityBridge] SSE unavailable:', e.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    setTimeout(connect, 100);
  }

  window.FenixCityBridge = { connect: connect, getSSE: function() { return es; } };
}());
