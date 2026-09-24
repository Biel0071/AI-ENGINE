(() => {
  const state = { projectId: null, path: null, hash: null, projects: [] };
  let loadPromise = null;
  const endpoint = (suffix = '') => `/api/fenix/projects/${encodeURIComponent(state.projectId)}${suffix}`;
  async function json(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }
  function status(message, error = false) {
    const node = document.getElementById('fenixIdeLiveStatus');
    if (node) { node.textContent = message; node.dataset.error = String(error); }
  }
  function renderShell() {
    const view = document.getElementById('view-ide');
    if (!view || view.dataset.liveIde === 'true') return;
    view.dataset.liveIde = 'true';
    view.innerHTML = `<section class="fenix-live-ide">
      <header class="fenix-live-ide-header"><div><span class="fenix-live-ide-eyebrow">PROJECT KERNEL · WORKSPACE REAL</span><h1>IDE de Projetos</h1><p>Leia e edite arquivos do projeto registrado no Fênix.</p></div>
        <div class="fenix-live-ide-controls"><label for="fenixIdeProject">Projeto</label><select id="fenixIdeProject" aria-label="Projeto do IDE"></select><button id="fenixIdeAnalyze" type="button">Analisar projeto</button></div></header>
      <div class="fenix-live-ide-meta"><span id="fenixIdeProjectMeta">Selecione um projeto</span><span id="fenixIdeLiveStatus" role="status">Carregando projetos…</span></div>
      <div class="fenix-live-ide-body"><aside class="fenix-live-ide-tree"><div class="fenix-live-ide-panel-head">Arquivos <button id="fenixIdeRefresh" type="button" title="Atualizar árvore">↻</button></div><div id="fenixIdeLiveTree"></div></aside>
        <main class="fenix-live-ide-editor"><div class="fenix-live-ide-panel-head"><span id="fenixIdeLivePath">Selecione um arquivo</span><button id="fenixIdeLiveSave" type="button" disabled>Salvar alteração</button></div><textarea id="fenixIdeLiveCode" spellcheck="false" aria-label="Conteúdo do arquivo" placeholder="Selecione um arquivo na árvore para começar."></textarea></main></div>
    </section>`;
    document.getElementById('fenixIdeProject').addEventListener('change', (event) => selectProject(event.target.value));
    document.getElementById('fenixIdeRefresh').addEventListener('click', loadTree);
    document.getElementById('fenixIdeLiveSave').addEventListener('click', saveFile);
    document.getElementById('fenixIdeAnalyze').addEventListener('click', analyzeProject);
  }
  async function loadProjects() {
    renderShell();
    try {
      const data = await json('/api/fenix/projects');
      state.projects = (data.projects || []).filter((project) => project.workspace);
      const select = document.getElementById('fenixIdeProject');
      select.replaceChildren();
      if (!state.projects.length) { select.add(new Option('Nenhum workspace registrado', '')); status('Registre um projeto com workspace no Project Kernel.', true); return; }
      for (const project of state.projects) select.add(new Option(project.name, project.id));
      const saved = localStorage.getItem('fenix_ide_project');
      const preferred = state.projects.find((project) => project.id === saved) || state.projects.find((project) => project.id === 'api-platform-live') || state.projects[0];
      select.value = preferred.id;
      await selectProject(preferred.id);
    } catch (error) { status(`Falha ao carregar projetos: ${error.message}`, true); }
  }
  async function selectProject(id) {
    state.projectId = id; state.path = null; state.hash = null;
    localStorage.setItem('fenix_ide_project', id);
    const project = state.projects.find((item) => item.id === id);
    document.getElementById('fenixIdeProjectMeta').textContent = project ? `${project.workspace} · consultando Git…` : '';
    document.getElementById('fenixIdeLivePath').textContent = 'Selecione um arquivo';
    document.getElementById('fenixIdeLiveCode').value = '';
    document.getElementById('fenixIdeLiveSave').disabled = true;
    const [gitState] = await Promise.all([
      json(endpoint('/git')).catch(() => null),
      loadTree(),
    ]);
    document.getElementById('fenixIdeProjectMeta').textContent = project
      ? `${project.workspace} · ${gitState?.branch || 'branch indisponível'} · ${gitState?.head ? gitState.head.slice(0, 12) : 'versão indisponível'}`
      : '';
  }
  function appendNodes(parent, nodes) {
    for (const item of nodes) {
      if (item.type === 'directory') {
        const group = document.createElement('details'); group.className = 'fenix-live-ide-folder';
        const summary = document.createElement('summary'); summary.textContent = `▸ ${item.name}`; group.appendChild(summary);
        appendNodes(group, item.children || []); parent.appendChild(group);
      } else {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'fenix-live-ide-file';
        button.textContent = item.name; button.title = item.path; button.addEventListener('click', () => openFile(item.path)); parent.appendChild(button);
      }
    }
  }
  async function loadTree() {
    if (!state.projectId) return;
    const tree = document.getElementById('fenixIdeLiveTree'); tree.textContent = 'Carregando arquivos…';
    try {
      const data = await json(endpoint('/tree'));
      tree.replaceChildren(); appendNodes(tree, data.tree || []);
      if (!data.tree?.length) tree.textContent = 'Nenhum arquivo acessível neste workspace.';
      status(`${data.tree?.length || 0} entradas na raiz · fonte: Project Kernel`);
    } catch (error) { tree.textContent = 'Não foi possível carregar a árvore.'; status(error.message, true); }
  }
  async function openFile(filePath) {
    status(`Abrindo ${filePath}…`);
    try {
      const data = await json(`${endpoint('/file')}?path=${encodeURIComponent(filePath)}`);
      state.path = data.path; state.hash = data.hash;
      document.getElementById('fenixIdeLivePath').textContent = data.path;
      document.getElementById('fenixIdeLiveCode').value = data.content;
      document.getElementById('fenixIdeLiveSave').disabled = false;
      status(`${data.size} bytes · pronto para edição`);
    } catch (error) { status(`Falha ao abrir: ${error.message}`, true); }
  }
  async function saveFile() {
    if (!state.projectId || !state.path || !state.hash) return;
    const button = document.getElementById('fenixIdeLiveSave'); button.disabled = true; status('Salvando alteração…');
    try {
      const data = await json(endpoint('/file'), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: state.path, content: document.getElementById('fenixIdeLiveCode').value, expectedHash: state.hash }) });
      state.hash = data.hash;
      status(data.warning ? `Arquivo salvo; atenção: ${data.warning}` : `Salvo em ${new Date(data.savedAt).toLocaleTimeString()} · memória v${data.memoryVersion}` , Boolean(data.warning));
    } catch (error) { status(`Falha ao salvar: ${error.message}`, true); }
    finally { button.disabled = false; }
  }
  async function analyzeProject() {
    if (!state.projectId) return;
    status('Analisando estado do Git…');
    try {
      const data = await json(endpoint('/analyze'), { method: 'POST' });
      status(`Análise registrada · HEAD ${String(data.head || '').slice(0, 12)} · artefato ${data.artifact?.name || 'criado'}`);
    } catch (error) { status(`Falha na análise: ${error.message}`, true); }
  }
  window.loadIdeView = () => {
    if (loadPromise) return loadPromise;
    if (state.projectId && state.projects.length) return Promise.resolve();
    loadPromise = loadProjects().finally(() => { loadPromise = null; });
    return loadPromise;
  };
  window.fenixSelectIdeFile = (filePath) => { if (state.projectId) openFile(filePath); else window.loadIdeView(); };
  window.fenixSelectIdeProject = async (projectId) => {
    localStorage.setItem('fenix_ide_project', projectId);
    await window.loadIdeView();
    if (state.projects.some((project) => project.id === projectId) && state.projectId !== projectId) {
      document.getElementById('fenixIdeProject').value = projectId;
      await selectProject(projectId);
    }
  };
})();
