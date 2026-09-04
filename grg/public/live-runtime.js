/**
 * FÊNIX LIVE RUNTIME — Frontend State Engine
 * 
 * - Conecta WebSocket /runtime com reconnect exponencial
 * - Recebe snapshot inicial ao conectar
 * - Mantém window.FENIX.live como fonte de verdade
 * - Dispara CustomEvents para componentes reagirem
 * - Replay de eventos perdidos após reconexão
 */
(function () {
  'use strict';

  const RECONNECT_BASE_MS = 1500;
  const RECONNECT_MAX_MS = 30000;
  const PING_INTERVAL_MS = 15000;

  // Estado live compartilhado
  window.FENIX = window.FENIX || {};
  window.FENIX.live = {
    status: 'CONNECTING',        // CONNECTING | ONLINE | RECONNECTING | OFFLINE
    connectedAt: null,
    lastEventAt: null,
    lastHeartbeatAt: null,
    lastSeq: 0,
    wsLatencyMs: null,
    uptime: 0,
    workers: { active: 0, total: 0 },
    queue: { running: 0, queued: 0, completed: 0, failed: 0 },
    jobs: [],
    runtimeJobs: [],
    agents: [],
    missions: [],
    projects: [],
    operationalTwin: null,
    events: []
  };

  let ws = null;
  let reconnectAttempts = 0;
  let pingTimer = null;
  let pingSeq = 0;
  let pingAt = null;
  let reconnectTimer = null;
  let intentionallyClosed = false;

  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/events`;
  }

  function emit(type, detail) {
    document.dispatchEvent(new CustomEvent('fenix-live', { detail: { type, ...detail } }));
    // Legacy compat
    document.dispatchEvent(new CustomEvent('fenix-ws', { detail: { type, payload: detail } }));
  }

  function updateStatus(status) {
    window.FENIX.live.status = status;
    updateTopbar(status);
    emit('status', { status });
  }

  function updateTopbar(status) {
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    const wsIndicator = document.getElementById('wsStatus');
    if (!dot || !txt) return;
    if (status === 'ONLINE') {
      dot.style.color = 'var(--green, #4ade80)';
      txt.style.color = 'var(--green, #4ade80)';
      txt.textContent = 'CONNECTED';
    } else if (status === 'RECONNECTING') {
      dot.style.color = 'var(--yellow, #facc15)';
      txt.style.color = 'var(--yellow, #facc15)';
      txt.textContent = 'RECONNECTING...';
    } else if (status === 'SYNCING') {
      dot.style.color = 'var(--cyan, #22d3ee)';
      txt.style.color = 'var(--cyan, #22d3ee)';
      txt.textContent = 'SYNCING...';
    } else if (status === 'OFFLINE') {
      dot.style.color = 'var(--rose, #f43f5e)';
      txt.style.color = 'var(--rose, #f43f5e)';
      txt.textContent = 'OFFLINE';
    }
    if (wsIndicator) {
      wsIndicator.textContent = status === 'ONLINE'
        ? `WSS ${window.FENIX.live.wsLatencyMs != null ? window.FENIX.live.wsLatencyMs + 'ms' : '...'}`
        : status;
    }
  }

  function applySnapshot(raw) {
    const data = raw?.payload || raw || {};
    const live = window.FENIX.live;
    if (data.uptime != null) live.uptime = data.uptime;
    if (data.workers) live.workers = data.workers;
    if (data.queue) live.queue = data.queue;
    if (data.jobs) live.jobs = data.jobs;
    if (data.runtimeJobs) live.runtimeJobs = data.runtimeJobs;
    if (data.agents) live.agents = data.agents;
    if (data.missions) live.missions = data.missions;
    if (data.projects) live.projects = data.projects;
    if (data.operationalTwin) live.operationalTwin = data.operationalTwin;
    if (data.lastSeq) live.lastSeq = data.lastSeq;
    if (data.events) live.events = data.events;
    emit('snapshot', data);
    if (['CONNECTING', 'SYNCING', 'RECONNECTING'].includes(live.status)) updateStatus('ONLINE');
    updateQueueMetrics();
  }

  function applyEvent(msg) {
    const live = window.FENIX.live;
    if (msg.seq) live.lastSeq = Math.max(live.lastSeq, msg.seq);
    live.lastEventAt = msg.at || new Date().toISOString();
    live.events.unshift(msg);
    if (live.events.length > 250) live.events.pop();

    switch (msg.type) {
      case 'runtime.heartbeat':
        live.lastHeartbeatAt = msg.at;
        live.uptime = msg.payload?.uptime ?? live.uptime;
        break;

      case 'job.created':
      case 'job.queued':
        if (msg.payload?.jobId) {
          ensureJob(msg.payload.jobId, 'QUEUED', msg.payload);
          live.queue.queued = (live.queue.queued || 0) + 1;
        }
        break;

      case 'job.started':
        if (msg.payload?.jobId) {
          updateJob(msg.payload.jobId, { status: 'RUNNING', startedAt: msg.at });
          live.queue.running = (live.queue.running || 0) + 1;
          live.queue.queued = Math.max(0, (live.queue.queued || 0) - 1);
        }
        break;

      case 'job.completed':
        if (msg.payload?.jobId) {
          updateJob(msg.payload.jobId, { status: 'COMPLETED', completedAt: msg.at });
          live.queue.completed = (live.queue.completed || 0) + 1;
          live.queue.running = Math.max(0, (live.queue.running || 0) - 1);
        }
        break;

      case 'job.failed':
        if (msg.payload?.jobId) {
          updateJob(msg.payload.jobId, { status: 'FAILED', error: msg.payload.error || msg.payload.message || null });
          live.queue.failed = (live.queue.failed || 0) + 1;
          live.queue.running = Math.max(0, (live.queue.running || 0) - 1);
        }
        break;

      case 'job.cancelled':
      case 'job.paused':
      case 'job.resumed':
        if (msg.payload?.jobId) {
          updateJob(msg.payload.jobId, { status: msg.type === 'job.resumed' ? 'QUEUED' : msg.type.replace('job.', '').toUpperCase() });
        }
        break;

      case 'agent.started':
      case 'agent.working':
      case 'agent.progress':
      case 'agent.completed':
      case 'agent.failed':
        updateAgent(msg.payload);
        break;

      case 'mission.created':
      case 'mission.started':
      case 'mission.resumed':
      case 'mission.paused':
      case 'mission.cancelled':
      case 'mission.completed':
      case 'mission.failed':
      case 'mission.step.dispatched':
      case 'mission.step.completed':
      case 'mission.step.approved':
      case 'mission.step.approval-required': {
        const statusByEvent = {
          'mission.created': 'PLANNED',
          'mission.started': 'RUNNING',
          'mission.resumed': 'RUNNING',
          'mission.paused': 'PAUSED',
          'mission.cancelled': 'CANCELLED',
          'mission.completed': 'COMPLETED',
          'mission.failed': 'FAILED',
          'mission.step.approval-required': 'AWAITING_APPROVAL'
        };
        const status = statusByEvent[msg.type] || msg.payload?.missionStatus || null;
        updateMission(msg.payload, status);
        break;
      }

      case 'runtime.job.started':
      case 'runtime.job.succeeded':
      case 'runtime.job.failed':
      case 'runtime.job.cancelled':
        if (msg.payload?.jobId) {
          const normalized = msg.type.replace('runtime.', '');
          updateJob(msg.payload.jobId, { status: normalized === 'job.succeeded' ? 'SUCCEEDED' : normalized === 'job.failed' ? 'FAILED' : normalized === 'job.cancelled' ? 'CANCELLED' : 'RUNNING' });
        }
        break;

      case 'memory.created':
      case 'visual.capture':
      case 'visual.diff':
      case 'repair.started':
      case 'repair.completed':
        break;

      case 'pong':
        if (msg.payload?.seq === pingSeq && pingAt) {
          live.wsLatencyMs = Date.now() - pingAt;
          updateTopbar('ONLINE');
        }
        break;
    }

    updateQueueMetrics();
    emit(msg.type, msg.payload || {});
  }

  function ensureJob(id, status, data) {
    const jobs = window.FENIX.live.jobs;
    if (!jobs.find(j => j.id === id)) {
      jobs.unshift({ id, status, ...data, createdAt: new Date().toISOString() });
      if (jobs.length > 100) jobs.pop();
    }
  }

  function updateJob(id, patch) {
    const job = window.FENIX.live.jobs.find(j => j.id === id);
    if (job) Object.assign(job, patch);
  }

  function updateAgent(data) {
    if (!data?.id) return;
    const agents = window.FENIX.live.agents;
    const idx = agents.findIndex(a => a.id === data.id);
    if (idx >= 0) agents[idx] = { ...agents[idx], ...data };
    else agents.unshift(data);
  }

  function updateMission(data, status) {
    const id = data?.missionId || data?.id;
    if (!id) return;
    const missions = window.FENIX.live.missions;
    const idx = missions.findIndex(m => (m.id || m.missionId) === id);
    const patch = { ...data, id, status };
    if (idx >= 0) missions[idx] = { ...missions[idx], ...patch };
    else missions.unshift(patch);
  }

  function updateQueueMetrics() {
    const q = window.FENIX.live.queue;
    const jobsEl = document.getElementById('liveQueueBadge');
    if (jobsEl) jobsEl.textContent = `${q.queued || 0} queued`;
  }

  function getLiveToken() {
    return localStorage.getItem('fenix_token') ||
           localStorage.getItem('grg_token') ||
           sessionStorage.getItem('fenix_token') ||
           sessionStorage.getItem('grg_token') ||
           (() => {
             const raw = (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] || '';
             try { return decodeURIComponent(raw); } catch { return raw; }
           })() ||
           window.__FENIX_TOKEN__ || '';
  }

  function requestSnapshot() {
    const token = getLiveToken();
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    fetch('/runtime/snapshot', { headers })
      .then(r => {
        if (!r.ok) {
          updateStatus(r.status === 401 ? 'AUTH_REQUIRED' : 'RECONNECTING');
          return null;
        }
        return r.json();
      })
      .then(data => { if (data) applySnapshot(data); })
      .catch(() => updateStatus('RECONNECTING'));
  }

  function startPing() {
    stopPing();
    pingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        pingSeq++;
        pingAt = Date.now();
        try { ws.send(JSON.stringify({ type: 'ping', seq: pingSeq })); } catch (e) {}
      }
    }, PING_INTERVAL_MS);
  }

  function stopPing() {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  }

  function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    intentionallyClosed = false;

    // O snapshot HTTP é a fonte inicial de verdade e não pode depender do
    // handshake WebSocket: proxies/reconnects podem atrasar ou rejeitar o WS.
    requestSnapshot();

    try {
      ws = new WebSocket(wsUrl());
    } catch (e) {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      updateStatus('SYNCING');
      window.FENIX.live.connectedAt = new Date().toISOString();
      window.FENIX.ws = ws;

      // Request replay of missed events
      const lastSeq = window.FENIX.live.lastSeq;
      if (lastSeq > 0) {
        try { ws.send(JSON.stringify({ type: 'replay', since: lastSeq })); } catch (e) {}
      }

      // Always get fresh snapshot
      requestSnapshot();
      startPing();
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'runtime.connected') {
          // Server ack
          if (msg.payload?.lastSeq) window.FENIX.live.lastSeq = msg.payload.lastSeq;
        } else if (msg.type === 'runtime.snapshot') {
          applySnapshot(msg.payload || msg);
        } else {
          applyEvent(msg);
        }
      } catch (e) {}
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      stopPing();
      window.FENIX.ws = null;
      if (!intentionallyClosed) {
        updateStatus('RECONNECTING');
        scheduleReconnect();
      }
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(1.5, reconnectAttempts), RECONNECT_MAX_MS);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function disconnect() {
    intentionallyClosed = true;
    stopPing();
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
  }

  // Public API
  window.FENIX.liveRuntime = { connect, disconnect, requestSnapshot };

  // Auto-start after FENIX_READY
  if (window.FENIX_READY) {
    connect();
  } else {
    document.addEventListener('FENIX_READY', () => connect(), { once: true });
  }

  // Expose on legacy window.FENIX.ws slot when connected
  window.addEventListener('beforeunload', disconnect);

})();

