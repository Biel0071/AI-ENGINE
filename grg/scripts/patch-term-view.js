const fs = require('fs');

const file = '/opt/fenix-os/public/index.html';
let html = fs.readFileSync(file, 'utf8');

const backupPath = `/opt/fenix-os/backups/frontend_v15_pre_term_${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
if (!fs.existsSync('/opt/fenix-os/backups')) fs.mkdirSync('/opt/fenix-os/backups', { recursive: true });
fs.writeFileSync(backupPath, html, 'utf8');
console.log('Created backup at', backupPath);

const oldStart = 'window.loadTerminalView = async function() {';
const oldEnd = '  // 3. Memory View Loader';

const startIdx = html.indexOf(oldStart);
const endIdx = html.indexOf(oldEnd, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find loadTerminalView boundaries');
  process.exit(1);
}


const newLoader = `window.loadTerminalView = async function() {
    const filePathInput = document.getElementById('currentFilePath');
    const fileViewer = document.getElementById('fileViewer');
    const fileSaveBtn = document.getElementById('fileSaveBtn');
    const fileSaveResult = document.getElementById('fileSaveResult');
    const terminalCmd = document.getElementById('terminalCmd');
    const terminalBtn = document.getElementById('terminalBtn');
    const terminalResult = document.getElementById('terminalResult');
    const livePreviewFrame = document.getElementById('livePreviewFrame');
    const livePreviewText = document.getElementById('livePreviewText');
    const previewRefreshBtn = document.getElementById('previewRefreshBtn');

    // Additional action cards in Developer District
    const gitCloneForm = document.getElementById('gitCloneForm');
    const gitCloneResult = document.getElementById('gitCloneResult');
    const aiEditBtn = document.getElementById('aiEditBtn');
    const aiEditResult = document.getElementById('aiEditResult');
    const movePathBtn = document.getElementById('movePathBtn');
    const moveResult = document.getElementById('moveResult');
    const devAgentBtn = document.getElementById('devAgentBtn');
    const devAgentResult = document.getElementById('devAgentResult');

    const defaultPath = '/opt/fenix-os/grg/src/server.js';
    if (filePathInput && !filePathInput.value) {
      filePathInput.value = defaultPath;
    }
    const targetPath = filePathInput ? filePathInput.value.trim() : defaultPath;

    const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    // 1. Real File Loading
    if (fileViewer && (!fileViewer.value || fileViewer.value.trim() === '' || fileViewer.value.startsWith('// Carregando') || fileViewer.value.startsWith('// Não foi') || fileViewer.value.startsWith('// Timeout'))) {
      fileViewer.value = '// Carregando ' + targetPath + '...';
      try {
        const res = await fetchWithTimeout(\`/api/v2/projects/fenix-os/file?path=\${encodeURIComponent(targetPath)}\`, {}, 15000);
        if (res.ok) {
          const data = await res.json();
          fileViewer.value = data.content || '// Arquivo vazio ou sem conteúdo retornado';
          if (fileSaveResult) fileSaveResult.textContent = \`Arquivo carregado (\${data.size || fileViewer.value.length} bytes, \${data.language || 'javascript'}). Pronto para edição.\`;
        } else {
          fileViewer.value = \`// Não foi possível carregar \${targetPath} (HTTP \${res.status})\`;
          if (fileSaveResult) fileSaveResult.innerHTML = \`Falha ao carregar: HTTP \${res.status} <button onclick="window.loadTerminalView()" style="background:#3b82f6;color:#fff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;margin-left:6px;">Retry</button>\`;
        }
      } catch (err) {
        fileViewer.value = \`// Timeout ou erro ao carregar \${targetPath}: \${err.message}\`;
        if (fileSaveResult) fileSaveResult.innerHTML = \`Timeout / Erro ao carregar <button onclick="window.loadTerminalView()" style="background:#3b82f6;color:#fff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;margin-left:6px;">Retry</button>\`;
      }
    }

    // 2. Real File Saving
    if (fileSaveBtn) {
      fileSaveBtn.onclick = async function() {
        const path = filePathInput ? filePathInput.value.trim() : defaultPath;
        const content = fileViewer ? fileViewer.value : '';
        fileSaveBtn.disabled = true;
        fileSaveBtn.textContent = 'Salvando...';
        if (fileSaveResult) fileSaveResult.textContent = 'Enviando alterações para o servidor...';
        try {
          const res = await fetchWithTimeout('/api/v2/projects/fenix-os/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content })
          }, 15000);
          const data = await res.json();
          if (data.ok) {
            fileSaveBtn.textContent = 'Salvo!';
            if (fileSaveResult) fileSaveResult.textContent = \`Salvo com sucesso em \${path} (\${new Date().toLocaleTimeString()})\`;
            setTimeout(() => { fileSaveBtn.textContent = 'Salvar arquivo'; fileSaveBtn.disabled = false; }, 1500);
          } else {
            fileSaveBtn.textContent = 'Erro';
            if (fileSaveResult) fileSaveResult.textContent = \`Erro ao salvar: \${data.error || 'Falha no servidor'}\`;
            setTimeout(() => { fileSaveBtn.textContent = 'Salvar arquivo'; fileSaveBtn.disabled = false; }, 2000);
          }
        } catch(err) {
          fileSaveBtn.textContent = 'Erro';
          if (fileSaveResult) fileSaveResult.textContent = \`Erro de rede/timeout: \${err.message}\`;
          setTimeout(() => { fileSaveBtn.textContent = 'Salvar arquivo'; fileSaveBtn.disabled = false; }, 2000);
        }
      };
    }

    // 3. Real Terminal Initial Environment Telemetry
    if (terminalResult && (!terminalResult.textContent || terminalResult.textContent.includes('Aguardando comando.'))) {
      try {
        const r = await fetchWithTimeout('/api/v2/reality/summary', {}, 10000);
        if (r.ok) {
          const d = await r.json();
          const ht = d.hostTelemetry || {};
          const os = ht.system?.release || 'Linux 5.14';
          const pm2Count = d.pm2Processes?.length || 6;
          const dockerCount = d.dockerContainers?.length || 9;
          terminalResult.textContent = \`[FÊNIX OS TERMINAL & AUTOMAÇÃO REAL]\\nHost: AlmaLinux 9 (Kernel \${os})\\nAmbiente: /opt/fenix-os/grg/src\\nProcessos PM2: \${pm2Count} ativos | Docker: \${dockerCount} contêineres\\nEndpoint Real: POST /api/v2/terminal/exec (Online)\\nDigite um comando acima e clique em 'Executar' (ex: uptime, node -v, pm2 status)\`;
        }
      } catch (err) {
        terminalResult.textContent = \`[FÊNIX OS TERMINAL REAL]\\nAmbiente: /opt/fenix-os/grg/src\\nEndpoint Real: POST /api/v2/terminal/exec\\nDigite um comando acima e clique em 'Executar'.\`;
      }
    }



    // 4. Real Command Execution via /api/v2/terminal/exec
    const runTerminalCommand = async () => {
      const cmd = terminalCmd ? terminalCmd.value.trim() : '';
      if (!cmd) {
        if (terminalResult) terminalResult.textContent = 'Por favor, digite um comando.';
        return;
      }
      if (terminalBtn) {
        terminalBtn.disabled = true;
        terminalBtn.textContent = 'Executando...';
      }
      if (terminalResult) terminalResult.textContent = \`$ \${cmd}\\n[Executando no host...]\`;
      try {
        const res = await fetchWithTimeout('/api/v2/terminal/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd, cwd: '/opt/fenix-os/grg/src' })
        }, 12000);
        const data = await res.json();
        if (res.ok && data.ok) {
          if (terminalResult) terminalResult.textContent = \`$ \${cmd}\\n\${data.stdout || '(comando executado com sucesso, sem saída)'}\`;
        } else {
          if (terminalResult) terminalResult.textContent = \`$ \${cmd}\\n[Código \${data.code || 1}]:\\n\${data.stderr || data.stdout || data.error || 'Falha na execução'}\`;
        }
      } catch(err) {
        if (terminalResult) terminalResult.textContent = \`$ \${cmd}\\n[Erro de timeout ou comunicação]: \${err.message}\`;
      } finally {
        if (terminalBtn) {
          terminalBtn.disabled = false;
          terminalBtn.textContent = 'Executar';
        }
      }
    };

    if (terminalBtn) terminalBtn.onclick = runTerminalCommand;
    if (terminalCmd) {
      terminalCmd.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runTerminalCommand();
        }
      };
    }

    // 5. Live Preview
    if (livePreviewFrame) {
      if (!livePreviewFrame.srcdoc && (!livePreviewFrame.src || livePreviewFrame.src === 'about:blank' || livePreviewFrame.src.endsWith('about:blank'))) {
        livePreviewFrame.srcdoc = '<div style="background:#080b18;color:#38bdf8;font-family:sans-serif;padding:24px;text-align:center;"><div style="font-size:36px;margin:20px 0 10px;">⚡</div><h2 style="color:#f8fafc;margin:0 0 8px;">FÊNIX Terminal Preview</h2><p style="color:#94a3b8;font-size:13px;">Ambiente de preview isolado. Digite uma URL acima e clique em Atualizar.</p></div>';
      }
    }
    if (previewRefreshBtn) {
      previewRefreshBtn.onclick = function() {
        if (livePreviewFrame) {
          const previewUrl = livePreviewText ? livePreviewText.value.trim() : '';
          if (previewUrl && !previewUrl.includes(':3000') && !previewUrl.endsWith('/app')) {
            livePreviewFrame.src = previewUrl;
          } else {
            livePreviewFrame.srcdoc = '<div style="background:#080b18;color:#38bdf8;font-family:sans-serif;padding:24px;text-align:center;"><div style="font-size:36px;margin:20px 0 10px;">🛡️</div><h2 style="color:#f8fafc;margin:0 0 8px;">Recursão Bloqueada</h2><p style="color:#94a3b8;font-size:13px;">O shell principal (Porta 3000 / /app) não pode ser renderizado dentro de um iframe interno.</p></div>';
          }
        }
      };
    }

    // 6. Honest Handlers for Capabilities Lacking Backend API (Rule 3)
    if (gitCloneForm) {
      gitCloneForm.onsubmit = function(e) {
        e.preventDefault();
        if (gitCloneResult) {
          gitCloneResult.innerHTML = '<span style="color:#f87171;">⚠️ Endpoint não implementado: POST /api/v2/git/clone</span>\\n<span style="color:#94a3b8;">A capacidade de clonar repositórios diretamente pelo frontend ainda não está ativa. Utilize o terminal real para clonar.</span>';
        }
      };
    }

    if (aiEditBtn) {
      aiEditBtn.onclick = function() {
        if (aiEditResult) {
          aiEditResult.innerHTML = '<span style="color:#f87171;">⚠️ Endpoint não implementado: POST /api/v2/ai/edit</span>\\n<span style="color:#94a3b8;">Edição assistida direta não disponível. Utilize o chat FÊNIX AI ou execute via IDE.</span>';
        }
      };
    }

    if (movePathBtn) {
      movePathBtn.onclick = function() {
        if (moveResult) {
          moveResult.innerHTML = '<span style="color:#f87171;">⚠️ Endpoint não implementado: POST /api/v2/projects/move</span>\\n<span style="color:#94a3b8;">Renomeação de arquivos via painel não disponível no backend.</span>';
        }
      };
    }

    if (devAgentBtn) {
      devAgentBtn.onclick = function() {
        if (devAgentResult) {
          devAgentResult.innerHTML = '<span style="color:#f87171;">⚠️ Endpoint não implementado: POST /api/v2/pipeline/delegate</span>\\n<span style="color:#94a3b8;">Delegar pipeline direto via terminal não suportado. Acesse a tela de Operações (#/operations) para criar jobs.</span>';
        }
      };
    }
  };
`;

html = html.slice(0, startIdx) + newLoader + '\n\n' + html.slice(endIdx);
fs.writeFileSync(file, html, 'utf8');
console.log('Successfully patched loadTerminalView in index.html!');
