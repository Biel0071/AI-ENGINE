/**
 * FÊNIX OS — MULTI-MONITOR SCREEN ADAPTATION & AUTO-FIT ENGINE
 * =============================================================
 * Real-time monitor resolution, DPR, and aspect ratio detector.
 * Automatically adapts layout density, 3D WebGL camera projection,
 * and font scaling across Ultrawide (21:9 / 32:9), 4K, Desktop, Laptop, and Mobile.
 */

(function() {
  'use strict';

  class ScreenAdaptiveEngine {
    constructor() {
      this.mode = 'AUTO'; // 'AUTO', 'ULTRAWIDE', 'DESKTOP', 'LAPTOP', 'MOBILE'
      this.currentProfile = null;
      this.hudPillElement = null;
      this.adaptFrame = null;

      this.init();
    }

    init() {
      this.detectAndApply();
      this.scheduleDetect = () => {
        if (this.adaptFrame !== null) return;
        this.adaptFrame = window.requestAnimationFrame(() => {
          this.adaptFrame = null;
          this.detectAndApply();
        });
      };
      window.addEventListener('resize', this.scheduleDetect, { passive: true });
      window.addEventListener('orientationchange', this.scheduleDetect, { passive: true });
      window.visualViewport?.addEventListener('resize', this.scheduleDetect, { passive: true });

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.mountHudPill());
      } else {
        this.mountHudPill();
      }
    }

    detect() {
      const visualViewport = window.visualViewport;
      const width = Math.round(Math.min(window.innerWidth, visualViewport?.width || window.innerWidth));
      const height = Math.round(Math.min(window.innerHeight, visualViewport?.height || window.innerHeight));
      const screenW = window.screen.width;
      const screenH = window.screen.height;
      const dpr = window.devicePixelRatio || 1;
      const aspectRatio = width / (height || 1);

      let category = 'DESKTOP';
      let label = 'Desktop 16:9';
      let icon = '🖥️';

      if (this.mode === 'AUTO') {
        if (aspectRatio >= 2.0 || (width >= 2500 && aspectRatio > 1.8)) {
          category = 'ULTRAWIDE';
          label = 'Ultrawide';
          icon = '🌌';
        } else if (width >= 2560 && height >= 1440) {
          category = '4K';
          label = '4K UHD';
          icon = '📺';
        } else if (width >= 1440) {
          category = 'DESKTOP';
          label = 'Desktop FHD';
          icon = '🖥️';
        } else if (width >= 1024) {
          category = 'LAPTOP';
          label = 'Laptop';
          icon = '💻';
        } else if (width >= 768) {
          category = 'TABLET';
          label = 'Tablet';
          icon = '📱';
        } else {
          category = 'MOBILE';
          label = 'Mobile';
          icon = '📲';
        }
      } else {
        category = this.mode;
        if (category === 'ULTRAWIDE') { label = 'Ultrawide (Forçado)'; icon = '🌌'; }
        else if (category === 'DESKTOP') { label = 'Desktop (Forçado)'; icon = '🖥️'; }
        else if (category === 'LAPTOP') { label = 'Laptop (Forçado)'; icon = '💻'; }
        else if (category === 'TABLET') { label = 'Tablet (Forçado)'; icon = '📱'; }
        else if (category === 'MOBILE') { label = 'Mobile (Forçado)'; icon = '📲'; }
      }

      return {
        width,
        height,
        screenW,
        screenH,
        dpr,
        aspectRatio: aspectRatio.toFixed(2),
        category,
        scale: 1,
        label,
        icon
      };
    }

    apply(profile) {
      const root = document.documentElement;
      const categories = ['fnx-screen-ultrawide', 'fnx-screen-4k', 'fnx-screen-desktop', 'fnx-screen-laptop', 'fnx-screen-tablet', 'fnx-screen-mobile'];
      categories.forEach(cls => root.classList.remove(cls));

      const targetClass = `fnx-screen-${profile.category.toLowerCase()}`;
      root.classList.add(targetClass);

      root.style.setProperty('--fnx-ui-scale', String(profile.scale));
      root.style.setProperty('--fnx-viewport-width', `${profile.width}px`);
      root.style.setProperty('--fnx-viewport-height', `${profile.height}px`);

      // Notify 3D WebGL World
      if (window.fenixWorld3D && typeof window.fenixWorld3D.resize === 'function') {
        try { window.fenixWorld3D.resize(); } catch (_) {}
      }

      // Notify custom listeners
      window.dispatchEvent(new CustomEvent('fenix.screen.adapted', { detail: profile }));

      this.currentProfile = profile;
      this.updateHudPill(profile);
    }

    detectAndApply() {
      const profile = this.detect();
      this.apply(profile);
    }

    setMode(mode) {
      this.mode = mode;
      this.detectAndApply();
    }

    mountHudPill() {
      if (document.getElementById('fnxDisplayHudPill')) return;

      const container = document.querySelector('.fnx-topbar-right') || document.querySelector('.global-topbar') || document.body;
      const pill = document.createElement('div');
      pill.id = 'fnxDisplayHudPill';
      pill.className = 'fnx-display-hud-pill';
      pill.style.display = 'none';
      pill.setAttribute('title', 'Clique para alternar o modo de exibição / layout adaptativo');

      pill.innerHTML = `
        <span class="pulse-dot"></span>
        <span id="fnxDisplayHudLabel">🖥️ AUTO-FIT</span>
        <div class="fnx-display-menu" id="fnxDisplayMenu">
          <div class="fnx-display-menu-item active" data-mode="AUTO">Auto-Detecção Inteligente</div>
          <div class="fnx-display-menu-item" data-mode="ULTRAWIDE">🌌 Ultrawide (21:9 / 32:9)</div>
          <div class="fnx-display-menu-item" data-mode="DESKTOP">🖥️ Desktop (1080p / 1440p)</div>
          <div class="fnx-display-menu-item" data-mode="LAPTOP">💻 Laptop Compacto</div>
          <div class="fnx-display-menu-item" data-mode="MOBILE">📲 Visão Mobile / Painel</div>
        </div>
      `;

      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = pill.querySelector('#fnxDisplayMenu');
        if (menu) menu.classList.toggle('open');
      });

      pill.querySelectorAll('.fnx-display-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetMode = item.getAttribute('data-mode');
          this.setMode(targetMode);
          pill.querySelectorAll('.fnx-display-menu-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          const menu = pill.querySelector('#fnxDisplayMenu');
          if (menu) menu.classList.remove('open');
        });
      });

      document.addEventListener('click', () => {
        const menu = pill.querySelector('#fnxDisplayMenu');
        if (menu) menu.classList.remove('open');
      });

      if (container.firstChild) {
        container.insertBefore(pill, container.firstChild);
      } else {
        container.appendChild(pill);
      }

      this.hudPillElement = pill;
      if (this.currentProfile) this.updateHudPill(this.currentProfile);
    }

    updateHudPill(profile) {
      const labelEl = document.getElementById('fnxDisplayHudLabel');
      if (labelEl) {
        labelEl.innerText = `${profile.icon} ${profile.label} · ${profile.width}x${profile.height}`;
      }
    }
  }

  window.FenixScreenAdaptive = new ScreenAdaptiveEngine();
})();
