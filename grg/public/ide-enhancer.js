let monacoEditorInstance = null;
let xtermInstance = null;

window.openFile = async function(path) {
  try {
    const data = await api(`/dev/fs/file?path=${encodeURIComponent(path)}`);
    const content = data.content || '';
    
    const filename = path.split('/').pop() || path.split('\\').pop() || 'untitled';
    if ($('currentEditorTitle')) $('currentEditorTitle').innerHTML = `${filename}`;
    
    if (monacoEditorInstance) {
      let ext = filename.split('.').pop();
      let lang = 'javascript';
      if (ext === 'json') lang = 'json';
      if (ext === 'html') lang = 'html';
      if (ext === 'css') lang = 'css';
      if (ext === 'md') lang = 'markdown';
      if (ext === 'py') lang = 'python';
      
      monaco.editor.setModelLanguage(monacoEditorInstance.getModel(), lang);
      monacoEditorInstance.setValue(content);
      
      // Update UI state
      document.querySelector('.visual-canvas').style.display = 'none';
      document.querySelector('.monaco-container').style.display = 'block';
    }
  } catch (error) {
    if (monacoEditorInstance) monacoEditorInstance.setValue(`Erro ao abrir:\n${error.message}`);
  }
};

window.loadFs = async function(path = '') {
  try {
    if ($('fsList')) $('fsList').innerHTML = '<div class="empty-state"><i class="ph ph-spinner ph-spin"></i><span>Carregando...</span></div>';
    
    const data = await api(`/dev/fs?path=${encodeURIComponent(path)}`);
    const items = data.items || [];
    
    if (items.length === 0) {
      if ($('fsList')) $('fsList').innerHTML = '<div class="empty-state"><i class="ph ph-folder-open empty-icon"></i><span>Diretório Vazio</span></div>';
      return;
    }
    
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    let html = '';
    if (path && path.length > 3) {
       const parent = path.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
       html += `<div class="fs-item dir" data-path="${parent}" data-type="dir"><i class="ph-fill ph-arrow-u-up-left"></i> <span>..</span></div>`;
    }

    items.forEach(item => {
      if (item.isDirectory) {
        html += `<div class="fs-item dir" data-path="${item.path}" data-type="dir"><i class="ph-fill ph-folder"></i> <span>${item.name}</span></div>`;
      } else {
        let icon = 'ph-file';
        if (item.name.endsWith('.js') || item.name.endsWith('.ts')) icon = 'ph-file-code';
        if (item.name.endsWith('.json')) icon = 'ph-brackets-curly';
        if (item.name.endsWith('.css')) icon = 'ph-paint-brush';
        if (item.name.endsWith('.html')) icon = 'ph-browser';
        html += `<div class="fs-item file" data-path="${item.path}" data-type="file"><i class="ph ${icon}"></i> <span>${item.name}</span></div>`;
      }
    });

    if ($('fsList')) {
      $('fsList').innerHTML = html;
      document.querySelectorAll('#fsList .fs-item').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('#fsList .fs-item').forEach(e => e.classList.remove('active'));
          el.classList.add('active');
          const p = el.dataset.path;
          if (el.dataset.type === 'file') {
            openFile(p);
          } else {
            if ($('fsPath')) $('fsPath').value = p;
            loadFs(p);
          }
        });
      });
    }
  } catch (error) {
    if ($('fsList')) $('fsList').innerHTML = `<div class="empty-state" style="color:var(--rose)"><i class="ph ph-warning"></i><span>${error.message}</span></div>`;
  }
};

window.bubble = function(message, who = 'bot') {
  const div = document.createElement('div');
  div.className = `chat-bubble chat-${who}`;
  
  const icon = who === 'bot' ? '<i class="ph-fill ph-robot"></i>' : '<i class="ph-fill ph-user"></i>';
  const name = who === 'bot' ? 'FÊNIX Mind <span class="badge-online">Online</span>' : 'Você';
  
  let contentHtml = message;
  if (who === 'bot' && window.marked) {
    contentHtml = marked.parse(message);
  } else {
    contentHtml = String(message).replace(/\n/g, '<br>');
  }

  div.innerHTML = `
    <div class="chat-avatar">${icon}</div>
    <div class="chat-text-wrapper">
      <strong>${name}</strong>
      <div class="chat-text">${contentHtml}</div>
    </div>
  `;
  
  if ($('chatLog')) {
    $('chatLog').appendChild(div);
    $('chatLog').scrollTop = $('chatLog').scrollHeight;
  }
};

// Add interceptor for Agent mini-list
const originalRenderAll = window.renderAll;
window.renderAll = function() {
  if (originalRenderAll) originalRenderAll();
  
  // Update agent list in right panel
  if ($('liveAgentsList') && window.state && window.state.data && window.state.data.workers) {
    const workers = window.state.data.workers;
    $('liveAgentsList').innerHTML = workers.map(w => {
      const isRunning = w.activeJobs > 0 || w.status === 'RUNNING';
      const statusCls = isRunning ? 'status-running' : 'status-idle';
      const statusTxt = isRunning ? 'RUNNING' : 'IDLE';
      const role = w.role || 'System Agent';
      return `
        <div class="agent-mini">
          <div class="agent-mini-info">
            <i class="ph-fill ph-cpu"></i>
            <div>
              <div class="agent-mini-name">${esc(w.name || w.id)}</div>
              <div style="font-size:9px; color:var(--text-muted);">${esc(role)}</div>
            </div>
          </div>
          <div class="agent-mini-status ${statusCls}">${statusTxt}</div>
        </div>
      `;
    }).join('');
  }
};

window.addEventListener('load', () => {
  // Navigation Routing
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      const viewId = 'view-' + btn.dataset.view;
      if ($(viewId)) $(viewId).classList.add('active');
    });
  });

  // Editor Toolbar Switcher
  const toolBtns = document.querySelectorAll('.editor-toolbar .toolbar-btn');
  toolBtns.forEach(btn => {
    if (btn.textContent === 'Visual' || btn.textContent === 'Código' || btn.textContent === 'Split') {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.textContent === 'Visual') {
          document.querySelector('.monaco-container').style.display = 'none';
          document.querySelector('.visual-canvas').style.display = 'flex';
          $('previewIframe').src = 'http://localhost:4400/app'; // Fênix Own View
        } else if (btn.textContent === 'Código') {
          document.querySelector('.monaco-container').style.display = 'block';
          document.querySelector('.visual-canvas').style.display = 'none';
        } else {
          document.querySelector('.monaco-container').style.display = 'block';
          document.querySelector('.visual-canvas').style.display = 'flex';
        }
      });
    }
  });

  // Init Monaco
  if (window.require && document.getElementById('monacoEditor')) {
    require(['vs/editor/editor.main'], function() {
      monacoEditorInstance = monaco.editor.create(document.getElementById('monacoEditor'), {
        value: '// FÊNIX OS Level 10 IDE\n// Conectado ao kernel local.',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true, scale: 0.75 },
        fontSize: 13,
        fontFamily: '"JetBrains Mono", monospace',
        padding: { top: 16 }
      });
    });
  }

  // Init Xterm
  if (window.Terminal && document.getElementById('xtermContainer')) {
    xtermInstance = new Terminal({
      theme: { background: '#000000', foreground: '#c9d1d9', cursor: '#2f81f7', selectionBackground: 'rgba(47,129,247,0.3)' },
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      cursorBlink: true
    });
    const fitAddon = new FitAddon.FitAddon();
    xtermInstance.loadAddon(fitAddon);
    xtermInstance.open(document.getElementById('xtermContainer'));
    fitAddon.fit();
    window.addEventListener('resize', () => fitAddon.fit());
    xtermInstance.writeln('\x1b[36m⚡ FÊNIX OS AI Terminal\x1b[0m');
  }

  // Terminal Run
  if ($('terminalBtn')) {
    const oldBtn = $('terminalBtn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    
    // Bind input Enter key as well
    if ($('terminalCmd')) {
      $('terminalCmd').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') newBtn.click();
      });
    }
    
    newBtn.addEventListener('click', async () => {
      const cmd = $('terminalCmd') ? $('terminalCmd').value : '';
      if (!cmd) return;
      if (xtermInstance) xtermInstance.writeln(`\r\n\x1b[32m$ ${cmd}\x1b[0m`);
      $('terminalCmd').value = '';
      
      try {
        const out = await api('/dev/terminal', { method: 'POST', body: JSON.stringify({ command: cmd, sessionId: `ui-${Date.now()}` }) });
        if (xtermInstance) {
          if (out.stdout) xtermInstance.write(out.stdout.replace(/\n/g, '\r\n'));
          if (out.stderr) xtermInstance.write(`\x1b[31m${out.stderr.replace(/\n/g, '\r\n')}\x1b[0m`);
        }
      } catch (err) {
        if (xtermInstance) xtermInstance.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
      }
    });
  }
  
  if ($('clearTerminalBtn') && xtermInstance) {
    $('clearTerminalBtn').addEventListener('click', () => xtermInstance.clear());
  }

  setTimeout(() => {
    if ($('fsPath') && $('fsPath').value) {
      loadFs($('fsPath').value);
    }
  }, 500);
});
// Append visual editor capability to ide-enhancer.js
window.addEventListener('load', () => {
  const iframe = document.getElementById('previewIframe');
  const overlay = document.getElementById('visualOverlay');
  if (iframe && overlay) {
    iframe.addEventListener('load', () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        // Inject a simple hover highlighter into the iframe
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          .fenix-visual-hover { outline: 2px solid #2f81f7 !important; cursor: crosshair !important; background: rgba(47,129,247,0.1) !important; }
        `;
        iframeDoc.head.appendChild(style);

        let lastHovered = null;
        iframeDoc.body.addEventListener('mousemove', (e) => {
          if (lastHovered) lastHovered.classList.remove('fenix-visual-hover');
          lastHovered = e.target;
          if (lastHovered) lastHovered.classList.add('fenix-visual-hover');
        });

        iframeDoc.body.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const target = e.target;
          const tagName = target.tagName.toLowerCase();
          const id = target.id ? `#${target.id}` : '';
          const cls = target.className && typeof target.className === 'string' ? `.${target.className.replace('fenix-visual-hover', '').trim().replace(/\s+/g, '.')}` : '';
          
          const promptInput = document.getElementById('prompt');
          if (promptInput) {
            promptInput.value = `Edite o elemento visual: ${tagName}${id}${cls} \nO que você deseja mudar?`;
            promptInput.focus();
            
            // Auto switch back to chat view if needed
            document.querySelectorAll('.panel-tab')[0].click();
          }
        });
      } catch (e) {
        console.warn('Iframe cross-origin or load error:', e);
      }
    });
  }
});
// Add Panel Tab logic
window.addEventListener('load', () => {
  const pTabs = document.querySelectorAll('.panel-left .panel-tab');
  pTabs.forEach(t => {
    t.addEventListener('click', () => {
      pTabs.forEach(b => b.classList.remove('active'));
      t.classList.add('active');
      
      document.querySelector('.chat-view').style.display = 'none';
      if (document.getElementById('memoryView')) document.getElementById('memoryView').style.display = 'none';
      if (document.getElementById('graphView')) document.getElementById('graphView').style.display = 'none';
      
      if (t.textContent === 'CHAT') {
        document.querySelector('.chat-view').style.display = 'flex';
      } else if (t.textContent === 'MEMÓRIA') {
        if (document.getElementById('memoryView')) document.getElementById('memoryView').style.display = 'flex';
        loadMemory();
      } else if (t.textContent === 'GRAFO') {
        if (document.getElementById('graphView')) document.getElementById('graphView').style.display = 'block';
        loadGraph();
      }
    });
  });

  async function loadMemory() {
    try {
      if ($('memoryItems')) $('memoryItems').innerHTML = '<i>Carregando memória...</i>';
      // Mocks if not exists
      const memoryApi = await api('/api/v2/mind/memory/project/fenix_test_lab').catch(() => ({}));
      
      let html = '';
      if (memoryApi.projectMemory && memoryApi.projectMemory.patterns) {
        memoryApi.projectMemory.patterns.forEach(m => {
          html += `<div style="background:var(--bg-input); padding:8px; border-radius:6px; border:1px solid var(--border);">
            <strong style="color:var(--accent);">${m.name || 'Padrão'}</strong>
            <div style="color:var(--text-muted); margin-top:4px;">${m.description || ''}</div>
          </div>`;
        });
      } else {
        html = '<div class="empty-state"><i class="ph ph-brain"></i> Nenhuma memória ativa no RAG.</div>';
      }
      if ($('memoryItems')) $('memoryItems').innerHTML = html;
    } catch(e) {}
  }

  async function loadGraph() {
    if (!window.vis) return;
    const container = document.getElementById('networkGraph');
    if (container.dataset.loaded) return;
    container.dataset.loaded = "true";
    
    try {
      const gData = await api('/graph').catch(() => ({}));
      const nodes = new vis.DataSet(gData.nodes || [
        { id: 1, label: 'FÊNIX Kernel', shape: 'hexagon', color: '#2f81f7' },
        { id: 2, label: 'React Frontend', shape: 'box', color: '#8957e5' },
        { id: 3, label: 'Node Backend', shape: 'box', color: '#238636' },
        { id: 4, label: 'Agents Swarm', shape: 'ellipse', color: '#d29922' }
      ]);
      const edges = new vis.DataSet(gData.edges || [
        { from: 1, to: 2, arrows: 'to' },
        { from: 1, to: 3, arrows: 'to' },
        { from: 1, to: 4, arrows: 'to' },
        { from: 4, to: 2, arrows: 'to' }
      ]);
      const data = { nodes, edges };
      const options = {
        nodes: { font: { color: '#ffffff' }, borderWidth: 2 },
        edges: { color: '#30363d' },
        physics: { stabilization: true }
      };
      new vis.Network(container, data, options);
    } catch(e) {}
  }
});
