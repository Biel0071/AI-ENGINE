// task-creator.js — Real Task & Mission Creator Engine for FÊNIX OS
// Completely functional without mocks, connected directly to the FÊNIX Kernel APIs

window.TasksState = {
  activeMissions: [],
  activeJobs: [],
  loading: false
};

// Initialize & Refresh
window.refreshTasksList = async function() {
  const container = document.getElementById('taskList');
  const countBadge = document.getElementById('activeTaskCount');
  if (!container) return;

  try {
    // 1. Fetch real missions
    const missionsRes = await window.FENIX.api('/missions').catch(() => ({ missions: [] }));
    const missions = missionsRes.missions || [];

    // 2. Fetch real runtime jobs
    const jobsRes = await window.FENIX.api('/runtime/jobs').catch(() => []);
    const jobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes.jobs || []);

    window.TasksState.activeMissions = missions;
    window.TasksState.activeJobs = jobs;

    const totalCount = missions.length + jobs.length;
    if (countBadge) countBadge.innerText = totalCount;

    if (totalCount === 0) {
      container.innerHTML = `
        <div style="padding:24px 12px; text-align:center; color:var(--text-muted); font-size:0.8rem;">
          <i class="ph ph-check-circle" style="font-size:24px; opacity:0.5; margin-bottom:6px; display:block;"></i>
          Nenhuma tarefa ativa no momento.<br>Crie uma missão ou job acima!
        </div>
      `;
      return;
    }

    let html = '';

    // Render Missions
    missions.forEach(m => {
      const statusClass = `task-status-${m.status || 'PENDING'}`;
      html += `
        <div class="task-item" id="task-m-${m.id}">
          <div class="task-item-header">
            <span style="font-size:10px; color:var(--accent); font-weight:700;">[MISSÃO]</span>
            <span class="task-item-title" title="${window.esc(m.title || m.objective || m.id)}">${window.esc(m.title || m.objective || m.id)}</span>
            <span class="task-item-status ${statusClass}">${window.esc(m.status || 'PENDING')}</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted); line-height:1.3;">${window.esc(m.objective || 'Sem descrição')}</div>
          <div class="task-item-controls">
            <button class="task-ctrl-btn" onclick="window.startMission('${m.id}')" title="Iniciar Missão"><i class="ph ph-play"></i> Iniciar</button>
            <button class="task-ctrl-btn" onclick="window.pauseMission('${m.id}')" title="Pausar Missão"><i class="ph ph-pause"></i> Pausar</button>
            <button class="task-ctrl-btn danger" onclick="window.cancelMission('${m.id}')" title="Cancelar Missão"><i class="ph ph-x"></i> Cancelar</button>
          </div>
        </div>
      `;
    });

    // Render Jobs
    jobs.forEach(j => {
      const statusClass = `task-status-${j.status || 'PENDING'}`;
      html += `
        <div class="task-item" id="task-j-${j.id}">
          <div class="task-item-header">
            <span style="font-size:10px; color:var(--green); font-weight:700;">[JOB]</span>
            <span class="task-item-title" title="${window.esc(j.title || j.id)}">${window.esc(j.title || j.id)}</span>
            <span class="task-item-status ${statusClass}">${window.esc(j.status || 'PENDING')}</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted); line-height:1.3;">Tipo: ${window.esc(j.type || 'EXECUTION')} | Worker: ${window.esc(j.workerId || 'auto')}</div>
          <div class="task-item-controls">
            <button class="task-ctrl-btn danger" onclick="window.cancelJob('${j.id}')" title="Cancelar Job"><i class="ph ph-x"></i> Parar</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<div style="color:var(--rose); padding:8px; font-size:11px;">Erro ao listar tarefas: ${err.message}</div>`;
  }
};

// 1. Submit Real Mission
window.submitMission = async function() {
  const title = document.getElementById('taskTitleInput')?.value.trim();
  const objective = document.getElementById('taskObjectiveInput')?.value.trim();
  const projectId = document.getElementById('taskProjectInput')?.value.trim() || 'fenix_main';
  const riskLevel = document.getElementById('taskRiskSelect')?.value || 'SAFE';

  if (!title && !objective) {
    if (window.showToast) window.showToast('Preencha ao menos o título ou objetivo da missão!', 'error');
    return;
  }

  const btn = document.getElementById('submitMissionBtn');
  if (btn) btn.innerHTML = '<span class="spinner"></span> Criando...';

  try {
    const res = await window.FENIX.api('/missions', {
      method: 'POST',
      body: JSON.stringify({
        title: title || objective.slice(0, 40),
        objective: objective || title,
        steps: [
          { key: 'discover_network', type: 'discover', payload: { objective: objective || title, projectId } },
          { key: 'analyze_cognitive', type: 'analyze', dependsOn: ['discover_network'], payload: { objective: objective || title, projectId } }
        ]
      })
    });

    if (window.showToast) window.showToast(`Missão "${title || objective}" criada com sucesso!`, 'success');
    
    // Clear form
    if (document.getElementById('taskTitleInput')) document.getElementById('taskTitleInput').value = '';
    if (document.getElementById('taskObjectiveInput')) document.getElementById('taskObjectiveInput').value = '';

    await window.refreshTasksList();
    return res;
  } catch (e) {
    console.error('submitMission error:', e);
    if (window.showToast) window.showToast(`Erro ao criar missão: ${e.message}`, 'error');
  } finally {
    if (btn) btn.innerHTML = '<i class="ph-fill ph-rocket-launch"></i> Criar Missão';
  }
};

// 2. Submit Real Job
window.submitJob = async function() {
  const title = document.getElementById('taskTitleInput')?.value.trim();
  const objective = document.getElementById('taskObjectiveInput')?.value.trim();
  const projectId = document.getElementById('taskProjectInput')?.value.trim() || 'fenix_main';
  const riskLevel = document.getElementById('taskRiskSelect')?.value || 'SAFE';

  if (!title && !objective) {
    if (window.showToast) window.showToast('Preencha o título ou objetivo do Job!', 'error');
    return;
  }

  const btn = document.getElementById('submitJobBtn');
  if (btn) btn.innerHTML = '<span class="spinner"></span> Iniciando...';

  try {
    const res = await window.FENIX.api('/runtime/jobs', {
      method: 'POST',
      body: JSON.stringify({
        type: 'discovery.scan',
        title: title || objective.slice(0, 40),
        payload: {
          objective: objective || title,
          projectId,
          riskLevel,
          targetFiles: window.FenixState?.activeFile ? [window.FenixState.activeFile] : []
        }
      })
    });

    if (window.showToast) window.showToast(`Job iniciado com sucesso!`, 'success');

    // Clear form
    if (document.getElementById('taskTitleInput')) document.getElementById('taskTitleInput').value = '';
    if (document.getElementById('taskObjectiveInput')) document.getElementById('taskObjectiveInput').value = '';

    await window.refreshTasksList();
    if (window.refreshJobs) window.refreshJobs();
    return res;
  } catch (e) {
    if (window.showToast) window.showToast(`Erro ao disparar job: ${e.message}`, 'error');
  } finally {
    if (btn) btn.innerHTML = '<i class="ph-fill ph-play"></i> Rodar Job Real';
  }
};

// 3. Control Mission Actions
window.startMission = async function(id) {
  try {
    await window.FENIX.api(`/missions/${id}/start`, { method: 'POST' });
    if (window.showToast) window.showToast(`Missão ${id} iniciada!`, 'success');
    window.refreshTasksList();
  } catch (e) {
    if (window.showToast) window.showToast(`Erro: ${e.message}`, 'error');
  }
};

window.pauseMission = async function(id) {
  try {
    await window.FENIX.api(`/missions/${id}/pause`, { method: 'POST' });
    if (window.showToast) window.showToast(`Missão ${id} pausada!`, 'info');
    window.refreshTasksList();
  } catch (e) {
    if (window.showToast) window.showToast(`Erro: ${e.message}`, 'error');
  }
};

window.cancelMission = async function(id) {
  if (!confirm('Deseja realmente cancelar esta missão?')) return;
  try {
    await window.FENIX.api(`/missions/${id}/cancel`, { method: 'POST' });
    if (window.showToast) window.showToast(`Missão cancelada!`, 'info');
    window.refreshTasksList();
  } catch (e) {
    if (window.showToast) window.showToast(`Erro: ${e.message}`, 'error');
  }
};

window.cancelJob = async function(id) {
  try {
    await window.FENIX.api(`/runtime/jobs/${id}/cancel`, { method: 'POST' });
    if (window.showToast) window.showToast(`Job cancelado!`, 'info');
    window.refreshTasksList();
    if (window.refreshJobs) window.refreshJobs();
  } catch (e) {
    if (window.showToast) window.showToast(`Erro: ${e.message}`, 'error');
  }
};

// Hook up event listeners
function bindTaskCreatorEvents() {
  document.getElementById('submitMissionBtn')?.addEventListener('click', window.submitMission);
  document.getElementById('submitJobBtn')?.addEventListener('click', window.submitJob);
  document.getElementById('refreshTasksBtn')?.addEventListener('click', window.refreshTasksList);
  
  // Quick Create Task in Top Bar
  document.getElementById('quickCreateTaskBtn')?.addEventListener('click', () => {
    document.querySelector('.nav-item[data-panel="tasks"]')?.click();
    document.getElementById('taskTitleInput')?.focus();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindTaskCreatorEvents);
} else {
  bindTaskCreatorEvents();
}
