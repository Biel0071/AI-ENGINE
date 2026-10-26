(() => {
  'use strict';
  const state = { nodes: [], edges: [], selected: null, query: '', type: 'all', loading: null, error: null, measuredAt: null, activeTab: 'graph' };
  let neuralBrainActive = (() => {
    try { return localStorage.getItem('fenix_neural_brain_active') !== 'false'; } catch { return true; }
  })();
  let init3DNeuralBrain = () => {};
    let neuralBrainWebglRenderer = null;
  const $ = (id) => document.getElementById(id);
  const make = (tag, className, value) => { const element = document.createElement(tag); if (className) element.className = className; if (value !== undefined) element.textContent = String(value ?? ''); return element; };
  const label = (item) => item?.properties?.name || item?.properties?.title || item?.name || item?.id || 'Sem nome';
  const svg = (tag, attrs = {}) => { const element = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value); return element; };
  async function getJson(path) {
    const token = (typeof window.fenixGetAuthToken === 'function')
      ? window.fenixGetAuthToken()
      : (localStorage.getItem('grg_token') || localStorage.getItem('fenix_token') || sessionStorage.getItem('grg_token') || (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] || '');
    const headers = { Accept: 'application/json', ...(token && token !== 'null' ? { Authorization: `Bearer ${token}` } : {}) };
    const response = await fetch(path, { headers, credentials: 'same-origin', signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }
  const isSessionError = (message) => /\b401\b|not authenticated|unauthenticated/i.test(String(message || ''));
  const getMemoryErrorMessage = (message) => isSessionError(message)
    ? 'Sua sessão expirou. Entre novamente para sincronizar a memória.'
    : /\b403\b|forbidden|not authorized/i.test(String(message || ''))
      ? 'Sua conta não tem acesso à memória deste projeto.'
      : 'Não foi possível sincronizar a memória. Tente novamente.';
  function shell() {
    const view = $('view-memory');
    if (!view || view.dataset.liveMemory === 'true') return;
    view.dataset.liveMemory = 'true';
    view.replaceChildren();
    const main = make('main', 'fml-root');
    main.id = 'fenixMemoryOperationalContainer';
    main.innerHTML = `
      <header class="fml-header">
        <div>
          <span class="fml-eyebrow">GRAPH BRAIN · ENTIDADES E RELAÇÕES</span>
          <h1>Memória &amp; Relações</h1>
          <p>Entidades e relações carregadas do Graph Brain. A origem de IA só aparece quando está registrada nos dados.</p>
        </div>
        <div class="fml-header-actions">
          <button type="button" class="fml-button" id="fmlBtnConnectHub" onclick="window.fenixToggleConnectHub()">
            <i class="ph-bold ph-plugs-connected"></i> Como Conectar IAs
          </button>
          <div class="fml-memory-tabs" role="tablist" aria-label="Visões da memória">
            <button type="button" class="fenix-mem-tab-btn active" id="fmlTabGraph" role="tab" aria-selected="true" aria-controls="fmlGraphPanel" tabindex="0" data-tab="graph">Grafo &amp; Camadas</button>
            <button type="button" class="fenix-mem-tab-btn" id="fmlTabSearch" role="tab" aria-selected="false" aria-controls="fmlPersistent" tabindex="-1" data-tab="search">Registros Persistidos</button>
          </div>
          <button id="fmlRefresh" type="button" class="fml-button">↻ Sincronizar</button>
        </div>
      </header>

      <!-- Multi-AI Provider Color Legend Strip (Padrão Vídeo 1 - 1001656590.mp4) -->
      <section class="fml-ai-legend-strip" id="fmlProvenanceStrip" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; padding:8px 14px; background:rgba(15,23,42,0.85); border:1px solid rgba(0,217,255,0.2); border-radius:8px; margin-bottom:10px; font-size:11px;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <span style="font-weight:700; color:#94a3b8; text-transform:uppercase; font-size:10px; letter-spacing:0.5px;">Proveniência registrada</span>
          <span class="fml-ai-legend-entries" id="fmlAiLegendEntries" aria-live="polite">Aguardando proveniência do Graph Brain…</span>
        </div>
        <div style="font-family:var(--fnx-font-mono, monospace); font-size:10.5px; color:#64748b;">
          Arquivos indexados: <strong id="fmlIndexFiles">—</strong> &bull; latência: <strong id="fmlIndexLatency">não informada pela API</strong>
        </div>
      </section>

      <!-- Multi-AI Connector Hub Modal / Drawer -->
      <div id="fmlConnectHubDrawer" style="display:none; padding:16px; background:rgba(8,17,30,0.96); border:1px solid rgba(56,189,248,0.35); border-radius:10px; margin-bottom:12px; box-shadow:0 8px 32px rgba(0,0,0,0.5);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:14px; font-weight:800; color:#38bdf8; display:flex; align-items:center; gap:7px;">
            <i class="ph-bold ph-plugs-connected"></i> Configurar um cliente para acessar a API de memória
          </h3>
          <button type="button" onclick="window.fenixToggleConnectHub()" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer;">&times;</button>
        </div>
        <p style="font-size:12px; color:#cbd5e1; margin-top:0; margin-bottom:12px;">
          Estes exemplos mostram como configurar clientes. Um snippet copiado não comprova conexão ativa; use o estado da API e os registros de proveniência para confirmar integrações:
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px;">
          <div style="background:rgba(15,23,42,0.9); border:1px solid rgba(249,115,22,0.3); border-radius:8px; padding:10px;">
            <strong style="color:#f97316; font-size:12px;">Anthropic / Claude Code</strong>
            <p style="font-size:10px; color:#94a3b8; margin:4px 0 6px;">Adicione ao seu CLAUDE.md ou inicialização:</p>
            <pre style="background:#020617; padding:6px; border-radius:4px; font-size:9.5px; color:#fdba74; overflow-x:auto;"><code>curl -s http://209.50.241.22:4410/api/v2/memory-index/context-pack</code></pre>
          </div>
          <div style="background:rgba(15,23,42,0.9); border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:10px;">
            <strong style="color:#38bdf8; font-size:12px;">OpenAI / Codex App &amp; CLI</strong>
            <p style="font-size:10px; color:#94a3b8; margin:4px 0 6px;">Adicione em ~/.codex/config.toml:</p>
            <pre style="background:#020617; padding:6px; border-radius:4px; font-size:9.5px; color:#7dd3fc; overflow-x:auto;"><code>[mcp_servers.fenix_memory]
url = "http://209.50.241.22:4410/api/v2/mcp"</code></pre>
          </div>
          <div style="background:rgba(15,23,42,0.9); border:1px solid rgba(250,204,21,0.3); border-radius:8px; padding:10px;">
            <strong style="color:#facc15; font-size:12px;">Antigravity / Gemini CLI</strong>
            <p style="font-size:10px; color:#94a3b8; margin:4px 0 6px;">Instrução de sistema nativa:</p>
            <pre style="background:#020617; padding:6px; border-radius:4px; font-size:9.5px; color:#fde047; overflow-x:auto;"><code>Read ACTIVE_PROJECT_MEMORY.md and query /api/v2/memory-index/query</code></pre>
          </div>
          <div style="background:rgba(15,23,42,0.9); border:1px solid rgba(0,217,255,0.3); border-radius:8px; padding:10px;">
            <strong style="color:#00d9ff; font-size:12px;">Cursor &amp; Windsurf IDE</strong>
            <p style="font-size:10px; color:#94a3b8; margin:4px 0 6px;">Adicione ao .cursorrules:</p>
            <pre style="background:#020617; padding:6px; border-radius:4px; font-size:9.5px; color:#67e8f9; overflow-x:auto;"><code>Follow Fênix 5 Golden Rules &amp; sync with ACTIVE_PROJECT_MEMORY.md</code></pre>
          </div>
        </div>
      </div>

      <section id="fmlGraphPanel" class="fml-tab-panel" role="tabpanel" aria-labelledby="fmlTabGraph" tabindex="0">
      <div id="fenixMemoryErrorNotice" class="fml-error-notice" role="alert" aria-live="assertive" hidden>
        <div class="fml-error-copy"><p id="fmlMemoryErrorMessage"></p><details class="fml-error-details"><summary>Detalhes técnicos</summary><pre id="fmlMemoryErrorDetail"></pre></details></div>
        <button type="button" class="fml-button fml-error-action" id="fmlMemoryRetry">Tentar novamente</button>
      </div>
      <div id="fmlStatus" class="fml-status" role="status">Carregando grafo…</div>
      <section id="fenixMemoryLayers" class="fml-layer-strip" aria-label="Camadas de memória" role="group" hidden>
        <button type="button" class="fenix-mem-layer active" data-layer="1" aria-pressed="true" onclick="window.fenixSelectMemoryLayer(1)"><span>L1 Working</span><strong id="fmlLayer1">—</strong></button>
        <button type="button" class="fenix-mem-layer" data-layer="2" aria-pressed="false" onclick="window.fenixSelectMemoryLayer(2)"><span>L2 Episodic</span><strong id="fmlLayer2">—</strong></button>
        <button type="button" class="fenix-mem-layer" data-layer="3" aria-pressed="false" onclick="window.fenixSelectMemoryLayer(3)"><span>L3 Semantic</span><strong id="fmlLayer3">—</strong></button>
        <button type="button" class="fenix-mem-layer" data-layer="4" aria-pressed="false" onclick="window.fenixSelectMemoryLayer(4)"><span>L4 Procedural</span><strong id="fmlLayer4">—</strong></button>
        <button type="button" class="fenix-mem-layer" data-layer="5" aria-pressed="false" onclick="window.fenixSelectMemoryLayer(5)"><span>L5 Graph Brain</span><strong id="fmlLayer5">—</strong></button>
        <button type="button" class="fenix-mem-layer" data-layer="6" aria-pressed="false" onclick="window.fenixSelectMemoryLayer(6)"><span>L6 Evolution</span><strong id="fmlLayer6">—</strong></button>
        <button type="button" class="fenix-mem-layer" data-layer="7" aria-pressed="false" onclick="window.fenixSelectMemoryLayer(7)"><span>L7 Constitutional</span><strong id="fmlLayer7">—</strong></button>
      </section>
      <section class="fml-summary" id="fmlGraphSummary" aria-label="Resumo do grafo" hidden><div><span>Nós</span><strong id="fmlNodesCount">—</strong></div><div><span>Relações</span><strong id="fmlEdgesCount">—</strong></div><div><span>Tipos de nó</span><strong id="fmlTypesCount">—</strong></div><div><span>Vizinhos do nó</span><strong id="fmlSelectedEdges">—</strong></div></section>
      <section class="fml-workspace" id="fmlWorkspace" hidden><aside class="fml-list"><div class="fml-pane-head"><strong>Entidades</strong><span id="fmlVisibleCount">—</span></div><div class="fml-filters"><input id="fmlSearch" type="search" placeholder="Nome, ID ou propriedade" aria-label="Buscar no grafo"><select id="fmlType" aria-label="Filtrar por tipo"><option value="all">Todos os tipos</option></select></div><div id="fmlNodes" class="fml-node-list"></div></aside>
        <div class="fml-network"><div class="fml-pane-head"><strong>Grafo de memória</strong><button type="button" class="fml-view-toggle" id="btnToggle3DNeuralBrain" aria-pressed="true" title="Alternar para o mapa de relações 2D" onclick="window.fenixToggle3DNeuralBrain?.()">Grafo por relações 2D</button></div><div class="fml-network-view"><canvas id="fenixNeuralBrainWebglCanvas" aria-hidden="true" style="display:none"></canvas><canvas id="fenixNeuralBrainCanvas" aria-hidden="true"></canvas><svg id="fmlMap" viewBox="0 0 720 460" role="group" aria-label="Mapa das relações reais do nó selecionado" style="display:none"></svg><span id="fmlCanvasStatus" class="fml-canvas-status" role="status" aria-live="polite"></span></div><p id="fmlMapNote" class="fml-map-note" role="status" aria-live="polite"></p></div>
        <aside class="fml-inspector"><div class="fml-pane-head"><strong>Detalhes</strong><span>Graph Brain</span></div><div id="fmlDetail"></div></aside></section>
      </section>
      <section class="fml-persistent fml-tab-panel" id="fmlPersistent" role="tabpanel" aria-labelledby="fmlTabSearch" tabindex="0" hidden><div><span class="fml-eyebrow">MEMÓRIA PERSISTIDA</span><h2>Buscar registros</h2><p>Resultados da API de memórias do projeto. A contagem do grafo representa entidades, não registros persistidos.</p></div><form id="fmlMemoryForm"><input id="fmlMemoryQuery" type="search" required placeholder="Digite uma expressão para buscar" aria-label="Buscar memórias persistidas"><button type="submit" class="fml-button">Buscar</button></form><div id="fmlMemoryResults" role="status">Carregando registros recentes…</div></section>`;
    view.append(main);
    const tabs = [...main.querySelectorAll('[role="tab"]')];
    tabs.forEach((tab) => tab.addEventListener('click', () => setActiveTab(tab.dataset.tab)));
    main.querySelector('[role="tablist"]')?.addEventListener('keydown', (event) => {
      const current = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
      const nextIndex = event.key === 'ArrowRight' ? (current + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      tabs[nextIndex].focus();
      setActiveTab(tabs[nextIndex].dataset.tab);
    });
    setActiveTab(state.activeTab);
    $('fmlRefresh').addEventListener('click', () => load(true));
    $('fmlMemoryRetry').addEventListener('click', () => {
      if (isSessionError(state.error)) {
        try { sessionStorage.setItem('fenix_return_route', location.hash || '#memory'); } catch (_) {}
        location.replace('/GRG-login');
        return;
      }
      load(true);
    });
    $('fmlSearch').addEventListener('input', (event) => { state.query = event.target.value.trim().toLocaleLowerCase('pt-BR'); renderList(); if (neuralBrainActive) init3DNeuralBrain(); });
    $('fmlType').addEventListener('change', (event) => { state.type = event.target.value; renderList(); if (neuralBrainActive) init3DNeuralBrain(); });
    $('fmlMemoryForm').addEventListener('submit', searchMemories);
    fetchIndexStatus();
  }

  function setActiveTab(tabName) {
    state.activeTab = tabName === 'search' ? 'search' : 'graph';
    const graphActive = state.activeTab === 'graph';
    const graphTab = $('fmlTabGraph');
    const searchTab = $('fmlTabSearch');
    const graphPanel = $('fmlGraphPanel');
    const searchPanel = $('fmlPersistent');
    if (graphTab) { graphTab.classList.toggle('active', graphActive); graphTab.setAttribute('aria-selected', String(graphActive)); graphTab.tabIndex = graphActive ? 0 : -1; }
    if (searchTab) { searchTab.classList.toggle('active', !graphActive); searchTab.setAttribute('aria-selected', String(!graphActive)); searchTab.tabIndex = graphActive ? -1 : 0; }
    if (graphPanel) graphPanel.hidden = !graphActive;
    if (searchPanel) searchPanel.hidden = graphActive;
  }

  async function fetchIndexStatus() {
    try {
      const data = await getJson('/api/v2/memory-index/status');
      if (data.ok && data.status) {
        if ($('fmlIndexFiles')) $('fmlIndexFiles').textContent = String(data.status.totalIndexedFiles ?? '—');
        const latency = Number(data.status.latencyMs);
        if ($('fmlIndexLatency') && Number.isFinite(latency)) $('fmlIndexLatency').textContent = `${latency} ms`;
      }
    } catch (_) {}
  }

  window.fenixToggleConnectHub = () => {
    const el = $('fmlConnectHubDrawer');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };
  function neighbors(id) { return state.edges.filter((edge) => edge.from === id || edge.to === id); }
  function choose(id, fromSync = false) {
    let targetNode = state.nodes.find((item) => item.id === id);
    if (!targetNode && id.includes(':')) {
      const raw = id.split(':')[1];
      targetNode = state.nodes.find((item) => item.id === raw || item.id === id);
    }
    if (!targetNode) return;
    const finalId = targetNode.id;
    state.selected = finalId;
    try { sessionStorage.setItem('fenix_memory_selected_node', finalId); } catch (_) {}
    renderList(); renderMap(); renderDetail();
    if (neuralBrainActive) init3DNeuralBrain();

    if (!fromSync && window.GlobalSelectionStore) {
      const type = targetNode.type === 'AGENT' ? 'agent' : (targetNode.type === 'PROJECT' ? 'project' : (targetNode.type === 'MISSION' ? 'mission' : 'node'));
      window.GlobalSelectionStore.select(type, finalId.replace(/^(agent|project|mission):/, ''), targetNode, 'memory');
    }
  }
  window.fenixSelectMemoryNode = (id) => choose(id, true);
  const memoryTagCatalog = [
    { tag: '#adr', query: 'adr' },
    { tag: '#architecture', query: 'architecture' },
    { tag: '#security', query: 'security' },
    { tag: '#governance', query: 'governance' },
    { tag: '#activation', query: 'activation' },
    { tag: '#checkpoint', query: 'checkpoint' },
    { tag: '#zero-mock', query: 'zero-mock' },
    { tag: '#telemetry', query: 'telemetry' }
  ];

  function renderTagCatalog() {
    let tagStrip = $('fmlTagCatalog');
    if (!tagStrip) {
      const filterPane = document.querySelector('.fml-filters');
      if (filterPane) {
        tagStrip = document.createElement('div');
        tagStrip.id = 'fmlTagCatalog';
        tagStrip.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; margin-bottom:4px; padding:4px 0;';
        filterPane.after(tagStrip);
      }
    }
    if (!tagStrip) return;
    tagStrip.replaceChildren();

    memoryTagCatalog.forEach(t => {
      const count = state.nodes.filter(n => [n.id, n.type, label(n), ...Object.values(n.properties || {})].some(v => String(v ?? '').toLowerCase().includes(t.query))).length;
      const chip = document.createElement('button');
      chip.type = 'button';
      const isActive = state.query === t.query;
      chip.className = `fml-tag-chip${isActive ? ' active' : ''}`;
      chip.style.cssText = `background:${isActive ? 'rgba(0,217,255,0.25)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${isActive ? '#00D9FF' : 'rgba(255,255,255,0.08)'}; color:${isActive ? '#00D9FF' : '#94A3B8'}; border-radius:12px; padding:2px 8px; font-size:10px; cursor:pointer; font-family:var(--fnx-font-mono, monospace); transition:all 0.15s;`;
      chip.textContent = `${t.tag} (${count})`;
      chip.addEventListener('click', () => {
        if (state.query === t.query) {
          state.query = '';
          if ($('fmlSearch')) $('fmlSearch').value = '';
        } else {
          state.query = t.query;
          if ($('fmlSearch')) $('fmlSearch').value = t.query;
        }
        renderList();
        renderTagCatalog();
        if (neuralBrainActive) init3DNeuralBrain();
      });
      tagStrip.appendChild(chip);
    });
  }

  function renderList() {
    renderTagCatalog();
    const target = $('fmlNodes'); if (!target) return;
    target.replaceChildren();
    const filtered = state.nodes.filter((item) => (state.type === 'all' || item.type === state.type) && (!state.query || [item.id, item.type, label(item), ...Object.values(item.properties || {})].some((value) => String(value ?? '').toLocaleLowerCase('pt-BR').includes(state.query))));
    $('fmlVisibleCount').textContent = `${filtered.length} de ${state.nodes.length}`;
    if (!filtered.length) { target.append(make('p', 'fml-empty', state.nodes.length ? 'Nenhum nó corresponde à busca.' : 'Nenhum nó disponível nesta leitura.')); return; }
    for (const item of filtered.slice(0, 100)) {
      const button = make('button', `fml-node${item.id === state.selected ? ' active' : ''}`); button.type = 'button';
      button.append(make('span', 'fml-node-type', item.type || 'SEM TIPO'), make('strong', '', label(item)), make('small', '', item.id));
      button.addEventListener('click', () => choose(item.id)); target.append(button);
    }
    if (filtered.length > 100) target.append(make('p', 'fml-empty', `Mostrando 100 de ${filtered.length}. Refine a busca para encontrar outro nó.`));
  }
  function renderMap() {
    const map = $('fmlMap'); if (!map) return;
    map.replaceChildren();
    const center = state.nodes.find((item) => item.id === state.selected);
    if (!center) { $('fmlMapNote').textContent = 'Selecione uma entidade para ver as relações.'; return; }
    const links = neighbors(center.id);
    const groups = window.FenixMemoryBrainLayout?.groupNeighborRelations(links, center.id)
      || [...new Set(links.map((edge) => edge.from === center.id ? edge.to : edge.from))].map((id) => ({ id }));
    $('fmlSelectedEdges').textContent = String(groups.length);
    const byId = new Map(state.nodes.map((item) => [item.id, item]));
    const visible = groups.map((neighbor) => ({ neighbor, item: byId.get(neighbor.id) })).filter(({ item }) => item).slice(0, 14);
    const colors = { PROJECT: '#55e6c1', API: '#67c7ff', ERROR: '#ff958e', FIX: '#b69aff', TASK: '#ffd18a', JOB: '#ffc089', PAGE: '#8ecbff', COMPONENT: '#b3dfff' };
    visible.forEach(({ neighbor, item }, index) => {
      const angle = (index / Math.max(visible.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const x = 360 + Math.cos(angle) * 255, y = 230 + Math.sin(angle) * 170;
      map.append(svg('line', { x1: 360, y1: 230, x2: x, y2: y, stroke: '#3a7186', 'stroke-width': 1.5, 'stroke-dasharray': '4 5' }));
      const nodeGroup = svg('g', { class: 'fml-map-node', tabindex: '0', role: 'button', 'aria-label': `Selecionar ${label(item)}` });
      nodeGroup.append(svg('circle', { cx: x, cy: y, r: 25, fill: '#102b3e', stroke: colors[item.type] || '#82a9d3', 'stroke-width': 2 }));
      const name = svg('text', { x, y: y + 40, 'text-anchor': 'middle', fill: '#dceefa', 'font-size': 11 }); name.textContent = label(item).slice(0, 19); nodeGroup.append(name);
      const title = svg('title'); title.textContent = `${label(item)} · ${neighbor.count || 1} registro(s)${neighbor.types?.length ? ` · ${neighbor.types.join(', ')}` : ''}`; nodeGroup.append(title);
      nodeGroup.addEventListener('click', () => choose(item.id)); nodeGroup.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(item.id); } }); map.append(nodeGroup);
    });
    map.append(svg('circle', { cx: 360, cy: 230, r: 43, fill: '#123b49', stroke: colors[center.type] || '#63e0ca', 'stroke-width': 3 }));
    const main = svg('text', { x: 360, y: 235, 'text-anchor': 'middle', fill: '#f5fffc', 'font-size': 12, 'font-weight': 700 }); main.textContent = label(center).slice(0, 18); map.append(main);
    $('fmlMapNote').textContent = links.length ? `${links.length} registros de relação · ${groups.length} entidades vizinhas · ${visible.length} no mapa` : 'Este nó não possui relações registradas.';
  }
  function renderDetail() {
    const target = $('fmlDetail'); if (!target) return; target.replaceChildren();
    const item = state.nodes.find((entry) => entry.id === state.selected);
    if (!item) { target.append(make('p', 'fml-empty', 'Selecione uma entidade.')); return; }

    const card = make('div', 'fml-decision-card');
    card.style.cssText = 'background:rgba(15,23,42,0.92); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px; box-shadow:0 8px 24px rgba(0,0,0,0.6);';

    const badgeRow = make('div', 'fml-card-badge-row');
    badgeRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
    const badge = make('span', 'fml-card-badge', item.type || 'NÓ REGISTRADO');
    badge.style.cssText = 'font-size:9.5px; font-weight:800; color:#00E5A0; background:rgba(0,229,160,0.12); border:1px solid rgba(0,229,160,0.3); padding:2px 8px; border-radius:10px; text-transform:uppercase;';
    const statusPill = make('span', 'fml-card-status', '● VERIFICADO');
    statusPill.style.cssText = 'font-size:9.5px; font-weight:700; color:#38BDF8; font-family:var(--fnx-font-mono, monospace);';
    badgeRow.append(badge, statusPill);
    card.append(badgeRow);

    const title = make('h2', '', label(item));
    title.style.cssText = 'font-size:14px; font-weight:700; color:#F8FAFC; margin:0; line-height:1.3;';
    card.append(title);

    const idLabel = make('p', 'fml-detail-id', item.id);
    idLabel.style.cssText = 'font-size:10px; color:#94A3B8; font-family:var(--fnx-font-mono, monospace); margin:0;';
    card.append(idLabel);

    const properties = make('dl', 'fml-properties');
    for (const [key, value] of Object.entries(item.properties || {})) {
      properties.append(make('dt', '', key), make('dd', '', typeof value === 'object' ? JSON.stringify(value) : value));
    }
    if (properties.children.length) card.append(properties);

    const relations = neighbors(item.id);
    const groups = window.FenixMemoryBrainLayout?.groupNeighborRelations(relations, item.id) || [];
    const relHead = make('h3', '', `Relações e Vizinhos (${groups.length}) · ${relations.length} conexões`);
    relHead.style.cssText = 'font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; margin:6px 0 2px;';
    card.append(relHead);

    const relList = make('div', 'fml-relations-list');
    relList.style.cssText = 'display:flex; flex-direction:column; gap:4px; max-height:130px; overflow-y:auto;';
    for (const group of groups.slice(0, 15)) {
      const button = make('button', 'fml-relation', `${group.types?.join(' / ') || 'RELACIONADO'} · ${group.id}`);
      button.type = 'button';
      button.title = `${group.count} registro(s) de relação`;
      button.addEventListener('click', () => choose(group.id));
      relList.append(button);
    }
    card.append(relList);

    // Terminal Commands
    const cmdBlock = make('div', 'fml-card-commands');
    cmdBlock.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; margin-bottom:4px;"><span style="font-size:9.5px; font-weight:700; color:#38BDF8; text-transform:uppercase;">Comandos no Runtime</span><button type="button" style="background:none; border:none; color:#00E5A0; font-size:10px; cursor:pointer; font-weight:700;" onclick="navigator.clipboard?.writeText('node grg/test/architecture-guard.test.js')">Copiar</button></div><pre style="background:#040711; border:1px solid rgba(56,189,248,0.2); border-radius:6px; padding:6px 8px; font-size:9.5px; color:#38BDF8; font-family:var(--fnx-font-mono, monospace); margin:0;"><code>node grg/test/architecture-guard.test.js</code></pre>`;
    card.append(cmdBlock);

    target.append(card);
  }

  function showMemoryDetail(detail) {
    const target = $('fmlDetail');
    if (!target) return;
    target.replaceChildren();

    const card = make('div', 'fml-decision-card');
    card.style.cssText = 'background:rgba(15,23,42,0.92); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px; box-shadow:0 8px 24px rgba(0,0,0,0.6);';

    // Header badge
    const badgeRow = make('div', 'fml-card-badge-row');
    badgeRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
    const badge = make('span', 'fml-card-badge', detail.type || 'DECISÃO ARQUITETURAL · AUDITADA');
    badge.style.cssText = 'font-size:9.5px; font-weight:800; color:#00E5A0; background:rgba(0,229,160,0.12); border:1px solid rgba(0,229,160,0.3); padding:2px 8px; border-radius:10px; letter-spacing:0.5px; text-transform:uppercase;';
    const statusPill = make('span', 'fml-card-status', '● CONSTITUCIONAL');
    statusPill.style.cssText = 'font-size:9.5px; font-weight:700; color:#38BDF8; font-family:var(--fnx-font-mono, monospace);';
    badgeRow.append(badge, statusPill);
    card.append(badgeRow);

    // Title
    const title = make('h2', '', detail.title || 'Detalhes da Decisão');
    title.style.cssText = 'font-size:14px; font-weight:700; color:#F8FAFC; margin:0; line-height:1.3;';
    card.append(title);

    // Metadata Strip
    const metaStrip = make('div', 'fml-card-meta');
    metaStrip.style.cssText = 'display:flex; gap:10px; font-size:10px; color:#94A3B8; font-family:var(--fnx-font-mono, monospace); border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;';
    metaStrip.innerHTML = `<span>ID: <strong style="color:#CBD5E1;">${detail.id || 'sec-active'}</strong></span><span>Origem: <strong style="color:#38BDF8;">${detail.origin || 'ACTIVE_PROJECT_MEMORY.md'}</strong></span>`;
    card.append(metaStrip);

    // Context & Summary
    if (detail.summary) {
      const summaryBlock = make('div', 'fml-card-summary');
      summaryBlock.innerHTML = `<span style="font-size:10px; font-weight:700; color:#C084FC; text-transform:uppercase; display:block; margin-bottom:3px;">Contexto &amp; Desafio</span><p style="font-size:11px; color:#CBD5E1; line-height:1.45; margin:0;">${detail.summary}</p>`;
      card.append(summaryBlock);
    }

    // Technical Decision / Solution
    const decisionText = detail.content || detail.summary || 'Decisão arquitetural registrada na Memória Ativa Oficial com conformidade às 5 Regras de Ouro.';
    const decisionBlock = make('div', 'fml-card-decision');
    decisionBlock.innerHTML = `<span style="font-size:10px; font-weight:700; color:#00E5A0; text-transform:uppercase; display:block; margin-bottom:3px;">Decisão Técnica &amp; Lição Aprendida</span><div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px 10px; font-size:11px; color:#E2E8F0; line-height:1.4;">${decisionText.slice(0, 300)}${decisionText.length > 300 ? '…' : ''}</div>`;
    card.append(decisionBlock);

    // Terminal Commands & Verification
    const cmdBlock = make('div', 'fml-card-commands');
    cmdBlock.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"><span style="font-size:10px; font-weight:700; color:#38BDF8; text-transform:uppercase;">Comandos de Verificação &amp; Prova</span><button type="button" style="background:none; border:none; color:#00E5A0; font-size:10px; cursor:pointer; font-weight:700;" onclick="navigator.clipboard?.writeText('node grg/test/architecture-guard.test.js')">Copiar</button></div><pre style="background:#040711; border:1px solid rgba(56,189,248,0.2); border-radius:6px; padding:6px 10px; font-size:10px; color:#38BDF8; font-family:var(--fnx-font-mono, monospace); margin:0; overflow-x:auto;"><code>node grg/test/architecture-guard.test.js
node grg/test/frontend-honesty.test.js</code></pre>`;
    card.append(cmdBlock);

    target.append(card);
    if (state.activeTab !== 'graph') {
      setActiveTab('graph');
    }
  }

  function render() {
    shell();
    renderProvenanceLegend();
    const totalNodes = state.stats?.totalNodes ?? state.nodes.length;
    const totalEdges = state.stats?.totalEdges ?? state.edges.length;
    $('fmlNodesCount').textContent = totalNodes ? String(totalNodes) : state.measuredAt ? '0' : '—';
    $('fmlEdgesCount').textContent = state.measuredAt ? String(totalEdges) : '—';
    const types = [...new Set(state.nodes.map((item) => item.type).filter(Boolean))].sort();
    $('fmlTypesCount').textContent = state.measuredAt ? String(types.length) : '—';
    if (state.measuredAt) {
      const nt = state.stats?.nodeTypes || {};
      const byT = (k) => nt[k] ?? state.nodes.filter((n) => n.type === k).length;
      if ($('fmlLayer1')) $('fmlLayer1').textContent = String((byT('TASK') || 0) + (byT('JOB') || 0));
      if ($('fmlLayer2')) $('fmlLayer2').textContent = String((byT('ERROR') || 0) + (byT('FIX') || 0));
      if ($('fmlLayer3')) $('fmlLayer3').textContent = String((byT('PROJECT') || 0) + (byT('PAGE') || 0) + (byT('COMPONENT') || 0));
      if ($('fmlLayer4')) $('fmlLayer4').textContent = String((byT('API') || 0) + (byT('SERVICE') || 0));
      if ($('fmlLayer5')) $('fmlLayer5').textContent = String(totalNodes);
      if ($('fmlLayer6')) $('fmlLayer6').textContent = String(totalEdges);
      if ($('fmlLayer7')) $('fmlLayer7').textContent = String(types.length);
    }
    const errNotice = $('fenixMemoryErrorNotice');
    if (errNotice) {
      errNotice.hidden = !state.error;
      if (state.error) {
        const sessionError = isSessionError(state.error);
        $('fmlMemoryErrorMessage').textContent = getMemoryErrorMessage(state.error);
        $('fmlMemoryErrorDetail').textContent = state.error;
        $('fmlMemoryRetry').textContent = sessionError ? 'Entrar novamente' : 'Tentar novamente';
        errNotice.dataset.kind = sessionError ? 'session' : 'runtime';
      } else {
        errNotice.removeAttribute('data-kind');
      }
    }
    const select = $('fmlType'); const value = state.type; select.replaceChildren(new Option('Todos os tipos', 'all'));
    for (const type of types) select.add(new Option(`${type} · ${state.nodes.filter((item) => item.type === type).length}`, type)); select.value = value;
    const status = $('fmlStatus'); status.hidden = Boolean(state.error); status.textContent = state.loading ? 'Sincronizando Graph Brain…' : state.error ? '' : state.measuredAt ? `Medido às ${new Date(state.measuredAt).toLocaleTimeString('pt-BR')} · fonte: /api/v2/graph/data (${state.nodes.length}/${totalNodes} nós carregados)` : 'Aguardando dados'; status.dataset.error = String(Boolean(state.error));
    const graphMeasured = Boolean(state.measuredAt);
    $('fenixMemoryLayers').hidden = !graphMeasured;
    $('fmlGraphSummary').hidden = !graphMeasured;
    $('fmlWorkspace').hidden = !graphMeasured;
    renderList(); renderMap(); renderDetail();
  }

  function renderProvenanceLegend() {
    const strip = $('fmlProvenanceStrip');
    if (strip) strip.style.display = state.measuredAt ? 'flex' : 'none';
    const target = $('fmlAiLegendEntries');
    if (!target) return;
    target.replaceChildren();
    const summary = window.FenixMemoryProvenance?.summarize(state.nodes) || [];
    if (!summary.length) {
      target.append(make('span', 'fml-ai-badge', state.measuredAt ? 'Origem não informada · cor por tipo de entidade' : 'Aguardando proveniência do Graph Brain…'));
      return;
    }
    for (const item of summary) {
      const badge = make('span', 'fml-ai-badge');
      const dot = make('span', 'fml-ai-legend-dot');
      dot.style.backgroundColor = item.color;
      badge.append(dot, document.createTextNode(`${item.label} · ${item.count}`));
      target.append(badge);
    }
  }
  async function renderInitialMemories() {
    const target = $('fmlMemoryResults');
    if (!target || target.dataset.searched === 'true') return;
    target.innerHTML = '<div style="color:var(--text3); font-size:12px; padding:8px 0;">Carregando seções da Memória Ativa viva…</div>';
    try {
      const res = await getJson('/api/v2/memory-index/active-memory');
      if (target.dataset.searched === 'true') return;
      target.replaceChildren();
      const sections = res?.activeMemory?.sections || [];
      if (!sections.length) {
        target.innerHTML = '<div style="color:var(--text3); font-size:12px;">Nenhuma seção ativa indexada. Use a busca acima para consultar memórias persistidas.</div>';
        return;
      }

      const head = make('div', 'fml-active-head');
      head.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.06);';
      head.innerHTML = `<span style="font-size:12px; font-weight:700; color:var(--accent);">Memória Ativa Oficial (SSOT)</span><span style="font-size:11px; color:var(--text3); font-family:monospace;">${sections.length} seções indexadas</span>`;
      target.append(head);

      const list = make('div', 'fml-active-list');
      list.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
      target.append(list);

      for (const sec of sections.slice(0, 30)) {
        const card = make('article', 'fml-memory-result');
        card.style.cssText = 'background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px 12px; cursor:pointer;';
        const title = make('strong', '', sec.title || 'Seção');
        title.style.cssText = 'color:#F8FAFC; font-size:12px; display:block; margin-bottom:4px;';
        card.append(title);

        const meta = make('small', '', `${sec.id} · ${sec.lineCount || 0} linhas · nível ${sec.level || 1}`);
        meta.style.cssText = 'color:var(--accent); font-family:monospace; font-size:10px; display:block; margin-bottom:6px;';
        card.append(meta);

        const summary = make('p', '', (sec.summary || 'Sem resumo disponível.').slice(0, 180) + (sec.summary && sec.summary.length > 180 ? '…' : ''));
        summary.style.cssText = 'color:var(--text2); font-size:11px; line-height:1.4; margin:0;';
        card.append(summary);

        card.addEventListener('click', () => {
          showMemoryDetail({
            type: 'SEÇÃO ATIVA',
            title: sec.title || 'Seção',
            id: sec.id || 'sec-active',
            origin: 'ACTIVE_PROJECT_MEMORY.md',
            lineCount: sec.lineCount,
            summary: sec.summary,
            content: sec.summary || sec.title
          });
        });

        list.append(card);
      }
    } catch (e) {
      if (target.dataset.searched === 'true') return;
      target.innerHTML = `<div style="color:var(--text3); font-size:12px;">Índice ativo em standby. Use a busca acima para consultar memórias persistidas.</div>`;
    }
  }
  function load(force = false) {
    shell(); if (state.loading) return state.loading; if (state.measuredAt && !force) { render(); return Promise.resolve(); }
    state.error = null;
    state.loading = getJson('/api/v2/graph/data?full=true').then((data) => {
      state.nodes = Array.isArray(data.nodes) ? data.nodes : []; state.edges = Array.isArray(data.edges) ? data.edges : [];
      state.stats = data.stats || null;
      state.measuredAt = new Date().toISOString();
      const saved = (() => { try { return sessionStorage.getItem('fenix_memory_selected_node'); } catch (_) { return null; } })();
      state.selected = state.nodes.find((item) => item.id === state.selected)?.id || state.nodes.find((item) => item.id === saved)?.id || state.nodes.find((item) => item.id === 'project:fenix-os')?.id || state.nodes[0]?.id || null;
      renderInitialMemories();
    }).catch((error) => { state.error = error.message; }).finally(() => { state.loading = null; render(); if (neuralBrainActive) init3DNeuralBrain(); });
    render(); return state.loading;
  }
  async function searchMemories(event) {
    event.preventDefault(); const target = $('fmlMemoryResults'); const q = $('fmlMemoryQuery').value.trim(); if (!q) return;
    target.dataset.searched = 'true';
    target.textContent = 'Consultando memórias persistidas…';
    try {
      const data = await getJson(`/api/memories/search?q=${encodeURIComponent(q)}&limit=20`);
      const results = Array.isArray(data.results) ? data.results : [];
      target.replaceChildren();
      if (!results.length) { target.append(make('p', 'fml-empty', 'Nenhuma memória encontrada para esta busca.')); return; }
      target.append(make('p', 'fml-memory-count', `${results.length} resultado(s)${Number.isFinite(data.totalCandidates) ? ` · ${data.totalCandidates} candidatos examinados` : ''}`));
      for (const item of results) {
        const memory = item.memory || item;
        const card = make('article', 'fml-memory-result');
        card.append(make('strong', '', memory.title || memory.summary || memory.key || memory.id || 'Memória'));
        card.append(make('small', '', `${memory.kind || 'tipo não informado'} · ${memory.createdAt && !Number.isNaN(Date.parse(memory.createdAt)) ? new Date(memory.createdAt).toLocaleString('pt-BR') : 'data não informada'}`));
        card.append(make('p', '', memory.content || memory.text || (memory.value == null ? 'Conteúdo não disponível nesta resposta.' : typeof memory.value === 'object' ? JSON.stringify(memory.value) : memory.value)));
        target.append(card);
      }
    } catch (error) { target.textContent = `Busca indisponível: ${error.message}`; }
  }
  let installed = false;
  const install = () => {
    if (installed) return;
    installed = true;
    window.loadMemoryView = load;
    window.fenixSyncMemoryGraph = load;
    window.fenixMountMemoryView = () => load();
    window.fenixSelectMemoryCluster = () => {};
    window.fenixSelectMemoryLayer = (layerIdx) => {
      document.querySelectorAll('.fenix-mem-layer').forEach((el) => {
        const isMatch = el.getAttribute('data-layer') === String(layerIdx);
        el.classList.toggle('active', isMatch);
        el.setAttribute('aria-pressed', String(isMatch));
      });
      const layerTypeMap = { 1: 'TASK', 2: 'ERROR', 3: 'PROJECT', 4: 'API', 5: 'all', 6: 'all', 7: 'all' };
      const mapped = layerTypeMap[Number(layerIdx)] || 'all';
      if ($('fmlType')) {
        state.type = mapped === 'all' || Array.from($('fmlType').options).some((o) => o.value === mapped) ? mapped : 'all';
        $('fmlType').value = state.type;
        renderList();
        if (neuralBrainActive) init3DNeuralBrain();
      }
      console.log('[FENIX] Memory layer selected:', layerIdx);
    };

    // ── 3D Neural Brain Constellation (Video 5 Pattern) ──
    let neuralBrainReq = null;
    let neuralBrainRenderer = null;
    let neuralBrainHitTargets = [];
    let neuralBrainPixelRatio = 1;
    let neuralBrainSize = { width: 700, height: 420 };
    let neuralBrainResizeObserver = null;
    const brainRotation = { x: 0.2, y: 0, zoom: 1, dragging: false, moved: false, pointerX: 0, pointerY: 0 };
    const scheduleBrainRender = () => {
      if (!neuralBrainActive || neuralBrainReq !== null || typeof neuralBrainRenderer !== 'function') return;
      neuralBrainReq = requestAnimationFrame(() => {
        neuralBrainReq = null;
        neuralBrainRenderer?.();
      });
    };
  const nodeColor = (item) => {
    const origin = window.FenixMemoryProvenance?.resolve(item);
    if (origin?.key) return origin.color;
    const typeColors = { PROJECT: '#4de8d0', AGENT: '#8b7bff', TASK: '#ffb84d', JOB: '#ff8d68', MEMORY: '#d76cff', PAGE: '#58b8ff', PATTERN: '#a78bfa', COMPONENT: '#61d8ff', SERVICE: '#ff7db8', API: '#52dfac', ERROR: '#ff6f83', FIX: '#f5d45b' };
    return typeColors[String(item?.type || '').toUpperCase()] || '#89a8ff';
  };
    init3DNeuralBrain = function init3DNeuralBrain() {
      const fallbackCanvas = document.getElementById('fenixNeuralBrainCanvas');
      const canvas = fallbackCanvas;
      const webglCanvas = document.getElementById('fenixNeuralBrainWebglCanvas');
    const svg = document.getElementById('fmlMap');
      const btn = document.getElementById('btnToggle3DNeuralBrain');
      if (!canvas) return;
      if (neuralBrainReq) cancelAnimationFrame(neuralBrainReq);
      neuralBrainReq = null;
      neuralBrainRenderer = null;

      if (canvas.parentElement) {
        const bounds = canvas.parentElement.getBoundingClientRect();
        neuralBrainSize = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
        neuralBrainPixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        if (neuralBrainWebglRenderer) neuralBrainWebglRenderer.resize(neuralBrainSize.width, neuralBrainSize.height, neuralBrainPixelRatio);
        else {
          canvas.width = Math.round(neuralBrainSize.width * neuralBrainPixelRatio);
          canvas.height = Math.round(neuralBrainSize.height * neuralBrainPixelRatio);
        }
      }
      canvas.style.display = 'block';
      if (svg) svg.style.display = 'none';
      if (btn) btn.innerHTML = '<i class="ph-bold ph-graph"></i> Grafo 2D';

      let webglAvailable = Boolean(webglCanvas && window.FenixMemoryBrainWebGL && window.THREE?.WebGLRenderer);
      if (webglAvailable) {
        try { neuralBrainWebglRenderer ||= window.FenixMemoryBrainWebGL.create(webglCanvas); }
        catch (_) { neuralBrainWebglRenderer = null; webglAvailable = false; }
        if (!neuralBrainWebglRenderer) webglAvailable = false;
      }
      canvas.style.display = 'block';
      canvas.style.zIndex = '2';
      if (webglCanvas) {
        webglCanvas.style.display = webglAvailable ? 'block' : 'none';
        webglCanvas.style.zIndex = '1';
        webglCanvas.style.pointerEvents = 'none';
      }
      const ctx = webglAvailable ? null : canvas.getContext('2d');
      if (!ctx && !webglAvailable) return;
      ctx?.setTransform(neuralBrainPixelRatio, 0, 0, neuralBrainPixelRatio, 0, 0);

      const matchingNodes = state.nodes.filter((item) => state.type === 'all' || item.type === state.type)
        .filter((item) => !state.query || [item.id, item.type, label(item), ...Object.values(item.properties || {})].some((value) => String(value ?? '').toLocaleLowerCase('pt-BR').includes(state.query)))
      // The measured VPS graph has 2,828 entities; fit it completely on desktop while keeping mobile/tablet budgets bounded.
      const nodeBudget = webglAvailable ? (canvas.clientWidth < 520 ? 700 : (canvas.clientWidth < 640 ? 1400 : 4000)) : 500;
      const sourceNodes = window.FenixMemoryBrainLayout?.selectVisibleNodes
        ? window.FenixMemoryBrainLayout.selectVisibleNodes(matchingNodes, state.edges, state.selected, nodeBudget)
        : matchingNodes.slice(0, nodeBudget);
      const nodeIds = new Set(sourceNodes.map((item) => item.id));
      const createBrainPosition = window.FenixMemoryBrainLayout?.createBrainPosition;
      if (typeof createBrainPosition !== 'function') {
        if (ctx) {
          ctx.clearRect(0, 0, neuralBrainSize.width, neuralBrainSize.height);
          ctx.fillStyle = '#ffb4a8'; ctx.font = '14px system-ui'; ctx.textAlign = 'center';
          ctx.fillText('Layout 3D da memória indisponível', neuralBrainSize.width / 2, neuralBrainSize.height / 2);
        } else if ($('fmlCanvasStatus')) $('fmlCanvasStatus').textContent = 'Layout do Graph Brain indisponível';
        return;
      }
      const positions = new Map(sourceNodes.map((item) => [
        item.id,
        { ...createBrainPosition(item.id), item }
      ]));
      const links = state.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
      const graphSummary = window.FenixMemoryBrainLayout?.summarizeConnections(sourceNodes, links, state.selected)
        || { isolatedCount: 0, selectedRelationCount: 0, selectedNeighborIds: [] };
      const visualLinks = window.FenixMemoryBrainLayout?.uniqueVisualRelations(sourceNodes, links) || links;
      const prioritizedLinks = window.FenixMemoryBrainLayout?.selectVisibleRelations(sourceNodes, links, state.selected, 2400)
        || visualLinks.slice(0, 2400);
      const selectedNeighbors = new Set(prioritizedLinks.flatMap((edge) => edge.from === state.selected ? [edge.to] : edge.to === state.selected ? [edge.from] : []));
      if (!sourceNodes.length) {
        if (ctx) {
          ctx.clearRect(0, 0, neuralBrainSize.width, neuralBrainSize.height);
          ctx.fillStyle = '#94a3b8'; ctx.font = '14px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(state.error ? 'Graph Brain indisponível' : 'Nenhum nó real corresponde aos filtros', neuralBrainSize.width / 2, neuralBrainSize.height / 2);
        } else if ($('fmlCanvasStatus')) {
          $('fmlCanvasStatus').textContent = state.error ? 'Graph Brain indisponível' : 'Nenhuma entidade corresponde aos filtros';
          neuralBrainWebglRenderer?.setGraph([], [], null, new Set(), nodeColor);
          neuralBrainHitTargets = neuralBrainWebglRenderer?.render(brainRotation, brainRotation.zoom) || [];
        }
        return;
      }

      if (webglAvailable) {
        const summary = $('fmlCanvasStatus');
        try {
          neuralBrainWebglRenderer.resize(neuralBrainSize.width, neuralBrainSize.height, neuralBrainPixelRatio);
          neuralBrainWebglRenderer.setGraph([...positions.values()], prioritizedLinks, state.selected, selectedNeighbors, nodeColor);
          neuralBrainRenderer = () => {
            if (!neuralBrainActive) return;
            neuralBrainHitTargets = neuralBrainWebglRenderer.render(brainRotation, brainRotation.zoom);
            const totalRelations = state.stats?.totalEdges ?? state.edges.length;
            const selectedNode = state.nodes.find((item) => item.id === state.selected);
            summary.textContent = `${sourceNodes.length}/${state.nodes.length} entidades · ${prioritizedLinks.length}/${visualLinks.length} ligações visuais · ${totalRelations} registros de relação · seleção ${selectedNode ? label(selectedNode) : 'nenhuma'}`;
          };
          neuralBrainRenderer();
          return;
        } catch (error) {
          if (summary) summary.textContent = `Renderer 3D indisponível · ${error.message}`;
          return;
        }
      }

      function render3D() {
        if (!neuralBrainActive) return;

        const { width: w, height: h } = neuralBrainSize;
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h / 2;
        const focal = 340 * brainRotation.zoom;

        // Soft hemispheric light is a spatial guide only; every plotted point below is a real graph entity.
        const aura = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.min(w, h) * 0.46);
        aura.addColorStop(0, 'rgba(117, 57, 255, 0.16)');
        aura.addColorStop(0.42, 'rgba(26, 166, 240, 0.10)');
        aura.addColorStop(1, 'rgba(5, 14, 32, 0)');
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, w, h);

        const projected = [...positions.values()].map(p => {
          const cosY = Math.cos(brainRotation.y), sinY = Math.sin(brainRotation.y);
          let x1 = p.x * cosY + p.z * sinY;
          let z1 = -p.x * sinY + p.z * cosY;
          const cosX = Math.cos(brainRotation.x), sinX = Math.sin(brainRotation.x);
          let y2 = p.y * cosX - z1 * sinX;
          let z2 = p.y * sinX + z1 * cosX;
          const scale = focal / (focal + z2);
          return { sx: cx + x1 * scale, sy: cy + y2 * scale, scale, z: z2, p };
        });
        const projectedById = new Map(projected.map((point) => [point.p.item.id, point]));
        for (const edge of prioritizedLinks) {
          const from = projectedById.get(edge.from), to = projectedById.get(edge.to);
          if (!from || !to) continue;
          const touchesSelected = edge.from === state.selected || edge.to === state.selected;
          ctx.lineWidth = touchesSelected ? 1.8 : 0.65;
          ctx.strokeStyle = touchesSelected ? 'rgba(110, 231, 220, 0.92)' : 'rgba(101, 164, 255, 0.34)';
          ctx.beginPath(); ctx.moveTo(from.sx, from.sy); ctx.lineTo(to.sx, to.sy); ctx.stroke();
        }

        neuralBrainHitTargets = [];
        for (const pt of projected.sort((a, b) => b.z - a.z)) {
          const selected = pt.p.item.id === state.selected;
          const connectedToSelection = selected || selectedNeighbors.has(pt.p.item.id);
          ctx.globalAlpha = state.selected && !connectedToSelection ? 0.42 : 1;
          const color = nodeColor(pt.p.item);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = selected ? 22 : (pt.z > 0 ? 8 : 3);
          ctx.beginPath();
          const radius = (selected ? 6 : 3.2) * pt.scale;
          ctx.arc(pt.sx, pt.sy, Math.max(1.6, radius), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          if (selected || (state.selected && connectedToSelection)) {
            ctx.strokeStyle = selected ? '#fff' : 'rgba(210, 255, 248, 0.8)';
            ctx.lineWidth = selected ? 1.5 : 0.8;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          neuralBrainHitTargets.push({ id: pt.p.item.id, x: pt.sx, y: pt.sy, radius: Math.max(7, radius + 3) });
        }
        ctx.fillStyle = 'rgba(210,230,245,.8)'; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
        ctx.fillText(`${sourceNodes.length}/${state.nodes.length} nós · ${graphSummary.relationCount} relações registradas · ${prioritizedLinks.length} conexões visuais`, 14, 18, Math.max(60, w - 28));
        if (state.selected) {
          const selectedNode = state.nodes.find((item) => item.id === state.selected);
          const selectionText = selectedNode
            ? `Selecionado: ${label(selectedNode).slice(0, 42)} · ${graphSummary.selectedNeighborIds.length} vizinho(s) · ${graphSummary.selectedRelationCount} registros`
            : 'Selecione um ponto para inspecionar as relações reais';
          ctx.fillStyle = 'rgba(210,230,245,.65)'; ctx.fillText(selectionText, 14, 36, Math.max(60, w - 28));
        }

      }

      neuralBrainRenderer = render3D;
      render3D();
    };
    const brainCanvas = document.getElementById('fenixNeuralBrainCanvas');
    if (brainCanvas && !brainCanvas.dataset.graphClickBound) {
      brainCanvas.dataset.graphClickBound = 'true';
      brainCanvas.style.cursor = 'grab';
      if (typeof ResizeObserver === 'function' && brainCanvas.parentElement) {
        neuralBrainResizeObserver = new ResizeObserver(() => {
          const bounds = brainCanvas.parentElement.getBoundingClientRect();
          const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
          const width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
          if (width === neuralBrainSize.width && height === neuralBrainSize.height && pixelRatio === neuralBrainPixelRatio) return;
          neuralBrainSize = { width, height };
          neuralBrainPixelRatio = pixelRatio;
          if (neuralBrainWebglRenderer) neuralBrainWebglRenderer.resize(width, height, pixelRatio);
          else {
            brainCanvas.width = Math.round(width * pixelRatio);
            brainCanvas.height = Math.round(height * pixelRatio);
            brainCanvas.getContext('2d')?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          }
          scheduleBrainRender();
        });
        neuralBrainResizeObserver.observe(brainCanvas.parentElement);
      }
      brainCanvas.addEventListener('pointerdown', (event) => {
        brainRotation.dragging = true; brainRotation.moved = false; brainRotation.pointerX = event.clientX; brainRotation.pointerY = event.clientY;
        brainCanvas.setPointerCapture(event.pointerId); brainCanvas.style.cursor = 'grabbing';
      });
      brainCanvas.addEventListener('pointermove', (event) => {
        if (!brainRotation.dragging) return;
        if (Math.hypot(event.clientX - brainRotation.pointerX, event.clientY - brainRotation.pointerY) > 4) brainRotation.moved = true;
        brainRotation.y += (event.clientX - brainRotation.pointerX) * 0.008;
        brainRotation.x = Math.max(-1.1, Math.min(1.1, brainRotation.x + (event.clientY - brainRotation.pointerY) * 0.008));
        brainRotation.pointerX = event.clientX; brainRotation.pointerY = event.clientY;
        scheduleBrainRender();
      });
      brainCanvas.addEventListener('wheel', (event) => {
        brainRotation.zoom = Math.max(0.72, Math.min(1.65, brainRotation.zoom * (event.deltaY < 0 ? 1.08 : 0.93)));
        scheduleBrainRender();
      }, { passive: true });
      const stopBrainDrag = () => { brainRotation.dragging = false; brainCanvas.style.cursor = 'grab'; };
      brainCanvas.addEventListener('pointerup', stopBrainDrag);
      brainCanvas.addEventListener('pointercancel', stopBrainDrag);
      brainCanvas.addEventListener('click', (event) => {
        if (brainRotation.moved) { brainRotation.moved = false; return; }
        const rect = brainCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const hit = neuralBrainHitTargets.map((point) => ({ ...point, distance: Math.hypot(point.x - x, point.y - y) }))
          .filter((point) => point.distance <= point.radius).sort((a, b) => a.distance - b.distance)[0];
        if (hit) choose(hit.id);
      });
    }

    window.fenixToggle3DNeuralBrain = function() {
      const canvas = document.getElementById('fenixNeuralBrainCanvas');
      const webglCanvas = document.getElementById('fenixNeuralBrainWebglCanvas');
      const svg = document.getElementById('fmlMap');
      const btn = document.getElementById('btnToggle3DNeuralBrain');
      if (!canvas) return;
      neuralBrainActive = !neuralBrainActive;
      try { localStorage.setItem('fenix_neural_brain_active', String(neuralBrainActive)); } catch (_) {}
      if (neuralBrainActive) {
        canvas.style.display = 'block';
        if (webglCanvas) webglCanvas.style.display = neuralBrainWebglRenderer ? 'block' : 'none';
        if (svg) svg.style.display = 'none';
        if (btn) { btn.textContent = 'Grafo por relações 2D'; btn.setAttribute('aria-pressed', 'true'); btn.title = 'Alternar para o mapa de relações 2D'; }
        init3DNeuralBrain();
      } else {
        canvas.style.display = 'none';
        if (webglCanvas) webglCanvas.style.display = 'none';
        if (svg) svg.style.display = 'block';
        if (btn) { btn.textContent = 'Constelação 3D'; btn.setAttribute('aria-pressed', 'false'); btn.title = 'Alternar para a constelação 3D'; }
        if (neuralBrainReq) cancelAnimationFrame(neuralBrainReq);
      }
    };
    window.fenixToggleNeuralPhysicsPanel = function() {
      const panel = document.getElementById('fenixNeuralPhysicsPanel');
      if (!panel) return;
      const isHidden = panel.style.display === 'none' || !panel.style.display;
      panel.style.display = isHidden ? 'block' : 'none';
    };

    window.fenixSetPhysicsParam = function(param, val) {
      const num = Number(val);
      if (param === 'repulsion') {
        const el = document.getElementById('physicsRepulsionVal');
        if (el) el.textContent = String(val);
        neuralBrainWebglRenderer?.setPhysicsParams?.({ repulsion: Math.max(0.5, num / 100) });
      } else if (param === 'distance') {
        const el = document.getElementById('physicsDistanceVal');
        if (el) el.textContent = String(val);
        neuralBrainWebglRenderer?.setPhysicsParams?.({ linkDist: Math.max(0.4, num / 100) });
      } else if (param === 'glow') {
        const el = document.getElementById('physicsGlowVal');
        if (el) el.textContent = String(val);
        neuralBrainWebglRenderer?.setPhysicsParams?.({ bloom: Math.max(0.5, num / 100) });
      } else if (param === 'gravity') {
        const el = document.getElementById('physicsGravityVal');
        if (el) el.textContent = String(val);
        neuralBrainWebglRenderer?.setPhysicsParams?.({ gravity: num / 100 });
      } else if (param === 'speed') {
        const el = document.getElementById('physicsSpeedVal');
        if (el) el.textContent = String(val);
        neuralBrainWebglRenderer?.setPhysicsParams?.({ orbitSpeed: num / 1000 });
      }
      if (neuralBrainActive) scheduleBrainRender();
    };

    window.fenixInit3DNeuralBrain = init3DNeuralBrain;
    window.addEventListener('resize', () => {
      if (neuralBrainActive && document.getElementById('fenixNeuralBrainCanvas')?.offsetParent) init3DNeuralBrain();
    }, { passive: true });
  };
  shell();
  install();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  if ($('view-memory')?.classList.contains('active')) {
    load();
    setTimeout(() => window.fenixInit3DNeuralBrain?.(), 60);
  }
  window.addEventListener('fenix:viewchanged', (event) => {
    if (event.detail?.viewId === 'memory') {
      load();
      setTimeout(() => window.fenixInit3DNeuralBrain?.(), 60);
    }
  });
})();
