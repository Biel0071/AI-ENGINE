'use strict';

/**
 * FÊNIX OS — World State Engine (Layer 3: World State & Persistence)
 * ===================================================================
 * Canonical Living World State Manager:
 * - Maintains entities: districts, buildings, rooms, workstations, agents, vehicles, constructions, roads.
 * - Persists and rehydrates state from `ai-engine/grg/src/.data/world-state.json`.
 * - Handles atomic mutations (CREATE, UPDATE, MOVE, BUILD, SPAWN, EXPAND, ASSIGN_TASK, CHAT).
 * - Real runtime agent representations (e.g. Camila at Depósito Mais).
 */

const fs = require('fs');
const path = require('path');
const { globalBus } = require('../eventing/fenix-event-bus');

const STATE_DIR = path.join(__dirname, '..', '.data');
const STATE_FILE = path.join(STATE_DIR, 'world-state.json');

const CANONICAL_COMPANIES_DATA = {};

const CANONICAL_DISTRICTS_DATA = {
  'command-center': {
    id: 'command-center',
    name: 'Command Center & HQ',
    label: 'COMMAND CENTER',
    color: '#ef4444',
    emoji: '🏛️',
    coordinates: { x: 0, y: -5.0 },
    department: 'Orquestração Central e Governança do Kernel',
    buildings: ['bld-fenix-hq']
  },
  'dev-district': {
    id: 'dev-district',
    name: 'Dev District & Engineering',
    label: 'ENGINEERING & APIS',
    color: '#10b981',
    emoji: '💻',
    coordinates: { x: -6.5, y: 3.5 },
    department: 'Engenharia de Software, APIs, Runtime e Qualidade',
    buildings: ['bld-dev-loft', 'bld-api-platform']
  },
  'industrial': {
    id: 'industrial',
    name: 'Distrito Industrial',
    label: 'INDUSTRIAL HUB',
    color: '#f59e0b',
    emoji: '📦',
    coordinates: { x: 6.0, y: -2.5 },
    department: 'Logística de Armazenagem, WMS & Distribuição',
    buildings: []
  },
  'ai-district': {
    id: 'ai-district',
    name: 'AI District',
    label: 'AI DISTRICT',
    color: '#a855f7',
    emoji: '🧠',
    coordinates: { x: 8.0, y: -5.5 },
    department: 'Inteligência Artificial, Modelos Cognitivos e RAG',
    buildings: ['bld-ai-nexus']
  },
  'data-center': {
    id: 'data-center',
    name: 'Data Center & Neural Vault',
    label: 'DATA CENTER',
    color: '#3b82f6',
    emoji: '🗄️',
    coordinates: { x: 7.5, y: 4.0 },
    department: 'Persistência Relacional, Memória Episódica e Segurança',
    buildings: ['bld-data-center']
  },
  'observatory': {
    id: 'observatory',
    name: 'Observatory & SRE',
    label: 'OBSERVATORY',
    color: '#6366f1',
    emoji: '🔭',
    coordinates: { x: 0, y: -11.0 },
    department: 'Telemetria, Observabilidade, Traces e CI/CD',
    buildings: ['bld-observatory']
  },
  'research': {
    id: 'research',
    name: 'P&D & Bio-Inovação',
    label: 'RESEARCH & LABS',
    color: '#8b5cf6',
    emoji: '🔬',
    coordinates: { x: -6.0, y: -8.0 },
    department: 'Pesquisa Científica, LLMs & Bio-Computação',
    buildings: ['bld-research-lab']
  },
  'porto': {
    id: 'porto',
    name: 'Porto Digital',
    label: 'PORTO DIGITAL',
    color: '#0284c7',
    emoji: '🚢',
    coordinates: { x: 12.0, y: -4.0 },
    department: 'Integrações Externas, Webhooks & Exportação',
    buildings: ['bld-porto-terminal']
  },
  'project-district': {
    id: 'project-district',
    name: 'Project District',
    label: 'PROJECT DISTRICT',
    color: '#06b6d4',
    emoji: '📁',
    coordinates: { x: 9.0, y: -7.5 },
    department: 'Gerenciamento de Projetos e Workspaces Ativos',
    buildings: ['bld-project-forge']
  },
  'creative-district': {
    id: 'creative-district',
    name: 'Creative District',
    label: 'CREATIVE DISTRICT',
    color: '#ec4899',
    emoji: '🎨',
    coordinates: { x: -8.5, y: -1.0 },
    department: 'Design System, Interfaces, UX e Componentes Visuais',
    buildings: ['bld-creative-studio']
  },
  'residential': {
    id: 'residential',
    name: 'Vila dos Agentes',
    label: 'RESIDENTIAL',
    color: '#14b8a6',
    emoji: '🏡',
    coordinates: { x: -9.5, y: -5.5 },
    department: 'Living Pods e Standby de Agentes',
    buildings: ['bld-living-pods']
  },
  'business': {
    id: 'business',
    name: 'Distrito Financeiro & Fintech',
    label: 'BUSINESS & FINANCE',
    color: '#eab308',
    emoji: '💼',
    coordinates: { x: 1.5, y: 5.0 },
    department: 'Pagamentos, Contratos & Token Economy',
    buildings: []
  },
  'security': {
    id: 'security',
    name: 'Fortaleza de Segurança',
    label: 'SECURITY CITADEL',
    color: '#e11d48',
    emoji: '🛡️',
    coordinates: { x: 8.5, y: 0.5 },
    department: 'Zero-Trust, Firewall de Tokens & Sandbox Guard',
    buildings: ['bld-security-citadel']
  },
  'hospital': {
    id: 'hospital',
    name: 'Hospital do Sistema & Auto-Cura',
    label: 'HEALTH & RECOVERY',
    color: '#22c55e',
    emoji: '🏥',
    coordinates: { x: 5.0, y: 8.5 },
    department: 'Auto-Cura, Self-Healing e Mitigação de Falhas',
    buildings: ['bld-hospital']
  },
  'shopping': {
    id: 'shopping',
    name: 'Marketplace Fênix & Skills',
    label: 'MARKETPLACE & TOOLS',
    color: '#d946ef',
    emoji: '🛍️',
    coordinates: { x: -2.0, y: 8.5 },
    department: 'Loja de Habilidades, Ferramentas MCP & Modelos',
    buildings: ['bld-marketplace']
  },
  'praca-central': {
    id: 'praca-central',
    name: 'Praça Central & Fórum',
    label: 'FORUM & AGORA',
    color: '#f97316',
    emoji: '⛲',
    coordinates: { x: 0, y: 0 },
    department: 'Ponto de Encontro e Deliberação Cívica',
    buildings: ['bld-obelisco']
  },
  'praia': {
    id: 'praia',
    name: 'Praia Digital & Marina',
    label: 'PRAIA & LAZER',
    color: '#06b6d4',
    emoji: '🏖️',
    coordinates: { x: -11.0, y: 8.5 },
    department: 'Zona de Lazer e Cabo Submarino de Fibra',
    buildings: ['bld-pier-fibra']
  }
};

const CANONICAL_BUILDINGS_DATA = {
  'bld-api-platform': {
    id: 'bld-api-platform',
    name: 'API Platform Gateway',
    label: 'API PLATFORM',
    companyId: 'api-platform',
    district: 'api-platform',
    floors: 4,
    coordinates: { x: -18.0, y: 0, z: 2.0 },
    color: '#0284c7'
  },
  'bld-deposito-mais': {
    id: 'bld-deposito-mais',
    name: 'Depósito Mais Logística WMS',
    label: 'DEPÓSITO MAIS',
    companyId: 'deposito-mais',
    district: 'logistics',
    floors: 2,
    coordinates: { x: 26.0, y: 0, z: -10.0 },
    color: '#f59e0b'
  },
  'bld-fenix-hq': {
    id: 'bld-fenix-hq',
    name: 'QG Fênix Command Center',
    label: 'FÊNIX HQ',
    companyId: 'fenix-enterprise',
    district: 'command-center',
    floors: 5,
    coordinates: { x: 0.0, y: 0, z: 0.0 },
    color: '#3b82f6'
  },
  'bld-dev-loft': {
    id: 'bld-dev-loft',
    name: 'Dev District Forge',
    label: 'DEV FORGE',
    companyId: 'dev-core',
    district: 'dev-district',
    floors: 3,
    coordinates: { x: -44.0, y: 0, z: 14.0 },
    color: '#10b981'
  },
  'bld-ai-nexus': {
    id: 'bld-ai-nexus',
    name: 'AI Nexus R&D',
    label: 'AI NEXUS',
    companyId: 'ai-core',
    district: 'ai-district',
    floors: 4,
    coordinates: { x: -22.0, y: 0, z: -18.0 },
    color: '#8b5cf6'
  }
};
const CANONICAL_WORKSTATIONS_DATA = {};
const CANONICAL_AGENTS_DATA = {};
const CANONICAL_VEHICLES_DATA = {};
const CANONICAL_CONSTRUCTIONS_DATA = {};

class WorldStateEngine {
  constructor() {
    this.version = '3.0.0';
    this.worldTime = {
      tick: 1,
      epoch: Date.now(),
      timeOfDay: 'DAY',
      weather: 'CLEAR',
      lastTick: new Date().toISOString()
    };
    this.companies = { ...CANONICAL_COMPANIES_DATA };
    this.districts = { ...CANONICAL_DISTRICTS_DATA };
    this.buildings = { ...CANONICAL_BUILDINGS_DATA };
    this.workstations = { ...CANONICAL_WORKSTATIONS_DATA };
    this.agents = { ...CANONICAL_AGENTS_DATA };
    this.vehicles = { ...CANONICAL_VEHICLES_DATA };
    this.constructions = { ...CANONICAL_CONSTRUCTIONS_DATA };
    this.mutationLog = [];
    this._persistTimeout = null;
    this.isInitialized = false;

    this.initialize();
  }

  initialize() {
    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }

      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version) {
          this.worldTime = { ...this.worldTime, ...(parsed.worldTime || {}) };
          this.districts = { ...CANONICAL_DISTRICTS_DATA, ...(parsed.districts || {}) };
          this.companies = { ...CANONICAL_COMPANIES_DATA, ...(parsed.companies || {}) };
          this.buildings = { ...CANONICAL_BUILDINGS_DATA };
          for (const [bk, bld] of Object.entries(parsed.buildings || {})) {
            if (bld && (bld.sourceId || bld.projectId || bld.companyId || bld.id)) {
              this.buildings[bk] = bld;
            }
          }
          this.workstations = { ...CANONICAL_WORKSTATIONS_DATA, ...(parsed.workstations || {}) };
          this.agents = { ...CANONICAL_AGENTS_DATA };
          for (const [ak, ag] of Object.entries(parsed.agents || {})) {
            if (ag && (ag.sourceId || ag.agentId || ag.id)) {
              this.agents[ak] = ag;
            }
          }
          this.vehicles = { ...CANONICAL_VEHICLES_DATA, ...(parsed.vehicles || {}) };
          this.constructions = { ...CANONICAL_CONSTRUCTIONS_DATA, ...(parsed.constructions || {}) };
          this.mutationLog = Array.isArray(parsed.mutationLog) ? parsed.mutationLog.slice(-100) : [];
          this.isInitialized = true;
          return;
        }
      }
    } catch (err) {
      // Revert to clean canonical seed
    }

    this.isInitialized = true;
    this.schedulePersist();
  }

  schedulePersist() {
    if (this._persistTimeout) return;
    this._persistTimeout = setTimeout(() => {
      this._persistTimeout = null;
      this.persist();
    }, 500);
    if (this._persistTimeout && this._persistTimeout.unref) {
      this._persistTimeout.unref();
    }
  }

  getStateFilePath() {
    return STATE_FILE;
  }

  persistState() {
    return this.persist();
  }

  persist() {
    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }
      const data = {
        version: this.version,
        savedAt: new Date().toISOString(),
        worldTime: this.worldTime,
        companies: this.companies,
        districts: this.districts,
        buildings: this.buildings,
        workstations: this.workstations,
        agents: this.agents,
        vehicles: this.vehicles,
        constructions: this.constructions,
        mutationLog: this.mutationLog.slice(-100)
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (_) {}
  }

  registerEntity(entity) {
    if (!entity || !entity.sourceId) {
      // Rule 11: Se não existir sourceId: NÃO RENDERIZAR.
      return null;
    }
    const entityId = entity.entityId || `world_${String(entity.sourceType || 'entity').toLowerCase()}_${entity.sourceId}`;
    const record = {
      entityId,
      entityType: entity.entityType || entity.sourceType || 'ENTITY',
      sourceId: entity.sourceId,
      sourceType: entity.sourceType || 'UNKNOWN',
      companyId: entity.companyId || null,
      agentId: entity.agentId || null,
      projectId: entity.projectId || null,
      status: entity.status || 'ACTIVE',
      position: entity.position || entity.coordinates || { x: 0, y: 0 },
      lastEvent: entity.lastEvent || null,
      createdFrom: entity.createdFrom || 'registry',
      updatedAt: new Date().toISOString()
    };
    return record;
  }

  getSnapshot() {
    return {
      version: this.version,
      worldTime: this.worldTime,
      counts: {
        companies: Object.keys(this.companies).length,
        districts: Object.keys(this.districts).length,
        buildings: Object.keys(this.buildings).length,
        workstations: Object.keys(this.workstations).length,
        agents: Object.keys(this.agents).length,
        vehicles: Object.keys(this.vehicles).length,
        constructions: Object.keys(this.constructions).length,
        mutations: this.mutationLog.length
      },
      companies: Object.values(this.companies),
      companiesMap: this.companies,
      districts: this.districts,
      buildings: this.buildings,
      workstations: Object.values(this.workstations),
      workstationsMap: this.workstations,
      agents: Object.values(this.agents),
      agentsMap: this.agents,
      vehicles: Object.values(this.vehicles),
      vehiclesMap: this.vehicles,
      constructions: Object.values(this.constructions),
      constructionsMap: this.constructions,
      recentMutations: this.mutationLog.slice(-20)
    };
  }

  findCompany(rawId) {
    if (!rawId) return null;
    const query = String(rawId).toLowerCase().trim();
    if (this.companies[query]) return this.companies[query];
    for (const [key, comp] of Object.entries(this.companies)) {
      if (key.toLowerCase() === query) return comp;
      if (String(comp.name || '').toLowerCase().includes(query)) return comp;
      if (String(comp.companyType || '').toLowerCase() === query) return comp;
    }
    return null;
  }

  getCompanyHierarchy(rawId) {
    const comp = this.findCompany(rawId);
    if (!comp) return null;
    const building = this.findBuilding(comp.buildingId || comp.id);
    const companyAgents = Object.values(this.agents).filter(a => a.companyId === comp.id || (comp.agents && comp.agents.includes(a.id)));
    const companyStations = Object.values(this.workstations).filter(ws => ws.buildingId === comp.buildingId);
    return {
      company: comp,
      building,
      departments: comp.departments || [],
      workstations: companyStations,
      agents: companyAgents,
      connections: comp.connections || [],
      workflows: comp.workflows || [],
      integrations: comp.integrations || [],
      telemetry: comp.telemetry || {},
      activeEvents: this.mutationLog.filter(m => m.payload && (m.payload.companyId === comp.id || m.payload.company === comp.name)).slice(-10)
    };
  }

  emitCompanyEvent(companyId, eventData) {
    const comp = this.findCompany(companyId);
    if (!comp) throw new Error(`Company not found: ${companyId}`);
    const eventId = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const event = {
      eventId,
      timestamp: new Date().toISOString(),
      source: eventData.source || 'api-gateway',
      companyId: comp.id,
      company: comp.name,
      type: eventData.type || 'NEW_API_REQUEST',
      priority: eventData.priority || 'NORMAL',
      speed: eventData.speed || (eventData.type === 'NEW_API_REQUEST' ? 'FAST_LANE' : 'JOB_LANE'),
      payload: eventData.payload || {},
      agentId: eventData.agentId || null
    };

    let targetAgent = null;
    if (event.agentId) {
      targetAgent = this.findAgent(event.agentId);
    } else {
      if (event.type.includes('API') || event.type.includes('REQUEST')) {
        targetAgent = this.findAgent('agent-api-ops');
      } else if (event.type.includes('QUEUE') || event.type.includes('JOB') || event.type.includes('WORKER')) {
        targetAgent = this.findAgent('agent-infra');
      } else if (event.type.includes('INTEGRATION') || event.type.includes('WEBHOOK')) {
        targetAgent = this.findAgent('agent-integration');
      } else if (event.type.includes('SECURITY') || event.type.includes('AUTH')) {
        targetAgent = this.findAgent('agent-security');
      } else if (event.type.includes('MODEL') || event.type.includes('INFERENCE') || event.type.includes('AI')) {
        targetAgent = this.findAgent('agent-ai-core');
      } else {
        targetAgent = this.findAgent('agent-api-ops');
      }
    }

    if (targetAgent) {
      event.assignedAgent = targetAgent.id;
      targetAgent.status = 'WORKING';
      targetAgent.state = 'WORKING';
      targetAgent.currentTask = `Executando: ${event.type} (${event.source || 'Live Runtime'})`;
      targetAgent.currentJob = {
        id: `job-${eventId}`,
        name: event.type,
        progress: 15
      };
      targetAgent.memory.unshift({
        timestamp: event.timestamp,
        content: `Recebido evento ${event.type} [${event.speed}]: ${JSON.stringify(event.payload).slice(0, 100)}`
      });
      if (targetAgent.memory.length > 20) targetAgent.memory.pop();
    }

    if (comp.telemetry) {
      comp.telemetry.totalRequestsProcessed = (comp.telemetry.totalRequestsProcessed || 0) + 1;
      comp.telemetry.lastEventAt = event.timestamp;
    }

    this.mutationLog.push({
      id: eventId,
      type: 'COMPANY_EVENT',
      payload: event,
      timestamp: event.timestamp
    });
    this.schedulePersist();

    try {
      globalBus.emit('company:event', event);
      globalBus.emit('world.mutation', { type: 'COMPANY_EVENT', payload: event });
    } catch (_) {}

    return event;
  }

  findAgent(rawId) {
    if (!rawId) return null;
    const query = String(rawId).toLowerCase().trim();
    let ag = this.agents[query];

    // Alias checks: e.g. 'camila' matches 'agent-camila'
    if (!ag) {
      for (const [key, a] of Object.entries(this.agents)) {
        if (key.toLowerCase() === query) { ag = a; break; }
        if (String(a.id || '').toLowerCase() === query) { ag = a; break; }
        if (String(a.name || '').toLowerCase().includes(query)) { ag = a; break; }
        if (query.includes('camila') && (key.includes('camila') || (a.name && a.name.toLowerCase().includes('camila')))) { ag = a; break; }
        if (query.includes('ceo') && (key.includes('ceo') || (a.name && a.name.toLowerCase().includes('ceo')))) { ag = a; break; }
        if (query.includes('alex') && (key.includes('api-ops') || (a.name && a.name.toLowerCase().includes('alex')))) { ag = a; break; }
        if (query.includes('elena') && (key.includes('integration') || (a.name && a.name.toLowerCase().includes('elena')))) { ag = a; break; }
        if (query.includes('lucas') && (key.includes('infra') || (a.name && a.name.toLowerCase().includes('lucas')))) { ag = a; break; }
        if (query.includes('maya') && (key.includes('monitor') || (a.name && a.name.toLowerCase().includes('maya')))) { ag = a; break; }
        if (query.includes('victor') && (key.includes('security') || (a.name && a.name.toLowerCase().includes('victor')))) { ag = a; break; }
        if (query.includes('sora') && (key.includes('ai-core') || (a.name && a.name.toLowerCase().includes('sora')))) { ag = a; break; }
        if (query.includes('gabriel') && (key.includes('support') || (a.name && a.name.toLowerCase().includes('gabriel')))) { ag = a; break; }
        if (query.includes('andre') && (key.includes('andre') || (a.name && a.name.toLowerCase().includes('andre')))) { ag = a; break; }
        if (query.includes('marcos') && (key.includes('marcos') || (a.name && a.name.toLowerCase().includes('marcos')))) { ag = a; break; }
        if (query.includes('silva') && (key.includes('silva') || (a.name && a.name.toLowerCase().includes('silva')))) { ag = a; break; }
        if (query.includes('expedicao') && (key.includes('expedicao') || (a.name && a.name.toLowerCase().includes('expedicao')))) { ag = a; break; }
      }
    }
    if (!ag) {
      // Auto-resolve or register for any valid agent identifier or name
      const cleanName = query.replace(/^agent-/, '').replace(/-/g, ' ');
      const displayName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      ag = {
        id: query.startsWith('agent-') ? query : `agent-${query}`,
        agentId: query.startsWith('agent-') ? query : `agent-${query}`,
        name: displayName,
        displayName: displayName,
        role: 'Especialista Fênix',
        department: 'OPERATIONS',
        company: 'Fênix Enterprise',
        companyId: 'fenix-enterprise',
        status: 'AVAILABLE',
        state: 'IDLE',
        workstationId: 'st-general-1',
        stationId: 'st-general-1',
        coordinates: { x: 0, y: 0.8, z: 0 },
        memory: [],
        skills: ['general-operations', 'coordination'],
        tools: ['terminal', 'api-client']
      };
      this.agents[ag.id] = ag;
    }
    if (ag) {
      if (ag.workstationId && !ag.stationId) ag.stationId = ag.workstationId;
      if (ag.stationId && !ag.workstationId) ag.workstationId = ag.stationId;
      return ag;
    }
    return null;
  }

  findBuilding(rawId) {
    if (!rawId) return null;
    const query = String(rawId).toLowerCase().trim();
    if (this.buildings[query]) return this.buildings[query];
    const prefixed = `bld-${query}`;
    if (this.buildings[prefixed]) return this.buildings[prefixed];

    for (const [key, bld] of Object.entries(this.buildings)) {
      if (key.toLowerCase() === query || key.toLowerCase().includes(query)) return bld;
      if (String(bld.name || '').toLowerCase().includes(query)) return bld;
      if (String(bld.companyId || '').toLowerCase() === query) return bld;
    }
    return null;
  }

  applyMutation(mutation) {
    if (!mutation || !mutation.type) {
      throw new Error('Mutation must specify a type');
    }

    const type = String(mutation.type).toUpperCase().trim();
    const payload = { ...(mutation.payload || {}), ...mutation };
    const issuer = mutation.issuer || 'system';
    const timestamp = new Date().toISOString();

    const record = {
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      success: true,
      type,
      payload,
      issuer,
      timestamp
    };

    switch (type) {
      case 'CREATE': {
        const entityType = payload.entityType;
        const entity = payload.entity || payload;
        if (!entityType || !entity || !entity.id) throw new Error('CREATE requires entityType and entity with id');
        if (entityType === 'agent') this.agents[entity.id] = entity;
        else if (entityType === 'vehicle') this.vehicles[entity.id] = entity;
        else if (entityType === 'building') this.buildings[entity.id] = entity;
        else if (entityType === 'construction') this.constructions[entity.id] = entity;
        else if (entityType === 'workstation') this.workstations[entity.id] = entity;
        else throw new Error(`Unknown entityType: ${entityType}`);
        break;
      }

      case 'UPDATE': {
        const { entityType, id, updates } = payload;
        if (!entityType || !id || !updates) throw new Error('UPDATE requires entityType, id, updates');
        const targetMap = entityType === 'agent' ? this.agents :
                          entityType === 'vehicle' ? this.vehicles :
                          entityType === 'building' ? this.buildings :
                          entityType === 'construction' ? this.constructions :
                          entityType === 'workstation' ? this.workstations : null;
        if (!targetMap) throw new Error(`Unknown entityType: ${entityType}`);
        if (!targetMap[id]) throw new Error(`Entity not found: ${id}`);
        targetMap[id] = { ...targetMap[id], ...updates, lastUpdated: timestamp };
        break;
      }

      case 'MOVE': {
        const id = payload.id || payload.agentId || payload.vehicleId;
        const target = (payload.entityType === 'vehicle' || this.vehicles[id]) ? this.vehicles[id] : (this.agents[id] || this.findAgent(id));
        if (!target) throw new Error(`Movable entity not found: ${id}`);
        if (!target.coordinates) {
          target.coordinates = {
            x: typeof target.x === 'number' ? target.x : (typeof target.homeX === 'number' ? target.homeX : 0),
            y: typeof target.y === 'number' ? target.y : (typeof target.homeY === 'number' ? target.homeY : 0)
          };
        }
        if (payload.coordinates) {
          target.coordinates = payload.coordinates;
          target.x = payload.coordinates.x;
          target.y = payload.coordinates.y;
        }
        if (payload.targetCoordinates) {
          target.targetCoordinates = payload.targetCoordinates;
          target.targetX = payload.targetCoordinates.x;
          target.targetY = payload.targetCoordinates.y;
        } else if (typeof payload.targetX === 'number' && typeof payload.targetY === 'number') {
          target.targetCoordinates = { x: payload.targetX, y: payload.targetY };
          target.targetX = payload.targetX;
          target.targetY = payload.targetY;
        }
        if (payload.path) target.path = payload.path;
        target.state = payload.state || 'WALKING';
        target.status = 'WALKING';
        target._moving = true;
        target.lastMove = timestamp;
        break;
      }

      case 'BUILD': {
        if (payload.construction && payload.construction.id) {
          this.constructions[payload.construction.id] = {
            ...payload.construction,
            lastUpdate: timestamp
          };
          break;
        }
        const constructionId = payload.constructionId || payload.id;
        const { progressDelta, newStage, newProgress } = payload;
        const c = this.constructions[constructionId];
        if (!c) throw new Error(`Construction not found: ${constructionId}`);
        if (typeof newProgress === 'number') c.progress = Math.min(100, Math.max(0, newProgress));
        else if (typeof progressDelta === 'number') c.progress = Math.min(100, Math.max(0, c.progress + progressDelta));
        if (newStage) c.stage = newStage;
        if (c.progress >= 100) {
          c.stage = 'ACTIVE';
          c.completedAt = timestamp;
        }
        break;
      }

      case 'SPAWN': {
        const vehicle = payload.vehicle || (payload.entityType === 'vehicle' ? payload.entity : null);
        const agent = payload.agent || (payload.entityType === 'agent' ? payload.entity : null);
        if (vehicle && vehicle.id) {
          const vCoords = vehicle.coordinates || {
            x: typeof vehicle.x === 'number' ? vehicle.x : 0,
            y: typeof vehicle.y === 'number' ? vehicle.y : 0
          };
          this.vehicles[vehicle.id] = {
            ...vehicle,
            coordinates: vCoords,
            x: vCoords.x,
            y: vCoords.y,
            lastUpdate: timestamp,
            status: vehicle.status || 'IDLE',
            progress: vehicle.progress || 0
          };
        }
        if (agent && agent.id) {
          const aCoords = agent.coordinates || {
            x: typeof agent.x === 'number' ? agent.x : (typeof agent.homeX === 'number' ? agent.homeX : 0),
            y: typeof agent.y === 'number' ? agent.y : (typeof agent.homeY === 'number' ? agent.homeY : 0)
          };
          this.agents[agent.id] = {
            ...agent,
            coordinates: aCoords,
            homeCoordinates: agent.homeCoordinates || { ...aCoords },
            x: aCoords.x,
            y: aCoords.y,
            status: agent.status || 'AVAILABLE',
            state: agent.state || 'IDLE',
            memory: agent.memory || []
          };
        }
        break;
      }

      case 'ASSIGN_TASK': {
        const agentId = payload.agentId || payload.id;
        const { task, job } = payload;
        const ag = this.findAgent(agentId);
        if (!ag) throw new Error(`Agent not found for task assignment: ${agentId}`);
        ag.assignedTask = task;
        ag.currentTask = typeof task === 'string' ? task : (task?.taskName || task?.name || (job ? job.name : 'Tarefa atribuída'));
        if (job) ag.currentJob = job;
        ag.state = payload.state || 'RECEIVING_TASK';
        ag.status = 'WORKING';
        ag.memory.push({
          timestamp,
          content: `Nova tarefa atribuída: ${ag.currentTask}`
        });
        break;
      }

      case 'COMPLETE_TASK': {
        const agentId = payload.agentId || payload.id;
        const ag = this.findAgent(agentId);
        if (!ag) throw new Error(`Agent not found for task completion: ${agentId}`);
        const result = payload.result || 'Execução bem-sucedida';
        const finishedTask = ag.currentTask || ag.assignedTask || 'Tarefa em andamento';
        ag.assignedTask = null;
        ag.currentJob = null;
        ag.currentTask = 'Standby operacional · Pronto para novas diretivas';
        ag.status = 'AVAILABLE';
        ag.state = 'IDLE';
        ag.memory.push({
          timestamp,
          content: `Tarefa concluída [${finishedTask}]: ${result}`
        });
        globalBus.emit('world.agent.task_completed', {
          agentId: ag.id,
          task: finishedTask,
          result,
          timestamp
        });
        break;
      }

      case 'AGENT_MESSAGE': {
        const fromId = payload.fromAgentId || payload.senderId;
        const toId = payload.toAgentId || payload.receiverId;
        const message = payload.message || payload.content;
        const intent = payload.intent || 'COORDINATION';
        if (!fromId || !toId || !message) {
          throw new Error('AGENT_MESSAGE requires fromAgentId, toAgentId, and message');
        }
        const sender = this.findAgent(fromId);
        const receiver = this.findAgent(toId);
        if (!sender) throw new Error(`Sender agent not found: ${fromId}`);
        if (!receiver) throw new Error(`Receiver agent not found: ${toId}`);

        const sName = sender.displayName || sender.name;
        const rName = receiver.displayName || receiver.name;

        sender.memory.push({
          timestamp,
          content: `[Enviou mensagem para ${rName}]: "${message}" (Intenção: ${intent})`
        });
        receiver.memory.push({
          timestamp,
          content: `[Recebeu mensagem de ${sName}]: "${message}" (Intenção: ${intent})`
        });

        globalBus.emit('world.agent.message', {
          from: sender.id,
          to: receiver.id,
          message,
          intent,
          timestamp
        });
        break;
      }

      case 'MOVE_STATION': {
        const agentId = payload.agentId || payload.id;
        const workstationId = payload.workstationId || payload.stationId;
        const ag = this.findAgent(agentId);
        if (!ag) throw new Error(`Agent not found for workstation move: ${agentId}`);
        if (!workstationId) throw new Error('MOVE_STATION requires workstationId');

        const prevStation = ag.workstationId || 'none';
        ag.workstationId = workstationId;
        ag.stationId = workstationId;

        // If target coordinates are provided or known from workstation
        const ws = this.workstations[workstationId];
        if (ws && ws.coordinates) {
          ag.coordinates = { ...ws.coordinates };
          ag.x = ws.coordinates.x;
          ag.y = ws.coordinates.y;
        } else if (payload.coordinates) {
          ag.coordinates = { ...payload.coordinates };
          ag.x = payload.coordinates.x;
          ag.y = payload.coordinates.y;
        }

        ag.state = 'RELOCATED';
        ag.memory.push({
          timestamp,
          content: `Realocação de posto: movido de [${prevStation}] para [${workstationId}]`
        });

        globalBus.emit('world.agent.moved_station', {
          agentId: ag.id,
          fromStation: prevStation,
          toStation: workstationId,
          timestamp
        });
        break;
      }

      case 'CHAT': {
        const { agentId, userMessage, reply } = payload;
        const ag = this.findAgent(agentId);
        if (ag) {
          ag.memory.push({
            timestamp,
            content: `Interação com operador: "${userMessage}" -> Resposta: "${reply}"`
          });
        }
        break;
      }

      case 'COMPANY_EVENT': {
        // Record company event directly in mutation log
        break;
      }

      default:
        throw new Error(`Unsupported mutation type: ${type}`);
    }

    this.mutationLog.push(record);
    if (this.mutationLog.length > 300) this.mutationLog.shift();

    // Broadcast mutation to EventBus for SSE and WebSockets
    globalBus.emit('world.mutation', record);

    this.schedulePersist();
    return record;
  }

  async chatWithAgent(agentId, message) {
    const ag = this.findAgent(agentId);
    if (!ag) throw new Error(`Agente '${agentId}' não encontrado no mundo.`);

    const now = new Date().toISOString();
    const isCamila = ag.id === 'agent-camila' || (ag.name && ag.name.toLowerCase().includes('camila'));

    let reply = '';
    if (ag.id === 'agent-api-ops') {
      reply = `[Alex - API Operations]: Conexão estabelecida com Gateway Fastify 3001 na VPS. Latência atual: 14ms. Endpoints REST respondendo 200 OK. Sobre "${message}": despachando requisição via Fast Lane com streaming ativo!`;
    } else if (ag.id === 'agent-integration') {
      reply = `[Elena - Integrações]: Contratos OpenAPI e Webhooks validados. Conexões ativas com Depósito Mais e ZapAI CRM. Sobre "${message}": evento mapeado e payload verificado no schema.`;
    } else if (ag.id === 'agent-infra') {
      reply = `[Lucas - Infra & Queues]: Filas BullMQ e réplicas Redis operacionais na porta 6380, Postgres 16 na porta 5433. Sobre "${message}": enfileirando job na Job Lane assíncrona.`;
    } else if (ag.id === 'agent-monitor') {
      reply = `[Maya - SRE]: Uptime do cluster mantido em 99.98%. Traces OpenTelemetry e métricas coletadas sem anomalias. Sobre "${message}": registrando no painel de observabilidade.`;
    } else if (ag.id === 'agent-security') {
      reply = `[Victor - Segurança Zero-Trust]: Sandbox ativo, firewall de tokens criptográficos verificado. Sobre "${message}": autorização concedida sem violações de segurança.`;
    } else if (ag.id === 'agent-ai-core') {
      reply = `[Sora - AI Core]: Cluster Ollama ativo com Qwen 2.5 3B e DeepSeek R1. Temperatura ajustada e RAG indexado no Memory Fabric. Sobre "${message}": inferência gerada com raciocínio sintético.`;
    } else if (ag.id === 'agent-support') {
      reply = `[Gabriel - Suporte Dev]: SDKs Node.js e Python prontos, documentação interativa sincronizada. Sobre "${message}": suporte registrado no histórico!`;
    } else if (isCamila) {
      reply = `[Supervisora Camila - Depósito Mais]: Olá! Estou supervisionando o empacotamento e inspeção WMS no andar 2. Nossa conformidade hoje está em 100%, com 140 paletes inspecionados e docas fluindo normalmente. Sobre "${message}": solicitação registrada no manifesto e integrada ao fluxo de expedição!`;
    } else if (ag.role.includes('CEO')) {
      reply = `[CEO Agent]: Diretiva executiva recebida: "${message}". A telemetria empresarial do Fênix reporta 100% de integridade nos distritos industriais e de tecnologia. Despachando alinhamento para os agentes responsáveis.`;
    } else {
      reply = `[${ag.name} (${ag.role})]: Recebi sua mensagem: "${message}". Minha estação (${ag.workstationId}) está operacional e minha missão atual é: ${ag.currentTask || 'pronto para tarefas'}.`;
    }

    this.applyMutation({
      type: 'CHAT',
      payload: {
        agentId: ag.id,
        userMessage: message,
        reply
      },
      issuer: 'operator'
    });

    return {
      ok: true,
      success: true,
      agentId: ag.id,
      agentName: ag.name,
      role: ag.role,
      company: ag.company,
      department: ag.department,
      workstationId: ag.workstationId,
      status: ag.status,
      userMessage: message,
      reply,
      timestamp: now,
      recentMemories: ag.memory.slice(-4)
    };
  }
}

// Global Singleton
let _worldStateInstance = null;
function getWorldStateEngine() {
  if (!_worldStateInstance) {
    _worldStateInstance = new WorldStateEngine();
  }
  return _worldStateInstance;
}

module.exports = {
  WorldStateEngine,
  getWorldStateEngine,
  CANONICAL_COMPANIES_DATA,
  CANONICAL_DISTRICTS_DATA,
  CANONICAL_BUILDINGS_DATA,
  CANONICAL_WORKSTATIONS_DATA,
  CANONICAL_AGENTS_DATA,
  CANONICAL_VEHICLES_DATA,
  CANONICAL_CONSTRUCTIONS_DATA
};
