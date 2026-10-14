/**
 * FÊNIX CITY V4 — Semantic Zoom System
 * 15-level zoom: WORLD→CITY→DISTRICT→BUILDING→FLOOR→ROOM→STATION→AGENT
 *                →MISSION→APPLICATION→SCREEN→COMPONENT→FILE→CODE→EXECUTION
 * NavigationStack with breadcrumb rendering
 * Smooth camera transitions
 */
(function() {
  'use strict';

  // ── Zoom Levels ──
  // ── 15 Cinematic Semantic Zoom Levels (Rule #16 & #17) ──
  const ZOOM_LEVELS = [
    { id: 'world',             label: '🌍 World',             zoom: 0.3,  minZoom: 0.1,  maxZoom: 0.45 },
    { id: 'city',              label: '🏙️ City',              zoom: 0.5,  minZoom: 0.45, maxZoom: 0.75 },
    { id: 'district',          label: '🏘️ District',          zoom: 1.0,  minZoom: 0.75, maxZoom: 1.25 },
    { id: 'street',            label: '🛣️ Street',            zoom: 1.3,  minZoom: 1.25, maxZoom: 1.55 },
    { id: 'building',          label: '🏢 Building',          zoom: 1.7,  minZoom: 1.55, maxZoom: 1.95 },
    { id: 'building-entrance', label: '🏛️ Entrance',          zoom: 2.1,  minZoom: 1.95, maxZoom: 2.35 },
    { id: 'floor',             label: '📐 Floor',             zoom: 2.5,  minZoom: 2.35, maxZoom: 2.8 },
    { id: 'room',              label: '🚪 Room',              zoom: 3.0,  minZoom: 2.8,  maxZoom: 3.3 },
    { id: 'station',           label: '🖥️ Station',           zoom: 3.5,  minZoom: 3.3,  maxZoom: 3.8 },
    { id: 'agent',             label: '🤖 Agent',             zoom: 4.0,  minZoom: 3.8,  maxZoom: 4.5 },
    { id: 'mission',           label: '📋 Mission',           zoom: 5.0,  minZoom: 4.5,  maxZoom: 5.5 },
    { id: 'application',       label: '📱 Application',       zoom: 6.0,  minZoom: 5.5,  maxZoom: 6.5 },
    { id: 'screen',            label: '🖼️ Screen',            zoom: 7.0,  minZoom: 6.5,  maxZoom: 7.5 },
    { id: 'component',         label: '🧩 Component',         zoom: 8.0,  minZoom: 7.5,  maxZoom: 8.5 },
    { id: 'code',              label: '💻 Code',              zoom: 9.0,  minZoom: 8.5,  maxZoom: 11.0 }
  ];

  // ── Navigation Entry ──
  class NavEntry {
    constructor(levelId, label, context) {
      this.levelId = levelId;
      this.label = label;
      this.context = context || {};
      this.cameraX = 0;
      this.cameraY = 0;
      this.cameraZoom = 1;
    }
  }

  // ── NavigationStack ──
  class NavigationStack {
    constructor() {
      this.stack = [];
      this.breadcrumbEl = document.getElementById('cityBreadcrumb');
    }

    push(entry) {
      this.stack.push(entry);
      this.renderBreadcrumb();
    }

    pop() {
      if (this.stack.length <= 1) return null;
      const removed = this.stack.pop();
      this.renderBreadcrumb();
      return removed;
    }

    peek() {
      return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
    }

    navigateTo(index) {
      if (index < 0 || index >= this.stack.length) return null;
      // Remove everything after index
      this.stack = this.stack.slice(0, index + 1);
      this.renderBreadcrumb();
      return this.peek();
    }

    clear() {
      this.stack = [];
      this.renderBreadcrumb();
    }

    get depth() { return this.stack.length; }

    renderBreadcrumb() {
      if (!this.breadcrumbEl) return;

      if (this.stack.length <= 1) {
        this.breadcrumbEl.style.display = 'none';
        return;
      }

      this.breadcrumbEl.style.display = 'flex';
      let html = '';
      this.stack.forEach((entry, i) => {
        if (i > 0) html += '<span class="breadcrumb-sep">›</span>';
        if (i === this.stack.length - 1) {
          html += `<span class="breadcrumb-current">${entry.label}</span>`;
        } else {
          html += `<span class="breadcrumb-item" data-nav-index="${i}">${entry.label}</span>`;
        }
      });
      this.breadcrumbEl.innerHTML = html;

      // Bind click handlers
      this.breadcrumbEl.querySelectorAll('.breadcrumb-item').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.navIndex);
          const entry = this.navigateTo(idx);
          if (entry && this.onNavigate) {
            this.onNavigate(entry);
          }
        });
      });
    }
  }

  // ── ZoomStateMachine ──
  class ZoomStateMachine {
    constructor(cityRenderer) {
      this.city = cityRenderer;
      this.currentLevel = ZOOM_LEVELS[1]; // Start at 'city'
      this.navStack = new NavigationStack();
      this.floorSelectorEl = document.getElementById('cityFloorSelector');
      this.listeners = {};

      // Initialize with city level
      this.navStack.push(new NavEntry('city', '🏙️ FÊNIX City', {}));

      // Breadcrumb navigation callback
      this.navStack.onNavigate = (entry) => {
        this.goToEntry(entry);
      };

      // ESC key handler
      this._onKeyDown = (e) => {
        if (e.key === 'Escape') {
          this.goBack();
        }
      };
      document.addEventListener('keydown', this._onKeyDown);
    }

    // ── Get zoom level from numeric zoom ──
    getLevelFromZoom(zoom) {
      for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--) {
        if (zoom >= ZOOM_LEVELS[i].minZoom) return ZOOM_LEVELS[i];
      }
      return ZOOM_LEVELS[0];
    }

    // ── Enter a specific level ──
    enter(levelId, label, context, focusX, focusY) {
      const level = ZOOM_LEVELS.find(l => l.id === levelId);
      if (!level) return;

      // Save current camera position to current nav entry
      const current = this.navStack.peek();
      if (current && this.city) {
        current.cameraX = this.city.targetCamera?.x || 0;
        current.cameraY = this.city.targetCamera?.y || 0;
        current.cameraZoom = this.city.targetCamera?.zoom || 1;
      }

      // Create new entry
      const entry = new NavEntry(levelId, label || level.label, context);
      entry.cameraX = focusX || 0;
      entry.cameraY = focusY || 0;
      entry.cameraZoom = level.zoom;

      this.navStack.push(entry);
      this.currentLevel = level;

      // Animate camera
      if (this.city && this.city.animateCameraTo) {
        this.city.animateCameraTo(entry.cameraX, entry.cameraY, entry.cameraZoom, 600);
      } else if (this.city && this.city.targetCamera) {
        this.city.targetCamera.x = entry.cameraX;
        this.city.targetCamera.y = entry.cameraY;
        this.city.targetCamera.zoom = entry.cameraZoom;
      }

      // Show/hide floor selector
      this.updateFloorSelector(levelId, context);

      // Emit event
      this.emit('levelChange', { level: levelId, context, depth: this.navStack.depth });
      document.dispatchEvent(new CustomEvent('fenix:city:levelChange', {
        detail: { level: levelId, context, depth: this.navStack.depth }
      }));
    }

    // ── Go back one level ──
    goBack() {
      const removed = this.navStack.pop();
      if (!removed) return;

      const entry = this.navStack.peek();
      if (entry) {
        this.goToEntry(entry);
      }
    }

    // ── Navigate to a specific stack entry ──
    goToEntry(entry) {
      const level = ZOOM_LEVELS.find(l => l.id === entry.levelId);
      if (level) this.currentLevel = level;

      if (this.city && this.city.animateCameraTo) {
        this.city.animateCameraTo(entry.cameraX, entry.cameraY, entry.cameraZoom, 400);
      } else if (this.city && this.city.targetCamera) {
        this.city.targetCamera.x = entry.cameraX;
        this.city.targetCamera.y = entry.cameraY;
        this.city.targetCamera.zoom = entry.cameraZoom;
      }

      this.updateFloorSelector(entry.levelId, entry.context);
      this.emit('levelChange', { level: entry.levelId, context: entry.context, depth: this.navStack.depth });
    }

    // ── Floor Selector ──
    updateFloorSelector(levelId, context) {
      if (!this.floorSelectorEl) return;

      if (levelId === 'building' && context && context.floors) {
        const floors = context.floors;
        let html = '';
        floors.forEach((floor, i) => {
          const active = (context.activeFloor === i) ? ' active' : '';
          html += `<button class="floor-btn${active}" data-floor="${i}">
            <span class="floor-num">${i + 1}</span>
            ${floor.name || 'Floor ' + (i + 1)}
          </button>`;
        });
        this.floorSelectorEl.innerHTML = html;
        this.floorSelectorEl.style.display = 'flex';

        this.floorSelectorEl.querySelectorAll('.floor-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const floorIdx = parseInt(btn.dataset.floor);
            const floor = floors[floorIdx];
            if (floor) {
              this.enter('floor', `📐 ${floor.name}`, {
                ...context,
                activeFloor: floorIdx,
                floorData: floor
              }, floor.focusX || 0, floor.focusY || 0);
            }
          });
        });
      } else if (levelId !== 'floor' && levelId !== 'room') {
        this.floorSelectorEl.style.display = 'none';
      }
    }

    // ── Event system ──
    on(event, callback) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(callback);
    }

    emit(event, data) {
      (this.listeners[event] || []).forEach(cb => cb(data));
    }

    destroy() {
      document.removeEventListener('keydown', this._onKeyDown);
      this.navStack.clear();
    }
  }

  // Export
  window.FenixSemanticZoom = {
    ZOOM_LEVELS,
    NavEntry,
    NavigationStack,
    ZoomStateMachine
  };

})();
