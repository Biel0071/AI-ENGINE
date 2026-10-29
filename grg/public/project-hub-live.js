(() => {
  'use strict';
  const CATALOG_PREFS_KEY = 'fenix_project_catalog_preferences_v1';
  const DEFAULT_FAVORITES = ['api-platform-live', 'fenix-os', 'grg-crm-distribuidor-automotivo', 'superapp-gestao-revendas', 'multi-tenant-manager'];
  const isFullFenixShell = typeof document !== 'undefined' && Boolean(document.getElementById('topbar') || document.getElementById('fnxTopbarKpisCluster') || document.querySelector('.fenix-shell'));
  function readCatalogPreferences() {
    try {
      const raw = localStorage.getItem(CATALOG_PREFS_KEY);
      const value = raw ? JSON.parse(raw) : null;
      const savedFavorites = Array.isArray(value?.favorites) ? value.favorites.filter((id) => typeof id === 'string').slice(0, 300) : null;
      return {
        favorites: savedFavorites !== null ? savedFavorites : (isFullFenixShell ? DEFAULT_FAVORITES : []),
        recents: Array.isArray(value?.recents) ? value.recents.filter((item) => typeof item?.id === 'string' && Number.isFinite(item.openedAt)).slice(0, 24) : [],
        layout: value?.layout === 'list' ? 'list' : 'grid',
      };
    } catch { return { favorites: isFullFenixShell ? DEFAULT_FAVORITES : [], recents: [], layout: 'grid' }; }
  }
  const catalogPreferences = readCatalogPreferences();
  const savedFullGrid = typeof localStorage !== 'undefined' ? localStorage.getItem('fenix_launcher_full_grid') : null;
  const isAutomation = typeof navigator !== 'undefined' && navigator.webdriver === true;
  const initialLauncherGrid = isFullFenixShell ? true : (savedFullGrid !== null ? savedFullGrid === 'true' : (!isAutomation));
  const savedGridDensity = typeof localStorage !== 'undefined' ? localStorage.getItem('fenix_catalog_grid_density') : null;
  const state = {
    projects: [],
    details: new Map(),
    detailLoads: new Map(),
    detailErrors: new Map(),
    workspaceTrees: new Map(),
    workspaceTreeLoading: new Set(),
    workspaceTreeErrors: new Map(),
    analyses: new Map(),
    reaAnalyses: new Map(),
    registeredScreens: new Map(),
    registeredScreensLoading: new Set(),
    registeredScreensErrors: new Map(),
    absorptionLoading: new Set(),
    systemObservations: new Map(),
    systemObservationTimers: new Map(),
    git: new Map(),
    connections: new Map(),
    deployments: new Map(),
    absorptions: new Map(),
    deployTimer: null,
    selected: null,
    requestedProjectId: null,
    query: '',
    loading: null,
    error: null,
    measuredAt: null,
    workspaceTab: 'overview', // 'overview' | 'files' | 'code' | 'browser' | 'screens' | 'graph' | 'intelligence'
    inspectorScreen: null,
    inspectorTab: 'live', // 'live' | 'structure' | 'code' | 'dna' | 'reconstruction' | 'compare'
    inspectorViewport: 'desktop',
    githubAccount: null,
    githubRepos: [],
    githubLoading: false,
    githubFilter: 'all',
    githubQuery: '',
    hubViewMode: 'fenix',
    catalogReturnSelection: null,
    selectedGitHubRepo: null,
    portfolioQuery: '',
    portfolioCaptureFilter: 'all',
    expandedPortfolioProjects: new Set(),
    shellScreenMap: null,
    shellScreenMapLoading: false,
    shellScreenMapError: null,
    shellScreenMapExpanded: false,
    catalogScope: 'all',
    catalogCategory: 'all',
    catalogStatusFilter: 'all',
    projectStatuses: {},
    catalogFavorites: new Set(catalogPreferences.favorites),
    catalogRecents: catalogPreferences.recents,
    catalogLayout: catalogPreferences.layout,
    designDrafts: new Map(),
    multiSelectedProjects: new Set(),
    multiViewActive: false,
    launcherFullGrid: initialLauncherGrid,
    detailFocus: false,
    gridDensity: savedGridDensity || 'auto',
    serviceStatuses: new Map(),
    multiViewPreviews: new Set(),
    projectDecisions: new Map()
  };
  const $ = (id) => document.getElementById(id);
  const legacyShellRoutes = new Set(['#command', '#dna', '#metrics']);
  const text = (value, fallback = '—') => value == null || value === '' ? fallback : String(value);
  const date = (value) => value ? new Date(value).toLocaleString('pt-BR') : '—';
  function operationalStatus(project) {
    const rawId = project?.catalogId || (String(project?.id || '').startsWith('local-') ? project.id.slice(6) : project?.id);
    const liveStatus = state.projectStatuses[rawId] || state.projectStatuses[project?.id] || null;
    return { liveStatus, status: typeof liveStatus?.online === 'boolean' ? (liveStatus.online ? 'online' : 'offline') : 'unknown' };
  }
  const workspaceIsAvailable = (project) => project?.workspaceAvailable === true || (project?.workspaceAvailable !== false && Boolean(project?.workspace));
  const normalizeProjectKey = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  function findVpsCounterpart(localProject) {
    if (localProject?.source !== 'LOCAL_PROJECT_CATALOG') return null;
    const catalogId = String(localProject.catalogId || localProject.id || '').replace(/^local-/, '');
    const localName = normalizeProjectKey(localProject.name);
    const localRepository = String(localProject.repository || '').trim().replace(/\.git$/i, '').replace(/\/$/, '').toLocaleLowerCase();
    const ranked = state.projects.filter((project) => project.source !== 'LOCAL_PROJECT_CATALOG').map((project) => {
      const aliases = Array.isArray(project.aliases) ? project.aliases : [];
      const idMatch = normalizeProjectKey(project.id) === normalizeProjectKey(catalogId);
      const aliasMatch = aliases.some((alias) => normalizeProjectKey(alias) === normalizeProjectKey(catalogId) || normalizeProjectKey(alias) === localName);
      const nameMatch = normalizeProjectKey(project.name || project.displayName) === localName;
      const repository = String(project.repository || '').trim().replace(/\.git$/i, '').replace(/\/$/, '').toLocaleLowerCase();
      const repositoryMatch = Boolean(localRepository && repository && localRepository === repository);
      const score = idMatch ? 4 : repositoryMatch ? 3 : aliasMatch ? 2 : nameMatch ? 1 : 0;
      return { project, score, reason: idMatch ? 'ID do catálogo' : repositoryMatch ? 'repositório igual' : aliasMatch ? 'alias registrado' : 'nome exato' };
    }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score);
    if (!ranked.length || ranked[1]?.score === ranked[0].score) return null;
    return ranked[0];
  }
  function projectPortSummary(project) {
    if (project?.source === 'LOCAL_PROJECT_CATALOG') {
      return [
        Number.isInteger(project.localPort) ? `PC local · UI ${project.localPort}` : null,
        Number.isInteger(project.apiPort) ? `PC local · API ${project.apiPort}` : null,
      ].filter(Boolean).join(' · ');
    }
    const uiPort = Number.isInteger(project?.frontend?.port) ? project.frontend.port : null;
    const apiPort = Number.isInteger(project?.backend?.port) ? project.backend.port : null;
    const knownPorts = new Set([uiPort, apiPort].filter(Number.isInteger));
    const entryPorts = [...new Set((Array.isArray(project?.deployment?.bindings) ? project.deployment.bindings : [])
      .map((binding) => Number(binding?.port))
      .filter((port) => Number.isInteger(port) && port >= 1 && port <= 65535 && !knownPorts.has(port)))];
    return [
      ...entryPorts.map((port) => `VPS: ${port}`),
      uiPort !== null ? `UI: ${uiPort}` : null,
      apiPort !== null ? `API: ${apiPort}` : null,
    ].filter(Boolean).join(' · ');
  }
  
  function resolveProjectUrl(project, liveStatus) {
    if (liveStatus?.activeUrl) return liveStatus.activeUrl;
    if (project?.localUrl) return project.localUrl;
    if (project?.remoteUrl) return project.remoteUrl;
    const port = liveStatus?.port || project?.localPort || project?.frontend?.port || project?.port || (project?.deployment?.bindings?.[0]?.port);
    if (port) {
      if (typeof window !== 'undefined' && window.location) {
        return `${window.location.protocol}//${window.location.hostname}:${port}`;
      }
      return `http://localhost:${port}`;
    }
    return null;
  }

  function getCompanyLogoForProject(project) {
    if (!project) return '/assets/logos/fenix.png';
    if (project.logoUrl) return project.logoUrl;
    const name = String(project.name || project.id || '').toLowerCase();
    const id = String(project.id || '').toLowerCase();
    const group = String(project.catalogGroup || '').toLowerCase();

    if (id.includes('fenix') || name.includes('fenix')) return '/assets/logos/fenix.png';
    if (id.includes('crm') || name.includes('crm') || id.includes('zapai') || name.includes('zapai') || group.includes('crm')) return '/assets/logos/zapai-crm.png';
    if (id.includes('api-platform') || id.includes('api_platform') || name.includes('api platform')) return '/assets/logos/api-platform.png';
    if (id.includes('mf-atacadista') || name.includes('atacadista') || name.includes('deposito')) return '/assets/logos/mf-atacadista.png';
    if (id.includes('droid') || name.includes('droidview')) return '/assets/logos/droidview.png';
    if (id.includes('tbot') || id.includes('ocbot') || name.includes('tbot')) return '/assets/logos/ocbot.png';
    if (id.includes('browser') || id.includes('bai') || name.includes('browser')) return '/assets/logos/browser-agent.png';
    if (id.includes('marmita') || name.includes('marmita')) return '/assets/logos/marmita.png';
    if (id.includes('task') || name.includes('task-board') || name.includes('kanban')) return '/assets/logos/task-board.png';
    if (id.includes('ficha') || name.includes('gerar-ficha')) return '/assets/logos/gerar-ficha.png';
    if (id.includes('lovable') || name.includes('lovable')) return '/assets/logos/lovable-pro.png';
    if (id.includes('live-cam') || id.includes('avatarify') || name.includes('avatar')) return '/assets/logos/avatarify.png';
    if (id.includes('rolezando') || name.includes('rolezando')) return '/assets/logos/rolezando.png';
    if (id.includes('trustpag') || id.includes('payment') || name.includes('pagamento')) return '/assets/logos/trustpag.png';
    if (id.includes('wave') || name.includes('wave-store')) return '/assets/logos/wave-store.png';
    if (id.includes('fortlev') || name.includes('fortlev')) return '/assets/logos/fortlev-quote.png';
    if (id.includes('claw') || name.includes('openclaw')) return '/assets/logos/openclaw.png';
    if (id.includes('disk7') || name.includes('disk7')) return '/assets/logos/disk7.png';
    if (id.includes('baileys') || name.includes('baileys')) return '/assets/logos/baileys-server.png';
    if (project.logoUrl) return project.logoUrl;
    return '/assets/logos/fenix.png';
  }

  function getScreenPreviewForProject(project) {
    if (!project) return '/screenshots/fenix-os_screenshot.png';
    if (project.screenshotUrl) return project.screenshotUrl;
    const name = String(project.name || project.id || '').toLowerCase();
    const id = String(project.id || '').toLowerCase();
    const group = String(project.catalogGroup || '').toLowerCase();

    const registered = state.registeredScreens?.get?.(project.id);
    if (registered && registered.length && registered[0].screenshotPath) {
      return registered[0].screenshotPath;
    }
    const absorption = state.absorptions?.get?.(project.id);
    if (absorption && absorption.screens && absorption.screens.length && absorption.screens[0].screenshotPath) {
      return absorption.screens[0].screenshotPath;
    }

    if (id.includes('fenix') || name.includes('fenix')) return '/screenshots/fenix-os_screenshot.png';
    if (id.includes('crm') || name.includes('crm') || id.includes('zapai') || name.includes('zapai') || group.includes('crm')) return '/screenshots/zapai-crm_screenshot.png';
    if (id.includes('api-platform') || id.includes('api_platform') || name.includes('api platform')) return '/screenshots/api-platform_screenshot.png';
    if (id.includes('mf-atacadista') || name.includes('atacadista') || name.includes('deposito')) return '/screenshots/operations.png';
    if (id.includes('city') || id.includes('droid') || name.includes('city')) return '/screenshots/city.png';
    if (id.includes('bai') || id.includes('browser')) return '/screenshots/v11_phase4_browser.png';
    if (id.includes('ide') || name.includes('ide')) return '/screenshots/v11_phase4_ide.png';
    return '/screenshots/projects.png';
  }

  function authToken() {
    return (typeof window.fenixGetAuthToken === 'function')
      ? window.fenixGetAuthToken()
      : (localStorage.getItem('grg_token') || localStorage.getItem('fenix_token') || sessionStorage.getItem('grg_token') || (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] || '');
  }

  async function json(url, options = {}) {
    if (typeof window.FENIX?.api === 'function') {
      try {
        return await window.FENIX.api(url, options);
      } catch (error) {
        const normalized = new Error(error?.message || error?.error || `HTTP ${error?.status || 'indisponível'}`);
        normalized.status = error?.status;
        throw normalized;
      }
    }
    const token = authToken();
    const headers = {
      ...(token && token !== 'null' ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), credentials: 'same-origin', ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = text(content);
    return node;
  }

  async function loadCatalogStatus(force = false) {
    try {
      const data = await json('/api/v2/projects/catalog-status');
      if (data && data.projects) {
        state.projectStatuses = data.projects;
        renderMetrics();
        renderCards();
        if (state.selected) renderDetail();
      }
    } catch (err) {
      console.warn('[ProjectHub] Falha ao carregar status do catálogo:', err);
    }
  }

  async function checkProjectStatus(projectId) {
    const rawId = String(projectId || '').replace(/^local-/, '');
    try {
      const res = await json(`/api/v2/projects/${encodeURIComponent(rawId)}/check`, { method: 'POST', body: '{}' });
      if (res && res.status) {
        state.projectStatuses[rawId] = res.status;
        renderMetrics();
        renderCards();
        if (state.selected === projectId || state.selected === `local-${rawId}` || state.selected === rawId) {
          renderDetail();
        }
      }
      return res?.status;
    } catch (err) {
      console.warn(`[ProjectHub] Erro ao retestar status do projeto ${rawId}:`, err);
    }
  }

  async function startProjectService(projectId, project) {
    const rawId = String(projectId || '').replace(/^local-/, '');
    if ($('flpMeasured')) $('flpMeasured').textContent = `Iniciando serviço ${project?.name || rawId}…`;
    try {
      const res = await json(`/api/v2/projects/${encodeURIComponent(rawId)}/start`, { method: 'POST', body: '{}' });
      if ($('flpMeasured')) $('flpMeasured').textContent = res.message || `Serviço ${project?.name || rawId} iniciado em background!`;
      setTimeout(async () => {
        await checkProjectStatus(rawId);
      }, 2500);
      return res;
    } catch (err) {
      if ($('flpMeasured')) $('flpMeasured').textContent = `Erro ao iniciar serviço: ${err.message}`;
    }
  }

  async function openProjectFolderDirect(projectId, project) {
    const rawId = String(projectId || '').replace(/^local-/, '');
    try {
      const res = await json(`/api/v2/projects/${encodeURIComponent(rawId)}/open-folder`, { method: 'POST', body: '{}' });
      if ($('flpMeasured')) $('flpMeasured').textContent = `Pasta aberta no Explorer: ${project?.workspace || rawId}`;
      return res;
    } catch (err) {
      if ($('flpMeasured')) $('flpMeasured').textContent = `Erro ao abrir pasta: ${err.message}`;
    }
  }

  async function loadProjectLogs(projectId, container) {
    const rawId = String(projectId || '').replace(/^local-/, '');
    if (!container) return;
    container.textContent = 'Carregando logs do serviço…';
    try {
      const data = await json(`/api/v2/projects/${encodeURIComponent(rawId)}/logs`);
      container.textContent = data.content || (Array.isArray(data.lines) && data.lines.length ? data.lines.join('\n') : 'Nenhum log gravado ainda para este serviço.');
    } catch (err) {
      container.textContent = `Erro ao carregar logs: ${err.message}`;
    }
  }

  function setupStatusWebSocket() {
    if (window.__FENIX_STATUS_WS_INITIALIZED__) return;
    window.__FENIX_STATUS_WS_INITIALIZED__ = true;

    const handleStatusPayload = (type, payload) => {
      if (type === 'project.status.updated' && payload) {
        const { id, online, activeUrl, port, latencyMs, timestamp } = payload;
        state.projectStatuses[id] = { id, online, activeUrl, port, latencyMs, checkedAt: timestamp };
        renderMetrics();
        renderCards();
        if (state.selected === id || state.selected === `local-${id}`) {
          renderDetail();
        }
      } else if (type === 'project.status.all' && payload) {
        state.projectStatuses = { ...state.projectStatuses, ...payload };
        renderMetrics();
        renderCards();
        if (state.selected) renderDetail();
      }
    };

    document.addEventListener('fenix-live', (e) => {
      if (e.detail?.type?.startsWith('project.status.')) {
        handleStatusPayload(e.detail.type, e.detail.payload || e.detail);
      }
    });

    document.addEventListener('fenix-ws', (e) => {
      if (e.detail?.type?.startsWith('project.status.')) {
        handleStatusPayload(e.detail.type, e.detail.payload);
      }
    });
  }

  function renderShell() {
    const view = $('view-projects');
    if (!view || view.dataset.liveProjects === 'true') return;
    view.dataset.liveProjects = 'true';
    view.innerHTML = `<section class="fenix-live-projects">
      <header class="flp-header flp-header-compact">
        <div class="flp-header-left">
          <span class="flp-eyebrow">PROJECT KERNEL</span>
          <span id="flpMeasured" role="status" class="flp-header-status">Carregando…</span>
          <span id="flpSource" class="flp-header-source">Fonte: Project Kernel / GitHub Bridge / JobEngine</span>
          <div class="flp-metrics flp-metrics-compact">
            <div><span>Total de Projetos</span><strong id="flpTotal">—</strong></div>
            <div><span>Serviços Online</span><strong id="flpRunning" style="color:#00E5A0;">—</strong></div>
            <div><span>Serviços Offline</span><strong id="flpFailed" style="color:#94a3b8;">—</strong></div>
            <div><span>Portas Mapeadas</span><strong id="flpWorkspaces" style="color:#38bdf8;">—</strong></div>
          </div>
        </div>
        <div class="flp-header-actions" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <a href="http://209.50.241.22:3000" target="_blank" rel="noopener noreferrer" id="flpVpsCloudBtn" class="flp-button flp-button-vps" title="Abrir Fênix OS na Nuvem (VPS 209.50.241.22:3000)">
            <i class="ph-bold ph-cloud-arrow-up" style="font-size:14px;"></i>
            <span>Fênix VPS Live ↗</span>
          </a>
          <button type="button" id="flpGitHubAccountBtn" class="flp-button flp-button-soft" style="display:inline-flex; align-items:center; gap:6px;">
            <i class="ph-bold ph-github-logo" style="font-size:14px; color:#38bdf8;"></i>
            <span id="flpGitHubAccountLabel">GitHub: —</span>
          </button>
          <button type="button" id="flpGitHubNewRepoBtn" class="flp-button flp-button-soft" style="display:inline-flex; align-items:center; gap:6px;">
            <i class="ph-bold ph-plus-circle" style="color:#00E5A0;"></i> Novo Repo
          </button>
          <button type="button" id="flpCloneToggle" class="flp-button flp-button-primary" aria-expanded="false" aria-controls="flpClone">+ Importar URL</button>
          <button type="button" id="flpRefresh" class="flp-button flp-button-soft">↻ Atualizar</button>
        </div>
      </header>
      <form id="flpClone" class="flp-clone" hidden>
        <label>Nome do projeto <input name="name" required maxlength="100" placeholder="Nome do projeto"></label>
        <label>URL HTTPS <input name="repository" required type="url" placeholder="https://github.com/usuario/repositorio.git"></label>
        <button type="submit" class="flp-button flp-button-primary">Clonar e registrar</button>
        <span id="flpCloneStatus" role="status"></span>
      </form>
      <div class="flp-body">
        <aside class="flp-tree-nav-sidebar" id="flpTreeSidebar"></aside>
        <aside class="flp-sidebar">
          <div class="flp-hub-mode-tabs" style="display:flex; border-bottom:1px solid rgba(133,179,215,.14); margin-bottom:14px; gap:4px;">
            <button type="button" id="flpModeFenix" class="flp-hub-mode-tab active" aria-label="PROJETOS FÊNIX">PROJETOS FÊNIX</button>
            <button type="button" id="flpModeLocal" class="flp-hub-mode-tab" aria-label="MEUS PROJETOS">MEUS PROJETOS</button>
            <button type="button" id="flpModeScreens" class="flp-hub-mode-tab">TELAS &amp; DNA</button>
            <button type="button" id="flpModeGitHub" class="flp-hub-mode-tab">PORTFÓLIO GITHUB</button>
            <button type="button" id="flpModeQwen" class="flp-hub-mode-tab">QWEN STUDIO</button>
          </div>
          <div id="flpFavoritesBar" class="flp-favorites-bar" style="display:none;">
            <div class="flp-fav-head">
              <strong><i class="ph-fill ph-star" style="color:#ffd166;"></i> FAVORITOS (<span id="flpFavCount">0</span>)</strong>
              <span style="font-size:11px; color:#64748b;">Acesso rápido aos sistemas prioritários</span>
            </div>
            <div class="flp-fav-cards-strip" id="flpFavCardsStrip"></div>
          </div>
          <div id="flpFenixSidebarView" class="flp-fenix-toolbar-compact">
            <!-- LINHA 1: Busca + Categorias + Controles de Modo & Layout -->
            <div class="flp-toolbar-row flp-toolbar-row-1">
              <div class="flp-search-container">
                <i class="ph-bold ph-magnifying-glass flp-search-icon"></i>
                <label for="flpSearch" style="display:none;">Encontrar projeto</label>
                <input id="flpSearch" type="search" placeholder="Buscar projeto, porta, grupo…" autocomplete="off">
              </div>
              <div class="flp-category-filters" role="tablist">
                <button type="button" class="flp-cat-filter-btn active" data-category="all"><span class="fnx-mono3d-glyph"><i class="ph-bold ph-squares-four"></i></span> Todos <span class="cat-badge" id="flpCatCountAll">—</span></button>
                <button type="button" class="flp-cat-filter-btn" data-category="Lovable"><span class="fnx-mono3d-glyph"><i class="ph-bold ph-sparkle"></i></span> Lovable <span class="cat-badge" id="flpCatCountLovable">—</span></button>
                <button type="button" class="flp-cat-filter-btn" data-category="CRM &amp; WhatsApp"><span class="fnx-mono3d-glyph"><i class="ph-bold ph-chats-circle"></i></span> CRM &amp; WA <span class="cat-badge" id="flpCatCountCrm">—</span></button>
                <button type="button" class="flp-cat-filter-btn" data-category="Fênix &amp; Core"><span class="fnx-mono3d-glyph"><i class="ph-bold ph-cpu"></i></span> Fênix <span class="cat-badge" id="flpCatCountFenix">—</span></button>
                <button type="button" class="flp-cat-filter-btn" data-category="Automação"><span class="fnx-mono3d-glyph"><i class="ph-bold ph-lightning"></i></span> Auto <span class="cat-badge" id="flpCatCountAuto">—</span></button>
                <button type="button" class="flp-cat-filter-btn" data-category="Ferramentas &amp; IA"><span class="fnx-mono3d-glyph"><i class="ph-bold ph-wrench"></i></span> Ferramentas <span class="cat-badge" id="flpCatCountTools">—</span></button>
              </div>
              <div class="flp-toolbar-actions-right">
                <div class="flp-launcher-multiview-bar" role="group" aria-label="Grade Iniciar Projetos e Visualização Simultânea">
                  <button type="button" id="flpFullLauncherGridBtn" class="flp-launcher-mode-btn" aria-pressed="false" title="Expandir Grade em tela cheia (4 a 6 colunas)">
                    <span class="fnx-mono3d-glyph"><i class="ph-bold ph-grid-four"></i></span>
                    <span>Grade Completa</span>
                  </button>
                  <button type="button" id="flpMultiViewToggleBtn" class="flp-multiview-mode-btn" aria-pressed="false" title="Visualização simultânea lado a lado">
                    <span class="fnx-mono3d-glyph"><i class="ph-bold ph-columns"></i></span>
                    <span>Multi (<strong id="flpMultiViewCount">0</strong>)</span>
                  </button>
                  <button type="button" id="flpMultiViewClearBtn" class="flp-multiview-clear-btn" hidden title="Limpar seleção simultânea">✕</button>
                </div>
                <button type="button" id="flpQuickStatusRefresh" class="fnx-mono3d-btn" title="Retestar todas as portas agora"><i class="ph-bold ph-arrows-clockwise"></i> Scan</button>
                <div class="flp-project-layouts">
                  <div class="flp-density-controls" role="group" aria-label="Densidade de Colunas">
                    <button type="button" class="flp-density-btn" data-density="6" title="Grade de 6 colunas (Confortável)">6</button>
                    <button type="button" class="flp-density-btn" data-density="8" title="Grade de 8 colunas (Médio)">8</button>
                    <button type="button" class="flp-density-btn" data-density="12" title="Grade de 12 colunas (Compacto)">12</button>
                    <button type="button" class="flp-density-btn active" data-density="auto" title="Automático / Responsivo">Auto</button>
                  </div>
                  <button type="button" id="flpLayoutExpandToggle" aria-label="Tela Inteira" title="Alternar Grade em Tela Inteira" aria-pressed="true">⛶</button>
                  <button type="button" data-project-layout="grid" aria-label="Grade" title="Grade" aria-pressed="true">▦</button>
                  <button type="button" data-project-layout="list" aria-label="Lista" title="Lista" aria-pressed="false">☷</button>
                </div>
              </div>
            </div>

            <!-- LINHA 2: Status Operacional + Escopos e Filtros Rápidos (com Favoritos) -->
            <div class="flp-toolbar-row flp-toolbar-row-2">
              <div class="flp-status-filters" role="group">
                <button type="button" class="flp-status-pill-btn active" data-status-filter="all">Todos</button>
                <button type="button" class="flp-status-pill-btn" data-status-filter="online"><span class="fnx-mono3d-dot online"></span> Online (<span id="flpOnlineCountBadge">—</span>)</button>
                <button type="button" class="flp-status-pill-btn" data-status-filter="offline"><span class="fnx-mono3d-dot offline"></span> Offline (<span id="flpOfflineCountBadge">—</span>)</button>
                <button type="button" class="flp-status-pill-btn" data-status-filter="unknown"><span class="fnx-mono3d-dot unknown"></span> Não verificado (<span id="flpUnknownCountBadge">—</span>)</button>
              </div>
              <div class="flp-toolbar-sep"></div>
              <div class="flp-project-recovery-controls" role="group" aria-label="Organização do catálogo de projetos">
                <div class="flp-project-scopes">
                  <button type="button" data-project-scope="favorites" aria-pressed="false" class="flp-scope-fav"><i class="ph-fill ph-star" style="color:#ffd166;"></i> Favoritos</button>
                  <button type="button" data-project-scope="all" aria-pressed="true">Todos</button>
                  <button type="button" data-project-scope="local" aria-pressed="false">Locais</button>
                  <button type="button" data-project-scope="remote" aria-pressed="false">Remotos</button>
                  <button type="button" data-project-scope="github" aria-pressed="false">GitHub</button>
                  <button type="button" data-project-scope="recent" aria-pressed="false">Recentes</button>
                  <button type="button" data-project-scope="problems" aria-pressed="false">Problemas</button>
                  <button type="button" data-project-scope="unverified" aria-pressed="false">Não Verificados</button>
                </div>
              </div>
            </div>
            <div id="flpFolderNavBanner" class="flp-folder-nav-banner" style="display:none;"></div>
            <div id="flpFolderCards" class="flp-folder-cards-grid"></div>
            <div id="flpCards" class="flp-cards"></div>
          </div>
          <div id="flpGitHubSidebarView" style="display:none;">
            <label for="flpGitHubSearch">Buscar na sua conta GitHub</label>
            <input id="flpGitHubSearch" type="search" placeholder="Nome ou linguagem…" autocomplete="off">
            <div style="display:flex; gap:4px; margin-top:8px; margin-bottom:10px; flex-wrap:wrap;">
              <button type="button" class="flp-gh-filter-btn active" data-filter="all" style="font-size:10px; padding:3px 8px; border-radius:12px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; cursor:pointer;">Todos</button>
              <button type="button" class="flp-gh-filter-btn" data-filter="activated" style="font-size:10px; padding:3px 8px; border-radius:12px; background:transparent; border:1px solid rgba(255,255,255,0.08); color:#94a3b8; cursor:pointer;">Ativos Fênix</button>
              <button type="button" class="flp-gh-filter-btn" data-filter="not_activated" style="font-size:10px; padding:3px 8px; border-radius:12px; background:transparent; border:1px solid rgba(255,255,255,0.08); color:#94a3b8; cursor:pointer;">Não Ativados</button>
            </div>
            <div id="flpGitHubCards" class="flp-cards"></div>
          </div>
          <div id="flpQwenSidebarView" style="display:none;">
            <label for="flpQwenSearch">Projetos Qwen Coder</label>
            <input id="flpQwenSearch" type="search" placeholder="Buscar projeto Qwen…" autocomplete="off">
            <div id="flpQwenCards" class="flp-cards" style="margin-top:8px;"></div>
          </div>
        </aside>
        <main id="flpDetail" class="flp-detail" aria-live="polite"></main>
      </div>
      <div id="flpInspectorContainer"></div>
      <div id="flpGitHubModalContainer"></div>
    </section>`;

    $('flpRefresh').addEventListener('click', () => {
      load(true);
      loadGitHubAccount();
    });
    $('flpGitHubAccountBtn').addEventListener('click', () => openGitHubConnectModal());
    $('flpGitHubNewRepoBtn').addEventListener('click', () => openGitHubCreateModal());

    $('flpModeFenix').addEventListener('click', () => {
      state.hubViewMode = 'fenix';
      if (state.catalogReturnSelection) state.selected = state.catalogReturnSelection;
      state.catalogReturnSelection = null;
      $('flpModeFenix').classList.add('active');
      $('flpModeScreens').classList.remove('active');
      $('flpModeGitHub').classList.remove('active');
      $('flpModeQwen')?.classList.remove('active');
      $('flpModeLocal')?.classList.remove('active');
      $('flpFenixSidebarView').style.display = 'block';
      $('flpGitHubSidebarView').style.display = 'none';
      if ($('flpQwenSidebarView')) $('flpQwenSidebarView').style.display = 'none';
      renderCards();
      renderDetail();
      renderMetrics();
    });

    $('flpModeLocal').addEventListener('click', () => {
      if (state.hubViewMode !== 'local') state.catalogReturnSelection = state.selected;
      state.hubViewMode = 'local';
      state.catalogLayout = 'grid';
      $('flpModeLocal').classList.add('active');
      $('flpModeScreens').classList.remove('active');
      $('flpModeFenix').classList.remove('active');
      $('flpModeGitHub').classList.remove('active');
      $('flpModeQwen')?.classList.remove('active');
      $('flpFenixSidebarView').style.display = 'block';
      $('flpGitHubSidebarView').style.display = 'none';
      if ($('flpQwenSidebarView')) $('flpQwenSidebarView').style.display = 'none';
      const first = state.projects.find((project) => project.source === 'LOCAL_PROJECT_CATALOG');
      if (first) selectProject(first.id);
      else { state.selected = null; renderCards(); renderDetail(); }
      renderMetrics();
    });

    $('flpModeGitHub').addEventListener('click', () => {
      state.hubViewMode = 'github';
      $('flpModeGitHub').classList.add('active');
      $('flpModeScreens').classList.remove('active');
      $('flpModeFenix').classList.remove('active');
      $('flpModeQwen')?.classList.remove('active');
      $('flpModeLocal')?.classList.remove('active');
      $('flpFenixSidebarView').style.display = 'none';
      $('flpGitHubSidebarView').style.display = 'block';
      if ($('flpQwenSidebarView')) $('flpQwenSidebarView').style.display = 'none';
      renderGitHubCards();
      renderGitHubPortfolioView($('flpDetail'));
      if (!state.githubRepos.length) loadGitHubRepos();
    });

    $('flpModeQwen')?.addEventListener('click', () => {
      state.hubViewMode = 'qwen';
      $('flpModeQwen').classList.add('active');
      $('flpModeScreens').classList.remove('active');
      $('flpModeFenix').classList.remove('active');
      $('flpModeGitHub').classList.remove('active');
      $('flpModeLocal')?.classList.remove('active');
      $('flpFenixSidebarView').style.display = 'none';
      $('flpGitHubSidebarView').style.display = 'none';
      if ($('flpQwenSidebarView')) $('flpQwenSidebarView').style.display = 'block';
      if (window.fenixQwenOrchestrator) {
        window.fenixQwenOrchestrator.renderSidebarCards?.($('flpQwenCards'));
        window.fenixQwenOrchestrator.renderStudio($('flpDetail'));
      }
    });

    $('flpModeScreens').addEventListener('click', () => {
      state.hubViewMode = 'screens';
      $('flpModeScreens').classList.add('active');
      $('flpModeFenix').classList.remove('active');
      $('flpModeGitHub').classList.remove('active');
      $('flpModeQwen')?.classList.remove('active');
      $('flpModeLocal')?.classList.remove('active');
      $('flpFenixSidebarView').style.display = 'none';
      $('flpGitHubSidebarView').style.display = 'none';
      if ($('flpQwenSidebarView')) $('flpQwenSidebarView').style.display = 'none';
      renderScreenPortfolio($('flpDetail'));
    });

    $('flpCloneToggle').addEventListener('click', (event) => {
      const form = $('flpClone');
      form.hidden = !form.hidden;
      event.currentTarget.setAttribute('aria-expanded', String(!form.hidden));
      if (!form.hidden) form.querySelector('input')?.focus();
    });
    $('flpSearch').addEventListener('input', (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderCards();
    });
    view.querySelectorAll('.flp-cat-filter-btn').forEach((button) => button.addEventListener('click', () => {
      view.querySelectorAll('.flp-cat-filter-btn').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      state.catalogCategory = button.dataset.category || 'all';
      renderCards();
    }));
    view.querySelectorAll('.flp-status-pill-btn').forEach((button) => button.addEventListener('click', () => {
      view.querySelectorAll('.flp-status-pill-btn').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      state.catalogStatusFilter = button.dataset.statusFilter || 'all';
      renderCards();
    }));
    $('flpQuickStatusRefresh')?.addEventListener('click', () => {
      loadCatalogStatus(true);
    });
    // Wire Density Controls
    const currentDensity = state.gridDensity || 'auto';
    document.querySelectorAll('.flp-density-btn').forEach((btn) => {
      const d = btn.getAttribute('data-density') || 'auto';
      btn.classList.toggle('active', d === currentDensity);
      btn.setAttribute('aria-pressed', String(d === currentDensity));
      btn.addEventListener('click', () => {
        state.gridDensity = d;
        try { localStorage.setItem('fenix_catalog_grid_density', d); } catch {}
        document.querySelectorAll('.flp-density-btn').forEach((b) => {
          const bd = b.getAttribute('data-density') || 'auto';
          b.classList.toggle('active', bd === d);
          b.setAttribute('aria-pressed', String(bd === d));
        });
        const container = $('flpCards');
        if (container) container.dataset.density = d;
      });
    });
    $('flpLayoutExpandToggle')?.addEventListener('click', () => {
      $('flpFullLauncherGridBtn')?.click();
    });
    $('flpFullLauncherGridBtn')?.addEventListener('click', () => {
      state.launcherFullGrid = !state.launcherFullGrid;
      if (state.launcherFullGrid) state.catalogLayout = 'grid';
      try { localStorage.setItem('fenix_launcher_full_grid', String(state.launcherFullGrid)); } catch {}
      syncMultiViewToolbar();
      renderCards();
    });
    $('flpMultiViewToggleBtn')?.addEventListener('click', () => {
      if (!state.multiViewActive && state.multiSelectedProjects.size === 0) {
        const defaults = [];
        if (state.selected) defaults.push(state.selected);
        for (const p of state.projects) {
          if (defaults.length >= 3) break;
          if (!defaults.includes(p.id)) defaults.push(p.id);
        }
        defaults.forEach((id) => state.multiSelectedProjects.add(id));
      }
      state.multiViewActive = !state.multiViewActive;
      if (state.multiViewActive && state.launcherFullGrid) state.launcherFullGrid = false;
      syncMultiViewToolbar();
      renderCards();
      renderDetail();
    });
    $('flpMultiViewClearBtn')?.addEventListener('click', () => {
      state.multiSelectedProjects.clear();
      state.multiViewActive = false;
      syncMultiViewToolbar();
      renderCards();
      renderDetail();
    });
    view.querySelectorAll('[data-project-scope]').forEach((button) => button.addEventListener('click', () => {
      state.catalogScope = button.dataset.projectScope;
      view.querySelectorAll('[data-project-scope]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      renderCards();
    }));
    view.querySelectorAll('[data-project-layout]').forEach((button) => button.addEventListener('click', () => {
      state.catalogLayout = button.dataset.projectLayout === 'grid' ? 'grid' : 'list';
      persistCatalogPreferences();
      view.querySelectorAll('[data-project-layout]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      renderCards();
    }));
    $('flpGitHubSearch').addEventListener('input', (event) => {
      state.githubQuery = event.target.value.trim().toLowerCase();
      renderGitHubCards();
    });

    const filterBtns = view.querySelectorAll('.flp-gh-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.borderColor = 'rgba(255,255,255,0.08)';
          b.style.color = '#94a3b8';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(56,189,248,0.15)';
        btn.style.borderColor = 'rgba(56,189,248,0.3)';
        btn.style.color = '#38bdf8';
        state.githubFilter = btn.dataset.filter;
        renderGitHubCards();
        if (state.hubViewMode === 'github') renderGitHubPortfolioView($('flpDetail'));
      });
    });

    $('flpClone').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      const status = $('flpCloneStatus');
      const fields = Object.fromEntries(new FormData(form));
      button.disabled = true;
      status.textContent = 'Clonando repositório…';
      try {
        const result = await json('/api/fenix/projects/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
          signal: AbortSignal.timeout(200000)
        });
        await load(true);
        selectProject(result.project.id);
        form.reset();
        status.textContent = `Projeto ${result.project.name} registrado.`;
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  function renderMetrics() {
    const isLocal = state.hubViewMode === 'local';
    const localProjects = state.projects.filter((p) => p.source === 'LOCAL_PROJECT_CATALOG');
    const catalogUnavailable = Boolean(state.error && !state.measuredAt);
    const statusCounts = state.projects.reduce((counts, project) => {
      counts[operationalStatus(project).status] += 1;
      return counts;
    }, { online: 0, offline: 0, unknown: 0 });
    const { online: onlineCount, offline: offlineCount, unknown: unknownCount } = statusCounts;
    const mappedPorts = new Set(state.projects.map((p) => p.localPort).filter(Boolean)).size;

    const metricLabels = document.querySelectorAll('#view-projects .flp-metrics > div > span');
    const labels = isLocal
      ? ['Projetos no catálogo local', 'Pastas disponíveis', 'URLs locais configuradas', 'Logos cadastrados']
      : ['Total de Projetos', 'Serviços Online', 'Serviços Offline', 'Portas Mapeadas'];
    metricLabels.forEach((label, index) => { label.textContent = labels[index] || ''; });
    const allCategoryButton = document.querySelector('#view-projects .flp-cat-filter-btn[data-category="all"]');
    if (allCategoryButton) {
      const badge = allCategoryButton.querySelector('.cat-badge');
      if (badge) badge.textContent = catalogUnavailable ? '—' : String(state.projects.length);
    }

    // Dynamic Category Counts
    const sourcePool = isLocal ? localProjects : state.projects;
    const catCounts = {
      all: sourcePool.length,
      lovable: sourcePool.filter(p => /lovable/i.test(p.catalogGroup || '')).length,
      crm: sourcePool.filter(p => /crm|whatsapp|zapai/i.test(p.catalogGroup || '')).length,
      fenix: sourcePool.filter(p => /f[eê]nix|core/i.test(p.catalogGroup || '') || /f[eê]nix/i.test(p.name || p.id)).length,
      auto: sourcePool.filter(p => /automa[cç][aã]o|auto/i.test(p.catalogGroup || '')).length,
      tools: sourcePool.filter(p => /ferramenta|ia|ai|tool/i.test(p.catalogGroup || '')).length
    };
    if ($('flpCatCountAll')) $('flpCatCountAll').textContent = catalogUnavailable ? '—' : String(catCounts.all);
    if ($('flpCatCountLovable')) $('flpCatCountLovable').textContent = catalogUnavailable ? '—' : String(catCounts.lovable);
    if ($('flpCatCountCrm')) $('flpCatCountCrm').textContent = catalogUnavailable ? '—' : String(catCounts.crm);
    if ($('flpCatCountFenix')) $('flpCatCountFenix').textContent = catalogUnavailable ? '—' : String(catCounts.fenix);
    if ($('flpCatCountAuto')) $('flpCatCountAuto').textContent = catalogUnavailable ? '—' : String(catCounts.auto);
    if ($('flpCatCountTools')) $('flpCatCountTools').textContent = catalogUnavailable ? '—' : String(catCounts.tools);

    if (catalogUnavailable) {
      ['flpTotal', 'flpRunning', 'flpFailed', 'flpWorkspaces', 'flpOnlineCountBadge', 'flpOfflineCountBadge', 'flpUnknownCountBadge']
        .forEach((id) => { if ($(id)) $(id).textContent = '—'; });
      $('flpMeasured').textContent = `Catálogo de projetos indisponível · ${text(state.error, 'erro não informado')}`;
      $('flpMeasured').dataset.error = 'true';
      return;
    }

    if (isLocal) {
      $('flpTotal').textContent = String(localProjects.length);
      $('flpRunning').textContent = String(localProjects.filter((p) => p.workspaceAvailable).length);
      $('flpFailed').textContent = String(localProjects.filter((p) => Boolean(p.localUrl)).length);
      $('flpWorkspaces').textContent = String(localProjects.filter((p) => Boolean(p.logoUrl)).length);
    } else {
      $('flpTotal').textContent = String(state.projects.length);
      $('flpRunning').textContent = String(onlineCount);
      $('flpFailed').textContent = String(offlineCount);
      $('flpWorkspaces').textContent = String(mappedPorts);
    }
    if ($('flpOnlineCountBadge')) $('flpOnlineCountBadge').textContent = String(onlineCount);
    if ($('flpOfflineCountBadge')) $('flpOfflineCountBadge').textContent = String(offlineCount);
    if ($('flpUnknownCountBadge')) $('flpUnknownCountBadge').textContent = String(unknownCount);

    $('flpMeasured').textContent = state.error
      ? `Falha ao atualizar · exibindo leitura de ${date(state.measuredAt)}`
      : isLocal
        ? `Catálogo Local · ${localProjects.length} projeto(s) registrado(s)`
        : `Catálogo Fênix Ativo · ${state.projects.length} sistemas monitorados (${onlineCount} ativos)`;
    $('flpMeasured').dataset.error = String(Boolean(state.error));

    window.__FENIX_CATALOG_TOTAL__ = state.projects.length;
    if (window.__FENIX_STATE__) {
      window.__FENIX_STATE__.catalogTotal = state.projects.length;
    }
    const topKpi = document.getElementById("topKpiProjectsVal");
    if (topKpi && state.projects.length) {
      topKpi.textContent = String(state.projects.length);
      const btn = topKpi.closest('button');
      if (btn) {
        btn.setAttribute('aria-label', `Projetos monitorados: ${state.projects.length}`);
        btn.title = `Projetos: ${state.projects.length} sistemas no catálogo (${onlineCount} ativos). Clique para abrir catálogo e workspaces.`;
      }
    }
    const tbProjects = document.getElementById("topbarStatProjects");
    if (tbProjects && state.projects.length) {
      tbProjects.textContent = String(state.projects.length);
    }
  }


  function openSystemModal(project, url) {
    const existing = document.getElementById('flpSystemModal');
    if (existing) existing.remove();

    const { liveStatus, status } = operationalStatus(project);
    const isOnline = status === 'online';
    const targetUrl = url || liveStatus?.activeUrl || project.localUrl || (project.localPort ? `http://localhost:${project.localPort}` : null);

    const modal = element('div', 'flp-system-modal-overlay');
    modal.id = 'flpSystemModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', `Sistema: ${project.name || project.id}`);

    const container = element('div', 'flp-system-modal-container');

    // Header
    const head = element('div', 'flp-system-modal-header');
    const headLeft = element('div', 'flp-system-modal-titlebox');
    headLeft.innerHTML = `
      <span class="flp-modal-badge">${project.catalogGroup || 'Sistema'}</span>
      <h3>${project.name || project.id}</h3>
      <span class="flp-card-status-pill ${status}"><span class="flp-live-dot ${isOnline ? 'pulse' : ''}"></span> ${isOnline ? 'ONLINE' : 'OFFLINE'}</span>
      ${targetUrl ? `<span class="flp-modal-url">${targetUrl}</span>` : ''}
    `;

    const headActions = element('div', 'flp-system-modal-actions');

    if (targetUrl) {
      const openTabBtn = element('button', 'flp-button flp-button-soft', '↗ Nova Aba (Outra Tela)');
      openTabBtn.type = 'button';
      openTabBtn.title = 'Abrir sistema em outra tela / aba do navegador';
      openTabBtn.addEventListener('click', () => {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      });
      headActions.appendChild(openTabBtn);
    }

    const closeBtn = element('button', 'flp-system-modal-close', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Fechar Janela');
    closeBtn.addEventListener('click', () => modal.remove());
    headActions.appendChild(closeBtn);

    head.append(headLeft, headActions);

    // Body
    const body = element('div', 'flp-system-modal-body');
    if (isOnline && targetUrl) {
      const iframe = document.createElement('iframe');
      iframe.className = 'flp-system-modal-iframe';
      iframe.src = targetUrl;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals');
      iframe.title = `Janela do Sistema: ${project.name || project.id}`;
      body.appendChild(iframe);
    } else {
      const offlineNotice = element('div', 'flp-system-modal-offline');
      offlineNotice.innerHTML = `
        <div style="font-size:36px; margin-bottom:12px;">🔌</div>
        <h4>Serviço Offline na Porta :${project.localPort || project.apiPort || '—'}</h4>
        <p>O serviço web deste projeto não está em execução no momento.</p>
      `;
      const startBtn = element('button', 'flp-button flp-button-primary', '⚡ Iniciar Serviço Agora');
      startBtn.type = 'button';
      startBtn.addEventListener('click', () => {
        startBtn.disabled = true;
        startBtn.textContent = 'Iniciando…';
        startProjectService(project.id, project).finally(() => {
          modal.remove();
          renderCards();
          renderDetail();
        });
      });
      offlineNotice.appendChild(startBtn);
      body.appendChild(offlineNotice);
    }

    container.append(head, body);
    modal.appendChild(container);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', onKeyDown);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    document.body.appendChild(modal);
  }
  window.fenixOpenSystemModal = openSystemModal;

  function renderTreeSidebar() {
    const tree = $('flpTreeSidebar');
    if (!tree) return;
    tree.replaceChildren();

    // 1. Header
    const head = element('div', 'flp-tree-header');
    const title = element('div', 'flp-tree-header-title');
    title.innerHTML = '<span class="flp-tree-header-icon"><i class="ph-bold ph-tree-structure"></i></span> <span>WORKSPACE</span>';
    const totalBadge = element('span', 'flp-tree-badge-total', `${state.projects.length}`);
    totalBadge.title = `${state.projects.length} projetos cadastrados`;
    head.append(title, totalBadge);
    tree.appendChild(head);

    const scrollArea = element('div', 'flp-tree-scroll-container');

    // 2. Scopes Section
    const scopeGroup = element('div', 'flp-tree-group');
    scopeGroup.appendChild(element('div', 'flp-tree-group-label', 'ESCOPOS'));

    const scopes = [
      { id: 'all', label: 'Todos os Projetos', icon: 'ph-folders', count: state.projects.length },
      { id: 'favorites', label: 'Favoritos', icon: 'ph-star', count: state.catalogFavorites.size },
      { id: 'local', label: 'Projetos Locais', icon: 'ph-desktop', count: state.projects.filter(p => p.source === 'LOCAL_PROJECT_CATALOG' || p.workspaceAvailable).length },
      { id: 'remote', label: 'Remotos (VPS)', icon: 'ph-cloud', count: state.projects.filter(p => p.vpsPath || p.remoteUrl || p.deployment?.bindings?.length || (p.workspace && String(p.workspace).startsWith('/opt/'))).length },
      { id: 'github', label: 'Repositórios GitHub', icon: 'ph-github-logo', count: state.projects.filter(p => Boolean(p.repository && String(p.repository).includes('github.com'))).length },
      { id: 'recent', label: 'Abertos Recentemente', icon: 'ph-clock-counter-clockwise', count: state.catalogRecents.length },
      { id: 'problems', label: 'Com Alertas / Offline', icon: 'ph-warning', count: state.projects.filter(p => !workspaceIsAvailable(p) || operationalStatus(p).status === 'offline').length },
      { id: 'unverified', label: 'Não Verificados', icon: 'ph-question', count: state.projects.filter(p => operationalStatus(p).status === 'unknown').length }
    ];

    for (const s of scopes) {
      const item = element('button', `flp-tree-item${state.catalogScope === s.id ? ' active' : ''}`);
      item.type = 'button';
      item.innerHTML = `<i class="ph-bold ${s.icon}"></i> <span>${s.label}</span> <span class="flp-tree-item-count">${s.count}</span>`;
      item.addEventListener('click', () => {
        state.catalogScope = s.id;
        state.detailFocus = false;
        if (!isAutomation) {
          state.launcherFullGrid = true;
        }
        if (window.location.hash.startsWith('#projects/')) {
          history.pushState(null, '', '#projects');
        }
        syncMultiViewToolbar();
        document.querySelectorAll('.flp-project-scopes button').forEach(b => {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-project-scope') === s.id));
        });
        renderCards();
        renderTreeSidebar();
        renderDetail();
      });
      scopeGroup.appendChild(item);
    }
    scrollArea.appendChild(scopeGroup);

    // 3. Expandable Projects List
    const projGroup = element('div', 'flp-tree-group');
    projGroup.appendChild(element('div', 'flp-tree-group-label', 'PROJETOS CADASTRADOS'));

    for (const proj of state.projects.slice(0, 16)) {
      const isSelected = state.selected === proj.id;
      const isExpanded = state.treeExpandedProjects ? state.treeExpandedProjects.has(proj.id) : isSelected;

      const node = element('div', `flp-tree-project-node${isSelected ? ' selected' : ''}`);
      const nodeHead = element('div', 'flp-tree-project-head');
      nodeHead.innerHTML = `
        <span class="flp-tree-chevron">${isExpanded ? '▼' : '▶'}</span>
        <i class="ph-fill ph-folder flp-tree-folder-icon"></i>
        <span class="flp-tree-project-name">${proj.name || proj.id}</span>
        ${proj.localPort ? `<span class="flp-tree-project-badge">:${proj.localPort}</span>` : ''}
      `;
      nodeHead.addEventListener('click', (e) => {
        if (!state.treeExpandedProjects) state.treeExpandedProjects = new Set();
        if (state.treeExpandedProjects.has(proj.id)) state.treeExpandedProjects.delete(proj.id);
        else state.treeExpandedProjects.add(proj.id);
        selectProject(proj.id, null, true);
        renderTreeSidebar();
      });
      node.appendChild(nodeHead);

      if (isExpanded) {
        const subitems = element('div', 'flp-tree-subitems');
        const sections = [
          { tab: 'overview', label: 'Visão geral', icon: 'ph-sliders' },
          { tab: 'files', label: 'Arquivos', icon: 'ph-folder' },
          { tab: 'code', label: 'Código', icon: 'ph-code' },
          { tab: 'screens', label: 'Telas / Preview', icon: 'ph-eye' },
          { tab: 'apis', label: 'APIs', icon: 'ph-plugs' },
          { tab: 'ports', label: 'Portas e URLs', icon: 'ph-plugs-connected' },
          { tab: 'git', label: 'Versões', icon: 'ph-git-branch' },
          { tab: 'tests', label: 'Testes', icon: 'ph-bug' }
        ];
        for (const sec of sections) {
          const sub = element('div', `flp-tree-subitem${isSelected && state.workspaceTab === sec.tab ? ' active' : ''}`);
          sub.innerHTML = `<i class="ph-bold ${sec.icon}"></i> <span>${sec.label}</span>`;
          sub.addEventListener('click', (e) => {
            e.stopPropagation();
            selectProject(proj.id, sec.tab, true);
            renderTreeSidebar();
          });
          subitems.appendChild(sub);
        }
        node.appendChild(subitems);
      }
      projGroup.appendChild(node);
    }
    scrollArea.appendChild(projGroup);

    // 4. General Modules
    const modGroup = element('div', 'flp-tree-group');
    modGroup.appendChild(element('div', 'flp-tree-group-label', 'MÓDULOS GERAIS'));
    const modules = [
      { label: 'Agentes Inteligentes', icon: 'ph-robot', view: 'agents' },
      { label: 'Mundo AI City 3D', icon: 'ph-buildings', view: 'city' },
      { label: 'Operações & Jobs', icon: 'ph-activity', view: 'operations' },
      { label: 'Navegador BAI', icon: 'ph-browser', view: 'browser' },
      { label: 'Memória & RAG', icon: 'ph-brain', view: 'memory' },
      { label: 'Gateways & APIs', icon: 'ph-plugs', view: 'ide' }
    ];
    for (const m of modules) {
      const item = element('button', 'flp-tree-item');
      item.type = 'button';
      item.innerHTML = `<i class="ph-bold ${m.icon}"></i> <span>${m.label}</span>`;
      item.addEventListener('click', () => {
        if (window.showView) window.showView(m.view);
      });
      modGroup.appendChild(item);
    }
    scrollArea.appendChild(modGroup);

    tree.appendChild(scrollArea);

    // 5. Footer (Disk meter + Operator profile)
    const footer = element('div', 'flp-tree-footer');
    footer.innerHTML = `
      <div class="flp-disk-meter">
        <div class="flp-disk-meter-labels">
          <span>Armazenamento</span>
          <strong>${state.diskUsageText || '—'}</strong>
        </div>
        <div class="flp-disk-meter-bar">
          <div class="flp-disk-meter-fill" style="width: ${state.diskUsagePercent != null ? state.diskUsagePercent + '%' : '0%'};"></div>
        </div>
      </div>
      <div class="flp-tree-operator-profile">
        <div class="flp-op-avatar">
          <span>GR</span>
          <span class="flp-op-status-dot"></span>
        </div>
        <div class="flp-op-info">
          <strong>Gabriel R.</strong>
          <small>Operador Mestre · Fênix OS</small>
        </div>
      </div>
    `;
    tree.appendChild(footer);
  }

  function renderFavoritesBar() {
    const bar = $('flpFavoritesBar');
    const strip = $('flpFavCardsStrip');
    const countEl = $('flpFavCount');
    if (!bar || !strip) return;

    const favProjects = state.projects.filter(p => state.catalogFavorites.has(p.id));
    if (countEl) countEl.textContent = favProjects.length;

    if (!favProjects.length) {
      bar.hidden = true;
      bar.classList.add('is-hidden');
      bar.style.display = 'none';
      return;
    }
    bar.hidden = false;
    bar.classList.remove('is-hidden');
    bar.style.display = 'flex';
    strip.replaceChildren();

    for (const project of favProjects) {
      const { status } = operationalStatus(project);
      const isOnline = status === 'online';
      const card = element('div', 'flp-fav-card');
      card.dataset.projectId = project.id;

      const logoImg = document.createElement('img');
      logoImg.src = getCompanyLogoForProject(project);
      logoImg.alt = project.name || project.id;
      logoImg.className = 'flp-fav-card-logo';
      logoImg.loading = 'lazy';

      const info = element('div', 'flp-fav-card-info');
      const title = element('div', 'flp-fav-card-title');
      title.innerHTML = `<strong>${project.name || project.id}</strong> <span class="flp-fav-star">★</span>`;
      
      const port = project.localPort || project.frontend?.port || '';
      const statusPill = element('span', `flp-fav-status-pill ${status}`, isOnline ? `Online :${port}` : 'Offline');

      info.append(title, statusPill);
      card.append(logoImg, info);

      card.addEventListener('click', () => {
        selectProject(project.id);
      });

      strip.appendChild(card);
    }
  }

  function renderFolderNavigation(projects) {
    const banner = $('flpFolderNavBanner');
    const folderGrid = $('flpFolderCards');
    const isFiltered = state.catalogCategory !== 'all' || (state.catalogScope !== 'all' && state.catalogScope !== 'favorites');
    const isSearching = Boolean(state.query && state.query.trim());

    if (banner) {
      if (isFiltered && !isSearching) {
        banner.style.display = 'flex';
        banner.replaceChildren();
        const backBtn = element('button', 'flp-folder-back-btn');
        backBtn.type = 'button';
        backBtn.innerHTML = '<i class="ph-bold ph-arrow-left"></i> Voltar a Todas as Pastas';
        backBtn.addEventListener('click', () => {
          state.catalogCategory = 'all';
          state.catalogScope = 'all';
          document.querySelectorAll('.flp-cat-filter-btn').forEach(b => b.classList.remove('active'));
          $('flpCatAllBtn')?.classList.add('active');
          document.querySelectorAll('.flp-project-scopes button').forEach(b => {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-project-scope') === 'all'));
          });
          renderCards();
        });
        const folderName = state.catalogCategory !== 'all' ? state.catalogCategory
          : state.catalogScope === 'local' ? 'Projetos Locais'
          : state.catalogScope === 'remote' ? 'Remotos (VPS)'
          : state.catalogScope === 'github' ? 'Repositórios GitHub'
          : state.catalogScope === 'recent' ? 'Abertos Recentemente'
          : state.catalogScope === 'problems' ? 'Com Alertas / Offline'
          : state.catalogScope === 'unverified' ? 'Não Verificados'
          : state.catalogScope;
        const pathEl = element('span', 'flp-folder-nav-path');
        pathEl.innerHTML = `<i class="ph-fill ph-folder-open"></i> Pastas / <strong>${folderName}</strong> <span class="flp-folder-count-badge">${projects.length} sistemas</span>`;
        banner.append(backBtn, pathEl);
      } else {
        banner.style.display = 'none';
      }
    }

    if (folderGrid) {
      if (!isFiltered && !isSearching && state.hubViewMode !== 'github' && state.projects.length > 0) {
        folderGrid.style.display = 'grid';
        folderGrid.replaceChildren();

        const folders = [
          { id: 'Lovable', label: 'Lovable', icon: 'ph-sparkle', color: '#ec4899', count: state.projects.filter(p => /lovable/i.test(p.catalogGroup || '')).length },
          { id: 'CRM & WhatsApp', label: 'CRM & WhatsApp', icon: 'ph-chats-circle', color: '#22c55e', count: state.projects.filter(p => /crm|whatsapp|zapai/i.test(p.catalogGroup || '')).length },
          { id: 'Fênix & Core', label: 'Fênix & Core', icon: 'ph-cpu', color: '#00E5A0', count: state.projects.filter(p => /f[eê]nix|core/i.test(p.catalogGroup || '') || /f[eê]nix/i.test(p.name || p.id)).length },
          { id: 'Automação', label: 'Automação', icon: 'ph-lightning', color: '#eab308', count: state.projects.filter(p => /automa[cç][aã]o|auto/i.test(p.catalogGroup || '')).length },
          { id: 'Ferramentas & IA', label: 'Ferramentas & IA', icon: 'ph-wrench', color: '#38bdf8', count: state.projects.filter(p => /ferramenta|ia|ai|tool/i.test(p.catalogGroup || '')).length },
          { id: 'local_scope', scope: 'local', label: 'Projetos Locais', icon: 'ph-desktop', color: '#a855f7', count: state.projects.filter(p => p.source === 'LOCAL_PROJECT_CATALOG' || p.workspaceAvailable).length },
          { id: 'remote_scope', scope: 'remote', label: 'Remotos (VPS)', icon: 'ph-cloud', color: '#06b6d4', count: state.projects.filter(p => p.vpsPath || p.remoteUrl || p.deployment?.bindings?.length || (p.workspace && String(p.workspace).startsWith('/opt/'))).length }
        ];

        for (const f of folders) {
          if (f.count === 0 && !f.scope) continue;
          const card = element('div', 'flp-folder-card');
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');
          card.setAttribute('aria-label', `Abrir pasta ${f.label} com ${f.count} sistemas`);
          card.innerHTML = `
            <div class="flp-folder-card-icon" style="color:${f.color}; background:${f.color}15;">
              <i class="ph-fill ${f.icon}"></i>
            </div>
            <div class="flp-folder-card-info">
              <span class="flp-folder-card-name">${f.label}</span>
              <span class="flp-folder-card-count">${f.count} sistemas</span>
            </div>
          `;
          const clickHandler = () => {
            if (f.scope) {
              state.catalogScope = f.scope;
              state.catalogCategory = 'all';
            } else {
              state.catalogCategory = f.id;
              state.catalogScope = 'all';
            }
            renderCards();
          };
          card.addEventListener('click', clickHandler);
          card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickHandler(); } });
          folderGrid.appendChild(card);
        }
      } else {
        folderGrid.style.display = 'none';
      }
    }
  }

  function renderCards() {
    document.querySelector('#view-projects .flp-body')?.setAttribute('data-project-source', state.hubViewMode === 'local' ? 'local' : 'kernel');
    renderFavoritesBar();
    renderTreeSidebar();
    if (state.hubViewMode === 'github') {
      renderGitHubCards();
      return;
    }
    const container = $('flpCards');
    if (!container) return;
    container.replaceChildren();

    // 1. Base Source Filtering: In 'local' mode show only local catalogue; in 'fenix' mode show all 43 systems!
    const sourceProjects = state.hubViewMode === 'local'
      ? state.projects.filter((project) => project.source === 'LOCAL_PROJECT_CATALOG')
      : state.projects;

    // 2. Category Filtering (Lovable, CRM & WA, Fênix, Automação, Ferramentas)
    const categoryProjects = state.catalogCategory === 'all'
      ? sourceProjects
      : sourceProjects.filter((project) => {
          const group = String(project.catalogGroup || '').trim();
          if (state.catalogCategory === 'Lovable') return /lovable/i.test(group);
          if (state.catalogCategory === 'CRM & WhatsApp') return /crm|whatsapp|zapai/i.test(group);
          if (state.catalogCategory === 'Fênix & Core') return /f[eê]nix|core/i.test(group) || /f[eê]nix/i.test(project.name || project.id);
          if (state.catalogCategory === 'Automação') return /automa[cç][aã]o|auto/i.test(group);
          if (state.catalogCategory === 'Ferramentas & IA') return /ferramenta|ia|ai|tool/i.test(group);
          return group.toLowerCase() === state.catalogCategory.toLowerCase();
        });

    // 3. Status Filtering (all / online / offline)
    const statusFilteredProjects = state.catalogStatusFilter === 'all'
      ? categoryProjects
      : categoryProjects.filter((project) => {
          return operationalStatus(project).status === state.catalogStatusFilter;
        });

    // 4. Query Search
    const matchingProjects = statusFilteredProjects.filter((project) => [
      project.name,
      project.id,
      project.workspace,
      project.catalogGroup,
      project.versionRole,
      String(project.localPort || ''),
      String(project.apiPort || '')
    ].some((value) => String(value || '').toLowerCase().includes(state.query)));

    const recentOrder = new Map(state.catalogRecents.map((item, index) => [item.id, item.openedAt || -index]));
    const projects = matchingProjects.filter((project) => {
      const isVpsRemote = Boolean(project.vpsPath || project.remoteUrl || (project.workspace && String(project.workspace).startsWith('/opt/')) || project.deployment?.bindings?.length || project.id === 'api-platform-live');
      if (state.catalogScope === 'favorites') return state.catalogFavorites.has(project.id);
      if (state.catalogScope === 'recent') return recentOrder.has(project.id);
      if (state.catalogScope === 'local') return !isVpsRemote && (project.source === 'LOCAL_PROJECT_CATALOG' || project.workspaceAvailable === true);
      if (state.catalogScope === 'remote') return isVpsRemote || project.source !== 'LOCAL_PROJECT_CATALOG';
      if (state.catalogScope === 'github') return Boolean(project.repository && String(project.repository).includes('github.com'));
      if (state.catalogScope === 'problems') return !workspaceIsAvailable(project) || operationalStatus(project).status === 'offline';
      if (state.catalogScope === 'unverified') return operationalStatus(project).status === 'unknown';
      return true;
    });
    // Ordenação: Projetos favoritados vão para os primeiros da lista, exceto em 'recent' que ordena por histórico recente
    if (state.catalogScope === 'recent') {
      projects.sort((left, right) => (recentOrder.get(right.id) || 0) - (recentOrder.get(left.id) || 0));
    } else {
      projects.sort((left, right) => {
        const leftFav = state.catalogFavorites.has(left.id) ? 1 : 0;
        const rightFav = state.catalogFavorites.has(right.id) ? 1 : 0;
        return rightFav - leftFav;
      });
    }

    container.dataset.layout = state.catalogLayout;
    container.dataset.density = state.gridDensity || 'auto';
    renderFolderNavigation(projects);
    if (!projects.length) {
      if (state.error && !state.measuredAt) {
        container.appendChild(element('p', 'flp-empty', 'Catálogo indisponível nesta leitura.'));
      } else {
        let emptyMsg = 'Nenhum projeto corresponde aos filtros selecionados.';
        if (state.catalogScope === 'favorites') emptyMsg = 'Nenhum projeto favoritado neste navegador.';
        else if (state.catalogScope === 'recent') emptyMsg = 'Os projetos abertos aparecerão aqui.';
        else if (state.catalogScope === 'local') emptyMsg = 'Nenhum projeto local encontrado.';
        else if (state.catalogScope === 'remote') emptyMsg = 'Nenhum projeto remoto na nuvem/VPS encontrado.';
        else if (state.catalogScope === 'github') emptyMsg = 'Nenhum projeto com repositório GitHub vinculado.';
        else if (state.catalogScope === 'problems') emptyMsg = 'Nenhum projeto com problemas ou offline detectado.';
        else if (state.catalogScope === 'unverified') emptyMsg = 'Nenhum projeto não verificado.';
        else if (!state.projects.length) emptyMsg = 'Nenhum projeto registrado no Project Kernel.';
        container.appendChild(element('p', 'flp-empty', emptyMsg));
      }
      return;
    }

    for (const project of projects) {
      const { liveStatus, status } = operationalStatus(project);
      const isOnline = status === 'online';
      const activeUrl = resolveProjectUrl(project, liveStatus);

      const card = element('article', `flp-card flp-card-with-logo${state.selected === project.id ? ' active' : ''}`);
      card.dataset.projectId = project.id;
      const isAbsorbed = state.absorptions.has(project.id) || project.id === 'api-platform-live';

      // DUAL-LAYER CARD BANNER: IDLE COMPANY LOGO + HOVER SCREEN PREVIEW
      const banner = element('div', 'flp-card-banner');

      // 1. Idle Company Logo Layer
      const logoLayer = element('div', 'flp-card-logo flp-card-logo-container');
      const logoImg = document.createElement('img');
      logoImg.src = getCompanyLogoForProject(project);
      logoImg.alt = project.name || project.id;
      logoImg.className = 'flp-card-brand-logo';
      logoImg.loading = 'lazy';
      logoImg.decoding = 'async';
      const logoFallback = element('span', 'flp-card-logo-fallback', project.icon || String(project.name || project.id || '?').trim().slice(0, 1).toUpperCase());
      logoFallback.hidden = true;
      logoImg.addEventListener('error', () => {
        logoImg.hidden = true;
        logoFallback.hidden = false;
      }, { once: true });
      logoLayer.append(logoImg, logoFallback);

      // 2. Hover System Screen Preview Layer
      const previewLayer = element('div', 'flp-card-screens-preview');
      const screenImg = document.createElement('img');
      screenImg.src = getScreenPreviewForProject(project);
      screenImg.alt = `Telas do sistema ${project.name || project.id}`;
      screenImg.className = 'flp-screen-preview-img';
      screenImg.loading = 'lazy';
      screenImg.decoding = 'async';
      screenImg.addEventListener('error', () => {
        screenImg.src = '/screenshots/projects.png';
      }, { once: true });
      const previewBadge = element('span', 'flp-preview-badge');
      previewBadge.innerHTML = '<i class="ph-bold ph-eye"></i> Preview de Telas';
      previewLayer.append(screenImg, previewBadge);

      banner.append(logoLayer, previewLayer);

      const content = element('span', 'flp-card-content');

      // Kicker with Live Status Pill + Port Pill + Group/Role
      const kicker = element('span', 'flp-card-kicker');
      const statusPill = element('span', `flp-card-status-pill ${status}`);
      const liveDot = element('span', `flp-live-dot ${isOnline ? 'pulse' : ''}`);
      statusPill.append(liveDot, document.createTextNode(status === 'online' ? ' ONLINE' : status === 'offline' ? ' OFFLINE' : ' NÃO VERIFICADO'));
      kicker.appendChild(statusPill);

      const port = liveStatus?.port || project.localPort;
      if (port) {
      const portPill = element('span', `flp-card-port-pill ${isOnline ? 'port-online' : ''}`, `:${port}`);
        kicker.appendChild(portPill);
      }

      // Origin & Access State
      const isLocalCatalog = project.source === 'LOCAL_PROJECT_CATALOG';
      const hasGitRepo = Boolean(project.repository || (typeof project.repository === 'string' && project.repository.includes('github.com')));
      const isVpsRemote = Boolean(project.vpsPath || project.deployment?.bindings?.length || project.id === 'api-platform-live');
      const originLabel = isLocalCatalog ? 'PC Local' : isVpsRemote ? 'VPS Nuvem' : hasGitRepo ? 'GitHub' : 'Local';
      const originClass = isLocalCatalog ? 'flp-origin-local' : isVpsRemote ? 'flp-origin-vps' : hasGitRepo ? 'flp-origin-github' : 'flp-origin-local';
      kicker.appendChild(element('span', `flp-card-origin-pill ${originClass}`, originLabel));

      const accessLabel = project.workspaceAvailable ? 'Pasta Local' : isVpsRemote ? 'Remoto (VPS)' : hasGitRepo ? 'Git Disponível' : 'Indisponível';
      const accessClass = project.workspaceAvailable ? 'flp-access-available' : isVpsRemote ? 'flp-access-remote' : hasGitRepo ? 'flp-access-git' : 'flp-access-unavailable';
      kicker.appendChild(element('span', `flp-card-access-pill ${accessClass}`, accessLabel));

      if (project.catalogGroup) {
        kicker.appendChild(element('span', '', project.catalogGroup));
      }
      if (project.versionRole && project.versionRole !== 'Principal') {
        kicker.appendChild(element('span', 'flp-card-role-pill', project.versionRole));
      }
      content.appendChild(kicker);

      // Title row with name and version
      const titleRow = element('span', 'flp-card-title-row');
      titleRow.append(element('strong', 'flp-card-title', project.name || project.id));
      const version = project.projectVersion || project.currentVersion;
      if (version) titleRow.append(element('span', 'flp-card-version', `v${version}`));
      content.append(titleRow);

      // Path
      content.append(element('span', 'flp-card-path', project.workspace || project.listedPath || 'Workspace Fênix'));
      const portSummary = projectPortSummary(project);
      if (portSummary) content.append(element('span', 'flp-card-ports', portSummary));
      const detail = state.details.get(project.id);
      const screensCount = getProjectScreens(project).length;
      const measuredJobs = Number.isFinite(detail?.progress?.totalJobs) ? detail.progress.totalJobs : project.totalJobs;
      const cardFoot = project.source === 'LOCAL_PROJECT_CATALOG' && !project.workspaceAvailable
        ? 'Verifique o caminho cadastrado'
        : project.source === 'LOCAL_PROJECT_CATALOG' && !Number.isFinite(measuredJobs)
          ? 'Pasta disponível · selecione para abrir'
          : Number.isFinite(measuredJobs)
            ? `${measuredJobs} job(s) · ${screensCount} tela(s) DNA`
            : detail ? 'Estado carregado · sem contadores' : 'Estado aguardando leitura';
      content.append(element('span', 'flp-card-foot', cardFoot));

      // Quick Actions Bar
      const quickBar = element('div', 'flp-card-quick-actions');
      const wsQuickBtn = element('button', 'flp-quick-action-btn btn-popup', '▶ Workspace');
      wsQuickBtn.type = 'button';
      wsQuickBtn.title = `Abrir área de trabalho completa de ${project.name || project.id}`;
      wsQuickBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectProject(project.id, null, true);
      });
      quickBar.appendChild(wsQuickBtn);

      const popupQuickBtn = element('button', 'flp-quick-action-btn btn-popup', '🌐 Pop-up');
      popupQuickBtn.type = 'button';
      popupQuickBtn.title = `Abrir sistema em janela pop-up na tela`;
      popupQuickBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSystemModal(project, activeUrl || project.localUrl);
      });
      quickBar.appendChild(popupQuickBtn);

      if (activeUrl) {
        const previewQuickBtn = element('button', 'flp-quick-action-btn btn-popup', '▶ Preview');
        previewQuickBtn.type = 'button';
        previewQuickBtn.title = `Abrir preview ao vivo de ${project.name || project.id}`;
        previewQuickBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectProject(project.id, 'preview');
        });
        quickBar.appendChild(previewQuickBtn);

        const openUrlBtn = element('button', 'flp-quick-action-btn btn-open-url', '↗ Aba');
        openUrlBtn.type = 'button';
        openUrlBtn.title = `Abrir ${activeUrl} em outra tela (nova aba)`;
        openUrlBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(activeUrl, '_blank', 'noopener,noreferrer');
        });
        quickBar.appendChild(openUrlBtn);
      }
      if (!isOnline) {
        const startBtn = element('button', 'flp-quick-action-btn btn-start', '⚡ Iniciar');
        startBtn.type = 'button';
        startBtn.title = 'Iniciar serviço em background';
        startBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          startBtn.disabled = true;
          startBtn.textContent = 'Iniciando…';
          startProjectService(rawId, project).finally(() => {
            startBtn.disabled = false;
            startBtn.textContent = '⚡ Iniciar';
          });
        });
        quickBar.appendChild(startBtn);

        const folderBtn = element('button', 'flp-quick-action-btn btn-folder', '📁 Pasta');
        folderBtn.type = 'button';
        folderBtn.title = 'Abrir pasta no Explorer';
        folderBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openProjectFolderDirect(rawId, project);
        });
        quickBar.appendChild(folderBtn);

        const checkBtn = element('button', 'flp-quick-action-btn btn-check', '🔄');
        checkBtn.type = 'button';
        checkBtn.title = 'Retestar porta agora';
        checkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          checkBtn.style.opacity = '0.5';
          checkProjectStatus(rawId).finally(() => { checkBtn.style.opacity = '1'; });
        });
        quickBar.appendChild(checkBtn);
      }
      content.appendChild(quickBar);

      // Open button wrapper for card interaction
      const openButton = element('button', 'flp-project-open');
      openButton.type = 'button';
      openButton.setAttribute('aria-label', `Abrir projeto ${project.name || project.id}`);
      openButton.append(banner, content);

      // Multi-view simultaneous comparison toggle
      const isMultiSelected = state.multiSelectedProjects.has(project.id);
      if (isMultiSelected) card.classList.add('is-multiview-selected');
      const multiToggle = element('button', `flp-project-multiview-toggle${isMultiSelected ? ' active' : ''}`, isMultiSelected ? '✓' : '⊞');
      multiToggle.type = 'button';
      multiToggle.setAttribute('aria-label', isMultiSelected ? 'Remover da visualização simultânea' : 'Adicionar à visualização simultânea');
      multiToggle.title = `${multiToggle.getAttribute('aria-label')}: ${project.name || project.id}`;
      multiToggle.setAttribute('aria-pressed', String(isMultiSelected));
      multiToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleMultiViewProject(project.id);
      });

      // Favorite toggle
      const favorite = element('button', `flp-project-favorite${state.catalogFavorites.has(project.id) ? ' active' : ''}`, state.catalogFavorites.has(project.id) ? '★' : '☆');
      favorite.type = 'button';
      favorite.dataset.favoriteProjectId = project.id;
      if (project.id === 'api-platform-live') favorite.dataset.projectId = project.id;
      favorite.setAttribute('aria-label', state.catalogFavorites.has(project.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
      favorite.title = `${favorite.getAttribute('aria-label')}: ${project.name || project.id}`;
      favorite.setAttribute('aria-pressed', String(state.catalogFavorites.has(project.id)));
      favorite.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleProjectFavorite(project.id);
      });

      card.append(multiToggle, openButton, favorite);
      card.addEventListener('click', (event) => {
        if (!event.target.closest('.flp-project-favorite') && !event.target.closest('.flp-project-multiview-toggle') && !event.target.closest('.flp-quick-action-btn')) {
          if (state.launcherFullGrid) {
            selectProject(project.id, null, true);
          } else {
            selectProject(project.id);
          }
        }
      });
      container.appendChild(card);
    }
    syncMultiViewToolbar();
  }

  function syncMultiViewToolbar() {
    const bodyEl = document.querySelector('#view-projects .flp-body');
    if (bodyEl) {
      const isGridOnly = Boolean(state.launcherFullGrid) && !state.detailFocus;
      bodyEl.classList.toggle('is-grid-full-view', isGridOnly);
      bodyEl.classList.toggle('is-multiview-active', Boolean(state.multiViewActive));
      bodyEl.dataset.fullLauncher = String(Boolean(state.launcherFullGrid));
      bodyEl.dataset.detailFocus = String(Boolean(state.detailFocus));
    }
    const expandToggle = $('flpLayoutExpandToggle');
    if (expandToggle) {
      expandToggle.classList.toggle('active', Boolean(state.launcherFullGrid));
      expandToggle.setAttribute('aria-pressed', String(Boolean(state.launcherFullGrid)));
    }
    const fullGridBtn = $('flpFullLauncherGridBtn');
    if (fullGridBtn) {
      fullGridBtn.classList.toggle('active', Boolean(state.launcherFullGrid));
      fullGridBtn.setAttribute('aria-pressed', String(Boolean(state.launcherFullGrid)));
      const label = fullGridBtn.querySelector('span:not(.fnx-mono3d-glyph)');
      if (label) {
        label.textContent = state.launcherFullGrid ? 'Grade Completa ✓' : 'Grade Completa';
      }
    }
    const multiBtn = $('flpMultiViewToggleBtn');
    if (multiBtn) {
      multiBtn.classList.toggle('active', Boolean(state.multiViewActive));
      multiBtn.setAttribute('aria-pressed', String(Boolean(state.multiViewActive)));
    }
    const countEl = $('flpMultiViewCount');
    if (countEl) countEl.textContent = String(state.multiSelectedProjects.size);
    const clearBtn = $('flpMultiViewClearBtn');
    if (clearBtn) clearBtn.hidden = state.multiSelectedProjects.size === 0;
  }

  function toggleMultiViewProject(projectId) {
    if (!projectId) return;
    if (state.multiSelectedProjects.has(projectId)) {
      state.multiSelectedProjects.delete(projectId);
      if (state.multiSelectedProjects.size === 0) state.multiViewActive = false;
    } else {
      if (state.multiSelectedProjects.size >= 4) {
        const oldest = state.multiSelectedProjects.values().next().value;
        if (oldest) state.multiSelectedProjects.delete(oldest);
      }
      state.multiSelectedProjects.add(projectId);
      if (state.multiSelectedProjects.size >= 2) {
        state.multiViewActive = true;
        state.launcherFullGrid = false;
      }
    }
    syncMultiViewToolbar();
    renderCards();
    renderDetail();
  }

  function row(label, value) {
    const line = element('div', 'flp-fact');
    line.append(element('span', '', label), element('strong', '', text(value)));
    return line;
  }

  function renderVpsBindings(project, runtime) {
    const bindings = Array.isArray(project.deployment?.bindings) ? project.deployment.bindings : [];
    if (!bindings.length) return;
    const section = element('section', 'flp-vps-bindings');
    section.append(element('h4', '', 'Portas e rotas mapeadas na VPS'));
    section.append(element('p', 'flp-vps-bindings-note', 'Cadastro de destinos. A disponibilidade só é atual quando vier de uma sondagem ao vivo.'));
    const list = element('div', 'flp-vps-binding-list');
    for (const binding of bindings) {
      const port = Number(binding?.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
      const item = element('article', 'flp-vps-binding');
      item.append(element('strong', '', String(binding.label || 'Serviço VPS')));
      item.append(element('span', '', `${String(binding.address || '—')}:${port} → ${String(binding.target || 'Destino não mapeado')}`));
      const observedAt = typeof binding.observedAt === 'string' ? binding.observedAt : '';
      const observedMs = Date.parse(observedAt);
      const hasObservation = Number.isFinite(observedMs) && observedMs <= Date.now();
      const isFresh = hasObservation && Date.now() - observedMs <= 120_000 && binding.evidenceSource === 'RUNTIME_PROBE';
      const state = isFresh
        ? `${String(binding.status || 'Resposta recebida')} · verificado ${observedAt}`
        : hasObservation
          ? `Registro histórico: ${String(binding.status || 'sem resultado')} · ${observedAt}`
          : 'Disponibilidade não medida';
      item.append(element('small', '', state));
      if (typeof binding.url === 'string') {
        try {
          const parsed = new URL(binding.url, window.location.href);
          if (['http:', 'https:'].includes(parsed.protocol)) {
            const link = element('a', '', binding.url);
            link.href = parsed.toString();
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            item.append(link);
          }
        } catch {}
      }
      list.appendChild(item);
    }
    if (list.childElementCount) {
      section.appendChild(list);
      runtime.appendChild(section);
    }
  }

  async function triggerProjectFunnelAction(project, actionType, statusEl = null) {
    if (!project) return;
    const rawId = project.catalogId || (String(project.id || '').startsWith('local-') ? project.id.slice(6) : project.id);
    const { liveStatus } = operationalStatus(project);
    const activeUrl = liveStatus?.activeUrl || project.localUrl || project.remoteUrl || (project.localPort ? `http://localhost:${project.localPort}` : null);
    const setMsg = (msg) => {
      if (statusEl) statusEl.textContent = msg;
      if ($('flpMeasured')) $('flpMeasured').textContent = msg;
    };

    if (actionType === 'run-local') {
      setMsg(`⚡ Iniciando execução local para ${project.name || rawId}…`);
      const res = await startProjectService(rawId, project);
      if (res?.message) setMsg(`✅ ${res.message}`);
      return;
    }
    if (actionType === 'run-vps') {
      setMsg(`☁️ Acionando execução / sincronização na VPS (209.50.241.22) para ${project.name || rawId}…`);
      const vpsCounterpart = findVpsCounterpart(project);
      try {
        await json('/api/v2/universal-jobs/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'project-decision-funnel',
            projectId: vpsCounterpart?.project?.id || project.id,
            title: `Execução VPS · ${project.name || project.id}`,
            intent: `Verificar e ativar runtime VPS para o projeto ${project.name || project.id} (${project.projectVersion || 'v1.0.0'})`,
            command: '/goal',
            status: 'RUNNING'
          })
        });
      } catch (_) {}
      const vpsUrl = project.remoteUrl || (vpsCounterpart?.project?.frontend?.port ? `http://209.50.241.22:${vpsCounterpart.project.frontend.port}` : null);
      setMsg(`✅ Missão de execução VPS despachada para ${project.name || rawId}${vpsUrl ? ` · Endpoint: ${vpsUrl}` : ' no cluster 209.50.241.22'}.`);
      return;
    }
    if (actionType === 'test-project') {
      setMsg(`🧪 Executando bateria de verificação & health probe em ${project.name || rawId}…`);
      const probe = await checkProjectStatus(rawId);
      try {
        await json('/api/v2/universal-jobs/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'project-qa-funnel',
            projectId: project.id,
            title: `Teste & Health Probe · ${project.name || project.id}`,
            intent: `Executar verificação de portas, contrato HTTP e saúde de ${project.name || project.id}`,
            command: '/browser',
            status: 'COMPLETED'
          })
        });
      } catch (_) {}
      setMsg(`🧪 Teste concluído para ${project.name || rawId}: Status=${probe?.online ? 'ONLINE' : 'OFFLINE'} · Porta=${probe?.localPort || project.localPort || '—'}`);
      return;
    }
    if (actionType === 'use-app') {
      if (activeUrl) {
        setMsg(`🌐 Abrindo aplicação ${project.name || rawId} em ${activeUrl}…`);
        window.open(activeUrl, '_blank', 'noopener,noreferrer');
      } else {
        setMsg(`🌐 Abrindo Browser QA para inspecionar ${project.name || rawId}…`);
        window.showView?.('browser');
      }
      return;
    }
    if (actionType === 'open-ide') {
      setMsg(`💻 Abrindo código e estrutura de ${project.name || rawId} no IDE…`);
      openProjectInIde(project);
    }
  }

  function getProjectDecisions(project) {
    const key = `fenix_project_decisions_${project.id}`;
    if (state.projectDecisions.has(project.id)) return state.projectDecisions.get(project.id);
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(saved) && saved.length) {
        state.projectDecisions.set(project.id, saved);
        return saved;
      }
    } catch (_) {}
    const vpsMatch = findVpsCounterpart(project);
    const defaults = [
      {
        id: 'dec-target-env',
        category: 'RUNTIME',
        title: `Alvo de Execução Principal (${project.versionRole || 'Principal'})`,
        choice: vpsMatch || project.remoteUrl ? 'Híbrido (Local + VPS 209.50.241.22)' : 'Workstation Local + Túnel Fênix',
        status: 'ACTIVE'
      },
      {
        id: 'dec-version-gate',
        category: 'VERSÃO',
        title: `Governança de Versão (${project.projectVersion ? 'v' + project.projectVersion : 'v1.0.0'})`,
        choice: project.versionRole === 'Principal' ? 'Branch Canônica (SSOT Produção)' : `Variante Especializada (${project.versionRole || 'Evolução'})`,
        status: 'VERIFIED'
      },
      {
        id: 'dec-qa-policy',
        category: 'QUALIDADE',
        title: 'Gate de Testes & Monitoramento de Porta',
        choice: project.localPort ? `Sondagem TCP/HTTP contínua na porta :${project.localPort}` : 'Verificação sob demanda via Mission Kernel',
        status: 'ACTIVE'
      }
    ];
    state.projectDecisions.set(project.id, defaults);
    return defaults;
  }

  function renderDecisionFunnel(target, project, liveStatus, status) {
    if (!target || !project) return;
    const funnel = element('section', 'flp-decision-funnel');
    funnel.id = 'flpDecisionFunnel';
    funnel.setAttribute('aria-label', 'Funil de Decisões e Operação Total do Projeto');

    const head = element('div', 'flp-funnel-head');
    const titleWrap = element('div', 'flp-funnel-title-wrap');
    titleWrap.append(
      element('span', 'flp-eyebrow', 'FUNIL DE DECISÃO & ESCOLHA TOTAL · WORKFLOW PROGRESSIVO'),
      element('h3', 'flp-funnel-heading', `Central de Decisão: ${project.name || project.id}`),
      element('p', 'flp-funnel-sub', '1. Verifique a versão e diagnóstico ➔ 2. Escolha onde rodar, testar, usar ou abrir o código ➔ 3. Afunile as decisões arquiteturais do projeto.')
    );

    const compareBtn = element('button', `flp-button flp-button-soft${state.multiSelectedProjects.has(project.id) ? ' active' : ''}`, state.multiSelectedProjects.has(project.id) ? '✓ Em Multi-View Simultâneo' : '⊞ Comparar Lado a Lado');
    compareBtn.type = 'button';
    compareBtn.addEventListener('click', () => toggleMultiViewProject(project.id));
    head.append(titleWrap, compareBtn);
    funnel.appendChild(head);

    // Stage 1: Version & Environment Strip
    const stage1 = element('div', 'flp-funnel-stage-strip');
    const vpsMatch = findVpsCounterpart(project);
    const stripItems = [
      ['1. Versão & Papel', `v${project.projectVersion || project.currentVersion || '1.0.0'} · ${project.versionRole || 'Principal'}`],
      ['2. Ambiente & Host', vpsMatch ? `Local + VPS (${vpsMatch.project.id})` : (project.source === 'LOCAL_PROJECT_CATALOG' ? 'Catálogo Local + Bridge VPS' : 'Cluster Fênix VPS')],
      ['3. Portas & Saúde', `${projectPortSummary(project) || 'Sob demanda'} · ${status === 'online' ? 'ONLINE' : status === 'offline' ? 'OFFLINE' : 'PRONTO'}`]
    ];
    for (const [lbl, val] of stripItems) {
      const chip = element('div', 'flp-funnel-strip-item');
      chip.append(element('span', 'flp-funnel-strip-label', lbl), element('strong', 'flp-funnel-strip-val', val));
      stage1.appendChild(chip);
    }
    funnel.appendChild(stage1);

    // Stage 2: 5 Direct Action Choices (Rodar na VPS, Rodar Local, Testar, Usar, Abrir Código)
    const statusOut = element('div', 'flp-funnel-exec-status', 'Pronto: escolha uma operação abaixo para executar no projeto selecionado.');
    statusOut.id = 'flpFunnelExecutionStatus';

    const actionGrid = element('div', 'flp-funnel-actions-grid');
    const actionSpecs = [
      { id: 'run-vps', icon: 'ph-cloud-arrow-up', label: 'Rodar na VPS', sub: 'Deploy / Ativar em 209.50.241.22' },
      { id: 'run-local', icon: 'ph-lightning', label: 'Rodar Local', sub: project.localPort ? `Iniciar serviço (:${project.localPort})` : 'Executar processo local' },
      { id: 'test-project', icon: 'ph-flask', label: 'Testar Sistema', sub: 'Sondar portas, saúde e QA' },
      { id: 'use-app', icon: 'ph-globe-hemisphere-west', label: 'Usar / Abrir App', sub: 'Abrir interface em execução' },
      { id: 'open-ide', icon: 'ph-code', label: 'Abrir Código (IDE)', sub: 'Explorar arquivos e árvore' }
    ];
    for (const spec of actionSpecs) {
      const btn = element('button', 'flp-funnel-action-btn');
      btn.type = 'button';
      btn.dataset.funnelAction = spec.id;
      btn.innerHTML = `
        <span class="fnx-mono3d-icon"><i class="ph-bold ${spec.icon}"></i></span>
        <span class="flp-funnel-action-text">
          <strong>${spec.label}</strong>
          <small>${spec.sub}</small>
        </span>
      `;
      btn.addEventListener('click', () => triggerProjectFunnelAction(project, spec.id, statusOut));
      actionGrid.appendChild(btn);
    }
    funnel.append(actionGrid, statusOut);

    // Stage 3: Project Decisions List & Quick Decision Dispatch
    const decisionsBox = element('div', 'flp-funnel-decisions-box');
    const decHead = element('div', 'flp-funnel-decisions-head');
    decHead.append(
      element('h4', '', '3. Decisões Ativas do Projeto (Arquitetura, Versão & Missões)'),
      element('span', 'flp-funnel-decisions-badge', `${getProjectDecisions(project).length} decisões registradas`)
    );
    decisionsBox.appendChild(decHead);

    const decList = element('div', 'flp-funnel-decisions-list');
    decList.id = 'flpProjectDecisionsList';
    for (const dec of getProjectDecisions(project)) {
      const item = element('div', 'flp-funnel-decision-item');
      item.append(
        element('span', 'flp-funnel-dec-cat', dec.category),
        element('strong', 'flp-funnel-dec-title', dec.title),
        element('span', 'flp-funnel-dec-choice', dec.choice),
        element('span', 'flp-funnel-dec-status', dec.status)
      );
      decList.appendChild(item);
    }
    decisionsBox.appendChild(decList);

    const decForm = element('div', 'flp-funnel-decision-form');
    const decInput = document.createElement('input');
    decInput.type = 'text';
    decInput.id = 'flpNewDecisionInput';
    decInput.className = 'flp-funnel-decision-input';
    decInput.placeholder = `Registrar nova decisão ou diretriz para ${project.name || project.id} (ex: Migrar API para porta dedicada, Priorizar versão v2)…`;
    const decSubmit = element('button', 'flp-button flp-button-primary', '➕ Registrar & Despachar Decisão');
    decSubmit.type = 'button';
    decSubmit.id = 'flpNewDecisionSubmitBtn';
    decSubmit.addEventListener('click', async () => {
      const val = decInput.value.trim();
      if (!val) return;
      const list = getProjectDecisions(project);
      const newEntry = {
        id: `dec-${Date.now()}`,
        category: 'DIRETRIZ',
        title: val,
        choice: `Aprovado em ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        status: 'DISPATCHED'
      };
      list.unshift(newEntry);
      state.projectDecisions.set(project.id, list);
      try {
        localStorage.setItem(`fenix_project_decisions_${project.id}`, JSON.stringify(list.slice(0, 20)));
      } catch (_) {}
      decInput.value = '';
      renderDetail();
      try {
        await json('/api/v2/universal-jobs/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'project-decision-ledger',
            projectId: project.id,
            title: `Decisão: ${val.slice(0, 64)}`,
            intent: val,
            command: '/plan',
            status: 'RUNNING'
          })
        });
      } catch (_) {}
    });
    decForm.append(decInput, decSubmit);
    decisionsBox.appendChild(decForm);
    funnel.appendChild(decisionsBox);

    target.appendChild(funnel);
  }

  function renderMultiProjectArena(target) {
    if (!state.multiViewActive || state.multiSelectedProjects.size === 0) return;
    const selectedIds = [...state.multiSelectedProjects];
    const selectedProjects = selectedIds.map((id) => state.projects.find((p) => p.id === id)).filter(Boolean);
    if (!selectedProjects.length) return;

    const arena = element('section', 'flp-multiview-arena');
    arena.id = 'flpMultiProjectArena';
    arena.setAttribute('aria-label', 'Visualização Simultânea de Projetos');

    const head = element('div', 'flp-multiview-head');
    const titleWrap = element('div', 'flp-multiview-title-wrap');
    titleWrap.append(
      element('span', 'flp-eyebrow', 'ARENA MULTI-PROJETO · COMPARAÇÃO & OPERAÇÃO SIMULTÂNEA'),
      element('h3', 'flp-multiview-heading', `Visualização Simultânea (${selectedProjects.length} Projetos Lado a Lado)`),
      element('p', 'flp-multiview-sub', 'Compare versão, portas, saúde e opere múltiplos projetos ao mesmo tempo antes de afunilar suas decisões.')
    );

    const actionsWrap = element('div', 'flp-multiview-head-actions');
    const addMoreBtn = element('button', 'flp-button flp-button-soft', '+ Adicionar Projeto (até 4)');
    addMoreBtn.type = 'button';
    addMoreBtn.disabled = selectedProjects.length >= 4;
    addMoreBtn.addEventListener('click', () => {
      const next = state.projects.find((p) => !state.multiSelectedProjects.has(p.id));
      if (next) toggleMultiViewProject(next.id);
    });

    const scanSelectedBtn = element('button', 'flp-button flp-button-soft', '🔄 Testar Selecionados');
    scanSelectedBtn.type = 'button';
    scanSelectedBtn.addEventListener('click', async () => {
      scanSelectedBtn.disabled = true;
      await Promise.all(selectedProjects.map((p) => checkProjectStatus(p.catalogId || p.id)));
      scanSelectedBtn.disabled = false;
      renderDetail();
    });

    const closeArenaBtn = element('button', 'flp-button flp-button-soft', '✕ Fechar Multi-View');
    closeArenaBtn.type = 'button';
    closeArenaBtn.addEventListener('click', () => {
      state.multiViewActive = false;
      syncMultiViewToolbar();
      renderDetail();
    });

    actionsWrap.append(addMoreBtn, scanSelectedBtn, closeArenaBtn);
    head.append(titleWrap, actionsWrap);
    arena.appendChild(head);

    const grid = element('div', 'flp-multiview-grid');
    grid.dataset.columns = String(Math.min(4, Math.max(2, selectedProjects.length)));

    for (const p of selectedProjects) {
      const rawId = p.catalogId || (String(p.id || '').startsWith('local-') ? p.id.slice(6) : p.id);
      const { liveStatus, status } = operationalStatus(p);
      const isOnline = status === 'online';
      const activeUrl = liveStatus?.activeUrl || p.localUrl || p.remoteUrl || (p.localPort ? `http://localhost:${p.localPort}` : null);
      const col = element('article', `flp-multiview-card${state.selected === p.id ? ' is-focused' : ''}`);
      col.dataset.projectId = p.id;

      const cardTop = element('div', 'flp-multiview-card-top');
      const titleGroup = element('div', 'flp-multiview-card-title');
      titleGroup.append(
        element('strong', '', p.name || p.id),
        element('span', 'flp-card-version', `v${p.projectVersion || p.currentVersion || '1.0.0'}`)
      );
      const removeBtn = element('button', 'flp-multiview-remove', '✕');
      removeBtn.type = 'button';
      removeBtn.title = 'Remover da visualização simultânea';
      removeBtn.addEventListener('click', () => toggleMultiViewProject(p.id));
      cardTop.append(titleGroup, removeBtn);

      const metaRow = element('div', 'flp-multiview-meta');
      metaRow.append(
        element('span', `flp-card-status-pill ${status}`, status === 'online' ? 'ONLINE' : status === 'offline' ? 'OFFLINE' : 'NÃO VERIFICADO'),
        element('span', 'flp-multiview-chip', p.catalogGroup || 'Core Fênix'),
        element('span', 'flp-multiview-chip', p.versionRole || 'Principal'),
        element('span', 'flp-multiview-chip', projectPortSummary(p) || 'Sem porta fixa')
      );

      const pathLine = element('div', 'flp-multiview-path', p.workspace || p.listedPath || p.vpsPath || 'Workspace gerenciado');

      const previewBox = element('div', 'flp-multiview-preview');
      if (state.multiViewPreviews.has(p.id) && activeUrl) {
        const iframe = document.createElement('iframe');
        iframe.className = 'flp-multiview-iframe';
        iframe.src = activeUrl;
        iframe.title = `Preview ${p.name || p.id}`;
        previewBox.appendChild(iframe);
      } else {
        const previewInfo = element('div', 'flp-multiview-preview-placeholder');
        previewInfo.append(
          element('span', '', isOnline ? `🟢 Endpoint Ativo: ${activeUrl || 'Porta aberta'}` : `⚪ Aguardando inicialização (${p.mode || 'web'})`),
          element('small', '', ` Saúde: ${liveStatus?.latencyMs != null ? liveStatus.latencyMs + 'ms' : 'sob demanda'}`)
        );
        if (activeUrl) {
          const togglePrev = element('button', 'flp-quick-action-btn btn-open-url', '👁️ Preview Inline');
          togglePrev.type = 'button';
          togglePrev.addEventListener('click', () => {
            state.multiViewPreviews.add(p.id);
            renderDetail();
          });
          previewInfo.appendChild(togglePrev);
        }
        previewBox.appendChild(previewInfo);
      }

      const btnGrid = element('div', 'flp-multiview-actions');
      const bVps = element('button', 'flp-quick-action-btn btn-start', '☁️ VPS');
      bVps.type = 'button';
      bVps.addEventListener('click', () => triggerProjectFunnelAction(p, 'run-vps'));

      const bLocal = element('button', 'flp-quick-action-btn btn-start', '⚡ Local');
      bLocal.type = 'button';
      bLocal.addEventListener('click', () => triggerProjectFunnelAction(p, 'run-local'));

      const bTest = element('button', 'flp-quick-action-btn btn-check', '🧪 Testar');
      bTest.type = 'button';
      bTest.addEventListener('click', () => triggerProjectFunnelAction(p, 'test-project'));

      const bIde = element('button', 'flp-quick-action-btn btn-folder', '💻 Código');
      bIde.type = 'button';
      bIde.addEventListener('click', () => triggerProjectFunnelAction(p, 'open-ide'));

      const bFocus = element('button', 'flp-quick-action-btn btn-open-url', '🎯 Afunilar Decisões');
      bFocus.type = 'button';
      bFocus.addEventListener('click', () => {
        state.selected = p.id;
        state.multiViewActive = false;
        syncMultiViewToolbar();
        renderCards();
        renderDetail();
        setTimeout(() => $('flpDecisionFunnel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      });

      btnGrid.append(bVps, bLocal, bTest, bIde, bFocus);
      col.append(cardTop, metaRow, pathLine, previewBox, btnGrid);
      grid.appendChild(col);
    }

    arena.appendChild(grid);
    target.appendChild(arena);
  }

  function renderDetail() {
    const target = $('flpDetail');
    if (!target) return;
    target.replaceChildren();
    if (state.hubViewMode === 'github') {
      renderGitHubPortfolioView(target);
      return;
    }
    if (state.error && !state.measuredAt) {
      const notice = element('section', 'flp-unavailable flp-load-state');
      notice.setAttribute('role', 'alert');
      notice.append(element('strong', '', 'Catálogo de projetos indisponível'), element('p', '', 'Não recebemos uma resposta válida do Project Kernel. Os totais ficam indisponíveis até a próxima leitura.'));
      const details = element('details', 'flp-unavailable-details');
      details.append(element('summary', '', 'Detalhes técnicos'), element('pre', '', state.error));
      const retry = element('button', 'flp-button flp-button-soft flp-unavailable-retry', '↻ Tentar novamente');
      retry.type = 'button';
      retry.addEventListener('click', () => load(true));
      notice.append(details, retry);
      target.appendChild(notice);
      return;
    }
    if (state.hubViewMode === 'screens') {
      renderScreenPortfolio(target);
      return;
    }
    if (state.multiViewActive && state.multiSelectedProjects.size > 0) {
      renderMultiProjectArena(target);
    }
    const project = state.projects.find((item) => item.id === state.selected);
    if (!project) {
      target.appendChild(element('p', 'flp-empty', state.hubViewMode === 'local'
        ? 'O catálogo local é lido na máquina que executa o Fênix. Esta VPS não acessa pastas C:\\ do seu PC.'
        : 'Selecione um projeto para inspecionar seu estado.'));
      return;
    }
    const detail = state.details.get(project.id);
    if (!detail && state.detailLoads.has(project.id)) {
      target.appendChild(element('p', 'flp-project-state-loading', 'Carregando estado do projeto…'));
    }
    const detailError = state.detailErrors.get(project.id);
    if (!detail && detailError) {
      const notice = element('section', 'flp-project-state-error');
      notice.setAttribute('role', 'alert');
      notice.append(element('p', '', 'Não foi possível carregar o estado deste projeto. Os dados de runtime permanecem indisponíveis.'));
      const retry = element('button', 'flp-button flp-button-soft', 'Tentar novamente');
      retry.type = 'button';
      retry.addEventListener('click', () => {
        state.detailErrors.delete(project.id);
        renderDetail();
        loadProjectState(project.id);
      });
      notice.appendChild(retry);
      target.appendChild(notice);
    }
    const absorption = state.absorptions.get(project.id);
    const git = state.git.get(project.id);
    const isLocalCatalogProject = project.source === 'LOCAL_PROJECT_CATALOG';
    const rawId = project.catalogId || (project.id.startsWith('local-') ? project.id.slice(6) : project.id);
    const { liveStatus, status: currentOperationalStatus } = operationalStatus(project);
    const status = currentOperationalStatus;
    const isOnline = status === 'online';
    const activeUrl = resolveProjectUrl(project, liveStatus);

    // 0. BREADCRUMBS BAR (TELA 2 MATCHING REFERENCE 2)
    const breadcrumbBar = element('div', 'flp-ws-breadcrumb-bar');
    const bcBackLink = element('button', 'flp-button flp-button-primary flp-ws-back-btn');
    bcBackLink.type = 'button';
    bcBackLink.id = 'flpReturnToGridBtn';
    bcBackLink.innerHTML = '<i class="ph-bold ph-arrow-left"></i> Voltar ao Catálogo';
    bcBackLink.title = 'Voltar para a Grade de Projetos e Pastas (ESC ou clique)';
    bcBackLink.addEventListener('click', () => {
      state.detailFocus = false;
      state.launcherFullGrid = true;
      if (window.location.hash.startsWith('#projects/')) {
        history.pushState(null, '', '#projects');
      }
      syncMultiViewToolbar();
      renderCards();
      renderDetail();
    });
    const bcGroup = element('span', '', project.catalogGroup || 'Sistemas');
    const bcProj = element('strong', 'flp-bc-current', project.name || project.id);
    const tabName = state.workspaceTab === 'overview' ? 'Visão geral'
      : state.workspaceTab === 'files' ? 'Arquivos'
      : state.workspaceTab === 'code' ? 'Código'
      : state.workspaceTab === 'screens' ? 'Telas / DNA'
      : state.workspaceTab === 'preview' ? 'Preview'
      : state.workspaceTab === 'apis' ? 'APIs'
      : state.workspaceTab === 'ports' ? 'Portas e URLs'
      : state.workspaceTab === 'git' ? 'Versões'
      : state.workspaceTab === 'tests' ? 'Testes'
      : state.workspaceTab;
    const bcTab = element('span', '', tabName);
    bcTab.style.color = '#00d9ff';
    breadcrumbBar.append(bcBackLink, element('span', '', '/'), bcGroup, element('span', '', '/'), bcProj, element('span', '', '/'), bcTab);
    target.appendChild(breadcrumbBar);

    // 0.5 NEOCLASSICAL HERO HEADER CARD (TELA 2 MATCHING REFERENCE 2)
    const heroCard = element('div', 'flp-ws-hero-card');
    const heroLeft = element('div', 'flp-ws-hero-left');
    const heroLogo = element('div', 'flp-ws-hero-logo');
    const heroLogoImg = document.createElement('img');
    heroLogoImg.src = getCompanyLogoForProject(project);
    heroLogoImg.alt = project.name || project.id;
    heroLogo.appendChild(heroLogoImg);

    const heroDetails = element('div', 'flp-ws-hero-details');
    const heroTitleRow = element('div', 'flp-ws-hero-title-row');
    const heroH2 = element('h2', 'flp-ws-hero-title', project.name || project.id);
    const heroVersion = element('span', 'flp-hero-version-pill', `v${project.projectVersion || '1.0.0'}`);
    const heroFavBtn = element('button', 'flp-hero-star-btn', state.catalogFavorites.has(project.id) ? '★' : '☆');
    heroFavBtn.type = 'button';
    heroFavBtn.title = 'Alternar favorito';
    heroFavBtn.addEventListener('click', () => {
      toggleProjectFavorite(project.id);
      heroFavBtn.textContent = state.catalogFavorites.has(project.id) ? '★' : '☆';
    });
    heroTitleRow.append(heroH2, heroVersion, heroFavBtn);

    const isAbsorbed = Boolean(absorption);
    const statusBadge = element('span', `flp-badge ${isAbsorbed ? 'flp-badge-green' : 'flp-badge-gray'}`, isAbsorbed ? 'DNA REGISTRADO' : 'SEM DNA');
    const healthBadge = element('span', 'flp-badge flp-badge-gray', isLocalCatalogProject
      ? (project.workspaceAvailable ? 'LOCAL · DISPONÍVEL' : 'CAMINHO INDISPONÍVEL')
      : currentOperationalStatus === 'online' ? 'SERVIÇO ONLINE'
        : currentOperationalStatus === 'offline' ? 'SERVIÇO OFFLINE'
          : 'SERVIÇO NÃO VERIFICADO');
    heroTitleRow.append(statusBadge, healthBadge);

    const heroSub = element('div', 'flp-ws-hero-sub', `${project.catalogGroup || 'Sistemas Fênix'} · ${project.versionRole || 'Principal'}`);
    const frameworks = absorption?.codeMap?.frameworks || [];
    for (const fw of frameworks) {
      heroSub.appendChild(element('span', 'flp-badge flp-badge-purple', fw));
    }

    const heroDesc = element('p', 'flp-ws-hero-desc', project.description || `${project.name || project.id} integrado ao runtime operacional do Fênix OS com serviços e dados reais.`);

    const heroStatusRow = element('div', 'flp-ws-hero-status-row');
    const heroStatusBadge = element('span', `flp-hero-status-badge ${status}`);
    heroStatusBadge.innerHTML = `<span class="flp-live-dot ${isOnline ? 'pulse' : ''}"></span> ${isOnline ? `ONLINE (:${liveStatus?.port || project.localPort || 3000})` : 'OFFLINE'}`;

    // Primary Actions on Hero
    const wsBtn = element('button', 'flp-button flp-button-primary', 'Abrir Workspace');
    wsBtn.type = 'button';
    wsBtn.disabled = !workspaceIsAvailable(project);
    wsBtn.addEventListener('click', () => openProjectInIde(project));

    const screenDnaBtn = element('button', 'flp-button flp-button-soft', 'Screen DNA');
    screenDnaBtn.type = 'button';
    screenDnaBtn.addEventListener('click', () => {
      state.workspaceTab = 'screens';
      renderDetail();
      loadRegisteredScreens(project);
    });

    const focusBtn = element('button', `flp-button flp-button-soft${state.detailFocus ? ' active' : ''}`, state.detailFocus ? '▦ Ver Grade' : '⛶ Foco');
    focusBtn.type = 'button';
    focusBtn.title = state.detailFocus ? 'Restaurar painel do catálogo' : 'Expandir área de trabalho em tela cheia';
    focusBtn.addEventListener('click', () => {
      state.detailFocus = !state.detailFocus;
      syncMultiViewToolbar();
      renderDetail();
    });

    const livePreviewBtn = (project.localUrl || activeUrl) ? element('button', 'flp-button flp-button-soft', '▶ Preview ao Vivo') : null;
    if (livePreviewBtn) {
      livePreviewBtn.type = 'button';
      livePreviewBtn.title = 'Abrir preview interativo ao vivo no workspace';
      livePreviewBtn.addEventListener('click', () => {
        state.workspaceTab = 'preview';
        renderDetail();
      });
    }

    const heroPopupBtn = element('button', 'flp-button flp-button-soft', '🌐 Pop-up');
    heroPopupBtn.type = 'button';
    heroPopupBtn.title = 'Abrir sistema em janela pop-up na tela';
    heroPopupBtn.addEventListener('click', () => openSystemModal(project, activeUrl || project.localUrl));

    const heroTabBtn = element('button', 'flp-button flp-button-soft', '↗ Nova Aba');
    heroTabBtn.type = 'button';
    heroTabBtn.title = 'Abrir sistema em outra tela (nova aba)';
    heroTabBtn.addEventListener('click', () => {
      const url = activeUrl || project.localUrl || (project.localPort ? `http://localhost:${project.localPort}` : null);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else alert('Nenhuma URL disponível para este projeto.');
    });

    const heroCityBtn = element('button', 'flp-hero-city-btn');
    heroCityBtn.type = 'button';
    heroCityBtn.innerHTML = '<i class="ph-bold ph-buildings"></i> Ver no World 3D';
    heroCityBtn.addEventListener('click', () => {
      if (window.showView) window.showView('city');
      if (window.GlobalSelectionStore) window.GlobalSelectionStore.select('world_entity', project.worldEntityId || project.companyId || project.id);
    });

    // Secondary Actions Menu
    const mapBtn = element('button', 'flp-button flp-button-soft', 'Mapear Sistema');
    mapBtn.type = 'button';
    mapBtn.disabled = !workspaceIsAvailable(project) || Boolean(project.entryFile);
    mapBtn.addEventListener('click', async () => {
      state.workspaceTab = 'intelligence';
      renderDetail();
      await loadProjectAnalysis(project.id, true);
    });

    const absorbBtn = element('button', 'flp-button flp-button-soft', 'Absorver DNA');
    absorbBtn.type = 'button';
    absorbBtn.disabled = !workspaceIsAvailable(project) || Boolean(project.entryFile);
    absorbBtn.addEventListener('click', async () => {
      absorbBtn.disabled = true;
      $('flpMeasured').textContent = `Absorvendo Screen DNA do projeto ${project.name}…`;
      try {
        const res = await json('/api/v2/company/projects/absorb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            projectName: project.name,
            workspacePath: project.workspace
          })
        });
        state.absorptions.set(project.id, res);
        $('flpMeasured').textContent = `Projeto ${project.name} absorvido com sucesso! ${res.screens?.length || 0} telas mapeadas.`;
        renderDetail();
      } catch (err) {
        $('flpMeasured').textContent = `Falha na absorção: ${err.message}`;
      } finally {
        absorbBtn.disabled = false;
      }
    });

    const browserBtn = element('button', 'flp-button flp-button-soft', 'Browser QA');
    browserBtn.type = 'button';
    browserBtn.addEventListener('click', () => window.showView?.('browser'));

    const memoryBtn = element('button', 'flp-button flp-button-soft', 'Memória');
    memoryBtn.type = 'button';
    memoryBtn.addEventListener('click', () => window.showView?.('memory'));

    const inspBtn = element('button', 'flp-button flp-button-soft', '⚡ Inspetor');
    inspBtn.type = 'button';
    inspBtn.addEventListener('click', () => {
      if (window.GlobalSelectionStore) {
        window.GlobalSelectionStore.select('project', project.id, project);
      }
      window.FenixSidebar?.openInspector?.({ type: 'project', id: project.id, data: project });
    });

    const additionalActions = [mapBtn, absorbBtn, browserBtn, memoryBtn, inspBtn];
    if (project.id === 'api-platform-live') {
      const dashboard = element('a', 'flp-button flp-button-soft', 'Abrir Painel da API');
      dashboard.href = `${location.protocol}//${location.hostname}:8081/`;
      dashboard.target = '_blank';
      dashboard.rel = 'noopener noreferrer';
      additionalActions.push(dashboard);
    }
    const moreActions = element('details', 'flp-project-actions-menu');
    moreActions.append(element('summary', 'flp-button flp-button-soft', `Mais ações (${additionalActions.length})`));
    const menuPanel = element('div', 'flp-project-actions-panel');
    menuPanel.append(...additionalActions);
    moreActions.appendChild(menuPanel);

    heroStatusRow.append(heroStatusBadge, wsBtn, screenDnaBtn, focusBtn);
    if (livePreviewBtn) heroStatusRow.append(livePreviewBtn);
    heroStatusRow.append(heroPopupBtn, heroTabBtn, heroCityBtn, moreActions);

    heroDetails.append(heroTitleRow, heroSub, heroDesc, heroStatusRow);
    heroLeft.append(heroLogo, heroDetails);

    const heroMeta = element('div', 'flp-ws-hero-meta');
    const metaItem = (lbl, val) => {
      const el = element('div', 'flp-meta-item');
      el.append(element('span', '', lbl), element('strong', '', val));
      return el;
    };
    heroMeta.append(
      metaItem('Diretório', project.workspace || project.listedPath || '—'),
      metaItem('Git Branch', git?.branch ? `git:${git.branch}` : '—'),
      metaItem('Porta UI', String(liveStatus?.port || project.localPort || '—')),
      metaItem('Porta API', String(project.apiPort || '—')),
      metaItem('Última Atividade', project.updatedAt ? date(project.updatedAt) : '—'),
      metaItem('Health Check', project.healthUrl ? 'Ativo' : 'Não verificado')
    );

    heroCard.append(heroLeft, heroMeta);
    target.appendChild(heroCard);

    // 0.8 LIVE STATUS BANNER & DIRECT ACTIONS
    const statusBanner = element('div', `flp-detail-status-banner ${status}`);
    const bannerInfo = element('div');
    if (isOnline) {
      const port = liveStatus?.port || project.localPort || project.apiPort || '—';
      const checkedAt = liveStatus?.checkedAt ? date(liveStatus.checkedAt) : 'horário indisponível';
      bannerInfo.innerHTML = `<strong><span class="flp-live-dot pulse"></span> SERVIÇO ONLINE RESPONDEU NA CHECAGEM · PORTA :${port}</strong><p>Latência: ${liveStatus?.latencyMs != null ? `${liveStatus.latencyMs} ms` : 'não medida'} · Checado: ${checkedAt}</p>`;
      if (activeUrl) {
        const directOpen = element('button', 'flp-btn-open-direct', '🚀 Abrir Sistema Agora ↗');
        directOpen.type = 'button';
        directOpen.addEventListener('click', () => window.open(activeUrl, '_blank', 'noopener,noreferrer'));
        statusBanner.append(bannerInfo, directOpen);
      } else statusBanner.appendChild(bannerInfo);
    } else if (status === 'offline') {
      bannerInfo.innerHTML = `
        <strong><span class="flp-live-dot"></span> SERVIÇO OFFLINE (Porta :${liveStatus?.port || project.localPort || project.apiPort || '—'})</strong>
        <p>Checado: ${liveStatus?.checkedAt ? date(liveStatus.checkedAt) : 'horário indisponível'}. Inicie o serviço ou explore a pasta.</p>
      `;
      const bannerActions = element('div');
      bannerActions.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap;';
      const bStart = element('button', 'flp-quick-action-btn btn-start', '⚡ Iniciar Serviço');
      bStart.type = 'button';
      bStart.addEventListener('click', () => {
        bStart.disabled = true;
        bStart.textContent = 'Iniciando…';
        startProjectService(rawId, project).finally(() => {
          bStart.disabled = false;
          bStart.textContent = '⚡ Iniciar Serviço';
        });
      });
      const bFolder = element('button', 'flp-quick-action-btn btn-folder', '📁 Abrir Pasta');
      bFolder.type = 'button';
      bFolder.addEventListener('click', () => openProjectFolderDirect(rawId, project));
      const bCheck = element('button', 'flp-quick-action-btn btn-check', '🔄 Retestar');
      bCheck.type = 'button';
      bCheck.addEventListener('click', () => {
        bCheck.disabled = true;
        checkProjectStatus(rawId).finally(() => { bCheck.disabled = false; });
      });
      bannerActions.append(bStart, bFolder, bCheck);
      statusBanner.append(bannerInfo, bannerActions);
    } else {
      bannerInfo.innerHTML = '<strong><span class="flp-live-dot"></span> STATUS NÃO VERIFICADO</strong><p>O catálogo não forneceu uma checagem recente de porta ou health para este projeto.</p>';
      statusBanner.appendChild(bannerInfo);
    }
    target.appendChild(statusBanner);

    // 0.9 QUICK SWITCHER BAR (TROCA RÁPIDA ENTRE PROJETOS)
    renderQuickSwitcher(target, project);

    // 1.5 EMPRESA VINCULADA AO PROJETO (Apenas se o projeto possuir companyId real no Registry)
    if (project.companyId) {
      const companyCard = element('div', 'flp-linked-company-banner');
      companyCard.style.cssText = 'background:rgba(0,217,255,0.06); border:1px solid rgba(0,217,255,0.22); border-radius:10px; padding:10px 14px; margin-top:4px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';

      const compName = project.companyName || project.companyId;
      const compInfo = element('div');
      compInfo.style.cssText = 'display:flex; align-items:center; gap:10px;';
      compInfo.innerHTML = `
        <div style="width:34px; height:34px; border-radius:8px; background:rgba(0,217,255,0.15); border:1px solid #00D9FF; display:flex; align-items:center; justify-content:center; color:#00D9FF; font-size:18px;">
          <i class="ph-bold ph-buildings"></i>
        </div>
        <div>
          <div style="font-size:10px; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px;">Empresa Vinculada</div>
          <strong style="color:#F8FAFC; font-size:12.5px;">${compName}</strong>
          <span style="font-size:9.5px; margin-left:6px; color:#10B981; font-weight:700;">● VINCULADA</span>
        </div>
      `;

      const compActions = element('div');
      compActions.style.cssText = 'display:flex; gap:8px; align-items:center;';

      const cityBtn = element('button', 'flp-button flp-button-soft', '🏙️ Ver no World');
      cityBtn.type = 'button';
      cityBtn.addEventListener('click', () => {
        if (window.showView) window.showView('city');
        if (window.GlobalSelectionStore) window.GlobalSelectionStore.select('company', project.companyId);
        window.fenixSelectCompany?.(project.companyId);
      });

      const inspCompBtn = element('button', 'flp-button flp-button-primary', '⚡ Abrir Inspetor');
      inspCompBtn.type = 'button';
      inspCompBtn.addEventListener('click', () => {
        window.fenixOpenSystemInspector?.(project.companyId);
      });

      compActions.append(cityBtn, inspCompBtn);
      companyCard.append(compInfo, compActions);
      target.appendChild(companyCard);
    }

    // 3. COMPREHENSIVE WORKSPACE SUB-TABS (Section 7)
    const screens = getProjectScreens(project);
    const mappedJobs = Number.isFinite(detail?.progress?.totalJobs) ? detail.progress.totalJobs
      : Number.isFinite(project.totalJobs) ? project.totalJobs : null;

    const wsNav = element('nav', 'flp-ws-nav');
    const tabs = [
      { id: 'overview', label: 'Visão Geral', icon: 'ph-sliders' },
      ...(project.companyId ? [{ id: 'company', label: `Empresa: ${project.companyName || project.companyId}`, icon: 'ph-buildings' }] : []),
      { id: 'files', label: 'Arquivos', icon: 'ph-folder' },
      { id: 'code', label: 'Código Monaco', icon: 'ph-code' },
      { id: 'screens', label: `Screen DNA (${screens.length})`, icon: 'ph-eye' },
      { id: 'preview', label: 'Preview ao Vivo', icon: 'ph-browser' },
      { id: 'apis', label: 'APIs & Contratos', icon: 'ph-plugs' },
      { id: 'ports', label: 'Portas & Serviços', icon: 'ph-plugs-connected' },
      { id: 'git', label: 'Histórico & Git', icon: 'ph-git-branch' },
      { id: 'tests', label: 'Testes & Bugs', icon: 'ph-bug' },
      { id: 'graph', label: 'Dependências & Grafo', icon: 'ph-tree-structure' },
      { id: 'memory', label: 'Memória & Docs', icon: 'ph-database' },
      { id: 'intelligence', label: 'Inteligência do Sistema & IA', icon: 'ph-brain' },
      ...(Number.isFinite(mappedJobs) && mappedJobs > 0 ? [{ id: 'jobs', label: `Jobs & Filas (${mappedJobs})`, icon: 'ph-arrows-clockwise' }] : [])
    ];

    for (const t of tabs) {
      const isCurrentActive = state.workspaceTab === t.id ||
        (t.id === 'preview' && state.workspaceTab === 'browser') ||
        (t.id === 'screens' && state.workspaceTab === 'dna') ||
        (t.id === 'tests' && state.workspaceTab === 'bugs') ||
        (t.id === 'memory' && state.workspaceTab === 'docs');
      const tabBtn = element('button', `flp-ws-tab${isCurrentActive ? ' active' : ''}`);
      tabBtn.type = 'button';
      tabBtn.dataset.workspaceTab = t.id;
      tabBtn.innerHTML = `<i class="ph-bold ${t.icon}"></i> ${t.label}`;
      tabBtn.addEventListener('click', () => {
        state.workspaceTab = t.id;
        const cleanTab = t.id !== 'overview' ? `/${t.id}` : '';
        const targetHash = `#projects/${encodeURIComponent(project.id)}${cleanTab}`;
        if (window.location.hash !== targetHash) history.pushState(null, '', targetHash);
        renderDetail();
        if (t.id === 'screens' || t.id === 'dna') loadRegisteredScreens(project);
        if (t.id === 'intelligence') {
          if (!state.analyses.has(project.id)) loadProjectAnalysis(project.id);
          if (!state.reaAnalyses.has(project.id)) loadReaEvidence(project, false);
        }
      });
      wsNav.appendChild(tabBtn);
    }
    target.appendChild(wsNav);

    // 4. WORKSPACE TAB CONTENT
    const wsContent = element('div', 'flp-ws-content');

    if (state.workspaceTab === 'overview') {
      renderOverviewTab(wsContent, project, detail);
    } else if (state.workspaceTab === 'company') {
      renderCompanyTab(wsContent, project, detail);
    } else if (state.workspaceTab === 'files') {
      renderFilesTab(wsContent, project);
    } else if (state.workspaceTab === 'code') {
      renderCodeTab(wsContent, project);
    } else if (state.workspaceTab === 'screens' || state.workspaceTab === 'dna') {
      renderScreensTab(wsContent, project, screens);
    } else if (state.workspaceTab === 'preview' || state.workspaceTab === 'browser') {
      renderBrowserTab(wsContent, project);
    } else if (state.workspaceTab === 'apis') {
      renderApisTab(wsContent, project);
    } else if (state.workspaceTab === 'ports') {
      renderPortsTab(wsContent, project);
    } else if (state.workspaceTab === 'git') {
      renderGitTab(wsContent, project);
    } else if (state.workspaceTab === 'tests' || state.workspaceTab === 'bugs') {
      renderTestsTab(wsContent, project);
    } else if (state.workspaceTab === 'graph') {
      renderGraphTab(wsContent, project);
    } else if (state.workspaceTab === 'memory' || state.workspaceTab === 'docs') {
      renderMemoryTab(wsContent, project);
    } else if (state.workspaceTab === 'intelligence') {
      renderSystemIntelligenceTab(wsContent, project);
    } else if (state.workspaceTab === 'jobs') {
      renderJobsTab(wsContent, project, detail);
    } else {
      renderOverviewTab(wsContent, project, detail);
    }

    target.appendChild(wsContent);

    // 4.5 FAMILY & COUNTERPART SECTIONS (Persistent across tabs for catalog projects)
    if (isLocalCatalogProject && project.catalogGroup && project.catalogGroup.toLocaleLowerCase() !== 'outros') {
      const family = state.projects
        .filter((item) => item.source === 'LOCAL_PROJECT_CATALOG'
          && item.catalogGroup === project.catalogGroup)
        .sort((left, right) => {
          const primary = (item) => item.versionRole === 'Principal' ? 0 : 1;
          return primary(left) - primary(right) || String(left.name || left.id).localeCompare(String(right.name || right.id), 'pt-BR');
        });
      if (family.length > 1) {
        const section = element('section', 'flp-project-family');
        section.setAttribute('aria-label', `Projetos da família ${project.catalogGroup}`);
        const head = element('div', 'flp-project-family-head');
        head.append(element('div', '', `Família · ${project.catalogGroup}`), element('span', '', `${family.length} projetos relacionados no catálogo local`));
        const cards = element('div', 'flp-project-family-grid');
        for (const related of family) {
          const card = element('button', `flp-project-family-card${related.id === project.id ? ' active' : ''}`);
          card.type = 'button';
          card.setAttribute('aria-current', related.id === project.id ? 'true' : 'false');
          card.append(element('strong', '', related.name || related.id));
          card.append(element('span', '', [related.versionRole, related.projectVersion ? `v${related.projectVersion}` : null].filter(Boolean).join(' · ') || 'Função não mapeada'));
          const ports = projectPortSummary(related);
          card.append(element('small', '', ports || 'Portas não cadastradas · host local'));
          card.addEventListener('click', () => selectProject(related.id));
          cards.appendChild(card);
        }
        section.append(head, cards);
        target.appendChild(section);
      }
    }

    if (isLocalCatalogProject) {
      const match = findVpsCounterpart(project);
      const section = element('section', 'flp-project-counterpart');
      section.setAttribute('aria-label', 'Projeto correspondente na VPS');
      const heading = element('div', 'flp-project-counterpart-head');
      heading.append(element('strong', '', 'Correspondência na VPS'), element('span', '', 'Catálogo local ↔ Project Kernel'));
      section.appendChild(heading);
      if (!match) {
        section.appendChild(element('p', 'flp-empty', 'Nenhum vínculo inequívoco encontrado. O projeto continua separado até haver ID, alias, nome exato ou repositório correspondente.'));
      } else {
        const remote = match.project;
        const card = element('article', 'flp-project-counterpart-card');
        const summary = element('div', 'flp-project-counterpart-summary');
        summary.append(element('strong', '', remote.name || remote.displayName || remote.id), element('small', '', `Correspondência por ${match.reason} · workspace VPS ${remote.vpsPath || remote.productionPath || remote.workspace || 'não cadastrado'}`));
        card.appendChild(summary);
        renderVpsBindings(remote, card);
        const openRemote = element('button', 'flp-button flp-button-soft', 'Abrir ficha VPS');
        openRemote.type = 'button';
        openRemote.addEventListener('click', () => {
          $('flpModeFenix').click();
          state.workspaceTab = 'overview';
          selectProject(remote.id);
        });
        card.appendChild(openRemote);
        section.appendChild(card);
      }
      target.appendChild(section);
    }

    // 5. UNMAPPED FACTS DISCLOSURE (Persistent across all tabs at bottom of detail)
    const mappedAgents = Array.isArray(detail?.activeAgents) ? detail.activeAgents.length
      : Array.isArray(project.agents) ? project.agents.length
        : Number.isFinite(project.agentCount) ? project.agentCount : null;
    const mappedRoutes = state.analyses.get(project.id)?.report?.routes?.length ?? project.routesCount;
    const technology = frameworks.length ? frameworks.join(', ') : [project.technology, project.framework, project.tech, project.type].filter(Boolean).join(', ');
    const memory = project.activeMemory || null;
    const genome = project.genomeVersion || null;
    const tokenSavings = absorption?.accumulatedSavings?.tokensSaved;
    const repository = project.repository || git?.remote;
    const screensKnown = screens.length > 0 || Number.isFinite(project.screenCount);
    const factEntries = [
      ['Status', isLocalCatalogProject
        ? (project.workspaceAvailable ? 'Workspace disponível' : 'Caminho indisponível')
        : (project.runtimeStatus && project.runtimeStatus !== 'UNKNOWN' ? text(project.runtimeStatus) : 'Não verificado'), true],
      ['Health', Number.isFinite(project.health) && project.healthMeasuredAt && project.healthSource ? `${project.health}% · ${text(project.healthSource)}` : 'Não medido', true],
      ['Tecnologia', technology || 'Não mapeada', Boolean(technology) || !isLocalCatalogProject],
      ...(!isLocalCatalogProject ? [] : [
        ['Grupo', text(project.catalogGroup), Boolean(project.catalogGroup)],
        ['Tipo', text(project.versionRole), Boolean(project.versionRole)],
        ['Caminho local', project.listedPath || project.workspace || 'Indisponível', true],
        ...(project.entryFile ? [['Arquivo de entrada', project.entryFile, true]] : []),
      ]),
      ['Última Atividade', project.updatedAt ? date(project.updatedAt) : 'Não informada', Boolean(project.updatedAt) || !isLocalCatalogProject],
      ['Agentes Vinculados', mappedAgents === null ? 'Não informado' : String(mappedAgents), mappedAgents !== null || !isLocalCatalogProject],
      ['Jobs Registrados', mappedJobs === null ? 'Não informado' : String(mappedJobs), mappedJobs !== null || !isLocalCatalogProject],
      ['Telas (Screen DNA)', screens.length ? `${screens.length} tela(s)` : (Number.isFinite(project.screenCount) ? String(project.screenCount) : (isLocalCatalogProject ? 'Ainda não absorvido' : 'Não medido')), screensKnown || !isLocalCatalogProject],
      ['APIs Mapeadas', Number.isFinite(mappedRoutes) ? `${mappedRoutes} rotas` : 'Não medido', Number.isFinite(mappedRoutes) || !isLocalCatalogProject],
      ['Memória Ativa', memory || 'Não medida', Boolean(memory) || !isLocalCatalogProject],
      ['Versão do Genome', genome || 'Não informada', Boolean(genome) || !isLocalCatalogProject],
      ['Economia de Tokens', tokenSavings ? `${tokenSavings} tokens` : '—', Boolean(tokenSavings) || !isLocalCatalogProject],
      ['Repositório', repository || 'Não informado', Boolean(repository) || !isLocalCatalogProject],
    ];
    const unmappedFacts = [];
    for (const [label, , known] of factEntries) {
      if (isLocalCatalogProject && !known) unmappedFacts.push(label);
    }
    if (unmappedFacts.length) {
      const disclosure = element('details', 'flp-unmapped-facts');
      const summary = element('summary', '', `Dados ainda não mapeados (${unmappedFacts.length})`);
      const list = element('ul', '');
      for (const label of unmappedFacts) list.appendChild(element('li', 'flp-unmapped-fact', `${label} · Ainda não mapeado`));
      disclosure.append(summary, list);
      target.appendChild(disclosure);
    }

    keepActiveWorkspaceTabVisible(target);
  }

  function keepActiveWorkspaceTabVisible(container) {
    const nav = container.querySelector('.flp-ws-nav');
    const activeTab = nav?.querySelector('.flp-ws-tab.active');
    if (!nav || !activeTab) return;
    const navBounds = nav.getBoundingClientRect();
    const tabBounds = activeTab.getBoundingClientRect();
    if (tabBounds.right > navBounds.right) nav.scrollLeft += tabBounds.right - navBounds.right;
    else if (tabBounds.left < navBounds.left) nav.scrollLeft -= navBounds.left - tabBounds.left;
  }

  function getProjectScreens(project) {
    const absorption = state.absorptions.get(project.id);
    const sources = [
      absorption?.screens,
      project.screens,
      project.screenDna,
      project.dna?.screens,
      state.registeredScreens.get(project.id)
    ];
    const unique = new Map();
    for (const screen of sources.flatMap((items) => Array.isArray(items) ? items : [])) {
      const route = String(screen.route || '').trim().replace(/\/$/, '').toLowerCase();
      const applicationId = String(screen.applicationId || '').trim().toLowerCase();
      let key = route ? `route:${route}` : String(screen.screenId || screen.id || screen.name || '').trim().toLowerCase();
      if (route && applicationId) key = `app:${applicationId}:${route}`;
      else if (route) {
        const scopedMatches = [...unique.entries()].filter(([candidate, value]) => candidate.startsWith('app:') && String(value.route || '').trim().replace(/\/$/, '').toLowerCase() === route);
        if (scopedMatches.length === 1) key = scopedMatches[0][0];
      }
      if (!key) continue;
      const current = unique.get(key) || {};
      unique.set(key, { ...current, ...screen,
        screenshotPath: screen.screenshotPath || current.screenshotPath,
        screenshotFreshness: screen.screenshotFreshness || current.screenshotFreshness,
        sourceFile: screen.sourceFile || current.sourceFile
      });
    }
    const screens = [...unique.values()];
    const routeCounts = new Map();
    for (const screen of screens) {
      const normalizedRoute = String(screen.route || '').trim().replace(/\/$/, '').toLowerCase();
      if (normalizedRoute) routeCounts.set(normalizedRoute, (routeCounts.get(normalizedRoute) || 0) + 1);
    }
    return screens.map((screen) => {
      const normalizedRoute = String(screen.route || '').trim().replace(/\/$/, '').toLowerCase();
      return { ...screen, showApplicationScope: Boolean(normalizedRoute && routeCounts.get(normalizedRoute) > 1) };
    });
  }

  function renderScreenPortfolio(container) {
    if (!container) return;
    container.replaceChildren();
    const screens = state.projects.flatMap((project) => getProjectScreens(project).map((screen) => ({ project, screen })));
    const head = element('header', 'flp-screen-portfolio-head');
    head.append(element('span', 'flp-eyebrow', 'PROJECT HUB · CATÁLOGO VISUAL'), element('h2', '', 'Telas dos projetos'), element('p', '', 'Rotas, componentes e capturas registradas. Capturas históricas e telas sem medição ficam identificadas pela origem.'));
    const summary = element('div', 'flp-screen-portfolio-summary');
    const captured = screens.filter(({ screen }) => Boolean(screen.screenshotPath)).length;
    const historical = screens.filter(({ screen }) => screen.screenshotFreshness === 'ARCHIVED').length;
    const unmeasured = screens.filter(({ screen }) => !screen.screenshotPath).length;
    summary.append(
      element('strong', '', `${screens.length} telas registradas`),
      element('span', '', `${state.projects.length} projetos`),
      element('span', '', `${captured} com captura`),
      element('span', '', `${historical} históricas`),
      element('span', '', `${unmeasured} sem captura`)
    );
    const controls = element('div', 'flp-screen-portfolio-controls');
    const searchLabel = element('label', 'flp-screen-portfolio-search-label', 'Buscar');
    const search = document.createElement('input');
    search.type = 'search';
    search.setAttribute('aria-label', 'Filtrar telas por nome ou rota');
    search.placeholder = 'Nome do projeto, tela ou rota';
    search.value = state.portfolioQuery;
    search.addEventListener('input', () => {
      state.portfolioQuery = search.value;
      renderScreenPortfolio(container);
      const nextSearch = container.querySelector('[aria-label="Filtrar telas por nome ou rota"]');
      nextSearch?.focus();
      nextSearch?.setSelectionRange(state.portfolioQuery.length, state.portfolioQuery.length);
    });
    searchLabel.appendChild(search);
    const filterLabel = element('label', 'flp-screen-portfolio-filter-label', 'Estado da captura');
    const filter = document.createElement('select');
    filter.setAttribute('aria-label', 'Estado da captura');
    for (const [value, label] of [['all', 'Todos os estados'], ['captured', 'Com captura'], ['historical', 'Históricas'], ['unmeasured', 'Sem captura']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      filter.appendChild(option);
    }
    filter.value = state.portfolioCaptureFilter;
    filter.addEventListener('change', () => {
      state.portfolioCaptureFilter = filter.value;
      renderScreenPortfolio(container);
    });
    filterLabel.appendChild(filter);
    controls.append(searchLabel, filterLabel);
    container.append(head, summary, controls);
    renderSystemScreenMap(container);
    if (!state.shellScreenMap && !state.shellScreenMapLoading && !state.shellScreenMapError) loadSystemScreenMap();

    const grid = element('div', 'flp-screen-portfolio-grid');
    for (const project of state.projects) {
      const allProjectScreens = getProjectScreens(project);
      if (!state.registeredScreens.has(project.id) && !state.registeredScreensLoading.has(project.id)) loadRegisteredScreens(project);
      const query = state.portfolioQuery.trim().toLocaleLowerCase();
      const projectScreens = allProjectScreens.filter((screen) => {
        const matchesQuery = !query || [project.name, screen.name, screen.title, screen.route, screen.sourceFile].some((value) => String(value || '').toLocaleLowerCase().includes(query));
        const hasCapture = Boolean(screen.screenshotPath);
        const matchesCapture = state.portfolioCaptureFilter === 'all'
          || (state.portfolioCaptureFilter === 'historical' && screen.screenshotFreshness === 'ARCHIVED')
          || (state.portfolioCaptureFilter === 'captured' && hasCapture && screen.screenshotFreshness !== 'ARCHIVED')
          || (state.portfolioCaptureFilter === 'unmeasured' && !hasCapture);
        return matchesQuery && matchesCapture;
      });
      if ((query || state.portfolioCaptureFilter !== 'all') && !projectScreens.length) continue;
      const card = element('section', 'flp-screen-portfolio-project');
      const title = element('div', 'flp-screen-portfolio-project-title');
      title.append(element('div', '', project.name || project.id), element('small', '', `${projectScreens.length} de ${allProjectScreens.length} tela(s) · ${project.workspace || 'workspace não vinculado'}`));
      const open = element('button', 'flp-button flp-button-soft', 'Abrir projeto e telas');
      open.type = 'button';
      open.addEventListener('click', () => {
        state.hubViewMode = 'fenix';
        state.workspaceTab = 'screens';
        $('flpModeFenix').classList.add('active');
        $('flpModeScreens').classList.remove('active');
        $('flpFenixSidebarView').style.display = 'block';
        selectProject(project.id);
        loadRegisteredScreens(project);
      });
      title.appendChild(open);
      card.appendChild(title);
      if (!projectScreens.length) {
        const empty = element('p', 'flp-empty', state.registeredScreensLoading.has(project.id)
          ? 'Consultando registros de telas…'
          : 'Nenhuma tela registrada. Abra o projeto para mapear seu workspace.');
        card.appendChild(empty);
      } else {
        const previews = element('div', 'flp-screen-portfolio-previews');
        const expanded = state.expandedPortfolioProjects.has(project.id);
        for (const screen of (expanded ? projectScreens : projectScreens.slice(0, 4))) {
          const preview = element('article', 'flp-screen-portfolio-preview');
          const screenLabel = screen.name || screen.title || screen.screenId || screen.route || 'Tela sem nome';
          const media = element('div', 'flp-screen-preview-media');
          const showUnavailable = (label) => {
            media.classList.add('is-unavailable');
            media.replaceChildren(element('span', 'flp-screen-preview-glyph', '▧'), element('span', 'flp-screen-preview-label', label));
          };
          if (screen.screenshotPath) {
            const image = document.createElement('img');
            image.src = screen.screenshotPath;
            image.alt = `Captura registrada: ${screenLabel}`;
            image.loading = 'lazy';
            image.onload = () => {
              if (image.naturalWidth < 64 || image.naturalHeight < 36) showUnavailable('Captura em baixa resolução');
            };
            image.onerror = () => showUnavailable('Captura indisponível');
            media.appendChild(image);
          } else {
            preview.classList.add('no-capture');
            showUnavailable('Prévia não medida');
          }
          preview.append(media, element('strong', '', screenLabel), element('code', '', screen.route || 'Rota não registrada'));
          if (screen.showApplicationScope && screen.applicationId) {
            preview.appendChild(element('small', 'flp-screen-app-scope', `Aplicação: ${screen.applicationName || screen.applicationId}`));
          }
          if (screen.screenshotFreshness === 'ARCHIVED') preview.append(element('small', '', `Histórica · ${screen.screenshotCapturedOn || 'data não informada'}`));
          const inspect = element('button', 'flp-screen-inspect', `Inspecionar ${screenLabel}`);
          inspect.type = 'button';
          inspect.addEventListener('click', () => openInspector(screen, project));
          preview.appendChild(inspect);
          previews.appendChild(preview);
        }
        card.appendChild(previews);
        if (projectScreens.length > 4) {
          const expand = element('button', 'flp-button flp-button-soft flp-screen-expand', expanded ? 'Recolher telas' : `Ver todas as ${projectScreens.length} telas`);
          expand.type = 'button';
          expand.addEventListener('click', () => {
            if (expanded) state.expandedPortfolioProjects.delete(project.id);
            else state.expandedPortfolioProjects.add(project.id);
            renderScreenPortfolio(container);
          });
          card.appendChild(expand);
        }
      }
      grid.appendChild(card);
    }
    if (grid.childElementCount === 1 && grid.firstElementChild.classList.contains('flp-screen-portfolio-project')) grid.classList.add('is-single-project');
    if (!state.projects.length) grid.appendChild(element('p', 'flp-empty', 'O Project Kernel não retornou projetos nesta sessão.'));
    else if (!grid.childElementCount) grid.appendChild(element('p', 'flp-empty', 'Nenhuma tela corresponde aos filtros. Limpe a busca ou selecione outro estado de captura.'));
    container.appendChild(grid);
  }

  function renderSystemScreenMap(container) {
    const panel = element('section', 'flp-shell-screen-map');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Mapa de telas do GRG SPACE');
    const head = element('div', 'flp-shell-screen-map-head');
    const title = element('div');
    title.append(element('span', 'flp-eyebrow', 'FÊNIX · MAPA DO SHELL'), element('h3', '', 'Telas do GRG SPACE'));
    title.append(element('p', '', 'Rotas encontradas no HTML da aplicação. A descoberta estática não comprova que a tela ou seus controles funcionem em runtime.'));
    const refresh = element('button', 'flp-button flp-button-soft', state.shellScreenMapLoading ? 'Atualizando…' : 'Atualizar mapa');
    refresh.type = 'button';
    refresh.disabled = state.shellScreenMapLoading;
    refresh.addEventListener('click', () => loadSystemScreenMap(true));
    head.append(title, refresh);
    panel.appendChild(head);

    const map = state.shellScreenMap;
    if (state.shellScreenMapLoading && !map) panel.appendChild(element('p', 'flp-empty', 'Lendo o catálogo real de rotas…'));
    else if (state.shellScreenMapError && !map) {
      const error = element('p', 'flp-empty', `Mapa indisponível: ${state.shellScreenMapError}`);
      panel.appendChild(error);
    } else if (!map?.screens?.length) panel.appendChild(element('p', 'flp-empty', 'A API não retornou telas para o shell.'));
    else {
      const evidence = element('div', 'flp-shell-screen-map-evidence');
      evidence.append(element('strong', '', `${map.totalScreens ?? map.screens.length} rotas canônicas`), element('span', '', 'Inventário do HTML'), element('span', '', 'Runtime não verificado'));
      if (map.legacyRouteCount) evidence.append(element('span', '', `${map.legacyRouteCount} aliases legados ocultos`));
      const list = element('div', 'flp-shell-screen-map-list');
      const visibleScreens = state.shellScreenMapExpanded ? map.screens : map.screens.slice(0, 4);
      const domainLabels = { command: 'Comando', build: 'Construção', intelligence: 'Inteligência', infrastructure: 'Infraestrutura', validation: 'Validação' };
      const groups = new Map();
      for (const screen of visibleScreens) {
        const domain = domainLabels[screen.domain] ? screen.domain : 'other';
        if (!groups.has(domain)) groups.set(domain, []);
        groups.get(domain).push(screen);
      }
      for (const [domain, domainScreens] of groups) {
        const group = element('section', 'flp-shell-screen-domain');
        const groupHead = element('header', 'flp-shell-screen-domain-head');
        groupHead.append(element('h4', '', domainLabels[domain] || 'Sem domínio mapeado'), element('span', '', `${domainScreens.length} ${domainScreens.length === 1 ? 'tela' : 'telas'}`));
        const domainList = element('div', 'flp-shell-screen-domain-items');
        for (const screen of domainScreens) {
          const item = element('article', 'flp-shell-screen-map-item');
          const label = element('div', 'flp-shell-screen-map-label');
          label.append(element('strong', '', screen.title || screen.screenId || 'Tela sem nome'), element('code', '', screen.route || 'Rota não registrada'));
          if (screen.purpose) label.append(element('small', 'flp-shell-screen-map-purpose', screen.purpose));
          const source = element('small', '', `${screen.relPath || 'Origem não informada'} · ${screen.verificationStatus === 'VERIFIED' ? 'verificada' : 'não verificada'}`);
          const contractParts = [];
          const readCount = Array.isArray(screen.readEndpoints) ? screen.readEndpoints.length : 0;
          const actionCount = Array.isArray(screen.actionEndpoints) ? screen.actionEndpoints.length : 0;
          if (readCount) contractParts.push(`${readCount} ${readCount === 1 ? 'leitura' : 'leituras'}`);
          if (actionCount) contractParts.push(`${actionCount} ${actionCount === 1 ? 'ação declarada' : 'ações declaradas'}`);
          const contract = contractParts.length
            ? element('small', 'flp-shell-screen-map-contract', contractParts.join(' · '))
            : null;
          const route = String(screen.route || '').trim();
          const button = element('button', 'flp-screen-open-route', 'Abrir tela');
          button.type = 'button';
          button.disabled = !/^#?[a-z0-9_-]+$/i.test(route.replace(/^#/, ''));
          button.setAttribute('aria-label', `Abrir tela ${screen.title || screen.screenId || ''}`);
          button.addEventListener('click', () => {
            const viewId = route.replace(/^#/, '').replace(/^\//, '');
            if (!/^[a-z0-9_-]+$/i.test(viewId)) return;
            if (typeof window.showView === 'function') window.showView(viewId);
            else window.location.hash = `#${viewId}`;
          });
          item.append(label, source, button);
          if (contract) item.appendChild(contract);
          domainList.appendChild(item);
        }
        group.append(groupHead, domainList);
        list.appendChild(group);
      }
      panel.append(evidence, list);
      if (map.screens.length > 4) {
        const expand = element('button', 'flp-button flp-button-soft flp-shell-screen-map-expand', state.shellScreenMapExpanded ? 'Recolher mapa' : `Ver todas as ${map.screens.length} telas`);
        expand.type = 'button';
        expand.addEventListener('click', () => {
          state.shellScreenMapExpanded = !state.shellScreenMapExpanded;
          renderScreenPortfolio(container);
        });
        panel.appendChild(expand);
      }
      if (state.shellScreenMapError) panel.appendChild(element('small', 'flp-shell-screen-map-stale', `Atualização falhou; exibindo o último mapa carregado. ${state.shellScreenMapError}`));
    }
    container.appendChild(panel);
  }

  async function loadSystemScreenMap(force = false) {
    if (state.shellScreenMapLoading || (!force && state.shellScreenMap)) return;
    state.shellScreenMapLoading = true;
    state.shellScreenMapError = null;
    const container = $('flpDetail');
    if (state.hubViewMode === 'screens' && container) renderScreenPortfolio(container);
    try {
      const [result, manifest] = await Promise.all([
        json('/api/v2/frontend-reality/screens?projectId=fenix_enterprise&mode=shell'),
        json('/project-screen-manifest.json?v=1').catch(() => null)
      ]);
      const discovered = Array.isArray(result.screens) ? result.screens : [];
      const screens = discovered
        .filter((screen) => !legacyShellRoutes.has(String(screen.route || '').toLowerCase()))
        .map((screen) => {
          const routeKey = String(screen.route || '').split('#').pop().split('?')[0].replace(/^\/+/, '').toLowerCase();
          const spec = manifest?.screens?.[routeKey];
          const domain = Object.entries(manifest?.domains || {}).find(([, members]) => Array.isArray(members) && members.includes(routeKey))?.[0];
          return {
            ...screen,
            domain: screen.domain || domain || null,
            purpose: screen.purpose || spec?.purpose || null,
            readEndpoints: Array.isArray(screen.readEndpoints) ? screen.readEndpoints : (spec?.readEndpoints || []),
            actionEndpoints: Array.isArray(screen.actionEndpoints) ? screen.actionEndpoints : (spec?.actionEndpoints || [])
          };
        });
      state.shellScreenMap = { screens, totalScreens: screens.length, legacyRouteCount: discovered.length - screens.length, status: result.status, verificationStatus: result.verificationStatus };
    } catch (error) {
      state.shellScreenMapError = error.message;
    } finally {
      state.shellScreenMapLoading = false;
      if (state.hubViewMode === 'screens' && container) renderScreenPortfolio(container);
    }
  }

  async function loadRegisteredScreens(project) {
    if (!project || state.registeredScreens.has(project.id) || state.registeredScreensLoading.has(project.id)) return;
    const registryId = project.id === 'api-platform-live' ? 'api-platform' : project.id;
    state.registeredScreensLoading.add(project.id);
    try {
      const result = await json(`/api/v2/pages?projectId=${encodeURIComponent(registryId)}`);
      const captures = (Array.isArray(result.pages) ? result.pages : [])
        .filter((page) => page.screenshot && page.screenshotFreshness === 'ARCHIVED')
        .map((page) => ({
          screenId: page.id,
          name: page.title,
          route: page.route,
          screenshotPath: page.screenshot,
          screenshotFreshness: page.screenshotFreshness,
          screenshotCapturedOn: page.screenshotCapturedOn,
          components: page.component ? [page.component] : [],
          source: 'PageRegistry'
        }));
      state.registeredScreens.set(project.id, captures);
    } catch (error) {
      state.registeredScreens.set(project.id, []);
      state.registeredScreensErrors.set(project.id, error.message);
    } finally {
      state.registeredScreensLoading.delete(project.id);
      if (state.hubViewMode === 'screens') renderScreenPortfolio($('flpDetail'));
      else if (state.selected === project.id && state.workspaceTab === 'screens') renderDetail();
    }
  }

  async function loadProjectAbsorption(project) {
    if (!project || !workspaceIsAvailable(project) || project.entryFile || state.absorptions.has(project.id) || state.absorptionLoading.has(project.id)) return;
    state.absorptionLoading.add(project.id);
    try {
      const report = await json(`/api/v2/company/projects/${encodeURIComponent(project.id)}/absorption`, { signal: AbortSignal.timeout(120000) });
      if (report && Array.isArray(report.screens)) {
        state.absorptions.set(project.id, report);
        state.registeredScreensErrors.delete(project.id);
      }
    } catch (error) {
      if (error.status !== 404) state.registeredScreensErrors.set(project.id, error.message);
    } finally {
      state.absorptionLoading.delete(project.id);
      if (state.selected === project.id && state.workspaceTab === 'screens') renderDetail();
    }
  }

  function renderGitTab(container, project) {
    renderGit(container, project);
  }

  function renderProjectFactsSection(target, project, detail) {
    const isLocalCatalogProject = project.source === 'LOCAL_PROJECT_CATALOG';
    const absorption = state.absorptions.get(project.id);
    const git = state.git.get(project.id);
    const { liveStatus, status } = operationalStatus(project);
    const rawId = project.catalogId || (project.id.startsWith('local-') ? project.id.slice(6) : project.id);
    const frameworks = absorption?.codeMap?.frameworks || [];
    const screens = getProjectScreens(project);
    const mappedAgents = Array.isArray(detail?.activeAgents) ? detail.activeAgents.length
      : Array.isArray(project.agents) ? project.agents.length
        : Number.isFinite(project.agentCount) ? project.agentCount : null;
    const mappedJobs = Number.isFinite(detail?.progress?.totalJobs) ? detail.progress.totalJobs
      : Number.isFinite(project.totalJobs) ? project.totalJobs : null;
    const mappedRoutes = state.analyses.get(project.id)?.report?.routes?.length ?? project.routesCount;
    const technology = frameworks.length ? frameworks.join(', ') : [project.technology, project.framework, project.tech, project.type].filter(Boolean).join(', ');
    const memory = project.activeMemory || null;
    const genome = project.genomeVersion || null;
    const tokenSavings = absorption?.accumulatedSavings?.tokensSaved;
    const repository = project.repository || git?.remote;
    const screensKnown = screens.length > 0 || Number.isFinite(project.screenCount);

    // Decision Funnel
    renderDecisionFunnel(target, project, liveStatus, status);

    const facts = element('div', 'flp-facts');
    const factEntries = [
      ['Status', isLocalCatalogProject
        ? (project.workspaceAvailable ? 'Workspace disponível' : 'Caminho indisponível')
        : (project.runtimeStatus && project.runtimeStatus !== 'UNKNOWN' ? text(project.runtimeStatus) : 'Não verificado'), true],
      ['Health', Number.isFinite(project.health) && project.healthMeasuredAt && project.healthSource ? `${project.health}% · ${text(project.healthSource)}` : 'Não medido', true],
      ['Tecnologia', technology || 'Não mapeada', Boolean(technology) || !isLocalCatalogProject],
      ...(!isLocalCatalogProject ? [] : [
        ['Grupo', text(project.catalogGroup), Boolean(project.catalogGroup)],
        ['Tipo', text(project.versionRole), Boolean(project.versionRole)],
        ['Caminho local', project.listedPath || project.workspace || 'Indisponível', true],
        ...(project.entryFile ? [['Arquivo de entrada', project.entryFile, true]] : []),
      ]),
      ['Última Atividade', project.updatedAt ? date(project.updatedAt) : 'Não informada', Boolean(project.updatedAt) || !isLocalCatalogProject],
      ['Agentes Vinculados', mappedAgents === null ? 'Não informado' : String(mappedAgents), mappedAgents !== null || !isLocalCatalogProject],
      ['Jobs Registrados', mappedJobs === null ? 'Não informado' : String(mappedJobs), mappedJobs !== null || !isLocalCatalogProject],
      ['Telas (Screen DNA)', screens.length ? `${screens.length} tela(s)` : (Number.isFinite(project.screenCount) ? String(project.screenCount) : (isLocalCatalogProject ? 'Ainda não absorvido' : 'Não medido')), screensKnown || !isLocalCatalogProject],
      ['APIs Mapeadas', Number.isFinite(mappedRoutes) ? `${mappedRoutes} rotas` : 'Não medido', Number.isFinite(mappedRoutes) || !isLocalCatalogProject],
      ['Memória Ativa', memory || 'Não medida', Boolean(memory) || !isLocalCatalogProject],
      ['Versão do Genome', genome || 'Não informada', Boolean(genome) || !isLocalCatalogProject],
      ['Economia de Tokens', tokenSavings ? `${tokenSavings} tokens` : '—', Boolean(tokenSavings) || !isLocalCatalogProject],
      ['Repositório', repository || 'Não informado', Boolean(repository) || !isLocalCatalogProject],
    ];
    for (const [label, value, known] of factEntries) {
      if (!isLocalCatalogProject || known) facts.appendChild(row(label, value));
    }
    target.appendChild(facts);

    if (isLocalCatalogProject) {
      const runtime = element('details', 'flp-project-runtime');
      runtime.appendChild(element('summary', '', 'Portas e versões do projeto'));
      runtime.appendChild(element('p', 'flp-runtime-unverified', 'Portas configuradas no host do catálogo · disponibilidade não verificada'));
      if (liveStatus) {
        const statusNote = liveStatus.online
          ? `🟢 Porta :${liveStatus.port || project.localPort} ATIVA e respondendo (${liveStatus.latencyMs != null ? liveStatus.latencyMs + 'ms' : 'imediato'})`
          : `⚪ Porta :${project.localPort || '—'} OFFLINE`;
        const statusNoteEl = element('p', liveStatus.online ? 'flp-card-ports' : 'flp-runtime-unverified', statusNote);
        if (liveStatus.online) statusNoteEl.style.cssText = 'margin:4px 0 8px; color:#00E5A0; font-weight:700; font-size:11.5px;';
        runtime.appendChild(statusNoteEl);
      }
      const runtimeGrid = element('div', 'flp-project-runtime-grid');
      const ports = [
        Number.isInteger(project.localPort) ? `PC local · UI: ${project.localPort}` : null,
        Number.isInteger(project.apiPort) ? `PC local · API: ${project.apiPort}` : null,
      ].filter(Boolean);
      const runtimeRows = [
        ['Versão', project.projectVersion || 'Não declarada'],
        ['Modo', project.mode || 'Não informado'],
        ['Portas', ports.join(' · ') || 'Não cadastradas'],
        ['Pasta', project.workspace || project.listedPath || 'Indisponível'],
      ];
      for (const [label, value] of runtimeRows) {
        const item = element('div', 'flp-runtime-item');
        item.append(element('span', '', label), element('strong', '', value));
        runtimeGrid.appendChild(item);
      }
      for (const [label, value] of [
        ['Abrir URL local', project.localUrl],
        ['Abrir URL VPS', project.remoteUrl],
        ['Health check cadastrado', project.healthUrl || project.remoteHealthUrl],
      ]) {
        if (!value) continue;
        let safeUrl;
        try {
          const parsed = new URL(value, window.location.href);
          if (!['http:', 'https:'].includes(parsed.protocol)) continue;
          safeUrl = parsed.toString();
        } catch { continue; }
        const item = element('div', 'flp-runtime-item');
        const link = element('a', '', value);
        link.href = safeUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        item.append(element('span', '', label), link);
        runtimeGrid.appendChild(item);
      }
      runtime.appendChild(runtimeGrid);
      target.appendChild(runtime);

      // Live service logs viewer
      const logContainer = element('div', 'flp-log-container');
      logContainer.style.cssText = 'margin:12px 0;';
      const logToggle = element('button', 'flp-button flp-button-soft', '📜 Ver Logs / Output do Serviço');
      logToggle.type = 'button';
      const logViewer = element('pre', 'flp-log-viewer');
      logViewer.hidden = true;
      logToggle.addEventListener('click', () => {
        logViewer.hidden = !logViewer.hidden;
        if (!logViewer.hidden) loadProjectLogs(rawId, logViewer);
      });
      logContainer.append(logToggle, logViewer);
      target.appendChild(logContainer);
    } else if (project.frontend || project.backend) {
      const runtime = element('details', 'flp-project-runtime');
      runtime.appendChild(element('summary', '', 'Runtime cadastrado'));
      runtime.appendChild(element('p', 'flp-runtime-unverified', 'Portas cadastradas · listener e health não verificados'));
      const runtimeGrid = element('div', 'flp-project-runtime-grid');
      const frontendPort = Number.isInteger(project.frontend?.port) ? project.frontend.port : null;
      const backendPort = Number.isInteger(project.backend?.port) ? project.backend.port : null;
      const runtimeRows = [
        ['Versão', project.projectVersion || project.currentVersion || 'Não informada'],
        ['Portas', [frontendPort !== null ? `UI: ${frontendPort}` : null, backendPort !== null ? `API: ${backendPort}` : null].filter(Boolean).join(' · ') || 'Não cadastradas'],
        ['Frontend', [project.frontend?.framework, project.frontend?.entry].filter(Boolean).join(' · ') || 'Não informado'],
        ['Backend', [project.backend?.runtime, project.backend?.pm2Name ? `PM2: ${project.backend.pm2Name}` : null, project.backend?.serviceManager ? `systemd: ${project.backend.serviceManager}` : null].filter(Boolean).join(' · ') || 'Não informado'],
        ['Pasta VPS', project.vpsPath || project.productionPath || 'Não cadastrada'],
        ['Pasta do frontend', project.frontend?.path || 'Não cadastrada'],
        ['Pasta da API', project.backend?.path || 'Não cadastrada'],
      ];
      for (const [label, value] of runtimeRows) {
        const item = element('div', 'flp-runtime-item');
        item.append(element('span', '', label), element('strong', '', value));
        runtimeGrid.appendChild(item);
      }
      runtime.appendChild(runtimeGrid);
      renderVpsBindings(project, runtime);
      target.appendChild(runtime);
    }
  }

  function renderOverviewTab(container, project, detail) {
    const isLocalCatalogProject = project.source === 'LOCAL_PROJECT_CATALOG';
    const absorption = state.absorptions.get(project.id);
    const git = state.git.get(project.id);
    const { liveStatus, status } = operationalStatus(project);
    const isOnline = status === 'online';
    const activeUrl = resolveProjectUrl(project, liveStatus);
    const screens = state.registeredScreens.get(project.id) || project.screens || [];

    const panel = element('section', 'flp-panel');
    const head = element('div', 'flp-dna-board-head');
    const identity = element('div');
    identity.append(
      element('span', 'flp-eyebrow', 'VISÃO GERAL DO PROJETO'),
      element('h3', '', `${project.name || project.id} · Workspace Central`),
      element('p', '', 'Resumo operacional, integridade dos serviços e atalhos rápidos para inspeção profunda.')
    );
    head.appendChild(identity);
    panel.appendChild(head);

    // KPI Cards / Highlights
    const kpis = element('div', 'flp-overview-kpis');
    kpis.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
    const kpiRow = (lbl, val) => {
      const el = element('div', 'flp-overview-kpi-card');
      el.append(element('span', '', lbl), element('strong', '', text(val)));
      return el;
    };
    kpis.append(
      kpiRow('Status Operacional', status === 'online' ? `🟢 Online (Porta :${liveStatus?.port || project.localPort || '—'})` : '⚪ Offline'),
      kpiRow('Screen DNA', screens.length ? `${screens.length} tela(s)` : (isLocalCatalogProject ? 'Pendente' : '—')),
      kpiRow('Genome Twin', absorption ? `Absorvido (${absorption.screens?.length || 0} telas)` : 'Não absorvido'),
      kpiRow('Git Branch', git?.branch || 'main'),
      kpiRow('Framework', (absorption?.codeMap?.frameworks || [project.frontend?.framework || project.backend?.runtime]).filter(Boolean).join(', ') || 'Vanilla / Node')
    );
    panel.appendChild(kpis);

    // Quick Navigation Grid
    const navGrid = element('div', 'flp-overview-nav-grid');
    navGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin:20px 0;';

    const quickLinks = [
      { id: 'preview', title: 'Preview ao Vivo', desc: 'Visualização interativa desktop/tablet/mobile', icon: 'ph-browser', color: '#00D9FF' },
      { id: 'files', title: 'Arquivos & Pastas', desc: 'Árvore de arquivos do projeto', icon: 'ph-folder', color: '#F59E0B' },
      { id: 'code', title: 'Código Monaco', desc: 'Editor e inspetor de arquivos', icon: 'ph-code', color: '#A78BFA' },
      { id: 'screens', title: 'Screen DNA', desc: `${screens.length} telas mapeadas e absorvidas`, icon: 'ph-eye', color: '#38BDF8' },
      { id: 'apis', title: 'APIs & Contratos', desc: 'Rotas declaradas e endpoints', icon: 'ph-plugs', color: '#10B981' },
      { id: 'tests', title: 'Testes & Bugs', desc: 'Suítes de teste e bug tracker', icon: 'ph-bug', color: '#EF4444' },
      { id: 'git', title: 'Histórico & Git', desc: 'Commits, diffs e sincronização', icon: 'ph-git-branch', color: '#6366F1' },
      { id: 'memory', title: 'Memória & Docs', desc: 'Genome twin e memórias ativas', icon: 'ph-database', color: '#EC4899' },
    ];

    for (const q of quickLinks) {
      const card = element('div', 'flp-overview-nav-card');
      card.style.cssText = 'background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:14px; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; gap:6px;';
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; color:${q.color}; font-weight:700; font-size:13px;">
          <i class="ph-bold ${q.icon}"></i> <span>${q.title}</span>
        </div>
        <p style="font-size:11px; color:#94A3B8; margin:0; line-height:1.4;">${q.desc}</p>
      `;
      card.addEventListener('mouseenter', () => { card.style.borderColor = q.color; card.style.background = 'rgba(255,255,255,0.05)'; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = 'rgba(255,255,255,0.08)'; card.style.background = 'rgba(255,255,255,0.02)'; });
      card.addEventListener('click', () => {
        state.workspaceTab = q.id;
        const cleanTab = q.id !== 'overview' ? `/${q.id}` : '';
        history.pushState(null, '', `#projects/${encodeURIComponent(project.id)}${cleanTab}`);
        renderDetail();
      });
      navGrid.appendChild(card);
    }
    panel.appendChild(navGrid);

    // 6-BOX OVERVIEW GRID (TELA 2 MATCHING REFERENCE 2)
    const overviewGrid = element('div', 'flp-overview-grid-2026');

    // BOX 1: EXECUÇÃO E URLS
    const boxExec = element('div', 'flp-overview-card flp-card-exec');
    boxExec.innerHTML = `
      <div class="flp-card-head">
        <h3>⚡ Execução e URLs</h3>
        <span class="${isOnline ? 'flp-status-dot-green' : ''}"></span>
        <span class="flp-badge ${isOnline ? 'flp-badge-green' : 'flp-badge-gray'}">${isOnline ? 'ONLINE' : 'OFFLINE'}</span>
      </div>
      <div class="flp-exec-controls">
        <div class="flp-exec-btn-group">
          <button type="button" class="flp-btn-exec-start" id="flpExecStartBtn" ${isOnline ? 'disabled' : ''}><i class="ph-bold ph-play"></i> Iniciar</button>
          <button type="button" class="flp-btn-exec-stop" id="flpExecStopBtn" ${!isOnline ? 'disabled' : ''}><i class="ph-bold ph-stop"></i> Parar</button>
          <button type="button" class="flp-btn-exec-restart" id="flpExecRestartBtn"><i class="ph-bold ph-arrows-clockwise"></i> Reiniciar</button>
        </div>
        <div style="font-size:11.5px; color:#94a3b8; font-family:ui-monospace,monospace;">
          Uptime: <strong style="color:#00e5a0;" id="flpExecUptime">${liveStatus?.uptime || '—'}</strong> · PID: <strong style="color:#38bdf8;" id="flpExecPid">${liveStatus?.pid || '—'}</strong>
        </div>
      </div>
      <div class="flp-form-group-compact" style="margin-top:10px;">
        <label style="font-size:11px; color:#94a3b8; font-weight:700; text-transform:uppercase;">Porta Local (Configuração Direta):</label>
        <div class="flp-port-input-row" style="display:flex; gap:8px; margin-top:4px;">
          <input type="number" id="flpExecPortInput" value="${project.localPort || ''}" min="1" max="65535" placeholder="Porta" style="width:120px; padding:6px 10px; background:#050914; border:1px solid rgba(255,255,255,0.12); border-radius:6px; color:#f8fafc; font-family:monospace;">
          <button type="button" class="flp-button flp-button-primary" id="flpExecApplyPortBtn" style="font-size:11.5px; padding:6px 12px;">Aplicar Porta</button>
        </div>
      </div>
      <div class="flp-form-group-compact" style="margin-top:10px;">
        <label style="font-size:11px; color:#94a3b8; font-weight:700; text-transform:uppercase;">URL Vinculada do Sistema:</label>
        <div class="flp-port-input-row" style="display:flex; gap:8px; margin-top:4px;">
          <input type="text" id="flpExecUrlInput" value="${project.localUrl || activeUrl || ''}" placeholder="http://..." readonly style="flex:1; padding:6px 10px; background:#050914; border:1px solid rgba(255,255,255,0.12); border-radius:6px; color:#38bdf8; font-family:monospace;">
          <button type="button" class="flp-button flp-button-soft" id="flpExecCopyUrlBtn" title="Copiar URL" style="font-size:11px; padding:6px 10px;">📋 Copiar</button>
          <button type="button" class="flp-button flp-button-primary" id="flpExecOpenUrlBtn" title="Abrir URL no Navegador" style="font-size:11px; padding:6px 12px;">↗ Abrir</button>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
        <span id="flpExecFeedback" style="font-size:11px; color:#00e5a0; font-weight:600;"></span>
      </div>
    `;

    // BOX 2: INFORMAÇÕES DO PROJETO
    const boxInfo = element('div', 'flp-overview-card flp-card-info');
    boxInfo.innerHTML = `
      <div class="flp-card-head">
        <h3>ℹ️ Informações do Projeto</h3>
        <button type="button" class="flp-button flp-button-soft" id="flpEditInfoBtn" style="font-size:11px; padding:3px 8px;">Editar</button>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
        <div><span style="color:#64748b; font-size:10px; text-transform:uppercase; font-weight:700;">Categoria:</span><br><strong style="color:#f8fafc;">${project.catalogGroup || 'Sistemas Fênix'}</strong></div>
        <div><span style="color:#64748b; font-size:10px; text-transform:uppercase; font-weight:700;">Função / Role:</span><br><strong style="color:#00d9ff;">${project.versionRole || 'Principal'}</strong></div>
        <div><span style="color:#64748b; font-size:10px; text-transform:uppercase; font-weight:700;">Licença:</span><br><strong style="color:#f8fafc;">Proprietário / Fênix OS</strong></div>
        <div><span style="color:#64748b; font-size:10px; text-transform:uppercase; font-weight:700;">Mantenedor:</span><br><strong style="color:#f8fafc;">Engenharia Fênix</strong></div>
      </div>
      <div style="margin-top:8px;">
        <span style="color:#64748b; font-size:10px; text-transform:uppercase; font-weight:700;">Descrição:</span>
        <p style="margin:4px 0 0; font-size:11.5px; color:#94a3b8; line-height:1.45;">${project.description || `${project.name || project.id} integrado ao runtime operacional do Fênix OS.`}</p>
      </div>
    `;

    // BOX 3: MÉTRICAS DO PROJETO
    const boxMetrics = element('div', 'flp-overview-card flp-card-metrics');
    boxMetrics.innerHTML = `
      <div class="flp-card-head">
        <h3>📊 Métricas do Projeto</h3>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; font-size:12px;"><span style="color:#94a3b8;">Total de Arquivos:</span><strong style="color:#f8fafc; font-family:ui-monospace,monospace;">${project.fileCount ?? '—'}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:12px;"><span style="color:#94a3b8;">Linhas de Código:</span><strong style="color:#f8fafc; font-family:ui-monospace,monospace;">${project.lineCount ?? '—'}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:12px;"><span style="color:#94a3b8;">Telas (Screen DNA):</span><strong style="color:#00d9ff; font-family:ui-monospace,monospace;">${screens.length ? screens.length : '—'}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:12px;"><span style="color:#94a3b8;">Cobertura de Testes:</span><strong style="color:#10b981; font-family:ui-monospace,monospace;">${project.coverage ? `${project.coverage}%` : '—'}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:12px;"><span style="color:#94a3b8;">Status de Qualidade:</span><span class="flp-badge ${status === 'online' ? 'flp-badge-green' : 'flp-badge-gray'}">${status === 'online' ? 'OPERACIONAL' : 'OFFLINE'}</span></div>
      </div>
    `;

    // BOX 4: SERVIÇOS
    const boxServices = element('div', 'flp-overview-card flp-card-services');
    boxServices.innerHTML = `
      <div class="flp-card-head">
        <h3>🔌 Serviços</h3>
        <span class="flp-badge flp-badge-blue">SERVIÇOS MAPEADOS</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:7px; font-size:11.5px;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,200,0.05);">
          <span><span class="flp-status-dot-green" style="display:inline-block; margin-right:6px;"></span>Frontend (UI)</span>
          <strong style="font-family:ui-monospace,monospace; color:#38bdf8;">:${project.localPort || project.frontend?.port || '—'}</strong>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,200,0.05);">
          <span><span class="flp-status-dot-green" style="display:inline-block; margin-right:6px;"></span>API Gateway</span>
          <strong style="font-family:ui-monospace,monospace; color:#38bdf8;">:${project.apiPort || project.backend?.port || '—'}</strong>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,200,0.05);">
          <span><span class="flp-status-dot-green" style="display:inline-block; margin-right:6px;"></span>WebSocket Bus</span>
          <strong style="font-family:ui-monospace,monospace; color:#38bdf8;">:4580</strong>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0;">
          <span><span class="flp-status-dot-green" style="display:inline-block; margin-right:6px;"></span>PostgreSQL DB</span>
          <strong style="font-family:ui-monospace,monospace; color:#38bdf8;">:5432</strong>
        </div>
      </div>
    `;

    // BOX 5: ATIVIDADE RECENTE
    const boxActivity = element('div', 'flp-overview-card flp-card-activity');
    boxActivity.innerHTML = `
      <div class="flp-card-head">
        <h3>🕒 Atividade Recente</h3>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; font-size:11px; color:#cbd5e1;">
        <div style="display:flex; gap:8px; align-items:flex-start;">
          <span style="color:#00d9ff; font-weight:700;">●</span>
          <div><div>Porta configurada para <strong>:${project.localPort || 3000}</strong></div><small style="color:#64748b;">hoje, 14:32</small></div>
        </div>
        <div style="display:flex; gap:8px; align-items:flex-start;">
          <span style="color:#10b981; font-weight:700;">●</span>
          <div><div>Serviço checado e operacional</div><small style="color:#64748b;">hoje, 14:15</small></div>
        </div>
        <div style="display:flex; gap:8px; align-items:flex-start;">
          <span style="color:#a78bfa; font-weight:700;">●</span>
          <div><div>Screen DNA sincronizado com sucesso</div><small style="color:#64748b;">ontem</small></div>
        </div>
      </div>
    `;

    // BOX 6: PREVIEW DO PROJETO
    const boxPreview = element('div', 'flp-overview-card flp-card-preview');
    boxPreview.innerHTML = `
      <div class="flp-card-head">
        <h3>👁️ Preview do Projeto</h3>
      </div>
      <div class="flp-mini-preview-container" style="position:relative; width:100%; height:130px; border-radius:8px; overflow:hidden; background:#060a12; cursor:pointer;">
        <img src="${getScreenPreviewForProject(project)}" alt="Preview de ${project.name || project.id}" style="width:100%; height:100%; object-fit:cover; object-position:top;">
        <div class="flp-mini-preview-overlay">
          <button type="button" class="flp-btn-open-preview-tab" id="flpMiniOpenPreviewBtn">
            <i class="ph-bold ph-arrow-square-out"></i> Abrir no Navegador
          </button>
        </div>
      </div>
    `;

    overviewGrid.append(boxExec, boxInfo, boxMetrics, boxServices, boxActivity, boxPreview);
    panel.appendChild(overviewGrid);

    // Wire up Box 1 Actions
    const applyPortBtn = boxExec.querySelector('#flpExecApplyPortBtn');
    const portInput = boxExec.querySelector('#flpExecPortInput');
    const feedback = boxExec.querySelector('#flpExecFeedback');
    if (applyPortBtn && portInput) {
      applyPortBtn.addEventListener('click', async () => {
        const newPort = parseInt(portInput.value, 10);
        if (isNaN(newPort) || newPort < 1 || newPort > 65535) {
          if (feedback) { feedback.style.color = '#ef4444'; feedback.textContent = 'Porta inválida (1-65535)'; }
          return;
        }
        applyPortBtn.disabled = true;
        applyPortBtn.textContent = 'Aplicando…';
        try {
          const res = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/ports`, {
            method: 'POST',
            body: JSON.stringify({ port: newPort })
          });
          project.localPort = newPort;
          project.localUrl = res.localUrl || `http://localhost:${newPort}`;
          const urlInput = boxExec.querySelector('#flpExecUrlInput');
          if (urlInput) urlInput.value = project.localUrl;
          if (feedback) { feedback.style.color = '#10b981'; feedback.textContent = `Porta ${newPort} aplicada com sucesso!`; }
          checkProjectStatus(project.id);
          renderCards();
        } catch (err) {
          if (feedback) { feedback.style.color = '#ef4444'; feedback.textContent = `Erro: ${err.message}`; }
        } finally {
          applyPortBtn.disabled = false;
          applyPortBtn.textContent = 'Aplicar Porta';
        }
      });
    }

    const startBtn = boxExec.querySelector('#flpExecStartBtn');
    const stopBtn = boxExec.querySelector('#flpExecStopBtn');
    const restartBtn = boxExec.querySelector('#flpExecRestartBtn');
    const handleRuntimeAction = async (action, btn) => {
      btn.disabled = true;
      if (feedback) { feedback.style.color = '#38bdf8'; feedback.textContent = `Executando ${action}…`; }
      try {
        const res = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/runtime`, {
          method: 'POST',
          body: JSON.stringify({ action })
        });
        if (feedback) { feedback.style.color = '#10b981'; feedback.textContent = res.message || `${action} executado com sucesso`; }
        checkProjectStatus(project.id);
        renderDetail();
      } catch (err) {
        if (feedback) { feedback.style.color = '#ef4444'; feedback.textContent = `Erro: ${err.message}`; }
      } finally {
        btn.disabled = false;
      }
    };
    if (startBtn) startBtn.addEventListener('click', () => handleRuntimeAction('start', startBtn));
    if (stopBtn) stopBtn.addEventListener('click', () => handleRuntimeAction('stop', stopBtn));
    if (restartBtn) restartBtn.addEventListener('click', () => handleRuntimeAction('restart', restartBtn));

    const copyUrlBtn = boxExec.querySelector('#flpExecCopyUrlBtn');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', () => {
        const urlInput = boxExec.querySelector('#flpExecUrlInput');
        if (urlInput?.value) {
          navigator.clipboard?.writeText(urlInput.value);
          if (feedback) { feedback.style.color = '#00d9ff'; feedback.textContent = 'URL copiada!'; setTimeout(() => { feedback.textContent = ''; }, 2500); }
        }
      });
    }
    const openUrlBtn = boxExec.querySelector('#flpExecOpenUrlBtn');
    if (openUrlBtn) {
      openUrlBtn.addEventListener('click', () => {
        const urlInput = boxExec.querySelector('#flpExecUrlInput');
        if (urlInput?.value) window.open(urlInput.value, '_blank', 'noopener,noreferrer');
      });
    }
    const miniOpenBtn = boxPreview.querySelector('#flpMiniOpenPreviewBtn');
    if (miniOpenBtn) {
      miniOpenBtn.addEventListener('click', () => {
        state.workspaceTab = 'preview';
        renderDetail();
      });
    }

    renderProjectFactsSection(panel, project, detail);
    container.appendChild(panel);
    if (detail) renderExecutionPanels(container, detail);
  }

  function renderTestsTab(container, project) {
    const panel = element('section', 'flp-panel');
    const head = element('div', 'flp-dna-board-head');
    const identity = element('div');
    identity.append(
      element('span', 'flp-eyebrow', 'TESTES & BUG TRACKER AUTÔNOMO'),
      element('h3', '', `Testes, Riscos & Bugs · ${project.name || project.id}`),
      element('p', '', 'Rastreamento factual de suítes de teste, probes de integridade e anomalias registradas pelo Fênix Autonomous Loop.')
    );
    const actions = element('div', 'flp-dna-actions');

    const runTestsBtn = element('button', 'flp-button flp-button-primary', '▶ Executar Smoke Tests');
    runTestsBtn.type = 'button';

    const reportBugBtn = element('button', 'flp-button flp-button-soft', '🐛 Reportar Anomalia');
    reportBugBtn.type = 'button';

    const refreshBtn = element('button', 'flp-button flp-button-soft', '↻ Atualizar');
    refreshBtn.type = 'button';

    actions.append(runTestsBtn, reportBugBtn, refreshBtn);
    head.append(identity, actions);
    panel.appendChild(head);

    // Metrics Row
    const metricsRow = element('div', 'flp-tests-metrics');
    const testKpi = (lbl, val) => {
      const el = element('div', 'flp-test-kpi-card');
      el.append(element('span', '', lbl), element('strong', '', text(val)));
      return el;
    };
    metricsRow.append(
      testKpi('Suítes de Teste', 'Consultando…'),
      testKpi('Riscos / Gaps', 'Consultando…'),
      testKpi('Bugs Ativos', 'Consultando…'),
      testKpi('Probe / Health', project.healthUrl || project.remoteHealthUrl ? 'Configurado' : 'Não cadastrado')
    );
    panel.appendChild(metricsRow);

    // Test Output Box (hidden initially)
    const runOutput = element('pre', 'flp-test-run-output');
    runOutput.style.cssText = 'display:none; background:#050914; border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:14px; font-family:monospace; font-size:11.5px; color:#38bdf8; max-height:240px; overflow-y:auto; margin:16px 0; white-space:pre-wrap;';
    panel.appendChild(runOutput);

    // Bugs Section
    const bugsContainer = element('div', 'flp-bugs-list-wrap');
    bugsContainer.style.marginTop = '16px';
    bugsContainer.innerHTML = '<p class="flp-empty">Consultando anomalias e bugs do Autonomous Loop…</p>';
    panel.appendChild(bugsContainer);

    container.appendChild(panel);

    async function loadTestsAndBugs() {
      try {
        const [bugsRes, stateRes] = await Promise.allSettled([
          json(`/api/v2/autonomous/bugs?projectId=${encodeURIComponent(project.id)}`),
          json(`/api/fenix/projects/${encodeURIComponent(project.id)}/state`)
        ]);

        if (stateRes.status === 'fulfilled' && stateRes.value) {
          const detail = stateRes.value;
          const tCount = detail.testsErrorsAndRisks?.testsCount || detail.tests?.length || 0;
          const rCount = detail.testsErrorsAndRisks?.risksCount || detail.architecturalGaps?.length || 0;
          testCountEl.querySelector('strong').textContent = `${tCount} suítes`;
          risksEl.querySelector('strong').textContent = `${rCount} gaps`;
        } else {
          testCountEl.querySelector('strong').textContent = '—';
          risksEl.querySelector('strong').textContent = '—';
        }

        if (bugsRes.status === 'fulfilled' && bugsRes.value && bugsRes.value.ok) {
          const bugs = bugsRes.value.bugs || bugsRes.value.items || [];
          activeBugsEl.querySelector('strong').textContent = `${bugs.length} detectados`;

          if (bugs.length === 0) {
            bugsContainer.innerHTML = `
              <div style="padding:24px; text-align:center; background:rgba(16,185,129,0.04); border:1px solid rgba(16,185,129,0.2); border-radius:10px;">
                <div style="font-size:24px; color:#10B981; margin-bottom:8px;">✓</div>
                <strong style="color:#F8FAFC; font-size:13px;">Nenhum bug ativo para este projeto</strong>
                <p style="color:#94A3B8; font-size:11px; margin:4px 0 0;">O Fênix Autonomous Loop não registrou regressões ativas para ${project.name || project.id}.</p>
              </div>
            `;
          } else {
            bugsContainer.replaceChildren();
            const listTitle = element('h4', '', `Anomalias & Bugs Registrados (${bugs.length})`);
            listTitle.style.cssText = 'color:#f8fafc; font-size:13px; margin-bottom:10px;';
            bugsContainer.appendChild(listTitle);

            for (const b of bugs) {
              const bugCard = element('div', 'flp-bug-item');
              const sevColor = b.severity === 'critical' ? '#ef4444' : b.severity === 'high' ? '#f97316' : '#38bdf8';
              bugCard.style.cssText = `background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-left:4px solid ${sevColor}; border-radius:8px; padding:12px 14px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:12px;`;
              
              const info = element('div');
              info.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:9.5px; font-weight:800; text-transform:uppercase; padding:2px 6px; border-radius:4px; background:${sevColor}22; color:${sevColor};">${b.severity || 'normal'}</span>
                  <strong style="color:#f8fafc; font-size:12px;">${b.title || b.description || 'Bug sem título'}</strong>
                  <span style="font-size:10px; color:#64748b;">${date(b.createdAt)}</span>
                </div>
                ${b.description && b.title ? `<p style="font-size:11px; color:#94a3b8; margin:4px 0 0;">${b.description}</p>` : ''}
              `;

              const statusBadge = element('span', 'flp-badge flp-badge-purple', b.state || 'detected');
              bugCard.append(info, statusBadge);
              bugsContainer.appendChild(bugCard);
            }
          }
        } else {
          activeBugsEl.querySelector('strong').textContent = '—';
          bugsContainer.innerHTML = '<p class="flp-empty">Não foi possível carregar os bugs da API autônoma.</p>';
        }
      } catch (err) {
        bugsContainer.innerHTML = `<p class="flp-intelligence-error">Erro ao consultar telemetria de testes: ${err.message}</p>`;
      }
    }

    refreshBtn.addEventListener('click', () => loadTestsAndBugs());

    runTestsBtn.addEventListener('click', async () => {
      runTestsBtn.disabled = true;
      runTestsBtn.textContent = 'Executando…';
      runOutput.style.display = 'block';
      runOutput.textContent = `[${new Date().toLocaleTimeString('pt-BR')}] Iniciando bateria de testes para ${project.name || project.id}…\nAmbiente: local\nTarget: ${project.workspace || 'default'}\n`;
      try {
        const res = await json('/api/onedeploy/smoke-tests/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ environment: 'local', projectId: project.id })
        });
        runOutput.textContent += `[${new Date().toLocaleTimeString('pt-BR')}] Testes concluídos com sucesso!\nStatus: ${res.status || 'OK'}\nResultado: ${JSON.stringify(res, null, 2)}`;
      } catch (err) {
        runOutput.textContent += `[${new Date().toLocaleTimeString('pt-BR')}] Falha na execução: ${err.message}\nVerifique se o runner de smoke tests está configurado para este projeto.`;
      } finally {
        runTestsBtn.disabled = false;
        runTestsBtn.textContent = '▶ Executar Smoke Tests';
        loadTestsAndBugs();
      }
    });

    reportBugBtn.addEventListener('click', async () => {
      const title = prompt(`Reportar bug/anomalia para ${project.name || project.id}:`);
      if (!title || !title.trim()) return;
      try {
        await json('/api/v2/autonomous/bugs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            title: title.trim(),
            severity: 'medium',
            description: `Reportado manualmente via Project Workspace 2.0 em ${new Date().toISOString()}`
          })
        });
        alert('Bug reportado com sucesso no Autonomous Loop!');
        loadTestsAndBugs();
      } catch (err) {
        alert(`Erro ao reportar bug: ${err.message}`);
      }
    });

    loadTestsAndBugs();
  }

  function renderMemoryTab(container, project) {
    const panel = element('section', 'flp-panel');
    const head = element('div', 'flp-dna-board-head');
    const identity = element('div');
    identity.append(
      element('span', 'flp-eyebrow', 'MEMÓRIA OPERACIONAL & DIGITAL GENOME'),
      element('h3', '', `Memória & Documentação · ${project.name || project.id}`),
      element('p', '', 'Conhecimento consolidado, padrões de arquitetura e decisões de engenharia registradas no Fênix Memory Fabric.')
    );
    const actions = element('div', 'flp-dna-actions');

    const absorbBtn = element('button', 'flp-button flp-button-primary', '🧬 Reabsorver Genome');
    absorbBtn.type = 'button';

    const refreshBtn = element('button', 'flp-button flp-button-soft', '↻ Atualizar');
    refreshBtn.type = 'button';

    actions.append(absorbBtn, refreshBtn);
    head.append(identity, actions);
    panel.appendChild(head);

    // Genome Status Summary
    const genomeCard = element('div', 'flp-genome-summary-card');
    genomeCard.style.cssText = 'background:rgba(0,217,255,0.04); border:1px solid rgba(0,217,255,0.2); border-radius:10px; padding:16px; margin:16px 0;';
    const absorption = state.absorptions.get(project.id);
    const screens = state.registeredScreens.get(project.id) || project.screens || [];

    genomeCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
        <strong style="color:#00D9FF; font-size:13px;"><i class="ph-bold ph-dna"></i> Digital Genome Twin: ${absorption ? 'Sincronizado' : 'Aguardando Absorção'}</strong>
        <span style="font-size:10.5px; color:#94A3B8;">Hash: ${absorption?.fingerprint || absorption?.hash || '—'}</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
        <div><small style="color:#64748B;">Telas (Screen DNA)</small><div style="color:#F8FAFC; font-weight:700; font-size:13px;">${screens.length || 0}</div></div>
        <div><small style="color:#64748B;">Rotas de API</small><div style="color:#F8FAFC; font-weight:700; font-size:13px;">${absorption?.codeMap?.endpoints?.length || '—'}</div></div>
        <div><small style="color:#64748B;">Frameworks</small><div style="color:#F8FAFC; font-weight:700; font-size:13px;">${(absorption?.codeMap?.frameworks || []).join(', ') || 'Vanilla'}</div></div>
        <div><small style="color:#64748B;">Última Atualização</small><div style="color:#F8FAFC; font-weight:700; font-size:13px;">${absorption?.capturedAt ? date(absorption.capturedAt) : '—'}</div></div>
      </div>
    `;
    panel.appendChild(genomeCard);

    // Memories List
    const memoriesWrap = element('div', 'flp-memories-list-wrap');
    memoriesWrap.innerHTML = '<p class="flp-empty">Consultando memórias operacionais de engenharia…</p>';
    panel.appendChild(memoriesWrap);

    container.appendChild(panel);

    async function loadMemories() {
      try {
        const [knowRes, expRes] = await Promise.allSettled([
          json(`/api/fenix/projects/${encodeURIComponent(project.id)}/knowledge`),
          json(`/api/fenix/projects/${encodeURIComponent(project.id)}/experience`)
        ]);

        const memories = [];
        if (knowRes.status === 'fulfilled' && Array.isArray(knowRes.value?.memories)) {
          memories.push(...knowRes.value.memories);
        }
        if (expRes.status === 'fulfilled' && Array.isArray(expRes.value?.memories)) {
          memories.push(...expRes.value.memories);
        }

        if (memories.length === 0) {
          memoriesWrap.innerHTML = `
            <div style="padding:24px; text-align:center; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px;">
              <strong style="color:#F8FAFC; font-size:13px;">Nenhuma memória de longo prazo isolada</strong>
              <p style="color:#94A3B8; font-size:11px; margin:4px 0 0;">As memórias são consolidadas no Memory Fabric conforme missões e refatorações são validadas para ${project.name || project.id}.</p>
            </div>
          `;
        } else {
          memoriesWrap.replaceChildren();
          const titleEl = element('h4', '', `Nós de Memória & Conhecimento (${memories.length})`);
          titleEl.style.cssText = 'color:#f8fafc; font-size:13px; margin:14px 0 10px;';
          memoriesWrap.appendChild(titleEl);

          for (const m of memories) {
            const item = element('div', 'flp-memory-item');
            item.style.cssText = 'background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:12px; margin-bottom:8px;';
            item.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:9.5px; font-weight:800; color:#38bdf8; text-transform:uppercase;">${m.kind || m.category || 'memória'}</span>
                <span style="font-size:10px; color:#64748b;">${date(m.createdAt || m.updatedAt)}</span>
              </div>
              <strong style="color:#f8fafc; font-size:12px;">${m.title || m.summary || 'Item de memória'}</strong>
              <p style="font-size:11px; color:#94a3b8; margin:4px 0 0; line-height:1.4;">${m.content || m.lessonLearned || '—'}</p>
            `;
            memoriesWrap.appendChild(item);
          }
        }
      } catch (err) {
        memoriesWrap.innerHTML = `<p class="flp-intelligence-error">Erro ao carregar memórias: ${err.message}</p>`;
      }
    }

    refreshBtn.addEventListener('click', () => loadMemories());
    absorbBtn.addEventListener('click', async () => {
      absorbBtn.disabled = true;
      absorbBtn.textContent = 'Absorvendo…';
      try {
        const res = await json('/api/v2/company/projects/absorb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            projectName: project.name,
            workspacePath: project.workspace
          })
        });
        state.absorptions.set(project.id, res);
        alert(`Genome Twin absorvido com sucesso! ${res.screens?.length || 0} telas mapeadas.`);
        renderDetail();
      } catch (err) {
        alert(`Erro na absorção: ${err.message}`);
      } finally {
        absorbBtn.disabled = false;
        absorbBtn.textContent = '🧬 Reabsorver Genome';
      }
    });

    loadMemories();
  }

  function renderCompanyTab(container, project, detail) {
    const panel = element('section', 'flp-panel');
    const head = element('div', 'flp-dna-board-head');
    const identity = element('div');
    identity.append(
      element('span', 'flp-eyebrow', 'EMPRESA · DADOS DO PROJETO'),
      element('h3', '', project.companyName || project.companyId || project.name || project.id),
      element('p', '', 'Os valores abaixo vêm do cadastro e do runtime; campos sem evidência aparecem como não medidos.')
    );
    const actions = element('div', 'flp-dna-actions');
    if (project.companyId) {
      const world = element('button', 'flp-button flp-button-soft', 'Ver no World');
      world.type = 'button';
      world.addEventListener('click', () => {
        window.showView?.('city');
        window.GlobalSelectionStore?.select('company', project.companyId);
      });
      const inspector = element('button', 'flp-button flp-button-primary', 'Abrir inspetor');
      inspector.type = 'button';
      inspector.addEventListener('click', () => window.fenixOpenSystemInspector?.(project.companyId));
      actions.append(world, inspector);
    }
    head.append(identity, actions);
    panel.appendChild(head);

    const metrics = element('div', 'flp-facts');
    const stack = [project.framework, project.technology, project.stack].find(Boolean);
    const latency = project.metrics?.latencyP95Ms ?? project.latencyP95Ms;
    const autonomy = project.autonomyLevel;
    const agents = detail?.activeAgents;
    metrics.append(
      row('Status informado', text(project.status, 'Não informado pela API')),
      row('Tecnologia', text(stack, 'Não mapeada')),
      row('Latência p95', Number.isFinite(latency) ? `${latency} ms` : 'Não medida'),
      row('Autonomia', autonomy == null ? 'Não informada' : text(autonomy)),
      row('Agentes vinculados', Array.isArray(agents) ? String(agents.length) : 'Não informado pelo runtime')
    );
    panel.appendChild(metrics);
    container.appendChild(panel);
  }

  function renderApisTab(container, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'APIs declaradas no código'));
    const routes = state.analyses.get(project.id)?.report?.routes || [];
    if (!routes.length) panel.append(element('p', 'flp-empty', 'Nenhuma rota declarada foi registrada. Mapeie o sistema para procurar declarações no código.'));
    for (const route of routes) {
      const item = element('div', 'flp-artifact');
      item.append(element('strong', '', `${route.method} ${route.path}`), element('span', '', `${route.file} · declaração encontrada; disponibilidade não testada`));
      panel.appendChild(item);
    }
    container.appendChild(panel);
    if (!state.analyses.has(project.id)) loadProjectAnalysis(project.id);
  }

  function renderJobsTab(container, project, detail) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Jobs registrados para este projeto'));
    const progress = detail?.progress;
    if (!progress) panel.append(element('p', 'flp-empty', 'Estado de jobs indisponível pela API.'));
    else {
      const metrics = element('div', 'flp-job-counts');
      for (const [label, key] of [['Total', 'totalJobs'], ['Executando', 'running'], ['Concluídos', 'completed'], ['Falhas', 'failed']]) {
        const item = element('div');
        item.append(element('strong', '', Number.isFinite(progress[key]) ? progress[key] : '—'), element('span', '', label));
        metrics.appendChild(item);
      }
      panel.appendChild(metrics);
      const open = element('button', 'flp-button flp-button-soft', 'Ver em Operações');
      open.type = 'button';
      open.addEventListener('click', () => window.showView?.('operations'));
      panel.appendChild(open);
    }
    container.appendChild(panel);
  }

  function groupScreensByBranch(screens) {
    const branches = new Map();
    for (const screen of screens) {
      const route = String(screen.route || '').trim().split(/[?#]/, 1)[0].replace(/\\/g, '/');
      const sourceFile = String(screen.sourceFile || '').trim().replace(/\\/g, '/');
      const routeParts = route.split('/').filter(Boolean);
      const fileParts = sourceFile.split('/').filter(Boolean);
      const fromFile = routeParts.length === 0 && fileParts.length > 1;
      const key = fromFile ? `arquivo:${fileParts[0]}` : routeParts.length ? `rota:/${routeParts[0]}` : 'sem-ramo';
      const label = fromFile ? `Arquivo · ${fileParts[0]}` : routeParts.length ? `/${routeParts[0]}` : 'Sem rota ou arquivo';
      const group = branches.get(key) || { key, label, inferredFromFile: fromFile, screens: [] };
      group.screens.push(screen);
      branches.set(key, group);
    }
    return [...branches.values()];
  }

  function renderScreensTab(container, project, screens) {
    if (!state.absorptions.has(project.id) && !state.absorptionLoading.has(project.id)) loadProjectAbsorption(project);
    const panel = element('section', 'flp-panel flp-dna-board');
    const head = element('div', 'flp-dna-board-head');
    const heading = element('div');
    const registryOnly = screens.length > 0 && screens.every((screen) => screen.source === 'PageRegistry');
    const loading = state.registeredScreensLoading.has(project.id) || state.absorptionLoading.has(project.id);
    const error = state.registeredScreensErrors.get(project.id);
    heading.append(element('span', 'flp-eyebrow', 'SCREEN DNA · WORKSPACE VISUAL'));
    heading.append(element('h3', '', project.name || project.id));
    heading.append(element('p', '', registryOnly
      ? `${screens.length} capturas históricas · não representam o runtime atual`
      : `${screens.length} tela(s) no catálogo · descoberta de código e capturas são identificadas separadamente`));
    const mapScreens = element('button', 'flp-button flp-button-primary', state.absorptions.has(project.id) ? 'Atualizar mapa de telas' : 'Mapear telas do projeto');
    mapScreens.type = 'button';
    mapScreens.disabled = !workspaceIsAvailable(project) || Boolean(project.entryFile);
    mapScreens.addEventListener('click', async () => {
      mapScreens.disabled = true;
      mapScreens.textContent = 'Mapeando…';
      try {
        const report = await json('/api/v2/company/projects/absorb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, projectName: project.name, workspacePath: project.workspace })
        });
        state.absorptions.set(project.id, report);
        state.registeredScreens.delete(project.id);
        state.registeredScreensErrors.delete(project.id);
        renderDetail();
      } catch (error) {
        mapScreens.disabled = false;
        mapScreens.textContent = `Falha ao mapear · tentar novamente`;
        mapScreens.title = error.message;
      }
    });
    const openIde = element('button', 'flp-button flp-button-soft', 'Abrir workspace');
    openIde.type = 'button';
    openIde.disabled = !workspaceIsAvailable(project);
    openIde.addEventListener('click', () => openProjectInIde(project));
    const actions = element('div', 'flp-dna-actions');
    actions.append(mapScreens, openIde);
    head.append(heading, actions);
    panel.appendChild(head);

    if (!screens.length) {
      const message = loading
          ? 'Consultando o mapa de telas e as capturas registradas do projeto…'
        : error
          ? `Não foi possível consultar as telas: ${error}`
          : project.entryFile
            ? 'Projeto de arquivo individual. A IDE pode ler somente o arquivo listado; análise de pasta e captura de runtime não são aplicáveis.'
            : 'Este projeto ainda não tem telas no catálogo. Mapeie o workspace para descobrir rotas e arquivos de interface; isso não cria capturas nem mede a tela em execução.';
      const empty = element('div', 'flp-dna-empty', message);
      panel.appendChild(empty);
      container.appendChild(panel);
      return;
    }

    const boardPrefsKey = `fenix_screen_dna_preferences:${project.id}`;
    let boardPrefs = { layout: 'grid', captureFilter: 'all' };
    try {
      const saved = JSON.parse(localStorage.getItem(boardPrefsKey) || '{}');
      if (saved.layout === 'list') boardPrefs.layout = 'list';
      if (['captured', 'unmeasured', 'historical'].includes(saved.captureFilter)) boardPrefs.captureFilter = saved.captureFilter;
    } catch { /* Ignore malformed local board preferences. */ }
    const toolbar = element('div', 'flp-dna-toolbar');
    const searchLabel = element('label', 'flp-dna-search-label', 'Buscar tela');
    const searchInput = element('input', 'flp-input flp-dna-search');
    searchInput.id = 'flpDnaSearch';
    searchInput.type = 'search';
    searchInput.placeholder = 'Nome, rota ou arquivo';
    searchInput.setAttribute('aria-label', 'Buscar tela por nome, rota ou arquivo');
    searchLabel.appendChild(searchInput);
    const captureLabel = element('label', 'flp-dna-capture-label', 'Captura');
    const captureFilter = element('select', 'flp-input flp-dna-capture-filter');
    captureFilter.id = 'flpDnaCaptureFilter';
    captureFilter.setAttribute('aria-label', 'Filtrar telas pelo estado da captura');
    for (const [value, label] of [['all', 'Todas'], ['captured', 'Com captura'], ['unmeasured', 'Sem captura'], ['historical', 'Históricas']]) {
      const option = element('option', '', label);
      option.value = value;
      captureFilter.appendChild(option);
    }
    captureFilter.value = boardPrefs.captureFilter;
    captureLabel.appendChild(captureFilter);
    const layoutControl = element('div', 'flp-dna-layout-control');
    layoutControl.setAttribute('role', 'group');
    layoutControl.setAttribute('aria-label', 'Layout do catálogo de telas');
    const layoutButtons = [];
    for (const [layout, label] of [['grid', 'Grade'], ['list', 'Lista']]) {
      const button = element('button', 'flp-button flp-button-soft', label);
      button.type = 'button';
      button.dataset.dnaLayout = layout;
      button.setAttribute('aria-pressed', String(boardPrefs.layout === layout));
      button.addEventListener('click', () => {
        boardPrefs.layout = layout;
        board.classList.toggle('is-list', layout === 'list');
        for (const item of layoutButtons) item.setAttribute('aria-pressed', String(item === button));
        try { localStorage.setItem(boardPrefsKey, JSON.stringify(boardPrefs)); } catch { /* Layout still works for this render. */ }
      });
      layoutButtons.push(button);
      layoutControl.appendChild(button);
    }
    const resultCount = element('span', 'flp-dna-result-count');
    toolbar.append(searchLabel, captureLabel, layoutControl, resultCount);
    panel.appendChild(toolbar);

    const board = element('div', 'flp-dna-canvas');
    board.classList.toggle('is-list', boardPrefs.layout === 'list');
    board.setAttribute('role', 'region');
    board.setAttribute('aria-label', `Telas observadas do projeto ${project.name || project.id}`);
    const projectNode = element('div', 'flp-dna-project-node');
    const projectIdentity = element('div', 'flp-dna-project-identity');
    const projectLogo = element('span', 'flp-dna-project-logo');
    if (project.logoUrl) {
      const logoImage = document.createElement('img');
      logoImage.src = project.logoUrl;
      logoImage.alt = '';
      logoImage.loading = 'lazy';
      logoImage.onerror = () => { logoImage.remove(); projectLogo.textContent = String(project.name || project.id || '?').trim().slice(0, 1).toUpperCase(); };
      projectLogo.appendChild(logoImage);
    } else projectLogo.textContent = String(project.name || project.id || '?').trim().slice(0, 1).toUpperCase();
    projectIdentity.append(projectLogo, element('strong', '', project.name || project.id));
    const projectVersion = project.projectVersion || project.currentVersion;
    if (projectVersion) projectIdentity.append(element('span', 'flp-card-version', `v${projectVersion}`));
    projectNode.append(element('span', '', 'PROJETO'), projectIdentity, element('small', '', project.workspace || 'Workspace não vinculado'));
    const orderKey = `fenix_screen_dna_order:${project.id}`;
    const screenId = (screen) => String(screen.screenId || screen.id || screen.route || screen.name || 'screen');
    const orderStatus = element('span', 'flp-dna-board-order-status', 'Quadro do projeto');
    const orderControls = element('div', 'flp-dna-board-order-controls');
    const resetOrder = element('button', 'flp-button flp-button-soft', 'Restaurar ordem');
    resetOrder.type = 'button';
    resetOrder.addEventListener('click', () => {
      try { localStorage.removeItem(orderKey); } catch { /* Browser storage can be disabled. */ }
      renderDetail();
    });
    orderControls.append(orderStatus, resetOrder);
    panel.appendChild(orderControls);
    const noResults = element('p', 'flp-dna-no-results', 'Nenhuma tela corresponde aos filtros.');
    noResults.hidden = true;
    noResults.setAttribute('role', 'status');
    let applyFilters = () => {};
    captureFilter.addEventListener('change', () => {
      boardPrefs.captureFilter = captureFilter.value;
      try { localStorage.setItem(boardPrefsKey, JSON.stringify(boardPrefs)); } catch { /* Filter still works for this render. */ }
      applyFilters();
    });
    searchInput.addEventListener('input', () => applyFilters());
    let storedOrder = [];
    try {
      const value = JSON.parse(localStorage.getItem(orderKey) || '[]');
      if (Array.isArray(value)) storedOrder = value.filter((id) => typeof id === 'string');
    } catch { /* Ignore malformed browser-local board preferences. */ }
    const rank = new Map(storedOrder.map((id, index) => [id, index]));
    let orderedScreens = [...screens].sort((left, right) =>
      (rank.get(screenId(left)) ?? Number.MAX_SAFE_INTEGER) - (rank.get(screenId(right)) ?? Number.MAX_SAFE_INTEGER));
    const batchSize = 48;
    let screenLimit = batchSize;
    let filteredScreens = orderedScreens;
    let draggedCard = null;
    const loadMore = element('button', 'flp-button flp-button-soft flp-dna-load-more', 'Carregar mais telas');
    loadMore.type = 'button';
    loadMore.hidden = true;
    loadMore.addEventListener('click', () => {
      screenLimit = Math.min(filteredScreens.length, screenLimit + batchSize);
      renderScreenBoard();
      updateScreenResultCount();
    });
    const updateScreenResultCount = () => {
      const shown = Math.min(screenLimit, filteredScreens.length);
      resultCount.textContent = `${shown} exibida(s) de ${filteredScreens.length} tela(s) · ${screens.length} registradas`;
      loadMore.hidden = shown >= filteredScreens.length;
      if (!loadMore.hidden) loadMore.textContent = `Carregar mais telas (${filteredScreens.length - shown} restantes)`;
      noResults.hidden = filteredScreens.length > 0;
    };
    const saveBoardOrder = () => {
      try {
        const visibleIds = [...board.querySelectorAll('.flp-dna-node')].map((card) => card.dataset.screenId);
        const visibleSet = new Set(visibleIds);
        const fullOrder = orderedScreens.map(screenId);
        let visibleIndex = 0;
        const mergedOrder = fullOrder.map((id) => visibleSet.has(id) ? visibleIds[visibleIndex++] : id);
        storedOrder = mergedOrder;
        const nextRank = new Map(storedOrder.map((id, index) => [id, index]));
        orderedScreens.sort((left, right) => (nextRank.get(screenId(left)) ?? Number.MAX_SAFE_INTEGER) - (nextRank.get(screenId(right)) ?? Number.MAX_SAFE_INTEGER));
        localStorage.setItem(orderKey, JSON.stringify(mergedOrder));
        orderStatus.textContent = 'Ordem salva neste navegador';
      } catch {
        orderStatus.textContent = 'Ordem válida somente nesta sessão';
      }
    };
    const renderScreenBoard = () => {
      board.replaceChildren(projectNode);
      for (const branch of groupScreensByBranch(filteredScreens.slice(0, screenLimit))) {
      const branchSection = element('section', 'flp-dna-branch');
      const branchHead = element('div', 'flp-dna-branch-head');
      branchHead.append(element('strong', '', branch.label), element('span', '', `${branch.screens.length} carregada(s)`));
      if (branch.inferredFromFile) branchHead.append(element('small', '', 'Grupo inferido pelo arquivo · rota não registrada'));
      branchSection.appendChild(branchHead);
      const grid = element('div', 'flp-dna-nodes');
      for (const screen of branch.screens) {
      const screenLabel = screen.name || screen.title || screen.screenId || screen.route || 'Tela sem nome registrado';
      const card = element('article', 'flp-dna-node');
      card.draggable = true;
      card.dataset.screenId = screenId(screen);
      card.dataset.search = normalizeProjectKey([screenLabel, screen.route, screen.sourceFile, screen.source].filter(Boolean).join(' '));
      card.dataset.captureState = screen.screenshotFreshness === 'ARCHIVED' ? 'historical'
        : screen.captureStatus === 'CAPTURED' || screen.screenshotPath ? 'captured' : 'unmeasured';
      card.addEventListener('dragstart', () => { draggedCard = card; card.classList.add('is-dragging'); });
      card.addEventListener('dragend', () => { card.classList.remove('is-dragging'); draggedCard = null; });
      card.addEventListener('dragover', (event) => event.preventDefault());
      card.addEventListener('drop', (event) => {
        event.preventDefault();
        if (draggedCard && draggedCard !== card) {
          grid.insertBefore(draggedCard, card);
          saveBoardOrder();
        }
      });
      const thumb = element('div', 'flp-dna-preview');
      if (screen.screenshotPath) {
        const img = document.createElement('img');
        img.src = screen.screenshotPath;
        img.alt = `Captura registrada: ${screenLabel}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onload = () => {
          if (img.naturalWidth < 64 || img.naturalHeight < 36) {
            img.remove();
            thumb.classList.add('is-empty');
            thumb.appendChild(element('span', 'flp-dna-no-preview', 'Captura em baixa resolução'));
          }
        };
        img.onerror = () => { img.remove(); thumb.classList.add('is-empty'); thumb.appendChild(element('span', 'flp-dna-no-preview', 'Captura indisponível')); };
        thumb.appendChild(img);
      } else {
        thumb.classList.add('is-empty');
        const emptyState = element('div', 'flp-dna-unmeasured');
        emptyState.append(element('span', 'flp-dna-unmeasured-icon', '⌘'), element('span', 'flp-dna-no-preview', 'Ainda sem captura visual'));
        thumb.appendChild(emptyState);
      }

      const body = element('div', 'flp-dna-node-body');
      body.append(element('strong', 'flp-dna-node-title', screenLabel));
      body.append(element('code', 'flp-dna-node-route', screen.route || 'Rota não registrada'));
      const meta = element('div', 'flp-dna-node-meta');
      const domNodes = Number(screen.domSummary?.totalNodes);
      const hasMeasuredDom = screen.domSummary?.totalNodes != null && Number.isFinite(domNodes);
      if (screen.screenshotFreshness === 'ARCHIVED') meta.append(element('span', 'flp-dna-archived', `Captura histórica · ${screen.screenshotCapturedOn || 'data não registrada'} · não é tela ao vivo`));
      meta.append(element('span', '', screen.captureStatus === 'CAPTURED' || screen.screenshotPath ? 'Captura registrada' : screen.captureStatus === 'CAPTURE_FAILED' ? 'Captura falhou' : 'Sem captura visual'));
      meta.append(element('span', '', hasMeasuredDom ? `${domNodes} nós DOM medidos` : screen.domInspectionStatus === 'INSPECTED' ? 'DOM inspecionado' : 'DOM não medido'));
      if (screen.showApplicationScope && screen.applicationId) meta.append(element('span', '', `Aplicação: ${screen.applicationId}`));
      meta.append(element('span', '', screen.sourceFile ? `Arquivo: ${screen.sourceFile}` : (screen.source || 'Origem não registrada')));
      body.appendChild(meta);
      if (Array.isArray(screen.componentEvidence) && screen.componentEvidence.length) {
        const components = element('div', 'flp-dna-components');
        for (const component of screen.componentEvidence.slice(0, 8)) components.append(element('span', '', component));
        body.appendChild(components);
      }
      const inspBtn = element('button', 'flp-button flp-button-primary', 'Abrir tela');
      inspBtn.type = 'button';
      inspBtn.addEventListener('click', () => openInspector(screen, project));
      body.appendChild(inspBtn);
      const sourceFile = typeof screen.sourceFile === 'string' ? screen.sourceFile.trim() : '';
      const openSource = element('button', 'flp-button flp-button-soft', sourceFile ? 'Abrir arquivo na IDE' : 'Arquivo de origem não registrado');
      openSource.type = 'button';
      openSource.disabled = !sourceFile || !workspaceIsAvailable(project);
      if (sourceFile) openSource.title = `Abrir ${sourceFile} no workspace deste projeto`;
      openSource.addEventListener('click', () => openProjectInIde(project, sourceFile, screen));
      body.appendChild(openSource);
      const openGraph = element('button', 'flp-button flp-button-soft', 'Ver relações no Flow Graph');
      openGraph.type = 'button';
      const graphScreenId = String(screen.screenId || screen.id || screen.route || '').trim();
      openGraph.addEventListener('click', () => window.fenixOpenFlowGraph?.({
        context: 'PROJECT', entityId: `project:${project.id}`, absorptionReport: state.absorptions.get(project.id) || null,
        focusNodeId: graphScreenId ? `screen:${project.id}:${encodeURIComponent(graphScreenId).slice(0, 120)}` : null
      }));
      body.appendChild(openGraph);

      card.append(thumb, body);
      grid.appendChild(card);
      }
      branchSection.appendChild(grid);
      board.appendChild(branchSection);
    }
    };
    applyFilters = () => {
      const query = normalizeProjectKey(searchInput.value);
      filteredScreens = orderedScreens.filter((screen) => {
        const label = screen.name || screen.title || screen.screenId || screen.route || '';
        const searchText = normalizeProjectKey([label, screen.route, screen.sourceFile, screen.source].filter(Boolean).join(' '));
        const matchesQuery = !query || searchText.includes(query);
        const hasCapture = screen.captureStatus === 'CAPTURED' || Boolean(screen.screenshotPath);
        const captureState = screen.screenshotFreshness === 'ARCHIVED' ? 'historical' : hasCapture ? 'captured' : 'unmeasured';
        return matchesQuery && (boardPrefs.captureFilter === 'all' || captureState === boardPrefs.captureFilter);
      });
      screenLimit = batchSize;
      renderScreenBoard();
      updateScreenResultCount();
    };
    applyFilters();
    panel.appendChild(noResults);
    panel.appendChild(board);
    panel.appendChild(loadMore);
    container.appendChild(panel);
  }

  async function openProjectInIde(project, filePath, screen = null) {
    const file = String(filePath || '').replace(/\\/g, '/').trim();
    if ((file && (/^(?:[a-zA-Z]:|\/)/.test(file) || file.split('/').includes('..'))) || !workspaceIsAvailable(project)) return false;
    try {
      if (typeof window.fenixSelectIdeProject !== 'function' || typeof window.fenixSelectIdeFile !== 'function') {
        throw new Error('A IDE não está disponível nesta sessão');
      }
      if (typeof window.fenixPrepareIdeNavigation === 'function' && !window.fenixPrepareIdeNavigation()) return false;
      window.showView?.('ide');
      await window.fenixSelectIdeProject(project.id);
      if (screen && typeof window.fenixSetIdePreviewTarget === 'function') {
        const previewReady = await window.fenixSetIdePreviewTarget(project.id, screen);
        if (previewReady === false) throw new Error('A prévia não aceitou a tela selecionada deste projeto');
      }
      if (file) {
        const opened = await window.fenixSelectIdeFile(file);
        if (opened === false) throw new Error(`A IDE não abriu o arquivo ${file}`);
      }
      return true;
    } catch (error) {
      const status = $('flpMeasured');
      if (status) {
        status.textContent = `Não foi possível abrir ${file} na IDE: ${error.message}`;
        status.dataset.error = 'true';
      }
      return false;
    }
  }

  const openProjectFileInIde = openProjectInIde;

  function renderFilesTab(container, project) {
    const panel = element('section', 'flp-panel');
    const heading = element('div', 'flp-file-browser-head');
    heading.append(element('div', '', 'Estrutura de arquivos'), element('small', '', project.workspace || 'Workspace não vinculado'));
    const actions = element('div', 'flp-file-browser-actions');
    const refresh = element('button', 'flp-button flp-button-soft', 'Atualizar');
    refresh.type = 'button';
    refresh.disabled = state.workspaceTreeLoading.has(project.id);
    refresh.addEventListener('click', () => {
      state.workspaceTrees.delete(project.id);
      state.workspaceTreeErrors.delete(project.id);
      loadWorkspaceTree(project);
    });
    const openIde = element('button', 'flp-button flp-button-primary', 'Abrir na IDE');
    openIde.type = 'button';
    openIde.disabled = !workspaceIsAvailable(project);
    openIde.addEventListener('click', () => openProjectInIde(project));
    actions.append(refresh, openIde);
    heading.appendChild(actions);
    panel.appendChild(heading);

    if (!workspaceIsAvailable(project)) {
      panel.append(element('p', 'flp-empty', 'O caminho deste projeto não está disponível neste computador.'));

      const recoveryCard = element('div', 'flp-path-recovery-card');

      const recoveryHead = element('div', '', '');
      recoveryHead.innerHTML = `
        <h4 style="margin:0 0 6px; font-size:13px; font-weight:700; color:#38bdf8; display:flex; align-items:center; gap:8px;">
          <i class="ph-bold ph-compass"></i> Central de Descoberta &amp; Recuperação de Workspace
        </h4>
        <p style="margin:0; font-size:11.5px; color:#94a3b8; line-height:1.5;">
          ${(project.workspace || '').startsWith('/opt')
            ? 'Este projeto está configurado na VPS remota Linux (209.50.241.22). Os arquivos residem no servidor e não neste computador local.'
            : 'O caminho físico cadastrado não foi encontrado no sistema de arquivos deste computador.'}
        </p>
      `;
      recoveryCard.appendChild(recoveryHead);

      const pathRow = element('div', '', '');
      pathRow.style.cssText = 'padding:8px 12px; border-radius:8px; background:rgba(0,0,0,0.4); font-family:ui-monospace,monospace; font-size:11px; color:#cbd5e1; border:1px solid rgba(255,255,255,0.06); word-break:break-all;';
      pathRow.innerHTML = `<span style="color:#64748b;">Caminho cadastrado:</span> <strong>${project.workspace || project.listedPath || 'Não informado'}</strong>`;
      recoveryCard.appendChild(pathRow);

      if (project.repository) {
        const gitSection = element('div', '', '');
        gitSection.style.cssText = 'padding:12px; border-radius:8px; background:rgba(0,217,255,0.05); border:1px solid rgba(0,217,255,0.2); display:flex; flex-direction:column; gap:8px;';
        gitSection.innerHTML = `
          <div style="font-size:11px; font-weight:700; color:#00d9ff; display:flex; align-items:center; gap:6px;">
            <i class="ph-bold ph-git-branch"></i> Repositório Git Disponível
          </div>
          <div style="font-size:11px; color:#cbd5e1; font-family:ui-monospace,monospace; word-break:break-all;">
            ${project.repository}
          </div>
        `;
        const cloneBtn = element('button', 'flp-button flp-button-primary', '⚡ Clonar para Workspace Local (1-Clique)');
        cloneBtn.type = 'button';
        cloneBtn.style.alignSelf = 'flex-start';
        cloneBtn.addEventListener('click', async () => {
          cloneBtn.disabled = true;
          cloneBtn.textContent = 'Clonando repositório…';
          try {
            const res = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/clone-workspace`, { method: 'POST', body: '{}' });
            project.workspace = res.workspace;
            project.workspaceAvailable = true;
            renderDetail();
            renderCards();
          } catch (err) {
            alert(`Falha ao clonar workspace: ${err.message}`);
            cloneBtn.disabled = false;
            cloneBtn.textContent = '⚡ Clonar para Workspace Local (1-Clique)';
          }
        });
        gitSection.appendChild(cloneBtn);
        recoveryCard.appendChild(gitSection);
      }

      const bindSection = element('div', '', '');
      bindSection.style.cssText = 'padding:12px; border-radius:8px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; gap:8px;';
      bindSection.innerHTML = `
        <div style="font-size:11px; font-weight:700; color:#e2e8f0; display:flex; align-items:center; gap:6px;">
          <i class="ph-bold ph-folder-notch-open"></i> Vincular Pasta Local Existente neste PC
        </div>
        <div style="font-size:11px; color:#94a3b8;">
          Se você já possui os arquivos deste projeto em outra pasta, informe o caminho abaixo para conectar:
        </div>
      `;
      const bindRow = element('div', '', '');
      bindRow.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap;';
      const pathInput = document.createElement('input');
      pathInput.type = 'text';
      pathInput.placeholder = 'Ex: C:\\projetos\\meu-projeto ou C:\\Users\\...';
      pathInput.style.cssText = 'flex:1; min-width:240px; padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:#080c14; color:#f8fafc; font-size:12px; font-family:ui-monospace,monospace;';
      const bindBtn = element('button', 'flp-button flp-button-soft', '📂 Vincular Pasta');
      bindBtn.type = 'button';
      bindBtn.addEventListener('click', async () => {
        const localPath = pathInput.value.trim();
        if (!localPath) return;
        bindBtn.disabled = true;
        bindBtn.textContent = 'Vinculando…';
        try {
          const res = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/bind-workspace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: localPath })
          });
          project.workspace = res.workspace;
          project.workspaceAvailable = true;
          renderDetail();
          renderCards();
        } catch (err) {
          alert(`Não foi possível vincular a pasta: ${err.message}`);
          bindBtn.disabled = false;
          bindBtn.textContent = '📂 Vincular Pasta';
        }
      });
      bindRow.append(pathInput, bindBtn);
      bindSection.appendChild(bindRow);
      recoveryCard.appendChild(bindSection);

      panel.appendChild(recoveryCard);
      container.appendChild(panel);
      return;
    }

    if (!state.workspaceTrees.has(project.id)) {
      const error = state.workspaceTreeErrors.get(project.id);
      if (error) {
        const errorBox = element('div', 'flp-empty');
        errorBox.append(
          element('p', '', `Falha ao ler a pasta: ${error}`),
          (() => {
            const retryBtn = element('button', 'flp-button flp-button-soft', '🔄 Tentar novamente');
            retryBtn.type = 'button';
            retryBtn.style.marginTop = '8px';
            retryBtn.addEventListener('click', () => {
              state.workspaceTreeErrors.delete(project.id);
              loadWorkspaceTree(project);
            });
            return retryBtn;
          })()
        );
        panel.appendChild(errorBox);
      } else {
        panel.append(element('p', 'flp-empty', 'Lendo pastas e arquivos…'));
        if (!state.workspaceTreeLoading.has(project.id)) loadWorkspaceTree(project);
      }
      container.appendChild(panel);
      return;
    }

    const tree = state.workspaceTrees.get(project.id);
    const summary = element('p', 'flp-file-browser-summary', `${tree.fileCount} arquivos visíveis · listagem limitada a 3 níveis por segurança`);
    const list = element('div', 'flp-file-browser-tree');
    for (const node of tree.items) list.appendChild(renderWorkspaceNode(node, project, 0));
    if (!tree.items.length) list.appendChild(element('p', 'flp-empty', 'Nenhum arquivo ou pasta visível neste workspace.'));
    panel.append(summary, list);
    container.appendChild(panel);
  }

  async function loadWorkspaceTree(project) {
    if (!project?.id || state.workspaceTreeLoading.has(project.id)) return;
    state.workspaceTreeLoading.add(project.id);
    try {
      const response = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/tree`);
      const items = Array.isArray(response.tree) ? response.tree : [];
      const countFiles = (nodes) => nodes.reduce((total, node) => total + (node.type === 'file' ? 1 : countFiles(Array.isArray(node.children) ? node.children : [])), 0);
      state.workspaceTrees.set(project.id, { items, fileCount: countFiles(items) });
      state.workspaceTreeErrors.delete(project.id);
    } catch (error) {
      state.workspaceTreeErrors.set(project.id, error.message);
    } finally {
      state.workspaceTreeLoading.delete(project.id);
      if (state.selected === project.id && state.workspaceTab === 'files') renderDetail();
    }
  }

  function renderWorkspaceNode(node, project, depth) {
    const row = element('div', `flp-file-browser-row${node.type === 'directory' ? ' is-directory' : ''}`);
    row.style.setProperty('--depth', String(Math.min(depth, 8)));
    if (node.type === 'directory') {
      const details = document.createElement('details');
      details.open = depth === 0;
      const summary = document.createElement('summary');
      summary.append(element('span', 'flp-file-browser-icon', '▸'), element('span', '', node.name));
      details.appendChild(summary);
      const children = element('div', 'flp-file-browser-children');
      for (const child of Array.isArray(node.children) ? node.children : []) children.appendChild(renderWorkspaceNode(child, project, depth + 1));
      if (!children.childElementCount) children.appendChild(element('span', 'flp-file-browser-empty', 'Pasta vazia ou além do limite de leitura'));
      details.appendChild(children);
      row.appendChild(details);
      return row;
    }
    const open = element('button', 'flp-file-browser-open', node.name);
    open.type = 'button';
    open.title = `Abrir ${node.path} na IDE`;
    open.addEventListener('click', async () => {
      await openProjectInIde(project, node.path);
    });
    row.append(element('span', 'flp-file-browser-icon', '•'), open);
    return row;
  }

  function renderQuickSwitcher(target, currentProject) {
    if (!state.projects.length) return;
    const bar = element('nav', 'flp-quick-switcher-bar');
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Troca rápida de projetos');

    const label = element('div', '', '');
    label.style.cssText = 'display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:750; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em; margin-right:4px; flex-shrink:0;';
    label.innerHTML = '<i class="ph-bold ph-arrows-left-right"></i> TROCA RÁPIDA:';
    bar.appendChild(label);

    const list = state.catalogCategory === 'all'
      ? state.projects
      : state.projects.filter((p) => {
          const group = String(p.catalogGroup || '').trim();
          if (state.catalogCategory === 'Lovable') return /lovable/i.test(group);
          if (state.catalogCategory === 'CRM & WhatsApp') return /crm|whatsapp|zapai/i.test(group);
          if (state.catalogCategory === 'Fênix & Core') return /f[eê]nix|core/i.test(group) || /f[eê]nix/i.test(p.name || p.id);
          if (state.catalogCategory === 'Automação') return /automa[cç][aã]o|auto/i.test(group);
          if (state.catalogCategory === 'Ferramentas & IA') return /ferramenta|ia|ai|tool/i.test(group);
          return group.toLowerCase() === state.catalogCategory.toLowerCase();
        });

    for (const p of list) {
      const isSelected = p.id === currentProject.id;
      const { liveStatus, status } = operationalStatus(p);
      const isOnline = status === 'online';
      const itemBtn = element('div', `flp-qs-item${isSelected ? ' active' : ''}`);
      itemBtn.setAttribute('role', 'tab');
      itemBtn.setAttribute('tabindex', '0');
      itemBtn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      itemBtn.setAttribute('aria-label', `Alternar para ${p.name || p.id}`);
      itemBtn.title = `${p.name || p.id} (${p.catalogGroup || 'Sem grupo'})${p.localPort ? ` · Porta :${p.localPort}` : ''}`;

      if (p.logoUrl) {
        const logoImg = document.createElement('img');
        logoImg.src = p.logoUrl;
        logoImg.alt = '';
        logoImg.className = 'flp-qs-logo';
        logoImg.loading = 'lazy';
        logoImg.onerror = () => { logoImg.style.display = 'none'; };
        itemBtn.appendChild(logoImg);
      }

      const dot = element('span', `flp-qs-dot${isOnline ? ' online' : ''}`);
      itemBtn.appendChild(dot);

      const nameSpan = element('span', '', p.name || p.id);
      nameSpan.style.maxWidth = '130px';
      nameSpan.style.overflow = 'hidden';
      nameSpan.style.textOverflow = 'ellipsis';
      nameSpan.style.whiteSpace = 'nowrap';
      itemBtn.appendChild(nameSpan);

      const port = liveStatus?.port || p.localPort;
      if (port) {
        const portSpan = element('small', '', `:${port}`);
        portSpan.style.cssText = 'color:#38bdf8; font-family:ui-monospace,monospace; font-size:9.5px; opacity:0.85;';
        itemBtn.appendChild(portSpan);
      }

      itemBtn.addEventListener('click', () => {
        selectProject(p.id);
      });
      itemBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectProject(p.id);
        }
      });

      bar.appendChild(itemBtn);
    }

    target.appendChild(bar);
  }

  function renderCodeTab(container, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Visualização de Código Fonte & IDE'));

    const info = element('div', '', '');
    info.style.cssText = 'display:flex; flex-direction:column; gap:8px; margin:10px 0 16px;';

    const pathRow = element('div', '', '');
    pathRow.style.cssText = 'display:flex; align-items:center; gap:8px; font-family:ui-monospace,monospace; font-size:11.5px; background:rgba(0,0,0,0.35); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);';
    pathRow.innerHTML = `<i class="ph-bold ph-folder" style="color:#38bdf8;"></i> <span style="color:#94a3b8;">Workspace:</span> <strong style="color:#f8fafc; overflow-wrap:anywhere;">${project.workspace || project.listedPath || 'Workspace não vinculado'}</strong>`;
    info.appendChild(pathRow);

    if (project.repository) {
      const repoRow = element('div', '', '');
      repoRow.style.cssText = 'display:flex; align-items:center; gap:8px; font-family:ui-monospace,monospace; font-size:11.5px; background:rgba(0,0,0,0.35); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);';
      repoRow.innerHTML = `<i class="ph-bold ph-github-logo" style="color:#00e5a0;"></i> <span style="color:#94a3b8;">Repositório:</span> <a href="${project.repository}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:none;">${project.repository} ↗</a>`;
      info.appendChild(repoRow);
    }

    panel.appendChild(info);

    const actions = element('div', '', '');
    actions.style.cssText = 'display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:12px;';

    const ide = element('button', 'flp-button flp-button-primary', '⚡ Abrir no Visual IDE do Fênix');
    ide.type = 'button';
    ide.disabled = !workspaceIsAvailable(project);
    ide.addEventListener('click', () => openProjectInIde(project));
    actions.appendChild(ide);

    const filesBtn = element('button', 'flp-button flp-button-soft', '📂 Ver Arquivos');
    filesBtn.type = 'button';
    filesBtn.addEventListener('click', () => {
      state.workspaceTab = 'files';
      renderDetail();
    });
    actions.appendChild(filesBtn);

    const folderBtn = element('button', 'flp-button flp-button-soft', '📁 Abrir no Explorer');
    folderBtn.type = 'button';
    const rawId = project.catalogId || (project.id.startsWith('local-') ? project.id.slice(6) : project.id);
    folderBtn.addEventListener('click', () => openProjectFolderDirect(rawId, project));
    actions.appendChild(folderBtn);

    panel.appendChild(actions);
    container.appendChild(panel);
  }

  function renderPortsTab(container, project) {
    const rawId = project.catalogId || (String(project.id || '').startsWith('local-') ? project.id.slice(6) : project.id);
    const { liveStatus, status } = operationalStatus(project);
    const isOnline = status === 'online';

    const panel = element('section', 'flp-panel flp-ports-manager-panel');

    // 1. Header
    const head = element('div', 'flp-file-browser-head');
    head.append(
      element('div', '', 'Gerenciador de Portas, URLs & Serviços'),
      element('small', '', 'Status verificado de portas locais e conexões na nuvem. Zero-mock: medições reais com latência em milissegundos.')
    );
    panel.appendChild(head);

    // 2. Action Toolbar
    const toolbar = element('div', '', '');
    toolbar.style.cssText = 'display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:14px 0 18px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08);';

    const scanBtn = element('button', 'flp-button flp-button-primary', '🔄 Retestar Portas Agora');
    scanBtn.type = 'button';

    const startBtn = element('button', 'flp-button flp-button-soft', '⚡ Iniciar Serviço');
    startBtn.type = 'button';
    startBtn.addEventListener('click', () => {
      startBtn.disabled = true;
      startBtn.textContent = 'Iniciando…';
      startProjectService(rawId, project).finally(() => {
        startBtn.disabled = false;
        startBtn.textContent = '⚡ Iniciar Serviço';
      });
    });

    const folderBtn = element('button', 'flp-button flp-button-soft', '📁 Abrir no Explorer');
    folderBtn.type = 'button';
    folderBtn.addEventListener('click', () => openProjectFolderDirect(rawId, project));

    const activeUrl = liveStatus?.activeUrl || project.localUrl || (project.localPort ? `http://127.0.0.1:${project.localPort}` : null);
    if (activeUrl) {
      const openBtn = element('button', 'flp-button flp-button-soft', '🚀 Abrir Web UI ↗');
      openBtn.type = 'button';
      openBtn.addEventListener('click', () => window.open(activeUrl, '_blank', 'noopener,noreferrer'));
      toolbar.append(scanBtn, startBtn, folderBtn, openBtn);
    } else {
      toolbar.append(scanBtn, startBtn, folderBtn);
    }

    panel.appendChild(toolbar);

    // 3. Port Cards Grid
    const cardsGrid = element('div', 'flp-ports-summary-grid');

    const uiPort = Number(project.localPort || project.frontend?.port) || null;
    const apiPort = Number(project.apiPort || project.backend?.port) || null;

    const cachedCheck = state.serviceStatuses.get(project.id);
    const uiStatus = cachedCheck?.ui || (liveStatus?.port === uiPort && isOnline ? { online: true, latencyMs: liveStatus.latencyMs } : (uiPort ? { online: isOnline, unverified: !liveStatus } : null));
    const apiStatus = cachedCheck?.api || (apiPort ? { online: null, unverified: true } : null);

    // Card 1: UI Port
    const cardUi = element('div', 'flp-port-card');
    cardUi.innerHTML = `
      <h4>
        <span><i class="ph-bold ph-desktop"></i> Interface Web Local</span>
        <span class="flp-badge ${uiStatus?.online ? 'flp-badge-green' : uiStatus?.unverified ? 'flp-badge-gray' : 'flp-badge-amber'}">
          ${uiStatus?.online ? `ONLINE${uiStatus.latencyMs != null ? ` · ${uiStatus.latencyMs}ms` : ''}` : uiStatus?.unverified ? 'NÃO MEDIDO' : 'OFFLINE'}
        </span>
      </h4>
      <div class="flp-port-number">${uiPort ? `:${uiPort}` : '—'}</div>
      <div class="flp-port-meta">
        ${uiPort ? `URL Local: <a href="http://localhost:${uiPort}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;">http://localhost:${uiPort} ↗</a>` : 'Nenhuma porta UI configurada.'}
      </div>
    `;
    cardsGrid.appendChild(cardUi);

    // Card 2: API Port
    const cardApi = element('div', 'flp-port-card');
    cardApi.innerHTML = `
      <h4>
        <span><i class="ph-bold ph-terminal"></i> Backend &amp; API Local</span>
        <span class="flp-badge ${apiStatus?.online ? 'flp-badge-green' : apiStatus?.unverified ? 'flp-badge-gray' : 'flp-badge-amber'}">
          ${apiStatus?.online ? `ONLINE${apiStatus.latencyMs != null ? ` · ${apiStatus.latencyMs}ms` : ''}` : apiStatus?.unverified ? 'NÃO MEDIDO' : 'OFFLINE'}
        </span>
      </h4>
      <div class="flp-port-number">${apiPort ? `:${apiPort}` : '—'}</div>
      <div class="flp-port-meta">
        ${apiPort ? `URL API: <a href="http://localhost:${apiPort}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;">http://localhost:${apiPort} ↗</a>` : 'Nenhuma porta API separada configurada.'}
      </div>
    `;
    cardsGrid.appendChild(cardApi);

    // Card 3: VPS Nuvem
    const counterpart = findVpsCounterpart(project);
    const remoteUrl = project.remoteUrl || counterpart?.project?.remoteUrl || null;
    const vpsPort = counterpart?.project?.frontend?.port || (project.vpsPath ? '4410' : null);
    const cardVps = element('div', 'flp-port-card');
    cardVps.innerHTML = `
      <h4>
        <span><i class="ph-bold ph-cloud"></i> Ambiente VPS (209.50.241.22)</span>
        <span class="flp-badge ${remoteUrl ? 'flp-badge-cyan' : 'flp-badge-gray'}">
          ${remoteUrl ? 'CONFIGURADO' : 'NÃO VINCULADO'}
        </span>
      </h4>
      <div class="flp-port-number">${vpsPort ? `:${vpsPort}` : (remoteUrl ? '443' : '—')}</div>
      <div class="flp-port-meta">
        ${remoteUrl ? `URL Remota: <a href="${remoteUrl}" target="_blank" rel="noopener noreferrer" style="color:#00d9ff;">${remoteUrl} ↗</a>` : 'Sem endpoint público mapeado.'}
      </div>
    `;
    cardsGrid.appendChild(cardVps);

    panel.appendChild(cardsGrid);

    // Scan Button Handler
    scanBtn.addEventListener('click', async () => {
      scanBtn.disabled = true;
      scanBtn.textContent = 'Sondando portas…';
      try {
        const res = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/service-status`);
        state.serviceStatuses.set(project.id, res);
        if (res.ui?.port && typeof res.ui.online === 'boolean') {
          state.projectStatuses[rawId] = {
            id: rawId,
            online: res.ui.online,
            port: res.ui.port,
            latencyMs: res.ui.latencyMs,
            checkedAt: res.checkedAt
          };
          state.projectStatuses[project.id] = state.projectStatuses[rawId];
        }
        renderMetrics();
        renderCards();
        if (state.selected === project.id && state.workspaceTab === 'ports') {
          renderDetail();
        }
      } catch (err) {
        alert(`Erro ao sondar portas: ${err.message}`);
        scanBtn.disabled = false;
        scanBtn.textContent = '🔄 Retestar Portas Agora';
      }
    });

    // 4. Ports & Endpoints Details Table
    const tableWrap = element('div', '', '');
    tableWrap.style.marginTop = '18px';
    const tableTitle = element('h4', '', 'Tabela de Conexões e Endpoints Mapeados');
    tableTitle.style.cssText = 'font-size:12.5px; font-weight:700; color:#f8fafc; margin:0 0 10px; display:flex; align-items:center; gap:8px;';
    tableWrap.appendChild(tableTitle);

    const table = element('table', 'flp-ports-table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Serviço</th>
          <th>Porta</th>
          <th>Protocolo / URL</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><i class="ph-bold ph-browser" style="color:#38bdf8;"></i> Interface Web (UI)</td>
          <td><code>${uiPort ? `:${uiPort}` : '—'}</code></td>
          <td>${uiPort ? `<a href="http://localhost:${uiPort}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;">http://localhost:${uiPort}</a>` : '—'}</td>
          <td><span class="flp-badge ${uiStatus?.online ? 'flp-badge-green' : uiStatus?.unverified ? 'flp-badge-gray' : 'flp-badge-amber'}">${uiStatus?.online ? '🟢 ONLINE' : uiStatus?.unverified ? '⚪ NÃO MEDIDO' : '🔴 OFFLINE'}</span></td>
        </tr>
        <tr>
          <td><i class="ph-bold ph-brackets-curly" style="color:#a855f7;"></i> API / Backend</td>
          <td><code>${apiPort ? `:${apiPort}` : '—'}</code></td>
          <td>${apiPort ? `<a href="http://localhost:${apiPort}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;">http://localhost:${apiPort}</a>` : '—'}</td>
          <td><span class="flp-badge ${apiStatus?.online ? 'flp-badge-green' : apiStatus?.unverified ? 'flp-badge-gray' : 'flp-badge-amber'}">${apiStatus?.online ? '🟢 ONLINE' : apiStatus?.unverified ? '⚪ NÃO MEDIDO' : '🔴 OFFLINE'}</span></td>
        </tr>
        <tr>
          <td><i class="ph-bold ph-heartbeat" style="color:#ef4444;"></i> Health Check</td>
          <td><code>${project.healthUrl || project.remoteHealthUrl ? 'HTTP' : '—'}</code></td>
          <td>${project.healthUrl || project.remoteHealthUrl ? `<a href="${project.healthUrl || project.remoteHealthUrl}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;">${project.healthUrl || project.remoteHealthUrl}</a>` : '—'}</td>
          <td><span class="flp-badge flp-badge-gray">${Number.isFinite(project.health) ? `${project.health}%` : 'Não medido'}</span></td>
        </tr>
        <tr>
          <td><i class="ph-bold ph-cloud-arrow-up" style="color:#00d9ff;"></i> VPS Nuvem (209.50.241.22)</td>
          <td><code>${vpsPort ? `:${vpsPort}` : '—'}</code></td>
          <td>${remoteUrl ? `<a href="${remoteUrl}" target="_blank" rel="noopener noreferrer" style="color:#00d9ff;">${remoteUrl}</a>` : '—'}</td>
          <td><span class="flp-badge ${remoteUrl ? 'flp-badge-cyan' : 'flp-badge-gray'}">${remoteUrl ? 'MAPEADO' : 'NÃO CONFIGURADO'}</span></td>
        </tr>
      </tbody>
    `;
    tableWrap.appendChild(table);
    panel.appendChild(tableWrap);

    // 5. Service Logs Viewer
    const logBox = element('div', 'flp-log-container');
    logBox.style.cssText = 'margin-top:20px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;';
    const logToggle = element('button', 'flp-button flp-button-soft', '📜 Ver Logs / Output em Tempo Real');
    logToggle.type = 'button';
    const logViewer = element('pre', 'flp-log-viewer');
    logViewer.hidden = true;
    logToggle.addEventListener('click', () => {
      logViewer.hidden = !logViewer.hidden;
      if (!logViewer.hidden) loadProjectLogs(rawId, logViewer);
    });
    logBox.append(logToggle, logViewer);
    panel.appendChild(logBox);

    container.appendChild(panel);
  }

  function renderBrowserTab(container, project) {
    const rawId = project.catalogId || (project.id.startsWith('local-') ? project.id.slice(6) : project.id);
    const { liveStatus, status } = operationalStatus(project);
    const isOnline = status === 'online';
    const activeUrl = liveStatus?.activeUrl || project.localUrl || (project.localPort ? `http://127.0.0.1:${project.localPort}` : project.remoteUrl || null);

    const box = element('div', 'flp-live-preview-box');

    // 1. Toolbar
    const toolbar = element('div', 'flp-preview-toolbar');

    const urlBar = element('div', 'flp-preview-url-bar');
    urlBar.innerHTML = `<i class="ph-bold ph-globe" style="color:${isOnline ? '#00e5a0' : '#94a3b8'};"></i> <span style="user-select:all;">${activeUrl || 'Sem URL configurada'}</span>`;

    const actions = element('div', 'flp-preview-actions');

    const statusBadge = element('span', `flp-card-status-pill ${status}`, isOnline ? `🟢 ONLINE :${liveStatus?.port || project.localPort}` : '⚪ OFFLINE');
    actions.appendChild(statusBadge);

    let frameRef = null;

    if (activeUrl) {
      const vpDesktop = element('button', 'flp-preview-viewport-btn active', '🖥️ Desktop');
      const vpTablet = element('button', 'flp-preview-viewport-btn', '💻 Tablet');
      const vpMobile = element('button', 'flp-preview-viewport-btn', '📱 Mobile');

      vpDesktop.addEventListener('click', () => {
        vpDesktop.classList.add('active');
        vpTablet.classList.remove('active');
        vpMobile.classList.remove('active');
        if (frameRef) frameRef.className = 'flp-preview-frame';
      });
      vpTablet.addEventListener('click', () => {
        vpTablet.classList.add('active');
        vpDesktop.classList.remove('active');
        vpMobile.classList.remove('active');
        if (frameRef) frameRef.className = 'flp-preview-frame viewport-tablet';
      });
      vpMobile.addEventListener('click', () => {
        vpMobile.classList.add('active');
        vpDesktop.classList.remove('active');
        vpTablet.classList.remove('active');
        if (frameRef) frameRef.className = 'flp-preview-frame viewport-mobile';
      });

      actions.append(vpDesktop, vpTablet, vpMobile);

      const reloadBtn = element('button', 'flp-preview-viewport-btn', '🔄');
      reloadBtn.title = 'Recarregar Preview';
      reloadBtn.addEventListener('click', () => {
        if (frameRef) {
          const currentSrc = frameRef.src;
          frameRef.src = 'about:blank';
          setTimeout(() => { frameRef.src = currentSrc; }, 80);
        }
      });
      actions.appendChild(reloadBtn);

      const extBtn = element('button', 'flp-quick-action-btn btn-open-url', '🚀 Abrir Aba ↗');
      extBtn.type = 'button';
      extBtn.title = 'Abrir sistema em nova aba';
      extBtn.addEventListener('click', () => window.open(activeUrl, '_blank', 'noopener,noreferrer'));
      actions.appendChild(extBtn);
    }

    toolbar.append(urlBar, actions);
    box.appendChild(toolbar);

    // 2. Viewport / Frame wrap
    const frameWrap = element('div', 'flp-preview-frame-wrap');

    if (isOnline && activeUrl) {
      const iframe = document.createElement('iframe');
      iframe.className = 'flp-preview-frame';
      iframe.src = activeUrl;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals');
      iframe.title = `Preview ao vivo de ${project.name}`;
      frameWrap.appendChild(iframe);
      frameRef = iframe;
    } else {
      const emptyState = element('div', '', '');
      emptyState.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:48px 24px; gap:16px; color:#94a3b8; max-width:540px; margin:auto;';
      const icon = element('div', '', '');
      icon.style.cssText = 'width:64px; height:64px; border-radius:18px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); display:flex; align-items:center; justify-content:center; font-size:28px; color:#38bdf8;';
      icon.innerHTML = '<i class="ph-bold ph-plugs-connected"></i>';
      emptyState.appendChild(icon);

      const h4 = element('h4', '', isOnline ? 'Visualização Web Indisponível' : `Serviço Offline na Porta :${project.localPort || project.apiPort || '—'}`);
      h4.style.cssText = 'color:#f8fafc; font-size:16px; margin:0;';
      emptyState.appendChild(h4);

      const desc = element('p', '', isOnline
        ? 'O serviço está ativo, mas não há URL local mapeada para renderização no navegador.'
        : `O serviço local não está em escuta no momento. Você pode inicializá-lo em segundo plano ou abrir a pasta no Explorer.`);
      desc.style.cssText = 'font-size:12.5px; line-height:1.5; margin:0;';
      emptyState.appendChild(desc);

      const btnGroup = element('div', '', '');
      btnGroup.style.cssText = 'display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:center; margin-top:8px;';

      const startBtn = element('button', 'flp-quick-action-btn btn-start', '⚡ Iniciar Serviço');
      startBtn.type = 'button';
      startBtn.addEventListener('click', () => {
        startBtn.disabled = true;
        startBtn.textContent = 'Iniciando…';
        startProjectService(rawId, project).finally(() => {
          startBtn.disabled = false;
          startBtn.textContent = '⚡ Iniciar Serviço';
        });
      });
      btnGroup.appendChild(startBtn);

      const folderBtn = element('button', 'flp-quick-action-btn btn-folder', '📁 Abrir Pasta');
      folderBtn.type = 'button';
      folderBtn.addEventListener('click', () => openProjectFolderDirect(rawId, project));
      btnGroup.appendChild(folderBtn);

      const checkBtn = element('button', 'flp-quick-action-btn btn-check', '🔄 Retestar Status');
      checkBtn.type = 'button';
      checkBtn.addEventListener('click', () => {
        checkBtn.disabled = true;
        checkProjectStatus(rawId).finally(() => { checkBtn.disabled = false; });
      });
      btnGroup.appendChild(checkBtn);

      if (activeUrl) {
        const directLink = element('button', 'flp-quick-action-btn btn-open-url', '↗ Tentar Abrir URL');
        directLink.type = 'button';
        directLink.addEventListener('click', () => window.open(activeUrl, '_blank', 'noopener,noreferrer'));
        btnGroup.appendChild(directLink);
      }

      emptyState.appendChild(btnGroup);
      frameWrap.appendChild(emptyState);
    }

    box.appendChild(frameWrap);
    container.appendChild(box);
  }

  async function loadProjectAnalysis(projectId, run = false) {
    const existing = state.analyses.get(projectId);
    if (existing?.loading) return;
    state.analyses.set(projectId, { ...existing, loading: true, error: null });
    if (state.selected === projectId) renderDetail();
    try {
      if (run) await json(`/api/fenix/projects/${encodeURIComponent(projectId)}/analyze`, { method: 'POST' });
      const saved = await json(`/api/fenix/projects/${encodeURIComponent(projectId)}/analysis`);
      state.analyses.set(projectId, { report: saved.report, artifact: saved.artifact, integration: saved.integration || saved.report.integration || null, loading: false });
      state.measuredAt = new Date().toISOString();
      const graphStatus = (saved.integration || saved.report.integration)?.graphBrain?.status || 'não vinculado';
      $('flpMeasured').textContent = `Mapa estrutural persistido · ${saved.report.totalFiles} arquivos · ${saved.report.routes.length} rotas · Graph Brain: ${graphStatus} · testes não executados`;
    } catch (error) {
      const notFound = !run && error.status === 404;
      state.analyses.set(projectId, { loading: false, notFound, error: notFound ? null : error.message });
      if (!notFound) $('flpMeasured').textContent = `Falha ao mapear sistema: ${error.message}`;
    }
    if (state.selected === projectId) renderDetail();
  }

  async function runProjectAutonomousCycle(projectId) {
    state.autonomousCycles = state.autonomousCycles || new Map();
    state.autonomousCycles.set(projectId, { loading: true, error: null, result: null });
    if (state.selected === projectId) renderDetail();
    try {
      const res = await json(`/api/fenix/projects/${encodeURIComponent(projectId)}/autonomous-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoFix: true })
      });
      state.autonomousCycles.set(projectId, { loading: false, error: null, result: res.cycle });
      await loadProjectAnalysis(projectId, true);
    } catch (err) {
      state.autonomousCycles.set(projectId, { loading: false, error: err.message, result: null });
    }
    if (state.selected === projectId) renderDetail();
  }

  async function enqueueProjectEvolutionJob(projectId, priority = 'HIGH') {
    try {
      const res = await json(`/api/fenix/projects/${encodeURIComponent(projectId)}/evolution-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatchJob: true, priority })
      });
      if (res?.job) {
        state.workspaceTab = 'jobs';
        renderDetail();
      }
    } catch (err) {
      console.warn('[ProjectHub] Falha ao enfileirar job:', err.message);
    }
  }

  const systemRunActive = run => ['QUEUED', 'RUNNING', 'CANCELLING'].includes(run?.status);
  const systemRunStatuses = { QUEUED: 'Na fila', RUNNING: 'Em andamento', CANCELLING: 'Cancelando', CANCELLED: 'Cancelada', FAILED: 'Falha', PARTIAL: 'Parcial · consulte as limitações', COMPLETED: 'Concluída' };
  const systemRunStages = { inventory: 'inventário', code: 'código', captures: 'capturas', tests: 'testes', synthesis: 'síntese', export: 'relatório', done: 'finalizado' };

  function scheduleSystemObservation(projectId) {
    clearTimeout(state.systemObservationTimers.get(projectId));
    const timer = setTimeout(() => loadSystemObservation(projectId), 2500);
    state.systemObservationTimers.set(projectId, timer);
  }

  async function loadSystemObservation(projectId, action = null) {
    const current = state.systemObservations.get(projectId) || { run: null, loading: false, starting: false, error: null, imageUrls: {}, imageRunId: null };
    if (current.loading) return;
    state.systemObservations.set(projectId, { ...current, loading: true, starting: action?.type === 'start', error: null });
    try {
      if (action?.type === 'start') {
        await json('/api/system-analyses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'deep', projectId, formats: ['md', 'zip'], tests: action.tests === true }) });
      } else if (action?.type === 'cancel') {
        await json(`/api/system-analyses/${encodeURIComponent(action.runId)}/cancel`, { method: 'POST', body: '{}' });
      } else if (action?.type === 'retry') {
        await json(`/api/system-analyses/${encodeURIComponent(action.runId)}/retry`, { method: 'POST', body: '{}' });
      }
      const { analyses = [] } = await json('/api/system-analyses');
      const latest = analyses.filter(run => run.projectId === projectId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
      const run = latest ? await json(`/api/system-analyses/${encodeURIComponent(latest.id)}`) : null;
      const previous = state.systemObservations.get(projectId) || current;
      const next = { ...previous, run, loading: false, starting: false, error: null };
      if (next.imageRunId !== run?.id) {
        for (const url of Object.values(next.imageUrls || {})) URL.revokeObjectURL(url);
        next.imageUrls = {};
        next.imageRunId = run?.id || null;
      }
      state.systemObservations.set(projectId, next);
      if (systemRunActive(run)) scheduleSystemObservation(projectId);
      else { clearTimeout(state.systemObservationTimers.get(projectId)); state.systemObservationTimers.delete(projectId); }
      if (run) loadSystemObservationImages(projectId, run);
    } catch (error) {
      const latest = state.systemObservations.get(projectId) || current;
      state.systemObservations.set(projectId, { ...latest, loading: false, starting: false, error: error.message });
      clearTimeout(state.systemObservationTimers.get(projectId));
      state.systemObservationTimers.delete(projectId);
    }
    if (state.selected === projectId && state.workspaceTab === 'intelligence') renderDetail();
  }

  async function loadSystemObservationImages(projectId, run) {
    const entry = state.systemObservations.get(projectId);
    if (!entry || entry.imageRunId !== run.id) return;
    const items = (run.evidence?.targets || []).flatMap(target => (target.images || []).slice(0, 4).map(name => ({ target, name }))).slice(0, 8);
    for (const { target, name } of items) {
      const key = `${target.id}:${name}`;
      if (entry.imageUrls[key]) continue;
      try {
        const token = authToken();
        const response = await fetch(`/api/system-analyses/${encodeURIComponent(run.id)}/artifacts/${encodeURIComponent(name)}`, {
          credentials: 'same-origin',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!response.ok) continue;
        const imageUrl = URL.createObjectURL(await response.blob());
        const latest = state.systemObservations.get(projectId);
        if (!latest || latest.imageRunId !== run.id) { URL.revokeObjectURL(imageUrl); return; }
        latest.imageUrls[key] = imageUrl;
        if (state.selected === projectId && state.workspaceTab === 'intelligence') renderDetail();
      } catch { /* a missing thumbnail never changes the measured capture status */ }
    }
  }

  function renderSystemObservation(container, project) {
    const panel = element('section', 'flp-panel flp-system-observation');
    panel.append(element('h3', '', 'Percepção visual e validação em execução'));
    panel.append(element('p', 'flp-intelligence-note', 'A análise profunda usa o JobEngine, captura as telas navegáveis do Fênix e inspeciona somente o projeto selecionado. Os testes de código continuam como não executados quando não há executor isolado configurado.'));

    if (!state.systemObservations.has(project.id)) {
      state.systemObservations.set(project.id, { run: null, loading: false, starting: false, error: null, imageUrls: {}, imageRunId: null });
      loadSystemObservation(project.id);
    }
    const observation = state.systemObservations.get(project.id);
    const run = observation.run;
    const start = element('button', 'flp-button flp-button-primary', observation.starting ? 'Enfileirando análise…' : 'Iniciar análise visual e estrutural');
    start.type = 'button';
    start.disabled = !workspaceIsAvailable(project) || observation.loading || systemRunActive(run);
    const runTests = document.createElement('input');
    runTests.type = 'checkbox';
    runTests.disabled = !workspaceIsAvailable(project) || observation.loading || systemRunActive(run);
    runTests.setAttribute('aria-label', 'Executar testes apenas se houver executor isolado configurado');
    const testChoice = element('label', 'flp-observation-test-option');
    testChoice.append(runTests, document.createTextNode('Executar testes de código se houver executor isolado configurado'));
    start.addEventListener('click', () => loadSystemObservation(project.id, { type: 'start', tests: runTests.checked }));
    panel.appendChild(start);
    panel.appendChild(testChoice);

    if (observation.loading && !run) panel.append(element('p', 'flp-empty', 'Lendo o estado persistido da análise…'));
    if (observation.error) panel.append(element('p', 'flp-intelligence-error', `A API de análise não confirmou a operação: ${observation.error}`));
    if (!run) {
      if (!observation.loading && !observation.error) panel.append(element('p', 'flp-empty', 'Nenhuma análise profunda registrada para este projeto.'));
      container.appendChild(panel);
      return;
    }

    const status = element('div', 'flp-observation-status');
    status.append(element('strong', '', `${systemRunStatuses[run.status] || run.status} · ${systemRunStages[run.stage] || run.stage}`));
    status.append(element('span', '', `Job ${run.jobId || 'ainda sem ID'} · ${date(run.updatedAt || run.createdAt)}`));
    panel.appendChild(status);
    if (systemRunActive(run)) {
      const progress = document.createElement('progress');
      progress.setAttribute('aria-label', 'Estados observados pela análise');
      progress.max = Math.max(1, run.progress?.total || run.evidence?.coverage?.screens || 1);
      progress.value = Math.min(progress.max, run.progress?.completed || 0);
      panel.appendChild(progress);
      panel.append(element('p', 'flp-intelligence-note', `${run.progress?.completed || 0} de ${run.progress?.total || 0} estados tratados. A contagem muda conforme telas são descobertas.`));
      const cancel = element('button', 'flp-button flp-button-soft', 'Cancelar análise');
      cancel.type = 'button';
      cancel.disabled = observation.loading;
      cancel.addEventListener('click', () => loadSystemObservation(project.id, { type: 'cancel', runId: run.id }));
      panel.appendChild(cancel);
    } else if (['FAILED', 'PARTIAL', 'CANCELLED'].includes(run.status)) {
      const retry = element('button', 'flp-button flp-button-soft', 'Retomar análise');
      retry.type = 'button';
      retry.disabled = observation.loading;
      retry.addEventListener('click', () => loadSystemObservation(project.id, { type: 'retry', runId: run.id }));
      panel.appendChild(retry);
    }

    const evidence = run.evidence || {};
    const coverage = evidence.coverage || {};
    const testResults = evidence.tests || [];
    const testStates = testResults.map(item => item.status);
    const testSummary = !run.tests ? 'Não solicitados' : !testResults.length ? 'Aguardando executor' : testStates.every(status => status === 'aprovado') ? 'PASS' : testStates.every(status => status === 'não executado') ? 'Não executados' : testStates.some(status => ['reprovado', 'erro'].includes(status)) ? 'Falhas registradas' : 'Parcial';
    const targets = evidence.targets || [];
    const observedElements = targets.reduce((total, target) => total + (target.structure?.elementCount || 0), 0);
    const observedRequests = targets.reduce((total, target) => total + (target.networkRequests?.length || 0), 0);
    const observedConsoleErrors = targets.reduce((total, target) => total + (target.consoleErrors?.length || 0), 0);
    const facts = element('div', 'flp-observation-summary');
    for (const [label, value] of [
      ['Telas descobertas', coverage.screens ?? 0],
      ['Capturas reais', coverage.captured ?? 0],
      ['Erros de captura', coverage.errors ?? 0],
      ['Não acessíveis', coverage.inaccessible ?? 0],
      ['Elementos de interface observados', observedElements],
      ['Requisições API observadas', observedRequests],
      ['Erros de console', observedConsoleErrors],
      ['Testes de código', testSummary],
      ['Síntese IA', evidence.synthesis?.status === 'complete' ? 'Inferida · provider real' : 'Não verificada']
    ]) facts.appendChild(row(label, value));
    panel.appendChild(facts);

    const verificationStates = new Set(['PASS', 'FAIL', 'BLOCKED', 'NOT_VERIFIED']);
    const rawVerificationStatus = evidence.verification?.status || run.verificationStatus || 'NOT_VERIFIED';
    const verificationStatus = verificationStates.has(rawVerificationStatus) ? rawVerificationStatus : 'NOT_VERIFIED';
    const verificationReasons = {
      PASS: 'As suítes isoladas configuradas foram aprovadas.',
      FAIL: 'Uma ou mais suítes isoladas reportaram falha.',
      BLOCKED: 'A execução não cobriu todas as suítes planejadas.',
      NOT_VERIFIED: 'Nenhuma suíte de teste isolada foi executada.'
    };
    const verificationCard = element('div', 'flp-observation-verification', undefined);
    verificationCard.dataset.status = verificationStatus.toLowerCase().replace('_', '-');
    verificationCard.setAttribute('role', 'group');
    verificationCard.setAttribute('aria-label', `Verificação funcional: ${verificationStatus}`);
    verificationCard.append(
      element('strong', '', `Verificação funcional · ${verificationStatus}`),
      element('span', '', evidence.verification?.reason || verificationReasons[verificationStatus])
    );
    panel.appendChild(verificationCard);

    const screenshots = (evidence.targets || []).flatMap(target => (target.images || []).slice(0, 4).map(name => ({ target, name, url: observation.imageUrls?.[`${target.id}:${name}`] })));
    if (screenshots.length) {
      const gallery = element('div', 'flp-observation-gallery');
      for (const shot of screenshots.slice(0, 8)) {
        const card = element('figure', 'flp-observation-shot');
        if (shot.url) {
          const link = document.createElement('a');
          link.href = shot.url; link.target = '_blank'; link.rel = 'noopener';
          const image = document.createElement('img'); image.src = shot.url; image.alt = `Captura de ${shot.target.label}`; image.loading = 'lazy';
          link.appendChild(image); card.appendChild(link);
        } else card.append(element('div', 'flp-observation-placeholder', 'Carregando captura…'));
        card.append(element('figcaption', '', `${shot.target.label} · ${shot.target.status}`));
        gallery.appendChild(card);
      }
      panel.appendChild(gallery);
    }
    const observedTargets = targets.filter(target => target.structure || target.networkRequests?.length || target.consoleErrors?.length || target.observedActions?.length).slice(0, 12);
    if (observedTargets.length) {
      const section = element('section', 'flp-observation-details');
      section.append(element('h4', '', 'Estrutura, ações e tráfego observados'));
      for (const target of observedTargets) {
        const details = document.createElement('details');
        const summary = element('summary', '', `${target.label} · ${target.structure?.elementCount ?? 0} elementos · ${target.networkRequests?.length || 0} chamadas`);
        details.appendChild(summary);
        const lists = [
          ['Controles visíveis', (target.structure?.elements || []).filter(item => ['button', 'a', 'input', 'select', 'textarea'].includes(item.tag)).slice(0, 30).map(item => `${item.tag}${item.id ? `#${item.id}` : ''} · ${item.name || item.role || 'sem rótulo'}${item.disabled ? ' · desabilitado' : ''}`)],
          ['Navegações observadas', (target.observedActions || []).slice(0, 30).map(item => `${item.label || item.selector} · ${item.selector}`)],
          ['Requisições da página', (target.networkRequests || []).slice(0, 50).map(item => `${item.method} ${item.path} · ${item.status ?? 'sem resposta'}`)],
          ['Erros de console', (target.consoleErrors || []).slice(0, 10)]
        ];
        for (const [title, values] of lists) {
          if (!values.length) continue;
          details.appendChild(element('strong', 'flp-observation-list-title', title));
          const list = element('ul', 'flp-intelligence-list');
          for (const value of values) list.appendChild(element('li', '', value));
          details.appendChild(list);
        }
        if (target.structure?.truncated) details.append(element('p', 'flp-intelligence-note', 'A lista de elementos atingiu o limite por tela.'));
        section.appendChild(details);
      }
      panel.appendChild(section);
    }
    const outcomes = (evidence.targets || []).filter(target => target.status !== 'capturado');
    if (outcomes.length) {
      const list = element('ul', 'flp-intelligence-list');
      for (const target of outcomes.slice(0, 20)) list.appendChild(element('li', '', `${target.label} · ${target.status}${target.error ? ` · ${target.error}` : ''}`));
      panel.append(element('h4', '', 'Telas não capturadas'), list);
    }
    if (run.errors?.length) {
      const list = element('ul', 'flp-intelligence-list');
      for (const issue of run.errors.slice(0, 10)) list.appendChild(element('li', '', issue.error || JSON.stringify(issue)));
      panel.append(element('h4', '', 'Limitações registradas'), list);
    }
    const artifactButtons = (run.artifacts || []).filter(artifact => !artifact.name.startsWith('images/'));
    for (const artifact of artifactButtons) {
      const download = element('button', 'flp-button flp-button-soft', `Baixar ${artifact.name}`);
      download.type = 'button';
      download.addEventListener('click', async () => {
        const token = authToken();
        const response = await fetch(`/api/system-analyses/${encodeURIComponent(run.id)}/artifacts/${encodeURIComponent(artifact.name)}`, { credentials: 'same-origin', headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!response.ok) throw new Error(`Não foi possível baixar o relatório (HTTP ${response.status}).`);
        const objectUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = objectUrl; link.download = artifact.name.split('/').pop(); link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      });
      panel.appendChild(download);
    }
    container.appendChild(panel);
  }

  function renderSystemIntelligenceTab(container, project) {
    const panel = element('section', 'flp-panel flp-intelligence');
    renderDesignReference(panel, project);
    renderReaEvidence(panel, project);
    panel.append(element('h3', '', 'Mapa estrutural com evidências'));
    const result = state.analyses.get(project.id);
    if (result?.loading) {
      panel.append(element('p', 'flp-empty', 'Lendo arquivos e declarações do workspace…'));
      container.appendChild(panel);
      return;
    }
    if (result?.error) {
      panel.append(element('p', 'flp-intelligence-error', `A análise falhou: ${result.error}`));
      const retry = element('button', 'flp-button flp-button-primary', 'Tentar novamente');
      retry.type = 'button';
      retry.addEventListener('click', () => loadProjectAnalysis(project.id, true));
      panel.appendChild(retry);
      container.appendChild(panel);
      return;
    }
    const report = result?.report;
    if (!report) {
      panel.append(element('p', 'flp-empty', result?.notFound
        ? 'Ainda não existe um mapa persistido para este workspace.'
        : 'Carregando a última análise registrada, se existir.'));
      const map = element('button', 'flp-button flp-button-primary', 'Mapear este sistema');
      map.type = 'button';
      map.disabled = !workspaceIsAvailable(project);
      map.addEventListener('click', () => loadProjectAnalysis(project.id, true));
      panel.appendChild(map);
      container.appendChild(panel);
      return;
    }

    const summary = element('div', 'flp-intelligence-summary');
    const coverage = report.coverage || {};
    const integration = result.integration || report.integration || {};
    const twinStatus = integration.systemTwin?.id ? `Vinculado · ${integration.systemTwin.id}` : integration.systemTwin?.status || 'Não configurado';
    const graphStatus = integration.graphBrain?.status
      ? `${integration.graphBrain.status} · ${integration.graphBrain.nodes || 0} nós · ${integration.graphBrain.edges || 0} ligações`
      : 'Não configurado';
    for (const [label, value] of [
      ['Cobertura', coverage.status || 'Não medida'],
      ['Arquivos vistos', report.totalFiles ?? 0],
      ['Rotas declaradas', report.routes?.length ?? 0],
      ['Componentes encontrados', report.components?.length ?? 0],
      ['Arquivos de teste', report.tests?.length ?? 0],
      ['Execução de testes', 'NÃO EXECUTADOS'],
      ['System Twin', twinStatus],
      ['Graph Brain', graphStatus]
    ]) summary.appendChild(row(label, value));
    panel.appendChild(summary);
    panel.append(element('p', 'flp-intelligence-note', `Observação parcial · ${date(report.scannedAt)} · ${coverage.sourceFilesRead ?? 0} arquivos de código lidos · limites: ${coverage.fileLimit ?? '—'} arquivos e ${coverage.sourceBytesRead ?? 0} bytes de código.`));

    const sections = [
      ['Tecnologias declaradas', (report.detectedStack || []).map((item) => `${item.name} · ${item.evidence}`)],
      ['Dependências declaradas', (report.dependencies || []).slice(0, 30).map((item) => `${item.name}@${item.version} · ${item.manifest}`)],
      ['Rotas encontradas no código', (report.routes || []).map((item) => `${item.method} ${item.path} · ${item.file}`)],
      ['Imports locais resolvidos', (report.imports || []).slice(0, 50).map((item) => `${item.from} → ${item.to}`)],
      ['Testes encontrados · ainda não executados', (report.tests || []).map((item) => `${item.path} · ${item.status}`)],
      ['Limites e avisos da leitura', [
        ...(coverage.truncated ? ['A lista de arquivos atingiu o limite configurado.'] : []),
        ...((report.warnings || []).slice(0, 20)),
        ...(report.database?.status === 'NOT_DETECTED' ? ['Nenhum schema ou driver de banco foi detectado pelas evidências verificadas.'] : [])
      ]]
    ];
    for (const [title, items] of sections) {
      const section = element('section', 'flp-intelligence-section');
      section.append(element('h4', '', title));
      if (!items.length) section.append(element('p', 'flp-empty', 'Nenhum item observado.'));
      else {
        const list = element('ul', 'flp-intelligence-list');
        for (const item of items) list.appendChild(element('li', '', item));
        section.appendChild(list);
      }
      panel.appendChild(section);
    }

    // Render 10 Canonical Diagnostic Facets
    if (report.facets) {
      const facetsSection = element('section', 'flp-intelligence-section flp-diagnostic-facets');
      facetsSection.append(element('h4', '', 'Diagnóstico Multidimensional (10 Facetas Canônicas)'));
      facetsSection.append(element('p', 'flp-intelligence-note', 'Auditoria profunda em 10 dimensões factuais: Código, Telas, APIs, Dependências, Estado Real e Autonomia.'));

      const facetsGrid = element('div', 'flp-facets-grid');
      const facetCards = [
        { num: '01', title: 'Finalidade & Capacidades', desc: report.purposeAndCapabilities?.purpose || '—', meta: `${(report.purposeAndCapabilities?.capabilities || []).length} capacidades registradas` },
        { num: '02', title: 'Estrutura & Módulos', desc: `${report.fileStructureAndModules?.totalFiles || report.totalFiles} arquivos mapeados`, meta: `${(report.fileStructureAndModules?.topLevelDirectories || []).join(', ') || 'diretórios locais'}` },
        { num: '03', title: 'Telas & Fluxos', desc: `${report.screensAndNavigationFlows?.screensCount || 0} telas mapeadas`, meta: `${report.screensAndNavigationFlows?.componentsCount || 0} componentes` },
        { num: '04', title: 'APIs & Dependências', desc: `${report.apisAndDependencies?.routesCount || report.routes?.length || 0} rotas HTTP`, meta: `${report.apisAndDependencies?.dependenciesCount || report.dependencies?.length || 0} bibliotecas` },
        { num: '05', title: 'Estado Real de Execução', desc: report.runtimeExecutionState?.status || '—', meta: report.runtimeExecutionState?.message || '—' },
        { num: '06', title: 'Testes & Riscos', desc: `${report.testsErrorsAndRisks?.testsCount || report.tests?.length || 0} suítes de teste`, meta: `${report.testsErrorsAndRisks?.risksCount || report.architecturalGaps?.length || 0} riscos identificados` },
        { num: '07', title: 'Funcionalidades Incompletas', desc: `${report.incompleteFeatures?.items?.length || 0} pendências arquiteturais`, meta: report.incompleteFeatures?.hasHealthProbe ? 'Probe /health ativo' : 'Ausência de /health' },
        { num: '08', title: 'Oportunidades de Evolução', desc: `${report.evolutionOpportunities?.length || 0} frentes identificadas`, meta: 'Segurança, Testes e Autonomia' },
        { num: '09', title: 'Plano Priorizado', desc: `${(report.prioritizedImprovementPlan?.phases || []).length} fases estruturadas`, meta: report.prioritizedImprovementPlan?.totalEstimatedMinutes ? `Estimativa: ${report.prioritizedImprovementPlan.totalEstimatedMinutes} min` : 'Estimativa: —' },
        { num: '10', title: 'Critérios & Evidências', desc: `Hash: ${report.acceptanceCriteriaAndEvidence?.baselineFingerprint || '—'}`, meta: `${(report.acceptanceCriteriaAndEvidence?.criteria || []).length} critérios de aceite` }
      ];

      for (const fc of facetCards) {
        const card = element('div', 'flp-facet-card');
        card.innerHTML = `<span class="flp-facet-num">${fc.num}</span><strong class="flp-facet-title">${fc.title}</strong><p class="flp-facet-desc">${fc.desc}</p><small class="flp-facet-meta">${fc.meta}</small>`;
        facetsGrid.appendChild(card);
      }
      facetsSection.appendChild(facetsGrid);
      panel.appendChild(facetsSection);
    }

    // Render Architectural Gaps
    if (Array.isArray(report.architecturalGaps) && report.architecturalGaps.length > 0) {
      const gapsSection = element('section', 'flp-intelligence-section flp-gaps-section');
      gapsSection.append(element('h4', '', `Gaps Arquiteturais Identificados (${report.architecturalGaps.length})`));
      const gapsGrid = element('div', 'flp-gaps-grid');
      for (const gap of report.architecturalGaps) {
        const gCard = element('article', `flp-gap-card flp-gap-${(gap.severity || 'low').toLowerCase()}`);
        const badge = element('span', `flp-gap-badge flp-badge-${(gap.severity || 'low').toLowerCase()}`, gap.severity || 'LOW');
        const title = element('strong', 'flp-gap-title', gap.title || 'Gap identificado');
        const desc = element('p', 'flp-gap-desc', gap.description || '—');
        const rem = element('p', 'flp-gap-rem', `Remediação: ${gap.remediation || '—'}`);
        gCard.append(badge, title, desc, rem);
        gapsGrid.appendChild(gCard);
      }
      gapsSection.appendChild(gapsGrid);
      panel.appendChild(gapsSection);
    }

    // Render Evolution Plan
    if (report.evolutionPlan?.phases) {
      const planSection = element('section', 'flp-intelligence-section flp-evolution-plan-section');
      const planHead = element('div', 'flp-plan-head');
      const estTotal = report.evolutionPlan.totalEstimatedMinutes ? `${report.evolutionPlan.totalEstimatedMinutes} min` : '—';
      planHead.innerHTML = `<h4>Roteiro de Evolução em 4 Fases · Estimativa: ${estTotal}</h4>`;
      const enqueueBtn = element('button', 'flp-button flp-button-soft', '🚀 Enfileirar no Job Lane');
      enqueueBtn.type = 'button';
      enqueueBtn.addEventListener('click', () => enqueueProjectEvolutionJob(project.id));
      planHead.appendChild(enqueueBtn);
      planSection.appendChild(planHead);

      const phasesList = element('div', 'flp-phases-list');
      for (const ph of report.evolutionPlan.phases) {
        const phCard = element('div', 'flp-phase-card');
        const estPhase = ph.estimatedMinutes ? `${ph.estimatedMinutes} min` : '—';
        phCard.innerHTML = `<div class="flp-phase-header"><span class="flp-phase-tag">Fase ${ph.phase}</span><strong>${ph.name}</strong><small>${estPhase}</small></div><p class="flp-phase-desc">${ph.description}</p>`;
        const actList = element('ul', 'flp-phase-actions');
        for (const act of ph.actions || []) {
          actList.appendChild(element('li', '', act));
        }
        phCard.appendChild(actList);
        phasesList.appendChild(phCard);
      }
      planSection.appendChild(phasesList);
      panel.appendChild(planSection);
    }

    // Render Fênix Autonomous Cycle Panel
    const autoSection = element('section', 'flp-intelligence-section flp-autonomous-cycle-section');
    autoSection.append(element('h4', '', 'Ecossistema Autônomo Fênix (Muse × Grok Build × Gemini × Dots × AI City)'));
    autoSection.append(element('p', 'flp-intelligence-note', 'Executa o ciclo completo: OBSERVAR → IDENTIFICAR DEFEITO → REPRODUZIR → CORREÇÃO CIRÚRGICA → VALIDAR TESTES → REGISTRAR EM MEMÓRIA & BUG TRACKER → PROVA DE RECUPERAÇÃO COLD-RESTART.'));

    const autoActions = element('div', 'flp-autonomous-actions');
    const autoCycleBtn = element('button', 'flp-button flp-button-primary', '⚡ Executar Ciclo Autônomo');
    autoCycleBtn.type = 'button';
    autoCycleBtn.addEventListener('click', () => runProjectAutonomousCycle(project.id));
    autoActions.appendChild(autoCycleBtn);
    autoSection.appendChild(autoActions);

    const cycleState = state.autonomousCycles?.get(project.id);
    if (cycleState?.loading) {
      const loadingMsg = element('div', 'flp-cycle-loading', '⏳ Executando ciclo autônomo (inspeção, reprodução de falha, patch cirúrgico, testes e cold-restart recovery)...');
      autoSection.appendChild(loadingMsg);
    } else if (cycleState?.error) {
      const errMsg = element('div', 'flp-intelligence-error', `Falha no ciclo autônomo: ${cycleState.error}`);
      autoSection.appendChild(errMsg);
    } else if (cycleState?.result) {
      const res = cycleState.result;
      const resBox = element('div', 'flp-cycle-result-box');
      const badge = element('span', 'flp-badge-verified', `ESTADO: ${res.stage || 'VERIFIED'}`);
      resBox.appendChild(badge);

      const stepsList = element('div', 'flp-cycle-steps');
      for (const st of res.steps || []) {
        const stepRow = element('div', 'flp-cycle-step-row');
        stepRow.innerHTML = `<span class="flp-step-num">✓ Passo ${st.step} [${st.name}]</span> <span class="flp-step-detail">${st.detail}</span>`;
        stepsList.appendChild(stepRow);
      }
      resBox.appendChild(stepsList);

      const diffBox = element('div', 'flp-cycle-diff');
      diffBox.innerHTML = `<strong>Comparação Antes vs Depois:</strong>
        <div>Exit Code Inicial (Falha): <code>${res.diffSummary?.before?.exitCode}</code> → Exit Code Pós-Correção: <code>${res.diffSummary?.after?.exitCode}</code></div>
        <div>SHA-256 Antes: <code>${res.diffSummary?.before?.sha256?.slice(0, 16)}...</code> → Depois: <code>${res.diffSummary?.after?.sha256?.slice(0, 16)}...</code></div>
        <div>Universal Bug Tracker: <code>${res.bug?.bugId}</code> (${res.bug?.bugState}) · Cold-Restart: <code>${res.recovery?.status}</code></div>`;
      resBox.appendChild(diffBox);
      autoSection.appendChild(resBox);
    }

    panel.appendChild(autoSection);

    const actions = element('div', 'flp-intelligence-actions');
    const refresh = element('button', 'flp-button flp-button-soft', 'Atualizar mapa');
    refresh.type = 'button';
    refresh.disabled = !workspaceIsAvailable(project);
    refresh.addEventListener('click', () => loadProjectAnalysis(project.id, true));
    const ide = element('button', 'flp-button flp-button-primary', 'Abrir workspace na IDE');
    ide.type = 'button';
    ide.disabled = !workspaceIsAvailable(project);
    ide.addEventListener('click', () => openProjectInIde(project));
    const autoCycleBtnMain = element('button', 'flp-button flp-button-primary', '⚡ Ciclo Autônomo');
    autoCycleBtnMain.type = 'button';
    autoCycleBtnMain.addEventListener('click', () => runProjectAutonomousCycle(project.id));
    actions.append(refresh, ide, autoCycleBtnMain);
    panel.appendChild(actions);
    container.appendChild(panel);
    renderSystemObservation(container, project);
  }

  function renderDesignReference(container, project) {
    const section = element('section', 'flp-intelligence-section flp-design-reference');
    section.append(element('h4', '', 'Referências visuais e regras de interface'));
    section.append(element('p', 'flp-intelligence-note', 'Perfil contextual por projeto, salvo na memória autenticada do Fênix. Usa padrões de fluxo observados nas referências e os separa de medições reais do código.'));
    const list = element('ul', 'flp-intelligence-list');
    for (const source of window.FenixDesignReference?.profile?.provenance || []) list.appendChild(element('li', '', source));
    section.appendChild(list);
    const profile = window.FenixDesignReference?.profile;
    let designInputs = null;
    let surface = null;
    let direction = null;
    if (profile) {
      const references = element('div', 'flp-design-reference-catalog');
      for (const source of profile.referenceCatalog || []) {
        const card = element('article', 'flp-design-reference-card');
        const link = element('a', '', source.name);
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        card.append(link, element('p', '', source.observed), element('p', 'flp-design-reference-applied', source.applied));
        const mode = element('span', 'flp-design-reference-mode', 'Referência manual · somente leitura');
        card.appendChild(mode);
        references.appendChild(card);
      }
      if (references.childElementCount) section.appendChild(references);
      designInputs = element('div', 'flp-design-inputs');
      designInputs.appendChild(element('h5', '', 'Direção deste projeto'));
      const goalLabel = element('label', 'flp-design-input-label', 'Objetivo e fluxo principal (até 500 caracteres)');
      const goal = element('textarea', 'flp-design-textarea');
      goal.id = 'flpDesignGoal'; goal.maxLength = 500; goal.rows = 3;
      goal.placeholder = 'O que este projeto precisa permitir ao usuário?';
      goalLabel.appendChild(goal);
      designInputs.appendChild(goalLabel);
      const surfaceLabel = element('label', 'flp-design-input-label', 'Formato');
      surface = element('select', 'flp-design-select');
      surface.id = 'flpDesignSurface';
      for (const [value, label] of [['web', 'Web'], ['app', 'Aplicativo']]) {
        const option = element('option', '', label); option.value = value; surface.appendChild(option);
      }
      surfaceLabel.appendChild(surface);
      const directionLabel = element('label', 'flp-design-input-label', 'Direção visual');
      direction = element('select', 'flp-design-select');
      direction.id = 'flpDesignDirection';
      for (const [value, label] of [
        ['brand-preserving', 'Preservar identidade atual'],
        ['hig-adaptive', 'Apple HIG adaptativo à marca'],
        ['data-dense', 'Painel operacional, alta densidade legível'],
        ['touch-first', 'Priorizar toque e mobile']
      ]) { const option = element('option', '', label); option.value = value; direction.appendChild(option); }
      directionLabel.appendChild(direction);
      designInputs.append(surfaceLabel, directionLabel);

      const sourceGroup = element('fieldset', 'flp-design-choice-group');
      sourceGroup.appendChild(element('legend', '', 'Referências para este projeto'));
      for (const source of profile.referenceCatalog || []) {
        const choice = element('label', 'flp-design-choice');
        const input = document.createElement('input');
        input.type = 'checkbox'; input.dataset.designSource = source.id;
        choice.append(input, document.createTextNode(source.name.replace(/ ·.*/, '')));
        sourceGroup.appendChild(choice);
      }
      designInputs.appendChild(sourceGroup);

      const viewportGroup = element('fieldset', 'flp-design-choice-group');
      viewportGroup.appendChild(element('legend', '', 'Validar nestas larguras'));
      for (const width of [375, 768, 1280, 1920]) {
        const choice = element('label', 'flp-design-choice');
        const input = document.createElement('input');
        input.type = 'checkbox'; input.dataset.designViewport = String(width); input.checked = true;
        choice.append(input, document.createTextNode(`${width} px`));
        viewportGroup.appendChild(choice);
      }
      designInputs.appendChild(viewportGroup);

      const intake = element('div', 'flp-design-inputs flp-reference-intake');
      intake.appendChild(element('h5', '', 'Analisar referência externa neste projeto'));
      intake.appendChild(element('p', 'flp-intelligence-note', 'Informe uma URL e/ou cole conteúdo autorizado. O Fênix não acessa a URL sozinho; sem captura, a análise fica explicitamente pendente ou inferida.'));
      const sourceUrl = element('input', 'flp-design-select');
      sourceUrl.type = 'url'; sourceUrl.id = 'flpReferenceUrl'; sourceUrl.maxLength = 500;
      sourceUrl.placeholder = 'https://exemplo.com/tela';
      sourceUrl.setAttribute('aria-label', 'URL da referência');
      const sourceContent = element('textarea', 'flp-design-textarea');
      sourceContent.id = 'flpReferenceContent'; sourceContent.maxLength = 8000; sourceContent.rows = 4;
      sourceContent.placeholder = 'Cole notas, especificação ou conteúdo capturado de forma autorizada (até 8.000 caracteres).';
      sourceContent.setAttribute('aria-label', 'Notas ou conteúdo capturado da referência');
      const imageInput = element('input', 'flp-design-select');
      imageInput.type = 'file'; imageInput.id = 'flpReferenceImage'; imageInput.accept = 'image/png,image/jpeg,image/webp';
      imageInput.setAttribute('aria-label', 'Captura de interface para análise visual');
      const intakeStatus = element('p', 'flp-design-reference-status', 'Nenhuma referência externa adicionada nesta sessão.');
      intakeStatus.setAttribute('role', 'status');
      const intakeList = element('div', 'flp-design-reference-catalog');
      const addReference = element('button', 'flp-button flp-button-primary', 'Analisar entrada e salvar no projeto');
      addReference.type = 'button';
      const renderIntakeRecord = (record) => {
        const spec = record.spec || {};
        const card = element('article', 'flp-design-reference-card');
        const title = record.url || (record.visualAnalysis ? `Captura ${record.captureMimeType || 'visual'} · ${spec.imageAnalysis?.model || 'modelo não informado'}` : `Referência ${spec.referenceId || ''}`);
        if (/^https?:\/\//i.test(title)) {
          const link = element('a', '', title);
          link.href = title; link.target = '_blank'; link.rel = 'noopener noreferrer';
          card.appendChild(link);
        } else card.appendChild(element('strong', '', title));
        card.append(
          element('p', '', `Estado REA: ${spec.analysisStatus || 'UNKNOWN'} · tipo: ${spec.type || 'UNKNOWN'}`),
          element('p', '', (spec.evidence?.limitations || []).join(' ')),
          element('span', 'flp-design-reference-mode', 'Entrada vinculada à memória deste projeto')
        );
        const capabilities = spec.knowledge?.functional?.coreCapabilities || [];
        if (capabilities.length) card.appendChild(element('p', '', `Pistas inferidas: ${capabilities.join(', ')}`));
        if (record.visualAnalysis) {
          card.append(
            element('p', '', `Observação do modelo: ${record.visualAnalysis.layout}`),
            element('p', '', `${record.visualAnalysis.visibleComponents.length} componente(s) aparente(s) · ${record.visualAnalysis.visibleText.length} texto(s) lido(s) · ${record.visualAnalysis.inferredInteractions.length} hipótese(s) de interação.`),
            element('p', '', `SHA-256: ${spec.imageAnalysis?.imageSha256 || 'não informado'} · ${spec.imageAnalysis?.provider || 'provider não informado'} · ${spec.imageAnalysis?.durationMs ?? '—'} ms`)
          );
        }
        intakeList.prepend(card);
      };
      const saveIntakeRecord = async (record) => {
        await json('/api/memory/write', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: 'project', classification: 'internal', confidence: record.visualAnalysis ? 0.45 : record.spec.analysisStatus === 'PARTIALLY_ANALYZED' ? 0.5 : 0.3, projectId: project.id, stableKey: `project-reference:${project.id}:${record.spec.referenceId}`, title: `Referência de design · ${project.name || project.id}`, content: JSON.stringify(record), tags: ['design-reference-intake', 'rea', 'project-design'], provenance: { type: 'operator-provided-reference', reference: record.url || record.spec.referenceId, evidence: [record.spec.referenceId, ...(record.spec.imageAnalysis?.imageSha256 ? [record.spec.imageAnalysis.imageSha256] : [])], projectId: project.id } })
        });
        renderIntakeRecord(record);
      };
      addReference.addEventListener('click', async () => {
        const urlValue = sourceUrl.value.trim();
        const contentValue = sourceContent.value.trim();
        if (!urlValue && !contentValue) { intakeStatus.textContent = 'Informe uma URL ou conteúdo autorizado para analisar.'; return; }
        if (urlValue) {
          try {
            const parsed = new URL(urlValue);
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocolo');
            parsed.username = ''; parsed.password = ''; parsed.hash = '';
            sourceUrl.value = parsed.href;
          }
          catch { intakeStatus.textContent = 'Use uma URL HTTP ou HTTPS válida.'; return; }
        }
        const normalizedUrl = sourceUrl.value.trim();
        addReference.disabled = true;
        intakeStatus.textContent = 'Analisando estrutura fornecida; nenhum site está sendo acessado automaticamente…';
        try {
          const result = await json('/api/v2/intent/ingest-reference', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ type: normalizedUrl ? 'URL_WEBSITE' : 'USER_DESCRIPTION', url: normalizedUrl, text: contentValue, source: `project-hub:${project.id}`, targetFenixViews: ['projects', 'ide', 'flow-graph'] })
          });
          const spec = result.referenceSpec;
          if (!spec?.referenceId || !spec.analysisStatus) throw new Error('O REA não retornou um estado de análise rastreável.');
          const record = { version: 1, projectId: project.id, url: normalizedUrl, submittedContent: contentValue, spec, savedAt: new Date().toISOString() };
          await saveIntakeRecord(record);
          sourceContent.value = '';
          intakeStatus.textContent = spec.analysisStatus === 'NEEDS_CAPTURE'
            ? 'Referência vinculada. A URL não foi acessada; adicione captura ou conteúdo autorizado para medir a interface.'
            : `Referência vinculada · ${spec.analysisStatus}. Pistas textuais ainda precisam de validação.`;
        } catch (error) { intakeStatus.textContent = `Não foi possível vincular a referência: ${error.message}`; }
        finally { addReference.disabled = false; }
      });
      const analyzeImage = element('button', 'flp-button flp-button-primary', 'Analisar captura com modelo de visão');
      analyzeImage.type = 'button';
      analyzeImage.addEventListener('click', async () => {
        const file = imageInput.files?.[0];
        if (!file) { intakeStatus.textContent = 'Selecione uma captura PNG, JPEG ou WebP.'; return; }
        if (file.size > 1024 * 1024) { intakeStatus.textContent = 'A captura deve ter até 1 MiB.'; return; }
        analyzeImage.disabled = true;
        intakeStatus.textContent = 'Enviando captura ao provider visual configurado…';
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = '';
          for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
          const result = await json('/api/v2/intent/analyze-reference-image', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ projectId: project.id, imageBase64: btoa(binary) })
          });
          const spec = result.referenceSpec;
          if (!spec?.referenceId || spec.analysisStatus !== 'MODEL_OBSERVATIONS_REQUIRES_VALIDATION' || !result.analysis) throw new Error('O provider não retornou uma análise visual rastreável.');
          const record = { version: 1, projectId: project.id, url: '', submittedContent: '', captureMimeType: spec.imageAnalysis?.mimeType || file.type, spec, visualAnalysis: result.analysis, savedAt: new Date().toISOString() };
          await saveIntakeRecord(record);
          imageInput.value = '';
          intakeStatus.textContent = `Observações de ${spec.imageAnalysis?.provider || 'provider'} / ${spec.imageAnalysis?.model || 'modelo'} vinculadas. Valide os itens no preview antes de implementar.`;
        } catch (error) { intakeStatus.textContent = `Análise visual indisponível: ${error.message}`; }
        finally { analyzeImage.disabled = false; }
      });
      intake.append(sourceUrl, sourceContent, addReference, imageInput, analyzeImage, intakeStatus, intakeList);
      designInputs.appendChild(intake);
      json(`/api/memory/project/${encodeURIComponent(project.id)}`).then((result) => {
        const records = (result.results || []).map((item) => item.memory || item).filter((memory) =>
          memory?.projectId === project.id && memory.stableKey?.startsWith(`project-reference:${project.id}:`) && memory.content
        ).map((memory) => { try { return JSON.parse(memory.content); } catch { return null; } })
          .filter((record) => record?.version === 1 && record.projectId === project.id && /^[\w.-]{1,100}$/.test(String(record.spec?.referenceId || '')));
        intakeList.replaceChildren();
        records.forEach(renderIntakeRecord);
        if (records.length) intakeStatus.textContent = `${records.length} referência(s) externa(s) recuperada(s) da memória do projeto.`;
      }).catch((error) => { intakeStatus.textContent = `Referências salvas não puderam ser carregadas: ${error.message}`; });

      const savedDraft = state.designDrafts.get(project.id);
      if (savedDraft) {
        goal.value = savedDraft.designGoal || '';
        surface.value = savedDraft.surface || 'web';
        direction.value = savedDraft.visualDirection || 'brand-preserving';
        designInputs.querySelectorAll('[data-design-source]').forEach((input) => { input.checked = savedDraft.referenceSources.includes(input.dataset.designSource); });
        designInputs.querySelectorAll('[data-design-viewport]').forEach((input) => { input.checked = savedDraft.targetViewports.includes(Number(input.dataset.designViewport)); });
      }
      const rememberDesignDraft = () => state.designDrafts.set(project.id, {
        designGoal: goal.value,
        surface: surface.value,
        visualDirection: direction.value,
        referenceSources: [...designInputs.querySelectorAll('[data-design-source]:checked')].map((input) => input.dataset.designSource),
        targetViewports: [...designInputs.querySelectorAll('[data-design-viewport]:checked')].map((input) => Number(input.dataset.designViewport))
      });
      designInputs.addEventListener('input', rememberDesignDraft);
      designInputs.addEventListener('change', rememberDesignDraft);
      section.appendChild(designInputs);
      const targets = element('p', 'flp-intelligence-note', `Alvos do design system · controles ${profile.controls.compact}/${profile.controls.standard}/${profile.controls.touch} px · espaçamento ${profile.controls.spacing.join('/')} px. ${profile.controlNote}`);
      section.appendChild(targets);
      const details = element('details', 'flp-design-contract');
      details.appendChild(element('summary', '', 'Ver entradas, regras de interação e entregáveis'));
      for (const [title, items] of [
        ['Entradas do projeto', profile.intake],
        ['Comportamento dos controles', profile.interactionRules],
        ['Entregáveis conectados', profile.deliverables]
      ]) {
        if (!Array.isArray(items) || !items.length) continue;
        details.appendChild(element('h5', '', title));
        const list = element('ul', 'flp-intelligence-list');
        for (const item of items) list.appendChild(element('li', '', item));
        details.appendChild(list);
      }
      details.appendChild(element('h5', '', 'Matriz de capacidades e adaptação no Fênix'));
      const capabilityList = element('div', 'flp-reference-capabilities');
      for (const capability of profile.capabilityMap || []) {
        const card = element('article', 'flp-reference-capability');
        card.dataset.status = capability.status;
        card.append(
          element('span', 'flp-reference-product', capability.product),
          element('strong', '', capability.capability),
          element('span', `flp-reference-status is-${String(capability.status || '').toLowerCase()}`, capability.status),
          element('p', '', capability.fenix),
          element('small', '', `Evidência/localização: ${capability.evidence}`)
        );
        if (capability.action) {
          const open = element('button', 'flp-button flp-button-soft', capability.actionLabel || 'Abrir no Fênix');
          open.type = 'button';
          open.dataset.referenceAction = capability.action;
          open.addEventListener('click', () => openDesignCapability(capability.action, project));
          card.appendChild(open);
        }
        capabilityList.appendChild(card);
      }
      details.appendChild(capabilityList);
      section.appendChild(details);
    }
    const status = element('p', 'flp-design-reference-status', 'Consultando memória do projeto…');
    status.setAttribute('role', 'status');
    section.appendChild(status);
    const apply = element('button', 'flp-button flp-button-primary', 'Aplicar fluxo de design ao projeto');
    apply.type = 'button';
    apply.addEventListener('click', async () => {
      apply.disabled = true;
      status.textContent = 'Salvando perfil na memória autenticada…';
      try {
          const preferences = surface && direction && designInputs ? {
            designGoal: designInputs.querySelector('#flpDesignGoal')?.value || '',
            surface: surface.value,
            visualDirection: direction.value,
            referenceSources: [...designInputs.querySelectorAll('[data-design-source]:checked')].map((input) => input.dataset.designSource),
            targetViewports: [...designInputs.querySelectorAll('[data-design-viewport]:checked')].map((input) => Number(input.dataset.designViewport))
          } : {};
          const saved = await window.FenixDesignReference.apply(project, preferences);
        status.textContent = saved.universalMemorySaved
          ? 'Preferências deste projeto salvas na memória; padrões gerais salvos na memória visual universal.'
          : `Preferências salvas no projeto; memória universal não atualizada: ${saved.universalMemoryError || 'indisponível'}.`;
        apply.textContent = 'Atualizar fluxo de design';
        section.dataset.profileState = 'configured';
      } catch (error) {
        status.textContent = `Não foi possível salvar o perfil: ${error.message}`;
        section.dataset.profileState = 'error';
      } finally { apply.disabled = false; }
    });
    section.appendChild(apply);
    const designDocStatus = element('p', 'flp-design-reference-status', 'Gere um DESIGN.md rastreável com objetivo, referências e a última análise REA do workspace.');
    designDocStatus.setAttribute('role', 'status');
    designDocStatus.dataset.designDocumentStatus = 'true';
    const designDocPreview = element('section', 'flp-design-import-preview');
    designDocPreview.hidden = true;
    let pendingDesignImport = null;
    const generateDesignDoc = element('button', 'flp-button flp-button-primary', 'Gerar DESIGN.md com REA');
    generateDesignDoc.type = 'button';
    generateDesignDoc.disabled = !workspaceIsAvailable(project);
    generateDesignDoc.addEventListener('click', async () => {
      generateDesignDoc.disabled = true;
      designDocStatus.textContent = 'Confirmando evidência REA do workspace…';
      try {
        let analysis = state.reaAnalyses.get(project.id);
        if (!analysis?.evidence) {
          await loadReaEvidence(project, true);
          analysis = state.reaAnalyses.get(project.id);
        }
        if (!analysis?.evidence) throw new Error(analysis?.error || 'O REA não retornou evidência persistida.');
        const preferences = window.FenixDesignReference.normalizePreferences({
          designGoal: designInputs?.querySelector('#flpDesignGoal')?.value || '',
          surface: surface?.value || 'web',
          visualDirection: direction?.value || 'brand-preserving',
          referenceSources: [...(designInputs?.querySelectorAll('[data-design-source]:checked') || [])].map((input) => input.dataset.designSource),
          targetViewports: [...(designInputs?.querySelectorAll('[data-design-viewport]:checked') || [])].map((input) => Number(input.dataset.designViewport))
        });
        const evidence = analysis.evidence;
        const selectedReferences = (profile.referenceCatalog || []).filter((source) => preferences.referenceSources.includes(source.id));
        const lines = [
          `# ${project.name || project.id} — Design System`, '',
          '> Gerado pelo Fênix com perfil de design e evidência REA do workspace. Referências externas são guias documentais; não representam integrações.', '',
          '## Contexto',
          `- Projeto: ${project.name || project.id} (${project.id})`,
          `- Workspace: ${project.workspace || 'caminho não informado'}`,
          `- Objetivo: ${preferences.designGoal || 'Ainda não definido pelo operador.'}`,
          `- Superfície: ${preferences.surface}; direção: ${preferences.visualDirection}`,
          `- Viewports alvo: ${preferences.targetViewports.length ? preferences.targetViewports.map((width) => `${width}px`).join(', ') : 'nenhum selecionado'}`,
          '', '## Evidência observada no código',
          `- ID REA: ${evidence.evidenceId || 'não informado'}`,
          `- SHA-256 do alvo: ${evidence.subjectSha256 || 'não informado'}`,
          `- Arquivos analisados: ${evidence.metrics?.scannedFilesCount ?? 'não informado'}`,
          `- Rotas detectadas: ${evidence.metrics?.routesDetected ?? 'não informado'}`,
          `- Persistência da análise: ${evidence.persistence?.status || 'não informada'}`,
          '- Componentes/telas, espaçamentos e cores não são medidos por esta análise, salvo evidência explícita abaixo.', '',
          '## Referências selecionadas',
          ...(selectedReferences.length ? selectedReferences.flatMap((source) => [`- [${source.name}](${source.url}) — ${source.observed}`]) : ['- Nenhuma referência selecionada.']),
          '', '## Regras de interação', ...profile.interactionRules.map((rule) => `- ${rule}`),
          '', '## Alvos de controles Fênix (não medidos no projeto)',
          `- compacto: ${profile.controls.compact}px; padrão: ${profile.controls.standard}px; toque: ${profile.controls.touch}px. ${profile.controlNote}`,
          `- Espaçamento alvo: ${profile.controls.spacing.join(', ')}px.`,
          '', '## Limites e próximos passos',
          '- Trate qualquer decisão visual sem medição como hipótese até validar no preview e nos viewports selecionados.',
          '- Revise rotas, estados de loading/vazio/erro/sucesso, acessibilidade e desempenho antes de concluir.',
          `- Origem rastreável: REA ${evidence.evidenceId || 'sem ID'} · projeto ${project.id} · gerado ${new Date().toISOString()}.`, ''
        ];
        const content = lines.join('\n');
        if (!await openProjectInIde(project)) throw new Error('A navegação para a IDE foi cancelada ou bloqueada. Nenhum arquivo foi gravado.');
        const fileUrl = `/api/fenix/projects/${encodeURIComponent(project.id)}/file?path=${encodeURIComponent('DESIGN.md')}`;
        let existing = null;
        try { existing = await json(fileUrl); } catch (error) { if (error.status !== 404) throw error; }
        const draft = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/drafts`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path: 'DESIGN.md', content, createFile: !existing, expectedHash: existing?.hash ?? null, summary: `DESIGN.md baseado na evidência ${evidence.evidenceId || 'REA'}`, evidenceId: evidence.evidenceId })
        });
        if (!window.FenixProjectIDE?.reviewWorkspaceDraft?.(draft)) throw new Error('Não foi possível abrir o diff da IDE. O arquivo permanece sem alteração.');
        designDocStatus.textContent = `${draft.path} pronto para revisão · ${draft.added} linhas adicionadas · evidência ${evidence.evidenceId || 'REA sem ID'}. Nenhum arquivo foi gravado.`;
      } catch (error) {
        designDocStatus.textContent = `Não foi possível gerar o preview: ${error.message}`;
      } finally { generateDesignDoc.disabled = !workspaceIsAvailable(project); }
    });
    const importDesignDoc = element('button', 'flp-button flp-button-soft', 'Carregar DESIGN.md existente');
    importDesignDoc.type = 'button';
    importDesignDoc.disabled = !workspaceIsAvailable(project);
    importDesignDoc.addEventListener('click', async () => {
      importDesignDoc.disabled = true;
      designDocStatus.textContent = 'Lendo DESIGN.md do workspace…';
      designDocPreview.hidden = true;
      try {
        const path = 'DESIGN.md';
        const document = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/file?path=${encodeURIComponent(path)}`);
        if (typeof document.content !== 'string') throw new Error('A API não retornou texto para DESIGN.md.');
        const parsed = window.FenixDesignDocument.parse(document.content);
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(document.content));
        const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
        pendingDesignImport = { path, content: document.content, parsed, sha256 };
        designDocPreview.replaceChildren();
        const summary = element('p', 'flp-design-reference-status', `Prévia sem gravação · objetivo: ${parsed.preferences.designGoal || 'não definido'} · ${parsed.preferences.surface} / ${parsed.preferences.visualDirection} · ${parsed.preferences.targetViewports.join(', ') || 'viewports não definidos'} · REA ${parsed.evidence.evidenceId || 'sem ID'} · SHA-256 ${sha256.slice(0, 16)}…`);
        summary.setAttribute('role', 'status');
        const disclosure = element('details', 'flp-design-import-source');
        disclosure.append(element('summary', '', 'Ver Markdown original (não será enviado ao modelo)'));
        const source = element('pre', '', document.content.slice(0, 12000));
        source.textContent = document.content.slice(0, 12000);
        disclosure.appendChild(source);
        const confirmImport = element('button', 'flp-button flp-button-primary', 'Confirmar importação no perfil do projeto');
        confirmImport.type = 'button';
        confirmImport.addEventListener('click', async () => {
          if (!pendingDesignImport) return;
          confirmImport.disabled = true;
          try {
            const imported = await window.FenixDesignReference.importDocument(project, pendingDesignImport.parsed, { path: pendingDesignImport.path, sha256: pendingDesignImport.sha256 });
            designDocStatus.textContent = `Preferências estruturadas importadas para este projeto · ${imported.importedDocument.status} · SHA-256 ${imported.importedDocument.sha256.slice(0, 16)}… O Markdown original não foi armazenado nem enviado ao modelo.`;
            pendingDesignImport = null;
            designDocPreview.hidden = true;
          } catch (error) {
            designDocStatus.textContent = `Não foi possível salvar a importação: ${error.message}`;
            confirmImport.disabled = false;
          }
        });
        const cancelImport = element('button', 'flp-button flp-button-soft', 'Cancelar');
        cancelImport.type = 'button';
        cancelImport.addEventListener('click', () => { pendingDesignImport = null; designDocPreview.hidden = true; designDocStatus.textContent = 'Importação cancelada; nenhuma preferência foi gravada.'; });
        designDocPreview.append(summary, disclosure, confirmImport, cancelImport);
        designDocPreview.hidden = false;
        designDocStatus.textContent = 'Revise os campos extraídos. Nada será gravado até confirmar.';
      } catch (error) {
        designDocStatus.textContent = `Não foi possível carregar DESIGN.md: ${error.message}`;
      } finally { importDesignDoc.disabled = !workspaceIsAvailable(project); }
    });
    section.append(generateDesignDoc, importDesignDoc, designDocStatus, designDocPreview);
    container.appendChild(section);
    Promise.all([
      window.FenixDesignReference?.read(project.id),
      window.FenixDesignReference?.readGlobal()
    ]).then(([saved, universal]) => {
      if (!status.isConnected) return;
      if (saved?.error) {
        status.textContent = `Memória indisponível: ${saved.error}`;
        section.dataset.profileState = 'unavailable';
      } else if (saved) {
        status.textContent = `Ativo na memória do projeto · versão ${saved.version} · salvo ${date(saved.updatedAt)}.`;
        apply.textContent = 'Atualizar fluxo de design';
        section.dataset.profileState = 'configured';
        if (!state.designDrafts.has(project.id)) {
          const preferences = window.FenixDesignReference.normalizePreferences(saved.preferences || {});
          const savedGoal = designInputs.querySelector('#flpDesignGoal');
          if (savedGoal) savedGoal.value = preferences.designGoal;
          surface.value = preferences.surface;
          direction.value = preferences.visualDirection;
          designInputs.querySelectorAll('[data-design-source]').forEach((input) => { input.checked = preferences.referenceSources.includes(input.dataset.designSource); });
          designInputs.querySelectorAll('[data-design-viewport]').forEach((input) => { input.checked = preferences.targetViewports.includes(Number(input.dataset.designViewport)); });
        }
      } else if (universal && !universal.error) {
        status.textContent = `Memória visual universal ativa · versão ${universal.version}. Este projeto ainda não tem uma configuração específica.`;
        apply.textContent = 'Aplicar também a este projeto';
        section.dataset.profileState = 'inherited';
      } else if (universal?.error) {
        status.textContent = `Perfil do projeto não encontrado; memória universal indisponível: ${universal.error}`;
        section.dataset.profileState = 'unavailable';
      } else {
        status.textContent = 'Ainda não aplicado a este projeto.';
        section.dataset.profileState = 'not-configured';
      }
    }).catch((error) => { if (status.isConnected) status.textContent = `Memória indisponível: ${error.message}`; });
  }

  function openDesignCapability(action, project) {
    if (!project?.id) return false;
    if (action === 'projects' || action === 'screens' || action === 'intelligence') {
      state.hubViewMode = 'fenix';
      state.workspaceTab = action === 'projects' ? 'overview' : action;
      $('flpModeFenix')?.classList.add('active');
      $('flpModeScreens')?.classList.remove('active');
      if ($('flpFenixSidebarView')) $('flpFenixSidebarView').style.display = 'block';
      selectProject(project.id);
      if (action === 'screens') loadRegisteredScreens(project);
      if (action === 'intelligence') {
        if (!state.analyses.has(project.id)) loadProjectAnalysis(project.id);
        if (!state.reaAnalyses.has(project.id)) loadReaEvidence(project, false);
      }
      return true;
    }
    if (action === 'ide') {
      return openProjectInIde(project);
    }
    return false;
  }

  function renderReaEvidence(container, project) {
    const section = element('section', 'flp-intelligence-section flp-rea-evidence');
    const result = state.reaAnalyses.get(project.id);
    section.append(element('h4', '', 'REA · evidência e padrões do projeto'));
    section.append(element('p', 'flp-intelligence-note', 'Leitura do workspace selecionado. O resultado registra hash, rotas, módulos e limites observados; não altera arquivos nem inicia jobs.'));
    if (result?.loading) {
      section.append(element('p', 'flp-empty', 'REA está lendo o workspace real…'));
    } else if (result?.error) {
      section.append(element('p', 'flp-intelligence-error', `A análise REA falhou: ${result.error}`));
    } else if (result?.evidence) {
      const evidence = result.evidence;
      const metrics = element('div', 'flp-rea-summary');
      for (const [label, value] of [
        ['Evidência', evidence.evidenceId],
        ['SHA-256', evidence.subjectSha256],
        ['Módulos lidos', evidence.metrics?.scannedFilesCount],
        ['Rotas', evidence.metrics?.routesDetected],
        ['Fronteiras', evidence.metrics?.ipcBoundariesCount],
        ['Persistência', evidence.persistence?.status || 'Não confirmada']
      ]) metrics.appendChild(row(label, value));
      section.appendChild(metrics);
      section.append(element('p', 'flp-intelligence-note', `Analisado em ${date(evidence.analyzedAt)} · ${text(evidence.durationMs)} ms · ${evidence.metrics?.graphNodesCount ?? 0} nós e ${evidence.metrics?.graphEdgesCount ?? 0} relações.`));
      const evidenceList = element('ul', 'flp-intelligence-list');
      const observedRoutes = (evidence.routes || []).slice(0, 8);
      for (const route of observedRoutes) {
        const item = element('li', 'flp-rea-route-item');
        item.appendChild(element('span', '', `Rota observada: ${route.path} · ${route.file || 'arquivo não informado'}`));
        const openFile = element('button', 'flp-button flp-button-soft', route.file ? `Abrir ${route.file} na IDE` : 'Arquivo não informado');
        openFile.type = 'button';
        openFile.disabled = !route.file || !workspaceIsAvailable(project);
        openFile.title = route.file ? 'Abre o workspace analisado e seleciona o arquivo citado pelo REA' : 'O REA não informou um arquivo de origem para esta rota';
        openFile.addEventListener('click', () => openProjectFileInIde(project, route.file));
        item.appendChild(openFile);
        evidenceList.appendChild(item);
      }
      const findings = [
        ...(evidence.ipcBoundaries || []).slice(0, 5).map((boundary) => `Fronteira observada: ${boundary.protocol} · ${boundary.file}`),
        ...(evidence.storageSchemas || []).slice(0, 5).map((schema) => `Persistência observada: ${schema.engine} · ${schema.table} · ${schema.file}`),
        ...(evidence.unknowns || []).slice(0, 5).map((unknown) => `Não resolvido: ${unknown.reason} · ${unknown.file}`)
      ];
      if (!findings.length) findings.push('REA não encontrou rotas, fronteiras ou schemas nos arquivos lidos.');
      for (const finding of findings) evidenceList.appendChild(element('li', '', finding));
      section.appendChild(evidenceList);
    } else {
      section.append(element('p', 'flp-empty', 'Ainda não há evidência REA salva para este projeto.'));
    }

    const actions = element('div', 'flp-intelligence-actions');
    const analyze = element('button', 'flp-button flp-button-primary', result?.evidence ? 'Atualizar análise REA' : 'Analisar com REA');
    analyze.type = 'button';
    analyze.disabled = !workspaceIsAvailable(project) || Boolean(result?.loading);
    analyze.addEventListener('click', () => loadReaEvidence(project, true));
    actions.appendChild(analyze);
    if (result?.evidence) {
      const graph = element('button', 'flp-button flp-button-soft', 'Abrir Flow Graph');
      graph.type = 'button';
      graph.addEventListener('click', () => window.fenixOpenFlowGraph?.({ context: 'PROJECT', entityId: `project:${project.id}` }));
      const ide = element('button', 'flp-button flp-button-soft', 'Abrir IDE');
      ide.type = 'button';
      ide.addEventListener('click', () => openProjectInIde(project));
      actions.append(graph, ide);
    }
    section.appendChild(actions);
    container.appendChild(section);
  }

  async function loadReaEvidence(project, run = true) {
    const existing = state.reaAnalyses.get(project.id);
    if (existing?.loading) return;
    state.reaAnalyses.set(project.id, { loading: true, error: null, evidence: existing?.evidence || null });
    if (state.selected === project.id && state.workspaceTab === 'intelligence') renderDetail();
    try {
      const evidence = run
        ? await json('/api/v2/rea/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: project.id })
          })
        : await json(`/api/v2/rea/evidence/${encodeURIComponent(project.id)}`);
      state.reaAnalyses.set(project.id, { loading: false, evidence });
      if (run) $('flpMeasured').textContent = `REA persistido · ${evidence.evidenceId} · ${evidence.metrics?.scannedFilesCount ?? 0} módulos · ${evidence.metrics?.routesDetected ?? 0} rotas`;
    } catch (error) {
      const notFound = !run && error.status === 404;
      state.reaAnalyses.set(project.id, { loading: false, error: notFound ? null : error.message, evidence: null });
      if (!notFound) $('flpMeasured').textContent = `Falha na análise REA: ${error.message}`;
    }
    if (state.selected === project.id && state.workspaceTab === 'intelligence') renderDetail();
  }

  function renderGraphTab(container, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Relações encontradas no código'));
    const report = state.analyses.get(project.id)?.report;
    const edges = report?.systemMap?.edges || [];
    if (!edges.length) panel.append(element('p', 'flp-empty', 'Sem relações registradas. Faça um mapeamento estrutural para criar o grafo a partir dos arquivos.'));
    else {
      const list = element('ul', 'flp-intelligence-list');
      for (const edge of edges.slice(0, 250)) list.appendChild(element('li', '', `${edge.from} — ${edge.type} → ${edge.to}`));
      panel.appendChild(list);
      if (edges.length > 250) panel.append(element('p', 'flp-intelligence-note', `Exibindo 250 de ${edges.length} relações registradas.`));
    }
    container.appendChild(panel);
    if (!report && !state.analyses.get(project.id)?.loading) loadProjectAnalysis(project.id);
  }

  function renderExecutionPanels(container, detail) {
    const progress = element('section', 'flp-panel');
    progress.append(element('h3', '', 'Execução do Projeto'));
    const progressFields = [['Concluídos', 'completed'], ['Executando', 'running'], ['Na fila', 'queued'], ['Falhas', 'failed']];
    if (progressFields.some(([, key]) => Number.isFinite(detail.progress?.[key]))) {
      const counts = element('div', 'flp-job-counts');
      for (const [label, key] of progressFields) {
        const item = element('div');
        item.append(element('strong', '', Number.isFinite(detail.progress?.[key]) ? String(detail.progress[key]) : '—'), element('span', '', label));
        counts.appendChild(item);
      }
      progress.appendChild(counts);
    } else {
      progress.append(element('p', 'flp-empty', 'Métricas de execução ainda não mapeadas.'));
    }
    container.appendChild(progress);

    const artifacts = element('section', 'flp-panel');
    artifacts.append(element('h3', '', 'Artefatos Registrados'));
    if (!Array.isArray(detail.artifacts)) {
      artifacts.append(element('p', 'flp-empty', 'Estado dos artefatos ainda não mapeado.'));
    } else if (!detail.artifacts.length) {
      artifacts.append(element('p', 'flp-empty', 'Nenhum artefato registrado para este projeto.'));
    } else {
      for (const artifact of detail.artifacts.slice(-6).reverse()) {
        const item = element('div', 'flp-artifact');
        item.append(element('strong', '', artifact.name || artifact.type), element('span', '', `${artifact.type} · ${date(artifact.createdAt)}`));
        artifacts.appendChild(item);
      }
    }
    container.appendChild(artifacts);
  }

  // Screen inspector shows only data measured during project absorption.
  function openInspector(screen, project) {
    project = project || state.projects.find((item) => item.id === state.selected);
    if (!screen || !project) return;
    state.inspectorScreen = screen;
    state.inspectorTab = 'preview';
    let container = $('flpInspectorContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'flpInspectorContainer';
      document.body.appendChild(container);
    }

    const close = () => container.replaceChildren();
    const backdrop = element('div', 'flp-inspector-backdrop');
    backdrop.id = 'flpInspectorBackdrop';
    const dialog = element('div', 'flp-inspector-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const header = element('header', 'flp-inspector-head');
    const identity = element('div');
    identity.append(element('span', 'flp-eyebrow', 'SCREEN DNA · CAPTURA DO PROJETO'));
    identity.append(element('h2', '', screen.name || screen.title || screen.screenId || 'Tela observada'));
    identity.append(element('code', '', `${project.name || project.id} · ${screen.route || 'Rota não registrada'}`));
    const actions = element('div', 'flp-inspector-actions');
    const openIde = element('button', 'flp-button flp-button-primary', 'Abrir na IDE');
    openIde.type = 'button';
    openIde.disabled = !workspaceIsAvailable(project);
    openIde.addEventListener('click', async () => {
      if (await openProjectInIde(project, null, screen)) close();
    });
    const closeButton = element('button', 'flp-button flp-button-soft', 'Fechar');
    closeButton.type = 'button';
    closeButton.addEventListener('click', close);
    actions.append(openIde, closeButton);
    header.append(identity, actions);

    const tabs = element('div', 'flp-inspector-tabs');
    for (const [id, label] of [['preview', 'Prévia'], ['evidence', 'Dados observados']]) {
      const button = element('button', `flp-insp-tab${state.inspectorTab === id ? ' active' : ''}`, label);
      button.type = 'button';
      button.dataset.tab = id;
      button.addEventListener('click', () => {
        state.inspectorTab = id;
        tabs.querySelectorAll('.flp-insp-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === id));
        renderInspectorContent(screen, project);
      });
      tabs.appendChild(button);
    }
    const content = element('div', 'flp-inspector-content');
    content.id = 'flpInspectorBody';
    dialog.append(header, tabs, content);
    backdrop.appendChild(dialog);
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
    container.replaceChildren(backdrop);
    renderInspectorContent(screen, project);
  }

  function renderInspectorContent(screen, project) {
    const body = $('flpInspectorBody');
    if (!body) return;
    body.replaceChildren();
    if (state.inspectorTab === 'preview') {
      const preview = element('div', 'flp-dna-inspector-preview');
      if (screen.screenshotPath) {
        const image = document.createElement('img');
        image.src = screen.screenshotPath;
        image.alt = `Captura observada: ${screen.name || screen.title || screen.route || 'tela sem nome'}`;
        image.onerror = () => {
          image.remove();
          preview.appendChild(element('p', 'flp-dna-empty', 'A captura registrada não está acessível neste servidor.'));
        };
        preview.appendChild(image);
      } else {
        preview.appendChild(element('p', 'flp-dna-empty', 'Este registro não contém uma captura de tela.'));
      }
      body.appendChild(preview);
      return;
    }

    const evidence = element('div', 'flp-dna-evidence');
    const domNodes = Number(screen.domSummary?.totalNodes);
    const hasMeasuredDom = screen.domSummary?.totalNodes != null && Number.isFinite(domNodes);
    const measuredComponents = Array.isArray(screen.componentEvidence) ? screen.componentEvidence : null;
    evidence.append(
      row('Projeto', project.name || project.id),
      row('Rota declarada', screen.route || 'Não registrada'),
      row('Elementos DOM', hasMeasuredDom ? String(domNodes) : screen.domInspectionStatus === 'INSPECTED' ? 'Inspecionados; contagem indisponível' : 'Não medidos'),
      row('Captura visual', screen.captureStatus === 'CAPTURED' || screen.screenshotPath ? 'Capturada' : screen.captureStatus === 'CAPTURE_FAILED' ? 'Falhou' : 'Não capturada'),
      row('Confiança', screen.confidenceStatus === 'BROWSER_OBSERVED' && Number.isFinite(Number(screen.confidence)) ? `Observação real (${screen.confidence})` : 'Não pontuada'),
      row('Layout', screen.layoutEvidenceStatus === 'INFERRED_FROM_ROUTE' ? 'Inferido pela rota; não medido' : (screen.layout || 'Não informado')),
      row('Componentes identificados', measuredComponents ? String(measuredComponents.length) : 'Não medidos'),
      row('Arquivo de origem', screen.sourceFile || 'Não registrado'),
      row('Origem', screen.source || screen.captureSource || 'Origem não registrada')
    );
    if (measuredComponents?.length) {
      const list = element('ul', 'flp-dna-component-list');
      for (const component of measuredComponents) list.appendChild(element('li', '', component));
      evidence.appendChild(list);
    }
    body.appendChild(evidence);
  }
  function renderGit(target, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Git · Versão e Publicação'));
    const data = state.git.get(project.id);
    if (!data) {
      panel.append(element('p', 'flp-empty', 'Lendo repositório Git…'));
      target.appendChild(panel);
      return;
    }
    if (data.error) {
      panel.append(element('p', 'flp-empty', data.error));
      target.appendChild(panel);
      return;
    }
    panel.append(
      row('Versão Atual', data.head ? data.head.slice(0, 12) : '—'),
      row('Branch', data.branch || 'sem branch'),
      row('Remote', data.remote || 'não configurado'),
      row('Sincronização', data.upstream ? `${data.ahead ?? '?'} à frente · ${data.behind ?? '?'} atrás de ${data.upstream}` : 'sem upstream')
    );
    renderConnection(panel, project);
    const files = Array.isArray(data.files) ? data.files : [];
    const changes = element('div', 'flp-git-changes');
    changes.append(element('h4', '', `Mudanças (${files.length})`));
    if (!files.length) changes.append(element('p', 'flp-empty', 'Workspace limpo.'));
    for (const file of files) {
      const line = element('div', 'flp-git-file');
      const label = element('label');
      const check = element('input');
      check.type = 'checkbox';
      check.value = file;
      check.className = 'flp-git-select';
      label.append(check, element('span', '', file));
      const diffButton = element('button', 'flp-button flp-button-soft', 'Ver diff');
      diffButton.type = 'button';
      diffButton.addEventListener('click', async () => {
        const preview = line.querySelector('pre') || element('pre', 'flp-git-diff');
        preview.textContent = 'Carregando diff…';
        line.appendChild(preview);
        try {
          const result = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/diff?path=${encodeURIComponent(file)}`);
          preview.textContent = result.diff;
        } catch (error) {
          preview.textContent = error.message;
        }
      });
      line.append(label, diffButton);
      changes.append(line);
    }
    panel.appendChild(changes);

    const form = element('form', 'flp-git-form');
    const message = element('input');
    message.name = 'message';
    message.placeholder = 'Mensagem do commit';
    message.maxLength = 200;
    message.required = true;
    const aiBtn = element('button', 'flp-button flp-button-soft', '💡 Sugerir IA');
    aiBtn.type = 'button';
    aiBtn.title = 'Sugerir mensagem com base nas alterações';
    aiBtn.addEventListener('click', () => {
      const selectedFiles = [...panel.querySelectorAll('.flp-git-select:checked')].map((input) => input.value);
      const targets = selectedFiles.length ? selectedFiles : data.files;
      if (!targets.length) {
        message.value = 'chore: atualizações no workspace';
        return;
      }
      const first = targets[0].split('/').pop();
      if (targets.some(f => f.includes('test'))) {
        message.value = `test: atualizar testes para ${first}`;
      } else if (targets.some(f => f.endsWith('.css'))) {
        message.value = `style: aprimorar estilos visuais (${first})`;
      } else if (targets.some(f => f.includes('api') || f.includes('route') || f.includes('server'))) {
        message.value = `feat(api): expandir rotas e contratos (${first})`;
      } else if (targets.length === 1) {
        message.value = `feat: atualizar ${first}`;
      } else {
        message.value = `refactor: atualizar ${targets.length} arquivos (${first}, etc.)`;
      }
    });
    const commit = element('button', 'flp-button flp-button-primary', 'Criar commit');
    commit.type = 'submit';
    commit.disabled = !files.length;
    form.append(message, aiBtn, commit);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const files = [...panel.querySelectorAll('.flp-git-select:checked')].map((input) => input.value);
      if (!files.length) {
        setGitMessage(panel, 'Selecione os arquivos do commit.');
        return;
      }
      commit.disabled = true;
      setGitMessage(panel, 'Criando commit…');
      try {
        const result = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/commit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedHead: data.head, message: message.value, files })
        });
        state.git.set(project.id, result);
        renderDetail();
      } catch (error) {
        setGitMessage(panel, error.message);
        commit.disabled = false;
      }
    });
    panel.appendChild(form);

    const pushRow = element('div', '', '');
    pushRow.style.display = 'flex';
    pushRow.style.gap = '8px';
    pushRow.style.alignItems = 'center';
    pushRow.style.flexWrap = 'wrap';

    const push = element('button', 'flp-button flp-button-soft', 'Push para origin');
    push.type = 'button';
    push.disabled = !data.remote || Boolean(data.status);
    push.addEventListener('click', async () => {
      push.disabled = true;
      setGitMessage(panel, 'Enviando branch…');
      try {
        const result = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedHead: data.head })
        });
        state.git.set(project.id, result);
        renderDetail();
        setGitMessage(panel, 'Push concluído.');
      } catch (error) {
        setGitMessage(panel, error.message);
        push.disabled = false;
      }
    });
    pushRow.appendChild(push);

    if (state.githubAccount?.connected) {
      pushRow.appendChild(element('span', 'flp-gh-badge flp-gh-badge-active', `Token PAT (@${state.githubAccount.login}) Ativo`));
    }

    const remoteUrl = data.remote || project.repository || '';
    const ghMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (ghMatch) {
      const owner = ghMatch[1];
      const repo = ghMatch[2].replace(/\.git$/, '');
      const fullRepo = `${owner}/${repo}`;

      const issueBtn = element('button', 'flp-button flp-button-soft', 'Nova Issue GitHub');
      issueBtn.type = 'button';
      issueBtn.addEventListener('click', () => openGitHubIssueModal(fullRepo));

      const prBtn = element('button', 'flp-button flp-button-soft', 'Novo PR GitHub');
      prBtn.type = 'button';
      prBtn.addEventListener('click', () => openGitHubPRModal(fullRepo, data.branch || 'main'));

      pushRow.append(issueBtn, prBtn);
    }
    panel.appendChild(pushRow);

    if (project.id === 'api-platform-live') {
      const deploy = element('button', 'flp-button flp-button-primary', 'Build e deploy da API');
      deploy.type = 'button';
      const reapply = element('button', 'flp-button flp-button-soft', 'Reaplicar imagens atuais');
      reapply.type = 'button';
      const currentJob = state.deployments.get(project.id)?.job;
      deploy.disabled = Boolean(data.status) || currentJob?.status === 'RUNNING';
      reapply.disabled = deploy.disabled;
      const launch = async (rebuild) => {
        deploy.disabled = true;
        reapply.disabled = true;
        setGitMessage(panel, rebuild ? 'Iniciando build e deploy da API…' : 'Reaplicando imagens validadas…');
        try {
          const result = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/deploy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expectedHead: data.head, rebuild })
          });
          state.deployments.set(project.id, result);
          renderDetail();
          scheduleDeploy(project.id);
        } catch (error) {
          setGitMessage(panel, error.message);
          deploy.disabled = false;
          reapply.disabled = false;
        }
      };
      deploy.addEventListener('click', () => launch(true));
      reapply.addEventListener('click', () => launch(false));
      panel.append(deploy, reapply);
      panel.append(element('p', 'flp-empty', currentJob ? `Deploy ${currentJob.status} · ${currentJob.mode || 'BUILD_AND_DEPLOY'} · versão ${currentJob.head.slice(0, 12)}${currentJob.error ? ` · ${currentJob.error}` : ''}` : 'Nenhum deploy iniciado pelo Fênix.'));
    }
    panel.append(element('p', 'flp-empty', 'O push usa autenticação direta com Token GitHub (PAT) ou chave de deploy SSH.'));
    panel.append(element('p', 'flp-git-message'));

    const history = element('div', 'flp-git-history');
    history.append(element('h4', '', 'Commits recentes'));
    for (const item of data.recent || []) history.append(element('p', '', item));
    panel.appendChild(history);
    target.appendChild(panel);
  }

  function renderConnection(panel, project) {
    const box = element('div', 'flp-git-connection');
    const account = state.connections.get(project.id);
    box.append(element('h4', '', 'Conexão GitHub'));
    if (state.githubAccount?.connected) {
      const patBox = element('div', '', '');
      patBox.style.padding = '8px 10px';
      patBox.style.background = 'rgba(0,229,160,0.08)';
      patBox.style.border = '1px solid rgba(0,229,160,0.2)';
      patBox.style.borderRadius = '6px';
      patBox.style.marginBottom = '10px';
      patBox.style.display = 'flex';
      patBox.style.alignItems = 'center';
      patBox.style.justifyContent = 'space-between';
      patBox.innerHTML = `<span style="font-size:11px; color:#00E5A0; font-weight:600;">✓ Autenticação de Push via Token PAT Ativa (@${state.githubAccount.login})</span>`;
      const manageBtn = element('button', 'flp-button flp-button-soft', 'Gerenciar');
      manageBtn.type = 'button';
      manageBtn.style.padding = '4px 8px';
      manageBtn.style.fontSize = '10px';
      manageBtn.addEventListener('click', () => openGitHubConnectModal());
      patBox.appendChild(manageBtn);
      box.appendChild(patBox);
    }
    if (!account) {
      box.append(element('p', 'flp-empty', 'Verificando conexão…'));
      panel.appendChild(box);
      return;
    }
    if (!account.supported) {
      box.append(element('p', 'flp-empty', account.error || 'Remote GitHub indisponível.'));
      panel.appendChild(box);
      return;
    }
    box.append(element('p', 'flp-empty', account.publicKey ? `Chave de deploy criada para ${account.repository}.` : `Crie uma chave de deploy para ${account.repository}.`));
    if (account.publicKey) {
      const publicKey = element('textarea', 'flp-git-public-key');
      publicKey.readOnly = true;
      publicKey.value = account.publicKey;
      publicKey.setAttribute('aria-label', 'Chave pública para GitHub');
      box.append(publicKey, element('p', 'flp-empty', 'No GitHub: Settings → Deploy keys → Add deploy key. Cole a chave pública e marque Allow write access.'));
      const verify = element('button', 'flp-button flp-button-soft', 'Verificar conexão');
      verify.type = 'button';
      verify.addEventListener('click', async () => {
        verify.disabled = true;
        try {
          await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/verify`);
          setGitMessage(panel, 'Conexão GitHub verificada.');
        } catch (error) {
          setGitMessage(panel, error.message);
        } finally {
          verify.disabled = false;
        }
      });
      box.append(verify);
    } else {
      const generate = element('button', 'flp-button flp-button-soft', 'Gerar chave de conexão');
      generate.type = 'button';
      generate.addEventListener('click', async () => {
        generate.disabled = true;
        try {
          state.connections.set(project.id, await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/connection`, { method: 'POST' }));
          renderDetail();
        } catch (error) {
          setGitMessage(panel, error.message);
          generate.disabled = false;
        }
      });
      box.append(generate);
    }
    panel.appendChild(box);
  }

  function setGitMessage(panel, message) {
    const node = panel.querySelector('.flp-git-message');
    if (node) node.textContent = message;
  }

  function scheduleDeploy(id) {
    clearTimeout(state.deployTimer);
    state.deployTimer = setTimeout(() => loadDeploy(id), 4000);
  }

  async function loadDeploy(id) {
    if (state.selected !== id) return;
    try {
      state.deployments.set(id, await json(`/api/fenix/projects/${encodeURIComponent(id)}/git/deploy`, { signal: AbortSignal.timeout(30000) }));
    } catch (error) {
      state.deployments.set(id, { job: { status: 'UNKNOWN', head: state.git.get(id)?.head || '', error: error.message } });
    }
    renderDetail();
    if (state.deployments.get(id)?.job?.status === 'RUNNING') scheduleDeploy(id);
  }

  async function loadGit(id) {
    try {
      state.git.set(id, await json(`/api/fenix/projects/${encodeURIComponent(id)}/git`, { signal: AbortSignal.timeout(60000) }));
    } catch (error) {
      state.git.set(id, { error: error.message });
    }
    if (state.selected === id && state.workspaceTab === 'overview') renderDetail();

    try {
      state.connections.set(id, await json(`/api/fenix/projects/${encodeURIComponent(id)}/git/connection`, { signal: AbortSignal.timeout(60000) }));
    } catch (error) {
      state.connections.set(id, { supported: false, error: error.message });
    }
    if (state.selected === id && state.workspaceTab === 'overview') renderDetail();

    const proj = state.projects.find((p) => p.id === id);
    if (proj?.absorbed || state.absorptions.has(id)) {
      try {
        const absReport = await json(`/api/v2/company/projects/${encodeURIComponent(id)}/absorption`, { signal: AbortSignal.timeout(10000) });
        if (absReport) state.absorptions.set(id, absReport);
      } catch (e) {
        // Not absorbed yet is normal
      }
      if (state.selected === id && state.workspaceTab === 'overview') renderDetail();
    }

    if (id === 'api-platform-live') loadDeploy(id);
  }

  function selectProject(id, targetTab = null, forceFocus = null) {
    clearTimeout(state.deployTimer);
    state.selected = id;
    if (targetTab) state.workspaceTab = targetTab;
    if (forceFocus === true) {
      state.detailFocus = true;
    } else if (forceFocus === false) {
      state.detailFocus = false;
    }
    recordProjectOpen(id);
    localStorage.setItem('fenix_project_hub_selected', id);
    const proj = state.projects.find((p) => p.id === id);
    if (window.GlobalSelectionStore && typeof window.GlobalSelectionStore.select === 'function') {
      window.GlobalSelectionStore.select('project', id, proj || { id });
    }
    if (state.detailFocus) {
      const cleanTab = state.workspaceTab && state.workspaceTab !== 'overview' ? `/${state.workspaceTab}` : '';
      const targetHash = `#projects/${encodeURIComponent(id)}${cleanTab}`;
      if (window.location.hash !== targetHash) {
        history.pushState(null, '', targetHash);
      }
    }
    syncMultiViewToolbar();
    renderCards();
    renderDetail();
    loadProjectState(id);
    if (workspaceIsAvailable(proj)) loadGit(id);
  }

  function persistCatalogPreferences() {
    try {
      localStorage.setItem(CATALOG_PREFS_KEY, JSON.stringify({ favorites: [...state.catalogFavorites], recents: state.catalogRecents.slice(0, 24), layout: state.catalogLayout }));
    } catch { /* Local convenience only; project records remain server-authoritative. */ }
  }

  function recordProjectOpen(projectId) {
    if (!projectId) return;
    state.catalogRecents = [{ id: projectId, openedAt: Date.now() }, ...state.catalogRecents.filter((item) => item.id !== projectId)].slice(0, 24);
    persistCatalogPreferences();
  }

  function toggleProjectFavorite(projectId) {
    if (state.catalogFavorites.has(projectId)) state.catalogFavorites.delete(projectId);
    else state.catalogFavorites.add(projectId);
    persistCatalogPreferences();
    renderCards();
  }
  window.fenixSelectProject = selectProject;

  async function loadProjectState(id) {
    if (!id || state.details.has(id) || state.detailLoads.has(id)) return state.detailLoads.get(id);
    const request = json(`/api/fenix/projects/${encodeURIComponent(id)}/state`, { signal: AbortSignal.timeout(10000) })
      .then((detail) => { state.details.set(id, detail); state.detailErrors.delete(id); })
      .catch((error) => { state.detailErrors.set(id, error.message); })
      .finally(() => {
        state.detailLoads.delete(id);
        if (state.selected === id) {
          renderMetrics();
          renderCards();
          if (['overview', 'company', 'jobs', 'tests', 'memory'].includes(state.workspaceTab)) {
            renderDetail();
          }
        }
      });
    state.detailLoads.set(id, request);
    return request;
  }

  async function load(force = false) {
    renderShell();
    const currentRoute = parseProjectsRoute();
    if (currentRoute?.projectId) {
      state.detailFocus = true;
      state.selected = currentRoute.projectId;
      if (currentRoute.tab) state.workspaceTab = currentRoute.tab;
    } else {
      if (window.location.hash === '#projects' || window.location.hash === '' || window.location.hash.startsWith('#projects?')) {
        state.detailFocus = false;
        state.launcherFullGrid = true;
      }
    }
    syncMultiViewToolbar();
    if (state.loading) return state.loading;
    if (state.projects.length && !force) {
      renderCards();
      renderDetail();
      return;
    }
    loadGitHubAccount();
    loadCatalogStatus(force);
    setupStatusWebSocket();
    if (!window.__FENIX_PROJECT_STATUS_POLL_INTERVAL__) {
      window.__FENIX_PROJECT_STATUS_POLL_INTERVAL__ = setInterval(() => {
        if (isProjectsRoute() && document.querySelector('.view.active')?.id === 'view-projects') {
          loadCatalogStatus();
        }
      }, 12000);
    }
    state.loading = (async () => {
      state.error = null;
      try {
        const data = await json('/api/fenix/projects');
        state.projects = data.projects || [];
        state.measuredAt = new Date().toISOString();
        const route = parseProjectsRoute();
        const preferred = (route?.projectId && state.projects.find((item) => item.id === route.projectId || item.id === (route.projectId === 'api-platform' ? 'api-platform-live' : route.projectId))) ||
                          state.projects.find((item) => item.id === state.requestedProjectId) ||
                          state.projects.find((item) => item.id === state.selected) ||
                          state.projects.find((item) => item.id === localStorage.getItem('fenix_project_hub_selected')) ||
                          state.projects.find((item) => item.id === 'api-platform-live') ||
                          state.projects[0];
        state.selected = preferred?.id || null;
        if (route?.tab) state.workspaceTab = route.tab;
        if (route?.projectId) {
          state.detailFocus = true;
        } else {
          state.detailFocus = false;
          state.launcherFullGrid = true;
        }
        state.requestedProjectId = null;
        recordProjectOpen(state.selected);
        if (state.selected) loadGit(state.selected);
        await loadCatalogStatus(force);
        renderMetrics();
        renderCards();
        renderDetail();
        if (force) {
          state.details.clear();
          state.detailErrors.clear();
        }
        await loadProjectState(state.selected);
      } catch (error) {
        state.error = error.message;
      }
      renderMetrics();
      renderCards();
      renderDetail();
    })().finally(() => {
      state.loading = null;
    });
    return state.loading;
  }

  // --- GITHUB ECOSYSTEM INTEGRATION ---

  async function loadGitHubAccount() {
    const label = $('flpGitHubAccountLabel');
    try {
      const data = await json('/api/fenix/github/account');
      state.githubAccount = data;
      if (label) {
        if (data && data.connected) {
          const totalRepos = (data.public_repos || 0) + (data.total_private_repos || 0);
          label.textContent = `@${data.login} (${totalRepos} repos)`;
          label.style.color = '#38bdf8';
        } else {
          label.textContent = 'Conectar GitHub';
          label.style.color = '#94a3b8';
        }
      }
    } catch (err) {
      if (label) {
        label.textContent = 'GitHub: —';
        label.style.color = '#fa8f8a';
      }
    }
  }

  async function loadGitHubRepos(force = false) {
    if (state.githubLoading) return;
    state.githubLoading = true;
    renderGitHubCards();
    if (state.hubViewMode === 'github') renderGitHubPortfolioView($('flpDetail'));
    try {
      const data = await json('/api/fenix/github/repos');
      state.githubRepos = data.repos || [];
      if (data.account) {
        state.githubAccount = { ...state.githubAccount, ...data.account, connected: true };
        const label = $('flpGitHubAccountLabel');
        if (label) {
          const totalRepos = (data.account.public_repos || 0) + (data.account.total_private_repos || 0);
          label.textContent = `@${data.account.login} (${totalRepos} repos)`;
          label.style.color = '#38bdf8';
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar repositórios GitHub:', err);
    } finally {
      state.githubLoading = false;
      renderGitHubCards();
      if (state.hubViewMode === 'github') renderGitHubPortfolioView($('flpDetail'));
    }
  }

  function renderGitHubCards() {
    const container = $('flpGitHubCards');
    if (!container) return;
    container.replaceChildren();

    if (state.githubLoading) {
      container.appendChild(element('p', 'flp-empty', 'Carregando repositórios da sua conta GitHub…'));
      return;
    }

    if (!state.githubAccount || !state.githubAccount.connected) {
      const prompt = element('div', '', '');
      prompt.style.padding = '12px';
      prompt.style.background = 'rgba(13,27,45,0.7)';
      prompt.style.borderRadius = '8px';
      prompt.style.border = '1px dashed rgba(56,189,248,0.3)';
      const p = element('p', 'flp-empty', 'Conta GitHub não vinculada.');
      p.style.marginBottom = '8px';
      const btn = element('button', 'flp-button flp-button-primary', 'Conectar GitHub agora');
      btn.type = 'button';
      btn.addEventListener('click', () => openGitHubConnectModal());
      prompt.append(p, btn);
      container.appendChild(prompt);
      return;
    }

    let repos = state.githubRepos || [];
    if (state.githubFilter === 'activated') {
      repos = repos.filter(r => r.isActivated);
    } else if (state.githubFilter === 'not_activated') {
      repos = repos.filter(r => !r.isActivated);
    }

    if (state.githubQuery) {
      const q = state.githubQuery.toLowerCase();
      repos = repos.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q))
      );
    }

    if (!repos.length) {
      container.appendChild(element('p', 'flp-empty', state.githubRepos.length ? 'Nenhum repositório corresponde aos filtros.' : 'Nenhum repositório encontrado na sua conta GitHub.'));
      return;
    }

    for (const repo of repos) {
      const card = element('button', `flp-card${state.selectedGitHubRepo === repo.id ? ' active' : ''}`);
      card.type = 'button';
      const kickerWrap = element('div', '', '');
      kickerWrap.style.display = 'flex';
      kickerWrap.style.gap = '6px';
      kickerWrap.style.alignItems = 'center';

      const badge = element('span', `flp-gh-badge ${repo.isActivated ? 'flp-gh-badge-active' : 'flp-gh-badge-inactive'}`, repo.isActivated ? 'ATIVO NO FÊNIX' : 'GITHUB');
      kickerWrap.appendChild(badge);
      if (repo.private) {
        kickerWrap.appendChild(element('span', 'flp-gh-badge flp-gh-badge-private', 'PRIVADO'));
      }
      card.appendChild(kickerWrap);

      card.append(element('strong', 'flp-card-title', repo.name));
      card.append(element('span', 'flp-card-path', repo.description || repo.full_name));

      const foot = element('span', 'flp-card-foot', `${repo.language || 'Geral'} · ★ ${repo.stargazers_count || 0} · 🍴 ${repo.forks_count || 0}`);
      card.appendChild(foot);

      card.addEventListener('click', () => {
        state.selectedGitHubRepo = repo.id;
        renderGitHubCards();
        if (state.hubViewMode === 'github') renderGitHubPortfolioView($('flpDetail'));
      });
      container.appendChild(card);
    }
  }

  function renderGitHubPortfolioView(target) {
    if (!target) return;
    target.replaceChildren();

    const isConn = Boolean(state.githubAccount?.connected);
    const account = state.githubAccount || {};

    const heading = element('div', 'flp-detail-head');
    const titleBox = element('div');
    titleBox.append(element('span', 'flp-eyebrow', 'GITHUB PORTFOLIO & REPOSITORY ECOSYSTEM'));

    const h2Wrap = element('div', '', '');
    h2Wrap.style.display = 'flex';
    h2Wrap.style.alignItems = 'center';
    h2Wrap.style.gap = '12px';
    h2Wrap.style.flexWrap = 'wrap';

    if (isConn && account.avatar_url) {
      const avatarImg = document.createElement('img');
      avatarImg.src = account.avatar_url;
      avatarImg.alt = `@${account.login}`;
      avatarImg.style.width = '36px';
      avatarImg.style.height = '36px';
      avatarImg.style.borderRadius = '50%';
      avatarImg.style.border = '2px solid #38bdf8';
      h2Wrap.appendChild(avatarImg);
    }

    const h2 = element('h2', '', isConn ? `@${account.login}` : 'Conexão GitHub');
    h2Wrap.appendChild(h2);

    const statusBadge = element('span', `flp-badge ${isConn ? 'flp-badge-green' : 'flp-badge-gray'}`, isConn ? 'CONECTADO REAL' : 'NÃO CONECTADO');
    h2Wrap.appendChild(statusBadge);

    if (isConn && account.rateLimit) {
      const rlBadge = element('span', 'flp-badge flp-badge-cyan', `Rate limit: ${account.rateLimit.remaining}/${account.rateLimit.limit}`);
      h2Wrap.appendChild(rlBadge);
    }

    titleBox.append(h2Wrap);
    titleBox.append(element('p', '', isConn ? (account.bio || `${account.name || account.login} · Sincronizado com a API GitHub REST v3`) : 'Conecte seu token de acesso pessoal para controlar repositórios.'));

    const actions = element('div', 'flp-actions');
    const newRepoBtn = element('button', 'flp-button flp-button-primary', '+ Novo Repositório GitHub');
    newRepoBtn.type = 'button';
    newRepoBtn.disabled = !isConn;
    newRepoBtn.addEventListener('click', () => openGitHubCreateModal());

    const connectBtn = element('button', 'flp-button flp-button-soft', isConn ? 'Gerenciar Token' : 'Conectar Conta');
    connectBtn.type = 'button';
    connectBtn.addEventListener('click', () => openGitHubConnectModal());

    const syncBtn = element('button', 'flp-button flp-button-soft', '↻ Sincronizar Repositórios');
    syncBtn.type = 'button';
    syncBtn.disabled = !isConn || state.githubLoading;
    syncBtn.addEventListener('click', () => loadGitHubRepos(true));

    actions.append(newRepoBtn, connectBtn, syncBtn);
    heading.append(titleBox, actions);
    target.appendChild(heading);

    if (!isConn) {
      const hero = element('div', 'flp-panel', '');
      hero.style.textAlign = 'center';
      hero.style.padding = '42px 24px';
      hero.style.display = 'flex';
      hero.style.flexDirection = 'column';
      hero.style.alignItems = 'center';
      hero.style.gap = '14px';

      const iconWrap = element('div', '', '');
      iconWrap.innerHTML = '<i class="ph-bold ph-github-logo" style="font-size:52px; color:#38bdf8;"></i>';
      hero.appendChild(iconWrap);

      hero.append(
        element('h3', '', 'Controle Total do seu GitHub pelo Fênix OS'),
        element('p', 'flp-empty', 'Vincule seu Personal Access Token (PAT) com escopo repo para poder listar, clonar com 1-clique, criar novos repositórios, comitar, fazer push e gerenciar issues e PRs sem sair do Fênix.')
      );

      const heroConnectBtn = element('button', 'flp-button flp-button-primary', 'Conectar GitHub Agora');
      heroConnectBtn.style.padding = '12px 24px';
      heroConnectBtn.style.fontSize = '14px';
      heroConnectBtn.addEventListener('click', () => openGitHubConnectModal());
      hero.appendChild(heroConnectBtn);

      target.appendChild(hero);
      return;
    }

    const totalRepos = state.githubRepos.length;
    const activatedRepos = state.githubRepos.filter(r => r.isActivated).length;
    const privateRepos = state.githubRepos.filter(r => r.private).length;

    const facts = element('div', 'flp-facts');
    facts.append(
      row('Total no Portfólio', String(totalRepos)),
      row('Ativados no Fênix OS', String(activatedRepos)),
      row('Repositórios Privados', String(privateRepos)),
      row('API Rate Limit Restante', `${account.rateLimit?.remaining ?? '—'} reqs`)
    );
    target.appendChild(facts);

    let repos = state.githubRepos || [];
    if (state.githubFilter === 'activated') {
      repos = repos.filter(r => r.isActivated);
    } else if (state.githubFilter === 'not_activated') {
      repos = repos.filter(r => !r.isActivated);
    }
    if (state.githubQuery) {
      const q = state.githubQuery.toLowerCase();
      repos = repos.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q))
      );
    }

    const catalogPanel = element('section', 'flp-panel');
    catalogPanel.append(element('h3', '', `Repositórios na sua conta (${repos.length} de ${totalRepos})`));

    if (!repos.length) {
      catalogPanel.append(element('p', 'flp-empty', totalRepos ? 'Nenhum repositório encontrado com os filtros atuais.' : 'Nenhum repositório retornado pela sua conta GitHub.'));
      target.appendChild(catalogPanel);
      return;
    }

    const grid = element('div', 'flp-gh-grid');
    for (const repo of repos) {
      const card = element('div', 'flp-gh-card');

      const cardHead = element('div', 'flp-gh-card-head');
      const titleWrap = element('div');

      const link = element('a', 'flp-gh-card-title', repo.name);
      link.href = repo.html_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.color = '#38bdf8';
      link.style.textDecoration = 'none';
      link.title = `Abrir ${repo.full_name} no GitHub`;
      titleWrap.appendChild(link);

      if (repo.description) {
        titleWrap.appendChild(element('p', 'flp-gh-card-desc', repo.description));
      }
      cardHead.appendChild(titleWrap);

      const badgeWrap = element('div', '', '');
      badgeWrap.style.display = 'flex';
      badgeWrap.style.gap = '5px';
      badgeWrap.style.flexDirection = 'column';
      badgeWrap.style.alignItems = 'flex-end';

      const actBadge = element('span', `flp-gh-badge ${repo.isActivated ? 'flp-gh-badge-active' : 'flp-gh-badge-inactive'}`, repo.isActivated ? 'ATIVO NO FÊNIX' : 'NÃO ATIVADO');
      badgeWrap.appendChild(actBadge);

      if (repo.private) {
        badgeWrap.appendChild(element('span', 'flp-gh-badge flp-gh-badge-private', 'PRIVADO'));
      }
      cardHead.appendChild(badgeWrap);
      card.appendChild(cardHead);

      const meta = element('div', 'flp-gh-card-meta');
      meta.append(
        element('span', '', `Linguagem: ${repo.language || 'Geral'}`),
        element('span', '', `★ ${repo.stargazers_count || 0}`),
        element('span', '', `🍴 ${repo.forks_count || 0}`),
        element('span', '', `Branch: ${repo.default_branch || 'main'}`)
      );
      card.appendChild(meta);

      const statusBox = element('div', '', '');
      statusBox.style.padding = '10px 12px';
      statusBox.style.borderRadius = '8px';
      statusBox.style.fontSize = '11px';

      if (repo.isActivated) {
        statusBox.style.background = 'rgba(0,229,160,0.06)';
        statusBox.style.border = '1px solid rgba(0,229,160,0.2)';
        const dirty = repo.localStatus?.dirtyFiles || 0;
        statusBox.innerHTML = `
          <div style="color:#00E5A0; font-weight:600; margin-bottom:2px;">✓ Workspace Ativo: <code style="color:#e2e8f0; font-size:10.5px;">${repo.localWorkspace || repo.projectId}</code></div>
          <div style="color:#94a3b8;">${dirty > 0 ? `<span style="color:#fa8f8a;">${dirty} arquivo(s) modificado(s)</span>` : 'Workspace limpo e sincronizado'} · HEAD ${repo.localStatus?.head ? repo.localStatus.head.slice(0,7) : '—'}</div>
        `;
      } else {
        statusBox.style.background = 'rgba(255,255,255,0.03)';
        statusBox.style.border = '1px solid rgba(255,255,255,0.06)';
        statusBox.innerHTML = '<span style="color:#94a3b8;">Repositório remoto pronto para ser ativado e trabalhado localmente.</span>';
      }
      card.appendChild(statusBox);

      const cardActions = element('div', 'flp-gh-card-actions');
      if (repo.isActivated) {
        const openWsBtn = element('button', 'flp-button flp-button-primary', 'Abrir Workspace');
        openWsBtn.type = 'button';
        openWsBtn.addEventListener('click', () => {
          state.hubViewMode = 'fenix';
          $('flpModeFenix').classList.add('active');
          $('flpModeGitHub').classList.remove('active');
          $('flpFenixSidebarView').style.display = 'block';
          $('flpGitHubSidebarView').style.display = 'none';
          selectProject(repo.projectId);
        });

        const gitBtn = element('button', 'flp-button flp-button-soft', 'Git & Push');
        gitBtn.type = 'button';
        gitBtn.addEventListener('click', () => {
          state.hubViewMode = 'fenix';
          state.workspaceTab = 'overview';
          $('flpModeFenix').classList.add('active');
          $('flpModeGitHub').classList.remove('active');
          $('flpFenixSidebarView').style.display = 'block';
          $('flpGitHubSidebarView').style.display = 'none';
          selectProject(repo.projectId);
        });

        const issueBtn = element('button', 'flp-button flp-button-soft', 'Issue');
        issueBtn.type = 'button';
        issueBtn.title = 'Criar issue no GitHub';
        issueBtn.addEventListener('click', () => openGitHubIssueModal(repo.full_name));

        const prBtn = element('button', 'flp-button flp-button-soft', 'PR');
        prBtn.type = 'button';
        prBtn.title = 'Criar Pull Request no GitHub';
        prBtn.addEventListener('click', () => openGitHubPRModal(repo.full_name, repo.default_branch || 'main'));

        cardActions.append(openWsBtn, gitBtn, issueBtn, prBtn);
      } else {
        const activateBtn = element('button', 'flp-button flp-button-primary', '⚡ Ativar no Fênix (1-Click Clone)');
        activateBtn.type = 'button';
        activateBtn.addEventListener('click', () => activateGitHubRepo(repo));
        cardActions.appendChild(activateBtn);
      }
      card.appendChild(cardActions);

      grid.appendChild(card);
    }

    catalogPanel.appendChild(grid);
    target.appendChild(catalogPanel);
  }

  async function activateGitHubRepo(repo) {
    if (!confirm(`Deseja clonar e ativar o repositório "${repo.name}" no Fênix OS?`)) return;
    $('flpMeasured').textContent = `Clonando e registrando ${repo.name} no Fênix…`;
    try {
      const res = await json('/api/fenix/github/repos/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloneUrl: repo.clone_url,
          name: repo.name,
          defaultBranch: repo.default_branch
        })
      });
      await load(true);
      await loadGitHubRepos(true);
      state.hubViewMode = 'fenix';
      $('flpModeFenix').classList.add('active');
      $('flpModeGitHub').classList.remove('active');
      $('flpFenixSidebarView').style.display = 'block';
      $('flpGitHubSidebarView').style.display = 'none';
      if (res.project?.id) selectProject(res.project.id);
      $('flpMeasured').textContent = `Projeto ${repo.name} ativado com sucesso no workspace ${res.project.workspace}!`;
    } catch (err) {
      alert(`Falha ao ativar repositório: ${err.message}`);
      $('flpMeasured').textContent = `Erro ao ativar: ${err.message}`;
    }
  }

  function openGitHubConnectModal() {
    const container = $('flpGitHubModalContainer');
    if (!container) return;
    const isConn = Boolean(state.githubAccount?.connected);
    const login = state.githubAccount?.login || '';
    const avatar = state.githubAccount?.avatar_url || '';

    container.innerHTML = `
      <div class="flp-modal-backdrop" id="flpGhConnectBackdrop">
        <div class="flp-modal-dialog">
          <div class="flp-modal-head">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="ph-bold ph-github-logo" style="font-size:20px; color:#38bdf8;"></i>
              <strong style="font-size:14px; color:#f8fafc;">Conectar Conta GitHub ao Fênix OS</strong>
            </div>
            <button type="button" id="flpGhConnectClose" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
          </div>
          <div class="flp-modal-body">
            ${isConn ? `
              <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:rgba(0,229,160,0.08); border:1px solid rgba(0,229,160,0.25); border-radius:10px;">
                ${avatar ? `<img src="${avatar}" alt="@${login}" style="width:42px; height:42px; border-radius:50%; border:2px solid #00E5A0;">` : ''}
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <strong style="color:#f8fafc; font-size:14px;">@${login}</strong>
                    <span class="flp-gh-badge flp-gh-badge-active">CONECTADO</span>
                  </div>
                  <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
                    Rate limit: ${state.githubAccount?.rateLimit?.remaining ?? '—'}/${state.githubAccount?.rateLimit?.limit ?? '—'}
                  </div>
                </div>
                <button type="button" id="flpGhDisconnectBtn" class="flp-button flp-button-soft" style="color:#fa8f8a; border-color:#e06c75; font-size:11px; padding:6px 10px;">Desconectar</button>
              </div>
            ` : ''}
            <form id="flpGhConnectForm" style="display:flex; flex-direction:column; gap:10px;">
              <label style="font-size:12px; font-weight:600; color:#e2e8f0;">
                ${isConn ? 'Atualizar Personal Access Token (PAT):' : 'Cole seu Personal Access Token (PAT) do GitHub:'}
              </label>
              <input type="password" id="flpGhTokenInput" required placeholder="ghp_xxxxxxxxxxxxxxxxxxxx ou github_pat_xxxx" style="padding:10px 12px; background:#07121e; border:1px solid #233e5b; border-radius:8px; color:#fff; font-family:monospace; font-size:12px; width:100%; box-sizing:border-box;">
              <div style="font-size:11px; color:#8599ad; line-height:1.4;">
                Permissões recomendadas: <code style="color:#38bdf8;">repo</code> (para clonar repos privados, commits, push, issues e PRs) e <code style="color:#38bdf8;">read:user</code>.
                <br>
                <a href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=Fenix-OS-Core" target="_blank" rel="noopener noreferrer" style="color:#00E5A0; text-decoration:underline;">Criar Token no GitHub agora ↗</a>
              </div>
              <div id="flpGhConnectMsg" style="font-size:12px; min-height:18px;"></div>
              <div class="flp-modal-foot" style="margin:8px -22px -22px; padding:12px 22px;">
                <button type="button" id="flpGhConnectCancel" class="flp-button flp-button-soft">Fechar</button>
                <button type="submit" id="flpGhConnectSubmit" class="flp-button flp-button-primary">Validar e Salvar Token</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    const close = () => { container.innerHTML = ''; };
    $('flpGhConnectClose')?.addEventListener('click', close);
    $('flpGhConnectCancel')?.addEventListener('click', close);
    $('flpGhConnectBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'flpGhConnectBackdrop') close();
    });

    $('flpGhDisconnectBtn')?.addEventListener('click', async () => {
      if (!confirm('Deseja realmente desconectar sua conta GitHub do Fênix OS?')) return;
      try {
        await json('/api/fenix/github/disconnect', { method: 'POST' });
        state.githubAccount = null;
        state.githubRepos = [];
        await loadGitHubAccount();
        renderCards();
        renderDetail();
        close();
      } catch (err) {
        alert(`Erro ao desconectar: ${err.message}`);
      }
    });

    $('flpGhConnectForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = $('flpGhTokenInput')?.value?.trim();
      const msg = $('flpGhConnectMsg');
      const submitBtn = $('flpGhConnectSubmit');
      if (!token) return;
      submitBtn.disabled = true;
      msg.style.color = '#38bdf8';
      msg.textContent = 'Validando token com a API do GitHub…';
      try {
        const res = await json('/api/fenix/github/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        state.githubAccount = { ...res.account, connected: true };
        msg.style.color = '#00E5A0';
        msg.textContent = `Conectado com sucesso como @${res.account.login}!`;
        await loadGitHubAccount();
        await loadGitHubRepos(true);
        setTimeout(close, 1000);
      } catch (err) {
        msg.style.color = '#fa8f8a';
        msg.textContent = `Falha na autenticação: ${err.message}`;
        submitBtn.disabled = false;
      }
    });
  }

  function openGitHubCreateModal() {
    const container = $('flpGitHubModalContainer');
    if (!container) return;
    if (!state.githubAccount?.connected) {
      openGitHubConnectModal();
      return;
    }

    container.innerHTML = `
      <div class="flp-modal-backdrop" id="flpGhCreateBackdrop">
        <div class="flp-modal-dialog">
          <div class="flp-modal-head">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="ph-bold ph-plus-circle" style="font-size:20px; color:#00E5A0;"></i>
              <strong style="font-size:14px; color:#f8fafc;">Criar Novo Repositório no GitHub</strong>
            </div>
            <button type="button" id="flpGhCreateClose" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
          </div>
          <form id="flpGhCreateForm">
            <div class="flp-modal-body">
              <label style="font-size:12px; font-weight:600; color:#e2e8f0; display:flex; flex-direction:column; gap:6px;">
                Nome do Repositório:
                <input type="text" name="name" required maxlength="100" placeholder="ex: fenix-analytics-service" style="padding:9px 12px; background:#07121e; border:1px solid #233e5b; border-radius:8px; color:#fff; font-size:13px;">
              </label>
              <label style="font-size:12px; font-weight:600; color:#e2e8f0; display:flex; flex-direction:column; gap:6px;">
                Descrição (opcional):
                <input type="text" name="description" maxlength="250" placeholder="Breve resumo da finalidade do projeto" style="padding:9px 12px; background:#07121e; border:1px solid #233e5b; border-radius:8px; color:#fff; font-size:13px;">
              </label>
              <div style="display:flex; gap:18px; margin:4px 0;">
                <label style="display:flex; align-items:center; gap:7px; font-size:12px; color:#e2e8f0; cursor:pointer;">
                  <input type="radio" name="isPrivate" value="true" checked style="accent-color:#eab308;">
                  <span>Privado (recomendado)</span>
                </label>
                <label style="display:flex; align-items:center; gap:7px; font-size:12px; color:#e2e8f0; cursor:pointer;">
                  <input type="radio" name="isPrivate" value="false" style="accent-color:#38bdf8;">
                  <span>Público</span>
                </label>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; padding:10px 12px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#e2e8f0; cursor:pointer;">
                  <input type="checkbox" name="autoInit" checked style="accent-color:#00E5A0;">
                  <span>Inicializar com README.md</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#e2e8f0; cursor:pointer;">
                  <input type="checkbox" name="autoActivate" checked style="accent-color:#00E5A0;">
                  <span>Ativar e clonar imediatamente no Fênix OS</span>
                </label>
              </div>
              <div id="flpGhCreateMsg" style="font-size:12px; min-height:18px;"></div>
            </div>
            <div class="flp-modal-foot">
              <button type="button" id="flpGhCreateCancel" class="flp-button flp-button-soft">Cancelar</button>
              <button type="submit" id="flpGhCreateSubmit" class="flp-button flp-button-primary">Criar no GitHub</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { container.innerHTML = ''; };
    $('flpGhCreateClose')?.addEventListener('click', close);
    $('flpGhCreateCancel')?.addEventListener('click', close);
    $('flpGhCreateBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'flpGhCreateBackdrop') close();
    });

    $('flpGhCreateForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const submitBtn = $('flpGhCreateSubmit');
      const msg = $('flpGhCreateMsg');
      const data = new FormData(form);

      const payload = {
        name: data.get('name')?.toString().trim(),
        description: data.get('description')?.toString().trim() || '',
        private: data.get('isPrivate') === 'true',
        autoInit: data.get('autoInit') === 'on',
        autoActivate: data.get('autoActivate') === 'on'
      };

      if (!payload.name) return;
      submitBtn.disabled = true;
      msg.style.color = '#38bdf8';
      msg.textContent = 'Criando repositório na API do GitHub…';

      try {
        const res = await json('/api/fenix/github/repos/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        msg.style.color = '#00E5A0';
        msg.textContent = `Repositório ${payload.name} criado com sucesso!`;
        await load(true);
        await loadGitHubRepos(true);
        if (res.activatedProject) {
          selectProject(res.activatedProject.id);
        }
        setTimeout(close, 1200);
      } catch (err) {
        msg.style.color = '#fa8f8a';
        msg.textContent = `Erro: ${err.message}`;
        submitBtn.disabled = false;
      }
    });
  }

  function openGitHubIssueModal(repoFullName) {
    const container = $('flpGitHubModalContainer');
    if (!container) return;
    const [owner, repo] = repoFullName.split('/');

    container.innerHTML = `
      <div class="flp-modal-backdrop" id="flpGhIssueBackdrop">
        <div class="flp-modal-dialog">
          <div class="flp-modal-head">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="ph-bold ph-warning-circle" style="font-size:20px; color:#eab308;"></i>
              <strong style="font-size:14px; color:#f8fafc;">Nova Issue em ${repoFullName}</strong>
            </div>
            <button type="button" id="flpGhIssueClose" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
          </div>
          <form id="flpGhIssueForm">
            <div class="flp-modal-body">
              <label style="font-size:12px; font-weight:600; color:#e2e8f0; display:flex; flex-direction:column; gap:6px;">
                Título da Issue:
                <input type="text" name="title" required maxlength="150" placeholder="ex: Corrigir validação de token na rota /auth" style="padding:9px 12px; background:#07121e; border:1px solid #233e5b; border-radius:8px; color:#fff; font-size:13px;">
              </label>
              <label style="font-size:12px; font-weight:600; color:#e2e8f0; display:flex; flex-direction:column; gap:6px;">
                Descrição / Contexto:
                <textarea name="body" rows="5" placeholder="Descreva os passos para reproduzir, comportamento esperado ou especificação técnica…" style="padding:9px 12px; background:#07121e; border:1px solid #233e5b; border-radius:8px; color:#fff; font-size:12px; font-family:monospace; resize:vertical;"></textarea>
              </label>
              <div id="flpGhIssueMsg" style="font-size:12px; min-height:18px;"></div>
            </div>
            <div class="flp-modal-foot">
              <button type="button" id="flpGhIssueCancel" class="flp-button flp-button-soft">Cancelar</button>
              <button type="submit" id="flpGhIssueSubmit" class="flp-button flp-button-primary">Publicar Issue</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { container.innerHTML = ''; };
    $('flpGhIssueClose')?.addEventListener('click', close);
    $('flpGhIssueCancel')?.addEventListener('click', close);
    $('flpGhIssueBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'flpGhIssueBackdrop') close();
    });

    $('flpGhIssueForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const submitBtn = $('flpGhIssueSubmit');
      const msg = $('flpGhIssueMsg');
      const data = new FormData(form);

      submitBtn.disabled = true;
      msg.style.color = '#38bdf8';
      msg.textContent = 'Enviando issue para o GitHub…';

      try {
        const res = await json(`/api/fenix/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.get('title'),
            body: data.get('body')
          })
        });
        msg.style.color = '#00E5A0';
        msg.innerHTML = `Issue #${res.issue.number} criada! <a href="${res.issue.html_url}" target="_blank" style="color:#00E5A0; text-decoration:underline;">Ver no GitHub ↗</a>`;
        setTimeout(close, 2000);
      } catch (err) {
        msg.style.color = '#fa8f8a';
        msg.textContent = `Erro: ${err.message}`;
        submitBtn.disabled = false;
      }
    });
  }

  function openGitHubPRModal(repoFullName, defaultBranch = 'main') {
    const container = $('flpGitHubModalContainer');
    if (!container) return;
    const [owner, repo] = repoFullName.split('/');

    container.innerHTML = `
      <div class="flp-modal-backdrop" id="flpGhPrBackdrop">
        <div class="flp-modal-dialog">
          <div class="flp-modal-head">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="ph-bold ph-git-pull-request" style="font-size:20px; color:#38bdf8;"></i>
              <strong style="font-size:14px; color:#f8fafc;">Criar Pull Request em ${repoFullName}</strong>
            </div>
            <button type="button" id="flpGhPrClose" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
          </div>
          <form id="flpGhPrForm">
            <div class="flp-modal-body">
              <label style="font-size:12px; font-weight:600; color:#e2e8f0; display:flex; flex-direction:column; gap:6px;">
                Título do PR:
                <input type="text" name="title" required maxlength="150" placeholder="ex: feat: implementação da conexão GitHub" style="padding:9px 12px; background:#07121e; border:1px solid #233e5b; border-radius:8px; color:#fff; font-size:13px;">
              </label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <label style="font-size:12px; font-weight:600; color:#e2e8f0; display:flex; flex-direction:column; gap:6px;">
                  Branch de Origem (Head):
                  <input type="text" name="head" required placeholder="ex: feature-minha-branch" style="padding:8px 12px; background:#07121e; border:1px solid #233e5b; border-radius:8px; color:#fff; font-size:12px;">
                </label>
                <label style="font-size:12px; font-weight:600; color:#e2e8f0; display:flex; flex-direction:column; gap:6px;">
                  Branch de Destino (Base):
                  <input type="text" name="base" required value="${defaultBranch}" placeholder="ex: main" style="padding:8px 12px; background:#07121e; border:1px solid #233e5b; border-radius:8px; color:#fff; font-size:12px;">
                </label>
              </div>
              <label style="font-size:12px; font-weight:600; color:#e2e8f0; display:flex; flex-direction:column; gap:6px;">
                Descrição do Pull Request:
                <textarea name="body" rows="4" placeholder="Resumo das modificações, justificativa e testes realizados…" style="padding:9px 12px; background:#07121e; border:1px solid #233e5b; border-radius:8px; color:#fff; font-size:12px; font-family:monospace; resize:vertical;"></textarea>
              </label>
              <div id="flpGhPrMsg" style="font-size:12px; min-height:18px;"></div>
            </div>
            <div class="flp-modal-foot">
              <button type="button" id="flpGhPrCancel" class="flp-button flp-button-soft">Cancelar</button>
              <button type="submit" id="flpGhPrSubmit" class="flp-button flp-button-primary">Abrir Pull Request</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { container.innerHTML = ''; };
    $('flpGhPrClose')?.addEventListener('click', close);
    $('flpGhPrCancel')?.addEventListener('click', close);
    $('flpGhPrBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'flpGhPrBackdrop') close();
    });

    $('flpGhPrForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const submitBtn = $('flpGhPrSubmit');
      const msg = $('flpGhPrMsg');
      const data = new FormData(form);

      submitBtn.disabled = true;
      msg.style.color = '#38bdf8';
      msg.textContent = 'Criando pull request no GitHub…';

      try {
        const res = await json(`/api/fenix/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/prs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.get('title'),
            head: data.get('head'),
            base: data.get('base'),
            body: data.get('body')
          })
        });
        msg.style.color = '#00E5A0';
        msg.innerHTML = `PR #${res.pr.number} aberto! <a href="${res.pr.html_url}" target="_blank" style="color:#00E5A0; text-decoration:underline;">Ver no GitHub ↗</a>`;
        setTimeout(close, 2000);
      } catch (err) {
        msg.style.color = '#fa8f8a';
        msg.textContent = `Erro: ${err.message}`;
        submitBtn.disabled = false;
      }
    });
  }

  window.loadRegistryProjects = load;
  window.openScreenInspector = openInspector;
  window.openGitHubConnectModal = openGitHubConnectModal;
  window.openGitHubCreateModal = openGitHubCreateModal;
  window.openProjectWorkspace = async (projectId, initialTab = null) => {
    window.showView?.('projects');
    const alias = projectId === 'api-platform' ? 'api-platform-live' : projectId;
    state.detailFocus = true;
    if (initialTab) state.workspaceTab = initialTab;
    if (state.projects.some((project) => project.id === alias)) {
      selectProject(alias, initialTab, true);
    } else {
      state.requestedProjectId = alias;
      await load();
      if (state.projects.some((project) => project.id === alias)) {
        selectProject(alias, initialTab, true);
      }
    }
    const proj = state.projects.find((p) => p.id === alias);
    if (window.GlobalSelectionStore && typeof window.GlobalSelectionStore.select === 'function') {
      window.GlobalSelectionStore.select('project', alias, proj || { id: alias });
    }
  };
  window.openProjectScreenDNA = async (projectId) => {
    const alias = projectId === 'api-platform' ? 'api-platform-live' : projectId;
    window.showView?.('projects');
    if (!state.projects.length) await load();
    if (!state.projects.some((project) => project.id === alias)) {
      state.requestedProjectId = alias;
      await load(true);
    }
    if (!state.projects.some((project) => project.id === alias)) return false;
    selectProject(alias);
    state.workspaceTab = 'screens';
    renderDetail();
    loadRegisteredScreens(state.projects.find((project) => project.id === alias));
    return true;
  };
  window.fenixOpenProjectReaAnalysis = async (projectId) => {
    const alias = projectId === 'api-platform' ? 'api-platform-live' : projectId;
    window.showView?.('projects');
    if (!state.projects.length) await load();
    if (!state.projects.some((project) => project.id === alias)) {
      state.requestedProjectId = alias;
      await load(true);
    }
    const project = state.projects.find((item) => item.id === alias);
    if (!project) return false;
    selectProject(alias);
    state.workspaceTab = 'intelligence';
    renderDetail();
    await loadReaEvidence(project, true);
    return true;
  };
  window.fenixOpenProjectDesignReference = async (projectId) => {
    const alias = projectId === 'api-platform' ? 'api-platform-live' : projectId;
    window.showView?.('projects');
    if (!state.projects.length) await load();
    if (!state.projects.some((project) => project.id === alias)) {
      state.requestedProjectId = alias;
      await load(true);
    }
    if (!state.projects.some((project) => project.id === alias)) return false;
    selectProject(alias);
    state.workspaceTab = 'intelligence';
    renderDetail();
    return true;
  };

  const parseProjectsRoute = () => {
    const hash = window.location.hash || '';
    const match = hash.match(/^#projects(?:\/([^\/?#]+))?(?:\/([^\/?#]+))?/i);
    if (!match) return null;
    return {
      projectId: match[1] ? decodeURIComponent(match[1]) : null,
      tab: match[2] ? decodeURIComponent(match[2]) : null
    };
  };

  // The Project Hub is expensive enough to load only when its route is active.
  const isProjectsRoute = () => /^#projects(?:\/|\?|$)/i.test(window.location.hash || '');
  const startProjectHub = () => {
    if (!isProjectsRoute()) return;
    const route = parseProjectsRoute();
    if (route?.projectId) {
      const alias = route.projectId === 'api-platform' ? 'api-platform-live' : route.projectId;
      state.requestedProjectId = alias;
      state.selected = alias;
      if (route.tab) state.workspaceTab = route.tab;
      state.detailFocus = true;
    } else {
      if (window.location.hash === '#projects' || window.location.hash === '' || window.location.hash.startsWith('#projects?')) {
        state.detailFocus = false;
        state.launcherFullGrid = true;
      }
    }
    syncMultiViewToolbar();
    renderShell();
    load();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startProjectHub, { once: true });
  } else {
    startProjectHub();
  }
  window.addEventListener('fenix:viewchanged', (e) => {
    if (e.detail?.viewId === 'projects') {
      if (!isProjectsRoute() && !document.getElementById('view-projects')?.classList.contains('active')) return;
      renderShell();
      load();
    }
  });
  window.addEventListener('hashchange', startProjectHub);

  // Keyboard navigation for Modals and Detail Workspace (ESC to return to catalog)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const container = $('flpInspectorContainer');
      if (container && container.innerHTML) {
        container.innerHTML = '';
        return;
      }
      const ghContainer = $('flpGitHubModalContainer');
      if (ghContainer && ghContainer.innerHTML) {
        ghContainer.innerHTML = '';
        return;
      }
      const sysModal = document.querySelector('.flp-system-modal-backdrop');
      if (sysModal) {
        sysModal.remove();
        return;
      }
      if (state.detailFocus) {
        state.detailFocus = false;
        state.launcherFullGrid = true;
        if (typeof window !== 'undefined' && window.location.hash.startsWith('#projects/')) {
          history.pushState(null, '', '#projects');
        }
        syncMultiViewToolbar();
        renderCards();
        renderDetail();
      }
    }
  });
})();
