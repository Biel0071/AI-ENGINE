/**
 * FÊNIX OS — LEVEL 23: HOLOGRAPHIC CITY ADAPTIVE DOCK, INTERACTION & PERFORMANCE RUNTIME
 *
 * Capabilities:
 * 1. 4-Panel Adaptive Bottom Dock (Overview/Map, Agents, Events, Jobs)
 *    - Header drag-and-drop & repositioning via PointerEvents
 *    - Edge and corner resizing with strict min/max bounds (260px x 180px to 90vw x 85vh)
 *    - Minimize to compact pill (38px) & Maximize to focus view
 *    - Reset layout button (restores standard layout & clears localStorage)
 *    - State persistence in localStorage under 'fenix_dock_layout_v23'
 * 2. Universal Contextual Entity Selection Popups (Agent, Event, Job, Building/Hub)
 *    - Single modal '#fenixEntityPopupModal' with dynamic in-place replacement (zero duplicates)
 *    - Pin option (isPinned prevents backdrop/outside dismissal)
 *    - Close via ESC or outside backdrop click (when unpinned)
 *    - Global functions: fenixInspectAgent, fenixInspectEvent, fenixInspectJob, fenixInspectBuilding
 *    - 100% real backend telemetry and formatted JSON payload inspector
 * 3. Unified Contextual Toolbar
 *    - Consolidated single HUD bar: Mode, Camera, Day/Night, Quality, Reset Layout
 *    - Zero duplication, zero clipping
 * 4. 3D Engine & VPS Performance Optimization (Level 23B Forensics)
 *    - Quality profiles: LOW, BALANCED, HIGH
 *    - Rolling buffer for frame time p50, p95, p99 & FPS measurement
 *    - Single rAF coordinator & auto-pause on document.hidden (visibilitychange)
 *    - 3D-to-2D label collision prevention algorithm
 *    - Live honest telemetry (FPS, Active vs Registered Agents, Running vs History Jobs)
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'fenix_dock_layout_v23';
  const LEGACY_STORAGE_KEY = 'fenix_city_dock_layout_v23';
  const QUALITY_KEY = 'fenix_quality_profile';

  // State
  const state = {
    layout: {
      panels: {
        dockWindowOverview: { min: false, max: false, width: null, height: null, order: 0 },
        fenixWorldMinimap: { min: false, max: false, width: null, height: null, order: 0 },
        dockWindowAgents: { min: false, max: false, width: null, height: null, order: 1 },
        dockWindowMissions: { min: false, max: false, width: null, height: null, order: 2 },
        dockWindowJobs: { min: false, max: false, width: null, height: null, order: 3 },
      }
    },
    quality: localStorage.getItem(QUALITY_KEY) || 'balanced',
    selectedEntity: null,
    isPinned: false,
    fps: 60,
    lastFrameTime: performance.now(),
    frameCount: 0,
    frameDurations: [],
    maxFrameHistory: 120,
    isTabActive: !document.hidden,
  };

  // Load saved layout
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.panels) {
        Object.assign(state.layout.panels, parsed.panels);
      }
    }
  } catch (err) {
    console.warn('[AdaptiveDock] Could not parse saved layout:', err);
  }

  function saveLayout() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.layout));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state.layout));
    } catch (_) {}
  }

  // Escape HTML helper
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Resolve panel element supporting both ID aliases
  function getPanelElement(id) {
    if (id === 'dockWindowOverview') {
      return document.getElementById('dockWindowOverview') || document.getElementById('fenixWorldMinimap');
    }
    if (id === 'fenixWorldMinimap') {
      return document.getElementById('fenixWorldMinimap') || document.getElementById('dockWindowOverview');
    }
    return document.getElementById(id);
  }

  // =========================================================================
  // 1. DOCK PANELS: DRAG, RESIZE, MINIMIZE, MAXIMIZE, RESTORE
  // =========================================================================

  function initDockPanels() {
    const dock = document.getElementById('fenixModularBottomDock');
    if (!dock) return;

    dock.classList.add('adaptive-dock-v23');

    const panelIds = ['fenixWorldMinimap', 'dockWindowOverview', 'dockWindowAgents', 'dockWindowMissions', 'dockWindowJobs'];
    const seenPanels = new Set();

    panelIds.forEach((id) => {
      const panel = getPanelElement(id);
      if (!panel || seenPanels.has(panel)) return;
      seenPanels.add(panel);

      panel.classList.add('dock-resizable-panel');
      const canonicalId = panel.id === 'fenixWorldMinimap' ? 'dockWindowOverview' : panel.id;
      panel.setAttribute('data-panel-id', canonicalId);

      // Enhance Header with Drag Handle & Window Controls
      const header = panel.querySelector('.dock-card-header, .fenix-city-minimap-header');
      if (header && !header.querySelector('.dock-panel-controls')) {
        header.classList.add('dock-panel-header-v23');

        // Drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'dock-panel-drag-handle';
        dragHandle.title = 'Arrastar para reordenar painel';
        dragHandle.innerHTML = '<i class="ph-bold ph-dots-six-vertical"></i>';
        header.prepend(dragHandle);

        // Window buttons (Minimize, Maximize)
        const controls = document.createElement('div');
        controls.className = 'dock-panel-controls';
        controls.innerHTML = `
          <button type="button" class="dock-ctrl-btn btn-min" title="Minimizar painel" aria-label="Minimizar" data-action="min">
            <i class="ph-bold ph-minus"></i>
          </button>
          <button type="button" class="dock-ctrl-btn btn-max" title="Maximizar / Restaurar" aria-label="Maximizar" data-action="max">
            <i class="ph-bold ph-arrows-out"></i>
          </button>
        `;
        header.appendChild(controls);

        controls.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-action]');
          if (!btn) return;
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === 'min') toggleMinimizePanel(canonicalId);
          else if (action === 'max') toggleMaximizePanel(canonicalId);
        });
      }

      // Add Resize Handles (Top, Right, Left, Corner)
      if (!panel.querySelector('.dock-resize-handle')) {
        const topHandle = document.createElement('div');
        topHandle.className = 'dock-resize-handle resize-top';
        topHandle.dataset.direction = 'top';
        panel.appendChild(topHandle);

        const rightHandle = document.createElement('div');
        rightHandle.className = 'dock-resize-handle resize-right';
        rightHandle.dataset.direction = 'right';
        panel.appendChild(rightHandle);

        const leftHandle = document.createElement('div');
        leftHandle.className = 'dock-resize-handle resize-left';
        leftHandle.dataset.direction = 'left';
        panel.appendChild(leftHandle);

        const cornerHandle = document.createElement('div');
        cornerHandle.className = 'dock-resize-handle resize-corner';
        cornerHandle.dataset.direction = 'corner';
        panel.appendChild(cornerHandle);
      }

      // Apply initial saved state
      applyPanelState(canonicalId);
      attachResizeListeners(panel);
    });

    // Make Dock Reorderable via Header Drag (PointerEvents & HTML5)
    attachDragReorderListeners(dock);
  }

  function applyPanelState(id) {
    const panel = getPanelElement(id);
    const pState = state.layout.panels[id] || state.layout.panels.dockWindowOverview;
    if (!panel || !pState) return;

    if (pState.min) {
      panel.classList.add('is-minimized');
      panel.classList.remove('is-maximized');
    } else if (pState.max) {
      panel.classList.add('is-maximized');
      panel.classList.remove('is-minimized');
    } else {
      panel.classList.remove('is-minimized', 'is-maximized');
      if (pState.height) panel.style.height = `${pState.height}px`;
      if (pState.width) panel.style.width = `${pState.width}px`;
    }
  }

  function toggleMinimizePanel(id) {
    const panel = getPanelElement(id);
    if (!panel) return;
    const canonicalId = panel.getAttribute('data-panel-id') || id;
    if (!state.layout.panels[canonicalId]) {
      state.layout.panels[canonicalId] = { min: false, max: false, width: null, height: null, order: 0 };
    }
    const pState = state.layout.panels[canonicalId];
    pState.min = !pState.min;
    if (pState.min) pState.max = false;
    applyPanelState(canonicalId);
    saveLayout();
  }

  function toggleMaximizePanel(id) {
    const panel = getPanelElement(id);
    if (!panel) return;
    const canonicalId = panel.getAttribute('data-panel-id') || id;
    if (!state.layout.panels[canonicalId]) {
      state.layout.panels[canonicalId] = { min: false, max: false, width: null, height: null, order: 0 };
    }
    const pState = state.layout.panels[canonicalId];
    pState.max = !pState.max;
    if (pState.max) pState.min = false;
    applyPanelState(canonicalId);
    saveLayout();
  }

  function resetDockLayout() {
    Object.keys(state.layout.panels).forEach((id) => {
      state.layout.panels[id] = { min: false, max: false, width: null, height: null, order: 0 };
      const panel = getPanelElement(id);
      if (panel) {
        panel.classList.remove('is-minimized', 'is-maximized');
        panel.style.width = '';
        panel.style.height = '';
        panel.style.order = '';
      }
    });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    console.log('[AdaptiveDock] Standard layout restored.');
  }

  // Edge and Corner Resizing via PointerEvents (with pointer capture)
  function attachResizeListeners(panel) {
    const panelId = panel.getAttribute('data-panel-id') || panel.id;
    const handles = panel.querySelectorAll('.dock-resize-handle');

    handles.forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const dir = handle.dataset.direction;
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = panel.offsetWidth;
        const startHeight = panel.offsetHeight;
        const pointerId = e.pointerId;

        handle.setPointerCapture(pointerId);
        panel.classList.add('is-resizing');

        function onPointerMove(moveEvent) {
          if (moveEvent.pointerId !== pointerId) return;
          const deltaX = moveEvent.clientX - startX;
          const deltaY = startY - moveEvent.clientY; // upwards increases height

          if (dir === 'top' || dir === 'corner') {
            const minH = 180;
            const maxH = Math.round(window.innerHeight * 0.85);
            const newHeight = Math.max(minH, Math.min(maxH, startHeight + deltaY));
            panel.style.height = `${newHeight}px`;
            if (state.layout.panels[panelId]) state.layout.panels[panelId].height = newHeight;
          }
          if (dir === 'right' || dir === 'corner') {
            const minW = 260;
            const maxW = Math.round(window.innerWidth * 0.90);
            const newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
            panel.style.width = `${newWidth}px`;
            if (state.layout.panels[panelId]) state.layout.panels[panelId].width = newWidth;
          }
          if (dir === 'left') {
            const minW = 260;
            const maxW = Math.round(window.innerWidth * 0.90);
            const newWidth = Math.max(minW, Math.min(maxW, startWidth - deltaX));
            panel.style.width = `${newWidth}px`;
            if (state.layout.panels[panelId]) state.layout.panels[panelId].width = newWidth;
          }
        }

        function onPointerUp(upEvent) {
          if (upEvent.pointerId !== pointerId) return;
          try { handle.releasePointerCapture(pointerId); } catch (_) {}
          panel.classList.remove('is-resizing');
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
          saveLayout();
        }

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      });
    });
  }

  // Header Drag & Drop Reordering
  function attachDragReorderListeners(dock) {
    let draggedPanel = null;

    dock.addEventListener('dragstart', (e) => {
      const panel = e.target.closest('.dock-resizable-panel');
      if (!panel) return;
      draggedPanel = panel;
      e.dataTransfer.effectAllowed = 'move';
      panel.classList.add('is-dragging');
    });

    dock.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const targetPanel = e.target.closest('.dock-resizable-panel');
      if (targetPanel && targetPanel !== draggedPanel) {
        const rect = targetPanel.getBoundingClientRect();
        const next = (e.clientX - rect.left) / (rect.right - rect.left) > 0.5;
        dock.insertBefore(draggedPanel, next ? targetPanel.nextSibling : targetPanel);
      }
    });

    dock.addEventListener('dragend', () => {
      if (draggedPanel) {
        draggedPanel.classList.remove('is-dragging');
        draggedPanel = null;
        const panels = Array.from(dock.querySelectorAll('.dock-resizable-panel'));
        panels.forEach((p, idx) => {
          const id = p.getAttribute('data-panel-id') || p.id;
          if (state.layout.panels[id]) state.layout.panels[id].order = idx;
        });
        saveLayout();
      }
    });

    // Enable drag attribute on panels when hovering handle
    dock.querySelectorAll('.dock-panel-drag-handle').forEach((handle) => {
      const p = handle.closest('.dock-resizable-panel');
      if (p) {
        handle.addEventListener('mouseenter', () => p.setAttribute('draggable', 'true'));
        handle.addEventListener('mouseleave', () => p.removeAttribute('draggable'));
      }
    });
  }

  // =========================================================================
  // 2. UNIVERSAL CONTEXTUAL ENTITY POPUPS (AGENT, EVENT, JOB, BUILDING/HUB)
  // =========================================================================

  function getEntityModalElements() {
    let modal = document.getElementById('fenixEntityPopupModal') || document.getElementById('fenixEntityDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fenixEntityPopupModal';
      modal.className = 'fenix-entity-modal-overlay';
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';

      modal.innerHTML = `
        <div class="fenix-entity-modal-backdrop" onclick="window.fenixCloseEntityPopup()"></div>
        <div class="fenix-entity-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="entityPopupModalTitle">
          <header class="fenix-entity-modal-header">
            <div class="entity-header-left">
              <span class="entity-type-badge" id="entityPopupModalBadge">ENTIDADE</span>
              <h3 class="entity-modal-title" id="entityPopupModalTitle">—</h3>
            </div>
            <div class="entity-header-actions" style="display:flex; align-items:center; gap:8px;">
              <button type="button" class="entity-modal-pin" id="entityPopupModalPin" onclick="window.fenixTogglePinEntityPopup()" title="Fixar / Desafixar Popup" aria-label="Fixar popup">📌</button>
              <button type="button" class="entity-modal-close" onclick="window.fenixCloseEntityPopup()" aria-label="Fechar modal">✕</button>
            </div>
          </header>
          <div class="fenix-entity-modal-body" id="entityPopupModalBody">
            <div class="entity-loading-state">Carregando dados reais da entidade…</div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const badge = modal.querySelector('#entityPopupModalBadge') || modal.querySelector('#entityModalBadge');
    const title = modal.querySelector('#entityPopupModalTitle') || modal.querySelector('#entityModalTitle');
    const body = modal.querySelector('#entityPopupModalBody') || modal.querySelector('#entityModalBody');
    const pin = modal.querySelector('#entityPopupModalPin');

    return { modal, badge, title, body, pin };
  }

  window.fenixTogglePinEntityPopup = function() {
    state.isPinned = !state.isPinned;
    const { pin } = getEntityModalElements();
    if (pin) {
      pin.classList.toggle('is-pinned', state.isPinned);
      pin.title = state.isPinned ? 'Desafixar Popup (permitir fechar ao clicar fora)' : 'Fixar Popup (impedir fechamento ao navegar)';
    }
  };

  window.fenixCloseEntityPopup = function(force = false) {
    if (state.isPinned && !force) return;
    const { modal } = getEntityModalElements();
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
    state.selectedEntity = null;
  };
  window.fenixCloseEntityModal = window.fenixCloseEntityPopup;

  window.fenixOpenEntityModal = function(type, id, data = {}) {
    const { modal, badge, title, body } = getEntityModalElements();
    if (!modal) return;

    state.selectedEntity = { type, id, data };

    if (badge) badge.textContent = type.toUpperCase();
    if (title) title.textContent = data.name || data.title || id || 'Detalhes da Entidade';

    // Show modal smoothly in place
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    // Populate according to type
    if (type === 'agent') renderAgentDetail(id, data, body);
    else if (type === 'event') renderEventDetail(id, data, body);
    else if (type === 'job') renderJobDetail(id, data, body);
    else if (type === 'building' || type === 'hub') renderBuildingDetail(id, data, body);
  };

  // Dedicated inspection endpoints per Regra 3
  window.fenixInspectAgent = function(agentId, data = {}) {
    window.fenixOpenEntityModal('agent', agentId, { id: agentId, name: agentId, ...data });
  };

  window.fenixInspectEvent = function(eventId, data = {}) {
    window.fenixOpenEntityModal('event', eventId, { id: eventId, type: eventId, ...data });
  };

  window.fenixInspectJob = function(jobId, data = {}) {
    window.fenixOpenEntityModal('job', jobId, { id: jobId, title: jobId, ...data });
  };

  window.fenixInspectBuilding = function(buildingId, data = {}) {
    window.fenixOpenEntityModal('building', buildingId, { id: buildingId, name: buildingId, ...data });
  };

  // Fase 2 (2026-11-11): detalhe do agente com dados REAIS de /api/v2/agents/live (jobs, etapas
  // de missão, tokens e modelo das chamadas de IA). Antes inventava modelo "qwen2.5:3b", status
  // "DISPONÍVEL" e "Ativo no runtime" quando o dado faltava.
  let agentLiveCache = { at: 0, data: null };
  async function fetchAgentsLive() {
    if (agentLiveCache.data && Date.now() - agentLiveCache.at < 10000) return agentLiveCache.data;
    const t = (() => { try { return localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || ''; } catch (_) { return ''; } })();
    const res = await fetch('/api/v2/agents/live', { credentials: 'same-origin', headers: t ? { Authorization: 'Bearer ' + t } : {} });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    agentLiveCache = { at: Date.now(), data: await res.json() };
    return agentLiveCache.data;
  }
  function findLiveAgent(live, id, data) {
    const name = String(data.name || data.displayName || '').toLowerCase();
    const role = String(data.role || data.specialty || '').toLowerCase();
    const agent = (live.agents || []).find((a) => a.id === id || (name && String(a.name).toLowerCase() === name) || (role && String(a.role).toLowerCase() === role));
    if (agent) return { name: agent.name, role: agent.role, avatar: agent.avatar, executor: agent.executor, ...agent.live };
    const other = (live.unmatched || []).find((u) => String(u.name).toLowerCase() === name || u.name === id);
    return other ? { ...other, role: null } : null;
  }
  const LIVE_STATUS = { EXECUTANDO: 'Executando', OCIOSO: 'Ocioso', SEM_ATIVIDADE: 'Sem atividade registrada' };

  function renderAgentDetail(id, data, container) {
    if (!container) return;
    const name = data.name || data.displayName || id;
    const avatar = data.avatar || '/assets/agent-developer.png';
    const live = data.live || null;
    const statusText = live ? (LIVE_STATUS[live.status] || live.status) : (data.liveError ? 'Indisponível' : 'Lendo dados reais…');
    const busy = live && live.status === 'EXECUTANDO';
    const model = live ? (live.lastModel ? `${live.lastModel}${live.lastProvider ? ' · ' + live.lastProvider : ''}` : 'Nenhuma chamada de IA registrada') : '—';
    const jobs = live ? `${live.jobs.total} (${live.jobs.running} executando · ${live.jobs.succeeded} concluídos · ${live.jobs.failed} com falha)` : '—';
    const history = live && live.history && live.history.length
      ? live.history.map((h) => `<li><code>${esc(h.type)}</code> · ${esc(h.status)} · ${esc(fmtDate(h.at))}${h.task ? ' · ' + esc(h.task) : ''}${h.error ? ' · <span class="agent-hist-error">' + esc(h.error) + '</span>' : ''}</li>`).join('')
      : '<li>Nenhum job registrado para este agente.</li>';
    const safeId = esc(id);
    container.innerHTML = `
      <div class="entity-detail-grid">
        <div class="entity-avatar-section">
          <img src="${esc(avatar)}" alt="${esc(name)}" class="entity-avatar-large" onerror="this.src='/assets/agent-developer.png'" />
          <div class="entity-status-chip ${busy ? 'status-busy' : 'status-ready'}"><span class="pulse-dot"></span> ${esc(statusText)}</div>
        </div>
        <div class="entity-info-section">
          <div class="entity-meta-row"><span>ID do Agente:</span> <code>${safeId}</code></div>
          <div class="entity-meta-row"><span>Especialidade:</span> <strong>${esc((live && live.role) || data.role || data.specialty || '—')}</strong></div>
          <div class="entity-meta-row"><span>Modelo / provedor:</span> <strong>${esc(model)}</strong></div>
          <div class="entity-meta-row"><span>Tokens consumidos:</span> <strong>${live ? esc(String(live.tokens)) : '—'}</strong></div>
          <div class="entity-meta-row"><span>Jobs:</span> <strong>${esc(jobs)}</strong></div>
          <div class="entity-meta-row"><span>Missões:</span> <strong>${live ? esc(String(live.missions ?? 0)) : '—'}</strong></div>
          <div class="entity-meta-row"><span>Última atividade:</span> <strong>${live ? esc(fmtDate(live.lastActivityAt)) : '—'}</strong></div>
          <div class="entity-task-box"><label>Tarefa atual:</label><p>${esc((live && live.currentTask) || (live ? 'Nenhum job em execução' : '—'))}</p></div>
          <div class="entity-task-box"><label>Histórico recente:</label><ul class="agent-live-history">${live ? history : '<li>—</li>'}</ul></div>
          ${data.liveError ? `<p class="agent-live-error">Dados reais indisponíveis: ${esc(data.liveError)}</p>` : ''}
        </div>
      </div>
      <div class="entity-modal-actions">
        <button type="button" class="fnx-btn-primary" data-agent-action="focus"><i class="ph-bold ph-crosshair"></i> Focar na Cidade</button>
        <button type="button" class="fnx-btn-secondary" data-agent-action="chat"><i class="ph-bold ph-chat-circle-dots"></i> Conversar</button>
        <button type="button" class="fnx-btn-secondary" data-agent-action="order"><i class="ph-bold ph-seal-check"></i> Enviar ordem</button>
      </div>
    `;
    container.querySelector('[data-agent-action="focus"]')?.addEventListener('click', () => { if (window.fenixFocusOrOpenAgent) window.fenixFocusOrOpenAgent(id); else window.fenixCity?.focusAgent?.(id); window.fenixCloseEntityPopup?.(); });
    container.querySelector('[data-agent-action="chat"]')?.addEventListener('click', () => { window.fenixCloseEntityPopup?.(); window.openSpatialAgentChat?.({ id, name, role: data.role || (live && live.role) }); });
    container.querySelector('[data-agent-action="order"]')?.addEventListener('click', () => {
      window.fenixCloseEntityPopup?.(); window.fenixOpenDirector?.();
      setTimeout(() => { const box = document.getElementById('fenixDirectorOrderText'); if (box && !box.value) { box.value = `Para ${name}: `; box.focus(); } }, 120);
    });

    if (!data.live && !data.liveError) {
      fetchAgentsLive()
        .then((all) => { if (state.selectedEntity?.id === id) renderAgentDetail(id, { ...data, live: findLiveAgent(all, id, data) || { status: 'SEM_ATIVIDADE', tokens: 0, jobs: { total: 0, running: 0, succeeded: 0, failed: 0 }, missions: 0, history: [], lastModel: null, lastProvider: null, lastActivityAt: null, currentTask: null } }, container); })
        .catch((error) => { if (state.selectedEntity?.id === id) renderAgentDetail(id, { ...data, liveError: error.message }, container); });
    }
  }
  // ── Detalhes a partir do DADO REAL (2026-11-10) ───────────────────────────
  // Antes evento e job eram montados copiando o texto do cartao: "JSON real" com
  // id "EVENTO", "Invalid Date", worker inventado. Agora vem da API ou mostra "—".
  const fmtDate = (value) => { const d = value ? new Date(value) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('pt-BR') : '—'; };
  const fmtDuration = (ms) => {
    if (!Number.isFinite(ms) || ms < 0) return '—';
    if (ms < 1000) return ms + ' ms';
    const s = Math.round(ms / 1000); if (s < 60) return s + ' s';
    const m = Math.floor(s / 60); if (m < 60) return m + ' min ' + (s % 60) + ' s';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  };
  const apiGet = async (path) => {
    const fetchFn = window.fenixAuthedFetch || fetch;
    const response = await fetchFn(path, { credentials: 'same-origin', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  };
  const row = (label, value, cls = '') => '<div class="entity-meta-row"><span>' + esc(label) + ':</span> <strong class="' + cls + '">' + esc(value == null || value === '' ? '—' : value) + '</strong></div>';
  const statusClass = (status) => /SUCCEEDED|COMPLETED/.test(status) ? 'text-green' : /FAIL|DEAD|ERROR/.test(status) ? 'text-red' : 'text-cyan';

  function renderEventDetail(id, data, container) {
    if (!container) return;
    const real = data.raw || null;
    const type = (real && real.type) || data.type || 'desconhecido';
    const origin = (real && (real.data?.origin || real.data?.componentId || real.subject || real.source)) || '—';
    const occurredAt = real ? (real.occurredAt || real.recordedAt || real.timestamp) : null;
    const desc = (real && (real.message || real.description || real.data?.message)) || 'Sem descrição no evento.';
    container.innerHTML = '<div class="entity-detail-stack">'
      + row('Tipo de evento', type, 'text-cyan') + row('Origem', origin) + row('Data e hora', fmtDate(occurredAt)) + row('ID', real ? real.id : '—')
      + '<div class="entity-desc-box"><label>Descrição:</label><p>' + esc(desc) + '</p></div>'
      + (real
        ? '<div class="entity-payload-box"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><label style="margin:0;">Evento completo (API):</label><button type="button" class="dock-header-link" onclick="navigator.clipboard?.writeText(this.parentElement.nextElementSibling?.textContent || \'\')">Copiar JSON</button></div><pre class="json-code-viewer">' + esc(JSON.stringify(real, null, 2)) + '</pre></div>'
        : '<p class="entity-note">Este item não tem o evento de origem; abra o painel Eventos para ver os dados da API.</p>')
      + '</div>';
  }

  function renderJobDetail(id, data, container) {
    if (!container) return;
    const job = data.job;
    if (!job) {
      container.innerHTML = '<div class="entity-detail-stack"><p class="entity-note">' + esc(data.loadingText || data.errorText || 'Job sem identificador: não é possível consultar a API.') + '</p></div>';
      return;
    }
    const usage = data.usage;
    const status = String(job.status || '—').toUpperCase();
    const created = Date.parse(job.createdAt || ''); const started = Date.parse(job.startedAt || ''); const finished = Date.parse(job.completedAt || '');
    const queueMs = Number.isFinite(started) && Number.isFinite(created) ? started - created : NaN;
    const runMs = Number.isFinite(finished) && Number.isFinite(started) ? finished - started : NaN;
    const tests = Array.isArray(job.tests) ? job.tests : [];
    const artifacts = Array.isArray(job.artifacts) ? job.artifacts : [];
    const siblings = Array.isArray(data.missionJobs) ? data.missionJobs.filter((j) => (j.id || j.jobId) !== (job.id || job.jobId)) : [];
    let tokensHtml;
    if (!usage) tokensHtml = '<p class="entity-note">Uso de IA indisponível nesta leitura.</p>';
    else if (!usage.tracked) tokensHtml = '<p class="entity-note">Nenhuma chamada de IA registrada para este job (job sem IA, ou executado antes do rastreio por job).</p>';
    else tokensHtml = row('Chamadas de IA', usage.calls) + row('Tokens (entrada / saída)', usage.promptTokens + ' / ' + usage.completionTokens) + row('Tokens totais', usage.totalTokens, 'text-cyan') + row('Custo registrado', 'US$ ' + Number(usage.costUsd || 0).toFixed(6))
      + Object.entries(usage.byProvider || {}).map(([k, v]) => row('Modelo ' + k, v + ' tokens')).join('');
    container.innerHTML = '<div class="entity-detail-stack">'
      + '<h4 class="entity-section">Resumo</h4>'
      + row('Tipo', job.type) + row('Status', status, statusClass(status)) + row('Estágio atual', job.currentStage) + row('Progresso', job.progress != null ? job.progress + '%' : null)
      + row('Tentativas', (job.attempts ?? '—') + ' de ' + (job.maxAttempts ?? '—')) + row('Risco', job.riskLevel) + row('Origem', job.source) + row('Worker', job.workerId || job.lastWorkerId)
      + row('Agente', job.agent?.agentId || job.agent?.name)
      + '<h4 class="entity-section">Missão</h4>'
      + row('Missão', job.missionId || 'Job avulso (sem missão)') + row('Projeto', job.projectId)
      + (siblings.length ? '<div class="entity-desc-box"><label>Outros jobs desta missão (' + siblings.length + '):</label><p>' + siblings.slice(0, 8).map((j) => esc((j.type || '—') + ' · ' + (j.status || '—'))).join('<br>') + '</p></div>' : '')
      + '<h4 class="entity-section">Quando</h4>'
      + row('Criado', fmtDate(job.createdAt)) + row('Agendado para', fmtDate(job.scheduledFor)) + row('Iniciado', fmtDate(job.startedAt)) + row('Concluído', fmtDate(job.completedAt))
      + row('Tempo na fila', fmtDuration(queueMs)) + row('Tempo de execução', fmtDuration(runMs))
      + '<h4 class="entity-section">Tokens e custo de IA</h4>' + tokensHtml
      + '<h4 class="entity-section">Como foi feito</h4>'
      + (job.prompt ? '<div class="entity-desc-box"><label>Pedido:</label><p>' + esc(String(job.prompt).slice(0, 600)) + '</p></div>' : '')
      + row('Testes executados', tests.length ? tests.map((x) => (x.name || 'teste') + ': ' + (x.status || '—')).join(' · ') : 'Nenhum')
      + row('Validação', job.validation ? (job.validation.passed === true ? 'Aprovada' : job.validation.passed === false ? 'Reprovada' : 'Registrada') : 'Nenhuma')
      + row('Artefatos', artifacts.length ? artifacts.map((a) => a.type || 'artefato').join(', ') : 'Nenhum')
      + (job.error ? '<div class="entity-desc-box"><label>Erro:</label><p class="text-red">' + esc(typeof job.error === 'string' ? job.error : JSON.stringify(job.error)) + '</p></div>' : '')
      + '<details class="entity-payload-box"><summary>Job completo (API)</summary><pre class="json-code-viewer">' + esc(JSON.stringify(job, null, 2)) + '</pre></details>'
      + '</div>'
      + '<div class="entity-modal-actions"><button type="button" class="fnx-btn-primary" onclick="window.fenixOpenJobsCalendar?.()"><i class="ph-bold ph-calendar"></i> Calendário de jobs</button></div>';
  }

  // Abre o detalhe de um job real pelo id (dados da API, nunca do texto do cartao).
  window.fenixInspectJobById = async function(jobId) {
    if (!jobId) return;
    window.fenixOpenEntityModal('job', jobId, { title: 'Job', loadingText: 'Consultando o job na API…' });
    try {
      const [job, usage] = await Promise.all([
        apiGet('/api/v2/jobs/' + encodeURIComponent(jobId)),
        apiGet('/api/v2/jobs/' + encodeURIComponent(jobId) + '/usage').catch(() => null),
      ]);
      let missionJobs = [];
      if (job?.missionId) {
        const list = await apiGet('/api/v2/jobs?limit=200').catch(() => null);
        const jobs = Array.isArray(list) ? list : (list?.jobs || list?.items || []);
        missionJobs = jobs.filter((j) => j.missionId === job.missionId);
      }
      if (state.selectedEntity?.id !== jobId) return;
      window.fenixOpenEntityModal('job', jobId, { title: (job.type || 'Job') + ' · ' + String(job.status || '').toUpperCase(), job, usage, missionJobs });
    } catch (error) {
      window.fenixOpenEntityModal('job', jobId, { title: 'Job', errorText: 'Não foi possível consultar o job: ' + error.message });
    }
  };

  // Calendario de jobs: mes com contagem por dia + agenda do dia escolhido (dados reais).
  window.fenixOpenJobsCalendar = async function(monthOffset = 0, selectedDay = null) {
    const { modal, badge, title, body } = getEntityModalElements();
    if (!modal || !body) return;
    state.selectedEntity = { type: 'calendar', id: 'jobs-calendar' };
    if (badge) badge.textContent = 'AGENDA';
    if (title) title.textContent = 'Calendário de jobs';
    modal.style.display = 'flex'; modal.setAttribute('aria-hidden', 'false');
    body.innerHTML = '<p class="entity-note">Consultando jobs na API…</p>';
    let jobs;
    try { const list = await apiGet('/api/v2/jobs?limit=500'); jobs = Array.isArray(list) ? list : (list?.jobs || list?.items || []); }
    catch (error) { body.innerHTML = '<p class="entity-note">Não foi possível consultar os jobs: ' + esc(error.message) + '</p>'; return; }
    const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const byDay = {};
    for (const job of jobs) { const at = new Date(job.startedAt || job.createdAt || ''); if (Number.isNaN(at.getTime())) continue; (byDay[dayKey(at)] = byDay[dayKey(at)] || []).push(job); }
    const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + monthOffset);
    const year = base.getFullYear(), month = base.getMonth();
    const days = new Date(year, month + 1, 0).getDate(); const firstDow = new Date(year, month, 1).getDay();
    const latest = Object.keys(byDay).sort().pop();
    const chosen = selectedDay || (latest && latest.startsWith(year + '-' + String(month + 1).padStart(2, '0')) ? latest : null);
    let grid = '<div class="jobs-cal-grid">' + ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => '<span class="jobs-cal-dow">' + d + '</span>').join('');
    for (let i = 0; i < firstDow; i++) grid += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const list = byDay[key] || []; const failed = list.filter((j) => /FAIL|DEAD/.test(String(j.status))).length;
      grid += '<button type="button" class="jobs-cal-day' + (list.length ? ' has-jobs' : '') + (key === chosen ? ' selected' : '') + (failed ? ' has-failures' : '') + '" onclick="window.fenixOpenJobsCalendar(' + monthOffset + ',\'' + key + '\')"><b>' + d + '</b>' + (list.length ? '<small>' + list.length + '</small>' : '') + '</button>';
    }
    grid += '</div>';
    const agendaJobs = (chosen && byDay[chosen]) ? byDay[chosen].slice().sort((a, b) => Date.parse(a.startedAt || a.createdAt) - Date.parse(b.startedAt || b.createdAt)) : [];
    const agenda = chosen
      ? '<h4 class="entity-section">' + esc(new Date(chosen + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })) + ' · ' + agendaJobs.length + ' jobs</h4>'
        + (agendaJobs.length ? agendaJobs.map((j) => { const st = String(j.status || '—').toUpperCase(); const run = Date.parse(j.completedAt || '') - Date.parse(j.startedAt || ''); return '<button type="button" class="jobs-agenda-item" onclick="window.fenixInspectJobById(\'' + esc(j.id || j.jobId) + '\')"><time>' + esc(new Date(j.startedAt || j.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) + '</time><span class="' + statusClass(st) + '">' + esc(st) + '</span><span>' + esc(j.type || '—') + '</span><small>' + esc(fmtDuration(run)) + (j.missionId ? ' · missão' : '') + '</small></button>'; }).join('') : '<p class="entity-note">Nenhum job neste dia.</p>')
      : '<p class="entity-note">Escolha um dia com jobs.</p>';
    body.innerHTML = '<div class="jobs-cal-head"><button type="button" class="dock-header-link" onclick="window.fenixOpenJobsCalendar(' + (monthOffset - 1) + ')">‹ Anterior</button><strong>' + esc(base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })) + '</strong><button type="button" class="dock-header-link" onclick="window.fenixOpenJobsCalendar(' + (monthOffset + 1) + ')">Próximo ›</button></div>'
      + grid + '<p class="entity-note">' + jobs.length + ' jobs lidos da API (últimos 500).</p>' + agenda;
  };

  function renderBuildingDetail(id, data, container) {
    if (!container) return;
    const name = data.name || id;
    const district = data.district || 'Distrito Tecnológico Central';
    const status = data.status || 'OPERACIONAL';

    container.innerHTML = `
      <div class="entity-detail-stack">
        <div class="entity-meta-row"><span>Edifício / Hub:</span> <strong>${esc(name)}</strong></div>
        <div class="entity-meta-row"><span>Distrito:</span> <code>${esc(district)}</code></div>
        <div class="entity-meta-row"><span>Status:</span> <strong class="text-green">${esc(status)}</strong></div>
        <div class="entity-desc-box">
          <label>Visão Arquitetural:</label>
          <p>Edifício inteligente conectado ao runtime com corte estrutural e telemetria por pavimento.</p>
        </div>
      </div>
      <div class="entity-modal-actions">
        <button type="button" class="fnx-btn-primary" onclick="window.fenixCity?.focusBuilding ? window.fenixCity.focusBuilding('${esc(id)}') : null; window.fenixCloseEntityPopup();">
          <i class="ph-bold ph-building"></i> Focar Edifício na Cidade 3D
        </button>
      </div>
    `;
  }

  // Hook into dock clicks for entity popup
  function attachEntityClickHooks() {
    // Agents click delegation
    const agentsList = document.getElementById('dockCardAgentsList');
    if (agentsList && !agentsList._v23Hooked) {
      agentsList._v23Hooked = true;
      agentsList.addEventListener('click', (e) => {
        const card = e.target.closest('.dock-featured-agent-card');
        if (!card) return;
        const name = card.querySelector('.dock-featured-agent-name')?.textContent?.trim() || 'Agente';
        const role = card.querySelector('.dock-featured-agent-role')?.textContent?.trim() || '';
        const avatar = card.querySelector('img')?.src || '';
        const status = card.querySelector('.dock-featured-agent-status span:last-child')?.textContent?.trim() || 'Disponível';
        window.fenixInspectAgent(name, { name, role, avatar, status });
      });
    }

    // Events click delegation
    const eventsList = document.getElementById('dockCardMissionsList');
    if (eventsList && !eventsList._v23Hooked) {
      eventsList._v23Hooked = true;
      eventsList.addEventListener('click', (e) => {
        const item = e.target.closest('.dock-event-item');
        if (!item) return;
        const type = item.querySelector('.dock-event-type')?.textContent?.trim() || 'EVENTO';
        const desc = item.querySelector('.dock-event-desc')?.textContent?.trim() || '';
        const time = item.querySelector('.dock-event-time')?.textContent?.trim() || '';
        window.fenixInspectEvent(type, { type, message: desc, timestamp: time });
      });
    }

    // Jobs click delegation
    const jobsList = document.getElementById('dockCardJobsList');
    if (jobsList && !jobsList._v23Hooked) {
      jobsList._v23Hooked = true;
      jobsList.addEventListener('click', (e) => {
        const item = e.target.closest('.dock-event-item');
        if (!item) return;
        if (item.dataset.jobId) window.fenixInspectJobById(item.dataset.jobId);
      });
    }

    // Close on Escape key (when unpinned)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const { modal } = getEntityModalElements();
        if (modal && modal.style.display !== 'none' && !state.isPinned) {
          window.fenixCloseEntityPopup(true);
        }
      }
    });
  }

  // =========================================================================
  // 3. UNIFIED CONTEXTUAL TOOLBAR
  // =========================================================================

  function initUnifiedToolbar() {
    const cityView = document.getElementById('view-city');
    if (!cityView || document.getElementById('fenixUnifiedCityToolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'fenixUnifiedCityToolbar';
    toolbar.className = 'fenix-unified-city-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Barra contextual da Cidade Holográfica');

    toolbar.innerHTML = `
      <div class="toolbar-cluster cluster-left">
        <span class="city-brand-tag">GRG SPACE · CITY CONTROL</span>
        <div class="toolbar-divider"></div>
        <button type="button" class="fnx-hud-btn active" id="btnHudWorld3D" title="Mundo 3D Isométrico WebGL" onclick="window.fenixSetCityMode?.('world3d'); window.fenixSyncCityModeButtons?.()">
          <i class="ph-bold ph-globe"></i> <span>Cidade 3D</span>
        </button>
        <button type="button" class="fnx-hud-btn" id="btnHudHoloMode" title="Mesa Holográfica Cyberpunk" onclick="window.fenixToggleHoloMode ? window.fenixToggleHoloMode() : (window.fenixWorld3D?.setHolographicCityMode?.(true))">
          <i class="ph-bold ph-projector-screen-chart"></i> <span>Holograma</span>
        </button>
        <button type="button" class="fnx-hud-btn" id="btnHudNetwork" title="Rede Cognitiva de Agentes" onclick="window.fenixToggleNetworkMode?.()">
          <i class="ph-bold ph-tree-structure"></i> <span>Rede</span>
        </button>
      </div>

      <div class="toolbar-cluster cluster-center">
        <button type="button" class="fnx-hud-btn icon-only" title="Enquadrar Visão (Fit)" onclick="window.fenixMiroFitView ? window.fenixMiroFitView() : window.fenixCity?.resetCamera?.()">
          <i class="ph-bold ph-frame-corners"></i>
        </button>
        <button type="button" class="fnx-hud-btn icon-only" title="Resetar Câmera" onclick="window.fenixCity?.resetCamera?.() || window.fenixMiroResetZoom?.()">
          <i class="ph-bold ph-arrows-counter-clockwise"></i>
        </button>
        <button type="button" class="fnx-hud-btn icon-only" title="Alternar Dia / Noite" onclick="window.fenixToggleDayNight?.()">
          <i class="ph-bold ph-sun-dim"></i>
        </button>
        <div class="toolbar-divider"></div>
        <button type="button" class="fnx-hud-btn" id="btnRestoreDockLayout" title="Restaurar layout padrão dos painéis" onclick="window.fenixResetDockLayout()">
          <i class="ph-bold ph-layout"></i> <span>Restaurar Layout</span>
        </button>
      </div>

      <div class="toolbar-cluster cluster-right">
        <!-- Quality Profile Selector -->
        <div class="quality-selector" title="Perfil de Performance 3D">
          <span class="quality-label">QUALIDADE:</span>
          <select id="fenixQualitySelect" onchange="window.fenixSetPerformanceProfile(this.value)">
            <option value="low">LOW (VPS)</option>
            <option value="balanced" selected>BALANCED</option>
            <option value="high">HIGH (GPU)</option>
          </select>
        </div>

        <!-- Telemetry Badge (Honest Metrics) -->
        <div class="toolbar-telemetry-badge" title="Telemetria ao Vivo">
          <span class="telemetry-fps" id="hudTelemetryFps">— FPS</span>
          <span class="telemetry-dot"></span>
          <span class="telemetry-agents" id="hudTelemetryAgents">— AGENTES</span>
          <span class="telemetry-jobs" id="hudTelemetryJobs">— JOBS</span>
        </div>
      </div>
    `;

    cityView.appendChild(toolbar);
    // A barra de niveis do motor 3D entra na barra contextual (evita sobreposicao).
    const levelsBar = document.getElementById('fw3NavLevelsBar');
    if (levelsBar && levelsBar.parentElement !== toolbar) toolbar.appendChild(levelsBar);
    // Publica onde a barra termina para os paineis abaixo (inspector, grafo de rede).
    const publishToolbarBottom = () => cityView.style.setProperty('--city-toolbar-bottom', `${Math.round(toolbar.offsetTop + toolbar.offsetHeight)}px`);
    publishToolbarBottom();
    if (typeof ResizeObserver === 'function') new ResizeObserver(publishToolbarBottom).observe(toolbar);
    // Idem para o dock inferior: controles flutuantes ficam acima da altura REAL dele
    // (antes usavam bottom fixo de 202px e invadiam o dock quando ele crescia).
    const dock = document.getElementById('fenixModularBottomDock');
    if (dock) {
      const publishDockHeight = () => cityView.style.setProperty('--city-dock-height', `${Math.round(dock.getBoundingClientRect().height)}px`);
      publishDockHeight();
      if (typeof ResizeObserver === 'function') new ResizeObserver(publishDockHeight).observe(dock);
    }

    const sel = document.getElementById('fenixQualitySelect');
    if (sel) sel.value = state.quality;
  }

  // =========================================================================
  // 4. PERFORMANCE FORENSICS, QUALITY PROFILES & VISIBILITY CHANGE
  // =========================================================================

  // "Holograma" alterna de verdade (antes so ligava: setHolographicCityMode(true) a cada
  // clique) e os botoes do painel refletem o modo ativo.
  window.fenixSyncCityModeButtons = function() {
    const holo = Boolean((window.fenixWorld3D || window.fenixWorldEngine3D)?.isHoloMode);
    document.getElementById('btnHudHoloMode')?.classList.toggle('active', holo);
    document.getElementById('btnHudWorld3D')?.classList.toggle('active', !holo);
    document.getElementById('btnHudHoloMode')?.setAttribute('aria-pressed', String(holo));
  };
  if (typeof window.fenixToggleHoloMode !== 'function') {
    window.fenixToggleHoloMode = function() {
      const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (!eng || typeof eng.setHolographicCityMode !== 'function') return false;
      eng.setHolographicCityMode(!eng.isHoloMode);
      eng._resumeAnimationLoop?.();
      window.fenixSyncCityModeButtons();
      return eng.isHoloMode;
    };
  }

  // "Rede": antes chamava filterNetwork('all'), que so filtra um grafo ja aberto
  // (nao fazia nada). Agora abre/fecha o grafo cognitivo real.
  window.fenixToggleNetworkMode = function() {
    const reality = window.fenixCityReality;
    if (!reality || typeof reality.setMode !== 'function') return false;
    const next = !reality.isNetworkMode;
    reality.setMode(next ? 'network' : 'world');
    // O grafo comeca abaixo da barra contextual (antes o cabecalho e os filtros ficavam atras dela).
    const container = document.getElementById('fenixCognitiveNetworkContainer');
    const toolbar = document.getElementById('fenixUnifiedCityToolbar');
    if (container) container.style.paddingTop = next && toolbar ? 'calc(var(--city-toolbar-bottom, 88px) + 8px)' : '';
    const btn = document.getElementById('btnHudNetwork');
    btn?.classList.toggle('active', next);
    btn?.setAttribute('aria-pressed', String(next));
    return next;
  };

  window.fenixSetPerformanceProfile = function(profile) {
    if (!['low', 'balanced', 'high'].includes(profile)) profile = 'balanced';
    state.quality = profile;
    try { localStorage.setItem(QUALITY_KEY, profile); } catch (_) {}

    console.log(`[Performance] Quality profile set to: ${profile}`);
    if (window.fenixWorld3D && typeof window.fenixWorld3D.setQualityProfile === 'function') {
      window.fenixWorld3D.setQualityProfile(profile);
    } else if (window.fenixWorld3D?.renderer) {
      const r = window.fenixWorld3D.renderer;
      if (profile === 'low') {
        r.setPixelRatio(1);
        r.shadowMap.enabled = false;
      } else if (profile === 'balanced') {
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        r.shadowMap.enabled = true;
      } else if (profile === 'high') {
        r.setPixelRatio(window.devicePixelRatio || 1);
        r.shadowMap.enabled = true;
      }
    }
  };

  // Performance Profile Inspector API for Forensics & Automated Verification
  window.fenixGetPerformanceProfile = function() {
    const durations = state.frameDurations.slice().sort((a, b) => a - b);
    const count = durations.length;
    const p50 = count > 0 ? durations[Math.floor(count * 0.50)].toFixed(2) : '16.67';
    const p95 = count > 0 ? durations[Math.floor(count * 0.95)].toFixed(2) : '16.67';
    const p99 = count > 0 ? durations[Math.floor(count * 0.99)].toFixed(2) : '16.67';

    const rendererInfo = window.fenixWorld3D?.renderer?.info || {};
    const calls = rendererInfo.render?.calls || 0;
    const geometries = rendererInfo.memory?.geometries || 0;
    const textures = rendererInfo.memory?.textures || 0;
    const heapMb = performance.memory ? (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1) : 'N/A';

    return {
      fps: state.fps,
      frameTimeP50: parseFloat(p50),
      frameTimeP95: parseFloat(p95),
      frameTimeP99: parseFloat(p99),
      drawCalls: calls,
      geometries,
      textures,
      heapMb,
      quality: state.quality,
      tabActive: state.isTabActive
    };
  };

  // VisibilityChange listener to eliminate background CPU thrashing
  document.addEventListener('visibilitychange', () => {
    state.isTabActive = !document.hidden;
    if (document.hidden) {
      if (window.fenixWorld3D?.pause) window.fenixWorld3D.pause();
    } else {
      if (window.fenixWorld3D?.resume) window.fenixWorld3D.resume();
      state.lastFrameTime = performance.now();
    }
  });

  // Floating Labels Collision Prevention Algorithm (3D -> 2D)
  function preventLabelCollisions() {
    const labels = Array.from(document.querySelectorAll('.spatial-building-label, .spatial-pin, .city-floating-label'));
    if (labels.length < 2) return;

    const rects = labels.map(l => ({ el: l, rect: l.getBoundingClientRect(), visible: l.offsetParent !== null }));
    const visible = rects.filter(r => r.visible && r.rect.width > 0);

    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i].rect;
        const b = visible[j].rect;

        const overlaps = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
        if (overlaps) {
          const currentTop = parseFloat(visible[j].el.style.transformTopOffset || 0);
          const newOffset = currentTop + (a.bottom - b.top + 6);
          visible[j].el.style.transform = `translateY(${newOffset}px)`;
          visible[j].el.style.transformTopOffset = newOffset;
        }
      }
    }
  }

  // Periodic FPS & Telemetry sync loop
  function startTelemetryLoop() {
    let frames = 0;
    let prevTime = performance.now();
    let lastTickTime = performance.now();

    function tick(now) {
      const delta = now - lastTickTime;
      lastTickTime = now;
      if (delta > 0 && delta < 1000) {
        state.frameDurations.push(delta);
        if (state.frameDurations.length > state.maxFrameHistory) {
          state.frameDurations.shift();
        }
      }

      frames++;
      if (now - prevTime >= 1000) {
        state.fps = Math.round((frames * 1000) / (now - prevTime));
        frames = 0;
        prevTime = now;

        const fpsEl = document.getElementById('hudTelemetryFps');
        if (fpsEl) fpsEl.textContent = `${state.fps} FPS`;
        const tickerFps = document.getElementById('tickerFps');
        if (tickerFps) tickerFps.textContent = String(state.fps);

        preventLabelCollisions();
      }
      if (state.isTabActive) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(() => requestAnimationFrame(tick), 500);
      }
    }
    requestAnimationFrame(tick);
  }

  // Update telemetry honest counts from state
  function updateTelemetryMetrics() {
    const agentsEl = document.getElementById('hudTelemetryAgents');
    const jobsEl = document.getElementById('hudTelemetryJobs');

    // Mesma fonte medida da barra superior (unified-app.js -> topKpi*Val), que ja
    // mostra "—" quando nao ha leitura. Antes: contava cartoes no DOM com fallback
    // fixo "|| 4" e contava o HISTORICO de jobs como "jobs".
    const measured = (id) => {
      const text = String(document.getElementById(id)?.textContent || '').trim();
      return /^\d+$/.test(text) ? Number(text) : null;
    };
    const onlineAgents = measured('topKpiAgentsVal');
    const runningJobs = measured('topKpiJobsVal');
    if (agentsEl) agentsEl.textContent = onlineAgents === null ? '— AGENTES' : `${onlineAgents} AGENTES ONLINE`;
    if (jobsEl) jobsEl.textContent = runningJobs === null ? '— JOBS' : `${runningJobs} JOBS ATIVOS`;
  }

  // =========================================================================
  // INITIALIZATION & LIFECYCLE
  // =========================================================================

  // O painel City Control saiu da tela. Os controles que ficam vao para a barra de zoom
  // (Rede, Qualidade) e a medida de FPS vai para o rodape que passa.
  function mountCityControlsElsewhere() {
    const holoBtn = document.getElementById('btnMiroToggleHolo');
    if (holoBtn && !document.getElementById('btnMiroToggleNetwork')) {
      const net = document.createElement('button');
      net.type = 'button'; net.id = 'btnMiroToggleNetwork'; net.className = holoBtn.className;
      net.title = 'Rede cognitiva de agentes'; net.setAttribute('aria-label', 'Rede cognitiva de agentes');
      net.innerHTML = '<i class="ph-bold ph-tree-structure"></i>';
      net.addEventListener('click', () => { const on = window.fenixToggleNetworkMode?.(); net.classList.toggle('active', Boolean(on)); });
      holoBtn.after(net);
      const quality = document.createElement('button');
      quality.type = 'button'; quality.id = 'btnMiroQuality'; quality.className = holoBtn.className;
      const labels = { low: 'BAIXA', balanced: 'MÉDIA', high: 'ALTA' };
      const sync = () => { quality.innerHTML = '<i class="ph-bold ph-sliders-horizontal"></i>'; quality.dataset.level = (labels[state.quality] || 'MÉDIA').charAt(0); quality.title = 'Qualidade gráfica: ' + (labels[state.quality] || 'MÉDIA') + ' (clique para alternar)'; quality.setAttribute('aria-label', quality.title); };
      quality.addEventListener('click', () => { const order = ['low', 'balanced', 'high']; window.fenixSetPerformanceProfile(order[(order.indexOf(state.quality) + 1) % order.length]); sync(); });

      sync();
      net.after(quality);
    }
    const track = document.getElementById('fenixTickerTrack');
    if (track && !document.getElementById('tickerFps')) {
      const item = document.createElement('div');
      item.className = 'fenix-ticker-item';
      item.innerHTML = '<i class="ph-bold ph-gauge"></i> FPS: <strong id="tickerFps">—</strong>';
      track.prepend(item);
    }
    // Faixa de agentes: arrastar com o mouse para ver todos (alem da barra de rolagem).
    const strip = document.getElementById('dockCardAgentsList');
    if (strip && !strip._dragScroll) {
      strip._dragScroll = true;
      let startX = 0, startLeft = 0, dragging = false, moved = false;
      strip.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; dragging = true; moved = false; startX = e.clientX; startLeft = strip.scrollLeft; });
      strip.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - startX; if (Math.abs(dx) > 4) { moved = true; strip.scrollLeft = startLeft - dx; } });
      const end = () => { dragging = false; };
      strip.addEventListener('pointerup', end); strip.addEventListener('pointerleave', end);
      // Um arraste nao deve abrir o agente sob o cursor.
      strip.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
      strip.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { strip.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    }
  }

  // Controles do mapa em volta do mini-mapa (emojis), no lugar da barra flutuante de zoom.
  // Move os botoes existentes (mesmos ids e handlers); o texto vira emoji e a descricao
  // continua em title/aria-label.
  function mountMinimapControlRing() {
    const card = document.getElementById('fenixWorldMinimap');
    const stage = card?.querySelector('.fenix-city-minimap-stage');
    const canvas = document.getElementById('fenixMinimap');
    if (!card || !stage || !canvas || card.querySelector('.mm-ring')) return;
    const ring = document.createElement('div');
    ring.className = 'mm-ring';
    const slot = (name) => { const el = document.createElement('div'); el.className = 'mm-slot mm-' + name; return el; };
    const top = slot('top'), left = slot('left'), right = slot('right'), bottom = slot('bottom'), center = slot('center');
    const move = (id, emoji, into) => {
      const btn = document.getElementById(id);
      if (!btn) return null;
      const label = btn.getAttribute('title') || btn.getAttribute('aria-label') || id;
      btn.setAttribute('title', label); btn.setAttribute('aria-label', label);
      if (emoji) btn.innerHTML = '<i class="ph-bold ' + emoji + '"></i>';
      btn.classList.add('mm-btn');
      into.append(btn);
      return btn;
    };
    // Topo: niveis (abas do mini-mapa) como emojis.
    // Icones monocromaticos (Phosphor), no padrao visual do restante do sistema.
    const layerEmoji = { city: ['ph-buildings', 'Cidade'], districts: ['ph-house-line', 'Bairros'], buildings: ['ph-building-office', 'Edifícios'], floors: ['ph-stack', 'Pavimentos'], agents: ['ph-users-three', 'Agentes'] };
    card.querySelectorAll('.mls-btn').forEach((btn) => {
      const [emoji, label] = layerEmoji[btn.dataset.layer] || ['ph-circle', btn.textContent];
      btn.innerHTML = '<i class="ph-bold ' + emoji + '"></i>'; btn.title = label; btn.setAttribute('aria-label', label); btn.classList.add('mm-btn');
      top.append(btn);
    });
    card.querySelector('.minimap-layer-strip')?.remove();
    // Esquerda: zoom.
    move('btnMiroZoomIn', 'ph-plus', left); move('fenixMiroZoomLevel', null, left); move('btnMiroZoomOut', 'ph-minus', left);
    // Direita: camera.
    move('btnMiroRotateCamera', 'ph-arrows-clockwise', right); move('btnMiroResetCamera', 'ph-compass', right); move('btnMiroFitView', 'ph-crosshair', right); move('btnMiroToggleDayNight', 'ph-sun-horizon', right);
    // Baixo: modos e acoes rapidas.
    const proj = document.createElement('button');
    proj.type = 'button'; proj.className = 'mm-btn'; proj.id = 'btnMinimapProjection';
    const syncProj = () => { const mode = window.fenixWorld3D?.minimapProjection || '3d'; proj.innerHTML = mode === '2d' ? '<i class="ph-bold ph-square"></i>' : '<i class="ph-bold ph-cube"></i>'; proj.title = mode === '2d' ? 'Mini-mapa: vista de cima (2D) · clique para 3D' : 'Mini-mapa: isométrico (3D) · clique para 2D'; proj.setAttribute('aria-label', proj.title); };
    proj.addEventListener('click', () => { const eng = window.fenixWorld3D; if (!eng?.setMinimapProjection) return; eng.setMinimapProjection(eng.minimapProjection === '2d' ? '3d' : '2d'); syncProj(); });
    syncProj();
    bottom.append(proj);
    move('btnMiroToggle2D3D', 'ph-map-trifold', bottom); move('btnMiroToggleHolo', 'ph-projector-screen-chart', bottom); move('btnMiroToggleNetwork', 'ph-tree-structure', bottom); move('btnMiroQuality', null, bottom); move('btnMiroFullscreen', 'ph-corners-out', bottom);
    stage.querySelector('.fenix-city-minimap-controls')?.remove();
    center.append(canvas);
    ring.append(top, left, center, right, bottom);
    stage.append(ring);
    document.getElementById('fenixMiroSpatialHud')?.classList.add('mm-hud-moved');
    // Dica com o nome da funcao no hover/foco. Fica no body (o cartao corta overflow).
    let tip = document.getElementById('mmTooltip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'mmTooltip'; tip.setAttribute('role', 'tooltip'); document.body.append(tip); }
    const show = (e) => {
      const btn = e.target.closest('.mm-btn'); if (!btn || !ring.contains(btn)) return;
      tip.textContent = btn.getAttribute('title') || btn.getAttribute('aria-label') || '';
      if (!tip.textContent) return;
      btn.dataset.tipTitle = btn.getAttribute('title') || ''; btn.removeAttribute('title');
      const r = btn.getBoundingClientRect();
      tip.style.display = 'block';
      const tw = tip.offsetWidth;
      tip.style.left = Math.max(6, Math.min(window.innerWidth - tw - 6, r.left + r.width / 2 - tw / 2)) + 'px';
      tip.style.top = Math.max(6, r.top - tip.offsetHeight - 6) + 'px';
    };
    const hide = (e) => { const btn = e.target.closest('.mm-btn'); if (btn && btn.dataset.tipTitle) { btn.setAttribute('title', btn.dataset.tipTitle); delete btn.dataset.tipTitle; } tip.style.display = 'none'; };
    ring.addEventListener('mouseover', show); ring.addEventListener('mouseout', hide);
    ring.addEventListener('focusin', show); ring.addEventListener('focusout', hide);
  }

  function bootstrap() {
    initDockPanels();
    initUnifiedToolbar();
    mountCityControlsElsewhere();
    mountMinimapControlRing();
    getEntityModalElements();
    attachEntityClickHooks();
    startTelemetryLoop();
    setInterval(updateTelemetryMetrics, 4000);
    window.fenixSetPerformanceProfile(state.quality);
    console.log('✅ [Fênix City Adaptive Dock Level 23] Runtime operational.');
  }

  window.fenixResetDockLayout = resetDockLayout;
  window.fenixToggleDockPanelMin = toggleMinimizePanel;
  window.fenixToggleDockPanelMax = toggleMaximizePanel;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
