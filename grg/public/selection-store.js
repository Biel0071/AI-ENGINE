/**
 * FÊNIX OS — Global Tri-View Selection Store & Performance Manager
 * Canonical module: ai-engine/grg/public/selection-store.js
 * 
 * Synchronizes selection state bidirectionally across:
 * 1. City 3D (fenix-world-3d.js / iso-city.js)
 * 2. Office Workstations (office-live.js)
 * 3. Memory Neural Graph (memory-live.js)
 * 4. Central Assistant (fenix-mascot-sidebar.js)
 * 
 * Also provides Performance / LOD quality control for low-spec devices.
 */
(function() {
  'use strict';

  class FenixGlobalSelectionStore {
    constructor() {
      this.selected = {
        type: null, // 'agent' | 'project' | 'building' | 'mission'
        id: null,
        data: null,
        sourceView: null,
        timestamp: null
      };
      this.subscribers = new Set();
      this.isSyncing = false;
    }

    get() {
      return { ...this.selected };
    }

    select(type, id, data = {}, sourceView = 'unknown') {
      if (!type || !id) return;
      if (this.isSyncing) return;

      const normType = String(type).toLowerCase().trim();
      const normId = String(id).trim();

      // Avoid redundant triggers
      if (this.selected.type === normType && this.selected.id === normId && this.selected.sourceView === sourceView) {
        return;
      }

      this.selected = {
        type: normType,
        id: normId,
        data: data || {},
        sourceView,
        timestamp: new Date().toISOString()
      };

      try {
        sessionStorage.setItem('fenix_global_selection', JSON.stringify({
          type: normType,
          id: normId,
          sourceView
        }));
      } catch (_) {}

      // Notify internal subscribers
      for (const callback of this.subscribers) {
        try { callback(this.selected); } catch (e) { console.warn('[GlobalSelectionStore] Subscriber error:', e); }
      }

      // Dispatch global window event
      try {
        window.dispatchEvent(new CustomEvent('fenix:selection_changed', { detail: this.selected }));
      } catch (_) {}

      // Bidirectional sync to other views
      this.isSyncing = true;
      try {
        this.#syncToViews(this.selected);
      } finally {
        this.isSyncing = false;
      }
    }

    subscribe(callback) {
      if (typeof callback === 'function') {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
      }
      return () => {};
    }

    #syncToViews(sel) {
      const { type, id, data, sourceView } = sel;

      if (type === 'agent') {
        // 1. Sync City 3D
        if (sourceView !== 'city') {
          if (window.fenixCity && typeof window.fenixCity.selectAgent === 'function') {
            window.fenixCity.selectAgent(id);
          } else if (window.fenixWorld3D && typeof window.fenixWorld3D.focusAgent === 'function') {
            window.fenixWorld3D.focusAgent(id);
          }
        }

        // 2. Sync Office Workstation
        if (sourceView !== 'office') {
          if (typeof window.fenixOfficeSelectAgent === 'function') {
            window.fenixOfficeSelectAgent(id);
          }
        }

        // 3. Sync Memory Neural Graph
        if (sourceView !== 'memory') {
          if (typeof window.fenixSelectMemoryNode === 'function') {
            window.fenixSelectMemoryNode(`agent:${id}`);
          }
        }

        // 4. Update Central Assistant Context
        if (typeof window.fenixSetAssistantContext === 'function') {
          window.fenixSetAssistantContext({ type: 'agent', id, data });
        }
      } else if (type === 'building' || type === 'project') {
        if (sourceView !== 'city') {
          if (window.fenixCity && typeof window.fenixCity.focusBuilding === 'function') {
            window.fenixCity.focusBuilding(id);
          } else if (window.fenixWorld3D && typeof window.fenixWorld3D.focusBuilding === 'function') {
            window.fenixWorld3D.focusBuilding(id);
          }
        }
        if (sourceView !== 'memory') {
          if (typeof window.fenixSelectMemoryNode === 'function') {
            window.fenixSelectMemoryNode(`project:${id}`);
          }
        }
        if (typeof window.fenixSetAssistantContext === 'function') {
          window.fenixSetAssistantContext({ type: 'project', id, data });
        }
      } else if (type === 'mission') {
        if (sourceView !== 'memory') {
          if (typeof window.fenixSelectMemoryNode === 'function') {
            window.fenixSelectMemoryNode(`mission:${id}`);
          }
        }
        if (typeof window.fenixSetAssistantContext === 'function') {
          window.fenixSetAssistantContext({ type: 'mission', id, data });
        }
      }
    }
  }

  // ── Performance & LOD Controller ──
  class FenixPerformanceController {
    constructor() {
      this.mode = localStorage.getItem('fenix_perf_mode') || 'high'; // 'high' | 'balanced' | 'performance'
      this.applyMode(this.mode);
    }

    setMode(mode) {
      if (!['high', 'balanced', 'performance'].includes(mode)) return;
      this.mode = mode;
      localStorage.setItem('fenix_perf_mode', mode);
      this.applyMode(mode);
      window.dispatchEvent(new CustomEvent('fenix:perf_mode_changed', { detail: { mode } }));
    }

    applyMode(mode) {
      const isLow = mode === 'performance';
      const isBalanced = mode === 'balanced';

      // Three.js 3D adjustments
      const world = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (world && world.renderer) {
        world.renderer.shadowMap.enabled = !isLow;
        world.renderer.setPixelRatio(isLow ? 1.0 : (isBalanced ? 1.25 : Math.min(window.devicePixelRatio || 1, 2.0)));
      }

      // DOM hints for CSS transitions
      if (document.body) {
        document.body.classList.toggle('fenix-perf-mode-low', isLow);
        document.body.classList.toggle('fenix-perf-mode-balanced', isBalanced);
      }
    }
  }

  // Singletons
  window.GlobalSelectionStore = new FenixGlobalSelectionStore();
  window.PerformanceController = new FenixPerformanceController();
  window.fenixSetPerformanceMode = (mode) => window.PerformanceController.setMode(mode);

  // Hook into Assistant Context
  window.fenixSetAssistantContext = function(ctx) {
    if (!ctx) return;
    const mascotState = window.__FENIX_COPILOT_INSTANCE__ || window.fenixMascot;
    if (mascotState && ctx.type === 'agent') {
      const ag = ctx.data || { id: ctx.id, name: ctx.id };
      if (typeof window.AgentRosterRPG?.openModal === 'function') {
        // Can inspect agent in dossier
      }
    }
  };

  console.log('[Fênix Sync] GlobalSelectionStore & PerformanceController initialized.');
})();
