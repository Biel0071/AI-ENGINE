/**
 * FÊNIX AGENTIC CITY 3.0 — Habbo-style Isometric World
 * Visualizes only agents and activity reported by the live FÊNIX runtime.
 * Syncs with the real FÊNIX API and event stream.
 */

const AGENT_ROLES = [
  { id: 'master',      name: 'MASTER',     color: '#ef4444', role: 'architect',   district: 'MASTER_HQ', emoji: '👑' },
  { id: 'frontend',    name: 'FRONTEND',   color: '#3b82f6', role: 'frontend',    district: 'FRONTEND',  emoji: '🎨' },
  { id: 'backend',     name: 'BACKEND',    color: '#22c55e', role: 'backend',     district: 'BACKEND',   emoji: '⚙️' },
  { id: 'qa',         name: 'QA',         color: '#f59e0b', role: 'qa',          district: 'QA',        emoji: '🧪' },
  { id: 'devops',     name: 'DEVOPS',     color: '#9333ea', role: 'devops',      district: 'DEVOPS',    emoji: '🚀' },
  { id: 'ai_core',    name: 'AI-CORE',    color: '#db2777', role: 'ai',          district: 'AI_MODELS', emoji: '🤖' },
  { id: 'memory',     name: 'MEMORY',     color: '#0d9488', role: 'memory',      district: 'MEMORY',    emoji: '🧠' },
  { id: 'knowledge',  name: 'KNOWLEDGE',  color: '#7c3aed', role: 'knowledge',   district: 'KNOWLEDGE', emoji: '📚' },
  { id: 'mcp',        name: 'MCP-HUB',   color: '#38bdf8', role: 'connector',   district: 'MCP',       emoji: '🔌' },
  { id: 'observer',   name: 'OBSERVER',   color: '#fb923c', role: 'observability',district:'CENTRAL',   emoji: '👁️' },
  { id: 'security',   name: 'SECURITY',   color: '#f43f5e', role: 'security',    district: 'DEVOPS',    emoji: '🛡️' },
  { id: 'analyst',    name: 'ANALYST',    color: '#a78bfa', role: 'analyst',     district: 'KNOWLEDGE', emoji: '📊' },
];

class IsoCityEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;

    // T31 — Multi-level navigation
    this.viewLevel = 'city'; // 'city' | 'building' | 'floor' | 'agent'
    this.activeDistrict = null;   // district key string
    this.activeFloor    = null;   // floor index 0-11
    this.activeAgent    = null;   // agent object

    // T35 — Zoom-to-building animation state
    this._zoomAnim = { active: false, scale: 0, target: 1 };

    this.state = {
      camera: { x: 0, y: 0, zoom: 1.0 },
      targetCamera: { x: 0, y: 0, zoom: 1.0 },
      isDragging: false,
      lastMouse: { x: 0, y: 0 },
      tileSize: 60,
      hoveredAgent: null,
      hoveredDistrict: null,
      followAgentId: null,
      followMissionId: null,
      lastTime: performance.now(),
      selectedAgent: null
    };

    this.world = {
      agents: new Map(),
      particles: [],
      bubbles: []
    };
    this.lastCityEvent = null;
    this.cityConnectionStatus = window.FENIX?.live?.status || 'CONNECTING';

    this.DISTRICTS = {
      'CENTRAL':    { x: 0,  y: 0,  w: 4, h: 4, color: '#1e293b', label: 'CENTRAL PLAZA',    emoji: '🏛️' },
      'MASTER_HQ':  { x: -6, y: -6, w: 3, h: 3, color: '#b91c1c', label: 'DEVOPS CENTER',     emoji: '🚀' },
      'FRONTEND':   { x: 6,  y: -2, w: 3, h: 3, color: '#2563eb', label: 'FRONTEND DISTRICT', emoji: '🎨' },
      'BACKEND':    { x: 6,  y: 4,  w: 3, h: 3, color: '#16a34a', label: 'BACKEND DISTRICT',  emoji: '⚙️' },
      'QA':         { x: -6, y: 4,  w: 3, h: 3, color: '#d97706', label: 'QA LAB',            emoji: '🧪' },
      'DEVOPS':     { x: -8, y: -2, w: 3, h: 3, color: '#7c3aed', label: 'KNOWLEDGE CENTER',  emoji: '📚' },
      'AI_MODELS':  { x: 0,  y: -8, w: 4, h: 3, color: '#be185d', label: 'AI CORE',           emoji: '🤖' },
      'MEMORY':     { x: 0,  y: 8,  w: 4, h: 3, color: '#0f766e', label: 'MEMORY VAULT',      emoji: '🧠' },
      'KNOWLEDGE':  { x: -4, y: 9,  w: 3, h: 3, color: '#6d28d9', label: 'KNOWLEDGE CENTER',  emoji: '📖' },
      'MCP':        { x: 8,  y: 1,  w: 3, h: 3, color: '#0284c7', label: 'MCP HUB',           emoji: '🔌' }
    };

    // Populate only from the live FÊNIX runtime; never show synthetic agents.
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupEvents();
    
    // Sync with real API every 3s and on live events
    this._syncInterval = setInterval(() => {
      const active = document.querySelector('.view.active')?.id;
      if (active === 'view-command' || active === 'view-city') this.syncRealData();
    }, 3000);
    window.addEventListener('fenix-live', () => this.syncRealData());
    window.addEventListener('fenix:data', () => this.syncRealData());
    window.addEventListener('fenix-city-event', (event) => {
      this.lastCityEvent = event.detail || null;
      this._applyCityEvent(this.lastCityEvent);
    });
    window.addEventListener('fenix-city-connection', (event) => {
      this.cityConnectionStatus = event.detail?.status || 'UNKNOWN';
    });
    this.syncRealData().then(() => this._applyDeepLink()).catch(() => {});
    this.startLoop();
  }

  _applyCityEvent(event) {
    const payload = event?.payload || {};
    const agentId = payload.agentId || payload.agent?.id || payload.actorId;
    if (!agentId) return;
    const agent = this.world.agents.get(String(agentId));
    if (!agent) return;
    const active = ['job.started', 'runtime.job.running', 'tool.started'].includes(event.type);
    const complete = ['job.completed', 'tool.completed'].includes(event.type);
    if (active) {
      const station = this.DISTRICTS[agent.district] || this.DISTRICTS.CENTRAL;
      agent.tx = station.x;
      agent.ty = station.y;
      agent.routeActive = true;
    } else if (complete && agent.homeX != null) {
      agent.tx = agent.homeX;
      agent.ty = agent.homeY;
      agent.routeActive = true;
    }
  }

  _initSimulatedAgents() {
    // Compatibility hook: old callers must not create fictional runtime state.
    this.world.agents.clear();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth || 800;
      this.canvas.height = parent.clientHeight || 600;
    }
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', e => {
      this.state.isDragging = true;
      this.state.lastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => this.state.isDragging = false);
    window.addEventListener('mousemove', e => {
      if (this.state.isDragging) {
        const dx = e.clientX - this.state.lastMouse.x;
        const dy = e.clientY - this.state.lastMouse.y;
        this.state.targetCamera.x += dx;
        this.state.targetCamera.y += dy;
        this.state.lastMouse = { x: e.clientX, y: e.clientY };
      }
      const rect = this.canvas.getBoundingClientRect();
      this.checkHover(e.clientX - rect.left, e.clientY - rect.top);
    });
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.state.targetCamera.zoom = Math.max(0.4, Math.min(2.8, this.state.targetCamera.zoom * delta));
    }, { passive: false });
    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const agent = this._hitTestAgent(mx, my);
      this.state.selectedAgent = agent === this.state.selectedAgent ? null : agent;
      if (this.state.selectedAgent) {
        window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: this.state.selectedAgent } }));
      }
    });
    this.canvas.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const target = this.state.hoveredAgent || this.state.selectedAgent;
      if (target) {
        this.state.selectedAgent = target;
        window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: target } }));
      }
    });
    // Double-click to reset camera
    this.canvas.addEventListener('dblclick', () => {
      this.state.targetCamera = { x: 0, y: 0, zoom: 1.0 };
      this._updateZoomDisplay();
    });

    // Toolbar Zoom & Filter controls
    document.getElementById('btnZoomIn')?.addEventListener('click', () => {
      this.state.targetCamera.zoom = Math.min(2.8, this.state.targetCamera.zoom * 1.25);
      this._updateZoomDisplay();
    });
    document.getElementById('btnZoomOut')?.addEventListener('click', () => {
      this.state.targetCamera.zoom = Math.max(0.4, this.state.targetCamera.zoom * 0.8);
      this._updateZoomDisplay();
    });
    document.getElementById('btnResetCamera')?.addEventListener('click', () => {
      this.state.targetCamera = { x: 0, y: 0, zoom: 1.0 };
      this.state.followAgentId = null;
      this.state.followMissionId = null;
      this._updateZoomDisplay();
    });
    document.getElementById('btnFollowAgent')?.addEventListener('click', () => {
      const selected = this.state.selectedAgent;
      if (!selected) return;
      this.state.followAgentId = this.state.followAgentId === selected.id ? null : selected.id;
      const button = document.getElementById('btnFollowAgent');
      if (button) button.classList.toggle('active', Boolean(this.state.followAgentId));
    });
    document.getElementById('btnFollowMission')?.addEventListener('click', () => {
      const missionId = this.state.selectedAgent?.missionId || this.state.selectedAgent?.currentMission?.id || this.state.selectedAgent?.currentMission?.missionId;
      if (!missionId) return;
      this.state.followAgentId = null;
      this.state.followMissionId = this.state.followMissionId === missionId ? null : missionId;
      document.getElementById('btnFollowMission')?.classList.toggle('active', Boolean(this.state.followMissionId));
    });
    document.getElementById('btnFullscreenCity')?.addEventListener('click', () => {
      const container = document.getElementById('wsCityContainer') || this.canvas;
      if (!document.fullscreenElement) {
        container.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });
  }

  _updateZoomDisplay() {
    const lbl = document.getElementById('lblZoomLevel');
    if (lbl) lbl.textContent = `${Math.round(this.state.targetCamera.zoom * 100)}%`;
  }

  focusAgent(agentId) {
    if (!agentId) return;
    const target = this.world.agents.get(agentId) || [...this.world.agents.values()].find(a =>
      a.id.toLowerCase() === String(agentId).toLowerCase() || a.name.toLowerCase().includes(String(agentId).toLowerCase())
    );
    if (target) {
      this.state.selectedAgent = target;
      const tw = this.state.tileSize;
      const th = this.state.tileSize / 2;
      this.state.targetCamera.x = -(target.x - target.y) * tw;
      this.state.targetCamera.y = -(target.x + target.y) * th;
      this.state.targetCamera.zoom = 1.5;
      this._updateZoomDisplay();
      window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: target } }));
    }
  }

  focusMission(missionId) {
    if (!missionId) return;
    const agent = [...this.world.agents.values()].find((candidate) => {
      const mission = candidate.currentMission;
      return String(candidate.missionId || mission?.id || mission?.missionId || '') === String(missionId);
    });
    if (!agent) return;
    this.state.selectedAgent = agent;
    this.state.followMissionId = String(missionId);
    this.state.followAgentId = null;
    window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent } }));
  }

  focusJob(jobId) {
    if (!jobId) return;
    const agent = [...this.world.agents.values()].find((candidate) => {
      const job = candidate.currentJob;
      return String(job?.id || job?.jobId || candidate.jobId || '') === String(jobId);
    });
    if (agent) this.focusAgent(agent.id);
  }

  _applyDeepLink() {
    const query = new URLSearchParams(`${location.search || ''}&${location.hash.includes('?') ? location.hash.split('?')[1] : ''}`);
    const agent = query.get('agent');
    const mission = query.get('mission');
    const job = query.get('job');
    if (agent) this.focusAgent(agent);
    else if (mission) this.focusMission(mission);
    else if (job) this.focusJob(job);
  }

  _hitTestAgent(mx, my) {
    const { camera } = this.state;
    const cx = this.canvas.width / 2 + camera.x;
    const cy = this.canvas.height / 2 + camera.y;
    let closest = null, minDist = 44;
    for (const agent of this.world.agents.values()) {
      const sc = this.toScreen(agent.x, agent.y, 0.2, cx, cy, camera.zoom);
      sc.y -= 28 * camera.zoom;
      const d = Math.hypot(mx - sc.x, my - sc.y);
      if (d < minDist) { minDist = d; closest = agent; }
    }
    return closest;
  }

  checkHover(mx, my) {
    this.state.hoveredAgent = this._hitTestAgent(mx, my);
    this.canvas.style.cursor = this.state.hoveredAgent ? 'pointer' : (this.state.isDragging ? 'grabbing' : 'grab');
  }

  async syncRealData() {
    try {
      let apiAgents = [];
      if (window.FENIX?.live?.agents?.length) {
        apiAgents = window.FENIX.live.agents;
      } else {
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch('/runtime/snapshot', { headers }).then(r => r.ok ? r.json() : null).catch(() => null);
        if (res?.payload?.agents?.length) {
          apiAgents = res.payload.agents;
          if (window.FENIX?.live) window.FENIX.live.agents = apiAgents;
        } else if (window.state?.api?.agentsPanel?.agents?.length) {
          apiAgents = window.state.api.agentsPanel.agents;
        } else if (window.state?.api?.agents?.agents?.length) {
          apiAgents = window.state.api.agents.agents;
        }
      }

      const next = new Map();
      for (const a of apiAgents) {
        const id = String(a.id || a.agentId || a.name || '').trim();
        if (!id) continue;
        const roleText = String(a.role || a.type || a.name || '').toLowerCase();
        const template = AGENT_ROLES.find(r => id.toLowerCase() === r.id || roleText.includes(r.role)) || AGENT_ROLES[0];
        const district = this.DISTRICTS[a.district] ? a.district : (this.DISTRICTS[template.district] ? template.district : 'CENTRAL');
        const dist = this.DISTRICTS[district] || this.DISTRICTS.CENTRAL;
        const seed = [...id].reduce((n, ch) => n + ch.charCodeAt(0), 0);
        const homeX = dist.x + ((seed % 7) - 3) * 0.12;
        const homeY = dist.y + ((Math.floor(seed / 7) % 7) - 3) * 0.12;
        const agent = this.world.agents.get(id) || { id, x: homeX, y: homeY, tx: homeX, ty: homeY, homeX, homeY, routeActive: false, trail: [], walkFrame: 0, walkTimer: 0, wanderTimer: 0, bubbleTimer: 0, bubble: null };
        Object.assign(agent, {
          id,
          name: a.name || template.name,
          role: a.role || template.role,
          color: a.color || template.color,
          emoji: a.emoji || template.emoji,
          district,
          status: String(a.status || 'AVAILABLE').toUpperCase(),
          workMsg: a.currentJob?.name || a.currentJob?.title || a.activity || (a.status === 'RUNNING' ? 'executando...' : 'idle'),
          model: a.model || a.modelName || 'Qwen 2.5 3B',
          isReal: true,
          currentJob: a.currentJob || null,
          currentMission: a.currentMission || null,
          missionId: a.missionId || a.currentMission?.id || a.currentMission?.missionId || null
        });
        next.set(id, agent);
      }
      if (next.size > 0) {
        this.world.agents = next;
      }
    } catch(e) {}
  }

  toScreen(x, y, z, cx, cy, zoom) {
    const tw = this.state.tileSize * zoom;
    const th = (this.state.tileSize / 2) * zoom;
    return { x: cx + (x - y) * tw, y: cy + (x + y) * th - z * tw };
  }

  startLoop() {
    const loop = (t) => {
      const delta = Math.min((t - this.state.lastTime) / 1000, 0.1);
      this.state.lastTime = t;
      this.time = t / 1000;
      this.update(delta);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(delta) {
    const followed = this.state.followAgentId && this.world.agents.get(this.state.followAgentId);
    const missionAgents = this.state.followMissionId
      ? [...this.world.agents.values()].filter((agent) => {
        const mission = agent.currentMission;
        const missionId = agent.missionId || mission?.id || mission?.missionId;
        return missionId && String(missionId) === String(this.state.followMissionId);
      })
      : [];
    if (!followed && missionAgents.length) {
      const center = missionAgents.reduce((sum, agent) => ({ x: sum.x + agent.x, y: sum.y + agent.y }), { x: 0, y: 0 });
      center.x /= missionAgents.length;
      center.y /= missionAgents.length;
      const tw = this.state.tileSize;
      const th = this.state.tileSize / 2;
      this.state.targetCamera.x = -(center.x - center.y) * tw;
      this.state.targetCamera.y = -(center.x + center.y) * th;
      this.state.targetCamera.zoom = Math.max(this.state.targetCamera.zoom, 1.2);
    }
    if (followed) {
      const tw = this.state.tileSize;
      const th = this.state.tileSize / 2;
      this.state.targetCamera.x = -(followed.x - followed.y) * tw;
      this.state.targetCamera.y = -(followed.x + followed.y) * th;
      this.state.targetCamera.zoom = Math.max(this.state.targetCamera.zoom, 1.35);
    }
    // Smooth camera
    const lerp = (a, b, t) => a + (b - a) * t;
    const s = 1 - Math.pow(0.01, delta * 5);
    this.state.camera.x = lerp(this.state.camera.x, this.state.targetCamera.x, s);
    this.state.camera.y = lerp(this.state.camera.y, this.state.targetCamera.y, s);
    this.state.camera.zoom = lerp(this.state.camera.zoom, this.state.targetCamera.zoom, s);

    for (const agent of this.world.agents.values()) {
      this._updateAgent(agent, delta);
    }

    // Update particles
    this.world.particles = this.world.particles.filter(p => p.life > 0);
    for (const p of this.world.particles) {
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.life -= delta * p.decay;
    }
  }

  _updateAgent(agent, delta) {
    const isWorking = agent.status === 'WORKING' || agent.status === 'RUNNING';
    if (agent.isReal && !agent.routeActive) { agent.tx = agent.x; agent.ty = agent.y; }

    // Walk animation
    agent.walkTimer += delta;
    if (agent.walkTimer > 0.15) {
      agent.walkFrame = (agent.walkFrame + 1) % 4;
      agent.walkTimer = 0;
    }

    // Move toward target
    const dx = agent.tx - agent.x;
    const dy = agent.ty - agent.y;
    const dist = Math.hypot(dx, dy);
    const speed = isWorking ? 1.2 : 1.8;
    agent._moving = dist > 0.08;

    if (agent._moving) {
      const move = Math.min(speed * delta, dist);
      agent.x += (dx / dist) * move;
      agent.y += (dy / dist) * move;
      agent.trail.push({ x: agent.x, y: agent.y, life: 0.6 });
      if (agent.trail.length > 20) agent.trail.shift();
    } else if (agent.routeActive) {
      agent.routeActive = false;
    }

    // Trail decay
    for (const t of agent.trail) t.life -= delta * 2.5;
    agent.trail = agent.trail.filter(t => t.life > 0);

    // A quiet runtime must render quiet. Bubbles and particles are created
    // only by the real event adapter when an event provides visual metadata.
  }

  draw() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const { camera } = this.state;
    const zoom = camera.zoom;
    const cx = width / 2 + camera.x;
    const cy = height / 2 + camera.y;

    this._drawBackdrop(ctx, width, height);
    this._drawGrid(ctx, cx, cy, zoom);
    this._drawCityEventHud(ctx, width);

    const districts = Object.values(this.DISTRICTS).sort((a,b) => (a.x+a.y)-(b.x+b.y));
    for (const d of districts) this._drawDistrict(ctx, d, cx, cy, zoom);

    // Avatar central do Fênix (desenhado sobre os distritos mas sob os agentes)
    this._drawFenixAvatar(ctx, cx, cy, zoom);

    // Trails
    for (const agent of this.world.agents.values()) this._drawTrail(ctx, agent, cx, cy, zoom);

    // Particles
    for (const p of this.world.particles) this._drawParticle(ctx, p, cx, cy, zoom);

    // Agents sorted by painter's algo
    const sorted = [...this.world.agents.values()].sort((a,b) => (a.x+a.y)-(b.x+b.y));
    for (const agent of sorted) this._drawAgent(ctx, agent, cx, cy, zoom);

    this._drawHUD(ctx, width, height);
    this._drawMinimap(ctx, width, height);
  }

  _drawCityEventHud(ctx, width) {
    const connection = this.cityConnectionStatus;
    if (connection && connection !== 'ONLINE') {
      ctx.save();
      ctx.fillStyle = 'rgba(3,7,18,.9)';
      ctx.strokeStyle = connection === 'OFFLINE' ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 1;
      ctx.fillRect(12, 12, 132, 24);
      ctx.strokeRect(12, 12, 132, 24);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 9px monospace';
      ctx.fillText(`WS  ${connection}`, 22, 28);
      ctx.restore();
    }
    const event = this.lastCityEvent;
    if (!event) return;
    const age = Date.now() - Date.parse(event.occurredAt || '');
    if (!Number.isFinite(age) || age > 8000) return;
    const alpha = Math.max(0, 1 - age / 8000);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(3,7,18,.88)';
    ctx.strokeStyle = event.visual?.visualState === 'ERROR' ? '#ef4444' : '#06b6d4';
    ctx.lineWidth = 1;
    const text = `EVENT  ${String(event.type).toUpperCase()}`;
    const x = width - Math.min(260, width - 24);
    ctx.fillRect(x, 12, Math.min(248, width - 24), 28);
    ctx.strokeRect(x, 12, Math.min(248, width - 24), 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 10px monospace';
    ctx.fillText(text.slice(0, 34), x + 10, 30);
    ctx.restore();
  }

  _drawBackdrop(ctx, w, h) {
    const g = ctx.createRadialGradient(w*.5, h*.35, 0, w*.5, h*.35, Math.max(w,h)*.75);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#070b13');
    g.addColorStop(1, '#020408');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Central red ambient glow — pulsa com o Fênix
    const glowAlpha = 0.04 + 0.025 * Math.sin(this.time * 1.5);
    ctx.fillStyle = `rgba(239, 68, 68, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(w*.5, h*.45, Math.min(w,h)*.45, 0, Math.PI*2);
    ctx.fill();
    // Ambient blue glow
    ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
    ctx.beginPath();
    ctx.arc(w*.5, h*.45, Math.min(w,h)*.38, 0, Math.PI*2);
    ctx.fill();
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const seed = 42;
    for (let i = 0; i < 80; i++) {
      const sx = ((i*137.5 + seed) % w);
      const sy = ((i*97.3 + seed*2) % (h*0.65));
      const blink = 0.3 + 0.7 * Math.abs(Math.sin(this.time*0.5 + i));
      ctx.globalAlpha = blink * 0.5;
      ctx.fillRect(sx, sy, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }

  _drawFenixAvatar(ctx, cx, cy, zoom) {
    // Avatar central do FÊNIX — personagem pixelado com glow pulsante
    const avatarX = cx;
    const avatarY = cy - 10 * zoom;
    const t = this.time;
    const pulse = 0.8 + 0.2 * Math.sin(t * 2.5);
    const outerGlow = 30 + 15 * Math.sin(t * 1.8);
    const innerGlow = 15 + 8 * Math.sin(t * 2.5);

    // Anel exterior rotativo
    ctx.save();
    ctx.translate(avatarX, avatarY);
    ctx.rotate(t * 0.4);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rx = Math.cos(angle) * 28 * zoom;
      const ry = Math.sin(angle) * 14 * zoom;
      ctx.fillStyle = `rgba(239,68,68,${0.4 + 0.3 * Math.sin(t * 3 + i)})`;
      ctx.beginPath();
      ctx.arc(rx, ry, 3 * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Anel médio (anti-horário)
    ctx.save();
    ctx.translate(avatarX, avatarY);
    ctx.rotate(-t * 0.7);
    ctx.strokeStyle = `rgba(239,68,68,${0.25 * pulse})`;
    ctx.lineWidth = 1.5 * zoom;
    ctx.setLineDash([4 * zoom, 6 * zoom]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 20 * zoom, 10 * zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Glow externo
    const glowGrad = ctx.createRadialGradient(avatarX, avatarY, 0, avatarX, avatarY, outerGlow * zoom);
    glowGrad.addColorStop(0, `rgba(239,68,68,${0.35 * pulse})`);
    glowGrad.addColorStop(0.5, `rgba(239,68,68,${0.1 * pulse})`);
    glowGrad.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, outerGlow * zoom, 0, Math.PI * 2);
    ctx.fill();

    // Corpo do avatar (pixel-art simplificado)
    const sz = 12 * zoom;
    // Torso
    const torsoGrad = ctx.createLinearGradient(avatarX - sz, avatarY - sz * 1.8, avatarX + sz, avatarY);
    torsoGrad.addColorStop(0, '#ef4444');
    torsoGrad.addColorStop(0.4, '#991b1b');
    torsoGrad.addColorStop(1, '#300');
    ctx.fillStyle = torsoGrad;
    ctx.save();
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = innerGlow * zoom;
    ctx.beginPath();
    ctx.ellipse(avatarX, avatarY, sz, sz * 0.55, 0, 0, Math.PI, false);
    ctx.lineTo(avatarX - sz, avatarY - sz * 1.6);
    ctx.ellipse(avatarX, avatarY - sz * 1.6, sz, sz * 0.55, 0, Math.PI, 0, true);
    ctx.lineTo(avatarX + sz, avatarY);
    ctx.fill();

    // Topo do corpo
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(avatarX, avatarY - sz * 1.6, sz, sz * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça
    const headY = avatarY - sz * 1.6 - sz * 1.0;
    const headR = sz * 0.75;
    const headGrad = ctx.createRadialGradient(avatarX - headR * 0.3, headY - headR * 0.3, 0, avatarX, headY, headR);
    headGrad.addColorStop(0, '#f87171');
    headGrad.addColorStop(0.6, '#b91c1c');
    headGrad.addColorStop(1, '#020617');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(avatarX, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = zoom;
    ctx.stroke();

    // Visor / olhos
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12 * zoom;
    ctx.fillRect(avatarX - headR * 0.65, headY - headR * 0.15, headR * 1.3, headR * 0.3);
    ctx.shadowBlur = 0;

    // Capacete - penas do fênix
    ctx.strokeStyle = `rgba(239,68,68,${0.7 + 0.3 * Math.sin(t * 3)})`;
    ctx.lineWidth = 2 * zoom;
    ctx.beginPath();
    ctx.moveTo(avatarX - headR * 0.5, headY - headR * 0.8);
    ctx.quadraticCurveTo(avatarX - headR * 0.8, headY - headR * 2.2, avatarX - headR * 0.3, headY - headR * 2.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(avatarX + headR * 0.5, headY - headR * 0.8);
    ctx.quadraticCurveTo(avatarX + headR * 0.8, headY - headR * 2.2, avatarX + headR * 0.3, headY - headR * 2.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(avatarX, headY - headR);
    ctx.quadraticCurveTo(avatarX, headY - headR * 2.4, avatarX, headY - headR * 2.8);
    ctx.stroke();

    ctx.restore();

    // Label "FÊNIX OS" abaixo do avatar
    ctx.save();
    ctx.font = `bold ${Math.max(10, 11 * zoom)}px 'Inter',sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8 * zoom;
    ctx.fillText('FÊNIX OS', avatarX, avatarY + 24 * zoom);
    ctx.shadowBlur = 0;
    ctx.font = `${Math.max(7, 8 * zoom)}px 'JetBrains Mono',monospace`;
    ctx.fillStyle = 'rgba(239,68,68,0.7)';
    ctx.fillText('MASTER ORCHESTRATOR', avatarX, avatarY + 34 * zoom);
    ctx.restore();
  }

  _drawGrid(ctx, cx, cy, zoom) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -16; i <= 16; i++) {
      let p; 
      p = this.toScreen(i,-16,0,cx,cy,zoom); ctx.moveTo(p.x,p.y);
      p = this.toScreen(i, 16,0,cx,cy,zoom); ctx.lineTo(p.x,p.y);
      p = this.toScreen(-16,i,0,cx,cy,zoom); ctx.moveTo(p.x,p.y);
      p = this.toScreen( 16,i,0,cx,cy,zoom); ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
  }

  _drawDistrict(ctx, d, cx, cy, zoom) {
    const hw = d.w/2, hh = d.h/2;
    const tl = this.toScreen(d.x-hw, d.y-hh, 0, cx, cy, zoom);
    const tr = this.toScreen(d.x+hw, d.y-hh, 0, cx, cy, zoom);
    const br = this.toScreen(d.x+hw, d.y+hh, 0, cx, cy, zoom);
    const bl = this.toScreen(d.x-hw, d.y+hh, 0, cx, cy, zoom);
    const dep = 0.22;
    const tlZ = this.toScreen(d.x-hw, d.y-hh, dep, cx, cy, zoom);
    const trZ = this.toScreen(d.x+hw, d.y-hh, dep, cx, cy, zoom);
    const brZ = this.toScreen(d.x+hw, d.y+hh, dep, cx, cy, zoom);
    const blZ = this.toScreen(d.x-hw, d.y+hh, dep, cx, cy, zoom);

    // Pulse for active districts
    const agentsHere = [...this.world.agents.values()].filter(a => this.DISTRICTS[a.district] === d).length;
    const pulse = agentsHere > 0 ? (0.7 + 0.3 * Math.sin(this.time * 2 + d.x)) : 1;

    ctx.fillStyle = this._adjustColor(d.color, -55);
    ctx.beginPath(); ctx.moveTo(bl.x,bl.y); ctx.lineTo(br.x,br.y); ctx.lineTo(brZ.x,brZ.y); ctx.lineTo(blZ.x,blZ.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = this._adjustColor(d.color, -35);
    ctx.beginPath(); ctx.moveTo(br.x,br.y); ctx.lineTo(tr.x,tr.y); ctx.lineTo(trZ.x,trZ.y); ctx.lineTo(brZ.x,brZ.y); ctx.closePath(); ctx.fill();

    // Top face
    ctx.fillStyle = d.color + '30';
    ctx.beginPath(); ctx.moveTo(tlZ.x,tlZ.y); ctx.lineTo(trZ.x,trZ.y); ctx.lineTo(brZ.x,brZ.y); ctx.lineTo(blZ.x,blZ.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = d.color;
    ctx.lineWidth = (agentsHere > 0 ? 2.5 : 1.5) * zoom * pulse;
    ctx.globalAlpha = pulse;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Floor grid inside
    ctx.strokeStyle = d.color + '30'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=1;i<d.w;i++){let p1=this.toScreen(d.x-hw+i,d.y-hh,dep,cx,cy,zoom),p2=this.toScreen(d.x-hw+i,d.y+hh,dep,cx,cy,zoom);ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);}
    for (let i=1;i<d.h;i++){let p1=this.toScreen(d.x-hw,d.y-hh+i,dep,cx,cy,zoom),p2=this.toScreen(d.x+hw,d.y-hh+i,dep,cx,cy,zoom);ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);}
    ctx.stroke();

    // District structures
    this._drawDistrictBuildings(ctx, d, cx, cy, zoom, dep);

    // Label
    const center = this.toScreen(d.x, d.y, dep, cx, cy, zoom);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 10*zoom;
    // Emoji do distrito
    if (d.emoji && zoom > 0.6) {
      ctx.font = `${Math.max(10, 14*zoom)}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.9;
      ctx.fillText(d.emoji, center.x, center.y - 52*zoom);
      ctx.globalAlpha = 1;
    }
    // Nome do distrito
    ctx.font = `700 ${Math.max(9, 11*zoom)}px 'Inter',sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = agentsHere > 0 ? d.color : '#e2e8f0';
    if (agentsHere > 0) {
      ctx.shadowColor = d.color;
      ctx.shadowBlur = 8*zoom;
    }
    ctx.fillText(d.label, center.x, center.y - 38*zoom);
    ctx.shadowBlur = 0;
    if (agentsHere > 0) {
      ctx.font = `600 ${Math.max(7,8*zoom)}px 'JetBrains Mono',monospace`;
      ctx.fillStyle = d.color;
      ctx.fillText(`${agentsHere} AGENTE${agentsHere>1?'S':''}`, center.x, center.y - 26*zoom);
    }
    ctx.restore();
  }

  _drawDistrictBuildings(ctx, d, cx, cy, zoom, dep) {
    const structs = [
      {ox:-0.7, oy:-0.5, h:0.6},{ox:0.45, oy:-0.32, h:0.4},{ox:-0.15, oy:0.45, h:0.3}
    ];
    for (const s of structs) {
      if (Math.abs(s.ox) > d.w/2-0.4 || Math.abs(s.oy) > d.h/2-0.4) continue;
      this._drawBlock(ctx, d.x+s.ox, d.y+s.oy, dep, s.h, d.color, cx, cy, zoom);
    }
  }

  _drawBlock(ctx, x, y, bz, height, color, cx, cy, zoom) {
    const h = 0.24;
    const corners = [[-h,-h],[h,-h],[h,h],[-h,h]];
    const bot = corners.map(([dx,dy]) => this.toScreen(x+dx,y+dy,bz,cx,cy,zoom));
    const top = corners.map(([dx,dy]) => this.toScreen(x+dx,y+dy,bz+height,cx,cy,zoom));
    const path = (pts) => { ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); };
    ctx.fillStyle = this._adjustColor(color,-52); path([bot[3],bot[2],top[2],top[3]]); ctx.fill();
    ctx.fillStyle = this._adjustColor(color,-32); path([bot[2],bot[1],top[1],top[2]]); ctx.fill();
    ctx.fillStyle = color+'aa'; path(top); ctx.fill();
    ctx.strokeStyle = color+'60'; ctx.lineWidth=1; ctx.stroke();
  }

  _drawTrail(ctx, agent, cx, cy, zoom) {
    if (agent.trail.length < 2) return;
    ctx.beginPath();
    const first = this.toScreen(agent.trail[0].x, agent.trail[0].y, 0.22, cx, cy, zoom);
    ctx.moveTo(first.x, first.y);
    for (let i=1;i<agent.trail.length;i++){
      const p = this.toScreen(agent.trail[i].x, agent.trail[i].y, 0.22, cx, cy, zoom);
      ctx.lineTo(p.x, p.y);
    }
    const head = this.toScreen(agent.x, agent.y, 0.22, cx, cy, zoom);
    ctx.lineTo(head.x, head.y);
    ctx.strokeStyle = agent.color + '50';
    ctx.lineWidth = 2*zoom; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.stroke();
  }

  _drawParticle(ctx, p, cx, cy, zoom) {
    const sc = this.toScreen(p.x, p.y, p.z, cx, cy, zoom);
    ctx.globalAlpha = p.life * 0.85;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, p.size * zoom, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  _drawAgent(ctx, agent, cx, cy, zoom) {
    const isSelected = this.state.selectedAgent === agent;
    const isHovered  = this.state.hoveredAgent === agent;
    const isWorking  = ['WORKING','RUNNING','TESTING','QUEUED'].includes((agent.status||'').toUpperCase());

    // Habbo-style walk bounce
    const walkBounce = agent._moving ? Math.abs(Math.sin(agent.walkFrame * Math.PI/2)) * 3 * zoom : 0;
    const workBounce = isWorking && !agent._moving ? Math.abs(Math.sin(this.time*3)) * 2 * zoom : 0;
    const sc = this.toScreen(agent.x, agent.y, 0.22, cx, cy, zoom);
    sc.y -= walkBounce + workBounce;

    const r = Math.max(5, 7 * zoom);
    const bodyH = Math.max(14, 20 * zoom);
    const headR = Math.max(4, 6 * zoom);

    const isMaster = agent.id === 'Orchestrator' || String(agent.role || '').toLowerCase().includes('orchestrator');

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2*zoom;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      ctx.ellipse(sc.x, sc.y + bodyH*0.3, r*1.8, r*0.9, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Shadow & Ground Ring
    const shadowSc = this.toScreen(agent.x, agent.y, 0.2, cx, cy, zoom);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(shadowSc.x, shadowSc.y, r, r*0.45, 0, 0, Math.PI*2); ctx.fill();

    if (isMaster) {
      // Summoning Cyber Ring for Master Orchestrator
      const pulseRing = 1 + 0.15 * Math.sin(this.time * 3);
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18 * zoom;
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + 0.3 * Math.sin(this.time * 2.5)})`;
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.ellipse(shadowSc.x, shadowSc.y, r * 2.8 * pulseRing, r * 1.4 * pulseRing, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Body — Futuristic armor cylinder
    const grad = ctx.createLinearGradient(sc.x-r, sc.y-bodyH, sc.x+r, sc.y);
    if (isMaster) {
      grad.addColorStop(0, '#ef4444');
      grad.addColorStop(0.5, '#991b1b');
      grad.addColorStop(1, '#090d16');
    } else {
      grad.addColorStop(0, this._adjustColor(agent.color, 30));
      grad.addColorStop(1, this._adjustColor(agent.color, -30));
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sc.x, sc.y, r, r*0.5, 0, 0, Math.PI, false);
    ctx.lineTo(sc.x-r, sc.y-bodyH);
    ctx.ellipse(sc.x, sc.y-bodyH, r, r*0.5, 0, Math.PI, 0, true);
    ctx.lineTo(sc.x+r, sc.y);
    ctx.fill();
    // Body top
    ctx.fillStyle = isMaster ? '#ef4444' : this._adjustColor(agent.color, 20);
    ctx.beginPath(); ctx.ellipse(sc.x, sc.y-bodyH, r, r*0.5, 0, 0, Math.PI*2); ctx.fill();

    // Head (Futuristic helmet/head)
    const headY = sc.y - bodyH - headR*1.4;
    const hg = ctx.createRadialGradient(sc.x-headR*0.3, headY-headR*0.3, 0, sc.x, headY, headR);
    if (isMaster) {
      hg.addColorStop(0, '#f87171');
      hg.addColorStop(0.6, '#b91c1c');
      hg.addColorStop(1, '#020617');
    } else {
      hg.addColorStop(0, this._adjustColor(agent.color, 60));
      hg.addColorStop(1, agent.color);
    }
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(sc.x, headY, headR, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = isMaster ? '#ef4444' : this._adjustColor(agent.color, 40);
    ctx.lineWidth = zoom; ctx.stroke();

    // Eyes / Cyber Visor
    if (isMaster) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12 * zoom;
      ctx.fillRect(sc.x - headR * 0.65, headY - headR * 0.15, headR * 1.3, headR * 0.3);
      ctx.restore();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sc.x - headR*0.3, headY - headR*0.1, headR*0.18, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sc.x + headR*0.3, headY - headR*0.1, headR*0.18, 0, Math.PI*2); ctx.fill();
    }

    // Work glow
    if (isWorking) {
      ctx.shadowColor = agent.color; ctx.shadowBlur = 14*zoom;
      ctx.strokeStyle = agent.color + '80'; ctx.lineWidth = 1.5*zoom;
      ctx.beginPath(); ctx.arc(sc.x, headY, headR+2*zoom, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Leg animation (walking)
    if (agent._moving) {
      const legSwing = Math.sin(agent.walkFrame * Math.PI/2) * 3 * zoom;
      ctx.strokeStyle = this._adjustColor(agent.color, -20);
      ctx.lineWidth = r * 0.45;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sc.x-r*0.35, sc.y); ctx.lineTo(sc.x-r*0.35, sc.y + r*0.6 + legSwing); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sc.x+r*0.35, sc.y); ctx.lineTo(sc.x+r*0.35, sc.y + r*0.6 - legSwing); ctx.stroke();
    }

    // Name tag (hover / selected / working)
    if (isHovered || isSelected || isWorking) {
      ctx.save();
      ctx.font = `700 ${Math.max(9,10*zoom)}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      const tagY = headY - headR - 6*zoom;
      const tw = ctx.measureText(agent.name).width;
      // Pill bg
      ctx.fillStyle = 'rgba(10,14,30,0.88)';
      ctx.strokeStyle = agent.color + '90';
      ctx.lineWidth = zoom;
      ctx.beginPath(); ctx.roundRect(sc.x-tw/2-6, tagY-13*zoom, tw+12, 16*zoom, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(agent.name, sc.x, tagY);
      if (isSelected || isHovered) {
        ctx.font = `500 ${Math.max(7,8*zoom)}px 'JetBrains Mono',monospace`;
        ctx.fillStyle = agent.color;
        ctx.fillText(`[${agent.status||'IDLE'}]`, sc.x, tagY + 13*zoom);
      }
      ctx.restore();
    }

    // Speech bubble (work message)
    if (agent.bubble && agent.bubble.life > 0) {
      const bAlpha = Math.min(1, agent.bubble.life);
      ctx.save();
      ctx.globalAlpha = bAlpha;
      const bText = agent.bubble.text;
      ctx.font = `500 ${Math.max(8,9*zoom)}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      const bw = ctx.measureText(bText).width + 14;
      const bh = 18*zoom;
      const bx = sc.x - bw/2;
      const by = headY - headR - bh - 10*zoom;
      ctx.fillStyle = agent.color + 'dd';
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill();
      // Tail
      ctx.beginPath(); ctx.moveTo(sc.x-4, by+bh); ctx.lineTo(sc.x+4, by+bh); ctx.lineTo(sc.x, by+bh+6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(bText, sc.x, by + bh*0.68);
      ctx.restore();
    }
  }

  _drawHUD(ctx, w, h) {
    const agents = [...this.world.agents.values()];
    const real = agents.filter(a => a.isReal).length;
    const working = agents.filter(a => ['WORKING','RUNNING'].includes((a.status||'').toUpperCase())).length;
    const total = agents.length;

    ctx.save();
    // Bottom left pill
    ctx.fillStyle = 'rgba(2,6,23,0.82)';
    ctx.strokeStyle = 'rgba(56,189,248,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(14, h-54, 320, 34, 8); ctx.fill(); ctx.stroke();
    ctx.font = '11px "JetBrains Mono",monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`AI CITY ONLINE`, 28, h-33);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(` · ${total} AGENTES · ${working} ATIVOS · ${real} REAIS`, 28+92, h-33);

    // Top right legend
    ctx.font = '9px "JetBrains Mono",monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.fillText('2×clique = reset câmera · scroll = zoom · drag = mover', w-14, h-22);

    ctx.restore();
  }

  _drawMinimap(ctx, w, h) {
    const mw = 110, mh = 80;
    const mx = w - mw - 14, my = 14;
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,23,0.82)';
    ctx.strokeStyle = 'rgba(56,189,248,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 6); ctx.fill(); ctx.stroke();

    // Districts on minimap
    const scaleX = mw / 30, scaleY = mh / 22;
    for (const d of Object.values(this.DISTRICTS)) {
      const px = mx + (d.x + 15) * scaleX - d.w*scaleX/2;
      const py = my + (d.y + 11) * scaleY - d.h*scaleY/2;
      ctx.fillStyle = d.color + '70';
      ctx.fillRect(px, py, d.w*scaleX, d.h*scaleY);
    }
    // Agents on minimap
    for (const a of this.world.agents.values()) {
      const px = mx + (a.x + 15) * scaleX;
      const py = my + (a.y + 11) * scaleY;
      ctx.fillStyle = a.color;
      ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
    }
    // Viewport indicator
    const vx = -this.state.camera.x / (this.state.tileSize * this.state.camera.zoom);
    const vy = -this.state.camera.y / (this.state.tileSize * this.state.camera.zoom * 0.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth=1;
    const vPx = mx + (vx + 15) * scaleX - 10, vPy = my + (vy + 11) * scaleY - 7;
    ctx.strokeRect(vPx, vPy, 20, 14);

    ctx.restore();
  }

  _adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, c =>
      ('0' + Math.min(255, Math.max(0, parseInt(c,16) + amount)).toString(16)).substr(-2)
    );
  }
}

window.IsoCityEngine = IsoCityEngine;

function bootIsoCity() {
  if (!window.fenixCity && document.getElementById('cityCanvas')) {
    window.fenixCity = new IsoCityEngine('cityCanvas');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(bootIsoCity, 150), { once: true });
} else {
  setTimeout(bootIsoCity, 150);
}
