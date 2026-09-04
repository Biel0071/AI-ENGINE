/* FÊNIX City Event Adapter — projection only, no local runtime state. */
(function () {
  'use strict';
  const CITY_EVENT_MAP = Object.freeze({
    'agent.created': { visualState: 'IDLE', location: 'department' },
    'agent.online': { visualState: 'IDLE', location: 'department' },
    'agent.offline': { visualState: 'OFFLINE', location: 'department' },
    'agent.status.changed': { visualState: 'status', location: 'department' },
    'mission.started': { visualState: 'WORKING', location: 'command-center' },
    'mission.completed': { visualState: 'COMPLETED', location: 'command-center' },
    'mission.failed': { visualState: 'ERROR', location: 'command-center' },
    'job.created': { visualState: 'QUEUED', location: 'command-center' },
    'job.queued': { visualState: 'QUEUED', location: 'command-center' },
    'job.started': { visualState: 'WORKING', location: 'execution' },
    'runtime.job.running': { visualState: 'WORKING', location: 'execution' },
    'job.completed': { visualState: 'COMPLETED', location: 'execution' },
    'job.failed': { visualState: 'ERROR', location: 'execution' },
    'tool.started': { visualState: 'WORKING', location: 'tool-station' },
    'tool.completed': { visualState: 'COMPLETED', location: 'tool-station' },
    'agent.tool.call': { visualState: 'WORKING', location: 'tool-station' },
    'agent.handoff': { visualState: 'HANDOFF', location: 'communication' },
    'memory.read': { visualState: 'MEMORY', location: 'memory' },
    'memory.write': { visualState: 'MEMORY', location: 'memory' },
    'human.required': { visualState: 'WAITING', location: 'approval' },
    'human.approval_required': { visualState: 'WAITING', location: 'approval' }
  });

  window.FENIX = window.FENIX || {};
  window.FENIX.city = window.FENIX.city || { events: [], lastEvent: null, map: CITY_EVENT_MAP };

  document.addEventListener('fenix-live', (event) => {
    const detail = event.detail || {};
    const type = String(detail.type || detail.event || detail.name || '').toLowerCase();
    if (type === 'status' && detail.status) {
      window.FENIX.city.connectionStatus = String(detail.status).toUpperCase();
      document.dispatchEvent(new CustomEvent('fenix-city-connection', { detail: { status: window.FENIX.city.connectionStatus } }));
      return;
    }
    if (!type || type === 'snapshot' || !CITY_EVENT_MAP[type]) return;
    const projection = {
      type,
      visual: CITY_EVENT_MAP[type],
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
    document.dispatchEvent(new CustomEvent('fenix-city-event', { detail: projection }));
  });
}());
