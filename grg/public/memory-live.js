(() => {
  'use strict';
  const state = { nodes: [], edges: [], selected: null, query: '', type: 'all', loading: null, error: null, measuredAt: null };
  const $ = (id) => document.getElementById(id);
  const make = (tag, className, value) => { const element = document.createElement(tag); if (className) element.className = className; if (value !== undefined) element.textContent = String(value ?? ''); return element; };
  const label = (item) => item?.properties?.name || item?.properties?.title || item?.name || item?.id || 'Sem nome';
  const svg = (tag, attrs = {}) => { const element = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value); return element; };
  async function getJson(path) { const response = await fetch(path, { credentials: 'same-origin', signal: AbortSignal.timeout(30000) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`); return data; }
  function shell() {
    const view = $('view-memory');
    if (!view || view.dataset.liveMemory === 'true') return;
    view.dataset.liveMemory = 'true';
    view.replaceChildren();
    const main = make('main', 'fml-root');
    main.innerHTML = `<header class="fml-header"><div><span class="fml-eyebrow">GRAPH BRAIN · DADOS DO RUNTIME</span><h1>Memória & relações</h1><p>Explore entidades conectadas e consulte memórias persistidas.</p></div><button id="fmlRefresh" type="button" class="fml-button">↻ Sincronizar</button></header>
      <div id="fmlStatus" class="fml-status" role="status">Carregando grafo…</div>
      <section class="fml-kpis" aria-label="Resumo do grafo"><div><span>Nós</span><strong id="fmlNodesCount">—</strong></div><div><span>Relações</span><strong id="fmlEdgesCount">—</strong></div><div><span>Tipos de nó</span><strong id="fmlTypesCount">—</strong></div><div><span>Conexões selecionadas</span><strong id="fmlSelectedEdges">—</strong></div></section>
      <section class="fml-workspace"><aside class="fml-list"><div class="fml-pane-head"><strong>Entidades</strong><span id="fmlVisibleCount">—</span></div><div class="fml-filters"><input id="fmlSearch" type="search" placeholder="Nome, ID ou propriedade" aria-label="Buscar no grafo"><select id="fmlType" aria-label="Filtrar por tipo"><option value="all">Todos os tipos</option></select></div><div id="fmlNodes" class="fml-node-list"></div></aside>
        <div class="fml-network"><div class="fml-pane-head"><strong>Relações do nó selecionado</strong><span>Arraste a lista ou selecione um vizinho</span></div><svg id="fmlMap" viewBox="0 0 720 460" role="img" aria-label="Mapa das relações reais do nó selecionado"></svg><p id="fmlMapNote" class="fml-map-note"></p></div>
        <aside class="fml-inspector"><div class="fml-pane-head"><strong>Detalhes</strong><span>Graph Brain</span></div><div id="fmlDetail"></div></aside></section>
      <section class="fml-persistent"><div><span class="fml-eyebrow">MEMÓRIA PERSISTIDA</span><h2>Buscar registros</h2><p>Resultados da API de memórias do projeto. A contagem do grafo acima representa entidades, não memórias persistidas.</p></div><form id="fmlMemoryForm"><input id="fmlMemoryQuery" type="search" required placeholder="Digite uma expressão para buscar" aria-label="Buscar memórias persistidas"><button type="submit" class="fml-button">Buscar</button></form><div id="fmlMemoryResults" role="status">Digite uma expressão para consultar a memória.</div></section>`;
    view.append(main);
    $('fmlRefresh').addEventListener('click', () => load(true));
    $('fmlSearch').addEventListener('input', (event) => { state.query = event.target.value.trim().toLocaleLowerCase('pt-BR'); renderList(); });
    $('fmlType').addEventListener('change', (event) => { state.type = event.target.value; renderList(); });
    $('fmlMemoryForm').addEventListener('submit', searchMemories);
  }
  function neighbors(id) { return state.edges.filter((edge) => edge.from === id || edge.to === id); }
  function choose(id) {
    if (!state.nodes.some((item) => item.id === id)) return;
    state.selected = id;
    try { sessionStorage.setItem('fenix_memory_selected_node', id); } catch (_) {}
    renderList(); renderMap(); renderDetail();
  }
  function renderList() {
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
    $('fmlSelectedEdges').textContent = String(links.length);
    const byId = new Map(state.nodes.map((item) => [item.id, item]));
    const visible = links.map((edge) => ({ edge, item: byId.get(edge.from === center.id ? edge.to : edge.from) })).filter(({ item }) => item).slice(0, 14);
    const colors = { PROJECT: '#55e6c1', API: '#67c7ff', ERROR: '#ff958e', FIX: '#b69aff', TASK: '#ffd18a', JOB: '#ffc089', PAGE: '#8ecbff', COMPONENT: '#b3dfff' };
    visible.forEach(({ edge, item }, index) => {
      const angle = (index / Math.max(visible.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const x = 360 + Math.cos(angle) * 255, y = 230 + Math.sin(angle) * 170;
      map.append(svg('line', { x1: 360, y1: 230, x2: x, y2: y, stroke: '#3a7186', 'stroke-width': 1.5, 'stroke-dasharray': '4 5' }));
      const group = svg('g', { class: 'fml-map-node', tabindex: '0', role: 'button', 'aria-label': `Selecionar ${label(item)}` });
      group.append(svg('circle', { cx: x, cy: y, r: 25, fill: '#102b3e', stroke: colors[item.type] || '#82a9d3', 'stroke-width': 2 }));
      const name = svg('text', { x, y: y + 40, 'text-anchor': 'middle', fill: '#dceefa', 'font-size': 11 }); name.textContent = label(item).slice(0, 19); group.append(name);
      const title = svg('title'); title.textContent = `${label(item)} · ${edge.type || 'relação'}`; group.append(title);
      group.addEventListener('click', () => choose(item.id)); group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(item.id); } }); map.append(group);
    });
    map.append(svg('circle', { cx: 360, cy: 230, r: 43, fill: '#123b49', stroke: colors[center.type] || '#63e0ca', 'stroke-width': 3 }));
    const main = svg('text', { x: 360, y: 235, 'text-anchor': 'middle', fill: '#f5fffc', 'font-size': 12, 'font-weight': 700 }); main.textContent = label(center).slice(0, 18); map.append(main);
    $('fmlMapNote').textContent = links.length ? `${links.length} relações registradas · ${visible.length} vizinhos exibidos` : 'Este nó não possui relações registradas.';
  }
  function renderDetail() {
    const target = $('fmlDetail'); if (!target) return; target.replaceChildren();
    const item = state.nodes.find((entry) => entry.id === state.selected);
    if (!item) { target.append(make('p', 'fml-empty', 'Selecione uma entidade.')); return; }
    target.append(make('span', 'fml-detail-type', item.type || 'SEM TIPO'), make('h2', '', label(item)), make('p', 'fml-detail-id', item.id));
    const properties = make('dl', 'fml-properties');
    for (const [key, value] of Object.entries(item.properties || {})) { properties.append(make('dt', '', key), make('dd', '', typeof value === 'object' ? JSON.stringify(value) : value)); }
    if (!properties.children.length) target.append(make('p', 'fml-empty', 'Sem propriedades adicionais.')); else target.append(properties);
    const relations = neighbors(item.id); target.append(make('h3', '', `Relações (${relations.length})`));
    for (const edge of relations.slice(0, 20)) { const otherId = edge.from === item.id ? edge.to : edge.from; const button = make('button', 'fml-relation', `${edge.type || 'RELACIONADO'} · ${otherId}`); button.type = 'button'; button.addEventListener('click', () => choose(otherId)); target.append(button); }
    if (relations.length > 20) target.append(make('p', 'fml-empty', `Mais ${relations.length - 20} relações no grafo.`));
  }
  function render() {
    shell();
    $('fmlNodesCount').textContent = state.nodes.length ? String(state.nodes.length) : state.measuredAt ? '0' : '—';
    $('fmlEdgesCount').textContent = state.measuredAt ? String(state.edges.length) : '—';
    const types = [...new Set(state.nodes.map((item) => item.type).filter(Boolean))].sort();
    $('fmlTypesCount').textContent = state.measuredAt ? String(types.length) : '—';
    const select = $('fmlType'); const value = state.type; select.replaceChildren(new Option('Todos os tipos', 'all'));
    for (const type of types) select.add(new Option(`${type} · ${state.nodes.filter((item) => item.type === type).length}`, type)); select.value = value;
    const status = $('fmlStatus'); status.textContent = state.loading ? 'Sincronizando Graph Brain…' : state.error ? `Grafo indisponível: ${state.error}` : state.measuredAt ? `Medido às ${new Date(state.measuredAt).toLocaleTimeString('pt-BR')} · fonte: /api/v2/graph/data` : 'Aguardando dados'; status.dataset.error = String(Boolean(state.error));
    renderList(); renderMap(); renderDetail();
  }
  function load(force = false) {
    shell(); if (state.loading) return state.loading; if (state.measuredAt && !force) { render(); return Promise.resolve(); }
    state.error = null;
    state.loading = getJson('/api/v2/graph/data').then((data) => {
      state.nodes = Array.isArray(data.nodes) ? data.nodes : []; state.edges = Array.isArray(data.edges) ? data.edges : [];
      state.measuredAt = new Date().toISOString();
      const saved = (() => { try { return sessionStorage.getItem('fenix_memory_selected_node'); } catch (_) { return null; } })();
      state.selected = state.nodes.find((item) => item.id === state.selected)?.id || state.nodes.find((item) => item.id === saved)?.id || state.nodes.find((item) => item.id === 'project:fenix-os')?.id || state.nodes[0]?.id || null;
    }).catch((error) => { state.error = error.message; }).finally(() => { state.loading = null; render(); });
    render(); return state.loading;
  }
  async function searchMemories(event) {
    event.preventDefault(); const target = $('fmlMemoryResults'); const q = $('fmlMemoryQuery').value.trim(); if (!q) return;
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
  const install = () => {
    window.loadMemoryView = load;
    window.fenixSyncMemoryGraph = load;
    window.fenixMountMemoryView = () => load();
    window.fenixSelectMemoryCluster = () => {};
  };
  install();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  shell();
  if ($('view-memory')?.classList.contains('active')) load();
  window.addEventListener('fenix:viewchanged', (event) => { if (event.detail?.viewId === 'memory') load(); });
})();
