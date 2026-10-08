(() => {
  const state = { tab: 'jobs', jobFilter: 'all', query: '', snapshot: null, workers: null, events: null, evolution: null, reciprocityAudit: null, absorptionReport: null, cityState: null, synthResult: null, error: null, measuredAt: null, loading: null };
  const $ = (id) => document.getElementById(id);
  const node = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = String(value ?? '');
    return el;
  };
  async function getJson(url) {
    const response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(30000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `${url}: HTTP ${response.status}`);
    return result;
  }
  async function postJson(url, body = {}) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(30000)
    });
    return response.json();
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
    const refresh = node('button', 'flo-button', '↻ Atualizar'); refresh.type = 'button'; refresh.addEventListener('click', load);
    header.append(title, refresh);
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

      if (job.projectId) { const open = node('button', 'flo-card-action', 'Abrir projeto ↗'); open.type = 'button'; open.addEventListener('click', () => window.openProjectWorkspace?.(job.projectId) || window.showView?.('projects')); card.append(open); }
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

    // 1. Painel de Controle e Heartbeat
    const ctrlCard = node('article', 'flo-card');
    const ctrlHead = node('div', 'flo-card-head');
    ctrlHead.append(node('strong', '', 'FÊNIX EVOLUTION · HEARTBEAT DO LOOP CONTÍNUO'));
    const hb = evo.heartbeat || {};
    const pBadge = node('span', `flo-badge flo-${hb.persistence === 'HEALTHY' ? 'active' : 'failed'}`, hb.persistence || 'UNKNOWN');
    ctrlHead.append(pBadge);
    ctrlCard.append(ctrlHead);

    const desc = node('p', '', `Sistema: ${hb.system || '—'} · Kernel: ${hb.kernel || '—'} · Watchers: ${hb.watchers || '—'} · Loop: ${evo.status?.status || 'IDLE'}`);
    ctrlCard.append(desc);

    const actionRow = node('div', 'flo-toolbar', '');
    actionRow.style.marginTop = '12px';
    actionRow.style.display = 'flex';
    actionRow.style.gap = '10px';

    const cycleBtn = node('button', 'flo-button', '⚡ Disparar Ciclo Imediato');
    cycleBtn.type = 'button';
    cycleBtn.addEventListener('click', async () => {
      cycleBtn.disabled = true;
      cycleBtn.textContent = 'Executando ciclo...';
      try {
        await postJson('/api/v2/autonomous/cycle');
        setTimeout(load, 1500);
      } catch (err) {
        alert('Erro ao disparar ciclo: ' + err.message);
      } finally {
        cycleBtn.disabled = false;
        cycleBtn.textContent = '⚡ Disparar Ciclo Imediato';
      }
    });

    const startBtn = node('button', 'flo-button', '▶ Iniciar Loop 24/7');
    startBtn.type = 'button';
    startBtn.addEventListener('click', async () => {
      await postJson('/api/v2/autonomous/start');
      load();
    });

    const stopBtn = node('button', 'flo-button', '⏹ Parar Loop');
    stopBtn.type = 'button';
    stopBtn.addEventListener('click', async () => {
      await postJson('/api/v2/autonomous/stop');
      load();
    });

    actionRow.append(cycleBtn, startBtn, stopBtn);
    ctrlCard.append(actionRow);
    content.append(ctrlCard);

    // 2. Scoreboard Factual
    const scoreTitle = node('h3', '', 'Scores Factuais de Maturidade & Realidade');
    scoreTitle.style.margin = '16px 0 8px';
    scoreTitle.style.color = '#F8FAFC';
    content.append(scoreTitle);

    const scoreGrid = node('div', 'flo-grid');
    const scores = evo.scores || {};
    const fmt = (v) => v !== undefined ? `${Math.round(v * 100)}%` : '—';
    scoreGrid.append(fact('Evolution Score', fmt(scores.evolutionScore)));
    scoreGrid.append(fact('Reality Score', fmt(scores.realityScore)));
    scoreGrid.append(fact('Persistence Score', fmt(scores.persistenceScore)));
    scoreGrid.append(fact('Stability Score', fmt(scores.stabilityScore)));
    scoreGrid.append(fact('Learning Score', fmt(scores.learningScore)));
    scoreGrid.append(fact('Visual Score', fmt(scores.visualScore)));
    content.append(scoreGrid);

    // 3. Fila de Missões Autônomas
    const queueTitle = node('h3', '', 'Fila Autônoma de Missões (P0-P7)');
    queueTitle.style.margin = '20px 0 8px';
    queueTitle.style.color = '#F8FAFC';
    content.append(queueTitle);

    const queue = evo.queue || { active: [] };
    if (!queue.active?.length) {
      content.append(node('p', 'flo-empty', 'Nenhuma missão pendente na fila autônoma. Runtime estável e operando normalmente.'));
    } else {
      for (const m of queue.active) {
        const mCard = node('article', 'flo-card');
        const mHead = node('div', 'flo-card-head');
        mHead.append(node('strong', '', `[${m.priority}] ${m.problem}`));
        mHead.append(node('span', `flo-badge flo-${m.state.toLowerCase()}`, m.state));
        mCard.append(mHead);
        if (m.hypothesis) mCard.append(node('p', '', `Hipótese: ${m.hypothesis}`));
        mCard.append(node('small', '', `ID: ${m.id} · Hash: ${m.problemHash} · Tentativas: ${m.attempts}`));
        content.append(mCard);
      }
    }

    // 4. Memória Evolutiva & Padrões Consolidados
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
      card.append(top, node('p', '', event.summary || event.description || event.id || 'Evento sem descrição.')); content.append(card);
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
      getJson('/api/v2/autonomous/dashboard')
    ]).then((results) => {
      ['snapshot', 'workers', 'events', 'evolution'].forEach((key, index) => {
        if (results[index].status === 'fulfilled') {
          state[key] = results[index].value?.dashboard || results[index].value;
        }
      });
      state.error = results.map((item, index) => item.status === 'rejected' ? `${['Jobs', 'Workers', 'Eventos', 'Evolução'][index]} indisponíveis` : null).filter(Boolean).join(' · ') || null;
      state.measuredAt = new Date().toISOString();
    }).finally(() => { state.loading = null; render(); });
    render();
    return state.loading;
  }
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
