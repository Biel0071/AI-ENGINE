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
  agentStates: {},
  currentFilePath: ''
};
const state = window.state;
window.FENIX = window.FENIX || {};
window.FENIX.state = state;

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

function compactValue(value) {
  const measured = getMeasured(value);
  if (measured == null || measured === '') return '--';
  if (typeof measured === 'object') return JSON.stringify(measured);
  return String(measured);
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
window.FENIX.api = api;

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
    const pSwitcher = $('projectSwitcher');
    const selectedProjectPath = pSwitcher?.selectedOptions?.[0]?.dataset?.path || '';
    const essentialEntries = [
      ['health', () => publicJson('/health')],
      ['me', () => api('/me')],
      ['overview', () => api('/overview')],
      ['projectMirror', () => api(`/project-mirror${selectedProjectPath ? `?path=${encodeURIComponent(selectedProjectPath)}` : ''}`)],
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
      command: []
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
  renderAgents();
  renderMemory();
  renderCity();
  renderOffice();
  renderProjects();
  renderKnowledge();
  renderSkills();
  renderConnectors();
  renderDeploy();
  renderObservability();
  renderSecurity();
  window.dispatchEvent(new CustomEvent('fenix:data', { detail: state.data }));
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
  text('appVersion', health?.version || state.data.runtime?.version || '--');
  text('kpiLatency', telemetry?.lastLatencyMs != null ? `${telemetry.lastLatencyMs} ms` : '--');
  text('kpiTokens', telemetry?.tokens ?? telemetry?.totalTokens ?? '--');
  text('composerModel', telemetry?.lastModel || telemetry?.model || '--');
  text('aiStatusBadge', telemetry?.calls ? 'Medido' : 'Nao medido');
  const agents = state.data.agents?.agents || state.data.swarm?.agents || [];
  text('kpiAgents', Array.isArray(agents) ? agents.length : Object.keys(agents || {}).length);
  text('kpiSystem', ok ? 'READY' : 'DEGRADED');
  text('systemHealthValue', ok ? 'READY' : 'DEGRADED');
  text('systemErrorValue', health?.degraded || health?.error || 'sem erro crítico reportado');
}

function renderCommand() {
  const telemetry = state.data.telemetry || {};
  const ok = state.data.health?.ok === true || state.data.health?.status === 'ready';

  const activeJob = state.jobs.find(j => j.status === 'processing' || j.status === 'running' || j.status === 'RUNNING' || j.status === 'PROCESSING');
  const barActiveJob = $('barActiveJob');
  if (barActiveJob) {
    if (activeJob) {
      barActiveJob.textContent = activeJob.id.split('-')[0].toUpperCase();
      barActiveJob.style.color = 'var(--accent)';
    } else {
      barActiveJob.textContent = 'WAITING';
      barActiveJob.style.color = 'var(--text-main)';
    }
  }

  const barWorker = $('barWorker');
  if (barWorker) {
    const workers = Array.isArray(state.data.workers?.workers) ? state.data.workers.workers : [];
    const busyWorker = workers.find(w => w.activeJobs > 0 || w.status === 'busy');
    if (busyWorker) {
      barWorker.textContent = 'BUSY';
      barWorker.style.color = 'var(--accent)';
    } else if (workers.length > 0) {
      barWorker.textContent = 'IDLE';
      barWorker.style.color = 'var(--text-main)';
    } else {
      barWorker.textContent = 'OFFLINE';
      barWorker.style.color = 'var(--rose)';
    }
  }

  const barAi = $('barAi');
  if (barAi) {
    if (telemetry.calls > 0) {
      barAi.textContent = 'ONLINE';
      barAi.style.color = 'var(--green)';
    } else {
      barAi.textContent = 'IDLE';
      barAi.style.color = 'var(--text-main)';
    }
  }

  const barRuntime = $('barRuntime');
  if (barRuntime) {
    barRuntime.textContent = ok ? 'ONLINE' : 'DEGRADED';
    barRuntime.style.color = ok ? 'var(--green)' : 'var(--rose)';
  }

  const pmScreens = $('pmScreensBadge');
  const mirror = state.data.projectMirror || {};
  if (pmScreens) {
    pmScreens.textContent = mirror.screens ? mirror.screens.length : '0';
  }
  const pmComponents = $('pmComponentsBadge');
  if (pmComponents) {
    pmComponents.textContent = mirror.components ? mirror.components.length : '0';
  }
  const pmApis = $('pmApisBadge');
  if (pmApis) {
    pmApis.textContent = mirror.apis ? mirror.apis.length : '0';
  }
  const pmWorkers = $('pmWorkersBadge');
  if (pmWorkers) {
    pmWorkers.textContent = mirror.workers ? mirror.workers.length : '0';
  }
  const pmBackend = $('pmBackendBadge');
  if (pmBackend) {
    pmBackend.textContent = mirror.apis ? mirror.apis.length : '0'; // placeholder mapping
  }
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
    : '<div class="empty-state" style="padding: 24px 0;"><span class="empty-icon" style="font-size: 16px;">--</span>Sem Jobs ativos</div>';

  const programs = state.data.programs?.programs || [];
  if ($('programList')) $('programList').innerHTML = programs.length
    ? programs.map((p) => row(p.objective || p.title || p.id, `${p.missions?.length || 0} missoes`, p.status || 'PROGRAM')).join('')
    : row('programas', 'sem programas executivos', 'EMPTY');
}

function renderAgents() {
  const source = state.data.agents?.agents || state.data.swarm?.agents || [];
  const agents = Array.isArray(source) ? source : Object.entries(source).map(([id, value]) => ({ id, ...(value || {}) }));
  if ($('agentList')) $('agentList').innerHTML = agents.length
    ? agents.map((agent) => row(agent.name || agent.id || agent.role, agent.role || agent.objective || agent.summary || '', agent.status || agent.state || 'KNOWN')).join('')
    : row('agentes', state.data.agents?.__error || state.data.swarm?.__error || 'nenhum agente publicado pelo runtime', 'EMPTY');
}

function renderMemory() {
  const metrics = state.data.overview?.metrics || {};
  const hot = state.data.hotMemory || {};
  if ($('memoryMetrics')) $('memoryMetrics').innerHTML = [
    metric('Memorias', metrics.memories),
    metric('Hot memory', getMeasured(hot.status || hot.state)),
    metric('Entradas quentes', getMeasured(hot.entries || hot.count)),
    metric('Graph edges', metrics.graphEdges),
  ].join('');
  const brief = state.data.dailyBrief || {};
  if ($('memoryBrief')) $('memoryBrief').textContent = brief.summary || brief.message || brief.__error || 'Nenhum resumo de memoria foi publicado nesta sessao.';
}

function renderCity() {
  const agentSource = state.data.swarm?.agents || state.data.agents?.agents || [];
  if (window.fenixCity?.updateAgents) {
    window.fenixCity.updateAgents(Array.isArray(agentSource) ? agentSource : Object.values(agentSource || {}));
  }
  if (window.drawCity) { window.globalCityState = state.data; window.state.agentStates = state.data.swarm?.agents || state.data.agents || {}; window.drawCity(); }

  const nodes = state.data.city?.nodes || [];
  if ($('cityCanvas')) {
    $('cityCanvas').dataset.state = nodes.length ? 'READY' : 'EMPTY';
    $('cityCanvas').title = nodes.length
      ? `${nodes.length} nos publicados pela API /city`
      : 'AI City aguardando eventos reais publicados pelo runtime';
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
    ? skills.map((skill) => row(skill.name, `${skill.source} - ${skill.estimatedTokens} tokens - ${skill.triggers.join(', ') || 'always-on'}`, skill.alwaysOn ? 'GLOBAL' : 'TRIGGER')).join('')
    : row('skills', state.data.skills?.__error || 'nenhuma skill encontrada', 'EMPTY');
  if ($('skillContext') && !$('skillContext').innerHTML) {
    $('skillContext').innerHTML = row('context pack', 'digite um objetivo para selecionar skills', 'READY');
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
      ...(pack.selectedSkills || []).map((skill) => row(skill.name, `${skill.source} - score ${skill.score} - ${skill.contextTokens} tokens`, 'SELECTED')),
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

  const pendingId = 'pipe-' + Date.now();
  const pending = document.createElement('div');
  pending.id = pendingId;
  pending.className = 'bubble system';
  pending.innerHTML = '<span class="status-pill wait">RUNNING</span> Analisando comando e gerando plano de jobs...';
  if ($('chatLog')) {
    $('chatLog').appendChild(pending);
    $('chatLog').scrollTop = $('chatLog').scrollHeight;
  }

  try {
    const res = await api('/autonomous/cycle', {
      method: 'POST',
      body: JSON.stringify({
        objective: value,
        maxConcurrent: 2,
        workLimit: 5
      })
    });

    if (res && res.program) {
      const status = res.status?.state?.value || res.status?.state || res.program.state || 'RUNNING';
      pending.innerHTML = `<span class="status-pill ok">DELEGATED</span> Programa ${res.program.id} materializado pelo Executive Brain. ${res.startedMissions?.length || 0} missões iniciadas; ${res.jobs?.length || 0} jobs processados; estado ${esc(status)}.`;
    } else {
      pending.innerHTML = `<span class="status-pill err">ERROR</span> Resposta inesperada da API.`;
    }
    await refreshAll();
  } catch (err) {
    pending.innerHTML = `<span class="status-pill err">ERROR</span> Falha ao iniciar missão: ${err.message}`;
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
      row('frontend', compactValue(d.frontendFramework), d.frontendFramework?.state || ''),
      row('backend', compactValue(d.backendFramework), d.backendFramework?.state || ''),
      row('dependencias', compactValue(d.dependencyCount), d.dependencyCount?.state || ''),
      row('ci/cd', compactValue(d.ciCd), d.ciCd?.state || ''),
      row('acoplamento', compactValue(d.coupling || scan.coupling), (d.coupling || scan.coupling)?.state || ''),
    ].join('');
  } catch (error) {
    if ($('scanResult')) $('scanResult').innerHTML = row('scan falhou', error.message, 'ERROR');
  }
}

async function loadFs(path = '') {
    try {
      const data = await api('/dev/fs?path=' + encodeURIComponent(path));
      let html = '';
      if (path) {
         const parent = path.split('/').slice(0, -1).join('/');
         html += '<div class="row" style="cursor:pointer; color:var(--accent);" onclick="loadFs(\'' + parent + '\')"><i class="ph ph-arrow-u-up-left"></i> .. (Voltar)</div>';
      }
      const items = data.items || [];
      items.sort((a,b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0) || a.name.localeCompare(b.name));
      
      html += items.map(item => {
         const icon = item.isDirectory ? '<i class="ph-fill ph-folder" style="color:#eab308"></i>' : '<i class="ph ph-file-code" style="color:#38bdf8"></i>';
         return '<div class="row" style="padding-left:10px; cursor:pointer;" onclick="'+ (item.isDirectory ? 'loadFs(\'' + item.path + '\')' : 'openFile(\'' + item.path + '\')') +'">'+icon+' <span>'+item.name+'</span></div>';
      }).join('');
      
      if (document.getElementById('fsList')) document.getElementById('fsList').innerHTML = html || '<div class="row">Vazio</div>';
    } catch (error) {
      if (document.getElementById('fsList')) document.getElementById('fsList').innerHTML = '<div class="row" style="color:red">'+error.message+'</div>';
    }
  }

async function openFile(path) {
  try {
    const data = await api(`/dev/fs/file?path=${encodeURIComponent(path)}`);
    state.currentFilePath = path;
    if ($('currentFilePath')) $('currentFilePath').value = path;
    if ($('fileViewer')) $('fileViewer').value = data.content || '';
    if ($('currentEditorTitle')) $('currentEditorTitle').textContent = path;
    if (window.editor?.setValue) window.editor.setValue(data.content || '');
    if ($('moveFromPath')) $('moveFromPath').value = path;
  } catch (error) {
    if ($('fileViewer')) $('fileViewer').value = `Falha: ${error.message}`;
  }
}

async function saveFile() {
  const filePath = state.currentFilePath || $('currentFilePath')?.value;
  if (!filePath) throw new Error('Abra um arquivo antes de salvar.');
  const content = window.editor?.getValue ? window.editor.getValue() : ($('fileViewer')?.value || '');
  await api(`/dev/fs/file?path=${encodeURIComponent(filePath)}`, { method: 'POST', body: JSON.stringify({ content }) });
  if ($('fileViewer')) $('fileViewer').value = content;
  if ($('fileSaveResult')) $('fileSaveResult').textContent = `Salvo: ${filePath}`;
  return { filePath, content };
}

async function pollTerminal(sessionId) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const session = await api(`/dev/terminal/${encodeURIComponent(sessionId)}`);
    const streamedOutput = Array.isArray(session.output) ? session.output.map((entry) => entry.data || entry.message || '').join('') : '';
    if ($('terminalResult')) $('terminalResult').textContent = streamedOutput || [session.stdout, session.stderr].filter(Boolean).join('\n') || `${session.status || 'RUNNING'}...`;
    if (/finished|completed|failed|error|cancelled|succeeded/i.test(session.status || session.state || '')) return session;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('O terminal continua executando; consulte novamente em instantes.');
}

async function cloneProject() {
  const url = $('gitRepoUrl')?.value?.trim();
  const directory = $('gitRepoDir')?.value?.trim();
  if (!url) throw new Error('Informe a URL Git.');
  const result = await api('/dev/projects/clone', { method: 'POST', body: JSON.stringify({ url, directory: directory || undefined, scan: true }) });
  if ($('gitCloneResult')) $('gitCloneResult').textContent = JSON.stringify(result, null, 2);
  const clonedPath = result.cloned?.relativePath || result.cloned?.path;
  if (clonedPath && $('fsPath')) { $('fsPath').value = clonedPath; await loadFs(clonedPath); }
  return result;
}

function renderLivePreview() {
  const raw = $('livePreviewText')?.value?.trim() || '/app';
  const url = raw.startsWith('http://') || raw.startsWith('https://') ? raw : new URL(raw.startsWith('/') ? raw : `/${raw}`, location.origin).href;
  if ($('livePreviewFrame')) $('livePreviewFrame').src = url;
}

async function transformOpenFile() {
  const path = state.currentFilePath || $('currentFilePath')?.value;
  const instruction = $('aiEditInstruction')?.value?.trim();
  if (!path || !instruction) throw new Error('Abra um arquivo e informe a instrucao.');
  const result = await api('/dev/ai/transform-file', { method: 'POST', body: JSON.stringify({ path, instruction }) });
  if ($('fileViewer')) $('fileViewer').value = result.content || '';
  if (window.editor?.setValue) window.editor.setValue(result.content || '');
  if ($('aiEditResult')) $('aiEditResult').textContent = `${result.summary || 'Proposta gerada.'}\nProvider: ${result.provider || '--'} / ${result.model || '--'}\nRevise e use Salvar arquivo para aplicar.`;
  return result;
}

async function movePath() {
  const from = $('moveFromPath')?.value?.trim();
  const to = $('moveToPath')?.value?.trim();
  if (!from || !to) throw new Error('Informe origem e destino.');
  const result = await api('/dev/fs/move', { method: 'POST', body: JSON.stringify({ from, to }) });
  if (state.currentFilePath === from) { state.currentFilePath = to; if ($('currentFilePath')) $('currentFilePath').value = to; }
  if ($('moveResult')) $('moveResult').textContent = `Movido: ${from} -> ${to}`;
  return result;
}

async function delegateDevAgents() {
  const prompt = $('devAgentObjective')?.value?.trim();
  if (!prompt) throw new Error('Informe o objetivo do pipeline.');
  const result = await api('/dev/pipeline', { method: 'POST', body: JSON.stringify({ prompt, projectPath: $('fsPath')?.value || '.', autoDeploy: false }) });
  if ($('devAgentResult')) $('devAgentResult').textContent = JSON.stringify(result, null, 2);
  return result;
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
  addEvt('tickBtn', 'click', async () => {
    const output = $('runtimeRunResult');
    if (output) output.textContent = 'Executando scheduler e consumindo jobs enfileirados...';
    try {
      const schedules = await api('/runtime/tick', { method: 'POST' });
      const queue = await api('/v2/jobs/run-batch', { method: 'POST', body: JSON.stringify({ limit: 3 }) });
      if (output) output.textContent = JSON.stringify({ schedulesCreated: schedules.jobs?.length || 0, jobsProcessed: queue.processed, jobs: queue.jobs?.map((job) => ({ id: job.id, status: job.status, stage: job.currentStage, error: job.error?.message || null })) || [] }, null, 2);
      await refreshAll();
    } catch (error) {
      if (output) output.textContent = `Falha ao executar fila: ${error.message}`;
    }
  });
  addEvt('rebuildCityBtn', 'click', async () => { await api('/city/rebuild', { method: 'POST' }); await refreshAll(); });
  addEvt('sampleBtn', 'click', async () => { await api('/observability/series/sample', { method: 'POST' }); await refreshAll(); });
  addEvt('checkApiBtn', 'click', async () => { await api('/connection/check', { method: 'POST', body: JSON.stringify({ provider: 'aiplatform' }) }); await refreshAll(); });
  addEvt('fsLoadBtn', 'click', () => { if ($('fsPath')) loadFs($('fsPath').value); });
  addEvt('saveBtn', 'click', () => saveFile().catch((error) => { if ($('fileSaveResult')) $('fileSaveResult').textContent = error.message; }));
  addEvt('fileSaveBtn', 'click', () => saveFile().catch((error) => { if ($('fileSaveResult')) $('fileSaveResult').textContent = error.message; }));
  addEvt('projectSwitcher', 'change', refreshAll);
  addEvt('gitCloneForm', 'submit', (event) => { event.preventDefault(); cloneProject().catch((error) => { if ($('gitCloneResult')) $('gitCloneResult').textContent = error.message; }); });
  addEvt('previewRefreshBtn', 'click', renderLivePreview);
  addEvt('aiEditBtn', 'click', () => transformOpenFile().catch((error) => { if ($('aiEditResult')) $('aiEditResult').textContent = error.message; }));
  addEvt('movePathBtn', 'click', () => movePath().catch((error) => { if ($('moveResult')) $('moveResult').textContent = error.message; }));
  addEvt('devAgentBtn', 'click', () => delegateDevAgents().catch((error) => { if ($('devAgentResult')) $('devAgentResult').textContent = error.message; }));
  addEvt('terminalBtn', 'click', async () => {
    if (!$('terminalCmd')?.value?.trim()) return;
    const command = $('terminalCmd').value.trim();
    const out = await api('/dev/terminal', { method: 'POST', body: JSON.stringify({ command, sessionId: `ui-${Date.now()}` }) });
    if ($('terminalResult')) $('terminalResult').textContent = `$ ${command}\n${out.status || 'ACCEPTED'}`;
    $('terminalCmd').value = '';
    pollTerminal(out.sessionId).catch((error) => { if ($('terminalResult')) $('terminalResult').textContent += `\n${error.message}`; });
  });
  
  addEvt('cmdBtn', 'click', openCommand);
  addEvt('closeCmdBtn', 'click', () => { if ($('cmdDialog')) $('cmdDialog').close(); });
  addEvt('cmdInput', 'input', renderCommandPalette);
  window.addEventListener('hashchange', () => showView(location.hash.slice(1) || 'command', false));
  window.addEventListener('hashchange', () => refreshAll());
  showView(location.hash.slice(1) || 'command', false);
  bubble('Workspace unico carregado. Eu consolidei comando, runtime, missoes, AI City, office, CRM, deploy, observabilidade e developer em uma tela.');
  window.FENIX_READY = true;
  document.dispatchEvent(new Event('FENIX_READY'));
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
    ['city', 'Abrir AI City'],
    ['agents', 'Abrir agentes'],
    ['ide', 'Abrir IDE'],
    ['operations', 'Abrir operacoes'],
    ['runtime', 'Abrir runtime'],
    ['projects', 'Abrir projetos'],
    ['memory', 'Abrir memoria'],
    ['knowledge', 'Abrir conhecimento'],
    ['mcp', 'Abrir MCP Hub'],
    ['browser', 'Abrir Browser QA'],
    ['observability', 'Abrir observabilidade'],
    ['terminal', 'Abrir terminal e developer district'],
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
