(() => {
  const state = { tab: 'jobs', snapshot: null, workers: null, events: null, error: null, measuredAt: null };
  const $ = (id) => document.getElementById(id);
  const node = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = String(value ?? '');
    return el;
  };
  async function getJson(url) {
    const response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(20000) });
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
    main.append(header, tabs, node('p', 'flo-status'), node('section', 'flo-content'));
    view.append(main);
  }
  function fact(label, value) {
    const box = node('div', 'flo-fact'); box.append(node('span', '', label), node('strong', '', value)); return box;
  }
  function renderJobs(content) {
    const jobs = state.snapshot?.jobs || [];
    if (!jobs.length) { content.append(node('p', 'flo-empty', 'Nenhum job registrado no JobEngine.')); return; }
    for (const job of jobs.slice().reverse().slice(0, 80)) {
      const card = node('article', 'flo-card');
      const top = node('div', 'flo-card-head');
      top.append(node('strong', '', job.title || job.objective || job.type || job.id), node('span', `flo-badge flo-${String(job.status || '').toLowerCase()}`, job.status || 'UNKNOWN'));
      card.append(top, node('p', '', `${job.projectId || 'Projeto não informado'} · ${job.agentName || job.agentId || 'Agente não informado'}`));
      card.append(node('small', '', `${job.id} · ${job.createdAt ? new Date(job.createdAt).toLocaleString('pt-BR') : 'Data indisponível'}`));
      content.append(card);
    }
  }
  function renderQueue(content) {
    const q = state.snapshot?.queue;
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
    for (const worker of workers) {
      const card = node('article', 'flo-card');
      const top = node('div', 'flo-card-head'); top.append(node('strong', '', worker.name || worker.workerId || worker.id), node('span', 'flo-badge', worker.status || 'UNKNOWN'));
      card.append(top, node('p', '', `Último sinal: ${worker.lastSeenAt || worker.lastHeartbeat || 'indisponível'}`)); content.append(card);
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
    for (const button of $('view-operations').querySelectorAll('.flo-tabs button')) button.classList.toggle('active', button.dataset.tab === state.tab);
    const status = $('view-operations').querySelector('.flo-status');
    status.textContent = state.error ? `Falha ao atualizar: ${state.error}` : state.measuredAt ? `Atualizado ${new Date(state.measuredAt).toLocaleString('pt-BR')} · fonte: API do Fênix` : 'Consultando runtime…';
    status.dataset.error = String(Boolean(state.error));
    const content = $('view-operations').querySelector('.flo-content'); content.replaceChildren();
    if (state.tab === 'jobs') renderJobs(content);
    if (state.tab === 'queues') renderQueue(content);
    if (state.tab === 'resources') renderWorkers(content);
    if (state.tab === 'logs') renderEvents(content);
  }
  async function load() {
    shell(); state.error = null; render();
    const results = await Promise.allSettled([getJson('/api/v2/jobs'), getJson('/api/workers'), getJson('/api/events?limit=60')]);
    [state.snapshot, state.workers, state.events] = results.map((item) => item.status === 'fulfilled' ? item.value : null);
    const failures = results.filter((item) => item.status === 'rejected').map((item) => item.reason.message);
    state.error = failures.length ? failures.join(' · ') : null;
    state.measuredAt = new Date().toISOString(); render();
  }
  window.renderOperationsView = load;
  window.fenixSelectOpsTab = (tab) => { state.tab = tab === 'logs' ? 'logs' : tab; render(); };
  if (document.getElementById('view-operations')?.classList.contains('active')) load();
})();
