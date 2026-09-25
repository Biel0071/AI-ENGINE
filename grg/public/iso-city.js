// Deterministic PRNG — Zero Mocks Governance Compliance (Strict determinism in runtime)
let _cityPrngSeed = 123456789;
function _pseudoRandom() {
  _cityPrngSeed = (_cityPrngSeed * 1664525 + 1013904223) % 4294967296;
  return _cityPrngSeed / 4294967296;
}

/**
 * FÊNIX AGENTIC CITY 3.0 — Habbo-style Isometric World
 * Visualizes only agents and activity reported by the live FÊNIX runtime.
 * Syncs with the real FÊNIX API and event stream.
 */

const AGENT_ROLES = [
  { id: 'agent-architect', name: 'Arquiteto', role: 'System Architecture', district: 'command-center', emoji: '📐', color: '#f97316' },
  { id: 'agent-planner',   name: 'Planejador', role: 'Mission Planning', district: 'command-center', emoji: '🎯', color: '#ef4444' },
  { id: 'agent-twin',      name: 'Digital Twin', role: 'Digital Twin & Sandbox', district: 'project-district', emoji: '🪞', color: '#06b6d4' },
  { id: 'agent-ai',        name: 'IA Cognitiva', role: 'Cognitive & LLM Engine', district: 'ai-district', emoji: '🧠', color: '#a855f7' },
  { id: 'agent-knowledge', name: 'Conhecimento', role: 'Knowledge & RAG Graph', district: 'ai-district', emoji: '📚', color: '#8b5cf6' },
  { id: 'agent-frontend',  name: 'Frontend Dev', role: 'UI & Visual Systems', district: 'creative-district', emoji: '🎨', color: '#3b82f6' },
  { id: 'agent-ux',        name: 'UX Designer', role: 'User Experience & Flow', district: 'creative-district', emoji: '✨', color: '#ec4899' },
  { id: 'agent-backend',   name: 'Backend Dev', role: 'Runtime & API Services', district: 'dev-district', emoji: '⚙️', color: '#10b981' },
  { id: 'agent-qa',        name: 'Engenheiro QA', role: 'Testing & Verification', district: 'dev-district', emoji: '🧪', color: '#f59e0b' },
  { id: 'agent-docs',      name: 'Documentador', role: 'Documentation & Specs', district: 'dev-district', emoji: '📝', color: '#64748b' },
  { id: 'agent-db',        name: 'DB Admin', role: 'Database & State Store', district: 'data-center', emoji: '💾', color: '#059669' },
  { id: 'agent-memory',    name: 'Guardião da Memória', role: 'Episodic & Vector Memory', district: 'data-center', emoji: '🧬', color: '#0d9488' },
  { id: 'agent-security',  name: 'Segurança', role: 'Security & Sandbox Guard', district: 'data-center', emoji: '🛡️', color: '#e11d48' },
  { id: 'agent-obs',       name: 'Observabilidade', role: 'Telemetry & Trace Ops', district: 'observatory', emoji: '👁️', color: '#6366f1' },
  { id: 'agent-devops',    name: 'DevOps & SRE', role: 'Deployment & CI/CD', district: 'observatory', emoji: '🚀', color: '#7c3aed' }
];

const CANONICAL_DISTRICTS = Object.freeze({
  'command-center': {
    id: 'command-center', key: 'command-center', name: 'Command Center', label: 'COMMAND CENTER',
    color: '#ef4444', emoji: '🏛️', x: 0, y: 0, w: 4, h: 4,
    buildingType: 'core_spire',
    department: 'Orquestração Central e Governança do Kernel',
    capabilities: ['Kernel Supervisor', 'State Store', 'Event Bus', 'Mission Dispatch'],
    buildings: ['HQ Tower', 'Mission Control', 'War Room']
  },
  'project-district': {
    id: 'project-district', key: 'project-district', name: 'Project District', label: 'PROJECT DISTRICT',
    color: '#06b6d4', emoji: '📁', x: -7, y: -4, w: 3, h: 3,
    buildingType: 'workshop_complex',
    department: 'Gerenciamento de Projetos e Workspaces Ativos',
    capabilities: ['Project Hub', 'Code Forge', 'Deploy Bay'],
    buildings: ['Project Hub', 'Code Forge', 'Deploy Bay']
  },
  'ai-district': {
    id: 'ai-district', key: 'ai-district', name: 'AI District', label: 'AI DISTRICT',
    color: '#a855f7', emoji: '🧠', x: 7, y: -4, w: 3, h: 3,
    buildingType: 'knowledge_library',
    department: 'Inteligência Artificial, Modelos Cognitivos e RAG',
    capabilities: ['Neural Nexus', 'Cognitive Core', 'Model Registry'],
    buildings: ['Neural Nexus', 'Cognitive Core', 'Model Registry']
  },
  'creative-district': {
    id: 'creative-district', key: 'creative-district', name: 'Creative District', label: 'CREATIVE DISTRICT',
    color: '#ec4899', emoji: '🎨', x: 7, y: 5, w: 3, h: 3,
    buildingType: 'creative_studio',
    department: 'Design System, Interfaces, UX e Componentes Visuais',
    capabilities: ['Canvas Pavilion', 'Design Tokens', 'User Experience'],
    buildings: ['Design Studio', 'UI Pavilion', 'UX Lab']
  },
  'dev-district': {
    id: 'dev-district', key: 'dev-district', name: 'Dev District', label: 'DEV DISTRICT',
    color: '#10b981', emoji: '💻', x: -7, y: 5, w: 3, h: 3,
    buildingType: 'command_tower',
    department: 'Engenharia de Software, APIs, Runtime e Qualidade',
    capabilities: ['Code Synthesis', 'API Endpoints', 'QA Automation'],
    buildings: ['Backend Tower', 'QA Radar', 'Doc Center']
  },
  'data-center': {
    id: 'data-center', key: 'data-center', name: 'Data Center', label: 'DATA CENTER',
    color: '#3b82f6', emoji: '🗄️', x: 0, y: 8, w: 3, h: 3,
    buildingType: 'database_silos',
    department: 'Persistência Relacional, Memória Episódica e Segurança',
    capabilities: ['SQLite Store', 'Memory Vault', 'Shield Fortress'],
    buildings: ['Database Silo', 'Memory Vault', 'Security Citadel']
  },
  'observatory': {
    id: 'observatory', key: 'observatory', name: 'Observatory', label: 'OBSERVATORY',
    color: '#6366f1', emoji: '🔭', x: 0, y: -8, w: 3, h: 3,
    buildingType: 'observatory_dome',
    department: 'Telemetria, Observabilidade, Traces e CI/CD',
    capabilities: ['Telemetry Radar', 'Trace Analyzer', 'CI/CD Pipeline'],
    buildings: ['Observatory Dome', 'Metrics Station', 'Launch Pad']
  }
});

function normalizeDistrict(district) {
  if (!district) return 'command-center';
  const d = String(district).toLowerCase().trim();
  if (d === 'command-center' || d === 'central' || d === 'orchestration') return 'command-center';
  if (d === 'project-district' || d === 'projects' || d === 'git' || d === 'archive') return 'project-district';
  if (d === 'ai-district' || d === 'ai' || d === 'knowledge' || d === 'research') return 'ai-district';
  if (d === 'creative-district' || d === 'creative' || d === 'design' || d === 'frontend') return 'creative-district';
  if (d === 'dev-district' || d === 'dev' || d === 'development' || d === 'backend' || d === 'qa' || d === 'browser_qa' || d === 'terminal') return 'dev-district';
  if (d === 'data-center' || d === 'data' || d === 'database' || d === 'memory' || d === 'security') return 'data-center';
  if (d === 'observatory' || d === 'devops' || d === 'communication') return 'observatory';
  return 'command-center';
}

const MUNDER_DIFFLIN_ROOMS = Object.freeze({
  BULLPEN:      { name: 'Central Open Bullpen', x: 0.0, y: 3.0 },
  WAR_ROOM:     { name: 'Executive War Room & Strategy', x: -5.0, y: -7.0 },
  BREAKROOM:    { name: 'Dunder Café & Breakroom', x: 5.0, y: -7.0 },
  DATACENTER:   { name: 'Datacenter Vault & DevOps Ops', x: -6.0, y: 10.0 },
  RESEARCH_LAB: { name: 'AI Innovation & Automation Lab', x: 6.0, y: 10.0 }
});

const MUNDER_DIFFLIN_WAYPOINTS = Object.freeze({
  COFFEE_BAR:       { x: 3.5, y: -8.0, label: 'Café Espresso Bar', thought: 'Tomando café espresso duplo ☕' },
  WATER_COOLER:     { x: 6.5, y: -8.0, label: "Bebedouro d'Água", thought: 'Pausa para hidratação e bate-papo 💧' },
  CONFERENCE_TABLE: { x: -5.0, y: -6.8, label: 'Mesa de Reunião', thought: 'Standup diário de alinhamento 🤝' },
  WHITEBOARD:       { x: -5.0, y: -9.0, label: 'Whiteboard de Arquitetura', thought: 'Revisando diagramas e schema DAG 📐' },
  SERVER_RACKS:     { x: -5.0, y: 9.5, label: 'Racks do Datacenter', thought: 'Verificando telemetria e latência ⚡' },
  CENTRAL_HALL:     { x: 0.0, y: 0.0, label: 'Corredor Central', thought: 'Circulando pelo escritório 🚶' }
});

const CANONICAL_AGENT_STATIONS = {
  // War Room (Command & Planning)
  'agent-orchestrator': { x: -6.5, y: -5.5, facing: 'SE', district: 'command-center', deskLabel: 'Orchestrator Desk' },
  'agent-planner':      { x: -3.0, y: -5.5, facing: 'SW', district: 'command-center', deskLabel: 'Planner Desk' },

  // Central Open Bullpen (Engineering & Quality)
  'agent-architect':    { x: -6.5, y: 1.0,  facing: 'SE', district: 'dev-district', deskLabel: 'Architecture Station' },
  'agent-developer':    { x: -2.2, y: 1.0,  facing: 'NE', district: 'dev-district', deskLabel: 'Dev Desk 1' },
  'agent-backend':      { x: 2.2,  y: 1.0,  facing: 'NE', district: 'dev-district', deskLabel: 'Backend Desk' },
  'agent-frontend':     { x: 6.5,  y: 1.0,  facing: 'NW', district: 'creative-district', deskLabel: 'Frontend Desk' },
  
  'agent-database':     { x: -6.5, y: 4.5,  facing: 'NW', district: 'data-center', deskLabel: 'Database Desk' },
  'agent-db':           { x: -6.5, y: 4.5,  facing: 'NW', district: 'data-center', deskLabel: 'Database Desk' },
  'agent-memory':       { x: -2.2, y: 4.5,  facing: 'NW', district: 'data-center', deskLabel: 'Memory Fabric Desk' },
  'agent-security':     { x: 2.2,  y: 4.5,  facing: 'NW', district: 'data-center', deskLabel: 'Security Desk' },
  'agent-qa':           { x: 6.5,  y: 4.5,  facing: 'NE', district: 'dev-district', deskLabel: 'QA Automation Rig' },

  // Data Center Vault & Telemetry Ops
  'agent-devops':       { x: -5.0, y: 11.0, facing: 'SW', district: 'observatory', deskLabel: 'DevOps Server Terminal' },
  'agent-observability':{ x: -8.0, y: 11.0, facing: 'SE', district: 'observatory', deskLabel: 'Telemetry Ops Station' },
  'agent-obs':          { x: -8.0, y: 11.0, facing: 'SE', district: 'observatory', deskLabel: 'Telemetry Ops Station' },

  // AI & Automation Lab
  'agent-research':     { x: 3.5,  y: 11.0, facing: 'SW', district: 'ai-district', deskLabel: 'AI Model Research Desk' },
  'agent-browser':      { x: 6.5,  y: 11.0, facing: 'NE', district: 'dev-district', deskLabel: 'Browser Automation Lab' },
  'agent-github':       { x: 8.5,  y: 11.0, facing: 'SE', district: 'project-district', deskLabel: 'GitHub & VCS Station' },

  // Optional aliases
  'agent-twin':         { x: -7.2, y: -3.8, facing: 'SE', district: 'project-district', deskLabel: 'Digital Twin Station' },
  'agent-ai':           { x: 6.0,  y: -4.0, facing: 'SW', district: 'ai-district', deskLabel: 'AI Core Station' },
  'agent-knowledge':    { x: 8.2,  y: -3.2, facing: 'SW', district: 'ai-district', deskLabel: 'Knowledge Station' },
  'agent-ux':           { x: 7.8,  y: 5.5,  facing: 'NW', district: 'creative-district', deskLabel: 'UX Design Desk' },
  'agent-docs':         { x: -5.4, y: 5.8,  facing: 'NE', district: 'dev-district', deskLabel: 'Docs Station' }
};

const AVATAR_PALETTES = Object.freeze({
  skins: {
    light:      { base: '#fde2d4', shadow: '#e5b69f', tone: '#fdf0ea' },
    fair:       { base: '#fcd5b8', shadow: '#d9a785', tone: '#ffe3d0' },
    tan:        { base: '#d89b6b', shadow: '#a96a3e', tone: '#e8b288' },
    brown:      { base: '#8d5524', shadow: '#593210', tone: '#a66b37' },
    dark:       { base: '#4a2c11', shadow: '#2e1906', tone: '#633c19' },
    cyber_cyan: { base: '#38bdf8', shadow: '#0284c7', tone: '#7dd3fc' },
    neon_green: { base: '#22c55e', shadow: '#15803d', tone: '#4ade80' },
    synth_gold: { base: '#fbbf24', shadow: '#d97706', tone: '#fcd34d' }
  },
  hairColors: {
    black:  '#18181b',
    brown:  '#5c3a21',
    blonde: '#fde047',
    red:    '#dc2626',
    silver: '#cbd5e1',
    cyan:   '#06b6d4',
    purple: '#9333ea',
    pink:   '#ec4899',
    white:  '#ffffff'
  },
  hairStyles: ['spiky', 'slick', 'buzz', 'bob', 'long', 'crest'],
  outfits: ['suit', 'hoodie', 'labcoat', 'armor', 'casual', 'cyber'],
  accessories: ['none', 'visor', 'glasses', 'headphones', 'halo', 'badge'],
  badges: ['none', 'bronze', 'silver', 'gold', 'diamond', 'master']
});

class CityAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  _init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this._init();
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {}
  }

  playMessage() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  playTaskStart() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  playTaskComplete() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  playError() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(110, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  playSpawn() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }
}

function getAgentAvatarConfig(agent) {
  const isMaster = agent && (agent.id === 'Orchestrator' || String(agent.role || '').toLowerCase().includes('orchestrator') || agent.id === 'master');
  if (agent && agent.avatar && typeof agent.avatar === 'object') {
    return {
      skin: agent.avatar.skin || 'light',
      hairStyle: agent.avatar.hairStyle || 'spiky',
      hairColor: agent.avatar.hairColor || 'black',
      outfit: agent.avatar.outfit || 'suit',
      shirtColor: agent.avatar.shirtColor || agent.avatar.outfitColor || agent.color || '#3b82f6',
      pantsColor: agent.avatar.pantsColor || '#1e293b',
      shoesColor: agent.avatar.shoesColor || '#090d16',
      accessory: agent.avatar.accessory || 'none',
      badge: agent.avatar.badge || (isMaster ? 'master' : 'none'),
      outfitColor: agent.avatar.shirtColor || agent.avatar.outfitColor || agent.color || '#3b82f6'
    };
  }
  const idStr = String((agent && (agent.id || agent.name)) || 'agent');
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) hash = ((hash << 5) - hash + idStr.charCodeAt(i)) | 0;
  hash = Math.abs(hash);

  const skinKeys = Object.keys(AVATAR_PALETTES.skins);
  const hairColorKeys = Object.keys(AVATAR_PALETTES.hairColors);

  return {
    skin: isMaster ? 'synth_gold' : skinKeys[hash % skinKeys.length],
    hairStyle: isMaster ? 'crest' : AVATAR_PALETTES.hairStyles[(hash >> 2) % AVATAR_PALETTES.hairStyles.length],
    hairColor: isMaster ? 'red' : hairColorKeys[(hash >> 4) % hairColorKeys.length],
    outfit: isMaster ? 'armor' : AVATAR_PALETTES.outfits[(hash >> 6) % AVATAR_PALETTES.outfits.length],
    shirtColor: (agent && agent.color) || '#3b82f6',
    pantsColor: isMaster ? '#0f172a' : '#1e293b',
    shoesColor: '#090d16',
    accessory: isMaster ? 'halo' : AVATAR_PALETTES.accessories[(hash >> 8) % AVATAR_PALETTES.accessories.length],
    badge: isMaster ? 'master' : 'none',
    outfitColor: (agent && agent.color) || '#3b82f6'
  };
}

class PixelAvatarRenderer {
  static drawAvatar(ctx, opts) {
    if (window.FenixPixelEngine && window.FenixPixelEngine.drawPixelCharacter) {
      const profile = window.FenixPixelEngine.getProfileForAgent(opts.agent || opts.config || opts);
      window.FenixPixelEngine.drawPixelCharacter(ctx, {
        ...opts,
        profile: {
          ...profile,
          ...(opts.config || {})
        },
        role: opts.role || (opts.agent && opts.agent.role) || profile.role || 'developer'
      });
      return;
    }
    const {
      x, y, zoom = 1,
      facing = 'SE',
      frame = 0,
      state = 'idle',
      config = {},
      color = '#38bdf8',
      isMaster = false,
      time = 0
    } = opts;

    const skin = AVATAR_PALETTES.skins[config.skin] || AVATAR_PALETTES.skins.light;
    const hairColor = AVATAR_PALETTES.hairColors[config.hairColor] || config.hairColor || '#18181b';
    const hairStyle = config.hairStyle || 'spiky';
    const outfit = config.outfit || 'suit';
    const outfitColor = config.outfitColor || color || '#38bdf8';
    const accessory = config.accessory || 'none';

    ctx.save();

    let jitterX = 0, jitterY = 0;
    if (state === 'error') {
      jitterX = (Math.sin(time * 40) > 0 ? 1 : -1) * 2 * zoom;
      jitterY = (Math.cos(time * 35) > 0 ? 1 : -1) * 1.5 * zoom;
    }

    // 48-64px Character proportions (Habbo/Tibia game art standard)
    const r = Math.max(6, 8.5 * zoom);
    const bodyH = Math.max(16, 24 * zoom);
    const headR = Math.max(5, 7.5 * zoom);

    const px = x + jitterX;
    const py = y + jitterY;

    // Ground Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(px, py, r * 1.2, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Master aura
    if (isMaster) {
      const pulseRing = 1 + 0.15 * Math.sin(time * 3);
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 16 * zoom;
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + 0.3 * Math.sin(time * 2.5)})`;
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 2.6 * pulseRing, r * 1.3 * pulseRing, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Legs
    // Legs
    const isMoving = state === 'walk' || String(state || '').startsWith('walk');
    const legSwing = isMoving ? Math.sin(frame * Math.PI / 2) * 3.5 * zoom : 0;
    const pantsColor = config.pantsColor || (outfit === 'suit' ? '#0f172a' : (outfit === 'armor' ? '#1e293b' : '#1e293b'));
    const shoesColor = config.shoesColor || '#090d16';
    const effectiveOutfitColor = config.shirtColor || config.outfitColor || outfitColor || color || '#38bdf8';

    ctx.lineWidth = Math.max(2, r * 0.38);
    ctx.lineCap = 'round';

    const lOff = -r * 0.35;
    const rOff = r * 0.35;

    // Left leg
    ctx.strokeStyle = pantsColor;
    ctx.beginPath();
    ctx.moveTo(px + lOff, py - bodyH * 0.25);
    ctx.lineTo(px + lOff, py + r * 0.4 + legSwing);
    ctx.stroke();
    ctx.fillStyle = shoesColor;
    ctx.beginPath();
    ctx.arc(px + lOff, py + r * 0.45 + legSwing, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Right leg
    ctx.strokeStyle = pantsColor;
    ctx.beginPath();
    ctx.moveTo(px + rOff, py - bodyH * 0.25);
    ctx.lineTo(px + rOff, py + r * 0.4 - legSwing);
    ctx.stroke();
    ctx.fillStyle = shoesColor;
    ctx.beginPath();
    ctx.arc(px + rOff, py + r * 0.45 - legSwing, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Torso (Outfit)
    const torsoGrad = ctx.createLinearGradient(px - r, py - bodyH, px + r, py);
    if (outfit === 'labcoat') {
      torsoGrad.addColorStop(0, '#f8fafc');
      torsoGrad.addColorStop(1, '#94a3b8');
    } else if (outfit === 'suit') {
      torsoGrad.addColorStop(0, effectiveOutfitColor);
      torsoGrad.addColorStop(1, '#0f172a');
    } else if (outfit === 'hoodie') {
      torsoGrad.addColorStop(0, effectiveOutfitColor);
      torsoGrad.addColorStop(1, '#0f172a');
    } else if (outfit === 'armor') {
      torsoGrad.addColorStop(0, effectiveOutfitColor);
      torsoGrad.addColorStop(0.5, '#475569');
      torsoGrad.addColorStop(1, '#090d16');
    } else {
      torsoGrad.addColorStop(0, effectiveOutfitColor);
      torsoGrad.addColorStop(1, '#1e293b');
    }

    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * 0.5, 0, 0, Math.PI, false);
    ctx.lineTo(px - r, py - bodyH);
    ctx.ellipse(px, py - bodyH, r, r * 0.5, 0, Math.PI, 0, true);
    ctx.lineTo(px + r, py);
    ctx.fill();

    ctx.fillStyle = outfit === 'labcoat' ? '#e2e8f0' : (outfit === 'suit' ? '#334155' : effectiveOutfitColor);
    ctx.beginPath();
    ctx.ellipse(px, py - bodyH, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const isFront = facing === 'SE' || facing === 'SW';

    if (isFront) {
      if (outfit === 'suit') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(px - r * 0.35, py - bodyH);
        ctx.lineTo(px + r * 0.35, py - bodyH);
        ctx.lineTo(px, py - bodyH * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = effectiveOutfitColor || '#dc2626';
        ctx.lineWidth = 1.8 * zoom;
        ctx.beginPath();
        ctx.moveTo(px, py - bodyH * 0.85);
        ctx.lineTo(px, py - bodyH * 0.3);
        ctx.stroke();
      } else if (outfit === 'hoodie') {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.roundRect(px - r * 0.5, py - bodyH * 0.45, r, bodyH * 0.28, 2);
        ctx.fill();
      } else if (outfit === 'armor') {
        ctx.save();
        ctx.fillStyle = isMaster ? '#ef4444' : '#38bdf8';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8 * zoom;
        ctx.beginPath();
        ctx.arc(px, py - bodyH * 0.6, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Cyber Badge on Chest
      const badge = config.badge || (isMaster ? 'master' : 'none');
      if (badge && badge !== 'none') {
        const badgeColors = { bronze: '#cd7f32', silver: '#cbd5e1', gold: '#fbbf24', diamond: '#38bdf8', master: '#ef4444' };
        const bColor = badgeColors[badge] || '#fbbf24';
        ctx.save();
        ctx.fillStyle = bColor;
        ctx.shadowColor = bColor;
        ctx.shadowBlur = 6 * zoom;
        ctx.beginPath();
        ctx.arc(px - r * 0.45, py - bodyH * 0.7, 2 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Arms & Hands
    const armSwing = isMoving ? Math.sin(frame * Math.PI / 2) * 2.5 * zoom : 0;
    const isTyping = state === 'working' || state === 'coding';
    const isReading = state === 'reading';
    const typingBob = isTyping ? Math.sin(time * 12) * 2 * zoom : 0;

    // Left arm
    ctx.fillStyle = outfit === 'labcoat' ? '#f1f5f9' : effectiveOutfitColor;
    ctx.beginPath();
    ctx.ellipse(px - r * 0.8, py - bodyH * 0.65 + armSwing + typingBob, r * 0.3, r * 0.55, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(px - r * 0.8, py - bodyH * 0.2 + armSwing + typingBob, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Right arm
    ctx.fillStyle = outfit === 'labcoat' ? '#f1f5f9' : outfitColor;
    ctx.beginPath();
    ctx.ellipse(px + r * 0.8, py - bodyH * 0.65 - armSwing - typingBob, r * 0.3, r * 0.55, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(px + r * 0.8, py - bodyH * 0.2 - armSwing - typingBob, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    if (isTyping) {
      ctx.save();
      ctx.fillStyle = isMaster ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.35)';
      ctx.shadowColor = isMaster ? '#ef4444' : '#38bdf8';
      ctx.shadowBlur = 10 * zoom;
      ctx.beginPath();
      ctx.ellipse(px, py - bodyH * 0.15, r * 1.3, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Head
    const headY = py - bodyH - headR * 1.35;
    const hg = ctx.createRadialGradient(px - headR * 0.3, headY - headR * 0.3, 0, px, headY, headR);
    hg.addColorStop(0, skin.tone);
    hg.addColorStop(0.7, skin.base);
    hg.addColorStop(1, skin.shadow);

    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(px, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = skin.shadow;
    ctx.lineWidth = 0.8 * zoom;
    ctx.stroke();

    if (isFront) {
      const eyeDir = facing === 'SE' ? 1 : -1;
      if (accessory === 'visor' || isMaster) {
        ctx.save();
        ctx.fillStyle = isMaster ? '#ef4444' : '#06b6d4';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10 * zoom;
        ctx.fillRect(px - headR * 0.65, headY - headR * 0.15, headR * 1.3, headR * 0.32);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(px - headR * 0.35 + eyeDir * 0.4 * zoom, headY - headR * 0.1, headR * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + headR * 0.35 + eyeDir * 0.4 * zoom, headY - headR * 0.1, headR * 0.16, 0, Math.PI * 2);
        ctx.fill();

        if (accessory === 'glasses') {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1 * zoom;
          ctx.strokeRect(px - headR * 0.6, headY - headR * 0.25, headR * 0.5, headR * 0.35);
          ctx.strokeRect(px + headR * 0.1, headY - headR * 0.25, headR * 0.5, headR * 0.35);
          ctx.beginPath();
          ctx.moveTo(px - headR * 0.1, headY - headR * 0.1);
          ctx.lineTo(px + headR * 0.1, headY - headR * 0.1);
          ctx.stroke();
        }

        ctx.strokeStyle = skin.shadow;
        ctx.lineWidth = 1 * zoom;
        ctx.beginPath();
        ctx.arc(px, headY + headR * 0.35, headR * 0.25, 0.1, Math.PI - 0.1);
        ctx.stroke();
      }
    }

    // Hair
    ctx.fillStyle = hairColor;
    if (hairStyle === 'spiky') {
      ctx.beginPath();
      ctx.arc(px, headY - headR * 0.2, headR * 1.05, Math.PI, 0);
      ctx.lineTo(px + headR * 1.1, headY - headR * 0.8);
      ctx.lineTo(px + headR * 0.6, headY - headR * 1.4);
      ctx.lineTo(px, headY - headR * 1.6);
      ctx.lineTo(px - headR * 0.6, headY - headR * 1.4);
      ctx.lineTo(px - headR * 1.1, headY - headR * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (hairStyle === 'slick') {
      ctx.beginPath();
      ctx.ellipse(px, headY - headR * 0.35, headR * 1.05, headR * 0.85, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === 'buzz') {
      ctx.beginPath();
      ctx.arc(px, headY, headR * 1.04, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
    } else if (hairStyle === 'bob' || hairStyle === 'long') {
      ctx.beginPath();
      ctx.arc(px, headY - headR * 0.2, headR * 1.08, Math.PI, 0);
      ctx.lineTo(px + headR * 1.15, headY + headR * (hairStyle === 'long' ? 0.9 : 0.4));
      ctx.lineTo(px + headR * 0.8, headY + headR * (hairStyle === 'long' ? 0.9 : 0.4));
      ctx.lineTo(px + headR * 0.8, headY);
      ctx.lineTo(px - headR * 0.8, headY);
      ctx.lineTo(px - headR * 0.8, headY + headR * (hairStyle === 'long' ? 0.9 : 0.4));
      ctx.lineTo(px - headR * 1.15, headY + headR * (hairStyle === 'long' ? 0.9 : 0.4));
      ctx.closePath();
      ctx.fill();
    } else if (hairStyle === 'crest' || isMaster) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10 * zoom;
      ctx.beginPath();
      ctx.moveTo(px - headR * 0.4, headY - headR * 0.5);
      ctx.quadraticCurveTo(px - headR * 0.8, headY - headR * 2.0, px - headR * 0.3, headY - headR * 2.4);
      ctx.lineTo(px, headY - headR * 2.8);
      ctx.lineTo(px + headR * 0.3, headY - headR * 2.4);
      ctx.quadraticCurveTo(px + headR * 0.8, headY - headR * 2.0, px + headR * 0.4, headY - headR * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Accessories
    if (accessory === 'headphones') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.arc(px, headY, headR * 1.18, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(px - headR * 1.3, headY - headR * 0.3, headR * 0.35, headR * 0.6);
      ctx.fillRect(px + headR * 0.95, headY - headR * 0.3, headR * 0.35, headR * 0.6);
    }

    if (accessory === 'halo' || isMaster) {
      ctx.save();
      const haloColor = isMaster ? '#ef4444' : '#fbbf24';
      ctx.strokeStyle = haloColor;
      ctx.shadowColor = haloColor;
      ctx.shadowBlur = 12 * zoom;
      ctx.lineWidth = 1.8 * zoom;
      ctx.beginPath();
      ctx.ellipse(px, headY - headR * 1.6, headR * 0.9, headR * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // State indicators & animations
    if (state === 'thinking') {
      ctx.save();
      const bubbleY = headY - headR * 1.8;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.ellipse(px + 4 * zoom, bubbleY, 11 * zoom, 6.5 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const dotPhase = Math.floor((time * 4) % 3);
      for (let di = 0; di < 3; di++) {
        ctx.fillStyle = di === dotPhase ? '#38bdf8' : '#64748b';
        ctx.beginPath();
        ctx.arc(px + (di - 1) * 5.5 * zoom + 4 * zoom, bubbleY, 1.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (state === 'waiting') {
      ctx.save();
      ctx.font = `${Math.max(10, 13 * zoom)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(Math.sin(time * 3) > 0 ? '⏳' : '⌛', px, headY - headR * 1.8);
      ctx.restore();
    } else if (state === 'success') {
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 12 * zoom;
      ctx.font = `900 ${Math.max(12, 16 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('✓', px, headY - headR * 1.8);
      ctx.restore();
    } else if (state === 'communicating') {
      ctx.save();
      const commY = headY - headR * 1.6;
      for (let ri = 1; ri <= 2; ri++) {
        const rad = (ri * 5 + (time * 10) % 8) * zoom;
        const alpha = Math.max(0, 1 - rad / (18 * zoom));
        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.lineWidth = 1.5 * zoom;
        ctx.beginPath();
        ctx.arc(px, commY, rad, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
      }
      ctx.restore();
    } else if (state === 'error') {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14 * zoom;
      ctx.font = `900 ${Math.max(12, 16 * zoom)}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('!', px, headY - headR * 1.6);
      ctx.restore();
    }

    if (state === 'reading') {
      ctx.save();
      const padX = px;
      const padY = py - bodyH * 0.45;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1 * zoom;
      ctx.fillRect(padX - 6 * zoom, padY - 4 * zoom, 12 * zoom, 8 * zoom);
      ctx.strokeRect(padX - 6 * zoom, padY - 4 * zoom, 12 * zoom, 8 * zoom);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6 * zoom;
      ctx.fillRect(padX - 4.5 * zoom, padY - 2.5 * zoom, 9 * zoom, 5 * zoom);
      ctx.restore();
    }

    ctx.restore();
  }
}

class CityWorldGrid {
  constructor(districts) {
    this.districts = districts || CANONICAL_DISTRICTS;
    this.roads = this._buildRoadNetwork();
  }

  _buildRoadNetwork() {
    const roads = [];
    const keys = ['project-district', 'ai-district', 'creative-district', 'dev-district', 'data-center', 'observatory'];
    const center = this.districts['command-center'] || { x: 0, y: 0 };
    for (const key of keys) {
      const d = this.districts[key];
      if (d) roads.push([center.x, center.y, d.x, d.y]);
    }
    for (let i = 0; i < keys.length; i++) {
      const d1 = this.districts[keys[i]];
      const d2 = this.districts[keys[(i + 1) % keys.length]];
      if (d1 && d2) roads.push([d1.x, d1.y, d2.x, d2.y]);
    }
    return roads;
  }

  isWalkable(x, y) {
    for (const d of Object.values(this.districts)) {
      if (Math.abs(x - d.x) <= d.w / 2 + 0.3 && Math.abs(y - d.y) <= d.h / 2 + 0.3) {
        return true;
      }
    }
    for (const [x1, y1, x2, y2] of this.roads) {
      const dx = x2 - x1, dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      if (Math.hypot(x - projX, y - projY) <= 0.85) {
        return true;
      }
    }
    return false;
  }

  findPath(startX, startY, targetX, targetY) {
    const sX = Math.round(startX);
    const sY = Math.round(startY);
    const tX = Math.round(targetX);
    const tY = Math.round(targetY);

    if (sX === tX && sY === tY) {
      return [{ x: targetX, y: targetY }];
    }

    const key = (x, y) => `${x},${y}`;
    const openSet = [{ x: sX, y: sY, g: 0, f: Math.hypot(sX - tX, sY - tY) }];
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(key(sX, sY), 0);
    const closedSet = new Set();

    let iterations = 0;
    const maxIterations = 600;

    while (openSet.length > 0 && iterations++ < maxIterations) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const currKey = key(current.x, current.y);

      if (current.x === tX && current.y === tY) {
        const path = [{ x: targetX, y: targetY }];
        let curr = current;
        while (cameFrom.has(key(curr.x, curr.y))) {
          curr = cameFrom.get(key(curr.x, curr.y));
          path.unshift({ x: curr.x, y: curr.y });
        }
        return path;
      }

      closedSet.add(currKey);

      const neighbors = [
        [0, 1], [1, 0], [0, -1], [-1, 0],
        [1, 1], [-1, 1], [1, -1], [-1, -1]
      ];

      for (const [dx, dy] of neighbors) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (nx < -18 || nx > 18 || ny < -18 || ny > 18) continue;

        const nKey = key(nx, ny);
        if (closedSet.has(nKey)) continue;

        if (!(nx === tX && ny === tY) && !this.isWalkable(nx, ny)) {
          continue;
        }

        const stepCost = (dx !== 0 && dy !== 0) ? 1.414 : 1.0;
        const tentativeG = current.g + stepCost;

        if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
          cameFrom.set(nKey, current);
          gScore.set(nKey, tentativeG);
          const f = tentativeG + Math.hypot(nx - tX, ny - tY);
          const existing = openSet.find(n => n.x === nx && n.y === ny);
          if (existing) {
            existing.g = tentativeG;
            existing.f = f;
          } else {
            openSet.push({ x: nx, y: ny, g: tentativeG, f });
          }
        }
      }
    }

    return [{ x: targetX, y: targetY }];
  }
}

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
    this.isNight = true;

    this.state = {
      camera: { x: 0, y: -20, zoom: 1.35 },
      targetCamera: { x: 0, y: -20, zoom: 1.35 },
      isDragging: false,
      lastMouse: { x: 0, y: 0 },
      tileSize: 32,
      hoveredAgent: null,
      hoveredDistrict: null,
      followAgentId: null,
      followMissionId: null,
      cityFilter: 'ALL',
      lastTime: performance.now(),
      selectedAgent: null,
      photoMode: false
    };
    this.rotationQuarter = 0;
    try {
      const saved = JSON.parse(localStorage.getItem('fenix_city_camera') || 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && Number.isFinite(saved.zoom) && saved.zoom >= 0.4 && saved.zoom <= 2.85) {
        this.state.camera = { x: saved.x, y: saved.y, zoom: saved.zoom };
        this.state.targetCamera = { ...this.state.camera };
        this.rotationQuarter = (Number(saved.rotationQuarter) || 0) & 3;
      }
    } catch (_) {}
    window.addEventListener('pagehide', () => this.saveCamera(), { once: true });

    this.world = {
      agents: new Map(),
      missions: [],
      jobs: [],
      projects: [],
      particles: [],
      bubbles: [],
      envelopes: []
    };
    this.lastCityEvent = null;
    this.activeHandoff = null;
    this.cityConnectionStatus = window.FENIX?.live?.status || 'CONNECTING';

    this.DISTRICTS = { ...CANONICAL_DISTRICTS };
    this.grid = new CityWorldGrid(this.DISTRICTS);
    this.keysDown = new Set();
    this._contextMenuEl = null;
    this.audio = new CityAudioEngine();
    this._missionTimelineOverlayEl = null;
    this._syncInProgress = false;
    this._lastSyncTime = 0;

    // FÊNIX OS v2.3: Zero fake agents. Population strictly equals real runtime state.
    this.world.agents.clear();

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
      if (this.lastCityEvent?.type === 'agent.handoff') {
        this.activeHandoff = { event: this.lastCityEvent, expiresAt: Date.now() + 8000 };
        const p = this.lastCityEvent.payload || {};
        const from = p.fromAgentId || p.from || p.sourceAgentId;
        const to = p.toAgentId || p.to || p.targetAgentId;
        if (from && to) this.sendEnvelope(from, to, p.message || 'HANDOFF DISPATCH');
      }
    });
    window.addEventListener('fenix-city-connection', (event) => {
      this.cityConnectionStatus = event.detail?.status || 'UNKNOWN';
    });
    this.syncRealData().then(() => this._applyDeepLink()).catch(() => {});
    this.startLoop();
  }

  _initDefaultLivingAgents() {
    // Constraint 2 & 12: Zero fake agents. Population comes only from live runtime state.
    this.world.agents.clear();
  }


  _applyCityEvent(event) {
    const payload = event?.payload || {};
    const agentId = payload.agentId || payload.agent?.id || payload.actorId;
    if (!agentId) return;
    const agent = this.world.agents.get(String(agentId));
    if (!agent) {
      if (event.type === 'agent.created' || event.type === 'agent.online') this.syncRealData();
      return;
    }
    if (event.type === 'agent.offline') {
      agent.status = 'OFFLINE';
      agent.routeActive = false;
      return;
    }
    if (event.type === 'agent.online' || event.type === 'agent.status.changed') {
      if (payload.status) agent.status = String(payload.status).toUpperCase();
    }

    const et = String(event.type || '').toLowerCase();
    const toolName = String(payload.tool || payload.toolName || payload.name || '').toLowerCase();

    // Canonical district routing based on real event, tool, or domain
    let targetDistrictKey = null;
    if (et.startsWith('git.')) targetDistrictKey = 'GIT';
    else if (et.startsWith('browser.') || et.startsWith('test.') || et.includes('inspect')) targetDistrictKey = 'BROWSER_QA';
    else if (et.startsWith('memory.') || et === 'memory.read') targetDistrictKey = 'MEMORY';
    else if (et.startsWith('knowledge.')) targetDistrictKey = 'KNOWLEDGE';
    else if (et.startsWith('mcp.')) targetDistrictKey = 'MCP';
    else if (et.startsWith('database.') || et.startsWith('db.') || et.startsWith('sql.')) targetDistrictKey = 'DATABASE';
    else if (et.startsWith('security.') || et.startsWith('auth.') || et.startsWith('governance.')) targetDistrictKey = 'SECURITY';
    else if (et.startsWith('terminal.') || et.startsWith('cli.') || et.startsWith('shell.')) targetDistrictKey = 'TERMINAL';
    else if (et.startsWith('devops.') || et.startsWith('deploy.')) targetDistrictKey = 'DEVOPS';
    else if (et.startsWith('human.') || et === 'human.approval_required' || et.startsWith('approval.') || et.includes('approval_required')) targetDistrictKey = 'APPROVAL';
    else if (et.startsWith('comm.') || et.startsWith('message.') || et.startsWith('broadcast.')) targetDistrictKey = 'COMMUNICATION';
    else if (et.startsWith('data.') || et.startsWith('metric.') || et.startsWith('telemetry.')) targetDistrictKey = 'DATA';
    else if (et.startsWith('design.') || et.startsWith('ui.style')) targetDistrictKey = 'DESIGN';
    else if (et.startsWith('research.') || et.startsWith('paper.') || et.startsWith('eval.')) targetDistrictKey = 'RESEARCH';
    else if (et.startsWith('archive.') || et.startsWith('history.')) targetDistrictKey = 'ARCHIVE';
    else if (et === 'tool.started' || et === 'agent.tool.call') {
      if (toolName.includes('git')) targetDistrictKey = 'GIT';
      else if (toolName.includes('browser') || toolName.includes('test') || toolName.includes('audit')) targetDistrictKey = 'BROWSER_QA';
      else if (toolName.includes('memory')) targetDistrictKey = 'MEMORY';
      else if (toolName.includes('knowledge')) targetDistrictKey = 'KNOWLEDGE';
      else if (toolName.includes('db') || toolName.includes('sql') || toolName.includes('store')) targetDistrictKey = 'DATABASE';
      else if (toolName.includes('terminal') || toolName.includes('exec') || toolName.includes('shell')) targetDistrictKey = 'TERMINAL';
      else if (toolName.includes('mcp')) targetDistrictKey = 'MCP';
      else if (toolName.includes('deploy') || toolName.includes('docker')) targetDistrictKey = 'DEVOPS';
      else targetDistrictKey = agent.district || 'DEVELOPMENT';
    } else if (et === 'job.started' || et === 'runtime.job.started' || et === 'runtime.job.running' || et === 'mission.step.dispatched') {
      targetDistrictKey = agent.district || 'BACKEND';
    }

    const complete = ['job.completed', 'runtime.job.succeeded', 'tool.completed', 'mission.step.completed', 'agent.task.completed'].includes(event.type);
    const failed = ['job.failed', 'runtime.job.failed', 'runtime.job.dead_letter', 'agent.failed', 'agent.error'].includes(event.type);

    if (failed) {
      agent.status = 'ERROR';
      agent.ambientState = 'error';
      agent.animDuration = 4.0;
    } else if (complete) {
      agent.ambientState = 'success';
      agent.animDuration = 3.5;
    }

    if (targetDistrictKey && this.DISTRICTS[targetDistrictKey]) {
      const station = this.DISTRICTS[targetDistrictKey];
      agent.status = 'WORKING';
      agent.tx = station.x;
      agent.ty = station.y;
      agent.path = this.findPath(agent.x, agent.y, agent.tx, agent.ty);
      agent.pathIndex = 0;
      agent.routeActive = true;
    } else if (complete && agent.homeX != null) {
      agent.status = 'IDLE';
      agent.tx = agent.homeX;
      agent.ty = agent.homeY;
      agent.path = this.findPath(agent.x, agent.y, agent.tx, agent.ty);
      agent.pathIndex = 0;
      agent.routeActive = true;
    }
  }

  _hitTestDistrict(mx, my) {
    const { camera } = this.state;
    const cx = this.canvas.width / 2 + camera.x;
    const cy = this.canvas.height / 2 + camera.y;
    const zoom = camera.zoom;
    const dep = 0.22;

    for (const [key, d] of Object.entries(this.DISTRICTS)) {
      const center = this.toScreen(d.x, d.y, dep, cx, cy, zoom);
      const hw = (d.w / 2) * this.state.tileSize * zoom;
      const hh = (d.h / 2) * (this.state.tileSize * 0.5) * zoom;
      const dx = (mx - center.x) / (hw || 1);
      const dy = (my - (center.y - 12 * zoom)) / (hh + 24 * zoom || 1);
      if (dx * dx + dy * dy <= 1.15) {
        return { key, district: d };
      }
    }
    return null;
  }

  _initSimulatedAgents() {
    // Compatibility hook: old callers must not create fictional runtime state.
    this.world.agents.clear();
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    let w = (parent && parent.clientWidth > 50) ? parent.clientWidth : ((rect && rect.width > 50) ? Math.floor(rect.width) : (window.innerWidth - 240));
    let h = (parent && parent.clientHeight > 50) ? parent.clientHeight : ((rect && rect.height > 50) ? Math.floor(rect.height) : (window.innerHeight - 140));
    if (w < 200) w = 1200;
    if (h < 200) h = 700;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
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

    // Touch gestures for mobile & tablet (drag, pinch-to-zoom, tap, double-tap, long-press)
    let touchStartX = 0, touchStartY = 0;
    let initialPinchDist = 0;
    let initialPinchZoom = 1.0;
    let touchStartTime = 0;
    let longPressTimer = null;
    let lastTapTime = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
        this.state.isDragging = true;
        this.state.lastMouse = { x: t.clientX, y: t.clientY };

        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          this.state.isDragging = false;
          this._openContextMenu({
            clientX: t.clientX,
            clientY: t.clientY,
            preventDefault: () => {}
          });
        }, 600);
      } else if (e.touches.length === 2) {
        clearTimeout(longPressTimer);
        this.state.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.hypot(dx, dy);
        initialPinchZoom = this.state.targetCamera.zoom;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.state.isDragging) {
        const t = e.touches[0];
        const dx = t.clientX - this.state.lastMouse.x;
        const dy = t.clientY - this.state.lastMouse.y;
        if (Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY) > 10) {
          clearTimeout(longPressTimer);
        }
        this.state.targetCamera.x += dx;
        this.state.targetCamera.y += dy;
        this.state.lastMouse = { x: t.clientX, y: t.clientY };
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        clearTimeout(longPressTimer);
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const factor = currentDist / initialPinchDist;
        this.state.targetCamera.zoom = Math.max(0.4, Math.min(2.8, initialPinchZoom * factor));
        this._updateZoomDisplay();
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      clearTimeout(longPressTimer);
      if (this.state.isDragging && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const elapsed = Date.now() - touchStartTime;
        const distMoved = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
        if (elapsed < 350 && distMoved < 15) {
          const now = Date.now();
          if (now - lastTapTime < 350) {
            this.resetCamera();
            lastTapTime = 0;
          } else {
            lastTapTime = now;
            const rect = this.canvas.getBoundingClientRect();
            const mx = t.clientX - rect.left, my = t.clientY - rect.top;
            const agent = this._hitTestAgent(mx, my);
            if (agent) {
              this.state.selectedAgent = agent === this.state.selectedAgent ? null : agent;
              if (this.state.selectedAgent) {
                window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: this.state.selectedAgent, agentId: this.state.selectedAgent.id } }));
              }
            } else {
              const distHit = this._hitTestDistrict(mx, my);
              if (distHit) {
                window.dispatchEvent(new CustomEvent('fenix-district-selected', { detail: distHit }));
              }
            }
          }
        }
      }
      this.state.isDragging = false;
      initialPinchDist = 0;
    }, { passive: true });
    this.canvas.addEventListener('click', e => {
      this._closeContextMenu();
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      // Minimap hit test
      const mw = 110, mh = 80;
      const mmX = this.canvas.width - mw - 14, mmY = 14;
      if (mx >= mmX && mx <= mmX + mw && my >= mmY && my <= mmY + mh) {
        const scaleX = mw / 34, scaleY = mh / 30;
        const wx = (mx - mmX) / scaleX - 17;
        const wy = (my - mmY) / scaleY - 15;
        const tw = this.state.tileSize;
        const th = tw / 2;
        this.state.followAgentId = null;
        const cameraPoint = this.toScreen(wx, wy, 0, 0, 0, 1);
        this.state.targetCamera.x = -cameraPoint.x;
        this.state.targetCamera.y = -cameraPoint.y;
        return;
      }
      if (this._hitTestHandoff(mx, my)) return;
      const agent = this._hitTestAgent(mx, my);
      if (agent) {
        this.state.selectedAgent = agent;
        const tw = this.state.tileSize;
        const th = tw / 2;
        const z = 2.4;
        const rect = this.canvas.getBoundingClientRect();
        // Golden-third framing: places agent at ~38% screen width (offset -12% from center, leaving contextual space on right)
        const goldenOffsetX = Math.round(rect.width * 0.12);
        const cameraPoint = this.toScreen(agent.x, agent.y, 0, 0, 0, z);
        this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
        this.state.targetCamera.y = -Math.round(cameraPoint.y);
        this.state.targetCamera.zoom = z;
        this._updateZoomDisplay();

        const cx = rect.width / 2 + this.state.camera.x;
        const cy = rect.height / 2 + this.state.camera.y;
        const sc = this.toScreen(agent.x, agent.y, 0.22, cx, cy, z);

        window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: this.state.selectedAgent, agentId: this.state.selectedAgent.id } }));
        this.saveCamera();
        window.showView?.('agents');
        setTimeout(() => window.fenixInspectAgent?.(agent.id), 80);
        return;
      }
      const distHit = this._hitTestDistrict(mx, my);
      if (distHit) {
        if (typeof window.closeSpatialChat === 'function') window.closeSpatialChat();
        // Cutaway: toggle cutaway on clicked building entrance or activate zoom level 4
        this.state.cutawayBuilding = (this.state.cutawayBuilding === distHit.key) ? null : distHit.key;
        this.state.targetCamera.zoom = Math.max(this.state.targetCamera.zoom, 1.95);
        this._updateZoomDisplay();
        window.dispatchEvent(new CustomEvent('fenix-district-selected', { detail: distHit }));
        this.saveCamera();
        const destination = {
          'command-center': 'command', 'project-district': 'projects',
          'ai-district': 'mcp', 'creative-district': 'ide',
          'dev-district': 'ide', 'data-center': 'memory',
          'observatory': 'observability', 'browser-district': 'browser'
        }[distHit.key] || 'operations';
        window.showView?.(destination);
        return;
      }
      this.state.selectedAgent = null;
      if (typeof window.closeSpatialChat === 'function') window.closeSpatialChat();
      if (typeof window.closeSpatialDrawer === 'function') window.closeSpatialDrawer();
    });

    // WASD and Arrow key navigation
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.keysDown.add(e.code);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    // Right-click context menu
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._openContextMenu(e);
    });
    document.addEventListener('click', (e) => {
      if (this._contextMenuEl && !this._contextMenuEl.contains(e.target)) {
        this._closeContextMenu();
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
    document.getElementById('btnTogglePhotoMode')?.addEventListener('click', () => {
      this.state.photoMode = !this.state.photoMode;
      const btn = document.getElementById('btnTogglePhotoMode');
      if (btn) btn.classList.toggle('active', this.state.photoMode);
    });
    document.getElementById('btnCityFilters')?.addEventListener('click', () => this.toggleFilterMenu());
    document.getElementById('citySearchInput')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const query = String(event.currentTarget.value || '').trim().toLowerCase();
      if (!query) return;
      const agent = [...this.world.agents.values()].find((item) => `${item.id} ${item.name}`.toLowerCase().includes(query));
      if (agent) return this.focusAgent(agent.id);
      const mission = this.world.missions?.find?.((item) => `${item.id} ${item.name || item.title}`.toLowerCase().includes(query));
      if (mission) return this.focusMission(mission.id);
      const job = this.world.jobs?.find?.((item) => `${item.id} ${item.title || item.type}`.toLowerCase().includes(query));
      if (job) return this.focusJob(job.id);
      const project = this.world.projects?.find?.((item) => `${item.id} ${item.name || item.projectName}`.toLowerCase().includes(query));
      if (project) return this.focusProject(project.id || project.projectId);
      this.canvas.setAttribute('aria-label', `AI City: nenhuma entidade encontrada para ${query}`);
    });
    document.getElementById('btnFullscreenCity')?.addEventListener('click', () => {
      const container = document.getElementById('wsCityContainer') || this.canvas;
      if (!document.fullscreenElement) {
        container.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });
    document.getElementById('btnCityListView')?.addEventListener('click', () => {
      const list = document.getElementById('cityListView');
      const canvas = this.canvas;
      if (!list) return;
      const open = list.hidden;
      list.hidden = !open;
      canvas.hidden = open;
      document.getElementById('btnCityListView')?.setAttribute('aria-pressed', String(open));
      if (open) window.dispatchEvent(new CustomEvent('fenix-city-list-requested'));
    });

    document.getElementById('btnFitCity')?.addEventListener('click', () => this.fitCity());
    document.getElementById('btnCenterAgent')?.addEventListener('click', () => this.centerAgent());
    document.getElementById('btnCenterMission')?.addEventListener('click', () => this.centerMission());
    document.getElementById('btnToggleCityAudio')?.addEventListener('click', () => {
      const enabled = this.audio?.toggle();
      const btn = document.getElementById('btnToggleCityAudio');
      if (btn) {
        btn.classList.toggle('active', Boolean(enabled));
        btn.innerHTML = enabled ? '<i class="ph ph-speaker-high"></i> SOM ON' : '<i class="ph ph-speaker-slash"></i> SOM';
      }
    });
  }

  _hitTestHandoff(mx, my) {
    const handoff = this.activeHandoff;
    if (!handoff || handoff.expiresAt <= Date.now()) return false;
    const payload = handoff.event.payload || {};
    const fromId = payload.fromAgentId || payload.from || payload.sourceAgentId;
    const toId = payload.toAgentId || payload.to || payload.targetAgentId;
    const from = [...this.world.agents.values()].find((agent) => String(agent.id) === String(fromId) || String(agent.name) === String(fromId));
    const to = [...this.world.agents.values()].find((agent) => String(agent.id) === String(toId) || String(agent.name) === String(toId));
    if (!from || !to) return false;
    const rect = this.canvas.getBoundingClientRect();
    const a = this.toScreen(from.x, from.y, 0.35, rect.width / 2, rect.height / 2, this.state.camera.zoom);
    const b = this.toScreen(to.x, to.y, 0.35, rect.width / 2, rect.height / 2, this.state.camera.zoom);
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((mx - a.x) * dx + (my - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const px = a.x + t * dx, py = a.y + t * dy;
    if (Math.hypot(mx - px, my - py) > 14) return false;
    window.dispatchEvent(new CustomEvent('fenix-handoff-selected', { detail: handoff.event }));
    return true;
  }

  toggleFilterMenu() {
    const host = document.getElementById('wsCityContainer');
    if (!host) return;
    const existing = host.querySelector('.fenix-city-filter-menu');
    if (existing) { existing.remove(); return; }
    const menu = document.createElement('div');
    menu.className = 'fenix-city-filter-menu';
    menu.setAttribute('role', 'menu');
    ['ALL', 'AGENTS', 'MISSIONS', 'JOBS', 'TOOLS', 'ERRORS', 'HANDOFFS', 'MEMORY', 'SYSTEM'].forEach((filter) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = filter;
      button.setAttribute('aria-pressed', String(this.state.cityFilter === filter));
      button.addEventListener('click', () => { this.state.cityFilter = filter; menu.remove(); });
      menu.appendChild(button);
    });
    host.appendChild(menu);
  }

  _filterAllowsAgent(agent) {
    const filter = this.state.cityFilter;
    if (filter === 'ALL' || filter === 'AGENTS') return true;
    if (filter === 'ERRORS') return ['ERROR', 'FAILED', 'BLOCKED'].includes(String(agent.status || '').toUpperCase());
    if (filter === 'MISSIONS') return Boolean(agent.currentMission || agent.missionId);
    if (filter === 'JOBS') return Boolean(agent.currentJob || agent.jobId);
    if (filter === 'TOOLS') return Boolean(agent.currentTool || agent.currentJob?.tool);
    if (filter === 'MEMORY') return String(agent.district || '').toUpperCase().includes('MEMORY');
    if (filter === 'SYSTEM') return ['DEVOPS', 'MCP', 'AI_MODELS', 'CENTRAL'].includes(String(agent.district || '').toUpperCase());
    return filter === 'HANDOFFS' && String(agent.status || '').toUpperCase() === 'HANDOFF';
  }

  _updateZoomDisplay() {
    const z = this.state.targetCamera.zoom;
    let badge = 'L3 EDIFÍCIO';
    let levelStr = '1.35x';
    if (z < 0.65) { badge = 'L1 CIDADE'; levelStr = '0.45x'; }
    else if (z < 1.15) { badge = 'L2 DISTRITO'; levelStr = '0.85x'; }
    else if (z < 1.75) { badge = 'L3 EDIFÍCIO'; levelStr = '1.35x'; }
    else if (z < 2.45) { badge = 'L4 INTERIOR'; levelStr = '1.95x'; }
    else { badge = 'L5 WORKSPACE'; levelStr = '2.85x'; }

    const el = document.getElementById('cityZoomBadge');
    if (el) el.textContent = badge;
    const elLevel = document.getElementById('fenixCityZoomLevel');
    if (elLevel) elLevel.textContent = levelStr;
    const lbl = document.getElementById('lblZoomLevel');
    if (lbl) {
      lbl.textContent = `${Math.round(z * 100)}% · ${badge}`;
    }
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
      const z = 2.4;
      const rect = this.canvas.getBoundingClientRect();
      const goldenOffsetX = Math.round((rect.width ?? 1200) * 0.12);
      const cameraPoint = this.toScreen(target.x, target.y, 0, 0, 0, z);
      this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
      this.state.targetCamera.y = -Math.round(cameraPoint.y);
      this.state.targetCamera.zoom = z;
      this._updateZoomDisplay();
      window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: target, agentId: target.id } }));
      const cx = rect.width / 2 + this.state.camera.x;
      const cy = rect.height / 2 + this.state.camera.y;
      const sc = this.toScreen(target.x, target.y, 0.22, cx, cy, z);
      if (typeof window.openSpatialAgentChat === 'function') window.openSpatialAgentChat(target, sc);
      if (typeof window.openSpatialAgentDrawer === 'function') window.openSpatialAgentDrawer(target);
    }
  }

  focusMission(missionId) {
    if (!missionId) return;
    const agent = [...this.world.agents.values()].find((candidate) => {
      const mission = candidate.currentMission;
      return String(candidate.missionId || mission?.id || mission?.missionId || '') === String(missionId);
    });
    if (!agent) {
      window.dispatchEvent(new CustomEvent('fenix-mission-selected', { detail: { missionId: String(missionId) } }));
      return;
    }
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
    else if (jobId) window.dispatchEvent(new CustomEvent('fenix-job-selected', { detail: { jobId: String(jobId) } }));
  }

  focusProject(projectId) {
    if (!projectId) return;
    this.state.targetCamera = { x: 0, y: 0, zoom: 1.25 };
    this._updateZoomDisplay();
    window.dispatchEvent(new CustomEvent('fenix-project-selected', { detail: { projectId: String(projectId) } }));
  }

  followHandoff() {
    const handoff = this.activeHandoff;
    if (!handoff) return false;
    const payload = handoff.event?.payload || {};
    const fromId = payload.fromAgentId || payload.from;
    const toId = payload.toAgentId || payload.to;
    const from = [...this.world.agents.values()].find(a => String(a.id) === String(fromId) || String(a.name) === String(fromId));
    const to = [...this.world.agents.values()].find(a => String(a.id) === String(toId) || String(a.name) === String(toId));
    if (from && to) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const tw = this.state.tileSize;
      const th = this.state.tileSize / 2;
      this.state.targetCamera.x = -(midX - midY) * tw;
      this.state.targetCamera.y = -(midX + midY) * th;
      this.state.targetCamera.zoom = 1.4;
      this._updateZoomDisplay();
      return true;
    }
    return false;
  }

  focusError() {
    const errorAgent = [...this.world.agents.values()].find(a => ['ERROR', 'FAILED', 'BLOCKED'].includes(String(a.status || '').toUpperCase()));
    if (errorAgent) {
      this.focusAgent(errorAgent.id);
      return true;
    }
    const failedJob = (this.world.jobs || []).find(j => j.status === 'FAILED' || j.status === 'DEAD_LETTER');
    if (failedJob) {
      this.focusJob(failedJob.id);
      return true;
    }
    return false;
  }

  focusActiveJob(jobId) {
    if (jobId) return this.focusJob(jobId);
    const active = (this.world.jobs || []).find(j => j.status === 'RUNNING');
    if (active) return this.focusJob(active.id);
    return false;
  }

  followAgent(agentId) {
    if (!agentId) {
      const selected = this.state.selectedAgent || [...this.world.agents.values()][0];
      agentId = selected?.id;
    }
    if (!agentId) return false;
    this.focusAgent(agentId);
    this.state.followAgentId = String(agentId);
    this.state.followMissionId = null;
    const button = document.getElementById('btnFollowAgent');
    if (button) button.classList.add('active');
    const missionBtn = document.getElementById('btnFollowMission');
    if (missionBtn) missionBtn.classList.remove('active');
    return true;
  }

  followMission(missionId) {
    if (!missionId) {
      const liveMissions = window.FENIX?.live?.missions || [];
      const active = liveMissions.find(m => m.status === 'RUNNING') || liveMissions[0];
      missionId = active?.id;
    }
    if (!missionId) {
      this.state.followMissionId = null;
      const button = document.getElementById('btnFollowMission');
      if (button) button.classList.remove('active');
      this._renderMissionTimeline(null);
      return false;
    }
    this.state.followMissionId = String(missionId);
    this.state.followAgentId = null;
    this.focusMission(missionId);
    const button = document.getElementById('btnFollowMission');
    if (button) button.classList.add('active');
    const agentBtn = document.getElementById('btnFollowAgent');
    if (agentBtn) agentBtn.classList.remove('active');
    this._renderMissionTimeline(missionId);
    return true;
  }

  fitCity() {
    this.state.followAgentId = null;
    this.state.followMissionId = null;
    this._renderMissionTimeline(null);
    const cw = this.canvas.width ?? 1200;
    const ch = this.canvas.height || 800;
    const zoom = Math.max(0.45, Math.min(1.0, Math.min(cw / 2100, ch / 1100)));
    this.state.targetCamera = { x: 0, y: 0, zoom };
    this._updateZoomDisplay();
  }

  centerAgent(agentId) {
    const targetId = agentId || this.state.selectedAgent?.id || [...this.world.agents.keys()][0];
    if (targetId) this.focusAgent(targetId);
  }

  centerMission(missionId) {
    const targetId = missionId || this.state.followMissionId || (this.world.missions && this.world.missions[0]?.id);
    if (targetId) this.focusMission(targetId);
  }

  resetCamera() {
    this.state.targetCamera = { x: 0, y: 0, zoom: 1.0 };
    this.state.followAgentId = null;
    this.state.followMissionId = null;
    this._renderMissionTimeline(null);
    const btnFollowAgent = document.getElementById('btnFollowAgent');
    if (btnFollowAgent) btnFollowAgent.classList.remove('active');
    const btnFollowMission = document.getElementById('btnFollowMission');
    if (btnFollowMission) btnFollowMission.classList.remove('active');
    this._updateZoomDisplay();
  }

  spawnAnimation(agent) {
    if (!agent) return;
    this.focusAgent(agent.id);
    this.audio?.playSpawn();
    for (let i = 0; i < 36; i++) {
      const angle = (Math.PI * 2 * i) / 36;
      const speed = 1.8 + _pseudoRandom() * 2.2;
      this.world.particles.push({
        x: agent.x || 0,
        y: agent.y || 0,
        vx: Math.cos(angle) * speed * 0.04,
        vy: Math.sin(angle) * speed * 0.04,
        alpha: 1.0,
        life: 60,
        maxLife: 60,
        color: ['#00ffcc', '#8b5cf6', '#3b82f6', '#ffd700', '#f43f5e'][Math.floor(_pseudoRandom() * 5)],
        size: 3 + _pseudoRandom() * 3
      });
    }
  }

  _renderMissionTimeline(missionId) {
    if (this._missionTimelineOverlayEl) {
      this._missionTimelineOverlayEl.remove();
      this._missionTimelineOverlayEl = null;
    }
    if (!missionId) return;

    const mission = (this.world.missions || []).find(m => String(m.id || m.missionId) === String(missionId)) || {
      id: missionId,
      name: `Missão #${missionId}`,
      status: 'RUNNING',
      steps: [
        { id: '1', title: 'Análise de Requisitos e Arquitetura', status: 'COMPLETED' },
        { id: '2', title: 'Execução de Pipeline e Testes', status: 'RUNNING' },
        { id: '3', title: 'Verificação de Layout Gate & Cobertura', status: 'PENDING' },
        { id: '4', title: 'Deploy e Notificação no Hub', status: 'PENDING' }
      ]
    };

    const container = document.getElementById('wsCityContainer') || this.canvas.parentElement;
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.className = 'fenix-mission-timeline-overlay';
    overlay.id = 'cityMissionTimelineOverlay';

    const steps = mission.steps || mission.checkpoints || [
      { id: 's1', title: 'Inicialização da Missão', status: 'COMPLETED' },
      { id: 's2', title: 'Execução de Passos Autônomos', status: 'RUNNING' },
      { id: 's3', title: 'Finalização e Entrega', status: 'PENDING' }
    ];

    overlay.innerHTML = `
      <div class="fenix-mission-tl-head">
        <span class="fenix-mission-tl-title">🎯 TIMELINE: ${mission.name || mission.title || ('Missão ' + missionId)}</span>
        <button class="fenix-mission-tl-close" id="btnTlClose" title="Fechar Timeline">✕</button>
      </div>
      <div class="fenix-mission-tl-list">
        ${steps.map((s, idx) => {
          const st = String(s.status || '').toLowerCase();
          const dotClass = st.includes('comp') || st.includes('done') || st.includes('pass') ? 'done' :
                           st.includes('run') || st.includes('prog') || st.includes('work') ? 'working' :
                           st.includes('fail') || st.includes('err') ? 'error' : 'waiting';
          return `
            <div class="fenix-mission-tl-item" data-step-id="${s.id || idx}">
              <span class="fenix-mission-tl-status-dot ${dotClass}"></span>
              <span style="font-size: 11px; color: ${dotClass === 'working' ? '#38bdf8' : (dotClass === 'done' ? '#e2e8f0' : '#94a3b8')}; flex: 1;">
                ${idx + 1}. ${s.name || s.title || s.step || ('Etapa ' + (idx + 1))}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    overlay.querySelector('#btnTlClose')?.addEventListener('click', () => {
      this.state.followMissionId = null;
      const btn = document.getElementById('btnFollowMission');
      if (btn) btn.classList.remove('active');
      overlay.remove();
      this._missionTimelineOverlayEl = null;
    });

    container.style.position = 'relative';
    container.appendChild(overlay);
    this._missionTimelineOverlayEl = overlay;
  }

  toggleLiveMode(force) {
    this.isLiveMode = typeof force === 'boolean' ? force : !this.isLiveMode;
    const container = document.getElementById('wsCityContainer') || this.canvas?.parentElement;
    if (container) {
      container.classList.toggle('fenix-live-operations-mode', this.isLiveMode);
    }
    document.body.classList.toggle('fenix-live-ops-active', this.isLiveMode);

    let hud = document.getElementById('fenixLiveOperationsHud');
    if (this.isLiveMode) {
      if (!hud) {
        hud = document.createElement('div');
        hud.id = 'fenixLiveOperationsHud';
        hud.className = 'fenix-live-ops-hud';
        hud.innerHTML = `
          <div class="live-hud-pill live-pulse"><span class="live-dot"></span> LIVE OPERATIONS ACTIVE</div>
          <div class="live-hud-stats" id="liveHudStats">FÊNIX OS KERNEL ONLINE</div>
          <button class="live-hud-exit-btn" id="btnExitLiveOps" title="Sair do modo Live Operations (ESC)">✕ SAIR DO MODO LIVE</button>
        `;
        document.body.appendChild(hud);
        document.getElementById('btnExitLiveOps')?.addEventListener('click', () => this.toggleLiveMode(false));
      } else {
        hud.style.display = 'flex';
      }
    } else if (hud) {
      hud.style.display = 'none';
    }

    setTimeout(() => {
      this.resize();
    }, 60);

    window.dispatchEvent(new CustomEvent('fenix-live-mode-changed', { detail: { active: this.isLiveMode } }));
    return this.isLiveMode;
  }

  _applyDeepLink() {
    const query = new URLSearchParams(`${location.search || ''}&${location.hash.includes('?') ? location.hash.split('?')[1] : ''}`);
    const agent = query.get('agent');
    const mission = query.get('mission');
    const job = query.get('job');
    const project = query.get('project');
    if (agent) this.focusAgent(agent);
    else if (mission) this.focusMission(mission);
    else if (job) this.focusJob(job);
    else if (project) this.focusProject(project);
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
    const now = Date.now();
    if (this._syncInProgress) return;
    if (this._lastSyncTime && (now - this._lastSyncTime) < 500) return;
    this._syncInProgress = true;
    this._lastSyncTime = now;
    try {
      let apiAgents = [];
      let fetchedSuccessfully = false;
      let authoritativeAgents = false;
      try {
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch('/api/v2/living-city/agents', { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.agents)) {
            apiAgents = data.agents;
            fetchedSuccessfully = true;
            authoritativeAgents = true;
          }
        }
      } catch (e) {}

      if (!fetchedSuccessfully && Array.isArray(window.FENIX?.live?.agents)) {
        apiAgents = window.FENIX.live.agents;
        fetchedSuccessfully = true;
        authoritativeAgents = true;
      }
      if (!fetchedSuccessfully) {
        try {
          const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          const res = await fetch('/runtime/snapshot', { headers }).then(r => r.ok ? r.json() : null).catch(() => null);
          if (Array.isArray(res?.payload?.agents)) {
            apiAgents = res.payload.agents;
            fetchedSuccessfully = true;
            authoritativeAgents = true;
          }
        } catch (e) {}
      }

      // Fetch Living City State for metrics & hud
      try {
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const sres = await fetch('/api/v2/living-city/state', { headers });
        if (sres.ok) {
          const sdata = await sres.json();
          if (sdata.metrics) {
            this.cityMetrics = sdata.metrics;
            const elMem = document.getElementById('cityMemoriesCount');
            if (elMem && sdata.metrics.memoriesCount !== undefined) elMem.textContent = '🧬 MEMÓRIAS: ' + sdata.metrics.memoriesCount;
            const elProj = document.getElementById('cityProjectsCount');
            if (elProj && sdata.metrics.projectsCount !== undefined) elProj.textContent = '📁 ' + sdata.metrics.projectsCount + ' PROJETOS';
            const elMis = document.getElementById('cityMissionsCount');
            if (elMis && sdata.metrics.activeMissions !== undefined) elMis.textContent = '🎯 ' + sdata.metrics.activeMissions + ' MISSÕES';
            const elSk = document.getElementById('citySkillsCount');
            if (elSk && sdata.metrics.skillsCount !== undefined) elSk.textContent = '💡 SKILLS: ' + sdata.metrics.skillsCount;
          }
        }
      } catch (e) {}

      const next = new Map();
      for (const a of apiAgents) {
        const id = String(a.id);
        const roleKey = String(a.role || 'DEVELOPER').toUpperCase();
        const spec = AGENT_ROLES.find(r => r.role?.toUpperCase() === roleKey || r.id === id) || {
          id: id,
          name: a.name || id,
          role: a.role || 'Agent',
          color: '#3b82f6',
          emoji: '🤖',
          district: a.district || a.location || 'dev-district'
        };
        const st = CANONICAL_AGENT_STATIONS[id] || CANONICAL_AGENT_STATIONS[spec.id] || { x: 0, y: 0, facing: 'SE' };
        const homeX = st.x;
        const homeY = st.y;
        const existing = this.world.agents.get(id);
        const curX = (existing && typeof existing.x === 'number' && !isNaN(existing.x)) ? existing.x : homeX;
        const curY = (existing && typeof existing.y === 'number' && !isNaN(existing.y)) ? existing.y : homeY;

        const rawState = String(a.state || a.status || existing?.status || 'IDLE').toUpperCase();
        const isWorking = ['WORKING', 'RUNNING', 'BUSY', 'TESTING', 'CODING', 'DEPLOYING'].includes(rawState) || Boolean(a.currentJob || a.currentJobId);
        const isError = ['ERROR', 'FAILED', 'BLOCKED', 'UNHEALTHY'].includes(rawState);
        const isCelebrating = rawState === 'CELEBRATING';

        let animState = 'idle';
        if (isError) animState = 'error';
        else if (isCelebrating) animState = 'celebrate';
        else if (isWorking) animState = 'working';
        else if (existing?._moving) animState = 'walk';

        const agent = existing || {
          id,
          x: curX,
          y: curY,
          tx: curX,
          ty: curY,
          homeX,
          homeY,
          facing: st.facing || 'SE',
          routeActive: false,
          trail: [],
          walkFrame: 0,
          walkTimer: 0,
          bubbleTimer: 0,
          bubble: null
        };

        Object.assign(agent, {
          id,
          x: curX,
          y: curY,
          tx: (typeof agent.tx === 'number' && !isNaN(agent.tx)) ? agent.tx : curX,
          ty: (typeof agent.ty === 'number' && !isNaN(agent.ty)) ? agent.ty : curY,
          name: a.name || spec.name,
          displayName: a.name || spec.name,
          role: a.role || spec.role,
          color: spec.color,
          emoji: spec.emoji,
          district: normalizeDistrict(a.location || a.district || spec.district),
          homeX,
          homeY,
          status: rawState,
          state: rawState,
          animState,
          facing: agent.facing || st.facing || 'SE',
          isReal: true,
          currentGoal: a.currentGoal || (a.currentJobId ? `Job #${a.currentJobId}` : (isWorking ? 'Em execução real' : 'Pronto para novas missões')),
          episodicMemory: a.episodicMemory || [],
          personality: a.personality || '',
          intelligenceLevel: a.intelligenceLevel || 0
        });
        next.set(id, agent);
      }

      this.world.agents = next;
      if (window.FENIX?.live) window.FENIX.live.agents = apiAgents;

      // Update HUD online/working/errors counters
      const registeredCount = this.world.agents.size;
      const workingCount = [...this.world.agents.values()].filter(a => ['WORKING', 'RUNNING', 'CODING', 'TESTING', 'DEPLOYING'].includes(a.status)).length;
      const errorCount = [...this.world.agents.values()].filter(a => ['ERROR', 'FAILED', 'BLOCKED'].includes(a.status)).length;

      const elOnline = document.getElementById('cityOnlineCount');
      if (elOnline) elOnline.textContent = registeredCount + ' REGISTRADOS';
      const elWorking = document.getElementById('cityWorkingCount');
      if (elWorking) elWorking.textContent = '⚡ ' + workingCount + ' EM OPERAÇÃO';
      const elErrors = document.getElementById('cityErrorsCount');
      if (elErrors) elErrors.textContent = '🛡️ ' + errorCount + ' ERROS';
      const elHealth = document.getElementById('cityHealthBadge');
      if (elHealth) {
        if (errorCount > 0) {
          elHealth.textContent = '⚠️ ALERTA';
          elHealth.style.color = '#ef4444';
          elHealth.style.background = 'rgba(239,68,68,0.15)';
          elHealth.style.borderColor = 'rgba(239,68,68,0.4)';
        } else {
          elHealth.textContent = '● SAUDÁVEL';
          elHealth.style.color = '#10b981';
          elHealth.style.background = 'rgba(16,185,129,0.15)';
          elHealth.style.borderColor = 'rgba(16,185,129,0.4)';
        }
      }
    } catch (e) {
      console.error('syncRealData error:', e);
    } finally {
      this._syncInProgress = false;
    }
  }

  

  toScreen(x, y, z, cx, cy, zoom) {
    const rotated = this.rotatePoint(x, y);
    const tw = this.state.tileSize * zoom;
    const th = (this.state.tileSize / 2) * zoom;
    return { x: cx + (rotated.x - rotated.y) * tw, y: cy + (rotated.x + rotated.y) * th - z * tw };
  }

  rotatePoint(x, y) {
    switch (this.rotationQuarter) {
      case 1: return { x: -y, y: x };
      case 2: return { x: -x, y: -y };
      case 3: return { x: y, y: -x };
      default: return { x, y };
    }
  }

  saveCamera() {
    try { localStorage.setItem('fenix_city_camera', JSON.stringify({ ...this.state.targetCamera, rotationQuarter: this.rotationQuarter })); } catch (_) {}
  }

  rotateCamera() {
    this.rotationQuarter = (this.rotationQuarter + 1) & 3;
    this.saveCamera();
    const button = document.getElementById('btnRotateCity');
    if (button) button.setAttribute('aria-label', `Girar cidade · orientação ${this.rotationQuarter + 1} de 4`);
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
    // WASD and Arrow key smooth panning
    if (this.keysDown && this.keysDown.size > 0) {
      const panSpeed = (520 / Math.max(0.4, this.state.camera.zoom)) * delta;
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp'))    this.state.targetCamera.y += panSpeed;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown'))  this.state.targetCamera.y -= panSpeed;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft'))  this.state.targetCamera.x += panSpeed;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) this.state.targetCamera.x -= panSpeed;
    }

    if (this.cameraMode === 'CINEMATIC') {
      const angle = this.time * 0.18;
      const dist = 140;
      this.state.targetCamera.x = Math.cos(angle) * dist;
      this.state.targetCamera.y = Math.sin(angle) * (dist * 0.5);
      this.state.targetCamera.zoom = 1.25;
    }
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
      const cameraPoint = this.toScreen(center.x, center.y, 0, 0, 0, 1);
      this.state.targetCamera.x = -cameraPoint.x;
      this.state.targetCamera.y = -cameraPoint.y;
      this.state.targetCamera.zoom = Math.max(this.state.targetCamera.zoom, 1.2);
    }
    if (followed) {
      const tw = this.state.tileSize;
      const th = this.state.tileSize / 2;
      const z = Math.max(this.state.targetCamera.zoom, 1.35);
      const rect = this.canvas.getBoundingClientRect();
      const goldenOffsetX = Math.round(rect.width * 0.12);
      const cameraPoint = this.toScreen(followed.x, followed.y, 0, 0, 0, z);
      this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
      this.state.targetCamera.y = -Math.round(cameraPoint.y);
      this.state.targetCamera.zoom = z;
    }
    // Smooth camera
    const lerp = (a, b, t) => a + (b - a) * t;
    const s = 1 - Math.pow(0.01, delta * 5);
    this.state.camera.x = lerp(this.state.camera.x, this.state.targetCamera.x, s);
    this.state.camera.y = lerp(this.state.camera.y, this.state.targetCamera.y, s);
    this.state.camera.zoom = lerp(this.state.camera.zoom, this.state.targetCamera.zoom, s);

    // Contextual Spatial Chat anchoring beside character
    if (this.state.selectedAgent) {
      const chatEl = document.getElementById('fenixSpatialAgentChat');
      if (chatEl && chatEl.style.display !== 'none') {
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.width / 2 + this.state.camera.x;
        const cy = rect.height / 2 + this.state.camera.y;
        const sc = this.toScreen(this.state.selectedAgent.x, this.state.selectedAgent.y, 0.22, cx, cy, this.state.camera.zoom);
        const left = Math.max(10, Math.min(rect.width - 340, sc.x + 35));
        const top = Math.max(10, Math.min(rect.height - 240, sc.y - 140));
        chatEl.style.left = left + 'px';
        chatEl.style.top = top + 'px';
      }
    }

    for (const agent of this.world.agents.values()) {
      this._updateAgent(agent, delta);
    }

    // Update envelopes
    if (this.world.envelopes && this.world.envelopes.length > 0) {
      this.world.envelopes = this.world.envelopes.filter(env => {
        env.progress += delta * (env.speed || 0.85);
        if (_pseudoRandom() < 0.35) {
          const arc = Math.sin(Math.min(1, env.progress) * Math.PI) * 1.5;
          const px = env.fromX + (env.toX - env.fromX) * env.progress;
          const py = env.fromY + (env.toY - env.fromY) * env.progress;
          this.world.particles.push({
            x: px, y: py, z: 0.3 + arc,
            vx: (_pseudoRandom() - 0.5) * 0.15, vy: (_pseudoRandom() - 0.5) * 0.15, vz: 0.05,
            life: 0.45, decay: 2.2, size: 2.2, color: env.color || '#06b6d4'
          });
        }
        if (env.progress >= 1) {
          for (let i = 0; i < 8; i++) {
            this.world.particles.push({
              x: env.toX, y: env.toY, z: 0.35,
              vx: (_pseudoRandom() - 0.5) * 1.2, vy: (_pseudoRandom() - 0.5) * 1.2, vz: _pseudoRandom() * 0.8,
              life: 0.7, decay: 1.6, size: 2.8, color: env.color || '#06b6d4'
            });
          }
          if (env.toAgentId) {
            const targetAgent = this.world.agents.get(env.toAgentId);
            if (targetAgent) {
              targetAgent.bubble = { text: env.text || 'Mensagem recebida', life: 3.5 };
            }
          }
          return false;
        }
        return true;
      });
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
    const isWorking = ['WORKING', 'RUNNING', 'BUSY', 'TESTING'].includes(String(agent.status || '').toUpperCase()) || agent.stationState === 'working' || Boolean(agent.currentJob || agent.currentJobId);
    const isError = ['ERROR', 'FAILED', 'BLOCKED'].includes(String(agent.status || '').toUpperCase());

    if (agent.bubble && agent.bubble.life > 0) {
      agent.bubble.life -= delta;
    }
    if (agent.thoughtBubble && agent.thoughtBubble.life > 0) {
      agent.thoughtBubble.life -= delta;
    }

    // ── Munder Difflin Autonomous Living Simulation ──
    if (isWorking) {
      // If working, ensure heading back to designated desk
      const distToHome = Math.hypot(agent.x - agent.homeX, agent.y - agent.homeY);
      if (distToHome > 0.2 && !agent.routeActive) {
        agent.tx = agent.homeX;
        agent.ty = agent.homeY;
        agent.routeActive = true;
      }
      if (!agent._moving && (!agent.thoughtBubble || agent.thoughtBubble.life <= 0)) {
        const job = agent.currentJob || agent.currentJobId;
        const taskDesc = typeof job === 'string' ? job : (job?.name || job?.type || agent.role || 'Compilando e executando');
        agent.thoughtBubble = { text: '⚡ ' + taskDesc, life: 5.5, isWork: true };
      }
    } else if (!isError) {
      // Idle agent autonomous routine (coffee, water cooler, whiteboard, war room)
      agent.routineTimer = (agent.routineTimer || 0) + delta;
      const seed = (agent.id.charCodeAt(agent.id.length - 1) || 0) + (agent.id.charCodeAt(0) || 0);
      const interval = 16 + (seed % 14);
      if (agent.routineTimer > interval && !agent._moving && !agent.routeActive) {
        agent.routineTimer = 0;
        const routineChoices = [
          MUNDER_DIFFLIN_WAYPOINTS.COFFEE_BAR,
          MUNDER_DIFFLIN_WAYPOINTS.WATER_COOLER,
          MUNDER_DIFFLIN_WAYPOINTS.WHITEBOARD,
          MUNDER_DIFFLIN_WAYPOINTS.CONFERENCE_TABLE,
          { x: agent.homeX, y: agent.homeY, thought: 'Standby na estação de trabalho 💻' }
        ];
        const choice = routineChoices[Math.floor(_pseudoRandom() * routineChoices.length)];
        agent.tx = choice.x;
        agent.ty = choice.y;
        agent.routeActive = true;
        agent.thoughtBubble = { text: choice.thought, life: 4.5, isWork: false };
      }
    }

    // Walk animation
    agent.walkTimer = (agent.walkTimer || 0) + delta;
    if (agent.walkTimer > 0.14) {
      agent.walkFrame = ((agent.walkFrame || 0) + 1) % 4;
      agent.walkTimer = 0;
    }

    // Path waypoint traversal
    let targetX = agent.tx;
    let targetY = agent.ty;

    if (agent.path && agent.path.length > 0 && (agent.pathIndex || 0) < agent.path.length) {
      const wp = agent.path[agent.pathIndex];
      targetX = wp.x;
      targetY = wp.y;
    }

    const dx = targetX - agent.x;
    const dy = targetY - agent.y;
    const dist = Math.hypot(dx, dy);
    const speed = isWorking ? 1.4 : 2.0;
    agent._moving = dist > 0.08;

    if (agent._moving) {
      const move = Math.min(speed * delta, dist);
      agent.x += (dx / dist) * move;
      agent.y += (dy / dist) * move;
      if (Math.abs(dx) > Math.abs(dy)) {
        agent.facing = dx > 0 ? 'SE' : 'NW';
      } else {
        agent.facing = dy > 0 ? 'SW' : 'NE';
      }
      if (dist <= 0.12 && agent.path && agent.pathIndex < agent.path.length - 1) {
        agent.pathIndex++;
      }
      if (!agent.trail) agent.trail = [];
      agent.trail.push({ x: agent.x, y: agent.y, life: 0.6 });
      if (agent.trail.length > 20) agent.trail.shift();
    } else {
      if (agent.path && agent.pathIndex >= agent.path.length - 1) {
        agent.routeActive = false;
        // After arrival, if idle, randomly pause to think or communicate
        if (!isWorking && !isError && !agent.animDuration) {
          const roll = _pseudoRandom();
          if (roll < 0.25) {
            agent.ambientState = 'think';
            agent.animDuration = 3.5 + _pseudoRandom() * 2.5;
          } else if (roll < 0.50) {
            agent.ambientState = 'communicate';
            agent.animDuration = 3.0 + _pseudoRandom() * 2.0;
          } else {
            agent.ambientState = 'idle';
          }
        }
      }
      if (!agent.facing) agent.facing = 'SE';
    }

    if (agent.animDuration > 0) {
      agent.animDuration -= delta;
      if (agent.animDuration <= 0) {
        agent.ambientState = null;
      }
    }

    agent.animState = isError ? 'error' : (agent.ambientState === 'success' ? 'success' : (agent.ambientState === 'error' ? 'error' : (isWorking && !agent._moving ? 'working' : (agent._moving ? 'walk' : (agent.ambientState || 'idle')))));

    // Trail decay
    if (agent.trail && Array.isArray(agent.trail)) {
      for (const t of agent.trail) t.life -= delta * 2.5;
      agent.trail = agent.trail.filter(t => t.life > 0);
    } else {
      agent.trail = [];
    }
  }

  draw() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const { camera } = this.state;
    const zoom = camera.zoom;
    const cx = width / 2 + camera.x;
    const cy = height / 2 + camera.y;

    ctx.imageSmoothingEnabled = false;

    // Atmospheric night backdrop
    this._drawBackdrop(ctx, width, height);

    // 2.5D Living Pixel Game World
    if (window.FenixPixelEngine && window.FenixPixelEngine.Cache.ready) {
      this._drawLivingPixelWorld(ctx, cx, cy, zoom, width, height);
    } else {
      this._drawGrid(ctx, cx, cy, zoom);
      this._drawRoads(ctx, cx, cy, zoom);
      const districts = Object.values(this.DISTRICTS).sort((a,b) => (a.x+a.y)-(b.x+b.y));
      for (const d of districts) this._drawDistrict(ctx, d, cx, cy, zoom);
      const sorted = [...this.world.agents.values()].sort((a,b) => (a.x+a.y)-(b.x+b.y));
      for (const agent of sorted) if (this._filterAllowsAgent(agent)) this._drawAgent(ctx, agent, cx, cy, zoom);
    }

    // Dynamic handoff dispatch & flying message envelopes
    this._drawHandoff(ctx, cx, cy, zoom);
    this._drawEnvelopes(ctx, cx, cy, zoom);

    // HUD and Overlays (hidden in Photo Mode for pure Art Director Gate visual)
    if (!this.state.photoMode) {
      this._drawCityEventHud(ctx, width);
      this._drawHUD(ctx, width, height);
      this._drawMinimap(ctx, width, height);
    }
  }

  _drawLivingPixelWorld(ctx, cx, cy, zoom, width, height) {
    const P = window.FenixPixelEngine;
    if (!P || !P.Cache.ready) return;
    const Cache = P.Cache;
    ctx.imageSmoothingEnabled = false;

    // ── 1. TERRAIN PASS ──────────────────────────────────────────
    // Continuous 2.5D isometric tiles drawn in topological diagonal order
    // Expansive 29x29 metropolis encompassing all 7 canonical districts
    const minG = -14, maxG = 14;
    for (let sum = 2 * minG; sum <= 2 * maxG; sum++) {
      for (let gx = minG; gx <= maxG; gx++) {
        const gy = sum - gx;
        if (gy < minG || gy > maxG) continue;

        let tile = Cache.tiles.grass;

        // Central Avenues & District Arterial Roads
        const isEastWestAvenue = (gy === 0 || gy === 1);
        const isNorthSouthBlvd = (gx === 0 || gx === 1);
        const isNorthArterial  = (gx === 0 || gx === 1) && gy <= 0 && gy >= -13; // to Observatory
        const isSouthArterial  = (gx === 0 || gx === 1) && gy >= 0 && gy <= 13;  // to Data Center
        const isWestDevSpur    = (gy === 5 || gy === 6) && gx <= 0 && gx >= -11;  // to Dev District
        const isWestProjSpur   = (gy === -5 || gy === -4) && gx <= 0 && gx >= -11; // to Project Forge
        const isEastAISpur     = (gy === -5 || gy === -4) && gx >= 0 && gx <= 11;  // to AI Nexus
        const isEastCreatSpur  = (gy === 5 || gy === 6) && gx >= 0 && gx <= 11;  // to Creative Studio

        const isRoad = isEastWestAvenue || isNorthSouthBlvd || isNorthArterial || isSouthArterial ||
                       isWestDevSpur || isWestProjSpur || isEastAISpur || isEastCreatSpur;

        // Intersections
        const isIntersection = (isEastWestAvenue && isNorthSouthBlvd) ||
                               ((gy === 5 || gy === 6 || gy === -5 || gy === -4) && (gx === 0 || gx === 1));

        // Crosswalks
        const isCrosswalk = (!isIntersection) && isRoad && (
          ((gx === -2 || gx === 3) && isEastWestAvenue) ||
          ((gy === -2 || gy === 3) && isNorthSouthBlvd) ||
          (gx === -8 && (gy === 5 || gy === -5)) ||
          (gx === 8 && (gy === 5 || gy === -5))
        );

        // Sidewalks with 3D curbs lining avenues
        const isSidewalk = (!isRoad) && (
          ((gy === -1 || gy === 2) && gx >= -12 && gx <= 12) ||
          ((gx === -1 || gx === 2) && gy >= -13 && gy <= 13)
        );

        // Distinct District Plazas
        const isPlazaCommand  = (gx >= -3 && gx <= 3 && gy >= -3 && gy <= -1);
        const isPlazaProject  = (gx >= -11 && gx <= -5 && gy >= -7 && gy <= -3);
        const isPlazaAI       = (gx >= 5 && gx <= 11 && gy >= -7 && gy <= -3);
        const isPlazaDev      = (gx >= -11 && gx <= -5 && gy >= 3 && gy <= 7);
        const isPlazaCreative = (gx >= 5 && gx <= 11 && gy >= 3 && gy <= 7);
        const isPlazaData     = (gx >= -3 && gx <= 3 && gy >= 8 && gy <= 13);
        const isPlazaObs      = (gx >= -3 && gx <= 3 && gy >= -13 && gy <= -8);

        if (isCrosswalk) {
          tile = Cache.tiles.crosswalk;
        } else if (isIntersection) {
          tile = Cache.tiles.asphalt;
        } else if (isEastWestAvenue || isWestDevSpur || isWestProjSpur || isEastAISpur || isEastCreatSpur) {
          tile = ((gy % 2) === 0) ? Cache.tiles.asphaltDashed1 : Cache.tiles.asphalt;
        } else if (isNorthSouthBlvd || isNorthArterial || isSouthArterial) {
          tile = ((gx % 2) === 0) ? Cache.tiles.asphaltDashed2 : Cache.tiles.asphalt;
        } else if (isSidewalk) {
          tile = Cache.tiles.sidewalk;
        } else if (isPlazaCommand) {
          tile = Cache.tiles.plaza;
        } else if (isPlazaProject) {
          tile = Cache.tiles.plazaProject || Cache.tiles.plaza;
        } else if (isPlazaAI) {
          tile = Cache.tiles.plazaAI || Cache.tiles.plaza;
        } else if (isPlazaDev) {
          tile = Cache.tiles.plaza;
        } else if (isPlazaCreative) {
          tile = Cache.tiles.plazaCreative || Cache.tiles.plaza;
        } else if (isPlazaData) {
          tile = Cache.tiles.plazaData || Cache.tiles.plaza;
        } else if (isPlazaObs) {
          tile = Cache.tiles.plazaObs || Cache.tiles.plaza;
        }

        const sc = this.toScreen(gx, gy, 0, cx, cy, zoom);
        const px = Math.round(sc.x - 32 * zoom);
        const py = Math.round(sc.y - 16 * zoom);
        const pw = Math.round(64 * zoom);
        const ph = Math.round(32 * zoom);
        ctx.drawImage(tile, px, py, pw, ph);
      }
    }

    // ── 2. GROUND LIGHT POOLS PASS ───────────────────────────────
    const lampPositions = [
      [-1, -1], [2, -1], [-1, 2], [2, 2],
      [-5, -1], [5, -1], [-1, 5], [2, 5],
      [-8, -3], [8, -3], [-8, 4], [8, 4],
      [0, -7], [0, 7], [0, -12], [0, 12]
    ];
    for (const [lx, ly] of lampPositions) {
      const sc = this.toScreen(lx, ly, 0, cx, cy, zoom);
      ctx.drawImage(
        Cache.props.lampLightPool,
        Math.round(sc.x - 64 * zoom),
        Math.round(sc.y - 32 * zoom),
        Math.round(128 * zoom),
        Math.round(64 * zoom)
      );
    }

    // ── 3. UNIFIED 2.5D DEPTH-SORTED SCENE GRAPH ──────────────────
    const scene = [];

    // Helper to add landmark building with cutaway support
    const addBuilding = (canvas, bx, by, sortOffset, w, h, bldKey) => {
      if (!canvas) return;
      const base = this.toScreen(bx, by, 0, cx, cy, zoom);
      // Cutaway triggers at Zoom Level 4 (zoom >= 1.75) OR if this building/district is selected
      const isCutaway = (zoom >= 1.75) || (this.state.cutawayBuilding && (this.state.cutawayBuilding === bldKey || this.state.cutawayBuilding === 'all'));

      // If cutaway, render interior room floor & lighting behind the faded facade
      if (isCutaway) {
        scene.push({
          sortY: base.y - 12 * zoom,
          draw: () => {
            this._drawInteriorFloor(ctx, bldKey, bx, by, cx, cy, zoom);
          }
        });
      }

      scene.push({
        sortY: base.y + sortOffset * zoom,
        draw: () => {
          if (isCutaway) {
            ctx.save();
            ctx.globalAlpha = Math.max(0.14, 1 - (zoom - 1.5) * 1.6);
          }
          ctx.drawImage(
            canvas,
            Math.round(base.x - (w / 2) * zoom),
            Math.round(base.y - (h - 25) * zoom),
            Math.round(w * zoom),
            Math.round(h * zoom)
          );
          if (isCutaway) ctx.restore();
        }
      });
    };

    // A. 7 Canonical District Landmarks
    // 1. Command Center: FÊNIX HQ Spire
    addBuilding(Cache.buildings.fenixHQ, 0, -3.5, 0, 160, 175, 'command-center');

    // 2. Project District: CODE FORGE Deployment Bay
    addBuilding(Cache.buildings.projectForge, -8, -4.5, 0, 150, 155, 'project-district');

    // 3. AI District: AI NEXUS Neural Core
    addBuilding(Cache.buildings.aiNexus, 8, -4.5, 0, 150, 170, 'ai-district');

    // 4. Dev District: DEV LOFT Red-Brick Workshop
    addBuilding(Cache.buildings.devLoft, -8, 5.5, 0, 150, 155, 'dev-district');

    // 5. Dev District / Science Lab: RESEARCH & QA LAB
    addBuilding(Cache.buildings.researchLab, -4.5, 4.5, 0, 150, 155, 'dev-district');

    // 6. Creative District: CREATIVE STUDIO Glass Pavilion
    addBuilding(Cache.buildings.creativeStudio, 8, 5.5, 0, 150, 155, 'creative-district');

    // 7. Data Center: DATA CENTER Vault Silos
    addBuilding(Cache.buildings.dataCenter, 0, 10.5, 0, 160, 165, 'data-center');

    // 8. Observatory: OBSERVATORY Dome & Telescope
    addBuilding(Cache.buildings.observatory, 0, -10.5, 0, 150, 165, 'observatory');

    // B. Munder Difflin Living Office — Physical Infrastructure & Desks
    // 1. All 15 Canonical Specialist Desks (Central Bullpen, AI Lab, Data Center)
    const placedStations = new Set();
    for (const [agentId, st] of Object.entries(CANONICAL_AGENT_STATIONS)) {
      const posKey = `${st.x},${st.y}`;
      if (placedStations.has(posKey)) continue;
      placedStations.add(posKey);

      const ws = this.toScreen(st.x, st.y, 0, cx, cy, zoom);
      scene.push({
        sortY: ws.y - 2 * zoom, // Placed at workstation depth
        draw: () => {
          if (Cache.workstations && Cache.workstations.devDesk) {
            ctx.drawImage(
              Cache.workstations.devDesk,
              Math.round(ws.x - 32 * zoom),
              Math.round(ws.y - 36 * zoom),
              Math.round(64 * zoom),
              Math.round(46 * zoom)
            );
          }
        }
      });
    }

    // 2. Executive War Room: Conference Table & Architecture Whiteboard
    if (Cache.workstations && Cache.workstations.conferenceTable) {
      const ct = this.toScreen(-5.0, -6.8, 0, cx, cy, zoom);
      scene.push({
        sortY: ct.y + 2 * zoom,
        draw: () => {
          ctx.drawImage(
            Cache.workstations.conferenceTable,
            Math.round(ct.x - 48 * zoom),
            Math.round(ct.y - 32 * zoom),
            Math.round(96 * zoom),
            Math.round(64 * zoom)
          );
        }
      });
    }

    if (Cache.workstations && Cache.workstations.whiteboard) {
      const wb = this.toScreen(-5.0, -9.0, 0, cx, cy, zoom);
      scene.push({
        sortY: wb.y + 1 * zoom,
        draw: () => {
          ctx.drawImage(
            Cache.workstations.whiteboard,
            Math.round(wb.x - 32 * zoom),
            Math.round(wb.y - 48 * zoom),
            Math.round(64 * zoom),
            Math.round(56 * zoom)
          );
        }
      });
    }

    // 3. Dunder Breakroom & Lounge: Coffee Espresso Bar & Water Cooler
    if (Cache.workstations && Cache.workstations.coffeeBar) {
      const cb = this.toScreen(3.5, -8.0, 0, cx, cy, zoom);
      scene.push({
        sortY: cb.y + 2 * zoom,
        draw: () => {
          ctx.drawImage(
            Cache.workstations.coffeeBar,
            Math.round(cb.x - 26 * zoom),
            Math.round(cb.y - 44 * zoom),
            Math.round(52 * zoom),
            Math.round(52 * zoom)
          );
        }
      });
    }

    if (Cache.workstations && Cache.workstations.waterCooler) {
      const wc = this.toScreen(6.5, -8.0, 0, cx, cy, zoom);
      scene.push({
        sortY: wc.y + 2 * zoom,
        draw: () => {
          ctx.drawImage(
            Cache.workstations.waterCooler,
            Math.round(wc.x - 16 * zoom),
            Math.round(wc.y - 44 * zoom),
            Math.round(32 * zoom),
            Math.round(50 * zoom)
          );
        }
      });
    }

    // 4. Datacenter Server Vault: Triple 42U Server Racks
    if (Cache.workstations && Cache.workstations.serverRack) {
      for (const rx of [-6.0, -4.0, -2.0]) {
        const sr = this.toScreen(rx, 9.5, 0, cx, cy, zoom);
        scene.push({
          sortY: sr.y + 2 * zoom,
          draw: () => {
            ctx.drawImage(
              Cache.workstations.serverRack,
              Math.round(sr.x - 20 * zoom),
              Math.round(sr.y - 60 * zoom),
              Math.round(40 * zoom),
              Math.round(68 * zoom)
            );
          }
        });
      }
    }

    // C. Streetlamps
    for (const [lx, ly] of lampPositions) {
      const sc = this.toScreen(lx, ly, 0, cx, cy, zoom);
      scene.push({
        sortY: sc.y,
        draw: () => {
          ctx.drawImage(
            Cache.props.streetlamp,
            Math.round(sc.x - 16 * zoom),
            Math.round(sc.y - 54 * zoom),
            Math.round(32 * zoom),
            Math.round(64 * zoom)
          );
        }
      });
    }

    // D. Trees
    const treePositions = [
      [-4, -4], [-7, -3], [-3, 4], [4, 5], [7, -2], [8, 3], [-7, 6]
    ];
    for (const [tx, ty] of treePositions) {
      const sc = this.toScreen(tx, ty, 0, cx, cy, zoom);
      scene.push({
        sortY: sc.y,
        draw: () => {
          ctx.drawImage(
            Cache.props.tree,
            Math.round(sc.x - 32 * zoom),
            Math.round(sc.y - 70 * zoom),
            Math.round(64 * zoom),
            Math.round(80 * zoom)
          );
        }
      });
    }

    // E. Planters
    const planterPositions = [
      [1, -2.5], [-1, -2.5], [3.5, -1.8], [-4.5, 2.2]
    ];
    for (const [px, py] of planterPositions) {
      const sc = this.toScreen(px, py, 0, cx, cy, zoom);
      scene.push({
        sortY: sc.y,
        draw: () => {
          ctx.drawImage(
            Cache.props.planter,
            Math.round(sc.x - 14 * zoom),
            Math.round(sc.y - 32 * zoom),
            Math.round(28 * zoom),
            Math.round(38 * zoom)
          );
        }
      });
    }

    // F. Benches
    const benchPositions = [
      [3, -1], [-3, 2.2]
    ];
    for (const [bx, by] of benchPositions) {
      const sc = this.toScreen(bx, by, 0, cx, cy, zoom);
      scene.push({
        sortY: sc.y,
        draw: () => {
          ctx.drawImage(
            Cache.props.bench,
            Math.round(sc.x - 18 * zoom),
            Math.round(sc.y - 18 * zoom),
            Math.round(36 * zoom),
            Math.round(24 * zoom)
          );
        }
      });
    }

    // G. Pure 2.5D Living Game World (No abstract 3D wireframe cubes or polygons)

    // H. Characters (Agents)
    for (const agent of this.world.agents.values()) {
      if (!this._filterAllowsAgent(agent)) continue;
      const ax = (typeof agent.x === 'number' && !isNaN(agent.x)) ? agent.x : (typeof agent.homeX === 'number' && !isNaN(agent.homeX) ? agent.homeX : 0);
      const ay = (typeof agent.y === 'number' && !isNaN(agent.y)) ? agent.y : (typeof agent.homeY === 'number' && !isNaN(agent.homeY) ? agent.homeY : 0);
      const sc = this.toScreen(ax, ay, 0, cx, cy, zoom);
      scene.push({
        sortY: sc.y,
        draw: () => {
          this._drawAgent(ctx, agent, cx, cy, zoom);
        }
      });
    }

    // Strict Y-sorting (Painter's Algorithm for true 2.5D depth)
    scene.sort((a, b) => a.sortY - b.sortY);

    // Draw all depth-sorted entities
    for (const item of scene) {
      item.draw();
    }
  }

  _drawInteriorFloor(ctx, bldKey, bx, by, cx, cy, zoom) {
    const tw = this.state.tileSize;
    const th = tw / 2;
    const themeColors = {
      'command-center':  { floor: '#1e293b', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.28)', label: 'WAR ROOM & GOVERNANCE' },
      'project-district': { floor: '#0f172a', border: '#06b6d4', glow: 'rgba(6, 182, 212, 0.28)', label: 'CODE FORGE & DEPLOY BAY' },
      'ai-district':      { floor: '#1a102f', border: '#a855f7', glow: 'rgba(168, 85, 247, 0.28)', label: 'NEURAL NEXUS LAB' },
      'dev-district':     { floor: '#13231b', border: '#10b981', glow: 'rgba(16, 185, 129, 0.28)', label: 'DEV LOFT & WORKSHOP' },
      'creative-district':{ floor: '#261224', border: '#ec4899', glow: 'rgba(236, 72, 153, 0.28)', label: 'DESIGN STUDIO & UX LAB' },
      'data-center':      { floor: '#0c1e33', border: '#3b82f6', glow: 'rgba(59, 130, 246, 0.28)', label: 'DATA VAULT & SILOS' },
      'observatory':      { floor: '#181836', border: '#6366f1', glow: 'rgba(99, 102, 241, 0.28)', label: 'OBSERVATORY & TELEMETRY' }
    };
    const theme = themeColors[bldKey] || themeColors['command-center'];

    ctx.save();
    // 3x3 interior room slab beneath building facade
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const sc = this.toScreen(bx + dx, by + dy, 0, cx, cy, zoom);
        ctx.fillStyle = theme.floor;
        ctx.beginPath();
        ctx.moveTo(sc.x, sc.y - th * zoom);
        ctx.lineTo(sc.x + tw * zoom, sc.y);
        ctx.lineTo(sc.x, sc.y + th * zoom);
        ctx.lineTo(sc.x - tw * zoom, sc.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1 * zoom;
        ctx.stroke();
      }
    }

    // Room perimeter ambient radial glow
    const center = this.toScreen(bx, by, 0, cx, cy, zoom);
    const grad = ctx.createRadialGradient(center.x, center.y, 8 * zoom, center.x, center.y, 75 * zoom);
    grad.addColorStop(0, theme.glow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 75 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // Interior Department Label Banner
    ctx.font = `700 ${Math.max(9, 10 * zoom)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = theme.border;
    ctx.textAlign = 'center';
    ctx.fillText(`⚡ ${theme.label} [INTERIOR]`, center.x, center.y - 32 * zoom);
    ctx.restore();
  }

  _drawHandoff(ctx, cx, cy, zoom) {
    const handoff = this.activeHandoff;
    if (!handoff || handoff.expiresAt <= Date.now()) { this.activeHandoff = null; return; }
    const payload = handoff.event.payload || {};
    const fromId = payload.fromAgentId || payload.from || payload.sourceAgentId;
    const toId = payload.toAgentId || payload.to || payload.targetAgentId;
    const from = [...this.world.agents.values()].find((agent) => String(agent.id) === String(fromId) || String(agent.name) === String(fromId));
    const to = [...this.world.agents.values()].find((agent) => String(agent.id) === String(toId) || String(agent.name) === String(toId));
    if (!from || !to) return;
    const a = this.toScreen(from.x, from.y, 0.35, cx, cy, zoom);
    const b = this.toScreen(to.x, to.y, 0.35, cx, cy, zoom);
    ctx.save();
    ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2 * zoom; ctx.setLineDash([6 * zoom, 5 * zoom]);
    ctx.globalAlpha = Math.max(0.2, (handoff.expiresAt - Date.now()) / 8000);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, 4 * zoom, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawCityEventHud(ctx, width) {
    if (window.FENIX?.live?.status === 'ONLINE') {
      this.cityConnectionStatus = 'ONLINE';
    }
    const connection = this.cityConnectionStatus;
    if (connection && connection !== 'ONLINE' && connection !== 'SYNCING') {
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
    if (this.isNight === false) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0284c7');
      g.addColorStop(0.35, '#38bdf8');
      g.addColorStop(0.7, '#bae6fd');
      g.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Sun glow
      ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.22, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.22, 28, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
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
    this._drawWorkstations(ctx, d, cx, cy, zoom, dep);

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
    const type = d.buildingType || 'default';
    switch (type) {
      case 'core_spire':         this._drawCoreSpire(ctx, d, cx, cy, zoom, dep); break;
      case 'command_tower':      this._drawCommandTower(ctx, d, cx, cy, zoom, dep); break;
      case 'workshop_complex':   this._drawWorkshopComplex(ctx, d, cx, cy, zoom, dep); break;
      case 'canvas_pavilion':    this._drawCanvasPavilion(ctx, d, cx, cy, zoom, dep); break;
      case 'server_monoliths':   this._drawServerMonoliths(ctx, d, cx, cy, zoom, dep); break;
      case 'database_silos':     this._drawDatabaseSilos(ctx, d, cx, cy, zoom, dep); break;
      case 'creative_studio':    this._drawCreativeStudio(ctx, d, cx, cy, zoom, dep); break;
      case 'observatory_dome':   this._drawObservatoryDome(ctx, d, cx, cy, zoom, dep); break;
      case 'qa_radar':           this._drawQARadar(ctx, d, cx, cy, zoom, dep); break;
      case 'shield_fortress':    this._drawShieldFortress(ctx, d, cx, cy, zoom, dep); break;
      case 'launch_gantry':      this._drawLaunchGantry(ctx, d, cx, cy, zoom, dep); break;
      case 'terminal_console':   this._drawTerminalConsole(ctx, d, cx, cy, zoom, dep); break;
      case 'git_branch_tree':    this._drawGitBranchTree(ctx, d, cx, cy, zoom, dep); break;
      case 'memory_vault':       this._drawMemoryVault(ctx, d, cx, cy, zoom, dep); break;
      case 'knowledge_library':  this._drawKnowledgeLibrary(ctx, d, cx, cy, zoom, dep); break;
      case 'connector_nexus':    this._drawConnectorNexus(ctx, d, cx, cy, zoom, dep); break;
      case 'data_pipeline_tower':this._drawDataPipelineTower(ctx, d, cx, cy, zoom, dep); break;
      case 'antenna_array':      this._drawAntennaArray(ctx, d, cx, cy, zoom, dep); break;
      case 'governance_chamber': this._drawGovernanceChamber(ctx, d, cx, cy, zoom, dep); break;
      case 'archive_vault':      this._drawArchiveVault(ctx, d, cx, cy, zoom, dep); break;
      default:                   this._drawDefaultDistrictBlocks(ctx, d, cx, cy, zoom, dep); break;
    }
  }

  _drawBlock(ctx, x, y, bz, height, color, cx, cy, zoom, wx = 0.24, wy = 0.24) {
    const corners = [[-wx,-wy],[wx,-wy],[wx,wy],[-wx,wy]];
    const bot = corners.map(([dx,dy]) => this.toScreen(x+dx,y+dy,bz,cx,cy,zoom));
    const top = corners.map(([dx,dy]) => this.toScreen(x+dx,y+dy,bz+height,cx,cy,zoom));
    const path = (pts) => { ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); };
    ctx.fillStyle = this._adjustColor(color,-52); path([bot[3],bot[2],top[2],top[3]]); ctx.fill();
    ctx.fillStyle = this._adjustColor(color,-32); path([bot[2],bot[1],top[1],top[2]]); ctx.fill();
    ctx.fillStyle = color+'aa'; path(top); ctx.fill();
    ctx.strokeStyle = color+'60'; ctx.lineWidth=1; ctx.stroke();
  }

  _drawCylinder(ctx, x, y, bz, height, radius, color, cx, cy, zoom) {
    const tw = this.state.tileSize * zoom;
    const th = (this.state.tileSize / 2) * zoom;
    const bot = this.toScreen(x, y, bz, cx, cy, zoom);
    const top = this.toScreen(x, y, bz + height, cx, cy, zoom);
    const rx = radius * tw;
    const ry = radius * th;

    ctx.fillStyle = this._adjustColor(color, -40);
    ctx.beginPath();
    ctx.ellipse(bot.x, bot.y, rx, ry, 0, 0, Math.PI, false);
    ctx.lineTo(top.x - rx, top.y);
    ctx.ellipse(top.x, top.y, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(bot.x + rx, bot.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = color + 'cc';
    ctx.beginPath();
    ctx.ellipse(top.x, top.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawPylon(ctx, x, y, bz, height, color, cx, cy, zoom) {
    const bot = this.toScreen(x, y, bz, cx, cy, zoom);
    const top = this.toScreen(x, y, bz + height, cx, cy, zoom);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, 2 * zoom);
    ctx.beginPath();
    ctx.moveTo(bot.x, bot.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(top.x, top.y, Math.max(2, 3 * zoom), 0, Math.PI * 2);
    ctx.fill();
  }

  _drawCoreSpire(ctx, d, cx, cy, zoom, dep) {
    [-0.9, 0.9].forEach(ox => {
      [-0.9, 0.9].forEach(oy => {
        this._drawBlock(ctx, d.x + ox, d.y + oy, dep, 0.35, d.color, cx, cy, zoom, 0.18, 0.18);
      });
    });
    this._drawBlock(ctx, d.x, d.y, dep, 0.85, '#ef4444', cx, cy, zoom, 0.35, 0.35);
    this._drawPylon(ctx, d.x, d.y, dep + 0.85, 0.45, '#f87171', cx, cy, zoom);
  }

  _drawCommandTower(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.35, d.color, cx, cy, zoom, 0.5, 0.5);
    this._drawBlock(ctx, d.x, d.y, dep + 0.35, 0.35, d.color, cx, cy, zoom, 0.35, 0.35);
    this._drawBlock(ctx, d.x, d.y, dep + 0.7, 0.35, d.color, cx, cy, zoom, 0.2, 0.2);
    this._drawPylon(ctx, d.x, d.y, dep + 1.05, 0.35, '#ef4444', cx, cy, zoom);
  }

  _drawWorkshopComplex(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.45, d.y - 0.3, dep, 0.65, d.color, cx, cy, zoom, 0.28, 0.28);
    this._drawBlock(ctx, d.x + 0.45, d.y + 0.3, dep, 0.5, d.color, cx, cy, zoom, 0.28, 0.28);
    this._drawBlock(ctx, d.x, d.y, dep + 0.35, 0.15, d.color, cx, cy, zoom, 0.45, 0.12);
  }

  _drawCanvasPavilion(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.35, d.y - 0.35, dep, 0.2, d.color, cx, cy, zoom, 0.4, 0.4);
    this._drawBlock(ctx, d.x, d.y, dep + 0.15, 0.25, d.color, cx, cy, zoom, 0.3, 0.3);
    this._drawBlock(ctx, d.x + 0.35, d.y + 0.35, dep + 0.35, 0.3, d.color, cx, cy, zoom, 0.2, 0.2);
  }

  _drawServerMonoliths(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.35, d.y, dep, 0.85, d.color, cx, cy, zoom, 0.16, 0.35);
    this._drawBlock(ctx, d.x + 0.35, d.y, dep, 0.85, d.color, cx, cy, zoom, 0.16, 0.35);
  }

  _drawDatabaseSilos(ctx, d, cx, cy, zoom, dep) {
    this._drawCylinder(ctx, d.x - 0.45, d.y - 0.3, dep, 0.65, 0.22, d.color, cx, cy, zoom);
    this._drawCylinder(ctx, d.x + 0.45, d.y - 0.3, dep, 0.65, 0.22, d.color, cx, cy, zoom);
    this._drawCylinder(ctx, d.x, d.y + 0.45, dep, 0.7, 0.24, d.color, cx, cy, zoom);
  }

  _drawCreativeStudio(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.3, d.y - 0.2, dep, 0.55, d.color, cx, cy, zoom, 0.35, 0.35);
    this._drawBlock(ctx, d.x + 0.35, d.y + 0.35, dep, 0.35, d.color, cx, cy, zoom, 0.25, 0.25);
  }

  _drawObservatoryDome(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.4, d.color, cx, cy, zoom, 0.42, 0.42);
    this._drawCylinder(ctx, d.x, d.y, dep + 0.4, 0.25, 0.26, d.color, cx, cy, zoom);
    this._drawPylon(ctx, d.x + 0.1, d.y - 0.1, dep + 0.65, 0.4, '#c084fc', cx, cy, zoom);
  }

  _drawQARadar(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.4, d.color, cx, cy, zoom, 0.4, 0.4);
    const top = this.toScreen(d.x, d.y, dep + 0.4, cx, cy, zoom);
    const angle = this.time * 2.5;
    const armX = top.x + Math.cos(angle) * 16 * zoom;
    const armY = top.y + Math.sin(angle) * 8 * zoom;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2 * zoom;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(armX, armY);
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(armX, armY, 3 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawShieldFortress(ctx, d, cx, cy, zoom, dep) {
    [-0.6, 0.6].forEach(ox => {
      [-0.6, 0.6].forEach(oy => {
        this._drawBlock(ctx, d.x + ox, d.y + oy, dep, 0.45, d.color, cx, cy, zoom, 0.2, 0.2);
      });
    });
    this._drawBlock(ctx, d.x, d.y, dep, 0.7, '#f43f5e', cx, cy, zoom, 0.25, 0.25);
  }

  _drawLaunchGantry(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.35, d.y, dep, 1.1, d.color, cx, cy, zoom, 0.18, 0.18);
    this._drawCylinder(ctx, d.x + 0.3, d.y, dep, 0.95, 0.18, '#a855f7', cx, cy, zoom);
  }

  _drawTerminalConsole(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.65, d.color, cx, cy, zoom, 0.45, 0.18);
    const screenTop = this.toScreen(d.x, d.y, dep + 0.35, cx, cy, zoom);
    ctx.fillStyle = '#10b981';
    ctx.font = `${Math.max(6, 7 * zoom)}px 'JetBrains Mono',monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('>_ FENIX', screenTop.x, screenTop.y);
  }

  _drawGitBranchTree(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y + 0.5, dep, 0.3, d.color, cx, cy, zoom, 0.22, 0.22);
    this._drawBlock(ctx, d.x - 0.4, d.y - 0.3, dep, 0.65, d.color, cx, cy, zoom, 0.2, 0.2);
    this._drawBlock(ctx, d.x + 0.4, d.y - 0.1, dep, 0.55, d.color, cx, cy, zoom, 0.2, 0.2);
  }

  _drawMemoryVault(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.65, d.color, cx, cy, zoom, 0.45, 0.45);
    const top = this.toScreen(d.x, d.y, dep + 0.65, cx, cy, zoom);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.5 * zoom;
    ctx.beginPath();
    ctx.arc(top.x, top.y, 8 * zoom, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawKnowledgeLibrary(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.45, d.color, cx, cy, zoom, 0.55, 0.45);
    this._drawBlock(ctx, d.x, d.y, dep + 0.45, 0.35, d.color, cx, cy, zoom, 0.35, 0.28);
  }

  _drawConnectorNexus(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.5, d.color, cx, cy, zoom, 0.32, 0.32);
    [-0.6, 0.6].forEach(ox => {
      this._drawPylon(ctx, d.x + ox, d.y, dep, 0.3, '#38bdf8', cx, cy, zoom);
    });
    [-0.6, 0.6].forEach(oy => {
      this._drawPylon(ctx, d.x, d.y + oy, dep, 0.3, '#38bdf8', cx, cy, zoom);
    });
  }

  _drawDataPipelineTower(ctx, d, cx, cy, zoom, dep) {
    this._drawCylinder(ctx, d.x - 0.35, d.y, dep, 0.85, 0.18, d.color, cx, cy, zoom);
    this._drawCylinder(ctx, d.x + 0.35, d.y, dep, 0.65, 0.18, d.color, cx, cy, zoom);
    this._drawBlock(ctx, d.x, d.y, dep + 0.4, 0.1, d.color, cx, cy, zoom, 0.35, 0.08);
  }

  _drawAntennaArray(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.3, d.color, cx, cy, zoom, 0.35, 0.35);
    this._drawPylon(ctx, d.x, d.y, dep + 0.3, 0.9, '#fdba74', cx, cy, zoom);
  }

  _drawGovernanceChamber(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x, d.y, dep, 0.55, d.color, cx, cy, zoom, 0.5, 0.4);
    this._drawPylon(ctx, d.x, d.y, dep + 0.55, 0.35, '#fde047', cx, cy, zoom);
  }

  _drawArchiveVault(ctx, d, cx, cy, zoom, dep) {
    this._drawBlock(ctx, d.x - 0.3, d.y, dep, 0.35, d.color, cx, cy, zoom, 0.28, 0.28);
    this._drawBlock(ctx, d.x + 0.3, d.y, dep, 0.35, d.color, cx, cy, zoom, 0.28, 0.28);
    this._drawBlock(ctx, d.x, d.y, dep + 0.35, 0.35, d.color, cx, cy, zoom, 0.28, 0.28);
  }

  _drawDefaultDistrictBlocks(ctx, d, cx, cy, zoom, dep) {
    const structs = [
      {ox:-0.7, oy:-0.5, h:0.6},{ox:0.45, oy:-0.32, h:0.4},{ox:-0.15, oy:0.45, h:0.3}
    ];
    for (const s of structs) {
      if (Math.abs(s.ox) > d.w/2-0.4 || Math.abs(s.oy) > d.h/2-0.4) continue;
      this._drawBlock(ctx, d.x+s.ox, d.y+s.oy, dep, s.h, d.color, cx, cy, zoom);
    }
  }

  _drawTrail(ctx, agent, cx, cy, zoom) {
    if (!agent.trail || !Array.isArray(agent.trail) || agent.trail.length < 2) return;
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
    const isOffline = String(agent.status || '').toUpperCase() === 'OFFLINE';
    ctx.save();
    if (isOffline) ctx.globalAlpha = 0.45;
    const isSelected = this.state.selectedAgent === agent;
    const isHovered  = this.state.hoveredAgent === agent;
    const isWorking  = ['WORKING','RUNNING','TESTING','QUEUED'].includes(String(agent.status||'').toUpperCase());
    const isError    = ['ERROR', 'FAILED', 'BLOCKED'].includes(String(agent.status || '').toUpperCase());

    const animState = agent.animState || (isError ? 'error' : (isWorking ? 'working' : (agent._moving ? 'walk' : 'idle')));
    const facing = agent.facing || 'SE';
    const config = getAgentAvatarConfig(agent);
    const isMaster = agent.id === 'Orchestrator' || String(agent.role || '').toLowerCase().includes('orchestrator') || agent.id === 'master';

    // Bobbing / Walk bounce
    const walkBounce = agent._moving ? Math.abs(Math.sin((agent.walkFrame || 0) * Math.PI / 2)) * 3 * zoom : 0;
    const workBounce = animState === 'working' && !agent._moving ? Math.abs(Math.sin(this.time * 3)) * 1.5 * zoom : 0;
    const idleBounce = animState === 'idle' ? Math.sin(this.time * 2.5) * 1.2 * zoom : 0;
    const ax = (typeof agent.x === 'number' && !isNaN(agent.x)) ? agent.x : (typeof agent.homeX === 'number' ? agent.homeX : 0);
    const ay = (typeof agent.y === 'number' && !isNaN(agent.y)) ? agent.y : (typeof agent.homeY === 'number' ? agent.homeY : 0);
    const sc = this.toScreen(ax, ay, 0.22, cx, cy, zoom);
    sc.y -= (walkBounce + workBounce + idleBounce);

    // Selection ring
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * zoom;
      ctx.setLineDash([4 * zoom, 4 * zoom]);
      ctx.beginPath();
      ctx.ellipse(sc.x, sc.y + 6 * zoom, 14 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw modular 2.5D pixel avatar
    PixelAvatarRenderer.drawAvatar(ctx, {
      x: sc.x,
      y: sc.y,
      zoom,
      facing,
      frame: agent.walkFrame || 0,
      state: animState,
      config,
      color: agent.color,
      isMaster,
      time: this.time,
      role: agent.role || agent.id,
      agent
    });

    // Floating Nameplate with Level-Of-Detail (LOD)
    const headY = sc.y - 36 * zoom;
    const tagY = headY - 6 * zoom;

    if (!this.state.photoMode && (isHovered || isSelected || isWorking || zoom >= 1.8)) {
      ctx.save();
      const displayName = agent.displayName || agent.name;
      ctx.font = `700 ${Math.max(9, 10.5 * zoom)}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(displayName).width;

      ctx.fillStyle = 'rgba(8, 12, 24, 0.88)';
      ctx.strokeStyle = (isMaster ? '#ef4444' : agent.color) + '99';
      ctx.lineWidth = Math.max(1, zoom);
      ctx.beginPath();
      ctx.roundRect(sc.x - tw / 2 - 8, tagY - 14 * zoom, tw + 16, 17 * zoom, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText((agent.emoji ? agent.emoji + ' ' : '') + displayName, sc.x, tagY - 1.5 * zoom);

      if (isSelected || isHovered) {
        ctx.font = `600 ${Math.max(7, 8 * zoom)}px 'JetBrains Mono',monospace`;
        ctx.fillStyle = agent.color || '#38bdf8';
        ctx.fillText(`[${agent.status || 'IDLE'}]`, sc.x, tagY + 12 * zoom);
      }
      ctx.restore();
    } else if (!this.state.photoMode && zoom < 0.8) {
      ctx.save();
      ctx.fillStyle = agent.color || '#38bdf8';
      ctx.beginPath();
      ctx.arc(sc.x, tagY, 2.5 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Speech bubble
    if (!this.state.photoMode && agent.bubble && agent.bubble.life > 0 && (isHovered || isSelected || zoom >= 2.1)) {
      const bAlpha = Math.min(1, agent.bubble.life);
      ctx.save();
      ctx.globalAlpha = bAlpha;
      const bText = String(agent.bubble.text || '').slice(0, 28);
      ctx.font = `600 ${Math.max(8, 9.5 * zoom)}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      const bw = ctx.measureText(bText).width + 16;
      const bh = 20 * zoom;
      const bx = sc.x - bw / 2;
      const by = tagY - bh - 8 * zoom;

      ctx.fillStyle = (agent.color || '#38bdf8') + 'e6';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(sc.x - 4, by + bh);
      ctx.lineTo(sc.x + 4, by + bh);
      ctx.lineTo(sc.x, by + bh + 5 * zoom);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(bText, sc.x, by + bh * 0.68);
      ctx.restore();
    }

    // Thought bubble (Munder Difflin Living Office)
    if (!this.state.photoMode && agent.thoughtBubble && agent.thoughtBubble.life > 0 && (isHovered || isSelected || zoom >= 2.1)) {
      const tAlpha = Math.min(1, agent.thoughtBubble.life);
      ctx.save();
      ctx.globalAlpha = tAlpha;
      const tText = String(agent.thoughtBubble.text || '').slice(0, 28);
      ctx.font = `600 ${Math.max(8, 9 * zoom)}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(tText).width + 18;
      const th = 22 * zoom;
      const tx = sc.x - tw / 2;
      const ty = tagY - th - 12 * zoom;

      // Dark slate translucent cloud bubble
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = agent.thoughtBubble.isWork ? 'rgba(56, 189, 248, 0.7)' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 8);
      ctx.fill();
      ctx.stroke();

      // Thought cloud bubbles tail (3 small circles descending to head)
      ctx.beginPath(); ctx.arc(sc.x - 2, ty + th + 3 * zoom, 2.5 * zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(sc.x - 5, ty + th + 7 * zoom, 1.8 * zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(sc.x - 7, ty + th + 10 * zoom, 1.2 * zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Text inside thought bubble
      ctx.fillStyle = agent.thoughtBubble.isWork ? '#38bdf8' : '#e2e8f0';
      ctx.fillText(tText, sc.x, ty + th * 0.68);
      ctx.restore();
    }

    ctx.restore();
  }

  findPath(startX, startY, targetX, targetY) {
    if (window.FenixPixelEngine && window.FenixPixelEngine.findPath) {
      return window.FenixPixelEngine.findPath(startX, startY, targetX, targetY);
    }
    return this.grid ? this.grid.findPath(startX, startY, targetX, targetY) : [{ x: targetX, y: targetY }];
  }

  sendEnvelope(fromAgentId, toAgentId, text, color) {
    const from = [...this.world.agents.values()].find(a => String(a.id) === String(fromAgentId) || String(a.name) === String(fromAgentId));
    const to = [...this.world.agents.values()].find(a => String(a.id) === String(toAgentId) || String(a.name) === String(toAgentId));
    if (!from || !to) return;
    this.world.envelopes = this.world.envelopes || [];
    this.world.envelopes.push({
      fromAgentId: from.id,
      toAgentId: to.id,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      progress: 0,
      speed: 0.9,
      text: text || 'HANDOFF DISPATCH',
      color: color || from.color || '#06b6d4'
    });
  }

  _drawRoads(ctx, cx, cy, zoom) {
    if (!this.grid || !this.grid.roads) return;
    ctx.save();
    const pulseOffset = (this.time * 24) % 40;
    for (const [x1, y1, x2, y2] of this.grid.roads) {
      const p1 = this.toScreen(x1, y1, 0.05, cx, cy, zoom);
      const p2 = this.toScreen(x2, y2, 0.05, cx, cy, zoom);

      // Road bed
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.lineWidth = Math.max(6, 12 * zoom);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Cyber glow border
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = Math.max(1, 1.5 * zoom);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Animated energy pulses along road
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6 * zoom;
      ctx.lineWidth = Math.max(1.5, 2.5 * zoom);
      ctx.setLineDash([4 * zoom, 36 * zoom]);
      ctx.lineDashOffset = -pulseOffset * zoom;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  _drawWorkstations(ctx, d, cx, cy, zoom, dep) {
    if (!d || d.id === 'CENTRAL') return;
    const hw = d.w / 2, hh = d.h / 2;
    const stations = [
      { ox: -hw * 0.55, oy: hh * 0.45 },
      { ox: hw * 0.55, oy: hh * 0.45 }
    ];

    for (let sIdx = 0; sIdx < stations.length; sIdx++) {
      const st = stations[sIdx];
      const wx = d.x + st.ox;
      const wy = d.y + st.oy;
      const deskPos = this.toScreen(wx, wy, dep + 0.02, cx, cy, zoom);

      ctx.save();
      const dw = 14 * zoom;
      const dh = 7 * zoom;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = (d.color || '#38bdf8') + '80';
      ctx.lineWidth = Math.max(1, zoom);
      ctx.beginPath();
      ctx.ellipse(deskPos.x, deskPos.y, dw, dh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const monX = deskPos.x;
      const monY = deskPos.y - 6 * zoom;
      const mw = 10 * zoom;
      const mh = 7 * zoom;

      ctx.fillStyle = '#020617';
      ctx.strokeStyle = d.color || '#38bdf8';
      ctx.lineWidth = Math.max(1, zoom);
      ctx.strokeRect(monX - mw / 2, monY - mh, mw, mh);
      ctx.fillRect(monX - mw / 2, monY - mh, mw, mh);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(monX - mw / 2 + 1, monY - mh + 1, mw - 2, mh - 2);

      ctx.fillStyle = d.color || '#38bdf8';
      const flicker = Math.sin(this.time * 8 + sIdx * 3) > -0.3 ? 1 : 0.4;
      ctx.globalAlpha = flicker;
      for (let li = 0; li < 3; li++) {
        const lineW = (4 + ((li + sIdx) % 3) * 2) * zoom;
        ctx.fillRect(monX - mw / 2 + 2, monY - mh + 2 + li * 2 * zoom, lineW, Math.max(1, zoom));
      }
      ctx.restore();
    }
  }

  _drawEnvelopes(ctx, cx, cy, zoom) {
    if (!this.world.envelopes || !this.world.envelopes.length) return;
    for (const env of this.world.envelopes) {
      const arc = Math.sin(Math.min(1, env.progress) * Math.PI) * 1.5;
      const px = env.fromX + (env.toX - env.fromX) * env.progress;
      const py = env.fromY + (env.toY - env.fromY) * env.progress;
      const pz = 0.3 + arc;
      const sc = this.toScreen(px, py, pz, cx, cy, zoom);

      ctx.save();
      ctx.translate(sc.x, sc.y);

      ctx.save();
      ctx.shadowColor = env.color || '#06b6d4';
      ctx.shadowBlur = 12 * zoom;
      ctx.fillStyle = env.color || '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, 0, 5 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const ew = 10 * zoom;
      const eh = 7 * zoom;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = env.color || '#06b6d4';
      ctx.lineWidth = Math.max(1, 1.2 * zoom);
      ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
      ctx.strokeRect(-ew / 2, -eh / 2, ew, eh);

      ctx.beginPath();
      ctx.moveTo(-ew / 2, -eh / 2);
      ctx.lineTo(0, 1 * zoom);
      ctx.lineTo(ew / 2, -eh / 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  _openContextMenu(e) {
    this._closeContextMenu();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    const agent = this._hitTestAgent(mx, my);
    const distHit = !agent ? this._hitTestDistrict(mx, my) : null;

    const menu = document.createElement('div');
    menu.className = 'fenix-city-context-menu';
    menu.style.left = `${Math.min(window.innerWidth - 220, e.clientX)}px`;
    menu.style.top = `${Math.min(window.innerHeight - 320, e.clientY)}px`;

    if (agent) {
      menu.innerHTML = `
        <div class="fenix-ctx-header">${agent.emoji || '🤖'} ${agent.displayName || agent.name}</div>
        <button class="fenix-ctx-item" data-action="inspect"><span>🔍</span> Inspecionar Agente</button>
        <button class="fenix-ctx-item" data-action="follow"><span>🎥</span> Seguir Câmera</button>
        <button class="fenix-ctx-item" data-action="assign"><span>📋</span> Atribuir Tarefa</button>
        <button class="fenix-ctx-item" data-action="memory"><span>🧠</span> Ver Memória</button>
        <button class="fenix-ctx-item" data-action="logs"><span>📄</span> Ver Logs</button>
        <button class="fenix-ctx-item" data-action="project"><span>📁</span> Ver Projeto</button>
        <button class="fenix-ctx-item" data-action="rename"><span>✏️</span> Renomear Agente</button>
        <button class="fenix-ctx-item" data-action="avatar"><span>🎨</span> Customizar Avatar</button>
        <div class="fenix-ctx-divider"></div>
        <button class="fenix-ctx-item" data-action="toggle-pause"><span>${agent.status === 'PAUSED' ? '▶️ Retomar Agente' : '⏸️ Pausar Agente'}</span></button>
        <button class="fenix-ctx-item danger" data-action="restart"><span>🔄</span> Reiniciar Agente</button>
      `;

      menu.addEventListener('click', async (evt) => {
        const btn = evt.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        this._closeContextMenu();

        if (action === 'inspect') {
          this.state.selectedAgent = agent;
          window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent, agentId: agent.id } }));
        } else if (action === 'follow') {
          this.followAgent(agent.id);
        } else if (action === 'assign') {
          this._openAssignTaskModal(agent);
        } else if (action === 'memory') {
          this.state.selectedAgent = agent;
          window.dispatchEvent(new CustomEvent('fenix-memory-requested', { detail: { agentId: agent.id } }));
          window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent, agentId: agent.id, tab: 'memory' } }));
        } else if (action === 'logs') {
          this.state.selectedAgent = agent;
          window.dispatchEvent(new CustomEvent('fenix-logs-requested', { detail: { agentId: agent.id } }));
          window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent, agentId: agent.id, tab: 'logs' } }));
        } else if (action === 'project') {
          const pId = agent.projectId || agent.currentMission?.projectId || 'FENIX-CORE';
          this.focusProject(pId);
        } else if (action === 'rename') {
          this._openRenameModal(agent);
        } else if (action === 'avatar') {
          this._openAvatarEditorModal(agent);
        } else if (action === 'toggle-pause') {
          const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          const endpoint = agent.status === 'PAUSED' ? `/api/v2/agents/${encodeURIComponent(agent.id)}/resume` : `/api/v2/agents/${encodeURIComponent(agent.id)}/pause`;
          await fetch(endpoint, { method: 'POST', headers }).catch(() => {});
          this.syncRealData();
        } else if (action === 'restart') {
          const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          await fetch(`/api/v2/agents/${encodeURIComponent(agent.id)}/restart`, { method: 'POST', headers }).catch(() => {});
          this.syncRealData();
        }
      });
    } else if (distHit) {
      const d = distHit.district;
      menu.innerHTML = `
        <div class="fenix-ctx-header">${d.emoji || '🏛️'} ${d.name}</div>
        <button class="fenix-ctx-item" data-action="inspect-district"><span>🔍</span> Inspecionar Distrito</button>
        <button class="fenix-ctx-item" data-action="focus-district"><span>🎥</span> Focar Câmera</button>
        <button class="fenix-ctx-item" data-action="filter-district"><span>🎯</span> Filtrar Deste Distrito</button>
      `;
      menu.addEventListener('click', (evt) => {
        const btn = evt.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        this._closeContextMenu();
        if (action === 'inspect-district') {
          window.dispatchEvent(new CustomEvent('fenix-district-selected', { detail: distHit }));
        } else if (action === 'focus-district') {
          const tw = this.state.tileSize;
          const th = this.state.tileSize / 2;
          const cameraPoint = this.toScreen(d.x, d.y, 0, 0, 0, 1);
          this.state.targetCamera.x = -cameraPoint.x;
          this.state.targetCamera.y = -cameraPoint.y;
          this.state.targetCamera.zoom = 1.35;
          this._updateZoomDisplay();
        } else if (action === 'filter-district') {
          this.state.cityFilter = distHit.key;
        }
      });
    } else {
      menu.innerHTML = `
        <div class="fenix-ctx-header">🌐 AI CITY</div>
        <button class="fenix-ctx-item" data-action="reset-camera"><span>🔄</span> Resetar Câmera</button>
        <button class="fenix-ctx-item" data-action="create-agent"><span>➕</span> Criar Novo Agente</button>
      `;
      menu.addEventListener('click', (evt) => {
        const btn = evt.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        this._closeContextMenu();
        if (action === 'reset-camera') {
          this.state.targetCamera = { x: 0, y: 0, zoom: 1.0 };
          this._updateZoomDisplay();
        } else if (action === 'create-agent') {
          this._openCreateAgentWizard();
        }
      });
    }

    document.body.appendChild(menu);
    this._contextMenuEl = menu;
  }

  _closeContextMenu() {
    if (this._contextMenuEl) {
      this._contextMenuEl.remove();
      this._contextMenuEl = null;
    }
  }

  _openRenameModal(agent) {
    const backdrop = document.createElement('div');
    backdrop.className = 'fenix-avatar-modal-backdrop';
    backdrop.innerHTML = `
      <div class="fenix-avatar-modal" style="max-width: 420px;">
        <div class="fenix-avatar-modal-head">
          <h3>✏️ RENOMEAR AGENTE</h3>
          <button class="fenix-avatar-preview-btn" id="btnCancelRename">✕</button>
        </div>
        <div class="fenix-avatar-modal-body" style="padding: 20px;">
          <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">NOME DE EXIBIÇÃO:</label>
            <input type="text" id="renameAgentInput" class="fenix-avatar-input" value="${agent.displayName || agent.name}" style="width: 100%; box-sizing: border-box;" />
          </div>
        </div>
        <div class="fenix-avatar-modal-footer">
          <button class="fenix-avatar-preview-btn" id="btnDismissRename">Cancelar</button>
          <button class="fenix-avatar-preview-btn" id="btnSaveRename" style="background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #fff; font-weight: 700;">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('#btnCancelRename')?.addEventListener('click', close);
    backdrop.querySelector('#btnDismissRename')?.addEventListener('click', close);
    backdrop.querySelector('#btnSaveRename')?.addEventListener('click', async () => {
      const newName = backdrop.querySelector('#renameAgentInput')?.value?.trim();
      if (newName) {
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };
        await fetch(`/api/v2/agents/${encodeURIComponent(agent.id)}/profile`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ displayName: newName })
        }).catch(() => {});
        agent.displayName = newName;
        agent.name = newName;
        this.syncRealData();
      }
      close();
    });
  }

  _openAssignTaskModal(agent) {
    const backdrop = document.createElement('div');
    backdrop.className = 'fenix-avatar-modal-backdrop';
    backdrop.innerHTML = `
      <div class="fenix-avatar-modal" style="width: 480px;">
        <div class="fenix-avatar-modal-head">
          <h3>📋 ATRIBUIR TAREFA — ${agent.displayName || agent.name}</h3>
          <button class="fenix-avatar-preview-btn" id="btnAssignClose">✕</button>
        </div>
        <div class="fenix-avatar-modal-body" style="flex-direction: column; gap: 14px; padding: 18px;">
          <div class="fenix-avatar-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">TÍTULO DA TAREFA:</label>
            <input type="text" id="assignTaskTitle" class="fenix-avatar-input" style="width: 100%; box-sizing: border-box;" placeholder="Ex: Executar auditoria de rotas e segurança" />
          </div>
          <div class="fenix-avatar-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">INSTRUÇÃO / PROMPT:</label>
            <textarea id="assignTaskPrompt" class="fenix-avatar-input" rows="4" style="width: 100%; box-sizing: border-box; resize: vertical;" placeholder="Descreva os passos que o agente deve executar..."></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;">
            <div class="fenix-avatar-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">PRIORIDADE:</label>
              <select id="assignTaskPriority" class="fenix-avatar-select" style="width: 100%; box-sizing: border-box;">
                <option value="normal">Normal</option>
                <option value="high">Alta (Urgente)</option>
                <option value="critical">Crítica (Bloqueante)</option>
              </select>
            </div>
            <div class="fenix-avatar-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">DISTRITO ALVO:</label>
              <select id="assignTaskDistrict" class="fenix-avatar-select" style="width: 100%; box-sizing: border-box;">
                ${Object.values(this.DISTRICTS).map(d => `<option value="${d.id}" ${d.id === agent.district ? 'selected' : ''}>${d.emoji || ''} ${d.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="fenix-avatar-modal-footer">
          <button class="fenix-avatar-preview-btn" id="btnAssignCancel">Cancelar</button>
          <button class="fenix-avatar-preview-btn" id="btnAssignSubmit" style="background: rgba(56, 189, 248, 0.25); border-color: #38bdf8; color: #fff; font-weight: 800;">Despachar Tarefa</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('#btnAssignClose')?.addEventListener('click', close);
    backdrop.querySelector('#btnAssignCancel')?.addEventListener('click', close);

    backdrop.querySelector('#btnAssignSubmit')?.addEventListener('click', async () => {
      const title = backdrop.querySelector('#assignTaskTitle')?.value?.trim();
      const prompt = backdrop.querySelector('#assignTaskPrompt')?.value?.trim();
      const priority = backdrop.querySelector('#assignTaskPriority')?.value || 'normal';
      const district = backdrop.querySelector('#assignTaskDistrict')?.value || agent.district;
      if (!title) return;

      const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
      const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };
      try {
        await fetch('/api/v2/jobs', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title,
            description: prompt || title,
            agentId: agent.id,
            priority,
            district,
            status: 'QUEUED'
          })
        });
        this.audio?.playTaskStart();
        this.syncRealData();
      } catch {}
      close();
    });
  }

  _openAvatarEditorModal(agent) {
    const currentConfig = { ...getAgentAvatarConfig(agent) };
    let previewFacing = 'SE';
    let previewState = 'idle';
    let previewAnimFrame = 0;
    let previewAnimTimer = null;

    const facings = ['SE', 'SW', 'NW', 'NE'];
    const animStates = ['idle', 'walk', 'working', 'error'];

    const backdrop = document.createElement('div');
    backdrop.className = 'fenix-avatar-modal-backdrop';
    backdrop.innerHTML = `
      <div class="fenix-avatar-modal">
        <div class="fenix-avatar-modal-head">
          <h3>🎨 EDITOR DE AVATAR — ${agent.displayName || agent.name}</h3>
          <button class="fenix-avatar-preview-btn" id="btnAvModalClose">✕</button>
        </div>
        <div class="fenix-avatar-modal-body">
          <div class="fenix-avatar-preview-pane">
            <canvas class="fenix-avatar-preview-canvas" id="avPreviewCanvas" width="180" height="220"></canvas>
            <div class="fenix-avatar-preview-controls">
              <button class="fenix-avatar-preview-btn" id="btnAvRotLeft" title="Girar Esquerda">↺</button>
              <button class="fenix-avatar-preview-btn" id="btnAvRotRight" title="Girar Direita">↻</button>
              <button class="fenix-avatar-preview-btn" id="btnAvAnimCycle" title="Alternar Animação">▶ ESTADO</button>
            </div>
            <div id="avAnimLabel" style="font-size: 10px; color: #38bdf8; margin-top: 6px; font-family: monospace;">ESTADO: IDLE</div>
          </div>
          <div class="fenix-avatar-controls-pane">
            <div class="fenix-avatar-section-title">IDENTIDADE & CARGO</div>
            <div class="fenix-avatar-field-row">
              <label>NOME:</label>
              <input type="text" id="avDisplayNameInput" class="fenix-avatar-input" value="${agent.displayName || agent.name}" />
            </div>
            <div class="fenix-avatar-field-row">
              <label>CARGO / ROLE:</label>
              <input type="text" id="avRoleInput" class="fenix-avatar-input" value="${agent.role || 'developer'}" />
            </div>

            <div class="fenix-avatar-section-title">PELE & TOM</div>
            <div class="fenix-avatar-field-row">
              <label>TOM DE PELE:</label>
              <div class="fenix-palette-swatches" id="skinSwatches">
                ${Object.entries(AVATAR_PALETTES.skins).map(([k, s]) => `
                  <div class="fenix-swatch ${k === currentConfig.skin ? 'active' : ''}" data-skin="${k}" style="background: ${s.base};" title="${k}"></div>
                `).join('')}
              </div>
            </div>

            <div class="fenix-avatar-section-title">CABELO</div>
            <div class="fenix-avatar-field-row">
              <label>ESTILO:</label>
              <select id="avHairStyleSelect" class="fenix-avatar-select">
                ${AVATAR_PALETTES.hairStyles.map(h => `<option value="${h}" ${h === currentConfig.hairStyle ? 'selected' : ''}>${h.toUpperCase()}</option>`).join('')}
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>COR DO CABELO:</label>
              <div class="fenix-palette-swatches" id="hairColorSwatches">
                ${Object.entries(AVATAR_PALETTES.hairColors).map(([k, c]) => `
                  <div class="fenix-swatch ${k === currentConfig.hairColor ? 'active' : ''}" data-hair-color="${k}" style="background: ${c};" title="${k}"></div>
                `).join('')}
              </div>
            </div>

            <div class="fenix-avatar-section-title">TRAJE & VESTIMENTA</div>
            <div class="fenix-avatar-field-row">
              <label>TIPO DE TRAJE:</label>
              <select id="avOutfitSelect" class="fenix-avatar-select">
                ${AVATAR_PALETTES.outfits.map(o => `<option value="${o}" ${o === currentConfig.outfit ? 'selected' : ''}>${o.toUpperCase()}</option>`).join('')}
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>COR DO TRAJE:</label>
              <input type="color" id="avOutfitColorInput" value="${currentConfig.shirtColor || currentConfig.outfitColor || agent.color || '#3b82f6'}" class="fenix-avatar-input" style="height: 28px; padding: 2px 4px;" />
            </div>
            <div class="fenix-avatar-field-row">
              <label>COR DA CALÇA:</label>
              <input type="color" id="avPantsColorInput" value="${currentConfig.pantsColor || '#1e293b'}" class="fenix-avatar-input" style="height: 28px; padding: 2px 4px;" />
            </div>
            <div class="fenix-avatar-field-row">
              <label>COR DOS SAPATOS:</label>
              <input type="color" id="avShoesColorInput" value="${currentConfig.shoesColor || '#090d16'}" class="fenix-avatar-input" style="height: 28px; padding: 2px 4px;" />
            </div>

            <div class="fenix-avatar-section-title">ACESSÓRIOS & BADGES</div>
            <div class="fenix-avatar-field-row">
              <label>ACESSÓRIO:</label>
              <select id="avAccessorySelect" class="fenix-avatar-select">
                ${AVATAR_PALETTES.accessories.map(a => `<option value="${a}" ${a === currentConfig.accessory ? 'selected' : ''}>${a.toUpperCase()}</option>`).join('')}
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>INSÍGNIA / BADGE:</label>
              <select id="avBadgeSelect" class="fenix-avatar-select">
                <option value="none" ${currentConfig.badge === 'none' ? 'selected' : ''}>NENHUMA</option>
                <option value="bronze" ${currentConfig.badge === 'bronze' ? 'selected' : ''}>🥉 BRONZE</option>
                <option value="silver" ${currentConfig.badge === 'silver' ? 'selected' : ''}>🥈 PRATA (SILVER)</option>
                <option value="gold" ${currentConfig.badge === 'gold' ? 'selected' : ''}>🥇 OURO (GOLD)</option>
                <option value="diamond" ${currentConfig.badge === 'diamond' ? 'selected' : ''}>💎 DIAMANTE (DIAMOND)</option>
                <option value="master" ${currentConfig.badge === 'master' ? 'selected' : ''}>🔥 MESTRE (MASTER - RED)</option>
              </select>
            </div>
          </div>
        </div>
        <div class="fenix-avatar-modal-footer">
          <button class="fenix-avatar-preview-btn" id="btnAvCancel">Cancelar</button>
          <button class="fenix-avatar-preview-btn" id="btnAvSave" style="background: rgba(239, 68, 68, 0.25); border-color: #ef4444; color: #fff; font-weight: 800;">Salvar Avatar</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const prevCanvas = backdrop.querySelector('#avPreviewCanvas');
    const pCtx = prevCanvas?.getContext('2d');

    const renderPreview = () => {
      if (!pCtx) return;
      pCtx.clearRect(0, 0, 180, 220);
      const isMaster = agent.id === 'Orchestrator' || String(agent.role || '').toLowerCase().includes('orchestrator') || agent.id === 'master';

      PixelAvatarRenderer.drawAvatar(pCtx, {
        x: 90,
        y: 160,
        zoom: 2.8,
        facing: previewFacing,
        frame: previewAnimFrame,
        state: previewState,
        config: currentConfig,
        color: currentConfig.outfitColor || agent.color,
        isMaster,
        time: performance.now() / 1000
      });
    };

    let animTime = 0;
    const loop = () => {
      animTime += 0.04;
      previewAnimFrame = Math.floor(animTime * 4) % 4;
      renderPreview();
      previewAnimTimer = requestAnimationFrame(loop);
    };
    previewAnimTimer = requestAnimationFrame(loop);

    const close = () => {
      if (previewAnimTimer) cancelAnimationFrame(previewAnimTimer);
      backdrop.remove();
    };

    backdrop.querySelector('#btnAvModalClose')?.addEventListener('click', close);
    backdrop.querySelector('#btnAvCancel')?.addEventListener('click', close);

    backdrop.querySelector('#btnAvRotLeft')?.addEventListener('click', () => {
      const idx = facings.indexOf(previewFacing);
      previewFacing = facings[(idx + 1) % facings.length];
      renderPreview();
    });
    backdrop.querySelector('#btnAvRotRight')?.addEventListener('click', () => {
      const idx = facings.indexOf(previewFacing);
      previewFacing = facings[(idx - 1 + facings.length) % facings.length];
      renderPreview();
    });
    backdrop.querySelector('#btnAvAnimCycle')?.addEventListener('click', () => {
      const idx = animStates.indexOf(previewState);
      previewState = animStates[(idx + 1) % animStates.length];
      const lbl = backdrop.querySelector('#avAnimLabel');
      if (lbl) lbl.textContent = `ESTADO: ${previewState.toUpperCase()}`;
      renderPreview();
    });

    backdrop.querySelectorAll('#skinSwatches [data-skin]').forEach(sw => {
      sw.addEventListener('click', () => {
        backdrop.querySelectorAll('#skinSwatches .fenix-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        currentConfig.skin = sw.getAttribute('data-skin');
        renderPreview();
      });
    });

    backdrop.querySelector('#avHairStyleSelect')?.addEventListener('change', (e) => {
      currentConfig.hairStyle = e.target.value;
      renderPreview();
    });

    backdrop.querySelectorAll('#hairColorSwatches [data-hair-color]').forEach(sw => {
      sw.addEventListener('click', () => {
        backdrop.querySelectorAll('#hairColorSwatches .fenix-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        currentConfig.hairColor = sw.getAttribute('data-hair-color');
        renderPreview();
      });
    });

    backdrop.querySelector('#avRoleInput')?.addEventListener('input', (e) => {
      agent.role = e.target.value;
    });

    backdrop.querySelector('#avOutfitSelect')?.addEventListener('change', (e) => {
      currentConfig.outfit = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avOutfitColorInput')?.addEventListener('input', (e) => {
      currentConfig.outfitColor = e.target.value;
      currentConfig.shirtColor = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avPantsColorInput')?.addEventListener('input', (e) => {
      currentConfig.pantsColor = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avShoesColorInput')?.addEventListener('input', (e) => {
      currentConfig.shoesColor = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avAccessorySelect')?.addEventListener('change', (e) => {
      currentConfig.accessory = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#avBadgeSelect')?.addEventListener('change', (e) => {
      currentConfig.badge = e.target.value;
      renderPreview();
    });

    backdrop.querySelector('#btnAvSave')?.addEventListener('click', async () => {
      const newDisplayName = backdrop.querySelector('#avDisplayNameInput')?.value?.trim() || agent.name;
      const newRole = backdrop.querySelector('#avRoleInput')?.value?.trim() || agent.role;
      const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
      const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };

      await fetch(`/api/v2/agents/${encodeURIComponent(agent.id)}/profile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          displayName: newDisplayName,
          role: newRole,
          avatar: currentConfig
        })
      }).catch(() => {});

      agent.displayName = newDisplayName;
      agent.name = newDisplayName;
      agent.role = newRole;
      agent.avatar = { ...currentConfig };
      this.syncRealData();
      close();
    });
  }

  _openCreateAgentWizard() {
    let currentStep = 1;
    const stepTitles = [
      'Identidade Básica',
      'Distrito Operacional',
      'Cargo & Especialização',
      'Modelo Cognitivo (LLM)',
      'System Prompt & Diretrizes',
      'Skills & Autonomia',
      'Memória & Contexto',
      'Avatar: Pele & Cabelo',
      'Avatar: Traje & Badges',
      'Revisão & Ativação'
    ];

    const wizardData = {
      name: 'Agent-' + Math.floor(100 + _pseudoRandom() * 900),
      displayName: '',
      district: 'DEVELOPMENT',
      role: 'developer',
      seniority: 'senior',
      model: 'auto',
      temperature: 0.7,
      systemPrompt: 'Você é um agente autônomo do FÊNIX OS, operando com máxima fidelidade às regras do sistema.',
      skills: ['git', 'browser', 'terminal'],
      memoryMode: 'episodic',
      avatar: {
        skin: 'light',
        hairStyle: 'spiky',
        hairColor: 'black',
        outfit: 'hoodie',
        shirtColor: '#8b5cf6',
        outfitColor: '#8b5cf6',
        pantsColor: '#1e293b',
        shoesColor: '#090d16',
        accessory: 'none',
        badge: 'bronze'
      }
    };

    const backdrop = document.createElement('div');
    backdrop.className = 'fenix-avatar-modal-backdrop';
    backdrop.innerHTML = `
      <div class="fenix-avatar-modal" style="max-width: 640px; width: 95%;">
        <div class="fenix-avatar-modal-head">
          <h3>➕ WIZARD: CRIAR NOVO AGENTE</h3>
          <button class="fenix-avatar-preview-btn" id="btnWizClose">✕</button>
        </div>
        <div style="padding: 12px 18px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span id="wizStepLabel" style="font-size: 11px; font-weight: 700; color: #38bdf8; font-family: monospace;">ETAPA 1 DE 10: IDENTIDADE BÁSICA</span>
            <span id="wizStepCount" style="font-size: 10px; color: #94a3b8; font-family: monospace;">10%</span>
          </div>
          <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div id="wizProgressBar" style="height: 100%; width: 10%; background: linear-gradient(90deg, #ef4444, #38bdf8); transition: width 0.3s ease;"></div>
          </div>
        </div>
        <div class="fenix-avatar-modal-body" id="wizBody" style="min-height: 290px; padding: 18px;">
          <!-- Step content injected dynamically -->
        </div>
        <div class="fenix-avatar-modal-footer">
          <button class="fenix-avatar-preview-btn" id="btnWizPrev" style="display: none;">← Voltar</button>
          <button class="fenix-avatar-preview-btn" id="btnWizNext" style="background: rgba(239, 68, 68, 0.25); border-color: #ef4444; color: #fff; font-weight: 800;">Avançar →</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('#btnWizClose')?.addEventListener('click', close);

    const renderStep = () => {
      const body = backdrop.querySelector('#wizBody');
      const prevBtn = backdrop.querySelector('#btnWizPrev');
      const nextBtn = backdrop.querySelector('#btnWizNext');
      const stepLabel = backdrop.querySelector('#wizStepLabel');
      const stepCount = backdrop.querySelector('#wizStepCount');
      const progressBar = backdrop.querySelector('#wizProgressBar');
      if (!body) return;

      if (stepLabel) stepLabel.textContent = `ETAPA ${currentStep} DE 10: ${stepTitles[currentStep - 1].toUpperCase()}`;
      if (stepCount) stepCount.textContent = `${currentStep * 10}%`;
      if (progressBar) progressBar.style.width = `${currentStep * 10}%`;

      if (prevBtn) prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
      if (nextBtn) {
        if (currentStep === 10) {
          nextBtn.textContent = '⚡ ATIVAR E SPAWNAR NA CIDADE';
          nextBtn.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(56, 189, 248, 0.4))';
        } else {
          nextBtn.textContent = 'Avançar →';
          nextBtn.style.background = 'rgba(239, 68, 68, 0.25)';
        }
      }

      if (currentStep === 1) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>ID / NOME DO AGENTE:</label>
              <input type="text" id="wizAgentName" class="fenix-avatar-input" value="${wizardData.name}" placeholder="Ex: Sentinel-Core" />
            </div>
            <div class="fenix-avatar-field-row">
              <label>NOME DE EXIBIÇÃO:</label>
              <input type="text" id="wizAgentDisplay" class="fenix-avatar-input" value="${wizardData.displayName || wizardData.name}" placeholder="Ex: Sentinel Core" />
            </div>
            <div style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin-top: 8px;">
              O ID será utilizado para roteamento em handoffs, despachos e chamadas via terminal e WebSocket.
            </div>
          </div>
        `;
      } else if (currentStep === 2) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>DISTRITO OPERACIONAL:</label>
              <select id="wizAgentDistrict" class="fenix-avatar-select">
                ${Object.values(this.DISTRICTS).map(d => `<option value="${d.id}" ${d.id === wizardData.district ? 'selected' : ''}>${d.emoji || ''} ${d.name}</option>`).join('')}
              </select>
            </div>
            <div id="wizDistDesc" style="font-size: 11px; color: #38bdf8; line-height: 1.5; background: rgba(56,189,248,0.08); padding: 10px; border-radius: 6px; border: 1px solid rgba(56,189,248,0.2);">
              Distrito onde o agente possui sua estação base e se locomove durante ciclos ociosos.
            </div>
          </div>
        `;
      } else if (currentStep === 3) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>CARGO / ESPECIALIZAÇÃO:</label>
              <select id="wizAgentRole" class="fenix-avatar-select">
                <option value="developer" ${wizardData.role === 'developer' ? 'selected' : ''}>DEVELOPER (Engenharia de Software)</option>
                <option value="frontend" ${wizardData.role === 'frontend' ? 'selected' : ''}>FRONTEND (UI/UX & Canvas 2.5D)</option>
                <option value="backend" ${wizardData.role === 'backend' ? 'selected' : ''}>BACKEND (APIs, Runtimes & Jobs)</option>
                <option value="database" ${wizardData.role === 'database' ? 'selected' : ''}>DATABASE (SQLite, Índices & Cache)</option>
                <option value="qa" ${wizardData.role === 'qa' ? 'selected' : ''}>QA AUTOMATION (Playwright & Layout Gate)</option>
                <option value="security" ${wizardData.role === 'security' ? 'selected' : ''}>SECURITY (Governança, RBAC & Kill Switch)</option>
                <option value="devops" ${wizardData.role === 'devops' ? 'selected' : ''}>DEVOPS (CI/CD, Build & Observabilidade)</option>
                <option value="research" ${wizardData.role === 'research' ? 'selected' : ''}>RESEARCH (Inteligência & Avaliação)</option>
                <option value="architect" ${wizardData.role === 'architect' ? 'selected' : ''}>ARCHITECT (Design de Sistemas & Contratos)</option>
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>SENIORIDADE OPERACIONAL:</label>
              <select id="wizAgentSeniority" class="fenix-avatar-select">
                <option value="junior" ${wizardData.seniority === 'junior' ? 'selected' : ''}>JUNIOR (Autonomia Assistida)</option>
                <option value="pleno" ${wizardData.seniority === 'pleno' ? 'selected' : ''}>PLENO (Execução Padrão)</option>
                <option value="senior" ${wizardData.seniority === 'senior' ? 'selected' : ''}>SENIOR (Autonomia Ampla)</option>
                <option value="lead" ${wizardData.seniority === 'lead' ? 'selected' : ''}>LEAD (Coordenação de Squads)</option>
                <option value="principal" ${wizardData.seniority === 'principal' ? 'selected' : ''}>PRINCIPAL (Decisão Arquitetural)</option>
              </select>
            </div>
          </div>
        `;
      } else if (currentStep === 4) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>MODELO DE INTELIGÊNCIA:</label>
              <select id="wizAgentModel" class="fenix-avatar-select">
                <option value="auto" ${wizardData.model === 'auto' ? 'selected' : ''}>Auto / Smart Router (Híbrido Inteligente)</option>
                <option value="ollama/qwen2.5-coder:7b" ${wizardData.model.includes('qwen') ? 'selected' : ''}>Ollama / Qwen 2.5 Coder (100% Local / Offline)</option>
                <option value="claude-3-5-sonnet" ${wizardData.model.includes('claude') ? 'selected' : ''}>Claude 3.5 Sonnet (Máxima Precisão de Código)</option>
                <option value="gpt-4o" ${wizardData.model.includes('gpt') ? 'selected' : ''}>GPT-4o (Raciocínio Rápido & Multimodal)</option>
                <option value="gemini-1.5-pro" ${wizardData.model.includes('gemini') ? 'selected' : ''}>Gemini 1.5 Pro (Contexto Gigante 1M+)</option>
              </select>
            </div>
            <div class="fenix-avatar-field-row">
              <label>TEMPERATURA COGNITIVA:</label>
              <select id="wizAgentTemp" class="fenix-avatar-select">
                <option value="0.2" ${wizardData.temperature === 0.2 ? 'selected' : ''}>0.2 - Determinístico & Preciso (Refatorações)</option>
                <option value="0.7" ${wizardData.temperature === 0.7 ? 'selected' : ''}>0.7 - Balanceado (Engenharia Geral)</option>
                <option value="1.0" ${wizardData.temperature === 1.0 ? 'selected' : ''}>1.0 - Criativo (Exploração & Design)</option>
              </select>
            </div>
          </div>
        `;
      } else if (currentStep === 5) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">SYSTEM PROMPT & DIRETRIZES FUNDAMENTAIS:</label>
            <textarea id="wizAgentPrompt" class="fenix-avatar-input" rows="6" style="resize: vertical; font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.4;">${wizardData.systemPrompt}</textarea>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <input type="checkbox" id="wizStrictGovernance" checked />
              <label for="wizStrictGovernance" style="font-size: 11px; color: #cbd5e1; cursor: pointer;">Respeitar governança, Kill Switch e Layout Gate estrito</label>
            </div>
          </div>
        `;
      } else if (currentStep === 6) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
            <label style="font-size: 11px; color: #94a3b8; font-family: monospace;">SKILLS & PERMISSÕES AUTORIZADAS:</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillGit" checked /> Git & Controle de Versão
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillBrowser" checked /> Browser QA & Playwright
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillTerminal" checked /> Terminal & Execução Shell
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillDatabase" checked /> Banco de Dados & SQLite
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillMcp" checked /> Protocolo MCP & Connectors
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="skillNetwork" checked /> Rede & Chamadas HTTP
              </label>
            </div>
          </div>
        `;
      } else if (currentStep === 7) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            <div class="fenix-avatar-field-row">
              <label>SISTEMA DE MEMÓRIA:</label>
              <select id="wizMemoryMode" class="fenix-avatar-select">
                <option value="episodic" ${wizardData.memoryMode === 'episodic' ? 'selected' : ''}>Episódica (Armazena missões, checkpoints e histórico)</option>
                <option value="semantic" ${wizardData.memoryMode === 'semantic' ? 'selected' : ''}>Semântica / Vetorial (Embeddings + Busca RAG)</option>
                <option value="ephemeral" ${wizardData.memoryMode === 'ephemeral' ? 'selected' : ''}>Efêmera (Volátil apenas para a sessão atual)</option>
              </select>
            </div>
            <div style="font-size: 11px; color: #94a3b8; line-height: 1.5; background: rgba(255,255,255,0.04); padding: 10px; border-radius: 6px;">
              A memória episódica conecta-se diretamente ao Engineering Memory persistente em SQLite.
            </div>
          </div>
        `;
      } else if (currentStep === 8) {
        body.innerHTML = `
          <div style="display: flex; gap: 16px; width: 100%;">
            <canvas id="wizAvCanvas8" width="140" height="170" class="fenix-avatar-preview-canvas" style="flex: 0 0 140px;"></canvas>
            <div style="display: flex; flex-direction: column; gap: 10px; flex: 1;">
              <div class="fenix-avatar-field-row">
                <label>PELE:</label>
                <select id="wizSkinSelect" class="fenix-avatar-select">
                  ${Object.keys(AVATAR_PALETTES.skins).map(k => `<option value="${k}" ${k === wizardData.avatar.skin ? 'selected' : ''}>${k.toUpperCase()}</option>`).join('')}
                </select>
              </div>
              <div class="fenix-avatar-field-row">
                <label>ESTILO CABELO:</label>
                <select id="wizHairStyleSelect" class="fenix-avatar-select">
                  ${AVATAR_PALETTES.hairStyles.map(h => `<option value="${h}" ${h === wizardData.avatar.hairStyle ? 'selected' : ''}>${h.toUpperCase()}</option>`).join('')}
                </select>
              </div>
              <div class="fenix-avatar-field-row">
                <label>COR CABELO:</label>
                <select id="wizHairColorSelect" class="fenix-avatar-select">
                  ${Object.keys(AVATAR_PALETTES.hairColors).map(c => `<option value="${c}" ${c === wizardData.avatar.hairColor ? 'selected' : ''}>${c.toUpperCase()}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        `;
        setTimeout(() => {
          const wCanvas = backdrop.querySelector('#wizAvCanvas8');
          const wCtx = wCanvas?.getContext('2d');
          if (wCtx) {
            PixelAvatarRenderer.drawAvatar(wCtx, {
              x: 70, y: 125, zoom: 2.2, facing: 'SE', state: 'idle',
              config: wizardData.avatar, color: wizardData.avatar.shirtColor || '#8b5cf6', time: 0
            });
          }
          backdrop.querySelector('#wizSkinSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.skin = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizHairStyleSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.hairStyle = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizHairColorSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.hairColor = e.target.value;
            renderStep();
          });
        }, 30);
      } else if (currentStep === 9) {
        body.innerHTML = `
          <div style="display: flex; gap: 16px; width: 100%;">
            <canvas id="wizAvCanvas9" width="140" height="170" class="fenix-avatar-preview-canvas" style="flex: 0 0 140px;"></canvas>
            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
              <div class="fenix-avatar-field-row">
                <label>TRAJE:</label>
                <select id="wizOutfitSelect" class="fenix-avatar-select">
                  ${AVATAR_PALETTES.outfits.map(o => `<option value="${o}" ${o === wizardData.avatar.outfit ? 'selected' : ''}>${o.toUpperCase()}</option>`).join('')}
                </select>
              </div>
              <div class="fenix-avatar-field-row">
                <label>COR CAMISA:</label>
                <input type="color" id="wizShirtColor" value="${wizardData.avatar.shirtColor || '#8b5cf6'}" class="fenix-avatar-input" style="height: 26px; padding: 2px 4px;" />
              </div>
              <div class="fenix-avatar-field-row">
                <label>COR CALÇA:</label>
                <input type="color" id="wizPantsColor" value="${wizardData.avatar.pantsColor || '#1e293b'}" class="fenix-avatar-input" style="height: 26px; padding: 2px 4px;" />
              </div>
              <div class="fenix-avatar-field-row">
                <label>ACESSÓRIO:</label>
                <select id="wizAccessorySelect" class="fenix-avatar-select">
                  ${AVATAR_PALETTES.accessories.map(a => `<option value="${a}" ${a === wizardData.avatar.accessory ? 'selected' : ''}>${a.toUpperCase()}</option>`).join('')}
                </select>
              </div>
              <div class="fenix-avatar-field-row">
                <label>INSÍGNIA:</label>
                <select id="wizBadgeSelect" class="fenix-avatar-select">
                  <option value="none" ${wizardData.avatar.badge === 'none' ? 'selected' : ''}>Nenhuma</option>
                  <option value="bronze" ${wizardData.avatar.badge === 'bronze' ? 'selected' : ''}>🥉 Bronze</option>
                  <option value="silver" ${wizardData.avatar.badge === 'silver' ? 'selected' : ''}>🥈 Prata</option>
                  <option value="gold" ${wizardData.avatar.badge === 'gold' ? 'selected' : ''}>🥇 Ouro</option>
                  <option value="diamond" ${wizardData.avatar.badge === 'diamond' ? 'selected' : ''}>💎 Diamante</option>
                  <option value="master" ${wizardData.avatar.badge === 'master' ? 'selected' : ''}>🔥 Mestre</option>
                </select>
              </div>
            </div>
          </div>
        `;
        setTimeout(() => {
          const wCanvas = backdrop.querySelector('#wizAvCanvas9');
          const wCtx = wCanvas?.getContext('2d');
          if (wCtx) {
            PixelAvatarRenderer.drawAvatar(wCtx, {
              x: 70, y: 125, zoom: 2.2, facing: 'SE', state: 'idle',
              config: wizardData.avatar, color: wizardData.avatar.shirtColor || '#8b5cf6', time: 0
            });
          }
          backdrop.querySelector('#wizOutfitSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.outfit = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizShirtColor')?.addEventListener('input', (e) => {
            wizardData.avatar.shirtColor = e.target.value;
            wizardData.avatar.outfitColor = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizPantsColor')?.addEventListener('input', (e) => {
            wizardData.avatar.pantsColor = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizAccessorySelect')?.addEventListener('change', (e) => {
            wizardData.avatar.accessory = e.target.value;
            renderStep();
          });
          backdrop.querySelector('#wizBadgeSelect')?.addEventListener('change', (e) => {
            wizardData.avatar.badge = e.target.value;
            renderStep();
          });
        }, 30);
      } else if (currentStep === 10) {
        body.innerHTML = `
          <div style="display: flex; gap: 16px; width: 100%;">
            <canvas id="wizAvCanvas10" width="140" height="170" class="fenix-avatar-preview-canvas" style="flex: 0 0 140px;"></canvas>
            <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; font-size: 11px; color: #cbd5e1; font-family: monospace;">
              <div style="font-weight: 800; color: #38bdf8; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                ${wizardData.displayName || wizardData.name}
              </div>
              <div><strong>ID:</strong> ${wizardData.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}</div>
              <div><strong>DISTRITO:</strong> ${wizardData.district}</div>
              <div><strong>ROLE:</strong> ${wizardData.role.toUpperCase()} (${wizardData.seniority.toUpperCase()})</div>
              <div><strong>MODELO:</strong> ${wizardData.model}</div>
              <div><strong>MEMÓRIA:</strong> ${wizardData.memoryMode.toUpperCase()}</div>
              <div><strong>BADGE:</strong> ${wizardData.avatar.badge.toUpperCase()}</div>
              <div style="color: #22c55e; font-weight: 700; margin-top: 6px;">
                ✓ Pronto para spawnar na AI City viva.
              </div>
            </div>
          </div>
        `;
        setTimeout(() => {
          const wCanvas = backdrop.querySelector('#wizAvCanvas10');
          const wCtx = wCanvas?.getContext('2d');
          if (wCtx) {
            PixelAvatarRenderer.drawAvatar(wCtx, {
              x: 70, y: 125, zoom: 2.2, facing: 'SE', state: 'idle',
              config: wizardData.avatar, color: wizardData.avatar.shirtColor || '#8b5cf6', time: 0
            });
          }
        }, 30);
      }
    };

    renderStep();

    backdrop.querySelector('#btnWizPrev')?.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        renderStep();
      }
    });

    backdrop.querySelector('#btnWizNext')?.addEventListener('click', async () => {
      if (currentStep === 1) {
        wizardData.name = backdrop.querySelector('#wizAgentName')?.value?.trim() || wizardData.name;
        wizardData.displayName = backdrop.querySelector('#wizAgentDisplay')?.value?.trim() || wizardData.name;
        currentStep++;
        renderStep();
      } else if (currentStep === 2) {
        wizardData.district = backdrop.querySelector('#wizAgentDistrict')?.value || wizardData.district;
        currentStep++;
        renderStep();
      } else if (currentStep === 3) {
        wizardData.role = backdrop.querySelector('#wizAgentRole')?.value || wizardData.role;
        wizardData.seniority = backdrop.querySelector('#wizAgentSeniority')?.value || wizardData.seniority;
        currentStep++;
        renderStep();
      } else if (currentStep === 4) {
        wizardData.model = backdrop.querySelector('#wizAgentModel')?.value || wizardData.model;
        wizardData.temperature = parseFloat(backdrop.querySelector('#wizAgentTemp')?.value || '0.7');
        currentStep++;
        renderStep();
      } else if (currentStep === 5) {
        wizardData.systemPrompt = backdrop.querySelector('#wizAgentPrompt')?.value || wizardData.systemPrompt;
        currentStep++;
        renderStep();
      } else if (currentStep === 6) {
        currentStep++;
        renderStep();
      } else if (currentStep === 7) {
        wizardData.memoryMode = backdrop.querySelector('#wizMemoryMode')?.value || wizardData.memoryMode;
        currentStep++;
        renderStep();
      } else if (currentStep === 8) {
        currentStep++;
        renderStep();
      } else if (currentStep === 9) {
        currentStep++;
        renderStep();
      } else if (currentStep === 10) {
        const agentId = wizardData.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };
        try {
          await fetch('/api/v2/agents', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              id: agentId,
              name: wizardData.name,
              displayName: wizardData.displayName || wizardData.name,
              role: wizardData.role,
              seniority: wizardData.seniority,
              district: wizardData.district,
              model: wizardData.model,
              systemPrompt: wizardData.systemPrompt,
              memoryMode: wizardData.memoryMode,
              avatar: wizardData.avatar
            })
          });
          await this.syncRealData();
          const targetDist = this.DISTRICTS[wizardData.district] || this.DISTRICTS.CENTRAL;
          this.spawnAnimation({
            id: agentId,
            name: wizardData.name,
            x: targetDist.x,
            y: targetDist.y
          });
        } catch(e) {}
        close();
      }
    });
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
    const scaleX = mw / 34, scaleY = mh / 30;
    for (const d of Object.values(this.DISTRICTS)) {
      const px = mx + (d.x + 17) * scaleX - d.w*scaleX/2;
      const py = my + (d.y + 15) * scaleY - d.h*scaleY/2;
      ctx.fillStyle = d.color + '70';
      ctx.fillRect(px, py, d.w*scaleX, d.h*scaleY);
    }
    // Agents on minimap
    for (const a of this.world.agents.values()) {
      const px = mx + (a.x + 17) * scaleX;
      const py = my + (a.y + 15) * scaleY;
      ctx.fillStyle = a.color;
      ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
    }
    // Viewport indicator
    const vx = -this.state.camera.x / (this.state.tileSize * this.state.camera.zoom);
    const vy = -this.state.camera.y / (this.state.tileSize * this.state.camera.zoom * 0.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth=1;
    const vPx = mx + (vx + 17) * scaleX - 10, vPy = my + (vy + 15) * scaleY - 7;
    ctx.strokeRect(vPx, vPy, 20, 14);

    ctx.restore();
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    document.querySelectorAll('.city-cam-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'OBSERVER') {
      this.state.followAgentId = null;
      this.state.targetCamera.zoom = 1.35;
      const btn = document.getElementById('btnCameraObserver');
      if (btn) { btn.classList.add('active'); btn.style.background = '#3b82f6'; }
    } else if (mode === 'COMMAND') {
      const active = [...this.world.agents.values()].find(a => ['WORKING','RUNNING','CODING','TESTING'].includes(String(a.status).toUpperCase())) || [...this.world.agents.values()][0];
      if (active) this.focusAgent(active.id);
      const btn = document.getElementById('btnCameraCommand');
      if (btn) { btn.classList.add('active'); btn.style.background = '#3b82f6'; }
    } else if (mode === 'CINEMATIC') {
      this.state.followAgentId = null;
      this.state.targetCamera.zoom = 1.25;
      const btn = document.getElementById('btnCameraCinematic');
      if (btn) { btn.classList.add('active'); btn.style.background = '#3b82f6'; }
    }
  }

  panToDistrict(districtId) {
    if (districtId === 'ALL') {
      this.state.followAgentId = null;
      this.state.selectedAgent = null;
      this.state.targetCamera.x = 0;
      this.state.targetCamera.y = -20;
      this.state.targetCamera.zoom = 0.45;
      this._updateZoomDisplay();
      return;
    }
    const norm = normalizeDistrict(districtId);
    const d = this.DISTRICTS[norm];
    if (d) {
      const tw = this.state.tileSize;
      const th = tw / 2;
      this.state.followAgentId = null;
      this.state.selectedAgent = null;
      const cameraPoint = this.toScreen(d.x, d.y, 0, 0, 0, 1);
      this.state.targetCamera.x = -cameraPoint.x;
      this.state.targetCamera.y = -cameraPoint.y;
      this.state.targetCamera.zoom = 1.15;
      this._updateZoomDisplay();
    }
  }

  resetCamera() {
    this.state.targetCamera.x = 0;
    this.state.targetCamera.y = -20;
    this.state.targetCamera.zoom = 1.35;
    this.state.followAgentId = null;
    this.state.selectedAgent = null;
    this._updateZoomDisplay();
  }

  toggleDayNight() {
    this.isNight = !this.isNight;
    const icon = document.getElementById('fenixCityWeatherIcon');
    const text = document.getElementById('fenixCityWeatherText');
    if (this.isNight) {
      if (icon) { icon.className = 'ph-bold ph-moon'; icon.style.color = '#FBBF24'; }
      if (text) text.textContent = 'Modo noite';
    } else {
      if (icon) { icon.className = 'ph-bold ph-sun'; icon.style.color = '#F59E0B'; }
      if (text) text.textContent = 'Modo dia';
    }
  }

  zoomStep(dir) {
    const STEPS = [0.45, 0.85, 1.35, 1.95, 2.85];
    const current = this.state.targetCamera.zoom;
    let nextIdx = 2;
    if (dir > 0) {
      nextIdx = STEPS.findIndex(s => s > current + 0.05);
      if (nextIdx === -1) nextIdx = STEPS.length - 1;
    } else {
      for (let i = STEPS.length - 1; i >= 0; i--) {
        if (STEPS[i] < current - 0.05) { nextIdx = i; break; }
      }
    }
    this.state.targetCamera.zoom = STEPS[nextIdx];
    this._updateZoomDisplay();
  }

  _updateZoomDisplay() {
    const z = this.state.targetCamera.zoom;
    let badge = 'L3 EDIFÍCIO';
    let levelStr = '1.35x';
    if (z < 0.65) { badge = 'L1 CIDADE'; levelStr = '0.45x'; }
    else if (z < 1.15) { badge = 'L2 DISTRITO'; levelStr = '0.85x'; }
    else if (z < 1.75) { badge = 'L3 EDIFÍCIO'; levelStr = '1.35x'; }
    else if (z < 2.45) { badge = 'L4 INTERIOR'; levelStr = '1.95x'; }
    else { badge = 'L5 WORKSPACE'; levelStr = '2.85x'; }

    const el = document.getElementById('cityZoomBadge');
    if (el) el.textContent = badge;
    const elLevel = document.getElementById('fenixCityZoomLevel');
    if (elLevel) elLevel.textContent = levelStr;
  }

  focusAgent(agentId) {
    if (!agentId) return;
    const target = this.world.agents.get(agentId) || [...this.world.agents.values()].find(a =>
      a.id.toLowerCase() === String(agentId).toLowerCase() || a.name.toLowerCase().includes(String(agentId).toLowerCase())
    );
    if (target) {
      this.state.selectedAgent = target;
      const tw = this.state.tileSize;
      const th = tw / 2;
      const z = 2.4;
      const rect = this.canvas.getBoundingClientRect();
      // Golden-third framing: places agent at ~38% screen width (offset -12% from center, leaving contextual space on right)
      const goldenOffsetX = Math.round(rect.width * 0.12);
      const cameraPoint = this.toScreen(target.x, target.y, 0, 0, 0, z);
      this.state.targetCamera.x = -Math.round(cameraPoint.x) - goldenOffsetX;
      this.state.targetCamera.y = -Math.round(cameraPoint.y);
      this.state.targetCamera.zoom = z;
      this._updateZoomDisplay();
      window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: target, agentId: target.id } }));
      const cx = rect.width / 2 + this.state.camera.x;
      const cy = rect.height / 2 + this.state.camera.y;
      const sc = this.toScreen(target.x, target.y, 0.22, cx, cy, z);
      if (typeof window.openSpatialAgentChat === 'function') window.openSpatialAgentChat(target, sc);
      if (typeof window.openSpatialAgentDrawer === 'function') window.openSpatialAgentDrawer(target);
    }
  }

  _adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, c =>
      ('0' + Math.min(255, Math.max(0, parseInt(c,16) + amount)).toString(16)).substr(-2)
    );
  }
}

window.IsoCityEngine = IsoCityEngine;

function bootIsoCity() {
  if (document.getElementById('cityCanvas')) {
    if (!window.fenixCity || !(window.fenixCity instanceof IsoCityEngine)) {
      window.fenixCity = new IsoCityEngine('cityCanvas');
    }
    window.fenixSetCameraMode = (mode) => window.fenixCity?.setCameraMode(mode);
    window.fenixPanToDistrict = (dist) => window.fenixCity?.panToDistrict(dist);
    window.fenixToggleDayNight = () => window.fenixCity?.toggleDayNight();
    window.fenixCityZoom = (dir) => window.fenixCity?.zoomStep(dir === 'in' ? 1 : -1);
    window.refreshCityState = () => window.fenixCity?.syncRealData();
    if (window.fenixCity && typeof window.fenixCity.resize === 'function') {
      window.fenixCity.resize();
    }
  }
}
window.bootIsoCity = bootIsoCity;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(bootIsoCity, 150), { once: true });
} else {
  setTimeout(bootIsoCity, 150);
}
