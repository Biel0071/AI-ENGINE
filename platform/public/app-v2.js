const TENANT_ID = 'biel0071-software-house';
const USER_ID = 'biel0071';
const state = { projects: [], graph: null, acep: null, maturity: null, lcr: null, company: 'biel0071-corp' };

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': TENANT_ID,
      'x-user-id': USER_ID,
      ...(options.headers || {}),
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Falha na operação');
  return body;
}

function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function initTabs() {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      document.querySelector(`#${targetId}`).classList.add('active');
    });
  });
}

function renderMetrics(metrics) {
  const labels = {
    projects: 'Projetos Conectados',
    publicRepositories: 'Repos Públicos',
    privateRepositories: 'Repos Privados',
    analysesQueued: 'Análises na Fila',
    deploymentsConfigured: 'Publicações Preparadas',
    memoryEvents: 'Memórias Progressivas',
  };
  document.querySelector('#metrics').innerHTML = Object.entries(labels)
    .map(([key, label]) => `<div class="metric"><strong>${metrics[key] ?? 0}</strong><span>${label}</span></div>`)
    .join('');
}

function renderProjects() {
  const searchInput = document.querySelector('#search');
  const visibilitySelect = document.querySelector('#visibility');
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const visibility = visibilitySelect ? visibilitySelect.value : 'all';

  const projects = state.projects.filter((project) => {
    const searchable = `${project.name} ${project.repository.name} ${(project.tags || []).join(' ')}`.toLowerCase();
    return searchable.includes(query) && (visibility === 'all' || project.repository.visibility === visibility);
  });

  const container = document.querySelector('#projects');
  container.innerHTML = '';

  for (const project of projects) {
    const fragment = document.querySelector('#project-template').content.cloneNode(true);
    const card = fragment.querySelector('.project-card');
    card.dataset.projectId = project.id;
    fragment.querySelector('h3').textContent = project.name;
    fragment.querySelector('.repo').textContent = `${project.repository.owner}/${project.repository.name}`;
    fragment.querySelector('.visibility').textContent = project.repository.visibility;
    fragment.querySelector('.analysis').textContent = project.analysisStatus;
    fragment.querySelector('.deployment').textContent = project.deploymentStatus;
    fragment.querySelector('.tags').innerHTML = (project.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join('');
    fragment.querySelector('a').href = project.repository.url;
    container.appendChild(fragment);
  }
}

function renderGraph(graph) {
  const projects = graph.nodes.filter((node) => node.type === 'project').length;
  const memories = graph.nodes.filter((node) => node.type === 'memory').length;
  const capabilities = graph.nodes.filter((node) => node.type === 'capability');
  document.querySelector('#graph-summary').textContent = `${graph.nodes.length} nós, ${graph.edges.length} relações em 18 grafos universais, ${projects} projetos e ${memories} memórias comprovadas.`;
  document.querySelector('#capabilities').innerHTML = capabilities.map((node) => `<span class="capability">${node.label}</span>`).join('');
}

function renderMaturity(maturity) {
  const container = document.querySelector('#maturity-grid');
  if (!container || !maturity.dimensions) return;
  container.innerHTML = maturity.dimensions.map((dim) => `
    <div class="maturity-item">
      <div>
        <strong>${dim.name}</strong>
        <p style="margin: 4px 0 0; color: var(--muted); font-size: .8rem;">Score: ${dim.score}/100 (N4)</p>
      </div>
      <div class="maturity-bar">
        <div class="maturity-fill" style="width: ${dim.score}%;"></div>
      </div>
    </div>
  `).join('');
}

async function refresh() {
  const [overview, projects, graph, acep, maturity, lcr] = await Promise.all([
    api('/api/v2/overview'),
    api('/api/v2/projects'),
    api('/api/v2/graph'),
    api('/api/v2/acep/overview'),
    api('/api/v2/acep/maturity'),
    api('/api/v2/lcr/status'),
  ]);

  state.projects = projects.projects;
  state.graph = graph;
  state.acep = acep;
  state.maturity = maturity;
  state.lcr = lcr;

  renderMetrics(overview.metrics);
  renderProjects();
  renderGraph(graph);
  renderMaturity(maturity);
}

// Building Floor Modal Handlers
const buildingNames = {
  'ai-engine-core': 'AI Engine Core HQ (Prédio Central)',
  'zapai-crm': 'ZapAI CRM Tower (Prédio de Vendas & WhatsApp)',
  'ai-city': 'AI City Research Complex (Prédio de Agentes 3D)',
  'fortlev': 'Fortlev Digital Mall (Prédio Commerce Core)',
};

document.querySelectorAll('.building-interactive').forEach((card) => {
  card.addEventListener('click', () => {
    const buildingKey = card.dataset.building;
    const modal = document.querySelector('#building-modal');
    const title = document.querySelector('#modal-building-title');
    if (title) title.textContent = buildingNames[buildingKey] || buildingKey;
    modal.classList.add('active');
  });
});

document.querySelector('#btn-close-modal')?.addEventListener('click', () => {
  document.querySelector('#building-modal').classList.remove('active');
});

document.querySelector('#building-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'building-modal') e.target.classList.remove('active');
});

// Company Picker Handler
document.querySelector('#company-select')?.addEventListener('change', (e) => {
  state.company = e.target.value;
  const companyTitle = e.target.options[e.target.selectedIndex].text;
  document.querySelector('#active-company-title').textContent = companyTitle;
  notify(`Ilha alternada para: ${companyTitle}`);
});

document.querySelector('#btn-create-company')?.addEventListener('click', () => {
  const name = prompt('Digite o nome da nova empresa/ilha:');
  if (name) {
    const select = document.querySelector('#company-select');
    const opt = document.createElement('option');
    opt.value = name.toLowerCase().replace(/\s+/g, '-');
    opt.text = `🏢 ${name}`;
    select.appendChild(opt);
    select.value = opt.value;
    select.dispatchEvent(new Event('change'));
  }
});

// Search & Filter Listeners
document.querySelector('#search')?.addEventListener('input', renderProjects);
document.querySelector('#visibility')?.addEventListener('change', renderProjects);

// Project Actions Handler
document.querySelector('#projects')?.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const projectId = button.closest('.project-card').dataset.projectId;
  button.disabled = true;

  try {
    if (button.dataset.action === 'analyze') {
      await api(`/api/v2/projects/${projectId}/actions/analyze`, { method: 'POST', body: '{}' });
      notify('Análise registrada na memória progressiva.');
    } else if (button.dataset.action === 'simulate') {
      const res = await api('/api/v2/acep/simulate', {
        method: 'POST',
        body: JSON.stringify({ projectId, target: 'ProjectRoot', mutationType: 'full-scan' })
      });
      notify(`Simulação: ${res.simulatedMetrics.qualityTrend} (${res.simulatedMetrics.regressionRisk})`);
    } else {
      await api(`/api/v2/projects/${projectId}/deployments`, { method: 'POST', body: '{}' });
      notify('Publicação em Staging registrada com sucesso.');
    }
    await refresh();
  } catch (error) {
    notify(error.message);
  } finally {
    button.disabled = false;
  }
});

// Mission Form Handler
document.querySelector('#mission-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.querySelector('#mission-prompt');
  const resultBox = document.querySelector('#mission-result');
  const prompt = input.value.trim();

  if (!prompt) return;

  try {
    resultBox.innerHTML = '<span style="color: var(--muted)">Compilando blueprint com o Mission Compiler...</span>';
    const mission = await api('/api/v2/acep/compile', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });

    resultBox.innerHTML = `
      <p style="color: var(--accent); font-weight: bold;">✅ Blueprint de Missão Compilado com Sucesso!</p>
      <p>ID da Missão: ${mission.id}</p>
      <p>Genoma de Software: <strong>${mission.blueprint.domainGenome}</strong></p>
      <p>Arquitetura: ${mission.blueprint.architecture}</p>
      <p>Componentes Autogerados: ${mission.blueprint.componentsToGenerate.join(', ')}</p>
    `;
    input.value = '';
    notify('Blueprint de Missão compilado com sucesso!');
  } catch (err) {
    resultBox.innerHTML = `<span style="color: var(--danger)">Erro ao compilar missão: ${err.message}</span>`;
  }
});

// Simulation Handlers
document.querySelector('#btn-sim-refactor')?.addEventListener('click', async () => {
  const box = document.querySelector('#sim-result');
  box.innerHTML = 'Executando simulação de refatoração no Digital Twin...';
  const res = await api('/api/v2/acep/simulate', {
    method: 'POST',
    body: JSON.stringify({ target: 'frontend/components', mutationType: 'refactor-design-system' })
  });
  box.innerHTML = `
    <p style="color: var(--accent)">Simulação Concluída: <strong>${res.status}</strong></p>
    <p>Risco de Regressão: ${res.simulatedMetrics.regressionRisk}</p>
    <p>Tendência de Qualidade: ${res.simulatedMetrics.qualityTrend}</p>
    <p>Custo Projetado: ${res.simulatedMetrics.projectedTokenCost}</p>
    <p>Recomendação: ${res.recommendation}</p>
  `;
});

document.querySelector('#btn-sim-db')?.addEventListener('click', async () => {
  const box = document.querySelector('#sim-result');
  box.innerHTML = 'Executando simulação de migration de banco...';
  const res = await api('/api/v2/acep/simulate', {
    method: 'POST',
    body: JSON.stringify({ target: 'database/schema.sql', mutationType: 'add-rls-policies' })
  });
  box.innerHTML = `
    <p style="color: var(--accent-2)">Simulação DB Concluída: <strong>${res.status}</strong></p>
    <p>Compatibilidade: ${res.simulatedMetrics.compatibility}</p>
    <p>Risco de Regressão: ${res.simulatedMetrics.regressionRisk}</p>
    <p>Recomendação: ${res.recommendation}</p>
  `;
});

// Chat Terminal Form & Quick Prompts
async function sendChatMessage(messageText) {
  const chatWindow = document.querySelector('#chat-window');
  if (!chatWindow || !messageText) return;

  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'chat-msg user';
  userMsgDiv.innerHTML = `<strong>Você:</strong> ${messageText}`;
  chatWindow.appendChild(userMsgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const res = await api('/api/v2/lcr/chat', {
      method: 'POST',
      body: JSON.stringify({ message: messageText }),
    });

    const sysMsgDiv = document.createElement('div');
    sysMsgDiv.className = 'chat-msg system';
    sysMsgDiv.innerHTML = `<strong>FÊNIX Ω∞ Copiloto:</strong> ${res.response}`;
    chatWindow.appendChild(sysMsgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    notify(err.message);
  }
}

document.querySelector('#chat-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.querySelector('#chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  await sendChatMessage(msg);
});

document.querySelectorAll('.btn-quick').forEach((btn) => {
  btn.addEventListener('click', () => {
    const promptText = btn.dataset.prompt;
    if (promptText) sendChatMessage(promptText);
  });
});

// Initialize Tabs & App
initTabs();
refresh().catch((error) => notify(error.message));
