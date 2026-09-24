(() => {
  'use strict';
  const state = { projects: [], details: new Map(), git: new Map(), connections: new Map(), deployments: new Map(), deployTimer: null, selected: null, query: '', loading: null, error: null, measuredAt: null };
  const $ = (id) => document.getElementById(id);
  const text = (value, fallback = '—') => value == null || value === '' ? fallback : String(value);
  const date = (value) => value ? new Date(value).toLocaleString('pt-BR') : '—';
  async function json(url, options = {}) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), ...options });
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
      <header class="flp-header"><div><span class="flp-eyebrow">PROJECT KERNEL · CATÁLOGO AUTENTICADO</span><h1>Projetos em evolução</h1><p>Workspaces, jobs e artefatos medidos no runtime do Fênix.</p></div><button type="button" id="flpRefresh" class="flp-button flp-button-soft">↻ Atualizar</button></header>
      <div class="flp-status-row"><span id="flpMeasured" role="status">Carregando projetos…</span><span id="flpSource">Fonte: Project Kernel / JobEngine</span></div>
      <div class="flp-metrics"><div><span>Projetos registrados</span><strong id="flpTotal">—</strong></div><div><span>Workspaces vinculados</span><strong id="flpWorkspaces">—</strong></div><div><span>Jobs em execução</span><strong id="flpRunning">—</strong></div><div><span>Jobs com falha</span><strong id="flpFailed">—</strong></div></div>
      <div class="flp-body"><aside class="flp-sidebar"><label for="flpSearch">Encontrar projeto</label><input id="flpSearch" type="search" placeholder="Nome, ID ou workspace" autocomplete="off"><div id="flpCards" class="flp-cards"></div></aside><main id="flpDetail" class="flp-detail" aria-live="polite"></main></div>
    </section>`;
    $('flpRefresh').addEventListener('click', () => load(true));
    $('flpSearch').addEventListener('input', (event) => { state.query = event.target.value.trim().toLowerCase(); renderCards(); });
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
    const container = $('flpCards');
    if (!container) return;
    container.replaceChildren();
    const projects = state.projects.filter((project) => [project.name, project.id, project.workspace].some((value) => String(value || '').toLowerCase().includes(state.query)));
    if (!projects.length) { container.appendChild(element('p', 'flp-empty', state.projects.length ? 'Nenhum projeto corresponde à busca.' : 'Nenhum projeto registrado no Project Kernel.')); return; }
    for (const project of projects) {
      const card = element('button', `flp-card${state.selected === project.id ? ' active' : ''}`);
      card.type = 'button'; card.dataset.projectId = project.id;
      card.append(element('span', 'flp-card-kicker', project.workspace ? 'WORKSPACE CONECTADO' : 'SEM WORKSPACE'));
      card.append(element('strong', 'flp-card-title', project.name || project.id));
      card.append(element('span', 'flp-card-path', project.workspace || 'Adicione um workspace para usar a IDE'));
      const detail = state.details.get(project.id);
      card.append(element('span', 'flp-card-foot', detail ? `${detail.progress?.totalJobs || 0} job(s) · ${detail.artifacts?.length || 0} artefato(s)` : 'Estado aguardando leitura'));
      card.addEventListener('click', () => selectProject(project.id));
      container.appendChild(card);
    }
  }
  function row(label, value) {
    const line = element('div', 'flp-fact'); line.append(element('span', '', label), element('strong', '', value)); return line;
  }
  function renderDetail() {
    const target = $('flpDetail');
    if (!target) return;
    target.replaceChildren();
    const project = state.projects.find((item) => item.id === state.selected);
    if (!project) { target.appendChild(element('p', 'flp-empty', 'Selecione um projeto para inspecionar seu estado.')); return; }
    const detail = state.details.get(project.id);
    const heading = element('div', 'flp-detail-head');
    const title = element('div'); title.append(element('span', 'flp-eyebrow', 'PROJETO SELECIONADO'), element('h2', '', project.name || project.id), element('p', '', project.id));
    const actions = element('div', 'flp-actions');
    const ide = element('button', 'flp-button flp-button-primary', 'Abrir na IDE'); ide.type = 'button'; ide.disabled = !project.workspace;
    ide.addEventListener('click', async () => { window.showView?.('ide'); await window.fenixSelectIdeProject?.(project.id); });
    const analyze = element('button', 'flp-button flp-button-soft', 'Analisar Git'); analyze.type = 'button'; analyze.disabled = !project.workspace;
    analyze.addEventListener('click', async () => { analyze.disabled = true; $('flpMeasured').textContent = 'Analisando o workspace…'; try { const data = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/analyze`, { method: 'POST' }); await load(true); $('flpMeasured').textContent = `Análise registrada · HEAD ${text(data.head).slice(0, 12)}`; } catch (error) { state.error = error.message; renderMetrics(); } finally { analyze.disabled = false; } });
    actions.append(ide, analyze);
    if (project.id === 'api-platform-live') {
      const dashboard = element('a', 'flp-button flp-button-soft', 'Abrir painel da API');
      dashboard.href = `${location.protocol}//${location.hostname}:8081/`; dashboard.target = '_blank'; dashboard.rel = 'noopener noreferrer';
      actions.append(dashboard);
    }
    heading.append(title, actions); target.appendChild(heading);
    const facts = element('div', 'flp-facts');
    facts.append(row('Workspace', text(project.workspace, 'Não vinculado')), row('Branch', text(project.branch, 'Detectar no Git')), row('HEAD registrado', text(project.currentCommit, 'Ainda não analisado')), row('Atualizado', date(project.updatedAt)));
    target.appendChild(facts);
    if (project.workspace) renderGit(target, project);
    if (!detail) { target.appendChild(element('p', 'flp-empty', 'Estado do projeto indisponível.')); return; }
    const progress = element('section', 'flp-panel'); progress.append(element('h3', '', 'Execução do projeto'));
    const counts = element('div', 'flp-job-counts');
    for (const [label, key] of [['Concluídos', 'completed'], ['Executando', 'running'], ['Na fila', 'queued'], ['Falhas', 'failed']]) {
      const item = element('div'); item.append(element('strong', '', detail.progress?.[key] || 0), element('span', '', label)); counts.appendChild(item);
    }
    progress.appendChild(counts); target.appendChild(progress);
    const artifacts = element('section', 'flp-panel'); artifacts.append(element('h3', '', 'Artefatos registrados'));
    if (!detail.artifacts?.length) artifacts.append(element('p', 'flp-empty', 'Nenhum artefato registrado para este projeto.'));
    else for (const artifact of detail.artifacts.slice(-6).reverse()) {
      const item = element('div', 'flp-artifact'); item.append(element('strong', '', artifact.name || artifact.type), element('span', '', `${artifact.type} · ${date(artifact.createdAt)}`)); artifacts.appendChild(item);
    }
    target.appendChild(artifacts);
  }
  function renderGit(target, project) {
    const panel = element('section', 'flp-panel'); panel.append(element('h3', '', 'Git · versão e publicação'));
    const data = state.git.get(project.id);
    if (!data) { panel.append(element('p', 'flp-empty', 'Lendo repositório Git…')); target.appendChild(panel); return; }
    if (data.error) { panel.append(element('p', 'flp-empty', data.error)); target.appendChild(panel); return; }
    panel.append(row('Versão atual', data.head.slice(0, 12)), row('Branch', data.branch || 'sem branch'), row('Remote', data.remote || 'não configurado'), row('Sincronização', data.upstream ? `${data.ahead ?? '?'} à frente · ${data.behind ?? '?'} atrás de ${data.upstream}` : 'sem upstream'));
    renderConnection(panel, project);
    const changes = element('div', 'flp-git-changes'); changes.append(element('h4', '', `Mudanças (${data.files.length})`));
    if (!data.files.length) changes.append(element('p', 'flp-empty', 'Workspace limpo.'));
    for (const file of data.files) {
      const line = element('div', 'flp-git-file'); const label = element('label');
      const check = element('input'); check.type = 'checkbox'; check.value = file; check.className = 'flp-git-select';
      label.append(check, element('span', '', file));
      const diffButton = element('button', 'flp-button flp-button-soft', 'Ver diff'); diffButton.type = 'button';
      diffButton.addEventListener('click', async () => {
        const preview = line.querySelector('pre') || element('pre', 'flp-git-diff');
        preview.textContent = 'Carregando diff…'; line.appendChild(preview);
        try { const result = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/diff?path=${encodeURIComponent(file)}`); preview.textContent = result.diff; }
        catch (error) { preview.textContent = error.message; }
      });
      line.append(label, diffButton); changes.append(line);
    }
    panel.appendChild(changes);
    const form = element('form', 'flp-git-form');
    const message = element('input'); message.name = 'message'; message.placeholder = 'Mensagem do commit'; message.maxLength = 200; message.required = true;
    const commit = element('button', 'flp-button flp-button-primary', 'Criar commit'); commit.type = 'submit'; commit.disabled = !data.files.length;
    form.append(message, commit);
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); const files = [...panel.querySelectorAll('.flp-git-select:checked')].map((input) => input.value);
      if (!files.length) { setGitMessage(panel, 'Selecione os arquivos do commit.'); return; }
      commit.disabled = true; setGitMessage(panel, 'Criando commit…');
      try { const result = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedHead: data.head, message: message.value, files }) }); state.git.set(project.id, result); renderDetail(); }
      catch (error) { setGitMessage(panel, error.message); commit.disabled = false; }
    });
    panel.appendChild(form);
    const push = element('button', 'flp-button flp-button-soft', 'Push para origin'); push.type = 'button'; push.disabled = !data.remote || Boolean(data.status);
    push.addEventListener('click', async () => {
      push.disabled = true; setGitMessage(panel, 'Enviando branch…');
      try { const result = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedHead: data.head }) }); state.git.set(project.id, result); renderDetail(); setGitMessage(panel, 'Push concluído.'); }
      catch (error) { setGitMessage(panel, error.message); push.disabled = false; }
    });
    panel.appendChild(push);
    if (project.id === 'api-platform-live') {
      const deploy = element('button', 'flp-button flp-button-primary', 'Build e deploy da API'); deploy.type = 'button';
      const reapply = element('button', 'flp-button flp-button-soft', 'Reaplicar imagens atuais'); reapply.type = 'button';
      const currentJob = state.deployments.get(project.id)?.job;
      deploy.disabled = Boolean(data.status) || currentJob?.status === 'RUNNING'; reapply.disabled = deploy.disabled;
      const launch = async (rebuild) => {
        deploy.disabled = true; reapply.disabled = true; setGitMessage(panel, rebuild ? 'Iniciando build e deploy da API…' : 'Reaplicando imagens validadas…');
        try { const result = await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/deploy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedHead: data.head, rebuild }) }); state.deployments.set(project.id, result); renderDetail(); scheduleDeploy(project.id); }
        catch (error) { setGitMessage(panel, error.message); deploy.disabled = false; reapply.disabled = false; }
      };
      deploy.addEventListener('click', () => launch(true)); reapply.addEventListener('click', () => launch(false));
      panel.append(deploy, reapply);
      panel.append(element('p', 'flp-empty', currentJob ? `Deploy ${currentJob.status} · ${currentJob.mode || 'BUILD_AND_DEPLOY'} · versão ${currentJob.head.slice(0, 12)}${currentJob.error ? ` · ${currentJob.error}` : ''}` : 'Nenhum deploy iniciado pelo Fênix.'));
    }
    panel.append(element('p', 'flp-empty', 'O push usa a chave de deploy conectada ou as credenciais Git configuradas na VPS.'));
    panel.append(element('p', 'flp-git-message'));
    const history = element('div', 'flp-git-history'); history.append(element('h4', '', 'Commits recentes'));
    for (const item of data.recent || []) history.append(element('p', '', item));
    panel.appendChild(history); target.appendChild(panel);
  }
  function renderConnection(panel, project) {
    const box = element('div', 'flp-git-connection');
    const account = state.connections.get(project.id);
    box.append(element('h4', '', 'Conexão GitHub'));
    if (!account) { box.append(element('p', 'flp-empty', 'Verificando conexão…')); panel.appendChild(box); return; }
    if (!account.supported) { box.append(element('p', 'flp-empty', account.error || 'Remote GitHub indisponível.')); panel.appendChild(box); return; }
    box.append(element('p', 'flp-empty', account.publicKey ? `Chave de deploy criada para ${account.repository}.` : `Crie uma chave de deploy para ${account.repository}.`));
    if (account.publicKey) {
      const publicKey = element('textarea', 'flp-git-public-key'); publicKey.readOnly = true; publicKey.value = account.publicKey; publicKey.setAttribute('aria-label', 'Chave pública para GitHub');
      box.append(publicKey, element('p', 'flp-empty', 'No GitHub: Settings → Deploy keys → Add deploy key. Cole a chave pública e marque Allow write access.'));
      const verify = element('button', 'flp-button flp-button-soft', 'Verificar conexão'); verify.type = 'button';
      verify.addEventListener('click', async () => { verify.disabled = true; try { await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/verify`); setGitMessage(panel, 'Conexão GitHub verificada.'); } catch (error) { setGitMessage(panel, error.message); } finally { verify.disabled = false; } });
      box.append(verify);
    } else {
      const generate = element('button', 'flp-button flp-button-soft', 'Gerar chave de conexão'); generate.type = 'button';
      generate.addEventListener('click', async () => { generate.disabled = true; try { state.connections.set(project.id, await json(`/api/fenix/projects/${encodeURIComponent(project.id)}/git/connection`, { method: 'POST' })); renderDetail(); } catch (error) { setGitMessage(panel, error.message); generate.disabled = false; } });
      box.append(generate);
    }
    panel.appendChild(box);
  }
  function setGitMessage(panel, message) { const node = panel.querySelector('.flp-git-message'); if (node) node.textContent = message; }
  function scheduleDeploy(id) { clearTimeout(state.deployTimer); state.deployTimer = setTimeout(() => loadDeploy(id), 4000); }
  async function loadDeploy(id) {
    if (state.selected !== id) return;
    try { state.deployments.set(id, await json(`/api/fenix/projects/${encodeURIComponent(id)}/git/deploy`, { signal: AbortSignal.timeout(30000) })); }
    catch (error) { state.deployments.set(id, { job: { status: 'UNKNOWN', head: state.git.get(id)?.head || '', error: error.message } }); }
    renderDetail();
    if (state.deployments.get(id)?.job?.status === 'RUNNING') scheduleDeploy(id);
  }
  async function loadGit(id) {
    try { state.git.set(id, await json(`/api/fenix/projects/${encodeURIComponent(id)}/git`, { signal: AbortSignal.timeout(60000) })); }
    catch (error) { state.git.set(id, { error: error.message }); }
    if (state.selected === id) renderDetail();
    try { state.connections.set(id, await json(`/api/fenix/projects/${encodeURIComponent(id)}/git/connection`, { signal: AbortSignal.timeout(60000) })); }
    catch (error) { state.connections.set(id, { supported: false, error: error.message }); }
    if (state.selected === id) renderDetail();
    if (id === 'api-platform-live') loadDeploy(id);
  }
  function selectProject(id) { clearTimeout(state.deployTimer); state.selected = id; localStorage.setItem('fenix_project_hub_selected', id); renderCards(); renderDetail(); loadGit(id); }
  async function load(force = false) {
    renderShell();
    if (state.loading) return state.loading;
    if (state.projects.length && !force) { renderCards(); renderDetail(); return; }
    state.loading = (async () => {
      state.error = null;
      try {
        const data = await json('/api/fenix/projects');
        state.projects = data.projects || [];
        state.measuredAt = new Date().toISOString();
        const preferred = state.projects.find((item) => item.id === state.selected) || state.projects.find((item) => item.id === localStorage.getItem('fenix_project_hub_selected')) || state.projects.find((item) => item.id === 'api-platform-live') || state.projects[0];
        state.selected = preferred?.id || null;
        if (state.selected) loadGit(state.selected);
        renderMetrics(); renderCards(); renderDetail();
        const details = await Promise.allSettled(state.projects.map((project) => json(`/api/fenix/projects/${encodeURIComponent(project.id)}/state`, { signal: AbortSignal.timeout(60000) })));
        state.details.clear(); details.forEach((result, index) => { if (result.status === 'fulfilled') state.details.set(state.projects[index].id, result.value); });
      } catch (error) { state.error = error.message; }
      renderMetrics(); renderCards(); renderDetail();
    })().finally(() => { state.loading = null; });
    return state.loading;
  }
  window.loadRegistryProjects = load;
  window.openProjectWorkspace = async (projectId) => {
    window.showView?.('projects');
    await load();
    const alias = projectId === 'api-platform' ? 'api-platform-live' : projectId;
    if (state.projects.some((project) => project.id === alias)) selectProject(alias);
  };
})();
