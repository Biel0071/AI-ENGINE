const token = localStorage.getItem('grg_token');
let accessToken = token;

if (!accessToken) {
  location.replace('/GRG-login');
}

const $ = (id) => document.getElementById(id);
const state = {
  data: {},
  projects: [],
  repos: [],
  office: [],
  events: [],
  jobs: [],
  missions: [],
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

function text(id, value) {
  const el = $(id);
  if (el) el.textContent = value === 0 || value ? String(value) : '--';
}

function getMeasured(value) {
  return value && value.state === 'measured' ? value.value : value;
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('grg_token');
    location.replace('/GRG-login');
    throw new Error('sessao expirada');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

async function publicJson(path) {
  const res = await fetch(path);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

async function settle(entries) {
  const out = {};
  await Promise.all(entries.map(async ([key, loader]) => {
    try { out[key] = await loader(); }
    catch (error) { out[key] = { __error: error.message }; }
  }));
  return out;
}

function row(title, detail = '', status = '') {
  const cls = /ok|ready|active|online|connected|succeeded/i.test(status) ? 'ok'
    : /fail|error|degraded|missing|offline|blocked|denied/i.test(status) ? 'bad'
    : status ? 'warn' : '';
  return `<div class="row"><b>${esc(title)}</b><small>${esc(detail)}</small><span class="status-pill ${cls}">${esc(status || '--')}</span></div>`;
}

function metric(label, value) {
  return `<div><span>${esc(label)}</span><b>${esc(value ?? '--')}</b></div>`;
}

function showView(name, push = true) {
  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${name}`));
  document.querySelectorAll('[data-nav]').forEach((el) => el.classList.toggle('active', el.dataset.nav === name));
  const label = document.querySelector(`[data-nav="${name}"]`)?.textContent?.replace(/^[A-Z]{2}/, '').trim() || name;
  text('viewTitle', label);
  if (push) history.replaceState(null, '', `#${name}`);
}

function bubble(message, who = 'bot') {
  const div = document.createElement('div');
  div.className = `bubble ${who}`;
  div.innerHTML = esc(message).replace(/\n/g, '<br>');
  $('chatLog').appendChild(div);
  $('chatLog').scrollTop = $('chatLog').scrollHeight;
}

async function refreshAll() {
  const data = await settle([
    ['health', () => publicJson('/health')],
    ['me', () => api('/me')],
    ['overview', () => api('/overview')],
    ['operations', () => api('/operations/state')],
    ['runtime', () => api('/runtime')],
    ['missions', () => api('/missions')],
    ['jobs', () => api('/runtime/jobs')],
    ['city', () => api('/city')],
    ['events', () => api('/events?limit=80')],
    ['telemetry', () => api('/ai/telemetry')],
    ['connectors', () => api('/connectors')],
    ['router', () => api('/ai/router/select')],
    ['connection', () => api('/connection')],
    ['capabilities', () => api('/capabilities')],
    ['projects', () => api('/projects')],
    ['repositories', () => api('/repositories')],
    ['graph', () => api('/graph')],
    ['kg', () => api('/knowledge-graph/anomalies')],
    ['office', () => api('/office')],
    ['workers', () => api('/workers')],
    ['providers', () => api('/providers')],
    ['programs', () => api('/executive/programs')],
    ['readiness', () => api('/governance/readiness-matrix')],
    ['gatekeeper', () => api('/governance/gatekeeper?action=deploy')],
    ['observability', () => api('/observability/metrics')],
    ['series', () => api('/observability/series?windowMinutes=120')],
    ['security', () => api('/security/encryption/status')],
    ['veracity', () => api('/governance/simulation-audit')],
    ['kos', () => api('/uios/kos/manifest')],
    ['skills', () => api('/skills')],
    ['twin', () => api('/digital-twin/operational')],
    ['agents', () => api('/agents/panel')],
    ['swarm', () => api('/agents/swarm')],
    ['speed', () => api('/performance/speed-score')],
    ['hotMemory', () => api('/performance/hot-memory')],
    ['dailyBrief', () => api('/workspace/eca/daily-brief')],
  ]);
  state.data = data;
  state.projects = data.projects?.projects || [];
  state.repos = data.repositories?.repositories || [];
  state.office = data.office?.office || [];
  state.events = data.events?.events || [];
  state.jobs = data.jobs?.jobs || [];
  state.missions = data.missions?.missions || [];
  renderAll();
}

function renderAll() {
  renderHeader();
  renderCommand();
  renderRuntime();
  renderMissions();
  renderCity();
  renderOffice();
  renderProjects();
  renderKnowledge();
  renderSkills();
  renderConnectors();
  renderDeploy();
  renderObservability();
  renderSecurity();
}

function renderHeader() {
  const { health, me, overview, jobs, telemetry } = state.data;
  const ok = health?.ok === true || health?.status === 'ready';
  $('statusDot').style.background = ok ? 'var(--green)' : 'var(--rose)';
  $('statusDot').style.boxShadow = `0 0 12px ${ok ? 'var(--green)' : 'var(--rose)'}`;
  text('statusText', ok ? 'ONLINE' : 'DEGRADED');
  text('statusSub', health?.environment || health?.service || 'runtime');
  text('actorName', me?.actorId || localStorage.getItem('grg_user') || 'usuario');
  text('actorRole', me?.tenantId || 'tenant');
  const metrics = overview?.metrics || {};
  text('kpiProjects', metrics.projects ?? state.projects.length);
  text('kpiRepos', metrics.repositories ?? state.repos.length);
  text('kpiCaps', metrics.capabilities ?? state.data.capabilities?.capabilities?.length);
  text('kpiJobs', state.jobs.length);
  text('kpiAi', telemetry?.calls ?? metrics.aiCalls);
}

function renderCommand() {
  const avatar = state.data.missions?.avatar || state.data.avatar || {};
  text('avatarState', avatar.state || 'Operacional');
  text('avatarPhrase', state.data.dailyBrief?.summary || 'Workspace unico: fronts de comando, office, CRM, AI City e developer reunidos aqui.');
  const telemetry = state.data.telemetry || {};
  text('activeModel', telemetry.lastModel || telemetry.model || (telemetry.calls ? 'IA medida' : 'sem chamada'));
  text('eventCount', `${state.events.length} eventos`);
  $('eventStream').innerHTML = state.events.length
    ? state.events.slice(0, 48).map((event) => `<div>[${esc(event.type || event.name || 'event')}] ${esc(event.summary || event.message || event.recordedAt || event.id)}</div>`).join('')
    : '<div>Sem eventos publicados ainda.</div>';
}

function renderRuntime() {
  const checks = state.data.health?.checks || {};
  const checkRows = Array.isArray(checks) ? checks : Object.entries(checks).map(([id, value]) => ({ id, ...value }));
  $('healthList').innerHTML = checkRows.length
    ? checkRows.map((c) => row(c.id || c.name, c.degraded || c.error || c.adapter || c.status || '', c.ok === false ? 'DEGRADED' : 'OK')).join('')
    : row('health', state.data.health?.__error || 'sem checks', 'UNKNOWN');
  const services = state.data.runtime?.services || state.data.runtime?.subsystems || state.data.health?.boot;
  $('runtimeServices').innerHTML = Array.isArray(services)
    ? services.map((s) => row(s.id || s.name, s.version || '', s.status || 'OK')).join('')
    : Object.entries(services || {}).map(([key, value]) => row(key, typeof value === 'object' ? JSON.stringify(value).slice(0, 80) : value, value?.status || '')).join('') || row('kernel', 'sem inventario de servicos publicado', 'UNKNOWN');
  const workers = state.data.workers?.workers || state.data.observability?.workers?.heartbeats || [];
  $('workerList').innerHTML = Array.isArray(workers) && workers.length
    ? workers.map((w) => row(w.name || w.id || w.workerId, w.activeJobs != null ? `${w.activeJobs} jobs ativos` : w.role || '', w.status || w.state || 'KNOWN')).join('')
    : row('workers', state.data.workers?.__error || 'sem workers ativos medidos', 'UNKNOWN');
}

function renderMissions() {
  $('missionList').innerHTML = state.missions.length
    ? state.missions.slice(0, 20).map((m) => row(m.title || m.objective || m.id, `${m.steps?.length || 0} etapas`, m.status || m.state)).join('')
    : row('missoes', 'nenhuma missao registrada', 'EMPTY');
  $('jobList').innerHTML = state.jobs.length
    ? state.jobs.slice(0, 30).map((j) => row(j.type || j.id, `tentativa ${j.attempts || 0}/${j.maxAttempts || 0}`, j.status)).join('')
    : row('jobs', 'nenhum job registrado', 'EMPTY');
  const programs = state.data.programs?.programs || [];
  $('programList').innerHTML = programs.length
    ? programs.map((p) => row(p.objective || p.title || p.id, `${p.missions?.length || 0} missoes`, p.status || 'PROGRAM')).join('')
    : row('programas', 'sem programas executivos', 'EMPTY');
}

function renderCity() {
  const nodes = state.data.city?.nodes || [];
  if (!nodes.length) {
    $('cityCanvas').innerHTML = '<div class="row"><b>AI City</b><small>Aguardando eventos reais para projetar a cidade.</small><span class="status-pill warn">EMPTY</span></div>';
  } else {
    const visible = nodes.slice(0, 42);
    $('cityCanvas').innerHTML = visible.map((n, i) => {
      const x = 8 + ((i * 23) % 84);
      const y = 12 + ((i * 37) % 74);
      return `<button class="city-node ${esc(n.status || '')}" style="left:${x}%;top:${y}%;" title="${esc(n.id)}"><strong>${esc(n.label || n.name || n.id)}</strong><small>${esc(n.type || n.status || '')}</small></button>`;
    }).join('');
  }
  const overview = state.data.overview?.metrics || {};
  $('knowledgeDistrict').innerHTML = [
    metric('Memorias', overview.memories),
    metric('Graph edges', overview.graphEdges),
    metric('City nodes', overview.cityNodes),
    metric('Capabilities', overview.capabilities),
  ].join('');
  const workers = state.data.workers?.workers || [];
  $('workersDistrict').innerHTML = workers.length ? workers.map((w) => row(w.name || w.id, w.role || '', w.status || 'KNOWN')).join('') : row('workers', 'sem workers publicados', 'EMPTY');
  const proposals = state.data.agents?.tasks || state.data.swarm?.agents || [];
  $('evolutionDistrict').innerHTML = Array.isArray(proposals) && proposals.length ? proposals.slice(0, 10).map((p) => row(p.name || p.id || p.role, p.summary || p.status || '', p.status || 'KNOWN')).join('') : row('evolucao', 'sem propostas ou agentes ativos', 'EMPTY');
}

function renderOffice() {
  $('officeList').innerHTML = state.office.length
    ? state.office.map((o) => `<article class="office-card"><h3>${esc(o.store || o.subjectName || o.projectId)}</h3><p>${esc(o.niche || '')}</p><p>${esc(o.headcount || 0)} membros</p><button class="soft-btn" data-office="${esc(o.projectId)}" type="button">Abrir equipe</button></article>`).join('')
    : '<div class="row"><b>Office</b><small>Nenhuma workforce contratada ainda.</small><span class="status-pill warn">EMPTY</span></div>';
  document.querySelectorAll('[data-office]').forEach((button) => button.addEventListener('click', () => openOffice(button.dataset.office)));
}

async function openOffice(projectId) {
  try {
    const workforce = await api(`/projects/${encodeURIComponent(projectId)}/workforce`);
    text('officeTitle', workforce.subjectName || projectId);
    const employees = workforce.employees || [];
    $('officeDetail').innerHTML = employees.map((e) => row(e.title || e.role, e.focus || e.capability || '', `nivel ${e.level || 1}`)).join('') || row('equipe', 'sem funcionarios', 'EMPTY');
  } catch (error) {
    $('officeDetail').innerHTML = row(projectId, error.message, 'ERROR');
  }
}

function renderProjects() {
  const q = $('projectSearch')?.value?.toLowerCase() || '';
  const visibility = $('repoVisibility')?.value || 'all';
  const reposById = new Map(state.repos.map((repo) => [repo.id, repo]));
  const projects = state.projects.filter((p) => {
    const repo = reposById.get(p.repositoryId) || p.repository || {};
    const hay = `${p.name || ''} ${repo.name || ''} ${repo.owner || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
    return hay.includes(q) && (visibility === 'all' || repo.visibility === visibility);
  });
  $('projectList').innerHTML = projects.length
    ? projects.map((p) => {
      const repo = reposById.get(p.repositoryId) || p.repository || {};
      return `<article class="project-card"><h3>${esc(p.name || p.id)}</h3><p>${esc(repo.owner || '')}/${esc(repo.name || '')}</p><p>${esc(p.analysisStatus || p.status || '')}</p><button class="soft-btn" data-hire="${esc(p.id)}" type="button">Contratar equipe</button></article>`;
    }).join('')
    : '<div class="row"><b>Projetos</b><small>Nenhum projeto encontrado.</small><span class="status-pill warn">EMPTY</span></div>';
  document.querySelectorAll('[data-hire]').forEach((button) => button.addEventListener('click', () => hireWorkforce(button.dataset.hire)));
  const graph = state.data.graph || {};
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  $('graphSummary').innerHTML = [
    row('Projetos', `${projects.length} filtrados`, 'MEASURED'),
    row('Grafo', `${nodes.length} nos, ${edges.length} relacoes`, nodes.length ? 'READY' : 'EMPTY'),
  ].join('');
}

async function hireWorkforce(projectId) {
  try {
    await api(`/projects/${encodeURIComponent(projectId)}/hire`, { method: 'POST' });
    await refreshAll();
    showView('office');
  } catch (error) {
    $('graphSummary').innerHTML = row('Contratar equipe', error.message, 'ERROR') + $('graphSummary').innerHTML;
  }
}

function renderKnowledge() {
  const kos = state.data.kos || {};
  $('kosManifest').innerHTML = Object.keys(kos).length
    ? Object.entries(kos).slice(0, 12).map(([key, value]) => row(key, typeof value === 'object' ? JSON.stringify(value).slice(0, 120) : value, value?.state || '')).join('')
    : row('KOS', kos.__error || 'manifesto indisponivel', 'UNKNOWN');
  const anomalies = state.data.kg?.anomalies || state.data.graph?.edges || [];
  $('kgList').innerHTML = Array.isArray(anomalies) && anomalies.length
    ? anomalies.slice(0, 20).map((item, i) => row(item.type || item.id || `relacao ${i + 1}`, item.source || item.target || JSON.stringify(item).slice(0, 90), item.status || 'GRAPH')).join('')
    : row('Knowledge graph', 'sem anomalias carregadas nesta tela', 'EMPTY');
}

function renderSkills() {
  const skills = state.data.skills?.skills || [];
  text('skillCount', `${skills.length} skills`);
  $('skillList').innerHTML = skills.length
    ? skills.map((skill) => row(skill.name, `${skill.source} · ${skill.estimatedTokens} tokens · ${skill.triggers.join(', ') || 'always-on'}`, skill.alwaysOn ? 'GLOBAL' : 'TRIGGER')).join('')
    : row('skills', state.data.skills?.__error || 'nenhuma skill encontrada', 'EMPTY');
  if (!$('skillContext').innerHTML) {
    $('skillContext').innerHTML = row('context pack', 'digite um objetivo para selecionar skills', 'READY');
  }
}

async function selectSkills(objective) {
  const value = String(objective || '').trim();
  if (!value) return;
  $('skillContext').innerHTML = row('selecionando skills', value, 'RUNNING');
  try {
    const pack = await api('/skills/select', { method: 'POST', body: JSON.stringify({ objective: value, maxTokens: 1200, limit: 4 }) });
    $('skillContext').innerHTML = [
      row('objetivo', pack.objective, `${pack.estimatedTokens} tokens`),
      row('economia estimada', `${pack.savedBySelectiveLoad || 0} tokens nao carregados`, 'MEASURED'),
      ...(pack.selectedSkills || []).map((skill) => row(skill.name, `${skill.source} · score ${skill.score} · ${skill.contextTokens} tokens`, 'SELECTED')),
    ].join('');
  } catch (error) {
    $('skillContext').innerHTML = row('skill select', error.message, 'ERROR');
  }
}

function renderConnectors() {
  const connectors = state.data.connectors?.connectors || [];
  $('connectorList').innerHTML = connectors.length
    ? connectors.map((c) => row(c.connectorId || c.id, c.source || c.reason || '', c.state?.value || c.status || 'UNKNOWN')).join('')
    : row('conectores', state.data.connectors?.__error || 'nenhum conector registrado', 'EMPTY');
  const router = state.data.router || {};
  const chosen = router.chosen?.value || router.chosen || router;
  $('routerState').innerHTML = [
    row('provider escolhido', chosen.provider || chosen.name || 'sem provider', chosen.model || chosen.reason || '', chosen.provider ? 'READY' : 'UNKNOWN'),
    row('API connection', (state.data.connection?.providers || []).length ? `${state.data.connection.providers.length} providers monitorados` : 'sem check executado', (state.data.connection?.providers || [])[0]?.status || ''),
  ].join('');
}

function renderDeploy() {
  const readiness = state.data.readiness || {};
  const totals = readiness.totals || {};
  const gate = state.data.gatekeeper || {};
  $('readinessList').innerHTML = [
    row('production proven', `${totals.productionProven ?? 0}/${totals.objectives ?? 0}`, totals.productionProven ? 'PARTIAL' : 'BLOCKED'),
    row('gatekeeper', gate.allowed ? 'acao liberada' : gate.reason || 'bloqueado ate haver evidencia', gate.allowed ? 'READY' : 'BLOCKED'),
  ].join('');
}

function renderObservability() {
  const obs = state.data.observability || {};
  $('observabilityMetrics').innerHTML = [
    metric('AI tokens', getMeasured(obs.aiRuntime?.totalTokensConsumed) ?? state.data.telemetry?.totalTokens),
    metric('AI calls', getMeasured(obs.aiRuntime?.calls) ?? state.data.telemetry?.calls),
    metric('Workers', getMeasured(obs.workers?.knownWorkers)),
    metric('Queue depth', getMeasured(obs.workers?.queueDepth)),
    metric('Dead letters', getMeasured(obs.workers?.deadLetters)),
    metric('Speed', getMeasured(state.data.speed?.overallScore)),
  ].join('');
  const series = state.data.series?.series || {};
  const cards = Object.entries(series).slice(0, 8).map(([name, points]) => {
    const last = Array.isArray(points) ? points.at(-1) : null;
    return `<div class="spark"><b>${esc(name)}</b><small>${esc(last?.value ?? '--')}</small><div class="spark-line"></div></div>`;
  });
  $('seriesGrid').innerHTML = cards.length ? cards.join('') : '<div class="row"><b>series</b><small>sem amostras ainda</small><span class="status-pill warn">EMPTY</span></div>';
}

function renderSecurity() {
  const sec = state.data.security || {};
  $('securityState').innerHTML = Object.keys(sec).length
    ? Object.entries(sec).slice(0, 10).map(([key, value]) => row(key, typeof value === 'object' ? JSON.stringify(value).slice(0, 100) : value, value?.state || '')).join('')
    : row('security', sec.__error || 'status indisponivel', 'UNKNOWN');
  const audit = state.data.veracity || {};
  const totals = audit.totals || audit.summary || {};
  $('veracityState').innerHTML = [
    row('modulos varridos', totals.modules ?? audit.modules?.length ?? '--', 'MEASURED'),
    row('sinais falsos', totals.signals ?? totals.falseSignals ?? '--', (totals.signals || totals.falseSignals) ? 'ATTENTION' : 'OK'),
    row('production', totals.production ?? '--', 'MEASURED'),
    row('simulated', totals.simulated ?? '--', (totals.simulated || 0) > 0 ? 'ATTENTION' : 'OK'),
  ].join('');
}

async function runChat(message) {
  const value = String(message || '').trim();
  if (!value) return;
  bubble(value, 'user');
  const pending = document.createElement('div');
  pending.className = 'bubble system';
  pending.textContent = 'FENIX processando...';
  $('chatLog').appendChild(pending);
  try {
    const res = await api('/avatar/message', { method: 'POST', body: JSON.stringify({ message: value, mode: 'unified' }) });
    pending.remove();
    bubble(res.reply || res.response || 'Sem resposta textual.', 'bot');
    await refreshAll();
  } catch (error) {
    pending.remove();
    bubble(`Falha: ${error.message}`, 'system');
  }
}

async function createProgram(objective) {
  const value = String(objective || '').trim();
  if (!value) return;
  $('programList').innerHTML = row('criando programa', value, 'RUNNING') + $('programList').innerHTML;
  try {
    await api('/executive/programs', { method: 'POST', body: JSON.stringify({ objective: value }) });
    $('programObjective').value = '';
    await refreshAll();
  } catch (error) {
    $('programList').innerHTML = row('erro ao criar programa', error.message, 'ERROR') + $('programList').innerHTML;
  }
}

async function scanProject(path) {
  $('scanResult').innerHTML = row('scan em andamento', path || '.', 'RUNNING');
  try {
    const scan = await api('/onedeploy/scan-project', { method: 'POST', body: JSON.stringify({ projectPath: path || '.' }) });
    const d = scan.discovery || {};
    $('scanResult').innerHTML = [
      row('caminho', scan.projectPath || path || '.', scan.exists ? 'FOUND' : 'MISSING'),
      row('frontend', getMeasured(d.frontendFramework) || d.frontendFramework?.reason || '--', d.frontendFramework?.state || ''),
      row('backend', getMeasured(d.backendFramework) || d.backendFramework?.reason || '--', d.backendFramework?.state || ''),
      row('dependencias', getMeasured(d.dependencyCount) ?? '--', d.dependencyCount?.state || ''),
      row('ci/cd', getMeasured(d.ciCd) ?? d.ciCd?.reason ?? '--', d.ciCd?.state || ''),
    ].join('');
  } catch (error) {
    $('scanResult').innerHTML = row('scan falhou', error.message, 'ERROR');
  }
}

async function loadFs(path = '') {
  try {
    const data = await api(`/dev/fs?path=${encodeURIComponent(path)}`);
    $('fsList').innerHTML = (data.items || []).map((item) => row(item.name, item.path, item.isDirectory ? 'DIR' : 'FILE')).join('') || row('fs', 'vazio', 'EMPTY');
    document.querySelectorAll('#fsList .row').forEach((el) => {
      el.addEventListener('click', () => {
        const filePath = el.querySelector('small')?.textContent || '';
        if (el.textContent.includes('FILE')) openFile(filePath);
        else { $('fsPath').value = filePath; loadFs(filePath); }
      });
    });
  } catch (error) {
    $('fsList').innerHTML = row('developer fs', error.message, 'ERROR');
  }
}

async function openFile(path) {
  try {
    const data = await api(`/dev/fs/file?path=${encodeURIComponent(path)}`);
    $('fileViewer').value = data.content || '';
  } catch (error) {
    $('fileViewer').value = `Falha: ${error.message}`;
  }
}

function init() {
  document.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', () => showView(el.dataset.nav)));
  $('refreshBtn').addEventListener('click', () => refreshAll());
  $('logoutBtn').addEventListener('click', async () => {
    try { await fetch('/api/logout', { method: 'POST', headers: { authorization: `Bearer ${accessToken}` } }); }
    finally { localStorage.removeItem('grg_token'); location.replace('/GRG-login'); }
  });
  $('chatForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = $('chatInput').value;
    $('chatInput').value = '';
    runChat(value);
  });
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => runChat(button.dataset.prompt)));
  $('projectSearch').addEventListener('input', renderProjects);
  $('repoVisibility').addEventListener('change', renderProjects);
  $('programForm').addEventListener('submit', (event) => { event.preventDefault(); createProgram($('programObjective').value); });
  $('scanForm').addEventListener('submit', (event) => { event.preventDefault(); scanProject($('scanPath').value); });
  $('skillForm').addEventListener('submit', (event) => { event.preventDefault(); selectSkills($('skillObjective').value); });
  $('tickBtn').addEventListener('click', async () => { await api('/runtime/tick', { method: 'POST' }); await refreshAll(); });
  $('rebuildCityBtn').addEventListener('click', async () => { await api('/city/rebuild', { method: 'POST' }); await refreshAll(); });
  $('sampleBtn').addEventListener('click', async () => { await api('/observability/series/sample', { method: 'POST' }); await refreshAll(); });
  $('checkApiBtn').addEventListener('click', async () => { await api('/connection/check', { method: 'POST', body: JSON.stringify({ provider: 'aiplatform' }) }); await refreshAll(); });
  $('fsLoadBtn').addEventListener('click', () => loadFs($('fsPath').value));
  $('terminalBtn').addEventListener('click', async () => {
    try {
      const out = await api('/dev/terminal', { method: 'POST', body: JSON.stringify({ command: $('terminalCmd').value, sessionId: `ui-${Date.now()}` }) });
      $('terminalResult').textContent = JSON.stringify(out, null, 2);
    } catch (error) {
      $('terminalResult').textContent = error.message;
    }
  });
  $('cmdBtn').addEventListener('click', openCommand);
  $('closeCmdBtn').addEventListener('click', () => $('cmdDialog').close());
  $('cmdInput').addEventListener('input', renderCommandPalette);
  window.addEventListener('hashchange', () => showView(location.hash.slice(1) || 'command', false));
  showView(location.hash.slice(1) || 'command', false);
  bubble('Workspace unico carregado. Eu consolidei comando, runtime, missoes, AI City, office, CRM, deploy, observabilidade e developer em uma tela.');
  refreshAll();
  setInterval(() => { if (!document.hidden) refreshAll(); }, 15000);
}

function openCommand() {
  renderCommandPalette();
  $('cmdDialog').showModal();
  $('cmdInput').focus();
}

function renderCommandPalette() {
  const q = ($('cmdInput').value || '').toLowerCase();
  const commands = [
    ['command', 'Abrir comando'],
    ['runtime', 'Abrir runtime'],
    ['missions', 'Abrir missoes'],
    ['city', 'Abrir AI City'],
    ['office', 'Abrir office'],
    ['projects', 'Abrir projetos CRM'],
    ['skills', 'Abrir skills e agentes'],
    ['connectors', 'Abrir conectores e API'],
    ['deploy', 'Abrir deploy'],
    ['observability', 'Abrir observabilidade'],
    ['security', 'Abrir seguranca'],
    ['developer', 'Abrir developer district'],
  ].filter(([, label]) => label.toLowerCase().includes(q));
  $('cmdResults').innerHTML = commands.map(([target, label]) => row(label, `#${target}`, 'NAV')).join('');
  document.querySelectorAll('#cmdResults .row').forEach((el, i) => {
    el.addEventListener('click', () => {
      showView(commands[i][0]);
      $('cmdDialog').close();
    });
  });
}

init();
