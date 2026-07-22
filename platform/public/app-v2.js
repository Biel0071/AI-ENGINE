const TENANT_ID = 'biel0071-software-house';
const USER_ID = 'biel0071';
const state = { projects: [], graph: null };

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

function renderMetrics(metrics) {
  const labels = {
    projects: 'Projetos conectados',
    publicRepositories: 'Repositórios públicos',
    privateRepositories: 'Repositórios privados',
    analysesQueued: 'Análises na fila',
    deploymentsConfigured: 'Publicações preparadas',
    memoryEvents: 'Memórias progressivas',
  };
  document.querySelector('#metrics').innerHTML = Object.entries(labels)
    .map(([key, label]) => `<div class="metric"><strong>${metrics[key]}</strong><span>${label}</span></div>`)
    .join('');
}

function renderProjects() {
  const query = document.querySelector('#search').value.trim().toLowerCase();
  const visibility = document.querySelector('#visibility').value;
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
  document.querySelector('#graph-summary').textContent = `${graph.nodes.length} nós, ${graph.edges.length} relações, ${projects} projetos e ${memories} memórias comprovadas.`;
  document.querySelector('#capabilities').innerHTML = capabilities.map((node) => `<span class="capability">${node.label}</span>`).join('');
}

async function refresh() {
  const [overview, projects, graph] = await Promise.all([
    api('/api/v2/overview'), api('/api/v2/projects'), api('/api/v2/graph'),
  ]);
  state.projects = projects.projects;
  state.graph = graph;
  renderMetrics(overview.metrics);
  renderProjects();
  renderGraph(graph);
}

document.querySelector('#search').addEventListener('input', renderProjects);
document.querySelector('#visibility').addEventListener('change', renderProjects);
document.querySelector('#projects').addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const projectId = button.closest('.project-card').dataset.projectId;
  button.disabled = true;
  try {
    if (button.dataset.action === 'analyze') {
      await api(`/api/v2/projects/${projectId}/actions/analyze`, { method: 'POST', body: '{}' });
      notify('Análise registrada na memória progressiva.');
    } else {
      await api(`/api/v2/projects/${projectId}/deployments`, { method: 'POST', body: '{}' });
      notify('Publicação registrada; falta configurar um provedor.');
    }
    await refresh();
  } catch (error) {
    notify(error.message);
  } finally {
    button.disabled = false;
  }
});

refresh().catch((error) => notify(error.message));
