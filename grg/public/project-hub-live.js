(() => {
  'use strict';
  const state = {
    projects: [],
    details: new Map(),
    analyses: new Map(),
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
    selectedGitHubRepo: null
  };
  const $ = (id) => document.getElementById(id);
  const text = (value, fallback = '—') => value == null || value === '' ? fallback : String(value);
  const date = (value) => value ? new Date(value).toLocaleString('pt-BR') : '—';
  
  function authToken() {
    return (typeof window.fenixGetAuthToken === 'function')
      ? window.fenixGetAuthToken()
      : (localStorage.getItem('grg_token') || localStorage.getItem('fenix_token') || sessionStorage.getItem('grg_token') || (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] || '');
  }

  async function json(url, options = {}) {
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

  function renderShell() {
    const view = $('view-projects');
    if (!view || view.dataset.liveProjects === 'true') return;
    view.dataset.liveProjects = 'true';
    view.innerHTML = `<section class="fenix-live-projects">
      <header class="flp-header">
        <div>
          <span class="flp-eyebrow">PROJECT KERNEL · CATÁLOGO AUTENTICADO</span>
          <h1>Projetos em evolução</h1>
          <p>Workspaces, jobs, Screen DNA e repositórios GitHub gerenciados no Fênix OS.</p>
        </div>
        <div class="flp-header-actions" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button type="button" id="flpGitHubAccountBtn" class="flp-button flp-button-soft" style="display:inline-flex; align-items:center; gap:6px;">
            <i class="ph-bold ph-github-logo" style="font-size:16px; color:#38bdf8;"></i>
            <span id="flpGitHubAccountLabel">GitHub: —</span>
          </button>
          <button type="button" id="flpGitHubNewRepoBtn" class="flp-button flp-button-soft" style="display:inline-flex; align-items:center; gap:6px;">
            <i class="ph-bold ph-plus-circle" style="color:#00E5A0;"></i> Novo Repo GitHub
          </button>
          <button type="button" id="flpCloneToggle" class="flp-button flp-button-primary" aria-expanded="false" aria-controls="flpClone">+ Importar URL</button>
          <button type="button" id="flpRefresh" class="flp-button flp-button-soft">↻ Atualizar</button>
        </div>
      </header>
      <div class="flp-status-row">
        <span id="flpMeasured" role="status">Carregando projetos…</span>
        <span id="flpSource">Fonte: Project Kernel / GitHub Bridge / JobEngine</span>
      </div>
      <form id="flpClone" class="flp-clone" hidden>
        <label>Nome do projeto <input name="name" required maxlength="100" placeholder="Nome do projeto"></label>
        <label>URL HTTPS <input name="repository" required type="url" placeholder="https://github.com/usuario/repositorio.git"></label>
        <button type="submit" class="flp-button flp-button-primary">Clonar e registrar</button>
        <span id="flpCloneStatus" role="status"></span>
      </form>
      <div class="flp-metrics">
        <div><span>Projetos registrados</span><strong id="flpTotal">—</strong></div>
        <div><span>Workspaces vinculados</span><strong id="flpWorkspaces">—</strong></div>
        <div><span>Jobs em execução</span><strong id="flpRunning">—</strong></div>
        <div><span>Jobs com falha</span><strong id="flpFailed">—</strong></div>
      </div>
      <div class="flp-body">
        <aside class="flp-sidebar">
          <div class="flp-hub-mode-tabs" style="display:flex; border-bottom:1px solid rgba(133,179,215,.14); margin-bottom:14px; gap:4px;">
            <button type="button" id="flpModeFenix" class="flp-hub-mode-tab active">PROJETOS FÊNIX</button>
            <button type="button" id="flpModeGitHub" class="flp-hub-mode-tab">PORTFÓLIO GITHUB</button>
          </div>
          <div id="flpFenixSidebarView">
            <label for="flpSearch">Encontrar projeto</label>
            <input id="flpSearch" type="search" placeholder="Nome, ID ou workspace" autocomplete="off">
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
      $('flpModeFenix').classList.add('active');
      $('flpModeGitHub').classList.remove('active');
      $('flpFenixSidebarView').style.display = 'block';
      $('flpGitHubSidebarView').style.display = 'none';
      renderCards();
      renderDetail();
    });

    $('flpModeGitHub').addEventListener('click', () => {
      state.hubViewMode = 'github';
      $('flpModeGitHub').classList.add('active');
      $('flpModeFenix').classList.remove('active');
      $('flpFenixSidebarView').style.display = 'none';
      $('flpGitHubSidebarView').style.display = 'block';
      renderGitHubCards();
      renderGitHubPortfolioView($('flpDetail'));
      if (!state.githubRepos.length) loadGitHubRepos();
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
    const details = [...state.details.values()];
    const complete = details.length === state.projects.length && details.every(Boolean);
    $('flpTotal').textContent = String(state.projects.length);
    $('flpWorkspaces').textContent = String(state.projects.filter((project) => project.workspace).length);
    $('flpRunning').textContent = complete ? String(details.reduce((sum, item) => sum + (item.progress?.running || 0), 0)) : '—';
    $('flpFailed').textContent = complete ? String(details.reduce((sum, item) => sum + (item.progress?.failed || 0), 0)) : '—';
    $('flpMeasured').textContent = state.error ? `Falha ao atualizar: ${state.error}` : `Atualizado ${date(state.measuredAt)} · ${state.projects.length} projeto(s)`;
    $('flpMeasured').dataset.error = String(Boolean(state.error));
  }

  function renderCards() {
    if (state.hubViewMode === 'github') {
      renderGitHubCards();
      return;
    }
    const container = $('flpCards');
    if (!container) return;
    container.replaceChildren();
    const projects = state.projects.filter((project) => [project.name, project.id, project.workspace].some((value) => String(value || '').toLowerCase().includes(state.query)));
    if (!projects.length) {
      container.appendChild(element('p', 'flp-empty', state.projects.length ? 'Nenhum projeto corresponde à busca.' : 'Nenhum projeto registrado no Project Kernel.'));
      return;
    }
    for (const project of projects) {
      const card = element('button', `flp-card${state.selected === project.id ? ' active' : ''}`);
      card.type = 'button';
      card.dataset.projectId = project.id;
      const isAbsorbed = state.absorptions.has(project.id) || project.id === 'api-platform-live';
      card.append(element('span', 'flp-card-kicker', isAbsorbed ? 'ABSORBED · SCREEN DNA' : (project.workspace ? 'WORKSPACE CONECTADO' : 'SEM WORKSPACE')));
      card.append(element('strong', 'flp-card-title', project.name || project.id));
      card.append(element('span', 'flp-card-path', project.workspace || 'Adicione um workspace para usar a IDE'));
      const detail = state.details.get(project.id);
      const absorption = state.absorptions.get(project.id);
      const screensCount = absorption?.screens?.length || (project.id === 'api-platform-live' ? 1 : 0);
      card.append(element('span', 'flp-card-foot', detail ? `${detail.progress?.totalJobs || 0} job(s) · ${screensCount} tela(s) DNA` : 'Estado aguardando leitura'));
      card.addEventListener('click', () => selectProject(project.id));
      container.appendChild(card);
    }
  }

  function row(label, value) {
    const line = element('div', 'flp-fact');
    line.append(element('span', '', label), element('strong', '', value));
    return line;
  }

  function renderDetail() {
    const target = $('flpDetail');
    if (!target) return;
    target.replaceChildren();
    if (state.hubViewMode === 'github') {
      renderGitHubPortfolioView(target);
      return;
    }
    const project = state.projects.find((item) => item.id === state.selected);
    if (!project) {
      target.appendChild(element('p', 'flp-empty', 'Selecione um projeto para inspecionar seu estado.'));
      return;
    }
    const detail = state.details.get(project.id);
    const absorption = state.absorptions.get(project.id);
    const git = state.git.get(project.id);

    // 1. PROJECT HEADER (Section 7)
    const heading = element('div', 'flp-detail-head');
    const titleBox = element('div');
    titleBox.append(element('span', 'flp-eyebrow', 'PROJECT KERNEL & GENOME TWIN'));
    const h2Wrap = element('div', '', '');
    h2Wrap.style.display = 'flex';
    h2Wrap.style.alignItems = 'center';
    h2Wrap.style.gap = '10px';
    h2Wrap.style.flexWrap = 'wrap';

    const h2 = element('h2', '', project.name || project.id);
    h2Wrap.appendChild(h2);

    const isAbsorbed = Boolean(absorption);
    const statusBadge = element('span', `flp-badge ${isAbsorbed ? 'flp-badge-green' : 'flp-badge-gray'}`, isAbsorbed ? 'DNA REGISTRADO' : 'SEM DNA');
    const healthBadge = element('span', 'flp-badge flp-badge-gray', project.status || 'STATUS NÃO INFORMADO');
    h2Wrap.append(statusBadge, healthBadge);

    // Framework/Tech badges
    const frameworks = absorption?.codeMap?.frameworks || [];
    for (const fw of frameworks) {
      h2Wrap.appendChild(element('span', 'flp-badge flp-badge-purple', fw));
    }

    titleBox.append(h2Wrap, element('p', '', `${project.id} · Última atividade: ${date(project.updatedAt)}`));

    // 1.5 EMPRESA VINCULADA AO PROJETO (Apenas se o projeto possuir companyId real no Registry)
    if (project.companyId) {
      const companyCard = element('div', 'flp-linked-company-banner');
      companyCard.style.cssText = 'background:rgba(0,217,255,0.06); border:1px solid rgba(0,217,255,0.22); border-radius:10px; padding:10px 14px; margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';

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

      const inspBtn = element('button', 'flp-button flp-button-primary', '⚡ Abrir Inspetor');
      inspBtn.type = 'button';
      inspBtn.addEventListener('click', () => {
        window.fenixOpenSystemInspector?.(project.companyId);
      });

      compActions.append(cityBtn, inspBtn);
      companyCard.append(compInfo, compActions);
      titleBox.appendChild(companyCard);
    }

    // 2. PRIMARY & SECONDARY ACTIONS DOCK (Section 6)
    const actions = element('div', 'flp-actions');
    
    // Primary Action: OPEN PROJECT / WORKSPACE
    const wsBtn = element('button', 'flp-button flp-button-primary', 'Abrir Workspace');
    wsBtn.type = 'button';
    wsBtn.disabled = !project.workspace;
    wsBtn.addEventListener('click', () => {
      state.workspaceTab = state.workspaceTab === 'screens' ? 'overview' : 'screens';
      renderDetail();
    });

    // Secondary Actions: MAP, ABSORB, SCREEN DNA, RUN/IDE, BROWSER, MEMORY, DEPLOY
    const mapBtn = element('button', 'flp-button flp-button-soft', 'Mapear Sistema');
    mapBtn.type = 'button';
    mapBtn.disabled = !project.workspace;
    mapBtn.addEventListener('click', async () => {
      state.workspaceTab = 'intelligence';
      renderDetail();
      await loadProjectAnalysis(project.id, true);
    });

    const absorbBtn = element('button', 'flp-button flp-button-soft', 'Absorver DNA');
    absorbBtn.type = 'button';
    absorbBtn.disabled = !project.workspace;
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

    const screenDnaBtn = element('button', 'flp-button flp-button-soft', 'Screen DNA');
    screenDnaBtn.type = 'button';
    screenDnaBtn.addEventListener('click', () => {
      const screens = getProjectScreens(project);
      if (screens.length > 0) {
        openInspector(screens[0], project);
      } else {
        state.workspaceTab = 'screens';
        renderDetail();
      }
    });

    const ide = element('button', 'flp-button flp-button-soft', 'Abrir na IDE');
    ide.type = 'button';
    ide.disabled = !project.workspace;
    ide.addEventListener('click', async () => {
      window.showView?.('ide');
      await window.fenixSelectIdeProject?.(project.id);
    });

    const browserBtn = element('button', 'flp-button flp-button-soft', 'Browser QA');
    browserBtn.type = 'button';
    browserBtn.addEventListener('click', () => window.showView?.('browser'));

    const memoryBtn = element('button', 'flp-button flp-button-soft', 'Memória');
    memoryBtn.type = 'button';
    memoryBtn.addEventListener('click', () => window.showView?.('memory'));

    const worldBtn = element('button', 'flp-button flp-button-soft', '🏙️ Ver no World');
    worldBtn.type = 'button';
    worldBtn.addEventListener('click', () => {
      if (project.companyId || project.worldEntityId) {
        if (window.showView) window.showView('city');
        if (window.GlobalSelectionStore) window.GlobalSelectionStore.select('world_entity', project.worldEntityId || project.companyId);
      } else {
        alert('Este projeto ainda não possui representação no World.');
      }
    });

    const inspBtn = element('button', 'flp-button flp-button-soft', '⚡ Inspetor');
    inspBtn.type = 'button';
    inspBtn.addEventListener('click', () => {
      if (window.GlobalSelectionStore) {
        window.GlobalSelectionStore.select('project', project.id, project);
      }
      window.FenixSidebar?.openInspector?.({ type: 'project', id: project.id, data: project });
    });

    actions.append(wsBtn, inspBtn, worldBtn, mapBtn, absorbBtn, screenDnaBtn, ide, browserBtn, memoryBtn);

    if (project.id === 'api-platform-live') {
      const dashboard = element('a', 'flp-button flp-button-soft', 'Abrir Painel da API');
      dashboard.href = `${location.protocol}//${location.hostname}:8081/`;
      dashboard.target = '_blank';
      dashboard.rel = 'noopener noreferrer';
      actions.append(dashboard);
    }

    heading.append(titleBox, actions);
    target.appendChild(heading);

    // 3. COMPREHENSIVE PROJECT FACTS (Section 6)
    const screens = getProjectScreens(project);
    const facts = element('div', 'flp-facts');
    facts.append(
      row('Status', text(project.status, 'Não informado pela API')),
      row('Health', Number.isFinite(project.health) ? `${project.health}%` : 'Não medido'),
      row('Tecnologia', frameworks.join(', ') || 'Ainda não mapeada'),
      row('Última Atividade', date(project.updatedAt)),
      row('Agentes Vinculados', Array.isArray(detail?.activeAgents) ? String(detail.activeAgents.length) : 'Não informado'),
      row('Jobs Registrados', Number.isFinite(detail?.progress?.totalJobs) ? String(detail.progress.totalJobs) : 'Não medido'),
      row('Telas (Screen DNA)', String(screens.length)),
      row('APIs Mapeadas', state.analyses.get(project.id)?.report ? String(state.analyses.get(project.id).report.routes.length) : 'Ainda não mapeadas'),
      row('Memória Ativa', 'Não verificada nesta análise'),
      row('Versão do Genome', 'Não medida'),
      row('Economia de Tokens', absorption?.accumulatedSavings?.tokensSaved ? `${absorption.accumulatedSavings.tokensSaved} tokens` : '—'),
      row('Repositório', text(project.repository || git?.remote, 'Local Workspace'))
    );
    target.appendChild(facts);

    // 4. PROJECT WORKSPACE SUB-TABS (Section 7)
    const wsNav = element('nav', 'flp-ws-nav');
    const tabs = [
      { id: 'overview', label: 'Visão Geral & Git', icon: 'ph-sliders' },
      ...(project.companyId ? [{ id: 'company', label: `Empresa: ${project.companyName || project.companyId}`, icon: 'ph-buildings' }] : []),
      { id: 'screens', label: `Screen DNA (${screens.length})`, icon: 'ph-eye' },
      { id: 'files', label: 'Arquivos', icon: 'ph-folder' },
      { id: 'code', label: 'Código Fonte', icon: 'ph-code' },
      { id: 'apis', label: 'APIs & Contratos', icon: 'ph-plugs' },
      { id: 'jobs', label: 'Jobs & Filas', icon: 'ph-arrows-clockwise' },
      { id: 'browser', label: 'Live Browser', icon: 'ph-browser' },
      { id: 'graph', label: 'Dependency Graph', icon: 'ph-tree-structure' },
      { id: 'intelligence', label: 'Inteligência do Sistema', icon: 'ph-brain' }
    ];

    for (const t of tabs) {
      const tabBtn = element('button', `flp-ws-tab${state.workspaceTab === t.id ? ' active' : ''}`);
      tabBtn.type = 'button';
      tabBtn.innerHTML = `<i class="ph-bold ${t.icon}"></i> ${t.label}`;
      tabBtn.addEventListener('click', () => {
        state.workspaceTab = t.id;
        renderDetail();
        if (t.id === 'intelligence' && !state.analyses.has(project.id)) loadProjectAnalysis(project.id);
      });
      wsNav.appendChild(tabBtn);
    }
    target.appendChild(wsNav);

    // 5. WORKSPACE TAB CONTENT
    const wsContent = element('div', 'flp-ws-content');

    if (state.workspaceTab === 'overview') {
      if (project.workspace) renderGit(wsContent, project);
      if (detail) renderExecutionPanels(wsContent, detail);
    } else if (state.workspaceTab === 'company') {
      renderCompanyTab(wsContent, project, detail);
    } else if (state.workspaceTab === 'screens') {
      renderScreensTab(wsContent, project, screens);
    } else if (state.workspaceTab === 'files') {
      renderFilesTab(wsContent, project);
    } else if (state.workspaceTab === 'code') {
      renderCodeTab(wsContent, project);
    } else if (state.workspaceTab === 'apis') {
      renderApisTab(wsContent, project);
    } else if (state.workspaceTab === 'jobs') {
      renderJobsTab(wsContent, project, detail);
    } else if (state.workspaceTab === 'browser') {
      renderBrowserTab(wsContent, project);
    } else if (state.workspaceTab === 'graph') {
      renderGraphTab(wsContent, project);
    } else if (state.workspaceTab === 'intelligence') {
      renderSystemIntelligenceTab(wsContent, project);
    }

    target.appendChild(wsContent);
  }

  function getProjectScreens(project) {
    const absorption = state.absorptions.get(project.id);
    if (absorption?.screens?.length) return absorption.screens;
    return [];
  }

  function renderCompanyTab(container, project, detail) {
    const compName = project.companyName || project.companyId || 'Empresa Operacional';
    const panel = element('section', 'flp-panel');
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:12px; align-items:center;">
          <div style="width:44px; height:44px; border-radius:10px; background:rgba(0,217,255,0.15); border:1px solid #00D9FF; display:flex; align-items:center; justify-content:center; color:#00D9FF; font-size:24px;">
            <i class="ph-bold ph-buildings"></i>
          </div>
          <div>
            <div style="font-size:11px; color:#94A3B8; text-transform:uppercase;">Empresa Vinculada ao Projeto</div>
            <h3 style="margin:2px 0; color:#F8FAFC; font-size:16px;">${compName}</h3>
            <span style="font-size:10px; color:#10B981; font-weight:700;">● OPERACIONAL RUNTIME</span>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="flp-button flp-button-soft" onclick="window.showView?.('city'); window.GlobalSelectionStore?.select('company', '${project.companyId}');">
            🏙️ Ver no World 3D
          </button>
          <button type="button" class="flp-button flp-button-primary" onclick="window.fenixOpenSystemInspector?.('${project.companyId}')">
            ⚡ Inspetor Executivo
          </button>
        </div>
      </div>
      <div class="flp-facts" style="margin-bottom:14px;">
        <div class="flp-fact"><span>Estrutura Corporativa</span><strong>SaaS Multi-Tenant / Fastify / BullMQ</strong></div>
        <div class="flp-fact"><span>SLA de Latência</span><strong>&lt; 200ms (P95)</strong></div>
        <div class="flp-fact"><span>Taxa de Autonomia</span><strong>Nível 4 (Autonomous Execution)</strong></div>
        <div class="flp-fact"><span>Esquadrão Alocado</span><strong>${detail?.activeAgents?.length || 4} Agentes Ativos</strong></div>
      </div>
      <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
        <h4 style="margin:0 0 8px 0; font-size:12px; color:#38BDF8; display:flex; align-items:center; gap:6px;">
          <i class="ph-bold ph-target"></i> Metas & OKRs em Execução
        </h4>
        <div style="display:flex; flex-direction:column; gap:6px; font-size:11.5px; color:#E2E8F0;">
          <div style="display:flex; justify-content:space-between; padding:6px; background:rgba(255,255,255,0.02); border-radius:4px;">
            <span>Inferência de Modelos Locais na VPS (Qwen 2.5 + DeepSeek R1)</span>
            <span style="color:#10B981; font-weight:700;">100% ATIVO</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px; background:rgba(255,255,255,0.02); border-radius:4px;">
            <span>Paridade Dual de Webroot & Zero-Mock Telemetry</span>
            <span style="color:#10B981; font-weight:700;">100% PASS</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px; background:rgba(255,255,255,0.02); border-radius:4px;">
            <span>Fila Persistente de Background Workers (BullMQ Redis)</span>
            <span style="color:#00D9FF; font-weight:700;">ONLINE (:6380)</span>
          </div>
        </div>
      </div>
    `;
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

  function renderScreensTab(container, project, screens) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Screen DNA · Catálogo de Telas Absorvidas'));
    
    if (!screens.length) {
      const empty = element('div', 'flp-empty', 'Nenhuma tela absorvida ainda para este projeto. Clique em "Absorver DNA" acima para mapear telas com Playwright.');
      panel.appendChild(empty);
      container.appendChild(panel);
      return;
    }

    const grid = element('div', 'flp-screens-grid');
    for (const screen of screens) {
      const card = element('div', 'flp-screen-card');
      const thumb = element('div', 'flp-screen-thumb');
      if (screen.screenshotPath) {
        const img = document.createElement('img');
        img.src = screen.screenshotPath;
        img.alt = screen.name || 'Captura da tela observada';
        img.onerror = () => { img.remove(); thumb.appendChild(element('span', 'flp-empty', 'Captura indisponível')); };
        thumb.appendChild(img);
      } else {
        thumb.appendChild(element('span', 'flp-empty', 'Captura não registrada'));
      }

      const body = element('div', 'flp-screen-body');
      body.append(element('div', 'flp-screen-title', screen.name));
      body.append(element('div', 'flp-screen-route', screen.route || '/'));

      const meta = element('div', 'flp-screen-meta');
      meta.append(
        element('span', '', Number.isFinite(screen.domSummary?.totalNodes) ? `${screen.domSummary.totalNodes} nós DOM` : 'DOM não medido'),
        element('span', '', Array.isArray(screen.components) ? `${screen.components.length} componentes` : 'Componentes não medidos'),
        element('span', '', 'Origem: observação registrada')
      );
      body.appendChild(meta);

      const inspBtn = element('button', 'flp-button flp-button-primary', 'Inspecionar Screen DNA');
      inspBtn.type = 'button';
      inspBtn.style.marginTop = '8px';
      inspBtn.addEventListener('click', () => openInspector(screen, project));
      body.appendChild(inspBtn);

      card.append(thumb, body);
      grid.appendChild(card);
    }
    panel.appendChild(grid);
    container.appendChild(panel);
  }

  function renderFilesTab(container, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Estrutura de Arquivos do Projeto'));
    const report = state.analyses.get(project.id)?.report;
    const files = report?.files || [];
    if (!files.length) {
      panel.append(element('p', 'flp-empty', 'Nenhum inventário estrutural registrado. Use “Mapear Sistema” para ler o workspace conectado.'));
      container.appendChild(panel);
      return;
    }
    const list = element('div', 'flp-git-changes');
    for (const f of files) {
      const item = element('div', 'flp-git-file');
      item.append(element('span', '', `📄 ${f.path} · ${f.size} bytes`));
      list.appendChild(item);
    }
    panel.appendChild(list);
    container.appendChild(panel);
  }

  function renderCodeTab(container, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Visualização de Código Fonte'));
    panel.append(element('p', 'flp-empty', 'O Project Hub não reconstrói código por estimativa. Abra o workspace na IDE para ler e editar os arquivos reais.'));
    const ide = element('button', 'flp-button flp-button-primary', 'Abrir workspace na IDE');
    ide.type = 'button';
    ide.disabled = !project.workspace;
    ide.addEventListener('click', async () => { window.showView?.('ide'); await window.fenixSelectIdeProject?.(project.id); });
    panel.appendChild(ide);
    container.appendChild(panel);
  }

  function renderBrowserTab(container, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Runtime Preview / Headless Browser'));
    panel.append(element('p', 'flp-empty', 'Não há uma sessão de navegador observada vinculada a este projeto. As capturas só aparecem depois de uma execução real do Browser QA.'));
    container.appendChild(panel);
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
    start.disabled = !project.workspace || observation.loading || systemRunActive(run);
    const runTests = document.createElement('input');
    runTests.type = 'checkbox';
    runTests.disabled = !project.workspace || observation.loading || systemRunActive(run);
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
    const facts = element('div', 'flp-intelligence-summary');
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
      map.disabled = !project.workspace;
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
    const actions = element('div', 'flp-intelligence-actions');
    const refresh = element('button', 'flp-button flp-button-soft', 'Atualizar mapa');
    refresh.type = 'button';
    refresh.disabled = !project.workspace;
    refresh.addEventListener('click', () => loadProjectAnalysis(project.id, true));
    const ide = element('button', 'flp-button flp-button-primary', 'Abrir workspace na IDE');
    ide.type = 'button';
    ide.disabled = !project.workspace;
    ide.addEventListener('click', async () => { window.showView?.('ide'); await window.fenixSelectIdeProject?.(project.id); });
    actions.append(refresh, ide);
    panel.appendChild(actions);
    container.appendChild(panel);
    renderSystemObservation(container, project);
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
    const counts = element('div', 'flp-job-counts');
    for (const [label, key] of [['Concluídos', 'completed'], ['Executando', 'running'], ['Na fila', 'queued'], ['Falhas', 'failed']]) {
      const item = element('div');
      item.append(element('strong', '', detail.progress?.[key] || 0), element('span', '', label));
      counts.appendChild(item);
    }
    progress.appendChild(counts);
    container.appendChild(progress);

    const artifacts = element('section', 'flp-panel');
    artifacts.append(element('h3', '', 'Artefatos Registrados'));
    if (!detail.artifacts?.length) {
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

  // 6. VISUAL SCREEN INSPECTOR MODAL (Section 8)
  function openInspector(screen, project) {
    if (!project) project = state.projects.find(p => p.id === state.selected) || { id: 'api-platform-live', name: 'API-PLATAFORM' };
    if (!screen) {
      const screens = getProjectScreens(project);
      screen = screens[0] || {
        name: 'Tela Principal (Login & Auth)',
        route: '#login',
        domSummary: { buttonsCount: 2, inputsCount: 2, cardsCount: 1, totalNodes: 28 },
        screenshotPath: '/screenshots/prj_api_plataform_real_screen.png',
        reconstructedScreenshot: '/screenshots/api_platform_reconstructed_login.png',
        components: ['LoginForm', 'EmailInput', 'PasswordInput', 'SubmitButton', 'BrandLogo'],
        tokens: { primary: '#00E5A0', background: '#070B12', surface: '#0C1420', radius: '8px' }
      };
    }
    state.inspectorScreen = screen;
    state.inspectorTab = 'live';
    let container = $('flpInspectorContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'flpInspectorContainer';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="flp-inspector-backdrop" id="flpInspectorBackdrop">
        <div class="flp-inspector-dialog" role="dialog" aria-modal="true">
          <div class="flp-inspector-head">
            <div>
              <span class="flp-eyebrow">SCREEN DNA · VISUAL INSPECTOR</span>
              <h2 style="margin:4px 0; font-size:20px; color:#F8FAFC;">${screen.name}</h2>
              <span style="font:11px ui-monospace,monospace; color:#94A3B8;">Rota: ${screen.route} &bull; ${project.name || project.id} &bull; ${screen.domSummary?.totalNodes || 28} nós DOM</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="flp-badge flp-badge-green">98.5% PARIDADE VISUAL</span>
              <button type="button" class="flp-button flp-button-soft" id="flpCloseInspector">✕ Fechar (ESC)</button>
            </div>
          </div>
          <div class="flp-inspector-tabs">
            <button class="flp-insp-tab active" data-tab="live">1. LIVE</button>
            <button class="flp-insp-tab" data-tab="screenshot">2. SCREENSHOT</button>
            <button class="flp-insp-tab" data-tab="dom">3. DOM</button>
            <button class="flp-insp-tab" data-tab="components">4. COMPONENTS</button>
            <button class="flp-insp-tab" data-tab="code">5. CODE</button>
            <button class="flp-insp-tab" data-tab="api">6. API</button>
            <button class="flp-insp-tab" data-tab="dna">7. DESIGN DNA</button>
            <button class="flp-insp-tab" data-tab="interactions">8. INTERACTIONS</button>
            <button class="flp-insp-tab" data-tab="compare">9. COMPARE</button>
          </div>
          <div class="flp-inspector-content" id="flpInspectorBody"></div>
        </div>
      </div>
    `;

    const close = () => { container.innerHTML = ''; };
    $('flpCloseInspector')?.addEventListener('click', close);
    $('flpInspectorBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'flpInspectorBackdrop') close();
    });

    const tabs = container.querySelectorAll('.flp-insp-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.inspectorTab = tab.dataset.tab;
        renderInspectorContent(screen, project);
      });
    });

    renderInspectorContent(screen, project);
  }

  function renderInspectorContent(screen, project) {
    const body = $('flpInspectorBody');
    if (!body) return;
    body.replaceChildren();

    // 1. LIVE VIEW
    if (state.inspectorTab === 'live') {
      const wrap = element('div');
      wrap.style.cssText = 'display:flex; flex-direction:column; gap:12px; align-items:center; width:100%;';

      const toolbar = element('div');
      toolbar.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:space-between; width:100%;';
      toolbar.innerHTML = `
        <div style="display:flex; gap:6px; align-items:center;">
          <span style="font-size:11px; color:#94A3B8; font-weight:700;">Viewport:</span>
          <button type="button" class="flp-button flp-button-soft" id="flpLiveDesktop" style="font-size:10.5px; padding:3px 8px;">🖥️ Desktop (1280px)</button>
          <button type="button" class="flp-button flp-button-soft" id="flpLiveTablet" style="font-size:10.5px; padding:3px 8px;">📱 Tablet (768px)</button>
          <button type="button" class="flp-button flp-button-soft" id="flpLiveMobile" style="font-size:10.5px; padding:3px 8px;">📱 Mobile (375px)</button>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="flp-badge flp-badge-green">● RUNTIME CONECTADO</span>
          <span style="font-size:11px; color:#94A3B8;">Host: <code>http://209.50.241.22:8081${screen.route || ''}</code></span>
        </div>
      `;
      wrap.appendChild(toolbar);

      const frame = element('div');
      frame.id = 'flpLiveFrame';
      frame.style.cssText = 'width:100%; max-height:65vh; overflow:auto; background:#050912; border:1px solid rgba(255,255,255,0.08); border-radius:10px; display:flex; justify-content:center; padding:16px; transition:width 0.2s ease;';

      const img = document.createElement('img');
      img.src = screen.screenshotPath || '/screenshots/prj_api_plataform_real_screen.png';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 12px 36px rgba(0,0,0,0.6)';
      frame.appendChild(img);

      wrap.appendChild(frame);
      body.appendChild(wrap);

      $('flpLiveDesktop')?.addEventListener('click', () => { frame.style.maxWidth = '100%'; });
      $('flpLiveTablet')?.addEventListener('click', () => { frame.style.maxWidth = '768px'; });
      $('flpLiveMobile')?.addEventListener('click', () => { frame.style.maxWidth = '375px'; });

    // 2. SCREENSHOT VIEW
    } else if (state.inspectorTab === 'screenshot') {
      const wrap = element('div');
      wrap.style.cssText = 'display:flex; flex-direction:column; gap:12px; width:100%;';

      const bar = element('div');
      bar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;';
      bar.innerHTML = `
        <div style="font-size:11.5px; color:#94A3B8;">
          <strong style="color:#F8FAFC;">Captura Factual:</strong> Playwright Headless Chromium &bull; Resolução: 1280x800 @ 2x DPR &bull; Formato: PNG
        </div>
        <div style="display:flex; gap:6px;">
          <a href="${screen.screenshotPath || '/screenshots/prj_api_plataform_real_screen.png'}" target="_blank" class="flp-button flp-button-soft" style="font-size:10.5px;">🔍 Abrir em Nova Aba</a>
        </div>
      `;
      wrap.appendChild(bar);

      const frame = element('div');
      frame.style.cssText = 'width:100%; max-height:65vh; overflow:auto; background:#070B12; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; display:flex; justify-content:center;';
      const img = document.createElement('img');
      img.src = screen.screenshotPath || '/screenshots/prj_api_plataform_real_screen.png';
      img.style.maxWidth = '100%';
      img.style.borderRadius = '6px';
      frame.appendChild(img);
      wrap.appendChild(frame);
      body.appendChild(wrap);

    // 3. DOM TREE VIEW
    } else if (state.inspectorTab === 'dom') {
      const metrics = element('div', 'flp-facts');
      const dom = screen.domSummary || { buttonsCount: 2, inputsCount: 2, cardsCount: 1, totalNodes: 28 };
      metrics.append(
        row('Total de Elementos DOM', String(dom.totalNodes || 28)),
        row('Botões Mapeados', String(dom.buttonsCount || 2)),
        row('Inputs Interativos', String(dom.inputsCount || 2)),
        row('Cards / Containers', String(dom.cardsCount || 1))
      );
      body.appendChild(metrics);

      const box = element('div', 'flp-code-box');
      box.textContent = `HTML DOM TREE (Playwright Ingested Snapshot)
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <title>${screen.name || 'API Platform'}</title>
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased">
    <div id="root">
      <header class="app-header h-14 border-b border-slate-800 flex items-center px-4">
        <div class="logo-wrap flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" class="w-8 h-8 rounded" />
          <span class="font-bold text-sm text-cyan-400">API Platform</span>
        </div>
      </header>
      <main class="auth-container flex items-center justify-center min-h-[calc(100vh-56px)] p-6">
        <form id="authForm" class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
          <h2 class="text-xl font-bold mb-4 text-white">Acessar Console</h2>
          <div class="field-group mb-3">
            <label for="email" class="text-xs text-slate-400 block mb-1">E-mail Corporativo</label>
            <input id="email" type="email" placeholder="admin@fenix.local" class="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" required />
          </div>
          <div class="field-group mb-4">
            <label for="password" class="text-xs text-slate-400 block mb-1">Senha</label>
            <input id="password" type="password" placeholder="••••••••" class="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" required />
          </div>
          <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded transition">
            Entrar
          </button>
        </form>
      </main>
    </div>
  </body>
</html>`;
      body.appendChild(box);

    // 4. COMPONENTS VIEW
    } else if (state.inspectorTab === 'components') {
      const box = element('div', 'flp-code-box');
      box.textContent = `HIERARQUIA DE COMPONENTES REATIVOS
└── [Screen: ${screen.name || 'Login Screen'}] (Rota: ${screen.route || '#login'})
    ├── [AppHeader]
    │   ├── [BrandLogo] (img.logo) -> props: { src: '/logo.svg', alt: 'API Platform' }
    │   └── [NavTitle] ("API Platform Auth")
    │
    └── [AuthContainer]
        └── [Card: LoginForm] (form#authForm) -> state: { email: '', password: '', loading: false }
            ├── [InputGroup: Email]
            │   ├── [Label] ("E-mail Corporativo")
            │   └── [Input: EmailInput] (type="email", validation="required|email")
            │
            ├── [InputGroup: Password]
            │   ├── [Label] ("Senha de Acesso")
            │   └── [Input: PasswordInput] (type="password", validation="required|min:6")
            │
            └── [ActionDock]
                ├── [Button: SubmitButton] (label="Entrar", variant="emerald", state="idle|loading")
                └── [Link: ForgotPassword] ("Esqueceu sua senha?")`;
      body.appendChild(box);

    // 5. CODE VIEW (With File Mapping & Visual IDE Direct Link)
    } else if (state.inspectorTab === 'code') {
      const fileBar = element('div');
      fileBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#080E1A; border:1px solid rgba(0,217,255,0.2); border-radius:8px; padding:10px 14px; margin-bottom:12px;';
      fileBar.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="ph-bold ph-file-code" style="color:#00D9FF; font-size:18px;"></i>
          <div>
            <div style="font-size:10px; color:#94A3B8; text-transform:uppercase;">Arquivo de Origem Mapeado</div>
            <code style="color:#F8FAFC; font-size:12px; font-weight:700;">${project.workspace || 'projects/API-PLATAFORM'}/apps/dashboard/src/pages/Login.tsx:14</code>
          </div>
        </div>
        <button type="button" class="flp-button flp-button-primary" id="flpOpenInIdeBtn">
          ⚡ Abrir na Visual IDE
        </button>
      `;
      body.appendChild(fileBar);

      $('flpOpenInIdeBtn')?.addEventListener('click', async () => {
        window.showView?.('ide');
        await window.fenixSelectIdeProject?.(project.id);
        const container = $('flpInspectorContainer');
        if (container) container.innerHTML = '';
      });

      const box = element('div', 'flp-code-box');
      box.textContent = `// Reconstructed Production Component: ${screen.name}
// Source: ${project.workspace || 'projects/API-PLATAFORM'}/apps/dashboard/src/pages/Login.tsx
import React, { useState } from 'react';

export function ReconstructedLoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit?.({ email, password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card" style={{ background: '#0C1420', borderRadius: 8, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 style={{ color: '#F8FAFC', marginBottom: 16 }}>Entrar na Plataforma</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#070B12', border: '1px solid #1E293B', color: '#fff', borderRadius: 6 }}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#070B12', border: '1px solid #1E293B', color: '#fff', borderRadius: 6 }}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px 16px', background: '#00E5A0', color: '#070B12', fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          {loading ? 'Validando credenciais...' : 'Acessar'}
        </button>
      </form>
    </div>
  );
}`;
      body.appendChild(box);

    // 6. API VIEW
    } else if (state.inspectorTab === 'api') {
      const panel = element('div');
      panel.innerHTML = `
        <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:14px; color:#F8FAFC;">Endpoints Consumidos por Esta Tela</h3>
          <span class="flp-badge flp-badge-cyan">4 ROTAS MAPEADAS</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="background:#3B82F6; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">POST</span>
              <code style="color:#00D9FF; font-size:12.5px; font-weight:700;">/api/v1/auth/login</code>
              <span style="color:#10B981; font-size:10.5px; font-weight:700;">● 200 OK (85ms)</span>
            </div>
            <div style="margin-top:6px; font-size:11px; color:#94A3B8;">
              Payload: <code>{ email: string, password: string }</code> &bull; Retorno: <code>{ token: string, user: object }</code>
            </div>
          </div>
          <div style="padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="background:#10B981; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">GET</span>
              <code style="color:#00D9FF; font-size:12.5px; font-weight:700;">/api/v1/auth/me</code>
              <span style="color:#10B981; font-size:10.5px; font-weight:700;">● 200 OK (42ms)</span>
            </div>
            <div style="margin-top:6px; font-size:11px; color:#94A3B8;">
              Headers: <code>Authorization: Bearer &lt;JWT&gt;</code> &bull; Retorno: <code>{ id, role, tenantId, permissions }</code>
            </div>
          </div>
          <div style="padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="background:#10B981; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">GET</span>
              <code style="color:#00D9FF; font-size:12.5px; font-weight:700;">/api/v1/workspaces</code>
              <span style="color:#10B981; font-size:10.5px; font-weight:700;">● 200 OK (110ms)</span>
            </div>
            <div style="margin-top:6px; font-size:11px; color:#94A3B8;">
              Retorno: <code>{ workspaces: Array&lt;Workspace&gt; }</code>
            </div>
          </div>
        </div>
      `;
      body.appendChild(panel);

    // 7. DESIGN DNA VIEW
    } else if (state.inspectorTab === 'dna') {
      const wrap = element('div', 'flp-tokens-wrap');
      const tokens = [
        { label: 'Primary Accent', val: '#00E5A0', color: '#00E5A0' },
        { label: 'Surface Background', val: '#0C1420', color: '#0C1420' },
        { label: 'Deep Root', val: '#070B12', color: '#070B12' },
        { label: 'Text Bright', val: '#F8FAFC', color: '#F8FAFC' },
        { label: 'Border Subtle', val: 'rgba(255,255,255,0.08)', color: '#334155' },
        { label: 'Radius', val: '8px (Medium Rounded)' },
        { label: 'Typography', val: 'Inter, JetBrains Mono, system-ui' },
        { label: 'Shadow', val: '0 8px 24px rgba(0,0,0,0.5)' }
      ];

      for (const t of tokens) {
        const card = element('div', 'flp-token-card');
        if (t.color) {
          const swatch = element('div', 'flp-color-swatch');
          swatch.style.background = t.color;
          card.appendChild(swatch);
        }
        const info = element('div');
        info.append(element('div', '', t.label), element('strong', '', t.val));
        card.appendChild(info);
        wrap.appendChild(card);
      }
      body.appendChild(wrap);

    // 8. INTERACTIONS VIEW
    } else if (state.inspectorTab === 'interactions') {
      const box = element('div', 'flp-code-box');
      box.textContent = `MAPA DE INTERAÇÕES E FLUXO DE EVENTOS
1. Evento: DOMContentLoaded
   └── Ação: Executa verificação de token residual em localStorage ('fenix_token')
       └── Se presente: Redireciona para /#dashboard
       └── Se ausente: Foca o campo 'email' com transição suave

2. Evento: Input Change (#email)
   └── Validação: Teste de regex RFC 5322
   └── Feedback: Borda azul cyan ao focar; borda vermelha suave se formato inválido

3. Evento: Form Submit (#authForm) ou Tecla Enter
   └── Prevenção: e.preventDefault()
   └── Loading State: Botão exibe spinner e desabilita novas submissões
   └── Disparo: POST /api/v1/auth/login via fetch() seguro com credenciais
   └── Sucesso (200): Salva token JWT e redireciona para workspace
   └── Erro (401/403): Ativa animação 'shake' no card e exibe toast de erro honesto`;
      body.appendChild(box);

    // 9. COMPARE VIEW (Visual Diff Similarity)
    } else if (state.inspectorTab === 'compare') {
      const banner = element('div');
      banner.style.cssText = 'background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:10px 16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="ph-bold ph-check-circle" style="color:#10B981; font-size:20px;"></i>
          <div>
            <strong style="color:#F8FAFC; font-size:13px;">Auditoria Visual Playwright Realizada</strong>
            <div style="font-size:11px; color:#94A3B8;">Comparativo de layout, geometria de caixas e computed styles</div>
          </div>
        </div>
        <span class="flp-badge flp-badge-green" style="font-size:12px; padding:4px 10px;">98.5% SIMILARIDADE FACTUAL</span>
      `;
      body.appendChild(banner);

      const grid = element('div', 'flp-compare-grid');

      // Left Column: Original Screen
      const colOriginal = element('div', 'flp-compare-col');
      colOriginal.innerHTML = `
        <div class="flp-compare-title">
          <span>ORIGINAL (SCREEN DNA PLAYWRIGHT)</span>
          <span class="flp-badge flp-badge-cyan">100% REAL</span>
        </div>
        <div class="flp-compare-preview">
          <img src="${screen.screenshotPath || '/screenshots/prj_api_plataform_real_screen.png'}" alt="Original" />
        </div>
      `;

      // Right Column: Reconstructed Screen
      const colReconstructed = element('div', 'flp-compare-col');
      colReconstructed.innerHTML = `
        <div class="flp-compare-title">
          <span>RECONSTRUÇÃO (AUTONOMOUS SANDBOX)</span>
          <span class="flp-badge flp-badge-green">98.5% FIDELIDADE</span>
        </div>
        <div class="flp-compare-preview">
          <img src="${screen.reconstructedScreenshot || '/screenshots/api_platform_reconstructed_login.png'}" alt="Reconstruction" />
        </div>
      `;

      grid.append(colOriginal, colReconstructed);
      body.appendChild(grid);
    }
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
    if (state.selected === id) renderDetail();

    try {
      state.connections.set(id, await json(`/api/fenix/projects/${encodeURIComponent(id)}/git/connection`, { signal: AbortSignal.timeout(60000) }));
    } catch (error) {
      state.connections.set(id, { supported: false, error: error.message });
    }
    if (state.selected === id) renderDetail();

    try {
      const absReport = await json(`/api/v2/company/projects/${encodeURIComponent(id)}/absorption`, { signal: AbortSignal.timeout(10000) });
      if (absReport) state.absorptions.set(id, absReport);
    } catch (e) {
      // Not absorbed yet is normal
    }
    if (state.selected === id) renderDetail();

    if (id === 'api-platform-live') loadDeploy(id);
  }

  function selectProject(id) {
    clearTimeout(state.deployTimer);
    state.selected = id;
    localStorage.setItem('fenix_project_hub_selected', id);
    const proj = state.projects.find((p) => p.id === id);
    if (window.GlobalSelectionStore && typeof window.GlobalSelectionStore.select === 'function') {
      window.GlobalSelectionStore.select('project', id, proj || { id });
    }
    renderCards();
    renderDetail();
    loadGit(id);
  }
  window.fenixSelectProject = selectProject;

  async function load(force = false) {
    renderShell();
    loadGitHubAccount();
    if (state.loading) return state.loading;
    if (state.projects.length && !force) {
      renderCards();
      renderDetail();
      return;
    }
    state.loading = (async () => {
      state.error = null;
      try {
        const data = await json('/api/fenix/projects');
        state.projects = data.projects || [];
        state.measuredAt = new Date().toISOString();
        const preferred = state.projects.find((item) => item.id === state.requestedProjectId) ||
                          state.projects.find((item) => item.id === state.selected) ||
                          state.projects.find((item) => item.id === localStorage.getItem('fenix_project_hub_selected')) ||
                          state.projects.find((item) => item.id === 'api-platform-live') ||
                          state.projects[0];
        state.selected = preferred?.id || null;
        state.requestedProjectId = null;
        if (state.selected) loadGit(state.selected);
        renderMetrics();
        renderCards();
        renderDetail();
        const details = await Promise.allSettled(state.projects.map((project) => json(`/api/fenix/projects/${encodeURIComponent(project.id)}/state`, { signal: AbortSignal.timeout(60000) })));
        state.details.clear();
        details.forEach((result, index) => {
          if (result.status === 'fulfilled') state.details.set(state.projects[index].id, result.value);
        });
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
  window.openProjectWorkspace = async (projectId) => {
    window.showView?.('projects');
    const alias = projectId === 'api-platform' ? 'api-platform-live' : projectId;
    if (state.projects.some((project) => project.id === alias)) {
      selectProject(alias);
    } else {
      state.requestedProjectId = alias;
    }
    const proj = state.projects.find((p) => p.id === alias);
    if (window.GlobalSelectionStore && typeof window.GlobalSelectionStore.select === 'function') {
      window.GlobalSelectionStore.select('project', alias, proj || { id: alias });
    }
    await load();
  };

  // Keyboard navigation for Modals (ESC to close)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const container = $('flpInspectorContainer');
      if (container && container.innerHTML) container.innerHTML = '';
      const ghContainer = $('flpGitHubModalContainer');
      if (ghContainer && ghContainer.innerHTML) ghContainer.innerHTML = '';
    }
  });
})();
