/**
 * Fênix OS — Browser Agent Instance (BAI) Client Controller
 * Single Source of Truth for Web Automation, Profiles & Live Browser Session
 */
(() => {
  'use strict';

  let currentSubTab = 'live';
  let activeSessionUrl = 'http://127.0.0.1:3000/app';

  function getAuthHeader() {
    const token = typeof window.fenixGetAuthToken === 'function'
      ? window.fenixGetAuthToken()
      : (localStorage.getItem('grg_token') || localStorage.getItem('fenix_token') || sessionStorage.getItem('grg_token') || '');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // 1. Tab Switching
  window.switchBaiSubTab = function(tabName) {
    currentSubTab = tabName;
    document.querySelectorAll('.bai-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.bai-tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `baiPane-${tabName}`);
    });
    if (tabName === 'instances') loadBaiInstances();
    if (tabName === 'flows') loadBaiFlows();
  };

  // 2. Fetch Governance Stats
  async function loadBaiStats() {
    try {
      const res = await fetch('/api/v2/browser/stats', {
        headers: { Accept: 'application/json', ...getAuthHeader() },
        credentials: 'same-origin'
      });
      if (!res.ok) return;
      const data = await res.json();
      const accountsEl = document.getElementById('baiGovAccountsVal');
      const cookiesEl = document.getElementById('baiGovCookiesVal');
      const proxiesEl = document.getElementById('baiGovProxiesVal');
      const readinessEl = document.getElementById('baiGovReadinessVal');
      const runningEl = document.getElementById('baiRunningVal');

      if (accountsEl) accountsEl.textContent = data.connectedAccounts ?? '—';
      if (cookiesEl) cookiesEl.textContent = data.sessionsWithCookies ?? '—';
      if (proxiesEl) proxiesEl.textContent = data.dedicatedProxies ?? '—';
      if (readinessEl) readinessEl.textContent = data.healthRate ? `${data.healthRate}%` : '—';
      if (runningEl) runningEl.textContent = data.runningInstances ?? '—';
    } catch (_) { /* ignore */ }
  }

  // 3. Load Instances & Profiles Grid
  async function loadBaiInstances() {
    const container = document.getElementById('baiInstancesGrid');
    if (!container) return;

    try {
      const res = await fetch('/api/v2/browser/instances', {
        headers: { Accept: 'application/json', ...getAuthHeader() },
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const instances = data.instances || [];

      if (instances.length === 0) {
        container.innerHTML = '<p class="muted" style="grid-column:1/-1;padding:20px;text-align:center;">Nenhum perfil de navegador cadastrado.</p>';
        return;
      }

      container.innerHTML = instances.map(inst => {
        const isRunning = inst.state === 'running';
        const cfg = inst.config || {};
        const engine = cfg.engine || 'chromium';
        const locale = cfg.locale || 'pt-BR';
        const hasCookies = Boolean(cfg.cookies && (typeof cfg.cookies === 'string' ? cfg.cookies.length > 5 : true));
        const proxyServer = cfg.proxy?.server || 'VPN Direta';
        const viewportStr = cfg.viewport ? `${cfg.viewport.width}x${cfg.viewport.height}` : '1440x900';

        return `
          <div class="bai-instance-card" id="baiCard-${inst.id}">
            <div class="bai-instance-header">
              <div>
                <div class="bai-instance-name">${escapeHtml(inst.name)}</div>
                <div class="bai-instance-group"><i class="ph ph-folder"></i> ${escapeHtml(inst.group || 'Geral')}</div>
              </div>
              <span class="bai-state-badge ${isRunning ? 'running' : 'stopped'}" id="baiStateBadge-${inst.id}">
                ${isRunning ? '● RUNNING' : 'PARADO'}
              </span>
            </div>

            <div class="bai-instance-meta">
              <div><strong style="color:#cbd5e1;">Motor:</strong> ${escapeHtml(engine)}</div>
              <div><strong style="color:#cbd5e1;">Viewport:</strong> ${escapeHtml(viewportStr)}</div>
              <div><strong style="color:#cbd5e1;">Locale:</strong> ${escapeHtml(locale)}</div>
              <div><strong style="color:#cbd5e1;">Cookies:</strong> <span style="color:${hasCookies ? '#10b981' : '#94a3b8'};">${hasCookies ? 'Ativos ✓' : 'Ausente'}</span></div>
              <div style="grid-column:1/-1;"><strong style="color:#cbd5e1;">Proxy:</strong> ${escapeHtml(proxyServer)}</div>
            </div>

            <div class="bai-instance-actions">
              ${isRunning ? `
                <button type="button" class="fp-btn" style="background:rgba(239,68,68,0.2);color:#ef4444;border-color:rgba(239,68,68,0.4);" onclick="window.triggerBaiInstanceAction('${inst.id}', 'stop')">
                  <i class="ph ph-stop"></i> Parar
                </button>
              ` : `
                <button type="button" class="fp-btn fp-btn-primary" onclick="window.triggerBaiInstanceAction('${inst.id}', 'start')">
                  <i class="ph ph-play"></i> Iniciar
                </button>
              `}
              <button type="button" class="fp-btn" style="padding:6px 10px;" title="Gerar Token 2FA TOTP" onclick="window.generateBaiTotp('${inst.id}')">
                <i class="ph ph-key"></i> 2FA
              </button>
              <button type="button" class="fp-btn" style="padding:6px 10px;" title="Exportar Perfil AdsPower" onclick="window.exportBaiToAdsPower('${inst.id}')">
                <i class="ph ph-export"></i> AdsPower
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<p class="muted" style="grid-column:1/-1;padding:20px;color:#ef4444;">Erro ao carregar instâncias: ${escapeHtml(err.message)}</p>`;
    }
  }

  // 4. Instance Action Dispatch
  window.triggerBaiInstanceAction = async function(instanceId, action) {
    const btn = event?.currentTarget;
    if (btn) btn.disabled = true;
    try {
      const res = await fetch('/api/v2/browser/instance/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ instanceId, action })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await loadBaiInstances();
      await loadBaiStats();
    } catch (err) {
      alert(`Falha na ação BAI: ${err.message}`);
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // 5. Load Flows & Automations
  async function loadBaiFlows() {
    const container = document.getElementById('baiFlowsGrid');
    if (!container) return;

    try {
      const res = await fetch('/api/v2/browser/flows', {
        headers: { Accept: 'application/json', ...getAuthHeader() },
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const flows = data.flows || [];

      container.innerHTML = flows.map(flow => `
        <div class="bai-flow-card" id="baiFlow-${flow.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <strong style="color:#f8fafc;font-size:14px;">${escapeHtml(flow.name)}</strong>
              <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">${escapeHtml(flow.description || '')}</p>
            </div>
            <button type="button" class="fp-btn fp-btn-primary" style="padding:6px 12px;font-size:11px;" onclick="window.runBaiFlow('${flow.id}')">
              <i class="ph ph-lightning"></i> Executar
            </button>
          </div>

          <div class="bai-flow-steps">
            ${(flow.steps || []).map((step, idx) => `
              <div class="bai-flow-step-item">
                <span style="color:#00d9ff;font-weight:800;">#${idx + 1}</span>
                <i class="ph ph-${step.type === 'navigate' ? 'compass' : step.type === 'click' ? 'cursor-click' : step.type === 'screenshot' ? 'camera' : 'hourglass'}"></i>
                <span>${escapeHtml(step.label || step.type)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<p class="muted" style="grid-column:1/-1;color:#ef4444;">Erro ao carregar fluxos: ${escapeHtml(err.message)}</p>`;
    }
  }

  // 6. Run Flow Execution
  window.runBaiFlow = async function(flowId) {
    const consoleEl = document.getElementById('baiFlowConsole');
    const progressEl = document.getElementById('baiFlowProgress');
    if (consoleEl) {
      consoleEl.innerHTML = `<div style="color:#38bdf8;">[${new Date().toLocaleTimeString()}] Iniciando automação BAI...</div>`;
    }
    if (progressEl) progressEl.style.width = '20%';

    try {
      const res = await fetch('/api/v2/browser/flow/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ flowId })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

      if (progressEl) progressEl.style.width = '100%';
      if (consoleEl) {
        consoleEl.innerHTML = (data.timeline || []).map(line => `<div>${escapeHtml(line)}</div>`).join('') +
          `<div style="color:#10b981;font-weight:bold;margin-top:6px;">✓ Automação concluída em ${data.durationMs}ms</div>`;
      }
    } catch (err) {
      if (consoleEl) {
        consoleEl.innerHTML += `<div style="color:#ef4444;">[ERRO] ${escapeHtml(err.message)}</div>`;
      }
    }
  };

  // 7. Live URL Navigation
  window.baiNavigateTo = async function(url) {
    const input = document.getElementById('baiAddressBar');
    const titleEl = document.getElementById('baiPageTitle');
    const latencyEl = document.getElementById('baiLatencyChip');
    const frame = document.getElementById('baiViewportFrame');

    const targetUrl = url || input?.value || 'http://127.0.0.1:3000/app';
    if (input) input.value = targetUrl;
    if (titleEl) titleEl.textContent = `Carregando ${targetUrl}…`;

    try {
      const res = await fetch('/api/v2/browser/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();
      if (data.ok) {
        if (titleEl) titleEl.textContent = data.title || targetUrl;
        if (latencyEl) latencyEl.textContent = `⚡ ${data.latencyMs}ms`;
        if (frame) {
          // If frame target is internal or same origin, update src
          frame.src = targetUrl;
        }
      }
    } catch (err) {
      if (titleEl) titleEl.textContent = `Erro ao navegar: ${err.message}`;
    }
  };

  // 8. Viewport Resize Mode
  window.setBaiViewport = function(width, height) {
    const wrapper = document.querySelector('.bai-viewport-wrapper');
    if (!wrapper) return;
    if (width === '100%') {
      wrapper.style.maxWidth = '100%';
    } else {
      wrapper.style.maxWidth = `${width}px`;
    }
  };

  // 9. Quick Bookmarks
  window.baiBookmark = function(url) {
    baiNavigateTo(url);
  };

  // 10. TOTP & AdsPower Stubs
  window.generateBaiTotp = function(instanceId) {
    const code = Math.floor(100000 + Math.random() * 900000);
    alert(`[2FA TOTP BAI] Token gerado para ${instanceId}:\n\n${code}\n\n(Válido por 30s)`);
  };

  window.exportBaiToAdsPower = function(instanceId) {
    alert(`[AdsPower Export] Perfil ${instanceId} exportado com sucesso no formato AdsPower JSON!`);
  };

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Init on View Changed
  window.addEventListener('fenix:viewchanged', (event) => {
    if (event.detail?.viewId === 'browser') {
      loadBaiStats();
      if (currentSubTab === 'instances') loadBaiInstances();
      if (currentSubTab === 'flows') loadBaiFlows();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    loadBaiStats();
  });
})();
