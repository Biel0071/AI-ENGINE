
// === FENIX OS EXTENSIONS — Agents Grid, City HUD, Inspector ===

const AGENT_AVATARS = {
  architect: '🏛', backend: '⚙️', frontend: '🎨', qa: '🔬',
  devops: '🚀', researcher: '🔭', analyst: '📊', security: '🛡',
  supervisor: '👑', default: '🤖'
};

function agentStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('work') || s.includes('run') || s.includes('cod')) return 'working';
  if (s.includes('test') || s.includes('qa')) return 'testing';
  if (s.includes('deploy')) return 'deploying';
  return 'idle';
}

function renderAgents() {
  const grid = document.getElementById('agentsGrid');
  if (!grid) return;

  // Source of truth: /api/agents/swarm or /api/agents/panel
  const rawSwarm = state.data.swarm?.agents || state.data.agents?.agents || [];
  const agentList = Array.isArray(rawSwarm) ? rawSwarm : Object.entries(rawSwarm).map(([id, a]) => ({ id, ...a }));

  if (!agentList.length) {
    grid.innerHTML = row('agentes', state.data.swarm?.__error || 'Nenhum agente registrado ainda.', 'EMPTY');
    return;
  }

  grid.innerHTML = agentList.map(agent => {
    const roleKey = (agent.role || '').toLowerCase();
    const avatar = Object.entries(AGENT_AVATARS).find(([k]) => roleKey.includes(k))?.[1] || AGENT_AVATARS.default;
    const sc = agentStatusClass(agent.status || agent.state);
    return `<div class="agent-card-roster ${sc}" data-agent-id="${esc(agent.id || agent.agentId || '')}" onclick="window.openAgentInspector(this.dataset.agentId)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:22px">${avatar}</span>
        <div>
          <p class="agent-card-name">${esc(agent.name || agent.id || agent.agentId || 'Agente')}</p>
          <p class="agent-card-role">${esc(agent.role || agent.capability || '--')}</p>
        </div>
      </div>
      <div class="agent-card-status">${esc(agent.status || agent.state || 'IDLE')}</div>
      ${agent.currentJob ? `<div style="font-size:9px;color:#64748b;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(agent.currentJob)}</div>` : ''}
    </div>`;
  }).join('');

  // Populate agent chat selector
  const chatSelect = document.getElementById('agentChatSelect');
  if (chatSelect) {
    chatSelect.innerHTML = agentList.map(agent =>
      `<div class="row" style="cursor:pointer" onclick="window.selectAgentForChat('${esc(agent.id || agent.agentId || '')}','${esc(agent.name || agent.id || '')}')">
        <b>${esc(agent.name || agent.id || 'Agente')}</b>
        <small>${esc(agent.role || '')}</small>
        <span class="status-pill">${esc(agent.status || '')}</span>
      </div>`
    ).join('');
  }

  // Sync to city canvas agent state
  const stateMap = {};
  agentList.forEach(a => { stateMap[a.id || a.agentId] = a; });
  state.agentStates = stateMap;
  if (window.state) window.state.agentStates = stateMap;
  if (window.state) window.state.projects = state.projects;
}

function renderCityHud() {
  const feed = document.getElementById('cityEventsFeed');
  if (feed && state.events.length) {
    feed.innerHTML = state.events.slice(0, 8).map(e =>
      `<div>[${esc(e.type || e.name || 'event')}] ${esc(e.summary || e.message || e.recordedAt || '')}</div>`
    ).join('');
  }
  const zoomDisp = document.getElementById('cityZoomDisplay');
  if (zoomDisp && window.state?.zoom) {
    zoomDisp.textContent = (window.state.zoom || 1.0).toFixed(1) + 'x';
  }
}

window.openAgentInspector = function(agentId) {
  if (!agentId) return;
  const hud = document.getElementById('agentInspectorHud');
  if (!hud) return;

  const rawSwarm = state.data.swarm?.agents || state.data.agents?.agents || [];
  const agentList = Array.isArray(rawSwarm) ? rawSwarm : Object.entries(rawSwarm).map(([id, a]) => ({ id, ...a }));
  const agent = agentList.find(a => (a.id || a.agentId) === agentId) || { id: agentId, name: agentId };

  const roleKey = (agent.role || '').toLowerCase();
  const avatar = Object.entries(AGENT_AVATARS).find(([k]) => roleKey.includes(k))?.[1] || AGENT_AVATARS.default;

  const avatarEl = document.getElementById('inspectorAvatar');
  if (avatarEl) avatarEl.textContent = avatar;
  text('inspectorName', agent.name || agent.id || agentId);
  text('inspectorRole', agent.role || agent.capability || '--');

  const statusEl = document.getElementById('inspectorStatus');
  if (statusEl) {
    statusEl.textContent = agent.status || agent.state || 'IDLE';
    statusEl.className = 'status-pill ' + (/ok|active|work|run/i.test(agent.status || '') ? 'ok' : 'warn');
  }
  text('inspectorCurrentJob', agent.currentJob || agent.activeTask || 'Sem job ativo');

  const progress = document.getElementById('inspectorProgress');
  if (progress) progress.style.width = (agent.progress || 0) + '%';

  const skillsEl = document.getElementById('inspectorSkills');
  if (skillsEl) {
    const skills = agent.skills || agent.capabilities || [];
    skillsEl.innerHTML = Array.isArray(skills) && skills.length
      ? skills.slice(0, 8).map(s => `<span>${esc(typeof s === 'string' ? s : s.name || s)}</span>`).join('')
      : '<span>sem skills listadas</span>';
  }

  const chatBtn = document.getElementById('inspectorChatBtn');
  const taskBtn = document.getElementById('inspectorTaskBtn');
  const memBtn = document.getElementById('inspectorMemoryBtn');
  const jobsBtn = document.getElementById('inspectorJobsBtn');
  if (chatBtn) chatBtn.onclick = () => { window.selectAgentForChat(agentId, agent.name || agentId); showView('agents'); window.showSubView('agents', 'chat'); };
  if (taskBtn) taskBtn.onclick = () => window.openTaskModal(agentId, agent);
  if (memBtn) memBtn.onclick = () => window.showAgentMemory(agentId);
  if (jobsBtn) jobsBtn.onclick = () => showView('runtime');

  hud.style.display = 'flex';
  state.selectedAgent = agentId;
};

window.selectAgentForChat = function(agentId, agentName) {
  state.selectedAgent = agentId;
  text('agentChatName', agentName || agentId);
};

window.openTaskModal = async function(agentId, agent) {
  const task = prompt('Nova tarefa para ' + (agent?.name || agentId) + ':');
  if (!task) return;
  try {
    const res = await api('/missions', {
      method: 'POST',
      body: JSON.stringify({ objective: task, assignedAgent: agentId, priority: 'HIGH' })
    });
    bubble('✅ Missão criada: ' + task + ' → Agente: ' + agentId + ' (Job: ' + (res.jobId || res.id || '?') + ')', 'bot');
    await refreshAll();
  } catch (err) {
    bubble('❌ Erro ao criar missão: ' + err.message, 'system');
  }
};

window.showAgentMemory = async function(agentId) {
  try {
    const mem = await api('/memory/' + agentId);
    const entries = mem.entries || mem.memories || mem.items || [];
    alert('Memória de ' + agentId + ':\n\n' + (entries.length
      ? entries.slice(0, 5).map(e => '• ' + (e.content || e.summary || JSON.stringify(e).slice(0, 80))).join('\n')
      : 'Nenhuma memória registrada'));
  } catch (err) {
    alert('Erro ao carregar memória: ' + err.message);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const agentChatForm = document.getElementById('agentChatForm');
  if (agentChatForm) {
    agentChatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const promptVal = document.getElementById('agentChatPrompt')?.value?.trim();
      const agentId = state.selectedAgent;
      if (!promptVal || !agentId) {
        alert('Selecione um agente e escreva uma mensagem.');
        return;
      }
      document.getElementById('agentChatPrompt').value = '';
      const log = document.getElementById('agentChatLog');
      if (log) {
        const div = document.createElement('div');
        div.className = 'bubble user';
        div.textContent = promptVal;
        log.appendChild(div);
      }
      try {
        const res = await api('/api/v2/mind/ingest', {
          method: 'POST',
          body: JSON.stringify({ message: promptVal, context: { agentId }, source: 'agent_chat' })
        });
        if (log) {
          const div = document.createElement('div');
          div.className = 'bubble bot';
          div.textContent = res.reply || res.response || 'Processando...';
          log.appendChild(div);
          log.scrollTop = log.scrollHeight;
        }
      } catch (err) {
        if (log) {
          const div = document.createElement('div');
          div.className = 'bubble system';
          div.textContent = 'Erro: ' + err.message;
          log.appendChild(div);
        }
      }
    });
  }

  const cityNavBtn = document.getElementById('cityNavBtn');
  if (cityNavBtn) {
    cityNavBtn.addEventListener('click', () => {
      setTimeout(() => {
        const canvas = document.getElementById('cityCanvas');
        if (canvas && typeof canvas.getContext === 'function' && !window._cityCanvasInitialized) {
          canvas.width = canvas.offsetWidth || canvas.parentElement.offsetWidth;
          canvas.height = canvas.offsetHeight || canvas.parentElement.offsetHeight;
          if (window.initCityCanvas) {
            window._cityCanvasInitialized = true;
            window.initCityCanvas();
          }
        }
      }, 150);
    });
  }
});
