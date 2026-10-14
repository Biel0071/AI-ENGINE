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
          <div>
            <h3>${meta.name || obj.id}</h3>
            <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">${obj.type} • ${meta.projectKey || meta.project || meta.district || 'system'}</span>
          </div>
          <button class="inspector-close" onclick="document.getElementById('cityInspector').classList.remove('open')">&times;</button>
        </div>
      `;

      if (obj.type === 'agent') {
        const rawState = (meta.status || meta.state || 'IDLE').toUpperCase();
        const validStates = ['IDLE', 'WORKING', 'THINKING', 'MOVING', 'WAITING', 'EXECUTING', 'COLLABORATING', 'RESEARCHING', 'TESTING', 'DEBUGGING', 'DEPLOYING', 'SUCCESS', 'ERROR', 'PAUSED', 'OFFLINE'];
        const state = validStates.includes(rawState) ? rawState : (rawState === 'BUSY' ? 'WORKING' : 'IDLE');

        html += `
          <div class="inspector-section">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">OPERATIONAL STATE</span>
              <span class="inspector-status-pill ${state.toLowerCase()}">● ${state}</span>
            </div>
            <div class="inspector-row"><span class="label">Specialty / Role</span><span class="value" style="color:#38bdf8; text-transform:uppercase;">${meta.role || 'developer'}</span></div>
            <div class="inspector-row"><span class="label">District Base</span><span class="value">${meta.district || 'Central'}</span></div>
          </div>
          <div class="inspector-section">
            <h4>Runtime & Model</h4>
            <div class="inspector-row"><span class="label">LLM Model</span><span class="value">${meta.model || 'Gemini 2.5 Flash'}</span></div>
            <div class="inspector-row"><span class="label">Gateway Provider</span><span class="value">${meta.provider || 'ai-gateway'}</span></div>
            <div class="inspector-row"><span class="label">Tokens Consumed</span><span class="value">${(meta.tokens || 0).toLocaleString()}</span></div>
          </div>
          <div class="inspector-section">
            <h4>Current Mission & Activity</h4>
            <div style="font-size:11.5px; color:#e2e8f0; background:rgba(15,23,42,0.6); padding:8px 10px; border-radius:6px; border:1px solid rgba(148,163,184,0.15);">
              📋 ${meta.task || 'Active in District runtime'}
            </div>
          </div>
          <div class="inspector-actions">
            <button onclick="window.fenixInteraction?.handleAction('viewTask','${obj.id}')"><i class="ph ph-check-square"></i> VER TAREFA</button>
            <button onclick="window.fenixInteraction?.handleAction('viewProject','${obj.id}')"><i class="ph ph-buildings"></i> VER PROJETO</button>
            <button onclick="window.fenixInteraction?.handleAction('follow','${obj.id}')"><i class="ph ph-crosshair"></i> SEGUIR</button>
            <button onclick="window.fenixInteraction?.handleAction('pause','${obj.id}')"><i class="ph ph-pause"></i> PAUSAR</button>
            <button onclick="window.fenixInteraction?.handleAction('chat','${obj.id}')"><i class="ph ph-chat-circle"></i> CHAT</button>
          </div>
        `;
      } else if (obj.type === 'building') {
        const health = meta.health || 96;
        const pKey = meta.projectKey || meta.project || obj.id;

        // Gather active agents in this building or district
        const cityAgents = this.city?.agents || new Map();
        const relatedAgents = [];
        for (const [aId, a] of cityAgents) {
          const aData = a.data || {};
          if (aData.project === pKey || aData.district === meta.district || aData.currentBuilding === obj.id || (!aData.project && relatedAgents.length < 3)) {
            relatedAgents.push({ id: aId, name: aData.name || a.character?.displayName || aId, role: aData.role || 'agent' });
          }
        }

        let agentsListHtml = '';
        if (relatedAgents.length > 0) {
          agentsListHtml = `<div class="inspector-agents-list">` + relatedAgents.map(ag => `
            <div class="inspector-agent-item" onclick="window.fenixCity?.focusAgent('${ag.id}')" title="Clique para focar câmera neste agente">
              <span class="agent-name">🤖 ${ag.name}</span>
              <span class="agent-role-tag">${ag.role}</span>
            </div>
          `).join('') + `</div>`;
        } else {
          agentsListHtml = `<div style="font-size:11px; color:#64748b; font-style:italic;">Nenhum agente destacado no momento</div>`;
        }

        html += `
          <div class="inspector-section">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">PROJECT HEALTH</span>
              <span class="inspector-status-pill success">${health}% HEALTHY</span>
            </div>
            <div class="inspector-row"><span class="label">Project ID</span><span class="value" style="font-family:monospace; color:#38bdf8;">${pKey}</span></div>
            <div class="inspector-row"><span class="label">Type</span><span class="value">${meta.type || 'Autonomous Tower'}</span></div>
            <div class="inspector-row"><span class="label">Workstations</span><span class="value">${meta.floors || 3} Floors Active</span></div>
            <div class="inspector-row"><span class="label">Tasks in Flight</span><span class="value">${meta.tasks || 1}</span></div>
          </div>
          <div class="inspector-section">
            <h4>Stationed Agents (${relatedAgents.length})</h4>
            ${agentsListHtml}
          </div>
          <div class="inspector-actions">
            <button onclick="window.fenixInteraction?.handleAction('openProject','${obj.id}')"><i class="ph ph-door-open"></i> ABRIR PROJETO</button>
            <button onclick="window.fenixInteraction?.handleAction('viewAgents','${obj.id}')"><i class="ph ph-users"></i> VER AGENTES</button>
            <button onclick="window.fenixInteraction?.handleAction('viewTasks','${obj.id}')"><i class="ph ph-list-checks"></i> VER TASKS</button>
            <button onclick="window.fenixInteraction?.handleAction('viewLogs','${obj.id}')"><i class="ph ph-activity"></i> ABRIR LOGS</button>
          </div>
        `;
      } else {
        html += `
          <div class="inspector-section">
            <h4>Details</h4>
            <div class="inspector-row"><span class="label">Type</span><span class="value">${obj.type}</span></div>
            <div class="inspector-row"><span class="label">ID</span><span class="value">${obj.id}</span></div>
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

      // Draw dependency lines to related entities
      if (this.city && typeof this.city.showDependencyLines === 'function') {
        const sprite = obj.sprite?.sprite || obj.sprite;
        if (sprite) {
          const targets = [];
          if (obj.type === 'agent') {
            const meta = obj.metadata || {};
            const pKey = meta.projectKey || meta.project;
            if (pKey && this.city.buildings) {
              const b = this.city.buildings.get(pKey) || this.city.buildings.get(`proc-${pKey}`);
              if (b) targets.push({ col: b.col, row: b.row });
            }
          } else if (obj.type === 'building') {
            if (this.city.agents) {
              for (const [, ag] of this.city.agents) {
                const agData = ag.data || {};
                if (agData.project === obj.metadata?.project || agData.district === obj.metadata?.district) {
                  targets.push({ x: ag.sprite.x, y: ag.sprite.y });
                }
              }
            }
          }
          if (targets.length > 0) {
            this.city.showDependencyLines(sprite.x, sprite.y, targets);
          } else {
            this.city.clearDependencyLines();
          }
        }
      }

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
        case 'openProject': {
          const pKey = obj.metadata?.projectKey || obj.metadata?.project || objId;
          if (typeof window.openProjectWorkspace === 'function') {
            window.openProjectWorkspace(pKey);
          } else if (obj.onEnter) {
            obj.onEnter(obj);
          }
          break;
        }
        case 'viewProject': {
          const pKey = obj.metadata?.projectKey || obj.metadata?.project;
          if (pKey && typeof window.openProjectWorkspace === 'function') {
            window.openProjectWorkspace(pKey);
          } else if (this.city && typeof this.city.focusProject === 'function') {
            this.city.focusProject(pKey || objId);
          }
          break;
        }
        case 'viewTask':
        case 'viewTasks':
        case 'viewMission':
          window.location.hash = '#operations';
          break;
        case 'viewAgents':
          window.location.hash = '#agents';
          break;
        case 'viewLogs':
          window.location.hash = '#observability';
          break;
        case 'inspect':
          this.showInspector(obj);
          break;
        case 'follow':
          if (this.city && this.city.focusAgent) {
            this.city.focusAgent(objId);
          } else if (this.city && this.city.followAgent) {
            this.city.followAgent(objId);
          }
          break;
        case 'pause': {
          const ag = this.city?.agents?.get(objId);
          if (ag?.character?.setState) {
            const curState = ag.character.state;
            ag.character.setState(curState === 'paused' ? 'working' : 'paused');
            if (obj.metadata) obj.metadata.status = curState === 'paused' ? 'WORKING' : 'PAUSED';
            this.showInspector(obj);
          }
          break;
        }
        case 'chat':
          window.location.hash = '#terminal';
          break;
        case 'openIDE':
          window.location.hash = '#ide';
          break;
        case 'openTerminal':
          window.location.hash = '#terminal';
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
