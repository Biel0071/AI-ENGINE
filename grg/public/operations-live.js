(() => {
  const state = { tab: 'jobs', jobFilter: 'all', query: '', snapshot: null, workers: null, events: null, error: null, measuredAt: null, loading: null };
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
  function shell() {
    const view = $('view-operations');
    if (!view || view.dataset.liveOperations === 'true') return;
    view.dataset.liveOperations = 'true';
    view.replaceChildren();
    const main = node('main', 'fenix-live-operations');
    const header = node('header', 'flo-header');
    const title = node('div');
    title.append(node('span', 'flo-eyebrow', 'JOB ENGINE · DADOS DO RUNTIME'), node('h1', '', 'Operações'), node('p', '', 'Jobs, fila, workers e eventos medidos no Fênix.'));
    const refresh = node('button', 'flo-button', '↻ Atualizar'); refresh.type = 'button'; refresh.addEventListener('click', load);
    header.append(title, refresh);
    const tabs = node('nav', 'flo-tabs'); tabs.setAttribute('aria-label', 'Áreas de operações');
    for (const [key, label] of [['jobs', 'Jobs'], ['queues', 'Filas'], ['resources', 'Recursos'], ['logs', 'Eventos']]) {
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
    const metrics = [
      ['Em execução', state.snapshot ? count('RUNNING') : '—', 'active'],
      ['Na fila', state.snapshot ? count('QUEUED', 'WAITING', 'READY', 'RETRYING') : '—', 'waiting'],
      ['Falhas registradas', state.snapshot ? count('FAILED', 'DEAD_LETTER') : '—', 'failed'],
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
      top.append(node('strong', '', job.title || job.objective || job.type || job.id), node('span', `flo-badge flo-${String(job.status || '').toLowerCase()}`, job.status || 'UNKNOWN'));
      card.append(top, node('p', '', `${job.projectId || 'Projeto não informado'} · ${job.agentName || job.agentId || 'Agente não informado'}`));
      card.append(node('small', '', `${job.id} · ${job.createdAt ? new Date(job.createdAt).toLocaleString('pt-BR') : 'Data indisponível'}`));
      if (job.error || job.lastError) { const failure = job.error || job.lastError; card.append(node('p', 'flo-job-error', typeof failure === 'string' ? failure : JSON.stringify(failure))); }
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
  function renderEvents(content) {
    const events = state.events?.events || [];
    if (!events.length) { content.append(node('p', 'flo-empty', 'Nenhum evento recente registrado.')); return; }
    for (const event of events.slice().reverse().slice(0, 60)) {
      const card = node('article', 'flo-card');
      const top = node('div', 'flo-card-head'); top.append(node('strong', '', event.type || event.kind || 'Evento'), node('small', '', event.createdAt || event.timestamp || ''));
      card.append(top, node('p', '', event.summary || event.description || event.id || 'Evento sem descrição.')); content.append(card);
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
    if (state.tab === 'logs') renderEvents(content);
  }
  async function load() {
    if (state.loading) return state.loading;
    shell(); state.error = null;
    state.loading = Promise.allSettled([getJson('/api/v2/jobs'), getJson('/api/workers'), getJson('/api/events?limit=60')]).then((results) => {
      ['snapshot', 'workers', 'events'].forEach((key, index) => { if (results[index].status === 'fulfilled') state[key] = results[index].value; });
      state.error = results.map((item, index) => item.status === 'rejected' ? `${['Jobs', 'Workers', 'Eventos'][index]} indisponíveis` : null).filter(Boolean).join(' · ') || null;
      state.measuredAt = new Date().toISOString();
    }).finally(() => { state.loading = null; render(); });
    render();
    return state.loading;
  }
  window.loadLiveOperations = load;
  window.renderOperationsView = load;
  window.fenixSelectOpsTab = (tab) => { state.tab = tab === 'logs' ? 'logs' : tab; render(); };
  if (document.getElementById('view-operations')?.classList.contains('active')) load();
})();
