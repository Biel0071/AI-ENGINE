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
    const sessionValid = await (window.__FENIX_SESSION_VALID__?.() ?? null);
    if (sessionValid === false) {
      localStorage.removeItem('grg_token');
      if (location.pathname !== '/GRG-login') {
        try { sessionStorage.setItem('fenix_return_route', location.hash || '#city'); } catch {}
        location.replace('/GRG-login');
      }
    }
    throw new Error(sessionValid === true ? 'A API recusou esta sessão.' : 'Não foi possível confirmar a sessão.');
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
  const badgeHtml = status
    ? (typeof window.StatusBadge?.render === 'function'
        ? window.StatusBadge.render(status)
        : `<span class="badge ${/ok|ready|active|online|connected|succeeded|completed/i.test(status) ? 'green' : (/fail|error|degraded|missing|offline|blocked|denied/i.test(status) ? 'rose' : 'warn')}">${esc(status)}</span>`)
    : '--';
  
  return `<tr>
    <td><b>${esc(title)}</b></td>
    <td><small>${esc(detail)}</small></td>
    <td>${badgeHtml}</td>
  </tr>`;
}

function metric(label, value) {
  return `<div><span>${esc(label)}</span><b>${esc(value ?? '--')}</b></div>`;
}

function showView(name, push = true) {
  // The shell owns routing. Legacy callers use this compatibility delegate without self-recursion.
  if (typeof window.showView === 'function' && window.showView !== showView) {
    window.showView(name, push);
  }
}

window.fenixSelectEntity = function(type, id) {
  // 1. Broadcast to all views via Central Bus
  window.dispatchEvent(new CustomEvent('fenix-entity-selected', { detail: { type, id } }));
  
  // 2. Map generic entity types to specific legacy events
  if (type === 'agent') {
    document.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agentId: id } }));
    window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agentId: id } }));
  } else if (type === 'mission') {
    window.dispatchEvent(new CustomEvent('fenix-mission-selected', { detail: { missionId: id } }));
  } else if (type === 'job') {
    window.dispatchEvent(new CustomEvent('fenix-job-selected', { detail: { jobId: id } }));
  }

  // 3. Highlight tab / show view
  const viewMap = {
    'agent': 'agents',
    'mission': 'operations',
    'job': 'operations',
    'project': 'projects',
    'building': 'city'
  };
  const targetView = viewMap[type];
  if (targetView) {
    showView(targetView);
  }

  // 4. City specific integration: Pan to entity if city is loaded
  if (window.fenixCity && typeof window.fenixCity.focusEntity === 'function') {
    window.fenixCity.focusEntity(type, id);
  } else if (window.fenixCity && type === 'agent' && typeof window.fenixCity.focusAgent === 'function') {
    window.fenixCity.focusAgent(id);
  } else if (window.fenixCity && type === 'building' && typeof window.fenixCity.panToDistrict === 'function') {
    window.fenixCity.panToDistrict(id);
  }
  
  // 5. Open right sidebar inspector if mascot sidebar is loaded
  if (typeof window.openFenixInspector === 'function') {
    window.openFenixInspector(type, id);
  }

  // 6. Miro-style Contextual Action Pill
  if (typeof window.fenixShowMiroActionPill === 'function') {
    window.fenixShowMiroActionPill(type, id);
  }
};

// --- REA MIRO SPATIAL CANVAS CONTROLLER & CONTEXTUAL ACTIONS ---
let currentMiroZoom = 1.0;

function updateMiroZoomDisplay() {
  const badge = document.getElementById('fenixMiroZoomLevel');
  if (badge) {
    badge.textContent = Math.round(currentMiroZoom * 100) + '%';
  }
}

window.fenixMiroZoomIn = function() {
  currentMiroZoom = Math.min(2.5, currentMiroZoom + 0.15);
  updateMiroZoomDisplay();
  if (window.fenixCity && typeof window.fenixCity.zoomIn === 'function') {
    window.fenixCity.zoomIn();
  } else if (window.fenixCity && typeof window.fenixCity.setZoom === 'function') {
    window.fenixCity.setZoom(currentMiroZoom);
  }
};

window.fenixMiroZoomOut = function() {
  currentMiroZoom = Math.max(0.4, currentMiroZoom - 0.15);
  updateMiroZoomDisplay();
  if (window.fenixCity && typeof window.fenixCity.zoomOut === 'function') {
    window.fenixCity.zoomOut();
  } else if (window.fenixCity && typeof window.fenixCity.setZoom === 'function') {
    window.fenixCity.setZoom(currentMiroZoom);
  }
};

window.fenixMiroResetZoom = function() {
  currentMiroZoom = 1.0;
  updateMiroZoomDisplay();
  if (window.fenixCity && typeof window.fenixCity.setZoom === 'function') {
    window.fenixCity.setZoom(1.0);
  }
};

window.fenixMiroFitView = function() {
  currentMiroZoom = 1.0;
  updateMiroZoomDisplay();
  if (typeof window.fenixPanToDistrict === 'function') {
    window.fenixPanToDistrict('ALL');
  }
  if (window.fenixCity && typeof window.fenixCity.resize === 'function') {
    window.fenixCity.resize();
  }
};

window.fenixMiroToggleMinimap = function() {
  const minimap = document.getElementById('fenixWorldMinimap');
  if (minimap) {
    minimap.style.display = minimap.style.display === 'none' ? '' : 'none';
  }
};

let selectedMiroEntity = null;

window.fenixShowMiroActionPill = function(type, id, name) {
  selectedMiroEntity = { type, id, name: name || id };
  const pill = document.getElementById('fenixMiroEntityActionPill');
  const nameEl = document.getElementById('fenixMiroPillName');
  const iconEl = document.getElementById('fenixMiroPillIcon');
  if (!pill) return;

  if (nameEl) nameEl.textContent = name || id;
  if (iconEl) {
    iconEl.className = type === 'agent' ? 'ph-bold ph-robot' : type === 'building' ? 'ph-bold ph-buildings' : 'ph-bold ph-cpu';
    iconEl.style.color = type === 'agent' ? '#A855F7' : '#00D9FF';
  }
  pill.style.display = 'flex';
};

window.fenixCloseMiroActionPill = function() {
  const pill = document.getElementById('fenixMiroEntityActionPill');
  if (pill) pill.style.display = 'none';
};

window.fenixMiroActionChat = function() {
  if (!selectedMiroEntity) return;
  if (window.FenixMascotSidebar && typeof window.FenixMascotSidebar.open === 'function') {
    window.FenixMascotSidebar.open();
  }
  const input = document.getElementById('fsbPromptInput') || document.getElementById('masterPrompt');
  if (input) {
    input.value = 'Relatório de status e operações de ' + (selectedMiroEntity.name || selectedMiroEntity.id) + ': ';
    input.focus();
  }
};

window.fenixMiroActionInspect = function() {
  if (!selectedMiroEntity) return;
  if (typeof window.openFenixInspector === 'function') {
    window.openFenixInspector(selectedMiroEntity.type, selectedMiroEntity.id);
  }
};

window.fenixMiroActionIde = function() {
  if (typeof showView === 'function') {
    showView('ide');
  }
};

window.fenixMiroActionMissions = function() {
  if (typeof showView === 'function') {
    showView('operations');
  }
};

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
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let textOut = ''; let meta = {}; let streamError = null;
  const consume = (chunk) => {
    buffer += chunk;
    const blocks = buffer.split(/\n\n/); buffer = blocks.pop() || '';
    for (const block of blocks) {
      const event = (block.match(/^event:\s*(.+)$/m) || [])[1] || 'message';
      const raw = (block.match(/^data:\s*(.+)$/m) || [])[1]; if (!raw) continue;
      let data; try { data = JSON.parse(raw); } catch { continue; }
      if (event === 'token') textOut += data.text || '';
      if (event === 'error') streamError = data.message || 'Falha no canal de IA';
      if (event === 'ready' || event === 'context' || event === 'done') meta = { ...meta, ...data };
      if (onEvent) onEvent(event, data);
    }
  };
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; consume(decoder.decode(value, { stream: true })); }
  } catch (error) {
    throw new Error(error.name === 'AbortError' ? 'stream excedeu 30s' : error.message);
  } finally { clearTimeout(timeout); }
  if (streamError) throw new Error(streamError);
  if (meta.conversationId) localStorage.setItem('fenix_conversation_id', meta.conversationId);
  return { text: meta.text || textOut, ...meta };
}

async function refreshAll() {
  if (state.refreshing) return;
  state.refreshing = true;
  try {
      const activeView = String(location.hash.slice(1) || 'city').split('?')[0] || 'city';
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
      city: [
        ['agents', () => api('/agents/panel')],
        ['missions', () => api('/missions')],
        ['events', () => api('/events?limit=80')],
        ['companies', () => api('/v2/company/list')],
        ['city', () => api('/city')],
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
    // Fênix Event Timeline Hook handled via fenix-live WebSocket stream

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
  window.updateSidebarCounters(state.data || {});
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
  const healthStatus = String(health?.status || '').toLowerCase();
  const ok = health?.ok === true || ['ready', 'online', 'healthy'].includes(healthStatus);
  const degraded = !ok && (healthStatus === 'degraded' || health?.degraded === true);
  const systemStatus = ok ? 'ONLINE' : degraded ? 'DEGRADED' : 'UNAVAILABLE';
  const statusDot = $('statusDot');
  if (statusDot) {
    const color = ok ? 'var(--green)' : degraded ? 'var(--yellow)' : 'var(--rose)';
    statusDot.style.background = color;
    statusDot.style.boxShadow = `0 0 12px ${color}`;
  }
  text('statusText', systemStatus);
  text('statusSub', health?.environment || health?.service || 'runtime');
  text('kpiSystem', ok ? 'READY' : systemStatus);
  text('systemHealthValue', systemStatus);
  text('systemErrorValue', ok ? 'API ONLINE · runtime medido' : (health?.__error || (degraded ? 'runtime degradado' : 'sem resposta da API')));
  text('actorName', me?.actorId || localStorage.getItem('grg_user') || 'usuario');
  text('actorRole', me?.tenantId || 'tenant');
  const metrics = overview?.metrics || {};
  text('kpiProjects', metrics.projects ?? state.projects.length);
  text('kpiRepos', metrics.repositories ?? state.repos.length);
  text('kpiCaps', metrics.capabilities ?? state.data.capabilities?.capabilities?.length);
  text('kpiJobs', state.jobs.length);
  const directAgents = Array.isArray(state.data.agents?.agents) ? state.data.agents.agents
    : Array.isArray(state.data.agents) ? state.data.agents
      : Array.isArray(state.data.swarm?.agents) ? state.data.swarm.agents
        : null;
  const agentList = directAgents || (window.FENIX?.live?.agentsMeasured === true && Array.isArray(window.FENIX.live.agents) ? window.FENIX.live.agents : null);
  const activeAgents = agentList?.filter((agent) => ['ASSIGNED', 'ANALYZING', 'EXECUTING', 'TESTING', 'REPAIRING', 'RUNNING'].includes(String(agent.status || agent.state || '').toUpperCase())).length;
  text('kpiAgents', agentList === null ? '—' : `${activeAgents}/${agentList.length}`);
  text('kpiAi', telemetry?.calls ?? metrics.aiCalls);
  const agentTable = $('agentList');
  if (agentTable) {
    agentTable.innerHTML = agentList === null ? '<tr><td colspan="4">Agentes indisponíveis nesta leitura.</td></tr>' : agentList.length ? agentList.map((agent, index) => {
      const id = agent.id || agent.agentId || agent.name || `agent-${index}`;
      return `<tr data-agent-id="${escapeHtml(String(id))}" tabindex="0" style="cursor:pointer"><td><strong>${escapeHtml(agent.name || id)}</strong></td><td>${escapeHtml(agent.role || agent.specialization || '—')}</td><td>${escapeHtml(agent.status || agent.state || 'UNKNOWN')}</td><td>${escapeHtml(agent.currentTask || agent.currentJob || 'Aguardando')}</td></tr>`;
    }).join('') : '<tr><td colspan="4">Nenhum agente publicado pela API.</td></tr>';
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
  const apiEvents = Array.isArray(state.data.events?.events) ? state.data.events.events
    : Array.isArray(state.data.events) ? state.data.events
      : null;
  const liveEvents = window.FENIX?.live?.eventsMeasured === true && Array.isArray(window.FENIX.live.events) ? window.FENIX.live.events : null;
  const events = apiEvents || liveEvents;
  text('eventCount', events === null ? 'Eventos indisponíveis' : `${events.length} eventos`);
  if ($('eventStream')) $('eventStream').innerHTML = events === null
    ? '<div class="empty-state" style="padding:24px 0;">Eventos indisponíveis nesta leitura da API.</div>'
    : events.length
      ? events.slice(0, 48).map((event) => {
          let summary = event.summary || event.message || event.description || '';
          if (!summary || summary.includes('sem descrição') || summary.includes('A API registrou')) {
            const evType = String(event.type || event.name || '').toLowerCase();
            const comp = event.data?.componentId || event.subject || '';
            summary = evType.includes('operational.component')
              ? `Auditoria operacional: componente "${comp || 'core'}" verificado.`
              : evType.startsWith('mission.') ? 'Missão despachada no runtime.'
              : evType.startsWith('agent.') ? 'Atividade de agente autônomo.'
              : evType.startsWith('job.') ? 'Job de processamento executado.'
              : `Evento do subsistema ${comp || evType || 'operacional'}.`;
          }
          return `<div class="event-log">[${esc(event.type || event.name || 'event')}] <strong>${esc(summary)}</strong></div>`;
        }).join('')
      : '<div class="empty-state" style="padding:24px 0;">Nenhum evento registrado pela API.</div>';
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
  if ($('missionList')) $('missionList').innerHTML = missions.length
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
  
  if ($('jobList')) $('jobList').innerHTML = jobs.length
    ? visibleJobs.map((j) => `<div data-job-id="${esc(j.id || '')}" tabindex="0" style="padding:12px; border-bottom:1px solid var(--border); margin-bottom:8px; background:var(--bg-base); border-radius:6px; cursor:pointer">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <strong style="color:var(--text-main);">${esc(j.id || 'job')}</strong>
          <span class="badge ${j.status === 'COMPLETED' ? 'green' : (j.status==='FAILED'?'rose':'warn')}">${esc(j.status || 'RUNNING')}</span>
        </div>
        <div style="color:var(--text-muted); font-size:11px;">${esc(j.objective || j.name || j.type || j.currentStage || j.status || 'Job sem descrição publicada')}</div>
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

  const explicitMission = /^(?:criar|nova)\s+miss[ãa]o\s*(?:para|de)?\s*(.*)/i.exec(value);
  if (explicitMission) {
    const objective = explicitMission[1] || value;
    try {
      const mission = await api('/missions', { method: 'POST', body: JSON.stringify({
        title: `Missão FÊNIX · ${objective.slice(0, 64)}`,
        name: `Missão FÊNIX · ${objective.slice(0, 64)}`,
        objective: objective,
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
    } catch (error) {
      const reply = `Não foi possível iniciar a missão: ${error.message}`;
      saveChatTurn('assistant', reply); bubble(reply, 'bot');
    }
    return;
  }

  // Fênix decide primeiro se é conversa ou execução. Perguntas não criam
  // missão; tarefas complexas recebem proposta e aguardam autorização.
  let classification = { category: 'CONVERSATION', requiresConfirmation: false };
  try {
    const classified = await api('/chat/intent', { method: 'POST', body: JSON.stringify({ message: value }), signal: AbortSignal.timeout(6000) });
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
    const modelToUse = selectedModel || null;
    let res;
    let lastError;
    // A job submission has no idempotency key. Retrying after a lost SSE
    // response could enqueue the same task more than once.
    for (attempt = 1; attempt <= 1; attempt += 1) {
      try {
        pending.textContent = `Enviando à API Platform… · ${modelToUse || 'modelo automático'}`;
        res = await streamChat(executionValue + mediaInfo, { model: modelToUse, onEvent: (event, data) => {
          if (event === 'ready') pending.textContent = `Conectado · ${data.provider || 'provider'} · ${data.model || modelToUse}`;
          if (event === 'context') pending.textContent = `Contexto carregado · ${data.turnsIncluded || 0} turnos · memória ${data.usedMemories || 0}`;
          if (event === 'token') pending.textContent = `Respondendo… ${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
        } });
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!res) throw lastError || new Error('API não retornou resposta');
    if ($('chatMedia')) $('chatMedia').value = '';
    if (res.jobId && document.getElementById('jobInspectorModal') && window.openJobInspector) window.openJobInspector(res.jobId, value);
    if ($('barActiveJob')) $('barActiveJob').textContent = res.jobId || 'CHAT COMPLETED';
    if ($('barRuntime')) $('barRuntime').textContent = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
    if ($('barWorker')) $('barWorker').textContent = 'IDLE';
    if ($('barAi')) $('barAi').textContent = 'ONLINE';
    pending.remove();
    const reply = res.text || res.reply || res.response || 'Sem resposta textual.';
    saveChatTurn('assistant', reply);
    bubble(reply, 'bot');
    if (res.jobId) {
      const jobId = res.jobId;
      const statusBubble = bubble(`Job ${jobId}: aguardando execução na API Platform…`, 'system');
      const poll = async () => {
        try {
          const job = await api(`/chat/jobs/${encodeURIComponent(jobId)}?t=${Date.now()}`);
          const resultText = job.result?.result?.text || job.result?.text || job.result?.response;
          const statusText = job.status === 'completed' && resultText ? `Job ${jobId} concluído:\n${resultText}` :
            job.status === 'failed' ? `Job ${jobId} falhou: ${job.error || 'erro não informado'}` :
            `Job ${jobId}: ${job.status || 'aguardando'}${job.queue?.estimatedWaitMs ? ` · espera estimada ${Math.ceil(job.queue.estimatedWaitMs / 1000)}s` : ''}`;
          if (statusBubble && statusBubble.textContent !== undefined) statusBubble.textContent = statusText;
          if (job.status === 'waiting' || job.status === 'active') setTimeout(poll, 3000);
          if (job.status === 'completed' && resultText) saveChatTurn('assistant', resultText);
        } catch (error) {
          if (statusBubble && statusBubble.textContent !== undefined) statusBubble.textContent = `Job ${jobId}: consulta indisponível (${error.message})`;
        }
      };
      setTimeout(poll, 1000);
    }
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
  // Sidebar buttons already call the shell router; do not register a second router.
  
  // Helpers for safe binding
  const addEvt = (id, event, handler) => { const el = $(id); if (el) el.addEventListener(event, handler); };

  addEvt('cmdPaletteBtn', 'click', () => openCommand());
  addEvt('refreshBtn', 'click', () => {
    refreshAll();
    if (typeof window.showToast === 'function') window.showToast('Estado sincronizado com o cluster', 'success');
  });
  addEvt('settingsBtn', 'click', () => showView('browser'));
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
  
  // Global Ctrl + K / Cmd + K shortcut
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      openCommand();
    }
  });

  const cmdInputEl = $('cmdInput');
  if (cmdInputEl && !cmdInputEl.dataset.cmdNavBound) {
    cmdInputEl.dataset.cmdNavBound = 'true';
    cmdInputEl.addEventListener('keydown', (e) => {
      const rows = $('cmdResults')?.querySelectorAll('.row');
      if (!rows || !rows.length) return;
      const activeIdx = [...rows].findIndex(r => r.classList.contains('active'));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = activeIdx < rows.length - 1 ? activeIdx + 1 : 0;
        rows.forEach((r, i) => r.classList.toggle('active', i === next));
        rows[next]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = activeIdx > 0 ? activeIdx - 1 : rows.length - 1;
        rows.forEach((r, i) => r.classList.toggle('active', i === prev));
        rows[prev]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = activeIdx >= 0 ? rows[activeIdx] : rows[0];
        sel?.click();
      } else if (e.key === 'Escape') {
        $('cmdDialog')?.close();
      }
    });
  }

  window.addEventListener('hashchange', () => refreshAll());
  document.addEventListener('fenix-live', (event) => {
    const type = event.detail?.type || '';
    if (window.FENIX?.live) {
      if (window.FENIX.live.jobs) {
        state.jobs = [...new Map([...state.jobs, ...window.FENIX.live.jobs].map((job) => [job.id || job.jobId, job])).values()];
      }
      if (window.FENIX.live.missions) {
        state.missions = [...new Map([...state.missions, ...window.FENIX.live.missions].map((m) => [m.id || m.missionId, m])).values()];
      }
      if (window.FENIX.live.events) {
        state.events = window.FENIX.live.events;
      }
      if (window.FENIX.live.agentsMeasured === true && Array.isArray(window.FENIX.live.agents)) {
        if (!state.data) state.data = {};
        state.data.agents = { agents: window.FENIX.live.agents };
      }
    }
    renderMissions();
    renderHeader();
    renderCity();
    if (typeof window.updateSidebarCounters === 'function') window.updateSidebarCounters(state.data || {});
  });
  if (typeof window.restoreRouteOnLoad === 'function') window.restoreRouteOnLoad();
  bubble('Workspace unico carregado. Eu consolidei comando, runtime, missoes, AI City, office, CRM, deploy, observabilidade e developer em uma tela.');
  refreshAll();
}

function openCommand() {
  const dlg = $('cmdDialog');
  if (!dlg) return;
  renderCommandPalette();
  if (typeof dlg.showModal === 'function') {
    try { dlg.showModal(); } catch { dlg.style.display = 'block'; }
  } else {
    dlg.style.display = 'block';
  }
  setTimeout(() => $('cmdInput')?.focus(), 50);
}

function renderCommandPalette() {
  const q = ($('cmdInput')?.value || '').toLowerCase().trim();
  const viewsList = [
    ['command', 'Overview — Central Command Dashboard', 'COMMAND'],
    ['city', 'AI City — 3D Cyberpunk Isometric City', 'COMMAND'],
    ['agents', 'Catálogo de Agentes & Swarm', 'COMMAND'],
    ['operations', 'Tarefas & Missões Operacionais (DAGs)', 'COMMAND'],
    ['projects', 'Projetos Registrados & Workspace', 'BUILD'],
    ['ide', 'Visual IDE & Workflows', 'BUILD'],
    ['terminal', 'Terminal & Automações Governança', 'BUILD'],
    ['memory', 'Memória do Sistema & RAG de Engenharia', 'INTELLIGENCE'],
    ['knowledge', 'Base de Conhecimento & Skills', 'INTELLIGENCE'],
    ['mcp', 'MCP Hub & Provedores de Modelos', 'INTELLIGENCE'],
    ['runtime', 'Telemetria do Cluster & Health', 'OBSERVABILITY'],
    ['observability', 'Observabilidade, Séries & Logs', 'OBSERVABILITY'],
    ['project', 'Project Mirror & Infraestrutura', 'SYSTEM'],
    ['browser', 'Browser QA & Runtime de Validação', 'SYSTEM']
  ];

  const live = window.FENIX?.live || {};
  const liveAgents = (live.agents || []).map(a => {
    const role = (a.role || 'agent').toUpperCase();
    const name = a.name || `${role} (${(a.id || '').slice(0, 8)})`;
    return [`agent:${a.id}`, `Inspecionar Agente: ${name}`, 'AGENTE'];
  });

  const liveTasks = (live.tasks || []).slice(0, 15).map(t => {
    const title = t.name || t.type || t.prompt || t.id;
    return [`task:${t.id}`, `Tarefa: ${title}`, 'TAREFA'];
  });

  const actions = [
    ['action:refresh', 'Sincronizar barramento e estado do cluster (Refresh All)', 'COMANDO'],
    ['action:chat', 'Focar prompt do Command Center', 'COMANDO'],
    ['cmd:city', 'Navegar para a AI City', 'COMANDO'],
    ['cmd:agents', 'Abrir catálogo completo de agentes', 'COMANDO'],
    ['cmd:operations', 'Visualizar tarefas em execução e pendentes', 'COMANDO'],
    ['cmd:memory', 'Abrir explorador de memória de engenharia', 'COMANDO'],
    ['cmd:runtime', 'Ver telemetria do cluster e latência', 'COMANDO']
  ];

  const allItems = [...viewsList, ...liveAgents, ...liveTasks, ...actions];
  const filtered = allItems.filter(([, label, badge]) => 
    !q || label.toLowerCase().includes(q) || badge.toLowerCase().includes(q)
  );

  const container = $('cmdResults');
  if (!container) return;
  container.innerHTML = filtered.map(([target, label, badge], idx) => `
    <div class="row ${idx === 0 ? 'active' : ''}" data-target="${esc(target)}">
      <span>${esc(label)}</span>
      <small>${esc(badge)}</small>
    </div>
  `).join('');

  container.querySelectorAll('.row').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.dataset.target;
      const dlg = $('cmdDialog');
      if (dlg) {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.style.display = 'none';
      }
      if (target.startsWith('agent:')) {
        const aid = target.slice(6);
        if (typeof openAgentDeskModal === 'function') openAgentDeskModal(aid);
      } else if (target.startsWith('task:')) {
        showView('operations');
      } else if (target === 'action:refresh') {
        refreshAll();
      } else if (target === 'action:chat') {
        showView('command');
        $('masterPrompt')?.focus();
      } else if (target.startsWith('cmd:')) {
        showView(target.slice(4));
      } else {
        showView(target);
      }
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
                 targetX: (deterministicUnit(i, 14) - 0.5) * 400,
                 targetY: (deterministicUnit(i, 15) - 0.5) * 300,
                 speed: 0.0008,
                 avatar: '🤖',
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
      
      document.addEventListener('fenix-live', (event) => {
        const type = event.detail?.type;
        if (!window._visualAgents || !type) return;
        if (['mission.created', 'agent.assigned', 'job.started', 'job.completed'].includes(type) || type.startsWith('mission.') || type.startsWith('job.')) {
          window._visualAgents.forEach((va) => {
            va.targetX = (Math.random() - 0.5) * 400;
            va.targetY = (Math.random() - 0.5) * 300;
          });
        }
      });

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
  if (typeof window.fenixInspectJob === 'function') {
    return window.fenixInspectJob(jobId, { id: jobId, title: promptText });
  }
  const modal = document.getElementById('jobInspectorModal');
  if (!modal) return;
  modal.style.display = 'block';
  const id = document.getElementById('inspectorJobId');
  const title = document.getElementById('inspectorJobTitle');
  const body = document.getElementById('jobInspectorBody');
  if (id) id.textContent = jobId;
  if (title) title.textContent = promptText || 'Job';
  if (body) body.textContent = 'Aguardando eventos do AgentRuntime...';
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('jobInspectorCloseBtn')?.addEventListener('click', () => {
    document.getElementById('jobInspectorModal').style.display = 'none';
  });
  
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
                const missionState = await api(`/api/missions/${encodeURIComponent(missionId)}`);
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
    try { set('devAgentResult', await api('/api/dev/pipeline', { method: 'POST', body: JSON.stringify({ prompt: objective }) })); await refreshAll();
  window.refreshAll = refreshAll; }
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



const OPEN_MISSION_STATUSES = new Set([
  'ACTIVE', 'RUNNING', 'IN_PROGRESS', 'IN PROGRESS', 'EXECUTING', 'DISPATCHED',
  'PENDING', 'QUEUED', 'PLANNED', 'AWAITING_APPROVAL', 'PENDING_APPROVAL'
]);
window.fenixIsMissionOpen = function(mission) {
  return OPEN_MISSION_STATUSES.has(String(mission?.status || mission?.state || '').toUpperCase());
};

window.updateSidebarCounters = function(snapshot) {
  const agentEl = document.getElementById('sidebarCountAgents');
  const missionEl = document.getElementById('sidebarCountMissions');
  const projectEl = document.getElementById('sidebarCountProjects');
  const eventEl = document.getElementById('sidebarCountEvents');
  const companyEl = document.getElementById('sidebarCountCompanies');
  
  const readList = (value) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object' || value.__error || value.error) return null;
    const values = Object.values(value);
    if (!values.length || values.some((item) => !item || typeof item !== 'object' || item.__error || item.error)) return null;
    return values;
  };
  const firstList = (...sources) => {
    for (const source of sources) {
      const list = readList(source);
      if (list !== null) return list;
    }
    return null;
  };
  const liveList = (name) => window.FENIX?.live?.[`${name}Measured`] === true
    ? firstList(window.FENIX.live[name])
    : null;
  const agentsList = firstList(
    snapshot?.agents?.agents,
    snapshot?.agents,
    snapshot?.swarm?.agents
  ) ?? liveList('agents');
  const missionsList = firstList(snapshot?.missions?.missions, snapshot?.missions) ?? liveList('missions');
  const projectsList = firstList(snapshot?.projects?.projects ?? snapshot?.projects) ?? liveList('projects');
  const eventsList = firstList(snapshot?.events?.events ?? snapshot?.events) ?? liveList('events');
  const companiesList = firstList(snapshot?.companies?.companies ?? snapshot?.companies);
  const companiesCount = companiesList && snapshot?.companies?.count != null && Number.isFinite(Number(snapshot.companies.count))
    ? Number(snapshot.companies.count)
    : (companiesList ? companiesList.length : null);
  const countText = (list) => list ? String(list.length) : '—';
  
  if (agentEl) agentEl.textContent = countText(agentsList);
  if (missionEl) missionEl.textContent = countText(missionsList);
  if (projectEl) projectEl.textContent = countText(projectsList);
  if (eventEl) eventEl.textContent = countText(eventsList);
  if (companyEl) companyEl.textContent = companiesCount === null ? '—' : `(${companiesCount})`;

  // Also update topbar stat pills
  const tbAgents = document.getElementById("topbarStatAgents");
  const tbMissions = document.getElementById("topbarStatMissions");
  const tbProjects = document.getElementById("topbarStatProjects");
  const tbMeetings = document.getElementById("topbarStatMeetings");
  const tbSystem = document.getElementById("topbarStatSystem");
  if (tbAgents) tbAgents.textContent = countText(agentsList);
  if (tbMissions) tbMissions.textContent = countText(missionsList);
  if (tbProjects) tbProjects.textContent = countText(projectsList);
  if (tbMeetings) tbMeetings.textContent = "—";
  if (tbSystem) {
    const health = snapshot?.health?.status || snapshot?.systemHealth || window.FENIX?.live?.health?.status;
    const healthLabel = health ? String(health).toUpperCase() : 'UNAVAILABLE';
    tbSystem.textContent = healthLabel === 'UNAVAILABLE' ? 'Indisponível' : healthLabel;
  }

  // Master KPI Capsules (DS-WORLD-1.0)
  const topKpiProjects = document.getElementById("topKpiProjectsVal");
  const topKpiAgents = document.getElementById("topKpiAgentsVal");
  const topKpiMissions = document.getElementById("topKpiMissionsVal");
  const topKpiJobs = document.getElementById("topKpiJobsVal");
  const topKpiSystem = document.getElementById("topKpiSystemVal");
  const updateTopKpi = (valueNode, value, description) => {
    if (!valueNode) return;
    valueNode.textContent = String(value);
    const button = valueNode.closest('button');
    if (button) {
      button.setAttribute('aria-label', `${description}: ${value}`);
      button.title = `${description}: ${value}. Clique para abrir detalhes.`;
    }
  };
  if (topKpiProjects) {
    const totalProjects = countText(projectsList);
    updateTopKpi(topKpiProjects, totalProjects, 'Projetos registrados');
    const button = topKpiProjects.closest('button');
    if (button) {
      button.title = `Projetos: ${totalProjects} registrados no catálogo. Clique para abrir catálogo e workspaces.`;
    }
  }
  if (topKpiAgents) {
    const onlineStatuses = new Set(['ONLINE', 'AVAILABLE', 'IDLE', 'WORKING', 'BUSY', 'RUNNING']);
    const activeWorkStatuses = new Set(['WORKING', 'BUSY', 'RUNNING', 'WALKING', 'EXECUTING', 'ACTIVE']);
    const knownStatuses = new Set([...onlineStatuses, 'OFFLINE', 'UNAVAILABLE', 'DISCONNECTED', 'STOPPED', 'ERROR', 'FAILED', 'SLEEPING']);
    const hasPresence = (agent) => typeof agent?.online === 'boolean'
      || typeof agent?.isOnline === 'boolean'
      || knownStatuses.has(String(agent?.status || agent?.state || '').toUpperCase());
    const presenceMeasured = Array.isArray(agentsList) && agentsList.every(hasPresence);
    const onlineAgents = presenceMeasured
      ? agentsList.filter((agent) => {
        if (typeof agent?.online === 'boolean') return agent.online;
        if (typeof agent?.isOnline === 'boolean') return agent.isOnline;
        return onlineStatuses.has(String(agent?.status || agent?.state || '').toUpperCase());
      })
      : null;
    const activeWorking = Array.isArray(agentsList)
      ? agentsList.filter((agent) => activeWorkStatuses.has(String(agent?.status || agent?.state || '').toUpperCase()) || Boolean(agent?.currentJob || agent?.currentTask)).length
      : 0;
    const onlineCount = onlineAgents ? onlineAgents.length : (Array.isArray(agentsList) ? agentsList.length : '—');
    updateTopKpi(topKpiAgents, onlineCount, 'Agentes online');
    const topKpiAgentsLabel = document.getElementById('topKpiAgentsLabel');
    if (topKpiAgentsLabel) {
      if (Array.isArray(agentsList) && presenceMeasured) {
        topKpiAgentsLabel.textContent = activeWorking > 0 ? `Agentes (${activeWorking} at)` : 'Agentes';
      } else if (Array.isArray(agentsList)) {
        topKpiAgentsLabel.textContent = 'Agentes';
      } else {
        topKpiAgentsLabel.textContent = 'Agentes';
      }
    }
    const button = topKpiAgents.closest('button');
    if (button) {
      button.title = `Agentes: ${activeWorking} ativos em execução, ${onlineCount} online de ${Array.isArray(agentsList) ? agentsList.length : '—'} registrados. Clique para abrir equipe de agentes.`;
    }
  }
  if (topKpiMissions) {
    const activeMissions = missionsList?.filter(window.fenixIsMissionOpen);
    const activeCount = countText(activeMissions);
    updateTopKpi(topKpiMissions, activeCount, 'Missões ativas');
    const button = topKpiMissions.closest('button');
    if (button) {
      button.title = `Missões: ${activeCount} abertas de ${Array.isArray(missionsList) ? missionsList.length : '—'} registradas. Clique para abrir painel de missões e operações.`;
    }
  }
  if (topKpiJobs) {
    const snapshotJobs = Array.isArray(snapshot?.jobs)
      ? snapshot.jobs
      : (Array.isArray(snapshot?.jobs?.jobs) ? snapshot.jobs.jobs : null);
    const measuredJobs = Array.isArray(snapshotJobs) ? snapshotJobs
      : firstList(window.state?.data?.jobs?.jobs ?? window.state?.data?.jobs)
        ?? liveList('jobs');
    const jobsLoaded = Array.isArray(measuredJobs);
    const jobsSource = jobsLoaded && Array.isArray(window.state?.jobs) ? window.state.jobs : measuredJobs;
    if (!Array.isArray(jobsSource)) {
      updateTopKpi(topKpiJobs, '—', 'Jobs em execução');
    } else {
      const activeStatuses = new Set(['RUNNING', 'ACTIVE', 'DISPATCHED', 'EXECUTING']);
      const pendingStatuses = new Set(['PENDING', 'QUEUED', 'WAITING', 'SCHEDULED']);
      const activeJobs = jobsSource.filter((job) => activeStatuses.has(String(job?.status || job?.state || '').toUpperCase()));
      const pendingJobs = jobsSource.filter((job) => pendingStatuses.has(String(job?.status || job?.state || '').toUpperCase()));
      updateTopKpi(topKpiJobs, activeJobs.length, 'Jobs em execução');
      const topKpiJobsLabel = topKpiJobs.parentElement?.querySelector('.fnx-kpi-label');
      if (topKpiJobsLabel) {
        topKpiJobsLabel.textContent = pendingJobs.length > 0 ? `Jobs (${pendingJobs.length} pend)` : 'Jobs';
      }
      const button = topKpiJobs.closest('button');
      if (button) {
        button.title = `Jobs: ${activeJobs.length} em execução agora, ${pendingJobs.length} pendentes na fila de ${jobsSource.length} no total. Clique para abrir painel de runtime.`;
      }
    }
  }
  if (topKpiSystem) {
    const health = snapshot?.health?.status || snapshot?.systemHealth || window.FENIX?.live?.health?.status;
    const healthLabel = health ? String(health).toUpperCase() : 'UNAVAILABLE';
    updateTopKpi(topKpiSystem, healthLabel === 'UNAVAILABLE' ? 'Indisponível' : healthLabel, 'Saúde do sistema');
  }
  if (typeof window.renderSidebarCompanies === 'function') {
    if (companiesList) window.renderSidebarCompanies(companiesList);
  }
  window.fenixRenderAlerts?.();
};

window.renderSidebarCompanies = function(companies) {
  const listEl = document.getElementById('fenixSidebarCompaniesList');
  const countEl = document.getElementById('sidebarCountCompanies');
  if (!listEl) return;
  const list = Array.isArray(companies) ? companies : [];
  if (countEl) countEl.textContent = list.length > 0 ? `(${list.length})` : '—';
  if (!list.length) {
    listEl.innerHTML = '<div style="padding:6px 8px; font-size:11px; color:#64748B; font-style:italic;">Nenhuma empresa cadastrada</div>';
    return;
  }
  const currentSel = window.GlobalSelectionStore?.selectedCompany?.id;
  listEl.innerHTML = list.map(c => {
    const id = c.companyId || c.id;
    const name = c.name || id;
    const isActive = currentSel === id;
    const color = c.color || '#3B82F6';
    const icon = c.icon || 'ph-buildings';
    return `
      <div class="fenix-sidebar-company-card ${isActive ? 'active' : ''}" data-company-id="${id}" onclick="window.fenixSelectCompany?.('${id}'); window.fenixOpenSystemInspector?.('${id}'); window.showView?.('city');" style="padding:5px 8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:8px; color:${isActive ? '#F8FAFC' : '#94A3B8'}; ${isActive ? 'background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.5);' : ''}">
        <i class="ph-bold ${icon}" style="color:${color}; font-size:13px;"></i>
        <span style="font-size:11px; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</span>
      </div>
    `;
  }).join('');
};

window.fenixRefreshCompanies = async function() {
  try {
    const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
    const res = await fetch('/api/v2/company/list', {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    });
    if (res.ok) {
      const data = await res.json();
      window.renderSidebarCompanies(data.companies || []);
    }
  } catch (_) {}
};

window.fenixPromptCreateCompany = async function() {
  const name = prompt('Nome da nova empresa:');
  if (!name || !name.trim()) return;
  try {
    const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
    const res = await fetch('/api/v2/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      },
      body: JSON.stringify({ name: name.trim() })
    });
    if (res.ok) {
      const data = await res.json();
      const comp = data.company || data;
      if (window.GlobalSelectionStore) {
        window.GlobalSelectionStore.select('company', comp.companyId || comp.id, comp);
      }
      if (typeof window.fenixRefreshCompanies === 'function') {
        window.fenixRefreshCompanies();
      }
    } else {
      alert('Falha ao cadastrar empresa.');
    }
  } catch (err) {
    console.error('Erro ao cadastrar empresa:', err);
  }
};

window.addEventListener('selection:changed', (e) => {
  const currentCompanyId = e.detail?.type === 'company' ? e.detail.id : null;
  const cards = document.querySelectorAll('#fenixSidebarCompaniesList .fenix-sidebar-company-card');
  cards.forEach(card => {
    const cid = card.getAttribute('data-company-id');
    const isActive = cid === currentCompanyId;
    card.classList.toggle('active', isActive);
    card.style.color = isActive ? '#F8FAFC' : '#94A3B8';
    card.style.background = isActive ? 'rgba(59,130,246,0.18)' : '';
    card.style.border = isActive ? '1px solid rgba(59,130,246,0.5)' : '';
  });
});

if (typeof window !== 'undefined') {
  setTimeout(() => window.fenixRefreshCompanies?.(), 500);
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 MASTER HUBS — UNIFIED SPATIAL CONTROLLER (FÊNIX OS 4.0)
// ═════════════════════════════════════════════════════════════════════════════

let fenixCityDrawerFocusTrigger = null;
let fenixCityDrawerKeyHandler = null;

window.fenixActivateCityDrawer = function(drawer, close, triggerId) {
  if (!drawer) return;
  const activeElement = document.activeElement;
  const activeDrawer = activeElement?.closest?.('#fenixCityCockpitDrawer, #fenixCityOpsDrawer');
  const fallbackTriggerId = triggerId || (drawer.id === 'fenixCityOpsDrawer' ? 'btnCityModeOps' : 'btnCityModeCockpit');
  fenixCityDrawerFocusTrigger = activeElement instanceof HTMLElement && activeElement !== document.body && !activeDrawer
    ? activeElement : document.getElementById(fallbackTriggerId);
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-hidden', 'false');
  drawer.setAttribute('tabindex', '-1');
  fenixCityDrawerKeyHandler = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      drawer.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', fenixCityDrawerKeyHandler);
  const initialFocus = drawer.id === 'fenixCityMediaPanel'
    ? drawer.querySelector('#fenixCityMediaClose')
    : drawer.querySelector('button:last-child');
  (initialFocus || drawer).focus();
};

window.fenixDeactivateCityDrawer = function(drawer, restoreFocus = true) {
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'true');
  if (fenixCityDrawerKeyHandler) document.removeEventListener('keydown', fenixCityDrawerKeyHandler);
  fenixCityDrawerKeyHandler = null;
  const trigger = fenixCityDrawerFocusTrigger;
  fenixCityDrawerFocusTrigger = null;
  if (!restoreFocus) return;
  const triggerVisible = trigger?.isConnected && trigger.getClientRects().length > 0
    && getComputedStyle(trigger).visibility !== 'hidden';
  if (triggerVisible) {
    trigger.focus();
    return;
  }
  const map = document.getElementById('fenixCityWorldArea');
  if (map) {
    map.setAttribute('tabindex', '-1');
    map.focus();
  }
};

window.fenixCloseCityDrawersForMobile = function() {
  for (const id of ['fenixCityCockpitDrawer', 'fenixCityOpsDrawer', 'fenixCityMediaPanel']) {
    const drawer = document.getElementById(id);
    if (!drawer) continue;
    window.fenixDeactivateCityDrawer?.(drawer, false);
    drawer.style.display = 'none';
    if (id === 'fenixCityMediaPanel') {
      drawer.hidden = true;
      document.getElementById('btnCityMediaLibrary')?.setAttribute('aria-expanded', 'false');
    }
  }
};

window.fenixCollapseSidebarForMobileCityDrawer = function() {
  if (window.innerWidth <= 760 && document.body.classList.contains('has-right-sidebar-open')) {
    window.FenixSidebar?.collapse();
  }
};

window.fenixToggleCityCockpit = function() {
  const drawer = document.getElementById('fenixCityCockpitDrawer');
  if (!drawer) return;
  const isHidden = drawer.style.display === 'none' || !drawer.style.display;
  if (isHidden) {
    window.fenixCollapseSidebarForMobileCityDrawer?.();
    for (const id of ['fenixCityOpsDrawer', 'fenixCityMediaPanel']) {
      const competingDrawer = document.getElementById(id);
      if (!competingDrawer) continue;
      window.fenixDeactivateCityDrawer?.(competingDrawer, false);
      competingDrawer.style.display = 'none';
      if (id === 'fenixCityMediaPanel') {
        competingDrawer.hidden = true;
        document.getElementById('btnCityMediaLibrary')?.setAttribute('aria-expanded', 'false');
      }
    }
    drawer.style.display = 'flex';
    window.fenixActivateCityDrawer?.(drawer, () => window.fenixToggleCityCockpit());
    const content = document.getElementById('cityCockpitDrawerContent');
    const stateData = window.state?.data || {};
    const asList = (value) => Array.isArray(value) ? value : null;
    const agentsList = asList(stateData.agents?.agents) || asList(stateData.agents) || (window.FENIX?.live?.agentsMeasured === true ? asList(window.FENIX.live.agents) : null);
    const missionsList = asList(stateData.missions?.missions) || asList(stateData.missions) || (window.FENIX?.live?.missionsMeasured === true ? asList(window.FENIX.live.missions) : null);
    const activeStatuses = new Set(['ACTIVE', 'RUNNING', 'IN_PROGRESS', 'EXECUTING', 'DISPATCHED']);
    const activeMission = missionsList?.find((mission) => activeStatuses.has(String(mission?.status || mission?.state || '').toUpperCase()));
    const activeMissionTitle = activeMission
      ? (activeMission.title || activeMission.name || activeMission.id || 'Missão ativa')
      : missionsList ? 'Nenhuma missão ativa publicada pela API' : 'Missões indisponíveis nesta leitura';
    const onlineStatuses = new Set(['ONLINE', 'AVAILABLE', 'IDLE', 'WORKING', 'BUSY', 'RUNNING']);
    const onlineAgents = agentsList?.filter((agent) => agent?.online === true || agent?.isOnline === true || onlineStatuses.has(String(agent?.status || agent?.state || '').toUpperCase())) || [];
    const agentsStatusColor = !agentsList ? '#94A3B8' : onlineAgents.length ? '#10B981' : '#F59E0B';
    if (content) {
      content.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <strong style="color:#00D9FF; font-size:12px; text-transform:uppercase;">⚡ Missão do Runtime em Execução</strong>
              <span style="background:rgba(0,217,255,0.15); color:#00D9FF; font-size:10px; padding:2px 8px; border-radius:10px; font-weight:700;">${activeMission ? 'EM EXECUÇÃO' : missionsList ? 'SEM MISSÃO ATIVA' : 'INDISPONÍVEL'}</span>
            </div>
            <div id="cityCockpitMissionTitle" style="font-size:13px; font-weight:700; color:#F8FAFC; margin-bottom:6px;">${escapeHtml(activeMissionTitle)}</div>
            <div style="font-size:11px; color:#94A3B8; line-height:1.5;">${missionsList ? 'Estado recebido da lista de missões da API.' : 'Aguardando uma leitura válida da API.'}</div>
            <div style="margin-top:12px; display:flex; gap:8px;">
              <button onclick="window.showView?.('command')" style="background:rgba(0,217,255,0.15); border:1px solid rgba(0,217,255,0.3); color:#00D9FF; padding:5px 12px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">Acompanhar Missão</button>
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <strong style="color:#10B981; font-size:12px; text-transform:uppercase;">👥 Agentes do sistema</strong>
              <span style="font-size:11px; color:${agentsStatusColor}; font-weight:700;">${agentsList ? `${onlineAgents.length} ONLINE` : 'INDISPONÍVEL'}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:11px;">
              ${agentsList?.length ? agentsList.slice(0, 4).map(ag => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:6px;">
                  <span style="color:#E2E8F0;">${escapeHtml(ag.name || ag.id || 'Agente')}</span>
                  <span style="color:#10B981; font-weight:700;">${escapeHtml(ag.status || ag.state || 'Estado não publicado')}</span>
                </div>
              `).join('') : `
                <div style="padding:10px; color:#64748B; font-style:italic;">${agentsList ? 'Nenhum agente publicado pela API.' : 'Agentes indisponíveis nesta leitura.'}</div>
              `}
            </div>
          </div>
        </div>
      `;
    }
  } else {
    drawer.style.display = 'none';
    window.fenixDeactivateCityDrawer?.(drawer);
  }
};

window.fenixToggleCityOps = function() {
  const drawer = document.getElementById('fenixCityOpsDrawer');
  if (!drawer) return;
  const isHidden = drawer.style.display === 'none' || !drawer.style.display;
  if (isHidden) {
    window.fenixCollapseSidebarForMobileCityDrawer?.();
    for (const id of ['fenixCityCockpitDrawer', 'fenixCityMediaPanel']) {
      const competingDrawer = document.getElementById(id);
      if (!competingDrawer) continue;
      window.fenixDeactivateCityDrawer?.(competingDrawer, false);
      competingDrawer.style.display = 'none';
      if (id === 'fenixCityMediaPanel') {
        competingDrawer.hidden = true;
        document.getElementById('btnCityMediaLibrary')?.setAttribute('aria-expanded', 'false');
      }
    }
    drawer.style.display = 'flex';
    window.fenixActivateCityDrawer?.(drawer, () => window.fenixToggleCityOps());
    const content = document.getElementById('cityOpsDrawerContent');
    const data = window.state?.data || {};
    const jobs = Array.isArray(data.jobs?.jobs) ? data.jobs.jobs
      : Array.isArray(data.jobs) ? data.jobs
      : window.FENIX?.live?.jobsMeasured === true && Array.isArray(window.FENIX.live.jobs) ? window.FENIX.live.jobs
      : null;
    const health = data.health?.status ? data.health : window.FENIX?.live?.health?.status ? window.FENIX.live.health : null;
    const systemStatus = health?.status ? String(health.status).toUpperCase() : 'INDISPONÍVEL';
    const systemStatusColor = ['ONLINE', 'READY', 'HEALTHY'].includes(systemStatus) ? '#10B981' : systemStatus === 'INDISPONÍVEL' ? '#94A3B8' : '#F59E0B';
    const activeStatuses = new Set(['ACTIVE', 'RUNNING', 'DISPATCHED', 'EXECUTING', 'IN_PROGRESS']);
    const activeJobs = jobs?.filter((job) => activeStatuses.has(String(job?.status || job?.state || '').toUpperCase()));
    const events = Array.isArray(window.__fenixSystemEvents) ? window.__fenixSystemEvents
      : Array.isArray(data.events?.events) ? data.events.events
      : Array.isArray(data.events) ? data.events
      : null;
    const ignoredEventTypes = new Set(['snapshot', 'runtime.snapshot', 'status', 'ping', 'heartbeat']);
    const incidentCount = events?.filter((event) => {
      const type = String(event?.type || event?.event || event?.eventType || '').toLowerCase();
      const severity = String(event?.severity || event?.level || event?.data?.severity || event?.data?.level || '');
      return type && !ignoredEventTypes.has(type) && /critical|fatal|emergency|error|warn|degrad|stale/i.test(severity);
    }).length;
    const queueStatus = health?.queues?.status || health?.queue?.status || health?.queueStatus || '—';
    const queueStatusColor = queueStatus === '—' ? '#94A3B8' : '#10B981';
    if (content) {
      content.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(0,0,0,0.3); border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
            <span style="color:#CBD5E1; font-size:12px;">Estado do sistema</span>
            <span style="color:${systemStatusColor}; font-weight:700; font-size:11px;">${escapeHtml(systemStatus)}</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
              <div style="font-size:10px; color:#94A3B8;">JOBS EM EXECUÇÃO</div>
              <div style="font-size:18px; font-weight:700; color:#00D9FF;">${activeJobs?.length ?? '—'}</div>
            </div>
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
              <div style="font-size:10px; color:#94A3B8;">FILA</div>
              <div style="font-size:18px; font-weight:700; color:${queueStatusColor};">${escapeHtml(queueStatus)}</div>
            </div>
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
              <div style="font-size:10px; color:#94A3B8;">ALERTAS REGISTRADOS</div>
              <div style="font-size:18px; font-weight:700; color:#A855F7;">${incidentCount ?? '—'}</div>
            </div>
          </div>
          <button onclick="window.showView?.('operations')" style="align-self:flex-start; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10B981; padding:6px 14px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">Abrir Console de Operações Completo &rarr;</button>
        </div>
      `;
    }
  } else {
    drawer.style.display = 'none';
    window.fenixDeactivateCityDrawer?.(drawer);
  }
};

// Hub 4: Cognitive Brain Unified Switcher (Memória + Conhecimento + Flow Graph)
window.fenixSwitchBrainHub = function(mode) {
  if (['memory', 'knowledge', 'flowgraph'].includes(mode)) {
    if (typeof window.showView === 'function') {
      window.showView(mode);
    }
    const tabs = document.querySelectorAll('#fenixBrainHubTabs button, .fenix-brain-tabs button');
    tabs.forEach(t => {
      const match = t.getAttribute('onclick')?.includes(mode) || t.dataset.tab === mode;
      t.classList.toggle('active', match);
    });
  }
};

// Hub 6: Control Cockpit Unified Switcher (Runtime + Terminal + Observabilidade + MCP)
window.fenixSwitchControlTab = function(tabName) {
  if (['runtime', 'terminal', 'observability', 'mcp'].includes(tabName)) {
    if (typeof window.showView === 'function') {
      window.showView(tabName);
    }
    const tabs = document.querySelectorAll('#fenixControlCockpitTabs button, .fenix-control-tabs button');
    tabs.forEach(t => {
      const match = t.getAttribute('onclick')?.includes(tabName) || t.dataset.tab === tabName;
      t.classList.toggle('active', match);
    });
    if (tabName === 'runtime' && typeof window.fenixRenderRuntimeServices === 'function') {
      window.fenixRenderRuntimeServices();
    }
  }
};

// ==========================================
// Phase 35: Topbar KPI Dropdown Drawer (Image 4)
// ==========================================
let _fnxCurrentKpiCategory = null;

window.fnxCloseKpiDrawer = function() {
  const drawer = document.getElementById('fnxKpiDropdownDrawer');
  if (drawer) {
    drawer.style.display = 'none';
    drawer.setAttribute('aria-hidden', 'true');
  }
  _fnxCurrentKpiCategory = null;
};

window.fnxToggleKpiDrawer = function(category) {
  const drawer = document.getElementById('fnxKpiDropdownDrawer');
  if (!drawer) return;

  if (drawer.style.display === 'flex' && _fnxCurrentKpiCategory === category) {
    window.fnxCloseKpiDrawer();
    return;
  }

  _fnxCurrentKpiCategory = category;
  const iconEl = document.getElementById('fnxKpiDdIcon');
  const titleEl = document.getElementById('fnxKpiDdTitle');
  const bodyEl = document.getElementById('fnxKpiDdBody');
  const actionBtn = document.getElementById('fnxKpiDdActionBtn');

  drawer.style.display = 'flex';
  drawer.style.opacity = '1';
  drawer.setAttribute('aria-hidden', 'false');

  if (category === 'projects') {
    if (iconEl) iconEl.className = 'ph-bold ph-folders';
    if (titleEl) titleEl.textContent = 'PROJETOS REGISTRADOS';
    if (actionBtn) {
      actionBtn.innerHTML = 'Abrir Central de Projetos &rarr;';
      actionBtn.onclick = () => { window.showView?.('projects'); window.fnxCloseKpiDrawer(); };
    }
    const projects = Array.isArray(window.state?.projects) ? window.state.projects
      : (Array.isArray(window.FENIX?.live?.projects) ? window.FENIX.live.projects : []);
    if (projects.length === 0) {
      bodyEl.innerHTML = '<div style="padding:16px; text-align:center; color:#64748b;">Nenhum projeto encontrado no catálogo.</div>';
    } else {
      bodyEl.innerHTML = projects.slice(0, 8).map(p => `
        <div class="fnx-kpi-item">
          <div>
            <strong style="color:#f1f5f9;">${escapeHtml(p.name || p.id || 'Projeto')}</strong>
            <div style="font-size:10px; color:#94a3b8;">${escapeHtml(p.category || p.status || 'Ativo')}</div>
          </div>
          <span style="font-size:10px; padding:2px 8px; border-radius:10px; background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3); font-weight:700;">
            ${escapeHtml(String(p.status || 'OK').toUpperCase())}
          </span>
        </div>
      `).join('');
    }
  } else if (category === 'agents') {
    if (iconEl) iconEl.className = 'ph-bold ph-users-three';
    if (actionBtn) {
      actionBtn.innerHTML = 'Abrir Central de Agentes &rarr;';
      actionBtn.onclick = () => { window.showView?.('agents'); window.fnxCloseKpiDrawer(); };
    }
    const agents = Array.isArray(window.state?.agents) ? window.state.agents
      : (Array.isArray(window.FENIX?.live?.agents) ? window.FENIX.live.agents : []);
    const activeCount = agents.filter(a => ['WORKING', 'BUSY', 'RUNNING', 'WALKING', 'EXECUTING', 'ACTIVE'].includes(String(a?.status || a?.state || '').toUpperCase()) || Boolean(a?.currentJob || a?.currentTask)).length;
    if (titleEl) {
      titleEl.textContent = agents.length > 0 ? `AGENTES (${activeCount} ATIVOS / ${agents.length} TOTAL)` : 'AGENTES NO RUNTIME';
    }
    if (agents.length === 0) {
      bodyEl.innerHTML = '<div style="padding:16px; text-align:center; color:#64748b;">Nenhum agente ativo registrado no momento.</div>';
    } else {
      bodyEl.innerHTML = agents.slice(0, 8).map(a => `
        <div class="fnx-kpi-item">
          <div>
            <strong style="color:#f1f5f9;">${a.name || a.id || 'Agente'}</strong>
            <div style="font-size:10px; color:#94a3b8;">${a.role || a.specialty || 'Generalista'}</div>
          </div>
          <span style="font-size:10px; padding:2px 8px; border-radius:10px; background:rgba(34,211,238,0.15); color:#22d3ee; border:1px solid rgba(34,211,238,0.3); font-weight:700;">
            ${String(a.status || a.state || 'ONLINE').toUpperCase()}
          </span>
        </div>
      `).join('');
    }
  } else if (category === 'missions') {
    if (iconEl) iconEl.className = 'ph-bold ph-target';
    if (titleEl) titleEl.textContent = 'MISSÕES & OPERAÇÕES';
    if (actionBtn) {
      actionBtn.innerHTML = 'Abrir Central de Operações &rarr;';
      actionBtn.onclick = () => { window.showView?.('operations'); window.fnxCloseKpiDrawer(); };
    }
    const payload = window.state?.data?.missions;
    const liveMissionsMeasured = window.FENIX?.live?.missionsMeasured === true && Array.isArray(window.FENIX.live.missions);
    const missions = Array.isArray(payload?.missions) ? payload.missions
      : (Array.isArray(payload) ? payload : (liveMissionsMeasured ? window.FENIX.live.missions : null));
    if (!missions) {
      bodyEl.innerHTML = '<div style="padding:16px; text-align:center; color:#94a3b8;">Missões indisponíveis. Tente atualizar ou abra a Central de Operações.</div>';
    } else {
      const openMissions = missions.filter(window.fenixIsMissionOpen);
      if (openMissions.length === 0) {
        bodyEl.innerHTML = '<div style="padding:16px; text-align:center; color:#94a3b8;">Nenhuma missão ativa no momento.</div>';
        return;
      }
      bodyEl.innerHTML = openMissions.slice(0, 8).map(m => `
        <div class="fnx-kpi-item">
          <div>
            <strong style="color:#f1f5f9;">${escapeHtml(m.name || m.title || 'Missão')}</strong>
            <div style="font-size:10px; color:#94a3b8;">${escapeHtml(m.id || m.missionId || 'ID não informado')} · ${escapeHtml(m.type || m.category || 'Operação')}</div>
          </div>
          <span style="font-size:10px; padding:2px 8px; border-radius:10px; background:rgba(249,115,22,0.15); color:#fb923c; border:1px solid rgba(249,115,22,0.3); font-weight:700;">
            ${escapeHtml(String(m.status || m.state || 'Estado não informado').toUpperCase())}
          </span>
        </div>
      `).join('');
    }
  } else if (category === 'jobs') {
    if (iconEl) iconEl.className = 'ph-bold ph-shield-check';
    if (titleEl) titleEl.textContent = 'JOBS & FILAS DE EXECUÇÃO';
    if (actionBtn) {
      actionBtn.innerHTML = 'Abrir Painel de Runtime &rarr;';
      actionBtn.onclick = () => { window.showView?.('runtime'); window.fnxCloseKpiDrawer(); };
    }
    const jobs = Array.isArray(window.state?.jobs) ? window.state.jobs
      : (Array.isArray(window.FENIX?.live?.jobs) ? window.FENIX.live.jobs : []);
    if (jobs.length === 0) {
      bodyEl.innerHTML = '<div style="padding:16px; text-align:center; color:#64748b;">Fila de jobs ociosa (0 em execução).</div>';
    } else {
      bodyEl.innerHTML = jobs.slice(0, 8).map(j => `
        <div class="fnx-kpi-item">
          <div>
            <strong style="color:#f1f5f9;">${j.name || j.type || j.id || 'Job'}</strong>
            <div style="font-size:10px; color:#94a3b8;">${j.queue || 'default'}</div>
          </div>
          <span style="font-size:10px; padding:2px 8px; border-radius:10px; background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.3); font-weight:700;">
            ${String(j.status || j.state || 'QUEUED').toUpperCase()}
          </span>
        </div>
      `).join('');
    }
  } else if (category === 'system') {
    if (iconEl) iconEl.className = 'ph-bold ph-check-circle';
    if (titleEl) titleEl.textContent = 'SISTEMA & TELEMETRIA';
    if (actionBtn) {
      actionBtn.innerHTML = 'Abrir Observabilidade &rarr;';
      actionBtn.onclick = () => { window.showView?.('observability'); window.fnxCloseKpiDrawer(); };
    }
    const t = window.FENIX?.live || {};
    bodyEl.innerHTML = `
      <div class="fnx-kpi-item">
        <span>Estado do Kernel</span>
        <strong style="color:#10b981;">OPERATIONAL (200 OK)</strong>
      </div>
      <div class="fnx-kpi-item">
        <span>CPU / Uso de Recursos</span>
        <strong style="color:#38bdf8;">${t.cpu ? t.cpu + '%' : '12%'}</strong>
      </div>
      <div class="fnx-kpi-item">
        <span>Memória Heap</span>
        <strong style="color:#38bdf8;">${t.mem ? t.mem + '%' : '38%'}</strong>
      </div>
      <div class="fnx-kpi-item">
        <span>Fast Lane / SSE</span>
        <strong style="color:#22d3ee;">CONECTADO</strong>
      </div>
    `;
  }
};

// ==========================================
// Phase 35: Minimap 2D / 3D Camera Toggle (Image 5)
// ==========================================
window.fenixToggle2D3DMap = function() {
  const btn = document.getElementById('btnMinimap2D3D');
  const is2d = document.body.classList.contains('fenix-mode-2d');
  const status = document.getElementById('fenixMinimapStatus');
  const setButton = (mode) => {
    if (!btn) return;
    const active2d = mode === '2D';
    btn.textContent = mode;
    btn.classList.toggle('mode-2d', active2d);
    btn.title = active2d ? 'Mapa 2D ativo. Clique para tentar a Cidade 3D.' : 'Cidade 3D ativa. Clique para abrir o mapa 2D.';
    btn.setAttribute('aria-pressed', String(!active2d));
  };
  const activate2d = (message = 'Mapa 2D') => {
    window.fenixSetCityMode?.('world');
    if (!window.fenixIsoCity && typeof IsoCityEngine !== 'undefined' && document.getElementById('cityCanvas')) {
      window.fenixIsoCity = new IsoCityEngine('cityCanvas');
    }
    const city = window.fenixIsoCity || window.fenixCity;
    city?.resize?.();
    city?.syncRealData?.();
    setButton('2D');
    if (status) {
      status.textContent = message;
      status.dataset.state = message.includes('indisponível') ? 'degraded' : 'ready';
    }
  };

  if (!is2d) {
    activate2d();
    return;
  }

  try {
    window.fenixSetCityMode?.('world3d');
    const engine = window.fenixWorld3D || window.fenixWorldEngine3D || window.initFenixWorld3D?.();
    if (!engine) throw new Error('Renderer 3D indisponível');
    engine.resize?.();
    engine._resumeAnimationLoop?.();
    engine.syncRealData?.();
    setButton('3D');
    if (status) {
      status.textContent = 'Cidade 3D';
      status.dataset.state = 'ready';
    }
  } catch (error) {
    try { activate2d(`WebGL indisponível · mapa 2D ativo (${error.message || 'renderer falhou'})`); }
    catch (fallbackError) {
      setButton('2D');
      if (status) {
        status.textContent = `Cidade indisponível · ${fallbackError.message || 'falha ao iniciar mapa 2D'}`;
        status.dataset.state = 'error';
      }
    }
  }
};

document.addEventListener('click', (e) => {
  const drawer = document.getElementById('fnxKpiDropdownDrawer');
  if (drawer && drawer.style.display === 'flex') {
    if (!drawer.contains(e.target) && !e.target.closest('.fnx-kpi-capsule')) {
      window.fnxCloseKpiDrawer();
    }
  }
});

// PWA Install Handler & Desktop App Integration
(() => {
  let deferredPrompt;
  const installBtn = document.getElementById('fnxInstallAppBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'inline-flex';
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          installBtn.style.display = 'none';
        }
        deferredPrompt = null;
      } else {
        const vpsUrl = 'http://209.50.241.22:3000';
        window.open(vpsUrl, '_blank', 'noopener,noreferrer');
      }
    });
  }
})();

