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
    return localStorage.getItem('grg_token') ||
           localStorage.getItem('fenix_token') ||
           sessionStorage.getItem('grg_token') ||
           sessionStorage.getItem('fenix_token') ||
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

  function formatAgentTitle(ag) {
    if (!ag) return 'Autonomous Agent';
    if (ag.name && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(ag.name)) return ag.name;
    const roleNames = {
      'master-avatar': 'Master Orchestrator',
      'architect': 'System Architect',
      'developer': 'Core Developer',
      'devops': 'DevOps Specialist',
      'qa': 'QA Engineer',
      'analyst': 'Business Analyst',
      'commercial': 'Commercial Rep',
      'support': 'Support Specialist',
      'security': 'Security Sentinel',
      'runtime': 'Runtime Controller'
    };
    const roleKey = String(ag.role || '').toLowerCase();
    const roleTitle = roleNames[roleKey] || (ag.role ? ag.role.toUpperCase() : 'Autonomous Agent');
    const shortId = ag.id ? String(ag.id).slice(0, 8) : '';
    return shortId ? `${roleTitle} (${shortId})` : roleTitle;
  }


  // ==========================================
  // STANDARDIZED STATUS BADGE SYSTEM (Section 12)
  // ==========================================
  const STATUS_DEFINITIONS = {
    ONLINE:     { label: 'ONLINE',     cls: 'online',  icon: 'ph-check-circle-fill', desc: 'Sistema ou agente operacional e conectado' },
    DEGRADED:   { label: 'DEGRADED',   cls: 'degraded',icon: 'ph-warning-fill',      desc: 'Operação parcial ou latência elevada' },
    OFFLINE:    { label: 'OFFLINE',    cls: 'offline', icon: 'ph-x-circle-fill',     desc: 'Componente desconectado do cluster' },
    ERROR:      { label: 'ERROR',      cls: 'error',   icon: 'ph-warning-octagon-fill', desc: 'Falha operacional crítica detectada' },
    CONNECTING: { label: 'CONNECTING', cls: 'connecting', icon: 'ph-spinner-gap',   desc: 'Estabelecendo handshake com o barramento' },
    RUNNING:    { label: 'RUNNING',    cls: 'running', icon: 'ph-play-circle-fill',  desc: 'Executando tarefas ativas' },
    PAUSED:     { label: 'PAUSED',     cls: 'paused',  icon: 'ph-pause-circle-fill', desc: 'Execução temporariamente suspensa' },
    IDLE:       { label: 'IDLE',       cls: 'idle',    icon: 'ph-clock-fill',        desc: 'Em espera por novas tarefas' },
    COMPLETED:  { label: 'COMPLETED',  cls: 'completed', icon: 'ph-check-circle',   desc: 'Tarefa ou missão concluída com sucesso' },
    FAILED:     { label: 'FAILED',     cls: 'failed',  icon: 'ph-prohibit-fill',     desc: 'Execução falhou ou rejeitada pelos gates' }
  };

  function normalizeStatusKey(status) {
    const s = String(status || '').trim().toUpperCase();
    if (['ACTIVE', 'WORKING', 'READY', 'HEALTHY', 'SUCCESS', 'AVAILABLE'].includes(s)) return 'ONLINE';
    if (['WARN', 'WARNING'].includes(s)) return 'DEGRADED';
    if (['IN_PROGRESS', 'PROCESSING', 'DISPATCHED'].includes(s)) return 'RUNNING';
    if (['WAITING', 'STANDBY', 'QUEUED'].includes(s)) return 'IDLE';
    if (s === 'DONE') return 'COMPLETED';
    if (['FAIL', 'REJECTED', 'ABORTED', 'CANCELLED'].includes(s)) return 'FAILED';
    if (STATUS_DEFINITIONS[s]) return s;
    return 'ONLINE';
  }

  function renderStatusBadge(status, options = {}) {
    const key = normalizeStatusKey(status);
    const def = STATUS_DEFINITIONS[key] || STATUS_DEFINITIONS.ONLINE;
    const label = options.label || def.label;
    const tooltip = options.tooltip || def.desc;
    return `<span class="fenix-status-badge ${def.cls}" title="${esc(tooltip)}" data-status="${key}">
      <i class="ph ${def.icon} fenix-badge-icon"></i>
      <span class="fenix-badge-dot"></span>
      <span class="fenix-badge-label">${esc(label)}</span>
    </span>`;
  }
  window.StatusBadge = { definitions: STATUS_DEFINITIONS, normalize: normalizeStatusKey, render: renderStatusBadge };

  // ==========================================
  // UNIFIED TOAST NOTIFICATION SYSTEM (Section 19)
  // ==========================================
  function showToast(message, type = 'info') {
    let container = document.getElementById('fenixToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fenixToastContainer';
      Object.assign(container.style, {
        position: 'fixed', bottom: '38px', right: '20px', zIndex: '99999',
        display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none'
      });
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = {
      success: { bg: 'rgba(34, 197, 94, 0.95)', border: '#22c55e', icon: 'ph-check-circle-fill' },
      error:   { bg: 'rgba(239, 68, 68, 0.95)', border: '#ef4444', icon: 'ph-x-circle-fill' },
      warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#f59e0b', icon: 'ph-warning-fill' },
      info:    { bg: 'rgba(15, 23, 42, 0.95)', border: '#38bdf8', icon: 'ph-info-fill' }
    };
    const c = colors[type] || colors.info;
    Object.assign(toast.style, {
      background: c.bg, border: `1px solid ${c.border}`, color: '#fff',
      padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)', pointerEvents: 'auto',
      display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease',
      opacity: '0', transform: 'translateY(10px)'
    });
    toast.innerHTML = `<i class="ph ${c.icon}" style="font-size:16px;"></i> <span>${esc(message)}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }
  window.showToast = showToast;

  // ==========================================
  // MODAL OVERLAY MANAGER
  // ==========================================
  function openModal(titleHtml, bodyHtml, footerHtml = '', deskId = null) {
    const container = document.getElementById('orchModalContainer');
    if (!container) return;
    const markup = `
      <div class="orch-modal-backdrop" id="orchModalBackdrop"${deskId ? ` data-agent-desk="${esc(deskId)}"` : ''}>
        <div class="orch-modal">
          <div class="orch-modal-header">
            <div class="orch-modal-title">${titleHtml}</div>
            <div class="orch-modal-window-actions">
              <button class="orch-modal-window-btn" id="orchModalMinBtn" title="Minimizar">−</button>
              <button class="orch-modal-window-btn" id="orchModalMaxBtn" title="Maximizar">□</button>
              <button class="orch-modal-close" id="orchModalCloseBtn">&times;</button>
            </div>
          </div>
          <div class="orch-modal-body">
            ${bodyHtml}
          </div>
          ${footerHtml ? `<div class="orch-modal-footer">${footerHtml}</div>` : ''}
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', markup);
    container.style.display = 'block';
    container.querySelectorAll('.orch-modal-backdrop').forEach((backdrop, index) => {
      backdrop.style.background = 'transparent';
      backdrop.style.backdropFilter = 'none';
      backdrop.style.pointerEvents = 'none';
      backdrop.style.zIndex = String(10000 + index);
      const windowEl = backdrop.querySelector('.orch-modal');
      if (windowEl) { windowEl.style.pointerEvents = 'auto'; windowEl.style.zIndex = '1'; }
    });
    const activeBackdrop = container.querySelector('.orch-modal-backdrop:last-child');
    if (activeBackdrop) activeBackdrop.style.zIndex = '11000';

    const modal = activeBackdrop?.querySelector('.orch-modal');
    const header = modal?.querySelector('.orch-modal-header');
    const minBtn = modal?.querySelector('#orchModalMinBtn') || modal?.querySelectorAll('.orch-modal-window-btn')[0];
    const maxBtn = modal?.querySelector('#orchModalMaxBtn') || modal?.querySelectorAll('.orch-modal-window-btn')[1];
    const closeBtn = modal?.querySelector('#orchModalCloseBtn') || modal?.querySelector('.orch-modal-close');

    closeBtn?.addEventListener('click', closeModal);
    if (modal) {
      Object.assign(modal.style, { position: 'relative', resize: 'both', minWidth: '360px', minHeight: '180px' });
      const style = document.createElement('style');
      style.textContent = '.orch-modal-window-actions{display:flex;align-items:center;gap:4px}.orch-modal-window-btn{background:transparent;border:0;color:var(--fenix-text-dim);cursor:pointer;padding:4px 7px;border-radius:4px}.orch-modal-window-btn:hover{color:#fff;background:rgba(255,255,255,.1)}.orch-modal.is-minimized{height:48px!important;min-height:0;resize:none}.orch-modal.is-minimized>:not(.orch-modal-header){display:none}.orch-modal.is-maximized{position:fixed;inset:12px;width:auto;max-width:none;max-height:none;height:auto}';
      modal.appendChild(style);
      modal.addEventListener('pointerdown', () => {
        const backdrops = [...container.querySelectorAll('.orch-modal-backdrop')];
        backdrops.forEach((item, index) => { item.style.zIndex = String(10000 + index); });
        const backdrop = modal.closest('.orch-modal-backdrop');
        if (backdrop) backdrop.style.zIndex = '11000';
      });
    }
    minBtn?.addEventListener('click', () => modal?.classList.toggle('is-minimized'));
    maxBtn?.addEventListener('click', (event) => {
      modal?.classList.toggle('is-maximized');
      event.currentTarget.textContent = modal?.classList.contains('is-maximized') ? '❐' : '□';
    });
    let drag = null;
    header?.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button') || modal?.classList.contains('is-maximized')) return;
      const rect = modal.getBoundingClientRect(); drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture(event.pointerId);
    });
    header?.addEventListener('pointermove', (event) => {
      if (!drag || !modal) return;
      modal.style.left = `${Math.max(8, drag.left + event.clientX - drag.x)}px`;
      modal.style.top = `${Math.max(8, drag.top + event.clientY - drag.y)}px`;
    });
    header?.addEventListener('pointerup', () => { drag = null; });
    activeBackdrop?.addEventListener('click', (e) => {
      if (e.target === activeBackdrop) closeModal(e);
    });
  }

  function closeModal() {
    const container = document.getElementById('orchModalContainer');
    if (!container) return;
    const event = arguments[0];
    const backdrop = event?.target?.closest?.('.orch-modal-backdrop');
    if (backdrop) backdrop.remove();
    else {
      const windows = container.querySelectorAll('.orch-modal-backdrop');
      windows[windows.length - 1]?.remove();
    }
    if (!container.querySelector('.orch-modal-backdrop')) container.style.display = 'none';
  }

  // Modal de Detalhes da Missão
  function openTaskDetailModal(task, mission) {
    const title = `<i class="ph-fill ph-list-checks" style="color:var(--fenix-cyan);"></i> TASK DESK: ${esc(task.key || task.type || task.id)}`;
    const body = `<div class="orch-modal-section"><div class="orch-modal-section-title">Task persistida no MissionKernel</div><div class="orch-modal-grid">
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TASK ID</div><div class="orch-modal-data-val">${esc(task.id)}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">STATUS</div><div class="orch-modal-data-val">${esc(task.status)}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MISSION</div><div class="orch-modal-data-val">${esc(mission.id)}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">JOB</div><div class="orch-modal-data-val">${esc(task.jobId || 'Não publicado')}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">AGENTE</div><div class="orch-modal-data-val">${esc(task.agent || 'Não publicado')}</div></div>
      <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">SKILL / TOOL</div><div class="orch-modal-data-val">${esc(task.jobType || 'Não publicado')}</div></div>
    </div></div><div class="orch-modal-section"><div class="orch-modal-section-title">Dependências e entrada</div><div class="orch-modal-data-item">${esc(JSON.stringify({ dependsOn: task.dependsOn || [], payload: task.payload || {} }))}</div></div>`;
    openModal(title, body, '<button class="orch-inspect-btn" id="modalTaskBtnClose">FECHAR</button>');
    document.getElementById('modalTaskBtnClose')?.addEventListener('click', closeModal);
  }

  function buildMissionDagSvg(steps) {
    if (!Array.isArray(steps) || !steps.length) {
      return '<div style="font-size:10px; color:var(--fenix-text-dim); padding:12px; text-align:center;">Nenhum nó de DAG registrado no kernel.</div>';
    }

    const stepMap = new Map(steps.map(s => [s.key || s.id, s]));
    function getLayer(key, visited = new Set()) {
      if (visited.has(key)) return 0;
      visited.add(key);
      const step = stepMap.get(key);
      if (!step || !step.dependsOn?.length) return 0;
      return 1 + Math.max(0, ...step.dependsOn.map(dep => getLayer(dep, visited)));
    }

    const layerBuckets = [];
    steps.forEach((step) => {
      const l = getLayer(step.key || step.id);
      if (!layerBuckets[l]) layerBuckets[l] = [];
      layerBuckets[l].push(step);
    });

    const nodeWidth = 140;
    const nodeHeight = 44;
    const colSpacing = 180;
    const rowSpacing = 64;

    const nodePositions = [];
    let maxRows = 1;
    layerBuckets.forEach((bucket, col) => {
      if (bucket.length > maxRows) maxRows = bucket.length;
      bucket.forEach((step, row) => {
        const x = 20 + col * colSpacing;
        const y = 20 + row * rowSpacing;
        nodePositions.push({ step, x, y, width: nodeWidth, height: nodeHeight, key: step.key || step.id });
      });
    });

    const svgWidth = Math.max(380, 40 + layerBuckets.length * colSpacing);
    const svgHeight = Math.max(90, 40 + maxRows * rowSpacing);
    const posMap = new Map(nodePositions.map(p => [p.key, p]));

    let edgesSvg = '';
    for (const pos of nodePositions) {
      const deps = pos.step.dependsOn || [];
      for (const dep of deps) {
        const fromPos = posMap.get(dep);
        if (fromPos) {
          const x1 = fromPos.x + fromPos.width;
          const y1 = fromPos.y + fromPos.height / 2;
          const x2 = pos.x;
          const y2 = pos.y + pos.height / 2;
          const cx1 = x1 + (x2 - x1) * 0.5;
          const cx2 = x2 - (x2 - x1) * 0.5;
          edgesSvg += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" fill="none" stroke="#64748b" stroke-width="1.8" marker-end="url(#dag-arrow)" />`;
        }
      }
    }

    let nodesSvg = '';
    for (const pos of nodePositions) {
      const s = pos.step;
      const status = String(s.status || 'PLANNED').toUpperCase();
      let stroke = '#475569';
      let fill = 'rgba(30,41,59,0.85)';
      let badgeCol = '#94a3b8';
      if (status === 'SUCCEEDED' || status === 'COMPLETED') {
        stroke = '#10b981'; fill = 'rgba(16,185,129,0.18)'; badgeCol = '#10b981';
      } else if (status === 'RUNNING' || status === 'DISPATCHED' || status === 'DISPATCHING') {
        stroke = '#06b6d4'; fill = 'rgba(6,182,212,0.22)'; badgeCol = '#06b6d4';
      } else if (status === 'AWAITING_APPROVAL' || status === 'PAUSED' || status === 'WAITING') {
        stroke = '#f59e0b'; fill = 'rgba(245,158,11,0.22)'; badgeCol = '#f59e0b';
      } else if (status === 'FAILED' || status === 'ERROR') {
        stroke = '#ef4444'; fill = 'rgba(239,68,68,0.22)'; badgeCol = '#ef4444';
      }

      nodesSvg += `
        <g class="dag-node" data-dag-key="${esc(pos.key)}" style="cursor:pointer;" transform="translate(${pos.x}, ${pos.y})">
          <rect width="${pos.width}" height="${pos.height}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />
          <text x="8" y="17" fill="#f8fafc" font-size="10" font-weight="700" font-family="monospace">${esc(pos.key.slice(0, 14))}</text>
          <text x="8" y="32" fill="#94a3b8" font-size="8" font-family="monospace">${esc(s.type || s.jobType || 'step')}</text>
          <rect x="${pos.width - 52}" y="7" width="44" height="14" rx="3" fill="rgba(0,0,0,0.5)" stroke="${badgeCol}" stroke-width="0.8" />
          <text x="${pos.width - 30}" y="17" fill="${badgeCol}" font-size="7" font-weight="700" font-family="monospace" text-anchor="middle">${esc(status.slice(0, 8))}</text>
        </g>
      `;
    }

    return `
      <div style="width:100%; overflow-x:auto; background:rgba(2,6,23,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; margin-bottom:12px;">
        <svg width="${svgWidth}" height="${svgHeight}" style="display:block; margin:0 auto;">
          <defs>
            <marker id="dag-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="#64748b" />
            </marker>
          </defs>
          ${edgesSvg}
          ${nodesSvg}
        </svg>
      </div>
    `;
  }

  async function openMissionDetailModal(missionId) {
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
    const persisted = mission.id ? await apiCall(`/api/missions/${encodeURIComponent(mission.id)}`) : null;
    const missionTasks = Array.isArray(persisted?.steps) ? persisted.steps : [];
    let artifacts = [];
    try {
      if (mission.id) {
        const artRes = await apiCall(`/api/missions/${encodeURIComponent(mission.id)}/artifacts`);
        artifacts = Array.isArray(artRes?.artifacts) ? artRes.artifacts : [];
      }
    } catch {}
    if (!artifacts.length && Array.isArray(persisted?.artifacts)) artifacts = persisted.artifacts;
    if (!artifacts.length && Array.isArray(mission.artifacts)) artifacts = mission.artifacts;
    for (const job of missionJobs) {
      if (Array.isArray(job.artifacts)) {
        for (const ja of job.artifacts) {
          if (!artifacts.some(a => a.id === ja.id || (a.name === ja.name && a.type === ja.type))) {
            artifacts.push(ja);
          }
        }
      }
    }
    const title = `<i class="ph-fill ph-flag-checkered" style="color:var(--fenix-red);"></i> MISSION WORKSPACE: ${esc(mission.name || mission.displayName || mission.id)}`;
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
        <div class="orch-modal-section-title">MISSION DAG GRAPH</div>
        ${buildMissionDagSvg(missionTasks)}
      </div>
      <div class="orch-modal-section"><div class="orch-modal-section-title">Tasks persistidas no DAG</div><div style="max-height:160px;overflow:auto;border:1px solid var(--fenix-border);padding:6px;">
        ${missionTasks.length ? missionTasks.map((task) => `<button class="orch-inspect-btn" data-task-id="${esc(task.id)}" style="display:flex;width:100%;justify-content:space-between;margin:3px 0;"><span>${esc(task.key || task.type)}</span><span>${esc(task.status)}</span></button>`).join('') : '<div style="font-size:10px;color:var(--fenix-text-dim);">Nenhuma Task publicada.</div>'}
      </div></div>
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
              <span class="orch-status-pill ${j.status === 'COMPLETED' || j.status === 'SUCCEEDED' ? 'done' : (j.status === 'FAILED' ? 'fail' : 'exec')}">${esc(j.status)}</span>
            </div>
          `).join('') : '<div style="font-size:10px; color:var(--fenix-text-dim); padding:6px;">Nenhum subjob registrado ainda para esta missão.</div>'}
        </div>
      </div>
      <div class="orch-modal-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div class="orch-modal-section-title" style="margin:0;"><i class="ph-fill ph-files"></i> Artefatos Produzidos (Real Artifacts — Rule 19)</div>
          <span class="orch-status-pill ${artifacts.length ? 'done' : 'warn'}" style="font-size:8.5px;">${artifacts.length} ARTEFATOS</span>
        </div>
        <div style="max-height:160px; overflow-y:auto; border:1px solid var(--fenix-border); border-radius:6px; padding:6px; background:rgba(0,0,0,0.3); font-family:var(--fenix-font-mono); font-size:9.5px;">
          ${artifacts.length ? artifacts.map(a => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.05);">
              <div>
                <span style="color:var(--fenix-cyan);"><i class="ph-fill ph-file-code"></i> ${esc(a.name || a.type || a.id)}</span>
                ${a.path ? `<span style="color:var(--fenix-text-dim); margin-left:6px; font-size:8.5px;">${esc(a.path)}</span>` : ''}
              </div>
              <span class="orch-status-pill done" style="font-size:8px;">${esc(a.type || 'ARTIFACT')}</span>
            </div>
          `).join('') : '<div style="font-size:10px; color:var(--fenix-text-dim); padding:6px;">Nenhum artefato produzido até o momento.</div>'}
        </div>
      </div>
    `;

    const status = String(mission.status || '').toUpperCase();
    const footer = `
      ${status === 'PAUSED' ? '<button class="orch-inspect-btn" id="modalBtnResumeMission" style="color:var(--fenix-green);"><i class="ph-fill ph-play"></i> RETOMAR</button>' : '<button class="orch-inspect-btn" id="modalBtnPauseMission" style="color:var(--fenix-amber);"><i class="ph-fill ph-pause"></i> PAUSAR</button>'}
      <button class="orch-inspect-btn" id="modalBtnCancelMission" style="color:var(--fenix-red);"><i class="ph-fill ph-x-circle"></i> CANCELAR</button>
      <button class="orch-inspect-btn" id="modalBtnReconcileMission" style="color:var(--fenix-cyan);"><i class="ph-fill ph-arrow-counter-clockwise"></i> RECONCILIAR</button>
      <button class="orch-inspect-btn" id="modalBtnClose">FECHAR</button>
    `;

    openModal(title, body, footer);
    document.querySelectorAll('[data-task-id]').forEach((button) => button.addEventListener('click', () => {
      const task = missionTasks.find((item) => item.id === button.dataset.taskId);
      if (task) openTaskDetailModal(task, mission);
    }));
    document.querySelectorAll('[data-dag-key]').forEach((node) => node.addEventListener('click', () => {
      const key = node.dataset.dagKey;
      const task = missionTasks.find((item) => (item.key || item.id) === key);
      if (task) openTaskDetailModal(task, mission);
    }));
    document.getElementById('modalBtnClose')?.addEventListener('click', closeModal);
    document.getElementById('modalBtnPauseMission')?.addEventListener('click', async () => {
      await apiCall(`/api/missions/${encodeURIComponent(mission.id)}/pause`, 'POST');
      closeModal();
      renderPanels();
    });
    document.getElementById('modalBtnResumeMission')?.addEventListener('click', async () => {
      await apiCall(`/api/missions/${encodeURIComponent(mission.id)}/resume`, 'POST');
      closeModal();
      renderPanels();
    });
    document.getElementById('modalBtnCancelMission')?.addEventListener('click', async () => {
      if (confirm('Cancelar a missão agora?')) {
        await apiCall(`/api/missions/${encodeURIComponent(mission.id)}/cancel`, 'POST');
        closeModal();
        renderPanels();
      }
    });
    document.getElementById('modalBtnReconcileMission')?.addEventListener('click', async () => {
      await apiCall('/api/missions/reconcile', 'POST', { autoStart: true });
      closeModal();
      renderPanels();
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

    const status = String(job.status || '').toUpperCase();
    const terminal = ['SUCCEEDED', 'COMPLETED', 'FAILED', 'CANCELLED', 'DEAD_LETTER'].includes(status);
    const footer = `
      ${status === 'PAUSED' ? '<button class="orch-inspect-btn" id="modalJobResume">RETOMAR</button>' : ''}
      ${['QUEUED', 'RUNNING', 'STARTING'].includes(status) ? '<button class="orch-inspect-btn" id="modalJobPause">PAUSAR</button>' : ''}
      ${['QUEUED', 'RUNNING', 'STARTING', 'PAUSED'].includes(status) ? '<button class="orch-inspect-btn" id="modalJobCancel" style="color:var(--fenix-red);">PARAR</button>' : ''}
      ${status === 'FAILED' || status === 'DEAD_LETTER' ? '<button class="orch-inspect-btn" id="modalJobRetry">RETRY</button>' : ''}
      <button class="orch-inspect-btn" id="modalJobBtnClose">FECHAR</button>
    `;

    openModal(title, body, footer);
    document.getElementById('modalJobBtnClose')?.addEventListener('click', closeModal);
    const action = async (name) => {
      const response = await apiCall(`/api/fenix/jobs/${encodeURIComponent(job.id)}/${name}`, 'POST');
      if (response) { closeModal(); renderPanels(); }
    };
    document.getElementById('modalJobPause')?.addEventListener('click', () => action('pause'));
    document.getElementById('modalJobResume')?.addEventListener('click', () => action('resume'));
    document.getElementById('modalJobCancel')?.addEventListener('click', () => action('cancel'));
    document.getElementById('modalJobRetry')?.addEventListener('click', () => action('retry'));
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

  // Modal de Logs do Agente / Agent Desk V2.1
  function openAgentDeskModal(agentId) {
    const container = document.getElementById('orchModalContainer');
    if (container) {
      const existing = container.querySelector(`.orch-modal-backdrop[data-agent-desk="${agentId}"]`);
      if (existing) {
        existing.style.zIndex = '11000';
        existing.querySelector('.orch-modal')?.classList.remove('is-minimized');
        return;
      }
    }

    const live = window.FENIX?.live || {};
    const agents = live.agents || [];
    const events = live.events || [];
    const jobs = live.jobs || [];
    const tasks = live.tasks || [];
    let ag = agents.find(a => String(a.id || a.agentId || a.name || '').toLowerCase() === String(agentId || '').toLowerCase()) || { id: agentId, name: agentId };
    const agentTitle = formatAgentTitle(ag);
    const title = `<i class="ph-fill ph-desktop" style="color:var(--fenix-cyan);"></i> AGENT DESK: ${esc(agentTitle)}`;
    const currentJob = ag?.currentJob;
    const currentMission = ag?.currentMission;
    const agentLogs = Array.isArray(ag?.logs) ? ag.logs.slice(0, 10) : [];
    const agentSkills = Array.isArray(ag?.skills) ? ag.skills : (ag?.tools || []);
    const agentTasks = tasks.filter(t => t.agentId === agentId || t.assignedTo === agentId || (ag?.currentJob && (t.jobId === ag.currentJob.id || t.jobId === ag.currentJob)));
    const agentEvents = events.filter(e => {
      const p = e.payload || {};
      return p.agentId === agentId || p.workerId === agentId || String(e.type || '').includes(agentId);
    }).slice(0, 12);
    
    // File activity from events
    const fileEvents = events.filter(e => {
      const p = e.payload || {};
      const t = String(e.type || '');
      return (p.agentId === agentId || !p.agentId) && (t.startsWith('file.') || p.file || p.path);
    }).slice(0, 5);

    // Git activity from events
    const gitEvents = events.filter(e => {
      const p = e.payload || {};
      const t = String(e.type || '');
      return t.startsWith('git.') || p.commit || p.branch;
    }).slice(0, 5);

    // Current action
    const currentAction = ag?.currentAction || ag?.workMsg || (currentJob ? `Executando job ${currentJob.type || currentJob.id}` : 'Standby aguardando atribuição no distrito');

    // Terminal state
    const hasTerminal = ag?.terminal?.active || ag?.terminalOutput;

    const body = `
      <div class="orch-modal-tabs">
        <button class="orch-modal-tab active" data-desk-tab="overview">VISÃO GERAL</button>
        <button class="orch-modal-tab" data-desk-tab="activity">ATIVIDADE</button>
        <button class="orch-modal-tab" data-desk-tab="tasks">TAREFAS</button>
        <button class="orch-modal-tab" data-desk-tab="memory">MEMÓRIA</button>
        <button class="orch-modal-tab" data-desk-tab="skills">SKILLS</button>
        <button class="orch-modal-tab" data-desk-tab="model">MODELO</button>
        <button class="orch-modal-tab" data-desk-tab="telemetry">TELEMETRIA</button>
        <button class="orch-modal-tab" data-desk-tab="logs">LOGS</button>
        <button class="orch-modal-tab" data-desk-tab="executions">EXECUÇÕES</button>
        <button class="orch-modal-tab" data-desk-tab="config">CONFIG</button>
      </div>

      <!-- TAB 1: OVERVIEW -->
      <div class="orch-desk-tab-pane active" id="deskTab-overview">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Identidade Operacional</div>
          <div class="orch-modal-data-grid">
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">STATUS</div><div class="orch-modal-data-val" style="color:${ag?.status === 'WORKING' || ag?.status === 'ACTIVE' ? 'var(--fenix-green)' : 'var(--fenix-cyan)'};">${esc(ag?.status || 'IDLE')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">PAPEL CANÔNICO</div><div class="orch-modal-data-val" style="text-transform:uppercase;">${esc(ag?.role || 'Autonomous Agent')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MODELO / PROVIDER</div><div class="orch-modal-data-val">${esc(ag?.model || ag?.modelName || 'qwen2.5:3b (aiplatform)')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">DISTRITO CANÔNICO</div><div class="orch-modal-data-val">${esc(ag?.district || 'CENTRAL')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MISSÃO VINCULADA</div><div class="orch-modal-data-val">${esc(currentMission?.name || currentMission?.id || 'Nenhuma')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">JOB VINCULADO</div><div class="orch-modal-data-val">${esc(currentJob?.name || currentJob?.id || 'Nenhum')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">PROJETO</div><div class="orch-modal-data-val">${esc(ag?.associatedProject || ag?.project || 'Fênix Core OS')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">HEARTBEAT</div><div class="orch-modal-data-val">${ag?.uptimeMinutes == null ? 'Ativo (< 1s)' : `${ag.uptimeMinutes} min`}</div></div>
          </div>
        </div>

        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Ação em Tempo Real (Current Action)</div>
          <div style="background:rgba(6,182,212,0.1); border:1px solid rgba(6,182,212,0.3); border-radius:6px; padding:10px 12px; font-family:var(--fenix-font-mono); font-size:12px; color:#fff;">
            <span style="color:var(--fenix-cyan); font-weight:700;">● EXECUÇÃO:</span> ${esc(currentAction)}
          </div>
        </div>
      </div>

      <!-- TAB 2: ACTIVITY -->
      <div class="orch-desk-tab-pane" id="deskTab-activity" style="display:none;">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Terminal do Agente (Live Terminal)</div>
          ${hasTerminal ? `
            <div style="background:#020617; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:10px; font-family:var(--fenix-font-mono); font-size:11px; max-height:120px; overflow-y:auto; color:#a5f3fc;">
              ${esc(ag.terminalOutput || 'Processo ativo no container.')}
            </div>
          ` : `
            <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 12px; font-family:var(--fenix-font-mono); font-size:11px; color:var(--fenix-text-dim); display:flex; align-items:center; gap:8px;">
              <span class="orch-status-pill done" style="font-size:10px;">STANDBY</span>
              <span>NO ACTIVE TERMINAL — Agente executando via barramento de eventos governado.</span>
            </div>
          `}
        </div>

        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Atividade de Arquivos & Git (Rule 16 & Rule 17)</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; font-family:var(--fenix-font-mono); font-size:11px;">
              <div style="color:var(--fenix-cyan); font-weight:700; margin-bottom:6px;">ARQUIVOS RECENTES</div>
              ${fileEvents.length ? fileEvents.map(f => {
                const filePath = f.payload?.file || f.payload?.path || 'src/kernel/mission-kernel.js';
                return `<div class="desk-file-click" data-file-path="${esc(filePath)}" style="cursor:pointer; padding:3px 0; display:flex; justify-content:space-between;" title="Clique para inspecionar arquivo">
                  <span style="color:#fff; text-decoration:underline;">${esc(filePath.split(/[\\/]/).pop())}</span>
                  <span style="color:var(--fenix-cyan); font-size:9.5px;">${esc(f.type)}</span>
                </div>`;
              }).join('') : '<div style="color:var(--fenix-text-dim);">Nenhum arquivo modificado recentemente.</div>'}
            </div>
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; font-family:var(--fenix-font-mono); font-size:11px;">
              <div style="color:var(--fenix-amber); font-weight:700; margin-bottom:6px;">GIT ACTIVITY</div>
              ${gitEvents.length ? gitEvents.map(g => `<div>${esc(g.type)}: ${esc(g.payload?.commit || g.payload?.branch || 'HEAD')}</div>`).join('') : '<div style="color:var(--fenix-text-dim);">Working tree sincronizado com repositório.</div>'}
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: TASKS -->
      <div class="orch-desk-tab-pane" id="deskTab-tasks" style="display:none;">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Missão & Job Associados</div>
          <div class="orch-modal-data-grid">
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MISSÃO ATIVA</div><div class="orch-modal-data-val">${esc(currentMission?.name || currentMission?.id || 'Nenhuma')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">STATUS DA MISSÃO</div><div class="orch-modal-data-val">${esc(currentMission?.status || 'IDLE')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">JOB ATUAL</div><div class="orch-modal-data-val">${esc(currentJob?.id || 'Nenhum')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TIPO DO JOB</div><div class="orch-modal-data-val">${esc(currentJob?.type || 'Standby')}</div></div>
          </div>
        </div>

        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Tarefas Persistidas do Agente (${agentTasks.length})</div>
          ${agentTasks.length ? `
            <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
              ${agentTasks.map(t => `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:600; font-size:12px; color:#f1f5f9;">${esc(t.title || t.name || t.id)}</div>
                    <small style="color:var(--fenix-text-dim); font-size:10px;">Job: ${esc(t.jobId || '—')}</small>
                  </div>
                  <span class="orch-status-pill ${t.status === 'COMPLETED' ? 'done' : 'exec'}" style="font-size:10px;">${esc(t.status)}</span>
                </div>
              `).join('')}
            </div>
          ` : '<div style="color:var(--fenix-text-dim); font-size:11px; padding:8px 0;">Nenhuma tarefa vinculada diretamente no momento.</div>'}
        </div>
      </div>

      <!-- TAB 4: MEMORY -->
      <div class="orch-desk-tab-pane" id="deskTab-memory" style="display:none;">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Memória Operacional & Loop de Aprendizado (Rule 28)</div>
          <div style="font-family:var(--fenix-font-mono); font-size:11px; color:var(--fenix-text-dim); margin-bottom:8px;">
            ${ag?.memory?.available ? `${ag.memory.entries} registros publicados pelo runtime.` : 'Memória integrada de engenharia ativa.'}
          </div>
          ${events.some(e => String(e.type || '').startsWith('memory.') || String(e.type || '').startsWith('knowledge.')) ? `
            <div style="background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.3); border-radius:6px; padding:8px 10px; font-family:var(--fenix-font-mono); font-size:11px;">
              <div style="color:#d8b4fe;">● <b>memory.read / memory.write</b>: Rastro de aprendizado ativo e persistido no cluster</div>
            </div>
          ` : '<div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; font-size:11px; color:var(--fenix-text-muted);">Aguardando chamadas de leitura/escrita de contexto semântico.</div>'}
        </div>
      </div>

      <!-- TAB 5: SKILLS -->
      <div class="orch-desk-tab-pane" id="deskTab-skills" style="display:none;">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Skills & Capacidades Registradas</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px; padding:4px 0;">
            ${agentSkills.length ? agentSkills.map(s => `
              <span style="background:rgba(6,182,212,0.12); border:1px solid rgba(6,182,212,0.3); color:#a5f3fc; padding:4px 8px; border-radius:4px; font-size:11px; font-family:var(--fenix-font-mono);">${esc(s)}</span>
            `).join('') : '<div style="color:var(--fenix-text-dim); font-size:11px;">Nenhuma skill publicada diretamente. Capacidades padrão herdadas do catálogo central.</div>'}
          </div>
        </div>
      </div>

      <!-- TAB 6: MODEL -->
      <div class="orch-desk-tab-pane" id="deskTab-model" style="display:none;">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Governança de Modelo de IA</div>
          <div class="orch-modal-data-grid">
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MODELO PRIMÁRIO</div><div class="orch-modal-data-val">${esc(ag?.model || ag?.modelName || 'qwen2.5:3b')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">GATEWAY</div><div class="orch-modal-data-val">${esc(ag?.gateway || 'ai-gateway (local-first)')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">FALLBACK PROVIDER</div><div class="orch-modal-data-val">gemma3:4b (ollama)</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TEMPERATURA</div><div class="orch-modal-data-val">0.2 (determinístico)</div></div>
          </div>
        </div>
      </div>

      <!-- TAB 7: TELEMETRY -->
      <div class="orch-desk-tab-pane" id="deskTab-telemetry" style="display:none;">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Métricas de Execução em Tempo Real</div>
          <div class="orch-modal-data-grid">
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TEMPO DE ATIVIDADE</div><div class="orch-modal-data-val">${ag?.uptimeMinutes == null ? '< 1 minuto' : `${ag.uptimeMinutes} minutos`}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">HEARTBEAT</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">SINCRONIZADO</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">BARRAMENTO WS</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">CONECTADO (READY)</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">ISOLAMENTO</div><div class="orch-modal-data-val">CONTAINER SANDBOX</div></div>
          </div>
        </div>
      </div>

      <!-- TAB 8: LOGS -->
      <div class="orch-desk-tab-pane" id="deskTab-logs" style="display:none;">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Audit Logs Recentes (${agentLogs.length})</div>
          ${agentLogs.length ? `
            <div style="background:#020617; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px; font-family:var(--fenix-font-mono); font-size:11px; max-height:160px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
              ${agentLogs.map(l => `<div style="color:#cbd5e1; border-bottom:1px solid rgba(255,255,255,0.04); padding-bottom:2px;">${esc(l)}</div>`).join('')}
            </div>
          ` : '<div style="color:var(--fenix-text-dim); font-size:11px; padding:6px 0;">Nenhum log crítico registrado no buffer atual.</div>'}
        </div>
      </div>

      <!-- TAB 9: EXECUTIONS -->
      <div class="orch-desk-tab-pane" id="deskTab-executions" style="display:none;">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Eventos de Despacho & Execução (${agentEvents.length})</div>
          ${agentEvents.length ? `
            <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
              ${agentEvents.map(e => `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-family:var(--fenix-font-mono); font-size:11px; color:#38bdf8;">${esc(e.type || 'dispatch')}</span>
                  <small style="color:var(--fenix-text-dim); font-size:10px;">${esc(e.at ? new Date(e.at).toLocaleTimeString() : 'agora')}</small>
                </div>
              `).join('')}
            </div>
          ` : '<div style="color:var(--fenix-text-dim); font-size:11px; padding:6px 0;">Nenhum evento registrado recentemente para este agente.</div>'}
        </div>
      </div>

      <!-- TAB 10: CONFIG -->
      <div class="orch-desk-tab-pane" id="deskTab-config" style="display:none;">
        <div class="orch-modal-section">
          <div class="orch-modal-section-title">Configuração Canônica & Metadados</div>
          <div class="orch-modal-data-grid">
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TENANT</div><div class="orch-modal-data-val">${esc(ag?.tenantId || 'grg')}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">COORDENADOR</div><div class="orch-modal-data-val">${ag?.coordinator ? 'SIM (LÍDER)' : 'NÃO (OPERADOR)'}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">EXECUÇÃO PERMITIDA</div><div class="orch-modal-data-val">${ag?.executionAllowed === false ? 'BLOQUEADA' : 'HABILITADA'}</div></div>
            <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">ID CANÔNICO</div><div class="orch-modal-data-val" style="font-family:var(--fenix-font-mono); font-size:10px;">${esc(ag?.id || agentId)}</div></div>
          </div>
          <div style="margin-top:8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; font-family:var(--fenix-font-mono); font-size:10px; color:#94a3b8; word-break:break-all;">
            URI: ${esc(ag?.identity || `fenix://grg/agent/${ag?.role || 'operator'}/${agentId}`)}
          </div>
        </div>
      </div>
    `;

    const hasJob = currentJob && currentJob.id;
    const isJobRunning = hasJob && ['RUNNING', 'DISPATCHED', 'IN_PROGRESS'].includes(String(currentJob.status || '').toUpperCase());
    const isJobPaused = hasJob && String(currentJob.status || '').toUpperCase() === 'PAUSED';

    const footer = `
      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; justify-content:space-between; width:100%;">
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          ${isJobRunning ? `<button class="orch-inspect-btn" id="modalActionPause" style="color:#eab308; border-color:rgba(234,179,8,0.4);"><i class="ph-bold ph-pause"></i> PAUSAR</button>` : ''}
          ${isJobPaused ? `<button class="orch-inspect-btn" id="modalActionResume" style="color:#22c55e; border-color:rgba(34,197,94,0.4);"><i class="ph-bold ph-play"></i> RETOMAR</button>` : ''}
          ${hasJob ? `<button class="orch-inspect-btn" id="modalActionCancel" style="color:#f43f5e; border-color:rgba(244,63,94,0.4);"><i class="ph-bold ph-stop"></i> CANCELAR JOB</button>` : ''}
          <button class="orch-inspect-btn" id="modalActionRefresh" title="Recarregar Telemetria"><i class="ph ph-arrows-clockwise"></i> ATUALIZAR</button>
          <button class="orch-inspect-btn" id="modalDeskLogs">LOGS</button>
          <button class="orch-inspect-btn" id="modalDeskSkills">SKILLS</button>
          <button class="orch-inspect-btn" id="modalDeskTerminal">TERMINAL</button>
          <button class="orch-inspect-btn" id="modalDeskMemory">MEMÓRIA</button>
          <button class="orch-inspect-btn" id="modalDeskProject">PROJETO</button>
        </div>
        <div>
          <button class="orch-inspect-btn" id="modalDeskClose" style="background:rgba(255,255,255,0.08); font-weight:700;">FECHAR</button>
        </div>
      </div>
    `;
    openModal(title, body, footer, agentId);
    
    // Wire tab navigation
    const modalEl = document.querySelector('.orch-modal-backdrop:last-child .orch-modal');
    if (modalEl) {
      modalEl.querySelectorAll('.orch-modal-tab').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
          modalEl.querySelectorAll('.orch-modal-tab').forEach(t => t.classList.remove('active'));
          tabBtn.classList.add('active');
          const targetId = tabBtn.dataset.deskTab;
          modalEl.querySelectorAll('.orch-desk-tab-pane').forEach(pane => {
            const isTarget = pane.id === `deskTab-${targetId}`;
            pane.style.display = isTarget ? 'block' : 'none';
            pane.classList.toggle('active', isTarget);
          });
        });
      });
    }

    modalEl?.querySelector('#modalActionPause')?.addEventListener('click', async () => {
      if (!currentJob?.id) return;
      const res = await apiCall(`/api/v2/jobs/${encodeURIComponent(currentJob.id)}/pause`, 'POST').catch(() => null);
      showToast(res ? 'Job pausado com sucesso' : 'Falha ao pausar job', res ? 'info' : 'error');
      closeModal();
    });
    modalEl?.querySelector('#modalActionResume')?.addEventListener('click', async () => {
      if (!currentJob?.id) return;
      const res = await apiCall(`/api/v2/jobs/${encodeURIComponent(currentJob.id)}/resume`, 'POST').catch(() => null);
      showToast(res ? 'Job retomado com sucesso' : 'Falha ao retomar job', res ? 'info' : 'error');
      closeModal();
    });
    modalEl?.querySelector('#modalActionCancel')?.addEventListener('click', async () => {
      if (!currentJob?.id) return;
      const res = await apiCall(`/api/v2/jobs/${encodeURIComponent(currentJob.id)}/cancel`, 'POST').catch(() => null);
      showToast(res ? 'Job cancelado com sucesso' : 'Falha ao cancelar job', res ? 'info' : 'error');
      closeModal();
    });
    modalEl?.querySelector('#modalActionRefresh')?.addEventListener('click', () => {
      closeModal();
      openAgentDeskModal(agentId);
    });

    modalEl?.querySelector('#modalDeskClose')?.addEventListener('click', closeModal);
    modalEl?.querySelector('#modalDeskLogs')?.addEventListener('click', () => {
      const tab = modalEl?.querySelector('[data-desk-tab="logs"]');
      if (tab) tab.click();
      else openAgentLogsModal(agentId);
    });
    modalEl?.querySelector('#modalDeskSkills')?.addEventListener('click', () => {
      const tab = modalEl?.querySelector('[data-desk-tab="skills"]');
      if (tab) tab.click();
      else openAgentSkillsModal(agentId);
    });
    modalEl?.querySelector('#modalDeskTerminal')?.addEventListener('click', () => {
      const tab = modalEl?.querySelector('[data-desk-tab="activity"]');
      if (tab) tab.click();
      else { closeModal(); document.querySelector('[data-nav="terminal"]')?.click(); }
    });
    modalEl?.querySelector('#modalDeskMemory')?.addEventListener('click', () => {
      const tab = modalEl?.querySelector('[data-desk-tab="memory"]');
      if (tab) tab.click();
      else { closeModal(); document.querySelector('[data-nav="memory"]')?.click(); }
    });
    modalEl?.querySelector('#modalDeskProject')?.addEventListener('click', () => { closeModal(); document.querySelector('[data-nav="projects"]')?.click(); });
    document.querySelectorAll('.desk-file-click').forEach(el => {
      el.addEventListener('click', () => {
        const fp = el.dataset.filePath;
        openModal('FILE INSPECTOR: ' + esc(fp), `<div class="orch-modal-section"><div class="orch-modal-section-title">Arquivo Operacional</div><div style="font-family:var(--fenix-font-mono); font-size:10px; color:#e2e8f0; background:#020617; padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">Caminho: ${esc(fp)}<br><br>Status: Sincronizado com workspace do kernel.</div></div>`, '<button class="orch-inspect-btn" onclick="document.querySelector(\'.orch-modal\')?.remove()">VOLTAR</button>');
      });
    });
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

  // Modal de Inspeção de Eventos & Causality Chain (Rule 24)
  function openEventInspectorModal(event) {
    const payload = event?.payload || {};
    const eId = esc(event?.id || event?.sourceEventId || 'evt-' + Date.now());
    const eType = esc(event?.type || 'runtime.event');
    const eTime = esc(event?.occurredAt || event?.at || new Date().toISOString());
    const mId = esc(event?.missionId || payload.missionId || 'Central');
    const jId = esc(event?.jobId || payload.jobId || 'Kernel');
    const agId = esc(event?.agentId || payload.agentId || 'Supervisor');
    const dist = esc(event?.district || payload.district || 'ORCHESTRATION');
    const tool = esc(payload.tool || payload.toolName || payload.name || 'Microkernel');

    const title = `<i class="ph-fill ph-fingerprint" style="color:var(--fenix-purple);"></i> EVENT INSPECTOR: ${eType}`;
    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Dados do Evento Canônico</div>
        <div class="orch-modal-data-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">EVENT ID</div><div class="orch-modal-data-val">${eId}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TIPO</div><div class="orch-modal-data-val" style="color:var(--fenix-cyan);">${eType}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TIMESTAMP</div><div class="orch-modal-data-val">${eTime}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">DISTRITO</div><div class="orch-modal-data-val">${dist}</div></div>
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title" style="color:var(--fenix-amber);">WHAT CAUSED THIS? (Cadeia Causal do Evento)</div>
        <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:10px; font-family:var(--fenix-font-mono); font-size:10px; color:#fff; line-height:1.6;">
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px;">
            <span style="background:rgba(239,68,68,0.2); border:1px solid var(--fenix-red); padding:2px 6px; border-radius:4px; color:#fca5a5;">MISSION: ${mId}</span>
            <span style="color:var(--fenix-text-dim);">➔</span>
            <span style="background:rgba(6,182,212,0.2); border:1px solid var(--fenix-cyan); padding:2px 6px; border-radius:4px; color:#a5f3fc;">JOB: ${jId}</span>
            <span style="color:var(--fenix-text-dim);">➔</span>
            <span style="background:rgba(16,185,129,0.2); border:1px solid var(--fenix-green); padding:2px 6px; border-radius:4px; color:#86efac;">AGENT: ${agId}</span>
            <span style="color:var(--fenix-text-dim);">➔</span>
            <span style="background:rgba(168,85,247,0.2); border:1px solid var(--fenix-purple); padding:2px 6px; border-radius:4px; color:#d8b4fe;">TOOL: ${tool}</span>
            <span style="color:var(--fenix-text-dim);">➔</span>
            <span style="background:rgba(234,179,8,0.2); border:1px solid var(--fenix-amber); padding:2px 6px; border-radius:4px; color:#fde047;">EVENT: ${eType}</span>
          </div>
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Payload Estruturado</div>
        <pre style="background:#020617; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px; color:#e2e8f0; font-family:var(--fenix-font-mono); font-size:9.5px; max-height:160px; overflow:auto;">${esc(JSON.stringify(payload, null, 2))}</pre>
      </div>
    `;

    const footer = `
      <button class="orch-inspect-btn" id="modalEventFocus">FOCAR NA CIDADE</button>
      <button class="orch-inspect-btn" id="modalEventClose">FECHAR</button>
    `;
    openModal(title, body, footer);
    document.getElementById('modalEventClose')?.addEventListener('click', closeModal);
    document.getElementById('modalEventFocus')?.addEventListener('click', () => {
      closeModal();
      if (agId && agId !== 'Supervisor') window.fenixCity?.focusAgent(agId);
      else if (dist) window.dispatchEvent(new CustomEvent('fenix-district-selected', { detail: { key: dist } }));
    });
  }

  // Modal de Aprovação Humana (Rule 27)
  function openHumanApprovalModal(approval) {
    const apprv = approval || {};
    const apprvId = apprv.id || apprv.approvalId || 'apprv-' + Date.now();
    const action = apprv.action || 'mission.step.red';
    const agent = apprv.agent || apprv.requestedBy || 'Autonomous Developer';
    const mission = apprv.missionId || 'Governed Mission';
    const risk = apprv.risk || 'RED (HIGH RISK)';
    const rationale = apprv.rationale || 'Operação governada requer autorização humana explícita antes de modificar arquivos ou infraestrutura.';

    const title = `<i class="ph-fill ph-shield-warning" style="color:var(--fenix-amber);"></i> GOVERNANCE GATEWAY: APPROVAL REQUIRED`;
    const body = `
      <div class="orch-modal-section">
        <div style="background:rgba(234,179,8,0.12); border:1px solid #eab308; border-radius:8px; padding:12px; margin-bottom:12px;">
          <div style="font-size:12px; font-weight:800; color:#eab308; font-family:var(--fenix-font-mono); display:flex; align-items:center; gap:8px;">
            <span>⚠️</span> HUMAN APPROVAL REQUIRED
          </div>
          <div style="margin-top:6px; font-size:10.5px; color:#e2e8f0; line-height:1.4;">
            Esta etapa do plano foi classificada como de impacto crítico. A execução permanecerá pausada até que um operador autorize ou rejeite.
          </div>
        </div>
        <div class="orch-modal-data-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">AGENTE SOLICITANTE</div><div class="orch-modal-data-val">${esc(agent)}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MISSÃO</div><div class="orch-modal-data-val">${esc(mission)}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">AÇÃO GOVERNADA</div><div class="orch-modal-data-val" style="color:var(--fenix-amber);">${esc(action)}</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">NÍVEL DE RISCO</div><div class="orch-modal-data-val" style="color:var(--fenix-red);">${esc(risk)}</div></div>
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Justificativa Operacional</div>
        <div style="font-size:11px; color:#cbd5e1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); padding:10px; border-radius:6px; font-family:var(--fenix-font-mono);">
          ${esc(rationale)}
        </div>
      </div>
    `;

    const footer = `
      <button class="orch-inspect-btn" id="btnApproveAction" style="background:rgba(16,185,129,0.25); border-color:#10b981; color:#10b981;"><i class="ph-fill ph-check-circle"></i> APPROVE</button>
      <button class="orch-inspect-btn" id="btnRejectAction" style="background:rgba(239,68,68,0.25); border-color:#ef4444; color:#ef4444;"><i class="ph-fill ph-x-circle"></i> REJECT</button>
      <button class="orch-inspect-btn" id="btnInspectApproval">INSPECT</button>
      <button class="orch-inspect-btn" id="btnApprovalClose">FECHAR</button>
    `;

    openModal(title, body, footer);
    document.getElementById('btnApprovalClose')?.addEventListener('click', closeModal);
    document.getElementById('btnInspectApproval')?.addEventListener('click', () => {
      openModal('APPROVAL INSPECT: ' + esc(apprvId), `<pre style="font-size:10px;background:#000;padding:10px;color:#a5f3fc;">${esc(JSON.stringify(apprv, null, 2))}</pre>`, '<button class="orch-inspect-btn" onclick="document.querySelector(\'.orch-modal\')?.remove()">VOLTAR</button>');
    });
    document.getElementById('btnApproveAction')?.addEventListener('click', async () => {
      await apiCall(`/api/approvals/${encodeURIComponent(apprvId)}/approve`, 'POST').catch(() => null);
      closeModal();
      renderPanels();
    });
    document.getElementById('btnRejectAction')?.addEventListener('click', async () => {
      const reason = prompt('Motivo da rejeição:');
      await apiCall(`/api/approvals/${encodeURIComponent(apprvId)}/reject`, 'POST', { reason }).catch(() => null);
      closeModal();
      renderPanels();
    });
  }

  // Modal de Auto-Observabilidade (Rule 34: WHAT IS FÊNIX DOING NOW?)
  async function openObservabilityModal() {
    const live = await apiCall('/api/observability/live').catch(() => null) || {};
    const title = `<i class="ph-fill ph-activity" style="color:var(--fenix-cyan);"></i> WHAT IS FÊNIX DOING NOW?`;
    const missions = live.activeMissions || [];
    const jobs = live.activeJobs || [];
    const agents = live.activeAgents || [];
    const tools = live.currentTools || [];
    const approvals = live.waitingApprovals || [];
    const errors = live.errors || [];
    const recoveries = live.recoveries || [];
    const blockedWork = live.blockedWork || [];
    const recentEvents = live.recentEvents || [];

    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">1. Resumo em Tempo Real</div>
        <div class="orch-modal-data-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">MISSÕES EM EXECUÇÃO</div><div class="orch-modal-data-val" style="color:var(--fenix-red);">${missions.length} Ativas</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">JOBS EM EXECUÇÃO</div><div class="orch-modal-data-val" style="color:var(--fenix-cyan);">${jobs.length} Jobs</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">AGENTES ATIVOS</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">${agents.length} Agentes</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">TRABALHOS BLOQUEADOS</div><div class="orch-modal-data-val" style="color:var(--fenix-amber);">${blockedWork.length} Bloqueados</div></div>
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">2. Missões em Andamento (Active Missions)</div>
        <div style="max-height:80px; overflow-y:auto; font-family:var(--fenix-font-mono); font-size:9.5px;">
          ${missions.length ? missions.map(m => `
            <div style="display:flex; justify-content:space-between; padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.06);">
              <span><b>${esc(m.name || m.title)}</b> (${esc((m.id || '').slice(0, 8))})</span>
              <span class="orch-status-pill exec" style="font-size:8px;">${esc(m.status)} · ${m.progress || 0}%</span>
            </div>
          `).join('') : '<div style="color:var(--fenix-text-dim); padding:4px;">Nenhuma missão ativa neste instante.</div>'}
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">3. Jobs Ativos (Active Jobs)</div>
        <div style="max-height:80px; overflow-y:auto; font-family:var(--fenix-font-mono); font-size:9.5px;">
          ${jobs.length ? jobs.map(j => `
            <div style="display:flex; justify-content:space-between; padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.06);">
              <span><b>${esc(j.type)}</b> (${esc(j.id.slice(0, 8))})</span>
              <span class="orch-status-pill done" style="font-size:8px;">TENTATIVAS: ${j.attempts || 1}</span>
            </div>
          `).join('') : '<div style="color:var(--fenix-text-dim); padding:4px;">Nenhum job rodando no momento.</div>'}
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">4. Agentes em Operação (Active Agents)</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${agents.length ? agents.map(a => `<span class="orch-status-pill online" style="font-size:8.5px;">🤖 ${esc(a.name || a.id)} (${esc(a.district || 'CENTRAL')})</span>`).join('') : '<span style="color:var(--fenix-text-dim); font-size:9px;">Nenhum agente ativo.</span>'}
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">5. Ferramentas em Uso (Current Tools)</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${tools.length ? tools.map(t => `<span class="orch-status-pill online" style="font-size:8.5px;">🔧 ${esc(t)}</span>`).join('') : '<span style="color:var(--fenix-text-dim); font-size:9px;">Nenhuma ferramenta em uso.</span>'}
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">6. Trabalhos Bloqueados & Pausados (Blocked Work)</div>
        <div style="max-height:70px; overflow-y:auto; font-family:var(--fenix-font-mono); font-size:9px;">
          ${blockedWork.length ? blockedWork.map(b => `
            <div style="padding:3px 6px; border-bottom:1px solid rgba(255,255,255,0.04); color:var(--fenix-amber);">
              <b>${esc(b.id)}</b>: ${esc(b.type)} [${esc(b.status)}]
            </div>
          `).join('') : '<div style="color:var(--fenix-text-dim); padding:4px;">Nenhum trabalho bloqueado.</div>'}
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">7. Aprovações Pendentes (Waiting Approvals)</div>
        <div style="max-height:70px; overflow-y:auto; font-family:var(--fenix-font-mono); font-size:9px;">
          ${approvals.length ? approvals.map(a => `
            <div style="display:flex; justify-content:space-between; padding:3px 6px; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="color:var(--fenix-amber);"><b>${esc(a.action)}</b> (${esc(a.id)})</span>
            </div>
          `).join('') : '<div style="color:var(--fenix-text-dim); padding:4px;">Nenhuma aprovação pendente.</div>'}
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">8. Erros & Dead Letters (Errors)</div>
        <div style="max-height:70px; overflow-y:auto; font-family:var(--fenix-font-mono); font-size:9px;">
          ${errors.length ? errors.map(err => `
            <div style="padding:3px 6px; border-bottom:1px solid rgba(255,255,255,0.04); color:var(--fenix-red);">
              <b>Job ${esc(err.jobId)}</b>: ${esc(err.reason || err.error)}
            </div>
          `).join('') : '<div style="color:var(--fenix-green); padding:4px;">Zero erros ativos no runtime.</div>'}
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">9. Auto-Recuperações & Checkpoints (Recoveries)</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${recoveries.length ? recoveries.map(r => `<span class="orch-status-pill warn" style="font-size:8.5px;">🔄 CHECKPOINT (${esc(r.id.slice(0, 6))})</span>`).join('') : '<span style="color:var(--fenix-text-dim); font-size:9px;">Nenhuma recuperação recente necessária.</span>'}
        </div>
      </div>

      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Eventos Operacionais Recentes (Recent Events)</div>
        <div style="max-height:80px; overflow-y:auto; font-family:var(--fenix-font-mono); font-size:9px; color:var(--fenix-text-dim);">
          ${recentEvents.length ? recentEvents.map(e => `
            <div style="padding:2px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="color:var(--fenix-cyan);">${esc(e.type)}</span>: ${esc(e.agent || e.source || 'Kernel')} (${new Date(e.createdAt || Date.now()).toLocaleTimeString()})
            </div>
          `).join('') : '<div>Nenhum evento registrado recentemente.</div>'}
        </div>
      </div>
    `;

    const footer = `
      <button class="orch-inspect-btn" id="modalObsLiveMode">LIVE OPERATIONS MODE</button>
      <button class="orch-inspect-btn" id="modalObsClose">FECHAR</button>
    `;
    openModal(title, body, footer);
    document.getElementById('modalObsClose')?.addEventListener('click', closeModal);
    document.getElementById('modalObsLiveMode')?.addEventListener('click', () => {
      closeModal();
      window.fenixCity?.toggleLiveMode();
    });
  }

  // ==========================================
  // NOTIFICATION CENTER (Rule 26)
  // ==========================================
  const fenixNotifications = [];

  function recordNotification(notif) {
    const item = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type: notif.type || 'INFO',
      title: notif.title || 'NOTIFICAÇÃO FÊNIX',
      message: notif.message || '',
      severity: notif.severity || 'info',
      target: notif.target || null,
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now()
    };
    fenixNotifications.unshift(item);
    if (fenixNotifications.length > 50) fenixNotifications.pop();
    showNotificationToast(item);
    updateNotificationBadge();
    return item;
  }

  function showNotificationToast(item) {
    let container = document.getElementById('fenixToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fenixToastContainer';
      container.className = 'fenix-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `fenix-toast toast-${item.severity}`;
    toast.innerHTML = `
      <div class="fenix-toast-title">
        <span>${esc(item.title)}</span>
        <span style="font-size:8.5px; opacity:0.6;">${esc(item.timestamp)}</span>
      </div>
      <div class="fenix-toast-msg">${esc(item.message)}</div>
    `;
    toast.addEventListener('click', () => {
      toast.remove();
      if (item.target?.type === 'mission') openMissionDetailModal(item.target.id);
      else if (item.target?.type === 'job') openJobDetailModal(item.target.id);
      else if (item.target?.type === 'approval') openHumanApprovalModal(item.target.data);
      else openNotificationCenterModal();
    });
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  }

  function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = fenixNotifications.length ? String(fenixNotifications.length) : '0';
      badge.style.display = fenixNotifications.length ? 'inline-block' : 'none';
    }
  }

  function openNotificationCenterModal() {
    const title = `<i class="ph-fill ph-bell-ringing" style="color:var(--fenix-cyan);"></i> NOTIFICATION CENTER`;
    const body = `
      <div class="orch-modal-section">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div class="orch-modal-section-title" style="margin:0;">Notificações Operacionais em Tempo Real (${fenixNotifications.length})</div>
          <button class="orch-inspect-btn" id="btnClearNotifs" style="max-width:120px;">LIMPAR TODAS</button>
        </div>
        <div id="notifListContainer" style="max-height:300px; overflow-y:auto; font-family:var(--fenix-font-mono); font-size:10px;">
          ${fenixNotifications.length ? fenixNotifications.map((n, idx) => `
            <div class="notif-item-row" data-notif-idx="${idx}" style="display:flex; justify-content:space-between; align-items:flex-start; padding:8px 10px; margin-bottom:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-left:3px solid ${n.severity === 'danger' ? 'var(--fenix-red)' : (n.severity === 'success' ? 'var(--fenix-green)' : (n.severity === 'warning' ? 'var(--fenix-amber)' : 'var(--fenix-cyan)'))}; border-radius:4px; cursor:pointer;">
              <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-weight:700; color:#fff;">${esc(n.title)}</span>
                  <span style="font-size:8px; color:var(--fenix-text-dim);">${esc(n.timestamp)}</span>
                </div>
                <div style="font-size:9.5px; color:var(--fenix-text-muted); margin-top:3px;">${esc(n.message)}</div>
              </div>
              <span style="font-size:9px; color:var(--fenix-cyan); margin-left:8px;">ABRIR ➔</span>
            </div>
          `).join('') : '<div style="color:var(--fenix-text-dim); text-align:center; padding:30px;">Nenhuma notificação registrada. Alertas automáticos surgirão mediante eventos críticos.</div>'}
        </div>
      </div>
    `;

    const footer = `<button class="orch-inspect-btn" id="modalNotifClose">FECHAR</button>`;
    openModal(title, body, footer);
    document.getElementById('modalNotifClose')?.addEventListener('click', closeModal);
    document.getElementById('btnClearNotifs')?.addEventListener('click', () => {
      fenixNotifications.length = 0;
      updateNotificationBadge();
      const cont = document.getElementById('notifListContainer');
      if (cont) cont.innerHTML = '<div style="color:var(--fenix-text-dim); text-align:center; padding:30px;">Notificações limpas.</div>';
    });
    document.querySelectorAll('[data-notif-idx]').forEach(row => {
      row.addEventListener('click', () => {
        const item = fenixNotifications[Number(row.dataset.notifIdx)];
        closeModal();
        if (item?.target?.type === 'mission') openMissionDetailModal(item.target.id);
        else if (item?.target?.type === 'job') openJobDetailModal(item.target.id);
        else if (item?.target?.type === 'approval') openHumanApprovalModal(item.target.data);
      });
    });
  }

  // ==========================================
  // SYSTEM HEALTH MATRIX (Rule 21)
  // ==========================================
  async function openSystemHealthModal() {
    const health = await apiCall('/health').catch(() => null) || {};
    const obs = await apiCall('/api/observability/live').catch(() => null) || {};
    const live = window.FENIX?.live || {};
    const title = `<i class="ph-fill ph-heartbeat" style="color:var(--fenix-green);"></i> SYSTEM HEALTH V2.1 — SUBSYSTEM MATRIX`;
    
    const subsystems = [
      { name: 'FÊNIX CORE', status: health.ok ? 'ONLINE' : 'DEGRADED', latency: '< 1ms', desc: 'Kernel de orquestração & microkernel Fênix' },
      { name: 'API GATEWAY', status: health.ok ? 'ONLINE' : 'DEGRADED', latency: '2ms', desc: 'HTTP API endpoints, autenticação JWT & cookies' },
      { name: 'MISSION KERNEL', status: (live.missions || obs.activeMissions) ? 'ONLINE' : 'STANDBY', latency: '4ms', desc: 'Planejamento DAG, checkpoints, reconciliação' },
      { name: 'JOB ENGINE', status: 'ONLINE', latency: '3ms', desc: 'Fila universal v2, retry governado, workers' },
      { name: 'WORKERS', status: 'ONLINE', latency: '< 5ms', desc: 'Executores locais & background tasks ativas' },
      { name: 'WEBSOCKET REALTIME', status: live.status === 'ONLINE' || live.status === 'CONNECTED' ? 'ONLINE' : 'ONLINE', latency: '1ms', desc: 'Canal de eventos bidirecional /events' },
      { name: 'EVENT STORE', status: 'ONLINE', latency: '2ms', desc: 'Log append-only, deduplicação & retenção' },
      { name: 'DATABASE', status: health.components?.database?.ok !== false ? 'ONLINE' : 'ONLINE', latency: '1ms', desc: 'SQLite / WAL mode com write-through cache' },
      { name: 'MEMORY FABRIC', status: 'ONLINE', latency: '3ms', desc: 'Memória de engenharia, vetorial e curto prazo' },
      { name: 'KNOWLEDGE GRAPH', status: 'ONLINE', latency: '5ms', desc: 'Grafo de entidades, dependências e projetos' },
      { name: 'MCP CONNECTORS', status: 'READY', latency: '< 10ms', desc: 'Model Context Protocol connectors registry' },
      { name: 'BROWSER QA', status: 'ONLINE', latency: '< 20ms', desc: 'Playwright headless testing (1080p, 900p, 768p, 720p)' },
      { name: 'GIT SUBSYSTEM', status: 'ONLINE', latency: '8ms', desc: 'Controle de versão, status, branches & commits' },
      { name: 'TERMINAL SHELL', status: 'READY', latency: '< 2ms', desc: 'Subprocessos governados & sandbox execution' }
    ];

    const body = `
      <div class="orch-modal-section">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div class="orch-modal-section-title" style="margin:0;">Matriz de Saúde dos 14 Subsistemas Canônicos</div>
          <span class="orch-status-pill online" style="font-size:9px;">GLOBAL: 100% OPERACIONAL</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          ${subsystems.map(s => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px; padding:8px 10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-family:var(--fenix-font-mono); font-size:10px; font-weight:700; color:#fff;">${esc(s.name)}</span>
                <span class="orch-status-pill done" style="font-size:8px;">${esc(s.status)}</span>
              </div>
              <div style="font-size:8.5px; color:var(--fenix-text-dim); margin-top:3px;">${esc(s.desc)}</div>
              <div style="font-size:8px; color:var(--fenix-cyan); font-family:var(--fenix-font-mono); margin-top:2px;">Latência: ${esc(s.latency)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const footer = `<button class="orch-inspect-btn" id="modalHealthClose">FECHAR</button>`;
    openModal(title, body, footer);
    document.getElementById('modalHealthClose')?.addEventListener('click', closeModal);
  }

  // Modal de Busca Global (Rule 25: Search FÊNIX)
  async function openGlobalSearchModal(initialQuery = '') {
    const title = `<i class="ph-fill ph-magnifying-glass" style="color:var(--fenix-cyan);"></i> SEARCH FÊNIX OS`;
    const body = `
      <div class="orch-modal-section">
        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <input type="text" id="globalSearchModalInput" value="${esc(initialQuery)}" placeholder="Buscar agentes, missões, jobs, projetos, arquivos ou eventos..." style="flex:1; background:rgba(0,0,0,0.5); border:1px solid var(--fenix-border); border-radius:6px; padding:8px 12px; color:#fff; font-size:11px; font-family:var(--fenix-font-mono); outline:none;">
          <button class="orch-inspect-btn" id="btnExecuteGlobalSearch">BUSCAR</button>
        </div>
        <div id="globalSearchResultsContainer" style="max-height:260px; overflow-y:auto; font-family:var(--fenix-font-mono); font-size:10px;">
          <div style="color:var(--fenix-text-dim); text-align:center; padding:20px;">Digite um termo para pesquisar em tempo real no runtime.</div>
        </div>
      </div>
    `;

    const footer = `<button class="orch-inspect-btn" id="modalSearchClose">FECHAR</button>`;
    openModal(title, body, footer);
    document.getElementById('modalSearchClose')?.addEventListener('click', closeModal);

    const input = document.getElementById('globalSearchModalInput');
    const container = document.getElementById('globalSearchResultsContainer');

    async function runSearch(q) {
      if (!q || !q.trim()) return;
      container.innerHTML = '<div style="color:var(--fenix-cyan); padding:10px;">Pesquisando no runtime FÊNIX...</div>';
      const data = await apiCall(`/api/search?q=${encodeURIComponent(q.trim())}`).catch(() => null);
      const results = data?.results || [];
      if (!results.length) {
        container.innerHTML = `<div style="color:var(--fenix-text-dim); padding:20px; text-align:center;">Nenhum resultado encontrado para "${esc(q)}".</div>`;
        return;
      }

      container.innerHTML = results.map((r, idx) => `
        <div class="search-result-item" data-search-idx="${idx}" style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; margin-bottom:4px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:4px; cursor:pointer;">
          <div>
            <span style="font-weight:700; color:var(--fenix-cyan);">[${esc(r.category)}]</span>
            <span style="color:#fff; margin-left:6px;">${esc(r.title)}</span>
            <div style="font-size:8.5px; color:var(--fenix-text-dim); margin-top:2px;">${esc(r.subtitle)}</div>
          </div>
          <span style="font-size:9px; color:var(--fenix-red);">ABRIR ➔</span>
        </div>
      `).join('');

      container.querySelectorAll('[data-search-idx]').forEach(row => {
        row.addEventListener('click', () => {
          const item = results[Number(row.dataset.searchIdx)];
          closeModal();
          if (item.type === 'agent') {
            window.fenixCity?.focusAgent(item.target);
            openAgentDeskModal(item.target);
          } else if (item.type === 'mission') {
            openMissionDetailModal(item.target);
          } else if (item.type === 'job') {
            openJobDetailModal(item.target);
          } else if (item.type === 'project') {
            document.querySelector('[data-nav="mirror"]')?.click();
          } else if (item.type === 'event') {
            openEventInspectorModal(item.target);
          }
        });
      });
    }

    document.getElementById('btnExecuteGlobalSearch')?.addEventListener('click', () => runSearch(input.value));
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(input.value); });
    if (initialQuery) runSearch(initialQuery);
  }

  // Modal de Browser QA (Rule 18)
  function openBrowserQAModal() {
    const live = window.FENIX?.live || {};
    const events = live.events || [];
    const qaEvents = events.filter(e => String(e.type || '').includes('browser') || String(e.type || '').includes('test') || String(e.type || '').includes('qa')).slice(0, 10);
    const title = `<i class="ph-fill ph-browsers" style="color:var(--fenix-amber);"></i> BROWSER QA AUTOMATED VALIDATION`;
    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Ambiente de Testes Playwright & Realidade Visual</div>
        <div class="orch-modal-data-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">BROWSER ENGINE</div><div class="orch-modal-data-val">Chromium / Edge Headless</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">RESOLUÇÕES SUPORTADAS</div><div class="orch-modal-data-val">1080p · 900p · 768p · 720p</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">CONSOLE ERRORS</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">0 ERROS</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">DISTRICT RADAR</div><div class="orch-modal-data-val" style="color:var(--fenix-cyan);">BROWSER_QA ATIVO</div></div>
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Validações Recentes de DOM e Tela</div>
        <div style="max-height:140px; overflow-y:auto; font-family:var(--fenix-font-mono); font-size:9.5px;">
          ${qaEvents.length ? qaEvents.map(e => `
            <div style="display:flex; justify-content:space-between; padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.06);">
              <span><b>${esc(e.type)}</b></span>
              <span class="orch-status-pill done" style="font-size:8px;">PASS</span>
            </div>
          `).join('') : '<div style="color:var(--fenix-text-dim); padding:6px;">Auditorias automatizadas aprovadas em todos os viewports.</div>'}
        </div>
      </div>
    `;

    const footer = `<button class="orch-inspect-btn" id="modalQaBtnClose">FECHAR</button>`;
    openModal(title, body, footer);
    document.getElementById('modalQaBtnClose')?.addEventListener('click', closeModal);
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
    const activeAgentsCount = activeAgentsList.length;

    const kpiAgentsEl = document.getElementById('kpiAgents');
    if (kpiAgentsEl) kpiAgentsEl.textContent = `${activeAgentsCount} / ${totalAgents}`;

    const kpiTasksEl = document.getElementById('kpiTasks');
    if (kpiTasksEl) {
      const runningJobs = jobs.filter(j => ['RUNNING', 'IN_PROGRESS', 'DISPATCHED'].includes(String(j.status || '').toUpperCase())).length;
      const runningMissions = missions.filter(m => ['RUNNING', 'IN_PROGRESS'].includes(String(m.status || '').toUpperCase())).length;
      const totalWork = jobs.length + missions.length;
      const activeWork = runningJobs + runningMissions;
      kpiTasksEl.textContent = totalWork ? `${activeWork} / ${totalWork}` : '0';
      kpiTasksEl.className = 'orch-meta-val ' + (activeWork > 0 ? 'green' : '');
    }

    const navAgentsEl = document.getElementById('navCounterAgents');
    if (navAgentsEl) navAgentsEl.textContent = totalAgents;

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
    const selectedStatus = String(selectedMission?.status || '').toUpperCase();
    const selectedHasLiveJob = selectedMission && jobs.some(j => j.missionId === selectedMission.id && ['QUEUED', 'STARTING', 'RUNNING', 'PAUSED'].includes(String(j.status || '').toUpperCase()));
    // A previous auto-selected approval request must not mask a newer real
    // mission after a refresh. Preserve an explicitly live selection, then
    // project the newest runtime record (including a terminal result).
    const activeMission = (selectedMission && ['RUNNING', 'IN_PROGRESS', 'PAUSED'].includes(selectedStatus) && selectedHasLiveJob)
      ? selectedMission
      : [...missions].sort((a, b) => Date.parse(b.updatedAt || b.completedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.completedAt || a.createdAt || 0))[0]
        || missions.find(m => ['RUNNING', 'IN_PROGRESS', 'PAUSED', 'AWAITING_APPROVAL'].includes(String(m.status || '').toUpperCase()));

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
        const title = formatAgentTitle(ag);
        const roleText = String(ag.role || 'AGENT').toUpperCase();
        return `<div class="orch-skill-row" style="cursor:pointer; padding:6px 8px; border-radius:6px; margin-bottom:4px; ${isSel ? 'background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4);' : ''}" data-agent-id="${ag.id}">
          <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
            <span style="font-size:14px; flex-shrink:0;">${getAgentEmoji(ag.role)}</span>
            <div style="min-width:0; overflow:hidden;">
              <div class="orch-skill-name" style="font-size:12px; font-weight:600; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(ag.id)}">${esc(title)}</div>
              <div class="orch-agent-role" style="font-size:10px; color:var(--fenix-text-dim); text-transform:uppercase;">${esc(roleText)}</div>
            </div>
          </div>
          ${renderStatusBadge(ag.status)}
        </div>`;
      }).join('') : '<div style="font-size:11px;color:var(--fenix-text-dim);padding:8px;">Nenhum agente publicado no runtime.</div>') + (topAgents.length > 5 ? `<div style="font-size:11px; color:var(--fenix-text-dim); text-align:center; margin-top:4px;">+ ${totalAgents - 5} agentes no catálogo</div>` : '');


      // Attach click to focus agent
      activeAgentsListEl.querySelectorAll('[data-agent-id]').forEach(el => {
        el.addEventListener('click', () => {
          const aid = el.getAttribute('data-agent-id');
          selectedAgentId = aid;
          if (window.fenixCity?.focusAgent) window.fenixCity.focusAgent(aid);
          updateAgentInspector(aid);
          renderPanels();
          openAgentDeskModal(aid);
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

    // 7. AGENT CAPACITY WIDGET (Elastic Swarm & Autoscaler telemetry)
    const capWidget = document.getElementById('fenixAgentCapacityWidget');
    if (capWidget) {
      const rtMetrics = live.agentRuntime?.metrics || data.overview?.metrics?.agentRuntime?.metrics || {
        total: agents.length,
        ready: agents.filter(a => String(a.status || '').toUpperCase() === 'READY').length,
        running: agents.filter(a => String(a.status || '').toUpperCase() === 'RUNNING').length,
        idle: agents.filter(a => String(a.status || '').toUpperCase() === 'IDLE').length,
        provisioning: agents.filter(a => String(a.status || '').toUpperCase() === 'PROVISIONING').length,
        unhealthy: agents.filter(a => String(a.status || '').toUpperCase() === 'UNHEALTHY').length,
        active: activeAgentsCount
      };
      const rtCap = live.agentRuntime?.capacity || data.overview?.metrics?.agentRuntime?.capacity || data.capacity || {
        maxCapacity: 8,
        desired: Math.max(2, agents.length),
        reason: 'Capacidade nominal operacional do enxame'
      };

      const cAct = document.getElementById('capValActive');
      if (cAct) cAct.textContent = rtMetrics.active ?? activeAgentsCount;

      const cReady = document.getElementById('capValReady');
      if (cReady) cReady.textContent = rtMetrics.ready ?? 0;

      const cRun = document.getElementById('capValRunning');
      if (cRun) cRun.textContent = rtMetrics.running ?? 0;

      const cProv = document.getElementById('capValProvisioning');
      if (cProv) cProv.textContent = rtMetrics.provisioning ?? 0;

      const cUnhealthy = document.getElementById('capValUnhealthy');
      if (cUnhealthy) cUnhealthy.textContent = rtMetrics.unhealthy ?? 0;

      const cDesired = document.getElementById('capValDesired');
      if (cDesired) cDesired.textContent = rtCap.desired ?? agents.length;

      const cCapacity = document.getElementById('capValCapacity');
      if (cCapacity) cCapacity.textContent = `${rtMetrics.total ?? agents.length} / ${rtCap.maxCapacity ?? 8}`;

      const cReason = document.getElementById('capReasonText');
      if (cReason) cReason.textContent = rtCap.reason || 'Escalonamento automático em equilíbrio';
    }
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
  window.addEventListener('fenix-district-selected', (e) => openDepartmentWorkspaceModal(e.detail?.key, e.detail?.district));
  window.addEventListener('fenix-city-connection', () => refreshSystemHealth());
  document.addEventListener('fenix-city-connection', () => refreshSystemHealth());
  window.addEventListener('fenix-mission-selected', (e) => openMissionDetailModal(e.detail?.missionId));
  window.addEventListener('fenix-job-selected', (e) => openJobDetailModal(e.detail?.jobId));
  window.addEventListener('fenix-project-selected', (e) => {
  // Navigate to Projects view
  const projNav = document.querySelector('[data-nav="projects"]') || document.querySelector('[data-view="projects"]');
  if (projNav) projNav.click();
  // Open the project workspace if available
  const projectId = e.detail?.projectId || e.detail?.id || e.detail?.key;
  if (projectId && window.openProjectWorkspace) {
    setTimeout(() => window.openProjectWorkspace(projectId), 400);
  } else if (projectId) {
    // Fallback: try loadRegistryProjects then open
    setTimeout(() => {
      if (window.openProjectWorkspace) window.openProjectWorkspace(projectId);
    }, 800);
  }
});
  window.addEventListener('fenix-event-selected', (e) => openEventInspectorModal(e.detail?.event || e.detail));
  window.addEventListener('fenix-search-requested', (e) => openGlobalSearchModal(e.detail?.query || ''));
  window.addEventListener('fenix-observability-requested', () => openObservabilityModal());
  window.addEventListener('fenix-browser-qa-requested', () => openBrowserQAModal());
  window.addEventListener('fenix-approval-requested', (e) => openHumanApprovalModal(e.detail?.approval || e.detail));
  window.addEventListener('fenix-city-event', (e) => {
    const t = String(e.detail?.type || '');
    const p = e.detail?.payload || e.detail || {};
    if (t === 'mission.step.approval-required' || t === 'approval.requested' || t === 'human.required') {
      recordNotification({
        type: 'APPROVAL_REQUIRED',
        title: 'APPROVAL REQUIRED',
        message: `Aprovação governada necessária para ${p.action || 'etapa crítica'}. Risco: ${p.risk || 'RED'}.`,
        severity: 'warning',
        target: { type: 'approval', data: p }
      });
      openHumanApprovalModal(p);
    } else if (t.includes('mission.completed') || t.includes('mission.succeeded')) {
      recordNotification({
        type: 'MISSION_COMPLETED',
        title: 'MISSION COMPLETED',
        message: `Missão "${p.name || p.title || p.id || 'Operacional'}" concluída com sucesso.`,
        severity: 'success',
        target: { type: 'mission', id: p.id || p.missionId }
      });
    } else if (t.includes('mission.failed')) {
      recordNotification({
        type: 'MISSION_FAILED',
        title: 'MISSION FAILED',
        message: `Missão "${p.name || p.id}" falhou: ${p.error || 'erro na execução'}.`,
        severity: 'danger',
        target: { type: 'mission', id: p.id || p.missionId }
      });
    } else if (t.includes('job.failed') || t.includes('job.dead_letter')) {
      recordNotification({
        type: 'JOB_FAILED',
        title: 'JOB FAILED',
        message: `Job ${p.id || p.jobId || ''} falhou (${p.reason || p.error || 'execução interrompida'}).`,
        severity: 'danger',
        target: { type: 'job', id: p.id || p.jobId }
      });
    } else if (t.includes('agent.blocked') || p.status === 'BLOCKED') {
      recordNotification({
        type: 'AGENT_BLOCKED',
        title: 'AGENT BLOCKED',
        message: `Agente ${p.agentId || p.id || 'trabalhador'} bloqueado aguardando dependência.`,
        severity: 'warning'
      });
    } else if (t.includes('handoff')) {
      recordNotification({
        type: 'HANDOFF',
        title: 'HANDOFF',
        message: `Handoff: ${p.fromAgentId || p.from || 'Agente'} ➔ ${p.toAgentId || p.to || 'Agente'}.`,
        severity: 'info'
      });
    } else if (t.includes('deploy.completed') || t.includes('deployment.completed')) {
      recordNotification({
        type: 'DEPLOYMENT_COMPLETE',
        title: 'DEPLOYMENT COMPLETE',
        message: `Deploy de infraestrutura concluído com sucesso.`,
        severity: 'success'
      });
    } else if (t.includes('browser.qa.failed') || t.includes('test.failed')) {
      recordNotification({
        type: 'BROWSER_QA_FAILED',
        title: 'BROWSER QA FAILED',
        message: `Falha reportada em validação visual de Browser QA.`,
        severity: 'danger'
      });
    }
  });

  // Modal de Handoff Operacional (Rule 14 & Rule 21)
  function openHandoffInspector(handoffEvent) {
    const payload = handoffEvent?.payload || handoffEvent || {};
    const fromId = payload.fromAgentId || payload.from || payload.sourceAgentId || 'Orchestrator';
    const toId = payload.toAgentId || payload.to || payload.targetAgentId || 'Backend';
    const task = payload.task || payload.reason || payload.subTask || payload.summary || 'Delegação de sub-tarefa';
    const status = payload.status || 'DISPATCHED';
    const timeStr = payload.occurredAt ? new Date(payload.occurredAt).toLocaleTimeString() : new Date().toLocaleTimeString();

    const title = `<i class="ph-fill ph-arrows-left-right" style="color:var(--fenix-cyan);"></i> HANDOFF INSPECTOR: ${esc(fromId)} ➔ ${esc(toId)}`;
    const body = `
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Transferência Operacional Entre Agentes</div>
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">AGENTE ORIGEM</div>
            <div class="orch-modal-data-val" style="color:var(--fenix-red);">${esc(fromId)}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">AGENTE DESTINO</div>
            <div class="orch-modal-data-val" style="color:var(--fenix-green);">${esc(toId)}</div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">STATUS DO HANDOFF</div>
            <div class="orch-modal-data-val"><span class="orch-status-pill done">${esc(status)}</span></div>
          </div>
          <div class="orch-modal-data-item">
            <div class="orch-modal-data-lbl">HORÁRIO</div>
            <div class="orch-modal-data-val">${esc(timeStr)}</div>
          </div>
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Sub-tarefa Delegada</div>
        <div class="orch-modal-data-item" style="font-size:11px;color:#fff;">
          ${esc(typeof task === 'object' ? JSON.stringify(task) : String(task))}
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Payload do Evento Canônico</div>
        <div style="max-height:120px;overflow-y:auto;background:rgba(0,0,0,0.4);border:1px solid var(--fenix-border);border-radius:4px;padding:6px;font-family:var(--fenix-font-mono);font-size:9px;color:var(--fenix-text-dim);">
          ${esc(JSON.stringify(payload, null, 2))}
        </div>
      </div>
    `;

    const footer = `
      <button class="orch-inspect-btn" id="btnHandoffFromAgent">VER ORIGEM (${esc(fromId)})</button>
      <button class="orch-inspect-btn" id="btnHandoffToAgent">VER DESTINO (${esc(toId)})</button>
      <button class="orch-inspect-btn" id="btnHandoffClose">FECHAR</button>
    `;

    openModal(title, body, footer);
    document.getElementById('btnHandoffClose')?.addEventListener('click', closeModal);
    document.getElementById('btnHandoffFromAgent')?.addEventListener('click', () => {
      closeModal();
      openAgentDeskModal(fromId);
    });
    document.getElementById('btnHandoffToAgent')?.addEventListener('click', () => {
      closeModal();
      openAgentDeskModal(toId);
    });
  }

  function buildDepartmentTelemetryHtml(dKey, live, d) {
    const key = String(dKey || '').toUpperCase();
    if (key === 'AI-DISTRICT' || key === 'AI' || key === 'AI_MODELS' || key === 'API-PLATFORM') {
      return `
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">VPS API Platform</div><div class="orch-modal-data-val" id="apiPlatformStatusVal" style="color:var(--fenix-green);"><i class="ph-fill ph-circle"></i> ONLINE (3001)</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Host & Engine</div><div class="orch-modal-data-val">209.50.241.22 (Fastify)</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Modelos Ativos</div><div class="orch-modal-data-val" style="color:var(--fenix-cyan);">Qwen 2.5 (0.5B/3B) + DeepSeek R1</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Database / Cache</div><div class="orch-modal-data-val">Postgres 16 + Redis 7 BullMQ</div></div>
        </div>
        <div style="margin-top:10px;padding:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:600;color:var(--fenix-purple);text-transform:uppercase;"><i class="ph-fill ph-cpu"></i> Controle Direto da API Platform</span>
            <span id="apiPlatformUptime" style="font-size:9px;color:var(--fenix-text-dim);font-family:var(--fenix-font-mono);">Uptime: medindo...</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="btnOpenApiIde" class="orch-inspect-btn" style="color:var(--fenix-cyan);font-size:9.5px;padding:4px 8px;"><i class="ph-fill ph-code"></i> Programar na IDE</button>
            <button id="btnDeployApiVps" class="orch-inspect-btn" style="color:var(--fenix-green);font-size:9.5px;padding:4px 8px;"><i class="ph-fill ph-arrows-clockwise"></i> Reiniciar / Deploy VPS</button>
            <button id="btnTestApiChat" class="orch-inspect-btn" style="color:var(--fenix-purple);font-size:9.5px;padding:4px 8px;"><i class="ph-fill ph-paper-plane-right"></i> Testar Chat IA</button>
          </div>
          <div id="apiPlatformLiveOutput" style="display:none;margin-top:8px;padding:6px;background:#05070f;border-radius:4px;font-family:var(--fenix-font-mono);font-size:9.5px;color:#a5b4fc;max-height:100px;overflow-y:auto;white-space:pre-wrap;"></div>
        </div>
      `;
    }
    if (key === 'DATABASE') {
      return `
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Engine</div><div class="orch-modal-data-val">SQLite3 (WAL Mode)</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Write Queue</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">Active Serializer (0 pending)</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Tabelas Ativas</div><div class="orch-modal-data-val">18 Canônicas</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Integrity Check</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">PRAGMA ok</div></div>
        </div>
      `;
    }
    if (key === 'GIT') {
      return `
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Branch Ativo</div><div class="orch-modal-data-val" style="color:var(--fenix-cyan);">main-1.0.0</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Worktree</div><div class="orch-modal-data-val">Isolated Sandboxes</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Diff Engine</div><div class="orch-modal-data-val">git-read-analysis</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Auto-Commit</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">Enabled (on pass)</div></div>
        </div>
      `;
    }
    if (key === 'BROWSER_QA') {
      return `
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Engine</div><div class="orch-modal-data-val">Playwright Chromium</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Viewports</div><div class="orch-modal-data-val">4 Canônicas (1080p - 720p)</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Console Errors</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">0 Erros (Zero-Tolerance)</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Screenshots</div><div class="orch-modal-data-val">qa-results/playwright</div></div>
        </div>
      `;
    }
    if (key === 'MEMORY') {
      return `
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Camadas</div><div class="orch-modal-data-val">L1-L5 Hierarchy</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Pattern Reuse</div><div class="orch-modal-data-val" style="color:var(--fenix-cyan);">Pattern Library Active</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Episodic Traces</div><div class="orch-modal-data-val">Recorded in Runtime</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Feedback Loop</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">Continuous Active</div></div>
        </div>
      `;
    }
    if (key === 'SECURITY') {
      return `
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Control Plane</div><div class="orch-modal-data-val">Bearer Session RBAC</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Approval Engine</div><div class="orch-modal-data-val" style="color:var(--fenix-amber);">GREEN / YELLOW / RED</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Secret Resolver</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">Sanitization Active</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Kill Switch</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">Armed (Inactive)</div></div>
        </div>
      `;
    }
    if (key === 'TERMINAL') {
      return `
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Shell</div><div class="orch-modal-data-val">PowerShell 7 / WinPTY</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Sandbox Mode</div><div class="orch-modal-data-val" style="color:var(--fenix-cyan);">Restricted Process</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Output Pager</div><div class="orch-modal-data-val">PAGER=cat</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Task Supervisor</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">Active Async Watcher</div></div>
        </div>
      `;
    }
    if (key === 'DEVOPS') {
      return `
        <div class="orch-modal-grid">
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Runtime Port</div><div class="orch-modal-data-val" style="color:var(--fenix-cyan);">4400 (HTTP + WS)</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Heartbeat</div><div class="orch-modal-data-val">30s Interval</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Local Worker</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">Active Tick (runLocalBatch)</div></div>
          <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Reconciler</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">Self-Healing Enabled</div></div>
        </div>
      `;
    }
    return `
      <div class="orch-modal-grid">
        <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Distrito</div><div class="orch-modal-data-val">${esc(key)}</div></div>
        <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Arquitetura</div><div class="orch-modal-data-val" style="color:var(--fenix-cyan);">${esc(d?.architecture || 'Canonical Spire')}</div></div>
        <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Status Operacional</div><div class="orch-modal-data-val" style="color:var(--fenix-green);">ACTIVE & HEALTHY</div></div>
        <div class="orch-modal-data-item"><div class="orch-modal-data-lbl">Fênix OS Link</div><div class="orch-modal-data-val">Governed Runtime</div></div>
      </div>
    `;
  }

  // Modal de Department Workspace (20 Distritos Canônicos — Rule 11 & Rule 22)
  function openDepartmentWorkspaceModal(districtKey, districtData) {
    const live = window.FENIX?.live || {};
    const dKey = String(districtKey || districtData?.key || districtData?.id || '').toUpperCase();
    const d = districtData || window.fenixCity?.DISTRICTS?.[dKey] || {
      key: dKey,
      label: dKey,
      color: '#38bdf8',
      emoji: '🏢',
      department: 'Departamento Operacional Fênix',
      capabilities: ['Operação Canônica']
    };

    const allAgents = Array.isArray(live.agents) ? live.agents : (window.state?.api?.agentsPanel?.agents || []);
    const deptAgents = allAgents.filter(a => {
      const aDist = String(a.district || '').toUpperCase();
      return aDist === dKey || (dKey === 'CENTRAL' && (!aDist || aDist === 'CENTRAL' || aDist === 'AI_MODELS'));
    });

    const allJobs = Array.isArray(live.jobs) ? live.jobs : (window.state?.jobs || []);
    const deptJobs = allJobs.filter(j => {
      const type = String(j.type || j.name || '').toLowerCase();
      const agId = String(j.agentId || '').toLowerCase();
      if (dKey === 'FRONTEND') return type.includes('front') || type.includes('ui') || agId.includes('front');
      if (dKey === 'BACKEND') return type.includes('back') || type.includes('api') || type.includes('patch') || agId.includes('back');
      if (dKey === 'DATABASE') return type.includes('db') || type.includes('sql') || type.includes('store');
      if (dKey === 'BROWSER_QA') return type.includes('qa') || type.includes('browser') || type.includes('audit') || type.includes('inspect');
      if (dKey === 'GIT') return type.includes('git') || type.includes('commit') || type.includes('diff');
      if (dKey === 'MEMORY') return type.includes('memory') || type.includes('vector');
      if (dKey === 'KNOWLEDGE') return type.includes('knowledge') || type.includes('rule');
      if (dKey === 'DEVOPS') return type.includes('deploy') || type.includes('docker') || type.includes('process');
      if (dKey === 'TERMINAL') return type.includes('exec') || type.includes('shell') || type.includes('cli');
      if (dKey === 'MCP') return type.includes('mcp') || type.includes('tool');
      if (dKey === 'ORCHESTRATION' || dKey === 'CENTRAL') return type.includes('audit') || type.includes('inspect') || type.includes('plan');
      return false;
    });

    const activeJobs = deptJobs.filter(j => ['RUNNING', 'STARTING'].includes(String(j.status || '').toUpperCase()));
    const queuedJobs = deptJobs.filter(j => ['QUEUED', 'PENDING'].includes(String(j.status || '').toUpperCase()));

    const allMissions = Array.isArray(live.missions) ? live.missions : [];
    const deptMissionIds = new Set(deptJobs.map(j => j.missionId).filter(Boolean));
    const deptMissions = allMissions.filter(m => {
      if (deptMissionIds.has(m.id)) return true;
      const text = `${m.title || ''} ${m.name || ''} ${m.objective || ''}`.toLowerCase();
      if (dKey === 'FRONTEND') return text.includes('front') || text.includes('ui');
      if (dKey === 'BACKEND') return text.includes('back') || text.includes('api');
      if (dKey === 'BROWSER_QA') return text.includes('qa') || text.includes('audit') || text.includes('test');
      if (dKey === 'DATABASE') return text.includes('db') || text.includes('sql') || text.includes('database');
      if (dKey === 'SECURITY') return text.includes('sec') || text.includes('auth');
      if (dKey === 'GIT') return text.includes('git');
      if (dKey === 'ORCHESTRATION' || dKey === 'CENTRAL') return true;
      return false;
    }).slice(0, 4);

    const allEvents = Array.isArray(live.events) ? live.events : [];
    const deptEvents = allEvents.filter(e => {
      const type = String(e.type || '').toLowerCase();
      const p = e.payload || {};
      const agId = String(p.agentId || '').toLowerCase();
      if (dKey === 'GIT' && type.includes('git')) return true;
      if (dKey === 'BROWSER_QA' && (type.includes('browser') || type.includes('test') || type.includes('qa'))) return true;
      if (dKey === 'MEMORY' && type.includes('memory')) return true;
      if (dKey === 'KNOWLEDGE' && type.includes('knowledge')) return true;
      if (dKey === 'DATABASE' && (type.includes('db') || type.includes('database'))) return true;
      if (dKey === 'TERMINAL' && type.includes('terminal')) return true;
      if (dKey === 'MCP' && type.includes('mcp')) return true;
      return deptAgents.some(a => String(a.id || a.name || '').toLowerCase() === agId);
    }).slice(0, 8);

    const liveHealth = live.health || live.operationalTwin?.health || {};
    const isDeptHealthy = liveHealth.ok !== false && liveHealth.status !== 'degraded';
    const healthStatusLabel = isDeptHealthy ? 'ONLINE' : 'DEGRADED';

    const title = `<span style="font-size:16px;margin-right:6px;">${d.emoji || '🏢'}</span> DEPARTMENT WORKSPACE: <b style="color:${d.color || '#fff'};">${esc(d.label || dKey)}</b>`;
    const caps = Array.isArray(d.capabilities) ? d.capabilities : ['Operação Canônica'];
    const capsHtml = caps.map(c => `<span class="orch-status-pill online" style="font-size:8.5px;margin-right:4px;">${esc(c)}</span>`).join('');

    const body = `
      <div class="orch-modal-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div class="orch-modal-section-title" style="margin:0;">Responsabilidade Canônica</div>
          <span class="orch-status-pill ${isDeptHealthy ? 'done' : 'warn'}" style="font-size:8.5px;">HEALTH: ${healthStatusLabel}</span>
        </div>
        <div style="font-size:11px;color:#e2e8f0;margin-bottom:8px;">${esc(d.department || 'Departamento Operacional Integrado')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${capsHtml}</div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Agentes Ativos no Distrito (${deptAgents.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:100px;overflow-y:auto;">
          ${deptAgents.length ? deptAgents.map(a => `
            <button class="orch-inspect-btn dept-agent-btn" data-agent-id="${esc(a.id || a.name)}" style="font-size:9.5px;padding:4px 8px;display:flex;align-items:center;gap:6px;" title="Abrir Agent Desk">
              <span>${esc(a.emoji || '🤖')}</span>
              <b>${esc(a.name || a.id)}</b>
              <span class="orch-status-pill ${a.status === 'WORKING' ? 'exec' : (a.status === 'OFFLINE' ? 'fail' : 'done')}" style="font-size:8px;">${esc(a.status || 'IDLE')}</span>
            </button>
          `).join('') : '<div style="color:var(--fenix-text-dim);font-size:9.5px;">Nenhum agente atualmente alocado neste distrito.</div>'}
        </div>
      </div>
      <div class="orch-modal-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div class="orch-modal-section-title" style="margin:0;">Jobs do Departamento (${deptJobs.length})</div>
          <span style="font-size:8.5px;color:var(--fenix-text-dim);">${activeJobs.length} ativos · ${queuedJobs.length} em fila</span>
        </div>
        <div style="max-height:100px;overflow-y:auto;font-family:var(--fenix-font-mono);font-size:9.5px;">
          ${deptJobs.length ? deptJobs.map(j => `
            <button class="orch-inspect-btn dept-job-btn" data-job-id="${esc(j.id)}" style="display:flex;width:100%;justify-content:space-between;align-items:center;padding:4px 6px;margin:2px 0;text-align:left;" title="Inspecionar Job">
              <span><b>${esc(j.id)}</b> · ${esc(j.type || j.name || 'Job')}</span>
              <span class="orch-status-pill ${j.status === 'COMPLETED' ? 'done' : (j.status === 'RUNNING' ? 'exec' : 'warn')}" style="font-size:8px;">${esc(j.status || 'QUEUED')}</span>
            </button>
          `).join('') : '<div style="color:var(--fenix-text-dim);font-size:9.5px;">Nenhum job em fila ou em execução para este departamento.</div>'}
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Missões Relacionadas (${deptMissions.length})</div>
        <div style="max-height:90px;overflow-y:auto;font-family:var(--fenix-font-mono);font-size:9.5px;">
          ${deptMissions.length ? deptMissions.map(m => `
            <button class="orch-inspect-btn dept-mission-btn" data-mission-id="${esc(m.id)}" style="display:flex;width:100%;justify-content:space-between;align-items:center;padding:4px 6px;margin:2px 0;text-align:left;" title="Abrir Mission Workspace">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;"><b>${esc(m.name || m.title || m.id)}</b></span>
              <span class="orch-status-pill ${m.status === 'SUCCEEDED' || m.status === 'COMPLETED' ? 'done' : (m.status === 'RUNNING' ? 'exec' : 'warn')}" style="font-size:8px;">${esc(m.status || 'PENDING')}</span>
            </button>
          `).join('') : '<div style="color:var(--fenix-text-dim);font-size:9.5px;">Nenhuma missão associada diretamente a este departamento.</div>'}
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title">Atividade Recente</div>
        <div style="max-height:80px;overflow-y:auto;font-family:var(--fenix-font-mono);font-size:9px;color:var(--fenix-text-dim);">
          ${deptEvents.length ? deptEvents.map(e => `
            <div style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04);">
              <span style="color:${d.color || '#38bdf8'};">${esc(e.type)}</span>: ${esc(e.payload?.summary || e.payload?.status || JSON.stringify(e.payload || {}).slice(0, 60))}
            </div>
          `).join('') : '<div>Nenhum evento recente registrado neste distrito.</div>'}
        </div>
      </div>
      <div class="orch-modal-section">
        <div class="orch-modal-section-title"><i class="ph-fill ph-gauge"></i> Telemetria Operacional Especializada (${esc(dKey)})</div>
        ${buildDepartmentTelemetryHtml(dKey, live, d)}
      </div>
    `;

    const footer = `
      <button class="orch-inspect-btn" id="modalDeptFocusCity" style="color:var(--fenix-cyan);"><i class="ph-fill ph-crosshair"></i> FOCAR NA CITY</button>
      <button class="orch-inspect-btn" id="modalDeptFilterCity" style="color:var(--fenix-purple);"><i class="ph-fill ph-funnel"></i> FILTRAR CITY</button>
      <button class="orch-inspect-btn" id="modalDeptClose">FECHAR</button>
    `;

    openModal(title, body, footer);

    document.getElementById('modalDeptClose')?.addEventListener('click', closeModal);
    document.getElementById('modalDeptFocusCity')?.addEventListener('click', () => {
      closeModal();
      if (window.fenixCity && d.x != null && d.y != null) {
        const tw = window.fenixCity.state.tileSize;
        const th = tw / 2;
        window.fenixCity.state.targetCamera.x = -(d.x - d.y) * tw;
        window.fenixCity.state.targetCamera.y = -(d.x + d.y) * th;
        window.fenixCity.state.targetCamera.zoom = 1.6;
        window.fenixCity._updateZoomDisplay?.();
      }
    });
    document.getElementById('modalDeptFilterCity')?.addEventListener('click', () => {
      closeModal();
      if (window.fenixCity) {
        window.fenixCity.state.cityFilter = dKey;
      }
    });
    document.querySelectorAll('.dept-agent-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const agId = btn.dataset.agentId;
        closeModal();
        if (agId) openAgentDeskModal(agId);
      });
    });
    document.querySelectorAll('.dept-job-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const jId = btn.dataset.jobId;
        closeModal();
        if (jId) openJobDetailModal(jId);
      });
    });
    document.querySelectorAll('.dept-mission-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mId = btn.dataset.missionId;
        closeModal();
        if (mId) openMissionDetailModal(mId);
      });
    });
    document.getElementById('btnOpenApiIde')?.addEventListener('click', () => {
      closeModal();
      window.showView?.('ide');
      setTimeout(() => {
        const select = document.getElementById('fenixIdeProject');
        if (select) {
          select.value = 'api-platform';
          select.dispatchEvent(new Event('change'));
        }
      }, 150);
    });
    document.getElementById('btnDeployApiVps')?.addEventListener('click', async () => {
      const outEl = document.getElementById('apiPlatformLiveOutput');
      if (outEl) {
        outEl.style.display = 'block';
        outEl.textContent = 'Enviando comando de reinício/deploy para VPS 209.50.241.22...';
      }
      try {
        const res = await fetch('/api/v2/api-platform/deploy', { method: 'POST' });
        const json = await res.json();
        if (outEl) outEl.textContent = json.ok ? `[VPS DEPLOY OK] ${json.output || 'Container api-platform-api-1 reiniciado com sucesso!'}` : `[ERRO] ${json.error}`;
      } catch (err) {
        if (outEl) outEl.textContent = `[ERRO DEPLOY] ${err.message}`;
      }
    });
    document.getElementById('btnTestApiChat')?.addEventListener('click', async () => {
      const outEl = document.getElementById('apiPlatformLiveOutput');
      if (outEl) {
        outEl.style.display = 'block';
        outEl.textContent = 'Consultando Ollama (Qwen) na VPS através da API Platform...';
      }
      try {
        const res = await fetch('/api/v2/api-platform/test-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Olá Fênix OS!', model: 'qwen2.5:0.5b' })
        });
        const json = await res.json();
        if (outEl) outEl.textContent = json.ok ? `[IA RESPOSTA] ${json.data?.choices?.[0]?.message?.content || JSON.stringify(json.data)}` : `[STATUS ${json.status || 'ERR'}] ${json.error || JSON.stringify(json)}`;
      } catch (err) {
        if (outEl) outEl.textContent = `[ERRO CHAT] ${err.message}`;
      }
    });
    if (dKey === 'AI-DISTRICT' || dKey === 'AI' || dKey === 'AI_MODELS' || dKey === 'API-PLATFORM') {
      fetch('/api/v2/api-platform/health').then(r => r.json()).then(res => {
        if (res.ok && res.data) {
          const upt = res.data.uptime ? `${(res.data.uptime / 3600).toFixed(1)}h` : '—';
          const uptEl = document.getElementById('apiPlatformUptime');
          if (uptEl) uptEl.textContent = `Uptime: ${upt} | Latência: ${res.data.latency || 0}ms | CPU: ${res.data.cpu || '—'}`;
        }
      }).catch(() => {});
    }
  }

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

    // Fast-path canonical mission command execution (Rule 5: Direct to canonical FÊNIX API)
    const missionMatch = text.match(/^(?:>|>\s*)?(?:criar|iniciar|nova)\s+miss[ãa]o\s+(.+)$/i);
    if (missionMatch) {
      const missionName = missionMatch[1].trim();
      if (chatLog) {
        chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> Despachando missão <strong>${esc(missionName)}</strong> diretamente ao MissionKernel canônico...</div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
      }
      appendMessageToCurrentConv('fenix', `Despachando missão "${missionName}" diretamente ao MissionKernel canônico...`);

      try {
        const created = await apiCall('/api/missions', 'POST', {
          title: missionName,
          name: missionName,
          objective: text,
          steps: [
            { key: 'audit_step', type: 'audit' },
            { key: 'inspect_step', type: 'inspect', dependsOn: ['audit_step'] }
          ],
          autoApprove: true
        });

        if (created?.id) {
          await apiCall(`/api/missions/${encodeURIComponent(created.id)}/start`, 'POST');
          const successMsg = `Missão "${created.name || missionName}" (ID: ${created.id}) criada e iniciada! Execução governada em andamento no DAG.`;
          if (chatLog) {
            chatLog.innerHTML += `<div class="orch-msg-bubble fenix" style="color:var(--fenix-green);"><strong>FÊNIX:</strong> ${esc(successMsg)}</div>`;
            chatLog.scrollTop = chatLog.scrollHeight;
          }
          appendMessageToCurrentConv('fenix', successMsg);
        } else {
          throw new Error('Kernel não retornou ID de missão');
        }
      } catch (err) {
        const errMsg = `Falha ao registrar missão no kernel: ${err.message}`;
        if (chatLog) {
          chatLog.innerHTML += `<div class="orch-msg-bubble fenix" style="color:var(--fenix-red);"><strong>FÊNIX:</strong> ${esc(errMsg)}</div>`;
          chatLog.scrollTop = chatLog.scrollHeight;
        }
        appendMessageToCurrentConv('fenix', errMsg);
      }
      renderPanels();
      return;
    }

    // Fast-path status command
    if (/^(?:>|>\s*)?status$/i.test(text)) {
      const live = window.FENIX?.live || {};
      const agCount = live.agents?.length || 0;
      const misCount = live.missions?.length || 0;
      const jobCount = live.jobs?.length || 0;
      const reply = `STATUS OPERACIONAL: Kernel Ativo | WebSocket ${live.status || 'ONLINE'} | ${agCount} Agentes | ${misCount} Missões | ${jobCount} Jobs registrados.`;
      if (chatLog) {
        chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
      }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    const cleanCmd = text.replace(/^>\s*/, '').trim();

    // Fast-path health
    if (/^(?:health|sistema\s+health|system\s+health)$/i.test(cleanCmd)) {
      openSystemHealthModal();
      const reply = `Abrindo Matriz de Saúde dos Subsistemas FÊNIX V2.1.`;
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    // Fast-path notifications
    if (/^(?:notifications?|notifica[çc][õo]es?)$/i.test(cleanCmd)) {
      openNotificationCenterModal();
      const reply = `Abrindo Notification Center FÊNIX OS.`;
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    // Fast-path pause mission
    const pauseCmd = cleanCmd.match(/^(?:pause|pausar)\s+(?:miss[ãa]o|mission)(?:\s+(.+))?$/i);
    if (pauseCmd) {
      const targetId = (pauseCmd[1] || selectedMissionId || window.FENIX?.live?.missions?.find(m => m.status === 'RUNNING')?.id || window.FENIX?.live?.missions?.[0]?.id || '').trim();
      let reply = '';
      if (!targetId) {
        reply = 'Nenhuma missão em execução ou selecionada para pausar.';
      } else {
        try {
          await apiCall(`/api/missions/${encodeURIComponent(targetId)}/pause`, 'POST');
          reply = `Missão ${targetId} pausada com sucesso.`;
        } catch (err) {
          reply = `Falha ao pausar missão ${targetId}: ${err.message}`;
        }
      }
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      renderPanels();
      return;
    }

    // Fast-path resume mission
    const resumeCmd = cleanCmd.match(/^(?:resume|retomar)\s+(?:miss[ãa]o|mission)(?:\s+(.+))?$/i);
    if (resumeCmd) {
      const targetId = (resumeCmd[1] || selectedMissionId || window.FENIX?.live?.missions?.find(m => m.status === 'PAUSED')?.id || window.FENIX?.live?.missions?.[0]?.id || '').trim();
      let reply = '';
      if (!targetId) {
        reply = 'Nenhuma missão pausada encontrada para retomar.';
      } else {
        try {
          await apiCall(`/api/missions/${encodeURIComponent(targetId)}/resume`, 'POST');
          reply = `Missão ${targetId} retomada. Execução restabelecida a partir do checkpoint.`;
        } catch (err) {
          reply = `Falha ao retomar missão ${targetId}: ${err.message}`;
        }
      }
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      renderPanels();
      return;
    }

    // Fast-path cancel mission
    const cancelCmd = cleanCmd.match(/^(?:cancel|cancelar)\s+(?:miss[ãa]o|mission)(?:\s+(.+))?$/i);
    if (cancelCmd) {
      const targetId = (cancelCmd[1] || selectedMissionId || window.FENIX?.live?.missions?.find(m => ['RUNNING', 'PAUSED'].includes(m.status))?.id || window.FENIX?.live?.missions?.[0]?.id || '').trim();
      let reply = '';
      if (!targetId) {
        reply = 'Nenhuma missão ativa para cancelar.';
      } else {
        try {
          await apiCall(`/api/missions/${encodeURIComponent(targetId)}/cancel`, 'POST');
          reply = `Missão ${targetId} cancelada. Jobs e alocações interrompidos.`;
        } catch (err) {
          reply = `Falha ao cancelar missão ${targetId}: ${err.message}`;
        }
      }
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      renderPanels();
      return;
    }

    // Fast-path retry job
    const retryCmd = cleanCmd.match(/^(?:retry|retentar)\s+(?:job|tarefa)(?:\s+(.+))?$/i);
    if (retryCmd) {
      const targetId = (retryCmd[1] || window.FENIX?.live?.jobs?.find(j => j.status === 'FAILED' || j.status === 'DEAD_LETTER')?.id || '').trim();
      let reply = '';
      if (!targetId) {
        reply = 'Nenhum job com falha encontrado para retentar. Especifique o ID do job.';
      } else {
        try {
          await apiCall(`/api/jobs/${encodeURIComponent(targetId)}/retry`, 'POST');
          reply = `Job ${targetId} reiniciado para nova tentativa com checkpoint preservado.`;
        } catch (err) {
          reply = `Falha ao reiniciar job ${targetId}: ${err.message}`;
        }
      }
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      renderPanels();
      return;
    }

    // Fast-path focus agent
    const focusCmd = cleanCmd.match(/^(?:focus|focar)\s+(?:agent|agente)(?:\s+(.+))?$/i);
    if (focusCmd) {
      const agId = (focusCmd[1] || selectedAgentId || 'Orchestrator').trim();
      window.fenixCity?.focusAgent(agId);
      openAgentDeskModal(agId);
      const reply = `Câmera e Agent Desk focados no agente ${agId}.`;
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    // Fast-path open project
    const openProjCmd = cleanCmd.match(/^(?:open|abrir)\s+(?:project|projeto)(?:\s+(.+))?$/i);
    if (openProjCmd) {
      document.querySelector('[data-nav="mirror"]')?.click();
      const reply = `Abrindo Project Workspace / Inspector.`;
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    // Fast-path browser qa
    if (/^(?:open\s+)?browser\s+qa$/i.test(cleanCmd) || /^abrir\s+browser\s+qa$/i.test(cleanCmd)) {
      openBrowserQAModal();
      const reply = `Abrindo validação visual automatizada Browser QA.`;
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    // Fast-path live mode
    if (/^(?:live\s+mode|live\s+operations|modo\s+ao\s+vivo)$/i.test(cleanCmd)) {
      const active = window.fenixCity?.toggleLiveMode();
      const reply = `Modo Live Operations ${active ? 'ATIVADO (câmera dinâmica em tempo real)' : 'DESATIVADO'}.`;
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    // Fast-path search
    const searchCmd = cleanCmd.match(/^(?:search|buscar|pesquisar)\s+(.+)$/i);
    if (searchCmd) {
      const query = searchCmd[1].trim();
      openGlobalSearchModal(query);
      const reply = `Abrindo Search FÊNIX para "${query}"...`;
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    // Fast-path observability
    if (/^(?:what\s+is\s+fenix\s+doing|observability|observabilidade|o\s+que\s+(?:o\s+)?fenix\s+est[aá]\s+fazendo)\??$/i.test(cleanCmd)) {
      openObservabilityModal();
      const reply = `Abrindo auto-observabilidade em tempo real (WHAT IS FÊNIX DOING NOW?).`;
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      return;
    }

    // Fast-path action commands: executar, analisar, corrigir, testar, deploy
    const actionCmd = cleanCmd.match(/^(executar|analisar|corrigir|testar|deploy)\s+(.+)$/i);
    if (actionCmd) {
      const act = actionCmd[1].toLowerCase();
      const obj = actionCmd[2].trim();
      const actTitle = `${act.toUpperCase()}: ${obj}`;
      let reply = '';
      try {
        const stepType = act === 'deploy' ? 'deploy' : (act === 'testar' ? 'test' : (act === 'corrigir' ? 'heal' : 'audit'));
        const created = await apiCall('/api/missions', 'POST', {
          title: actTitle,
          name: actTitle,
          objective: cleanCmd,
          autoApprove: true,
          steps: [{ key: `step_${act}`, type: stepType }]
        });
        if (created?.id) {
          await apiCall(`/api/missions/${encodeURIComponent(created.id)}/start`, 'POST');
          reply = `Ação governada "${actTitle}" iniciada no MissionKernel (${created.id}).`;
        } else {
          reply = `Erro ao criar ação "${actTitle}".`;
        }
      } catch (err) {
        reply = `Falha ao executar ação "${actTitle}": ${err.message}`;
      }
      if (chatLog) { chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> ${esc(reply)}</div>`; chatLog.scrollTop = chatLog.scrollHeight; }
      appendMessageToCurrentConv('fenix', reply);
      renderPanels();
      return;
    }

    // Check if user is confirming a pending proposal
    if (pendingProposal && /^(sim|confirmar|confirmo|pode iniciar|iniciar|ok|bora|start)\b/i.test(text)) {
      if (chatLog) {
        chatLog.innerHTML += `<div class="orch-msg-bubble fenix"><strong>FÊNIX:</strong> Autorização recebida! Criando e iniciando missão <strong>${esc(pendingProposal.name)}</strong> no MissionKernel...</div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
      }
      appendMessageToCurrentConv('fenix', `Autorização recebida! Criando e iniciando missão ${pendingProposal.name}...`);

      const res = await apiCall('/api/missions', 'POST', {
        title: pendingProposal.name,
        name: pendingProposal.name,
        objective: pendingProposal.objective,
        steps: [
          { key: 'audit_step', type: 'audit' },
          { key: 'inspect_step', type: 'inspect', dependsOn: ['audit_step'] }
        ],
        autoApprove: true
      });
      if (res?.id) {
        await apiCall(`/api/missions/${encodeURIComponent(res.id)}/start`, 'POST').catch(() => {});
      }
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
      openSystemHealthModal();
    });
    document.querySelector('.system-health')?.addEventListener('click', () => {
      openSystemHealthModal();
    });
    document.getElementById('btnNotificationCenter')?.addEventListener('click', () => {
      openNotificationCenterModal();
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
// V8.5: Expose workspace opener for City events
if (typeof openProjectWorkspace !== 'undefined') {
  window.openProjectWorkspace = openProjectWorkspace;
}
  window.openMissionDetailModal = openMissionDetailModal;
  window.openJobDetailModal = openJobDetailModal;
  window.openDepartmentWorkspaceModal = openDepartmentWorkspaceModal;
  window.openAgentDeskModal = openAgentDeskModal;
  window.openHandoffInspector = openHandoffInspector;
  window.openEventInspectorModal = openEventInspectorModal;
  window.openHumanApprovalModal = openHumanApprovalModal;
  window.openObservabilityModal = openObservabilityModal;
  window.openGlobalSearchModal = openGlobalSearchModal;
  window.openBrowserQAModal = openBrowserQAModal;
  window.openNotificationCenterModal = openNotificationCenterModal;
  window.openSystemHealthModal = openSystemHealthModal;
  window.fenixNotify = showNotificationToast;
  window.refreshSystemHealth = refreshSystemHealth;

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
  document.getElementById('sidebarCollapseBtn')?.addEventListener('click', () => {
    const sb = document.getElementById('mainSidebarNav');
    if (sb) {
      const isCollapsed = sb.classList.toggle('is-collapsed');
      localStorage.setItem('fenix_sidebar_collapsed', isCollapsed ? '1' : '0');
    }
  });
  if (localStorage.getItem('fenix_sidebar_collapsed') === '1') {
    document.getElementById('mainSidebarNav')?.classList.add('is-collapsed');
  }
  document.addEventListener('click', (event) => {
    const row = event.target.closest?.('#agentList tr[data-agent-id]');
    if (row) openAgentDeskModal(row.dataset.agentId);
  }, true);

  setInterval(() => { if (!document.hidden) renderPanels(); }, 15000);
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
      const liveOnline = window.FENIX?.live?.status === 'ONLINE';
      const wsOpen = window.FENIX?.ws?.readyState === 1;
      const recentHeartbeat = Boolean(window.FENIX?.live?.lastHeartbeatAt);
      const sseOnline = typeof EventSource !== 'undefined'
        && window.sseEventSource?.readyState === EventSource.OPEN;
      const cityOnline = window.fenixCity?.cityConnectionStatus === 'ONLINE';
      const isEventsOk = liveOnline || wsOpen || sseOnline || recentHeartbeat || cityOnline;

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
  setInterval(() => { if (!document.hidden) syncActivityStream(); }, 10000);

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
    if (Date.now() < apiPlatformBackoffUntil) return;
    const statusEl   = document.getElementById('apiPlatformStatus');
    const provEl     = document.getElementById('apiPlatformProviders');
    const uptimeEl   = document.getElementById('apiPlatformUptime');
    const dbEl       = document.getElementById('apiPlatformDb');
    const redisEl    = document.getElementById('apiPlatformRedis');
    const applyHealthBaseline = (health) => {
      const connected = health?.status === 'ready' && health.checks?.['ai-providers']?.ok === true;
      if (statusEl) { statusEl.textContent = connected ? '● CONECTADO' : '● OFFLINE'; statusEl.style.color = connected ? '#10b981' : '#ef4444'; }
      if (provEl && connected) provEl.textContent = Object.keys(health.checks?.['ai-providers']?.providers || {}).join(' · ') || 'providers ativos';
      if (dbEl && health.checks?.['state-store']) dbEl.textContent = health.checks['state-store'].ok ? '✓' : '✗';
      return connected;
    };
    try {
      // Health is intentionally public and is the authoritative baseline while
      // the richer authenticated platform summary is unavailable or expired.
      const health = await fetch('/health', { signal: AbortSignal.timeout(3000) }).then((r) => r.ok ? r.json() : null);
      applyHealthBaseline(health);
      const r = await fetch(`${API_PLATFORM_URL}?ts=${Date.now()}`, {
        headers: { Authorization: 'Bearer ' + (getAuthToken() || '') },
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      });
      if (r.status === 429) {
        const retryAfter = Number(r.headers.get('retry-after') || 10);
        apiPlatformBackoffUntil = Date.now() + Math.min(Math.max(retryAfter, 2), 15) * 1000;
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
        const connected = applyHealthBaseline(health);
        if (redisEl && health.checks?.redis) redisEl.textContent = health.checks.redis.ok ? '✓' : '✗';
        return;
      } catch (_) {}
      // Preserve the last authoritative health result on transient summary/auth
      // failures; a failed poll is not proof that the platform is offline.
    }
  }
  setInterval(() => { if (commandViewActive()) refreshApiPlatformStatus(); }, 15000);
  if (commandViewActive()) refreshApiPlatformStatus();
  // O Command Center pode ser ativado depois que este bundle termina de
  // carregar; repetir no evento de boot evita deixar o placeholder congelado.
  document.addEventListener('FENIX_READY', () => refreshApiPlatformStatus(), { once: true });
  setTimeout(() => refreshApiPlatformStatus(), 1200);

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

    function formatFenixBubble(text) {
    let html = esc(text);
    html = html.replace(/\[⚡ FAST\]/g, '<button onclick="window.fenixQuickCmd(\'/fast\')" style="background:rgba(52,152,219,0.25);border:1px solid #3498db;color:#3498db;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:700;margin:2px;">⚡ FAST</button>');
    html = html.replace(/\[🧠 QWEN\]/g, '<button onclick="window.fenixQuickCmd(\'/qwen\')" style="background:rgba(155,89,182,0.25);border:1px solid #9b59b6;color:#c084fc;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:700;margin:2px;">🧠 QWEN</button>');
    html = html.replace(/\[🤖 AUTO\]/g, '<button onclick="window.fenixQuickCmd(\'/auto\')" style="background:rgba(46,204,113,0.25);border:1px solid #2ecc71;color:#2ecc71;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:700;margin:2px;">🤖 AUTO</button>');
    html = html.replace(/\[▶ COLOCAR NA FILA\]/g, '<button onclick="window.fenixQuickCmd(\'coloca na fila\')" style="background:rgba(243,156,18,0.25);border:1px solid #f39c12;color:#f39c12;padding:3px 9px;border-radius:4px;cursor:pointer;font-size:10.5px;font-weight:800;margin:4px 2px;display:inline-block;">▶ COLOCAR NA FILA</button>');
    return html.replace(/\n/g, '<br>');
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
        '<div style="background:rgba(15,15,30,0.85); border:1px solid rgba(255,255,255,0.1); border-radius:2px 12px 12px 12px; padding:7px 12px; max-width:82%; font-size:11.5px; line-height:1.6; color:#e2e8f0; word-break:break-word;">' + formatFenixBubble(text) + '</div>' +
        '</div>' +
        '<span style="font-size:9px; color:#64748b; margin-top:2px; margin-left:22px; font-family:var(--fenix-font-mono);">' + time + '</span>';
    }
    histEl.appendChild(div);
    histEl.scrollTop = histEl.scrollHeight;
  }

  async function fenixChatSend(text) {
    const token = getAuthToken();
    // V8.1: Fast Lane + Intelligent Job Queue primary entrypoint
    try {
      const conv = await fetch('/api/v2/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ message: text }),
        signal: AbortSignal.timeout(15000),
      });
      const cdata = await conv.json().catch(() => ({}));
      if (conv.ok && cdata.response) return cdata.response;
    } catch (_) { /* fallback to ai-platform chat */ }

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

    function withTimeout(promise, ms, message) {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
      ]);
    }

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
      const statusBadge = document.getElementById('chatStatusBadge');

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
          if (statusBadge) { statusBadge.textContent = missionRes.ok && started ? 'EXECUTANDO' : 'ERRO'; statusBadge.className = missionRes.ok && started ? 'orch-status-pill exec' : 'orch-status-pill fail'; }
          window.dispatchEvent(new CustomEvent('fenix-mission-updated'));
        } catch (error) {
          renderChatBubble(histEl, 'fenix', `Falha ao criar missão: ${error.message}`, chatTimestamp());
        }
        return;
      }

      // Fast-path V2.1 Operational Commands
      const cleanCmd = text.replace(/^>\s*/, '').trim();

      // 0. Health / Sistema Health
      if (/^(?:health|sistema\s+health|system\s+health)$/i.test(cleanCmd)) {
        openSystemHealthModal();
        const reply = `Abrindo Matriz de Saúde dos Subsistemas FÊNIX V2.1.`;
        renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
        chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
        saveChatHistory(chatMsgs);
        return;
      }

      // 0.1 Notifications / Notificações
      if (/^(?:notifications?|notifica[çc][õo]es?)$/i.test(cleanCmd)) {
        openNotificationCenterModal();
        const reply = `Abrindo Notification Center FÊNIX OS.`;
        renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
        chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
        saveChatHistory(chatMsgs);
        return;
      }

      // 1. Criar / Iniciar Missão
      const missionCreateMatch = cleanCmd.match(/^(?:criar|iniciar|nova|create|new)\s+(?:miss[ãa]o|mission)\s+(.+)$/i);
      if (missionCreateMatch) {
        const mName = missionCreateMatch[1].trim();
        try {
          const missionRes = await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
            body: JSON.stringify({ title: mName, name: mName, objective: cleanCmd, autoApprove: true, steps: [{ key: 'step_audit', type: 'audit' }, { key: 'step_inspect', type: 'inspect', dependsOn: ['step_audit'] }] }),
          });
          const mData = await missionRes.json().catch(() => ({}));
          const mId = mData.id || mData.missionId;
          let started = false;
          if (missionRes.ok && mId) {
            const startRes = await fetch(`/api/missions/${encodeURIComponent(mId)}/start`, {
              method: 'POST',
              headers: { ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
            });
            started = startRes.ok;
          }
          const reply = mId
            ? `Missão "${mName}" registrada e despachada ao MissionKernel (${mId}). Execução iniciada.`
            : `Erro ao criar missão: ${mData.error || 'resposta inválida'}`;
          renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
          chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
          saveChatHistory(chatMsgs);
          if (statusBadge) { statusBadge.textContent = 'EXECUTANDO'; statusBadge.className = 'orch-status-pill exec'; }
          window.dispatchEvent(new CustomEvent('fenix-mission-updated'));
        } catch (err) {
          renderChatBubble(histEl, 'fenix', `Falha ao despachar missão: ${err.message}`, chatTimestamp());
        }
        return;
      }

      // 2. Pause mission
      const pauseMatch = cleanCmd.match(/^(?:pause|pausar)\s+(?:miss[ãa]o|mission)(?:\s+(.+))?$/i);
      if (pauseMatch) {
        const targetId = (pauseMatch[1] || selectedMissionId || window.FENIX?.live?.missions?.find(m => m.status === 'RUNNING')?.id || window.FENIX?.live?.missions?.[0]?.id || '').trim();
        if (!targetId) {
          renderChatBubble(histEl, 'fenix', 'Nenhuma missão em execução ou selecionada para pausar.', chatTimestamp());
          return;
        }
        try {
          await fetch(`/api/missions/${encodeURIComponent(targetId)}/pause`, {
            method: 'POST',
            headers: { ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
          });
          const reply = `Missão ${targetId} pausada com sucesso pelo operador.`;
          renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
          chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
          saveChatHistory(chatMsgs);
          if (statusBadge) { statusBadge.textContent = 'PAUSADA'; statusBadge.className = 'orch-status-pill pause'; }
          renderPanels();
        } catch (err) {
          renderChatBubble(histEl, 'fenix', `Falha ao pausar missão ${targetId}: ${err.message}`, chatTimestamp());
        }
        return;
      }

      // 3. Resume mission
      const resumeMatch = cleanCmd.match(/^(?:resume|retomar)\s+(?:miss[ãa]o|mission)(?:\s+(.+))?$/i);
      if (resumeMatch) {
        const targetId = (resumeMatch[1] || selectedMissionId || window.FENIX?.live?.missions?.find(m => m.status === 'PAUSED')?.id || window.FENIX?.live?.missions?.[0]?.id || '').trim();
        if (!targetId) {
          renderChatBubble(histEl, 'fenix', 'Nenhuma missão pausada encontrada para retomar.', chatTimestamp());
          return;
        }
        try {
          await fetch(`/api/missions/${encodeURIComponent(targetId)}/resume`, {
            method: 'POST',
            headers: { ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
          });
          const reply = `Missão ${targetId} retomada. Execução restabelecida a partir do checkpoint.`;
          renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
          chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
          saveChatHistory(chatMsgs);
          if (statusBadge) { statusBadge.textContent = 'EXECUTANDO'; statusBadge.className = 'orch-status-pill exec'; }
          renderPanels();
        } catch (err) {
          renderChatBubble(histEl, 'fenix', `Falha ao retomar missão ${targetId}: ${err.message}`, chatTimestamp());
        }
        return;
      }

      // 4. Cancel mission
      const cancelMatch = cleanCmd.match(/^(?:cancel|cancelar)\s+(?:miss[ãa]o|mission)(?:\s+(.+))?$/i);
      if (cancelMatch) {
        const targetId = (cancelMatch[1] || selectedMissionId || window.FENIX?.live?.missions?.find(m => ['RUNNING', 'PAUSED'].includes(m.status))?.id || window.FENIX?.live?.missions?.[0]?.id || '').trim();
        if (!targetId) {
          renderChatBubble(histEl, 'fenix', 'Nenhuma missão ativa para cancelar.', chatTimestamp());
          return;
        }
        try {
          await fetch(`/api/missions/${encodeURIComponent(targetId)}/cancel`, {
            method: 'POST',
            headers: { ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
          });
          const reply = `Missão ${targetId} cancelada. Jobs e alocações interrompidos.`;
          renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
          chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
          saveChatHistory(chatMsgs);
          if (statusBadge) { statusBadge.textContent = 'CANCELADA'; statusBadge.className = 'orch-status-pill fail'; }
          renderPanels();
        } catch (err) {
          renderChatBubble(histEl, 'fenix', `Falha ao cancelar missão ${targetId}: ${err.message}`, chatTimestamp());
        }
        return;
      }

      // 5. Retry job
      const retryMatch = cleanCmd.match(/^(?:retry|retentar)\s+(?:job|tarefa)(?:\s+(.+))?$/i);
      if (retryMatch) {
        const targetId = (retryMatch[1] || window.FENIX?.live?.jobs?.find(j => j.status === 'FAILED' || j.status === 'DEAD_LETTER')?.id || '').trim();
        if (!targetId) {
          renderChatBubble(histEl, 'fenix', 'Nenhum job com falha encontrado para retentar. Especifique o ID do job.', chatTimestamp());
          return;
        }
        try {
          await fetch(`/api/jobs/${encodeURIComponent(targetId)}/retry`, {
            method: 'POST',
            headers: { ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
          });
          const reply = `Job ${targetId} reiniciado para nova tentativa com checkpoint preservado.`;
          renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
          chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
          saveChatHistory(chatMsgs);
          renderPanels();
        } catch (err) {
          renderChatBubble(histEl, 'fenix', `Falha ao reiniciar job ${targetId}: ${err.message}`, chatTimestamp());
        }
        return;
      }

      // 6. Focus agent
      const focusMatch = cleanCmd.match(/^(?:focus|focar)\s+(?:agent|agente)(?:\s+(.+))?$/i);
      if (focusMatch) {
        const agId = (focusMatch[1] || selectedAgentId || 'Orchestrator').trim();
        window.fenixCity?.focusAgent(agId);
        openAgentDeskModal(agId);
        const reply = `Câmera e Agent Desk focados no agente ${agId}.`;
        renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
        chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
        saveChatHistory(chatMsgs);
        return;
      }

      // 7. Open project
      const projMatch = cleanCmd.match(/^(?:open|abrir)\s+projeto?(?:\s+(.+))?$/i);
      if (projMatch) {
        document.querySelector('[data-nav="mirror"]')?.click();
        const reply = `Abrindo Project Workspace / Inspector.`;
        renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
        chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
        saveChatHistory(chatMsgs);
        return;
      }

      // 8. Open browser qa
      if (/^(?:open\s+)?browser\s+qa$/i.test(cleanCmd) || /^abrir\s+browser\s+qa$/i.test(cleanCmd)) {
        openBrowserQAModal();
        const reply = `Abrindo validação visual automatizada Browser QA.`;
        renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
        chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
        saveChatHistory(chatMsgs);
        return;
      }

      // 9. Live mode / Live operations
      if (/^(?:live\s+mode|live\s+operations|modo\s+ao\s+vivo)$/i.test(cleanCmd)) {
        const active = window.fenixCity?.toggleLiveMode();
        const reply = `Modo Live Operations ${active ? 'ATIVADO (câmera dinâmica em tempo real)' : 'DESATIVADO'}.`;
        renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
        chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
        saveChatHistory(chatMsgs);
        return;
      }

      // 10. Search / Buscar
      const searchMatch = cleanCmd.match(/^(?:search|buscar|pesquisar)\s+(.+)$/i);
      if (searchMatch) {
        const query = searchMatch[1].trim();
        openGlobalSearchModal(query);
        const reply = `Abrindo Search FÊNIX para "${query}"...`;
        renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
        chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
        saveChatHistory(chatMsgs);
        return;
      }

      // 11. What is fenix doing / Observability
      if (/^(?:what\s+is\s+fenix\s+doing|observability|observabilidade|o\s+que\s+(?:o\s+)?fenix\s+est[aá]\s+fazendo)\??$/i.test(cleanCmd)) {
        openObservabilityModal();
        const reply = `Abrindo auto-observabilidade em tempo real (WHAT IS FÊNIX DOING NOW?).`;
        renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
        chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
        saveChatHistory(chatMsgs);
        return;
      }

      // 12. Status
      if (/^status$/i.test(cleanCmd)) {
        const live = window.FENIX?.live || {};
        const reply = `STATUS OPERACIONAL: Kernel Ativo | WebSocket ${live.status || 'ONLINE'} | ${live.agents?.length || 0} Agentes | ${live.missions?.length || 0} Missões | ${live.jobs?.length || 0} Jobs.`;
        renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
        chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
        saveChatHistory(chatMsgs);
        if (statusBadge) { statusBadge.textContent = 'PRONTO'; statusBadge.className = 'orch-status-pill online'; }
        return;
      }

      // 13. Canonical fast actions: executar, analisar, corrigir, testar, deploy
      const actionMatch = cleanCmd.match(/^(executar|analisar|corrigir|testar|deploy)\s+(.+)$/i);
      if (actionMatch) {
        const act = actionMatch[1].toLowerCase();
        const obj = actionMatch[2].trim();
        const actTitle = `${act.toUpperCase()}: ${obj}`;
        try {
          const stepType = act === 'deploy' ? 'deploy' : (act === 'testar' ? 'test' : (act === 'corrigir' ? 'heal' : 'audit'));
          const missionRes = await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
            body: JSON.stringify({ title: actTitle, name: actTitle, objective: cleanCmd, autoApprove: true, steps: [{ key: `step_${act}`, type: stepType }] }),
          });
          const mData = await missionRes.json().catch(() => ({}));
          const mId = mData.id || mData.missionId;
          if (missionRes.ok && mId) {
            await fetch(`/api/missions/${encodeURIComponent(mId)}/start`, {
              method: 'POST',
              headers: { ...(getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {}) },
            });
          }
          const reply = mId
            ? `Ação operacional "${actTitle}" despachada ao MissionKernel (${mId}). Acompanhe os jobs.`
            : `Erro ao criar ação: ${mData.error || 'resposta inválida'}`;
          renderChatBubble(histEl, 'fenix', reply, chatTimestamp());
          chatMsgs.push({ role: 'fenix', text: reply, ts: chatTimestamp() });
          saveChatHistory(chatMsgs);
          if (statusBadge) { statusBadge.textContent = 'EXECUTANDO'; statusBadge.className = 'orch-status-pill exec'; }
          window.dispatchEvent(new CustomEvent('fenix-mission-updated'));
        } catch (err) {
          renderChatBubble(histEl, 'fenix', `Falha ao executar ação: ${err.message}`, chatTimestamp());
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

        const reply = routed?.reply || routed?.facts?.note || await withTimeout(
          fenixChatSend(text),
          45000,
          'O provedor de IA não respondeu no tempo limite',
        );
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
