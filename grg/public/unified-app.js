const token = localStorage.getItem('grg_token');
let accessToken = token;

if (!accessToken) {
  location.replace('/GRG-login');
}

const $ = (id) => document.getElementById(id);
window.state = {
  data: {},
  projects: [],
  repos: [],
  office: [],
  events: [],
  jobs: [],
  missions: [],
  refreshing: false,
  agentStates: {}
};
const state = window.state;

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

async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem('grg_refresh_token');
  if (!refreshToken) return false;
  try {
    const configResponse = await fetch('/api/oidc/config');
    const config = await configResponse.json();
    const body = new URLSearchParams({ grant_type:'refresh_token', client_id:config.clientId, refresh_token:refreshToken });
    const response = await fetch(config.tokenEndpoint, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token) return false;
    accessToken = tokens.access_token;
    localStorage.setItem('grg_token', accessToken);
    if (tokens.refresh_token) sessionStorage.setItem('grg_refresh_token', tokens.refresh_token);
    return true;
  } catch { return false; }
}

async function api(path, options = {}, retried = false) {
  const url = path.startsWith('/api') ? path : (path.startsWith('/') ? `/api${path}` : `/api/${path}`);
  const res = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
  });
  if (res.status === 401 && !retried && await refreshAccessToken()) return api(path, options, true);
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

async function settle(entries, concurrency = 5) {
  const out = {};
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, entries.length) }, async () => {
    while (index < entries.length) {
      const current = index;
      index += 1;
      const [key, loader] = entries[current];
      try { out[key] = await loader(); }
      catch (error) { out[key] = { __error: error.message }; }
    }
  });
  await Promise.all(workers);
  return out;
}

function row(title, detail = '', status = '') {
  let badgeCls = '';
  if (/ok|ready|active|online|connected|succeeded|completed/i.test(status)) badgeCls = 'badge green';
  else if (/fail|error|degraded|missing|offline|blocked|denied/i.test(status)) badgeCls = 'badge rose';
  else if (status) badgeCls = 'badge warn';
  
  return `<tr>
    <td><b>${esc(title)}</b></td>
    <td><small>${esc(detail)}</small></td>
    <td>${status ? `<span class="${badgeCls}">${esc(status)}</span>` : '--'}</td>
  </tr>`;
}

function metric(label, value) {
  return `<div><span>${esc(label)}</span><b>${esc(value ?? '--')}</b></div>`;
}

function showView(name, push = true) {
  name = String(name || 'command').split('?')[0] || 'command';
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
  if (state.refreshing) return;
  state.refreshing = true;
  try {
    const activeView = String(location.hash.slice(1) || 'command').split('?')[0] || 'command';
    const essentialEntries = [
      ['health', () => publicJson('/health')],
      ['me', () => api('/me')],
      ['overview', () => api('/overview')],
    ];
    const viewEntries = {
      skills: [
        ['skills', () => api('/skills')],
        ['fullstackSlices', () => api('/scos/factory/slices')],
      ],
      connectors: [
        ['connectors', () => api('/connectors')],
        ['router', () => api('/ai/router/select')],
        ['connection', () => api('/connection')],
        ['providers', () => api('/providers')],
      ],
      deploy: [
        ['readiness', () => api('/governance/readiness-matrix')],
        ['gatekeeper', () => api('/governance/gatekeeper?action=deploy')],
      ],
      observability: [
        ['observability', () => api('/observability/metrics')],
        ['series', () => api('/observability/series?windowMinutes=120')],
        ['workers', () => api('/workers')],
        ['speed', () => api('/performance/speed-score')],
        ['hotMemory', () => api('/performance/hot-memory')],
      ],
    };
    const entries = viewEntries[activeView] ? [...essentialEntries, ...viewEntries[activeView]] : [
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
    ['fullstackSlices', () => api('/scos/factory/slices')],
    ['twin', () => api('/digital-twin/operational')],
    ['agents', () => api('/agents/panel')],
    ['swarm', () => api('/agents/swarm')],
      ['speed', () => api('/performance/speed-score')],
      ['hotMemory', () => api('/performance/hot-memory')],
      ['dailyBrief', () => api('/workspace/eca/daily-brief')],
    ];
    const data = await settle(entries, viewEntries[activeView] ? 2 : 4);
    state.data = data;
    state.projects = data.projects?.projects || [];
    state.repos = data.repositories?.repositories || [];
    state.office = data.office?.office || [];
    state.events = data.events?.events || [];
    state.jobs = data.jobs?.jobs || [];
    state.missions = data.missions?.missions || [];
    renderAll();
  } finally {
    state.refreshing = false;
  }
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
  if ($('eventStream')) $('eventStream').innerHTML = state.events.length
    ? state.events.slice(0, 48).map((event) => `<div class="event-log">[${esc(event.type || event.name || 'event')}] <strong>${esc(event.summary || event.message || event.recordedAt || event.id)}</strong></div>`).join('')
    : '<div class="empty-state" style="padding: 24px 0;"><span class="empty-icon">∿</span>Sem eventos</div>';
}

function renderRuntime() {
  const checks = state.data.health?.checks || {};
  const checkRows = Array.isArray(checks) ? checks : Object.entries(checks).map(([id, value]) => ({ id, ...value }));
  if ($('healthList')) $('healthList').innerHTML = checkRows.length
    ? checkRows.map((c) => row(c.id || c.name, c.degraded || c.error || c.adapter || c.status || '', c.ok === false ? 'DEGRADED' : 'OK')).join('')
    : row('health', state.data.health?.__error || 'sem checks', 'UNKNOWN');
  const services = state.data.runtime?.services || state.data.runtime?.subsystems || state.data.health?.boot;
  if ($('runtimeServices')) $('runtimeServices').innerHTML = Array.isArray(services)
    ? services.map((s) => row(s.id || s.name, s.version || '', s.status || 'OK')).join('')
    : Object.entries(services || {}).map(([key, value]) => row(key, typeof value === 'object' ? JSON.stringify(value).slice(0, 80) : value, value?.status || '')).join('') || row('kernel', 'sem inventario de servicos publicado', 'UNKNOWN');
  const workers = state.data.workers?.workers || state.data.observability?.workers?.heartbeats || [];
  if ($('workerList')) $('workerList').innerHTML = Array.isArray(workers) && workers.length
    ? workers.map((w) => row(w.name || w.id || w.workerId, w.activeJobs != null ? `${w.activeJobs} jobs ativos` : w.role || '', w.status || w.state || 'KNOWN')).join('')
    : row('workers', state.data.workers?.__error || 'sem workers ativos medidos', 'UNKNOWN');
}

function renderMissions() {
  if ($('missionList')) $('missionList').innerHTML = state.missions.length
    ? state.missions.map((m) => row(m.id || 'mission', m.objective || m.name || '', m.status || 'ACTIVE')).join('')
    : row('missoes', 'sem historico', 'EMPTY');
  
  if ($('jobList')) $('jobList').innerHTML = state.jobs.length
    ? state.jobs.map((j) => `<div style="padding:12px; border-bottom:1px solid var(--border); margin-bottom:8px; background:var(--bg-base); border-radius:6px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <strong style="color:var(--text-main);">${esc(j.id || 'job')}</strong>
          <span class="badge ${j.status === 'COMPLETED' ? 'green' : (j.status==='FAILED'?'rose':'warn')}">${esc(j.status || 'RUNNING')}</span>
        </div>
        <div style="color:var(--text-muted); font-size:11px;">${esc(j.objective || j.name || 'Tarefa em andamento...')}</div>
      </div>`).join('')
    : '<div class="empty-state" style="padding: 24px 0;"><span class="empty-icon" style="font-size: 16px;">⏱</span>Sem Jobs ativos</div>';

  const programs = state.data.programs?.programs || [];
  if ($('programList')) $('programList').innerHTML = programs.length
    ? programs.map((p) => row(p.objective || p.title || p.id, `${p.missions?.length || 0} missoes`, p.status || 'PROGRAM')).join('')
    : row('programas', 'sem programas executivos', 'EMPTY');
}

function renderCity() {
    if (window.drawCity) { window.globalCityState = state.data; window.state.agentStates = state.data.swarm?.agents || state.data.agents || {}; window.drawCity(); }

  const nodes = state.data.city?.nodes || [];
  if (!nodes.length) {
    if ($('cityCanvas')) $('cityCanvas').innerHTML = '<div class="row"><b>AI City</b><small>Aguardando eventos reais para projetar a cidade.</small><span class="status-pill warn">EMPTY</span></div>';
  } else {
    const visible = nodes.slice(0, 42);
    if ($('cityCanvas')) $('cityCanvas').innerHTML = visible.map((n, i) => {
      const x = 8 + ((i * 23) % 84);
      const y = 12 + ((i * 37) % 74);
      return `<button class="city-node ${esc(n.status || '')}" style="left:${x}%;top:${y}%;" title="${esc(n.id)}"><strong>${esc(n.label || n.name || n.id)}</strong><small>${esc(n.type || n.status || '')}</small></button>`;
    }).join('');
  }
  const overview = state.data.overview?.metrics || {};
  if ($('knowledgeDistrict')) $('knowledgeDistrict').innerHTML = [
    metric('Memorias', overview.memories),
    metric('Graph edges', overview.graphEdges),
    metric('City nodes', overview.cityNodes),
    metric('Capabilities', overview.capabilities),
  ].join('');
  const workers = state.data.workers?.workers || [];
  if ($('workersDistrict')) $('workersDistrict').innerHTML = workers.length ? workers.map((w) => row(w.name || w.id, w.role || '', w.status || 'KNOWN')).join('') : row('workers', 'sem workers publicados', 'EMPTY');
  const proposals = state.data.agents?.tasks || state.data.swarm?.agents || [];
  if ($('evolutionDistrict')) $('evolutionDistrict').innerHTML = Array.isArray(proposals) && proposals.length ? proposals.slice(0, 10).map((p) => row(p.name || p.id || p.role, p.summary || p.status || '', p.status || 'KNOWN')).join('') : row('evolucao', 'sem propostas ou agentes ativos', 'EMPTY');
}

function renderOffice() {
  if ($('officeList')) $('officeList').innerHTML = state.office.length
    ? state.office.map((o) => `<article class="office-card"><h3>${esc(o.store || o.subjectName || o.projectId)}</h3><p>${esc(o.niche || '')}</p><p>${esc(o.headcount || 0)} membros</p><button class="soft-btn" data-office="${esc(o.projectId)}" type="button">Abrir equipe</button></article>`).join('')
    : '<div class="row"><b>Office</b><small>Nenhuma workforce contratada ainda.</small><span class="status-pill warn">EMPTY</span></div>';
  document.querySelectorAll('[data-office]').forEach((button) => button.addEventListener('click', () => openOffice(button.dataset.office)));
}

async function openOffice(projectId) {
  try {
    const workforce = await api(`/projects/${encodeURIComponent(projectId)}/workforce`);
    text('officeTitle', workforce.subjectName || projectId);
    const employees = workforce.employees || [];
    if ($('officeDetail')) $('officeDetail').innerHTML = employees.map((e) => row(e.title || e.role, e.focus || e.capability || '', `nivel ${e.level || 1}`)).join('') || row('equipe', 'sem funcionarios', 'EMPTY');
  } catch (error) {
    if ($('officeDetail')) $('officeDetail').innerHTML = row(projectId, error.message, 'ERROR');
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
  if ($('projectList')) $('projectList').innerHTML = projects.length
    ? projects.map((p) => {
      const repo = reposById.get(p.repositoryId) || p.repository || {};
      const status = p.analysisStatus || p.status || 'Active';
      return `<tr>
        <td><b>${esc(p.name || p.id)}</b> <small style="color:var(--text-muted)">${esc(repo.owner || '')}/${esc(repo.name || '')}</small></td>
        <td><span class="badge ${/active/i.test(status)?'green':'warn'}">${esc(status)}</span></td>
        <td>${p.agents?.length || 0} agentes</td>
        <td><button class="btn btn-sm" data-hire="${esc(p.id)}" type="button"><i class="ph ph-briefcase"></i> Contratar</button></td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="4" style="text-align:center; padding:32px 0; color:var(--text-muted);">Nenhum projeto encontrado.</td></tr>';
  document.querySelectorAll('[data-hire]').forEach((button) => button.addEventListener('click', () => hireWorkforce(button.dataset.hire)));
  const graph = state.data.graph || {};
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  if ($('graphSummary')) $('graphSummary').innerHTML = [
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
    if ($('graphSummary')) $('graphSummary').innerHTML = row('Contratar equipe', error.message, 'ERROR') + $('graphSummary').innerHTML;
  }
}

function renderKnowledge() {
  const kos = state.data.kos || {};
  if ($('kosManifest')) $('kosManifest').innerHTML = Object.keys(kos).length
    ? Object.entries(kos).slice(0, 12).map(([key, value]) => row(key, typeof value === 'object' ? JSON.stringify(value).slice(0, 120) : value, value?.state || '')).join('')
    : row('KOS', kos.__error || 'manifesto indisponivel', 'UNKNOWN');
  const anomalies = state.data.kg?.anomalies || state.data.graph?.edges || [];
  if ($('kgList')) $('kgList').innerHTML = Array.isArray(anomalies) && anomalies.length
    ? anomalies.slice(0, 20).map((item, i) => row(item.type || item.id || `relacao ${i + 1}`, item.source || item.target || JSON.stringify(item).slice(0, 90), item.status || 'GRAPH')).join('')
    : row('Knowledge graph', 'sem anomalias carregadas nesta tela', 'EMPTY');
}

function renderSkills() {
  const skills = state.data.skills?.skills || [];
  text('skillCount', `${skills.length} skills`);
  if ($('skillList')) $('skillList').innerHTML = skills.length
    ? skills.map((skill) => row(skill.name, `${skill.source} Â· ${skill.estimatedTokens} tokens Â· ${skill.triggers.join(', ') || 'always-on'}`, skill.alwaysOn ? 'GLOBAL' : 'TRIGGER')).join('')
    : row('skills', state.data.skills?.__error || 'nenhuma skill encontrada', 'EMPTY');
  if (!$('skillContext').innerHTML) {
    if ($('skillContext')) $('skillContext').innerHTML = row('context pack', 'digite um objetivo para selecionar skills', 'READY');
  }
  renderFullstackSlices();
}

function renderFullstackSlices() {
  const box = $('sliceList');
  if (!box) return;
  const slices = state.data.fullstackSlices?.slices || [];
  box.innerHTML = slices.length
    ? slices.map((slice) => row(slice.name, `${slice.backend?.routes?.length || 0} rotas API - ${slice.records?.length || 0} registros - ${slice.skillId}`, slice.status || 'READY')).join('')
    : row('fullstack builder', state.data.fullstackSlices?.__error || 'nenhuma fatia criada ainda', 'READY');
}

async function createFullstackSlice(prompt) {
  const value = String(prompt || '').trim();
  if (!value) return;
  if ($('sliceList')) $('sliceList').innerHTML = row('criando front + back', value, 'RUNNING') + $('sliceList').innerHTML;
  try {
    const slice = await api('/scos/factory/slices', {
      method: 'POST',
      body: JSON.stringify({
        prompt: value,
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'status', type: 'enum:todo|doing|done', required: true },
          { name: 'owner', type: 'string', required: false },
        ],
      }),
    });
    await api(`/scos/factory/slices/${encodeURIComponent(slice.id)}/data`, {
      method: 'POST',
      body: JSON.stringify({ title: value.slice(0, 80), status: 'doing', owner: localStorage.getItem('grg_user') || 'grg-admin' }),
    });
    $('slicePrompt').value = '';
    await refreshAll();
  } catch (error) {
    if ($('sliceList')) $('sliceList').innerHTML = row('builder falhou', error.message, 'ERROR') + $('sliceList').innerHTML;
  }
}

async function selectSkills(objective) {
  const value = String(objective || '').trim();
  if (!value) return;
  if ($('skillContext')) $('skillContext').innerHTML = row('selecionando skills', value, 'RUNNING');
  try {
    const pack = await api('/skills/select', { method: 'POST', body: JSON.stringify({ objective: value, maxTokens: 1200, limit: 4 }) });
    if ($('skillContext')) $('skillContext').innerHTML = [
      row('objetivo', pack.objective, `${pack.estimatedTokens} tokens`),
      row('economia estimada', `${pack.savedBySelectiveLoad || 0} tokens nao carregados`, 'MEASURED'),
      ...(pack.selectedSkills || []).map((skill) => row(skill.name, `${skill.source} Â· score ${skill.score} Â· ${skill.contextTokens} tokens`, 'SELECTED')),
    ].join('');
  } catch (error) {
    if ($('skillContext')) $('skillContext').innerHTML = row('skill select', error.message, 'ERROR');
  }
}

function renderConnectors() {
  const connectors = state.data.connectors?.connectors || [];
  if ($('connectorList')) $('connectorList').innerHTML = connectors.length
    ? connectors.map((c) => row(c.connectorId || c.id, c.source || c.reason || '', c.state?.value || c.status || 'UNKNOWN')).join('')
    : row('conectores', state.data.connectors?.__error || 'nenhum conector registrado', 'EMPTY');
  const router = state.data.router || {};
  const chosen = router.chosen?.value || router.chosen || router;
  if ($('routerState')) $('routerState').innerHTML = [
    row('provider escolhido', chosen.provider || chosen.name || 'sem provider', chosen.model || chosen.reason || '', chosen.provider ? 'READY' : 'UNKNOWN'),
    row('API connection', (state.data.connection?.providers || []).length ? `${state.data.connection.providers.length} providers monitorados` : 'sem check executado', (state.data.connection?.providers || [])[0]?.status || ''),
  ].join('');
}

function renderDeploy() {
  const readiness = state.data.readiness || {};
  const totals = readiness.totals || {};
  const gate = state.data.gatekeeper || {};
  if ($('readinessList')) $('readinessList').innerHTML = [
    row('production proven', `${totals.productionProven ?? 0}/${totals.objectives ?? 0}`, totals.productionProven ? 'PARTIAL' : 'BLOCKED'),
    row('gatekeeper', gate.allowed ? 'acao liberada' : gate.reason || 'bloqueado ate haver evidencia', gate.allowed ? 'READY' : 'BLOCKED'),
  ].join('');
}

function renderObservability() {
  const obs = state.data.observability || {};
  if ($('observabilityMetrics')) $('observabilityMetrics').innerHTML = [
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
  if ($('seriesGrid')) $('seriesGrid').innerHTML = cards.length ? cards.join('') : '<div class="row"><b>series</b><small>sem amostras ainda</small><span class="status-pill warn">EMPTY</span></div>';
}

function renderSecurity() {
  const sec = state.data.security || {};
  if ($('securityState')) $('securityState').innerHTML = Object.keys(sec).length
    ? Object.entries(sec).slice(0, 10).map(([key, value]) => row(key, typeof value === 'object' ? JSON.stringify(value).slice(0, 100) : value, value?.state || '')).join('')
    : row('security', sec.__error || 'status indisponivel', 'UNKNOWN');
  const audit = state.data.veracity || {};
  const totals = audit.totals || audit.summary || {};
  if ($('veracityState')) $('veracityState').innerHTML = [
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
  pending.textContent = 'Iniciando FenixMind Job...';
  $('chatLog').appendChild(pending);
  try {
    const res = await api('/api/v2/mind/ingest', { method: 'POST', body: JSON.stringify({ message: value, context: {} }) });
      if (window.openJobInspector) window.openJobInspector(res.jobId, value);
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
  if ($('programList')) $('programList').innerHTML = row('criando programa', value, 'RUNNING') + $('programList').innerHTML;
  try {
    await api('/executive/programs', { method: 'POST', body: JSON.stringify({ objective: value }) });
    $('programObjective').value = '';
    await refreshAll();
  } catch (error) {
    if ($('programList')) $('programList').innerHTML = row('erro ao criar programa', error.message, 'ERROR') + $('programList').innerHTML;
  }
}

async function scanProject(path) {
  if ($('scanResult')) $('scanResult').innerHTML = row('scan em andamento', path || '.', 'RUNNING');
  try {
    const scan = await api('/onedeploy/scan-project', { method: 'POST', body: JSON.stringify({ projectPath: path || '.' }) });
    const d = scan.discovery || {};
    if ($('scanResult')) $('scanResult').innerHTML = [
      row('caminho', scan.projectPath || path || '.', scan.exists ? 'FOUND' : 'MISSING'),
      row('frontend', getMeasured(d.frontendFramework) || d.frontendFramework?.reason || '--', d.frontendFramework?.state || ''),
      row('backend', getMeasured(d.backendFramework) || d.backendFramework?.reason || '--', d.backendFramework?.state || ''),
      row('dependencias', getMeasured(d.dependencyCount) ?? '--', d.dependencyCount?.state || ''),
      row('ci/cd', getMeasured(d.ciCd) ?? d.ciCd?.reason ?? '--', d.ciCd?.state || ''),
    ].join('');
  } catch (error) {
    if ($('scanResult')) $('scanResult').innerHTML = row('scan falhou', error.message, 'ERROR');
  }
}

async function loadFs(path = '') {
  try {
    const data = await api(`/dev/fs?path=${encodeURIComponent(path)}`);
    if ($('fsList')) $('fsList').innerHTML = (data.items || []).map((item) => row(item.name, item.path, item.isDirectory ? 'DIR' : 'FILE')).join('') || row('fs', 'vazio', 'EMPTY');
    document.querySelectorAll('#fsList .row').forEach((el) => {
      el.addEventListener('click', () => {
        const filePath = el.querySelector('small')?.textContent || '';
        if (el.textContent.includes('FILE')) openFile(filePath);
        else { $('fsPath').value = filePath; loadFs(filePath); }
      });
    });
  } catch (error) {
    if ($('fsList')) $('fsList').innerHTML = row('developer fs', error.message, 'ERROR');
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
  
  // Helpers for safe binding
  const addEvt = (id, event, handler) => { const el = $(id); if (el) el.addEventListener(event, handler); };

  addEvt('refreshBtn', 'click', () => refreshAll());
  addEvt('logoutBtn', 'click', async () => {
    await api('/login/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('grg_token');
    location.replace('/GRG-login');
  });
  addEvt('cmdForm', 'submit', (event) => {
    event.preventDefault();
    const value = $('prompt') ? $('prompt').value : '';
    if ($('prompt')) $('prompt').value = '';
    runChat(value);
  });
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => runChat(button.dataset.prompt)));
  addEvt('projectSearch', 'input', renderProjects);
  addEvt('repoVisibility', 'change', renderProjects);
  addEvt('programForm', 'submit', (event) => { event.preventDefault(); if ($('programObjective')) createProgram($('programObjective').value); });
  addEvt('scanForm', 'submit', (event) => { event.preventDefault(); if ($('scanPath')) scanProject($('scanPath').value); });
  addEvt('skillForm', 'submit', (event) => { event.preventDefault(); if ($('skillObjective')) selectSkills($('skillObjective').value); });
  addEvt('sliceForm', 'submit', (event) => { event.preventDefault(); if ($('slicePrompt')) createFullstackSlice($('slicePrompt').value); });
  addEvt('tickBtn', 'click', async () => { await api('/runtime/tick', { method: 'POST' }); await refreshAll(); });
  addEvt('rebuildCityBtn', 'click', async () => { await api('/city/rebuild', { method: 'POST' }); await refreshAll(); });
  addEvt('sampleBtn', 'click', async () => { await api('/observability/series/sample', { method: 'POST' }); await refreshAll(); });
  addEvt('checkApiBtn', 'click', async () => { await api('/connection/check', { method: 'POST', body: JSON.stringify({ provider: 'aiplatform' }) }); await refreshAll(); });
  addEvt('fsLoadBtn', 'click', () => { if ($('fsPath')) loadFs($('fsPath').value); });
  addEvt('terminalBtn', 'click', async () => {
    if (!$('terminalCmd')) return;
    const out = await api('/dev/terminal', { method: 'POST', body: JSON.stringify({ command: $('terminalCmd').value, sessionId: `ui-${Date.now()}` }) });
    if ($('terminalResult')) $('terminalResult').textContent += `\n$ ${$('terminalCmd').value}\n${out.stdout || out.stderr || 'ok'}`;
    $('terminalCmd').value = '';
  });
  
  addEvt('cmdBtn', 'click', openCommand);
  addEvt('closeCmdBtn', 'click', () => { if ($('cmdDialog')) $('cmdDialog').close(); });
  addEvt('cmdInput', 'input', renderCommandPalette);
  window.addEventListener('hashchange', () => showView(location.hash.slice(1) || 'command', false));
  window.addEventListener('hashchange', () => refreshAll());
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
  if ($('cmdResults')) $('cmdResults').innerHTML = commands.map(([target, label]) => row(label, `#${target}`, 'NAV')).join('');
  document.querySelectorAll('#cmdResults .row').forEach((el, i) => {
    el.addEventListener('click', () => {
      showView(commands[i][0]);
      $('cmdDialog').close();
    });
  });
}

init();


// --- AI CITY 3D CANVAS & INTERACTION ----------------------------------
  window.initCityCanvas = function() {
    const canvas = document.getElementById('cityCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      phase: Math.random() * Math.PI * 2
    }));

    const traffic = Array.from({ length: 16 }, (_, i) => ({
      axis: i % 2 === 0 ? 'X' : 'Y',
      pos: (Math.random() - 0.5) * 800,
      lane: (i % 4 - 1.5) * 140,
      speed: (Math.random() * 1.2 + 0.8) * (i % 2 === 0 ? 1 : -1),
      color: i % 3 === 0 ? '#38bdf8' : (i % 3 === 1 ? '#f59e0b' : '#a78bfa'),
      tailLength: 25 + Math.random() * 20
    }));

    const agents = []; // REPLACED BY REAL AGENTS STATE

    const embers = Array.from({ length: 25 }, () => ({
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 40,
      vy: Math.random() * 1.2 + 0.6,
      alpha: Math.random() * 0.8 + 0.2,
      size: Math.random() * 2.5 + 1.2
    }));

    let tick = 0;

    
      function mapRealAgentsToVisual() {
         const realAgents = window.state?.agentStates || {};
         const agentKeys = Object.keys(realAgents);
         if (!window._visualAgents) window._visualAgents = [];
         
         const newVisuals = [];
         agentKeys.forEach((key, i) => {
            const ra = realAgents[key];
            if (ra.status !== 'ACTIVE' && ra.status !== 'RUNNING') return;
            
            let va = window._visualAgents.find(a => a.key === key);
            if (!va) {
               va = {
                 key,
                 x: (Math.random() - 0.5) * 400,
                 y: (Math.random() - 0.5) * 300,
                 targetX: (Math.random() - 0.5) * 400,
                 targetY: (Math.random() - 0.5) * 300,
                 speed: 0.0008 + Math.random() * 0.0006,
                 avatar: 'ðŸ¤–',
                 role: ra.role || key,
                 fullName: key,
                 color: '#38bdf8',
                 step: 0
               };
            }
            newVisuals.push(va);
         });
         window._visualAgents = newVisuals;
         return newVisuals;
      }
      function render() {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (state.cyberMode) {
        bgGrad.addColorStop(0, '#04070c');
        bgGrad.addColorStop(0.5, '#060a12');
        bgGrad.addColorStop(1, '#0a101d');
      } else {
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#1e293b');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Stars
      stars.forEach(s => {
        const a = Math.sin(tick * s.twinkleSpeed + s.phase) * 0.4 + 0.6;
        ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.7})`;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.save();
      ctx.translate(width / 2 + state.panX, height / 2 + state.panY);
      ctx.scale(state.zoom, state.zoom);

      drawDistantSkyline(ctx, tick);
      drawGroundNetwork(ctx, tick);
      drawTraffic(ctx, traffic);
      drawPhoenixMonument(ctx, tick, embers);
      drawAllCityBuildings(ctx, tick);
      drawLivingAgents(ctx, mapRealAgentsToVisual(), tick);

      ctx.restore();
      requestAnimationFrame(render);
    }

    render();

    document.getElementById('cityZoomIn')?.addEventListener('click', () => { state.zoom = Math.min(state.zoom + 0.2, 2.5); });
    document.getElementById('cityZoomOut')?.addEventListener('click', () => { state.zoom = Math.max(state.zoom - 0.2, 0.5); });
    document.getElementById('cityResetCam')?.addEventListener('click', () => { state.zoom = 1.0; state.panX = 0; state.panY = 0; });
    document.getElementById('cityDayNightToggle')?.addEventListener('click', function() {
      state.cyberMode = !state.cyberMode;
      this.textContent = state.cyberMode ? 'ðŸŒ™ Modo Cyber' : 'â˜€ï¸ Modo Dia';
    });

    let isDragging = false;
    let startX = 0, startY = 0;

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - state.panX;
      startY = e.clientY - state.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      state.panX = e.clientX - startX;
      state.panY = e.clientY - startY;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      state.zoom = Math.min(Math.max(state.zoom * zoomFactor, 0.4), 3.0);
    }, { passive: false });

    // Handle agent character click on canvas
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - width / 2 - state.panX) / state.zoom;
      const mouseY = (e.clientY - rect.top - height / 2 - state.panY) / state.zoom;

      // Find closest agent within 25px
      const clickedAgent = agents.find(ag => Math.hypot(ag.x - mouseX, ag.y - mouseY) < 25);
      if (clickedAgent) {
        openAgentInspector(clickedAgent.fullName || 'Architect Agent');
      }
    });

    document.querySelectorAll('.building-card-pin, .monument-pin').forEach((pin) => {
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        const bKey = pin.dataset.building;
        openBuildingDrawer(bKey);
      });
    });

    document.getElementById('drawerCloseBtn')?.addEventListener('click', closeBuildingDrawer);
    document.getElementById('buildingDrawerOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'buildingDrawerOverlay') closeBuildingDrawer();
    });

    initCityJarvisAssistant();
  }

  function drawDistantSkyline(ctx, tick) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;

    const distantTowers = [
      { x: -500, w: 40, h: 180 }, { x: -440, w: 60, h: 260 }, { x: -360, w: 50, h: 220 },
      { x: -280, w: 70, h: 310 }, { x: -180, w: 55, h: 240 }, { x: 180, w: 65, h: 290 },
      { x: 270, w: 45, h: 210 }, { x: 340, w: 80, h: 340 }, { x: 440, w: 50, h: 250 }
    ];

    distantTowers.forEach(t => {
      ctx.fillRect(t.x, -180 - t.h * 0.4, t.w, t.h * 0.4);
      ctx.strokeRect(t.x, -180 - t.h * 0.4, t.w, t.h * 0.4);
    });
    ctx.restore();
  }

  function drawGroundNetwork(ctx, tick) {
    const gridSize = 45;
    const gridCount = 14;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';

    for (let x = -gridCount; x <= gridCount; x++) {
      for (let y = -gridCount; y <= gridCount; y++) {
        const isoX = (x - y) * gridSize;
        const isoY = (x + y) * (gridSize * 0.5);
        ctx.beginPath();
        ctx.arc(isoX, isoY, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.fill();
      }
    }
  }

  function drawTraffic(ctx, traffic) {
    traffic.forEach(t => {
      t.pos += t.speed;
      if (t.pos > 400) t.pos = -400;
      if (t.pos < -400) t.pos = 400;

      let x, y, tx, ty;
      if (t.axis === 'X') {
        x = t.pos;
        y = t.lane * 0.5;
        tx = x - (t.speed > 0 ? t.tailLength : -t.tailLength);
        ty = y;
      } else {
        x = t.lane;
        y = t.pos * 0.5;
        tx = x;
        ty = y - (t.speed > 0 ? t.tailLength * 0.5 : -t.tailLength * 0.5);
      }

      const grad = ctx.createLinearGradient(tx, ty, x, y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, t.color);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
    });
  }

  function drawPhoenixMonument(ctx, tick, embers) {
    ctx.save();
    const plazaRadius = 75;
    ctx.beginPath();
    ctx.ellipse(0, 0, plazaRadius, plazaRadius * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    drawIsoBlock(ctx, 0, 0, 32, 16, '#d97706', '#f59e0b', '#78350f');
    drawIsoBlock(ctx, 0, -16, 22, 14, '#b45309', '#fbbf24', '#451a03');

    const wingFlap = Math.sin(tick * 0.08) * 10;
    const monumentY = -34;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, monumentY - 22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAllCityBuildings(ctx, tick) {
    const buildings = []; // MOCKS REMOVED

    
      const realProjects = window.state?.projects || [];
      const dynamicBuildings = realProjects.map((p, i) => {
         const cols = ['#f97316', '#10b981', '#38bdf8', '#ec4899', '#a78bfa', '#f59e0b'];
         return {
            key: p.id || p.name || 'proj_'+i,
            x: (i % 3 - 1) * 160,
            y: Math.floor(i / 3) * 150 - 100,
            width: 45,
            height: 120,
            primaryColor: cols[i % cols.length]
         };
      });
      dynamicBuildings.forEach(b => {
      drawIsoBlock(ctx, b.x, b.y, b.width, b.height, 'rgba(15, 23, 42, 0.95)', 'rgba(30, 48, 85, 0.98)', 'rgba(10, 16, 30, 0.95)', b.primaryColor);
    });
  }

  function drawIsoBlock(ctx, x, y, size, height, leftCol, topCol, rightCol, strokeCol = null) {
    const topY = y - height;

    ctx.fillStyle = leftCol;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size, y - size * 0.4);
    ctx.lineTo(x - size, topY - size * 0.4);
    ctx.lineTo(x, topY);
    ctx.closePath();
    ctx.fill();
    if (strokeCol) { ctx.strokeStyle = strokeCol; ctx.stroke(); }

    ctx.fillStyle = rightCol;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y - size * 0.4);
    ctx.lineTo(x + size, topY - size * 0.4);
    ctx.lineTo(x, topY);
    ctx.closePath();
    ctx.fill();
    if (strokeCol) { ctx.strokeStyle = strokeCol; ctx.stroke(); }

    ctx.fillStyle = topCol;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x - size, topY - size * 0.4);
    ctx.lineTo(x, topY - size * 0.8);
    ctx.lineTo(x + size, topY - size * 0.4);
    ctx.closePath();
    ctx.fill();
    if (strokeCol) { ctx.strokeStyle = strokeCol; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function drawLivingAgents(ctx, agents, tick) {
    agents.forEach(ag => {
      ag.x += (ag.targetX - ag.x) * ag.speed * 8;
      ag.y += (ag.targetY - ag.y) * ag.speed * 8;

      if (Math.hypot(ag.targetX - ag.x, ag.targetY - ag.y) < 0.03) {
        ag.targetX = (Math.random() - 0.5) * 500;
        ag.targetY = (Math.random() - 0.5) * 350;
      }

      const screenX = ag.x;
      const screenY = ag.y;

      ctx.beginPath();
      ctx.ellipse(screenX, screenY, 8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = ag.color;
      ctx.fill();

      const bobbing = Math.sin(tick * 0.15 + ag.x) * 2;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ag.avatar, screenX, screenY - 8 + bobbing);

      ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
      ctx.fillRect(screenX - 28, screenY - 26 + bobbing, 56, 13);
      ctx.strokeStyle = ag.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX - 28, screenY - 26 + bobbing, 56, 13);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.fillText(ag.role, screenX, screenY - 17 + bobbing);
    });
  }

  function openBuildingDrawer(key) {
    const overlay = document.getElementById('buildingDrawerOverlay');
    const title = document.getElementById('drawerTitle');
    const body = document.getElementById('drawerBody');
    if (!overlay) return;

    if (title) title.textContent = key.toUpperCase().replace('-', ' ');
    if (body) {
      body.innerHTML = `
        <div class="dash-card" style="background:rgba(18,27,43,0.85); border:1px solid var(--border-subtle);">
          <h4>ðŸ¢ Painel do MÃ³dulo: ${escapeHtml(key)}</h4>
          <p style="color:var(--text-secondary); font-size:12px; margin-top:4px;">
            MÃ³dulo ativo e conectado ao runtime do FÃªnix OS.
          </p>
          <div style="display:flex; gap:8px; margin-top:12px;">
            <button class="action-btn-primary" onclick="window.switchViewToIde()" type="button">Abrir na IDE</button>
          </div>
        </div>
      `;
    }
    overlay.style.display = 'flex';
  }

  window.switchViewToIde = function () {
    closeBuildingDrawer();
    switchView('ide');
  };

  function closeBuildingDrawer() {
    const overlay = document.getElementById('buildingDrawerOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  // --- LATERAL JARVIS ASSISTANT CHAT CONTROLLER -------------------------
  function initCityJarvisAssistant() {
    const form = document.getElementById('cityJarvisForm');
    const input = document.getElementById('cityJarvisInput');
    const toggleBtn = document.getElementById('toggleJarvisSideBtn');
    const split = document.querySelector('.city-main-split');

    toggleBtn?.addEventListener('click', () => {
      split?.classList.toggle('jarvis-collapsed');
      window.dispatchEvent(new Event('resize'));
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input?.value.trim();
      if (!text) return;

      appendCityJarvisMessage('user', text);
      if (input) input.value = '';

      await executeJarvisAssistantCommand(text);
    });

    document.querySelectorAll('.jarvis-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.dataset.cmd;
        if (input) input.value = cmd;
        form?.dispatchEvent(new Event('submit'));
      });
    });
  }

  async function executeJarvisAssistantCommand(prompt) {
    openJobModal({
      title: 'MissÃ£o AutÃ´noma JARVIS',
      objective: prompt,
      estimatedTime: '12 min',
      riskLevel: 'SAFE'
    });

    advanceJobStep(0, 5, 'Architect Agent', `Mapeando arquivos e contexto para: "${prompt}"`);

    const startTime = Date.now();
    try {
                        
      const res = await fetch('/api/v2/mind/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source: 'jarvis_chat',
          message: prompt,
          projectId: state.activeProjectId || 'fenix_test_lab'
        })
      });

      const data = await res.json();
      const latency = Date.now() - startTime;

      if (data.success) {
        state.tokenCount += 450;
        updateTopbarTelemetry('CONNECTED', latency, state.activeModel);

        completeJobExecution(data.realityScore || 99.8);
        appendCityJarvisMessage('assistant', `
          <p><b>âœ… MissÃ£o Processada pelo FÃŠNIX MIND!</b></p>
          <p style="font-size:11.5px; margin-top:4px;">IntenÃ§Ã£o: <b>${escapeHtml(data.intent)}</b> â€¢ Reality Score: <b>${data.realityScore}%</b></p>
          <div class="msg-action-box" style="margin-top:6px;">
            <span>âš¡ Agentes: <b>${(data.requiredAgents || []).join(', ')}</b></span>
          </div>
        `);

        await fetchActiveProjectFiles();
        await refreshAllRealData();
      } else {
        throw new Error(data.error || 'Falha na execuÃ§Ã£o');
      }
    } catch (err) {
      appendJobLog('QA Agent', `Falha na execuÃ§Ã£o: ${err.message}`, 'var(--flame)');
      appendCityJarvisMessage('assistant', `<p style="color:var(--flame);"><b>Erro:</b> ${escapeHtml(err.message)}</p>`);
    }
  }

  function appendCityJarvisMessage(role, htmlContent, id = null) {
    const feed = document.getElementById('cityJarvisMessagesFeed');
    if (!feed) return;

    const div = document.createElement('div');
    div.className = `jarvis-msg msg-${role}`;
    if (id) div.id = id;

    div.innerHTML = `
      <div class="msg-header">
        <span class="msg-avatar">${role === 'user' ? 'ðŸ‘¤' : 'ðŸ”¥'}</span>
        <span class="msg-author">${role === 'user' ? 'VocÃª' : 'FÃŠNIX JARVIS'}</span>
      </div>
      <div class="msg-body">${htmlContent}</div>
    `;

    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
  }

  


window.openJobInspector = function(jobId, promptText) {
  document.getElementById('jobInspectorModal').style.display = 'block';
  document.getElementById('inspectorJobId').textContent = jobId;
  document.getElementById('inspectorJobTitle').textContent = promptText || 'Real-time Autonomous Job';
  document.getElementById('jobInspectorBody').innerHTML = '<div style="color:#888;">Aguardando eventos fÃ­sicos do AgentRuntime...</div>';
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('jobInspectorCloseBtn')?.addEventListener('click', () => {
    document.getElementById('jobInspectorModal').style.display = 'none';
  });
  if (window.initCityCanvas) window.initCityCanvas();
  
  if (!window.sseEventSource) {
    window.sseEventSource = new EventSource('/api/v2/events/stream');
    window.sseEventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const ev = payload.data;
        if (!ev) return;
        
        // Append to job inspector if it's open
        const body = document.getElementById('jobInspectorBody');
        if (body && document.getElementById('jobInspectorModal').style.display === 'block') {
           const div = document.createElement('div');
           div.style.padding = '8px'; div.style.background = '#222'; div.style.borderRadius = '4px'; div.style.fontSize = '12px'; div.style.fontFamily = 'monospace'; div.style.color = '#ccc';
           div.textContent = '[' + ev.type + '] ' + (ev.details?.step || ev.details?.action || ev.details?.message || ev.details?.provider || '');
           body.appendChild(div);
           body.scrollTop = body.scrollHeight;
        }
      } catch (err) {}
    };
  }
});




// === SUB-VIEW ROUTING (ADDED FOR 7-TAB ARCHITECTURE) ===
window.showSubView = function(viewId, subViewId) {
  // Toggle buttons
  const navContainer = document.querySelector('#view-' + viewId + ' .sub-nav');
  if (navContainer) {
    navContainer.querySelectorAll('button').forEach(btn => {
      if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("'" + subViewId + "'")) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  // Toggle views
  const viewContainer = document.querySelector('#view-' + viewId);
  if (viewContainer) {
    viewContainer.querySelectorAll('.sub-view').forEach(sub => {
      if (sub.id === 'sub-' + viewId + '-' + subViewId) {
        sub.classList.add('active');
      } else {
        sub.classList.remove('active');
      }
    });
  }
};

