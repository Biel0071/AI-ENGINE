'use strict';
/**
 * FÊNIX OS — BrainAgentEngine v2
 * 15 real specialists with individual personalities, memory types and PERSISTENCE to disk.
 * Survives backend restarts.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/opt/fenix-os/grg/data';
const BRAIN_AGENTS_FILE = path.join(DATA_DIR, 'brain-agents.json');

const COGNITIVE_STATES = [
  'IDLE', 'THINKING', 'CODING', 'TESTING', 'DEPLOYING', 'REVIEWING',
  'WAITING', 'ERROR', 'WALKING', 'INSPECTING', 'CHATTING', 'RESEARCHING',
  'SLEEPING', 'OFFLINE', 'CELEBRATING'
];

const REAL_SPECIALISTS = [
  { id: 'agent-architect', name: 'Arquiteto', role: 'System Architecture', personality: 'Strategic thinker', domain: 'architecture' },
  { id: 'agent-backend', name: 'Backend', role: 'API and DB Engineering', personality: 'Pragmatic problem solver', domain: 'backend' },
  { id: 'agent-frontend', name: 'Frontend', role: 'UI Client Engineering', personality: 'Creative craftsman', domain: 'frontend' },
  { id: 'agent-ux', name: 'UX Designer', role: 'User Interface Design', personality: 'Empathetic champion', domain: 'ux' },
  { id: 'agent-qa', name: 'QA Tester', role: 'Quality Assurance Testing', personality: 'Rigorous validator', domain: 'qa' },
  { id: 'agent-devops', name: 'DevOps', role: 'CI/CD Infrastructure', personality: 'Automation-first engineer', domain: 'devops' },
  { id: 'agent-db', name: 'DB Specialist', role: 'Data Models Migrations', personality: 'Data optimizer', domain: 'database' },
  { id: 'agent-security', name: 'Seguranca', role: 'Audit Security Safeguards', personality: 'Paranoid guardian', domain: 'security' },
  { id: 'agent-docs', name: 'Documentacao', role: 'Technical Docs Diagrams', personality: 'Clear communicator', domain: 'documentation' },
  { id: 'agent-obs', name: 'Observabilidade', role: 'Metrics Logging Telemetry', personality: 'Systems watchdog', domain: 'observability' },
  { id: 'agent-ai', name: 'IA Gateway', role: 'Model Routing LLM Orchestration', personality: 'Multi-model intelligence', domain: 'ai' },
  { id: 'agent-memory', name: 'Memoria', role: 'Memory Capsule Consolidation', personality: 'Patient archivist', domain: 'memory' },
  { id: 'agent-knowledge', name: 'Knowledge', role: 'Knowledge Graph Maintenance', personality: 'Pattern recognizer', domain: 'knowledge' },
  { id: 'agent-twin', name: 'Digital Twin', role: 'Live System Projections', personality: 'Mirror of reality', domain: 'twin' },
  { id: 'agent-planner', name: 'Planner', role: 'Mission Decomposition Scheduling', personality: 'Mission orchestrator', domain: 'planner' },
];

const DOMAIN_DISTRICT = {
  architecture: 'command-center', backend: 'dev-district', frontend: 'creative-district',
  ux: 'creative-district', qa: 'dev-district', devops: 'data-center', database: 'data-center',
  security: 'command-center', documentation: 'observatory', observability: 'observatory',
  ai: 'ai-district', memory: 'data-center', knowledge: 'ai-district',
  twin: 'project-district', planner: 'command-center',
};

// Domain → state mapping for city events
const DOMAIN_TASK_STATE = {
  architecture: 'INSPECTING', backend: 'CODING', frontend: 'CODING',
  ux: 'REVIEWING', qa: 'TESTING', devops: 'DEPLOYING', database: 'CODING',
  security: 'INSPECTING', documentation: 'RESEARCHING', observability: 'INSPECTING',
  ai: 'THINKING', memory: 'THINKING', knowledge: 'RESEARCHING',
  twin: 'INSPECTING', planner: 'THINKING',
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

class BrainAgentEngine {
  constructor(agentSwarm) {
    ensureDir();
    this.agents = new Map();
    this._dirty = false;
    this._saveTimer = null;
    this._initAgents(agentSwarm);
    this._loadPersistedState();
    this._startAutoSave();
  }

  _initAgents(agentSwarm) {
    let specialists = [];
    if (agentSwarm && agentSwarm.specialists && agentSwarm.specialists.length > 0) {
      specialists = agentSwarm.specialists.map((s, i) => {
        const real = REAL_SPECIALISTS.find(r => r.id === s.id) || REAL_SPECIALISTS[i] || {};
        return Object.assign({}, s, {
          personality: real.personality || 'Logical and helpful',
          domain: s.domain || real.domain || 'general'
        });
      });
    } else {
      specialists = REAL_SPECIALISTS;
    }

    specialists.forEach((spec, i) => {
      const district = DOMAIN_DISTRICT[spec.domain] || 'command-center';
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bases = {
        'command-center': { x: -100, y: -200 }, 'project-district': { x: -300, y: -50 },
        'ai-district': { x: 300, y: -50 }, 'creative-district': { x: -400, y: 100 },
        'dev-district': { x: 0, y: 50 }, 'data-center': { x: 400, y: 100 },
        'observatory': { x: 0, y: -300 },
      };
      const base = bases[district] || { x: 0, y: 0 };

      this.agents.set(spec.id, {
        id: spec.id, name: spec.name, role: spec.role,
        personality: spec.personality || 'Logical and helpful',
        currentGoal: 'Serve FENIX OS mission',
        intelligenceLevel: [0, 1, 2, 3, 4][i % 5],
        state: 'IDLE', location: district,
        position: { x: base.x + (col - 1) * 40, y: base.y + (row % 3) * 30 },
        episodicMemory: [], spatialMemory: {}, socialMemory: {},
        visualMemory: [], knownPlaces: [district], knownAgents: [],
        skills: [], lessons: [], lastAction: Date.now(),
        domain: spec.domain || 'general',
      });
    });
  }

  _loadPersistedState() {
    if (!fs.existsSync(BRAIN_AGENTS_FILE)) return;
    try {
      const saved = JSON.parse(fs.readFileSync(BRAIN_AGENTS_FILE, 'utf8'));
      for (const [id, savedAgent] of Object.entries(saved)) {
        const agent = this.agents.get(id);
        if (!agent) continue;
        // Restore mutable state (memory, location, skills, goal)
        agent.episodicMemory = savedAgent.episodicMemory || [];
        agent.spatialMemory = savedAgent.spatialMemory || {};
        agent.socialMemory = savedAgent.socialMemory || {};
        agent.visualMemory = savedAgent.visualMemory || [];
        agent.knownPlaces = savedAgent.knownPlaces || [agent.location];
        agent.knownAgents = savedAgent.knownAgents || [];
        agent.skills = savedAgent.skills || [];
        agent.lessons = savedAgent.lessons || [];
        agent.currentGoal = savedAgent.currentGoal || agent.currentGoal;
        agent.location = savedAgent.location || agent.location;
        agent.lastAction = savedAgent.lastAction || Date.now();
      }
      console.log('[BrainAgentEngine] Loaded persisted state for', Object.keys(saved).length, 'agents');
    } catch (e) {
      console.error('[BrainAgentEngine] Failed to load persisted state:', e.message);
    }
  }

  _persistState() {
    ensureDir();
    const snapshot = {};
    for (const [id, agent] of this.agents) {
      snapshot[id] = {
        episodicMemory: agent.episodicMemory.slice(-50),
        spatialMemory: agent.spatialMemory,
        socialMemory: agent.socialMemory,
        visualMemory: agent.visualMemory.slice(-20),
        knownPlaces: agent.knownPlaces,
        knownAgents: agent.knownAgents,
        skills: agent.skills,
        lessons: agent.lessons,
        currentGoal: agent.currentGoal,
        location: agent.location,
        lastAction: agent.lastAction,
      };
    }
    try {
      fs.writeFileSync(BRAIN_AGENTS_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
    } catch (e) {
      console.error('[BrainAgentEngine] Failed to persist state:', e.message);
    }
    this._dirty = false;
  }

  _startAutoSave() {
    setInterval(() => {
      if (this._dirty) this._persistState();
    }, 60000); // save every 60s if dirty
  }

  _markDirty() {
    this._dirty = true;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => { this._persistState(); }, 5000);
  }

  // ── State machine tick ────────────────────────────────────────────────────
  tick(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent || agent.intelligenceLevel > 2) return;
    const prev = agent.state;
    const tr = {
      IDLE: ['THINKING', 'WALKING', 'RESEARCHING'],
      THINKING: ['CODING', 'TESTING', 'CHATTING', 'INSPECTING'],
      CODING: ['TESTING', 'REVIEWING', 'IDLE'],
      TESTING: ['REVIEWING', 'IDLE', 'ERROR'],
      REVIEWING: ['IDLE', 'CELEBRATING', 'CHATTING'],
      WALKING: ['INSPECTING', 'CHATTING', 'IDLE'],
      CHATTING: ['IDLE', 'THINKING'],
      WAITING: ['IDLE', 'THINKING'],
      ERROR: ['THINKING', 'IDLE'],
      INSPECTING: ['THINKING', 'IDLE'],
      RESEARCHING: ['THINKING', 'IDLE'],
      DEPLOYING: ['IDLE', 'CELEBRATING'],
      CELEBRATING: ['IDLE'],
      SLEEPING: ['IDLE'],
      OFFLINE: ['IDLE'],
    };
    const next = tr[agent.state] || ['IDLE'];
    agent.state = next[Math.floor(Math.random() * next.length)];
    if (prev !== agent.state) {
      this.remember(agentId, 'episodic', 'State: ' + prev + ' to ' + agent.state);
      agent.lastAction = Date.now();
      this._markDirty();
    }
  }

  // ── City Event handling ───────────────────────────────────────────────────
  handleCityEvent(eventType, agentDomain, context) {
    const stateMap = {
      TASK_STARTED: DOMAIN_TASK_STATE,
      CODE_CHANGED: { backend: 'CODING', frontend: 'CODING', default: 'THINKING' },
      TEST_STARTED: { qa: 'TESTING', default: 'WAITING' },
      TEST_FAILED: { qa: 'ERROR', default: 'IDLE' },
      TEST_PASSED: { qa: 'CELEBRATING', default: 'IDLE' },
      DEPLOY_STARTED: { devops: 'DEPLOYING', default: 'WAITING' },
      DEPLOY_COMPLETED: { devops: 'CELEBRATING', default: 'IDLE' },
      TASK_COMPLETED: { default: 'CELEBRATING' },
      ERROR_DETECTED: { default: 'ERROR' },
      MEMORY_CREATED: { memory: 'THINKING', default: 'IDLE' },
      SKILL_CREATED: { ai: 'CELEBRATING', default: 'IDLE' },
      AI_CALL: { ai: 'THINKING', default: 'WAITING' },
    };

    const map = stateMap[eventType] || {};
    const affected = [];

    for (const [id, agent] of this.agents) {
      const newState = map[agent.domain] || map['default'];
      if (!newState) continue;
      if (agentDomain && agent.domain !== agentDomain) continue;

      const prev = agent.state;
      agent.state = newState;
      agent.lastAction = Date.now();
      this.remember(id, 'episodic', `City event ${eventType}: state changed to ${newState}`);
      affected.push({ id, prev, newState });
      this._markDirty();

      if (!agentDomain) break; // only affect one if no domain filter
    }

    return affected;
  }

  // ── Memory methods ────────────────────────────────────────────────────────
  remember(agentId, type, memory) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    const item = { timestamp: Date.now(), content: memory };
    if (type === 'episodic') {
      agent.episodicMemory.push(item);
      if (agent.episodicMemory.length > 100) agent.episodicMemory.shift();
    } else if (type === 'visual') {
      agent.visualMemory.push(item);
      if (agent.visualMemory.length > 50) agent.visualMemory.shift();
    } else if (type === 'spatial') {
      const p = (typeof memory === 'object' ? memory.location : memory) || String(memory);
      agent.spatialMemory[p] = (agent.spatialMemory[p] || 0) + 1;
      if (!agent.knownPlaces.includes(p)) agent.knownPlaces.push(p);
    } else if (type === 'social') {
      const t = (typeof memory === 'object' ? memory.targetAgentId : memory) || String(memory);
      agent.socialMemory[t] = (agent.socialMemory[t] || 0) + 1;
      if (!agent.knownAgents.includes(t)) agent.knownAgents.push(t);
    } else if (type === 'lesson') {
      const lesson = typeof memory === 'string' ? memory : String(memory);
      if (!agent.lessons.includes(lesson)) {
        agent.lessons.push(lesson);
        if (agent.lessons.length > 50) agent.lessons.shift();
      }
    }
    this._markDirty();
  }

  recall(agentId, query) {
    const agent = this.agents.get(agentId);
    if (!agent) return [];
    const q = query.toLowerCase();
    return agent.episodicMemory.filter(m => typeof m.content === 'string' && m.content.toLowerCase().includes(q));
  }

  meetAgent(agentId1, agentId2) {
    this.remember(agentId1, 'social', agentId2);
    this.remember(agentId2, 'social', agentId1);
    const ag1 = this.agents.get(agentId1);
    const ag2 = this.agents.get(agentId2);
    if (ag1 && ag2) {
      ag1.state = 'CHATTING'; ag2.state = 'CHATTING';
      this.remember(agentId1, 'episodic', 'Met ' + ag2.name);
      this.remember(agentId2, 'episodic', 'Met ' + ag1.name);
    }
    this._markDirty();
  }

  visitLocation(agentId, location) {
    this.remember(agentId, 'spatial', location);
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.location = location;
      this.remember(agentId, 'episodic', 'Visited ' + location);
    }
  }

  getAgentState(agentId) { return this.agents.get(agentId); }
  getAllAgentStates() { return Array.from(this.agents.values()); }

  forceSave() { this._persistState(); }
}

module.exports = { BrainAgentEngine, COGNITIVE_STATES };
