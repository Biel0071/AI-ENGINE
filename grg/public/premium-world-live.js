(() => {
  const view = document.getElementById('view-city');
  const area = view?.querySelector('.fenix-city-canvas-area');
  if (!area || window.FENIX?.cityWorld) return;

  window.FENIX = window.FENIX || {};
  const world = { snapshot: null, measuredAt: null, error: null, loading: false, refresh };
  window.FENIX.cityWorld = world;
  const shell = document.createElement('section');
  shell.className = 'fenix-world-layer';
  shell.setAttribute('aria-label', 'Mundo Fênix em tempo real');
  shell.innerHTML = '<div class="fwl-heading"><span class="fwl-kicker">MUNDO OPERACIONAL · DADOS REAIS</span><h1>Um sistema vivo.</h1><p>Projetos, agentes e execuções aparecem conforme o Fênix constrói.</p><div class="fwl-connection" role="status">Conectando ao mundo…</div></div><div class="fwl-dock"><div class="fwl-dock-head"><strong>Territórios ativos</strong><button type="button" class="fwl-refresh">Atualizar ↻</button></div><div class="fwl-projects"></div><div class="fwl-agents"></div></div>';
  area.append(shell);
  const status = shell.querySelector('.fwl-connection');
  const projects = shell.querySelector('.fwl-projects');
  const agents = shell.querySelector('.fwl-agents');
  shell.querySelector('.fwl-refresh').addEventListener('click', () => refresh(true));

  function node(tag, className, value) {
    const element = document.createElement(tag);
    element.className = className;
    if (value != null) element.textContent = String(value);
    return element;
  }

  function render() {
    const data = world.snapshot;
    const districtCount = document.getElementById('cityDistrictCount');
    if (districtCount) districtCount.textContent = window.fenixCity?.DISTRICTS ? `${Object.keys(window.fenixCity.DISTRICTS).length} DISTRITOS` : '— DISTRITOS';
    const liveStatus = window.FENIX?.live?.status;
    const time = world.measuredAt ? new Date(world.measuredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
    status.dataset.state = world.error ? 'error' : liveStatus === 'ONLINE' ? 'online' : data ? 'snapshot' : 'loading';
    status.textContent = world.error
      ? `Dados de ${time || '—'} · atualização indisponível`
      : data ? `${liveStatus === 'ONLINE' ? '● Ao vivo' : '◌ Estado medido'} · ${time} · ${data.metrics?.registeredAgents ?? '—'} agentes · ${data.metrics?.runningJobs ?? '—'} jobs em execução`
        : 'Conectando ao mundo…';
    projects.replaceChildren();
    agents.replaceChildren();
    if (!data) {
      projects.append(node('p', 'fwl-empty', world.error ? 'Não foi possível carregar os projetos. Tente atualizar.' : 'Carregando territórios…'));
      return;
    }
    const list = Array.isArray(data.projects) ? data.projects : [];
    if (!list.length) projects.append(node('p', 'fwl-empty', 'Nenhum projeto registrado no Project Kernel.'));
    for (const project of list.slice(0, 6)) {
      const related = (data.recentJobs || []).filter(job => job.projectId === project.id);
      const running = related.filter(job => String(job.status).toUpperCase() === 'RUNNING').length;
      const button = node('button', 'fwl-project');
      button.type = 'button';
      button.append(node('span', 'fwl-project-mark', (project.name || project.id || '?').slice(0, 1).toUpperCase()));
      const copy = node('span', 'fwl-project-copy');
      copy.append(node('strong', '', project.name || project.id), node('small', '', running ? `${running} execução${running > 1 ? 'ões' : ''} ativa${running > 1 ? 's' : ''}` : project.workspace ? 'Workspace conectado' : 'Workspace indisponível'));
      button.append(copy, node('span', 'fwl-arrow', '↗'));
      button.addEventListener('click', () => {
        if (typeof window.openProjectWorkspace === 'function') window.openProjectWorkspace(project.id);
        else window.showView?.('projects');
      });
      projects.append(button);
    }
    const crew = Array.isArray(data.agents) ? data.agents : [];
    const label = node('div', 'fwl-crew-label', `AGENTES NO MUNDO · ${crew.length}`);
    agents.append(label);
    if (!crew.length) agents.append(node('p', 'fwl-empty', 'Nenhum agente registrado nesta leitura.'));
    for (const agent of crew.slice(0, 7)) {
      const button = node('button', 'fwl-agent');
      button.type = 'button';
      const state = String(agent.status || 'UNKNOWN').toUpperCase();
      button.dataset.state = state;
      button.append(node('span', 'fwl-agent-avatar', (agent.name || agent.id || '?').slice(0, 1).toUpperCase()), node('strong', '', agent.name || agent.id), node('small', '', state === 'WORKING' ? 'Em execução' : state === 'AVAILABLE' ? 'Disponível' : state));
      button.addEventListener('click', () => {
        if (typeof window.fenixInspectAgent === 'function') window.fenixInspectAgent(agent.id);
        else window.openAgentInspector?.(agent.id);
      });
      agents.append(button);
    }
    if (crew.length > 7) {
      const more = node('button', 'fwl-agent-more', `+${crew.length - 7} agentes ↗`);
      more.addEventListener('click', () => window.showView?.('agents'));
      agents.append(more);
    }
  }

  async function refresh(force = false) {
    if (world.loading || (!force && document.visibilityState !== 'visible')) return world.snapshot;
    if (!force && world.measuredAt && Date.now() - new Date(world.measuredAt).getTime() < 15000) return world.snapshot;
    world.loading = true;
    try {
      const response = await fetch('/api/v2/living-city/state', { credentials: 'same-origin', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.projects) || !Array.isArray(data.agents)) throw new Error('Resposta incompleta');
      world.snapshot = data;
      world.measuredAt = data.measuredAt || new Date().toISOString();
      world.error = null;
      window.dispatchEvent(new CustomEvent('fenix:city-world', { detail: data }));
    } catch (error) {
      world.error = error.message || 'Falha de comunicação';
    } finally {
      world.loading = false;
      render();
    }
    return world.snapshot;
  }

  render();
  refresh();
  window.addEventListener('fenix:viewchanged', event => { if (event.detail?.viewId === 'city') refresh(true); });
  document.addEventListener('fenix-live', event => {
    if (event.detail?.type === 'status') render();
    else if (event.detail?.type && /^(agent|job|mission|runtime\.job|project)\./.test(event.detail.type)) scheduleRefresh();
  });
  let refreshTimer;
  function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => refresh(), 2000); }
  setInterval(() => { if (view.classList.contains('active')) refresh(); }, 60000);
})();
