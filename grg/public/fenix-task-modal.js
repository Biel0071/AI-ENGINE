/**
 * FÊNIX OS — CYBERPUNK TASK POP-UP MODAL CONTROLLER
 * ===================================================
 * Real-time Human-in-the-Loop task supervision, execution monitoring,
 * live telemetry timer, and 3D agent localization.
 */

(function() {
  'use strict';

  function hasMeaningfulTaskText(value) {
    return typeof value === 'string' && value.trim().length >= 4 && /\p{L}/u.test(value.trim());
  }

  function isValidApprovalPopup(task) {
    return Boolean(task && typeof task.taskId === 'string' && task.taskId.trim() &&
      hasMeaningfulTaskText(task.title) && task.title.trim() !== task.taskId.trim() &&
      hasMeaningfulTaskText(task.objective) &&
      task.requiresApproval === true && task.status === 'APPROVAL_PENDING' &&
      task.payload?.generatedBy !== 'test_trigger');
  }

  class FenixTaskModalController {
    constructor() {
      this.activeTask = null;
      this.timerInterval = null;
      this.startTime = 0;
      this.overlayEl = null;
      this.minimizedDockEl = null;

      this.init();
    }

    init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.mountDOM());
      } else {
        this.mountDOM();
      }

      // Check for popups every 3.5s
      setInterval(() => this.pollActivePopups(), 3500);

      // Listen to ESC and Enter
      document.addEventListener('keydown', (e) => {
        if (!this.overlayEl || !this.overlayEl.classList.contains('active')) return;
        if (e.key === 'Escape') this.minimize();
        if (e.key === 'Enter' && e.ctrlKey && this.activeTask) this.handleApprove();
      });
    }

    mountDOM() {
      if (document.getElementById('fnxTaskModalOverlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'fnxTaskModalOverlay';
      overlay.className = 'fnx-task-modal-overlay';
      overlay.innerHTML = `
        <div class="fnx-task-modal" role="dialog" aria-modal="true" aria-labelledby="fnxTaskModalTitle">
          <div class="fnx-modal-header">
            <div class="fnx-modal-header-left">
              <span class="fnx-modal-badge approval" id="fnxTaskStatusBadge">⚠️ AGUARDANDO APROVAÇÃO</span>
              <span class="fnx-executor-badge" id="fnxTaskExecutorBadge">⚡ ANTIGRAVITY</span>
            </div>
            <button class="fnx-modal-close-btn" id="fnxTaskModalCloseBtn" title="Minimizar (ESC)">✕</button>
          </div>
          <div class="fnx-modal-body">
            <h3 class="fnx-modal-title" id="fnxTaskModalTitle"></h3>
            <p class="fnx-modal-desc" id="fnxTaskModalObjective"></p>
            <div class="fnx-task-reference"><span>ID da tarefa</span><code id="fnxTaskId"></code></div>
            
            <div class="fnx-agent-card">
              <div class="fnx-agent-card-info">
                <div class="fnx-agent-avatar" id="fnxTaskAgentAvatar">🤖</div>
                <div>
                  <div class="fnx-agent-name" id="fnxTaskAgentName">Agente Responsável</div>
                  <div class="fnx-agent-role-pill" id="fnxTaskAgentRole">ESPECIALISTA</div>
                </div>
              </div>
              <button class="fnx-btn-secondary" id="fnxLocateAgent3DBtn" title="Localizar no mapa 3D da Cidade">🌐 Ver no 3D</button>
            </div>

            <div class="fnx-telemetry-grid">
              <div class="fnx-telemetry-box">
                <span class="fnx-telemetry-label">Cronômetro</span>
                <span class="fnx-telemetry-value" id="fnxTaskTimer">Não iniciado</span>
              </div>
              <div class="fnx-telemetry-box">
                <span class="fnx-telemetry-label">Tokens Est.</span>
                <span class="fnx-telemetry-value" id="fnxTaskTokens">Não medido</span>
              </div>
              <div class="fnx-telemetry-box">
                <span class="fnx-telemetry-label">Custo Est.</span>
                <span class="fnx-telemetry-value" id="fnxTaskCost">Não medido</span>
              </div>
            </div>

            <div class="fnx-progress-container">
              <div style="display:flex; justify-content:space-between; font-size:11px; font-family:var(--font-mono, monospace); color:#94a3b8;">
                <span>Progresso da Decomposição</span>
                <span id="fnxTaskProgressPct">Não iniciado</span>
              </div>
              <div class="fnx-progress-bar-bg">
                <div class="fnx-progress-bar-fill" id="fnxTaskProgressBar" style="width: 0%;"></div>
              </div>
            </div>
          </div>
          <div class="fnx-modal-footer">
            <button class="fnx-btn-danger" id="fnxRejectTaskBtn">✖ Rejeitar</button>
            <div style="display:flex; gap:8px;">
              <button class="fnx-btn-secondary" id="fnxAdjustTaskBtn">⚙️ Parâmetros</button>
              <button class="fnx-btn-primary" id="fnxApproveTaskBtn">⚡ Aprovar & Executar</button>
            </div>
          </div>
        </div>
      `;

      const dock = document.createElement('div');
      dock.id = 'fnxMinimizedTaskDock';
      dock.className = 'fnx-minimized-task-dock';
      dock.innerHTML = `<span>⚠️</span> <span id="fnxMinimizedDockText">1 Tarefa Pendente</span>`;
      dock.addEventListener('click', () => this.restore());

      document.body.appendChild(overlay);
      document.body.appendChild(dock);

      this.overlayEl = overlay;
      this.minimizedDockEl = dock;

      // Event bindings
      overlay.querySelector('#fnxTaskModalCloseBtn').addEventListener('click', () => this.minimize());
      overlay.querySelector('#fnxApproveTaskBtn').addEventListener('click', () => this.handleApprove());
      overlay.querySelector('#fnxRejectTaskBtn').addEventListener('click', () => this.handleReject());
      overlay.querySelector('#fnxLocateAgent3DBtn').addEventListener('click', () => this.locateAgent());
    }

    playSciFiChime() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch (_) {}
    }

    show(task) {
      if (!this.overlayEl || !isValidApprovalPopup(task)) return false;
      this.activeTask = task;

      const titleEl = document.getElementById('fnxTaskModalTitle');
      const objEl = document.getElementById('fnxTaskModalObjective');
      const taskIdEl = document.getElementById('fnxTaskId');
      const agentNameEl = document.getElementById('fnxTaskAgentName');
      const agentRoleEl = document.getElementById('fnxTaskAgentRole');
      const agentAvatarEl = document.getElementById('fnxTaskAgentAvatar');
      const execEl = document.getElementById('fnxTaskExecutorBadge');
      const tokensEl = document.getElementById('fnxTaskTokens');
      const costEl = document.getElementById('fnxTaskCost');

      if (titleEl) titleEl.innerText = task.title || 'Missão Operacional';
      if (objEl) objEl.innerText = task.objective;
      if (taskIdEl) taskIdEl.textContent = task.taskId;
      if (agentNameEl) agentNameEl.innerText = task.agent?.name || 'Agente não identificado';
      if (agentRoleEl) agentRoleEl.innerText = task.agent?.role || 'Função indisponível';
      if (agentAvatarEl) agentAvatarEl.innerText = task.agent?.emoji || '🤖';
      if (execEl) execEl.innerText = `⚡ ${task.executor || 'Executor não informado'}`;
      if (tokensEl) tokensEl.innerText = Number.isFinite(task.tokensEstimated) ? `${task.tokensEstimated} tok` : 'Não medido';
      if (costEl) costEl.innerText = Number.isFinite(Number(task.costEstimated)) ? `$${Number(task.costEstimated).toFixed(4)}` : 'Não medido';

      this.overlayEl.classList.add('active');
      if (this.minimizedDockEl) this.minimizedDockEl.classList.remove('visible');

      clearInterval(this.timerInterval);
      const timerEl = document.getElementById('fnxTaskTimer');
      if (timerEl) timerEl.innerText = 'Não iniciado';

      this.playSciFiChime();
      return true;
    }

    minimize() {
      if (this.overlayEl) this.overlayEl.classList.remove('active');
      if (this.minimizedDockEl && this.activeTask) {
        this.minimizedDockEl.classList.add('visible');
        const text = document.getElementById('fnxMinimizedDockText');
        if (text) text.innerText = `⚠️ Tarefa: ${this.activeTask.title.slice(0, 24)}...`;
      }
    }

    restore() {
      if (this.activeTask) this.show(this.activeTask);
    }

    hide() {
      if (this.overlayEl) this.overlayEl.classList.remove('active');
      if (this.minimizedDockEl) this.minimizedDockEl.classList.remove('visible');
      clearInterval(this.timerInterval);
      this.activeTask = null;
    }

    async handleApprove() {
      if (!this.activeTask) return;
      const taskId = this.activeTask.taskId;
      const btn = document.getElementById('fnxApproveTaskBtn');
      if (btn) btn.innerText = '⚡ Aprovando...';

      try {
        const res = await fetch(`/api/v2/agents/tasks/${encodeURIComponent(taskId)}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvedBy: 'web_operator' })
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${res.status}`);
        
        const badge = document.getElementById('fnxTaskStatusBadge');
        if (badge) {
          badge.className = 'fnx-modal-badge running';
          badge.innerText = '🟢 EXECUTANDO...';
        }

        setTimeout(() => this.hide(), 1200);
      } catch (err) {
        alert(`Erro ao aprovar tarefa: ${err.message}`);
      } finally {
        if (btn) btn.innerText = '⚡ Aprovar & Executar';
      }
    }

    async handleReject() {
      if (!this.activeTask) return;
      const taskId = this.activeTask.taskId;
      if (!confirm('Deseja realmente rejeitar esta tarefa?')) return;

      try {
        const response = await fetch(`/api/v2/agents/tasks/${encodeURIComponent(taskId)}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Rejeitado pelo operador' })
        });
        const result = await response.json();
        if (!response.ok || result?.ok === false) throw new Error(result?.error || `HTTP ${response.status}`);
        this.hide();
      } catch (err) {
        alert(`Erro ao rejeitar tarefa: ${err.message}`);
      }
    }

    locateAgent() {
      if (!this.activeTask?.agent?.id) return;
      const agentId = this.activeTask.agent.id;

      if (window.fenixWorld3D && typeof window.fenixWorld3D.focusAgent === 'function') {
        window.fenixWorld3D.focusAgent(agentId);
        this.minimize();
      } else if (document.querySelector('.nav-item[data-panel="world"]')) {
        document.querySelector('.nav-item[data-panel="world"]').click();
        this.minimize();
      }
    }

    async pollActivePopups() {
      if (this.activeTask && this.overlayEl?.classList.contains('active')) return;
      try {
        const res = await fetch('/api/v2/agents/popups');
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && Array.isArray(data.popups) && data.popups.length > 0) {
          const first = data.popups.find(isValidApprovalPopup);
          if (!first) return;
          if (!this.activeTask || this.activeTask.taskId !== first.taskId) {
            this.show(first);
          }
        }
      } catch (_) {}
    }
  }

  window.FenixTaskModal = new FenixTaskModalController();
})();
