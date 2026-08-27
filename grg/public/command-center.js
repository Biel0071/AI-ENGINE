(function () {
  'use strict';
  // Melhoria Segura Fenix 2.0

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));

  function empty(message) {
    return `<div class="empty-state-mini"><span>${esc(message)}</span></div>`;
  }

  function rows(items, render) {
    return Array.isArray(items) && items.length ? items.slice(0, 8).map(render).join('') : '';
  }

  function statusClass(status) {
    const value = String(status || '').toUpperCase();
    if (['READY', 'OK', 'ONLINE', 'CONNECTED', 'COMPLETED', 'HEALTHY', 'SAVED'].includes(value)) return 'ok';
    if (['DEGRADED', 'WARN', 'WARNING', 'TESTING', 'QUEUED', 'RUNNING', 'ACTIVE'].includes(value)) return 'warn';
    if (['FAILED', 'ERROR', 'OFFLINE', 'DISCONNECTED'].includes(value)) return 'bad';
    return 'muted';
  }

  function statusBadge(status) {
    const value = String(status || 'UNKNOWN').toUpperCase();
    return `<span class="runtime-status ${statusClass(value)}">${esc(value)}</span>`;
  }

  function runtimeRow(label, value, status) {
    return `<div class="runtime-row"><b>${esc(label)}</b><span>${esc(value || '')}</span>${statusBadge(status || value)}</div>`;
  }

  function currentMission(missions, jobs) {
    const mission = (missions || []).find((item) => !['COMPLETED', 'DONE', 'FAILED'].includes(String(item.status || '').toUpperCase())) || (missions || [])[0];
    const job = (jobs || []).find((item) => !['COMPLETED', 'DONE', 'FAILED'].includes(String(item.status || '').toUpperCase())) || (jobs || [])[0];
    if (!mission && !job) return empty('Nenhuma missão atual publicada pelo runtime.');
    const title = mission?.objective || mission?.name || job?.objective || job?.name || 'Missão em execução';
    const status = mission?.status || job?.status || 'ACTIVE';
    const id = mission?.id || job?.id || '--';
    return `<div class="mission-card">
      <div class="mission-title"><b>${esc(title)}</b>${statusBadge(status)}</div>
      <small>ID ${esc(id)}</small>
      <div class="mission-track">
        ${['PLANNING', 'AGENTS', 'CODING', 'TESTING', 'QA', 'COMPLETED'].map((step, index) =>
          `<span class="${index < 2 ? 'done' : statusClass(status)}">${esc(step)}</span>`).join('')}
      </div>
    </div>`;
  }

  function jobBoard(jobs, projects) {
    const realJobs = Array.isArray(jobs) ? jobs.slice(0, 6) : [];
    if (!realJobs.length) {
      return rows(projects, (project) =>
        runtimeRow(project.name || project.id, project.analysisStatus || project.status || 'UNKNOWN', project.status || project.analysisStatus || 'UNKNOWN'),
      ) || empty('Nenhum job ou projeto publicado.');
    }
    return `<div class="job-board-mini">${realJobs.map((job) => {
      const status = job.status || job.state || 'UNKNOWN';
      return `<article class="job-card-mini ${statusClass(status)}">
        <strong>${esc(job.id || job.name || 'job')}</strong>
        <span>${esc(job.objective || job.summary || job.name || 'sem descrição publicada')}</span>
        ${statusBadge(status)}
      </article>`;
    }).join('')}</div>`;
  }

  function providerRows(data, health) {
    const fromHealth = Object.entries(health.checks?.['ai-providers']?.providers || {}).map(([name, provider]) => ({
      name,
      ok: provider.ok,
      status: provider.ok ? 'ONLINE' : 'OFFLINE',
      detail: provider.circuit?.state || '',
    }));
    const fromApi = data.providers?.providers || data.connection?.providers || [];
    const normalized = Array.isArray(fromApi) && fromApi.length
      ? fromApi.map((provider) => ({
        name: provider.name || provider.id || provider.provider || 'provider',
        status: provider.status || (provider.ok ? 'ONLINE' : 'UNKNOWN'),
        detail: provider.model || provider.latencyMs || provider.reason || '',
      }))
      : fromHealth;
    return rows(normalized, (provider) =>
      runtimeRow(provider.name, provider.detail, provider.status),
    ) || empty('Nenhum provider publicado.');
  }

  function renderPanels() {
    const state = window.state || {};
    const data = state.data || {};
    const health = data.health || {};
    const agents = data.agents?.agents || data.swarm?.agents || [];
    const projects = state.projects || data.projects?.projects || [];
    const missions = state.missions || data.missions?.missions || [];
    const jobs = state.jobs || data.jobs?.jobs || [];
    const events = state.events || data.events?.events || [];
    const connectors = data.connectors?.connectors || data.connections?.connections || [];
    const memories = data.overview?.metrics?.memories;

    const panels = {
      cmdAgentsContainer: rows(Array.isArray(agents) ? agents : Object.values(agents), (agent) =>
        runtimeRow(agent.name || agent.id || agent.role, agent.role || agent.district || agent.location || '', agent.status || agent.state || 'UNKNOWN'),
      ) || currentMission(missions, jobs),
      cmdRuntimeContainer: health.checks
        ? rows(Object.entries(health.checks).map(([id, check]) => ({ id, ...check })), (check) =>
          runtimeRow(check.id, check.adapter || check.degraded || check.status || '', check.ok === false ? 'DEGRADED' : 'READY'),
        )
        : empty('Health ainda não publicado.'),
      cmdProjectsContainer: jobBoard(jobs, projects),
      cmdMemoryContainer: memories == null
        ? empty('Métricas de memória indisponíveis.')
        : `<div class="runtime-summary"><small>MEMÓRIAS</small><b>${esc(memories)}</b></div>`,
      cmdKnowledgeContainer: data.graph
        ? `<div class="runtime-summary"><small>GRAFO</small><b>${esc(data.overview?.metrics?.graphEdges ?? '--')}</b><span>edges medidos</span></div>`
        : empty('Grafo não publicado.'),
      cmdObservabilityContainer: rows(events, (event) =>
        runtimeRow(event.type || event.name || 'event', event.summary || event.message || event.recordedAt || event.id || '', event.status || 'EVENT'),
      ) || empty('Nenhum evento medido.'),
      cmdMcpContainer: providerRows(data, health) || rows(connectors, (connector) =>
        runtimeRow(connector.name || connector.id, connector.kind || connector.url || '', connector.status || 'UNKNOWN'),
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
