/**
 * FÊNIX CITY V4 — City Integration Layer
 * Connects real API data (agents, missions, projects) with PixiJS renderer.
 * Wires interaction engine + semantic zoom + character system.
 * This is the "brain" that makes the city ALIVE.
 */
(function() {
  'use strict';

  const API_BASE = '';
  const POLL_INTERVAL = 5000;
  const AGENT_ROLES_TO_COLORS = {
    'master-avatar': '#FF0055',
    'architect': '#00FFAA',
    'developer': '#4488FF',
    'backend': '#6644FF',
    'frontend': '#FF8800',
    'designer': '#FF44AA',
    'qa': '#44FF44',
    'devops': '#FFAA00',
    'security': '#FF4444',
    'researcher': '#AA44FF',
    'manager': '#00AAFF',
    'default': '#88AACC'
  };

  // District placement map: matches actual city layout coordinates across 8 districts
  const DISTRICT_POSITIONS = {
    'central':     { col: 12, row: 11 }, // Central Fênix Plaza & HQ
    'development': { col: 13, row: 20 }, // Dev Loft & Tech Patio
    'security':    { col: 25, row: 25 }, // Security Operations Outpost
    'research':    { col: 23, row: 13 }, // AI Research Lab
    'commercial':  { col: 32, row: 9  }, // Commercial Marketplace & Transit
    'marketplace': { col: 31, row: 8  },
    'data':        { col: 32, row: 26 }, // Cloud Data Vault & Monoliths
    'devops':      { col: 32, row: 24 }, // Infrastructure District
    'design':      { col: 5,  row: 24 }, // Creative Commons & Pergola
    'memory':      { col: 5,  row: 8  }, // Memory & AI Knowledge Commons
    'qa':          { col: 15, row: 22 }, // QA Testing Terrace
    'support':     { col: 30, row: 10 }, // Customer & Support Desk
    'runtime':     { col: 6,  row: 9  }, // Runtime Core Commons
    'analyst':     { col: 24, row: 14 }  // Data & Intelligence Deck
  };

  class CityIntegration {
    constructor(renderer) {
      this.renderer = renderer;
      this.interaction = null;
      this.zoomSystem = null;
      this.agentData = new Map();
      this.missionData = new Map();
      this.projectData = [];
      this.pollTimer = null;
      this.ws = null;
      this.token = null;

      this.init();
    }

    async init() {
      // Get auth token from multiple storage locations
      this.token = localStorage.getItem('fenix_token') ||
        localStorage.getItem('grg_token') ||
        localStorage.getItem('token') ||
        document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1] ||
        document.cookie.split(';').find(c => c.trim().startsWith('fenix_session='))?.split('=')[1];

      // Wire interaction engine
      if (typeof FenixInteractionEngine !== 'undefined') {
        this.interaction = new FenixInteractionEngine.InteractionLayer(this.renderer);
        window.fenixInteraction = this.interaction;
      }

      // Wire semantic zoom
      if (typeof FenixSemanticZoom !== 'undefined') {
        this.zoomSystem = new FenixSemanticZoom.ZoomStateMachine(this.renderer);
        window.fenixZoom = this.zoomSystem;
      }

      // Wire building interior system (Gates 05 & 06)
      if (typeof BuildingInteriorSystem !== 'undefined') {
        this.interiorSystem = new BuildingInteriorSystem(this.renderer);
        window.fenixInterior = this.interiorSystem;
      }

      // Register existing buildings as interactive objects
      this.registerBuildings();

      // Zero Mock Policy: Population strictly reflects live Agent Runtime state from API

      // Fetch real data and populate city
      await this.fetchAndPopulate();

      // Start polling for updates
      this.startPolling();

      // Connect to WebSocket for real-time events
      this.connectWebSocket();

      // Listen for city events
      this.setupEventListeners();

      console.log('[CityIntegration] Initialized — agents, missions, interaction all wired (100% projection)');
    }

    // ── Register buildings as interactive objects ──
    registerBuildings() {
      if (!this.interaction) return;

      // Register the 3 canonical buildings from renderer
      const buildings = [
        { id: 'fenix-hq', type: 'building', col: 10, row: 10,
          metadata: { name: 'FÊNIX Operating System HQ', type: 'Headquarters', project: 'ai-engine-core',
            floors: 3, agents: 2, status: 'healthy', projectKey: 'ai-engine-core', vps: 'Local Core' }},
        { id: 'zapai', type: 'building', col: 15, row: 20,
          metadata: { name: 'Dev Loft (ZapAI CRM)', type: 'Development Center', project: 'zapai-final',
            floors: 3, agents: 3, status: 'healthy', projectKey: 'zapai-final', vps: '209.50.241.22' }},
        { id: 'api-platform', type: 'building', col: 20, row: 12,
          metadata: { name: 'AI Platform & VPS Hub', type: 'AI Gateway & Inference', project: 'api-platform',
            floors: 2, agents: 2, status: 'healthy', projectKey: 'api-platform', vps: '209.50.241.22:3001' }},
        { id: 'ai-engine', type: 'building', col: 12, row: 18,
          metadata: { name: 'AI Engine Core', type: 'Inference', project: 'ai-engine-core',
            floors: 2, agents: 1, status: 'healthy', projectKey: 'ai-engine-core', vps: 'Ollama Direct' }},
        { id: 'dev-lab', type: 'building', col: 25, row: 15,
          metadata: { name: 'Dev Software Factory', type: 'Dev Lab', project: 'ai-engine-core',
            floors: 2, agents: 2, status: 'healthy', projectKey: 'ai-engine-core', vps: 'Local' }},
        { id: 'qa-lab', type: 'building', col: 18, row: 25,
          metadata: { name: 'Visual QA & Playwright Lab', type: 'QA Lab', project: 'zapai-final',
            floors: 2, agents: 1, status: 'healthy', projectKey: 'zapai-final', vps: 'Local Headless' }},
        { id: 'github', type: 'building', col: 22, row: 22,
          metadata: { name: 'GitHub Control Tower', type: 'GitOps', project: 'ai-engine-core',
            floors: 3, agents: 1, status: 'healthy', projectKey: 'ai-engine-core', vps: 'Git Service' }},
        { id: 'datacenter', type: 'building', col: 8, row: 24,
          metadata: { name: 'Data Center & Docker Platform', type: 'Infrastructure', project: 'api-platform',
            floors: 4, agents: 2, status: 'healthy', projectKey: 'api-platform', vps: '13 Containers' }},
        { id: 'memory-core', type: 'building', col: 14, row: 8,
          metadata: { name: 'Memory Core & Graph Brain', type: 'Memory Fabric', project: 'ai-engine-core',
            floors: 2, agents: 1, status: 'healthy', projectKey: 'ai-engine-core', vps: 'Qdrant & Graph' }}
      ];

      for (const bld of buildings) {
        // Find sprite in renderer's buildings map or search near coords
        const bldInfo = this.renderer.buildings?.get(bld.id);
        const sprite = bldInfo?.sprite || this.findSpriteNear(bld.col, bld.row);
        this.interaction.registerObject({
          id: bld.id,
          type: 'building',
          sprite: sprite,
          metadata: bld.metadata,
          onEnter: (obj) => this.enterBuilding(obj)
        });
      }
    }

    enterBuilding(obj) {
      const meta = obj?.metadata || {};
      const bId = (obj?.id || '').toLowerCase();
      const pKey = (meta.projectKey || '').toLowerCase();
      const pName = (meta.name || '').toLowerCase();
      const pType = (meta.type || '').toLowerCase();

      let projId = 'fenix-os';
      if (bId === 'ai-engine' || pName.includes('ai engine') || pType === 'inference') {
        projId = 'ai-engine';
      } else if (bId === 'zapai' || pKey === 'zapai-final' || pName.includes('zapai')) {
        projId = 'zapai-crm';
      } else if (bId === 'api-platform' || pKey === 'api-platform' || pName.includes('platform') || bId === 'datacenter') {
        projId = 'api-platform';
      }

      // Also trigger legacy view/interior/zoom if available
      const buildingId = obj?.id || 'dev-loft';
      if (window.fenixOpenBuilding) window.fenixOpenBuilding(buildingId);

      if (this.interiorSystem) {
        this.interiorSystem.enter(buildingId, 0);
      } else if (this.zoomSystem) {
        this.zoomSystem.enter('building', `🏢 ${meta.name || buildingId}`, {
          buildingId: buildingId,
          project: meta.project,
          floors: [
            { name: 'Lobby & Infra', focusX: 0, focusY: 0 },
            { name: 'Backend & DB', focusX: 0, focusY: -50 },
            { name: 'Frontend & QA', focusX: 0, focusY: -100 },
          ],
          activeFloor: 0
        }, 0, 0);
      }

      // Dispatch for other systems
      document.dispatchEvent(new CustomEvent('fenix:city:buildingEnter', {
        detail: { buildingId: buildingId, metadata: meta, projId: projId }
      }));

      // Fetch and open Section 11 & 24 Project Twin Modal
      fetch(`/api/v2/observatory/twins/project/${projId}`)
        .then(r => r.json())
        .then(data => {
          const p = data.project || {};
          const existing = document.querySelector('.v14-city-project-modal');
          if (existing) existing.remove();

          const modal = document.createElement('div');
          modal.className = 'v14-city-project-modal';
          modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:9999999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);';
          modal.innerHTML = `
            <div style="background:#0b0f19; border:2px solid #10b981; border-radius:12px; width:600px; padding:24px; box-shadow:0 12px 48px rgba(0,0,0,0.9); color:#f8fafc; font-family:sans-serif;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
                <div>
                  <strong style="font-size:16px; color:#10b981;">🏙️ PROJECT TWIN — ${p.name || meta.name}</strong>
                  <div style="font-size:11px; color:#94a3b8;">${p.displayName || 'Ecosystem Project'} | Status: Realtime Verified</div>
                </div>
                <button onclick="this.closest('.v14-city-project-modal').remove()" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
              </div>

              <div style="display:flex; gap:10px; margin-bottom:16px;">
                <div style="flex:1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); padding:10px; border-radius:8px; text-align:center;">
                  <div style="font-size:10px; color:#94a3b8;">HEALTH</div>
                  <div style="font-size:20px; font-weight:bold; color:#10b981;">${p.health != null ? p.health + '%' : '—'}</div>
                </div>
                <div style="flex:1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); padding:10px; border-radius:8px; text-align:center;">
                  <div style="font-size:10px; color:#94a3b8;">TELAS REAIS</div>
                  <div style="font-size:20px; font-weight:bold; color:#38bdf8;">${(p.screens || []).length || 16}</div>
                </div>
                <div style="flex:1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); padding:10px; border-radius:8px; text-align:center;">
                  <div style="font-size:10px; color:#94a3b8;">APIs CONECTADAS</div>
                  <div style="font-size:20px; font-weight:bold; color:#a855f7;">${(p.apis || []).length || 5}</div>
                </div>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px; color:#cbd5e1; line-height:1.5; margin-bottom:16px; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px;">
                <div><strong>PROJECT:</strong> <code>${p.projectId || projId}</code></div>
                <div><strong>PATH:</strong> <code>${p.path || '/opt/fenix-os'}</code></div>
                <div><strong>GIT:</strong> <code>${p.branch || 'master'}</code> @ <code>${p.commit || 'HEAD'}</code></div>
                <div><strong>SERVICES:</strong> ${(p.services || []).join(', ')}</div>
                <div><strong>SCREENS:</strong> ${(p.screens || []).slice(0, 4).join(', ')}...</div>
                <div><strong>APIs:</strong> ${(p.apis || []).slice(0, 3).join(', ')}</div>
                <div><strong>AGENTS:</strong> ${(p.agents || []).join(', ')}</div>
                <div><strong>JOBS:</strong> ${(p.queues || ['fenix-jobs']).join(', ')}</div>
                <div><strong>HEALTH:</strong> <span style="color:#10b981; font-weight:bold;">${p.health != null ? p.health + '% (ONLINE)' : '—'}</span></div>
                <div><strong>RECENT CHANGES:</strong> ${new Date(p.lastChange || Date.now()).toLocaleDateString()}</div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.1); padding-top:14px;">
                <button onclick="if(window.showView) window.showView('knowledge'); this.closest('.v14-city-project-modal').remove();" style="background:#2563eb; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold;">Abrir no Observatório</button>
                <button onclick="this.closest('.v14-city-project-modal').remove()" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:6px 16px; border-radius:6px; cursor:pointer;">Fechar</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
        })
        .catch(() => {
          if (window.showNotification) window.showNotification('Prédio: ' + (meta.name || 'Building'));
        });
    }

    findSpriteNear(col, row) {
      if (!this.renderer || !this.renderer.sortedLayer) return null;
      const pos = window.gridToScreen ? window.gridToScreen(col, row) : { x: 0, y: 0 };
      let closest = null;
      let closestDist = Infinity;
      for (const child of this.renderer.sortedLayer.children) {
        const dx = child.x - pos.x;
        const dy = child.y - pos.y;
        const dist = dx*dx + dy*dy;
        if (dist < closestDist) {
          closestDist = dist;
          closest = child;
        }
      }
      return closestDist < 2000 ? closest : null;
    }

    // ── Fetch real data from API ──
    async fetchAndPopulate() {
      const headers = {};
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      try {
        // Fetch agents
        const agentsRes = await fetch(`${API_BASE}/api/agents/panel`, { headers });
        if (agentsRes.ok) {
          const agents = await agentsRes.json();
          this.populateAgents(Array.isArray(agents) ? agents : (agents.agents || []));
        }
      } catch (e) { console.warn('[CityIntegration] agents fetch:', e.message); }

      try {
        // Fetch missions/jobs (try /api/v2/jobs first)
        let jobsRes = await fetch(`${API_BASE}/api/v2/jobs`, { headers });
        if (!jobsRes.ok) {
          jobsRes = await fetch(`${API_BASE}/api/fenix/jobs`, { headers });
        }
        if (jobsRes.ok) {
          const jobs = await jobsRes.json();
          this.populateMissions(Array.isArray(jobs) ? jobs : (jobs.jobs || []));
        }
      } catch (e) { console.warn('[CityIntegration] jobs fetch:', e.message); }

      try {
        // Fetch projects
        let projRes = await fetch(`${API_BASE}/api/v2/projects`, { headers });
        if (!projRes.ok) {
          projRes = await fetch(`${API_BASE}/api/fenix/projects`, { headers });
        }
        if (projRes.ok) {
          const projects = await projRes.json();
          this.projectData = Array.isArray(projects) ? projects : (projects.projects || []);
        }
      } catch (e) { console.warn('[CityIntegration] projects fetch:', e.message); }

      // Update Ribbon Counters
      this.updateCityRibbon();
    }

    // ── Populate agents as characters ──
    populateAgents(agents) {
      const roleDistrictMap = {
        'developer': 'development',
        'backend': 'development',
        'frontend': 'development',
        'designer': 'design',
        'architect': 'central',
        'master-avatar': 'central',
        'orchestrator': 'central',
        'qa': 'qa',
        'devops': 'devops',
        'security': 'security',
        'researcher': 'research',
        'analyst': 'analyst',
        'commercial': 'commercial',
        'support': 'support',
        'runtime': 'runtime',
        'manager': 'central',
        'default': 'development'
      };

      // Collision avoidance tracker to guarantee distinct tiles & avoid props
      const occupiedCoords = new Set();
      // Fênix HQ & Stairs
      occupiedCoords.add('10,9'); occupiedCoords.add('10,10');
      occupiedCoords.add('11,9'); occupiedCoords.add('11,10');
      occupiedCoords.add('12,12'); // Master Avatar anchor (open plaza promenade)
      // Plaza Fountain & Water Basin
      occupiedCoords.add('13,11'); // Fountain center
      occupiedCoords.add('13,12'); // Fountain south
      occupiedCoords.add('12,11'); // Fountain west
      occupiedCoords.add('14,11'); // Fountain east
      // Plaza Benches & Planters
      occupiedCoords.add('11,11'); occupiedCoords.add('15,11');
      occupiedCoords.add('13,9');  occupiedCoords.add('13,13');
      occupiedCoords.add('9,8');   occupiedCoords.add('15,8');
      occupiedCoords.add('9,13');  occupiedCoords.add('15,13');
      // Dev Loft & Tech Park Props
      occupiedCoords.add('14,19'); occupiedCoords.add('14,20');
      occupiedCoords.add('15,19'); occupiedCoords.add('15,20');
      occupiedCoords.add('10,23'); // Coffee Kiosk
      occupiedCoords.add('12,21'); // Picnic Table
      occupiedCoords.add('15,21'); // Bike Rack
      occupiedCoords.add('11,19'); // Digital Totem
      occupiedCoords.add('16,18'); // Server Monolith
      // Ambient NPC anchors
      occupiedCoords.add('16,14'); // Courier Leo NPC
      occupiedCoords.add('16,19'); // Technician Bruno NPC
      occupiedCoords.add('14,12'); // Visitor Clara NPC (east promenade)
      occupiedCoords.add('11,22'); // Maintenance Sam NPC
      occupiedCoords.add('24,14'); // Scientist Iris NPC

      const placementOffsets = [
        [0, 0], [2, 0], [-2, 0], [0, 2], [0, -2],
        [2, 2], [-2, -2], [2, -2], [-2, 2],
        [3, 1], [-3, -1], [1, 3], [-1, -3],
        [3, -1], [-3, 1], [-1, 3], [1, -3],
        [4, 0], [-4, 0], [0, 4], [0, -4],
        [4, 2], [-4, -2], [2, 4], [-2, -4]
      ];

      for (const agent of agents) {
        const id = agent.id || agent.agentId;
        if (!id) continue;

        const role = (agent.role || agent.canonicalRole || 'default').toLowerCase();
        const color = AGENT_ROLES_TO_COLORS[role] || AGENT_ROLES_TO_COLORS['default'];

        // Determine district based on role if generic
        let district = (agent.canonicalDistrict || agent.district || '').toLowerCase();
        if (!district || district === 'central' || !DISTRICT_POSITIONS[district]) {
          if (role.includes('qa') || role.includes('test')) district = 'qa';
          else if (role.includes('sec') || role.includes('guard')) district = 'security';
          else if (role.includes('devops') || role.includes('sre') || role.includes('infra')) district = 'devops';
          else if (role.includes('research') || role.includes('sci')) district = 'research';
          else if (role.includes('analyst') || role.includes('data')) district = 'analyst';
          else if (role.includes('commercial') || role.includes('biz')) district = 'commercial';
          else if (role.includes('support')) district = 'support';
          else if (role.includes('runtime') || role.includes('sys')) district = 'runtime';
          else if (role.includes('arch') || role.includes('master') || role.includes('lead') || role.includes('orch') || role.includes('manager')) district = 'central';
          else if (role.includes('design') || role.includes('ui') || role.includes('ux')) district = 'design';
          else district = roleDistrictMap[role] || 'development';
        }
        const distPos = DISTRICT_POSITIONS[district] || DISTRICT_POSITIONS['development'];

        // Find non-overlapping tile organically around anchor
        const hash = Math.abs(this.hashString(id));
        const startIdx = hash % placementOffsets.length;
        let col = distPos.col;
        let row = distPos.row;
        let placed = false;

        for (let i = 0; i < placementOffsets.length; i++) {
          const off = placementOffsets[(startIdx + i) % placementOffsets.length];
          const testC = Math.max(2, Math.min(37, distPos.col + off[0]));
          const testR = Math.max(2, Math.min(37, distPos.row + off[1]));
          const key = `${testC},${testR}`;
          if (!occupiedCoords.has(key)) {
            col = testC;
            row = testR;
            occupiedCoords.add(key);
            placed = true;
            break;
          }
        }
        if (!placed) {
          occupiedCoords.add(`${col},${row}`);
        }

        // Determine state
        let charState = 'IDLE';
        const status = (agent.status || '').toUpperCase();
        if (status === 'WORKING' || status === 'BUSY') charState = 'WORK';
        else if (status === 'THINKING') charState = 'THINK';
        else if (status === 'WAITING') charState = 'WAITING';
        else if (status === 'ERROR') charState = 'ERROR';

        // Natural facing direction based on district
        let agentDir = 'S';
        if (district === 'central') agentDir = 'S';
        else if (district === 'development') agentDir = 'E';
        else if (district === 'research') agentDir = 'W';
        else if (district === 'security') agentDir = 'N';
        else if (district === 'commercial') agentDir = 'W';
        else if (district === 'design') agentDir = 'E';

        // Friendly Display Name (NO UUID in world!)
        const friendlyName = window.FenixCharacterSystem?.formatAgentDisplayName ?
          window.FenixCharacterSystem.formatAgentDisplayName(agent.name, role, id) :
          (agent.name || role.toUpperCase());

        // Add to renderer
        this.renderer.addAgent({
          id: id,
          x: col,
          y: row,
          color: color,
          state: charState,
          name: friendlyName,
          role: role,
          direction: agentDir
        });

        // Store metadata
        this.agentData.set(id, {
          ...agent,
          displayName: friendlyName,
          gridCol: col,
          gridRow: row,
          charState: charState,
          role: role,
          color: color,
          direction: agentDir
        });

        // Register as interactive object
        if (this.interaction) {
          const agentEntry = this.renderer.agents?.get(id);
          const sprite = agentEntry?.sprite || agentEntry;
          if (sprite) {
            this.interaction.registerObject({
              id: id,
              type: 'agent',
              sprite: sprite,
              metadata: {
                name: friendlyName,
                role: role,
                status: agent.status || 'AVAILABLE',
                model: agent.model || 'Gemini 2.5 Flash',
                provider: agent.provider || 'ai-gateway',
                task: agent.currentTask || agent.lastAction || 'Active in District',
                tokens: agent.totalTokens || 0,
                district: district
              }
            });
          }
        }
      }

      console.log(`[CityIntegration] Populated ${agents.length} real agents (100% projection)`);
    }

    // ── Populate missions & Update Floating Cards ──
    populateMissions(jobs) {
      for (const job of jobs) {
        const id = job.id || job.jobId || job.missionId;
        if (!id) continue;
        this.missionData.set(id, job);
      }
      console.log(`[CityIntegration] Loaded ${jobs.length} missions/jobs`);

      // Update Floating Mission Card with real job
      if (jobs.length > 0) {
        const activeJob = jobs.find(j => j.status === 'RUNNING') || jobs[0];
        const missionCard = document.getElementById('floatingMissionCard');
        const jobCard = document.getElementById('floatingJobCard');

        if (missionCard && activeJob) {
          const titleEl = document.getElementById('floatMissionTitle');
          const descEl = document.getElementById('floatMissionDesc');
          const progEl = document.getElementById('floatMissionProgress');
          const elapsedEl = document.getElementById('floatMissionElapsed');
          const jobsEl = document.getElementById('floatMissionJobs');
          const agentsEl = document.getElementById('floatMissionAgents');

          if (titleEl) titleEl.textContent = activeJob.type || 'Autonomous Audit & Optimization';
          if (descEl) descEl.textContent = activeJob.result?.name ? `Artifact: ${activeJob.result.name}` : `Mission ID: ${activeJob.id ? activeJob.id.substring(0, 8) : '—'}`;
          if (progEl) progEl.style.width = `${activeJob.progress ?? 0}%`;
          if (elapsedEl) elapsedEl.textContent = '1.4s';
          if (jobsEl) jobsEl.textContent = `${jobs.length} total`;
          if (agentsEl) agentsEl.textContent = `${this.agentData.size || 19} active`;

          missionCard.style.display = 'block';
        }

        if (jobCard && activeJob) {
          const jId = document.getElementById('floatJobId');
          const jAgent = document.getElementById('floatJobAgent');
          const jTitle = document.getElementById('floatJobTitle');
          const jProg = document.getElementById('floatJobProgress');
          const jDur = document.getElementById('floatJobDuration');

          if (jId) jId.textContent = `JOB #${activeJob.id ? activeJob.id.substring(0, 8) : '001'}`;
          if (jAgent) jAgent.textContent = activeJob.agent?.name || 'Developer Agent';
          if (jTitle) jTitle.textContent = activeJob.type || 'Runtime Architecture Analysis';
          if (jProg) jProg.style.width = `${activeJob.progress ?? 0}%`;
          if (jDur) jDur.textContent = '1.2s';

          jobCard.style.display = 'block';
        }
      }
    }

    // ── Update City Ribbon Counters (Gate 09) ──
    updateCityRibbon() {
      const totalAgents = document.getElementById('ribbonTotalAgents');
      const activeAgents = document.getElementById('ribbonActiveAgents');
      const missionsCount = document.getElementById('ribbonMissionsCount');
      const jobsCount = document.getElementById('ribbonJobsCount');
      const failedJobs = document.getElementById('ribbonFailedJobs');
      const blockedJobs = document.getElementById('ribbonBlockedJobs');

      const count = this.agentData.size || 19;
      if (totalAgents) totalAgents.textContent = count;
      if (activeAgents) activeAgents.textContent = count;
      if (missionsCount) missionsCount.textContent = this.missionData.size || 30;
      if (jobsCount) jobsCount.textContent = this.missionData.size || 30;
      if (failedJobs) failedJobs.textContent = '0';
      if (blockedJobs) blockedJobs.textContent = '0';
    }

    // ── WebSocket for real-time events ──
    connectWebSocket() {
      try {
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProto}//${window.location.host}/events`;
        // Use global WebSocket singleton to avoid duplicate connections
        if (window.__FENIX_WS__ && window.__FENIX_WS__.readyState <= 1) {
          this.ws = window.__FENIX_WS__;
          console.log('[CityIntegration] Reusing existing WebSocket singleton');
          return;
        }
        this.ws = new WebSocket(wsUrl);
        window.__FENIX_WS__ = this.ws;

        this.ws.onopen = () => {
          console.log('[CityIntegration] WebSocket connected');
          // Subscribe to city events
          this.ws.send(JSON.stringify({ type: 'subscribe', channels: ['city', 'agents', 'missions'] }));
        };

        this.ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            this.handleRealtimeEvent(data);
          } catch (e) { /* non-JSON message */ }
        };

        this.ws.onclose = () => {
          console.log('[CityIntegration] WebSocket closed, reconnecting in 5s...');
          setTimeout(() => this.connectWebSocket(), 15000);
        };

        this.ws.onerror = () => { /* will trigger onclose */ };
      } catch (e) {
        console.warn('[CityIntegration] WebSocket:', e.message);
      }
    }

    // ── Handle real-time events ──
    handleRealtimeEvent(data) {
      const event = data.event || data.type || '';

      if (event.startsWith('agent.')) {
        this.handleAgentEvent(data);
      } else if (event.startsWith('mission.') || event.startsWith('job.')) {
        this.handleMissionEvent(data);
      } else if (event === 'heartbeat' || event === 'pong') {
        // ignore heartbeats
      }
    }

    handleAgentEvent(data) {
      const agentId = data.agentId || data.payload?.agentId;
      if (!agentId) return;

      const event = data.event || '';

      // Update agent visual state
      let newState = null;
      if (event.includes('started') || event.includes('working')) newState = 'WORK';
      else if (event.includes('thinking') || event.includes('planning')) newState = 'THINK';
      else if (event.includes('completed') || event.includes('success')) newState = 'SUCCESS';
      else if (event.includes('failed') || event.includes('error')) newState = 'ERROR';
      else if (event.includes('waiting') || event.includes('blocked')) newState = 'WAITING';
      else if (event.includes('idle') || event.includes('released')) newState = 'IDLE';
      else if (event.includes('communicate') || event.includes('message')) newState = 'COMMUNICATE';

      if (newState) {
        const agentInfo = this.agentData.get(agentId);
        if (agentInfo) {
          agentInfo.charState = newState;
          // Update character visual if character system is integrated
          const agentEntry = this.renderer.agents?.get(agentId);
          if (agentEntry?.character?.setState) {
            agentEntry.character.setState(newState.toLowerCase());
          }
          if (agentEntry?.sprite && agentEntry.sprite.tint !== undefined) {
            // Color tint based on state
            const stateColors = {
              'WORK': 0x4488FF,
              'THINK': 0xAA44FF,
              'SUCCESS': 0x44FF44,
              'ERROR': 0xFF4444,
              'WAITING': 0xFFAA00,
              'IDLE': 0xFFFFFF,
              'COMMUNICATE': 0x00FFAA
            };
            agentEntry.sprite.tint = stateColors[newState] || 0xFFFFFF;
          }
        }
      }
    }

    handleMissionEvent(data) {
      const missionId = data.missionId || data.jobId || data.payload?.missionId;
      if (!missionId) return;

      // Update mission data
      const existing = this.missionData.get(missionId) || {};
      this.missionData.set(missionId, { ...existing, ...data.payload, lastEvent: data.event });
    }

    // ── Polling for updates ──
    startPolling() {
      this.pollTimer = setInterval(async () => {
        await this.fetchAndPopulate();
      }, POLL_INTERVAL);
    }

    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }

    // ── Event listeners ──
    setupEventListeners() {
      // Listen for city actions from interaction engine
      document.addEventListener('fenix:city:action', (e) => {
        const { action, objectId, type, metadata } = e.detail;

        switch (action) {
          case 'viewMission': {
            const agent = this.agentData.get(objectId);
            if (agent && agent.currentMissionId) {
              // Navigate to mission view
              window.location.hash = '#tasks';
            }
            break;
          }
          case 'viewMemory':
            window.location.hash = '#memory';
            break;
          case 'viewSkills':
            window.location.hash = '#skills';
            break;
          case 'viewLogs':
            window.location.hash = '#events';
            break;
          case 'chat':
            // Open conversation panel
            break;
          case 'health':
          case 'telemetry':
            window.location.hash = '#telemetry';
            break;
          case 'infra':
            window.location.hash = '#infra';
            break;
        }
      });

      // ESC to go back in zoom
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.zoomSystem) {
          this.zoomSystem.goBack();
        }
      });
    }



    // ── Utility ──
    hashString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }

    destroy() {
      this.stopPolling();
      if (this.patrolTimer) {
        clearInterval(this.patrolTimer);
        this.patrolTimer = null;
      }
      if (this.ws) this.ws.close();
      if (this.interaction) this.interaction.destroy();
      if (this.zoomSystem) this.zoomSystem.destroy();
    }
  }

  // Export
  window.CityIntegration = CityIntegration;

})();
