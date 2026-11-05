/**
 * ============================================================================
 * FÊNIX OS — UNIVERSAL HYBRID WORKSPACE & LAYOUT MANAGER
 * ============================================================================
 * Single Source of Truth for docking, resizing, panel states and layout presets
 * Supports: Development, 3D Modeling, CAD Engineering, Monitoring, City, Compact, Custom
 * Full-Stack Real Capability · Zero-Mock · Persistent Preferences
 */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'fenix_workspace_layout_prefs_v1';

  const DEFAULT_PRESETS = {
    'development': {
      name: 'Desenvolvimento',
      leftPanelWidth: 260,
      leftPanelVisible: true,
      editorRatio: 50,
      previewRatio: 50,
      ideMode: 'split',
      studioModality: 'web',
      dockHeight: 36,
      dockCollapsed: true,
      studioMaximized: false,
      studioInspectorVisible: true
    },
    '3d-modeling': {
      name: '3D Modeling',
      leftPanelWidth: 0,
      leftPanelVisible: false,
      editorRatio: 0,
      previewRatio: 100,
      ideMode: 'preview',
      studioModality: 'studio3d',
      studioSubMode: 'voxel',
      dockHeight: 36,
      dockCollapsed: true,
      studioMaximized: true,
      studioInspectorVisible: true
    },
    'cad-engineering': {
      name: 'CAD Engineering',
      leftPanelWidth: 0,
      leftPanelVisible: false,
      editorRatio: 0,
      previewRatio: 100,
      ideMode: 'preview',
      studioModality: 'studio3d',
      studioSubMode: 'cad',
      dockHeight: 36,
      dockCollapsed: true,
      studioMaximized: true,
      studioInspectorVisible: true
    },
    'monitoring': {
      name: 'Monitoramento',
      targetView: 'view-observability',
      leftPanelWidth: 260,
      leftPanelVisible: true,
      dockHeight: 220,
      dockCollapsed: false
    },
    'city': {
      name: 'Cidade 3D',
      targetView: 'view-city'
    },
    'compact': {
      name: 'Compacto',
      leftPanelWidth: 0,
      leftPanelVisible: false,
      editorRatio: 100,
      previewRatio: 0,
      ideMode: 'code',
      dockHeight: 36,
      dockCollapsed: true,
      studioMaximized: false,
      studioInspectorVisible: false
    },
    'custom': {
      name: 'Personalizado',
      leftPanelWidth: 260,
      leftPanelVisible: true,
      editorRatio: 50,
      previewRatio: 50,
      ideMode: 'split',
      studioModality: 'web',
      dockHeight: 200,
      dockCollapsed: false,
      studioMaximized: false,
      studioInspectorVisible: true
    }
  };

  class WorkspaceLayoutManager {
    constructor() {
      this.activePreset = 'development';
      this.state = this.loadPreferences();
      this.isDragging = false;
      this.dragType = null;
      this.dragStart = { x: 0, y: 0 };
      this.initialDimensions = {};
      this.resizeObservers = [];
      this.initialized = false;
    }

    loadPreferences() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...DEFAULT_PRESETS.development, ...parsed };
        }
      } catch (err) {
        console.warn('[LayoutManager] Failed to read saved layout:', err);
      }
      return { ...DEFAULT_PRESETS.development };
    }

    saveLayout() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.notify('Layout do workspace salvo com sucesso.');
      } catch (err) {
        console.warn('[LayoutManager] Failed to save layout:', err);
      }
    }

    saveCurrentToStorage() {
      return this.saveLayout();
    }

    restoreDefaults() {
      this.state = { ...DEFAULT_PRESETS.development };
      localStorage.removeItem(STORAGE_KEY);
      this.activePreset = 'development';
      this.applyCurrentState();
      this.updateDropdown();
      this.notify('Layout padrão restaurado.');
    }

    init() {
      if (this.initialized) return;
      this.bindDividers();
      this.bindShortcuts();
      this.applyCurrentState();
      this.setupStudioResizeObserver();
      window.addEventListener('resize', () => {
        if (window.innerWidth <= 1024 && this.state.studioModality === 'studio3d') {
          const inspector = document.querySelector('.studio-right-inspector');
          if (inspector) inspector.style.display = 'none';
          this.state.studioInspectorVisible = false;
        }
      });
      this.initialized = true;
      console.log('[LayoutManager] Universal Hybrid Workspace initialized in mode:', this.activePreset);
    }

    applyLayout(presetName) {
      if (presetName === 'city') {
        if (typeof window.switchView === 'function') {
          window.switchView('view-city');
        } else if (typeof window.showView === 'function') {
          window.showView('city');
        }
        this.activePreset = 'city';
        this.updateDropdown();
        return;
      }

      if (presetName === 'monitoring') {
        if (typeof window.switchView === 'function') {
          window.switchView('view-observability');
        } else if (typeof window.showView === 'function') {
          window.showView('observability');
        }
        this.activePreset = 'monitoring';
        this.updateDropdown();
        return;
      }

      if (presetName === 'custom') {
        this.activePreset = 'custom';
        this.applyCurrentState();
        this.updateDropdown();
        return;
      }

      const preset = { ...(DEFAULT_PRESETS[presetName] || DEFAULT_PRESETS.development) };
      this.activePreset = presetName;

      // Responsive adjustments: on tablet/mobile, collapse inspector in 3D studio
      if (presetName === '3d-modeling' || presetName === 'cad-engineering') {
        if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
          preset.studioInspectorVisible = false;
        }
      }

      // Switch to IDE view if not already there
      const ideView = document.getElementById('view-ide');
      if (ideView && ideView.style.display === 'none') {
        if (typeof window.switchView === 'function') {
          window.switchView('view-ide');
        } else if (typeof window.showView === 'function') {
          window.showView('ide');
        }
      }

      this.state = { ...this.state, ...preset };
      this.applyCurrentState();
      this.updateDropdown();

      // If preset has studio submode, activate it
      if (preset.studioSubMode && window.FenixUniversal3DStudio?.setSubMode) {
        setTimeout(() => window.FenixUniversal3DStudio.setSubMode(preset.studioSubMode), 50);
      }
    }

    applyPreset(presetName) {
      return this.applyLayout(presetName);
    }

    applyCurrentState() {
      const leftPanel = document.getElementById('fenixIdeLeftPanel');
      const leftDivider = document.getElementById('fenixIdeLeftDivider');
      const centerSplit = document.getElementById('fenixIdeCenterSplit');
      const editorArea = document.getElementById('fenixIdeEditorArea');
      const splitDivider = document.getElementById('fenixIdeSplitDivider');
      const previewPane = document.getElementById('fenixIdePreviewPane');
      const dockTray = document.getElementById('fenixIdeDockTray');
      const dockViewport = document.getElementById('fenixIdeDockViewport');
      const dockInput = document.getElementById('fenixIdeTermInputBar');
      const studio3DView = document.getElementById('fenixStudio3DView');
      const studioInspector = document.querySelector('.studio-right-inspector');

      // 1. Left Panel (Explorer)
      if (leftPanel) {
        if (this.state.leftPanelVisible && this.state.leftPanelWidth > 0) {
          leftPanel.style.display = 'flex';
          const w = `${Math.max(160, Math.min(this.state.leftPanelWidth, 480))}px`;
          leftPanel.style.width = w;
          leftPanel.style.flex = `0 0 ${w}`;
          if (leftDivider) leftDivider.style.display = 'block';
        } else {
          leftPanel.style.display = 'none';
          if (leftDivider) leftDivider.style.display = 'none';
        }
      }

      // 2. Center Split (Editor vs Preview / Studio)
      const isStudio3D = this.state.studioModality === 'studio3d' || this.state.studioMaximized;
      if (isStudio3D) {
        // Broad canvas for 3D Studio: Editor collapses, Studio takes 100% of Center Split
        if (editorArea) editorArea.style.display = 'none';
        if (splitDivider) splitDivider.style.display = 'none';
        if (previewPane) {
          previewPane.style.display = 'flex';
          previewPane.style.flex = '1';
          previewPane.style.width = '100%';
        }
        const s3d = document.getElementById('fenixStudio3DView');
        if (s3d) s3d.style.display = 'flex';
        const sWeb = document.getElementById('fenixStudioWebView');
        if (sWeb) sWeb.style.display = 'none';
        const btn3d = document.getElementById('btnStudio3D');
        if (btn3d) btn3d.classList.add('active');
        const btnWeb = document.getElementById('btnStudioWeb');
        if (btnWeb) btnWeb.classList.remove('active');
      } else {
        // Standard IDE Modes (code, preview, split)
        const mode = this.state.ideMode || 'split';
        if (mode === 'code') {
          if (editorArea) { editorArea.style.display = 'flex'; editorArea.style.flex = '1'; }
          if (previewPane) previewPane.style.display = 'none';
          if (splitDivider) splitDivider.style.display = 'none';
        } else if (mode === 'preview') {
          if (editorArea) editorArea.style.display = 'none';
          if (previewPane) { previewPane.style.display = 'flex'; previewPane.style.flex = '1'; }
          if (splitDivider) splitDivider.style.display = 'none';
        } else {
          // Split Mode
          if (editorArea) {
            editorArea.style.display = 'flex';
            editorArea.style.flex = `0 0 ${this.state.editorRatio || 50}%`;
          }
          if (previewPane) {
            previewPane.style.display = 'flex';
            previewPane.style.flex = `0 0 ${this.state.previewRatio || 50}%`;
          }
          if (splitDivider) splitDivider.style.display = 'block';
        }
      }

      // 3. Studio Inspector (Collapse / Expand inside Studio 3D)
      if (studioInspector) {
        studioInspector.style.display = this.state.studioInspectorVisible !== false ? 'flex' : 'none';
      }

      // 4. Bottom Dock Tray (Terminal / Output)
      if (dockTray) {
        const icon = document.getElementById('iconToggleDockTray');
        if (this.state.dockCollapsed) {
          dockTray.classList.add('collapsed');
          dockTray.style.height = '36px';
          if (dockViewport) dockViewport.style.display = 'none';
          if (dockInput) dockInput.style.display = 'none';
          if (icon) icon.className = 'ph-bold ph-caret-up';
        } else {
          dockTray.classList.remove('collapsed');
          dockTray.style.height = `${Math.max(120, Math.min(this.state.dockHeight || 200, 500))}px`;
          if (dockViewport) dockViewport.style.display = 'block';
          if (dockInput) dockInput.style.display = 'flex';
          if (icon) icon.className = 'ph-bold ph-caret-down';
        }
      }

      // 5. Update top button states
      this.updateTopControls();

      // 6. Notify Three.js to recompute viewport dimensions
      setTimeout(() => {
        window.FenixUniversal3DStudio?.onResize?.();
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }

    setLeftPanelWidth(width) {
      this.state.leftPanelWidth = width;
      this.state.leftPanelVisible = width > 0;
      if (width > 0) {
        this.state.studioMaximized = false;
      }
      this.applyCurrentState();
    }

    setDockHeight(height) {
      this.state.dockHeight = height;
      this.state.dockCollapsed = height <= 36;
      this.applyCurrentState();
    }

    toggleLeftPanel() {
      this.state.leftPanelVisible = !this.state.leftPanelVisible;
      if (this.state.leftPanelVisible && (!this.state.leftPanelWidth || this.state.leftPanelWidth < 160)) {
        this.state.leftPanelWidth = 260;
      }
      this.applyCurrentState();
    }

    toggleStudioMaximize() {
      this.state.studioMaximized = !this.state.studioMaximized;
      if (this.state.studioMaximized) {
        this.state.leftPanelVisible = false;
        this.state.dockCollapsed = true;
        this.state.studioModality = 'studio3d';
      } else {
        this.state.leftPanelVisible = true;
      }
      this.applyCurrentState();
    }

    toggleStudioInspector() {
      this.state.studioInspectorVisible = !this.state.studioInspectorVisible;
      this.applyCurrentState();
    }

    toggleDock() {
      this.state.dockCollapsed = !this.state.dockCollapsed;
      if (!this.state.dockCollapsed && (!this.state.dockHeight || this.state.dockHeight < 120)) {
        this.state.dockHeight = 200;
      }
      this.applyCurrentState();
    }

    bindDividers() {
      // 1. Left Panel Divider
      const leftDivider = document.getElementById('fenixIdeLeftDivider');
      if (leftDivider) {
        this.setupDragHandler(leftDivider, 'left-panel', (dx) => {
          const newW = Math.max(160, Math.min(this.initialDimensions.width + dx, 500));
          this.state.leftPanelWidth = newW;
          this.state.leftPanelVisible = true;
          const leftPanel = document.getElementById('fenixIdeLeftPanel');
          if (leftPanel) leftPanel.style.width = `${newW}px`;
        });
        leftDivider.addEventListener('dblclick', () => this.toggleLeftPanel());
      }

      // 2. Center Split Divider (Between Code Editor & Preview)
      const splitDivider = document.getElementById('fenixIdeSplitDivider');
      if (splitDivider) {
        this.setupDragHandler(splitDivider, 'center-split', (dx) => {
          const center = document.getElementById('fenixIdeCenterSplit');
          if (!center) return;
          const totalW = center.clientWidth;
          if (totalW < 300) return;
          const currentEditorW = this.initialDimensions.editorWidth + dx;
          const ratio = Math.max(20, Math.min(Math.round((currentEditorW / totalW) * 100), 80));
          this.state.editorRatio = ratio;
          this.state.previewRatio = 100 - ratio;
          const editor = document.getElementById('fenixIdeEditorArea');
          const preview = document.getElementById('fenixIdePreviewPane');
          if (editor) editor.style.flex = `0 0 ${ratio}%`;
          if (preview) preview.style.flex = `0 0 ${100 - ratio}%`;
        });
      }

      // 3. Bottom Dock Divider
      const bottomDivider = document.getElementById('fenixIdeBottomDivider');
      if (bottomDivider) {
        this.setupDragHandler(bottomDivider, 'bottom-dock', (_dx, dy) => {
          const newH = Math.max(36, Math.min(this.initialDimensions.dockHeight - dy, 550));
          this.state.dockHeight = newH;
          this.state.dockCollapsed = newH <= 50;
          const dock = document.getElementById('fenixIdeDockTray');
          if (dock) {
            dock.style.height = `${newH}px`;
            if (this.state.dockCollapsed) dock.classList.add('collapsed');
            else dock.classList.remove('collapsed');
          }
        });
        bottomDivider.addEventListener('dblclick', () => this.toggleDock());
      }

      // 4. Studio Right Inspector Divider
      const studioDivider = document.getElementById('studioInspectorDivider');
      if (studioDivider) {
        this.setupDragHandler(studioDivider, 'studio-inspector', (dx) => {
          const newW = Math.max(200, Math.min(this.initialDimensions.inspectorWidth - dx, 450));
          const inspector = document.querySelector('.studio-right-inspector');
          if (inspector) inspector.style.width = `${newW}px`;
        });
        studioDivider.addEventListener('dblclick', () => this.toggleStudioInspector());
      }
    }

    setupDragHandler(element, type, onMoveCallback) {
      const onPointerDown = (e) => {
        e.preventDefault();
        this.isDragging = true;
        this.dragType = type;
        this.dragStart = { x: e.clientX, y: e.clientY };
        element.classList.add('is-dragging');
        document.body.style.cursor = type.includes('bottom') ? 'row-resize' : 'col-resize';
        document.body.style.userSelect = 'none';

        const leftPanel = document.getElementById('fenixIdeLeftPanel');
        const editor = document.getElementById('fenixIdeEditorArea');
        const dock = document.getElementById('fenixIdeDockTray');
        const inspector = document.querySelector('.studio-right-inspector');

        this.initialDimensions = {
          width: leftPanel ? leftPanel.clientWidth : 260,
          editorWidth: editor ? editor.clientWidth : 400,
          dockHeight: dock ? dock.clientHeight : 36,
          inspectorWidth: inspector ? inspector.clientWidth : 280
        };

        const onPointerMove = (ev) => {
          if (!this.isDragging) return;
          const dx = ev.clientX - this.dragStart.x;
          const dy = ev.clientY - this.dragStart.y;
          onMoveCallback(dx, dy);
        };

        const onPointerUp = () => {
          this.isDragging = false;
          element.classList.remove('is-dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          this.activePreset = 'custom';
          this.updateDropdown();
          this.saveLayout();
          window.FenixUniversal3DStudio?.onResize?.();
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      };

      element.addEventListener('pointerdown', onPointerDown);
    }

    setupStudioResizeObserver() {
      const container = document.getElementById('studio3dCanvasContainer');
      if (!container || typeof ResizeObserver === 'undefined') return;

      const ro = new ResizeObserver(() => {
        window.FenixUniversal3DStudio?.onResize?.();
      });
      ro.observe(container);
      this.resizeObservers.push(ro);
    }

    bindShortcuts() {
      window.addEventListener('keydown', (e) => {
        // Alt + 1: Development, Alt + 2: 3D Modeling, Alt + 3: CAD, Alt + B: Toggle Left Panel, Alt + T: Toggle Terminal
        if (e.altKey) {
          if (e.key === '1') { e.preventDefault(); this.applyLayout('development'); }
          else if (e.key === '2') { e.preventDefault(); this.applyLayout('3d-modeling'); }
          else if (e.key === '3') { e.preventDefault(); this.applyLayout('cad-engineering'); }
          else if (e.key.toLowerCase() === 'b') { e.preventDefault(); this.toggleLeftPanel(); }
          else if (e.key.toLowerCase() === 't') { e.preventDefault(); this.toggleDock(); }
        }
      });
    }

    updateDropdown() {
      const select = document.getElementById('fenixWorkspacePresetSelect');
      if (select) select.value = this.activePreset;
    }

    updateTopControls() {
      const btnTogglePanel = document.getElementById('btnToggleIdeLeftPanel');
      if (btnTogglePanel) {
        btnTogglePanel.classList.toggle('active', this.state.leftPanelVisible);
      }
      const btnMaxStudio = document.getElementById('btnStudioMaximize');
      if (btnMaxStudio) {
        btnMaxStudio.classList.toggle('active', this.state.studioMaximized);
      }

      // Sync IDE Mode Buttons (Code, Split, Preview)
      const mode = this.state.ideMode || 'split';
      const btnCode = document.getElementById('btnIdeModeCode');
      const btnSplit = document.getElementById('btnIdeModeSplit');
      const btnPreview = document.getElementById('btnIdeModePreview');
      [btnCode, btnSplit, btnPreview].forEach(b => {
        if (b) {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = '#94A3B8';
        }
      });
      const activeModeBtn = mode === 'code' ? btnCode : mode === 'preview' ? btnPreview : btnSplit;
      if (activeModeBtn) {
        activeModeBtn.classList.add('active');
        activeModeBtn.style.background = 'rgba(0,217,255,0.14)';
        activeModeBtn.style.color = '#00D9FF';
      }

      // Sync Studio Modality Buttons (Web, Studio 3D, Video, Recon, QA)
      const modality = this.state.studioModality || 'web';
      ['btnStudioWeb', 'btnStudio3D', 'btnStudioVideo', 'btnStudioReconstruct', 'btnStudioQa'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.classList.remove('active');
          btn.style.background = 'transparent';
          btn.style.color = '#94A3B8';
        }
      });
      const activeModBtn = modality === 'studio3d' ? document.getElementById('btnStudio3D') :
                          modality === 'video' ? document.getElementById('btnStudioVideo') :
                          modality === 'reconstruct' ? document.getElementById('btnStudioReconstruct') :
                          modality === 'qa' ? document.getElementById('btnStudioQa') :
                          document.getElementById('btnStudioWeb');
      if (activeModBtn) {
        activeModBtn.classList.add('active');
        activeModBtn.style.background = 'rgba(0,217,255,0.18)';
        activeModBtn.style.color = '#00D9FF';
      }
    }

    notify(message) {
      if (typeof window.showToast === 'function') {
        window.showToast(message, 'info');
      } else {
        const statusEl = document.getElementById('fenixIdeLiveStatus');
        if (statusEl) {
          statusEl.textContent = message;
          setTimeout(() => { if (statusEl.textContent === message) statusEl.textContent = '—'; }, 3000);
        }
      }
    }
  }

  window.FenixWorkspaceLayoutManager = new WorkspaceLayoutManager();

  // Auto-boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.FenixWorkspaceLayoutManager.init());
  } else {
    window.FenixWorkspaceLayoutManager.init();
  }
})(window);
