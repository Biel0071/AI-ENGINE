let monacoEditorInstance = null;
let xtermInstance = null;

// Replace openFile with Monaco rendering
window.openFile = async function(path) {
  try {
    const data = await api(`/dev/fs/file?path=${encodeURIComponent(path)}`);
    const content = data.content || '';
    
    // Update Tab
    const filename = path.split('/').pop() || path.split('\\').pop() || 'untitled';
    if ($('currentFileName')) $('currentFileName').innerHTML = `<i class="ph ph-file-code"></i> <span>${filename}</span>`;
    
    // Set Monaco Editor
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
    }
  } catch (error) {
    if (monacoEditorInstance) monacoEditorInstance.setValue(`Falha ao abrir arquivo:\n${error.message}`);
  }
};

// Replace loadFs with a visually better tree
window.loadFs = async function(path = '') {
  try {
    const data = await api(`/dev/fs?path=${encodeURIComponent(path)}`);
    const items = data.items || [];
    
    if (items.length === 0) {
      if ($('fsList')) $('fsList').innerHTML = '<div class="empty-state"><i class="ph ph-folder-open empty-icon"></i><span>Diretório Vazio</span></div>';
      return;
    }
    
    // Sort dirs first
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    let html = '';
    // Add "Up" button if not root
    if (path && path.length > 3) {
       const parent = path.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
       html += `<div class="fs-item dir" data-path="${parent}" data-type="dir"><i class="ph-fill ph-arrow-u-up-left"></i> <span>..</span></div>`;
    }

    items.forEach(item => {
      if (item.isDirectory) {
        html += `<div class="fs-item dir" data-path="${item.path}" data-type="dir"><i class="ph-fill ph-folder"></i> <span>${item.name}</span></div>`;
      } else {
        let icon = 'ph-file';
        if (item.name.endsWith('.js')) icon = 'ph-file-code';
        if (item.name.endsWith('.json')) icon = 'ph-file-code';
        if (item.name.endsWith('.png')) icon = 'ph-image';
        html += `<div class="fs-item file" data-path="${item.path}" data-type="file"><i class="ph ${icon}"></i> <span>${item.name}</span></div>`;
      }
    });

    if ($('fsList')) {
      $('fsList').innerHTML = html;
      document.querySelectorAll('#fsList .fs-item').forEach(el => {
        el.addEventListener('click', () => {
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

// Override bubble for chat formatting
window.bubble = function(message, who = 'bot') {
  const div = document.createElement('div');
  div.className = `chat-bubble chat-${who}`;
  
  const icon = who === 'bot' ? '<i class="ph-fill ph-robot"></i>' : '<i class="ph-fill ph-user"></i>';
  const name = who === 'bot' ? 'FÊNIX Mind' : 'Você';
  
  // Render markdown if bot
  let contentHtml = message;
  if (who === 'bot' && window.marked) {
    contentHtml = marked.parse(message);
  } else {
    contentHtml = String(message).replace(/\n/g, '<br>');
  }

  div.innerHTML = `
    <div class="chat-avatar">${icon}</div>
    <div class="chat-content">
      <strong>${name}</strong>
      <div class="chat-text">${contentHtml}</div>
    </div>
  `;
  
  if ($('chatLog')) {
    $('chatLog').appendChild(div);
    $('chatLog').scrollTop = $('chatLog').scrollHeight;
  }
};

// Init Monaco & Xterm on load
window.addEventListener('load', () => {
  // Init Monaco
  if (window.require && document.getElementById('monacoEditor')) {
    require(['vs/editor/editor.main'], function() {
      monacoEditorInstance = monaco.editor.create(document.getElementById('monacoEditor'), {
        value: '// Agentic IDE Iniciada.\n// Selecione um arquivo no Explorer.',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: '"JetBrains Mono", monospace',
        padding: { top: 16 }
      });
    });
  }

  // Init Xterm
  if (window.Terminal && document.getElementById('xtermContainer')) {
    xtermInstance = new Terminal({
      theme: { background: '#000000', foreground: '#c9d1d9', cursor: '#2f81f7' },
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      cursorBlink: true
    });
    const fitAddon = new FitAddon.FitAddon();
    xtermInstance.loadAddon(fitAddon);
    xtermInstance.open(document.getElementById('xtermContainer'));
    fitAddon.fit();
    window.addEventListener('resize', () => fitAddon.fit());
    xtermInstance.writeln('\x1b[32m$ FENIX OS Terminal Integrado\x1b[0m');
    xtermInstance.writeln('Aguardando comandos...');
  }

  // Terminal Runner Hook
  if ($('terminalBtn')) {
    // Remove old listener if possible (by cloning or just overriding click)
    const oldBtn = $('terminalBtn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    
    newBtn.addEventListener('click', async () => {
      const cmd = $('terminalCmd') ? $('terminalCmd').value : '';
      if (!cmd) return;
      if (xtermInstance) xtermInstance.writeln(`\r\n\x1b[36m$ ${cmd}\x1b[0m`);
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

  // Load project dynamically if available
  setTimeout(() => {
    if ($('fsPath') && $('fsPath').value) {
      loadFs($('fsPath').value);
    }
  }, 1000);
});
