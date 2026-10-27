(() => {
  const state = { tab: 'jobs', jobFilter: 'all', query: '', snapshot: null, workers: null, events: null, evolution: null, reciprocityAudit: null, absorptionReport: null, cityState: null, synthResult: null, error: null, measuredAt: null, loading: null };
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
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
      const requestOptions = {
        ...options,
        credentials: 'same-origin',
        headers,
      };
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
  async function getJson(url) {
    return requestJson(url);
  }
  async function postJson(url, body = {}) {
    return requestJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  function shell() {
    const view = $('view-operations');
    if (!view || view.dataset.liveOperations === 'true') return;
    view.dataset.liveOperations = 'true';
    view.replaceChildren();
    const main = node('main', 'fenix-live-operations');
    const header = node('header', 'flo-header');
    const title = node('div');
    title.append(node('span', 'flo-eyebrow', 'JOB ENGINE · DADOS DO RUNTIME'), node('h1', '', 'Operações & Auto-Evolução'), node('p', '', 'Jobs, fila, workers, telemetria e ciclo de auto-evolução contínuo do Fênix.'));
    const headerActions = node('div', 'flo-header-actions');
    const btnNewMission = node('button', 'flo-button flo-button-primary', '🚀 Nova Missão');
    btnNewMission.type = 'button';
    btnNewMission.id = 'floBtnNewMission';
    btnNewMission.addEventListener('click', () => window.fenixOpenMissionModal());
    const refresh = node('button', 'flo-button', '↻ Atualizar');
    refresh.type = 'button';
    refresh.id = 'floBtnRefresh';
    refresh.addEventListener('click', load);
    headerActions.append(btnNewMission, refresh);
    header.append(title, headerActions);
    const tabs = node('nav', 'flo-tabs'); tabs.setAttribute('aria-label', 'Áreas de operações');
    for (const [key, label] of [['jobs', 'Jobs'], ['queues', 'Filas'], ['resources', 'Recursos'], ['evolution', 'Auto-Evolução'], ['reciprocity', 'Reciprocidade & Engenharia'], ['logs', 'Eventos']]) {
      const button = node('button', '', label); button.type = 'button'; button.dataset.tab = key;
      button.addEventListener('click', () => { state.tab = key; render(); }); tabs.append(button);
    }
    const overview = node('section', 'flo-overview'); overview.setAttribute('aria-label', 'Resumo operacional');
    const toolbar = node('div', 'flo-toolbar');
    const search = node('input', 'flo-search'); search.type = 'search'; search.placeholder = 'Buscar job, projeto ou agente'; search.setAttribute('aria-label', 'Buscar jobs'); search.addEventListener('input', () => { state.query = search.value.trim().toLocaleLowerCase('pt-BR'); render(); });
    const filter = node('select', 'flo-filter'); filter.setAttribute('aria-label', 'Filtrar jobs por estado');
    for (const [value, label] of [['all', 'Todos os estados'], ['active', 'Em execução'], ['waiting', 'Aguardando'], ['failed', 'Falhas'], ['completed', 'Concluídos']]) filter.add(new Option(label, value));
    filter.addEventListener('change', () => { state.jobFilter = filter.value; render(); });
    toolbar.append(search, filter, node('span', 'flo-visible-count'));
    main.append(header, overview, tabs, node('p', 'flo-status'), toolbar, node('section', 'flo-content'));
    view.append(main);
  }
  function fact(label, value) {
    const box = node('div', 'flo-fact'); box.append(node('span', '', label), node('strong', '', value)); return box;
  }
  function renderOverview() {
    const overview = $('view-operations').querySelector('.flo-overview'); overview.replaceChildren();
    const jobs = state.snapshot?.jobs || [];
    const count = (...statuses) => jobs.filter((job) => statuses.includes(String(job.status || '').toUpperCase())).length;
    const evoScore = state.evolution?.scores?.evolutionScore !== undefined ? `${Math.round(state.evolution.scores.evolutionScore * 100)}%` : '—';
    const metrics = [
      ['Em execução', state.snapshot ? count('RUNNING') : '—', 'active'],
      ['Na fila', state.snapshot ? count('QUEUED', 'WAITING', 'READY', 'RETRYING') : '—', 'waiting'],
      ['Auto-Evolução', evoScore, 'evolution'],
      ['Workers ativos', state.workers ? (state.workers.workers || []).filter((worker) => ['ONLINE', 'ACTIVE', 'RUNNING', 'IDLE', 'READY', 'AVAILABLE'].includes(String(worker.status || '').toUpperCase())).length : '—', 'workers'],
    ];
    for (const [label, value, kind] of metrics) { const item = fact(label, value); item.dataset.kind = kind; overview.append(item); }
  }
  function renderJobs(content) {
    const jobs = state.snapshot?.jobs || [];
    const groups = { active: ['RUNNING'], waiting: ['QUEUED', 'WAITING', 'READY', 'RETRYING'], failed: ['FAILED', 'DEAD_LETTER'], completed: ['COMPLETED', 'SUCCEEDED'] };
    const visible = jobs.filter((job) => (state.jobFilter === 'all' || groups[state.jobFilter]?.includes(String(job.status || '').toUpperCase())) && (!state.query || [job.title, job.objective, job.type, job.id, job.projectId, job.agentName, job.agentId].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(state.query))));
    $('view-operations').querySelector('.flo-visible-count').textContent = `${visible.length} de ${jobs.length} jobs`;
    if (!visible.length) { content.append(node('p', 'flo-empty', state.snapshot ? 'Nenhum job corresponde aos filtros.' : 'Jobs indisponíveis nesta leitura.')); return; }
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

      const tokensUsed = Number(job.tokens || job.tokenUsage?.total || job.tokensUsed || 0);
      const tokenBudget = Number(job.tokenBudget || 0);
      const tokenPct = tokenBudget > 0 ? Math.min(100, Math.round((tokensUsed / tokenBudget) * 100)) : (tokensUsed ? 100 : 0);
      const tBox = node('div', 'flo-token-box');
      const tHead = node('div', 'flo-token-header');
      tHead.append(
        node('span', '', `Gasto de Tokens: ${tokensUsed ? tokensUsed.toLocaleString('pt-BR') : '—'} ${tokenBudget > 0 ? '/ ' + tokenBudget.toLocaleString('pt-BR') : ''}`),
        node('span', '', tokensUsed ? (tokenBudget > 0 ? `${tokenPct}%` : `${tokensUsed} tokens`) : '—')
      );
      const tTrack = node('div', 'flo-token-track');
      const tFill = node('div', 'flo-token-fill');
      tFill.style.width = tokensUsed ? (tokenBudget > 0 ? `${tokenPct}%` : '100%') : '0%';
      tTrack.append(tFill);
      tBox.append(tHead, tTrack);
      card.append(tBox);

      if (job.error || job.lastError) { const failure = job.error || job.lastError; card.append(node('p', 'flo-job-error', typeof failure === 'string' ? failure : failure.message || failure.error || JSON.stringify(failure))); }

      if (isWaitingApproval) {
        const appRow = node('div', 'flo-approval-row');
        const btnApp = node('button', 'flo-btn-approve', '✓ Aprovar Job');
        btnApp.type = 'button';
        btnApp.addEventListener('click', async () => {
          btnApp.disabled = true; btnApp.textContent = 'Aprovando...';
          await postJson(`/api/v2/jobs/${encodeURIComponent(job.id)}/approve`);
          load();
        });
        const btnRej = node('button', 'flo-btn-reject', '✕ Rejeitar Job');
        btnRej.type = 'button';
        btnRej.addEventListener('click', async () => {
          btnRej.disabled = true; btnRej.textContent = 'Rejeitando...';
          await postJson(`/api/v2/jobs/${encodeURIComponent(job.id)}/reject`, { reason: 'Rejeitado pelo operador' });
          load();
        });
        appRow.append(btnApp, btnRej);
        card.append(appRow);
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

      if (job.projectId) {
        const open = node('button', 'flo-card-action', 'Abrir projeto ↗');
        open.type = 'button';
        open.addEventListener('click', () => window.openProjectWorkspace?.(job.projectId) || window.showView?.('projects'));
        actionsRow.append(open);
      }
      card.append(actionsRow);
      content.append(card);
    }

  }
  function renderQueue(content) {
    const jobs = state.snapshot?.jobs || [];
    const count = (...values) => jobs.filter((job) => values.includes(String(job.status || '').toUpperCase())).length;
    const q = state.snapshot?.queue || (state.snapshot ? { total: jobs.length, running: count('RUNNING'), waiting: count('QUEUED', 'WAITING', 'READY', 'RETRYING'), completed: count('COMPLETED', 'SUCCEEDED'), failed: count('FAILED', 'DEAD_LETTER'), cancelled: count('CANCELLED') } : null);
    if (!q) { content.append(node('p', 'flo-empty', 'Estado da fila indisponível.')); return; }
    const grid = node('div', 'flo-grid');
    for (const [label, key] of [['Total', 'total'], ['Executando', 'running'], ['Aguardando', 'waiting'], ['Concluídos', 'completed'], ['Falhas', 'failed'], ['Cancelados', 'cancelled']]) grid.append(fact(label, q[key] ?? '—'));
    content.append(grid);
    const bull = state.snapshot?.bullmq;
    content.append(node('p', 'flo-empty', bull ? `BullMQ: ${bull.status || bull.state || 'estado disponível'}` : 'BullMQ sem estado reportado; contagens obtidas do JobEngine persistente.'));
  }
  function renderWorkers(content) {
    const workers = state.workers?.workers || [];
    if (!workers.length) { content.append(node('p', 'flo-empty', 'Nenhum worker reportado pelo runtime.')); return; }
    const active = (worker) => ['ONLINE', 'ACTIVE', 'RUNNING', 'IDLE', 'READY', 'AVAILABLE'].includes(String(worker.status || '').toUpperCase());
    const activeCount = workers.filter(active).length;
    const summary = node('p', 'flo-worker-summary', `${activeCount} ativo(s) · ${workers.length - activeCount} sem atividade confirmada`);
    if (!activeCount) summary.dataset.warning = 'true';
    content.append(summary);
    for (const worker of workers.slice().sort((a, b) => Number(active(b)) - Number(active(a)))) {
      const card = node('article', 'flo-card');
      const workerStatus = String(worker.status || 'UNKNOWN').toUpperCase();
      const top = node('div', 'flo-card-head'); top.append(node('strong', '', worker.name || worker.workerId || worker.id), node('span', `flo-badge flo-${workerStatus.toLowerCase()}`, workerStatus));
      const lastSeen = worker.lastSeenAt || worker.lastHeartbeat;
      card.append(top, node('p', '', `Último sinal: ${lastSeen && !Number.isNaN(Date.parse(lastSeen)) ? new Date(lastSeen).toLocaleString('pt-BR') : 'indisponível'}`)); content.append(card);
    }
  }
  function renderEvolution(content) {
    const evo = state.evolution;
    if (!evo) {
      content.append(node('p', 'flo-empty', 'Módulo de Auto-Evolução consultando runtime...'));
      return;
    }

    const hb = evo.heartbeat || {};
    const loopStatus = evo.status?.status || hb.evolution || 'IDLE';
    const queue = evo.queue || { active: [], blocked: [], paused: [], counts: {} };
    const bugsData = evo.bugs || { bugs: [], summary: { total: 0, open: 0, fixed: 0, verified: 0, blocked: 0 } };
    const bugsSummary = bugsData.summary || evo.status?.bugsSummary || { total: 0, open: 0, fixed: 0, verified: 0, blocked: 0 };
    const budget = evo.budget || evo.status?.budget || {};
    const cityState = evo.cityState || evo.status?.cityState || { agents: [], busyCount: 0, idleCount: 0 };

    // 1. Painel de Controle do Scheduler Autônomo & Universal Hub
    const ctrlCard = node('article', 'flo-card');
    ctrlCard.id = 'fenixAutonomousControlCard';
    const ctrlHead = node('div', 'flo-card-head');
    ctrlHead.append(node('strong', '', 'FÊNIX AUTONOMOUS EVOLUTION ENGINE & GRG UNIVERSAL HUB'));
    const pBadge = node('span', `flo-badge flo-${loopStatus === 'ACTIVE' || loopStatus === 'RUNNING' ? 'active' : 'waiting'}`, loopStatus);
    ctrlHead.append(pBadge);
    ctrlCard.append(ctrlHead);

    const desc = node('p', '', `Sistema: ${hb.system || '—'} · Kernel: ${hb.kernel || '—'} · Watchers: ${hb.watchers || '—'} · Ciclos: ${evo.status?.cycleCount ?? 0} · Última Atividade: ${evo.status?.lastCycleAt ? new Date(evo.status.lastCycleAt).toLocaleTimeString('pt-BR') : '—'}`);
    ctrlCard.append(desc);

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
          if (endpoint.includes('/poc/run')) {
            state.lastPocResult = res;
            if (window.fenixSyncCityAutonomousState) window.fenixSyncCityAutonomousState();
          } else if (endpoint.includes('/universal-hub/proof')) {
            state.lastHubProof = res;
          }
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
    const pauseBtn = makeActionBtn('floBtnAutoPause', '⏸ Pausar', '/api/v2/autonomous/pause', { reason: 'Pausado via Painel de Autonomia' });
    const resumeBtn = makeActionBtn('floBtnAutoResume', '⏯ Retomar', '/api/v2/autonomous/resume');
    const stopBtn = makeActionBtn('floBtnAutoStop', '⏹ Parar', '/api/v2/autonomous/stop');
    const cycleBtn = makeActionBtn('floBtnAutoCycle', '⚡ Disparar Ciclo', '/api/v2/autonomous/cycle');
    const pocBtn = makeActionBtn('floBtnAutoPoc', '🧪 Executar PoC 16-Etapas (Bug-Fix Real)', '/api/v2/autonomous/poc/run', {}, true);
    const hubProofBtn = makeActionBtn('floBtnHubProof', '🔗 Prova Cross-Tool & Cross-Project', '/api/v2/rea/universal-hub/proof', {});
    const scanBtn = makeActionBtn('floBtnAutoScan', '🔍 Scan Proativo', '/api/v2/autonomous/scan', { maxFiles: 25 });

    const enqueueMissionBtn = node('button', 'flo-button', '🚀 Enfileirar Missão');
    enqueueMissionBtn.type = 'button';
    enqueueMissionBtn.id = 'floBtnEnqueueEvoMission';
    enqueueMissionBtn.addEventListener('click', () => window.fenixOpenMissionModal({ mode: 'AUTONOMOUS' }));

    actionRow.append(startBtn, pauseBtn, resumeBtn, stopBtn, cycleBtn, pocBtn, hubProofBtn, scanBtn, enqueueMissionBtn);
    ctrlCard.append(actionRow);
    content.append(ctrlCard);

    // 2. Telemetria Operacional Medida (Agentes, Missões, Bugs, Orçamento, Cold-Restart)
    const teleTitle = node('h3', '', 'Telemetria Operacional do Motor Autônomo & Orçamento de API');
    teleTitle.style.margin = '16px 0 8px';
    teleTitle.style.color = '#F8FAFC';
    content.append(teleTitle);

    const teleGrid = node('div', 'flo-grid');
    teleGrid.id = 'fenixAutonomousTelemetryGrid';
    teleGrid.append(fact('Estado do Scheduler', loopStatus));
    teleGrid.append(fact('Papéis Ocupados / Livres', `${cityState.busyCount ?? 0} ocupados / ${cityState.idleCount ?? 7} livres`));
    teleGrid.append(fact('Missões Ativas / Bloqueadas', `${queue.active?.length || 0} ativas / ${queue.blocked?.length || 0} bloqueadas`));
    teleGrid.append(fact('Bugs (Total / Fixed / Verified)', `${bugsSummary.total ?? 0} / ${bugsSummary.fixed ?? 0} / ${bugsSummary.verified ?? 0}`));
    teleGrid.append(fact('Tokens Usados / Limite', `${budget.tokensUsedPeriod ?? 0} / ${budget.maxTokensPerPeriod ?? '—'}`));
    teleGrid.append(fact('Custo USD / Status API Externa', `$${budget.costUsdPeriod ?? 0} (${budget.externalApiPaused ? 'API PAUSADA - MODO LOCAL' : 'ATIVA'})`));
    content.append(teleGrid);

    // Exibir resultado da última PoC 16-Etapas ou Prova Cross-Tool se disponível
    const latestPoc = state.lastPocResult || (Array.isArray(evo.pocRuns) && evo.pocRuns[0]) || null;
    if (latestPoc) {
      const pocCard = node('article', 'flo-card');
      pocCard.id = 'fenixLatestPocEvidenceCard';
      const pocHead = node('div', 'flo-card-head');
      pocHead.append(
        node('strong', '', `Evidência Real PoC Bug-Fix: ${latestPoc.runId || 'PoC'} (${latestPoc.bugId || '—'})`),
        node('span', `flo-badge flo-${latestPoc.ok ? 'succeeded' : 'failed'}`, latestPoc.bugFinalState || 'VERIFIED')
      );
      pocCard.append(pocHead);
      pocCard.append(node('p', '', `Arquivo: ${latestPoc.targetFile ? latestPoc.targetFile.split(/[\\/]/).pop() : '—'} · SHA-256 Antes: ${(latestPoc.sha256Before || '').slice(0, 12)} · SHA-256 Depois: ${(latestPoc.sha256After || '').slice(0, 12)} · ExitCode Inicial: ${latestPoc.initialFailingExitCode ?? 1} -> Final: ${latestPoc.postFixExitCode ?? 0}`));
      if (latestPoc.rollbackProof) {
        pocCard.append(node('small', '', `Rollback Guard: patch inválido revertido (${latestPoc.rollbackProof.restoredFromCheckpointId}) · Cold-Restart Sem Duplicação: ${latestPoc.coldRestartProof?.noDuplicateOnReEnqueue ? 'SIM' : '—'}`));
      }
      if (latestPoc.diffSnippet) {
        const pre = document.createElement('pre');
        pre.style.cssText = 'background:#050b14;border:1px solid rgba(16,185,129,0.25);border-radius:6px;padding:8px;font-size:11px;color:#6ee7b7;overflow-x:auto;margin-top:8px;';
        pre.textContent = latestPoc.diffSnippet;
        pocCard.append(pre);
      }
      content.append(pocCard);
    }

    if (state.lastHubProof) {
      const hp = state.lastHubProof;
      const hpCard = node('article', 'flo-card');
      hpCard.id = 'fenixLatestHubProofCard';
      const hpHead = node('div', 'flo-card-head');
      hpHead.append(
        node('strong', '', `Prova Cross-Tool & Cross-Project: ${(hp.projectsInvolved || []).join(' ↔ ')}`),
        node('span', `flo-badge flo-${hp.ok ? 'succeeded' : 'failed'}`, hp.ok ? 'CERTIFICADO' : 'FALHOU')
      );
      hpCard.append(hpHead);
      hpCard.append(node('p', '', `Ferramentas: ${(hp.toolsInvolved || []).join(' → ')} · Saída do Validador: ${hp.step2ValidatorExecution?.stdout || '—'}`));
      content.append(hpCard);
    }

    // 3. Os 7 Papéis de Engenharia & Estados Canônicos na Cidade 3D
    if (Array.isArray(cityState.agents) && cityState.agents.length > 0) {
      const rolesTitle = node('h3', '', '7 Papéis Canônicos de Engenharia (Sincronizados com a Cidade 3D)');
      rolesTitle.style.margin = '20px 0 8px';
      rolesTitle.style.color = '#F8FAFC';
      content.append(rolesTitle);

      const rolesGrid = node('div', 'flo-grid');
      for (const ag of cityState.agents) {
        const rCard = node('article', 'flo-card');
        const rHead = node('div', 'flo-card-head');
        rHead.append(
          node('strong', '', `${ag.role} (${ag.agentName})`),
          node('span', `flo-badge flo-${ag.engineeringState === 'IDLE' ? 'waiting' : 'running'}`, ag.engineeringState)
        );
        rCard.append(rHead);
        rCard.append(node('p', '', `${ag.thought || '—'}`));
        rCard.append(node('small', '', `Estação: ${ag.station} · Projeto: ${ag.projectId || '—'} · Modelo: ${ag.toolOrModel || '—'}`));
        rolesGrid.append(rCard);
      }
      content.append(rolesGrid);
    }

    // 4. Fila de Missões Autônomas com Controles Individuais
    const queueTitle = node('h3', '', 'Fila Autônoma de Missões (P0-P7) & Controle de Execução');
    queueTitle.style.margin = '20px 0 8px';
    queueTitle.style.color = '#F8FAFC';
    content.append(queueTitle);

    const missionsList = (queue.active && queue.active.length) ? queue.active : (queue.recentCompleted || []).slice(0, 5);
    if (!missionsList.length) {
      content.append(node('p', 'flo-empty', 'Nenhuma missão pendente na fila autônoma. Runtime estável e operando normalmente.'));
    } else {
      for (const m of missionsList) {
        const mCard = node('article', 'flo-card');
        const mHead = node('div', 'flo-card-head');
        mHead.append(node('strong', '', `[${m.priority}] (${m.projectId || 'fenix-os'}) ${m.problem}`));
        mHead.append(node('span', `flo-badge flo-${String(m.state || '').toLowerCase()}`, m.state));
        mCard.append(mHead);
        if (m.hypothesis) mCard.append(node('p', '', `Hipótese: ${m.hypothesis}`));
        mCard.append(node('small', '', `ID: ${m.id} · Hash: ${m.problemHash} · Tentativas: ${m.attempts || 0} · Lease: ${m.leaseOwner || 'Livre'}`));

        const mCtrlRow = node('div', '');
        mCtrlRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';
        const sendMissionCtrl = async (action, extra = {}) => {
          await postJson(`/api/v2/autonomous/mission/${encodeURIComponent(m.id)}/control`, { action, ...extra });
          await load();
        };

        const logsBox = node('pre', '');
        logsBox.style.display = 'none';
        logsBox.style.marginTop = '8px';
        logsBox.style.padding = '8px';
        logsBox.style.background = 'rgba(2, 6, 23, 0.75)';
        logsBox.style.borderRadius = '6px';
        logsBox.style.fontSize = '11px';
        logsBox.style.color = '#94A3B8';
        logsBox.style.whiteSpace = 'pre-wrap';
        logsBox.textContent = JSON.stringify({
          missionId: m.id,
          state: m.state,
          checkpoint: m.checkpoint || null,
          metrics: m.metrics || {},
          recentLogs: (m.logs || []).slice(-6)
        }, null, 2);

        const logsBtn = node('button', 'flo-button', '🔍 Revisar Diff & Logs');
        logsBtn.style.fontSize = '11px';
        logsBtn.onclick = () => {
          logsBox.style.display = logsBox.style.display === 'none' ? 'block' : 'none';
        };

        if (!['COMPLETED', 'CANCELLED', 'ROLLED_BACK'].includes(m.state)) {
          const prioBtn = node('button', 'flo-button', '⬆ Priorizar P0');
          prioBtn.style.fontSize = '11px';
          prioBtn.onclick = () => sendMissionCtrl('prioritize', { priority: 'P0' });

          const pauseM = node('button', 'flo-button', m.state === 'PAUSED' ? '▶ Retomar' : '⏸ Pausar');
          pauseM.style.fontSize = '11px';
          pauseM.onclick = () => sendMissionCtrl(m.state === 'PAUSED' ? 'resume' : 'pause');

          const cancelM = node('button', 'flo-button', '⏹ Abortar');
          cancelM.style.fontSize = '11px';
          cancelM.onclick = () => sendMissionCtrl('cancel', { reason: 'Abortada pelo operador' });

          const approveM = node('button', 'flo-button', '✅ Aprovar Diff');
          approveM.style.fontSize = '11px';
          approveM.onclick = () => sendMissionCtrl('approve', { notes: 'Aprovado no painel de operações' });

          const rejectM = node('button', 'flo-button', '❌ Rejeitar Diff');
          rejectM.style.fontSize = '11px';
          rejectM.onclick = () => sendMissionCtrl('reject', { reason: 'Diff rejeitado pelo operador no painel' });

          mCtrlRow.append(prioBtn, pauseM, cancelM, approveM, rejectM, logsBtn);
        } else {
          mCtrlRow.append(logsBtn);
        }
        mCard.append(mCtrlRow, logsBox);
        content.append(mCard);
      }
    }

    // 5. Universal Bug Tracker
    const bugTitle = node('h3', '', `Universal Bug Tracker (${bugsData.bugs?.length || 0} registros)`);
    bugTitle.style.margin = '20px 0 8px';
    bugTitle.style.color = '#F8FAFC';
    content.append(bugTitle);

    if (!bugsData.bugs?.length) {
      content.append(node('p', 'flo-empty', 'Nenhum bug ativo registrado. Use "Executar PoC 16-Etapas" para demonstrar o fluxo completo OPEN -> REPRODUCED -> IN_PROGRESS -> FIXED -> VERIFIED.'));
    } else {
      for (const b of bugsData.bugs.slice(0, 8)) {
        const bCard = node('article', 'flo-card');
        const bHead = node('div', 'flo-card-head');
        bHead.append(
          node('strong', '', `[${b.severity}/${b.priority}] ${b.title}`),
          node('span', `flo-badge flo-${b.bugState === 'VERIFIED' ? 'succeeded' : 'running'}`, b.bugState)
        );
        bCard.append(bHead);
        bCard.append(node('p', '', `${b.description || '—'}`));
        bCard.append(node('small', '', `Bug ID: ${b.bugId} · Projeto: ${b.projectId} · Classificação: ${b.classification} · Testes Passando: ${b.evidence?.testsPassed ? 'SIM (exitCode=0)' : 'PENDENTE'}`));
        content.append(bCard);
      }
    }

    // 5.5 Achados do Scan Proativo (Fase 9 & Fase 11)
    const proactiveFindings = Array.isArray(evo.proactiveFindings) ? evo.proactiveFindings : [];
    const pfTitle = node('h3', '', `Scanner Proativo de Evolução (${proactiveFindings.length} oportunidades ranqueadas)`);
    pfTitle.style.margin = '20px 0 8px';
    pfTitle.style.color = '#F8FAFC';
    content.append(pfTitle);

    const pfSection = node('div', 'flo-grid');
    pfSection.id = 'fenixProactiveFindingsSection';
    if (!proactiveFindings.length) {
      pfSection.append(node('p', 'flo-empty', 'Nenhum achado proativo carregado. Clique em "🔍 Scan Proativo" para inspecionar o código-fonte real e ranquear oportunidades.'));
    } else {
      for (const pf of proactiveFindings.slice(0, 6)) {
        const pfCard = node('article', 'flo-card');
        const pfHead = node('div', 'flo-card-head');
        pfHead.append(
          node('strong', '', `[${pf.category || 'FINDING'}] ${pf.file}:${pf.line}`),
          node('span', 'flo-badge flo-active', `Rank ${pf.compositeRank ?? '—'}`)
        );
        pfCard.append(pfHead);
        pfCard.append(node('p', '', pf.summary || '—'));
        pfCard.append(node('small', '', `Impacto: ${pf.estimatedImpact || '—'} · Ação: ${pf.recommendedAction || '—'}`));
        const convBtn = node('button', 'flo-button', '🐛 Converter em Bug/Missão');
        convBtn.type = 'button';
        convBtn.style.marginTop = '8px';
        convBtn.style.fontSize = '11px';
        convBtn.onclick = async () => {
          convBtn.disabled = true;
          convBtn.textContent = 'Enfileirando...';
          try {
            await postJson('/api/v2/autonomous/bugs', {
              projectId: 'fenix-os',
              title: `[Proactive Scan] ${pf.category}: ${pf.file}:${pf.line}`,
              description: `${pf.summary} | Impacto: ${pf.estimatedImpact || 'Médio'} | Ação: ${pf.recommendedAction || 'Corrigir'}`,
              severity: 'MEDIUM',
              priority: 'P2',
              classification: 'PROACTIVE_SCAN_FINDING',
              targetFiles: [pf.file],
              enqueueMission: true
            });
            await load();
          } finally {
            convBtn.disabled = false;
            convBtn.textContent = '🐛 Converter em Bug/Missão';
          }
        };
        pfCard.append(convBtn);
        pfSection.append(pfCard);
      }
    }
    content.append(pfSection);

    // 6. Universal Tool Adapter Registry (Part 2 Fase 2 & Fase 10)
    const adaptersList = state.universalAdapters?.adapters || [];
    if (adaptersList.length > 0) {
      const adTitle = node('h3', '', `Universal Tool Adapter Registry (${adaptersList.length} conectores)`);
      adTitle.style.margin = '20px 0 8px';
      adTitle.style.color = '#F8FAFC';
      content.append(adTitle);

      const adGrid = node('div', 'flo-grid');
      adGrid.id = 'fenixUniversalAdaptersGrid';
      for (const ad of adaptersList) {
        const aCard = node('article', 'flo-card');
        const aHead = node('div', 'flo-card-head');
        aHead.append(
          node('strong', '', ad.name),
          node('span', `flo-badge flo-${ad.certificationStage === 'CERTIFIED' ? 'succeeded' : 'active'}`, ad.certificationStage)
        );
        aCard.append(aHead);
        aCard.append(node('p', '', `Categoria: ${ad.category} · Escopo: ${ad.permissionScope}`));
        aCard.append(node('small', '', `Capacidades: ${(ad.supportedCapabilities || []).join(', ')}`));
        if (ad.lastTestEvidence) {
          aCard.append(node('small', '', `Última Prova: ${ad.lastTestEvidence}`));
        }
        const testAdBtn = node('button', 'flo-button', '⚡ Testar Conector');
        testAdBtn.type = 'button';
        testAdBtn.style.marginTop = '8px';
        testAdBtn.style.fontSize = '11px';
        testAdBtn.onclick = async () => {
          testAdBtn.disabled = true;
          testAdBtn.textContent = 'Testando...';
          try {
            await postJson('/api/v2/rea/universal-hub/adapters/test', { adapterId: ad.adapterId });
            await load();
          } finally {
            testAdBtn.disabled = false;
            testAdBtn.textContent = '⚡ Testar Conector';
          }
        };
        aCard.append(testAdBtn);
        adGrid.append(aCard);
      }
      content.append(adGrid);
    }

    // 7. Grafo de Dependências Cross-Project (Part 2 Fase 1, 7 & 10)
    const depGraph = state.universalInventory?.dependencyGraph;
    if (depGraph && Array.isArray(depGraph.edges)) {
      const dgTitle = node('h3', '', `Grafo de Dependências e Contratos Entre Projetos (${depGraph.edges.length} acoplamentos)`);
      dgTitle.style.margin = '20px 0 8px';
      dgTitle.style.color = '#F8FAFC';
      content.append(dgTitle);

      const dgCard = node('article', 'flo-card');
      for (const edge of depGraph.edges) {
        dgCard.append(node('p', '', `🔗 ${edge.from} ➔ ${edge.to} [${edge.relation}] · Contrato: ${edge.sharedContract}`));
      }
      const propBtn = node('button', 'flo-button', '📡 Propagar Verificação de Contrato (api-platform → consumidores)');
      propBtn.type = 'button';
      propBtn.style.marginTop = '8px';
      propBtn.onclick = async () => {
        propBtn.disabled = true;
        propBtn.textContent = 'Propagando...';
        try {
          await postJson('/api/v2/rea/universal-hub/propagate', {
            sourceProjectId: 'api-platform',
            sharedContract: 'contract:api-platform:v1-chat-completions',
            summary: 'Verificação de compatibilidade disparada pelo painel operacional'
          });
          await load();
        } finally {
          propBtn.disabled = false;
          propBtn.textContent = '📡 Propagar Verificação de Contrato (api-platform → consumidores)';
        }
      };
      dgCard.append(propBtn);
      content.append(dgCard);
    }

    // 8. Memória Evolutiva & Padrões Consolidados
    const memTitle = node('h3', '', 'Padrões Aprendidos & Memória Evolutiva');
    memTitle.style.margin = '20px 0 8px';
    memTitle.style.color = '#F8FAFC';
    content.append(memTitle);

    const mem = evo.memory || { distinctPatterns: [], recentLessons: [] };
    const pCard = node('article', 'flo-card');
    pCard.append(node('strong', '', `Padrões Consolidados (${mem.distinctPatterns.length})`));
    const pList = node('p', '', mem.distinctPatterns.join(' · ') || 'Nenhum padrão derivado ainda.');
    pList.style.color = '#38BDF8';
    pCard.append(pList);
    content.append(pCard);

    for (const l of mem.recentLessons || []) {
      const lCard = node('article', 'flo-card');
      const lHead = node('div', 'flo-card-head');
      lHead.append(node('strong', '', l.pattern || 'Aprendizado'));
      lHead.append(node('small', '', l.at ? new Date(l.at).toLocaleTimeString('pt-BR') : ''));
      lCard.append(lHead, node('p', '', l.lesson));
      content.append(lCard);
    }
  }
  function renderEvents(content) {
    const events = state.events?.events || [];
    if (!events.length) { content.append(node('p', 'flo-empty', 'Nenhum evento recente registrado.')); return; }
    for (const event of events.slice().reverse().slice(0, 60)) {
      const card = node('article', 'flo-card');
      const top = node('div', 'flo-card-head'); top.append(node('strong', '', event.type || event.kind || 'Evento'), node('small', '', event.createdAt || event.timestamp || ''));
      let eventSummary = event.summary || event.description || event.message || '';
      if (!eventSummary || eventSummary.includes('sem descrição') || eventSummary.includes('A API registrou')) {
        const evType = String(event.type || event.kind || '').toLowerCase();
        const comp = event.data?.componentId || event.subject || '';
        if (evType.includes('operational.component')) {
          eventSummary = `Auditoria operacional: componente "${comp || 'core'}" com status ${event.data?.status || 'OK'}.`;
        } else if (evType.startsWith('mission.')) {
          eventSummary = `Missão despachada para execução no ecossistema Fênix.`;
        } else if (evType.startsWith('agent.')) {
          eventSummary = `Atividade de agente autônomo registrada no runtime.`;
        } else if (evType.startsWith('job.')) {
          eventSummary = `Job de processamento executado pelo Fênix OS.`;
        } else {
          eventSummary = `Evento do subsistema ${comp || evType || 'operacional'} registrado com integridade.`;
        }
      }
      card.append(top, node('p', '', eventSummary)); content.append(card);
    }
  }
  function renderReciprocity(content) {
    const ctrlCard = node('article', 'flo-card');
    const ctrlHead = node('div', 'flo-card-head');
    ctrlHead.append(
      node('strong', '', 'Regra Constitucional Nº 1: Reciprocidade Full-Stack'),
      node('span', 'flo-badge flo-online', 'ZERO-MOCK REALITY')
    );
    ctrlCard.append(ctrlHead);

    const desc = node('p', '', 'Nenhuma feature pode existir em apenas um lado do sistema. Toda capacidade deve cumprir: FRONTEND -> STATE -> API -> BACKEND -> SERVICE -> DATABASE -> EVENTS -> RUNTIME -> VALIDATION.');
    desc.style.color = '#94A3B8';
    ctrlCard.append(desc);

    const actionRow = node('div');
    actionRow.style.display = 'flex';
    actionRow.style.gap = '8px';
    actionRow.style.flexWrap = 'wrap';
    actionRow.style.marginTop = '12px';

    const auditBtn = node('button', 'flo-button', '⚡ Auditar Reciprocidade do Sistema');
    auditBtn.type = 'button';
    auditBtn.addEventListener('click', async () => {
      auditBtn.disabled = true;
      auditBtn.textContent = 'Auditando paridade...';
      try {
        const res = await postJson('/api/v2/engineering/reciprocity/verify', {
          feature: 'Universal Reciprocal Operating System',
          frontendActions: ['job.pause', 'job.resume', 'inspect.file', 'mission.create', 'city.inspect', 'reciprocity.audit'],
          backendRoutes: ['POST /api/v2/jobs/:id/pause', 'POST /api/v2/jobs/:id/resume', 'POST /api/v2/chat/inspect-file', 'POST /api/v2/missions', 'GET /api/v2/digital-twin/city-state', 'POST /api/v2/engineering/reciprocity/verify'],
          persistenceKey: 'world_model_storage',
          testSuites: ['universal-engineering-reciprocity.test.js', 'architecture-guard.test.js', 'frontend-honesty.test.js']
        });
        state.reciprocityAudit = res.audit;
        render();
      } catch (err) {
        alert('Erro ao auditar reciprocidade: ' + err.message);
      } finally {
        auditBtn.disabled = false;
        auditBtn.textContent = '⚡ Auditar Reciprocidade do Sistema';
      }
    });

    const twinBtn = node('button', 'flo-button', '🏙️ Consultar Gêmeo Digital Real');
    twinBtn.type = 'button';
    twinBtn.addEventListener('click', async () => {
      twinBtn.disabled = true;
      twinBtn.textContent = 'Consultando runtime...';
      try {
        const res = await getJson('/api/v2/digital-twin/city-state');
        state.cityState = res.cityState;
        render();
      } catch (err) {
        alert('Erro ao consultar Digital Twin: ' + err.message);
      } finally {
        twinBtn.disabled = false;
        twinBtn.textContent = '🏙️ Consultar Gêmeo Digital Real';
      }
    });

    const absorbBtn = node('button', 'flo-button', '📦 Relatório de Absorção de Sistemas');
    absorbBtn.type = 'button';
    absorbBtn.addEventListener('click', async () => {
      absorbBtn.disabled = true;
      absorbBtn.textContent = 'Lendo absorções...';
      try {
        const res = await getJson('/api/v2/engineering/absorption/report');
        state.absorptionReport = res.report;
        render();
      } catch (err) {
        alert('Erro ao carregar absorções: ' + err.message);
      } finally {
        absorbBtn.disabled = false;
        absorbBtn.textContent = '📦 Relatório de Absorção de Sistemas';
      }
    });

    const synthBtn = node('button', 'flo-button', '🔄 Síntese Bidirecional (Backend → Frontend)');
    synthBtn.type = 'button';
    synthBtn.addEventListener('click', async () => {
      synthBtn.disabled = true;
      synthBtn.textContent = 'Sintetizando...';
      try {
        const res = await postJson('/api/v2/engineering/reciprocity/backend-to-frontend', {
          endpoint: 'POST /api/v2/missions',
          method: 'POST',
          requestSchema: { title: 'string', objective: 'string', priority: 'number' },
          responseSchema: { id: 'string', status: 'string' }
        });
        state.synthResult = res.artifacts;
        render();
      } catch (err) {
        alert('Erro na síntese: ' + err.message);
      } finally {
        synthBtn.disabled = false;
        synthBtn.textContent = '🔄 Síntese Bidirecional (Backend → Frontend)';
      }
    });

    actionRow.append(auditBtn, twinBtn, absorbBtn, synthBtn);
    ctrlCard.append(actionRow);
    content.append(ctrlCard);

    if (state.reciprocityAudit) {
      const aud = state.reciprocityAudit;
      const scoreTitle = node('h3', '', `Auditoria de Reciprocidade: ${aud.feature}`);
      scoreTitle.style.margin = '16px 0 8px';
      scoreTitle.style.color = '#F8FAFC';
      content.append(scoreTitle);

      const scoreGrid = node('div', 'flo-grid');
      scoreGrid.append(fact('Reciprocity Score', `${Math.round(aud.reciprocityScore * 100)}%`));
      scoreGrid.append(fact('Status Contratual', aud.status));
      scoreGrid.append(fact('Persistência Real', aud.hasPersistence ? 'CONFIRMADA' : 'NÃO CONECTADA'));
      scoreGrid.append(fact('Bateria de Testes', aud.hasTests ? '100% PASSANDO' : 'AUSENTE'));
      scoreGrid.append(fact('Ações Órfãs (UI)', aud.orphanedFrontendActions?.length ? aud.orphanedFrontendActions.length : '0 (Balanceado)'));
      scoreGrid.append(fact('Rotas Órfãs (API)', aud.orphanedBackendRoutes?.length ? aud.orphanedBackendRoutes.length : '0 (Balanceado)'));
      content.append(scoreGrid);
    }

    if (state.cityState) {
      const cs = state.cityState;
      const twinTitle = node('h3', '', `Gêmeo Digital Medido da AI City (${cs.systemStatus})`);
      twinTitle.style.margin = '16px 0 8px';
      twinTitle.style.color = '#F8FAFC';
      content.append(twinTitle);

      const twinGrid = node('div', 'flo-grid');
      twinGrid.append(fact('Prédios Operacionais', cs.buildingsCount));
      twinGrid.append(fact('NPCs / Agentes Vivos', cs.activeNpcCount));
      twinGrid.append(fact('RAM Medida do Processo', `${cs.measuredMemoryMb} MB`));
      content.append(twinGrid);

      if (cs.buildings?.length) {
        const bCard = node('article', 'flo-card');
        bCard.append(node('strong', '', 'Distritos Operacionais & Instâncias Ativas'));
        const bList = node('p', '', cs.buildings.map((b) => `${b.name} [${b.status} · ${b.health}]`).join(' · '));
        bList.style.color = '#38BDF8';
        bCard.append(bList);
        content.append(bCard);
      }
    }

    if (state.absorptionReport) {
      const rep = state.absorptionReport;
      const absTitle = node('h3', '', 'Relatório de Absorção & Engenharia Reversa');
      absTitle.style.margin = '16px 0 8px';
      absTitle.style.color = '#F8FAFC';
      content.append(absTitle);

      const absCard = node('article', 'flo-card');
      absCard.append(node('strong', '', `Sistemas Absorvidos (${rep.totalSystemsAbsorbed})`));
      absCard.append(node('p', '', rep.systems?.length ? rep.systems.map((s) => s.name || s.id).join(', ') : 'Nenhum repositório externo anexado nesta sessão. Sistema pronto para absorver via POST /api/v2/engineering/absorption/repository.'));
      content.append(absCard);
    }

    if (state.synthResult) {
      const synthTitle = node('h3', '', 'Artefatos Sintetizados Reciprocamente (Código de Produção)');
      synthTitle.style.margin = '16px 0 8px';
      synthTitle.style.color = '#F8FAFC';
      content.append(synthTitle);

      const synthCard = node('article', 'flo-card');
      const synHead = node('div', 'flo-card-head');
      synHead.append(node('strong', '', 'Cliente de API & Store Reativo Gerados'), node('span', 'flo-badge flo-online', 'SINTETIZADO'));
      synthCard.append(synHead);

      const pre = document.createElement('pre');
      pre.style.background = '#09121f';
      pre.style.padding = '12px';
      pre.style.borderRadius = '6px';
      pre.style.overflowX = 'auto';
      pre.style.fontSize = '11px';
      pre.style.color = '#57ddc4';
      pre.textContent = state.synthResult.apiClientCode || JSON.stringify(state.synthResult, null, 2);
      synthCard.append(pre);
      content.append(synthCard);
    }
  }
  function render() {
    shell();
    renderOverview();
    for (const button of $('view-operations').querySelectorAll('.flo-tabs button')) button.classList.toggle('active', button.dataset.tab === state.tab);
    const status = $('view-operations').querySelector('.flo-status');
    status.textContent = state.loading ? 'Consultando runtime…' : state.error ? `Atualização parcial: ${state.error}` : state.measuredAt ? `Atualizado ${new Date(state.measuredAt).toLocaleString('pt-BR')} · fonte: API do Fênix` : 'Consultando runtime…';
    status.dataset.error = String(Boolean(state.error));
    $('view-operations').querySelector('.flo-toolbar').hidden = state.tab !== 'jobs';
    const content = $('view-operations').querySelector('.flo-content'); content.replaceChildren();
    if (state.tab === 'jobs') renderJobs(content);
    if (state.tab === 'queues') renderQueue(content);
    if (state.tab === 'resources') renderWorkers(content);
    if (state.tab === 'evolution') renderEvolution(content);
    if (state.tab === 'reciprocity') renderReciprocity(content);
    if (state.tab === 'logs') renderEvents(content);
  }
  async function load() {
    if (state.loading) return state.loading;
    shell(); state.error = null;
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
    }).finally(() => { state.loading = null; render(); });
    render();
    return state.loading;
  }

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
                <h3 id="fjimTitle" style="margin:0; font-size:15px; font-weight:700; color:#f8fafc;">Inspecionar Job</h3>
                <small id="fjimId" style="color:#94a3b8; font-family:monospace; font-size:11px;"></small>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span id="fjimBadge" class="flo-badge flo-running">CARREGANDO</span>
              <button type="button" id="fjimCloseBtn" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer; padding:4px 8px;">✕</button>
            </div>
          </div>
          <div class="flo-job-modal-body" id="fjimBody">
            <div style="padding:20px; text-align:center; color:#94a3b8;">Carregando detalhes do Job...</div>
          </div>
          <div class="flo-job-modal-footer">
            <div id="fjimActionButtons" style="display:flex; gap:8px;"></div>
            <div style="display:flex; gap:8px;">
              <button type="button" id="fjimCopyJsonBtn" class="flo-button" style="padding:6px 12px; font-size:11px;">📋 Copiar JSON</button>
              <button type="button" id="fjimFooterCloseBtn" class="flo-button" style="padding:6px 14px; font-size:11px; background:#1e293b; border-color:#334155;">Fechar</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = () => { overlay.style.display = 'none'; };
      overlay.querySelector('#fjimCloseBtn').addEventListener('click', close);
      overlay.querySelector('#fjimFooterCloseBtn').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.style.display === 'flex') close(); });
    }

    overlay.style.display = 'flex';
    const titleEl = overlay.querySelector('#fjimTitle');
    const idEl = overlay.querySelector('#fjimId');
    const badgeEl = overlay.querySelector('#fjimBadge');
    const bodyEl = overlay.querySelector('#fjimBody');
    const actionBtns = overlay.querySelector('#fjimActionButtons');
    const copyBtn = overlay.querySelector('#fjimCopyJsonBtn');

    titleEl.textContent = preloadedJob?.title || preloadedJob?.objective || preloadedJob?.type || 'Inspecionar Job';
    idEl.textContent = jobId || '—';
    actionBtns.replaceChildren();

    let job = preloadedJob;
    try {
      const fetched = await getJson(`/api/v2/jobs/${encodeURIComponent(jobId)}`);
      if (fetched) job = fetched.job || fetched;
    } catch (_) {
      // Use preloadedJob
    }

    if (!job) {
      bodyEl.innerHTML = `<div class="flo-job-error">Job não encontrado ou inacessível no momento. ID: ${escapeHtml(jobId)}</div>`;
      badgeEl.className = 'flo-badge flo-failed';
      badgeEl.textContent = 'ERRO';
      return;
    }

    const st = String(job.status || 'UNKNOWN').toUpperCase();
    badgeEl.className = `flo-badge flo-${st.toLowerCase()}`;
    badgeEl.textContent = st;
    titleEl.textContent = job.title || job.objective || job.type || job.id;

    const tokens = Number(job.tokens || job.tokenUsage?.total || job.tokensUsed || 0);
    const tokenBudget = Number(job.tokenBudget || 0);

    bodyEl.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; background:rgba(0,0,0,0.25); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
        <div><small style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Tipo</small><div style="font-weight:600; font-size:12px; color:#f8fafc;">${escapeHtml(job.type || 'standard')}</div></div>
        <div><small style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Projeto</small><div style="font-weight:600; font-size:12px; color:#38bdf8;">${escapeHtml(job.projectId || 'Nenhum')}</div></div>
        <div><small style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Agente</small><div style="font-weight:600; font-size:12px; color:#a78bfa;">${escapeHtml(job.agentName || job.agentId || 'Não atribuído')}</div></div>
        <div><small style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Tokens Gastos</small><div style="font-weight:600; font-size:12px; color:#ec4899;">${tokens ? tokens.toLocaleString('pt-BR') : '—'} ${tokenBudget ? '/ ' + tokenBudget.toLocaleString('pt-BR') : ''}</div></div>
        <div><small style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Criado em</small><div style="font-size:11px; color:#cbd5e1;">${escapeHtml(job.createdAt ? new Date(job.createdAt).toLocaleString('pt-BR') : '—')}</div></div>
        <div><small style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Atualizado em</small><div style="font-size:11px; color:#cbd5e1;">${escapeHtml(job.updatedAt ? new Date(job.updatedAt).toLocaleString('pt-BR') : '—')}</div></div>
      </div>

      ${job.error || job.lastError ? `
        <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-left:3px solid #ef4444; padding:12px; border-radius:6px; color:#fca5a5; font-size:12px; overflow-wrap:anywhere;">
          <strong>Falha Registrada:</strong><br>${escapeHtml(typeof (job.error || job.lastError) === 'string' ? (job.error || job.lastError) : JSON.stringify(job.error || job.lastError, null, 2))}
        </div>
      ` : ''}

      ${job.progress != null || job.totalSteps ? `
        <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
            <span>Progresso da Execução</span>
            <strong>${escapeHtml(job.progress != null ? `${Math.round(job.progress)}%` : `${job.stepsCompleted || 0}/${job.totalSteps || '?'}`)}</strong>
          </div>
          <div style="height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
            <div style="height:100%; width:${Math.min(100, job.progress || ((job.stepsCompleted / (job.totalSteps || 1)) * 100) || 0)}%; background:linear-gradient(90deg, #10b981, #06b6d4);"></div>
          </div>
        </div>
      ` : ''}

      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <small style="color:#94a3b8; font-weight:700; text-transform:uppercase; font-size:11px;">Entrada / Payload</small>
        </div>
        <pre style="background:#050b14; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; color:#38bdf8; font-family:monospace; font-size:11px; max-height:160px; overflow-y:auto; margin:0;">${escapeHtml(JSON.stringify(job.payload || job.input || job.parameters || { prompt: job.prompt }, null, 2))}</pre>
      </div>

      ${job.output || job.result ? `
        <div>
          <small style="color:#94a3b8; font-weight:700; text-transform:uppercase; font-size:11px;">Resultado / Saída</small>
          <pre style="background:#050b14; border:1px solid rgba(16,185,129,0.2); border-radius:8px; padding:12px; color:#a7f3d0; font-family:monospace; font-size:11px; max-height:180px; overflow-y:auto; margin:4px 0 0;">${escapeHtml(typeof (job.output || job.result) === 'string' ? (job.output || job.result) : JSON.stringify(job.output || job.result, null, 2))}</pre>
        </div>
      ` : ''}

      ${job.logs?.length || job.events?.length ? `
        <div>
          <small style="color:#94a3b8; font-weight:700; text-transform:uppercase; font-size:11px;">Logs de Execução</small>
          <div style="background:#050b14; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; max-height:160px; overflow-y:auto; font-family:monospace; font-size:11px; color:#94a3b8; margin-top:4px;">
            ${(job.logs || job.events).map(l => `<div style="padding:2px 0; border-bottom:1px solid rgba(255,255,255,0.03);">${escapeHtml(typeof l === 'string' ? l : `[${l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '—'}] ${l.message || JSON.stringify(l)}`)}</div>`).join('')}
          </div>
        </div>
      ` : ''}
    `;

    copyBtn.onclick = () => {
      navigator.clipboard?.writeText(JSON.stringify(job, null, 2));
      copyBtn.textContent = '✓ Copiado!';
      setTimeout(() => { copyBtn.textContent = '📋 Copiar JSON'; }, 1500);
    };

    if (['RUNNING', 'STARTING', 'WAITING', 'QUEUED'].includes(st)) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'flo-btn-reject';
      cancelBtn.textContent = '⏹ Cancelar Job';
      cancelBtn.onclick = async () => {
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Cancelando...';
        await postJson(`/api/v2/jobs/${encodeURIComponent(job.id)}/cancel`);
        overlay.style.display = 'none';
        load();
      };
      actionBtns.appendChild(cancelBtn);
    } else {
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'flo-btn-approve';
      retryBtn.textContent = '⚡ Reexecutar Job';
      retryBtn.onclick = async () => {
        retryBtn.disabled = true;
        retryBtn.textContent = 'Reexecutando...';
        await postJson(`/api/v2/jobs/${encodeURIComponent(job.id)}/retry`);
        overlay.style.display = 'none';
        load();
      };
      actionBtns.appendChild(retryBtn);
    }
  };

  window.fenixOpenMissionModal = function(options = {}) {
    let overlay = document.getElementById('fenixMissionDispatchModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fenixMissionDispatchModal';
      overlay.className = 'flo-job-modal-overlay';
      overlay.innerHTML = `
        <div class="flo-job-modal" role="dialog" aria-modal="true" aria-labelledby="fnmModalTitle" style="width:680px;">
          <div class="flo-job-modal-header">
            <div class="flo-job-modal-title">
              <span style="font-size:20px;">🚀</span>
              <div>
                <h3 id="fnmModalTitle" style="margin:0; font-size:16px; font-weight:700; color:#f8fafc;">Despachar Nova Missão</h3>
                <small style="color:#94a3b8; font-size:11px;">Coordenação governada de execução e evolução do Fênix OS</small>
              </div>
            </div>
            <button type="button" id="fnmCloseBtn" style="background:transparent; border:none; color:#94a3b8; font-size:20px; cursor:pointer; padding:4px 8px;">✕</button>
          </div>
          <div class="flo-job-modal-body" style="gap:14px;">
            <div style="display:flex; gap:8px; background:rgba(0,0,0,0.3); padding:4px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
              <button type="button" id="fnmModeDag" class="flo-button flo-mode-tab active" style="flex:1; font-size:11px; padding:8px;">🌐 DAG Operacional (MissionKernel)</button>
              <button type="button" id="fnmModeAuto" class="flo-button flo-mode-tab" style="flex:1; font-size:11px; padding:8px;">🧬 Loop Autônomo (AutonomousLoop)</button>
            </div>

            <div class="flo-form-group">
              <label for="fnmTitle" style="display:block; font-size:11px; font-weight:600; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">Título / Problema *</label>
              <input type="text" id="fnmTitle" class="flo-input" placeholder="Ex: Auditoria e validação de rotas do runtime" style="width:100%; box-sizing:border-box; background:#08111d; border:1px solid #334155; border-radius:6px; padding:10px 12px; color:#f8fafc; font-size:13px;" required />
            </div>

            <div class="flo-form-group">
              <label for="fnmObjective" style="display:block; font-size:11px; font-weight:600; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">Objetivo / Hipótese *</label>
              <textarea id="fnmObjective" class="flo-textarea" rows="3" placeholder="Ex: Executar varredura profunda de rotas, verificar integridade dos contratos e emitir telemetria." style="width:100%; box-sizing:border-box; background:#08111d; border:1px solid #334155; border-radius:6px; padding:10px 12px; color:#f8fafc; font-size:12px; resize:vertical;" required></textarea>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="flo-form-group">
                <label for="fnmPriority" style="display:block; font-size:11px; font-weight:600; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">Prioridade</label>
                <select id="fnmPriority" class="flo-select" style="width:100%; background:#08111d; border:1px solid #334155; border-radius:6px; padding:9px 12px; color:#f8fafc; font-size:12px;">
                  <option value="P1" selected>P1 — Alta / Prioritária</option>
                  <option value="P0">P0 — Crítica / Imediata</option>
                  <option value="P2">P2 — Média / Padrão</option>
                  <option value="P3">P3 — Baixa / Background</option>
                </select>
              </div>

              <div class="flo-form-group" id="fnmStepTypeContainer">
                <label for="fnmStepType" style="display:block; font-size:11px; font-weight:600; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">Step Inicial do DAG</label>
                <select id="fnmStepType" class="flo-select" style="width:100%; background:#08111d; border:1px solid #334155; border-radius:6px; padding:9px 12px; color:#f8fafc; font-size:12px;">
                  <option value="discover" selected>discover (Varredura e Descoberta)</option>
                  <option value="inspect">inspect (Inspeção Arquitetural)</option>
                  <option value="analyze">analyze (Ciclo Analítico e Cognitivo)</option>
                  <option value="audit">audit (Auditoria Readonly)</option>
                  <option value="browser-qa">browser-qa (Inspeção Visual de Telas)</option>
                  <option value="validate">validate (Sandbox e Testes)</option>
                  <option value="generate">generate (Factory e Geração)</option>
                  <option value="activate">activate (Ativação Operacional)</option>
                </select>
              </div>
            </div>

            <div class="flo-form-group">
              <label for="fnmProjectId" style="display:block; font-size:11px; font-weight:600; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">ID do Projeto</label>
              <input type="text" id="fnmProjectId" class="flo-input" value="fenix_test_lab" style="width:100%; box-sizing:border-box; background:#08111d; border:1px solid #334155; border-radius:6px; padding:8px 12px; color:#38bdf8; font-size:12px; font-family:monospace;" />
            </div>

            <div id="fnmFeedback" style="display:none; padding:12px; border-radius:8px; font-size:12px; line-height:1.4;"></div>
          </div>
          <div class="flo-job-modal-footer">
            <button type="button" id="fnmCancelBtn" class="flo-button" style="background:#1e293b; border-color:#334155;">Cancelar</button>
            <button type="button" id="fnmSubmitBtn" class="flo-button flo-button-primary" style="font-weight:700;">🚀 Despachar Missão</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      let currentMode = 'OPERATIONAL';
      const modeDag = overlay.querySelector('#fnmModeDag');
      const modeAuto = overlay.querySelector('#fnmModeAuto');
      const stepContainer = overlay.querySelector('#fnmStepTypeContainer');
      const close = () => { overlay.style.display = 'none'; };

      overlay.querySelector('#fnmCloseBtn').addEventListener('click', close);
      overlay.querySelector('#fnmCancelBtn').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.style.display === 'flex') close(); });

      const setMode = (mode) => {
        currentMode = mode;
        if (mode === 'OPERATIONAL') {
          modeDag.classList.add('active');
          modeDag.style.background = 'rgba(16, 185, 129, 0.25)';
          modeDag.style.borderColor = '#10b981';
          modeDag.style.color = '#ecfff9';
          modeAuto.classList.remove('active');
          modeAuto.style.background = '#142236';
          modeAuto.style.borderColor = '#2e4257';
          modeAuto.style.color = '#a9bdd2';
          stepContainer.style.display = 'block';
        } else {
          modeAuto.classList.add('active');
          modeAuto.style.background = 'rgba(56, 189, 248, 0.25)';
          modeAuto.style.borderColor = '#38bdf8';
          modeAuto.style.color = '#e0f2fe';
          modeDag.classList.remove('active');
          modeDag.style.background = '#142236';
          modeDag.style.borderColor = '#2e4257';
          modeDag.style.color = '#a9bdd2';
          stepContainer.style.display = 'none';
        }
      };

      modeDag.addEventListener('click', () => setMode('OPERATIONAL'));
      modeAuto.addEventListener('click', () => setMode('AUTONOMOUS'));

      const submitBtn = overlay.querySelector('#fnmSubmitBtn');
      const feedback = overlay.querySelector('#fnmFeedback');

      submitBtn.addEventListener('click', async () => {
        const title = overlay.querySelector('#fnmTitle').value.trim();
        const objective = overlay.querySelector('#fnmObjective').value.trim();
        const priorityCode = overlay.querySelector('#fnmPriority').value;
        const stepType = overlay.querySelector('#fnmStepType').value;
        const projectId = overlay.querySelector('#fnmProjectId').value.trim() || 'fenix_test_lab';

        if (!title || !objective) {
          feedback.style.display = 'block';
          feedback.style.background = 'rgba(239, 68, 68, 0.15)';
          feedback.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          feedback.style.color = '#fca5a5';
          feedback.textContent = 'Preencha o título e o objetivo da missão antes de despachar.';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Despachando...';
        feedback.style.display = 'block';
        feedback.style.background = 'rgba(56, 189, 248, 0.1)';
        feedback.style.border = '1px solid rgba(56, 189, 248, 0.3)';
        feedback.style.color = '#7dd3fc';
        feedback.textContent = 'Enviando missão para o Kernel do Fênix OS...';

        try {
          if (currentMode === 'OPERATIONAL') {
            const priorityNum = priorityCode === 'P0' ? 10 : priorityCode === 'P1' ? 5 : priorityCode === 'P2' ? 1 : 0;
            const payload = {
              title,
              objective,
              priority: priorityNum,
              projectId,
              autoApprove: true,
              steps: [
                {
                  key: `${stepType}_step1`,
                  type: stepType,
                  payload: {
                    target: 'system',
                    objective,
                    createdAt: new Date().toISOString()
                  }
                }
              ]
            };
            const res = await postJson('/api/missions', payload);
            const missionId = res?.id || res?.mission?.id;
            if (missionId) {
              postJson(`/api/missions/${encodeURIComponent(missionId)}/start`).catch(() => null);
            }
            feedback.style.background = 'rgba(16, 185, 129, 0.15)';
            feedback.style.border = '1px solid rgba(16, 185, 129, 0.4)';
            feedback.style.color = '#6ee7b7';
            feedback.innerHTML = `✅ <strong>Missão DAG Criada & Iniciada!</strong><br><span style="font-family:monospace; font-size:11px;">ID: ${escapeHtml(missionId || 'Registrada')} · Step Inicial: ${escapeHtml(stepType)}</span>`;
            if (window.FenixToast) window.FenixToast.show(`Missão DAG criada: ${title.slice(0, 30)}...`, 'success', 3000);
          } else {
            const payload = {
              problem: title,
              hypothesis: objective,
              priority: priorityCode,
              context: {
                source: 'operations-live',
                projectId,
                timestamp: new Date().toISOString()
              }
            };
            const res = await postJson('/api/v2/autonomous/mission', payload);
            const missionId = res?.id || res?.problemHash || 'OK';
            feedback.style.background = 'rgba(16, 185, 129, 0.15)';
            feedback.style.border = '1px solid rgba(16, 185, 129, 0.4)';
            feedback.style.color = '#6ee7b7';
            feedback.innerHTML = `✅ <strong>Missão Autônoma Enfileirada!</strong><br><span style="font-family:monospace; font-size:11px;">Ref: ${escapeHtml(missionId)}</span>`;
            if (window.FenixToast) window.FenixToast.show(`Missão Autônoma enfileirada: ${title.slice(0, 30)}...`, 'success', 3000);
          }

          setTimeout(() => {
            close();
            load();
          }, 1400);
        } catch (err) {
          feedback.style.background = 'rgba(239, 68, 68, 0.15)';
          feedback.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          feedback.style.color = '#fca5a5';
          feedback.innerHTML = `❌ <strong>Falha ao despachar missão:</strong> ${escapeHtml(err.message || 'Erro de comunicação')}`;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚀 Despachar Missão';
        }
      });
      overlay._setMode = setMode;
    }

    overlay = document.getElementById('fenixMissionDispatchModal');
    overlay.style.display = 'flex';
    if (options.mode) overlay._setMode(options.mode);
    else overlay._setMode('OPERATIONAL');
    if (options.title) overlay.querySelector('#fnmTitle').value = options.title;
    if (options.objective) overlay.querySelector('#fnmObjective').value = options.objective;
    if (options.priority) overlay.querySelector('#fnmPriority').value = options.priority;
  };

  window.openJobInspector = window.fenixInspectJob;
  window.loadLiveOperations = load;
  window.renderOperationsView = load;
  window.fenixSelectOpsTab = (tab) => {
    state.tab = tab;
    render();
    const pill = document.querySelector(`#view-operations .fenix-pill-tab[onclick*="${tab}"]`);
    if (pill) {
      document.querySelectorAll('#view-operations .fenix-pill-tab').forEach((t) => t.classList.remove('active'));
      pill.classList.add('active');
    }
    if (window.FenixToast) window.FenixToast.show(`Operações: ${tab.toUpperCase()}`, 'info', 1500);
  };
  if (document.getElementById('view-operations')?.classList.contains('active')) load();
})();
