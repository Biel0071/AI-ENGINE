(function () {
  'use strict';

  const RUNTIME_AREAS = [
    ['core', 'FENIX CORE', 'Runtime kernel and event bus'],
    ['orchestrator', 'ORCHESTRATOR', 'Mission and job dispatch'],
    ['projects', 'PROJECTS', 'Registered projects and repos'],
    ['agents', 'AGENTS', 'Active runtime agents'],
    ['jobs', 'JOB QUEUE', 'Queued and running work'],
    ['memory', 'MEMORY', 'Stored memories and decisions'],
    ['rag', 'RAG', 'Knowledge retrieval'],
    ['skills', 'SKILLS', 'Registered skills'],
    ['mcp', 'MCP', 'Tool connections'],
    ['browser', 'BROWSER', 'Preview and inspection'],
    ['git', 'GIT', 'Branch and modified files'],
    ['vps', 'VPS', 'Runtime process status']
  ];

  const EVENT_TYPES = new Set([
    'runtime.connected',
    'runtime.heartbeat',
    'job.created',
    'job.queued',
    'job.ready',
    'job.started',
    'job.progress',
    'job.completed',
    'job.failed',
    'job.retrying',
    'job.cancelled',
    'job.paused',
    'job.resumed',
    'agent.started',
    'agent.progress',
    'agent.completed',
    'mission.created',
    'mission.completed',
    'mission.failed',
    'memory.created',
    'visual.capture',
    'visual.diff',
    'visual.regression',
    'repair.started',
    'repair.completed',
    'preview.reload',
    'preview.ready',
    'preview.error',
    'source.changed'
  ]);

  const FENIX_WORLD_MAP = true;

  const state = {
    api: {},
    events: [],
    selectedFloor: null,
    selectedRoom: null,
    selectedProjectId: null,
    worldMode: 'FLOOR',
    camera: { x: 0, y: 0, zoom: 1, rotate: 0, mode: 'NORMAL' },
    selectedAgent: null,
    tabs: [],
    activeTabId: null,
    firstSnapshotAt: null,
    lastSeenSeq: Number(localStorage.getItem('fenix_last_seen_seq') || 0)
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  function cockpitDebug() {
    if (!window.__fenixCockpitDebug) window.__fenixCockpitDebug = {};
    window.__fenixCockpitDebug.state = state;
    return window.__fenixCockpitDebug;
  }
  cockpitDebug();

  function api(path, options = {}) {
    return window.FENIX?.api
      ? window.FENIX.api(path, options)
      : requestJson(path, options);
  }

  function requestJson(path, options = {}) {
    const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + (localStorage.getItem('grg_token') || ''), ...(options.headers || {}) };
    if (typeof fetch === 'function') {
      return fetch(path, { ...options, headers }).then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method || 'GET', path, true);
      Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.timeout = options.timeout || 12000;
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(`HTTP ${xhr.status}`));
          return;
        }
        try { resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null); }
        catch (error) { reject(error); }
      };
      xhr.onerror = () => reject(new Error('XHR network error'));
      xhr.ontimeout = () => reject(new Error('XHR timeout'));
      xhr.send(options.body || null);
    });
  }

  function statusClass(status) {
    const s = String(status || '').toUpperCase();
    if (/ERROR|FAILED|BLOCKED|OFFLINE|DEGRADED/.test(s)) return 'bad';
    if (/WORKING|RUNNING|ACTIVE|ONLINE|CONNECTED|READY|COMPLETED|SUCCEEDED|BROWSER|TESTING|REVIEWING/.test(s)) return 'good';
    if (/WAITING|QUEUED|PENDING|CONFIGURED|REPAIRING|RETRYING/.test(s)) return 'warn';
    return 'muted';
  }

  function normalizeStatus(value) {
    const s = String(value || 'IDLE').toUpperCase();
    if (s === 'ACTIVE' || s === 'RUNNING') return 'WORKING';
    if (s === 'SUCCEEDED') return 'COMPLETED';
    return s;
  }

  function getJobs() {
    const live = window.FENIX?.live || {};
    return [...(live.jobs || []), ...(live.runtimeJobs || []), ...(state.api.snapshot?.jobs || []), ...(state.api.devJobs?.jobs || []), ...(state.api.jobs?.jobs || [])]
      .filter((job, index, arr) => job && job.id && arr.findIndex((x) => x.id === job.id) === index)
      .sort((a, b) => String(b.createdAt || b.startedAt || '').localeCompare(String(a.createdAt || a.startedAt || '')));
  }

  function getAgents() {
    const liveAgents = window.FENIX?.live?.agents || [];
    const panelTasks = (state.api.agentsPanel?.tasks || []).filter((task) => /RUNNING|ACTIVE|WORKING|WAITING|BLOCKED|ERROR/i.test(task.status || task.state || ''));
    const jobAgents = getJobs()
      .filter((job) => /RUNNING|REPAIRING|WORKING|TESTING|WAITING|BLOCKED|REVIEWING/i.test(job.status || ''))
      .filter((job) => job.agentId || job.workerId)
      .map((job) => ({
        id: job.agentId || job.workerId,
        agentId: job.agentId || job.workerId,
        role: roleForJob(job),
        specialization: specializationForJob(job),
        status: job.status,
        model: job.model,
        skill: job.skill,
        missionId: job.missionId,
        jobId: job.id,
        currentTask: job.type,
        startedAt: job.startedAt,
        progress: progressForJob(job)
      }));
    return [...liveAgents, ...panelTasks, ...jobAgents]
      .filter((agent, index, arr) => {
        const id = agent.id || agent.agentId || agent.name || agent.role;
        if (!id) return false;
        return arr.findIndex((x) => (x.id || x.agentId || x.name || x.role) === id) === index;
      })
      .map((agent) => ({
        ...agent,
        id: agent.id || agent.agentId || agent.name || agent.role,
        role: agent.role || agent.domain || agent.type || 'agent',
        specialization: agent.specialization || specializationForRole(agent.role || agent.domain || agent.type),
        model: agent.model || agent.provider || state.api.router?.selected?.model || state.api.router?.model || 'not published',
        status: normalizeStatus(agent.status || agent.state),
        currentTask: agent.currentTask || agent.task || agent.type || 'not published',
        progress: agent.progress ?? null
      }));
  }

  function getAgentById(id) {
    return getAgents().find((agent) => agent.id === id || agent.agentId === id) || null;
  }

  function getMissions() {
    const live = window.FENIX?.live?.missions || [];
    const snapshot = state.api.snapshot?.missions || [];
    const dev = state.api.devMissions?.missions || [];
    const governed = state.api.missions?.missions || [];
    return [...live, ...snapshot, ...dev, ...governed]
      .filter((mission, index, arr) => {
        const id = mission.id || mission.missionId;
        return id && arr.findIndex((item) => (item.id || item.missionId) === id) === index;
      });
  }

  function areaStatus(key) {
    const live = window.FENIX?.live || {};
    const data = state.api;
    if (key === 'core') return live.status === 'ONLINE' ? 'ONLINE' : live.status || 'UNKNOWN';
    if (key === 'orchestrator') return getMissions().length || getJobs().length ? 'ACTIVE' : 'IDLE';
    if (key === 'projects') return (data.projects?.projects || []).length ? 'READY' : 'EMPTY';
    if (key === 'agents') return getAgents().length ? 'ACTIVE' : 'NO ACTIVE AGENTS';
    if (key === 'jobs') return getJobs().some((j) => normalizeStatus(j.status) === 'WORKING') ? 'WORKING' : (getJobs().length ? 'READY' : 'EMPTY');
    if (key === 'memory') return data.memory?.osMemory ? 'MEASURED' : 'UNPUBLISHED';
    if (key === 'rag') return data.knowledge ? 'READY' : 'UNPUBLISHED';
    if (key === 'skills') return (data.skills?.skills || []).length ? 'READY' : 'EMPTY';
    if (key === 'mcp') return (data.connectors?.connectors || data.connections?.connections || []).length ? 'CONNECTED' : 'UNPUBLISHED';
    if (key === 'browser') return $('previewIframe') ? 'ONLINE' : 'UNPUBLISHED';
    if (key === 'git') return data.git?.branch ? (data.git.clean ? 'CLEAN' : 'MODIFIED') : 'UNKNOWN';
    if (key === 'vps') return live.status === 'ONLINE' ? 'RUNTIME ONLINE' : 'BROWSER ONLY';
    return 'UNKNOWN';
  }

  function renderShell() {
    const city = $('view-city');
    if (!city || city.dataset.runtimeCockpit === '1') return;
    city.dataset.runtimeCockpit = '1';
    city.className = 'view active runtime-city-view';
    city.style.cssText = '';
    city.innerHTML = `
      <section class="runtime-city-grid">
        <main class="city-stage-panel">
          <header class="city-stage-header">
            <div>
              <span class="eyebrow">LIVE RUNTIME</span>
              <h1>FENIX AI CITY</h1>
            </div>
            <div id="workerMetrics" class="worker-metrics"></div>
            <div class="city-actions">
              <button id="cityZoomOutBtn" class="icon-btn-small" type="button" title="Zoom out"><i class="ph ph-minus"></i></button>
              <button id="cityZoomInBtn" class="icon-btn-small" type="button" title="Zoom in"><i class="ph ph-plus"></i></button>
              <button id="cityRotateLeftBtn" class="icon-btn-small" type="button" title="Rotate left"><i class="ph ph-arrow-counter-clockwise"></i></button>
              <button id="cityRotateRightBtn" class="icon-btn-small" type="button" title="Rotate right"><i class="ph ph-arrow-clockwise"></i></button>
              <button id="cityResetCameraBtn" class="icon-btn-small" type="button" title="Reset camera"><i class="ph ph-crosshair"></i></button>
              <select id="cityCameraMode" class="city-camera-mode" title="Camera mode">
                <option value="NORMAL">NORMAL</option>
                <option value="FOLLOW_AGENT">FOLLOW AGENT</option>
                <option value="FOLLOW_JOB">FOLLOW JOB</option>
                <option value="FOLLOW_MISSION">FOLLOW MISSION</option>
              </select>
              <button id="cityEnterBtn" class="icon-btn-small" type="button" title="Enter tower"><i class="ph ph-buildings"></i></button>
              <button id="cityUpBtn" class="icon-btn-small" type="button" title="Floor up"><i class="ph ph-arrow-up"></i></button>
              <button id="cityDownBtn" class="icon-btn-small" type="button" title="Floor down"><i class="ph ph-arrow-down"></i></button>
              <button id="openDevIdeBtn" class="btn-primary-sm" type="button"><i class="ph ph-code"></i> DEV IDE</button>
              <button id="refreshCityBtn" class="icon-btn-small" type="button" title="Refresh"><i class="ph ph-arrows-clockwise"></i></button>
            </div>
          </header>
          <nav id="towerBreadcrumb" class="tower-breadcrumb" aria-label="FENIX tower breadcrumb"></nav>
          <div id="runtimeTabs" class="runtime-tabs" aria-label="Runtime tabs"></div>
          <div id="worldModeBar" class="world-mode-bar" aria-label="Runtime visual level">
            <button data-world-mode="CITY" type="button"><i class="ph ph-map-trifold"></i><span>CIDADE</span></button>
            <button data-world-mode="BUILDING" type="button"><i class="ph ph-buildings"></i><span>PRÉDIO</span></button>
            <button data-world-mode="FLOOR" type="button"><i class="ph ph-stack"></i><span>ANDAR</span></button>
            <button data-world-mode="AGENT" type="button"><i class="ph ph-user-focus"></i><span>AGENTE</span></button>
          </div>
          <div id="whileAway" class="while-away" hidden></div>
          <div id="cityStage" class="city-stage" aria-label="FENIX AI City live map">
            <canvas id="runtimeCityCanvas"></canvas>
            <div id="runtimeCityNodes" class="runtime-city-nodes"></div>
            <aside id="worldHud" class="world-hud"></aside>
            <aside id="cityMinimap" class="city-minimap" aria-label="Runtime minimap"></aside>
            <aside id="agentFocusHud" class="agent-focus-hud" hidden></aside>
            <div id="agentEmptyState" class="city-empty-agents">NO ACTIVE AGENTS</div>
          </div>
        </main>
        <aside class="city-side-panel">
          <section>
            <div class="panel-header">LIVE JOB DAG</div>
            <div id="cityJobDag" class="city-list"></div>
          </section>
          <section>
            <div class="panel-header">AGENTS</div>
            <div id="cityAgents" class="city-list"></div>
          </section>
          <section>
            <div class="panel-header">EVENTS</div>
            <div id="cityEvents" class="city-list compact"></div>
          </section>
        </aside>
        <footer class="city-bottom-panel">
          <button data-city-panel="principal" type="button"><i class="ph ph-crown"></i><span>PRINCIPAL</span></button>
          <button data-city-panel="mission" type="button"><i class="ph ph-git-branch"></i><span>MISSION</span></button>
          <button data-city-panel="project" type="button"><i class="ph ph-folders"></i><span>PROJECT</span></button>
          <button data-city-panel="runtime" type="button"><i class="ph ph-pulse"></i><span>RUNTIME</span></button>
          <button data-city-panel="memory" type="button"><i class="ph ph-brain"></i><span>MEMORY</span></button>
          <button data-city-panel="rag" type="button"><i class="ph ph-magnifying-glass"></i><span>RAG</span></button>
          <button data-city-panel="skills" type="button"><i class="ph ph-wrench"></i><span>SKILLS</span></button>
          <button data-city-panel="mcp" type="button"><i class="ph ph-plugs-connected"></i><span>MCP</span></button>
          <button data-city-panel="project-map" type="button"><i class="ph ph-graph"></i><span>MAP</span></button>
        </footer>
      </section>`;

    $('openDevIdeBtn')?.addEventListener('click', () => switchView('ide'));
    $('refreshCityBtn')?.addEventListener('click', hydrate);
    $('cityZoomOutBtn')?.addEventListener('click', () => setZoom(state.camera.zoom - 0.1));
    $('cityZoomInBtn')?.addEventListener('click', () => setZoom(state.camera.zoom + 0.1));
    $('cityRotateLeftBtn')?.addEventListener('click', () => rotateCamera(-4));
    $('cityRotateRightBtn')?.addEventListener('click', () => rotateCamera(4));
    $('cityResetCameraBtn')?.addEventListener('click', () => {
      state.camera = { x: 0, y: 0, zoom: 1, rotate: 0, mode: state.camera.mode || 'NORMAL' };
      applyCamera();
    });
    $('cityCameraMode')?.addEventListener('change', (event) => {
      state.camera.mode = event.target.value;
      applyCamera();
    });
    $('cityEnterBtn')?.addEventListener('click', () => selectFloor(bestVisualFloor(getTwin().floors || [])?.key || getTwin().floors[0]?.key));
    $('cityUpBtn')?.addEventListener('click', () => moveFloor(1));
    $('cityDownBtn')?.addEventListener('click', () => moveFloor(-1));
    $('runtimeInspectorClose')?.addEventListener('click', () => {
      const dialog = $('runtimeInspector');
      if (dialog?.close) dialog.close();
      else dialog?.removeAttribute('open');
    });
    document.querySelectorAll('[data-city-panel]').forEach((button) => {
      button.addEventListener('click', () => openPanel(button.dataset.cityPanel));
    });
    document.querySelectorAll('[data-world-mode]').forEach((button) => {
      button.addEventListener('click', () => setWorldMode(button.dataset.worldMode));
    });
    initCanvas();
    initWorldCamera();
    setInitialView();
  }

  function setInitialView() {
    document.querySelectorAll('.view').forEach((view) => {
      const active = view.id === 'view-city';
      view.classList.toggle('active', active);
      view.style.display = active ? 'flex' : 'none';
    });
    document.querySelectorAll('button.nav-item').forEach((nav) => nav.classList.toggle('active', nav.dataset.view === 'city'));
  }

  function switchView(viewId) {
    document.querySelector(`button.nav-item[data-view="${viewId}"]`)?.click();
  }

  function render() {
    const blocks = [
      ['shell', renderShell],
      ['tower', renderTower],
      ['agents', renderAgents],
      ['jobs', renderJobs],
      ['events', renderEvents],
      ['while-away', renderWhileAway],
      ['worker-metrics', renderWorkerMetrics],
      ['tabs', renderTabs],
      ['world-mode', renderWorldModeBar],
      ['world-hud', renderWorldHud],
      ['minimap', renderMinimap],
      ['agent-focus', renderAgentFocusHud]
    ];
    const errors = [];
    for (const [name, fn] of blocks) {
      try { fn(); }
      catch (error) {
        errors.push({ block: name, message: error.message });
        console.error(`[FENIX Cockpit] render ${name} failed`, error);
      }
    }
    cockpitDebug().lastRenderErrors = errors;
  }

  function renderWorkerMetrics() {
    const box = $('workerMetrics');
    if (!box) return;
    const live = window.FENIX?.live || {};
    const snap = state.api.snapshot || {};
    const queue = { ...(live.queue || {}), ...(snap.queue || {}) };
    const workers = { ...(live.workers || {}), ...(snap.workers || {}) };
    const telemetry = state.api.router || state.api.telemetry || {};
    const items = [
      ['WORKERS', `${workers.active ?? 0}/${workers.total ?? 0}`],
      ['RUNNING', queue.running ?? 0],
      ['READY', queue.ready ?? 0],
      ['WAITING', queue.waitingDependency ?? queue.waiting ?? 0],
      ['RETRYING', queue.retrying ?? 0],
      ['FAILED', queue.failed ?? 0],
      ['DONE', queue.completed ?? 0],
      ['TOKENS', telemetry.tokensUsed ?? telemetry.tokens ?? 'NA'],
      ['UPTIME', snap.uptime ? `${Math.floor(snap.uptime / 60)}m` : 'NA']
    ];
    box.innerHTML = items.map(([label, value]) => `<span><b>${esc(label)}</b>${esc(value)}</span>`).join('');
  }

  function renderTabs() {
    const box = $('runtimeTabs');
    if (!box) return;
    if (!state.tabs.length) {
      box.innerHTML = '<span class="runtime-tabs-empty">No open runtime tabs</span>';
      return;
    }
    box.innerHTML = state.tabs.map((tab) => `
      <button class="${tab.id === state.activeTabId ? 'active' : ''}" data-runtime-tab="${esc(tab.id)}" type="button">
        <b>${esc(tab.kind)}</b>
        <span>${esc(tab.title)}</span>
        <i data-close-tab="${esc(tab.id)}" title="Close tab">x</i>
      </button>`).join('');
    box.querySelectorAll('[data-runtime-tab]').forEach((button) => {
      button.addEventListener('click', (event) => {
        if (event.target?.dataset?.closeTab) return;
        const tab = state.tabs.find((item) => item.id === button.dataset.runtimeTab);
        if (tab) openInspector(tab.kind, tab.title, tab.html, { fromTab: true });
      });
    });
    box.querySelectorAll('[data-close-tab]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        closeRuntimeTab(button.dataset.closeTab);
      });
    });
  }

  function upsertRuntimeTab(kind, title, html) {
    const id = `${kind}:${title}`.replace(/[^a-z0-9:_-]+/gi, '-').slice(0, 96);
    const tab = { id, kind, title, html, openedAt: new Date().toISOString() };
    const existing = state.tabs.findIndex((item) => item.id === id);
    if (existing >= 0) state.tabs.splice(existing, 1, tab);
    else state.tabs.push(tab);
    state.tabs = state.tabs.slice(-8);
    state.activeTabId = id;
    renderTabs();
  }

  function closeRuntimeTab(id) {
    state.tabs = state.tabs.filter((tab) => tab.id !== id);
    if (state.activeTabId === id) state.activeTabId = state.tabs[state.tabs.length - 1]?.id || null;
    renderTabs();
  }
  function renderTower() {
    const nodes = $('runtimeCityNodes');
    if (!nodes) return;
    const twin = getTwin();
    const floors = [...(twin.floors || [])].sort((a, b) => Number(b.level) - Number(a.level));
    if (!state.selectedFloor && floors.length) {
      state.selectedFloor = bestVisualFloor(floors)?.key || floors[0].key;
    }
    nodes.dataset.worldMode = state.worldMode;
    const stage = $('cityStage');
    if (stage) stage.dataset.worldMode = state.worldMode;
    
    // Only rewrite heavy HTML if map is OFF, else use the map container
    if (!FENIX_WORLD_MAP) {
      nodes.innerHTML = `
        ${visualSystemBoardHtml(twin, floors)}
        ${worldDistrictsHtml(twin)}
        <section class="tower-shell ${statusClass(twin.status)} ${state.worldMode === 'BUILDING' ? 'building-focus' : ''}" data-runtime-status="${esc(twin.status || 'UNKNOWN')}">
          <div class="tower-roof">
            <b>${esc(twin.name || 'FÊNIX TOWER')}</b>
          </div>
          <div class="tower-floors">${floors.map(f => floorRowHtml(f)).join('')}</div>
        </section>
      `;
    } else {
      if (!document.getElementById('fenix-world-root')) {
        nodes.innerHTML = `<div id="fenix-world-root" style="position:absolute; inset:0;"></div>
                           <div id="fenix-agents-root" style="position:absolute; inset:0; pointer-events:none; z-index:20;"></div>`;
      }
      document.getElementById('fenix-world-root').innerHTML = renderWorldMap(twin, floors);
      updateAgentPositions(twin, floors);
    }
    
    nodes.querySelectorAll('[data-board-mode]').forEach((node) => node.addEventListener('click', () => setWorldMode(node.dataset.boardMode)));
    nodes.querySelectorAll('[data-board-floor]').forEach((node) => node.addEventListener('click', () => selectFloor(node.dataset.boardFloor)));
    nodes.querySelectorAll('[data-board-room]').forEach((node) => node.addEventListener('click', () => selectRoom(node.dataset.boardFloorKey, node.dataset.boardRoom)));
    document.querySelectorAll('[data-npc-interaction]').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const npcId = node.getAttribute('data-npc-interaction');
        console.log("Interact with NPC:", npcId);
        // Dispatch event or open interaction modal
        dispatch('open.agent.modal', { agentId: npcId });
      });
    });

    nodes.querySelectorAll('[data-board-agent]').forEach((node) => {
      node.addEventListener('click', () => {
        const agent = getAgentById(node.dataset.boardAgent);
        if (agent) openAgentProfile(agent);
      });
    });
    nodes.querySelectorAll('[data-board-job]').forEach((node) => {
      node.addEventListener('click', () => {
        const job = getJobs().find((item) => item.id === node.dataset.boardJob);
        if (job) openInspector('JOB DETAILS', job.id, jobDetailsHtml(job));
      });
    });
    nodes.querySelectorAll('[data-floor]').forEach((node) => node.addEventListener('click', () => selectFloor(node.dataset.floor)));
    nodes.querySelectorAll('[data-floor]').forEach((node) => node.addEventListener('dblclick', () => enterFloor(node.dataset.floor)));
    nodes.querySelectorAll('[data-room]').forEach((node) => node.addEventListener('click', () => selectRoom(node.dataset.floorKey, node.dataset.room)));
    nodes.querySelectorAll('[data-district]').forEach((node) => {
      node.addEventListener('click', () => openPanel(node.dataset.district));
      node.addEventListener('dblclick', () => focusDistrict(node.dataset.district));
    });
    nodes.querySelectorAll('[data-project-building]').forEach((node) => {
      node.addEventListener('click', () => openProjectInspector(node.dataset.projectBuilding));
      node.addEventListener('dblclick', () => focusDistrict('projects'));
    });
    renderRooms();
    renderFloorStage();
    renderBreadcrumb();
    applyCamera();
  }

  function visualSystemBoardHtml(twin, floors) {
    if (FENIX_WORLD_MAP) {
      return renderWorldMap(twin, floors);
    }
    const floor = floors.find((item) => item.key === state.selectedFloor) || bestVisualFloor(floors) || floors[0];
    const rooms = (floor?.rooms || []).slice(0, 6);
    const agent = activeVisualAgent(floor);
    const job = agent ? getJobs().find((item) => item.id === agent.jobId || item.id === agent.currentJob) : getJobs()[0];
    const source = twin.source === 'boot-visual-blueprint' ? 'BOOT VISUAL' : 'RUNTIME REAL';
    return `<section class="visual-system-board" aria-label="Visao completa visual do sistema">
      ${visualCityPanelHtml(twin, source)}
      ${visualBuildingPanelHtml(twin, floors, floor)}
      ${visualFloorPanelHtml(floor, rooms)}
      ${visualAgentPanelHtml(agent, job)}
      ${visualMissionPanelHtml(job)}
    </section>`;
  }

  function updateAgentPositions(twin, floors) {
    const agentsRoot = document.getElementById('fenix-agents-root');
    if (!agentsRoot) return;
    
    const zoom = state.camera.zoom;
    if (zoom < 1.0) {
      agentsRoot.innerHTML = '';
      return;
    }

    const projects = state.api.projects?.projects || [];
    
    // First, gather all agents
    const allAgents = [];
    floors.forEach((floor) => {
      (floor.rooms || []).forEach((room) => {
        const agents = roomCharacters(room);
        agents.forEach(a => allAgents.push({ agent: a, room }));
      });
    });

    // Remove nodes for agents that no longer exist
    const currentIds = new Set(allAgents.map(a => a.agent.id));
    agentsRoot.querySelectorAll('.world-npc-node').forEach(node => {
      const id = node.getAttribute('data-npc-interaction');
      if (!currentIds.has(id)) node.remove();
    });

    // Update or create nodes
    allAgents.forEach(({ agent, room }, i) => {
      let px = 50, py = 50;
      const assignedProjectIndex = projects.findIndex(p => p.id === agent.projectId || p.name === room.label);
      if (assignedProjectIndex >= 0) {
         const coords = projectPoint(projects[assignedProjectIndex].id, assignedProjectIndex);
         px = coords.x;
         py = coords.y;
      }
      
      px += (i % 3) * 2 - 2;
      py += (i % 2) * 2 - 1;

      const avatar = agent.avatar?.appearance || deterministicAvatar(agent.id);
      const status = normalizeStatus(agent.status);
      const htmlContent = `
         <div class="npc-sprite">${agentGlyph(agent)}</div>
         <div class="npc-info">
           <b>${esc(agent.name || agent.id)}</b>
           <small>${esc(agent.role)}</small>
           <i>${esc(activityLabel(agent))}</i>
         </div>
      `;

      let node = agentsRoot.querySelector(`[data-npc-interaction="${esc(agent.id)}"]`);
      if (node) {
        node.className = `world-npc-node palette-${esc(avatar.colorProfile || 'ember')} ${statusClass(status)}`;
        node.innerHTML = htmlContent;
      } else {
        node = document.createElement('div');
        node.className = `world-npc-node palette-${esc(avatar.colorProfile || 'ember')} ${statusClass(status)}`;
        node.setAttribute('data-npc-interaction', esc(agent.id));
        node.style.position = 'absolute';
        node.style.pointerEvents = 'auto';
        node.innerHTML = htmlContent;
        
        node.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatch('open.agent.modal', { agentId: agent.id });
        });
        agentsRoot.appendChild(node);
      }

      // Hook into Physics Engine
      if (!window.fenixWorldState) window.fenixWorldState = { agents: {}, chatBubbles: [] };
      let physicsAgent = window.fenixWorldState.agents[agent.id];
      if (!physicsAgent) {
         physicsAgent = { id: agent.id, x: px, y: py, tx: px, ty: py, baseX: px, baseY: py, node, status: agent.status, moving: false, facingLeft: false };
         window.fenixWorldState.agents[agent.id] = physicsAgent;
         node.style.left = px + '%';
         node.style.top = py + '%';
      } else {
         physicsAgent.node = node;
         physicsAgent.status = agent.status;
         physicsAgent.baseX = px;
         physicsAgent.baseY = py;
         physicsAgent.tx = px; // Start moving towards target
         physicsAgent.ty = py;
      }
    });

    // Cleanup physics state for deleted agents
    Object.keys(window.fenixWorldState.agents).forEach(id => {
      if (!currentIds.has(id)) delete window.fenixWorldState.agents[id];
    });
  }

  function renderWorldMap(twin, floors) {
    const zoom = state.camera.zoom;
    let html = '<div class="fenix-world-container">';

    if (zoom < 0.6) {
      html += worldDistrictsHtml(twin);
    }

    // Always render buildings so they anchor the game world
    html += renderWorldBuildings(twin, floors);

    html += '</div>';
    return html;
  }

  function renderWorldBuildings(twin, floors) {
    let html = '';
    const projects = state.api.projects?.projects || [];
    const zoom = state.camera.zoom;
    // Semantic zoom trick: fade out roof when zooming inside (>= 1.2)
    const roofOpacity = Math.max(0, 1 - (zoom - 1.1) * 5);

    projects.forEach((project, index) => {
      const p = projectPoint(project.id || project.projectId || project.name, index);
      html += `<div class="world-building-node" style="left:${p.x}%; top:${p.y}%">
        <div class="building-roof" style="opacity: ${roofOpacity}; pointer-events: ${roofOpacity > 0.5 ? 'auto' : 'none'};">
          <b>${esc(project.name || project.projectId || 'BUILDING')}</b>
        </div>
        <div class="building-interior" style="opacity: ${1 - roofOpacity}; pointer-events: ${roofOpacity < 0.5 ? 'auto' : 'none'};">
           <div class="world-rooms-grid">
             ${(floors[0]?.rooms || []).slice(0,4).map(room => `
                <div class="world-room-node ${statusClass(room.status)}" data-board-room="${esc(room.key)}">
                  <h4>${esc(room.label)}</h4>
                </div>
             `).join('')}
           </div>
        </div>
      </div>`;
    });
    return html;
  }
  function visualCityPanelHtml(twin, source) { return ''; }
  function visualBuildingPanelHtml(twin, floors, floor) { return ''; }
  function visualFloorPanelHtml(floor, rooms) { return ''; }
  function visualAgentPanelHtml(agent, job) { return ''; }
  function visualMissionPanelHtml(job) { return ''; }
  function floorForJob(job) { return null; }
  function roomForJob(job, floorKey) { return null; }

  function roomCharacters(room) {
    const byId = new Map();
    (room.agents || []).forEach((agent) => {
      const id = agent.id || agent.agentId || agent.name;
      if (id) byId.set(id, agent);
    });
    (room.jobs || []).forEach((job) => {
      const id = job.agentId || job.workerId;
      if (!id || byId.has(id)) return;
      byId.set(id, {
        id,
        name: job.agentName || id,
        status: job.status || 'IDLE',
        role: roleForJob(job)
      });
    });
    return Array.from(byId.values());
  }

  function roleForJob(job) { return 'Agent'; }
  function renderTabs() { }
  function setZoom(value) { }
  
  function applyCamera() {
    const nodes = document.getElementById('runtimeCityNodes');
    if (!nodes) return;
    nodes.style.transform = `translate(${state.camera.x}px, ${state.camera.y}px) scale(${state.camera.zoom}) rotate(${state.camera.rotate || 0}deg)`;
    nodes.style.transformOrigin = '50% 50%';
  }
  
  function initWorldCamera() {
    const stage = document.getElementById('cityStage');
    if (!stage || stage.dataset.cameraReady === '1') return;
    stage.dataset.cameraReady = '1';
    let dragging = false;
    let last = null;
    stage.addEventListener('wheel', (event) => {
      if (!FENIX_WORLD_MAP) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      state.camera.zoom = Math.max(0.3, Math.min(3.0, state.camera.zoom + delta));
      applyCamera();
      if (typeof render === 'function') render();
    });
    stage.addEventListener('pointerdown', (event) => {
      if (!FENIX_WORLD_MAP) return;
      dragging = true;
      last = { x: event.clientX, y: event.clientY };
    });
    stage.addEventListener('pointermove', (event) => {
      if (!dragging || !last) return;
      state.camera.x += event.clientX - last.x;
      state.camera.y += event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
      applyCamera();
    });
    stage.addEventListener('pointerup', () => {
      dragging = false;
      last = null;
    });
  }

  function renderWorldHud() {}
  function renderBreadcrumb() {}
  
  // Re-run camera init just in case it was blown away
  setTimeout(() => initWorldCamera(), 1000);
async function hydrate() {
    try {
      const res = await fetch('/api/developer/snapshot');
      if (res.ok) state.api.snapshot = await res.json();
      
      const projs = await fetch('/api/projects');
      if (projs.ok) state.api.projects = await projs.json();
      
      const npcs = await fetch('/api/city/npc/list');
      if (npcs.ok) {
        state.api.npc = await npcs.json();
      }
      
      render();
    } catch (e) {
      console.warn('Hydration failed', e);
    }
  }

  function render() {
    const twin = getTwin();
    const floors = getFloors(twin);
    const nodes = document.getElementById('runtimeCityNodes');
    if (nodes && window.FENIX_WORLD_MAP) {
      nodes.innerHTML = renderWorldMap(twin, floors);
      updateAgentPositions(twin, floors);
      applyCamera();
    }
  }
  
  function getTwin() {
    return state.api.snapshot?.runtime || { floors: [] };
  }
  
  function getFloors(twin) {
    return twin.floors || [];
  }
  
  // Start loop
  setInterval(hydrate, 15000);
  setTimeout(hydrate, 100);
})();
