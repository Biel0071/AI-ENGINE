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
    'project.updated': { visualState: 'WORKING', location: 'command-center' },
    'project.health.changed': { visualState: 'status', location: 'command-center' },
    'connector.state.changed': { visualState: 'status', location: 'mcp' },
    'runtime.heartbeat': { visualState: 'ONLINE', location: 'command-center' },
    'runtime.online': { visualState: 'ONLINE', location: 'command-center' },
    'runtime.offline': { visualState: 'OFFLINE', location: 'command-center' },
    'task.created': { visualState: 'QUEUED', location: 'command-center' },
    'task.assigned': { visualState: 'THINKING', location: 'command-center' },
    'task.started': { visualState: 'WORKING', location: 'execution' },
    'task.completed': { visualState: 'SUCCESS', location: 'execution' },
    'task.failed': { visualState: 'ERROR', location: 'execution' },
    'agent.started': { visualState: 'WORKING', location: 'execution' },
    'agent.moving': { visualState: 'MOVING', location: 'execution' },
    'agent.executing': { visualState: 'EXECUTING', location: 'execution' },
    'agent.waiting': { visualState: 'WAITING', location: 'execution' },
    'agent.collaborating': { visualState: 'COLLABORATING', location: 'communication' },
    'agent.collaboration': { visualState: 'COLLABORATING', location: 'communication' },
    'agent.collaboration.started': { visualState: 'COLLABORATING', location: 'communication' },
    'agent.collaboration.finished': { visualState: 'WORKING', location: 'execution' },
    'agent.completed': { visualState: 'SUCCESS', location: 'execution' },
    'agent.error': { visualState: 'ERROR', location: 'execution' },
    'build.started': { visualState: 'WORKING', location: 'development' },
    'build.success': { visualState: 'SUCCESS', location: 'development' },
    'build.failed': { visualState: 'ERROR', location: 'development' },
    'deploy.started': { visualState: 'DEPLOYING', location: 'devops' },
    'deploy.success': { visualState: 'SUCCESS', location: 'devops' }
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
    window.dispatchEvent(new CustomEvent('fenix-city-event', { detail: projection, bubbles: true }));
  });

  // Handle building entrance -> workspace transition
  window.addEventListener('fenix:city:buildingEnter', (e) => {
    const detail = e.detail || {};
    const buildingId = detail.buildingId;
    const meta = detail.metadata || {};
    if (!buildingId) return;

    fetch('/api/v2/reality-operator/city/select-building', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId })
    })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const targetProj = data?.projectId || meta.project;
      if (targetProj && typeof window.openProjectWorkspace === 'function') {
        window.openProjectWorkspace(targetProj);
      }
    })
    .catch(() => {
      if (meta.project && typeof window.openProjectWorkspace === 'function') {
        window.openProjectWorkspace(meta.project);
      }
    });
  });

  /* FÊNIX SSE Bridge — connects /api/v2/events/stream to City Events */
  (function () {
    var SSE_URL = '/api/v2/events/stream';
    var es = null;

    function connectSSE() {
      try {
        if (!window.__FENIX_SSE_SOURCE__ || window.__FENIX_SSE_SOURCE__.readyState === 2) {
          window.__FENIX_SSE_SOURCE__ = new EventSource(SSE_URL);
        }
        es = window.__FENIX_SSE_SOURCE__;
        es.addEventListener('open', function() {
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
      document.addEventListener('DOMContentLoaded', connectSSE);
    } else {
      setTimeout(connectSSE, 100);
    }
    window.FenixCityBridge = { connect: connectSSE, getSSE: function() { return es; } };
  }());
}());
