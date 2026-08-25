class IsoCityEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.state = {
      camera: { x: 0, y: 0, zoom: 0.8 },
      targetCamera: { x: 0, y: 0, zoom: 0.8 },
      isDragging: false,
      lastMouse: { x: 0, y: 0 },
      tileSize: 120,
      zoomLevel: 'city',
      hoveredItem: null,
      selectedItem: null,
      lastUpdate: performance.now()
    };

    // Virtual World Data
    this.world = {
      companies: [], // Derived from window.state.projects
      agents: []     // Derived from window.state.agentStates
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupEvents();
    
    // Connect to external state periodically
    setInterval(() => this.syncRealData(), 1000);
    this.syncRealData();

    this.startLoop();
  }

  syncRealData() {
    if (!window.state) return;

    // Map projects to companies
    const projects = window.state.projects || [];
    const colors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    
    // We lay them out in a grid
    const layoutW = Math.ceil(Math.sqrt(projects.length || 1));
    this.world.companies = projects.map((p, i) => {
      const cx = (i % layoutW) * 8 - (layoutW * 4);
      const cy = Math.floor(i / layoutW) * 8 - (layoutW * 4);
      return {
        id: p.id,
        name: p.name || 'Empresa S/N',
        type: 'tech',
        level: p.status === 'ACTIVE' ? 30 : 15,
        x: cx, y: cy, w: 3, h: 3,
        color: colors[i % colors.length],
        workspaces: p.workspaces || [],
        raw: p
      };
    });

    // Map agents
    const states = window.state.agentStates || {};
    this.world.agents = Object.values(states).map(a => {
      // Find existing agent in engine to keep physical state (x,y,tx,ty)
      const existing = this.world.agents?.find(xa => xa.id === (a.id || a.agentId));
      
      // Default to center if no company, or place near company
      let base_x = 0;
      let base_y = 0;
      if (a.projectId) {
        const comp = this.world.companies.find(c => c.id === a.projectId);
        if (comp) { base_x = comp.x + 1; base_y = comp.y + 1; }
      }

      return {
        id: a.id || a.agentId,
        name: a.name || 'Agent',
        role: a.role || a.capability || 'Worker',
        status: a.status || a.state || 'IDLE',
        x: existing ? existing.x : base_x + (Math.random()*2-1),
        y: existing ? existing.y : base_y + (Math.random()*2-1),
        tx: existing ? existing.tx : base_x,
        ty: existing ? existing.ty : base_y,
        raw: a
      };
    });
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.offsetWidth || window.innerWidth;
      this.canvas.height = parent.offsetHeight || window.innerHeight;
    }
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.state.isDragging = true;
      this.state.lastMouse = { x: e.clientX, y: e.clientY };
    });
    
    window.addEventListener('mousemove', (e) => {
      if (this.state.isDragging) {
        const dx = e.clientX - this.state.lastMouse.x;
        const dy = e.clientY - this.state.lastMouse.y;
        this.state.camera.x += dx / this.state.camera.zoom;
        this.state.camera.y += dy / this.state.camera.zoom;
        this.state.targetCamera.x = this.state.camera.x;
        this.state.targetCamera.y = this.state.camera.y;
        this.state.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });
    
    window.addEventListener('mouseup', () => {
      this.state.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.15;
      const zoomDelta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
      
      const newZoom = Math.max(0.2, Math.min(6.0, this.state.targetCamera.zoom + (this.state.targetCamera.zoom * zoomDelta)));
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Adjust target camera to zoom towards mouse
      this.state.targetCamera.x -= (mouseX - this.canvas.width/2) / newZoom - (mouseX - this.canvas.width/2) / this.state.targetCamera.zoom;
      this.state.targetCamera.y -= (mouseY - this.canvas.height/2) / newZoom - (mouseY - this.canvas.height/2) / this.state.targetCamera.zoom;
      this.state.targetCamera.zoom = newZoom;
    }, { passive: false });

    // Click selection
    this.canvas.addEventListener('click', (e) => {
      if (this.state.isDragging) return; // ignore clicks after dragging
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Project mouse back to world space
      const worldX = (mouseX - this.canvas.width/2) / this.state.camera.zoom - this.state.camera.x;
      const worldY = (mouseY - this.canvas.height/2) / this.state.camera.zoom - this.state.camera.y;
      
      // Inverse isometric projection to find tile coordinates roughly
      const tileY = (worldY / (this.state.tileSize/4) - worldX / (this.state.tileSize/2)) / 2;
      const tileX = (worldY / (this.state.tileSize/4) + worldX / (this.state.tileSize/2)) / 2;
      
      // Find clicked agent
      const clickedAgent = this.world.agents.find(a => {
        const dx = a.x - tileX;
        const dy = a.y - tileY;
        return (dx*dx + dy*dy) < 0.5; // distance squared threshold
      });

      if (clickedAgent && window.openAgentInspector) {
        window.openAgentInspector(clickedAgent.id);
        return;
      }
    });

    // Double click to zoom in
    this.canvas.addEventListener('dblclick', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const worldX = (mouseX - this.canvas.width/2) / this.state.camera.zoom - this.state.camera.x;
      const worldY = (mouseY - this.canvas.height/2) / this.state.camera.zoom - this.state.camera.y;

      this.state.targetCamera.x = -worldX;
      this.state.targetCamera.y = -worldY;
      this.state.targetCamera.zoom = this.state.targetCamera.zoom < 2.0 ? 2.5 : 0.8;
    });
  }

  updateSemanticZoom() {
    const z = this.state.camera.zoom;
    if (z < 0.8) this.state.zoomLevel = 'city';
    else if (z < 2.0) this.state.zoomLevel = 'building';
    else if (z < 3.5) this.state.zoomLevel = 'floor';
    else this.state.zoomLevel = 'agent';
    
    // Push zoom to global state so HUD can read it
    if (window.state) window.state.zoom = z;
  }

  toIso(x, y) {
    return {
      x: (x - y) * (this.state.tileSize / 2),
      y: (x + y) * (this.state.tileSize / 4)
    };
  }

  startLoop() {
    const draw = (time) => {
      const dt = time - this.state.lastUpdate;
      this.state.lastUpdate = time;
      
      this.updatePhysics(dt);
      
      // Smooth camera interpolation
      this.state.camera.x += (this.state.targetCamera.x - this.state.camera.x) * 0.1;
      this.state.camera.y += (this.state.targetCamera.y - this.state.camera.y) * 0.1;
      this.state.camera.zoom += (this.state.targetCamera.zoom - this.state.camera.zoom) * 0.1;
      
      this.updateSemanticZoom();

      // Clear Canvas
      this.ctx.fillStyle = '#04070c';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.save();
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.scale(this.state.camera.zoom, this.state.camera.zoom);
      this.ctx.translate(this.state.camera.x, this.state.camera.y);
      
      this.drawFloor();
      
      // Z-Sort everything
      const renderables = [];
      this.world.companies.forEach(c => renderables.push({ type: 'company', data: c, depth: c.x + c.y }));
      this.world.agents.forEach(a => renderables.push({ type: 'agent', data: a, depth: a.x + a.y }));
      
      renderables.sort((a, b) => a.depth - b.depth);
      
      renderables.forEach(r => {
        if (r.type === 'company') this.drawCompany(r.data);
        if (r.type === 'agent') this.drawAgent(r.data);
      });
      
      this.ctx.restore();
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  updatePhysics(dt) {
    // Agent behavior and movement logic
    this.world.agents.forEach(agent => {
      const s = String(agent.status).toLowerCase();
      const isWorking = s.includes('work') || s.includes('run') || s.includes('cod');
      
      // Behavior: Random movement if idle, static if working
      if (!isWorking && Math.random() < 0.005) {
        // Wander around base company
        agent.tx = agent.x + (Math.random() * 2 - 1);
        agent.ty = agent.y + (Math.random() * 2 - 1);
      }
      
      // Movement interpolation
      const dx = agent.tx - agent.x;
      const dy = agent.ty - agent.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0.05) {
        const speed = isWorking ? 0.0005 : 0.002;
        agent.x += (dx / dist) * speed * dt;
        agent.y += (dy / dist) * speed * dt;
      } else {
        agent.x = agent.tx;
        agent.y = agent.ty;
      }
    });
  }

  drawFloor() {
    const gridSize = 30; // expand grid
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)'; // subtle cyan grid
    this.ctx.lineWidth = 1;
    
    this.ctx.beginPath();
    for (let x = -gridSize; x <= gridSize; x+=2) {
      const p1 = this.toIso(x, -gridSize);
      const p2 = this.toIso(x, gridSize);
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
    }
    for (let y = -gridSize; y <= gridSize; y+=2) {
      const p1 = this.toIso(-gridSize, y);
      const p2 = this.toIso(gridSize, y);
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
    }
    this.ctx.stroke();
  }

  drawIsoCube(x, y, w, h, height, baseColor, highlightColor) {
    const p1 = this.toIso(x, y);
    const p2 = this.toIso(x + w, y);
    const p3 = this.toIso(x + w, y + h);
    const p4 = this.toIso(x, y + h);
    
    const hOff = -height * this.state.tileSize;
    
    // Top
    this.ctx.fillStyle = '#1e293b'; // Slate top
    this.ctx.strokeStyle = highlightColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y + hOff);
    this.ctx.lineTo(p2.x, p2.y + hOff);
    this.ctx.lineTo(p3.x, p3.y + hOff);
    this.ctx.lineTo(p4.x, p4.y + hOff);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Left face
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.moveTo(p4.x, p4.y);
    this.ctx.lineTo(p3.x, p3.y);
    this.ctx.lineTo(p3.x, p3.y + hOff);
    this.ctx.lineTo(p4.x, p4.y + hOff);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Right face
    this.ctx.fillStyle = '#0b1120';
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p4.x, p4.y);
    this.ctx.lineTo(p4.x, p4.y + hOff);
    this.ctx.lineTo(p1.x, p1.y + hOff);
    this.ctx.fill();
    this.ctx.stroke();
  }

  drawCompany(c) {
    // In city view, just draw the big building
    const height = c.level / 10;
    this.drawIsoCube(c.x, c.y, c.w, c.h, height, '#0f172a', c.color);
    
    const topCenter = this.toIso(c.x + c.w/2, c.y + c.h/2);
    const hOff = height * this.state.tileSize;

    // Neon core
    this.ctx.shadowColor = c.color;
    this.ctx.shadowBlur = 30;
    this.ctx.fillStyle = c.color;
    this.ctx.beginPath();
    this.ctx.ellipse(topCenter.x, topCenter.y - hOff, 15, 7, 0, 0, Math.PI*2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Semantic Labels
    if (this.state.zoomLevel === 'city' || this.state.zoomLevel === 'building') {
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = 'bold 18px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(c.name, topCenter.x, topCenter.y - hOff - 40);
      
      this.ctx.fillStyle = c.color;
      this.ctx.font = '12px "JetBrains Mono", monospace';
      this.ctx.fillText(`LVL ${c.level} | ${c.type}`, topCenter.x, topCenter.y - hOff - 20);
    }
  }

  drawAgent(a) {
    if (this.state.zoomLevel === 'city') return; // semantic hide
    
    const pos = this.toIso(a.x, a.y);
    const s = String(a.status).toLowerCase();
    const isWorking = s.includes('work') || s.includes('run') || s.includes('cod');
    const isError = s.includes('fail') || s.includes('err');
    
    const color = isError ? '#ef4444' : (isWorking ? '#22c55e' : '#38bdf8');
    
    // Pulse effect
    const time = performance.now() / 300;
    const bounce = Math.sin(time) * 3;
    const yOff = pos.y - 10 + bounce;

    // Avatar Circle
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, yOff - 15, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    // Shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.beginPath();
    this.ctx.ellipse(pos.x, pos.y, 8, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Info tag
    if (this.state.zoomLevel === 'floor' || this.state.zoomLevel === 'agent') {
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = '600 11px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(a.name, pos.x, yOff - 35);
      
      this.ctx.fillStyle = color;
      this.ctx.font = '9px "JetBrains Mono", monospace';
      this.ctx.fillText(a.status.toUpperCase(), pos.x, yOff - 25);
    }
  }
}

// Global Initialization Hook
window.initCityCanvas = function() {
  if (window.fenixCity) return; // Prevent double init
  const canvas = document.getElementById('cityCanvas');
  if (canvas) {
    window.fenixCity = new IsoCityEngine('cityCanvas');
  }
};
