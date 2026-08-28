/**
 * FENIX OS - Visual IDE & Project Mirror (Fases C, D, E)
 * This file adds the Visual Engineering Environment capabilities to the FENIX OS.
 */

(function () {
  const $ = (id) => document.getElementById(id);
  const api = window.FENIX?.api || (async (path, opt) => fetch(path, opt).then(r => r.json()));
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  // ==========================================
  // FASE C: PROJECT MIRROR & SCREEN GALLERY
  // ==========================================
  
  let projectSnapshot = null;
  let selectedScreen = null;
  let selectedElement = null;

  function selectedProjectPath() {
    return $('projectSwitcher')?.selectedOptions?.[0]?.dataset?.path || projectSnapshot?.path || '';
  }

  function mirrorPath(route, projectPath = selectedProjectPath()) {
    if (!projectPath) return route;
    return `${route}${route.includes('?') ? '&' : '?'}path=${encodeURIComponent(projectPath)}`;
  }

  function previewUrl(screen, projectPath = selectedProjectPath()) {
    const file = screen?.previewTarget?.file || screen?.file;
    if (!projectPath || !file) return screen?.previewTarget?.path || screen?.route || null;
    const hash = String(screen?.route || '').startsWith('#') ? screen.route : '';
    return `/api/project-mirror/preview?path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file)}${hash}`;
  }

  async function loadMirrorProjects() {
    const response = await api('/project-mirror/projects');
    const switcher = $('projectSwitcher');
    if (!switcher) return response.projects || [];
    const previousPath = selectedProjectPath();
    switcher.innerHTML = (response.projects || []).map((project) =>
      `<option value="${safe(project.projectId)}" data-path="${safe(project.path)}">${safe(project.name || project.projectId).toUpperCase()} · ${Number(project.screens || 0)} TELAS</option>`
    ).join('');
    const matching = Array.from(switcher.options).find((option) => option.dataset.path === previousPath);
    if (matching) switcher.value = matching.value;
    return response.projects || [];
  }

  async function loadProjectMirror() {
    try {
      const pmContent = $('pmContent');
      if (!pmContent) return;
      pmContent.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner ph-spin" style="font-size: 32px;"></i><p>Scanning Active Project...</p></div>';
      
      const [snapshot, runtimeStatus] = await Promise.all([
        api(mirrorPath('/project-mirror')),
        api('/v2/system/status').catch(() => null),
      ]);
      projectSnapshot = snapshot;
      if ($('commandRuntimeState')) $('commandRuntimeState').textContent = runtimeStatus?.api?.ok ? 'ONLINE' : 'UNKNOWN';
      renderCommandMirror();
      
      // Auto-load Overview
      renderProjectSection('overview');
    } catch (e) {
      if ($('pmContent')) $('pmContent').innerHTML = `<div style="color: var(--danger);">Error loading Project Mirror: ${e.message}</div>`;
    }
  }

  function renderCommandMirror() {
    const container = $('projectMirrorList');
    if (!container || !projectSnapshot) return;
    const screens = projectSnapshot.screens || [];
    container.innerHTML = screens.length ? screens.map((screen) => `
      <button class="nav-item command-screen-item" data-screen-id="${safe(screen.id)}" style="width:100%;text-align:left;padding:7px 8px;background:transparent;border:0;color:var(--text-main);cursor:pointer">
        <i class="ph ${safe(screen.icon || 'ph-rectangle')}"></i> ${safe(screen.name)}
      </button>
    `).join('') : '<div style="padding:12px;color:var(--text-muted)">NO SCREENS DISCOVERED</div>';
    container.querySelectorAll('.command-screen-item').forEach((button) => button.addEventListener('click', () => selectCommandScreen(button.dataset.screenId)));
    if ($('pmScreensBadge')) $('pmScreensBadge').textContent = String(screens.length);
    if ($('pmApisBadge')) $('pmApisBadge').textContent = String(projectSnapshot.apis?.length || 0);
    if ($('pmBackendBadge')) $('pmBackendBadge').textContent = String(projectSnapshot.services?.length || 0);
    if ($('pmWorkersBadge')) $('pmWorkersBadge').textContent = String(projectSnapshot.workers?.length || 0);
  }

  async function selectCommandScreen(screenId) {
    try {
      const data = await api(mirrorPath(`/project-mirror/screen/${encodeURIComponent(screenId)}`));
      const screen = data.screen;
      selectedScreen = { ...screen, projectId: data.projectId, workspaceId: data.workspaceId, projectPath: data.projectPath, git: data.git };
      const previewPath = previewUrl(screen, data.projectPath);
      if (previewPath && $('wsPreviewFrame')) {
        $('wsPreviewFrame').src = previewPath;
        if ($('wsPreviewLabel')) $('wsPreviewLabel').textContent = `${screen.name} · ${previewPath}`;
        window.setWorkspaceMode?.('preview');
      }
      window.inspectItem?.({
        name: screen.name,
        type: screen.type,
        file: (screen.sourceFiles || []).map((source) => `${source.file}:${source.line || 1}`).join('\n') || screen.file,
        api: (data.relatedApis || []).map((item) => `${item.method} ${item.path}`).join('\n') || 'NOT DETECTED',
        state: previewPath ? 'DISCOVERED' : 'PREVIEW NOT AVAILABLE',
        component: (screen.components || []).map((component) => component.name || component.id).join(', ') || 'NOT DETECTED',
        url: previewPath,
      });
    } catch (error) {
      window.inspectItem?.({ name: screenId, type: 'screen', file: 'NOT AVAILABLE', api: 'NOT AVAILABLE', state: `ERROR: ${error.message}`, component: 'NOT AVAILABLE' });
    }
  }

  function renderProjectSection(section) {
    if (!projectSnapshot) return;
    
    // Update nav highlights
    document.querySelectorAll('.pm-nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.pm-nav-item[data-pm="${section}"]`);
    if (activeNav) activeNav.classList.add('active');

    const pmContent = $('pmContent');
    const pmTitle = $('pmTitle');

    if (section === 'overview') {
      pmTitle.textContent = 'Project Overview';
      pmContent.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
          <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
             <div style="font-size: 12px; color: var(--text-muted);">Total Files</div>
             <div style="font-size: 24px; font-weight: bold;">${projectSnapshot.files?.total || '--'}</div>
          </div>
          <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
             <div style="font-size: 12px; color: var(--text-muted);">APIs Discovered</div>
             <div style="font-size: 24px; font-weight: bold;">${projectSnapshot.apis?.length || '--'}</div>
          </div>
          <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
             <div style="font-size: 12px; color: var(--text-muted);">Screens Found</div>
             <div style="font-size: 24px; font-weight: bold;">${projectSnapshot.screens?.length || '--'}</div>
          </div>
        </div>
        <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
           <h3>Active Source</h3>
           <p style="font-family: monospace; margin-top: 8px; color: var(--text-muted);">${projectSnapshot.path}</p>
        </div>
      `;
    } else if (section === 'screens') {
      pmTitle.textContent = 'Screen Gallery';
      const screens = projectSnapshot.screens || [];
      if (screens.length === 0) {
        pmContent.innerHTML = `<p>No UI screens discovered yet.</p>`;
        return;
      }

      let html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">`;
      screens.forEach(s => {
        const preview = previewUrl(s, projectSnapshot.path);
        html += `
          <div class="pm-screen-card" data-screen-id="${safe(s.id)}" style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s;">
            <div style="height: 160px; background: var(--bg-base); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${preview ? `<iframe title="Preview ${safe(s.name)}" src="${safe(preview)}" loading="lazy" tabindex="-1" style="width: 1440px; height: 900px; border: 0; transform: scale(.2); transform-origin: center; pointer-events: none;"></iframe>` : '<span style="color:var(--text-muted)">PREVIEW NOT AVAILABLE</span>'}
            </div>
            <div style="padding: 16px;">
              <h4 style="margin: 0; font-size: 16px;">${safe(s.name)}</h4>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-muted); font-family: monospace;">${safe(s.route || s.file)}</p>
            </div>
          </div>
        `;
      });
      html += `</div>`;
      pmContent.innerHTML = html;
      pmContent.querySelectorAll('.pm-screen-card').forEach((card) => card.addEventListener('click', () => window.showScreenDetail(card.dataset.screenId)));
    } else if (section === 'apis') {
      pmTitle.textContent = 'API Registry';
      const apis = projectSnapshot.apis || [];
      let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
      apis.forEach(a => {
        html += `
          <div style="background: var(--bg-surface); padding: 12px 16px; border-radius: 6px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: var(--primary);">${a.method}</strong> <span style="font-family: monospace; margin-left: 8px;">${a.path}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">${a.file}</div>
          </div>
        `;
      });
      html += `</div>`;
      pmContent.innerHTML = html;
    } else if (section === 'graph') {
      pmTitle.textContent = 'Architecture Graph';
      pmContent.innerHTML = `
        <div style="height: 600px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-surface); position: relative;">
           <div id="visNetworkContainer" style="width: 100%; height: 100%;"></div>
           <div style="position: absolute; top: 16px; right: 16px; background: var(--bg-base); padding: 12px; border-radius: 8px; border: 1px solid var(--border); width: 250px; font-size: 12px;" id="graphDetails">
              Select a node to view details.
           </div>
        </div>
      `;
      setTimeout(renderArchitectureGraph, 100);
    } else if (section === 'runtime') {
      pmTitle.textContent = 'Runtime Status';
      pmContent.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner ph-spin" style="font-size: 32px;"></i></div>';
      setTimeout(renderRuntimeStatus, 100);
    } else {
      pmTitle.textContent = section.toUpperCase();
      pmContent.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted);">Detailed view for ${section} is under construction in this vertical slice.</div>`;
    }
  }
  window.renderProjectSection = renderProjectSection;

  // ==========================================
  // FASE F: ARCHITECTURE & RUNTIME GRAPH
  // ==========================================

  async function renderArchitectureGraph() {
    const container = document.getElementById('visNetworkContainer');
    if (!container) return;
    if (!window.vis) {
      container.innerHTML = '<div style="padding:24px;color:var(--text-muted)">GRAPH RENDERER NOT AVAILABLE</div>';
      return;
    }

    try {
      if (!projectSnapshot) await loadProjectMirror();
      const rawNodes = [{ id: 'project', label: projectSnapshot.name, kind: 'project', detail: projectSnapshot.path, shape: 'box', color: '#3b82f6' }];
      const rawEdges = [];
      const add = (kind, items, color, labelOf, detailOf) => items.forEach((item, index) => {
        const id = `${kind}:${index}`;
        rawNodes.push({ id, label: labelOf(item), kind, detail: detailOf(item), shape: kind === 'api' ? 'ellipse' : 'box', color });
        rawEdges.push({ from: 'project', to: id, label: kind });
      });
      add('screen', projectSnapshot.screens || [], '#8b5cf6', (item) => item.name, (item) => `${item.route} · ${item.file}`);
      add('api', (projectSnapshot.apis || []).slice(0, 40), '#10b981', (item) => `${item.method} ${item.path}`, (item) => item.definedAt || item.file);
      add('service', projectSnapshot.services || [], '#eab308', (item) => item.name, (item) => item.file);
      add('worker', projectSnapshot.workers || [], '#f97316', (item) => item.name, (item) => item.file);
      add('queue', projectSnapshot.queues || [], '#06b6d4', (item) => item.name, (item) => item.file);
      if (rawNodes.length === 1) {
        container.innerHTML = '<div style="padding:24px;color:var(--text-muted)">NO ARCHITECTURE NODES DISCOVERED</div>';
        return;
      }
      const nodes = new vis.DataSet(rawNodes);
      const edges = new vis.DataSet(rawEdges);

      const data = { nodes: nodes, edges: edges };
      const options = {
        nodes: { font: { color: '#ffffff' }, borderWidth: 2, shadow: true },
        edges: { color: '#6b7280', arrows: 'to', font: { color: '#9ca3af', size: 10 } },
        physics: { hierarchicalRepulsion: { nodeDistance: 150 } },
        layout: { hierarchical: { direction: 'UD', sortMethod: 'directed', levelSeparation: 100 } }
      };

      const network = new vis.Network(container, data, options);
      
      network.on("selectNode", function (params) {
        const nodeId = params.nodes[0];
        const details = document.getElementById('graphDetails');
        if (!details) return;
        
        const node = nodes.get(nodeId);
        details.innerHTML = `<b>${safe(node.label)}</b><hr style="border-color:var(--border);margin:8px 0">Type: ${safe(node.kind)}<br>${safe(node.detail || 'NO DETAIL AVAILABLE')}`;
      });

    } catch (e) {
      container.innerHTML = `<div style="padding: 24px; color: var(--danger);">Failed to load architecture graph: ${e.message}</div>`;
    }
  }

  async function renderRuntimeStatus() {
    try {
      const status = await api('/v2/system/status');
      const pmContent = $('pmContent');
      
      const renderItem = (name, isOk, extra) => `
        <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${isOk ? 'var(--success)' : 'var(--danger)'}; box-shadow: 0 0 8px ${isOk ? 'var(--success)' : 'var(--danger)'};"></div>
            <strong>${name}</strong>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">${isOk ? 'ONLINE' : 'OFFLINE / DEGRADED'} ${extra ? `&bull; ${extra}` : ''}</div>
        </div>
      `;

      pmContent.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
          ${renderItem('FÊNIX API', status.api?.ok, status.checkedAt || 'CHECK TIME NOT AVAILABLE')}
          ${renderItem('PostgreSQL', status.postgres?.ok, 'State Store')}
          ${renderItem('Redis / BullMQ', status.bullmq?.ok, `Jobs Waiting: ${status.bullmq?.waiting ?? '--'}`)}
          ${renderItem('Worker Pool', status.workers?.connected > 0, `Connected: ${status.workers?.connected ?? '--'}`)}
          ${renderItem('AI Providers', status.aiProviders?.ok, status.aiProviders?.configured ? 'CONFIGURED' : 'NOT CONFIGURED')}
          
          <h3 style="margin-top: 32px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">Job Activity</h3>
          <pre style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">${JSON.stringify(status.runtime?.jobs || {}, null, 2)}</pre>
        </div>
      `;
    } catch (e) {
      if ($('pmContent')) $('pmContent').innerHTML = `<div style="padding: 24px; color: var(--danger);">Failed to load runtime status: ${e.message}</div>`;
    }
  }

  window.showScreenDetail = async function(name) {
    const pmContent = $('pmContent');
    pmContent.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner ph-spin" style="font-size: 32px;"></i></div>';
    try {
      const data = await api(mirrorPath(`/project-mirror/screen/${encodeURIComponent(name)}`));
      const screen = data.screen;
      selectedScreen = { ...screen, projectId: data.projectId, workspaceId: data.workspaceId, projectPath: data.projectPath, git: data.git };
      const source = screen.sourceFiles?.[0] || { file: screen.file, line: screen.sourceLine || 1 };
      const sourceResponse = await api(`/project-mirror/source?path=${encodeURIComponent(data.projectPath)}&file=${encodeURIComponent(source.file)}&line=${encodeURIComponent(source.line || 1)}`);
      const preview = previewUrl(screen, data.projectPath);
      
      let html = `
        <div style="display: flex; gap: 24px; height: 100%;">
          <div style="flex: 2; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-base); display: flex; flex-direction: column;">
            <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 500;">Visual Preview</span>
              <span style="font-family: monospace; font-size: 12px; color: var(--text-muted);">${safe(screen.route)}</span>
            </div>
            <div style="display:flex; gap:8px; padding:8px; border-bottom:1px solid var(--border);">
              <button class="btn-primary-sm" data-screen-mode="preview">PREVIEW</button>
              <button class="btn-primary-sm" data-screen-mode="code">CODE</button>
              <button class="btn-primary-sm" data-screen-mode="split">SPLIT</button>
            </div>
            <div id="screenPreviewPane" style="flex: 1; min-height: 0; ${preview ? '' : 'display:flex;align-items:center;justify-content:center;color:var(--text-muted);'}">
              ${preview ? `<iframe id="selectedScreenFrame" title="Live preview ${safe(screen.name)}" src="${safe(preview)}" style="width:100%;height:100%;border:0;background:#fff"></iframe>` : 'PREVIEW NOT AVAILABLE'}
            </div>
            <pre id="screenCodePane" data-source-line="${Number(sourceResponse.line || 1)}" style="display:none; flex:1; min-height:0; overflow:auto; margin:0; padding:16px; background:#070711; color:var(--text-main); font:12px/1.55 var(--font-mono); white-space:pre;">${safe(sourceResponse.content)}</pre>
            <div style="padding:8px 12px;border-top:1px solid var(--border);font:11px var(--font-mono);color:var(--text-muted)">
              ${safe(source.file)}:${Number(sourceResponse.line || 1)} · ${Number(sourceResponse.bytes || 0)} bytes
            </div>
          </div>
          
          <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
            <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
              <h4 style="margin-top: 0;">Components</h4>
              <ul style="padding-left: 20px; font-family: monospace; font-size: 12px; margin-bottom: 0;">
                ${(screen.components || []).map(c => `<li>${safe(c.name || c.id)} <span style="color:var(--text-muted)">${safe(c.file)}:${Number(c.line || 1)}</span></li>`).join('') || '<li style="color:var(--text-muted)">NOT DETECTED</li>'}
              </ul>
            </div>

            <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
              <h4 style="margin-top: 0;">Elemento visual selecionado</h4>
              <p style="font-size:12px;color:var(--text-muted);margin:0 0 8px">Clique em qualquer item dentro do preview para anexá-lo ao prompt.</p>
              <pre id="selectedElementContext" style="font:11px/1.45 var(--font-mono);white-space:pre-wrap;margin:0">NENHUM ELEMENTO SELECIONADO</pre>
            </div>
            
            <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
              <h4 style="margin-top: 0;">APIs (Dependencies)</h4>
              <ul style="padding-left: 20px; font-family: monospace; font-size: 12px; margin-bottom: 0;">
                ${(data.relatedApis || []).map(a => `<li>${safe(a.method)} ${safe(a.path)} <span style="color:var(--text-muted)">${safe(a.definedAt || a.file)}</span></li>`).join('')}
                ${(data.relatedApis || []).length === 0 ? '<li style="color: var(--text-muted); list-style: none;">None detected explicitly</li>' : ''}
              </ul>
            </div>
            
            <button id="editSelectedScreenBtn" class="btn-primary">Edit Screen with AI</button>
          </div>
        </div>
      `;
      
      $('pmTitle').innerHTML = `<span style="cursor: pointer; color: var(--text-muted);" onclick="window.renderProjectSection('screens')">Screens</span> / ${screen.name}`;
      pmContent.innerHTML = html;
      const previewPane = $('screenPreviewPane');
      const codePane = $('screenCodePane');
      const previewFrame = $('selectedScreenFrame');
      selectedElement = null;
      previewFrame?.addEventListener('load', () => {
        try {
          const doc = previewFrame.contentDocument;
          if (!doc) return;
          doc.addEventListener('click', (event) => {
            const target = event.target?.closest?.('a,button,input,select,textarea,[id],[class]') || event.target;
            if (!target || target === doc.body || target === doc.documentElement) return;
            event.preventDefault();
            event.stopPropagation();
            doc.querySelectorAll('[data-fenix-selected]').forEach((element) => {
              element.style.outline = element.dataset.fenixPreviousOutline || '';
              delete element.dataset.fenixSelected;
              delete element.dataset.fenixPreviousOutline;
            });
            target.dataset.fenixPreviousOutline = target.style.outline || '';
            target.dataset.fenixSelected = 'true';
            target.style.outline = '3px solid #f97316';
            const selector = target.id
              ? `#${target.id}`
              : `${target.tagName.toLowerCase()}${Array.from(target.classList || []).slice(0, 3).map((name) => `.${name}`).join('')}`;
            selectedElement = {
              selector,
              tag: target.tagName.toLowerCase(),
              text: String(target.innerText || target.value || target.getAttribute?.('aria-label') || '').trim().slice(0, 300),
              html: target.outerHTML?.slice(0, 1200) || '',
            };
            if ($('selectedElementContext')) $('selectedElementContext').textContent = `${selector}\n${selectedElement.text || '(sem texto)'}`;
          }, true);
        } catch (error) {
          if ($('selectedElementContext')) $('selectedElementContext').textContent = `INSPEÇÃO INDISPONÍVEL: ${error.message}`;
        }
      });
      pmContent.querySelectorAll('[data-screen-mode]').forEach((button) => button.addEventListener('click', () => {
        const mode = button.dataset.screenMode;
        if (previewPane) { previewPane.style.display = mode === 'code' ? 'none' : 'block'; previewPane.style.flex = '1'; }
        if (codePane) { codePane.style.display = mode === 'preview' ? 'none' : 'block'; codePane.style.flex = '1'; }
        if (mode === 'split' && previewPane && codePane) { previewPane.style.width = '50%'; codePane.style.width = '50%'; previewPane.parentElement.style.flexDirection = 'column'; }
      }));
      $('editSelectedScreenBtn')?.addEventListener('click', () => {
        const input = $('masterPrompt') || $('prompt');
        const elementHint = selectedElement ? ` O elemento selecionado é ${selectedElement.selector}, texto "${selectedElement.text}".` : '';
        document.querySelector('[data-view="command"]')?.click();
        if (input) { input.value = `Na tela ${screen.name}, faça uma alteração pequena e segura.${elementHint}`; input.focus(); }
      });
    } catch (e) {
      pmContent.innerHTML = `<div style="color: var(--danger);">Error loading screen detail: ${e.message}</div>`;
    }
  };

  // Bind Sidebar Nav
  function initializeVisualIDE() {
    if (document.documentElement.dataset.fenixVisualIdeReady === 'true') return;
    document.documentElement.dataset.fenixVisualIdeReady = 'true';
    document.querySelectorAll('.pm-nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        renderProjectSection(e.currentTarget.dataset.pm);
      });
    });
    
    const pmScanBtn = $('pmScanBtn');
    if (pmScanBtn) {
      pmScanBtn.addEventListener('click', async () => {
        pmScanBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Scanning...';
        await api('/project-mirror/scan', { method: 'POST', body: JSON.stringify({ projectPath: selectedProjectPath() }) });
        await loadProjectMirror();
        pmScanBtn.innerHTML = '<i class="ph ph-scan"></i> Scan Real';
      });
    }

    // Command and Project views share the same real snapshot/cache.
    loadMirrorProjects().then(loadProjectMirror).catch((error) => {
      if ($('pmContent')) $('pmContent').textContent = `Falha ao listar projetos: ${error.message}`;
    });
    $('projectSwitcher')?.addEventListener('change', async () => {
      projectSnapshot = null;
      selectedScreen = null;
      selectedElement = null;
      await loadProjectMirror();
    });
    const masterForm = $('masterCmdForm');
    if (masterForm && !masterForm.dataset.fenixBound) {
      masterForm.dataset.fenixBound = 'true';
      masterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = $('masterPrompt');
        const value = input?.value || '';
        if (input) input.value = '';
        window.runChat(value);
      });
    }

    // Auto load when project view is opened
    document.querySelector('[data-view="project"]')?.addEventListener('click', () => {
      if (!projectSnapshot) loadProjectMirror();
    });
  }
  document.addEventListener('FENIX_READY', initializeVisualIDE);
  if (window.FENIX_READY) initializeVisualIDE();


  // ==========================================
  // FASE E: CHAT -> JOB REAL
  // ==========================================

  // We override the global runChat function to submit Jobs instead of autonomous cycles
  window.runChat = async function (message) {
    const value = String(message || '').trim();
    if (!value) return;
    
    // Bubble UI
    if (typeof bubble === 'function') bubble(value, 'user');
    
    const chatLog = $('chatLog');
    const pendingId = 'pipe-' + Date.now();
    const pending = document.createElement('div');
    pending.id = pendingId;
    pending.className = 'chat-bubble system'; // assuming style for system messages
    pending.innerHTML = `
      <div class="chat-text-wrapper" style="border-left: 3px solid var(--primary); padding-left: 12px; margin-bottom: 12px;">
        <strong style="color: var(--primary);">SYSTEM: FÊNIX JOB ENGINE</strong>
        <div class="chat-text">
          <i class="ph ph-spinner ph-spin"></i> Analyzing intent & creating Job in BullMQ...
        </div>
      </div>
    `;
    if (chatLog) {
      chatLog.appendChild(pending);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    try {
      if (!projectSnapshot) await loadProjectMirror();
      const screen = selectedScreen;
      const sourceFiles = (screen?.sourceFiles || []).map((source) => source.repositoryFile || source.file).filter(Boolean);
      const repositoryRoot = screen?.git?.repositoryRoot || projectSnapshot?.git?.repositoryRoot || projectSnapshot?.path;
      const screenContext = {
        projectId: screen?.projectId || projectSnapshot?.projectId || null,
        workspaceId: screen?.workspaceId || projectSnapshot?.workspaceId || null,
        screenId: screen?.id || null,
        route: screen?.route || null,
        sourceFiles,
        components: screen?.components || [],
        apiDependencies: screen?.apiDependencies || [],
        designSystem: projectSnapshot?.designSystem || { sourceFiles: [] },
        runtime: projectSnapshot?.runtime || null,
        gitStatus: projectSnapshot?.git || null,
        previewTarget: screen?.previewTarget || null,
        selectedElement: selectedElement ? { ...selectedElement } : null,
      };
      const gates = projectSnapshot?.git?.projectRelativePath === 'grg'
        ? [
          { name: 'project-mirror-contract', command: 'node', args: ['grg/test/project-mirror.test.js'] },
          { name: 'frontend-runtime-safety', command: 'node', args: ['grg/test/frontend-runtime-safety.test.js'] },
        ]
        : undefined;
      // 1. Send Prompt to create a Job
      const jobRes = await api('/v2/jobs', {
        method: 'POST',
        body: JSON.stringify({
          prompt: value,
          type: 'development.execute',
          source: 'web',
          projectId: screenContext.projectId,
          workspaceId: screenContext.workspaceId,
          screenId: screenContext.screenId,
          route: screenContext.route,
          workspace: repositoryRoot,
          riskLevel: 'MEDIUM',
          context: screenContext,
          policy: {
            allowedPaths: sourceFiles.length ? sourceFiles : [projectSnapshot?.git?.projectRelativePath && projectSnapshot.git.projectRelativePath !== '.' ? `${projectSnapshot.git.projectRelativePath}/**` : '**'],
            blockedPaths: ['.env', '.env.*', '**/.env', '**/.env.*', 'node_modules/**'],
            allowRollback: true,
            allowDeploy: false,
            maxIterations: 5,
            maxTokens: 100000,
          },
          payload: { prompt: value, projectPath: repositoryRoot, context: screenContext, ...(gates ? { gates } : {}) }
        })
      });

      // 2. Job Created - transition to Job Timeline view
      pending.innerHTML = `
        <div class="chat-text-wrapper" style="border-left: 3px solid var(--success); padding-left: 12px; margin-bottom: 12px;">
          <strong style="color: var(--success);">JOB QUEUED [${jobRes.jobId}]</strong>
          <div class="chat-text" style="margin-top: 8px;">
            The Job has been successfully queued to the workers.<br>
            <button class="btn-primary-sm" style="margin-top: 8px;" onclick="window.openJobTimeline('${jobRes.jobId}')">View Job Timeline</button>
          </div>
        </div>
      `;
      if ($('barActiveJob')) $('barActiveJob').textContent = jobRes.jobId;
      if ($('barWorker')) $('barWorker').textContent = jobRes.status || 'QUEUED';
    } catch (e) {
      pending.innerHTML = `
        <div class="chat-text-wrapper" style="border-left: 3px solid var(--danger); padding-left: 12px; margin-bottom: 12px;">
          <strong style="color: var(--danger);">ERROR CREATING JOB</strong>
          <div class="chat-text" style="margin-top: 8px;">${e.message}</div>
        </div>
      `;
      if ($('barActiveJob')) $('barActiveJob').textContent = 'ERROR';
      if ($('barWorker')) $('barWorker').textContent = e.message;
    }
  };


  // ==========================================
  // FASE D: JOB CENTER VISUAL & TIMELINE
  // ==========================================

  window.openJobTimeline = async function(jobId) {
    // Switch to Project View -> Jobs tab
    const projectBtn = document.querySelector('[data-view="project"]');
    if (projectBtn) projectBtn.click();
    
    renderProjectSection('jobs');
    
    const pmContent = $('pmContent');
    $('pmTitle').innerHTML = `Job Timeline: <span style="font-family: monospace;">${jobId}</span>`;
    pmContent.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner ph-spin" style="font-size: 32px;"></i></div>';

    // Start polling the job status
    pollJobTimeline(jobId);
  };

  async function pollJobTimeline(jobId) {
    const pmContent = $('pmContent');
    let isActive = true;
    
    // Cleanup old polling if any
    if (window._currentJobPoll) clearInterval(window._currentJobPoll);

    async function fetchRender() {
      if (!document.getElementById('view-project').classList.contains('active')) return;
      if ($('pmTitle').innerText.indexOf(jobId) === -1) {
        isActive = false;
        clearInterval(window._currentJobPoll);
        return;
      }

      try {
        const [job, eventsRes] = await Promise.all([
          api(`/v2/jobs/${jobId}`),
          api(`/v2/jobs/${jobId}/events`)
        ]);
        const diffEvidence = job.status === 'SUCCEEDED'
          ? await api(`/v2/jobs/${jobId}/diff`).catch(() => null)
          : null;

        const events = eventsRes.events || [];
        
        let statusColor = 'var(--text-muted)';
        if (job.status === 'RUNNING') statusColor = 'var(--primary)';
        if (job.status === 'SUCCEEDED') statusColor = 'var(--success)';
        if (job.status === 'FAILED') statusColor = 'var(--danger)';
        if (job.status === 'AWAITING_APPROVAL') statusColor = 'var(--warning)';

        let html = `
          <div style="display: flex; gap: 24px; max-width: 1200px; margin: 0 auto;">
            
            <div style="flex: 1; min-width: 300px;">
              <div style="background: var(--bg-surface); padding: 24px; border-radius: 8px; border: 1px solid var(--border); position: sticky; top: 24px;">
                <h3 style="margin-top: 0;">Job Context</h3>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: var(--text-muted);">Status</div>
                  <div style="font-size: 16px; font-weight: bold; color: ${statusColor};">${job.status}</div>
                </div>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: var(--text-muted);">Prompt</div>
                  <div style="font-size: 14px; background: var(--bg-base); padding: 8px; border-radius: 4px; margin-top: 4px;">${job.payload?.prompt || '--'}</div>
                </div>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: var(--text-muted);">Worker ID</div>
                  <div style="font-family: monospace; font-size: 12px;">${job.workerId || 'Pending Allocation'}</div>
                </div>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: var(--text-muted);">Project / Screen</div>
                  <div style="font-family: monospace; font-size: 12px;">${safe(job.projectId || 'NOT AVAILABLE')}<br>${safe(job.screenId || 'NOT AVAILABLE')} · ${safe(job.route || 'NOT AVAILABLE')}</div>
                </div>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: var(--text-muted);">Allowed Paths</div>
                  <div style="font-family: monospace; font-size: 11px; white-space:pre-wrap;">${safe((job.policy?.allowedPaths || []).join('\n') || 'NOT RESTRICTED')}</div>
                </div>
                
                ${job.status === 'AWAITING_APPROVAL' ? `
                  <div style="margin-top: 24px; padding: 16px; background: rgba(234,179,8,0.1); border: 1px solid var(--warning); border-radius: 8px;">
                    <h4 style="margin-top: 0; color: var(--warning);">Approval Required</h4>
                    <p style="font-size: 12px; margin-bottom: 16px;">This job requires manual approval to proceed with high-risk operations.</p>
                    <div style="display: flex; gap: 8px;">
                      <button class="btn-primary-sm" style="background: var(--success);" onclick="window.approveJob('${jobId}')">Approve</button>
                      <button class="btn-ghost" style="color: var(--danger);" onclick="window.rejectJob('${jobId}')">Reject</button>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="flex: 2;">
              <h3 style="margin-top: 0;">Timeline</h3>
              <div style="position: relative; padding-left: 24px;">
                <div style="position: absolute; left: 7px; top: 12px; bottom: 0; width: 2px; background: var(--border);"></div>
                
                ${events.length === 0 ? '<p style="color: var(--text-muted);">Waiting for worker events...</p>' : ''}
                
                ${events.map(ev => {
                  let icon = 'ph-check-circle';
                  let color = 'var(--text-muted)';
                  
                  if (ev.type === 'started') { icon = 'ph-play-circle'; color = 'var(--primary)'; }
                  if (ev.type === 'progress') { icon = 'ph-arrows-clockwise ph-spin'; color = 'var(--primary)'; }
                  if (ev.type === 'completed') { icon = 'ph-check-circle-fill'; color = 'var(--success)'; }
                  if (ev.type === 'failed') { icon = 'ph-x-circle-fill'; color = 'var(--danger)'; }
                  if (ev.type === 'ai_request') { icon = 'ph-cpu'; color = 'var(--info)'; }
                  
                  return `
                    <div style="position: relative; margin-bottom: 24px;">
                      <div style="position: absolute; left: -24px; top: 0px; background: var(--bg-base); border-radius: 50%; padding: 2px;">
                        <i class="ph ${icon}" style="font-size: 20px; color: ${color}; background: var(--bg-surface); border-radius: 50%;"></i>
                      </div>
                      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-left: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                          <strong style="font-size: 14px;">${safe(ev.message || ev.type)}</strong>
                          <span style="font-size: 11px; color: var(--text-muted);">${ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString() : '--'}</span>
                        </div>
                        ${ev.data ? `<pre style="margin: 0; padding: 8px; background: var(--bg-base); border-radius: 4px; font-size: 11px; max-height: 200px; overflow: auto;">${safe(JSON.stringify(ev.data, null, 2))}</pre>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
                
                ${job.status === 'RUNNING' ? `
                  <div style="position: relative; margin-bottom: 24px; opacity: 0.7;">
                      <div style="position: absolute; left: -24px; top: 0px; background: var(--bg-base); border-radius: 50%; padding: 2px;">
                        <i class="ph ph-spinner ph-spin" style="font-size: 20px; color: var(--primary); background: var(--bg-surface); border-radius: 50%;"></i>
                      </div>
                      <div style="margin-left: 12px; padding-top: 2px;">
                        <span style="font-size: 14px; color: var(--text-muted); font-style: italic;">Awaiting next event...</span>
                      </div>
                  </div>
                ` : ''}
              </div>
              ${job.result ? `
                <h3>Quality Evidence</h3>
                <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:16px">
                  <div><strong>Result:</strong> ${safe(job.result.status || job.status)}</div>
                  <div><strong>Tests:</strong> ${safe((job.tests || []).map((test) => `${test.name}: ${test.status}`).join(' · ') || 'NOT AVAILABLE')}</div>
                  <div><strong>Preview:</strong> ${safe(job.result.preview?.status || 'NOT AVAILABLE')}</div>
                  ${job.result.preview?.reason ? `<div style="color:var(--text-muted);font-size:12px;margin-top:6px">${safe(job.result.preview.reason)}</div>` : ''}
                </div>
                <h3>Code Diff</h3>
                <pre style="background:#070711;border:1px solid var(--border);border-radius:8px;padding:12px;max-height:420px;overflow:auto;white-space:pre-wrap">${safe(diffEvidence?.diff || job.result.diffPreview || 'DIFF NOT AVAILABLE')}</pre>
                ${job.policy?.allowRollback ? `<button class="btn-ghost" style="color:var(--danger);margin-top:12px" onclick="window.rollbackJob('${jobId}')">Rollback isolated worktree</button>` : ''}
              ` : ''}
            </div>
            
          </div>
        `;
        
        pmContent.innerHTML = html;
        
        if (job.status === 'SUCCEEDED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
          isActive = false;
          clearInterval(window._currentJobPoll);
        }
        
      } catch (e) {
        console.error("Job poll error", e);
      }
    }

    fetchRender();
    window._currentJobPoll = setInterval(() => {
      if (isActive) fetchRender();
    }, 2000); // Fast 2s polling for real-time feel
  };

  window.approveJob = async function(jobId) {
    if (!confirm('Are you sure you want to approve this job to proceed?')) return;
    try {
      await api(`/v2/jobs/${jobId}/approve`, { method: 'POST' });
      alert('Job approved.');
    } catch (e) {
      alert('Error approving: ' + e.message);
    }
  };

  window.rejectJob = async function(jobId) {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await api(`/v2/jobs/${jobId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      alert('Job rejected.');
    } catch (e) {
      alert('Error rejecting: ' + e.message);
    }
  };

  window.rollbackJob = async function(jobId) {
    if (!confirm('Remove the isolated worktree and its FÊNIX job branch?')) return;
    try {
      await api(`/v2/jobs/${jobId}/rollback`, { method: 'POST' });
      alert('Isolated worktree rolled back.');
    } catch (e) {
      alert('Rollback failed: ' + e.message);
    }
  };

})();
