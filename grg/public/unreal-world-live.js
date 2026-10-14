'use strict';

/**
 * FÊNIX OS — UNREAL LIVING WORLD 3D LIVE CONTROLLER (Fases 17.3 a 17.15)
 * ======================================================================
 * Protocol: FENIX_WORLD_PROTOCOL_V1
 * Single Source of Truth: Fênix Control Plane (:4400)
 * Drives the 3D Spatial Living World Deck directly in the canonical frontend.
 * Provides interactive 3D spatial viewport, mission dispatch, OODA loop tracking,
 * 9 profession customizer, 7 district navigator, social graph, and real-time telemetry.
 */

(function() {
  class FenixUnrealController {
    constructor() {
      this.protocol = 'FENIX_WORLD_PROTOCOL_V1';
      this.isOnline = false;
      this.activeTab = 'mission';
      this.selectedAgentId = 'agent-backend';
      this.selectedDistrictId = 'dist-hq';
      this.worldData = null;
      this.telemetryData = null;
      this.districtsData = [];
      this.professionProfiles = [];
      this.socialGraphData = null;
      this.oodaTrace = null;
      this.companionData = null;
      this.pollingInterval = null;
      this.animFrameId = null;

      // 3D Viewport Camera State
      this.camera = {
        rotX: 25 * Math.PI / 180,
        rotY: -45 * Math.PI / 180,
        zoom: 0.85,
        panX: 0,
        panY: 0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0
      };

      this.init();
    }

    async init() {
      console.log('[FenixUnreal] Initializing Unreal Living World 3D Controller...');
      this.bindDOM();
      await this.fetchInitialData();
      this.init3DCanvas();
      this.startPolling();
    }

    getAuthHeaders() {
      const token = window.__FENIX_STATE__?.token || localStorage.getItem('fenix_token') || '';
      return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
    }

    async fetchInitialData() {
      try {
        const headers = this.getAuthHeaders();
        const [healthRes, snapRes, telemRes, distRes, profRes, socRes, compRes] = await Promise.all([
          fetch('/api/v2/unreal/health', { headers }),
          fetch('/api/v2/unreal/world-snapshot', { headers }),
          fetch('/api/v2/unreal/telemetry', { headers }),
          fetch('/api/v2/unreal/districts', { headers }),
          fetch('/api/v2/unreal/agent-profiles', { headers }),
          fetch('/api/v2/unreal/social-graph', { headers }),
          fetch('/api/v2/unreal/companion', { headers })
        ]);

        if (healthRes.ok) {
          const h = await healthRes.json();
          this.isOnline = h.status === 'ONLINE';
          this.updateHealthHUD(h);
        }

        if (snapRes.ok) {
          this.worldData = await snapRes.json();
          this.renderAgentSelects();
          this.renderWorkstationMatrix();
        }

        if (telemRes.ok) {
          this.telemetryData = await telemRes.json();
          this.updateTelemetryHUD(this.telemetryData);
        }

        if (distRes.ok) {
          const d = await distRes.json();
          this.districtsData = d.districts || [];
          this.renderDistrictBar();
        }

        if (profRes.ok) {
          const p = await profRes.json();
          this.professionProfiles = p.professions || [];
          this.renderProfessionGrid();
        }

        if (socRes.ok) {
          this.socialGraphData = await socRes.json();
          this.renderSocialGraph();
        }

        if (compRes.ok) {
          this.companionData = await compRes.json();
          this.renderCompanionHUD();
        }
      } catch (err) {
        console.warn('[FenixUnreal] Initial fetch error:', err.message);
      }
    }

    startPolling() {
      if (this.pollingInterval) clearInterval(this.pollingInterval);
      this.pollingInterval = setInterval(async () => {
        const area = document.getElementById('fenixUnrealDeck');
        if (!area || area.style.display === 'none') return;

        try {
          const headers = this.getAuthHeaders();
          const [snapRes, telemRes] = await Promise.all([
            fetch('/api/v2/unreal/world-snapshot', { headers }),
            fetch('/api/v2/unreal/telemetry', { headers })
          ]);

          if (snapRes.ok) {
            this.worldData = await snapRes.json();
            this.renderWorkstationMatrix();
            this.updateSelectedAgentInfo();
          }
          if (telemRes.ok) {
            this.telemetryData = await telemRes.json();
            this.updateTelemetryHUD(this.telemetryData);
          }
        } catch {}
      }, 3000);
    }

    bindDOM() {
      // Sidebar Tab Switching
      document.querySelectorAll('.unreal-sidebar-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          const targetTab = e.currentTarget.dataset.tab;
          this.switchSidebarTab(targetTab);
        });
      });

      // Canvas Drag Controls
      const canvas = document.getElementById('unrealWorldCanvas');
      if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
          this.camera.isDragging = true;
          this.camera.lastMouseX = e.clientX;
          this.camera.lastMouseY = e.clientY;
        });

        window.addEventListener('mouseup', () => {
          this.camera.isDragging = false;
        });

        canvas.addEventListener('mousemove', (e) => {
          if (!this.camera.isDragging) return;
          const deltaX = e.clientX - this.camera.lastMouseX;
          const deltaY = e.clientY - this.camera.lastMouseY;
          this.camera.rotY += deltaX * 0.008;
          this.camera.rotX = Math.max(0.1, Math.min(Math.PI / 2.2, this.camera.rotX + deltaY * 0.008));
          this.camera.lastMouseX = e.clientX;
          this.camera.lastMouseY = e.clientY;
        });

        canvas.addEventListener('wheel', (e) => {
          e.preventDefault();
          this.camera.zoom = Math.max(0.3, Math.min(2.5, this.camera.zoom - e.deltaY * 0.001));
        }, { passive: false });
      }
    }

    switchSidebarTab(tabName) {
      this.activeTab = tabName;
      document.querySelectorAll('.unreal-sidebar-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
      });
      document.querySelectorAll('.unreal-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `unrealTab-${tabName}`);
      });
    }

    updateHealthHUD(health) {
      const el = document.getElementById('unrealHudStatus');
      if (el) {
        el.textContent = health.status || 'ONLINE';
        el.className = `unreal-telem-val ${health.status === 'ONLINE' ? 'green' : 'amber'}`;
      }
    }

    updateTelemetryHUD(telem) {
      if (!telem) return;
      const elFps = document.getElementById('unrealHudFps');
      if (elFps) elFps.textContent = `${telem.hardware?.measuredFps || 60} FPS`;

      const elVram = document.getElementById('unrealHudVram');
      if (elVram) elVram.textContent = `${telem.hardware?.vramBudgetBudgetUsedMb || 2450} / ${telem.hardware?.vramTotalMb || 4096} MB`;

      const elAgents = document.getElementById('unrealHudAgents');
      if (elAgents) elAgents.textContent = `${telem.simulation?.activeAgents || 20} ATIVOS`;
    }

    renderDistrictBar() {
      const bar = document.getElementById('unrealDistrictSelector');
      if (!bar) return;
      bar.innerHTML = this.districtsData.map(d => `
        <button class="unreal-district-chip ${d.id === this.selectedDistrictId ? 'active' : ''}"
                onclick="window.fenixUnreal.panToDistrict('${d.id}')">
          ${d.name.split(' ')[0]}
        </button>
      `).join('');
    }

    panToDistrict(districtId) {
      this.selectedDistrictId = districtId;
      this.renderDistrictBar();
      const dist = this.districtsData.find(d => d.id === districtId);
      if (dist && dist.coordinates) {
        this.camera.panX = -dist.coordinates.x * 0.08;
        this.camera.panY = -dist.coordinates.y * 0.08;
      }
    }

    renderAgentSelects() {
      const agents = this.worldData?.agents || [];
      const sel = document.getElementById('unrealMissionAgentSelect');
      if (sel) {
        if (!agents.some(a => a.agentId === this.selectedAgentId) && agents.length > 0) {
          const defaultBackend = agents.find(a => a.agentId.toLowerCase().includes('backend'));
          this.selectedAgentId = defaultBackend ? defaultBackend.agentId : agents[0].agentId;
        }
        sel.innerHTML = agents.map(a => `
          <option value="${a.agentId}" ${a.agentId === this.selectedAgentId ? 'selected' : ''}>
            ${a.name} (${a.profession || a.department}) [${a.state}]
          </option>
        `).join('');
        sel.onchange = (e) => {
          this.selectedAgentId = e.target.value;
          this.updateSelectedAgentInfo();
        };
      }
      this.updateSelectedAgentInfo();
    }

    updateSelectedAgentInfo() {
      if (!this.worldData) return;
      const targetId = String(this.selectedAgentId || '').toLowerCase().replace(/^agent[-.]/, '');
      const agent = this.worldData.agents?.find(a => {
        const aId = String(a.agentId || '').toLowerCase().replace(/^agent[-.]/, '');
        return aId === targetId || a.agentId === this.selectedAgentId;
      });
      if (!agent) return;

      const nameEl = document.getElementById('unrealSelectedAgentName');
      if (nameEl) nameEl.textContent = `${agent.name} — ${agent.role}`;

      const stateEl = document.getElementById('unrealSelectedAgentState');
      if (stateEl) {
        stateEl.textContent = agent.state;
        stateEl.className = `unreal-telem-val ${agent.state === 'WORKING' ? 'cyan' : 'green'}`;
      }

      const taskEl = document.getElementById('unrealSelectedAgentTask');
      if (taskEl) {
        if (agent.activeMission?.accelerationPlan) {
          const p = agent.activeMission.accelerationPlan;
          taskEl.innerHTML = `${agent.currentTask || 'Missão Ativa'}<div style="margin-top:4px; font-size:10px; color:#38BDF8; font-weight:600;">⚡ Aceleração Fênix: ${p.model} (${p.provider})</div>`;
        } else {
          taskEl.textContent = agent.currentTask || 'Aguardando ordens / Standby operacional';
        }
      }

      const wsEl = document.getElementById('unrealSelectedAgentWs');
      if (wsEl) wsEl.textContent = agent.workstationId || 'Sem mesa atribuída';
    }

    renderWorkstationMatrix() {
      const container = document.getElementById('unrealWorkstationMatrix');
      if (!container || !this.worldData?.workstations) return;

      container.innerHTML = this.worldData.workstations.map(ws => {
        const isOccupied = ws.status === 'OCCUPIED';
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:5px 8px; background:rgba(255,255,255,0.02); border-radius:4px; font-size:11px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${isOccupied ? '#00D9FF' : '#475569'}; box-shadow:${isOccupied ? '0 0 8px #00D9FF' : 'none'};"></span>
              <span style="font-weight:600; color:#F8FAFC;">${ws.workstationId}</span>
              <span style="color:#94A3B8; font-size:10px;">(${ws.department})</span>
            </div>
            <span style="font-family:monospace; font-size:10px; color:${isOccupied ? '#00D9FF' : '#64748B'};">${ws.status}</span>
          </div>
        `;
      }).join('');
    }

    renderProfessionGrid() {
      const container = document.getElementById('unrealProfessionsGrid');
      if (!container) return;

      container.innerHTML = this.professionProfiles.map(p => `
        <div style="padding:8px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span style="font-weight:700; font-size:11px; color:${p.primaryColor};">${p.profession}</span>
            <span style="font-size:9.5px; color:#94A3B8;">${p.defaultDepartment}</span>
          </div>
          <span style="font-size:10px; color:#CBD5E1;">${p.displayName}</span>
          <div style="font-size:9.5px; color:#64748B; font-family:monospace;">Mesh: ${p.meshPreset || p.meshPresetName}</div>
        </div>
      `).join('');
    }

    renderSocialGraph() {
      const container = document.getElementById('unrealSocialLinks');
      if (!container || !this.socialGraphData?.edges) return;

      container.innerHTML = this.socialGraphData.edges.map(e => `
        <div class="social-link-item">
          <div>
            <span style="color:#00D9FF; font-weight:600;">${e.source}</span>
            <span style="color:#64748B; margin:0 4px;">&harr;</span>
            <span style="color:#10B981; font-weight:600;">${e.target}</span>
          </div>
          <span style="font-family:monospace; color:#F59E0B; font-weight:700;">${e.weight}% Confiança</span>
        </div>
      `).join('');
    }

    renderCompanionHUD() {
      if (!this.companionData?.companion) return;
      const comp = this.companionData.companion;
      const statusEl = document.getElementById('unrealCompanionStatus');
      if (statusEl) statusEl.textContent = `${comp.name} (${comp.proximityState})`;
    }

    // ── LIVE ACTIONS ────────────────────────────────────────────────────────

    async dispatchMission() {
      const sel = document.getElementById('unrealMissionAgentSelect');
      if (sel && sel.value) this.selectedAgentId = sel.value;
      const titleInput = document.getElementById('unrealMissionTitle');
      const title = titleInput ? titleInput.value.trim() : '';
      if (!title) {
        alert('Por favor digite o título da missão.');
        return;
      }

      try {
        const res = await fetch('/api/v2/unreal/dispatch-mission', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            agentId: this.selectedAgentId,
            title,
            prompt: title
          })
        });

        const data = await res.json();
        if (data.ok) {
          if (titleInput) titleInput.value = '';
          await this.fetchInitialData();
          this.switchSidebarTab('mission');
        } else {
          alert('Erro ao despachar missão: ' + (data.error || 'Falha'));
        }
      } catch (err) {
        alert('Falha na requisição: ' + err.message);
      }
    }

    async completeMission() {
      const sel = document.getElementById('unrealMissionAgentSelect');
      if (sel && sel.value) this.selectedAgentId = sel.value;
      try {
        const res = await fetch('/api/v2/unreal/complete-mission', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ agentId: this.selectedAgentId })
        });
        const data = await res.json();
        if (data.ok) {
          await this.fetchInitialData();
        }
      } catch (err) {
        alert('Falha: ' + err.message);
      }
    }

    async runCognitiveTick() {
      const sel = document.getElementById('unrealMissionAgentSelect');
      if (sel && sel.value) this.selectedAgentId = sel.value;
      try {
        const res = await fetch('/api/v2/unreal/agent-cognitive-tick', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            agentId: this.selectedAgentId,
            environmentalStimulus: 'OPERATOR_COGNITIVE_PROBE'
          })
        });
        const data = await res.json();
        if (data.ok && data.oodaCycle) {
          this.oodaTrace = data.oodaCycle;
          this.renderOODATrace();
          this.switchSidebarTab('ooda');
        }
      } catch (err) {
        alert('Falha no tick cognitivo: ' + err.message);
      }
    }

    renderOODATrace() {
      const list = document.getElementById('unrealOodaStages');
      if (!list || !this.oodaTrace?.stages) return;

      list.innerHTML = this.oodaTrace.stages.map(s => `
        <div class="ooda-stage-row">
          <span class="ooda-stage-name">${s.stage}</span>
          <span class="ooda-stage-badge done">${s.state}</span>
        </div>
      `).join('');
    }

    async triggerSocialInteraction() {
      try {
        const res = await fetch('/api/v2/unreal/social-interaction', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            initiatorId: this.selectedAgentId,
            targetId: 'agent-qa',
            interactionType: 'REQUEST_HELP'
          })
        });
        const data = await res.json();
        if (data.ok) {
          await this.fetchInitialData();
          this.switchSidebarTab('social');
        }
      } catch (err) {
        alert('Erro: ' + err.message);
      }
    }

    async triggerCinematic(alertType) {
      try {
        const res = await fetch('/api/v2/unreal/trigger-cinematic', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            alertType,
            message: alertType === 'SECURITY_ALERT' ? 'Protocolo de alerta vermelho ativado no Citadel' : 'Operação nominal'
          })
        });
        const data = await res.json();
        if (data.ok) {
          await this.fetchInitialData();
        }
      } catch (err) {
        alert('Erro: ' + err.message);
      }
    }

    async runPopulationBenchmark(count) {
      try {
        const res = await fetch('/api/v2/unreal/population-benchmark', { headers: this.getAuthHeaders() });
        const data = await res.json();
        if (data.ok) {
          const b = data.benchmarks?.find(item => item.agentCount === count);
          if (b) {
            alert(`Benchmark para ${count} Agentes:\nFPS Estimado: ${b.expectedFps}\nCusto de Memória: ${b.memoryCostMb} MB\nParticionamento: ${b.spatialPartitionGrid}`);
          }
        }
      } catch (err) {
        alert('Falha: ' + err.message);
      }
    }

    // ── 3D SPATIAL CANVAS RENDERER ──────────────────────────────────────────

    init3DCanvas() {
      const canvas = document.getElementById('unrealWorldCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resize = () => {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      };
      window.addEventListener('resize', resize);
      resize();

      let lastTime = performance.now();

      const render = (time) => {
        const deck = document.getElementById('fenixUnrealDeck');
        const isVisible = !document.hidden && canvas.isConnected && canvas.offsetParent !== null && deck && getComputedStyle(deck).display !== 'none';
        if (!isVisible) {
          // When hidden/inactive, throttle animation to save CPU
          setTimeout(() => {
            this.animFrameId = requestAnimationFrame(render);
          }, 500);
          return;
        }

        const dt = (time - lastTime) / 1000;
        lastTime = time;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2 + this.camera.panX;
        const cy = canvas.height / 2 + this.camera.panY;
        const zoom = this.camera.zoom;

        // 1. Draw Perspective Grid Ground
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.08)';
        ctx.lineWidth = 1;

        const gridSize = 40 * zoom;
        const gridExtent = 800 * zoom;

        for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(cx + x, cy - gridExtent * Math.cos(this.camera.rotX));
          ctx.lineTo(cx + x, cy + gridExtent * Math.cos(this.camera.rotX));
          ctx.stroke();
        }
        for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(cx - gridExtent, cy + y * Math.cos(this.camera.rotX));
          ctx.lineTo(cx + gridExtent, cy + y * Math.cos(this.camera.rotX));
          ctx.stroke();
        }
        ctx.restore();

        // 2. Draw 7 Districts as Spatial Anchors
        if (this.districtsData) {
          this.districtsData.forEach((d) => {
            const x = cx + (d.coordinates.x * 0.12) * zoom;
            const y = cy + (d.coordinates.y * 0.12 * Math.cos(this.camera.rotX)) * zoom;
            const isSelected = d.id === this.selectedDistrictId;

            ctx.save();
            ctx.fillStyle = isSelected ? 'rgba(0, 217, 255, 0.25)' : 'rgba(15, 23, 42, 0.6)';
            ctx.strokeStyle = isSelected ? '#00D9FF' : 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = isSelected ? 2 : 1;

            ctx.beginPath();
            ctx.arc(x, y, (d.bounds.radius * 0.035) * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Label
            ctx.fillStyle = isSelected ? '#00D9FF' : '#94A3B8';
            ctx.font = `bold ${Math.round(11 * zoom)}px -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(d.name, x, y - (d.bounds.radius * 0.04) * zoom);
            ctx.restore();
          });
        }

        // 3. Draw HQ Central Spire (3 Cutaway Floors)
        ctx.save();
        const hqX = cx;
        const hqY = cy;
        const hqW = 120 * zoom;
        const hqH = 90 * zoom;

        ctx.fillStyle = 'rgba(0, 217, 255, 0.1)';
        ctx.strokeStyle = '#00D9FF';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hqX - hqW / 2, hqY - hqH, hqW, hqH);

        // Floors
        for (let f = 1; f <= 3; f++) {
          const fy = hqY - (hqH / 3) * f;
          ctx.beginPath();
          ctx.moveTo(hqX - hqW / 2, fy);
          ctx.lineTo(hqX + hqW / 2, fy);
          ctx.stroke();

          ctx.fillStyle = '#64748B';
          ctx.font = `${Math.round(8 * zoom)}px monospace`;
          ctx.fillText(`F${f}`, hqX - hqW / 2 + 5, fy + 12 * zoom);
        }
        ctx.restore();

        // 4. Draw Animated Embodied Agents & Workstations
        if (this.worldData?.agents) {
          this.worldData.agents.forEach((ag, idx) => {
            const angle = (idx / this.worldData.agents.length) * Math.PI * 2 + (time * 0.0003);
            const radius = (180 + (idx % 3) * 60) * zoom;
            const agX = cx + Math.cos(angle) * radius;
            const agY = cy + Math.sin(angle) * radius * Math.cos(this.camera.rotX);

            const isSelected = ag.agentId === this.selectedAgentId;
            const isWorking = ag.state === 'WORKING';

            ctx.save();
            // Character Body Circle
            ctx.fillStyle = isWorking ? '#00D9FF' : (isSelected ? '#10B981' : '#A855F7');
            ctx.beginPath();
            ctx.arc(agX, agY, (isSelected ? 7 : 5) * zoom, 0, Math.PI * 2);
            ctx.fill();

            if (isSelected) {
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            // Nameplate
            ctx.fillStyle = '#F8FAFC';
            ctx.font = `${Math.round(9 * zoom)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(ag.name, agX, agY - 10 * zoom);

            // Speech Bubble if working
            if (isWorking) {
              ctx.fillStyle = 'rgba(0, 217, 255, 0.9)';
              ctx.font = `${Math.round(8 * zoom)}px -apple-system, sans-serif`;
              ctx.fillText(`⚡ ${ag.currentTask.slice(0, 16)}...`, agX, agY - 20 * zoom);
            }

            ctx.restore();
          });
        }

        this.animFrameId = requestAnimationFrame(render);
      };

      this.animFrameId = requestAnimationFrame(render);
    }
  }

  // Register Controller globally
  window.fenixUnreal = new FenixUnrealController();
})();
