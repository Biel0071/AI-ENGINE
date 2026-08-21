let monacoEditorInstance = null;
let xtermInstance = null;

window.openFile = async function(path) {
  try {
    const data = await api(`/dev/fs/file?path=${encodeURIComponent(path)}`);
    const content = data.content || '';
    
    window.currentOpenPath = path; const filename = path.split('/').pop() || path.split('\\').pop() || 'untitled';
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

  setTimeout(() => { if ($('fsPath')) loadFs($('fsPath').value || '/'); }, 500);
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

// AI City Dashboard Logic
window.addEventListener('load', () => {
  const cityBtn = document.querySelector('[data-view="city"]');
  if (cityBtn) {
    cityBtn.addEventListener('click', () => {
      loadCityModels();
      loadCityRepos();
      if (window.initCityCanvas) window.initCityCanvas();
    });
  }

  async function loadCityModels() {
    try {
      if (!$('modelsList')) return;
      $('modelsList').innerHTML = '<i class="ph ph-spinner ph-spin"></i> Sincronizando Modelos...';
      const res = await api('/api/v2/mind/models').catch(() => ({}));
      let html = '';
      if (res.models && res.models.length > 0) {
        res.models.forEach(m => {
          html += `<div style="background: rgba(47,129,247,0.1); border: 1px solid rgba(47,129,247,0.3); padding: 8px; border-radius: 4px; font-size: 11px;">
            <strong style="color: var(--accent);">${m.id}</strong><br/>
            <span style="color: var(--text-muted);">${m.provider} - Context: ${m.maxContext || 'N/A'}</span>
          </div>`;
        });
      } else {
        html = '<div class="empty-state">Nenhum modelo retornado pela API.</div>';
      }
      $('modelsList').innerHTML = html;
    } catch(e) {}
  }

  async function loadCityRepos() {
    try {
      if (!$('reposList')) return;
      $('reposList').innerHTML = '<i class="ph ph-spinner ph-spin"></i> Sincronizando Repositórios...';
      const res = await api('/projects').catch(() => ({}));
      let html = '';
      if (res.projects && res.projects.length > 0) {
        res.projects.forEach(p => {
          html += `<div style="background: var(--bg-input); border: 1px solid var(--border); padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;" onclick="document.querySelector('.brand-logo').click()">
            <strong style="color: var(--green);"><i class="ph-fill ph-folder"></i> ${p.id}</strong><br/>
            <span style="color: var(--text-muted);">Status: ${p.status || 'Active'}</span>
          </div>`;
        });
      } else {
        // Fallback or self-repo
        html = `<div style="background: var(--bg-input); border: 1px solid var(--border); padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">
            <strong style="color: var(--green);"><i class="ph-fill ph-folder"></i> ai-engine-core (FÊNIX IDE)</strong><br/>
            <span style="color: var(--text-muted);">Master Agentic Repo</span>
          </div>`;
      }
      $('reposList').innerHTML = html;
    } catch(e) {}
  }
});
  window.initCityCanvas = function() {
    const canvas = document.getElementById('cityCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;

    // Camera / Pan / Zoom
    let camera = { x: 0, y: 0, zoom: 1 };
    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };

    function resize() {
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse Controls
    canvas.parentElement.addEventListener('mousedown', (e) => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        camera.x += (e.clientX - lastMouse.x) / camera.zoom;
        camera.y += (e.clientY - lastMouse.y) / camera.zoom;
        lastMouse = { x: e.clientX, y: e.clientY };
      }
    });
    canvas.parentElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
      camera.zoom = Math.max(0.2, Math.min(camera.zoom * zoomAmount, 3));
    });

    const TILE_W = 100;
    const TILE_H = 50;
    const GRID_SIZE = 15;

    function toIso(x, y) {
      return {
        isoX: (x - y) * (TILE_W / 2),
        isoY: (x + y) * (TILE_H / 2)
      };
    }

    function drawIsometricTile(x, y, color = 'rgba(20, 20, 25, 0.8)', stroke = '#30363d') {
      const pt = toIso(x, y);
      ctx.beginPath();
      ctx.moveTo(pt.isoX, pt.isoY - TILE_H / 2);
      ctx.lineTo(pt.isoX + TILE_W / 2, pt.isoY);
      ctx.lineTo(pt.isoX, pt.isoY + TILE_H / 2);
      ctx.lineTo(pt.isoX - TILE_W / 2, pt.isoY);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }

    function drawBuilding(x, y, heightZ, colorMain, colorSide, label) {
      const pt = toIso(x, y);
      const h = heightZ;

      // Left face
      ctx.beginPath();
      ctx.moveTo(pt.isoX - TILE_W / 2, pt.isoY);
      ctx.lineTo(pt.isoX, pt.isoY + TILE_H / 2);
      ctx.lineTo(pt.isoX, pt.isoY + TILE_H / 2 - h);
      ctx.lineTo(pt.isoX - TILE_W / 2, pt.isoY - h);
      ctx.closePath();
      ctx.fillStyle = colorSide;
      ctx.fill();
      ctx.stroke();

      // Right face
      ctx.beginPath();
      ctx.moveTo(pt.isoX, pt.isoY + TILE_H / 2);
      ctx.lineTo(pt.isoX + TILE_W / 2, pt.isoY);
      ctx.lineTo(pt.isoX + TILE_W / 2, pt.isoY - h);
      ctx.lineTo(pt.isoX, pt.isoY + TILE_H / 2 - h);
      ctx.closePath();
      ctx.fillStyle = colorMain;
      ctx.fill();
      ctx.stroke();

      // Top face
      ctx.beginPath();
      ctx.moveTo(pt.isoX, pt.isoY - TILE_H / 2 - h);
      ctx.lineTo(pt.isoX + TILE_W / 2, pt.isoY - h);
      ctx.lineTo(pt.isoX, pt.isoY + TILE_H / 2 - h);
      ctx.lineTo(pt.isoX - TILE_W / 2, pt.isoY - h);
      ctx.closePath();
      ctx.fillStyle = colorMain;
      ctx.fill();
      ctx.stroke();

      // Label
      if (label && camera.zoom > 0.5) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label.length > 25 ? label.substring(0, 22) + "..." : label, pt.isoX, pt.isoY - h - 20);
      }
    }

    let time = 0;

    window.drawCity = function() {
      if (!$('#view-city') || !$('#view-city').classList.contains('active')) return;
      time += 0.05;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 4);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(camera.x, camera.y);

      // Draw Base Grid (Tibia/Habbo floor)
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          const isRoad = (x === 7 || y === 7);
          const color = isRoad ? 'rgba(30, 30, 35, 0.9)' : 'rgba(15, 15, 20, 0.9)';
          drawIsometricTile(x, y, color, '#222');
        }
      }

      // Draw "Empresas" / Nodes
      const nodes = window.globalCityState?.city?.nodes || window.globalCityState?.projects || [];
      if (nodes.length > 0) {
        nodes.slice(0, 25).forEach((n, i) => {
          const gx = (i % 5) * 3 + 1;
          const gy = Math.floor(i / 5) * 3 + 1;
          const h = 40 + Math.abs(Math.sin(time + i) * 10);
          drawBuilding(gx, gy, h, '#b91c1c', '#7f1d1d', n.id || n.name || n.label);
        });
      } else {
        // Mock default city if no nodes
        drawBuilding(2, 2, 80, '#b91c1c', '#7f1d1d', 'FÊNIX HQ');
        drawBuilding(10, 3, 60, '#238636', '#166534', 'Data Center');
        drawBuilding(4, 10, 50, '#d29922', '#854d0e', 'Agents Swarm');
      }

      // Draw floating agents
      const pt = toIso(7, 7); // Center road
      const floatY = Math.sin(time * 2) * 10;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(pt.isoX, pt.isoY - 30 + floatY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#38bdf8';
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();
      requestAnimationFrame(window.drawCity);
    };

    window.drawCity();
  };
  // --- IDE ACTIONS & CHAT HOOKUP ---
  window.addEventListener('load', () => {
    const cmdForm = document.getElementById('cmdForm');
    const promptInput = document.getElementById('prompt');
    const chatLog = document.getElementById('chatLog');

    if (cmdForm) {
      // Allow Enter to submit (Shift+Enter for newline)
      promptInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          cmdForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      });

      cmdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = promptInput?.value.trim();
        if (!text) return;
        
        // Append user message
        chatLog.innerHTML += `
          <div class="chat-bubble chat-user" style="align-self: flex-end; background: var(--border); padding: 12px; border-radius: 8px; margin: 8px 0; max-width: 85%;">
            <div class="chat-text">${text.replace(/</g, '&lt;')}</div>
          </div>
        `;
        if (promptInput) promptInput.value = '';
        chatLog.scrollTop = chatLog.scrollHeight;
        
        // Loader
        const loaderId = 'loader-' + Date.now();
        chatLog.innerHTML += `
          <div id="${loaderId}" class="chat-bubble chat-bot" style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
            <i class="ph ph-spinner ph-spin" style="color: var(--accent);"></i> Processando...
          </div>
        `;
        chatLog.scrollTop = chatLog.scrollHeight;

        try {
          const res = await fetch('/api/v2/mind/ingest', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ message: text, source: 'ide_chat' })
          });
          const data = await res.json();
          
          document.getElementById(loaderId)?.remove();
          
          if (data.success) {
            // Append success message
            chatLog.innerHTML += `
              <div class="chat-bubble chat-bot" style="background: rgba(185,28,28,0.1); border-left: 2px solid var(--accent); padding: 12px; border-radius: 8px; margin: 8px 0;">
                <div class="chat-text">
                  <strong><i class="ph-fill ph-check-circle"></i> Intenção Identificada: ${data.intent}</strong><br>
                  Execução autônoma disparada. Score de Realidade: ${data.realityScore}%<br>
                  <small style="color: var(--text-muted);">Agents: ${(data.requiredAgents || []).join(', ')}</small>
                </div>
              </div>
            `;
            // Refresh models/jobs
            if (window.refreshAll) window.refreshAll();
          } else {
            throw new Error(data.error || 'Erro interno.');
          }
        } catch (err) {
          document.getElementById(loaderId)?.remove();
          chatLog.innerHTML += `
            <div class="chat-bubble chat-bot" style="background: rgba(220,38,38,0.1); border-left: 2px solid var(--rose); padding: 12px; border-radius: 8px; margin: 8px 0;">
              <div class="chat-text" style="color: var(--rose);">Erro: ${err.message}</div>
            </div>
          `;
        }
        chatLog.scrollTop = chatLog.scrollHeight;
      });
    }
  });
  // Fix Tab Switching for Left Panel (Agents, Jobs, Graph)
  window.addEventListener('load', () => {
    const panels = ['CHAT', 'AGENTS', 'JOBS', 'MEMÓRIA', 'GRAFO'];
    
    // Inject missing panel divs if they don't exist
    const ideLeftPanel = document.querySelector('.panel-left');
    if (ideLeftPanel) {
      if (!document.querySelector('.agents-view')) ideLeftPanel.innerHTML += `<div class="panel-content agents-view" style="display:none;"><div class="empty-state"><i class="ph ph-users"></i> Agents Swarm Loading...</div></div>`;
      if (!document.querySelector('.jobs-view')) ideLeftPanel.innerHTML += `<div class="panel-content jobs-view" style="display:none;"><div class="empty-state"><i class="ph ph-briefcase"></i> Jobs Queue...</div></div>`;
      if (!document.querySelector('.memory-view')) ideLeftPanel.innerHTML += `<div class="panel-content memory-view" style="display:none;"><div class="empty-state"><i class="ph ph-brain"></i> Memory Base...</div></div>`;
      if (!document.querySelector('.graph-view')) ideLeftPanel.innerHTML += `<div class="panel-content graph-view" style="display:none;"><div class="empty-state"><i class="ph ph-graph"></i> Knowledge Graph...</div></div>`;
    }

    const pTabs = document.querySelectorAll('.panel-left .panel-tab');
    pTabs.forEach(t => {
      t.addEventListener('click', () => {
        pTabs.forEach(b => b.classList.remove('active'));
        t.classList.add('active');
        
        // Hide all
        document.querySelectorAll('.panel-left .panel-content').forEach(el => el.style.display = 'none');
        
        // Show specific
        const txt = t.textContent.trim();
        if (txt === 'CHAT') document.querySelector('.chat-view').style.display = 'flex';
        else if (txt === 'AGENTS') document.querySelector('.agents-view').style.display = 'flex';
        else if (txt === 'JOBS') document.querySelector('.jobs-view').style.display = 'flex';
        else if (txt === 'MEMÓRIA') document.querySelector('.memory-view').style.display = 'flex';
        else if (txt === 'GRAFO') document.querySelector('.graph-view').style.display = 'flex';
      });
    });

    // Fix Visual Canvas hide issue
    window.openFile = async function(path) {
      try {
        const data = await api(`/dev/fs/file?path=${encodeURIComponent(path)}`);
        const content = data.content || '';
        
        window.currentOpenPath = path; const filename = path.split('/').pop() || path.split('\\').pop() || 'untitled';
        if (document.getElementById('currentEditorTitle')) document.getElementById('currentEditorTitle').innerHTML = `${filename}`;
        
        if (window.monacoEditorInstance) {
          let ext = filename.split('.').pop();
          let lang = 'javascript';
          if (ext === 'json') lang = 'json';
          if (ext === 'html') lang = 'html';
          if (ext === 'css') lang = 'css';
          if (ext === 'md') lang = 'markdown';
          if (ext === 'py') lang = 'python';
          
          window.monaco.editor.setModelLanguage(window.monacoEditorInstance.getModel(), lang);
          window.monacoEditorInstance.setValue(content);
          
          // KEEP VISUAL CANVAS VISIBLE (Side-by-side)
          document.querySelector('.visual-canvas').style.display = 'flex';
          document.querySelector('.monaco-container').style.display = 'block';
        }
      } catch (error) {
        if (window.monacoEditorInstance) window.monacoEditorInstance.setValue(`Erro ao abrir:\n${error.message}`);
      }
    };
  });

  // SAVE BUTTON HOOK
  window.addEventListener('load', () => {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (!window.monacoEditorInstance) return;
        const currentPath = document.getElementById('currentEditorTitle').textContent;
        const content = window.monacoEditorInstance.getValue();
        
        saveBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
        
        try {
          const basePath = document.getElementById('fsPath') ? document.getElementById('fsPath').value : '';
          const fullPath = window.currentOpenPath || currentPath;
          
          await fetch('/api/dev/fs/file?path=' + encodeURIComponent(fullPath), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          });
          
          saveBtn.innerHTML = '<i class="ph ph-check"></i> Salvo';
          setTimeout(() => {
            saveBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar';
          }, 2000);
          
          // Trigger visual iframe reload if it's open
          const iframe = document.getElementById('previewIframe');
          if (iframe) iframe.src = iframe.src; 
        } catch (err) {
          saveBtn.innerHTML = '<i class="ph ph-warning"></i> Erro';
          alert('Erro ao salvar: ' + err.message);
        }
      });
    }
  });
  // Fix Terminal Polling
  window.addEventListener('load', () => {
    const oldBtn = document.getElementById('terminalBtn');
    if (!oldBtn) return;
    
    // Replace the terminal click logic we added previously
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    
    if (document.getElementById('terminalCmd')) {
      document.getElementById('terminalCmd').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') newBtn.click();
      });
    }
    
    newBtn.addEventListener('click', async () => {
      const cmdInput = document.getElementById('terminalCmd');
      const cmd = cmdInput ? cmdInput.value : '';
      if (!cmd) return;
      if (window.xtermInstance) window.xtermInstance.writeln(`\r\n\x1b[32m$ ${cmd}\x1b[0m`);
      if (cmdInput) cmdInput.value = '';
      
      try {
        const sessionId = `ui-${Date.now()}`; window.terminalOffset = 0;
        const out = await api('/dev/terminal', { method: 'POST', body: JSON.stringify({ command: cmd, sessionId }) });
        
        // Poll for output
        const poll = setInterval(async () => {
          try {
            const state = await api(`/dev/terminal/${sessionId}`);
            if (window.xtermInstance) {
              if (state.logs && state.logs.length > 0) {
                state.logs.slice(window.terminalOffset || 0).forEach(log => {
                  window.terminalOffset = (window.terminalOffset || 0) + 1; window.xtermInstance.writeln(log.replace(/\n/g, '\r\n'));
                });
                // clear logs after reading? the backend doesn't clear them, so we'd print duplicates.
                // Actually the backend returns everything.
              }
            }
            if (state.status === 'COMPLETED' || state.status === 'FAILED') {
              clearInterval(poll);
              if (window.xtermInstance) window.xtermInstance.writeln(`\x1b[36m[Process Exited]\x1b[0m`);
            }
          } catch(e) { clearInterval(poll); }
        }, 1000);
      } catch (err) {
        if (window.xtermInstance) window.xtermInstance.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
      }
    });
  });
