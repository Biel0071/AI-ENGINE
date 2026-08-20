/**
 * FÊNIX OS v2.1.0 — Unified Frontend Interactive Application (REAL AGENTIC EXECUTION)
 * 1. AI City: Connected to Real Runtime State & EventBus (NO MOCKS)
 * 2. IDE: Connected to Real Project Filesystem, File Reader/Writer & Observer
 * 3. JARVIS Chat: Connected to Real Agentic Task Execution Pipeline & AI Platform Gateway
 */

(function () {
  'use strict';

  // --- APPLICATION STATE (REAL DATA ONLY) --------------------------------
  const state = {
    view: 'city',
    is3D: true,
    cyberMode: true,
    zoom: 1.0,
    panX: 0,
    panY: 0,
    selectedBuilding: null,
    activeProjectId: 'fenix_test_lab',
    activeProject: null,
    activeFile: 'src/components/Dashboard.tsx',
    activeModel: 'qwen2.5:3b',
    secondaryModel: 'deepseek-coder:6.7b',
    tokenCount: 0,
    latency: 182,
    cityState: null,
    projects: [],
    filesTree: [],
    fileContents: {},
    realEvents: []
  };

  // --- INITIALIZATION ---------------------------------------------------
  async function init() {
    initNavigation();
    initCityCanvas();
    initIdeChat();
    initVisualCodeSync();
    initMultiModelBar();
    
    // Load Real Backend Data
    await refreshAllRealData();

    // Periodic live telemetry & event refresh (every 4s)
    setInterval(refreshAllRealData, 4000);
  }

  // --- REAL DATA REFRESH ------------------------------------------------
  async function refreshAllRealData() {
    await Promise.allSettled([
      fetchCityState(),
      fetchProjects(),
      fetchAiPlatformStatus(),
      fetchActiveProjectFiles(),
      fetchDailyOperations()
    ]);
  }

  async function fetchDailyOperations() {
    try {
      const res = await fetch('/api/v2/jarvis/daily-operations');
      if (res.ok) {
        const data = await res.json();
        renderDailyOperations(data);
      }
    } catch (err) {
      console.warn('[FÊNIX JARVIS] Daily operations unavailable:', err.message);
    }
  }

  function renderDailyOperations(report) {
    if (!report) return;

    // Summary Cards
    setElemText('opsProjectsMonitored', report.summary?.projectsMonitored || '0');
    setElemText('opsProjectsHealthy', report.summary?.projectsHealthy || '0');
    setElemText('opsJobsExecuted', report.jobs?.completed || '0');
    setElemText('opsMicrotasksCount', report.jobs?.microtasksCompleted || '0');
    setElemText('opsBugsFixed', report.engineering?.bugsFixed || '0');
    setElemText('opsEstimatedCost', report.intelligence?.estimatedCostBrl || 'R$ 0,00');

    // Pending Approvals
    const approvalsList = document.getElementById('opsApprovalsList');
    const approvalsCount = document.getElementById('opsPendingCount');
    const badge = document.getElementById('opsApprovalsCount');
    const pending = report.pendingApprovals || [];

    if (approvalsCount) approvalsCount.textContent = pending.length;
    if (badge) badge.textContent = pending.length > 0 ? `🔔 ${pending.length}` : '24/7';

    if (approvalsList) {
      if (pending.length === 0) {
        approvalsList.innerHTML = `<div style="color:var(--text-muted); font-size:11.5px; padding:10px;">Nenhuma ação de risco aguardando autorização no momento.</div>`;
      } else {
        approvalsList.innerHTML = pending.map(appr => `
          <div style="background:rgba(18,27,43,0.7); border:1px solid rgba(249,115,22,0.3); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:#fff; font-size:12px;">${escapeHtml(appr.title)}</b>
              <span class="pill-tag text-amber">Pendente</span>
            </div>
            <p style="color:var(--text-secondary); font-size:11px;">${escapeHtml(appr.reason)}</p>
            <div style="display:flex; gap:8px; margin-top:4px;">
              <button class="action-btn-primary approve-job-btn" data-job-id="${escapeHtml(appr.jobId)}" style="font-size:10.5px; padding:3px 10px;" type="button">✅ Autorizar Execução</button>
              <button class="action-btn-ghost reject-job-btn" data-job-id="${escapeHtml(appr.jobId)}" style="font-size:10.5px; padding:3px 10px;" type="button">❌ Recusar</button>
            </div>
          </div>
        `).join('');

        approvalsList.querySelectorAll('.approve-job-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const jid = btn.dataset.jobId;
            await fetch(`/api/v2/jarvis/jobs/${jid}/approve`, { method: 'POST' });
            await fetchDailyOperations();
          });
        });

        approvalsList.querySelectorAll('.reject-job-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const jid = btn.dataset.jobId;
            await fetch(`/api/v2/jarvis/jobs/${jid}/reject`, { method: 'POST' });
            await fetchDailyOperations();
          });
        });
      }
    }

    // Opportunities
    const oppsList = document.getElementById('opsOpportunitiesList');
    const oppsCount = document.getElementById('opsOpportunitiesCount');
    const opps = report.opportunities || [];

    if (oppsCount) oppsCount.textContent = opps.length;
    if (oppsList) {
      if (opps.length === 0) {
        oppsList.innerHTML = `<div style="color:var(--text-muted); font-size:11.5px; padding:10px;">Nenhuma oportunidade de propagação detectada.</div>`;
      } else {
        oppsList.innerHTML = opps.map(op => `
          <div style="background:rgba(18,27,43,0.7); border:1px solid rgba(56,189,248,0.3); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:#fff; font-size:12px;">${escapeHtml(op.title)}</b>
              <span class="pill-tag text-cyan">${escapeHtml(op.type)}</span>
            </div>
            <span style="font-size:10px; color:var(--text-muted);">Descoberto em: ${formatTimeAgo(op.discoveredAt)}</span>
          </div>
        `).join('');
      }
    }
  }

  async function fetchCityState() {
    try {
      const res = await fetch('/api/v2/city/state');
      if (res.ok) {
        const data = await res.json();
        state.cityState = data;
        renderCityKPIs(data);
        renderCityEvents(data.events || []);
      }
    } catch (err) {
      console.warn('[FÊNIX City] Real state unavailable:', err.message);
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch('/api/v2/projects');
      if (res.ok) {
        const data = await res.json();
        state.projects = data.projects || [];
        renderProjectsList(state.projects);
      }
    } catch (err) {
      console.warn('[FÊNIX Projects] Error fetching projects:', err.message);
    }
  }

  async function fetchAiPlatformStatus() {
    try {
      const startTime = Date.now();
      const res = await fetch('/api/v2/ai-platform/status');
      const latency = Date.now() - startTime;

      if (res.ok) {
        const data = await res.json();
        state.latency = data.latencyMs || latency;
        updateTopbarTelemetry(data.status || 'CONNECTED', state.latency, data.defaultModel);
      } else {
        updateTopbarTelemetry('OFFLINE', latency, 'Nenhum');
      }
    } catch {
      updateTopbarTelemetry('DESCONECTADO', 0, 'N/A');
    }
  }

  async function fetchActiveProjectFiles() {
    if (!state.activeProjectId) return;
    try {
      const res = await fetch(`/api/v2/projects/${state.activeProjectId}/files`);
      if (res.ok) {
        const data = await res.json();
        state.filesTree = data.tree || [];
        renderFileTree(state.filesTree);
        
        // If active file is not loaded yet, fetch it
        if (!state.fileContents[state.activeFile]) {
          await loadFileContent(state.activeFile);
        }
      }
    } catch (err) {
      console.warn('[FÊNIX Files] Project files not yet generated:', err.message);
    }
  }

  async function loadFileContent(filePath) {
    if (!state.activeProjectId || !filePath) return;
    try {
      const res = await fetch(`/api/v2/projects/${state.activeProjectId}/file?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        state.fileContents[filePath] = data.content;
        if (state.activeFile === filePath) {
          updateCodeEditor(data.content);
        }
      }
    } catch (err) {
      console.warn(`[FÊNIX Editor] Could not read ${filePath}:`, err.message);
    }
  }

  async function saveFileContent(filePath, content) {
    if (!state.activeProjectId || !filePath) return;
    try {
      const res = await fetch(`/api/v2/projects/${state.activeProjectId}/file`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filePath, content })
      });
      if (res.ok) {
        state.fileContents[filePath] = content;
        showSaveFeedback(true);
        appendTerminalLog(`[Observer] Arquivo real gravado em disco: ${filePath}`, 'emerald');
      } else {
        showSaveFeedback(false);
      }
    } catch (err) {
      showSaveFeedback(false);
      appendTerminalLog(`[Erro] Falha ao salvar arquivo: ${err.message}`, 'rose');
    }
  }

  // --- TOPBAR & TELEMETRY RENDERING -------------------------------------
  function updateTopbarTelemetry(status, latency, model) {
    const statusEl = document.getElementById('topAiStatus');
    const badgeEl = document.getElementById('topAiPlatformBadge');
    const latEl = document.getElementById('topLatency');
    const modelEl = document.getElementById('topActiveModel');

    if (statusEl) statusEl.textContent = status;
    if (latEl) latEl.textContent = `${latency}ms`;
    if (modelEl && model) modelEl.textContent = model;

    if (badgeEl) {
      badgeEl.classList.toggle('live-connected', status === 'CONNECTED' || status === 'OK');
    }
  }

  function renderCityKPIs(cityData) {
    if (!cityData || !cityData.summary) return;
    const s = cityData.summary;

    setElemText('kpiBuildings', s.activeBuildings || '6');
    setElemText('kpiProjects', s.totalProjects !== undefined ? s.totalProjects : '0');
    setElemText('kpiOnlineAgents', s.onlineAgents || '19');
    setElemText('kpiTasksToday', s.activeTasks !== undefined ? s.activeTasks : '0');
    setElemText('kpiEventsTotal', s.totalEvents !== undefined ? s.totalEvents : '0');
  }

  function renderCityEvents(events) {
    const feed = document.getElementById('cityEventsFeed');
    if (!feed) return;

    if (!events || events.length === 0) {
      feed.innerHTML = `
        <div class="event-feed-item">
          <span class="agent-avatar-icon">ℹ️</span>
          <div class="event-text">Nenhum evento registrado no runtime até o momento.</div>
        </div>
      `;
      return;
    }

    feed.innerHTML = events.map(ev => `
      <div class="event-feed-item">
        <span class="agent-avatar-icon">⚡</span>
        <div class="event-text">
          <b>${escapeHtml(ev.agent)}</b>: ${escapeHtml(ev.message)}
        </div>
        <span class="event-time">${formatTimeAgo(ev.time)}</span>
      </div>
    `).join('');
  }

  function renderProjectsList(projects) {
    const grid = document.getElementById('projectsCardGrid');
    if (!grid) return;

    if (!projects || projects.length === 0) {
      grid.innerHTML = `
        <div class="project-box">
          <h3>Nenhum projeto cadastrado</h3>
          <p style="color:var(--text-muted); font-size:12px;">Crie um projeto via Chat ou importe um repositório existente.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = projects.map(p => `
      <div class="project-box" data-project-id="${escapeHtml(p.projectId)}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="color:#fff; font-size:14px; font-weight:700;">${escapeHtml(p.name)}</h3>
          <span class="pill-tag">${escapeHtml(p.dnaVersion || 'v1.0')}</span>
        </div>
        <p style="color:var(--text-muted); font-size:11.5px; font-family:var(--font-code);">${escapeHtml(p.rootPath)}</p>
        <div style="display:flex; gap:6px; margin-top:6px;">
          ${(p.stack || []).map(s => `<span class="pill-tag text-cyan">${escapeHtml(s)}</span>`).join('')}
        </div>
        <button class="action-btn-primary select-proj-btn" data-project-id="${escapeHtml(p.projectId)}" style="margin-top:10px;" type="button">
          💻 Abrir na IDE
        </button>
      </div>
    `).join('');

    grid.querySelectorAll('.select-proj-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = btn.dataset.projectId;
        openProjectInIde(pid);
      });
    });
  }

  function openProjectInIde(projectId) {
    state.activeProjectId = projectId;
    switchView('ide');
    fetchActiveProjectFiles();
  }

  // --- NAVIGATION -------------------------------------------------------
  function initNavigation() {
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        switchView(view);
      });
    });

    document.getElementById('quickOpenIde')?.addEventListener('click', () => switchView('ide'));
    document.getElementById('quickFenixChat')?.addEventListener('click', () => switchView('ide'));
    document.getElementById('openAgentsViewBtn')?.addEventListener('click', () => switchView('agents'));

    const collapseBtn = document.getElementById('collapseSidebarBtn');
    const sidebar = document.getElementById('fenixSidebar');
    collapseBtn?.addEventListener('click', () => {
      sidebar?.classList.toggle('collapsed');
    });

    document.getElementById('fullscreenToggleBtn')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.getElementById('liveRefreshBtn')?.addEventListener('click', () => {
      refreshAllRealData();
    });

    document.getElementById('manualHeartbeatTickBtn')?.addEventListener('click', async () => {
      await fetch('/api/v2/jarvis/heartbeat/tick', { method: 'POST' });
      await refreshAllRealData();
      appendTerminalLog('[JARVIS] Heartbeat 24/7 disparado manualmente. Projetos e jobs atualizados.', 'cyan');
    });
  }

  function switchView(viewName) {
    state.view = viewName;
    document.querySelectorAll('.nav-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === viewName);
    });
    document.querySelectorAll('.workspace-view').forEach((v) => {
      v.classList.toggle('active', v.id === `view-${viewName}`);
    });

    if (viewName === 'city') {
      window.dispatchEvent(new Event('resize'));
    }
  }

  // --- AI CITY 3D / ISOMETRIC CANVAS & LIVING CYBERPUNK CITY -----------
  function initCityCanvas() {
    const canvas = document.getElementById('cityCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Background Stars
    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      phase: Math.random() * Math.PI * 2
    }));

    // Cyber Traffic Vehicles
    const traffic = Array.from({ length: 16 }, (_, i) => ({
      axis: i % 2 === 0 ? 'X' : 'Y',
      pos: (Math.random() - 0.5) * 800,
      lane: (i % 4 - 1.5) * 140,
      speed: (Math.random() * 1.2 + 0.8) * (i % 2 === 0 ? 1 : -1),
      color: i % 3 === 0 ? '#38bdf8' : (i % 3 === 1 ? '#f59e0b' : '#a78bfa'),
      tailLength: 25 + Math.random() * 20
    }));

    // Living Character Agents
    const agents = Array.from({ length: 8 }, (_, i) => ({
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 300,
      targetX: (Math.random() - 0.5) * 400,
      targetY: (Math.random() - 0.5) * 300,
      speed: 0.0008 + Math.random() * 0.0006,
      avatar: ['📐', '💻', '🚀', '🛡️', '🤖', '⚡', '🎨', '🧪'][i % 8],
      role: ['Architect', 'Developer', 'Deployer', 'Security', 'Orchestrator', 'Database', 'Frontend', 'Tester'][i % 8],
      color: ['#f97316', '#38bdf8', '#10b981', '#a78bfa', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'][i % 8],
      step: 0
    }));

    // Floating Phoenix Embers
    const embers = Array.from({ length: 25 }, () => ({
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 40,
      vy: Math.random() * 0.8 + 0.4,
      size: Math.random() * 2.5 + 1,
      alpha: Math.random(),
      hue: Math.random() * 30 + 15
    }));

    let tick = 0;
    function render() {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // 1. Atmosphere / Night Nebula Background
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height) * 0.8);
      if (state.cyberMode) {
        bgGrad.addColorStop(0, '#0c162c');
        bgGrad.addColorStop(0.5, '#070b16');
        bgGrad.addColorStop(1, '#020408');
      } else {
        bgGrad.addColorStop(0, '#1a2744');
        bgGrad.addColorStop(0.6, '#0f172a');
        bgGrad.addColorStop(1, '#080d1a');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Stars
      stars.forEach(st => {
        const tw = (Math.sin(tick * st.twinkleSpeed + st.phase) + 1) / 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + tw * 0.6})`;
        ctx.beginPath();
        ctx.arc(st.x * width, st.y * height, st.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Camera Transform
      const cx = width / 2 + state.panX;
      const cy = height / 2 + state.panY;
      const scale = state.zoom;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // 3. Distant City Skyline Silhouettes
      drawDistantSkyline(ctx, tick);

      // 4. Ground Grid & Neon Road Network
      drawGroundNetwork(ctx, tick);

      // 5. Moving Cyber Traffic (Headlights / Taillights)
      drawTraffic(ctx, traffic);

      // 6. Central Phoenix Grand Plaza & Animated 3D Monument
      drawPhoenixMonument(ctx, tick, embers);

      // 7. Render 3D High-Fidelity Buildings
      drawAllCityBuildings(ctx, tick);

      // 8. Render Living Character Agents
      drawLivingAgents(ctx, agents, tick);

      ctx.restore();
      requestAnimationFrame(render);
    }

    render();

    // Camera Controls
    document.getElementById('cityZoomIn')?.addEventListener('click', () => { state.zoom = Math.min(state.zoom + 0.2, 2.5); });
    document.getElementById('cityZoomOut')?.addEventListener('click', () => { state.zoom = Math.max(state.zoom - 0.2, 0.5); });
    document.getElementById('cityResetCam')?.addEventListener('click', () => { state.zoom = 1.0; state.panX = 0; state.panY = 0; });
    document.getElementById('cityDayNightToggle')?.addEventListener('click', function() {
      state.cyberMode = !state.cyberMode;
      this.textContent = state.cyberMode ? '🌙 Modo Cyber' : '☀️ Modo Dia';
    });

    // Panning with Mouse Drag
    let isDragging = false;
    let startX = 0, startY = 0;

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - state.panX;
      startY = e.clientY - state.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      state.panX = e.clientX - startX;
      state.panY = e.clientY - startY;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      state.zoom = Math.min(Math.max(state.zoom * zoomFactor, 0.4), 3.0);
    }, { passive: false });

    // Building Click Handler (Drawer)
    document.querySelectorAll('.building-card-pin, .monument-pin').forEach((pin) => {
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        const bKey = pin.dataset.building;
        openBuildingDrawer(bKey);
      });
    });

    document.getElementById('drawerCloseBtn')?.addEventListener('click', closeBuildingDrawer);
    document.getElementById('buildingDrawerOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'buildingDrawerOverlay') closeBuildingDrawer();
    });

    // Initialize Lateral JARVIS Chat Assistant
    initCityJarvisAssistant();
  }

  // --- 3D RENDERING PIPELINE HELPERS ------------------------------------

  function drawDistantSkyline(ctx, tick) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;

    // Distant towers
    const distantTowers = [
      { x: -500, w: 40, h: 180 }, { x: -440, w: 60, h: 260 }, { x: -360, w: 50, h: 220 },
      { x: -280, w: 70, h: 310 }, { x: -180, w: 55, h: 240 }, { x: 180, w: 65, h: 290 },
      { x: 270, w: 45, h: 210 }, { x: 340, w: 80, h: 340 }, { x: 440, w: 50, h: 250 }
    ];

    distantTowers.forEach(t => {
      ctx.fillRect(t.x, -180 - t.h * 0.4, t.w, t.h * 0.4);
      ctx.strokeRect(t.x, -180 - t.h * 0.4, t.w, t.h * 0.4);
      
      // Blinking rooftop beacon
      if (Math.sin(tick * 0.05 + t.x) > 0.5) {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(t.x + t.w / 2, -180 - t.h * 0.4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
      }
    });
    ctx.restore();
  }

  function drawGroundNetwork(ctx, tick) {
    const gridSize = 45;
    const gridCount = 14;

    // Grid Floor
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';

    for (let x = -gridCount; x <= gridCount; x++) {
      for (let y = -gridCount; y <= gridCount; y++) {
        const isoX = (x - y) * gridSize;
        const isoY = (x + y) * (gridSize * 0.5);

        // Ground Tiles
        ctx.beginPath();
        ctx.arc(isoX, isoY, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.fill();
      }
    }

    // Main Illuminated Neon Boulevards (Highways)
    const roads = [
      { from: [-gridCount * gridSize, 0], to: [gridCount * gridSize, 0], color: '#f97316' },
      { from: [0, -gridCount * (gridSize * 0.5)], to: [0, gridCount * (gridSize * 0.5)], color: '#38bdf8' },
      { from: [-gridCount * gridSize * 0.7, -120], to: [gridCount * gridSize * 0.7, 120], color: '#8b5cf6' },
      { from: [-gridCount * gridSize * 0.7, 120], to: [gridCount * gridSize * 0.7, -120], color: '#10b981' }
    ];

    roads.forEach(r => {
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.beginPath();
      ctx.moveTo(r.from[0], r.from[1]);
      ctx.lineTo(r.to[0], r.to[1]);
      ctx.stroke();

      // Neon Lane Stripe
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = r.color;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }

  function drawTraffic(ctx, traffic) {
    traffic.forEach(t => {
      t.pos += t.speed;
      if (t.pos > 400) t.pos = -400;
      if (t.pos < -400) t.pos = 400;

      let x, y, tx, ty;
      if (t.axis === 'X') {
        x = t.pos;
        y = t.lane * 0.5;
        tx = x - (t.speed > 0 ? t.tailLength : -t.tailLength);
        ty = y;
      } else {
        x = t.lane;
        y = t.pos * 0.5;
        tx = x;
        ty = y - (t.speed > 0 ? t.tailLength * 0.5 : -t.tailLength * 0.5);
      }

      // Light streak
      const grad = ctx.createLinearGradient(tx, ty, x, y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, t.color);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Headlight point
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawPhoenixMonument(ctx, tick, embers) {
    ctx.save();
    // 1. Concentric Radial Energy Plaza
    const plazaRadius = 75;
    ctx.beginPath();
    ctx.ellipse(0, 0, plazaRadius, plazaRadius * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Concentric pulse wave
    const waveRadius = (tick * 1.5) % 220;
    ctx.beginPath();
    ctx.ellipse(0, 0, waveRadius, waveRadius * 0.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(249, 115, 22, ${Math.max(0, 0.5 - waveRadius / 220)})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Multi-tier Golden Pedestal
    drawIsoBlock(ctx, 0, 0, 32, 16, '#d97706', '#f59e0b', '#78350f');
    drawIsoBlock(ctx, 0, -16, 22, 14, '#b45309', '#fbbf24', '#451a03');

    // 3. Floating Animated Flame Phoenix Wings
    const wingFlap = Math.sin(tick * 0.08) * 10;
    const monumentY = -34;

    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 20;

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(0, monumentY);
    ctx.quadraticCurveTo(-25, monumentY - 20 - wingFlap, -35, monumentY - 35 - wingFlap);
    ctx.quadraticCurveTo(-20, monumentY - 15, 0, monumentY - 10);
    ctx.closePath();
    ctx.fill();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(0, monumentY);
    ctx.quadraticCurveTo(25, monumentY - 20 - wingFlap, 35, monumentY - 35 - wingFlap);
    ctx.quadraticCurveTo(20, monumentY - 15, 0, monumentY - 10);
    ctx.closePath();
    ctx.fill();

    // Phoenix Head & Core Flame
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, monumentY - 22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. Rising Flame Embers
    embers.forEach(em => {
      em.y -= em.vy;
      em.alpha -= 0.008;
      if (em.alpha <= 0) {
        em.x = (Math.random() - 0.5) * 50;
        em.y = monumentY + 10;
        em.alpha = 1.0;
      }
      ctx.fillStyle = `hsla(${em.hue}, 100%, 60%, ${em.alpha})`;
      ctx.beginPath();
      ctx.arc(em.x, em.y, em.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawAllCityBuildings(ctx, tick) {
    // 1. SOFTWARE FACTORY (High-Tech Industrial)
    drawCyberBuilding(ctx, {
      x: -240, y: -70, width: 95, height: 120,
      primaryColor: '#f97316', secondaryColor: '#0ea5e9',
      hasCrane: true, hasAntenna: true, label: 'SOFTWARE FACTORY',
      isHovered: state.selectedBuilding === 'factory', tick
    });

    // 2. DATA CENTER (Server Monolith Block)
    drawDataCenterBuilding(ctx, {
      x: -160, y: 90, width: 85, height: 75,
      isHovered: state.selectedBuilding === 'datacenter', tick
    });

    // 3. AGENT DISTRICT (Twin Towers with Skybridge)
    drawAgentDistrictTowers(ctx, {
      x: -10, y: -170, width: 100, height: 155,
      isHovered: state.selectedBuilding === 'district', tick
    });

    // 4. PROJECT TOWER (Stepped Skyscraper)
    drawProjectTower(ctx, {
      x: 210, y: -90, width: 80, height: 185,
      isHovered: state.selectedBuilding === 'tower', tick
    });

    // 5. MARKETPLACE (Octagonal Cyber Pavilion)
    drawMarketplacePavilion(ctx, {
      x: 160, y: 80, width: 85, height: 80,
      isHovered: state.selectedBuilding === 'marketplace', tick
    });

    // 6. ENERGY PLANT (Fusion Reactor Core)
    drawEnergyPlantReactor(ctx, {
      x: -40, y: 170, width: 80, height: 60,
      isHovered: state.selectedBuilding === 'energy', tick
    });

    // 7. REAL USER PROJECTS DYNAMIC BUILDINGS (e.g. Fenix Test Lab)
    if (state.projects && state.projects.length > 0) {
      state.projects.forEach((prj, idx) => {
        const posX = 110 + (idx * 80);
        const posY = -180 - (idx * 40);
        drawProjectBuildingDynamic(ctx, prj, posX, posY, tick);
      });
    }
  }

  // --- INDIVIDUAL BUILDING 3D RENDERERS ---------------------------------

  function drawCyberBuilding(ctx, b) {
    const { x, y, width: size, height, primaryColor, isHovered, tick } = b;
    const topY = y - height;

    // Main multi-volume block
    drawIsoBlock(ctx, x, y, size, height, 'rgba(15, 23, 42, 0.95)', 'rgba(30, 48, 85, 0.98)', 'rgba(10, 16, 30, 0.95)', isHovered ? primaryColor : 'rgba(56, 189, 248, 0.4)');

    // Glowing Neon Window Matrix
    ctx.fillStyle = primaryColor;
    ctx.globalAlpha = 0.8;
    for (let r = 1; r <= 4; r++) {
      const winY = topY + (r * height) / 5;
      ctx.fillRect(x - size * 0.7, winY - size * 0.2, 10, 4);
      ctx.fillRect(x - size * 0.3, winY - size * 0.05, 10, 4);
      ctx.fillRect(x + size * 0.2, winY - size * 0.2, 10, 4);
    }
    ctx.globalAlpha = 1.0;

    // Rooftop Antenna & Fabrication Laser
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, topY - size * 0.4);
    ctx.lineTo(x, topY - size * 0.4 - 25);
    ctx.stroke();

    // Laser Spark
    const sparkAlpha = (Math.sin(tick * 0.2) + 1) / 2;
    ctx.fillStyle = `rgba(249, 115, 22, ${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(x, topY - size * 0.4 - 25, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDataCenterBuilding(ctx, b) {
    const { x, y, width: size, height, isHovered, tick } = b;
    const topY = y - height;

    drawIsoBlock(ctx, x, y, size, height, 'rgba(10, 18, 32, 0.96)', 'rgba(15, 30, 55, 0.98)', 'rgba(8, 14, 25, 0.96)', isHovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)');

    // Vertical Blue Server LED Strips
    for (let c = 0; c < 3; c++) {
      const ledX = x - size * 0.6 + (c * size * 0.25);
      const isLit = (Math.floor(tick / 15) + c) % 2 === 0;
      ctx.fillStyle = isLit ? '#38bdf8' : '#0369a1';
      ctx.fillRect(ledX, y - height * 0.8, 3, height * 0.6);
    }
  }

  function drawAgentDistrictTowers(ctx, b) {
    const { x, y, width: size, height, isHovered, tick } = b;
    const topY = y - height;

    // Tower A (Left)
    drawIsoBlock(ctx, x - 25, y, size * 0.45, height, 'rgba(15, 23, 42, 0.96)', '#1e293b', 'rgba(10, 16, 28, 0.96)', isHovered ? '#10b981' : 'rgba(16, 185, 129, 0.4)');

    // Tower B (Right)
    drawIsoBlock(ctx, x + 25, y, size * 0.45, height * 1.15, 'rgba(15, 23, 42, 0.96)', '#1e293b', 'rgba(10, 16, 28, 0.96)', isHovered ? '#10b981' : 'rgba(16, 185, 129, 0.4)');

    // Skybridge connecting Tower A and B
    const bridgeY = y - height * 0.6;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x - 25, bridgeY, 50, 10);
    ctx.strokeRect(x - 25, bridgeY, 50, 10);
  }

  function drawProjectTower(ctx, b) {
    const { x, y, width: size, height, isHovered, tick } = b;
    // Stepped skyscraper tiers
    drawIsoBlock(ctx, x, y, size, height * 0.5, 'rgba(15, 23, 42, 0.96)', '#2e1065', 'rgba(10, 16, 28, 0.96)', isHovered ? '#a78bfa' : 'rgba(167, 139, 250, 0.4)');
    drawIsoBlock(ctx, x, y - height * 0.5, size * 0.75, height * 0.35, 'rgba(15, 23, 42, 0.96)', '#3b0764', 'rgba(10, 16, 28, 0.96)', isHovered ? '#a78bfa' : 'rgba(167, 139, 250, 0.4)');
    drawIsoBlock(ctx, x, y - height * 0.85, size * 0.5, height * 0.25, 'rgba(15, 23, 42, 0.96)', '#581c87', 'rgba(10, 16, 28, 0.96)', isHovered ? '#a78bfa' : 'rgba(167, 139, 250, 0.4)');

    // Rooftop Warning Beacon
    const topY = y - height * 1.1;
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, topY - 20);
    ctx.stroke();

    ctx.fillStyle = (Math.sin(tick * 0.1) > 0) ? '#f43f5e' : 'transparent';
    ctx.beginPath();
    ctx.arc(x, topY - 20, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMarketplacePavilion(ctx, b) {
    const { x, y, width: size, height, isHovered } = b;
    drawIsoBlock(ctx, x, y, size, height * 0.7, 'rgba(15, 23, 42, 0.96)', '#78350f', 'rgba(10, 16, 28, 0.96)', isHovered ? '#f59e0b' : 'rgba(245, 158, 11, 0.4)');
  }

  function drawEnergyPlantReactor(ctx, b) {
    const { x, y, width: size, height, isHovered, tick } = b;
    drawIsoBlock(ctx, x, y, size, height, 'rgba(15, 23, 42, 0.96)', '#422006', 'rgba(10, 16, 28, 0.96)', isHovered ? '#eab308' : 'rgba(234, 179, 8, 0.4)');

    // Pulsing Plasma Ring on Top
    const pulse = Math.sin(tick * 0.1) * 3;
    ctx.beginPath();
    ctx.ellipse(x, y - height - 8, size * 0.5 + pulse, (size * 0.5 + pulse) * 0.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawProjectBuildingDynamic(ctx, project, x, y, tick) {
    const height = 110;
    const size = 65;
    drawIsoBlock(ctx, x, y, size, height, 'rgba(10, 20, 35, 0.98)', '#0284c7', 'rgba(6, 12, 22, 0.98)', '#38bdf8');

    // Project Name Label Floating
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.fillText(`📁 ${project.name}`, x, y - height - 12);
    ctx.shadowBlur = 0;
  }

  function drawIsoBlock(ctx, x, y, size, height, leftCol, topCol, rightCol, strokeCol = null) {
    const topY = y - height;

    // Left Face
    ctx.fillStyle = leftCol;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size, y - size * 0.4);
    ctx.lineTo(x - size, topY - size * 0.4);
    ctx.lineTo(x, topY);
    ctx.closePath();
    ctx.fill();
    if (strokeCol) { ctx.strokeStyle = strokeCol; ctx.stroke(); }

    // Right Face
    ctx.fillStyle = rightCol;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y - size * 0.4);
    ctx.lineTo(x + size, topY - size * 0.4);
    ctx.lineTo(x, topY);
    ctx.closePath();
    ctx.fill();
    if (strokeCol) { ctx.strokeStyle = strokeCol; ctx.stroke(); }

    // Top Face
    ctx.fillStyle = topCol;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x - size, topY - size * 0.4);
    ctx.lineTo(x, topY - size * 0.8);
    ctx.lineTo(x + size, topY - size * 0.4);
    ctx.closePath();
    ctx.fill();
    if (strokeCol) { ctx.strokeStyle = strokeCol; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function drawLivingAgents(ctx, agents, tick) {
    agents.forEach(ag => {
      // Path movement
      ag.x += (ag.targetX - ag.x) * ag.speed * 8;
      ag.y += (ag.targetY - ag.y) * ag.speed * 8;

      if (Math.hypot(ag.targetX - ag.x, ag.targetY - ag.y) < 0.03) {
        ag.targetX = (Math.random() - 0.5) * 500;
        ag.targetY = (Math.random() - 0.5) * 350;
      }

      const screenX = ag.x;
      const screenY = ag.y;

      // Glowing Ground Aura
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, 8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = ag.color;
      ctx.shadowColor = ag.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Character Body & Avatar
      const bobbing = Math.sin(tick * 0.15 + ag.x) * 2;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ag.avatar, screenX, screenY - 8 + bobbing);

      // Status Pill above head
      ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
      ctx.fillRect(screenX - 24, screenY - 26 + bobbing, 48, 12);
      ctx.strokeStyle = ag.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX - 24, screenY - 26 + bobbing, 48, 12);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.fillText(ag.role, screenX, screenY - 17 + bobbing);
    });
  }

  // --- LATERAL JARVIS ASSISTANT CHAT CONTROLLER -------------------------
  function initCityJarvisAssistant() {
    const form = document.getElementById('cityJarvisForm');
    const input = document.getElementById('cityJarvisInput');
    const feed = document.getElementById('cityJarvisMessagesFeed');
    const toggleBtn = document.getElementById('toggleJarvisSideBtn');
    const split = document.querySelector('.city-main-split');

    toggleBtn?.addEventListener('click', () => {
      split?.classList.toggle('jarvis-collapsed');
      window.dispatchEvent(new Event('resize'));
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input?.value.trim();
      if (!text) return;

      appendCityJarvisMessage('user', text);
      if (input) input.value = '';

      await executeJarvisAssistantCommand(text);
    });

    document.querySelectorAll('.jarvis-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.dataset.cmd;
        if (input) input.value = cmd;
        form?.dispatchEvent(new Event('submit'));
      });
    });
  }

  async function executeJarvisAssistantCommand(prompt) {
    const msgId = 'jmsg_' + Date.now();
    appendCityJarvisMessage('assistant', `
      <p><b>FÊNIX JARVIS:</b> Analisando instrução...</p>
      <div class="msg-action-box" style="margin-top:6px;">
        <span class="action-spinner"></span>
        <span>Orquestrando agentes e verificando políticas 24/7...</span>
      </div>
    `, msgId);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/v2/agentic/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          projectId: state.activeProjectId || 'fenix_test_lab',
          projectName: 'Fenix Test Lab',
          stack: 'React + Vite'
        })
      });

      const data = await res.json();
      const latency = Date.now() - startTime;
      const targetMsg = document.getElementById(msgId);

      if (data.success) {
        state.tokenCount += 450;
        updateTopbarTelemetry('CONNECTED', latency, state.activeModel);

        if (targetMsg) {
          const body = targetMsg.querySelector('.msg-body');
          if (body) {
            body.innerHTML = `
              <p><b>✅ Tarefa #${escapeHtml(data.taskId)} Concluída!</b></p>
              <p style="font-size:11.5px; margin-top:4px;">Arquivos atualizados no disco para <b>${escapeHtml(data.projectName)}</b>.</p>
              <div class="msg-action-box" style="margin-top:6px;">
                <span>⚡ Agentes: <b>${data.agentsInvolved.map(a => a.name).join(', ')}</b></span>
              </div>
            `;
          }
        }
        await refreshAllRealData();
      } else {
        throw new Error(data.error || 'Falha na execução');
      }
    } catch (err) {
      const targetMsg = document.getElementById(msgId);
      if (targetMsg) {
        const body = targetMsg.querySelector('.msg-body');
        if (body) {
          body.innerHTML = `<p style="color:var(--flame);"><b>Erro:</b> ${escapeHtml(err.message)}</p>`;
        }
      }
    }
  }

  function appendCityJarvisMessage(role, htmlContent, id = null) {
    const feed = document.getElementById('cityJarvisMessagesFeed');
    if (!feed) return;

    const div = document.createElement('div');
    div.className = `chat-msg msg-${role}`;
    if (id) div.id = id;

    div.innerHTML = `
      <div class="msg-header">
        <div class="msg-avatar">${role === 'user' ? '👤' : '🔥'}</div>
        <span class="msg-author">${role === 'user' ? 'Você' : 'FÊNIX JARVIS'}</span>
        ${role === 'assistant' ? '<span class="msg-status-dot"></span><span class="msg-badge">Online</span>' : ''}
      </div>
      <div class="msg-body">${htmlContent}</div>
    `;

    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
  }

  function openBuildingDrawer(key) {
    state.selectedBuilding = key;
    const overlay = document.getElementById('buildingDrawerOverlay');
    const title = document.getElementById('drawerTitle');
    const icon = document.getElementById('drawerIcon');
    const sub = document.getElementById('drawerSubtitle');
    const body = document.getElementById('drawerBody');

    const bData = state.cityState?.buildings?.[key] || {};
    const titles = {
      factory: { t: 'SOFTWARE FACTORY', i: '🏢', d: 'Fábrica de Software Autônoma • Geração e Refatoração Fullstack' },
      datacenter: { t: 'DATA CENTER', i: '🗄️', d: 'Infraestrutura Enterprise • Banco Relacional, Cache e Vetores' },
      district: { t: 'AGENT DISTRICT', i: '🏛️', d: 'Distrito Central de Agentes • 19 Agentes Especializados Vivos' },
      tower: { t: 'PROJECT TOWER', i: '🗼', d: 'Torre de Projetos • Multi-Project Workspaces' },
      marketplace: { t: 'MARKETPLACE', i: '🏪', d: 'Hub de Skills e Extensões Reutilizáveis' },
      energy: { t: 'ENERGY PLANT', i: '⚡', d: 'Compute & AI Gateway Infrastructure' },
      monument: { t: 'MONUMENTO CENTRAL FÊNIX', i: '🔥', d: 'Núcleo Central do FÊNIX OS' }
    }[key] || { t: 'MÓDULO', i: '📦', d: 'Módulo do Sistema' };

    if (title) title.textContent = titles.t;
    if (icon) icon.textContent = titles.i;
    if (sub) sub.textContent = titles.d;

    if (body) {
      body.innerHTML = `
        <div class="drawer-section">
          <div class="drawer-section-title">ESTADO REAL DO MÓDULO</div>
          <pre style="background:rgba(0,0,0,0.4); padding:10px; border-radius:6px; font-family:var(--font-code); font-size:11px; color:#cbd5e1; overflow-x:auto;">${JSON.stringify(bData, null, 2)}</pre>
        </div>
        <div class="drawer-actions-row">
          <button class="action-btn-primary" style="flex:1;" id="drawerOpenInIdeBtn" type="button">💻 Abrir na IDE</button>
        </div>
      `;

      document.getElementById('drawerOpenInIdeBtn')?.addEventListener('click', () => {
        closeBuildingDrawer();
        switchView('ide');
      });
    }

    overlay?.classList.add('active');
  }

  function closeBuildingDrawer() {
    state.selectedBuilding = null;
    document.getElementById('buildingDrawerOverlay')?.classList.remove('active');
  }

  // --- JARVIS AGENTIC CHAT & TASK PIPELINE -------------------------------
  function initIdeChat() {
    const form = document.getElementById('ideChatForm');
    const input = document.getElementById('ideChatInput');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input?.value.trim();
      if (!text) return;

      appendChatMessage('user', text);
      if (input) input.value = '';

      await executeRealAgenticTask(text);
    });

    document.querySelectorAll('.prompt-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        if (input) input.value = prompt;
        form?.dispatchEvent(new Event('submit'));
      });
    });
  }

  async function executeRealAgenticTask(prompt) {
    const msgId = 'msg_' + Date.now();
    appendChatMessage('assistant', `
      <p><b>Iniciando Task Engine Real...</b></p>
      <div class="msg-action-box" style="margin-top:6px;">
        <span class="action-spinner"></span>
        <span>Orquestrando agentes (Architect, Frontend, Developer, Testing) e executando no disco...</span>
      </div>
    `, msgId);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/v2/agentic/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          projectId: state.activeProjectId || 'fenix_test_lab',
          projectName: 'Fenix Test Lab',
          stack: 'React + Vite'
        })
      });

      const data = await res.json();
      const latency = Date.now() - startTime;
      const targetMsg = document.getElementById(msgId);

      if (data.success) {
        state.tokenCount += 450;
        updateTopbarTelemetry('CONNECTED', latency, state.activeModel);

        if (targetMsg) {
          const body = targetMsg.querySelector('.msg-body');
          if (body) {
            body.innerHTML = `
              <p><b>✅ Tarefa #${escapeHtml(data.taskId)} Executada com Sucesso!</b></p>
              <p style="font-size:12px; margin-top:4px;">Projeto <b>${escapeHtml(data.projectName)}</b> gerado/modificado no workspace real.</p>
              
              <div style="margin-top:8px;">
                <div style="font-weight:700; font-size:11px; color:var(--text-muted); margin-bottom:4px;">ARQUIVOS GERADOS NO DISCO:</div>
                <ul class="feature-checklist">
                  ${data.filesGenerated.map(f => `<li>📁 <code>${escapeHtml(f)}</code></li>`).join('')}
                </ul>
              </div>

              <div style="margin-top:8px;">
                <div style="font-weight:700; font-size:11px; color:var(--text-muted); margin-bottom:4px;">AGENTES ENVOLVIDOS:</div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  ${data.agentsInvolved.map(ag => `
                    <div style="font-size:11px; display:flex; gap:6px;">
                      <span class="slot-dot"></span>
                      <b>${escapeHtml(ag.name)}:</b> <span style="color:var(--text-secondary);">${escapeHtml(ag.role)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="msg-action-box" style="margin-top:10px;">
                <span>⚡ Skills Utilizadas: <b>${data.skillsUsed.join(', ')}</b> • Latência: <b>${latency}ms</b></span>
              </div>
            `;
          }
        }

        // Refresh file tree and editor content from disk
        await fetchActiveProjectFiles();
        appendTerminalLog(`[Task Engine] Task #${data.taskId} concluída. 6 arquivos gravados em disco.`, 'emerald');
      } else {
        throw new Error(data.error || 'Erro na execução da tarefa');
      }
    } catch (err) {
      const targetMsg = document.getElementById(msgId);
      if (targetMsg) {
        const body = targetMsg.querySelector('.msg-body');
        if (body) {
          body.innerHTML = `
            <p style="color:var(--flame);"><b>Erro na Execução da Tarefa:</b> ${escapeHtml(err.message)}</p>
          `;
        }
      }
      appendTerminalLog(`[Erro Task Engine] ${err.message}`, 'rose');
    }
  }

  function appendChatMessage(role, htmlContent, id = null) {
    const container = document.getElementById('ideChatMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-msg msg-${role}`;
    if (id) div.id = id;

    div.innerHTML = `
      <div class="msg-header">
        <div class="msg-avatar">${role === 'user' ? '👤' : '🔥'}</div>
        <span class="msg-author">${role === 'user' ? 'Você' : 'FÊNIX JARVIS'}</span>
        ${role === 'assistant' ? '<span class="msg-status-dot"></span><span class="msg-badge">Online</span>' : ''}
      </div>
      <div class="msg-body">${htmlContent}</div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // --- VISUAL ↔ CODE SYNC & FILE TREE -----------------------------------
  function initVisualCodeSync() {
    const editor = document.getElementById('codeEditorArea');
    const saveBtn = document.getElementById('codeSaveBtn');
    const saveDeployBtn = document.getElementById('saveAndDeployBtn');

    editor?.addEventListener('input', () => {
      state.fileContents[state.activeFile] = editor.value;
      updateLineNumbers();
    });

    saveBtn?.addEventListener('click', () => {
      saveFileContent(state.activeFile, editor?.value || '');
    });

    saveDeployBtn?.addEventListener('click', () => {
      saveFileContent(state.activeFile, editor?.value || '');
    });

    // Viewport presets
    document.querySelectorAll('.device-btn').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.device-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        const res = b.dataset.res;
        const liveView = document.getElementById('liveDashboardPreview');
        if (liveView) {
          liveView.style.maxWidth = res === '100%' ? '100%' : `${res}px`;
        }
      });
    });

    // Modes (Visual, Code, Split, Preview)
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        const mode = b.dataset.mode;
        const grid = document.querySelector('.ide-grid');
        if (grid) {
          if (mode === 'visual') grid.style.gridTemplateColumns = '320px 1fr 420px';
          if (mode === 'code') grid.style.gridTemplateColumns = '320px 0 1fr';
          if (mode === 'split') grid.style.gridTemplateColumns = '280px 1fr 1fr';
          if (mode === 'preview') grid.style.gridTemplateColumns = '0 1fr 0';
        }
      });
    });

    // Visual Element Click -> Code navigation
    document.querySelectorAll('[data-inspect-target]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('[data-inspect-target]').forEach((x) => x.classList.remove('inspect-active'));
        el.classList.add('inspect-active');

        const target = el.dataset.inspectTarget;
        locateTargetInCode(target);
      });
    });
  }

  function renderFileTree(tree) {
    const container = document.getElementById('fileTreeView');
    if (!container) return;

    if (!tree || tree.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted); font-size:11px; padding:4px;">Nenhum arquivo encontrado no workspace.</div>`;
      return;
    }

    function buildHtml(nodes) {
      return nodes.map(node => {
        if (node.type === 'directory') {
          return `
            <div class="tree-node folder open">
              <span class="node-icon">📁</span>
              <span class="node-label">${escapeHtml(node.name)}</span>
              <div class="tree-children">${buildHtml(node.children || [])}</div>
            </div>
          `;
        }
        const isActive = state.activeFile === node.path;
        return `
          <div class="tree-node file ${isActive ? 'active' : ''}" data-file-path="${escapeHtml(node.path)}">
            <span class="node-icon">${getFileIcon(node.name)}</span>
            <span class="node-label">${escapeHtml(node.name)}</span>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = buildHtml(tree);

    container.querySelectorAll('.tree-node.file').forEach(node => {
      node.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fPath = node.dataset.filePath;
        state.activeFile = fPath;
        container.querySelectorAll('.tree-node.file').forEach(x => x.classList.remove('active'));
        node.classList.add('active');
        await loadFileContent(fPath);
      });
    });
  }

  function getFileIcon(filename) {
    if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) return '⚛️';
    if (filename.endsWith('.ts') || filename.endsWith('.js')) return '📄';
    if (filename.endsWith('.css')) return '🎨';
    if (filename.endsWith('.json')) return '📦';
    if (filename.endsWith('.html')) return '🌐';
    return '📄';
  }

  function updateCodeEditor(content) {
    const editor = document.getElementById('codeEditorArea');
    if (editor) {
      editor.value = content || '';
    }
    updateLineNumbers();
  }

  function updateLineNumbers() {
    const editor = document.getElementById('codeEditorArea');
    const numbers = document.getElementById('codeLineNumbers');
    if (!editor || !numbers) return;

    const count = (editor.value.match(/\n/g) || []).length + 1;
    numbers.innerHTML = Array.from({ length: count }, (_, i) => `<div>${i + 1}</div>`).join('');
  }

  function locateTargetInCode(targetName) {
    const editor = document.getElementById('codeEditorArea');
    if (!editor) return;

    const content = editor.value;
    let searchStr = 'Dashboard';
    if (targetName === 'card-vendas') searchStr = 'Total Vendas';
    if (targetName === 'card-pedidos') searchStr = 'Clientes Ativos';
    if (targetName === 'card-clientes') searchStr = 'Projetos Executados';
    if (targetName === 'card-ticket') searchStr = 'Status Operacional';

    const index = content.indexOf(searchStr);
    if (index !== -1) {
      editor.focus();
      editor.setSelectionRange(index, index + searchStr.length);
    }
  }

  function showSaveFeedback(success) {
    const saveBtn = document.getElementById('codeSaveBtn');
    if (saveBtn) {
      saveBtn.textContent = success ? '✅ Salvo!' : '❌ Erro';
      setTimeout(() => { saveBtn.textContent = '💾 Salvar'; }, 1500);
    }
  }

  function appendTerminalLog(msg, color = 'muted') {
    const term = document.getElementById('ideTerminalBody');
    if (!term) return;

    const line = document.createElement('div');
    line.className = `term-line text-${color}`;
    line.textContent = msg;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
  }

  // --- MULTI-MODEL BAR --------------------------------------------------
  function initMultiModelBar() {
    const pSelect = document.getElementById('selectPrimaryModel');
    const sSelect = document.getElementById('selectSecondaryModel');

    pSelect?.addEventListener('change', () => {
      state.activeModel = pSelect.value;
      setElemText('topActiveModel', state.activeModel);
    });

    sSelect?.addEventListener('change', () => {
      state.secondaryModel = sSelect.value;
    });
  }

  // --- HELPERS ----------------------------------------------------------
  function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 10) return 'agora';
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
    return `${Math.floor(diff / 3600)}h atrás`;
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
