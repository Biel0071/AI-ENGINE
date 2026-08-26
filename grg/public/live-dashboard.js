(function() {
  'use strict';

  // Wait for DOM
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Add Nav Item
    const navTop = document.querySelector('.nav-top');
    if (navTop) {
      const liveBtn = document.createElement('button');
      liveBtn.className = 'nav-item';
      liveBtn.setAttribute('data-view', 'live');
      liveBtn.setAttribute('data-nav', 'live');
      liveBtn.innerHTML = '<i class="ph ph-broadcast"></i> LIVE DEV';
      
      liveBtn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        liveBtn.classList.add('active');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-live').classList.add('active');
      });

      // Insert right after COMMAND
      navTop.insertBefore(liveBtn, navTop.children[1]);
    }

    // 2. Add View Container
    const viewsContainer = document.querySelector('.views-container');
    const viewLive = document.createElement('div');
    viewLive.id = 'view-live';
    viewLive.className = 'view';
    viewLive.innerHTML = `
      <div class="live-dashboard-layout">
        <!-- Top Toolbar -->
        <div class="live-toolbar">
          <div class="live-title">
            <span class="live-dot pulse"></span>
            FÊNIX OS LIVE CONTROL CENTER
          </div>
          <div class="live-stats">
            <span id="liveStatCpu">CPU --%</span>
            <span id="liveStatRam">RAM --%</span>
            <span id="liveStatProvider" class="pill-green">QWEN</span>
          </div>
        </div>

        <!-- Main Content -->
        <div class="live-main">
          <!-- Left: Mission / Master Agent -->
          <div class="live-panel master-panel">
            <div class="panel-header">
              <i class="ph ph-brain"></i> MASTER AGENT
            </div>
            <div class="panel-body">
              <div class="mission-card">
                <small>Current Mission</small>
                <div id="liveMissionTitle" class="mission-title">Aguardando Missão...</div>
              </div>
              <div class="plan-card">
                <small>EXECUTION PLAN</small>
                <ul id="livePlanList" class="plan-list">
                  <li class="idle">Nenhum plano ativo.</li>
                </ul>
              </div>
              <div class="eta-card">
                <small>ETA</small>
                <div id="liveEta">--:--</div>
              </div>
              <div class="master-command-box">
                <input type="text" id="masterCommandInput" placeholder="What should FÊNIX build?">
                <button id="masterCommandBtn" class="btn-primary-sm">RUN</button>
              </div>
            </div>
          </div>

          <!-- Center: Agents / Jobs -->
          <div class="live-panel jobs-panel">
            <div class="panel-header">
              <i class="ph ph-kanban"></i> ACTIVE JOBS
            </div>
            <div class="panel-body">
              <div id="liveJobsList" class="jobs-list">
                <!-- Injected jobs -->
                <div class="empty-state">No active jobs.</div>
              </div>
            </div>
          </div>

          <!-- Right: Event Log & File Activity -->
          <div class="live-panel log-panel">
            <div class="panel-header">
              <i class="ph ph-terminal"></i> LIVE LOG
            </div>
            <div class="panel-body">
              <div id="liveEventLog" class="event-log"></div>
            </div>
            <div class="panel-header">
              <i class="ph ph-files"></i> FILE ACTIVITY
            </div>
            <div class="panel-body" style="flex: 0.5;">
              <ul id="liveFileActivity" class="file-list"></ul>
            </div>
          </div>
        </div>
      </div>
    `;
    viewsContainer.appendChild(viewLive);

    // 3. Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
      #view-live { display: none; }
      #view-live.active { display: block; }
      .live-dashboard-layout { display: flex; flex-direction: column; height: 100%; padding: 1rem; gap: 1rem; }
      .live-toolbar { display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.75rem 1.5rem; border-radius: 6px; border: 1px solid var(--border); }
      .live-title { font-weight: 700; display: flex; align-items: center; gap: 0.5rem; letter-spacing: 1px; color: var(--text-primary); }
      .live-dot { width: 10px; height: 10px; background: var(--green, #4ade80); border-radius: 50%; display: inline-block; }
      .pulse { animation: pulse 2s infinite; }
      @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); } 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); } }
      .live-stats { display: flex; gap: 1rem; align-items: center; font-family: var(--font-mono); font-size: 0.85rem; }
      .pill-green { background: rgba(74, 222, 128, 0.2); color: var(--green); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(74, 222, 128, 0.3); }
      
      .live-main { display: flex; gap: 1rem; flex: 1; min-height: 0; }
      .live-panel { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; }
      .master-panel { flex: 0 0 300px; }
      .jobs-panel { flex: 1; }
      .log-panel { flex: 0 0 350px; }

      .panel-header { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.2); }
      .panel-body { padding: 1rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 1rem; }

      .mission-card { background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 6px; border: 1px solid var(--border); }
      .mission-card small { color: var(--text-muted); text-transform: uppercase; font-size: 0.7rem; }
      .mission-title { font-size: 1.1rem; font-weight: 500; margin-top: 0.25rem; color: var(--text-primary); }

      .plan-list { list-style: none; padding: 0; margin: 0; font-size: 0.9rem; }
      .plan-list li { padding: 0.5rem 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 0.5rem; }
      .plan-list li:last-child { border-bottom: none; }
      .plan-list li.done { color: var(--text-muted); text-decoration: line-through; }
      .plan-list li.active { color: var(--text-primary); font-weight: 500; }
      .plan-list li.idle { color: var(--text-muted); }

      .eta-card { font-size: 1.5rem; font-family: var(--font-mono); font-weight: bold; color: var(--text-primary); }

      .master-command-box { display: flex; gap: 0.5rem; margin-top: auto; }
      .master-command-box input { flex: 1; background: var(--bg-body); border: 1px solid var(--border); color: var(--text-primary); padding: 0.5rem; border-radius: 4px; }
      
      .jobs-list { display: flex; flex-direction: column; gap: 0.75rem; }
      .job-item { background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 6px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; position: relative; overflow: hidden; }
      .job-item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--text-muted); }
      .job-item.RUNNING::before { background: var(--green); }
      .job-item.QUEUED::before { background: var(--yellow); }
      .job-item.COMPLETED::before { background: var(--blue); }
      .job-item.FAILED::before { background: var(--rose); }

      .job-header { display: flex; justify-content: space-between; align-items: center; }
      .job-agent { font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
      .job-status { font-family: var(--font-mono); font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); }
      .job-task { color: var(--text-secondary); font-size: 0.9rem; margin-left: 1.5rem; }
      .job-meta { display: flex; gap: 1rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-left: 1.5rem; margin-top: 0.25rem; }

      .event-log { font-family: var(--font-mono); font-size: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; }
      .log-entry { display: flex; gap: 0.5rem; }
      .log-time { color: var(--text-muted); }
      .log-msg { color: var(--text-secondary); }
      .log-entry.high .log-msg { color: var(--text-primary); font-weight: 500; }

      .file-list { list-style: none; padding: 0; margin: 0; font-size: 0.85rem; font-family: var(--font-mono); }
      .file-list li { padding: 0.25rem 0; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem; }
      .file-list li i { color: var(--green); }
    `;
    document.head.appendChild(style);

    // 4. Logic & WS Events
    const logEl = document.getElementById('liveEventLog');
    const jobsEl = document.getElementById('liveJobsList');
    
    function logMsg(msg, isHigh = false) {
      const el = document.createElement('div');
      el.className = 'log-entry' + (isHigh ? ' high' : '');
      const d = new Date();
      const timeStr = `\${d.getHours().toString().padStart(2, '0')}:\${d.getMinutes().toString().padStart(2, '0')}:\${d.getSeconds().toString().padStart(2, '0')}`;
      el.innerHTML = `<span class="log-time">[\${timeStr}]</span><span class="log-msg">\${esc(msg)}</span>`;
      logEl.prepend(el);
      if (logEl.children.length > 50) logEl.lastChild.remove();
    }

    function esc(str) {
      return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }

    // Listen to WS events from live-runtime.js
    document.addEventListener('fenix-live', (e) => {
      const { type, payload } = e.detail;
      if (!type) return;

      if (type === 'jarvis.orchestrator.started' || type === 'jarvis.heartbeat.tick') {
        // System is alive
      } else if (type === 'agent.state.changed') {
        logMsg(`[\${payload.agent}] \${payload.lastAction || payload.status}`, payload.status === 'WORKING');
        updateJobs(); // refresh via fetch since WS doesn't send full jobs list always
      } else if (type === 'runtime.job.queued') {
        logMsg(`Job Queued: \${payload.type}`, true);
        updateJobs();
      } else if (type === 'fs.file.written') {
        const fileList = document.getElementById('liveFileActivity');
        const li = document.createElement('li');
        li.innerHTML = `<i class="ph-fill ph-file-code"></i> \${esc(payload.path.split('/').pop())}`;
        fileList.prepend(li);
        if (fileList.children.length > 10) fileList.lastChild.remove();
        logMsg(`File written: \${payload.path}`);
      }
    });

    // Fetch jobs periodically
    async function updateJobs() {
      try {
        const res = await fetch('/api/v2/jarvis/jobs');
        if (!res.ok) return;
        const data = await res.json();
        const jobs = data.jobs || [];
        
        if (jobs.length === 0) {
          jobsEl.innerHTML = '<div class="empty-state">No active jobs.</div>';
          return;
        }

        jobsEl.innerHTML = jobs.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map(job => `
          <div class="job-item \${job.status}">
            <div class="job-header">
              <span class="job-agent"><i class="ph-fill ph-robot"></i> \${esc(job.assignedAgent || 'Unassigned')}</span>
              <span class="job-status">\${job.status}</span>
            </div>
            <div class="job-task">\${esc(job.title || job.type)}</div>
            <div class="job-meta">
              <span>\${job.status === 'RUNNING' ? '<i class="ph ph-spinner ph-spin"></i> RUNNING' : job.status}</span>
              <span>Tokens: \${job.tokens || 0}</span>
              <span>Files: \${(job.targetFiles || []).length}</span>
            </div>
          </div>
        `).join('');
      } catch (err) {
        console.error('Failed to fetch jobs', err);
      }
    }

    setInterval(updateJobs, 2000);
    updateJobs();

    // Master command submit
    document.getElementById('masterCommandBtn').addEventListener('click', async () => {
      const input = document.getElementById('masterCommandInput');
      const cmd = input.value.trim();
      if (!cmd) return;
      
      input.value = '';
      input.disabled = true;
      document.getElementById('liveMissionTitle').textContent = cmd;
      logMsg(`MASTER received mission: "\${cmd}"`, true);
      
      try {
        // Send to real master orchestrator
        const res = await fetch('/api/v2/jarvis/jobs/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: cmd,
            objective: cmd,
            riskLevel: 'SAFE_AUTO',
            planSteps: [
              { name: 'Implementar funcionalidade', agent: 'Developer Agent', targetFile: 'public/command-center.js', type: 'PATCH' }
            ]
          })
        });
        const data = await res.json();
        if (data.success) {
          logMsg(`Job \${data.job.id} created successfully.`, true);
          updateJobs();
        } else {
          logMsg(`Failed to create job: \${data.error}`);
        }
      } catch (err) {
        logMsg(`Error: \${err.message}`);
      }
      input.disabled = false;
    });

  });
})();
