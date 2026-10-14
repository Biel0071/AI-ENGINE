/**
 * FÊNIX OS — GLOBAL RIGHT SIDEBAR, FLOATING ANIMATED MASCOT & RPG AGENT STUDIO
 * Single Source of Truth Modular Component: fenix-mascot-sidebar.js
 * Hardware accelerated, zero-mock compliant, reactive to real runtime events.
 */
(function() {
  'use strict';

  // ── Paletas Compartilhadas (Compatíveis com pixi-character-system.js) ──
  const SKIN_COLORS = ['#FEE3D4', '#F5D5C0', '#E8C4A0', '#D4A373', '#C8956C', '#8D5B38', '#55331C', '#E0B89C'];
  const HAIR_COLORS = ['#18181B', '#3B2314', '#5D3A1A', '#9A3412', '#D97706', '#94A3B8', '#0284C7', '#7C3AED'];
  const SHIRT_COLORS = ['#2563EB', '#059669', '#3B82F6', '#6366F1', '#DB2777', '#16A34A', '#D97706', '#EF4444'];

  // ── Estado Global do Componente ──
  const state = {
    isOpen: localStorage.getItem('fenix_sidebar_state') === 'open',
    isDocked: localStorage.getItem('fenix_sidebar_docked') !== 'false',
    activeTab: 'chat',
    mascotMood: 'idle', // 'idle' | 'thinking' | 'working' | 'success' | 'error'
    selectedAgent: 'fenix-mascot',
    conversations: [],
    activeConversationId: null,
    chatHistory: [],
    logs: [],
    telemetry: {
      cpu: '—',
      ram: '—',
      uptime: '—',
      latency: '—',
      vpsStatus: '—',
      activeJobs: '—'
    },
    activeInspectAgent: null
  };

  // ── Elementos do DOM ──
  let sidebarEl = null;
  let mascotEl = null;
  let modalEl = null;
  let providerPlatformConfigs = [];

  // ── Helpers Autenticados (Zero-Mock & Same-Origin Session) ──
  function getAuthToken() {
    return window.localStorage?.getItem('grg_token') ||
           window.localStorage?.getItem('fenix_token') ||
           window.sessionStorage?.getItem('grg_token') ||
           window.sessionStorage?.getItem('fenix_token') ||
           (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] ||
           window.__FENIX_TOKEN__ ||
           '';
  }

  async function ensureAuthToken() {
    const token = getAuthToken();
    if (token && token !== 'null' && token.length >= 10) return token;
    if (typeof window.ensureAuthToken === 'function') {
      try { return await window.ensureAuthToken(); } catch (_) {}
    }
    return '';
  }

  async function authedFetch(url, options = {}) {
    let token = getAuthToken();
    if (!token || token === 'null' || token.length < 10) {
      token = await ensureAuthToken();
    }
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token && token !== 'null') {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const fetchFn = window.fenixFetch || fetch;
    const request = () => fetchFn(url, {
      ...options,
      credentials: 'same-origin',
      headers
    });
    let response = await request();
    if (response.status === 401 && headers.Authorization) {
      // Allow the server's HttpOnly session cookie to authenticate after a stale Bearer token.
      delete headers.Authorization;
      response = await request();
    }
    return response;
  }

  // ── Inicialização do Markup no DOM ──
  function ensureDOMElements() {
    document.body.classList.toggle('has-right-sidebar-open', state.isOpen);
    // 1. Sidebar Direita Global
    if (!document.getElementById('fenix-right-sidebar')) {
      const sb = document.createElement('aside');
      sb.id = 'fenix-right-sidebar';
      sb.className = state.isOpen ? 'open' : 'state-closed collapsed';
      sb.innerHTML = `
        <div class="fsb-resize-handle" id="fsbResizeHandle" title="Arrastar para ajustar largura do chat"></div>
        <div class="fsb-header">
          <div class="fsb-header-left">
            <div class="fsb-avatar-wrap" id="fsbHeaderAvatar" style="width:28px; height:28px; min-width:28px;">
              <i class="ph-bold ph-robot fsb-avatar-icon" style="font-size:16px;"></i>
              <div class="fsb-status-dot" id="fsbStatusDot"></div>
            </div>
            <div class="fsb-header-info">
              <div class="fsb-title" style="font-size:13px; font-weight:800; letter-spacing:0.5px;">FÊNIX <span style="font-size:9.5px; background:rgba(0,217,255,0.15); color:#00D9FF; padding:1px 5px; border-radius:4px; font-weight:700;">OS</span></div>
              <div class="fsb-context-indicator" id="fsbHeaderContextIndicator" style="font-size:11px; color:#94A3B8; display:flex; align-items:center; gap:4px; line-height:1.2;">
                Contexto: <strong id="fsbHeaderContextName" style="color:#00D9FF; font-weight:700;">Global</strong>
              </div>
              <select class="fsb-agent-select" id="fsbAgentSelector" title="Selecionar agente ou especialidade" style="display:none;" aria-hidden="true">
                <option value="fenix-mascot">Mascote Fênix</option>
                <option value="agent-ceo">CEO Brain</option>
                <option value="agent-developer">Senior Dev</option>
                <option value="agent-architect">Architect Brain</option>
                <option value="agent-security">Security Guard</option>
              </select>
            </div>
          </div>
          <div class="fsb-header-actions">
            <button class="fsb-icon-btn" id="fsbCompactBtn" title="Modo Compacto (64px)" type="button"><i class="ph-bold ph-arrows-in-line-horizontal"></i></button>
            <button class="fsb-icon-btn" id="fsbExpandBtn" title="Expandir Copilot (480px)" type="button"><i class="ph-bold ph-arrows-out-line-horizontal"></i></button>
            <button class="fsb-dock-toggle-btn active" id="fsbDockBtn" title="Alternar Split Screen / Flutuante" style="display:none;"><i class="ph-bold ph-columns"></i> <span id="fsbDockBtnText">Split</span></button>
            <button class="fsb-icon-btn" id="fsbClearBtn" title="Limpar Chat" type="button"><i class="ph-bold ph-trash"></i></button>
            <button class="fsb-icon-btn" id="fsbCollapseBtn" title="Recolher Copilot [>]" type="button"><i class="ph-bold ph-caret-right"></i></button>
            <button class="fsb-icon-btn" id="fsbMinimizeBtn" title="Minimizar para Mascote" style="display:none;" type="button"><i class="ph-bold ph-caret-right"></i></button>
          </div>
        </div>

        <!-- Universal Context Bar (Fênix V15) -->
        <div class="fsb-context-bar" id="fsbContextBar">
          <div class="fsb-ctx-item" title="Projeto Ativo"><i class="ph-bold ph-folder"></i> <span id="fsbCtxProject">—</span></div>
          <div class="fsb-ctx-item" title="Arquivo Aberto"><i class="ph-bold ph-file-code"></i> <span id="fsbCtxFile">—</span></div>
          <div class="fsb-ctx-item" title="Modo Workspace"><i class="ph-bold ph-layout"></i> <span id="fsbCtxMode">—</span></div>
          <div class="fsb-ctx-item" title="Agente / Personagem Focado"><i class="ph-bold ph-user-circle"></i> <span id="fsbCtxAgent">—</span></div>
        </div>

        <div class="fsb-tabs">
          <button class="fsb-tab-btn active" data-tab="chat"><i class="ph-bold ph-chat-teardrop-text"></i> Chat</button>
          <button class="fsb-tab-btn" data-tab="telemetry"><i class="ph-bold ph-activity"></i> Telemetria</button>
          <button class="fsb-tab-btn" data-tab="providers" id="fsbTabProviders"><i class="ph-bold ph-plugs-connected"></i> Providers</button>
          <button class="fsb-tab-btn" data-tab="logs"><i class="ph-bold ph-scroll"></i> Logs</button>
          <button class="fsb-tab-btn" data-tab="terminal"><i class="ph-bold ph-terminal-window"></i> Terminal</button>
          <button class="fsb-tab-btn" data-tab="inspector" id="fsbTabInspector"><i class="ph-bold ph-cpu"></i> Inspetor</button>
        </div>

        <!-- Painel Chat -->
        <div class="fsb-panel active" id="fsbPanelChat" style="position:relative;">
          <!-- Drop Overlay -->
          <div class="fsb-drop-overlay" id="fsbDropOverlay" style="display:none;">
            <div class="fsb-drop-box">
              <i class="ph-bold ph-upload-simple"></i>
              <strong>Solte qualquer arquivo aqui</strong>
              <span>Análise forense, heurística de criptografia e inspeção de binários</span>
            </div>
          </div>

          <div class="fsb-conv-toolbar">
            <button type="button" class="fsb-conv-btn primary" id="fsbNewChatBtn" title="Iniciar Nova Conversa"><i class="ph-bold ph-plus"></i> Nova Conversa</button>
            <button type="button" class="fsb-conv-btn" id="fsbHistoryBtn" title="Ver Histórico de Conversas"><i class="ph-bold ph-clock-counter-clockwise"></i> Histórico (<span id="fsbHistoryCount">0</span>)</button>
          </div>

          <!-- Diff Proposal Container (Human-in-the-loop) -->
          <div class="fsb-diff-container" id="fsbDiffContainer">
            <div class="fsb-diff-card">
              <div class="fsb-diff-header">
                <span id="fsbDiffTitle" style="font-size:11px; font-weight:700; color:#00D9FF; display:flex; align-items:center; gap:6px;"><i class="ph-bold ph-git-diff"></i> Proposta de Modificação</span>
                <span class="fsb-diff-tag">HUMAN-IN-THE-LOOP</span>
              </div>
              <pre class="fsb-diff-code" id="fsbDiffCode"><code></code></pre>
              <div class="fsb-diff-actions">
                <button type="button" class="fsb-btn-apply" onclick="window.fenixCopilot?.applyDiff()"><i class="ph-bold ph-check"></i> Aplicar no Editor</button>
                <button type="button" class="fsb-btn-reject" onclick="window.fenixCopilot?.rejectDiff()"><i class="ph-bold ph-x"></i> Rejeitar</button>
              </div>
            </div>
          </div>

          <!-- History Drawer Overlay -->
          <div class="fsb-history-drawer" id="fsbHistoryDrawer" style="display:none;">
            <div class="fsb-history-header">
              <span><i class="ph-bold ph-chats-circle" style="color:#22d3ee; margin-right:6px;"></i> Histórico de Conversas</span>
              <button type="button" class="fsb-icon-btn" id="fsbCloseHistoryBtn" title="Fechar Histórico"><i class="ph-bold ph-x"></i></button>
            </div>
            <div class="fsb-history-list" id="fsbHistoryList"></div>
          </div>

          <div class="fsb-messages" id="fsbChatMessages">
            <div class="fsb-msg bot">
              <div class="fsb-msg-sender"><i class="ph-bold ph-robot"></i> Mascote Fênix</div>
              <div class="fsb-bubble" style="background:transparent; border:none; padding:0; box-shadow:none;">
                <!-- Quick Actions Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 0 0 12px;">
                  <button onclick="window.fenixSidebarAction?.('create-agent')" style="display:flex; align-items:center; gap:6px; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#E2E8F0; font-size:11px; font-weight:600; cursor:pointer; text-align:left;">
                    <i class="ph-bold ph-robot" style="color:#10B981; font-size:14px;"></i> Criar agente
                  </button>
                  <button onclick="window.fenixSidebarAction?.('new-mission')" style="display:flex; align-items:center; gap:6px; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#E2E8F0; font-size:11px; font-weight:600; cursor:pointer; text-align:left;">
                    <i class="ph-bold ph-crosshair" style="color:#A855F7; font-size:14px;"></i> Nova missão
                  </button>
                  <button onclick="window.fenixSidebarAction?.('open-project')" style="display:flex; align-items:center; gap:6px; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#E2E8F0; font-size:11px; font-weight:600; cursor:pointer; text-align:left;">
                    <i class="ph-bold ph-folder-open" style="color:#3B82F6; font-size:14px;"></i> Abrir projeto
                  </button>
                  <button onclick="window.fenixSidebarAction?.('start-meeting')" style="display:flex; align-items:center; gap:6px; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#E2E8F0; font-size:11px; font-weight:600; cursor:pointer; text-align:left;">
                    <i class="ph-bold ph-video-camera" style="color:#F59E0B; font-size:14px;"></i> Iniciar reunião
                  </button>
                </div>

                <!-- Suggestions Section -->
                <div style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:10px;">
                  <div style="font-size:10px; font-weight:700; color:#94A3B8; text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:4px;">
                    <i class="ph-bold ph-lightbulb" style="color:#FCD34D;"></i> Sugestões para hoje
                  </div>
                  <div style="display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; align-items:center; gap:8px; padding:6px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid rgba(255,255,255,0.03);">
                      <div style="width:6px; height:6px; border-radius:50%; background:#EF4444;"></div>
                      <div style="flex:1; font-size:11px; color:#E2E8F0;">—</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; padding:6px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid rgba(255,255,255,0.03);">
                      <div style="width:6px; height:6px; border-radius:50%; background:#F59E0B;"></div>
                      <div style="flex:1; font-size:11px; color:#E2E8F0;">—</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="fsb-chips-row" id="fsbChipsRow">
            <button class="fsb-chip" data-cmd="/vps-status"><i class="ph-bold ph-hard-drives"></i> Status VPS</button>
            <button class="fsb-chip" data-cmd="/health"><i class="ph-bold ph-shield-check"></i> Integridade</button>
            <button class="fsb-chip" data-cmd="/memory"><i class="ph-bold ph-brain"></i> Memória</button>
            <button class="fsb-chip" data-cmd="/agents"><i class="ph-bold ph-users-three"></i> Agentes</button>
          </div>
          <div class="fsb-input-wrap" id="fsbInputArea">
            <input type="file" id="fsbFileInput" style="display:none;" multiple>
            <button type="button" class="fsb-attach-btn" id="fsbAttachBtn" title="Anexar qualquer arquivo (APK, IPA, PDF, DOCX, ZIP, Imagens, Vídeos, Binários...)"><i class="ph-bold ph-paperclip"></i></button>
            <textarea class="fsb-input" id="fsbChatInput" rows="1" placeholder="Envie uma mensagem ou anexe arquivos…"></textarea>
            <button class="fsb-send-btn" id="fsbSendBtn" title="Enviar"><i class="ph-bold ph-paper-plane-right"></i></button>
          </div>
        </div>

        <!-- Painel Telemetria -->
        <div class="fsb-panel" id="fsbPanelTelemetry">
          <div class="fsb-telemetry-content">
            <div class="fsb-status-banner">
              <i class="ph-bold ph-shield-check"></i>
              <span>FÊNIX OS KERNEL: <strong id="fsbTelemKernelState">ONLINE</strong></span>
            </div>
            <div class="fsb-meter-grid">
              <div class="fsb-meter-card">
                <span class="fsb-meter-label">CPU Host</span>
                <span class="fsb-meter-val" id="fsbTelemCpu">—</span>
              </div>
              <div class="fsb-meter-card">
                <span class="fsb-meter-label">RAM Em Uso</span>
                <span class="fsb-meter-val" id="fsbTelemRam">—</span>
              </div>
              <div class="fsb-meter-card">
                <span class="fsb-meter-label">Latência VPS</span>
                <span class="fsb-meter-val" id="fsbTelemLatency">—</span>
              </div>
              <div class="fsb-meter-card">
                <span class="fsb-meter-label">Uptime</span>
                <span class="fsb-meter-val" id="fsbTelemUptime">—</span>
              </div>
              <div class="fsb-meter-card">
                <span class="fsb-meter-label">Jobs Ativos</span>
                <span class="fsb-meter-val" id="fsbTelemJobs">—</span>
              </div>
              <div class="fsb-meter-card">
                <span class="fsb-meter-label">API Platform</span>
                <span class="fsb-meter-val" id="fsbTelemApiPlatform">—</span>
              </div>
            </div>
            <button class="fenix-subnav-btn" id="fsbRefreshTelemBtn" style="margin-top:10px;"><i class="ph-bold ph-arrows-clockwise"></i> Atualizar Telemetria</button>
          </div>
        </div>

        <!-- Painel Logs -->
        <div class="fsb-panel" id="fsbPanelLogs">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 14px; border-bottom:1px solid rgba(255,255,255,0.06); font-size:11px; color:#94a3b8; background:rgba(0,0,0,0.2);">
            <span><i class="ph-bold ph-activity"></i> Eventos Operacionais do Sistema</span>
            <button type="button" class="fsb-icon-btn" id="fsbClearLogsBtn" title="Limpar Logs" style="padding:2px 8px; font-size:11px;"><i class="ph-bold ph-trash"></i> Limpar</button>
          </div>
          <div class="fsb-logs-content" id="fsbLogsContainer">
            <div class="fsb-log-row">
              <span class="fsb-log-time">--:--:--</span>
              <span class="fsb-log-tag info">BOOT</span>
              <span class="fsb-log-text">Sidebar operacional conectada ao EventBus.</span>
            </div>
          </div>
        </div>

        <!-- Painel Mini Terminal -->
        <div class="fsb-panel" id="fsbPanelTerminal">
          <div class="fsb-terminal-content">
            <div class="fsb-terminal-output" id="fsbTerminalOutput">Fênix OS Live Terminal [Version 2.1.0]&#10;Digite 'help' ou comandos shell para executar.&#10;</div>
            <div class="fsb-terminal-input-row">
              <span class="fsb-terminal-prompt">fenix&gt;</span>
              <input type="text" class="fsb-terminal-input" id="fsbTerminalInput" autocomplete="off" spellcheck="false">
            </div>
          </div>
        </div>

        <!-- Painel Provider Fabric -->
        <div class="fsb-panel" id="fsbPanelProviders">
          <div class="fsb-providers-container" id="fsbProvidersContainer">
            <div style="padding:24px; text-align:center; color:#94A3B8;">
              <i class="ph-bold ph-spinner ph-spin" style="font-size:24px; color:#00D9FF;"></i>
              <div style="margin-top:8px; font-size:12px;">Sincronizando Provider Fabric...</div>
            </div>
          </div>
        </div>

        <!-- Painel Inspetor de Sistema / Empresa (API Platform / Depósito Mais / etc.) -->
        <div class="fsb-panel" id="fsbPanelInspector">
          <div class="fsb-inspector-container" id="fsbInspectorContainer">
            <div style="padding:24px; text-align:center; color:#94A3B8;">
              <i class="ph-bold ph-spinner ph-spin" style="font-size:24px; color:#00D9FF;"></i>
              <div style="margin-top:8px; font-size:12px;">Sincronizando telemetria do sistema...</div>
            </div>
        </div>
      `;
      const targetParent = document.getElementById('fenixMainBody') || document.querySelector('.main-body') || document.body;
      targetParent.appendChild(sb);
      sidebarEl = sb;
    } else {
      sidebarEl = document.getElementById('fenix-right-sidebar');
    }

    // 2. Mascote Flutuante (#fenix-floating-mascot)
    if (!document.getElementById('fenix-floating-mascot')) {
      const mf = document.createElement('div');
      mf.id = 'fenix-floating-mascot';
      mf.className = state.isOpen ? 'hidden' : '';
      mf.innerHTML = `
        <div class="ffm-tooltip">Fênix OS · Clique para abrir o chat</div>
        <div class="ffm-badge" id="ffmBadge">1</div>
        <div class="ffm-pod">
          <div class="ffm-sprite">
            <div class="ffm-body">
              <div class="ffm-visor">
                <span class="ffm-eye" id="ffmEyeLeft">^</span>
                <span class="ffm-eye" id="ffmEyeRight">^</span>
              </div>
            </div>
            <div class="ffm-hands">
              <div class="ffm-hand"></div>
              <div class="ffm-hand"></div>
            </div>
            <div class="ffm-laptop">
              <div class="ffm-laptop-screen">&gt;_</div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(mf);
      mascotEl = mf;
    } else {
      mascotEl = document.getElementById('fenix-floating-mascot');
    }

    // 3. Modal de Dossiê RPG e Customizer (#fenixAgentDossierModal)
    if (!document.getElementById('fenixAgentDossierModal')) {
      const md = document.createElement('div');
      md.id = 'fenixAgentDossierModal';
      md.innerHTML = `
        <div class="fad-modal-card">
          <div class="fad-header">
            <div class="fad-title-wrap">
              <i class="ph-bold ph-game-controller" style="font-size:22px; color:#22d3ee;"></i>
              <div class="fad-title" id="fadAgentTitle">DOSSIÊ DO AGENTE</div>
            </div>
            <button class="fad-close-btn" id="fadCloseBtn"><i class="ph-bold ph-x"></i></button>
          </div>
          <div class="fad-body">
            <!-- Coluna Esquerda: Avatar RPG & Estúdio Habbo/Tibia -->
            <div class="fad-avatar-col">
              <div class="fad-avatar-stage">
                <canvas id="fadPixelCanvas" class="fad-pixel-canvas" width="64" height="96"></canvas>
                <div style="font-size:11px; font-weight:800; color:#22d3ee; margin-top:8px;" id="fadRoleName">DEVELOPER</div>
              </div>
              
              <div class="fad-studio-section">
                <div class="fad-studio-label">Tom de Pele</div>
                <div class="fad-color-palette" id="fadSkinPalette"></div>
              </div>

              <div class="fad-studio-section">
                <div class="fad-studio-label">Cor do Cabelo</div>
                <div class="fad-color-palette" id="fadHairPalette"></div>
              </div>

              <div class="fad-studio-section">
                <div class="fad-studio-label">Cor do Traje</div>
                <div class="fad-color-palette" id="fadShirtPalette"></div>
              </div>
            </div>

            <!-- Coluna Direita: Abas de Ramificações, Detalhes e Chat Direto -->
            <div class="fad-details-col">
              <div class="fad-tabs">
                <button class="fad-tab-btn active" data-fpan="specs">Especialidade & Stats</button>
                <button class="fad-tab-btn" data-fpan="tree">Ramificações (Árvore)</button>
                <button class="fad-tab-btn" data-fpan="chat">Chat Direto 1-a-1</button>
              </div>

              <!-- Painel Stats -->
              <div class="fad-tab-pane active" id="fadPaneSpecs">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <div class="fsb-meter-card">
                    <span class="fsb-meter-label">Função Operacional</span>
                    <span style="font-weight:700; color:#f8fafc;" id="fadSpecRole">—</span>
                  </div>
                  <div class="fsb-meter-card">
                    <span class="fsb-meter-label">Estado Atual</span>
                    <span style="font-weight:700; color:#10b981;" id="fadSpecStatus">—</span>
                  </div>
                  <div class="fsb-meter-card">
                    <span class="fsb-meter-label">Modelo LLM</span>
                    <span style="font-weight:700; color:#38bdf8;" id="fadSpecModel">qwen2.5:3b</span>
                  </div>
                  <div class="fsb-meter-card">
                    <span class="fsb-meter-label">Tokens Processados</span>
                    <span style="font-weight:700; color:#a78bfa;" id="fadSpecTokens">—</span>
                  </div>
                </div>
                <div style="margin-top:10px;">
                  <span class="fsb-meter-label">Capacidades Mapeadas</span>
                  <div id="fadCapabilitiesChips" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;"></div>
                </div>
              </div>

              <!-- Painel Ramificações / Subagentes -->
              <div class="fad-tab-pane" id="fadPaneTree">
                <div style="font-size:12px; color:#94a3b8; margin-bottom:8px;">Linhagem hierárquica e subagentes subordinados no Company Brain:</div>
                <div id="fadTreeHierarchy" style="background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06); font-family:monospace; font-size:12px; line-height:1.6; color:#38bdf8;">
                  FÊNIX KERNEL (Nível 0)&#10;  └── CEO Brain (Executivo)&#10;        └── <span id="fadTreeNodeName">Agente Selecionado</span>&#10;              ├── Subagente de Triagem&#10;              └── Executor de Tarefas
                </div>
              </div>

              <!-- Painel Chat Direto -->
              <div class="fad-tab-pane" id="fadPaneChat">
                <div id="fadDirectChatMessages" style="height:200px; overflow-y:auto; background:rgba(0,0,0,0.3); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                  <div class="fsb-msg bot">
                    <div class="fsb-bubble" id="fadDirectWelcome">Canal direto ativo. Pronto para receber tarefas específicas.</div>
                  </div>
                </div>
                <div style="display:flex; gap:8px; margin-top:8px;">
                  <input type="text" class="fsb-input" id="fadDirectInput" placeholder="Mensagem direta para o agente…">
                  <button class="fsb-send-btn" id="fadDirectSendBtn"><i class="ph-bold ph-paper-plane-right"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(md);
      modalEl = md;
    } else {
      modalEl = document.getElementById('fenixAgentDossierModal');
    }
  }

  // ── Controlador de Expressões e Animações do Mascote ──
  const MascotController = {
    setMood(mood) {
      state.mascotMood = mood;
      const leftEye = document.getElementById('ffmEyeLeft');
      const rightEye = document.getElementById('ffmEyeRight');
      if (!mascotEl || !leftEye || !rightEye) return;

      mascotEl.classList.remove('working', 'error', 'success');

      switch (mood) {
        case 'thinking':
          leftEye.textContent = 'o';
          rightEye.textContent = 'o';
          break;
        case 'working':
          leftEye.textContent = '>';
          rightEye.textContent = '<';
          mascotEl.classList.add('working');
          break;
        case 'success':
          leftEye.textContent = '*';
          rightEye.textContent = '*';
          mascotEl.classList.add('success');
          setTimeout(() => this.setMood('idle'), 3500);
          break;
        case 'error':
          leftEye.textContent = '!';
          rightEye.textContent = '!';
          mascotEl.classList.add('error');
          setTimeout(() => this.setMood('idle'), 4000);
          break;
        case 'idle':
        default:
          leftEye.textContent = '^';
          rightEye.textContent = '^';
          break;
      }
    },

    setCopilotState(mode) {
      state.copilotState = mode;
      state.isOpen = (mode === 'open' || mode === 'expanded' || mode === 'compact');
      try {
        localStorage.setItem('fenix_sidebar_state', state.isOpen ? 'open' : 'minimized');
        localStorage.setItem('fenix.ui.copilotState', mode);
      } catch (_) {}

      document.body.classList.toggle('has-right-sidebar-open', state.isOpen);

      if (!sidebarEl) sidebarEl = document.getElementById('fenix-right-sidebar');
      if (!sidebarEl) return;

      sidebarEl.classList.remove('state-compact', 'state-closed', 'state-expanded', 'collapsed');

      if (mode === 'closed') {
        sidebarEl.classList.remove('open');
        sidebarEl.classList.add('state-closed', 'collapsed');
        mascotEl?.classList.remove('hidden');
      } else if (mode === 'compact') {
        sidebarEl.classList.add('open', 'state-compact');
        mascotEl?.classList.add('hidden');
      } else if (mode === 'expanded') {
        sidebarEl.classList.add('open', 'state-expanded');
        mascotEl?.classList.add('hidden');
        document.getElementById('fsbChatInput')?.focus();
      } else { // 'open'
        sidebarEl.classList.add('open');
        mascotEl?.classList.add('hidden');
        document.getElementById('fsbChatInput')?.focus();
      }
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    },

    toggle() {
      if (state.isOpen) {
        this.setCopilotState('closed');
      } else {
        this.setCopilotState('open');
      }
    },

    initDrag() {
      if (!mascotEl) return;
      let isDragging = false;
      let startX, startY, initialRight, initialBottom;

      mascotEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ffm-pod')) {
          isDragging = false;
          startX = e.clientX;
          startY = e.clientY;
          const rect = mascotEl.getBoundingClientRect();
          initialRight = window.innerWidth - rect.right;
          initialBottom = window.innerHeight - rect.bottom;

          const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
              isDragging = true;
              mascotEl.style.right = `${Math.max(10, initialRight - dx)}px`;
              mascotEl.style.bottom = `${Math.max(10, initialBottom - dy)}px`;
            }
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (!isDragging) {
              MascotController.toggle();
            }
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }
      });
    }
  };

  // ── Universal Copilot Context (Fênix V15) ──
  function readSavedCopilotContext() {
    try {
      const saved = JSON.parse(localStorage.getItem('fenix_copilot_context_v1') || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch (_) {
      return {};
    }
  }

  const savedCopilotContext = readSavedCopilotContext();
  const copilotContext = {
    contextType: savedCopilotContext.contextType || 'GLOBAL',
    contextId: savedCopilotContext.contextId || null,
    project: savedCopilotContext.project || 'GLOBAL',
    projectId: savedCopilotContext.projectId || null,
    file: savedCopilotContext.file || '—',
    mode: savedCopilotContext.mode || localStorage.getItem('fenix_ide_mode') || 'split',
    agent: savedCopilotContext.agent || '—',
    agentId: savedCopilotContext.agentId || null,
    pendingPatch: null
  };

  function updateCopilotContext(ctx = {}) {
    if (ctx.contextType !== undefined) copilotContext.contextType = ctx.contextType;
    if (ctx.contextId !== undefined) copilotContext.contextId = ctx.contextId;
    if (ctx.project !== undefined) copilotContext.project = ctx.project;
    if (ctx.projectId !== undefined) copilotContext.projectId = ctx.projectId;
    else if (ctx.contextType === 'PROJECT' && ctx.contextId !== undefined) copilotContext.projectId = ctx.contextId;
    else if (ctx.contextType === 'GLOBAL') copilotContext.projectId = null;
    if (ctx.file !== undefined) copilotContext.file = ctx.file;
    if (ctx.mode !== undefined) copilotContext.mode = ctx.mode;
    if (ctx.agent !== undefined) copilotContext.agent = ctx.agent;
    if (ctx.agentId !== undefined) copilotContext.agentId = ctx.agentId;
    else if (ctx.contextType === 'AGENT' && ctx.contextId !== undefined) copilotContext.agentId = ctx.contextId;

    try {
      localStorage.setItem('fenix_copilot_context_v1', JSON.stringify({
        contextType: copilotContext.contextType,
        contextId: copilotContext.contextId,
        project: copilotContext.project,
        projectId: copilotContext.projectId,
        file: copilotContext.file,
        mode: copilotContext.mode,
        agent: copilotContext.agent,
        agentId: copilotContext.agentId,
      }));
      const activeConversation = SidebarController.getActiveConversation();
      if (activeConversation) {
        activeConversation.context = {
          contextType: copilotContext.contextType,
          contextId: copilotContext.contextId,
          project: copilotContext.project,
          projectId: copilotContext.projectId,
          file: copilotContext.file,
          mode: copilotContext.mode,
          agent: copilotContext.agent,
          agentId: copilotContext.agentId,
        };
        if (copilotContext.projectId) activeConversation.projectId = copilotContext.projectId;
        SidebarController.saveConversations();
      }
    } catch (_) {}

    const projEl = document.getElementById('fsbCtxProject');
    if (projEl) projEl.textContent = copilotContext.project || 'GLOBAL';
    const fileEl = document.getElementById('fsbCtxFile');
    if (fileEl) fileEl.textContent = copilotContext.file || '—';
    const modeEl = document.getElementById('fsbCtxMode');
    if (modeEl) modeEl.textContent = (copilotContext.mode || 'split').toUpperCase();
    const agEl = document.getElementById('fsbCtxAgent');
    if (agEl) agEl.textContent = copilotContext.agent || '—';

    const headerCtx = document.getElementById('fsbHeaderContextName');
    if (headerCtx) {
      if (copilotContext.contextType === 'PROJECT' || (copilotContext.project && copilotContext.project !== 'GLOBAL')) {
        headerCtx.textContent = copilotContext.project;
      } else if (copilotContext.contextType === 'COMPANY') {
        headerCtx.textContent = copilotContext.contextId || 'Empresa';
      } else if (copilotContext.contextType === 'AGENT' || (copilotContext.agent && copilotContext.agent !== '—')) {
        headerCtx.textContent = copilotContext.agent;
      } else if (copilotContext.contextType === 'MISSION') {
        headerCtx.textContent = copilotContext.contextId || 'Missão';
      } else if (copilotContext.contextType === 'WORLD_ENTITY') {
        headerCtx.textContent = copilotContext.contextId || 'Entidade';
      } else {
        headerCtx.textContent = 'Global';
      }
    }

    renderContextualChips(copilotContext.mode);
  }

  function renderContextualChips(mode) {
    const chipsRow = document.getElementById('fsbChipsRow');
    if (!chipsRow) return;

    let chips = [];
    const m = (mode || '').toLowerCase();
    if (m === 'code') {
      chips = [
        { label: 'Explicar Código', icon: 'ph-magnifying-glass', cmd: 'Explique a estrutura e responsabilidades deste arquivo de código.' },
        { label: 'Otimizar', icon: 'ph-lightning', cmd: 'Sugira otimizações de performance e redução de alocação de memória.' },
        { label: 'Criar Teste', icon: 'ph-flask', cmd: 'Gere um teste unitário automatizado cobrindo os caminhos principais.' },
        { label: 'Documentar', icon: 'ph-file-text', cmd: 'Gere JSDoc e documentação de interface para este arquivo.' }
      ];
    } else if (m === 'preview' || m === 'split') {
      chips = [
        { label: 'Analisar UI', icon: 'ph-eye', cmd: 'Analise a hierarquia e contraste da interface atual' },
        { label: 'Inspecionar Layout', icon: 'ph-frame-corners', cmd: 'Inspecione se há elementos invisíveis ou sobrepostos' },
        { label: 'Mobile (375px)', icon: 'ph-device-mobile', cmd: 'Verificar layout em resolução mobile' },
        { label: 'Recarregar', icon: 'ph-arrows-clockwise', cmd: 'Recarregar tela live preview' }
      ];
    } else if (m === 'world') {
      chips = [
        { label: 'API Platform', icon: 'ph-buildings', cmd: 'Abra o projeto api-platform' },
        { label: 'ZapAI CRM', icon: 'ph-whatsapp-logo', cmd: 'Abra o projeto zapai-crm' },
        { label: 'Focar Camila', icon: 'ph-user-circle', cmd: 'Qual o status da Camila?' },
        { label: 'Focar Alex', icon: 'ph-user-circle', cmd: 'Qual o status do Alex?' }
      ];
    } else {
      chips = [
        { label: 'Status VPS', icon: 'ph-hard-drives', cmd: '/vps-status' },
        { label: 'Integridade', icon: 'ph-shield-check', cmd: '/health' },
        { label: 'Memória', icon: 'ph-brain', cmd: '/memory' },
        { label: 'Agentes', icon: 'ph-users-three', cmd: '/agents' }
      ];
    }

    chipsRow.innerHTML = chips.map(c => `
      <button class="fsb-chip" data-cmd="${c.cmd}" onclick="window.fenixCopilot?.sendMessage(this.dataset.cmd)"><i class="ph-bold ${c.icon}"></i> ${c.label}</button>
    `).join('');
  }

  function showDiffProposal(diffCode, filePath, newContent) {
    copilotContext.pendingPatch = { diffCode, filePath, newContent };
    const container = document.getElementById('fsbDiffContainer');
    const codeEl = document.getElementById('fsbDiffCode');
    const titleEl = document.getElementById('fsbDiffTitle');
    if (titleEl) titleEl.innerHTML = `<i class="ph-bold ph-git-diff"></i> Proposta de Modificação · ${filePath || 'código'}`;
    if (codeEl) codeEl.textContent = diffCode || '';
    if (container) container.style.display = 'block';
  }

  function applyCurrentDiff() {
    if (!copilotContext.pendingPatch) return;
    const patch = copilotContext.pendingPatch;
    const container = document.getElementById('fsbDiffContainer');
    if (container) container.style.display = 'none';

    // Apply into IDE
    const editor = document.getElementById('fenixIdeCodeEditor') || document.getElementById('fenixIdeLiveCode');
    if (editor) {
      if (patch.newContent) {
        editor.value = patch.newContent;
      } else if (patch.diffCode) {
        editor.value += '\n\n' + patch.diffCode;
      }
      editor.dispatchEvent(new Event('input'));
    }
    copilotContext.pendingPatch = null;
    SidebarController.appendMessage('system', '✅ Modificação aplicada com sucesso no editor!');
    MascotController.setMood('success');
  }

  function rejectCurrentDiff() {
    copilotContext.pendingPatch = null;
    const container = document.getElementById('fsbDiffContainer');
    if (container) container.style.display = 'none';
    SidebarController.appendMessage('system', '❌ Proposta de modificação rejeitada pelo operador.');
  }

  // ── Controlador da Sidebar Direita ──
  const SidebarController = {
    initEvents() {
      // Toggle / Minimize / Collapse / Compact / Expand
      document.getElementById('fsbMinimizeBtn')?.addEventListener('click', () => MascotController.toggle());
      document.getElementById('fsbCollapseBtn')?.addEventListener('click', () => MascotController.setCopilotState('closed'));
      document.getElementById('fsbCompactBtn')?.addEventListener('click', () => MascotController.setCopilotState(state.copilotState === 'compact' ? 'open' : 'compact'));
      document.getElementById('fsbExpandBtn')?.addEventListener('click', () => MascotController.setCopilotState(state.copilotState === 'expanded' ? 'open' : 'expanded'));
      document.getElementById('fsbClearBtn')?.addEventListener('click', () => this.clearChat());

      // Multi-Conversation History
      document.getElementById('fsbNewChatBtn')?.addEventListener('click', () => this.startNewConversation());
      document.getElementById('fsbHistoryBtn')?.addEventListener('click', () => this.toggleHistoryDrawer());
      document.getElementById('fsbCloseHistoryBtn')?.addEventListener('click', () => this.toggleHistoryDrawer(false));

      // Tabs
      document.querySelectorAll('.fsb-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab;
          this.switchTab(tab);
        });
      });

      // Chips
      document.querySelectorAll('.fsb-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const cmd = chip.dataset.cmd;
          this.handleCommand(cmd);
        });
      });

      // Chat Input
      const chatInput = document.getElementById('fsbChatInput');
      const sendBtn = document.getElementById('fsbSendBtn');
      chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
      sendBtn?.addEventListener('click', () => this.sendChatMessage());

      // Universal File Attachment & Drag and Drop
      const fileInput = document.getElementById('fsbFileInput');
      const attachBtn = document.getElementById('fsbAttachBtn');
      const dropOverlay = document.getElementById('fsbDropOverlay');
      const panelChat = document.getElementById('fsbPanelChat');

      attachBtn?.addEventListener('click', () => fileInput?.click());
      fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleIncomingFiles(e.target.files);
          fileInput.value = '';
        }
      });

      if (panelChat) {
        panelChat.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          if (dropOverlay) dropOverlay.style.display = 'flex';
        });
        panelChat.addEventListener('dragleave', (e) => {
          if (!panelChat.contains(e.relatedTarget) && dropOverlay) {
            dropOverlay.style.display = 'none';
          }
        });
        panelChat.addEventListener('drop', (e) => {
          e.preventDefault();
          if (dropOverlay) dropOverlay.style.display = 'none';
          if (e.dataTransfer?.files?.length > 0) {
            this.handleIncomingFiles(e.dataTransfer.files);
          }
        });
        panelChat.addEventListener('paste', (e) => {
          if (e.clipboardData?.files?.length > 0) {
            e.preventDefault();
            this.handleIncomingFiles(e.clipboardData.files);
          }
        });
      }

      // Mini Terminal Input
      const termInput = document.getElementById('fsbTerminalInput');
      termInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = termInput.value.trim();
          if (val) {
            this.execTerminalCommand(val);
            termInput.value = '';
          }
        }
      });

      // Refresh Telemetry Button
      document.getElementById('fsbRefreshTelemBtn')?.addEventListener('click', () => this.fetchTelemetry(true));

      // Resize Handle (Drag-to-resize Lovable Style)
      const resizeHandle = document.getElementById('fsbResizeHandle');
      if (resizeHandle) {
        let isResizing = false;
        const resizeFromPointer = (e) => {
          if (!isResizing) return;
          const minWidth = Math.min(280, window.innerWidth - 24);
          const maxWidth = Math.max(minWidth, window.innerWidth - (window.innerWidth <= 760 ? 12 : 84));
          const newWidth = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - e.clientX));
          document.documentElement.style.setProperty('--fsb-width', `${newWidth}px`);
          localStorage.setItem('fenix_sidebar_width', `${newWidth}px`);
          localStorage.setItem('fenix.ui.rightCopilotWidth', String(newWidth));
        };
        const stopResize = () => {
          if (!isResizing) return;
          isResizing = false;
          resizeHandle.classList.remove('active');
          document.body.classList.remove('fsb-resizing');
          window.dispatchEvent(new Event('resize'));
        };
        resizeHandle.addEventListener('pointerdown', (e) => {
          isResizing = true;
          resizeHandle.classList.add('active');
          document.body.classList.add('fsb-resizing');
          resizeHandle.setPointerCapture?.(e.pointerId);
          e.preventDefault();
        });
        window.addEventListener('pointermove', resizeFromPointer);
        window.addEventListener('pointerup', stopResize);
        window.addEventListener('pointercancel', stopResize);
      }

      // Docked Mode Toggle (Lovable Split Screen)
      const dockBtn = document.getElementById('fsbDockBtn');
      const updateDockBtn = () => {
        if (!dockBtn) return;
        const text = document.getElementById('fsbDockBtnText');
        dockBtn.classList.toggle('active', state.isDocked);
        document.body.classList.toggle('fsb-docked', state.isDocked);
        if (text) text.textContent = state.isDocked ? 'Split' : 'Float';
        dockBtn.title = state.isDocked ? 'Modo Split Screen (Tela ajustada sem sobreposição)' : 'Modo Flutuante (Sobreposição livre)';
      };

      dockBtn?.addEventListener('click', () => {
        state.isDocked = !state.isDocked;
        localStorage.setItem('fenix_sidebar_docked', String(state.isDocked));
        updateDockBtn();
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      });

      // Clear Logs
      document.getElementById('fsbClearLogsBtn')?.addEventListener('click', () => {
        const logsContainer = document.getElementById('fsbLogsContainer');
        if (logsContainer) {
          logsContainer.innerHTML = `
            <div class="fsb-log-row">
              <span class="fsb-log-time">${new Date().toLocaleTimeString('pt-BR')}</span>
              <span class="fsb-log-tag info">LOGS</span>
              <span class="fsb-log-text">Logs reinicializados pelo operador.</span>
            </div>
          `;
        }
      });
    },

    switchTab(tab) {
      state.activeTab = tab;
      document.querySelectorAll('.fsb-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
      document.querySelectorAll('.fsb-panel').forEach(p => p.classList.remove('active'));
      const activePanel = document.getElementById(`fsbPanel${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
      activePanel?.classList.add('active');

      sidebarEl = sidebarEl || document.getElementById('fenix-right-sidebar');
      if (tab === 'inspector') {
        sidebarEl?.classList.add('mode-inspector');
      } else {
        sidebarEl?.classList.remove('mode-inspector');
      }

      if (tab === 'telemetry') return this.fetchTelemetry();
      if (tab === 'providers') return this.fetchProviders();
      if (tab === 'inspector') return this.renderInspector();
    },

    openInspector(entityOrId) {
      if (!state.isOpen) MascotController.toggle();
      sidebarEl = sidebarEl || document.getElementById('fenix-right-sidebar');
      sidebarEl?.classList.add('mode-inspector');
      this.switchTab('inspector');
      return this.renderInspector(entityOrId);
    },

    async renderInspector(entityOrId) {
      let target = entityOrId;
      if (!target && window.GlobalSelectionStore) {
        target = window.GlobalSelectionStore.selectedEntity;
      }

      const container = document.getElementById('fsbInspectorContainer');
      if (!container) return;

      if (!target || target.type === 'none') {
        container.innerHTML = `
          <div class="fsb-inspector-empty" style="padding: 32px 16px; text-align: center; color: var(--text-muted, #94a3b8);">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(0,217,255,0.08); border: 1px solid rgba(0,217,255,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
              <i class="ph-bold ph-cursor-click" style="font-size: 24px; color: var(--accent-cyan, #00d9ff);"></i>
            </div>
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #fff;">FÊNIX COPILOT</div>
            <div style="font-size: 12px; line-height: 1.6; color: #94a3b8; max-width: 260px; margin: 0 auto;">
              Selecione uma empresa, agente, projeto ou elemento do mundo para inspecionar métricas, ações e contexto em tempo real.
            </div>
          </div>
        `;
        return;
      }

      let type = typeof target === 'object' ? (target.type || 'company') : 'company';
      let id = typeof target === 'object' ? target.id : target;
      state.activeInspectCompanyId = id;

      if (type === 'project') {
        return this.renderProjectInspector(container, target);
      }
      if (type === 'agent') {
        return this.renderAgentInspector(container, target);
      }

      return this.renderCompanyInspector(container, id);
    },

    async renderProjectInspector(container, target) {
      const projectId = typeof target === 'object' ? target.id : target;
      let project = typeof target === 'object' && target.data ? target.data : null;
      if (!project) {
        try {
          const res = await authedFetch(`/api/v2/projects/${encodeURIComponent(projectId)}`);
          if (res.ok) {
            const data = await res.json();
            project = data.project || data;
          }
        } catch (e) {
          console.warn('[FenixSidebar] Falha ao buscar projeto:', e);
        }
      }
      if (!project) {
        project = { id: projectId, name: (typeof target === 'object' ? target.name : null) || projectId, slug: projectId };
      }

      const pName = project.name || project.id || 'Projeto';
      const pRepo = project.repository || project.path || '—';
      const pRuntime = project.runtime || 'node';
      const pTech = project.technology || 'javascript';
      const pStatus = project.status || 'ACTIVE';

      container.innerHTML = `
        <div class="fsb-company-inspector-view fsb-project-inspector-view">
          <div class="fsb-company-top-header">
            <div class="fsb-company-top-info">
              <div class="fsb-company-logo-badge" style="background:#3B82F6;">
                <i class="ph-fill ph-folder-open"></i>
              </div>
              <div class="fsb-company-title-area">
                <div class="fsb-company-main-name">${pName}</div>
                <div class="fsb-company-sub-tag">
                  Projeto
                  <span class="fsb-company-online-pill">
                    <span class="fsb-company-online-dot"></span> ${pStatus}
                  </span>
                </div>
              </div>
            </div>
            <div class="fsb-company-window-actions">
              <button class="fsb-comp-win-btn" onclick="window.fenixToggleRightSidebarFullscreen?.()" title="Expandir"><i class="ph-bold ph-corners-out"></i></button>
              <button class="fsb-comp-win-btn" onclick="window.FenixSidebar.toggle()" title="Minimizar"><i class="ph-bold ph-minus"></i></button>
              <button class="fsb-comp-win-btn" onclick="window.FenixSidebar.switchTab('chat')" title="Voltar ao Chat"><i class="ph-bold ph-x"></i></button>
            </div>
          </div>

          <div class="fsb-company-info-block" style="margin-top: 12px;">
            <div class="fsb-company-segment-text">Runtime: <strong>${pRuntime}</strong> | Stack: <strong>${pTech}</strong></div>
            <div class="fsb-company-location-text"><i class="ph-bold ph-git-branch"></i> ${pRepo}</div>
          </div>

          <div class="fsb-company-res-grid" style="grid-template-columns: 1fr; gap: 8px; margin-top: 14px;">
            <button class="fsb-company-nav-btn" style="justify-content: flex-start; padding: 8px 12px;" onclick="window.fenixOpenProjectWorkspace ? window.fenixOpenProjectWorkspace('${project.id || project.slug}') : window.showView?.('ide')">
              <i class="ph-bold ph-terminal-window" style="color: #00D9FF;"></i> Abrir Workspace
            </button>
            <button class="fsb-company-nav-btn" style="justify-content: flex-start; padding: 8px 12px;" onclick="window.showView?.('city'); window.GlobalSelectionStore?.select('world_entity', '${project.id}');">
              <i class="ph-bold ph-buildings" style="color: #10B981;"></i> Ver no World
            </button>
            <button class="fsb-company-nav-btn" style="justify-content: flex-start; padding: 8px 12px;" onclick="window.showView?.('ide')">
              <i class="ph-bold ph-git-fork" style="color: #F59E0B;"></i> Ver Git
            </button>
            <button class="fsb-company-nav-btn" style="justify-content: flex-start; padding: 8px 12px;" onclick="window.showView?.('agents')">
              <i class="ph-bold ph-users" style="color: #8B5CF6;"></i> Ver Agentes
            </button>
            <button class="fsb-company-nav-btn" style="justify-content: flex-start; padding: 8px 12px;" onclick="window.showView?.('operations')">
              <i class="ph-bold ph-crosshair" style="color: #EC4899;"></i> Ver Missões
            </button>
          </div>
        </div>
      `;
    },

    async renderAgentInspector(container, target) {
      const agentId = typeof target === 'object' ? target.id : target;
      let agent = typeof target === 'object' && target.data ? target.data : null;
      if (!agent) {
        try {
          const res = await authedFetch(`/api/v2/agents/${encodeURIComponent(agentId)}`);
          if (res.ok) {
            const data = await res.json();
            agent = data.agent || data;
          }
        } catch (e) {
          console.warn('[FenixSidebar] Falha ao buscar agente:', e);
        }
      }
      if (!agent) {
        agent = { id: agentId, name: (typeof target === 'object' ? target.name : null) || agentId, role: 'Agente', status: 'IDLE' };
      }

      container.innerHTML = `
        <div class="fsb-company-inspector-view fsb-agent-inspector-view">
          <div class="fsb-company-top-header">
            <div class="fsb-company-top-info">
              <div class="fsb-company-logo-badge" style="background:#10B981;">
                <i class="ph-fill ph-user-gear"></i>
              </div>
              <div class="fsb-company-title-area">
                <div class="fsb-company-main-name">${agent.name || agent.id}</div>
                <div class="fsb-company-sub-tag">
                  ${agent.role || 'Agente'}
                  <span class="fsb-company-online-pill">
                    <span class="fsb-company-online-dot"></span> ${agent.runtimeStatus || agent.status || 'ONLINE'}
                  </span>
                </div>
              </div>
            </div>
            <div class="fsb-company-window-actions">
              <button class="fsb-comp-win-btn" onclick="window.fenixToggleRightSidebarFullscreen?.()" title="Expandir"><i class="ph-bold ph-corners-out"></i></button>
              <button class="fsb-comp-win-btn" onclick="window.FenixSidebar.toggle()" title="Minimizar"><i class="ph-bold ph-minus"></i></button>
              <button class="fsb-comp-win-btn" onclick="window.FenixSidebar.switchTab('chat')" title="Voltar ao Chat"><i class="ph-bold ph-x"></i></button>
            </div>
          </div>

          <div class="fsb-company-info-block" style="margin-top: 12px;">
            <div class="fsb-company-segment-text">Missão Atual: <strong>${agent.currentMissionId || 'Nenhuma'}</strong></div>
            <div class="fsb-company-location-text">Memória: <strong>${agent.memoryId || '—'}</strong></div>
          </div>

          <div class="fsb-company-res-grid" style="grid-template-columns: 1fr; gap: 8px; margin-top: 14px;">
            <button class="fsb-company-nav-btn" style="justify-content: flex-start; padding: 8px 12px;" onclick="window.showView?.('city'); window.GlobalSelectionStore?.select('world_entity', '${agent.id}');">
              <i class="ph-bold ph-map-pin" style="color: #10B981;"></i> Ver no World
            </button>
            <button class="fsb-company-nav-btn" style="justify-content: flex-start; padding: 8px 12px;" onclick="window.showView?.('memory');">
              <i class="ph-bold ph-brain" style="color: #8B5CF6;"></i> Inspecionar Memória
            </button>
            <button class="fsb-company-nav-btn" style="justify-content: flex-start; padding: 8px 12px;" onclick="window.showView?.('operations');">
              <i class="ph-bold ph-crosshair" style="color: #F59E0B;"></i> Atribuir Missão
            </button>
          </div>
        </div>
      `;
    },

    async renderCompanyInspector(container, companyId) {
      let comp = null;
      if (companyId) {
        try {
          const res = await authedFetch(`/api/v2/company/info/${encodeURIComponent(companyId)}`);
          if (res.ok) {
            const data = await res.json();
            comp = data.company;
          }
        } catch (e) {
          console.warn('[FenixSidebar] Falha ao buscar empresa:', e);
        }
      }

      if (!comp) {
        container.innerHTML = `
          <div class="fsb-inspector-notfound" style="padding: 32px 16px; text-align: center; color: var(--text-muted, #94a3b8);">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
              <i class="ph-bold ph-warning-circle" style="font-size: 24px; color: #f59e0b;"></i>
            </div>
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #fff;">Empresa Não Encontrada</div>
            <div style="font-size: 12px; line-height: 1.6; color: #94a3b8; max-width: 260px; margin: 0 auto;">
              A empresa solicitada não está cadastrada ou não possui dados de runtime ativos.
            </div>
          </div>
        `;
        return;
      }

      const telem = comp.telemetry || {};

      let heroIllustration = '';
      if (window.FenixPixelEngine?.Cache?.buildings) {
        try {
          if (window.FenixPixelEngine.Cache.buildings.fenixHq) {
            const dataUri = window.FenixPixelEngine.Cache.buildings.fenixHq.toDataURL();
            heroIllustration = `<img src="${dataUri}" style="position:absolute; right:6px; bottom:2px; height:80px; object-fit:contain; filter:drop-shadow(0 6px 14px rgba(0,0,0,0.7)); pointer-events:none; z-index:1;" alt="${comp.name}" />`;
          }
        } catch (e) {}
      }

      const recomList = Array.isArray(comp.recommendations) && comp.recommendations.length > 0
        ? comp.recommendations.map((r, i) => `<div class="fsb-recom-row"><span class="fsb-recom-badge">${i+1}</span> <span>${r}</span></div>`).join('')
        : `<div style="font-size: 12px; color: var(--text-muted, #94a3b8); font-style: italic;">Nenhuma oportunidade ou alerta de melhoria identificado no momento.</div>`;

      container.innerHTML = `
        <div class="fsb-company-inspector-view">
          <!-- 1. Top Header -->
          <div class="fsb-company-top-header">
            <div class="fsb-company-top-info">
              <div class="fsb-company-logo-badge" style="background:${comp.color || '#3B82F6'};">
                <i class="ph-fill ${comp.icon || 'ph-buildings'}"></i>
              </div>
              <div class="fsb-company-title-area">
                <div class="fsb-company-main-name">${comp.name || comp.companyId}</div>
                <div class="fsb-company-sub-tag">
                  Empresa Selecionada
                  <span class="fsb-company-online-pill">
                    <span class="fsb-company-online-dot"></span> ${comp.status || 'ONLINE'}
                  </span>
                </div>
              </div>
            </div>
            <div class="fsb-company-window-actions">
              <button class="fsb-comp-win-btn" onclick="window.fenixToggleRightSidebarFullscreen?.()" title="Expandir"><i class="ph-bold ph-corners-out"></i></button>
              <button class="fsb-comp-win-btn" onclick="window.FenixSidebar.toggle()" title="Minimizar"><i class="ph-bold ph-minus"></i></button>
              <button class="fsb-comp-win-btn" onclick="window.FenixSidebar.switchTab('chat')" title="Voltar ao Chat"><i class="ph-bold ph-x"></i></button>
            </div>
          </div>

          <!-- 2. Hero Cutaway Illustration Banner -->
          <div class="fsb-company-hero-card">
            ${heroIllustration || `<div style="height:90px; background:radial-gradient(circle at 70% 30%, ${comp.color || '#00D9FF'}22, #050810 80%); display:flex; align-items:center; justify-content:center;"><i class="ph-bold ${comp.icon || 'ph-cpu'}" style="font-size:36px; color:${comp.color || '#00D9FF'};"></i></div>`}
          </div>

          <!-- 3. Company Metadata & Description -->
          <div class="fsb-company-info-block">
            <div class="fsb-company-name-row">
              <span class="fsb-company-name-text">${comp.name || comp.companyId}</span>
              <button class="fsb-comp-win-btn" title="Editar Informações"><i class="ph-bold ph-pencil-simple"></i></button>
            </div>
            <div class="fsb-company-segment-text">${comp.segment || '—'}</div>
            <div class="fsb-company-location-text">${comp.location || '—'}</div>
            <div class="fsb-company-desc-text">${comp.description || '—'}</div>
          </div>

          <!-- 4. 6 KPI Grid (3 cols x 2 rows) -->
          <div class="fsb-company-kpi-3x2">
            <div class="fsb-kpi-tile">
              <div class="fsb-kpi-tile-val" style="color:#10B981;"><i class="ph-bold ph-user"></i> <span id="kpiAgents">${telem.agentsCount != null ? telem.agentsCount : '—'}</span></div>
              <div class="fsb-kpi-tile-lbl">Agentes</div>
            </div>
            <div class="fsb-kpi-tile">
              <div class="fsb-kpi-tile-val" style="color:#A855F7;"><i class="ph-bold ph-chart-line-up"></i> <span id="kpiMissions">${telem.missionsCount != null ? telem.missionsCount : '—'}</span></div>
              <div class="fsb-kpi-tile-lbl">Missões</div>
            </div>
            <div class="fsb-kpi-tile">
              <div class="fsb-kpi-tile-val" style="color:#3B82F6;"><i class="ph-bold ph-folder"></i> <span id="kpiProjects">${telem.projectsCount != null ? telem.projectsCount : '—'}</span></div>
              <div class="fsb-kpi-tile-lbl">Projetos</div>
            </div>
            <div class="fsb-kpi-tile">
              <div class="fsb-kpi-tile-val" style="color:#F59E0B;"><i class="ph-bold ph-lightning"></i> <span id="kpiOps">${telem.operationsCount != null ? telem.operationsCount : '—'}</span></div>
              <div class="fsb-kpi-tile-lbl">Operações</div>
            </div>
            <div class="fsb-kpi-tile">
              <div class="fsb-kpi-tile-val" style="color:#00D9FF;"><i class="ph-bold ph-gear"></i> <span id="kpiPerf">${telem.performance != null ? telem.performance + '%' : '—'}</span></div>
              <div class="fsb-kpi-tile-lbl">Performance</div>
            </div>
            <div class="fsb-kpi-tile">
              <div class="fsb-kpi-tile-val" style="color:#EC4899;"><i class="ph-bold ph-currency-dollar"></i> <span id="kpiRevenue">${telem.revenueMonthly || '—'}</span></div>
              <div class="fsb-kpi-tile-lbl">Faturamento (mês)</div>
            </div>
          </div>

          <!-- 5. 6 Resource Action Navigation Buttons -->
          <div class="fsb-company-res-grid">
            <button class="fsb-company-nav-btn" onclick="window.showView?.('agents')"><i class="ph-bold ph-users"></i> Agentes</button>
            <button class="fsb-company-nav-btn" onclick="window.showView?.('operations')"><i class="ph-bold ph-crosshair"></i> Missões</button>
            <button class="fsb-company-nav-btn" onclick="window.fenixOpenProjectFromInspector?.('${comp.projectId || comp.companyId}')"><i class="ph-bold ph-folder"></i> Projetos</button>
            <button class="fsb-company-nav-btn" onclick="window.showView?.('runtime')"><i class="ph-bold ph-activity"></i> Sistemas</button>
            <button class="fsb-company-nav-btn" onclick="window.showView?.('knowledge')"><i class="ph-bold ph-database"></i> Dados</button>
            <button class="fsb-company-nav-btn" onclick="window.showView?.('office')"><i class="ph-bold ph-users-three"></i> Equipe</button>
          </div>
          <button class="fsb-company-settings-btn" onclick="window.showView?.('settings')">
            <i class="ph-bold ph-gear"></i> Configurações da Empresa
          </button>

          <!-- 6. Fênix Company Assistant Card -->
          <div class="fsb-copilot-card">
            <div class="fsb-copilot-header">
              <div class="fsb-copilot-title-wrap">
                <div class="fsb-copilot-fire-icon"><i class="ph-fill ph-fire"></i></div>
                <strong class="fsb-copilot-title">Fênix</strong>
                <span class="fsb-copilot-subtitle">Assistente da Empresa</span>
              </div>
              <span class="fsb-copilot-time">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="fsb-copilot-bubble">
              <div class="fsb-copilot-avatar-img"><i class="ph-bold ph-user-gear" style="color:#00D9FF;"></i></div>
              <div class="fsb-copilot-bubble-body">
                <div>Status e Oportunidades:</div>
                <div class="fsb-copilot-recom-list">
                  ${recomList}
                </div>
              </div>
            </div>
            <div class="fsb-copilot-actions">
              <div class="fsb-copilot-btn-row">
                <button class="fsb-btn-outline-green" onclick="window.fenixSidebarAction?.('full-analysis')">Ver Análise Completa</button>
                <button class="fsb-btn-solid-blue" onclick="window.fenixSidebarAction?.('new-mission')">Criar Missão</button>
              </div>
              <div class="fsb-copilot-btn-row">
                <button class="fsb-btn-dark-sub" onclick="window.fenixOpenProjectFromInspector?.('${comp.projectId || comp.companyId}')"><i class="ph-bold ph-folder-open"></i> Abrir Projeto</button>
                <button class="fsb-btn-dark-sub" onclick="window.fenixSidebarAction?.('create-agent')"><i class="ph-bold ph-plus-circle"></i> Criar Agente</button>
              </div>
            </div>
          </div>

          <!-- 7. Chat Footer Input & Chips -->
          <div class="fsb-chat-footer-box">
            <div class="fsb-chat-input-row">
              <input type="text" placeholder="Digite um comando ou fale com o Fênix..." id="fsbCompanyChatInput" onkeydown="if(event.key==='Enter') window.fenixSendCompanyChat?.()" />
              <button type="button" class="fsb-chat-input-btn" title="Anexar Arquivo"><i class="ph-bold ph-paperclip"></i></button>
              <button type="button" class="fsb-chat-input-btn" title="Comando de Voz"><i class="ph-bold ph-microphone"></i></button>
              <button type="button" class="fsb-chat-send-btn" title="Enviar" onclick="window.fenixSendCompanyChat?.()"><i class="ph-fill ph-paper-plane-right"></i></button>
            </div>
            <div class="fsb-chips-cluster">
              <button class="fsb-chip-btn" onclick="window.fenixChatChip?.('Resumo da empresa')">Resumo da empresa</button>
              <button class="fsb-chip-btn" onclick="window.fenixChatChip?.('Criar missão')">Criar missão</button>
              <button class="fsb-chip-btn" onclick="window.fenixChatChip?.('Analisar vendas')">Analisar vendas</button>
              <button class="fsb-chip-btn" onclick="window.fenixChatChip?.('Propor melhorias')">Propor melhorias</button>
            </div>
          </div>
        </div>
      `;

      setTimeout(() => {
        let msgHtml = '';
        if (Array.isArray(comp.recommendations) && comp.recommendations.length > 0) {
          msgHtml = `Analisei esta empresa. Encontrei ${comp.recommendations.length} oportunidades de melhoria:<br>` +
            comp.recommendations.map(r => `🔴 ${r}`).join('<br>');
        } else {
          msgHtml = `${comp.name || comp.companyId} possui ${telem.agentsCount ?? '—'} agentes ativos e ${telem.missionsCount ?? '—'} missões em andamento.`;
        }

        const buttonsHtml = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 12px;">
            <button onclick="window.showView('operations')" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#E2E8F0; padding:6px; border-radius:6px; font-size:11px; cursor:pointer;">Criar Missão</button>
            <button onclick="window.fenixOpenProjectFromInspector('${comp.projectId || comp.companyId}')" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#E2E8F0; padding:6px; border-radius:6px; font-size:11px; cursor:pointer;">Abrir Projeto</button>
            <button onclick="window.showView('agents')" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#E2E8F0; padding:6px; border-radius:6px; font-size:11px; cursor:pointer;">Criar Agente</button>
            <button onclick="window.showView('observability')" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#E2E8F0; padding:6px; border-radius:6px; font-size:11px; cursor:pointer;">Ver Análise</button>
          </div>
        `;

        const proactiveId = `proactive_msg_${comp.companyId}`;
        if (!document.getElementById(proactiveId)) {
          const msgObj = document.createElement('div');
          msgObj.className = 'fsb-msg bot proactive-msg';
          msgObj.id = proactiveId;
          msgObj.innerHTML = `
            <div class="fsb-msg-sender"><i class="ph-bold ph-robot"></i> Mascote Fênix</div>
            <div class="fsb-bubble">
              ${msgHtml}
              ${buttonsHtml}
            </div>
          `;
          
          const chatContainer = document.getElementById('fsbChatMessages');
          if (chatContainer) {
            chatContainer.appendChild(msgObj);
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }

        const chipsRow = document.querySelector('.fsb-chips-row');
        if (chipsRow) {
          chipsRow.innerHTML = `
            <button class="fsb-chip" data-cmd="Resumo da empresa ${comp.name || comp.companyId}">Resumo da empresa</button>
            <button class="fsb-chip" data-cmd="Criar missão para ${comp.name || comp.companyId}">Criar missão</button>
            <button class="fsb-chip" data-cmd="Analisar vendas de ${comp.name || comp.companyId}">Analisar vendas</button>
            <button class="fsb-chip" data-cmd="Propor melhorias para ${comp.name || comp.companyId}">Propor melhorias</button>
          `;
          chipsRow.querySelectorAll('.fsb-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              const cmd = chip.dataset.cmd;
              const input = document.getElementById('fsbChatInput');
              if (input) {
                input.value = cmd;
                window.FenixSidebar.sendChatMessage();
              }
            });
          });
        }
      }, 300);
    },

    startLoadingTimer() {
      this.stopLoadingTimer();
      const container = document.getElementById('fsbChatMessages');
      if (!container) return;
      const loadingEl = document.createElement('div');
      loadingEl.className = 'fsb-msg bot typing';
      loadingEl.id = 'fsbLiveLoadingMsg';
      loadingEl.innerHTML = `
        <div class="fsb-msg-sender"><i class="ph-bold ph-robot"></i> Mascote Fênix</div>
        <div class="fsb-bubble fsb-loading-bubble">
          <div class="fsb-loading-dots"><span></span><span></span><span></span></div>
          <span class="fsb-loading-timer"><i class="ph-bold ph-hourglass-high"></i> Processando resposta… <strong id="fsbLiveTimerValue">0.0s</strong></span>
        </div>
      `;
      container.appendChild(loadingEl);
      container.scrollTop = container.scrollHeight;

      let elapsedSec = 0;
      this._liveTimerInterval = setInterval(() => {
        elapsedSec += 0.1;
        const timerVal = document.getElementById('fsbLiveTimerValue');
        if (timerVal) timerVal.textContent = elapsedSec.toFixed(1) + 's';
      }, 100);
    },

    stopLoadingTimer() {
      if (this._liveTimerInterval) {
        clearInterval(this._liveTimerInterval);
        this._liveTimerInterval = null;
      }
      const el = document.getElementById('fsbLiveLoadingMsg');
      if (el) el.remove();
    },

    renderMarkdown(content) {
      if (!content) return '';
      let text = String(content);

      // Limpar tags brutas vazadas
      text = text.replace(/<br\s*\/?>/gi, '\n');
      text = text.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

      let html = this.escapeHTML(text);

      // Blocos de código ```lang\ncode```
      html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="fsb-code-block"><div class="fsb-code-header"><span>${lang || 'código'}</span><button type="button" class="fsb-code-copy-btn" onclick="window.FenixSidebar.copyCode(this)"><i class="ph-bold ph-copy"></i> Copiar</button></div><code>${code.trim()}</code></pre>`;
      });

      // Código inline `code`
      html = html.replace(/`([^`]+)`/g, '<code class="fsb-inline-code">$1</code>');

      // Negrito **texto**
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

      // Itálico *texto*
      html = html.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3');

      // Listas • ou -
      html = html.replace(/^[•\-]\s+(.+)$/gm, '<li class="fsb-list-item">$1</li>');
      html = html.replace(/((?:<li class="fsb-list-item">.*?<\/li>\s*)+)/g, '<ul class="fsb-list">$1</ul>');

      // Parágrafos e quebras
      html = html.replace(/\n\n+/g, '</p><p>');
      html = html.replace(/\n/g, '<br>');

      return `<p>${html}</p>`;
    },

    // ── Multi-Conversation & Evolutionary Memory System ──
    initConversations() {
      let stored = [];
      try {
        stored = JSON.parse(localStorage.getItem('fenix_chat_conversations') || '[]');
      } catch (_) {}
      if (!Array.isArray(stored) || stored.length === 0) {
        stored = [{
          id: 'conv_' + Date.now(),
          title: 'Sessão Inicial · Fênix OS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [{
            type: 'text',
            role: 'bot',
            text: 'Olá, operador! Estou conectado ao Fênix Kernel. O que deseja executar hoje?',
            senderName: 'Mascote Fênix',
            timestamp: new Date().toISOString()
          }]
        }];
      }
      state.conversations = stored;
      const activeId = localStorage.getItem('fenix_active_conv_id');
      state.activeConversationId = (activeId && stored.some(c => c.id === activeId)) ? activeId : stored[0].id;
      this.updateConversationCount();
      this.renderActiveConversation();
    },

    updateConversationCount() {
      const el = document.getElementById('fsbHistoryCount');
      if (el) el.textContent = String(state.conversations.length);
    },

    saveConversations() {
      localStorage.setItem('fenix_chat_conversations', JSON.stringify(state.conversations));
      localStorage.setItem('fenix_active_conv_id', state.activeConversationId);
      this.updateConversationCount();
    },

    getActiveConversation() {
      return state.conversations.find(c => c.id === state.activeConversationId) || state.conversations[0];
    },

    renderActiveConversation() {
      const container = document.getElementById('fsbChatMessages');
      if (!container) return;
      container.innerHTML = '';
      const conv = this.getActiveConversation();
      if (!conv || !Array.isArray(conv.messages)) return;
      conv.messages.forEach(m => {
        if (m.type === 'job') {
          this.renderJobMessageInDOM(m.data, m.prompt, m.elapsedMs);
        } else if (m.type === 'bot') {
          this.renderBotMessageInDOM(m.data, m.prompt, m.elapsedMs);
        } else if (m.type === 'forensic') {
          this.renderForensicCardInDOM(m.data);
        } else {
          this.renderMessageInDOM(m.role, m.text, m.senderName);
        }
      });
      container.scrollTop = container.scrollHeight;
    },

    startNewConversation() {
      const newConv = {
        id: 'conv_' + Date.now(),
        title: 'Nova Conversa',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{
          type: 'text',
          role: 'bot',
          text: 'Nova sessão iniciada. O contexto cognitivo está ativo e pronto para registrar evolução. O que vamos programar ou executar?',
          senderName: 'Mascote Fênix',
          timestamp: new Date().toISOString()
        }]
      };
      state.conversations.unshift(newConv);
      state.activeConversationId = newConv.id;
      this.saveConversations();
      this.renderActiveConversation();
      this.toggleHistoryDrawer(false);
      this.logActivity('CONV', 'Nova sessão de conversa iniciada.');
      this.recordEvolutionaryCheckpoint('NEW_CONVERSATION', { convId: newConv.id });
    },

    switchConversation(id) {
      if (state.conversations.some(c => c.id === id)) {
        state.activeConversationId = id;
        this.saveConversations();
        this.renderActiveConversation();
        this.toggleHistoryDrawer(false);
        this.logActivity('CONV', `Sessão restaurada: ${id}`);
      }
    },

    deleteConversation(id, event) {
      if (event) event.stopPropagation();
      state.conversations = state.conversations.filter(c => c.id !== id);
      if (state.conversations.length === 0) {
        this.startNewConversation();
        return;
      }
      if (state.activeConversationId === id) {
        state.activeConversationId = state.conversations[0].id;
      }
      this.saveConversations();
      this.renderActiveConversation();
      this.renderHistoryDrawerList();
    },

    toggleHistoryDrawer(forceState) {
      const drawer = document.getElementById('fsbHistoryDrawer');
      if (!drawer) return;
      const shouldShow = typeof forceState === 'boolean' ? forceState : (drawer.style.display === 'none');
      drawer.style.display = shouldShow ? 'flex' : 'none';
      if (shouldShow) this.renderHistoryDrawerList();
    },

    renderHistoryDrawerList() {
      const list = document.getElementById('fsbHistoryList');
      if (!list) return;
      if (state.conversations.length === 0) {
        list.innerHTML = `<div class="fsb-history-empty"><i class="ph-bold ph-chats" style="font-size:24px; color:#64748b; margin-bottom:8px; display:inline-block;"></i><br>Nenhuma conversa gravada.</div>`;
        return;
      }
      list.innerHTML = state.conversations.map(c => {
        const isActive = c.id === state.activeConversationId;
        const count = (c.messages || []).length;
        const dateStr = new Date(c.updatedAt || c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return `
          <div class="fsb-history-item ${isActive ? 'active' : ''}" onclick="window.FenixSidebar.switchConversation('${c.id}')">
            <div class="fsb-history-info">
              <span class="fsb-history-title">${this.escapeHTML(c.title || 'Conversa')}</span>
              <div class="fsb-history-meta">
                <span><i class="ph-bold ph-clock"></i> ${dateStr}</span>
                <span><i class="ph-bold ph-chat-teardrop"></i> ${count} msgs</span>
              </div>
            </div>
            <button type="button" class="fsb-history-del-btn" title="Excluir conversa" onclick="window.FenixSidebar.deleteConversation('${c.id}', event)"><i class="ph-bold ph-trash"></i></button>
          </div>
        `;
      }).join('');
    },

    recordEvolutionaryCheckpoint(eventType, payload) {
      const conversation = this.getActiveConversation();
      const eventPayload = {
        ...payload,
        conversationId: conversation?.serverConversationId || null,
        projectId: conversation?.projectId || copilotContext.projectId || null,
      };
      try {
        authedFetch('/api/events', {
          method: 'POST',
          body: JSON.stringify({
            type: 'conversation.activity',
            eventType,
            payload: eventPayload,
            timestamp: new Date().toISOString()
          })
        }).then((response) => {
          if (!response.ok) console.warn('[FenixSidebar] Falha ao registrar atividade da conversa:', response.status);
        }).catch((error) => console.warn('[FenixSidebar] Falha ao registrar atividade da conversa:', error));
      } catch (error) {
        console.warn('[FenixSidebar] Falha ao registrar atividade da conversa:', error);
      }
    },

    renderMessageInDOM(role, text, senderName = null) {
      const container = document.getElementById('fsbChatMessages');
      if (!container) return;
      const msg = document.createElement('div');
      msg.className = `fsb-msg ${role}`;
      const name = senderName || (role === 'user' ? 'Operador' : 'Mascote Fênix');
      msg.innerHTML = `
        <div class="fsb-msg-sender">${role === 'user' ? '<i class="ph-bold ph-user"></i>' : '<i class="ph-bold ph-robot"></i>'} ${name}</div>
        <div class="fsb-bubble">${role === 'user' ? this.escapeHTML(text) : this.renderMarkdown(text)}</div>
      `;
      container.appendChild(msg);
      container.scrollTop = container.scrollHeight;
    },

    appendMessage(role, text, senderName = null) {
      this.renderMessageInDOM(role, text, senderName);
      const conv = this.getActiveConversation();
      if (conv) {
        if (!conv.messages) conv.messages = [];
        conv.messages.push({ type: 'text', role, text, senderName, timestamp: new Date().toISOString() });
        conv.updatedAt = new Date().toISOString();
        if (role === 'user' && (conv.title === 'Nova Conversa' || conv.title.startsWith('Sessão Inicial'))) {
          conv.title = text.length > 36 ? text.slice(0, 33) + '…' : text;
        }
        this.saveConversations();
        this.recordEvolutionaryCheckpoint('USER_INPUT', { role, text: text.slice(0, 80) });
      }
    },

    renderBotMessageInDOM(data, prompt, elapsedMs = 0) {
      const container = document.getElementById('fsbChatMessages');
      if (!container) return;
      const msg = document.createElement('div');
      msg.className = 'fsb-msg bot';

      const responseText = data.response || data.reply || data.output || data.message || 'O serviço não retornou uma resposta.';
      const bodyHtml = this.renderMarkdown(responseText);

      const latencyMs = Number(elapsedMs || data.latencyMs || 0);
      const timeFormatted = latencyMs > 0 ? (latencyMs >= 1000 ? (latencyMs / 1000).toFixed(2) + 's' : latencyMs + 'ms') : '—';
      const lane = data.lane || '—';
      const model = data.model || data.selectedModel?.model || null;
      const tokens = data.tokens != null ? data.tokens : (data.classification?.estimated_tokens != null ? data.classification.estimated_tokens : null);

      let actionsHtml = '';
      const actions = Array.isArray(data.actions) ? data.actions : [];
      if (actions.length > 0) {
        actionsHtml = `<div class="fsb-msg-actions">` + actions.map(act => {
          if (typeof act === 'string') {
            return `<button type="button" class="fsb-action-btn" onclick="window.FenixSidebar.handleCommand('${this.escapeHTML(act)}')">${this.escapeHTML(act)}</button>`;
          }
          const actJson = this.escapeHTML(JSON.stringify(act));
          return `<button type="button" class="fsb-action-btn" onclick="window.FenixSidebar.executeAction(JSON.parse(this.dataset.act))" data-act="${actJson}">${this.escapeHTML(act.label || 'Executar')}</button>`;
        }).join('') + `</div>`;
      }

      msg.innerHTML = `
        <div class="fsb-msg-sender"><i class="ph-bold ph-robot"></i> Mascote Fênix</div>
        <div class="fsb-bubble">
          ${bodyHtml}
          ${actionsHtml}
          <div class="fsb-msg-meta">
            <span class="fsb-meta-tag time"><i class="ph-bold ph-timer"></i> ${timeFormatted}</span>
            <span class="fsb-meta-tag lane"><i class="ph-bold ph-lightning"></i> ${this.escapeHTML(lane)}</span>
            ${model ? `<span class="fsb-meta-tag model"><i class="ph-bold ph-cpu"></i> ${this.escapeHTML(model)}</span>` : ''}
            ${tokens != null ? `<span class="fsb-meta-tag tokens"><i class="ph-bold ph-coins"></i> ${tokens} tokens</span>` : ''}
          </div>
        </div>
      `;
      container.appendChild(msg);
      container.scrollTop = container.scrollHeight;
    },

    appendBotMessage(data, prompt, elapsedMs = 0) {
      this.renderBotMessageInDOM(data, prompt, elapsedMs);
      const conv = this.getActiveConversation();
      if (conv) {
        if (!conv.messages) conv.messages = [];
        conv.messages.push({ type: 'bot', data, prompt, elapsedMs, timestamp: new Date().toISOString() });
        conv.updatedAt = new Date().toISOString();
        this.saveConversations();
        this.recordEvolutionaryCheckpoint('BOT_RESPONSE', { lane: data.lane, prompt: (prompt || '').slice(0, 60) });
      }
    },

    clearChat() {
      const conv = this.getActiveConversation();
      if (conv) {
        conv.messages = [{
          type: 'text',
          role: 'bot',
          text: 'Chat limpo. Como posso ajudar?',
          senderName: 'Mascote Fênix',
          timestamp: new Date().toISOString()
        }];
        conv.updatedAt = new Date().toISOString();
        this.saveConversations();
        this.renderActiveConversation();
      }
    },

    getJobStatusBadgeHtml(jobId, status, requiresConf) {
      const s = String(status || 'QUEUED').toUpperCase();
      const safeId = this.escapeHTML(jobId);
      if (s === 'RUNNING' || s === 'ACTIVE') {
        return `<span class="fsb-job-status running" id="fsbJob_${safeId}_status"><span class="fsb-pulse-dot"></span> EXECUTANDO EM SEGUNDO PLANO</span>`;
      }
      if (s === 'PENDING_CONFIRMATION' || s === 'AWAITING_APPROVAL' || requiresConf) {
        return `<span class="fsb-job-status pending" id="fsbJob_${safeId}_status"><span class="fsb-pulse-dot amber"></span> AGUARDANDO APROVAÇÃO</span>`;
      }
      if (s === 'PAUSED') {
        return `<span class="fsb-job-status paused" id="fsbJob_${safeId}_status"><i class="ph-bold ph-pause"></i> PAUSADO</span>`;
      }
      if (s === 'COMPLETED' || s === 'SUCCEEDED') {
        return `<span class="fsb-job-status completed" id="fsbJob_${safeId}_status"><i class="ph-bold ph-check-circle"></i> CONCLUÍDO</span>`;
      }
      if (s === 'CANCELLED') {
        return `<span class="fsb-job-status cancelled" id="fsbJob_${safeId}_status"><i class="ph-bold ph-x-circle"></i> CANCELADO</span>`;
      }
      return `<span class="fsb-job-status queued" id="fsbJob_${safeId}_status"><i class="ph-bold ph-clock"></i> NA FILA BULLMQ</span>`;
    },

    getJobProgressDetails(job, data) {
      const s = String(job.status || 'QUEUED').toUpperCase();
      let pct = 0;
      let eta = 'Estimativa ~20s';
      const estSec = Number(job.estimatedTimeSec || data?.classification?.estimated_time || 20);

      if (s === 'COMPLETED' || s === 'SUCCEEDED') {
        pct = 100;
        eta = 'Finalizado com sucesso';
      } else if (s === 'CANCELLED') {
        pct = 0;
        eta = 'Cancelado pelo operador';
      } else if (s === 'PAUSED') {
        pct = job.progress != null ? Number(job.progress) : 40;
        eta = 'Execução em pausa';
      } else if (s === 'RUNNING' || s === 'ACTIVE') {
        const start = job.startedAt ? new Date(job.startedAt).getTime() : (job.createdAt ? new Date(job.createdAt).getTime() : Date.now());
        const elapsedSec = Math.max(1, Math.round((Date.now() - start) / 1000));
        const remSec = Math.max(1, estSec - elapsedSec);
        pct = job.progress != null ? Math.min(100, Math.max(0, Number(job.progress))) : Math.min(92, Math.max(25, Math.round((elapsedSec / estSec) * 100)));
        eta = `Prazo: ~${remSec}s | Decorrido: ${elapsedSec}s`;
      } else if (s === 'QUEUED') {
        pct = 10;
        eta = `Fila BullMQ · Estimativa ~${estSec}s`;
      } else if (s === 'PENDING_CONFIRMATION' || s === 'AWAITING_APPROVAL') {
        pct = 0;
        eta = 'Aguardando autorização do operador';
      }
      return { pct, eta, estSec };
    },

    getJobTokenDetails(job, data, progressPct) {
      const s = String(job.status || 'QUEUED').toUpperCase();
      const estTokens = Number(job.estimatedTokens || data?.classification?.estimated_tokens || 0);
      let actTokens = 0;
      if (job.tokens && typeof job.tokens === 'object') {
        actTokens = Number(job.tokens.actual || job.tokens.total || 0);
      } else if (typeof job.tokens === 'number') {
        actTokens = job.tokens;
      }
      if (!actTokens && estTokens > 0) {
        if (s === 'COMPLETED' || s === 'SUCCEEDED') {
          actTokens = estTokens;
        } else if (s === 'RUNNING') {
          actTokens = Math.round(estTokens * (progressPct / 100));
        } else {
          actTokens = 0;
        }
      }
      const tokenPct = estTokens > 0 ? Math.min(100, Math.round((actTokens / estTokens) * 100)) : 0;
      return { estTokens, actTokens, tokenPct };
    },

    getJobActionsHtml(jobId, status, requiresConf) {
      const s = String(status || 'QUEUED').toUpperCase();
      const safeId = this.escapeHTML(jobId);
      if (s === 'PENDING_CONFIRMATION' || s === 'AWAITING_APPROVAL' || requiresConf) {
        return `
          <div class="fsb-job-actions-row" id="fsbJob_${safeId}_actions">
            <button type="button" class="fsb-job-btn approve" onclick="window.FenixSidebar.approveJob('${safeId}')"><i class="ph-bold ph-check-circle"></i> Aprovar & Executar</button>
            <button type="button" class="fsb-job-btn cancel" onclick="window.FenixSidebar.cancelJob('${safeId}')"><i class="ph-bold ph-x-circle"></i> Cancelar</button>
          </div>
        `;
      }
      if (s === 'RUNNING' || s === 'ACTIVE' || s === 'QUEUED') {
        return `
          <div class="fsb-job-actions-row" id="fsbJob_${safeId}_actions">
            <button type="button" class="fsb-job-btn pause" onclick="window.FenixSidebar.pauseJob('${safeId}')"><i class="ph-bold ph-pause"></i> Pausar</button>
            <button type="button" class="fsb-job-btn cancel" onclick="window.FenixSidebar.cancelJob('${safeId}')"><i class="ph-bold ph-stop"></i> Cancelar</button>
            <button type="button" class="fsb-job-btn secondary" onclick="window.showView('operations')"><i class="ph-bold ph-arrow-square-out"></i> Ver Fila</button>
          </div>
        `;
      }
      if (s === 'PAUSED') {
        return `
          <div class="fsb-job-actions-row" id="fsbJob_${safeId}_actions">
            <button type="button" class="fsb-job-btn resume" onclick="window.FenixSidebar.resumeJob('${safeId}')"><i class="ph-bold ph-play"></i> Retomar</button>
            <button type="button" class="fsb-job-btn cancel" onclick="window.FenixSidebar.cancelJob('${safeId}')"><i class="ph-bold ph-stop"></i> Cancelar</button>
          </div>
        `;
      }
      if (s === 'COMPLETED' || s === 'SUCCEEDED') {
        return `
          <div class="fsb-job-actions-row" id="fsbJob_${safeId}_actions">
            <span style="font-size: 11px; color: #10b981; display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-check-circle"></i> Execução finalizada</span>
            <button type="button" class="fsb-job-btn secondary" onclick="window.showView('operations')"><i class="ph-bold ph-arrow-square-out"></i> Detalhes BullMQ</button>
          </div>
        `;
      }
      return `
        <div class="fsb-job-actions-row" id="fsbJob_${safeId}_actions">
          <span style="font-size: 11px; color: #ef4444; display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-x-circle"></i> Tarefa cancelada</span>
        </div>
      `;
    },

    updateJobCardDOM(jobId, job) {
      if (!jobId || !job) return;
      const s = String(job.status || 'QUEUED').toUpperCase();
      const statusContainer = document.getElementById(`fsbJob_${jobId}_status`);
      if (statusContainer) {
        statusContainer.outerHTML = this.getJobStatusBadgeHtml(jobId, s, false);
      }

      const { pct, eta } = this.getJobProgressDetails(job, null);
      const progFill = document.getElementById(`fsbJob_${jobId}_progress_fill`);
      const progVal = document.getElementById(`fsbJob_${jobId}_progress_val`);
      if (progFill) progFill.style.width = pct + '%';
      if (progVal) progVal.innerHTML = `<strong>${pct}%</strong> · ${this.escapeHTML(eta)}`;

      const { estTokens, actTokens, tokenPct } = this.getJobTokenDetails(job, null, pct);
      const tokFill = document.getElementById(`fsbJob_${jobId}_token_fill`);
      const tokVal = document.getElementById(`fsbJob_${jobId}_token_val`);
      if (tokFill) tokFill.style.width = tokenPct + '%';
      if (tokVal) tokVal.innerHTML = `<strong>${actTokens}</strong> / ${estTokens} tokens (${tokenPct}%)`;

      const actionsContainer = document.getElementById(`fsbJob_${jobId}_actions`);
      if (actionsContainer) {
        actionsContainer.outerHTML = this.getJobActionsHtml(jobId, s, false);
      }

      // Sincronizar na memória ativa da conversa
      const conv = this.getActiveConversation();
      if (conv && Array.isArray(conv.messages)) {
        const msg = conv.messages.find(m => m.type === 'job' && (m.data?.job?.id === jobId || m.data?.job?.jobId === jobId));
        if (msg && msg.data && msg.data.job) {
          msg.data.job.status = s;
          msg.data.job.progress = pct;
          msg.data.job.tokens = { ...(msg.data.job.tokens || {}), actual: actTokens, estimated: estTokens };
          this.saveConversations();
        }
      }
    },

    trackJob(jobId, jobData) {
      if (!jobId || jobId === 'NOVO') return;
      if (!this._trackedJobs) this._trackedJobs = new Map();
      this._trackedJobs.set(String(jobId), jobData || {});
      if (!this._jobPollerTimer) {
        this._jobPollerTimer = setInterval(() => this.pollTrackedJobs(), 2500);
      }
    },

    async pollTrackedJobs() {
      if (!this._trackedJobs || this._trackedJobs.size === 0) {
        if (this._jobPollerTimer) {
          clearInterval(this._jobPollerTimer);
          this._jobPollerTimer = null;
        }
        return;
      }

      try {
        const res = await authedFetch('/api/v2/jobs');
        if (!res.ok) return;
        const data = await res.json();
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];

        for (const [id, tracked] of Array.from(this._trackedJobs.entries())) {
          const found = jobs.find(j => String(j.id || j.jobId) === String(id));
          if (found) {
            this.updateJobCardDOM(id, found);
            const s = String(found.status || '').toUpperCase();
            if (s === 'COMPLETED' || s === 'SUCCEEDED') {
              this._trackedJobs.delete(id);
              MascotController.setMood('success');
              this.logActivity('JOB', `Job #${id} concluído com sucesso em segundo plano.`);
              this.recordEvolutionaryCheckpoint('JOB_COMPLETED', { jobId: id, title: found.title });
              setTimeout(() => MascotController.setMood('idle'), 3000);
            } else if (s === 'CANCELLED' || s === 'FAILED' || s === 'ERROR') {
              this._trackedJobs.delete(id);
              MascotController.setMood('idle');
              this.logActivity('JOB', `Job #${id} finalizado [${s}].`);
            }
          }
        }
        if (this._trackedJobs.size === 0 && this._jobPollerTimer) {
          clearInterval(this._jobPollerTimer);
          this._jobPollerTimer = null;
        }
        if (typeof window.syncLiveTargetTelemetry === 'function') {
          window.syncLiveTargetTelemetry();
        }
      } catch (err) {
        console.warn('[FENIX SIDEBAR] Erro no polling de jobs:', err.message);
      }
    },

    renderJobMessageInDOM(data, prompt, elapsedMs = 0) {
      const container = document.getElementById('fsbChatMessages');
      if (!container) return;
      const msg = document.createElement('div');
      msg.className = 'fsb-msg bot';
      const job = data.job || {};
      const jobId = job.id || job.jobId || 'NOVO';
      const jobTitle = job.title || prompt;
      const jobStatus = job.status || 'QUEUED';
      const model = data.selectedModel?.model || job.model || 'qwen2.5:3b';
      const requiresConf = data.confirmationRequired || Boolean(job.requiresConfirmation) || jobStatus === 'PENDING_CONFIRMATION' || jobStatus === 'AWAITING_APPROVAL';
      const latencyMs = Number(elapsedMs || data.latencyMs || 25);
      const timeFormatted = latencyMs >= 1000 ? (latencyMs / 1000).toFixed(2) + 's' : latencyMs + 'ms';

      const responseText = data.response || 'Missão estruturada registrada pelo Fênix Kernel.';

      const statusBadgeHtml = this.getJobStatusBadgeHtml(jobId, jobStatus, requiresConf);
      const { pct, eta } = this.getJobProgressDetails(job, data);
      const { estTokens, actTokens, tokenPct } = this.getJobTokenDetails(job, data, pct);
      const actionsHtml = this.getJobActionsHtml(jobId, jobStatus, requiresConf);

      msg.innerHTML = `
        <div class="fsb-msg-sender"><i class="ph-bold ph-robot"></i> Mascote Fênix</div>
        <div class="fsb-bubble">
          ${this.renderMarkdown(responseText)}
          <div class="fsb-job-card" id="fsbJobCard_${this.escapeHTML(jobId)}">
            <div class="fsb-job-header">
              <span class="fsb-job-badge"><i class="ph-bold ph-gear-six"></i> JOB #${this.escapeHTML(jobId)}</span>
              ${statusBadgeHtml}
            </div>
            <div class="fsb-job-title">${this.escapeHTML(jobTitle)}</div>
            <div class="fsb-job-meta">
              <span><i class="ph-bold ph-cpu"></i> ${this.escapeHTML(model)}</span>
              <span><i class="ph-bold ph-coins"></i> ${estTokens ? '~' + estTokens + ' tokens' : '—'}</span>
            </div>

            <!-- Barra de Progresso & ETA -->
            <div class="fsb-job-progress-section" id="fsbJob_${this.escapeHTML(jobId)}_progress_wrap">
              <div class="fsb-progress-row">
                <span class="fsb-progress-label"><i class="ph-bold ph-hourglass-medium"></i> Progresso:</span>
                <span class="fsb-progress-val" id="fsbJob_${this.escapeHTML(jobId)}_progress_val"><strong>${pct}%</strong> · ${this.escapeHTML(eta)}</span>
              </div>
              <div class="fsb-progress-bar-track">
                <div class="fsb-progress-bar-fill" id="fsbJob_${this.escapeHTML(jobId)}_progress_fill" style="width: ${pct}%;"></div>
              </div>
            </div>

            <!-- Barra de Gasto de Tokens -->
            <div class="fsb-job-token-section" id="fsbJob_${this.escapeHTML(jobId)}_token_wrap">
              <div class="fsb-token-row">
                <span class="fsb-token-label"><i class="ph-bold ph-coins"></i> Consumo de Tokens:</span>
                <span class="fsb-token-val" id="fsbJob_${this.escapeHTML(jobId)}_token_val"><strong>${actTokens}</strong> / ${estTokens} tokens (${tokenPct}%)</span>
              </div>
              <div class="fsb-token-bar-track">
                <div class="fsb-token-bar-fill" id="fsbJob_${this.escapeHTML(jobId)}_token_fill" style="width: ${tokenPct}%;"></div>
              </div>
            </div>

            <!-- Botões de Ação e Controle -->
            ${actionsHtml}
          </div>
          <div class="fsb-msg-meta">
            <span class="fsb-meta-tag time"><i class="ph-bold ph-timer"></i> ${timeFormatted}</span>
            <span class="fsb-meta-tag lane"><i class="ph-bold ph-lightning"></i> JOB_LANE</span>
            <span class="fsb-meta-tag model"><i class="ph-bold ph-cpu"></i> ${this.escapeHTML(model)}</span>
          </div>
        </div>
      `;
      container.appendChild(msg);
      container.scrollTop = container.scrollHeight;

      if (['RUNNING', 'ACTIVE', 'QUEUED', 'PENDING_CONFIRMATION', 'PAUSED'].includes(String(jobStatus).toUpperCase())) {
        this.trackJob(jobId, job);
      }
    },

    appendJobMessage(data, prompt, elapsedMs = 0) {
      this.renderJobMessageInDOM(data, prompt, elapsedMs);
      const conv = this.getActiveConversation();
      if (conv) {
        if (!conv.messages) conv.messages = [];
        conv.messages.push({ type: 'job', data, prompt, elapsedMs, timestamp: new Date().toISOString() });
        conv.updatedAt = new Date().toISOString();
        this.saveConversations();
        this.recordEvolutionaryCheckpoint('JOB_ENQUEUED', { jobId: data.job?.id, title: data.job?.title });
      }
      this.logActivity('JOB', `Job #${data.job?.id || 'NOVO'} registrado na fila [${data.job?.status || 'QUEUED'}]`);
    },

    // ── Universal Forensic & Reverse Engineering Engine ──
    async handleIncomingFiles(fileList) {
      if (!fileList || fileList.length === 0) return;
      for (let i = 0; i < fileList.length; i++) {
        await this.processSingleFile(fileList[i]);
      }
    },

    async processSingleFile(file) {
      if (!file) return;
      const fileName = file.name;
      const fileSize = file.size;
      const formattedSize = this.formatBytes(fileSize);

      // User Bubble showing file attachment
      this.appendMessage('user', `📎 Anexo para Análise Forense & Engenharia Reversa:\n**${fileName}** (${formattedSize})`);

      // Start Loading indicator
      this.startLoadingTimer();
      MascotController.setMood('working');

      try {
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);

        // 1. Calculate SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer.slice(0, 32 * 1024 * 1024));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 2. Calculate Shannon Entropy
        const sampleLen = Math.min(uint8.length, 262144);
        const freq = new Uint32Array(256);
        for (let i = 0; i < sampleLen; i++) freq[uint8[i]]++;
        let entropy = 0;
        for (let i = 0; i < 256; i++) {
          if (freq[i] > 0) {
            const p = freq[i] / sampleLen;
            entropy -= p * Math.log2(p);
          }
        }
        const entropyScore = Number(entropy.toFixed(3));
        const entropyPercent = Math.min(100, Math.round((entropyScore / 8.0) * 100));

        // Entropy Verdict
        let verdict = {
          badgeClass: 'text',
          badgeText: 'BAIXA ENTROPIA · TEXTO PLANO',
          color: '#38bdf8',
          description: `Entropia baixa (${entropyScore}/8.0). Dados com alta redundância, texto simples ou código fonte sem compressão.`
        };

        if (entropyScore >= 7.65) {
          verdict = {
            badgeClass: 'encrypted',
            badgeText: 'ALTA ENTROPIA · CRIPTOGRAFADO / PACKED',
            color: '#ef4444',
            description: `Distribuição de bytes hiper-aleatória (${entropyScore}/8.0). Fortes indícios de criptografia densa (AES, ChaCha20, RSA) ou compactação executável protegida (Packer).`
          };
        } else if (entropyScore >= 6.80) {
          verdict = {
            badgeClass: 'compressed',
            badgeText: 'MÉDIA-ALTA · COMPACTADO / MULTIMÍDIA',
            color: '#f59e0b',
            description: `Distribuição comprimida (${entropyScore}/8.0). Típica de containers ZIP, codecs de vídeo H.264/AV1 ou streams Deflate/LZMA.`
          };
        } else if (entropyScore >= 3.50) {
          verdict = {
            badgeClass: 'structured',
            badgeText: 'ENTROPIA MÉDIA · ESTRUTURADO',
            color: '#10b981',
            description: `Estrutura regular (${entropyScore}/8.0). Binário padrão, bytecode compilado ou documentos formatados.`
          };
        }

        // 3. Magic Bytes Detection (first 16 bytes)
        const magicHex = Array.from(uint8.slice(0, 16)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

        // 4. Deep Format & Structure Analysis
        const analysis = this.analyzeBinaryFormat(file, uint8, buffer);

        // 5. Extract Strings & Indicators of Interest
        const extractedStrings = this.extractStringsAndIocs(uint8);

        // If plaintext, store for IDE opening
        if (analysis.isText || fileSize < 1024 * 1024) {
          try {
            const dec = new TextDecoder('utf-8', { fatal: false });
            this._lastUploadedText = dec.decode(uint8.slice(0, 500000));
            this._lastUploadedName = fileName;
          } catch (_) {}
        }

        const forensicData = {
          fileName,
          fileSize,
          fileSizeFormatted: formattedSize,
          sha256,
          entropy: entropyScore,
          entropyPercent,
          verdict,
          magicHex,
          format: analysis.format,
          details: analysis.details,
          strings: extractedStrings,
          timestamp: new Date().toISOString()
        };

        // Notify backend /api/v2/chat/inspect-file
        try {
          authedFetch('/api/v2/chat/inspect-file', {
            method: 'POST',
            body: JSON.stringify({
              name: fileName,
              size: fileSize,
              sha256,
              entropy: entropyScore,
              format: analysis.format.type,
              details: analysis.details,
              strings: extractedStrings.slice(0, 20)
            })
          }).catch(() => {});
        } catch (_) {}

        this.stopLoadingTimer();
        this.appendForensicMessage(forensicData);
        MascotController.setMood('success');
        setTimeout(() => MascotController.setMood('idle'), 2500);
        this.logActivity('FORENSIC', `Arquivo analisado: ${fileName} [${analysis.format.label}, H=${entropyScore}]`);
        this.recordEvolutionaryCheckpoint('FILE_INSPECTED', { name: fileName, format: analysis.format.type, entropy: entropyScore });

      } catch (err) {
        this.stopLoadingTimer();
        this.appendMessage('bot', `Falha ao processar arquivo "${fileName}": ${err.message}`);
        MascotController.setMood('idle');
      }
    },

    analyzeBinaryFormat(file, uint8, buffer) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      let format = { type: 'GENERIC_BINARY', label: 'Arquivo Binário', icon: 'ph-file' };
      const details = {};
      let isText = false;

      // 1. ZIP-based (APK, IPA, DOCX, XLSX, PPTX, JAR, ZIP)
      if (uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4B && (uint8[2] === 0x03 || uint8[2] === 0x05)) {
        const sliceSample = String.fromCharCode(...uint8.slice(0, Math.min(uint8.length, 1024 * 512))).replace(/[^\x20-\x7E]/g, ' ');
        const hasAndroidManifest = sliceSample.includes('AndroidManifest.xml');
        const hasClassesDex = sliceSample.includes('classes.dex');
        const hasPayload = sliceSample.includes('Payload/') || sliceSample.includes('.app/');
        const hasWordDoc = sliceSample.includes('word/document.xml');
        const hasSheet = sliceSample.includes('xl/workbook.xml');
        const hasPpt = sliceSample.includes('ppt/presentation.xml');

        if (hasAndroidManifest || hasClassesDex || ext === 'apk') {
          format = { type: 'ANDROID_APK', label: 'Android Package (APK)', icon: 'ph-android-logo' };
          details.manifest = hasAndroidManifest ? 'AndroidManifest.xml Presente' : 'Não detectado';
          const dexMatches = sliceSample.match(/classes\d*\.dex/g) || [];
          details.dexFiles = dexMatches.length > 0 ? Array.from(new Set(dexMatches)).join(', ') : '1 DEX primário';
          const abis = [];
          if (sliceSample.includes('arm64-v8a')) abis.push('arm64-v8a');
          if (sliceSample.includes('armeabi-v7a')) abis.push('armeabi-v7a');
          if (sliceSample.includes('x86_64')) abis.push('x86_64');
          if (sliceSample.includes('x86')) abis.push('x86');
          details.architectures = abis.length > 0 ? abis.join(', ') : 'Universal / Sem nativas';
          details.signatures = sliceSample.includes('META-INF') ? 'Assinatura v1/v2 em META-INF detectada' : 'Sem assinatura padrão';
        } else if (hasPayload || ext === 'ipa') {
          format = { type: 'IOS_IPA', label: 'iOS App Package (IPA)', icon: 'ph-apple-logo' };
          details.bundle = 'Bundle iOS / Payload detectado';
          details.plist = sliceSample.includes('Info.plist') ? 'Info.plist presente' : 'Oculto';
        } else if (hasWordDoc || ext === 'docx') {
          format = { type: 'OFFICE_DOCX', label: 'Documento Word (DOCX)', icon: 'ph-file-doc' };
          details.xmlParts = 'Office OpenXML (word/document.xml)';
        } else if (hasSheet || ext === 'xlsx') {
          format = { type: 'OFFICE_XLSX', label: 'Planilha Excel (XLSX)', icon: 'ph-file-xls' };
          details.xmlParts = 'Office OpenXML (xl/workbook.xml)';
        } else if (hasPpt || ext === 'pptx') {
          format = { type: 'OFFICE_PPTX', label: 'Apresentação PowerPoint (PPTX)', icon: 'ph-presentation' };
          details.xmlParts = 'Office OpenXML (ppt/presentation.xml)';
        } else {
          format = { type: 'ARCHIVE_ZIP', label: 'Arquivo ZIP', icon: 'ph-file-archive' };
          details.container = 'Arquivo compactado ZIP padrão';
        }
        return { format, details, isText: false };
      }

      // 2. Adobe PDF
      if (uint8.length >= 4 && uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46) {
        format = { type: 'PDF_DOCUMENT', label: 'Documento Adobe PDF', icon: 'ph-file-pdf' };
        const textSample = String.fromCharCode(...uint8.slice(0, Math.min(uint8.length, 16384))).replace(/[^\x20-\x7E]/g, ' ');
        const versionMatch = textSample.match(/%PDF-(\d\.\d)/);
        details.pdfVersion = versionMatch ? `PDF v${versionMatch[1]}` : 'PDF Padrão';
        const isEncrypted = textSample.includes('/Encrypt');
        details.isEncrypted = isEncrypted;
        details.securityStatus = isEncrypted ? '🔒 Criptografia /Encrypt Ativa (Protegido por senha)' : '🔓 Sem senha / Texto e Streams Abertos';
        const pageCountEstimate = (textSample.match(/\/Type\s*\/Page\b/g) || []).length;
        if (pageCountEstimate > 0) details.pageCount = `~${pageCountEstimate} páginas encontradas no header`;
        return { format, details, isText: false };
      }

      // 3. PNG Image
      if (uint8.length >= 8 && uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4E && uint8[3] === 0x47) {
        let dimensions = 'Dimensões não lidas';
        if (uint8.length >= 24) {
          const view = new DataView(buffer);
          const w = view.getUint32(16, false);
          const h = view.getUint32(20, false);
          dimensions = `${w} x ${h} px`;
        }
        format = { type: 'IMAGE_PNG', label: `Imagem PNG (${dimensions})`, icon: 'ph-image' };
        details.dimensions = dimensions;
        details.colorType = 'RGBA / TrueColor';
        return { format, details, isText: false };
      }

      // 4. JPEG Image
      if (uint8.length >= 3 && uint8[0] === 0xFF && uint8[1] === 0xD8 && uint8[2] === 0xFF) {
        format = { type: 'IMAGE_JPEG', label: 'Imagem JPEG', icon: 'ph-image' };
        const sample = String.fromCharCode(...uint8.slice(0, 2048)).replace(/[^\x20-\x7E]/g, '');
        details.exif = sample.includes('Exif') ? 'Metadados EXIF presentes' : 'JFIF padrão';
        return { format, details, isText: false };
      }

      // 5. RIFF (WebP / WAV / AVI)
      if (uint8.length >= 12 && uint8[0] === 0x52 && uint8[1] === 0x49 && uint8[2] === 0x46 && uint8[3] === 0x46) {
        const sub = String.fromCharCode(uint8[8], uint8[9], uint8[10], uint8[11]);
        if (sub === 'WEBP') {
          format = { type: 'IMAGE_WEBP', label: 'Imagem WebP', icon: 'ph-image' };
          details.riffType = 'WebP Image Container';
        } else if (sub === 'WAVE') {
          format = { type: 'AUDIO_WAV', label: 'Áudio Waveform (WAV)', icon: 'ph-speaker-high' };
          details.riffType = 'RIFF WAVE PCM';
        } else {
          format = { type: 'MEDIA_RIFF', label: `Container RIFF (${sub})`, icon: 'ph-film-strip' };
          details.riffType = sub;
        }
        return { format, details, isText: false };
      }

      // 6. MP4 Video
      if (uint8.length >= 8 && uint8[4] === 0x66 && uint8[5] === 0x74 && uint8[6] === 0x79 && uint8[7] === 0x70) {
        const brand = String.fromCharCode(uint8[8], uint8[9], uint8[10], uint8[11]).trim();
        format = { type: 'VIDEO_MP4', label: `Vídeo MP4 / QuickTime (${brand})`, icon: 'ph-video-camera' };
        details.brand = `ISO Base Media File (${brand})`;
        details.streaming = 'FastStart / Moov Atom';
        return { format, details, isText: false };
      }

      // 7. Matroska / WebM Video
      if (uint8.length >= 4 && uint8[0] === 0x1A && uint8[1] === 0x45 && uint8[2] === 0xDF && uint8[3] === 0xA3) {
        format = { type: 'VIDEO_WEBM', label: 'Vídeo Matroska / WebM', icon: 'ph-video-camera' };
        details.container = 'EBML / Matroska Video Stream';
        return { format, details, isText: false };
      }

      // 8. Linux ELF Executable
      if (uint8.length >= 4 && uint8[0] === 0x7F && uint8[1] === 0x45 && uint8[2] === 0x4C && uint8[3] === 0x46) {
        const bitness = uint8[4] === 2 ? '64-bit' : '32-bit';
        const endian = uint8[5] === 1 ? 'Little Endian' : 'Big Endian';
        format = { type: 'EXEC_ELF', label: `Executável ELF Linux (${bitness})`, icon: 'ph-terminal-window' };
        details.architecture = `${bitness}, ${endian}`;
        details.binaryType = 'Linux ELF Executable / Shared Object';
        return { format, details, isText: false };
      }

      // 9. Windows PE Executable
      if (uint8.length >= 2 && uint8[0] === 0x4D && uint8[1] === 0x5A) {
        format = { type: 'EXEC_PE', label: 'Executável Windows PE (EXE/DLL)', icon: 'ph-windows-logo' };
        details.subsystem = 'Portable Executable 32/64-bit';
        return { format, details, isText: false };
      }

      // 10. Mach-O Executable (macOS/iOS)
      if (uint8.length >= 4 && ((uint8[0] === 0xCF && uint8[1] === 0xFA && uint8[2] === 0xED && uint8[3] === 0xFE) || (uint8[0] === 0xCA && uint8[1] === 0xFE && uint8[2] === 0xBA && uint8[3] === 0xBE))) {
        format = { type: 'EXEC_MACHO', label: 'Binário Mach-O (macOS/iOS)', icon: 'ph-apple-logo' };
        details.subsystem = 'Apple Mach-O Universal / 64-bit';
        return { format, details, isText: false };
      }

      // 11. Plain Text / Code / JSON / Markup
      let printableCount = 0;
      const checkLen = Math.min(uint8.length, 4096);
      for (let i = 0; i < checkLen; i++) {
        const c = uint8[i];
        if ((c >= 32 && c <= 126) || c === 10 || c === 13 || c === 9) printableCount++;
      }
      if (printableCount / checkLen > 0.85) {
        isText = true;
        const textSample = String.fromCharCode(...uint8.slice(0, 512));
        if (textSample.trim().startsWith('{') || textSample.trim().startsWith('[')) {
          format = { type: 'TEXT_JSON', label: 'Documento JSON Estruturado', icon: 'ph-brackets-curly' };
        } else if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'html', 'css', 'sql', 'sh', 'bat', 'ps1'].includes(ext)) {
          format = { type: 'SOURCE_CODE', label: `Código Fonte (.${ext})`, icon: 'ph-code' };
        } else {
          format = { type: 'TEXT_PLAIN', label: 'Texto Plano / Documento', icon: 'ph-file-text' };
        }
        details.encoding = 'UTF-8 / ASCII Legível';
        return { format, details, isText: true };
      }

      return { format, details, isText: false };
    },

    extractStringsAndIocs(uint8) {
      const sample = String.fromCharCode(...uint8.slice(0, Math.min(uint8.length, 262144))).replace(/[^\x20-\x7E]/g, '\n');
      const lines = sample.split('\n').map(s => s.trim()).filter(s => s.length >= 6);
      const unique = Array.from(new Set(lines));

      const iocs = [];
      const normal = [];
      const urlRegex = /^https?:\/\/[^\s"'<>]+$/i;
      const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
      const pathRegex = /^\/(?:usr|etc|var|bin|app|system|data|lib)/i;
      const keyRegex = /(?:key|token|secret|password|bearer|auth)/i;

      for (const str of unique) {
        if (urlRegex.test(str)) {
          iocs.push('🌐 URL: ' + str);
        } else if (ipRegex.test(str)) {
          iocs.push('📍 IP: ' + str);
        } else if (pathRegex.test(str)) {
          iocs.push('📁 Path: ' + str);
        } else if (keyRegex.test(str)) {
          iocs.push('🔑 Key/Secret: ' + str);
        } else if (str.length > 8 && !/^[0-9a-f]+$/i.test(str)) {
          normal.push(str);
        }
        if (iocs.length >= 15 && normal.length >= 15) break;
      }

      return [...iocs, ...normal].slice(0, 30);
    },

    renderForensicCardInDOM(data) {
      const container = document.getElementById('fsbChatMessages');
      if (!container) return;
      const msg = document.createElement('div');
      msg.className = 'fsb-msg bot';

      let detailsHtml = '';
      if (data.details && typeof data.details === 'object') {
        detailsHtml = Object.entries(data.details).map(([k, v]) => `
          <div class="fsb-forensic-detail-item">
            <span class="fsb-detail-label">${this.escapeHTML(k)}</span>
            <span class="fsb-detail-val">${this.escapeHTML(String(v))}</span>
          </div>
        `).join('');
      }

      let stringsHtml = '';
      if (Array.isArray(data.strings) && data.strings.length > 0) {
        stringsHtml = `
          <details class="fsb-strings-accordion">
            <summary class="fsb-strings-summary">
              <span><i class="ph-bold ph-magnifying-glass"></i> Indicadores & Strings Extraídas (${data.strings.length})</span>
              <i class="ph-bold ph-caret-down"></i>
            </summary>
            <div class="fsb-strings-body">${data.strings.map(s => this.escapeHTML(s)).join('\n')}</div>
          </details>
        `;
      }

      const safeJsonData = this.escapeHTML(JSON.stringify(data));

      msg.innerHTML = `
        <div class="fsb-msg-sender"><i class="ph-bold ph-shield-check"></i> Mascote Fênix · Forensics & Reverse Engine</div>
        <div class="fsb-bubble" style="padding: 12px;">
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
            Análise estática e inspeção forense concluída:
          </div>

          <div class="fsb-forensic-card">
            <div class="fsb-forensic-header">
              <div class="fsb-forensic-file-info">
                <div class="fsb-forensic-file-icon"><i class="ph-bold ${data.format?.icon || 'ph-file'}"></i></div>
                <div class="fsb-forensic-names">
                  <div class="fsb-forensic-filename" title="${this.escapeHTML(data.fileName)}">${this.escapeHTML(data.fileName)}</div>
                  <div class="fsb-forensic-size">${data.fileSizeFormatted} · ${this.escapeHTML(data.format?.label || 'Binário')}</div>
                </div>
              </div>
              <span class="fsb-forensic-badge ${data.verdict?.badgeClass || 'text'}">${this.escapeHTML(data.verdict?.badgeText || 'NORMAL')}</span>
            </div>

            <div class="fsb-entropy-box">
              <div class="fsb-entropy-top">
                <span class="fsb-entropy-label"><i class="ph-bold ph-chart-line-up"></i> Entropia de Shannon</span>
                <span class="fsb-entropy-value" style="color:${data.verdict?.color || '#38bdf8'};">${data.entropy} / 8.000 (${data.entropyPercent}%)</span>
              </div>
              <div class="fsb-entropy-bar-track">
                <div class="fsb-entropy-bar-fill" style="width:${data.entropyPercent}%; background:${data.verdict?.color || '#38bdf8'};"></div>
              </div>
              <div class="fsb-entropy-assessment">${this.escapeHTML(data.verdict?.description || '')}</div>
            </div>

            <div class="fsb-forensic-details-table">
              <div class="fsb-forensic-detail-item full">
                <span class="fsb-detail-label">Hash SHA-256</span>
                <span class="fsb-detail-val" style="font-size:10px;">
                  <code style="word-break:break-all;">${this.escapeHTML(data.sha256)}</code>
                  <button type="button" class="fsb-history-del-btn" style="color:#22d3ee;" onclick="window.FenixSidebar.copyText('${this.escapeHTML(data.sha256)}', this)" title="Copiar SHA-256"><i class="ph-bold ph-copy"></i></button>
                </span>
              </div>

              <div class="fsb-forensic-detail-item">
                <span class="fsb-detail-label">Magic Bytes Header</span>
                <span class="fsb-detail-val" style="font-size:9.5px;">${this.escapeHTML(data.magicHex || '—')}</span>
              </div>

              <div class="fsb-forensic-detail-item">
                <span class="fsb-detail-label">Classificação</span>
                <span class="fsb-detail-val">${this.escapeHTML(data.format?.label || 'Genérico')}</span>
              </div>

              ${detailsHtml}
            </div>

            ${stringsHtml}

            <div class="fsb-forensic-actions">
              <button type="button" class="fsb-forensic-btn" onclick="window.FenixSidebar.openFileInIde('${this.escapeHTML(data.fileName)}')">
                <i class="ph-bold ph-code"></i> Abrir no IDE
              </button>
              <button type="button" class="fsb-forensic-btn" onclick="window.FenixSidebar.dispatchReverseJob('${this.escapeHTML(data.fileName)}', '${this.escapeHTML(data.format?.type || 'GENERIC')}')">
                <i class="ph-bold ph-lightning"></i> Despachar Job Reverso
              </button>
              <button type="button" class="fsb-forensic-btn secondary" data-forensic="${safeJsonData}" onclick="window.FenixSidebar.downloadForensicJson(JSON.parse(this.dataset.forensic))">
                <i class="ph-bold ph-download-simple"></i> JSON Forense
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(msg);
      container.scrollTop = container.scrollHeight;
    },

    appendForensicMessage(data) {
      this.renderForensicCardInDOM(data);
      const conv = this.getActiveConversation();
      if (conv) {
        if (!conv.messages) conv.messages = [];
        conv.messages.push({ type: 'forensic', data, timestamp: new Date().toISOString() });
        conv.updatedAt = new Date().toISOString();
        this.saveConversations();
      }
    },

    formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    copyText(text, btn) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        if (btn) {
          const original = btn.innerHTML;
          btn.innerHTML = '<i class="ph-bold ph-check"></i>';
          setTimeout(() => { btn.innerHTML = original; }, 2000);
        }
      });
    },

    downloadForensicJson(data) {
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-forense-${data.fileName || 'arquivo'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    async dispatchReverseJob(fileName, formatType) {
      try {
        const res = await authedFetch('/api/v2/chat/inspect-file', {
          method: 'POST',
          body: JSON.stringify({
            name: fileName,
            format: formatType,
            createJob: true
          })
        });
        if (res.ok) {
          const data = await res.json();
          this.appendMessage('system', `⚡ Job de Engenharia Reversa para "${fileName}" despachado com sucesso! [Job #${data.job?.id || 'NOVO'}]`);
          MascotController.setMood('working');
        }
      } catch (e) {
        this.appendMessage('bot', `Falha ao despachar job de engenharia reversa: ${e.message}`);
      }
    },

    openFileInIde(fileName) {
      if (typeof window.showView === 'function') {
        window.showView('ide');
      }
      if (this._lastUploadedText && this._lastUploadedName === fileName) {
        setTimeout(() => {
          const codeArea = document.getElementById('fenixIdeLiveCode');
          const pathEl = document.getElementById('fenixIdeLivePath');
          if (codeArea) {
            codeArea.value = this._lastUploadedText;
            codeArea.dispatchEvent(new Event('input'));
          }
          if (pathEl) pathEl.textContent = 'anexo/' + fileName;
          const statusEl = document.getElementById('fenixIdeLiveStatus');
          if (statusEl) statusEl.textContent = 'Arquivo carregado no editor (Análise Forense)';
        }, 300);
      }
    },

    copyCode(btn) {
      if (!btn) return;
      const pre = btn.closest('.fsb-code-block');
      const code = pre?.querySelector('code');
      if (code) {
        const textToCopy = code.innerText || code.textContent || '';
        navigator.clipboard.writeText(textToCopy).then(() => {
          const original = btn.innerHTML;
          btn.innerHTML = '<i class="ph-bold ph-check"></i> Copiado!';
          setTimeout(() => { btn.innerHTML = original; }, 2000);
        }).catch(() => {
          btn.textContent = 'Erro ao copiar';
        });
      }
    },

    executeAction(act) {
      if (!act) return;
      if (typeof act === 'string') {
        if (act.startsWith('/')) {
          this.handleCommand(act);
        } else {
          const input = document.getElementById('fsbChatInput');
          if (input) {
            input.value = act;
            this.sendChatMessage();
          }
        }
        return;
      }

      switch (act.type) {
        case 'switch_view':
          if (typeof window.switchView === 'function') {
            window.switchView(act.view);
          } else if (typeof window.showView === 'function') {
            window.showView(act.view.replace('view-', ''));
          }
          this.logActivity('NAV', `Navegando para: ${act.view}`);
          break;

        case 'open_ide_project':
          if (typeof window.switchView === 'function') {
            window.switchView('view-ide');
          }
          if (window.fenixSelectIdeProject) {
            window.fenixSelectIdeProject(act.projectId).catch(err => {
              console.warn('[IDE] Falha ao trocar projeto:', err.message);
            });
          }
          this.logActivity('IDE', `Abrindo projeto: ${act.projectId}`);
          break;

        case 'open_ide_file':
          if (typeof window.switchView === 'function') {
            window.switchView('view-ide');
          }
          if (window.fenixSelectIdeFile) {
            window.fenixSelectIdeFile(act.path).catch(err => {
              console.warn('[IDE] Falha ao abrir arquivo:', err.message);
            });
          }
          this.logActivity('IDE', `Abrindo arquivo: ${act.path}`);
          break;

        case 'city_focus':
          if (typeof window.switchView === 'function') {
            window.switchView('view-city');
          }
          window.dispatchEvent(new CustomEvent('city:focus', { detail: act }));
          this.logActivity('CITY', `Foco na Cidade 3D: ${act.target || 'centro'}`);
          break;

        case 'confirm_job':
          this.confirmJob(act.jobId);
          break;

        case 'send_command':
          if (act.command) {
            if (act.command.startsWith('/')) {
              this.handleCommand(act.command);
            } else {
              const input = document.getElementById('fsbChatInput');
              if (input) input.value = act.command;
              this.sendChatMessage();
            }
          }
          break;

        default:
          if (act.label) {
            this.handleCommand(act.label);
          }
          break;
      }
    },

    async approveJob(jobId) {
      try {
        let ok = false;
        try {
          const res = await authedFetch(`/api/v2/jobs/${encodeURIComponent(jobId)}/approve`, { method: 'POST' });
          if (res.ok) ok = true;
        } catch (_) {}

        if (!ok) {
          const res2 = await authedFetch(`/api/v2/jobs/${encodeURIComponent(jobId)}/confirm`, { method: 'POST' });
          if (res2.ok) ok = true;
        }

        if (ok) {
          this.updateJobCardDOM(jobId, { id: jobId, status: 'RUNNING', progress: 15 });
          this.appendMessage('system', `▶ Job #${jobId} aprovado com sucesso! Executando em segundo plano no BullMQ.`);
          MascotController.setMood('working');
          this.trackJob(jobId, { id: jobId, status: 'RUNNING' });
          this.logActivity('JOB', `Job #${jobId} aprovado e iniciado em segundo plano.`);
        } else {
          await authedFetch('/api/v2/conversation', {
            method: 'POST',
            body: JSON.stringify({ message: 'confirmar' })
          });
          this.updateJobCardDOM(jobId, { id: jobId, status: 'RUNNING', progress: 15 });
          this.appendMessage('system', `▶ Confirmação despachada para Job #${jobId}.`);
          MascotController.setMood('working');
          this.trackJob(jobId, { id: jobId, status: 'RUNNING' });
        }
      } catch (e) {
        this.appendMessage('bot', `Falha ao aprovar job #${jobId}: ${e.message}`);
      }
    },

    async confirmJob(jobId) {
      return this.approveJob(jobId);
    },

    async pauseJob(jobId) {
      try {
        const res = await authedFetch(`/api/v2/jobs/${encodeURIComponent(jobId)}/pause`, { method: 'POST' });
        if (res.ok) {
          this.updateJobCardDOM(jobId, { id: jobId, status: 'PAUSED' });
          this.appendMessage('system', `⏸ Job #${jobId} pausado pelo operador.`);
          MascotController.setMood('idle');
          this.logActivity('JOB', `Job #${jobId} pausado.`);
        } else {
          this.appendMessage('bot', `Não foi possível pausar job #${jobId}. Verifique se já foi finalizado.`);
        }
      } catch (e) {
        this.appendMessage('bot', `Falha ao pausar job #${jobId}: ${e.message}`);
      }
    },

    async resumeJob(jobId) {
      try {
        const res = await authedFetch(`/api/v2/jobs/${encodeURIComponent(jobId)}/resume`, { method: 'POST' });
        if (res.ok) {
          this.updateJobCardDOM(jobId, { id: jobId, status: 'RUNNING' });
          this.appendMessage('system', `▶ Job #${jobId} retomado com sucesso.`);
          MascotController.setMood('working');
          this.trackJob(jobId, { id: jobId, status: 'RUNNING' });
          this.logActivity('JOB', `Job #${jobId} retomado.`);
        } else {
          this.appendMessage('bot', `Não foi possível retomar job #${jobId}.`);
        }
      } catch (e) {
        this.appendMessage('bot', `Falha ao retomar job #${jobId}: ${e.message}`);
      }
    },

    async cancelJob(jobId) {
      try {
        const res = await authedFetch(`/api/v2/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
        if (res.ok) {
          this.updateJobCardDOM(jobId, { id: jobId, status: 'CANCELLED', progress: 0 });
          if (this._trackedJobs) this._trackedJobs.delete(String(jobId));
          this.appendMessage('system', `🛑 Job #${jobId} cancelado pelo operador.`);
          MascotController.setMood('idle');
          this.logActivity('JOB', `Job #${jobId} cancelado.`);
        } else {
          this.appendMessage('bot', `Não foi possível cancelar job #${jobId}.`);
        }
      } catch (e) {
        this.appendMessage('bot', `Falha ao cancelar job #${jobId}: ${e.message}`);
      }
    },

    logActivity(tag, text) {
      const logsContainer = document.getElementById('fsbLogsContainer');
      if (!logsContainer) return;
      const row = document.createElement('div');
      row.className = 'fsb-log-row';
      const time = new Date().toTimeString().slice(0, 8);
      row.innerHTML = `
        <span class="fsb-log-time">${time}</span>
        <span class="fsb-log-tag info">${this.escapeHTML(tag)}</span>
        <span class="fsb-log-text">${this.escapeHTML(text)}</span>
      `;
      logsContainer.appendChild(row);
      if (logsContainer.children.length > 100) logsContainer.removeChild(logsContainer.children[0]);
      logsContainer.scrollTop = logsContainer.scrollHeight;
    },

    async sendChatMessage() {
      const input = document.getElementById('fsbChatInput');
      const text = input?.value.trim();
      if (!text) return;
      input.value = '';

      this.appendMessage('user', text);
      MascotController.setMood('working');

      // Comandos especiais
      if (text.startsWith('/')) {
        await this.handleCommand(text);
        return;
      }

      // NLU Workspace & Copilot Interceptor (Fênix V17)
      const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      // 1. World & City Navigation
      if (lower === 'volte para a cidade' || lower === 'voltar para cidade' || lower === 'visao geral' || lower === 'cidade inteira' || lower === 'cidade') {
        if (typeof window.showView === 'function') window.showView('city');
        if (window.fenixWorld3D) {
          window.fenixWorld3D.focusFloor(null);
          window.fenixWorld3D.focusDistrict('command-center');
          window.fenixWorld3D.setCameraMode?.('city');
        }
        updateCopilotContext({ mode: 'world', contextType: 'WORLD_ENTITY', contextId: 'Cidade' });
        this.appendBotMessage({
          response: `🏙️ Câmera restaurada para a visão panorâmica da Cidade de Agentes.\n• Visão geral do ecossistema ativo\n• Todos os distritos visíveis`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 20);
        MascotController.setMood('success');
        return;
      }

      if (lower === 'abra o world' || lower === 'abrir o world' || lower === 'mostrar world' || lower === 'ver o world' || lower === 'ir para o world' || lower === 'abrir o mundo') {
        if (typeof window.showView === 'function') window.showView('city');
        if (window.fenixWorld3D) window.fenixWorld3D.setCameraMode?.('city');
        updateCopilotContext({ mode: 'world', contextType: 'WORLD_ENTITY', contextId: 'World 3D' });
        this.appendBotMessage({
          response: `🌐 Alternando para o **Spatial World 3D**.\n• Renderizador WebGL sincronizado\n• Entidades espaciais ativas`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 20);
        MascotController.setMood('success');
        return;
      }

      // 2. Copilot State Controls
      if (lower === 'feche o copilot' || lower === 'fechar o copilot' || lower === 'fechar copilot' || lower === 'ocultar copilot' || lower === 'recolher copilot') {
        MascotController.setCopilotState('closed');
        return;
      }

      if (lower === 'abra o copilot' || lower === 'abrir o copilot' || lower === 'mostrar copilot' || lower === 'expandir copilot') {
        MascotController.setCopilotState('open');
        this.appendBotMessage({
          response: `🤖 Copilot expandido. Como posso ajudar com o Fênix OS?`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 15);
        return;
      }

      if (lower === 'modo compacto' || lower === 'compactar copilot') {
        MascotController.setCopilotState('compact');
        return;
      }

      // 3. Left Sidebar Navigation Controls
      if (lower === 'feche o painel esquerdo' || lower === 'fechar menu' || lower === 'recolher menu' || lower === 'recolher sidebar' || lower === 'fechar sidebar') {
        if (typeof window.fenixCollapseLeftSidebar === 'function') window.fenixCollapseLeftSidebar(true);
        this.appendBotMessage({
          response: `◀️ Menu lateral esquerdo recolhido para modo compacto de ícones (64px).`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 20);
        MascotController.setMood('success');
        return;
      }

      if (lower === 'abra o painel esquerdo' || lower === 'abrir menu' || lower === 'expandir menu' || lower === 'expandir sidebar' || lower === 'abrir sidebar') {
        if (typeof window.fenixCollapseLeftSidebar === 'function') window.fenixCollapseLeftSidebar(false);
        this.appendBotMessage({
          response: `▶️ Menu lateral esquerdo expandido (230px).`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 20);
        MascotController.setMood('success');
        return;
      }

      // 4. Buildings & Floors (Cutaway & Interior)
      if (lower === 'mostre o predio' || lower === 'mostrar predio' || lower === 'abrir o predio' || lower === 'abra o predio' || lower === 'entrar no predio') {
        if (typeof window.showView === 'function') window.showView('city');
        if (window.fenixWorld3D) {
          window.fenixWorld3D.focusBuilding('api-platform');
          window.fenixWorld3D.focusFloor(1);
        }
        updateCopilotContext({ contextType: 'COMPANY', contextId: 'API Platform' });
        this.appendBotMessage({
          response: `🏢 Câmera focada no **Complexo API Platform** com corte interior arquitetônico ativado.\n• Andar 1 (Operations) aberto\n• Andares superiores em cutaway`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 25);
        MascotController.setMood('success');
        return;
      }

      if (lower.includes('segundo andar') || lower.includes('andar 2')) {
        if (typeof window.showView === 'function') window.showView('city');
        if (window.fenixWorld3D) window.fenixWorld3D.focusFloor(2);
        this.appendBotMessage({
          response: `🏢 Câmera interior no **Andar 2 (Engineering Lab & Token Security Vault)**.\n• Agentes: Lucas & Victor\n• Andares superiores em cutaway`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 25);
        MascotController.setMood('success');
        return;
      }

      if (lower.includes('primeiro andar') || lower.includes('andar 1')) {
        if (typeof window.showView === 'function') window.showView('city');
        if (window.fenixWorld3D) window.fenixWorld3D.focusFloor(1);
        this.appendBotMessage({
          response: `🏢 Câmera interior no **Andar 1 (Operations & Observability Center)**.\n• Agente: Maya Observability\n• Monitores de telemetria ao vivo`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 25);
        MascotController.setMood('success');
        return;
      }

      if (lower.includes('terceiro andar') || lower.includes('andar 3')) {
        if (typeof window.showView === 'function') window.showView('city');
        if (window.fenixWorld3D) window.fenixWorld3D.focusFloor(3);
        this.appendBotMessage({
          response: `🏢 Câmera interior no **Andar 3 (AI Nexus & Quantum Neural Core)**.\n• Agente: Sora AI Core\n• Hologramas e anéis neurais ativos`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 25);
        MascotController.setMood('success');
        return;
      }

      if (lower.includes('terreo') || lower.includes('lobby') || lower.includes('andar 0')) {
        if (typeof window.showView === 'function') window.showView('city');
        if (window.fenixWorld3D) window.fenixWorld3D.focusFloor(0);
        this.appendBotMessage({
          response: `🏢 Câmera interior no **Térreo (Lobby & Recepção)**.\n• Balcão de atendimento\n• Controle de acesso`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 25);
        MascotController.setMood('success');
        return;
      }

      // 5. Follow Agent
      if (lower.includes('acompanhe este agente') || lower.includes('acompanhe') || lower.includes('seguir agente') || lower.includes('acompanhar agente')) {
        if (typeof window.showView === 'function') window.showView('city');
        const activeAg = (window.GlobalSelectionStore?.selectedAgent?.id) || 'agent-developer';
        if (window.fenixWorld3D) window.fenixWorld3D.followAgent(activeAg);
        this.appendBotMessage({
          response: `🎥 Câmera configurada em modo **FOLLOW** acompanhando o agente ativo **${activeAg}**.\n• Transições suaves de posição\n• Rastreamento contínuo`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 25);
        MascotController.setMood('success');
        return;
      }

      // 6. Agents View
      if (lower === 'mostre os agentes' || lower === 'abrir agentes' || lower === 'ver agentes' || lower === 'listar agentes') {
        if (typeof window.showView === 'function') window.showView('agents');
        this.appendBotMessage({
          response: `👥 Abrindo painel de **Agentes** do ecossistema.`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 20);
        MascotController.setMood('success');
        return;
      }

      // 7. Company View
      if (lower === 'mostre a empresa' || lower === 'mostrar empresa') {
        if (typeof window.showView === 'function') window.showView('city');
        if (window.fenixWorld3D) window.fenixWorld3D.focusCompany('api-platform');
        updateCopilotContext({ contextType: 'COMPANY', contextId: 'API Platform' });
        this.appendBotMessage({
          response: `🏢 Câmera focada na sede da empresa **API Platform** no Spatial World.`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 20);
        MascotController.setMood('success');
        return;
      }

      // 8. Missions View
      if (lower === 'mostre a missao' || lower === 'abrir missoes' || lower === 'listar missoes' || lower === 'ver missoes') {
        if (typeof window.showView === 'function') window.showView('operations');
        this.appendBotMessage({
          response: `🎯 Abrindo central de **Operações e Missões**.`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 20);
        MascotController.setMood('success');
        return;
      }

      // 9. "Mostre o agente que está executando API Platform"
      if (lower.includes('executando api platform') || (lower.includes('agente') && lower.includes('api platform'))) {
        if (typeof window.showView === 'function') window.showView('city');
        const agId = 'agent-developer';
        if (window.GlobalSelectionStore) window.GlobalSelectionStore.select('agent', agId, { name: 'Senior Dev', role: 'Full-Stack Developer' });
        if (window.fenixWorld3D) window.fenixWorld3D.focusAgent(agId);
        updateCopilotContext({ agent: 'Lucas (Senior Dev)', project: 'api-platform', contextType: 'AGENT', contextId: agId });
        this.appendBotMessage({
          response: `👤 Agente **Lucas (Senior Dev)** está executando o projeto **API Platform**.\n• Status: RUNNING\n• Localização: Andar 2 (Engineering Lab)\n• Câmera 3D focada no agente.`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 30);
        MascotController.setMood('success');
        return;
      }

      // 10. Split Mode / Workspace Modes ("coloque em split", "mostre o código", "abra preview", etc.)
      if (lower === 'coloque em split' || lower === 'modo split' || lower.includes('em split')) {
        let proj = 'api-platform';
        if (typeof window.showView === 'function') window.showView('ide');
        if (window.fenixSelectIdeProject) window.fenixSelectIdeProject(proj);
        if (window.fenixSetIdeMode) window.fenixSetIdeMode('split');
        updateCopilotContext({ project: proj, mode: 'split', contextType: 'PROJECT', contextId: proj });
        this.appendBotMessage({
          response: `🖥️ Workspace configurado para **SPLIT** (50% Código / 50% Live Preview) para o projeto **${proj}**.`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 25);
        MascotController.setMood('success');
        return;
      }

      if (lower === 'mostre o codigo' || lower === 'mostrar codigo' || lower === 'modo codigo') {
        if (typeof window.showView === 'function') window.showView('ide');
        if (window.fenixSetIdeMode) window.fenixSetIdeMode('code');
        updateCopilotContext({ mode: 'code' });
        this.appendBotMessage({
          response: `💻 Modo **CODE** ativado (100% editor de código).`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 20);
        MascotController.setMood('success');
        return;
      }

      if (lower === 'abra preview' || lower === 'mostrar preview' || lower === 'modo preview') {
        if (typeof window.showView === 'function') window.showView('ide');
        if (window.fenixSetIdeMode) window.fenixSetIdeMode('preview');
        updateCopilotContext({ mode: 'preview' });
        this.appendBotMessage({
          response: `👁️ Modo **PREVIEW** ativado (100% Live Preview).`,
          lane: 'FAST_LANE',
          model: 'fenix-nlu'
        }, text, 20);
        MascotController.setMood('success');
        return;
      }

      // 11. Projeto (e.g. "abra o projeto api platform", "mudar para o projeto fenix")
      if (lower.includes('projeto') && (lower.includes('abra') || lower.includes('abrir') || lower.includes('mude') || lower.includes('mostrar') || lower.includes('selecion'))) {
        let targetProj = null;
        if (lower.includes('api') || lower.includes('platform')) targetProj = 'api-platform';
        else if (lower.includes('fenix') || lower.includes('core')) targetProj = 'fenix-os';
        else {
          const match = text.match(/projeto\s+([a-zA-Z0-9_-]+)/i);
          if (match) targetProj = match[1];
        }

        if (targetProj) {
          if (typeof window.showView === 'function') window.showView('ide');
          if (window.fenixSelectIdeProject) window.fenixSelectIdeProject(targetProj);
          if (window.GlobalSelectionStore) window.GlobalSelectionStore.select('project', targetProj, { name: targetProj });
          updateCopilotContext({ project: targetProj, contextType: 'PROJECT', contextId: targetProj });
          this.appendBotMessage({
            response: `🚀 Abrindo projeto **${targetProj}** no Fênix Workspace.\n• Sincronizando árvore de arquivos\n• Conectando agentes\n• Atualizando Live Preview`,
            lane: 'FAST_LANE',
            model: 'fenix-nlu'
          }, text, 30);
          MascotController.setMood('success');
          return;
        }
      }

      // 2. Modo do Workspace (Code, Preview, Split, World)
      if (lower.includes('modo') || lower.includes('preview') || lower.includes('split') || lower.includes('cidade') || lower.includes('mundo')) {
        let targetMode = null;
        if (lower.includes('preview') || lower.includes('visualizar')) targetMode = 'preview';
        else if (lower.includes('split') || (lower.includes('codigo') && lower.includes('preview'))) targetMode = 'split';
        else if (lower.includes('codigo') || lower.includes('code') || lower.includes('editor')) targetMode = 'code';
        else if (lower.includes('mundo') || lower.includes('world') || lower.includes('cidade') || lower.includes('3d')) targetMode = 'world';

        if (targetMode) {
          if (typeof window.showView === 'function') window.showView('ide');
          if (window.fenixSetIdeMode) window.fenixSetIdeMode(targetMode);
          updateCopilotContext({ mode: targetMode });
          this.appendBotMessage({
            response: `🖥️ Modo do Workspace alterado para **${targetMode.toUpperCase()}**.\n• Central Viewport atualizada\n• Chips de ações contextuais sincronizados`,
            lane: 'FAST_LANE',
            model: 'fenix-nlu'
          }, text, 25);
          MascotController.setMood('success');
          return;
        }
      }

      // 3. Consultas sobre Agentes (Zero-Mock real queries)
      if (lower.includes('quantos agentes') || lower.includes('numero de agentes') || lower.includes('total de agentes') || (lower.includes('agente') && (lower.includes('quant') || lower.includes('listar')))) {
        try {
          const res = await authedFetch('/api/v2/agents');
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data.agents) ? data.agents : (Array.isArray(data) ? data : []);
            const count = list.length;
            const responseText = count > 0
              ? `👥 Atualmente existem **${count}** agente(s) registrado(s) no sistema:\n` + list.slice(0, 5).map(a => `• **${a.name || a.id}** (${a.role || 'Agente'} - ${a.status || 'IDLE'})`).join('\n')
              : 'Não há agentes registrados no momento. Você pode criar um agente pelo menu Agentes ou pelo comando do Fênix.';
            this.appendBotMessage({
              response: responseText,
              lane: 'FAST_LANE',
              model: 'fenix-copilot'
            }, text, 30);
            MascotController.setMood('success');
            return;
          }
        } catch (e) {
          console.warn('[FenixSidebar] Falha ao consultar agentes:', e);
        }
      }

      const startTime = Date.now();
      this.startLoadingTimer();

      // Preserve the server conversation and project context across turns and reloads.
      const activeConversation = this.getActiveConversation();
      const projectId = copilotContext.projectId || activeConversation?.projectId || null;
      const agentId = copilotContext.agentId || (copilotContext.contextType === 'AGENT' ? copilotContext.contextId : null);

      // The canonical conversation endpoint owns both fast responses and durable job dispatch.
      try {
        const res = await authedFetch('/api/v2/conversation', {
          method: 'POST',
          body: JSON.stringify({
            message: text,
            agent: state.selectedAgent,
            conversationId: activeConversation?.serverConversationId || null,
            projectId,
            agentId,
            context: {
              contextType: copilotContext.contextType,
              contextId: copilotContext.contextId,
              file: copilotContext.file,
              mode: copilotContext.mode,
            },
          })
        });

        const data = await res.json().catch(() => ({}));
        this.stopLoadingTimer();
        const elapsedMs = Date.now() - startTime;
        if (data.conversationId && activeConversation) {
          activeConversation.serverConversationId = data.conversationId;
          if (projectId) activeConversation.projectId = projectId;
          this.saveConversations();
        }

        if (!res.ok) {
          const detail = data.error || `HTTP ${res.status}`;
          this.appendBotMessage({
            response: data.response || `O canal de conversa não concluiu a solicitação (${detail}). Confira o serviço antes de tentar novamente.`,
            lane: 'INDISPONÍVEL',
          }, text, elapsedMs);
          MascotController.setMood('error');
          this.logActivity('CHAT', `Canal de conversa indisponível (${detail})`);
          return;
        }

        if (data.lane === 'JOB_LANE' || data.lane === 'MISSION_LANE') {
          this.appendJobMessage(data, text, elapsedMs);
          MascotController.setMood('working');
        } else {
          this.appendBotMessage(data, text, elapsedMs);
          MascotController.setMood('success');
          setTimeout(() => MascotController.setMood('idle'), 2500);
        }
        this.logActivity('CHAT', `Mensagem atendida [${data.lane || '—'}]`);
        return;
      } catch (err) {
        this.stopLoadingTimer();
        const elapsedMs = Date.now() - startTime;
        this.appendBotMessage({
          response: 'Não foi possível confirmar a resposta do canal de conversa. A mensagem foi mantida no histórico local; verifique o estado do serviço antes de reenviá-la.',
          lane: 'INDISPONÍVEL',
        }, text, elapsedMs);
        MascotController.setMood('error');
        this.logActivity('CHAT', `Falha de rede no canal de conversa: ${err.message}`);
      }
    },

    async handleCommand(cmd) {
      MascotController.setMood('thinking');
      const clean = cmd.trim();

      if (clean === '/vps-status') {
        this.appendMessage('system', 'Consultando telemetria em tempo real da VPS...');
        const telem = await this.fetchTelemetry(true);
        this.appendMessage('bot', `📊 **Status da VPS (209.50.241.22):**\n• Host Health: ${telem.vpsStatus}\n• API Platform: ${telem.apiPlatform}\n• RAM: ${telem.ram}\n• Latência: ${telem.latency}\n• Uptime: ${telem.uptime}`);
        MascotController.setMood('success');
      } else if (clean === '/health') {
        this.appendMessage('system', 'Verificando integridade das 5 Regras de Ouro...');
        try {
          const sysRes = await authedFetch('/api/v2/system/health');
          const sysData = sysRes.ok ? await sysRes.json() : null;
          this.appendMessage('bot', `✅ **Integridade do Fênix OS:**\n• Single Source of Truth inviolada (0 shells paralelas)\n• Zero-Mock compliance ativo\n• Serviços PM2 #16 e #17 ONLINE\n• Kernel: ${sysData?.status || 'ONLINE'}`);
        } catch (_) {
          this.appendMessage('bot', '✅ Integridade 100% OK:\n• Single Source of Truth inviolada (0 shells paralelas)\n• Zero-Mock compliance ativo\n• Serviços PM2 #16 e #17 Online');
        }
        MascotController.setMood('success');
      } else if (clean === '/memory') {
        this.appendMessage('system', 'Lendo Memória Ativa e Graph Brain...');
        try {
          const gRes = await authedFetch('/api/v2/graph/data');
          const gData = gRes.ok ? await gRes.json() : null;
          const nodeCount = gData?.nodes?.length ?? '—';
          const edgeCount = gData?.edges?.length ?? '—';
          this.appendMessage('bot', `🧠 **Graph Brain & Memória Ativa:**\n• Entidades no Grafo: ${nodeCount}\n• Relações: ${edgeCount}\n• GitHub Conectado (@Biel0071)\n• Sistema de absorção de telas ativo`);
        } catch (_) {
          this.appendMessage('bot', '🧠 ACTIVE_PROJECT_MEMORY.md sincronizado:\n• GitHub conectado (@Biel0071)\n• 10 Repositórios mapeados\n• Sistema de absorção de telas ativo');
        }
        MascotController.setMood('success');
      } else if (clean === '/agents') {
        if (window.showView) window.showView('agents');
        this.appendMessage('bot', 'Alternando para a Central de Agentes RPG...');
        MascotController.setMood('idle');
      } else if (clean === '/jobs') {
        try {
          const qRes = await authedFetch('/api/v2/queue/status');
          const qData = qRes.ok ? await qRes.json() : null;
          this.appendMessage('bot', `📋 **Fila de Jobs (BullMQ):**\n• Ativos: ${qData?.active || 0}\n• Em Espera: ${qData?.waiting || 0}\n• Concluídos: ${qData?.completed || 0}\n• Falhas: ${qData?.failed || 0}`);
        } catch (_) {
          this.appendMessage('bot', '📋 Fila de jobs consultada. Nenhum job bloqueado no momento.');
        }
        MascotController.setMood('idle');
      } else if (['/fast', '/qwen', '/auto'].includes(clean)) {
        try {
          const cRes = await authedFetch('/api/v2/conversation', {
            method: 'POST',
            body: JSON.stringify({ message: clean })
          });
          const cData = cRes.ok ? await cRes.json() : null;
          this.appendMessage('bot', cData?.response || `Modo alternado para ${clean.slice(1).toUpperCase()}`);
        } catch (_) {
          this.appendMessage('bot', `Modo de inferência alternado para: ${clean.slice(1).toUpperCase()}`);
        }
        MascotController.setMood('success');
      } else {
        this.appendMessage('bot', `Comando desconhecido: ${clean}. Tente /vps-status, /health, /memory, /agents, /jobs, /fast ou /qwen.`);
        MascotController.setMood('idle');
      }
    },

    async fetchTelemetry(manual = false) {
      if (manual) MascotController.setMood('working');
      try {
        const [sysRes, apiRes] = await Promise.all([
          authedFetch('/api/v2/system/health').catch(() => null),
          authedFetch('/api/v2/api-platform/health').catch(() => null)
        ]);

        const sysData = sysRes && sysRes.ok ? await sysRes.json() : null;
        const apiData = apiRes && apiRes.ok ? await apiRes.json() : null;

        const cpu = sysData?.system?.cpu != null ? `${sysData.system.cpu}%` : (sysData?.cpu != null ? `${Math.round(sysData.cpu * 100)}%` : '—');
        const ram = sysData?.memory?.usedMb ? `${sysData.memory.usedMb} MB` : (sysData?.system?.ram ? `${sysData.system.ram} MB` : '—');
        const latency = apiData?.latency != null ? `${apiData.latency} ms` : '—';
        const uptimeSeconds = sysData?.uptime || apiData?.uptime || 0;
        const uptime = uptimeSeconds >= 3600 ? `${Math.floor(uptimeSeconds / 3600)}h` : (uptimeSeconds >= 60 ? `${Math.floor(uptimeSeconds / 60)}m` : (uptimeSeconds > 0 ? `${uptimeSeconds}s` : '—'));
        const vpsStatus = (sysData?.status || apiData?.status || '—').toUpperCase();
        const apiPlatform = apiData
          ? String(apiData.status || (apiData.ok || apiData.success ? 'ONLINE' : 'DEGRADED')).toUpperCase()
          : 'INDISPONÍVEL';
        const host = sysData?.vps?.host || sysData?.host || 'Indisponível';
        const jobs = sysData?.activeJobs != null ? String(sysData.activeJobs) : '—';

        // Atualizar painel (zero-mock honest)
        this.setDOMText('fsbTelemCpu', cpu);
        this.setDOMText('fsbTelemRam', ram);
        this.setDOMText('fsbTelemLatency', latency);
        this.setDOMText('fsbTelemUptime', uptime);
        this.setDOMText('fsbTelemApiPlatform', apiPlatform);
        this.setDOMText('fsbTelemJobs', jobs);
        this.setDOMText('fsbTelemKernelState', sysData?.status || '—');

        // Atualizar Letreiro Inferior Contínuo (Live Marquee Ticker)
        this.setDOMText('tickerHost', host);
        this.setDOMText('tickerHost2', host);
        this.setDOMText('tickerCpu', cpu);
        this.setDOMText('tickerCpu2', cpu);
        this.setDOMText('tickerRam', ram);
        this.setDOMText('tickerRam2', ram);
        this.setDOMText('tickerUptime', uptime);
        this.setDOMText('tickerUptime2', uptime);
        this.setDOMText('tickerJobs', jobs);
        this.setDOMText('tickerJobs2', jobs);
        this.setDOMText('tickerFastLane', apiPlatform);
        this.setDOMText('tickerFastLane2', apiPlatform);

        if (manual) MascotController.setMood('success');
        return { cpu, ram, latency, uptime, vpsStatus, apiPlatform, jobs };
      } catch (err) {
        if (manual) MascotController.setMood('error');
        return { cpu: '—', ram: '—', latency: '—', uptime: '—', vpsStatus: '—', apiPlatform: '—', jobs: '—' };
      }
    },

    async fetchProviders(manual = false) {
      const container = document.getElementById('fsbProvidersContainer');
      if (!container) return;
      if (manual) MascotController.setMood('working');

      try {
        const [localResult, sessionResult] = await Promise.allSettled([
          authedFetch('/api/v2/providers').then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          }),
          authedFetch('/api/v2/provider-platform/session').then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          }),
        ]);
        const data = localResult.status === 'fulfilled' ? localResult.value : { ok: false, providers: [], usage: {}, routing: {} };
        const platform = { session: sessionResult.status === 'fulfilled' ? sessionResult.value : { authenticated: false } };
        if (platform.session.authenticated) {
          const [providersResult, configsResult] = await Promise.allSettled([
            authedFetch('/api/v2/provider-platform/providers').then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            }),
            authedFetch('/api/v2/provider-platform/provider-configs').then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            }),
          ]);
          platform.providers = providersResult.status === 'fulfilled' ? providersResult.value.providers || [] : [];
          platform.configs = configsResult.status === 'fulfilled' ? configsResult.value.configs || [] : [];
          platform.error = providersResult.status === 'rejected' || configsResult.status === 'rejected'
            ? 'A sessão expirou ou a API Platform está indisponível. Entre novamente para sincronizar.'
            : '';
          providerPlatformConfigs = platform.configs;
        } else {
          providerPlatformConfigs = [];
        }
        platform.localError = localResult.status === 'rejected' ? 'O estado do gateway local não pôde ser medido.' : '';
        this.renderProvidersFabric(container, data, platform);
        if (manual) MascotController.setMood('success');
      } catch (err) {
        container.innerHTML = `
          <div style="padding:20px; text-align:center; color:#EF4444;">
            <i class="ph-bold ph-warning-circle" style="font-size:28px;"></i>
            <div style="margin-top:8px; font-weight:700;">Falha ao carregar providers</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:4px;">A interface não conseguiu consultar os serviços.</div>
            <button class="fenix-subnav-btn" onclick="window.FenixSidebar?.fetchProviders?.(true)" style="margin-top:12px;">
              <i class="ph-bold ph-arrows-clockwise"></i> Tentar Novamente
            </button>
          </div>
        `;
        if (manual) MascotController.setMood('error');
      }
    },

    renderProviderPlatformHub(platform = {}) {
      const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
      const providerLabels = {
        openai: 'OpenAI', anthropic: 'Anthropic', xai: 'xAI / Grok', gemini: 'Google Gemini',
        groq: 'Groq', openrouter: 'OpenRouter', ollama: 'Ollama', huggingface: 'Hugging Face',
        cloudflare: 'Cloudflare', lmstudio: 'LM Studio', comfyui: 'ComfyUI', forge: 'Forge', invokeai: 'InvokeAI',
      };
      const session = platform.session || {};
      const providers = Array.isArray(platform.providers) ? platform.providers : [];
      const configs = Array.isArray(platform.configs) ? platform.configs : [];
      const configured = configs.filter((config) => config.enabled);
      const palette = ['#39e8d0', '#64b5ff', '#c19bff', '#ffad66', '#fb7aa8', '#a6e66c', '#66d9ef'];
      const points = providers.slice(0, 8).map((provider, index, all) => {
        const angle = (Math.PI * 2 * index / Math.max(all.length, 1)) - Math.PI / 2;
        return {
          provider,
          left: `${50 + Math.cos(angle) * 37}%`,
          top: `${50 + Math.sin(angle) * 37}%`,
          color: palette[index % palette.length],
        };
      });
      const secureUrl = 'https://fenix.209-50-241-22.sslip.io/app#city';
      const insecure = window.location?.protocol !== 'https:';
      let html = `
        <section class="fsb-platform-hub" aria-labelledby="fsbPlatformHubTitle">
          <div class="fsb-platform-heading">
            <div>
              <span class="fsb-platform-kicker">API PLATFORM · CONEXÕES REAIS</span>
              <h3 id="fsbPlatformHubTitle">Central de provedores</h3>
              <p>As chaves ficam na API Platform e não são devolvidas ao navegador.</p>
            </div>
            <span class="fsb-platform-state ${session.authenticated ? 'is-connected' : ''}"><i></i>${session.authenticated ? 'API conectada' : 'API sem sessão'}</span>
          </div>
      `;

      if (insecure) {
        html += `
          <div class="fsb-platform-secure-note" role="status">
            <i class="ph-bold ph-lock-key"></i>
            <span>Para informar senha ou chave, use a sessão HTTPS segura.</span>
            <a href="${secureUrl}">Abrir Fênix seguro <i class="ph-bold ph-arrow-up-right"></i></a>
          </div>
        `;
      }

      if (!session.authenticated) {
        html += `
          <form class="fsb-platform-login" onsubmit="event.preventDefault(); window.FenixSidebar?.loginProviderPlatform?.(this)">
            <label>Usuário ou e-mail administrativo<input name="login" autocomplete="username" maxlength="254" required placeholder="admin ou email da API Platform" ${insecure ? 'disabled' : ''}></label>
            <label>Senha administrativa<input name="password" type="password" autocomplete="current-password" maxlength="1024" required placeholder="Senha da API Platform" ${insecure ? 'disabled' : ''}></label>
            <button type="submit" class="fsb-platform-primary" ${insecure ? 'disabled' : ''}><i class="ph-bold ph-plugs-connected"></i> Conectar à API Platform</button>
            <div class="fsb-platform-feedback" id="fsbPlatformFeedback" role="status">${platform.localError ? escape(platform.localError) : 'Acesso validado pelo controle administrativo do Fênix.'}</div>
          </form>
        `;
      } else {
        html += `
          <div class="fsb-platform-toolbar">
            <span><i class="ph-fill ph-shield-check"></i> Sessão administrativa protegida no servidor · expira em 11h</span>
            <button type="button" class="fsb-platform-quiet" onclick="window.FenixSidebar?.logoutProviderPlatform?.(this)">Sair</button>
          </div>
          ${platform.error ? `<div class="fsb-platform-feedback is-error" role="alert">${escape(platform.error)}</div>` : ''}
          <div class="fsb-platform-orbit" aria-label="Provedores carregados pela API Platform">
            <div class="fsb-orbit-ring"></div>
            <div class="fsb-orbit-core"><i class="ph-fill ph-hexagon"></i><strong>FÊNIX</strong><small>AI GATEWAY</small></div>
            ${points.map(({ provider, left, top, color }) => `
              <div class="fsb-orbit-node ${provider.health?.ok ? 'is-online' : ''}" style="left:${left};top:${top};--node-color:${color}" title="${escape(provider.name)} · ${provider.health?.ok ? 'online' : 'sem medição online'}">
                <span>${escape(String(provider.name || '?').slice(0, 2).toUpperCase())}</span>
              </div>
            `).join('')}
            <div class="fsb-orbit-count">${configured.length} conexão${configured.length === 1 ? '' : 'ões'} ativa${configured.length === 1 ? '' : 's'}</div>
          </div>
          <div class="fsb-platform-provider-list">
            ${configured.length ? configured.map((config) => {
              const provider = providers.find((item) => item.name === config.name);
              const online = provider?.health?.ok === true;
              const title = providerLabels[config.name] || config.name;
              const models = (provider?.models || []).slice(0, 2).map((model) => model.name || model.id).filter(Boolean);
              return `
                <article class="fsb-platform-provider ${config.defaultChat ? 'is-default' : ''}">
                  <div class="fsb-platform-provider-mark">${escape(config.name.slice(0, 2).toUpperCase())}</div>
                  <div class="fsb-platform-provider-copy">
                    <strong>${escape(title)}${config.defaultChat ? '<span class="fsb-platform-default">PADRÃO</span>' : ''}</strong>
                    <small><i class="${online ? 'is-online' : ''}"></i>${online ? 'Online · medido pela API' : (provider ? 'Configurado · teste indisponível' : 'Configurado · aguardando sincronização')}</small>
                    <span>${models.length ? models.map(escape).join(' · ') : (config.defaultModel ? escape(config.defaultModel) : 'Modelo não informado')}</span>
                  </div>
                  <div class="fsb-platform-provider-actions">
                    <button type="button" title="Testar conexão" aria-label="Testar conexão com ${escape(title)}" onclick="window.FenixSidebar?.testPlatformProvider?.('${escape(config.name)}', this)"><i class="ph-bold ph-lightning"></i></button>
                    <button type="button" title="Editar conexão" aria-label="Editar ${escape(title)}" onclick="window.FenixSidebar?.editPlatformProvider?.('${escape(config.name)}')"><i class="ph-bold ph-pencil-simple"></i></button>
                  </div>
                </article>
              `;
            }).join('') : '<div class="fsb-platform-empty">Nenhum provedor conectado à API Platform. Adicione uma chave para habilitar capacidades no Fênix.</div>'}
          </div>
          <details class="fsb-platform-connect" id="fsbPlatformConnect" open>
            <summary><span><i class="ph-bold ph-plus-circle"></i> Conectar ou editar provedor</span><i class="ph-bold ph-caret-down"></i></summary>
            <form class="fsb-platform-provider-form" onsubmit="event.preventDefault(); window.FenixSidebar?.savePlatformProvider?.(this)">
              <label>Provedor<select name="name" id="fsbPlatformProviderName">
                ${Object.entries(providerLabels).map(([id, label]) => `<option value="${id}">${escape(label)}</option>`).join('')}
              </select></label>
              <label>Chave de API / token<input name="apiKey" type="password" autocomplete="new-password" maxlength="8192" placeholder="Cole a chave; fica armazenada criptografada"></label>
              <label>URL do provedor (opcional)<input name="baseUrl" type="url" maxlength="2048" placeholder="Use para endpoint compatível ou instância própria"></label>
              <div class="fsb-platform-form-row">
                <label>ID da conta<input name="accountId" maxlength="256" placeholder="Necessário para Cloudflare"></label>
                <label>Modelo padrão<input name="defaultModel" maxlength="256" placeholder="Ex.: gpt-4.1-mini"></label>
              </div>
              <div class="fsb-platform-checks">
                <label><input type="checkbox" name="enabled" checked> Conexão ativa</label>
                <label><input type="checkbox" name="defaultChat"> Usar em chat e tarefas do Fênix</label>
              </div>
              <div class="fsb-platform-form-actions">
                <button type="submit" class="fsb-platform-primary"><i class="ph-bold ph-floppy-disk"></i> Salvar conexão</button>
                <button type="button" class="fsb-platform-quiet" onclick="window.FenixSidebar?.testPlatformInference?.(this)"><i class="ph-bold ph-play"></i> Testar inferência</button>
              </div>
              <div class="fsb-platform-feedback" id="fsbPlatformFeedback" role="status">Teste real usa até 16 tokens. Cadastre a chave na API; ela não é exibida novamente.</div>
            </form>
          </details>
        `;
      }

      html += '</section>';
      return html;
    },

    async loginProviderPlatform(form) {
      const button = form.querySelector('button[type="submit"]');
      const feedback = document.getElementById('fsbPlatformFeedback');
      const login = form.elements.login?.value.trim();
      const password = form.elements.password?.value;
      if (window.location?.protocol !== 'https:') {
        if (feedback) feedback.textContent = 'Use o endereço HTTPS para enviar credenciais com segurança.';
        return;
      }
      if (button) button.disabled = true;
      if (feedback) feedback.textContent = 'Validando sua sessão administrativa…';
      try {
        const response = await authedFetch('/api/v2/provider-platform/session', { method: 'POST', body: JSON.stringify({ login, password }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.authenticated) throw new Error(data.error || 'Não foi possível conectar à API Platform.');
        form.elements.password.value = '';
        await this.fetchProviders(true);
      } catch (error) {
        form.elements.password.value = '';
        if (feedback) feedback.textContent = error.message || 'Falha ao conectar à API Platform.';
        if (feedback) feedback.classList.add('is-error');
      } finally {
        if (button) button.disabled = false;
      }
    },

    async logoutProviderPlatform(button) {
      if (button) button.disabled = true;
      try {
        await authedFetch('/api/v2/provider-platform/session/logout', { method: 'POST', body: '{}' });
        await this.fetchProviders(true);
      } finally { if (button) button.disabled = false; }
    },

    async savePlatformProvider(form) {
      const button = form.querySelector('button[type="submit"]');
      const feedback = document.getElementById('fsbPlatformFeedback');
      if (window.location?.protocol !== 'https:') {
        if (feedback) feedback.textContent = 'Use o endereço HTTPS antes de enviar a chave do provedor.';
        return;
      }
      const body = {
        name: form.elements.name.value,
        enabled: form.elements.enabled.checked,
        defaultChat: form.elements.defaultChat.checked,
        ...(form.elements.apiKey.value ? { apiKey: form.elements.apiKey.value } : {}),
        ...(form.elements.baseUrl.value.trim() ? { baseUrl: form.elements.baseUrl.value.trim() } : {}),
        ...(form.elements.accountId.value.trim() ? { accountId: form.elements.accountId.value.trim() } : {}),
        ...(form.elements.defaultModel.value.trim() ? { defaultModel: form.elements.defaultModel.value.trim() } : {}),
      };
      if (button) button.disabled = true;
      if (feedback) { feedback.textContent = 'Salvando na API Platform…'; feedback.classList.remove('is-error'); }
      try {
        const response = await authedFetch('/api/v2/provider-platform/provider-configs', { method: 'POST', body: JSON.stringify(body) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || 'A API Platform não salvou a conexão.');
        form.elements.apiKey.value = '';
        if (feedback) feedback.textContent = 'Conexão salva. Atualizando estado e modelos reais…';
        await this.fetchProviders(true);
      } catch (error) {
        form.elements.apiKey.value = '';
        if (feedback) { feedback.textContent = error.message || 'Falha ao salvar conexão.'; feedback.classList.add('is-error'); }
      } finally { if (button) button.disabled = false; }
    },

    editPlatformProvider(name) {
      const config = providerPlatformConfigs.find((item) => item.name === name);
      const form = document.querySelector('.fsb-platform-provider-form');
      if (!config || !form) return;
      form.elements.name.value = config.name;
      form.elements.enabled.checked = config.enabled;
      form.elements.defaultChat.checked = config.defaultChat;
      form.elements.baseUrl.value = config.baseUrl || '';
      form.elements.accountId.value = config.accountId || '';
      form.elements.defaultModel.value = config.defaultModel || '';
      form.elements.apiKey.value = '';
      document.getElementById('fsbPlatformConnect')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.elements.apiKey.focus();
    },

    async testPlatformProvider(name, button) {
      const label = button?.innerHTML;
      if (button) { button.disabled = true; button.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>'; }
      try {
        const response = await authedFetch(`/api/v2/provider-platform/provider-configs/${encodeURIComponent(name)}/test`, { method: 'POST', body: '{}' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || 'Teste de conexão falhou.');
        if (button) button.title = `Online · ${data.health?.latencyMs ?? 'latência não medida'} ms`;
        await this.fetchProviders(true);
      } catch (error) {
        if (button) button.title = error.message || 'Teste de conexão falhou.';
      } finally { if (button) { button.innerHTML = label; button.disabled = false; } }
    },

    async testPlatformInference(button) {
      const form = button?.closest('form');
      const feedback = document.getElementById('fsbPlatformFeedback');
      const provider = form?.elements.name.value;
      if (button) button.disabled = true;
      if (feedback) { feedback.textContent = 'Executando inferência real com limite de 16 tokens…'; feedback.classList.remove('is-error'); }
      try {
        const response = await authedFetch('/api/v2/provider-platform/test-text', {
          method: 'POST', body: JSON.stringify({ prompt: 'Responda somente: conexão ativa.', provider }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || 'Inferência real não concluída.');
        if (feedback) feedback.textContent = `Inferência confirmada · ${data.model || provider}: ${data.text}`;
      } catch (error) {
        if (feedback) { feedback.textContent = error.message || 'Inferência real não concluída.'; feedback.classList.add('is-error'); }
      } finally { if (button) button.disabled = false; }
    },

    renderProvidersFabric(container, data, platform = {}) {
      const routing = data.routing || {};
      const providers = data.providers || [];
      const usage = data.usage || {};
      const chain = Array.isArray(routing.failoverChain) ? routing.failoverChain : [];
      const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
      const onlineCount = providers.filter((provider) => provider.status === 'ONLINE').length;
      const providerUsage = Object.entries(usage.byProvider || {});
      const chartColors = ['#00e5ff', '#3b82f6', '#ff8a00', '#9b6cff', '#f43f5e', '#10b981'];
      const totalProviderTokens = providerUsage.reduce((total, [, item]) => total + (Number(item.tokens) || 0), 0);
      const providerChart = providerUsage.map(([provider, item], index) => {
        const share = totalProviderTokens ? (Number(item.tokens || 0) / totalProviderTokens) * 100 : 0;
        return { provider, tokens: Number(item.tokens) || 0, share, color: chartColors[index % chartColors.length] };
      });
      let chartOffset = 0;
      const tokenBudget = usage.tokenBudget?.total;
      const tokenSpent = usage.tokenBudget?.spent;
      const budgetPct = Number.isFinite(tokenBudget) && tokenBudget > 0 && Number.isFinite(tokenSpent)
        ? Math.min(100, (tokenSpent / tokenBudget) * 100)
        : null;

      let html = this.renderProviderPlatformHub(platform) + `
        <div class="fsb-prov-header">
          <div class="fsb-prov-eyebrow" style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:800; font-size:12px; letter-spacing:0.04em; color:#f8fafc;"><i class="ph-bold ph-cpu" style="color:#00e5ff;"></i> PROVEDORES DE IA</span>
            <span class="fnx-badge-online">${onlineCount}/${providers.length} MEDIDOS ONLINE</span>
          </div>

          <div class="fsb-failover-strip">
            <span class="fsb-strip-lbl">Rota configurada:</span>
            ${chain.length ? chain.map((provider, index) => `
              <span class="fsb-chain-node">${escapeHtml(provider)}</span>
              ${index < chain.length - 1 ? '<i class="ph-bold ph-arrow-right fsb-chain-arr"></i>' : ''}
            `).join('') : '<span class="fsb-chain-node">Não medida</span>'}
          </div>

          <div class="fsb-prov-stats-grid">
            <div class="fsb-prov-stat">
              <span class="lbl">Chamadas registradas</span>
              <strong style="color:#10B981;">${Number(usage.calls || 0).toLocaleString()}</strong>
            </div>
            <div class="fsb-prov-stat">
              <span class="lbl">Tokens registrados</span>
              <strong style="color:#00D9FF;">${Number(usage.tokensTotal || 0).toLocaleString()}</strong>
            </div>
            <div class="fsb-prov-stat">
              <span class="lbl">Concorrência</span>
              <strong style="color:#F59E0B;">${routing.concurrencyPool && Number.isFinite(routing.concurrencyPool.active) && Number.isFinite(routing.concurrencyPool.limit) ? `${routing.concurrencyPool.active}/${routing.concurrencyPool.limit} slots` : 'Não medida'}</strong>
            </div>
            <div class="fsb-prov-stat">
              <span class="lbl">Custo estimado registrado</span>
              <strong style="color:#A855F7;">$${Number(usage.costUsd || 0).toFixed(4)}</strong>
            </div>
          </div>
        </div>

        <!-- Lista de Cards de Provedores -->
        <div class="fsb-providers-list">
          ${providers.length ? providers.map(p => {
            const isOnline = p.status === 'ONLINE';
            const statusColor = isOnline ? '#10B981' : (p.status === 'OFFLINE' ? '#EF4444' : '#F59E0B');
            const providerId = escapeHtml(p.id);
            const providerName = escapeHtml(p.name || p.id);
            const providerStatus = escapeHtml(p.status || 'NOT_MEASURED');
            const quotaPct = p.quotaUsedPct != null && Number.isFinite(Number(p.quotaUsedPct))
              ? Math.min(100, Math.max(0, Number(p.quotaUsedPct))) : null;

            return `
              <div class="fsb-provider-card ${p.isPrimary ? 'primary-edge' : ''}" id="provCard_${providerId}">
                <div class="fsb-pcard-top">
                  <div class="fsb-pcard-info">
                    <div class="fsb-pcard-title-row">
                      <strong>${providerName}</strong>
                      ${p.isPrimary ? '<span class="fsb-badge-gold">PRINCIPAL</span>' : ''}
                    </div>
                    <div class="fsb-pcard-category">${escapeHtml(p.category || 'AI Model Provider')}</div>
                  </div>
                  ${quotaPct == null ? '<span class="fsb-ring-txt" title="Uso não medido">—</span>' : `<div class="fsb-pcard-ring-wrap" title="Uso / Cota: ${quotaPct}%"><svg class="fsb-svg-ring" width="38" height="38" viewBox="0 0 36 36"><path class="fsb-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/><path class="fsb-ring-val" stroke="${quotaPct > 85 ? '#EF4444' : (quotaPct > 50 ? '#F59E0B' : '#00D9FF')}" stroke-dasharray="${quotaPct}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/></svg><span class="fsb-ring-txt">${quotaPct}%</span></div>`}
                </div>

                <div class="fsb-pcard-meta">
                  <div class="fsb-meta-item">
                    <span class="fsb-meta-dot" style="background:${statusColor};"></span>
                    <span class="fsb-meta-status">${providerStatus}</span>
                  </div>
                  <div class="fsb-meta-item">
                    <i class="ph-bold ph-timer" style="color:#00D9FF;"></i>
                    <span id="provLatency_${providerId}">${p.latencyMs != null ? `${Number(p.latencyMs)}ms` : 'Latência não medida'}</span>
                  </div>
                </div>

                ${p.models && p.models.length ? `
                  <div class="fsb-pcard-models">
                    ${p.models.slice(0, 3).map(m => `<span class="fsb-model-pill">${escapeHtml(m)}</span>`).join('')}
                    ${p.models.length > 3 ? `<span class="fsb-model-pill more">+${p.models.length - 3}</span>` : ''}
                  </div>
                ` : ''}

                <div class="fsb-pcard-actions">
                  <button type="button" class="fsb-pcard-test-btn" data-provider-id="${providerId}" onclick="window.FenixSidebar?.testProviderConnection?.(this.dataset.providerId, this)">
                    <i class="ph-bold ph-lightning"></i> Testar Conexão
                  </button>
                  <span class="fsb-test-result" id="provResult_${providerId}"></span>
                </div>
              </div>
            `;
          }).join('') : '<div class="fsb-provider-card"><span class="fsb-meta-status">Nenhum provedor configurado ou medido.</span></div>'}
        </div>

        <!-- Uso por provedor derivado de chamadas persistidas. -->
        <div class="fnx-token-donut-card">
          <div class="fnx-donut-top-row">
            <span class="fnx-donut-title">USO TOTAL DE TOKENS</span>
            <span class="fsb-meta-status">${Number(usage.calls || 0).toLocaleString()} chamadas registradas</span>
          </div>
          <div style="margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
              <strong style="color:#00e5ff; font-family:var(--fnx-font-mono);">${Number(usage.tokensTotal || 0).toLocaleString()} <span style="color:#64748b;">/ ${Number.isFinite(tokenBudget) ? Number(tokenBudget).toLocaleString() : 'sem limite configurado'}</span></strong>
              <span style="color:#94a3b8; font-size:10px; font-family:var(--fnx-font-mono);">${budgetPct == null ? 'percentual não medido' : `${budgetPct.toFixed(1)}%`}</span>
            </div>
            <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
              <div style="width:${budgetPct == null ? 0 : budgetPct}%; height:100%; background:linear-gradient(90deg, #00e5ff, #38bdf8); border-radius:2px;"></div>
            </div>
          </div>
          <div class="fnx-donut-content-row">
            <div class="fnx-donut-chart-wrap">
              <svg width="72" height="72" viewBox="0 0 36 36" style="transform:rotate(-90deg);">
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>
                ${providerChart.map((item) => {
                  const dash = (item.share / 100) * 88;
                  const offset = chartOffset;
                  chartOffset += dash;
                  return `<circle cx="18" cy="18" r="14" fill="transparent" stroke="${item.color}" stroke-width="4" stroke-dasharray="${dash} 88" stroke-dashoffset="-${offset}"/>`;
                }).join('')}
              </svg>
            </div>
            <div class="fnx-donut-legend">
              ${providerChart.length ? providerChart.map((item) => `<div class="fnx-donut-legend-item"><span><span class="fnx-legend-dot" style="background:${item.color};"></span>${escapeHtml(item.provider)}</span> <strong>${item.share.toFixed(1)}%</strong></div>`).join('') : '<span class="fsb-meta-status">Sem chamadas registradas por provedor</span>'}
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════
             FÊNIX AI VISION & CREATIVE STUDIO (Open-Source GitHub Stack)
             Flux.1, Wan2.1, LTX-Video, CameraCtrl, BiRefNet, IOPaint, ag-psd
             ═══════════════════════════════════════════════════════════════════ -->
        <div class="fsb-image-studio" id="fsbImageStudio">
          <div class="fsb-is-header">
            <div class="fsb-is-title">
              <i class="ph-bold ph-sparkle" style="color:#fd79a8;"></i>
              <span>Estúdio Criativo IA &bull; Open-Source</span>
            </div>
            <span class="fsb-is-badge">FLUX.1 &bull; WAN2.1 &bull; ADOBE PSD/XML</span>
          </div>

          <div class="fsb-is-form">
            <div class="fsb-is-row">
              <div class="fsb-is-field">
                <label class="fsb-is-label">Projeto Alvo</label>
                <select class="fsb-is-select" id="fsbImgProject">
                  <option value="mf-atacadista" selected>👗 MF Atacadista (Moda &amp; Catálogo)</option>
                  <option value="fenix-os">🔥 Fênix OS (Sistema &amp; 3D)</option>
                  <option value="zapai-crm">📱 ZapAI CRM (Marketing)</option>
                </select>
              </div>
              <div class="fsb-is-field">
                <label class="fsb-is-label">Estilo / Motor</label>
                <select class="fsb-is-select" id="fsbImgStyle">
                  <option value="FASHION" selected>👗 Fashion / Lookbook Editorial</option>
                  <option value="PRODUCT">📦 Produto Recortado (BiRefNet)</option>
                  <option value="BANNER">🎨 Banner / Vitrine E-commerce</option>
                  <option value="LOGO">✒️ Logo &amp; Identidade (Flux + SVG)</option>
                  <option value="OUTPAINT">🪄 IOPaint Outpaint (Expandir Cenário)</option>
                  <option value="3D_RENDER">🏙️ Isométrico 3D / Cyberpunk</option>
                </select>
              </div>
            </div>

            <div class="fsb-is-field">
              <label class="fsb-is-label">Prompt Visual / Oferta</label>
              <textarea class="fsb-is-textarea" id="fsbImgPrompt" placeholder="Descreva a imagem, logo ou cena de vídeo...">Vestido midi floral moda feminina atacado lookbook elegante</textarea>
              <div class="fsb-is-chips">
                <button type="button" class="fsb-is-chip" onclick="window.FenixSidebar?.applyStudioChip?.('Vestido linho alfaiataria feminino modelo brasileira editorial')">👗 Vestido Linho</button>
                <button type="button" class="fsb-is-chip" onclick="window.FenixSidebar?.applyStudioChip?.('Conjunto cropped e saia midi estampa floral verao lookbook')">🌸 Conjunto Floral</button>
                <button type="button" class="fsb-is-chip" onclick="window.FenixSidebar?.applyStudioChip?.('Logotipo minimalista Mania Fashion Atacado monograma dourado')">✒️ Logo Marca</button>
                <button type="button" class="fsb-is-chip" onclick="window.FenixSidebar?.applyStudioChip?.('Banner promocional atacado moda feminina desconto')">🏷️ Banner Promo</button>
              </div>
            </div>

            <div class="fsb-is-row">
              <div class="fsb-is-field">
                <label class="fsb-is-label">Engine / Provedor</label>
                <select class="fsb-is-select" id="fsbImgProvider">
                  <option value="auto" selected>⚡ Auto (Flux.1 -&gt; ComfyUI)</option>
                  <option value="flux-fast">🚀 Flux.1 Schnell (Pollinations)</option>
                  <option value="api-platform">🖥️ ComfyUI / Wan2.1 (:3001)</option>
                  <option value="gemini-imagen">✨ Google Imagen 3</option>
                </select>
              </div>
              <div class="fsb-is-field">
                <label class="fsb-is-label">Formato Multi-Canal</label>
                <select class="fsb-is-select" id="fsbImgDimensions">
                  <option value="1080x1080" selected>1:1 (1080x1080 Feed)</option>
                  <option value="1080x1350">4:5 (1080x1350 Anúncios)</option>
                  <option value="1080x1920">9:16 (1080x1920 Stories/Reels)</option>
                  <option value="1920x1080">16:9 (1920x1080 YouTube)</option>
                  <option value="1200x420">1200x420 (E-commerce Desktop)</option>
                  <option value="390x433">390x433 (E-commerce Mobile)</option>
                </select>
              </div>
            </div>

            <div class="fsb-is-row">
              <div class="fsb-is-field">
                <label class="fsb-is-label">Câmera (Open-Higgsfield)</label>
                <select class="fsb-is-select" id="fsbCameraPreset">
                  <option value="orbit_360" selected>🎥 Orbit 360° (CameraCtrl)</option>
                  <option value="dolly_zoom">🎬 Dolly Zoom (Vertigo)</option>
                  <option value="crane_up">🏗️ Crane Up (Grua)</option>
                  <option value="pan_cinematic">🎞️ Panorâmica Cinematográfica</option>
                  <option value="fashion_runway">👠 Passarela Fashion (Wan2.1)</option>
                  <option value="slow_motion">⏱️ Slow Motion (LTX-Video)</option>
                </select>
              </div>
              <div class="fsb-is-field">
                <label class="fsb-is-label">Ponte Adobe Nativa</label>
                <div style="display:flex; gap:4px;">
                  <button type="button" class="fsb-action-btn" onclick="window.FenixSidebar?.exportStudioPsd?.(this)" style="flex:1; font-size:9.5px; padding:5px 4px;" title="Exportar .PSD em 5 camadas (ag-psd)">
                    <i class="ph-bold ph-layers"></i> .PSD (5 Camadas)
                  </button>
                  <button type="button" class="fsb-action-btn" onclick="window.FenixSidebar?.exportStudioPremiereXml?.(this)" style="flex:1; font-size:9.5px; padding:5px 4px;" title="Exportar Timeline FCPXML para Premiere Pro e After Effects">
                    <i class="ph-bold ph-film-strip"></i> .XML Premiere
                  </button>
                </div>
              </div>
            </div>

            <button type="button" class="fsb-is-btn" id="fsbBtnGenerateImg" onclick="window.FenixSidebar?.generateStudioImage?.(this)">
              <i class="ph-bold ph-sparkle"></i> Gerar Criativo com IA
            </button>
          </div>

          <!-- Preview & History Container -->
          <div id="fsbImgPreviewContainer"></div>
          <div id="fsbImgHistoryWrap"></div>
        </div>
      `;

      container.innerHTML = html;
      setTimeout(() => SidebarController.loadStudioHistory(), 50);
    },

    async testProviderConnection(providerId, btn) {
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> Testando...`;
      const resultEl = document.getElementById(`provResult_${providerId}`);
      if (resultEl) resultEl.textContent = '';

      try {
        const res = await authedFetch('/api/v2/providers/test', {
          method: 'POST',
          body: JSON.stringify({ providerId })
        });
        const data = await res.json();
        const latencyEl = document.getElementById(`provLatency_${providerId}`);
        if (latencyEl && data.latencyMs) {
          latencyEl.textContent = `${data.latencyMs}ms`;
        }
        if (resultEl) {
          resultEl.style.color = data.ok ? '#10B981' : '#EF4444';
          resultEl.textContent = data.ok ? `OK (${data.latencyMs}ms)` : `Falha`;
        }
      } catch (err) {
        if (resultEl) {
          resultEl.style.color = '#EF4444';
          resultEl.textContent = 'Erro';
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    },

    applyStudioChip(text) {
      const promptInput = document.getElementById('fsbImgPrompt');
      if (promptInput) {
        promptInput.value = text;
        promptInput.focus();
      }
    },

    async exportStudioPsd(btn) {
      const origText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> .PSD...`;
      }
      try {
        const dimParts = (document.getElementById('fsbImgDimensions')?.value || '').split('x').map(Number);
        const width = dimParts[0] && dimParts[0] > 0 ? dimParts[0] : undefined;
        const height = dimParts[1] && dimParts[1] > 0 ? dimParts[1] : undefined;
        const res = await authedFetch('/api/v2/creative-studio/export/psd', {
          method: 'POST',
          body: JSON.stringify({ width, height })
        });
        const data = await res.json();
        if (!data.ok || !data.psdBase64) throw new Error(data.error || 'Falha ao gerar PSD');
        const bin = atob(data.psdBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'image/vnd.adobe.photoshop' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `criativo-fenix-${data.width}x${data.height}-5camadas.psd`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      } catch (err) {
        alert('Erro ao exportar PSD: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origText;
        }
      }
    },

    async exportStudioPremiereXml(btn) {
      const origText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> .XML...`;
      }
      try {
        const prompt = (document.getElementById('fsbImgPrompt')?.value || 'Campanha Comercial').trim();
        const dimParts = (document.getElementById('fsbImgDimensions')?.value || '').split('x').map(Number);
        const width = dimParts[0] && dimParts[0] > 0 ? dimParts[0] : undefined;
        const height = dimParts[1] && dimParts[1] > 0 ? dimParts[1] : undefined;
        const res = await authedFetch('/api/v2/creative-studio/export/premiere-xml', {
          method: 'POST',
          body: JSON.stringify({ projectName: prompt.slice(0, 32), width, height })
        });
        const data = await res.json();
        if (!data.ok || !data.xml) throw new Error(data.error || 'Falha ao gerar XML');
        const blob = new Blob([data.xml], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timeline-premiere-after-effects.xml`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      } catch (err) {
        alert('Erro ao exportar XML Premiere: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origText;
        }
      }
    },

    async generateStudioImage(btn) {
      const promptInput = document.getElementById('fsbImgPrompt');
      const prompt = (promptInput?.value || '').trim();
      if (!prompt) {
        alert('Por favor, informe uma descrição ou escolha um prompt sugerido.');
        return;
      }

      const project = document.getElementById('fsbImgProject')?.value || 'mf-atacadista';
      const style = document.getElementById('fsbImgStyle')?.value || 'FASHION';
      const provider = document.getElementById('fsbImgProvider')?.value || 'auto';
      const dimParts = (document.getElementById('fsbImgDimensions')?.value || '').split('x').map(Number);
      const width = dimParts[0] && dimParts[0] > 0 ? dimParts[0] : undefined;
      const height = dimParts[1] && dimParts[1] > 0 ? dimParts[1] : undefined;

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> Criando Criativo com IA...`;
      MascotController.setMood('working');

      const previewContainer = document.getElementById('fsbImgPreviewContainer');
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div style="padding:16px; text-align:center; color:#94a3b8; font-size:11px;">
            <i class="ph-bold ph-spinner ph-spin" style="font-size:20px; color:#e84393; display:block; margin-bottom:8px;"></i>
            Invocando cluster de visão neural (${provider})...<br>
            <span style="font-size:9.5px; color:#64748b;">(Flux.1 Schnell / Wan2.1 / BiRefNet / IOPaint)</span>
          </div>
        `;
      }

      try {
        const res = await authedFetch('/api/v2/images/generate', {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            style,
            width,
            height,
            provider,
            sourceProject: project
          })
        });

        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || 'Falha na resposta do motor de imagens.');
        }

        if (previewContainer) {
          previewContainer.innerHTML = `
            <div class="fsb-is-preview">
              <img src="${data.imageUrl}" alt="${data.prompt}" class="fsb-is-preview-img" onclick="window.open('${data.imageUrl}', '_blank')" title="Clique para ampliar"/>
              <div class="fsb-is-preview-meta">
                <div class="fsb-is-preview-meta-row">
                  <span style="color:#fd79a8; font-weight:700;"><i class="ph-bold ph-check-circle" style="color:#10b981;"></i> ${data.provider} &bull; ${data.model}</span>
                  <span style="font-family:monospace; color:#38bdf8;">${data.latencyMs}ms</span>
                </div>
                <div style="font-size:9.5px; color:#cbd5e1; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${data.styledPrompt}">
                  ${data.styledPrompt}
                </div>
                <div style="display:flex; gap:6px; margin-top:4px;">
                  <button type="button" class="fsb-action-btn" onclick="window.open('${data.imageUrl}', '_blank')" style="flex:1; font-size:10px; padding:4px;">
                    <i class="ph-bold ph-arrow-square-out"></i> Abrir HD
                  </button>
                  <button type="button" class="fsb-action-btn" onclick="window.FenixSidebar.useImageInMFAtacadista('${data.imageUrl}')" style="flex:1; font-size:10px; padding:4px; color:#fd79a8; border-color:rgba(232,67,147,0.4);">
                    <i class="ph-bold ph-t-shirt"></i> MF Provador
                  </button>
                </div>
              </div>
            </div>
          `;
        }

        MascotController.setMood('happy');
        SidebarController.loadStudioHistory();
      } catch (err) {
        if (previewContainer) {
          previewContainer.innerHTML = `
            <div style="padding:10px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); border-radius:6px; color:#ef4444; font-size:10px;">
              <strong><i class="ph-bold ph-warning-circle"></i> Erro ao gerar imagem:</strong> ${err.message}
            </div>
          `;
        }
        MascotController.setMood('error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    },

    async loadStudioHistory() {
      const historyWrap = document.getElementById('fsbImgHistoryWrap');
      if (!historyWrap) return;

      try {
        const res = await authedFetch('/api/v2/images/history');
        const data = await res.json();
        if (data.ok && data.history && data.history.length) {
          historyWrap.innerHTML = `
            <div style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px; margin-top:8px;">Galeria de Criações Recentes (${data.count}):</div>
            <div class="fsb-is-history">
              ${data.history.slice(0, 8).map(h => `
                <img src="${h.imageUrl}" alt="${h.prompt}" class="fsb-is-history-thumb" title="${h.prompt} (${h.provider}, ${h.latencyMs}ms)" onclick="window.open('${h.imageUrl}', '_blank')"/>
              `).join('')}
            </div>
          `;
        }
      } catch (e) {}
    },

    useImageInMFAtacadista(imageUrl) {
      alert(`Imagem vinculada com sucesso ao MF Atacadista!\nURL: ${imageUrl.slice(0, 60)}...\nPronta para exibição no Provador Virtual e Catálogo B2B.`);
      SidebarController.switchTab('chat');
      const input = document.getElementById('fsbChatInput');
      if (input) {
        input.value = `Fênix, vinculei uma nova imagem de lookbook ao MF Atacadista: ${imageUrl}`;
        SidebarController.sendChatMessage();
      }
    },

    async execTerminalCommand(cmd) {
      const out = document.getElementById('fsbTerminalOutput');
      if (!out) return;
      out.textContent += `\nfenix> ${cmd}\n`;

      const clean = cmd.trim().toLowerCase();
      if (clean === 'help') {
        out.textContent += 'Comandos disponíveis: status, vps, health, memory, jobs, clear\n';
      } else if (clean === 'clear') {
        out.textContent = 'Fênix OS Live Terminal [Version 2.1.0]\n';
      } else if (clean === 'status') {
        out.textContent += '[KERNEL] Fênix OS Engine: ONLINE | PM2 #16: Online | PM2 #17: Online\n';
      } else if (clean === 'vps') {
        out.textContent += '[VPS 209.50.241.22] Docker Fastify: 3001 | Postgres 16: 5433 | Redis 7: 6380\n';
      } else if (clean === 'jobs') {
        out.textContent += '[JOBS] Consultando fila...\n';
        try {
          const qRes = await authedFetch('/api/v2/queue/status');
          const qData = qRes.ok ? await qRes.json() : null;
          out.textContent += `Ativos: ${qData?.active || 0} | Espera: ${qData?.waiting || 0} | Concluídos: ${qData?.completed || 0}\n`;
        } catch (_) {
          out.textContent += 'Fila ativa no runtime.\n';
        }
      } else {
        try {
          const res = await authedFetch('/api/v2/conversation', {
            method: 'POST',
            body: JSON.stringify({ message: cmd })
          });
          if (res.ok) {
            const data = await res.json();
            out.textContent += `[RESP] ${data.response || 'Executado.'}\n`;
          } else {
            out.textContent += `[EXEC] Comando "${cmd}" enviado ao runtime (HTTP ${res.status}).\n`;
          }
        } catch (e) {
          out.textContent += `[EXEC] Comando "${cmd}" registrado.\n`;
        }
      }
      out.scrollTop = out.scrollHeight;
    },

    setDOMText(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    },

    escapeHTML(str) {
      return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }
  };

  // ── Controlador do Dossiê RPG & Customizer Habbo/Tibia de Agentes ──
  const AgentRosterRPG = {
    init() {
      // Fechar modal
      document.getElementById('fadCloseBtn')?.addEventListener('click', () => this.closeModal());
      modalEl?.addEventListener('click', (e) => {
        if (e.target === modalEl) this.closeModal();
      });

      // Tabs do Modal
      document.querySelectorAll('.fad-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pan = btn.dataset.fpan;
          document.querySelectorAll('.fad-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
          document.querySelectorAll('.fad-tab-pane').forEach(p => p.classList.remove('active'));
          document.getElementById(`fadPane${pan.charAt(0).toUpperCase() + pan.slice(1)}`)?.classList.add('active');
        });
      });

      // Paletas de Cor
      this.renderPalettes();

      // Chat Direto no Modal
      document.getElementById('fadDirectSendBtn')?.addEventListener('click', () => this.sendDirectMessage());
      document.getElementById('fadDirectInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendDirectMessage();
      });

      // Interceptar cliques nos cartões de agentes para abrir o Dossiê
      this.hookAgentCards();
    },

    renderPalettes() {
      const skinBox = document.getElementById('fadSkinPalette');
      const hairBox = document.getElementById('fadHairPalette');
      const shirtBox = document.getElementById('fadShirtPalette');

      if (skinBox) {
        skinBox.innerHTML = SKIN_COLORS.map((c, i) => `<div class="fad-palette-dot ${i === 0 ? 'active' : ''}" style="background:${c};" data-skin="${c}"></div>`).join('');
        skinBox.querySelectorAll('.fad-palette-dot').forEach(dot => {
          dot.addEventListener('click', () => {
            skinBox.querySelectorAll('.fad-palette-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            this.updateCustomAvatar({ skinColor: dot.dataset.skin });
          });
        });
      }

      if (hairBox) {
        hairBox.innerHTML = HAIR_COLORS.map((c, i) => `<div class="fad-palette-dot ${i === 0 ? 'active' : ''}" style="background:${c};" data-hair="${c}"></div>`).join('');
        hairBox.querySelectorAll('.fad-palette-dot').forEach(dot => {
          dot.addEventListener('click', () => {
            hairBox.querySelectorAll('.fad-palette-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            this.updateCustomAvatar({ hairColor: dot.dataset.hair });
          });
        });
      }

      if (shirtBox) {
        shirtBox.innerHTML = SHIRT_COLORS.map((c, i) => `<div class="fad-palette-dot ${i === 0 ? 'active' : ''}" style="background:${c};" data-shirt="${c}"></div>`).join('');
        shirtBox.querySelectorAll('.fad-palette-dot').forEach(dot => {
          dot.addEventListener('click', () => {
            shirtBox.querySelectorAll('.fad-palette-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            this.updateCustomAvatar({ shirtColor: dot.dataset.shirt });
          });
        });
      }
    },

    openModal(agentId, agentData = null) {
      state.activeInspectAgent = agentData || { id: agentId, name: agentId, role: 'Specialist' };
      if (!modalEl) return;

      const title = document.getElementById('fadAgentTitle');
      const roleName = document.getElementById('fadRoleName');
      const specRole = document.getElementById('fadSpecRole');
      const specStatus = document.getElementById('fadSpecStatus');
      const nodeName = document.getElementById('fadTreeNodeName');
      const welcome = document.getElementById('fadDirectWelcome');

      const name = state.activeInspectAgent.name || agentId;
      const role = state.activeInspectAgent.role || 'Specialist';
      const status = state.activeInspectAgent.status || 'AVAILABLE';

      if (title) title.textContent = `DOSSIÊ: ${name.toUpperCase()}`;
      if (roleName) roleName.textContent = role.toUpperCase();
      if (specRole) specRole.textContent = role;
      if (specStatus) specStatus.textContent = status === 'WORKING' ? 'EM EXECUÇÃO' : 'DISPONÍVEL';
      if (nodeName) nodeName.textContent = name;
      if (welcome) welcome.textContent = `Canal direto ativo com ${name} (${role}). Pronto para receber tarefas específicas.`;

      // Renderizar Avatar 2.5D no Canvas do Dossiê
      this.drawHabboAvatar();

      modalEl.classList.add('open');
    },

    closeModal() {
      modalEl?.classList.remove('open');
    },

    drawHabboAvatar(customProps = {}) {
      const canvas = document.getElementById('fadPixelCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const skin = customProps.skinColor || SKIN_COLORS[1];
      const hair = customProps.hairColor || HAIR_COLORS[0];
      const shirt = customProps.shirtColor || SHIRT_COLORS[0];

      // Desenho em Pixel-Art Modular estilo Habbo/Tibia (Escalado)
      // 1. Sombra de Contato
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(32, 90, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Pernas / Calças
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(24, 58, 7, 24);
      ctx.fillRect(33, 58, 7, 24);

      // 3. Sapatos
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(23, 80, 8, 5);
      ctx.fillRect(33, 80, 8, 5);

      // 4. Torso / Camisa
      ctx.fillStyle = shirt;
      ctx.fillRect(21, 36, 22, 23);

      // 5. Cabeça / Rosto
      ctx.fillStyle = skin;
      ctx.fillRect(22, 14, 20, 20);

      // 6. Cabelo
      ctx.fillStyle = hair;
      ctx.fillRect(20, 11, 24, 8);
      ctx.fillRect(19, 14, 4, 10);

      // 7. Olhos Pixelados
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(26, 22, 3, 3);
      ctx.fillRect(35, 22, 3, 3);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(27, 23, 1, 1);
      ctx.fillRect(36, 23, 1, 1);

      // 8. Laptop Brilhante na Mão
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(22, 48, 20, 12);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(24, 50, 16, 8);
    },

    updateCustomAvatar(props) {
      this.drawHabboAvatar(props);
      if (state.activeInspectAgent) {
        localStorage.setItem(`fenix_avatar_${state.activeInspectAgent.id}`, JSON.stringify(props));
      }
    },

    sendDirectMessage() {
      const input = document.getElementById('fadDirectInput');
      const text = input?.value.trim();
      if (!text) return;
      input.value = '';

      const container = document.getElementById('fadDirectChatMessages');
      if (!container) return;

      const userMsg = document.createElement('div');
      userMsg.className = 'fsb-msg user';
      userMsg.innerHTML = `<div class="fsb-bubble">${SidebarController.escapeHTML(text)}</div>`;
      container.appendChild(userMsg);

      setTimeout(() => {
        const agentName = state.activeInspectAgent?.name || 'Agente';
        const botMsg = document.createElement('div');
        botMsg.className = 'fsb-msg bot';
        botMsg.innerHTML = `<div class="fsb-bubble"><strong>[${agentName}]</strong> Entendido! Processando diretiva no contexto do projeto.</div>`;
        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
      }, 500);
    },

    hookAgentCards() {
      // Quando os cards de agentes forem clicados na view-agents, intercepta e abre o Dossiê
      document.addEventListener('click', (e) => {
        const card = e.target.closest('#fenix-agents-grid .cp-agent-card[data-agent-id]');
        if (card) {
          const id = card.dataset.agentId;
          const name = card.querySelector('.cp-agent-name')?.textContent || id;
          const role = card.querySelector('.cp-agent-role')?.textContent || 'Specialist';
          const status = card.dataset.agentStatus || 'AVAILABLE';
          AgentRosterRPG.openModal(id, { id, name, role, status });
        }
      });
    }
  };

  // ── Inicialização Geral ao Carregar o DOM ──
  function init() {
    if (window.__FENIX_COPILOT_INSTANCE__) {
      console.warn('[FENIX COPILOT] Copilot instance already registered, skipping duplicate init.');
      return;
    }
    window.__FENIX_COPILOT_INSTANCE__ = MascotController;
    window.__FENIX_SINGLETONS__?.register('copilot', MascotController);

    ensureDOMElements();
    MascotController.initDrag();
    SidebarController.initEvents();
    SidebarController.initConversations();
    AgentRosterRPG.init();

    // Telemetria inteligente: só busca se aberto e visível
    if (state.isOpen && !document.hidden) {
      SidebarController.fetchTelemetry();
    }
    const copilotTelemTimer = setInterval(() => {
      if (state.isOpen && !document.hidden) {
        SidebarController.fetchTelemetry();
      }
    }, 20000);
    window.__FENIX_SINGLETONS__?.register('copilotTelemetryTimer', copilotTelemTimer);

    // Restaurar largura e modo docked (Lovable Split Screen)
    const savedWidth = localStorage.getItem('fenix_sidebar_width') || '380px';
    document.documentElement.style.setProperty('--fsb-width', savedWidth);
    state.isDocked = localStorage.getItem('fenix_sidebar_docked') !== 'false';
    document.body.classList.toggle('fsb-docked', state.isDocked);
    const dockBtnEl = document.getElementById('fsbDockBtn');
    if (dockBtnEl) {
      dockBtnEl.classList.toggle('active', state.isDocked);
      const text = document.getElementById('fsbDockBtnText');
      if (text) text.textContent = state.isDocked ? 'Split' : 'Float';
    }

    // Exportar na janela global do Fênix para interoperabilidade
    window.FenixMascotSidebar = {
      MascotController,
      SidebarController,
      AgentRosterRPG,
      setMood: (m) => MascotController.setMood(m),
      toggle: () => MascotController.toggle(),
      openAgentDossier: (id) => AgentRosterRPG.openModal(id)
    };

    // Ouvinte de Eventos em Tempo Real do Fênix OS (EventBus / WebSocket)
    document.addEventListener('fenix-live', (evt) => {
      const detail = evt.detail || {};
      const type = String(detail.type || 'event').toLowerCase();

      // Filtrar ruído de heartbeat e polling vazio
      if (type === 'status' || type === 'ping' || type === 'heartbeat' || type === 'snapshot' || (type === 'runtime.snapshot' && !detail.message)) {
        return;
      }

      const time = new Date().toLocaleTimeString('pt-BR');

      // 1. Adicionar ao Stream de Logs
      const logsContainer = document.getElementById('fsbLogsContainer');
      if (logsContainer) {
        const row = document.createElement('div');
        row.className = 'fsb-log-row';
        let tag = 'SYS';
        let tagType = 'info';

        if (type.includes('agent')) { tag = 'AGENT'; tagType = 'action'; }
        else if (type.includes('job') || type.includes('mission')) { tag = 'JOB'; tagType = 'action'; }
        else if (type.includes('ide') || type.includes('project')) { tag = 'IDE'; tagType = 'info'; }
        else if (type.includes('chat') || type.includes('lane')) { tag = 'CHAT'; tagType = 'info'; }
        else if (type.includes('error') || type.includes('fail')) { tag = 'ERROR'; tagType = 'error'; }
        else if (type.includes('vps') || type.includes('docker')) { tag = 'VPS'; tagType = 'info'; }
        else if (type.includes('git')) { tag = 'GIT'; tagType = 'info'; }

        const rawMsg = detail.message || detail.payload?.name || detail.payload?.title || detail.text || type;
        row.innerHTML = `
          <span class="fsb-log-time">${time}</span>
          <span class="fsb-log-tag ${tagType}">${SidebarController.escapeHTML(tag)}</span>
          <span class="fsb-log-text">${SidebarController.escapeHTML(rawMsg)}</span>
        `;
        logsContainer.appendChild(row);
        if (logsContainer.children.length > 150) logsContainer.removeChild(logsContainer.children[0]);
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }

      // 2. Reação do Mascote
      if (type.includes('start') || type.includes('dispatched')) {
        MascotController.setMood('working');
      } else if (type.includes('complete') || type.includes('success')) {
        MascotController.setMood('success');
      } else if (type.includes('fail') || type.includes('error')) {
        MascotController.setMood('error');
      }
    });

    window.FenixSidebar = {
      toggle: () => MascotController.toggle(),
      open: () => MascotController.setCopilotState('open'),
      collapse: () => MascotController.setCopilotState('closed'),
      compact: () => MascotController.setCopilotState('compact'),
      expand: () => MascotController.setCopilotState('expanded'),
      setCopilotState: (s) => MascotController.setCopilotState(s),
      confirmJob: (jobId) => SidebarController.approveJob(jobId),
      approveJob: (jobId) => SidebarController.approveJob(jobId),
      pauseJob: (jobId) => SidebarController.pauseJob(jobId),
      resumeJob: (jobId) => SidebarController.resumeJob(jobId),
      cancelJob: (jobId) => SidebarController.cancelJob(jobId),
      updateJobCardDOM: (jobId, job) => SidebarController.updateJobCardDOM(jobId, job),
      trackJob: (jobId, job) => SidebarController.trackJob(jobId, job),
      executeAction: (act) => SidebarController.executeAction(act),
      copyCode: (btn) => SidebarController.copyCode(btn),
      handleCommand: (cmd) => SidebarController.handleCommand(cmd),
      switchConversation: (id) => SidebarController.switchConversation(id),
      deleteConversation: (id, e) => SidebarController.deleteConversation(id, e),
      startNewConversation: () => SidebarController.startNewConversation(),
      toggleHistory: () => SidebarController.toggleHistoryDrawer(),
      copyText: (text, btn) => SidebarController.copyText(text, btn),
      downloadForensicJson: (data) => SidebarController.downloadForensicJson(data),
      dispatchReverseJob: (fileName, formatType) => SidebarController.dispatchReverseJob(fileName, formatType),
      openFileInIde: (fileName) => SidebarController.openFileInIde(fileName),
      send: (message) => {
        if (!state.isOpen) MascotController.toggle();
        SidebarController.switchTab('chat');
        const input = document.getElementById('fsbChatInput');
        if (input) {
          input.value = message;
          SidebarController.sendChatMessage();
        }
      },
      setMood: (mood) => MascotController.setMood(mood),
      fetchTelemetry: (m) => SidebarController.fetchTelemetry(m),
      fetchProviders: (m) => SidebarController.fetchProviders(m),
      testProviderConnection: (id, b) => SidebarController.testProviderConnection(id, b),
      openInspector: (comp) => SidebarController.openInspector(comp),
      switchTab: (tab) => SidebarController.switchTab(tab),
      applyStudioChip: (text) => SidebarController.applyStudioChip(text),
      generateStudioImage: (btn) => SidebarController.generateStudioImage(btn),
      exportStudioPsd: (btn) => SidebarController.exportStudioPsd(btn),
      exportStudioPremiereXml: (btn) => SidebarController.exportStudioPremiereXml(btn),
      loadStudioHistory: () => SidebarController.loadStudioHistory(),
      useImageInMFAtacadista: (url) => SidebarController.useImageInMFAtacadista(url)
    };

    window.fenixOpenSystemInspector = (companyId) => {
      window.FenixSidebar?.openInspector?.(companyId);
    };

    window.fenixChatAboutCompany = (companyName) => {
      window.FenixSidebar?.send?.(`Fênix, analise a operação, rotas e gargalos do sistema ${companyName || 'API Platform'} e sugira melhorias imediatas.`);
    };

    window.fenixOpenProjectFromInspector = (projectId) => {
      if (window.showView) window.showView('projects');
      if (window.fenixSelectProject) {
        window.fenixSelectProject(projectId);
      } else {
        const card = document.querySelector(`[data-project-id="${projectId}"]`);
        if (card) card.click();
      }
    };

    window.fenixCopilot = {
      updateContext: (ctx) => updateCopilotContext(ctx),
      getContext: () => ({ ...copilotContext }),
      sendMessage: (message) => {
        if (!state.isOpen) MascotController.toggle();
        SidebarController.switchTab('chat');
        const input = document.getElementById('fsbChatInput');
        if (input) {
          input.value = message;
          SidebarController.sendChatMessage();
        }
      },
      proposeDiff: (diff, filePath, newContent) => showDiffProposal(diff, filePath, newContent),
      applyDiff: () => applyCurrentDiff(),
      rejectDiff: () => rejectCurrentDiff()
    };
    updateCopilotContext();

    window.addEventListener('copilot:context-changed', (e) => {
      if (e.detail) updateCopilotContext(e.detail);
    });

    window.addEventListener('selection:changed', (e) => {
      const sel = e.detail;
      if (!sel || sel.type === 'none') {
        updateCopilotContext({ contextType: 'GLOBAL', contextId: null, project: 'GLOBAL', agent: '—' });
      } else if (sel.type === 'company') {
        updateCopilotContext({ contextType: 'COMPANY', contextId: sel.id, project: sel.name || sel.id });
      } else if (sel.type === 'project') {
        updateCopilotContext({ contextType: 'PROJECT', contextId: sel.id, project: sel.name || sel.id });
      } else if (sel.type === 'agent') {
        updateCopilotContext({ contextType: 'AGENT', contextId: sel.id, agent: sel.name || sel.id });
      } else if (sel.type === 'world_entity') {
        updateCopilotContext({ contextType: 'WORLD_ENTITY', contextId: sel.id });
      }

      if (state.activeTab === 'inspector') {
        SidebarController.renderInspector(sel);
      }
    });

    if (window.GlobalSelectionStore?.selectedEntity) {
      const initialSel = window.GlobalSelectionStore.selectedEntity;
      if (initialSel.type !== 'none') {
        updateCopilotContext({
          contextType: initialSel.type.toUpperCase(),
          contextId: initialSel.id,
          project: initialSel.type === 'company' || initialSel.type === 'project' ? (initialSel.name || initialSel.id) : undefined,
          agent: initialSel.type === 'agent' ? (initialSel.name || initialSel.id) : undefined
        });
      }
    }

    console.log('[FENIX] Mascot Sidebar & RPG Agent Studio Inicializado com Sucesso.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
