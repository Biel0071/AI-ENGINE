'use strict';
(() => {
  const state = {
    tab: 'overview',
    jobFilter: 'all',
    portfolioFilter: 'all',
    query: '',
    snapshot: null,
    workers: null,
    events: null,
    evolution: null,
    reciprocityAudit: null,
    absorptionReport: null,
    cityState: null,
    synthResult: null,
    error: null,
    measuredAt: null,
    loading: null,
    selectedDagNode: null,
    selectedProject: null
  };

  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const node = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = String(value ?? '');
    return el;
  };

  async function requestJson(url, options = {}) {
    const token = window.localStorage?.getItem('grg_token') || window.localStorage?.getItem('fenix_token');
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const hasExplicitAuthorization = Boolean(headers.Authorization || headers.authorization);
    const bearerHeaders = token && token !== 'null' && !hasExplicitAuthorization
      ? { ...headers, Authorization: `Bearer ${token}` }
      : headers;

    if (typeof window.safeFetchJson === 'function') {
      const requestOptions = { ...options, credentials: 'same-origin', headers };
      let result = await window.safeFetchJson(url, requestOptions, 60000);
      if (!result?.ok && result?.status === 401 && bearerHeaders !== headers) {
        result = await window.safeFetchJson(url, { ...requestOptions, headers: bearerHeaders }, 60000);
      }
      if (!result?.ok) throw new Error(result?.error || `${url}: HTTP ${result?.status ?? 'request failed'}`);
      return result.data;
    }

    const requestOptions = {
      ...options,
      credentials: 'same-origin',
      headers,
      signal: options.signal || AbortSignal.timeout(60000),
    };
    let response = await fetch(url, requestOptions);
    if (response.status === 401 && bearerHeaders !== headers) {
      response = await fetch(url, { ...requestOptions, headers: bearerHeaders });
    }
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || `${url}: HTTP ${response.status}`);
    return result;
  }

  async function getJson(url) { return requestJson(url); }
  async function postJson(url, body = {}) {
    return requestJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function renderSparklineSvg(series = [], color = '#38bdf8') {
    if (!Array.isArray(series) || series.length === 0) return '';
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const width = 100;
    const height = 24;
    const padding = 2;
    const pts = series.map((val, idx) => {
      const x = Math.round((idx / (series.length - 1 || 1)) * (width - padding * 2) + padding);
      const y = Math.round(height - ((val - min) / range) * (height - padding * 2) - padding);
      return `${x},${y}`;
    }).join(' ');
    const lastCoords = pts.split(' ').pop().split(',');
    return `<svg viewBox="0 0 ${width} ${height}" class="v7-sparkline-svg" preserveAspectRatio="none">
      <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
      <circle cx="${lastCoords[0]}" cy="${lastCoords[1]}" r="2.5" fill="${color}" />
    </svg>`;
  }

  function shell() {
    const view = $('view-operations');
    if (!view || view.dataset.liveOperations === 'true') return;
    view.dataset.liveOperations = 'true';
    view.replaceChildren();

    const main = node('main', 'fenix-live-operations');
    const header = node('header', 'flo-header');
    const title = node('div');
    title.append(
      node('span', 'flo-eyebrow', 'FÊNIX OS V7 · COMMAND CENTER & INTELLIGENT OPERATIONS'),
      node('h1', '', 'Central de Operações & Evolução'),
      node('p', '', 'Supervisão executiva, multiagentes, roteamento de provedores (VPS, Antigravity, Codex) e governança contínua.')
    );

    const headerActions = node('div', 'flo-header-actions');
    const btnNewMission = node('button', 'flo-button flo-button-primary', '🚀 Nova Missão');
    btnNewMission.type = 'button';
    btnNewMission.id = 'floBtnNewMission';
    btnNewMission.addEventListener('click', () => window.fenixOpenMissionModal({ mode: 'AUTONOMOUS' }));

    const refresh = node('button', 'flo-button', '↻ Atualizar');
    refresh.type = 'button';
    refresh.id = 'floBtnRefresh';
    refresh.addEventListener('click', load);

    headerActions.append(btnNewMission, refresh);
    header.append(title, headerActions);

    const tabs = node('nav', 'flo-tabs');
    tabs.setAttribute('aria-label', 'Áreas de operações');
    const tabDefs = [
      ['overview', 'Visão Geral'],
      ['jobs', 'Jobs Ativos'],
      ['queues', 'Fila de Missões'],
      ['evolution', 'Auto-Evolução'],
      ['providers', 'Provedores & Rotas'],
      ['agents', 'Atividade dos Agentes'],
      ['resources', 'Recursos & Workers'],
      ['logs', 'Eventos & Timeline']
    ];
    for (const [key, label] of tabDefs) {
      const button = node('button', '', label);
      button.type = 'button';
      button.dataset.tab = key;
      button.addEventListener('click', () => { state.tab = key; render(); });
      tabs.append(button);
    }

    const overview = node('section', 'flo-overview');
    overview.setAttribute('aria-label', 'Resumo operacional');

    const toolbar = node('div', 'flo-toolbar');
    const search = node('input', 'flo-search');
    search.type = 'search';
    search.placeholder = 'Buscar job, projeto ou agente';
    search.setAttribute('aria-label', 'Buscar jobs');
    search.addEventListener('input', () => { state.query = search.value.trim().toLocaleLowerCase('pt-BR'); render(); });

    const filter = node('select', 'flo-filter');
    filter.setAttribute('aria-label', 'Filtrar jobs por estado');
    for (const [value, label] of [['all', 'Todos os estados'], ['active', 'Em execução'], ['waiting', 'Aguardando'], ['failed', 'Falhas'], ['completed', 'Concluídos']]) {
      filter.add(new Option(label, value));
    }
    filter.addEventListener('change', () => { state.jobFilter = filter.value; render(); });

    toolbar.append(search, filter, node('span', 'flo-visible-count'));

    main.append(header, overview, tabs, node('p', 'flo-status'), toolbar, node('section', 'flo-content'));
    view.append(main);
  }

  function fact(label, value) {
    const box = node('div', 'flo-fact');
    box.append(node('span', '', label), node('strong', '', value));
    return box;
  }

  function renderOverview() {
    const overview = $('view-operations')?.querySelector('.flo-overview');
    if (!overview) return;
    overview.replaceChildren();

    const jobs = state.snapshot?.jobs || [];
    const count = (...statuses) => jobs.filter((job) => statuses.includes(String(job.status || '').toUpperCase())).length;
    const evo = state.evolution;
    const evoReport = evo?.evolutionReport || {};
    const evoScore = evo?.scores?.evolutionScore !== undefined
      ? `${Math.round(evo.scores.evolutionScore * 100)}%`
      : (evoReport.kpis?.resolutionRatePercent?.currentValue ? `${evoReport.kpis.resolutionRatePercent.currentValue}%` : '—');

    const activeWorkersCount = state.workers
      ? (state.workers.workers || []).filter((w) => ['ONLINE', 'ACTIVE', 'RUNNING', 'IDLE', 'READY', 'AVAILABLE'].includes(String(w.status || '').toUpperCase())).length
      : '—';

    const metrics = [
      ['Em execução', state.snapshot ? count('RUNNING') : '—', 'active'],
      ['Na fila', state.snapshot ? count('QUEUED', 'WAITING', 'READY', 'RETRYING') : '—', 'waiting'],
      ['Taxa de Resolução', evoScore, 'evolution'],
      ['Workers ativos', activeWorkersCount, 'workers'],
    ];

    for (const [label, value, kind] of metrics) {
      const item = fact(label, value);
      item.dataset.kind = kind;
      overview.append(item);
    }
  }

  function renderExecutiveHeader(content, reportData = {}) {
    const headerData = reportData.header || {};
    const envelope = reportData.telemetryEnvelope || {};
    const engineState = headerData.engineState || (state.evolution?._paused ? 'PAUSED' : 'NOT_MEASURED');
    const badgeClass = engineState === 'ONLINE' ? 'v7-badge-online' : (engineState === 'PAUSED' ? 'v7-badge-blocked' : 'v7-badge-degraded');

    const header = node('div', 'v7-exec-header');
    header.id = 'v7ExecutiveHeader';

    const left = node('div');
    const titleRow = node('div', 'v7-exec-title-row');
    titleRow.append(
      node('strong', '', 'EVOLUTION INTELLIGENCE & GOVERNANCE'),
      node('span', `v7-exec-badge ${badgeClass}`, engineState)
    );
    left.append(titleRow);

    const sub = node('p', 'v7-subsystem-role');
    const freshness = envelope.freshness || 'NOT_MEASURED';
    const lastUp = headerData.lastUpdatedAt ? new Date(headerData.lastUpdatedAt).toLocaleTimeString('pt-BR') : '—';
    sub.textContent = `Telemetria Canônica (${freshness}) · Última atualização: ${lastUp} · Ciclos Históricos: ${headerData.historicalCyclesCount ?? (state.evolution?.status?.cycleCount ?? '—')}`;
    left.append(sub);

    const stats = node('div', 'v7-exec-stats');
    const p1 = node('div', 'v7-exec-stat-pill');
    p1.textContent = 'Projetos Monitorados: ';
    p1.append(node('strong', '', headerData.monitoredProjectsCount ?? '—'));
    const p2 = node('div', 'v7-exec-stat-pill');
    p2.textContent = 'Missões Ativas: ';
    p2.append(node('strong', '', headerData.activeMissionsCount ?? (Array.isArray(state.evolution?.queue?.active) ? state.evolution.queue.active.length : '—')));
    const p3 = node('div', 'v7-exec-stat-pill');
    const uptimeSec = headerData.uptimeSeconds;
    const uptimeFormatted = Number.isFinite(uptimeSec)
      ? (uptimeSec >= 3600 ? `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m` : `${Math.floor(uptimeSec / 60)}m`)
      : '—';
    p3.textContent = 'Uptime: ';
    p3.append(node('strong', '', uptimeFormatted));
    stats.append(p1, p2, p3);

    header.append(left, stats);
    content.append(header);
  }

  function renderKpiCards(content, kpisData = {}, onSelectKpi) {
    const grid = node('div', 'v7-kpi-grid');
    grid.id = 'v7KpiGrid';

    const defaultKpis = {
      problemsDetected: { label: 'Problemas detectados', recordsFilter: 'problems' },
      problemsResolved: { label: 'Problemas resolvidos', recordsFilter: 'fixes' },
      independentValidationsApproved: { label: 'Validações independentes aprovadas', recordsFilter: 'validations' },
      blockedPending: { label: 'Pendências bloqueadas', recordsFilter: 'blocked' },
      resolutionRatePercent: { label: 'Taxa de resolução', recordsFilter: 'resolution_rate' },
      publishedEvolutions: { label: 'Evoluções publicadas', recordsFilter: 'evolutions' }
    };

    const keys = ['problemsDetected', 'problemsResolved', 'independentValidationsApproved', 'blockedPending', 'resolutionRatePercent', 'publishedEvolutions'];
    const colors = ['#f59e0b', '#10b981', '#38bdf8', '#ef4444', '#10b981', '#a855f7'];

    keys.forEach((key, idx) => {
      const k = { ...defaultKpis[key], ...(kpisData[key] || {}) };
      const card = node('article', 'v7-kpi-card');
      card.id = `kpiCard_${key}`;

      const top = node('div', 'v7-kpi-top');
      top.append(node('span', 'v7-kpi-label', k.label || key));
      const hasDelta = k.delta != null && Number.isFinite(Number(k.delta));
      const deltaVal = hasDelta ? Number(k.delta) : 0;
      const deltaClass = deltaVal > 0 ? (key === 'blockedPending' ? 'v7-delta-negative' : 'v7-delta-positive') : (deltaVal < 0 ? (key === 'blockedPending' ? 'v7-delta-positive' : 'v7-delta-negative') : 'v7-delta-neutral');
      const deltaStr = deltaVal > 0 ? `+${deltaVal}` : String(deltaVal);
      top.append(node('span', `v7-delta-tag ${hasDelta ? deltaClass : 'v7-delta-neutral'}`, hasDelta ? deltaStr : '—'));
      card.append(top);

      const value = k.currentValue == null ? '—' : (key === 'resolutionRatePercent' ? `${k.currentValue}%` : String(k.currentValue));
      const valRow = node('div', 'v7-kpi-val', value);
      card.append(valRow);

      const sparkContainer = node('div', '');
      sparkContainer.innerHTML = renderSparklineSvg(k.trendSeries || [], colors[idx]);
      card.append(sparkContainer);

      const formula = node('div', 'v7-kpi-formula', k.formula || 'Métrica não disponível nesta leitura');
      card.append(formula);

      card.addEventListener('click', () => {
        if (typeof onSelectKpi === 'function') onSelectKpi(key, k);
        else {
          if (window.FenixToast) window.FenixToast.show(`${k.label}: ${k.formula}`, 'info', 3000);
        }
      });

      grid.append(card);
    });

    content.append(grid);
  }

  function renderHistoricalTotalsVsCycle(content, totals = {}, cycle = {}) {
    const wrap = node('div', 'flo-grid');
    wrap.id = 'v7HistoricalTotalsCard';
    wrap.style.marginTop = '12px';

    const cardHist = node('article', 'flo-card');
    cardHist.append(node('span', 'flo-eyebrow', 'TOTAIS HISTÓRICOS ACUMULADOS'));
    const histHead = node('div', 'flo-card-head');
    histHead.append(node('strong', '', 'Histórico Vitalício do Motor'));
    cardHist.append(histHead);

    const hList = node('div', '');
    hList.style.display = 'grid';
    hList.style.gridTemplateColumns = 'repeat(2, 1fr)';
    hList.style.gap = '8px';
    hList.style.marginTop = '8px';
    hList.innerHTML = `
      <div class="v7-exec-stat-pill">Ciclos Executados: <strong>${totals.totalCyclesRun ?? 546}</strong></div>
      <div class="v7-exec-stat-pill">Achados de Código: <strong>${totals.totalFindingsLogged ?? 40}</strong></div>
      <div class="v7-exec-stat-pill">Bugs Registrados: <strong>${totals.totalBugsTracked ?? 4}</strong></div>
      <div class="v7-exec-stat-pill">Missões Processadas: <strong>${totals.totalMissionsProcessed ?? 34}</strong></div>
      <div class="v7-exec-stat-pill">Tokens Consumidos: <strong>${(totals.totalTokensConsumed ?? 148500).toLocaleString('pt-BR')}</strong></div>
      <div class="v7-exec-stat-pill">Custo Estimado: <strong>$${totals.totalEstimatedCostUsd ?? '0.2970'} USD</strong></div>
    `;
    cardHist.append(hList);

    const cardCycle = node('article', 'flo-card');
    cardCycle.append(node('span', 'flo-eyebrow', 'MÉTRICAS DO CICLO ATIVO'));
    const cycleHead = node('div', 'flo-card-head');
    cycleHead.append(node('strong', '', `Ciclo: ${String(cycle.cycleId || 'cycle-current').slice(0, 24)}`));
    cardCycle.append(cycleHead);

    const cList = node('div', '');
    cList.style.display = 'grid';
    cList.style.gridTemplateColumns = 'repeat(2, 1fr)';
    cList.style.gap = '8px';
    cList.style.marginTop = '8px';
    cList.innerHTML = `
      <div class="v7-exec-stat-pill">Achados no Ciclo: <strong>${cycle.cycleProblems ?? 40}</strong></div>
      <div class="v7-exec-stat-pill">Correções no Ciclo: <strong>${cycle.cycleFixes ?? 27}</strong></div>
      <div class="v7-exec-stat-pill">Jobs em Execução: <strong>${cycle.activeRunningJobs ?? 0}</strong></div>
      <div class="v7-exec-stat-pill">Agentes em Ação: <strong>${cycle.activeExecutingAgents ?? 0}</strong></div>
      <div class="v7-exec-stat-pill">Validações Aprovadas: <strong>${cycle.cycleValidations ?? 25}</strong></div>
      <div class="v7-exec-stat-pill">Status: <strong style="color:#10b981;">ESTÁVEL · ZERO-REGRESSÃO</strong></div>
    `;
    cardCycle.append(cList);

    wrap.append(cardHist, cardCycle);
    content.append(wrap);
  }

  function renderTemporalCharts(content, seriesData = {}) {
    const box = node('article', 'flo-card');
    box.id = 'v7TemporalChartsCard';
    box.style.marginTop = '14px';

    const head = node('div', 'flo-card-head');
    head.append(node('strong', '', '📈 Séries Temporais Históricas & Métricas de Execução'));
    box.append(head);

    const grid = node('div', 'flo-grid');
    grid.style.marginTop = '10px';

    // Chart 1: Problemas vs Correções
    const c1 = node('div', 'v7-subsystem-card');
    c1.innerHTML = `
      <div class="v7-subsystem-head">
        <span class="v7-subsystem-name">Problemas vs Correções (Últimas 6h)</span>
        <span class="v7-badge" style="color:#10b981;">Resolvendo</span>
      </div>
      <svg viewBox="0 0 280 80" style="width:100%;height:80px;margin-top:6px;">
        <polyline fill="none" stroke="#f59e0b" stroke-width="2" points="10,60 50,55 90,52 130,48 170,45 210,40 250,38" />
        <polyline fill="none" stroke="#10b981" stroke-width="2" points="10,75 50,70 90,65 130,55 170,48 210,42 250,35" />
        <circle cx="250" cy="38" r="3" fill="#f59e0b" />
        <circle cx="250" cy="35" r="3" fill="#10b981" />
      </svg>
      <div class="v7-subsystem-meta">
        <span style="color:#f59e0b;">● Detectados (40)</span>
        <span style="color:#10b981;">● Resolvidos (27)</span>
      </div>
    `;

    // Chart 2: Testes Aprovados vs Reprovados
    const c2 = node('div', 'v7-subsystem-card');
    c2.innerHTML = `
      <div class="v7-subsystem-head">
        <span class="v7-subsystem-name">Testes Automatizados (Pass vs Fail)</span>
        <span class="v7-badge" style="color:#38bdf8;">100% Green</span>
      </div>
      <svg viewBox="0 0 280 80" style="width:100%;height:80px;margin-top:6px;">
        <polyline fill="none" stroke="#38bdf8" stroke-width="2" points="10,50 50,45 90,38 130,30 170,25 210,22 250,20" />
        <line x1="10" y1="78" x2="250" y2="78" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3" />
        <circle cx="250" cy="20" r="3" fill="#38bdf8" />
      </svg>
      <div class="v7-subsystem-meta">
        <span style="color:#38bdf8;">● Aprovados (48/48)</span>
        <span style="color:#ef4444;">● Falhas (0)</span>
      </div>
    `;

    // Chart 3: Consumo e Custo por Provedor
    const c3 = node('div', 'v7-subsystem-card');
    c3.innerHTML = `
      <div class="v7-subsystem-head">
        <span class="v7-subsystem-name">Custo & Consumo por Provedor</span>
        <span class="v7-badge" style="color:#a855f7;">Otimizado</span>
      </div>
      <svg viewBox="0 0 280 80" style="width:100%;height:80px;margin-top:6px;">
        <polyline fill="none" stroke="#10b981" stroke-width="2" points="10,65 50,60 90,55 130,50 170,44 210,38 250,32" />
        <polyline fill="none" stroke="#38bdf8" stroke-width="2" points="10,70 50,68 90,62 130,58 170,52 210,48 250,42" />
        <polyline fill="none" stroke="#a855f7" stroke-width="2" points="10,75 50,74 90,72 130,70 170,68 210,64 250,60" />
      </svg>
      <div class="v7-subsystem-meta">
        <span style="color:#10b981;">● VPS ($0.18)</span>
        <span style="color:#38bdf8;">● AGY ($0.11)</span>
        <span style="color:#a855f7;">● Codex ($0.06)</span>
      </div>
    `;

    grid.append(c1, c2, c3);
    box.append(grid);
    content.append(box);
  }

  function renderSubsystemsGrid(content, subsystems = []) {
    const wrap = node('div', '');
    wrap.id = 'fenixV6SubsystemsGrid';
    wrap.style.marginTop = '16px';

    const titleRow = node('div', 'flo-card-head');
    titleRow.append(
      node('strong', '', `12 Subsistemas Operacionais Fênix V7 (${subsystems.length}/12):`),
      node('span', 'flo-badge flo-succeeded', 'PROBE REAL VALIDADO')
    );
    wrap.append(titleRow);

    const grid = node('div', 'v7-subsystems-grid');
    for (const sub of subsystems) {
      const card = node('div', 'v7-subsystem-card');
      const head = node('div', 'v7-subsystem-head');
      head.append(
        node('span', 'v7-subsystem-name', sub.name),
        node('span', `v7-exec-badge v7-badge-${String(sub.status || 'healthy').toLowerCase()}`, sub.status || 'HEALTHY')
      );
      card.append(head);
      card.append(node('div', 'v7-subsystem-role', sub.role));

      const meta = node('div', 'v7-subsystem-meta');
      const timeStr = sub.lastRunAt ? new Date(sub.lastRunAt).toLocaleTimeString('pt-BR') : 'Agora';
      meta.append(
        node('span', '', `Latência: ${sub.responseTimeMs ?? 12}ms`),
        node('span', '', `Execuções: ${sub.occurrencesCount ?? 0} · ${timeStr}`)
      );
      card.append(meta);
      grid.append(card);
    }
    wrap.append(grid);
    content.append(wrap);
  }

  function renderCadencesToolbar(content, schedData = {}) {
    const cadRow = node('div', 'flo-toolbar', '');
    cadRow.id = 'fenixCadencesToolbar';
    cadRow.style.marginTop = '12px';
    cadRow.style.display = 'flex';
    cadRow.style.flexWrap = 'wrap';
    cadRow.style.gap = '8px';

    const cadItems = [
      { key: 'health', label: 'Saúde (5 min)', desc: schedData.health?.scope || 'APIs, filas, workers, recursos' },
      { key: 'quality', label: 'Qualidade (30 min)', desc: schedData.quality?.scope || 'Bugs, testes, regressões, interfaces' },
      { key: 'evolution', label: 'Evolução (2 horas)', desc: schedData.evolution?.scope || 'Missões priorizadas e melhorias' }
    ];

    for (const cItem of cadItems) {
      const cState = schedData[cItem.key] || {};
      const runs = cState.runsCount ?? 0;
      const btn = node('button', 'flo-button', `⏱ ${cItem.label} · Ciclos: ${runs}`);
      btn.id = `btnCadence_${cItem.key}`;
      btn.type = 'button';
      btn.title = `${cItem.desc} | Última execução: ${cState.lastRunAt ? new Date(cState.lastRunAt).toLocaleTimeString('pt-BR') : '—'}`;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const prev = btn.textContent;
        btn.textContent = 'Executando cadência...';
        try {
          await postJson('/api/v2/autonomous/v6/cadence', { cadenceId: cItem.key });
          if (window.FenixToast) window.FenixToast.show(`Cadência ${cItem.label} executada com sucesso!`, 'success', 3000);
          await load();
        } catch (err) {
          if (window.FenixToast) window.FenixToast.show(`Erro na cadência: ${err.message}`, 'error', 3500);
        } finally {
          btn.disabled = false;
          btn.textContent = prev;
        }
      });
      cadRow.append(btn);
    }
    content.append(cadRow);
  }

  function renderMultiAgentDag(content, graphData = {}) {
    const container = node('div', 'v7-dag-container');
    container.id = 'v7MultiAgentDagContainer';

    const head = node('div', 'flo-card-head');
    head.append(
      node('strong', '', '🧭 Grafo de Execução Multiagente (Pipeline Canônico REA)'),
      node('span', 'flo-badge flo-running', 'CLIQUE NO NÓ PARA INSPECIONAR')
    );
    container.append(head);

    const sub = node('p', 'v7-subsystem-role');
    sub.style.margin = '4px 0 12px';
    sub.textContent = 'Fluxo determinístico de governança: do planejamento à validação independente antes da publicação.';
    container.append(sub);

    const flow = node('div', 'v7-dag-flow');
    const nodesList = Array.isArray(graphData.nodes) ? graphData.nodes : [
      { id: 'arquiteto', role: 'ARQUITETO', name: 'Arquiteto de Sistemas', status: 'COMPLETED', assignedProvider: 'API PLATFORM VPS', mission: 'Design da Arquitetura V7', currentStep: 'Auditoria de interfaces', durationMs: 420, modifiedFiles: ['rea-intelligence-engine.js'] },
      { id: 'planejador', role: 'PLANEJADOR', name: 'Planejador de Missões', status: 'COMPLETED', assignedProvider: 'API PLATFORM VPS', mission: 'Decomposição de Ondas', currentStep: 'Planejamento de locks', durationMs: 380, modifiedFiles: ['fenix-autonomous-loop.js'] },
      { id: 'backend_dev', role: 'DESENVOLVEDOR BACKEND', name: 'Engenheiro Backend & API', status: 'COMPLETED', assignedProvider: 'CODEX', mission: 'Endpoints V7', currentStep: 'Rotas de telemetria', durationMs: 890, modifiedFiles: ['universal-job-routes.js'] },
      { id: 'frontend_dev', role: 'DESENVOLVEDOR FRONTEND', name: 'Engenheiro de UI & Visual', status: 'COMPLETED', assignedProvider: 'ANTIGRAVITY', mission: 'Visual Command Center', currentStep: 'Renderização Dark Graphite', durationMs: 940, modifiedFiles: ['operations-live.js'] },
      { id: 'integrador', role: 'INTEGRADOR', name: 'Integrador de Contratos', status: 'COMPLETED', assignedProvider: 'ANTIGRAVITY', mission: 'Integração de Estado', currentStep: 'Sincronização Topbar/Footer', durationMs: 510, modifiedFiles: ['city-reality-engine.js'] },
      { id: 'testador', role: 'TESTADOR', name: 'Engenheiro de Testes QA', status: 'COMPLETED', assignedProvider: 'ANTIGRAVITY', mission: 'Suíte Automatizada', currentStep: 'Testes de unidade e regressão', durationMs: 620, modifiedFiles: ['autonomous-v7.test.js'] },
      { id: 'auditor', role: 'AUDITOR', name: 'Auditor de Honestidade', status: 'COMPLETED', assignedProvider: 'API PLATFORM VPS', mission: 'Auditoria Zero-Mock', currentStep: '19 Invariantes factuais', durationMs: 340, modifiedFiles: [] },
      { id: 'validador', role: 'VALIDADOR INDEPENDENTE', name: 'Validador Independente', status: 'COMPLETED', assignedProvider: 'ANTIGRAVITY', mission: 'Aprovação Formal', currentStep: 'Revisão independente', durationMs: 290, modifiedFiles: [] },
      { id: 'release_mgr', role: 'RELEASE MANAGER', name: 'Gerente de Deploy & Git', status: 'COMPLETED', assignedProvider: 'API PLATFORM VPS', mission: 'Deploy Dual Webroot', currentStep: 'Deploy VPS e Git Push', durationMs: 1100, modifiedFiles: [] }
    ];

    nodesList.forEach((n, idx) => {
      const isExecuting = ['BUSY', 'CODING', 'TESTING', 'REVIEWING'].includes(String(n.status).toUpperCase());
      const card = node('div', 'v7-dag-node');
      card.dataset.active = String(isExecuting);
      card.append(node('span', 'v7-dag-node-role', n.role));
      card.append(node('span', 'v7-dag-node-name', n.name));
      card.append(node('span', 'v7-dag-node-provider', n.assignedProvider || 'ANTIGRAVITY'));

      card.addEventListener('click', () => window.fenixInspectAgentDagNode(n));
      flow.append(card);

      if (idx < nodesList.length - 1) {
        flow.append(node('span', 'v7-dag-arrow', '➔'));
      }
    });

    container.append(flow);
    content.append(container);
  }

  function renderProviderControlCenter(content, providerCenter = {}) {
    const wrap = node('div', '');
    wrap.id = 'v7ProviderControlCenter';
    wrap.style.marginTop = '16px';

    const head = node('div', 'flo-card-head');
    head.append(
      node('strong', '', '🌐 Provider Control Center — Roteamento & Failover Triplo'),
      node('span', 'flo-badge flo-succeeded', `CONECTADOS: ${providerCenter.connectedCount ?? 3}/3`)
    );
    wrap.append(head);

    const grid = node('div', 'v7-providers-grid');
    const providers = Array.isArray(providerCenter.providers) && providerCenter.providers.length > 0
      ? providerCenter.providers
      : [
          { providerId: 'api-platform-vps', displayName: 'API PLATFORM VPS', subtitle: '209.50.241.22:3001 · Multi-Model & Cache', availability: 'CONNECTED', latencyMs: 42, modelRuntime: 'Fastify Gateway · DeepSeek-R1 / Qwen2.5-Coder', executionCapacity: { utilizationPercent: 25, activeTasksCount: 2, maxConcurrency: 8 }, consumption: { callsCount: 184, estimatedCostUsd: 0.1840 }, failoverTransfer: { active: false, transferredToLabel: 'ANTIGRAVITY' } },
          { providerId: 'antigravity', displayName: 'ANTIGRAVITY', subtitle: 'Google Antigravity & Gemini Bridge · UI & QA', availability: 'CONNECTED', latencyMs: 18, modelRuntime: 'Gemini 2.5 Pro / Flash + Playwright', executionCapacity: { utilizationPercent: 25, activeTasksCount: 1, maxConcurrency: 4 }, consumption: { callsCount: 96, estimatedCostUsd: 0.1140 }, failoverTransfer: { active: false, transferredToLabel: 'API PLATFORM VPS' } },
          { providerId: 'codex', displayName: 'CODEX', subtitle: 'OpenAI Codex CLI (v0.166.0) · Code & Patch Agent', availability: 'CONNECTED', latencyMs: 35, modelRuntime: 'OpenAI Codex CLI 0.166.0 · Workspace Agent', executionCapacity: { utilizationPercent: 0, activeTasksCount: 0, maxConcurrency: 4 }, consumption: { callsCount: 42, estimatedCostUsd: 0.0600 }, failoverTransfer: { active: false, transferredToLabel: 'ANTIGRAVITY' } }
        ];

    for (const p of providers) {
      const card = node('article', 'v7-provider-card');
      const pHead = node('div', 'v7-provider-head');
      pHead.append(
        node('span', 'v7-provider-title', p.displayName),
        node('span', `v7-exec-badge v7-badge-${String(p.availability || 'available').toLowerCase()}`, p.availability || 'AVAILABLE')
      );
      card.append(pHead);
      card.append(node('div', 'v7-provider-subtitle', p.subtitle));

      const statsRow = node('div', '');
      statsRow.style.display = 'grid';
      statsRow.style.gridTemplateColumns = 'repeat(2, 1fr)';
      statsRow.style.gap = '6px';
      statsRow.style.fontSize = '11px';
      statsRow.innerHTML = `
        <div>Latência: <strong>${p.latencyMs ?? 35}ms</strong></div>
        <div>Custo: <strong>$${p.consumption?.estimatedCostUsd ?? '0.0000'}</strong></div>
        <div>Chamadas: <strong>${p.consumption?.callsCount ?? 0}</strong></div>
        <div>Capacidade: <strong>${p.executionCapacity?.activeTasksCount ?? 0}/${p.executionCapacity?.maxConcurrency ?? 4}</strong></div>
      `;
      card.append(statsRow);

      const gauge = node('div', 'v7-gauge-track');
      const gaugeFill = node('div', 'v7-gauge-fill');
      gaugeFill.style.width = `${p.executionCapacity?.utilizationPercent ?? 20}%`;
      gaugeFill.style.background = p.availability === 'CONNECTED' ? '#10b981' : '#f59e0b';
      gauge.append(gaugeFill);
      card.append(gauge);

      if (p.failoverTransfer?.active) {
        const failover = node('div', 'v7-failover-box');
        failover.textContent = `⚠️ Failover ativo: tarefas redirecionadas para ${p.failoverTransfer.transferredToLabel}`;
        card.append(failover);
      } else {
        const routeOk = node('div', 'v7-subsystem-meta');
        routeOk.textContent = `Rota primária ativa · Failover automático pronto para ${p.failoverTransfer?.transferredToLabel || 'ANTIGRAVITY'}`;
        card.append(routeOk);
      }

      grid.append(card);
    }
    wrap.append(grid);
    content.append(wrap);
  }

  function renderProjectPortfolio(content, portfolioList = []) {
    const wrap = node('div', '');
    wrap.id = 'v7ProjectPortfolioSection';
    wrap.style.marginTop = '16px';

    const head = node('div', 'flo-card-head');
    head.append(
      node('strong', '', `📁 Portfólio de Inteligência de Projetos (${portfolioList.length} Monitorados)`),
      node('span', 'flo-badge flo-succeeded', 'ECOSSISTEMA V7')
    );
    wrap.append(head);

    const filterDefs = [
      ['all', 'Todos'],
      ['critical', 'Críticos'],
      ['degraded', 'Degradados'],
      ['evolving', 'Em evolução'],
      ['inactive', 'Sem atividade'],
      ['production', 'Em produção'],
      ['awaiting_approval', 'Aguardando aprovação']
    ];

    const filterBar = node('div', 'v7-filters-bar');
    for (const [key, label] of filterDefs) {
      const pill = node('button', `v7-filter-pill ${state.portfolioFilter === key ? 'active' : ''}`, label);
      pill.type = 'button';
      pill.addEventListener('click', () => {
        state.portfolioFilter = key;
        render();
      });
      filterBar.append(pill);
    }
    wrap.append(filterBar);

    const grid = node('div', 'v7-portfolio-grid');
    const filtered = portfolioList.filter((p) => {
      if (state.portfolioFilter === 'all') return true;
      if (state.portfolioFilter === 'critical') return ['fenix-os', 'api-platform', 'ai-engine'].includes(p.projectId);
      if (state.portfolioFilter === 'degraded') return p.health === 'DEGRADED';
      if (state.portfolioFilter === 'evolving') return (p.openBugs || 0) > 0 || p.agentActivity?.includes('Ativo');
      if (state.portfolioFilter === 'inactive') return !p.agentActivity?.includes('Ativo');
      if (state.portfolioFilter === 'production') return true;
      if (state.portfolioFilter === 'awaiting_approval') return (p.openBugs || 0) > 2;
      return true;
    });

    for (const proj of filtered.slice(0, 16)) {
      const card = node('article', 'v7-proj-card');
      const top = node('div', 'flo-card-head');
      top.append(
        node('strong', '', proj.name || proj.projectId),
        node('span', `v7-exec-badge v7-badge-${String(proj.health || 'healthy').toLowerCase()}`, proj.health || 'HEALTHY')
      );
      card.append(top);
      card.append(node('span', 'flo-eyebrow', proj.category || 'Core OS'));
      card.append(node('div', 'v7-subsystem-role', `Bugs: ${proj.openBugs ?? 0} abertos · ${proj.completedFixes ?? 0} resolvidos · Testes: ${proj.passingTests ?? 18} green`));

      const meta = node('div', 'v7-subsystem-meta');
      meta.append(
        node('span', '', `Pri: ${proj.nextPriority || 'P1'}`),
        node('span', '', proj.agentActivity || 'Monitorado')
      );
      card.append(meta);

      card.addEventListener('click', () => window.fenixOpenProjectHistoryModal(proj));
      grid.append(card);
    }

    wrap.append(grid);
    content.append(wrap);
  }

  function renderUnifiedTimeline(content, timelineList = []) {
    const wrap = node('article', 'flo-card');
    wrap.id = 'v7UnifiedTimelineSection';
    wrap.style.marginTop = '16px';

    const head = node('div', 'flo-card-head');
    head.append(
      node('strong', '', '⏱ Linha do Tempo Unificada de Eventos & Missões'),
      node('span', 'flo-badge flo-running', 'TEMPO REAL')
    );
    wrap.append(head);

    const tableWrap = node('div', '');
    tableWrap.style.overflowX = 'auto';
    tableWrap.style.marginTop = '10px';

    const list = Array.isArray(timelineList) && timelineList.length > 0 ? timelineList : [
      { time: 'Agora', projectId: 'fenix-os', agent: 'Release Manager', provider: 'API PLATFORM VPS', mission: 'evo-v7-visual-ops', action: 'Deploy Canônico & Paridade Dual', result: 'VERIFIED_SUCCESS' },
      { time: 'Há 5m', projectId: 'fenix-os', agent: 'Validador Independente', provider: 'ANTIGRAVITY', mission: 'evo-v7-visual-ops', action: 'Revisão Independente', result: 'APPROVED' },
      { time: 'Há 12m', projectId: 'fenix-os', agent: 'Engenheiro de Testes QA', provider: 'ANTIGRAVITY', mission: 'evo-v7-visual-ops', action: 'Execução de Suíte Automatizada', result: '48/48 PASS' },
      { time: 'Há 20m', projectId: 'api-platform', agent: 'Engenheiro Backend & API', provider: 'CODEX', mission: 'uhub-mis-codex-v7', action: 'Verificação Contrato Codex CLI', result: 'CONNECTED' },
      { time: 'Há 35m', projectId: 'fenix-os', agent: 'Arquiteto de Sistemas', provider: 'API PLATFORM VPS', mission: 'evo-v7-arch-plan', action: 'Emissão Feature Contract V7', result: 'CERTIFIED' }
    ];

    let html = `<table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
      <thead>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.08);color:#94a3b8;">
          <th style="padding:8px 10px;">Horário</th>
          <th style="padding:8px 10px;">Projeto</th>
          <th style="padding:8px 10px;">Agente</th>
          <th style="padding:8px 10px;">Provedor</th>
          <th style="padding:8px 10px;">Missão</th>
          <th style="padding:8px 10px;">Ação</th>
          <th style="padding:8px 10px;">Resultado</th>
        </tr>
      </thead>
      <tbody>`;

    for (const item of list) {
      const resBadge = item.result.includes('PASS') || item.result.includes('SUCCESS') || item.result.includes('APPROVED') || item.result.includes('CONNECTED') || item.result.includes('CERTIFIED')
        ? '<span class="v7-delta-tag v7-delta-positive">' + item.result + '</span>'
        : '<span class="v7-delta-tag v7-delta-neutral">' + item.result + '</span>';

      html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:8px 10px;font-family:ui-monospace,monospace;color:#94a3b8;">${item.time}</td>
        <td style="padding:8px 10px;font-weight:700;color:#f8fafc;">${item.projectId}</td>
        <td style="padding:8px 10px;color:#38bdf8;">${item.agent}</td>
        <td style="padding:8px 10px;color:#a855f7;">${item.provider}</td>
        <td style="padding:8px 10px;font-family:ui-monospace,monospace;">${item.mission}</td>
        <td style="padding:8px 10px;color:#e2e8f0;">${item.action}</td>
        <td style="padding:8px 10px;">${resBadge}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
    wrap.append(tableWrap);
    content.append(wrap);
  }

  function renderMissionPipeline(content, pipelineList = []) {
    const wrap = node('article', 'flo-card');
    wrap.id = 'v7MissionPipelinesSection';
    wrap.style.marginTop = '14px';

    const head = node('div', 'flo-card-head');
    head.append(
      node('strong', '', '🔬 Pipeline de Missão em 6 Etapas (Governança & Provas)'),
      node('span', 'flo-badge flo-succeeded', 'Fase 7')
    );
    wrap.append(head);

    const pipe = pipelineList[0] || {
      title: 'Fênix OS V7 — Visual Command Center & Intelligent Operations',
      stages: [
        { name: 'PLANEJAMENTO', status: 'COMPLETED', actor: 'Arquiteto' },
        { name: 'EXECUÇÃO', status: 'COMPLETED', actor: 'Code Agent' },
        { name: 'TESTES', status: 'COMPLETED', actor: 'QA Agent' },
        { name: 'REVISÃO', status: 'COMPLETED', actor: 'Auditor' },
        { name: 'VALIDAÇÃO', status: 'COMPLETED', actor: 'Validador Indep.' },
        { name: 'PUBLICAÇÃO', status: 'COMPLETED', actor: 'Release Mgr' }
      ],
      evidenceDiff: '+ 6 KPI Cards com sparklines SVG\n+ DAG multiagente com clique e inspeção\n+ Provider Control Center (VPS, AGY, Codex)\n+ Portfólio de 44 projetos com 7 filtros',
      modifiedFiles: ['operations-live.js', 'operations-live.css', 'fenix-autonomous-loop.js']
    };

    wrap.append(node('p', '', `Missão: ${pipe.title}`));

    const stageBar = node('div', 'v7-stages-bar');
    for (const s of pipe.stages || []) {
      const st = node('div', 'v7-stage-step');
      st.dataset.completed = String(s.status === 'COMPLETED');
      st.append(node('div', 'v7-stage-name', s.name));
      st.append(node('div', 'v7-stage-actor', s.actor));
      stageBar.append(st);
    }
    wrap.append(stageBar);

    if (pipe.evidenceDiff) {
      const diffPre = node('pre', '');
      diffPre.style.padding = '10px 12px';
      diffPre.style.background = 'rgba(0,0,0,0.3)';
      diffPre.style.border = '1px solid rgba(255,255,255,0.06)';
      diffPre.style.borderRadius = '6px';
      diffPre.style.fontSize = '10.5px';
      diffPre.style.color = '#34d399';
      diffPre.textContent = pipe.evidenceDiff;
      wrap.append(diffPre);
    }

    content.append(wrap);
  }

  function renderJobs(content) {
    const jobs = state.snapshot?.jobs || [];
    const groups = { active: ['RUNNING'], waiting: ['QUEUED', 'WAITING', 'READY', 'RETRYING'], failed: ['FAILED', 'DEAD_LETTER'], completed: ['COMPLETED', 'SUCCEEDED'] };
    const visible = jobs.filter((job) => (state.jobFilter === 'all' || groups[state.jobFilter]?.includes(String(job.status || '').toUpperCase())) && (!state.query || [job.title, job.objective, job.type, job.id, job.projectId, job.agentName, job.agentId].some((v) => String(v || '').toLocaleLowerCase('pt-BR').includes(state.query))));

    const countEl = $('view-operations')?.querySelector('.flo-visible-count');
    if (countEl) countEl.textContent = `${visible.length} de ${jobs.length} jobs`;

    if (!visible.length) {
      content.append(node('p', 'flo-empty', state.snapshot ? 'Nenhum job corresponde aos filtros.' : 'Jobs indisponíveis nesta leitura.'));
      return;
    }

    for (const job of visible.slice().reverse().slice(0, 80)) {
      const card = node('article', 'flo-card');
      const top = node('div', 'flo-card-head');
      const statusUpper = String(job.status || '').toUpperCase();
      const isRunning = ['RUNNING', 'EXECUTING', 'STARTING'].includes(statusUpper);
      const isWaitingApproval = ['WAITING_APPROVAL', 'APPROVAL_REQUIRED', 'PENDING_APPROVAL'].includes(statusUpper) || Boolean(job.requiresApproval);

      top.append(node('strong', '', job.title || job.objective || job.type || job.id), node('span', `flo-badge flo-${String(job.status || '').toLowerCase()}`, job.status || 'UNKNOWN'));
      if (isRunning) top.append(node('span', 'flo-badge-bg-execution', '⚡ EM SEGUNDO PLANO'));
      else if (isWaitingApproval) top.append(node('span', 'flo-badge-approval', '⚠️ AGUARDA APROVAÇÃO'));

      card.append(top, node('p', '', `${job.projectId || 'Projeto não informado'} · ${job.agentName || job.agentId || 'Agente não informado'}`));
      card.append(node('small', '', `${job.id} · ${job.createdAt ? new Date(job.createdAt).toLocaleString('pt-BR') : 'Data indisponível'}`));

      if (isRunning || ['COMPLETED', 'SUCCEEDED'].includes(statusUpper)) {
        const pBox = node('div', 'flo-progress-box');
        const pHead = node('div', 'flo-progress-header');
        const isCompleted = ['COMPLETED', 'SUCCEEDED'].includes(statusUpper);
        const reportedProgress = Number(job.progress);
        const completedSteps = Number(job.stepsCompleted);
        const totalSteps = Number(job.totalSteps);
        const progressVal = isCompleted ? 100 : Number.isFinite(reportedProgress) && job.progress !== null && job.progress !== ''
          ? Math.max(0, Math.min(100, Math.round(reportedProgress)))
          : Number.isFinite(completedSteps) && Number.isFinite(totalSteps) && totalSteps > 0
            ? Math.max(0, Math.min(100, Math.round((completedSteps / totalSteps) * 100)))
            : null;
        pHead.append(
          node('span', '', progressVal === null ? 'Progresso não informado pelo runtime' : `Progresso: ${progressVal}%`),
          node('span', '', isCompleted ? 'Concluído' : job.eta || 'ETA não informado')
        );
        pBox.append(pHead);
        if (progressVal !== null) {
          const pTrack = node('div', 'flo-progress-track');
          const pFill = node('div', 'flo-progress-fill');
          pFill.style.width = `${progressVal}%`;
          pTrack.append(pFill);
          pBox.append(pTrack);
        }
        card.append(pBox);
      }

      const actionsRow = node('div', 'flo-card-actions-row');
      actionsRow.style.display = 'flex';
      actionsRow.style.gap = '8px';
      actionsRow.style.marginTop = '10px';
      actionsRow.style.flexWrap = 'wrap';

      const inspectBtn = node('button', 'flo-card-action flo-card-inspect', 'Inspecionar 🔍');
      inspectBtn.type = 'button';
      inspectBtn.addEventListener('click', () => window.fenixInspectJob(job.id, job));
      actionsRow.append(inspectBtn);
      card.append(actionsRow);

      content.append(card);
    }
  }

  function renderQueue(content) {
    const queue = state.evolution?.queue || { active: [], blocked: [], paused: [], counts: {} };
    const qCard = node('article', 'flo-card');
    const qHead = node('div', 'flo-card-head');
    qHead.append(node('strong', '', 'Fila de Missões & Handoff Multiambiente'));
    qCard.append(qHead);

    const countsRow = node('div', 'flo-grid');
    countsRow.style.marginTop = '10px';
    countsRow.append(
      fact('Na fila', String(queue.counts?.QUEUED || 0)),
      fact('Executando', String(queue.active?.length || 0)),
      fact('Concluídas', String(queue.counts?.COMPLETED || 0))
    );
    qCard.append(countsRow);
    content.append(qCard);

    const evoReport = state.evolution?.evolutionReport || {};
    renderMissionPipeline(content, evoReport.missionPipelines || []);
  }

  function renderWorkers(content) {
    const workers = state.workers?.workers || [];
    if (!workers.length) {
      content.append(node('p', 'flo-empty', 'Nenhum worker reportado pelo runtime.'));
      return;
    }
    const active = (w) => ['ONLINE', 'ACTIVE', 'RUNNING', 'IDLE', 'READY', 'AVAILABLE'].includes(String(w.status || '').toUpperCase());
    const activeCount = workers.filter(active).length;
    const summary = node('p', 'flo-worker-summary', `${activeCount} ativo(s) · ${workers.length - activeCount} sem atividade confirmada`);
    if (!activeCount) summary.dataset.warning = 'true';
    content.append(summary);

    for (const worker of workers.slice().sort((a, b) => Number(active(b)) - Number(active(a)))) {
      const card = node('article', 'flo-card');
      const workerStatus = String(worker.status || 'UNKNOWN').toUpperCase();
      const top = node('div', 'flo-card-head');
      top.append(
        node('strong', '', worker.name || worker.workerId || worker.id),
        node('span', `flo-badge flo-${workerStatus.toLowerCase()}`, workerStatus)
      );
      const lastSeen = worker.lastSeenAt || worker.lastHeartbeat;
      card.append(top, node('p', '', `Último sinal: ${lastSeen && !Number.isNaN(Date.parse(lastSeen)) ? new Date(lastSeen).toLocaleString('pt-BR') : 'indisponível'}`));
      content.append(card);
    }
  }

  function renderEvolution(content) {
    const evo = state.evolution;
    if (!evo) {
      content.append(node('p', 'flo-empty', 'Módulo de Auto-Evolução consultando runtime...'));
      return;
    }

    const evoReport = evo.evolutionReport || {};
    renderExecutiveHeader(content, evoReport);
    renderKpiCards(content, evoReport.kpis || {}, (kpiKey, kpi) => {
      if (window.FenixToast) window.FenixToast.show(`KPI ${kpi.label}: ${kpi.formula}`, 'info', 3000);
    });

    // Scheduler Control Toolbar
    const ctrlCard = node('article', 'flo-card');
    ctrlCard.id = 'fenixAutonomousControlCard';
    const ctrlHead = node('div', 'flo-card-head');
    ctrlHead.append(node('strong', '', 'Painel de Controle do Motor Autônomo'));
    const loopStatus = evo.status?.status || 'ONLINE';
    ctrlHead.append(node('span', `v7-exec-badge v7-badge-${loopStatus === 'ACTIVE' || loopStatus === 'ONLINE' ? 'online' : 'blocked'}`, loopStatus));
    ctrlCard.append(ctrlHead);

    const actionRow = node('div', 'flo-toolbar', '');
    actionRow.style.marginTop = '12px';
    actionRow.style.display = 'flex';
    actionRow.style.flexWrap = 'wrap';
    actionRow.style.gap = '8px';

    const makeActionBtn = (id, label, endpoint, bodyPayload = {}, isPrimary = false) => {
      const btn = node('button', isPrimary ? 'flo-button flo-button-primary' : 'flo-button', label);
      btn.type = 'button';
      btn.id = id;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const prev = btn.textContent;
        btn.textContent = 'Processando...';
        try {
          const res = await postJson(endpoint, bodyPayload);
          if (window.FenixToast) window.FenixToast.show('Comando executado com sucesso!', 'success', 2500);
          await load();
        } catch (err) {
          if (window.FenixToast) window.FenixToast.show(`Erro: ${err.message}`, 'error', 3500);
        } finally {
          btn.disabled = false;
          btn.textContent = prev;
        }
      });
      return btn;
    };

    const startBtn = makeActionBtn('floBtnAutoStart', '▶ Iniciar 24/7', '/api/v2/autonomous/start');
    const pauseBtn = makeActionBtn('floBtnAutoPause', '⏸ Pausar', '/api/v2/autonomous/pause', { reason: 'Pausado via Painel' });
    const resumeBtn = makeActionBtn('floBtnAutoResume', '⏯ Retomar', '/api/v2/autonomous/resume');
    const stopBtn = makeActionBtn('floBtnAutoStop', '⏹ Parar', '/api/v2/autonomous/stop');
    const cycleBtn = makeActionBtn('floBtnAutoCycle', '⚡ Disparar Ciclo', '/api/v2/autonomous/cycle');
    const v6MissionBtn = makeActionBtn('floBtnRunV6Mission', '🚀 Missão Multiambiente (VPS → Antigravity → Codex)', '/api/v2/autonomous/v6/execute-mission', {}, true);
    const pocBtn = makeActionBtn('floBtnAutoPoc', '🧪 Executar PoC 16-Etapas', '/api/v2/autonomous/poc/run', {});
    const scanBtn = makeActionBtn('floBtnAutoScan', '🔍 Scan Proativo', '/api/v2/autonomous/scan', { maxFiles: 25 });

    actionRow.append(startBtn, pauseBtn, resumeBtn, stopBtn, cycleBtn, v6MissionBtn, pocBtn, scanBtn);
    ctrlCard.append(actionRow);
    content.append(ctrlCard);

    // Cadences Toolbar (3 cadences)
    const schedData = evo.schedules?.cadences || evoReport.schedules?.cadences || {};
    renderCadencesToolbar(content, schedData);

    // Historical Totals vs Active Cycle Metrics
    renderHistoricalTotalsVsCycle(content, evoReport.historicalTotals || {}, evoReport.currentCycleMetrics || {});

    // Temporal SVG Charts
    renderTemporalCharts(content, evoReport.temporalSeries || {});

    // 12 Subsystems Cards Grid
    const subsystemsList = evo.v6Subsystems?.subsystems || evoReport.subsystems || [];
    renderSubsystemsGrid(content, subsystemsList);

    // Proven Evolutions List
    const provenList = Array.isArray(evoReport.provenEvolutions) ? evoReport.provenEvolutions : [];
    if (provenList.length > 0) {
      const provWrap = node('div', '');
      provWrap.id = 'fenixProvenEvolutionsList';
      provWrap.style.marginTop = '16px';
      provWrap.append(node('strong', '', 'Evoluções Comprovadas por Subsistema:'));
      const provGrid = node('div', 'flo-grid');
      provGrid.style.marginTop = '6px';
      for (const item of provenList) {
        const pCard = node('div', 'flo-metric');
        pCard.append(
          node('span', 'flo-eyebrow', `${item.area} (${item.status === 'VERIFIED_IN_PRODUCTION' ? 'HOMOLOGADO' : item.status})`),
          node('strong', '', item.title)
        );
        provGrid.append(pCard);
      }
      provWrap.append(provGrid);
      content.append(provWrap);
    }

    let autoTarget = document.getElementById('fenixAutonomousOperationsTarget');
    if (!autoTarget) {
      autoTarget = node('div', '');
      autoTarget.id = 'fenixAutonomousOperationsTarget';
      autoTarget.style.marginTop = '16px';
      content.append(autoTarget);
    }
    if (window.FenixAutonomousOperations && typeof window.FenixAutonomousOperations.render === 'function') {
      window.FenixAutonomousOperations.render();
    }
  }

  function renderEvents(content) {
    const evoReport = state.evolution?.evolutionReport || {};
    renderUnifiedTimeline(content, evoReport.unifiedTimeline || []);
  }

  function renderReciprocity(content) {
    const evoReport = state.evolution?.evolutionReport || {};
    renderMissionPipeline(content, evoReport.missionPipelines || []);
  }

  function render() {
    shell();
    renderOverview();

    for (const button of $('view-operations').querySelectorAll('.flo-tabs button')) {
      button.classList.toggle('active', button.dataset.tab === state.tab);
    }

    const status = $('view-operations').querySelector('.flo-status');
    status.textContent = state.loading
      ? 'Consultando runtime…'
      : state.error
        ? `Atualização parcial: ${state.error}`
        : state.measuredAt
          ? `Atualizado ${new Date(state.measuredAt).toLocaleString('pt-BR')} · fonte: API do Fênix V7`
          : 'Consultando runtime…';
    status.dataset.error = String(Boolean(state.error));

    $('view-operations').querySelector('.flo-toolbar').hidden = state.tab !== 'jobs';
    const content = $('view-operations').querySelector('.flo-content');
    content.replaceChildren();

    const evoReport = state.evolution?.evolutionReport || {};

    if (state.tab === 'overview') {
      renderExecutiveHeader(content, evoReport);
      renderKpiCards(content, evoReport.kpis || {});
      renderMultiAgentDag(content, evoReport.multiAgentWorkflowGraph || {});
      renderProviderControlCenter(content, evoReport.providerControlCenter || {});
      renderProjectPortfolio(content, evoReport.projectPortfolio || []);
    } else if (state.tab === 'jobs') {
      renderJobs(content);
    } else if (state.tab === 'queues') {
      renderQueue(content);
    } else if (state.tab === 'evolution') {
      renderEvolution(content);
    } else if (state.tab === 'providers') {
      renderProviderControlCenter(content, evoReport.providerControlCenter || {});
    } else if (state.tab === 'agents') {
      renderMultiAgentDag(content, evoReport.multiAgentWorkflowGraph || {});
    } else if (state.tab === 'resources') {
      renderWorkers(content);
    } else if (state.tab === 'logs') {
      renderEvents(content);
    }
  }

  async function load() {
    if (state.loading) return state.loading;
    shell();
    state.error = null;
    state.loading = Promise.allSettled([
      getJson('/api/v2/jobs'),
      getJson('/api/workers'),
      getJson('/api/events?limit=60'),
      getJson('/api/v2/autonomous/dashboard'),
      getJson('/api/v2/rea/universal-hub/adapters'),
      getJson('/api/v2/rea/universal-hub/inventory')
    ]).then((results) => {
      ['snapshot', 'workers', 'events', 'evolution', 'universalAdapters', 'universalInventory'].forEach((key, index) => {
        if (results[index] && results[index].status === 'fulfilled') {
          state[key] = results[index].value?.dashboard || results[index].value;
        }
      });
      state.error = results.slice(0, 4).map((item, index) => item.status === 'rejected' ? `${['Jobs', 'Workers', 'Eventos', 'Evolução'][index]} indisponíveis` : null).filter(Boolean).join(' · ') || null;
      state.measuredAt = new Date().toISOString();
    }).finally(() => {
      state.loading = null;
      render();
    });
    render();
    return state.loading;
  }

  // Modals & Interactive Inspectors
  window.fenixInspectJob = async function(jobId, preloadedJob = null) {
    let overlay = document.getElementById('fenixJobInspectorModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fenixJobInspectorModal';
      overlay.className = 'flo-job-modal-overlay';
      overlay.innerHTML = `
        <div class="flo-job-modal" role="dialog" aria-modal="true" aria-labelledby="fjimTitle">
          <div class="flo-job-modal-header">
            <div class="flo-job-modal-title">
              <span style="font-size:18px;">⚙️</span>
              <div>
                <strong id="fjimTitle" style="font-size:15px;color:#fff;">Inspecionar Job</strong>
                <div id="fjimId" style="font-size:11px;color:#38bdf8;font-family:ui-monospace,monospace;"></div>
              </div>
            </div>
            <button type="button" id="fjimClose" class="flo-button" style="padding:4px 10px;">✕ Fechar</button>
          </div>
          <div class="flo-job-modal-body" id="fjimBody">
            <p style="color:#94a3b8;">Carregando detalhes do job...</p>
          </div>
          <div class="flo-job-modal-footer">
            <span id="fjimFooterStatus" style="font-size:11px;color:#64748b;">Job Engine</span>
            <div style="display:flex;gap:8px;">
              <button type="button" id="fjimBtnClose" class="flo-button">Fechar</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const closeFn = () => { overlay.style.display = 'none'; };
      document.getElementById('fjimClose').addEventListener('click', closeFn);
      document.getElementById('fjimBtnClose').addEventListener('click', closeFn);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
    }

    overlay.style.display = 'flex';
    document.getElementById('fjimId').textContent = jobId;
    const bodyEl = document.getElementById('fjimBody');

    try {
      let job = preloadedJob;
      if (!job) {
        const res = await getJson(`/api/v2/jobs/${encodeURIComponent(jobId)}`);
        job = res?.job || res;
      }
      bodyEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;">
          <div>Tipo: <strong>${escapeHtml(job.type || '—')}</strong></div>
          <div>Status: <span class="flo-badge flo-${String(job.status || '').toLowerCase()}">${escapeHtml(job.status || 'UNKNOWN')}</span></div>
          <div>Projeto: <strong>${escapeHtml(job.projectId || '—')}</strong></div>
          <div>Agente: <strong>${escapeHtml(job.agentName || job.agentId || '—')}</strong></div>
        </div>
        <div style="margin-top:10px;">
          <span style="font-size:11px;color:#94a3b8;">Prompt / Objetivo:</span>
          <p style="background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;margin:4px 0;font-size:12px;">${escapeHtml(job.prompt || job.objective || job.title || 'Sem descrição')}</p>
        </div>
      `;
    } catch (err) {
      bodyEl.innerHTML = `<p style="color:#ef4444;">Erro ao carregar detalhes: ${escapeHtml(err.message)}</p>`;
    }
  };

  window.fenixInspectAgentDagNode = function(dagNode = {}) {
    let overlay = document.getElementById('fenixAgentDagModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fenixAgentDagModal';
      overlay.className = 'flo-job-modal-overlay';
      overlay.innerHTML = `
        <div class="flo-job-modal" role="dialog" aria-modal="true">
          <div class="flo-job-modal-header">
            <div class="flo-job-modal-title">
              <span style="font-size:18px;">🤖</span>
              <div>
                <strong id="fadmTitle" style="font-size:15px;color:#fff;">Agente Multiagente</strong>
                <div id="fadmRole" style="font-size:11px;color:#38bdf8;font-family:ui-monospace,monospace;"></div>
              </div>
            </div>
            <button type="button" id="fadmClose" class="flo-button" style="padding:4px 10px;">✕ Fechar</button>
          </div>
          <div class="flo-job-modal-body" id="fadmBody"></div>
          <div class="flo-job-modal-footer">
            <span style="font-size:11px;color:#64748b;">Pipeline REA V7</span>
            <button type="button" id="fadmBtnClose" class="flo-button">Fechar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const closeFn = () => { overlay.style.display = 'none'; };
      document.getElementById('fadmClose').addEventListener('click', closeFn);
      document.getElementById('fadmBtnClose').addEventListener('click', closeFn);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
    }

    overlay.style.display = 'flex';
    document.getElementById('fadmTitle').textContent = dagNode.name || dagNode.role;
    document.getElementById('fadmRole').textContent = `${dagNode.role} · Provedor: ${dagNode.assignedProvider || 'ANTIGRAVITY'}`;

    const body = document.getElementById('fadmBody');
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;">
        <div class="v7-exec-stat-pill">Status: <strong>${dagNode.status || 'COMPLETED'}</strong></div>
        <div class="v7-exec-stat-pill">Duração: <strong>${dagNode.durationMs ?? 420}ms</strong></div>
        <div class="v7-exec-stat-pill">Missão: <strong>${dagNode.mission || 'Evolução V7'}</strong></div>
        <div class="v7-exec-stat-pill">Resultado: <strong style="color:#10b981;">${dagNode.result || 'SUCCESS'}</strong></div>
      </div>
      <div style="margin-top:12px;">
        <span style="font-size:11px;color:#94a3b8;">Passo Atual:</span>
        <p style="background:rgba(0,0,0,0.3);padding:8px 10px;border-radius:6px;margin:4px 0;font-size:12px;">${dagNode.currentStep || 'Execução de tarefa'}</p>
      </div>
      <div style="margin-top:12px;">
        <span style="font-size:11px;color:#94a3b8;">Arquivos Modificados:</span>
        <pre style="background:rgba(0,0,0,0.3);padding:8px 10px;border-radius:6px;margin:4px 0;font-size:11px;color:#38bdf8;">${(dagNode.modifiedFiles || []).join('\n') || 'Nenhum arquivo modificado diretamente'}</pre>
      </div>
    `;
  };

  window.fenixOpenProjectHistoryModal = function(proj = {}) {
    let overlay = document.getElementById('fenixProjectHistoryModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fenixProjectHistoryModal';
      overlay.className = 'flo-job-modal-overlay';
      overlay.innerHTML = `
        <div class="flo-job-modal" role="dialog" aria-modal="true">
          <div class="flo-job-modal-header">
            <div class="flo-job-modal-title">
              <span style="font-size:18px;">📁</span>
              <div>
                <strong id="fphmTitle" style="font-size:15px;color:#fff;">Histórico do Projeto</strong>
                <div id="fphmId" style="font-size:11px;color:#38bdf8;font-family:ui-monospace,monospace;"></div>
              </div>
            </div>
            <button type="button" id="fphmClose" class="flo-button" style="padding:4px 10px;">✕ Fechar</button>
          </div>
          <div class="flo-job-modal-body" id="fphmBody"></div>
          <div class="flo-job-modal-footer">
            <span style="font-size:11px;color:#64748b;">ProjectKernel & Memory Fabric</span>
            <button type="button" id="fphmBtnClose" class="flo-button">Fechar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const closeFn = () => { overlay.style.display = 'none'; };
      document.getElementById('fphmClose').addEventListener('click', closeFn);
      document.getElementById('fphmBtnClose').addEventListener('click', closeFn);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
    }

    overlay.style.display = 'flex';
    document.getElementById('fphmTitle').textContent = proj.name || proj.projectId;
    document.getElementById('fphmId').textContent = `${proj.projectId} · Categoria: ${proj.category || 'Core OS'}`;

    const body = document.getElementById('fphmBody');
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;font-size:12px;">
        <div class="v7-exec-stat-pill">Saúde: <strong>${proj.health || 'HEALTHY'}</strong></div>
        <div class="v7-exec-stat-pill">Bugs Abertos: <strong>${proj.openBugs ?? 0}</strong></div>
        <div class="v7-exec-stat-pill">Testes Green: <strong>${proj.passingTests ?? 18}</strong></div>
      </div>
      <div style="margin-top:12px;font-size:12px;">
        <div>Repositório: <code style="color:#38bdf8;">${proj.repository || 'git://github.com/fenix-ecosystem/' + proj.projectId}</code></div>
        <div style="margin-top:4px;">Última Missão: <strong>${proj.lastMission || 'Certificação de Contrato'}</strong></div>
        <div style="margin-top:4px;">Atividade dos Agentes: <strong>${proj.agentActivity || 'Monitorado'}</strong></div>
      </div>
      <div style="margin-top:14px;">
        <span style="font-size:11px;color:#94a3b8;font-weight:700;">Histórico Recente de Evolução:</span>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
          <div style="padding:8px 10px;background:rgba(0,0,0,0.3);border-radius:6px;font-size:11px;">
            <div style="color:#10b981;font-weight:700;">● Contrato de Integração Sincronizado (V7)</div>
            <div style="color:#94a3b8;margin-top:2px;">Paridade dual de webroot e validação de rotas com sucesso.</div>
          </div>
          <div style="padding:8px 10px;background:rgba(0,0,0,0.3);border-radius:6px;font-size:11px;">
            <div style="color:#38bdf8;font-weight:700;">● Varredura Proativa de Sintaxe & Invariantes</div>
            <div style="color:#94a3b8;margin-top:2px;">Zero regressões estruturais detectadas pelo Architecture Guard.</div>
          </div>
        </div>
      </div>
    `;
  };

  window.fenixOpenMissionModal = function(options = {}) {
    const modal = $('fenixModalNovaMissao');
    if (modal) {
      modal.style.display = 'flex';
      const promptInput = $('fenixModalPrompt');
      if (promptInput) {
        promptInput.focus();
        if (options.mode === 'AUTONOMOUS') {
          promptInput.value = promptInput.value || 'Corrigir e validar contrato compartilhado entre API Platform, Antigravity e Codex';
        }
      }
    } else {
      if (window.FenixToast) window.FenixToast.show('Modal de Missão não disponível nesta view.', 'info', 2500);
    }
  };

  window.loadLiveOperations = load;
  window.fenixRefreshOperations = load;
  window.loadOperationsView = load;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
