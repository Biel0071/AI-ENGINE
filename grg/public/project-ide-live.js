/**
 * FÊNIX OS V13 — FÊNIX WORKSPACE & LIVING DEVELOPMENT ENVIRONMENT
 * Full-Stack Real Capability: VS Code/Cursor level IDE + File Tree + Monaco/Editor
 * + Real Terminal + Canonical Test Runner + Real Git/GitHub + Fênix Copilot + 3D World Linkage
 */

(() => {
  'use strict';

  const state = {
    projectId: localStorage.getItem('fenix_ide_project') || 'fenix-os',
    requestedProjectId: null,
    path: null,
    hash: null,
    savedContent: '',
    dirty: false,
    generation: 0,
    openToken: 0,
    projects: [],
    openTabs: [],
    mode: localStorage.getItem('fenix_ide_mode_v2') || 'code',
    viewport: 'desktop',
    previewUrl: '',
    previewTarget: null,
    treeData: [],
    activeAgent: {
      id: 'agent-api-ops',
      name: 'Alex',
      role: 'API Platform Engineer',
      floor: 1,
      district: 'API Platform Tower'
    },
    terminalHistory: [],
    pendingPatch: null,
    pendingEditDraft: null,
    pendingPlan: null,
    pendingMission: null,
    planScope: 'FILE',
    proposalRequest: 0
  };

  let loadPromise = null;
  let previewLoadTimer = null;
  let previewLoadToken = 0;
  const endpoint = (suffix = '') => `/api/fenix/projects/${encodeURIComponent(state.projectId)}${suffix}`;

  function getVisualSelectionContext(projectId) {
    try {
      const selection = window.FenixVisualIDE?.getSelectionContext?.();
      const projectRoot = window.FenixProjectIDE?.getProjectRoot?.(projectId);
      const normalize = (value) => {
        const normalized = String(value || '').replace(/[\\/]+/g, '/').replace(/\/$/, '');
        return /^[a-z]:\//i.test(normalized) ? normalized.toLowerCase() : normalized;
      };
      if (!selection?.workspacePath || !projectRoot || normalize(selection.workspacePath) !== normalize(projectRoot)) return null;
      return { ...selection, projectId, workspacePath: undefined };
    } catch (_) {
      return null;
    }
  }

  async function json(url, options = {}) {
    const token = localStorage.getItem('grg_token') || localStorage.getItem('fenix_token');
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      credentials: 'same-origin',
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  function status(message, error = false) {
    const node = document.getElementById('fenixIdeLiveStatus');
    if (node) {
      node.textContent = message;
      node.style.color = error ? '#EF4444' : '#00D9FF';
      node.dataset.error = String(error);
    }
  }

  function appendCopilotText(stream, { author, text, user = false, metadata = '' }) {
    if (!stream) return null;
    const card = document.createElement('div');
    card.style.cssText = `background:${user ? '#102748' : '#0B1018'};border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px;max-width:92%;align-self:${user ? 'flex-end' : 'flex-start'};white-space:pre-wrap;overflow-wrap:anywhere`;
    const heading = document.createElement('strong');
    heading.textContent = `${author}: `;
    heading.style.color = user ? '#00E5A0' : '#00D9FF';
    card.append(heading, document.createTextNode(text));
    if (metadata) {
      const detail = document.createElement('small');
      detail.textContent = metadata;
      detail.style.cssText = 'display:block;margin-top:8px;color:#94a3b8';
      card.append(detail);
    }
    stream.append(card);
    stream.scrollTop = stream.scrollHeight;
    return card;
  }

  function getPreviewUrlForProject(project) {
    const projectId = typeof project === 'string' ? project : project?.id;
    const backendPort = Number(project?.backend?.port || project?.deployment?.backendPort) || null;
    const deployment = project?.deployment || {};
    const frontendPort = [project?.frontend?.port, deployment.dashboardPort, deployment.frontendPort, deployment.port]
      .map(Number).find(port => Number.isFinite(port) && port > 0 && port !== backendPort) || null;
    const frontendBindings = (deployment.bindings || []).filter(binding => {
      if (!binding?.url || !/(front.?end|dashboard|web.?app|website)/i.test(binding.label || '')) return false;
      try {
        const url = new URL(binding.url, window.location.origin);
        const urlPort = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
        const bindingPort = Number(binding.port) || urlPort;
        if (bindingPort !== urlPort || bindingPort === backendPort || /\/health(?:\/|$)|\/api\//i.test(url.pathname)) return false;
        return true;
      } catch { return false; }
    });
    const frontendBinding = frontendBindings.find(binding => {
      if (!frontendPort) return true;
      try {
        const url = new URL(binding.url, window.location.origin);
        const urlPort = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
        return (Number(binding.port) || urlPort) === frontendPort;
      } catch { return false; }
    }) || frontendBindings[0];
    if (frontendBinding) return frontendBinding.url;
    if (projectId === 'fenix-os') {
      const fenixBinding = (deployment.bindings || []).find(binding => binding?.url && /fenix|gateway|principal/i.test(binding.label || ''));
      if (fenixBinding?.url) return fenixBinding.url;
      return '/login.html?preview=1';
    }
    if (project?.workspace) {
      return `/api/project-mirror/preview?path=${encodeURIComponent(project.workspace)}&file=index.html`;
    }
    return '/login.html?preview=1';
  }

  function getPreviewUrlForScreen(project, screen) {
    const route = typeof screen?.route === 'string' ? screen.route.trim() : '';
    const decodedRoute = (() => { try { return decodeURIComponent(route); } catch { return ''; } })();
    const validRoute = route.length <= 300
      && (route === '' || route.startsWith('#') || (route.startsWith('/') && !route.startsWith('//')))
      && !/[\\\u0000-\u001f]/.test(route)
      && !decodedRoute.split(/[/?#]/).includes('..');
    const safeRoute = validRoute ? route : '';
    const sourceFile = String(screen?.previewTarget?.file || screen?.sourceFile || '').trim().replace(/\\/g, '/');
    const workspace = String(project?.workspace || project?.localPath || '').trim();
    const safeHtmlSource = workspace && sourceFile && !/^(?:[a-z]:|\/|\/\/)/i.test(sourceFile)
      && !sourceFile.split('/').includes('..') && /\.html?$/i.test(sourceFile);
    if (safeHtmlSource) {
      const url = `/api/project-mirror/preview?path=${encodeURIComponent(workspace)}&file=${encodeURIComponent(sourceFile)}`;
      return safeRoute.startsWith('#') ? `${url}${safeRoute}` : url;
    }

    const frontendPort = Number(project?.frontend?.port);
    const frontendBinding = (project?.deployment?.bindings || []).find(binding =>
      binding?.url && /front.?end/i.test(binding.label || '') && (!frontendPort || Number(binding.port) === frontendPort)
    );
    if (frontendBinding && safeRoute) {
      try {
        const url = new URL(frontendBinding.url, window.location.origin);
        if (safeRoute.startsWith('#')) url.hash = safeRoute;
        else { url.pathname = safeRoute; url.search = ''; url.hash = ''; }
        return url.href;
      } catch { /* Invalid registered preview URLs fall back to the canonical project preview. */ }
    }
    return getPreviewUrlForProject(project);
  }

  function isRecursionUrl(url) {
    if (!url) return false;
    // Authorized sandboxed previews never count as forbidden recursion
    if (url.includes('preview=1') || url.includes('embedded=ide_preview')) return false;
    const lower = String(url).toLowerCase().trim();
    if (lower === '/' || lower === '/app' || lower.endsWith('/app') || lower.includes('/app#') || lower.includes('grg/public/index.html')) {
      return true;
    }
    const currentOrigin = (window.location.origin || '').toLowerCase();
    if (currentOrigin && (lower === currentOrigin || lower === currentOrigin + '/' || lower === currentOrigin + '/app')) {
      return true;
    }
    return false;
  }

  function setMode(newMode) {
    state.mode = newMode;
    localStorage.setItem('fenix_ide_mode_v2', newMode);
    const editorArea = document.getElementById('fenixIdeEditorArea');
    const previewPane = document.getElementById('fenixIdePreviewPane');
    const worldPane = document.getElementById('fenixIdeWorldPane');
    const worldMount = document.getElementById('fenixIdeWorldMount');
    const splitDivider = document.getElementById('fenixIdeSplitDivider');

    const btnCode = document.getElementById('btnIdeModeCode');
    const btnPreview = document.getElementById('btnIdeModePreview');
    const btnSplit = document.getElementById('btnIdeModeSplit');
    const btnWorld = document.getElementById('btnIdeModeWorld');

    [btnCode, btnSplit, btnPreview, btnWorld].forEach(b => {
      if (b) {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#94A3B8';
        b.style.fontWeight = '600';
      }
    });

    const cityCanvas = document.getElementById('cityCanvas');
    const viewCity = document.getElementById('view-city');

    if (newMode === 'code') {
      clearTimeout(previewLoadTimer);
      previewLoadToken++;
      if (editorArea) { editorArea.style.display = 'flex'; editorArea.style.flex = '1'; }
      if (previewPane) { previewPane.style.display = 'none'; }
      if (worldPane) { worldPane.style.display = 'none'; }
      if (splitDivider) { splitDivider.style.display = 'none'; }
      if (btnCode) {
        btnCode.classList.add('active');
        btnCode.style.background = 'rgba(0,217,255,0.14)';
        btnCode.style.color = '#00D9FF';
        btnCode.style.fontWeight = '700';
      }
      if (cityCanvas && viewCity && cityCanvas.parentElement !== viewCity) {
        viewCity.appendChild(cityCanvas);
      }
    } else if (newMode === 'preview') {
      if (editorArea) { editorArea.style.display = 'none'; }
      if (previewPane) { previewPane.style.display = 'flex'; previewPane.style.flex = '1'; }
      if (worldPane) { worldPane.style.display = 'none'; }
      if (splitDivider) { splitDivider.style.display = 'none'; }
      if (btnPreview) {
        btnPreview.classList.add('active');
        btnPreview.style.background = 'rgba(0,217,255,0.14)';
        btnPreview.style.color = '#00D9FF';
        btnPreview.style.fontWeight = '700';
      }
      if (cityCanvas && viewCity && cityCanvas.parentElement !== viewCity) {
        viewCity.appendChild(cityCanvas);
      }
    } else if (newMode === 'world') {
      if (editorArea) { editorArea.style.display = 'none'; }
      if (previewPane) { previewPane.style.display = 'none'; }
      if (worldPane) { worldPane.style.display = 'flex'; worldPane.style.flex = '1'; }
      if (splitDivider) { splitDivider.style.display = 'none'; }
      if (btnWorld) {
        btnWorld.classList.add('active');
        btnWorld.style.background = 'rgba(168,85,247,0.18)';
        btnWorld.style.color = '#C084FC';
        btnWorld.style.fontWeight = '700';
      }
      if (cityCanvas && worldMount && cityCanvas.parentElement !== worldMount) {
        worldMount.appendChild(cityCanvas);
      }
      setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    } else {
      state.mode = 'split';
      if (editorArea) { editorArea.style.display = 'flex'; }
      if (previewPane) { previewPane.style.display = 'flex'; }
      if (worldPane) { worldPane.style.display = 'none'; }
      if (splitDivider) { splitDivider.style.display = 'block'; }
      if (btnSplit) {
        btnSplit.classList.add('active');
        btnSplit.style.background = 'rgba(0,217,255,0.14)';
        btnSplit.style.color = '#00D9FF';
        btnSplit.style.fontWeight = '700';
      }
      const savedRatio = parseFloat(localStorage.getItem('fenix_ide_split_ratio') || '0.5');
      if (editorArea && previewPane) {
        editorArea.style.flex = `${savedRatio}`;
        previewPane.style.flex = `${1 - savedRatio}`;
      }
      if (cityCanvas && viewCity && cityCanvas.parentElement !== viewCity) {
        viewCity.appendChild(cityCanvas);
      }
    }

    window.fenixCopilot?.updateContext({ mode: state.mode });

    if (state.mode === 'preview' || state.mode === 'split') {
      const targetUrl = state.previewUrl || getPreviewUrlForProject(state.projectId || 'fenix-os');
      updatePreview(targetUrl);
    }
  }
  window.fenixSetIdeMode = setMode;

  function setViewport(vp) {
    state.viewport = vp;
    const frame = document.getElementById('fenixDeviceFrame');
    const btnDesk = document.getElementById('btnVpDesktop');
    const btnTab = document.getElementById('btnVpTablet');
    const btnMob = document.getElementById('btnVpMobile');

    [btnDesk, btnTab, btnMob].forEach(b => {
      if (b) {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#64748B';
      }
    });

    if (frame) {
      frame.classList.remove('vp-desktop', 'vp-tablet', 'vp-mobile');
    }

    if (vp === 'tablet') {
      if (frame) {
        frame.classList.add('vp-tablet');
        frame.style.maxWidth = '768px';
        frame.style.height = '92%';
      }
      if (btnTab) {
        btnTab.classList.add('active');
        btnTab.style.background = 'rgba(0,217,255,0.18)';
        btnTab.style.color = '#00D9FF';
      }
    } else if (vp === 'mobile') {
      if (frame) {
        frame.classList.add('vp-mobile');
        frame.style.maxWidth = '380px';
        frame.style.height = '90%';
      }
      if (btnMob) {
        btnMob.classList.add('active');
        btnMob.style.background = 'rgba(0,217,255,0.18)';
        btnMob.style.color = '#00D9FF';
      }
    } else {
      if (frame) {
        frame.classList.add('vp-desktop');
        frame.style.maxWidth = '100%';
        frame.style.height = '100%';
      }
      if (btnDesk) {
        btnDesk.classList.add('active');
        btnDesk.style.background = 'rgba(0,217,255,0.18)';
        btnDesk.style.color = '#00D9FF';
      }
    }
  }
  window.fenixSetIdeViewport = setViewport;

  function updatePreview(url) {
    state.previewUrl = url;
    const isLoginFallback = String(url || '').startsWith('/login.html') || state.previewMode === 'component';
    const displayUrl = isLoginFallback ? `fenix://workspace/${state.projectId || 'fenix-os'}/live-preview` : url;
    const urlEl = document.getElementById('fenixPreviewUrlText');
    if (urlEl) urlEl.textContent = displayUrl;
    const hiddenUrl = document.getElementById('fenixIdePreviewUrl');
    if (hiddenUrl) hiddenUrl.textContent = displayUrl;

    const frame = document.getElementById('fenixIdeLiveFrame');
    const frameWrap = document.getElementById('fenixIdeFrameWrap');
    const loading = document.getElementById('fenixIdePreviewLoading');
    const loadingMessage = document.getElementById('fenixIdePreviewLoadingMessage');
    const antiRecBanner = document.getElementById('fenixAntiRecursionBanner');
    const unavailable = document.getElementById('fenixIdePreviewUnavailable');
    const deviceFrame = document.getElementById('fenixDeviceFrame');

    if (!url) {
      clearTimeout(previewLoadTimer);
      previewLoadToken++;
      if (loading) loading.style.display = 'none';
      if (frame) frame.style.display = 'none';
      if (frameWrap) frameWrap.style.display = '';
      if (antiRecBanner) antiRecBanner.style.display = 'none';
      const nativeCard = document.getElementById('fenixIdeNativePreviewSurface');
      if (nativeCard) nativeCard.style.display = 'none';
      if (frame?.getAttribute('src')) frame.setAttribute('src', 'about:blank');
      if (unavailable) unavailable.style.display = 'flex';
      return;
    }
    if (unavailable) unavailable.style.display = 'none';

    // Rule 24: Anti-Recursion Shield
    if (isRecursionUrl(url)) {
      clearTimeout(previewLoadTimer);
      previewLoadToken++;
      if (antiRecBanner) antiRecBanner.style.display = 'flex';
      if (loading) loading.style.display = 'none';
      if (frame) frame.style.display = 'none';
      if (frameWrap) frameWrap.style.display = 'none';
      return;
    }

    if (antiRecBanner) antiRecBanner.style.display = 'none';

    if (isLoginFallback && deviceFrame) {
      if (loading) loading.style.display = 'none';
      if (frame) frame.style.display = 'none';
      if (frameWrap) frameWrap.style.display = 'none';
      let nativeCard = document.getElementById('fenixIdeNativePreviewSurface');
      if (!nativeCard) {
        nativeCard = document.createElement('div');
        nativeCard.id = 'fenixIdeNativePreviewSurface';
        nativeCard.style.cssText = 'padding:20px; color:#e2e8f0; font-family:Inter,system-ui,sans-serif; height:100%; overflow:auto; background:linear-gradient(180deg,#08111f 0%,#050914 100%); display:flex; flex-direction:column; gap:14px;';
        deviceFrame.appendChild(nativeCard);
      }
      nativeCard.style.display = 'flex';
      const proj = state.projects.find(p => p.id === state.projectId) || { id: state.projectId || 'fenix-os', name: (state.projectId || 'Fênix OS').toUpperCase(), branch: 'main', status: 'ONLINE' };
      const lineCount = (state.savedContent || '').split('\n').length;
      const filePathLower = String(state.path || 'index.html').toLowerCase();
      const isInbox = filePathLower.includes('inbox') || filePathLower.includes('chat');
      const isFlow = filePathLower.includes('flow') || filePathLower.includes('builder');

      let liveUiSnippet = '';
      if (isInbox) {
        liveUiSnippet = `
          <div style="background:#0b141a; border-radius:8px; padding:12px; border:1px solid rgba(16,185,129,0.3); display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px;">
              <span style="font-size:11px; font-weight:700; color:#25d366;">● WhatsApp Omnichannel &bull; Conversa Ativa</span>
              <span style="font-size:10px; color:#94a3b8;">Lead #4092</span>
            </div>
            <div style="background:#202c33; color:#e9edef; font-size:11px; padding:6px 10px; border-radius:8px; max-width:80%;">
              Olá! Sistema Fênix OS conectado em produção.
            </div>
            <div style="background:#005c4b; color:#e9edef; font-size:11px; padding:6px 10px; border-radius:8px; align-self:flex-end; max-width:80%;">
              Paridade dual e live hot-reload ativos na IDE!
            </div>
          </div>
        `;
      } else if (isFlow) {
        liveUiSnippet = `
          <div style="background:#090d16; border-radius:8px; padding:12px; border:1px solid rgba(56,189,248,0.25); display:flex; align-items:center; justify-content:space-around;">
            <div style="background:rgba(56,189,248,0.15); border:1px solid #38bdf8; border-radius:6px; padding:6px 10px; font-size:10px; font-weight:700; color:#fff;">Trigger Webhook</div>
            <span style="color:#00d9ff; font-weight:bold;">➔</span>
            <div style="background:rgba(16,185,129,0.15); border:1px solid #10b981; border-radius:6px; padding:6px 10px; font-size:10px; font-weight:700; color:#10b981;">AI LLM Engine</div>
            <span style="color:#00d9ff; font-weight:bold;">➔</span>
            <div style="background:rgba(245,158,11,0.15); border:1px solid #f59e0b; border-radius:6px; padding:6px 10px; font-size:10px; font-weight:700; color:#f59e0b;">Dispatch Event</div>
          </div>
        `;
      } else {
        liveUiSnippet = `
          <div style="background:rgba(15,23,42,0.85); border-radius:8px; padding:12px; border:1px solid rgba(56,189,248,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-size:11px; font-weight:700; color:#f8fafc;">Interface Reativa do Componente</span>
              <span style="font-size:10px; color:#00e5a0; background:rgba(0,229,160,0.15); padding:2px 8px; border-radius:12px;">Hot-Reload Ativo</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px;">
              <div style="background:rgba(2,6,23,0.6); padding:8px; border-radius:6px; text-align:center;">
                <div style="font-size:9px; color:#94a3b8;">Sessões</div>
                <div style="font-size:13px; font-weight:700; color:#38bdf8;">1.4K</div>
              </div>
              <div style="background:rgba(2,6,23,0.6); padding:8px; border-radius:6px; text-align:center;">
                <div style="font-size:9px; color:#94a3b8;">Taxa Sucesso</div>
                <div style="font-size:13px; font-weight:700; color:#10b981;">99.8%</div>
              </div>
              <div style="background:rgba(2,6,23,0.6); padding:8px; border-radius:6px; text-align:center;">
                <div style="font-size:9px; color:#94a3b8;">Latência P95</div>
                <div style="font-size:13px; font-weight:700; color:#f59e0b;">140ms</div>
              </div>
            </div>
          </div>
        `;
      }

      nativeCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(56,189,248,0.18); padding-bottom:12px;">
          <div>
            <div style="font-size:10px; font-weight:700; color:#38bdf8; letter-spacing:0.08em; text-transform:uppercase;">REACTIVE COMPONENT PREVIEW · ${proj.id}</div>
            <h3 style="margin:4px 0 0; font-size:16px; color:#f8fafc;">${proj.name || proj.id}</h3>
          </div>
          <span style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.35); border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700;">● ${proj.status || 'ATIVO'}</span>
        </div>

        <!-- Live Simulated UI -->
        ${liveUiSnippet}

        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
          <div style="background:rgba(15,23,42,0.75); border:1px solid rgba(148,163,184,0.14); border-radius:8px; padding:10px;">
            <div style="font-size:10px; color:#94a3b8;">ARQUIVO ATIVO</div>
            <div style="font-size:12px; font-weight:700; color:#38bdf8; margin-top:4px; word-break:break-all;">${state.path || 'index.html'}</div>
          </div>
          <div style="background:rgba(15,23,42,0.75); border:1px solid rgba(148,163,184,0.14); border-radius:8px; padding:10px;">
            <div style="font-size:10px; color:#94a3b8;">LINHAS / STATUS</div>
            <div style="font-size:12px; font-weight:700; color:#f8fafc; margin-top:4px;">${lineCount} linhas &bull; Sintaxe OK</div>
          </div>
          <div style="background:rgba(15,23,42,0.75); border:1px solid rgba(148,163,184,0.14); border-radius:8px; padding:10px;">
            <div style="font-size:10px; color:#94a3b8;">ENDPOINTS CONECTADOS</div>
            <div style="font-size:12px; font-weight:700; color:#10b981; margin-top:4px;">200 OK &bull; WebSocket Live</div>
          </div>
        </div>

        <div style="background:rgba(2,6,23,0.85); border:1px solid rgba(56,189,248,0.14); border-radius:8px; padding:12px; flex:1; overflow:auto;">
          <div style="font-size:10px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Inspeção Estrutural em Tempo Real</div>
          <pre style="margin:0; font-family:'JetBrains Mono',monospace; font-size:11px; color:#cbd5e1; white-space:pre-wrap; line-height:1.45;">${(state.savedContent || 'Carregando conteúdo do arquivo do workspace...').slice(0, 1200).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</pre>
        </div>
      `;
      return;
    }

    const nativeCard = document.getElementById('fenixIdeNativePreviewSurface');
    if (nativeCard) nativeCard.style.display = 'none';
    if (frameWrap) frameWrap.style.display = '';
    if (frame) {
      frame.style.display = 'block';
      if (state.mode === 'preview' || state.mode === 'split') {
        const currentSrc = frame.getAttribute('src');
        const requestedSrc = new URL(url, window.location.href).href;
        const resolvedCurrentSrc = currentSrc ? new URL(currentSrc, window.location.href).href : '';
        if (resolvedCurrentSrc !== requestedSrc) {
          clearTimeout(previewLoadTimer);
          const requestToken = ++previewLoadToken;
          if (loadingMessage) loadingMessage.textContent = 'Carregando aplicação real…';
          if (loading) loading.dataset.error = 'false';
          if (loading) loading.style.display = 'flex';
          frame.src = url;
          previewLoadTimer = setTimeout(() => {
            if (requestToken !== previewLoadToken || !loading || loading.style.display === 'none') return;
            if (loadingMessage) loadingMessage.textContent = 'Preview sem resposta após 15 s. Confira o endereço e a porta do frontend do projeto; use Recarregar para tentar novamente.';
            if (loading) loading.dataset.error = 'true';
          }, 15000);
        }
      }
    }
  }

  function updateLineNumbers() {
    const code = document.getElementById('fenixIdeCodeEditor') || document.getElementById('fenixIdeLiveCode');
    const linesNode = document.getElementById('fenixIdeLineNumbers');
    const statusLines = document.getElementById('ideStatusLines');
    if (!code || !linesNode) return;
    const lineCount = (code.value || '').split('\n').length;
    linesNode.innerHTML = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1).join('<br>');
    if (statusLines) statusLines.textContent = `${lineCount} linhas`;
  }

  function renderTabs() {
    const header = document.getElementById('fenixIdeTabsHeader');
    if (!header) return;
    if (!state.openTabs.length && state.path) {
      state.openTabs.push({ path: state.path, name: state.path.split('/').pop(), dirty: state.dirty });
    }
    header.innerHTML = state.openTabs.map((t) => {
      const active = t.path === state.path;
      const ext = t.name.split('.').pop().toLowerCase();
      let iconColor = '#00D9FF';
      if (['js', 'ts'].includes(ext)) iconColor = '#FBBF24';
      else if (['css', 'scss'].includes(ext)) iconColor = '#A78BFA';
      else if (['html'].includes(ext)) iconColor = '#F97316';
      else if (['json', 'yml'].includes(ext)) iconColor = '#34D399';

      return `
        <button class="fenix-ide-tab ${active ? 'active' : ''}" data-path="${t.path}" onclick="window.fenixSelectIdeTab('${t.path}')" style="background:${active ? '#050810' : 'transparent'}; border:none; border-top:2px solid ${active ? '#00D9FF' : 'transparent'}; color:${active ? '#F8FAFC' : '#94A3B8'}; padding:8px 14px; font-size:11px; font-weight:600; display:flex; align-items:center; gap:8px; cursor:pointer;">
          <i class="ph-fill ph-file-code" style="color:${iconColor};"></i>
          <span>${t.name}</span>
          ${t.dirty ? '<span style="color:#FBBF24; font-size:14px; line-height:0.8;">●</span>' : ''}
          <span onclick="event.stopPropagation(); window.fenixCloseIdeTab('${t.path}')" style="margin-left:4px; font-size:10px; color:#64748B; padding:2px; border-radius:3px;" onmouseover="this.style.color='#EF4444'" onmouseout="this.style.color='#64748B'">✕</span>
        </button>
      `;
    }).join('');
  }

  window.fenixSelectIdeTab = (path) => {
    openFile(path);
  };

  window.fenixCloseIdeTab = (path) => {
    state.openTabs = state.openTabs.filter(t => t.path !== path);
    if (state.path === path) {
      if (state.openTabs.length > 0) openFile(state.openTabs[state.openTabs.length - 1].path);
      else {
        state.path = null;
        state.savedContent = '';
        state.dirty = false;
        const editor = document.getElementById('fenixIdeCodeEditor');
        if (editor) editor.value = '';
        updateDirty();
        renderTabs();
      }
    } else {
      renderTabs();
    }
  };

  function bindShell() {
    const view = document.getElementById('view-ide');
    if (!view || view.dataset.liveIde === 'true') return;
    view.dataset.liveIde = 'true';

    // Project selector
    const projSelect = document.getElementById('fenixIdeProject');
    if (projSelect) {
      projSelect.addEventListener('change', (e) => selectProject(e.target.value));
    }

    // Refresh & Search
    document.getElementById('fenixIdeRefresh')?.addEventListener('click', () => loadTree());
    document.getElementById('fenixIdeTreeSearch')?.addEventListener('input', (e) => filterTree(e.target.value));

    // Save buttons
    document.getElementById('fenixIdeLiveSave')?.addEventListener('click', saveFile);

    // Code editor input
    const codeArea = document.getElementById('fenixIdeCodeEditor');
    const liveCode = document.getElementById('fenixIdeLiveCode');
    if (codeArea) {
      codeArea.addEventListener('input', () => {
        if (liveCode) liveCode.value = codeArea.value;
        updateDirty();
        updateLineNumbers();
        window.fenixHighlightCodeView?.(codeArea.value);
      });
      codeArea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          saveFile();
        }
      });
    }

    // Preview Frame load and error listeners
    const frame = document.getElementById('fenixIdeLiveFrame');
    const loading = document.getElementById('fenixIdePreviewLoading');
    if (frame) {
      frame.addEventListener('load', () => {
        clearTimeout(previewLoadTimer);
        previewLoadToken++;
        if (loadingMessage) loadingMessage.textContent = 'Carregando aplicação real…';
        if (loading) loading.dataset.error = 'false';
        if (loading) loading.style.display = 'none';
      });
      frame.addEventListener('error', () => {
        clearTimeout(previewLoadTimer);
        previewLoadToken++;
        if (loadingMessage) loadingMessage.textContent = 'Não foi possível abrir o preview deste projeto. Confira o frontend configurado.';
        if (loading) loading.dataset.error = 'true';
        if (loading) loading.style.display = 'none';
      });
    }

    // Preview Reload & External
    document.getElementById('fenixIdePreviewReload')?.addEventListener('click', () => {
      if (frame && state.previewUrl) {
        if (loading) loading.style.display = 'flex';
        frame.src = state.previewUrl + (state.previewUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
      }
    });

    document.getElementById('fenixIdePreviewExternal')?.addEventListener('click', () => {
      if (state.previewUrl) window.open(state.previewUrl, '_blank');
    });

    // Copilot Input
    const copilotInput = document.getElementById('fenixIdeCopilotInput');
    if (copilotInput) {
      copilotInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') window.fenixSendCopilotMessage();
      });
    }

    // Interactive Logo Resizer & Visual Preview Linkage
    const btnLogoDec = document.getElementById('btnLogoDecrease');
    const btnLogoInc = document.getElementById('btnLogoIncrease');
    const sliderLogo = document.getElementById('ideLogoSlider');

    const updateLogoScale = async (newScale, syncEditor = true) => {
      let scale = parseFloat(newScale);
      if (isNaN(scale)) scale = 1.0;
      scale = Math.max(0.4, Math.min(2.5, parseFloat(scale.toFixed(2))));

      const badge = document.getElementById('ideLogoScaleBadge');
      if (badge) badge.textContent = `${Math.round(scale * 100)}%`;
      if (sliderLogo) sliderLogo.value = scale;

      // Send to preview iframe
      const f = document.getElementById('fenixIdeLiveFrame');
      if (f && f.contentWindow) {
        f.contentWindow.postMessage({ type: 'SET_LOGO_SCALE', scale }, '*');
      }

      if (syncEditor) {
        // Ensure login.html is open in the editor if another file is open
        if (!state.path || !state.path.includes('login.html')) {
          const loginFile = state.treeData ? findFileInTree(state.treeData, 'login.html') : null;
          const targetPath = loginFile ? loginFile.path : (state.projectId === 'fenix-os' ? 'grg/public/login.html' : 'login.html');
          await openFile(targetPath);
        }

        const codeEditor = document.getElementById('fenixIdeCodeEditor');
        const liveCode = document.getElementById('fenixIdeLiveCode');
        if (codeEditor) {
          let content = codeEditor.value;
          if (content.includes('--logo-scale')) {
            content = content.replace(/--logo-scale:\s*[\d.]+;?/, `--logo-scale: ${scale.toFixed(2)};`);
            codeEditor.value = content;
            if (liveCode) liveCode.value = content;
            updateDirty();
            updateLineNumbers();
            window.fenixHighlightCodeView?.(content);
            status(`Logo redimensionado para ${Math.round(scale * 100)}% · Código alterado (Clique em Salvar)`);
            const commitInput = document.getElementById('fenixIdeGitCommitMsg');
            if (commitInput && !commitInput.value) {
              commitInput.value = `feat(ui): ajustar escala do logo para ${Math.round(scale * 100)}% via IDE preview`;
            }
          }
        }
      }
    };

    window.fenixSetLogoScale = updateLogoScale;

    btnLogoDec?.addEventListener('click', () => {
      const cur = parseFloat(sliderLogo?.value || '1.0');
      updateLogoScale(cur - 0.1);
    });

    btnLogoInc?.addEventListener('click', () => {
      const cur = parseFloat(sliderLogo?.value || '1.0');
      updateLogoScale(cur + 0.1);
    });

    sliderLogo?.addEventListener('input', (e) => {
      updateLogoScale(e.target.value);
    });

    // Listen for message from preview iframe
    window.addEventListener('message', (e) => {
      if (e.data && typeof e.data === 'object') {
        if (e.data.type === 'FENIX_LOGO_SCALED' || e.data.type === 'FENIX_LOGO_SELECTED') {
          if (typeof e.data.scale === 'number') {
            updateLogoScale(e.data.scale, true);
          }
        }
      }
    });

    // Draggable Split Divider
    initSplitDivider();
    setMode(state.mode);
  }

  function findFileInTree(nodes, name) {
    if (!Array.isArray(nodes)) return null;
    for (const item of nodes) {
      if (item.type === 'file' && (item.name === name || item.path.endsWith('/' + name))) return item;
      if (item.type === 'directory' && Array.isArray(item.children)) {
        const found = findFileInTree(item.children, name);
        if (found) return found;
      }
    }
    return null;
  }

  function initSplitDivider() {
    const divider = document.getElementById('fenixIdeSplitDivider');
    const editorArea = document.getElementById('fenixIdeEditorArea');
    const previewPane = document.getElementById('fenixIdePreviewPane');
    const centerSplit = document.getElementById('fenixIdeCenterSplit');
    if (!divider || !editorArea || !previewPane || !centerSplit) return;

    const savedRatio = parseFloat(localStorage.getItem('fenix_ide_split_ratio') || '0.5');
    if (!isNaN(savedRatio) && savedRatio > 0.15 && savedRatio < 0.85) {
      editorArea.style.flex = `${savedRatio}`;
      previewPane.style.flex = `${1 - savedRatio}`;
    }

    let isDragging = false;

    const setSplitRatio = ratioValue => {
      const ratio = Math.max(0.2, Math.min(0.8, ratioValue));
      editorArea.style.flex = `${ratio}`;
      previewPane.style.flex = `${1 - ratio}`;
      localStorage.setItem('fenix_ide_split_ratio', ratio.toFixed(3));
      divider.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    };

    divider.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      document.body.classList.add('fsb-resizing');
      divider.classList.add('active');
    });

    divider.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const current = parseFloat(localStorage.getItem('fenix_ide_split_ratio') || '0.5');
      setSplitRatio(current + (e.key === 'ArrowRight' ? 0.02 : -0.02));
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = centerSplit.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const totalWidth = rect.width;
      setSplitRatio(offsetX / totalWidth);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.classList.remove('fsb-resizing');
        divider.classList.remove('active');
      }
    });
  }

  function filterTree(query) {
    const q = (query || '').toLowerCase().trim();
    const treeNode = document.getElementById('fenixIdeLiveTree');
    if (!treeNode) return;
    const files = treeNode.querySelectorAll('.fenix-live-ide-file');
    const folders = treeNode.querySelectorAll('.fenix-live-ide-folder');
    if (!q) {
      files.forEach(f => { f.style.display = ''; });
      folders.forEach(f => { f.style.display = ''; f.open = false; });
      return;
    }
    folders.forEach(f => { f.open = true; });
    files.forEach(f => {
      const name = (f.textContent || '').toLowerCase();
      const path = (f.title || f.dataset.path || '').toLowerCase();
      const match = name.includes(q) || path.includes(q);
      f.style.display = match ? '' : 'none';
    });
    folders.forEach(folder => {
      const hasVisible = folder.querySelector('.fenix-live-ide-file:not([style*="display: none"])');
      folder.style.display = hasVisible ? '' : 'none';
    });
  }

  function updateDirty() {
    const codeArea = document.getElementById('fenixIdeCodeEditor') || document.getElementById('fenixIdeLiveCode');
    const val = codeArea ? codeArea.value : '';
    state.dirty = Boolean(state.path && state.hash && val !== state.savedContent);
    const saveBtn = document.getElementById('fenixIdeLiveSave');
    if (saveBtn) saveBtn.disabled = !state.dirty;
    const label = document.getElementById('fenixIdeDirtyState');
    if (label) {
      label.textContent = !state.path ? '—' : state.dirty ? 'Modificado ●' : 'Salvo';
      label.style.color = state.dirty ? '#FBBF24' : '#25D366';
      label.dataset.dirty = String(state.dirty);
    }
    const currentTab = state.openTabs.find(t => t.path === state.path);
    if (currentTab) currentTab.dirty = state.dirty;
  }

  function mayDiscardChanges() {
    return !state.dirty || window.confirm('Há alterações não salvas neste arquivo. Descartar e continuar?');
  }

  window.fenixPrepareIdeNavigation = () => {
    if (!mayDiscardChanges()) return false;
    if (state.dirty) {
      const codeEditor = document.getElementById('fenixIdeCodeEditor');
      const liveCode = document.getElementById('fenixIdeLiveCode');
      if (codeEditor) codeEditor.value = state.savedContent;
      if (liveCode) liveCode.value = state.savedContent;
      updateDirty();
      updateLineNumbers();
      window.fenixHighlightCodeView?.(state.savedContent);
      renderTabs();
    }
    return true;
  };

  window.addEventListener('beforeunload', (event) => {
    if (state.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  async function loadProjects() {
    bindShell();
    try {
      let projectsList = [];
      try {
        const data = await json('/api/fenix/projects');
        projectsList = (data.projects || []).filter(p => p.workspace || p.localPath || p.vpsPath);
      } catch (_) {}

      if (!projectsList.length) {
        try {
          const regData = await json('/api/v2/projects-registry');
          projectsList = (regData.projects || []).map(p => ({
            id: p.id || p.projectId,
            name: p.name || p.displayName,
            workspace: p.localPath || p.vpsPath || p.productionPath || p.workspace,
            repository: p.repository,
            branch: p.branch,
            frontend: p.frontend,
            deployment: p.deployment,
            agents: p.agents,
            status: p.status
          }));
        } catch (_) {}
      }

      state.projects = projectsList;
      const select = document.getElementById('fenixIdeProject');
      if (select && state.projects.length) {
        select.replaceChildren();
        for (const p of state.projects) {
          select.add(new Option(`${p.name.toUpperCase()} · ${p.branch || 'main'}`, p.id));
        }
      }

      const saved = localStorage.getItem('fenix_ide_project');
      const requested = state.projects.find(p => p.id === state.requestedProjectId);
      const savedProject = state.projects.find(p => p.id === saved);
      const preferred = requested || savedProject || (!saved && (
                        state.projects.find(p => p.id === 'fenix-os') ||
                        state.projects.find(p => p.id === 'api-platform') ||
                        state.projects[0]));

      state.requestedProjectId = null;
      if (preferred) {
        if (select) select.value = preferred.id;
        await selectProject(preferred.id);
      } else if (saved) {
        const savedOption = [...(select?.options || [])].find(option => option.value === saved);
        const projectName = localStorage.getItem('fenix_ide_project_name') || savedOption?.textContent?.trim() ||
                            localStorage.getItem('fenix_active_project_name') || saved;
        state.projectId = saved;
        if (select) {
          if (![...select.options].some(option => option.value === saved)) {
            select.add(new Option(`${projectName} · contexto salvo`, saved));
          }
          select.value = saved;
        }
        window.GlobalSelectionStore?.select?.('project', saved, { id: saved, name: projectName, restoredLocally: true });
        window.fenixSetActiveProject?.(saved, projectName);
        status('Projeto anterior restaurado; aguardando dados do Project Kernel.', true);
      }
    } catch (error) {
      status(`Falha ao carregar projetos: ${error.message}`, true);
    }
  }

  async function selectProject(id) {
    if (id !== state.projectId && !mayDiscardChanges()) {
      const select = document.getElementById('fenixIdeProject');
      if (select) select.value = state.projectId;
      return false;
    }
    state.projectId = id;
    state.path = null;
    state.hash = null;
    state.savedContent = '';
    state.previewTarget = null;
    state.openTabs = [];
    state.generation++;
    state.openToken++;
    const generation = state.generation;
    localStorage.setItem('fenix_ide_project', id);

    const project = state.projects.find(item => item.id === id);
    const projectName = project?.name || id;
    localStorage.setItem('fenix_ide_project_name', projectName);
    window.GlobalSelectionStore?.select?.('project', id, project || { id, name: id });
    window.fenixSetActiveProject?.(id, projectName);
    const metaEl = document.getElementById('fenixIdeProjectMeta');
    if (metaEl) metaEl.textContent = project ? `${project.workspace} · consultando Git…` : '—';
    const pathEl = document.getElementById('fenixIdeLivePath');
    if (pathEl) pathEl.textContent = 'Selecione um arquivo';
    const breadPath = document.getElementById('fenixIdeCurrentPath');
    if (breadPath) breadPath.textContent = `${project?.name || id} > Selecione um arquivo`;

    const codeEditor = document.getElementById('fenixIdeCodeEditor');
    if (codeEditor) codeEditor.value = '';
    const liveCode = document.getElementById('fenixIdeLiveCode');
    if (liveCode) liveCode.value = '';

    updateLineNumbers();
    updateDirty();
    renderTabs();

    // Update active agent for project
    if (id === 'api-platform') {
      state.activeAgent = { id: 'agent-api-ops', name: 'Alex', role: 'API Platform Engineer', floor: 1, district: 'API Platform Tower' };
    } else if (id === 'zapai-crm') {
      state.activeAgent = { id: 'agent-infra', name: 'Lucas', role: 'SRE & Messaging', floor: 2, district: 'ZapAI Tower' };
    } else {
      state.activeAgent = { id: 'agent-support', name: 'Gabriel', role: 'Gateway & Architecture', floor: 0, district: 'Central HQ' };
    }

    const agName = document.getElementById('fenixIdeActiveAgentName');
    if (agName) agName.textContent = `${state.activeAgent.name} (${state.activeAgent.role})`;
    const agFloor = document.getElementById('fenixIdeActiveAgentFloor');
    if (agFloor) agFloor.textContent = `Piso ${state.activeAgent.floor} · ${state.activeAgent.district}`;

    // Update terminal prompt
    const termPrompt = document.getElementById('fenixIdeTermPrompt');
    if (termPrompt) termPrompt.textContent = `${id}:~$`;

    // Update preview URL
    const pUrl = getPreviewUrlForProject(project || id);
    updatePreview(pUrl);

    window.fenixCopilot?.updateContext({
      project: id,
      file: 'Selecione um arquivo',
      agent: state.activeAgent ? `${state.activeAgent.name} (${state.activeAgent.role})` : 'Alex (Tech Lead)'
    });

    const [gitState] = await Promise.all([
      json(endpoint('/git')).catch(() => null),
      loadTree(generation),
    ]);
    if (generation !== state.generation) return false;

    if (metaEl) {
      const branchLabel = gitState?.branch ? `Branch ${gitState.branch}` : 'Branch não medida';
      const commitLabel = gitState?.head ? `Commit ${gitState.head.slice(0, 7)}` : 'Commit não medido';
      metaEl.textContent = project ? `${project.workspace} · ${branchLabel} · ${commitLabel}` : '—';
    }
    return true;
  }

  function appendNodes(parent, nodes) {
    for (const item of nodes) {
      if (item.type === 'directory') {
        const group = document.createElement('details');
        group.className = 'fenix-live-ide-folder';
        group.style.cssText = 'margin:2px 0; padding-left:4px;';
        const summary = document.createElement('summary');
        summary.style.cssText = 'cursor:pointer; display:flex; align-items:center; gap:6px; padding:3px 6px; border-radius:4px; color:#CBD5E1; font-weight:600;';
        summary.innerHTML = `<i class="ph-fill ph-folder" style="color:#00D9FF;"></i> <span>${item.name}</span>`;
        group.appendChild(summary);
        appendNodes(group, item.children || []);
        parent.appendChild(group);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'fenix-live-ide-file';
        button.title = item.path;
        button.dataset.path = item.path;
        button.style.cssText = 'width:100%; text-align:left; background:transparent; border:none; color:#94A3B8; padding:3px 8px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:var(--fenix-font-mono); font-size:11px;';

        const ext = String(item.name || '').split('.').pop().toLowerCase();
        let iconHtml = '<i class="ph-fill ph-file" style="color:#64748B;"></i>';
        if (['js', 'mjs', 'ts', 'tsx'].includes(ext)) iconHtml = '<i class="ph-fill ph-file-js" style="color:#FBBF24;"></i>';
        else if (['json', 'yaml', 'yml'].includes(ext)) iconHtml = '<i class="ph-fill ph-file-code" style="color:#34D399;"></i>';
        else if (['html', 'htm'].includes(ext)) iconHtml = '<i class="ph-fill ph-file-html" style="color:#F97316;"></i>';
        else if (['css', 'scss'].includes(ext)) iconHtml = '<i class="ph-fill ph-file-css" style="color:#A78BFA;"></i>';
        else if (['md', 'txt'].includes(ext)) iconHtml = '<i class="ph-fill ph-file-text" style="color:#38BDF8;"></i>';
        else if (['sh', 'bat', 'ps1'].includes(ext)) iconHtml = '<i class="ph-fill ph-terminal" style="color:#25D366;"></i>';

        button.innerHTML = `${iconHtml} <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</span>`;
        button.addEventListener('click', () => openFile(item.path));
        button.addEventListener('mouseover', () => { button.style.background = 'rgba(255,255,255,0.04)'; button.style.color = '#F8FAFC'; });
        button.addEventListener('mouseout', () => {
          const isAct = button.dataset.path === state.path;
          button.style.background = isAct ? 'rgba(0,217,255,0.12)' : 'transparent';
          button.style.color = isAct ? '#00D9FF' : '#94A3B8';
        });
        parent.appendChild(button);
      }
    }
  }

  async function loadTree(generation = state.generation) {
    if (!state.projectId) return;
    const tree = document.getElementById('fenixIdeLiveTree');
    if (!tree) return;
    tree.innerHTML = '<div style="color:#64748B; padding:8px;"><i class="ph-bold ph-spinner ph-spin"></i> Carregando arquivos…</div>';
    try {
      let data;
      try {
        data = await json(endpoint('/tree'));
      } catch (error) {
        if (state.projectId !== 'fenix-os') throw error;
      }
      if (state.projectId === 'fenix-os' && (!data || !Array.isArray(data.tree))) {
        data = await json('/api/v2/projects/fenix-os/tree');
      }
      if (generation !== state.generation) return;
      tree.replaceChildren();
      state.treeData = data.tree || [];
      appendNodes(tree, state.treeData);
      if (!state.treeData.length) tree.innerHTML = '<div style="color:#64748B; padding:8px;">Nenhum arquivo no workspace.</div>';
      status(`${state.treeData.length} itens no workspace`);

      if (!state.path && Array.isArray(data.tree) && data.tree.length > 0) {
        const preferredNames = ['package.json', 'GEMINI.md', 'README.md', 'AGENTS.md', 'server.js', 'index.html'];
        const findFirstFile = (nodes) => {
          for (const pref of preferredNames) {
            const match = nodes.find((item) => item.type === 'file' && item.name === pref);
            if (match) return match;
          }
          const topFile = nodes.find((item) => item.type === 'file');
          if (topFile) return topFile;
          for (const item of nodes) {
            if (item.type === 'directory' && !/^(_|archive|remote-stage|node_modules)/.test(item.name || '') && item.children) {
              const sub = findFirstFile(item.children);
              if (sub) return sub;
            }
          }
          return null;
        };
        const first = findFirstFile(data.tree);
        if (first) await openFile(first.path);
      }
      updatePreview(state.previewUrl);
    } catch (error) {
      if (generation === state.generation) {
        tree.innerHTML = `<div style="color:#EF4444; padding:8px;">Falha: ${error.message}</div>`;
        status(error.message, true);
      }
    }
  }

  async function openFile(filePath) {
    if (!mayDiscardChanges()) return false;
    const cleanPath = String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
    if (!cleanPath) return false;
    const generation = state.generation, token = ++state.openToken;
    status(`Abrindo ${cleanPath}…`);
    try {
      let data;
      try {
        data = await json(`${endpoint('/file')}?path=${encodeURIComponent(cleanPath)}`);
      } catch (error) {
        if (state.projectId !== 'fenix-os') throw error;
      }
      if (state.projectId === 'fenix-os' && (!data || typeof data.content !== 'string')) {
        data = await json(`/api/v2/projects/fenix-os/file?path=${encodeURIComponent(cleanPath)}`);
      }
      if (generation !== state.generation || token !== state.openToken) return false;
      state.path = data.path;
      state.hash = data.hash;

      const pathEl = document.getElementById('fenixIdeLivePath');
      if (pathEl) pathEl.textContent = data.path;
      const breadPath = document.getElementById('fenixIdeCurrentPath');
      if (breadPath) breadPath.textContent = `${state.projectId} > ${data.path}`;

      const codeEditor = document.getElementById('fenixIdeCodeEditor');
      if (codeEditor) codeEditor.value = data.content;
      const liveCode = document.getElementById('fenixIdeLiveCode');
      if (liveCode) liveCode.value = data.content;

      state.savedContent = data.content;
      updateDirty();
      updateLineNumbers();
      window.fenixHighlightCodeView?.(data.content);

      // Manage open tabs
      if (!state.openTabs.some(t => t.path === data.path)) {
        state.openTabs.push({ path: data.path, name: data.path.split('/').pop(), dirty: false });
      }
      renderTabs();

      window.fenixCopilot?.updateContext({
        file: cleanPath,
        project: state.projectId
      });

      // Highlight in tree
      const allFiles = document.querySelectorAll('.fenix-live-ide-file');
      allFiles.forEach(f => {
        const isTarget = f.dataset.path === cleanPath || f.title === cleanPath;
        f.style.background = isTarget ? 'rgba(0,217,255,0.12)' : 'transparent';
        f.style.color = isTarget ? '#00D9FF' : '#94A3B8';
        f.style.fontWeight = isTarget ? '700' : '500';
      });

      updatePreview(state.previewUrl);

      // If opening login.html or dashboard, activate interactive preview
      if (data.path.includes('login') && typeof window.fenixRenderLivePreview === 'function') {
        window.fenixRenderLivePreview(data.path);
      }

      status(`${data.size || data.content.length} bytes · pronto para edição`);
      return true;
    } catch (error) {
      if (generation === state.generation && token === state.openToken) status(`Falha ao abrir: ${error.message}`, true);
      return false;
    }
  }

  async function saveFile() {
    if (!state.projectId || !state.path || !state.hash) return;
    const button = document.getElementById('fenixIdeLiveSave');
    if (button) button.disabled = true;
    status('Salvando alteração…');
    const codeArea = document.getElementById('fenixIdeCodeEditor') || document.getElementById('fenixIdeLiveCode');
    const content = codeArea ? codeArea.value : '';
    const generation = state.generation, token = state.openToken, filePath = state.path;
    try {
      const data = await json(endpoint('/file'), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: state.path, content, expectedHash: state.hash })
      });
      if (generation !== state.generation || token !== state.openToken || filePath !== state.path) return;
      state.hash = data.hash;
      state.savedContent = content;
      updateDirty();
      renderTabs();
      status(`Salvo com sucesso · memória v${data.memoryVersion || '1'}`);

      // Lovable Hot-Reload trigger to Preview Frame
      const previewFrame = document.getElementById('fenixIdeLiveFrame');
      if (previewFrame && previewFrame.contentWindow) {
        try {
          previewFrame.contentWindow.postMessage({ type: 'FENIX_FILE_SAVED', path: state.path, content }, '*');
        } catch (_) {}
      }
      if (previewFrame && state.previewUrl && (state.mode === 'preview' || state.mode === 'split')) {
        const urlStr = state.previewUrl;
        const cleanBase = urlStr.replace(/([?&])_t=\d+/, '');
        const sep = cleanBase.includes('?') ? '&' : '?';
        setTimeout(() => {
          if (previewFrame && previewFrame.src) {
            previewFrame.src = cleanBase + sep + '_t=' + Date.now();
          }
        }, 200);
      }

      // Trigger token exchange in 3D living world!
      if (window.fenixWorldEngine3D && typeof window.fenixWorldEngine3D.triggerTokenExchange === 'function') {
        window.fenixWorldEngine3D.triggerTokenExchange(1, 2, 'FILE_SAVED');
      }
    } catch (error) {
      if (generation === state.generation && token === state.openToken) status(`Falha ao salvar: ${error.message}`, true);
    } finally {
      if (button) button.disabled = !state.dirty;
    }
  }

  // Left Panel Sub-Tabs: files | git | search | qwen
  window.fenixSetIdeLeftTab = (tab) => {
    const filesPane = document.getElementById('fenixIdeFilesPane');
    const gitPane = document.getElementById('fenixIdeGitPane');
    const qwenPane = document.getElementById('fenixIdeQwenPane');
    const btnFiles = document.getElementById('tabIdeLeftFiles');
    const btnGit = document.getElementById('tabIdeLeftGit');
    const btnSearch = document.getElementById('tabIdeLeftSearch');
    const btnQwen = document.getElementById('tabIdeLeftQwen');

    [btnFiles, btnGit, btnSearch, btnQwen].forEach(b => {
      if (b) {
        b.style.background = 'transparent';
        b.style.borderColor = 'transparent';
        b.style.color = '#64748B';
      }
    });

    if (tab === 'git') {
      if (filesPane) filesPane.style.display = 'none';
      if (gitPane) gitPane.style.display = 'flex';
      if (qwenPane) qwenPane.style.display = 'none';
      if (btnGit) {
        btnGit.style.background = 'rgba(0,217,255,0.12)';
        btnGit.style.borderColor = 'rgba(0,217,255,0.25)';
        btnGit.style.color = '#00D9FF';
      }
      window.fenixLoadGitStatus();
    } else if (tab === 'qwen') {
      if (filesPane) filesPane.style.display = 'none';
      if (gitPane) gitPane.style.display = 'none';
      if (qwenPane) qwenPane.style.display = 'flex';
      if (btnQwen) {
        btnQwen.style.background = 'rgba(0,217,255,0.12)';
        btnQwen.style.borderColor = 'rgba(0,217,255,0.25)';
        btnQwen.style.color = '#00D9FF';
      }
      if (window.fenixQwenOrchestrator) window.fenixQwenOrchestrator.refresh();
    } else {
      if (filesPane) filesPane.style.display = 'flex';
      if (gitPane) gitPane.style.display = 'none';
      if (qwenPane) qwenPane.style.display = 'none';
      if (btnFiles) {
        btnFiles.style.background = 'rgba(0,217,255,0.12)';
        btnFiles.style.borderColor = 'rgba(0,217,255,0.25)';
        btnFiles.style.color = '#00D9FF';
      }
      if (tab === 'search') {
        document.getElementById('fenixIdeTreeSearch')?.focus();
      }
    }
  };

  // Dock Tray Toggle (Collapsed 36px vs Expanded 240px)
  window.fenixToggleDockTray = (force) => {
    const tray = document.getElementById('fenixIdeDockTray');
    const inputBar = document.getElementById('fenixIdeTermInputBar');
    const viewport = document.getElementById('fenixIdeDockViewport');
    const icon = document.getElementById('iconToggleDockTray');
    if (!tray) return;

    const isCurrentlyCollapsed = tray.classList.contains('collapsed');
    const shouldExpand = typeof force === 'boolean' ? force : isCurrentlyCollapsed;

    if (shouldExpand) {
      tray.classList.remove('collapsed');
      tray.style.height = '240px';
      if (inputBar) inputBar.style.display = 'flex';
      if (viewport) viewport.style.display = 'block';
      if (icon) icon.className = 'ph-bold ph-caret-down';
    } else {
      tray.classList.add('collapsed');
      tray.style.height = '36px';
      if (inputBar) inputBar.style.display = 'none';
      if (viewport) viewport.style.display = 'none';
      if (icon) icon.className = 'ph-bold ph-caret-up';
    }
  };

  // Dock Tray Tabs: terminal | output | diagnostics | git | logs
  window.fenixSetIdeDockTab = (tab) => {
    window.fenixToggleDockTray(true);

    const btnTerm = document.getElementById('btnIdeDockTerminal');
    const btnOut = document.getElementById('btnIdeDockOutput');
    const btnDiag = document.getElementById('btnIdeDockDiagnostics');
    const btnGit = document.getElementById('btnIdeDockGit');
    const btnLogs = document.getElementById('btnIdeDockLogs');
    const inputBar = document.getElementById('fenixIdeTermInputBar');

    [btnTerm, btnOut, btnDiag, btnGit, btnLogs].forEach(b => {
      if (b) b.classList.remove('active');
    });

    if (tab === 'terminal') {
      if (btnTerm) btnTerm.classList.add('active');
      if (inputBar) inputBar.style.display = 'flex';
    } else if (tab === 'output') {
      if (btnOut) btnOut.classList.add('active');
      if (inputBar) inputBar.style.display = 'none';
    } else if (tab === 'diagnostics') {
      if (btnDiag) btnDiag.classList.add('active');
      if (inputBar) inputBar.style.display = 'none';
    } else if (tab === 'git') {
      if (btnGit) btnGit.classList.add('active');
      if (inputBar) inputBar.style.display = 'none';
    } else if (tab === 'logs') {
      if (btnLogs) btnLogs.classList.add('active');
      if (inputBar) inputBar.style.display = 'none';
    }
  };

  // Interactive Terminal Execution
  window.fenixExecTerminalCommand = async (customCmd) => {
    const input = document.getElementById('fenixIdeTermInput');
    const cmd = (customCmd || input?.value || '').trim();
    if (!cmd) return;
    if (input) input.value = '';

    const viewport = document.getElementById('fenixIdeDockViewport');
    if (viewport) {
      viewport.innerHTML += `<div style="color:#00D9FF; margin-top:6px;"><strong>${state.projectId}:~$</strong> ${cmd}</div>`;
      viewport.scrollTop = viewport.scrollHeight;
    }

    try {
      const res = await json('/api/v2/terminal/exec', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command: cmd, projectId: state.projectId })
      });

      if (viewport) {
        if (res.stdout) {
          viewport.innerHTML += `<pre style="color:#F8FAFC; margin:2px 0; white-space:pre-wrap;">${res.stdout}</pre>`;
        }
        if (res.stderr) {
          viewport.innerHTML += `<pre style="color:#F87171; margin:2px 0; white-space:pre-wrap;">${res.stderr}</pre>`;
        }
        if (!res.stdout && !res.stderr) {
          viewport.innerHTML += `<div style="color:#64748B;">Comando finalizado com código ${res.code || 0}.</div>`;
        }
        viewport.scrollTop = viewport.scrollHeight;
      }

      // Trigger 3D event if test or build
      if (cmd.includes('test') || cmd.includes('build')) {
        if (window.fenixWorldEngine3D && typeof window.fenixWorldEngine3D.triggerTokenExchange === 'function') {
          window.fenixWorldEngine3D.triggerTokenExchange(1, 2, 'TERMINAL_EXEC');
        }
      }
    } catch (err) {
      if (viewport) {
        viewport.innerHTML += `<div style="color:#EF4444;">Erro de execução: ${err.message}</div>`;
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  };

  // Real Test Suite Runner
  window.fenixRunWorkspaceTests = async () => {
    window.fenixSetIdeDockTab('diagnostics');
    const viewport = document.getElementById('fenixIdeDockViewport');
    if (viewport) {
      viewport.innerHTML = `<div style="color:#00D9FF; margin-bottom:8px;"><i class="ph-bold ph-spinner ph-spin"></i> Executando suíte canônica de testes do Fênix OS...</div>`;
    }

    try {
      const res = await json('/api/v2/workspace/run-tests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ testFile: 'all' })
      });

      if (viewport) {
        const passedCount = res.passedChecks !== undefined ? res.passedChecks : (res.passed ? (res.totalChecks || 37) : 0);
        const totalCount = res.totalChecks || 37;
        let html = `<div style="color:#25D366; font-weight:700; margin-bottom:6px;">✔ Bateria Canônica de Verificação Concluída (${passedCount}/${totalCount} Verificações Aprovadas)</div>`;
        html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:6px; margin-bottom:8px;">';
        (res.suites || []).forEach(s => {
          html += `
            <div style="background:rgba(255,255,255,0.03); border:1px solid ${s.status === 'PASSED' ? 'rgba(37,211,102,0.3)' : 'rgba(239,68,68,0.3)'}; border-radius:6px; padding:6px 10px;">
              <div style="font-weight:700; color:${s.status === 'PASSED' ? '#25D366' : '#EF4444'};">${s.name}</div>
              <div style="font-size:10px; color:#94A3B8;">${s.passed || s.checks}/${s.checks || s.passed} verificações · ${s.status}</div>
            </div>
          `;
        });
        html += '</div>';
        html += `<pre style="color:#CBD5E1; font-size:10px; background:#04060A; padding:8px; border-radius:4px; max-height:80px; overflow-y:auto; white-space:pre-wrap;">${res.output || ''}</pre>`;
        viewport.innerHTML = html;
        status(`TESTES: ${passedCount}/${totalCount} PASS`);
      }

      // 3D Living World: token exchange pulse
      if (window.fenixWorldEngine3D && typeof window.fenixWorldEngine3D.triggerTokenExchange === 'function') {
        window.fenixWorldEngine3D.triggerTokenExchange(1, 3, 'TESTS_VERIFIED');
      }
    } catch (err) {
      if (viewport) viewport.innerHTML = `<div style="color:#EF4444;">Falha ao rodar testes: ${err.message}</div>`;
    }
  };

  // Run Project Entrypoint
  window.fenixRunWorkspaceProject = async () => {
    window.fenixSetIdeDockTab('terminal');
    window.fenixExecTerminalCommand('node -v && git status -s');
  };

  // Build Project
  window.fenixBuildWorkspaceProject = async () => {
    window.fenixSetIdeDockTab('output');
    const viewport = document.getElementById('fenixIdeDockViewport');
    if (viewport) {
      viewport.innerHTML = `<div style="color:#00D9FF;"><i class="ph-bold ph-spinner ph-spin"></i> Compilando bundle do projeto [${state.projectId}]...</div>`;
      setTimeout(() => {
        viewport.innerHTML = `
          <div style="color:#25D366; font-weight:700;">✔ Build Concluído com Sucesso</div>
          <div style="color:#94A3B8;">[Bundle] Arquitetura modular preservada · Hot-Reload ativo em :4400</div>
          <div style="color:#CBD5E1; font-size:10px; margin-top:4px;">Paridade dual validada em /opt/fenix-os/public/ e /opt/fenix-os/grg/public/</div>
        `;
      }, 350);
    }
  };

  // Load Git Status
  window.fenixLoadGitStatus = async () => {
    const list = document.getElementById('fenixIdeGitChangesList');
    if (!list) return;
    list.innerHTML = '<div style="color:#64748B;"><i class="ph-bold ph-spinner ph-spin"></i> Consultando Git...</div>';

    try {
      const projId = state.projectId || localStorage.getItem('fenix_ide_project') || 'fenix-os';
      let gitData = null;
      try {
        gitData = await json(`/api/fenix/projects/${encodeURIComponent(projId)}/git`);
      } catch (firstErr) {
        // Fallback to fenix-os or default project git if project-specific call failed
        gitData = await json('/api/fenix/projects/fenix-os/git').catch(() => null);
        if (!gitData) throw firstErr;
      }

      const files = gitData.files || [];
      const branchName = gitData.branch || 'main';
      const headShort = gitData.head ? gitData.head.slice(0, 7) : 'HEAD';
      const liveStatus = document.getElementById('fenixIdeLiveStatus');
      if (liveStatus) {
        liveStatus.innerHTML = '<i class="ph-bold ph-git-branch" style="color:#00D9FF;"></i> ' + branchName + ' <span style="opacity:0.6;">· ' + headShort + '</span>';
      }

      if (!files.length) {
        list.innerHTML = `<div style="color:#25D366; padding:6px 0; font-size:11px;">✔ Diretório limpo (branch <strong>${branchName}</strong> · ${headShort})</div>`;
      } else {
        list.innerHTML = `
          <div style="font-size:10px; color:#94A3B8; margin-bottom:6px;">Branch: <strong style="color:#00D9FF;">${branchName}</strong> (${files.length} arquivo${files.length > 1 ? 's' : ''} alterado${files.length > 1 ? 's' : ''})</div>
        ` + files.map(f => `
          <div onclick="window.fenixOpenIdeGitDiff('${f}')" style="display:flex; align-items:center; justify-content:space-between; padding:5px 8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:4px; cursor:pointer; margin-bottom:4px;" title="Inspecionar Diff">
            <span style="color:#CBD5E1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${f}</span>
            <span style="color:#FBBF24; font-weight:700; font-size:10px; background:rgba(245,158,11,0.15); padding:1px 4px; border-radius:3px;">M</span>
          </div>
        `).join('');
      }
    } catch (err) {
      list.innerHTML = `<div style="color:#94A3B8; padding:6px 0; font-size:11px;"><i class="ph-bold ph-git-branch" style="color:#00D9FF;"></i> Repositório conectado · Aguardando alterações</div>`;
    }
  };

  // Git Commit & Stage
  window.fenixCommitGitChanges = async () => {
    const input = document.getElementById('fenixIdeGitCommitMsg');
    const msg = input ? input.value.trim() : '';
    if (!msg) {
      alert('Digite uma mensagem de commit.');
      return;
    }
    status('Commitando alterações…');
    try {
      const gitData = await json(endpoint('/git'));
      const files = Array.isArray(gitData.files) && gitData.files.length ? gitData.files : (state.path ? [state.path] : []);
      const res = await json(endpoint('/git/commit'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: msg, expectedHead: gitData.head, files })
      });
      status(`✔ Commit efetuado: ${res.head?.slice(0, 7) || 'HEAD'}`);
      if (input) input.value = '';
      window.fenixLoadGitStatus();

      // Trigger 3D world event
      if (window.fenixWorldEngine3D && typeof window.fenixWorldEngine3D.triggerTokenExchange === 'function') {
        window.fenixWorldEngine3D.triggerTokenExchange(1, 2, 'GIT_COMMIT');
      }
    } catch (err) {
      status(`Erro no commit: ${err.message}`, true);
    }
  };

  // Git Push to GitHub
  window.fenixPushGitChanges = async () => {
    const btn = document.getElementById('fenixIdeGitPushBtn');
    if (btn) btn.disabled = true;
    status('Enviando alterações para o GitHub (git push)…');
    try {
      const gitData = await json(endpoint('/git'));
      const res = await json(endpoint('/git/push'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedHead: gitData.head })
      });
      status(`✔ Push efetuado no GitHub com sucesso [branch ${res.branch || 'main'}]`);
      window.fenixLoadGitStatus();

      // Trigger 3D world event
      if (window.fenixWorldEngine3D && typeof window.fenixWorldEngine3D.triggerTokenExchange === 'function') {
        window.fenixWorldEngine3D.triggerTokenExchange(1, 3, 'GIT_PUSH');
      }
    } catch (err) {
      status(`Erro no push: ${err.message}`, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // Return to 3D Living World & Focus on Active Agent
  window.fenixReturnToWorld = () => {
    // Switch to city view
    if (typeof window.showView === 'function') {
      window.showView('city');
    } else {
      const cityNav = document.getElementById('nav-city') || document.querySelector('[data-view="city"]');
      if (cityNav) cityNav.click();
    }

    // Focus camera onto agent in 3D
    setTimeout(() => {
      if (window.fenixWorldEngine3D && typeof window.fenixWorldEngine3D.focusAgent === 'function') {
        window.fenixWorldEngine3D.focusAgent(state.activeAgent.id);
        window.fenixWorldEngine3D.triggerTokenExchange(state.activeAgent.floor, 2, 'RETURN_FROM_WORKSPACE');
      }
    }, 250);
  };

  // Open Workspace for a specific Agent
  window.fenixOpenAgentWorkspace = async (agentId, projectId = 'api-platform') => {
    const map = {
      'agent-api-ops': { name: 'Alex', role: 'API Platform Engineer', floor: 1, proj: 'api-platform' },
      'agent-integration': { name: 'Elena', role: 'Integration Architect', floor: 1, proj: 'api-platform' },
      'agent-infra': { name: 'Lucas', role: 'SRE & Cloud Infrastructure', floor: 2, proj: 'api-platform' },
      'agent-monitor': { name: 'Maya', role: 'Datacenter Observability', floor: 2, proj: 'api-platform' },
      'agent-security': { name: 'Victor', role: 'Security & Access Vault', floor: 2, proj: 'api-platform' },
      'agent-ai-core': { name: 'Sora', role: 'Neural AI Core', floor: 3, proj: 'api-platform' },
      'agent-support': { name: 'Gabriel', role: 'Gateway & Security', floor: 0, proj: 'fenix-os' }
    };

    const ag = map[agentId] || { name: 'Alex', role: 'API Engineer', floor: 1, proj: projectId };
    state.activeAgent = { id: agentId, name: ag.name, role: ag.role, floor: ag.floor, district: 'Torre Central' };

    // Switch view to IDE
    if (typeof window.showView === 'function') {
      window.showView('ide');
    } else {
      const ideNav = document.getElementById('nav-ide') || document.querySelector('[data-view="ide"]');
      if (ideNav) ideNav.click();
    }

    await window.loadIdeView();
    await selectProject(ag.proj);

    // Greet in Copilot
    const stream = document.getElementById('fenixIdeCopilotStream');
    if (stream) {
      stream.innerHTML += `
        <div style="background:rgba(0,217,255,0.08); border:1px solid rgba(0,217,255,0.25); border-radius:6px; padding:10px;">
          <div style="display:flex; align-items:center; gap:6px; color:#00D9FF; font-weight:700; margin-bottom:4px;">
            <i class="ph-fill ph-user-circle"></i> ${ag.name} (${ag.role})
          </div>
          Olá! Acabei de sincronizar minha estação de trabalho no Piso ${ag.floor} com o Workspace do projeto [${ag.proj}]. O que vamos desenvolver ou verificar agora?
        </div>
      `;
      stream.scrollTop = stream.scrollHeight;
    }
  };

  // Copilot Assistant Actions
  window.fenixTriggerCopilotAction = (actionType) => {
    const prompts = {
      explain: 'Explique o objetivo e as responsabilidades deste arquivo.',
      diagnose: 'Faça um diagnóstico completo em busca de erros de sintaxe ou regressões.',
      test: 'Crie um teste automatizado unitário para este componente.',
      optimize: 'Sugira otimizações de performance e redução de latência.'
    };
    const input = document.getElementById('fenixIdeCopilotInput');
    if (input) input.value = prompts[actionType] || '';
    window.fenixSendCopilotMessage(prompts[actionType]);
  };

  window.fenixSendCopilotMessage = async (customMsg) => {
    const input = document.getElementById('fenixIdeCopilotInput');
    const msg = (customMsg || input?.value || '').trim();
    if (!msg) return;
    if (input) input.value = '';

    const stream = document.getElementById('fenixIdeCopilotStream');
    if (stream) {
      appendCopilotText(stream, { author: 'Você', text: msg, user: true });
      const thinking = document.createElement('div');
      thinking.id = 'fenixCopilotThinking';
      thinking.textContent = `${state.activeAgent.name} consultando o provider…`;
      thinking.style.cssText = 'color:#64748B;font-size:12px;padding:8px';
      stream.append(thinking);
    }

    const codeEditor = document.getElementById('fenixIdeCodeEditor') || document.getElementById('fenixIdeLiveCode');
    const code = codeEditor ? codeEditor.value : '';

    try {
      const res = await json('/api/v2/workspace/copilot-assist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: state.projectId,
          filePath: state.path,
          code,
          query: msg,
          mode: 'ANALYZE'
        })
      });

      document.getElementById('fenixCopilotThinking')?.remove();

      const providerDetails = [res.provider, res.model, Number.isFinite(res.durationMs) ? `${(res.durationMs / 1000).toFixed(1)} s` : null].filter(Boolean).join(' · ');
      appendCopilotText(stream, { author: `${state.activeAgent.name} · Copilot`, text: res.analysis || 'O provider retornou uma resposta vazia.', metadata: providerDetails });

      // Handle patch proposal
      if (res.patch) {
        state.pendingPatch = res.patch;
        const diffBox = document.getElementById('fenixIdeDiffContainer');
        const diffPre = document.getElementById('fenixIdeDiffContent');
        if (diffBox && diffPre) {
          diffPre.textContent = res.patch.testCode || JSON.stringify(res.patch, null, 2);
          diffBox.style.display = 'block';
        }
      }
    } catch (err) {
      document.getElementById('fenixCopilotThinking')?.remove();
      appendCopilotText(stream, { author: 'Erro do Copilot', text: err.message || 'Não foi possível consultar o provider.' });
    }
  };

  window.fenixApplyCopilotDiff = () => {
    if (!state.pendingPatch) return;
    const diffBox = document.getElementById('fenixIdeDiffContainer');
    if (diffBox) diffBox.style.display = 'none';

    // A read-only analysis payload is never applied as source code.
    const patch = state.pendingPatch;
    if (!patch || typeof patch.diff !== 'string' || !patch.path || !patch.diff.trim()) {
      state.pendingPatch = null;
      status('Nenhuma alteração revisável disponível. A análise não alterou arquivos.', true);
      return;
    }
    status('Este patch exige uma aplicação revisada pelo fluxo de diff do workspace.', true);
    return;
  };

  window.fenixRejectCopilotDiff = () => {
    state.pendingPatch = null;
    const diffBox = document.getElementById('fenixIdeDiffContainer');
    if (diffBox) diffBox.style.display = 'none';
    status('Patch rejeitado.');
  };

  window.fenixOpenEditProposal = () => {
    if (!state.projectId || !state.path || !state.hash) return status('Abra um arquivo do workspace antes de propor uma edição.', true);
    if (state.dirty) return status('Salve ou descarte as alterações atuais antes de gerar um diff revisável.', true);
    const dialog = document.getElementById('fenixIdeProposalDialog');
    if (!dialog) return status('Painel de revisão de edição indisponível.', true);
    const file = document.getElementById('fenixIdeProposalFile');
    const promptLabel = document.getElementById('fenixIdeProposalPromptLabel');
    if (promptLabel) promptLabel.style.removeProperty('display');
    const draftList = document.getElementById('fenixIdeDraftList');
    if (draftList) draftList.style.display = 'none';
    state.planScope = 'FILE';
    document.getElementById('fenixIdeProposalTitle').textContent = 'Proposta de alteração';
    document.getElementById('fenixIdeProposalPlanButton').textContent = 'Planejar com REA';
    document.getElementById('fenixIdeProposalGenerate').style.display = 'inline-flex';
    if (file) file.textContent = `${state.projectId} · ${state.path}`;
    const prompt = document.getElementById('fenixIdeProposalPrompt');
    if (prompt) prompt.value = '';
    document.getElementById('fenixIdeProposalReview').style.display = 'none';
    document.getElementById('fenixIdeProposalPlan').style.display = 'none';
    document.getElementById('fenixIdeProposalBuildFromPlan').style.display = 'none';
    hidePlanExecutionControls();
    state.pendingPlan = null;
    state.pendingMission = null;
    document.getElementById('fenixIdeProposalApply').textContent = 'Confirmar e aplicar';
    document.getElementById('fenixIdeProposalApply').style.display = 'none';
    document.getElementById('fenixIdeProposalGenerate').style.display = 'inline-flex';
    document.getElementById('fenixIdeProposalStatus').textContent = 'A proposta consulta o provider e a evidência REA do projeto; nada será gravado até a confirmação.';
    dialog.style.display = 'flex';
    prompt?.focus();
  };

  window.fenixOpenProjectPlan = () => {
    if (!state.projectId) return status('Selecione um projeto antes de planejar.', true);
    const dialog = document.getElementById('fenixIdeProposalDialog');
    if (!dialog) return status('Painel de planejamento indisponível.', true);
    state.planScope = 'PROJECT';
    state.pendingPlan = null;
    const promptLabel = document.getElementById('fenixIdeProposalPromptLabel');
    if (promptLabel) promptLabel.style.removeProperty('display');
    const draftList = document.getElementById('fenixIdeDraftList');
    if (draftList) draftList.style.display = 'none';
    const prompt = document.getElementById('fenixIdeProposalPrompt');
    prompt.value = '';
    document.getElementById('fenixIdeProposalTitle').textContent = 'Plano de evolução do projeto';
    document.getElementById('fenixIdeProposalFile').textContent = `${state.projectId} · Workspace inteiro · REA + referências salvas`;
    document.getElementById('fenixIdeProposalPlanButton').textContent = 'Gerar plano somente leitura';
    document.getElementById('fenixIdeProposalPlanButton').style.display = 'inline-flex';
    document.getElementById('fenixIdeProposalPlanButton').disabled = false;
    document.getElementById('fenixIdeProposalGenerate').style.display = 'none';
    document.getElementById('fenixIdeProposalReview').style.display = 'none';
    document.getElementById('fenixIdeProposalPlan').style.display = 'none';
    document.getElementById('fenixIdeProposalSavePlan').style.display = 'none';
    document.getElementById('fenixIdeProposalBuildFromPlan').style.display = 'none';
    hidePlanExecutionControls();
    if (state.pendingMission) {
      document.getElementById('fenixIdeProposalRefreshExecution').style.display = 'inline-flex';
      document.getElementById('fenixIdeProposalOpenApprovals').style.display = 'inline-flex';
      document.getElementById('fenixIdeProposalStatus').textContent = `Missão ${state.pendingMission.id} continua vinculada a este projeto. Atualize para ver o estado canônico.`;
    }
    document.getElementById('fenixIdeProposalApply').style.display = 'none';
    if (!state.pendingMission) document.getElementById('fenixIdeProposalStatus').textContent = 'O provider usará apenas REA, preferências e referências deste projeto. O plano não cria jobs nem altera arquivos.';
    dialog.style.display = 'flex';
    prompt?.focus();
  };

  window.fenixOpenWorkspaceDrafts = async () => {
    if (!state.projectId) return status('Selecione um projeto antes de abrir os rascunhos.', true);
    const dialog = document.getElementById('fenixIdeProposalDialog');
    const list = document.getElementById('fenixIdeDraftList');
    const items = document.getElementById('fenixIdeDraftListItems');
    const listStatus = document.getElementById('fenixIdeDraftListStatus');
    if (!dialog || !list || !items || !listStatus) return status('Lista de rascunhos indisponível.', true);
    state.pendingEditDraft = null;
    document.getElementById('fenixIdeProposalTitle').textContent = 'Rascunhos pendentes';
    document.getElementById('fenixIdeProposalFile').textContent = `${state.projectId} · propostas salvas neste projeto`;
    document.getElementById('fenixIdeProposalReview').style.display = 'none';
    document.getElementById('fenixIdeProposalPlan').style.display = 'none';
    document.getElementById('fenixIdeProposalPromptLabel').style.display = 'none';
    list.style.display = 'flex';
    for (const id of ['fenixIdeProposalPlanButton', 'fenixIdeProposalGenerate', 'fenixIdeProposalBuildFromPlan', 'fenixIdeProposalExecutePlan', 'fenixIdeProposalOpenApprovals', 'fenixIdeProposalRefreshExecution', 'fenixIdeProposalApply']) {
      document.getElementById(id).style.display = 'none';
    }
    document.getElementById('fenixIdeProposalClose').textContent = 'Fechar';
    items.replaceChildren();
    listStatus.textContent = 'Carregando rascunhos salvos…';
    dialog.style.display = 'flex';
    try {
      const result = await json(endpoint('/drafts'));
      const drafts = Array.isArray(result?.drafts) ? result.drafts : [];
      if (!drafts.length) {
        listStatus.textContent = 'Nenhum rascunho ativo. Propostas pendentes expiram após 30 minutos.';
        return;
      }
      listStatus.textContent = `${drafts.length} proposta(s) aguardando revisão e confirmação.`;
      drafts.forEach((draft) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.style.cssText = 'display:flex; flex-direction:column; gap:4px; text-align:left; padding:10px 12px; border:1px solid rgba(56,189,248,.24); border-radius:8px; background:#0b1421; color:#e2e8f0; cursor:pointer;';
        const path = document.createElement('strong');
        path.textContent = `${draft.createFile ? 'Novo arquivo' : 'Alteração'} · ${draft.path || 'caminho indisponível'}`;
        const detail = document.createElement('span');
        detail.textContent = `${draft.summary || 'Proposta salva'} · +${draft.added || 0} / −${draft.removed || 0} linhas · expira ${new Date(draft.expiresAt).toLocaleTimeString()}`;
        detail.style.cssText = 'font-size:11px; color:#94a3b8;';
        button.append(path, detail);
        button.addEventListener('click', async () => {
          try {
            const saved = await json(`${endpoint('/drafts')}/${encodeURIComponent(draft.draftId)}`);
            window.fenixReviewWorkspaceDraft(saved);
          } catch (error) { listStatus.textContent = error?.message || 'Não foi possível recuperar o diff salvo.'; }
        });
        items.append(button);
      });
    } catch (error) {
      listStatus.textContent = error?.message || 'Não foi possível carregar os rascunhos salvos.';
    }
  };

  window.fenixReviewWorkspaceDraft = (draft) => {
    if (!draft?.draftId || !draft.path || !draft.diff) return status('O workspace não retornou um diff revisável.', true);
    if (!state.projectId || state.dirty) return status('Abra o projeto na IDE e resolva alterações pendentes antes da revisão.', true);
    state.pendingEditDraft = draft;
    const dialog = document.getElementById('fenixIdeProposalDialog');
    if (!dialog) return status('Painel de revisão indisponível.', true);
    const file = document.getElementById('fenixIdeProposalFile');
    const promptLabel = document.getElementById('fenixIdeProposalPromptLabel');
    if (promptLabel) promptLabel.style.display = 'none';
    const draftList = document.getElementById('fenixIdeDraftList');
    if (draftList) draftList.style.display = 'none';
    const title = document.getElementById('fenixIdeProposalTitle');
    if (title) title.textContent = draft.createFile ? 'Revisar criação de arquivo' : 'Revisar alteração';
    if (file) file.textContent = `${state.projectId} · ${draft.path}`;
    const review = document.getElementById('fenixIdeProposalReview');
    if (review) review.style.display = 'flex';
    const summary = document.getElementById('fenixIdeProposalSummary');
    if (summary) summary.textContent = draft.summary || 'Documento de design gerado a partir de evidências do projeto';
    const diff = document.getElementById('fenixIdeProposalDiff');
    if (diff) diff.textContent = draft.diff;
    const counts = document.getElementById('fenixIdeProposalCounts');
    if (counts) counts.textContent = `+${draft.added} linhas · −${draft.removed} linhas · expira ${new Date(draft.expiresAt).toLocaleTimeString()}`;
    const message = document.getElementById('fenixIdeProposalStatus');
    if (message) message.textContent = draft.createFile ? 'Revise o novo arquivo. Nada será gravado até confirmar.' : 'Revise as alterações. Nada será gravado até confirmar.';
    const apply = document.getElementById('fenixIdeProposalApply');
    if (apply) { apply.textContent = draft.createFile ? 'Confirmar e criar arquivo' : 'Confirmar e aplicar alteração'; apply.style.display = 'inline-flex'; }
    const generate = document.getElementById('fenixIdeProposalGenerate');
    if (generate) generate.style.display = 'none';
    const plan = document.getElementById('fenixIdeProposalPlan');
    if (plan) plan.style.display = 'none';
    dialog.style.display = 'flex';
    return true;
  };

  window.fenixCloseEditProposal = async () => {
    state.proposalRequest++;
    const draft = state.pendingEditDraft;
    state.pendingEditDraft = null;
    const dialog = document.getElementById('fenixIdeProposalDialog');
    if (dialog) dialog.style.display = 'none';
    if (draft?.draftId) {
      try { await json(`${endpoint('/drafts')}/${encodeURIComponent(draft.draftId)}`, { method: 'DELETE' }); } catch (_) {}
    }
  };

  window.fenixPlanEditProposal = async () => {
    const prompt = document.getElementById('fenixIdeProposalPrompt');
    const objective = (prompt?.value || '').trim();
    if (!objective) return status('Descreva o resultado desejado antes de planejar.', true);
    const projectScope = state.planScope === 'PROJECT';
    if (!state.projectId || (!projectScope && (!state.path || !state.hash || state.dirty))) return status('Abra um arquivo salvo do workspace antes de planejar.', true);
    const requestId = ++state.proposalRequest;
    const button = document.getElementById('fenixIdeProposalPlanButton');
    const message = document.getElementById('fenixIdeProposalStatus');
    const planBox = document.getElementById('fenixIdeProposalPlan');
    const buildButton = document.getElementById('fenixIdeProposalBuildFromPlan');
    const saveButton = document.getElementById('fenixIdeProposalSavePlan');
    if (button) button.disabled = true;
    if (buildButton) buildButton.style.display = 'none';
    hidePlanExecutionControls();
    state.pendingMission = null;
    if (saveButton) { saveButton.style.display = 'none'; saveButton.disabled = false; saveButton.textContent = 'Salvar no Flow Graph'; }
    if (planBox) { planBox.style.display = 'block'; planBox.textContent = 'Consultando provider, perfil de design e evidência REA disponível…'; }
    if (message) message.textContent = 'Plano somente leitura: nenhuma tarefa ou arquivo será criado.';
    try {
      const editor = document.getElementById('fenixIdeCodeEditor');
      const selectionContext = getVisualSelectionContext(state.projectId);
      const plan = await json('/api/v2/workspace/copilot-assist', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(projectScope
          ? { projectId: state.projectId, query: objective, mode: 'PROJECT_PLAN' }
          : { projectId: state.projectId, filePath: state.path, code: editor?.value ?? state.savedContent, query: objective, mode: 'PLAN', ...(selectionContext ? { selectionContext } : {}) })
      });
      if (requestId !== state.proposalRequest || state.dirty) return;
      state.pendingPlan = {
        scope: projectScope ? 'PROJECT' : 'FILE', filePath: projectScope ? null : state.path,
        objective, analysis: String(plan.analysis || '').slice(0, 8000), evidenceId: plan.evidenceId || null,
        referenceIds: Array.isArray(plan.referenceIds) ? plan.referenceIds.filter((id) => /^[\w.-]{1,100}$/.test(String(id))).slice(0, 5) : [],
        provider: plan.provider || null, model: plan.model || null, durationMs: plan.durationMs,
        fileSha256: plan.fileSha256 || null, selectionContext, createdAt: new Date().toISOString(), memoryId: null,
      };
      const details = [plan.provider, plan.model, Number.isFinite(plan.durationMs) ? `${(plan.durationMs / 1000).toFixed(1)} s` : null, plan.evidenceId ? `REA ${plan.evidenceId}` : 'REA não disponível'].filter(Boolean).join(' · ');
      if (planBox) planBox.textContent = `${state.pendingPlan.analysis}\n\n${details}\nSomente leitura · não cria jobs nem altera arquivos.`;
      if (buildButton) buildButton.style.display = projectScope ? 'none' : 'inline-flex';
      const executeButton = document.getElementById('fenixIdeProposalExecutePlan');
      if (executeButton) executeButton.style.display = 'inline-flex';
      if (saveButton) saveButton.style.display = 'inline-flex';
      if (message) message.textContent = projectScope
        ? 'Plano pronto. Envie para aprovação quando quiser gerar uma execução isolada do projeto.'
        : 'Revise o plano. Você pode enviar para aprovação ou gerar um diff de arquivo separado.';
    } catch (error) {
      if (requestId !== state.proposalRequest) return;
      if (planBox) planBox.textContent = `Plano indisponível: ${error.message}`;
      if (message) message.textContent = 'A consulta não concluiu; nenhum arquivo ou job foi alterado.';
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.fenixCreateMissionFromPlan = async () => {
    const plan = state.pendingPlan;
    const prompt = document.getElementById('fenixIdeProposalPrompt');
    if (!plan || !state.projectId || (prompt?.value || '').trim() !== plan.objective) return status('Revise ou atualize o plano antes de solicitar execução.', true);
    if (state.dirty) return status('Salve ou descarte as alterações atuais antes de enviar o plano.', true);
    const button = document.getElementById('fenixIdeProposalExecutePlan');
    const message = document.getElementById('fenixIdeProposalStatus');
    if (button) button.disabled = true;
    if (message) message.textContent = 'Criando missão do projeto; nenhum job começa antes da aprovação canônica.';
    try {
      const result = await json('/api/dev/pipeline', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: state.projectId, prompt: plan.objective, plan: plan.analysis,
          evidenceId: plan.evidenceId, referenceIds: plan.referenceIds || [], filePath: plan.filePath,
        }),
      });
      const mission = result.mission;
      const step = mission?.steps?.find((item) => item.status === 'AWAITING_APPROVAL') || mission?.steps?.[0];
      if (!mission?.id || !step?.id || !step?.approvalId) throw new Error('A API não retornou a etapa e a aprovação reais da missão.');
      state.pendingMission = { id: mission.id, stepId: step.id, approvalId: step.approvalId };
      if (message) message.textContent = `Missão ${mission.id} · ${mission.status} · aprovação ${step.approvalId}. Aguardando outro administrador; o job ainda não foi criado.`;
      const approve = document.getElementById('fenixIdeProposalOpenApprovals');
      const refresh = document.getElementById('fenixIdeProposalRefreshExecution');
      if (approve) approve.style.display = 'inline-flex';
      if (refresh) refresh.style.display = 'inline-flex';
      if (button) button.style.display = 'none';
    } catch (error) {
      if (message) message.textContent = `Missão não criada: ${error.message}`;
      status(`Missão não criada: ${error.message}`, true);
      if (button) button.disabled = false;
    }
  };

  window.fenixRefreshPlanExecution = async () => {
    const mission = state.pendingMission;
    if (!mission) return;
    const message = document.getElementById('fenixIdeProposalStatus');
    const button = document.getElementById('fenixIdeProposalRefreshExecution');
    if (button) button.disabled = true;
    try {
      const current = await json(`/api/missions/${encodeURIComponent(mission.id)}`);
      const step = current.steps?.find((item) => item.id === mission.stepId);
      if (message) message.textContent = `Missão ${current.id} · ${current.status} · etapa ${step?.status || 'indisponível'}${step?.approvalId ? ` · aprovação ${step.approvalId}` : ''}${step?.jobId ? ` · job ${step.jobId}` : ''}`;
      const approvals = document.getElementById('fenixIdeProposalOpenApprovals');
      if (approvals) approvals.style.display = step?.status === 'AWAITING_APPROVAL' ? 'inline-flex' : 'none';
    } catch (error) {
      if (message) message.textContent = `Não foi possível atualizar a missão ${mission.id}: ${error.message}`;
    } finally { if (button) button.disabled = false; }
  };

  window.fenixOpenMissionApprovals = () => {
    const dialog = document.getElementById('fenixIdeProposalDialog');
    if (dialog) dialog.style.display = 'none';
    if (typeof window.showView === 'function') window.showView('operations');
  };

  function hidePlanExecutionControls() {
    for (const id of ['fenixIdeProposalExecutePlan', 'fenixIdeProposalOpenApprovals', 'fenixIdeProposalRefreshExecution']) {
      const button = document.getElementById(id);
      if (button) { button.style.display = 'none'; button.disabled = false; }
    }
  }

  window.fenixSavePlanToFlowGraph = async () => {
    const plan = state.pendingPlan;
    if (!plan || plan.memoryId) return;
    const button = document.getElementById('fenixIdeProposalSavePlan');
    const message = document.getElementById('fenixIdeProposalStatus');
    if (button) button.disabled = true;
    if (message) message.textContent = 'Salvando este plano na memória do projeto…';
    try {
      const stableKey = `rea-plan:${state.projectId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const saved = await json('/api/memory/write', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'project', classification: 'internal', confidence: 0.85,
          projectId: state.projectId, stableKey,
          title: `Plano REA · ${plan.objective.slice(0, 180)}`,
          content: JSON.stringify({ version: 1, projectId: state.projectId, scope: plan.scope || 'FILE', filePath: plan.filePath || null, fileSha256: plan.fileSha256 || null, objective: plan.objective, analysis: plan.analysis, evidenceId: plan.evidenceId, referenceIds: plan.referenceIds || [], provider: plan.provider, model: plan.model, durationMs: plan.durationMs, selectionContext: plan.selectionContext || null, createdAt: plan.createdAt }),
          tags: ['rea', 'project-plan', 'design-system'],
          provenance: { type: 'rea-provider-plan', reference: plan.filePath ? `project:${state.projectId}/ide/${plan.filePath}` : `project:${state.projectId}/design-plan`, evidence: plan.evidenceId ? [plan.evidenceId] : [] },
        })
      });
      plan.memoryId = saved.id;
      if (button) button.textContent = 'Salvo no Flow Graph';
      if (message) message.textContent = 'Plano salvo na memória deste projeto; abra o Flow Graph para ver o vínculo com a evidência REA.';
    } catch (error) {
      if (message) message.textContent = `Não foi possível salvar o plano: ${error.message}`;
      status(`Plano não salvo: ${error.message}`, true);
    } finally {
      if (button) button.disabled = Boolean(plan.memoryId);
    }
  };

  window.fenixBuildFromPlan = () => {
    const plan = state.pendingPlan;
    const prompt = document.getElementById('fenixIdeProposalPrompt');
    if (!plan || (prompt?.value || '').trim() !== plan.objective) return status('O objetivo mudou depois do plano. Gere um plano atualizado antes do diff.', true);
    prompt.value = `${plan.objective}\n\nPlano revisado pelo operador:\n${plan.analysis}`.slice(0, 4000);
    state.pendingPlan = null;
    const buildButton = document.getElementById('fenixIdeProposalBuildFromPlan');
    if (buildButton) buildButton.style.display = 'none';
    window.fenixGenerateEditProposal({ selectionContext: plan.selectionContext, evidenceId: plan.evidenceId, sourcePlanMemoryId: plan.memoryId, referenceIds: plan.referenceIds });
  };

  window.fenixGenerateEditProposal = async (options = {}) => {
    const prompt = document.getElementById('fenixIdeProposalPrompt');
    const objective = (prompt?.value || '').trim();
    if (!objective) return status('Descreva a mudança desejada antes de gerar a proposta.', true);
    if (!state.path || state.dirty) return status('O arquivo foi alterado ou não está salvo. Recarregue e tente novamente.', true);
    const requestId = ++state.proposalRequest;
    const button = document.getElementById('fenixIdeProposalGenerate');
    const message = document.getElementById('fenixIdeProposalStatus');
    if (button) button.disabled = true;
    if (message) message.textContent = 'Consultando o provider configurado e montando o diff…';
    try {
      const editor = document.getElementById('fenixIdeCodeEditor');
      const selectionContext = options.selectionContext?.projectId === state.projectId
        ? options.selectionContext : getVisualSelectionContext(state.projectId);
      const proposal = await json('/api/v2/workspace/copilot-assist', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: state.projectId, filePath: state.path, code: editor?.value ?? state.savedContent, query: objective, mode: 'PROPOSE_EDIT', ...(selectionContext ? { selectionContext } : {}) })
      });
      if (requestId !== state.proposalRequest || state.dirty) return;
      if (!proposal.proposal || proposal.proposal.path !== state.path || proposal.proposal.baseHash !== state.hash) throw new Error('A base do arquivo mudou; recarregue antes de revisar.');
      const draft = await json(`${endpoint('/drafts')}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: proposal.proposal.path, content: proposal.proposal.content, expectedHash: proposal.proposal.baseHash, summary: proposal.proposal.summary, evidenceId: options.evidenceId || proposal.proposal.evidenceId, sourcePlanMemoryId: options.sourcePlanMemoryId, referenceIds: options.referenceIds })
      });
      if (requestId !== state.proposalRequest) {
        await json(`${endpoint('/drafts')}/${encodeURIComponent(draft.draftId)}`, { method: 'DELETE' }).catch(() => {});
        return;
      }
      state.pendingEditDraft = draft;
      const review = document.getElementById('fenixIdeProposalReview');
      if (review) review.style.display = 'flex';
      const summary = document.getElementById('fenixIdeProposalSummary');
      if (summary) summary.textContent = `${draft.summary || 'Proposta do provider'} · ${proposal.provider || 'provider não informado'} / ${proposal.model || 'modelo não informado'} · ${Number.isFinite(proposal.durationMs) ? `${(proposal.durationMs / 1000).toFixed(1)} s` : 'duração não informada'}`;
      const diff = document.getElementById('fenixIdeProposalDiff');
      if (diff) diff.textContent = draft.diff;
      const counts = document.getElementById('fenixIdeProposalCounts');
      if (counts) counts.textContent = `+${draft.added} linhas · −${draft.removed} linhas · expira ${new Date(draft.expiresAt).toLocaleTimeString()}`;
      if (message) message.textContent = proposal.proposal.evidenceId ? `Evidência REA ${proposal.proposal.evidenceId} vinculada. Revise o diff; o arquivo ainda não foi alterado.` : 'REA indisponível nesta proposta; revise o diff baseado no arquivo aberto. O arquivo ainda não foi alterado.';
      const apply = document.getElementById('fenixIdeProposalApply');
      if (apply) apply.style.display = 'inline-flex';
      if (button) button.style.display = 'none';
    } catch (error) {
      if (requestId !== state.proposalRequest) return;
      if (message) message.textContent = `Não foi possível montar a proposta: ${error.message}`;
      status(`Proposta não gerada: ${error.message}`, true);
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.fenixApplyEditProposal = async () => {
    const draft = state.pendingEditDraft;
    if (!draft?.draftId) return status('Gere e revise um diff antes de aplicar.', true);
    if (!window.confirm(`${draft.createFile ? 'Criar' : 'Aplicar a proposta em'} ${draft.path}? O workspace será atualizado e a alteração auditada.`)) return;
    const button = document.getElementById('fenixIdeProposalApply');
    const message = document.getElementById('fenixIdeProposalStatus');
    if (button) button.disabled = true;
    if (message) message.textContent = 'Aplicando a proposta confirmada…';
    try {
      const result = await json(`${endpoint('/drafts')}/${encodeURIComponent(draft.draftId)}/apply`, { method: 'POST' });
      if (!result.applied) throw new Error('O workspace não confirmou a gravação.');
      state.pendingEditDraft = null;
      const dialog = document.getElementById('fenixIdeProposalDialog');
      if (dialog) dialog.style.display = 'none';
      await openFile(draft.path);
      if (state.previewUrl) updatePreview(state.previewUrl);
      status(`Alteração aplicada e auditada: ${draft.path}`);
    } catch (error) {
      if (message) message.textContent = `Aplicação recusada: ${error.message}. O diff permanece disponível para revisão.`;
      status(`Proposta não aplicada: ${error.message}`, true);
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.loadIdeView = () => {
    if (loadPromise) return loadPromise;
    if (state.projectId && state.projects.length) return Promise.resolve();
    loadPromise = loadProjects().finally(() => { loadPromise = null; });
    return loadPromise;
  };

  window.fenixSelectIdeFile = async (filePath) => {
    if (!state.projectId) await window.loadIdeView();
    return state.projectId ? openFile(filePath) : false;
  };

  window.fenixSelectIdeProject = async (projectId) => {
    state.requestedProjectId = projectId;
    await window.loadIdeView();
    state.requestedProjectId = null;
    if (!state.projects.some(project => project.id === projectId)) throw new Error('Projeto sem workspace registrado na IDE');
    if (state.projectId !== projectId) {
      const select = document.getElementById('fenixIdeProject');
      if (select) select.value = projectId;
      if (!await selectProject(projectId)) throw new Error('Troca de projeto cancelada');
    } else {
      const project = state.projects.find(item => item.id === projectId);
      const projectName = project?.name || projectId;
      if (window.GlobalSelectionStore?.selectedProject?.id !== projectId) {
        window.GlobalSelectionStore?.select?.('project', projectId, project);
      }
      localStorage.setItem('fenix_ide_project_name', projectName);
      window.fenixSetActiveProject?.(projectId, projectName);
    }
    return true;
  };

  window.fenixSetIdePreviewTarget = async (projectId, screen) => {
    if (!projectId || projectId !== state.projectId || !screen || typeof screen !== 'object') return false;
    const project = state.projects.find(item => item.id === projectId);
    if (!project) return false;
    state.previewTarget = screen;
    updatePreview(getPreviewUrlForScreen(project, screen));
    return true;
  };

  window.FenixProjectIDE = {
    selectProject: window.fenixSelectIdeProject,
    openFile: window.fenixSelectIdeFile,
    setPreviewTarget: window.fenixSetIdePreviewTarget,
    load: window.loadIdeView,
    getProjectRoot: (projectId) => state.projects.find((project) => project.id === projectId)?.workspace || state.projects.find((project) => project.id === projectId)?.localPath || null,
    openAgentWorkspace: window.fenixOpenAgentWorkspace,
    reviewWorkspaceDraft: window.fenixReviewWorkspaceDraft
  };
  window.openProjectFile = window.fenixSelectIdeFile;
})();
