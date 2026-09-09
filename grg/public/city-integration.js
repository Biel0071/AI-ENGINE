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

      // Seed canonical master agent immediately so renderer is never empty
      if (!this.renderer.agents.has('38515b10-48a4-4c9e-8c07-86d95326ed89')) {
        this.renderer.addAgent({
          id: '38515b10-48a4-4c9e-8c07-86d95326ed89',
          name: 'Master Orchestrator',
          role: 'master-avatar',
          x: 12,
          y: 12,
          direction: 'S',
          color: '#7C3AED',
          state: 'IDLE'
        });
      }

      // Fetch real data and populate city
      await this.fetchAndPopulate();

      // Start polling for updates
      this.startPolling();

      // Connect to WebSocket for real-time events
      this.connectWebSocket();

      // Listen for city events
      this.setupEventListeners();

      // Setup ambient living world patrols (Reqs 19, 20)
      this.setupAmbientPatrols();

      console.log('[CityIntegration] Initialized — agents, missions, interaction all wired');
    }

    // ── Register buildings as interactive objects ──
    registerBuildings() {
      if (!this.interaction) return;

      // Register the 3 canonical buildings from renderer
      const buildings = [
        { id: 'fenix-hq', type: 'building', col: 10, row: 10,
          metadata: { name: 'FÊNIX Operating System HQ', type: 'Headquarters', project: 'ai-engine-core',
            floors: 3, agents: 2, status: 'healthy', projectKey: 'ai-engine-core', vps: 'Local Core' }},
        { id: 'dev-loft', type: 'building', col: 15, row: 20,
          metadata: { name: 'Dev Loft (ZapAI CRM)', type: 'Development Center', project: 'zapai-final',
            floors: 3, agents: 3, status: 'healthy', projectKey: 'zapai-final', vps: '209.50.241.22' }},
        { id: 'research-lab', type: 'building', col: 20, row: 12,
          metadata: { name: 'AI Platform & VPS Inference Hub', type: 'AI Gateway & Inference', project: 'api-platform',
            floors: 2, agents: 2, status: 'healthy', projectKey: 'api-platform', vps: '209.50.241.22:3001' }},
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

      // ── Section 17 & 27: Ambient NPCs (Living World) ──
      const ambientNpcs = [
        { id: 'npc-courier', name: 'Courier Leo', role: 'courier', x: 16, y: 14, state: 'WALK', direction: 'S' },
        { id: 'npc-tech', name: 'Technician Bruno', role: 'technician', x: 16, y: 19, state: 'WORK', direction: 'N' },
        { id: 'npc-visitor', name: 'Visitor Clara', role: 'visitor', x: 14, y: 12, state: 'IDLE', direction: 'W' },
        { id: 'npc-maint', name: 'Maintenance Sam', role: 'maintenance', x: 11, y: 22, state: 'WORK', direction: 'E' },
        { id: 'npc-scientist', name: 'Scientist Iris', role: 'researcher', x: 24, y: 14, state: 'THINK', direction: 'S' }
      ];

      for (const npc of ambientNpcs) {
        if (!this.renderer.agents.has(npc.id)) {
          this.renderer.addAgent({
            id: npc.id,
            x: npc.x,
            y: npc.y,
            color: '#FACC15',
            state: npc.state,
            name: npc.name,
            role: npc.role,
            direction: npc.direction || 'S',
            isAmbientNpc: true
          });
        }
      }

      console.log(`[CityIntegration] Populated ${agents.length} agents + ${ambientNpcs.length} ambient NPCs`);
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
          if (progEl) progEl.style.width = `${activeJob.progress || 100}%`;
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
          if (jProg) jProg.style.width = `${activeJob.progress || 100}%`;
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
        const wsUrl = `ws://${window.location.host}`;
        this.ws = new WebSocket(wsUrl);

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
          setTimeout(() => this.connectWebSocket(), 5000);
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

    // ── Building Enter ──
    enterBuilding(obj) {
      const meta = obj.metadata || {};
      const buildingId = obj.id || 'dev-loft';

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
        detail: { buildingId: buildingId, metadata: meta }
      }));
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

    // ── Living World Ambient Patrols (Reqs 19, 20) ──
    setupAmbientPatrols() {
      if (this.patrolTimer) clearInterval(this.patrolTimer);

      // Courier Leo patrols up and down the Main Avenue sidewalk
      const courierRoute = [
        { x: 16, y: 14 },
        { x: 16, y: 18 },
        { x: 16, y: 23 },
        { x: 16, y: 18 },
        { x: 16, y: 14 },
        { x: 16, y: 10 }
      ];
      let courierIdx = 0;

      // Maintenance Sam walks around the Dev Loft perimeter
      const maintRoute = [
        { x: 11, y: 22 },
        { x: 13, y: 22 },
        { x: 13, y: 24 },
        { x: 11, y: 24 },
        { x: 11, y: 22 }
      ];
      let maintIdx = 0;

      this.patrolTimer = setInterval(() => {
        // Courier Leo
        const courier = this.renderer.agents?.get('npc-courier');
        if (courier?.character) {
          const char = courier.character;
          if (!char.path || char.path.length === 0) {
            courierIdx = (courierIdx + 1) % courierRoute.length;
            char.setPath([courierRoute[courierIdx]]);
          }
        }

        // Maintenance Sam (switches between WORK and WALK)
        const maint = this.renderer.agents?.get('npc-maint');
        if (maint?.character) {
          const char = maint.character;
          if (!char.path || char.path.length === 0) {
            maintIdx = (maintIdx + 1) % maintRoute.length;
            if (maintIdx % 2 === 0) {
              char.setState('work');
            } else {
              char.setPath([maintRoute[maintIdx]]);
            }
          }
        }
      }, 4000);
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
