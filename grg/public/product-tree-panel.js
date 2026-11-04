'use strict';

/**
 * FÊNIX OS — Product Tree Panel & Deep Application Generation Frontend
 * =========================================================================
 * Single Source of Truth interactive component for:
 * 1. Recursive Product Tree Explorer (unlimited depth)
 * 2. Page Completeness Engine Inspector (11 axes)
 * 3. Interaction Completeness Matrix (15 types, zero decorative buttons)
 * 4. Navigation Crawler & Route Reachability
 * 5. Overnight Autonomous Development Factory Controller
 */

(function() {
  const state = {
    projectId: 'prj.ai_engine_core',
    activeTab: 'tree', // 'tree' | 'page_audit' | 'interactions' | 'night_run'
    tree: null,
    audit: null,
    factoryStatus: null,
    selectedNode: null,
    loading: false
  };

  function getAuthHeader() {
    const token = window.localStorage?.getItem('grg_token') ||
                  window.localStorage?.getItem('fenix_token') ||
                  window.sessionStorage?.getItem('grg_token') ||
                  (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] || '';
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {})
    };
    const res = await fetch(endpoint, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function loadAllData() {
    state.loading = true;
    updatePulseMetrics();
    try {
      const [treeRes, auditRes, factoryRes] = await Promise.all([
        apiFetch(`/api/v2/product-builder/tree?projectId=${encodeURIComponent(state.projectId)}`).catch(() => ({ tree: null })),
        apiFetch(`/api/v2/product-builder/completeness?projectId=${encodeURIComponent(state.projectId)}`).catch(() => ({ audit: null })),
        apiFetch('/api/v2/factory/status').catch(() => ({ overnightRunning: false, telemetry: {} }))
      ]);

      state.tree = treeRes?.tree || null;
      state.audit = auditRes?.audit || null;
      state.factoryStatus = factoryRes || null;
    } catch (e) {
      console.warn('[ProductTreePanel] Error loading data:', e.message);
    } finally {
      state.loading = false;
      render();
    }
  }

  function updatePulseMetrics() {
    const root = document.getElementById('fenixProductTreeContainer');
    if (!root) return;

    const elTreeDepth = root.querySelector('#ptMetricDepth');
    const elModules = root.querySelector('#ptMetricModules');
    const elPages = root.querySelector('#ptMetricPages');
    const elPageScore = root.querySelector('#ptMetricPageScore');
    const elInteractionScore = root.querySelector('#ptMetricInteractionScore');
    const elFactoryStatus = root.querySelector('#ptMetricFactoryStatus');

    if (state.loading && !state.tree) {
      if (elTreeDepth) elTreeDepth.textContent = '—';
      if (elModules) elModules.textContent = '—';
      if (elPages) elPages.textContent = '—';
      if (elPageScore) elPageScore.textContent = '—';
      if (elInteractionScore) elInteractionScore.textContent = '—';
      if (elFactoryStatus) elFactoryStatus.textContent = '—';
      return;
    }

    if (elTreeDepth && state.tree) elTreeDepth.textContent = state.tree.metadata?.depth || '4';
    if (elModules && state.tree) elModules.textContent = state.tree.modules?.length || '0';
    if (elPages && state.audit) elPages.textContent = state.audit.totalPages || '0';
    if (elPageScore && state.audit) elPageScore.textContent = `${state.audit.pageCompletenessScore}%`;
    if (elInteractionScore && state.audit) elInteractionScore.textContent = `${state.audit.interactionCompletenessScore}%`;
    if (elFactoryStatus) {
      const isRunning = state.factoryStatus?.overnightRunning;
      elFactoryStatus.textContent = isRunning ? 'ATIVO (24/7)' : 'EM ESPERA';
      elFactoryStatus.className = `fenix-pt-metric-value ${isRunning ? 'green' : 'orange'}`;
    }
  }

  function renderTreeNodes(nodes, container, level = 0) {
    if (!Array.isArray(nodes)) return;

    for (const node of nodes) {
      const nodeWrapper = document.createElement('div');
      nodeWrapper.className = `fenix-pt-node ${level === 0 ? 'fenix-pt-node-root' : ''}`;

      const item = document.createElement('div');
      item.className = `fenix-pt-node-item ${state.selectedNode?.id === node.id ? 'selected' : ''}`;
      
      const typeTag = node.type ? `<span class="fenix-pt-node-type-tag tag-${node.type}">${node.type}</span>` : '';
      const name = node.name || node.title || node.id;
      
      item.innerHTML = `
        <div class="fenix-pt-node-label">
          <i class="ph-bold ${getNodeIcon(node.type)}"></i>
          <span>${escapeHtml(name)}</span>
          ${typeTag}
        </div>
        <div style="font-size:11px; color:#64748b;">
          ${node.route ? `<code style="background:rgba(255,255,255,0.05); padding:2px 4px; border-radius:4px;">${escapeHtml(node.route)}</code>` : ''}
        </div>
      `;

      item.onclick = () => {
        state.selectedNode = node;
        renderDetailPanel();
        const allItems = container.querySelectorAll('.fenix-pt-node-item');
        allItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
      };

      nodeWrapper.appendChild(item);

      // Render children recursively
      const children = [
        ...(node.pages || []),
        ...(node.subpages || []),
        ...(node.tabs || []),
        ...(node.forms || []),
        ...(node.modals || []),
        ...(node.components || []),
        ...(node.actions || []),
        ...(node.operations || []),
        ...(node.businessRules || []),
        ...(node.permissions || [])
      ];

      if (children.length > 0) {
        const childContainer = document.createElement('div');
        renderTreeNodes(children, childContainer, level + 1);
        nodeWrapper.appendChild(childContainer);
      }

      container.appendChild(nodeWrapper);
    }
  }

  function getNodeIcon(type) {
    switch (type) {
      case 'product': return 'ph-package';
      case 'module': return 'ph-cube';
      case 'page': return 'ph-file-text';
      case 'subpage': return 'ph-git-commit';
      case 'tab': return 'ph-tabs';
      case 'form': return 'ph-textbox';
      case 'modal': return 'ph-browsers';
      case 'component': return 'ph-puzzle-piece';
      case 'action': return 'ph-lightning';
      case 'operation': return 'ph-gear';
      case 'business_rule': return 'ph-shield-check';
      case 'permission': return 'ph-key';
      default: return 'ph-circle';
    }
  }

  function renderDetailPanel() {
    const root = document.getElementById('fenixProductTreeContainer');
    if (!root) return;
    const detailCol = root.querySelector('#ptDetailCol');
    if (!detailCol) return;

    const node = state.selectedNode;
    if (!node) {
      detailCol.innerHTML = `
        <div style="padding:24px 12px; color:#64748b; text-align:center;">
          <i class="ph-bold ph-cursor-click" style="font-size:32px; color:#334155; margin-bottom:12px; display:block;"></i>
          Selecione um nó da árvore hierárquica para inspecionar seus requisitos, contratos e eixos de completude.
        </div>
      `;
      return;
    }

    let axesHtml = '';
    if (node.type === 'page' || node.type === 'subpage') {
      const pageAudit = state.audit?.pageAudits?.find(a => a.pageId === node.id);
      if (pageAudit && pageAudit.axes) {
        axesHtml = `
          <div style="margin-top:16px;">
            <div style="font-size:12px; font-weight:700; color:#f8fafc; margin-bottom:8px; display:flex; justify-content:space-between;">
              <span>11 EIXOS DE COMPLETUDE</span>
              <span style="color:#00d9ff;">${pageAudit.score}%</span>
            </div>
            ${Object.values(pageAudit.axes).map(ax => `
              <div class="fenix-pt-axis-card ${ax.passed ? 'passed' : 'failed'}">
                <i class="ph-bold ${ax.passed ? 'ph-check-circle' : 'ph-x-circle'}" style="color:${ax.passed ? '#10b981' : '#ef4444'}; font-size:16px; margin-top:2px;"></i>
                <div>
                  <div class="fenix-pt-axis-title">${escapeHtml(ax.label)}</div>
                  <div class="fenix-pt-axis-desc">${escapeHtml(ax.reason)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    detailCol.innerHTML = `
      <div style="border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:12px; margin-bottom:16px;">
        <span class="fenix-pt-node-type-tag tag-${node.type || 'page'}">${node.type || 'NÓ'}</span>
        <h3 style="font-size:16px; font-weight:800; color:#f8fafc; margin:8px 0 4px 0;">${escapeHtml(node.name || node.title || node.id)}</h3>
        <p style="font-size:12px; color:#94a3b8; margin:0;">${escapeHtml(node.objective || node.description || 'Sem descrição específica.')}</p>
      </div>

      ${node.route ? `
        <div style="margin-bottom:12px;">
          <span style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase;">ROTA CANÔNICA</span>
          <div style="font-size:12px; font-family:monospace; color:#00d9ff; margin-top:2px;">${escapeHtml(node.route)}</div>
        </div>
      ` : ''}

      ${axesHtml}

      <div style="margin-top:20px;">
        <button class="fenix-pt-btn fenix-pt-btn-primary" style="width:100%; justify-content:center;" onclick="window.FenixProductTreePanel.auditSelectedNode()">
          <i class="ph-bold ph-shield-check"></i> Reauditar Eixos Deste Nó
        </button>
      </div>
    `;
  }

  function renderInteractionsTab(container) {
    const audits = state.audit?.interactionAudits || [];
    let totalElements = 0;
    let functionalElements = 0;
    const allItems = [];

    for (const a of audits) {
      if (a.audit && Array.isArray(a.audit.elements)) {
        totalElements += a.audit.total || 0;
        functionalElements += a.audit.functional || 0;
        for (const el of a.audit.elements) {
          allItems.push({ ...el, pageId: a.pageId });
        }
      }
    }

    container.innerHTML = `
      <div style="padding:20px; overflow-y:auto; height:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:12px;">
          <div>
            <h3 style="margin:0; font-size:16px; color:#f8fafc; font-weight:800;">AUDITORIA DE ELEMENTOS INTERATIVOS</h3>
            <p style="margin:4px 0 0 0; font-size:12px; color:#94a3b8;">Enforcement estrito: zero botões decorativos, zero links quebrados, zero formulários que não enviam.</p>
          </div>
          <div style="display:flex; gap:16px; text-align:right;">
            <div>
              <div style="font-size:10px; color:#64748b; font-weight:700;">TOTAL DE ELEMENTOS</div>
              <div style="font-size:18px; font-weight:800; color:#00d9ff;">${totalElements}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; font-weight:700;">FUNCIONAIS (CERTIFICADOS)</div>
              <div style="font-size:18px; font-weight:800; color:#10b981;">${functionalElements}</div>
            </div>
          </div>
        </div>

        <div style="background:#070b13; border:1px solid rgba(255,255,255,0.06); border-radius:8px; overflow:hidden;">
          <div style="display:flex; padding:8px 12px; background:#0B1018; font-size:11px; font-weight:700; color:#64748b; border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="width:140px;">TIPO</div>
            <div style="flex:1;">LABEL / ELEMENTO</div>
            <div style="flex:1;">CONTRATO / DESTINO</div>
            <div style="width:140px; text-align:right;">STATUS</div>
          </div>
          ${allItems.map(item => `
            <div class="fenix-pt-interaction-row">
              <div style="width:140px;"><span class="fenix-pt-node-type-tag tag-${item.type}">${item.type}</span></div>
              <div style="flex:1; font-weight:600; color:#f8fafc;">${escapeHtml(item.label || item.id)}</div>
              <div style="flex:1; color:#94a3b8; font-family:monospace; font-size:11px;">${escapeHtml(item.boundContract || '—')}</div>
              <div style="width:140px; text-align:right;">
                <span class="${item.status === 'CERTIFIED_FUNCTIONAL' ? 'badge-functional' : 'badge-defective'}">
                  ${item.status === 'CERTIFIED_FUNCTIONAL' ? 'CERTIFICADO' : 'VIOLAÇÃO'}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderNightRunTab(container) {
    const fs = state.factoryStatus || {};
    const tel = fs.telemetry || {};
    const isRunning = fs.overnightRunning;

    container.innerHTML = `
      <div style="padding:20px; overflow-y:auto; height:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:14px;">
          <div>
            <h3 style="margin:0; font-size:16px; color:#f8fafc; font-weight:800;">AUTONOMOUS DEVELOPMENT FACTORY (OVERNIGHT RUNTIME)</h3>
            <p style="margin:4px 0 0 0; font-size:12px; color:#94a3b8;">Motor de processamento autônomo desconectado 24/7 com proteção de watchdog e recuperação de falhas.</p>
          </div>
          <div style="display:flex; gap:10px;">
            ${isRunning ? `
              <button class="fenix-pt-btn fenix-pt-btn-danger" onclick="window.FenixProductTreePanel.stopNightRun()">
                <i class="ph-bold ph-stop"></i> Pausar Operação Noturna
              </button>
            ` : `
              <button class="fenix-pt-btn fenix-pt-btn-success" onclick="window.FenixProductTreePanel.startNightRun()">
                <i class="ph-bold ph-play"></i> Iniciar Operação Noturna (24/7)
              </button>
            `}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
          <div style="background:#070b13; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:16px;">
            <div style="font-size:11px; color:#64748b; font-weight:700;">STATUS DO RUNTIME</div>
            <div style="font-size:18px; font-weight:800; margin-top:4px;" class="${isRunning ? 'text-green' : 'text-orange'}">
              ${isRunning ? 'ATIVO & DESCONECTADO' : 'EM ESPERA'}
            </div>
          </div>
          <div style="background:#070b13; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:16px;">
            <div style="font-size:11px; color:#64748b; font-weight:700;">MISSÕES EXECUTADAS</div>
            <div style="font-size:18px; font-weight:800; color:#00d9ff; margin-top:4px;">
              ${tel.successfulMissions ?? '—'}
            </div>
          </div>
          <div style="background:#070b13; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:16px;">
            <div style="font-size:11px; color:#64748b; font-weight:700;">PATCHES APLICADOS</div>
            <div style="font-size:18px; font-weight:800; color:#10b981; margin-top:4px;">
              ${tel.patchesApplied ?? '—'}
            </div>
          </div>
          <div style="background:#070b13; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:16px;">
            <div style="font-size:11px; color:#64748b; font-weight:700;">RECUPERAÇÕES DE WATCHDOG</div>
            <div style="font-size:18px; font-weight:800; color:#f59e0b; margin-top:4px;">
              ${tel.crashRecoveries ?? '0'}
            </div>
          </div>
        </div>

        <h4 style="font-size:14px; font-weight:800; color:#f8fafc; margin-bottom:10px;">HISTÓRICO RECENTE DE PATCHES ISOLADOS</h4>
        <div style="background:#070b13; border:1px solid rgba(255,255,255,0.06); border-radius:8px; overflow:hidden;">
          ${(fs.recentPatches || []).length > 0 ? fs.recentPatches.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px;">
              <span style="font-family:monospace; color:#00d9ff;">${escapeHtml(p.patchId)}</span>
              <span style="color:#f8fafc;">${escapeHtml(p.targetFile)}</span>
              <span style="font-size:10px; color:#64748b;">${escapeHtml(p.status)}</span>
            </div>
          `).join('') : `
            <div style="padding:16px; color:#64748b; text-align:center;">Nenhum patch registrado recentemente.</div>
          `}
        </div>
      </div>
    `;
  }

  function render() {
    const root = document.getElementById('fenixProductTreeContainer');
    if (!root) return;

    updatePulseMetrics();

    const bodyCol = root.querySelector('#ptBodyContent');
    if (!bodyCol) return;

    if (state.activeTab === 'tree') {
      bodyCol.innerHTML = `
        <div class="fenix-pt-body">
          <div class="fenix-pt-tree-col" id="ptTreeCol"></div>
          <div class="fenix-pt-detail-col" id="ptDetailCol"></div>
        </div>
      `;
      const treeCol = bodyCol.querySelector('#ptTreeCol');
      if (treeCol && state.tree) {
        renderTreeNodes(state.tree.modules || [], treeCol);
      }
      renderDetailPanel();
    } else if (state.activeTab === 'interactions') {
      renderInteractionsTab(bodyCol);
    } else if (state.activeTab === 'night_run') {
      renderNightRunTab(bodyCol);
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Public Interface
  window.FenixProductTreePanel = {
    init: function() {
      const root = document.getElementById('fenixProductTreeContainer');
      if (!root) return;

      root.innerHTML = `
        <div class="fenix-pt-container">
          <div class="fenix-pt-header">
            <div class="fenix-pt-title-area">
              <div class="fenix-pt-title">
                <i class="ph-bold ph-tree-structure" style="color:#00d9ff; font-size:18px;"></i>
                FÊNIX OS <span class="accent">&gt;</span> RECURSIVE PRODUCT BUILDER
              </div>
              <div class="fenix-pt-tabs">
                <button type="button" class="fenix-pt-tab-btn active" id="btnTabTree" onclick="window.FenixProductTreePanel.setTab('tree')">
                  <i class="ph-bold ph-tree-structure"></i> Árvore Hierárquica
                </button>
                <button type="button" class="fenix-pt-tab-btn" id="btnTabInteractions" onclick="window.FenixProductTreePanel.setTab('interactions')">
                  <i class="ph-bold ph-cursor-click"></i> Auditoria de Interações
                </button>
                <button type="button" class="fenix-pt-tab-btn" id="btnTabNightRun" onclick="window.FenixProductTreePanel.setTab('night_run')">
                  <i class="ph-bold ph-moon-stars"></i> Fábrica Noturna (24/7)
                </button>
              </div>
            </div>

            <div class="fenix-pt-actions">
              <button type="button" class="fenix-pt-btn" onclick="window.FenixProductTreePanel.refresh()">
                <i class="ph-bold ph-arrows-clockwise"></i> Atualizar
              </button>
              <button type="button" class="fenix-pt-btn fenix-pt-btn-primary" onclick="window.FenixProductTreePanel.certify()">
                <i class="ph-bold ph-certificate"></i> Emitir Certificado
              </button>
            </div>
          </div>

          <!-- Pulse Strip -->
          <div class="fenix-pt-pulse-strip">
            <div class="fenix-pt-metric">
              <span class="fenix-pt-metric-label">PROFUNDIDADE REAL</span>
              <span class="fenix-pt-metric-value cyan" id="ptMetricDepth">—</span>
            </div>
            <div class="fenix-pt-metric">
              <span class="fenix-pt-metric-label">MÓDULOS DEEP</span>
              <span class="fenix-pt-metric-value" id="ptMetricModules">—</span>
            </div>
            <div class="fenix-pt-metric">
              <span class="fenix-pt-metric-label">FOLHAS FUNCIONAIS</span>
              <span class="fenix-pt-metric-value" id="ptMetricPages">—</span>
            </div>
            <div class="fenix-pt-metric">
              <span class="fenix-pt-metric-label">PAGE COMPLETENESS</span>
              <span class="fenix-pt-metric-value green" id="ptMetricPageScore">—</span>
            </div>
            <div class="fenix-pt-metric">
              <span class="fenix-pt-metric-label">INTERAÇÕES CERTIFICADAS</span>
              <span class="fenix-pt-metric-value green" id="ptMetricInteractionScore">—</span>
            </div>
            <div class="fenix-pt-metric" style="margin-left:auto;">
              <span class="fenix-pt-metric-label">FÁBRICA NOTURNA</span>
              <span class="fenix-pt-metric-value orange" id="ptMetricFactoryStatus">—</span>
            </div>
          </div>

          <div id="ptBodyContent" style="flex:1; overflow:hidden; display:flex;">
            <div style="padding:24px; color:#64748b;">Carregando árvore profunda de produtos…</div>
          </div>
        </div>
      `;

      loadAllData();
    },

    setTab: function(tab) {
      state.activeTab = tab;
      const root = document.getElementById('fenixProductTreeContainer');
      if (root) {
        root.querySelectorAll('.fenix-pt-tab-btn').forEach(btn => btn.classList.remove('active'));
        if (tab === 'tree') root.querySelector('#btnTabTree')?.classList.add('active');
        if (tab === 'interactions') root.querySelector('#btnTabInteractions')?.classList.add('active');
        if (tab === 'night_run') root.querySelector('#btnTabNightRun')?.classList.add('active');
      }
      render();
    },

    refresh: function() {
      loadAllData();
    },

    showNotification: function(message, type = 'info') {
      const root = document.getElementById('fenixProductTreeContainer');
      if (!root) return;
      let toast = root.querySelector('#fenixPtToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'fenixPtToast';
        toast.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:99999; padding:12px 18px; border-radius:8px; font-size:12px; font-weight:600; display:flex; align-items:center; gap:8px; box-shadow:0 8px 24px rgba(0,0,0,0.6); transition:all 0.25s ease;';
        root.appendChild(toast);
      }
      const bg = type === 'success' ? '#064e3b' : type === 'error' ? '#7f1d1d' : '#0e3a5a';
      const border = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#00d9ff';
      const color = type === 'success' ? '#6ee7b7' : type === 'error' ? '#fca5a5' : '#7dd3fc';
      const icon = type === 'success' ? 'ph-check-circle' : type === 'error' ? 'ph-warning-circle' : 'ph-info';
      toast.style.background = bg;
      toast.style.border = `1px solid ${border}`;
      toast.style.color = color;
      toast.innerHTML = `<i class="ph-bold ${icon}" style="font-size:16px;"></i> <span>${escapeHtml(message)}</span>`;
      toast.style.opacity = '1';
      toast.style.pointerEvents = 'auto';

      clearTimeout(window.__fenixPtToastTimer);
      window.__fenixPtToastTimer = setTimeout(() => {
        if (toast) toast.style.opacity = '0';
      }, 3500);
    },

    certify: async function() {
      try {
        const res = await apiFetch('/api/v2/product-builder/certify', {
          method: 'POST',
          body: JSON.stringify({ projectId: state.projectId })
        });
        this.showNotification(`Certificado emitido: ${res.certificate?.certificateId}`, 'success');
        loadAllData();
      } catch (e) {
        this.showNotification(`Erro ao emitir certificado: ${e.message}`, 'error');
      }
    },

    startNightRun: async function() {
      try {
        await apiFetch('/api/v2/factory/night-run/start', { method: 'POST', body: JSON.stringify({}) });
        this.showNotification('Operação noturna desconectada iniciada com sucesso.', 'success');
        loadAllData();
      } catch (e) {
        this.showNotification(`Erro ao iniciar operação noturna: ${e.message}`, 'error');
      }
    },

    stopNightRun: async function() {
      try {
        await apiFetch('/api/v2/factory/night-run/stop', { method: 'POST', body: JSON.stringify({}) });
        this.showNotification('Operação noturna pausada.', 'info');
        loadAllData();
      } catch (e) {
        this.showNotification(`Erro ao parar operação noturna: ${e.message}`, 'error');
      }
    },

    auditSelectedNode: async function() {
      if (!state.selectedNode) return;
      try {
        await apiFetch('/api/v2/product-builder/audit-page', {
          method: 'POST',
          body: JSON.stringify({ page: state.selectedNode })
        });
        this.showNotification('Nó auditado com sucesso.', 'success');
        loadAllData();
      } catch (e) {
        this.showNotification(`Erro ao auditar nó: ${e.message}`, 'error');
      }
    }
  };

  // Auto-init when DOM ready or container becomes available
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('fenixProductTreeContainer')) {
        window.FenixProductTreePanel.init();
      }
    });
  } else {
    if (document.getElementById('fenixProductTreeContainer')) {
      window.FenixProductTreePanel.init();
    }
  }
})();
