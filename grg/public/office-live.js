/**
 * FÊNIX OS — LIVING AGENT OFFICE & COMMUNICATION FABRIC (FASE 14)
 * Client controller for spatial workplace, agent desks, knocks, conversations, and meetings.
 * Zero-Mock: strictly consumes /api/v2/office/* endpoints with full honesty.
 */

(function() {
  'use strict';

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const DEPARTMENT_META = {
    'EXECUTIVE': { title: 'Executive Suite', icon: '👑', color: '#D4A72C' },
    'ENGINEERING': { title: 'Engineering Bay', icon: '💻', color: '#00D9FF' },
    'VERIFICATION': { title: 'Verification & Security Lab', icon: '🧪', color: '#10B981' },
    'COGNITIVE': { title: 'Cognitive & Evolution Center', icon: '🧠', color: '#A855F7' },
    'OPERATIONAL': { title: 'Suíte Operacional & Infraestrutura', icon: '⚡', color: '#F59E0B' },
    'COLLECTIVE': { title: 'Salas Coletivas & Espaços', icon: '🏛️', color: '#38BDF8' }
  };

  const AGENT_AVATARS = {
    'fenix-ceo-agent': '👑',
    'fenix-architecture-agent': '📐',
    'fenix-backend-agent': '⚙️',
    'fenix-frontend-agent': '🎨',
    'fenix-qa-agent': '🛡️',
    'fenix-security-agent': '🔒',
    'fenix-devops-agent': '🚀',
    'fenix-research-agent': '🔬',
    'fenix-ai-agent': '🧠',
    'fenix-business-agent': '📈',
    'fenix-doc-agent': '📚',
    'fenix-evolution-agent': '🧬',
    'human_operator': '👤'
  };

  class FenixOfficeController {
    constructor() {
      this.state = null;
      this.activeConversationId = null;
      this.activeDockTab = 'conv'; // 'conv', 'meeting', 'memory'
      this.pollTimer = null;
      this.isPolling = false;
      this.currentMode = 'world'; // 'world', 'office', 'feed'
      this.knockTargetAgent = null;
    }

    async init() {
      console.log('[FenixOffice] Initializing Living Agent Office controller...');
      this.bindEvents();
      if (window.location.hash === '#office') {
        window.fenixSetCityMode('office');
      }
    }

    bindEvents() {
      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#office') {
          window.fenixSetCityMode('office');
        }
      });
    }

    async fetchOfficeState() {
      try {
        const res = await fetch('/api/v2/office/state');
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        const data = await res.json();
        this.state = data;
        return data;
      } catch (err) {
        console.warn('[FenixOffice] Failed to fetch state:', err.message);
        return null;
      }
    }

    async refresh() {
      const data = await this.fetchOfficeState();
      if (!data) return;
      this.renderHUD(data);
      this.renderFloorplan(data);
      this.renderDock(data);
    }

    startPolling() {
      if (this.isPolling) return;
      this.isPolling = true;
      this.refresh();
      this.pollTimer = setInterval(() => {
        if (this.currentMode === 'office' || this.currentMode === 'feed') {
          this.refresh();
        }
      }, 4000);
    }

    stopPolling() {
      this.isPolling = false;
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }

    renderHUD(data) {
      const elTotal = document.getElementById('officeHudTotalOffices');
      const elAgents = document.getElementById('officeHudActiveAgents');
      const elConv = document.getElementById('officeHudInConversation');
      const elMeeting = document.getElementById('officeHudInMeeting');
      const elWarRoom = document.getElementById('officeHudWarRoomStatus');
      const elHuman = document.getElementById('officeHudHumanStatus');

      const offices = data.offices || [];
      const rawPresence = data.presence || {};
      const agentList = Array.isArray(rawPresence) ? rawPresence : (rawPresence.agents || []);
      const human = rawPresence.human || agentList.find(p => p.agentId === 'human_operator') || { status: 'AVAILABLE' };
      const activeConvs = data.activeConversations || [];
      const activeMeetings = data.activeMeetings || [];

      if (elTotal) elTotal.textContent = String(offices.length);
      if (elAgents) elAgents.textContent = String(agentList.length);
      if (elConv) elConv.textContent = String(activeConvs.length);
      if (elMeeting) elMeeting.textContent = String(activeMeetings.length);

      const warRoom = activeMeetings.find(m => m.type === 'WAR_ROOM' || m.roomId === 'room-war-room');
      if (elWarRoom) {
        if (warRoom && warRoom.status === 'IN_PROGRESS') {
          elWarRoom.textContent = 'ATIVO (EMERGÊNCIA)';
          elWarRoom.className = 'office-pill-danger';
        } else {
          elWarRoom.textContent = 'NORMAL';
          elWarRoom.className = 'office-pill-neutral';
        }
      }

      if (elHuman && human) {
        elHuman.textContent = human.status || 'AVAILABLE';
      }
    }

    renderFloorplan(data) {
      const container = document.getElementById('officeFloorplanContainer');
      if (!container) return;

      const offices = data.offices || [];
      const rawPresence = data.presence || {};
      const agentList = Array.isArray(rawPresence) ? rawPresence : (rawPresence.agents || []);
      const presenceMap = new Map(agentList.map(p => [p.agentId, p]));
      const activeConvs = data.activeConversations || [];
      const activeMeetings = data.activeMeetings || [];

      // Render Collective Rooms
      let roomsHtml = `
        <div class="office-dept-section">
          <div class="office-dept-header">
            <span class="office-dept-title">🏛️ Salas Coletivas & Espaços Estratégicos</span>
            <span style="font-size:11px; color:#64748B;">Espaços de Deliberação Multilateral</span>
          </div>
          <div class="office-rooms-grid">
      `;

      const collectiveRooms = [
        { id: 'room-meeting-alfa', name: 'Sala de Reunião Alfa', icon: '🏛️', capacity: 8, desc: 'Deliberações Estratégicas' },
        { id: 'room-review', name: 'Review Room', icon: '🔍', capacity: 4, desc: 'Aprovações & Revisão de Código' },
        { id: 'room-lounge', name: 'Lounge & Café', icon: '☕', capacity: 12, desc: 'Sync Informal & Descompressão' },
        { id: 'room-war-room', name: 'War Room (Crise)', icon: '🚨', capacity: 10, desc: 'Resolução de Bloqueios Críticos' }
      ];

      collectiveRooms.forEach(room => {
        const meeting = activeMeetings.find(m => m.roomId === room.id && m.status === 'IN_PROGRESS');
        const isWarRoom = room.id === 'room-war-room';
        const cardClass = isWarRoom && meeting ? 'office-room-card war-room-active' : 'office-room-card';
        const statusBadge = meeting 
          ? `<span class="office-room-status ${isWarRoom ? 'emergency' : 'occupied'}">EM USO: ${esc(meeting.topic || 'Reunião')}</span>`
          : `<span class="office-room-status open">LIVRE (${room.capacity} lug.)</span>`;

        roomsHtml += `
          <div class="${cardClass}">
            <div class="office-room-header">
              <span class="office-room-title">${room.icon} ${esc(room.name)}</span>
              ${statusBadge}
            </div>
            <div class="office-room-body">
              <span>${esc(room.desc)}</span>
              ${meeting ? `
                <div style="font-size:10.5px; color:#CBD5E1; margin-top:2px;">
                  <b>Pauta:</b> ${esc(meeting.topic)} &bull; <b>Líder:</b> ${esc(meeting.chairpersonId)}
                </div>
                <div class="office-room-occupants">
                  ${(meeting.participants || []).map(p => `
                    <div class="office-occupant-avatar" title="${esc(p)}">${AGENT_AVATARS[p] || '🤖'}</div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div style="margin-top:6px; display:flex; gap:6px;">
              ${!meeting ? `
                <button class="office-desk-btn" onclick="window.fenixOffice.openMeetingModal('${esc(room.id)}')">
                  <i class="ph-bold ph-plus-circle"></i> Usar Sala
                </button>
              ` : `
                <button class="office-desk-btn" onclick="window.fenixOffice.viewMeetingDetails('${esc(meeting.meetingId)}')">
                  <i class="ph-bold ph-eye"></i> Ver Ata
                </button>
              `}
            </div>
          </div>
        `;
      });
      roomsHtml += `</div></div>`;

      // Group Offices by Department/District
      const getDist = o => (o.districtId || o.district || '').toLowerCase();
      const depts = {
        'EXECUTIVE': offices.filter(o => getDist(o) === 'command-center' || o.department === 'EXECUTIVE'),
        'ENGINEERING': offices.filter(o => ['dev-district', 'creative-district'].includes(getDist(o)) || o.department === 'ENGINEERING'),
        'VERIFICATION': offices.filter(o => ['observatory', 'verification'].includes(getDist(o)) || o.department === 'VERIFICATION'),
        'COGNITIVE': offices.filter(o => ['ai-district', 'data-center'].includes(getDist(o)) || o.department === 'COGNITIVE')
      };
      const categorized = new Set([
        ...depts['EXECUTIVE'],
        ...depts['ENGINEERING'],
        ...depts['VERIFICATION'],
        ...depts['COGNITIVE']
      ]);
      const leftover = offices.filter(o => !categorized.has(o));
      if (leftover.length) {
        depts['OPERATIONAL'] = leftover;
      }

      let suitesHtml = '';
      for (const [deptKey, deptOffices] of Object.entries(depts)) {
        if (!deptOffices.length) continue;
        const meta = DEPARTMENT_META[deptKey] || { title: deptKey, icon: '🏢', color: '#00D9FF' };
        suitesHtml += `
          <div class="office-dept-section">
            <div class="office-dept-header">
              <span class="office-dept-title">${meta.icon} ${esc(meta.title)}</span>
              <span style="font-size:11px; color:#64748B;">${deptOffices.length} escritórios</span>
            </div>
            <div class="office-dept-grid">
        `;

        deptOffices.forEach(office => {
          const agentId = office.ownerAgentId || office.agentId || office.officeId;
          const agentName = office.name || office.agentName || agentId;
          const role = office.role || office.type || 'Agente Autônomo';
          const p = presenceMap.get(agentId) || { status: 'AVAILABLE', statusNote: 'Online' };
          const avatar = AGENT_AVATARS[agentId] || '🤖';
          const pStatus = (p.status || 'AVAILABLE').toLowerCase();
          const doorOpen = office.status !== 'DOOR_CLOSED' && pStatus !== 'blocked';

          // Check if in conversation
          const conv = activeConvs.find(c => (c.participants || []).includes(agentId));
          let cardStatusClass = '';
          if (pStatus === 'in_conversation') cardStatusClass = 'in-conversation';
          else if (pStatus === 'in_meeting') cardStatusClass = 'in-meeting';
          else if (pStatus === 'blocked') cardStatusClass = 'blocked';

          suitesHtml += `
            <div class="office-desk-card ${cardStatusClass}" id="desk-${esc(agentId)}">
              <div class="office-desk-top">
                <div class="office-agent-ident">
                  <div class="office-agent-avatar">
                    <span>${avatar}</span>
                    <span class="office-presence-dot ${pStatus}"></span>
                  </div>
                  <div class="office-agent-meta">
                    <span class="office-agent-name">${esc(agentName)}</span>
                    <span class="office-agent-role">${esc(role)}</span>
                  </div>
                </div>
                <div class="office-desk-door ${doorOpen ? 'open' : ''}" title="${doorOpen ? 'Porta aberta para diálogo' : 'Porta fechada / focado'}">
                  <i class="ph-bold ${doorOpen ? 'ph-door-open' : 'ph-door'}"></i>
                  <span>${doorOpen ? 'Aberta' : 'Fechada'}</span>
                </div>
              </div>

              <div class="office-desk-mission">
                <i class="ph-bold ph-cpu" style="color:#00D9FF;"></i>
                <span style="font-size:10.5px; overflow:hidden; text-overflow:ellipsis;">
                  ${esc(p.statusNote || office.name)}
                </span>
              </div>

              <div class="office-desk-actions">
                <button class="office-desk-btn knock-btn" onclick="window.fenixOffice.openKnockModal('${esc(agentId)}')">
                  <i class="ph-bold ph-hand-tap"></i> Bater na Porta
                </button>
                ${conv ? `
                  <button class="office-desk-btn" style="border-color:#00D9FF; color:#00D9FF;" onclick="window.fenixOffice.openConversation('${esc(conv.conversationId)}')">
                    <i class="ph-bold ph-chats-circle"></i> Conversando
                  </button>
                ` : `
                  <button class="office-desk-btn" onclick="window.fenixOffice.inspectAgent('${esc(office.agentId)}')">
                    <i class="ph-bold ph-user"></i> Detalhes
                  </button>
                `}
              </div>
            </div>
          `;
        });

        suitesHtml += `</div></div>`;
      }

      container.innerHTML = roomsHtml + suitesHtml;
    }

    renderDock(data) {
      if (this.activeDockTab === 'conv') {
        this.renderConversationDock(data);
      } else if (this.activeDockTab === 'meeting') {
        this.renderMeetingDock(data);
      } else if (this.activeDockTab === 'memory') {
        this.renderMemoryDock(data);
      }
    }

    renderConversationDock(data) {
      const container = document.getElementById('officeDockBody');
      if (!container) return;

      const activeConvs = data.activeConversations || [];
      if (!this.activeConversationId && activeConvs.length > 0) {
        this.activeConversationId = activeConvs[0].conversationId;
      }

      const conv = activeConvs.find(c => c.conversationId === this.activeConversationId) || activeConvs[0];

      if (!conv) {
        container.innerHTML = `
          <div style="text-align:center; padding:40px 16px; color:#64748B;">
            <i class="ph-bold ph-chats-circle" style="font-size:32px; color:#334155; margin-bottom:8px; display:block;"></i>
            <div style="font-size:12.5px; font-weight:600; color:#94A3B8;">Nenhuma Conversa Ativa</div>
            <p style="font-size:11px; margin-top:4px;">Bata na porta de qualquer agente para iniciar um diálogo colaborativo.</p>
          </div>
        `;
        return;
      }

      const otherAgent = (conv.participants || []).find(p => p !== 'human_operator') || 'Agente';
      const messages = conv.messages || [];

      container.innerHTML = `
        <div class="office-conv-header">
          <div class="office-conv-title">
            <span>💬 Diálogo com <b>${esc(otherAgent)}</b></span>
          </div>
          <button class="office-btn office-btn-secondary" style="font-size:10.5px; padding:3px 8px;" onclick="window.fenixOffice.closeConversation('${esc(conv.conversationId)}')">
            <i class="ph-bold ph-check"></i> Concluir & Destilar
          </button>
        </div>

        <div class="office-conv-stream" id="officeConvStream">
          ${messages.map(m => {
            const isHuman = m.senderId === 'human_operator';
            return `
              <div class="office-msg-bubble ${isHuman ? 'from-human' : 'from-agent'}">
                <div class="office-msg-author">
                  <span>${esc(m.senderId)}</span>
                  <span class="office-msg-time">${new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style="white-space:pre-wrap;">${esc(m.content)}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="office-conv-compose">
          <textarea id="officeComposeText" class="office-compose-input" placeholder="Escreva sua instrução ou pergunta para ${esc(otherAgent)}..."></textarea>
          <div class="office-compose-actions">
            <span style="font-size:10px; color:#64748B;">Zero-AI Determinístico &bull; RAG Ativo</span>
            <button class="office-btn office-btn-primary" onclick="window.fenixOffice.sendCurrentMessage('${esc(conv.conversationId)}')">
              <i class="ph-bold ph-paper-plane-right"></i> Enviar
            </button>
          </div>
        </div>
      `;

      const streamEl = document.getElementById('officeConvStream');
      if (streamEl) streamEl.scrollTop = streamEl.scrollHeight;
    }

    renderMeetingDock(data) {
      const container = document.getElementById('officeDockBody');
      if (!container) return;

      const activeMeetings = data.activeMeetings || [];
      if (!activeMeetings.length) {
        container.innerHTML = `
          <div style="text-align:center; padding:40px 16px; color:#64748B;">
            <i class="ph-bold ph-users-three" style="font-size:32px; color:#334155; margin-bottom:8px; display:block;"></i>
            <div style="font-size:12.5px; font-weight:600; color:#94A3B8;">Nenhuma Reunião em Andamento</div>
            <p style="font-size:11px; margin-top:4px;">Inicie uma deliberação na Sala Alfa ou Review Room.</p>
            <button class="office-btn office-btn-primary" style="margin-top:10px;" onclick="window.fenixOffice.openMeetingModal()">
              <i class="ph-bold ph-plus"></i> Convocar Reunião
            </button>
          </div>
        `;
        return;
      }

      const m = activeMeetings[0];
      container.innerHTML = `
        <div class="office-conv-header">
          <div class="office-conv-title">
            <span>🏛️ Ata: <b>${esc(m.topic)}</b></span>
          </div>
          <button class="office-btn office-btn-secondary" style="font-size:10.5px; padding:3px 8px;" onclick="window.fenixOffice.closeMeeting('${esc(m.meetingId)}')">
            <i class="ph-bold ph-check"></i> Encerrar Reunião
          </button>
        </div>

        <div style="font-size:11px; color:#94A3B8; display:flex; flex-direction:column; gap:4px;">
          <div><b>Sala:</b> ${esc(m.roomId)} &bull; <b>Líder:</b> ${esc(m.chairpersonId)}</div>
          <div><b>Participantes:</b> ${(m.participants || []).join(', ')}</div>
        </div>

        <div style="font-size:11.5px; font-weight:700; color:#F8FAFC; margin-top:8px;">Transcrições & Diálogo:</div>
        <div class="office-conv-stream" style="max-height:180px;">
          ${(m.transcript || []).map(t => `
            <div class="office-msg-bubble from-agent">
              <div class="office-msg-author">
                <span>${esc(t.senderId)}</span>
                <span class="office-msg-time">${new Date(t.timestamp).toLocaleTimeString()}</span>
              </div>
              <div>${esc(t.content)}</div>
            </div>
          `).join('')}
        </div>

        <div style="font-size:11.5px; font-weight:700; color:#10B981; margin-top:8px;">Decisões Registradas:</div>
        <ul style="margin:0; padding-left:18px; font-size:11px; color:#CBD5E1;">
          ${(m.decisions || []).map(d => `<li>${esc(d.decision || d)}</li>`).join('') || '<li>Nenhuma decisão formalizada ainda.</li>'}
        </ul>
      `;
    }

    renderMemoryDock(data) {
      const container = document.getElementById('officeDockBody');
      if (!container) return;

      container.innerHTML = `
        <div class="office-conv-header">
          <div class="office-conv-title">
            <span>📜 Memória Destilada & Conhecimento</span>
          </div>
        </div>
        <p style="font-size:11px; color:#94A3B8; margin:0;">
          Fatos, decisões arquiteturais e padrões extraídos dos diálogos entre agentes e persistidos na memória ativa do Fênix.
        </p>
        <div id="officeMemoryList" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
          <div class="office-msg-bubble system-note">Carregando destilações recentes...</div>
        </div>
      `;

      fetch('/api/v2/office/memory')
        .then(r => r.json())
        .then(d => {
          const list = document.getElementById('officeMemoryList');
          if (!list) return;
          const items = d.memories || [];
          if (!items.length) {
            list.innerHTML = `<div class="office-msg-bubble system-note">Nenhuma memória destilada recente.</div>`;
            return;
          }
          list.innerHTML = items.map(m => `
            <div style="background:#0E1524; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px 10px; font-size:11px;">
              <div style="display:flex; justify-content:space-between; color:#00D9FF; font-weight:700; font-size:10px;">
                <span>${esc(m.type)} &bull; ${esc(m.category || 'COMMUNICATION')}</span>
                <span style="color:#64748B;">${new Date(m.distilledAt).toLocaleDateString()}</span>
              </div>
              <div style="margin-top:4px; color:#F8FAFC;">${esc(m.content)}</div>
            </div>
          `).join('');
        })
        .catch(e => {
          const list = document.getElementById('officeMemoryList');
          if (list) list.innerHTML = `<div class="office-msg-bubble system-note">Erro ao carregar: ${esc(e.message)}</div>`;
        });
    }

    // Actions: Knocks, Messages, Meetings
    openKnockModal(agentId) {
      this.knockTargetAgent = agentId;
      const modal = document.getElementById('officeKnockModal');
      const targetLabel = document.getElementById('knockTargetLabel');
      if (targetLabel) targetLabel.textContent = agentId;
      if (modal) modal.style.display = 'flex';
    }

    closeKnockModal() {
      const modal = document.getElementById('officeKnockModal');
      if (modal) modal.style.display = 'none';
      this.knockTargetAgent = null;
    }

    async submitKnock() {
      const topicInput = document.getElementById('knockTopicInput');
      const prioritySelect = document.getElementById('knockPrioritySelect');
      const topic = topicInput ? topicInput.value.trim() : '';
      const priority = prioritySelect ? prioritySelect.value : 'NORMAL';

      if (!this.knockTargetAgent) return;
      if (!topic) {
        alert('Por favor informe o motivo do contato.');
        return;
      }

      try {
        const res = await fetch('/api/v2/office/knock', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            fromAgentId: 'human_operator',
            toAgentId: this.knockTargetAgent,
            topic,
            priority
          })
        });
        const data = await res.json();
        this.closeKnockModal();
        if (data.ok && data.decision?.action === 'ACCEPT') {
          if (window.FenixToast) window.FenixToast.show(`Porta aberta! ${this.knockTargetAgent} aceitou a conversa.`, 'success');
          this.activeConversationId = data.conversation?.conversationId;
          this.activeDockTab = 'conv';
          this.refresh();
        } else {
          if (window.FenixToast) window.FenixToast.show(`Resposta: ${data.decision?.reason || 'Ocupado'}`, 'warning');
          this.refresh();
        }
      } catch (err) {
        if (window.FenixToast) window.FenixToast.show('Erro ao bater na porta: ' + err.message, 'error');
      }
    }

    async openConversation(convId) {
      this.activeConversationId = convId;
      this.activeDockTab = 'conv';
      this.refresh();
    }

    async sendCurrentMessage(convId) {
      const input = document.getElementById('officeComposeText');
      if (!input || !input.value.trim()) return;
      const text = input.value.trim();
      input.value = '';

      try {
        const res = await fetch(`/api/v2/office/conversations/${encodeURIComponent(convId)}/messages`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            senderId: 'human_operator',
            content: text,
            messageType: 'MESSAGE'
          })
        });
        const data = await res.json();
        if (data.ok) {
          this.refresh();
        }
      } catch (err) {
        console.warn('[FenixOffice] Error sending message:', err.message);
      }
    }

    async closeConversation(convId) {
      try {
        const res = await fetch(`/api/v2/office/conversations/${encodeURIComponent(convId)}/close`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            closedBy: 'human_operator',
            reason: 'Concluído pelo operador'
          })
        });
        const data = await res.json();
        if (data.ok) {
          if (window.FenixToast) window.FenixToast.show('Conversa encerrada e memória destilada com sucesso!', 'success');
          this.activeConversationId = null;
          this.refresh();
        }
      } catch (err) {
        if (window.FenixToast) window.FenixToast.show('Erro ao feir conversa: ' + err.message, 'error');
      }
    }

    openMeetingModal(defaultRoomId = 'room-meeting-alfa') {
      const modal = document.getElementById('officeMeetingModal');
      const roomSelect = document.getElementById('meetingRoomSelect');
      if (roomSelect && defaultRoomId) roomSelect.value = defaultRoomId;
      if (modal) modal.style.display = 'flex';
    }

    closeMeetingModal() {
      const modal = document.getElementById('officeMeetingModal');
      if (modal) modal.style.display = 'none';
    }

    async submitMeeting() {
      const roomSelect = document.getElementById('meetingRoomSelect');
      const topicInput = document.getElementById('meetingTopicInput');
      const roomId = roomSelect ? roomSelect.value : 'room-meeting-alfa';
      const topic = topicInput ? topicInput.value.trim() : '';

      if (!topic) {
        alert('Por favor informe a pauta da reunião.');
        return;
      }

      // Pick participants based on room
      let participants = ['fenix-ceo-agent', 'fenix-architecture-agent'];
      if (roomId === 'room-review') participants = ['fenix-frontend-agent', 'fenix-backend-agent', 'fenix-qa-agent'];
      if (roomId === 'room-war-room') participants = ['fenix-devops-agent', 'fenix-security-agent', 'fenix-backend-agent'];

      try {
        const res = await fetch('/api/v2/office/meetings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            roomId,
            topic,
            chairpersonId: 'human_operator',
            participants
          })
        });
        const data = await res.json();
        this.closeMeetingModal();
        if (data.ok) {
          if (window.FenixToast) window.FenixToast.show(`Reunião iniciada na sala ${roomId}!`, 'success');
          this.activeDockTab = 'meeting';
          this.refresh();
        }
      } catch (err) {
        if (window.FenixToast) window.FenixToast.show('Erro ao iniciar reunião: ' + err.message, 'error');
      }
    }

    async closeMeeting(meetingId) {
      try {
        const res = await fetch(`/api/v2/office/meetings/${encodeURIComponent(meetingId)}/close`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            closedBy: 'human_operator',
            summary: 'Deliberação encerrada',
            decisions: ['Acordo estabelecido entre os agentes envolvidos']
          })
        });
        const data = await res.json();
        if (data.ok) {
          if (window.FenixToast) window.FenixToast.show('Reunião encerrada e ata salva!', 'success');
          this.refresh();
        }
      } catch (err) {
        if (window.FenixToast) window.FenixToast.show('Erro ao encerrar reunião: ' + err.message, 'error');
      }
    }

    openWarRoomModal() {
      const modal = document.getElementById('officeWarRoomModal');
      if (modal) modal.style.display = 'flex';
    }

    closeWarRoomModal() {
      const modal = document.getElementById('officeWarRoomModal');
      if (modal) modal.style.display = 'none';
    }

    async submitWarRoom() {
      const titleInput = document.getElementById('warRoomTitleInput');
      const sevSelect = document.getElementById('warRoomSevSelect');
      const incidentTitle = titleInput ? titleInput.value.trim() : '';
      const severity = sevSelect ? sevSelect.value : 'CRITICAL';

      if (!incidentTitle) {
        alert('Por favor informe o título da ocorrência.');
        return;
      }

      try {
        const res = await fetch('/api/v2/office/war-room', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            incidentTitle,
            severity,
            commandingAgentId: 'fenix-devops-agent',
            affectedSystems: ['Production VPS', 'Kernel Mesh']
          })
        });
        const data = await res.json();
        this.closeWarRoomModal();
        if (data.ok) {
          if (window.FenixToast) window.FenixToast.show('🚨 WAR ROOM ACIONADA EM MODO DE EMERGÊNCIA!', 'warning');
          this.activeDockTab = 'meeting';
          this.refresh();
        }
      } catch (err) {
        if (window.FenixToast) window.FenixToast.show('Erro ao acionar War Room: ' + err.message, 'error');
      }
    }

    inspectAgent(agentId) {
      if (window.showAgentDetail) {
        window.showAgentDetail(agentId);
      } else {
        if (window.FenixToast) window.FenixToast.show(`Inspecionando agente: ${agentId}`, 'info');
      }
    }

    setDockTab(tab) {
      this.activeDockTab = tab;
      document.querySelectorAll('.office-dock-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dockTab === tab);
      });
      if (this.state) {
        this.renderDock(this.state);
      }
    }
  }

  window.fenixOffice = new FenixOfficeController();

  // Mode switcher for AI City vs Living Agent Office vs Feed (Fase 15: Canvas is HERO)
  window.fenixSetCityMode = function(mode) {
    const worldArea = document.getElementById('fenixCityWorldArea');
    const feedDrawer = document.getElementById('fenixWorldFeedDrawer');
    const inspector = document.getElementById('fenixWorldAgentInspector');
    const districtBar = document.getElementById('fenixCityDistrictBar');
    const floatingHud = document.getElementById('fenixOfficeFloatingHUD');

    const tabWorld3D = document.getElementById('btnCityModeWorld3D');
    const tabWorld = document.getElementById('btnCityModeWorld');
    const tabOffice = document.getElementById('btnCityModeOffice');
    const tabFeed = document.getElementById('btnCityModeFeed');
    const tabUnreal = document.getElementById('btnCityModeUnreal');
    const unrealDeck = document.getElementById('fenixUnrealDeck');

    const pillWorld3D = document.getElementById('btnPillWorld3D');
    if (tabWorld3D) tabWorld3D.classList.toggle('active', mode === 'world3d');
    if (pillWorld3D) pillWorld3D.classList.toggle('active', mode === 'world3d');
    if (tabWorld) tabWorld.classList.toggle('active', mode === 'world');
    if (tabOffice) tabOffice.classList.toggle('active', mode === 'office');
    if (tabFeed) tabFeed.classList.toggle('active', mode === 'feed');
    if (tabUnreal) tabUnreal.classList.toggle('active', mode === 'unreal');

    if (mode === 'world3d') {
      document.body.classList.remove('fenix-mode-2d');
      document.body.classList.add('fenix-mode-3d');
    } else if (mode === 'world') {
      document.body.classList.remove('fenix-mode-3d');
      document.body.classList.add('fenix-mode-2d');
    } else {
      document.body.classList.remove('fenix-mode-2d');
      document.body.classList.add('fenix-mode-3d');
    }

    if (window.fenixOffice) {
      window.fenixOffice.currentMode = mode;
    }

    if (mode === 'unreal') {
      if (unrealDeck) unrealDeck.style.display = 'flex';
      if (worldArea) worldArea.style.display = 'none';
      if (feedDrawer) feedDrawer.style.display = 'none';
      if (floatingHud) floatingHud.style.display = 'none';
      if (districtBar) districtBar.style.display = 'none';
      window.fenixUnreal?.fetchInitialData?.();
    } else {
      if (unrealDeck) unrealDeck.style.display = 'none';
      // Canvas is the hero: ALWAYS visible
      if (worldArea) worldArea.style.setProperty('display', 'block', 'important');
      if (floatingHud) floatingHud.style.display = 'flex';
      if (districtBar) districtBar.style.setProperty('display', 'flex', 'important');

      if (mode === 'world3d') {
        if (feedDrawer) feedDrawer.style.display = 'none';
        if (inspector) inspector.style.display = 'none';
        document.body.classList.remove('fenix-mode-2d');
        document.body.classList.add('fenix-mode-3d');
        const world = window.fenixWorld3D || window.initFenixWorld3D?.();
        if (world) {
          world.resize?.();
          world._resumeAnimationLoop?.();
          world.syncRealData?.();
          if (typeof world.focusEntity === 'function' && typeof THREE !== 'undefined') {
            world.focusEntity(new THREE.Vector3(26, 0, -10), 55);
          }
        }
      } else if (mode === 'office') {
        if (feedDrawer) feedDrawer.style.display = 'none';
        if (window.fenixCity && typeof window.fenixCity.panToDistrict === 'function') {
          window.fenixCity.panToDistrict('command-center');
          window.fenixCity.setZoom?.(2.1);
        }
        window.fenixOffice?.startPolling();
      } else if (mode === 'feed') {
        if (feedDrawer) {
          feedDrawer.style.display = 'flex';
          window.fenixOffice?.renderFeedDrawer();
        }
      } else {
        // mode === 'world'
        if (feedDrawer) feedDrawer.style.display = 'none';
        if (inspector) inspector.style.display = 'none';
        if (window.fenixCity && typeof window.fenixCity.panToDistrict === 'function') {
          window.fenixCity.panToDistrict('ALL');
        }
      }
    }
  };

  window.fenixCloseFeedDrawer = function() {
    const feedDrawer = document.getElementById('fenixWorldFeedDrawer');
    if (feedDrawer) feedDrawer.style.display = 'none';
    const tabOffice = document.getElementById('btnCityModeOffice');
    const tabFeed = document.getElementById('btnCityModeFeed');
    if (tabFeed) tabFeed.classList.remove('active');
    if (tabOffice) tabOffice.classList.add('active');
    if (window.fenixOffice) window.fenixOffice.currentMode = 'office';
  };

  FenixOfficeController.prototype.renderFeedDrawer = async function() {
    const content = document.getElementById('fenixWorldFeedContent');
    if (!content) return;

    try {
      const res = await fetch('/api/v2/office/feed');
      const data = await res.json();
      const events = data.events || this.state?.activityFeed || [];

      if (!events.length) {
        content.innerHTML = '<div style="color:#64748B; padding:24px; text-align:center; font-size:11.5px;">Nenhum evento registrado no feed operacional.</div>';
        return;
      }

      content.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${events.map(ev => {
            const icon = ev.type?.includes('KNOCK') ? '🚪' : ev.type?.includes('MEETING') ? '🏛️' : ev.type?.includes('WAR') ? '🚨' : '💬';
            const title = ev.type?.replace(/_/g, ' ') || 'EVENTO';
            const detail = ev.payload?.topic || ev.payload?.reason || (ev.payload?.fromAgent ? `${ev.payload.fromAgent} ➔ ${ev.payload.toAgent}` : JSON.stringify(ev.payload || {}));
            const timeStr = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '—';
            return `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:10px 12px; font-size:11.5px; display:flex; gap:10px; align-items:flex-start;">
                <span style="font-size:16px; line-height:1; margin-top:2px;">${icon}</span>
                <div style="flex:1; min-width:0;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; color:#F8FAFC; font-size:11px; text-transform:uppercase;">${esc(title)}</span>
                    <span style="font-size:10px; color:#64748B;">${timeStr}</span>
                  </div>
                  <div style="color:#94A3B8; font-size:11px; margin-top:3px; word-break:break-word; line-height:1.35;">${esc(detail)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color:#EF4444; padding:16px; font-size:11px;">Falha ao carregar eventos: ${esc(err.message)}</div>`;
    }
  };

  // On-World Agent Inspector Renderer
  // On-World Agent Inspector Renderer
  function _renderWorldAgentInspectorHTML(agent) {
    const isWorking = ['WORKING', 'RUNNING', 'BUSY', 'TESTING', 'CODING'].includes(String(agent.status || agent.state || '').toUpperCase());
    const isConv = agent.status === 'IN_CONVERSATION' || agent.state === 'RECEIVING_TASK';
    const isMeeting = agent.status === 'IN_MEETING';
    const isWarRoom = agent.status === 'WAR_ROOM';

    let badgeColor = '#10B981';
    let statusLabel = agent.state || agent.status || 'IDLE';

    if (isWarRoom) { badgeColor = '#EF4444'; statusLabel = 'WAR ROOM 🚨'; }
    else if (isMeeting) { badgeColor = '#A855F7'; statusLabel = 'REUNIÃO 🤝'; }
    else if (isConv) { badgeColor = '#F59E0B'; statusLabel = 'CONVERSANDO 💬'; }
    else if (isWorking) { badgeColor = '#00D9FF'; statusLabel = 'OPERANDO ⚡'; }

    const isFollowing = window.fenixCity?.state?.followAgentId === agent.id;
    const hasCompany = Boolean(agent.company || agent.companyId || agent.companyName);
    const companyName = agent.companyName || agent.company || 'Sem empresa vinculada';
    const companyBadge = {
      name: companyName,
      color: hasCompany ? '#00d9ff' : '#64748b',
      icon: hasCompany ? '🏢' : '👤',
      id: agent.companyId || agent.company || null,
      desc: hasCompany ? (agent.department || 'Empresa Vinculada') : 'Agente Autônomo'
    };

    const taskName = agent.currentTask || agent.assignedTask?.taskName || agent.assignedTask?.name || agent.currentJob?.name || agent.currentMission?.title || agent.currentGoal || (isWorking ? 'Em execução técnica no workspace' : 'Standby na estação de trabalho');
    const taskProgress = agent.currentJob?.progress !== undefined ? agent.currentJob.progress : (agent.assignedTask?.progress !== undefined ? agent.assignedTask.progress : (agent.taskProgress !== undefined ? agent.taskProgress : null));

    const skills = Array.isArray(agent.skills) ? agent.skills : [];
    const tools = Array.isArray(agent.tools) ? agent.tools : [];
    const memory = Array.isArray(agent.memory) ? agent.memory : (Array.isArray(agent.episodicMemory) ? agent.episodicMemory : []);
    const model = agent.model || 'qwen2.5:3b';
    const floor = agent.floorNum ? `Andar ${agent.floorNum}` : (agent.buildingId ? 'Andar 1' : 'Pátio');
    const building = agent.buildingId ? (agent.buildingId.replace(/^bld-/, '').toUpperCase()) : 'HQ SPIRE';

    return `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.3);">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:24px; line-height:1;">${agent.emoji || agent.avatar || '🤖'}</div>
          <div>
            <div style="font-weight:700; font-size:13px; color:#F8FAFC;">${esc(agent.displayName || agent.name)}</div>
            <div style="font-size:10px; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px;">${esc(agent.role || 'Specialist Agent')}</div>
          </div>
        </div>
        <button id="fenixWorldAgentInspectorClose" onclick="document.getElementById('fenixWorldAgentInspector').style.display='none'" style="background:none; border:none; color:#64748B; cursor:pointer; font-size:16px; line-height:1; padding:2px 4px;" title="Fechar Inspecao">✕</button>
      </div>

      <div style="padding:12px 14px; display:flex; flex-direction:column; gap:9px; max-height:520px; overflow-y:auto;">
        <!-- Company Affiliation Banner -->
        <div ${companyBadge.id ? `onclick="window.fenixSelectCompany?.('${companyBadge.id}'); window.fenixOpenSystemInspector?.('${companyBadge.id}')"` : ''} style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid ${companyBadge.color}40; border-radius:7px; padding:6px 10px; ${companyBadge.id ? 'cursor:pointer;' : ''}" title="${companyBadge.id ? 'Ver Company Brain' : 'Sem empresa vinculada'}">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px;">${companyBadge.icon}</span>
            <div>
              <div style="font-size:11px; font-weight:700; color:${companyBadge.color};">${companyBadge.name}</div>
              <div style="font-size:9px; color:#64748B;">${companyBadge.desc}</div>
            </div>
          </div>
          ${companyBadge.id ? '<span style="font-size:10px; color:#94A3B8;">Conectar ↗</span>' : ''}
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:10px; color:#64748B; text-transform:uppercase; font-weight:600;">Estado em Tempo Real</span>
          <span style="font-size:10.5px; font-weight:700; color:${badgeColor}; background:rgba(255,255,255,0.05); padding:2px 7px; border-radius:5px; border:1px solid ${badgeColor}40;">${statusLabel}</span>
        </div>

        <!-- Task & Progress -->
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:7px; padding:8px 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
            <span style="font-size:9.5px; color:#64748B; text-transform:uppercase; font-weight:600;">Atividade Atual</span>
            ${taskProgress !== null ? `<span style="font-size:9.5px; font-weight:700; color:#38BDF8;">${taskProgress}%</span>` : ''}
          </div>
          <div style="font-size:11.5px; color:#E2E8F0; line-height:1.35;">
            ${esc(agent.thoughtBubble?.text || taskName)}
          </div>
          ${taskProgress !== null ? `
          <div style="margin-top:6px; background:rgba(255,255,255,0.1); height:4px; border-radius:2px; overflow:hidden;">
            <div style="background:#00D9FF; height:100%; width:${Math.min(100, Math.max(0, taskProgress))}%;"></div>
          </div>` : ''}
        </div>

        <!-- Location & Workstation -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px; padding:6px 8px;">
            <div style="font-size:9px; color:#64748B;">LOCALIZAÇÃO</div>
            <div style="font-size:11px; font-weight:600; color:#38BDF8; margin-top:2px;">${esc(building)} · ${esc(floor)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px; padding:6px 8px;">
            <div style="font-size:9px; color:#64748B;">ESTAÇÃO / MESA</div>
            <div style="font-size:11px; font-weight:600; color:#F8FAFC; margin-top:2px;">${esc(agent.deskLabel || agent.workstationId || 'Mesa Operacional')}</div>
          </div>
        </div>

        <!-- Runtime & AI Model Specs -->
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px; padding:6px 8px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:12px;">🧠</span>
            <span style="font-size:10px; color:#94a3b8;">Runtime Model:</span>
            <span style="font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; color:#a855f7;">${esc(model)}</span>
          </div>
          <span style="font-size:9px; color:#10b981; font-weight:600;">● ZERO-MOCK</span>
        </div>

        <!-- Skills & Tools -->
        ${(skills.length > 0 || tools.length > 0) ? `
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="font-size:9px; color:#64748B; text-transform:uppercase; font-weight:600;">Habilidades & Ferramentas</div>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            ${skills.map(s => `<span style="font-size:9.5px; padding:2px 6px; border-radius:4px; background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.25);">${esc(s)}</span>`).join('')}
            ${tools.map(t => `<span style="font-size:9.5px; padding:2px 6px; border-radius:4px; background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.25);">🛠️ ${esc(t)}</span>`).join('')}
          </div>
        </div>` : ''}

        <!-- Canonical 9-Question Living Agent Lifecycle -->
        ${agent.lifecycle ? `
        <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:8px 10px; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:5px;">
            <span style="font-size:10px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:5px;">
              <i class="ph-bold ph-tree-structure"></i> Ciclo Vital (9 Perguntas Canônicas)
            </span>
            <span style="font-size:9px; background:rgba(16,185,129,0.15); color:#10b981; padding:1px 6px; border-radius:4px; font-weight:700;">● ZERO-MOCK</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:5px; font-size:10.5px; color:#cbd5e1;">
            <!-- 1. Quem sou eu? -->
            <div style="background:rgba(255,255,255,0.02); padding:5px 6px; border-radius:5px;">
              <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">1. Quem sou eu?</strong>
              <div style="color:#f8fafc; font-weight:600; margin-top:1px;">${esc(agent.lifecycle.whoAmI?.name || agent.displayName || agent.name)} · <span style="color:#38bdf8;">${esc(agent.lifecycle.whoAmI?.role || agent.role || 'Especialista')}</span> (${esc(agent.lifecycle.whoAmI?.company || 'Fênix')})</div>
            </div>

            <!-- 2. Onde estou? -->
            <div style="background:rgba(255,255,255,0.02); padding:5px 6px; border-radius:5px;">
              <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">2. Onde estou?</strong>
              <div style="color:#f8fafc; margin-top:1px;">🏢 ${esc(agent.lifecycle.whereAmI?.buildingName || building)} (Andar ${esc(agent.lifecycle.whereAmI?.floorNum != null ? agent.lifecycle.whereAmI.floorNum : floor)}) · ${esc(agent.lifecycle.whereAmI?.district || 'dev-district')}</div>
            </div>

            <!-- 3. O que estou fazendo? -->
            <div style="background:rgba(255,255,255,0.02); padding:5px 6px; border-radius:5px;">
              <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">3. O que estou fazendo?</strong>
              <div style="color:#f8fafc; margin-top:1px;">⚡ <span style="color:${badgeColor}; font-weight:600;">[${esc(agent.lifecycle.whatAmIDoing?.status || statusLabel)}]</span> ${esc(agent.lifecycle.whatAmIDoing?.currentTask || taskName)}</div>
            </div>

            <!-- 4. Por que estou fazendo isso? -->
            <div style="background:rgba(255,255,255,0.02); padding:5px 6px; border-radius:5px;">
              <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">4. Por que estou fazendo isso?</strong>
              <div style="color:#e2e8f0; margin-top:1px;">🎯 ${esc(agent.lifecycle.whyAmIDoingThis?.parentGoal || 'Observação e prontidão operacional')}</div>
            </div>

            <!-- 5. O que farei em seguida? -->
            <div style="background:rgba(255,255,255,0.02); padding:5px 6px; border-radius:5px;">
              <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">5. O que farei em seguida?</strong>
              <div style="color:#e2e8f0; margin-top:1px;">⏭️ ${esc(agent.lifecycle.whatWillIDoNext?.nextAction || 'Aguardar novo job ou diretiva')}</div>
            </div>

            <!-- 6. Qual é minha memória? -->
            <div style="background:rgba(255,255,255,0.02); padding:5px 6px; border-radius:5px;">
              <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">6. Qual é minha memória?</strong>
              <div style="color:#e2e8f0; margin-top:1px;">🧠 ${agent.lifecycle.whatIsMyMemory?.episodicCount || (memory || []).length} episódios persistidos no Graph Brain</div>
            </div>

            <!-- 7. Habilidades e Ferramentas -->
            <div style="background:rgba(255,255,255,0.02); padding:5px 6px; border-radius:5px;">
              <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">7. Habilidades & Ferramentas:</strong>
              <div style="color:#38bdf8; margin-top:1px; font-size:10px;">${(agent.lifecycle.whatAreMySkillsAndTools?.skills || skills || []).slice(0, 4).join(', ') || 'Execução autônoma'}</div>
            </div>

            <!-- 8. Energia e Atenção -->
            <div style="background:rgba(255,255,255,0.02); padding:5px 6px; border-radius:5px; display:flex; justify-content:space-between;">
              <div>
                <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">8. Energia:</strong>
                <span style="color:#10b981; font-weight:700; margin-left:4px;">${agent.lifecycle.whatIsMyEnergyAndAttention?.energyPercent ?? 100}%</span>
              </div>
              <div>
                <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">Atenção:</strong>
                <span style="color:#38bdf8; font-weight:700; margin-left:4px;">${agent.lifecycle.whatIsMyEnergyAndAttention?.attentionPercent ?? 100}%</span>
              </div>
            </div>

            <!-- 9. Como interagir comigo? -->
            <div style="background:rgba(255,255,255,0.02); padding:5px 6px; border-radius:5px;">
              <strong style="color:#94a3b8; font-size:9.5px; text-transform:uppercase;">9. Como interagir comigo?</strong>
              <div style="color:#fbbf24; margin-top:1px; font-size:10px;">${(agent.lifecycle.howToInteract?.allowedActions || ['chat', 'inspect', 'assign', 'follow']).join(' • ')}</div>
            </div>
          </div>
        </div>` : ''}

        <!-- Episodic Memory Log -->
        ${memory.length > 0 ? `
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:7px; padding:6px 8px; display:flex; flex-direction:column; gap:4px;">
          <div style="font-size:9px; color:#64748B; text-transform:uppercase; font-weight:600;">Memória Episódica do Agente</div>
          <div style="display:flex; flex-direction:column; gap:3px; max-height:75px; overflow-y:auto; font-size:10px; color:#cbd5e1; line-height:1.3;">
            ${memory.slice(-3).reverse().map(m => `
              <div style="padding-left:6px; border-left:2px solid #38bdf8;">
                <span style="color:#64748B; font-size:8.5px;">${m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : 'Recent'}:</span>
                ${esc(m.content || m.text || m)}
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        <!-- Direct Living Agent Chat -->
        <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:7px; padding:8px 10px; display:flex; flex-direction:column; gap:6px;">
          <div style="font-size:9.5px; color:#64748B; text-transform:uppercase; font-weight:600; display:flex; justify-content:space-between;">
            <span>Conversa Direta com Agente</span>
            <span style="color:#10B981; font-size:9px;">● ONLINE</span>
          </div>
          <div id="worldAgentChatLog" style="max-height:80px; overflow-y:auto; font-size:11px; color:#cbd5e1; display:flex; flex-direction:column; gap:4px; padding:2px 0;">
            <div style="color:#64748B; font-style:italic;">Pergunte algo para ${esc(agent.displayName || agent.name)}...</div>
          </div>
          <div style="display:flex; gap:6px; margin-top:2px;">
            <input type="text" id="worldAgentChatInput" placeholder="Mensagem..." style="flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:5px; padding:5px 8px; font-size:11px; color:#f8fafc; outline:none;" onkeydown="if(event.key==='Enter') window.fenixSendWorldAgentChat('${agent.id}')" />
            <button id="worldAgentChatSendBtn" onclick="window.fenixSendWorldAgentChat('${agent.id}')" style="background:#0284c7; border:none; border-radius:5px; padding:5px 10px; font-size:10.5px; font-weight:600; color:#ffffff; cursor:pointer;">ENVIAR</button>
          </div>
        </div>

        <!-- Runtime Integration Actions -->
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:2px;">
          <button class="office-btn" onclick="window.fenixOpenAgentWorkspace?.('${agent.id}', '${agent.projectId || 'api-platform'}')" style="justify-content:center; padding:7px 10px; font-size:11px; background:linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2)); border:1px solid rgba(56,189,248,0.4); color:#38bdf8; font-weight:700; cursor:pointer;" title="Abrir Workspace completo do Agente (IDE, Git, Copilot, Terminal)">
            <i class="ph-bold ph-code"></i> Abrir Workspace do Agente
          </button>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <button class="office-btn office-btn-primary" onclick="if (typeof window.showView === 'function') window.showView('agents'); else window.fenixOpenAgent?.('${agent.id}');" style="justify-content:center; padding:6px 8px; font-size:11px; background:#0284c7; color:#ffffff; border:none;" title="Abrir painel completo do agente no runtime">
              <i class="ph-bold ph-terminal-window"></i> Abrir no Runtime
            </button>
            <button class="office-btn" id="btnWorldInspectorFollow" onclick="window.fenixToggleFollowAgent('${agent.id}')" style="justify-content:center; padding:6px 8px; font-size:11px; background:${isFollowing ? 'rgba(0,217,255,0.2)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${isFollowing ? '#00D9FF' : 'rgba(255,255,255,0.08)'}; color:${isFollowing ? '#00D9FF' : '#94A3B8'};">
              <i class="ph-bold ph-video-camera"></i> ${isFollowing ? 'Parar de Seguir' : 'Seguir Câmera'}
            </button>
          </div>
          <button class="office-btn" onclick="window.fenixOffice?.openKnockModal('${agent.id}', '${esc(agent.displayName || agent.name)}')" style="justify-content:center; padding:5px 8px; font-size:10.5px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:#94a3b8;">
            <i class="ph-bold ph-hand-tap"></i> Bater na Porta do Agente
          </button>
        </div>
      </div>
    `;
  }

  window.fenixShowWorldAgentInspector = function(agent) {
    const inspector = document.getElementById('fenixWorldAgentInspector');
    if (!inspector || !agent) return;

    // Fechar qualquer spatial chat paralelo para garantir Single Source of Truth visual
    if (typeof window.closeSpatialChat === 'function') {
      window.closeSpatialChat();
    }

    // Render immediately with current client-side state
    inspector.innerHTML = _renderWorldAgentInspectorHTML(agent);
    inspector.style.display = 'block';

    // Fetch authoritative live agent runtime details and 9-question lifecycle from backend
    if (agent.id) {
      (async () => {
        try {
          const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          const [agentRes, lifeRes] = await Promise.all([
            fetch(`/api/v2/living-city/agent/${encodeURIComponent(agent.id)}`, { headers }).catch(() => null),
            fetch(`/api/v2/living-city/agent/${encodeURIComponent(agent.id)}/lifecycle`, { headers }).catch(() => null)
          ]);

          let needsRerender = false;
          if (agentRes && agentRes.ok) {
            const data = await agentRes.json();
            if (data && data.agent) {
              Object.assign(agent, data.agent);
              needsRerender = true;
            }
          }
          if (lifeRes && lifeRes.ok) {
            const lifeData = await lifeRes.json();
            if (lifeData && lifeData.lifecycle) {
              agent.lifecycle = lifeData.lifecycle;
              needsRerender = true;
            }
          }

          if (needsRerender && inspector.style.display !== 'none') {
            const currentInput = document.getElementById('worldAgentChatInput')?.value || '';
            inspector.innerHTML = _renderWorldAgentInspectorHTML(agent);
            if (currentInput) {
              const newInput = document.getElementById('worldAgentChatInput');
              if (newInput) newInput.value = currentInput;
            }
          }
        } catch (_) {}
      })();
    }
  };

  window.fenixSendWorldAgentChat = async function(agentId) {
    const input = document.getElementById('worldAgentChatInput');
    const log = document.getElementById('worldAgentChatLog');
    if (!input || !log) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    // Append user message
    const userEl = document.createElement('div');
    userEl.style.cssText = 'color:#38bdf8; font-weight:600;';
    userEl.textContent = 'Você: ' + msg;
    log.appendChild(userEl);
    log.scrollTop = log.scrollHeight;

    try {
      const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`/api/v2/living-city/agent/${encodeURIComponent(agentId)}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      if (data && data.reply) {
        const replyEl = document.createElement('div');
        replyEl.style.cssText = 'color:#f8fafc;';
        replyEl.textContent = (data.agentName || agentId) + ': ' + data.reply;
        log.appendChild(replyEl);
        log.scrollTop = log.scrollHeight;

        // Show bubble in city 2.5D
        if (window.fenixCity?.world?.agents) {
          const agent = window.fenixCity.world.agents.get(agentId);
          if (agent) {
            agent.bubble = { text: data.reply, life: 6.0 };
            agent.thoughtBubble = { text: data.reply, life: 6.0, isWork: true };
          }
        }
      }
    } catch (err) {
      const errEl = document.createElement('div');
      errEl.style.cssText = 'color:#ef4444;';
      errEl.textContent = 'Falha ao contatar agente.';
      log.appendChild(errEl);
    }
  };

  window.fenixToggleFollowAgent = function(agentId) {
    const world = window.fenixWorld3D || window.fenixCity;
    if (world?.followingAgentId === agentId) world.stopFollowing?.();
    else world?.followAgent?.(agentId);
    const agent = world?.agents?.get(agentId) || world?.world?.agents?.get(agentId);
    if (agent) window.fenixShowWorldAgentInspector(agent);
  };

  window.fenixStartAgentChat = function(agentId, agentName) {
    window.fenixOffice?.openKnockModal(agentId, agentName);
  };

  // On-World Building Inspector Renderer
  window.fenixShowWorldBuildingInspector = function(distHit) {
    const inspector = document.getElementById('fenixWorldBuildingInspector');
    if (!inspector || !distHit) return;

    const d = distHit.district;
    const allAgents = window.fenixCity?.world?.agents ? [...window.fenixCity.world.agents.values()] : [];
    const residentAgents = allAgents.filter(a => (a.district || '').toLowerCase() === distHit.key.toLowerCase());
    const rawColor = typeof d.color === 'number' ? `#${d.color.toString(16).padStart(6, '0')}` : String(d.color || '#6b8790');
    const buildingColor = /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor : '#6b8790';
    const buildingKey = String(distHit.key || d.key || d.id || '');

    const destination = {
      'command-center': 'command', 'project-district': 'projects',
      'ai-district': 'mcp', 'creative-district': 'ide',
      'dev-district': 'ide', 'data-center': 'memory',
      'observatory': 'observability', 'browser-district': 'browser'
    }[distHit.key] || 'operations';

    inspector.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.3);">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:24px; line-height:1;">${esc(d.emoji || '🏛️')}</div>
          <div>
            <div style="font-weight:700; font-size:13px; color:#F8FAFC;">${esc(d.name || d.label)}</div>
            <div style="font-size:10px; color:${buildingColor}; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">${esc(d.key || 'DISTRITO')}</div>
          </div>
        </div>
        <button type="button" data-building-action="close" aria-label="Fechar edifício" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px; line-height:1; padding:2px 4px;">✕</button>
      </div>

      <div style="padding:12px 14px; display:flex; flex-direction:column; gap:10px;">
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:7px; padding:8px 10px;">
          <div style="font-size:9.5px; color:#64748B; text-transform:uppercase; font-weight:600; margin-bottom:3px;">Departamento & Missão</div>
          <div style="font-size:11.5px; color:#E2E8F0; line-height:1.35;">
            ${esc(d.department || 'Operações centrais do sistema')}
          </div>
        </div>

        ${d.status ? `<div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:7px; padding:8px 10px;"><div style="font-size:9.5px; color:#64748B; text-transform:uppercase; font-weight:600; margin-bottom:3px;">Estado registrado</div><div style="font-size:11.5px; color:#E2E8F0;">${esc(d.status)}</div></div>` : ''}

        <div>
          <div style="font-size:9.5px; color:#64748B; text-transform:uppercase; font-weight:600; margin-bottom:4px;">Capacidades do Kernel</div>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            ${(d.capabilities || []).map(cap => `
              <span style="font-size:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; color:#CBD5E1;">${esc(cap)}</span>
            `).join('')}
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:9.5px; color:#64748B; text-transform:uppercase; font-weight:600;">Agentes Residentes</span>
            <span style="font-size:10px; color:#10B981; font-weight:700;">${residentAgents.length} PRESENTES</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; max-height:120px; overflow-y:auto;">
            ${residentAgents.map(ag => `
              <button type="button" data-agent-id="${esc(ag.id)}" style="width:100%; display:flex; align-items:center; justify-content:space-between; padding:5px 8px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px; cursor:pointer; text-align:left;" title="Clique para inspecionar no mapa">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:13px;">${esc(ag.emoji || '🤖')}</span>
                  <span style="font-size:11px; font-weight:600; color:#F8FAFC;">${esc(ag.displayName || ag.name)}</span>
                </div>
                <span style="font-size:9.5px; color:${ag.status === 'WORKING' ? '#00D9FF' : '#10B981'}; font-weight:600;">${esc(ag.status || 'AVAILABLE')}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:4px;">
          <button type="button" data-building-action="focus" class="office-btn office-btn-primary" style="justify-content:center; padding:6px 8px; font-size:11px;">
            <i class="ph-bold ph-magnifying-glass-plus"></i> Focar Edifício
          </button>
          <button type="button" data-building-action="view" class="office-btn office-btn-secondary" style="justify-content:center; padding:6px 8px; font-size:11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#CBD5E1;">
            <i class="ph-bold ph-arrow-square-out"></i> View Completa
          </button>
        </div>
      </div>
    `;

    inspector.style.display = 'block';
    inspector.querySelector('[data-building-action="close"]').addEventListener('click', () => { inspector.style.display = 'none'; });
    inspector.querySelector('[data-building-action="focus"]').addEventListener('click', () => {
      if (window.fenixCity?.dynamicBuildings?.has(buildingKey)) window.fenixCity.focusBuilding?.(buildingKey);
      else window.fenixCity?.panToDistrict?.(buildingKey);
    });
    inspector.querySelector('[data-building-action="view"]').addEventListener('click', () => window.showView?.(destination));
    inspector.querySelectorAll('[data-agent-id]').forEach((row) => {
      row.addEventListener('click', () => {
        const agentId = row.dataset.agentId;
        const agent = window.fenixCity?.agents?.get(agentId) || window.fenixCity?.world?.agents?.get(agentId);
        if (typeof window.fenixCity?.selectAgent === 'function') window.fenixCity.selectAgent(agentId);
        else if (agent) window.fenixShowWorldAgentInspector?.(agent);
      });
    });
  };

  window.fenixShowWorldProjectInspector = function(project, relatedJobs = []) {
    const inspector = document.getElementById('fenixWorldBuildingInspector');
    if (!inspector || !project?.id) return;
    const snapshot = window.FENIX?.cityWorld?.snapshot || window.fenixWorld3D?.lastCitySnapshot || {};
    const agents = (snapshot.agents || []).filter((agent) => String(agent.projectId || '') === String(project.id));
    const jobs = Array.isArray(relatedJobs) ? relatedJobs.slice(0, 4) : [];
    const status = String(project.lifecycleState || project.status || 'UNKNOWN').toUpperCase();
    const statusColor = ['FAILED', 'ERROR', 'OFFLINE'].includes(status) ? '#f16a72'
      : ['RUNNING', 'ACTIVE', 'BUILDING'].includes(status) ? '#27d7c4'
        : ['QUEUED', 'DEGRADED', 'UNKNOWN'].includes(status) ? '#e8b45d' : '#a9bac9';

    inspector.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.3);">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <div aria-hidden="true" style="display:grid; place-items:center; width:34px; height:34px; border-radius:9px; color:#9bb8c8; background:rgba(120,160,180,.12);">⌂</div>
          <div style="min-width:0;">
            <div data-project-name style="font-weight:700; font-size:13px; color:#F8FAFC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></div>
            <div data-project-status style="font-size:10px; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;"></div>
          </div>
        </div>
        <button type="button" data-action="close" aria-label="Fechar projeto" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px; line-height:1; padding:2px 4px;">✕</button>
      </div>
      <div style="padding:12px 14px; display:flex; flex-direction:column; gap:10px;">
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:7px; padding:8px 10px;">
          <div style="font-size:9.5px; color:#64748B; text-transform:uppercase; font-weight:600; margin-bottom:3px;">Workspace registrado</div>
          <div data-project-workspace style="font-size:11.5px; color:#D4DEE8; line-height:1.4; overflow-wrap:anywhere;"></div>
        </div>
        <div>
          <div style="font-size:9.5px; color:#64748B; text-transform:uppercase; font-weight:600; margin-bottom:4px;">Atividade recente · ${jobs.length}</div>
          <div data-project-jobs style="display:flex; flex-direction:column; gap:4px; max-height:112px; overflow-y:auto;"></div>
        </div>
        <div>
          <div style="font-size:9.5px; color:#64748B; text-transform:uppercase; font-weight:600; margin-bottom:4px;">Agentes vinculados · ${agents.length}</div>
          <div data-project-agents style="display:flex; flex-direction:column; gap:4px; max-height:90px; overflow-y:auto;"></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:2px;">
          <button type="button" data-action="open-project" class="office-btn office-btn-primary" style="justify-content:center; padding:7px 8px; font-size:11px;">Abrir projeto</button>
          <button type="button" data-action="open-operations" class="office-btn office-btn-secondary" style="justify-content:center; padding:7px 8px; font-size:11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#CBD5E1;">Ver operações</button>
        </div>
        <div data-project-navigation-status role="status" style="font-size:10px; color:#f1aa83;"></div>
      </div>
    `;
    inspector.querySelector('[data-project-name]').textContent = project.name || project.id;
    inspector.querySelector('[data-project-status]').textContent = status;
    inspector.querySelector('[data-project-status]').style.color = statusColor;
    inspector.querySelector('[data-project-workspace]').textContent = project.workspace || 'Nenhum workspace informado pelo Project Kernel.';
    inspector.querySelector('[data-action="close"]').addEventListener('click', () => { inspector.style.display = 'none'; });
    inspector.querySelector('[data-action="open-project"]').addEventListener('click', async () => {
      const navigationStatus = inspector.querySelector('[data-project-navigation-status]');
      window.showView?.('projects');
      if (typeof window.openProjectWorkspace !== 'function') {
        navigationStatus.textContent = 'A rota do workspace de projetos não está disponível.';
        return;
      }
      try {
        await window.openProjectWorkspace(project.id);
      } catch (error) {
        navigationStatus.textContent = `Não foi possível abrir ${project.name || project.id}: ${error.message || 'falha na navegação'}`;
      }
    });
    inspector.querySelector('[data-action="open-operations"]').addEventListener('click', () => {
      if (typeof window.fenixNavigateWithContext === 'function') {
        window.fenixNavigateWithContext('operations', { projectId: project.id, jobId: jobs[0]?.id || null });
      } else {
        window.showView?.('operations');
      }
    });

    const jobList = inspector.querySelector('[data-project-jobs]');
    if (!jobs.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:10px; color:#8291a1; padding:6px 8px;';
      empty.textContent = 'Nenhum job recente relacionado neste snapshot.';
      jobList.append(empty);
    } else {
      for (const job of jobs) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; gap:8px; padding:5px 8px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:6px; font-size:10px;';
        const title = document.createElement('span');
        title.style.cssText = 'color:#d7e0e8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
        title.textContent = job.title || job.type || job.id;
        const state = document.createElement('span');
        state.style.cssText = 'color:#a9bac9; white-space:nowrap;';
        state.textContent = String(job.status || 'UNKNOWN').toUpperCase();
        row.append(title, state);
        jobList.append(row);
      }
    }

    const agentList = inspector.querySelector('[data-project-agents]');
    if (!agents.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:10px; color:#8291a1; padding:6px 8px;';
      empty.textContent = 'Nenhum agente com vínculo ativo a este projeto.';
      agentList.append(empty);
    } else {
      for (const agent of agents) {
        const row = document.createElement('button');
        row.type = 'button';
        row.style.cssText = 'display:flex; justify-content:space-between; gap:8px; padding:6px 8px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:6px; color:#d7e0e8; font-size:10px; cursor:pointer;';
        const name = document.createElement('span');
        name.textContent = agent.displayName || agent.name || agent.id;
        const state = document.createElement('span');
        state.textContent = String(agent.status || 'UNKNOWN').toUpperCase();
        row.append(name, state);
        row.addEventListener('click', () => window.fenixCity?.selectAgent?.(agent.id) || window.fenixInspectAgent?.(agent.id));
        agentList.append(row);
      }
    }
    inspector.style.display = 'block';
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.fenixOffice.init();
  });

})();
