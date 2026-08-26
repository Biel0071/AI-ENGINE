// connections-panel.js — Real IDE & Agent Bridge for FÊNIX OS
// Manages live integrations with VSCode, Antigravity, GitHub, and Local Runtimes

window.ConnectionsState = {
  connections: [
    {
      id: 'vscode',
      name: 'VSCode Extension Bridge',
      desc: 'Sincronização bidirecional de buffer, arquivos ativos e terminal com o VSCode local.',
      status: 'online',
      icon: 'ph-code-simple',
      port: 3000,
      lastSync: new Date(),
      data: {
        activeFile: 'ai-engine/grg/src/server.js',
        diagnostics: 0,
        workspace: 'c:/projetos/ai-engine-core'
      }
    },
    {
      id: 'antigravity',
      name: 'Antigravity AI Agent Engine',
      desc: 'Bridge de comunicação com o Antigravity (DeepMind Agentic Loop, MCP Tools e subagentes).',
      status: 'online',
      icon: 'ph-sparkle',
      port: 4400,
      lastSync: new Date(),
      data: {
        activeSubagents: 3,
        connectedBrain: 'Claude 3.7 Sonnet / Qwen',
        mcpStatus: 'ACTIVE'
      }
    },
    {
      id: 'kernel',
      name: 'FÊNIX Local Kernel',
      desc: 'Runtime do Kernel Fênix com Discovery, EventBus e ServiceRegistry integrados.',
      status: 'online',
      icon: 'ph-cpu',
      port: 4400,
      lastSync: new Date(),
      data: {
        services: 18,
        capabilities: 72,
        mode: 'LIVING_RUNTIME'
      }
    },
    {
      id: 'github',
      name: 'GitHub Repository Bridge',
      desc: 'Integração direta com o repositório remoto para pull, push e tracking de PRs.',
      status: 'online',
      icon: 'ph-git-branch',
      lastSync: new Date(),
      data: {
        branch: 'main',
        dirtyFiles: 0,
        remote: 'origin'
      }
    }
  ]
};

window.initConnectionsPanel = async function() {
  const container = document.getElementById('connectionsList');
  if (!container) return;
  
  await window.refreshConnectionsState();
  window.renderConnectionsList();
};

window.refreshConnectionsState = async function() {
  try {
    const res = await window.FENIX.api('/dev/connections').catch(() => null);
    if (res && Array.isArray(res.connections)) {
      res.connections.forEach(rc => {
        const local = window.ConnectionsState.connections.find(c => c.id === rc.id);
        if (local) {
          local.status = rc.status;
          local.desc = rc.desc || local.desc;
          if (rc.branch) local.data.branch = rc.branch;
          if (rc.dirtyFiles !== undefined) local.data.dirtyFiles = rc.dirtyFiles;
          local.lastSync = new Date();
        }
      });
    }
  } catch (e) {
    console.warn('[Connections] Refresh warning:', e);
  }
};

window.renderConnectionsList = function() {
  const container = document.getElementById('connectionsList');
  if (!container) return;

  const html = window.ConnectionsState.connections.map(conn => {
    const statusClass = conn.status === 'online' ? 'online' : conn.status === 'connecting' ? 'connecting' : 'offline';
    const statusLabel = conn.status === 'online' ? 'CONECTADO' : conn.status === 'connecting' ? 'VERIFICANDO' : 'OFFLINE';

    return `
      <div class="conn-item" id="conn-card-${conn.id}">
        <div class="conn-header">
          <i class="ph-bold ${conn.icon} conn-icon" style="color:var(--accent);"></i>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span class="conn-name">${window.esc ? window.esc(conn.name) : conn.name}</span>
              <span class="conn-status ${statusClass}" id="status-badge-${conn.id}">${statusLabel}</span>
            </div>
            <div class="conn-desc">${window.esc ? window.esc(conn.desc) : conn.desc}</div>
          </div>
        </div>

        <div class="conn-actions">
          <button class="conn-btn primary" onclick="window.pingConnection('${conn.id}')">
            <i class="ph ph-pulse"></i> Testar Ping
          </button>
          <button class="conn-btn" onclick="window.pullConnectionData('${conn.id}')">
            <i class="ph ph-download-simple"></i> Puxar Dados
          </button>
          <button class="conn-btn" onclick="window.toggleConnectionDetails('${conn.id}')">
            <i class="ph ph-code"></i> Detalhes
          </button>
        </div>

        <div class="conn-data" id="conn-data-${conn.id}">
          <pre style="margin:0; font-size:10px;">${JSON.stringify(conn.data, null, 2)}</pre>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
};

window.pingConnection = async function(connId) {
  const badge = document.getElementById(`status-badge-${connId}`);
  if (badge) {
    badge.className = 'conn-status connecting';
    badge.innerText = 'PING...';
  }

  const startTime = Date.now();
  try {
    const res = await window.FENIX.api('/dev/connections');
    const target = (res.connections || []).find(c => c.id === connId);
    const latency = Date.now() - startTime;
    
    const local = window.ConnectionsState.connections.find(c => c.id === connId);
    if (local && target) {
      local.status = target.status;
      local.desc = target.desc || local.desc;
    }

    if (badge) {
      if (target && target.status === 'online') {
        badge.className = 'conn-status online';
        badge.innerText = `OK (${latency}ms)`;
        if (window.showToast) window.showToast(`${local?.name || connId}: Conectado (${latency}ms)`, 'success');
      } else {
        badge.className = 'conn-status offline';
        badge.innerText = 'OFFLINE';
        if (window.showToast) window.showToast(`${local?.name || connId}: Offline / Não acessível`, 'error');
      }
    }
  } catch (e) {
    if (badge) {
      badge.className = 'conn-status offline';
      badge.innerText = 'ERRO';
    }
    if (window.showToast) window.showToast(`Erro ao testar ${connId}: ${e.message}`, 'error');
  }
};

window.pullConnectionData = async function(connId) {
  if (window.showToast) window.showToast(`Puxando dados de programação de ${connId}...`, 'info');
  
  try {
    if (connId === 'vscode') {
      // Pull currently opened file or directory structure
      const fsData = await window.FENIX.api('/dev/fs?path=');
      const conn = window.ConnectionsState.connections.find(c => c.id === 'vscode');
      if (conn) {
        conn.data.filesLoaded = fsData.items?.length || 0;
        conn.data.lastPull = new Date().toLocaleTimeString();
      }
      if (window.showToast) window.showToast(`VSCode: ${fsData.items?.length || 0} arquivos mapeados!`, 'success');
    } else if (connId === 'antigravity') {
      const swarm = await window.FENIX.api('/agents/swarm').catch(() => ({ agents: [] }));
      const conn = window.ConnectionsState.connections.find(c => c.id === 'antigravity');
      if (conn) {
        conn.data.swarmAgents = swarm.agents?.length || 0;
        conn.data.lastPull = new Date().toLocaleTimeString();
      }
      if (window.showToast) window.showToast(`Antigravity: ${swarm.agents?.length || 0} agentes disponíveis!`, 'success');
    } else if (connId === 'kernel') {
      const overview = await window.FENIX.api('/overview').catch(() => ({}));
      const conn = window.ConnectionsState.connections.find(c => c.id === 'kernel');
      if (conn) {
        conn.data.overview = overview.metrics || {};
        conn.data.lastPull = new Date().toLocaleTimeString();
      }
      if (window.showToast) window.showToast(`Kernel: Métricas atualizadas!`, 'success');
    }
    window.renderConnectionsList();
  } catch (err) {
    if (window.showToast) window.showToast(`Erro ao sincronizar: ${err.message}`, 'error');
  }
};

window.toggleConnectionDetails = function(connId) {
  const el = document.getElementById(`conn-data-${connId}`);
  if (el) {
    el.classList.toggle('visible');
  }
};

// Event listener for quick refresh
document.getElementById('refreshConnBtn')?.addEventListener('click', () => {
  window.initConnectionsPanel();
  if (window.showToast) window.showToast('Bridges atualizados!', 'info');
});
