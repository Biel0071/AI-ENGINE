// This file loads before unified-app.js. Keep its DOM helper local to avoid
// depending on a later script and avoid the fatal `$ is not defined` boot error.
const fenixIdeGet = (id) => document.getElementById(id);
let monacoEditorInstance = null;
let xtermInstance = null;

window.openFile = async function(path) {
  try {
    const data = await api(`/dev/fs/file?path=${encodeURIComponent(path)}`);
    const content = data.content || '';
    
    const filename = path.split('/').pop() || path.split('\\').pop() || 'untitled';
    if (fenixIdeGet('currentEditorTitle')) fenixIdeGet('currentEditorTitle').innerHTML = `${filename}`;
    
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
      const visualCanvas = document.querySelector('.visual-canvas');
      const monacoContainer = document.querySelector('.monaco-container');
      if (visualCanvas) visualCanvas.style.display = 'none';
      if (monacoContainer) monacoContainer.style.display = 'block';
    }
  } catch (error) {
    if (monacoEditorInstance) monacoEditorInstance.setValue(`Erro ao abrir:\n${error.message}`);
  }
};

window.loadFs = async function(path = '') {
  try {
    if (fenixIdeGet('fsList')) fenixIdeGet('fsList').innerHTML = '<div class="empty-state"><i class="ph ph-spinner ph-spin"></i><span>Carregando...</span></div>';
    
    const data = await api(`/dev/fs?path=${encodeURIComponent(path)}`);
    const items = data.items || [];
    
    if (items.length === 0) {
      if (fenixIdeGet('fsList')) fenixIdeGet('fsList').innerHTML = '<div class="empty-state"><i class="ph ph-folder-open empty-icon"></i><span>Diretório Vazio</span></div>';
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

    if (fenixIdeGet('fsList')) {
      fenixIdeGet('fsList').innerHTML = html;
      document.querySelectorAll('#fsList .fs-item').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('#fsList .fs-item').forEach(e => e.classList.remove('active'));
          el.classList.add('active');
          const p = el.dataset.path;
          if (el.dataset.type === 'file') {
            openFile(p);
          } else {
            if (fenixIdeGet('fsPath')) fenixIdeGet('fsPath').value = p;
            loadFs(p);
          }
        });
      });
    }
  } catch (error) {
    if (fenixIdeGet('fsList')) fenixIdeGet('fsList').innerHTML = `<div class="empty-state" style="color:var(--rose)"><i class="ph ph-warning"></i><span>${error.message}</span></div>`;
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
  
  if (fenixIdeGet('chatLog')) {
    fenixIdeGet('chatLog').appendChild(div);
    fenixIdeGet('chatLog').scrollTop = fenixIdeGet('chatLog').scrollHeight;
  }
};

// Add interceptor for Agent mini-list
const originalRenderAll = window.renderAll;
window.renderAll = function() {
  if (originalRenderAll) originalRenderAll();
  
  // Update agent list in right panel
  if (fenixIdeGet('liveAgentsList') && window.state && window.state.data && window.state.data.workers) {
    const rawWorkers = window.state.data.workers;
    const workers = Array.isArray(rawWorkers) ? rawWorkers : (rawWorkers?.workers || rawWorkers?.items || []);
    fenixIdeGet('liveAgentsList').innerHTML = workers.map(w => {
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
      if (fenixIdeGet(viewId)) fenixIdeGet(viewId).classList.add('active');
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
          fenixIdeGet('previewIframe').src = '/app?is_preview=true'; // Fênix Own View
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
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
    require(['vs/editor/editor.main'], function() {
      monacoEditorInstance = monaco.editor.create(document.getElementById('monacoEditor'), {
        value: '// FÊNIX OS Level 10 IDE\n// Conectado ao kernel local.',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
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
  if (fenixIdeGet('terminalBtn')) {
    const oldBtn = fenixIdeGet('terminalBtn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    
    // Bind input Enter key as well
    if (fenixIdeGet('terminalCmd')) {
      fenixIdeGet('terminalCmd').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') newBtn.click();
      });
    }
    
    newBtn.addEventListener('click', async () => {
      const cmd = fenixIdeGet('terminalCmd') ? fenixIdeGet('terminalCmd').value : '';
      if (!cmd) return;
      if (xtermInstance) xtermInstance.writeln(`\r\n\x1b[32m$ ${cmd}\x1b[0m`);
      fenixIdeGet('terminalCmd').value = '';
      
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
  
  if (fenixIdeGet('clearTerminalBtn') && xtermInstance) {
    fenixIdeGet('clearTerminalBtn').addEventListener('click', () => xtermInstance.clear());
  }

  setTimeout(() => {
    if (fenixIdeGet('fsPath') && fenixIdeGet('fsPath').value) {
      loadFs(fenixIdeGet('fsPath').value);
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
      
      const chatView = document.querySelector('.chat-view');
      if (chatView) chatView.style.display = 'none';
      if (document.getElementById('memoryView')) document.getElementById('memoryView').style.display = 'none';
      if (document.getElementById('graphView')) document.getElementById('graphView').style.display = 'none';
      const historyView = document.getElementById('chatHistoryView');
      if (historyView) historyView.style.display = 'none';
      
      if (t.textContent === 'CHAT') {
        if (chatView) chatView.style.display = 'flex';
      } else if (t.textContent === 'MEMÓRIA') {
        if (document.getElementById('memoryView')) document.getElementById('memoryView').style.display = 'flex';
        loadMemory();
      } else if (t.textContent === 'GRAFOS') {
        if (document.getElementById('graphView')) document.getElementById('graphView').style.display = 'block';
        loadGraph();
      } else if (t.textContent === 'HISTÓRICO') {
        if (historyView) historyView.style.display = 'flex';
        renderChatHistory();
      }
    });
  });

  async function loadMemory() {
    try {
      if (fenixIdeGet('memoryItems')) fenixIdeGet('memoryItems').innerHTML = '<i>Carregando memória...</i>';
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
      if (fenixIdeGet('memoryItems')) fenixIdeGet('memoryItems').innerHTML = html;
    } catch(e) {}
  }

  function renderChatHistory() {
    const target = fenixIdeGet('chatHistoryList');
    if (!target) return;
    let turns = [];
    try { turns = JSON.parse(localStorage.getItem('fenix_chat_history_v1') || '[]'); } catch { turns = []; }
    const groups = [];
    for (let i = 0; i < turns.length; i += 2) {
      const user = turns[i]?.role === 'user' ? turns[i] : null;
      const assistant = turns[i + 1]?.role === 'assistant' ? turns[i + 1] : null;
      if (user) groups.push({ user, assistant });
    }
    target.innerHTML = groups.length ? groups.reverse().map((item, index) => `<button class="history-item" data-history-index="${groups.length - index - 1}"><i class="ph ph-chat-circle"></i><span>${esc(item.user.content.slice(0, 80))}<small>${item.assistant ? esc(item.assistant.content.slice(0, 100)) : 'sem resposta'}</small></span></button>`).join('') : '<div class="empty-state">Nenhuma conversa salva ainda.</div>';
    target.querySelectorAll('[data-history-index]').forEach((button) => button.addEventListener('click', () => {
      const item = groups[Number(button.dataset.historyIndex)];
      if (!item) return;
      const log = fenixIdeGet('chatLog');
      if (log) { log.innerHTML = ''; bubble(item.user.content, 'user'); if (item.assistant) bubble(item.assistant.content, 'bot'); }
    }));
  }

  async function loadGraph() {
    if (!window.vis) return;
    const container = document.getElementById('networkGraph');
    if (container.dataset.loaded) return;
    container.dataset.loaded = "true";
    
    try {
      const gData = await api('/graph');
      const nodes = new vis.DataSet(Array.isArray(gData.nodes) ? gData.nodes : []);
      const edges = new vis.DataSet(Array.isArray(gData.edges) ? gData.edges : []);
      if (!nodes.get().length) {
        container.innerHTML = '<div class="empty-state">Nenhum nó real publicado pelo Codebase Graph.</div>';
        return;
      }
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



  // Resizing Logic
  const splitLeft = document.getElementById('splitLeft');
  const splitRight = document.getElementById('splitRight');
  const panelLeft = document.getElementById('idePanelLeft');
  const panelRight = document.getElementById('idePanelRight');
  const layout = document.querySelector('.ide-split-layout');
  
  let isDragging = null;
  
  if (splitLeft) splitLeft.addEventListener('mousedown', () => isDragging = 'left');
  if (splitRight) splitRight.addEventListener('mousedown', () => isDragging = 'right');
  
  document.addEventListener('mousemove', (e) => {
     if (!isDragging || !layout) return;
     const rect = layout.getBoundingClientRect();
     if (isDragging === 'left') {
        const w = e.clientX - rect.left;
        if (w > 100 && w < rect.width - 200) panelLeft.style.width = w + 'px';
     } else if (isDragging === 'right') {
        const w = rect.right - e.clientX;
        if (w > 100 && w < rect.width - 200) panelRight.style.width = w + 'px';
     }
  });
  
  document.addEventListener('mouseup', () => isDragging = null);
  
  // Swap Panels Logic
  const swapBtn = document.createElement('button');
  swapBtn.className = 'icon-btn-small';
  swapBtn.innerHTML = '<i class="ph ph-arrows-left-right"></i>';
  swapBtn.title = 'Inverter Lados';
  const rightHeader = document.querySelector('#idePanelRight .header-actions');
  if (rightHeader) {
     rightHeader.insertBefore(swapBtn, rightHeader.firstChild);
     swapBtn.addEventListener('click', () => {
        const isReversed = layout.style.flexDirection === 'row-reverse';
        layout.style.flexDirection = isReversed ? 'row' : 'row-reverse';
     });
  }
  const splitBottom = document.getElementById('splitBottom');
  const termPanel = document.getElementById('globalTerminalPanel');
  
  if (splitBottom) splitBottom.addEventListener('mousedown', () => isDragging = 'bottom');
  
  document.addEventListener('mousemove', (e) => {
     if (isDragging === 'bottom' && termPanel) {
        const h = window.innerHeight - e.clientY;
        if (h > 100 && h < window.innerHeight - 200) termPanel.style.height = h + 'px';
     }
  });

  const closeTerm = document.getElementById('closeTerminalBtn');
  if (closeTerm) closeTerm.addEventListener('click', () => {
      termPanel.style.display = 'none';
  });
