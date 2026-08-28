/**
 * FÊNIX AGENTIC CITY 3.0 — Habbo-style Isometric World
 * Active agents always visible, animated walking, particle work effects
 * Syncs with real FÊNIX API when available
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

const WORK_MESSAGES = [
  'analyzing...', 'building...', 'testing...', 'deploying...', 
  'learning...', 'optimizing...', 'scanning...', 'connecting...',
  'compiling...', 'validating...', 'evolving...', 'syncing...'
];

class IsoCityEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    
    this.state = {
      camera: { x: 0, y: 0, zoom: 1.0 },
      targetCamera: { x: 0, y: 0, zoom: 1.0 },
      isDragging: false,
      lastMouse: { x: 0, y: 0 },
      tileSize: 60,
      hoveredAgent: null,
      lastTime: performance.now(),
      selectedAgent: null
    };

    this.world = {
      agents: new Map(),
      particles: [],
      bubbles: []
    };

    this.DISTRICTS = {
      'CENTRAL':    { x: 0,  y: 0,  w: 4, h: 4, color: '#1e293b', label: 'CENTRAL PLAZA' },
      'MASTER_HQ':  { x: -6, y: -6, w: 3, h: 3, color: '#b91c1c', label: 'MASTER HQ' },
      'FRONTEND':   { x: 6,  y: -2, w: 3, h: 3, color: '#2563eb', label: 'FRONTEND DISTRICT' },
      'BACKEND':    { x: 6,  y: 4,  w: 3, h: 3, color: '#16a34a', label: 'BACKEND DISTRICT' },
      'QA':         { x: -6, y: 4,  w: 3, h: 3, color: '#d97706', label: 'QA LAB' },
      'DEVOPS':     { x: -8, y: -2, w: 3, h: 3, color: '#7c3aed', label: 'DEVOPS CENTER' },
      'AI_MODELS':  { x: 0,  y: -8, w: 4, h: 3, color: '#be185d', label: 'AI CORE' },
      'MEMORY':     { x: 0,  y: 8,  w: 4, h: 3, color: '#0f766e', label: 'MEMORY VAULT' },
      'KNOWLEDGE':  { x: -4, y: 9,  w: 3, h: 3, color: '#6d28d9', label: 'KNOWLEDGE CENTER' },
      'MCP':        { x: 8,  y: 1,  w: 3, h: 3, color: '#0284c7', label: 'MCP HUB' }
    };

    this._initSimulatedAgents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupEvents();
    
    // Sync with real API every 3s
    this._syncInterval = setInterval(() => this.syncRealData(), 3000);
    this.syncRealData();
    this.startLoop();
  }

  _initSimulatedAgents() {
    for (const tmpl of AGENT_ROLES) {
      const dist = this.DISTRICTS[tmpl.district];
      if (!dist) continue;
      const agent = {
        id: tmpl.id,
        name: tmpl.name,
        role: tmpl.role,
        color: tmpl.color,
        emoji: tmpl.emoji,
        district: tmpl.district,
        x: dist.x + (Math.random() - 0.5) * (dist.w - 1),
        y: dist.y + (Math.random() - 0.5) * (dist.h - 1),
        tx: dist.x, ty: dist.y,
        status: Math.random() < 0.6 ? 'WORKING' : 'IDLE',
        workMsg: WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)],
        trail: [],
        // Walk animation
        walkFrame: 0,
        walkTimer: 0,
        // Wander timer
        wanderTimer: Math.random() * 4,
        // Speech bubble
        bubbleTimer: Math.random() * 6,
        bubble: null,
        // Real API override
        isReal: false
      };
      this._setNewTarget(agent);
      this.world.agents.set(tmpl.id, agent);
    }
  }

  _setNewTarget(agent) {
    const dist = this.DISTRICTS[agent.district];
    if (!dist) return;
    agent.tx = dist.x + (Math.random() - 0.5) * (dist.w * 0.8);
    agent.ty = dist.y + (Math.random() - 0.5) * (dist.h * 0.8);
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
    });
    // Double-click to reset camera
    this.canvas.addEventListener('dblclick', () => {
      this.state.targetCamera = { x: 0, y: 0, zoom: 1.0 };
    });
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

  syncRealData() {
    try {
      let apiAgents = [];
      if (window.FENIX?.live?.agents?.length) apiAgents = window.FENIX.live.agents;
      else if (window.state?.api?.agentsPanel?.agents?.length) apiAgents = window.state.api.agentsPanel.agents;
      else if (window.state?.api?.agents?.agents?.length) apiAgents = window.state.api.agents.agents;

      if (apiAgents.length > 0) {
        // Overlay real agents on top of simulated ones
        for (const a of apiAgents) {
          const id = a.id || a.name;
          const existingRole = AGENT_ROLES.find(r => r.role === (a.role || '').toLowerCase() || r.id === id);
          if (existingRole && this.world.agents.has(existingRole.id)) {
            const agent = this.world.agents.get(existingRole.id);
            agent.status = a.status || agent.status;
            agent.isReal = true;
          }
        }
      }

      // Randomly cycle statuses for simulated agents to keep city alive
      for (const agent of this.world.agents.values()) {
        if (!agent.isReal && Math.random() < 0.08) {
          agent.status = Math.random() < 0.55 ? 'WORKING' : 'IDLE';
          if (agent.status === 'WORKING') {
            agent.workMsg = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)];
          }
        }
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
    }

    // Wander timer — pick new target periodically
    agent.wanderTimer -= delta;
    if (agent.wanderTimer <= 0) {
      agent.wanderTimer = 3 + Math.random() * 5;
      this._setNewTarget(agent);
      // Occasionally visit a different district
      if (Math.random() < 0.25) {
        const keys = Object.keys(this.DISTRICTS);
        const nextKey = keys[Math.floor(Math.random() * keys.length)];
        agent.district = nextKey;
        this._setNewTarget(agent);
      }
    }

    // Trail decay
    for (const t of agent.trail) t.life -= delta * 2.5;
    agent.trail = agent.trail.filter(t => t.life > 0);

    // Bubble timer
    agent.bubbleTimer -= delta;
    if (agent.bubbleTimer <= 0) {
      agent.bubbleTimer = 4 + Math.random() * 8;
      if (isWorking) {
        agent.bubble = { text: agent.workMsg, life: 2.5 };
      }
    }
    if (agent.bubble) {
      agent.bubble.life -= delta;
      if (agent.bubble.life <= 0) agent.bubble = null;
    }

    // Emit work particles
    if (isWorking && Math.random() < 0.3) {
      this.world.particles.push({
        x: agent.x, y: agent.y, z: 0.5,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        vz: 0.4 + Math.random() * 0.8,
        color: agent.color,
        size: 1.5 + Math.random() * 2,
        life: 1, decay: 1.2
      });
    }
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

    const districts = Object.values(this.DISTRICTS).sort((a,b) => (a.x+a.y)-(b.x+b.y));
    for (const d of districts) this._drawDistrict(ctx, d, cx, cy, zoom);

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

  _drawBackdrop(ctx, w, h) {
    const g = ctx.createRadialGradient(w*.5, h*.35, 0, w*.5, h*.35, Math.max(w,h)*.75);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#070b13');
    g.addColorStop(1, '#020408');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Ambient glow
    ctx.fillStyle = 'rgba(56, 189, 248, 0.035)';
    ctx.beginPath();
    ctx.arc(w*.5, h*.45, Math.min(w,h)*.38, 0, Math.PI*2);
    ctx.fill();
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const seed = 42;
    for (let i = 0; i < 60; i++) {
      const sx = ((i*137.5 + seed) % w);
      const sy = ((i*97.3 + seed*2) % (h*0.6));
      const blink = 0.3 + 0.7 * Math.abs(Math.sin(this.time*0.5 + i));
      ctx.globalAlpha = blink * 0.4;
      ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.globalAlpha = 1;
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
    ctx.font = `700 ${Math.max(9, 11*zoom)}px 'Inter',sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(d.label, center.x, center.y - 38*zoom);
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

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2*zoom;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      ctx.ellipse(sc.x, sc.y + bodyH*0.3, r*1.8, r*0.9, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Shadow
    const shadowSc = this.toScreen(agent.x, agent.y, 0.2, cx, cy, zoom);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(shadowSc.x, shadowSc.y, r, r*0.45, 0, 0, Math.PI*2); ctx.fill();

    // Body — Habbo cylinder
    const grad = ctx.createLinearGradient(sc.x-r, sc.y-bodyH, sc.x+r, sc.y);
    grad.addColorStop(0, this._adjustColor(agent.color, 30));
    grad.addColorStop(1, this._adjustColor(agent.color, -30));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sc.x, sc.y, r, r*0.5, 0, 0, Math.PI, false);
    ctx.lineTo(sc.x-r, sc.y-bodyH);
    ctx.ellipse(sc.x, sc.y-bodyH, r, r*0.5, 0, Math.PI, 0, true);
    ctx.lineTo(sc.x+r, sc.y);
    ctx.fill();
    // Body top
    ctx.fillStyle = this._adjustColor(agent.color, 20);
    ctx.beginPath(); ctx.ellipse(sc.x, sc.y-bodyH, r, r*0.5, 0, 0, Math.PI*2); ctx.fill();

    // Head (round)
    const headY = sc.y - bodyH - headR*1.4;
    const hg = ctx.createRadialGradient(sc.x-headR*0.3, headY-headR*0.3, 0, sc.x, headY, headR);
    hg.addColorStop(0, this._adjustColor(agent.color, 60));
    hg.addColorStop(1, agent.color);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(sc.x, headY, headR, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = this._adjustColor(agent.color, 40);
    ctx.lineWidth = zoom; ctx.stroke();

    // Eyes (2 white dots)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sc.x - headR*0.3, headY - headR*0.1, headR*0.18, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sc.x + headR*0.3, headY - headR*0.1, headR*0.18, 0, Math.PI*2); ctx.fill();

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
