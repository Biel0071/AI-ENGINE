/**
 * FÊNIX CITY V4 — Interaction Engine
 * WorldObject system + click/hover/dblclick/contextmenu/longpress
 * HTML overlays for tooltips, context menus, inspector panels
 */
(function() {
  'use strict';

  // ── WorldObject Types ──
  const OBJECT_TYPES = {
    BUILDING: 'building',
    DOOR: 'door',
    FLOOR: 'floor',
    ROOM: 'room',
    STATION: 'station',
    DESK: 'desk',
    COMPUTER: 'computer',
    SERVER: 'server',
    AGENT: 'agent',
    MISSION: 'mission',
    TREE: 'tree',
    LAMP: 'lamp',
    BENCH: 'bench',
    BOARD: 'board',
    VEHICLE: 'vehicle'
  };

  // ── Context Menu Definitions per type ──
  const CONTEXT_MENUS = {
    agent: [
      { icon: 'ph-magnifying-glass', label: 'Inspect', action: 'inspect' },
      { icon: 'ph-crosshair', label: 'Follow', action: 'follow' },
      { icon: 'ph-chat-circle', label: 'Chat', action: 'chat' },
      { icon: 'ph-clipboard-text', label: 'View Mission', action: 'viewMission' },
      { icon: 'ph-brain', label: 'View Memory', action: 'viewMemory' },
      { icon: 'ph-lightning', label: 'View Skills', action: 'viewSkills' },
      { icon: 'ph-list-bullets', label: 'View Logs', action: 'viewLogs' },
      { sep: true },
      { icon: 'ph-pause', label: 'Pause', action: 'pause' },
      { icon: 'ph-play', label: 'Resume', action: 'resume' }
    ],
    building: [
      { icon: 'ph-door-open', label: 'Enter Building', action: 'enter' },
      { icon: 'ph-buildings', label: 'Project Overview', action: 'overview' },
      { icon: 'ph-users', label: 'View Agents', action: 'viewAgents' },
      { icon: 'ph-heartbeat', label: 'Health', action: 'health' },
      { icon: 'ph-list-bullets', label: 'Logs', action: 'viewLogs' }
    ],
    station: [
      { icon: 'ph-desktop', label: 'Open Station', action: 'open' },
      { icon: 'ph-user', label: 'View Agent', action: 'viewAgent' },
      { icon: 'ph-clipboard-text', label: 'View Mission', action: 'viewMission' },
      { icon: 'ph-app-window', label: 'Open Application', action: 'openApp' },
      { icon: 'ph-code', label: 'Open IDE', action: 'openIDE' }
    ],
    mission: [
      { icon: 'ph-eye', label: 'Open Mission', action: 'open' },
      { icon: 'ph-crosshair', label: 'Follow Agent', action: 'followAgent' },
      { icon: 'ph-pause', label: 'Pause', action: 'pause' },
      { icon: 'ph-play', label: 'Resume', action: 'resume' },
      { icon: 'ph-list-bullets', label: 'Logs', action: 'viewLogs' }
    ],
    computer: [
      { icon: 'ph-code', label: 'Open IDE', action: 'openIDE' },
      { icon: 'ph-terminal', label: 'Open Terminal', action: 'openTerminal' },
      { icon: 'ph-app-window', label: 'Open Application', action: 'openApp' }
    ],
    server: [
      { icon: 'ph-hard-drives', label: 'Infrastructure', action: 'infra' },
      { icon: 'ph-chart-line', label: 'Telemetry', action: 'telemetry' },
      { icon: 'ph-list-bullets', label: 'Logs', action: 'viewLogs' }
    ]
  };

  // ── InteractionLayer ──
  class InteractionLayer {
    constructor(cityRenderer) {
      this.city = cityRenderer;
      this.objects = new Map();
      this.selectedObject = null;
      this.hoveredObject = null;
      this.longPressTimer = null;

      // DOM references
      this.tooltipEl = document.getElementById('cityTooltip');
      this.contextMenuEl = document.getElementById('cityContextMenu');
      this.inspectorEl = document.getElementById('cityInspector');

      // Event handlers
      this._onClickOutside = (e) => {
        if (this.contextMenuEl && !this.contextMenuEl.contains(e.target)) {
          this.hideContextMenu();
        }
      };
      document.addEventListener('click', this._onClickOutside);
    }

    // ── Register interactive object ──
    registerObject(obj) {
      // obj: { id, type, sprite, metadata, onEnter, onInspect }
      this.objects.set(obj.id, obj);

      let sprite = obj.sprite;
      if (sprite && sprite.sprite) sprite = sprite.sprite;
      obj.sprite = sprite;

      if (sprite && typeof sprite.on === 'function') {
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';

        sprite.on('pointerover', (e) => this.onHover(obj, e));
        sprite.on('pointerout', () => this.onHoverEnd(obj));
        sprite.on('pointertap', (e) => this.onClick(obj, e));
        sprite.on('rightclick', (e) => this.onContextMenu(obj, e));
      }
    }

    unregisterObject(id) {
      const obj = this.objects.get(id);
      if (obj && obj.sprite) {
        obj.sprite.removeAllListeners();
      }
      this.objects.delete(id);
    }

    // ── Tooltip ──
    showTooltip(obj, screenX, screenY) {
      if (!this.tooltipEl) return;
      const meta = obj.metadata || {};
      const statusClass = (meta.status || 'healthy').toLowerCase();

      this.tooltipEl.innerHTML = `
        <div class="tooltip-title">
          <span class="tooltip-status ${statusClass}"></span>
          ${meta.name || obj.id}
        </div>
        <div class="tooltip-sub">${meta.type || obj.type}${meta.role ? ' • ' + meta.role : ''}</div>
        ${meta.task ? `<div class="tooltip-sub" style="margin-top:4px">📋 ${meta.task}</div>` : ''}
      `;

      this.tooltipEl.style.display = 'block';
      this.tooltipEl.style.left = (screenX + 12) + 'px';
      this.tooltipEl.style.top = (screenY - 8) + 'px';

      // Keep tooltip in viewport
      const rect = this.tooltipEl.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.tooltipEl.style.left = (screenX - rect.width - 12) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        this.tooltipEl.style.top = (screenY - rect.height - 8) + 'px';
      }
    }

    hideTooltip() {
      if (this.tooltipEl) this.tooltipEl.style.display = 'none';
    }

    // ── Context Menu ──
    showContextMenu(obj, screenX, screenY) {
      if (!this.contextMenuEl) return;
      const menuItems = CONTEXT_MENUS[obj.type] || [];
      if (menuItems.length === 0) return;

      let html = `<div class="ctx-menu-label">${(obj.metadata?.name || obj.type).toUpperCase()}</div>`;
      for (const item of menuItems) {
        if (item.sep) {
          html += '<div class="ctx-menu-sep"></div>';
        } else {
          html += `<div class="ctx-menu-item" data-action="${item.action}" data-obj-id="${obj.id}">
            <i class="ph ${item.icon}"></i>${item.label}
          </div>`;
        }
      }

      this.contextMenuEl.innerHTML = html;
      this.contextMenuEl.style.display = 'block';
      this.contextMenuEl.style.left = screenX + 'px';
      this.contextMenuEl.style.top = screenY + 'px';

      // Keep in viewport
      const rect = this.contextMenuEl.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.contextMenuEl.style.left = (screenX - rect.width) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        this.contextMenuEl.style.top = (screenY - rect.height) + 'px';
      }

      // Bind actions
      this.contextMenuEl.querySelectorAll('.ctx-menu-item').forEach(el => {
        el.addEventListener('click', (e) => {
          const action = el.dataset.action;
          const objId = el.dataset.objId;
          this.handleAction(action, objId);
          this.hideContextMenu();
        });
      });
    }

    hideContextMenu() {
      if (this.contextMenuEl) {
        this.contextMenuEl.style.display = 'none';
        this.contextMenuEl.innerHTML = '';
      }
    }

    // ── Inspector Panel ──
    showInspector(obj) {
      if (!this.inspectorEl) return;
      const meta = obj.metadata || {};

      let html = `
        <div class="inspector-header">
          <h3>${meta.name || obj.id}</h3>
          <button class="inspector-close" onclick="document.getElementById('cityInspector').classList.remove('open')">&times;</button>
        </div>
        <div class="inspector-section">
          <h4>Identity</h4>
          <div class="inspector-row"><span class="label">Type</span><span class="value">${obj.type}</span></div>
          <div class="inspector-row"><span class="label">ID</span><span class="value">${obj.id}</span></div>
          ${meta.role ? `<div class="inspector-row"><span class="label">Role</span><span class="value">${meta.role}</span></div>` : ''}
          ${meta.status ? `<div class="inspector-row"><span class="label">Status</span><span class="value">${meta.status}</span></div>` : ''}
        </div>
      `;

      if (obj.type === 'agent' && meta) {
        html += `
          <div class="inspector-section">
            <h4>Agent Details</h4>
            ${meta.model ? `<div class="inspector-row"><span class="label">Model</span><span class="value">${meta.model}</span></div>` : ''}
            ${meta.provider ? `<div class="inspector-row"><span class="label">Provider</span><span class="value">${meta.provider}</span></div>` : ''}
            ${meta.task ? `<div class="inspector-row"><span class="label">Current Task</span><span class="value">${meta.task}</span></div>` : ''}
            ${meta.tokens !== undefined ? `<div class="inspector-row"><span class="label">Tokens</span><span class="value">${meta.tokens}</span></div>` : ''}
          </div>
          <div class="inspector-actions">
            <button onclick="window.fenixInteraction?.handleAction('inspect','${obj.id}')"><i class="ph ph-magnifying-glass"></i> Inspect</button>
            <button onclick="window.fenixInteraction?.handleAction('follow','${obj.id}')"><i class="ph ph-crosshair"></i> Follow</button>
            <button onclick="window.fenixInteraction?.handleAction('viewMission','${obj.id}')"><i class="ph ph-clipboard-text"></i> Mission</button>
            <button onclick="window.fenixInteraction?.handleAction('viewLogs','${obj.id}')"><i class="ph ph-list-bullets"></i> Logs</button>
          </div>
        `;
      }

      if (obj.type === 'building' && meta) {
        html += `
          <div class="inspector-section">
            <h4>Building</h4>
            ${meta.project ? `<div class="inspector-row"><span class="label">Project</span><span class="value">${meta.project}</span></div>` : ''}
            ${meta.floors ? `<div class="inspector-row"><span class="label">Floors</span><span class="value">${meta.floors}</span></div>` : ''}
            ${meta.agents ? `<div class="inspector-row"><span class="label">Agents</span><span class="value">${meta.agents}</span></div>` : ''}
          </div>
          <div class="inspector-actions">
            <button onclick="window.fenixInteraction?.handleAction('enter','${obj.id}')"><i class="ph ph-door-open"></i> Enter</button>
            <button onclick="window.fenixInteraction?.handleAction('overview','${obj.id}')"><i class="ph ph-buildings"></i> Overview</button>
          </div>
        `;
      }

      this.inspectorEl.innerHTML = html;
      this.inspectorEl.style.display = 'block';
      this.inspectorEl.classList.add('open');
    }

    hideInspector() {
      if (this.inspectorEl) {
        this.inspectorEl.classList.remove('open');
      }
    }

    // ── Event Handlers ──
    onHover(obj, e) {
      this.hoveredObject = obj;
      const global = e.global || e.data?.global || { x: 0, y: 0 };
      this.showTooltip(obj, global.x, global.y);
    }

    onHoverEnd(obj) {
      this.hoveredObject = null;
      this.hideTooltip();
    }

    onClick(obj, e) {
      this.selectedObject = obj;
      this.hideContextMenu();

      // Single click = select + show inspector
      this.showInspector(obj);

      // Dispatch custom event
      const detail = { objectId: obj.id, type: obj.type, metadata: obj.metadata };
      document.dispatchEvent(new CustomEvent('fenix:city:select', { detail }));
    }

    onDoubleClick(obj, e) {
      // Enter the object
      if (obj.onEnter) {
        obj.onEnter(obj);
      }
      const detail = { objectId: obj.id, type: obj.type, metadata: obj.metadata };
      document.dispatchEvent(new CustomEvent('fenix:city:enter', { detail }));
    }

    onContextMenu(obj, e) {
      e.preventDefault?.();
      const global = e.global || e.data?.global || { x: 0, y: 0 };
      this.showContextMenu(obj, global.x, global.y);
    }

    // ── Action Dispatcher ──
    handleAction(action, objId) {
      const obj = this.objects.get(objId);
      if (!obj) return;

      const detail = { action, objectId: objId, type: obj.type, metadata: obj.metadata };
      document.dispatchEvent(new CustomEvent('fenix:city:action', { detail }));

      // Built-in actions
      switch (action) {
        case 'enter':
          if (obj.onEnter) obj.onEnter(obj);
          break;
        case 'inspect':
          this.showInspector(obj);
          break;
        case 'follow':
          if (this.city && this.city.followAgent) {
            this.city.followAgent(objId);
          }
          break;
        case 'openIDE':
          // Navigate to IDE view
          if (window.location.hash !== '#ide') {
            window.location.hash = '#ide';
          }
          break;
        case 'openTerminal':
          if (window.location.hash !== '#terminal') {
            window.location.hash = '#terminal';
          }
          break;
        default:
          console.log(`[InteractionEngine] Action: ${action} on ${objId}`);
      }
    }

    destroy() {
      document.removeEventListener('click', this._onClickOutside);
      this.hideTooltip();
      this.hideContextMenu();
      this.hideInspector();
      this.objects.clear();
    }
  }

  // Export
  window.FenixInteractionEngine = {
    OBJECT_TYPES,
    CONTEXT_MENUS,
    InteractionLayer
  };

})();
