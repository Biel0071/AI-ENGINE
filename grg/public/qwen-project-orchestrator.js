/**
 * FÊNIX OS — Qwen Project Orchestrator Client-Side Controller
 * Single Source of Truth Client for Autonomous Project Creation & Evolution via Qwen Coder + GitHub.
 * Zero-Mock Compliant: All metrics and statuses start as honest indicators ('—') until loaded from API.
 */

(function() {
  'use strict';

  const state = {
    autonomyMode: 'padrao', // 'request' | 'padrao' | 'turbo' | 'acesso_total'
    activeProject: null,
    projects: [],
    totalProjects: '—',
    queue: {
      total: '—',
      pending: '—',
      running: '—',
      completed: '—',
      items: []
    },
    browser: {
      connected: false,
      mode: 'disconnected',
      activeUrl: '—',
      activeTab: '—',
      loggedInQwen: false,
      loggedInGithub: false,
      qwenAccount: '—',
      githubAccount: '—',
      lastAction: '—',
      lastError: null
    },
    isLoading: false,
    lastRefreshedAt: null
  };

  let refreshInFlight = false;
  let retryAfter = 0;
  let failureCount = 0;
  let lastRefreshError = null;

  function getAuthToken() {
    return window.localStorage?.getItem('grg_token') ||
           window.localStorage?.getItem('fenix_token') ||
           (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] ||
           '';
  }

  async function apiRequest(endpoint, { method = 'GET', body = null, timeoutMs = 0 } = {}) {
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(endpoint, {
      method,
      headers,
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
      ...(timeoutMs > 0 ? { signal: AbortSignal.timeout(timeoutMs) } : {})
    });

    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) errText = errJson.error;
      } catch (_) {}
      throw new Error(errText);
    }

    return await res.json();
  }

  const FenixQwenOrchestrator = {
    state,

    async init() {
      await this.refresh();
      this.attachToIdeLeftPanel();
      // Poll slowly and never overlap a request; failures use exponential backoff.
      setInterval(() => {
        if (document.visibilityState === 'visible' && Date.now() >= retryAfter) {
          this.refresh().catch(() => {});
        }
      }, 30000);
    },

    async refresh() {
      if (refreshInFlight) return null;
      refreshInFlight = true;
      try {
        const data = await apiRequest('/api/v2/qwen-orchestrator/status', { timeoutMs: 10000 });
        if (data && data.ok) {
          state.autonomyMode = data.autonomyMode || 'padrao';
          state.activeProject = data.activeProject || null;
          state.projects = data.projects || [];
          state.totalProjects = data.totalProjects != null ? data.totalProjects : 0;
          state.queue = data.queue || state.queue;
          state.browser = data.browser || state.browser;
          state.lastRefreshedAt = new Date().toISOString();
          this.updateStudioUI();
          this.updateIdeBridgeUI();
          failureCount = 0;
          retryAfter = 0;
          lastRefreshError = null;
        }
        return data;
      } catch (err) {
        failureCount += 1;
        const baseDelay = /401|unauthor|login/i.test(err.message) ? 60000 : 15000;
        retryAfter = Date.now() + Math.min(baseDelay * (2 ** Math.min(failureCount - 1, 4)), 300000);
        if (lastRefreshError !== err.message) {
          console.warn('[QwenOrchestrator] Falha na telemetria; próxima tentativa em backoff:', err.message);
          lastRefreshError = err.message;
        }
        return null;
      } finally {
        refreshInFlight = false;
      }
    },

    async setMode(newMode) {
      try {
        const res = await apiRequest('/api/v2/qwen-orchestrator/mode', {
          method: 'POST',
          body: { mode: newMode }
        });
        if (res.ok) {
          state.autonomyMode = newMode;
          this.updateStudioUI();
        }
      } catch (err) {
        alert(`Erro ao alterar modo: ${err.message}`);
      }
    },

    async planProject(goal, repoName) {
      if (!goal) return;
      state.isLoading = true;
      this.updateStudioUI();
      try {
        const res = await apiRequest('/api/v2/qwen-orchestrator/project/plan', {
          method: 'POST',
          body: {
            name: goal.slice(0, 40),
            goal,
            repoName,
            autonomyMode: state.autonomyMode
          }
        });
        await this.refresh();
        return res;
      } catch (err) {
        alert(`Erro ao planejar projeto: ${err.message}`);
      } finally {
        state.isLoading = false;
        this.updateStudioUI();
      }
    },

    async connectBrowser(cdpUrl) {
      try {
        const res = await apiRequest('/api/v2/qwen-orchestrator/session/connect', {
          method: 'POST',
          body: { cdpUrl }
        });
        await this.refresh();
        return res;
      } catch (err) {
        alert(`Erro ao conectar navegador: ${err.message}`);
      }
    },

    async approveAction(actionId) {
      try {
        await apiRequest('/api/v2/qwen-orchestrator/queue/approve', {
          method: 'POST',
          body: { actionId }
        });
        await this.refresh();
      } catch (err) {
        alert(`Erro ao aprovar ação: ${err.message}`);
      }
    },

    async rejectAction(actionId) {
      try {
        await apiRequest('/api/v2/qwen-orchestrator/queue/reject', {
          method: 'POST',
          body: { actionId, reason: 'Rejeitado pelo operador' }
        });
        await this.refresh();
      } catch (err) {
        alert(`Erro ao rejeitar ação: ${err.message}`);
      }
    },

    async executeNext() {
      try {
        await apiRequest('/api/v2/qwen-orchestrator/queue/execute-next', {
          method: 'POST'
        });
        await this.refresh();
      } catch (err) {
        alert(`Erro ao executar passo: ${err.message}`);
      }
    },

    renderStudio(container) {
      if (!container) return;
      container.id = 'qwenStudioContainer';
      container.innerHTML = `
        <div class="qwen-studio-layout">
          <!-- Header com Seletor de Modos -->
          <div class="qwen-studio-header">
            <div class="qwen-studio-title">
              <h2><i class="ph-bold ph-lightning" style="color:#00D9FF;"></i> Qwen Project Creator & Studio</h2>
              <p>Orquestrador autônomo com simbiose entre Qwen Coder (coder.qwen.ai) e GitHub (@Biel0071).</p>
            </div>
            <div class="qwen-modes-container" id="qwenModesContainer">
              <button type="button" class="qwen-mode-btn ${state.autonomyMode === 'request' ? 'active' : ''}" data-mode="request" title="Aprovação manual de cada passo">
                <i class="ph-bold ph-shield"></i> Request
              </button>
              <button type="button" class="qwen-mode-btn ${state.autonomyMode === 'padrao' ? 'active' : ''}" data-mode="padrao" title="Auto-execução de scaffolds; aprovação para repositórios e merges">
                <i class="ph-bold ph-sliders"></i> Padrão
              </button>
              <button type="button" class="qwen-mode-btn ${state.autonomyMode === 'turbo' ? 'active' : ''}" data-mode="turbo" title="Execução acelerada e auto-merge">
                <i class="ph-bold ph-rocket-launch"></i> Turbo
              </button>
              <button type="button" class="qwen-mode-btn ${state.autonomyMode === 'acesso_total' ? 'active' : ''}" data-mode="acesso_total" title="Modo autônomo contínuo até conclusão (/goal)">
                <i class="ph-bold ph-infinity"></i> Acesso Total
              </button>
            </div>
          </div>

          <!-- Telemetria & Status Cards -->
          <div class="qwen-telemetry-strip">
            <div class="qwen-telem-card">
              <span class="qwen-telem-label">Projeto Ativo</span>
              <span class="qwen-telem-val" id="qwenTelemActiveProject">${state.activeProject ? state.activeProject.name : '—'}</span>
            </div>
            <div class="qwen-telem-card">
              <span class="qwen-telem-label">Progresso do Sistema</span>
              <span class="qwen-telem-val" id="qwenTelemProgress">${state.activeProject ? state.activeProject.progress + '%' : '—'}</span>
            </div>
            <div class="qwen-telem-card">
              <span class="qwen-telem-label">Fila de Ações</span>
              <span class="qwen-telem-val" id="qwenTelemQueueTotal">${state.queue.total !== '—' ? state.queue.total : '—'}</span>
            </div>
            <div class="qwen-telem-card">
              <span class="qwen-telem-label">Browser Bridge</span>
              <span class="qwen-telem-val" id="qwenTelemBrowserStatus" style="font-size:12px; color:${state.browser.connected ? '#10B981' : '#F59E0B'};">
                <i class="ph-bold ${state.browser.connected ? 'ph-check-circle' : 'ph-warning-circle'}"></i>
                ${state.browser.connected ? state.browser.mode.toUpperCase() : 'DESCONECTADO'}
              </span>
            </div>
          </div>

          <!-- Card de Planejamento de Novo Projeto -->
          <div class="qwen-plan-card">
            <h3><i class="ph-bold ph-magic-wand"></i> Criar / Evoluir Novo Sistema com Qwen Coder</h3>
            <div class="qwen-plan-inputs">
              <input type="text" id="qwenInputGoal" class="qwen-plan-input" placeholder="Descreva o sistema completo (ex: Sistema de Agendamentos Médicos com notificações e chat)..." />
              <input type="text" id="qwenInputRepo" class="qwen-plan-input" style="max-width:200px;" placeholder="Nome do Repositório GitHub..." />
              <button type="button" id="qwenBtnPlan" class="qwen-plan-btn">
                <i class="ph-bold ph-play"></i> Gerar Plano Mestre
              </button>
            </div>
          </div>

          <!-- Fila de Ações (Action Queue) -->
          <div class="qwen-queue-section">
            <div class="qwen-queue-header">
              <h3><i class="ph-bold ph-queue"></i> Fila de Requisições & Ações (${state.queue.total})</h3>
              <button type="button" id="qwenBtnExecNext" class="qwen-action-btn btn-approve" style="padding:6px 14px;">
                <i class="ph-bold ph-fast-forward"></i> Executar Próximo Passo
              </button>
            </div>
            <div class="qwen-queue-list" id="qwenQueueList">
              ${this.renderQueueItems()}
            </div>
          </div>
        </div>
      `;

      // Event Listeners
      container.querySelectorAll('.qwen-mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
      });

      const planBtn = container.querySelector('#qwenBtnPlan');
      if (planBtn) {
        planBtn.addEventListener('click', () => {
          const goal = container.querySelector('#qwenInputGoal')?.value.trim();
          const repo = container.querySelector('#qwenInputRepo')?.value.trim();
          if (goal) this.planProject(goal, repo);
        });
      }

      const execNextBtn = container.querySelector('#qwenBtnExecNext');
      if (execNextBtn) {
        execNextBtn.addEventListener('click', () => this.executeNext());
      }

      this.bindQueueActionButtons(container);
    },

    renderQueueItems() {
      const items = state.queue.items || [];
      if (!items.length) {
        return '<div style="color:#64748B; font-size:12px; padding:20px; text-align:center; background:#080C14; border-radius:8px;">Nenhuma ação na fila. Use o formulário acima ou o comando /goal no mascote para iniciar.</div>';
      }

      return items.map((item) => {
        let badgeClass = 'badge-pending';
        let badgeText = item.status;
        if (item.status === 'WAITING_APPROVAL') {
          badgeClass = 'badge-waiting';
          badgeText = 'Aprovação Necessária';
        } else if (item.status === 'RUNNING') {
          badgeClass = 'badge-running';
          badgeText = 'Em Execução';
        } else if (item.status === 'COMPLETED') {
          badgeClass = 'badge-completed';
          badgeText = 'Concluído';
        } else if (item.status === 'REJECTED') {
          badgeClass = 'badge-rejected';
          badgeText = 'Rejeitado';
        }

        const isActionable = item.status === 'WAITING_APPROVAL';

        return `
          <div class="qwen-action-card" data-action-id="${item.id}">
            <div class="qwen-action-header">
              <div class="qwen-action-title-group">
                <span class="qwen-action-step-num">Fase ${item.phase || 1}</span>
                <span class="qwen-action-title">${this.escapeHTML(item.title || 'Ação do Sistema')}</span>
              </div>
              <span class="qwen-action-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="qwen-action-prompt">${this.escapeHTML(item.prompt || '—')}</div>
            ${item.result?.repoUrl ? `
              <div style="margin-top:6px; font-size:11px;">
                <a href="${this.escapeHTML(item.result.repoUrl)}" target="_blank" rel="noopener" style="color:#00D9FF; text-decoration:underline;">
                  <i class="ph-bold ph-arrow-square-out"></i> Repositório: ${this.escapeHTML(item.result.repoUrl)}
                </a>
              </div>
            ` : ''}
            ${item.result?.artifacts && item.result.artifacts.length ? `
              <div style="margin-top:6px; font-size:11px; color:#10B981;">
                <i class="ph-bold ph-file-code"></i> ${item.result.artifacts.length} artefato(s) de código gerado(s)
              </div>
            ` : ''}
            ${isActionable ? `
              <div class="qwen-action-actions">
                <button type="button" class="qwen-action-btn btn-approve" data-act="approve" data-id="${item.id}">
                  <i class="ph-bold ph-check"></i> Aprovar Execução
                </button>
                <button type="button" class="qwen-action-btn btn-reject" data-act="reject" data-id="${item.id}">
                  <i class="ph-bold ph-x"></i> Rejeitar
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    },

    bindQueueActionButtons(container) {
      container.querySelectorAll('[data-act="approve"]').forEach((btn) => {
        btn.addEventListener('click', () => this.approveAction(btn.dataset.id));
      });
      container.querySelectorAll('[data-act="reject"]').forEach((btn) => {
        btn.addEventListener('click', () => this.rejectAction(btn.dataset.id));
      });
    },

    updateStudioUI() {
      const container = document.getElementById('qwenStudioContainer') ||
                        document.querySelector('.qwen-studio-layout')?.parentElement ||
                        (document.getElementById('flpDetail')?.querySelector('.qwen-studio-layout') ? document.getElementById('flpDetail') : null);
      if (container) {
        this.renderStudio(container);
      }
      const sideCards = document.getElementById('flpQwenCards');
      if (sideCards) {
        this.renderSidebarCards(sideCards);
      }
    },

    renderSidebarCards(container) {
      if (!container) return;
      const projects = state.projects || [];
      if (!projects.length) {
        container.innerHTML = `
          <div style="padding:14px; color:#64748b; font-size:11px; text-align:center;">
            Nenhum projeto gerado ainda.<br>Use <strong>/goal</strong> ou o formulário ao lado.
          </div>`;
        return;
      }

      container.innerHTML = projects.map((p) => {
        const isActive = state.activeProject?.id === p.id;
        return `
          <div class="flp-card ${isActive ? 'active' : ''}" style="cursor:pointer; margin-bottom:8px; border-left:3px solid ${isActive ? '#00D9FF' : 'rgba(255,255,255,0.1)'};" onclick="window.fenixQwenOrchestrator?.selectProject('${p.id}')">
            <div style="font-weight:700; color:#f8fafc; font-size:12px;">${this.escapeHTML(p.name)}</div>
            <div style="color:#00D9FF; font-size:10px; font-family:var(--fenix-font-mono); margin-top:2px;">Biel0071/${this.escapeHTML(p.repo || p.repoName || p.name)}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:10px; color:#94a3b8;">
              <span>Progresso: <strong>${p.progress || 0}%</strong></span>
              <span class="qwen-action-badge ${p.status === 'COMPLETED' ? 'badge-completed' : 'badge-running'}" style="font-size:9px; padding:1px 6px;">${p.status}</span>
            </div>
          </div>
        `;
      }).join('');
    },

    selectProject(projectId) {
      const p = (state.projects || []).find((x) => x.id === projectId);
      if (p) {
        state.activeProject = p;
        this.updateStudioUI();
      }
    },

    attachToIdeLeftPanel() {
      const gitPane = document.getElementById('fenixIdeGitPane');
      if (!gitPane || document.getElementById('fenixIdeQwenPane')) return;

      const qwenPane = document.createElement('div');
      qwenPane.id = 'fenixIdeQwenPane';
      qwenPane.className = 'qwen-ide-pane';
      qwenPane.style.display = 'none';
      gitPane.parentNode.appendChild(qwenPane);

      this.updateIdeBridgeUI();
    },

    updateIdeBridgeUI() {
      let pane = document.getElementById('fenixIdeQwenPane');
      if (!pane) {
        this.attachToIdeLeftPanel();
        pane = document.getElementById('fenixIdeQwenPane');
      }
      if (!pane) return;

      pane.innerHTML = `
        <div style="font-size:10px; font-weight:800; color:#00D9FF; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:6px; display:flex; align-items:center; gap:6px;">
          <i class="ph-bold ph-lightning"></i> QWEN CODER LIVE BRIDGE
        </div>
        <div class="qwen-bridge-status-card">
          <div class="qwen-bridge-header">
            <span>Sessão do Navegador</span>
            <span style="color:${state.browser.connected ? '#10B981' : '#F59E0B'};">${state.browser.connected ? state.browser.mode.toUpperCase() : 'OFFLINE'}</span>
          </div>
          <div class="qwen-bridge-info">
            <div>URL Ativa: <strong>${this.escapeHTML(state.browser.activeUrl || '—')}</strong></div>
            <div>Qwen Coder: <strong>${state.browser.loggedInQwen ? 'Conectado (Biel0071)' : 'Aguardando Login'}</strong></div>
            <div>GitHub: <strong>${state.browser.loggedInGithub ? 'Conectado' : 'Aguardando Login'}</strong></div>
          </div>
          <button type="button" class="qwen-bridge-btn" id="btnIdeConnectBrowser">
            <i class="ph-bold ph-browser"></i> Conectar Chrome CDP (:9222)
          </button>
        </div>

        <div style="font-size:10px; font-weight:800; color:#94A3B8; text-transform:uppercase; margin-top:8px;">Ação em Andamento</div>
        <div style="background:#050810; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; font-size:11px; font-family:var(--fenix-font-mono);">
          <div style="color:#64748B; font-size:10px;">ÚLTIMA AÇÃO:</div>
          <div style="color:#CBD5E1; margin-top:2px;">${this.escapeHTML(state.browser.lastAction || '—')}</div>
        </div>

        <div style="margin-top:auto; display:flex; flex-direction:column; gap:6px;">
          <button type="button" class="qwen-bridge-btn" onclick="window.fenixQwenOrchestrator?.executeNext()" style="background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.3); color:#34D399;">
            <i class="ph-bold ph-play"></i> Despachar Próxima Ação
          </button>
        </div>
      `;

      pane.querySelector('#btnIdeConnectBrowser')?.addEventListener('click', () => {
        this.connectBrowser('http://127.0.0.1:9222');
      });
    },

    escapeHTML(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  // Exportação Global
  window.fenixQwenOrchestrator = FenixQwenOrchestrator;

  // Auto-inicialização quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FenixQwenOrchestrator.init());
  } else {
    FenixQwenOrchestrator.init();
  }
})();
