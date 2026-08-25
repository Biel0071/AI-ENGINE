class IsoCityEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.state = {
      agents: [],
      jobs: [],
      camera: { x: 0, y: 0, zoom: 0.8 },
      isDragging: false,
      lastMouse: { x: 0, y: 0 },
      tileSize: 120,
      hoveredBuilding: null,
      selectedBuilding: null,
      zoomLevel: 'city' // city, building, floor, agent
    };

    this.buildings = [
      { id: 'fenix-tower', name: 'FÊNIX TOWER', type: 'hq', level: 30, x: 0, y: 0, w: 2, h: 2, color: '#FFD700', agents: [] },
      { id: 'api-layer', name: 'API LAYER', type: 'tech', level: 30, x: -3, y: -2, w: 2, h: 2, color: '#00FFFF', agents: [] },
      { id: 'rag-center', name: 'RAG CENTER', type: 'data', level: 27, x: 3, y: -2, w: 2, h: 2, color: '#9370DB', agents: [] },
      { id: 'devops-hub', name: 'DEVOPS HUB', type: 'ops', level: 29, x: -3, y: 2, w: 2, h: 2, color: '#32CD32', agents: [] },
      { id: 'research-lab', name: 'RESEARCH LAB', type: 'lab', level: 27, x: 3, y: 2, w: 2, h: 2, color: '#FF4500', agents: [] }
    ];

    // Mocks for visual testing if no data is provided yet
    this.mockAgents = [
      { id: 'ag1', name: 'Vitória', role: 'UX/UI Engineer', x: 0, y: 1, tx: 0, ty: 1, status: 'WORKING', building: 'fenix-tower' },
      { id: 'ag2', name: 'JARVIS', role: 'DevOps Engineer', x: -3, y: 2, tx: -3, ty: 2, status: 'DEPLOYING', building: 'devops-hub' },
      { id: 'ag3', name: 'Roberto', role: 'AI Researcher', x: 3, y: 2, tx: 3, ty: 2, status: 'ANALYZING', building: 'research-lab' }
    ];

    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.setupEvents();
    this.startLoop();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || window.innerWidth;
    this.canvas.height = rect.height || window.innerHeight;
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left click
      this.state.isDragging = true;
      this.state.lastMouse = { x: e.clientX, y: e.clientY };
    });
    
    window.addEventListener('mousemove', (e) => {
      if (this.state.isDragging) {
        const dx = e.clientX - this.state.lastMouse.x;
        const dy = e.clientY - this.state.lastMouse.y;
        this.state.camera.x += dx / this.state.camera.zoom;
        this.state.camera.y += dy / this.state.camera.zoom;
        this.state.lastMouse = { x: e.clientX, y: e.clientY };
      } else {
        // Hover detection could go here (map screen to iso)
      }
    });
    
    window.addEventListener('mouseup', () => {
      this.state.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.15;
      const zoomDelta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
      const oldZoom = this.state.camera.zoom;
      this.state.camera.zoom = Math.max(0.2, Math.min(4.0, this.state.camera.zoom + (this.state.camera.zoom * zoomDelta)));
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Keep mouse position fixed while zooming
      this.state.camera.x -= (mouseX - this.canvas.width/2) / this.state.camera.zoom - (mouseX - this.canvas.width/2) / oldZoom;
      this.state.camera.y -= (mouseY - this.canvas.height/2) / this.state.camera.zoom - (mouseY - this.canvas.height/2) / oldZoom;
      
      this.updateSemanticZoom();
    }, { passive: false });
  }

  updateSemanticZoom() {
    const z = this.state.camera.zoom;
    if (z < 0.6) this.state.zoomLevel = 'city';
    else if (z < 1.5) this.state.zoomLevel = 'building';
    else if (z < 2.5) this.state.zoomLevel = 'floor';
    else this.state.zoomLevel = 'agent';
  }

  updateData(agents, jobs) {
    this.state.agents = (agents && agents.length > 0) ? agents : this.mockAgents;
    this.state.jobs = jobs || [];
  }

  toIso(x, y) {
    return {
      x: (x - y) * (this.state.tileSize / 2),
      y: (x + y) * (this.state.tileSize / 4)
    };
  }

  toScreen(x, y) {
    const iso = this.toIso(x, y);
    return {
      x: this.canvas.width / 2 + (iso.x + this.state.camera.x) * this.state.camera.zoom,
      y: this.canvas.height / 2 + (iso.y + this.state.camera.y) * this.state.camera.zoom
    };
  }

  startLoop() {
    let lastTime = performance.now();
    const draw = (time) => {
      const dt = time - lastTime;
      lastTime = time;
      
      this.updatePhysics(dt);
      
      this.ctx.fillStyle = '#080b10'; // Dark theme background
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.save();
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.scale(this.state.camera.zoom, this.state.camera.zoom);
      this.ctx.translate(this.state.camera.x, this.state.camera.y);
      
      // Draw Grid
      this.drawFloor();
      
      // Sort renderables by depth (Y sort in iso is roughly x + y)
      const renderables = [];
      this.buildings.forEach(b => renderables.push({ type: 'building', data: b, depth: b.x + b.y }));
      this.state.agents.forEach(a => renderables.push({ type: 'agent', data: a, depth: a.x + a.y }));
      
      renderables.sort((a, b) => a.depth - b.depth);
      
      renderables.forEach(r => {
        if (r.type === 'building') this.drawBuilding(r.data);
        if (r.type === 'agent') this.drawAgent(r.data);
      });
      
      this.ctx.restore();
      
      this.drawUI();
      
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  updatePhysics(dt) {
    const agents = this.state.agents.length ? this.state.agents : this.mockAgents;
    agents.forEach(agent => {
      // Simple random walk for now
      if (Math.random() < 0.01) {
        agent.tx = agent.x + (Math.random() * 2 - 1);
        agent.ty = agent.y + (Math.random() * 2 - 1);
      }
      
      const dx = agent.tx - agent.x;
      const dy = agent.ty - agent.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0.05) {
        agent.x += (dx / dist) * 0.001 * dt;
        agent.y += (dy / dist) * 0.001 * dt;
      } else {
        agent.x = agent.tx;
        agent.y = agent.ty;
      }
    });
  }

  drawFloor() {
    const gridSize = 15;
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    for (let x = -gridSize; x <= gridSize; x++) {
      const p1 = this.toIso(x, -gridSize);
      const p2 = this.toIso(x, gridSize);
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }
    for (let y = -gridSize; y <= gridSize; y++) {
      const p1 = this.toIso(-gridSize, y);
      const p2 = this.toIso(gridSize, y);
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }
  }

  drawIsoCube(x, y, w, h, height, color) {
    const p1 = this.toIso(x, y);
    const p2 = this.toIso(x + w, y);
    const p3 = this.toIso(x + w, y + h);
    const p4 = this.toIso(x, y + h);
    
    const hOff = -height * this.state.tileSize;
    
    // Top
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y + hOff);
    this.ctx.lineTo(p2.x, p2.y + hOff);
    this.ctx.lineTo(p3.x, p3.y + hOff);
    this.ctx.lineTo(p4.x, p4.y + hOff);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Left face
    this.ctx.fillStyle = this.adjustColor(color, -40);
    this.ctx.beginPath();
    this.ctx.moveTo(p4.x, p4.y);
    this.ctx.lineTo(p3.x, p3.y);
    this.ctx.lineTo(p3.x, p3.y + hOff);
    this.ctx.lineTo(p4.x, p4.y + hOff);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Right face
    this.ctx.fillStyle = this.adjustColor(color, -20);
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p4.x, p4.y);
    this.ctx.lineTo(p4.x, p4.y + hOff);
    this.ctx.lineTo(p1.x, p1.y + hOff);
    this.ctx.fill();
    this.ctx.stroke();
  }

  drawBuilding(b) {
    const height = b.level / 10;
    this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    this.drawIsoCube(b.x, b.y, b.w, b.h, height, '#1a2233');
    
    // Draw neon details
    this.ctx.fillStyle = b.color;
    const topCenter = this.toIso(b.x + b.w/2, b.y + b.h/2);
    this.ctx.shadowColor = b.color;
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.arc(topCenter.x, topCenter.y - (height * this.state.tileSize), 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    // Semantic zoom - Labels
    if (this.state.zoomLevel === 'city' || this.state.zoomLevel === 'building') {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 16px Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(b.name, topCenter.x, topCenter.y - (height * this.state.tileSize) - 30);
      
      this.ctx.fillStyle = b.color;
      this.ctx.font = '12px Inter';
      this.ctx.fillText('NÍVEL ' + b.level, topCenter.x, topCenter.y - (height * this.state.tileSize) - 15);
    }
  }

  drawAgent(a) {
    if (this.state.zoomLevel === 'city') return; // Hide agents in far city view
    
    const pos = this.toIso(a.x, a.y);
    
    // Avatar
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y - 15, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.beginPath();
    this.ctx.ellipse(pos.x, pos.y, 10, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    if (this.state.zoomLevel === 'floor' || this.state.zoomLevel === 'agent') {
      // Label
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px Inter';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(a.name, pos.x, pos.y - 35);
      
      // Status
      this.ctx.fillStyle = a.status === 'WORKING' ? '#00FF00' : '#FFA500';
      this.ctx.font = '10px Inter';
      this.ctx.fillText(a.status, pos.x, pos.y - 25);
    }
  }

  drawUI() {
    // Minimap
    const mapSize = 150;
    const padding = 20;
    this.ctx.fillStyle = 'rgba(8, 11, 16, 0.8)';
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.fillRect(padding, this.canvas.height - mapSize - padding, mapSize, mapSize);
    this.ctx.strokeRect(padding, this.canvas.height - mapSize - padding, mapSize, mapSize);
    
    // Minimap buildings
    this.ctx.save();
    this.ctx.translate(padding + mapSize/2, this.canvas.height - padding - mapSize/2);
    const scale = mapSize / (30 * this.state.tileSize);
    this.ctx.scale(scale, scale);
    
    this.buildings.forEach(b => {
      const pos = this.toIso(b.x, b.y);
      this.ctx.fillStyle = b.color;
      this.ctx.fillRect(pos.x, pos.y, 20, 20);
    });
    
    // Camera rect on minimap
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1/scale;
    this.ctx.strokeRect(-this.state.camera.x, -this.state.camera.y, this.canvas.width/this.state.camera.zoom, this.canvas.height/this.state.camera.zoom);
    
    this.ctx.restore();
    
    // Telemetry / HUD overlay
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Inter';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`MUNDO: FÊNIX AI CITY`, 20, 30);
    this.ctx.fillText(`ZOOM LEVEL: ${this.state.zoomLevel.toUpperCase()} (x${this.state.camera.zoom.toFixed(2)})`, 20, 50);
  }

  adjustColor(color, amount) {
    return color; // Simplified for now
  }
}

// Auto-initialize if canvas exists
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cityCanvas')) {
    window.fenixCity = new IsoCityEngine('cityCanvas');
  }
});
