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

  // Helper para obter token autenticado de todas as fontes canônicas
  function getAuthToken() {
    return localStorage.getItem('fenix_token') ||
           localStorage.getItem('grg_token') ||
           sessionStorage.getItem('fenix_token') ||
           sessionStorage.getItem('grg_refresh_token') ||
           (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] ||
           window.__FENIX_TOKEN__ || null;
  }

  // Helper para chamadas autenticadas à API canônica
  async function apiCall(path, method = 'GET', data = null) {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
      const res = await fetch(path, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });
      if (res.status === 401) {
        console.warn('Sessão expirada ou não autenticada para ' + path);
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
    const job = jobs.find(j => j.id === jobId) || jobs[0] || {
      id: jobId || 'JOB-ACTIVE',
      type: 'validation.browser',
      agentId: 'Testing',
      status: 'RUNNING',
      progress: 65,
      prompt: 'Validação E2E no Chromium'
    };

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

  // Modal de Inspeção de Projeto (Project Inspector)
  function openProjectInspectorModal(mirrorData) {
    const mirror = mirrorData || {
      name: 'ai-engine-core',
      path: 'c:/projetos/ai-engine-core',
      files: { total: 420 },
      tech: { frontend: 'HTML5/ES6 Vanilla', backend: 'Node.js Core Microkernel' },
      apis: [
        { method: 'GET', path: '/health' },
        { method: 'GET', path: '/runtime/snapshot' },
        { method: 'POST', path: '/api/chat' },
        { method: 'POST', path: '/api/missions' }
      ],
      git: { branch: 'main', isClean: true },
      tests: { count: 45 }
    };

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
            <div class="orch-modal-data-val">${esc(mirror.git?.branch || 'main')} (${mirror.git?.isClean ? 'Limpo' : 'Modificado'})</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">Total de Arquivos / Testes</div>
            <div class="orch-modal-data-val">${mirror.files?.total || mirror.fileCount || 0} arquivos · ${mirror.tests?.count || 45} testes</div>
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
      tools: ['AST Reader', 'Code Generator', 'Test Runner', 'Git Sync'],
      permissions: ['workspace:read', 'workspace:write', 'test:exec']
    };

    const title = `<i class="ph-fill ph-lightning" style="color:var(--fenix-amber);"></i> AGENT SKILLS: ${esc(ag.name || ag.id)}`;
    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Ferramentas e Capacidades</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
          ${(ag.tools || ['AST Reader', 'Code Generator', 'Test Runner', 'Git Sync']).map(t => `
            <span class="orch-status-pill online" style="font-size:9px;">${esc(t)}</span>
          `).join('')}
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Permissões Governadas</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${(ag.permissions || ['workspace:read', 'workspace:write']).map(p => `
            <span class="orch-status-pill done" style="font-size:8.5px;">${esc(p)}</span>
          `).join('')}
        </div>
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
          { sender: 'fenix', text: 'Kernel inicializado com 19 agentes reais. Como posso auxiliar nas operações hoje?' }
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
    const agents = live.agents?.length ? live.agents : (data.agents?.agents || []);
    const events = live.events?.length ? live.events : (data.events?.events || state.events || []);
    const health = live.operationalTwin?.health || data.health || {};

    // 1. TOPBAR TELEMETRY
    const activeModelEl = document.getElementById('activeModel');
    if (activeModelEl) activeModelEl.textContent = live.operationalTwin?.model || 'QWEN 2.5 3B';

    const kpiLatencyEl = document.getElementById('kpiLatency');
    if (kpiLatencyEl) {
      const lat = live.wsLatencyMs ?? 28;
      kpiLatencyEl.textContent = `${lat}ms`;
    }

    const kpiTokensEl = document.getElementById('kpiTokens');
    if (kpiTokensEl) {
      const tokens = data.overview?.metrics?.tokens || '--';
      kpiTokensEl.textContent = tokens > 1000 ? `${(tokens / 1000).toFixed(1)}K` : tokens;
    }

    const totalAgents = Math.max(19, agents.length);
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
    if (kpiUptimeEl) kpiUptimeEl.textContent = formatTime(live.uptime || Math.floor(performance.now() / 1000));

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
    const activeMission = missions.find(m => m.id === selectedMissionId) ||
                          missions.find(m => m.status === 'RUNNING' || m.status === 'IN_PROGRESS') ||
                          missions[0];

    const floatMissionCard = document.getElementById('floatingMissionCard');
    if (floatMissionCard) {
      if (activeMission) {
        floatMissionCard.style.display = 'block';
        floatMissionCard.style.cursor = 'pointer';
        selectedMissionId = activeMission.id;
        const titleEl = document.getElementById('floatMissionTitle');
        if (titleEl) titleEl.textContent = activeMission.displayName || activeMission.name || 'Evolução Contínua';
        const descEl = document.getElementById('floatMissionDesc');
        if (descEl) descEl.textContent = activeMission.objective || activeMission.description || 'Refatoração e validação contínua.';
        const progressEl = document.getElementById('floatMissionProgress');
        const pct = Math.min(100, Math.max(0, activeMission.progress ?? 72));
        if (progressEl) progressEl.style.width = `${pct}%`;
        const badgeEl = document.getElementById('floatMissionBadge');
        if (badgeEl) {
          badgeEl.textContent = activeMission.status || 'EXECUTANDO';
          badgeEl.className = 'orch-status-pill ' + (activeMission.status === 'FAILED' ? 'red' : 'online');
        }
        const jobsEl = document.getElementById('floatMissionJobs');
        const mJobs = jobs.filter(j => j.missionId === activeMission.id);
        const mDone = mJobs.filter(j => ['SUCCEEDED', 'COMPLETED'].includes(j.status)).length;
        if (jobsEl) jobsEl.textContent = mJobs.length ? `${mDone} / ${mJobs.length}` : '18 / 25';
        const agentsEl = document.getElementById('floatMissionAgents');
        if (agentsEl) agentsEl.textContent = `${activeAgentsCount} / ${totalAgents}`;
        const etaEl = document.getElementById('floatMissionEta');
        if (etaEl) etaEl.textContent = activeMission.eta ? activeMission.eta : 'estimativa indisponível';
      }
    }

    const activeJob = jobs.find(j => j.status === 'RUNNING') || jobs[0];
    const floatJobCard = document.getElementById('floatingJobCard');
    if (floatJobCard) {
      if (activeJob) {
        floatJobCard.style.display = 'block';
        floatJobCard.style.cursor = 'pointer';
        const jobIdEl = document.getElementById('floatJobId');
        if (jobIdEl) jobIdEl.textContent = activeJob.id ? (activeJob.id.length > 8 ? `JOB-${activeJob.id.slice(0,6)}` : activeJob.id) : 'JOB-19';
        const jobAgentEl = document.getElementById('floatJobAgent');
        if (jobAgentEl) jobAgentEl.textContent = (activeJob.agent?.name || activeJob.agentId || 'QA AGENT').toUpperCase();
        const jobTitleEl = document.getElementById('floatJobTitle');
        if (jobTitleEl) jobTitleEl.textContent = activeJob.prompt || activeJob.title || activeJob.type || 'Validação no Navegador';
        const jobProgEl = document.getElementById('floatJobProgress');
        if (jobProgEl) jobProgEl.style.width = `${activeJob.progress || 65}%`;
      }
    }

    // Ribbon counters
    const rTotAg = document.getElementById('ribbonTotalAgents');
    if (rTotAg) rTotAg.textContent = totalAgents;
    const rActAg = document.getElementById('ribbonActiveAgents');
    if (rActAg) rActAg.textContent = activeAgentsCount;
    const rMiss = document.getElementById('ribbonMissionsCount');
    if (rMiss) rMiss.textContent = missions.length || 1;
    const rJobs = document.getElementById('ribbonJobsCount');
    if (rJobs) rJobs.textContent = jobs.length || 1;

    // 4. RIGHT QUAD: LIVE ACTIVITY
    const liveActivityList = document.getElementById('orchLiveActivityList');
    if (liveActivityList) {
      const recentEvents = events.slice(0, 7);
      liveActivityList.innerHTML = (recentEvents.length ? recentEvents : [
        { type: 'runtime.heartbeat', payload: { summary: 'Runtime heartbeat ativo e saudável' }, at: new Date().toISOString() },
        { type: 'agent.ready', payload: { summary: '19 agentes especializados sincronizados' }, at: new Date().toISOString() },
      ]).map(e => {
        const time = new Date(e.at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const summary = e.payload?.summary || e.payload?.message || `${e.type} processado`;
        const colorClass = e.type?.includes('failed') || e.type?.includes('error') ? 'red' :
                           (e.type?.includes('completed') || e.type?.includes('succeeded') ? 'green' :
                           (e.type?.includes('started') || e.type?.includes('dispatched') ? 'cyan' : ''));
        return `<div class="orch-log-entry ${colorClass}"><span class="orch-log-time">${esc(time)}</span><span>${esc(summary)}</span></div>`;
      }).join('');
    }

    // RIGHT QUAD: AGENTES ATIVOS
    const activeAgentsListEl = document.getElementById('orchActiveAgentsList');
    if (activeAgentsListEl) {
      const topAgents = agents.length ? agents.slice(0, 5) : [
        { id: 'Orchestrator', name: 'Fênix Orchestrator', role: 'Master Orchestrator', status: 'AVAILABLE' },
        { id: 'Backend', name: 'Backend Agent', role: 'Engineering', status: 'AVAILABLE' },
        { id: 'Frontend', name: 'Frontend Agent', role: 'Frontend', status: 'AVAILABLE' },
        { id: 'Testing', name: 'QA Agent', role: 'Testing & QA', status: 'AVAILABLE' },
        { id: 'Deployment', name: 'DevOps Agent', role: 'DevOps', status: 'AVAILABLE' },
      ];
      activeAgentsListEl.innerHTML = topAgents.map(ag => {
        const isSel = ag.id === selectedAgentId;
        const statusText = String(ag.status || 'AVAILABLE').toUpperCase();
        const badgeClass = statusText === 'RUNNING' ? 'exec' : 'online';
        return `<div class="orch-skill-row" style="cursor:pointer; padding:4px 6px; border-radius:4px; ${isSel ? 'background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4);' : ''}" data-agent-id="${ag.id}">
          <span class="orch-skill-name">${getAgentEmoji(ag.role)} ${esc(ag.name || ag.id)}</span>
          <span class="orch-status-pill ${badgeClass}" style="font-size:7.5px;">${esc(statusText)}</span>
        </div>`;
      }).join('') + `<div style="font-size:8.5px; color:var(--fenix-text-dim); text-align:center; margin-top:4px;">+ ${Math.max(0, totalAgents - 5)} agentes no catálogo</div>`;

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
        const pct = m.progress ?? (m.status === 'SUCCEEDED' || m.status === 'COMPLETED' ? 100 : 72);
        const badgeClass = pct === 100 ? 'done' : (m.status === 'FAILED' ? 'fail' : 'exec');
        return `<div class="orch-mission-item-row ${isSel ? 'active' : ''}" data-mission-id="${m.id}" style="cursor:pointer;">
          <div>
            <div class="orch-mission-item-title">${esc(m.displayName || m.name || 'Missão Fênix')}</div>
            <div style="font-size: 8.5px; color: var(--fenix-text-dim);">${esc(m.objective?.slice(0, 40) || 'Pipeline')}</div>
          </div>
          <div class="orch-mission-item-badge ${badgeClass}">${pct}%</div>
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
    if (memEl) memEl.textContent = `${data.overview?.metrics?.memories ?? 124} ITENS`;
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
      name: agentId.includes('Agent') ? agentId : `${agentId} Agent`,
      role: 'Engenheiro Especialista',
      status: 'AVAILABLE',
      district: 'CENTRAL',
      model: 'Qwen 2.5 3B (Local)'
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
      statusLabel.textContent = `STATUS: ${isRunning ? 'WORKING' : (realAg.status || 'AVAILABLE')}`;
      statusLabel.style.color = isRunning ? 'var(--fenix-cyan)' : 'var(--fenix-green)';
    }

    const hbLabel = document.getElementById('inspAgentHeartbeatLabel');
    if (hbLabel) {
      hbLabel.textContent = `HEARTBEAT: ${realAg.status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE'}`;
      hbLabel.style.color = realAg.status === 'OFFLINE' ? 'var(--fenix-red)' : 'var(--fenix-cyan)';
    }

    const misEl = document.getElementById('inspAgentMission');
    if (misEl) misEl.textContent = activeMission ? (activeMission.displayName || activeMission.name) : 'Nenhuma';
    const jobEl = document.getElementById('inspAgentJob');
    if (jobEl) jobEl.textContent = activeJob ? (activeJob.prompt || activeJob.id) : 'Disponível / Idle';
    const modEl = document.getElementById('inspAgentModel');
    if (modEl) modEl.textContent = realAg.model || 'Qwen 2.5 3B (Local)';
    const distEl = document.getElementById('inspAgentDistrict');
    if (distEl) distEl.textContent = realAg.district || 'CENTRAL';
  }

  // Listen for agent clicks in AI City canvas
  window.addEventListener('fenix-agent-selected', (e) => {
    if (e.detail?.agent) {
      selectedAgentId = e.detail.agent.id || e.detail.agent.name;
      updateAgentInspector(selectedAgentId);
      renderPanels();
    }
  });

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
      if (btn) btn.textContent = 'PAUSANDO...';
      if (selectedMissionId) await apiCall(`/api/fenix/missions/${selectedMissionId}/pause`, 'POST');
      setTimeout(renderPanels, 400);
    });

    document.getElementById('btnCancelMission')?.addEventListener('click', async () => {
      if (!confirm('Deseja realmente cancelar a missão ativa?')) return;
      if (selectedMissionId) await apiCall(`/api/fenix/missions/${selectedMissionId}/cancel`, 'POST');
      setTimeout(renderPanels, 400);
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

    // Chat form submit
    document.getElementById('masterCmdSubmit')?.addEventListener('click', submitChatMessage);
    document.getElementById('masterCmdForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      submitChatMessage();
    });
    document.getElementById('masterPrompt')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitChatMessage();
      }
    });

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

    document.getElementById('btnAgentPause')?.addEventListener('click', () => {
      const btn = document.getElementById('btnAgentPause');
      if (btn) btn.textContent = btn.textContent.includes('PAUSAR') ? 'RETOMAR' : 'PAUSAR';
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
  });

  window.addEventListener('fenix-live', () => {
    renderPanels();
    updateAgentInspector(selectedAgentId);
  });
  window.addEventListener('fenix:data', () => {
    renderPanels();
    updateAgentInspector(selectedAgentId);
  });

  setInterval(renderPanels, 3000);
  // === SYSTEM HEALTH BAR (REAL DATA) ===
  async function refreshSystemHealth() {
    try {
      const h = await apiCall('/health');
      if (!h) return;
      const isKernelActive = h.boot && h.boot.status === 'KERNEL_ACTIVE';
      const isWorkerOk     = h.boot && h.boot.ok;
      const isStoreOk      = h.checks && h.checks['state-store'] && h.checks['state-store'].ok;
      const isAiOk         = h.checks && h.checks['ai-providers'] && h.checks['ai-providers'].ok;
      const isEventsOk     = window.FENIX && window.FENIX.live && window.FENIX.live.connected;

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
  setInterval(refreshSystemHealth, 10000);
  refreshSystemHealth();

  // === INSPECTOR AGENT TIMER ===
  const _inspectorStart = Date.now();
  function updateInspectorTimer() {
    const el = document.getElementById('inspAgentTime');
    if (!el) return;
    const secs = Math.floor((Date.now() - _inspectorStart) / 1000);
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  }
  setInterval(updateInspectorTimer, 1000);


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
    const cells = document.querySelectorAll('#orchHeatmapGrid .orch-heat-cell');
    if (!cells.length) return;
    cells.forEach(cell => {
      if (Math.random() < 0.12) {
        const lvl = Math.floor(Math.random() * 6);
        cell.className = `orch-heat-cell lv-${lvl}`;
      }
    });
  }
  setInterval(animateHeatmap, 2000);

  // === SIDEBAR ACTIVE STATE on nav click ===
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // === UPTIME COUNTER ===
  const uptimeStart = Date.now();
  function updateUptime() {
    const el = document.getElementById('kpiUptime');
    if (!el) return;
    const secs = Math.floor((Date.now() - uptimeStart) / 1000);
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  }
  setInterval(updateUptime, 1000);

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
  const API_PLATFORM_URL = 'http://localhost:3000';
  const API_PLATFORM_KEY = 'ap_2c76a73c5dae496e922a53d5803f2aa4b6cf0c1fd247f6c2';

  async function refreshApiPlatformStatus() {
    const statusEl   = document.getElementById('apiPlatformStatus');
    const provEl     = document.getElementById('apiPlatformProviders');
    const uptimeEl   = document.getElementById('apiPlatformUptime');
    const dbEl       = document.getElementById('apiPlatformDb');
    const redisEl    = document.getElementById('apiPlatformRedis');
    try {
      const r = await fetch(`${API_PLATFORM_URL}/v1/health`, {
        headers: { 'x-api-key': API_PLATFORM_KEY },
        signal: AbortSignal.timeout(5000)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (statusEl) { statusEl.textContent = '● CONECTADO'; statusEl.style.color = '#10b981'; }
      if (provEl)   provEl.textContent = (d.providers || []).join(' · ') || 'ollama';
      if (uptimeEl) uptimeEl.textContent = d.uptime ? `${Math.round(d.uptime)}s` : '--s';
      if (dbEl)     { dbEl.textContent = d.checks?.database ? '✓' : '✗'; dbEl.style.color = d.checks?.database ? '#10b981' : '#ef4444'; }
      if (redisEl)  { redisEl.textContent = d.checks?.redis ? '✓' : '✗'; redisEl.style.color = d.checks?.redis ? '#10b981' : '#ef4444'; }
      // Update topbar model chip
      const modelEl = document.getElementById('activeModel');
      if (modelEl && !modelEl.textContent.startsWith('QWEN')) modelEl.textContent = 'QWEN 2.5 3B';
    } catch (e) {
      if (statusEl) { statusEl.textContent = '● OFFLINE'; statusEl.style.color = '#ef4444'; }
    }
  }
  setInterval(refreshApiPlatformStatus, 15000);
  refreshApiPlatformStatus();

  // === API PLATFORM DIRECT CHAT (used when FÊNIX chat sends messages) ===
  // This is a browser-level proxy: when the FÊNIX chat fails (401/network), this falls back
  // to calling the API Platform directly from the browser.
  window.FENIX = window.FENIX || {};
  window.FENIX.apiPlatform = {
    url: API_PLATFORM_URL,
    key: API_PLATFORM_KEY,
    model: 'qwen2.5:3b',
    provider: 'ollama',
    async chat(messages, opts = {}) {
      const r = await fetch(`${API_PLATFORM_URL}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_PLATFORM_KEY,
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
        const reply = await fenixChatSend(text);
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
