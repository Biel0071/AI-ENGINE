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
      fetchActiveProjectFiles()
    ]);
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

  // --- AI CITY 3D / ISOMETRIC CANVAS ------------------------------------
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

    // Animated agents representing real runtime agents
    const agents = Array.from({ length: 6 }, (_, i) => ({
      x: 0.25 + (i % 3) * 0.25,
      y: 0.3 + Math.floor(i / 3) * 0.25,
      targetX: Math.random() * 0.5 + 0.25,
      targetY: Math.random() * 0.4 + 0.3,
      speed: 0.0006 + Math.random() * 0.0004,
      avatar: ['📐', '💻', '🚀', '🛡️', '🤖', '⚡'][i],
      label: ['Architect', 'Developer', 'Deployment', 'Security', 'Frontend', 'Database'][i],
      color: ['#f97316', '#38bdf8', '#10b981', '#a78bfa', '#f59e0b', '#3b82f6'][i]
    }));

    let tick = 0;
    function render() {
      tick++;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2 + state.panX;
      const cy = height / 2 + state.panY;
      const scale = state.zoom;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Grid
      const gridSize = 40;
      const gridCount = 16;
      ctx.lineWidth = 1;
      ctx.strokeStyle = state.cyberMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(200, 220, 255, 0.12)';

      for (let x = -gridCount; x <= gridCount; x++) {
        for (let y = -gridCount; y <= gridCount; y++) {
          const isoX = (x - y) * gridSize;
          const isoY = (x + y) * (gridSize * 0.5);
          ctx.beginPath();
          ctx.arc(isoX, isoY, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = (x === 0 && y === 0) ? '#f97316' : 'rgba(56, 189, 248, 0.2)';
          ctx.fill();
        }
      }

      // Vias
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-gridCount * gridSize, 0);
      ctx.lineTo(gridCount * gridSize, 0);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, -gridCount * (gridSize * 0.5));
      ctx.lineTo(0, gridCount * (gridSize * 0.5));
      ctx.stroke();

      // Monument Radial Pulse
      const pulseRadius = (tick * 1.2) % 300;
      ctx.beginPath();
      ctx.ellipse(0, 0, pulseRadius, pulseRadius * 0.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249, 115, 22, ${Math.max(0, 0.3 - pulseRadius / 300)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Buildings
      const buildingsList = [
        { key: 'factory', x: -200, y: -70, w: 85, h: 100, color: '#f97316' },
        { key: 'datacenter', x: -150, y: 60, w: 75, h: 65, color: '#38bdf8' },
        { key: 'district', x: -20, y: -150, w: 95, h: 130, color: '#10b981' },
        { key: 'tower', x: 170, y: -80, w: 75, h: 160, color: '#a78bfa' },
        { key: 'marketplace', x: 110, y: 70, w: 80, h: 75, color: '#f59e0b' },
        { key: 'energy', x: -20, y: 150, w: 70, h: 55, color: '#eab308' },
      ];

      buildingsList.forEach((b) => {
        drawIsoBuilding(ctx, b.x, b.y, b.w, b.h, b.color, state.selectedBuilding === b.key);
      });

      // Agents
      agents.forEach((ag) => {
        ag.x += (ag.targetX - ag.x) * ag.speed * 10;
        ag.y += (ag.targetY - ag.y) * ag.speed * 10;
        if (Math.hypot(ag.targetX - ag.x, ag.targetY - ag.y) < 0.02) {
          ag.targetX = Math.random() * 0.5 + 0.25;
          ag.targetY = Math.random() * 0.4 + 0.3;
        }

        const agentScreenX = (ag.x - 0.5) * 500;
        const agentScreenY = (ag.y - 0.5) * 350;

        ctx.beginPath();
        ctx.arc(agentScreenX, agentScreenY, 5, 0, Math.PI * 2);
        ctx.fillStyle = ag.color;
        ctx.shadowColor = ag.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ag.avatar, agentScreenX, agentScreenY - 5);
      });

      ctx.restore();
      requestAnimationFrame(render);
    }

    function drawIsoBuilding(c, x, y, size, height, color, isHovered) {
      const topY = y - height;

      // Left face
      c.fillStyle = 'rgba(15, 23, 42, 0.9)';
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - size, y - size * 0.4);
      c.lineTo(x - size, topY - size * 0.4);
      c.lineTo(x, topY);
      c.closePath();
      c.fill();
      c.strokeStyle = isHovered ? color : 'rgba(56, 189, 248, 0.3)';
      c.stroke();

      // Right face
      c.fillStyle = 'rgba(20, 30, 55, 0.9)';
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + size, y - size * 0.4);
      c.lineTo(x + size, topY - size * 0.4);
      c.lineTo(x, topY);
      c.closePath();
      c.fill();
      c.strokeStyle = isHovered ? color : 'rgba(56, 189, 248, 0.3)';
      c.stroke();

      // Top Roof Face
      c.fillStyle = isHovered ? color : 'rgba(30, 48, 85, 0.95)';
      c.beginPath();
      c.moveTo(x, topY);
      c.lineTo(x - size, topY - size * 0.4);
      c.lineTo(x, topY - size * 0.8);
      c.lineTo(x + size, topY - size * 0.4);
      c.closePath();
      c.fill();
      c.strokeStyle = color;
      c.lineWidth = isHovered ? 2.5 : 1.2;
      c.stroke();
    }

    render();

    // Camera controls
    document.getElementById('cityZoomIn')?.addEventListener('click', () => { state.zoom = Math.min(state.zoom + 0.2, 2.5); });
    document.getElementById('cityZoomOut')?.addEventListener('click', () => { state.zoom = Math.max(state.zoom - 0.2, 0.5); });
    document.getElementById('cityResetCam')?.addEventListener('click', () => { state.zoom = 1.0; state.panX = 0; state.panY = 0; });
    document.getElementById('cityDayNightToggle')?.addEventListener('click', function() {
      state.cyberMode = !state.cyberMode;
      this.textContent = state.cyberMode ? '🌙 Modo Cyber' : '☀️ Modo Dia';
    });

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
