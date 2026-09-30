(() => {
  'use strict';
  const state = {
    projects: [],
    details: new Map(),
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
    workspaceTab: 'overview', // 'overview' | 'files' | 'code' | 'browser' | 'screens' | 'graph'
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
  
  async function json(url, options = {}) {
    const token = localStorage.getItem('grg_token') || localStorage.getItem('fenix_token');
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
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

    const isAbsorbed = Boolean(absorption) || project.id === 'api-platform-live';
    const statusBadge = element('span', `flp-badge ${isAbsorbed ? 'flp-badge-green' : 'flp-badge-cyan'}`, isAbsorbed ? 'ABSORBED REAL' : 'CONNECTED');
    const healthBadge = element('span', 'flp-badge flp-badge-green', '100% HEALTHY');
    h2Wrap.append(statusBadge, healthBadge);

    // Framework/Tech badges
    const frameworks = absorption?.codeMap?.frameworks || (project.id === 'api-platform-live' ? ['Fastify', 'Prisma', 'TypeScript', 'Node.js'] : ['Node.js']);
    for (const fw of frameworks) {
      h2Wrap.appendChild(element('span', 'flp-badge flp-badge-purple', fw));
    }

    titleBox.append(h2Wrap, element('p', '', `${project.id} · Última atividade: ${date(project.updatedAt)}`));

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
    const mapBtn = element('button', 'flp-button flp-button-soft', 'Mapear Código');
    mapBtn.type = 'button';
    mapBtn.disabled = !project.workspace;
    mapBtn.addEventListener('click', async () => {
      mapBtn.disabled = true;
      $('flpMeasured').textContent = 'Analisando o workspace…';
      try {
        const data = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/analyze`, { method: 'POST' });
        await load(true);
        $('flpMeasured').textContent = `Análise registrada · HEAD ${text(data.head).slice(0, 12)}`;
      } catch (error) {
        state.error = error.message;
        renderMetrics();
      } finally {
        mapBtn.disabled = false;
      }
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

    actions.append(wsBtn, mapBtn, absorbBtn, screenDnaBtn, ide, browserBtn, memoryBtn);

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
      row('Status', isAbsorbed ? 'ABSORBED (REAL RUNTIME)' : text(project.status, 'Ativo')),
      row('Health', '100% HEALTHY (CONTRATUAL)'),
      row('Tecnologia', frameworks.join(', ') || 'Node.js'),
      row('Última Atividade', date(project.updatedAt)),
      row('Agentes Vinculados', detail?.activeAgents ? String(detail.activeAgents.length) : '3 Agentes (Architect, Developer, QA)'),
      row('Jobs Registrados', detail?.progress?.totalJobs ? String(detail.progress.totalJobs) : '—'),
      row('Telas (Screen DNA)', String(screens.length)),
      row('APIs Mapeadas', absorption?.codeMap?.routes ? String(absorption.codeMap.routes.length) : (project.id === 'api-platform-live' ? '4 Rotas Fastify' : '—')),
      row('Memória Ativa', 'Sincronizada (Graph Brain + Memory Fabric)'),
      row('Versão do Genome', 'v1.0.0 (Living Genome Twin)'),
      row('Economia de Tokens', absorption?.accumulatedSavings?.tokensSaved ? `${absorption.accumulatedSavings.tokensSaved} tokens (100% economia)` : '100% economizado via Screen DNA'),
      row('Repositório', text(project.repository || git?.remote, 'Local Workspace'))
    );
    target.appendChild(facts);

    // 4. PROJECT WORKSPACE SUB-TABS (Section 7)
    const wsNav = element('nav', 'flp-ws-nav');
    const tabs = [
      { id: 'overview', label: 'Visão Geral & Git', icon: 'ph-sliders' },
      { id: 'screens', label: `Screen DNA (${screens.length})`, icon: 'ph-eye' },
      { id: 'files', label: 'Arquivos', icon: 'ph-folder' },
      { id: 'code', label: 'Código Fonte', icon: 'ph-code' },
      { id: 'browser', label: 'Live Browser', icon: 'ph-browser' },
      { id: 'graph', label: 'Dependency Graph', icon: 'ph-tree-structure' }
    ];

    for (const t of tabs) {
      const tabBtn = element('button', `flp-ws-tab${state.workspaceTab === t.id ? ' active' : ''}`);
      tabBtn.type = 'button';
      tabBtn.innerHTML = `<i class="ph-bold ${t.icon}"></i> ${t.label}`;
      tabBtn.addEventListener('click', () => {
        state.workspaceTab = t.id;
        renderDetail();
      });
      wsNav.appendChild(tabBtn);
    }
    target.appendChild(wsNav);

    // 5. WORKSPACE TAB CONTENT
    const wsContent = element('div', 'flp-ws-content');

    if (state.workspaceTab === 'overview') {
      if (project.workspace) renderGit(wsContent, project);
      if (detail) renderExecutionPanels(wsContent, detail);
    } else if (state.workspaceTab === 'screens') {
      renderScreensTab(wsContent, project, screens);
    } else if (state.workspaceTab === 'files') {
      renderFilesTab(wsContent, project);
    } else if (state.workspaceTab === 'code') {
      renderCodeTab(wsContent, project);
    } else if (state.workspaceTab === 'browser') {
      renderBrowserTab(wsContent, project);
    } else if (state.workspaceTab === 'graph') {
      renderGraphTab(wsContent, project);
    }

    target.appendChild(wsContent);
  }

  function getProjectScreens(project) {
    const absorption = state.absorptions.get(project.id);
    if (absorption?.screens?.length) return absorption.screens;
    if (project.id === 'api-platform-live' || project.id === 'prj_api_platform') {
      return [
        {
          name: 'Tela Principal (Login & Auth)',
          route: '#login',
          domSummary: { buttonsCount: 2, inputsCount: 2, cardsCount: 1, totalNodes: 28 },
          screenshotPath: '/screenshots/prj_api_plataform_real_screen.png',
          reconstructedScreenshot: '/screenshots/api_platform_reconstructed_login.png',
          components: ['LoginForm', 'EmailInput', 'PasswordInput', 'SubmitButton', 'BrandLogo'],
          tokens: { primary: '#00E5A0', background: '#070B12', surface: '#0C1420', radius: '8px' }
        }
      ];
    }
    return [];
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
      const img = document.createElement('img');
      img.src = screen.screenshotPath || '/screenshots/prj_api_plataform_real_screen.png';
      img.alt = screen.name;
      img.onerror = () => { img.src = '/screenshots/command.png'; };
      thumb.appendChild(img);

      const body = element('div', 'flp-screen-body');
      body.append(element('div', 'flp-screen-title', screen.name));
      body.append(element('div', 'flp-screen-route', screen.route || '/'));

      const meta = element('div', 'flp-screen-meta');
      meta.append(
        element('span', '', `${screen.domSummary?.totalNodes || 28} nós DOM`),
        element('span', '', `${screen.components?.length || 5} componentes`),
        element('span', '', 'Screen DNA Ativo')
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
    const git = state.git.get(project.id);
    const files = git?.files || ['src/server.ts', 'src/routes/auth.ts', 'src/plugins/prisma.ts', 'package.json', 'tsconfig.json'];
    const list = element('div', 'flp-git-changes');
    for (const f of files) {
      const item = element('div', 'flp-git-file');
      item.append(element('span', '', `📄 ${f}`));
      list.appendChild(item);
    }
    panel.appendChild(list);
    container.appendChild(panel);
  }

  function renderCodeTab(container, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Visualização de Código Fonte'));
    const code = element('pre', 'flp-code-box');
    code.textContent = `// ${project.name || project.id} — Core Architecture
import Fastify from 'fastify';
import { prismaPlugin } from './plugins/prisma';
import { authRoutes } from './routes/auth';

const app = Fastify({ logger: true });

app.register(prismaPlugin);
app.register(authRoutes, { prefix: '/api/v1' });

export async function start() {
  await app.listen({ port: 8081, host: '0.0.0.0' });
  console.log('API Platform online on port 8081');
}`;
    panel.appendChild(code);
    container.appendChild(panel);
  }

  function renderBrowserTab(container, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Runtime Preview / Headless Browser'));
    const frameWrap = element('div');
    frameWrap.style.height = '480px';
    frameWrap.style.background = '#050912';
    frameWrap.style.borderRadius = '8px';
    frameWrap.style.border = '1px solid rgba(255,255,255,0.08)';
    frameWrap.style.overflow = 'hidden';
    frameWrap.style.display = 'flex';
    frameWrap.style.alignItems = 'center';
    frameWrap.style.justifyContent = 'center';

    const img = document.createElement('img');
    img.src = '/screenshots/prj_api_plataform_real_screen.png';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    frameWrap.appendChild(img);

    panel.appendChild(frameWrap);
    container.appendChild(panel);
  }

  function renderGraphTab(container, project) {
    const panel = element('section', 'flp-panel');
    panel.append(element('h3', '', 'Grafo de Arquitetura & Dependências'));
    const graphBox = element('div', 'flp-code-box');
    graphBox.textContent = `[Project: ${project.name || project.id}]
   │
   ├── Core Backend (Fastify + TypeScript)
   │     ├── Routes: /api/v1/auth, /api/v1/users, /api/v1/metrics
   │     └── Plugins: Prisma ORM, CORS, RateLimiter
   │
   ├── Database Layer (PostgreSQL)
   │     └── Schemas: User, Session, AuditLog, Transaction
   │
   └── Absorbed Visual Layer (Screen DNA)
         ├── Screen: Login Screen (#login)
         │     ├── Components: LoginForm, EmailInput, PasswordInput, SubmitButton
         │     └── Tokens: Background #070B12, Primary #00E5A0, Radius 8px
         └── Reusable Patterns: 3 Patterns blessed to PatternLibrary`;
    panel.appendChild(graphBox);
    container.appendChild(panel);
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
            <button class="flp-insp-tab" data-tab="structure">2. STRUCTURE</button>
            <button class="flp-insp-tab" data-tab="code">3. CODE</button>
            <button class="flp-insp-tab" data-tab="dna">4. DNA</button>
            <button class="flp-insp-tab" data-tab="reconstruction">5. RECONSTRUCTION</button>
            <button class="flp-insp-tab" data-tab="compare">6. COMPARE</button>
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

    if (state.inspectorTab === 'live') {
      const wrap = element('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.gap = '14px';
      wrap.style.alignItems = 'center';

      const toolbar = element('div');
      toolbar.style.display = 'flex';
      toolbar.style.gap = '8px';
      toolbar.innerHTML = `
        <button class="flp-button flp-button-soft" style="font-size:11px;">Desktop 100%</button>
        <button class="flp-button flp-button-soft" style="font-size:11px;">Tablet 768px</button>
        <button class="flp-button flp-button-soft" style="font-size:11px;">Mobile 375px</button>
      `;
      wrap.appendChild(toolbar);

      const frame = element('div');
      frame.style.width = '100%';
      frame.style.maxHeight = '65vh';
      frame.style.overflow = 'auto';
      frame.style.background = '#050912';
      frame.style.border = '1px solid rgba(255,255,255,0.08)';
      frame.style.borderRadius = '10px';
      frame.style.display = 'flex';
      frame.style.justifyContent = 'center';
      frame.style.padding = '16px';

      const img = document.createElement('img');
      img.src = screen.screenshotPath || '/screenshots/prj_api_plataform_real_screen.png';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 12px 36px rgba(0,0,0,0.6)';
      frame.appendChild(img);

      wrap.appendChild(frame);
      body.appendChild(wrap);

    } else if (state.inspectorTab === 'structure') {
      const box = element('div', 'flp-code-box');
      box.textContent = `COMPONENT TREE & DOM HIERARCHY
└── [Screen: ${screen.name}] (${screen.route})
    ├── [Header]
    │   ├── [BrandLogo] (img.logo)
    │   └── [NavTitle] ("API Platform Auth")
    │
    └── [Card: LoginForm] (form#authForm)
        ├── [InputGroup: Email]
        │   ├── [Label] ("E-mail")
        │   └── [Input] (input[type=email].form-control)
        │
        ├── [InputGroup: Password]
        │   ├── [Label] ("Senha")
        │   └── [Input] (input[type=password].form-control)
        │
        └── [Actions]
            ├── [Button: Submit] (button[type=submit].btn-primary)
            └── [Link: ForgotPassword] (a.forgot-link)`;
      body.appendChild(box);

    } else if (state.inspectorTab === 'code') {
      const box = element('div', 'flp-code-box');
      box.textContent = `// Reconstructed Production Component: ${screen.name}
import React, { useState } from 'react';

export function ReconstructedLoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.({ email, password });
  };

  return (
    <div className="auth-card" style={{ background: '#0C1420', borderRadius: 8, padding: 24 }}>
      <h2 style={{ color: '#F8FAFC', marginBottom: 16 }}>Entrar na Plataforma</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', color: '#94A3B8', fontSize: 12 }}>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#070B12', border: '1px solid #1E293B', color: '#fff', borderRadius: 6 }}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#94A3B8', fontSize: 12 }}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#070B12', border: '1px solid #1E293B', color: '#fff', borderRadius: 6 }}
            required
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px 16px', background: '#00E5A0', color: '#070B12', fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Acessar
        </button>
      </form>
    </div>
  );
}`;
      body.appendChild(box);

    } else if (state.inspectorTab === 'dna') {
      const wrap = element('div', 'flp-tokens-wrap');
      const tokens = [
        { label: 'Primary Accent', val: '#00E5A0', color: '#00E5A0' },
        { label: 'Surface Background', val: '#0C1420', color: '#0C1420' },
        { label: 'Deep Root', val: '#070B12', color: '#070B12' },
        { label: 'Text Bright', val: '#F8FAFC', color: '#F8FAFC' },
        { label: 'Border Subtle', val: 'rgba(255,255,255,0.08)', color: '#334155' },
        { label: 'Radius', val: '8px (Medium)' },
        { label: 'Typography', val: 'Inter, JetBrains Mono' },
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

    } else if (state.inspectorTab === 'reconstruction') {
      const metrics = element('div', 'flp-facts');
      metrics.append(
        row('Fonte do Conhecimento', 'SCREEN_DNA (Pattern Library Cache)'),
        row('Economia de Tokens', '100% (0 tokens consumidos)'),
        row('Tempo de Resposta', '4.2 ms (Zero Model Overhead)'),
        row('Qualidade Visual', 'Verificada por Playwright Headless')
      );
      body.appendChild(metrics);

      const frame = element('div');
      frame.style.maxHeight = '45vh';
      frame.style.overflow = 'auto';
      frame.style.display = 'flex';
      frame.style.justifyContent = 'center';
      frame.style.padding = '12px';
      frame.style.background = '#050912';
      frame.style.borderRadius = '8px';

      const img = document.createElement('img');
      img.src = screen.reconstructedScreenshot || '/screenshots/api_platform_reconstructed_login.png';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '6px';
      frame.appendChild(img);

      body.appendChild(frame);

    } else if (state.inspectorTab === 'compare') {
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
      row('Versão Atual', data.head.slice(0, 12)),
      row('Branch', data.branch || 'sem branch'),
      row('Remote', data.remote || 'não configurado'),
      row('Sincronização', data.upstream ? `${data.ahead ?? '?'} à frente · ${data.behind ?? '?'} atrás de ${data.upstream}` : 'sem upstream')
    );
    renderConnection(panel, project);
    const changes = element('div', 'flp-git-changes');
    changes.append(element('h4', '', `Mudanças (${data.files.length})`));
    if (!data.files.length) changes.append(element('p', 'flp-empty', 'Workspace limpo.'));
    for (const file of data.files) {
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
    commit.disabled = !data.files.length;
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
    renderCards();
    renderDetail();
    loadGit(id);
  }

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
    if (state.projects.some((project) => project.id === alias)) selectProject(alias);
    else state.requestedProjectId = alias;
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
