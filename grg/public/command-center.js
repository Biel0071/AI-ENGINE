(function () {
  'use strict';

  // FÊNIX OS — COMMAND CENTER CANONICAL ORCHESTRATOR
  // Conectado ao runtime real: MissionKernel, JobEngine, AgentRegistry, AI City, Project Mirror e ChatAgent.

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));

  let selectedAgentId = 'Orchestrator';
  let selectedMissionId = null;
  let activeProjectId = 'ai-engine-core';
  let pendingProposal = null;
  let currentConversationId = null;
  let apiBackoffUntil = 0;
  let apiPlatformBackoffUntil = 0;

  // Helper para obter token autenticado de todas as fontes canônicas
  function getAuthToken() {
    return localStorage.getItem('fenix_token') ||
           localStorage.getItem('grg_token') ||
           sessionStorage.getItem('fenix_token') ||
           sessionStorage.getItem('grg_refresh_token') ||
           (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] ||
           window.__FENIX_TOKEN__ || null;
  }

  async function refreshRegisteredSkills() {
    const listEl = document.getElementById('orchActiveSkillsList');
    if (!listEl) return;
    const result = await apiCall('/api/skills');
    const skills = Array.isArray(result) ? result : (result?.skills || result?.items || []);
    const badge = document.getElementById('skillsCountBadge');
    if (badge) badge.textContent = skills.length ? `${skills.length} SKILLS` : '—';
    if (!skills.length) {
      listEl.innerHTML = '<div style="font-size:8.5px;color:var(--fenix-text-dim);padding:8px;">Skills não publicadas pelo runtime.</div>';
      return;
    }
    listEl.innerHTML = skills.slice(0, 7).map((skill) => {
      const name = skill.name || skill.id || 'Skill sem nome publicado';
      const level = skill.level ?? skill.version ?? null;
      return `<div class="orch-skill-row" data-skill-id="${esc(skill.id || name)}"><span class="orch-skill-name">${esc(name)}</span><span class="orch-skill-lv">${esc(level == null ? '—' : `Lv.${level}`)}</span></div>`;
    }).join('');
  }

  // Helper para chamadas autenticadas à API canônica
  async function apiCall(path, method = 'GET', data = null, retried = false) {
    if (Date.now() < apiBackoffUntil) return null;
    const token = retried ? null : getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
      const res = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers,
        body: data ? JSON.stringify(data) : undefined
      });
      if (res.status === 401) {
        // A stale bearer token can survive a server restart while the
        // HttpOnly session cookie remains valid. Retry once without the stale
        // header so the canonical cookie session can recover the shell.
        if (!retried && token) return apiCall(path, method, data, true);
        console.warn('Sessão expirada ou não autenticada para ' + path);
      }
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') || 5);
        apiBackoffUntil = Date.now() + Math.min(Math.max(retryAfter, 1), 60) * 1000;
      }
      return await res.json();
    } catch (err) {
      console.warn('Falha na requisição ' + path + ':', err.message);
      return null;
    }
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00';
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function getAgentEmoji(role) {
    const r = String(role || '').toLowerCase();
    if (r.includes('orchestrator') || r.includes('master')) return '🤖';
    if (r.includes('frontend') || r.includes('visual')) return '🎨';
    if (r.includes('backend') || r.includes('developer') || r.includes('core')) return '⚙️';
    if (r.includes('testing') || r.includes('qa')) return '🧪';
    if (r.includes('deploy') || r.includes('devops')) return '🚀';
    if (r.includes('security')) return '🛡️';
    if (r.includes('data')) return '💾';
    if (r.includes('browser')) return '🌐';
    return '⚡';
  }

  // ==========================================
  // MODAL OVERLAY MANAGER
  // ==========================================
  function openModal(titleHtml, bodyHtml, footerHtml = '') {
    const container = document.getElementById('orchModalContainer');
    if (!container) return;
    container.innerHTML = `
      <div class="orch-modal-backdrop" id="orchModalBackdrop">
        <div class="orch-modal">
          <div class="orch-modal-header">
            <div class="orch-modal-title">${titleHtml}</div>
            <button class="orch-modal-close" id="orchModalCloseBtn">&times;</button>
          </div>
          <div class="orch-modal-body">
            ${bodyHtml}
          </div>
          ${footerHtml ? `<div class="orch-modal-footer">${footerHtml}</div>` : ''}
        </div>
      </div>
    `;
    container.style.display = 'block';

    document.getElementById('orchModalCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('orchModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'orchModalBackdrop') closeModal();
    });
  }

  function closeModal() {
    const container = document.getElementById('orchModalContainer');
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
  }

  // Modal de Detalhes da Missão
  function openMissionDetailModal(missionId) {
    const live = window.FENIX?.live || {};
    const missions = live.missions || [];
    const jobs = live.jobs || [];
    const mission = missions.find(m => m.id === missionId) || missions[0] || {
      id: missionId || 'MISSÃO-PADRÃO',
      name: 'Evolução Command Center',
      status: 'RUNNING',
      progress: 75,
      objective: 'Refatoração contínua com validação E2E.'
    };

    const missionJobs = jobs.filter(j => j.missionId === mission.id);
    const title = `<i class="ph-fill ph-flag-checkered" style="color:var(--fenix-red);"></i> MISSION DETAIL: ${esc(mission.name || mission.displayName || mission.id)}`;
    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Informações Gerais</div>
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">ID da Missão</div>
            <div class="orch-modal-data-val">${esc(mission.id)}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Status Atual</div>
            <div class="orch-modal-data-val" style="color:var(--fenix-green);">${esc(mission.status)}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Progresso</div>
            <div class="orch-modal-data-val">${mission.progress ?? 0}%</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Jobs Vinculados</div>
            <div class="orch-modal-data-val">${missionJobs.length} Jobs Registrados</div>
          </div>
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Objetivo da Missão</div>
        <div class="orch-modal-data-item">
          <div style="font-size:11px; color:#fff;">${esc(mission.objective || mission.description || 'Execução governada.')}</div>
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Jobs no DAG de Execução</div>
        <div style="max-height:180px; overflow-y:auto; border:1px solid var(--fenix-border); border-radius:6px; padding:6px; background:rgba(0,0,0,0.3);">
          ${missionJobs.length ? missionJobs.map(j => `
            <div style="display:flex; justify-content:space-between; padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.05); font-family:var(--fenix-font-mono); font-size:9.5px;">
              <span>${esc(j.id)} · ${esc(j.type || j.name)}</span>
              <span class="orch-status-pill ${j.status === 'COMPLETED' ? 'done' : (j.status === 'FAILED' ? 'fail' : 'exec')}">${esc(j.status)}</span>
            </div>
          `).join('') : '<div style="font-size:10px; color:var(--fenix-text-dim); padding:6px;">Nenhum subjob registrado ainda para esta missão.</div>'}
        </div>
      </div>
    `;

    const footer = `
      <button class="orch-inspect-btn" id="modalBtnPauseMission" style="color:var(--fenix-amber);"><i class="ph-fill ph-pause"></i> PAUSAR</button>
      <button class="orch-inspect-btn" id="modalBtnCancelMission" style="color:var(--fenix-red);"><i class="ph-fill ph-x-circle"></i> CANCELAR</button>
      <button class="orch-inspect-btn" id="modalBtnClose">FECHAR</button>
    `;

    openModal(title, body, footer);
    document.getElementById('modalBtnClose')?.addEventListener('click', closeModal);
    document.getElementById('modalBtnPauseMission')?.addEventListener('click', async () => {
      await apiCall(`/api/fenix/missions/${mission.id}/pause`, 'POST');
      closeModal();
      renderPanels();
    });
    document.getElementById('modalBtnCancelMission')?.addEventListener('click', async () => {
      if (confirm('Cancelar a missão agora?')) {
        await apiCall(`/api/fenix/missions/${mission.id}/cancel`, 'POST');
        closeModal();
        renderPanels();
      }
    });
  }

  // Modal de Detalhes do Job
  function openJobDetailModal(jobId) {
    const live = window.FENIX?.live || {};
    const jobs = live.jobs || [];
    const job = jobs.find(j => j.id === jobId) || jobs[0];
    if (!job) {
      openModal('JOB DETAIL', '<div class="orch-modal-section">Nenhum job publicado pelo runtime.</div>', '<button class="orch-inspect-btn" id="modalJobBtnClose">FECHAR</button>');
      document.getElementById('modalJobBtnClose')?.addEventListener('click', closeModal);
      return;
    }

    const title = `<i class="ph-fill ph-gear" style="color:var(--fenix-cyan);"></i> JOB DETAIL: ${esc(job.id)}`;
    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Dados Operacionais</div>
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Job ID</div>
            <div class="orch-modal-data-val">${esc(job.id)}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Tipo / Executor</div>
            <div class="orch-modal-data-val">${esc(job.type || job.jobType || 'task')}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Agente Atribuído</div>
            <div class="orch-modal-data-val">${esc(job.agentId || job.agent?.name || 'Testing')}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Status</div>
            <div class="orch-modal-data-val" style="color:var(--fenix-green);">${esc(job.status)}</div>
          </div>
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Prompt / Instrução</div>
        <div class="orch-modal-data-item">
          <div style="font-size:11px; color:#fff;">${esc(job.prompt || job.title || 'Execução de tarefa no workspace.')}</div>
        </div>
      </div>
      ${job.error ? `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title" style="color:var(--fenix-red);">Erro Reportado</div>
        <div class="orch-modal-data-item" style="border-color:var(--fenix-red);">
          <div style="color:var(--fenix-red); font-family:var(--fenix-font-mono); font-size:10px;">${esc(job.error)}</div>
        </div>
      </div>
      ` : ''}
    `;

    const footer = `
      <button class="orch-inspect-btn" id="modalJobBtnClose">FECHAR</button>
    `;

    openModal(title, body, footer);
    document.getElementById('modalJobBtnClose')?.addEventListener('click', closeModal);
  }

  function openHandoffInspector(event) {
    const payload = event?.payload || {};
    const value = (key, fallback = 'Não publicado') => esc(payload[key] || event?.[key] || fallback);
    const body = `<div class="orch-modal-section"><div class="orch-modal-section-title">Transferência operacional</div><div class="orch-modal-grid">
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">FROM</div><div class="orch-modal-data-val">${value('fromAgentId', payload.from || payload.sourceAgentId)}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TO</div><div class="orch-modal-data-val">${value('toAgentId', payload.to || payload.targetAgentId)}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MISSION</div><div class="orch-modal-data-val">${value('missionId')}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">JOB</div><div class="orch-modal-data-val">${value('jobId')}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">STATUS</div><div class="orch-modal-data-val">${value('status', 'EVENTO RECEBIDO')}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TIMESTAMP</div><div class="orch-modal-data-val">${esc(event?.occurredAt || event?.at || 'Não publicado')}</div></div>
    </div></div><div class="orch-modal-section"><div class="orch-modal-section-title">Mensagem</div><div class="orch-modal-data-item">${value('message', payload.summary || payload.message)}</div></div>`;
    openModal('<i class="ph-fill ph-arrows-left-right" style="color:var(--fenix-cyan);"></i> HANDOFF INSPECTOR', body, '<button class="orch-inspect-btn" id="modalHandoffClose">FECHAR</button>');
    document.getElementById('modalHandoffClose')?.addEventListener('click', closeModal);
  }

  // Modal de Inspeção de Projeto (Project Inspector)
  function openProjectInspectorModal(mirrorData) {
    const mirror = mirrorData && typeof mirrorData === 'object' ? mirrorData : {};

    const title = `<i class="ph-fill ph-folders" style="color:var(--fenix-purple);"></i> PROJECT INSPECTOR: ${esc(mirror.name)}`;
    const apisList = (mirror.apis || []).slice(0, 15).map(a => `
      <div style="display:flex; justify-content:space-between; font-size:9px; font-family:var(--fenix-font-mono); padding:2px 0;">
        <span style="color:var(--fenix-cyan);">${esc(a.method || 'API')}</span>
        <span>${esc(a.path || a.endpoint || a)}</span>
      </div>
    `).join('');

    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Estrutura e Tecnologias Detectadas</div>
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Projeto</div>
            <div class="orch-modal-data-val">${esc(mirror.name)}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Diretório</div>
            <div class="orch-modal-data-val" style="font-size:9.5px;">${esc(mirror.path)}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Frontend</div>
            <div class="orch-modal-data-val">${esc(mirror.tech?.frontend || 'Vanilla UI')}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Backend</div>
            <div class="orch-modal-data-val">${esc(mirror.tech?.backend || 'Node.js Core')}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Git Branch</div>
            <div class="orch-modal-data-val">${esc(mirror.git?.branch || 'Não publicado')} (${mirror.git ? (mirror.git.isClean ? 'Limpo' : 'Modificado') : 'Não publicado'})</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Total de Arquivos / Testes</div>
            <div class="orch-modal-data-val">${mirror.files?.total ?? mirror.fileCount ?? 'Não publicado'} arquivos · ${mirror.tests?.count ?? 'Não publicado'} testes</div>
          </div>
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Rotas e APIs Mapeadas</div>
        <div style="max-height:140px; overflow-y:auto; border:1px solid var(--fenix-border); border-radius:6px; padding:6px; background:rgba(0,0,0,0.3);">
          ${apisList || '<div style="font-size:9.5px; color:var(--fenix-text-dim);">Rotas canônicas registradas no Microkernel.</div>'}
        </div>
      </div>
    `;

    const footer = `
      <button class="orch-inspect-btn" id="modalProjBtnClose">FECHAR</button>
    `;

    openModal(title, body, footer);
    document.getElementById('modalProjBtnClose')?.addEventListener('click', closeModal);
  }

  // Modal de Logs do Agente
  async function openAgentDeskModal(agentId) {
    const live = window.FENIX?.live || {};
    const agents = live.agents || [];
    let ag = agents.find(a => String(a.id || a.agentId || a.name || '').toLowerCase() === String(agentId || '').toLowerCase());
    const inspector = await apiCall(`/api/v2/agents/${encodeURIComponent(agentId)}/inspector`);
    if (inspector && typeof inspector === 'object') ag = { ...(ag || {}), ...(inspector.agent || inspector) };
    const title = `<i class="ph-fill ph-desktop" style="color:var(--fenix-cyan);"></i> AGENT DESK: ${esc(ag?.name || agentId)}`;
    const currentJob = ag?.currentJob;
    const currentMission = ag?.currentMission;
    const agentLogs = Array.isArray(ag?.logs) ? ag.logs.slice(0, 6) : [];
    const agentSkills = Array.isArray(ag?.skills) ? ag.skills : [];
    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Identidade operacional</div>
        <div class="orch-modal-data-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">STATUS</div><div class="orch-modal-data-val">${esc(ag?.status || 'Não publicado')}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MODELO</div><div class="orch-modal-data-val">${esc(ag?.model || ag?.modelName || 'Não publicado')}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MISSÃO</div><div class="orch-modal-data-val">${esc(currentMission?.name || currentMission?.id || 'Nenhuma')}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">JOB</div><div class="orch-modal-data-val">${esc(currentJob?.name || currentJob?.id || 'Nenhum')}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">DISTRITO</div><div class="orch-modal-data-val">${esc(ag?.district || 'Não publicado')}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">FERRAMENTA</div><div class="orch-modal-data-val">${esc(ag?.currentTool || currentJob?.tool || 'Não publicada')}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">PROJETO</div><div class="orch-modal-data-val">${esc(ag?.associatedProject || ag?.project || (ag?.workspace?.projects || [])[0]?.name || 'Nenhum workspace')}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">UPTIME</div><div class="orch-modal-data-val">${ag?.uptimeMinutes == null ? 'Não publicado' : `${ag.uptimeMinutes} min`}</div></div>
        </div>
      </div>
      <div class="orch-modal-section"><div class="orch-modal-section-title">Skills registradas</div><div class="orch-modal-data-item">${agentSkills.length ? agentSkills.map(esc).join(' · ') : 'Nenhuma skill publicada.'}</div></div>
      <div class="orch-modal-section"><div class="orch-modal-section-title">Atividade publicada</div><div style="max-height:130px;overflow:auto;font-family:var(--fenix-font-mono);font-size:9px;">${agentLogs.length ? agentLogs.map((log) => `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05);">${esc(log.message || log.action || log.type || log)}</div>`).join('') : 'Nenhum log publicado pelo runtime.'}</div></div>
      <div class="orch-modal-section"><div class="orch-modal-section-title">Memória operacional</div><div style="font-family:var(--fenix-font-mono);font-size:9px;color:var(--fenix-text-dim);">${ag?.memory?.available ? `${ag.memory.entries} registros publicados pelo runtime.` : 'Memória não publicada pelo runtime.'}</div></div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Workspace autorizado</div>
        <div style="font-family:var(--fenix-font-mono);font-size:9px;color:var(--fenix-text-dim);">${ag?.workspace?.available ? esc((ag.workspace.projects || []).map((p) => `${p.name} (${p.rootPath})`).join(' · ') || 'Workspace registrado sem projetos') : esc(ag?.workspace?.reason || ag?.targetFile || 'Workspace não publicado pelo runtime deste agente.')}</div>
      </div>`;
    const footer = `<button class="orch-inspect-btn" id="modalDeskLogs">LOGS</button><button class="orch-inspect-btn" id="modalDeskSkills">SKILLS</button><button class="orch-inspect-btn" id="modalDeskTerminal">TERMINAL</button><button class="orch-inspect-btn" id="modalDeskMemory">MEMÓRIA</button><button class="orch-inspect-btn" id="modalDeskProject">PROJETO</button><button class="orch-inspect-btn" id="modalDeskClose">FECHAR</button>`;
    openModal(title, body, footer);
    document.getElementById('modalDeskClose')?.addEventListener('click', closeModal);
    document.getElementById('modalDeskLogs')?.addEventListener('click', () => openAgentLogsModal(agentId));
    document.getElementById('modalDeskSkills')?.addEventListener('click', () => openAgentSkillsModal(agentId));
    document.getElementById('modalDeskTerminal')?.addEventListener('click', () => { closeModal(); document.querySelector('[data-nav="terminal"]')?.click(); });
    document.getElementById('modalDeskMemory')?.addEventListener('click', () => { closeModal(); document.querySelector('[data-nav="memory"]')?.click(); });
    document.getElementById('modalDeskProject')?.addEventListener('click', () => { closeModal(); document.querySelector('[data-nav="mirror"]')?.click(); });
  }

  function openAgentLogsModal(agentId) {
    const live = window.FENIX?.live || {};
    const events = live.events || [];
    const agentEvents = events.filter(e => {
      const p = e.payload || {};
      return p.agentId === agentId || e.type?.includes(agentId.toLowerCase());
    }).slice(0, 15);

    const title = `<i class="ph-fill ph-file-text" style="color:var(--fenix-cyan);"></i> AGENT LOGS: ${esc(agentId)}`;
    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Histórico de Atividade Operacional</div>
        <div style="max-height:220px; overflow-y:auto; border:1px solid var(--fenix-border); border-radius:6px; padding:6px; background:rgba(0,0,0,0.3); font-family:var(--fenix-font-mono); font-size:9.5px;">
          ${agentEvents.length ? agentEvents.map(e => `
            <div style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="color:var(--fenix-text-dim);">${new Date(e.at || Date.now()).toLocaleTimeString()}</span>
              <b style="color:var(--fenix-cyan); margin-left:6px;">[${esc(e.type)}]</b>
              <span style="color:#fff; margin-left:6px;">${esc(e.payload?.summary || e.payload?.status || 'Evento registrado.')}</span>
            </div>
          `).join('') : '<div style="color:var(--fenix-text-dim); padding:8px;">Nenhum log de erro ou execução recente registrado para este agente. Agente em standby no seu distrito.</div>'}
        </div>
      </div>
    `;

    const footer = `<button class="orch-inspect-btn" id="modalLogsBtnClose">FECHAR</button>`;
    openModal(title, body, footer);
    document.getElementById('modalLogsBtnClose')?.addEventListener('click', closeModal);
  }

  // Modal de Skills do Agente
  function openAgentSkillsModal(agentId) {
    const live = window.FENIX?.live || {};
    const agents = live.agents || [];
    const ag = agents.find(a => (a.id || a.agentId || a.name || '').toLowerCase() === String(agentId || '').toLowerCase()) || {
      id: agentId,
      name: agentId,
      tools: [],
      permissions: []
    };

    const title = `<i class="ph-fill ph-lightning" style="color:var(--fenix-amber);"></i> AGENT SKILLS: ${esc(ag.name || ag.id)}`;
    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Ferramentas e Capacidades</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
          ${(ag.tools || []).map(t => `
            <span class="orch-status-pill online" style="font-size:9px;">${esc(t)}</span>
          `).join('')}
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Permissões Governadas</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${(ag.permissions || []).map(p => `
            <span class="orch-status-pill done" style="font-size:8.5px;">${esc(p)}</span>
          `).join('')}
        </div>
        ${!(ag.tools || []).length ? '<div style="color:var(--fenix-text-dim);font-size:9px;">Nenhuma ferramenta publicada para este agente.</div>' : ''}
      </div>
    `;

    const footer = `<button class="orch-inspect-btn" id="modalSkillsBtnClose">FECHAR</button>`;
    openModal(title, body, footer);
    document.getElementById('modalSkillsBtnClose')?.addEventListener('click', closeModal);
  }

  // ==========================================
  // PERSISTENT CONVERSATION HISTORY (Rule 17)
  // ==========================================
  const CONV_KEY = 'fenix_conversations';
  const ACTIVE_CONV_KEY = 'fenix_active_conv_id';

  function getStoredConversations() {
    try {
      return JSON.parse(localStorage.getItem(CONV_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveStoredConversations(convs) {
    try {
      localStorage.setItem(CONV_KEY, JSON.stringify(convs));
    } catch {}
  }

  function initConversationManager() {
    let convs = getStoredConversations();
    if (!convs.length) {
      const initialId = 'conv-' + Date.now();
      convs = [{
        id: initialId,
        title: 'Evolução Command Center',
        createdAt: new Date().toISOString(),
        messages: [
          { sender: 'fenix', text: 'Kernel inicializado. Como posso auxiliar nas operações hoje?' }
        ]
      }];
      saveStoredConversations(convs);
      currentConversationId = initialId;
      localStorage.setItem(ACTIVE_CONV_KEY, initialId);
    } else {
      currentConversationId = localStorage.getItem(ACTIVE_CONV_KEY) || convs[0].id;
    }

    renderConversationList();
    loadConversationMessages(currentConversationId);
  }

  function renderConversationList() {
    const listEl = document.getElementById('sidebarConvList');
    if (!listEl) return;
    const convs = getStoredConversations();

    const now = new Date();
    const isToday = (d) => d.toDateString() === now.toDateString();
    const isYesterday = (d) => {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return d.toDateString() === y.toDateString();
    };

    listEl.innerHTML = convs.map(c => {
      const d = new Date(c.createdAt || Date.now());
      let timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isYesterday(d)) timeStr = 'Ontem';
      else if (!isToday(d)) timeStr = d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

      const isActive = c.id === currentConversationId;
      return `
        <div class="orch-conv-item ${isActive ? 'active' : ''}" data-conv-id="${esc(c.id)}">
          <span>${esc(c.title || 'Conversa sem título')}</span>
          <span class="orch-conv-time">${esc(timeStr)}</span>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-conv-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-conv-id');
        currentConversationId = id;
        localStorage.setItem(ACTIVE_CONV_KEY, id);
        renderConversationList();
        loadConversationMessages(id);
      });
    });
  }

  function loadConversationMessages(convId) {
    const convs = getStoredConversations();
    const conv = convs.find(c => c.id === convId);
    const chatLog = document.getElementById('orchChatLog');
    if (!chatLog) return;
    if (!conv) {
      chatLog.innerHTML = `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> Olá! Sistema online. Como posso ajudar?</div>`;
      return;
    }

    chatLog.innerHTML = conv.messages.map(m => `
      <div class="orch-msg-bubble ${m.sender === 'user' ? 'user' : 'fenix'}">
        <strong>${m.sender === 'user' ? 'Você:' : 'FÊNIX:'}</strong> ${esc(m.text)}
      </div>
    `).join('');
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function appendMessageToCurrentConv(sender, text) {
    const convs = getStoredConversations();
    const conv = convs.find(c => c.id === currentConversationId);
    if (conv) {
      conv.messages.push({ sender, text, at: new Date().toISOString() });
      if (conv.messages.length === 2 && sender === 'user') {
        conv.title = text.slice(0, 26) + (text.length > 26 ? '...' : '');
      }
      saveStoredConversations(convs);
      renderConversationList();
    }
  }

  // ==========================================
  // PANEL RENDERING ENGINE
  // ==========================================
  function renderPanels() {
    const live = window.FENIX?.live || {};
    const shared = window.__FENIX_OPERATIONAL_STATE__ || {};
    const state = window.state || {};
    const data = { ...(shared.api || {}), ...(state.data || {}) };

    const missions = live.missions?.length ? live.missions : (data.missions?.missions || state.missions || []);
    const jobs = live.jobs?.length ? live.jobs : (data.jobs?.jobs || state.jobs || []);
    const projects = live.projects?.length ? live.projects : (data.projects?.projects || state.projects || []);
    const agents = live.agents?.length ? live.agents : (data.agents?.agents || []);
    const events = live.events?.length ? live.events : (data.events?.events || state.events || []);
    const health = live.operationalTwin?.health || data.health || {};

    // O primeiro render pode ocorrer antes do snapshot live. Assim que agentes
    // reais chegam, seleciona um deles para não deixar o inspector preso no
    // placeholder inicial; cliques posteriores continuam controlando a seleção.
    if (agents.length && !agents.some((agent) => String(agent.id || agent.agentId || agent.name) === String(selectedAgentId))) {
      selectedAgentId = agents[0].id || agents[0].agentId || agents[0].name;
    }

    const cityList = document.getElementById('cityListView');
    if (cityList && !cityList.hidden) {
      const entity = (label, value, action, id) => `<button type="button" data-city-action="${action}" data-city-id="${esc(id || '')}" style="display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid rgba(148,163,184,.14);padding:7px;color:#cbd5e1;cursor:pointer;"><strong>${esc(label)}</strong> <span style="color:#94a3b8;">${esc(value)}</span></button>`;
      const eventRows = events.slice(0, 10).map((event, index) => `<div style="padding:7px;border-bottom:1px solid rgba(148,163,184,.14);"><strong>EVENT</strong> <span style="color:#94a3b8;">${esc(event.type || 'evento não publicado')}</span><button type="button" data-event-index="${index}" style="float:right;background:none;border:0;color:#67e8f9;cursor:pointer;">FOCAR</button></div>`).join('');
      cityList.innerHTML = `<div style="font-weight:800;letter-spacing:.08em;margin-bottom:6px;">AI CITY · LIST VIEW</div>${projects.map(p => entity('PROJECT', `${p.name || p.projectName || p.id} · ${p.status || 'NÃO PUBLICADO'}`, 'project', p.id || p.projectId)).join('')}${agents.map(a => entity('AGENT', `${a.name || a.id} · ${a.status || 'NÃO PUBLICADO'}`, 'agent', a.id || a.name)).join('')}${missions.map(m => entity('MISSION', `${m.name || m.id} · ${m.status || 'NÃO PUBLICADO'}`, 'mission', m.id)).join('')}${jobs.map(j => entity('JOB', `${j.id || '—'} · ${j.status || 'NÃO PUBLICADO'}`, 'job', j.id)).join('')}${eventRows || '<div>Nenhuma entidade operacional publicada.</div>'}`;
      cityList.querySelectorAll('[data-city-action]').forEach((button) => button.addEventListener('click', () => {
        const id = button.dataset.cityId;
        if (button.dataset.cityAction === 'agent') window.fenixCity?.focusAgent(id);
        if (button.dataset.cityAction === 'mission') window.fenixCity?.focusMission(id);
        if (button.dataset.cityAction === 'job') window.fenixCity?.focusJob(id);
        if (button.dataset.cityAction === 'project') window.fenixCity?.focusProject(id);
      }));
      cityList.querySelectorAll('[data-event-index]').forEach((button) => button.addEventListener('click', () => {
        const event = events[Number(button.dataset.eventIndex)];
        const payload = event?.payload || {};
        if (payload.agentId) window.fenixCity?.focusAgent(payload.agentId);
        else if (payload.missionId) window.fenixCity?.focusMission(payload.missionId);
        else if (payload.jobId) window.fenixCity?.focusJob(payload.jobId);
        else if (payload.projectId) window.fenixCity?.focusProject(payload.projectId);
      }));
    }

    // 1. TOPBAR TELEMETRY
    const activeModelEl = document.getElementById('activeModel');
    if (activeModelEl) activeModelEl.textContent = live.operationalTwin?.model || data.overview?.model || 'Não publicado';

    const kpiLatencyEl = document.getElementById('kpiLatency');
    if (kpiLatencyEl) {
      const lat = live.wsLatencyMs ?? data.overview?.metrics?.latencyMs;
      kpiLatencyEl.textContent = lat == null ? '—' : `${lat}ms`;
    }

    const kpiTokensEl = document.getElementById('kpiTokens');
    if (kpiTokensEl) {
      const tokens = data.overview?.metrics?.tokens || '--';
      kpiTokensEl.textContent = tokens > 1000 ? `${(tokens / 1000).toFixed(1)}K` : tokens;
    }

    const totalAgents = agents.length;
    const activeAgentsList = agents.filter(a => ['RUNNING', 'WORKING', 'BUSY', 'ACTIVE'].includes(String(a.status || '').toUpperCase()));
    const activeAgentsCount = Math.max(activeAgentsList.length, jobs.filter(j => j.status === 'RUNNING').length);

    const kpiAgentsEl = document.getElementById('kpiAgents');
    if (kpiAgentsEl) kpiAgentsEl.textContent = `${activeAgentsCount} / ${totalAgents}`;

    const kpiWorkerEl = document.getElementById('kpiWorker');
    if (kpiWorkerEl) {
      const isHealthy = health.ok !== false && health.status !== 'degraded';
      kpiWorkerEl.textContent = isHealthy ? 'HEALTHY' : 'DEGRADED';
      kpiWorkerEl.className = 'orch-meta-val ' + (isHealthy ? 'green' : 'amber');
    }

    const kpiUptimeEl = document.getElementById('kpiUptime');
    if (kpiUptimeEl) kpiUptimeEl.textContent = live.uptime == null ? '—' : formatTime(live.uptime);

    // 2. SIDEBAR STATUS CARD
    const sidebarStatusEl = document.getElementById('sidebarFenixStatus');
    if (sidebarStatusEl) {
      const runningJob = jobs.find(j => j.status === 'RUNNING');
      const runningMission = missions.find(m => m.status === 'RUNNING' || m.status === 'IN_PROGRESS');
      if (runningMission) sidebarStatusEl.textContent = 'EXECUTANDO MISSÃO';
      else if (runningJob) sidebarStatusEl.textContent = 'EXECUTANDO JOB';
      else sidebarStatusEl.textContent = 'KERNEL DISPONÍVEL';
    }

    // 3. FLOATING OVERLAYS (AI CITY)
    // Never present an arbitrary historical/failed mission as active. A
    // terminal mission is shown only after the operator explicitly selects it;
    // otherwise the overlay represents the current runtime, or stays hidden.
    const selectedMission = missions.find(m => String(m.id) === String(selectedMissionId));
    const activeMission = selectedMission ||
                          missions.find(m => ['RUNNING', 'IN_PROGRESS', 'PAUSED', 'AWAITING_APPROVAL'].includes(String(m.status || '').toUpperCase()));

    const floatMissionCard = document.getElementById('floatingMissionCard');
    if (floatMissionCard) {
      if (activeMission) {
        floatMissionCard.style.display = 'block';
        floatMissionCard.style.cursor = 'pointer';
        selectedMissionId = activeMission.id;
        const labelEl = document.getElementById('floatMissionLabel');
        const terminal = ['SUCCEEDED', 'COMPLETED', 'FAILED', 'CANCELLED', 'BLOCKED'].includes(String(activeMission.status || '').toUpperCase());
        if (labelEl) labelEl.textContent = terminal ? 'MISSÃO SELECIONADA' : 'MISSÃO ATIVA';
        const titleEl = document.getElementById('floatMissionTitle');
        if (titleEl) titleEl.textContent = activeMission.displayName || activeMission.name || 'Missão sem nome publicado';
        const descEl = document.getElementById('floatMissionDesc');
        if (descEl) descEl.textContent = activeMission.objective || activeMission.description || 'Refatoração e validação contínua.';
        const progressEl = document.getElementById('floatMissionProgress');
        const pct = Number.isFinite(Number(activeMission.progress)) ? Math.min(100, Math.max(0, Number(activeMission.progress))) : 0;
        if (progressEl) progressEl.style.width = `${pct}%`;
        const badgeEl = document.getElementById('floatMissionBadge');
        if (badgeEl) {
          badgeEl.textContent = activeMission.status || 'EXECUTANDO';
          badgeEl.className = 'orch-status-pill ' + (activeMission.status === 'FAILED' ? 'red' : 'online');
        }
        const jobsEl = document.getElementById('floatMissionJobs');
        const mJobs = jobs.filter(j => j.missionId === activeMission.id);
        const mDone = mJobs.filter(j => ['SUCCEEDED', 'COMPLETED'].includes(j.status)).length;
        if (jobsEl) jobsEl.textContent = `${mDone} / ${mJobs.length}`;
        const agentsEl = document.getElementById('floatMissionAgents');
        if (agentsEl) agentsEl.textContent = `${activeAgentsCount} / ${totalAgents}`;
        const etaEl = document.getElementById('floatMissionEta');
        if (etaEl) etaEl.textContent = activeMission.eta ? activeMission.eta : 'estimativa indisponível';
        document.getElementById('btnPauseMission')?.style.setProperty('display', terminal ? 'none' : '');
        document.getElementById('btnCancelMission')?.style.setProperty('display', terminal ? 'none' : '');
      } else floatMissionCard.style.display = 'none';
    }

    const activeJob = jobs.find(j => j.status === 'RUNNING') || null;
    const floatJobCard = document.getElementById('floatingJobCard');
    if (floatJobCard) {
      if (activeJob) {
        floatJobCard.style.display = 'block';
        floatJobCard.style.cursor = 'pointer';
        const jobIdEl = document.getElementById('floatJobId');
        if (jobIdEl) jobIdEl.textContent = activeJob.id ? (activeJob.id.length > 8 ? `JOB-${activeJob.id.slice(0,6)}` : activeJob.id) : 'JOB —';
        const jobAgentEl = document.getElementById('floatJobAgent');
        if (jobAgentEl) jobAgentEl.textContent = (activeJob.agent?.name || activeJob.agentId || 'QA AGENT').toUpperCase();
        const jobTitleEl = document.getElementById('floatJobTitle');
        if (jobTitleEl) jobTitleEl.textContent = activeJob.prompt || activeJob.title || activeJob.type || 'Título não publicado';
        const jobProgEl = document.getElementById('floatJobProgress');
        if (jobProgEl) jobProgEl.style.width = `${Number.isFinite(Number(activeJob.progress)) ? Math.min(100, Math.max(0, Number(activeJob.progress))) : 0}%`;
      } else floatJobCard.style.display = 'none';
    }

    // Ribbon counters
    const rTotAg = document.getElementById('ribbonTotalAgents');
    if (rTotAg) rTotAg.textContent = totalAgents;
    const rActAg = document.getElementById('ribbonActiveAgents');
    if (rActAg) rActAg.textContent = activeAgentsCount;
    const rMiss = document.getElementById('ribbonMissionsCount');
    if (rMiss) rMiss.textContent = missions.length;
    const rJobs = document.getElementById('ribbonJobsCount');
    if (rJobs) rJobs.textContent = jobs.length;

    // 4. RIGHT QUAD: LIVE ACTIVITY
    const liveActivityList = document.getElementById('orchLiveActivityList');
    if (liveActivityList) {
      const recentEvents = events.slice(0, 7);
      liveActivityList.innerHTML = (recentEvents.length ? recentEvents : [{ type: 'empty', payload: { summary: 'Nenhum evento operacional recebido.' }, at: null }]).map(e => {
        const time = new Date(e.at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const summary = e.payload?.summary || e.payload?.message || `${e.type} processado`;
        const colorClass = e.type?.includes('failed') || e.type?.includes('error') ? 'red' :
                           (e.type?.includes('completed') || e.type?.includes('succeeded') ? 'green' :
                           (e.type?.includes('started') || e.type?.includes('dispatched') ? 'cyan' : ''));
        return `<button type="button" class="orch-log-entry ${colorClass}" data-event-index="${recentEvents.indexOf(e)}"><span class="orch-log-time">${esc(time)}</span><span>${esc(summary)}</span></button>`;
      }).join('');
      liveActivityList.querySelectorAll('[data-event-index]').forEach((row) => {
        row.addEventListener('click', () => {
          const event = recentEvents[Number(row.dataset.eventIndex)];
          const payload = event?.payload || {};
          const city = window.fenixCity;
          if (payload.agentId && city?.focusAgent) city.focusAgent(payload.agentId);
          else if (payload.jobId && city?.focusJob) city.focusJob(payload.jobId);
          else if (payload.missionId && city?.focusMission) city.focusMission(payload.missionId);
        });
      });
    }

    // RIGHT QUAD: AGENTES ATIVOS
    const activeAgentsListEl = document.getElementById('orchActiveAgentsList');
    if (activeAgentsListEl) {
      const topAgents = agents.slice(0, 5);
      activeAgentsListEl.innerHTML = (topAgents.length ? topAgents.map(ag => {
        const isSel = ag.id === selectedAgentId;
        const statusText = String(ag.status || 'NÃO PUBLICADO').toUpperCase();
        const badgeClass = statusText === 'RUNNING' ? 'exec' : (ag.status ? 'online' : '');
        return `<div class="orch-skill-row" style="cursor:pointer; padding:4px 6px; border-radius:4px; ${isSel ? 'background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4);' : ''}" data-agent-id="${ag.id}">
          <span class="orch-skill-name">${getAgentEmoji(ag.role)} ${esc(ag.name || ag.id)}</span>
          <span class="orch-status-pill ${badgeClass}" style="font-size:7.5px;">${esc(statusText)}</span>
        </div>`;
      }).join('') : '<div style="font-size:8.5px;color:var(--fenix-text-dim);padding:8px;">Nenhum agente publicado no runtime.</div>') + (topAgents.length > 5 ? `<div style="font-size:8.5px; color:var(--fenix-text-dim); text-align:center; margin-top:4px;">+ ${totalAgents - 5} agentes no catálogo</div>` : '');

      // Attach click to focus agent
      activeAgentsListEl.querySelectorAll('[data-agent-id]').forEach(el => {
        el.addEventListener('click', () => {
          const aid = el.getAttribute('data-agent-id');
          selectedAgentId = aid;
          if (window.fenixCity?.focusAgent) window.fenixCity.focusAgent(aid);
          updateAgentInspector(aid);
          renderPanels();
        });
      });
    }

    // 5. RECENT MISSIONS LIST
    const recentMissionsListEl = document.getElementById('orchRecentMissionsList');
    if (recentMissionsListEl && missions.length) {
      recentMissionsListEl.innerHTML = missions.slice(0, 6).map(m => {
        const isSel = m.id === selectedMissionId;
        const pct = m.progress ?? (m.status === 'SUCCEEDED' || m.status === 'COMPLETED' ? 100 : null);
        const badgeClass = pct === 100 ? 'done' : (m.status === 'FAILED' ? 'fail' : 'exec');
        return `<div class="orch-mission-item-row ${isSel ? 'active' : ''}" data-mission-id="${m.id}" style="cursor:pointer;">
          <div>
            <div class="orch-mission-item-title">${esc(m.displayName || m.name || 'Missão Fênix')}</div>
            <div style="font-size: 8.5px; color: var(--fenix-text-dim);">${esc(m.objective?.slice(0, 40) || 'Objetivo não publicado')}</div>
          </div>
          <div class="orch-mission-item-badge ${badgeClass}">${pct == null ? '—' : `${pct}%`}</div>
        </div>`;
      }).join('');

      recentMissionsListEl.querySelectorAll('[data-mission-id]').forEach(el => {
        el.addEventListener('click', () => {
          selectedMissionId = el.getAttribute('data-mission-id');
          renderPanels();
          openMissionDetailModal(selectedMissionId);
        });
      });
    }

    // 6. FOOTER
    const memEl = document.getElementById('footerActiveMemory');
    if (memEl) memEl.textContent = data.overview?.metrics?.memories == null ? 'NÃO PUBLICADO' : `${data.overview.metrics.memories} ITENS`;
  }

  // ==========================================
  // REAL AGENT INSPECTOR (Rule 10 & 19)
  // ==========================================
  function updateAgentInspector(agentId) {
    const live = window.FENIX?.live || {};
    const agents = live.agents || [];
    const jobs = live.jobs || [];
    const missions = live.missions || [];

    const realAg = agents.find(a => (a.id || a.agentId || a.name || '').toLowerCase() === String(agentId || '').toLowerCase()) || {
      id: agentId,
      name: 'Nenhum agente publicado',
      role: null,
      status: null,
      district: null,
      model: null
    };

    const activeJob = jobs.find(j => j.agentId === realAg.id && j.status === 'RUNNING');
    const activeMission = activeJob ? missions.find(m => m.id === activeJob.missionId) : null;

    const nameEl = document.getElementById('inspAgentName');
    if (nameEl) nameEl.textContent = realAg.name || realAg.id;
    const roleEl = document.getElementById('inspAgentRole');
    if (roleEl) roleEl.textContent = realAg.role || realAg.domain || 'Engenharia de Software';
    const portraitEl = document.getElementById('inspAgentPortrait');
    if (portraitEl) portraitEl.innerHTML = `<span>${getAgentEmoji(realAg.role || realAg.id)}</span>`;

    const statusLabel = document.getElementById('inspAgentStatusLabel');
    if (statusLabel) {
      const isRunning = activeJob || realAg.status === 'RUNNING';
      statusLabel.textContent = `STATUS: ${isRunning ? 'WORKING' : (realAg.status || 'NÃO PUBLICADO')}`;
      statusLabel.style.color = isRunning ? 'var(--fenix-cyan)' : 'var(--fenix-text-dim)';
    }

    const hbLabel = document.getElementById('inspAgentHeartbeatLabel');
    if (hbLabel) {
      hbLabel.textContent = `HEARTBEAT: ${realAg.status ? (realAg.status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE') : 'NÃO PUBLICADO'}`;
      hbLabel.style.color = realAg.status === 'OFFLINE' ? 'var(--fenix-red)' : 'var(--fenix-text-dim)';
    }

    const misEl = document.getElementById('inspAgentMission');
    if (misEl) misEl.textContent = activeMission ? (activeMission.displayName || activeMission.name) : (agents.length ? 'Nenhuma' : 'NÃO PUBLICADO');
    const jobEl = document.getElementById('inspAgentJob');
    if (jobEl) jobEl.textContent = activeJob ? (activeJob.prompt || activeJob.id) : (agents.length ? 'Disponível / Idle' : 'NÃO PUBLICADO');
    const modEl = document.getElementById('inspAgentModel');
    if (modEl) modEl.textContent = realAg.model || 'Não publicado';
    const distEl = document.getElementById('inspAgentDistrict');
    if (distEl) distEl.textContent = realAg.district || 'Não publicado';
  }

  // Listen for agent clicks in AI City canvas
  window.addEventListener('fenix-agent-selected', (e) => {
    if (e.detail?.agent) {
      selectedAgentId = e.detail.agent.id || e.detail.agent.name;
      updateAgentInspector(selectedAgentId);
      renderPanels();
      openAgentDeskModal(selectedAgentId);
    }
  });
  window.addEventListener('fenix-handoff-selected', (e) => openHandoffInspector(e.detail));
  window.addEventListener('fenix-mission-selected', (e) => openMissionDetailModal(e.detail?.missionId));
  window.addEventListener('fenix-job-selected', (e) => openJobDetailModal(e.detail?.jobId));
  window.addEventListener('fenix-project-selected', (e) => { document.querySelector('[data-nav="mirror"]')?.click(); });

  // ==========================================
  // CHAT WORKFLOW & INTENT ROUTING (Rule 7, 8, 28)
  // ==========================================
  async function submitChatMessage() {
    const input = document.getElementById('masterPrompt');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const chatLog = document.getElementById('orchChatLog');
    if (chatLog) {
      chatLog.innerHTML += `<div class="orch-msg-bubble user"><strong>Você:</strong> ${esc(text)}</div>`;
      chatLog.scrollTop = chatLog.scrollHeight;
    }
    appendMessageToCurrentConv('user', text);

    // Check if user is confirming a pending proposal
    if (pendingProposal && /^(sim|confirmar|confirmo|pode iniciar|iniciar|ok|bora|start)\b/i.test(text)) {
      if (chatLog) {
        chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> Autorização recebida! Criando e iniciando missão <strong>${esc(pendingProposal.name)}</strong> no MissionKernel...</div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
      }
      appendMessageToCurrentConv('fenix', `Autorização recebida! Criando e iniciando missão ${pendingProposal.name}...`);

      const res = await apiCall('/api/missions', 'POST', {
        name: pendingProposal.name,
        objective: pendingProposal.objective,
        steps: [
          { type: 'audit' },
          { type: 'inspect', dependsOn: [0] }
        ],
        autoApprove: true
      });
      pendingProposal = null;
      renderPanels();
      return;
    }

    // Call canonical chat endpoint with aiplatform provider — T03
    const res = await apiCall('/api/chat', 'POST', { message: text, provider: 'aiplatform', model: 'qwen2.5:3b' });
    if (!res) {
      if (chatLog) {
        chatLog.innerHTML += `<div class="orch-msg-bubble fenix" style="color:var(--fenix-red);"><strong>FÊNIX:</strong> Não consegui processar a solicitação no momento. Verifique a conexão com o kernel.</div>`;
      }
      return;
    }

    // Process Intent Classification
    if (res.category === 'PROJECT_ANALYSIS' || res.action?.type === 'project_analysis') {
      const mirror = res.facts?.mirror;
      const reply = res.reply || `Análise de projeto concluída para ${mirror?.name || 'workspace'}.`;
      if (chatLog) {
        chatLog.innerHTML += `<div class="orch-msg-bubble fenix">
          <strong>FÊNIX:</strong> ${esc(reply)}<br>
          <button class="orch-inspect-btn" id="btnOpenProjectInspector" style="margin-top:6px; color:var(--fenix-purple);"><i class="ph-fill ph-folders"></i> ABRIR PROJECT INSPECTOR</button>
        </div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
        document.getElementById('btnOpenProjectInspector')?.addEventListener('click', () => {
          openProjectInspectorModal(mirror);
        });
      }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    if (res.category === 'LONG_MISSION' || res.category === 'CODE_CHANGE' || res.requiresConfirmation) {
      const propName = res.proposal?.name || 'Evolução Command Center & AI City';
      pendingProposal = {
        name: propName,
        objective: text
      };
      const msg = `Esta solicitação requer modificações governadas. Posso criar uma missão com validação em etapas.\nNome sugerido: ${propName}\nQuer iniciar? (Responda "sim" para autorizar)`;
      if (chatLog) {
        chatLog.innerHTML += `<div class="orch-msg-bubble fenix">
          <strong>FÊNIX (Proposta de Missão):</strong> Esta solicitação envolve modificações governadas.<br>
          Posso transformar isso em uma missão dividida em etapas auditáveis.<br><br>
          <b>Nome sugerido:</b> <span style="color:var(--fenix-red);">${esc(propName)}</span><br>
          <b>Quer iniciar?</b> (Responda <i>"sim"</i> para autorizar ou <i>"não"</i> para cancelar)
        </div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
      }
      appendMessageToCurrentConv('fenix', msg);
      return;
    }

    if (res.category === 'SMALL_TASK') {
      const resJob = await apiCall('/api/jobs', 'POST', {
        type: 'development.patch',
        prompt: text,
        agentId: 'Backend'
      });
      const reply = `Tarefa pontual recebida! Job criado e submetido ao JobEngine (Status: ${resJob?.status || 'QUEUED'}).`;
      if (chatLog) {
        chatLog.innerHTML += `<div class="orch-msg-bubble fenix">
          <strong>FÊNIX:</strong> ${esc(reply)}
        </div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
      }
      appendMessageToCurrentConv('fenix', reply);
      renderPanels();
      return;
    }

    // Default Conversation Response
    const reply = res.reply || res.facts?.note || 'Comando processado pelo runtime.';
    if (chatLog) {
      chatLog.innerHTML += `<div class="orch-msg-bubble fenix">
        <strong>FÊNIX:</strong> ${esc(reply)}
      </div>`;
      chatLog.scrollTop = chatLog.scrollHeight;
    }
    appendMessageToCurrentConv('fenix', reply);
  }

  // Mission control actions
  function setupActions() {
    document.getElementById('btnPauseMission')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnPauseMission');
      if (!selectedMissionId) return;
      if (btn) { btn.disabled = true; btn.textContent = 'PAUSANDO...'; }
      try {
        await apiCall(`/api/fenix/missions/${encodeURIComponent(selectedMissionId)}/pause`, 'POST');
        setTimeout(renderPanels, 400);
      } catch (error) {
        if (btn) btn.textContent = `FALHA: ${error.message}`;
      } finally { if (btn) btn.disabled = false; }
    });

    document.getElementById('btnCancelMission')?.addEventListener('click', async () => {
      if (!confirm('Deseja realmente cancelar a missão ativa?')) return;
      if (!selectedMissionId) return;
      try {
        await apiCall(`/api/fenix/missions/${encodeURIComponent(selectedMissionId)}/cancel`, 'POST');
        setTimeout(renderPanels, 400);
      } catch (error) { window.alert(`Falha ao cancelar missão: ${error.message}`); }
    });

    document.getElementById('btnDetailsMission')?.addEventListener('click', () => {
      openMissionDetailModal(selectedMissionId);
    });

    document.getElementById('floatingMissionCard')?.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') openMissionDetailModal(selectedMissionId);
    });

    document.getElementById('floatingJobCard')?.addEventListener('click', () => {
      openJobDetailModal('JOB-CURRENT');
    });

    document.getElementById('btnFenixStatusDetails')?.addEventListener('click', () => {
      openMissionDetailModal(selectedMissionId);
    });

    // O chat é registrado exclusivamente por initFenixChat abaixo. O handler
    // legado submitChatMessage competia pelo mesmo botão e deixava a UI presa
    // em PENSANDO mesmo quando o fluxo real já tinha iniciado.

    // + Nova Conversa button
    document.getElementById('btnNewConversation')?.addEventListener('click', () => {
      const convs = getStoredConversations();
      const newId = 'conv-' + Date.now();
      convs.unshift({
        id: newId,
        title: 'Nova Conversa',
        createdAt: new Date().toISOString(),
        messages: [
          { sender: 'fenix', text: 'Nova conversa iniciada. Contexto carregado e memória ativa. Como posso ajudar?' }
        ]
      });
      saveStoredConversations(convs);
      currentConversationId = newId;
      localStorage.setItem(ACTIVE_CONV_KEY, newId);
      renderConversationList();
      loadConversationMessages(newId);
    });

    // Agent Inspector buttons
    document.getElementById('btnAgentChat')?.addEventListener('click', () => {
      const input = document.getElementById('masterPrompt');
      if (input) {
        input.value = `@${selectedAgentId} `;
        input.focus();
      }
    });

    document.getElementById('btnAgentLogs')?.addEventListener('click', () => {
      openAgentLogsModal(selectedAgentId);
    });

    document.getElementById('btnAgentSkills')?.addEventListener('click', () => {
      openAgentSkillsModal(selectedAgentId);
    });

    document.getElementById('btnAgentPause')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnAgentPause');
      const agent = (window.FENIX?.live?.agents || []).find((item) => String(item.id || item.agentId || item.name) === String(selectedAgentId));
      const jobId = agent?.currentJobId || agent?.currentJob?.id;
      if (!jobId) {
        if (btn) btn.textContent = 'SEM JOB PUBLICADO';
        setTimeout(() => { if (btn) btn.textContent = 'PAUSAR'; }, 2500);
        return;
      }
      const resume = btn?.dataset.paused === 'true';
      if (btn) { btn.disabled = true; btn.textContent = resume ? 'RETOMANDO…' : 'PAUSANDO…'; }
      try {
        await apiCall(`/api/v2/jobs/${encodeURIComponent(jobId)}/${resume ? 'resume' : 'pause'}`, 'POST');
        if (btn) { btn.dataset.paused = resume ? 'false' : 'true'; btn.textContent = resume ? 'PAUSAR' : 'RETOMAR'; }
        window.dispatchEvent(new CustomEvent('fenix-runtime-refresh'));
      } catch (error) {
        if (btn) btn.textContent = `FALHA: ${error.message}`;
      } finally { if (btn) btn.disabled = false; }
    });
  }

  // Public bridge used by unified-app refresh cycle
  window.renderCommandCenterPanels = renderPanels;
  window.__fenixSubmitCommand = submitChatMessage;
  window.openProjectInspector = openProjectInspectorModal;
  window.openMissionDetailModal = openMissionDetailModal;
  window.openJobDetailModal = openJobDetailModal;

  window.addEventListener('DOMContentLoaded', () => {
    initConversationManager();
    setupActions();
    updateAgentInspector(selectedAgentId);
    renderPanels();
    refreshRegisteredSkills();
  });

  document.addEventListener('fenix-live', () => {
    renderPanels();
    updateAgentInspector(selectedAgentId);
    refreshSystemHealth();
  });
  document.addEventListener('fenix:data', () => {
    renderPanels();
    updateAgentInspector(selectedAgentId);
    refreshSystemHealth();
  });

  setInterval(renderPanels, 3000);
  setInterval(refreshRegisteredSkills, 10000);
  // === SYSTEM HEALTH BAR (REAL DATA) ===
  async function refreshSystemHealth() {
    try {
      const h = await apiCall('/health');
      if (!h) return;
      const isKernelActive = h.boot && h.boot.status === 'KERNEL_ACTIVE';
      const isWorkerOk     = h.boot && h.boot.ok;
      const isStoreOk      = h.checks && h.checks['state-store'] && h.checks['state-store'].ok;
      const isAiOk         = h.checks && h.checks['ai-providers'] && h.checks['ai-providers'].ok;
      // live-runtime exposes the authoritative connection state as `status`.
      // The old `connected` property never existed, which made a healthy
      // WebSocket appear as EVENTS OFFLINE in the cockpit.
      const liveOnline = window.FENIX?.live?.status === 'ONLINE';
      const wsOpen = window.FENIX?.ws?.readyState === 1;
      const recentHeartbeat = Boolean(window.FENIX?.live?.lastHeartbeatAt);
      const sseOnline = typeof EventSource !== 'undefined'
        && window.sseEventSource?.readyState === EventSource.OPEN;
      const isEventsOk = liveOnline || wsOpen || sseOnline || recentHeartbeat;

      function setNode(id, label, ok, altLabel) {
        const el = document.getElementById(id);
        if (!el) return;
        const col = ok ? '#10b981' : '#ef4444';
        const txt = ok ? (altLabel || 'ONLINE') : 'OFFLINE';
        el.innerHTML = `<span style="color:${col}">●</span> ${label}: <b style="color:${col}">${txt}</b>`;
      }
      setNode('shNodeApi',      'API',          isKernelActive);
      setNode('shNodeWorker',   'WORKER',       isWorkerOk, 'HEALTHY');
      setNode('shNodeRedis',    'REDIS',        isStoreOk);
      setNode('shNodePostgres', 'POSTGRES',     isStoreOk);
      setNode('shNodeAi',       'AI PROVIDERS', isAiOk);
      setNode('shNodeEvents',   'EVENTS',       isEventsOk, 'CONNECTED');

      // Also update the legacy .orch-health-node query for compat
      const nodes = document.querySelectorAll('.orch-health-node:not([id])');
      // (no-op — specific IDs now used above)

      // Update system health pill
      const pill = document.getElementById('statusPill');
      if (pill) {
        if (isKernelActive) {
          pill.textContent = 'ONLINE';
          pill.className = 'orch-status-pill online';
        } else {
          pill.textContent = 'DEGRADED';
          pill.style.background = 'rgba(239,68,68,0.15)';
          pill.style.color = '#ef4444';
        }
      }
      // Update sidebar status
      const sidebarStatus = document.getElementById('sidebarFenixStatus');
      if (sidebarStatus && isKernelActive) sidebarStatus.textContent = 'KERNEL ATIVO';

      // Update worker KPI
      const kpiWorker = document.getElementById('kpiWorker');
      if (kpiWorker) {
        kpiWorker.textContent = isWorkerOk ? 'HEALTHY' : 'OFFLINE';
        kpiWorker.className = isWorkerOk ? 'orch-meta-val green' : 'orch-meta-val red';
      }
    } catch (e) { /* silently fail */ }
  }
  // Health é leitura de rede; eventos SSE já mantêm atividade e missões vivas.
  // Um intervalo de 20s evita competir com o refresh do shell e com iframes.
  const commandViewActive = () => document.getElementById('view-command')?.classList.contains('active');
  setInterval(() => { if (commandViewActive()) refreshSystemHealth(); }, 20000);
  if (commandViewActive()) refreshSystemHealth();

  // === LIVE ACTIVITY BRIDGE: mirror orchLiveActivityList → orchLiveActivityStream ===
  // command-center.js writes to orchLiveActivityList; we mirror to the visible stream element
  function syncActivityStream() {
    const src = document.getElementById('orchLiveActivityList');
    const dst = document.getElementById('orchLiveActivityStream');
    if (!src || !dst || !src.innerHTML.trim()) return;
    if (src.innerHTML !== dst.getAttribute('data-last-sync')) {
      dst.innerHTML = src.innerHTML;
      dst.setAttribute('data-last-sync', src.innerHTML);
      dst.scrollTop = dst.scrollHeight;
    }
  }
  setInterval(syncActivityStream, 500);

  // === HEATMAP LIVE ANIMATION ===
  function animateHeatmap() {
    // Heatmap levels are telemetry values; never animate them locally.
  }

  // === SIDEBAR ACTIVE STATE on nav click ===
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // === SISTEMA DE TELEMETRY REAL — CPU approx via requestAnimationFrame timing ===
  let _rafLast = performance.now();
  let _cpuLoad = 0;
  function measureCPU() {
    const now = performance.now();
    const delta = now - _rafLast;
    _rafLast = now;
    // frame > 20ms = high load; approximate
    _cpuLoad = Math.min(100, Math.max(0, Math.round((delta / 16.67 - 1) * 50)));
    const cpuEl = document.getElementById('kpiLatency');
    if (cpuEl && delta > 0) {
      cpuEl.textContent = `${Math.round(delta)}ms`;
      cpuEl.className = delta < 30 ? 'orch-meta-val green' : (delta < 60 ? 'orch-meta-val amber' : 'orch-meta-val red');
    }
    requestAnimationFrame(measureCPU);
  }
  requestAnimationFrame(measureCPU);

  // === API PLATFORM MONITOR (localhost:3000) ===
  // O browser consulta o proxy do Fênix; credenciais ficam somente no backend.
  const API_PLATFORM_URL = '/api/v2/ai-platform/status';

  async function refreshApiPlatformStatus() {
    if (!commandViewActive()) return;
    if (Date.now() < apiPlatformBackoffUntil) return;
    const statusEl   = document.getElementById('apiPlatformStatus');
    const provEl     = document.getElementById('apiPlatformProviders');
    const uptimeEl   = document.getElementById('apiPlatformUptime');
    const dbEl       = document.getElementById('apiPlatformDb');
    const redisEl    = document.getElementById('apiPlatformRedis');
    try {
      const r = await fetch(API_PLATFORM_URL, {
        headers: { Authorization: 'Bearer ' + (getAuthToken() || '') },
        signal: AbortSignal.timeout(5000)
      });
      if (r.status === 429) {
        const retryAfter = Number(r.headers.get('retry-after') || 10);
        apiPlatformBackoffUntil = Date.now() + Math.min(Math.max(retryAfter, 5), 60) * 1000;
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const connected = d.status === 'CONNECTED' || d.status === 'ONLINE';
      if (statusEl) { statusEl.textContent = connected ? '● CONECTADO' : '● OFFLINE'; statusEl.style.color = connected ? '#10b981' : '#ef4444'; }
      if (provEl)   provEl.textContent = (d.providers || []).map((p) => typeof p === 'string' ? p : p.name).filter(Boolean).join(' · ') || 'Não publicado';
      if (uptimeEl) uptimeEl.textContent = d.uptime == null ? '—' : `${Math.round(d.uptime)}s`;
      if (dbEl)     { dbEl.textContent = d.checks?.database == null ? '—' : (d.checks.database ? '✓' : '✗'); dbEl.style.color = d.checks?.database == null ? '#94a3b8' : (d.checks.database ? '#10b981' : '#ef4444'); }
      if (redisEl)  { redisEl.textContent = d.checks?.redis == null ? '—' : (d.checks.redis ? '✓' : '✗'); redisEl.style.color = d.checks?.redis == null ? '#94a3b8' : (d.checks.redis ? '#10b981' : '#ef4444'); }
      // Update topbar model chip
      const modelEl = document.getElementById('activeModel');
      if (modelEl && d.model) modelEl.textContent = d.model;
      const platformModelEl = document.getElementById('apiPlatformModel');
      if (platformModelEl) platformModelEl.textContent = d.model || (d.providers || []).find((p) => p?.model)?.model || 'Não publicado';
    } catch (e) {
      // O health do próprio Fênix é a fonte final: evita marcar a API offline
      // por uma falha transitória do endpoint de resumo do cockpit.
      try {
        const token = getAuthToken();
        const health = await fetch('/health', {
          headers: token ? { Authorization: 'Bearer ' + token } : {},
          signal: AbortSignal.timeout(3000)
        }).then((r) => r.json());
        const connected = health.checks?.['ai-providers']?.ok === true;
        if (statusEl) { statusEl.textContent = connected ? '● CONECTADO' : '● OFFLINE'; statusEl.style.color = connected ? '#10b981' : '#ef4444'; }
        if (provEl && connected) provEl.textContent = 'aiplatform · ollama';
        if (dbEl && health.checks?.['state-store']) dbEl.textContent = '✓';
        if (redisEl && health.checks?.['redis']) redisEl.textContent = '✓';
        return;
      } catch (_) {}
      if (statusEl) { statusEl.textContent = '● OFFLINE'; statusEl.style.color = '#ef4444'; }
    }
  }
  setInterval(() => { if (commandViewActive()) refreshApiPlatformStatus(); }, 15000);
  if (commandViewActive()) refreshApiPlatformStatus();

  // === API PLATFORM DIRECT CHAT (used when FÊNIX chat sends messages) ===
  // This is a browser-level proxy: when the FÊNIX chat fails (401/network), this falls back
  // to calling the API Platform directly from the browser.
  window.FENIX = window.FENIX || {};
  window.FENIX.apiPlatform = {
    url: '/api/v2/ai-platform/chat',
    key: null,
    model: 'qwen2.5:3b',
    provider: 'ollama',
    async chat(messages, opts = {}) {
      const r = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: opts.provider || 'ollama',
          model: opts.model || 'qwen2.5:3b',
          messages,
        }),
        signal: AbortSignal.timeout(opts.timeout || 60000),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(`API Platform ${r.status}: ${err.message || r.statusText}`);
      }
      const data = await r.json();
      // Normalize response: data.result.message.content or data.result.text
      const content = data?.result?.message?.content
        || data?.result?.text
        || data?.result?.content
        || data?.text
        || '';
      return { content, tokens: data?.tokens, provider: data?.provider, model: data?.model };
    },
  };

  // ============================================================
  // T03-T10: FÊNIX CHAT — REAL CONNECTION
  // Conecta masterCmdSubmit + masterPrompt + orchChatLog à /api/chat
  // com fallback para API Platform direto.
  // ============================================================

  const CHAT_HISTORY_KEY = 'fenix_chat_history_v1';

  function chatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function saveChatHistory(msgs) {
    try { localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(msgs.slice(-100))); } catch (e) {}
  }

  function loadChatHistory() {
    try { return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]'); } catch (e) { return []; }
  }

  function renderChatBubble(histEl, role, text, ts) {
    const time = ts || chatTimestamp();
    const div = document.createElement('div');
    if (role === 'user') {
      div.className = 'orch-chat-msg user';
      div.style.cssText = 'display:flex; flex-direction:column; align-items:flex-end; margin:5px 0; animation:fenixFadeIn 0.2s ease;';
      div.innerHTML = '<div style="background:rgba(239,68,68,0.18); border:1px solid rgba(239,68,68,0.35); border-radius:12px 12px 2px 12px; padding:7px 12px; max-width:82%; font-size:11.5px; line-height:1.5; color:#fff; word-break:break-word;">' + esc(text) + '</div>' +
        '<span style="font-size:9px; color:#64748b; margin-top:2px; font-family:var(--fenix-font-mono);">' + time + '</span>';
    } else {
      div.className = 'orch-chat-msg fenix';
      div.style.cssText = 'display:flex; flex-direction:column; align-items:flex-start; margin:5px 0; animation:fenixFadeIn 0.2s ease;';
      div.innerHTML = '<div style="display:flex; align-items:flex-start; gap:6px;">' +
        '<span style="font-size:16px; line-height:1; margin-top:3px;">🤖</span>' +
        '<div style="background:rgba(15,15,30,0.85); border:1px solid rgba(255,255,255,0.1); border-radius:2px 12px 12px 12px; padding:7px 12px; max-width:82%; font-size:11.5px; line-height:1.6; color:#e2e8f0; word-break:break-word;">' + esc(text) + '</div>' +
        '</div>' +
        '<span style="font-size:9px; color:#64748b; margin-top:2px; margin-left:22px; font-family:var(--fenix-font-mono);">' + time + '</span>';
    }
    histEl.appendChild(div);
    histEl.scrollTop = histEl.scrollHeight;
  }

  async function fenixChatSend(text) {
    const token = getAuthToken();
    // Caminho primário autocontido: não depende da ordem de inicialização de
    // window.FENIX e mantém a credencial no backend.
    try {
      const direct = await fetch('/api/v2/ai-platform/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ message: text, modelOverride: 'qwen2.5:3b' }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await direct.json().catch(() => ({}));
      if (direct.ok && data.text) return data.text;
    } catch (_) { /* tenta o stream e depois o provider configurado */ }
    // T03: conversa passa pelo stream, que usa AIRouter + Gateway no backend.
    if (token) {
      try {
        const r = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, accept: 'text/event-stream' },
          body: JSON.stringify({ message: text, provider: 'aiplatform' }),
          signal: AbortSignal.timeout(60000),
        });
        if (r.ok) {
          const raw = await r.text();
          const reply = raw.split(/\n\n/).map((block) => {
            const event = (block.match(/^event:\s*(.+)$/m) || [])[1];
            const data = (block.match(/^data:\s*(.+)$/m) || [])[1];
            if (event === 'done' && data) return JSON.parse(data).text || '';
            return '';
          }).join('');
          if (reply) return reply;
        }
      } catch (e) { /* fallback */ }
    }
    // Fallback: API Platform direto
    const res = await window.FENIX.apiPlatform.chat([{ role: 'user', content: text }]);
    return res.content;
  }

  function initFenixChat() {
    const sendBtn  = document.getElementById('masterCmdSubmit');
    const inputEl  = document.getElementById('masterPrompt');
    const histEl   = document.getElementById('orchChatLog');

    if (!sendBtn || !inputEl || !histEl) return;

    // T05: Carregar histórico persistido
    let chatMsgs = loadChatHistory();
    if (chatMsgs.length > 0) {
      histEl.innerHTML = '';
      chatMsgs.forEach(function(m) { renderChatBubble(histEl, m.role, m.text, m.ts); });
    }

    // T10: Botão de limpar conversa
    const chatCard = histEl.closest('.orch-chat-card') || (histEl.closest('.orch-chat-layout') && histEl.closest('.orch-chat-layout').parentElement);
    if (chatCard) {
      const header = chatCard.querySelector('.orch-card-header');
      if (header && !header.querySelector('#btnClearChat')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'btnClearChat';
        clearBtn.title = 'Limpar conversa';
        clearBtn.style.cssText = 'background:none; border:1px solid rgba(239,68,68,0.3); border-radius:4px; color:#ef4444; font-size:9px; padding:2px 7px; cursor:pointer; font-weight:700; letter-spacing:0.05em; margin-left:4px;';
        clearBtn.textContent = '\uD83D\uDDD1 LIMPAR';
        clearBtn.addEventListener('click', function() {
          chatMsgs = [];
          saveChatHistory(chatMsgs);
          histEl.innerHTML = '<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> Conversa limpa. Como posso ajudar?<div class="orch-chat-checklist"><div class="orch-chat-checklist-item done"><i class="ph-fill ph-check-circle"></i> Verificação de integridade</div><div class="orch-chat-checklist-item done"><i class="ph-fill ph-check-circle"></i> Sincronização de nós</div><div class="orch-chat-checklist-item done"><i class="ph-fill ph-check-circle"></i> Escuta ativa em tempo real</div></div></div>';
        });
        header.appendChild(clearBtn);
      }
    }

    async function handleSend() {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      inputEl.focus();

      const ts = chatTimestamp();
      renderChatBubble(histEl, 'user', text, ts);
      chatMsgs.push({ role: 'user', text: text, ts: ts });
      saveChatHistory(chatMsgs);

      if (pendingProposal && /^(sim|confirmar|confirmo|pode iniciar|iniciar|ok|bora|start)\b/i.test(text)) {
        const proposal = pendingProposal;
        pendingProposal = null;
        try {
          const missionRes = await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
            body: JSON.stringify({ title: proposal.name, name: proposal.name, objective: proposal.objective, autoApprove: true, steps: [{ key: 'audit', type: 'audit' }, { key: 'inspect', type: 'inspect', dependsOn: ['audit'] }] }),
          });
          const mission = await missionRes.json().catch(() => ({}));
          let started = false;
          const missionId = mission.id || mission.missionId;
          if (missionRes.ok && missionId) {
            const startRes = await fetch(`/api/missions/${encodeURIComponent(missionId)}/start`, {
              method: 'POST',
              headers: { ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
            });
            started = startRes.ok;
          }
          const reply = missionRes.ok && started
            ? `Autorização recebida. Missão ${proposal.name} criada e iniciada no Mission Runtime (${missionId}). Acompanhe o DAG pelos eventos e jobs.`
            : missionRes.ok
              ? `Missão ${proposal.name} foi criada (${missionId}), mas o runtime não confirmou o início. Verifique a Central de Missões.`
            : `Não foi possível criar a missão: ${mission.error || 'o runtime recusou a solicitação'}.`;
          renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
          chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
          saveChatHistory(chatMsgs);
          window.dispatchEvent(new CustomEvent('fenix-mission-updated'));
        } catch (error) {
          renderChatBubble(histEl, 'fenix', `Falha ao criar missão: ${error.message}`, chatTimestamp());
        }
        return;
      }

      // T06: Indicador pensando animado
      const thinkEl = document.createElement('div');
      thinkEl.style.cssText = 'display:flex; align-items:center; gap:6px; margin:5px 0; animation:fenixFadeIn 0.2s ease;';
      thinkEl.innerHTML = '<span style="font-size:16px;">🤖</span><div style="background:rgba(15,15,30,0.85); border:1px solid rgba(255,255,255,0.1); border-radius:2px 12px 12px 12px; padding:7px 12px; font-size:11px; color:#64748b; font-style:italic;" id="fenixThinkDot">pensando...</div>';
      histEl.appendChild(thinkEl);
      histEl.scrollTop = histEl.scrollHeight;

      // Animar os pontos
      let dots = 0;
      const thinkInterval = setInterval(function() {
        const dotEl = document.getElementById('fenixThinkDot');
        if (dotEl) { dots = (dots + 1) % 4; dotEl.textContent = 'pensando' + '.'.repeat(dots || 1); }
      }, 400);

      const statusBadge = document.getElementById('chatStatusBadge');
      if (statusBadge) { statusBadge.textContent = 'PENSANDO'; statusBadge.className = 'orch-status-pill exec'; }

      try {
        // O chat visível precisa passar pelo roteador operacional antes da
        // inferência direta. Assim uma instrução de trabalho não vira apenas
        // texto: o ChatAgent classifica, executa ações seguras e propõe uma
        // missão real quando houver alteração ou execução prolongada.
        let routed = null;
        let classification = null;
        try {
          const intentRes = await fetch('/api/chat/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
            body: JSON.stringify({ message: text }),
            signal: AbortSignal.timeout(15000),
          });
          if (intentRes.ok) classification = (await intentRes.json()).classification;
        } catch (_) { /* inferência direta continua sendo um fallback válido */ }

        if (classification?.requiresConfirmation || ['LONG_MISSION', 'CODE_CHANGE'].includes(classification?.category)) {
          const name = classification.proposal?.name || 'Missão FÊNIX';
          pendingProposal = { name, objective: text };
          const reply = `Solicitação classificada como trabalho governado. Posso criar uma missão auditável para executar: ${name}. Responda "sim" para autorizar.`;
          clearInterval(thinkInterval); thinkEl.remove();
          renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
          chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
          saveChatHistory(chatMsgs);
          if (statusBadge) { statusBadge.textContent = 'AGUARDANDO AUTORIZAÇÃO'; statusBadge.className = 'orch-status-pill exec'; }
          return;
        }

        try {
          const routedRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
            body: JSON.stringify({ message: text }),
            signal: AbortSignal.timeout(60000),
          });
          if (routedRes.ok) routed = await routedRes.json();
        } catch (_) { /* inferência direta continua sendo um fallback válido */ }

        const reply = routed?.reply || routed?.facts?.note || await fenixChatSend(text);
        clearInterval(thinkInterval);
        thinkEl.remove();

        const replyTs = chatTimestamp();
        renderChatBubble(histEl, 'fenix', reply, replyTs);
        chatMsgs.push({ role: 'fenix', text: reply, ts: replyTs });
        saveChatHistory(chatMsgs);

        if (statusBadge) { statusBadge.textContent = 'PRONTO'; statusBadge.className = 'orch-status-pill online'; }
      } catch (err) {
        clearInterval(thinkInterval);
        thinkEl.remove();
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'color:#ef4444; font-size:10px; padding:4px 8px; margin:4px 0;';
        errDiv.textContent = '\u26A0 Erro: ' + (err.message || 'Falha na comunicação');
        histEl.appendChild(errDiv);
        histEl.scrollTop = histEl.scrollHeight;
        if (statusBadge) { statusBadge.textContent = 'ERRO'; statusBadge.className = 'orch-status-pill fail'; }
      }
    }

    // T03: botão enviar
    sendBtn.addEventListener('click', handleSend);

    // T09: Enter envia
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // Keyframes de animação
    if (!document.getElementById('fenix-chat-anim-style')) {
      const style = document.createElement('style');
      style.id = 'fenix-chat-anim-style';
      style.textContent = '@keyframes fenixFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }';
      document.head.appendChild(style);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFenixChat);
  } else {
    initFenixChat();
  }

})();
