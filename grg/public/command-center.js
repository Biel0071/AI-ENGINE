(function () {
  'use strict';
  // Melhoria Segura Fenix 2.0

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));

  function empty(message) {
    return `<div class="empty-state"><span>${esc(message)}</span></div>`;
  }

  function rows(items, render) {
    return Array.isArray(items) && items.length ? items.slice(0, 8).map(render).join('') : '';
  }

  function renderPanels() {
    const state = window.state || {};
    const data = state.data || {};
    const health = data.health || {};
    const agents = data.agents?.agents || data.swarm?.agents || [];
    const projects = state.projects || data.projects?.projects || [];
    const events = state.events || data.events?.events || [];
    const connectors = data.connectors?.connectors || data.connections?.connections || [];
    const memories = data.overview?.metrics?.memories;

    const panels = {
      cmdAgentsContainer: rows(Array.isArray(agents) ? agents : Object.values(agents), (agent) =>
        `<div class="runtime-row"><b>${esc(agent.name || agent.id || agent.role)}</b><span>${esc(agent.status || agent.state || 'UNKNOWN')}</span></div>`,
      ) || empty('Nenhum agente ativo medido.'),
      cmdRuntimeContainer: health.checks
        ? rows(Object.entries(health.checks).map(([id, check]) => ({ id, ...check })), (check) =>
          `<div class="runtime-row"><b>${esc(check.id)}</b><span>${check.ok === false ? 'DEGRADED' : 'READY'}</span></div>`,
        )
        : empty('Health ainda não publicado.'),
      cmdProjectsContainer: rows(projects, (project) =>
        `<div class="runtime-row"><b>${esc(project.name || project.id)}</b><span>${esc(project.status || project.analysisStatus || 'UNKNOWN')}</span></div>`,
      ) || empty('Nenhum projeto publicado.'),
      cmdMemoryContainer: memories == null
        ? empty('Métricas de memória indisponíveis.')
        : `<div class="runtime-summary"><small>MEMÓRIAS</small><b>${esc(memories)}</b></div>`,
      cmdKnowledgeContainer: empty(data.graph ? 'Grafo carregado; abra Knowledge para explorar.' : 'Grafo não publicado.'),
      cmdObservabilityContainer: rows(events, (event) =>
        `<div class="runtime-row"><b>${esc(event.type || event.name || 'event')}</b><span>${esc(event.status || event.recordedAt || '')}</span></div>`,
      ) || empty('Nenhum evento medido.'),
      cmdMcpContainer: rows(connectors, (connector) =>
        `<div class="runtime-row"><b>${esc(connector.name || connector.id)}</b><span>${esc(connector.status || 'UNKNOWN')}</span></div>`,
      ) || empty('Nenhum conector publicado.'),
      cmdQaContainer: empty(data.frontendReality ? 'Evidência disponível em Browser QA.' : 'Nenhuma execução visual publicada.'),
    };

    for (const [id, html] of Object.entries(panels)) {
      const element = document.getElementById(id);
      if (element) element.innerHTML = html;
    }
  }

  window.addEventListener('DOMContentLoaded', renderPanels);
  window.addEventListener('fenix:data', renderPanels);
})();
