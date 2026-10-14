/* FÊNIX City Event Adapter — projection only, no local runtime state. */
(function () {
  'use strict';
  const CITY_EVENT_MAP = Object.freeze({
    'agent.created': { visualState: 'IDLE', location: 'department' },
    'agent.online': { visualState: 'IDLE', location: 'department' },
    'agent.offline': { visualState: 'OFFLINE', location: 'department' },
    'agent.status.changed': { visualState: 'status', location: 'department' },
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
    'job.created': { visualState: 'QUEUED', location: 'command-center' },
    'job.queued': { visualState: 'QUEUED', location: 'command-center' },
    'job.started': { visualState: 'WORKING', location: 'execution' },
    'runtime.job.running': { visualState: 'WORKING', location: 'execution' },
    'job.completed': { visualState: 'COMPLETED', location: 'execution' },
    'job.failed': { visualState: 'ERROR', location: 'execution' },
    'job.retrying': { visualState: 'RECOVERING', location: 'execution' },
    'runtime.job.repairing': { visualState: 'RECOVERING', location: 'execution' },
    'job.paused': { visualState: 'WAITING', location: 'execution' },
    'job.resumed': { visualState: 'WORKING', location: 'execution' },
    'job.cancelled': { visualState: 'CANCELLED', location: 'execution' },
    'tool.started': { visualState: 'WORKING', location: 'tool-station' },
    'tool.completed': { visualState: 'COMPLETED', location: 'tool-station' },
    'agent.tool.call': { visualState: 'WORKING', location: 'tool-station' },
    'agent.handoff': { visualState: 'HANDOFF', location: 'communication' },
    'agent.task.delegated': { visualState: 'HANDOFF', location: 'communication' },
    'memory.read': { visualState: 'MEMORY', location: 'memory' },
    'memory.write': { visualState: 'MEMORY', location: 'memory' },
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
      // Dynamic canonical routing fallback for domain events
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
      else return; // unmapped non-operational event
    }

    const projection = {
      type,
      visual,
      sourceEventId: detail.id || detail.eventId || detail.seq || null,
      occurredAt: detail.occurredAt || detail.timestamp || new Date().toISOString(),
      subject: detail.subject || detail.agentId || detail.jobId || detail.missionId || null,
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
   FENIX V8 SSE BRIDGE — connects port 4410 SSE to City
   Feeds /api/v2/events/stream into the fenix-live event
   ====================================================== */
(function () {
  'use strict';
  var SSE_URL = '/api/v2/events/stream';  // proxied via gateway to port 4410
  var es = null;
  var retries = 0;

  function connect() {
    if (es) { try { es.close(); } catch(e){} }
    try {
      es = new EventSource(SSE_URL);
      es.onopen = function() {
        retries = 0;
        console.log('[FenixCityBridge] SSE connected to V8 event stream');
        document.dispatchEvent(new CustomEvent('fenix-live', {
          detail: { type: 'status', status: 'connected' }, bubbles: true
        }));
      };
      es.onmessage = function(e) {
        try {
          var ev = JSON.parse(e.data);
          if (!ev || ev.type === 'heartbeat') return;
          // Map V8 event format to fenix-live format
          var detail = {
            type: ev.type,
            id: ev.id,
            timestamp: ev.timestamp,
            occurredAt: ev.timestamp,
            subject: (ev.data && (ev.data.agentId || ev.data.jobId || ev.data.projectId)) || null,
            agentId: ev.data && ev.data.agentId,
            jobId: ev.data && ev.data.jobId,
            projectId: ev.data && ev.data.projectId,
            payload: ev.data || ev,
            data: ev.data || ev
          };
          document.dispatchEvent(new CustomEvent('fenix-live', { detail: detail, bubbles: true }));
          window.dispatchEvent(new CustomEvent('fenix-live', { detail: detail, bubbles: true }));
        } catch(err) {}
      };
      es.onerror = function() {
        try { es.close(); } catch(e) {}
        var delay = Math.min(1000 * Math.pow(2, retries++), 30000);
        setTimeout(connect, delay);
      };
    } catch(e) {
      console.warn('[FenixCityBridge] SSE unavailable:', e.message);
    }
  }

  // Start SSE when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    setTimeout(connect, 100);
  }

  // Expose control
  window.FenixCityBridge = { connect: connect, getSSE: function() { return es; } };
}());
