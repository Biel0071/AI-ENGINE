(function attachDesignReferencePanel(root) {
  'use strict';
  const api = root.FenixDesignReference;
  if (!api) return;
  const screenData = new Map();
  const screenBoards = new WeakMap();

  function selectedProject() {
    const card = document.querySelector('#flpCards .flp-card.active');
    const id = card?.dataset.projectId;
    if (!id) return null;
    return { id, name: card.querySelector('.flp-card-title')?.textContent?.trim() || id };
  }

  function make(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  }

  function openDestination(action, project) {
    if (action === 'ide') {
      root.showView?.('ide');
      return Promise.resolve(root.fenixSelectIdeProject?.(project.id));
    }
    const tab = action === 'projects' ? 'overview' : action;
    const button = [...document.querySelectorAll('#flpDetail .flp-ws-tab')]
      .find((item) => item.textContent.toLowerCase().includes(tab === 'screens' ? 'screen dna' : tab === 'intelligence' ? 'inteligência' : 'visão geral'));
    button?.click();
    return Boolean(button);
  }

  async function absorbedScreens(projectId) {
    if (screenData.has(projectId)) return screenData.get(projectId);
    const pending = fetch(`/api/v2/company/projects/${encodeURIComponent(projectId)}/absorption`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(root.localStorage.getItem('grg_token') || root.localStorage.getItem('fenix_token') ? { Authorization: `Bearer ${root.localStorage.getItem('grg_token') || root.localStorage.getItem('fenix_token')}` } : {}) }
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return Array.isArray(data.screens) ? data.screens : [];
    });
    screenData.set(projectId, pending);
    try { return await pending; }
    catch (error) { screenData.delete(projectId); throw error; }
  }

  function enhanceLegacyScreens() {
    const project = selectedProject();
    const grid = document.querySelector('#flpDetail .flp-screens-grid');
    if (!project || !grid) return false;
    const key = `fenix_screen_dna_order:${project.id}`;
    const cardBaseId = (card) => `${card.querySelector('.flp-screen-route')?.textContent?.trim() || ''}|${card.querySelector('.flp-screen-title')?.textContent?.trim() || ''}`;
    let board = screenBoards.get(grid);
    if (!board) {
      const cards = [...grid.querySelectorAll('.flp-screen-card')];
      if (!cards.length) return false;
      const counts = new Map();
      for (const card of cards) {
        const base = cardBaseId(card);
        const ordinal = counts.get(base) || 0;
        counts.set(base, ordinal + 1);
        card.dataset.fenixBoardId = `${base}#${ordinal}`;
      }
      let stored = [];
      try {
        const parsed = JSON.parse(root.localStorage.getItem(key) || '[]');
        if (Array.isArray(parsed)) stored = parsed.filter((item) => typeof item === 'string');
      } catch { /* Ignore malformed browser-local board preferences. */ }
      const rank = new Map(stored.map((id, index) => [id, index]));
      const ordered = [...cards].sort((a, b) => {
        const aRank = rank.get(a.dataset.fenixBoardId) ?? rank.get(cardBaseId(a)) ?? Number.MAX_SAFE_INTEGER;
        const bRank = rank.get(b.dataset.fenixBoardId) ?? rank.get(cardBaseId(b)) ?? Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });
      board = { cards: ordered, initial: [...cards], page: 0, pageSize: 24, dragged: null, saved: stored.length > 0 };
      screenBoards.set(grid, board);
      grid.dataset.fenixBoardProject = project.id;
    }
    let status = grid.parentElement.querySelector('.fenix-legacy-board-status');
    let previous = grid.parentElement.querySelector('.fenix-legacy-board-previous');
    let next = grid.parentElement.querySelector('.fenix-legacy-board-next');
    const pageCount = Math.max(1, Math.ceil(board.cards.length / board.pageSize));
    const setStatus = (message) => { if (status && status.textContent !== message) status.textContent = message; };
    const renderPage = () => {
      board.page = Math.min(Math.max(board.page, 0), pageCount - 1);
      const start = board.page * board.pageSize;
      const visible = board.cards.slice(start, start + board.pageSize);
      const current = [...grid.querySelectorAll('.flp-screen-card')];
      if (current.length !== visible.length || current.some((card, index) => card !== visible[index])) grid.replaceChildren(...visible);
      if (previous && next) {
        previous.disabled = board.page === 0;
        next.disabled = board.page >= pageCount - 1;
      }
      setStatus(`${board.saved ? 'Ordem salva neste navegador · ' : 'Página '}${board.page + 1} · ${start + 1}–${Math.min(start + visible.length, board.cards.length)} de ${board.cards.length}`);
    };
    if (!grid.parentElement.querySelector('.fenix-legacy-board-controls')) {
      const controls = make('div', 'fenix-legacy-board-controls');
      status ||= make('span', 'fenix-legacy-board-status');
      const restore = make('button', 'flp-button flp-button-soft', 'Restaurar ordem');
      const navigation = make('div', 'fenix-legacy-board-navigation');
      const prevButton = make('button', 'flp-button flp-button-soft fenix-legacy-board-previous', 'Telas anteriores');
      const nextButton = make('button', 'flp-button flp-button-soft fenix-legacy-board-next', 'Próximas telas');
      previous = prevButton;
      next = nextButton;
      prevButton.type = nextButton.type = restore.type = 'button';
      prevButton.addEventListener('click', () => { board.page -= 1; renderPage(); });
      nextButton.addEventListener('click', () => { board.page += 1; renderPage(); });
      restore.addEventListener('click', () => {
        try { root.localStorage.removeItem(key); } catch { /* Browser storage can be disabled. */ }
        board.cards = [...board.initial];
        board.saved = false;
        board.page = 0;
        renderPage();
        setStatus(`Ordem original · 1–${Math.min(board.pageSize, board.cards.length)} de ${board.cards.length}`);
      });
      navigation.append(prevButton, nextButton);
      controls.append(status, navigation, restore);
      grid.before(controls);
    }
    const saveOrder = () => {
      const start = board.page * board.pageSize;
      board.cards.splice(start, board.pageSize, ...[...grid.querySelectorAll('.flp-screen-card')]);
      try {
        board.saved = true;
        root.localStorage.setItem(key, JSON.stringify(board.cards.map((card) => card.dataset.fenixBoardId)));
        setStatus(`Ordem salva neste navegador · ${board.page + 1}–${Math.min(start + board.pageSize, board.cards.length)} de ${board.cards.length}`);
      } catch {
        setStatus('Ordem válida somente nesta sessão');
      }
    };
    for (const card of board.cards) {
      if (card.dataset.fenixBoardEnhanced === project.id) continue;
      card.dataset.fenixBoardEnhanced = project.id;
      card.draggable = true;
      card.addEventListener('dragstart', () => { board.dragged = card; card.classList.add('is-dragging'); });
      card.addEventListener('dragend', () => { card.classList.remove('is-dragging'); board.dragged = null; });
      card.addEventListener('dragover', (event) => event.preventDefault());
      card.addEventListener('drop', (event) => {
        event.preventDefault();
        if (board.dragged && board.dragged !== card) { grid.insertBefore(board.dragged, card); saveOrder(); }
      });
    }
    renderPage();
    absorbedScreens(project.id).then((screens) => {
      if (!grid.isConnected || selectedProject()?.id !== project.id) return;
      const screenByRoute = new Map(screens.map((screen) => [`${String(screen.route || '').trim()}|${String(screen.name || '').trim()}`, screen]));
      for (const card of board.cards) {
        if (card.querySelector('.fenix-legacy-screen-actions')) continue;
        const route = card.querySelector('.flp-screen-route')?.textContent?.trim();
        const title = card.querySelector('.flp-screen-title')?.textContent?.trim();
        const screen = screenByRoute.get(`${route}|${title}`) || (title ? null : screenByRoute.get(`${route}|`));
        const actions = make('div', 'fenix-legacy-screen-actions');
        const ide = make('button', 'flp-button flp-button-soft', screen?.sourceFile ? 'Abrir arquivo na IDE' : 'Arquivo de origem não medido');
        ide.type = 'button';
        ide.disabled = !screen?.sourceFile || typeof root.fenixSelectIdeProject !== 'function' || typeof root.fenixSelectIdeFile !== 'function';
        ide.addEventListener('click', async () => {
          try {
            root.showView?.('ide');
            await root.fenixSelectIdeProject(project.id);
            await root.fenixSelectIdeFile(screen.sourceFile);
          } catch (error) { actions.querySelector('.fenix-legacy-screen-action-status').textContent = `Falha ao abrir IDE: ${error.message}`; }
        });
        const graph = make('button', 'flp-button flp-button-soft', 'Ver relações no Flow Graph');
        graph.type = 'button';
        graph.disabled = typeof root.fenixOpenFlowGraph !== 'function';
        graph.addEventListener('click', () => root.fenixOpenFlowGraph?.({ context: 'PROJECT', entityId: `project:${project.id}` }));
        actions.append(ide, graph, make('span', 'fenix-legacy-screen-action-status', screen?.sourceFile ? `Origem: ${screen.sourceFile}` : 'Rota registrada; arquivo não medido'));
        card.querySelector('.flp-screen-body')?.append(actions);
      }
    }).catch((error) => {
      setStatus(`Metadados de absorção indisponíveis: ${error.message}`);
    });
    return true;
  }

  function mountLegacyPanel() {
    const panel = document.querySelector('#flpDetail .flp-intelligence');
    const project = selectedProject();
    if (!panel || !project) return false;
    if (panel.querySelector('.flp-design-reference')) return true;

    const section = make('section', 'flp-intelligence-section flp-design-reference');
    section.append(make('h4', '', 'Stitch · Miro · Lovable → fluxo GRG SPACE'));
    section.append(make('p', 'flp-intelligence-note', 'Auditoria de capacidades públicas, ligada ao projeto selecionado. A matriz diferencia o que existe do que ainda falta; não há conexão com APIs externas.'));

    const references = make('div', 'flp-design-reference-catalog');
    for (const source of api.profile.referenceCatalog || []) {
      const card = make('article', 'flp-design-reference-card');
      const link = make('a', '', source.name);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      card.append(link, make('p', '', source.observed), make('p', 'flp-design-reference-applied', source.applied));
      references.append(card);
    }
    section.append(references);

    const capabilities = make('div', 'flp-reference-capabilities');
    for (const item of api.profile.capabilityMap || []) {
      const card = make('article', 'flp-reference-capability');
      card.dataset.status = item.status;
      card.append(make('span', 'flp-reference-product', item.product));
      card.append(make('strong', '', item.capability));
      card.append(make('span', `flp-reference-status is-${String(item.status).toLowerCase()}`, item.status));
      card.append(make('p', '', item.fenix), make('small', '', `Evidência: ${item.evidence}`));
      if (item.action) {
        const action = make('button', 'flp-button flp-button-soft', item.actionLabel);
        action.type = 'button';
        action.dataset.referenceAction = item.action;
        action.addEventListener('click', () => openDestination(item.action, project));
        card.append(action);
      }
      capabilities.append(card);
    }
    section.append(capabilities);

    const status = make('p', 'flp-design-reference-status', 'Consultando memória do projeto…');
    status.setAttribute('role', 'status');
    section.append(status);
    const apply = make('button', 'flp-button flp-button-primary', 'Aplicar perfil visual ao projeto');
    apply.type = 'button';
    apply.addEventListener('click', async () => {
      apply.disabled = true;
      status.textContent = 'Salvando perfil na memória autenticada…';
      try {
        await api.apply(project);
        status.textContent = 'Perfil visual salvo na memória deste projeto e na memória universal.';
      } catch (error) {
        status.textContent = `Não foi possível salvar o perfil: ${error.message}`;
      } finally { apply.disabled = false; }
    });
    section.append(apply);
    panel.append(section);
    Promise.all([api.read(project.id), api.readGlobal()]).then(([saved, universal]) => {
      if (!status.isConnected) return;
      if (saved?.error) status.textContent = `Memória indisponível: ${saved.error}`;
      else if (saved) status.textContent = `Perfil ativo no projeto · versão ${saved.version}.`;
      else if (universal?.error) status.textContent = `Perfil ainda não aplicado; memória universal indisponível: ${universal.error}`;
      else status.textContent = universal ? `Memória visual universal ativa · versão ${universal.version}.` : 'Perfil ainda não aplicado a este projeto.';
    });
    return true;
  }

  function installStyles() {
    if (document.getElementById('fenix-design-reference-panel-style')) return;
    const style = make('style');
    style.id = 'fenix-design-reference-panel-style';
    style.textContent = '.flp-reference-capabilities{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:10px;margin:12px 0}.flp-reference-capability{display:grid;align-content:start;gap:8px;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(11,16,25,.72)}.flp-reference-product{color:#5bd8ec;font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.08em}.flp-reference-capability strong{color:#eef3fb;font-size:13px;line-height:1.4}.flp-reference-capability p,.flp-reference-capability small{margin:0;color:#a8b4c7;font-size:11px;line-height:1.5;overflow-wrap:anywhere}.flp-reference-status{justify-self:start;padding:3px 7px;border-radius:999px;font-size:9px;font-weight:750;letter-spacing:.04em}.flp-reference-status.is-partial{background:rgba(251,191,36,.12);color:#fbbf24}.flp-reference-status.is-backlog{background:rgba(148,163,184,.14);color:#aab8ca}.flp-reference-status.is-implemented{background:rgba(16,185,129,.14);color:#34d399}.flp-reference-capability .flp-button{justify-self:start;min-height:36px}.fenix-legacy-board-controls{display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:10px;margin:10px 0}.fenix-legacy-board-controls .fenix-legacy-board-status{margin-right:auto}.fenix-legacy-board-navigation{display:flex;gap:8px}.fenix-legacy-board-status,.fenix-legacy-screen-action-status{color:#8da0b7;font-size:11px;overflow-wrap:anywhere}.fenix-legacy-screen-actions{display:grid;gap:7px;margin-top:10px}.fenix-legacy-screen-actions .flp-button{min-height:36px}.flp-screen-card.is-dragging{opacity:.55}@media(max-width:600px){.fenix-legacy-board-controls{justify-content:space-between}.fenix-legacy-board-controls .fenix-legacy-board-status{flex-basis:100%}.fenix-legacy-screen-actions .flp-button{width:100%;white-space:normal;text-align:left}}';
    document.head.append(style);
  }

  root.FenixDesignReferencePanel = Object.freeze({ mountLegacyPanel, enhanceLegacyScreens });
  installStyles();
  const observer = new MutationObserver(() => { mountLegacyPanel(); enhanceLegacyScreens(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})(window);
