/**
 * FÊNIX AGENTIC CITY 2.0
 * Interactive Isometric Digital Twin for FÊNIX OS
 * Real-time connection to AutonomousJobOrchestrator
 */

class IsoCityEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.state = {
      camera: { x: 0, y: 0, zoom: 1.0 },
      targetCamera: { x: 0, y: 0, zoom: 1.0 },
      isDragging: false,
      lastMouse: { x: 0, y: 0 },
      tileSize: 60,
      hoveredAgent: null,
      lastTime: performance.now()
    };

    this.world = {
      agents: new Map(),
      particles: []
    };

    this.DISTRICTS = {
      'CENTRAL': { x: 0, y: 0, w: 4, h: 4, color: '#1e293b', label: 'CENTRAL PLAZA' },
      'MASTER_HQ': { x: -6, y: -6, w: 3, h: 3, color: '#b91c1c', label: 'MASTER HQ' },
      'FRONTEND': { x: 6, y: -2, w: 3, h: 3, color: '#2563eb', label: 'FRONTEND DISTRICT' },
      'BACKEND': { x: 6, y: 4, w: 3, h: 3, color: '#16a34a', label: 'BACKEND DISTRICT' },
      'QA': { x: -6, y: 4, w: 3, h: 3, color: '#f59e0b', label: 'QA LAB' },
      'DEVOPS': { x: -8, y: -2, w: 3, h: 3, color: '#9333ea', label: 'DEVOPS CENTER' },
      'AI_MODELS': { x: 0, y: -8, w: 4, h: 3, color: '#db2777', label: 'AI CORE' },
      'MEMORY': { x: 0, y: 8, w: 4, h: 3, color: '#0d9488', label: 'MEMORY VAULT' }
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupEvents();
    
    // Sync data from FENIX API
    setInterval(() => this.syncRealData(), 1500);
    this.syncRealData();

    this.startLoop();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
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
      
      // Hit testing for hover
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.checkHover(mx, my);
    });
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.state.targetCamera.zoom = Math.max(0.5, Math.min(2.5, this.state.targetCamera.zoom * zoomDelta));
    });
  }

  checkHover(mx, my) {
    this.state.hoveredAgent = null;
    const { camera, tileSize } = this.state;
    const cx = this.canvas.width / 2 + camera.x;
    const cy = this.canvas.height / 2 + camera.y;

    let closest = null;
    let minDist = 40;

    for (const agent of this.world.agents.values()) {
      const screen = this.toScreen(agent.x, agent.y, 0, cx, cy, camera.zoom);
      // Adjust for avatar height
      screen.y -= 30 * camera.zoom;
      
      const dist = Math.hypot(mx - screen.x, my - screen.y);
      if (dist < minDist) {
        minDist = dist;
        closest = agent;
      }
    }
    
    this.state.hoveredAgent = closest;
    this.canvas.style.cursor = closest ? 'pointer' : (this.state.isDragging ? 'grabbing' : 'grab');
  }

  async syncRealData() {
    try {
      const res = await fetch('/api/agents/panel');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.agents) {
        this.updateAgents(data.agents);
      }
    } catch (e) {
      console.warn('IsoCity: Failed to fetch agents', e);
    }
  }

  getAgentDistrict(role) {
    if (!role) return 'CENTRAL';
    const r = role.toLowerCase();
    if (r.includes('frontend')) return 'FRONTEND';
    if (r.includes('backend') || r.includes('database')) return 'BACKEND';
    if (r.includes('qa') || r.includes('test')) return 'QA';
    if (r.includes('devops') || r.includes('security')) return 'DEVOPS';
    if (r.includes('master') || r.includes('architect')) return 'MASTER_HQ';
    if (r.includes('memory') || r.includes('knowledge')) return 'MEMORY';
    if (r.includes('ai') || r.includes('model')) return 'AI_MODELS';
    return 'CENTRAL';
  }

  updateAgents(apiAgents) {
    const currentIds = new Set(apiAgents.map(a => a.name));
    
    // Remove old
    for (const [id, agent] of this.world.agents.entries()) {
      if (!currentIds.has(id)) this.world.agents.delete(id);
    }

    // Add / Update
    for (const a of apiAgents) {
      let agent = this.world.agents.get(a.name);
      if (!agent) {
        agent = {
          id: a.name, name: a.name, role: a.role,
          x: 0, y: 0, tx: 0, ty: 0,
          status: 'IDLE', lastStatus: '',
          district: 'CENTRAL',
          trail: []
        };
        this.world.agents.set(a.name, agent);
      }
      
      agent.role = a.role;
      agent.status = a.status || 'IDLE';
      
      const targetDistrict = agent.status === 'IDLE' ? 'CENTRAL' : this.getAgentDistrict(agent.role);
      
      if (agent.status !== agent.lastStatus || agent.district !== targetDistrict) {
        agent.lastStatus = agent.status;
        agent.district = targetDistrict;
        
        const dist = this.DISTRICTS[targetDistrict];
        if (dist) {
          agent.tx = dist.x + (Math.random() * (dist.w - 1)) - (dist.w/2 - 0.5);
          agent.ty = dist.y + (Math.random() * (dist.h - 1)) - (dist.h/2 - 0.5);
        }
      }
    }
  }

  toScreen(x, y, z, cx, cy, zoom) {
    const tw = this.state.tileSize * zoom;
    const th = (this.state.tileSize / 2) * zoom;
    
    const sx = (x - y) * tw;
    const sy = (x + y) * th - (z * tw);
    
    return { x: cx + sx, y: cy + sy };
  }

  startLoop() {
    const loop = (time) => {
      const delta = (time - this.state.lastTime) / 1000;
      this.state.lastTime = time;
      this.update(delta);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(delta) {
    // Smooth camera
    this.state.camera.x += (this.state.targetCamera.x - this.state.camera.x) * 5 * delta;
    this.state.camera.y += (this.state.targetCamera.y - this.state.camera.y) * 5 * delta;
    this.state.camera.zoom += (this.state.targetCamera.zoom - this.state.camera.zoom) * 5 * delta;

    // Update agents
    for (const agent of this.world.agents.values()) {
      const dx = agent.tx - agent.x;
      const dy = agent.ty - agent.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 0.05) {
        const speed = (agent.status === 'WORKING' ? 1.5 : 2.5) * delta;
        const moveDist = Math.min(speed, dist);
        agent.x += (dx / dist) * moveDist;
        agent.y += (dy / dist) * moveDist;
        
        // Trail
        agent.trail.push({x: agent.x, y: agent.y, life: 1.0});
      } else {
        // Wandering slightly if working
        if (agent.status === 'WORKING' && Math.random() < 0.02) {
           const distObj = this.DISTRICTS[agent.district];
           if (distObj) {
             agent.tx = distObj.x + (Math.random() * (distObj.w - 1)) - (distObj.w/2 - 0.5);
             agent.ty = distObj.y + (Math.random() * (distObj.h - 1)) - (distObj.h/2 - 0.5);
           }
        }
      }
      
      // Update trail
      agent.trail.forEach(t => t.life -= delta * 1.5);
      agent.trail = agent.trail.filter(t => t.life > 0);
    }
  }

  draw() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const { camera, zoomLevel, tileSize } = this.state;
    const zoom = camera.zoom;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2 + camera.x;
    const cy = height / 2 + camera.y;

    // 1. Draw Grid
    this.drawGrid(ctx, cx, cy, zoom);

    // 2. Draw Districts
    // Sort districts by Painter's Algorithm (x + y)
    const districts = Object.values(this.DISTRICTS).sort((a,b) => (a.x + a.y) - (b.x + b.y));
    for (const d of districts) {
      this.drawDistrict(ctx, d, cx, cy, zoom);
    }

    // 3. Draw Agent Trails
    for (const agent of this.world.agents.values()) {
      this.drawTrail(ctx, agent, cx, cy, zoom);
    }

    // 4. Draw Agents
    // Sort agents by Painter's algorithm
    const sortedAgents = Array.from(this.world.agents.values()).sort((a,b) => (a.x + a.y) - (b.x + b.y));
    for (const agent of sortedAgents) {
      this.drawAgent(ctx, agent, cx, cy, zoom);
    }
  }

  drawGrid(ctx, cx, cy, zoom) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -15; i <= 15; i++) {
      const p1 = this.toScreen(i, -15, 0, cx, cy, zoom);
      const p2 = this.toScreen(i, 15, 0, cx, cy, zoom);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      
      const p3 = this.toScreen(-15, i, 0, cx, cy, zoom);
      const p4 = this.toScreen(15, i, 0, cx, cy, zoom);
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
    }
    ctx.stroke();
  }

  drawDistrict(ctx, d, cx, cy, zoom) {
    // Base platform
    const top = this.toScreen(d.x - d.w/2, d.y - d.h/2, 0, cx, cy, zoom);
    const right = this.toScreen(d.x + d.w/2, d.y - d.h/2, 0, cx, cy, zoom);
    const bottom = this.toScreen(d.x + d.w/2, d.y + d.h/2, 0, cx, cy, zoom);
    const left = this.toScreen(d.x - d.w/2, d.y + d.h/2, 0, cx, cy, zoom);
    
    // Depth (Block)
    const depth = 0.2;
    const topZ = this.toScreen(d.x - d.w/2, d.y - d.h/2, depth, cx, cy, zoom);
    const rightZ = this.toScreen(d.x + d.w/2, d.y - d.h/2, depth, cx, cy, zoom);
    const bottomZ = this.toScreen(d.x + d.w/2, d.y + d.h/2, depth, cx, cy, zoom);
    const leftZ = this.toScreen(d.x - d.w/2, d.y + d.h/2, depth, cx, cy, zoom);

    // Left Face
    ctx.fillStyle = this.adjustColor(d.color, -40);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(bottomZ.x, bottomZ.y);
    ctx.lineTo(leftZ.x, leftZ.y);
    ctx.fill();
    ctx.strokeStyle = this.adjustColor(d.color, 20);
    ctx.stroke();

    // Right Face
    ctx.fillStyle = this.adjustColor(d.color, -20);
    ctx.beginPath();
    ctx.moveTo(bottom.x, bottom.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(rightZ.x, rightZ.y);
    ctx.lineTo(bottomZ.x, bottomZ.y);
    ctx.fill();
    ctx.stroke();

    // Top Face
    ctx.fillStyle = d.color + '40'; // Transparent top
    ctx.beginPath();
    ctx.moveTo(topZ.x, topZ.y);
    ctx.lineTo(rightZ.x, rightZ.y);
    ctx.lineTo(bottomZ.x, bottomZ.y);
    ctx.lineTo(leftZ.x, leftZ.y);
    ctx.closePath();
    ctx.fill();
    
    // Glowing border
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 2 * zoom;
    ctx.stroke();
    
    // Floor grid inside district
    ctx.strokeStyle = d.color + '40';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < d.w; i++) {
        const p1 = this.toScreen(d.x - d.w/2 + i, d.y - d.h/2, depth, cx, cy, zoom);
        const p2 = this.toScreen(d.x - d.w/2 + i, d.y + d.h/2, depth, cx, cy, zoom);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
    }
    for (let i = 1; i < d.h; i++) {
        const p1 = this.toScreen(d.x - d.w/2, d.y - d.h/2 + i, depth, cx, cy, zoom);
        const p2 = this.toScreen(d.x + d.w/2, d.y - d.h/2 + i, depth, cx, cy, zoom);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // Label
    const centerZ = this.toScreen(d.x, d.y, depth, cx, cy, zoom);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${10 * zoom}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(d.label, centerZ.x, centerZ.y - (30 * zoom));
  }

  drawTrail(ctx, agent, cx, cy, zoom) {
    if (agent.trail.length < 2) return;
    
    const color = agent.status === 'WORKING' ? '#38bdf8' : '#94a3b8';
    
    ctx.beginPath();
    const first = this.toScreen(agent.trail[0].x, agent.trail[0].y, 0.2, cx, cy, zoom);
    ctx.moveTo(first.x, first.y);
    
    for (let i = 1; i < agent.trail.length; i++) {
      const p = this.toScreen(agent.trail[i].x, agent.trail[i].y, 0.2, cx, cy, zoom);
      ctx.lineTo(p.x, p.y);
    }
    
    const head = this.toScreen(agent.x, agent.y, 0.2, cx, cy, zoom);
    ctx.lineTo(head.x, head.y);

    ctx.strokeStyle = color + '80'; // 50% opacity
    ctx.lineWidth = 3 * zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  drawAgent(ctx, agent, cx, cy, zoom) {
    const isHovered = this.state.hoveredAgent === agent;
    const isWorking = agent.status === 'WORKING';
    
    // Position
    // Bounce if working
    const bounce = isWorking ? Math.abs(Math.sin(performance.now() / 150)) * 0.1 : 0;
    const pos = this.toScreen(agent.x, agent.y, 0.2 + bounce, cx, cy, zoom);
    
    const radius = 6 * zoom;
    const height = 18 * zoom;

    // Base shadow
    const shadow = this.toScreen(agent.x, agent.y, 0.2, cx, cy, zoom);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, radius, radius/2, 0, 0, Math.PI*2);
    ctx.fill();

    // Agent Color based on status
    let agentColor = '#94a3b8'; // IDLE
    if (isWorking) agentColor = '#3b82f6'; // Blue
    if (agent.status === 'TESTING' || agent.status === 'QA') agentColor = '#f59e0b'; // Amber
    if (agent.status === 'ERROR') agentColor = '#ef4444'; // Red

    // Body (Cylinder)
    ctx.fillStyle = this.adjustColor(agentColor, -20);
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, radius, radius/2, 0, 0, Math.PI, false);
    ctx.lineTo(pos.x - radius, pos.y - height);
    ctx.ellipse(pos.x, pos.y - height, radius, radius/2, 0, Math.PI, 0, true);
    ctx.lineTo(pos.x + radius, pos.y);
    ctx.fill();

    // Top
    ctx.fillStyle = agentColor;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - height, radius, radius/2, 0, 0, Math.PI*2);
    ctx.fill();

    // Glow if working
    if (isWorking) {
      ctx.shadowColor = agentColor;
      ctx.shadowBlur = 10 * zoom;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Name Tag
    if (isHovered || isWorking) {
      ctx.font = `${10 * zoom}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      
      const tagY = pos.y - height - (10 * zoom);
      
      // Bg
      const textWidth = ctx.measureText(agent.name).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.beginPath();
      ctx.roundRect(pos.x - textWidth/2 - 4, tagY - 10*zoom, textWidth + 8, 14*zoom, 4);
      ctx.fill();

      // Text
      ctx.fillStyle = '#fff';
      ctx.fillText(agent.name, pos.x, tagY);

      // Status below
      if (isHovered) {
        ctx.fillStyle = agentColor;
        ctx.font = `${8 * zoom}px "Inter", monospace`;
        ctx.fillText(`[${agent.status}]`, pos.x, tagY + (10 * zoom));
      }
    }
  }

  adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => 
      ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
    );
  }
}

window.IsoCityEngine = IsoCityEngine;
