/**
 * FÊNIX OS — DYNAMIC AGENT POOL CONTROLLER & SWARM HUD
 * =======================================================
 * Manages the dynamic scaling of the AI agent pool (10 to 100+ agents),
 * auto-scale intelligence toggling, real-time swarm visualization,
 * and instant mission/task testing.
 */

(function() {
  'use strict';

  class FenixDynamicAgentHud {
    constructor() {
      this.poolState = null;
      this.hudButtonEl = null;
      this.panelEl = null;

      this.init();
    }

    init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.mountDOM());
      } else {
        this.mountDOM();
      }

      setInterval(() => {
        if (!document.hidden && this.panelEl?.classList.contains('open')) this.fetchPoolState();
      }, 4000);
    }

    mountDOM() {
      if (document.getElementById('fnxPoolHudBtn')) return;

      const container = document.querySelector('.fnx-topbar-right') || document.querySelector('.global-topbar') || document.body;
      const wrapper = document.createElement('div');
      wrapper.id = 'fnxPoolHudWrapper';
      wrapper.style.position = 'relative';
      wrapper.style.display = 'none';
      wrapper.style.alignItems = 'center';

      wrapper.innerHTML = `
        <div class="fnx-pool-hud-btn" id="fnxPoolHudBtn" title="Controle Dinâmico de Pool de Agentes (10 a 100+)">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
          <span id="fnxPoolHudLabel">POOL: 10 AGENTES</span>
          <strong id="fnxPoolHudCount" aria-hidden="true">10</strong>
        </div>

        <div class="fnx-pool-panel" id="fnxPoolPanel">
          <div class="fnx-pool-header">
            <span class="fnx-pool-title">🤖 Swarm de Agentes Dinâmicos</span>
            <span style="font-size:11px; font-family:var(--font-mono, monospace); color:#10b981;" id="fnxPoolCapacityText">10/10 Disponíveis</span>
          </div>

          <div style="font-size:11px; color:#94a3b8;">Escala Operacional Instantânea:</div>
          <div class="fnx-pool-scale-row">
            <div class="fnx-scale-chip active" data-size="10">10 Agentes</div>
            <div class="fnx-scale-chip" data-size="20">20 Agentes</div>
            <div class="fnx-scale-chip" data-size="50">50 Agentes</div>
            <div class="fnx-scale-chip" data-size="100">100 Agentes</div>
          </div>

          <div class="fnx-autoscale-row">
            <div>
              <div style="font-weight:600;">Auto-Scale Inteligente</div>
              <div style="font-size:10px; color:#64748b;">Escala por carga e demanda de missões</div>
            </div>
            <label class="fnx-switch">
              <input type="checkbox" id="fnxAutoScaleToggle" checked>
              <span class="fnx-slider"></span>
            </label>
          </div>

          <div style="font-size:11px; color:#94a3b8; display:flex; justify-content:space-between;">
            <span>Distribuição do Swarm</span>
            <span id="fnxSwarmMetrics" style="font-family:var(--font-mono, monospace); color:#38bdf8;">0% Carga</span>
          </div>

          <div class="fnx-swarm-grid" id="fnxSwarmGrid">
            <!-- Populated dynamically -->
          </div>

          <button class="fnx-test-trigger-btn" id="fnxTriggerTestTaskBtn">
            ⚡ Disparar Tarefa de Teste (Pop-up HUD)
          </button>
        </div>
      `;

      if (container.firstChild) {
        container.insertBefore(wrapper, container.firstChild);
      } else {
        container.appendChild(wrapper);
      }

      this.hudButtonEl = wrapper.querySelector('#fnxPoolHudBtn');
      this.panelEl = wrapper.querySelector('#fnxPoolPanel');

      // Bind events
      this.hudButtonEl.setAttribute('role', 'button');
      this.hudButtonEl.setAttribute('tabindex', '0');
      this.hudButtonEl.setAttribute('aria-controls', 'fnxPoolPanel');
      this.hudButtonEl.setAttribute('aria-expanded', 'false');
      this.hudButtonEl.setAttribute('aria-label', 'Abrir controles do pool de agentes');
      this.panelEl.setAttribute('role', 'dialog');
      this.panelEl.setAttribute('aria-label', 'Controles do pool de agentes');

      const setPanelOpen = (open) => {
        this.panelEl.classList.toggle('open', open);
        this.hudButtonEl.setAttribute('aria-expanded', String(open));
        if (open) this.fetchPoolState();
      };
      const togglePanel = () => setPanelOpen(!this.panelEl.classList.contains('open'));

      this.hudButtonEl.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
      });
      this.hudButtonEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          togglePanel();
        } else if (e.key === 'Escape') {
          setPanelOpen(false);
        }
      });

      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          setPanelOpen(false);
        }
      });

      wrapper.querySelectorAll('.fnx-scale-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const target = Number(chip.getAttribute('data-size'));
          this.scalePool(target);
        });
      });

      const autoToggle = wrapper.querySelector('#fnxAutoScaleToggle');
      if (autoToggle) {
        autoToggle.addEventListener('change', (e) => {
          this.toggleAutoScale(e.target.checked);
        });
      }

      const testBtn = wrapper.querySelector('#fnxTriggerTestTaskBtn');
      if (testBtn) {
        testBtn.addEventListener('click', () => this.triggerTestTask());
      }

      this.fetchPoolState();
    }

    async fetchPoolState() {
      try {
        const res = await fetch('/api/v2/agents/pool');
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.pool) {
          this.poolState = data.pool;
          this.renderPoolUI();
        }
      } catch (_) {}
    }

    async scalePool(targetSize) {
      try {
        const res = await fetch('/api/v2/agents/pool/scale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetSize })
        });
        const data = await res.json();
        if (data.ok && data.pool) {
          this.poolState = data.pool;
          this.renderPoolUI();
          if (window.showToast) window.showToast(`Pool escalonado para ${targetSize} agentes!`, 'success');
        }
      } catch (err) {
        alert(`Erro ao escalonar pool: ${err.message}`);
      }
    }

    async toggleAutoScale(enabled) {
      try {
        await fetch('/api/v2/agents/pool/scale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ autoScale: enabled })
        });
        if (window.showToast) window.showToast(`Auto-scale ${enabled ? 'ativado' : 'desativado'}!`, 'info');
      } catch (_) {}
    }

    async triggerTestTask() {
      const btn = document.getElementById('fnxTriggerTestTaskBtn');
      if (btn) btn.innerText = '⚡ Acionando...';

      try {
        const res = await fetch('/api/v2/agents/test-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.ok && data.popup) {
          if (window.FenixTaskModal) {
            window.FenixTaskModal.show(data.popup);
          }
          this.panelEl.classList.remove('open');
        }
      } catch (err) {
        alert(`Erro ao disparar tarefa de teste: ${err.message}`);
      } finally {
        if (btn) btn.innerText = '⚡ Disparar Tarefa de Teste (Pop-up HUD)';
      }
    }

    renderPoolUI() {
      if (!this.poolState) return;

      const size = this.poolState.size || 10;
      const idle = this.poolState.idleCount || 0;
      const busy = this.poolState.busyCount || 0;
      const util = this.poolState.utilizationPercentage || 0;

      const label = document.getElementById('fnxPoolHudLabel');
      if (label) label.innerText = `POOL: ${size} AGENTES`;
      const count = document.getElementById('fnxPoolHudCount');
      if (count) count.textContent = String(size);
      if (this.hudButtonEl) {
        this.hudButtonEl.setAttribute('aria-label', `Pool: ${size} agentes. Abrir controles de capacidade e carga.`);
        this.hudButtonEl.setAttribute('title', `Pool com ${size} agentes. Clique para ver disponíveis, ocupados e carga.`);
      }

      const cap = document.getElementById('fnxPoolCapacityText');
      if (cap) cap.innerText = `${idle}/${size} Disponíveis (${busy} Ocupados)`;

      const metrics = document.getElementById('fnxSwarmMetrics');
      if (metrics) metrics.innerText = `${util}% Carga`;

      // Update active scale chip
      document.querySelectorAll('.fnx-scale-chip').forEach(chip => {
        const chipSize = Number(chip.getAttribute('data-size'));
        chip.classList.toggle('active', chipSize === size);
      });

      // Update Auto-Scale toggle
      const autoToggle = document.getElementById('fnxAutoScaleToggle');
      if (autoToggle) autoToggle.checked = Boolean(this.poolState.autoScale);

      // Render Swarm Cards
      const grid = document.getElementById('fnxSwarmGrid');
      if (grid && Array.isArray(this.poolState.agents)) {
        grid.innerHTML = this.poolState.agents.map(a => {
          const statusCls = a.status === 'RUNNING' ? 'running' : (a.status === 'WAITING_APPROVAL' ? 'waiting' : 'idle');
          return `
            <div class="fnx-swarm-card ${statusCls}" title="${a.name} (${a.role}) - ${a.status}">
              <span class="status-indicator"></span>
              <span style="font-size:14px; margin-bottom:2px;">${a.emoji || '🤖'}</span>
              <span style="font-family:var(--font-mono, monospace); font-weight:600; font-size:9px;">#${String(a.index || '').padStart(2, '0')}</span>
            </div>
          `;
        }).join('');
      }
    }
  }

  window.FenixDynamicAgentHud = new FenixDynamicAgentHud();
})();
