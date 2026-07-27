let accessToken = localStorage.getItem('grg_token');
let redirectingToLogin = false;
if (!accessToken) location.replace('/GRG-login');
class FenixApiError extends Error {
  constructor(message, details = {}) { super(message); this.name = 'FenixApiError'; Object.assign(this, details); }
}
function clearSessionAndRedirect() {
  localStorage.removeItem('grg_token'); localStorage.removeItem('grg_user'); sessionStorage.removeItem('grg_refresh_token');
  if (!redirectingToLogin) { redirectingToLogin = true; location.replace('/GRG-login?reason=session-expired'); }
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
    accessToken = tokens.access_token; localStorage.setItem('grg_token', accessToken);
    if (tokens.refresh_token) sessionStorage.setItem('grg_refresh_token', tokens.refresh_token);
    return true;
  } catch { return false; }
}
const api = async (p, opts = {}, retried = false) => {
  const response = await fetch(`/api${p}`, { ...opts, headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', ...(opts.headers || {}) } });
  if (response.status === 401 && !retried && await refreshAccessToken()) return api(p, opts, true);
  if (response.status === 401) { clearSessionAndRedirect(); throw new FenixApiError('Sessão expirada', { status: 401 }); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new FenixApiError(payload.error || 'Falha na operação', {
    status: response.status,
    requestId: payload.requestId || response.headers.get('x-request-id'),
    correlationId: payload.correlationId || response.headers.get('x-correlation-id'),
  });
  return payload;
};

const METRIC_LABELS = {
  orgs: 'Orgs', customers: 'Clientes', projects: 'Projetos', repositories: 'Repositórios',
  capabilities: 'Capabilities', snapshots: 'Snapshots', deployments: 'Deploys',
  artifacts: 'Artefatos', memoryEvents: 'Memória', graphEdges: 'Grafo', aiCalls: 'AI Calls',
  subscriptions: 'Assinaturas',
};

async function refresh() {
  const ov = await api('/overview');
  const grid = document.getElementById('metrics');
  grid.innerHTML = Object.entries(ov.metrics)
    .map(([k, v]) => `<div class="metric"><div class="v">${v}</div><div class="k">${METRIC_LABELS[k] || k}</div></div>`)
    .join('');

  const { projects } = await api('/projects');
  document.getElementById('projects').innerHTML = projects.length
    ? projects.map((p) => `<li>${p.name} <span class="tag">${(p.reusedModules || []).join(', ') || 'novo'}</span></li>`).join('')
    : '<li>nenhum ainda</li>';

  const { repositories } = await api('/repositories');
  document.getElementById('repos').innerHTML = repositories.length
    ? repositories.map((r) => `<li>${r.name} <span class="tag">${r.analysisStatus}</span></li>`).join('')
    : '<li>nenhum ainda</li>';

  document.getElementById('memory').innerHTML = ov.recentMemory.length
    ? ov.recentMemory.map((m) => `<li>${m.summary}</li>`).join('')
    : '<li>vazia</li>';
}

const log = document.getElementById('chatlog');
function bubble(text, who) {
  const div = document.createElement('div');
  div.className = `bubble ${who}`;
  const safeText = typeof text === 'string' && text.trim() ? text : 'Resposta indisponível no momento.';
  const escaped = safeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  div.innerHTML = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function operatorError(error) {
  const reference = error && (error.correlationId || error.requestId);
  return `Não foi possível concluir a operação.${reference ? ` Referência: ${reference}` : ' Tente novamente em instantes.'}`;
}

function showFallback(error) {
  console.error('fenix.ui.boundary', { name: error?.name, message: error?.message, correlationId: error?.correlationId || null });
  let fallback = document.getElementById('runtimeFallback');
  if (!fallback) {
    fallback = document.createElement('div'); fallback.id = 'runtimeFallback'; fallback.className = 'runtime-fallback';
    fallback.textContent = 'Uma área do FÊNIX encontrou uma falha e foi isolada. Recarregue se ela persistir.';
    document.body.prepend(fallback);
  }
}

window.addEventListener('error', (event) => showFallback(event.error || new Error(event.message)));
window.addEventListener('unhandledrejection', (event) => { event.preventDefault(); showFallback(event.reason); });

async function send(message) {
  bubble(message, 'user');
  const typing = document.createElement('div');
  typing.className = 'bubble bot'; typing.textContent = '…';
  log.appendChild(typing); log.scrollTop = log.scrollHeight;
  try {
    const res = await api('/chat', { method: 'POST', body: JSON.stringify({ message }) });
    typing.remove();
    if (typeof res.reply !== 'string' || !res.reply.trim()) throw new FenixApiError('Contrato de resposta do chat inválido', { requestId: res.requestId });
    bubble(res.reply, 'bot');
    await refresh();
  } catch (err) {
    typing.remove();
    bubble(operatorError(err), 'bot');
  }
}

document.getElementById('chat').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('msg');
  const v = input.value.trim();
  if (!v) return;
  input.value = '';
  send(v);
});

document.querySelectorAll('.chip').forEach((c) => {
  c.addEventListener('click', () => send(c.dataset.msg));
});

if (accessToken) {
  bubble('Olá! Sou o agente do GRG Services OS. Cole uma URL do GitHub para eu acoplar e analisar, peça para gerar um sistema, ou pergunte o que aprendi. Digite "ajuda" para ver tudo.', 'bot');
  refresh().catch((error) => { if (error.status !== 401) showFallback(error); });
}
