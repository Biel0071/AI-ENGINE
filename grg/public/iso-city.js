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
      'MEMORY': { x: 0, y: 8, w: 4, h: 3, color: '#0d9488', label: 'MEMORY VAULT' },
      'KNOWLEDGE': { x: -4, y: 9, w: 3, h: 3, color: '#7c3aed', label: 'KNOWLEDGE CENTER' },
      'MCP': { x: 8, y: 1, w: 3, h: 3, color: '#38bdf8', label: 'MCP HUB' }
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

  syncRealData() {
    try {
      if (window.FENIX && window.FENIX.live && window.FENIX.live.agents) {
        this.updateAgents(window.FENIX.live.agents);
      } else if (window.FENIX && window.FENIX.state && window.FENIX.state.data) {
        const data = window.FENIX.state.data;
        this.updateAgents(data.agents?.agents || data.swarm?.agents || []);
      } else if (window.state && window.state.api && window.state.api.agentsPanel) {
        // Fallback to Shell state
        this.updateAgents(window.state.api.agentsPanel.agents || []);
      }
    } catch (e) {
      console.warn('IsoCity: Failed to sync agents', e);
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
    if (r.includes('knowledge') || r.includes('graph')) return 'KNOWLEDGE';
    if (r.includes('memory')) return 'MEMORY';
    if (r.includes('mcp') || r.includes('connector')) return 'MCP';
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

    this.drawBackdrop(ctx, width, height);

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

    this.drawLegend(ctx, width, height);
  }

  drawBackdrop(ctx, width, height) {
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.35, 0, width * 0.5, height * 0.35, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, '#101827');
    gradient.addColorStop(0.48, '#070b13');
    gradient.addColorStop(1, '#03050a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.42, Math.min(width, height) * 0.34, 0, Math.PI * 2);
    ctx.fill();
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

    this.drawDistrictStructures(ctx, d, cx, cy, zoom, depth);

    // Label
    const centerZ = this.toScreen(d.x, d.y, depth, cx, cy, zoom);
    const count = this.countAgentsInDistrict(d.label);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `700 ${11 * zoom}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.85)';
    ctx.shadowBlur = 8 * zoom;
    ctx.fillText(d.label, centerZ.x, centerZ.y - (34 * zoom));
    if (count > 0) {
      ctx.font = `600 ${8 * zoom}px "JetBrains Mono", monospace`;
      ctx.fillStyle = d.color;
      ctx.fillText(`${count} AGENTE${count === 1 ? '' : 'S'}`, centerZ.x, centerZ.y - (22 * zoom));
    }
    ctx.shadowBlur = 0;
  }

  drawDistrictStructures(ctx, d, cx, cy, zoom, depth) {
    const structures = [
      { ox: -0.75, oy: -0.55, h: 0.55 },
      { ox: 0.48, oy: -0.35, h: 0.38 },
      { ox: -0.15, oy: 0.48, h: 0.30 }
    ];

    if (d.label.includes('CENTRAL')) {
      structures.push({ ox: 0.65, oy: 0.65, h: 0.22 });
    }

    for (const s of structures) {
      if (Math.abs(s.ox) > d.w / 2 - 0.35 || Math.abs(s.oy) > d.h / 2 - 0.35) continue;
      this.drawBlock(ctx, d.x + s.ox, d.y + s.oy, depth, s.h, d.color, cx, cy, zoom);
    }
  }

  drawBlock(ctx, x, y, baseZ, height, color, cx, cy, zoom) {
    const half = 0.22;
    const a = this.toScreen(x - half, y - half, baseZ, cx, cy, zoom);
    const b = this.toScreen(x + half, y - half, baseZ, cx, cy, zoom);
    const c = this.toScreen(x + half, y + half, baseZ, cx, cy, zoom);
    const d = this.toScreen(x - half, y + half, baseZ, cx, cy, zoom);
    const az = this.toScreen(x - half, y - half, baseZ + height, cx, cy, zoom);
    const bz = this.toScreen(x + half, y - half, baseZ + height, cx, cy, zoom);
    const cz = this.toScreen(x + half, y + half, baseZ + height, cx, cy, zoom);
    const dz = this.toScreen(x - half, y + half, baseZ + height, cx, cy, zoom);

    ctx.fillStyle = this.adjustColor(color, -48);
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(cz.x, cz.y);
    ctx.lineTo(dz.x, dz.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.adjustColor(color, -28);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(bz.x, bz.y);
    ctx.lineTo(cz.x, cz.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = color + 'a8';
    ctx.beginPath();
    ctx.moveTo(az.x, az.y);
    ctx.lineTo(bz.x, bz.y);
    ctx.lineTo(cz.x, cz.y);
    ctx.lineTo(dz.x, dz.y);
    ctx.closePath();
    ctx.fill();
  }

  countAgentsInDistrict(label) {
    const district = Object.entries(this.DISTRICTS).find(([, value]) => value.label === label)?.[0];
    if (!district) return 0;
    return Array.from(this.world.agents.values()).filter(agent => agent.district === district).length;
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
    const status = String(agent.status || 'IDLE').toUpperCase();
    const isWorking = ['WORKING', 'RUNNING', 'TESTING', 'VALIDATING', 'QUEUED'].includes(status);
    
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
    if (status === 'QUEUED') agentColor = '#38bdf8';
    if (status === 'WORKING' || status === 'RUNNING') agentColor = '#3b82f6';
    if (status === 'TESTING' || status === 'QA' || status === 'VALIDATING') agentColor = '#f59e0b';
    if (status === 'COMPLETED' || status === 'DONE') agentColor = '#22c55e';
    if (status === 'ERROR' || status === 'FAILED') agentColor = '#ef4444';

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
        ctx.fillText(`[${status}]`, pos.x, tagY + (10 * zoom));
      }
    }
  }

  drawLegend(ctx, width, height) {
    const agentCount = this.world.agents.size;
    ctx.save();
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(16, height - 54, 245, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`AI CITY ONLINE · ${agentCount} agente${agentCount === 1 ? '' : 's'} real(is)`, 30, height - 33);
    ctx.restore();
  }

  adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => 
      ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
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
  document.addEventListener('DOMContentLoaded', () => setTimeout(bootIsoCity, 0), { once: true });
} else {
  bootIsoCity();
}
