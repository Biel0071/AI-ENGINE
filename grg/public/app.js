const TOKEN = localStorage.getItem('grg_token');
if (!TOKEN) location.href = '/GRG-login';
const H = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };
const api = (p, opts = {}) => fetch(`/api${p}`, { headers: H, ...opts }).then((r) => { if (r.status === 401) location.href = '/GRG-login'; return r.json(); });

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
  div.innerHTML = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function send(message) {
  bubble(message, 'user');
  const typing = document.createElement('div');
  typing.className = 'bubble bot'; typing.textContent = '…';
  log.appendChild(typing); log.scrollTop = log.scrollHeight;
  try {
    const res = await api('/chat', { method: 'POST', body: JSON.stringify({ message }) });
    typing.remove();
    bubble(res.reply, 'bot');
    await refresh();
  } catch (err) {
    typing.remove();
    bubble(`Erro: ${err.message}`, 'bot');
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

bubble('Olá! Sou o agente do GRG Services OS. Cole uma URL do GitHub para eu acoplar e analisar, peça para gerar um sistema, ou pergunte o que aprendi. Digite "ajuda" para ver tudo.', 'bot');
refresh();
