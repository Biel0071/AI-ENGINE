(() => {
  const view = document.getElementById('view-city');
  const area = view?.querySelector('.fenix-city-canvas-area');
  if (!area || area.querySelector('.fenix-city-brief')) return;
  const state = { projects: [], jobs: [], error: null, updatedAt: null, busy: false, collapsed: localStorage.getItem('fenix_city_brief_collapsed') === 'true' };
  const el = (tag, className, label) => { const result = document.createElement(tag); if (className) result.className = className; if (label !== undefined) result.textContent = String(label); return result; };
  const panel = el('aside', 'fenix-city-brief'); panel.setAttribute('aria-label', 'Painel ao vivo da Cidade');
  const header = el('header', 'fcb-head');
  const title = el('div'); title.append(el('span', 'fcb-eyebrow', 'AO VIVO · PROJECT KERNEL'), el('h2', '', 'Pulso da Cidade'));
  const collapse = el('button', 'fcb-collapse', '−'); collapse.type = 'button'; collapse.setAttribute('aria-label', 'Recolher painel da Cidade');
  collapse.addEventListener('click', () => { state.collapsed = !state.collapsed; localStorage.setItem('fenix_city_brief_collapsed', String(state.collapsed)); render(); });
  header.append(title, collapse);
  const body = el('div', 'fcb-body'); panel.append(header, body); area.append(panel);
  async function getJson(path) { const response = await fetch(path, { credentials: 'same-origin', signal: AbortSignal.timeout(12000) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`); return data; }
  function sectionHeading(name, action, onClick) { const row = el('div', 'fcb-section-head'); row.append(el('h3', '', name)); const button = el('button', '', action); button.type = 'button'; button.addEventListener('click', onClick); row.append(button); return row; }
  function render() {
    panel.classList.toggle('collapsed', state.collapsed);
    collapse.textContent = state.collapsed ? '+' : '−'; collapse.setAttribute('aria-label', state.collapsed ? 'Expandir painel da Cidade' : 'Recolher painel da Cidade');
    body.replaceChildren(); if (state.collapsed) return;
    const status = el('p', 'fcb-status', state.busy ? 'Sincronizando dados…' : state.error ? `Atualização parcial: ${state.error}` : state.updatedAt ? `Medido às ${new Date(state.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando dados');
    if (state.error) status.dataset.error = 'true'; body.append(status);
    const stats = el('div', 'fcb-stats');
    const running = state.jobs.filter((job) => String(job.status).toUpperCase() === 'RUNNING').length;
    const failed = state.jobs.filter((job) => ['FAILED', 'DEAD_LETTER'].includes(String(job.status).toUpperCase())).length;
    for (const [value, label] of [[state.projects.length, 'projetos'], [running, 'executando'], [failed, 'falhas']]) { const box = el('div', 'fcb-stat'); box.append(el('strong', '', value), el('span', '', label)); stats.append(box); }
    body.append(stats);
    body.append(sectionHeading('Projetos', 'Ver todos ↗', () => window.showView?.('projects')));
    const projects = el('div', 'fcb-projects');
    if (!state.projects.length) projects.append(el('p', 'fcb-empty', 'Nenhum projeto disponível.'));
    for (const project of state.projects.slice(0, 4)) {
      const button = el('button', 'fcb-project'); button.type = 'button';
      const icon = el('span', 'fcb-project-icon', (project.name || '?').trim().slice(0, 1).toUpperCase());
      const labels = el('span', 'fcb-project-label'); labels.append(el('strong', '', project.name || project.id), el('small', '', project.workspace ? 'Workspace conectado' : 'Sem workspace'));
      button.append(icon, labels, el('span', 'fcb-project-arrow', '↗'));
      button.addEventListener('click', () => window.openProjectWorkspace?.(project.id) || window.showView?.('projects'));
      projects.append(button);
    }
    body.append(projects);
    body.append(sectionHeading('Atividade recente', 'Operações ↗', () => window.showView?.('operations')));
    const activity = el('div', 'fcb-activity');
    if (!state.jobs.length) activity.append(el('p', 'fcb-empty', 'Nenhuma execução registrada.'));
    for (const job of state.jobs.slice().reverse().slice(0, 3)) {
      const item = el('button', 'fcb-job'); item.type = 'button';
      const dot = el('i', `fcb-dot fcb-${String(job.status || '').toLowerCase()}`);
      const info = el('span'); info.append(el('strong', '', job.title || job.objective || job.type || 'Job'), el('small', '', job.projectId || 'Sistema'));
      item.append(dot, info, el('em', '', job.status || '—')); item.addEventListener('click', () => window.showView?.('operations')); activity.append(item);
    }
    body.append(activity);
  }
  async function refresh() {
    if (state.busy) return; state.busy = true; render();
    const results = await Promise.allSettled([getJson('/api/fenix/projects'), getJson('/api/v2/jobs')]);
    if (results[0].status === 'fulfilled') state.projects = results[0].value.projects || [];
    if (results[1].status === 'fulfilled') state.jobs = results[1].value.jobs || [];
    state.error = results.filter((result) => result.status === 'rejected').map((result) => result.reason.message).join(' · ') || null;
    state.updatedAt = new Date().toISOString(); state.busy = false; render();
  }
  window.refreshCityBrief = refresh;
  render();
  if (view.classList.contains('active')) refresh();
  setInterval(() => { if (view.classList.contains('active') && document.visibilityState === 'visible') refresh(); }, 60000);
})();
