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
    nodes.innerHTML = `
      ${visualSystemBoardHtml(twin, floors)}
      ${worldDistrictsHtml(twin)}
      <section class="tower-shell ${statusClass(twin.status)} ${state.worldMode === 'BUILDING' ? 'building-focus' : ''}" data-runtime-status="${esc(twin.status || 'UNKNOWN')}">
        <div class="tower-roof">
          <b>${esc(twin.name || 'FENIX TOWER')}</b>
          <span>${esc(twin.status || 'UNKNOWN')} · ${esc(twin.totals?.agents || 0)} AGENTS · ${esc(twin.totals?.activeJobs || 0)} ACTIVE JOBS</span>
        </div>
        <div class="tower-floors">
          ${floors.map((floor) => floorButton(floor)).join('')}
        </div>
        <div class="tower-entrance">
          <span>CONTROL ROOM</span>
          <small>${esc(twin.projectName || 'FENIX')}</small>
        </div>
      </section>
      <section id="floorRoomPanel" class="floor-room-panel"></section>
      <section id="floorStagePanel" class="floor-stage-panel"></section>`;
    nodes.querySelectorAll('[data-board-mode]').forEach((node) => node.addEventListener('click', () => setWorldMode(node.dataset.boardMode)));
    nodes.querySelectorAll('[data-board-floor]').forEach((node) => node.addEventListener('click', () => selectFloor(node.dataset.boardFloor)));
    nodes.querySelectorAll('[data-board-room]').forEach((node) => node.addEventListener('click', () => selectRoom(node.dataset.boardFloorKey, node.dataset.boardRoom)));
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

  function visualCityPanelHtml(twin, source) {
    const districts = [
      ['API DISTRICT', `${twin.totals?.jobs || 0} jobs`, 26, 28],
      ['FENIX TOWER', `${twin.totals?.agents || 0} agentes`, 51, 19],
      ['DEV DISTRICT', `${twin.totals?.rooms || 0} salas`, 74, 34],
      ['DATA CENTER', `${twin.totals?.events || 0} eventos`, 70, 66],
      ['MARKETPLACE', `${state.api.learning?.skillCandidates ?? 0} skills`, 39, 71]
    ];
    return `<article class="visual-board-panel visual-city-panel">
      <header><span>1</span><div><b>VISAO DA CIDADE</b><small>${esc(source)} · ${esc(twin.status || 'ONLINE')}</small></div></header>
      <div class="visual-city-map">
        <i class="visual-tower-core"></i>
        ${districts.map(([label, metric, x, y], index) => `<button type="button" class="visual-district visual-district-${index}" data-board-mode="CITY" style="left:${x}%;top:${y}%"><b>${esc(label)}</b><small>${esc(metric)}</small></button>`).join('')}
      </div>
      <footer>${visualMetric('Agentes', twin.totals?.agents || 0)}${visualMetric('Jobs', twin.totals?.jobs || 0)}${visualMetric('Andares', twin.totals?.floors || 0)}${visualMetric('Saude', twin.totals?.failedJobs ? 'alerta' : '98%')}</footer>
    </article>`;
  }

  function visualBuildingPanelHtml(twin, floors, selectedFloor) {
    return `<article class="visual-board-panel visual-building-panel">
      <header><span>2</span><div><b>VISAO DO PREDIO</b><small>Dentro do projeto / empresa</small></div></header>
      <div class="visual-building-body">
        <div class="visual-floor-list">
          ${floors.slice(0, 7).map((floor) => `<button type="button" class="${floor.key === selectedFloor?.key ? 'selected' : ''}" data-board-floor="${esc(floor.key)}"><b>ANDAR ${esc(floor.level)}</b><small>${esc(floor.label)} · ${esc(floor.metrics?.agents || 0)} agentes</small></button>`).join('')}
        </div>
        <div class="visual-building-cutaway">
          <strong>${esc(selectedProject()?.name || twin.projectName || 'API LAYER')}</strong>
          ${floors.slice(0, 6).map((floor, floorIndex) => `<button type="button" class="visual-building-floor ${floor.key === selectedFloor?.key ? 'selected' : ''}" data-board-floor="${esc(floor.key)}">
            ${(floor.rooms || []).slice(0, 5).map((room, roomIndex) => {
              const character = roomCharacters(room)[0];
              return `<i class="${statusClass(room.status)}" style="--room:${roomIndex};--floor:${floorIndex}">${character ? miniAgentHtml(character, roomIndex, { large: false }) : ''}</i>`;
            }).join('')}
          </button>`).join('')}
        </div>
        <aside>
          <b>${esc(selectedFloor?.label || 'FLOOR')}</b>
          <small>Status ${esc(selectedFloor?.status || 'ONLINE')}</small>
          ${visualMetric('Agentes', selectedFloor?.metrics?.agents || 0)}
          ${visualMetric('Missoes', selectedFloor?.metrics?.jobs || 0)}
          ${visualMetric('Salas', selectedFloor?.rooms?.length || 0)}
        </aside>
      </div>
    </article>`;
  }

  function visualFloorPanelHtml(floor, rooms) {
    if (!floor) return '<article class="visual-board-panel"><header><span>3</span><div><b>VISAO DO ANDAR</b><small>Nenhum andar publicado</small></div></header></article>';
    return `<article class="visual-board-panel visual-floor-panel">
      <header><span>3</span><div><b>VISAO DO ANDAR</b><small>ANDAR ${esc(floor.level)} · ${esc(floor.label)}</small></div></header>
      <div class="visual-floor-map">
        <strong>ANDAR ${esc(floor.level)} - ${esc(floor.label)}</strong>
        ${rooms.map((room, index) => `<button type="button" class="visual-room ${statusClass(room.status)} zone-${index}" data-board-floor-key="${esc(floor.key)}" data-board-room="${esc(room.key)}">
          <span><b>${esc(room.label)}</b><small>${esc(room.metrics?.agents || 0)} agentes · ${esc(room.metrics?.jobs || 0)} jobs</small></span>
          ${roomSceneHtml(room, { large: true })}
        </button>`).join('')}
      </div>
    </article>`;
  }

  function visualAgentPanelHtml(agent, job) {
    if (!agent) {
      return `<article class="visual-board-panel visual-agent-panel">
        <header><span>4</span><div><b>VISAO DO AGENTE</b><small>Nenhum agente ativo publicado</small></div></header>
        <div class="visual-agent-scene visual-empty-scene"><p>NO ACTIVE AGENT</p></div>
      </article>`;
    }
    const status = normalizeStatus(agent.status || job?.status || 'WORKING');
    return `<article class="visual-board-panel visual-agent-panel">
      <header><span>4</span><div><b>VISAO DO AGENTE</b><small>Detalhe operacional do agente</small></div></header>
      <div class="visual-agent-scene">
        <button type="button" class="visual-agent-card palette-${esc((agent.avatar?.appearance || deterministicAvatar(agent.id)).colorProfile || 'ember')}" data-board-agent="${esc(agent.id)}">
          ${miniAgentHtml(agent, 0, { large: true })}
          <b>${esc(agent.name || agent.id)}</b>
          <small>${esc(agent.role || 'Runtime Agent')} · ${esc(status)}</small>
        </button>
        <div class="visual-workstation">
          <i></i><i></i><i></i>
          <p>${esc(job?.type || agent.currentTask || 'Sem job atual publicado')}</p>
        </div>
        <aside>
          <b>JOB ATUAL</b>
          <small>${esc(job?.id || agent.jobId || 'not published')}</small>
          ${visualMetric('Progresso', job ? `${progressForJob(job)}%` : 'NA')}
          ${visualMetric('Arquivos', job?.filesChanged?.length || 0)}
          ${visualMetric('Logs', job?.logs?.length || state.events.length)}
        </aside>
      </div>
    </article>`;
  }

  function visualMissionPanelHtml(seedJob) {
    const missions = getMissions();
    const mission = missions.find((item) => getJobs().some((job) => job.missionId === (item.id || item.missionId))) || missions[0] || null;
    const missionId = mission?.id || mission?.missionId || seedJob?.missionId || null;
    const jobs = missionId ? getJobs().filter((job) => job.missionId === missionId) : getJobs().slice(0, 10);
    const completed = jobs.filter((job) => normalizeStatus(job.status) === 'COMPLETED').length;
    const progress = jobs.length ? Math.round((completed / jobs.length) * 100) : 0;
    const graphJobs = jobs.slice(0, 8);
    return `<article class="visual-board-panel visual-mission-panel">
      <header><span>5</span><div><b>VISAO DA MISSAO</b><small>${esc(missionId || 'Sem missao publicada')}</small></div></header>
      <div class="visual-mission-scene">
        <div class="visual-mission-graph">
          <b>${esc(mission?.objective || mission?.goal || mission?.prompt || seedJob?.type || 'Mission graph')}</b>
          <div class="mission-node mission-root ${statusClass(mission?.status || seedJob?.status)}">${esc(mission?.status || 'RUNTIME')}</div>
          ${graphJobs.map((job, index) => `<button type="button" class="mission-node mission-job-node ${statusClass(job.status)}" data-board-job="${esc(job.id)}" style="--i:${index};">
            <span>${esc(job.agentId || job.workerId || roleForJob(job))}</span>
            <small>${esc(normalizeStatus(job.status))}</small>
          </button>`).join('')}
        </div>
        <div class="visual-mission-progress">
          ${visualMetric('Progresso', jobs.length ? `${progress}%` : 'NA')}
          ${visualMetric('Jobs', jobs.length)}
          ${visualMetric('Concluidos', completed)}
          ${visualMetric('Falhas', jobs.filter((job) => /FAILED|ERROR/i.test(job.status || '')).length)}
        </div>
        <div class="visual-mission-jobs">
          ${jobs.slice(0, 7).map((job) => `<button type="button" class="${statusClass(job.status)}" data-board-job="${esc(job.id)}"><b>${esc(job.type || 'JOB')}</b><small>${esc(normalizeStatus(job.status))}</small></button>`).join('') || '<span>NO MISSION JOBS PUBLISHED</span>'}
        </div>
      </div>
    </article>`;
  }

  function activeVisualAgent(floor) {
    const roomAgent = (floor?.rooms || []).flatMap((room) => roomCharacters(room))[0];
    return roomAgent || getAgents()[0] || null;
  }

  function bestVisualFloor(floors = []) {
    return [...floors].sort((a, b) => floorVisualScore(b) - floorVisualScore(a))[0] || null;
  }

  function floorVisualScore(floor) {
    const rooms = floor.rooms?.length || 0;
    const jobs = floor.metrics?.jobs || 0;
    const agents = floor.metrics?.agents || 0;
    const active = floor.metrics?.activeJobs || 0;
    const roomPresence = (floor.rooms || []).reduce((sum, room) => sum + roomCharacters(room).length, 0);
    return rooms * 3 + jobs * 2 + agents * 4 + active * 6 + roomPresence * 5;
  }

  function visualMetric(label, value) {
    return `<span class="visual-metric"><small>${esc(label)}</small><b>${esc(value)}</b></span>`;
  }

  function floorButton(floor) {
    const selected = floor.key === state.selectedFloor ? 'selected' : '';
    const active = floor.metrics?.activeJobs || 0;
    const failed = floor.metrics?.failedJobs || 0;
    const repairs = floor.metrics?.repairs || 0;
    const rooms = floor.rooms || [];
    return `<button class="tower-floor ${statusClass(floor.status)} ${selected}" data-floor="${esc(floor.key)}" type="button">
      <span class="floor-level">${esc(floor.level)}</span>
      <span class="floor-label">${esc(floor.label)}</span>
      <span class="floor-metrics">${active ? `${active} active` : `${floor.metrics?.jobs || 0} jobs`}${failed ? ` · ${failed} alert` : ''}${repairs ? ` · ${repairs} repair` : ''}</span>
      <span class="floor-rooms">${rooms.slice(0, 6).map((room) => `<i class="${statusClass(room.status)}" title="${esc(room.label)}"></i>`).join('')}</span>
    </button>`;
  }

  function worldDistrictsHtml(twin) {
    const learning = state.api.learning || state.api.snapshot?.proceduralLearning || {};
    const districts = [
      ['projects', 'PROJECT DISTRICT', `${(state.api.projects?.projects || []).length || 0} projects`, 77, 18],
      ['software-factory', 'SOFTWARE FACTORY', `${twin.totals?.jobs || 0} jobs`, 78, 36],
      ['rag-memory', 'MEMORY DISTRICT', `${learning.verifiedPatterns ?? 'NA'} patterns`, 76, 55],
      ['mcp', 'MCP DISTRICT', `${(state.api.connectors?.connectors || []).length || 0} connectors`, 73, 73],
      ['visual-engine', 'AI RESEARCH', `${twin.totals?.events || 0} events`, 23, 14],
      ['qa-testing', 'QA CENTER', `${twin.totals?.failedJobs || 0} alerts`, 20, 33],
      ['devops-vps', 'DEVOPS', `${twin.workers?.active || 0}/${twin.workers?.total || 0} workers`, 20, 53],
      ['observability', 'OBSERVABILITY', `${twin.totals?.missions || 0} missions`, 25, 72],
      ['marketplace', 'MARKETPLACE', `${learning.skillCandidates ?? 'NA'} skill candidates`, 50, 82],
      ['data-center', 'DATA CENTER', `${learning.episodes ?? 'NA'} episodes`, 62, 70]
    ];
    return districts.map(([key, label, metric, x, y]) => `<button class="city-node district-node ${statusClass(metric === 'NA' ? 'UNKNOWN' : 'ONLINE')}" data-district="${esc(key)}" type="button" style="left:${x}%;top:${y}%">
      <span>${esc(label)}</span>
      <small>${esc(metric)}</small>
    </button>`).join('') + projectBuildingsHtml();
  }

  function projectBuildingsHtml() {
    const projects = state.api.projects?.projects || [];
    return projects.slice(0, 10).map((project, index) => {
      const id = project.projectId || project.id || project.name || `project-${index}`;
      const point = projectPoint(id, index);
      const status = project.status || project.runtime || 'REGISTERED';
      const branch = project.branch || project.git?.branch || project.metadata?.branch || 'branch not published';
      return `<button class="city-node project-building ${statusClass(status)}" data-project-building="${esc(id)}" type="button" style="left:${point.x}%;top:${point.y}%">
        <span>${esc(project.name || id)}</span>
        <small>${esc(status)} · ${esc(branch)}</small>
      </button>`;
    }).join('');
  }

  function projectPoint(id, index) {
    const p = pointFor(id, index, 13);
    return { x: Math.min(92, Math.max(62, 77 + (p.x - 50) * 0.72)), y: Math.min(52, Math.max(8, 24 + (p.y - 50) * 0.52)) };
  }

  function focusDistrict(key) {
    const node = document.querySelector(`[data-district="${CSS.escape(key)}"]`);
    if (node) {
      const stage = $('cityStage')?.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      if (stage) {
        state.camera.x += (stage.left + stage.width / 2) - (rect.left + rect.width / 2);
        state.camera.y += (stage.top + stage.height / 2) - (rect.top + rect.height / 2);
        state.camera.zoom = Math.max(state.camera.zoom, 1.24);
        applyCamera();
      }
    }
    openPanel(key);
  }

  function renderRooms() {
    const panel = $('floorRoomPanel');
    if (!panel) return;
    const floor = getSelectedFloor();
    if (!floor) {
      panel.innerHTML = '<div class="city-empty-line">No operational floors published.</div>';
      return;
    }
    panel.innerHTML = `
      <header>
        <div><span class="eyebrow">FLOOR ${esc(floor.level)}</span><h2>${esc(floor.label)}</h2></div>
        <button class="icon-btn-small" data-floor-inspect="${esc(floor.key)}" type="button" title="Inspect floor"><i class="ph ph-info"></i></button>
      </header>
      <div class="floor-command-row">
        ${floor.manager ? `<button class="staff-chip ${floor.manager.active ? 'good' : 'muted'}" data-staff="manager" type="button">MANAGER · ${esc(floor.manager.source)}</button>` : '<span class="staff-chip muted">NO MANAGER ACTIVE</span>'}
        ${floor.supervisor ? `<button class="staff-chip ${floor.supervisor.active ? 'good' : 'muted'}" data-staff="supervisor" type="button">SUPERVISOR · ${esc(floor.supervisor.source)}</button>` : '<span class="staff-chip muted">NO SUPERVISOR ACTIVE</span>'}
      </div>
      <div class="room-grid">
        ${(floor.rooms || []).map((room) => `<button class="room-card ${statusClass(room.status)} ${room.key === state.selectedRoom ? 'selected' : ''}" data-floor-key="${esc(floor.key)}" data-room="${esc(room.key)}" type="button">
          <span class="room-card-top"><b>${esc(room.label)}</b><i>${esc(room.status)}</i></span>
          <small>${esc(room.metrics?.jobs || 0)} jobs · ${esc(room.metrics?.agents || 0)} agents · ${esc(room.events?.length || 0)} events</small>
          ${roomSceneHtml(room)}
          ${room.jobs?.some((job) => /REPAIR/.test(job.type || '')) ? '<span class="maintenance-badge">MAINTENANCE</span>' : ''}
        </button>`).join('')}
      </div>`;
    panel.querySelector('[data-floor-inspect]')?.addEventListener('click', () => openFloorInspector(floor));
    panel.querySelectorAll('[data-room]').forEach((button) => button.addEventListener('click', () => selectRoom(button.dataset.floorKey, button.dataset.room)));
    panel.querySelectorAll('[data-staff]').forEach((button) => button.addEventListener('click', () => openInspector('COORDINATION ROLE', button.dataset.staff.toUpperCase(), detailsTable({
      Role: button.dataset.staff.toUpperCase(),
      Source: button.dataset.staff === 'manager' ? floor.manager?.source : floor.supervisor?.source,
      Floor: floor.label,
      'Active jobs': floor.metrics?.activeJobs || 0,
      'Real agents': floor.metrics?.agents || 0,
      Note: 'Coordination role derived from MissionEngine/JobWorker, not a separate fake agent'
    }))));
  }

  function renderFloorStage() {
    const panel = $('floorStagePanel');
    if (!panel) return;
    const floor = getSelectedFloor();
    if (!floor) {
      panel.innerHTML = '';
      return;
    }
    const rooms = floor.rooms || [];
    panel.innerHTML = `
      <header>
        <div>
          <span class="eyebrow">ANDAR ${esc(floor.level)}</span>
          <h2>${esc(floor.label)}</h2>
        </div>
        <dl>
          <dt>Salas</dt><dd>${esc(rooms.length)}</dd>
          <dt>Agentes</dt><dd>${esc(floor.metrics?.agents || 0)}</dd>
          <dt>Jobs</dt><dd>${esc(floor.metrics?.jobs || 0)}</dd>
          <dt>Status</dt><dd class="${statusClass(floor.status)}">${esc(floor.status || 'UNKNOWN')}</dd>
        </dl>
      </header>
      <div class="floor-stage-map">
        ${rooms.map((room, index) => `<button class="floor-stage-room ${statusClass(room.status)} room-zone-${index % 6} ${room.key === state.selectedRoom ? 'selected' : ''}" data-floor-key="${esc(floor.key)}" data-room="${esc(room.key)}" type="button">
          <span class="stage-room-label"><b>${esc(room.label)}</b><small>${esc(room.metrics?.jobs || 0)} jobs · ${esc(room.metrics?.agents || 0)} agents</small></span>
          ${roomSceneHtml(room, { large: true })}
        </button>`).join('')}
      </div>`;
    panel.querySelectorAll('[data-room]').forEach((button) => button.addEventListener('click', () => selectRoom(button.dataset.floorKey, button.dataset.room)));
  }

  function selectFloor(key) {
    state.selectedFloor = key;
    state.selectedRoom = null;
    setWorldMode('FLOOR', { render: false });
    render();
  }

  function enterFloor(key) {
    state.selectedFloor = key;
    state.selectedRoom = null;
    setWorldMode('FLOOR', { render: false });
    state.camera.zoom = Math.max(state.camera.zoom, 1.32);
    render();
  }

  function selectRoom(floorKey, roomKey) {
    state.selectedFloor = floorKey;
    state.selectedRoom = roomKey;
    setWorldMode('FLOOR', { render: false });
    const floor = getSelectedFloor();
    const room = floor?.rooms?.find((item) => item.key === roomKey);
    if (room) openRoomInspector(floor, room);
    render();
  }

  function moveFloor(delta) {
    const floors = [...(getTwin().floors || [])].sort((a, b) => Number(a.level) - Number(b.level));
    if (!floors.length) return;
    const current = floors.findIndex((floor) => floor.key === state.selectedFloor);
    const next = floors[Math.min(floors.length - 1, Math.max(0, (current < 0 ? 0 : current) + delta))];
    if (next) selectFloor(next.key);
  }

  function renderBreadcrumb() {
    const crumb = $('towerBreadcrumb');
    if (!crumb) return;
    const twin = getTwin();
    const floor = getSelectedFloor();
    const room = floor?.rooms?.find((item) => item.key === state.selectedRoom);
    const parts = [
      [state.worldMode || 'CITY', () => setWorldMode('CITY')],
      ['FENIX', () => { state.selectedFloor = null; state.selectedRoom = null; setWorldMode('CITY'); }],
      [twin.name || 'TOWER', () => render()]
    ];
    const project = selectedProject();
    if (project) parts.push([project.name || project.projectId || project.id, () => openProjectInspector(project.projectId || project.id || project.name)]);
    if (floor) parts.push([floor.label, () => selectFloor(floor.key)]);
    if (room) parts.push([room.label, () => selectRoom(floor.key, room.key)]);
    const agent = state.selectedAgent ? getAgentById(state.selectedAgent) : null;
    if (agent) parts.push([agent.name || agent.id, () => openAgentProfile(agent)]);
    crumb.innerHTML = parts.map(([label], index) => `<button type="button" data-crumb="${index}">${esc(label)}</button>`).join('<span>/</span>');
    crumb.querySelectorAll('[data-crumb]').forEach((button) => button.addEventListener('click', () => parts[Number(button.dataset.crumb)]?.[1]?.()));
  }

  function openFloorInspector(floor) {
    openInspector('OPERATIONAL FLOOR', floor.label, detailsTable({
      Level: floor.level,
      Status: floor.status,
      Manager: floor.manager || 'not active',
      Supervisor: floor.supervisor || 'not active',
      Jobs: floor.metrics?.jobs || 0,
      'Active jobs': floor.metrics?.activeJobs || 0,
      Repairs: floor.metrics?.repairs || 0,
      Agents: floor.metrics?.agents || 0,
      Rooms: (floor.rooms || []).map((room) => `${room.label}:${room.status}`).join(', ')
    }));
  }

  function openRoomInspector(floor, room) {
    state.worldMode = 'FLOOR';
    openInspector('OPERATIONAL ROOM', room.label, `
      ${detailsTable({
        Floor: floor.label,
        Status: room.status,
        Jobs: room.jobs?.length || 0,
        Agents: room.agents?.length || 0,
        Events: room.events?.length || 0
      })}
      <div class="microtask-panel">
        <b>REAL AGENTS IN ROOM</b>
        ${(room.agents || []).map((agent) => `<span><button type="button" data-agent-inline="${esc(agent.id || agent.name)}">${esc(agent.name || agent.id)}</button><small>${esc(agent.status || 'UNKNOWN')}</small></span>`).join('') || '<small>No real agent currently published in this room.</small>'}
      </div>
      <div class="mission-dag">${(room.jobs || []).map((job) => `<button type="button" data-open-job="${esc(job.id)}"><b>${esc(job.type || 'JOB')}</b><small>${esc(normalizeStatus(job.status))}</small></button>`).join('') || '<span class="city-empty-line">No jobs currently published in this room.</span>'}</div>
    `);
  }

  function getTwin() {
    return window.FENIX?.live?.operationalTwin || state.api.snapshot?.operationalTwin || fallbackOperationalTwin();
  }

  function fallbackOperationalTwin() {
    const jobs = getJobs();
    const agents = getAgents();
    const floorSpecs = [
      [7, 'testing', 'TESTING', ['test-lab', 'e2e-room', 'qa-review']],
      [6, 'observability', 'OBSERVABILITY', ['health', 'metrics', 'logs', 'repair']],
      [5, 'security', 'SECURITY', ['audit', 'secrets', 'policy']],
      [4, 'cache', 'CACHE', ['cache-room', 'warming', 'fallback']],
      [3, 'adapters', 'ADAPTERS', ['adapters-room', 'integrations', 'normalizers']],
      [2, 'providers', 'PROVIDERS', ['providers-room', 'registry-room', 'adapters-room', 'cache-room', 'security-room', 'observability-room']],
      [1, 'api-registry', 'API REGISTRY', ['routes', 'registry', 'gateway']]
    ];
    const floors = floorSpecs.map(([level, key, label, rooms]) => {
      const floorJobs = jobs.filter((job) => floorForJob(job) === key);
      const floorAgents = agents.filter((agent) => agent.floorKey === key);
      return {
        level,
        key,
        label,
        status: floorJobs.length || floorAgents.length ? 'READY' : 'IDLE',
        manager: { id: `${key}:manager`, role: 'MANAGER', source: 'MissionEngine', active: floorJobs.length > 0 },
        supervisor: { id: `${key}:supervisor`, role: 'SUPERVISOR', source: 'JobWorker', active: floorAgents.length > 0 },
        metrics: {
          jobs: floorJobs.length,
          activeJobs: floorJobs.filter((job) => /RUNNING|WORKING/.test(normalizeStatus(job.status))).length,
          failedJobs: floorJobs.filter((job) => /FAILED|ERROR/.test(normalizeStatus(job.status))).length,
          repairs: floorJobs.filter((job) => /REPAIR/.test(job.type || '')).length,
          agents: floorAgents.length,
          events: 0
        },
        jobs: floorJobs,
        agents: floorAgents,
        events: [],
        rooms: rooms.map((roomKey, index) => fallbackRoom(roomKey, key, floorJobs, floorAgents, index))
      };
    });
    const totalJobs = jobs.length || floors.reduce((sum, floor) => sum + floor.metrics.jobs, 0);
    const totalAgents = agents.length || floors.reduce((sum, floor) => sum + floor.metrics.agents, 0);
    return {
      name: 'FENIX TOWER',
      projectId: 'fenix_boot_visual',
      projectName: 'FENIX OS',
      status: window.FENIX?.live?.status || 'BOOTING',
      workers: window.FENIX?.live?.workers || { active: 0, total: 3 },
      totals: {
        floors: floors.length,
        rooms: floors.reduce((sum, floor) => sum + floor.rooms.length, 0),
        agents: totalAgents,
        jobs: totalJobs,
        activeJobs: floors.reduce((sum, floor) => sum + floor.metrics.activeJobs, 0),
        failedJobs: floors.reduce((sum, floor) => sum + floor.metrics.failedJobs, 0),
        missions: getMissions().length,
        events: state.events.length
      },
      floors,
      source: 'boot-visual-blueprint'
    };
  }

  function fallbackRoom(roomKey, floorKey, floorJobs, floorAgents, index) {
    const label = roomKey.replace(/-/g, ' ').toUpperCase();
    const jobs = floorJobs.filter((job, jobIndex) => jobIndex % 6 === index % 6);
    const agents = floorAgents.filter((agent, agentIndex) => agentIndex % 6 === index % 6);
    return {
      key: roomKey,
      label,
      status: jobs.length || agents.length ? 'READY' : 'IDLE',
      jobs,
      agents,
      events: [],
      metrics: { jobs: jobs.length, agents: agents.length }
    };
  }

  function getSelectedFloor() {
    const floors = getTwin().floors || [];
    return floors.find((floor) => floor.key === state.selectedFloor) || floors[0] || null;
  }

  function renderAgents() {
    const agents = getAgents();
    const empty = $('agentEmptyState');
    if (empty) empty.hidden = agents.length > 0;

    const stage = $('runtimeCityNodes');
    if (stage) {
      agents.slice(0, 12).forEach((agent, i) => {
        const pos = avatarPosition(agent, i);
        const button = document.createElement('button');
        const avatar = agent.avatar?.appearance || deterministicAvatar(agent.id);
        const visualState = visualStateForAgent(agent);
        button.className = `agent-avatar ${statusClass(agent.status)} ${visualState} palette-${esc(avatar.colorProfile || 'ember')}`;
        button.type = 'button';
        button.style.left = `${pos.x}%`;
        button.style.top = `${pos.y}%`;
        button.dataset.agentId = agent.id;
        button.innerHTML = `<span class="agent-core" data-accessory="${esc(avatar.accessory || 'terminal')}">${agentGlyph(agent)}</span><b>${esc(agent.name || agent.id)}</b><small>${esc(agent.role)} / ${esc(agent.status)}</small><i class="agent-activity">${esc(activityLabel(agent))}</i>`;
        button.addEventListener('click', () => openAgentProfile(agent));
        button.addEventListener('dblclick', () => focusAgent(agent));
        stage.appendChild(button);
      });
      applyCamera();
    }

    const list = $('cityAgents');
    if (list) list.innerHTML = agents.length
      ? agents.slice(0, 8).map((a) => `<button class="city-row" data-agent="${esc(a.id)}" type="button"><b>${esc(a.name || a.id)}</b><small>${esc(a.role)} / ${esc(a.model)}</small><span class="${statusClass(a.status)}">${esc(a.status)}</span></button>`).join('')
      : `<div class="city-empty-line">NO ACTIVE AGENTS</div>`;
    list?.querySelectorAll('[data-agent]').forEach((row) => {
      const agent = agents.find((a) => a.id === row.dataset.agent);
      row.addEventListener('click', () => agent && openAgentProfile(agent));
    });
  }

  function miniAgentHtml(agent, index, options = {}) {
    const id = agent.id || agent.agentId || agent.name || `agent-${index}`;
    const avatar = agent.avatar?.appearance || deterministicAvatar(id);
    const status = normalizeStatus(agent.status || agent.state);
    const slot = index % 4;
    return `<i class="room-agent-sprite ${options.large ? 'large' : ''} ${statusClass(status)} palette-${esc(avatar.colorProfile || 'ember')} slot-${slot}" title="${esc(agent.name || id)}">
      <span class="character-head"></span>
      <span class="character-body">${esc(agentGlyph({ ...agent, id }))}</span>
      <span class="character-legs"></span>
    </i>`;
  }

  function roomSceneHtml(room, options = {}) {
    const characters = roomCharacters(room).slice(0, 4);
    const jobs = room.jobs || [];
    return `<span class="room-scene ${options.large ? 'large' : ''}">
      <span class="room-wall room-wall-back"></span>
      <span class="room-wall room-wall-left"></span>
      <span class="room-wall room-wall-right"></span>
      <span class="room-floor-grid"></span>
      <span class="room-desks">
        ${jobs.slice(0, 4).map((job, index) => `<i class="room-desk ${statusClass(job.status)} desk-${index}" title="${esc(job.type || job.id)}"><b></b><em></em></i>`).join('')}
      </span>
      <span class="room-occupants">${characters.map((agent, index) => miniAgentHtml(agent, index, options)).join('') || '<em>sem agente ativo</em>'}</span>
    </span>`;
  }

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
        agentId: id,
        name: id,
        role: roleForJob(job),
        specialization: specializationForJob(job),
        status: normalizeStatus(job.status),
        jobId: job.id,
        currentTask: job.type,
        avatar: job.avatar
      });
    });
    return [...byId.values()];
  }

  function openAgentProfile(agent) {
    state.selectedAgent = agent.id;
    state.worldMode = 'AGENT';
    const job = getJobs().find((item) => item.id === agent.jobId || item.id === agent.currentJob) || null;
    const memoryHits = agent.ragContext?.memoryHits || job?.ragContext?.memoryHits || [];
    const avatar = agent.avatar?.appearance || deterministicAvatar(agent.id);
    openInspector('AGENT PROFILE', agent.name || agent.id, `
      <div class="agent-profile-panel">
        <section class="agent-profile-card ${statusClass(agent.status)} palette-${esc(avatar.colorProfile || 'ember')}">
          <div class="agent-portrait">${agentGlyph(agent)}</div>
          <div>
            <b>${esc(agent.name || agent.id)}</b>
            <small>${esc(agent.role || 'Runtime Agent')} · ${esc(agent.status || 'IDLE')}</small>
            <span>${esc(agent.specialization || 'runtime operations')}</span>
          </div>
        </section>
        ${detailsTable({
          AgentId: agent.id,
          Model: agent.model || 'not published',
          Skill: agent.skill || 'not published',
          Project: agent.projectId || 'not published',
          Mission: agent.missionId || 'not published',
          Job: agent.jobId || agent.currentJob || 'not published',
          Floor: agent.floorKey || 'not published',
          Room: agent.roomKey || 'not published',
          Avatar: `${avatar.archetype}/${avatar.colorProfile}/${avatar.accessory}${agent.avatar ? '' : ' (deterministic fallback)'}`,
          'Last activity': agent.lastActivity || agent.startedAt || 'not published',
          Memory: memoryHits.length ? `${memoryHits.length} relevant hits` : 'not published'
        })}
        ${job ? microtasksHtml(job.microtasks) : ''}
        <div class="agent-action-row">
          <button type="button" data-agent-action="talk" data-agent-id="${esc(agent.id)}">CONVERSAR</button>
          <button type="button" data-agent-action="task" data-agent-id="${esc(agent.id)}">ATRIBUIR TAREFA</button>
          ${job ? `<button type="button" data-open-job="${esc(job.id)}">VER JOB</button>` : ''}
          <button type="button" data-agent-action="memory" data-agent-id="${esc(agent.id)}">VER MEMÓRIA</button>
          <button type="button" data-agent-action="log" data-agent-id="${esc(agent.id)}">VER LOG</button>
        </div>
        <form class="agent-task-form" data-agent-task-form="${esc(agent.id)}" hidden>
          <textarea name="prompt" rows="3" placeholder="Digite uma tarefa para o Orchestrator..."></textarea>
          <button type="submit">ENVIAR AO FÊNIX</button>
        </form>
        ${agentWorkstationHtml(agent, job)}
      </div>`);
    renderBreadcrumb();
    renderWorldModeBar();
    renderAgentFocusHud();
  }

  function agentWorkstationHtml(agent, job) {
    if (!job) return '<div class="agent-workstation"><b>WORKSTATION</b><small>No active job station published for this agent.</small></div>';
    return `<div class="agent-workstation">
      <b>${esc(agent.role || 'AGENT')} WORKSTATION</b>
      <table>
        <tr><th>Terminal</th><td>${esc(job.tests?.ran ? `${job.tests.passed || 0} tests passed` : 'not running')}</td></tr>
        <tr><th>Files</th><td>${esc((job.filesChanged || []).slice(0, 6).join(', ') || 'not published')}</td></tr>
        <tr><th>Browser</th><td>${esc(job.browser?.url || job.visualQa?.screenshot || 'not published')}</td></tr>
        <tr><th>Logs</th><td>${esc(job.logs?.length ? `${job.logs.length} entries` : 'not published')}</td></tr>
      </table>
    </div>`;
  }

  function renderJobs() {
    const jobs = getJobs();
    const dag = $('cityJobDag');
    if (!dag) return;
    dag.innerHTML = jobs.length ? jobs.slice(0, 12).map((job) => {
      const status = normalizeStatus(job.status);
      return `<button class="job-dag-row" data-job="${esc(job.id)}" type="button">
        <span class="dag-symbol ${statusClass(status)}">${symbol(status)}</span>
        <div><b>${esc(job.type || job.legacyType || 'JOB')}</b><small>${esc(job.missionId || job.projectId || job.id)}</small></div>
        <span>${esc(status)}</span>
      </button>`;
    }).join('') : `<div class="city-empty-line">No jobs in runtime snapshot.</div>`;
    dag.querySelectorAll('[data-job]').forEach((row) => {
      const job = jobs.find((j) => j.id === row.dataset.job);
      row.addEventListener('click', () => job && openInspector('JOB DETAILS', job.id, jobDetailsHtml(job)));
      row.addEventListener('dblclick', () => job && focusJob(job));
    });
  }

  function renderEvents() {
    const box = $('cityEvents');
    if (!box) return;
    box.innerHTML = state.events.length
      ? state.events.slice(0, 14).map((event) => `<button class="event-row" data-seq="${esc(event.seq || event.id || event.at)}" type="button"><time>${esc(time(event.at || event.recordedAt))}</time><span>${esc(event.type || event.name)}</span><small>${esc(summary(event))}</small></button>`).join('')
      : `<div class="city-empty-line">No live events received yet.</div>`;
    box.querySelectorAll('[data-seq]').forEach((row) => {
      const event = state.events.find((e) => String(e.seq || e.id || e.at) === row.dataset.seq);
      row.addEventListener('click', () => event && openInspector('EVENT SOURCE', event.type || event.name || 'event', `<pre>${esc(JSON.stringify(event, null, 2))}</pre>`));
    });
  }

  function renderWhileAway() {
    const box = $('whileAway');
    if (!box || state.firstSnapshotAt) return;
    state.firstSnapshotAt = new Date().toISOString();
    const missed = state.events.filter((e) => Number(e.seq || 0) > state.lastSeenSeq);
    if (!missed.length) return;
    const counts = {
      missionsCompleted: missed.filter((e) => e.type === 'mission.completed').length,
      jobsFailed: missed.filter((e) => e.type === 'job.failed').length,
      repairsCompleted: missed.filter((e) => e.type === 'repair.completed').length,
      events: missed.length,
      memoriesCreated: missed.filter((e) => e.type === 'memory.created').length
    };
    box.hidden = false;
    box.innerHTML = `<b>WHILE YOU WERE AWAY</b>${Object.entries(counts).map(([k, v]) => `<span>${esc(labelize(k))}: ${v}</span>`).join('')}`;
  }

  function openPanel(panel) {
    const data = state.api;
    const renderers = {
      principal: () => principalAgentHtml(),
      project: () => projectsDistrictHtml(),
      mission: () => missionControlHtml(),
      runtime: () => detailsTable({
        Workers: `${window.FENIX?.live?.workers?.active ?? 0}/${window.FENIX?.live?.workers?.total ?? 0}`,
        Queue: JSON.stringify(window.FENIX?.live?.queue || state.api.snapshot?.queue || {}),
        Runtime: window.FENIX?.live?.status || 'unknown',
        WebSocket: window.FENIX?.ws ? 'connected or connecting' : 'not published',
        Uptime: state.api.snapshot?.uptime ? `${Math.floor(state.api.snapshot.uptime / 60)}m` : 'not published',
        Preview: $('previewIframe') ? 'available' : 'not mounted'
      }),
      memory: () => learningWorldHtml(data.learning || data.snapshot?.proceduralLearning || {}),
      'rag-memory': () => learningWorldHtml(data.learning || data.snapshot?.proceduralLearning || {}),
      rag: () => detailsTable(data.knowledge || { status: 'No RAG query/chunk endpoint is published yet.' }),
      skills: () => listTable(data.skills?.skills || [], ['id', 'name', 'source']),
      mcp: () => listTable(data.connectors?.connectors || data.connections?.connections || [], ['id', 'name', 'status', 'desc']),
      marketplace: () => learningSkillsHtml(data.learning || data.snapshot?.proceduralLearning || {}),
      'data-center': () => learningEpisodesHtml(data.learning || data.snapshot?.proceduralLearning || {}),
      'project-map': () => projectMapHtml(getTwin().projectMap),
      terminal: () => detailsTable({ Endpoint: '/api/dev/terminal', Status: $('terminalCmd') ? 'IDE terminal mounted' : 'not mounted' }),
      default: () => detailsTable({ Status: areaStatus(panel), Detail: RUNTIME_AREAS.find((a) => a[0] === panel)?.[2] || 'Runtime area' })
    };
    openInspector('RUNTIME AREA', panel.toUpperCase(), (renderers[panel] || renderers.default)());
  }

  function principalAgentHtml() {
    const mission = getMissions()[0] || {};
    const principal = mission.principalAgent || getJobs().find((job) => job.principalAgent)?.principalAgent || {};
    const delivery = mission.delivery || {};
    return `<div class="principal-agent-panel">
      ${detailsTable({
        Agent: principal.name || principal.id || 'not published',
        Mode: principal.mode || 'not published',
        Authority: principal.authority || principal.autonomyPolicy?.default || 'not published',
        Project: principal.projectId || mission.projectId || 'not published',
        Workspace: principal.workspace || 'not published',
        Verdict: mission.deliveryVerdict || delivery.verdict || 'not reviewed yet',
        'Mission status': mission.status || 'not published',
        'Definition of Done': mission.definitionOfDone || 'not published'
      })}
      <div class="microtask-panel">
        <b>Delivery Gates</b>
        ${delivery.gates ? Object.entries(delivery.gates).map(([key, ok]) => `<span class="${ok ? 'ok' : 'warn'}">${esc(labelize(key))}: ${ok ? 'PASS' : 'PENDING'}</span>`).join('') : '<small>No final delivery gates published yet.</small>'}
      </div>
    </div>`;
  }

  function missionControlHtml() {
    const missions = getMissions();
    const mission = missions[0] || {};
    const jobs = mission.id ? getJobs().filter((job) => job.missionId === mission.id) : getJobs().slice(0, 12);
    const done = jobs.filter((job) => normalizeStatus(job.status) === 'COMPLETED').length;
    const progress = jobs.length ? Math.round((done / jobs.length) * 100) : 0;
    return `<div class="mission-control-panel">
      ${detailsTable({
        Mission: mission.id || mission.missionId || 'not published',
        Goal: mission.prompt || mission.goal || mission.objective || 'not published',
        Status: mission.status || 'not published',
        Priority: mission.priority || 'not published',
        Progress: jobs.length ? `${progress}%` : 'not published',
        Agents: [...new Set(jobs.map((job) => job.agentId).filter(Boolean))].join(', ') || 'not published',
        Workers: `${window.FENIX?.live?.workers?.active ?? 0}/${window.FENIX?.live?.workers?.total ?? 0}`,
        Jobs: jobs.length,
        Files: jobs.flatMap((job) => job.filesChanged || []).length,
        Tests: jobs.some((job) => job.tests) ? 'published' : 'not published',
        Memory: jobs.some((job) => job.memory || job.ragContext) ? 'published' : 'not published'
      })}
      <div class="mission-dag">${jobs.map((job) => `<button type="button" data-open-job="${esc(job.id)}"><b>${esc(job.type || 'JOB')}</b><small>${esc(normalizeStatus(job.status))}</small></button>`).join('') || '<span class="city-empty-line">No mission jobs published.</span>'}</div>
    </div>`;
  }

  function projectsDistrictHtml() {
    const projects = state.api.projects?.projects || [];
    if (!projects.length) return '<div class="city-empty-line">PROJECT DISTRICT UNAVAILABLE: no registered projects published by FENIX runtime.</div>';
    return `<div class="project-district-panel">
      ${projects.map((project) => {
        const id = project.projectId || project.id || project.name;
        const jobs = getJobs().filter((job) => job.projectId === id);
        return `<button type="button" class="project-live-card ${statusClass(project.status || 'REGISTERED')}" data-project-card="${esc(id)}">
          <b>${esc(project.name || id)}</b>
          <small>${esc(project.workspace || project.root || 'workspace not published')}</small>
          <span>${esc(project.status || 'REGISTERED')} · ${jobs.length} jobs · ${esc(project.branch || project.git?.branch || 'branch NA')}</span>
        </button>`;
      }).join('')}
    </div>`;
  }

  function openProjectInspector(projectId) {
    const project = (state.api.projects?.projects || []).find((item) => String(item.projectId || item.id || item.name) === String(projectId));
    if (!project) return;
    state.selectedProjectId = projectId;
    setWorldMode('BUILDING');
    const jobs = getJobs().filter((job) => job.projectId === projectId);
    openInspector('PROJECT', project.name || projectId, `
      ${detailsTable({
        ProjectId: project.projectId || project.id || projectId,
        Status: project.status || 'REGISTERED',
        Workspace: project.workspace || project.root || 'not published',
        Branch: project.branch || project.git?.branch || 'not published',
        Commit: project.commit || project.git?.commit || 'not published',
        Modified: project.modified ?? project.git?.modified ?? 'not published',
        Runtime: project.runtime || window.FENIX?.live?.status || 'not published',
        Frontend: project.frontend || project.previewUrl || 'not published',
        Backend: project.backend || 'not published',
        Jobs: jobs.length,
        Agents: [...new Set(jobs.map((job) => job.agentId).filter(Boolean))].join(', ') || 'not published',
        'Last activity': project.lastActivity || jobs[0]?.updatedAt || jobs[0]?.createdAt || 'not published'
      })}
      <div class="job-control-row">
        <button type="button" data-project-action="enter" data-project-id="${esc(projectId)}">ENTRAR NO PROJETO</button>
        <button type="button" data-project-action="ide" data-project-id="${esc(projectId)}">ABRIR IDE</button>
      </div>
      <div class="mission-dag">${jobs.slice(0, 12).map((job) => `<button type="button" data-open-job="${esc(job.id)}"><b>${esc(job.type)}</b><small>${esc(normalizeStatus(job.status))}</small></button>`).join('') || '<span class="city-empty-line">No jobs for this project.</span>'}</div>
    `);
  }

  function microtasksHtml(tasks = []) {
    if (!Array.isArray(tasks) || !tasks.length) return '';
    return `<div class="microtask-panel">
      <b>MICROTASKS</b>
      ${tasks.map((task) => `<span class="${statusClass(task.status)}">${esc(task.title || task.id)} <small>${esc(task.status || 'QUEUED')}</small></span>`).join('')}
    </div>`;
  }

  function openInspector(kind, title, html, options = {}) {
    const dialog = $('runtimeInspector');
    if (!dialog) return;
    if (!options.fromTab) upsertRuntimeTab(kind, title, html);
    $('runtimeInspectorKind').textContent = kind;
    $('runtimeInspectorTitle').textContent = title;
    $('runtimeInspectorBody').innerHTML = html;
    $('runtimeInspectorBody').querySelectorAll('[data-job-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await api(`/api/dev/jobs/${encodeURIComponent(button.dataset.jobId)}/${button.dataset.jobAction}`, {
            method: 'POST',
            body: JSON.stringify({ reason: 'cockpit-control' })
          });
          await hydrate();
        } catch (error) {
          button.textContent = error.message;
        }
      });
    });
    $('runtimeInspectorBody').querySelectorAll('[data-agent-action]').forEach((button) => {
      button.addEventListener('click', () => handleAgentAction(button.dataset.agentAction, button.dataset.agentId));
    });
    $('runtimeInspectorBody').querySelectorAll('[data-open-job]').forEach((button) => {
      button.addEventListener('click', () => {
        const job = getJobs().find((item) => item.id === button.dataset.openJob);
        if (job) openInspector('JOB DETAILS', job.id, jobDetailsHtml(job));
      });
    });
    $('runtimeInspectorBody').querySelectorAll('[data-project-card]').forEach((button) => {
      button.addEventListener('click', () => openProjectInspector(button.dataset.projectCard));
    });
    $('runtimeInspectorBody').querySelectorAll('[data-project-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.projectAction === 'ide') switchView('ide');
        else {
          state.selectedProjectId = button.dataset.projectId;
          setWorldMode('BUILDING');
        }
      });
    });
    $('runtimeInspectorBody').querySelectorAll('[data-agent-inline]').forEach((button) => {
      button.addEventListener('click', () => {
        const agent = getAgentById(button.dataset.agentInline);
        if (agent) openAgentProfile(agent);
      });
    });
    $('runtimeInspectorBody').querySelectorAll('[data-follow-job]').forEach((button) => {
      button.addEventListener('click', () => {
        const job = getJobs().find((item) => item.id === button.dataset.followJob);
        if (job) focusJob(job);
      });
    });
    $('runtimeInspectorBody').querySelectorAll('[data-learning-node]').forEach((button) => {
      button.addEventListener('click', () => openLearningEvidence(button.dataset.learningNode));
    });
    $('runtimeInspectorBody').querySelectorAll('[data-agent-task-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const agent = getAgentById(form.dataset.agentTaskForm);
        const prompt = form.elements.prompt?.value?.trim();
        if (!agent || !prompt) return;
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        submit.textContent = 'ENVIANDO...';
        try {
          const payload = {
            projectId: agent.projectId || getTwin().projectId || 'fenix_self_phase3',
            client: `agent-profile:${agent.id}`,
            assignedAgentId: agent.id,
            prompt: `[Agent ${agent.id} / ${agent.role}] ${prompt}`
          };
          const result = await api('/api/v2/agentic/execute', { method: 'POST', body: JSON.stringify(payload) });
          submit.textContent = result.mission?.id ? 'MISSION CRIADA' : 'ENVIADO';
          await hydrate();
        } catch (error) {
          submit.textContent = error.message;
        }
      });
    });
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', 'open');
  }

  function jobDetailsHtml(job) {
    return detailsTable({
      Mission: job.missionId || 'not published',
      Parent: job.parentId || 'not published',
      Dependencies: (job.dependencies || []).join(', ') || 'none',
      Agent: job.agentId || job.workerId || 'not published',
      Skill: job.skill || 'not published',
      Model: job.model || 'not published',
      Status: normalizeStatus(job.status),
      Priority: job.userPriority || job.priority || 'not published',
      Worker: job.workerSlot || job.workerId || 'not published',
      Started: job.startedAt || 'not started',
      Completed: job.completedAt || 'not completed',
      Elapsed: elapsed(job),
      'Queue wait': job.queueWaitMs == null ? 'not published' : `${job.queueWaitMs}ms`,
      'Execution time': job.executionTimeMs == null ? 'not published' : `${job.executionTimeMs}ms`,
      Tokens: job.tokensUsed ?? job.tokens ?? job.usage?.totalTokens ?? 'not published',
      Logs: job.logs ? `${job.logs.length} entries` : 'not published',
      'Files changed': job.filesChanged ? job.filesChanged.length : 'not published',
      Tests: job.tests || 'not published',
      Browser: job.browser || 'not published',
      'Visual QA': job.visualQa || 'not published',
      Memory: job.memory || job.ragContext?.memoryHits?.length ? 'published' : 'not published',
      Microtasks: job.microtasks?.length ? `${job.microtasks.filter((item) => item.status === 'COMPLETED').length}/${job.microtasks.length}` : 'not published',
      Repairs: job.repairCount ? `${job.repairCount} attempts` : 'none'
    }) + microtasksHtml(job.microtasks) + `<div class="job-control-row"><button type="button" data-follow-job="${esc(job.id)}">FOLLOW JOB</button></div>` + jobControls(job);
  }

  function handleAgentAction(action, agentId) {
    const body = $('runtimeInspectorBody');
    const agent = getAgentById(agentId);
    if (!body || !agent) return;
    if (action === 'task') {
      const form = body.querySelector(`[data-agent-task-form="${CSS.escape(agentId)}"]`);
      if (form) form.hidden = !form.hidden;
      return;
    }
    if (action === 'talk') {
      const form = body.querySelector(`[data-agent-task-form="${CSS.escape(agentId)}"]`);
      if (form) {
        form.hidden = false;
        form.elements.prompt.value = `Converse com ${agent.name || agent.id} sobre o job atual e traga status com evidência.`;
      }
      return;
    }
    if (action === 'memory') {
      body.insertAdjacentHTML('beforeend', `<pre>${esc(JSON.stringify(agent.ragContext || agent.memory || { status: 'No agent memory published in snapshot.' }, null, 2))}</pre>`);
      return;
    }
    if (action === 'log') {
      const related = agentEvents(agent.id).slice(0, 12);
      body.insertAdjacentHTML('beforeend', `<pre>${esc(JSON.stringify(related, null, 2))}</pre>`);
    }
  }

  function detailsTable(obj) {
    return `<table>${Object.entries(obj || {}).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(typeof v === 'object' ? JSON.stringify(v).slice(0, 300) : v)}</td></tr>`).join('')}</table>`;
  }

  function listTable(items, cols) {
    if (!items.length) return '<div class="city-empty-line">No real records published.</div>';
    return `<table>${items.slice(0, 40).map((item) => `<tr>${cols.map((c) => `<td>${esc(item[c] ?? '')}</td>`).join('')}</tr>`).join('')}</table>`;
  }

  function learningWorldHtml(learning) {
    if (!learning || learning.status !== 'AVAILABLE') {
      return '<div class="city-empty-line">PROCEDURAL MEMORY NOT AVAILABLE: backend did not publish learning state.</div>';
    }
    const metrics = detailsTable({
      Episodes: learning.episodes,
      Patterns: learning.patterns,
      'Verified patterns': learning.verifiedPatterns,
      'Skill candidates': learning.skillCandidates,
      'Reuse events': learning.reuseEvents,
      'Pattern reuse rate': learning.patternReuseRate == null ? 'NOT AVAILABLE' : `${Math.round(learning.patternReuseRate * 100)}%`,
      'QA success rate': learning.qaSuccessRate == null ? 'NOT AVAILABLE' : `${Math.round(learning.qaSuccessRate * 100)}%`,
      Validations: learning.validations
    });
    const graph = learning.graph || { nodes: [], edges: [] };
    return `<div class="learning-world-panel">
      ${metrics}
      <div class="learning-graph">
        ${graph.nodes.slice(0, 28).map((node, index) => learningNodeHtml(node, index)).join('') || '<span class="city-empty-line">No verified learning nodes yet.</span>'}
      </div>
      <div class="microtask-panel">
        <b>VERIFIED PATTERNS</b>
        ${(learning.topPatterns || []).map((pattern) => `<span class="ok"><button type="button" data-learning-node="pattern:${esc(pattern.id)}">${esc(pattern.title)}</button><small>${esc(pattern.confidence ?? 'NA')}</small></span>`).join('') || '<small>No verified patterns yet.</small>'}
      </div>
    </div>`;
  }

  function learningNodeHtml(node, index) {
    const pos = pointFor(node.id, index, 34);
    return `<button class="learning-node learning-${esc(String(node.type || '').toLowerCase())}" data-learning-node="${esc(node.id)}" type="button" style="left:${pos.x}%;top:${pos.y}%">
      <b>${esc(node.type)}</b>
      <span>${esc(node.label)}</span>
    </button>`;
  }

  function learningSkillsHtml(learning) {
    const skills = learning?.graph?.nodes?.filter((node) => node.type === 'SKILL').map((node) => node.evidence) || [];
    if (!skills.length) return detailsTable({ Status: 'NOT AVAILABLE', Reason: 'No pattern has enough verified validations/reuse to become a skill candidate yet.' });
    return listTable(skills, ['id', 'name', 'status', 'patternId']);
  }

  function learningEpisodesHtml(learning) {
    const episodes = learning?.recentEpisodes || [];
    if (!episodes.length) return '<div class="city-empty-line">No procedural episodes recorded yet.</div>';
    return `<div class="microtask-panel">
      <b>RECENT VERIFIED/OBSERVED EPISODES</b>
      ${episodes.map((episode) => `<span class="${episode.validated ? 'ok' : 'warn'}"><button type="button" data-learning-node="mission:${esc(episode.missionId)}">${esc(episode.title)}</button><small>${episode.validated ? 'VERIFIED' : 'OBSERVED'} · ${esc(episode.confidence)}</small></span>`).join('')}
    </div>`;
  }

  function openLearningEvidence(id) {
    const learning = state.api.learning || state.api.snapshot?.proceduralLearning || {};
    const node = learning.graph?.nodes?.find((item) => item.id === id);
    if (!node) return;
    openInspector('LEARNING EVIDENCE', node.label || id, detailsTable({
      Type: node.type,
      Id: node.id,
      Evidence: node.evidence || 'not published'
    }));
  }

  function projectMapHtml(map) {
    const nodes = map?.nodes || [];
    const edges = map?.edges || [];
    if (!nodes.length) return '<div class="city-empty-line">PROJECT MAP NOT AVAILABLE: no Project DNA components published.</div>';
    return `<div class="project-map-panel">
      <div class="project-map-nodes">${nodes.map((node) => `<span><b>${esc(node.label)}</b><small>${esc(node.evidence)}</small></span>`).join('')}</div>
      <table>${edges.length ? edges.map((edge) => `<tr><th>${esc(edge.from)}</th><td>${esc(edge.type)}</td><td>${esc(edge.to)}</td></tr>`).join('') : '<tr><td>No real integration edges detected.</td></tr>'}</table>
    </div>`;
  }

  function jobControls(job) {
    const status = normalizeStatus(job.status);
    const actions = [];
    if (status === 'QUEUED') actions.push(['pause', 'PAUSE'], ['cancel', 'CANCEL']);
    if (status === 'WORKING') actions.push(['cancel', 'CANCEL']);
    if (status === 'PAUSED') actions.push(['resume', 'RESUME'], ['cancel', 'CANCEL']);
    if (status === 'FAILED' || status === 'CANCELLED') actions.push(['retry', 'RETRY']);
    if (!actions.length) return '';
    return `<div class="job-control-row">${actions.map(([action, label]) => `<button type="button" data-job-id="${esc(job.id)}" data-job-action="${action}">${label}</button>`).join('')}</div>`;
  }

  function pointFor(id, index, radius) {
    let hash = 0;
    String(id).split('').forEach((ch) => { hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0; });
    const angle = ((Math.abs(hash) % 360) / 180) * Math.PI;
    const ring = radius + (index % 3) * 7;
    return { x: 50 + Math.cos(angle) * ring, y: 50 + Math.sin(angle) * ring * 0.68 };
  }

  function hashFor(value) {
    let hash = 0;
    String(value || 'fenix-agent').split('').forEach((ch) => { hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0; });
    return Math.abs(hash);
  }

  function deterministicAvatar(agentId) {
    const hash = hashFor(agentId);
    const archetypes = ['operator', 'architect', 'engineer', 'analyst', 'sentinel', 'researcher'];
    const colors = ['ember', 'azure', 'violet', 'jade', 'gold', 'rose', 'cyan', 'steel'];
    const accessories = ['terminal', 'visor', 'toolkit', 'badge', 'console', 'lens', 'notebook', 'circuit'];
    return {
      archetype: archetypes[hash % archetypes.length],
      colorProfile: colors[Math.floor(hash / 7) % colors.length],
      accessory: accessories[Math.floor(hash / 13) % accessories.length]
    };
  }

  function avatarPosition(agent, index) {
    const lanes = [
      { x: 14, y: 18 }, { x: 27, y: 18 }, { x: 40, y: 18 }, { x: 53, y: 18 },
      { x: 14, y: 38 }, { x: 27, y: 38 }, { x: 40, y: 38 }, { x: 53, y: 38 },
      { x: 14, y: 58 }, { x: 27, y: 58 }, { x: 40, y: 58 }, { x: 53, y: 58 }
    ];
    const floorBias = {
      frontend: 8,
      backend: 9,
      'qa-testing': 10,
      'visual-engine': 11,
      'rag-memory': 4,
      observability: 5,
      'software-factory': 6,
      'ai-agents': 7
    };
    const preferred = floorBias[agent.floorKey] ?? index;
    return lanes[(preferred + index) % lanes.length] || lanes[index % lanes.length];
  }

  function visualStateForAgent(agent) {
    const status = normalizeStatus(agent.status);
    if (/REPAIR/.test(status)) return 'repairing';
    if (/BLOCKED|FAILED/.test(status)) return 'blocked';
    if (/TEST/.test(status)) return 'testing';
    if (/BROWSER|VISUAL/.test(status)) return 'browser';
    if (/WORKING|RUNNING/.test(status)) return 'working';
    if (/COMPLETED/.test(status)) return 'completed';
    if (/WAITING|QUEUED/.test(status)) return 'waiting';
    return 'idle';
  }

  function agentGlyph(agent) {
    const text = `${agent.role || ''} ${agent.specialization || ''}`.toLowerCase();
    if (/principal|orchestrator|manager/.test(text)) return 'FX';
    if (/front|visual/.test(text)) return 'UI';
    if (/back|api/.test(text)) return 'BE';
    if (/qa|test/.test(text)) return 'QA';
    if (/browser/.test(text)) return 'BR';
    if (/memory|rag|knowledge/.test(text)) return 'KG';
    if (/repair|devops|git/.test(text)) return 'OP';
    return esc((agent.role || agent.id || 'AG').slice(0, 2).toUpperCase());
  }

  function activityLabel(agent) {
    const task = agent.currentTask || agent.jobId || '';
    const status = normalizeStatus(agent.status);
    if (status === 'WAITING') return 'waiting for dependency';
    if (status === 'COMPLETED') return 'completed';
    if (status === 'BLOCKED') return 'blocked';
    if (task && task !== 'not published') return task;
    return status.toLowerCase();
  }

  function focusAgent(agent) {
    state.selectedAgent = agent.id;
    state.worldMode = 'AGENT';
    state.camera.mode = 'FOLLOW_AGENT';
    const node = document.querySelector(`[data-agent-id="${CSS.escape(agent.id)}"]`);
    if (node) {
      const stage = $('cityStage')?.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      if (stage) {
        state.camera.x += (stage.left + stage.width / 2) - (rect.left + rect.width / 2);
        state.camera.y += (stage.top + stage.height / 2) - (rect.top + rect.height / 2);
        state.camera.zoom = Math.max(state.camera.zoom, 1.55);
        applyCamera();
      }
    }
    openAgentProfile(agent);
  }

  function focusJob(job) {
    state.camera.mode = 'FOLLOW_JOB';
    const agent = getAgents().find((item) => item.jobId === job.id || item.currentJob === job.id || item.id === job.agentId);
    if (agent) {
      focusAgent(agent);
      state.camera.mode = 'FOLLOW_JOB';
      applyCamera();
      return;
    }
    const floorKey = floorForJob(job);
    const floor = (getTwin().floors || []).find((item) => item.key === floorKey);
    if (floor) {
      state.selectedFloor = floor.key;
      state.selectedRoom = roomForJob(job, floor.key);
      setWorldMode('FLOOR', { render: false });
      state.camera.zoom = Math.max(state.camera.zoom, 1.32);
      render();
    }
  }

  function setWorldMode(mode, options = {}) {
    const next = ['CITY', 'BUILDING', 'FLOOR', 'AGENT'].includes(mode) ? mode : 'CITY';
    state.worldMode = next;
    const defaults = {
      CITY: { zoom: 0.96, x: 0, y: 0 },
      BUILDING: { zoom: 1.12, x: -90, y: 4 },
      FLOOR: { zoom: 1.02, x: 0, y: 0 },
      AGENT: { zoom: Math.max(state.camera.zoom, 1.5), x: state.camera.x, y: state.camera.y }
    };
    const camera = defaults[next] || defaults.CITY;
    state.camera.zoom = camera.zoom;
    state.camera.x = camera.x;
    state.camera.y = camera.y;
    renderWorldModeBar();
    applyCamera();
    if (options.render !== false) render();
  }

  function renderWorldModeBar() {
    const bar = $('worldModeBar');
    if (!bar) return;
    bar.querySelectorAll('[data-world-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.worldMode === state.worldMode);
    });
  }

  function renderWorldHud() {
    const hud = $('worldHud');
    if (!hud) return;
    const twin = getTwin();
    const queue = { ...(window.FENIX?.live?.queue || {}), ...(state.api.snapshot?.queue || {}) };
    const workers = { ...(window.FENIX?.live?.workers || {}), ...(state.api.snapshot?.workers || {}) };
    const projects = state.api.projects?.projects || [];
    const floor = getSelectedFloor();
    hud.innerHTML = `
      <header><b>${esc(state.worldMode)}</b><span>${esc(twin.status || 'UNKNOWN')}</span></header>
      <dl>
        <dt>Projetos</dt><dd>${esc(projects.length)}</dd>
        <dt>Andares</dt><dd>${esc((twin.floors || []).length)}</dd>
        <dt>Salas</dt><dd>${esc((twin.floors || []).reduce((sum, item) => sum + (item.rooms?.length || 0), 0))}</dd>
        <dt>Agentes</dt><dd>${esc(twin.totals?.agents ?? getAgents().length)}</dd>
        <dt>Workers</dt><dd>${esc(workers.active ?? 0)}/${esc(workers.total ?? 0)}</dd>
        <dt>Fila</dt><dd>${esc((queue.ready ?? 0) + (queue.queued ?? 0) + (queue.waitingDependency ?? queue.waiting ?? 0))}</dd>
        <dt>Falhas</dt><dd class="${Number(queue.failed || twin.totals?.failedJobs || 0) ? 'bad' : 'good'}">${esc(queue.failed ?? twin.totals?.failedJobs ?? 0)}</dd>
        <dt>Foco</dt><dd>${esc(selectedProject()?.name || floor?.label || state.selectedAgent || 'cidade')}</dd>
      </dl>`;
  }

  function renderMinimap() {
    const map = $('cityMinimap');
    if (!map) return;
    const floors = getTwin().floors || [];
    const projects = state.api.projects?.projects || [];
    const projectDots = projects.slice(0, 10).map((project, index) => {
      const id = project.projectId || project.id || project.name || `project-${index}`;
      const point = projectPoint(id, index);
      return `<button class="mini-dot project ${String(id) === String(state.selectedProjectId) ? 'active' : ''}" data-mini-project="${esc(id)}" style="left:${point.x}%;top:${point.y}%"></button>`;
    }).join('');
    const floorDots = floors.map((floor, index) => {
      const x = 12 + (index % 7) * 10;
      const y = 16 + Math.floor(index / 7) * 16;
      return `<button class="mini-dot floor ${floor.key === state.selectedFloor ? 'active' : ''}" data-mini-floor="${esc(floor.key)}" style="left:${x}%;top:${y}%"></button>`;
    }).join('');
    map.innerHTML = `<header>MINI MAP</header><div class="mini-map-surface">${projectDots}${floorDots}</div>`;
    map.querySelectorAll('[data-mini-project]').forEach((button) => button.addEventListener('click', () => openProjectInspector(button.dataset.miniProject)));
    map.querySelectorAll('[data-mini-floor]').forEach((button) => button.addEventListener('click', () => selectFloor(button.dataset.miniFloor)));
  }

  function renderAgentFocusHud() {
    const box = $('agentFocusHud');
    if (!box) return;
    const agent = state.selectedAgent ? getAgentById(state.selectedAgent) : null;
    if (!agent || state.worldMode !== 'AGENT') {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    const job = getJobs().find((item) => item.id === agent.jobId || item.id === agent.currentJob || item.agentId === agent.id) || {};
    box.hidden = false;
    box.innerHTML = `
      <header><b>${esc(agent.name || agent.id)}</b><span class="${statusClass(agent.status)}">${esc(agent.status)}</span></header>
      <p>${esc(activityLabel(agent))}</p>
      <dl>
        <dt>Job</dt><dd>${esc(job.id || agent.jobId || 'not published')}</dd>
        <dt>Missão</dt><dd>${esc(job.missionId || agent.missionId || 'not published')}</dd>
        <dt>Arquivos</dt><dd>${esc(job.filesChanged?.length ?? 'not published')}</dd>
        <dt>Memória</dt><dd>${esc((agent.ragContext?.memoryHits || job.ragContext?.memoryHits || []).length || 'not published')}</dd>
      </dl>`;
  }

  function selectedProject() {
    return (state.api.projects?.projects || []).find((item) => String(item.projectId || item.id || item.name) === String(state.selectedProjectId)) || null;
  }

  function setZoom(value) {
    state.camera.zoom = Math.max(0.72, Math.min(1.8, Number(value) || 1));
    applyCamera();
  }

  function rotateCamera(delta) {
    state.camera.rotate = Math.max(-18, Math.min(18, Number(state.camera.rotate || 0) + Number(delta || 0)));
    applyCamera();
  }

  function applyCamera() {
    const nodes = $('runtimeCityNodes');
    const mode = $('cityCameraMode');
    if (mode && mode.value !== state.camera.mode) mode.value = state.camera.mode;
    if (!nodes) return;
    nodes.style.transform = `translate(${state.camera.x}px, ${state.camera.y}px) scale(${state.camera.zoom}) rotate(${state.camera.rotate || 0}deg)`;
    nodes.style.transformOrigin = '50% 50%';
  }

  function initWorldCamera() {
    const stage = $('cityStage');
    if (!stage || stage.dataset.cameraReady === '1') return;
    stage.dataset.cameraReady = '1';
    let dragging = false;
    let last = null;
    stage.addEventListener('wheel', (event) => {
      event.preventDefault();
      setZoom(state.camera.zoom + (event.deltaY > 0 ? -0.08 : 0.08));
    }, { passive: false });
    stage.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.button !== 1) return;
      dragging = true;
      last = { x: event.clientX, y: event.clientY };
      stage.setPointerCapture?.(event.pointerId);
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
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        state.selectedAgent = null;
        state.selectedRoom = null;
        state.camera.mode = 'NORMAL';
        applyCamera();
        renderBreadcrumb();
      }
    });
  }

  function roleForJob(job) {
    const type = String(job.type || '').toUpperCase();
    if (type.includes('FRONTEND')) return 'Frontend Engineer';
    if (type.includes('BACKEND')) return 'Backend Engineer';
    if (type.includes('VISUAL')) return 'Visual QA';
    if (type.includes('QA')) return 'QA Engineer';
    if (type.includes('RAG')) return 'Knowledge Agent';
    if (type.includes('MEMORY')) return 'Memory Agent';
    if (type.includes('REPAIR')) return 'Repair Operator';
    if (type.includes('GIT')) return 'Release Reviewer';
    return job.agentId || 'Runtime Agent';
  }

  function specializationForJob(job) {
    const type = String(job.type || '').toUpperCase();
    if (type.includes('VISUAL')) return 'browser visual validation';
    if (type.includes('FRONTEND')) return 'canonical UI implementation';
    if (type.includes('BACKEND')) return 'API/runtime implementation';
    if (type.includes('REPAIR')) return 'diagnostic and repair loop';
    if (type.includes('RAG')) return 'knowledge retrieval';
    if (type.includes('MEMORY')) return 'mission memory';
    return specializationForRole(job.agentId || job.type || 'agent');
  }

  function specializationForRole(role) {
    const text = String(role || '').toLowerCase();
    if (/visual|browser/.test(text)) return 'visual browser evidence';
    if (/front|react|css/.test(text)) return 'frontend';
    if (/back|api|database/.test(text)) return 'backend';
    if (/qa|test/.test(text)) return 'quality gate';
    if (/rag|knowledge/.test(text)) return 'retrieval';
    if (/memory/.test(text)) return 'memory';
    return 'runtime operations';
  }

  function progressForJob(job) {
    const status = normalizeStatus(job.status);
    if (status === 'COMPLETED') return 100;
    if (status === 'WORKING' || status === 'RUNNING') return 50;
    if (status === 'QUEUED') return 0;
    if (status === 'FAILED') return 100;
    return null;
  }

  function floorForJob(job) {
    const type = String(job.type || job.currentTask || '').toUpperCase();
    if (type.includes('FRONTEND')) return 'frontend';
    if (type.includes('BACKEND')) return 'backend';
    if (type.includes('QA')) return 'qa-testing';
    if (type.includes('VISUAL')) return 'visual-engine';
    if (type.includes('MEMORY') || type.includes('RAG')) return 'rag-memory';
    if (type.includes('GIT')) return 'devops-vps';
    if (type.includes('REPAIR')) return 'observability';
    if (type.includes('DISPATCH')) return 'ai-agents';
    if (type.includes('ARCHITECTURE') || type.includes('ANALYSIS') || type.includes('INTEGRATION')) return 'software-factory';
    return job.floorKey || 'software-factory';
  }

  function roomForJob(job, floorKey) {
    const type = String(job.type || '').toUpperCase();
    if (type.includes('REPAIR')) return 'maintenance-room';
    if (type.includes('QA')) return 'test-room';
    if (type.includes('VISUAL')) return 'browser-lab';
    if (type.includes('BACKEND')) return 'api-room';
    if (type.includes('FRONTEND')) return 'ui-room';
    if (type.includes('MEMORY') || type.includes('RAG')) return 'knowledge-room';
    if (type.includes('GIT')) return 'release-room';
    const floor = (getTwin().floors || []).find((item) => item.key === floorKey);
    return floor?.rooms?.[0]?.key || null;
  }

  function symbol(status) {
    if (status === 'COMPLETED') return 'OK';
    if (status === 'WORKING') return '>';
    if (status === 'FAILED' || status === 'ERROR') return '!';
    if (status === 'REPAIR') return 'R';
    return 'o';
  }

  function elapsed(job) {
    if (!job.startedAt) return 'not started';
    const end = job.completedAt || job.failedAt || new Date().toISOString();
    const seconds = Math.max(0, Math.floor((new Date(end) - new Date(job.startedAt)) / 1000));
    return `${seconds}s`;
  }

  function time(value) {
    if (!value) return '--:--';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function summary(event) {
    return event.summary || event.message || event.payload?.jobId || event.payload?.id || JSON.stringify(event.payload || {}).slice(0, 80);
  }

  function labelize(key) {
    return key.replace(/[A-Z]/g, (m) => ' ' + m.toLowerCase());
  }

  function agentEvents(agentId) {
    return state.events.filter((event) => JSON.stringify(event.payload || {}).includes(agentId));
  }

  function initCanvas() {
    const canvas = $('runtimeCityCanvas');
    if (!canvas || canvas.dataset.ready === '1') return;
    canvas.dataset.ready = '1';
    const ctx = canvas.getContext('2d');
    function draw() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width);
      canvas.height = Math.max(1, rect.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(88, 166, 255, 0.18)';
      ctx.lineWidth = 1;
      const points = RUNTIME_AREAS.map(([key], i) => {
        if (key === 'core') return { x: canvas.width * 0.5, y: canvas.height * 0.48 };
        const angle = (Math.PI * 2 * i) / RUNTIME_AREAS.length - Math.PI / 2;
        return { x: canvas.width * (0.5 + Math.cos(angle) * 0.41), y: canvas.height * (0.48 + Math.sin(angle) * 0.295) };
      });
      const core = points[0];
      points.slice(1).forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(core.x, core.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      });
      requestAnimationFrame(draw);
    }
    draw();
  }

  async function hydrate() {
    const debug = cockpitDebug();
    debug.lastHydrateStartedAt = new Date().toISOString();
    const loaders = [
      ['snapshot', () => requestJson('/runtime/snapshot'), 12000],
      ['projects', () => api('/api/dev/projects'), 5000],
      ['devJobs', () => api('/api/dev/jobs'), 4500],
      ['devMissions', () => api('/api/dev/missions'), 4500],
      ['jobs', () => api('/api/runtime/jobs'), 3500],
      ['missions', () => api('/api/missions'), 3500],
      ['eventsApi', () => api('/api/events?limit=80'), 3500],
      ['memory', () => api('/api/memory'), 2200],
      ['learning', () => api('/api/learning/procedural'), 2200],
      ['knowledge', () => api('/api/knowledge'), 2200],
      ['skills', () => api('/api/skills'), 2200],
      ['connectors', () => api('/api/connectors'), 2200],
      ['connections', () => api('/api/dev/connections'), 2200],
      ['repositories', () => api('/api/repositories'), 2200],
      ['git', () => api('/api/dev/git/status'), 2200],
      ['agentsPanel', () => api('/api/agents/panel'), 2200],
      ['swarm', () => api('/api/agents/swarm'), 2200],
      ['router', () => api('/api/ai/router/select'), 2200]
    ];
    const [snapshotKey, snapshotFn, snapshotTimeout] = loaders[0];
    try {
      const snapshot = await withTimeout(snapshotFn(), snapshotTimeout, null);
      if (snapshot?.operationalTwin) {
        state.api[snapshotKey] = snapshot;
        render();
      }
    } catch (error) {
      if (!state.api.snapshot?.operationalTwin) state.api.snapshot = { error: error.message };
    }
    await Promise.all(loaders.map(async ([key, fn, timeout]) => {
      if (key === 'snapshot' && state.api.snapshot?.operationalTwin) return;
      try {
        const value = await withTimeout(fn(), timeout, { timeout: true });
        if (value?.timeout && state.api[key]) return;
        state.api[key] = value;
      }
      catch (error) { state.api[key] = { error: error.message }; }
    }));
    if (state.api.snapshot) {
      document.dispatchEvent(new CustomEvent('fenix-live', { detail: { type: 'snapshot', ...state.api.snapshot } }));
    }
    if (Array.isArray(state.api.eventsApi?.events)) {
      state.events = state.api.eventsApi.events.concat(state.events).slice(0, 200);
    }
    render();
    cockpitDebug().lastHydrateFinishedAt = new Date().toISOString();
    cockpitDebug().lastSnapshotStatus = state.api.snapshot?.status || state.api.snapshot?.error || (state.api.snapshot?.timeout ? 'timeout' : 'none');
  }

  function withTimeout(promise, ms, fallback) {
    return Promise.race([
      promise,
      new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
  }

  document.addEventListener('fenix-live', (event) => {
    const detail = event.detail || {};
    if (detail.type === 'snapshot') {
      render();
      return;
    }
    if (detail.type && EVENT_TYPES.has(detail.type)) {
      state.events.unshift({ type: detail.type, payload: detail, at: new Date().toISOString(), seq: window.FENIX?.live?.lastSeq || 0 });
      state.events = state.events.slice(0, 200);
      localStorage.setItem('fenix_last_seen_seq', String(window.FENIX?.live?.lastSeq || state.lastSeenSeq));
      render();
    }
  });

  function start() {
    const initialSnapshot = readInitialSnapshot();
    if (initialSnapshot?.operationalTwin) {
      state.api.snapshot = initialSnapshot;
      cockpitDebug().lastSnapshotStatus = state.api.snapshot.status || 'INITIAL';
    }
    renderShell();
    render();
    hydrate();
    setInterval(() => { if (!document.hidden) hydrate(); }, 15000);
  }

  function readInitialSnapshot() {
    if (window.__FENIX_INITIAL_SNAPSHOT__?.operationalTwin) return window.__FENIX_INITIAL_SNAPSHOT__;
    const node = document.getElementById('fenix-initial-snapshot');
    if (!node?.textContent) return null;
    try { return JSON.parse(node.textContent); }
    catch { return null; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
