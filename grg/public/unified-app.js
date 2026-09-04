const token = window.localStorage?.getItem('grg_token') || null;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let accessToken = token;
const readCache = new Map();
const READ_CACHE_TTL_MS = 2500;

// A valid HttpOnly `fenix_session` cookie may exist even when the bearer token
// is absent from localStorage (for example after a server restart or a hard
// reload).  Let the first authenticated API request validate that session;
// redirecting here made the shell disappear before the canonical bootstrap
// could recover it.

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
let apiBackoffUntil = 0;

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
  if (Date.now() < apiBackoffUntil) throw new Error('API em backoff após limite de requisições');
  const url = path.startsWith('/api') ? path : (path.startsWith('/') ? `/api${path}` : `/api/${path}`);
  const cacheKey = `${accessToken || 'anonymous'}:${url}`;
  const method = String(options.method || 'GET').toUpperCase();
  if (method === 'GET') {
    const cached = readCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.body;
  }
  const res = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {})
    },
  });
  if (res.status === 401 && !retried && await refreshAccessToken()) return api(path, options, true);
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') || 5);
    apiBackoffUntil = Date.now() + Math.min(Math.max(retryAfter, 1), 60) * 1000;
  }
  if (res.status === 401) {
    localStorage.removeItem('grg_token');
    location.replace('/GRG-login');
    throw new Error('sessao expirada');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  if (method === 'GET') readCache.set(cacheKey, { body, expiresAt: Date.now() + READ_CACHE_TTL_MS });
  return body;
}

async function publicJson(path) {
  const cacheKey = `${accessToken || 'anonymous'}:public:${path}`;
  const cached = readCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.body;
  const headers = accessToken ? { authorization: `Bearer ${accessToken}`, Accept: 'application/json' } : {};
  const res = await fetch(path, { headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  readCache.set(cacheKey, { body, expiresAt: Date.now() + READ_CACHE_TTL_MS });
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
  document.querySelectorAll('.view').forEach((el) => {
    const active = el.id === `view-${name}`;
    el.classList.toggle('active', active);
    el.style.display = active ? 'flex' : 'none';
  });
  document.querySelectorAll('[data-nav], [data-view]').forEach((el) => el.classList.toggle('active', (el.dataset.nav || el.dataset.view) === name));
  const label = document.querySelector(`[data-nav="${name}"], [data-view="${name}"]`)?.textContent?.replace(/^[A-Z]{2}/, '').trim() || name;
  text('viewTitle', label);
  if (push) history.replaceState(null, '', `#${name}`);
}

function bubble(message, who = 'bot') {
  const div = document.createElement('div');
  div.className = `bubble ${who}`;
  div.innerHTML = esc(message).replace(/\n/g, '<br>');
  const target = $('chatLog') || document.getElementById('masterCmdForm')?.parentElement;
  if (!target) return;
  target.appendChild(div);
  target.scrollTop = target.scrollHeight;
  return div;
}

const CHAT_HISTORY_KEY = 'fenix_chat_history_v1';
function chatHistory() { try { return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]'); } catch { return []; } }
function saveChatTurn(role, content) {
  const history = chatHistory(); history.push({ role, content, at: new Date().toISOString() });
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(-40)));
}

async function loadChatModels() {
  const select = $('composerModel'); if (!select) return;
  try {
    const status = await api('/api/v2/ai-platform/status');
    const models = (status.providers || []).flatMap(p => p.models || []).map(model => typeof model === 'string' ? model : model.id || model.name).filter(Boolean);
    const available = [...new Set(models.length ? models : ['qwen2.5:3b', 'gemma3:4b', 'gemma4:latest', 'moondream:latest'])];
    available.forEach(model => { const o = document.createElement('option'); o.value = model; o.textContent = model; select.appendChild(o); });
    if (status.status === 'CONNECTED') select.title = 'API conectada — escolha um modelo ou use Automático';
  } catch { select.title = 'API indisponível — Automático'; }
}

async function streamChat(message, { model = null, onEvent = null } = {}) {
  const conversationId = localStorage.getItem('fenix_conversation_id') || null;
  const controller = new AbortController();
  // Context loading can include persisted history and memory retrieval. Keep
  // the live stream open long enough for the real local model to answer.
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response;
  try { response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify({ message, conversationId, model: model || undefined }),
    signal: controller.signal,
  }); } catch (error) { clearTimeout(timeout); throw new Error(error.name === 'AbortError' ? 'stream excedeu 30s' : error.message); }
  if (!response.ok) { clearTimeout(timeout); const body = await response.json().catch(() => ({})); throw new Error(body.error || body.reason || `HTTP ${response.status}`); }
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let textOut = ''; let meta = {};
  const consume = (chunk) => {
    buffer += chunk;
    const blocks = buffer.split(/\n\n/); buffer = blocks.pop() || '';
    for (const block of blocks) {
      const event = (block.match(/^event:\s*(.+)$/m) || [])[1] || 'message';
      const raw = (block.match(/^data:\s*(.+)$/m) || [])[1]; if (!raw) continue;
      let data; try { data = JSON.parse(raw); } catch { continue; }
      if (event === 'token') textOut += data.text || '';
      if (event === 'ready' || event === 'context' || event === 'done') meta = { ...meta, ...data };
      if (onEvent) onEvent(event, data);
    }
  };
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; consume(decoder.decode(value, { stream: true })); }
  } catch (error) {
    throw new Error(error.name === 'AbortError' ? 'stream excedeu 30s' : error.message);
  } finally { clearTimeout(timeout); }
  if (meta.conversationId) localStorage.setItem('fenix_conversation_id', meta.conversationId);
  return { text: meta.text || textOut, ...meta };
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
      memory: [
        ['engineeringMemory', () => api('/fenix/memory/metrics')],
        ['memory', () => api('/memory/search?q=')],
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
      office: [
        ['office', () => api('/office')],
      ],
      developer: [
        ['filesystem', () => api('/dev/fs')],
      ],
      security: [
        ['encryption', () => api('/security/encryption/status')],
      ],
      operations: [
        ['operations', () => api('/operations/state')],
        ['missions', () => api('/fenix/missions')],
        ['jobs', () => api('/runtime/jobs')],
        ['jarvisQueue', () => api('/v2/jarvis/jobs/queue')],
      ],
      mcp: [
        ['connectors', () => api('/connectors')],
        ['router', () => api('/ai/router/select')],
        ['tools', () => api('/execution/tools')],
      ],
    };
    // Command Center polls only operational data. The previous default loaded every
    // intelligence/governance/graph/deploy endpoint on each 15s tick; with an SSE tab
    // open this created a request storm and could starve the HTTP listener. Feature-specific
    // views keep their own endpoints below, while the command view stays live and bounded.
    const entries = viewEntries[activeView] ? [...essentialEntries, ...viewEntries[activeView]] : [
      ['health', () => publicJson('/health')],
      ['me', () => api('/me')],
    ['operations', () => api('/operations/state')],
    ['runtime', () => api('/runtime')],
    ['missions', () => api('/missions')],
    ['jobs', () => api('/runtime/jobs')],
    ['events', () => api('/events?limit=80')],
    ['missionEvents', () => api('/fenix/mission-events?limit=80')],
    ['connection', () => api('/connection')],
    ['projects', () => api('/projects')],
    ['workers', () => api('/workers')],
    ['providers', () => api('/providers')],
    ['agents', () => api('/agents/panel')],
    ['swarm', () => api('/agents/swarm')],
    ['city', () => api('/city')],
    ];
    const data = await settle(entries, viewEntries[activeView] ? 2 : 4);
    state.data = data;
    state.projects = data.projects?.projects || [];
    state.repos = data.repositories?.repositories || [];
    state.office = data.office?.office || [];
    state.events = data.events?.events || [];
    const runtimeJobs = data.jobs?.jobs || [];
    const jarvisJobs = ['running', 'waiting', 'completed', 'failed', 'cancelled']
      .flatMap((key) => Array.isArray(data.jarvisQueue?.[key]) ? data.jarvisQueue[key] : []);
    state.jobs = [...new Map([...runtimeJobs, ...jarvisJobs].map((job) => [job.id, job])).values()];
    state.missions = data.missions?.missions || [];
    if (activeView === 'operations' && state.missions[0]?.id) {
      try { state.data.missionGraph = await api(`/missions/${encodeURIComponent(state.missions[0].id)}/graph`); }
      catch (error) { state.data.missionGraph = { error: error.message }; }
    }
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
  renderImplementationMemory();
  renderSkills();
  renderConnectors();
  renderDeploy();
  renderObservability();
  renderSecurity();
  if (typeof window.renderCommandCenterPanels === 'function') window.renderCommandCenterPanels();
}

function renderImplementationMemory() {
  const host = $('memoryMetrics');
  if (!host) return;
  const m = state.data.engineeringMemory || {};
  const fields = [['Memórias', m.memories], ['Validadas', m.validated], ['Reusos', m.reuseEvents], ['Reuse score', `${m.reuseScore ?? 0}%`]];
  host.innerHTML = fields.map(([label, value]) => `<div class="metric"><strong>${escapeHtml(String(value ?? '—'))}</strong><span>${escapeHtml(label)}</span></div>`).join('');
  text('memoryBrief', m.validated ? `${m.reusedMemories || 0} implementação(ões) reutilizada(s); taxa ${Math.round((m.reuseRate || 0) * 100)}%.` : 'Nenhuma implementação validada promovida ainda.');
}

function renderHeader() {
  const { health, me, overview, jobs, telemetry } = state.data;
  const ok = health?.ok === true || health?.status === 'ready';
  const statusDot = $('statusDot');
  if (statusDot) {
    statusDot.style.background = ok ? 'var(--green)' : 'var(--rose)';
    statusDot.style.boxShadow = `0 0 12px ${ok ? 'var(--green)' : 'var(--rose)'}`;
  }
  text('statusText', ok ? 'ONLINE' : 'DEGRADED');
  text('statusSub', health?.environment || health?.service || 'runtime');
  text('kpiSystem', ok ? 'READY' : 'DEGRADED');
  text('systemHealthValue', ok ? 'ONLINE' : 'DEGRADED');
  text('systemErrorValue', ok ? 'API ONLINE · runtime medido' : (health?.__error || 'runtime degradado'));
  text('actorName', me?.actorId || localStorage.getItem('grg_user') || 'usuario');
  text('actorRole', me?.tenantId || 'tenant');
  const metrics = overview?.metrics || {};
  text('kpiProjects', metrics.projects ?? state.projects.length);
  text('kpiRepos', metrics.repositories ?? state.repos.length);
  text('kpiCaps', metrics.capabilities ?? state.data.capabilities?.capabilities?.length);
  text('kpiJobs', state.jobs.length);
  const agentSource = state.data.agents?.agents || state.data.swarm?.agents || [];
  const agentList = Array.isArray(agentSource) ? agentSource : Object.values(agentSource || {});
  const activeAgents = agentList.filter((agent) => ['ASSIGNED', 'ANALYZING', 'EXECUTING', 'TESTING', 'REPAIRING', 'RUNNING'].includes(String(agent.status || agent.state || '').toUpperCase())).length;
  const totalAgents = agentList.length;
  text('kpiAgents', totalAgents ? `${activeAgents}/${totalAgents}` : '0/0');
  text('kpiAi', telemetry?.calls ?? metrics.aiCalls);
  const agentTable = $('agentList');
  if (agentTable) {
    agentTable.innerHTML = agentList.length ? agentList.map((agent, index) => {
      const id = agent.id || agent.agentId || agent.name || `agent-${index}`;
      return `<tr data-agent-id="${escapeHtml(String(id))}" tabindex="0" style="cursor:pointer"><td><strong>${escapeHtml(agent.name || id)}</strong></td><td>${escapeHtml(agent.role || agent.specialization || '—')}</td><td>${escapeHtml(agent.status || agent.state || 'UNKNOWN')}</td><td>${escapeHtml(agent.currentTask || agent.currentJob || 'Aguardando')}</td></tr>`;
    }).join('') : '<tr><td colspan="4">Nenhum agente publicado pelo runtime.</td></tr>';
    agentTable.querySelectorAll('[data-agent-id]').forEach((row) => {
      row.addEventListener('click', () => { document.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agentId: row.dataset.agentId } })); });
      row.addEventListener('keydown', (event) => { if (event.key === 'Enter') row.click(); });
    });
  }
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
    : '<div class="empty-state" style="padding: 24px 0;"><span class="empty-icon">├ö├¬ÔöÉ</span>Sem eventos</div>';
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
  if ($('workerList')) {
    const normalized = Array.isArray(workers) ? workers : [];
    const statusOf = (w) => String(w.status || w.state || 'KNOWN').toUpperCase();
    const live = normalized.filter((w) => ['ONLINE', 'CONNECTED', 'HEALTHY', 'RUNNING', 'ACTIVE'].includes(statusOf(w)));
    const stale = normalized.filter((w) => ['STALE', 'OFFLINE', 'DEAD', 'UNHEALTHY'].includes(statusOf(w)));
    const current = live.find((w) => String(w.workerId || w.id || '').startsWith('fenix-local:'));
    const rows = [];
    if (current) rows.push(row(`worker local atual · ${current.workerId || current.id}`, current.activeJobs != null ? `${current.activeJobs} jobs ativos` : current.role || 'executor conectado', 'ONLINE'));
    live.filter((w) => w !== current).slice(0, 8).forEach((w) => rows.push(row(w.name || w.id || w.workerId, w.activeJobs != null ? `${w.activeJobs} jobs ativos` : w.role || 'worker conectado', statusOf(w))));
    if (!current && !live.length) rows.push(row('workers', 'nenhum worker ONLINE medido', 'OFFLINE'));
    if (stale.length) rows.push(row('histórico', `${stale.length} heartbeat(s) antigo(s), sem atividade atual`, 'STALE'));
    $('workerList').innerHTML = rows.join('') || row('workers', state.data.workers?.__error || 'nenhum worker publicado', 'UNKNOWN');
  }
}

function renderMissions() {
  const liveMissions = Array.isArray(window.FENIX?.live?.missions) ? window.FENIX.live.missions : [];
  const liveJobs = Array.isArray(window.FENIX?.live?.jobs) ? window.FENIX.live.jobs : [];
  const missions = [...new Map([...state.missions, ...liveMissions].map((item) => [item.id || item.missionId, item])).values()].filter(Boolean);
  const jobs = [...new Map([...state.jobs, ...liveJobs].map((item) => [item.id || item.jobId, item])).values()].filter(Boolean);
  const visibleMissions = missions.slice(-20).reverse();
  const visibleJobs = jobs.slice(-20).reverse();
  if ($('missionList')) $('missionList').innerHTML = state.missions.length
    ? visibleMissions.map((m) => row(m.id || 'mission', m.objective || m.name || '', m.status || 'ACTIVE').replace('<tr>', `<tr data-mission-id="${esc(m.id || '')}" style="cursor:pointer" title="Carregar DAG persistido">`)).join('')
    : row('missoes', 'sem historico', 'EMPTY');

  document.querySelectorAll('#missionList [data-mission-id]').forEach((item) => {
    item.addEventListener('click', async () => {
      const graph = $('missionGraph');
      if (graph) graph.textContent = 'Carregando DAG persistido...';
      try {
        state.data.missionGraph = await api(`/missions/${encodeURIComponent(item.dataset.missionId)}/graph`);
        if (graph) graph.textContent = JSON.stringify({ source: state.data.missionGraph.source, nodes: state.data.missionGraph.nodes, edges: state.data.missionGraph.edges }, null, 2);
      } catch (error) { if (graph) graph.textContent = `Falha ao carregar DAG: ${error.message}`; }
      window.dispatchEvent(new CustomEvent('fenix-mission-selected', { detail: { missionId: item.dataset.missionId } }));
    });
  });
  
  if ($('jobList')) $('jobList').innerHTML = state.jobs.length
    ? visibleJobs.map((j) => `<div data-job-id="${esc(j.id || '')}" tabindex="0" style="padding:12px; border-bottom:1px solid var(--border); margin-bottom:8px; background:var(--bg-base); border-radius:6px; cursor:pointer">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <strong style="color:var(--text-main);">${esc(j.id || 'job')}</strong>
          <span class="badge ${j.status === 'COMPLETED' ? 'green' : (j.status==='FAILED'?'rose':'warn')}">${esc(j.status || 'RUNNING')}</span>
        </div>
        <div style="color:var(--text-muted); font-size:11px;">${esc(j.objective || j.name || 'Tarefa em andamento...')}</div>
      </div>`).join('')
    : '<div class="empty-state" style="padding: 24px 0;"><span class="empty-icon" style="font-size: 16px;">├ö├àÔûÆ</span>Sem Jobs ativos</div>';
  document.querySelectorAll('#jobList [data-job-id]').forEach((item) => item.addEventListener('click', () => window.dispatchEvent(new CustomEvent('fenix-job-selected', { detail: { jobId: item.dataset.jobId } }))));

  if ($('missionGraph')) {
    const graph = state.data.missionGraph;
    $('missionGraph').textContent = graph
      ? JSON.stringify({ source: graph.source, nodes: graph.nodes, edges: graph.edges }, null, 2)
      : 'Selecione uma missão para visualizar o grafo.';
  }

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
    ? skills.map((skill) => row(skill.name, `${skill.source} Ôö£├®Ôö¼├Ç ${skill.estimatedTokens} tokens Ôö£├®Ôö¼├Ç ${skill.triggers.join(', ') || 'always-on'}`, skill.alwaysOn ? 'GLOBAL' : 'TRIGGER')).join('')
    : row('skills', state.data.skills?.__error || 'nenhuma skill encontrada', 'EMPTY');
  const skillContext = $('skillContext');
  if (skillContext && !skillContext.innerHTML) {
    skillContext.innerHTML = row('context pack', 'digite um objetivo para selecionar skills', 'READY');
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
      ...(pack.selectedSkills || []).map((skill) => row(skill.name, `${skill.source} Ôö£├®Ôö¼├Ç score ${skill.score} Ôö£├®Ôö¼├Ç ${skill.contextTokens} tokens`, 'SELECTED')),
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
  const tools = state.data.tools?.tools || [];
  if ($('toolList')) $('toolList').innerHTML = tools.length
    ? tools.map((tool) => row(tool.toolId, `${tool.kind || 'native'} · ${tool.source || 'grg-native'} · ${tool.timeoutMs || 0}ms`, tool.status || 'UNKNOWN')).join('')
    : row('ferramentas', state.data.tools?.__error || 'nenhuma ferramenta governada registrada', 'EMPTY');
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
  saveChatTurn('user', value);

  // Fênix decide primeiro se é conversa ou execução. Perguntas não criam
  // missão; tarefas complexas recebem proposta e aguardam autorização.
  let classification = { category: 'CONVERSATION', requiresConfirmation: false };
  try {
    const classified = await api('/chat/intent', { method: 'POST', body: JSON.stringify({ message: value }) });
    classification = classified.classification || classification;
  } catch (_) { /* o chat continua disponível se o classificador estiver indisponível */ }
  const pendingRaw = localStorage.getItem('fenix_pending_mission');
  let pendingMission = pendingRaw;
  let pendingClassification = null;
  try {
    const pending = JSON.parse(pendingRaw || 'null');
    if (pending?.objective) { pendingMission = pending.objective; pendingClassification = pending.classification || null; }
  } catch (_) { /* compatibilidade com pendências salvas pela versão anterior */ }
  const confirmed = pendingMission && /^(sim|s[ií]m|pode iniciar|execute|come[cç]ar|comece|iniciar)$/i.test(value);
  if (confirmed && pendingClassification) classification = pendingClassification;
  if (classification.requiresConfirmation && !confirmed) {
    localStorage.setItem('fenix_pending_mission', JSON.stringify({ objective: value, classification }));
    const proposal = document.createElement('div');
    proposal.className = 'bubble system';
    proposal.textContent = `FÊNIX · ${classification.category} · Esta solicitação envolve múltiplas etapas. Posso criar uma missão com agentes, jobs e validação contínua. Deseja iniciar?`;
    const target = $('chatLog') || document.getElementById('masterCmdForm')?.parentElement;
    if (target) { target.appendChild(proposal); target.scrollTop = target.scrollHeight; }
    return;
  }
  const executionValue = confirmed ? pendingMission : value;
  if (confirmed) localStorage.removeItem('fenix_pending_mission');

  if (classification.category === 'SMALL_TASK' && window.executeSmallTask) {
    await window.executeSmallTask(executionValue);
    return;
  }

  // Confirmação de uma missão deve iniciar o Mission Runtime canônico.
  // O pipeline de desenvolvimento continua disponível como capacidade da
  // missão, mas não substitui o registro persistido de Mission + DAG + jobs.
  if (confirmed && classification.requiresConfirmation) {
    try {
      const mission = await api('/missions', { method: 'POST', body: JSON.stringify({
        title: `Missão FÊNIX · ${executionValue.slice(0, 64)}`,
        name: `Missão FÊNIX · ${executionValue.slice(0, 64)}`,
        objective: executionValue,
        autoApprove: true,
        steps: [
          { key: 'audit', type: 'audit', description: 'Analisar contexto e estado atual' },
          { key: 'inspect', type: 'inspect', description: 'Inspecionar o workspace autorizado', dependsOn: ['audit'] },
          { key: 'analyze', type: 'analyze', description: 'Construir análise e plano verificável', dependsOn: ['inspect'] },
          { key: 'browser-qa', type: 'browser-qa', description: 'Validar a experiência no navegador', dependsOn: ['analyze'] },
        ],
      }) });
      const missionId = mission.id || mission.missionId;
      if (!missionId) throw new Error('runtime não retornou missionId');
      const started = await api(`/missions/${encodeURIComponent(missionId)}/start`, { method: 'POST' });
      const reply = `Missão ${missionId} criada e iniciada. Status: ${started.status || 'QUEUED'}. O progresso será acompanhado pelos eventos e jobs.`;
      saveChatTurn('assistant', reply); bubble(reply, 'bot');
      await refreshAll();
    } catch (error) {
      const reply = `Não foi possível iniciar a missão: ${error.message}`;
      saveChatTurn('assistant', reply); bubble(reply, 'bot');
    }
    return;
  }

  const isLongTask = executionValue.length > 180 || /(crie uma aplicação|sistema completo|projeto|implemente|refatore|construa|pipeline|build|deploy|job|tarefa longa|horas|dias)/i.test(executionValue);
  const isDevPrompt = (confirmed || classification.category === 'SMALL_TASK' || classification.category === 'LONG_MISSION') && isLongTask && /(crie|adicione|melhore|corrija|analise|refatore|implemente|teste|construa|pipeline|task board|projeto|sistema)/i.test(executionValue);
  if (isDevPrompt && window.executeDevPipeline) {
    await window.executeDevPipeline(executionValue);
    return;
  }

  const pending = document.createElement('div');
  pending.className = 'bubble system';
  const startedAt = Date.now();
  if ($('barAi')) $('barAi').textContent = 'RUNNING';
  if ($('barWorker')) $('barWorker').textContent = 'PROCESSING';
  let attempt = 0;
  let timer = setInterval(() => {
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    pending.textContent = `Pensando… ${seconds}s · tentativa ${Math.max(1, attempt)} · conectando à API`;
  }, 100);
  const chatTarget = $('chatLog') || document.getElementById('masterCmdForm')?.parentElement;
  if (chatTarget) { chatTarget.appendChild(pending); chatTarget.scrollTop = chatTarget.scrollHeight; }
  try {
    const media = $('chatMedia')?.files?.[0];
    const mediaInfo = media ? `\n[Mídia anexada: ${media.name} (${media.type || 'arquivo'}, ${media.size} bytes)]` : '';
    const selectedModel = $('composerModel')?.value || '';
    const fastModel = 'qwen2.5:3b';
    const modelToUse = selectedModel || fastModel;
    const history = chatHistory().slice(-10, -1);
    let res;
    let lastError;
    for (attempt = 1; attempt <= 3; attempt += 1) {
      try {
        pending.textContent = `Pensando… · tentativa ${attempt}/3 · ${modelToUse} · ${isLongTask ? 'tarefa será planejada' : 'resposta rápida'}`;
        res = await streamChat(executionValue + mediaInfo, { model: modelToUse, onEvent: (event, data) => {
          if (event === 'ready') pending.textContent = `Conectado · ${data.provider || 'provider'} · ${data.model || modelToUse}`;
          if (event === 'context') pending.textContent = `Contexto carregado · ${data.turnsIncluded || 0} turnos · memória ${data.usedMemories || 0}`;
          if (event === 'token') pending.textContent = `Respondendo… ${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
        } });
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 3) {
          pending.textContent = 'Fallback API… mantendo contexto local';
          res = await api('/v2/ai-platform/chat', { method: 'POST', body: JSON.stringify({ message: executionValue + mediaInfo, model: modelToUse, history: chatHistory().slice(-12) }) });
          break;
        }
        pending.textContent = `Reconectando… falha na tentativa ${attempt}/3`; await new Promise(resolve => setTimeout(resolve, 700 * attempt));
      }
    }
    if (!res) throw lastError || new Error('API não retornou resposta');
    if ($('chatMedia')) $('chatMedia').value = '';
    if (res.jobId && window.openJobInspector) window.openJobInspector(res.jobId, value);
    if ($('barActiveJob')) $('barActiveJob').textContent = res.jobId || 'CHAT COMPLETED';
    if ($('barRuntime')) $('barRuntime').textContent = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
    if ($('barWorker')) $('barWorker').textContent = 'IDLE';
    if ($('barAi')) $('barAi').textContent = 'ONLINE';
    pending.remove();
    const reply = res.text || res.reply || res.response || 'Sem resposta textual.';
    saveChatTurn('assistant', reply);
    bubble(reply, 'bot');
    await refreshAll();
  } catch (error) {
    clearInterval(timer);
    pending.remove();
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    bubble(`Falha após ${elapsed}s · ${attempt || 1} tentativa(s)\n${error.message}\nVerifique API, provider e modelo selecionado.`, 'system');
    if ($('barActiveJob')) $('barActiveJob').textContent = 'ERROR';
    if ($('barWorker')) $('barWorker').textContent = 'IDLE';
    if ($('barAi')) $('barAi').textContent = 'ERROR';
    if ($('barRuntime')) $('barRuntime').textContent = `${elapsed}s`;
    return;
  }
  clearInterval(timer);
}

window.__fenixCanonicalRunChat = runChat;
window.runChat = runChat;

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
    const list = $('fsList');
    if (list) list.innerHTML = '<div class="empty-state"><i class="ph ph-spinner ph-spin"></i><span>Carregando pastas e arquivos...</span></div>';
    const data = await api(`/dev/fs?path=${encodeURIComponent(path)}`);
    const items = (data.items || []).sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || String(a.name).localeCompare(String(b.name)));
    if (list) list.innerHTML = `${path ? `<div class="fs-item dir" data-path="${esc(path.replace(/\\/g, '/').split('/').slice(0, -1).join('/'))}" data-type="dir"><i class="ph-fill ph-arrow-u-up-left"></i><span>..</span></div>` : ''}${items.map(item => `<div class="fs-item ${item.isDirectory ? 'dir' : 'file'}" data-path="${esc(item.path)}" data-type="${item.isDirectory ? 'dir' : 'file'}"><i class="ph ${item.isDirectory ? 'ph-folder' : 'ph-file-code'}"></i><span>${esc(item.name)}</span></div>`).join('') || row('fs', 'vazio', 'EMPTY')}`;
    document.querySelectorAll('#fsList .fs-item').forEach((el) => {
      el.addEventListener('click', () => {
        const filePath = el.dataset.path || '';
        if (el.dataset.type === 'file') openFile(filePath);
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

async function cloneProject(url, directory = '') {
  const result = await api('/dev/projects/clone', {
    method: 'POST',
    body: JSON.stringify({ url, directory: directory || undefined }),
  });
  await refreshAll();
  return result;
}

function init() {
  document.querySelectorAll('[data-nav], [data-view]').forEach((el) => el.addEventListener('click', () => showView(el.dataset.nav || el.dataset.view)));
  
  // Helpers for safe binding
  const addEvt = (id, event, handler) => { const el = $(id); if (el) el.addEventListener(event, handler); };

  addEvt('refreshBtn', 'click', () => refreshAll());
  addEvt('settingsBtn', 'click', () => refreshAll());
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
  loadChatModels();
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => runChat(button.dataset.prompt)));
  addEvt('projectSearch', 'input', renderProjects);
  addEvt('repoVisibility', 'change', renderProjects);
  addEvt('programForm', 'submit', (event) => { event.preventDefault(); if ($('programObjective')) createProgram($('programObjective').value); });
  addEvt('scanForm', 'submit', (event) => { event.preventDefault(); if ($('scanPath')) scanProject($('scanPath').value); });
  addEvt('gitCloneForm', 'submit', async (event) => {
    event.preventDefault();
    const url = $('gitRepoUrl')?.value.trim();
    const directory = $('gitRepoDir')?.value.trim();
    const output = $('gitCloneResult');
    if (!url) return;
    if (output) output.textContent = 'Clonando e registrando o projeto no runtime...';
    try {
      const result = await cloneProject(url, directory);
      if (output) output.textContent = JSON.stringify(result, null, 2);
      await refreshAll();
    } catch (error) {
      if (output) output.textContent = `Falha ao clonar: ${error.message}`;
    }
  });
  addEvt('skillForm', 'submit', (event) => { event.preventDefault(); if ($('skillObjective')) selectSkills($('skillObjective').value); });
  addEvt('sliceForm', 'submit', (event) => { event.preventDefault(); if ($('slicePrompt')) createFullstackSlice($('slicePrompt').value); });
  addEvt('tickBtn', 'click', async () => { await api('/runtime/tick', { method: 'POST' }); await refreshAll(); });
  addEvt('autonomousCycleBtn', 'click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true; button.textContent = 'Executando ciclo...';
    try {
      const report = await api('/autonomous/cycle', { method: 'POST', body: JSON.stringify({ autoStart: true, maxConcurrent: 2 }) });
      button.textContent = `Ciclo concluído · ${report.despachados || 0} jobs`;
      await refreshAll();
    } catch (error) {
      button.textContent = `Ciclo falhou · ${error.message}`;
    } finally { setTimeout(() => { button.disabled = false; button.textContent = 'Executar ciclo autônomo'; }, 3500); }
  });
  addEvt('rebuildCityBtn', 'click', async () => { await api('/city/rebuild', { method: 'POST' }); await refreshAll(); });
  addEvt('sampleBtn', 'click', async () => { await api('/observability/series/sample', { method: 'POST' }); await refreshAll(); });
  addEvt('checkApiBtn', 'click', async () => { await api('/connection/check', { method: 'POST', body: JSON.stringify({ provider: 'aiplatform' }) }); await refreshAll(); });
  addEvt('fsLoadBtn', 'click', () => { if ($('fsPath')) loadFs($('fsPath').value); });
  const fsList = $('fsList');
  if (fsList) {
    fsList.addEventListener('contextmenu', async (event) => {
      const item = event.target.closest('.fs-item');
      if (!item || item.textContent.trim() === '..') return;
      event.preventDefault();
      const oldPath = item.dataset.path || '';
      const action = window.prompt('Ação: renomear, mover, nova-pasta ou excluir', 'renomear');
      if (!action) return;
      try {
        if (action === 'renomear' || action === 'mover') {
          const next = window.prompt('Novo caminho relativo ao workspace', oldPath);
          if (!next || next === oldPath) return;
          await api('/dev/fs/move', { method: 'POST', body: JSON.stringify({ from: oldPath, to: next }) });
        } else if (action === 'nova-pasta') {
          const next = window.prompt('Caminho da nova pasta', `${oldPath}/nova-pasta`);
          if (!next) return;
          await api('/dev/fs/mkdir', { method: 'POST', body: JSON.stringify({ path: next }) });
        } else if (action === 'excluir') {
          if (!window.confirm(`Excluir permanentemente ${oldPath}?`)) return;
          await api('/dev/fs/delete', { method: 'POST', body: JSON.stringify({ path: oldPath }) });
        } else return;
        await loadFs($('fsPath')?.value || '');
      } catch (error) { window.alert(`Falha na operação: ${error.message}`); }
    });
  }
  async function pollTerminal(sessionId, command) {
    const output = $('terminalResult');
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const state = await api(`/dev/terminal/${encodeURIComponent(sessionId)}`);
        if (output) output.textContent = `$ ${command}\n${state.stdout || ''}${state.stderr || ''}${state.status === 'RUNNING' ? '\n\u2026 executando' : ''}`;
        if (state.status && state.status !== 'RUNNING' && state.status !== 'QUEUED') return state;
      } catch (error) {
        if (output) output.textContent = `Falha ao acompanhar terminal: ${error.message}`;
        return null;
      }
    }
    if (output) output.textContent += '\nAcompanhamento interrompido por timeout.';
    return null;
  }
  window.pollTerminal = pollTerminal;
  addEvt('terminalBtn', 'click', async () => {
    if (!$('terminalCmd')) return;
    const command = $('terminalCmd').value.trim();
    if (!command) return;
    const sessionId = `ui-${Date.now()}`;
    const out = await api('/dev/terminal', { method: 'POST', body: JSON.stringify({ command, sessionId }) });
    if ($('terminalResult')) $('terminalResult').textContent = `$ ${command}\nAceito pelo runtime (${out.status || 'QUEUED'})...`;
    pollTerminal(sessionId, command);
    $('terminalCmd').value = '';
  });
  
  addEvt('cmdBtn', 'click', openCommand);
  addEvt('closeCmdBtn', 'click', () => { if ($('cmdDialog')) $('cmdDialog').close(); });
  addEvt('cmdInput', 'input', renderCommandPalette);
  window.addEventListener('hashchange', () => showView(location.hash.slice(1) || 'command', false));
  window.addEventListener('hashchange', () => refreshAll());
  document.addEventListener('fenix-live', (event) => {
    const type = event.detail?.type || '';
    if (type === 'event' || type === 'snapshot' || type === 'status') {
      renderMissions();
      renderHeader();
    }
  });
  showView(location.hash.slice(1) || 'command', false);
  bubble('Workspace unico carregado. Eu consolidei comando, runtime, missoes, AI City, office, CRM, deploy, observabilidade e developer em uma tela.');
  refreshAll();
  // O stream SSE cobre mudanças operacionais; polling de 30s é apenas
  // reconciliação de dados, evitando tempestade de requests em telas/iframes.
  setInterval(async () => {
    if (document.hidden || String(location.hash.slice(1) || 'command').split('?')[0] !== 'operations') return;
    try {
      const response = await fetch('/api/v2/jarvis/jobs/queue', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) return;
      const queue = await response.json();
      const jobs = ['running', 'waiting', 'completed', 'failed', 'cancelled'].flatMap((key) => Array.isArray(queue[key]) ? queue[key] : []);
      state.jobs = [...new Map([...state.jobs, ...jobs].map((job) => [job.id, job])).values()];
      renderMissions();
    } catch {}
  }, 5000);
  setInterval(() => { if (!document.hidden && String(location.hash.slice(1) || 'command').split('?')[0] !== 'operations') refreshAll(); }, 30000);
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

    const deterministicUnit = (index, salt = 0) => ((index * 37 + salt * 17) % 101) / 100;
    const stars = Array.from({ length: 60 }, (_, i) => ({
      x: deterministicUnit(i, 1), y: deterministicUnit(i, 2),
      size: deterministicUnit(i, 3) * 1.5 + 0.5,
      twinkleSpeed: deterministicUnit(i, 4) * 0.03 + 0.01,
      phase: deterministicUnit(i, 5) * Math.PI * 2
    }));

    const traffic = Array.from({ length: 16 }, (_, i) => ({
      axis: i % 2 === 0 ? 'X' : 'Y',
      pos: (deterministicUnit(i, 6) - 0.5) * 800,
      lane: (i % 4 - 1.5) * 140,
      speed: (deterministicUnit(i, 7) * 1.2 + 0.8) * (i % 2 === 0 ? 1 : -1),
      color: i % 3 === 0 ? '#38bdf8' : (i % 3 === 1 ? '#f59e0b' : '#a78bfa'),
      tailLength: 25 + deterministicUnit(i, 8) * 20
    }));

    const agents = []; // REPLACED BY REAL AGENTS STATE

    const embers = Array.from({ length: 25 }, (_, i) => ({
      x: (deterministicUnit(i, 9) - 0.5) * 60,
      y: (deterministicUnit(i, 10) - 0.5) * 40,
      vy: deterministicUnit(i, 11) * 1.2 + 0.6,
      alpha: deterministicUnit(i, 12) * 0.8 + 0.2,
      size: deterministicUnit(i, 13) * 2.5 + 1.2
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
                 x: (deterministicUnit(i, 14) - 0.5) * 400,
                 y: (deterministicUnit(i, 15) - 0.5) * 300,
                 targetX: 0,
                 targetY: 0,
                 speed: 0.0008,
                 avatar: 'Ôö£ÔûæÔö╝┬®Ôö¼├▒├ö├ç├┤',
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
      this.textContent = state.cyberMode ? 'Ôö£ÔûæÔö╝┬®Ôö╝├å├ö├ñ├│ Modo Cyber' : 'Ôö£├│Ôòª┬ú├ö├®┬╝Ôö£┬╗Ôö¼┬®Ôö¼├à Modo Dia';
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
        // No random wandering in live mode. Destination changes must come
        // from a runtime event, not from the renderer.
        ag.targetX = ag.x;
        ag.targetY = ag.y;
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
          <h4>Ôö£ÔûæÔö╝┬®Ôö¼├àÔö¼├│ Painel do MÔö£├óÔö¼Ôöédulo: ${escapeHtml(key)}</h4>
          <p style="color:var(--text-secondary); font-size:12px; margin-top:4px;">
            MÔö£├óÔö¼Ôöédulo ativo e conectado ao runtime do FÔö£├óÔö¼┬¼nix OS.
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
      title: 'MissÔö£├óÔö¼├║o AutÔö£├óÔö¼Ôöñnoma JARVIS',
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

        completeJobExecution(data.realityScore);
        appendCityJarvisMessage('assistant', `
          <p><b>Ôö£├│Ôö╝├┤├ö├ç┬¬ MissÔö£├óÔö¼├║o Processada pelo FÔö£├óÔö╝├íNIX MIND!</b></p>
          <p style="font-size:11.5px; margin-top:4px;">IntenÔö£├óÔö¼┬║Ôö£├óÔö¼├║o: <b>${escapeHtml(data.intent)}</b> Ôö£├│├ö├®┬╝Ôö¼├│ Reality Score: <b>${data.realityScore}%</b></p>
          <div class="msg-action-box" style="margin-top:6px;">
            <span>Ôö£├│Ôö╝├¡Ôö¼├¡ Agentes: <b>${(data.requiredAgents || []).join(', ')}</b></span>
          </div>
        `);

        await fetchActiveProjectFiles();
        await refreshAllRealData();
      } else {
        throw new Error(data.error || 'Falha na execuÔö£├óÔö¼┬║Ôö£├óÔö¼├║o');
      }
    } catch (err) {
      appendJobLog('QA Agent', `Falha na execuÔö£├óÔö¼┬║Ôö£├óÔö¼├║o: ${err.message}`, 'var(--flame)');
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
        <span class="msg-avatar">${role === 'user' ? 'Ôö£ÔûæÔö╝┬®├ö├ç├┐Ôö¼├▒' : 'Ôö£ÔûæÔö╝┬®├ö├ç├ÿÔö¼├æ'}</span>
        <span class="msg-author">${role === 'user' ? 'VocÔö£├óÔö¼┬¼' : 'FÔö£├óÔö╝├íNIX JARVIS'}</span>
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
  document.getElementById('jobInspectorBody').innerHTML = '<div style="color:#888;">Aguardando eventos fÔö£├óÔö¼┬ísicos do AgentRuntime...</div>';
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('jobInspectorCloseBtn')?.addEventListener('click', () => {
    document.getElementById('jobInspectorModal').style.display = 'none';
  });
  if (window.initCityCanvas) window.initCityCanvas();
  
  // Realtime is provided by live-runtime.js through the authenticated
  // WebSocket `/events`. The old EventSource here could not send Bearer
  // headers and caused duplicate unauthenticated 401 requests.
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

(function () {
  function bindCommandCenter() {
    const form = document.getElementById('masterCmdForm');
    const input = document.getElementById('masterPrompt');
    if (!form || !input || form.dataset.fenixCommandBound || form.dataset.fenixBound) return;
    form.dataset.fenixCommandBound = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const objective = String(input.value || '').trim();
      if (!objective) return;
      // O Command Center compartilha o fluxo de intenção do chat. A missão
      // só será criada depois da confirmação explícita quando necessário.
      await runChat(objective);
      input.value = '';
      return;
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        const token = localStorage.getItem('grg_token');
        // Legacy branch is unreachable; keep it incapable of creating a mission
        // if an older event binding ever invokes it.
        const response = await fetch('/api/fenix/legacy-disabled', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ title: objective, objective, source: 'fenix-command-center' }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        input.value = '';
        const status = document.createElement('div');
        status.className = 'chat-bubble bubble-sys';
        const missionId = result.missionId || result.id || result.mission?.missionId || result.mission?.id || 'unknown';
        status.textContent = `MISSION ACCEPTED · ${missionId}`;
        form.parentElement.appendChild(status);
        // Keep the chat status aligned with the persisted mission instead of
        // leaving a permanent QUEUED label after the worker has finished.
        if (missionId !== 'unknown') {
          (async () => {
            for (let attempt = 0; attempt < 90; attempt += 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              try {
                const missionState = await api(`/api/fenix/missions/${encodeURIComponent(missionId)}`);
                const currentStatus = String(missionState?.mission?.status || missionState?.status || '').toUpperCase();
                const progress = missionState?.mission?.progress ?? missionState?.progress;
                if (currentStatus) status.textContent = `MISSION ${currentStatus} · ${missionId}${progress != null ? ` · ${progress}%` : ''}`;
                if (['SUCCEEDED', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED'].includes(currentStatus)) break;
              } catch (_) { /* refresh loop will show the canonical state */ }
            }
          })();
        }
        saveChatTurn('user', objective);
        const thinking = document.createElement('div');
        thinking.className = 'chat-bubble bubble-sys';
        thinking.dataset.fenixChatStatus = 'true';
        thinking.textContent = 'FÊNIX · ANALYZING · aguardando resposta do modelo';
        form.parentElement.appendChild(thinking);
        try {
          let reply = await Promise.race([
            streamChat(objective, { model: null }),
            new Promise((resolve) => setTimeout(() => resolve({ text: '' }), 30000)),
          ]);
          if (!reply?.text) {
            const fallback = await Promise.race([
              api('/chat', { method: 'POST', body: JSON.stringify({ message: objective }) }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('resposta do modelo excedeu 30s')), 30000)),
            ]);
            reply = { ...fallback, text: fallback.text || fallback.response || fallback.message || '' };
          }
          if (reply?.text) {
            thinking.remove();
            saveChatTurn('assistant', reply.text);
            const responseBubble = document.createElement('div');
            responseBubble.className = 'chat-bubble bubble-bot';
            responseBubble.textContent = reply.text;
            form.parentElement.appendChild(responseBubble);
          }
          else {
            thinking.textContent = 'FÊNIX · ERRO · o modelo não retornou texto';
            thinking.className = 'chat-bubble bubble-sys';
          }
        } catch (chatError) {
          thinking.remove();
          const chatStatus = document.createElement('div');
          chatStatus.className = 'chat-bubble bubble-sys';
          chatStatus.textContent = `CHAT ERROR · ${chatError.message}`;
          form.parentElement.appendChild(chatStatus);
        }
        // A criação já foi aceita pelo backend; republique o estado canônico
        // para que missão, jobs e eventos mudem na mesma tela sem reload.
        await refreshAll();
        if (window.__FENIX_OPERATIONAL_STATE__) {
          window.__FENIX_OPERATIONAL_STATE__.api = state.data;
        }
        window.dispatchEvent(new CustomEvent('fenix:data', { detail: { source: 'mission-created', missionId: result.missionId || result.id } }));
        window.renderCommandCenterPanels?.();
      } catch (error) {
        const status = document.createElement('div');
        status.className = 'chat-bubble bubble-sys';
        status.textContent = `MISSION ERROR · ${error.message}`;
        form.parentElement.appendChild(status);
      } finally {
        if (button) button.disabled = false;
      }
    });
  }
  function bindNavigation() {
    document.querySelectorAll('.nav-group-label').forEach((label) => {
      if (label.dataset.fenixGroupBound) return;
      label.dataset.fenixGroupBound = 'true';
      label.addEventListener('click', () => {
        const group = label.closest('.nav-group');
        const collapsed = group.classList.toggle('is-collapsed');
        label.setAttribute('aria-expanded', String(!collapsed));
        const marker = label.querySelector('span');
        if (marker) marker.textContent = collapsed ? '+' : '−';
      });
    });
    document.querySelectorAll('.nav-item[data-view]').forEach((button) => {
      if (button.dataset.fenixNavigationBound) return;
      button.dataset.fenixNavigationBound = 'true';
      button.addEventListener('click', () => {
        const view = button.dataset.view;
        document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.classList.toggle('active', item === button));
        document.querySelectorAll('.view').forEach((panel) => { panel.style.display = panel.id === `view-${view}` ? 'flex' : 'none'; });
        window.history.replaceState({}, '', `${window.location.pathname}#${view}`);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindCommandCenter);
  else bindCommandCenter();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindNavigation);
  else bindNavigation();
  window.addEventListener('FENIX_READY', bindCommandCenter);
  window.addEventListener('FENIX_READY', bindNavigation);
})();

// Canonical IDE actions: these controls are backed by the protected developer
// routes and never pretend that a proposal, move or pipeline already succeeded.
(function bindDeveloperWorkspace() {
  const $ = (id) => document.getElementById(id);
  const set = (id, value) => { const el = $(id); if (el) el.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); };
  function renderLivePreview() {
    const frame = $('livePreviewFrame'); const input = $('livePreviewText');
    if (!frame || !input) return;
    const value = String(input.value || '').trim();
    if (!value) return set('livePreviewText', '/app');
    frame.src = value.startsWith('http') || value.startsWith('/') ? value : `/${value}`;
  }
  async function transformOpenFile() {
    const path = String($('currentFilePath')?.value || '').trim();
    const instruction = String($('aiEditInstruction')?.value || '').trim();
    if (!path || !instruction) return set('aiEditResult', 'Informe o arquivo aberto e a instrução.');
    set('aiEditResult', 'Gerando proposta real…');
    try { const result = await api('/api/dev/ai/transform-file', { method: 'POST', body: JSON.stringify({ path, instruction }) }); if ($('fileViewer')) $('fileViewer').value = result.content || ''; set('aiEditResult', result); }
    catch (error) { set('aiEditResult', `Falha: ${error.message}`); }
  }
  async function movePath() {
    const from = String($('moveFromPath')?.value || '').trim(); const to = String($('moveToPath')?.value || '').trim();
    if (!from || !to) return set('moveResult', 'Informe origem e destino.');
    set('moveResult', 'Movendo no workspace…');
    try { set('moveResult', await api('/api/dev/fs/move', { method: 'POST', body: JSON.stringify({ from, to }) })); }
    catch (error) { set('moveResult', `Falha: ${error.message}`); }
  }
  async function delegateDevAgents() {
    const objective = String($('devAgentObjective')?.value || '').trim();
    if (!objective) return set('devAgentResult', 'Informe um objetivo.');
    set('devAgentResult', 'Criando missão e delegando aos agentes…');
    try { set('devAgentResult', await api('/api/dev/pipeline', { method: 'POST', body: JSON.stringify({ prompt: objective }) })); await refreshAll(); }
    catch (error) { set('devAgentResult', `Falha: ${error.message}`); }
  }
  async function saveFile() {
    const path = String($('currentFilePath')?.value || '').trim(); if (!path) return set('fileSaveResult', 'Nenhum arquivo aberto.');
    set('fileSaveResult', 'Salvando…');
    try { set('fileSaveResult', await api(`/api/dev/fs/file?path=${encodeURIComponent(path)}`, { method: 'POST', body: JSON.stringify({ content: $('fileViewer')?.value || '' }) })); }
    catch (error) { set('fileSaveResult', `Falha: ${error.message}`); }
  }
  function bind() {
    $('previewRefreshBtn')?.addEventListener('click', renderLivePreview);
    $('aiEditBtn')?.addEventListener('click', transformOpenFile);
    $('movePathBtn')?.addEventListener('click', movePath);
    $('devAgentBtn')?.addEventListener('click', delegateDevAgents);
    $('fileSaveBtn')?.addEventListener('click', saveFile);
    window.renderLivePreview = renderLivePreview; window.transformOpenFile = transformOpenFile; window.movePath = movePath; window.delegateDevAgents = delegateDevAgents; window.saveFile = saveFile;
    renderLivePreview();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true }); else bind();
})();

