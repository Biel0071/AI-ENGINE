/**
 * FÊNIX COCKPIT — Live Runtime Controller
 * 
 * Conectado ao live-runtime.js via CustomEvents 'fenix-live'
 * Mostra estado REAL de Jobs, Agents, Logs
 */
function runWhenReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

runWhenReady(() => {
  const executeBtn  = document.getElementById('cockpitExecuteBtn');
  const promptEl    = document.getElementById('cockpitPrompt');
  const projectEl   = document.getElementById('cockpitProjectId');
  const jobsEl      = document.getElementById('cockpitMissionJobs');
  const agentsEl    = document.getElementById('cockpitAgents');
  const logsEl      = document.getElementById('cockpitLogs');
  const statusEl    = document.getElementById('cockpitStatus');
  const jobCountEl  = document.getElementById('liveJobCount');

  // Runtime status bar elements
  const runtimeUptime    = document.getElementById('runtimeUptime');
  const runtimeWorkers   = document.getElementById('runtimeWorkers');
  const runtimeRunning   = document.getElementById('runtimeRunning');
  const runtimeQueued    = document.getElementById('runtimeQueued');
  const runtimeCompleted = document.getElementById('runtimeCompleted');
  const runtimeFailed    = document.getElementById('runtimeFailed');

  // ── Log helper ──────────────────────────────────────────────────────────
  function log(msg, color) {
    if (!logsEl) return;
    const line = document.createElement('div');
    line.style.color = color || '#4ade80';
    line.textContent = `> [${new Date().toLocaleTimeString()}] ${msg}`;
    logsEl.appendChild(line);
    logsEl.scrollTop = logsEl.scrollHeight;
    // Keep last 200 lines
    while (logsEl.children.length > 200) {
      logsEl.removeChild(logsEl.firstChild);
    }
  }

  // ── Job card renderer ────────────────────────────────────────────────────
  function jobColor(status) {
    const m = { RUNNING: '#facc15', COMPLETED: '#4ade80', FAILED: '#f43f5e', QUEUED: '#94a3b8', CANCELLED: '#f97316' };
    return m[status] || '#94a3b8';
  }

  function renderJobCard(job) {
    const el = document.createElement('div');
    el.id = `job-card-${job.id}`;
    el.style.cssText = `background:#111; border-left:3px solid ${jobColor(job.status)}; padding:8px 10px; border-radius:4px; font-size:11px;`;
    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <b style="color:${jobColor(job.status)}">[${job.status}]</b>
        <span style="color:#555">${job.id ? job.id.slice(0, 8) : '?'}</span>
      </div>
      <div style="color:#ccc">${job.type || 'JOB'}</div>
      ${job.projectId ? `<div style="color:#555;margin-top:2px">Project: ${job.projectId}</div>` : ''}
    `;
    return el;
  }

  function upsertJobCard(job) {
    if (!jobsEl) return;
    // Remove placeholder
    const placeholder = jobsEl.querySelector('[data-placeholder]');
    if (placeholder) placeholder.remove();

    let el = document.getElementById(`job-card-${job.id}`);
    if (el) {
      el.style.borderLeftColor = jobColor(job.status);
      const statusEl2 = el.querySelector('b');
      if (statusEl2) { statusEl2.textContent = `[${job.status}]`; statusEl2.style.color = jobColor(job.status); }
    } else {
      el = renderJobCard(job);
      jobsEl.insertBefore(el, jobsEl.firstChild);
      // Cap at 50
      while (jobsEl.children.length > 50) jobsEl.removeChild(jobsEl.lastChild);
    }
    if (jobCountEl) jobCountEl.textContent = `${jobsEl.children.length} jobs`;
  }

  // ── Agent renderer ──────────────────────────────────────────────────────
  function upsertAgent(data) {
    if (!agentsEl || !data?.id) return;
    const placeholder = agentsEl.querySelector('[data-placeholder]');
    if (placeholder) placeholder.remove();
    let el = document.getElementById(`agent-${data.id}`);
    if (!el) {
      el = document.createElement('div');
      el.id = `agent-${data.id}`;
      el.style.cssText = 'background:#111; padding:8px 10px; border-radius:4px; font-size:11px; border-left:3px solid #facc15;';
      agentsEl.insertBefore(el, agentsEl.firstChild);
    }
    el.innerHTML = `<b>${data.role || 'AGENT'}</b> <span style="color:#555">${data.id.slice(0, 8)}</span><br><span style="color:#4ade80">${data.status || 'ACTIVE'}</span>`;
  }

  // ── Update runtime status bar ──────────────────────────────────────────
  function updateStatusBar() {
    const live = window.FENIX?.live;
    if (!live) return;
    if (runtimeUptime) {
      const u = live.uptime || 0;
      const h = Math.floor(u / 3600), m = Math.floor((u % 3600) / 60), s = u % 60;
      runtimeUptime.textContent = `${h}h ${m}m ${s}s`;
    }
    if (runtimeWorkers) runtimeWorkers.textContent = `${live.workers?.active || 0}/${live.workers?.total || 3}`;
    if (runtimeRunning)   runtimeRunning.textContent   = live.queue?.running   || 0;
    if (runtimeQueued)    runtimeQueued.textContent     = live.queue?.queued    || 0;
    if (runtimeCompleted) runtimeCompleted.textContent  = live.queue?.completed || 0;
    if (runtimeFailed)    runtimeFailed.textContent     = live.queue?.failed    || 0;
  }

  // ── Listen to live events ───────────────────────────────────────────────
  document.addEventListener('fenix-live', (e) => {
    const { type, ...data } = e.detail || {};

    switch (type) {
      case 'snapshot':
        // Hydrate job tree from snapshot
        if (data.jobs?.length && jobsEl) {
          jobsEl.innerHTML = '';
          data.jobs.slice(0, 30).forEach(j => upsertJobCard(j));
        }
        if (data.agents?.length && agentsEl) {
          agentsEl.innerHTML = '';
          data.agents.slice(0, 10).forEach(a => upsertAgent(a));
        }
        log('Snapshot recebido — estado hidratado', '#94a3b8');
        updateStatusBar();
        break;

      case 'job.created':
      case 'job.queued':
        upsertJobCard({ id: data.jobId, type: data.type, status: 'QUEUED', projectId: data.projectId });
        log(`Job CRIADO: ${data.jobId?.slice(0, 8)} [${data.type || 'TASK'}]`, '#94a3b8');
        updateStatusBar();
        break;

      case 'job.started':
        upsertJobCard({ id: data.jobId, type: data.type, status: 'RUNNING' });
        log(`Job INICIADO: ${data.jobId?.slice(0, 8)}`, '#facc15');
        if (statusEl) { statusEl.textContent = 'RUNNING'; statusEl.style.color = '#facc15'; }
        updateStatusBar();
        break;

      case 'job.completed':
        upsertJobCard({ id: data.jobId, status: 'COMPLETED' });
        log(`Job COMPLETO: ${data.jobId?.slice(0, 8)}`, '#4ade80');
        updateStatusBar();
        break;

      case 'job.failed':
        upsertJobCard({ id: data.jobId, status: 'FAILED' });
        log(`Job FALHOU: ${data.jobId?.slice(0, 8)} — ${data.error || ''}`, '#f43f5e');
        updateStatusBar();
        break;

      case 'agent.started':
      case 'agent.working':
        upsertAgent(data);
        log(`Agent ATIVO: ${data.id?.slice(0, 8)} [${data.role || ''}]`, '#a78bfa');
        break;

      case 'agent.completed':
        log(`Agent CONCLUÍDO: ${data.id?.slice(0, 8)}`, '#4ade80');
        break;

      case 'runtime.heartbeat':
        updateStatusBar();
        break;

      case 'status':
        if (data.status === 'ONLINE') {
          log('WebSocket CONECTADO ao runtime real', '#4ade80');
        } else if (data.status === 'RECONNECTING') {
          log('WebSocket RECONECTANDO...', '#facc15');
        }
        break;
    }
  });

  // ── Execute command ─────────────────────────────────────────────────────
  if (executeBtn) {
    executeBtn.addEventListener('click', async () => {
      const prompt = promptEl?.value?.trim();
      const projectId = projectEl?.value?.trim();
      if (!prompt || !projectId) {
        log('Erro: prompt e project ID são obrigatórios', '#f43f5e');
        return;
      }

      log(`EXECUTANDO: ${prompt.slice(0, 80)}...`, '#a78bfa');
      if (statusEl) { statusEl.textContent = 'SUBMITTING...'; statusEl.style.color = '#facc15'; }

      try {
        const res = await fetch('/api/dev/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('grg_token') || '')
          },
          body: JSON.stringify({ projectId, prompt, client: 'FenixCockpit' })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        log(`Mission ID: ${data.job?.missionId || data.missionId || 'N/A'} — Job: ${data.job?.id?.slice(0,8) || 'N/A'}`, '#4ade80');
        if (promptEl) promptEl.value = '';
        if (statusEl) { statusEl.textContent = 'SUBMITTED'; statusEl.style.color = '#4ade80'; }
      } catch (err) {
        log(`ERRO: ${err.message}`, '#f43f5e');
        if (statusEl) { statusEl.textContent = 'ERROR'; statusEl.style.color = '#f43f5e'; }
      }
    });
  }

  // ── Initial placeholder ─────────────────────────────────────────────────
  if (jobsEl && !jobsEl.children.length) {
    const ph = document.createElement('div');
    ph.setAttribute('data-placeholder', '1');
    ph.style.cssText = 'color:var(--text-muted); font-size:12px;';
    ph.textContent = 'Aguardando eventos do runtime...';
    jobsEl.appendChild(ph);
  }
  if (agentsEl && !agentsEl.children.length) {
    const ph = document.createElement('div');
    ph.setAttribute('data-placeholder', '1');
    ph.style.cssText = 'color:var(--text-muted); font-size:12px;';
    ph.textContent = 'Nenhum agente ativo';
    agentsEl.appendChild(ph);
  }

  // Update status bar every second for uptime counter
  setInterval(updateStatusBar, 1000);

  log('FÊNIX Cockpit iniciado — aguardando conexão WebSocket...', '#4ade80');
});
